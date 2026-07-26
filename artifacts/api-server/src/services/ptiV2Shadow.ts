/**
 * PTI v2 Shadow Behavioral Profile — pti-v2-shadow-1.0
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * PURPOSE
 * ───────
 * A restructured three-dimension behavioral profile that recombines existing
 * v5 sub-formulas (reused verbatim, never reinvented) into a conceptually
 * coherent grouping. Runs alongside production PTI v5 without ever affecting it.
 *
 * HARD CONSTRAINTS — must hold in every code path:
 *   ✗ Never writes to any production table (no INSERT, UPDATE, or DELETE anywhere
 *     in this file or in any function it calls).
 *   ✗ Never modifies users.pti_score, users.pti_breakdown, or any gate criterion.
 *   ✗ Never affects readinessGate, the licensee B2B API, Paula messaging, KYC,
 *     or any user-facing communication of any kind.
 *   ✗ Not added to the nightly cron — on-demand, computed-on-read only.
 *   ✗ No new database tables or columns. No schema changes.
 *   ✗ computePTIv5 (ptiV5.ts) is completely unmodified. All v5 outputs remain
 *     byte-identical whether or not this module is imported.
 *
 * NO PREDICTIVE CLAIMS:
 *   This model makes zero claims about probability of default, probability of
 *   repayment, creditworthiness, credit risk, lending recommendations, or
 *   intervention recommendations. It is observed behavioral intelligence only,
 *   explicitly pre-validation and shadow status. Do not add language implying
 *   any of the above — not in code, not in comments, not in output field names.
 *
 * PRODUCTION CONTEXT:
 *   Production today has essentially no real payment data (pre-launch). All weights
 *   are PRE-VALIDATION PRIORS — declared starting points, not values calibrated from
 *   any dataset. Do not infer empirical weights from the current production sample.
 *
 * ISOLATION GUARANTEES:
 *   • Evidence Depth (ptiV2.ts) has zero effect on shadow score. This file never
 *     imports or calls computeEvidenceDepthFromInputs or any of its helpers.
 *     The shadow profile accepts only a PTIDataSnapshot.
 *   • Behavioral Trajectory (ptiV2.ts) has zero effect on shadow score. This file
 *     never imports or calls computeBehavioralTrajectory or buildTrajectoryObservation.
 *   • KYC status (kycVerified, kycTier) creates no bonus in the shadow score.
 *     These fields are explicitly excluded — see dimension comments below.
 *   • A cash-first/OXXO-only user and a banked/SPEI user with identical observable
 *     payment behavior receive equivalent shadow scores. The excluded fields
 *     (daysToFirstSpei, oxxoLoadCount, speiLoadCount, cardLoadCount, kycVerified,
 *     kycTier, wallet_balance/bancarization_speed/funding_channel_mix) are all
 *     fields that would structurally penalize cash-first, unbanked, or thin-file
 *     users — they are excluded for the same fair-lending reasons they are
 *     zero-weighted in v5.
 *
 * THREE DIMENSIONS
 * ────────────────
 *
 * 1. PAYMENT RELIABILITY (v2)
 *    Moved from v5 Payment Reliability (verbatim): payment_streak,
 *      payment_day_consistency, advance_payment_days, self_initiated_ratio.
 *    Moved from v5 Behavioral Consistency (verbatim): recovery_after_miss.
 *    Rationale for move: recovery_after_miss is about payment recovery behavior,
 *      not general behavioral stability. It belongs alongside payment streak and
 *      consistency.
 *    Raw-point ceiling: PR_V2_RAW_MAX = 38 pts
 *      (streak=16 + payDay=5 + advance=8 + selfInit=7 + recovery=2)
 *    INSUFFICIENT_DATA: when payCount < 1 (no confirmed payments — every
 *      sub-component either requires payCount ≥ 3 or produces 0 from streakMonths=0).
 *
 * 2. CASH FLOW RESILIENCE (v2)
 *    Kept from v5 Cash-Flow Stability (verbatim): load_spend_ratio, buffer_retention.
 *    Raw-point ceiling: CFR_V2_RAW_MAX = 7 pts (loadSpend=4 + bufferRetention=3)
 *    EXCLUDED — fair-lending / methodological reasons:
 *      • wallet_balance, bancarization_speed, funding_channel_mix: correctly
 *        zero-weighted in v5; would structurally penalize cash-first, unbanked,
 *        thin-file users. Excluded here for the same reasons.
 *      • account_age: an observation-duration signal, not behavior. Already
 *        captured properly by Evidence Depth (Duration component). Including it
 *        here would double-count the same underlying fact as both evidence quantity
 *        and behavioral quality.
 *      • p2p_network_activity: PLAUSIBLE future resilience signal (informal financial
 *        support networks that may indicate real-world resilience), but currently
 *        implemented in a product-engagement flavor rather than genuine financial
 *        resilience behavior. Needs further validation before inclusion. Flagged
 *        for a future shadow sprint once behavioral vs engagement signal can be
 *        separated at the data level.
 *    LIMITATION (documented, not a reason to change weights):
 *      With only two underlying features, Cash Flow Resilience will produce a
 *      coarser, less discriminative score than Payment Reliability (five features).
 *      This is a known limitation for future feature development — not a basis
 *      for adjusting the weight prior in this sprint.
 *    INSUFFICIENT_DATA: when totalLoads ≤ 0 AND totalSpend ≤ 0 AND currentBalance ≤ 0
 *      (no wallet activity at all — both sub-components require load/spend/balance data).
 *
 * 3. BEHAVIORAL STABILITY (v2)
 *    Kept from v5 Behavioral Consistency (verbatim): session_cadence, routine_score,
 *      wallet_load_rhythm.
 *    Moved from v5 Cash-Flow Stability (verbatim): payment_amount_volatility.
 *    Rationale for move: payment_amount_volatility measures consistency and
 *      predictability of a user's own payment amounts relative to their own prior
 *      pattern — a behavioral regularity signal. It fits Behavioral Stability's
 *      definition better than Cash Flow Resilience.
 *    Raw-point ceiling: BS_V2_RAW_MAX = 15 pts
 *      (sessionCadence=2 + routineScore=2 + loadRhythm=4 + amountVolatility=7)
 *    EXCLUDED — engagement/coaching signals, not genuine financial behavior:
 *      • game_engagement, paula_interaction_depth, push_notification_engagement,
 *        financial_curiosity_index, paula_response_latency: all measure engagement
 *        with app features and the Paula coaching product. Conflating product usage
 *        with financial trustworthiness is methodologically unsound and would create
 *        incentive distortions (users gaming the score by opening push notifications).
 *    INSUFFICIENT_DATA: when loginDays30 < 1 AND loadCount30 < 3 AND payCount < 2
 *      (brand-new account with no app activity — all sub-scores would be zero due to
 *      insufficient input data, not due to negative behavior).
 *
 * ENGAGEMENT DEPTH — intentionally absent as a v2 shadow dimension:
 *   • biller_diversity: redundant with Evidence Depth Breadth component (both measure
 *     distinct billers observed). Must not be double-counted as a behavioral score.
 *   • signup_utilization_speed: correctly lives only in Evidence Depth already.
 *   • kyc_verified: identity/verification status, not observed financial behavior.
 *     Out of scope for behavioral scoring; a separate future identity construct.
 *   • device_consistency: fraud/security context, not behavioral. Out of scope.
 *
 * WEIGHTS (PROVISIONAL, PRE-VALIDATION PRIORS):
 *   Payment Reliability:  45% (SHADOW_WEIGHT_PAYMENT_RELIABILITY)
 *   Cash Flow Resilience: 35% (SHADOW_WEIGHT_CASH_FLOW_RESILIENCE)
 *   Behavioral Stability: 20% (SHADOW_WEIGHT_BEHAVIORAL_STABILITY)
 *   ╔══════════════════════════════════════════════════════════════════════╗
 *   ║ THESE WEIGHTS ARE DECLARED PRIOR HYPOTHESES ONLY.                  ║
 *   ║ They have NOT been empirically validated on any dataset.            ║
 *   ║ They must NOT be presented as calibrated, final, or predictive.    ║
 *   ║ Do not adjust them based on the tiny pre-launch production sample.  ║
 *   ╚══════════════════════════════════════════════════════════════════════╝
 *
 * NORMALIZATION:
 *   Each dimension score = Math.round((raw_points / raw_max) * 100 * 10) / 10
 *   giving a 0–100 scale with one decimal place.
 *
 * MISSING-DATA HANDLING (see computeShadowAggregate for implementation):
 *   INSUFFICIENT_DATA — returned at dimension level when none of a dimension's
 *   inputs have enough data to produce any meaningful sub-score.
 *   Aggregate rules:
 *     All 3 COMPUTED → weighted aggregate using the three priors above.
 *     Exactly 1 INSUFFICIENT_DATA → redistribute the two surviving dimensions'
 *       weights proportionally so they sum to 100%. Report excluded dimension.
 *     2 or 3 INSUFFICIENT_DATA → aggregate is INSUFFICIENT_DATA (null score).
 *       Never produce a one-dimensional aggregate dressed up as a full profile.
 *       Prefer no aggregate score over false precision.
 */

import type { PTIDataSnapshot } from "./pti.js";

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1 — MODEL IDENTITY CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

/** Canonical model identifier for this shadow model. */
export const PTI_V2_SHADOW_MODEL_ID = "pti-v2-shadow-1.0" as const;

/**
 * Validation status — always PRE_VALIDATION.
 * This model has not been validated on any real dataset and must not be
 * presented as validated, calibrated, or production-ready.
 */
export const PTI_V2_SHADOW_VALIDATION_STATUS = "PRE_VALIDATION" as const;

/**
 * Deployment status — always SHADOW.
 * This model runs alongside production without affecting any production output.
 */
export const PTI_V2_SHADOW_DEPLOYMENT_STATUS = "SHADOW" as const;

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2 — PROVISIONAL WEIGHT PRIORS (pre-validation, not empirical)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Provisional prior weight for Payment Reliability dimension.
 * PRE-VALIDATION — not empirically calibrated. Reflects the hypothesis that
 * consistent, self-initiated, on-time payment behavior is the strongest
 * observable behavioral signal for financial trustworthiness.
 */
export const SHADOW_WEIGHT_PAYMENT_RELIABILITY = 0.45;

/**
 * Provisional prior weight for Cash Flow Resilience dimension.
 * PRE-VALIDATION — not empirically calibrated. Note: this dimension currently
 * has only two sub-features (load_spend_ratio, buffer_retention), making it
 * coarser than Payment Reliability. Weight should be revisited as more
 * resilience signals are validated.
 */
export const SHADOW_WEIGHT_CASH_FLOW_RESILIENCE = 0.35;

/**
 * Provisional prior weight for Behavioral Stability dimension.
 * PRE-VALIDATION — not empirically calibrated.
 */
export const SHADOW_WEIGHT_BEHAVIORAL_STABILITY = 0.20;

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3 — RAW-POINT CEILINGS PER DIMENSION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Raw-point ceiling for Payment Reliability (v2).
 * Sum of included sub-component maxima:
 *   payment_streak(16) + payment_day_consistency(5) + advance_payment_days(8)
 *   + self_initiated_ratio(7) + recovery_after_miss(2) = 38
 */
export const PR_V2_RAW_MAX = 38;

/**
 * Raw-point ceiling for Cash Flow Resilience (v2).
 * Sum of included sub-component maxima:
 *   load_spend_ratio(4) + buffer_retention(3) = 7
 */
export const CFR_V2_RAW_MAX = 7;

/**
 * Raw-point ceiling for Behavioral Stability (v2).
 * Sum of included sub-component maxima:
 *   session_cadence(2) + routine_score(2) + wallet_load_rhythm(4)
 *   + payment_amount_volatility(7) = 15
 */
export const BS_V2_RAW_MAX = 15;

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4 — TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type ShadowDimensionStatus = "COMPUTED" | "INSUFFICIENT_DATA";

export interface ShadowComponentEntry {
  /** Raw points earned by this sub-component. */
  score: number;
  /** Maximum raw points possible for this sub-component. */
  max: number;
}

export interface ShadowDimensionResult {
  /** COMPUTED when at least one sub-component produced a score; INSUFFICIENT_DATA otherwise. */
  status: ShadowDimensionStatus;
  /**
   * Normalized 0–100 score: Math.round((raw_points / raw_max) * 100 * 10) / 10.
   * Null when status is INSUFFICIENT_DATA — never substitute 0 for missing evidence.
   */
  normalized_score: number | null;
  /** Sum of raw sub-component scores. Null when INSUFFICIENT_DATA. */
  raw_points: number | null;
  /** Maximum possible raw points for this dimension's included sub-components. */
  raw_max: number;
  /** Per-sub-component raw scores. Always populated (even during INSUFFICIENT_DATA, shows zeroes). */
  components: Record<string, ShadowComponentEntry>;
}

export interface ShadowAggregateResult {
  /** COMPUTED when ≥ 2 dimensions have valid scores; INSUFFICIENT_DATA when ≤ 1 is available. */
  status: ShadowDimensionStatus;
  /**
   * Weighted aggregate score 0–100. Null when status is INSUFFICIENT_DATA.
   * PRE-VALIDATION — weights are priors only, not empirically calibrated.
   */
  score: number | null;
  /**
   * The actual weights applied to each dimension's normalized_score.
   * When all 3 dimensions are COMPUTED these equal the declared priors.
   * When exactly 1 dimension is INSUFFICIENT_DATA the other two are rescaled
   * proportionally so they sum to 1.0.
   * Null when aggregate is INSUFFICIENT_DATA.
   * PRE-VALIDATION PRIORS — these weights have not been empirically validated.
   */
  weights_applied: {
    payment_reliability: number;
    cash_flow_resilience: number;
    behavioral_stability: number;
  } | null;
  /**
   * Names of dimensions excluded from the aggregate due to INSUFFICIENT_DATA.
   * Empty array when all three are COMPUTED.
   */
  excluded_dimensions: string[];
}

export interface ShadowBehavioralProfile {
  /** Always "pti-v2-shadow-1.0". */
  model_id: typeof PTI_V2_SHADOW_MODEL_ID;
  /**
   * Always "PRE_VALIDATION".
   * This model has not been validated on any dataset. It is behavioral
   * intelligence only — no probability of default, creditworthiness,
   * or lending recommendation is expressed or implied anywhere in this output.
   */
  validation_status: typeof PTI_V2_SHADOW_VALIDATION_STATUS;
  /** Always "SHADOW". This output must never gate any production decision. */
  deployment_status: typeof PTI_V2_SHADOW_DEPLOYMENT_STATUS;
  /** ISO-8601 timestamp when this result was computed. */
  computed_at: string;
  dimensions: {
    payment_reliability:  ShadowDimensionResult;
    cash_flow_resilience: ShadowDimensionResult;
    behavioral_stability: ShadowDimensionResult;
  };
  aggregate: ShadowAggregateResult;
}

/**
 * Comparison between production v5 score and shadow aggregate score.
 *
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║ IMPORTANT: numeric_delta must NEVER be interpreted as improvement or   ║
 * ║ deterioration of a user's financial standing. These are two different  ║
 * ║ methodologies being placed side by side for research purposes — NOT a  ║
 * ║ before/after measurement of the same thing. A negative delta does not  ║
 * ║ mean the shadow model penalizes the user; a positive delta does not    ║
 * ║ mean the shadow model rewards them. The scales are structurally        ║
 * ║ different (v5 has more components; shadow normalizes differently).     ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */
export interface ShadowVsV5Comparison {
  /** Production v5 total score (0–100) from users.pti_score. */
  v5_score: number;
  /**
   * Shadow aggregate score (0–100), or null if shadow aggregate is INSUFFICIENT_DATA.
   * PRE-VALIDATION — not comparable to v5 on an equal basis.
   */
  shadow_aggregate_score: number | null;
  /**
   * v5_score minus shadow_aggregate_score. Null if shadow aggregate is INSUFFICIENT_DATA.
   * See struct-level warning: this is a methodological comparison, not a trend signal.
   */
  numeric_delta: number | null;
  /**
   * Per-dimension score pairing for research inspection.
   * v5_score for each dimension is the raw v5 points (out of the v5 max for that dimension).
   * shadow_normalized is the shadow 0–100 normalized score for the equivalent dimension.
   */
  dimension_mapping: {
    payment_reliability:  { v5_score: number; shadow_normalized: number | null };
    cash_flow_resilience: { v5_score: number; shadow_normalized: number | null };
    behavioral_stability: { v5_score: number; shadow_normalized: number | null };
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 5 — PURE DIMENSION COMPUTE FUNCTIONS
//
// All formulas are reused VERBATIM from ptiV5.ts. The only changes are:
//   • recovery_after_miss moved from Behavioral Consistency → Payment Reliability
//   • payment_amount_volatility moved from Cash-Flow Stability → Behavioral Stability
//   • game_engagement, paula_*, push_*, curiosity removed from Behavioral Stability
//   • wallet_balance, bancarization_speed, funding_channel_mix, account_age,
//     p2p_network_activity removed from Cash Flow Resilience
// If a formula ever changes in ptiV5.ts, that change must be manually reflected
// here — these are intentional verbatim copies, not shared code, to keep the
// shadow model's evolution independent of the production model.
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Normalize raw dimension points to a 0–100 scale.
 * Result is rounded to one decimal place.
 */
function normalize(rawPoints: number, rawMax: number): number {
  if (rawMax <= 0) return 0;
  return Math.round((rawPoints / rawMax) * 100 * 10) / 10;
}

/**
 * Compute Payment Reliability dimension for the shadow profile.
 *
 * Sub-components (verbatim from ptiV5.ts):
 *   • payment_streak         — max 16 pts
 *   • payment_day_consistency — max  5 pts
 *   • advance_payment_days    — max  8 pts
 *   • self_initiated_ratio    — max  7 pts
 *   • recovery_after_miss     — max  2 pts  [moved from v5 behavioral_consistency]
 *   Raw ceiling: PR_V2_RAW_MAX = 38
 *
 * INSUFFICIENT_DATA when payCount < 1 (no confirmed payments; every sub-component
 * either requires payCount ≥ 3 or produces 0 at streakMonths = 0).
 */
export function computeShadowPaymentReliability(
  snap: PTIDataSnapshot,
): ShadowDimensionResult {
  const { streakMonths, payCount, domStddev, advanceDays, selfRatio,
          latePaymentCount, lateRecoveryRatio } = snap;

  // INSUFFICIENT_DATA guard
  if (payCount < 1) {
    return {
      status:           "INSUFFICIENT_DATA",
      normalized_score: null,
      raw_points:       null,
      raw_max:          PR_V2_RAW_MAX,
      components: {
        payment_streak:          { score: 0, max: 16 },
        payment_day_consistency: { score: 0, max:  5 },
        advance_payment_days:    { score: 0, max:  8 },
        self_initiated_ratio:    { score: 0, max:  7 },
        recovery_after_miss:     { score: 0, max:  2 },
      },
    };
  }

  // 1a. payment_streak — verbatim from ptiV5.ts line 77
  const paymentStreakScore = Math.max(0, Math.min(16, (streakMonths - 2) * 4));

  // 1b. payment_day_consistency — verbatim from ptiV5.ts lines 81–87
  let payDayConsistency = 0;
  if (payCount >= 3) {
    if      (domStddev <= 2)  payDayConsistency = 5;
    else if (domStddev <= 5)  payDayConsistency = 3;
    else if (domStddev <= 8)  payDayConsistency = 2;
    else if (domStddev <= 12) payDayConsistency = 1;
  }

  // 1c. advance_payment_days — verbatim from ptiV5.ts lines 91–97
  let advancePayScore = 0;
  if (payCount >= 3) {
    if      (advanceDays >= 7) advancePayScore = 8;
    else if (advanceDays >= 4) advancePayScore = 6;
    else if (advanceDays >= 2) advancePayScore = 4;
    else if (advanceDays >= 1) advancePayScore = 2;
  }

  // 1d. self_initiated_ratio — verbatim from ptiV5.ts lines 100–106
  let selfInitScore = 0;
  if (payCount >= 3) {
    if      (selfRatio >= 0.9) selfInitScore = 7;
    else if (selfRatio >= 0.7) selfInitScore = 4;
    else if (selfRatio >= 0.5) selfInitScore = 3;
    else if (selfRatio >= 0.3) selfInitScore = 1;
  }

  // 1e. recovery_after_miss — verbatim from ptiV5.ts lines 156–161
  //     (moved from v5 behavioral_consistency — conceptually about payment recovery)
  let recoveryScore = 0;
  if (payCount >= 3) {
    if      (latePaymentCount === 0)    recoveryScore = 2;
    else if (lateRecoveryRatio >= 0.75) recoveryScore = 2;
    else if (lateRecoveryRatio >= 0.40) recoveryScore = 1;
  }

  const rawPoints = paymentStreakScore + payDayConsistency + advancePayScore
                  + selfInitScore + recoveryScore;

  return {
    status:           "COMPUTED",
    normalized_score: normalize(rawPoints, PR_V2_RAW_MAX),
    raw_points:       rawPoints,
    raw_max:          PR_V2_RAW_MAX,
    components: {
      payment_streak:          { score: paymentStreakScore, max: 16 },
      payment_day_consistency: { score: payDayConsistency,  max:  5 },
      advance_payment_days:    { score: advancePayScore,    max:  8 },
      self_initiated_ratio:    { score: selfInitScore,      max:  7 },
      recovery_after_miss:     { score: recoveryScore,      max:  2 },
    },
  };
}

/**
 * Compute Cash Flow Resilience dimension for the shadow profile.
 *
 * Sub-components (verbatim from ptiV5.ts):
 *   • load_spend_ratio  — max 4 pts
 *   • buffer_retention  — max 3 pts
 *   Raw ceiling: CFR_V2_RAW_MAX = 7
 *
 * EXPLICITLY EXCLUDED (see module header for rationale):
 *   wallet_balance, bancarization_speed, funding_channel_mix (fair-lending reasons),
 *   account_age (evidence quantity, not behavior; double-counted vs Evidence Depth),
 *   p2p_network_activity (needs further validation as resilience signal).
 *
 * INSUFFICIENT_DATA when totalLoads ≤ 0 AND totalSpend ≤ 0 AND currentBalance ≤ 0.
 */
export function computeShadowCashFlowResilience(
  snap: PTIDataSnapshot,
): ShadowDimensionResult {
  const { totalLoads, totalSpend, currentBalance } = snap;

  // INSUFFICIENT_DATA guard
  if (totalLoads <= 0 && totalSpend <= 0 && currentBalance <= 0) {
    return {
      status:           "INSUFFICIENT_DATA",
      normalized_score: null,
      raw_points:       null,
      raw_max:          CFR_V2_RAW_MAX,
      components: {
        load_spend_ratio: { score: 0, max: 4 },
        buffer_retention: { score: 0, max: 3 },
      },
    };
  }

  // 2a. load_spend_ratio — verbatim from ptiV5.ts lines 215–222
  let loadSpendRatio = 0;
  let loadSpendScore = 0;
  if (totalLoads > 0 && totalSpend > 0) {
    loadSpendRatio = totalLoads / totalSpend;
    if      (loadSpendRatio >= 1.0) loadSpendScore = 4;
    else if (loadSpendRatio >= 0.7) loadSpendScore = 2;
    else if (loadSpendRatio >= 0.4) loadSpendScore = 1;
  }
  void loadSpendRatio; // used only for the step calculation above

  // 2b. buffer_retention — verbatim from ptiV5.ts lines 254–264
  let bufferRetentionScore = 0;
  if (totalLoads > 0) {
    const ratio = Math.max(0, Math.min(1, currentBalance / totalLoads));
    if      (ratio >= 0.30) bufferRetentionScore = 3;
    else if (ratio >= 0.15) bufferRetentionScore = 2;
    else if (ratio >= 0.05) bufferRetentionScore = 1;
  } else if (currentBalance > 0) {
    bufferRetentionScore = 3;
  }

  const rawPoints = loadSpendScore + bufferRetentionScore;

  return {
    status:           "COMPUTED",
    normalized_score: normalize(rawPoints, CFR_V2_RAW_MAX),
    raw_points:       rawPoints,
    raw_max:          CFR_V2_RAW_MAX,
    components: {
      load_spend_ratio: { score: loadSpendScore,       max: 4 },
      buffer_retention: { score: bufferRetentionScore, max: 3 },
    },
  };
}

/**
 * Compute Behavioral Stability dimension for the shadow profile.
 *
 * Sub-components (verbatim from ptiV5.ts):
 *   • session_cadence           — max 2 pts
 *   • routine_score             — max 2 pts
 *   • wallet_load_rhythm        — max 4 pts
 *   • payment_amount_volatility — max 7 pts  [moved from v5 cashflow_stability]
 *   Raw ceiling: BS_V2_RAW_MAX = 15
 *
 * EXPLICITLY EXCLUDED (see module header for rationale):
 *   game_engagement, paula_interaction_depth, push_notification_engagement,
 *   financial_curiosity_index, paula_response_latency — all measure engagement
 *   with app features / Paula coaching product, not genuine financial behavior.
 *
 * INSUFFICIENT_DATA when loginDays30 < 1 AND loadCount30 < 3 AND payCount < 2.
 * (Brand-new account with zero app activity — all sub-scores would be zero due to
 * insufficient input data, not due to negative behavior.)
 */
export function computeShadowBehavioralStability(
  snap: PTIDataSnapshot,
): ShadowDimensionResult {
  const { loginDays30, hourStd, domStddev, loadCount30, loadDayStd,
          amountCV, payCount } = snap;

  // INSUFFICIENT_DATA guard
  if (loginDays30 < 1 && loadCount30 < 3 && payCount < 2) {
    return {
      status:           "INSUFFICIENT_DATA",
      normalized_score: null,
      raw_points:       null,
      raw_max:          BS_V2_RAW_MAX,
      components: {
        session_cadence:            { score: 0, max: 2 },
        routine_score:              { score: 0, max: 2 },
        wallet_load_rhythm:         { score: 0, max: 4 },
        payment_amount_volatility:  { score: 0, max: 7 },
      },
    };
  }

  // 3a. session_cadence — verbatim from ptiV5.ts lines 114–117
  let sessionCadenceScore = 0;
  if      (loginDays30 >= 20) sessionCadenceScore = 2;
  else if (loginDays30 >= 12) sessionCadenceScore = 1;
  else if (loginDays30 >= 4)  sessionCadenceScore = 1;

  // 3b. routine_score — verbatim from ptiV5.ts lines 119–126
  let routineScore = 0;
  {
    const hourNorm  = Math.max(0, 1 - hourStd  / 12);
    const domNorm   = Math.max(0, 1 - domStddev / 15);
    const routineRaw = (hourNorm + domNorm) / 2;
    if      (routineRaw >= 0.70) routineScore = 2;
    else if (routineRaw >= 0.30) routineScore = 1;
  }

  // 3c. wallet_load_rhythm — verbatim from ptiV5.ts lines 134–139
  let loadRhythmScore = 0;
  if (loadCount30 >= 3) {
    if      (loadDayStd <= 3) loadRhythmScore = 4;
    else if (loadDayStd <= 7) loadRhythmScore = 1;
  }

  // 3d. payment_amount_volatility — verbatim from ptiV5.ts lines 225–230
  //     (moved from v5 cashflow_stability — behavioral consistency signal)
  let volatilityScore = 0;
  if (payCount >= 2) {
    if      (amountCV <= 0.10) volatilityScore = 7;
    else if (amountCV <= 0.25) volatilityScore = 2;
    else if (amountCV <= 0.50) volatilityScore = 1;
  }

  const rawPoints = sessionCadenceScore + routineScore + loadRhythmScore + volatilityScore;

  return {
    status:           "COMPUTED",
    normalized_score: normalize(rawPoints, BS_V2_RAW_MAX),
    raw_points:       rawPoints,
    raw_max:          BS_V2_RAW_MAX,
    components: {
      session_cadence:           { score: sessionCadenceScore, max: 2 },
      routine_score:             { score: routineScore,        max: 2 },
      wallet_load_rhythm:        { score: loadRhythmScore,     max: 4 },
      payment_amount_volatility: { score: volatilityScore,     max: 7 },
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 6 — AGGREGATE COMPUTATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Compute the shadow aggregate score from three dimension results.
 *
 * Rules:
 *   All 3 COMPUTED → weighted sum using declared priors.
 *   Exactly 1 INSUFFICIENT_DATA → proportionally redistribute surviving weights.
 *   2 or 3 INSUFFICIENT_DATA → INSUFFICIENT_DATA aggregate (null score).
 *
 * The weights are PRE-VALIDATION PRIORS only — not empirically calibrated.
 */
export function computeShadowAggregate(
  pr:  ShadowDimensionResult,
  cfr: ShadowDimensionResult,
  bs:  ShadowDimensionResult,
): ShadowAggregateResult {
  const prComputed  = pr.status  === "COMPUTED" && pr.normalized_score  !== null;
  const cfrComputed = cfr.status === "COMPUTED" && cfr.normalized_score !== null;
  const bsComputed  = bs.status  === "COMPUTED" && bs.normalized_score  !== null;

  const computedCount = [prComputed, cfrComputed, bsComputed].filter(Boolean).length;
  const excluded: string[] = [];
  if (!prComputed)  excluded.push("payment_reliability");
  if (!cfrComputed) excluded.push("cash_flow_resilience");
  if (!bsComputed)  excluded.push("behavioral_stability");

  // 0 or 1 available dimension — never produce a single-dimension aggregate.
  if (computedCount < 2) {
    return {
      status:             "INSUFFICIENT_DATA",
      score:              null,
      weights_applied:    null,
      excluded_dimensions: excluded,
    };
  }

  // All 3 available — use declared priors verbatim.
  if (computedCount === 3) {
    const score = Math.round(
      (pr.normalized_score! * SHADOW_WEIGHT_PAYMENT_RELIABILITY
       + cfr.normalized_score! * SHADOW_WEIGHT_CASH_FLOW_RESILIENCE
       + bs.normalized_score!  * SHADOW_WEIGHT_BEHAVIORAL_STABILITY)
      * 10,
    ) / 10;
    return {
      status: "COMPUTED",
      score,
      weights_applied: {
        payment_reliability:  SHADOW_WEIGHT_PAYMENT_RELIABILITY,
        cash_flow_resilience: SHADOW_WEIGHT_CASH_FLOW_RESILIENCE,
        behavioral_stability: SHADOW_WEIGHT_BEHAVIORAL_STABILITY,
      },
      excluded_dimensions: [],
    };
  }

  // Exactly 2 available — redistribute proportionally.
  // Identify the two surviving dimensions and their base weights.
  type DimKey = "payment_reliability" | "cash_flow_resilience" | "behavioral_stability";
  const survivors: Array<{ key: DimKey; score: number; baseWeight: number }> = [];
  if (prComputed)  survivors.push({ key: "payment_reliability",  score: pr.normalized_score!,  baseWeight: SHADOW_WEIGHT_PAYMENT_RELIABILITY });
  if (cfrComputed) survivors.push({ key: "cash_flow_resilience", score: cfr.normalized_score!, baseWeight: SHADOW_WEIGHT_CASH_FLOW_RESILIENCE });
  if (bsComputed)  survivors.push({ key: "behavioral_stability", score: bs.normalized_score!,  baseWeight: SHADOW_WEIGHT_BEHAVIORAL_STABILITY });

  const totalBase = survivors.reduce((s, d) => s + d.baseWeight, 0);
  const finalWeights: Record<DimKey, number> = {
    payment_reliability:  0,
    cash_flow_resilience: 0,
    behavioral_stability: 0,
  };
  let score = 0;
  for (const d of survivors) {
    const w = d.baseWeight / totalBase;
    finalWeights[d.key] = Math.round(w * 10000) / 10000; // 4-decimal precision
    score += d.score * w;
  }
  score = Math.round(score * 10) / 10;

  return {
    status: "COMPUTED",
    score,
    weights_applied: finalWeights,
    excluded_dimensions: excluded,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 7 — TOP-LEVEL PURE ORCHESTRATOR
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Compute the complete shadow behavioral profile from a PTIDataSnapshot.
 *
 * This is a PURE function — it has no side effects, makes no DB calls, writes to
 * no table, and produces the same output for the same inputs every time.
 *
 * @param snapshot      The same PTIDataSnapshot used by computePTIv5 and buildPTIv2Profile.
 *                      This function reads the snapshot fields it needs and ignores the rest.
 *                      KYC fields (kycVerified, kycTier) and bancarization fields
 *                      (daysToFirstSpei, speiLoadCount, oxxoLoadCount, cardLoadCount) are
 *                      intentionally ignored — they have no effect on the shadow score.
 * @param referenceTime Optional timestamp used only for the computed_at field.
 *                      Defaults to new Date() at the call site when omitted.
 *                      Pass an explicit Date in tests for fully deterministic output.
 */
export function computeShadowBehavioralProfile(
  snapshot:      PTIDataSnapshot,
  referenceTime: Date = new Date(),
): ShadowBehavioralProfile {
  const pr  = computeShadowPaymentReliability(snapshot);
  const cfr = computeShadowCashFlowResilience(snapshot);
  const bs  = computeShadowBehavioralStability(snapshot);
  const aggregate = computeShadowAggregate(pr, cfr, bs);

  return {
    model_id:          PTI_V2_SHADOW_MODEL_ID,
    validation_status: PTI_V2_SHADOW_VALIDATION_STATUS,
    deployment_status: PTI_V2_SHADOW_DEPLOYMENT_STATUS,
    computed_at:       referenceTime.toISOString(),
    dimensions: {
      payment_reliability:  pr,
      cash_flow_resilience: cfr,
      behavioral_stability: bs,
    },
    aggregate,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 8 — ASYNC DB ADAPTER (read-only)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Async wrapper: fetches the PTIDataSnapshot for a user and computes the shadow
 * behavioral profile. Purely read-only — no writes to any table.
 *
 * @param telefono      User identifier (phone number).
 * @param options.referenceTime  Optional fixed timestamp for computed_at and determinism.
 */
export async function buildShadowBehavioralProfile(
  telefono:  string,
  options?: { referenceTime?: Date },
): Promise<ShadowBehavioralProfile> {
  const referenceTime = options?.referenceTime ?? new Date();
  const { buildPTISnapshotFromDb } = await import("./pti.js");
  const snapshot = await buildPTISnapshotFromDb(telefono);
  return computeShadowBehavioralProfile(snapshot, referenceTime);
}
