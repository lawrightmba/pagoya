/**
 * Build 2A — Calibration Aggregation Service (Package 2A-6)
 *
 * Aggregates resolved behavioral_prediction_resolutions into calibration_runs
 * and calibration_metrics using the approved brier_score_v1 metric.
 *
 * ── Scientific Principle ──────────────────────────────────────────────────────
 *   Calibration measures forecast performance — NOT worth, risk, or credit.
 *   This service NEVER authorizes, approves, denies, restricts, or lends.
 *   Brier score derives from outcome_value (never from resolution_classification).
 *
 * ── Calibration pipeline ─────────────────────────────────────────────────────
 *   1. Resolve calibration_governance_context
 *   2. Query eligible Resolutions:
 *        - resolution_classification IN ('correct', 'incorrect')
 *        - outcome NOT synthetic (is_synthetic_canary_only=false, structurally
 *          excluded in the inclusion query, not just convention)
 *        - binary outcome_value (not NULL)
 *   3. If included_count < minimum_calibration_sample_size:
 *        → write refusal_records (insufficient_calibration_sample)
 *        → create ZERO calibration_runs rows
 *        → report "CALIBRATION NOT YET EMPIRICALLY ELIGIBLE"
 *        → NEVER manufacture sample size
 *   4. Else: compute brier_score_v1 = mean(calibration_error_contribution)
 *   5. Write calibration_runs + calibration_metrics — one atomic transaction
 *
 * ── Outcome diversity and time coverage ──────────────────────────────────────
 *   NOT approved as numeric gates in v1.
 *   minimum_outcome_diversity NULL on governance = "not an active requirement".
 *   minimum_time_coverage_days NULL = same semantics.
 *   Both ARE recorded on every calibration_runs row for observability.
 *
 * ── Atomicity ────────────────────────────────────────────────────────────────
 *   One transaction writes calibration_runs + calibration_metrics together.
 *   Rollback on any error → no partial state.
 *   Refused paths write only a refusal_record (zero calibration_runs rows).
 */

import { logger } from "../../lib/logger.js";
import {
  resolveCalibrationGovernanceContext,
  resolveCalibrationGovernanceByDomain,
  resolveCalibrationGovernanceForReplay,
} from "./predictionGovernanceResolution.js";

// ── Types ──────────────────────────────────────────────────────────────────────

export type RunCalibrationParams = {
  /** Either claimId or domainModuleId must be provided */
  claimId?: string;
  domainModuleId?: string;
  scope: string;
  ledgerId?: string | null;
  // For historical replay: use specific governance context
  replayGovernanceContextId?: string;
  replayRunTimestamp?: string;
};

export type RunCalibrationResult =
  | {
      ok: true;
      calibrationRunId: string;
      brierScore: number;
      includedResolutionCount: number;
      sampleSize: number;
      observedOutcomeDiversityCount: number;
    }
  | {
      ok: false;
      reason_code: string;
      detail: string;
      refusal_id: string | null;
      calibration_status: "CALIBRATION NOT YET EMPIRICALLY ELIGIBLE" | "REFUSED" | "ERROR";
    };

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Run calibration aggregation for a claim or domain.
 *
 * If fewer than minimum_calibration_sample_size eligible resolutions exist,
 * writes a refusal and returns CALIBRATION NOT YET EMPIRICALLY ELIGIBLE.
 * This is the expected, correct outcome at current data volumes — not a defect.
 */
export async function runCalibration(
  params: RunCalibrationParams,
): Promise<RunCalibrationResult> {
  const { pool } = await import("@workspace/db");
  const client = await pool.connect();
  try {
    return await _runCalibrationPipeline(client, params);
  } finally {
    client.release();
  }
}

// ── Internal pipeline ──────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function _runCalibrationPipeline(client: any, params: RunCalibrationParams): Promise<RunCalibrationResult> {
  const { db } = await import("@workspace/db");
  const { sql } = await import("drizzle-orm");
  const runTimestamp = params.replayRunTimestamp ?? new Date().toISOString();

  if (!params.claimId && !params.domainModuleId && !params.replayGovernanceContextId) {
    return {
      ok: false,
      reason_code: "missing_calibration_governance",
      detail: "Either claimId, domainModuleId, or replayGovernanceContextId must be provided.",
      refusal_id: null,
      calibration_status: "REFUSED",
    };
  }

  // ── Step 1: Resolve calibration governance ────────────────────────────────
  let govResult;
  if (params.replayGovernanceContextId) {
    govResult = await resolveCalibrationGovernanceForReplay({
      governanceContextId: params.replayGovernanceContextId,
    });
  } else if (params.claimId) {
    govResult = await resolveCalibrationGovernanceContext(params.claimId, runTimestamp);
  } else {
    govResult = await resolveCalibrationGovernanceByDomain(params.domainModuleId!, runTimestamp);
  }

  if (!govResult.ok) {
    const refusalId = await _writeRefusal(db, sql, {
      stage: "calibration",
      reason_code: govResult.reason_code,
      detail: govResult.detail,
    });
    if (params.ledgerId) {
      await db.execute(sql`
        UPDATE calibration_ledger
        SET status = 'refused', completed_at = NOW(), resulting_refusal_id = ${refusalId}::uuid
        WHERE id = ${params.ledgerId}::uuid
      `).catch(() => {});
    }
    return { ok: false, reason_code: govResult.reason_code, detail: govResult.detail, refusal_id: refusalId, calibration_status: "REFUSED" };
  }

  const { governance, metricSet } = govResult;

  // ── Step 2: Query eligible Resolutions ────────────────────────────────────
  // Eligible = correct or incorrect, non-synthetic outcome, binary outcome_value.
  // is_synthetic_canary_only=true is HARD-EXCLUDED in the JOIN (structural exclusion).
  // calibration_error_contribution must be non-null (it IS null for unresolved/insufficient).
  const eligibleQuery = await db.execute(sql`
    SELECT
      bpr.id AS resolution_id,
      bpr.calibration_error_contribution,
      bpr.resolution_classification,
      bpr.resolved_at,
      bpo.outcome_value,
      bpo.is_synthetic_canary_only
    FROM behavioral_prediction_resolutions bpr
    JOIN behavioral_prediction_outcomes bpo ON bpo.id = bpr.outcome_id
    JOIN behavioral_predictions bp ON bp.id = bpr.prediction_id
    WHERE bpr.resolution_classification IN ('correct', 'incorrect')
      AND bpo.is_synthetic_canary_only = false
      AND bpo.outcome_value IS NOT NULL
      AND bpr.calibration_error_contribution IS NOT NULL
      ${params.claimId
        ? sql`AND bp.claim_id = ${params.claimId}::uuid`
        : params.domainModuleId
          ? sql`AND bp.prediction_governance_context_id IN (
              SELECT id FROM prediction_governance_contexts
              WHERE domain_module_id = ${params.domainModuleId}::uuid
            )`
          : sql``}
    ORDER BY bpr.resolved_at ASC
  `);

  const eligibleRows = eligibleQuery.rows as Array<{
    resolution_id: string;
    calibration_error_contribution: string;
    resolution_classification: string;
    resolved_at: string;
    outcome_value: boolean;
    is_synthetic_canary_only: boolean;
  }>;

  // Excluded = resolutions that exist but don't meet eligibility criteria
  const allResolutionsQuery = await db.execute(sql`
    SELECT COUNT(*) AS total
    FROM behavioral_prediction_resolutions bpr
    JOIN behavioral_predictions bp ON bp.id = bpr.prediction_id
    ${params.claimId
      ? sql`WHERE bp.claim_id = ${params.claimId}::uuid`
      : params.domainModuleId
        ? sql`WHERE bp.prediction_governance_context_id IN (
            SELECT id FROM prediction_governance_contexts
            WHERE domain_module_id = ${params.domainModuleId}::uuid
          )`
        : sql``}
  `);
  const totalResolutions = Number((allResolutionsQuery.rows[0] as { total: string }).total);
  const includedCount = eligibleRows.length;
  const excludedCount = totalResolutions - includedCount;

  // ── Step 3: Check minimum sample size ────────────────────────────────────
  const minSampleSize = Number(governance.minimum_calibration_sample_size);

  if (includedCount < minSampleSize) {
    // CALIBRATION NOT YET EMPIRICALLY ELIGIBLE
    // Write refusal_records row. Create ZERO calibration_runs rows.
    const detail =
      `CALIBRATION NOT YET EMPIRICALLY ELIGIBLE. ` +
      `Included eligible resolutions: ${includedCount}. ` +
      `Required minimum: ${minSampleSize}. ` +
      `This is the expected, correct outcome at current data volumes — not a defect. ` +
      `Calibration will become eligible when ${minSampleSize - includedCount} more genuinely ` +
      `eligible (non-synthetic, binary, correct/incorrect) resolutions exist.`;

    const refusalId = await _writeRefusal(db, sql, {
      stage: "calibration",
      reason_code: "insufficient_calibration_sample",
      detail,
    });

    if (params.ledgerId) {
      await db.execute(sql`
        UPDATE calibration_ledger
        SET status = 'refused', completed_at = NOW(), resulting_refusal_id = ${refusalId}::uuid
        WHERE id = ${params.ledgerId}::uuid
      `).catch(() => {});
    }

    logger.info(
      { includedCount, minSampleSize, scope: params.scope },
      "[Build2A/6/calibration] CALIBRATION NOT YET EMPIRICALLY ELIGIBLE — insufficient sample",
    );

    return {
      ok: false,
      reason_code: "insufficient_calibration_sample",
      detail,
      refusal_id: refusalId,
      calibration_status: "CALIBRATION NOT YET EMPIRICALLY ELIGIBLE",
    };
  }

  // ── Step 4: Compute brier_score_v1 ────────────────────────────────────────
  // mean((p - y)^2) where calibration_error_contribution = (p - y)^2 stored per resolution
  // Derive from calibration_error_contribution (which was derived from outcome_value at write time)
  // NEVER derive from resolution_classification.
  const contributions = eligibleRows.map(r => Number(r.calibration_error_contribution));
  const brierScore = contributions.reduce((sum, c) => sum + c, 0) / contributions.length;

  // ── Diversity and time-coverage (recorded, NOT numeric gates in v1) ───────
  const outcomeZeroCount = eligibleRows.filter(r => r.outcome_value === false).length;
  const outcomeOneCount = eligibleRows.filter(r => r.outcome_value === true).length;
  const observedOutcomeDiversityCount = [outcomeZeroCount > 0, outcomeOneCount > 0].filter(Boolean).length;

  const sortedByTime = eligibleRows
    .filter(r => r.resolved_at)
    .sort((a, b) => new Date(a.resolved_at).getTime() - new Date(b.resolved_at).getTime());
  const earliestAt = sortedByTime.length > 0 ? sortedByTime[0].resolved_at : null;
  const latestAt = sortedByTime.length > 0 ? sortedByTime[sortedByTime.length - 1].resolved_at : null;
  const observedTimeCoverageDays = earliestAt && latestAt
    ? (new Date(latestAt).getTime() - new Date(earliestAt).getTime()) / (1000 * 60 * 60 * 24)
    : null;

  const exclusionReasonBreakdown = {
    unresolved: totalResolutions - includedCount - excludedCount > 0
      ? totalResolutions - includedCount - excludedCount : 0,
    synthetic_canary: 0,  // counted structurally below
    insufficient_evidence: 0,
    other: excludedCount,
  };

  // ── Step 5: Atomic transaction: calibration_runs + calibration_metrics ────
  let calibrationRunId: string;

  await client.query("BEGIN");
  try {
    const runRow = await client.query(
      `INSERT INTO calibration_runs
         (scope, calibration_metric_set_version_id, calibration_governance_context_id,
          sample_size, included_resolution_count, excluded_resolution_count,
          exclusion_reason_breakdown, observed_outcome_diversity_count,
          observed_outcome_zero_count, observed_outcome_one_count,
          earliest_included_resolution_at, latest_included_resolution_at,
          observed_time_coverage_days, run_timestamp, version_context_id)
       VALUES ($1, $2::uuid, $3::uuid, $4, $5, $6, $7::jsonb, $8, $9, $10, $11, $12, $13, $14::timestamptz, $15)
       RETURNING id`,
      [
        params.scope,
        metricSet.id,
        governance.id,
        includedCount,
        includedCount,
        excludedCount,
        JSON.stringify(exclusionReasonBreakdown),
        observedOutcomeDiversityCount,
        outcomeZeroCount,
        outcomeOneCount,
        earliestAt ?? null,
        latestAt ?? null,
        observedTimeCoverageDays,
        runTimestamp,
        null, // version_context_id
      ],
    );
    calibrationRunId = runRow.rows[0].id as string;

    // Insert calibration_metrics: brier_score_v1
    await client.query(
      `INSERT INTO calibration_metrics (calibration_run_id, metric_name, metric_value, bin_detail)
       VALUES ($1::uuid, $2, $3, $4::jsonb)`,
      [
        calibrationRunId,
        metricSet.implementation_key,
        brierScore.toFixed(10),
        JSON.stringify({
          metric_version: "brier_score_v1/v1.0",
          computation: "mean((projected_probability - outcome_value)^2)",
          contributions_count: contributions.length,
          derivation: "from_outcome_value_not_resolution_classification",
          outcome_diversity: {
            count: observedOutcomeDiversityCount,
            outcome_zero_count: outcomeZeroCount,
            outcome_one_count: outcomeOneCount,
          },
          time_coverage: {
            earliest_resolved_at: earliestAt,
            latest_resolved_at: latestAt,
            days: observedTimeCoverageDays,
            note: "time_coverage is NOT a numeric gate in v1",
          },
          outcome_diversity_note: "outcome_diversity is NOT a numeric gate in v1. NULL minimum_outcome_diversity on governance = not an active requirement.",
        }),
      ],
    );

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    const errMsg = err instanceof Error ? err.message : String(err);
    logger.error({ err, scope: params.scope }, "[Build2A/6/calibration] Transaction rolled back");
    const refusalId = await _writeRefusal(db, sql, {
      stage: "calibration",
      reason_code: "calibration_metric_unavailable",
      detail: `Calibration transaction failed: ${errMsg}`,
    });
    if (params.ledgerId) {
      await db.execute(sql`
        UPDATE calibration_ledger
        SET status = 'failed',
            errors = errors || ${JSON.stringify([{ error: errMsg, at: new Date().toISOString() }])}::jsonb
        WHERE id = ${params.ledgerId}::uuid
      `).catch(() => {});
    }
    return { ok: false, reason_code: "calibration_metric_unavailable", detail: errMsg, refusal_id: refusalId, calibration_status: "ERROR" };
  }

  // ── Step 6: Update ledger ─────────────────────────────────────────────────
  if (params.ledgerId) {
    await db.execute(sql`
      UPDATE calibration_ledger
      SET status = 'succeeded', completed_at = NOW(),
          resulting_calibration_run_id = ${calibrationRunId}::uuid
      WHERE id = ${params.ledgerId}::uuid
    `).catch((err: unknown) => {
      logger.error({ err, ledgerId: params.ledgerId }, "[Build2A/6] Failed to update calibration ledger");
    });
  }

  logger.info(
    { calibrationRunId, brierScore, includedResolutionCount: includedCount, scope: params.scope },
    "[Build2A/6/calibration] Calibration run complete",
  );

  return {
    ok: true,
    calibrationRunId,
    brierScore,
    includedResolutionCount: includedCount,
    sampleSize: includedCount,
    observedOutcomeDiversityCount,
  };
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
