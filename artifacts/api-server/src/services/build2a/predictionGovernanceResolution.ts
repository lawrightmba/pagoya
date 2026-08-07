/**
 * Build 2A — Prediction & Calibration Governance Resolution (Package 2A-6)
 *
 * Resolves the correct prediction_governance_context or calibration_governance_context
 * for a given claim, following strict chain-tip lineage precedence — identical
 * discipline to knowledgeGovernanceResolution.ts (Package 2A-5).
 *
 * ── Resolution order (both governance types) ─────────────────────────────────
 *   1. Claim-level (scope_type='behavioral_claim', claim_id matches)
 *   2. Domain-level (scope_type='domain_module', domain_module_id of claim matches)
 *   3. Neither found → refuse (missing_prediction_governance / missing_calibration_governance)
 *
 * ── Ambiguity rule ───────────────────────────────────────────────────────────
 *   Multiple chain-tip rows at the same specificity level → refuse
 *   (ambiguous_prediction_governance / ambiguous_calibration_governance).
 *   NEVER use ORDER BY timestamp, UUID, version string, or insertion order.
 *
 * ── Effective period ─────────────────────────────────────────────────────────
 *   effective_from <= resolution_time AND
 *   (effective_until IS NULL OR effective_until > resolution_time).
 *
 * ── No global scope ──────────────────────────────────────────────────────────
 *   scope_type CHECK on both tables prevents global fallback. No global
 *   fallback exists — claim or domain level, or refuse.
 *
 * ── Prediction and calibration governance resolved independently ──────────────
 *   A claim may have prediction governance but no calibration governance (or
 *   vice versa). Each resolves and refuses independently.
 */

import { sql } from "drizzle-orm";
import { logger } from "../../lib/logger.js";

// ── Types ──────────────────────────────────────────────────────────────────────

export type PredictionGovernanceRow = {
  id: string;
  scope_type: string;
  domain_module_id: string | null;
  claim_id: string | null;
  prediction_formation_rule_version_id: string;
  prediction_classification_rule_version_id: string;
  resolution_horizon_definition: Record<string, unknown>;
  approval_authority: string;
  derivation_method: string;
  effective_from: string | null;
  effective_until: string | null;
  version: string;
  supersedes: string | null;
  notes: string | null;
  created_at: string;
};

export type CalibrationGovernanceRow = {
  id: string;
  scope_type: string;
  domain_module_id: string | null;
  claim_id: string | null;
  calibration_metric_set_version_id: string;
  minimum_calibration_sample_size: number;
  minimum_outcome_diversity: number | null;
  minimum_time_coverage_days: number | null;
  approval_authority: string;
  derivation_method: string;
  effective_from: string | null;
  effective_until: string | null;
  version: string;
  supersedes: string | null;
  notes: string | null;
  created_at: string;
};

export type FormationRuleRow = {
  id: string;
  implementation_key: string;
  version_label: string;
  is_active: boolean;
};

export type ClassificationRuleRow = {
  id: string;
  implementation_key: string;
  version_label: string;
  is_active: boolean;
};

export type MetricSetRow = {
  id: string;
  implementation_key: string;
  version_label: string;
  is_active: boolean;
};

export type PredictionGovernanceResolutionResult =
  | {
      ok: true;
      governance: PredictionGovernanceRow;
      formationRule: FormationRuleRow;
      classificationRule: ClassificationRuleRow;
      resolution_level: "claim" | "domain";
      resolution_note: string;
    }
  | {
      ok: false;
      reason_code:
        | "missing_prediction_governance"
        | "ambiguous_prediction_governance"
        | "formation_rule_unavailable"
        | "missing_knowledge_governance";
      detail: string;
    };

export type CalibrationGovernanceResolutionResult =
  | {
      ok: true;
      governance: CalibrationGovernanceRow;
      metricSet: MetricSetRow;
      resolution_level: "claim" | "domain";
      resolution_note: string;
    }
  | {
      ok: false;
      reason_code:
        | "missing_calibration_governance"
        | "ambiguous_calibration_governance"
        | "calibration_metric_unavailable";
      detail: string;
    };

// ── Prediction governance resolution ──────────────────────────────────────────

/**
 * Resolve the prediction governance context for a claim at a given resolution time.
 * Uses live chain-tip resolution.
 */
export async function resolvePredictionGovernanceContext(
  claimId: string,
  resolutionTime: string,
): Promise<PredictionGovernanceResolutionResult> {
  const { db } = await import("@workspace/db");

  // Fetch the domain_module_id for this claim
  const claimRes = await db.execute(sql`
    SELECT domain_module_id FROM behavioral_claims WHERE id = ${claimId}::uuid LIMIT 1
  `);
  if (claimRes.rows.length === 0) {
    return {
      ok: false,
      reason_code: "missing_prediction_governance",
      detail: `Claim ${claimId} not found in behavioral_claims — cannot resolve prediction governance.`,
    };
  }
  const domainModuleId = (claimRes.rows[0] as { domain_module_id: string }).domain_module_id;

  // ── Step 1: Claim-level lookup ──────────────────────────────────────────────
  const claimLevel = await _fetchPredictionChainTipContexts(
    "behavioral_claim", claimId, null, resolutionTime, db,
  );
  if (claimLevel.error) return claimLevel.error;
  if (claimLevel.rows.length === 1) {
    return _resolvePredictionRulesAndReturn(claimLevel.rows[0], "claim", db);
  }

  // ── Step 2: Domain-level lookup ─────────────────────────────────────────────
  const domainLevel = await _fetchPredictionChainTipContexts(
    "domain_module", null, domainModuleId, resolutionTime, db,
  );
  if (domainLevel.error) return domainLevel.error;
  if (domainLevel.rows.length === 1) {
    return _resolvePredictionRulesAndReturn(domainLevel.rows[0], "domain", db);
  }

  // ── Step 3: No context found at either level ────────────────────────────────
  return {
    ok: false,
    reason_code: "missing_prediction_governance",
    detail:
      `No prediction governance context found for claim ${claimId} ` +
      `(domain_module_id=${domainModuleId}) at resolution_time=${resolutionTime}. ` +
      `No claim-level context (0 chain-tip rows) and no domain-level context ` +
      `(0 chain-tip rows). A governance context must be seeded before prediction formation can proceed.`,
  };
}

/**
 * Resolve prediction governance by specific context ID (historical replay).
 * Does NOT re-resolve via chain-tip — fetches the exact recorded row.
 */
export async function resolvePredictionGovernanceForReplay(params: {
  governanceContextId: string;
}): Promise<PredictionGovernanceResolutionResult> {
  const { db } = await import("@workspace/db");

  const govRes = await db.execute(sql`
    SELECT * FROM prediction_governance_contexts
    WHERE id = ${params.governanceContextId}::uuid LIMIT 1
  `);
  if (govRes.rows.length === 0) {
    return {
      ok: false,
      reason_code: "missing_prediction_governance",
      detail: `Replay: prediction governance context ${params.governanceContextId} not found.`,
    };
  }
  const governance = govRes.rows[0] as PredictionGovernanceRow;
  return _resolvePredictionRulesAndReturn(governance, governance.scope_type === "behavioral_claim" ? "claim" : "domain", db);
}

// ── Calibration governance resolution ─────────────────────────────────────────

/**
 * Resolve the calibration governance context for a claim at a given resolution time.
 * Resolves independently from prediction governance.
 */
export async function resolveCalibrationGovernanceContext(
  claimId: string,
  resolutionTime: string,
): Promise<CalibrationGovernanceResolutionResult> {
  const { db } = await import("@workspace/db");

  const claimRes = await db.execute(sql`
    SELECT domain_module_id FROM behavioral_claims WHERE id = ${claimId}::uuid LIMIT 1
  `);
  if (claimRes.rows.length === 0) {
    return {
      ok: false,
      reason_code: "missing_calibration_governance",
      detail: `Claim ${claimId} not found — cannot resolve calibration governance.`,
    };
  }
  const domainModuleId = (claimRes.rows[0] as { domain_module_id: string }).domain_module_id;

  // ── Step 1: Claim-level lookup ──────────────────────────────────────────────
  const claimLevel = await _fetchCalibrationChainTipContexts(
    "behavioral_claim", claimId, null, resolutionTime, db,
  );
  if (claimLevel.error) return claimLevel.error;
  if (claimLevel.rows.length === 1) {
    return _resolveCalibrationMetricSetAndReturn(claimLevel.rows[0], "claim", db);
  }

  // ── Step 2: Domain-level lookup ─────────────────────────────────────────────
  const domainLevel = await _fetchCalibrationChainTipContexts(
    "domain_module", null, domainModuleId, resolutionTime, db,
  );
  if (domainLevel.error) return domainLevel.error;
  if (domainLevel.rows.length === 1) {
    return _resolveCalibrationMetricSetAndReturn(domainLevel.rows[0], "domain", db);
  }

  return {
    ok: false,
    reason_code: "missing_calibration_governance",
    detail:
      `No calibration governance context found for claim ${claimId} ` +
      `(domain_module_id=${domainModuleId}) at resolution_time=${resolutionTime}. ` +
      `No claim-level context and no domain-level context. ` +
      `A calibration governance context must be seeded before calibration can proceed.`,
  };
}

/**
 * Resolve calibration governance for a domain_module_id directly.
 * Used when calibrating at domain scope without a specific claim.
 */
export async function resolveCalibrationGovernanceByDomain(
  domainModuleId: string,
  resolutionTime: string,
): Promise<CalibrationGovernanceResolutionResult> {
  const { db } = await import("@workspace/db");

  const domainLevel = await _fetchCalibrationChainTipContexts(
    "domain_module", null, domainModuleId, resolutionTime, db,
  );
  if (domainLevel.error) return domainLevel.error;
  if (domainLevel.rows.length === 1) {
    return _resolveCalibrationMetricSetAndReturn(domainLevel.rows[0], "domain", db);
  }
  if (domainLevel.rows.length === 0) {
    return {
      ok: false,
      reason_code: "missing_calibration_governance",
      detail: `No calibration governance context found for domain_module_id=${domainModuleId} at ${resolutionTime}.`,
    };
  }
  // ambiguous handled inside _fetchCalibrationChainTipContexts
  return {
    ok: false,
    reason_code: "missing_calibration_governance",
    detail: `Unexpected state resolving calibration governance for domain_module_id=${domainModuleId}.`,
  };
}

/**
 * Resolve calibration governance by specific context ID (historical replay / admin trigger).
 */
export async function resolveCalibrationGovernanceForReplay(params: {
  governanceContextId: string;
}): Promise<CalibrationGovernanceResolutionResult> {
  const { db } = await import("@workspace/db");

  const govRes = await db.execute(sql`
    SELECT * FROM calibration_governance_contexts
    WHERE id = ${params.governanceContextId}::uuid LIMIT 1
  `);
  if (govRes.rows.length === 0) {
    return {
      ok: false,
      reason_code: "missing_calibration_governance",
      detail: `Calibration governance context ${params.governanceContextId} not found.`,
    };
  }
  const governance = govRes.rows[0] as CalibrationGovernanceRow;
  return _resolveCalibrationMetricSetAndReturn(governance, governance.scope_type === "behavioral_claim" ? "claim" : "domain", db);
}

// ── Internal helpers ───────────────────────────────────────────────────────────

type PredictionChainTipFetchResult = {
  rows: PredictionGovernanceRow[];
  error: (PredictionGovernanceResolutionResult & { ok: false }) | null;
};

async function _fetchPredictionChainTipContexts(
  scopeType: "behavioral_claim" | "domain_module",
  claimId: string | null,
  domainModuleId: string | null,
  resolutionTime: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
): Promise<PredictionChainTipFetchResult> {
  const result = await db.execute(sql`
    SELECT pgc.*
    FROM latest_prediction_governance_context_v pgc
    WHERE pgc.scope_type = ${scopeType}
      AND (
        ${scopeType === "behavioral_claim"
          ? sql`pgc.claim_id = ${claimId}::uuid`
          : sql`pgc.domain_module_id = ${domainModuleId}::uuid`}
      )
      AND (pgc.effective_from IS NULL OR pgc.effective_from <= ${resolutionTime}::timestamptz)
      AND (pgc.effective_until IS NULL OR pgc.effective_until > ${resolutionTime}::timestamptz)
  `);

  const rows = result.rows as PredictionGovernanceRow[];

  if (rows.length > 1) {
    const ids = rows.map(r => r.id).join(", ");
    logger.warn(
      { scopeType, claimId, domainModuleId, rowCount: rows.length, ids },
      "[Build2A/6/predGovernance] Ambiguous prediction governance: multiple chain-tip contexts",
    );
    return {
      rows: [],
      error: {
        ok: false,
        reason_code: "ambiguous_prediction_governance",
        detail:
          `Ambiguous prediction governance: ${rows.length} chain-tip ` +
          `${scopeType}-level prediction governance contexts exist for ` +
          `${scopeType === "behavioral_claim" ? `claim ${claimId}` : `domain_module ${domainModuleId}`} ` +
          `at resolution_time=${resolutionTime}. IDs: ${ids}. ` +
          `Cannot arbitrarily select one. Supersede all but one before retrying.`,
      },
    };
  }

  return { rows, error: null };
}

async function _resolvePredictionRulesAndReturn(
  governance: PredictionGovernanceRow,
  level: "claim" | "domain",
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
): Promise<PredictionGovernanceResolutionResult> {
  // Fetch formation rule
  const frRes = await db.execute(sql`
    SELECT id, implementation_key, version_label, is_active
    FROM prediction_formation_rule_versions
    WHERE id = ${governance.prediction_formation_rule_version_id}::uuid LIMIT 1
  `);
  if (frRes.rows.length === 0) {
    return {
      ok: false,
      reason_code: "formation_rule_unavailable",
      detail: `Prediction governance ${governance.id} references formation rule ${governance.prediction_formation_rule_version_id} which does not exist.`,
    };
  }
  const formationRule = frRes.rows[0] as FormationRuleRow;
  if (!formationRule.is_active) {
    return {
      ok: false,
      reason_code: "formation_rule_unavailable",
      detail: `Formation rule ${formationRule.implementation_key} v${formationRule.version_label} is not active.`,
    };
  }

  // Fetch classification rule
  const crRes = await db.execute(sql`
    SELECT id, implementation_key, version_label, is_active
    FROM prediction_classification_rule_versions
    WHERE id = ${governance.prediction_classification_rule_version_id}::uuid LIMIT 1
  `);
  if (crRes.rows.length === 0) {
    return {
      ok: false,
      reason_code: "formation_rule_unavailable",
      detail: `Prediction governance ${governance.id} references classification rule ${governance.prediction_classification_rule_version_id} which does not exist.`,
    };
  }
  const classificationRule = crRes.rows[0] as ClassificationRuleRow;
  if (!classificationRule.is_active) {
    return {
      ok: false,
      reason_code: "formation_rule_unavailable",
      detail: `Classification rule ${classificationRule.implementation_key} v${classificationRule.version_label} is not active.`,
    };
  }

  logger.debug(
    { governanceId: governance.id, level, formationRule: formationRule.implementation_key },
    "[Build2A/6/predGovernance] Prediction governance resolved",
  );

  return {
    ok: true,
    governance,
    formationRule,
    classificationRule,
    resolution_level: level,
    resolution_note:
      `${level}-level prediction governance resolved: context ${governance.id} ` +
      `(version=${governance.version}), formation_rule=${formationRule.implementation_key} ` +
      `v${formationRule.version_label}, classification_rule=${classificationRule.implementation_key}.`,
  };
}

type CalibrationChainTipFetchResult = {
  rows: CalibrationGovernanceRow[];
  error: (CalibrationGovernanceResolutionResult & { ok: false }) | null;
};

async function _fetchCalibrationChainTipContexts(
  scopeType: "behavioral_claim" | "domain_module",
  claimId: string | null,
  domainModuleId: string | null,
  resolutionTime: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
): Promise<CalibrationChainTipFetchResult> {
  const result = await db.execute(sql`
    SELECT cgc.*
    FROM latest_calibration_governance_context_v cgc
    WHERE cgc.scope_type = ${scopeType}
      AND (
        ${scopeType === "behavioral_claim"
          ? sql`cgc.claim_id = ${claimId}::uuid`
          : sql`cgc.domain_module_id = ${domainModuleId}::uuid`}
      )
      AND (cgc.effective_from IS NULL OR cgc.effective_from <= ${resolutionTime}::timestamptz)
      AND (cgc.effective_until IS NULL OR cgc.effective_until > ${resolutionTime}::timestamptz)
  `);

  const rows = result.rows as CalibrationGovernanceRow[];

  if (rows.length > 1) {
    const ids = rows.map(r => r.id).join(", ");
    logger.warn(
      { scopeType, claimId, domainModuleId, rowCount: rows.length, ids },
      "[Build2A/6/calibGovernance] Ambiguous calibration governance: multiple chain-tip contexts",
    );
    return {
      rows: [],
      error: {
        ok: false,
        reason_code: "ambiguous_calibration_governance",
        detail:
          `Ambiguous calibration governance: ${rows.length} chain-tip ` +
          `${scopeType}-level calibration governance contexts exist for ` +
          `${scopeType === "behavioral_claim" ? `claim ${claimId}` : `domain_module ${domainModuleId}`} ` +
          `at resolution_time=${resolutionTime}. IDs: ${ids}. ` +
          `Cannot arbitrarily select one. Supersede all but one before retrying.`,
      },
    };
  }

  return { rows, error: null };
}

async function _resolveCalibrationMetricSetAndReturn(
  governance: CalibrationGovernanceRow,
  level: "claim" | "domain",
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
): Promise<CalibrationGovernanceResolutionResult> {
  const msRes = await db.execute(sql`
    SELECT id, implementation_key, version_label, is_active
    FROM calibration_metric_set_versions
    WHERE id = ${governance.calibration_metric_set_version_id}::uuid LIMIT 1
  `);
  if (msRes.rows.length === 0) {
    return {
      ok: false,
      reason_code: "calibration_metric_unavailable",
      detail: `Calibration governance ${governance.id} references metric set ${governance.calibration_metric_set_version_id} which does not exist.`,
    };
  }
  const metricSet = msRes.rows[0] as MetricSetRow;
  if (!metricSet.is_active) {
    return {
      ok: false,
      reason_code: "calibration_metric_unavailable",
      detail: `Metric set ${metricSet.implementation_key} v${metricSet.version_label} is not active.`,
    };
  }

  logger.debug(
    { governanceId: governance.id, level, metricSet: metricSet.implementation_key },
    "[Build2A/6/calibGovernance] Calibration governance resolved",
  );

  return {
    ok: true,
    governance,
    metricSet,
    resolution_level: level,
    resolution_note:
      `${level}-level calibration governance resolved: context ${governance.id} ` +
      `(version=${governance.version}), metric_set=${metricSet.implementation_key} ` +
      `v${metricSet.version_label}, min_sample=${governance.minimum_calibration_sample_size}.`,
  };
}
