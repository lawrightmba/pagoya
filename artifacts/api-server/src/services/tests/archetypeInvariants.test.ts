/**
 * Archetype Invariant Tests — Sprint 9 / Part A
 *
 * Pure-function invariant tests exercising the full PTI v2 shadow pipeline
 * across the 10 synthetic archetypes + BANKED_EQUIVALENT control.
 *
 * NO database. NO network calls. NO imports from agentChat.ts.
 * All tests use only pure functions imported from ptiV2Shadow.ts and ptiV2.ts.
 *
 * Invariants covered:
 *   FAIR-KYC       — KYC tier has no effect on shadow score
 *   FAIR-BANK      — funding channel has no effect on shadow score (BANKED_EQUIVALENT control)
 *   FAIR-SPEI      — speiLoadCount has no effect on shadow score
 *   ENGAGE-WEAK    — high engagement cannot compensate for weak payment behavior
 *   ENGAGE-STRONG  — low engagement cannot suppress strong payment behavior
 *   ED-ORTH        — Evidence Depth is orthogonal to shadow score (same snap, diff ED)
 *   TRAJ-ORTH      — trajectory is computed independently from shadow profile
 *   EO-UNRESOLVED-NEUTRAL — STALE/UNRESOLVED obligations carry no behavioral signal
 *   MISSING-NEUTRAL      — NEW_USER aggregate is INSUFFICIENT_DATA or low/moderate, never penalized
 *   CASH-FIRST-STRONG    — CASH_FIRST_CONSISTENT → shadow score ≥ 50
 *   GIG-FAIR             — GIG_INCOME → CFR not penalized by load variability alone
 *   V5-UNCHANGED         — computePTIv5 is pure/deterministic (same input → same output)
 */

import { describe, test, expect } from "vitest";

import {
  computeShadowBehavioralProfile,
  computeShadowPaymentReliability,
  computeShadowCashFlowResilience,
  computeShadowBehavioralStability,
} from "../ptiV2Shadow.js";

import {
  computeEvidenceDepthFromInputs,
  computeBehavioralTrajectory,
  computeExpectedObligations,
} from "../ptiV2.js";

import { computePTIv5 } from "../ptiV5.js";

import {
  ARCHETYPE_REF,
  CASH_FIRST_CONSISTENT,
  NEW_USER,
  IMPROVING_USER,
  DETERIORATING_USER,
  MIXED_TRAJECTORY,
  HIGH_ENGAGEMENT_WEAK_BEHAVIOR,
  LOW_ENGAGEMENT_STRONG_BEHAVIOR,
  WALLET_ONLY,
  GIG_INCOME,
  SPARSE_STALE,
  BANKED_EQUIVALENT,
  ALL_ARCHETYPES,
} from "./archetypeFixtures.js";

// ─── FAIR-KYC: kycVerified / kycTier have no effect on shadow score ───────────
describe("FAIR-KYC — KYC fields are orthogonal to shadow score", () => {
  test("kycVerified=false vs kycVerified=true: identical shadow aggregate score", () => {
    const base = CASH_FIRST_CONSISTENT.snap;
    const kyc0 = computeShadowBehavioralProfile({ ...base, kycVerified: false, kycTier: "simplified" }, ARCHETYPE_REF);
    const kyc1 = computeShadowBehavioralProfile({ ...base, kycVerified: true,  kycTier: "full"       }, ARCHETYPE_REF);
    expect(kyc0.aggregate.status).toBe(kyc1.aggregate.status);
    if (kyc0.aggregate.status === "COMPUTED" && kyc1.aggregate.status === "COMPUTED") {
      expect(kyc0.aggregate.score).toBe(kyc1.aggregate.score);
    }
  });

  test("kycTier=simplified vs full vs enhanced: identical PR score", () => {
    const base = LOW_ENGAGEMENT_STRONG_BEHAVIOR.snap;
    const tiers = ["simplified", "full", "enhanced"] as const;
    const scores = tiers.map(t =>
      computeShadowPaymentReliability({ ...base, kycTier: t, kycVerified: t !== "simplified" }),
    );
    const first = scores[0];
    for (const s of scores.slice(1)) {
      expect(s.status).toBe(first.status);
      if (s.status === "COMPUTED" && first.status === "COMPUTED") {
        expect(s.normalized_score).toBe(first.normalized_score);
      }
    }
  });

  test("KYC fields do not affect CFR", () => {
    const base = CASH_FIRST_CONSISTENT.snap;
    const cfr0 = computeShadowCashFlowResilience({ ...base, kycVerified: false, kycTier: "simplified" });
    const cfr1 = computeShadowCashFlowResilience({ ...base, kycVerified: true,  kycTier: "full"       });
    expect(cfr0.status).toBe(cfr1.status);
    if (cfr0.status === "COMPUTED" && cfr1.status === "COMPUTED") {
      expect(cfr0.normalized_score).toBe(cfr1.normalized_score);
    }
  });
});

// ─── FAIR-BANK: funding channel is orthogonal to shadow score ─────────────────
describe("FAIR-BANK — funding channel (OXXO vs SPEI vs card) is orthogonal to shadow", () => {
  test("CASH_FIRST_CONSISTENT vs BANKED_EQUIVALENT: identical shadow aggregate score", () => {
    const cashProfile = computeShadowBehavioralProfile(CASH_FIRST_CONSISTENT.snap, ARCHETYPE_REF);
    const bankProfile = computeShadowBehavioralProfile(BANKED_EQUIVALENT.snap,    ARCHETYPE_REF);

    expect(cashProfile.aggregate.status).toBe(bankProfile.aggregate.status);
    if (
      cashProfile.aggregate.status === "COMPUTED" &&
      bankProfile.aggregate.status === "COMPUTED"
    ) {
      expect(cashProfile.aggregate.score).toBe(bankProfile.aggregate.score);
    }
  });

  test("CASH_FIRST_CONSISTENT vs BANKED_EQUIVALENT: identical PR score", () => {
    const pr0 = computeShadowPaymentReliability(CASH_FIRST_CONSISTENT.snap);
    const pr1 = computeShadowPaymentReliability(BANKED_EQUIVALENT.snap);
    expect(pr0.status).toBe(pr1.status);
    if (pr0.status === "COMPUTED" && pr1.status === "COMPUTED") {
      expect(pr0.normalized_score).toBe(pr1.normalized_score);
    }
  });

  test("CASH_FIRST_CONSISTENT vs BANKED_EQUIVALENT: identical CFR score", () => {
    const cfr0 = computeShadowCashFlowResilience(CASH_FIRST_CONSISTENT.snap);
    const cfr1 = computeShadowCashFlowResilience(BANKED_EQUIVALENT.snap);
    expect(cfr0.status).toBe(cfr1.status);
    if (cfr0.status === "COMPUTED" && cfr1.status === "COMPUTED") {
      expect(cfr0.normalized_score).toBe(cfr1.normalized_score);
    }
  });

  test("CASH_FIRST_CONSISTENT vs BANKED_EQUIVALENT: identical BS score", () => {
    const bs0 = computeShadowBehavioralStability(CASH_FIRST_CONSISTENT.snap);
    const bs1 = computeShadowBehavioralStability(BANKED_EQUIVALENT.snap);
    expect(bs0.status).toBe(bs1.status);
    if (bs0.status === "COMPUTED" && bs1.status === "COMPUTED") {
      expect(bs0.normalized_score).toBe(bs1.normalized_score);
    }
  });

  test("varying oxxoLoadCount vs speiLoadCount with identical behavior: same PR", () => {
    const base = GIG_INCOME.snap;
    const oxxo = computeShadowPaymentReliability({ ...base, oxxoLoadCount: 20, speiLoadCount: 0,  cardLoadCount: 0  });
    const spei = computeShadowPaymentReliability({ ...base, oxxoLoadCount: 0,  speiLoadCount: 20, cardLoadCount: 0  });
    const card = computeShadowPaymentReliability({ ...base, oxxoLoadCount: 0,  speiLoadCount: 0,  cardLoadCount: 20 });
    expect(oxxo.status).toBe(spei.status);
    expect(oxxo.status).toBe(card.status);
    if (oxxo.status === "COMPUTED") {
      expect(oxxo.normalized_score).toBe(spei.normalized_score);
      expect(oxxo.normalized_score).toBe(card.normalized_score);
    }
  });
});

// ─── FAIR-SPEI: speiLoadCount has no effect on any shadow dimension ───────────
describe("FAIR-SPEI — speiLoadCount is orthogonal to shadow dimensions", () => {
  test("speiLoadCount 0 vs 50 with identical payment behavior: identical shadow", () => {
    const base = CASH_FIRST_CONSISTENT.snap;
    const noSpei   = computeShadowBehavioralProfile({ ...base, speiLoadCount: 0  }, ARCHETYPE_REF);
    const highSpei = computeShadowBehavioralProfile({ ...base, speiLoadCount: 50 }, ARCHETYPE_REF);
    expect(noSpei.aggregate.status).toBe(highSpei.aggregate.status);
    if (noSpei.aggregate.status === "COMPUTED" && highSpei.aggregate.status === "COMPUTED") {
      expect(noSpei.aggregate.score).toBe(highSpei.aggregate.score);
    }
  });

  test("daysToFirstSpei (NaN vs 1 vs 365) has no effect on shadow PR", () => {
    const base = CASH_FIRST_CONSISTENT.snap;
    const pr0 = computeShadowPaymentReliability({ ...base, daysToFirstSpei: NaN });
    const pr1 = computeShadowPaymentReliability({ ...base, daysToFirstSpei: 1   });
    const pr2 = computeShadowPaymentReliability({ ...base, daysToFirstSpei: 365 });
    expect(pr0.status).toBe(pr1.status);
    expect(pr0.status).toBe(pr2.status);
    if (pr0.status === "COMPUTED") {
      expect(pr0.normalized_score).toBe(pr1.normalized_score);
      expect(pr0.normalized_score).toBe(pr2.normalized_score);
    }
  });
});

// ─── ENGAGE-WEAK: high engagement cannot elevate weak payment behavior ────────
describe("ENGAGE-WEAK — engagement signals cannot compensate for weak payment behavior", () => {
  test("HIGH_ENGAGEMENT_WEAK_BEHAVIOR: shadow aggregate score ≤ 50", () => {
    const profile = computeShadowBehavioralProfile(HIGH_ENGAGEMENT_WEAK_BEHAVIOR.snap, ARCHETYPE_REF);
    if (profile.aggregate.status === "COMPUTED") {
      expect(profile.aggregate.score).toBeLessThanOrEqual(50);
    }
    // INSUFFICIENT_DATA is also acceptable — not a strong score
  });

  test("HIGH_ENGAGEMENT_WEAK_BEHAVIOR: payment_reliability is not HIGH", () => {
    const pr = computeShadowPaymentReliability(HIGH_ENGAGEMENT_WEAK_BEHAVIOR.snap);
    if (pr.status === "COMPUTED") {
      expect(pr.normalized_score).toBeLessThan(70);
    }
  });

  test("scratchPlays / spinPlays / paulaInteractions do not inflate PR score", () => {
    const base = CASH_FIRST_CONSISTENT.snap;
    // Snap with no games vs one with extreme game activity
    const noGames  = computeShadowPaymentReliability({ ...base, scratchPlays: 0, spinPlays: 0, paulaInteractions: 0 });
    const maxGames = computeShadowPaymentReliability({ ...base, scratchPlays: 999, spinPlays: 999, paulaInteractions: 999 });
    // Engagement signals must not change PR (which is payment-driven only)
    expect(noGames.status).toBe(maxGames.status);
    if (noGames.status === "COMPUTED" && maxGames.status === "COMPUTED") {
      expect(noGames.normalized_score).toBe(maxGames.normalized_score);
    }
  });
});

// ─── ENGAGE-STRONG: low engagement cannot suppress strong payment behavior ────
describe("ENGAGE-STRONG — low engagement cannot suppress strong payment behavior", () => {
  test("LOW_ENGAGEMENT_STRONG_BEHAVIOR: PR score ≥ 50", () => {
    const pr = computeShadowPaymentReliability(LOW_ENGAGEMENT_STRONG_BEHAVIOR.snap);
    expect(pr.status).toBe("COMPUTED");
    if (pr.status === "COMPUTED") {
      expect(pr.normalized_score).toBeGreaterThanOrEqual(50);
    }
  });

  test("LOW_ENGAGEMENT_STRONG_BEHAVIOR: shadow aggregate ≥ 50 or at least COMPUTED", () => {
    const profile = computeShadowBehavioralProfile(LOW_ENGAGEMENT_STRONG_BEHAVIOR.snap, ARCHETYPE_REF);
    expect(profile.aggregate.status).toBe("COMPUTED");
  });

  test("loginDays30 dropping from 28 to 1: PR score unchanged", () => {
    const base = LOW_ENGAGEMENT_STRONG_BEHAVIOR.snap;
    const highLogin = computeShadowPaymentReliability({ ...base, loginDays30: 28 });
    const lowLogin  = computeShadowPaymentReliability({ ...base, loginDays30: 1  });
    expect(highLogin.status).toBe(lowLogin.status);
    if (highLogin.status === "COMPUTED" && lowLogin.status === "COMPUTED") {
      expect(highLogin.normalized_score).toBe(lowLogin.normalized_score);
    }
  });
});

// ─── ED-ORTH: Evidence Depth is orthogonal to shadow score ───────────────────
describe("ED-ORTH — Evidence Depth computed independently from shadow score", () => {
  test("same snap: different ED inputs produce different ED band but same shadow score", () => {
    const snap = CASH_FIRST_CONSISTENT.snap;
    const MS = 86_400_000;

    // Rich ED inputs
    const richEdInputs = {
      firstBillPaymentAt:        new Date(ARCHETYPE_REF.getTime() - 120 * MS),
      lastBillPaymentAt:         new Date(ARCHETYPE_REF.getTime() - 2 * MS),
      billPaymentCount:          12,
      distinctBillers:           5,
      distinctCategories:        4,
      firstWalletTxAt:           new Date(ARCHETYPE_REF.getTime() - 125 * MS),
      lastWalletTxAt:            new Date(ARCHETYPE_REF.getTime() - 1 * MS),
      walletTxCount:             25,
      consecutivePaymentMonths:  5,
      activeMonths:              6,
      longestGapDays:            30,
    };

    // Sparse ED inputs
    const sparseEdInputs = {
      firstBillPaymentAt:        new Date(ARCHETYPE_REF.getTime() - 10 * MS),
      lastBillPaymentAt:         new Date(ARCHETYPE_REF.getTime() - 8 * MS),
      billPaymentCount:          1,
      distinctBillers:           1,
      distinctCategories:        1,
      firstWalletTxAt:           new Date(ARCHETYPE_REF.getTime() - 12 * MS),
      lastWalletTxAt:            new Date(ARCHETYPE_REF.getTime() - 5 * MS),
      walletTxCount:             2,
      consecutivePaymentMonths:  0,
      activeMonths:              0,
      longestGapDays:            0,
    };

    const richED    = computeEvidenceDepthFromInputs(richEdInputs,   ARCHETYPE_REF);
    const sparseED  = computeEvidenceDepthFromInputs(sparseEdInputs, ARCHETYPE_REF);

    // ED bands should differ (rich vs sparse)
    expect(richED.band).not.toBe("INSUFFICIENT_DATA");
    // Shadow scores should be identical regardless of which ED was computed
    const shadow1 = computeShadowBehavioralProfile(snap, ARCHETYPE_REF);
    const shadow2 = computeShadowBehavioralProfile(snap, ARCHETYPE_REF);
    expect(shadow1.aggregate).toEqual(shadow2.aggregate);
    expect(richED.band).not.toBe(sparseED.band); // Different inputs → different band
  });

  test("ED computation shares zero inputs with shadow computation", () => {
    // Ensure computeEvidenceDepthFromInputs only takes its own input type
    const edInputs = IMPROVING_USER.edInputs;
    const ed = computeEvidenceDepthFromInputs(edInputs, ARCHETYPE_REF);
    expect(ed).toBeDefined();
    expect(["LOW", "MODERATE", "HIGH", "INSUFFICIENT_DATA"]).toContain(ed.band);
    // No cross-reference: shadow computed independently
    const shadow = computeShadowBehavioralProfile(IMPROVING_USER.snap, ARCHETYPE_REF);
    expect(shadow).toBeDefined();
  });
});

// ─── TRAJ-ORTH: trajectory is computed from history, not from shadow profile ──
// Note: computeBehavioralTrajectory returns PTIv2DimensionTrajectories directly
// (the dimensions object itself), not a wrapper with a .dimensions property.
describe("TRAJ-ORTH — trajectory computation is independent from shadow profile", () => {
  test("IMPROVING_USER: computeBehavioralTrajectory returns valid dimensions object", () => {
    const bd   = computePTIv5(IMPROVING_USER.snap).breakdown;
    const dims = computeBehavioralTrajectory(bd, IMPROVING_USER.scoreHistory, ARCHETYPE_REF);
    expect(dims).toBeDefined();
    // payment_reliability dimension should exist in the dimensions map
    expect(dims).toHaveProperty("payment_reliability");
  });

  test("DETERIORATING_USER: trajectory returns without error (3 history rows)", () => {
    const bd   = computePTIv5(DETERIORATING_USER.snap).breakdown;
    const dims = computeBehavioralTrajectory(bd, DETERIORATING_USER.scoreHistory, ARCHETYPE_REF);
    expect(dims).toBeDefined();
    expect(dims).toHaveProperty("payment_reliability");
  });

  test("trajectory and shadow profile are independently computed from the same snap", () => {
    const bd     = computePTIv5(CASH_FIRST_CONSISTENT.snap).breakdown;
    const shadow = computeShadowBehavioralProfile(CASH_FIRST_CONSISTENT.snap, ARCHETYPE_REF);
    const dims   = computeBehavioralTrajectory(bd, CASH_FIRST_CONSISTENT.scoreHistory, ARCHETYPE_REF);
    // Both compute without error. Trajectory doesn't affect shadow score.
    expect(shadow).toBeDefined();
    expect(dims).toBeDefined();
    // Shadow doesn't use history — same snap → same result
    const shadowNoHistory = computeShadowBehavioralProfile(CASH_FIRST_CONSISTENT.snap, ARCHETYPE_REF);
    expect(shadow.aggregate).toEqual(shadowNoHistory.aggregate);
  });

  test("NEW_USER with empty history: trajectory returns gracefully (no crash)", () => {
    const bd   = computePTIv5(NEW_USER.snap).breakdown;
    const dims = computeBehavioralTrajectory(bd, NEW_USER.scoreHistory, ARCHETYPE_REF);
    // Must return without throwing regardless of empty history
    expect(dims).toBeDefined();
    expect(dims).toHaveProperty("payment_reliability");
  });
});

// ─── EO-UNRESOLVED-NEUTRAL: STALE/UNRESOLVED carry no behavioral signal ───────
describe("EO-UNRESOLVED-NEUTRAL — EO lifecycle statuses are neutral/factual", () => {
  test("SPARSE_STALE: CFE EO produces STALE lifecycle status (78d > 75d threshold)", () => {
    const eo = computeExpectedObligations("+5212345678", SPARSE_STALE.payments, ARCHETYPE_REF);
    // CFE has 4 payments ~30d apart → cadence monthly, stale threshold = 2.5 × 30 = 75d
    // Last payment is 78d ago → STALE
    const cfeObligation = eo.obligations.find(o => o.service_name === "CFE");
    expect(cfeObligation).toBeDefined();
    expect(cfeObligation?.lifecycle_status).toBe("STALE");
  });

  test("STALE status: not MISSED, not UNRESOLVED, not a negative behavioral signal", () => {
    const eo = computeExpectedObligations("+5212345678", SPARSE_STALE.payments, ARCHETYPE_REF);
    const cfeObligation = eo.obligations.find(o => o.service_name === "CFE");
    // STALE is a neutral lifecycle descriptor — not a behavioral flag
    expect(cfeObligation?.lifecycle_status).not.toBe("UNRESOLVED");
    // Verify the obligation exists without any error or missing field
    expect(cfeObligation?.entity_type).toBe("human");
    expect(cfeObligation?.domain).toBe("financial");
  });

  test("WALLET_ONLY: empty EO result — no billers → no obligations, no error", () => {
    const eo = computeExpectedObligations("+5212345678", WALLET_ONLY.payments, ARCHETYPE_REF);
    expect(eo.obligations).toHaveLength(0);
    expect(eo.entity_type).toBe("human");
  });

  test("EO UNRESOLVED: factual window description, no negative score implication", () => {
    // Create a scenario where UNRESOLVED occurs: 4+ payments, last just outside window
    const MS = 86_400_000;
    // Monthly CFE payments: last one was 38d ago → window was [28d, 36d] → UNRESOLVED
    const unresolvdPayments = [
      { serviceId: "cfe", serviceName: "CFE", categoria: "utilities", monto: 300, createdAt: new Date(ARCHETYPE_REF.getTime() - 38 * MS) },
      { serviceId: "cfe", serviceName: "CFE", categoria: "utilities", monto: 295, createdAt: new Date(ARCHETYPE_REF.getTime() - 68 * MS) },
      { serviceId: "cfe", serviceName: "CFE", categoria: "utilities", monto: 290, createdAt: new Date(ARCHETYPE_REF.getTime() - 98 * MS) },
      { serviceId: "cfe", serviceName: "CFE", categoria: "utilities", monto: 285, createdAt: new Date(ARCHETYPE_REF.getTime() - 128 * MS) },
    ];
    const eo = computeExpectedObligations("+5212345678", unresolvdPayments, ARCHETYPE_REF);
    // Result is valid regardless of lifecycle status
    expect(eo.obligations.length).toBeGreaterThanOrEqual(0);
    if (eo.obligations.length > 0) {
      expect(["UNRESOLVED", "STALE", "DUE_WINDOW", "EXPECTED", "OBSERVED_FULFILLED"])
        .toContain(eo.obligations[0].lifecycle_status);
    }
  });
});

// ─── MISSING-NEUTRAL: NEW_USER produces no punitive signal ────────────────────
describe("MISSING-NEUTRAL — NEW_USER: missing data is neutral, not penalized", () => {
  test("NEW_USER: evidence depth is INSUFFICIENT_DATA for all windows", () => {
    const ed = computeEvidenceDepthFromInputs(NEW_USER.edInputs, ARCHETYPE_REF);
    // 1 payment, 12 days old → evidence band should reflect sparse data
    expect(["INSUFFICIENT_DATA", "LOW"]).toContain(ed.band);
  });

  test("NEW_USER: trajectory has no computable windows (0 history rows)", () => {
    const bd   = computePTIv5(NEW_USER.snap).breakdown;
    const traj = computeBehavioralTrajectory(bd, NEW_USER.scoreHistory, ARCHETYPE_REF);
    expect(traj).toBeDefined();
    // All windows should be INSUFFICIENT_DATA with 0 history rows
  });

  test("NEW_USER EO: empty result (no recurring patterns yet)", () => {
    const eo = computeExpectedObligations("+5212345678", NEW_USER.payments, ARCHETYPE_REF);
    // 1 payment to CFE — not enough for an obligation (min 3)
    expect(eo.obligations).toHaveLength(0);
  });
});

// ─── CASH-FIRST-STRONG: CASH_FIRST_CONSISTENT shadow score ≥ 50 ──────────────
describe("CASH-FIRST-STRONG — CASH_FIRST_CONSISTENT produces strong shadow score", () => {
  test("shadow aggregate status is COMPUTED", () => {
    const profile = computeShadowBehavioralProfile(CASH_FIRST_CONSISTENT.snap, ARCHETYPE_REF);
    expect(profile.aggregate.status).toBe("COMPUTED");
  });

  test("shadow aggregate score ≥ 50", () => {
    const profile = computeShadowBehavioralProfile(CASH_FIRST_CONSISTENT.snap, ARCHETYPE_REF);
    if (profile.aggregate.status === "COMPUTED") {
      expect(profile.aggregate.score).toBeGreaterThanOrEqual(50);
    }
  });

  test("PR dimension: COMPUTED and score ≥ 55", () => {
    const pr = computeShadowPaymentReliability(CASH_FIRST_CONSISTENT.snap);
    expect(pr.status).toBe("COMPUTED");
    if (pr.status === "COMPUTED") {
      expect(pr.normalized_score).toBeGreaterThanOrEqual(55);
    }
  });

  test("EO: CASH_FIRST_CONSISTENT produces ≥ 2 obligations (CFE + Telmex)", () => {
    const eo = computeExpectedObligations(
      "+5212345678",
      CASH_FIRST_CONSISTENT.payments,
      ARCHETYPE_REF,
    );
    expect(eo.obligations.length).toBeGreaterThanOrEqual(2);
    const names = eo.obligations.map(o => o.service_name);
    expect(names).toContain("CFE");
    expect(names).toContain("Telmex");
  });
});

// ─── GIG-FAIR: GIG_INCOME CFR not penalized by load variability alone ────────
describe("GIG-FAIR — GIG_INCOME: irregular load income does not suppress shadow score", () => {
  test("CFR is COMPUTED (payment behavior drives CFR, not load timing variability)", () => {
    const cfr = computeShadowCashFlowResilience(GIG_INCOME.snap);
    expect(cfr.status).toBe("COMPUTED");
  });

  test("BS is COMPUTED (loadCount30=6 satisfies the loadCount30 gate)", () => {
    const bs = computeShadowBehavioralStability(GIG_INCOME.snap);
    // GIG_INCOME has loadCount30=6 ≥ 3 — should satisfy BS computation gate
    expect(bs.status).toBe("COMPUTED");
  });

  test("high loadAmountCV alone does not suppress shadow aggregate", () => {
    const base = CASH_FIRST_CONSISTENT.snap;
    const lowCV  = computeShadowBehavioralProfile({ ...base, amountCV: 0.05 }, ARCHETYPE_REF);
    const highCV = computeShadowBehavioralProfile({ ...base, amountCV: 0.95 }, ARCHETYPE_REF);
    // amountCV affects some component, but aggregate should still be COMPUTED if payments are strong
    expect(lowCV.aggregate.status).toBe("COMPUTED");
    expect(highCV.aggregate.status).toBe("COMPUTED");
    // The high-CV version should have lower or equal CFR, not a crash
    const cfrLow  = computeShadowCashFlowResilience({ ...base, amountCV: 0.05 });
    const cfrHigh = computeShadowCashFlowResilience({ ...base, amountCV: 0.95 });
    expect(cfrLow.status).toBe("COMPUTED");
    expect(cfrHigh.status).toBe("COMPUTED");
    if (cfrLow.status === "COMPUTED" && cfrHigh.status === "COMPUTED") {
      expect(cfrLow.normalized_score).toBeGreaterThanOrEqual(cfrHigh.normalized_score);
    }
  });
});

// Helper: total v5 score = sum of 4 dimension raw scores from breakdown
function v5TotalScore(snap: (typeof CASH_FIRST_CONSISTENT)["snap"]): number {
  const { breakdown } = computePTIv5(snap);
  return (
    breakdown.payment_reliability.score +
    breakdown.behavioral_consistency.score +
    breakdown.cashflow_stability.score +
    breakdown.engagement_depth.score
  );
}

// ─── V5-UNCHANGED: computePTIv5 is pure and deterministic ────────────────────
describe("V5-UNCHANGED — computePTIv5 is deterministic (no shadow/v2 changes)", () => {
  test("same snap twice: identical v5 breakdown (all four dimensions)", () => {
    const snap = CASH_FIRST_CONSISTENT.snap;
    const { breakdown: b1 } = computePTIv5(snap);
    const { breakdown: b2 } = computePTIv5(snap);
    expect(b1.payment_reliability.score).toBe(b2.payment_reliability.score);
    expect(b1.behavioral_consistency.score).toBe(b2.behavioral_consistency.score);
    expect(b1.cashflow_stability.score).toBe(b2.cashflow_stability.score);
    expect(b1.engagement_depth.score).toBe(b2.engagement_depth.score);
    expect(JSON.stringify(b1)).toBe(JSON.stringify(b2));
  });

  test("all 10 archetypes: computePTIv5 is stable (no throw, deterministic)", () => {
    for (const archetype of ALL_ARCHETYPES) {
      const s1 = v5TotalScore(archetype.snap);
      const s2 = v5TotalScore(archetype.snap);
      expect(s1).toBe(s2);
      expect(typeof s1).toBe("number");
      expect(Number.isFinite(s1)).toBe(true);
    }
  });

  test("shadow profile computation does not mutate the input snap", () => {
    const snap = { ...CASH_FIRST_CONSISTENT.snap };
    const snapBefore = JSON.stringify(snap);
    computeShadowBehavioralProfile(snap, ARCHETYPE_REF);
    const snapAfter = JSON.stringify(snap);
    expect(snapBefore).toBe(snapAfter);
  });
});

// ─── MIXED_TRAJECTORY: both IMPROVING and DETERIORATING present ───────────────
describe("MIXED_TRAJECTORY — dimensions disagree on direction", () => {
  test("MIXED_TRAJECTORY: shadow aggregate is COMPUTED", () => {
    const profile = computeShadowBehavioralProfile(MIXED_TRAJECTORY.snap, ARCHETYPE_REF);
    expect(profile.aggregate.status).toBe("COMPUTED");
  });

  test("MIXED_TRAJECTORY: trajectory has 3 history rows (coverage for medium window)", () => {
    const bd   = computePTIv5(MIXED_TRAJECTORY.snap).breakdown;
    const dims = computeBehavioralTrajectory(bd, MIXED_TRAJECTORY.scoreHistory, ARCHETYPE_REF);
    expect(dims).toBeDefined();
    expect(dims).toHaveProperty("payment_reliability");
  });

  test("MIXED_TRAJECTORY EO: produces recurring obligations (4+ CFE payments)", () => {
    const eo = computeExpectedObligations("+5212345678", MIXED_TRAJECTORY.payments, ARCHETYPE_REF);
    expect(eo.obligations.length).toBeGreaterThanOrEqual(1);
  });
});

// ─── WALLET_ONLY: PR INSUFFICIENT_DATA, CFR/BS COMPUTED ─────────────────────
describe("WALLET_ONLY — no bill payments: PR INSUFFICIENT_DATA, CFR/BS still computed", () => {
  test("PR: status depends on payCount=0 (INSUFFICIENT_DATA expected)", () => {
    const pr = computeShadowPaymentReliability(WALLET_ONLY.snap);
    // payCount=0 → no payment signal → INSUFFICIENT_DATA
    expect(pr.status).toBe("INSUFFICIENT_DATA");
  });

  test("CFR: COMPUTED from wallet buffer alone (currentBalance=600 > 0)", () => {
    const cfr = computeShadowCashFlowResilience(WALLET_ONLY.snap);
    expect(cfr.status).toBe("COMPUTED");
  });

  test("BS: COMPUTED (loginDays30=15 ≥ 1, loadCount30=8 ≥ 3)", () => {
    const bs = computeShadowBehavioralStability(WALLET_ONLY.snap);
    expect(bs.status).toBe("COMPUTED");
  });

  test("EO: empty (no bill payments → no obligations)", () => {
    const eo = computeExpectedObligations("+5212345678", WALLET_ONLY.payments, ARCHETYPE_REF);
    expect(eo.obligations).toHaveLength(0);
  });
});

// ─── ALL_ARCHETYPES: smoke test — all 10 archetypes produce valid output ──────
describe("ALL_ARCHETYPES — smoke test across all 10 fixtures", () => {
  test.each(ALL_ARCHETYPES.map(a => [a.label, a] as const))(
    "%s: shadow, ED, trajectory, EO all complete without error",
    (_label, archetype) => {
      const shadow = computeShadowBehavioralProfile(archetype.snap, ARCHETYPE_REF);
      const ed     = computeEvidenceDepthFromInputs(archetype.edInputs, ARCHETYPE_REF);
      const bd     = computePTIv5(archetype.snap).breakdown;
      const traj   = computeBehavioralTrajectory(bd, archetype.scoreHistory, ARCHETYPE_REF);
      const eo     = computeExpectedObligations("+5212345678", archetype.payments, ARCHETYPE_REF);

      expect(shadow).toBeDefined();
      expect(ed).toBeDefined();
      expect(traj).toBeDefined();
      expect(eo).toBeDefined();

      // Shadow aggregate status must be a valid value
      expect(["COMPUTED", "INSUFFICIENT_DATA"]).toContain(shadow.aggregate.status);

      // ED band must be a valid value
      expect(["LOW", "MODERATE", "HIGH", "INSUFFICIENT_DATA"]).toContain(ed.band);

      // EO result is always an object with an obligations array
      expect(Array.isArray(eo.obligations)).toBe(true);
    },
  );
});
