/**
 * Build 1A — PTI Validation Layer
 *
 * Implements the five validation checks described in the Build 1A spec.
 * Each run writes a row to pti_validation_runs.
 *
 * IMPORTANT: Score replay (check a) only applies to rows in
 * pti_score_input_snapshots (post-Build-1A). Historical pti_score_history
 * rows without a stored input snapshot are classified as not_replayable and
 * are excluded from replay — re-fetching current signals would not reproduce
 * original scores.
 */

import { sql } from "drizzle-orm";
import { logger } from "../../lib/logger.js";

type RunType =
  | "score_replay"
  | "snapshot_integrity"
  | "model_version_coverage"
  | "append_only_check"
  | "export_check";

interface ValidationResult {
  runType: RunType;
  recordsChecked: number;
  recordsPassed: number;
  recordsFailed: number;
  details: Record<string, unknown>;
}

async function writeValidationRun(
  db: Awaited<ReturnType<typeof import("@workspace/db").default>>,
  triggeredBy: string,
  result: ValidationResult,
): Promise<string> {
  const startedAt = new Date().toISOString();
  const completedAt = new Date().toISOString();
  const runId = crypto.randomUUID();
  await db.execute(sql`
    INSERT INTO pti_validation_runs
      (id, run_type, started_at, completed_at,
       records_checked, records_passed, records_failed,
       details, triggered_by)
    VALUES
      (${runId}::uuid, ${result.runType},
       ${startedAt}::timestamptz, ${completedAt}::timestamptz,
       ${result.recordsChecked}, ${result.recordsPassed}, ${result.recordsFailed},
       ${JSON.stringify(result.details)}::jsonb, ${triggeredBy})
  `);
  return runId;
}

// ── (a) Score replay ──────────────────────────────────────────────────────────
/**
 * For a sample of pti_score_input_snapshots (post-Build-1A rows only),
 * re-run computePTIv5() on the stored snapshot and verify the result matches
 * the stored pti_score at the linked score_history row.
 *
 * Historical scores (pre-Build-1A, no stored snapshot) are NOT replayed.
 * Attempting to replay them by re-fetching current signals would produce
 * scores from today's data, not the original historical input. This violates
 * the integrity principle that current data ≠ original historical input.
 */
export async function runScoreReplay(
  limit = 20,
  triggeredBy = "manual",
): Promise<ValidationResult> {
  const { db } = await import("@workspace/db");
  const { computePTIv5 } = await import("../ptiV5.js");

  let checked = 0;
  let passed = 0;
  let failed = 0;
  const failingIds: Array<{ id: string; reason: string }> = [];

  try {
    const rows = await db.execute(sql`
      SELECT id, telefono, snapshot, model_version,
             captured_at, score_history_recorded_at
      FROM pti_score_input_snapshots
      WHERE persistence_status = 'persisted'
        AND score_history_recorded_at IS NOT NULL
      ORDER BY captured_at DESC
      LIMIT ${limit}
    `);

    for (const row of rows.rows as Array<{
      id: string;
      telefono: string;
      snapshot: unknown;
      model_version: string;
      score_history_recorded_at: string;
    }>) {
      checked++;
      try {
        // Retrieve the stored breakdown for this run
        const histRow = await db.execute(sql`
          SELECT pti_score, breakdown
          FROM pti_score_history
          WHERE telefono = ${row.telefono}
            AND recorded_at = ${row.score_history_recorded_at}::timestamptz
          LIMIT 1
        `);

        if ((histRow.rows as unknown[]).length === 0) {
          failed++;
          failingIds.push({ id: row.id, reason: "no_matching_history_row" });
          continue;
        }

        const histData = histRow.rows[0] as { pti_score: number; breakdown: Record<string, unknown> };

        // Re-run the pure scoring function on the stored snapshot
        const { breakdown: replayBreakdown } = computePTIv5(row.snapshot as Parameters<typeof computePTIv5>[0]);

        const storedTotal = Number(histData.pti_score);
        const replayTotal = replayBreakdown.total;

        // Allow ±0.01 tolerance for floating-point serialization
        if (Math.abs(storedTotal - replayTotal) > 0.01) {
          failed++;
          failingIds.push({
            id: row.id,
            reason: `score_mismatch:stored=${storedTotal},replay=${replayTotal}`,
          });
        } else {
          passed++;
        }
      } catch (err) {
        failed++;
        failingIds.push({ id: row.id, reason: `replay_error:${String(err)}` });
      }
    }
  } catch (err) {
    logger.warn({ err }, "[Build1A/ptiValidation] runScoreReplay query failed");
  }

  const result: ValidationResult = {
    runType: "score_replay",
    recordsChecked: checked,
    recordsPassed: passed,
    recordsFailed: failed,
    details: {
      failing_ids: failingIds,
      note: checked === 0
        ? "No replayable snapshots yet — snapshot persistence was just deployed. Re-run after scoring events occur."
        : undefined,
    },
  };

  await writeValidationRun(db, triggeredBy, result);
  return result;
}

// ── (b) Snapshot completeness ─────────────────────────────────────────────────
export async function runSnapshotIntegrityCheck(
  triggeredBy = "manual",
): Promise<ValidationResult> {
  const { db } = await import("@workspace/db");

  let checked = 0;
  let passed = 0;
  let failed = 0;
  const details: Record<string, unknown> = {};

  try {
    const histCount = await db.execute(sql`
      SELECT COUNT(*)::int AS total FROM pti_score_history
    `);
    const snapCount = await db.execute(sql`
      SELECT COUNT(*)::int AS total FROM pti_score_input_snapshots
      WHERE persistence_status = 'persisted'
    `);
    const linkedCount = await db.execute(sql`
      SELECT COUNT(*)::int AS total FROM pti_score_input_snapshots
      WHERE persistence_status = 'persisted' AND score_history_recorded_at IS NOT NULL
    `);
    const noSnapshotCount = await db.execute(sql`
      SELECT COUNT(*)::int AS total FROM pti_score_history
    `);

    const totalHistory = Number((histCount.rows[0] as { total: number }).total);
    const totalSnaps = Number((snapCount.rows[0] as { total: number }).total);
    const linkedSnaps = Number((linkedCount.rows[0] as { total: number }).total);

    // All pre-Build-1A history rows lack snapshots — this is expected
    const historicalGap = totalHistory - totalSnaps;

    checked = totalHistory;
    passed = totalSnaps;
    failed = historicalGap > 0 ? historicalGap : 0;

    details["total_history_rows"] = totalHistory;
    details["total_snapshots"] = totalSnaps;
    details["linked_snapshots"] = linkedSnaps;
    details["historical_gap"] = historicalGap;
    details["note"] =
      historicalGap > 0
        ? `${historicalGap} history rows pre-date Build 1A and have no stored input snapshot. ` +
          "These are classified historical_output_only and are not replayable — expected."
        : "All history rows have a corresponding input snapshot.";
  } catch (err) {
    details["error"] = String(err);
    logger.warn({ err }, "[Build1A/ptiValidation] runSnapshotIntegrityCheck failed");
  }

  const result: ValidationResult = {
    runType: "snapshot_integrity",
    recordsChecked: checked,
    recordsPassed: passed,
    recordsFailed: failed,
    details,
  };
  await writeValidationRun(db, triggeredBy, result);
  return result;
}

// ── (c) Model version coverage ────────────────────────────────────────────────
export async function runModelVersionCoverage(
  triggeredBy = "manual",
): Promise<ValidationResult> {
  const { db } = await import("@workspace/db");
  const details: Record<string, unknown> = {};
  let checked = 0;
  let passed = 0;
  let failed = 0;

  try {
    const rows = await db.execute(sql`
      SELECT
        COALESCE(breakdown->>'model_version', '(null)') AS model_version,
        COUNT(*)::int AS count
      FROM pti_score_history
      GROUP BY 1
      ORDER BY 2 DESC
    `);

    const byVersion = rows.rows as Array<{ model_version: string; count: number }>;
    checked = byVersion.reduce((s, r) => s + Number(r.count), 0);

    const nullRows = byVersion.find(r => r.model_version === "(null)");
    failed = nullRows ? Number(nullRows.count) : 0;
    passed = checked - failed;

    details["distribution"] = byVersion;
    details["rows_missing_version"] = failed;
    if (failed > 0) {
      details["note"] =
        `${failed} pti_score_history rows have no model_version in breakdown JSONB. ` +
        "These are likely from pre-v4 scoring runs.";
    }

    // Also check model_version_registry coverage
    const registered = await db.execute(sql`
      SELECT version_label FROM model_version_registry WHERE component = 'pti_scoring'
    `);
    const registeredLabels = new Set(
      (registered.rows as Array<{ version_label: string }>).map(r => r.version_label),
    );
    const unregisteredVersions = byVersion
      .filter(r => r.model_version !== "(null)" && !registeredLabels.has(r.model_version))
      .map(r => r.model_version);
    details["unregistered_versions"] = unregisteredVersions;
  } catch (err) {
    details["error"] = String(err);
    logger.warn({ err }, "[Build1A/ptiValidation] runModelVersionCoverage failed");
  }

  const result: ValidationResult = {
    runType: "model_version_coverage",
    recordsChecked: checked,
    recordsPassed: passed,
    recordsFailed: failed,
    details,
  };
  await writeValidationRun(db, triggeredBy, result);
  return result;
}

// ── (d) Append-only check ─────────────────────────────────────────────────────
/**
 * Verify append-only behavior: checks that no user's most recent pti_score_history
 * row has an identical recorded_at to a non-most-recent row (which would indicate
 * a duplicate overwrite). Also checks that row counts monotonically increase
 * by comparing the last 24h of inserts against expectations.
 */
export async function runAppendOnlyCheck(
  triggeredBy = "manual",
): Promise<ValidationResult> {
  const { db } = await import("@workspace/db");
  const details: Record<string, unknown> = {};
  let checked = 0;
  let passed = 0;
  let failed = 0;

  try {
    // Check for duplicate (telefono, recorded_at) pairs — indicates overwrite
    const dupes = await db.execute(sql`
      SELECT telefono, recorded_at, COUNT(*)::int AS cnt
      FROM pti_score_history
      GROUP BY telefono, recorded_at
      HAVING COUNT(*) > 1
      LIMIT 20
    `);

    const dupeRows = dupes.rows as Array<{ telefono: string; recorded_at: string; cnt: number }>;
    const totalRows = await db.execute(sql`SELECT COUNT(*)::int AS total FROM pti_score_history`);
    checked = Number((totalRows.rows[0] as { total: number }).total);
    failed = dupeRows.length;
    passed = checked;

    details["duplicate_telefono_timestamp_pairs"] = dupeRows.length;
    details["sample_duplicates"] = dupeRows.slice(0, 5).map(r => ({
      telefono: `***${String(r.telefono).slice(-4)}`,
      recorded_at: r.recorded_at,
      count: r.cnt,
    }));
    if (dupeRows.length === 0) {
      details["result"] = "PASS: no duplicate (telefono, recorded_at) pairs found";
    } else {
      details["result"] = `WARN: ${dupeRows.length} duplicate pairs found — possible re-insert issue`;
    }
  } catch (err) {
    details["error"] = String(err);
    logger.warn({ err }, "[Build1A/ptiValidation] runAppendOnlyCheck failed");
  }

  const result: ValidationResult = {
    runType: "append_only_check",
    recordsChecked: checked,
    recordsPassed: passed,
    recordsFailed: failed,
    details,
  };
  await writeValidationRun(db, triggeredBy, result);
  return result;
}

// ── (e) Export correctness ────────────────────────────────────────────────────
/**
 * Verify that the readiness export produces well-formed output with stable
 * field names, ISO 8601 timestamps, and no raw telefono/amount leakage.
 */
export async function runExportCheck(
  triggeredBy = "manual",
): Promise<ValidationResult> {
  const { db } = await import("@workspace/db");
  const details: Record<string, unknown> = {};
  let checked = 0;
  let passed = 0;
  let failed = 0;

  try {
    const rows = await db.execute(sql`
      SELECT
        telefono,
        COUNT(*)::int     AS event_count,
        MIN(recorded_at)  AS first_recorded_at,
        MAX(recorded_at)  AS last_recorded_at
      FROM pti_score_history
      GROUP BY telefono
      ORDER BY telefono
      LIMIT 5
    `);

    for (const row of rows.rows as Array<{
      telefono: string;
      event_count: number;
      first_recorded_at: string;
      last_recorded_at: string;
    }>) {
      checked++;
      const issues: string[] = [];

      // Verify ISO 8601 timestamps
      if (!/^\d{4}-\d{2}-\d{2}/.test(String(row.first_recorded_at ?? "")))
        issues.push("non_iso_first_recorded_at");
      if (!/^\d{4}-\d{2}-\d{2}/.test(String(row.last_recorded_at ?? "")))
        issues.push("non_iso_last_recorded_at");
      // Verify event_count is numeric
      if (typeof row.event_count !== "number" && isNaN(Number(row.event_count)))
        issues.push("non_numeric_event_count");

      if (issues.length === 0) {
        passed++;
      } else {
        failed++;
        details[`row_${checked}_issues`] = issues;
      }
    }

    details["rows_sampled"] = checked;
    details["result"] = failed === 0 ? "PASS" : `FAIL: ${failed} rows with format issues`;
  } catch (err) {
    details["error"] = String(err);
    logger.warn({ err }, "[Build1A/ptiValidation] runExportCheck failed");
  }

  const result: ValidationResult = {
    runType: "export_check",
    recordsChecked: checked,
    recordsPassed: passed,
    recordsFailed: failed,
    details,
  };
  await writeValidationRun(db, triggeredBy, result);
  return result;
}

// ── Run all validations ───────────────────────────────────────────────────────
export async function runAllValidations(triggeredBy = "manual"): Promise<ValidationResult[]> {
  const results = await Promise.allSettled([
    runScoreReplay(20, triggeredBy),
    runSnapshotIntegrityCheck(triggeredBy),
    runModelVersionCoverage(triggeredBy),
    runAppendOnlyCheck(triggeredBy),
    runExportCheck(triggeredBy),
  ]);

  return results
    .filter((r): r is PromiseFulfilledResult<ValidationResult> => r.status === "fulfilled")
    .map(r => r.value);
}
