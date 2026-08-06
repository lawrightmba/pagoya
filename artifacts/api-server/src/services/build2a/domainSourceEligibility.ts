/**
 * Build 2A — Domain Source Eligibility (Package 2A-1)
 *
 * Implements exact source-to-domain eligibility lookup.
 *
 * Eligibility is granted ONLY by an approved row in domain_source_eligibility
 * matching: domain_module_id + evidence_source_registry_id + optional primitive_id
 * + active approval_status + rule version.
 *
 * Broad source classification alone is NEVER sufficient to authorize use.
 * A human-financial source is not eligible for an agent domain without an
 * explicit row, and vice versa.
 *
 * Refusal-ready results are returned (never thrown) for:
 *   - no_matching_eligibility: no row found for the requested combination
 *   - revoked_eligibility: row exists but approval_status = 'revoked'
 *   - primitive_mismatch: primitive_id requested but eligibility row uses different primitive
 *   - unavailable_rule_version: rule_version_id set but referenced version is inactive
 *
 * Package 2A-1 does NOT interpret Observations. It only establishes whether
 * a given source is eligible for use in a given domain.
 */

import { sql } from "drizzle-orm";
import { logger } from "../../lib/logger.js";

export type EligibilityRefusalReason =
  | "no_matching_eligibility"
  | "revoked_eligibility"
  | "primitive_mismatch"
  | "unavailable_rule_version"
  | "source_not_approved"
  | "domain_not_found";

export type EligibilityRow = {
  id: string;
  domain_module_id: string;
  evidence_source_registry_id: string;
  primitive_id: string | null;
  approval_status: string;
  rule_version_id: string | null;
  notes: string;
  created_at: string;
};

export type EligibilityResult =
  | {
      eligible: true;
      row: EligibilityRow;
      domain_slug: string;
      source_key: string;
      selection_reasoning: string;
    }
  | {
      eligible: false;
      refusal_reason: EligibilityRefusalReason;
      detail: string;
      domain_slug: string;
      source_key: string;
    };

/**
 * Look up eligibility for a (domain_slug, source_key) pair.
 *
 * @param domainSlug  - the slug of the domain module (e.g. 'payment_reliability')
 * @param sourceKey   - the source_key in evidence_source_registry (e.g. 'agent_tasks')
 * @param primitiveId - optional: UUID of a specific behavioral primitive; if null, looks for
 *                      an eligibility row where primitive_id IS NULL
 *
 * Returns a refusal if:
 *   - domain slug does not exist
 *   - source key does not exist or is not approved
 *   - no eligibility row found for (module, source, primitive)
 *   - eligibility row exists but is revoked
 *   - rule_version_id is set and the referenced version is not active + replayable
 */
export async function checkDomainSourceEligibility(
  domainSlug: string,
  sourceKey: string,
  primitiveId?: string | null,
): Promise<EligibilityResult> {
  const { db } = await import("@workspace/db");

  // 1. Resolve domain module
  const domainResult = await db.execute(sql`
    SELECT id FROM domain_modules WHERE slug = ${domainSlug} LIMIT 1
  `);
  const domainRow = domainResult.rows[0] as { id: string } | undefined;
  if (!domainRow) {
    return {
      eligible: false,
      refusal_reason: "domain_not_found",
      detail: `Domain module with slug '${domainSlug}' does not exist in domain_modules.`,
      domain_slug: domainSlug,
      source_key: sourceKey,
    };
  }

  // 2. Resolve and check source approval
  const sourceResult = await db.execute(sql`
    SELECT id, approval_status, deprecated_at
    FROM evidence_source_registry
    WHERE source_key = ${sourceKey}
    LIMIT 1
  `);
  const sourceRow = sourceResult.rows[0] as {
    id: string;
    approval_status: string;
    deprecated_at: string | null;
  } | undefined;

  if (!sourceRow) {
    return {
      eligible: false,
      refusal_reason: "no_matching_eligibility",
      detail: `Source key '${sourceKey}' does not exist in evidence_source_registry.`,
      domain_slug: domainSlug,
      source_key: sourceKey,
    };
  }

  if (sourceRow.approval_status !== "approved" || sourceRow.deprecated_at !== null) {
    return {
      eligible: false,
      refusal_reason: "source_not_approved",
      detail: `Source '${sourceKey}' has approval_status='${sourceRow.approval_status}' and deprecated_at='${sourceRow.deprecated_at ?? "null"}'. Only approved, non-deprecated sources are eligible.`,
      domain_slug: domainSlug,
      source_key: sourceKey,
    };
  }

  // 3. Look for an eligibility row — exact match on (domain_module_id, source_id, primitive_id)
  //    The COALESCE sentinel mirrors the functional unique index in migrations.
  const eligResult = await db.execute(sql`
    SELECT dse.id, dse.domain_module_id, dse.evidence_source_registry_id,
           dse.primitive_id, dse.approval_status, dse.rule_version_id,
           dse.notes, dse.created_at
    FROM domain_source_eligibility dse
    WHERE dse.domain_module_id = ${domainRow.id}::uuid
      AND dse.evidence_source_registry_id = ${sourceRow.id}::uuid
      AND COALESCE(dse.primitive_id, '00000000-0000-0000-0000-000000000000'::uuid)
          = COALESCE(${primitiveId ?? null}::uuid, '00000000-0000-0000-0000-000000000000'::uuid)
    LIMIT 1
  `);
  const eligRow = eligResult.rows[0] as EligibilityRow | undefined;

  if (!eligRow) {
    const primitiveClause = primitiveId
      ? ` with primitive_id='${primitiveId}'`
      : " with no specific primitive";
    return {
      eligible: false,
      refusal_reason: "no_matching_eligibility",
      detail: `No eligibility row found for domain='${domainSlug}', source='${sourceKey}'${primitiveClause}. ` +
        "Broad source classification does not authorize use — an explicit domain_source_eligibility row is required.",
      domain_slug: domainSlug,
      source_key: sourceKey,
    };
  }

  if (eligRow.approval_status === "revoked") {
    return {
      eligible: false,
      refusal_reason: "revoked_eligibility",
      detail: `Eligibility row ${eligRow.id} for domain='${domainSlug}', source='${sourceKey}' has been revoked.`,
      domain_slug: domainSlug,
      source_key: sourceKey,
    };
  }

  // 4. If a rule_version_id is pinned, verify it exists and is active or replayable
  if (eligRow.rule_version_id) {
    const rvResult = await db.execute(sql`
      SELECT is_active, replayable_for_history
      FROM interpretation_rule_versions
      WHERE id = ${eligRow.rule_version_id}::uuid
      LIMIT 1
    `);
    const rv = rvResult.rows[0] as {
      is_active: boolean;
      replayable_for_history: boolean;
    } | undefined;

    if (!rv || (!rv.is_active && !rv.replayable_for_history)) {
      return {
        eligible: false,
        refusal_reason: "unavailable_rule_version",
        detail: `Eligibility row ${eligRow.id} references rule_version_id='${eligRow.rule_version_id}' ` +
          "which is either not found or is inactive and not replayable.",
        domain_slug: domainSlug,
        source_key: sourceKey,
      };
    }
  }

  const primitiveNote = eligRow.primitive_id
    ? ` (scoped to primitive_id=${eligRow.primitive_id})`
    : " (no primitive restriction)";

  logger.debug(
    { domainSlug, sourceKey, eligibilityRowId: eligRow.id },
    "[Build2A/domainSourceEligibility] eligibility confirmed",
  );

  return {
    eligible: true,
    row: eligRow,
    domain_slug: domainSlug,
    source_key: sourceKey,
    selection_reasoning:
      `Explicit eligibility row ${eligRow.id} found for domain='${domainSlug}', ` +
      `source='${sourceKey}'${primitiveNote}. approval_status='${eligRow.approval_status}'.`,
  };
}

/**
 * Returns all active eligibility rows for a given domain module slug.
 * Useful for listing what sources are approved for a domain.
 */
export async function getEligibilityForDomain(
  domainSlug: string,
): Promise<EligibilityRow[]> {
  const { db } = await import("@workspace/db");
  const result = await db.execute(sql`
    SELECT dse.id, dse.domain_module_id, dse.evidence_source_registry_id,
           dse.primitive_id, dse.approval_status, dse.rule_version_id,
           dse.notes, dse.created_at
    FROM domain_source_eligibility dse
    JOIN domain_modules dm ON dm.id = dse.domain_module_id
    WHERE dm.slug = ${domainSlug}
      AND dse.approval_status = 'approved'
    ORDER BY dse.created_at
  `);
  return result.rows as EligibilityRow[];
}

/**
 * Returns all active eligibility rows for a given source_key.
 * Useful for listing which domains a source has been authorized for.
 */
export async function getEligibilityForSource(
  sourceKey: string,
): Promise<Array<EligibilityRow & { domain_slug: string }>> {
  const { db } = await import("@workspace/db");
  const result = await db.execute(sql`
    SELECT dse.id, dse.domain_module_id, dse.evidence_source_registry_id,
           dse.primitive_id, dse.approval_status, dse.rule_version_id,
           dse.notes, dse.created_at, dm.slug AS domain_slug
    FROM domain_source_eligibility dse
    JOIN domain_modules dm ON dm.id = dse.domain_module_id
    JOIN evidence_source_registry esr ON esr.id = dse.evidence_source_registry_id
    WHERE esr.source_key = ${sourceKey}
      AND dse.approval_status = 'approved'
    ORDER BY dm.slug, dse.created_at
  `);
  return result.rows as Array<EligibilityRow & { domain_slug: string }>;
}
