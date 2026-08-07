/**
 * Build 2A — Fusion Selection Service (Package 2A-4)
 *
 * Resolves the governance context and selects the fusion operator for a claim.
 *
 * Operator selection rules (from sl_opinion_formation_v1):
 *   1. If ALL atoms declare 'independent'  → cumulative
 *   2. If any atom declares 'dependent'    → averaging
 *   3. If any atom declares 'unspecified'  → averaging (flagged: unknown_dependence_fallback_applied=true)
 *   4. After operator selection, compute conflict:
 *      If max consecutive pairwise conflict > resolved governance threshold →
 *        reroute to consensus_compromise (flagged: rerouted_to_consensus_compromise=true)
 *
 * Governance resolution (HALT on missing):
 *   1. Look for claim-level row (scope_type='behavioral_claim' matching claim_id).
 *   2. If not found: look for domain-level row (scope_type='domain_module' matching claim's domain_module_id).
 *   3. Neither found → HALT: refusal 'missing_conflict_threshold_governance'.
 *   NEVER invent a threshold. Always read from the governance row.
 *
 * Called within the outer atomic transaction.
 *
 * DECISION-SEPARATION: No outcome-determination logic. Operator selection is
 * a mathematical/methodological choice, not a credit or risk decision.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PoolClient = any;
import {
  dispositionToSlOpinion,
  maxConsecutivePairwiseConflict,
} from "./fusionMath.js";
import type { BundleContributionRow } from "./bundleAssembly.js";

export type GovernanceContextRow = {
  id: string;
  scope_type: string;
  conflict_threshold: string;
  conflict_metric_definition: string;
  fusion_operator_version_id: string;
};

export type FusionSelectionResult =
  | {
      ok: true;
      selectedOperator: "cumulative" | "averaging" | "consensus_compromise";
      governanceContext: GovernanceContextRow;
      conflictMeasure: number | null;
      conflictThreshold: number;
      reroutedToConsensusCompromise: boolean;
      unknownDependenceFallbackApplied: boolean;
      dependenceSummary: Record<string, string>;
    }
  | {
      ok: false;
      reason_code: "missing_conflict_threshold_governance";
      detail: string;
    };

/**
 * Resolve governance context and select fusion operator.
 *
 * @param client  - active pool client in a BEGIN'd transaction
 * @param claimId - behavioral claim being fused
 * @param members - ordered bundle members with disposition/dependence info
 */
export async function selectFusionOperator(
  client: PoolClient,
  claimId: string,
  members: BundleContributionRow[],
): Promise<FusionSelectionResult> {

  // ── Step 1: resolve governance context ────────────────────────────────────
  // Try claim-level first, then domain-level. Use latest_fusion_governance_context_v
  // (non-superseded rows only).

  // Claim-level
  let govRes = await client.query(
    `SELECT fgc.id, fgc.scope_type, fgc.conflict_threshold::text,
            fgc.conflict_metric_definition, fgc.fusion_operator_version_id::text
     FROM latest_fusion_governance_context_v fgc
     WHERE fgc.scope_type = 'behavioral_claim'
       AND fgc.claim_id = $1::uuid
       AND (fgc.effective_from IS NULL OR fgc.effective_from <= NOW())
       AND (fgc.effective_until IS NULL OR fgc.effective_until > NOW())
     LIMIT 1`,
    [claimId],
  );

  if (govRes.rows.length === 0) {
    // Domain-level fallback: find the domain_module_id for this claim
    const domainRes = await client.query(
      `SELECT domain_module_id::text FROM behavioral_claims WHERE id = $1::uuid`,
      [claimId],
    );
    const domainModuleId = (domainRes.rows[0] as { domain_module_id: string } | undefined)?.domain_module_id;

    if (domainModuleId) {
      govRes = await client.query(
        `SELECT fgc.id, fgc.scope_type, fgc.conflict_threshold::text,
                fgc.conflict_metric_definition, fgc.fusion_operator_version_id::text
         FROM latest_fusion_governance_context_v fgc
         WHERE fgc.scope_type = 'domain_module'
           AND fgc.domain_module_id = $1::uuid
           AND (fgc.effective_from IS NULL OR fgc.effective_from <= NOW())
           AND (fgc.effective_until IS NULL OR fgc.effective_until > NOW())
         LIMIT 1`,
        [domainModuleId],
      );
    }
  }

  if (govRes.rows.length === 0) {
    // Neither claim-level nor domain-level governance found. HALT.
    return {
      ok: false,
      reason_code: "missing_conflict_threshold_governance",
      detail:
        `No fusion governance context found for claim ${claimId}. ` +
        "A domain-level or claim-level fusion_governance_contexts row is required. " +
        "The threshold cannot be invented at runtime.",
    };
  }

  const gov = govRes.rows[0] as GovernanceContextRow;
  const conflictThreshold = parseFloat(gov.conflict_threshold);

  // ── Step 2: dependence-based operator selection ───────────────────────────
  const dependenceSummary: Record<string, string> = {};
  for (const m of members) {
    dependenceSummary[m.atom_id] = m.dependence_declaration;
  }

  const declarations = members.map(m => m.dependence_declaration);
  const hasDependent   = declarations.some(d => d === "dependent");
  const hasUnspecified = declarations.some(d => d === "unspecified");
  const allIndependent = declarations.every(d => d === "independent");

  let unknownFallback = false;
  let baseOperator: "cumulative" | "averaging" = "cumulative";

  if (allIndependent) {
    baseOperator = "cumulative";
  } else if (hasDependent || hasUnspecified) {
    baseOperator = "averaging";
    if (hasUnspecified && !hasDependent) unknownFallback = true;
  }

  // ── Step 3: conflict measurement ──────────────────────────────────────────
  // Convert each member to SL opinion (in sequence_number order = current order).
  const slOpinions = members.map(m =>
    dispositionToSlOpinion(m.disposition, parseFloat(m.final_effective_weight)),
  );

  let conflictMeasure: number | null = null;
  let reroutedToCC = false;
  let selectedOperator: "cumulative" | "averaging" | "consensus_compromise" = baseOperator;

  if (members.length >= 2) {
    conflictMeasure = maxConsecutivePairwiseConflict(slOpinions);
    if (conflictMeasure > conflictThreshold) {
      selectedOperator = "consensus_compromise";
      reroutedToCC = true;
    }
  }

  return {
    ok: true,
    selectedOperator,
    governanceContext: gov,
    conflictMeasure,
    conflictThreshold,
    reroutedToConsensusCompromise: reroutedToCC,
    unknownDependenceFallbackApplied: unknownFallback,
    dependenceSummary,
  };
}
