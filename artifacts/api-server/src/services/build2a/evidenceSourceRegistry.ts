/**
 * Build 2A — Evidence Source Registry (Package 2A-1)
 *
 * Package 2A-1 responsibilities only:
 *   - Retrieve approved sources
 *   - Retrieve source metadata by source_key
 *   - Inspect source classification and privacy classification
 *   - Inspect approval/deprecation state
 *   - Select the most direct eligible approved source when multiple compatible sources exist
 *   - Return recorded selection reasoning
 *
 * Non-goals for this package:
 *   - Reading or processing source rows
 *   - Creating Evidence Atoms
 *   - Accepting arbitrary runtime table names or arbitrary SQL
 *
 * Feature flag: ENABLE_EVIDENCE_ENGINE must be "true" for runtime processing.
 * Schema initialization runs regardless of the flag.
 */

import { sql } from "drizzle-orm";
import { logger } from "../../lib/logger.js";

// Source classification precedence for "most direct" selection.
// Lower index = more direct evidence.
const CLASSIFICATION_PRECEDENCE: Record<string, number> = {
  direct: 0,
  derived: 1,
  aggregate: 2,
  model_resolution: 3,
  outcome: 4,
};

export type EvidenceSourceRow = {
  id: string;
  source_key: string;
  display_name: string;
  source_classification: string;
  privacy_classification: string;
  native_table_name: string;
  description: string;
  approval_status: string;
  deprecated_at: string | null;
  created_at: string;
};

export type SourceSelectionResult = {
  selected: EvidenceSourceRow | null;
  candidates: EvidenceSourceRow[];
  selection_reason: string;
  refused: boolean;
  refusal_reason: string | null;
};

/**
 * Returns true if the evidence engine runtime is enabled.
 * Schema initialization is NOT gated by this flag.
 */
export function isEvidenceEngineEnabled(): boolean {
  return process.env.ENABLE_EVIDENCE_ENGINE === "true";
}

/**
 * Retrieve all currently approved (non-revoked, non-deprecated) sources
 * from the evidence_source_registry.
 */
export async function getApprovedSources(): Promise<EvidenceSourceRow[]> {
  const { db } = await import("@workspace/db");
  const result = await db.execute(sql`
    SELECT id, source_key, display_name, source_classification,
           privacy_classification, native_table_name, description,
           approval_status, deprecated_at, created_at
    FROM evidence_source_registry
    WHERE approval_status = 'approved'
      AND deprecated_at IS NULL
    ORDER BY source_key
  `);
  return result.rows as EvidenceSourceRow[];
}

/**
 * Retrieve a single source's full metadata by source_key.
 * Returns null if not found. Does not filter by approval_status —
 * callers must check approval_status themselves.
 */
export async function getSourceByKey(sourceKey: string): Promise<EvidenceSourceRow | null> {
  const { db } = await import("@workspace/db");
  const result = await db.execute(sql`
    SELECT id, source_key, display_name, source_classification,
           privacy_classification, native_table_name, description,
           approval_status, deprecated_at, created_at
    FROM evidence_source_registry
    WHERE source_key = ${sourceKey}
    LIMIT 1
  `);
  return (result.rows[0] as EvidenceSourceRow | undefined) ?? null;
}

/**
 * Returns true if the source_key refers to an approved, non-deprecated source.
 */
export async function isSourceApproved(sourceKey: string): Promise<boolean> {
  const row = await getSourceByKey(sourceKey);
  if (!row) return false;
  return row.approval_status === "approved" && row.deprecated_at === null;
}

/**
 * Returns the classification (direct/derived/model_resolution/aggregate/outcome)
 * of a given source. Returns null if the source does not exist.
 */
export async function getSourceClassification(
  sourceKey: string,
): Promise<string | null> {
  const row = await getSourceByKey(sourceKey);
  return row?.source_classification ?? null;
}

/**
 * Returns the privacy classification of a given source.
 * Returns null if the source does not exist.
 */
export async function getPrivacyClassification(
  sourceKey: string,
): Promise<string | null> {
  const row = await getSourceByKey(sourceKey);
  return row?.privacy_classification ?? null;
}

/**
 * Given a list of approved source_keys, select the single most direct one.
 * "Most direct" is determined by CLASSIFICATION_PRECEDENCE — lower value wins.
 * Ties are broken by creation timestamp (earlier wins — stable, deterministic).
 *
 * Returns a SourceSelectionResult with:
 *   - selected: the winning source, or null if refused
 *   - candidates: all approved sources from the provided list
 *   - selection_reason: human-readable explanation of why this source was chosen
 *   - refused: true if no valid selection can be made
 *   - refusal_reason: explanation when refused
 *
 * Does NOT create Evidence Atoms. Does NOT read source row data.
 */
export async function selectMostDirectSource(
  sourceKeys: string[],
): Promise<SourceSelectionResult> {
  if (sourceKeys.length === 0) {
    return {
      selected: null,
      candidates: [],
      selection_reason: "",
      refused: true,
      refusal_reason: "No source_keys provided.",
    };
  }

  const { db } = await import("@workspace/db");
  // Use sql.raw() for the IN clause — Drizzle's sql tag cannot pass JS arrays
  // to ANY() correctly (generates ($1,$2,...) instead of ARRAY[$1,$2,...]).
  const inList = sourceKeys.map(k => `'${k.replace(/'/g, "''")}'`).join(", ");
  const result = await db.execute(sql.raw(`
    SELECT id, source_key, display_name, source_classification,
           privacy_classification, native_table_name, description,
           approval_status, deprecated_at, created_at
    FROM evidence_source_registry
    WHERE source_key IN (${inList})
    ORDER BY created_at ASC
  `));

  const allRows = result.rows as EvidenceSourceRow[];
  const approved = allRows.filter(
    r => r.approval_status === "approved" && r.deprecated_at === null,
  );

  if (approved.length === 0) {
    const notApproved = allRows.map(r => `${r.source_key}(${r.approval_status})`).join(", ");
    return {
      selected: null,
      candidates: allRows,
      selection_reason: "",
      refused: true,
      refusal_reason: allRows.length === 0
        ? `None of the requested source_keys exist in the registry: [${sourceKeys.join(", ")}]`
        : `All candidate sources are non-approved: ${notApproved}`,
    };
  }

  // Sort by precedence ascending (most direct first), then by created_at ascending for ties
  const sorted = [...approved].sort((a, b) => {
    const precA = CLASSIFICATION_PRECEDENCE[a.source_classification] ?? 99;
    const precB = CLASSIFICATION_PRECEDENCE[b.source_classification] ?? 99;
    if (precA !== precB) return precA - precB;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });

  const winner = sorted[0]!;
  const reason = approved.length === 1
    ? `Single approved candidate: ${winner.source_key} (classification: ${winner.source_classification}).`
    : `Selected most direct source from ${approved.length} approved candidates. ` +
      `${winner.source_key} (classification: ${winner.source_classification}) ` +
      `has precedence ${CLASSIFICATION_PRECEDENCE[winner.source_classification] ?? 99}. ` +
      `Other candidates: [${sorted.slice(1).map(s => `${s.source_key}(${s.source_classification})`).join(", ")}].`;

  logger.debug(
    { winner: winner.source_key, candidateCount: approved.length },
    "[Build2A/evidenceSourceRegistry] selectMostDirectSource resolved",
  );

  return {
    selected: winner,
    candidates: approved,
    selection_reason: reason,
    refused: false,
    refusal_reason: null,
  };
}

/**
 * Returns all sources grouped by their classification.
 * Useful for admin inspection; includes all approval states.
 */
export async function getSourcesByClassification(): Promise<
  Record<string, EvidenceSourceRow[]>
> {
  const { db } = await import("@workspace/db");
  const result = await db.execute(sql`
    SELECT id, source_key, display_name, source_classification,
           privacy_classification, native_table_name, description,
           approval_status, deprecated_at, created_at
    FROM evidence_source_registry
    ORDER BY source_classification, source_key
  `);
  const rows = result.rows as EvidenceSourceRow[];
  const grouped: Record<string, EvidenceSourceRow[]> = {};
  for (const row of rows) {
    const cls = row.source_classification;
    if (!grouped[cls]) grouped[cls] = [];
    grouped[cls]!.push(row);
  }
  return grouped;
}
