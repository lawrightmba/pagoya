/**
 * Build 2A Package 2A-2 Canary
 *
 * Run: pnpm --filter @workspace/api-server exec tsx src/services/build2a/canary_2a2.ts
 *
 * Exercises 3 end-to-end paths and retains all evidence (no cleanup).
 * Identifiers are prefixed b2a_canary_<timestamp>.
 *
 * Path 1: Successful interpretation → atom created
 * Path 2: Refusal path (unknown implementationKey)
 * Path 3: Incomplete cluster → timeout → abandoned
 */

import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { createCluster, addObservationLink, abandonTimedOutClusters } from "./clusterAssembly.js";
import { interpret } from "./interpretation.js";
import { sealClusterAndCreateAtom } from "./atomConstruction.js";

async function runCanary() {
  const ts = Date.now();
  const canaryId = `b2a_canary_${ts}`;
  console.log(`\n═══════════════════════════════════════════════════════`);
  console.log(`Build 2A Package 2A-2 Canary`);
  console.log(`canary_run_id: ${canaryId}`);
  console.log(`═══════════════════════════════════════════════════════\n`);

  // ── Resolve registry IDs ───────────────────────────────────────────────────
  const esrRow = await db.execute(sql`
    SELECT id FROM evidence_source_registry WHERE source_key = 'agent_task_outcomes' LIMIT 1
  `);
  const rvRow = await db.execute(sql`
    SELECT id FROM interpretation_rule_versions WHERE implementation_key = 'task_completion_v1' LIMIT 1
  `);
  const bpRow = await db.execute(sql`
    SELECT id FROM behavioral_primitives WHERE name = 'agent_guided_task_completion' LIMIT 1
  `);
  const dmRow = await db.execute(sql`
    SELECT id FROM domain_modules WHERE slug = 'agent_instrumentation' LIMIT 1
  `);

  const esrId = (esrRow.rows[0] as { id: string }).id;
  const rvId  = (rvRow.rows[0] as { id: string }).id;
  const bpId  = (bpRow.rows[0] as { id: string }).id;
  const dmId  = (dmRow.rows[0] as { id: string }).id;

  console.log(`Registry IDs resolved:`);
  console.log(`  esr_id=${esrId}`);
  console.log(`  rv_id=${rvId}`);
  console.log(`  bp_id=${bpId}`);
  console.log(`  dm_id=${dmId}\n`);

  // ── Seed canary agent + entity + claim ────────────────────────────────────
  const agentSlug = `${canaryId}_agent`;
  await db.execute(sql`
    INSERT INTO agents (slug, display_name) VALUES (${agentSlug}, 'Canary Agent 2A-2')
    ON CONFLICT (slug) DO NOTHING
  `);
  const agentRow = await db.execute(sql`SELECT id FROM agents WHERE slug = ${agentSlug} LIMIT 1`);
  const agentId  = (agentRow.rows[0] as { id: number }).id;

  await db.execute(sql`
    INSERT INTO behavioral_entities (entity_type, native_system, native_id)
    VALUES ('autonomous_agent', 'build1a_agent_system', ${String(agentId)})
    ON CONFLICT (entity_type, native_system, native_id) DO NOTHING
  `);
  const entityRow = await db.execute(sql`
    SELECT id FROM behavioral_entities
    WHERE native_system = 'build1a_agent_system' AND native_id = ${String(agentId)} LIMIT 1
  `);
  const entityId = (entityRow.rows[0] as { id: string }).id;

  const claimRow = await db.execute(sql`
    INSERT INTO behavioral_claims
      (entity_id, primitive_id, domain_module_id, window_start, window_end, falsifiability_condition)
    VALUES (
      ${entityId}::uuid, ${bpId}::uuid, ${dmId}::uuid,
      NOW() - INTERVAL '7 days', NOW() + INTERVAL '90 days',
      'Canary claim: Package 2A-2 interpretation verification. At least one agent_task_outcome must exist within window.'
    )
    RETURNING id
  `);
  const claimId = (claimRow.rows[0] as { id: string }).id;
  console.log(`Canary claim: ${claimId}`);
  console.log(`Canary agent: agent_id=${agentId}, entity_id=${entityId}\n`);

  // ══════════════════════════════════════════════════════════════════════════
  // PATH 1: Successful interpretation → atom created
  // ══════════════════════════════════════════════════════════════════════════
  console.log(`── Path 1: Successful interpretation ──`);

  const t1Row = await db.execute(sql`
    INSERT INTO agent_tasks (agent_id, task_class, correlation_id)
    VALUES (${agentId}, 'guided_bill_payment', ${`${canaryId}_p1`})
    RETURNING id
  `);
  const taskId1  = (t1Row.rows[0] as { id: string }).id;

  const o1Row = await db.execute(sql`
    INSERT INTO agent_task_outcomes (task_id, outcome_status, source_attribution, resolved_at)
    VALUES (${taskId1}::uuid, 'completed', ${canaryId}, NOW())
    RETURNING id
  `);
  const outcomeId1 = (o1Row.rows[0] as { id: string }).id;
  console.log(`  outcome: ${outcomeId1} (status=completed)`);

  const cluster1 = await createCluster(claimId, rvId, 1, 3600);
  console.log(`  cluster: ${cluster1.id}`);

  await addObservationLink(cluster1.id, esrId, outcomeId1, 1);
  console.log(`  observation link added (seq=1)`);

  const now1 = new Date().toISOString();
  const interp1 = await interpret({
    implementationKey: "task_completion_v1",
    ruleVersionId: rvId,
    observations: [{
      sequence_position: 1,
      source_key: "agent_task_outcomes",
      source_record_key: outcomeId1,
      source_data: {
        outcome_id: outcomeId1,
        task_id: taskId1,
        outcome_status: "completed",
        failure_class: null,
        source_attribution: canaryId,
        resolved_at: now1,
      },
    }],
    claim: {
      id: claimId,
      primitive_name: "agent_guided_task_completion",
      domain_slug: "agent_instrumentation",
      window_start: new Date(Date.now() - 86400000 * 7).toISOString(),
      window_end: new Date(Date.now() + 86400000 * 90).toISOString(),
      falsifiability_condition: "Canary claim: Package 2A-2 interpretation verification.",
    },
    interpreted_at: now1,
  });

  if (interp1.refused) {
    throw new Error(`Path 1 interpretation REFUSED: ${interp1.detail}`);
  }
  console.log(`  interpretation: disposition=${interp1.disposition}`);

  const seal1 = await sealClusterAndCreateAtom({
    clusterId: cluster1.id,
    claimId,
    ruleVersionId: rvId,
    disposition: interp1.disposition,
    dependenceDeclaration: interp1.dependence_declaration,
    effectiveAt: now1,
    environmentContext: { ...interp1.environment_context, canary_run_id: canaryId, path: 1 },
  });

  if (!seal1.sealed) {
    throw new Error(`Path 1 seal FAILED: ${seal1.detail}`);
  }

  // Update ledger
  await db.execute(sql`
    INSERT INTO source_processing_ledger
      (evidence_source_registry_id, source_record_key, interpretation_rule_version_id,
       status, attempts, completed_at, resulting_atom_id)
    VALUES (${esrId}::uuid, ${outcomeId1}, ${rvId}::uuid, 'succeeded', 1, NOW(), ${seal1.atom.id}::uuid)
    ON CONFLICT (evidence_source_registry_id, source_record_key, interpretation_rule_version_id) DO NOTHING
  `);

  // Verify chain-tip view
  const viewCheck = await db.execute(sql`
    SELECT id FROM latest_interpreted_evidence_atom_v WHERE id = ${seal1.atom.id}::uuid LIMIT 1
  `);
  if (viewCheck.rows.length === 0) {
    throw new Error("Path 1 atom not visible in latest_interpreted_evidence_atom_v");
  }

  console.log(`  ✅ Path 1 PASS`);
  console.log(`     atom_id=${seal1.atom.id}`);
  console.log(`     cluster_hash=${seal1.clusterHash}`);
  console.log(`     chain-tip view: confirmed\n`);

  // ══════════════════════════════════════════════════════════════════════════
  // PATH 2: Refusal path (unknown implementationKey)
  // ══════════════════════════════════════════════════════════════════════════
  console.log(`── Path 2: Refusal path (unknown implementationKey) ──`);

  const interp2 = await interpret({
    implementationKey: "nonexistent_key_canary_2a2",
    ruleVersionId: rvId,
    observations: [{
      sequence_position: 1,
      source_key: "agent_task_outcomes",
      source_record_key: "canary_fake_obs",
      source_data: { outcome_status: "completed" },
    }],
    claim: {
      id: claimId,
      primitive_name: "agent_guided_task_completion",
      domain_slug: "agent_instrumentation",
      window_start: new Date(Date.now() - 86400000).toISOString(),
      window_end: new Date(Date.now() + 86400000 * 90).toISOString(),
      falsifiability_condition: "Canary path 2 refusal test.",
    },
    interpreted_at: new Date().toISOString(),
  });

  if (!interp2.refused) {
    throw new Error(`Path 2: expected refusal but got disposition=${(interp2 as { disposition: string }).disposition}`);
  }
  console.log(`  refusal: reason_code=${interp2.reason_code}`);

  const refRow = await db.execute(sql`
    INSERT INTO refusal_records
      (refusal_stage, reason_code, claim_id, source_observation_key,
       interpretation_rule_version_id, detail)
    VALUES (
      'interpretation',
      'invalid_or_unavailable_version',
      ${claimId}::uuid,
      'canary_path2',
      ${rvId}::uuid,
      ${interp2.detail}
    )
    RETURNING id
  `);
  const refusalId = (refRow.rows[0] as { id: string }).id;
  console.log(`  ✅ Path 2 PASS`);
  console.log(`     refusal_id=${refusalId}\n`);

  // ══════════════════════════════════════════════════════════════════════════
  // PATH 3: Incomplete cluster → timeout → abandoned
  // ══════════════════════════════════════════════════════════════════════════
  console.log(`── Path 3: Incomplete cluster abandonment ──`);

  const t3Row = await db.execute(sql`
    INSERT INTO agent_tasks (agent_id, task_class, correlation_id)
    VALUES (${agentId}, 'guided_bill_payment', ${`${canaryId}_p3`})
    RETURNING id
  `);
  const taskId3   = (t3Row.rows[0] as { id: string }).id;

  const o3Row = await db.execute(sql`
    INSERT INTO agent_task_outcomes (task_id, outcome_status, source_attribution, resolved_at)
    VALUES (${taskId3}::uuid, 'completed', ${canaryId}, NOW())
    RETURNING id
  `);
  const outcomeId3 = (o3Row.rows[0] as { id: string }).id;

  // Create 2-observation cluster but only add 1 link; timeout=1 second
  const cluster3 = await createCluster(claimId, rvId, 2, 1);
  await addObservationLink(cluster3.id, esrId, outcomeId3, 1);
  console.log(`  cluster: ${cluster3.id} (expected_obs=2, has 1, timeout=1s)`);

  // Wait for abandon timeout
  await new Promise(resolve => setTimeout(resolve, 1500));

  const abandoned = await abandonTimedOutClusters();
  const clusterCheck = await db.execute(sql`
    SELECT assembly_state FROM cluster_assembly WHERE id = ${cluster3.id}::uuid LIMIT 1
  `);
  const finalState = (clusterCheck.rows[0] as { assembly_state: string }).assembly_state;

  if (finalState !== "abandoned") {
    throw new Error(`Path 3: cluster state is '${finalState}', expected 'abandoned'`);
  }
  const wasInBatch = abandoned.some(r => r.cluster_id === cluster3.id);
  console.log(`  ✅ Path 3 PASS`);
  console.log(`     cluster_id=${cluster3.id}`);
  console.log(`     final_state=${finalState}`);
  console.log(`     in_abandon_batch=${wasInBatch}\n`);

  // ══════════════════════════════════════════════════════════════════════════
  // Summary
  // ══════════════════════════════════════════════════════════════════════════
  console.log(`═══════════════════════════════════════════════════════`);
  console.log(`Build 2A Package 2A-2 Canary — ALL 3 PATHS PASS`);
  console.log(`  canary_run_id:       ${canaryId}`);
  console.log(`  claim_id:            ${claimId}`);
  console.log(`  atom_id (path 1):    ${seal1.atom.id}`);
  console.log(`  refusal_id (path 2): ${refusalId}`);
  console.log(`  abandoned_cluster:   ${cluster3.id}`);
  console.log(`  Evidence retained — NOT cleaned up.`);
  console.log(`═══════════════════════════════════════════════════════\n`);
}

runCanary().then(() => process.exit(0)).catch(err => {
  console.error("\nCANARY FAILED:", err);
  process.exit(1);
});
