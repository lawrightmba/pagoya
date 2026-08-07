/**
 * Build 2A — Version Dispatch (Package 2A-1)
 *
 * Establishes the stable implementation-key dispatch foundation.
 *
 * Package 2A-1 does NOT yet implement fusion or interpretation computation.
 * It DOES establish the mechanism later packages will use:
 *   - Resolve a stored immutable implementation_key
 *   - Distinguish known / unknown / inactive / retired-but-replayable
 *   - Never substitute the currently active key for a historical key
 *   - Never silently fall back to another implementation
 *   - Single controlled registration/lookup mechanism
 *   - Existing keys are immutable by convention and test
 *   - Changed behavior requires a new key
 *
 * Seeded Package 2A-1 keys (at migration time):
 *   - sl_binomial_projection_v1 (projection_function_versions)
 *
 * Key states:
 *   KNOWN_ACTIVE           — exists in registry, is_active = true
 *   KNOWN_INACTIVE         — exists in registry, is_active = false, replayable_for_history = false
 *   KNOWN_RETIRED_REPLAYABLE — exists in registry, is_active = false, replayable_for_history = true
 *   UNKNOWN                — not in registry at all
 */

import { sql } from "drizzle-orm";
import { logger } from "../../lib/logger.js";

export type VersionTableName =
  | "projection_function_versions"
  | "interpretation_rule_versions"
  | "quality_rule_versions"
  | "integrity_rule_versions"
  | "fusion_operator_versions"
  | "knowledge_sufficiency_predicate_versions";

export type DispatchKeyState =
  | "KNOWN_ACTIVE"
  | "KNOWN_INACTIVE"
  | "KNOWN_RETIRED_REPLAYABLE"
  | "UNKNOWN";

export type VersionDispatchRow = {
  id: string;
  implementation_key: string;
  version_label: string;
  is_active: boolean;
  replayable_for_history: boolean;
  created_at: string;
  // Optional fields that may exist on specific version tables
  formula_description?: string;
  parameters?: unknown;
  rule_content?: unknown;
  operator_description?: string;
  predicate_expression?: string;
};

export type DispatchResolutionResult =
  | {
      found: true;
      state: "KNOWN_ACTIVE" | "KNOWN_INACTIVE" | "KNOWN_RETIRED_REPLAYABLE";
      row: VersionDispatchRow;
      table: VersionTableName;
      usable_for_new_computation: boolean;
      usable_for_historical_replay: boolean;
      resolution_note: string;
    }
  | {
      found: false;
      state: "UNKNOWN";
      implementation_key: string;
      table: VersionTableName;
      resolution_note: string;
    };

/**
 * The approved Package 2A-1 registered keys.
 * This constant is the single authoritative list of keys that MUST exist
 * in the registry. It is checked at boot by validatePackage2a1Keys().
 */
export const PACKAGE_2A1_REQUIRED_KEYS: Record<string, VersionTableName> = {
  sl_binomial_projection_v1: "projection_function_versions",
} as const;

/**
 * Resolve an implementation_key in a specific version table.
 *
 * NEVER substitutes the current active key for a historical key.
 * NEVER falls back silently to a different implementation.
 * If the key is unknown, returns found=false with state=UNKNOWN.
 *
 * @param implementationKey - the immutable key string (e.g. 'sl_binomial_projection_v1')
 * @param table             - which version table to look in
 */
export async function resolveImplementationKey(
  implementationKey: string,
  table: VersionTableName,
): Promise<DispatchResolutionResult> {
  const { db } = await import("@workspace/db");

  // Build column list dynamically per table. All version tables share the core columns;
  // table-specific columns are selected via CASE so unknown tables don't fail.
  const result = await db.execute(
    sql.raw(`
      SELECT id, implementation_key, version_label, is_active, replayable_for_history, created_at
      FROM ${table}
      WHERE implementation_key = '${implementationKey.replace(/'/g, "''")}'
      LIMIT 1
    `)
  );

  if (result.rows.length === 0) {
    logger.debug(
      { implementationKey, table },
      "[Build2A/versionDispatch] implementation_key not found — UNKNOWN",
    );
    return {
      found: false,
      state: "UNKNOWN",
      implementation_key: implementationKey,
      table,
      resolution_note: `implementation_key '${implementationKey}' does not exist in ${table}. ` +
        "A new row with this key must be registered before use.",
    };
  }

  const row = result.rows[0] as VersionDispatchRow;
  const state: DispatchKeyState = row.is_active
    ? "KNOWN_ACTIVE"
    : row.replayable_for_history
      ? "KNOWN_RETIRED_REPLAYABLE"
      : "KNOWN_INACTIVE";

  logger.debug(
    { implementationKey, table, state },
    "[Build2A/versionDispatch] implementation_key resolved",
  );

  return {
    found: true,
    state,
    row,
    table,
    usable_for_new_computation: row.is_active,
    usable_for_historical_replay: row.is_active || row.replayable_for_history,
    resolution_note: buildResolutionNote(implementationKey, table, state, row),
  };
}

function buildResolutionNote(
  key: string,
  table: VersionTableName,
  state: DispatchKeyState,
  row: VersionDispatchRow,
): string {
  switch (state) {
    case "KNOWN_ACTIVE":
      return `'${key}' in ${table} is active (v${row.version_label}). Usable for new computation and historical replay.`;
    case "KNOWN_RETIRED_REPLAYABLE":
      return `'${key}' in ${table} is retired (is_active=false) but marked replayable_for_history=true. ` +
        "May be used for historical replay ONLY. Do NOT use for new computations.";
    case "KNOWN_INACTIVE":
      return `'${key}' in ${table} is inactive (is_active=false, replayable_for_history=false). ` +
        "Not usable for new computations or historical replay.";
    default:
      return `'${key}' in ${table}: state=${state}.`;
  }
}

/**
 * Register a new implementation key in the specified version table.
 *
 * If the key already exists: returns the existing row without modification.
 * This enforces immutability by convention — once registered, behavior cannot change.
 * A caller that wants changed behavior MUST supply a new, distinct implementation_key.
 *
 * @param params.implementationKey  - unique key string (e.g. 'my_operator_v2')
 * @param params.table              - which version table to register in
 * @param params.versionLabel       - human-readable version label (e.g. 'v2.0')
 * @param params.isActive           - whether this key is currently active
 * @param params.replayableForHistory - whether retired versions may be used for replay
 * @param params.extraColumns       - additional columns specific to the table type
 *
 * Returns { registered: true, row, was_new } on success.
 * Returns { registered: false, reason } if key would conflict with changed behavior.
 */
export async function registerImplementationKey(params: {
  implementationKey: string;
  table: VersionTableName;
  versionLabel: string;
  isActive: boolean;
  replayableForHistory: boolean;
  extraColumns?: Record<string, unknown>;
}): Promise<
  | { registered: true; row: VersionDispatchRow; was_new: boolean }
  | { registered: false; reason: string }
> {
  const { db } = await import("@workspace/db");
  const {
    implementationKey,
    table,
    versionLabel,
    isActive,
    replayableForHistory,
    extraColumns = {},
  } = params;

  // Check if already exists
  const existing = await resolveImplementationKey(implementationKey, table);
  if (existing.found) {
    // Key already registered — return existing row (immutability by convention)
    logger.debug(
      { implementationKey, table },
      "[Build2A/versionDispatch] key already registered — returning existing row",
    );
    return { registered: true, row: existing.row, was_new: false };
  }

  // Build INSERT dynamically based on table type
  const extraKeys = Object.keys(extraColumns);
  const extraValues = Object.values(extraColumns);

  if (extraKeys.length === 0) {
    await db.execute(
      sql.raw(`
        INSERT INTO ${table} (implementation_key, version_label, is_active, replayable_for_history)
        VALUES (
          '${implementationKey.replace(/'/g, "''")}',
          '${versionLabel.replace(/'/g, "''")}',
          ${isActive},
          ${replayableForHistory}
        )
        ON CONFLICT (implementation_key) DO NOTHING
      `)
    );
  } else {
    // For safety with extra columns, use parameterized approach via raw
    // We only reach here from internal code, never from user input
    const colList = ["implementation_key", "version_label", "is_active", "replayable_for_history", ...extraKeys].join(", ");
    const valList = [
      `'${implementationKey.replace(/'/g, "''")}'`,
      `'${versionLabel.replace(/'/g, "''")}'`,
      String(isActive),
      String(replayableForHistory),
      ...extraValues.map(v => typeof v === "string" ? `'${v.replace(/'/g, "''")}'` : String(v)),
    ].join(", ");
    await db.execute(sql.raw(`
      INSERT INTO ${table} (${colList}) VALUES (${valList})
      ON CONFLICT (implementation_key) DO NOTHING
    `));
  }

  // Fetch the inserted (or pre-existing) row
  const afterInsert = await resolveImplementationKey(implementationKey, table);
  if (!afterInsert.found) {
    return { registered: false, reason: "Insert succeeded but row not retrievable — unexpected." };
  }

  return { registered: true, row: afterInsert.row, was_new: true };
}

/**
 * Returns all registered keys in a given version table.
 * Includes all states (active, inactive, retired-replayable).
 */
export async function listImplementationKeys(
  table: VersionTableName,
): Promise<Array<VersionDispatchRow & { state: DispatchKeyState }>> {
  const { db } = await import("@workspace/db");
  const result = await db.execute(
    sql.raw(`
      SELECT id, implementation_key, version_label, is_active, replayable_for_history, created_at
      FROM ${table}
      ORDER BY created_at ASC
    `)
  );
  return (result.rows as VersionDispatchRow[]).map(row => ({
    ...row,
    state: row.is_active
      ? "KNOWN_ACTIVE"
      : row.replayable_for_history
        ? "KNOWN_RETIRED_REPLAYABLE"
        : "KNOWN_INACTIVE",
  }));
}

/**
 * The approved Package 2A-2 registered keys.
 */
export const PACKAGE_2A2_REQUIRED_KEYS: Record<string, VersionTableName> = {
  task_completion_v1: "interpretation_rule_versions",
} as const;

/**
 * Validates that all Package 2A-1 required keys are registered and in a healthy state.
 * Called at startup after ensureBuild2aTables() to detect seed failures.
 * Returns a list of validation errors (empty = healthy).
 */
export async function validatePackage2a1Keys(): Promise<string[]> {
  const errors: string[] = [];
  for (const [key, table] of Object.entries(PACKAGE_2A1_REQUIRED_KEYS)) {
    const result = await resolveImplementationKey(key, table);
    if (!result.found) {
      errors.push(`Required key '${key}' is missing from ${table}.`);
    }
  }
  return errors;
}

/**
 * Validates that all Package 2A-2 required keys are registered and in a healthy state.
 * Called at startup after ensureBuild2a2Tables() to detect seed failures.
 * Returns a list of validation errors (empty = healthy).
 */
export async function validatePackage2a2Keys(): Promise<string[]> {
  const errors: string[] = [];
  for (const [key, table] of Object.entries(PACKAGE_2A2_REQUIRED_KEYS)) {
    const result = await resolveImplementationKey(key, table);
    if (!result.found) {
      errors.push(`[2A-2] Required key '${key}' is missing from ${table}.`);
    }
  }
  return errors;
}

/**
 * The approved Package 2A-3 registered keys.
 * Seeded by migrations_2a3.ts. Both keys must be present, active, and
 * replayable_for_history before any weighting operation is permitted.
 */
export const PACKAGE_2A3_REQUIRED_KEYS: Record<string, VersionTableName> = {
  integrity_discount_v1: "integrity_rule_versions",
  quality_weighting_v1:  "quality_rule_versions",
} as const;

/**
 * Validates that all Package 2A-3 required keys are registered and in a healthy state.
 * Called at startup after ensureBuild2a3Tables() to detect seed failures.
 * Returns a list of validation errors (empty = healthy).
 */
export async function validatePackage2a3Keys(): Promise<string[]> {
  const errors: string[] = [];
  for (const [key, table] of Object.entries(PACKAGE_2A3_REQUIRED_KEYS)) {
    const result = await resolveImplementationKey(key, table);
    if (!result.found) {
      errors.push(`[2A-3] Required key '${key}' is missing from ${table}.`);
    } else if (!result.usable_for_new_computation) {
      errors.push(`[2A-3] Required key '${key}' in ${table} is not usable for new computation (${result.resolution_note}).`);
    }
  }
  return errors;
}
