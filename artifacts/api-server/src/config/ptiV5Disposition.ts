/**
 * PTI v5.0 Shadow Demotion Registry — Phase B2
 * ============================================================================
 * Per signed phase3-implementation-spec.md §3.1: kyc_verified, device_consistency,
 * wallet_balance, bancarization_speed, and funding_channel_mix are demoted to
 * ZERO scoring weight in v5.0.0-rc1, reusing the same registry semantics as
 * `ptiV4_3Disposition.ts` (fields remain computed and logged for audit/shadow
 * purposes, but contribute 0 points to the total).
 *
 * kyc_verified is a special case: the SCORE is demoted to zero, but the
 * underlying KYC-verified GATE CRITERION is unchanged and unaffected — see
 * readinessGate.ts, which reads kyc_verified directly from `users`, not from
 * the PTI breakdown. Demoting the scoring contribution does not touch the
 * gate.
 */

export type PtiV5DispositionStatus = "shadow_demoted";

export interface PtiV5FieldDisposition {
  dimension: "Engagement Depth" | "Cash-Flow Stability";
  status: PtiV5DispositionStatus;
  formerMaxPoints: number;
  rationale: string;
}

export const PTI_V5_FIELD_DISPOSITION: Record<string, PtiV5FieldDisposition> = {
  kyc_verified: {
    dimension: "Engagement Depth",
    status: "shadow_demoted",
    formerMaxPoints: 10,
    rationale:
      "Per signed spec §3.1: removed from scoring entirely in v5.0. The gate criterion (readinessGate.ts) retains the full KYC requirement independently of this score demotion — verification status is still computed and persisted, just no longer contributes points.",
  },
  device_consistency: {
    dimension: "Engagement Depth",
    status: "shadow_demoted",
    formerMaxPoints: 3,
    rationale:
      "Per signed spec §3.1: demoted to shadow using v4.3 disposition machinery. Still computed from real deviceScore data and logged for the MFI backtest, contributes 0 points in v5.0.",
  },
  wallet_balance: {
    dimension: "Cash-Flow Stability",
    status: "shadow_demoted",
    formerMaxPoints: 6,
    rationale:
      "Per signed spec §3.1: demoted to shadow. Absolute balance size is a closer income proxy than the rail-agnostic/relative signals v5.0 prioritizes (buffer_retention, payment_amount_volatility).",
  },
  bancarization_speed: {
    dimension: "Cash-Flow Stability",
    status: "shadow_demoted",
    formerMaxPoints: 3,
    rationale:
      "Per signed spec §3.1: demoted to shadow alongside funding_channel_mix — both are rail-identity signals, superseded in v5.0 by the rail-agnostic wallet_load_rhythm expansion in Behavioral Consistency.",
  },
  funding_channel_mix: {
    dimension: "Cash-Flow Stability",
    status: "shadow_demoted",
    formerMaxPoints: 2,
    rationale:
      "Per signed spec §3.1: demoted to shadow (rail-identity scoring replaced by wallet_load_rhythm's rail-agnostic regularity signal). Still computed and logged.",
  },
};

/** Point allocation for v5.0.0-rc1: PR 36 / BC 22 / ED 22 / CF 20, per signed spec §3.1. */
export const PTI_V5_POINT_ALLOCATION = {
  payment_reliability_max: 36,
  behavioral_consistency_max: 22,
  engagement_depth_max: 22,
  cashflow_stability_max: 20,
} as const;
