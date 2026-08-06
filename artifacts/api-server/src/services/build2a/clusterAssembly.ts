/**
 * Build 2A — Cluster Assembly (Package 2A-2)
 *
 * Creates and manages bounded observation clusters. A cluster is finite, rule-defined
 * before assembly, and fixed once sealed. It can never grow after later observations arrive.
 *
 * Lifecycle:
 *   assembling → sealed    (via atomConstruction.sealClusterAndCreateAtom)
 *   assembling → abandoned (via abandonTimedOutClusters or explicit abandonment)
 *
 * Terminal states (sealed, abandoned) are permanently immutable — enforced by DB trigger.
 *
 * expected_observation_count must originate from the interpretation rule's rule_content
 * (cluster_size field). It is set once at cluster creation and never updated.
 *
 * A later related source observation creates a NEW ledger record, a NEW cluster,
 * and potentially a NEW Evidence Atom. It never mutates an existing cluster.
 */

import { sql } from "drizzle-orm";
import { logger } from "../../lib/logger.js";

/** Default assembly timeout if the rule_content does not specify one. */
const DEFAULT_ABANDON_TIMEOUT_SECONDS = 300;

export type ClusterRow = {
  id: string;
  claim_id: string;
  interpretation_rule_version_id: string;
  expected_observation_count: number;
  started_at: string;
  assembly_state: "assembling" | "sealed" | "abandoned";
  cluster_hash: string | null;
  sealed_at: string | null;
  abandoned_at: string | null;
  abandon_timeout_at: string;
  resulting_atom_id: string | null;
};

export type ObservationLinkRow = {
  id: string;
  cluster_assembly_id: string;
  evidence_source_registry_id: string;
  source_record_key: string;
  sequence_position: number;
  created_at: string;
};

export type AbandonResult = {
  clusterId: string;
  refusalId: string;
  ledgerIdsRefused: string[];
};

/**
 * Create a new assembling cluster for a given claim and rule version.
 *
 * @param claimId              Behavioral claim to associate with this cluster
 * @param ruleVersionId        Interpretation rule version driving this cluster
 * @param expectedCount        expected_observation_count from rule_content.cluster_size
 * @param abandonTimeoutSeconds How long to wait before abandoning an incomplete cluster
 */
export async function createCluster(
  claimId: string,
  ruleVersionId: string,
  expectedCount: number,
  abandonTimeoutSeconds: number = DEFAULT_ABANDON_TIMEOUT_SECONDS,
): Promise<ClusterRow> {
  const { db } = await import("@workspace/db");

  const result = await db.execute(sql`
    INSERT INTO cluster_assembly
      (claim_id, interpretation_rule_version_id, expected_observation_count, abandon_timeout_at)
    VALUES
      (${claimId}::uuid, ${ruleVersionId}::uuid, ${expectedCount},
       NOW() + (${abandonTimeoutSeconds} || ' seconds')::interval)
    RETURNING
      id, claim_id, interpretation_rule_version_id, expected_observation_count,
      started_at, assembly_state, cluster_hash, sealed_at, abandoned_at,
      abandon_timeout_at, resulting_atom_id
  `);

  const row = result.rows[0] as ClusterRow;
  logger.debug({ clusterId: row.id, claimId, expectedCount }, "[Build2A/clusterAssembly] cluster created");
  return row;
}

/**
 * Add one observation link to an assembling cluster.
 *
 * The BEFORE INSERT trigger (build2a_observation_link_guard_fn) enforces that the
 * cluster must be in 'assembling' state. Post-seal and post-abandonment insertions
 * are rejected at the database level.
 *
 * @param clusterId           UUID of the cluster_assembly row
 * @param sourceRegistryId    UUID of the evidence_source_registry row
 * @param sourceRecordKey     Natural key of the source record (e.g. outcome UUID)
 * @param sequencePosition    1-based position within this cluster
 */
export async function addObservationLink(
  clusterId: string,
  sourceRegistryId: string,
  sourceRecordKey: string,
  sequencePosition: number,
): Promise<ObservationLinkRow> {
  const { db } = await import("@workspace/db");

  const result = await db.execute(sql`
    INSERT INTO evidence_atom_observation_links
      (cluster_assembly_id, evidence_source_registry_id, source_record_key, sequence_position)
    VALUES
      (${clusterId}::uuid, ${sourceRegistryId}::uuid, ${sourceRecordKey}, ${sequencePosition})
    RETURNING id, cluster_assembly_id, evidence_source_registry_id, source_record_key,
              sequence_position, created_at
  `);

  const row = result.rows[0] as ObservationLinkRow;
  logger.debug(
    { clusterId, sourceRecordKey, sequencePosition },
    "[Build2A/clusterAssembly] observation link added",
  );
  return row;
}

/**
 * Retrieve the current state of a cluster, including its observation links.
 */
export async function getCluster(clusterId: string): Promise<{
  cluster: ClusterRow;
  links: ObservationLinkRow[];
} | null> {
  const { db } = await import("@workspace/db");

  const [clusterResult, linksResult] = await Promise.all([
    db.execute(sql`
      SELECT id, claim_id, interpretation_rule_version_id, expected_observation_count,
             started_at, assembly_state, cluster_hash, sealed_at, abandoned_at,
             abandon_timeout_at, resulting_atom_id
      FROM cluster_assembly
      WHERE id = ${clusterId}::uuid
      LIMIT 1
    `),
    db.execute(sql`
      SELECT id, cluster_assembly_id, evidence_source_registry_id, source_record_key,
             sequence_position, created_at
      FROM evidence_atom_observation_links
      WHERE cluster_assembly_id = ${clusterId}::uuid
      ORDER BY sequence_position ASC
    `),
  ]);

  const cluster = clusterResult.rows[0] as ClusterRow | undefined;
  if (!cluster) return null;

  return { cluster, links: linksResult.rows as ObservationLinkRow[] };
}

/**
 * Abandon all assembling clusters that have exceeded their abandon_timeout_at.
 *
 * For each timed-out cluster:
 *   1. Records a refusal_record (refusal_stage=interpretation, reason_code=incomplete_bounded_cluster)
 *   2. Transitions the cluster to abandoned (sets abandoned_at)
 *   3. Updates any source_processing_ledger records that created this cluster to refused
 *
 * Returns a list of abandoned cluster IDs and refusal IDs.
 * Observation links already gathered are preserved (not deleted).
 * No atom is created for an abandoned cluster.
 *
 * Called at the start of each poll cycle before claiming new work.
 */
export async function abandonTimedOutClusters(): Promise<AbandonResult[]> {
  const { db } = await import("@workspace/db");

  // Find assembling clusters past their timeout
  const timedOut = await db.execute(sql`
    SELECT ca.id, ca.claim_id, ca.interpretation_rule_version_id,
           ca.expected_observation_count,
           (SELECT COUNT(*)::int FROM evidence_atom_observation_links eaol
            WHERE eaol.cluster_assembly_id = ca.id) AS actual_observation_count
    FROM cluster_assembly ca
    WHERE ca.assembly_state = 'assembling'
      AND ca.abandon_timeout_at < NOW()
  `);

  if (timedOut.rows.length === 0) return [];

  const results: AbandonResult[] = [];

  for (const row of timedOut.rows as Array<{
    id: string;
    claim_id: string;
    interpretation_rule_version_id: string;
    expected_observation_count: number;
    actual_observation_count: number;
  }>) {
    try {
      // 1. Insert refusal record
      const refusalResult = await db.execute(sql`
        INSERT INTO refusal_records
          (refusal_stage, reason_code, claim_id, cluster_assembly_id,
           interpretation_rule_version_id, detail)
        VALUES (
          'interpretation',
          'incomplete_bounded_cluster',
          ${row.claim_id}::uuid,
          ${row.id}::uuid,
          ${row.interpretation_rule_version_id}::uuid,
          ${'Cluster ' + row.id + ' timed out with ' + row.actual_observation_count +
             ' of ' + row.expected_observation_count + ' expected observations. ' +
             'Incomplete bounded clusters are not classified as negative evidence.'}
        )
        RETURNING id
      `);
      const refusalId = (refusalResult.rows[0] as { id: string }).id;

      // 2. Transition cluster to abandoned (DB trigger validates this transition)
      await db.execute(sql`
        UPDATE cluster_assembly
        SET assembly_state = 'abandoned',
            abandoned_at   = NOW()
        WHERE id = ${row.id}::uuid
      `);

      // 3. Update corresponding ledger records to refused
      // Find ledger records that reference observations in this cluster
      const ledgerResult = await db.execute(sql`
        UPDATE source_processing_ledger spl
        SET status             = 'refused',
            completed_at       = NOW(),
            resulting_refusal_id = ${refusalId}::uuid,
            errors             = errors || ${JSON.stringify([{
              stage: 'cluster_abandonment',
              reason: 'incomplete_bounded_cluster',
              refusal_id: refusalId,
              cluster_id: row.id,
              at: new Date().toISOString(),
            }])}::jsonb
        FROM evidence_atom_observation_links eaol
        WHERE eaol.cluster_assembly_id = ${row.id}::uuid
          AND spl.source_record_key = eaol.source_record_key
          AND spl.evidence_source_registry_id = eaol.evidence_source_registry_id
          AND spl.status NOT IN ('succeeded', 'refused')
        RETURNING spl.id
      `);

      const ledgerIds = (ledgerResult.rows as Array<{ id: string }>).map(r => r.id);

      results.push({ clusterId: row.id, refusalId, ledgerIdsRefused: ledgerIds });

      logger.info(
        { clusterId: row.id, refusalId, ledgerCount: ledgerIds.length },
        "[Build2A/clusterAssembly] timed-out cluster abandoned",
      );
    } catch (err) {
      logger.error({ err, clusterId: row.id }, "[Build2A/clusterAssembly] abandon failed for cluster");
    }
  }

  return results;
}

/**
 * Get the expected_observation_count from an interpretation rule's rule_content.
 * Returns the cluster_size field if present, otherwise DEFAULT_ABANDON_TIMEOUT_SECONDS.
 */
export async function getExpectedObservationCount(ruleVersionId: string): Promise<{
  expectedCount: number;
  abandonTimeoutSeconds: number;
}> {
  const { db } = await import("@workspace/db");

  const result = await db.execute(sql`
    SELECT rule_content FROM interpretation_rule_versions
    WHERE id = ${ruleVersionId}::uuid
    LIMIT 1
  `);

  const row = result.rows[0] as { rule_content: Record<string, unknown> } | undefined;
  if (!row) {
    return { expectedCount: 1, abandonTimeoutSeconds: DEFAULT_ABANDON_TIMEOUT_SECONDS };
  }

  const rc = row.rule_content ?? {};
  const clusterSize = typeof rc["cluster_size"] === "number" ? rc["cluster_size"] : 1;
  const timeout =
    typeof rc["abandon_timeout_seconds"] === "number"
      ? rc["abandon_timeout_seconds"]
      : DEFAULT_ABANDON_TIMEOUT_SECONDS;

  return { expectedCount: clusterSize, abandonTimeoutSeconds: timeout };
}
