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
import { FAIR_LENDING_MAPPING, FAIR_LENDING_MAPPING_VERSION } from "../config/fairLendingMapping.js";

// ─── Types ──────────────────────────────────────────────────────────────────

export type AdjustmentDisabledReason = "flag_off" | "no_signoff_on_file" | "fields_unavailable";

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
  /** Did a matching fair_lending_signoff row exist (or staging bypass apply)? */
  gatePassed: boolean;
  /** Hash of the mapping table in effect at resolution time. */
  mappingVersion: string;
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
    return { enabled: false, reasonIfDisabled: "flag_off", flagRequested: false, gatePassed: false, mappingVersion };
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
    return { enabled: true, reasonIfDisabled: null, flagRequested: true, gatePassed: true, mappingVersion };
  }

  const gatePassed = await hasMatchingSignoff(mappingVersion);
  if (!gatePassed) {
    logger.warn({ mappingVersion }, "[fairLendingAdjustment] adjustment layer requested but no matching signoff on file");
    return { enabled: false, reasonIfDisabled: "no_signoff_on_file", flagRequested: true, gatePassed: false, mappingVersion };
  }

  return { enabled: true, reasonIfDisabled: null, flagRequested: true, gatePassed: true, mappingVersion };
}

async function hasMatchingSignoff(mappingVersion: string): Promise<boolean> {
  const { db } = await import("@workspace/db");
  const row = await db.execute(sql`
    SELECT id FROM fair_lending_signoff
    WHERE approved_mapping_version = ${mappingVersion}
    LIMIT 1
  `);
  return row.rows.length > 0;
}

/**
 * Startup safety assertion. Call once at process boot (from app.ts/index.ts)
 * so a misconfigured production deploy fails loudly instead of silently
 * degrading to "ignored bypass" at request time.
 */
export function assertProductionSafety(): void {
  const isProduction = process.env.NODE_ENV === "production";
  const stagingBypassRequested = process.env.ALLOW_UNSIGNED_ADJUSTMENT_IN_STAGING === "true";
  if (isProduction && stagingBypassRequested) {
    throw new Error(
      "ALLOW_UNSIGNED_ADJUSTMENT_IN_STAGING must never be true when NODE_ENV=production. Fix deploy config.",
    );
  }
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

  const adjustment = Math.max(-5, Math.min(5, rawTotal));

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
