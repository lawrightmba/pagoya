/**
 * PTI v2 Behavioral Profile Adapter + Evidence Depth v1
 * ============================================================================
 * ADDITIVE OUTPUT LAYER — does not modify, recompute, or replace any existing
 * v5.0 scoring logic. This file reads already-persisted v5 state and re-presents
 * it in the v2 vocabulary, and separately computes Evidence Depth v1.
 *
 * ── What this file does ──────────────────────────────────────────────────────
 *   - Re-labels three of the four v5 dimensions for external presentation
 *   - Surfaces the lineage-safe trajectory data as a first-class structure
 *   - Computes Evidence Depth v1 (how much reliable behavioral observation
 *     data exists to support an assessment — completely separate from how
 *     good the behavior is)
 *
 * ── What this file explicitly does NOT do ────────────────────────────────────
 *   - Invoke any compute function (computePTIv5, computePTIv3Signals, etc.)
 *   - Write to any table or database column
 *   - Change PTIBreakdown keys, weights, or score values
 *   - Influence the behavioral score in any way
 *   - Influence the licensee API, readinessGate, or Paula trigger logic
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
 * ── CONTRACT CHANGE NOTE ─────────────────────────────────────────────────────
 *   The EvidenceDepth interface previously used literal TypeScript types
 *   (score: null, band: "INSUFFICIENT_DATA", status: "NOT_COMPUTED") that
 *   prevented real computed values from being assigned. These have been
 *   broadened to allow actual computed output. The JSON output shape is
 *   unchanged; only the TypeScript type bounds are wider.
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
// SECTION 3 — TYPES
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
 * Observed behavioral direction from the lineage-safe trajectory layer.
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
 *   - trajectory describes observed score direction only; no predictive claim.
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
  trajectory:     TrajectoryObservation;
  evidence_depth: EvidenceDepth;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4 — PURE DIMENSION MAPPING HELPERS
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
// SECTION 5 — EVIDENCE DEPTH V1: PURE SCORING FUNCTIONS
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
// SECTION 6 — EVIDENCE DEPTH V1: DATABASE QUERY LAYER (read-only)
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
// SECTION 7 — BACKWARD COMPATIBILITY
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
// SECTION 8 — MAIN ADAPTER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Reads the existing v5 score state for the given entity_id (telefono) and
 * returns a PTIv2Profile including a live-computed Evidence Depth v1 result.
 *
 * This function is a pure read adapter:
 *   - Calls no compute function.
 *   - Writes to no table.
 *   - Does not alter users.pti_score, users.pti_breakdown, pti_score_history,
 *     or pti_trend_snapshots.
 *   - Evidence Depth computation reads bill_payments and wallet_transactions
 *     but writes nothing.
 *
 * @param telefono      The user identifier (phone number).
 * @param options.referenceTime  Optional reference timestamp for Evidence Depth
 *   Recency and Duration computation. Defaults to new Date() when omitted.
 *   Pass an explicit Date in tests and historical reconstructions for fully
 *   deterministic, reproducible results.
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

  // ── 2. Read lineage-safe trajectory snapshot ──────────────────────────────
  const trendRow = await db.execute(sql`
    SELECT pts.trajectory, pts.velocity, pts.model_version
    FROM pti_trend_snapshots pts
    JOIN users u ON u.id = pts.user_id
    WHERE u.telefono = ${telefono}
    ORDER BY pts.computed_at DESC
    LIMIT 1
  `);

  const snap = (trendRow.rows[0] as {
    trajectory:    string | null;
    velocity:      number | null;
    model_version: string | null;
  } | undefined) ?? null;

  // ── 3. Compute Evidence Depth v1 (read-only, no writes) ───────────────────
  const edInputs   = await fetchEvidenceDepthInputs(telefono);
  const evidenceDepth = computeEvidenceDepthFromInputs(edInputs, referenceTime);

  // ── 4. Map dimensions to v2 vocabulary ────────────────────────────────────
  const dimensions = mapBreakdownToV2Dimensions(breakdown);

  // ── 5. Build trajectory observation ──────────────────────────────────────
  const trajectory = buildTrajectoryObservation(snap);

  // ── 6. Assemble v2 profile ────────────────────────────────────────────────
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
