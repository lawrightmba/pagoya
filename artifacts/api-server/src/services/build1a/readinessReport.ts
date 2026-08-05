/**
 * Build 1A — Historical Readiness Report
 *
 * Queries answering the readiness questions from the Build 1A spec.
 * All data is aggregate-only; no raw telefono or payment amounts are
 * returned outside the admin-gated export routes.
 *
 * Known issues documented (not fixed) per spec:
 *
 * 1. Historical PTI score inputs were not persisted before Build 1A.
 *    Earlier scores are not replayable. Snapshot persistence begins with
 *    the first ENABLE_PTI_SNAPSHOT_PERSISTENCE=true scoring run.
 *
 * 2. LIKE 'load_%' excludes 'spei_in' transaction type, understating
 *    Balance/Cash-Flow signal coverage for SPEI-funded users.
 *
 * 3. users.id (serial int) vs users.telefono (text) dual-identity and
 *    known duplicate phone-format rows (e.g. 3222304213 / +523222304213)
 *    remain unresolved. New Build 1A tables key on telefono to match the
 *    dominant pattern. Deduplication not in scope for Build 1A.
 */

import { sql } from "drizzle-orm";
import { logger } from "../../lib/logger.js";

export interface ReadinessReport {
  generated_at: string;
  scoring_event_distribution: ScoringEventDistribution;
  snapshot_replayability: SnapshotReplayability;
  model_version_coverage: ModelVersionCoverage;
  derived_field_null_rates: DerivedFieldNullRates;
  loan_outcomes_aggregate: LoanOutcomesAggregate;
  identity_integrity: IdentityIntegrity;
  known_issues: KnownIssue[];
}

interface ScoringEventDistribution {
  total_scored_users: number;
  users_with_1_event: number;
  users_with_2_events: number;
  users_with_3_to_5_events: number;
  users_with_6_to_11_events: number;
  users_with_12_plus_events: number;
  max_events_single_user: number;
}

interface SnapshotReplayability {
  total_history_rows: number;
  replayable_rows: number;
  not_replayable_rows: number;
  replayability_pct: number;
  note: string;
}

interface ModelVersionCoverage {
  distribution: Array<{ model_version: string; count: number }>;
  rows_missing_version: number;
  registered_versions: Array<{ version_label: string; is_active: boolean }>;
}

interface DerivedFieldNullRates {
  note: string;
  fields_checked: Array<{ field: string; null_count: number; total: number; null_pct: number }>;
}

interface LoanOutcomesAggregate {
  total_outcomes: number;
  by_status: Array<{ status: string; count: number }>;
  earliest_originated: string | null;
  latest_originated: string | null;
  note: string;
}

interface IdentityIntegrity {
  total_users: number;
  duplicate_phone_format_risk_count: number;
  note: string;
}

interface KnownIssue {
  id: string;
  severity: "documented" | "risk";
  description: string;
  action: string;
}

export async function buildReadinessReport(): Promise<ReadinessReport> {
  const { db } = await import("@workspace/db");

  const [
    eventDist,
    snapReplay,
    modelCoverage,
    derivedNulls,
    loanAgg,
    identity,
  ] = await Promise.allSettled([
    queryScoringEventDistribution(db),
    querySnapshotReplayability(db),
    queryModelVersionCoverage(db),
    queryDerivedFieldNullRates(db),
    queryLoanOutcomesAggregate(db),
    queryIdentityIntegrity(db),
  ]);

  return {
    generated_at: new Date().toISOString(),
    // Classification summary sourced from pti_history_replayability view
    // (the view covers every pti_score_history row, not just snapshots).
    scoring_event_distribution:
      eventDist.status === "fulfilled"
        ? eventDist.value
        : { total_scored_users: 0, users_with_1_event: 0, users_with_2_events: 0,
            users_with_3_to_5_events: 0, users_with_6_to_11_events: 0,
            users_with_12_plus_events: 0, max_events_single_user: 0 },
    snapshot_replayability:
      snapReplay.status === "fulfilled"
        ? snapReplay.value
        : { total_history_rows: 0, replayable_rows: 0, not_replayable_rows: 0,
            replayability_pct: 0, note: "query failed" },
    model_version_coverage:
      modelCoverage.status === "fulfilled"
        ? modelCoverage.value
        : { distribution: [], rows_missing_version: 0, registered_versions: [] },
    derived_field_null_rates:
      derivedNulls.status === "fulfilled"
        ? derivedNulls.value
        : { note: "query failed", fields_checked: [] },
    loan_outcomes_aggregate:
      loanAgg.status === "fulfilled"
        ? loanAgg.value
        : { total_outcomes: 0, by_status: [], earliest_originated: null,
            latest_originated: null, note: "query failed" },
    identity_integrity:
      identity.status === "fulfilled"
        ? identity.value
        : { total_users: 0, duplicate_phone_format_risk_count: 0, note: "query failed" },
    known_issues: buildKnownIssues(),
  };
}

type DB = Awaited<ReturnType<typeof import("@workspace/db").default>>;

async function queryScoringEventDistribution(db: DB): Promise<ScoringEventDistribution> {
  const rows = await db.execute(sql`
    SELECT
      COUNT(*)::int                                                  AS total_scored_users,
      COUNT(*) FILTER (WHERE cnt = 1)::int                          AS users_1,
      COUNT(*) FILTER (WHERE cnt = 2)::int                          AS users_2,
      COUNT(*) FILTER (WHERE cnt BETWEEN 3 AND 5)::int              AS users_3_5,
      COUNT(*) FILTER (WHERE cnt BETWEEN 6 AND 11)::int             AS users_6_11,
      COUNT(*) FILTER (WHERE cnt >= 12)::int                        AS users_12_plus,
      COALESCE(MAX(cnt), 0)::int                                     AS max_events
    FROM (
      SELECT telefono, COUNT(*) AS cnt
      FROM pti_score_history
      GROUP BY telefono
    ) sub
  `);
  const r = rows.rows[0] as Record<string, number>;
  return {
    total_scored_users: r.total_scored_users,
    users_with_1_event: r.users_1,
    users_with_2_events: r.users_2,
    users_with_3_to_5_events: r.users_3_5,
    users_with_6_to_11_events: r.users_6_11,
    users_with_12_plus_events: r.users_12_plus,
    max_events_single_user: r.max_events,
  };
}

async function querySnapshotReplayability(db: DB): Promise<SnapshotReplayability> {
  const histCount = await db.execute(sql`SELECT COUNT(*)::int AS total FROM pti_score_history`);
  const snapCount = await db.execute(sql`
    SELECT
      COUNT(*) FILTER (WHERE persistence_status = 'persisted'
                       AND score_history_recorded_at IS NOT NULL)::int AS replayable,
      COUNT(*)::int AS total
    FROM pti_score_input_snapshots
  `);
  const totalHistory = Number((histCount.rows[0] as { total: number }).total);
  const snapRow = snapCount.rows[0] as { replayable: number; total: number };
  const replayable = Number(snapRow.replayable ?? 0);
  const notReplayable = totalHistory - replayable;
  return {
    total_history_rows: totalHistory,
    replayable_rows: replayable,
    not_replayable_rows: Math.max(0, notReplayable),
    replayability_pct: totalHistory > 0 ? Math.round((replayable / totalHistory) * 100) : 0,
    note:
      replayable === 0
        ? "Snapshot persistence was deployed in Build 1A. No replayable snapshots exist yet — " +
          "they will accumulate as new scoring runs occur with ENABLE_PTI_SNAPSHOT_PERSISTENCE=true."
        : `${replayable} of ${totalHistory} history rows have replayable input snapshots.`,
  };
}

async function queryModelVersionCoverage(db: DB): Promise<ModelVersionCoverage> {
  const dist = await db.execute(sql`
    SELECT COALESCE(breakdown->>'model_version', '(null)') AS model_version,
           COUNT(*)::int AS count
    FROM pti_score_history
    GROUP BY 1
    ORDER BY 2 DESC
  `);
  const reg = await db.execute(sql`
    SELECT version_label, is_active
    FROM model_version_registry
    WHERE component = 'pti_scoring'
    ORDER BY id
  `);
  const distribution = dist.rows as Array<{ model_version: string; count: number }>;
  const nullRow = distribution.find(r => r.model_version === "(null)");
  return {
    distribution,
    rows_missing_version: nullRow ? Number(nullRow.count) : 0,
    registered_versions: reg.rows as Array<{ version_label: string; is_active: boolean }>,
  };
}

// Zero-weight derived fields known to be in the breakdown JSONB (v4.3/v5 provisional)
const ZERO_WEIGHT_FIELDS = [
  "recurring_payment_share",
  "payment_gap_trend",
  "avg_days_early",
  "session_hour_variance",
  "channel_diversity_index",
  "bill_category_entropy",
  "load_timing_regularity",
  "bounce_rate_proxy",
  "multi_service_month_count",
  "recovery_time_avg",
];

async function queryDerivedFieldNullRates(db: DB): Promise<DerivedFieldNullRates> {
  const totalRows = await db.execute(sql`SELECT COUNT(*)::int AS total FROM pti_score_history`);
  const total = Number((totalRows.rows[0] as { total: number }).total);

  if (total === 0) {
    return {
      note: "No pti_score_history rows exist yet.",
      fields_checked: ZERO_WEIGHT_FIELDS.map(f => ({ field: f, null_count: 0, total: 0, null_pct: 0 })),
    };
  }

  const fields_checked: Array<{ field: string; null_count: number; total: number; null_pct: number }> = [];

  for (const field of ZERO_WEIGHT_FIELDS) {
    try {
      const nullCount = await db.execute(sql`
        SELECT COUNT(*)::int AS null_count
        FROM pti_score_history
        WHERE breakdown->'payment_reliability'->'components'->>${field} IS NULL
          AND breakdown->'engagement_depth'->'components'->>${field} IS NULL
          AND breakdown->'cashflow_stability'->'components'->>${field} IS NULL
          AND breakdown->'behavioral_consistency'->'components'->>${field} IS NULL
          AND breakdown->>${field} IS NULL
      `);
      const nc = Number((nullCount.rows[0] as { null_count: number }).null_count);
      fields_checked.push({
        field,
        null_count: nc,
        total,
        null_pct: Math.round((nc / total) * 100),
      });
    } catch {
      fields_checked.push({ field, null_count: -1, total, null_pct: -1 });
    }
  }

  return {
    note: "Null rates for zero-weight provisional derived fields. High null rates are expected — these fields are provisional_zero_weight pending calibration data.",
    fields_checked,
  };
}

async function queryLoanOutcomesAggregate(db: DB): Promise<LoanOutcomesAggregate> {
  try {
    // Aggregate only — no FK join to users, no telefono_hashed exposure
    const totals = await db.execute(sql`
      SELECT
        COUNT(*)::int                          AS total,
        MIN(loan_originated_at)::text          AS earliest_originated,
        MAX(loan_originated_at)::text          AS latest_originated
      FROM loan_outcomes
    `);
    const byStatus = await db.execute(sql`
      SELECT loan_outcome_status AS status, COUNT(*)::int AS count
      FROM loan_outcomes
      GROUP BY loan_outcome_status
      ORDER BY count DESC
    `);
    const t = totals.rows[0] as { total: number; earliest_originated: string | null; latest_originated: string | null };
    return {
      total_outcomes: Number(t.total),
      by_status: byStatus.rows as Array<{ status: string; count: number }>,
      earliest_originated: t.earliest_originated,
      latest_originated: t.latest_originated,
      note: "Aggregate counts only. telefono_hashed is not exposed or joined.",
    };
  } catch (err) {
    logger.warn({ err }, "[Build1A/readinessReport] loan_outcomes query failed");
    return {
      total_outcomes: 0,
      by_status: [],
      earliest_originated: null,
      latest_originated: null,
      note: "loan_outcomes table may not yet exist or is inaccessible.",
    };
  }
}

async function queryIdentityIntegrity(db: DB): Promise<IdentityIntegrity> {
  const totalRows = await db.execute(sql`SELECT COUNT(*)::int AS total FROM users`);
  // Detect potential duplicate phone formats: same 10 trailing digits, different prefixes
  const dupeRisk = await db.execute(sql`
    SELECT COUNT(*)::int AS risk_count
    FROM (
      SELECT RIGHT(REGEXP_REPLACE(telefono, '\D', '', 'g'), 10) AS normalized,
             COUNT(*) AS cnt
      FROM users
      GROUP BY 1
      HAVING COUNT(*) > 1
    ) sub
  `);
  const total = Number((totalRows.rows[0] as { total: number }).total);
  const riskCount = Number((dupeRisk.rows[0] as { risk_count: number }).risk_count);
  return {
    total_users: total,
    duplicate_phone_format_risk_count: riskCount,
    note:
      riskCount > 0
        ? `${riskCount} normalized phone number(s) appear in more than one row (e.g. '3222304213' vs '+523222304213'). ` +
          "Deduplication is not in scope for Build 1A. New tables key on telefono (text) matching the dominant pattern."
        : "No duplicate phone-format rows detected.",
  };
}

function buildKnownIssues(): KnownIssue[] {
  return [
    {
      id: "ISSUE-1",
      severity: "documented",
      description:
        "Historical PTI score inputs were not persisted before Build 1A. " +
        "pti_score_history rows created before this build have no stored input snapshot " +
        "and cannot be replayed. Re-fetching current signals would not reproduce " +
        "the original historical input. " +
        "Two inconsistency directions exist because history and snapshot are independent " +
        "fire-and-forget dispatches sharing capturedAt as a soft link (pti_score_history " +
        "schema is frozen — no FK can be added): " +
        "(a) History row exists but no snapshot row: snapshot dispatch failed after " +
        "the history write succeeded, or persistence was disabled. Classified " +
        "'historical_output_only' by pti_history_replayability. " +
        "(b) Snapshot row exists but no matching history row: history insert was caught " +
        "and swallowed after the snapshot was already in flight. The snapshot has a " +
        "score_history_recorded_at timestamp but no pti_score_history row to match it. " +
        "Classified 'snapshot_unlinked' by pti_history_replayability.",
      action:
        "Enable ENABLE_PTI_SNAPSHOT_PERSISTENCE=true to begin capturing snapshots " +
        "for future scoring runs. Historical gap is permanent. Use GET /admin/build1a/history-replayability " +
        "to inspect per-row classifications including both inconsistency directions.",
    },
    {
      id: "ISSUE-2",
      severity: "risk",
      description:
        "Balance/Cash-Flow signal (dimension BC/CFR) uses LIKE 'load_%' to detect wallet " +
        "load events in wallet_transactions. The 'spei_in' transaction type does not match " +
        "this pattern and is excluded, understating cash-flow signal completeness for " +
        "SPEI-funded users.",
      action:
        "Document for next PTI signal review cycle. Do not change signal logic in Build 1A. " +
        "A future sprint should add explicit SPEI coverage to the load-event detection.",
    },
    {
      id: "ISSUE-3",
      severity: "risk",
      description:
        "Dual user identity: users.id (serial int) is the DB PK; users.telefono (text) is " +
        "the functional identifier used by most tables. Belvo tables FK on users.id; all " +
        "others use telefono. Known duplicate phone-format rows exist " +
        "(e.g. 3222304213 / +523222304213). Build 1A tables key on telefono to match the " +
        "dominant pattern. The FK gap between id-keyed and telefono-keyed tables creates " +
        "orphaned records when the same user appears under both formats.",
      action:
        "Resolve in a dedicated phone normalization sprint (tracked in memory). " +
        "Do not deduplicate in Build 1A.",
    },
  ];
}

// ── Export helpers ─────────────────────────────────────────────────────────────

/** Serialize report to CSV (readiness summary rows only, no raw user data). */
export function reportToCsv(report: ReadinessReport): string {
  const rows: string[][] = [
    ["field", "value", "generated_at"],
    ["total_scored_users", String(report.scoring_event_distribution.total_scored_users), report.generated_at],
    ["users_with_1_event", String(report.scoring_event_distribution.users_with_1_event), report.generated_at],
    ["users_with_2_events", String(report.scoring_event_distribution.users_with_2_events), report.generated_at],
    ["users_with_3_to_5_events", String(report.scoring_event_distribution.users_with_3_to_5_events), report.generated_at],
    ["users_with_6_to_11_events", String(report.scoring_event_distribution.users_with_6_to_11_events), report.generated_at],
    ["users_with_12_plus_events", String(report.scoring_event_distribution.users_with_12_plus_events), report.generated_at],
    ["max_events_single_user", String(report.scoring_event_distribution.max_events_single_user), report.generated_at],
    ["total_history_rows", String(report.snapshot_replayability.total_history_rows), report.generated_at],
    ["replayable_rows", String(report.snapshot_replayability.replayable_rows), report.generated_at],
    ["replayability_pct", String(report.snapshot_replayability.replayability_pct), report.generated_at],
    ["rows_missing_version", String(report.model_version_coverage.rows_missing_version), report.generated_at],
    ["loan_outcomes_total", String(report.loan_outcomes_aggregate.total_outcomes), report.generated_at],
    ["identity_duplicate_phone_risk", String(report.identity_integrity.duplicate_phone_format_risk_count), report.generated_at],
  ];

  // Add model version distribution rows
  for (const mv of report.model_version_coverage.distribution) {
    rows.push([`model_version:${mv.model_version}`, String(mv.count), report.generated_at]);
  }
  // Add loan outcome by-status rows
  for (const lo of report.loan_outcomes_aggregate.by_status) {
    rows.push([`loan_outcome:${lo.status}`, String(lo.count), report.generated_at]);
  }
  // Add known issues
  for (const issue of report.known_issues) {
    rows.push([`known_issue:${issue.id}`, issue.description, report.generated_at]);
  }

  return rows
    .map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
}
