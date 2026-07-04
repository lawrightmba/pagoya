/**
 * Fair-Lending Adjustment — Placeholder Mapping Config (Sprint 2b)
 *
 * This is a PLACEHOLDER config pending bias/fair-lending sign-off. All values
 * ship at 0 so the full pipeline (flag resolution, gating, logging, delta
 * reporting) can be built and demonstrated end-to-end producing adjustment=0
 * everywhere, without any real point values existing yet.
 *
 * IMPORTANT: this file is intentionally editable without a code deploy in
 * spirit — once real values are approved via bias testing, only the numbers
 * below need to change (plus a recorded row in `fair_lending_signoff` whose
 * `approved_mapping_version` matches the new hash). No changes to the
 * adjustment engine (`fairLendingAdjustment.ts`) or to `computePTI()` itself
 * are required at that point.
 *
 * `computePTI()` (pti.ts) must NEVER import or reference this file, or
 * colonia/declared_income_bucket at all. See the regression guard in
 * `pti.test.ts` ("computePTI never references colonia/declared_income_bucket").
 */

import { createHash } from "node:crypto";

export interface FairLendingMapping {
  version: string;
  colonia_tier_adjustment: Record<string, number>;
  income_bucket_adjustment: Record<string, number>;
}

export const FAIR_LENDING_MAPPING: FairLendingMapping = {
  version: "", // computed below via computeMappingVersionHash()

  colonia_tier_adjustment: {
    tier_1_marginacion_muy_bajo: 0, // TODO: pending bias test
    tier_2_marginacion_bajo: 0,     // TODO: pending bias test
    tier_3_marginacion_medio: 0,    // TODO: pending bias test
    tier_4_marginacion_alto: 0,     // TODO: pending bias test
    tier_5_marginacion_muy_alto: 0, // TODO: pending bias test
    unknown: 0,
  },

  income_bucket_adjustment: {
    bucket_1_lowest: 0,  // TODO: pending bias test
    bucket_2: 0,         // TODO: pending bias test
    bucket_3: 0,         // TODO: pending bias test
    bucket_4: 0,         // TODO: pending bias test
    bucket_5_highest: 0, // TODO: pending bias test
    unknown: 0,
  },
};

/**
 * Deterministic version hash of the mapping table's point VALUES (not the
 * TODO comments — those are TS source comments and never reach this object).
 * Any change to the point values must produce a new hash, which is what
 * `fair_lending_signoff.approved_mapping_version` must match for the
 * adjustment layer to ever activate in production.
 */
export function computeMappingVersionHash(
  mapping: Omit<FairLendingMapping, "version"> = FAIR_LENDING_MAPPING,
): string {
  const canonical = JSON.stringify({
    colonia_tier_adjustment: sortedEntries(mapping.colonia_tier_adjustment),
    income_bucket_adjustment: sortedEntries(mapping.income_bucket_adjustment),
  });
  return createHash("sha256").update(canonical).digest("hex").slice(0, 16);
}

function sortedEntries(obj: Record<string, number>): [string, number][] {
  return Object.entries(obj).sort(([a], [b]) => a.localeCompare(b));
}

export const FAIR_LENDING_MAPPING_VERSION = computeMappingVersionHash(FAIR_LENDING_MAPPING);

/**
 * Fair-Lending Signoff Thresholds — Placeholder Config (Sprint 2b Addendum 2)
 *
 * Drives `classifyReportOutcome()` in fairLendingAdjustment.ts. Editable
 * without a code deploy, same spirit as FAIR_LENDING_MAPPING above.
 *
 * OWNERSHIP NOTE (flagged per addendum): the STATISTICAL cutoffs below
 * (ratio thresholds, residual-effect severity cutoff) are a data-science /
 * bias-testing-methodology decision, NOT a compliance/legal decision and
 * NOT assumed to be Julio's call. Legal owns interpreting what a given
 * classification means for compliance obligations, not the numeric cutoffs
 * themselves. If ownership of these numbers is ambiguous, flag back to
 * Lloyd before treating any of the values below as final.
 *
 * ALL VALUES BELOW ARE PLACEHOLDERS PENDING SIGN-OFF FROM THE BIAS-TEST
 * METHODOLOGY OWNER. Do not treat as approved thresholds.
 */
export interface FairLendingThresholds {
  /** Four-fifths ratio at/above which the ratio dimension alone is a full "pass". */
  fourFifths_pass_min: number; // TODO: confirm with bias-test methodology owner
  /** Four-fifths ratio at/above which the ratio dimension is "conditional" (below this = outright fail). */
  fourFifths_conditional_min: number; // TODO: confirm with bias-test methodology owner
  /**
   * Residual-effect severity metric (e.g. effect-size or 1 - p-value) at/above
   * which a detected residual effect is considered severe enough to escalate
   * a result to (or keep it at) 'fail' rather than 'conditional'.
   */
  residual_effect_severity_conditional_max: number; // TODO: confirm with bias-test methodology owner — units/metric TBD (p-value AND/OR effect-size cutoff)
  /** Reduced adjustment cap (absolute value) applied when status='conditional'. */
  conditional_adjustment_cap: number; // TODO: confirm with bias-test methodology owner, e.g. ±2
  /** Retest interval (days) for a full 'pass' signoff. */
  standard_retest_interval_days: number; // TODO: confirm, e.g. 180
  /** Retest interval (days) for a 'conditional' signoff — shorter than standard. */
  conditional_retest_interval_days: number; // TODO: confirm, e.g. 60
  /**
   * Fractional growth (e.g. 0.25 = +25%) in the scored population since the
   * active signoff's baseline count that should force an early retest.
   * NULL = trigger disabled (mechanism built, not yet calibrated).
   *
   * TODO PLACEHOLDER — pending input from the bias-testing methodology owner
   * on what volume shift is actually meaningful. Do not set a "reasonable
   * guess" value here; leave null until an explicit number is provided.
   */
  volume_growth_trigger_pct: number | null;
}

export const FAIR_LENDING_THRESHOLDS: FairLendingThresholds = {
  fourFifths_pass_min: 0.8, // TODO: confirm with bias-test methodology owner
  fourFifths_conditional_min: 0.7, // TODO: confirm with bias-test methodology owner
  residual_effect_severity_conditional_max: 0.5, // TODO: confirm with bias-test methodology owner (placeholder mid-scale value, units TBD)
  conditional_adjustment_cap: 2, // TODO: confirm with bias-test methodology owner
  standard_retest_interval_days: 180, // TODO: confirm with bias-test methodology owner
  conditional_retest_interval_days: 60, // TODO: confirm with bias-test methodology owner
  volume_growth_trigger_pct: null, // TODO: pending input — mechanism is live but disabled until set
};

/**
 * Fair-Lending Threshold Ownership (Sprint 2b Addendum 3)
 *
 * `FAIR_LENDING_THRESHOLDS` above is a bias-testing-methodology decision, not
 * a free-for-all config. Only the current authorized owner (tracked in the
 * `fair_lending_threshold_owner_log` DB table — append-only, latest row wins)
 * may modify it (via `updateFairLendingThresholds()`) or attest a signoff
 * (via `recordFairLendingSignoff()`). See `fairLendingOwnership.ts` for the
 * enforcement functions. Reassignment is a deliberate, audited act via
 * `reassignThresholdOwner()` — never a direct table edit.
 */
