/**
 * Build 3A — Engineering Canary (canary_3a.ts)
 *
 * 7 canary paths using controlled, non-sensitive, clearly labeled fixtures.
 * All fixtures are explicitly identified as engineering canary data — not real users,
 * not production behavioral assessments.
 *
 * Canary Paths:
 *   A: Two-opinion velocity (2 synthetic opinions, exact timing)
 *   B: Three-opinion acceleration under genuinely irregular timing
 *   C: Direction with canary epsilon=0.01 (status=applied)
 *   D: Direction unavailable_no_governance (no matching context)
 *   E: Direction unavailable_ambiguous_governance (two equally-specific contexts, real IDs shown)
 *   F: Degenerate zero-elapsed-time refusal
 *   G: Exact replay checksum via separate code path
 *   H: Immutable supersession (new opinion → new trajectory, prior unchanged)
 *
 * Run: npx tsx src/services/build3a/canary_3a.ts
 */

import { sql } from "drizzle-orm";
import { db, pool } from "@workspace/db";
import { createHash } from "crypto";
import {
  computeTrajectory,
  computeTrajectoryReplayChecksum,
  resolveTrajectoryGovernanceContext,
} from "./trajectoryComputation.js";
import { ensureBuild3aTables } from "./migrations3a.js";
import { ensureBuild2aTables }  from "../build2a/migrations.js";
import { ensureBuild2a2Tables } from "../build2a/migrations_2a2.js";
import { ensureBuild2a3Tables } from "../build2a/migrations_2a3.js";
import { ensureBuild2a4Tables } from "../build2a/migrations_2a4.js";
import { ensureBuild2a5Tables } from "../build2a/migrations_2a5.js";
import { ensureBuild2a6Tables } from "../build2a/migrations_2a6.js";

const CANARY_RUN_ID = `canary_3a_${Date.now()}`;
const CANARY_LABEL  = "[Build3A/canary — ENGINEERING FIXTURE, not production data]";

// ── Seed helpers ─────────────────────────────────────────────────────────────

type CanarySeeds = {
  primitiveId:   string;
  agentDomainId: string;
  fovId:         string;
  brrId:         string;
  fgcId:         string;
  trvId:         string;
};

async function resolveCanarySeeds(): Promise<CanarySeeds> {
  const [primRes, domRes, fovRes, brrRes, fgcRes, trvRes] = await Promise.all([
    db.execute(sql`SELECT id FROM behavioral_primitives WHERE name = 'agent_guided_task_completion' LIMIT 1`),
    db.execute(sql`SELECT id FROM domain_modules WHERE slug = 'agent_instrumentation' LIMIT 1`),
    db.execute(sql`SELECT id FROM fusion_operator_versions WHERE implementation_key = 'sl_opinion_formation_v1' AND is_active = true LIMIT 1`),
    db.execute(sql`SELECT id FROM base_rate_records WHERE sufficiency_status = 'sufficient' LIMIT 1`),
    db.execute(sql`SELECT id FROM fusion_governance_contexts WHERE scope_type = 'domain_module' LIMIT 1`),
    db.execute(sql`SELECT id FROM trajectory_rule_versions WHERE implementation_key = 'finite_difference_trajectory_v1' LIMIT 1`),
  ]);
  return {
    primitiveId:   (primRes.rows[0] as { id: string }).id,
    agentDomainId: (domRes.rows[0]  as { id: string }).id,
    fovId:         (fovRes.rows[0]  as { id: string }).id,
    brrId:         (brrRes.rows[0]  as { id: string }).id,
    fgcId:         (fgcRes.rows[0]  as { id: string }).id,
    trvId:         (trvRes.rows[0]  as { id: string }).id,
  };
}

async function makeCanaryClaim(suffix: string, seeds: CanarySeeds, domainId?: string): Promise<string> {
  const nativeId = `${CANARY_RUN_ID}_${suffix}`;
  await db.execute(sql`
    INSERT INTO behavioral_entities (entity_type, native_system, native_id)
    VALUES ('autonomous_agent', 'build1a_agent_system', ${nativeId})
    ON CONFLICT (entity_type, native_system, native_id) DO NOTHING
  `);
  const entRes = await db.execute(sql`
    SELECT id FROM behavioral_entities WHERE native_id = ${nativeId} LIMIT 1
  `);
  const entityId = (entRes.rows[0] as { id: string }).id;
  const domId = domainId ?? seeds.agentDomainId;
  const claimRes = await db.execute(sql`
    INSERT INTO behavioral_claims (entity_id, primitive_id, domain_module_id, window_start, window_end, falsifiability_condition)
    VALUES (${entityId}::uuid, ${seeds.primitiveId}::uuid, ${domId}::uuid,
            NOW() - INTERVAL '1 day', NOW() + INTERVAL '90 days',
            ${"Canary3A falsifiability: " + suffix + "/" + CANARY_RUN_ID + " " + CANARY_LABEL})
    RETURNING id
  `);
  return (claimRes.rows[0] as { id: string }).id;
}

async function insertCanaryOpinion(params: {
  claimId: string;
  belief: number;
  disbelief: number;
  uncertainty: number;
  baseRate: number;
  evaluationTimeISO: string;
  seeds: CanarySeeds;
  suffix: string;
}): Promise<string> {
  const { claimId, belief, disbelief, uncertainty, baseRate, evaluationTimeISO, seeds, suffix } = params;
  const bundleRes = await db.execute(sql`
    INSERT INTO evidence_bundles (claim_id, fusion_operator_version_id, deterministic_ordering_rule, bundle_version, construction_timestamp)
    VALUES (${claimId}::uuid, ${seeds.fovId}::uuid, ${'canary3a_' + suffix}, 1, ${evaluationTimeISO}::timestamptz)
    RETURNING id
  `);
  const bundleId = (bundleRes.rows[0] as { id: string }).id;
  const fcRes = await db.execute(sql`
    INSERT INTO fusion_contexts (bundle_id, selected_operator, selection_rule_version_id, governance_context_id, conflict_threshold, dependence_declarations_summary, operator_parameters)
    VALUES (${bundleId}::uuid, 'cumulative', ${seeds.fovId}::uuid, ${seeds.fgcId}::uuid, 0.50, '{}', '{}')
    RETURNING id
  `);
  const fcId = (fcRes.rows[0] as { id: string }).id;
  const opRes = await db.execute(sql`
    INSERT INTO opinions (claim_id, evidence_bundle_id, fusion_context_id, belief, disbelief, uncertainty, base_rate, base_rate_record_id, mathematical_validity_status, evaluation_time)
    VALUES (${claimId}::uuid, ${bundleId}::uuid, ${fcId}::uuid, ${belief}, ${disbelief}, ${uncertainty}, ${baseRate}, ${seeds.brrId}::uuid, 'valid', ${evaluationTimeISO}::timestamptz)
    RETURNING id
  `);
  return (opRes.rows[0] as { id: string }).id;
}

// ── Canary runner ─────────────────────────────────────────────────────────────

async function runCanary(): Promise<void> {
  console.log(`\n${"=".repeat(70)}`);
  console.log(`BUILD 3A ENGINEERING CANARY — run_id=${CANARY_RUN_ID}`);
  console.log(`All fixtures are synthetic/controlled. ${CANARY_LABEL}`);
  console.log(`${"=".repeat(70)}\n`);

  // Ensure all migrations up to date
  await ensureBuild2aTables();
  await ensureBuild2a2Tables();
  await ensureBuild2a3Tables();
  await ensureBuild2a4Tables();
  await ensureBuild2a5Tables();
  await ensureBuild2a6Tables();
  await ensureBuild3aTables();

  const seeds = await resolveCanarySeeds();
  const results: Array<{ path: string; status: "PASS" | "FAIL"; detail: string }> = [];

  const pass = (path: string, detail: string) => {
    results.push({ path, status: "PASS", detail });
    console.log(`✅ PATH ${path}: ${detail}`);
  };
  const fail = (path: string, detail: string) => {
    results.push({ path, status: "FAIL", detail });
    console.error(`❌ PATH ${path}: ${detail}`);
  };

  // ── PATH A: Two-opinion velocity ──────────────────────────────────────────
  try {
    const claimId = await makeCanaryClaim("pathA_vel2", seeds);
    const t1 = "2026-01-15T09:00:00.000Z";
    const t2 = "2026-01-15T09:01:40.000Z"; // +100s

    await insertCanaryOpinion({ claimId, belief: 0.3, disbelief: 0.4, uncertainty: 0.3, baseRate: 0.5, evaluationTimeISO: t1, seeds, suffix: "pathA_o1" });
    await insertCanaryOpinion({ claimId, belief: 0.5, disbelief: 0.3, uncertainty: 0.2, baseRate: 0.6, evaluationTimeISO: t2, seeds, suffix: "pathA_o2" });

    const result = await computeTrajectory({ claimId, ruleVersionId: seeds.trvId });
    if (!result.ok) throw new Error(`computeTrajectory not ok: ${JSON.stringify(result)}`);

    const tRow = await db.execute(sql`
      SELECT elapsed_seconds, delta_belief, velocity_belief, observation_count, acceleration_belief
      FROM behavioral_trajectories WHERE id = ${result.trajectoryId}::uuid
    `);
    const t = tRow.rows[0] as Record<string, string | null>;

    const elapsedOk    = Math.abs(Number(t.elapsed_seconds) - 100) < 0.001;
    const deltaBeliefOk = Math.abs(Number(t.delta_belief) - 0.2) < 0.0001;
    const velBeliefOk  = Math.abs(Number(t.velocity_belief) - 0.002) < 0.000001;
    const obsCountOk   = Number(t.observation_count) === 2;
    const accelNull    = t.acceleration_belief === null;

    if (!elapsedOk || !deltaBeliefOk || !velBeliefOk || !obsCountOk || !accelNull) {
      throw new Error(`PATH A math mismatch: elapsed=${t.elapsed_seconds} delta_belief=${t.delta_belief} vel_belief=${t.velocity_belief} obs=${t.observation_count} accel_null=${accelNull}`);
    }
    pass("A", `two-opinion velocity: elapsed=${t.elapsed_seconds}s delta_belief=${t.delta_belief} velocity_belief=${t.velocity_belief} observation_count=${t.observation_count} acceleration_belief=null ✓`);
  } catch (err) {
    fail("A", String(err));
  }

  // ── PATH B: Three-opinion acceleration (irregular timing) ─────────────────
  try {
    const claimId = await makeCanaryClaim("pathB_accel3", seeds);
    const t1 = "2026-02-15T09:00:00.000Z";
    const t2 = "2026-02-15T09:01:00.000Z"; // +60s
    const t3 = "2026-02-15T09:02:40.000Z"; // +160s from t1, +100s from t2

    await insertCanaryOpinion({ claimId, belief: 0.3, disbelief: 0.4,  uncertainty: 0.3,  baseRate: 0.5,  evaluationTimeISO: t1, seeds, suffix: "pathB_o1" });
    await insertCanaryOpinion({ claimId, belief: 0.4, disbelief: 0.35, uncertainty: 0.25, baseRate: 0.52, evaluationTimeISO: t2, seeds, suffix: "pathB_o2" });
    await insertCanaryOpinion({ claimId, belief: 0.5, disbelief: 0.3,  uncertainty: 0.2,  baseRate: 0.55, evaluationTimeISO: t3, seeds, suffix: "pathB_o3" });

    const result = await computeTrajectory({ claimId, ruleVersionId: seeds.trvId });
    if (!result.ok) throw new Error(`computeTrajectory not ok: ${JSON.stringify(result)}`);

    const tRow = await db.execute(sql`
      SELECT observation_count, elapsed_seconds, acceleration_belief, acceleration_disbelief
      FROM behavioral_trajectories WHERE id = ${result.trajectoryId}::uuid
    `);
    const t = tRow.rows[0] as Record<string, string | null>;

    // Hand-verified: accel_belief = 2*(0.001 - 0.001667)/160 ≈ -0.000008333
    const expectedAccelBelief = -0.000008333;
    const actualAccelBelief = Number(t.acceleration_belief);
    const accelBeliefOk = Math.abs(actualAccelBelief - expectedAccelBelief) < 0.0000001;

    if (Number(t.observation_count) !== 3 || !accelBeliefOk || t.acceleration_belief === null) {
      throw new Error(`PATH B math mismatch: obs=${t.observation_count} accel_belief=${t.acceleration_belief} (expected≈${expectedAccelBelief})`);
    }
    pass("B", `three-opinion acceleration: elapsed=${t.elapsed_seconds}s (60s+100s irregular) obs_count=${t.observation_count} accel_belief=${t.acceleration_belief} (≈-0.000008333) accel_disbelief=${t.acceleration_disbelief} (≈+0.000004167) ✓`);
  } catch (err) {
    fail("B", String(err));
  }

  // ── PATH C: Direction with canary epsilon=0.01 (status=applied) ───────────
  try {
    const claimId = await makeCanaryClaim("pathC_dir_applied", seeds);
    const t1 = "2026-03-15T09:00:00.000Z";
    const t2 = "2026-03-15T09:01:40.000Z"; // +100s

    // belief delta = 0.05 > epsilon(0.01) → increasing
    // disbelief delta = -0.05 < -epsilon → decreasing
    // uncertainty delta = 0.0 → stable
    await insertCanaryOpinion({ claimId, belief: 0.4, disbelief: 0.4, uncertainty: 0.2, baseRate: 0.5, evaluationTimeISO: t1, seeds, suffix: "pathC_o1" });
    await insertCanaryOpinion({ claimId, belief: 0.45, disbelief: 0.35, uncertainty: 0.2, baseRate: 0.5, evaluationTimeISO: t2, seeds, suffix: "pathC_o2" });

    const result = await computeTrajectory({ claimId, ruleVersionId: seeds.trvId });
    if (!result.ok) throw new Error(`computeTrajectory not ok: ${JSON.stringify(result)}`);

    const tRow = await db.execute(sql`
      SELECT direction_belief, direction_disbelief, direction_uncertainty,
             direction_governance_status, trajectory_governance_context_id
      FROM behavioral_trajectories WHERE id = ${result.trajectoryId}::uuid
    `);
    const t = tRow.rows[0] as Record<string, string | null>;

    if (t.direction_governance_status !== "applied"
        || t.trajectory_governance_context_id === null
        || t.direction_belief !== "increasing"
        || t.direction_disbelief !== "decreasing"
        || t.direction_uncertainty !== "stable") {
      throw new Error(`PATH C direction mismatch: status=${t.direction_governance_status} belief=${t.direction_belief} disbelief=${t.direction_disbelief} uncertainty=${t.direction_uncertainty}`);
    }
    pass("C", `direction applied: governance_context_id=${t.trajectory_governance_context_id} epsilon=0.01 belief=increasing(+0.05>ε) disbelief=decreasing(-0.05<-ε) uncertainty=stable(0=ε boundary) ✓`);
  } catch (err) {
    fail("C", String(err));
  }

  // ── PATH D: Direction unavailable_no_governance ───────────────────────────
  try {
    const slugNoGov = `canary3a_no_gov_dom_${CANARY_RUN_ID}`;
    await db.execute(sql`
      INSERT INTO domain_modules (slug, display_name) VALUES (${slugNoGov}, ${'Canary3A No-Gov Domain'})
      ON CONFLICT DO NOTHING
    `);
    const domRes = await db.execute(sql`SELECT id FROM domain_modules WHERE slug = ${slugNoGov} LIMIT 1`);
    const noGovDomainId = (domRes.rows[0] as { id: string }).id;

    const claimId = await makeCanaryClaim("pathD_no_gov", seeds, noGovDomainId);
    const t1 = "2026-04-15T09:00:00.000Z";
    const t2 = "2026-04-15T09:01:40.000Z";
    await insertCanaryOpinion({ claimId, belief: 0.3, disbelief: 0.4, uncertainty: 0.3, baseRate: 0.5, evaluationTimeISO: t1, seeds, suffix: "pathD_o1" });
    await insertCanaryOpinion({ claimId, belief: 0.5, disbelief: 0.3, uncertainty: 0.2, baseRate: 0.6, evaluationTimeISO: t2, seeds, suffix: "pathD_o2" });

    const result = await computeTrajectory({ claimId, ruleVersionId: seeds.trvId });
    if (!result.ok) throw new Error(`computeTrajectory not ok: ${JSON.stringify(result)}`);

    const tRow = await db.execute(sql`
      SELECT direction_governance_status, trajectory_governance_context_id,
             direction_belief, delta_belief, velocity_belief
      FROM behavioral_trajectories WHERE id = ${result.trajectoryId}::uuid
    `);
    const t = tRow.rows[0] as Record<string, string | null>;

    // Check no refusal was written for this claim
    const refCount = await db.execute(sql`
      SELECT COUNT(*) as n FROM trajectory_refusal_records WHERE claim_id = ${claimId}::uuid
    `);
    const refN = Number((refCount.rows[0] as { n: string }).n);

    if (t.direction_governance_status !== "unavailable_no_governance"
        || t.trajectory_governance_context_id !== null
        || t.direction_belief !== null
        || refN !== 0) {
      throw new Error(`PATH D mismatch: status=${t.direction_governance_status} context_id=${t.trajectory_governance_context_id} dir_belief=${t.direction_belief} refusal_count=${refN}`);
    }
    pass("D", `unavailable_no_governance: status=unavailable_no_governance governance_context_id=NULL direction_belief=NULL numeric_delta_belief=${t.delta_belief} numeric_velocity_belief=${t.velocity_belief} refusal_records_written=0 ✓`);
  } catch (err) {
    fail("D", String(err));
  }

  // ── PATH E: Direction unavailable_ambiguous_governance ────────────────────
  try {
    const slugAmb = `canary3a_ambig_gov_dom_${CANARY_RUN_ID}`;
    await db.execute(sql`
      INSERT INTO domain_modules (slug, display_name) VALUES (${slugAmb}, ${'Canary3A Ambig Gov Domain'})
      ON CONFLICT DO NOTHING
    `);
    const domRes = await db.execute(sql`SELECT id FROM domain_modules WHERE slug = ${slugAmb} LIMIT 1`);
    const ambDomainId = (domRes.rows[0] as { id: string }).id;

    // Seed TWO chain-tip governance contexts
    const gov1Res = await db.execute(sql`
      INSERT INTO trajectory_governance_contexts (scope_type, domain_module_id, direction_epsilon, approval_authority, derivation_method, version)
      VALUES ('domain_module', ${ambDomainId}::uuid, 0.02, 'canary_test_auth_1', 'canary_experimental', 'v1')
      RETURNING id
    `);
    const gov2Res = await db.execute(sql`
      INSERT INTO trajectory_governance_contexts (scope_type, domain_module_id, direction_epsilon, approval_authority, derivation_method, version)
      VALUES ('domain_module', ${ambDomainId}::uuid, 0.05, 'canary_test_auth_2', 'canary_experimental', 'v1')
      RETURNING id
    `);
    const govId1 = (gov1Res.rows[0] as { id: string }).id;
    const govId2 = (gov2Res.rows[0] as { id: string }).id;

    console.log(`  PATH E: two competing governance IDs: [${govId1}, ${govId2}]`);

    const claimId = await makeCanaryClaim("pathE_ambig", seeds, ambDomainId);
    const t1 = "2026-05-15T09:00:00.000Z";
    const t2 = "2026-05-15T09:01:40.000Z";
    await insertCanaryOpinion({ claimId, belief: 0.3, disbelief: 0.4, uncertainty: 0.3, baseRate: 0.5, evaluationTimeISO: t1, seeds, suffix: "pathE_o1" });
    await insertCanaryOpinion({ claimId, belief: 0.5, disbelief: 0.3, uncertainty: 0.2, baseRate: 0.6, evaluationTimeISO: t2, seeds, suffix: "pathE_o2" });

    const result = await computeTrajectory({ claimId, ruleVersionId: seeds.trvId });
    if (!result.ok) throw new Error(`computeTrajectory not ok: ${JSON.stringify(result)}`);

    const tRow = await db.execute(sql`
      SELECT direction_governance_status, trajectory_governance_context_id,
             direction_belief, delta_belief
      FROM behavioral_trajectories WHERE id = ${result.trajectoryId}::uuid
    `);
    const t = tRow.rows[0] as Record<string, string | null>;

    const refCount = await db.execute(sql`
      SELECT COUNT(*) as n FROM trajectory_refusal_records WHERE claim_id = ${claimId}::uuid
    `);
    const refN = Number((refCount.rows[0] as { n: string }).n);

    if (t.direction_governance_status !== "unavailable_ambiguous_governance"
        || t.trajectory_governance_context_id !== null
        || t.direction_belief !== null
        || refN !== 0) {
      throw new Error(`PATH E mismatch: status=${t.direction_governance_status} context_id=${t.trajectory_governance_context_id} dir_belief=${t.direction_belief} refusal_count=${refN}`);
    }
    pass("E", `unavailable_ambiguous_governance: competing_ids=[${govId1}, ${govId2}] status=unavailable_ambiguous_governance governance_context_id=NULL(no arbitrary pick) direction_belief=NULL numeric_delta_belief=${t.delta_belief} refusal_records_written=0 ✓`);
  } catch (err) {
    fail("E", String(err));
  }

  // ── PATH F: Degenerate zero-elapsed-time refusal ──────────────────────────
  try {
    const claimId = await makeCanaryClaim("pathF_zero_elapsed", seeds);
    const sameTime = "2026-06-15T09:00:00.000Z";
    await insertCanaryOpinion({ claimId, belief: 0.4, disbelief: 0.4, uncertainty: 0.2, baseRate: 0.5, evaluationTimeISO: sameTime, seeds, suffix: "pathF_o1" });
    await insertCanaryOpinion({ claimId, belief: 0.5, disbelief: 0.3, uncertainty: 0.2, baseRate: 0.5, evaluationTimeISO: sameTime, seeds, suffix: "pathF_o2" });

    const result = await computeTrajectory({ claimId, ruleVersionId: seeds.trvId });
    if (result.ok) throw new Error("Expected refusal but got ok=true");
    if (result.reason !== "refused") throw new Error(`Expected reason=refused, got ${result.reason}`);

    const refId = (result as { refusalId: string }).refusalId;
    const rRow = await db.execute(sql`
      SELECT reason_code, claim_id, detail FROM trajectory_refusal_records WHERE id = ${refId}::uuid
    `);
    const r = rRow.rows[0] as { reason_code: string; claim_id: string; detail: string };

    if (r.reason_code !== "degenerate_zero_elapsed_time") {
      throw new Error(`Wrong reason_code: ${r.reason_code}`);
    }

    const btCount = await db.execute(sql`SELECT COUNT(*) as n FROM behavioral_trajectories WHERE claim_id = ${claimId}::uuid`);
    if (Number((btCount.rows[0] as { n: string }).n) !== 0) {
      throw new Error("behavioral_trajectories row was written despite zero-elapsed-time refusal");
    }

    pass("F", `zero-elapsed-time refusal: refusal_id=${refId} reason_code=degenerate_zero_elapsed_time behavioral_trajectory_rows=0 ✓`);
  } catch (err) {
    fail("F", String(err));
  }

  // ── PATH G: Exact replay checksum ─────────────────────────────────────────
  try {
    const claimId = await makeCanaryClaim("pathG_replay", seeds);
    const t1 = "2026-07-15T09:00:00.000Z";
    const t2 = "2026-07-15T09:01:40.000Z";
    await insertCanaryOpinion({ claimId, belief: 0.3, disbelief: 0.4, uncertainty: 0.3, baseRate: 0.5, evaluationTimeISO: t1, seeds, suffix: "pathG_o1" });
    await insertCanaryOpinion({ claimId, belief: 0.5, disbelief: 0.3, uncertainty: 0.2, baseRate: 0.6, evaluationTimeISO: t2, seeds, suffix: "pathG_o2" });

    const result = await computeTrajectory({ claimId, ruleVersionId: seeds.trvId });
    if (!result.ok) throw new Error(`computeTrajectory not ok: ${JSON.stringify(result)}`);

    const tRow = await db.execute(sql`
      SELECT replay_checksum, trajectory_rule_version_id, trajectory_governance_context_id, version_context_id
      FROM behavioral_trajectories WHERE id = ${result.trajectoryId}::uuid
    `);
    const tData = tRow.rows[0] as {
      replay_checksum: string;
      trajectory_rule_version_id: string;
      trajectory_governance_context_id: string | null;
      version_context_id: string | null;
    };

    const memberRes = await db.execute(sql`
      SELECT opinion_id FROM behavioral_trajectory_members
      WHERE trajectory_id = ${result.trajectoryId}::uuid ORDER BY sequence_number ASC
    `);
    const memberOpinionIds = (memberRes.rows as { opinion_id: string }[]).map(r => r.opinion_id);

    // Path 1: computeTrajectoryReplayChecksum
    const path1 = computeTrajectoryReplayChecksum({
      memberOpinionIds,
      trajectoryRuleVersionId: tData.trajectory_rule_version_id,
      trajectoryGovernanceContextId: tData.trajectory_governance_context_id,
      versionContextId: tData.version_context_id,
    });

    // Path 2: raw createHash — independent code path
    const payload = JSON.stringify({
      member_opinion_ids: memberOpinionIds,
      trajectory_rule_version_id: tData.trajectory_rule_version_id,
      trajectory_governance_context_id: tData.trajectory_governance_context_id ?? "null",
      version_context_id: tData.version_context_id ?? "null",
    });
    const path2 = createHash("sha256").update(payload).digest("hex");

    if (path1 !== tData.replay_checksum || path2 !== tData.replay_checksum) {
      throw new Error(`Checksum mismatch: stored=${tData.replay_checksum} path1=${path1} path2=${path2}`);
    }
    pass("G", `replay checksum: stored=${tData.replay_checksum} path1(computeTrajectoryReplayChecksum)=identical path2(raw createHash)=identical ✓`);
  } catch (err) {
    fail("G", String(err));
  }

  // ── PATH H: Immutable supersession ────────────────────────────────────────
  try {
    const claimId = await makeCanaryClaim("pathH_supersession", seeds);
    const t1 = "2026-08-15T09:00:00.000Z";
    const t2 = "2026-08-15T09:01:40.000Z"; // +100s
    const t3 = "2026-08-15T09:03:20.000Z"; // +200s from t1

    await insertCanaryOpinion({ claimId, belief: 0.3, disbelief: 0.4, uncertainty: 0.3, baseRate: 0.5, evaluationTimeISO: t1, seeds, suffix: "pathH_o1" });
    await insertCanaryOpinion({ claimId, belief: 0.5, disbelief: 0.3, uncertainty: 0.2, baseRate: 0.6, evaluationTimeISO: t2, seeds, suffix: "pathH_o2" });

    // First trajectory (2 opinions)
    const r1 = await computeTrajectory({ claimId, ruleVersionId: seeds.trvId });
    if (!r1.ok) throw new Error(`First trajectory not ok: ${JSON.stringify(r1)}`);
    const tId1 = r1.trajectoryId;

    // Add third opinion → new trajectory supersedes first
    await insertCanaryOpinion({ claimId, belief: 0.6, disbelief: 0.25, uncertainty: 0.15, baseRate: 0.65, evaluationTimeISO: t3, seeds, suffix: "pathH_o3" });
    const r2 = await computeTrajectory({ claimId, ruleVersionId: seeds.trvId, supersedes: tId1 });
    if (!r2.ok) throw new Error(`Second trajectory not ok: ${JSON.stringify(r2)}`);
    const tId2 = r2.trajectoryId;

    // Verify prior row unchanged (no supersedes field set on it)
    const priorRow = await db.execute(sql`SELECT supersedes FROM behavioral_trajectories WHERE id = ${tId1}::uuid`);
    const priorSupersedes = (priorRow.rows[0] as { supersedes: string | null }).supersedes;

    // Verify new row has supersedes pointing to prior
    const newRow = await db.execute(sql`SELECT supersedes, observation_count FROM behavioral_trajectories WHERE id = ${tId2}::uuid`);
    const newSupersedes = (newRow.rows[0] as { supersedes: string }).supersedes;
    const newObsCount = (newRow.rows[0] as { observation_count: number }).observation_count;

    // Verify latest view shows only tId2
    const viewRes = await db.execute(sql`
      SELECT id FROM latest_behavioral_trajectory_v WHERE claim_id = ${claimId}::uuid
    `);
    const viewIds = (viewRes.rows as { id: string }[]).map(r => r.id);

    if (priorSupersedes !== null
        || newSupersedes !== tId1
        || !viewIds.includes(tId2)
        || viewIds.includes(tId1)) {
      throw new Error(`PATH H supersession invariant violated: prior.supersedes=${priorSupersedes} new.supersedes=${newSupersedes} view_contains_tId1=${viewIds.includes(tId1)} view_contains_tId2=${viewIds.includes(tId2)}`);
    }
    pass("H", `immutable supersession: tId1=${tId1}(obs=2, supersedes=null, prior_unchanged) → tId2=${tId2}(obs=${newObsCount}, supersedes=${newSupersedes}) latest_view_contains_only=tId2 ✓`);
  } catch (err) {
    fail("H", String(err));
  }

  // ── Real-data eligibility check ───────────────────────────────────────────
  // IMPORTANT: this check must exclude ALL engineering fixture claims created
  // by Build 2A and Build 3A test/canary runs. The exclusion uses
  // falsifiability_condition prefix patterns. Only claims with no fixture
  // marker in their falsifiability_condition are candidates for real-data
  // trajectory computation.
  //
  // Excluded prefixes (all confirmed present in live DB as of 2026-08-08):
  //   - "Build3A test falsifiability: *"   — Build 3A test runner fixtures
  //   - "Canary3A falsifiability: *"        — Build 3A canary fixtures
  //   - "[Build3A*"                         — Build 3A marker in brackets
  //   - "no_gov_test/*"                     — Build 3A no-gov variant fixtures
  //   - "ambig_gov_test/*"                  — Build 3A ambiguous-gov fixtures
  //   - "Canary 2A-4 claim for entity A *"  — Build 2A-4 canary fixtures
  //   - "*canary2a4_*"                      — Build 2A-4 canary run IDs
  //   - "Pred test falsifiability: *"       — Build 2A-6 prediction fixtures
  //   - "Canary 2A-6: *"                    — Build 2A-6 canary fixtures
  //   - "KQ test claim *"                   — Build 2A-5 knowledge qualification fixtures
  //
  // The query must also exclude the current CANARY_RUN_ID to prevent a canary
  // run from counting its own freshly-inserted opinions as real data.
  console.log(`\n${"─".repeat(70)}`);
  console.log("REAL-DATA ELIGIBILITY CHECK (separate from engineering canary)");
  console.log("Fixture exclusion: all Build2A and Build3A test/canary markers excluded.");
  console.log(`Current canary run ID excluded: ${CANARY_RUN_ID}`);
  console.log("─".repeat(70));

  const claimsRes = await db.execute(sql`
    SELECT o.claim_id, COUNT(*) AS opinion_count
    FROM opinions o
    JOIN behavioral_claims bc ON bc.id = o.claim_id
    WHERE bc.falsifiability_condition NOT ILIKE '%traj_test_%'
      AND bc.falsifiability_condition NOT ILIKE '%canary_3a_%'
      AND bc.falsifiability_condition NOT ILIKE '%Build3A%'
      AND bc.falsifiability_condition NOT ILIKE '%Canary3A%'
      AND bc.falsifiability_condition NOT ILIKE '%build3a_%'
      AND bc.falsifiability_condition NOT ILIKE '%[Build3A%'
      AND bc.falsifiability_condition NOT ILIKE '%no_gov_test/%'
      AND bc.falsifiability_condition NOT ILIKE '%ambig_gov_test/%'
      AND bc.falsifiability_condition NOT ILIKE '%Canary 2A-4%'
      AND bc.falsifiability_condition NOT ILIKE '%canary2a4_%'
      AND bc.falsifiability_condition NOT ILIKE '%Pred test falsifiability%'
      AND bc.falsifiability_condition NOT ILIKE '%Canary 2A-6%'
      AND bc.falsifiability_condition NOT ILIKE '%KQ test claim%'
      AND bc.falsifiability_condition NOT ILIKE ${`%${CANARY_RUN_ID}%`}
    GROUP BY o.claim_id
    HAVING COUNT(*) >= 2
    LIMIT 5
  `);

  if (claimsRes.rows.length === 0) {
    console.log("NOT YET EMPIRICALLY ELIGIBLE.");
    console.log("  Build 3A engineering validation is complete.");
    console.log("  Trajectory mathematics and mechanics are proven with controlled fixtures.");
    console.log("  Real behavioral trajectory analysis cannot yet be claimed because");
    console.log("  insufficient pre-existing Opinion history exists in the live database.");
    console.log("  This is expected and is NOT a Build 3A implementation failure.");
    console.log("  Eligibility requires: real Claim + ≥2 Opinions from genuine production");
    console.log("  behavioral events, created independently of any Build 2A/3A test run.");
  } else {
    console.log(`Found ${claimsRes.rows.length} real pre-existing eligible claim(s):`);
    for (const row of claimsRes.rows as { claim_id: string; opinion_count: string }[]) {
      console.log(`  Real eligible claim: ${row.claim_id} (${row.opinion_count} opinions)`);
      const r = await computeTrajectory({ claimId: row.claim_id, ruleVersionId: seeds.trvId });
      if (r.ok) {
        const tRow = await db.execute(sql`
          SELECT delta_belief, velocity_belief, direction_governance_status, observation_count
          FROM behavioral_trajectories WHERE id = ${r.trajectoryId}::uuid
        `);
        const t = tRow.rows[0] as Record<string, string | null>;
        console.log(`  → Trajectory: obs=${t.observation_count} delta_belief=${t.delta_belief} velocity_belief=${t.velocity_belief} gov_status=${t.direction_governance_status}`);
      } else if (!r.ok && r.reason === "insufficient_history") {
        console.log(`  → NOT YET ELIGIBLE: insufficient history (${(r as { observationCount: number }).observationCount} opinions)`);
      } else {
        console.log(`  → ${JSON.stringify(r)}`);
      }
    }
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log(`\n${"=".repeat(70)}`);
  const passed = results.filter(r => r.status === "PASS").length;
  const failed = results.filter(r => r.status === "FAIL").length;
  console.log(`CANARY SUMMARY: ${passed}/${results.length} paths PASS, ${failed} FAIL`);
  results.forEach(r => {
    const icon = r.status === "PASS" ? "✅" : "❌";
    console.log(`  ${icon} PATH ${r.path}: ${r.status}`);
  });

  if (failed > 0) {
    console.error("\n❌ CANARY FAILED — see above for details");
    await pool.end();
    process.exit(1);
  }

  console.log("\n✅ ALL CANARY PATHS PASS — Build 3A engineering canary complete");
  await pool.end();
}

runCanary().catch((err) => {
  console.error("[Build3A/canary] Fatal:", err);
  pool.end().finally(() => process.exit(1));
});
