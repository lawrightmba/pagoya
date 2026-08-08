/**
 * Build 3A — Trajectory Computation Ledger / Poller
 *
 * Async DB poller that enqueues and processes trajectory computations
 * for claims that have accumulated ≥2 opinions.
 *
 * Architecture mirrors knowledgeQualificationLedger.ts:
 *   - FOR UPDATE SKIP LOCKED prevents duplicate concurrent computation
 *   - Single-start guard (idempotent)
 *   - ENABLE_EVIDENCE_ENGINE=true flag gate
 *   - Chains after Build 3A readiness is confirmed
 *
 * Processing cycle:
 *   1. Enqueue: Find claims with ≥2 opinions whose latest opinion is not
 *      yet covered by a succeeded/refused ledger row. Insert ledger rows
 *      idempotently (ON CONFLICT DO NOTHING).
 *   2. Claim: SELECT FOR UPDATE SKIP LOCKED — claim one pending row at a time.
 *   3. Compute: Call computeTrajectory() atomically.
 *   4. Update ledger: mark succeeded/refused/failed.
 *
 * Concurrency guarantee: UNIQUE(claim_id, trajectory_rule_version_id, end_opinion_id)
 * prevents duplicate trajectories for the same (claim, rule, latest_opinion) tuple.
 *
 * Retry: failed rows re-queued on next cycle (max 5 attempts before refused).
 */

import { logger } from "../../lib/logger.js";
import { computeTrajectory } from "./trajectoryComputation.js";
import { isBuild3aReady } from "./build3aReadiness.js";

const POLL_INTERVAL_MS = 30_000; // poll every 30 seconds
const ROWS_PER_CYCLE   = 5;      // claim at most N per cycle
const MAX_ATTEMPTS     = 5;      // after this many failures, mark refused

let _pollerStarted = false;

/**
 * Start the trajectory computation poller.
 * Idempotent: calling more than once has no effect.
 * Called from index.ts after ensureBuild3aTables() resolves.
 * Gated by ENABLE_EVIDENCE_ENGINE=true.
 */
export function startTrajectoryComputationPoller(): void {
  if (process.env["ENABLE_EVIDENCE_ENGINE"] !== "true") {
    logger.info("[Build3A/ledger] ENABLE_EVIDENCE_ENGINE != 'true' — trajectory poller not started");
    return;
  }

  if (_pollerStarted) {
    logger.warn("[Build3A/ledger] startTrajectoryComputationPoller called more than once — ignoring");
    return;
  }

  _pollerStarted = true;
  logger.info("[Build3A/ledger] Starting trajectory computation poller (interval=%dms)", POLL_INTERVAL_MS);

  setInterval(() => {
    runTrajectoryComputationCycle().catch((err) => {
      logger.error({ err }, "[Build3A/ledger] Unhandled error in computation cycle");
    });
  }, POLL_INTERVAL_MS);
}

/** TEST-ONLY: reset the started guard. */
export function _resetTrajectoryPollerForTesting(): void {
  _pollerStarted = false;
}

/**
 * One trajectory computation poll cycle.
 * Exported for testing; normally called by the setInterval above.
 */
export async function runTrajectoryComputationCycle(): Promise<{
  enqueued: number;
  processed: number;
  succeeded: number;
  refused: number;
  failed: number;
}> {
  if (!isBuild3aReady()) {
    logger.debug("[Build3A/ledger] Skipping cycle — Build 3A not ready");
    return { enqueued: 0, processed: 0, succeeded: 0, refused: 0, failed: 0 };
  }

  const { db } = await import("@workspace/db");
  const { sql } = await import("drizzle-orm");

  // ── Step 1: Enqueue ──────────────────────────────────────────────────────
  // Find claims with ≥2 opinions whose latest opinion is not yet in the ledger
  // for the active trajectory rule version.
  const enqueueRes = await db.execute(sql`
    INSERT INTO trajectory_computation_ledger (claim_id, trajectory_rule_version_id, end_opinion_id)
    SELECT
      latest_op.claim_id,
      trv.id AS trajectory_rule_version_id,
      latest_op.id AS end_opinion_id
    FROM (
      SELECT DISTINCT ON (o.claim_id)
        o.claim_id,
        o.id
      FROM opinions o
      INNER JOIN (
        SELECT claim_id
        FROM opinions
        GROUP BY claim_id
        HAVING COUNT(*) >= 2
      ) mc ON mc.claim_id = o.claim_id
      ORDER BY o.claim_id, o.evaluation_time DESC, o.id DESC
    ) latest_op
    CROSS JOIN trajectory_rule_versions trv
    WHERE trv.is_active = true
      AND NOT EXISTS (
        SELECT 1 FROM trajectory_computation_ledger tcl
        WHERE tcl.claim_id = latest_op.claim_id
          AND tcl.trajectory_rule_version_id = trv.id
          AND tcl.end_opinion_id = latest_op.id
          AND tcl.status IN ('succeeded', 'refused', 'pending', 'processing')
      )
    ON CONFLICT (claim_id, trajectory_rule_version_id, end_opinion_id) DO NOTHING
  `);
  const enqueued = Number((enqueueRes as unknown as { rowCount: number }).rowCount ?? 0);
  if (enqueued > 0) {
    logger.info("[Build3A/ledger] Enqueued %d new trajectory_computation_ledger rows", enqueued);
  }

  // ── Step 2: Claim rows (FOR UPDATE SKIP LOCKED) ──────────────────────────
  const { pool } = await import("@workspace/db");
  const client = await pool.connect();

  let processed = 0;
  let succeeded = 0;
  let refused   = 0;
  let failed    = 0;

  try {
    const claimRes = await client.query(
      `UPDATE trajectory_computation_ledger
       SET status            = 'processing',
           last_attempted_at = NOW(),
           attempts          = attempts + 1
       WHERE id IN (
         SELECT id FROM trajectory_computation_ledger
         WHERE status = 'pending'
            OR (status = 'failed' AND attempts < $1)
         ORDER BY first_seen_at ASC
         LIMIT $2
         FOR UPDATE SKIP LOCKED
       )
       RETURNING id, claim_id, trajectory_rule_version_id, end_opinion_id, attempts`,
      [MAX_ATTEMPTS, ROWS_PER_CYCLE],
    );

    const claimed = claimRes.rows as Array<{
      id: string;
      claim_id: string;
      trajectory_rule_version_id: string;
      end_opinion_id: string;
      attempts: number;
    }>;
    processed = claimed.length;

    for (const row of claimed) {
      const outcome = await _processOneLedgerRow(row);
      if      (outcome === "succeeded") succeeded++;
      else if (outcome === "refused")   refused++;
      else                              failed++;
    }
  } finally {
    client.release();
  }

  if (processed > 0) {
    logger.info(
      { processed, succeeded, refused, failed },
      "[Build3A/ledger] Cycle complete",
    );
  }

  return { enqueued, processed, succeeded, refused, failed };
}

// ── Internal ──────────────────────────────────────────────────────────────────

async function _processOneLedgerRow(row: {
  id: string;
  claim_id: string;
  trajectory_rule_version_id: string;
  end_opinion_id: string;
  attempts: number;
}): Promise<"succeeded" | "refused" | "failed"> {
  const { db } = await import("@workspace/db");
  const { sql } = await import("drizzle-orm");

  try {
    if (row.attempts >= MAX_ATTEMPTS) {
      // Exhausted retries → write computation_failed refusal
      const refRes = await db.execute(sql`
        INSERT INTO trajectory_refusal_records
          (claim_id, trajectory_rule_version_id, reason_code, detail)
        VALUES (
          ${row.claim_id}::uuid,
          ${row.trajectory_rule_version_id}::uuid,
          'trajectory_computation_failed',
          ${`Ledger row ${row.id} exhausted ${MAX_ATTEMPTS} attempts without success. Marking permanently refused.`}
        )
        RETURNING id
      `);
      const refusalId = (refRes.rows[0] as { id: string }).id;
      await db.execute(sql`
        UPDATE trajectory_computation_ledger
        SET status = 'refused', completed_at = NOW(), resulting_refusal_id = ${refusalId}::uuid
        WHERE id = ${row.id}::uuid
      `);
      logger.warn({ ledgerId: row.id, claimId: row.claim_id }, "[Build3A/ledger] Exhausted retries — refused");
      return "refused";
    }

    const result = await computeTrajectory({
      claimId: row.claim_id,
      ruleVersionId: row.trajectory_rule_version_id,
    });

    if (result.ok) {
      await db.execute(sql`
        UPDATE trajectory_computation_ledger
        SET status = 'succeeded', completed_at = NOW(),
            resulting_trajectory_id = ${result.trajectoryId}::uuid
        WHERE id = ${row.id}::uuid
      `);
      return "succeeded";
    } else if (result.reason === "refused") {
      await db.execute(sql`
        UPDATE trajectory_computation_ledger
        SET status = 'refused', completed_at = NOW(),
            resulting_refusal_id = ${result.refusalId}::uuid
        WHERE id = ${row.id}::uuid
      `);
      return "refused";
    } else if (result.reason === "insufficient_history") {
      // ≥2 opinions required; this can happen in races. Mark succeeded with null trajectory.
      await db.execute(sql`
        UPDATE trajectory_computation_ledger
        SET status = 'failed'
        WHERE id = ${row.id}::uuid
      `);
      return "failed";
    } else {
      await db.execute(sql`
        UPDATE trajectory_computation_ledger
        SET status = 'failed',
            errors = errors || ${JSON.stringify([{ error: result.message, at: new Date().toISOString() }])}::jsonb
        WHERE id = ${row.id}::uuid
      `).catch(() => {});
      return "failed";
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    await db.execute(sql`
      UPDATE trajectory_computation_ledger
      SET status = 'failed',
          errors = errors || ${JSON.stringify([{ error: errMsg, at: new Date().toISOString() }])}::jsonb
      WHERE id = ${row.id}::uuid
    `).catch(() => {});
    logger.error({ err, claimId: row.claim_id }, "[Build3A/ledger] computeTrajectory threw — will retry");
    return "failed";
  }
}
