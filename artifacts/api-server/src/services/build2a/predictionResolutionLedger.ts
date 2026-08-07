/**
 * Build 2A — Prediction Resolution Ledger / Poller (Package 2A-6)
 *
 * Async DB poller that resolves behavioral_predictions whose horizons have
 * closed or which have an eligible early outcome event.
 *
 * 'pending' in prediction_resolution_ledger = outcome_not_yet_available.
 * This is an OPERATIONAL STATE, not a resolution_classification value.
 * Pending entries are re-checked each cycle until the horizon closes.
 */

import { logger } from "../../lib/logger.js";
import { resolvePrediction } from "./predictionResolution.js";
import { isBuild2a6Ready } from "./build2aReadiness.js";

const POLL_INTERVAL_MS = 30_000;
const ROWS_PER_CYCLE   = 5;
const MAX_ATTEMPTS     = 5;

let _pollerStarted = false;

export function startPredictionResolutionPoller(): void {
  if (process.env["ENABLE_EVIDENCE_ENGINE"] !== "true") {
    logger.info("[Build2A/predResPoller] ENABLE_EVIDENCE_ENGINE != 'true' — prediction resolution poller not started");
    return;
  }
  if (_pollerStarted) {
    logger.warn("[Build2A/predResPoller] startPredictionResolutionPoller called more than once — ignoring");
    return;
  }
  _pollerStarted = true;
  logger.info("[Build2A/predResPoller] Starting prediction resolution poller (interval=%dms)", POLL_INTERVAL_MS);
  setInterval(() => {
    runPredictionResolutionCycle().catch((err) => {
      logger.error({ err }, "[Build2A/predResPoller] Unhandled error in resolution cycle");
    });
  }, POLL_INTERVAL_MS);
}

/** TEST-ONLY: reset started guard */
export function _resetPredResPollerForTesting(): void {
  _pollerStarted = false;
}

export async function runPredictionResolutionCycle(): Promise<{
  enqueued: number; processed: number; succeeded: number; refused: number; failed: number;
}> {
  if (!isBuild2a6Ready()) {
    return { enqueued: 0, processed: 0, succeeded: 0, refused: 0, failed: 0 };
  }

  const { db } = await import("@workspace/db");
  const { sql } = await import("drizzle-orm");

  // Enqueue predictions that have no prediction_resolution_ledger row.
  // UNIQUE (prediction_id) ensures exactly one resolution per prediction.
  const enqueueRes = await db.execute(sql`
    INSERT INTO prediction_resolution_ledger (prediction_id)
    SELECT bp.id
    FROM behavioral_predictions bp
    WHERE NOT EXISTS (
      SELECT 1 FROM prediction_resolution_ledger prl
      WHERE prl.prediction_id = bp.id
    )
    ON CONFLICT (prediction_id) DO NOTHING
  `);
  const enqueued = Number((enqueueRes as unknown as { rowCount: number }).rowCount ?? 0);
  if (enqueued > 0) logger.info("[Build2A/predResPoller] Enqueued %d prediction resolution rows", enqueued);

  const { pool } = await import("@workspace/db");
  const client = await pool.connect();

  let processed = 0, succeeded = 0, refused = 0, failed = 0;
  try {
    // Claim predictions whose horizon has closed OR which have an eligible outcome.
    // Skip predictions whose horizon is still open AND have no outcome yet (stay pending).
    const claimRes = await client.query(
      `UPDATE prediction_resolution_ledger prl
       SET status = 'processing', last_attempted_at = NOW(), attempts = attempts + 1
       WHERE prl.id IN (
         SELECT prl2.id FROM prediction_resolution_ledger prl2
         JOIN behavioral_predictions bp ON bp.id = prl2.prediction_id
         WHERE (prl2.status = 'pending' OR (prl2.status = 'failed' AND prl2.attempts < $1))
           AND (
             bp.horizon_end <= NOW()
             OR EXISTS (
               SELECT 1 FROM behavioral_prediction_outcomes bpo
               WHERE bpo.prediction_id = bp.id AND bpo.is_synthetic_canary_only = false
             )
           )
         ORDER BY bp.horizon_end ASC NULLS LAST
         LIMIT $2
         FOR UPDATE SKIP LOCKED
       )
       RETURNING prl.id, prl.prediction_id, prl.attempts`,
      [MAX_ATTEMPTS, ROWS_PER_CYCLE],
    );

    const claimed = claimRes.rows as Array<{ id: string; prediction_id: string; attempts: number }>;
    processed = claimed.length;

    for (const row of claimed) {
      const outcome = await _processOneResolutionRow(row);
      if (outcome === "succeeded") succeeded++;
      else if (outcome === "refused") refused++;
      else failed++;
    }
  } finally {
    client.release();
  }

  return { enqueued, processed, succeeded, refused, failed };
}

async function _processOneResolutionRow(row: { id: string; prediction_id: string; attempts: number }): Promise<"succeeded" | "refused" | "failed"> {
  const { db } = await import("@workspace/db");
  const { sql } = await import("drizzle-orm");

  try {
    if (row.attempts >= MAX_ATTEMPTS) {
      const refusal = await db.execute(sql`
        INSERT INTO refusal_records (refusal_stage, reason_code, detail)
        VALUES ('prediction_resolution', 'resolution_computation_failed',
                ${"Prediction " + row.prediction_id + " exhausted " + MAX_ATTEMPTS + " resolution attempts."})
        RETURNING id
      `);
      await db.execute(sql`
        UPDATE prediction_resolution_ledger
        SET status = 'refused', completed_at = NOW(),
            resulting_refusal_id = ${(refusal.rows[0] as { id: string }).id}::uuid
        WHERE id = ${row.id}::uuid
      `);
      return "refused";
    }

    const result = await resolvePrediction({
      predictionId: row.prediction_id,
      ledgerId: row.id,
      allowEarlyResolution: true,
    });

    if (result.ok) return "succeeded";

    // "horizon not yet closed" re-queues as pending
    if (result.reason_code === "resolution_computation_failed" && result.refusal_id === null) {
      await db.execute(sql`
        UPDATE prediction_resolution_ledger SET status = 'pending' WHERE id = ${row.id}::uuid
      `).catch(() => {});
      return "failed";
    }
    return "refused";
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    await db.execute(sql`
      UPDATE prediction_resolution_ledger
      SET status = 'failed',
          errors = errors || ${JSON.stringify([{ error: errMsg, at: new Date().toISOString() }])}::jsonb
      WHERE id = ${row.id}::uuid
    `).catch(() => {});
    logger.error({ err, predictionId: row.prediction_id }, "[Build2A/predResPoller] resolvePrediction threw");
    return "failed";
  }
}
