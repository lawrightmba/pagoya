/**
 * Build 3A — Trajectory Computation (finite_difference_trajectory_v1)
 *
 * Implements the approved finite-difference trajectory mathematics exactly.
 * No substitutions, no momentum, no smoothing (Build 3B scope).
 *
 * Scientific principle: trajectory characterizes how PTI's evidentiary position
 * on one Behavioral Claim changes over time, derived from immutable Opinion history.
 * Claim-scoped, versioned, replayable, explanatory — NOT decisional.
 *
 * PRIMARY trajectory = evidentiary vector (belief/disbelief/uncertainty).
 * SEPARATELY OBSERVABLE derived scalars = base_rate, projected_probability.
 * These are never conflated.
 *
 * Direction governance — three states:
 *   applied                      → numeric + categorical direction, governance resolved
 *   unavailable_no_governance    → numeric only, no governance context exists
 *   unavailable_ambiguous_governance → numeric only, multiple equally-specific contexts
 *
 * Missing or ambiguous governance NEVER creates a trajectory_refusal_records row.
 * Only true computation failures (zero elapsed time, unrecoverable errors) do.
 */

import { createHash } from "crypto";
import { sql } from "drizzle-orm";
import { logger } from "../../lib/logger.js";

/** projected_probability formula: sl_binomial_projection_v1 */
function projectedProbability(belief: number, baseRate: number, uncertainty: number): number {
  return belief + baseRate * uncertainty;
}

/** Categorical direction given a delta and epsilon. */
function categoricalDirection(delta: number, epsilon: number): "increasing" | "decreasing" | "stable" {
  if (delta > epsilon) return "increasing";
  if (delta < -epsilon) return "decreasing";
  return "stable";
}

// ── Governance resolution ─────────────────────────────────────────────────────

export type TrajectoryGovernanceResolution =
  | { status: "applied"; contextId: string; epsilon: number }
  | { status: "unavailable_no_governance" }
  | { status: "unavailable_ambiguous_governance"; competingIds: string[] };

/**
 * Resolve trajectory direction governance for a claim.
 * Resolution order: claim-level > domain-level.
 * Three-state result — never blocks numeric computation, never creates a refusal.
 */
export async function resolveTrajectoryGovernanceContext(
  claimId: string,
  domainModuleId: string,
): Promise<TrajectoryGovernanceResolution> {
  const { db } = await import("@workspace/db");

  // Claim-level: chain-tip contexts for this specific claim
  const claimLevel = await db.execute(sql`
    SELECT tgc.id, tgc.direction_epsilon
    FROM trajectory_governance_contexts tgc
    WHERE tgc.scope_type = 'behavioral_claim'
      AND tgc.claim_id = ${claimId}::uuid
      AND NOT EXISTS (
        SELECT 1 FROM trajectory_governance_contexts newer
        WHERE newer.supersedes = tgc.id
      )
  `);

  if (claimLevel.rows.length === 1) {
    const row = claimLevel.rows[0] as { id: string; direction_epsilon: string };
    return { status: "applied", contextId: row.id, epsilon: Number(row.direction_epsilon) };
  }
  if (claimLevel.rows.length > 1) {
    const ids = (claimLevel.rows as { id: string }[]).map(r => r.id);
    return { status: "unavailable_ambiguous_governance", competingIds: ids };
  }

  // Domain-level: chain-tip contexts for the claim's domain module
  const domainLevel = await db.execute(sql`
    SELECT tgc.id, tgc.direction_epsilon
    FROM trajectory_governance_contexts tgc
    WHERE tgc.scope_type = 'domain_module'
      AND tgc.domain_module_id = ${domainModuleId}::uuid
      AND NOT EXISTS (
        SELECT 1 FROM trajectory_governance_contexts newer
        WHERE newer.supersedes = tgc.id
      )
  `);

  if (domainLevel.rows.length === 1) {
    const row = domainLevel.rows[0] as { id: string; direction_epsilon: string };
    return { status: "applied", contextId: row.id, epsilon: Number(row.direction_epsilon) };
  }
  if (domainLevel.rows.length > 1) {
    const ids = (domainLevel.rows as { id: string }[]).map(r => r.id);
    return { status: "unavailable_ambiguous_governance", competingIds: ids };
  }

  return { status: "unavailable_no_governance" };
}

// ── Opinion history fetch ─────────────────────────────────────────────────────

type OpinionRow = {
  id: string;
  belief: string;
  disbelief: string;
  uncertainty: string;
  base_rate: string;
  evaluation_time: string; // timestamptz as string
};

/**
 * Fetch the 3 most recent opinions for a claim, ordered by evaluation_time ASC, id ASC.
 * (For trajectory v1 we use last 2 or 3 opinions.)
 */
async function fetchRecentOpinions(claimId: string): Promise<OpinionRow[]> {
  const { db } = await import("@workspace/db");
  const result = await db.execute(sql`
    SELECT id, belief, disbelief, uncertainty, base_rate, evaluation_time
    FROM (
      SELECT id, belief, disbelief, uncertainty, base_rate, evaluation_time
      FROM opinions
      WHERE claim_id = ${claimId}::uuid
      ORDER BY evaluation_time DESC, id DESC
      LIMIT 3
    ) sub
    ORDER BY evaluation_time ASC, id ASC
  `);
  return result.rows as OpinionRow[];
}

// ── Checksum ──────────────────────────────────────────────────────────────────

/**
 * Compute a deterministic replay checksum for a trajectory.
 * Covers: ordered member opinion IDs, rule version, governance context (or explicit absence), version context.
 *
 * Independently recomputable from a separate code path during audit.
 */
export function computeTrajectoryReplayChecksum(inputs: {
  memberOpinionIds: string[];   // in sequence_number ASC order
  trajectoryRuleVersionId: string;
  trajectoryGovernanceContextId: string | null;
  versionContextId: string | null;
}): string {
  const payload = JSON.stringify({
    member_opinion_ids: inputs.memberOpinionIds,
    trajectory_rule_version_id: inputs.trajectoryRuleVersionId,
    trajectory_governance_context_id: inputs.trajectoryGovernanceContextId ?? "null",
    version_context_id: inputs.versionContextId ?? "null",
  });
  return createHash("sha256").update(payload).digest("hex");
}

// ── Elapsed seconds ───────────────────────────────────────────────────────────

function elapsedSeconds(t1: string, t2: string): number {
  return (new Date(t2).getTime() - new Date(t1).getTime()) / 1000;
}

// ── Main computation ──────────────────────────────────────────────────────────

export type ComputeTrajectoryResult =
  | { ok: true; trajectoryId: string; observationCount: number }
  | { ok: false; reason: "insufficient_history"; observationCount: number }
  | { ok: false; reason: "refused"; refusalId: string; refusalReason: string }
  | { ok: false; reason: "error"; message: string };

/**
 * Compute a trajectory for a claim using finite_difference_trajectory_v1.
 *
 * Algorithm:
 *   1. Resolve direction governance (three-state, never blocks)
 *   2. Fetch ordered opinions (need ≥ 2)
 *   3. Check for degenerate zero-elapsed-time pairs → write trajectory_refusal_records if found
 *   4. Compute deltas/velocities/(acceleration if 3 opinions) exactly per spec
 *   5. Compute categorical direction only if governance status = 'applied'
 *   6. Write behavioral_trajectories + behavioral_trajectory_members atomically
 *
 * Historical replay uses recorded rule/governance versions from the trajectory row,
 * not the current live versions.
 */
export async function computeTrajectory(params: {
  claimId: string;
  ruleVersionId: string;
  versionContextId?: string | null;
  supersedes?: string | null;
}): Promise<ComputeTrajectoryResult> {
  const { db } = await import("@workspace/db");

  try {
    // ── Step 1: Resolve governance ─────────────────────────────────────────
    const claimRes = await db.execute(sql`
      SELECT bc.domain_module_id FROM behavioral_claims bc WHERE bc.id = ${params.claimId}::uuid LIMIT 1
    `);
    if (claimRes.rows.length === 0) {
      return { ok: false, reason: "error", message: `Claim ${params.claimId} not found.` };
    }
    const domainModuleId = (claimRes.rows[0] as { domain_module_id: string }).domain_module_id;

    const govResolution = await resolveTrajectoryGovernanceContext(params.claimId, domainModuleId);

    // ── Step 2: Fetch opinions ─────────────────────────────────────────────
    const opinions = await fetchRecentOpinions(params.claimId);

    if (opinions.length < 2) {
      return { ok: false, reason: "insufficient_history", observationCount: opinions.length };
    }

    // Use last 2 or last 3
    const useOpinions = opinions.slice(-3); // already ordered ASC, at most 3

    // ── Step 3: Check for degenerate zero-elapsed-time pairs ──────────────
    for (let i = 0; i < useOpinions.length - 1; i++) {
      const t1 = useOpinions[i]!.evaluation_time;
      const t2 = useOpinions[i + 1]!.evaluation_time;
      const elapsed = elapsedSeconds(t1, t2);
      if (elapsed === 0) {
        // Write trajectory_refusal_records — never divide by zero
        const refResult = await db.execute(sql`
          INSERT INTO trajectory_refusal_records
            (claim_id, trajectory_rule_version_id, start_opinion_id, end_opinion_id, reason_code, detail, version_context_id)
          VALUES (
            ${params.claimId}::uuid,
            ${params.ruleVersionId}::uuid,
            ${useOpinions[i]!.id}::uuid,
            ${useOpinions[i + 1]!.id}::uuid,
            'degenerate_zero_elapsed_time',
            ${`Adjacent opinions ${useOpinions[i]!.id} and ${useOpinions[i + 1]!.id} have identical evaluation_time (${t1}). Cannot compute velocity — division by zero is not permitted. Provide opinions with distinct evaluation_times.`},
            ${params.versionContextId ?? null}::uuid
          )
          RETURNING id
        `);
        const refusalId = (refResult.rows[0] as { id: string }).id;
        return { ok: false, reason: "refused", refusalId, refusalReason: "degenerate_zero_elapsed_time" };
      }
    }

    // ── Step 4: Compute deltas, velocities, (acceleration if 3 opinions) ──
    const observationCount = useOpinions.length;

    // Parse numeric fields
    const toNum = (s: string) => Number(s);
    const ops = useOpinions.map(o => ({
      id: o.id,
      belief:            toNum(o.belief),
      disbelief:         toNum(o.disbelief),
      uncertainty:       toNum(o.uncertainty),
      baseRate:          toNum(o.base_rate),
      projectedProb:     projectedProbability(toNum(o.belief), toNum(o.base_rate), toNum(o.uncertainty)),
      evaluationTime:    o.evaluation_time,
    }));

    // For deltas and velocity: always use t1 (first) and t_last (last)
    const t1 = ops[0]!;
    const tLast = ops[observationCount - 1]!;
    const totalElapsed = elapsedSeconds(t1.evaluationTime, tLast.evaluationTime);

    const delta_belief            = tLast.belief            - t1.belief;
    const delta_disbelief         = tLast.disbelief         - t1.disbelief;
    const delta_uncertainty       = tLast.uncertainty       - t1.uncertainty;
    const delta_base_rate         = tLast.baseRate          - t1.baseRate;
    const delta_pp                = tLast.projectedProb     - t1.projectedProb;

    const velocity_belief         = delta_belief            / totalElapsed;
    const velocity_disbelief      = delta_disbelief         / totalElapsed;
    const velocity_uncertainty    = delta_uncertainty       / totalElapsed;
    const velocity_base_rate      = delta_base_rate         / totalElapsed;
    const velocity_pp             = delta_pp                / totalElapsed;

    // Acceleration: only for 3 opinions, per the irregular-time formula
    let acceleration_belief: number | null = null;
    let acceleration_disbelief: number | null = null;
    let acceleration_uncertainty: number | null = null;
    let acceleration_base_rate: number | null = null;
    let acceleration_pp: number | null = null;

    if (observationCount === 3) {
      const t2 = ops[1]!;
      const dt12 = elapsedSeconds(t1.evaluationTime, t2.evaluationTime);
      const dt23 = elapsedSeconds(t2.evaluationTime, tLast.evaluationTime);
      const dt13 = totalElapsed;

      const computeAccel = (x1: number, x2: number, x3: number): number => {
        const v12 = (x2 - x1) / dt12;
        const v23 = (x3 - x2) / dt23;
        return 2 * (v23 - v12) / dt13;
      };

      acceleration_belief       = computeAccel(t1.belief,       t2.belief,       tLast.belief);
      acceleration_disbelief    = computeAccel(t1.disbelief,    t2.disbelief,    tLast.disbelief);
      acceleration_uncertainty  = computeAccel(t1.uncertainty,  t2.uncertainty,  tLast.uncertainty);
      acceleration_base_rate    = computeAccel(t1.baseRate,     t2.baseRate,     tLast.baseRate);
      acceleration_pp           = computeAccel(t1.projectedProb, t2.projectedProb, tLast.projectedProb);
    }

    // ── Step 5: Categorical direction (only if governance status = 'applied') ─
    let direction_belief: string | null = null;
    let direction_disbelief: string | null = null;
    let direction_uncertainty: string | null = null;
    let direction_governance_status: string;
    let trajectory_governance_context_id: string | null = null;

    if (govResolution.status === "applied") {
      direction_governance_status = "applied";
      trajectory_governance_context_id = govResolution.contextId;
      const eps = govResolution.epsilon;
      direction_belief      = categoricalDirection(delta_belief,      eps);
      direction_disbelief   = categoricalDirection(delta_disbelief,   eps);
      direction_uncertainty = categoricalDirection(delta_uncertainty,  eps);
    } else if (govResolution.status === "unavailable_no_governance") {
      direction_governance_status = "unavailable_no_governance";
    } else {
      direction_governance_status = "unavailable_ambiguous_governance";
    }

    // ── Step 6: Compute replay checksum ──────────────────────────────────
    const memberOpinionIds = ops.map(o => o.id);
    const replayChecksum = computeTrajectoryReplayChecksum({
      memberOpinionIds,
      trajectoryRuleVersionId: params.ruleVersionId,
      trajectoryGovernanceContextId: trajectory_governance_context_id,
      versionContextId: params.versionContextId ?? null,
    });

    // ── Step 7: Write atomically ──────────────────────────────────────────
    const { pool } = await import("@workspace/db");
    const client = await pool.connect();

    let trajectoryId: string;
    try {
      await client.query("BEGIN");

      const btRes = await client.query(
        `INSERT INTO behavioral_trajectories (
          claim_id, start_opinion_id, end_opinion_id, observation_count, elapsed_seconds,
          delta_belief, delta_disbelief, delta_uncertainty, delta_base_rate, delta_projected_probability,
          velocity_belief, velocity_disbelief, velocity_uncertainty, velocity_base_rate, velocity_projected_probability,
          acceleration_belief, acceleration_disbelief, acceleration_uncertainty, acceleration_base_rate, acceleration_projected_probability,
          direction_belief, direction_disbelief, direction_uncertainty,
          direction_governance_status, trajectory_rule_version_id, trajectory_governance_context_id,
          version_context_id, supersedes, replay_checksum
        ) VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15,
          $16, $17, $18, $19, $20,
          $21, $22, $23,
          $24, $25, $26,
          $27, $28, $29
        ) RETURNING id`,
        [
          params.claimId, t1.id, tLast.id, observationCount, totalElapsed,
          delta_belief, delta_disbelief, delta_uncertainty, delta_base_rate, delta_pp,
          velocity_belief, velocity_disbelief, velocity_uncertainty, velocity_base_rate, velocity_pp,
          acceleration_belief, acceleration_disbelief, acceleration_uncertainty, acceleration_base_rate, acceleration_pp,
          direction_belief, direction_disbelief, direction_uncertainty,
          direction_governance_status, params.ruleVersionId, trajectory_governance_context_id,
          params.versionContextId ?? null, params.supersedes ?? null, replayChecksum,
        ],
      );
      trajectoryId = btRes.rows[0].id as string;

      // Insert member rows with explicit sequence numbers
      for (let i = 0; i < ops.length; i++) {
        await client.query(
          `INSERT INTO behavioral_trajectory_members (trajectory_id, opinion_id, sequence_number)
           VALUES ($1, $2, $3)`,
          [trajectoryId, ops[i]!.id, i + 1],
        );
      }

      await client.query("COMMIT");
    } catch (writeErr) {
      await client.query("ROLLBACK");
      throw writeErr;
    } finally {
      client.release();
    }

    logger.info(
      { trajectoryId, claimId: params.claimId, observationCount, direction_governance_status },
      "[Build3A] Trajectory computed successfully",
    );

    return { ok: true, trajectoryId, observationCount };

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ err, claimId: params.claimId }, "[Build3A] computeTrajectory threw unexpectedly");

    // Write a computation-failure refusal
    try {
      const { db: db2 } = await import("@workspace/db");
      await db2.execute(sql`
        INSERT INTO trajectory_refusal_records
          (claim_id, trajectory_rule_version_id, reason_code, detail, version_context_id)
        VALUES (
          ${params.claimId}::uuid,
          ${params.ruleVersionId}::uuid,
          'trajectory_computation_failed',
          ${`Unhandled computation error for claim ${params.claimId}: ${message}`},
          ${params.versionContextId ?? null}::uuid
        )
      `);
    } catch {
      // Swallow refusal-write error; original error is the one that matters
    }

    return { ok: false, reason: "error", message };
  }
}
