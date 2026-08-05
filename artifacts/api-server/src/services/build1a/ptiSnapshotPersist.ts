/**
 * Build 1A — PTI Input Snapshot Persistence
 *
 * Persists the PTIDataSnapshot object that was already produced by
 * buildPTISnapshotFromDb() into pti_score_input_snapshots.
 *
 * CONTRACT:
 * - This function MUST be called fire-and-forget (no await at call site).
 * - Failures are logged and swallowed — they never block the scoring path.
 * - The snapshot is stored as-is (no transformation). Do not modify
 *   computePTIv5() signal logic, weights, or normalization.
 * - Enabled only when ENABLE_PTI_SNAPSHOT_PERSISTENCE=true.
 * - Only scoring runs created AFTER this build are replayable. Historical
 *   scores have no stored input snapshot and are classified not_replayable.
 */

import { sql } from "drizzle-orm";
import { logger } from "../../lib/logger.js";

export function isPtiSnapshotPersistenceEnabled(): boolean {
  return process.env.ENABLE_PTI_SNAPSHOT_PERSISTENCE === "true";
}

/**
 * Persist a PTIDataSnapshot alongside the score history write.
 *
 * @param snapshot     The raw PTIDataSnapshot object passed to computePTIv5().
 * @param modelVersion The model_version string from the resulting breakdown.
 * @param telefono     The user's phone number.
 * @param capturedAt   ISO string — timestamp of the scoring run (same clock as the
 *                     history insert, though exact DB NOW() may differ by ms).
 */
export async function persistPtiInputSnapshot(
  snapshot: unknown,
  modelVersion: string,
  telefono: string,
  capturedAt: string,
): Promise<void> {
  if (!isPtiSnapshotPersistenceEnabled()) return;

  try {
    const { db } = await import("@workspace/db");

    // Redact any fields that should not be persisted.
    // The PTIDataSnapshot contains only numeric signals derived from DB aggregates —
    // no raw message bodies, PII text fields, or payment references. Safe to store.
    // If the snapshot interface ever grows PII fields, add explicit redaction here.
    const sanitized = JSON.parse(JSON.stringify(snapshot ?? {}));

    await db.execute(sql`
      INSERT INTO pti_score_input_snapshots
        (telefono, snapshot, model_version, captured_at,
         score_history_recorded_at, score_history_telefono, persistence_status)
      VALUES
        (${telefono}, ${JSON.stringify(sanitized)}::jsonb, ${modelVersion},
         ${capturedAt}::timestamptz,
         ${capturedAt}::timestamptz,
         ${telefono},
         'persisted')
    `);
  } catch (err) {
    logger.warn(
      { err, telefono },
      "[Build1A/ptiSnapshotPersist] Failed to persist snapshot — scoring continues unaffected",
    );
    // Do not rethrow. The scoring path must never be affected by persistence failures.
  }
}
