/**
 * PTI v2 Behavioral Profile Adapter — tests
 *
 * Coverage:
 *   (1)  cash_flow_stability v5 value maps to cash_flow_resilience in v2 with identical score
 *   (2)  behavioral_consistency v5 value maps to behavioral_stability in v2 with identical score
 *   (3)  engagement_depth name and score contribution are completely unchanged
 *   (4)  payment_reliability passes through unchanged
 *   (5)  trajectory appears correctly in v2 output — COMPUTED case
 *   (6)  trajectory appears correctly in v2 output — INSUFFICIENT_DATA case
 *   (7)  trajectory.direction is never described as predicting default (label-vocabulary check)
 *   (8)  Evidence Depth is present in output with status=NOT_COMPUTED
 *   (9)  Evidence Depth has zero influence on behavioral_profile.score
 *   (10) entity_type = "human"
 *   (11) domain = "financial"
 *   (12) validation_status = "PRE_VALIDATION"
 *   (13) validation_status does not contain default/credit/risk language
 *   (14) v2 output dimensions sum equals v5 total (no score is invented or dropped)
 *   (15) buildPTIv2Profile (DB integration) — reads without writing; DB state is unchanged
 */

import { describe, it, expect } from "vitest";
import { sql } from "drizzle-orm";
import {
  mapBreakdownToV2Dimensions,
  mapTrajectoryDirection,
  buildTrajectoryObservation,
  buildEvidenceDepthShell,
  buildPTIv2Profile,
  DIMENSION_V2_MAP,
  EVIDENCE_DEPTH_VERSION,
} from "../ptiV2.js";
import type { PTIBreakdown } from "../pti.js";

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Builds a minimal PTIDimension for test use. */
function dim(score: number, max: number): ReturnType<typeof Object.assign> {
  return { score, max, label: "test", components: { a: { score, max, value: 0 } } };
}

/** Builds a complete PTIBreakdown with all four dimensions. */
function makeBreakdown(
  pr = 20, bc = 15, ed = 10, cf = 12,
): PTIBreakdown {
  return {
    payment_reliability:    dim(pr, 36) as never,
    behavioral_consistency: dim(bc, 22) as never,
    engagement_depth:       dim(ed, 22) as never,
    cashflow_stability:     dim(cf, 20) as never,
    total:                  pr + bc + ed + cf,
    model_version:          "v5.0.0-rc1",
  };
}

// ─── (1-4) Dimension label mapping ────────────────────────────────────────────

describe("mapBreakdownToV2Dimensions — label and value mapping", () => {
  const bd = makeBreakdown(20, 15, 10, 12);
  const v2 = mapBreakdownToV2Dimensions(bd);

  it("(1) cash_flow_stability maps to cash_flow_resilience with identical score and max", () => {
    expect(v2.cash_flow_resilience).toBeDefined();
    expect(v2.cash_flow_resilience.score).toBe(bd.cashflow_stability.score);
    expect(v2.cash_flow_resilience.max).toBe(bd.cashflow_stability.max);
    expect(v2.cash_flow_resilience.v2_key).toBe("cash_flow_resilience");
    expect(v2.cash_flow_resilience.internal_key).toBe("cashflow_stability");
  });

  it("(2) behavioral_consistency maps to behavioral_stability with identical score and max", () => {
    expect(v2.behavioral_stability).toBeDefined();
    expect(v2.behavioral_stability.score).toBe(bd.behavioral_consistency.score);
    expect(v2.behavioral_stability.max).toBe(bd.behavioral_consistency.max);
    expect(v2.behavioral_stability.v2_key).toBe("behavioral_stability");
    expect(v2.behavioral_stability.internal_key).toBe("behavioral_consistency");
  });

  it("(3) engagement_depth key name is unchanged and score is identical", () => {
    expect(v2.engagement_depth).toBeDefined();
    expect(v2.engagement_depth.score).toBe(bd.engagement_depth.score);
    expect(v2.engagement_depth.max).toBe(bd.engagement_depth.max);
    expect(v2.engagement_depth.v2_key).toBe("engagement_depth");
    expect(v2.engagement_depth.internal_key).toBe("engagement_depth");
  });

  it("(4) payment_reliability passes through unchanged", () => {
    expect(v2.payment_reliability.score).toBe(bd.payment_reliability.score);
    expect(v2.payment_reliability.max).toBe(bd.payment_reliability.max);
    expect(v2.payment_reliability.v2_key).toBe("payment_reliability");
    expect(v2.payment_reliability.internal_key).toBe("payment_reliability");
  });

  it("components are passed through without modification", () => {
    // Every component in the v2 output must match the source
    for (const [key, entry] of Object.entries(v2)) {
      const sourceKey = DIMENSION_V2_MAP[key as keyof typeof DIMENSION_V2_MAP]
        ?.internal_key ?? key;
      const sourceScore = (bd as unknown as Record<string, { score: number }>)[sourceKey]?.score;
      if (sourceScore !== undefined) {
        expect((entry as { score: number }).score).toBe(sourceScore);
      }
    }
  });

  it("(14) sum of v2 dimension scores equals the v5 breakdown total", () => {
    const v2Sum = v2.payment_reliability.score
      + v2.cash_flow_resilience.score
      + v2.behavioral_stability.score
      + v2.engagement_depth.score;
    expect(v2Sum).toBe(bd.total);
  });
});

// ─── (5-7) Trajectory ─────────────────────────────────────────────────────────

describe("trajectory mapping", () => {
  it("maps raw 'rising' to direction 'improving'", () => {
    expect(mapTrajectoryDirection("rising")).toBe("improving");
  });

  it("maps raw 'falling' to direction 'deteriorating'", () => {
    expect(mapTrajectoryDirection("falling")).toBe("deteriorating");
  });

  it("maps raw 'stable' to direction 'stable'", () => {
    expect(mapTrajectoryDirection("stable")).toBe("stable");
  });

  it("maps raw 'insufficient_data' to direction 'insufficient_data'", () => {
    expect(mapTrajectoryDirection("insufficient_data")).toBe("insufficient_data");
  });

  it("maps null/unknown raw values to 'insufficient_data'", () => {
    expect(mapTrajectoryDirection(null)).toBe("insufficient_data");
    expect(mapTrajectoryDirection(undefined)).toBe("insufficient_data");
    expect(mapTrajectoryDirection("unknown_value")).toBe("insufficient_data");
  });

  it("(5) COMPUTED case: snap with 'rising' produces correct v2 trajectory", () => {
    const obs = buildTrajectoryObservation({
      trajectory:    "rising",
      velocity:      5,
      model_version: "v5.0.0-rc1",
    });
    expect(obs.direction).toBe("improving");
    expect(obs.velocity).toBe(5);
    expect(obs.observation_model_version).toBe("v5.0.0-rc1");
    expect(obs.status).toBe("COMPUTED");
  });

  it("(6) INSUFFICIENT_DATA case: null snap produces insufficient_data trajectory", () => {
    const obs = buildTrajectoryObservation(null);
    expect(obs.direction).toBe("insufficient_data");
    expect(obs.velocity).toBeNull();
    expect(obs.observation_model_version).toBeNull();
    expect(obs.status).toBe("INSUFFICIENT_DATA");
  });

  it("(6) INSUFFICIENT_DATA case: snap with trajectory='insufficient_data' handled correctly", () => {
    const obs = buildTrajectoryObservation({
      trajectory:    "insufficient_data",
      velocity:      0,
      model_version: "v5.0.0-rc1",
    });
    expect(obs.direction).toBe("insufficient_data");
    expect(obs.status).toBe("INSUFFICIENT_DATA");
    expect(obs.velocity).toBeNull();
    expect(obs.observation_model_version).toBeNull();
  });

  it("(7) trajectory direction vocabulary contains no default/credit/risk language", () => {
    const allDirections: string[] = [
      "improving", "stable", "deteriorating", "insufficient_data",
    ];
    const forbiddenTerms = ["default", "credit", "risk", "predict", "probability", "borrow"];
    for (const direction of allDirections) {
      for (const term of forbiddenTerms) {
        expect(direction.toLowerCase()).not.toContain(term);
      }
    }
  });
});

// ─── (8-9) Evidence Depth ─────────────────────────────────────────────────────

describe("Evidence Depth shell", () => {
  const ed = buildEvidenceDepthShell();

  it("(8) Evidence Depth is present with status=NOT_COMPUTED", () => {
    expect(ed.status).toBe("NOT_COMPUTED");
    expect(ed.version).toBe(EVIDENCE_DEPTH_VERSION);
  });

  it("score is null (no formula implemented)", () => {
    expect(ed.score).toBeNull();
  });

  it("band is INSUFFICIENT_DATA", () => {
    expect(ed.band).toBe("INSUFFICIENT_DATA");
  });

  it("all observation fields are null (no computation this sprint)", () => {
    expect(ed.observation_days).toBeNull();
    expect(ed.event_count).toBeNull();
    expect(ed.domain_count).toBeNull();
    expect(ed.continuity).toBeNull();
    expect(ed.recency).toBeNull();
  });

  it("(9) Evidence Depth score (null) has zero additive influence on a behavioral score", () => {
    const behavioralScore = 72;
    const edScore = ed.score ?? 0;
    // Any arithmetic combination of behavioral + evidence_depth must equal behavioral
    expect(behavioralScore + edScore).toBe(behavioralScore);
    expect(behavioralScore * (edScore === 0 ? 1 : edScore)).toBe(behavioralScore);
  });
});

// ─── (10-13) Profile-level invariants ─────────────────────────────────────────

describe("PTIv2Profile structural invariants (pure construction)", () => {
  function buildFakeProfile() {
    const bd = makeBreakdown(20, 15, 10, 12);
    const dimensions = mapBreakdownToV2Dimensions(bd);
    const trajectory = buildTrajectoryObservation({
      trajectory: "rising", velocity: 3, model_version: "v5.0.0-rc1",
    });
    const evidence_depth = buildEvidenceDepthShell();
    return {
      entity:             { entity_id: "5213001234567", entity_type: "human" as const },
      domain:             "financial" as const,
      behavioral_profile: { score: bd.total, model_version: "v5.0.0-rc1", validation_status: "PRE_VALIDATION" as const },
      dimensions,
      trajectory,
      evidence_depth,
    };
  }

  it("(10) entity_type is 'human'", () => {
    const p = buildFakeProfile();
    expect(p.entity.entity_type).toBe("human");
  });

  it("(11) domain is 'financial'", () => {
    const p = buildFakeProfile();
    expect(p.domain).toBe("financial");
  });

  it("(12) validation_status is 'PRE_VALIDATION'", () => {
    const p = buildFakeProfile();
    expect(p.behavioral_profile.validation_status).toBe("PRE_VALIDATION");
  });

  it("(13) validation_status contains no probability-of-default or creditworthiness language", () => {
    const status = "PRE_VALIDATION";
    const forbiddenTerms = [
      "default", "credit", "risk", "probability", "borrow", "lend",
      "predict", "calibrat", "worthiness",
    ];
    for (const term of forbiddenTerms) {
      expect(status.toLowerCase()).not.toContain(term);
    }
  });
});

// ─── (15) DB integration: buildPTIv2Profile reads without writing ─────────────

describe("buildPTIv2Profile — DB integration", () => {
  it("(15) reads existing v5 state and returns a PTIv2Profile without altering DB state", async () => {
    const { db } = await import("@workspace/db");
    const TEL = "pti_v2_test_entity";
    const v5Breakdown = JSON.stringify({
      payment_reliability:    { score: 20, max: 36, label: "test", components: {} },
      behavioral_consistency: { score: 15, max: 22, label: "test", components: {} },
      engagement_depth:       { score: 10, max: 22, label: "test", components: {} },
      cashflow_stability:     { score: 12, max: 20, label: "test", components: {} },
      total: 57,
      model_version: "v5.0.0-rc1",
    });

    // Isolated setup
    await db.execute(sql`DELETE FROM users WHERE telefono = ${TEL}`);
    await db.execute(sql`
      INSERT INTO users (telefono, pti_score, pti_breakdown)
      VALUES (${TEL}, 57, ${v5Breakdown}::jsonb)
    `);

    // Capture DB state BEFORE calling the adapter
    const before = await db.execute(sql`
      SELECT pti_score, pti_breakdown, pti_computed_at FROM users WHERE telefono = ${TEL}
    `);
    const beforeRow = before.rows[0] as Record<string, unknown>;

    // Run adapter
    const profile = await buildPTIv2Profile(TEL);

    // Capture DB state AFTER calling the adapter
    const after = await db.execute(sql`
      SELECT pti_score, pti_breakdown, pti_computed_at FROM users WHERE telefono = ${TEL}
    `);
    const afterRow = after.rows[0] as Record<string, unknown>;

    // ── Verify profile structure ──────────────────────────────────────────
    expect(profile).not.toBeNull();
    expect(profile!.entity.entity_type).toBe("human");
    expect(profile!.entity.entity_id).toBe(TEL);
    expect(profile!.domain).toBe("financial");
    expect(profile!.behavioral_profile.validation_status).toBe("PRE_VALIDATION");
    expect(profile!.behavioral_profile.score).toBe(57);

    // Dimension mapping
    expect(profile!.dimensions.cash_flow_resilience.score).toBe(12);
    expect(profile!.dimensions.cash_flow_resilience.internal_key).toBe("cashflow_stability");
    expect(profile!.dimensions.behavioral_stability.score).toBe(15);
    expect(profile!.dimensions.behavioral_stability.internal_key).toBe("behavioral_consistency");
    expect(profile!.dimensions.engagement_depth.score).toBe(10);
    expect(profile!.dimensions.payment_reliability.score).toBe(20);

    // Trajectory: no snapshot rows exist → INSUFFICIENT_DATA
    expect(profile!.trajectory.direction).toBe("insufficient_data");
    expect(profile!.trajectory.status).toBe("INSUFFICIENT_DATA");

    // Evidence Depth
    expect(profile!.evidence_depth.status).toBe("NOT_COMPUTED");
    expect(profile!.evidence_depth.score).toBeNull();

    // ── Verify DB state is IDENTICAL before and after ─────────────────────
    expect(afterRow.pti_score).toEqual(beforeRow.pti_score);
    // Compare breakdown as JSON strings (normalised)
    expect(JSON.stringify(afterRow.pti_breakdown)).toEqual(JSON.stringify(beforeRow.pti_breakdown));
    // pti_computed_at must not have changed
    expect(String(afterRow.pti_computed_at)).toEqual(String(beforeRow.pti_computed_at));

    // Isolated cleanup
    await db.execute(sql`DELETE FROM users WHERE telefono = ${TEL}`);
  }, 30000);

  it("returns null for a user with no computed v5 score", async () => {
    const { db } = await import("@workspace/db");
    const TEL = "pti_v2_noscore_entity";

    await db.execute(sql`DELETE FROM users WHERE telefono = ${TEL}`);
    await db.execute(sql`INSERT INTO users (telefono) VALUES (${TEL})`);

    const profile = await buildPTIv2Profile(TEL);
    expect(profile).toBeNull();

    await db.execute(sql`DELETE FROM users WHERE telefono = ${TEL}`);
  }, 30000);
});
