/**
 * Build 2A — Reasoning Trace Service (Package 2A-4)
 *
 * Builds the reasoning_traces row that must accompany every Opinion.
 * Trace insertion is part of the same atomic transaction as the Opinion.
 * If trace insertion fails, the transaction is rolled back — NO Opinion
 * without a trace, ever.
 *
 * Responsibilities:
 *   - Synthesise selection_reason (human-readable text, not raw JSON)
 *   - Compute replay_checksum (deterministic hash over key identifiers)
 *   - Record all counts for auditability
 *   - Compute uncertainty_change vs prior opinion (NULL if first)
 *
 * DECISION-SEPARATION: The selection_reason text and all trace fields describe
 * the *reasoning process*, not an outcome or decision.
 */

import { createHash } from "crypto";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PoolClient = any;
import type { SlOpinion } from "./fusionMath.js";
import type { FusionSelectionResult } from "./fusionSelection.js";
import type { BundleContributionRow } from "./bundleAssembly.js";

export const REASONING_VERSION = "sl_opinion_formation_v1";

export type TraceInputs = {
  bundleId: string;
  fusionContextId: string;
  governanceContextId: string;
  versionContextId: string | null;
  evaluationTime: string;
  selection: Extract<FusionSelectionResult, { ok: true }>;
  members: BundleContributionRow[];
  discardedCount: number;
  zeroWeightCount: number;
  fusedOpinion: SlOpinion;
};

/** Compute replay checksum: deterministic SHA-256 over the key record identifiers. */
export function computeReplayChecksum(inputs: {
  bundleId: string;
  fusionContextId: string;
  governanceContextId: string;
  versionContextId: string | null;
  evaluationTime: string;
}): string {
  const payload = JSON.stringify({
    bundle_id: inputs.bundleId,
    fusion_context_id: inputs.fusionContextId,
    governance_context_id: inputs.governanceContextId,
    version_context_id: inputs.versionContextId ?? "null",
    evaluation_time: inputs.evaluationTime,
  });
  return createHash("sha256").update(payload).digest("hex");
}

/** Build the human-readable selection_reason string. */
export function buildSelectionReason(
  selection: Extract<FusionSelectionResult, { ok: true }>,
  memberCount: number,
): string {
  const parts: string[] = [];

  // Base operator
  if (selection.selectedOperator === "cumulative") {
    parts.push(`Cumulative operator selected: all ${memberCount} evidence atom(s) declared independent.`);
  } else if (selection.selectedOperator === "averaging" && !selection.reroutedToConsensusCompromise) {
    parts.push(
      `Averaging operator selected: ${memberCount} evidence atom(s) include ` +
      (selection.unknownDependenceFallbackApplied
        ? "unspecified dependence declarations (fallback to averaging per spec)."
        : "one or more atoms with dependent declaration."),
    );
  } else if (selection.selectedOperator === "consensus_compromise") {
    parts.push(
      `Consensus & Compromise operator selected: max pairwise conflict ` +
      `${(selection.conflictMeasure ?? 0).toFixed(6)} exceeded governance threshold ` +
      `${selection.conflictThreshold.toFixed(4)} ` +
      `(governance scope: ${selection.governanceContext.scope_type}).`,
    );
  }

  // Conflict detail
  if (selection.conflictMeasure !== null) {
    parts.push(`Conflict measure: ${selection.conflictMeasure.toFixed(6)} (threshold: ${selection.conflictThreshold.toFixed(4)}).`);
  }

  // Unknown dependence fallback
  if (selection.unknownDependenceFallbackApplied) {
    parts.push("One or more atoms had unspecified dependence; averaging fallback applied per sl_opinion_formation_v1.");
  }

  // Governance source
  parts.push(`Governance context ${selection.governanceContext.id} (${selection.governanceContext.scope_type}) resolved without invention.`);

  return parts.join(" ");
}

/**
 * Fetch prior opinion uncertainty for this claim (to compute uncertainty_change).
 * Returns null if no prior opinion exists.
 */
export async function fetchPriorUncertainty(
  client: PoolClient,
  claimId: string,
  currentOpinionId: string | null,
): Promise<number | null> {
  const res = await client.query(
    `SELECT o.uncertainty::text
     FROM latest_opinion_v o
     WHERE o.claim_id = $1::uuid
       AND ($2::uuid IS NULL OR o.id <> $2::uuid)
     ORDER BY o.evaluation_time DESC
     LIMIT 1`,
    [claimId, currentOpinionId],
  );
  if (res.rows.length === 0) return null;
  return parseFloat((res.rows[0] as { uncertainty: string }).uncertainty);
}

/**
 * Insert the reasoning_trace row within the active transaction.
 * If this INSERT fails, the caller must let the exception propagate to roll back.
 */
export async function insertReasoningTrace(
  client: PoolClient,
  opinionId: string,
  inputs: TraceInputs,
): Promise<string> {
  const independentCount = inputs.members.filter(
    m => m.dependence_declaration === "independent",
  ).length;
  const dependentCount = inputs.members.filter(
    m => m.dependence_declaration === "dependent",
  ).length;

  const checksum = computeReplayChecksum({
    bundleId: inputs.bundleId,
    fusionContextId: inputs.fusionContextId,
    governanceContextId: inputs.governanceContextId,
    versionContextId: inputs.versionContextId,
    evaluationTime: inputs.evaluationTime,
  });

  const selectionReason = buildSelectionReason(
    inputs.selection,
    inputs.members.length,
  );

  // uncertainty_change is computed by the caller (opinionPersistence.ts)
  // and passed in via uncertaintyChange param. Set null here as a default.
  // The caller should use the direct SQL path in opinionPersistence.ts for full control.
  const dependenceAssessment: Record<string, unknown> = {
    atom_declarations: inputs.selection.dependenceSummary,
    independent_count: independentCount,
    dependent_count: dependentCount,
    unspecified_count: inputs.members.length - independentCount - dependentCount,
    unknown_fallback_applied: inputs.selection.unknownDependenceFallbackApplied,
  };

  const res = await client.query(
    `INSERT INTO reasoning_traces
       (opinion_id, reasoning_version, fusion_operator_selected, selection_reason,
        conflict_measurement, dependence_assessment,
        independent_contribution_count, dependent_contribution_count,
        discarded_contribution_count, zero_weight_contribution_count,
        uncertainty_change, replay_checksum)
     VALUES ($1::uuid, $2, $3, $4,
             $5, $6::jsonb,
             $7, $8,
             $9, $10,
             $11, $12)
     RETURNING id`,
    [
      opinionId,
      REASONING_VERSION,
      inputs.selection.selectedOperator,
      selectionReason,
      inputs.selection.conflictMeasure,
      JSON.stringify(dependenceAssessment),
      independentCount,
      dependentCount,
      inputs.discardedCount,
      inputs.zeroWeightCount,
      null, // uncertainty_change — set by caller (see opinionPersistence.ts direct SQL path)
      checksum,
    ],
  );
  return (res.rows[0] as { id: string }).id;
}
