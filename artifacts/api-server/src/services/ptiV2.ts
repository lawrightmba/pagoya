/**
 * PTI v2 Behavioral Profile Adapter
 * ============================================================================
 * ADDITIVE OUTPUT LAYER — does not modify, recompute, or replace any existing
 * v5.0 scoring logic. This file only reads already-persisted v5 state and
 * re-presents it using new vocabulary.
 *
 * What this file does:
 *   - Re-labels three of the four v5 dimensions for external presentation
 *   - Surfaces the lineage-safe trajectory data as a first-class structure
 *   - Provides a typed Evidence Depth shell (NOT_COMPUTED this sprint)
 *   - Assembles everything into a single PTIv2Profile output
 *
 * What this file explicitly does NOT do:
 *   - Invoke any compute function (computePTIv5, computePTIv3Signals, etc.)
 *   - Write to any table
 *   - Change PTIBreakdown keys, weights, or score values
 *   - Influence the licensee API, readinessGate, or Paula trigger logic
 *   - Implement any Evidence Depth scoring formula (that is future work)
 *
 * Naming conventions:
 *   Entity-neutral identifiers (entity_id, entity_type, domain, trajectory,
 *   evidence_depth) are used in all new types. The long-term intent is that
 *   this profile shape may apply to more than one entity class. For this
 *   sprint, entity_type is always "human" and domain is always "financial".
 *   No non-human or non-financial implementation is built here.
 */

import { sql } from "drizzle-orm";
import type { PTIBreakdown, PTIDimension } from "./pti.js";

// ─── Constants ───────────────────────────────────────────────────────────────

export const EVIDENCE_DEPTH_VERSION = "0.0.0-not-computed";

/**
 * Maps internal v5 PTIBreakdown keys to their v2 external-facing keys and
 * display labels. The internal_key value is the verbatim key used in
 * PTIBreakdown — it is preserved in V2DimensionEntry so consumers can always
 * trace back to the source field.
 *
 * Rules that must hold forever:
 *   1. internal_key must exactly match a PTIBreakdown property name.
 *   2. No score, max, or component value may change during mapping.
 *   3. Adding a new entry here is safe; changing an existing v2_key is a
 *      breaking change to the v2 contract and requires a version bump.
 */
export const DIMENSION_V2_MAP = {
  payment_reliability: {
    v2_key:       "payment_reliability",
    internal_key: "payment_reliability",
    v2_label:     "Payment Reliability",
  },
  cashflow_stability: {
    v2_key:       "cash_flow_resilience",   // user-facing rename
    internal_key: "cashflow_stability",
    v2_label:     "Cash Flow Resilience",
  },
  behavioral_consistency: {
    v2_key:       "behavioral_stability",   // user-facing rename
    internal_key: "behavioral_consistency",
    v2_label:     "Behavioral Stability",
  },
  engagement_depth: {
    v2_key:       "engagement_depth",
    internal_key: "engagement_depth",
    v2_label:     "Engagement Depth",
  },
} as const;

// ─── engagement_depth component categorization (documentation only) ──────────
/**
 * The five components of engagement_depth in PTI v5.0.0-rc1, categorized
 * for future architecture decisions. NO scoring contribution changes are
 * implied or intended in this sprint.
 *
 * GENUINE BEHAVIOR
 * ─────────────────
 * biller_diversity
 *   Measures breadth of financial engagement: the number of verified billers
 *   (services with ≥2 payments each, proxied as min(billerCount,
 *   floor(payCount/2))). This reflects active, recurring choices the user
 *   makes about which services to pay — not how long we have observed them.
 *   Max 11 pts; fully respecified in v5.0.
 *
 * spend_category_mix
 *   Ratio of payments going to utility-type services plus intent-exploration
 *   clicks. Reflects ongoing behavioral choices: what the user pays for and
 *   what platform features they explore. Max 7 pts (interpretive delta from
 *   v4.3).
 *
 * EVIDENCE DEPTH CANDIDATES
 * ──────────────────────────
 * signup_utilization_speed
 *   Hours from account creation to first payment. This is a one-time
 *   activation event — it measures *when observation began* more than a
 *   recurring behavioral pattern. It is better understood as a data-collection
 *   onset indicator: a proxy for "how quickly did we get a first data point?"
 *   As evidence_depth matures into a scored concept, this signal is a natural
 *   candidate for migration. Max 4 pts.
 *
 * device_consistency (currently shadow-demoted, 0 pts)
 *   Consistency of device fingerprint across sessions. Measures an
 *   observation-level property — data quality / multi-device access pattern —
 *   rather than a deliberate behavioral choice. Shadow-demoted in v5.0 per
 *   ptiV5Disposition.ts. Candidate for evidence_depth once that dimension
 *   has a scoring formula.
 *
 * AMBIGUOUS — requires further validation before placement
 * ──────────────────────────────────────────────────────────
 * kyc_verified (currently shadow-demoted, 0 pts)
 *   KYC completion is simultaneously: a compliance gate (users complete it
 *   regardless of behavioral intent once prompted), a user intent signal
 *   (completing optional enhanced KYC reflects willingness to engage), and a
 *   platform-infrastructure constraint (availability varies by onboarding
 *   flow). Placing it in "genuine behavior" would overweight a
 *   compliance-driven event; placing it in "evidence depth" would conflate
 *   regulatory status with observation quality. Needs further review before
 *   assignment to either category. Shadow-demoted in v5.0.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type EntityType    = "human";
export type Domain        = "financial";
export type ValidationStatus = "PRE_VALIDATION";

export type TrajectoryDirection = "improving" | "stable" | "deteriorating" | "insufficient_data";
export type TrajectoryStatus    = "COMPUTED" | "INSUFFICIENT_DATA";
export type EvidenceBand        = "LOW" | "MODERATE" | "HIGH" | "INSUFFICIENT_DATA";
export type EvidenceStatus      = "NOT_COMPUTED";

/**
 * A single behavioral dimension in the v2 output. The internal_key field
 * always holds the verbatim PTIBreakdown property name so callers can trace
 * back to the source without guessing the mapping.
 */
export interface V2DimensionEntry {
  v2_key:       string;
  internal_key: string;
  v2_label:     string;
  score:        number;
  max:          number;
  components:   Record<string, { score: number; max: number; value: number }>;
}

/**
 * Observed behavioral direction derived from the lineage-safe trajectory
 * layer (pti_trend_snapshots, computed by computePTIv3Signals).
 *
 * IMPORTANT LABELING CONSTRAINT:
 *   trajectory.direction describes the *observed behavioral direction* of the
 *   entity's PTI score over recent history. It does NOT predict default
 *   probability, creditworthiness, or future financial risk. The direction is
 *   derived entirely from within-system observed score movement and carries no
 *   causal or predictive claim.
 */
export interface TrajectoryObservation {
  /** Observed direction of score movement. "insufficient_data" means fewer
   *  than 3 same-model snapshots exist — no direction can be determined. */
  direction: TrajectoryDirection;
  /** Points per period (positive = score rising, negative = falling).
   *  null when status is INSUFFICIENT_DATA. */
  velocity: number | null;
  /** Model version tag of the snapshots used to compute this trajectory.
   *  Provided so consumers can detect when a model transition has reset the
   *  observation window. null when status is INSUFFICIENT_DATA. */
  observation_model_version: string | null;
  status: TrajectoryStatus;
}

/**
 * Evidence Depth shell — NOT_COMPUTED this sprint.
 *
 * This structure reserves the shape for a future sprint that will provide a
 * real scoring formula. For now every field is null/INSUFFICIENT_DATA.
 *
 * Evidence Depth is ALWAYS orthogonal to behavioral_profile.score:
 *   - It must never be added to, multiplied against, or otherwise influence
 *     the behavioral score in any current or future computation path.
 *   - Its purpose is to communicate how well-observed an entity is, not to
 *     penalise or reward them.
 */
export interface EvidenceDepth {
  score:            null;
  band:             "INSUFFICIENT_DATA";
  observation_days: number | null;
  event_count:      number | null;
  domain_count:     number | null;
  continuity:       null;
  recency:          null;
  status:           "NOT_COMPUTED";
  version:          string;
}

/** The four behavioral dimensions in the v2 vocabulary. */
export interface PTIv2Dimensions {
  payment_reliability: V2DimensionEntry;
  cash_flow_resilience: V2DimensionEntry;   // internal: cashflow_stability
  behavioral_stability: V2DimensionEntry;   // internal: behavioral_consistency
  engagement_depth:     V2DimensionEntry;
}

/**
 * PTI v2 Behavioral Profile — the canonical v2 output structure.
 *
 * Design principles:
 *   - entity_type and domain are always "human" / "financial" in this sprint.
 *   - behavioral_profile.validation_status is always "PRE_VALIDATION".
 *     This score is a deterministic behavioral index — not a probability of
 *     default, creditworthiness assessment, validated lending recommendation,
 *     or calibrated financial risk probability.
 *   - evidence_depth.status is always "NOT_COMPUTED" in this sprint and has
 *     zero influence on behavioral_profile.score.
 *   - trajectory describes observed score direction only; it makes no causal
 *     or predictive claim about future behavior or financial outcomes.
 */
export interface PTIv2Profile {
  entity: {
    entity_id:   string;
    entity_type: "human";
  };
  domain: "financial";
  behavioral_profile: {
    /** The existing deterministic PTI behavioral score (0–100). */
    score:             number;
    model_version:     string;
    /**
     * Always "PRE_VALIDATION" in this sprint.
     * DO NOT change to language implying probability of default,
     * creditworthiness, a validated lending recommendation, or a calibrated
     * financial risk probability without a separate, explicitly scoped
     * validation sprint.
     */
    validation_status: "PRE_VALIDATION";
  };
  dimensions:     PTIv2Dimensions;
  trajectory:     TrajectoryObservation;
  evidence_depth: EvidenceDepth;
}

// ─── Pure helper functions (exported for testing) ────────────────────────────

/** Maps a PTIBreakdown dimension to a V2DimensionEntry, applying the label
 *  translation. Score and component values are copied verbatim. */
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
 *
 * Invariant: for every key in the output,
 *   output[key].score === input[internal_key].score
 *   output[key].max   === input[internal_key].max
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

/** Maps the raw trajectory string from pti_trend_snapshots to the v2
 *  TrajectoryDirection vocabulary. */
export function mapTrajectoryDirection(raw: string | null | undefined): TrajectoryDirection {
  switch (raw) {
    case "rising":            return "improving";
    case "falling":           return "deteriorating";
    case "stable":            return "stable";
    case "insufficient_data": return "insufficient_data";
    default:                  return "insufficient_data";
  }
}

/**
 * Pure function: builds a TrajectoryObservation from a raw trend snapshot row.
 * snap is null when no snapshot row exists for the user.
 */
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

/**
 * Pure function: returns the Evidence Depth shell for this sprint.
 * Score is null, status is NOT_COMPUTED. Has zero influence on behavioral score.
 */
export function buildEvidenceDepthShell(): EvidenceDepth {
  return {
    score:            null,
    band:             "INSUFFICIENT_DATA",
    observation_days: null,
    event_count:      null,
    domain_count:     null,
    continuity:       null,
    recency:          null,
    status:           "NOT_COMPUTED",
    version:          EVIDENCE_DEPTH_VERSION,
  };
}

// ─── Main adapter ─────────────────────────────────────────────────────────────

/**
 * Reads the existing v5 score state for the given entity_id (telefono) and
 * returns a PTIv2Profile.
 *
 * This function is a pure read adapter:
 *   - It calls no compute function.
 *   - It writes to no table.
 *   - It does not alter users.pti_score, users.pti_breakdown, pti_score_history,
 *     or pti_trend_snapshots.
 *   - If the user has no computed v5 score yet, returns null.
 */
export async function buildPTIv2Profile(
  telefono: string,
): Promise<PTIv2Profile | null> {
  const { db } = await import("@workspace/db");

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

  const score    = Number(ur.pti_score);
  const breakdown = ur.pti_breakdown as PTIBreakdown;
  const modelVersion = (breakdown.model_version as string | undefined) ?? "unknown";

  // ── 2. Read the most recent lineage-safe trajectory snapshot ─────────────
  //    Only the most recent row for this user is used; model_version isolation
  //    was enforced at write time by computeTrajectory (see ptiModelLineage sprint).
  const trendRow = await db.execute(sql`
    SELECT pts.trajectory, pts.velocity, pts.model_version
    FROM pti_trend_snapshots pts
    JOIN users u ON u.id = pts.user_id
    WHERE u.telefono = ${telefono}
    ORDER BY pts.computed_at DESC
    LIMIT 1
  `);

  const snap = (trendRow.rows[0] as {
    trajectory: string | null;
    velocity: number | null;
    model_version: string | null;
  } | undefined) ?? null;

  // ── 3. Map dimensions to v2 vocabulary ────────────────────────────────────
  const dimensions = mapBreakdownToV2Dimensions(breakdown);

  // ── 4. Build trajectory observation ──────────────────────────────────────
  const trajectory = buildTrajectoryObservation(snap);

  // ── 5. Evidence Depth shell (NOT_COMPUTED this sprint) ────────────────────
  const evidence_depth = buildEvidenceDepthShell();

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
    evidence_depth,
  };
}
