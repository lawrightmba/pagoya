/**
 * Build 2A — Claim Resolution (Package 2A-2)
 *
 * Resolves the active Behavioral Claim for a given entity, primitive, and domain
 * at ingestion time. Only the current chain-tip, non-retired, within-window claim
 * is eligible.
 *
 * Rules:
 *   - Does NOT resolve against superseded claims (not chain tips).
 *   - Does NOT resolve against retired claims (have a behavioral_claim_retirements row).
 *   - Does NOT resolve against out-of-window claims.
 *   - Does NOT choose the "nearest" claim as a convenience fallback.
 *   - No matching claim → returns a refusal payload; caller creates the refusal_record.
 *   - Does NOT formulate or create claims dynamically.
 */

import { sql } from "drizzle-orm";
import { logger } from "../../lib/logger.js";

export type ClaimRow = {
  id: string;
  entity_id: string;
  primitive_id: string;
  domain_module_id: string;
  window_start: string;
  window_end: string;
  falsifiability_condition: string;
  version_context_id: string | null;
  supersedes: string | null;
  created_at: string;
  // Joined fields for convenience
  primitive_name: string;
  domain_slug: string;
};

export type ClaimResolutionSuccess = {
  resolved: true;
  claim: ClaimRow;
  resolution_note: string;
};

export type ClaimResolutionRefusal = {
  resolved: false;
  reason_code: "no_matching_claim";
  detail: string;
};

export type ClaimResolutionResult = ClaimResolutionSuccess | ClaimResolutionRefusal;

/**
 * Resolve the active Behavioral Claim for a (entity, primitive, domain) combination
 * that is valid at the given reference timestamp.
 *
 * Eligible claim criteria:
 *   1. entity_id matches
 *   2. primitive_id matches
 *   3. domain_module_id matches
 *   4. window_start <= referenceAt <= window_end
 *   5. NOT retired (no row in behavioral_claim_retirements)
 *   6. IS chain tip (no other claim supersedes this one)
 *
 * @param entityId       UUID of the resolved behavioral_entities row
 * @param primitiveId    UUID of the behavioral_primitives row
 * @param domainModuleId UUID of the domain_modules row
 * @param referenceAt    ISO timestamp to check window validity (typically NOW())
 */
export async function resolveClaimForIngestion(
  entityId: string,
  primitiveId: string,
  domainModuleId: string,
  referenceAt: string,
): Promise<ClaimResolutionResult> {
  const { db } = await import("@workspace/db");

  // Resolve via latest_behavioral_claim_v (chain-tip, non-superseded) and add
  // the retired-claim filter. The view already excludes superseded claims.
  const result = await db.execute(sql`
    SELECT
      bc.id, bc.entity_id, bc.primitive_id, bc.domain_module_id,
      bc.window_start, bc.window_end, bc.falsifiability_condition,
      bc.version_context_id, bc.supersedes, bc.created_at,
      bp.name  AS primitive_name,
      dm.slug  AS domain_slug
    FROM latest_behavioral_claim_v bc
    JOIN behavioral_primitives bp ON bp.id = bc.primitive_id
    JOIN domain_modules         dm ON dm.id = bc.domain_module_id
    WHERE bc.entity_id        = ${entityId}::uuid
      AND bc.primitive_id     = ${primitiveId}::uuid
      AND bc.domain_module_id = ${domainModuleId}::uuid
      AND bc.window_start <= ${referenceAt}::timestamptz
      AND bc.window_end   >= ${referenceAt}::timestamptz
      AND NOT EXISTS (
        SELECT 1 FROM behavioral_claim_retirements bcr
        WHERE bcr.claim_id = bc.id
      )
    ORDER BY bc.created_at DESC
    LIMIT 1
  `);

  const row = result.rows[0] as ClaimRow | undefined;

  if (!row) {
    logger.debug(
      { entityId, primitiveId, domainModuleId, referenceAt },
      "[Build2A/claimResolution] no eligible claim found",
    );
    return {
      resolved: false,
      reason_code: "no_matching_claim",
      detail:
        `No active chain-tip, non-retired Behavioral Claim found for ` +
        `entity_id='${entityId}', primitive_id='${primitiveId}', ` +
        `domain_module_id='${domainModuleId}' at ${referenceAt}. ` +
        `No nearest-claim fallback is performed — an explicit active claim is required.`,
    };
  }

  logger.debug(
    { claimId: row.id, entityId, primitiveId, domainModuleId },
    "[Build2A/claimResolution] claim resolved",
  );

  return {
    resolved: true,
    claim: row,
    resolution_note:
      `Claim ${row.id} resolved: primitive='${row.primitive_name}', ` +
      `domain='${row.domain_slug}', window=[${row.window_start}, ${row.window_end}].`,
  };
}

/**
 * Resolve primitive_id and domain_module_id by slug/name.
 * Convenience helper for the poller — returns null if not found.
 */
export async function resolvePrimitiveAndDomain(
  primitiveName: string,
  domainSlug: string,
): Promise<{ primitiveId: string; domainModuleId: string } | null> {
  const { db } = await import("@workspace/db");

  const result = await db.execute(sql`
    SELECT bp.id AS primitive_id, dm.id AS domain_module_id
    FROM behavioral_primitives bp
    CROSS JOIN domain_modules dm
    WHERE bp.name = ${primitiveName}
      AND dm.slug = ${domainSlug}
    LIMIT 1
  `);

  const row = result.rows[0] as { primitive_id: string; domain_module_id: string } | undefined;
  if (!row) return null;
  return { primitiveId: row.primitive_id, domainModuleId: row.domain_module_id };
}
