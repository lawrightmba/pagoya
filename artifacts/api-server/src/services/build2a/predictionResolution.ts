/**
 * Build 2A — Prediction Resolution Service (Package 2A-6)
 *
 * Resolves a behavioral_prediction by finding candidate Outcomes per the
 * governed horizon definition, applying Package 2A-2 excluded-disposition
 * continuity semantics, and computing the resolution classification.
 *
 * ── Scientific Principle ──────────────────────────────────────────────────────
 *   Resolution measures forecast accuracy — NOT worth, risk, or credit.
 *   This service NEVER makes a decision, grants authority, or sets exposure.
 *   Calibration_error_contribution derives from outcome_value (never from
 *   resolution_classification — structurally separate by design).
 *
 * ── Resolution pipeline ───────────────────────────────────────────────────────
 *   1. Load prediction (must exist with a closed or prematurely-closeable horizon)
 *   2. Find candidate Outcome per governed horizon definition
 *   3. If none found by horizon close → resolution_classification=unresolved
 *   4. If found but excluded/ambiguous per 2A-2 semantics (source deprecated) →
 *      insufficient_evidence (regardless of value match)
 *   5. Else: compare predicted_outcome_value to outcome_value →
 *      match=correct, mismatch=incorrect
 *   6. Compute calibration_error_contribution=(p-y)^2 for correct/incorrect only
 *      where y=outcome_value (never derived from resolution_classification)
 *   7. Write behavioral_prediction_resolutions row — one atomic transaction
 *
 * ── Package 2A-2 excluded-disposition continuity ─────────────────────────────
 *   A behavioral_prediction_outcome from a deprecated evidence source
 *   (evidence_source_registry.deprecated_at IS NOT NULL OR approval_status='deprecated')
 *   is treated as excluded/ambiguous — insufficient_evidence regardless of value.
 *   This parallels 2A-2's excluded-disposition semantics where revoked/excluded
 *   source observations do not count as valid observations.
 *
 * ── outcome_not_yet_available is NOT a refusal ───────────────────────────────
 *   If the horizon is still open AND no eligible event occurred, this is a
 *   pending ledger state — not a refusal. Only horizon-closed predictions
 *   or predictions with a found eligible event are passed to this service.
 *
 * ── Atomicity ────────────────────────────────────────────────────────────────
 *   One transaction writes behavioral_prediction_resolutions. Rollback on
 *   any error → no partial state.
 *
 * ── Replay checksum ──────────────────────────────────────────────────────────
 *   SHA-256 over: prediction_id, projected_probability, predicted_outcome_value,
 *   outcome_id, outcome_value, resolution_classification,
 *   calibration_error_contribution, resolution_timestamp.
 */

import { createHash } from "crypto";
import { logger } from "../../lib/logger.js";

// ── Types ──────────────────────────────────────────────────────────────────────

export type ResolvePredictionParams = {
  predictionId: string;
  ledgerId?: string | null;
  // Force resolution even if horizon not closed (for early eligible-event resolution)
  allowEarlyResolution?: boolean;
  // For replay: supply specific outcome_id to use
  replayOutcomeId?: string;
  replayResolutionTimestamp?: string;
};

export type ResolvePredictionResult =
  | {
      ok: true;
      resolutionId: string;
      resolutionClassification: "correct" | "incorrect" | "unresolved" | "insufficient_evidence";
      calibrationErrorContribution: number | null;
      outcomeId: string | null;
      replayChecksum: string;
    }
  | {
      ok: false;
      reason_code: string;
      detail: string;
      refusal_id: string | null;
    };

// ── Public API ─────────────────────────────────────────────────────────────────

export async function resolvePrediction(
  params: ResolvePredictionParams,
): Promise<ResolvePredictionResult> {
  const { pool } = await import("@workspace/db");
  const client = await pool.connect();
  try {
    return await _runResolution(client, params);
  } finally {
    client.release();
  }
}

// ── Internal pipeline ──────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function _runResolution(client: any, params: ResolvePredictionParams): Promise<ResolvePredictionResult> {
  const { db } = await import("@workspace/db");
  const { sql } = await import("drizzle-orm");
  const resolutionTimestamp = params.replayResolutionTimestamp ?? new Date().toISOString();

  // ── Step 1: Load prediction ───────────────────────────────────────────────
  const predRes = await db.execute(sql`
    SELECT
      bp.id, bp.claim_id, bp.projected_probability, bp.predicted_outcome_value,
      bp.horizon_start, bp.horizon_end, bp.prediction_governance_context_id,
      bp.version_context_id, bp.formation_timestamp
    FROM behavioral_predictions bp
    WHERE bp.id = ${params.predictionId}::uuid
    LIMIT 1
  `);

  if (predRes.rows.length === 0) {
    const refusalId = await _writeRefusal(db, sql, {
      stage: "prediction_resolution",
      reason_code: "resolution_computation_failed",
      detail: `Prediction ${params.predictionId} not found.`,
    });
    return { ok: false, reason_code: "resolution_computation_failed", detail: `Prediction ${params.predictionId} not found.`, refusal_id: refusalId };
  }

  const pred = predRes.rows[0] as {
    id: string;
    claim_id: string;
    projected_probability: string;
    predicted_outcome_value: boolean;
    horizon_start: string | null;
    horizon_end: string | null;
    prediction_governance_context_id: string | null;
    version_context_id: string | null;
    formation_timestamp: string;
  };

  const projectedProbability = Number(pred.projected_probability);
  const predictedOutcomeValue = pred.predicted_outcome_value;

  // ── Step 2: Verify horizon is closed (or early resolution allowed) ────────
  const now = new Date(resolutionTimestamp);
  const horizonEnd = pred.horizon_end ? new Date(pred.horizon_end) : null;
  const horizonClosed = horizonEnd ? now >= horizonEnd : false;

  if (!horizonClosed && !params.allowEarlyResolution && !params.replayOutcomeId) {
    // Horizon still open, no eligible event forced — pending state, not a refusal
    if (params.ledgerId) {
      await db.execute(sql`
        UPDATE prediction_resolution_ledger
        SET status = 'pending', last_attempted_at = NOW()
        WHERE id = ${params.ledgerId}::uuid
      `).catch(() => {});
    }
    return { ok: false, reason_code: "resolution_computation_failed", detail: "Horizon not yet closed and no early-resolution trigger.", refusal_id: null };
  }

  // ── Step 3: Find candidate Outcome ───────────────────────────────────────
  let outcomeId: string | null = null;
  let outcomeValue: boolean | null = null;
  let outcomeSourceDeprecated = false;

  if (params.replayOutcomeId) {
    // Replay: use specified outcome
    const replayORes = await db.execute(sql`
      SELECT bpo.id, bpo.outcome_value,
             esr.deprecated_at, esr.approval_status
      FROM behavioral_prediction_outcomes bpo
      JOIN evidence_source_registry esr ON esr.id = bpo.evidence_source_registry_id
      WHERE bpo.id = ${params.replayOutcomeId}::uuid
        AND bpo.prediction_id = ${params.predictionId}::uuid
      LIMIT 1
    `);
    if (replayORes.rows.length > 0) {
      const row = replayORes.rows[0] as { id: string; outcome_value: boolean | null; deprecated_at: string | null; approval_status: string };
      outcomeId = row.id;
      outcomeValue = row.outcome_value;
      outcomeSourceDeprecated = !!(row.deprecated_at) || row.approval_status === "deprecated";
    }
  } else {
    // Live resolution: find the first eligible outcome in the horizon window
    // Hard-exclude is_synthetic_canary_only=true in the query (not just convention)
    const outcomeRes = await db.execute(sql`
      SELECT bpo.id, bpo.outcome_value, bpo.is_synthetic_canary_only,
             esr.deprecated_at, esr.approval_status
      FROM behavioral_prediction_outcomes bpo
      JOIN evidence_source_registry esr ON esr.id = bpo.evidence_source_registry_id
      WHERE bpo.prediction_id = ${params.predictionId}::uuid
        AND bpo.is_synthetic_canary_only = false
        AND (bpo.observed_at IS NULL OR bpo.observed_at >= ${pred.horizon_start ?? pred.formation_timestamp}::timestamptz)
        AND (bpo.observed_at IS NULL OR ${pred.horizon_end ? sql`bpo.observed_at <= ${pred.horizon_end}::timestamptz` : sql`true`})
      ORDER BY bpo.observed_at ASC NULLS LAST, bpo.created_at ASC
      LIMIT 1
    `);

    if (outcomeRes.rows.length > 0) {
      const row = outcomeRes.rows[0] as { id: string; outcome_value: boolean | null; deprecated_at: string | null; approval_status: string };
      outcomeId = row.id;
      outcomeValue = row.outcome_value;
      outcomeSourceDeprecated = !!(row.deprecated_at) || row.approval_status === "deprecated";
    }
  }

  // ── Step 4: Determine resolution_classification ───────────────────────────
  let resolutionClassification: "correct" | "incorrect" | "unresolved" | "insufficient_evidence";
  let calibrationErrorContribution: number | null = null;

  if (outcomeId === null) {
    // No eligible event in horizon window by horizon close → unresolved
    resolutionClassification = "unresolved";
  } else if (outcomeSourceDeprecated) {
    // Eligible event found but source is deprecated/excluded →
    // insufficient_evidence (Package 2A-2 excluded-disposition continuity)
    // outcome_id may be set (referencing the unusable Outcome)
    resolutionClassification = "insufficient_evidence";
  } else if (outcomeValue === null) {
    // Outcome exists but outcome_value is ambiguous/indeterminate
    resolutionClassification = "insufficient_evidence";
  } else {
    // Compare predicted_outcome_value to outcome_value
    // Brier contribution MUST derive from outcome_value, NEVER from resolution_classification
    const y = outcomeValue ? 1.0 : 0.0;
    calibrationErrorContribution = Math.pow(projectedProbability - y, 2);
    resolutionClassification = (predictedOutcomeValue === outcomeValue) ? "correct" : "incorrect";
  }

  // Cross-column constraint enforcement (mirrors DB CHECK for defense-in-depth):
  // correct/incorrect MUST have outcome_id; unresolved/insufficient_evidence permit NULL
  if (
    (resolutionClassification === "correct" || resolutionClassification === "incorrect") &&
    outcomeId === null
  ) {
    const refusalId = await _writeRefusal(db, sql, {
      stage: "prediction_resolution",
      reason_code: "resolution_computation_failed",
      detail: `Cross-column constraint violation: resolution_classification=${resolutionClassification} requires outcome_id but none found.`,
    });
    return { ok: false, reason_code: "resolution_computation_failed", detail: "correct/incorrect resolution requires outcome_id.", refusal_id: refusalId };
  }

  // ── Step 5: Compute replay checksum ───────────────────────────────────────
  const replayChecksum = _buildResolutionReplayChecksum({
    predictionId: params.predictionId,
    projectedProbability,
    predictedOutcomeValue,
    outcomeId,
    outcomeValue,
    resolutionClassification,
    calibrationErrorContribution,
    resolutionTimestamp,
  });

  // ── Step 6: Atomic transaction: insert behavioral_prediction_resolutions ──
  let resolutionId: string;

  await client.query("BEGIN");
  try {
    const resRow = await client.query(
      `INSERT INTO behavioral_prediction_resolutions
         (prediction_id, outcome_id, resolution_classification,
          calibration_error_contribution, resolved_at, version_context_id,
          resolution_timestamp, replay_checksum)
       VALUES ($1::uuid, $2, $3, $4, $5::timestamptz, $6, $7::timestamptz, $8)
       RETURNING id`,
      [
        params.predictionId,
        outcomeId ?? null,
        resolutionClassification,
        calibrationErrorContribution,
        resolutionTimestamp,
        pred.version_context_id ?? null,
        resolutionTimestamp,
        replayChecksum,
      ],
    );
    resolutionId = resRow.rows[0].id as string;
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    const errMsg = err instanceof Error ? err.message : String(err);
    logger.error({ err, predictionId: params.predictionId }, "[Build2A/6/predResolution] Transaction rolled back");
    const refusalId = await _writeRefusal(db, sql, {
      stage: "prediction_resolution",
      reason_code: "resolution_computation_failed",
      detail: `Resolution transaction failed for prediction ${params.predictionId}: ${errMsg}`,
    });
    if (params.ledgerId) {
      await db.execute(sql`
        UPDATE prediction_resolution_ledger
        SET status = 'failed',
            errors = errors || ${JSON.stringify([{ error: errMsg, at: new Date().toISOString() }])}::jsonb
        WHERE id = ${params.ledgerId}::uuid
      `).catch(() => {});
    }
    return { ok: false, reason_code: "resolution_computation_failed", detail: errMsg, refusal_id: refusalId };
  }

  // ── Step 7: Update ledger ─────────────────────────────────────────────────
  if (params.ledgerId) {
    await db.execute(sql`
      UPDATE prediction_resolution_ledger
      SET status = 'succeeded', completed_at = NOW(),
          resulting_resolution_id = ${resolutionId}::uuid
      WHERE id = ${params.ledgerId}::uuid
    `).catch((err: unknown) => {
      logger.error({ err, ledgerId: params.ledgerId }, "[Build2A/6] Failed to update resolution ledger");
    });
  }

  logger.info(
    { predictionId: params.predictionId, resolutionId, resolutionClassification, calibrationErrorContribution },
    "[Build2A/6/predResolution] Resolution complete",
  );

  return {
    ok: true,
    resolutionId,
    resolutionClassification,
    calibrationErrorContribution,
    outcomeId,
    replayChecksum,
  };
}

// ── Checksum ───────────────────────────────────────────────────────────────────

function _buildResolutionReplayChecksum(inputs: {
  predictionId: string;
  projectedProbability: number;
  predictedOutcomeValue: boolean;
  outcomeId: string | null;
  outcomeValue: boolean | null;
  resolutionClassification: string;
  calibrationErrorContribution: number | null;
  resolutionTimestamp: string;
}): string {
  const payload = JSON.stringify({
    prediction_id: inputs.predictionId,
    projected_probability: inputs.projectedProbability.toFixed(8),
    predicted_outcome_value: inputs.predictedOutcomeValue,
    outcome_id: inputs.outcomeId ?? "null",
    outcome_value: inputs.outcomeValue,
    resolution_classification: inputs.resolutionClassification,
    calibration_error_contribution: inputs.calibrationErrorContribution !== null
      ? inputs.calibrationErrorContribution.toFixed(16)
      : "null",
    resolution_timestamp: inputs.resolutionTimestamp,
  });
  return createHash("sha256").update(payload).digest("hex");
}

/**
 * Independently recompute the resolution replay checksum for audit/canary use.
 * Uses crypto.createHash directly — NOT the internal function called twice.
 * Must produce byte-for-byte identical output to the stored checksum.
 */
export function computeResolutionReplayChecksum(inputs: {
  predictionId: string;
  projectedProbability: number;
  predictedOutcomeValue: boolean;
  outcomeId: string | null;
  outcomeValue: boolean | null;
  resolutionClassification: string;
  calibrationErrorContribution: number | null;
  resolutionTimestamp: string;
}): string {
  const payload = JSON.stringify({
    prediction_id: inputs.predictionId,
    projected_probability: inputs.projectedProbability.toFixed(8),
    predicted_outcome_value: inputs.predictedOutcomeValue,
    outcome_id: inputs.outcomeId ?? "null",
    outcome_value: inputs.outcomeValue,
    resolution_classification: inputs.resolutionClassification,
    calibration_error_contribution: inputs.calibrationErrorContribution !== null
      ? inputs.calibrationErrorContribution.toFixed(16)
      : "null",
    resolution_timestamp: inputs.resolutionTimestamp,
  });
  return createHash("sha256").update(payload).digest("hex");
}

// ── Refusal helper ─────────────────────────────────────────────────────────────

async function _writeRefusal(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sql: any,
  params: { stage: string; reason_code: string; detail: string },
): Promise<string | null> {
  try {
    const res = await db.execute(sql`
      INSERT INTO refusal_records (refusal_stage, reason_code, detail)
      VALUES (${params.stage}, ${params.reason_code}, ${params.detail})
      RETURNING id
    `);
    return (res.rows[0] as { id: string }).id;
  } catch (err) {
    logger.error({ err }, "[Build2A/6] Failed to write refusal record");
    return null;
  }
}
