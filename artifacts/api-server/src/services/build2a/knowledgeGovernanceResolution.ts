/**
 * Build 2A — Knowledge Governance Resolution Service (Package 2A-5)
 *
 * Resolves the correct knowledge_qualification_governance_context for a given
 * claim and predicate version, following strict chain-tip lineage precedence:
 *
 *   Resolution order:
 *     1. Claim-level (scope_type='behavioral_claim', claim_id matches)
 *     2. Domain-level (scope_type='domain_module', domain_module_id of the claim matches)
 *     3. Neither found → refuse with 'missing_knowledge_governance'
 *
 *   Ambiguity rule:
 *     Multiple chain-tip rows at the same specificity level → refuse with
 *     'ambiguous_knowledge_governance'. NEVER use ORDER BY timestamp, UUID
 *     ordering, version string, or insertion order as a tiebreaker.
 *
 *   Effective period:
 *     The resolved context must have effective_from <= evaluation_time AND
 *     (effective_until IS NULL OR effective_until > evaluation_time).
 *     A context outside its effective period is treated as absent.
 *
 *   Predicate version:
 *     The resolved context's knowledge_sufficiency_predicate_version_id must
 *     resolve to an active, known predicate version. If not → refuse with
 *     'predicate_version_unavailable'.
 *
 *   Historical replay:
 *     resolveGovernanceForReplay() fetches the SPECIFIC context by ID — no
 *     chain-tip re-resolution. The implementation_key must match the recorded
 *     predicate_version_id. Any mismatch → refuse.
 *
 * NO global-scope fallback exists. Either a context is found at claim or domain
 * level, or qualification refuses.
 */

import { sql } from "drizzle-orm";
import { logger } from "../../lib/logger.js";

// ── Types ──────────────────────────────────────────────────────────────────────

export type GovernanceRow = {
  id: string;
  scope_type: string;
  domain_module_id: string | null;
  claim_id: string | null;
  knowledge_sufficiency_predicate_version_id: string;
  uncertainty_threshold: string;
  minimum_evidence_quantity: string;
  minimum_effective_weight: string;
  minimum_source_coverage: string;
  minimum_context_coverage_days: string;
  minimum_independent_contribution_count: string;
  conflict_tolerance: string;
  base_rate_validity_required: string;
  minimum_integrity_score: string;
  misleading_evidence_hold: string;
  approval_authority: string;
  derivation_method: string;
  effective_from: string | null;
  effective_until: string | null;
  version: string;
  supersedes: string | null;
  notes: string | null;
  created_at: string;
};

export type GovernanceResolutionResult =
  | {
      ok: true;
      governance: GovernanceRow;
      predicate: { id: string; implementation_key: string; version_label: string };
      resolution_level: "claim" | "domain";
      resolution_note: string;
    }
  | {
      ok: false;
      reason_code:
        | "missing_knowledge_governance"
        | "ambiguous_knowledge_governance"
        | "predicate_version_unavailable";
      detail: string;
    };

// ── Main resolution function ───────────────────────────────────────────────────

/**
 * Resolve the knowledge governance context for a claim at a given evaluation time.
 * Uses live chain-tip resolution — for historical replay, use resolveGovernanceForReplay().
 *
 * @param claimId         - the behavioral_claim to qualify
 * @param evaluationTime  - ISO string; evaluated against effective_from/until
 */
export async function resolveKnowledgeGovernanceContext(
  claimId: string,
  evaluationTime: string,
): Promise<GovernanceResolutionResult> {
  const { db } = await import("@workspace/db");

  // Fetch the domain_module_id for this claim
  const claimRes = await db.execute(sql`
    SELECT domain_module_id FROM behavioral_claims WHERE id = ${claimId}::uuid LIMIT 1
  `);
  if (claimRes.rows.length === 0) {
    return {
      ok: false,
      reason_code: "missing_knowledge_governance",
      detail: `Claim ${claimId} not found in behavioral_claims — cannot resolve governance context.`,
    };
  }
  const domainModuleId = (claimRes.rows[0] as { domain_module_id: string }).domain_module_id;

  // ── Step 1: Claim-level lookup ─────────────────────────────────────────────
  const claimLevel = await _fetchChainTipContexts(
    "behavioral_claim",
    claimId,
    null,
    evaluationTime,
    db,
  );
  if (claimLevel.error) return claimLevel.error;
  if (claimLevel.rows.length === 1) {
    return _resolvePredicateAndReturn(claimLevel.rows[0], "claim", db);
  }
  // claimLevel.rows.length > 1 → ambiguous (already handled by _fetchChainTipContexts)

  // ── Step 2: Domain-level lookup ────────────────────────────────────────────
  const domainLevel = await _fetchChainTipContexts(
    "domain_module",
    null,
    domainModuleId,
    evaluationTime,
    db,
  );
  if (domainLevel.error) return domainLevel.error;
  if (domainLevel.rows.length === 1) {
    return _resolvePredicateAndReturn(domainLevel.rows[0], "domain", db);
  }

  // ── Step 3: No context found at either level ───────────────────────────────
  return {
    ok: false,
    reason_code: "missing_knowledge_governance",
    detail:
      `No knowledge qualification governance context found for claim ${claimId} ` +
      `(domain_module_id=${domainModuleId}) at evaluation_time=${evaluationTime}. ` +
      `No claim-level context (0 chain-tip rows) and no domain-level context ` +
      `(0 chain-tip rows). A governance context must be seeded before knowledge ` +
      `qualification can proceed.`,
  };
}

// ── Historical replay resolution ───────────────────────────────────────────────

/**
 * Resolve governance context for historical replay by specific ID.
 * Does NOT re-resolve via chain-tip logic — fetches exactly the recorded row.
 * The predicate implementation_key must match.
 */
export async function resolveGovernanceForReplay(params: {
  governanceContextId: string;
  predicateVersionId: string;
}): Promise<GovernanceResolutionResult> {
  const { db } = await import("@workspace/db");

  const govRes = await db.execute(sql`
    SELECT * FROM knowledge_qualification_governance_contexts
    WHERE id = ${params.governanceContextId}::uuid
    LIMIT 1
  `);
  if (govRes.rows.length === 0) {
    return {
      ok: false,
      reason_code: "missing_knowledge_governance",
      detail: `Replay: governance context ${params.governanceContextId} not found.`,
    };
  }
  const governance = govRes.rows[0] as GovernanceRow;

  // Validate predicate
  const predRes = await db.execute(sql`
    SELECT id, implementation_key, version_label
    FROM knowledge_sufficiency_predicate_versions
    WHERE id = ${params.predicateVersionId}::uuid
    LIMIT 1
  `);
  if (predRes.rows.length === 0) {
    return {
      ok: false,
      reason_code: "predicate_version_unavailable",
      detail: `Replay: predicate version ${params.predicateVersionId} not found.`,
    };
  }
  const predicate = predRes.rows[0] as { id: string; implementation_key: string; version_label: string };

  if (governance.knowledge_sufficiency_predicate_version_id !== predicate.id) {
    return {
      ok: false,
      reason_code: "predicate_version_unavailable",
      detail:
        `Replay: governance context ${params.governanceContextId} references predicate ` +
        `${governance.knowledge_sufficiency_predicate_version_id} but replay requested predicate ` +
        `${params.predicateVersionId} — mismatch. Historical replay must use the recorded predicate.`,
    };
  }

  return {
    ok: true,
    governance,
    predicate,
    resolution_level: governance.scope_type === "behavioral_claim" ? "claim" : "domain",
    resolution_note: `Replay resolution: governance=${params.governanceContextId} (${governance.version}), predicate=${predicate.implementation_key} v${predicate.version_label}.`,
  };
}

// ── Internal helpers ───────────────────────────────────────────────────────────

type ChainTipFetchResult = {
  rows: GovernanceRow[];
  error: GovernanceResolutionResult & { ok: false } | null;
};

async function _fetchChainTipContexts(
  scopeType: "behavioral_claim" | "domain_module",
  claimId: string | null,
  domainModuleId: string | null,
  evaluationTime: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
): Promise<ChainTipFetchResult> {
  // Chain-tip: rows in latest_knowledge_qualification_governance_context_v
  // that match scope + effective period.
  // We use the view (which excludes superseded rows) and additionally apply
  // the effective-period filter.
  const result = await db.execute(sql`
    SELECT kqgc.*
    FROM latest_knowledge_qualification_governance_context_v kqgc
    WHERE kqgc.scope_type = ${scopeType}
      AND (
        ${scopeType === "behavioral_claim"
          ? sql`kqgc.claim_id = ${claimId}::uuid`
          : sql`kqgc.domain_module_id = ${domainModuleId}::uuid`}
      )
      AND (kqgc.effective_from IS NULL OR kqgc.effective_from <= ${evaluationTime}::timestamptz)
      AND (kqgc.effective_until IS NULL OR kqgc.effective_until > ${evaluationTime}::timestamptz)
  `);

  const rows = result.rows as GovernanceRow[];

  if (rows.length > 1) {
    // Ambiguous — do NOT pick one. Refuse.
    const ids = rows.map(r => r.id).join(", ");
    logger.warn(
      { scopeType, claimId, domainModuleId, rowCount: rows.length, ids },
      "[Build2A/5/knowledgeGovernanceResolution] Ambiguous governance: multiple chain-tip contexts at same specificity",
    );
    return {
      rows: [],
      error: {
        ok: false,
        reason_code: "ambiguous_knowledge_governance",
        detail:
          `Ambiguous knowledge governance: ${rows.length} chain-tip ` +
          `${scopeType}-level governance contexts exist for ` +
          `${scopeType === "behavioral_claim" ? `claim ${claimId}` : `domain_module ${domainModuleId}`} ` +
          `at evaluation_time=${evaluationTime}. IDs: ${ids}. ` +
          `Cannot arbitrarily select one — governance must be unambiguous. ` +
          `Supersede all but one of the conflicting contexts before retrying.`,
      },
    };
  }

  return { rows, error: null };
}

async function _resolvePredicateAndReturn(
  governance: GovernanceRow,
  level: "claim" | "domain",
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
): Promise<GovernanceResolutionResult> {
  const predRes = await db.execute(sql`
    SELECT id, implementation_key, version_label, is_active, replayable_for_history
    FROM knowledge_sufficiency_predicate_versions
    WHERE id = ${governance.knowledge_sufficiency_predicate_version_id}::uuid
    LIMIT 1
  `);

  if (predRes.rows.length === 0) {
    return {
      ok: false,
      reason_code: "predicate_version_unavailable",
      detail:
        `Governance context ${governance.id} references predicate version ` +
        `${governance.knowledge_sufficiency_predicate_version_id} which does not exist ` +
        `in knowledge_sufficiency_predicate_versions.`,
    };
  }

  const predRow = predRes.rows[0] as {
    id: string;
    implementation_key: string;
    version_label: string;
    is_active: boolean;
    replayable_for_history: boolean;
  };

  if (!predRow.is_active) {
    return {
      ok: false,
      reason_code: "predicate_version_unavailable",
      detail:
        `Predicate version ${predRow.implementation_key} v${predRow.version_label} ` +
        `(id=${predRow.id}) is not active (is_active=false). ` +
        `Only active predicate versions may be used for new qualifications.`,
    };
  }

  logger.debug(
    { governanceId: governance.id, level, predicateKey: predRow.implementation_key },
    "[Build2A/5/knowledgeGovernanceResolution] Governance resolved",
  );

  return {
    ok: true,
    governance,
    predicate: { id: predRow.id, implementation_key: predRow.implementation_key, version_label: predRow.version_label },
    resolution_level: level,
    resolution_note:
      `${level}-level governance resolved: context ${governance.id} ` +
      `(version=${governance.version}, approved by ${governance.approval_authority}), ` +
      `predicate=${predRow.implementation_key} v${predRow.version_label}.`,
  };
}
