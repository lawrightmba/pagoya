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
 * Fair-Lending Signoff Thresholds (Sprint 2b Addendum 2, values populated
 * Addendum 4).
 *
 * Drives `classifyReportOutcome()` in fairLendingAdjustment.ts. Editable
 * without a code deploy, same spirit as FAIR_LENDING_MAPPING above.
 *
 * OWNERSHIP NOTE (flagged per addendum): the STATISTICAL cutoffs below
 * (ratio thresholds, residual-effect significance/severity cutoffs, minimum
 * sample size) are a data-science / bias-testing-methodology decision, NOT a
 * compliance/legal decision and NOT assumed to be Julio's call. Legal owns
 * interpreting what a given classification means for compliance
 * obligations, not the numeric cutoffs themselves. If ownership of these
 * numbers is ambiguous, flag back to Lloyd before treating any of the
 * values below as final.
 *
 * ============================================================================
 * METHODOLOGY CAVEAT (Sprint 2b Addendum 4) — READ BEFORE CITING THESE VALUES
 * ============================================================================
 * The values below are an INITIAL CONFIGURATION set by Lloyd Wright as the
 * authorized threshold owner, borrowing from US EEOC/ECOA four-fifths-rule
 * convention. Lloyd is not a statistician. These are a defensible, DOCUMENTED
 * STARTING POINT — NOT validated science, and NOT confirmed as applicable to
 * Mexico's regulatory context or PagoYa's specific population. They are
 * pending review by a qualified bias-testing methodology reviewer for
 * jurisdiction-specific adjustment. Do not present these as final/validated
 * thresholds in any user-facing, licensee-facing, or investor-facing
 * documentation (data cards, methodology memos, etc.) without this caveat
 * carried alongside them.
 * ============================================================================
 */
export interface FairLendingThresholds {
  /** Four-fifths ratio at/above which the ratio dimension alone is a full "pass". */
  fourFifths_pass_min: number;
  /** Four-fifths ratio at/above which the ratio dimension is "conditional" (below this = outright fail). */
  fourFifths_conditional_min: number;
  /**
   * Minimum sample size required PER COMPARED GROUP before a disparate-impact
   * report may be classified as pass/conditional/fail at all. If either
   * group's sample size is below this, `classifyReportOutcome()` returns
   * 'insufficient_data' regardless of what the ratio/residual values are —
   * a statistically meaningless ratio (e.g. computed on n=5) must never be
   * treated the same as one computed on a meaningful sample.
   */
  minimum_sample_size_per_group: number;
  /**
   * P-value threshold below which a residual effect is a candidate to be
   * "significant" — but significance ALSO requires the effect size (d) to
   * clear `residual_effect_min_magnitude_d`. P-value alone must never gate
   * significance (a large sample can produce p<0.05 on a trivially small,
   * practically meaningless effect).
   */
  residual_effect_significance_p: number;
  /**
   * Minimum effect size (Cohen's d or equivalent) required, ALONGSIDE
   * p < residual_effect_significance_p, for a residual effect to be treated
   * as "significant" at all. Below this magnitude, even a low p-value is not
   * treated as a significant residual effect.
   */
  residual_effect_min_magnitude_d: number;
  /**
   * Effect-size (d) magnitude at/above which a significant residual effect
   * is considered severe enough to escalate a result to (or keep it at)
   * 'fail' rather than 'conditional'. Driven by effect size, NEVER by
   * p-value — p-value magnitude must not be used anywhere in this
   * escalation decision.
   */
  residual_effect_severity_conditional_max_d: number;
  /** Reduced adjustment cap (absolute value) applied when status='conditional'. */
  conditional_adjustment_cap: number;
  /** Retest interval (days) for a full 'pass' signoff. */
  standard_retest_interval_days: number;
  /** Retest interval (days) for a 'conditional' signoff — shorter than standard. */
  conditional_retest_interval_days: number;
  /**
   * Growth in the scored population, expressed in PERCENTAGE POINTS (e.g.
   * 25 = +25%, NOT a 0-1 fraction), since the active signoff's baseline
   * count that should force an early retest. NULL = trigger disabled
   * (mechanism built, not yet calibrated).
   */
  volume_growth_trigger_pct: number | null;
}

/**
 * INITIAL CONFIGURATION set by Lloyd Wright (authorized threshold owner) via
 * `updateFairLendingThresholds()` per Sprint 2b Addendum 4. See the
 * METHODOLOGY CAVEAT above — these borrow from US EEOC/ECOA convention and
 * are pending review by a qualified bias-testing methodology reviewer for
 * applicability to Mexico's regulatory context.
 */
export const FAIR_LENDING_THRESHOLDS: FairLendingThresholds = {
  fourFifths_pass_min: 0.8,
  fourFifths_conditional_min: 0.7,
  minimum_sample_size_per_group: 30,
  residual_effect_significance_p: 0.05,
  residual_effect_min_magnitude_d: 0.2,
  residual_effect_severity_conditional_max_d: 0.5,
  conditional_adjustment_cap: 2,
  standard_retest_interval_days: 180,
  conditional_retest_interval_days: 60,
  volume_growth_trigger_pct: 25,
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
