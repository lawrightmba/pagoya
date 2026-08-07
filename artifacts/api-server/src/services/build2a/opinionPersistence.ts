/**
 * Build 2A — Opinion Persistence Service (Package 2A-4)
 *
 * Main orchestrator for opinion formation. Executes the full pipeline atomically:
 *
 *   assemble bundle → check base rate → resolve governance → select operator →
 *   compute fusion math → validate invariant → persist opinion → persist trace → commit
 *
 * Atomicity contract:
 *   ALL of the following succeed together or the entire transaction is rolled back:
 *     - evidence_bundle
 *     - evidence_bundle_members
 *     - fusion_contexts
 *     - opinions
 *     - reasoning_traces
 *   On any failure: rollback → single refusal_records row → ledger update.
 *   No Opinion can exist without its Reasoning Trace. Ever.
 *
 * STOP-condition mapping:
 *   missing_base_rate                     — refusal before Opinion computed
 *   missing_conflict_threshold_governance — refusal before Opinion computed
 *   invalid_or_unavailable_version        — refusal at dispatch time
 *   bundle_construction_failed            — refusal after failed bundle assembly
 *   invalid_opinion_computed              — refusal after SL invariant check
 *
 * DECISION-SEPARATION: No outcome-determination or authority logic.
 * Outputs are SL masses and projected probability only.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PoolClient = any;
import { logger } from "../../lib/logger.js";
import {
  dispositionToSlOpinion,
  foldOpinions,
  validateSlInvariant,
  slBinomialProjection,
  r4,
} from "./fusionMath.js";
import {
  assembleBundleInTxn,
  type BundleContributionRow,
} from "./bundleAssembly.js";
import { selectFusionOperator } from "./fusionSelection.js";
import {
  fetchPriorUncertainty,
  computeReplayChecksum,
  buildSelectionReason,
  REASONING_VERSION,
} from "./reasoningTraces.js";

// ── Types ──────────────────────────────────────────────────────────────────────

/** Internal pipeline result — no refusal_id (that's added by the caller after rollback). */
type PipelineResult =
  | {
      ok: true;
      opinionId: string;
      traceId: string;
      bundleId: string;
      fusionContextId: string;
      belief: number;
      disbelief: number;
      uncertainty: number;
      projectedProbability: number;
      operatorUsed: string;
      memberCount: number;
      discardedCount: number;
      zeroWeightCount: number;
    }
  | {
      ok: false;
      reason_code: string;
      detail: string;
    };

// ── Public API ─────────────────────────────────────────────────────────────────

export type OpinionFormationResult =
  | {
      ok: true;
      opinionId: string;
      traceId: string;
      bundleId: string;
      fusionContextId: string;
      belief: number;
      disbelief: number;
      uncertainty: number;
      projectedProbability: number;
      operatorUsed: string;
      memberCount: number;
      discardedCount: number;
      zeroWeightCount: number;
    }
  | {
      ok: false;
      reason_code: string;
      detail: string;
      refusal_id: string | null;
    };

export type FormOpinionParams = {
  claimId: string;
  fusionOperatorVersionId: string;
  versionContextId?: string | null;
  ledgerId?: string | null;
};

/**
 * Form an opinion for a behavioral claim. Called by the poller or directly (canary).
 *
 * Acquires a fresh pool connection, runs the full pipeline in one transaction,
 * commits on success, or rolls back and records a refusal on any failure.
 *
 * @param params - claim + operator version (+ optional version context + ledger row id)
 */
export async function formOpinion(
  params: FormOpinionParams,
): Promise<OpinionFormationResult> {
  const { pool } = await import("@workspace/db");
  const client = await pool.connect();
  let committed = false;

  try {
    await client.query("BEGIN");

    const result = await _runOpinionPipeline(client, params);

    if (result.ok) {
      await client.query("COMMIT");
      committed = true;
    } else {
      await client.query("ROLLBACK");
      // Record refusal in a separate transaction (the main one rolled back)
      const refusedId = await _recordRefusal(
        params.claimId,
        result.reason_code,
        result.detail,
        params.ledgerId ?? null,
      );
      return { ...result, refusal_id: refusedId };
    }

    return result;
  } catch (err) {
    if (!committed) {
      await client.query("ROLLBACK").catch(() => {});
    }
    const detail = err instanceof Error ? err.message : String(err);
    logger.error({ err, claimId: params.claimId }, "[Build2A/4] formOpinion unexpected error — rolled back");
    const refusedId = await _recordRefusal(
      params.claimId,
      "bundle_construction_failed",
      `Unexpected error during opinion formation: ${detail}`,
      params.ledgerId ?? null,
    );
    return {
      ok: false,
      reason_code: "bundle_construction_failed",
      detail,
      refusal_id: refusedId,
    };
  } finally {
    client.release();
  }
}

// ── Pipeline ───────────────────────────────────────────────────────────────────

async function _runOpinionPipeline(
  client: PoolClient,
  params: FormOpinionParams,
): Promise<PipelineResult> {
  const { claimId, fusionOperatorVersionId, versionContextId = null } = params;
  const evaluationTime = new Date().toISOString();

  // ── Step 1: Validate fusion_operator_versions row is active ──────────────
  const opVerRes = await client.query(
    `SELECT id, implementation_key, is_active
     FROM fusion_operator_versions
     WHERE id = $1::uuid LIMIT 1`,
    [fusionOperatorVersionId],
  );
  const opVerRow = opVerRes.rows[0] as { id: string; is_active: boolean } | undefined;
  if (!opVerRow || !opVerRow.is_active) {
    return {
      ok: false,
      reason_code: "invalid_or_unavailable_version",
      detail: `fusion_operator_versions row ${fusionOperatorVersionId} not found or is_active=false.`,
    };
  }

  // ── Step 2: Assemble the evidence bundle ─────────────────────────────────
  const bundleResult = await assembleBundleInTxn(
    client,
    claimId,
    fusionOperatorVersionId,
    evaluationTime,
    null,
  );
  if (!bundleResult.ok) {
    return {
      ok: false,
      reason_code: bundleResult.reason_code,
      detail: bundleResult.detail,
    };
  }
  const { bundleId, members, discardedCount, zeroWeightCount } = bundleResult;

  // ── Step 3: Resolve base rate ─────────────────────────────────────────────
  // Priority: version_context.base_rate_record_id if provided, else domain-scope lookup.
  const baseRateResult = await _resolveBaseRate(client, claimId, versionContextId);
  if (!baseRateResult.ok) {
    return {
      ok: false,
      reason_code: baseRateResult.reason_code,
      detail: baseRateResult.detail,
    };
  }
  const { baseRateRecordId, baseRateValue } = baseRateResult;

  // ── Step 4: Resolve resolved version context (if not provided) ───────────
  const resolvedVersionContextId = await _resolveVersionContext(
    client,
    versionContextId,
  );

  // ── Step 5: Select fusion operator + resolve governance ──────────────────
  const selection = await selectFusionOperator(client, claimId, members);
  if (!selection.ok) {
    return {
      ok: false,
      reason_code: selection.reason_code,
      detail: selection.detail,
    };
  }

  // ── Step 6: Convert atoms to SL opinions and fold ────────────────────────
  const slOpinions = members.map(m =>
    dispositionToSlOpinion(m.disposition, parseFloat(m.final_effective_weight)),
  );
  const fusedOpinion = foldOpinions(slOpinions, selection.selectedOperator);

  // ── Step 7: Validate SL invariant ────────────────────────────────────────
  if (!validateSlInvariant(fusedOpinion)) {
    const sum = fusedOpinion.belief + fusedOpinion.disbelief + fusedOpinion.uncertainty;
    return {
      ok: false,
      reason_code: "invalid_opinion_computed",
      detail: `SL invariant violated: b+d+u=${sum.toFixed(6)} (expected 1.0 ± 0.0001) for claim ${claimId}.`,
    };
  }

  const projectedProbability = slBinomialProjection(fusedOpinion, baseRateValue);

  // ── Step 8: INSERT fusion_contexts ───────────────────────────────────────
  const fcRes = await client.query(
    `INSERT INTO fusion_contexts
       (bundle_id, selected_operator, selection_rule_version_id,
        governance_context_id, dependence_declarations_summary,
        unknown_dependence_fallback_applied, conflict_measure,
        conflict_threshold, rerouted_to_consensus_compromise,
        operator_parameters, version_context_id)
     VALUES ($1::uuid, $2, $3::uuid, $4::uuid, $5::jsonb, $6, $7, $8, $9, $10::jsonb, $11::uuid)
     RETURNING id`,
    [
      bundleId,
      selection.selectedOperator,
      selection.governanceContext.fusion_operator_version_id,
      selection.governanceContext.id,
      JSON.stringify(selection.dependenceSummary),
      selection.unknownDependenceFallbackApplied,
      selection.conflictMeasure,
      selection.conflictThreshold,
      selection.reroutedToConsensusCompromise,
      JSON.stringify({ operator: selection.selectedOperator, ordering_rule: "sequence_number ASC" }),
      resolvedVersionContextId,
    ],
  );
  const fusionContextId = (fcRes.rows[0] as { id: string }).id;

  // ── Step 8.5: Look up prior opinion for supersession tracking ────────────
  // latest_opinion_v shows only non-superseded opinions. If one exists for this
  // claim at this point in the transaction (before we insert the new opinion),
  // the new opinion will reference it as its predecessor via the supersedes column.
  // This runs inside the active transaction: the new opinion has not been inserted
  // yet, so latest_opinion_v still shows the current chain tip if one exists.
  const priorOpRes = await client.query(
    `SELECT id FROM latest_opinion_v
     WHERE claim_id = $1::uuid
     ORDER BY evaluation_time DESC
     LIMIT 1`,
    [claimId],
  );
  const priorOpinionId =
    (priorOpRes.rows[0] as { id: string } | undefined)?.id ?? null;

  // ── Step 9: INSERT opinions ───────────────────────────────────────────────
  // Rounding normalization: r4 applied independently to belief and disbelief
  // can produce a "halfway" case where both round up (e.g. 0.68265→0.6827,
  // 0.31735→0.3174 → sum 1.0001) which violates the DB CHECK < 0.0001.
  // Uncertainty is derived as 1 - beliefR - disbeliefR so the three stored
  // values always sum to exactly 1.0. Step 7's SL invariant check used the
  // unrounded values and already verified them valid before we reach this.
  const beliefR      = r4(fusedOpinion.belief);
  const disbeliefR   = r4(fusedOpinion.disbelief);
  const uncertaintyR = r4(Math.max(0, Math.min(1, 1.0 - beliefR - disbeliefR)));

  const opRes = await client.query(
    `INSERT INTO opinions
       (claim_id, evidence_bundle_id, fusion_context_id,
        belief, disbelief, uncertainty,
        base_rate, base_rate_record_id,
        mathematical_validity_status, evaluation_time,
        version_context_id, supersedes)
     VALUES ($1::uuid, $2::uuid, $3::uuid,
             $4, $5, $6,
             $7, $8::uuid,
             $9, $10::timestamptz,
             $11::uuid, $12::uuid)
     RETURNING id`,
    [
      claimId,
      bundleId,
      fusionContextId,
      beliefR,
      disbeliefR,
      uncertaintyR,
      r4(baseRateValue),
      baseRateRecordId,
      "valid|invariant_check_passed",
      evaluationTime,
      resolvedVersionContextId,
      priorOpinionId,
    ],
  );
  const opinionId = (opRes.rows[0] as { id: string }).id;

  // ── Step 10: Fetch prior uncertainty for uncertainty_change ──────────────
  const priorUncertainty = await fetchPriorUncertainty(client, claimId, opinionId);
  const uncertaintyChange =
    priorUncertainty !== null
      ? r4(fusedOpinion.uncertainty - priorUncertainty)
      : null;

  // ── Step 11: INSERT reasoning_trace (MUST succeed or whole tx rolls back) ─
  const replayChecksum = computeReplayChecksum({
    bundleId,
    fusionContextId,
    governanceContextId: selection.governanceContext.id,
    versionContextId: resolvedVersionContextId,
    evaluationTime,
  });
  const selectionReason = buildSelectionReason(selection, members.length);

  const independentCount = members.filter(m => m.dependence_declaration === "independent").length;
  const dependentCount   = members.filter(m => m.dependence_declaration === "dependent").length;
  const dependenceAssessment = {
    atom_declarations: selection.dependenceSummary,
    independent_count: independentCount,
    dependent_count: dependentCount,
    unspecified_count: members.length - independentCount - dependentCount,
    unknown_fallback_applied: selection.unknownDependenceFallbackApplied,
  };

  const traceRes = await client.query(
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
      selection.selectedOperator,
      selectionReason,
      selection.conflictMeasure,
      JSON.stringify(dependenceAssessment),
      independentCount,
      dependentCount,
      discardedCount,
      zeroWeightCount,
      uncertaintyChange,
      replayChecksum,
    ],
  );
  const traceId = (traceRes.rows[0] as { id: string }).id;

  logger.info(
    { claimId, opinionId, traceId, bundleId, fusionContextId,
      operator: selection.selectedOperator,
      belief: r4(fusedOpinion.belief),
      disbelief: r4(fusedOpinion.disbelief),
      uncertainty: r4(fusedOpinion.uncertainty),
    },
    "[Build2A/4] Opinion formed and persisted",
  );

  return {
    ok: true,
    opinionId,
    traceId,
    bundleId,
    fusionContextId,
    belief:               r4(fusedOpinion.belief),
    disbelief:            r4(fusedOpinion.disbelief),
    uncertainty:          r4(fusedOpinion.uncertainty),
    projectedProbability: r4(projectedProbability),
    operatorUsed:         selection.selectedOperator,
    memberCount:          members.length,
    discardedCount,
    zeroWeightCount,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

type BaseRateResolution =
  | { ok: true; baseRateRecordId: string; baseRateValue: number }
  | { ok: false; reason_code: "missing_base_rate"; detail: string };

async function _resolveBaseRate(
  client: PoolClient,
  claimId: string,
  versionContextId: string | null | undefined,
): Promise<BaseRateResolution> {
  // Prefer version_context.base_rate_record_id
  if (versionContextId) {
    const vcRes = await client.query(
      `SELECT base_rate_record_id::text FROM version_contexts WHERE id = $1::uuid LIMIT 1`,
      [versionContextId],
    );
    const brrId = (vcRes.rows[0] as { base_rate_record_id: string } | undefined)?.base_rate_record_id;
    if (brrId) {
      const brrRes = await client.query(
        `SELECT id::text, value::text, sufficiency_status FROM base_rate_records WHERE id = $1::uuid LIMIT 1`,
        [brrId],
      );
      const brr = brrRes.rows[0] as { id: string; value: string; sufficiency_status: string } | undefined;
      if (brr && brr.value !== null && brr.sufficiency_status !== "provisional_unknown") {
        return { ok: true, baseRateRecordId: brr.id, baseRateValue: parseFloat(brr.value) };
      }
    }
  }

  // Fallback: find a sufficient base rate for the domain module's scope
  const domainRes = await client.query(
    `SELECT dm.slug FROM behavioral_claims bc
     JOIN domain_modules dm ON dm.id = bc.domain_module_id
     WHERE bc.id = $1::uuid LIMIT 1`,
    [claimId],
  );
  const domainSlug = (domainRes.rows[0] as { slug: string } | undefined)?.slug;

  if (domainSlug) {
    const brrRes = await client.query(
      `SELECT id::text, value::text
       FROM latest_base_rate_record_v
       WHERE scope = $1
         AND sufficiency_status <> 'provisional_unknown'
         AND value IS NOT NULL
       ORDER BY effective_from DESC NULLS LAST
       LIMIT 1`,
      [`2a4_${domainSlug}`],
    );
    const brr = brrRes.rows[0] as { id: string; value: string } | undefined;
    if (brr) {
      return { ok: true, baseRateRecordId: brr.id, baseRateValue: parseFloat(brr.value) };
    }
  }

  return {
    ok: false,
    reason_code: "missing_base_rate",
    detail:
      `No sufficient base_rate_records row found for claim ${claimId} ` +
      `(domain slug: ${domainSlug ?? "unknown"}). ` +
      "A base rate with value IS NOT NULL and sufficiency_status != 'provisional_unknown' is required. " +
      "Provisional-unknown base rates halt opinion formation.",
  };
}

async function _resolveVersionContext(
  client: PoolClient,
  versionContextId: string | null | undefined,
): Promise<string | null> {
  if (versionContextId) return versionContextId;
  // Try to find the seeded 2A-4 version context
  const res = await client.query(
    `SELECT id::text FROM version_contexts WHERE label = 'version_context_2a4_v1' LIMIT 1`,
  );
  return (res.rows[0] as { id: string } | undefined)?.id ?? null;
}

async function _recordRefusal(
  claimId: string,
  reasonCode: string,
  detail: string,
  ledgerId: string | null,
): Promise<string | null> {
  try {
    const { pool } = await import("@workspace/db");
    const client = await pool.connect();
    try {
      const res = await client.query(
        `INSERT INTO refusal_records
           (refusal_stage, reason_code, detail)
         VALUES ('fusion', $1, $2)
         RETURNING id`,
        [reasonCode, `[claim:${claimId}] ${detail}`],
      );
      const refusedId = (res.rows[0] as { id: string } | undefined)?.id ?? null;

      if (ledgerId && refusedId) {
        await client.query(
          `UPDATE opinion_formation_ledger
           SET status = 'refused', completed_at = NOW(),
               resulting_refusal_id = $1::uuid,
               errors = errors || $2::jsonb
           WHERE id = $3::uuid`,
          [
            refusedId,
            JSON.stringify([{ reason_code: reasonCode, detail, at: new Date().toISOString() }]),
            ledgerId,
          ],
        );
      }

      return refusedId;
    } finally {
      client.release();
    }
  } catch (err) {
    logger.error({ err, claimId, reasonCode }, "[Build2A/4] _recordRefusal failed — refusal not persisted");
    return null;
  }
}
