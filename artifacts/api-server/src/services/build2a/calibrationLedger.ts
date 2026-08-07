/**
 * Build 2A — Calibration Ledger Helper (Package 2A-6)
 *
 * Provides the idempotent entry point for running calibration via the
 * calibration_ledger table. Uses (calibration_governance_context_id, idempotency_key)
 * as the compound idempotency key — no duplicate runs for the same scope
 * and run request.
 *
 * Unlike formation and resolution pollers (which scan all records), calibration
 * is triggered explicitly (admin route or scheduled invocation) — there is no
 * background scanning loop for calibration in v1.
 */

import { logger } from "../../lib/logger.js";
import { runCalibration } from "./calibrationAggregation.js";

// ── Types ──────────────────────────────────────────────────────────────────────

export type ClaimAndRunCalibrationParams = {
  scope: string;
  claimId?: string;
  domainModuleId?: string;
  calibrationGovernanceContextId?: string;
  idempotencyKey: string;
};

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Claim a calibration run slot via the calibration_ledger idempotency mechanism
 * then invoke calibration aggregation.
 *
 * Idempotency key: (calibration_governance_context_id, idempotency_key string).
 * If a row already exists for this pair, return the existing row's state.
 */
export async function claimAndRunCalibration(
  params: ClaimAndRunCalibrationParams,
): Promise<{
  ledgerId: string;
  status: string;
  alreadyRan: boolean;
  calibrationRunId: string | null;
  brierScore: number | null;
  refusalId: string | null;
  calibration_status: string;
}> {
  const { db } = await import("@workspace/db");
  const { sql } = await import("drizzle-orm");

  // Resolve governance context ID — use the one provided or look it up
  let governanceContextId: string | null = params.calibrationGovernanceContextId ?? null;
  if (!governanceContextId && (params.claimId || params.domainModuleId)) {
    const { resolveCalibrationGovernanceContext, resolveCalibrationGovernanceByDomain } = await import("./predictionGovernanceResolution.js");
    const now = new Date().toISOString();
    const govResult = params.claimId
      ? await resolveCalibrationGovernanceContext(params.claimId, now)
      : await resolveCalibrationGovernanceByDomain(params.domainModuleId!, now);
    if (govResult.ok) {
      governanceContextId = govResult.governance.id;
    }
  }

  // Try to insert a new ledger row (ON CONFLICT = idempotency)
  const ledgerInsert = await db.execute(sql`
    INSERT INTO calibration_ledger (
      scope, calibration_governance_context_id, idempotency_key
    )
    VALUES (
      ${params.scope},
      ${governanceContextId ?? null}::uuid,
      ${params.idempotencyKey}
    )
    ON CONFLICT (calibration_governance_context_id, idempotency_key)
    WHERE calibration_governance_context_id IS NOT NULL
    DO NOTHING
    RETURNING id
  `);

  // If ON CONFLICT triggered, fetch the existing row
  if ((ledgerInsert.rows?.length ?? 0) === 0) {
    const existing = await db.execute(sql`
      SELECT id, status, resulting_calibration_run_id, resulting_refusal_id
      FROM calibration_ledger
      WHERE idempotency_key = ${params.idempotencyKey}
        AND (
          ${governanceContextId
            ? sql`calibration_governance_context_id = ${governanceContextId}::uuid`
            : sql`calibration_governance_context_id IS NULL`}
        )
      LIMIT 1
    `);

    if (existing.rows.length > 0) {
      const row = existing.rows[0] as {
        id: string;
        status: string;
        resulting_calibration_run_id: string | null;
        resulting_refusal_id: string | null;
      };
      logger.info({ ledgerId: row.id, status: row.status }, "[Build2A/6/calibLedger] Calibration already ran for this idempotency key");

      // Fetch brier score if available
      let brierScore: number | null = null;
      if (row.resulting_calibration_run_id) {
        const metricRes = await db.execute(sql`
          SELECT metric_value FROM calibration_metrics
          WHERE calibration_run_id = ${row.resulting_calibration_run_id}::uuid
          LIMIT 1
        `);
        if (metricRes.rows.length > 0) {
          brierScore = Number((metricRes.rows[0] as { metric_value: string }).metric_value);
        }
      }

      return {
        ledgerId: row.id,
        status: row.status,
        alreadyRan: true,
        calibrationRunId: row.resulting_calibration_run_id,
        brierScore,
        refusalId: row.resulting_refusal_id,
        calibration_status: row.status === "succeeded" ? "SUCCEEDED" : "REFUSED_OR_FAILED",
      };
    }
  }

  const ledgerId = (ledgerInsert.rows?.[0] as { id: string })?.id;
  if (!ledgerId) {
    return {
      ledgerId: "unknown",
      status: "error",
      alreadyRan: false,
      calibrationRunId: null,
      brierScore: null,
      refusalId: null,
      calibration_status: "ERROR",
    };
  }

  // Run calibration
  const result = await runCalibration({
    scope: params.scope,
    claimId: params.claimId,
    domainModuleId: params.domainModuleId,
    replayGovernanceContextId: params.calibrationGovernanceContextId,
    ledgerId,
  });

  if (result.ok) {
    return {
      ledgerId,
      status: "succeeded",
      alreadyRan: false,
      calibrationRunId: result.calibrationRunId,
      brierScore: result.brierScore,
      refusalId: null,
      calibration_status: "SUCCEEDED",
    };
  }

  return {
    ledgerId,
    status: "refused",
    alreadyRan: false,
    calibrationRunId: null,
    brierScore: null,
    refusalId: result.refusal_id,
    calibration_status: result.calibration_status,
  };
}
