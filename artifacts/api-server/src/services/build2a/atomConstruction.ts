/**
 * Build 2A — Atom Construction (Package 2A-2)
 *
 * Sealing and Interpreted Evidence Atom creation.
 *
 * Atomicity guarantee (per spec §10):
 *   Sealing and atom creation occur in ONE database transaction:
 *     1. Lock the assembling cluster (SELECT FOR UPDATE)
 *     2. Verify assembly_state = 'assembling'
 *     3. Verify actual observation-link count = expected_observation_count
 *     4. Verify all source registry references are still approved
 *     5. Compute deterministic cluster hash
 *     6. INSERT the Interpreted Evidence Atom
 *     7. UPDATE cluster: assembly_state → sealed, cluster_hash, sealed_at, resulting_atom_id
 *     8. COMMIT
 *
 *   If any step fails: ROLLBACK — no atom remains, cluster stays assembling.
 *   A sealed-but-atomless cluster is forbidden.
 *   An atom referencing an unsealed cluster is forbidden.
 *
 * Cluster hash:
 *   SHA-256 of the canonical representation sorted by sequence_position:
 *     ruleVersionId::claimId::seq1:sourceRegId1:sourceRecKey1::seq2:...
 *   The hash excludes timestamps, random UUIDs generated for the assembly,
 *   mutable fields, and raw PII or raw message content.
 */

import { createHash } from "crypto";
import { logger } from "../../lib/logger.js";
import type { Disposition, DependenceDeclaration } from "./interpretation.js";

export type AtomRow = {
  id: string;
  claim_id: string;
  cluster_assembly_id: string;
  disposition: Disposition;
  interpretation_rule_version_id: string;
  dependence_declaration: DependenceDeclaration;
  effective_at: string;
  environment_context: Record<string, unknown>;
  supersedes: string | null;
  created_at: string;
};

export type SealParams = {
  clusterId: string;
  claimId: string;
  ruleVersionId: string;
  disposition: Disposition;
  dependenceDeclaration: DependenceDeclaration;
  effectiveAt: string;
  environmentContext: Record<string, unknown>;
  /** Optional: UUID of a prior atom this new atom supersedes (reinterpretation). */
  supersedes?: string;
};

export type SealResult =
  | { sealed: true; atom: AtomRow; clusterHash: string }
  | {
      sealed: false;
      reason:
        | "cluster_not_found"
        | "cluster_not_assembling"
        | "observation_count_mismatch"
        | "unapproved_source"
        | "transaction_failed";
      detail: string;
    };

/**
 * Compute the deterministic cluster hash.
 *
 * Input components (all deterministic, no timestamps, no UUIDs from the assembly):
 *   - interpretation rule version ID
 *   - claim ID
 *   - For each observation link, sorted by sequence_position:
 *       source_registry_id + source_record_key + sequence_position
 *
 * The same cluster inputs always produce the same hash.
 * Hash is SHA-256 hex.
 */
export function computeClusterHash(
  links: Array<{
    evidence_source_registry_id: string;
    source_record_key: string;
    sequence_position: number;
  }>,
  ruleVersionId: string,
  claimId: string,
): string {
  // Sort by sequence_position to ensure determinism regardless of DB return order
  const sorted = [...links].sort((a, b) => a.sequence_position - b.sequence_position);
  const obsStr = sorted
    .map(l => `${l.sequence_position}:${l.evidence_source_registry_id}:${l.source_record_key}`)
    .join("|");
  const canonical = `v1::${ruleVersionId}::${claimId}::${obsStr}`;
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}

/**
 * Atomically seal the cluster and create the Interpreted Evidence Atom.
 *
 * Uses pool.connect() for an explicit transaction. If any step fails, the entire
 * transaction rolls back — no half-created atom can exist.
 */
export async function sealClusterAndCreateAtom(params: SealParams): Promise<SealResult> {
  const { pool } = await import("@workspace/db");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Step 1: Lock the cluster row to prevent concurrent sealing attempts
    const clusterRes = await client.query(
      `SELECT id, claim_id, interpretation_rule_version_id,
              expected_observation_count, assembly_state
       FROM cluster_assembly
       WHERE id = $1
       FOR UPDATE`,
      [params.clusterId],
    );

    if (clusterRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return {
        sealed: false,
        reason: "cluster_not_found",
        detail: `cluster_assembly ${params.clusterId} does not exist.`,
      };
    }

    const cluster = clusterRes.rows[0] as {
      id: string;
      claim_id: string;
      interpretation_rule_version_id: string;
      expected_observation_count: number;
      assembly_state: string;
    };

    // Step 2: Verify current state is assembling
    if (cluster.assembly_state !== "assembling") {
      await client.query("ROLLBACK");
      return {
        sealed: false,
        reason: "cluster_not_assembling",
        detail: `cluster_assembly ${params.clusterId} is in state '${cluster.assembly_state}', not 'assembling'.`,
      };
    }

    // Step 3: Count observation links and verify they match expected
    const countRes = await client.query(
      `SELECT COUNT(*)::int AS n,
              ARRAY_AGG(
                json_build_object(
                  'evidence_source_registry_id', evidence_source_registry_id::text,
                  'source_record_key', source_record_key,
                  'sequence_position', sequence_position
                ) ORDER BY sequence_position
              ) AS links,
              ARRAY_AGG(DISTINCT evidence_source_registry_id::text) AS registry_ids
       FROM evidence_atom_observation_links
       WHERE cluster_assembly_id = $1`,
      [params.clusterId],
    );

    const { n: actualCount, links: rawLinks, registry_ids } =
      countRes.rows[0] as {
        n: number;
        links: Array<{ evidence_source_registry_id: string; source_record_key: string; sequence_position: number }>;
        registry_ids: string[];
      };

    if (actualCount !== cluster.expected_observation_count) {
      await client.query("ROLLBACK");
      return {
        sealed: false,
        reason: "observation_count_mismatch",
        detail: `Cluster ${params.clusterId} has ${actualCount} observation link(s) but expected ${cluster.expected_observation_count}.`,
      };
    }

    // Step 4: Verify all source registry references are still approved and non-deprecated
    const sourceCheck = await client.query(
      `SELECT id, approval_status, deprecated_at
       FROM evidence_source_registry
       WHERE id = ANY($1::uuid[])`,
      [registry_ids],
    );

    for (const src of sourceCheck.rows as Array<{ id: string; approval_status: string; deprecated_at: string | null }>) {
      if (src.approval_status !== "approved" || src.deprecated_at !== null) {
        await client.query("ROLLBACK");
        return {
          sealed: false,
          reason: "unapproved_source",
          detail: `Source registry entry ${src.id} is no longer approved (status=${src.approval_status}, deprecated_at=${src.deprecated_at}).`,
        };
      }
    }

    // Step 5: Compute deterministic cluster hash
    const links = rawLinks ?? [];
    const clusterHash = computeClusterHash(links, params.ruleVersionId, params.claimId);

    // Step 6: Insert the Interpreted Evidence Atom
    const atomRes = await client.query(
      `INSERT INTO interpreted_evidence_atoms
         (claim_id, cluster_assembly_id, disposition, interpretation_rule_version_id,
          dependence_declaration, effective_at, environment_context, supersedes)
       VALUES ($1::uuid, $2::uuid, $3, $4::uuid, $5, $6::timestamptz, $7::jsonb, $8)
       RETURNING id, claim_id, cluster_assembly_id, disposition,
                 interpretation_rule_version_id, dependence_declaration,
                 effective_at, environment_context, supersedes, created_at`,
      [
        params.claimId,
        params.clusterId,
        params.disposition,
        params.ruleVersionId,
        params.dependenceDeclaration,
        params.effectiveAt,
        JSON.stringify(params.environmentContext),
        params.supersedes ?? null,
      ],
    );

    const atom = atomRes.rows[0] as AtomRow;

    // Step 7: Seal the cluster — updates assembly_state, cluster_hash, sealed_at, resulting_atom_id
    // The build2a_cluster_lifecycle_fn trigger validates the 'assembling' → 'sealed' transition.
    await client.query(
      `UPDATE cluster_assembly
       SET assembly_state    = 'sealed',
           cluster_hash      = $2,
           sealed_at         = NOW(),
           resulting_atom_id = $3::uuid
       WHERE id = $1::uuid`,
      [params.clusterId, clusterHash, atom.id],
    );

    // Step 8: Commit
    await client.query("COMMIT");

    logger.info(
      { atomId: atom.id, clusterId: params.clusterId, disposition: params.disposition, clusterHash },
      "[Build2A/atomConstruction] atom created and cluster sealed",
    );

    return { sealed: true, atom, clusterHash };
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {/* ignore rollback error */});
    logger.error({ err, clusterId: params.clusterId }, "[Build2A/atomConstruction] seal transaction failed — rolled back");
    return {
      sealed: false,
      reason: "transaction_failed",
      detail: err instanceof Error
        ? err.message
        : (err as { cause?: { message?: string } })?.cause?.message ?? String(err),
    };
  } finally {
    client.release();
  }
}
