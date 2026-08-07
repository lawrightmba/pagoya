/**
 * Build 2A — Weighting Service (Package 2A-3)
 *
 * Transforms an immutable Interpreted Evidence Atom into an immutable Weighted
 * Evidence Contribution.
 *
 * Pipeline: Atom → Integrity Context → Quality Context → Weighted Evidence Contribution
 *
 * Architecture rules (non-negotiable):
 *   - Never reinterprets observations or alters an atom in any way.
 *   - Atom disposition, claim, source links, and dependence declaration are Package 2A-2
 *     property — immutable, never touched here.
 *   - All formulas are deterministic, version-dispatched, and replayable.
 *   - All parameters come from pinned rule_content in the version registry.
 *   - evaluation_timestamp is pinned at weighting time — never implicitly NOW() during replay.
 *   - One atomic transaction creates Integrity Context + Quality Context + Contribution (or Refusal).
 *   - Failure at any step rolls back the entire weighting attempt.
 *
 * Approved implementation keys (seeded by migrations_2a3.ts):
 *   integrity_discount_v1  → integrity_rule_versions
 *   quality_weighting_v1   → quality_rule_versions
 *
 * Integrity formula (integrity_discount_v1):
 *   reliability_score = provenance_confidence
 *                     × (1 - manipulation_concern)
 *                     × (1 - duplication_concern)
 *                     × (1 - circular_concern)
 *                     × (1 - synthetic_concern)
 *   integrity_discount_factor = reliability_score
 *
 * Quality formula (quality_weighting_v1):
 *   recency = exp(-ln(2) / half_life_days × days_elapsed)
 *   raw_quality_weight = Σ(weight_i × component_i) / Σ(weight_i)
 *   final_effective_weight = integrity_discount_factor × raw_quality_weight
 */

import { logger } from "../../lib/logger.js";
import { resolveImplementationKey } from "./versionDispatch.js";

// ── Approved implementation keys ──────────────────────────────────────────────
export const INTEGRITY_KEY = "integrity_discount_v1" as const;
export const QUALITY_KEY   = "quality_weighting_v1"  as const;

// ── Types ─────────────────────────────────────────────────────────────────────

export type IntegrityInputs = {
  /** Override provenance_confidence (0–1). Omit to use rule's source-classification default. */
  provenance_confidence?: number;
  manipulation_concern?: number;
  duplication_concern?: number;
  circular_concern?: number;
  synthetic_concern?: number;
  integrity_flags?: string[];
  integrity_reason_codes?: string[];
};

export type QualityInputs = {
  /** ISO timestamp pinned at weighting time — used for recency calculation. */
  evaluation_timestamp: string;
  verification_strength?: number;
  relevance?: number;
  corroboration?: number;
  completeness?: number;
  context_similarity?: number;
};

export type WeightingParams = {
  atomId: string;
  integrity?: IntegrityInputs;
  quality: { evaluation_timestamp: string } & Partial<Omit<QualityInputs, "evaluation_timestamp">>;
  /** UUID of a prior contribution this new one supersedes (reweighting path). */
  supersedes?: string;
};

export type WeightingSuccess = {
  weighted: true;
  integrityCx: IntegrityContextRow;
  qualityCx: QualityContextRow;
  contribution: ContributionRow;
};

export type WeightingRefusal = {
  weighted: false;
  reason_code: string;
  detail: string;
  refusal_id?: string;
};

export type WeightingResult = WeightingSuccess | WeightingRefusal;

export type IntegrityContextRow = {
  id: string;
  atom_id: string;
  evidence_source_registry_id: string | null;
  integrity_rule_version_id: string;
  implementation_key: string;
  source_classification: string;
  provenance_confidence: string | number;
  manipulation_concern: string | number;
  duplication_concern: string | number;
  circular_concern: string | number;
  synthetic_concern: string | number;
  integrity_flags: string[];
  integrity_reason_codes: string[];
  reliability_score: string | number;
  effective_at: string;
  created_at: string;
};

export type QualityContextRow = {
  id: string;
  atom_id: string;
  domain_module_id: string | null;
  quality_rule_version_id: string;
  implementation_key: string;
  source_classification: string;
  directness: string | number;
  verification_strength: string | number;
  recency: string | number;
  relevance: string | number;
  corroboration: string | number;
  completeness: string | number;
  context_similarity: string | number;
  evaluation_timestamp: string;
  raw_quality_weight: string | number;
  effective_at: string;
  created_at: string;
};

export type ContributionRow = {
  id: string;
  atom_id: string;
  integrity_context_id: string;
  quality_context_id: string;
  integrity_rule_version_id: string;
  quality_rule_version_id: string;
  implementation_key: string;
  integrity_discount_factor: string | number;
  raw_quality_weight: string | number;
  directness: string | number;
  verification_strength: string | number;
  recency: string | number;
  relevance: string | number;
  corroboration: string | number;
  completeness: string | number;
  context_similarity: string | number;
  final_effective_weight: string | number;
  evaluation_timestamp: string;
  supersedes: string | null;
  computed_at: string;
  created_at: string;
};

// ── Rule content types (internal) ─────────────────────────────────────────────

type IntegrityRuleContent = {
  provenance_defaults_by_source_classification: Record<string, number>;
};

type QualityRuleContent = {
  component_weights: {
    directness: number;
    verification_strength: number;
    recency: number;
    relevance: number;
    corroboration: number;
    completeness: number;
    context_similarity: number;
  };
  directness_by_source_classification: Record<string, number>;
  verification_defaults_by_source_classification: Record<string, number>;
  recency_decay: { formula: string; half_life_days: number };
  relevance_default: number;
  corroboration_default_unspecified: number;
  completeness_default_all_present: number;
  context_similarity_default: number;
};

// ── Pure formula functions (exported for deterministic testing) ───────────────

/** Clamp a value to [0, 1]. */
export function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

/** Round to 4 decimal places for NUMERIC(5,4) columns. */
export function r4(v: number): number {
  return Math.round(v * 10_000) / 10_000;
}

/** Round to 6 decimal places for NUMERIC(7,6) columns. */
export function r6(v: number): number {
  return Math.round(v * 1_000_000) / 1_000_000;
}

/**
 * Compute reliability_score for integrity_discount_v1.
 * Pure deterministic function — same inputs always produce the same output.
 */
export function computeIntegrityReliabilityScore(params: {
  provenance_confidence: number;
  manipulation_concern: number;
  duplication_concern: number;
  circular_concern: number;
  synthetic_concern: number;
}): number {
  return clamp01(
    clamp01(params.provenance_confidence) *
    clamp01(1 - params.manipulation_concern) *
    clamp01(1 - params.duplication_concern) *
    clamp01(1 - params.circular_concern) *
    clamp01(1 - params.synthetic_concern),
  );
}

/**
 * Compute recency component for quality_weighting_v1.
 * Uses pinned evaluation_timestamp — deterministic for replay at the same timestamp.
 * Positive time-difference only: evidence from the future is treated as age=0.
 */
export function computeRecency(
  atomEffectiveAt: string,
  evaluationTimestamp: string,
  halfLifeDays: number,
): number {
  const atomMs = new Date(atomEffectiveAt).getTime();
  const evalMs = new Date(evaluationTimestamp).getTime();
  const daysElapsed = Math.max(0, (evalMs - atomMs) / (1000 * 60 * 60 * 24));
  const lambda = Math.LN2 / halfLifeDays;
  return clamp01(Math.exp(-lambda * daysElapsed));
}

/**
 * Compute raw_quality_weight for quality_weighting_v1.
 * Weighted linear combination of seven components.
 */
export function computeRawQualityWeight(
  components: {
    directness: number;
    verification_strength: number;
    recency: number;
    relevance: number;
    corroboration: number;
    completeness: number;
    context_similarity: number;
  },
  weights: {
    directness: number;
    verification_strength: number;
    recency: number;
    relevance: number;
    corroboration: number;
    completeness: number;
    context_similarity: number;
  },
): number {
  const totalWeight =
    weights.directness + weights.verification_strength + weights.recency +
    weights.relevance + weights.corroboration + weights.completeness + weights.context_similarity;
  if (totalWeight <= 0) return 0;

  const weightedSum =
    weights.directness            * clamp01(components.directness) +
    weights.verification_strength * clamp01(components.verification_strength) +
    weights.recency               * clamp01(components.recency) +
    weights.relevance             * clamp01(components.relevance) +
    weights.corroboration         * clamp01(components.corroboration) +
    weights.completeness          * clamp01(components.completeness) +
    weights.context_similarity    * clamp01(components.context_similarity);

  return clamp01(weightedSum / totalWeight);
}

// ── Main weighting function ───────────────────────────────────────────────────

/**
 * Atomically weight one Interpreted Evidence Atom.
 *
 * Transaction atomically creates:
 *   1. Integrity Context row
 *   2. Quality Context row
 *   3. Weighted Evidence Contribution row
 *
 * If any step fails: ROLLBACK — no partial weighting context exists.
 * Refusals that can be detected before the transaction are recorded after rollback.
 *
 * Version dispatch ensures historical replay always calls the recorded key.
 */
export async function weightAtom(params: WeightingParams): Promise<WeightingResult> {
  const { pool } = await import("@workspace/db");

  // ── Pre-transaction: resolve implementation keys (read-only lookups) ────────
  const [integrityDispatch, qualityDispatch] = await Promise.all([
    resolveImplementationKey(INTEGRITY_KEY, "integrity_rule_versions"),
    resolveImplementationKey(QUALITY_KEY, "quality_rule_versions"),
  ]);

  if (!integrityDispatch.found || !integrityDispatch.usable_for_new_computation) {
    return {
      weighted: false,
      reason_code: "invalid_or_unavailable_weighting_version",
      detail: `${INTEGRITY_KEY} not available: ${integrityDispatch.resolution_note}`,
    };
  }

  if (!qualityDispatch.found || !qualityDispatch.usable_for_new_computation) {
    return {
      weighted: false,
      reason_code: "invalid_or_unavailable_weighting_version",
      detail: `${QUALITY_KEY} not available: ${qualityDispatch.resolution_note}`,
    };
  }

  const integrityRuleVersionId = integrityDispatch.row.id;
  const qualityRuleVersionId   = qualityDispatch.row.id;

  // resolveImplementationKey only selects the 6 core columns; rule_content is
  // table-specific. Fetch it separately to keep versionDispatch generic.
  const { db: dbInst } = await import("@workspace/db");
  const { sql: sqlFn } = await import("drizzle-orm");

  const [intRuleRes, qualRuleRes] = await Promise.all([
    dbInst.execute(sqlFn.raw(`SELECT rule_content FROM integrity_rule_versions WHERE id = '${integrityRuleVersionId}'`)),
    dbInst.execute(sqlFn.raw(`SELECT rule_content FROM quality_rule_versions WHERE id = '${qualityRuleVersionId}'`)),
  ]);

  const integrityRuleContent = (intRuleRes.rows[0] as { rule_content: unknown })?.rule_content as unknown as IntegrityRuleContent;
  const qualityRuleContent   = (qualRuleRes.rows[0] as { rule_content: unknown })?.rule_content as unknown as QualityRuleContent;

  if (!integrityRuleContent?.provenance_defaults_by_source_classification) {
    return {
      weighted: false,
      reason_code: "quality_inputs_incomplete",
      detail: `${INTEGRITY_KEY} rule_content is missing provenance_defaults_by_source_classification.`,
    };
  }
  if (!qualityRuleContent?.component_weights || !qualityRuleContent?.recency_decay) {
    return {
      weighted: false,
      reason_code: "quality_inputs_incomplete",
      detail: `${QUALITY_KEY} rule_content is missing required fields.`,
    };
  }

  // ── Transaction ─────────────────────────────────────────────────────────────
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Resolve atom
    const atomRes = await client.query(
      `SELECT id, claim_id, cluster_assembly_id, disposition,
              interpretation_rule_version_id, dependence_declaration,
              effective_at, environment_context, supersedes
       FROM interpreted_evidence_atoms WHERE id = $1::uuid FOR SHARE`,
      [params.atomId],
    );
    if (atomRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return {
        weighted: false,
        reason_code: "missing_integrity_context",
        detail: `Atom ${params.atomId} not found in interpreted_evidence_atoms.`,
      };
    }
    const atom = atomRes.rows[0] as {
      id: string; claim_id: string; cluster_assembly_id: string;
      disposition: string; effective_at: string;
    };

    // Verify cluster is sealed
    const clusterRes = await client.query(
      `SELECT assembly_state FROM cluster_assembly WHERE id = $1::uuid`,
      [atom.cluster_assembly_id],
    );
    const clusterState = (clusterRes.rows[0] as { assembly_state: string } | undefined)?.assembly_state;
    if (clusterState !== "sealed") {
      await client.query("ROLLBACK");
      return {
        weighted: false,
        reason_code: "weighting_computation_failed",
        detail: `Cluster ${atom.cluster_assembly_id} state is '${clusterState ?? "unknown"}' — expected 'sealed'.`,
      };
    }

    // Resolve observation source metadata (source_classification, esr_id, effective_at)
    const linkRes = await client.query(
      `SELECT eaol.evidence_source_registry_id::text AS esr_id,
              esr.source_classification,
              iea.effective_at AS atom_effective_at
       FROM evidence_atom_observation_links eaol
       JOIN evidence_source_registry esr ON esr.id = eaol.evidence_source_registry_id
       JOIN interpreted_evidence_atoms iea ON iea.id = $1::uuid
       WHERE eaol.cluster_assembly_id = $2::uuid
       ORDER BY eaol.sequence_position ASC LIMIT 1`,
      [params.atomId, atom.cluster_assembly_id],
    );
    const linkRow = linkRes.rows[0] as { esr_id: string; source_classification: string; atom_effective_at: string } | undefined;
    const sourceClassification = linkRow?.source_classification ?? "derived";
    const esrId                = linkRow?.esr_id ?? null;
    const atomEffectiveAt      = linkRow?.atom_effective_at ?? atom.effective_at;

    // Resolve domain module for the claim
    const claimRes = await client.query(
      `SELECT domain_module_id::text FROM behavioral_claims WHERE id = $1::uuid`,
      [atom.claim_id],
    );
    const domainModuleId = (claimRes.rows[0] as { domain_module_id: string } | undefined)?.domain_module_id ?? null;

    // ── Compute integrity components ───────────────────────────────────────
    const provenanceDefault =
      integrityRuleContent.provenance_defaults_by_source_classification[sourceClassification] ??
      integrityRuleContent.provenance_defaults_by_source_classification["derived"] ??
      0.82;

    const provenanceConfidence = clamp01(params.integrity?.provenance_confidence ?? provenanceDefault);
    const manipulationConcern  = clamp01(params.integrity?.manipulation_concern  ?? 0.0);
    const duplicationConcern   = clamp01(params.integrity?.duplication_concern   ?? 0.0);
    const circularConcern      = clamp01(params.integrity?.circular_concern      ?? 0.0);
    const syntheticConcern     = clamp01(params.integrity?.synthetic_concern     ?? 0.0);

    // Validate
    for (const [name, val] of [
      ["provenance_confidence", provenanceConfidence],
      ["manipulation_concern",  manipulationConcern],
      ["duplication_concern",   duplicationConcern],
      ["circular_concern",      circularConcern],
      ["synthetic_concern",     syntheticConcern],
    ] as [string, number][]) {
      if (isNaN(val) || val < 0 || val > 1) {
        await client.query("ROLLBACK");
        const rId = await _refuseTxn(client, atom.claim_id, esrId, "invalid_integrity_score",
          `Integrity component ${name}=${val} is outside [0,1].`);
        return { weighted: false, reason_code: "invalid_integrity_score",
          detail: `${name}=${val} outside [0,1].`, refusal_id: rId };
      }
    }

    const reliabilityScore = r4(computeIntegrityReliabilityScore({
      provenance_confidence: provenanceConfidence,
      manipulation_concern:  manipulationConcern,
      duplication_concern:   duplicationConcern,
      circular_concern:      circularConcern,
      synthetic_concern:     syntheticConcern,
    }));

    const integrityFlags       = params.integrity?.integrity_flags       ?? [];
    const integrityReasonCodes = params.integrity?.integrity_reason_codes ?? [];

    // INSERT integrity_context
    const icRes = await client.query(
      `INSERT INTO integrity_contexts
         (atom_id, evidence_source_registry_id, integrity_rule_version_id, implementation_key,
          source_classification, provenance_confidence, manipulation_concern, duplication_concern,
          circular_concern, synthetic_concern, integrity_flags, integrity_reason_codes,
          reliability_score, effective_at)
       VALUES ($1::uuid, $2::uuid, $3::uuid, $4,
               $5, $6, $7, $8,
               $9, $10, $11::text[], $12::text[],
               $13, $14::timestamptz)
       RETURNING *`,
      [
        params.atomId, esrId, integrityRuleVersionId, INTEGRITY_KEY,
        sourceClassification, provenanceConfidence, manipulationConcern, duplicationConcern,
        circularConcern, syntheticConcern,
        `{${integrityFlags.map(f => `"${f}"`).join(",")}}`,
        `{${integrityReasonCodes.map(r => `"${r}"`).join(",")}}`,
        reliabilityScore, atomEffectiveAt,
      ],
    );
    const integrityCx = icRes.rows[0] as IntegrityContextRow;

    // ── Compute quality components ─────────────────────────────────────────
    const rc = qualityRuleContent;
    const evalTs = params.quality.evaluation_timestamp;
    const halfLifeDays = rc.recency_decay.half_life_days;

    const directness = r4(
      rc.directness_by_source_classification[sourceClassification] ??
      rc.directness_by_source_classification["derived"] ?? 0.75,
    );
    const verificationStrength = r4(
      params.quality.verification_strength !== undefined
        ? clamp01(params.quality.verification_strength)
        : (rc.verification_defaults_by_source_classification[sourceClassification] ??
           rc.verification_defaults_by_source_classification["derived"] ?? 0.80),
    );
    const recency      = r4(computeRecency(atomEffectiveAt, evalTs, halfLifeDays));
    const relevance    = r4(params.quality.relevance          !== undefined ? clamp01(params.quality.relevance)    : rc.relevance_default);
    const corroboration = r4(params.quality.corroboration     !== undefined ? clamp01(params.quality.corroboration) : rc.corroboration_default_unspecified);
    const completeness  = r4(params.quality.completeness      !== undefined ? clamp01(params.quality.completeness)  : rc.completeness_default_all_present);
    const contextSimilarity = r4(params.quality.context_similarity !== undefined ? clamp01(params.quality.context_similarity) : rc.context_similarity_default);

    // Validate quality components
    for (const [name, val] of [
      ["directness",            directness],
      ["verification_strength", verificationStrength],
      ["recency",               recency],
      ["relevance",             relevance],
      ["corroboration",         corroboration],
      ["completeness",          completeness],
      ["context_similarity",    contextSimilarity],
    ] as [string, number][]) {
      if (isNaN(val) || val < 0 || val > 1) {
        await client.query("ROLLBACK");
        const rId = await _refuseTxn(client, atom.claim_id, esrId, "invalid_quality_component",
          `Quality component ${name}=${val} is outside [0,1].`);
        return { weighted: false, reason_code: "invalid_quality_component",
          detail: `${name}=${val} outside [0,1].`, refusal_id: rId };
      }
    }

    const rawQualityWeight = r6(computeRawQualityWeight(
      { directness, verification_strength: verificationStrength, recency, relevance,
        corroboration, completeness, context_similarity: contextSimilarity },
      rc.component_weights,
    ));

    // INSERT quality_context
    const qcRes = await client.query(
      `INSERT INTO quality_contexts
         (atom_id, domain_module_id, quality_rule_version_id, implementation_key,
          source_classification, directness, verification_strength, recency,
          relevance, corroboration, completeness, context_similarity,
          evaluation_timestamp, raw_quality_weight, effective_at)
       VALUES ($1::uuid, $2::uuid, $3::uuid, $4,
               $5, $6, $7, $8,
               $9, $10, $11, $12,
               $13::timestamptz, $14, $15::timestamptz)
       RETURNING *`,
      [
        params.atomId, domainModuleId, qualityRuleVersionId, QUALITY_KEY,
        sourceClassification, directness, verificationStrength, recency,
        relevance, corroboration, completeness, contextSimilarity,
        evalTs, rawQualityWeight, atomEffectiveAt,
      ],
    );
    const qualityCx = qcRes.rows[0] as QualityContextRow;

    // ── Final effective weight ─────────────────────────────────────────────
    const integrityDiscountFactor = integrityDispatch.row.rule_content
      ? reliabilityScore  // integrity_discount_factor = reliability_score per approved formula
      : reliabilityScore;
    const finalEffectiveWeight = r6(clamp01(integrityDiscountFactor * rawQualityWeight));
    const compositeKey = `${INTEGRITY_KEY}+${QUALITY_KEY}`;

    // INSERT weighted_evidence_contribution
    const wecRes = await client.query(
      `INSERT INTO weighted_evidence_contributions
         (atom_id, integrity_context_id, quality_context_id,
          integrity_rule_version_id, quality_rule_version_id, implementation_key,
          integrity_discount_factor, raw_quality_weight,
          directness, verification_strength, recency, relevance,
          corroboration, completeness, context_similarity,
          final_effective_weight, evaluation_timestamp, supersedes)
       VALUES ($1::uuid, $2::uuid, $3::uuid,
               $4::uuid, $5::uuid, $6,
               $7, $8,
               $9, $10, $11, $12,
               $13, $14, $15,
               $16, $17::timestamptz, $18::uuid)
       RETURNING *`,
      [
        params.atomId, integrityCx.id, qualityCx.id,
        integrityRuleVersionId, qualityRuleVersionId, compositeKey,
        integrityDiscountFactor, rawQualityWeight,
        directness, verificationStrength, recency, relevance,
        corroboration, completeness, contextSimilarity,
        finalEffectiveWeight, evalTs, params.supersedes ?? null,
      ],
    );
    const contribution = wecRes.rows[0] as ContributionRow;

    await client.query("COMMIT");

    logger.info(
      { atomId: params.atomId, contributionId: contribution.id,
        reliabilityScore, rawQualityWeight, finalEffectiveWeight },
      "[Build2A/weighting] atom weighted successfully",
    );

    return { weighted: true, integrityCx, qualityCx, contribution };
  } catch (err) {
    await client.query("ROLLBACK").catch(() => { /* ignore */ });
    logger.error({ err, atomId: params.atomId }, "[Build2A/weighting] weightAtom transaction failed");
    return {
      weighted: false,
      reason_code: "weighting_computation_failed",
      detail: err instanceof Error
        ? err.message
        : (err as { cause?: { message?: string } })?.cause?.message ?? String(err),
    };
  } finally {
    client.release();
  }
}

// ── Standalone refusal helpers ────────────────────────────────────────────────

/** Insert a weighting-stage refusal record using a live transaction client. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function _refuseTxn(client: any, claimId: string | null, esrId: string | null,
  reasonCode: string, detail: string): Promise<string> {
  const res = await client.query(
    `INSERT INTO refusal_records (refusal_stage, reason_code, claim_id, evidence_source_registry_id, detail)
     VALUES ('weighting', $1, $2::uuid, $3::uuid, $4) RETURNING id`,
    [reasonCode, claimId, esrId, detail],
  );
  return (res.rows[0] as { id: string }).id;
}

/**
 * Record a weighting-stage refusal and optionally update a weighting ledger row.
 * Called by the poller for failures detected before the weighting transaction.
 */
export async function recordWeightingRefusal(params: {
  atomId: string;
  claimId: string | null;
  esrId: string | null;
  reasonCode: string;
  detail: string;
  ledgerId?: string;
}): Promise<string> {
  const { db } = await import("@workspace/db");
  const { sql } = await import("drizzle-orm");

  const res = await db.execute(sql`
    INSERT INTO refusal_records
      (refusal_stage, reason_code, claim_id, evidence_source_registry_id, detail)
    VALUES (
      'weighting',
      ${params.reasonCode},
      ${params.claimId ?? null}::uuid,
      ${params.esrId ?? null}::uuid,
      ${params.detail}
    )
    RETURNING id
  `);
  const refusalId = (res.rows[0] as { id: string }).id;

  if (params.ledgerId) {
    await db.execute(sql`
      UPDATE weighting_ledger
      SET status               = 'refused',
          completed_at         = NOW(),
          resulting_refusal_id = ${refusalId}::uuid
      WHERE id = ${params.ledgerId}::uuid
    `);
  }

  return refusalId;
}
