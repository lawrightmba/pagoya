/**
 * Build 2A — Knowledge Qualification Ledger / Poller (Package 2A-5)
 *
 * Async DB poller that continuously qualifies opinions that have a reasoning
 * trace but no current knowledge_qualification_ledger row for the active
 * predicate version.
 *
 * Architecture mirrors opinionPoller.ts:
 *   - FOR UPDATE SKIP LOCKED on knowledge_qualification_ledger (prevents duplicate work)
 *   - Single-start guard (startKnowledgeQualificationPoller is idempotent)
 *   - ENABLE_EVIDENCE_ENGINE=true flag gate
 *   - Chains after Package 2A-5 readiness is confirmed
 *
 * Processing cycle:
 *   1. Enqueue: Find opinions that have a reasoning_trace but no ledger row
 *      for the active predicate version. Insert ledger rows (idempotent via
 *      ON CONFLICT DO NOTHING).
 *   2. Claim: SELECT FOR UPDATE SKIP LOCKED — claim one pending row at a time.
 *   3. Qualify: Call qualifyOpinion() atomically.
 *   4. Update ledger: mark succeeded/insufficient/indeterminate/refused/failed.
 *
 * Duplicate prevention:
 *   UNIQUE (opinion_id, predicate_version_id) on the ledger table ensures
 *   each (opinion, predicate) pair is processed exactly once per version.
 *
 * Retry: failed rows are re-queued on the next poll cycle (max 5 attempts).
 */

import { logger } from "../../lib/logger.js";
import { qualifyOpinion } from "./knowledgeQualification.js";
import { isBuild2a5Ready } from "./build2aReadiness.js";

const POLL_INTERVAL_MS = 20_000; // poll every 20 seconds
const ROWS_PER_CYCLE   = 10;    // claim at most N opinions per cycle
const MAX_ATTEMPTS     = 5;     // after this many failures, mark refused

let _pollerStarted = false;

/**
 * Start the knowledge qualification poller.
 * Idempotent: calling more than once has no effect.
 * Called from index.ts after ensureBuild2a5Tables() resolves.
 * Gated by ENABLE_EVIDENCE_ENGINE=true.
 */
export function startKnowledgeQualificationPoller(): void {
  if (process.env["ENABLE_EVIDENCE_ENGINE"] !== "true") {
    logger.info("[Build2A/kqPoller] ENABLE_EVIDENCE_ENGINE != 'true' — knowledge qualification poller not started");
    return;
  }

  if (_pollerStarted) {
    logger.warn("[Build2A/kqPoller] startKnowledgeQualificationPoller called more than once — ignoring");
    return;
  }

  _pollerStarted = true;
  logger.info("[Build2A/kqPoller] Starting knowledge qualification poller (interval=%dms)", POLL_INTERVAL_MS);

  setInterval(() => {
    runKnowledgeQualificationCycle().catch((err) => {
      logger.error({ err }, "[Build2A/kqPoller] Unhandled error in qualification cycle");
    });
  }, POLL_INTERVAL_MS);
}

/** TEST-ONLY: reset the started guard so tests can call startKnowledgeQualificationPoller again. */
export function _resetKqPollerForTesting(): void {
  _pollerStarted = false;
}

/**
 * One knowledge qualification poll cycle.
 * Exported for testing; normally called by the setInterval above.
 */
export async function runKnowledgeQualificationCycle(): Promise<{
  enqueued: number;
  processed: number;
  succeeded: number;   // = knowledge produced
  insufficient: number;
  indeterminate: number;
  refused: number;
  failed: number;
}> {
  if (!isBuild2a5Ready()) {
    logger.debug("[Build2A/kqPoller] Skipping cycle — Package 2A-5 not ready");
    return { enqueued: 0, processed: 0, succeeded: 0, insufficient: 0, indeterminate: 0, refused: 0, failed: 0 };
  }

  const { db } = await import("@workspace/db");
  const { sql } = await import("drizzle-orm");

  // ── Step 1: Enqueue opinions with traces but no ledger row ────────────────
  // Find all opinions that have a reasoning_trace (= complete opinion formation)
  // but no knowledge_qualification_ledger entry for the active predicate version.
  const enqueueRes = await db.execute(sql`
    INSERT INTO knowledge_qualification_ledger (opinion_id, predicate_version_id)
    SELECT o.id, kspv.id
    FROM opinions o
    JOIN reasoning_traces rt ON rt.opinion_id = o.id
    CROSS JOIN knowledge_sufficiency_predicate_versions kspv
    WHERE kspv.is_active = true
      AND kspv.implementation_key = 'agent_task_completion_sufficiency_v1'
      AND NOT EXISTS (
        SELECT 1 FROM knowledge_qualification_ledger kql
        WHERE kql.opinion_id = o.id
          AND kql.predicate_version_id = kspv.id
      )
    ON CONFLICT (opinion_id, predicate_version_id) DO NOTHING
  `);
  const enqueued = Number((enqueueRes as unknown as { rowCount: number }).rowCount ?? 0);
  if (enqueued > 0) {
    logger.info("[Build2A/kqPoller] Enqueued %d new knowledge_qualification_ledger rows", enqueued);
  }

  // ── Step 2: Claim pending rows (FOR UPDATE SKIP LOCKED) ───────────────────
  const { pool } = await import("@workspace/db");
  const client = await pool.connect();

  let processed = 0;
  let succeeded = 0;
  let insufficient = 0;
  let indeterminate = 0;
  let refused = 0;
  let failed = 0;

  try {
    const claimRes = await client.query(
      `UPDATE knowledge_qualification_ledger
       SET status            = 'processing',
           last_attempted_at = NOW(),
           attempts          = attempts + 1
       WHERE id IN (
         SELECT id FROM knowledge_qualification_ledger
         WHERE status = 'pending'
            OR (status = 'failed' AND attempts < $1)
         ORDER BY first_seen_at ASC
         LIMIT $2
         FOR UPDATE SKIP LOCKED
       )
       RETURNING id, opinion_id, predicate_version_id, attempts`,
      [MAX_ATTEMPTS, ROWS_PER_CYCLE],
    );

    const claimed = claimRes.rows as Array<{
      id: string; opinion_id: string; predicate_version_id: string; attempts: number;
    }>;
    processed = claimed.length;

    for (const row of claimed) {
      const outcome = await _processOneLedgerRow(row);
      if      (outcome === "succeeded")    succeeded++;
      else if (outcome === "insufficient") insufficient++;
      else if (outcome === "indeterminate") indeterminate++;
      else if (outcome === "refused")      refused++;
      else if (outcome === "failed")       failed++;
    }
  } finally {
    client.release();
  }

  if (processed > 0) {
    logger.info(
      { processed, succeeded, insufficient, indeterminate, refused, failed },
      "[Build2A/kqPoller] Cycle complete",
    );
  }

  return { enqueued, processed, succeeded, insufficient, indeterminate, refused, failed };
}

// ── Internal processing ───────────────────────────────────────────────────────

async function _processOneLedgerRow(row: {
  id: string;
  opinion_id: string;
  predicate_version_id: string;
  attempts: number;
}): Promise<"succeeded" | "insufficient" | "indeterminate" | "refused" | "failed"> {
  const { db } = await import("@workspace/db");
  const { sql } = await import("drizzle-orm");

  try {
    // Exhausted retries → refuse
    if (row.attempts >= MAX_ATTEMPTS) {
      const refusal = await db.execute(sql`
        INSERT INTO refusal_records (refusal_stage, reason_code, detail)
        VALUES ('knowledge',
                'qualification_computation_failed',
                ${"Opinion " + row.opinion_id + " exhausted " + MAX_ATTEMPTS + " knowledge qualification attempts. Marking refused."})
        RETURNING id
      `);
      const refusalId = (refusal.rows[0] as { id: string }).id;
      await db.execute(sql`
        UPDATE knowledge_qualification_ledger
        SET status = 'refused', completed_at = NOW(),
            resulting_refusal_id = ${refusalId}::uuid
        WHERE id = ${row.id}::uuid
      `);
      logger.warn(
        { opinionId: row.opinion_id, ledgerId: row.id },
        "[Build2A/kqPoller] Opinion exhausted retries — refused",
      );
      return "refused";
    }

    // Qualify the opinion
    const result = await qualifyOpinion({
      opinionId: row.opinion_id,
      ledgerId: row.id,
    });

    if (result.ok) {
      if      (result.outcome === "knowledge")     return "succeeded";
      else if (result.outcome === "insufficient")  return "insufficient";
      else if (result.outcome === "indeterminate") return "indeterminate";
    } else {
      // Refusal (pre-evaluation) — ledger already updated inside qualifyOpinion
      return "refused";
    }
    return "failed"; // unreachable but satisfies type
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    await db.execute(sql`
      UPDATE knowledge_qualification_ledger
      SET status = 'failed',
          errors = errors || ${JSON.stringify([{ error: errMsg, at: new Date().toISOString() }])}::jsonb
      WHERE id = ${row.id}::uuid
    `).catch(() => {});
    logger.error({ err, opinionId: row.opinion_id }, "[Build2A/kqPoller] qualifyOpinion threw — will retry");
    return "failed";
  }
}
