/**
 * Build 2A — Opinion Formation Poller (Package 2A-4)
 *
 * Async DB poller that continuously forms opinions for behavioral claims that
 * have weighted evidence contributions but no current opinion under the active
 * fusion operator version.
 *
 * Architecture mirrors weightingPoller.ts:
 *   - FOR UPDATE SKIP LOCKED on opinion_formation_ledger (prevents duplicate work)
 *   - Single-start guard (startOpinionPoller idempotent: only one interval per process)
 *   - ENABLE_EVIDENCE_ENGINE=true flag gate
 *   - Chains after Package 2A-4 readiness is confirmed
 *
 * Processing cycle:
 *   1. Enqueue: Find all claims that have a chain-tip contribution in
 *      latest_weighted_contribution_v but no ledger row for the active
 *      fusion_operator_version. Insert ledger rows (idempotent via ON CONFLICT DO NOTHING).
 *   2. Claim: SELECT FOR UPDATE SKIP LOCKED — claim one pending row at a time.
 *   3. Form: Call formOpinion() atomically.
 *   4. Update ledger: mark succeeded (or refused/failed).
 *
 * Retry: failed rows are re-queued on the next poll cycle (max 5 attempts).
 */

import { logger } from "../../lib/logger.js";
import { formOpinion } from "./opinionPersistence.js";
import { isBuild2a4Ready } from "./build2aReadiness.js";

const POLL_INTERVAL_MS = 15_000;  // poll every 15 seconds
const ROWS_PER_CYCLE   = 10;      // claim at most N claims per cycle
const MAX_ATTEMPTS     = 5;       // after this many failures, mark refused

let _pollerStarted = false;

/**
 * Start the opinion formation poller.
 * Idempotent: calling more than once has no effect.
 * Called from index.ts after ensureBuild2a4Tables() resolves.
 * Gated by ENABLE_EVIDENCE_ENGINE=true.
 */
export function startOpinionPoller(): void {
  if (process.env["ENABLE_EVIDENCE_ENGINE"] !== "true") {
    logger.info("[Build2A/opinionPoller] ENABLE_EVIDENCE_ENGINE != 'true' — opinion poller not started");
    return;
  }

  if (_pollerStarted) {
    logger.warn("[Build2A/opinionPoller] startOpinionPoller called more than once — ignoring");
    return;
  }

  _pollerStarted = true;
  logger.info("[Build2A/opinionPoller] Starting opinion poller (interval=%dms)", POLL_INTERVAL_MS);

  setInterval(() => {
    runOpinionCycle().catch((err) => {
      logger.error({ err }, "[Build2A/opinionPoller] Unhandled error in opinion cycle");
    });
  }, POLL_INTERVAL_MS);
}

/** TEST-ONLY: reset the started guard so tests can call startOpinionPoller again. */
export function _resetOpinionPollerForTesting(): void {
  _pollerStarted = false;
}

/**
 * One opinion formation poll cycle.
 * Exported for testing; normally called by the setInterval above.
 */
export async function runOpinionCycle(): Promise<{
  enqueued: number;
  processed: number;
  succeeded: number;
  refused: number;
  failed: number;
}> {
  if (!isBuild2a4Ready()) {
    logger.debug("[Build2A/opinionPoller] Skipping cycle — Package 2A-4 not ready");
    return { enqueued: 0, processed: 0, succeeded: 0, refused: 0, failed: 0 };
  }

  const { db } = await import("@workspace/db");
  const { sql } = await import("drizzle-orm");

  // ── Step 1: Enqueue claims with contributions but no ledger row ───────────
  // Find claims where at least one weighted_evidence_contribution chain-tip exists
  // (in latest_weighted_contribution_v) but the opinion_formation_ledger has
  // no row for that claim + the currently active fusion_operator_version.
  const enqueueRes = await db.execute(sql`
    INSERT INTO opinion_formation_ledger (claim_id, fusion_operator_version_id)
    SELECT DISTINCT iea.claim_id, fov.id
    FROM latest_weighted_contribution_v wec
    JOIN interpreted_evidence_atoms iea ON iea.id = wec.atom_id
    CROSS JOIN fusion_operator_versions fov
    WHERE fov.is_active = true
      AND fov.implementation_key = 'sl_opinion_formation_v1'
      AND NOT EXISTS (
        SELECT 1 FROM opinion_formation_ledger ofl
        WHERE ofl.claim_id = iea.claim_id
          AND ofl.fusion_operator_version_id = fov.id
      )
    ON CONFLICT (claim_id, fusion_operator_version_id) DO NOTHING
  `);
  const enqueued = Number((enqueueRes as unknown as { rowCount: number }).rowCount ?? 0);
  if (enqueued > 0) {
    logger.info("[Build2A/opinionPoller] Enqueued %d new opinion_formation_ledger rows", enqueued);
  }

  // ── Step 2: Claim pending rows (FOR UPDATE SKIP LOCKED) ───────────────────
  const { pool } = await import("@workspace/db");
  const client = await pool.connect();

  let processed = 0;
  let succeeded = 0;
  let refused   = 0;
  let failed    = 0;

  try {
    const claimRes = await client.query(
      `UPDATE opinion_formation_ledger
       SET status            = 'processing',
           last_attempted_at = NOW(),
           attempts          = attempts + 1
       WHERE id IN (
         SELECT id FROM opinion_formation_ledger
         WHERE status = 'pending'
            OR (status = 'failed' AND attempts < $1)
         ORDER BY first_seen_at ASC
         LIMIT $2
         FOR UPDATE SKIP LOCKED
       )
       RETURNING id, claim_id, fusion_operator_version_id, attempts`,
      [MAX_ATTEMPTS, ROWS_PER_CYCLE],
    );

    const claimed = claimRes.rows as Array<{
      id: string; claim_id: string; fusion_operator_version_id: string; attempts: number;
    }>;
    processed = claimed.length;

    for (const row of claimed) {
      await _processOneLedgerRow(row);
    }

    // Count outcomes
    if (claimed.length > 0) {
      const ids = claimed.map(r => r.id);
      const outcomeRes = await client.query(
        `SELECT status, COUNT(*)::int AS n FROM opinion_formation_ledger
         WHERE id = ANY($1::uuid[]) GROUP BY status`,
        [ids],
      );
      for (const row of outcomeRes.rows as Array<{ status: string; n: number }>) {
        if      (row.status === "succeeded") succeeded = row.n;
        else if (row.status === "refused")   refused   = row.n;
        else if (row.status === "failed")    failed    = row.n;
      }
    }
  } finally {
    client.release();
  }

  if (processed > 0) {
    logger.info(
      { processed, succeeded, refused, failed },
      "[Build2A/opinionPoller] Cycle complete",
    );
  }

  return { enqueued, processed, succeeded, refused, failed };
}

// ── Internal processing ───────────────────────────────────────────────────────

async function _processOneLedgerRow(row: {
  id: string;
  claim_id: string;
  fusion_operator_version_id: string;
  attempts: number;
}): Promise<void> {
  const { db } = await import("@workspace/db");
  const { sql } = await import("drizzle-orm");

  try {
    // Exhausted retries → refuse
    if (row.attempts >= MAX_ATTEMPTS) {
      const refusal = await db.execute(sql`
        INSERT INTO refusal_records (refusal_stage, reason_code, detail)
        VALUES ('fusion', 'bundle_construction_failed',
                ${'Claim ' + row.claim_id + ' exhausted ' + MAX_ATTEMPTS + ' opinion formation attempts. Marking refused.'})
        RETURNING id
      `);
      const refusalId = (refusal.rows[0] as { id: string }).id;
      await db.execute(sql`
        UPDATE opinion_formation_ledger
        SET status = 'refused', completed_at = NOW(),
            resulting_refusal_id = ${refusalId}::uuid
        WHERE id = ${row.id}::uuid
      `);
      logger.warn(
        { claimId: row.claim_id, ledgerId: row.id },
        "[Build2A/opinionPoller] Claim exhausted retries — refused",
      );
      return;
    }

    // Check for existing opinion (race guard)
    const existing = await db.execute(sql`
      SELECT id FROM latest_opinion_v WHERE claim_id = ${row.claim_id}::uuid LIMIT 1
    `);
    if ((existing.rows as unknown[]).length > 0) {
      const opinionId = (existing.rows[0] as { id: string }).id;
      await db.execute(sql`
        UPDATE opinion_formation_ledger
        SET status = 'succeeded', completed_at = NOW(),
            resulting_opinion_id = ${opinionId}::uuid
        WHERE id = ${row.id}::uuid
      `);
      return;
    }

    // Form the opinion
    const result = await formOpinion({
      claimId: row.claim_id,
      fusionOperatorVersionId: row.fusion_operator_version_id,
      ledgerId: row.id,
    });

    if (result.ok) {
      await db.execute(sql`
        UPDATE opinion_formation_ledger
        SET status = 'succeeded', completed_at = NOW(),
            resulting_opinion_id = ${result.opinionId}::uuid
        WHERE id = ${row.id}::uuid
      `);
    }
    // If not ok: formOpinion already updated the ledger row to 'refused' via _recordRefusal
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    await db.execute(sql`
      UPDATE opinion_formation_ledger
      SET status = 'failed',
          errors = errors || ${JSON.stringify([{ error: errMsg, at: new Date().toISOString() }])}::jsonb
      WHERE id = ${row.id}::uuid
    `).catch(() => {});
    logger.error({ err, claimId: row.claim_id }, "[Build2A/opinionPoller] formOpinion threw — will retry");
  }
}
