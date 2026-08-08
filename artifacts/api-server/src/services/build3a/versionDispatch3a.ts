/**
 * Build 3A — Version Dispatch (Trajectory Foundation)
 *
 * Build3A-owned dispatch for trajectory_rule_versions.
 * Does NOT modify the locked Build 2A versionDispatch.ts.
 *
 * trajectory_rule_versions is not in Build 2A's VersionTableName union type,
 * so the generic resolver cannot be used without modifying the locked file.
 * This file implements equivalent dispatch logic for the trajectory table only.
 *
 * Key states:
 *   KNOWN_ACTIVE             — exists, is_active = true
 *   KNOWN_INACTIVE           — exists, is_active = false
 *   UNKNOWN                  — not in registry
 *
 * Changing mathematics requires a new implementation_key.
 * This dispatcher never silently falls back or substitutes a different key.
 */

import { sql } from "drizzle-orm";
import { logger } from "../../lib/logger.js";

export const TRAJECTORY_RULE_TABLE = "trajectory_rule_versions" as const;

export type TrajectoryRuleState = "KNOWN_ACTIVE" | "KNOWN_INACTIVE" | "UNKNOWN";

export type TrajectoryRuleRow = {
  id: string;
  implementation_key: string;
  version_label: string;
  is_active: boolean;
  formula_description: string;
  created_at: string;
};

export type TrajectoryRuleResolution =
  | {
      found: true;
      state: "KNOWN_ACTIVE" | "KNOWN_INACTIVE";
      row: TrajectoryRuleRow;
      usable_for_new_computation: boolean;
      resolution_note: string;
    }
  | {
      found: false;
      state: "UNKNOWN";
      implementation_key: string;
      resolution_note: string;
    };

/**
 * The Build 3A required trajectory rule key.
 * Must be present and active before any trajectory computation is permitted.
 */
export const PACKAGE_3A_REQUIRED_KEYS: Record<string, typeof TRAJECTORY_RULE_TABLE> = {
  finite_difference_trajectory_v1: TRAJECTORY_RULE_TABLE,
} as const;

/**
 * Resolve an implementation_key in trajectory_rule_versions.
 *
 * NEVER substitutes the current active key for a historical key.
 * NEVER falls back silently to a different implementation.
 * If the key is unknown, returns found=false with state=UNKNOWN.
 */
export async function resolveTrajectoryRuleVersion(
  implementationKey: string,
): Promise<TrajectoryRuleResolution> {
  const { db } = await import("@workspace/db");

  const result = await db.execute(sql`
    SELECT id, implementation_key, version_label, is_active, formula_description, created_at
    FROM trajectory_rule_versions
    WHERE implementation_key = ${implementationKey}
    LIMIT 1
  `);

  if (result.rows.length === 0) {
    logger.debug(
      { implementationKey },
      "[Build3A/versionDispatch3a] implementation_key not found — UNKNOWN",
    );
    return {
      found: false,
      state: "UNKNOWN",
      implementation_key: implementationKey,
      resolution_note: `implementation_key '${implementationKey}' does not exist in trajectory_rule_versions. ` +
        "A new row with this key must be registered before use.",
    };
  }

  const row = result.rows[0] as TrajectoryRuleRow;
  const state: TrajectoryRuleState = row.is_active ? "KNOWN_ACTIVE" : "KNOWN_INACTIVE";

  logger.debug(
    { implementationKey, state },
    "[Build3A/versionDispatch3a] implementation_key resolved",
  );

  const resolution_note = state === "KNOWN_ACTIVE"
    ? `'${implementationKey}' is active (v${row.version_label}). Usable for new computation.`
    : `'${implementationKey}' is inactive (is_active=false). Not usable for new computations; historical replay only if reactivated.`;

  return {
    found: true,
    state,
    row,
    usable_for_new_computation: row.is_active,
    resolution_note,
  };
}

/**
 * Validates that all Build 3A required keys are registered and active.
 * Called at startup after ensureBuild3aTables().
 * Returns a list of validation errors (empty = healthy).
 */
export async function validateBuild3aKeys(): Promise<string[]> {
  const errors: string[] = [];
  for (const key of Object.keys(PACKAGE_3A_REQUIRED_KEYS)) {
    const result = await resolveTrajectoryRuleVersion(key);
    if (!result.found) {
      errors.push(`[Build3A] Required key '${key}' is missing from trajectory_rule_versions.`);
    } else if (!result.usable_for_new_computation) {
      errors.push(`[Build3A] Required key '${key}' in trajectory_rule_versions is inactive. ${result.resolution_note}`);
    }
  }
  return errors;
}

/**
 * Returns the active trajectory rule version row for finite_difference_trajectory_v1.
 * Throws if not found or inactive — callers must handle this.
 */
export async function getActiveTrajectoryRuleVersion(): Promise<TrajectoryRuleRow> {
  const resolution = await resolveTrajectoryRuleVersion("finite_difference_trajectory_v1");
  if (!resolution.found || !resolution.usable_for_new_computation) {
    throw new Error(
      `[Build3A] finite_difference_trajectory_v1 is not available for computation: ${resolution.resolution_note}`,
    );
  }
  return resolution.row;
}
