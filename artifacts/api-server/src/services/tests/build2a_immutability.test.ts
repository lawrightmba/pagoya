/**
 * Build 2A — Package 2A-2 Immutability Tests
 *
 * Covers:
 *   - Cluster lifecycle: valid transitions (assembling→sealed, assembling→abandoned)
 *   - Cluster lifecycle: invalid transitions are rejected (sealed→assembling, etc.)
 *   - Sealed-state field invariants: direct SQL cannot seal without required fields
 *   - Abandoned-state field invariants: direct SQL cannot abandon with sealed-state fields
 *   - Post-seal observation link rejection (cluster not in 'assembling' state)
 *   - Post-abandonment observation link rejection
 *   - Atom UPDATE + DELETE blocked by trigger
 *   - Refusal record UPDATE + DELETE blocked by trigger
 *   - Observation link UPDATE + DELETE blocked by trigger
 *   - Identity field freeze on cluster_assembly (claim_id, rule_version_id are immutable once set)
 *   - Atomicity: transaction rollback leaves no orphaned atom and no stray sealed cluster
 *   - Invariant integrity: no sealed cluster with null atom; no atom referencing unsealed cluster
 *
 * All test identifiers are prefixed with b2a_immut_ or use RUN_ID for isolation.
 * Triggers must be in place (ensureBuild2a2Tables() called) for these tests to pass.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { sql } from "drizzle-orm";
import { db, pool } from "@workspace/db";
import { createCluster, addObservationLink } from "../build2a/clusterAssembly.js";
import { sealClusterAndCreateAtom } from "../build2a/atomConstruction.js";
import { setBuild2a2Ready, _reset2a2ToPendingForTesting } from "../build2a/build2aReadiness.js";

const RUN_ID = `immut_${Date.now()}`;

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getRegistryIds() {
  const esr = await db.execute(sql`
    SELECT id FROM evidence_source_registry WHERE source_key = 'agent_task_outcomes' LIMIT 1
  `);
  const rv = await db.execute(sql`
    SELECT id FROM interpretation_rule_versions WHERE implementation_key = 'task_completion_v1' LIMIT 1
  `);
  const claim = await db.execute(sql`
    SELECT id FROM behavioral_claims LIMIT 1
  `);
  return {
    esrId: (esr.rows[0] as { id: string }).id,
    rvId: (rv.rows[0] as { id: string }).id,
    claimId: (claim.rows[0] as { id: string }).id,
  };
}

async function makeSeededClaim(suffix: string): Promise<string> {
  // behavioral_entities is Tier 1 immutable — ON CONFLICT DO NOTHING, then SELECT
  await db.execute(sql`
    INSERT INTO behavioral_entities (entity_type, native_system, native_id)
    VALUES ('autonomous_agent', 'build1a_agent_system', ${`${RUN_ID}_${suffix}`})
    ON CONFLICT (entity_type, native_system, native_id) DO NOTHING
  `);
  const entityRes = await db.execute(sql`
    SELECT id FROM behavioral_entities
    WHERE entity_type = 'autonomous_agent'
      AND native_system = 'build1a_agent_system'
      AND native_id = ${`${RUN_ID}_${suffix}`}
    LIMIT 1
  `);
  const entityId = (entityRes.rows[0] as { id: string }).id;

  const primitiveRes = await db.execute(sql`SELECT id FROM behavioral_primitives WHERE name = 'agent_guided_task_completion' LIMIT 1`);
  const primitiveId = (primitiveRes.rows[0] as { id: string }).id;
  const domainRes = await db.execute(sql`SELECT id FROM domain_modules WHERE slug = 'agent_instrumentation' LIMIT 1`);
  const domainId = (domainRes.rows[0] as { id: string }).id;

  const claimRes = await db.execute(sql`
    INSERT INTO behavioral_claims
      (entity_id, primitive_id, domain_module_id,
       window_start, window_end, falsifiability_condition)
    VALUES (
      ${entityId}::uuid, ${primitiveId}::uuid, ${domainId}::uuid,
      NOW() - INTERVAL '1 day', NOW() + INTERVAL '30 days',
      'Test claim for immutability tests'
    )
    RETURNING id
  `);
  return (claimRes.rows[0] as { id: string }).id;
}

/**
 * Creates a properly sealed cluster via sealClusterAndCreateAtom().
 * Expected_observation_count is always 1; adds 1 observation link before sealing.
 * Returns the sealed cluster ID and atom ID.
 */
async function makeSeededSealedCluster(suffix: string): Promise<{
  clusterId: string;
  claimId: string;
  atomId: string;
}> {
  const claimId = await makeSeededClaim(`sealed_${suffix}`);
  const { rvId, esrId } = await getRegistryIds();

  const cluster = await createCluster(claimId, rvId, 1, 3600);
  await addObservationLink(cluster.id, esrId, `sealed_obs_${suffix}_${RUN_ID}`, 1);

  const result = await sealClusterAndCreateAtom({
    clusterId: cluster.id,
    claimId,
    ruleVersionId: rvId,
    disposition: "supports",
    dependenceDeclaration: "independent",
    effectiveAt: new Date().toISOString(),
    environmentContext: { test: "makeSeededSealedCluster", run_id: RUN_ID, suffix },
  });

  if (!result.sealed || !result.atom) {
    const r = result as { sealed: false; reason: string; detail: string };
    throw new Error(`makeSeededSealedCluster(${suffix}) failed: ${r.reason} — ${r.detail}`);
  }

  return { clusterId: cluster.id, claimId, atomId: result.atom.id };
}

// ── Setup/Teardown ─────────────────────────────────────────────────────────────

beforeAll(async () => {
  setBuild2a2Ready();
});

afterAll(async () => {
  _reset2a2ToPendingForTesting();
  // Entities/claims created during tests can stay — they don't affect production paths
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("Cluster lifecycle — valid transitions", () => {
  it("allows assembling → sealed transition (via sealClusterAndCreateAtom)", async () => {
    const claimId = await makeSeededClaim("seal_01");
    const { rvId, esrId } = await getRegistryIds();

    const cluster = await createCluster(claimId, rvId, 1, 3600);
    expect(cluster.assembly_state).toBe("assembling");

    // Add required observation link
    await addObservationLink(cluster.id, esrId, `seal01_obs_${RUN_ID}`, 1);

    // Seal via the service — all DB invariants are enforced by the trigger
    const result = await sealClusterAndCreateAtom({
      clusterId: cluster.id,
      claimId,
      ruleVersionId: rvId,
      disposition: "supports",
      dependenceDeclaration: "independent",
      effectiveAt: new Date().toISOString(),
      environmentContext: { test: true, run_id: RUN_ID },
    });

    expect(result.sealed).toBe(true);
    if (!result.sealed) throw new Error("seal failed");
    expect(result.atom).toBeDefined();
    expect(result.atom.id).toBeTruthy();

    const check = await db.execute(sql`
      SELECT assembly_state, resulting_atom_id, cluster_hash, sealed_at, abandoned_at
      FROM cluster_assembly WHERE id = ${cluster.id}::uuid
    `);
    const row = check.rows[0] as {
      assembly_state: string;
      resulting_atom_id: string | null;
      cluster_hash: string | null;
      sealed_at: string | null;
      abandoned_at: string | null;
    };
    expect(row.assembly_state).toBe("sealed");
    expect(row.resulting_atom_id).toBeTruthy();
    expect(row.cluster_hash).toBeTruthy();
    expect(row.sealed_at).toBeTruthy();
    expect(row.abandoned_at).toBeNull();
  });

  it("allows assembling → abandoned transition", async () => {
    const claimId = await makeSeededClaim("abandon_01");
    const { rvId } = await getRegistryIds();

    const cluster = await createCluster(claimId, rvId, 1, 3600);

    // Abandoned transition: resulting_atom_id=NULL, sealed_at=NULL, abandoned_at=NOW()
    await db.execute(sql`
      UPDATE cluster_assembly
      SET assembly_state = 'abandoned', abandoned_at = NOW()
      WHERE id = ${cluster.id}::uuid
    `);

    const check = await db.execute(sql`
      SELECT assembly_state FROM cluster_assembly WHERE id = ${cluster.id}::uuid
    `);
    expect((check.rows[0] as { assembly_state: string }).assembly_state).toBe("abandoned");
  });
});

describe("Cluster lifecycle — invalid transitions", () => {
  it("blocks sealed → assembling transition", async () => {
    const { clusterId } = await makeSeededSealedCluster("seal_back_01");

    await expect(
      db.execute(sql`
        UPDATE cluster_assembly
        SET assembly_state = 'assembling'
        WHERE id = ${clusterId}::uuid
      `)
    ).rejects.toThrow();
  });

  it("blocks abandoned → assembling transition", async () => {
    const claimId = await makeSeededClaim("aband_back_01");
    const { rvId } = await getRegistryIds();

    const cluster = await createCluster(claimId, rvId, 1, 3600);
    await db.execute(sql`
      UPDATE cluster_assembly
      SET assembly_state = 'abandoned', abandoned_at = NOW()
      WHERE id = ${cluster.id}::uuid
    `);

    await expect(
      db.execute(sql`
        UPDATE cluster_assembly
        SET assembly_state = 'assembling'
        WHERE id = ${cluster.id}::uuid
      `)
    ).rejects.toThrow();
  });

  it("blocks sealed → abandoned transition", async () => {
    const { clusterId } = await makeSeededSealedCluster("seal_aban_01");

    await expect(
      db.execute(sql`
        UPDATE cluster_assembly
        SET assembly_state = 'abandoned', abandoned_at = NOW()
        WHERE id = ${clusterId}::uuid
      `)
    ).rejects.toThrow();
  });
});

describe("Sealed-state invariants (DB trigger)", () => {
  it("blocks direct SQL sealing without resulting_atom_id (NULL)", async () => {
    const claimId = await makeSeededClaim("inv_no_atom");
    const { rvId, esrId } = await getRegistryIds();

    const cluster = await createCluster(claimId, rvId, 1, 3600);
    await addObservationLink(cluster.id, esrId, `inv_no_atom_obs_${RUN_ID}`, 1);

    // resulting_atom_id omitted → NULL — trigger must reject
    await expect(
      db.execute(sql`
        UPDATE cluster_assembly
        SET assembly_state = 'sealed',
            cluster_hash   = ${"hash_inv_no_atom_" + RUN_ID},
            sealed_at      = NOW()
        WHERE id = ${cluster.id}::uuid
      `)
    ).rejects.toThrow();

    // Cluster must still be assembling
    const check = await db.execute(sql`SELECT assembly_state FROM cluster_assembly WHERE id = ${cluster.id}::uuid`);
    expect((check.rows[0] as { assembly_state: string }).assembly_state).toBe("assembling");
  });

  it("blocks direct SQL sealing without cluster_hash (NULL)", async () => {
    const claimId = await makeSeededClaim("inv_no_hash");
    const { rvId, esrId } = await getRegistryIds();

    const cluster = await createCluster(claimId, rvId, 1, 3600);
    await addObservationLink(cluster.id, esrId, `inv_no_hash_obs_${RUN_ID}`, 1);

    // cluster_hash omitted → NULL; provide non-null resulting_atom_id (random UUID)
    // The trigger rejects before FK check (BEFORE trigger)
    await expect(
      db.execute(sql`
        UPDATE cluster_assembly
        SET assembly_state    = 'sealed',
            resulting_atom_id = gen_random_uuid(),
            sealed_at         = NOW()
        WHERE id = ${cluster.id}::uuid
      `)
    ).rejects.toThrow();

    const check = await db.execute(sql`SELECT assembly_state FROM cluster_assembly WHERE id = ${cluster.id}::uuid`);
    expect((check.rows[0] as { assembly_state: string }).assembly_state).toBe("assembling");
  });

  it("blocks direct SQL sealing without sealed_at (NULL)", async () => {
    const claimId = await makeSeededClaim("inv_no_sealedat");
    const { rvId, esrId } = await getRegistryIds();

    const cluster = await createCluster(claimId, rvId, 1, 3600);
    await addObservationLink(cluster.id, esrId, `inv_no_sealedat_obs_${RUN_ID}`, 1);

    // sealed_at omitted → NULL; provide non-null resulting_atom_id (random UUID)
    await expect(
      db.execute(sql`
        UPDATE cluster_assembly
        SET assembly_state    = 'sealed',
            resulting_atom_id = gen_random_uuid(),
            cluster_hash      = ${"hash_inv_no_sealedat_" + RUN_ID}
        WHERE id = ${cluster.id}::uuid
      `)
    ).rejects.toThrow();

    const check = await db.execute(sql`SELECT assembly_state FROM cluster_assembly WHERE id = ${cluster.id}::uuid`);
    expect((check.rows[0] as { assembly_state: string }).assembly_state).toBe("assembling");
  });

  it("blocks direct SQL sealing when linked observation count differs from expected_observation_count", async () => {
    const claimId = await makeSeededClaim("inv_obs_count");
    const { rvId, esrId } = await getRegistryIds();

    // Create cluster expecting 2 observations
    const cluster = await createCluster(claimId, rvId, 2, 3600);
    // Add only 1 (1 < expected 2)
    await addObservationLink(cluster.id, esrId, `inv_obs_count_obs1_${RUN_ID}`, 1);

    // All non-null fields supplied; trigger counts obs and finds 1 ≠ 2 → reject
    await expect(
      db.execute(sql`
        UPDATE cluster_assembly
        SET assembly_state    = 'sealed',
            resulting_atom_id = gen_random_uuid(),
            cluster_hash      = ${"hash_inv_obs_count_" + RUN_ID},
            sealed_at         = NOW()
        WHERE id = ${cluster.id}::uuid
      `)
    ).rejects.toThrow();

    const check = await db.execute(sql`SELECT assembly_state FROM cluster_assembly WHERE id = ${cluster.id}::uuid`);
    expect((check.rows[0] as { assembly_state: string }).assembly_state).toBe("assembling");
  });
});

describe("Abandoned-state invariants (DB trigger)", () => {
  it("blocks direct SQL abandoning a cluster when resulting_atom_id is set", async () => {
    const claimId = await makeSeededClaim("inv_aband_has_atom");
    const { rvId } = await getRegistryIds();

    const cluster = await createCluster(claimId, rvId, 1, 3600);

    // Provide a non-null resulting_atom_id while abandoning — trigger must reject
    // (BEFORE trigger fires before FK check, so random UUID is fine here)
    await expect(
      db.execute(sql`
        UPDATE cluster_assembly
        SET assembly_state    = 'abandoned',
            resulting_atom_id = gen_random_uuid(),
            abandoned_at      = NOW()
        WHERE id = ${cluster.id}::uuid
      `)
    ).rejects.toThrow();

    const check = await db.execute(sql`SELECT assembly_state FROM cluster_assembly WHERE id = ${cluster.id}::uuid`);
    expect((check.rows[0] as { assembly_state: string }).assembly_state).toBe("assembling");
  });

  it("blocks direct SQL abandoning a cluster when sealed_at is populated", async () => {
    const claimId = await makeSeededClaim("inv_aband_has_sealedat");
    const { rvId } = await getRegistryIds();

    const cluster = await createCluster(claimId, rvId, 1, 3600);

    // abandoned_at set, sealed_at also set — trigger must reject
    await expect(
      db.execute(sql`
        UPDATE cluster_assembly
        SET assembly_state = 'abandoned',
            abandoned_at   = NOW(),
            sealed_at      = NOW()
        WHERE id = ${cluster.id}::uuid
      `)
    ).rejects.toThrow();

    const check = await db.execute(sql`SELECT assembly_state FROM cluster_assembly WHERE id = ${cluster.id}::uuid`);
    expect((check.rows[0] as { assembly_state: string }).assembly_state).toBe("assembling");
  });
});

describe("Observation link — post-seal/post-abandonment rejection", () => {
  it("rejects observation link addition to a sealed cluster", async () => {
    const { clusterId } = await makeSeededSealedCluster("obs_seal_01");
    const { esrId } = await getRegistryIds();

    // Attempt to add another observation to an already-sealed cluster
    await expect(
      addObservationLink(clusterId, esrId, `obs_key_seal_b_${RUN_ID}`, 2)
    ).rejects.toThrow();
  });

  it("rejects observation link addition to an abandoned cluster", async () => {
    const claimId = await makeSeededClaim("obs_aband_01");
    const { rvId, esrId } = await getRegistryIds();

    const cluster = await createCluster(claimId, rvId, 2, 3600);
    await db.execute(sql`
      UPDATE cluster_assembly
      SET assembly_state = 'abandoned', abandoned_at = NOW()
      WHERE id = ${cluster.id}::uuid
    `);

    await expect(
      addObservationLink(cluster.id, esrId, `obs_key_aband_${RUN_ID}`, 1)
    ).rejects.toThrow();
  });
});

describe("Tier 1 immutability — atoms, links, refusals", () => {
  it("blocks UPDATE on interpreted_evidence_atoms", async () => {
    const check = await db.execute(sql`SELECT id, disposition FROM interpreted_evidence_atoms LIMIT 1`);
    if (check.rows.length === 0) {
      console.log("[immutability] No atoms in DB yet — UPDATE trigger test deferred to canary");
      return;
    }
    const atomId = (check.rows[0] as { id: string }).id;

    await expect(
      db.execute(sql`UPDATE interpreted_evidence_atoms SET disposition = 'excluded' WHERE id = ${atomId}::uuid`)
    ).rejects.toThrow();
  });

  it("blocks DELETE on interpreted_evidence_atoms", async () => {
    const check = await db.execute(sql`SELECT id FROM interpreted_evidence_atoms LIMIT 1`);
    if (check.rows.length === 0) {
      console.log("[immutability] No atoms in DB yet — DELETE trigger test deferred to canary");
      return;
    }
    const atomId = (check.rows[0] as { id: string }).id;

    await expect(
      db.execute(sql`DELETE FROM interpreted_evidence_atoms WHERE id = ${atomId}::uuid`)
    ).rejects.toThrow();
  });

  it("blocks UPDATE on evidence_atom_observation_links", async () => {
    const check = await db.execute(sql`SELECT id FROM evidence_atom_observation_links LIMIT 1`);
    if (check.rows.length === 0) {
      console.log("[immutability] No observation links in DB yet — deferred to canary");
      return;
    }
    const linkId = (check.rows[0] as { id: string }).id;

    await expect(
      db.execute(sql`UPDATE evidence_atom_observation_links SET sequence_position = 999 WHERE id = ${linkId}::uuid`)
    ).rejects.toThrow();
  });

  it("blocks DELETE on evidence_atom_observation_links", async () => {
    const check = await db.execute(sql`SELECT id FROM evidence_atom_observation_links LIMIT 1`);
    if (check.rows.length === 0) {
      console.log("[immutability] No observation links in DB yet — deferred to canary");
      return;
    }
    const linkId = (check.rows[0] as { id: string }).id;

    await expect(
      db.execute(sql`DELETE FROM evidence_atom_observation_links WHERE id = ${linkId}::uuid`)
    ).rejects.toThrow();
  });

  it("blocks UPDATE on refusal_records", async () => {
    const check = await db.execute(sql`SELECT id FROM refusal_records LIMIT 1`);
    if (check.rows.length === 0) {
      console.log("[immutability] No refusal records in DB yet — deferred to canary");
      return;
    }
    const refId = (check.rows[0] as { id: string }).id;

    await expect(
      db.execute(sql`UPDATE refusal_records SET detail = 'mutated' WHERE id = ${refId}::uuid`)
    ).rejects.toThrow();
  });

  it("blocks DELETE on refusal_records", async () => {
    const check = await db.execute(sql`SELECT id FROM refusal_records LIMIT 1`);
    if (check.rows.length === 0) {
      console.log("[immutability] No refusal records in DB yet — deferred to canary");
      return;
    }
    const refId = (check.rows[0] as { id: string }).id;

    await expect(
      db.execute(sql`DELETE FROM refusal_records WHERE id = ${refId}::uuid`)
    ).rejects.toThrow();
  });
});

describe("Cluster identity field freeze", () => {
  it("blocks updating claim_id on an existing cluster", async () => {
    const claimId = await makeSeededClaim("idf_claim_01");
    const claimId2 = await makeSeededClaim("idf_claim_02");
    const { rvId } = await getRegistryIds();

    const cluster = await createCluster(claimId, rvId, 1, 3600);

    await expect(
      db.execute(sql`
        UPDATE cluster_assembly
        SET claim_id = ${claimId2}::uuid
        WHERE id = ${cluster.id}::uuid
      `)
    ).rejects.toThrow();
  });
});

describe("Atomicity — transaction rollback reverts seal and atom together", () => {
  it("rolls back the entire seal transaction on mid-seal error", async () => {
    const claimId = await makeSeededClaim("atomic_01");
    const { rvId, esrId } = await getRegistryIds();

    const cluster = await createCluster(claimId, rvId, 1, 3600);
    await addObservationLink(cluster.id, esrId, `atomic_obs_${RUN_ID}`, 1);

    // Simulate a complete seal inside a transaction that is then forcibly rolled back.
    // This mirrors what sealClusterAndCreateAtom() does but forces a rollback to
    // prove both the atom INSERT and cluster UPDATE are reverted atomically.
    const client = await pool.connect();
    let atomId: string | null = null;
    try {
      await client.query("BEGIN");

      // Step 1: Insert atom (mirrors sealClusterAndCreateAtom step 6)
      const atomRes = await client.query(
        `INSERT INTO interpreted_evidence_atoms
           (claim_id, cluster_assembly_id, disposition, interpretation_rule_version_id,
            dependence_declaration, effective_at, environment_context)
         VALUES ($1::uuid, $2::uuid, 'supports', $3::uuid, 'independent', NOW(), '{"test":"atomicity_rollback"}'::jsonb)
         RETURNING id`,
        [claimId, cluster.id, rvId],
      );
      atomId = (atomRes.rows[0] as { id: string }).id;

      // Step 2: Seal cluster with all required fields — trigger passes (obs count=1=expected)
      await client.query(
        `UPDATE cluster_assembly
         SET assembly_state    = 'sealed',
             sealed_at         = NOW(),
             cluster_hash      = $1,
             resulting_atom_id = $2::uuid
         WHERE id = $3::uuid`,
        [`hash_atomic_rollback_${RUN_ID}`, atomId, cluster.id],
      );

      // Step 3: Force rollback — simulates failure after seal, before commit
      await client.query("ROLLBACK");
    } catch (err) {
      await client.query("ROLLBACK").catch(() => { /* ignore rollback error */ });
      throw err;
    } finally {
      client.release();
    }

    // Cluster must still be assembling (seal UPDATE was reverted)
    const clusterCheck = await db.execute(sql`
      SELECT assembly_state, resulting_atom_id FROM cluster_assembly WHERE id = ${cluster.id}::uuid
    `);
    const clusterRow = clusterCheck.rows[0] as { assembly_state: string; resulting_atom_id: string | null };
    expect(clusterRow.assembly_state).toBe("assembling");
    expect(clusterRow.resulting_atom_id).toBeNull();

    // No atom should exist for this cluster (atom INSERT was reverted)
    const atomCheck = await db.execute(sql`
      SELECT id FROM interpreted_evidence_atoms
      WHERE cluster_assembly_id = ${cluster.id}::uuid
    `);
    expect(atomCheck.rows.length).toBe(0);

    // Confirm the atom UUID we captured also does not exist
    if (atomId) {
      const atomDirectCheck = await db.execute(sql`
        SELECT id FROM interpreted_evidence_atoms WHERE id = ${atomId}::uuid
      `);
      expect(atomDirectCheck.rows.length).toBe(0);
    }
  });
});

describe("Invariant integrity checks", () => {
  it("no atom references an unsealed cluster", async () => {
    const result = await db.execute(sql`
      SELECT COUNT(*)::int AS n
      FROM interpreted_evidence_atoms iea
      JOIN cluster_assembly ca ON ca.id = iea.cluster_assembly_id
      WHERE ca.assembly_state <> 'sealed'
    `);
    expect((result.rows[0] as { n: number }).n).toBe(0);
  });

  it("no sealed cluster has a NULL resulting_atom_id", async () => {
    const result = await db.execute(sql`
      SELECT COUNT(*)::int AS n
      FROM cluster_assembly
      WHERE assembly_state = 'sealed' AND resulting_atom_id IS NULL
    `);
    expect((result.rows[0] as { n: number }).n).toBe(0);
  });
});
