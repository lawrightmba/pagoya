/**
 * Build 2A — Knowledge Qualification Service (Package 2A-5)
 *
 * Evaluates whether an Opinion clears the approved, versioned sufficiency policy,
 * producing one of four outcomes: knowledge | insufficient | indeterminate | refused.
 *
 * ── Scientific Principle ──────────────────────────────────────────────────────
 *   An Opinion is NOT automatically Knowledge. Qualification evaluates ten
 *   explicit factors using ONLY stored immutable values from the Opinion's
 *   locked lineage. This service:
 *   - NEVER recomputes fusion
 *   - NEVER alters Opinions, Reasoning Traces, or evidence
 *   - NEVER changes base rates or weighting
 *   - NEVER makes a decision — only evaluates sufficiency
 *
 * ── Outcome mapping ──────────────────────────────────────────────────────────
 *   knowledge     — all required applicable factors pass, none indeterminate
 *   insufficient  — ≥1 required measurable factor fails (evaluation completed)
 *   indeterminate — ≥1 required factor cannot be resolved from preserved data
 *   refused       — pre-evaluation halted: missing/ambiguous governance,
 *                   unavailable predicate, invalid opinion lineage, etc.
 *                   → refusal_records row written; NO run row written
 *
 * ── NOT_APPLICABLE factors ───────────────────────────────────────────────────
 *   minimum_integrity_score:   always not_applicable (no calibrated threshold)
 *   misleading_evidence_hold:  always not_applicable BUT concern values from
 *     all integrity_contexts in the bundle ARE recorded in factor_detail for
 *     future calibration visibility. Never counted as pass.
 *
 * ── Atomicity ────────────────────────────────────────────────────────────────
 *   One transaction commits: run + complete factor results + knowledge_record
 *   (only when outcome=knowledge). Rollback on any error → no partial state.
 *   Refused paths write only a refusal_record (no run row, no partial factors).
 *
 * ── Replay checksum ──────────────────────────────────────────────────────────
 *   SHA-256 over deterministic JSON: opinion_id, predicate key+label, governance
 *   id+version, version_context_id, ordered factor definitions + observed inputs
 *   + results, final outcome, evaluation_timestamp.
 *   Historical replay must use recorded historical inputs exactly.
 */

import { createHash } from "crypto";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PoolClient = any;
import { logger } from "../../lib/logger.js";
import {
  resolveKnowledgeGovernanceContext,
  resolveGovernanceForReplay,
  type GovernanceRow,
} from "./knowledgeGovernanceResolution.js";

// ── Types ──────────────────────────────────────────────────────────────────────

export type FactorResult =
  | "pass"
  | "fail"
  | "not_applicable"
  | "indeterminate";

export type KQOutcome = "knowledge" | "insufficient" | "indeterminate";

export type FactorDetail = {
  name: string;
  result: FactorResult;
  threshold: unknown;
  observed: unknown;
  detail: Record<string, unknown>;
};

export type QualifyOpinionResult =
  | {
      ok: true;
      outcome: KQOutcome;
      runId: string;
      knowledgeRecordId: string | null; // non-null only when outcome='knowledge'
      factors: FactorDetail[];
    }
  | {
      ok: false;
      reason_code: string;
      detail: string;
      refusal_id: string | null;
    };

export type QualifyOpinionParams = {
  opinionId: string;
  ledgerId?: string | null;
  // For historical replay only:
  replayGovernanceContextId?: string;
  replayPredicateVersionId?: string;
  replayVersionContextId?: string | null;
  replayEvaluationTimestamp?: string;
};

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Qualify an Opinion against the versioned knowledge sufficiency policy.
 *
 * For new qualification: resolves governance via chain-tip logic.
 * For historical replay: pass replayGovernanceContextId + replayPredicateVersionId
 *   to use the recorded historical governance (no re-resolution).
 */
export async function qualifyOpinion(
  params: QualifyOpinionParams,
): Promise<QualifyOpinionResult> {
  const { pool } = await import("@workspace/db");
  const client = await pool.connect();
  try {
    return await _runQualification(client, params);
  } finally {
    client.release();
  }
}

// ── Internal pipeline ──────────────────────────────────────────────────────────

async function _runQualification(
  client: PoolClient,
  params: QualifyOpinionParams,
): Promise<QualifyOpinionResult> {
  const { db } = await import("@workspace/db");
  const { sql } = await import("drizzle-orm");
  const isReplay = !!(params.replayGovernanceContextId && params.replayPredicateVersionId);
  const evaluationTimestamp = params.replayEvaluationTimestamp ?? new Date().toISOString();

  // ── Step 1: Load opinion + full lineage ──────────────────────────────────
  const opinionRes = await db.execute(sql`
    SELECT
      o.id, o.claim_id, o.evidence_bundle_id, o.fusion_context_id,
      o.belief, o.disbelief, o.uncertainty, o.base_rate, o.base_rate_record_id,
      o.mathematical_validity_status, o.evaluation_time, o.version_context_id, o.supersedes,
      brr.sufficiency_status AS base_rate_sufficiency,
      brr.scope AS base_rate_scope,
      brr.source_type AS base_rate_source_type,
      fc.conflict_measure, fc.selected_operator, fc.governance_context_id AS fusion_governance_id,
      rt.independent_contribution_count, rt.zero_weight_contribution_count,
      rt.discarded_contribution_count, rt.replay_checksum AS opinion_replay_checksum
    FROM opinions o
    JOIN base_rate_records brr ON brr.id = o.base_rate_record_id
    JOIN fusion_contexts fc ON fc.id = o.fusion_context_id
    JOIN reasoning_traces rt ON rt.opinion_id = o.id
    WHERE o.id = ${params.opinionId}::uuid
    LIMIT 1
  `);

  if (opinionRes.rows.length === 0) {
    const refusalId = await _writeRefusal(db, sql, {
      stage: "knowledge_qualification",
      reason_code: "missing_opinion_lineage",
      detail: `Opinion ${params.opinionId} not found — cannot qualify.`,
    });
    return { ok: false, reason_code: "missing_opinion_lineage", detail: `Opinion ${params.opinionId} not found.`, refusal_id: refusalId };
  }

  const opinion = opinionRes.rows[0] as {
    id: string;
    claim_id: string;
    evidence_bundle_id: string;
    fusion_context_id: string;
    belief: string;
    disbelief: string;
    uncertainty: string;
    base_rate: string;
    base_rate_record_id: string;
    mathematical_validity_status: string;
    evaluation_time: string;
    version_context_id: string | null;
    supersedes: string | null;
    base_rate_sufficiency: string;
    base_rate_scope: string;
    base_rate_source_type: string;
    conflict_measure: string | null;
    selected_operator: string;
    fusion_governance_id: string;
    independent_contribution_count: number;
    zero_weight_contribution_count: number;
    discarded_contribution_count: number;
    opinion_replay_checksum: string;
  };

  // ── Step 2: Resolve governance ────────────────────────────────────────────
  let govResult;
  if (isReplay) {
    govResult = await resolveGovernanceForReplay({
      governanceContextId: params.replayGovernanceContextId!,
      predicateVersionId: params.replayPredicateVersionId!,
    });
  } else {
    govResult = await resolveKnowledgeGovernanceContext(opinion.claim_id, evaluationTimestamp);
  }

  if (!govResult.ok) {
    const refusalId = await _writeRefusal(db, sql, {
      stage: "knowledge_qualification",
      reason_code: govResult.reason_code,
      detail: govResult.detail,
      claim_id: opinion.claim_id,
    });
    if (params.ledgerId) {
      await db.execute(sql`
        UPDATE knowledge_qualification_ledger
        SET status = 'refused', completed_at = NOW(), resulting_refusal_id = ${refusalId}::uuid
        WHERE id = ${params.ledgerId}::uuid
      `);
    }
    return { ok: false, reason_code: govResult.reason_code, detail: govResult.detail, refusal_id: refusalId };
  }

  const { governance, predicate } = govResult;

  // ── Step 3: Evaluate all ten factors ──────────────────────────────────────
  const factors = await _evaluateAllFactors(db, sql, opinion, governance);

  // ── Step 4: Determine outcome ─────────────────────────────────────────────
  const requiredApplicable = factors.filter(f => f.result !== "not_applicable");
  const anyIndeterminate = requiredApplicable.some(f => f.result === "indeterminate");
  const anyFail = requiredApplicable.some(f => f.result === "fail");
  const allPass = requiredApplicable.every(f => f.result === "pass");

  let outcome: KQOutcome;
  if (anyIndeterminate) {
    outcome = "indeterminate";
  } else if (allPass) {
    outcome = "knowledge";
  } else if (anyFail) {
    outcome = "insufficient";
  } else {
    // Edge case: no required applicable factors (impossible with current predicate, but be safe)
    outcome = "indeterminate";
  }

  // ── Step 5: Compute replay checksum ──────────────────────────────────────
  const versionContextId = isReplay
    ? (params.replayVersionContextId ?? null)
    : (opinion.version_context_id ?? null);

  // For not_applicable factors, threshold and observed are stored as NULL in the DB.
  // The checksum must use the same null values for consistency with replay reconstruction.
  //
  // Sort factors by name alphabetically for a deterministic checksum regardless of
  // evaluation order. This also ensures the test reconstruction (DB read ordered by
  // factor_name) produces byte-for-byte identical output.
  const sortedFactors = [...factors].sort((a, b) => a.name.localeCompare(b.name));
  const checksumPayload = _buildChecksumPayload({
    opinionId: opinion.id,
    predicateImplementationKey: predicate.implementation_key,
    predicateVersionLabel: predicate.version_label,
    governanceContextId: governance.id,
    governanceVersion: governance.version,
    versionContextId,
    factorDefinitions: sortedFactors.map(f => ({
      name: f.name,
      threshold: f.result === "not_applicable" ? null : f.threshold,
    })),
    factorObservedInputs: Object.fromEntries(
      sortedFactors.map(f => [f.name, f.result === "not_applicable" ? null : f.observed])
    ),
    factorResults: Object.fromEntries(sortedFactors.map(f => [f.name, f.result])),
    finalOutcome: outcome,
    evaluationTimestamp,
  });
  const replayChecksum = createHash("sha256").update(checksumPayload).digest("hex");

  // ── Step 6: Atomic transaction: run + factor_results + knowledge_record ───
  let runId: string;
  let knowledgeRecordId: string | null = null;

  await client.query("BEGIN");
  try {
    // Insert run
    const runRes = await client.query(
      `INSERT INTO knowledge_qualification_runs
         (opinion_id, predicate_version_id, governance_context_id, version_context_id,
          outcome, evaluation_timestamp, replay_checksum)
       VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, $6::timestamptz, $7)
       RETURNING id`,
      [
        opinion.id,
        predicate.id,
        governance.id,
        versionContextId,
        outcome,
        evaluationTimestamp,
        replayChecksum,
      ],
    );
    runId = runRes.rows[0].id as string;

    // Insert factor results (one row per factor)
    for (const factor of factors) {
      await client.query(
        `INSERT INTO knowledge_qualification_factor_results
           (run_id, factor_name, factor_result, threshold_value, observed_value, factor_detail)
         VALUES ($1::uuid, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb)`,
        [
          runId,
          factor.name,
          factor.result,
          factor.result === "not_applicable" ? null : JSON.stringify(factor.threshold),
          factor.result === "not_applicable" ? null : JSON.stringify(factor.observed),
          JSON.stringify(factor.detail),
        ],
      );
    }

    // Insert knowledge_record ONLY when outcome=knowledge
    if (outcome === "knowledge") {
      const krRes = await client.query(
        `INSERT INTO knowledge_records
           (opinion_id, run_id, claim_id, knowledge_at,
            predicate_version_id, governance_context_id, version_context_id, supersedes)
         VALUES ($1::uuid, $2::uuid, $3::uuid, $4::timestamptz, $5::uuid, $6::uuid, $7, NULL)
         RETURNING id`,
        [
          opinion.id,
          runId,
          opinion.claim_id,
          evaluationTimestamp,
          predicate.id,
          governance.id,
          versionContextId,
        ],
      );
      knowledgeRecordId = krRes.rows[0].id as string;
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    const errMsg = err instanceof Error ? err.message : String(err);
    logger.error({ err, opinionId: opinion.id }, "[Build2A/5/knowledgeQualification] Transaction rolled back");
    const refusalId = await _writeRefusal(db, sql, {
      stage: "knowledge_qualification",
      reason_code: "qualification_computation_failed",
      detail: `Qualification transaction failed for opinion ${opinion.id}: ${errMsg}`,
      claim_id: opinion.claim_id,
    });
    if (params.ledgerId) {
      await db.execute(sql`
        UPDATE knowledge_qualification_ledger
        SET status = 'failed',
            errors = errors || ${JSON.stringify([{ error: errMsg, at: new Date().toISOString() }])}::jsonb
        WHERE id = ${params.ledgerId}::uuid
      `).catch(() => {});
    }
    return { ok: false, reason_code: "qualification_computation_failed", detail: errMsg, refusal_id: refusalId };
  }

  // ── Step 7: Update ledger ─────────────────────────────────────────────────
  if (params.ledgerId) {
    const ledgerStatus = outcome === "knowledge" ? "succeeded" : outcome; // 'insufficient' | 'indeterminate'
    await db.execute(sql`
      UPDATE knowledge_qualification_ledger
      SET status = ${ledgerStatus}, completed_at = NOW(),
          resulting_run_id = ${runId}::uuid
      WHERE id = ${params.ledgerId}::uuid
    `).catch((err: unknown) => {
      logger.error({ err, ledgerId: params.ledgerId }, "[Build2A/5] Failed to update ledger after qualification");
    });
  }

  logger.info(
    { opinionId: opinion.id, outcome, runId, knowledgeRecordId },
    "[Build2A/5/knowledgeQualification] Qualification complete",
  );

  return { ok: true, outcome, runId, knowledgeRecordId, factors };
}

// ── Factor evaluation ──────────────────────────────────────────────────────────

async function _evaluateAllFactors(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sql: any,
  opinion: {
    id: string;
    claim_id: string;
    evidence_bundle_id: string;
    uncertainty: string;
    base_rate_record_id: string;
    base_rate_sufficiency: string;
    fusion_context_id: string;
    conflict_measure: string | null;
    independent_contribution_count: number;
  },
  governance: GovernanceRow,
): Promise<FactorDetail[]> {
  const factors: FactorDetail[] = [];

  // ── F1: uncertainty_threshold ─────────────────────────────────────────────
  {
    const threshold = Number(governance.uncertainty_threshold);
    const observed = Number(opinion.uncertainty);
    factors.push({
      name: "uncertainty_threshold",
      result: observed <= threshold ? "pass" : "fail",
      threshold,
      observed,
      detail: { comparison: `${observed} <= ${threshold}` },
    });
  }

  // ── F2: minimum_evidence_quantity ─────────────────────────────────────────
  {
    const threshold = Number(governance.minimum_evidence_quantity);
    const cntRes = await db.execute(sql`
      SELECT COUNT(*)::int AS cnt
      FROM evidence_bundle_members
      WHERE bundle_id = ${opinion.evidence_bundle_id}::uuid
    `);
    const observed = Number((cntRes.rows[0] as { cnt: number }).cnt);
    factors.push({
      name: "minimum_evidence_quantity",
      result: observed >= threshold ? "pass" : "fail",
      threshold,
      observed,
      detail: { bundle_id: opinion.evidence_bundle_id, comparison: `${observed} >= ${threshold}` },
    });
  }

  // ── F3: minimum_effective_weight ──────────────────────────────────────────
  {
    const threshold = Number(governance.minimum_effective_weight);
    const weightRes = await db.execute(sql`
      SELECT COALESCE(SUM(wec.final_effective_weight), 0) AS total
      FROM evidence_bundle_members ebm
      JOIN weighted_evidence_contributions wec ON wec.id = ebm.weighted_contribution_id
      WHERE ebm.bundle_id = ${opinion.evidence_bundle_id}::uuid
    `);
    const observed = Number((weightRes.rows[0] as { total: string }).total);
    factors.push({
      name: "minimum_effective_weight",
      result: observed >= threshold ? "pass" : "fail",
      threshold,
      observed,
      detail: { comparison: `${observed.toFixed(6)} >= ${threshold}` },
    });
  }

  // ── F4: minimum_source_coverage ───────────────────────────────────────────
  {
    const threshold = Number(governance.minimum_source_coverage);
    // Path: bundle_members → wec → atom → cluster → observation_links
    const srcRes = await db.execute(sql`
      SELECT COUNT(DISTINCT eaol.evidence_source_registry_id)::int AS cnt
      FROM evidence_bundle_members ebm
      JOIN weighted_evidence_contributions wec ON wec.id = ebm.weighted_contribution_id
      JOIN interpreted_evidence_atoms iea ON iea.id = wec.atom_id
      JOIN evidence_atom_observation_links eaol ON eaol.cluster_assembly_id = iea.cluster_assembly_id
      WHERE ebm.bundle_id = ${opinion.evidence_bundle_id}::uuid
    `);
    const observed = Number((srcRes.rows[0] as { cnt: number }).cnt);
    factors.push({
      name: "minimum_source_coverage",
      result: observed >= threshold ? "pass" : "fail",
      threshold,
      observed,
      detail: {
        experimental: "EXPERIMENTAL_NON_DISCRIMINATING",
        comparison: `${observed} >= ${threshold}`,
      },
    });
  }

  // ── F5: minimum_context_coverage_days ─────────────────────────────────────
  {
    const threshold = Number(governance.minimum_context_coverage_days);
    // Use iea.effective_at (confirmed live column name)
    const spanRes = await db.execute(sql`
      SELECT COALESCE(
        EXTRACT(EPOCH FROM (MAX(iea.effective_at) - MIN(iea.effective_at))) / 86400.0,
        0
      ) AS days
      FROM evidence_bundle_members ebm
      JOIN weighted_evidence_contributions wec ON wec.id = ebm.weighted_contribution_id
      JOIN interpreted_evidence_atoms iea ON iea.id = wec.atom_id
      WHERE ebm.bundle_id = ${opinion.evidence_bundle_id}::uuid
    `);
    const observed = Number((spanRes.rows[0] as { days: string }).days);
    factors.push({
      name: "minimum_context_coverage_days",
      result: observed >= threshold ? "pass" : "fail",
      threshold,
      observed,
      detail: {
        experimental: "EXPERIMENTAL_NON_DISCRIMINATING",
        comparison: `${observed.toFixed(4)} >= ${threshold}`,
      },
    });
  }

  // ── F6: minimum_independent_contribution_count ────────────────────────────
  {
    const threshold = Number(governance.minimum_independent_contribution_count);
    const observed = Number(opinion.independent_contribution_count);
    factors.push({
      name: "minimum_independent_contribution_count",
      result: observed >= threshold ? "pass" : "fail",
      threshold,
      observed,
      detail: {
        source: "reasoning_traces.independent_contribution_count",
        comparison: `${observed} >= ${threshold}`,
      },
    });
  }

  // ── F7: conflict_tolerance ────────────────────────────────────────────────
  // Uses stored fusion_contexts.conflict_measure — NEVER recomputes fusion.
  // NULL conflict_measure = no conflict detected = pass (single atom or homogeneous bundle).
  {
    const threshold = Number(governance.conflict_tolerance);
    const rawConflict = opinion.conflict_measure;
    const observed = rawConflict !== null ? Number(rawConflict) : null;
    const result: FactorResult = observed === null || observed <= threshold ? "pass" : "fail";
    factors.push({
      name: "conflict_tolerance",
      result,
      threshold,
      observed,
      detail: {
        source: "fusion_contexts.conflict_measure (stored — not recomputed)",
        null_means: "no conflict detected → pass",
        comparison: observed === null ? "null (no conflict) → pass" : `${observed.toFixed(6)} <= ${threshold}`,
      },
    });
  }

  // ── F8: base_rate_validity ────────────────────────────────────────────────
  {
    const requiredStatus = governance.base_rate_validity_required; // 'sufficient'
    const observed = opinion.base_rate_sufficiency;
    const result: FactorResult = observed === requiredStatus ? "pass" : "fail";
    factors.push({
      name: "base_rate_validity",
      result,
      threshold: requiredStatus,
      observed,
      detail: {
        base_rate_record_id: opinion.base_rate_record_id,
        required_sufficiency_status: requiredStatus,
        actual_sufficiency_status: observed,
        note: observed === "provisional"
          ? "Provisional base rates are explicitly excluded from knowledge-qualifying opinion lineage. Machine-readable signal for downstream quarantine."
          : observed === "provisional_unknown"
          ? "provisional_unknown base rates are excluded (value IS NULL implies domain-unknown prior)."
          : "",
      },
    });
  }

  // ── F9: minimum_integrity_score (NOT_APPLICABLE) ──────────────────────────
  {
    factors.push({
      name: "minimum_integrity_score",
      result: "not_applicable",
      threshold: null,
      observed: null,
      detail: {
        reason: governance.minimum_integrity_score,
        note: "No empirically validated integrity threshold exists for this predicate version. This factor must never be counted as pass. Always not_applicable.",
      },
    });
  }

  // ── F10: misleading_evidence_hold (NOT_APPLICABLE but record concern values)
  {
    // Always not_applicable — BUT must record all four concern values for visibility.
    const concernRes = await db.execute(sql`
      SELECT
        ic.manipulation_concern,
        ic.duplication_concern,
        ic.circular_concern,
        ic.synthetic_concern
      FROM evidence_bundle_members ebm
      JOIN weighted_evidence_contributions wec ON wec.id = ebm.weighted_contribution_id
      JOIN integrity_contexts ic ON ic.id = wec.integrity_context_id
      WHERE ebm.bundle_id = ${opinion.evidence_bundle_id}::uuid
      ORDER BY ebm.sequence_number ASC
    `);
    const concernRows = concernRes.rows as Array<{
      manipulation_concern: string;
      duplication_concern: string;
      circular_concern: string;
      synthetic_concern: string;
    }>;
    const concernSummary = {
      max_manipulation: concernRows.length > 0 ? Math.max(...concernRows.map(r => Number(r.manipulation_concern))) : null,
      max_duplication: concernRows.length > 0 ? Math.max(...concernRows.map(r => Number(r.duplication_concern))) : null,
      max_circular: concernRows.length > 0 ? Math.max(...concernRows.map(r => Number(r.circular_concern))) : null,
      max_synthetic: concernRows.length > 0 ? Math.max(...concernRows.map(r => Number(r.synthetic_concern))) : null,
      atom_count: concernRows.length,
      per_atom: concernRows.map(r => ({
        manipulation_concern: Number(r.manipulation_concern),
        duplication_concern: Number(r.duplication_concern),
        circular_concern: Number(r.circular_concern),
        synthetic_concern: Number(r.synthetic_concern),
      })),
    };
    factors.push({
      name: "misleading_evidence_hold",
      result: "not_applicable",
      threshold: null,
      observed: null,
      detail: {
        reason: governance.misleading_evidence_hold,
        note: "Not yet calibrated. Concern values recorded for future calibration visibility only. NOT_APPLICABLE — never counted as pass.",
        concern_summary: concernSummary,
      },
    });
  }

  return factors;
}

// ── Checksum ───────────────────────────────────────────────────────────────────

function _buildChecksumPayload(inputs: {
  opinionId: string;
  predicateImplementationKey: string;
  predicateVersionLabel: string;
  governanceContextId: string;
  governanceVersion: string;
  versionContextId: string | null;
  factorDefinitions: Array<{ name: string; threshold: unknown }>;
  factorObservedInputs: Record<string, unknown>;
  factorResults: Record<string, string>;
  finalOutcome: string;
  evaluationTimestamp: string;
}): string {
  // Deterministic JSON — no UUID noise, no mutable labels, no wall-clock time.
  // evaluation_timestamp is INCLUDED so historical replay uses the historical time.
  return JSON.stringify({
    opinion_id: inputs.opinionId,
    predicate_implementation_key: inputs.predicateImplementationKey,
    predicate_version_label: inputs.predicateVersionLabel,
    governance_context_id: inputs.governanceContextId,
    governance_version: inputs.governanceVersion,
    version_context_id: inputs.versionContextId ?? "null",
    factor_definitions: inputs.factorDefinitions, // ordered — matches predicate factor ordering
    factor_observed_inputs: inputs.factorObservedInputs,
    factor_results: inputs.factorResults,
    final_outcome: inputs.finalOutcome,
    evaluation_timestamp: inputs.evaluationTimestamp,
  });
}

/**
 * Independently recompute the replay checksum for audit/canary use.
 * Uses Node.js crypto directly — NOT the internal _buildChecksumPayload function.
 * Must produce byte-for-byte identical output to the stored checksum.
 */
export function computeKnowledgeReplayChecksum(inputs: {
  opinionId: string;
  predicateImplementationKey: string;
  predicateVersionLabel: string;
  governanceContextId: string;
  governanceVersion: string;
  versionContextId: string | null;
  factorDefinitions: Array<{ name: string; threshold: unknown }>;
  factorObservedInputs: Record<string, unknown>;
  factorResults: Record<string, string>;
  finalOutcome: string;
  evaluationTimestamp: string;
}): string {
  const payload = JSON.stringify({
    opinion_id: inputs.opinionId,
    predicate_implementation_key: inputs.predicateImplementationKey,
    predicate_version_label: inputs.predicateVersionLabel,
    governance_context_id: inputs.governanceContextId,
    governance_version: inputs.governanceVersion,
    version_context_id: inputs.versionContextId ?? "null",
    factor_definitions: inputs.factorDefinitions,
    factor_observed_inputs: inputs.factorObservedInputs,
    factor_results: inputs.factorResults,
    final_outcome: inputs.finalOutcome,
    evaluation_timestamp: inputs.evaluationTimestamp,
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
        ${params.claim_id ? `${params.claim_id}` : null}::uuid
      )
      RETURNING id
    `);
    return (res.rows[0] as { id: string }).id;
  } catch (err) {
    logger.error({ err }, "[Build2A/5] Failed to write refusal record");
    return null;
  }
}
