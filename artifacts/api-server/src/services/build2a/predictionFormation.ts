/**
 * Build 2A — Prediction Formation Service (Package 2A-6)
 *
 * Forms a behavioral_predictions row from a knowledge_record using the
 * approved formation rule (knowledge_persistence_forecast_v1) and
 * classification rule (binary_more_likely_than_not_v1).
 *
 * ── Scientific Principle ──────────────────────────────────────────────────────
 *   A Prediction is a FORECAST, not an action. This service:
 *   - NEVER authorizes, approves, denies, restricts, or lends
 *   - NEVER makes a credit decision, risk assessment, or sets exposure
 *   - NEVER alters Knowledge Records, Opinions, evidence, or base rates
 *   - ONLY produces an immutable probability forecast + binary classification
 *
 *   Authority remains Build 6+. The predicted_outcome_value field exists
 *   solely so correct/incorrect has deterministic meaning for Brier score
 *   computation. It is NOT a decision, risk category, or lending threshold.
 *
 * ── Formation rule: knowledge_persistence_forecast_v1 ───────────────────────
 *   P_future = P_current = belief + base_rate * uncertainty
 *   (the immutable sl_binomial_projection_v1 value from the opinion at
 *   knowledge-record formation time).
 *   No momentum component by design — Build 3 (Trajectory) deferred.
 *
 * ── Classification rule: binary_more_likely_than_not_v1 ─────────────────────
 *   predicted_outcome_value = (projected_probability >= 0.50).
 *   p=0.50 boundary maps to true.
 *
 * ── Atomicity ────────────────────────────────────────────────────────────────
 *   One transaction writes behavioral_predictions. Rollback on any error →
 *   no partial state. Refused paths write only a refusal_record.
 *
 * ── Replay checksum ──────────────────────────────────────────────────────────
 *   SHA-256 over deterministic JSON: knowledge_record_id, opinion_id,
 *   claim_id, formation-rule key+label, classification-rule key+label,
 *   governance id+version, projected_probability, predicted_outcome_value,
 *   horizon_start, horizon_end, version_context_id, formation_timestamp.
 */

import { createHash } from "crypto";
import { logger } from "../../lib/logger.js";
import {
  resolvePredictionGovernanceContext,
  resolvePredictionGovernanceForReplay,
} from "./predictionGovernanceResolution.js";

// ── Types ──────────────────────────────────────────────────────────────────────

export type FormPredictionParams = {
  knowledgeRecordId: string;
  ledgerId?: string | null;
  // For historical replay only:
  replayGovernanceContextId?: string;
  replayFormationTimestamp?: string;
  replayVersionContextId?: string | null;
};

export type FormPredictionResult =
  | {
      ok: true;
      predictionId: string;
      projectedProbability: number;
      predictedOutcomeValue: boolean;
      horizonStart: string;
      horizonEnd: string;
      replayChecksum: string;
    }
  | {
      ok: false;
      reason_code: string;
      detail: string;
      refusal_id: string | null;
    };

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Form a behavioral_predictions row from a knowledge record.
 *
 * For new formation: resolves prediction governance via chain-tip logic.
 * For historical replay: pass replayGovernanceContextId + replayFormationTimestamp
 *   to use the recorded historical governance.
 */
export async function formPrediction(
  params: FormPredictionParams,
): Promise<FormPredictionResult> {
  const { pool } = await import("@workspace/db");
  const client = await pool.connect();
  try {
    return await _runFormation(client, params);
  } finally {
    client.release();
  }
}

// ── Internal pipeline ──────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function _runFormation(client: any, params: FormPredictionParams): Promise<FormPredictionResult> {
  const { db } = await import("@workspace/db");
  const { sql } = await import("drizzle-orm");
  const isReplay = !!(params.replayGovernanceContextId);
  const formationTimestamp = params.replayFormationTimestamp ?? new Date().toISOString();

  // ── Step 1: Load knowledge record + linked opinion ────────────────────────
  const krRes = await db.execute(sql`
    SELECT
      kr.id AS knowledge_record_id,
      kr.opinion_id,
      kr.claim_id,
      kr.version_context_id AS kr_version_context_id,
      kr.predicate_version_id,
      kr.governance_context_id AS kq_governance_context_id,
      kr.knowledge_at,
      o.belief, o.disbelief, o.uncertainty, o.base_rate,
      o.base_rate_record_id,
      bc.falsifiability_condition AS claim_falsifiability
    FROM knowledge_records kr
    JOIN opinions o ON o.id = kr.opinion_id
    JOIN behavioral_claims bc ON bc.id = kr.claim_id
    WHERE kr.id = ${params.knowledgeRecordId}::uuid
    LIMIT 1
  `);

  if (krRes.rows.length === 0) {
    const refusalId = await _writeRefusal(db, sql, {
      stage: "prediction_formation",
      reason_code: "missing_prediction_governance",
      detail: `Knowledge record ${params.knowledgeRecordId} not found — cannot form prediction.`,
    });
    return { ok: false, reason_code: "missing_prediction_governance", detail: `Knowledge record ${params.knowledgeRecordId} not found.`, refusal_id: refusalId };
  }

  const kr = krRes.rows[0] as {
    knowledge_record_id: string;
    opinion_id: string;
    claim_id: string;
    kr_version_context_id: string | null;
    predicate_version_id: string;
    kq_governance_context_id: string;
    knowledge_at: string;
    belief: string;
    disbelief: string;
    uncertainty: string;
    base_rate: string;
    base_rate_record_id: string;
    claim_falsifiability: string | null;
  };

  // missing_falsifiability_condition: claim must have a falsifiability condition
  if (!kr.claim_falsifiability || kr.claim_falsifiability.trim() === "") {
    const refusalId = await _writeRefusal(db, sql, {
      stage: "prediction_formation",
      reason_code: "missing_falsifiability_condition",
      detail: `Claim ${kr.claim_id} has no falsifiability_condition — cannot form a falsifiable prediction.`,
      claim_id: kr.claim_id,
    });
    return { ok: false, reason_code: "missing_falsifiability_condition", detail: "Claim has no falsifiability_condition.", refusal_id: refusalId };
  }

  // ── Step 2: Check for pre-existing prediction (prediction_already_exists) ─
  const existingPred = await db.execute(sql`
    SELECT id FROM behavioral_predictions
    WHERE knowledge_record_id = ${params.knowledgeRecordId}::uuid
      AND supersedes IS NULL
    LIMIT 1
  `);
  if (existingPred.rows.length > 0 && !isReplay) {
    const refusalId = await _writeRefusal(db, sql, {
      stage: "prediction_formation",
      reason_code: "prediction_already_exists",
      detail: `A prediction already exists for knowledge_record ${params.knowledgeRecordId} (prediction_id=${(existingPred.rows[0] as { id: string }).id}). To supersede it, use the supersedes field.`,
      claim_id: kr.claim_id,
    });
    return { ok: false, reason_code: "prediction_already_exists", detail: "Prediction already formed for this knowledge record.", refusal_id: refusalId };
  }

  // ── Step 3: Resolve prediction governance ─────────────────────────────────
  let govResult;
  if (isReplay) {
    govResult = await resolvePredictionGovernanceForReplay({
      governanceContextId: params.replayGovernanceContextId!,
    });
  } else {
    govResult = await resolvePredictionGovernanceContext(kr.claim_id, formationTimestamp);
  }

  if (!govResult.ok) {
    const refusalId = await _writeRefusal(db, sql, {
      stage: "prediction_formation",
      reason_code: govResult.reason_code,
      detail: govResult.detail,
      claim_id: kr.claim_id,
    });
    if (params.ledgerId) {
      await db.execute(sql`
        UPDATE prediction_formation_ledger
        SET status = 'refused', completed_at = NOW(), resulting_refusal_id = ${refusalId}::uuid
        WHERE id = ${params.ledgerId}::uuid
      `).catch(() => {});
    }
    return { ok: false, reason_code: govResult.reason_code, detail: govResult.detail, refusal_id: refusalId };
  }

  const { governance, formationRule, classificationRule } = govResult;

  // ── Step 4: Apply formation rule (knowledge_persistence_forecast_v1) ──────
  // P_future = P_current = belief + base_rate * uncertainty
  // This is the standard SL binomial projected probability.
  const belief = Number(kr.belief);
  const baseRate = Number(kr.base_rate);
  const uncertainty = Number(kr.uncertainty);
  const projectedProbability = belief + baseRate * uncertainty;

  // Guard: projected_probability must be in [0, 1]
  if (projectedProbability < 0 || projectedProbability > 1 || isNaN(projectedProbability)) {
    const refusalId = await _writeRefusal(db, sql, {
      stage: "prediction_formation",
      reason_code: "formation_rule_unavailable",
      detail: `Computed projected_probability=${projectedProbability} is out of [0,1] range. belief=${belief}, base_rate=${baseRate}, uncertainty=${uncertainty}.`,
      claim_id: kr.claim_id,
    });
    return { ok: false, reason_code: "formation_rule_unavailable", detail: "Invalid projected_probability from formation rule.", refusal_id: refusalId };
  }

  // ── Step 5: Apply classification rule (binary_more_likely_than_not_v1) ────
  // p >= 0.50 → true; p < 0.50 → false. p=0.50 maps to true.
  const predictedOutcomeValue = projectedProbability >= 0.50;

  // ── Step 6: Compute horizon from governance ───────────────────────────────
  // Read max_window_days from resolution_horizon_definition JSONB
  const horizonDef = governance.resolution_horizon_definition as Record<string, unknown>;
  const maxWindowDays = typeof horizonDef["max_window_days"] === "number"
    ? horizonDef["max_window_days"]
    : 30;

  const horizonStart = formationTimestamp;
  const horizonEndDate = new Date(formationTimestamp);
  horizonEndDate.setDate(horizonEndDate.getDate() + maxWindowDays);
  const horizonEnd = horizonEndDate.toISOString();

  // ── Step 7: Build predicted_claim_statement and falsifiability_condition ──
  const predictedClaimStatement =
    `Behavioral entity for claim ${kr.claim_id} will demonstrate the predicted behavioral ` +
    `outcome (predicted_outcome_value=${predictedOutcomeValue}) within the prediction ` +
    `horizon [${horizonStart.substring(0, 10)}, ${horizonEnd.substring(0, 10)}]. ` +
    `Formation rule: ${formationRule.implementation_key}. ` +
    `Projected probability: ${projectedProbability.toFixed(8)}.`;

  const predictionFalsifiabilityCondition =
    `A behavioral_prediction_outcomes record for this prediction with ` +
    `outcome_value=${!predictedOutcomeValue} (the opposite of predicted_outcome_value=${predictedOutcomeValue}) ` +
    `observed within the prediction horizon window [${horizonStart.substring(0, 10)}, ${horizonEnd.substring(0, 10)}] ` +
    `would falsify this prediction. Original claim falsifiability: ${kr.claim_falsifiability}`;

  // ── Step 8: Compute replay checksum ───────────────────────────────────────
  const versionContextId = isReplay
    ? (params.replayVersionContextId ?? null)
    : (kr.kr_version_context_id ?? null);

  const checksumPayload = _buildPredictionChecksumPayload({
    knowledgeRecordId: kr.knowledge_record_id,
    opinionId: kr.opinion_id,
    claimId: kr.claim_id,
    formationRuleImplementationKey: formationRule.implementation_key,
    formationRuleVersionLabel: formationRule.version_label,
    classificationRuleImplementationKey: classificationRule.implementation_key,
    classificationRuleVersionLabel: classificationRule.version_label,
    governanceContextId: governance.id,
    governanceVersion: governance.version,
    projectedProbability,
    predictedOutcomeValue,
    horizonStart,
    horizonEnd,
    versionContextId,
    formationTimestamp,
  });
  const replayChecksum = createHash("sha256").update(checksumPayload).digest("hex");

  // ── Step 9: Atomic transaction: insert behavioral_predictions ─────────────
  let predictionId: string;

  await client.query("BEGIN");
  try {
    const predRes = await client.query(
      `INSERT INTO behavioral_predictions
         (knowledge_record_id, claim_id, predicted_claim_statement, falsifiability_condition,
          prediction_formation_rule_version_id, projected_probability,
          prediction_classification_rule_version_id, predicted_outcome_value,
          horizon_start, horizon_end, prediction_governance_context_id,
          version_context_id, formation_timestamp, replay_checksum)
       VALUES ($1::uuid, $2::uuid, $3, $4, $5::uuid, $6, $7::uuid, $8, $9::timestamptz, $10::timestamptz,
               $11::uuid, $12, $13::timestamptz, $14)
       RETURNING id`,
      [
        kr.knowledge_record_id,
        kr.claim_id,
        predictedClaimStatement,
        predictionFalsifiabilityCondition,
        formationRule.id,
        projectedProbability.toFixed(8),
        classificationRule.id,
        predictedOutcomeValue,
        horizonStart,
        horizonEnd,
        governance.id,
        versionContextId,
        formationTimestamp,
        replayChecksum,
      ],
    );
    predictionId = predRes.rows[0].id as string;
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    const errMsg = err instanceof Error ? err.message : String(err);
    logger.error({ err, knowledgeRecordId: params.knowledgeRecordId }, "[Build2A/6/predFormation] Transaction rolled back");
    const refusalId = await _writeRefusal(db, sql, {
      stage: "prediction_formation",
      reason_code: "formation_rule_unavailable",
      detail: `Prediction formation transaction failed for knowledge_record ${params.knowledgeRecordId}: ${errMsg}`,
      claim_id: kr.claim_id,
    });
    if (params.ledgerId) {
      await db.execute(sql`
        UPDATE prediction_formation_ledger
        SET status = 'failed',
            errors = errors || ${JSON.stringify([{ error: errMsg, at: new Date().toISOString() }])}::jsonb
        WHERE id = ${params.ledgerId}::uuid
      `).catch(() => {});
    }
    return { ok: false, reason_code: "formation_rule_unavailable", detail: errMsg, refusal_id: refusalId };
  }

  // ── Step 10: Update ledger ────────────────────────────────────────────────
  if (params.ledgerId) {
    await db.execute(sql`
      UPDATE prediction_formation_ledger
      SET status = 'succeeded', completed_at = NOW(),
          resulting_prediction_id = ${predictionId}::uuid
      WHERE id = ${params.ledgerId}::uuid
    `).catch((err: unknown) => {
      logger.error({ err, ledgerId: params.ledgerId }, "[Build2A/6] Failed to update formation ledger");
    });
  }

  logger.info(
    { knowledgeRecordId: params.knowledgeRecordId, predictionId, projectedProbability, predictedOutcomeValue },
    "[Build2A/6/predFormation] Prediction formed",
  );

  return { ok: true, predictionId, projectedProbability, predictedOutcomeValue, horizonStart, horizonEnd, replayChecksum };
}

// ── Checksum ───────────────────────────────────────────────────────────────────

function _buildPredictionChecksumPayload(inputs: {
  knowledgeRecordId: string;
  opinionId: string;
  claimId: string;
  formationRuleImplementationKey: string;
  formationRuleVersionLabel: string;
  classificationRuleImplementationKey: string;
  classificationRuleVersionLabel: string;
  governanceContextId: string;
  governanceVersion: string;
  projectedProbability: number;
  predictedOutcomeValue: boolean;
  horizonStart: string;
  horizonEnd: string;
  versionContextId: string | null;
  formationTimestamp: string;
}): string {
  return JSON.stringify({
    knowledge_record_id: inputs.knowledgeRecordId,
    opinion_id: inputs.opinionId,
    claim_id: inputs.claimId,
    formation_rule_implementation_key: inputs.formationRuleImplementationKey,
    formation_rule_version_label: inputs.formationRuleVersionLabel,
    classification_rule_implementation_key: inputs.classificationRuleImplementationKey,
    classification_rule_version_label: inputs.classificationRuleVersionLabel,
    governance_context_id: inputs.governanceContextId,
    governance_version: inputs.governanceVersion,
    projected_probability: inputs.projectedProbability.toFixed(8),
    predicted_outcome_value: inputs.predictedOutcomeValue,
    horizon_start: inputs.horizonStart,
    horizon_end: inputs.horizonEnd,
    version_context_id: inputs.versionContextId ?? "null",
    formation_timestamp: inputs.formationTimestamp,
  });
}

/**
 * Independently recompute the prediction replay checksum for audit/canary use.
 * Uses crypto.createHash directly — NOT the internal function called twice.
 * Must produce byte-for-byte identical output to the stored checksum.
 */
export function computePredictionReplayChecksum(inputs: {
  knowledgeRecordId: string;
  opinionId: string;
  claimId: string;
  formationRuleImplementationKey: string;
  formationRuleVersionLabel: string;
  classificationRuleImplementationKey: string;
  classificationRuleVersionLabel: string;
  governanceContextId: string;
  governanceVersion: string;
  projectedProbability: number;
  predictedOutcomeValue: boolean;
  horizonStart: string;
  horizonEnd: string;
  versionContextId: string | null;
  formationTimestamp: string;
}): string {
  const payload = JSON.stringify({
    knowledge_record_id: inputs.knowledgeRecordId,
    opinion_id: inputs.opinionId,
    claim_id: inputs.claimId,
    formation_rule_implementation_key: inputs.formationRuleImplementationKey,
    formation_rule_version_label: inputs.formationRuleVersionLabel,
    classification_rule_implementation_key: inputs.classificationRuleImplementationKey,
    classification_rule_version_label: inputs.classificationRuleVersionLabel,
    governance_context_id: inputs.governanceContextId,
    governance_version: inputs.governanceVersion,
    projected_probability: inputs.projectedProbability.toFixed(8),
    predicted_outcome_value: inputs.predictedOutcomeValue,
    horizon_start: inputs.horizonStart,
    horizon_end: inputs.horizonEnd,
    version_context_id: inputs.versionContextId ?? "null",
    formation_timestamp: inputs.formationTimestamp,
  });
  return createHash("sha256").update(payload).digest("hex");
}

// ── Refusal helper ─────────────────────────────────────────────────────────────

async function _writeRefusal(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sql: any,
  params: { stage: string; reason_code: string; detail: string; claim_id?: string },
): Promise<string | null> {
  try {
    const res = await db.execute(sql`
      INSERT INTO refusal_records (refusal_stage, reason_code, detail, claim_id)
      VALUES (
        ${params.stage},
        ${params.reason_code},
        ${params.detail},
        ${params.claim_id ?? null}::uuid
      )
      RETURNING id
    `);
    return (res.rows[0] as { id: string }).id;
  } catch (err) {
    logger.error({ err }, "[Build2A/6] Failed to write refusal record");
    return null;
  }
}
