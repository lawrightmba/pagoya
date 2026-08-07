/**
 * Build 2A — Bundle Assembly Service (Package 2A-4)
 *
 * Assembles an Evidence Bundle from the current chain-tip weighted contributions
 * for a given behavioral claim (via latest_weighted_contribution_v).
 *
 * Rules:
 *   - Members come ONLY from latest_weighted_contribution_v (chain tips).
 *   - Zero-weight contributions are INCLUDED, not filtered.
 *   - Ordering is deterministic and explicit: sorted by (computed_at ASC, id ASC).
 *     This ordering rule is stored verbatim in evidence_bundles.deterministic_ordering_rule.
 *   - Superseded (non-tip) contributions are counted but not included as members.
 *   - Called within the outer atomic transaction — no standalone transaction here.
 *
 * DECISION-SEPARATION: No outcome-determination logic. Bundle assembly
 * is a mechanical aggregation of existing evidence atoms, not a scoring decision.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PoolClient = any;

export const ORDERING_RULE =
  "computed_at ASC, weighted_evidence_contributions.id ASC";

export type BundleContributionRow = {
  contribution_id: string;
  atom_id: string;
  disposition: string;
  final_effective_weight: string; // numeric from DB
  dependence_declaration: string;
  computed_at: string;
};

export type BundleAssemblyResult =
  | {
      ok: true;
      bundleId: string;
      members: BundleContributionRow[];
      discardedCount: number;
      zeroWeightCount: number;
    }
  | {
      ok: false;
      reason_code: "bundle_construction_failed";
      detail: string;
    };

/**
 * Assemble an evidence bundle for the given claim within an existing transaction.
 *
 * @param client        - active pool client in a BEGIN'd transaction
 * @param claimId       - behavioral claim to bundle
 * @param fusionOpVerId - UUID of the active fusion_operator_versions row
 * @param constructionTimestamp - pinned wall-clock for replay
 * @param supersedes    - UUID of the prior bundle for this claim (re-formation only)
 */
export async function assembleBundleInTxn(
  client: PoolClient,
  claimId: string,
  fusionOpVerId: string,
  constructionTimestamp: string,
  supersedes: string | null = null,
): Promise<BundleAssemblyResult> {

  // ── Fetch chain-tip contributions for this claim ──────────────────────────
  // latest_weighted_contribution_v already filters to chain tips.
  // We join interpreted_evidence_atoms to get disposition and dependence_declaration.
  const membersRes = await client.query(
    `SELECT
       wec.id           AS contribution_id,
       iea.id           AS atom_id,
       iea.disposition,
       wec.final_effective_weight::text,
       iea.dependence_declaration,
       wec.computed_at::text
     FROM latest_weighted_contribution_v wec
     JOIN interpreted_evidence_atoms iea ON iea.id = wec.atom_id
     WHERE iea.claim_id = $1::uuid
     ORDER BY wec.computed_at ASC, wec.id ASC`,
    [claimId],
  );
  const members = membersRes.rows as BundleContributionRow[];

  // Count superseded (discarded) contributions for this claim:
  // total contributions in weighted_evidence_contributions minus chain tips.
  const discardedRes = await client.query(
    `SELECT COUNT(*)::text AS discarded
     FROM weighted_evidence_contributions wec
     JOIN interpreted_evidence_atoms iea ON iea.id = wec.atom_id
     WHERE iea.claim_id = $1::uuid
       AND EXISTS (
         SELECT 1 FROM weighted_evidence_contributions newer
         WHERE newer.supersedes = wec.id
       )`,
    [claimId],
  );
  const discardedCount = parseInt((discardedRes.rows[0] as { discarded: string })?.discarded ?? "0", 10);
  const zeroWeightCount = members.filter(
    (m: BundleContributionRow) => parseFloat(m.final_effective_weight) === 0,
  ).length;

  // ── INSERT evidence_bundle ─────────────────────────────────────────────────
  const bundleRes = await client.query(
    `INSERT INTO evidence_bundles
       (claim_id, fusion_operator_version_id, deterministic_ordering_rule,
        bundle_version, construction_timestamp, supersedes)
     VALUES ($1::uuid, $2::uuid, $3, 1, $4::timestamptz, $5::uuid)
     RETURNING id`,
    [claimId, fusionOpVerId, ORDERING_RULE, constructionTimestamp, supersedes],
  );
  const bundleId = (bundleRes.rows[0] as { id: string }).id;

  // ── INSERT evidence_bundle_members ────────────────────────────────────────
  for (let i = 0; i < members.length; i++) {
    await client.query(
      `INSERT INTO evidence_bundle_members
         (bundle_id, weighted_contribution_id, sequence_number, dependence_group_id)
       VALUES ($1::uuid, $2::uuid, $3, NULL)`,
      [bundleId, members[i].contribution_id, i + 1],
    );
  }

  return {
    ok: true,
    bundleId,
    members,
    discardedCount,
    zeroWeightCount,
  };
}
