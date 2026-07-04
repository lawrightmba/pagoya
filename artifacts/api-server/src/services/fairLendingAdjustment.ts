/**
 * Fair-Lending Adjustment Layer (Sprint 2b)
 *
 * An ISOLATED, feature-flagged layer that sits OUTSIDE the core 100-point PTI
 * behavioral score (`computePTI` in pti.ts). It re-introduces colonia and
 * declared_income_bucket as an optional, capped [-5,+5] post-hoc adjustment —
 * never as raw scoring inputs inside the base score.
 *
 * Hard rules enforced by this module:
 *   1. OFF by default (ENABLE_GEO_INCOME_ADJUSTMENT env flag, default false).
 *   2. Never imports or calls computePTI() internals — only its public API,
 *      and only from computeFinalPTI() below (never from
 *      computeFairLendingAdjustment() itself, which is 100% independent).
 *   3. Adjustment is capped to [-5, +5].
 *   4. Fully explainable — every call returns a component breakdown, even
 *      when the result is a no-op (adjustment=0).
 *   5. CANNOT self-activate in production without a recorded row in
 *      `fair_lending_signoff` whose `approved_mapping_version` matches the
 *      currently-loaded mapping hash. This is enforced here in code, not
 *      just by policy — see `resolveAdjustmentFlagState()`.
 *
 * See FAIR_LENDING_MAPPING (config/fairLendingMapping.ts) for the
 * placeholder point values (all zero pending bias-testing sign-off).
 */

import { sql } from "drizzle-orm";
import { logger } from "../lib/logger.js";
import { computePTI, type PTIDataSnapshot, type PTIBreakdown, type PTIConfidence } from "./pti.js";
import {
  FAIR_LENDING_MAPPING,
  FAIR_LENDING_MAPPING_VERSION,
  FAIR_LENDING_THRESHOLDS,
  type FairLendingThresholds,
} from "../config/fairLendingMapping.js";

// ─── Types ──────────────────────────────────────────────────────────────────

export type AdjustmentDisabledReason =
  | "flag_off"
  | "no_signoff_on_file"
  | "mapping_version_mismatch"
  | "signoff_expired"
  | "fields_unavailable";

/**
 * Pre-resolved flag/gate state, computed by `resolveAdjustmentFlagState()`.
 * Passed into the pure `computeFairLendingAdjustment()` so that function
 * stays synchronous and trivially unit-testable without a DB.
 */
export interface AdjustmentFlagState {
  /** Final enabled/disabled verdict after flag + gate + environment checks. */
  enabled: boolean;
  /** Why `enabled` is false. Null when enabled=true. */
  reasonIfDisabled: AdjustmentDisabledReason | null;
  /** Was ENABLE_GEO_INCOME_ADJUSTMENT=true requested at all? */
  flagRequested: boolean;
  /** Did a matching, non-expired fair_lending_signoff row exist (or staging bypass apply)? */
  gatePassed: boolean;
  /** Hash of the mapping table in effect at resolution time. */
  mappingVersion: string;
  /**
   * Reduced cap (absolute value) to use instead of the global default ±5,
   * when the active signoff's status is 'conditional'. Null when the
   * status is 'pass' (or the gate isn't passed) — in which case the
   * global default cap applies.
   */
  adjustmentCapOverride: number | null;
}

/** Minimal shape of fair-lending-relevant fields a snapshot may carry. */
export interface FairLendingSnapshot {
  colonia?: string | null;
  /** Pre-classified marginación tier key, e.g. "tier_3_marginacion_medio". */
  coloniaTier?: string | null;
  /** Bucket key, e.g. "bucket_2". */
  declaredIncomeBucket?: string | null;
}

export interface FairLendingAdjustmentComponent {
  key: "colonia_tier" | "income_bucket";
  input_value: string;
  points: number;
}

export interface FairLendingAdjustmentResult {
  adjustment: number;
  components: FairLendingAdjustmentComponent[];
  applied: boolean;
  reason: AdjustmentDisabledReason | null;
  mapping_version: string;
}

export interface FinalPTIResult {
  base_score: number;
  adjustment: number;
  final_score: number;
  applied: boolean;
  reason: AdjustmentDisabledReason | null;
  components: FairLendingAdjustmentComponent[];
  mapping_version: string;
  breakdown: PTIBreakdown;
  confidence: PTIConfidence;
}

export interface FinalPTILogContext {
  userId?: string | null;
  snapshotId?: string | null;
  colonia?: string | null;
  coloniaTier?: string | null;
  declaredIncomeBucket?: string | null;
}

/**
 * Output of a disparate-impact / bias test run. This is the artifact that
 * gets attached to (and enforced by) `recordFairLendingSignoff()` — it is
 * NOT just a reference ID, the full result is stored alongside the signoff
 * row so the evidence for why the gate opened is permanently retained.
 */
export interface DisparateImpactReportResult {
  /** Selection-rate ratio of the most-adversely-affected group vs. the most-favored group. Standard threshold: >= 0.8 (the "4/5ths rule"). */
  fourFifthsRatio: number;
  /** Whether a statistically significant residual disparate effect remains after controlling for legitimate behavioral factors. true = FAILS. */
  residualEffectSignificant: boolean;
  /**
   * Severity metric for a detected residual effect (e.g. effect-size or a
   * derived 0-1 scale from p-value) — compared against
   * FAIR_LENDING_THRESHOLDS.residual_effect_severity_conditional_max to
   * decide whether a present residual effect is "small enough" to still
   * allow a 'conditional' outcome, or severe enough to force 'fail'.
   * Only meaningful when residualEffectSignificant=true; ignored otherwise.
   * Defaults to 0 (treated as "no meaningful severity") if omitted.
   */
  residualEffectSeverity?: number;
  residualEffectPValue?: number;
  sampleSize?: number;
  notes?: string;
}

export type ReportOutcome = "pass" | "conditional" | "fail";

/**
 * Classifies a disparate-impact report into pass/conditional/fail per the
 * Sprint 2b Addendum 2 escalation table. Ratio and residual-effect severity
 * are kept as SEPARATE inputs (never averaged/blended into one score) so the
 * compounding-escalation rule stays legible and auditable:
 *
 *   ratio < conditional_min                         -> fail
 *   conditional_min <= ratio < pass_min:
 *     no residual effect                            -> conditional
 *     residual effect, severity < conditional_max    -> conditional
 *     residual effect, severity >= conditional_max   -> fail   (compounding)
 *   ratio >= pass_min:
 *     no residual effect                            -> pass
 *     residual effect, severity < conditional_max    -> conditional
 *     residual effect, severity >= conditional_max   -> fail
 */
export function classifyReportOutcome(
  report: DisparateImpactReportResult,
  thresholds: FairLendingThresholds = FAIR_LENDING_THRESHOLDS,
): ReportOutcome {
  const { fourFifthsRatio, residualEffectSignificant } = report;
  const severity = report.residualEffectSeverity ?? 0;
  const residualIsSevere = residualEffectSignificant && severity >= thresholds.residual_effect_severity_conditional_max;
  const residualIsMild = residualEffectSignificant && !residualIsSevere;

  if (fourFifthsRatio < thresholds.fourFifths_conditional_min) {
    return "fail";
  }

  if (fourFifthsRatio < thresholds.fourFifths_pass_min) {
    // Borderline ratio zone.
    if (!residualEffectSignificant || residualIsMild) return "conditional";
    return "fail"; // borderline ratio + severe residual effect compounds to fail
  }

  // Ratio fully passes.
  if (!residualEffectSignificant) return "pass";
  if (residualIsMild) return "conditional"; // a good ratio doesn't excuse a real residual signal
  return "fail";
}

export interface RecordSignoffParams {
  reportResult: DisparateImpactReportResult;
  /** Name/role of whoever is attesting right now. Metadata only — never part of the gate-check logic. */
  attestedBy: string;
  /**
   * The mapping-version hash that was ACTIVE when the disparate-impact test
   * was run — not necessarily the currently-loaded config. Callers must
   * capture this at test-run time (e.g. via computeMappingVersionHash())
   * to guard against "test ran against v1, config quietly edited to v2
   * before the signoff got recorded."
   */
  mappingVersionAtTestTime: string;
  reportGeneratedAt?: Date;
  /**
   * Required, non-empty free-text acceptance statement when the report
   * classifies as 'conditional'. Forces the attester to articulate why a
   * conditional result is being accepted — cannot be silently defaulted.
   * Ignored (not required) when the report classifies as 'pass'.
   */
  conditionalAcknowledgment?: string;
  /** Override the config default — used by tests to exercise specific threshold edges. */
  thresholds?: FairLendingThresholds;
}

export interface SignoffRecord {
  id: number;
  approvedMappingVersion: string;
  status: ReportOutcome;
  adjustmentCapOverride: number | null;
  retestDueAt: Date;
}

/**
 * Returns true only if the report clears BOTH bias thresholds. This is the
 * single source of truth for "does this report justify activating the
 * adjustment layer" — used both when creating a signoff row and when
 * re-verifying an existing one at boot time.
 */
export function passesBiasThresholds(report: DisparateImpactReportResult): boolean {
  return report.fourFifthsRatio >= 0.8 && !report.residualEffectSignificant;
}

// ─── Flag / gate resolution (async, hits DB) ───────────────────────────────

/**
 * Resolves whether the adjustment layer may run right now.
 *
 * Two conditions must BOTH hold in production:
 *   1. ENABLE_GEO_INCOME_ADJUSTMENT === "true"
 *   2. A `fair_lending_signoff` row exists with approved_mapping_version
 *      matching the currently-loaded mapping hash.
 *
 * In non-production, condition 2 can be bypassed with
 * ALLOW_UNSIGNED_ADJUSTMENT_IN_STAGING="true" — but that bypass is hard-
 * locked off whenever NODE_ENV === "production", regardless of the env
 * var's value, as defense in depth against a misconfigured deploy.
 */
export async function resolveAdjustmentFlagState(): Promise<AdjustmentFlagState> {
  const mappingVersion = FAIR_LENDING_MAPPING_VERSION;
  const flagRequested = process.env.ENABLE_GEO_INCOME_ADJUSTMENT === "true";

  if (!flagRequested) {
    return { enabled: false, reasonIfDisabled: "flag_off", flagRequested: false, gatePassed: false, mappingVersion, adjustmentCapOverride: null };
  }

  const isProduction = process.env.NODE_ENV === "production";
  const stagingBypassRequested = process.env.ALLOW_UNSIGNED_ADJUSTMENT_IN_STAGING === "true";

  // Defense in depth: this bypass must NEVER take effect in production, no
  // matter how the env var is set. If someone misconfigures prod with this
  // flag on, we log loudly and ignore it rather than silently activating an
  // unsigned adjustment layer against real users.
  if (stagingBypassRequested && isProduction) {
    logger.error(
      "[fairLendingAdjustment] ALLOW_UNSIGNED_ADJUSTMENT_IN_STAGING is set in a production environment — ignoring it. This must be fixed in deploy config.",
    );
  }

  if (stagingBypassRequested && !isProduction) {
    return { enabled: true, reasonIfDisabled: null, flagRequested: true, gatePassed: true, mappingVersion, adjustmentCapOverride: null };
  }

  const status = await checkSignoffStatus(mappingVersion);
  if (!status.matches) {
    // Distinct reason codes so monitoring/logs can tell "never signed off at
    // all" apart from "was signed off, but against a different mapping
    // version than the one currently loaded" (e.g. config edited post-signoff).
    const reason: AdjustmentDisabledReason = status.hasAnyRow ? "mapping_version_mismatch" : "no_signoff_on_file";
    logger.warn({ mappingVersion, reason }, "[fairLendingAdjustment] adjustment layer requested but gate check failed");
    return { enabled: false, reasonIfDisabled: reason, flagRequested: true, gatePassed: false, mappingVersion, adjustmentCapOverride: null };
  }

  if (status.isExpired) {
    // A row matched the current mapping version, but its retest_due_at has
    // passed — fails closed exactly like no_signoff_on_file, distinguishably.
    // Applies uniformly to 'pass' and 'conditional' signoffs; only the
    // interval that got them here differs.
    logger.warn(
      { mappingVersion, reason: "signoff_expired", retestDueAt: status.retestDueAt },
      "[fairLendingAdjustment] adjustment layer requested but the matching signoff has expired (past retest_due_at)",
    );
    return { enabled: false, reasonIfDisabled: "signoff_expired", flagRequested: true, gatePassed: false, mappingVersion, adjustmentCapOverride: null };
  }

  return {
    enabled: true,
    reasonIfDisabled: null,
    flagRequested: true,
    gatePassed: true,
    mappingVersion,
    adjustmentCapOverride: status.adjustmentCapOverride,
  };
}

interface SignoffStatusResult {
  hasAnyRow: boolean;
  matches: boolean;
  isExpired: boolean;
  retestDueAt: Date | null;
  adjustmentCapOverride: number | null;
}

/**
 * Checks the current gate state against the DB:
 *   - hasAnyRow: does at least one fair_lending_signoff row exist at all?
 *   - matches: does a row exist whose approved_mapping_version matches the
 *     currently-loaded mapping hash?
 *   - isExpired: if matches=true, has that row's retest_due_at passed?
 *   - adjustmentCapOverride: that row's reduced cap, if status='conditional'.
 *
 * Separating hasAnyRow/matches lets callers distinguish "never signed off"
 * from "signed off against a stale mapping version" (config drift). Separating
 * isExpired again lets callers distinguish either of those from "was signed
 * off correctly, but the review window has lapsed."
 */
async function checkSignoffStatus(mappingVersion: string): Promise<SignoffStatusResult> {
  const { db } = await import("@workspace/db");
  const matchRow = await db.execute(sql`
    SELECT retest_due_at, adjustment_cap_override
    FROM fair_lending_signoff
    WHERE approved_mapping_version = ${mappingVersion}
    ORDER BY created_at DESC
    LIMIT 1
  `);
  if (matchRow.rows.length > 0) {
    const row = matchRow.rows[0] as Record<string, unknown>;
    const retestDueAt = row.retest_due_at ? new Date(row.retest_due_at as string) : null;
    const isExpired = retestDueAt !== null && retestDueAt.getTime() < Date.now();
    const adjustmentCapOverride = row.adjustment_cap_override != null ? Number(row.adjustment_cap_override) : null;
    return { hasAnyRow: true, matches: true, isExpired, retestDueAt, adjustmentCapOverride };
  }
  const anyRow = await db.execute(sql`SELECT id FROM fair_lending_signoff LIMIT 1`);
  return { hasAnyRow: anyRow.rows.length > 0, matches: false, isExpired: false, retestDueAt: null, adjustmentCapOverride: null };
}

/**
 * Records a fair-lending sign-off, DRIVEN BY the disparate-impact test
 * report itself — not entered manually by whoever happens to hold a given
 * role. This decouples the production gate from any specific attester.
 *
 * Refuses to write a row (throws) if the report fails either bias
 * threshold — signoff creation enforces the pass/fail bar itself, it is
 * never a rubber stamp an attester can force through with a failing report.
 *
 * `mappingVersionAtTestTime` must be the hash that was active WHEN THE TEST
 * WAS RUN, not necessarily the currently-loaded config — callers capture
 * this themselves (e.g. via computeMappingVersionHash()) at test-run time.
 *
 * Sprint 2b Addendum 3: `attestedBy` must match the current authorized
 * threshold owner (`fairLendingOwnership.ts`) — mismatch throws before any
 * classification or DB write happens. This prevents someone other than the
 * designated owner from ever getting a signoff on file, even a passing one.
 */
export async function recordFairLendingSignoff(params: RecordSignoffParams): Promise<SignoffRecord> {
  const { reportResult, attestedBy, mappingVersionAtTestTime, reportGeneratedAt, conditionalAcknowledgment } = params;
  const thresholds = params.thresholds ?? FAIR_LENDING_THRESHOLDS;

  const { verifyThresholdOwnerAuthorization } = await import("./fairLendingOwnership.js");
  await verifyThresholdOwnerAuthorization(attestedBy);

  const outcome = classifyReportOutcome(reportResult, thresholds);

  if (outcome === "fail") {
    throw new Error(
      `[fairLendingAdjustment] Refusing to record signoff: disparate-impact report fails bias thresholds ` +
        `(fourFifthsRatio=${reportResult.fourFifthsRatio}, residualEffectSignificant=${reportResult.residualEffectSignificant}, ` +
        `residualEffectSeverity=${reportResult.residualEffectSeverity ?? 0}). A signoff row cannot be created from a failing report.`,
    );
  }

  if (outcome === "conditional" && (!conditionalAcknowledgment || conditionalAcknowledgment.trim().length === 0)) {
    throw new Error(
      `[fairLendingAdjustment] Refusing to record signoff: report classifies as 'conditional' ` +
        `(fourFifthsRatio=${reportResult.fourFifthsRatio}) but conditionalAcknowledgment was missing or empty. ` +
        `A conditional signoff requires the attester to explicitly articulate acceptance — it cannot be silently defaulted.`,
    );
  }

  const now = reportGeneratedAt ?? new Date();
  const retestIntervalDays = outcome === "conditional" ? thresholds.conditional_retest_interval_days : thresholds.standard_retest_interval_days;
  // retest_due_at_ceiling is the fixed calendar cap computed once at record
  // time. The effective retest_due_at starts equal to it, but can only ever
  // be pulled EARLIER (never later) by a trigger event — see forceRetest(),
  // expireOutdatedMappingVersionSignoffs(), checkScoredPopulationVolumeGrowth().
  const retestDueAtCeiling = new Date(now.getTime() + retestIntervalDays * 24 * 60 * 60 * 1000);
  const adjustmentCapOverride = outcome === "conditional" ? thresholds.conditional_adjustment_cap : null;

  const { db } = await import("@workspace/db");

  const populationRow = await db.execute(sql`
    SELECT COUNT(*)::int AS n FROM users WHERE pti_score IS NOT NULL
  `);
  const scoredPopulationCount = Number((populationRow.rows[0] as Record<string, unknown> | undefined)?.n ?? 0);

  const row = await db.execute(sql`
    INSERT INTO fair_lending_signoff (
      signed_off_by, attested_by, approved_mapping_version,
      disparate_impact_report, report_generated_at, bias_test_report_ref,
      status, adjustment_cap_override, retest_due_at, retest_due_at_ceiling,
      scored_population_count_at_signoff, conditional_acknowledgment
    ) VALUES (
      ${attestedBy}, ${attestedBy}, ${mappingVersionAtTestTime},
      ${JSON.stringify(reportResult)}::jsonb, ${now}, ${reportResult.notes ?? null},
      ${outcome}, ${adjustmentCapOverride}, ${retestDueAtCeiling}, ${retestDueAtCeiling},
      ${scoredPopulationCount}, ${outcome === "conditional" ? conditionalAcknowledgment : null}
    )
    RETURNING id, approved_mapping_version, status, adjustment_cap_override, retest_due_at
  `);
  const inserted = row.rows[0] as Record<string, unknown>;
  logger.info(
    { mappingVersion: mappingVersionAtTestTime, attestedBy, status: outcome, adjustmentCapOverride, retestDueAt: retestDueAtCeiling, scoredPopulationCount },
    "[fairLendingAdjustment] recorded fair-lending signoff from disparate-impact report",
  );
  return {
    id: Number(inserted.id),
    approvedMappingVersion: String(inserted.approved_mapping_version),
    status: outcome,
    adjustmentCapOverride: inserted.adjustment_cap_override != null ? Number(inserted.adjustment_cap_override) : null,
    retestDueAt: new Date(inserted.retest_due_at as string),
  };
}

/**
 * Sprint 2b Addendum 3: the ONLY sanctioned runtime path for mutating
 * `FAIR_LENDING_THRESHOLDS`. Direct property assignment elsewhere in the
 * codebase should never happen — this function exists precisely so that
 * every mutation is (a) authorization-checked against the current threshold
 * owner and (b) logged. Mutates the exported config object in place (never
 * reassigns the binding) so existing imports keep seeing live values.
 */
export async function updateFairLendingThresholds(
  updates: Partial<FairLendingThresholds>,
  actingIdentity: string | null | undefined,
): Promise<FairLendingThresholds> {
  const { verifyThresholdOwnerAuthorization } = await import("./fairLendingOwnership.js");
  await verifyThresholdOwnerAuthorization(actingIdentity);

  const before = { ...FAIR_LENDING_THRESHOLDS };
  Object.assign(FAIR_LENDING_THRESHOLDS, updates);

  logger.info(
    { actingIdentity, before, after: { ...FAIR_LENDING_THRESHOLDS } },
    "[fairLendingAdjustment] FAIR_LENDING_THRESHOLDS updated by authorized owner",
  );

  return { ...FAIR_LENDING_THRESHOLDS };
}

// ─── Event-driven retest_due_at (Sprint 2b Addendum 3) ─────────────────────
//
// retest_due_at is no longer a fixed value chosen once at signoff time. It is
// recomputed as the EARLIER of:
//   (a) retest_due_at_ceiling — the fixed calendar cap set at record time.
//   (b) the next occurrence of a defined trigger event:
//       - mapping_version changes            -> expireOutdatedMappingVersionSignoffs()
//       - scored-population volume growth     -> checkScoredPopulationVolumeGrowth()
//       - a manual forceRetest(reason) call   -> forceRetest()
// Whichever fires first pulls retest_due_at to NOW, which flips
// signoff_expired=true on the next gate check (request-time or boot).

export type RetestTriggerType = "manual" | "mapping_version_change" | "volume_growth";

/**
 * Manually forces an immediate retest by pulling the active signoff's
 * retest_due_at to NOW. Always available — no threshold or owner check
 * required, since this is a "someone wants a fresh look" action, not a
 * threshold mutation. Requires a non-empty reason for the audit trail.
 * No-ops (returns false) if no signoff row exists for the current mapping
 * version at all.
 */
export async function forceRetest(reason: string, actingIdentity?: string | null): Promise<boolean> {
  const trimmedReason = reason?.trim();
  if (!trimmedReason) {
    throw new Error("[fairLendingAdjustment] forceRetest requires a non-empty reason string.");
  }

  const { db } = await import("@workspace/db");
  const mappingVersion = FAIR_LENDING_MAPPING_VERSION;

  const row = await db.execute(sql`
    SELECT id FROM fair_lending_signoff
    WHERE approved_mapping_version = ${mappingVersion}
    ORDER BY created_at DESC
    LIMIT 1
  `);
  if (row.rows.length === 0) {
    logger.warn({ mappingVersion }, "[fairLendingAdjustment] forceRetest: no signoff row on file for current mapping version — nothing to expire");
    return false;
  }
  const signoffId = Number((row.rows[0] as Record<string, unknown>).id);

  await db.execute(sql`
    UPDATE fair_lending_signoff SET retest_due_at = NOW() WHERE id = ${signoffId}
  `);
  await db.execute(sql`
    INSERT INTO fair_lending_retest_triggers (signoff_id, trigger_type, reason, triggered_by)
    VALUES (${signoffId}, 'manual', ${trimmedReason}, ${actingIdentity ?? null})
  `);

  logger.info({ signoffId, reason: trimmedReason, actingIdentity: actingIdentity ?? null }, "[fairLendingAdjustment] forceRetest: retest_due_at pulled to NOW");
  return true;
}

/**
 * Any signoff row whose approved_mapping_version no longer matches the
 * currently-loaded mapping hash is already gate-blocked via
 * mapping_version_mismatch — but its retest_due_at would otherwise sit
 * dangling at its old (possibly far-future) ceiling. This forces it to NOW
 * as well, so the row's own state is consistent with reality rather than
 * relying solely on the WHERE-clause mismatch. Intentionally NOT called on
 * the per-request gate-check path (resolveAdjustmentFlagState) to avoid
 * adding a write to every scoring request — called at boot and from the
 * daily cron instead.
 */
export async function expireOutdatedMappingVersionSignoffs(currentMappingVersion: string = FAIR_LENDING_MAPPING_VERSION): Promise<number> {
  const { db } = await import("@workspace/db");
  const rows = await db.execute(sql`
    UPDATE fair_lending_signoff
    SET retest_due_at = LEAST(retest_due_at, NOW())
    WHERE approved_mapping_version != ${currentMappingVersion}
      AND retest_due_at > NOW()
    RETURNING id
  `);
  if (rows.rows.length > 0) {
    for (const r of rows.rows) {
      const signoffId = Number((r as Record<string, unknown>).id);
      await db.execute(sql`
        INSERT INTO fair_lending_retest_triggers (signoff_id, trigger_type, reason)
        VALUES (${signoffId}, 'mapping_version_change', ${`mapping version changed to ${currentMappingVersion}`})
      `);
    }
    logger.info({ count: rows.rows.length, currentMappingVersion }, "[fairLendingAdjustment] expired retest_due_at for outdated-mapping-version signoffs");
  }
  return rows.rows.length;
}

/**
 * Daily-cron-only check (never per-request, per the same latency reasoning
 * as the request-time gate itself): compares the current scored population
 * size against the baseline captured on the active signoff row at record
 * time. If growth exceeds `FAIR_LENDING_THRESHOLDS.volume_growth_trigger_pct`,
 * forces retest_due_at to NOW. No-ops entirely while that threshold is null
 * (placeholder pending bias-testing-owner input) — the mechanism is fully
 * built and wired, just deliberately inert until a real cutoff is set.
 */
export async function checkScoredPopulationVolumeGrowth(): Promise<{ checked: boolean; triggered: boolean }> {
  const triggerPct = FAIR_LENDING_THRESHOLDS.volume_growth_trigger_pct;
  if (triggerPct == null) {
    logger.info("[fairLendingAdjustment] checkScoredPopulationVolumeGrowth: volume_growth_trigger_pct not yet configured — skipping");
    return { checked: false, triggered: false };
  }

  const { db } = await import("@workspace/db");
  const mappingVersion = FAIR_LENDING_MAPPING_VERSION;

  const row = await db.execute(sql`
    SELECT id, scored_population_count_at_signoff
    FROM fair_lending_signoff
    WHERE approved_mapping_version = ${mappingVersion}
      AND retest_due_at > NOW()
    ORDER BY created_at DESC
    LIMIT 1
  `);
  if (row.rows.length === 0) {
    return { checked: false, triggered: false };
  }
  const signoffRow = row.rows[0] as Record<string, unknown>;
  const signoffId = Number(signoffRow.id);
  const baseline = Number(signoffRow.scored_population_count_at_signoff ?? 0);

  const populationRow = await db.execute(sql`SELECT COUNT(*)::int AS n FROM users WHERE pti_score IS NOT NULL`);
  const current = Number((populationRow.rows[0] as Record<string, unknown> | undefined)?.n ?? 0);

  const growth = baseline > 0 ? (current - baseline) / baseline : 0;
  const triggered = growth >= triggerPct;

  logger.info({ signoffId, baseline, current, growth, triggerPct, triggered }, "[fairLendingAdjustment] checkScoredPopulationVolumeGrowth: daily check");

  if (triggered) {
    await db.execute(sql`UPDATE fair_lending_signoff SET retest_due_at = NOW() WHERE id = ${signoffId}`);
    await db.execute(sql`
      INSERT INTO fair_lending_retest_triggers (signoff_id, trigger_type, reason)
      VALUES (${signoffId}, 'volume_growth', ${`scored population grew ${(growth * 100).toFixed(1)}% (baseline=${baseline}, current=${current}) >= trigger ${(triggerPct * 100).toFixed(1)}%`})
    `);
  }

  return { checked: true, triggered };
}

/**
 * Startup safety assertion. Call once at process boot (from app.ts/index.ts)
 * and AWAIT it — a misconfigured production deploy must fail startup
 * loudly instead of silently degrading to a disabled/ignored adjustment
 * layer at request time. This is a systemic misconfiguration check, not a
 * per-snapshot missing-data case, so it blocks boot rather than degrading.
 */
export async function assertProductionSafety(): Promise<void> {
  const isProduction = process.env.NODE_ENV === "production";
  const stagingBypassRequested = process.env.ALLOW_UNSIGNED_ADJUSTMENT_IN_STAGING === "true";
  if (isProduction && stagingBypassRequested) {
    throw new Error(
      "[fairLendingAdjustment] BOOT FAILURE: ALLOW_UNSIGNED_ADJUSTMENT_IN_STAGING must never be true when " +
        "NODE_ENV=production. Fix deploy config.",
    );
  }

  if (!isProduction) return; // dev/staging: boots clean regardless of signoff state.

  const flagRequested = process.env.ENABLE_GEO_INCOME_ADJUSTMENT === "true";
  if (!flagRequested) return; // flag off: boots clean regardless of signoff state.

  const mappingVersion = FAIR_LENDING_MAPPING_VERSION;

  // Sprint 2b Addendum 3: before evaluating gate state, make sure any signoff
  // rows left over from a prior mapping version have their retest_due_at
  // reflect reality (pulled to NOW) rather than dangling at a stale future
  // ceiling. Purely a hygiene/audit-trail step — the WHERE clause below
  // already excludes them from ever passing the gate regardless.
  await expireOutdatedMappingVersionSignoffs(mappingVersion).catch((err) => {
    logger.warn({ err }, "[fairLendingAdjustment] expireOutdatedMappingVersionSignoffs failed during boot check — continuing");
  });

  const { db } = await import("@workspace/db");
  const row = await db.execute(sql`
    SELECT id, disparate_impact_report, report_generated_at, status, retest_due_at
    FROM fair_lending_signoff
    WHERE approved_mapping_version = ${mappingVersion}
    ORDER BY created_at DESC
    LIMIT 1
  `);

  if (row.rows.length === 0) {
    const anyRow = await db.execute(sql`SELECT id FROM fair_lending_signoff LIMIT 1`);
    const reason = anyRow.rows.length > 0 ? "mapping_version_mismatch" : "no_signoff_on_file";
    logger.error(
      { mappingVersion, reason },
      "[fairLendingAdjustment] BOOT FAILURE: ENABLE_GEO_INCOME_ADJUSTMENT=true but no valid signoff exists for the current mapping version",
    );
    throw new Error(
      `[fairLendingAdjustment] BOOT FAILURE: ENABLE_GEO_INCOME_ADJUSTMENT=true in production but reason="${reason}" ` +
        `(mappingVersion=${mappingVersion}). Refusing to boot with a silently-degraded adjustment layer. ` +
        `Either disable ENABLE_GEO_INCOME_ADJUSTMENT or record a matching fair_lending_signoff via recordFairLendingSignoff().`,
    );
  }

  const signoffRow = row.rows[0] as Record<string, unknown>;

  // An expired signoff (past its retest_due_at) is treated IDENTICALLY to a
  // missing one — a lapsed review window must never keep authorizing the
  // adjustment layer past its intended re-verification date, whether the
  // original status was 'pass' or 'conditional'.
  const retestDueAt = signoffRow.retest_due_at ? new Date(signoffRow.retest_due_at as string) : null;
  if (retestDueAt !== null && retestDueAt.getTime() < Date.now()) {
    logger.error(
      { mappingVersion, signoffId: signoffRow.id, retestDueAt, status: signoffRow.status },
      "[fairLendingAdjustment] BOOT FAILURE: the only matching signoff on file has expired (past retest_due_at)",
    );
    throw new Error(
      `[fairLendingAdjustment] BOOT FAILURE: reason="signoff_expired" — the fair_lending_signoff row for ` +
        `mappingVersion=${mappingVersion} (status=${signoffRow.status}) expired at ${retestDueAt.toISOString()}. ` +
        `Refusing to boot with a silently-degraded adjustment layer. Record a fresh signoff via recordFairLendingSignoff().`,
    );
  }

  const report = signoffRow.disparate_impact_report as DisparateImpactReportResult | null;
  if (!report || classifyReportOutcome(report) === "fail") {
    logger.error(
      { mappingVersion, signoffId: signoffRow.id },
      "[fairLendingAdjustment] BOOT FAILURE: matching signoff row found, but its stored disparate-impact report is missing or fails re-verification (stale report)",
    );
    throw new Error(
      `[fairLendingAdjustment] BOOT FAILURE: reason="stale_report" — the fair_lending_signoff row for mappingVersion=${mappingVersion} ` +
        `either has no disparate_impact_report on file or the stored report no longer passes bias thresholds on re-verification. ` +
        `Refusing to boot with a silently-degraded adjustment layer.`,
    );
  }

  logger.info(
    { mappingVersion, signoffId: signoffRow.id, status: signoffRow.status },
    "[fairLendingAdjustment] boot-time production safety check passed — valid, current, non-expired signoff on file",
  );
}

// ─── Pure adjustment computation (no DB, no computePTI reference) ─────────

/**
 * Independent of computePTI() — never imports or calls into it. Purely a
 * function of (snapshot, flagState) -> adjustment. This is what makes it
 * trivial to unit test every branch without mocking the DB or the PTI
 * scoring engine.
 */
export function computeFairLendingAdjustment(
  snapshot: FairLendingSnapshot,
  flagState: AdjustmentFlagState,
): FairLendingAdjustmentResult {
  const mappingVersion = flagState.mappingVersion;

  if (!flagState.enabled) {
    return {
      adjustment: 0,
      components: [],
      applied: false,
      reason: flagState.reasonIfDisabled ?? "flag_off",
      mapping_version: mappingVersion,
    };
  }

  const hasColonia = snapshot.colonia != null || snapshot.coloniaTier != null;
  const hasIncome = snapshot.declaredIncomeBucket != null;

  // Portable mode: snapshot doesn't carry these fields at all.
  if (!hasColonia && !hasIncome) {
    return {
      adjustment: 0,
      components: [],
      applied: false,
      reason: "fields_unavailable",
      mapping_version: mappingVersion,
    };
  }

  const components: FairLendingAdjustmentComponent[] = [];
  let rawTotal = 0;

  if (hasColonia) {
    const tierKey = snapshot.coloniaTier ?? "unknown";
    const points = FAIR_LENDING_MAPPING.colonia_tier_adjustment[tierKey] ?? FAIR_LENDING_MAPPING.colonia_tier_adjustment.unknown;
    rawTotal += points;
    components.push({ key: "colonia_tier", input_value: tierKey, points });
  }

  if (hasIncome) {
    const bucketKey = snapshot.declaredIncomeBucket ?? "unknown";
    const points = FAIR_LENDING_MAPPING.income_bucket_adjustment[bucketKey] ?? FAIR_LENDING_MAPPING.income_bucket_adjustment.unknown;
    rawTotal += points;
    components.push({ key: "income_bucket", input_value: bucketKey, points });
  }

  // Reduced cap applies when the active signoff is 'conditional' — the
  // global default ±5 only applies when no override is present (i.e. the
  // active signoff is a clean 'pass').
  const cap = flagState.adjustmentCapOverride != null ? Math.abs(flagState.adjustmentCapOverride) : 5;
  const adjustment = Math.max(-cap, Math.min(cap, rawTotal));

  return { adjustment, components, applied: true, reason: null, mapping_version: mappingVersion };
}

// ─── Composition: base PTI + adjustment, with logging ─────────────────────

/**
 * base_score = computePTI(snapshot)               <- always unaffected
 * final_score = clamp(base_score + adjustment, 0, 100)
 *
 * Every call persists exactly one audit row to pti_fairlending_adjustment_log,
 * including when the adjustment layer is fully off (adjustment=0).
 */
export async function computeFinalPTI(
  snapshot: PTIDataSnapshot & FairLendingSnapshot,
  flagState: AdjustmentFlagState,
  logContext: FinalPTILogContext = {},
): Promise<FinalPTIResult> {
  const { breakdown, confidence } = computePTI(snapshot);
  const baseScore = breakdown.total;

  const { adjustment, components, applied, reason, mapping_version } = computeFairLendingAdjustment(snapshot, flagState);
  const finalScore = Math.max(0, Math.min(100, baseScore + adjustment));

  await logAdjustment({
    userId: logContext.userId ?? null,
    snapshotId: logContext.snapshotId ?? null,
    baseScore,
    adjustment,
    finalScore,
    flagState,
    applied,
    reason,
    mappingVersion: mapping_version,
    colonia: logContext.colonia ?? snapshot.colonia ?? null,
    coloniaTier: logContext.coloniaTier ?? snapshot.coloniaTier ?? null,
    declaredIncomeBucket: logContext.declaredIncomeBucket ?? snapshot.declaredIncomeBucket ?? null,
    components,
  });

  return {
    base_score: baseScore,
    adjustment,
    final_score: finalScore,
    applied,
    reason,
    components,
    mapping_version,
    breakdown,
    confidence,
  };
}

interface LogAdjustmentArgs {
  userId: string | null;
  snapshotId: string | null;
  baseScore: number;
  adjustment: number;
  finalScore: number;
  flagState: AdjustmentFlagState;
  applied: boolean;
  reason: AdjustmentDisabledReason | null;
  mappingVersion: string;
  colonia: string | null;
  coloniaTier: string | null;
  declaredIncomeBucket: string | null;
  components: FairLendingAdjustmentComponent[];
}

async function logAdjustment(args: LogAdjustmentArgs): Promise<void> {
  const { db } = await import("@workspace/db");
  await db.execute(sql`
    INSERT INTO pti_fairlending_adjustment_log (
      user_id, snapshot_id, base_score, adjustment, final_score,
      flag_requested, gate_passed, applied, reason, mapping_version,
      colonia, colonia_tier, declared_income_bucket, component_breakdown
    ) VALUES (
      ${args.userId}, ${args.snapshotId}, ${args.baseScore}, ${args.adjustment}, ${args.finalScore},
      ${args.flagState.flagRequested}, ${args.flagState.gatePassed}, ${args.applied}, ${args.reason}, ${args.mappingVersion},
      ${args.colonia}, ${args.coloniaTier}, ${args.declaredIncomeBucket}, ${JSON.stringify(args.components)}::jsonb
    )
  `);
}

// ─── Delta-report utility (bias-testing artifact) ──────────────────────────

export interface DeltaReportRow {
  base_score: number;
  final_score: number;
  delta: number;
}

/**
 * Given a batch of (snapshot, flagState) pairs, returns the distribution of
 * (final_score - base_score). Intended for use with a TEST FIXTURE mapping
 * (non-zero values), never against the live production mapping — this is
 * the artifact used for bias-testing sign-off, not a production code path.
 */
export function buildDeltaReport(
  rows: Array<{ snapshot: PTIDataSnapshot & FairLendingSnapshot; flagState: AdjustmentFlagState }>,
): DeltaReportRow[] {
  return rows.map(({ snapshot, flagState }) => {
    const { breakdown } = computePTI(snapshot);
    const baseScore = breakdown.total;
    const { adjustment } = computeFairLendingAdjustment(snapshot, flagState);
    const finalScore = Math.max(0, Math.min(100, baseScore + adjustment));
    return { base_score: baseScore, final_score: finalScore, delta: finalScore - baseScore };
  });
}
