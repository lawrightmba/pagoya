/**
 * PTI v2 Behavioral Profile Adapter + Evidence Depth v1 + Behavioral Trajectory v1
 * ============================================================================
 * ADDITIVE OUTPUT LAYER — does not modify, recompute, or replace any existing
 * v5.0 scoring logic. This file reads already-persisted v5 state and re-presents
 * it in the v2 vocabulary, and separately computes Evidence Depth v1 and
 * Behavioral Trajectory v1.
 *
 * ── What this file does ──────────────────────────────────────────────────────
 *   - Re-labels three of the four v5 dimensions for external presentation
 *   - Surfaces the lineage-safe aggregate trajectory data as a first-class structure
 *   - Computes Evidence Depth v1 (how much reliable behavioral observation
 *     data exists to support an assessment — completely separate from how
 *     good the behavior is)
 *   - Computes Behavioral Trajectory v1 (how each individual dimension has been
 *     observed to change over time, using only real same-model pti_score_history
 *     data — never predicts, never claims significance beyond what the data shows)
 *
 * ── What this file explicitly does NOT do ────────────────────────────────────
 *   - Invoke any compute function (computePTIv5, computePTIv3Signals, etc.)
 *   - Write to any table or database column
 *   - Change PTIBreakdown keys, weights, or score values
 *   - Influence the behavioral score in any way
 *   - Influence the licensee API, readinessGate, or Paula trigger logic
 *
 * ── Behavioral Trajectory v1 — data source ───────────────────────────────────
 *   Source: pti_score_history.breakdown (JSONB), which contains the full per-
 *   dimension score breakdown and model_version for every row in both dev and prod.
 *   This table is used INSTEAD of pti_trend_snapshots because the model_version
 *   column was never migrated to production (pti_trend_snapshots has zero usable
 *   same-model rows there; a separate production fix is tracked independently).
 *
 *   ISOLATION: Evidence Depth and Behavioral Trajectory are completely independent
 *   of each other. Evidence Depth is never read, referenced, or used inside the
 *   trajectory calculation. Trajectory is never softened or strengthened by
 *   Evidence Depth values. Each has its own status/observation_count fields that
 *   naturally reflect thin data without cross-referencing the other.
 *
 * ── Evidence Depth v1 — inputs used ─────────────────────────────────────────
 *   INCLUDED (server/provider-verified only):
 *     • bill_payments rows with confirmed status
 *     • wallet_transactions rows with confirmed status AND type in the
 *       load/transfer allowlist (see ED_WALLET_TX_TYPES)
 *     • users.consecutive_payment_months, users.active_months,
 *       users.longest_gap_days (for Continuity component)
 *
 *   EXPLICITLY EXCLUDED — Evidence Depth must never incorporate:
 *     • Login events, clicks, or any client-reported telemetry
 *     • KYC status or tier
 *     • Device consistency or device tenure
 *     • Bancarization speed or STP CLABE presence
 *     • Funding channel mix
 *     • Wallet balance
 *     • Account creation date alone (only verified event timestamps are used)
 *     • Any inference from absence of activity ("silence is not negative evidence")
 *
 * ── CONTRACT CHANGE NOTE (Sprint 3) ─────────────────────────────────────────
 *   PTIv2Profile.trajectory changed from TrajectoryObservation (flat shape) to
 *   PTIv2Trajectory (nested). Code reading profile.trajectory.direction must
 *   update to profile.trajectory.aggregate.direction. The JSON output shape is
 *   additive — the aggregate sub-object is the previously-existing data.
 *
 * ── Naming conventions ───────────────────────────────────────────────────────
 *   Entity-neutral identifiers (entity_id, entity_type, domain, trajectory,
 *   evidence_depth) are used in all new types. For this sprint, entity_type
 *   is always "human" and domain is always "financial".
 */

import { sql } from "drizzle-orm";
import type { PTIBreakdown, PTIDimension } from "./pti.js";

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1 — DIMENSION MAPPING LAYER (unchanged from v2 initial sprint)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Maps internal v5 PTIBreakdown keys to their v2 external-facing keys and
 * display labels. internal_key is always the verbatim PTIBreakdown property name.
 *
 * Rules that must hold forever:
 *   1. internal_key must exactly match a PTIBreakdown property name.
 *   2. No score, max, or component value may change during mapping.
 *   3. Changing an existing v2_key is a breaking change and requires a version bump.
 */
export const DIMENSION_V2_MAP = {
  payment_reliability: {
    v2_key:       "payment_reliability",
    internal_key: "payment_reliability",
    v2_label:     "Payment Reliability",
  },
  cashflow_stability: {
    v2_key:       "cash_flow_resilience",
    internal_key: "cashflow_stability",
    v2_label:     "Cash Flow Resilience",
  },
  behavioral_consistency: {
    v2_key:       "behavioral_stability",
    internal_key: "behavioral_consistency",
    v2_label:     "Behavioral Stability",
  },
  engagement_depth: {
    v2_key:       "engagement_depth",
    internal_key: "engagement_depth",
    v2_label:     "Engagement Depth",
  },
} as const;

/**
 * engagement_depth component categorization for future architecture decisions.
 * NO scoring contribution changes are implied or intended.
 *
 * GENUINE BEHAVIOR: biller_diversity, spend_category_mix
 * EVIDENCE DEPTH CANDIDATES: signup_utilization_speed (one-time activation
 *   onset indicator), device_consistency (0 pts / shadow-demoted; measures
 *   observation quality, not behavioral choice)
 * AMBIGUOUS — needs further validation: kyc_verified (simultaneously a
 *   compliance gate, a user intent signal, and a platform-infrastructure
 *   constraint; 0 pts / shadow-demoted)
 */

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2 — EVIDENCE DEPTH V1 CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

/** Canonical version string for Evidence Depth v1. */
export const EVIDENCE_DEPTH_VERSION = "evidence-depth-v1.0-deterministic";

/** Minimum observed span (days) required to compute Evidence Depth.
 *  Below this threshold the methodology returns INSUFFICIENT_DATA, not a
 *  numeric score of 0. A numeric low score means evidence is thin;
 *  INSUFFICIENT_DATA means there is not yet enough evidence to compute at all. */
export const ED_DURATION_MIN_DAYS = 7;

/** Observed span (days) at which the Duration component reaches 100. */
export const ED_DURATION_MAX_DAYS = 120;

/** Event count at which the Density component reaches 100. */
export const ED_DENSITY_MAX_EVENTS = 12;

/**
 * Longest-gap threshold (days) above which the Continuity soft penalty begins.
 * Gaps shorter than this produce no penalty.
 * This penalty ONLY affects Evidence Depth — it never produces a missed-payment
 * event, a behavioral deterioration signal, or a Payment Reliability reduction.
 */
export const ED_GAP_PENALTY_THRESHOLD_DAYS = 45;

/**
 * Maximum Continuity penalty deducted when the longest gap is very large.
 * The penalty scales linearly from 0 at ED_GAP_PENALTY_THRESHOLD_DAYS to this
 * maximum at (ED_GAP_PENALTY_THRESHOLD_DAYS + 90) days and beyond.
 */
export const ED_GAP_MAX_PENALTY_POINTS = 30;

/** Days-since-last-event at or below which Recency scores 100. */
export const ED_RECENCY_FULL_SCORE_DAYS = 7;

/** Days-since-last-event at or above which Recency scores 0. */
export const ED_RECENCY_ZERO_SCORE_DAYS = 90;

/** Upper bound of the LOW band (inclusive). */
export const ED_BAND_LOW_MAX = 33;

/** Upper bound of the MODERATE band (inclusive). HIGH is everything above this. */
export const ED_BAND_MODERATE_MAX = 66;

/**
 * Explicit allowlist of wallet_transactions.type values that count as
 * verified behavioral events in Evidence Depth.
 *
 * INCLUDED: load_card, load_oxxo, spei_in, load_spei (wallet top-up events),
 *   transfer_receive, transfer_send (P2P transfer events — both directions
 *   are system-generated and represent verified platform activity).
 *
 * EXCLUDED by design (not in this list):
 *   - bill_pay: this is the wallet DEBIT created when paying a bill from the
 *     wallet balance. The bill payment is already captured in the bill_payments
 *     table. Including bill_pay here would double-count the same event.
 *   - spei_out: outgoing SPEI transfer (wallet debit), not a deposit event.
 *   - p2p_debit: alternative name for the sender-side P2P debit; transfer_send
 *     covers this from p2p.ts; excluded to avoid double-counting if both exist.
 *   - SIGNUP_BONUS: system-generated credit, not a user behavioral event.
 */
export const ED_WALLET_TX_TYPES = [
  "load_card",
  "load_oxxo",
  "spei_in",
  "load_spei",
  "transfer_receive",
  "transfer_send",
] as const;

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3 — BEHAVIORAL TRAJECTORY V1 CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Canonical version string for Behavioral Trajectory v1.
 * Fully independent from PTI model version strings and Evidence Depth version.
 * Each methodology has its own versioning so they can evolve independently.
 */
export const BEHAVIORAL_TRAJECTORY_VERSION = "behavioral-trajectory-v1.0-deterministic";

/**
 * Normalized delta (on the 0–100 scale) below which a dimension is classified
 * STABLE rather than IMPROVING or DETERIORATING.
 *
 * |delta| < DIM_TRAJ_STABILITY_THRESHOLD_PCT → STABLE
 *
 * IMPORTANT: This value (3.0 points) is a PROVISIONAL GUESS based on the
 * intuition that a 3/100 shift on a normalized scale represents meaningful
 * noise tolerance. It has NOT been empirically validated against cohort data,
 * does NOT reflect a statistically significant threshold, and must not be
 * cited as such. Future calibration against real population distributions
 * should replace this with a data-driven value.
 *
 * "Higher is better" assumption within a single model version:
 * All three tracked dimensions (payment_reliability, behavioral_consistency,
 * cashflow_stability) have monotonically "higher = better" sub-components
 * within v5.0.0-rc1. However, this monotonicity assumption ONLY holds within
 * a single model version — shadow-demoted sub-components (e.g., kyc_verified
 * demoted from 10 pts to 0 in v5) and changed maximums make cross-version
 * raw deltas meaningless. This is exactly why comparisons are same-model-only.
 */
export const DIM_TRAJ_STABILITY_THRESHOLD_PCT = 3.0;

/**
 * Window tolerance for the 30-day comparison: accepts rows within ±10 days
 * of the 30-day target (i.e., any row between 20 and 40 days ago).
 * Chosen because prod users have daily nightly cron rows — a 10-day band
 * reliably finds a row without accepting data that is too old or too recent.
 */
export const DIM_TRAJ_WINDOW_30D_TOLERANCE_DAYS = 10;

/**
 * Window tolerance for the 60-day comparison: ±15 days (45–75 days ago).
 * Wider than the 30d tolerance to account for gaps in the nightly cron run.
 */
export const DIM_TRAJ_WINDOW_60D_TOLERANCE_DAYS = 15;

/**
 * Window tolerance for the 90-day comparison: ±20 days (70–110 days ago).
 * Widest tolerance to maximize the chance of finding a row near this horizon.
 */
export const DIM_TRAJ_WINDOW_90D_TOLERANCE_DAYS = 20;

/**
 * Maximum number of pti_score_history rows fetched per user for trajectory.
 * 100 rows is far more than needed for any realistic window computation and
 * avoids unbounded query sizes.
 */
export const DIM_TRAJ_HISTORY_FETCH_LIMIT = 100;

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4 — TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type EntityType       = "human";
export type Domain           = "financial";
export type ValidationStatus = "PRE_VALIDATION";

export type TrajectoryDirection = "improving" | "stable" | "deteriorating" | "insufficient_data";
export type TrajectoryStatus    = "COMPUTED" | "INSUFFICIENT_DATA";

export type EvidenceBand = "LOW" | "MODERATE" | "HIGH" | "INSUFFICIENT_DATA";

/**
 * COMPUTED     — all five components computed, numeric score available.
 * INSUFFICIENT_DATA — minimum evidence gate not met; score is null.
 *                     "Not enough evidence to compute" — must not be confused
 *                     with a low numeric score ("thin but real evidence exists").
 * NOT_COMPUTED — legacy placeholder status; no longer produced by this file.
 */
export type EvidenceStatus = "COMPUTED" | "INSUFFICIENT_DATA" | "NOT_COMPUTED";

/**
 * Direction of observed behavioral change for a single dimension.
 *
 * UPPERCASE to distinguish from the aggregate TrajectoryDirection values
 * ("improving", "stable", "deteriorating", "insufficient_data" in lowercase).
 *
 * LABELING CONSTRAINT: direction describes *observed behavioral direction*
 * of a dimension's normalized score over recent history. It does NOT predict
 * default probability, creditworthiness, or future financial risk. No causal
 * or predictive claim. Absence of an observation is INSUFFICIENT_DATA, never
 * an assumed decline.
 */
export type DimTrajectoryDirection =
  | "IMPROVING"
  | "STABLE"
  | "DETERIORATING"
  | "INSUFFICIENT_DATA";

/**
 * Alignment of the three per-dimension trajectory directions.
 *
 * ALIGNED_IMPROVING    — all available dimensions are IMPROVING
 * ALIGNED_STABLE       — all available dimensions are STABLE
 * ALIGNED_DETERIORATING — all available dimensions are DETERIORATING
 * MIXED                — available dimensions disagree
 * INSUFFICIENT_DATA    — fewer than 2 dimensions have computable directions
 *
 * STRICTLY DESCRIPTIVE: this signal must not imply prediction, risk scoring,
 * or a recommended action anywhere in output or documentation. It only
 * describes whether observed dimension trends are moving in the same direction.
 */
export type AlignmentSignal =
  | "ALIGNED_IMPROVING"
  | "ALIGNED_STABLE"
  | "ALIGNED_DETERIORATING"
  | "MIXED"
  | "INSUFFICIENT_DATA";

/**
 * A single computed dimension trajectory window.
 * Returned when a same-model prior observation exists for comparison.
 */
export interface DimTrajectoryComputed {
  status: "COMPUTED";
  /** Current dimension score normalized to 0–100 (= rawScore / max * 100). */
  current_value: number;
  /** Prior dimension score normalized to 0–100 using the same model's max. */
  prior_value: number;
  /** current_value − prior_value. Positive means improving, negative means deteriorating. */
  delta: number;
  /** Observed direction based on delta and the stability threshold. */
  direction: DimTrajectoryDirection;
  /**
   * Rate of change in normalized points per 30 days.
   * = delta / (observation_window_days / 30)
   * Zero when observation_window_days is zero (same-day comparison).
   * This is a descriptive rate, not a prediction of future change.
   */
  velocity: number;
  /**
   * Total number of same-model pti_score_history rows available for this user.
   * Reflects the amount of historical evidence backing all window computations.
   */
  observation_count: number;
  /**
   * Actual calendar days between the current observation (referenceTime) and
   * the prior observation used in this window. Computed from real timestamps,
   * not from row counts or assumed cadence.
   */
  observation_window_days: number;
}

/** Returned when a same-model prior observation is not available for comparison. */
export interface DimTrajectoryInsufficient {
  status: "INSUFFICIENT_DATA";
}

export type DimTrajectoryWindow = DimTrajectoryComputed | DimTrajectoryInsufficient;

/**
 * Per-dimension trajectory result for one dimension.
 * Contains the "recent" comparison (most recent prior same-model row) plus
 * best-effort windowed comparisons at 30/60/90 days if data exists near those
 * horizons. Any window without a same-model row within its tolerance band
 * returns INSUFFICIENT_DATA rather than approximated data.
 */
export interface DimTrajectoryResult {
  /** The v2 key for this dimension (e.g. "cash_flow_resilience"). */
  v2_key: string;
  /**
   * Most recent prior same-model observation vs current.
   * This is the primary useful comparison given that prod history depth is
   * currently shallow (~12–14 rows / 13 days for active users as of July 2026).
   */
  recent: DimTrajectoryWindow;
  /**
   * Closest same-model row within ±DIM_TRAJ_WINDOW_30D_TOLERANCE_DAYS of
   * the 30-day horizon. INSUFFICIENT_DATA if no row exists in that band.
   */
  window_30d: DimTrajectoryWindow;
  /**
   * Closest same-model row within ±DIM_TRAJ_WINDOW_60D_TOLERANCE_DAYS of
   * the 60-day horizon. INSUFFICIENT_DATA if no row exists in that band.
   */
  window_60d: DimTrajectoryWindow;
  /**
   * Closest same-model row within ±DIM_TRAJ_WINDOW_90D_TOLERANCE_DAYS of
   * the 90-day horizon. INSUFFICIENT_DATA if no row exists in that band.
   */
  window_90d: DimTrajectoryWindow;
  /** Version string for this trajectory methodology. */
  version: string;
}

/**
 * The three per-dimension trajectory results exposed in the v2 profile.
 *
 * engagement_depth is intentionally excluded from this interface. Reason:
 * ED's point scale and sub-component composition changed between model versions
 * (KYC was worth 10 pts in v4, shadow-demoted to 0 in v5; biller diversity max
 * changed from 6 to 11). While same-model filtering makes within-version deltas
 * structurally correct, exposing ED trajectory as a public v2 concept would
 * require explicit dimensional analysis and changelog documentation to avoid
 * misinterpretation. It is computed internally (marked with a void to prevent
 * unused-variable errors) but not returned here. A future sprint can add it
 * explicitly once that analysis is done.
 */
export interface PTIv2DimensionTrajectories {
  payment_reliability:  DimTrajectoryResult;
  cash_flow_resilience: DimTrajectoryResult;  // internal: cashflow_stability
  behavioral_stability: DimTrajectoryResult;  // internal: behavioral_consistency
}

/**
 * The full trajectory section of the v2 profile.
 * Extends the previous flat TrajectoryObservation shape additively.
 *
 * - aggregate: the existing lineage-safe aggregate trajectory (UNCHANGED semantics).
 *              Answers: "how has the overall PTI score moved?"
 * - dimensions: new per-dimension trajectories computed from pti_score_history.
 *              Answers: "how has each individual behavioral dimension moved?"
 * - alignment:  single signal describing whether the three dimensions agree.
 *              Purely descriptive. No prediction, no risk score, no recommendation.
 *
 * BACKWARD COMPATIBILITY: code reading profile.trajectory.direction must be
 * updated to profile.trajectory.aggregate.direction.
 */
export interface PTIv2Trajectory {
  aggregate:  TrajectoryObservation;
  dimensions: PTIv2DimensionTrajectories;
  alignment:  AlignmentSignal;
}

/**
 * Raw inputs consumed by the pure Evidence Depth computation function.
 * All fields are derived from server-verified data only (bill_payments and
 * wallet_transactions). No client-reported, KYC, device, or banking fields.
 */
export interface EvidenceDepthRawInputs {
  /** Earliest confirmed bill payment timestamp, or null if none. */
  firstBillPaymentAt:      Date | null;
  /** Latest confirmed bill payment timestamp, or null if none. */
  lastBillPaymentAt:       Date | null;
  /** Count of confirmed bill payments (status in confirmed set). */
  billPaymentCount:        number;
  /** COUNT(DISTINCT service_id) from confirmed bill_payments. */
  distinctBillers:         number;
  /** COUNT(DISTINCT categoria) from confirmed bill_payments. Informational only. */
  distinctCategories:      number;
  /** Earliest confirmed wallet load/transfer timestamp, or null if none. */
  firstWalletTxAt:         Date | null;
  /** Latest confirmed wallet load/transfer timestamp, or null if none. */
  lastWalletTxAt:          Date | null;
  /** Count of confirmed wallet transactions in the allowlist (no bill_pay debits). */
  walletTxCount:           number;
  /** From users.consecutive_payment_months (written nightly by computePTIv3Signals). */
  consecutivePaymentMonths: number;
  /** From users.active_months (written nightly by computePTIv3Signals). */
  activeMonths:            number;
  /** From users.longest_gap_days (written nightly by computePTIv3Signals). */
  longestGapDays:          number;
}

/**
 * A single pti_score_history row as consumed by the behavioral trajectory
 * pure function. Populated from the breakdown JSONB column.
 *
 * All dimension score/max fields are optional because:
 *  (a) older history rows from v4.x models use different keys/scales, and
 *  (b) same-model filtering ensures we only compare rows where these are present,
 *      but defensive typing prevents runtime errors if a field is missing.
 */
export interface ScoreHistoryRow {
  recordedAt: Date;
  breakdown: {
    model_version?:          string | null;
    payment_reliability?:    { score: number; max: number } | null;
    behavioral_consistency?: { score: number; max: number } | null;
    /** Internal use only — not exposed in public v2 trajectory output. */
    engagement_depth?:       { score: number; max: number } | null;
    cashflow_stability?:     { score: number; max: number } | null;
  };
}

/** A single behavioral dimension in the v2 output. */
export interface V2DimensionEntry {
  v2_key:       string;
  internal_key: string;
  v2_label:     string;
  score:        number;
  max:          number;
  components:   Record<string, { score: number; max: number; value: number }>;
}

/**
 * Observed behavioral direction from the lineage-safe aggregate trajectory layer.
 *
 * LABELING CONSTRAINT: direction describes *observed behavioral direction*
 * of the PTI score over recent history. It does NOT predict default probability,
 * creditworthiness, or future financial risk. No causal or predictive claim.
 */
export interface TrajectoryObservation {
  direction:                 TrajectoryDirection;
  velocity:                  number | null;
  observation_model_version: string | null;
  status:                    TrajectoryStatus;
}

/**
 * Evidence Depth — how much reliable behavioral observation data exists to
 * support the behavioral assessment. Completely orthogonal to behavioral score:
 *
 *   - Evidence Depth must NEVER be added to, multiplied against, or otherwise
 *     influence behavioral_profile.score in any code path.
 *   - A HIGH Evidence Depth does not mean good behavior.
 *   - A LOW Evidence Depth does not mean bad behavior.
 *   - INSUFFICIENT_DATA means there is not yet enough evidence to compute,
 *     not that evidence is negative.
 *
 * When status = "INSUFFICIENT_DATA": score is null, all component fields null.
 * When status = "COMPUTED":          score is 1–100, band is LOW/MODERATE/HIGH.
 */
export interface EvidenceDepth {
  /** Numeric score 1–100 when COMPUTED, null when INSUFFICIENT_DATA. */
  score:            number | null;
  /** LOW/MODERATE/HIGH when COMPUTED, INSUFFICIENT_DATA when status is INSUFFICIENT_DATA. */
  band:             EvidenceBand;
  /** Days between first and last verified behavioral event. Null when INSUFFICIENT_DATA. */
  observation_days: number | null;
  /** Total count of verified behavioral events. Null when INSUFFICIENT_DATA. */
  event_count:      number | null;
  /** Count of distinct obligation categories from bill payments. Null when INSUFFICIENT_DATA. */
  domain_count:     number | null;
  /** Rounded Continuity component score (0–100). Null when INSUFFICIENT_DATA. */
  continuity:       number | null;
  /** Rounded Recency component score (0–100). Null when INSUFFICIENT_DATA. */
  recency:          number | null;
  status:           EvidenceStatus;
  version:          string;
}

/** The four behavioral dimensions in the v2 vocabulary. */
export interface PTIv2Dimensions {
  payment_reliability:  V2DimensionEntry;
  cash_flow_resilience: V2DimensionEntry;   // internal: cashflow_stability
  behavioral_stability: V2DimensionEntry;   // internal: behavioral_consistency
  engagement_depth:     V2DimensionEntry;
}

/**
 * PTI v2 Behavioral Profile — the canonical v2 output structure.
 *
 * Invariants:
 *   - entity_type is always "human", domain is always "financial".
 *   - behavioral_profile.validation_status is always "PRE_VALIDATION".
 *     DO NOT change to language implying probability of default, creditworthiness,
 *     a validated lending recommendation, or calibrated financial risk probability.
 *   - evidence_depth is computed on read and has zero influence on behavioral score.
 *   - trajectory.aggregate describes observed score direction only; no predictive claim.
 *   - trajectory.dimensions describes observed per-dimension direction only; no prediction.
 *   - Evidence Depth and trajectory are completely independent — Evidence Depth
 *     values never influence trajectory results and vice versa.
 */
export interface PTIv2Profile {
  entity: {
    entity_id:   string;
    entity_type: "human";
  };
  domain: "financial";
  behavioral_profile: {
    score:             number;
    model_version:     string;
    validation_status: "PRE_VALIDATION";
  };
  dimensions:     PTIv2Dimensions;
  trajectory:     PTIv2Trajectory;
  evidence_depth: EvidenceDepth;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 5 — PURE DIMENSION MAPPING HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function mapDimension(
  v2Key:       string,
  internalKey: string,
  v2Label:     string,
  dim:         PTIDimension,
): V2DimensionEntry {
  return {
    v2_key:       v2Key,
    internal_key: internalKey,
    v2_label:     v2Label,
    score:        dim.score,
    max:          dim.max,
    components:   dim.components as Record<string, { score: number; max: number; value: number }>,
  };
}

/**
 * Pure function: maps a v5 PTIBreakdown to the v2 dimension vocabulary.
 * The original PTIBreakdown is not modified; a new object is returned.
 * Invariant: output[key].score === input[internal_key].score for every key.
 */
export function mapBreakdownToV2Dimensions(bd: PTIBreakdown): PTIv2Dimensions {
  return {
    payment_reliability: mapDimension(
      DIMENSION_V2_MAP.payment_reliability.v2_key,
      DIMENSION_V2_MAP.payment_reliability.internal_key,
      DIMENSION_V2_MAP.payment_reliability.v2_label,
      bd.payment_reliability,
    ),
    cash_flow_resilience: mapDimension(
      DIMENSION_V2_MAP.cashflow_stability.v2_key,
      DIMENSION_V2_MAP.cashflow_stability.internal_key,
      DIMENSION_V2_MAP.cashflow_stability.v2_label,
      bd.cashflow_stability,
    ),
    behavioral_stability: mapDimension(
      DIMENSION_V2_MAP.behavioral_consistency.v2_key,
      DIMENSION_V2_MAP.behavioral_consistency.internal_key,
      DIMENSION_V2_MAP.behavioral_consistency.v2_label,
      bd.behavioral_consistency,
    ),
    engagement_depth: mapDimension(
      DIMENSION_V2_MAP.engagement_depth.v2_key,
      DIMENSION_V2_MAP.engagement_depth.internal_key,
      DIMENSION_V2_MAP.engagement_depth.v2_label,
      bd.engagement_depth,
    ),
  };
}

export function mapTrajectoryDirection(raw: string | null | undefined): TrajectoryDirection {
  switch (raw) {
    case "rising":            return "improving";
    case "falling":           return "deteriorating";
    case "stable":            return "stable";
    case "insufficient_data": return "insufficient_data";
    default:                  return "insufficient_data";
  }
}

export function buildTrajectoryObservation(snap: {
  trajectory:    string | null;
  velocity:      number | null;
  model_version: string | null;
} | null): TrajectoryObservation {
  if (!snap || !snap.trajectory || snap.trajectory === "insufficient_data") {
    return {
      direction:                 "insufficient_data",
      velocity:                  null,
      observation_model_version: null,
      status:                    "INSUFFICIENT_DATA",
    };
  }
  return {
    direction:                 mapTrajectoryDirection(snap.trajectory),
    velocity:                  snap.velocity,
    observation_model_version: snap.model_version ?? null,
    status:                    "COMPUTED",
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 6 — EVIDENCE DEPTH V1: PURE SCORING FUNCTIONS
// All functions are exported for direct unit testing.
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Observation Duration component: how long has this user been observable?
 * Measured from their first to their last verified behavioral event.
 * Linear: 0 days → 0, ED_DURATION_MAX_DAYS or more days → 100.
 */
export function scoreDuration(observationDays: number): number {
  if (observationDays <= 0) return 0;
  return Math.min(100, (observationDays / ED_DURATION_MAX_DAYS) * 100);
}

/**
 * Observation Density component: how many verified events occurred?
 * Counts confirmed bill payments plus confirmed wallet load/transfer events.
 * Linear: 0 → 0, ED_DENSITY_MAX_EVENTS or more → 100.
 */
export function scoreDensity(eventCount: number): number {
  if (eventCount <= 0) return 0;
  return Math.min(100, (eventCount / ED_DENSITY_MAX_EVENTS) * 100);
}

/**
 * Behavioral Breadth component: how many distinct billers has this user paid?
 * Uses COUNT(DISTINCT service_id) from confirmed bill_payments only.
 * Step function: 0 → 0, 1 → 25, 2 → 50, 3 → 75, 4 or more → 100.
 *
 * Wallet-only users (zero bill payments, nonzero wallet activity) receive
 * breadth = 0. This is correct — zero distinct billers means breadth is 0.
 * The overall Evidence Depth is still computable as long as the minimum-data
 * gate is otherwise satisfied from wallet activity alone.
 */
export function scoreBreadth(distinctBillers: number): number {
  if (distinctBillers <= 0) return 0;
  if (distinctBillers === 1) return 25;
  if (distinctBillers === 2) return 50;
  if (distinctBillers === 3) return 75;
  return 100;
}

/**
 * Continuity component: how continuously observable has this user been?
 * Base formula: consecutive_payment_months / max(active_months, 1), scaled 0–100.
 *
 * Soft gap penalty — reduces confidence in continuity when the longest
 * observed gap between payments exceeds ED_GAP_PENALTY_THRESHOLD_DAYS days:
 *
 *   penaltyFactor = min(1, (longestGapDays - threshold) / 90)
 *   penalty       = penaltyFactor * ED_GAP_MAX_PENALTY_POINTS
 *
 * At threshold days (45): penaltyFactor = 0, penalty = 0.
 * At threshold + 45 days (90): penaltyFactor = 0.5, penalty = 15 pts.
 * At threshold + 90 days (135) or more: penaltyFactor = 1, penalty = 30 pts max.
 *
 * IMPORTANT: this penalty ONLY affects Evidence Depth continuity.
 * It NEVER produces a missed-payment event, behavioral deterioration signal,
 * or Payment Reliability reduction anywhere in the system.
 */
export function scoreContinuity(
  consecutiveMonths: number,
  activeMonths:      number,
  longestGapDays:    number,
): number {
  const effectiveActive = Math.max(activeMonths, 1);
  const ratio           = Math.min(1, consecutiveMonths / effectiveActive);
  const baseScore       = ratio * 100;

  let gapPenalty = 0;
  if (longestGapDays > ED_GAP_PENALTY_THRESHOLD_DAYS) {
    const penaltyFactor = Math.min(1,
      (longestGapDays - ED_GAP_PENALTY_THRESHOLD_DAYS) / 90,
    );
    gapPenalty = penaltyFactor * ED_GAP_MAX_PENALTY_POINTS;
  }

  return Math.max(0, baseScore - gapPenalty);
}

/**
 * Recency component: how recently was this user last observed?
 * Uses the most recent confirmed behavioral event timestamp (bill payment or
 * wallet load/transfer), compared to the reference time.
 *
 *   0 to ED_RECENCY_FULL_SCORE_DAYS days since last event → 100
 *   ED_RECENCY_FULL_SCORE_DAYS to ED_RECENCY_ZERO_SCORE_DAYS → linear decay 100 → 0
 *   ED_RECENCY_ZERO_SCORE_DAYS or more → 0
 *
 * IMPORTANT: this score is local to Evidence Depth. It NEVER creates a behavioral
 * deterioration signal, missed-payment event, or risk event anywhere else.
 * Specifically it must not influence users.pti_score, pti_score_history, Paula
 * triggers, readinessGate, or any score-adjacent derived field.
 */
export function scoreRecency(daysSinceLast: number): number {
  if (daysSinceLast <= ED_RECENCY_FULL_SCORE_DAYS) return 100;
  if (daysSinceLast >= ED_RECENCY_ZERO_SCORE_DAYS)  return 0;
  const decayRange = ED_RECENCY_ZERO_SCORE_DAYS - ED_RECENCY_FULL_SCORE_DAYS;
  const elapsed    = daysSinceLast - ED_RECENCY_FULL_SCORE_DAYS;
  return Math.max(0, ((decayRange - elapsed) / decayRange) * 100);
}

/**
 * Assigns a band label from a rounded Evidence Depth score.
 * All band boundaries are defined here — this is the single source of truth.
 *
 *   1  – ED_BAND_LOW_MAX      (33) → LOW
 *   34 – ED_BAND_MODERATE_MAX (66) → MODERATE
 *   67 – 100                       → HIGH
 *
 * Score 0 does not occur in a COMPUTED result (the gate returns INSUFFICIENT_DATA
 * when evidence is absent), but assignBand(0) returns "LOW" defensively.
 */
export function assignBand(score: number): EvidenceBand {
  if (score <= ED_BAND_LOW_MAX)      return "LOW";
  if (score <= ED_BAND_MODERATE_MAX) return "MODERATE";
  return "HIGH";
}

/** Internal helper — returns the canonical INSUFFICIENT_DATA output. */
function insufficientDataResult(): EvidenceDepth {
  return {
    score:            null,
    band:             "INSUFFICIENT_DATA",
    observation_days: null,
    event_count:      null,
    domain_count:     null,
    continuity:       null,
    recency:          null,
    status:           "INSUFFICIENT_DATA",
    version:          EVIDENCE_DEPTH_VERSION,
  };
}

/**
 * Pure function: computes Evidence Depth v1 from raw inputs and a reference time.
 *
 * Accepting referenceTime as a parameter (rather than calling Date.now() inside)
 * guarantees fully deterministic, reproducible results in tests regardless of
 * when they run, and allows historical reconstructions by passing a past date.
 *
 * This function never reads from any database and never modifies any state.
 * behavioral_profile.score is not read, not modified, not influenced.
 */
export function computeEvidenceDepthFromInputs(
  inputs:        EvidenceDepthRawInputs,
  referenceTime: Date,
): EvidenceDepth {
  const MSEC_PER_DAY = 86_400_000;

  // ── Step 1: merge timestamps across bill payments and wallet transactions ─
  const allFirstTs = [inputs.firstBillPaymentAt, inputs.firstWalletTxAt]
    .filter((t): t is Date => t !== null);
  const allLastTs  = [inputs.lastBillPaymentAt, inputs.lastWalletTxAt]
    .filter((t): t is Date => t !== null);

  const totalEventCount = inputs.billPaymentCount + inputs.walletTxCount;

  // ── Gate 1: no verified behavioral events at all ──────────────────────────
  // Returns INSUFFICIENT_DATA (null score), NOT a numeric 0.
  // "Not enough evidence to compute" vs "thin evidence exists" must never be conflated.
  if (totalEventCount === 0 || allFirstTs.length === 0) {
    return insufficientDataResult();
  }

  const firstVerifiedAt = new Date(Math.min(...allFirstTs.map(t => t.getTime())));
  const lastVerifiedAt  = new Date(Math.max(...allLastTs.map(t => t.getTime())));
  const observationDays = (lastVerifiedAt.getTime() - firstVerifiedAt.getTime()) / MSEC_PER_DAY;

  // ── Gate 2: observed span below minimum floor ─────────────────────────────
  // A single event, or multiple events crammed into under 7 days, does not
  // constitute enough evidence to compute a reliable depth score.
  if (observationDays < ED_DURATION_MIN_DAYS) {
    return insufficientDataResult();
  }

  const daysSinceLast = Math.max(0,
    (referenceTime.getTime() - lastVerifiedAt.getTime()) / MSEC_PER_DAY,
  );

  // ── Component scores ──────────────────────────────────────────────────────
  const durationScore   = scoreDuration(observationDays);
  const densityScore    = scoreDensity(totalEventCount);
  const breadthScore    = scoreBreadth(inputs.distinctBillers);
  const continuityScore = scoreContinuity(
    inputs.consecutivePaymentMonths,
    inputs.activeMonths,
    inputs.longestGapDays,
  );
  const recencyScore = scoreRecency(daysSinceLast);

  // ── Aggregate ─────────────────────────────────────────────────────────────
  // Unweighted arithmetic mean of all five components.
  // This is a provisional, equal-contribution approach — NOT empirically
  // validated weighting. Components: Observation Duration, Observation Density,
  // Behavioral Breadth, Continuity, Recency.
  const rawScore = (durationScore + densityScore + breadthScore + continuityScore + recencyScore) / 5;
  const score    = Math.round(rawScore);
  const band     = assignBand(score);

  return {
    score,
    band,
    observation_days: Math.round(observationDays),
    event_count:      totalEventCount,
    domain_count:     inputs.distinctCategories,
    continuity:       Math.round(continuityScore),
    recency:          Math.round(recencyScore),
    status:           "COMPUTED",
    version:          EVIDENCE_DEPTH_VERSION,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 7 — BEHAVIORAL TRAJECTORY V1: PURE FUNCTIONS
// All functions are exported for direct unit testing.
// ═══════════════════════════════════════════════════════════════════════════════

const MSEC_PER_DAY = 86_400_000;

/**
 * Normalizes a raw dimension score to a 0–100 percentage-of-maximum basis.
 * Uses the dimension's own maximum so that a "correct" or "improving" reading
 * means the same thing across dimensions with different point scales.
 *
 *   normalized = min(100, max(0, (rawScore / max) * 100))
 *
 * Rounded to one decimal place for display.
 * Returns 0 if max is zero (defensive against divide-by-zero).
 */
export function normalizeDimScore(rawScore: number, max: number): number {
  if (max <= 0) return 0;
  const raw = Math.min(100, Math.max(0, (rawScore / max) * 100));
  return Math.round(raw * 10) / 10;
}

/**
 * Classifies a normalized delta as IMPROVING, STABLE, or DETERIORATING.
 *
 *   |delta| < DIM_TRAJ_STABILITY_THRESHOLD_PCT → STABLE
 *   delta >= threshold                          → IMPROVING
 *   delta <= -threshold                         → DETERIORATING
 *
 * IMPORTANT: a delta that is numerically negative does NOT represent a missed
 * payment, a default risk, or a financial event. It represents that the score
 * computed at one point in time was lower than at an earlier point. Absence
 * of activity between observations is not interpreted as deterioration —
 * only actual score deltas are classified.
 */
export function classifyDimDelta(delta: number): DimTrajectoryDirection {
  if (Math.abs(delta) < DIM_TRAJ_STABILITY_THRESHOLD_PCT) return "STABLE";
  return delta > 0 ? "IMPROVING" : "DETERIORATING";
}

/** Internal: INSUFFICIENT_DATA window result. */
function dimInsufficient(): DimTrajectoryInsufficient {
  return { status: "INSUFFICIENT_DATA" };
}

/**
 * Internal: builds a DimTrajectoryComputed from two normalized scores and timestamps.
 * Never called with a null prior — callers check before invoking.
 */
function buildDimWindow(
  currentNorm:         number,
  priorNorm:           number,
  priorAt:             Date,
  referenceTime:       Date,
  totalSameModelCount: number,
): DimTrajectoryComputed {
  const windowDays = Math.max(0,
    (referenceTime.getTime() - priorAt.getTime()) / MSEC_PER_DAY,
  );
  const delta     = Math.round((currentNorm - priorNorm) * 10) / 10;
  const direction = classifyDimDelta(delta);
  // velocity = points per 30 days; zero when observations are same-day
  const velocity  = windowDays > 0
    ? Math.round((delta / windowDays) * 30 * 100) / 100
    : 0;

  return {
    status:                  "COMPUTED",
    current_value:           currentNorm,
    prior_value:             priorNorm,
    delta,
    direction,
    velocity,
    observation_count:       totalSameModelCount,
    observation_window_days: Math.round(windowDays * 10) / 10,
  };
}

/**
 * Internal: finds the same-model history row closest to a target date that
 * falls within the specified tolerance band.
 *
 * @param rows         Same-model rows with normed scores, sorted DESC by recordedAt.
 * @param targetDate   The date we're trying to approximate.
 * @param toleranceDays Rows must be within ±toleranceDays of targetDate to qualify.
 */
function findClosestRow(
  rows: ReadonlyArray<{ recordedAt: Date; norm: number }>,
  targetDate:    Date,
  toleranceDays: number,
): { recordedAt: Date; norm: number } | null {
  const toleranceMs = toleranceDays * MSEC_PER_DAY;
  let best: { recordedAt: Date; norm: number } | null = null;
  let bestDiff = Infinity;

  for (const row of rows) {
    const diff = Math.abs(row.recordedAt.getTime() - targetDate.getTime());
    if (diff <= toleranceMs && diff < bestDiff) {
      best    = row;
      bestDiff = diff;
    }
  }
  return best;
}

/**
 * Pure function: computes all trajectory windows for a single dimension.
 *
 * @param v2Key            The v2 vocabulary key for this dimension.
 * @param currentNorm      Current normalized score (0–100) from users.pti_breakdown.
 * @param sameModelRows    Same-model history rows with normed scores for this dim,
 *                         sorted newest-first (DESC by recordedAt).
 * @param referenceTime    Explicit reference timestamp (no Date.now() calls here).
 * @param totalSameModelCount Total same-model history rows (all dimensions share this).
 */
export function computeSingleDimTrajectory(
  v2Key:               string,
  currentNorm:         number,
  sameModelRows:       ReadonlyArray<{ recordedAt: Date; norm: number }>,
  referenceTime:       Date,
  totalSameModelCount: number,
): DimTrajectoryResult {
  // "recent" window: compare against the most recent same-model prior observation.
  // Note: the most recent history row is often from the same nightly cron run that
  // set users.pti_breakdown. In that case, delta may be 0 (no change since last
  // computation), which is the correct answer — a delta of 0 is STABLE, not missing.
  const recentPrior = sameModelRows.length > 0 ? sameModelRows[0] : null;
  const recent: DimTrajectoryWindow = recentPrior
    ? buildDimWindow(currentNorm, recentPrior.norm, recentPrior.recordedAt, referenceTime, totalSameModelCount)
    : dimInsufficient();

  // Best-effort windowed comparisons (30 / 60 / 90 days prior to referenceTime).
  // Only reported if a same-model row genuinely exists near that horizon.
  // Never approximated from data outside the tolerance band.
  const target30 = new Date(referenceTime.getTime() - 30 * MSEC_PER_DAY);
  const target60 = new Date(referenceTime.getTime() - 60 * MSEC_PER_DAY);
  const target90 = new Date(referenceTime.getTime() - 90 * MSEC_PER_DAY);

  const row30 = findClosestRow(sameModelRows, target30, DIM_TRAJ_WINDOW_30D_TOLERANCE_DAYS);
  const row60 = findClosestRow(sameModelRows, target60, DIM_TRAJ_WINDOW_60D_TOLERANCE_DAYS);
  const row90 = findClosestRow(sameModelRows, target90, DIM_TRAJ_WINDOW_90D_TOLERANCE_DAYS);

  return {
    v2_key:    v2Key,
    recent,
    window_30d: row30
      ? buildDimWindow(currentNorm, row30.norm, row30.recordedAt, referenceTime, totalSameModelCount)
      : dimInsufficient(),
    window_60d: row60
      ? buildDimWindow(currentNorm, row60.norm, row60.recordedAt, referenceTime, totalSameModelCount)
      : dimInsufficient(),
    window_90d: row90
      ? buildDimWindow(currentNorm, row90.norm, row90.recordedAt, referenceTime, totalSameModelCount)
      : dimInsufficient(),
    version: BEHAVIORAL_TRAJECTORY_VERSION,
  };
}

/**
 * Pure function: computes per-dimension trajectories for all three public v2 dimensions.
 *
 * Inputs:
 *   currentBreakdown — the live v5 breakdown from users.pti_breakdown.
 *   historyRows      — all pti_score_history rows for this user (any model version),
 *                      sorted newest-first. This function handles same-model filtering.
 *   referenceTime    — explicit reference timestamp. No Date.now() inside.
 *
 * Model-version isolation: only rows whose breakdown.model_version exactly equals
 * currentBreakdown.model_version are used. Cross-model rows are silently excluded.
 * A null or absent model_version on any history row causes that row to be excluded.
 *
 * Normalization: uses the max from currentBreakdown for each dimension, which is
 * the authoritative v5 model max. Same-model rows carry the same max by construction.
 *
 * engagement_depth: computed internally for structural completeness but excluded
 * from the public output. See PTIv2DimensionTrajectories JSDoc for rationale.
 *
 * Evidence Depth isolation: this function never reads, references, or uses
 * Evidence Depth values in any way. If evidence is thin, that is reflected
 * by this function's own observation_count and INSUFFICIENT_DATA status fields.
 *
 * No obligation inference: missing or sparse historical data is never interpreted
 * as a missed payment, a negative event, or automatic deterioration. Insufficient
 * prior data → INSUFFICIENT_DATA status, never a fabricated negative delta.
 *
 * KYC / banking / credit bureau exclusion: this computation reads only from
 * previously-computed pti_score_history dimension scores. It never requires
 * or references KYC status, bank account presence, SPEI signals, or any
 * credit bureau data directly.
 */
export function computeBehavioralTrajectory(
  currentBreakdown: PTIBreakdown,
  historyRows:      ReadonlyArray<ScoreHistoryRow>,
  referenceTime:    Date,
): PTIv2DimensionTrajectories {
  const currentMv = (currentBreakdown.model_version as string | undefined) ?? null;

  // Filter to same model version only, sorted newest-first.
  // Cross-model rows and null-version rows are never compared.
  const sameModel = historyRows
    .filter(r => r.breakdown.model_version != null && r.breakdown.model_version === currentMv)
    .sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime());

  const count = sameModel.length;

  // Normalization maxes come from the current breakdown — these are the
  // authoritative v5.0.0-rc1 maxes (PR=36, BC=22, CF=20, ED=22).
  // Using the live breakdown's max ensures this stays correct if a future
  // model version changes the maximums.
  const prMax = currentBreakdown.payment_reliability.max;    // 36
  const bcMax = currentBreakdown.behavioral_consistency.max; // 22
  const cfMax = currentBreakdown.cashflow_stability.max;     // 20
  const edMax = currentBreakdown.engagement_depth.max;       // 22 — internal only

  // Current normalized scores from the live breakdown
  const currentPrNorm = normalizeDimScore(currentBreakdown.payment_reliability.score,    prMax);
  const currentBcNorm = normalizeDimScore(currentBreakdown.behavioral_consistency.score, bcMax);
  const currentCfNorm = normalizeDimScore(currentBreakdown.cashflow_stability.score,     cfMax);

  // Build per-dimension normed history rows (sorted DESC, same-model only)
  const prRows = sameModel.map(r => ({
    recordedAt: r.recordedAt,
    norm:       normalizeDimScore(r.breakdown.payment_reliability?.score ?? 0,    prMax),
  }));
  const bcRows = sameModel.map(r => ({
    recordedAt: r.recordedAt,
    norm:       normalizeDimScore(r.breakdown.behavioral_consistency?.score ?? 0, bcMax),
  }));
  const cfRows = sameModel.map(r => ({
    recordedAt: r.recordedAt,
    norm:       normalizeDimScore(r.breakdown.cashflow_stability?.score ?? 0,     cfMax),
  }));

  // engagement_depth: computed internally but intentionally not returned in the
  // public PTIv2DimensionTrajectories output. The void suppresses the unused-var
  // warning. See PTIv2DimensionTrajectories JSDoc for the full exclusion rationale.
  void sameModel.map(r => ({
    recordedAt: r.recordedAt,
    norm:       normalizeDimScore(r.breakdown.engagement_depth?.score ?? 0, edMax),
  }));

  return {
    payment_reliability: computeSingleDimTrajectory(
      "payment_reliability", currentPrNorm, prRows, referenceTime, count,
    ),
    cash_flow_resilience: computeSingleDimTrajectory(
      "cash_flow_resilience", currentCfNorm, cfRows, referenceTime, count,
    ),
    behavioral_stability: computeSingleDimTrajectory(
      "behavioral_stability", currentBcNorm, bcRows, referenceTime, count,
    ),
  };
}

/**
 * Pure function: computes the alignment signal across the three dimension
 * trajectories, using the "recent" window direction for each.
 *
 * Only dimensions with a COMPUTED recent window contribute to alignment.
 * INSUFFICIENT_DATA dimensions are excluded from the comparison.
 *
 *   < 2 computed directions → INSUFFICIENT_DATA (alignment itself is unknown)
 *   >= 2 computed directions, all agree → ALIGNED_IMPROVING / ALIGNED_STABLE
 *                                         / ALIGNED_DETERIORATING
 *   >= 2 computed directions, disagree  → MIXED
 *
 * Strictness: for ALIGNED_* labels, ALL available (computed) dimensions must
 * agree. One dissenting dimension produces MIXED regardless of the majority.
 *
 * STRICTLY DESCRIPTIVE: this signal must not be used to infer prediction,
 * risk score, or recommended action. It describes observed co-movement only.
 */
export function computeAlignment(dimensions: PTIv2DimensionTrajectories): AlignmentSignal {
  const getRecentDir = (result: DimTrajectoryResult): DimTrajectoryDirection | null => {
    if (result.recent.status !== "COMPUTED") return null;
    return result.recent.direction;
  };

  const dirs = [
    getRecentDir(dimensions.payment_reliability),
    getRecentDir(dimensions.cash_flow_resilience),
    getRecentDir(dimensions.behavioral_stability),
  ].filter((d): d is DimTrajectoryDirection => d !== null);

  if (dirs.length < 2) return "INSUFFICIENT_DATA";

  const allSame = dirs.every(d => d === dirs[0]);
  if (!allSame) return "MIXED";

  switch (dirs[0]) {
    case "IMPROVING":     return "ALIGNED_IMPROVING";
    case "STABLE":        return "ALIGNED_STABLE";
    case "DETERIORATING": return "ALIGNED_DETERIORATING";
    default:              return "INSUFFICIENT_DATA";
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 8 — EVIDENCE DEPTH V1: DATABASE QUERY LAYER (read-only)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Reads the raw inputs needed for Evidence Depth computation from the database.
 * Executes three queries in parallel; never writes anything.
 *
 * Double-counting prevention: the wallet_transactions query uses an explicit
 * type allowlist (ED_WALLET_TX_TYPES) that excludes 'bill_pay' (the wallet
 * debit created when a bill is paid from wallet balance). That event is already
 * captured in the bill_payments table. Excluding it here means the same
 * real-world payment cannot appear in both counts.
 */
async function fetchEvidenceDepthInputs(telefono: string): Promise<EvidenceDepthRawInputs> {
  const { db } = await import("@workspace/db");

  const [bpResult, wtResult, contResult] = await Promise.all([
    // Confirmed bill payments: aggregated timestamps, count, and diversity
    db.execute(sql`
      SELECT
        COUNT(*)::int                  AS bp_count,
        COUNT(DISTINCT service_id)::int AS distinct_billers,
        COUNT(DISTINCT categoria)::int  AS distinct_categories,
        MIN(created_at)                 AS min_bp_ts,
        MAX(created_at)                 AS max_bp_ts
      FROM bill_payments
      WHERE telefono = ${telefono}
        AND status IN ('completed','success','completed_ok','confirmed')
    `),
    // Confirmed wallet load/transfer events — parameterized telefono, hardcoded type list.
    // The type list is a compile-time constant (ED_WALLET_TX_TYPES); hardcoding it here
    // is safe and avoids any dynamic SQL construction.
    // 'bill_pay' is intentionally absent: it is the wallet DEBIT for a bill payment that
    // is already captured in bill_payments. Excluding it prevents double-counting.
    db.execute(sql`
      SELECT
        COUNT(wt.id)::int  AS wt_count,
        MIN(wt.created_at) AS min_wt_ts,
        MAX(wt.created_at) AS max_wt_ts
      FROM wallet_transactions wt
      JOIN wallets w ON wt.wallet_id = w.id
      WHERE w.user_id = ${telefono}
        AND wt.status = 'confirmed'
        AND wt.type IN (
          'load_card','load_oxxo','spei_in','load_spei',
          'transfer_receive','transfer_send'
        )
    `),
    // Continuity fields (written nightly by computePTIv3Signals — read-only here)
    db.execute(sql`
      SELECT
        COALESCE(consecutive_payment_months, 0)::int AS consecutive_payment_months,
        COALESCE(active_months, 0)::int              AS active_months,
        COALESCE(longest_gap_days, 0)::int           AS longest_gap_days
      FROM users
      WHERE telefono = ${telefono}
      LIMIT 1
    `),
  ]);

  const bpRow   = bpResult.rows[0]   as Record<string, unknown> | undefined;
  const wtRow   = wtResult.rows[0]   as Record<string, unknown> | undefined;
  const contRow = contResult.rows[0] as Record<string, unknown> | undefined;

  function toDate(v: unknown): Date | null {
    if (v == null) return null;
    const d = new Date(v as string);
    return isNaN(d.getTime()) ? null : d;
  }

  return {
    firstBillPaymentAt:       toDate(bpRow?.min_bp_ts),
    lastBillPaymentAt:        toDate(bpRow?.max_bp_ts),
    billPaymentCount:         Number(bpRow?.bp_count          ?? 0),
    distinctBillers:          Number(bpRow?.distinct_billers  ?? 0),
    distinctCategories:       Number(bpRow?.distinct_categories ?? 0),
    firstWalletTxAt:          toDate(wtRow?.min_wt_ts),
    lastWalletTxAt:           toDate(wtRow?.max_wt_ts),
    walletTxCount:            Number(wtRow?.wt_count          ?? 0),
    consecutivePaymentMonths: Number(contRow?.consecutive_payment_months ?? 0),
    activeMonths:             Number(contRow?.active_months   ?? 0),
    longestGapDays:           Number(contRow?.longest_gap_days ?? 0),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 9 — BEHAVIORAL TRAJECTORY V1: DATABASE QUERY LAYER (read-only)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Fetches the most recent pti_score_history rows for a user, all model versions.
 * The trajectory pure function handles same-model filtering.
 * Never writes anything. Returns rows sorted newest-first.
 *
 * Fetching DIM_TRAJ_HISTORY_FETCH_LIMIT (100) rows is far more than needed for
 * any current user (prod max is ~14 rows as of July 2026) and avoids unbounded
 * queries if history grows.
 */
async function fetchScoreHistoryRows(telefono: string): Promise<ScoreHistoryRow[]> {
  const { db } = await import("@workspace/db");

  const result = await db.execute(sql`
    SELECT recorded_at, breakdown
    FROM pti_score_history
    WHERE telefono = ${telefono}
    ORDER BY recorded_at DESC
    LIMIT ${DIM_TRAJ_HISTORY_FETCH_LIMIT}
  `);

  return result.rows.map((r: unknown) => {
    const row = r as Record<string, unknown>;
    const bd  = row.breakdown as ScoreHistoryRow["breakdown"] | null ?? {};
    return {
      recordedAt: new Date(row.recorded_at as string),
      breakdown:  bd,
    };
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 10 — BACKWARD COMPATIBILITY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Returns the canonical INSUFFICIENT_DATA Evidence Depth structure.
 * Exported for testing and for callers that need a typed INSUFFICIENT_DATA
 * result without running the full computation.
 *
 * Previously named "shell" (NOT_COMPUTED era). Now returns INSUFFICIENT_DATA
 * status and the v1 version string. The output shape is unchanged.
 */
export function buildEvidenceDepthShell(): EvidenceDepth {
  return insufficientDataResult();
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 11 — MAIN ADAPTER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Reads the existing v5 score state for the given entity_id (telefono) and
 * returns a PTIv2Profile including:
 *   - live-computed Evidence Depth v1
 *   - aggregate trajectory (from pti_trend_snapshots, lineage-safe)
 *   - per-dimension behavioral trajectories (from pti_score_history, same-model)
 *   - alignment signal across the three tracked dimensions
 *
 * This function is a pure read adapter:
 *   - Calls no compute function.
 *   - Writes to no table.
 *   - Does not alter users.pti_score, users.pti_breakdown, pti_score_history,
 *     or pti_trend_snapshots.
 *   - Evidence Depth and Behavioral Trajectory are computed independently of
 *     each other — neither references the other's result.
 *
 * @param telefono      The user identifier (phone number).
 * @param options.referenceTime  Optional reference timestamp for Evidence Depth
 *   and Behavioral Trajectory computation. Defaults to new Date() when omitted.
 *   Pass an explicit Date in tests and historical reconstructions for fully
 *   deterministic, reproducible results. No Date.now() or new Date() calls
 *   exist inside the pure computation functions.
 *
 * Returns null if the user has no computed v5 score.
 */
export async function buildPTIv2Profile(
  telefono: string,
  options?: { referenceTime?: Date },
): Promise<PTIv2Profile | null> {
  const { db } = await import("@workspace/db");
  const referenceTime = options?.referenceTime ?? new Date();

  // ── 1. Read the existing v5 score from users ──────────────────────────────
  const userRow = await db.execute(sql`
    SELECT pti_score, pti_breakdown
    FROM users
    WHERE telefono = ${telefono}
    LIMIT 1
  `);

  const ur = userRow.rows[0] as Record<string, unknown> | undefined;
  if (!ur || ur.pti_score == null || ur.pti_breakdown == null) {
    return null;
  }

  const score        = Number(ur.pti_score);
  const breakdown    = ur.pti_breakdown as PTIBreakdown;
  const modelVersion = (breakdown.model_version as string | undefined) ?? "unknown";

  // ── 2. Fetch Evidence Depth inputs and history rows in parallel ───────────
  const [edInputs, trendRow, historyRows] = await Promise.all([
    fetchEvidenceDepthInputs(telefono),
    // Aggregate trajectory: read from pti_trend_snapshots (lineage-safe, existing)
    db.execute(sql`
      SELECT pts.trajectory, pts.velocity, pts.model_version
      FROM pti_trend_snapshots pts
      JOIN users u ON u.id = pts.user_id
      WHERE u.telefono = ${telefono}
      ORDER BY pts.computed_at DESC
      LIMIT 1
    `),
    // Dimension trajectory: read from pti_score_history (works in both dev and prod)
    fetchScoreHistoryRows(telefono),
  ]);

  // ── 3. Compute Evidence Depth v1 (read-only, no writes) ───────────────────
  const evidenceDepth = computeEvidenceDepthFromInputs(edInputs, referenceTime);

  // ── 4. Map dimensions to v2 vocabulary ────────────────────────────────────
  const dimensions = mapBreakdownToV2Dimensions(breakdown);

  // ── 5. Build aggregate trajectory observation (existing, unchanged) ────────
  const snap = (trendRow.rows[0] as {
    trajectory:    string | null;
    velocity:      number | null;
    model_version: string | null;
  } | undefined) ?? null;
  const aggregateTrajectory = buildTrajectoryObservation(snap);

  // ── 6. Compute per-dimension behavioral trajectories (NEW, Sprint 3) ───────
  // Completely independent from Evidence Depth — never reads edInputs or evidenceDepth.
  const dimTrajectories = computeBehavioralTrajectory(breakdown, historyRows, referenceTime);

  // ── 7. Compute alignment signal ────────────────────────────────────────────
  const alignment = computeAlignment(dimTrajectories);

  // ── 8. Assemble trajectory (aggregate + dimensions + alignment) ────────────
  const trajectory: PTIv2Trajectory = {
    aggregate:  aggregateTrajectory,
    dimensions: dimTrajectories,
    alignment,
  };

  // ── 9. Assemble v2 profile ────────────────────────────────────────────────
  return {
    entity: {
      entity_id:   telefono,
      entity_type: "human",
    },
    domain: "financial",
    behavioral_profile: {
      score,
      model_version:     modelVersion,
      validation_status: "PRE_VALIDATION",
    },
    dimensions,
    trajectory,
    evidence_depth: evidenceDepth,
  };
}
