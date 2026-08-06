/**
 * Build 2A — Interpretation Service (Package 2A-2)
 *
 * Deterministic interpretation of evidence observations against Behavioral Claims.
 *
 * Rules:
 *   - Dispatches through versionDispatch.ts — never hard-codes current behavior
 *     outside a registered implementation key.
 *   - Unknown or unavailable keys always produce a refusal result (never a silent fallback).
 *   - The same inputs + rule version always produce the same disposition (pure function).
 *   - Does NOT depend on current unstored application state or nondeterministic output.
 *   - environment_context captures all observation data needed for replay — callers
 *     must not pass raw PII or raw message content.
 *
 * Approved Package 2A-2 implementation key:
 *   task_completion_v1 — interprets a single resolved agent_task_outcomes record.
 *     supports:    outcome_status in ('completed', 'objective_completed')
 *     contradicts: outcome_status in ('failed', 'objective_failed', 'actor_abandonment')
 *     excluded:    outcome_status in ('system_error', 'infrastructure_failure', 'timeout', 'technical_error')
 *                  OR failure_class indicates infrastructure/system (actor responsibility unclear)
 *     ambiguous:   anything else
 */

import { resolveImplementationKey } from "./versionDispatch.js";
import { logger } from "../../lib/logger.js";

export type Disposition = "supports" | "contradicts" | "neutral" | "ambiguous" | "excluded";
export type DependenceDeclaration = "independent" | "dependent" | "unspecified";

export type ObservationInput = {
  /** Sequence position in the cluster (1-based). */
  sequence_position: number;
  /** The immutable key of the source from evidence_source_registry. */
  source_key: string;
  /** The natural key of the source record (e.g. outcome UUID). */
  source_record_key: string;
  /** Source row data, pre-read before calling interpret(). Never contains raw PII. */
  source_data: Record<string, unknown>;
};

export type InterpretationInput = {
  /** The registered implementation key to dispatch to. */
  implementationKey: string;
  /** The UUID of the matching interpretation_rule_versions row. */
  ruleVersionId: string;
  /** Observations in the cluster, sorted by sequence_position before passing. */
  observations: ObservationInput[];
  /** Minimal claim context (no PII). */
  claim: {
    id: string;
    primitive_name: string;
    domain_slug: string;
    window_start: string;
    window_end: string;
    falsifiability_condition: string;
  };
  /** ISO timestamp captured at interpretation time (deterministic for replay). */
  interpreted_at: string;
};

export type InterpretationSuccess = {
  refused: false;
  disposition: Disposition;
  dependence_declaration: DependenceDeclaration;
  /**
   * Captured context sufficient for replay. Must NOT include raw PII or message content.
   * Callers must ensure source_data passed to interpret() is already sanitized.
   */
  environment_context: Record<string, unknown>;
  interpretation_note: string;
};

export type InterpretationRefusal = {
  refused: true;
  reason_code:
    | "invalid_or_unavailable_version"
    | "ambiguous_interpretation"
    | "prohibited_inference"
    | "processing_failure";
  detail: string;
};

export type InterpretationResult = InterpretationSuccess | InterpretationRefusal;

/**
 * Interpret the observations in a sealed cluster against the given rule version.
 *
 * Dispatches through the versionDispatch registry. Unknown or inactive-non-replayable
 * keys produce a refusal; the caller should record a refusal_record.
 */
export async function interpret(
  input: InterpretationInput,
): Promise<InterpretationResult> {
  // Resolve the implementation key through the version dispatch registry.
  // Never substitute the "current active" key for a historical key.
  const dispatch = await resolveImplementationKey(
    input.implementationKey,
    "interpretation_rule_versions",
  );

  if (!dispatch.found) {
    logger.warn(
      { implementationKey: input.implementationKey },
      "[Build2A/interpretation] implementation_key UNKNOWN — refusing",
    );
    return {
      refused: true,
      reason_code: "invalid_or_unavailable_version",
      detail: `Implementation key '${input.implementationKey}' is not registered in interpretation_rule_versions. ${dispatch.resolution_note}`,
    };
  }

  if (!dispatch.usable_for_historical_replay) {
    logger.warn(
      { implementationKey: input.implementationKey, state: dispatch.state },
      "[Build2A/interpretation] implementation_key KNOWN_INACTIVE and not replayable — refusing",
    );
    return {
      refused: true,
      reason_code: "invalid_or_unavailable_version",
      detail: `Implementation key '${input.implementationKey}' exists but is inactive and not marked replayable_for_history. ${dispatch.resolution_note}`,
    };
  }

  // Dispatch to the versioned implementation
  switch (input.implementationKey) {
    case "task_completion_v1":
      return interpretTaskCompletionV1(input, dispatch.row.id);
    default:
      // Key is registered but no TypeScript implementation exists yet.
      // This should not happen for approved keys.
      logger.error(
        { implementationKey: input.implementationKey },
        "[Build2A/interpretation] no TypeScript implementation for registered key",
      );
      return {
        refused: true,
        reason_code: "invalid_or_unavailable_version",
        detail: `Implementation key '${input.implementationKey}' is registered but has no active TypeScript implementation in interpretation.ts. Add a case to the dispatch switch.`,
      };
  }
}

// ── task_completion_v1 implementation ─────────────────────────────────────────
// Pure deterministic function: same inputs always produce the same disposition.
// Outcome_status drives the primary logic; failure_class refines 'failed' cases.

function interpretTaskCompletionV1(
  input: InterpretationInput,
  resolvedRuleVersionId: string,
): InterpretationResult {
  // Validate cluster structure: exactly 1 observation required
  if (input.observations.length !== 1) {
    return {
      refused: true,
      reason_code: "processing_failure",
      detail: `task_completion_v1 requires exactly 1 observation (agent_task_outcomes); received ${input.observations.length}.`,
    };
  }

  const obs = input.observations[0]!;
  if (obs.source_key !== "agent_task_outcomes") {
    return {
      refused: true,
      reason_code: "prohibited_inference",
      detail: `task_completion_v1 requires source_key='agent_task_outcomes'; received '${obs.source_key}'.`,
    };
  }

  const data = obs.source_data;
  const outcomeStatus = String(data["outcome_status"] ?? "").toLowerCase();
  const failureClass  = data["failure_class"] != null ? String(data["failure_class"]).toLowerCase() : null;

  // System / infrastructure failure classes — actor responsibility cannot be established
  const SYSTEM_FAILURE_CLASSES = new Set([
    "system_error", "infrastructure_failure", "timeout",
    "technical_error", "infrastructure", "system",
  ]);

  let disposition: Disposition;
  let note: string;

  if (outcomeStatus === "completed" || outcomeStatus === "objective_completed") {
    disposition = "supports";
    note = `outcome_status='${outcomeStatus}' → supports agent_guided_task_completion claim`;
  } else if (
    outcomeStatus === "system_error" ||
    outcomeStatus === "infrastructure_failure" ||
    outcomeStatus === "timeout" ||
    outcomeStatus === "technical_error"
  ) {
    // Top-level system failure: actor responsibility cannot be established
    disposition = "excluded";
    note = `outcome_status='${outcomeStatus}' indicates system/infrastructure failure — actor responsibility cannot be established; excluded from behavioral inference`;
  } else if (
    outcomeStatus === "failed" ||
    outcomeStatus === "objective_failed" ||
    outcomeStatus === "actor_abandonment"
  ) {
    // Failed — refine by failure_class
    if (failureClass !== null && SYSTEM_FAILURE_CLASSES.has(failureClass)) {
      disposition = "excluded";
      note = `outcome_status='${outcomeStatus}' with failure_class='${failureClass}' — system/infrastructure cause; actor responsibility cannot be established; excluded`;
    } else if (failureClass === "ambiguous") {
      disposition = "ambiguous";
      note = `outcome_status='${outcomeStatus}' with failure_class='ambiguous' — responsibility undetermined`;
    } else {
      // Actor-attributable failure (failure_class=null, 'actor_error', 'actor_abandonment', etc.)
      disposition = "contradicts";
      note = `outcome_status='${outcomeStatus}' (failure_class=${failureClass ?? 'null'}) — actor-attributable; contradicts agent_guided_task_completion claim`;
    }
  } else {
    disposition = "ambiguous";
    note = `outcome_status='${outcomeStatus}' does not map to a definitive disposition under task_completion_v1; ambiguous`;
  }

  // Capture environment_context for replay.
  // Includes only operational fields — no raw PII, no raw message content.
  const environment_context: Record<string, unknown> = {
    rule_applied: "task_completion_v1",
    rule_version_id: resolvedRuleVersionId,
    source_key: obs.source_key,
    source_record_key: obs.source_record_key,
    outcome_status: data["outcome_status"],
    failure_class: data["failure_class"] ?? null,
    source_attribution: data["source_attribution"] ?? null,
    resolved_at: data["resolved_at"] ?? null,
    task_id: data["task_id"] ?? null,
    interpreted_at: input.interpreted_at,
    disposition_note: note,
  };

  logger.debug(
    { claimId: input.claim.id, disposition, outcomeStatus },
    "[Build2A/interpretation] task_completion_v1 complete",
  );

  return {
    refused: false,
    disposition,
    dependence_declaration: "independent",
    environment_context,
    interpretation_note: note,
  };
}
