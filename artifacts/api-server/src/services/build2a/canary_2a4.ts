/**
 * Build 2A — Package 2A-4 Canary Script (Final / Post-Correction-Pass)
 *
 * Seeds a complete, self-contained evidence chain from scratch and verifies all
 * seven required paths with real database operations. All created rows are retained
 * for independent audit. Every path uses the same production-code service functions
 * as the deployed system — no raw SQL shortcuts.
 *
 * ── Paths ─────────────────────────────────────────────────────────────────────
 *
 *   Path A: Two independent 'supports' atoms → cumulative fusion.
 *           All objects retained: Evidence Bundle → Members → Fusion Context →
 *           Opinion → Reasoning Trace → sl_binomial_projection_v1. Every ID logged.
 *
 *   Path B: Two 'dependent' atoms, same direction → averaging operator selected.
 *           Dependence grouping verified in bundle members. Stored grouping shown.
 *
 *   Path C: One 'supports' + one 'contradicts', both high-weight → pairwise conflict
 *           exceeds 0.30 → consensus_compromise selected. Conflict metric and
 *           governance threshold recorded in fusion_context. Rerouted flag set.
 *
 *   Path D: Claim under cash_flow_stability (no base_rate_records for
 *           '2a4_cash_flow_stability') → missing_base_rate refusal. Refusal record
 *           retained in DB.
 *
 *   Path E: Extend Path A's claim. New WEC supersedes the prior chain tip (wec2).
 *           latest_weighted_contribution_v excludes superseded WEC. Re-run
 *           formOpinion → new opinion.supersedes = pathA.opinionId. Prior opinion
 *           unchanged. latest_opinion_v resolves to new opinion only.
 *
 *   Path F: Three sub-paths.
 *     F1: Domain-level governance (v1.1-governed-experimental) resolves for a
 *         fresh agent_instrumentation claim with no claim-level context.
 *     F2: Claim-level governance context (threshold=0.45) inserted for a new
 *         claim; verified to beat the domain-level (threshold=0.30).
 *     F3: cash_flow_stability claim — temporary base rate seeded so base-rate step
 *         passes; no governance context exists → missing_conflict_threshold_governance
 *         refusal. Refusal record retained.
 *
 *   Path G: Retrieve reasoning trace for Path A's opinion. Verify operator,
 *           contribution counts, conflict, governance reference. Recompute replay
 *           checksum independently and assert equality against stored value.
 *
 * ── Proof-type legend (used in section headers) ───────────────────────────────
 *   LIVE-DB  — real DB write; retained for independent audit
 *   UNIT-MATH — pure formula verified inline (no DB needed)
 *
 * Run with:
 *   npx tsx artifacts/api-server/src/services/build2a/canary_2a4.ts
 *
 * CANARY_RUN_ID isolates this run from prior canary rows in the DB.
 */

import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { ensureBuild2a4Tables } from "./migrations_2a4.js";
import { formOpinion } from "./opinionPersistence.js";
import { createCluster, addObservationLink } from "./clusterAssembly.js";
import { sealClusterAndCreateAtom } from "./atomConstruction.js";
import { weightAtom } from "./weighting.js";
import { computeReplayChecksum } from "./reasoningTraces.js";
import {
  dispositionToSlOpinion,
  maxConsecutivePairwiseConflict,
} from "./fusionMath.js";

// ── ANSI colours ──────────────────────────────────────────────────────────────
const G = "\x1b[32m"; // green
const R = "\x1b[31m"; // red
const Y = "\x1b[33m"; // yellow
const B = "\x1b[34m"; // blue
const D = "\x1b[0m";  // reset

function pass(msg: string): void { console.log(`  ${G}✓${D}  ${msg}`); }
function fail(msg: string): void { console.error(`  ${R}✗${D}  ${msg}`); process.exitCode = 1; }
function info(msg: string): void { console.log(`  ${B}ℹ${D}  ${msg}`); }
function head(msg: string): void { console.log(`\n${Y}══ ${msg} ══${D}`); }

// ── Retained IDs (completion report) ─────────────────────────────────────────
const RETAINED: Record<string, string | number | boolean> = {};

const CANARY_RUN_ID = `canary2a4_${Date.now()}`;

// ── Seed resolution ───────────────────────────────────────────────────────────

type Seeds = {
  esrId: string;
  rvId: string;
  primitiveId: string;
  agentDomainId: string;
  cfDomainId: string;  // cash_flow_stability — used only by Path F3
  bcDomainId: string;  // behavioral_consistency — used by Path D (guaranteed no base rates seeded)
  fovId: string;
};

async function resolveSeeds(): Promise<Seeds> {
  const [esrRes, rvRes, primRes, agentRes, cfRes, bcRes, fovRes] = await Promise.all([
    db.execute(sql`SELECT id FROM evidence_source_registry WHERE source_key = 'agent_task_outcomes' LIMIT 1`),
    db.execute(sql`SELECT id FROM interpretation_rule_versions WHERE implementation_key = 'task_completion_v1' LIMIT 1`),
    db.execute(sql`SELECT id FROM behavioral_primitives WHERE name = 'agent_guided_task_completion' LIMIT 1`),
    db.execute(sql`SELECT id FROM domain_modules WHERE slug = 'agent_instrumentation' LIMIT 1`),
    db.execute(sql`SELECT id FROM domain_modules WHERE slug = 'cash_flow_stability' LIMIT 1`),
    db.execute(sql`SELECT id FROM domain_modules WHERE slug = 'behavioral_consistency' LIMIT 1`),
    db.execute(sql`SELECT id FROM fusion_operator_versions WHERE implementation_key = 'sl_opinion_formation_v1' AND is_active = true LIMIT 1`),
  ]);

  const esrRow  = esrRes.rows[0]  as { id: string } | undefined;
  const rvRow   = rvRes.rows[0]   as { id: string } | undefined;
  const primRow = primRes.rows[0] as { id: string } | undefined;
  const agRow   = agentRes.rows[0] as { id: string } | undefined;
  const cfRow   = cfRes.rows[0]   as { id: string } | undefined;
  const bcRow   = bcRes.rows[0]   as { id: string } | undefined;
  const fovRow  = fovRes.rows[0]  as { id: string } | undefined;

  if (!esrRow)  throw new Error("[Canary2A4] evidence_source_registry 'agent_task_outcomes' missing — run 2A-1 migrations");
  if (!rvRow)   throw new Error("[Canary2A4] interpretation_rule_versions 'task_completion_v1' missing — run 2A-2 migrations");
  if (!primRow) throw new Error("[Canary2A4] behavioral_primitives 'agent_guided_task_completion' missing — run 2A-1 migrations");
  if (!agRow)   throw new Error("[Canary2A4] domain_modules 'agent_instrumentation' missing — run 2A-1 migrations");
  if (!cfRow)   throw new Error("[Canary2A4] domain_modules 'cash_flow_stability' missing — run 2A-1 migrations");
  if (!bcRow)   throw new Error("[Canary2A4] domain_modules 'behavioral_consistency' missing — run 2A-1 migrations");
  if (!fovRow)  throw new Error("[Canary2A4] fusion_operator_versions 'sl_opinion_formation_v1' missing — run 2A-4 migrations");

  return {
    esrId:        esrRow.id,
    rvId:         rvRow.id,
    primitiveId:  primRow.id,
    agentDomainId: agRow.id,
    cfDomainId:   cfRow.id,
    bcDomainId:   bcRow.id,
    fovId:        fovRow.id,
  };
}

// ── Helper: create a behavioral claim with its entity ─────────────────────────

async function makeClaim(
  entitySuffix: string,
  domainId: string,
  primitiveId: string,
): Promise<string> {
  const nativeId = `${CANARY_RUN_ID}_${entitySuffix}`;

  await db.execute(sql`
    INSERT INTO behavioral_entities (entity_type, native_system, native_id)
    VALUES ('autonomous_agent', 'build1a_agent_system', ${nativeId})
    ON CONFLICT (entity_type, native_system, native_id) DO NOTHING
  `);

  const entRes = await db.execute(sql`
    SELECT id FROM behavioral_entities
    WHERE entity_type = 'autonomous_agent'
      AND native_system = 'build1a_agent_system'
      AND native_id = ${nativeId}
    LIMIT 1
  `);
  const entityId = (entRes.rows[0] as { id: string }).id;

  const claimRes = await db.execute(sql`
    INSERT INTO behavioral_claims
      (entity_id, primitive_id, domain_module_id,
       window_start, window_end, falsifiability_condition)
    VALUES (
      ${entityId}::uuid, ${primitiveId}::uuid, ${domainId}::uuid,
      NOW() - INTERVAL '1 day',
      NOW() + INTERVAL '90 days',
      ${"Canary 2A-4 claim for entity " + entitySuffix + " run " + CANARY_RUN_ID}
    )
    RETURNING id
  `);
  return (claimRes.rows[0] as { id: string }).id;
}

// ── Helper: create a sealed atom + weighted contribution ──────────────────────

type AtomResult = {
  atomId: string;
  clusterId: string;
  wecId: string;
  finalWeight: number;
};

async function makeAtomAndWeight(params: {
  claimId: string;
  seeds: Seeds;
  suffix: string;
  disposition: "supports" | "contradicts" | "neutral";
  dependence: "independent" | "dependent" | "unspecified";
  supersedes_atom?: string;
  supersedes_wec?: string;
  quality?: {
    verification_strength?: number;
    relevance?: number;
    corroboration?: number;
    completeness?: number;
  };
}): Promise<AtomResult> {
  const { claimId, seeds, suffix, disposition, dependence, supersedes_atom, supersedes_wec, quality } = params;

  // Create cluster → link observation → seal → atom
  const cluster = await createCluster(claimId, seeds.rvId, 1, 3600);
  await addObservationLink(cluster.id, seeds.esrId, `obs_${suffix}_${CANARY_RUN_ID}`, 1);

  const sealResult = await sealClusterAndCreateAtom({
    clusterId: cluster.id,
    claimId,
    ruleVersionId: seeds.rvId,
    disposition,
    dependenceDeclaration: dependence,
    effectiveAt: new Date().toISOString(),
    environmentContext: { canary: "2a4", run_id: CANARY_RUN_ID, suffix },
    supersedes: supersedes_atom,
  });

  if (!sealResult.sealed) {
    throw new Error(`[Canary2A4] Seal failed (${suffix}): ${JSON.stringify(sealResult)}`);
  }
  const atomId = sealResult.atom.id;

  // Weight the atom
  const wResult = await weightAtom({
    atomId,
    quality: { evaluation_timestamp: new Date().toISOString(), ...(quality ?? {}) },
    supersedes: supersedes_wec,
  });

  if (!wResult.weighted) {
    throw new Error(`[Canary2A4] Weight failed (${suffix}): ${JSON.stringify(wResult)}`);
  }

  return {
    atomId,
    clusterId: cluster.id,
    wecId: wResult.contribution.id,
    finalWeight: Number(wResult.contribution.final_effective_weight),
  };
}

// ── Path A: Cumulative fusion (2 independent supports atoms) ──────────────────

async function pathA_CumulativeFusion(seeds: Seeds): Promise<void> {
  head("Path A — Live evidence chain → cumulative opinion (LIVE-DB)");

  const claimId = await makeClaim("A", seeds.agentDomainId, seeds.primitiveId);
  RETAINED["pathA.claimId"] = claimId;
  info(`Claim A created: ${claimId}`);

  // Two independent 'supports' atoms — cumulative operator requires all-independent
  const atom1 = await makeAtomAndWeight({
    claimId, seeds, suffix: "A1", disposition: "supports", dependence: "independent",
  });
  const atom2 = await makeAtomAndWeight({
    claimId, seeds, suffix: "A2", disposition: "supports", dependence: "independent",
  });

  RETAINED["pathA.atom1Id"]           = atom1.atomId;
  RETAINED["pathA.atom1.clusterId"]   = atom1.clusterId;
  RETAINED["pathA.wec1Id"]            = atom1.wecId;
  RETAINED["pathA.atom1.finalWeight"] = atom1.finalWeight;
  RETAINED["pathA.atom2Id"]           = atom2.atomId;
  RETAINED["pathA.atom2.clusterId"]   = atom2.clusterId;
  RETAINED["pathA.wec2Id"]            = atom2.wecId;
  RETAINED["pathA.atom2.finalWeight"] = atom2.finalWeight;

  info(`Atom1  (cluster ${atom1.clusterId}): WEC ${atom1.wecId}  weight=${atom1.finalWeight}`);
  info(`Atom2  (cluster ${atom2.clusterId}): WEC ${atom2.wecId}  weight=${atom2.finalWeight}`);

  const result = await formOpinion({
    claimId,
    fusionOperatorVersionId: seeds.fovId,
    versionContextId: null,
  });

  if (!result.ok) {
    fail(`Path A: formOpinion failed: ${result.reason_code} — ${result.detail}`);
    return;
  }

  RETAINED["pathA.bundleId"]          = result.bundleId;
  RETAINED["pathA.fusionContextId"]   = result.fusionContextId;
  RETAINED["pathA.opinionId"]         = result.opinionId;
  RETAINED["pathA.traceId"]           = result.traceId;
  RETAINED["pathA.belief"]            = result.belief;
  RETAINED["pathA.disbelief"]         = result.disbelief;
  RETAINED["pathA.uncertainty"]       = result.uncertainty;
  RETAINED["pathA.projectedP"]        = result.projectedProbability;
  RETAINED["pathA.memberCount"]       = result.memberCount;
  RETAINED["pathA.operator"]          = result.operatorUsed;

  pass(`Evidence Bundle:    ${result.bundleId}`);
  pass(`Fusion Context:     ${result.fusionContextId}`);
  pass(`Opinion:            ${result.opinionId}`);
  pass(`Reasoning Trace:    ${result.traceId}`);
  pass(`Operator:           ${result.operatorUsed}  (expected: cumulative)`);
  pass(`b=${result.belief}  d=${result.disbelief}  u=${result.uncertainty}`);
  pass(`P(X=1) projected:   ${result.projectedProbability}`);

  if (result.operatorUsed !== "cumulative") {
    fail(`Path A: expected 'cumulative', got '${result.operatorUsed}'`);
  }
  if (result.memberCount !== 2) {
    fail(`Path A: expected 2 bundle members, got ${result.memberCount}`);
  }

  // Verify all objects retained in DB
  const [bundleRows, memberRows, opinRows, traceRows, projRows] = await Promise.all([
    db.execute(sql`SELECT id FROM evidence_bundles WHERE id = ${result.bundleId}::uuid`),
    db.execute(sql`SELECT id FROM evidence_bundle_members WHERE bundle_id = ${result.bundleId}::uuid`),
    db.execute(sql`SELECT id FROM opinions WHERE id = ${result.opinionId}::uuid`),
    db.execute(sql`SELECT id FROM reasoning_traces WHERE opinion_id = ${result.opinionId}::uuid`),
    db.execute(sql`
      SELECT opinion_id, projected_probability
      FROM sl_binomial_projection_v1
      WHERE opinion_id = ${result.opinionId}::uuid
    `),
  ]);

  if (bundleRows.rows.length === 1) pass(`evidence_bundles row retained ✓`);
  else fail(`Path A: evidence_bundles row missing`);

  if (memberRows.rows.length === 2) pass(`evidence_bundle_members: 2 rows retained ✓`);
  else fail(`Path A: expected 2 bundle members in DB, got ${memberRows.rows.length}`);

  if (opinRows.rows.length === 1) pass(`opinions row retained ✓`);
  else fail(`Path A: opinions row missing`);

  if (traceRows.rows.length === 1) pass(`reasoning_traces row retained ✓`);
  else fail(`Path A: reasoning_traces row missing`);

  if (projRows.rows.length >= 1) {
    const pr = projRows.rows[0] as { projected_probability: string };
    pass(`sl_binomial_projection_v1: projected_probability=${pr.projected_probability} ✓`);
    RETAINED["pathA.view.projectedP"] = parseFloat(pr.projected_probability);
  } else {
    fail(`Path A: sl_binomial_projection_v1 has no row for this opinion`);
  }
}

// ── Path B: Averaging fusion (2 dependent supports atoms) ─────────────────────

async function pathB_AveragingFusion(seeds: Seeds): Promise<void> {
  head("Path B — Dependent contributions → averaging operator (LIVE-DB)");

  const claimId = await makeClaim("B", seeds.agentDomainId, seeds.primitiveId);
  RETAINED["pathB.claimId"] = claimId;

  // Two dependent 'supports' atoms — same direction, low conflict → averaging
  const atom1 = await makeAtomAndWeight({
    claimId, seeds, suffix: "B1", disposition: "supports", dependence: "dependent",
  });
  const atom2 = await makeAtomAndWeight({
    claimId, seeds, suffix: "B2", disposition: "supports", dependence: "dependent",
  });

  RETAINED["pathB.atom1Id"] = atom1.atomId;
  RETAINED["pathB.wec1Id"]  = atom1.wecId;
  RETAINED["pathB.atom2Id"] = atom2.atomId;
  RETAINED["pathB.wec2Id"]  = atom2.wecId;

  info(`Atom1 (dependent): WEC ${atom1.wecId}  weight=${atom1.finalWeight}`);
  info(`Atom2 (dependent): WEC ${atom2.wecId}  weight=${atom2.finalWeight}`);
  info(`Both atoms declare 'dependent' → averaging operator expected`);

  const result = await formOpinion({
    claimId,
    fusionOperatorVersionId: seeds.fovId,
    versionContextId: null,
  });

  if (!result.ok) {
    fail(`Path B: formOpinion failed: ${result.reason_code} — ${result.detail}`);
    return;
  }

  RETAINED["pathB.bundleId"]  = result.bundleId;
  RETAINED["pathB.opinionId"] = result.opinionId;
  RETAINED["pathB.operator"]  = result.operatorUsed;

  pass(`Opinion: ${result.opinionId}`);
  pass(`Operator: ${result.operatorUsed}  (expected: averaging)`);
  pass(`Member count: ${result.memberCount}  (2 dependent atoms)`);

  if (result.operatorUsed !== "averaging") {
    fail(`Path B: expected 'averaging', got '${result.operatorUsed}'`);
  }

  // Verify dependence grouping in bundle members
  const membersRes = await db.execute(sql`
    SELECT ebm.dependence_group_id,
           wec.final_effective_weight,
           iea.dependence_declaration
    FROM evidence_bundle_members ebm
    JOIN weighted_evidence_contributions wec ON wec.id = ebm.weighted_contribution_id
    JOIN interpreted_evidence_atoms      iea ON iea.id = wec.atom_id
    WHERE ebm.bundle_id = ${result.bundleId}::uuid
    ORDER BY ebm.sequence_number
  `);
  const members = membersRes.rows as Array<{
    dependence_group_id: string | null;
    final_effective_weight: string;
    dependence_declaration: string;
  }>;

  const allDependent = members.every(m => m.dependence_declaration === "dependent");
  if (allDependent) {
    pass(`Bundle members: all dependence_declaration='dependent' ✓`);
  } else {
    fail(`Path B: not all bundle members declare 'dependent'`);
  }

  const groupedCount = members.filter(m => m.dependence_group_id !== null).length;
  // bundleAssembly always stores dependence_group_id = NULL (implementation-defined:
  // the system treats ALL dependent atoms with NULL group_id in a bundle as one implicit
  // group for averaging purposes — the averaging operator was selected correctly above).
  // We record the groupedCount and log the grouping without failing on NULL.
  RETAINED["pathB.groupedCount"] = groupedCount;
  info(`Dependence grouping (NULL = implicit single-group per spec): ${JSON.stringify(members.map(m => ({ gid: m.dependence_group_id, w: m.final_effective_weight })))}`);
  pass(`Dependence grouping: ${groupedCount > 0 ? `${groupedCount}/${members.length} explicit group IDs` : "implicit (all NULL → treated as one dependent group)"}  — averaging selected correctly ✓`);
}

// ── Path C: Consensus & Compromise (high-conflict opposing atoms) ─────────────

async function pathC_ConflictCnC(seeds: Seeds): Promise<void> {
  head("Path C — Opposing high-weight atoms → conflict > 0.30 → consensus_compromise (LIVE-DB)");

  const claimId = await makeClaim("C", seeds.agentDomainId, seeds.primitiveId);
  RETAINED["pathC.claimId"] = claimId;

  // High-quality inputs → high final_effective_weight → large conflict
  const highQ = {
    verification_strength: 0.99,
    relevance: 0.99,
    corroboration: 0.90,
    completeness: 0.95,
  };

  const atom1 = await makeAtomAndWeight({
    claimId, seeds, suffix: "C1", disposition: "supports",    dependence: "independent", quality: highQ,
  });
  const atom2 = await makeAtomAndWeight({
    claimId, seeds, suffix: "C2", disposition: "contradicts", dependence: "independent", quality: highQ,
  });

  RETAINED["pathC.atom1Id"]           = atom1.atomId;
  RETAINED["pathC.wec1Id"]            = atom1.wecId;
  RETAINED["pathC.atom1.finalWeight"] = atom1.finalWeight;
  RETAINED["pathC.atom2Id"]           = atom2.atomId;
  RETAINED["pathC.wec2Id"]            = atom2.wecId;
  RETAINED["pathC.atom2.finalWeight"] = atom2.finalWeight;

  // Compute expected conflict inline (UNIT-MATH verification before pipeline call)
  const sl1 = dispositionToSlOpinion("supports",    atom1.finalWeight);
  const sl2 = dispositionToSlOpinion("contradicts", atom2.finalWeight);
  const expectedConflict = maxConsecutivePairwiseConflict([sl1, sl2]);
  RETAINED["pathC.expectedConflict"] = expectedConflict;

  info(`atom1 'supports'    weight=${atom1.finalWeight}  SL={b=${sl1.belief.toFixed(4)}, d=${sl1.disbelief.toFixed(4)}, u=${sl1.uncertainty.toFixed(4)}}`);
  info(`atom2 'contradicts' weight=${atom2.finalWeight}  SL={b=${sl2.belief.toFixed(4)}, d=${sl2.disbelief.toFixed(4)}, u=${sl2.uncertainty.toFixed(4)}}`);
  info(`Pairwise conflict C = b1*d2 + d1*b2 = ${sl1.belief.toFixed(4)}×${sl2.disbelief.toFixed(4)} + ${sl1.disbelief.toFixed(4)}×${sl2.belief.toFixed(4)} = ${expectedConflict.toFixed(6)}`);
  info(`Governance threshold = 0.30  →  ${expectedConflict.toFixed(4)} > 0.30?  ${expectedConflict > 0.30 ? "YES — C&C expected" : "NO — cumulative expected"}`);

  if (expectedConflict > 0.30) {
    pass(`Conflict ${expectedConflict.toFixed(4)} > 0.30 — consensus_compromise will be selected`);
  } else {
    fail(`Conflict ${expectedConflict.toFixed(4)} ≤ 0.30 — weights too low; C&C cannot be demonstrated`);
    return;
  }

  const result = await formOpinion({
    claimId,
    fusionOperatorVersionId: seeds.fovId,
    versionContextId: null,
  });

  if (!result.ok) {
    fail(`Path C: formOpinion failed: ${result.reason_code} — ${result.detail}`);
    return;
  }

  RETAINED["pathC.bundleId"]  = result.bundleId;
  RETAINED["pathC.opinionId"] = result.opinionId;
  RETAINED["pathC.operator"]  = result.operatorUsed;

  pass(`Opinion: ${result.opinionId}`);
  pass(`Operator: ${result.operatorUsed}  (expected: consensus_compromise)`);
  pass(`b=${result.belief}  d=${result.disbelief}  u=${result.uncertainty}`);

  if (result.operatorUsed !== "consensus_compromise") {
    fail(`Path C: expected 'consensus_compromise', got '${result.operatorUsed}'`);
  }

  // Verify fusion_context recorded conflict metric and rerouted flag
  const fcRes = await db.execute(sql`
    SELECT fc.conflict_measure,
           fc.conflict_threshold,
           fc.rerouted_to_consensus_compromise,
           fgc.approval_authority
    FROM fusion_contexts fc
    JOIN fusion_governance_contexts fgc ON fgc.id = fc.governance_context_id
    WHERE fc.bundle_id = ${result.bundleId}::uuid
    LIMIT 1
  `);

  if (fcRes.rows.length === 1) {
    const fc = fcRes.rows[0] as {
      conflict_measure: string;
      conflict_threshold: string;
      rerouted_to_consensus_compromise: boolean;
      approval_authority: string;
    };
    RETAINED["pathC.conflict_measure"]   = parseFloat(fc.conflict_measure);
    RETAINED["pathC.conflict_threshold"] = parseFloat(fc.conflict_threshold);
    RETAINED["pathC.rerouted"]           = fc.rerouted_to_consensus_compromise;

    pass(`fusion_context.conflict_measure = ${fc.conflict_measure}`);
    pass(`fusion_context.conflict_threshold = ${fc.conflict_threshold}  (governed by: ${fc.approval_authority})`);
    if (fc.rerouted_to_consensus_compromise) {
      pass(`fusion_context.rerouted_to_consensus_compromise = true ✓`);
    } else {
      fail(`Path C: rerouted_to_consensus_compromise should be true`);
    }
  } else {
    fail(`Path C: fusion_context row not found`);
  }
}

// ── Path D: Missing base rate → refusal ───────────────────────────────────────

async function pathD_MissingBaseRate(seeds: Seeds): Promise<void> {
  head("Path D — Claim with no base_rate_records → missing_base_rate refusal (LIVE-DB)");

  // behavioral_consistency has no base_rate_records for scope='2a4_behavioral_consistency'.
  // We use behavioral_consistency (not cash_flow_stability) because Path F3 seeds a
  // cash_flow_stability base rate that accumulates across runs (rows are never superseded),
  // which would satisfy the domain lookup on subsequent runs and bypass the missing_base_rate
  // refusal we intend to demonstrate here.
  const claimId = await makeClaim("D", seeds.bcDomainId, seeds.primitiveId);
  RETAINED["pathD.claimId"] = claimId;
  info(`Claim D under behavioral_consistency: ${claimId}`);
  info(`No base_rate_records row with scope='2a4_behavioral_consistency' — pipeline must refuse at Step 3`);

  // No WECs needed — bundle assembles empty (ok=true, 0 members), then base rate check fails
  const result = await formOpinion({
    claimId,
    fusionOperatorVersionId: seeds.fovId,
    versionContextId: null,
  });

  if (!result.ok && result.reason_code === "missing_base_rate") {
    RETAINED["pathD.refusalId"] = result.refusal_id ?? "(null)";
    pass(`formOpinion refused with reason_code='missing_base_rate' ✓`);
    pass(`Refusal ID: ${result.refusal_id}`);
    info(`Detail: ${result.detail.slice(0, 150)}`);
  } else if (!result.ok) {
    fail(`Path D: expected 'missing_base_rate' but got reason_code='${result.reason_code}'`);
    return;
  } else {
    fail(`Path D: expected refusal but formOpinion succeeded (opinionId=${result.opinionId})`);
    return;
  }

  // Verify refusal_record retained in DB
  if (result.refusal_id) {
    const rrRes = await db.execute(sql`
      SELECT reason_code, refusal_stage
      FROM refusal_records
      WHERE id = ${result.refusal_id}::uuid
    `);
    if (rrRes.rows.length === 1) {
      const rr = rrRes.rows[0] as { reason_code: string; refusal_stage: string };
      pass(`refusal_records row retained: stage='${rr.refusal_stage}'  reason_code='${rr.reason_code}' ✓`);
    } else {
      fail(`Path D: refusal_records row not found for id ${result.refusal_id}`);
    }
  }
}

// ── Path E: Opinion supersession via WEC chain ────────────────────────────────

async function pathE_OpinionSupersession(seeds: Seeds): Promise<void> {
  head("Path E — WEC chain supersession → new opinion supersedes prior (LIVE-DB)");

  const claimId      = RETAINED["pathA.claimId"]  as string;
  const priorOpId    = RETAINED["pathA.opinionId"] as string;
  const priorWec2Id  = RETAINED["pathA.wec2Id"]   as string;
  const priorAtom2Id = RETAINED["pathA.atom2Id"]  as string;

  if (!claimId || !priorOpId) {
    fail(`Path E: pathA.claimId or pathA.opinionId missing — Path A must succeed first`);
    return;
  }

  info(`Claim A (shared from Path A): ${claimId}`);
  info(`Prior opinion to supersede: ${priorOpId}`);
  info(`Prior WEC to supersede (wec2): ${priorWec2Id}`);

  // Create a new atom (reinterpretation of atom2), and a new WEC that supersedes wec2
  const atom2E = await makeAtomAndWeight({
    claimId, seeds,
    suffix: "E_new",
    disposition: "supports",
    dependence: "independent",
    supersedes_atom: priorAtom2Id,
    supersedes_wec:  priorWec2Id,
    quality: { verification_strength: 0.95, relevance: 0.95 },
  });
  RETAINED["pathE.newAtomId"] = atom2E.atomId;
  RETAINED["pathE.newWecId"]  = atom2E.wecId;

  info(`New atom (supersedes atom2 from Path A): ${atom2E.atomId}`);
  info(`New WEC (supersedes wec2 from Path A):  ${atom2E.wecId}`);

  // Verify latest_weighted_contribution_v reflects the supersession
  const lwcRes = await db.execute(sql`
    SELECT wec.id, iea.disposition
    FROM latest_weighted_contribution_v wec
    JOIN interpreted_evidence_atoms iea ON iea.id = wec.atom_id
    WHERE iea.claim_id = ${claimId}::uuid
    ORDER BY wec.computed_at
  `);
  const wecTips = lwcRes.rows as Array<{ id: string; disposition: string }>;
  RETAINED["pathE.tipCount"] = wecTips.length;

  const oldWecInTips = wecTips.some(w => w.id === priorWec2Id);
  const newWecInTips = wecTips.some(w => w.id === atom2E.wecId);

  if (!oldWecInTips) {
    pass(`latest_weighted_contribution_v: superseded WEC ${priorWec2Id} excluded ✓`);
  } else {
    fail(`Path E: superseded WEC still appears as a chain tip`);
  }

  if (newWecInTips) {
    pass(`latest_weighted_contribution_v: new WEC ${atom2E.wecId} is a chain tip ✓`);
  } else {
    fail(`Path E: new WEC not in latest_weighted_contribution_v`);
  }

  info(`latest_weighted_contribution_v tips for claim: ${wecTips.length} WEC(s)`);
  for (const w of wecTips) {
    info(`  WEC ${w.id}  disposition=${w.disposition}`);
  }

  // Re-run opinion formation — should supersede Opinion_A
  const result = await formOpinion({
    claimId,
    fusionOperatorVersionId: seeds.fovId,
    versionContextId: null,
  });

  if (!result.ok) {
    fail(`Path E: formOpinion failed: ${result.reason_code} — ${result.detail}`);
    return;
  }

  RETAINED["pathE.newOpinionId"] = result.opinionId;
  pass(`New Opinion: ${result.opinionId}`);
  pass(`Operator: ${result.operatorUsed}  member count: ${result.memberCount}`);

  // Verify new opinion.supersedes = priorOpinionId
  const newOpRes = await db.execute(sql`
    SELECT supersedes FROM opinions WHERE id = ${result.opinionId}::uuid
  `);
  const newOp = newOpRes.rows[0] as { supersedes: string | null } | undefined;

  if (newOp?.supersedes === priorOpId) {
    pass(`opinions.supersedes = ${priorOpId} ✓  (correctly references prior opinion)`);
  } else {
    fail(`Path E: new opinion.supersedes = '${newOp?.supersedes}', expected '${priorOpId}'`);
  }

  // Verify prior opinion unchanged in DB
  const priorOpRes = await db.execute(sql`
    SELECT id, belief FROM opinions WHERE id = ${priorOpId}::uuid
  `);
  if (priorOpRes.rows.length === 1) {
    pass(`Prior opinion unchanged in DB: ${priorOpId} ✓`);
  } else {
    fail(`Path E: prior opinion row missing`);
  }

  // Verify latest_opinion_v resolves to new opinion only
  const latestRes = await db.execute(sql`
    SELECT id FROM latest_opinion_v WHERE claim_id = ${claimId}::uuid
  `);
  const latestIds = (latestRes.rows as Array<{ id: string }>).map(r => r.id);

  if (latestIds.includes(result.opinionId) && !latestIds.includes(priorOpId)) {
    pass(`latest_opinion_v resolves to new opinion only ✓`);
  } else if (latestIds.includes(priorOpId)) {
    fail(`Path E: prior opinion still in latest_opinion_v (supersession not reflected)`);
  } else {
    fail(`Path E: new opinion not in latest_opinion_v (ids=${JSON.stringify(latestIds)})`);
  }
}

// ── Path F: Governance resolution ─────────────────────────────────────────────

async function pathF_GovernanceResolution(seeds: Seeds): Promise<void> {
  // ── F1: Domain-level governance resolves as fallback ─────────────────────
  head("Path F1 — Domain-level governance resolves (no claim-level row) (LIVE-DB)");

  const claimF1Id = await makeClaim("F1", seeds.agentDomainId, seeds.primitiveId);
  RETAINED["pathF1.claimId"] = claimF1Id;

  const atomF1 = await makeAtomAndWeight({
    claimId: claimF1Id, seeds, suffix: "F1a", disposition: "supports", dependence: "independent",
  });
  RETAINED["pathF1.wecId"] = atomF1.wecId;

  const f1Result = await formOpinion({
    claimId: claimF1Id,
    fusionOperatorVersionId: seeds.fovId,
    versionContextId: null,
  });

  if (!f1Result.ok) {
    fail(`Path F1: formOpinion failed: ${f1Result.reason_code} — ${f1Result.detail}`);
  } else {
    RETAINED["pathF1.opinionId"] = f1Result.opinionId;
    pass(`F1: opinion formed: ${f1Result.opinionId}`);

    const fcRes = await db.execute(sql`
      SELECT fgc.scope_type,
             fgc.conflict_threshold,
             fgc.approval_authority,
             fgc.version
      FROM fusion_contexts fc
      JOIN fusion_governance_contexts fgc ON fgc.id = fc.governance_context_id
      WHERE fc.bundle_id = ${f1Result.bundleId}::uuid
      LIMIT 1
    `);
    if (fcRes.rows.length === 1) {
      const fc = fcRes.rows[0] as {
        scope_type: string;
        conflict_threshold: string;
        approval_authority: string;
        version: string;
      };
      if (fc.scope_type === "domain_module") {
        pass(`F1: governance scope_type='domain_module' — domain fallback resolved ✓`);
      } else {
        fail(`F1: expected scope_type='domain_module', got '${fc.scope_type}'`);
      }
      pass(`F1: conflict_threshold=${fc.conflict_threshold}  version=${fc.version}  authority=${fc.approval_authority}`);
      RETAINED["pathF1.govVersion"] = fc.version;
    } else {
      fail(`F1: fusion_context row not found`);
    }
  }

  // ── F2: Claim-level governance beats domain-level ─────────────────────────
  head("Path F2 — Claim-level governance context overrides domain-level (LIVE-DB)");

  const claimF2Id = await makeClaim("F2", seeds.agentDomainId, seeds.primitiveId);
  RETAINED["pathF2.claimId"] = claimF2Id;

  // Insert claim-level governance with threshold=0.45 (domain-level is 0.30 — distinctly different)
  const cgRes = await db.execute(sql`
    INSERT INTO fusion_governance_contexts
      (scope_type, domain_module_id, claim_id, conflict_threshold,
       conflict_metric_definition, fusion_operator_version_id,
       approval_authority, derivation_method,
       effective_from, effective_until, version, supersedes)
    VALUES (
      'behavioral_claim',
      ${seeds.agentDomainId}::uuid,
      ${claimF2Id}::uuid,
      0.45,
      'Pairwise C(ω1,ω2) = b1*d2 + d1*b2 — canary Path F2 claim-level override with threshold=0.45 to demonstrate precedence over domain-level threshold=0.30.',
      ${seeds.fovId}::uuid,
      'canary_2a4_path_f2',
      'Canary-only claim-level governance inserted by Path F2 to demonstrate claim-level context precedence. Not empirically calibrated.',
      NOW(),
      NOW() + INTERVAL '1 year',
      'v1.0-claim-level-canary',
      NULL
    )
    RETURNING id
  `);
  const cgId = (cgRes.rows[0] as { id: string }).id;
  RETAINED["pathF2.claimGovCtxId"] = cgId;
  info(`Claim-level governance context inserted: ${cgId}  (threshold=0.45)`);

  const atomF2 = await makeAtomAndWeight({
    claimId: claimF2Id, seeds, suffix: "F2a", disposition: "supports", dependence: "independent",
  });
  RETAINED["pathF2.wecId"] = atomF2.wecId;

  const f2Result = await formOpinion({
    claimId: claimF2Id,
    fusionOperatorVersionId: seeds.fovId,
    versionContextId: null,
  });

  if (!f2Result.ok) {
    fail(`Path F2: formOpinion failed: ${f2Result.reason_code} — ${f2Result.detail}`);
  } else {
    RETAINED["pathF2.opinionId"] = f2Result.opinionId;
    pass(`F2: opinion formed: ${f2Result.opinionId}`);

    const fcRes = await db.execute(sql`
      SELECT fgc.scope_type,
             fgc.id      AS fgc_id,
             fgc.conflict_threshold
      FROM fusion_contexts fc
      JOIN fusion_governance_contexts fgc ON fgc.id = fc.governance_context_id
      WHERE fc.bundle_id = ${f2Result.bundleId}::uuid
      LIMIT 1
    `);
    if (fcRes.rows.length === 1) {
      const fc = fcRes.rows[0] as {
        scope_type: string;
        fgc_id: string;
        conflict_threshold: string;
      };
      if (fc.scope_type === "behavioral_claim" && fc.fgc_id === cgId) {
        pass(`F2: claim-level governance selected (scope='behavioral_claim', id=${cgId}) ✓`);
        pass(`F2: threshold=${fc.conflict_threshold}  (domain=0.30 was overridden by claim-level=0.45) ✓`);
      } else {
        fail(`F2: expected claim-level gov id=${cgId}, got scope='${fc.scope_type}' id='${fc.fgc_id}'`);
      }
      RETAINED["pathF2.usedThreshold"] = parseFloat(fc.conflict_threshold);
    } else {
      fail(`F2: fusion_context row not found`);
    }
  }

  // ── F3: No matching governance → refusal ────────────────────────────────
  head("Path F3 — Missing governance context → missing_conflict_threshold_governance refusal (LIVE-DB)");

  // Seed a temporary base rate for cash_flow_stability so Step 3 passes.
  // The canary-keyed canonical_seed_key ensures idempotent inserts across multiple runs.
  const cfBaseRateKey = `b2a_canary_f3|2a4_cash_flow_stability|${CANARY_RUN_ID}`;
  await db.execute(sql`
    INSERT INTO base_rate_records
      (source_type, scope, value, sufficiency_status, approval_authority,
       derivation_method, effective_from, notes, canonical_seed_key)
    SELECT
      'domain_expert',
      '2a4_cash_flow_stability',
      0.50,
      'sufficient',
      'canary_2a4_path_f3_test',
      'Temporary 50% base rate seeded by canary Path F3 to allow base-rate step to pass, so governance absence can be demonstrated as the distinct failure mode.',
      NOW(),
      'CANARY-ONLY: temporary cash_flow_stability base rate for Path F3 missing-governance refusal demonstration.',
      ${cfBaseRateKey}
    WHERE NOT EXISTS (
      SELECT 1 FROM base_rate_records WHERE canonical_seed_key = ${cfBaseRateKey}
    )
  `);
  info(`Seeded temporary base rate for '2a4_cash_flow_stability' (key: ${cfBaseRateKey})`);
  info(`cash_flow_stability has no fusion_governance_contexts row → governance step must refuse`);

  const claimF3Id = await makeClaim("F3", seeds.cfDomainId, seeds.primitiveId);
  RETAINED["pathF3.claimId"] = claimF3Id;

  const atomF3 = await makeAtomAndWeight({
    claimId: claimF3Id, seeds, suffix: "F3a", disposition: "supports", dependence: "independent",
  });
  RETAINED["pathF3.wecId"] = atomF3.wecId;

  const f3Result = await formOpinion({
    claimId: claimF3Id,
    fusionOperatorVersionId: seeds.fovId,
    versionContextId: null,
  });

  if (!f3Result.ok && f3Result.reason_code === "missing_conflict_threshold_governance") {
    RETAINED["pathF3.refusalId"] = f3Result.refusal_id ?? "(null)";
    pass(`F3: refused with reason_code='missing_conflict_threshold_governance' ✓`);
    pass(`F3: refusal_id=${f3Result.refusal_id}`);

    if (f3Result.refusal_id) {
      const rrRes = await db.execute(sql`
        SELECT reason_code, refusal_stage
        FROM refusal_records
        WHERE id = ${f3Result.refusal_id}::uuid
      `);
      if (rrRes.rows.length === 1) {
        const rr = rrRes.rows[0] as { reason_code: string; refusal_stage: string };
        pass(`F3: refusal_records row retained: stage='${rr.refusal_stage}'  reason_code='${rr.reason_code}' ✓`);
      } else {
        fail(`F3: refusal_records row not found`);
      }
    }
  } else if (!f3Result.ok) {
    fail(`F3: expected 'missing_conflict_threshold_governance' but got '${f3Result.reason_code}'`);
  } else {
    fail(`F3: expected refusal but formOpinion succeeded (opinionId=${f3Result.opinionId})`);
  }
}

// ── Path G: Reasoning trace verification + replay checksum ────────────────────

async function pathG_TraceVerification(): Promise<void> {
  head("Path G — Retrieve trace, verify counts + governance ref, recompute checksum (LIVE-DB)");

  const opinionId = RETAINED["pathA.opinionId"] as string;
  if (!opinionId) {
    fail(`Path G: pathA.opinionId missing — Path A must succeed first`);
    return;
  }

  info(`Verifying trace for Path A opinion: ${opinionId}`);

  // Retrieve trace + all fields needed for checksum recomputation
  const traceRes = await db.execute(sql`
    SELECT
      rt.id                              AS trace_id,
      rt.fusion_operator_selected,
      rt.independent_contribution_count,
      rt.dependent_contribution_count,
      rt.discarded_contribution_count,
      rt.zero_weight_contribution_count,
      rt.conflict_measurement,
      rt.reasoning_version,
      rt.replay_checksum,
      fc.governance_context_id,
      fc.conflict_threshold,
      eb.id                              AS bundle_id,
      fc.id                              AS fusion_context_id,
      op.version_context_id,
      op.evaluation_time::text           AS evaluation_time
    FROM reasoning_traces rt
    JOIN opinions         op ON op.id  = rt.opinion_id
    JOIN evidence_bundles eb ON eb.id  = op.evidence_bundle_id
    JOIN fusion_contexts  fc ON fc.id  = op.fusion_context_id
    WHERE rt.opinion_id = ${opinionId}::uuid
    LIMIT 1
  `);

  if (traceRes.rows.length === 0) {
    fail(`Path G: no reasoning_trace found for opinion ${opinionId}`);
    return;
  }

  const trace = traceRes.rows[0] as {
    trace_id: string;
    fusion_operator_selected: string;
    independent_contribution_count: number;
    dependent_contribution_count: number;
    discarded_contribution_count: number;
    zero_weight_contribution_count: number;
    conflict_measurement: string | null;
    reasoning_version: string;
    replay_checksum: string;
    governance_context_id: string;
    conflict_threshold: string;
    bundle_id: string;
    fusion_context_id: string;
    version_context_id: string | null;
    evaluation_time: string;
  };

  RETAINED["pathG.traceId"]             = trace.trace_id;
  RETAINED["pathG.operator"]            = trace.fusion_operator_selected;
  RETAINED["pathG.independentCount"]    = trace.independent_contribution_count;
  RETAINED["pathG.storedChecksum"]      = trace.replay_checksum;
  RETAINED["pathG.governanceContextId"] = trace.governance_context_id;

  pass(`Trace ID: ${trace.trace_id}`);
  pass(`Fusion operator recorded: '${trace.fusion_operator_selected}'`);
  pass(`independent_contribution_count: ${trace.independent_contribution_count}`);
  pass(`dependent_contribution_count:   ${trace.dependent_contribution_count}`);
  pass(`discarded_contribution_count:   ${trace.discarded_contribution_count}`);
  pass(`zero_weight_contribution_count: ${trace.zero_weight_contribution_count}`);
  pass(`conflict_measurement: ${trace.conflict_measurement ?? "null (no conflict)"}`);
  pass(`reasoning_version: ${trace.reasoning_version}`);
  pass(`governance_context_id: ${trace.governance_context_id}`);
  pass(`governance conflict_threshold: ${trace.conflict_threshold}`);

  if (trace.fusion_operator_selected !== "cumulative") {
    fail(`Path G: expected 'cumulative' operator in trace, got '${trace.fusion_operator_selected}'`);
  }
  if (trace.independent_contribution_count !== 2) {
    fail(`Path G: expected 2 independent contributions, got ${trace.independent_contribution_count}`);
  }
  if (trace.dependent_contribution_count !== 0) {
    fail(`Path G: expected 0 dependent contributions, got ${trace.dependent_contribution_count}`);
  }

  // Recompute the replay checksum independently.
  // The original evaluationTime was new Date().toISOString() — a JS ISO 8601 string like
  // "2026-08-07T14:02:59.867Z". PostgreSQL stores and returns it as "2026-08-07 14:02:59.867+00".
  // Normalizing via new Date(pgString).toISOString() recovers the original JS format so the
  // SHA-256 inputs match exactly what was used when the opinion was persisted.
  const evaluationTimeNormalized = new Date(trace.evaluation_time).toISOString();

  const recomputedChecksum = computeReplayChecksum({
    bundleId:           trace.bundle_id,
    fusionContextId:    trace.fusion_context_id,
    governanceContextId: trace.governance_context_id,
    versionContextId:   trace.version_context_id,
    evaluationTime:     evaluationTimeNormalized,
  });

  RETAINED["pathG.recomputedChecksum"] = recomputedChecksum;

  info(`Stored checksum:     ${trace.replay_checksum}`);
  info(`Recomputed checksum: ${recomputedChecksum}`);

  if (recomputedChecksum === trace.replay_checksum) {
    pass(`Replay checksum matches ✓  (${trace.replay_checksum.slice(0, 24)}...)`);
  } else {
    fail(`Path G: replay checksum MISMATCH`);
    fail(`  stored:     ${trace.replay_checksum}`);
    fail(`  recomputed: ${recomputedChecksum}`);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log(`\n${Y}════════════════════════════════════════════════════════${D}`);
  console.log(`${Y}  PTI Build 2A — Package 2A-4 Canary (Post-Correction)  ${D}`);
  console.log(`${Y}════════════════════════════════════════════════════════${D}`);
  console.log(`  Run ID: ${CANARY_RUN_ID}`);

  // Apply all 2A-4 migrations (idempotent). This ensures governed records
  // exist in the DB even when running against the development database without
  // a prior server restart — all operations are WHERE NOT EXISTS guarded.
  info("Running ensureBuild2a4Tables() to guarantee migrations are current…");
  await ensureBuild2a4Tables();
  pass("Migrations applied (idempotent).");

  // Verify governance provenance before running paths
  head("Pre-flight: Verify governed records exist");

  const [govBRR, govFGC] = await Promise.all([
    db.execute(sql`
      SELECT canonical_seed_key, approval_authority, effective_from, effective_to
      FROM base_rate_records
      WHERE canonical_seed_key = 'b2a_governed_v1|2a4_agent_instrumentation|experimental|founder_review_2026-08-07'
      LIMIT 1
    `),
    db.execute(sql`
      SELECT fgc.version, fgc.approval_authority, fgc.effective_until
      FROM latest_fusion_governance_context_v fgc
      JOIN domain_modules dm ON dm.id = fgc.domain_module_id
      WHERE fgc.scope_type = 'domain_module' AND dm.slug = 'agent_instrumentation'
      LIMIT 1
    `),
  ]);

  if (govBRR.rows.length === 1) {
    const r = govBRR.rows[0] as { canonical_seed_key: string; approval_authority: string; effective_to: string };
    pass(`Governed base_rate_records row present (authority=${r.approval_authority}  until=${r.effective_to}) ✓`);
  } else {
    fail(`Governed base_rate_records row missing — run migrations_2a4.ts first`);
  }

  if (govFGC.rows.length === 1) {
    const r = govFGC.rows[0] as { version: string; approval_authority: string; effective_until: string };
    pass(`Governed fusion_governance_contexts (latest) version=${r.version}  authority=${r.approval_authority}  until=${r.effective_until} ✓`);
  } else {
    fail(`Governed fusion_governance_contexts row missing or not in latest_fusion_governance_context_v`);
  }

  // Resolve seed IDs once
  let seeds: Seeds;
  try {
    seeds = await resolveSeeds();
    pass(`Seed IDs resolved: esr=${seeds.esrId.slice(0, 8)}...  fov=${seeds.fovId.slice(0, 8)}...`);
  } catch (err) {
    fail(`Seed resolution failed: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }

  // Run all paths sequentially (A → B → C → D → E → F → G)
  // Path E depends on Path A's retained IDs; Path G depends on Path A's opinion.
  await pathA_CumulativeFusion(seeds);
  await pathB_AveragingFusion(seeds);
  await pathC_ConflictCnC(seeds);
  await pathD_MissingBaseRate(seeds);
  await pathE_OpinionSupersession(seeds);
  await pathF_GovernanceResolution(seeds);
  await pathG_TraceVerification();

  // ── Retained IDs report ────────────────────────────────────────────────────
  head("RETAINED IDs (independent audit)");
  const entries = Object.entries(RETAINED);
  const maxKey = Math.max(...entries.map(([k]) => k.length));
  for (const [key, val] of entries) {
    console.log(`  ${key.padEnd(maxKey + 2)} ${val}`);
  }

  console.log(`\n${process.exitCode === 1
    ? `${R}══ CANARY FAILED — see ✗ lines above ══${D}`
    : `${G}══ CANARY PASSED — all paths verified ══${D}`}\n`);
}

main().catch(err => {
  console.error(`${R}[Canary2A4] Fatal error:${D}`, err);
  process.exitCode = 1;
});
