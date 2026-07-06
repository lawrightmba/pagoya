/**
 * PTI v4.3 Weight Allocation Decision — Prompt 4 (Signal Expansion)
 * ============================================================================
 * RELEASE DECISION, not a placeholder. Ships all 15 fields added in Stage 1
 * ("v4.3" block) and Stage 2 ("Prompt2Stage2Features" block) of
 * PTIDataSnapshot at ZERO scoring weight. Dimension totals are UNCHANGED from
 * v4.2 (PR 30 / BC 20 / ED 25 / CF 25) — v4.3 is a strictly additive,
 * scoring-identical release, proven by the byte-identical regression guards
 * in pti.test.ts ("v4.3 derived-features isolation guard").
 *
 * WHY ZERO WEIGHT, NOT PARTIAL WEIGHT
 * ------------------------------------
 * The ablation/proxy-correlation study (ptiNewFieldStudy.ts; n=8,000
 * synthetic, seed 0xc0ffee) found that coverage, not signal quality, is the
 * binding constraint: production had 13 users, 0 bill_payments rows, 0
 * user_billers rows at study time. Every positive ablation delta in that
 * study is a function of a synthesis assumption written into the generator
 * — the study can validly rule fields OUT (redundancy with an existing
 * scored field, or proxy-load with negative/negligible lift, are structural
 * properties independent of real data) but cannot validly rule any field IN,
 * because doing so would mean trusting a number that is, by the study's own
 * documentation, measuring the modeler's assumption back at itself.
 *
 * Assigning nonzero weight to any of these 15 fields today would mean
 * setting real scoring weight from data everyone involved already knows is
 * circular. The correct release posture: ship the fields (built, tested,
 * wired — Stage 1/2 work stands), keep them at zero weight, and let the MFI
 * backtest be the thing that actually promotes any of them to real weight.
 *
 * DISPOSITION: two classes, both zero weight in v4.3
 * ---------------------------------------------------
 * - "permanent_non_scoring": ruled out on STRUCTURAL grounds (redundancy
 *   with an already-scored field, or a proxy-load pattern with
 *   negative/negligible lift) that do NOT depend on further data volume.
 *   These earn weight only via a fundamentally different construction, not
 *   via more data.
 * - "provisional_zero_weight": no structural disqualifier found, but the
 *   study's own circularity limits (relHat both generates the field's
 *   synthetic value AND defines the risk cohort) mean its positive delta
 *   cannot be trusted as real lift. Zero weight pending the MFI backtest
 *   (real loan outcomes), not pending more synthetic study.
 *
 * See ptiNewFieldStudy.ts for the underlying study and
 * .agents/memory/pti-newfield-study.md for the durable summary.
 */

export type PtiV4_3DispositionStatus = "permanent_non_scoring" | "provisional_zero_weight";

export interface PtiV4_3FieldDisposition {
  dimension: "Payment Reliability" | "Behavioral Consistency" | "Cash-Flow Stability";
  status: PtiV4_3DispositionStatus;
  rationale: string;
}

export const PTI_V4_3_FIELD_DISPOSITION: Record<string, PtiV4_3FieldDisposition> = {
  minBalanceBuffer30d: {
    dimension: "Cash-Flow Stability",
    status: "permanent_non_scoring",
    rationale:
      "r=0.88 with already-scored currentBalance — pure redundancy. Δd=-0.008 (negative separation). No future version of this field earns weight without a fundamentally different construction.",
  },
  activityVelocity30d: {
    dimension: "Behavioral Consistency",
    status: "permanent_non_scoring",
    rationale:
      "Δd=-0.009 even under favorable synthesis; the construction (an undirected derivative) has no directional prior to separate on. Not a coverage problem — a design problem.",
  },
  daysAtZeroPerMonth: {
    dimension: "Cash-Flow Stability",
    status: "permanent_non_scoring",
    rationale:
      "Δd=-0.003, and the strongest negative SES gradient among non-shock fields (r(_ses)=-0.38, deviceScore -0.34). Penalizes thin margins, not unreliability — the exact proxy pattern the original disparate-impact study exists to catch.",
  },
  billShockWalletResponseRate: {
    dimension: "Payment Reliability",
    status: "permanent_non_scoring",
    rationale:
      "Highest direct SES correlation in the entire set (r=0.49, deviceScore 0.38) paired with essentially zero lift (Δd=+0.002) and a worsened four-fifths ratio (0.043, below the 0.045 baseline). Close to a pure income detector.",
  },
  loadAmountCV: {
    dimension: "Cash-Flow Stability",
    status: "permanent_non_scoring",
    rationale: "Δd=+0.001. Whatever it measures is already captured by the existing scored amountCV.",
  },
  paymentTimingMeanDaysFromDue: {
    dimension: "Payment Reliability",
    status: "provisional_zero_weight",
    rationale:
      "STRONG-confidence synthesis, best-behaved of the Stage 1 fields, but -0.76/-0.54 correlation with already-scored advanceDays/selfRatio means its real incremental content is unknown until real data separates them. Candidate as a refinement of an existing signal, not a new one.",
  },
  paymentTimingVarianceDaysFromDue: {
    dimension: "Payment Reliability",
    status: "provisional_zero_weight",
    rationale:
      "Same caveat as paymentTimingMeanDaysFromDue (0.71 correlation with domStddev). Keep paired with the mean feature in any future backtest evaluation — likely redundant with each other, not just with existing fields.",
  },
  interEventRegularityScore: {
    dimension: "Behavioral Consistency",
    status: "provisional_zero_weight",
    rationale:
      "MODERATE assumption confidence, tolerable proxy profile (r(_ses)=0.18), but only 12-37% coverage even synthetically and ~15% in the small real sample. Needs real volume before its lift claim means anything.",
  },
  preDueStagingIndex: {
    dimension: "Cash-Flow Stability",
    status: "provisional_zero_weight",
    rationale:
      "Best Δd-per-proxy-risk profile in the set (+0.051, monotonic), but 0% real coverage today (zero user_billers rows) and the delta is a circularity-inflated upper bound by the study's own admission. Highest-priority field to re-evaluate once user_billers has real volume.",
  },
  loadToObligationRatio: {
    dimension: "Cash-Flow Stability",
    status: "provisional_zero_weight",
    rationale:
      "WEAK-confidence synthesis assumption (the study's own words: \"no behavioral data behind it\"), r(_ses)=0.31, and its lift is explicitly attributed to the SES term written into its own synthesis. Keep in the registry, but treat any future backtest result on this field with extra skepticism given how thin its prior is.",
  },
  drawdownVelocity: {
    dimension: "Cash-Flow Stability",
    status: "provisional_zero_weight",
    rationale:
      "Second-best profile in the set (+0.029, monotonic), MODERATE confidence, but 0% real coverage (0 users with >=1 load in trailing 30d in the current tiny sample).",
  },
  loadIntervalEntropy: {
    dimension: "Behavioral Consistency",
    status: "provisional_zero_weight",
    rationale: "Small positive lift, tolerable proxy profile, low coverage (36.6% synthetic, 0% real: 0 users with >=3 loads/30d).",
  },
  sequencingStability: {
    dimension: "Payment Reliability",
    status: "provisional_zero_weight",
    rationale:
      "WEAK confidence (\"no data behind it\" per the study), lowest synthetic coverage of the set (12.6%), stable across cohorts at least. Needs real scarcity events to mean anything — none exist yet.",
  },
  shockPaidFullRate: {
    dimension: "Payment Reliability",
    status: "provisional_zero_weight",
    rationale: "MODERATE confidence, small positive lift, but sign-flips across cohorts (not stable) and low real coverage.",
  },
  billShockResponse: {
    dimension: "Payment Reliability",
    status: "provisional_zero_weight",
    rationale:
      "MODERATE confidence, monotonicity failure (reversal at decile 2) and sign-flips across cohorts. Categorical construction makes it the hardest of the 15 to validate cleanly even once real data exists — worth revisiting whether an ordinal/rate construction (closer to shockPaidFullRate) is more tractable than the 4-category classification.",
  },
};

/** Point allocation for v4.3: all 15 fields = 0, every dimension total unchanged from v4.2. */
export const PTI_V4_3_POINT_ALLOCATION = {
  payment_reliability_max: 30,
  behavioral_consistency_max: 20,
  engagement_depth_max: 25,
  cashflow_stability_max: 25,
  new_field_points: 0,
} as const;

/**
 * Fair-lending signoff language for the v4.3 release. Supersedes the generic
 * "approved against synthetic distributions; pending re-validation against
 * the MFI backtest dataset" caveat used for partially-weighted releases,
 * since v4.3 assigns zero weight to every new field.
 */
export const PTI_V4_3_FAIR_LENDING_SIGNOFF = `v4.3 fair-lending signoff: APPROVED, zero-weight release. All 15 new fields are present in the schema and computed from real data where production volume allows, but contribute zero points to any score in this version — v4.3 is scoring-identical to v4.2 by design (proven by the existing byte-identical regression test). Of the 15, five (minBalanceBuffer30d, activityVelocity30d, daysAtZeroPerMonth, billShockWalletResponseRate, loadAmountCV) are reclassified as permanent non-scoring pending a fundamentally different construction, based on structural findings (redundancy with existing scored fields, or proxy-load with negative/negligible lift) that do not depend on further data volume. The remaining ten are provisional-zero, pending real-loan-level validation via the MFI backtest; none should be assigned nonzero weight based on the current synthetic ablation study alone, as that study's own methodology cannot distinguish genuine predictive lift from the modeler's synthesis assumptions given near-zero current production coverage (13 users, 0 bill_payments, 0 user_billers). This signoff does not need to be revisited for a future version that assigns real weight to any of the ten provisional fields using real backtest data — that would be a new signoff cycle, evaluated against actual loan outcomes rather than synthetic distributions.`;

/** MFI backtest data-spec priority: highest-value targets, per the natural follow-on from this decision. */
export const PTI_V4_3_BACKTEST_PRIORITY_FIELDS = [
  "preDueStagingIndex",
  "loadToObligationRatio",
  "drawdownVelocity",
] as const;
