/**
 * Build 2A — Prediction Formation Ledger / Poller (Package 2A-6)
 *
 * Async DB poller that continuously forms predictions from knowledge records
 * that have no current prediction_formation_ledger row for the active
 * formation rule version.
 *
 * Architecture mirrors knowledgeQualificationLedger.ts:
 *   - FOR UPDATE SKIP LOCKED on prediction_formation_ledger
 *   - Single-start guard (idempotent)
 *   - ENABLE_EVIDENCE_ENGINE=true flag gate
 *   - Chains after Package 2A-6 readiness is confirmed
 */

import { logger } from "../../lib/logger.js";
import { formPrediction } from "./predictionFormation.js";
import { isBuild2a6Ready } from "./build2aReadiness.js";

const POLL_INTERVAL_MS = 30_000;
const ROWS_PER_CYCLE   = 5;
const MAX_ATTEMPTS     = 3;

let _pollerStarted = false;

export function startPredictionFormationPoller(): void {
  if (process.env["ENABLE_EVIDENCE_ENGINE"] !== "true") {
    logger.info("[Build2A/predFormPoller] ENABLE_EVIDENCE_ENGINE != 'true' — prediction formation poller not started");
    return;
  }
  if (_pollerStarted) {
    logger.warn("[Build2A/predFormPoller] startPredictionFormationPoller called more than once — ignoring");
    return;
  }
  _pollerStarted = true;
  logger.info("[Build2A/predFormPoller] Starting prediction formation poller (interval=%dms)", POLL_INTERVAL_MS);
  setInterval(() => {
    runPredictionFormationCycle().catch((err) => {
      logger.error({ err }, "[Build2A/predFormPoller] Unhandled error in formation cycle");
    });
  }, POLL_INTERVAL_MS);
}

/** TEST-ONLY: reset started guard */
export function _resetPredFormPollerForTesting(): void {
  _pollerStarted = false;
}

export async function runPredictionFormationCycle(): Promise<{
  enqueued: number; processed: number; succeeded: number; refused: number; failed: number;
}> {
  if (!isBuild2a6Ready()) {
    return { enqueued: 0, processed: 0, succeeded: 0, refused: 0, failed: 0 };
  }

  const { db } = await import("@workspace/db");
  const { sql } = await import("drizzle-orm");

  // Enqueue knowledge_records that have no prediction_formation_ledger row
  // for the active knowledge_persistence_forecast_v1 formation rule.
  const enqueueRes = await db.execute(sql`
    INSERT INTO prediction_formation_ledger (knowledge_record_id, prediction_formation_rule_version_id)
    SELECT kr.id, pfrv.id
    FROM knowledge_records kr
    CROSS JOIN prediction_formation_rule_versions pfrv
    WHERE pfrv.implementation_key = 'knowledge_persistence_forecast_v1'
      AND pfrv.is_active = true
      AND NOT EXISTS (
        SELECT 1 FROM prediction_formation_ledger pfl
        WHERE pfl.knowledge_record_id = kr.id
          AND pfl.prediction_formation_rule_version_id = pfrv.id
      )
    ON CONFLICT (knowledge_record_id, prediction_formation_rule_version_id) DO NOTHING
  `);
  const enqueued = Number((enqueueRes as unknown as { rowCount: number }).rowCount ?? 0);
  if (enqueued > 0) logger.info("[Build2A/predFormPoller] Enqueued %d prediction formation rows", enqueued);

  const { pool } = await import("@workspace/db");
  const client = await pool.connect();

  let processed = 0, succeeded = 0, refused = 0, failed = 0;
  try {
    const claimRes = await client.query(
      `UPDATE prediction_formation_ledger
       SET status = 'processing', last_attempted_at = NOW(), attempts = attempts + 1
       WHERE id IN (
         SELECT id FROM prediction_formation_ledger
         WHERE status = 'pending' OR (status = 'failed' AND attempts < $1)
         ORDER BY first_seen_at ASC LIMIT $2
         FOR UPDATE SKIP LOCKED
       )
       RETURNING id, knowledge_record_id, prediction_formation_rule_version_id, attempts`,
      [MAX_ATTEMPTS, ROWS_PER_CYCLE],
    );

    const claimed = claimRes.rows as Array<{ id: string; knowledge_record_id: string; attempts: number }>;
    processed = claimed.length;

    for (const row of claimed) {
      const outcome = await _processOneFormationRow(row);
      if (outcome === "succeeded") succeeded++;
      else if (outcome === "refused") refused++;
      else failed++;
    }
  } finally {
    client.release();
  }

  return { enqueued, processed, succeeded, refused, failed };
}

async function _processOneFormationRow(row: { id: string; knowledge_record_id: string; attempts: number }): Promise<"succeeded" | "refused" | "failed"> {
  const { db } = await import("@workspace/db");
  const { sql } = await import("drizzle-orm");

  try {
    if (row.attempts >= MAX_ATTEMPTS) {
      const refusal = await db.execute(sql`
        INSERT INTO refusal_records (refusal_stage, reason_code, detail)
        VALUES ('prediction_formation', 'formation_rule_unavailable',
                ${"Knowledge record " + row.knowledge_record_id + " exhausted " + MAX_ATTEMPTS + " prediction formation attempts."})
        RETURNING id
      `);
      await db.execute(sql`
        UPDATE prediction_formation_ledger
        SET status = 'refused', completed_at = NOW(),
            resulting_refusal_id = ${(refusal.rows[0] as { id: string }).id}::uuid
        WHERE id = ${row.id}::uuid
      `);
      return "refused";
    }

    const result = await formPrediction({ knowledgeRecordId: row.knowledge_record_id, ledgerId: row.id });
    return result.ok ? "succeeded" : "refused";
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    await db.execute(sql`
      UPDATE prediction_formation_ledger
      SET status = 'failed',
          errors = errors || ${JSON.stringify([{ error: errMsg, at: new Date().toISOString() }])}::jsonb
      WHERE id = ${row.id}::uuid
    `).catch(() => {});
    logger.error({ err, knowledgeRecordId: row.knowledge_record_id }, "[Build2A/predFormPoller] formPrediction threw");
    return "failed";
  }
}
