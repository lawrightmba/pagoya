import { describe, it, expect } from "vitest";
import { computePTI, computePTIConfidence, getPTITier, PTI_MODEL_VERSION, type PTIDataSnapshot } from "../pti.js";

/**
 * Baseline snapshot: everything at zero / cold-start defaults.
 * Individual tests override just the fields they care about.
 */
function baseSnapshot(overrides: Partial<PTIDataSnapshot> = {}): PTIDataSnapshot {
  return {
    streakMonths: 0,
    payCount: 0,
    domStddev: 15,
    dominantDay: 0,
    advanceDays: 0,
    selfRatio: 0,
    loginDays30: 0,
    hourStd: 12,
    scratchPlays: 0,
    spinPlays: 0,
    missionsDone: 0,
    loadCount30: 0,
    loadDayStd: 30,
    paulaInteractions: 0,
    confirmed2fa: 0,
    declined2fa: 0,
    pushOpens: 0,
    curiosityIndex: 0,
    billerCount: 0,
    kycVerified: false,
    kycTier: "simplified",
    utilityRatio: 0,
    intentClicks: 0,
    hoursToFirst: NaN,
    deviceScore: 0,
    currentBalance: 0,
    totalLoads: 0,
    totalSpend: 0,
    amountCV: 1,
    p2pSendCount: 0,
    p2pRecipientCount: 0,
    daysOld: 0,
    ...overrides,
  };
}

describe("computePTI — zero-data user (brand new signup)", () => {
  const snapshot = baseSnapshot();
  const { breakdown, confidence } = computePTI(snapshot);

  it("scores every dimension at zero", () => {
    console.log("[zero-data] breakdown:", JSON.stringify(breakdown, null, 2));
    expect(breakdown.payment_reliability.score).toBe(0);
    expect(breakdown.behavioral_consistency.score).toBe(0);
    expect(breakdown.engagement_depth.score).toBe(0);
    expect(breakdown.cashflow_stability.score).toBe(0);
    expect(breakdown.total).toBe(0);
  });

  it("reports the correct model version and tier", () => {
    expect(breakdown.model_version).toBe(PTI_MODEL_VERSION);
    const tier = getPTITier(breakdown.total);
    console.log("[zero-data] tier:", tier);
    expect(tier.tier).toBe("iniciando");
  });

  it("is flagged low confidence with explanatory reasons", () => {
    console.log("[zero-data] confidence:", JSON.stringify(confidence, null, 2));
    expect(confidence.level).toBe("low");
    expect(confidence.score).toBe(0);
    expect(confidence.reasons.length).toBeGreaterThan(0);
    expect(confidence.reasons.join(" ")).toMatch(/no confirmed payments/i);
  });

  it("embeds confidence inside the breakdown object", () => {
    expect(breakdown.confidence).toEqual(confidence);
  });
});

describe("computePTI — high-confidence power user", () => {
  const snapshot = baseSnapshot({
    streakMonths: 8,
    payCount: 12,
    domStddev: 1.5,
    dominantDay: 5,
    advanceDays: 8,
    selfRatio: 0.95,
    loginDays30: 25,
    hourStd: 1,
    scratchPlays: 10,
    spinPlays: 8,
    missionsDone: 6,
    loadCount30: 5,
    loadDayStd: 2,
    paulaInteractions: 20,
    confirmed2fa: 5,
    declined2fa: 0,
    pushOpens: 8,
    curiosityIndex: 0.25,
    billerCount: 6,
    kycVerified: true,
    kycTier: "full",
    utilityRatio: 0.8,
    intentClicks: 2,
    hoursToFirst: 4,
    deviceScore: 90,
    currentBalance: 800,
    totalLoads: 3000,
    totalSpend: 2800,
    amountCV: 0.05,
    p2pSendCount: 6,
    p2pRecipientCount: 4,
    daysOld: 200,
  });
  const { breakdown, confidence } = computePTI(snapshot);

  it("maxes out or near-maxes every dimension", () => {
    console.log("[power-user] breakdown:", JSON.stringify(breakdown, null, 2));
    expect(breakdown.payment_reliability.score).toBe(25); // streak min(13,8)=8 + day 4 + advance 8 + self 5
    expect(breakdown.behavioral_consistency.score).toBe(20); // 3+3+3+2+3+2+4
    expect(breakdown.engagement_depth.score).toBe(25); // 6+10+4(capped)+2+3
    expect(breakdown.cashflow_stability.score).toBe(25); // 9+5+4+3+4
    expect(breakdown.total).toBe(95);
  });

  it("lands in the 'excelente' tier", () => {
    const tier = getPTITier(breakdown.total);
    console.log("[power-user] tier:", tier);
    expect(tier.tier).toBe("excelente");
  });

  it("is flagged high confidence with no caveats", () => {
    console.log("[power-user] confidence:", JSON.stringify(confidence, null, 2));
    expect(confidence.level).toBe("high");
    expect(confidence.score).toBe(1);
    expect(confidence.reasons).toEqual([
      "Sufficient payment history, account tenure, and recent activity to trust this score.",
    ]);
  });
});

describe("computePTI — medium-confidence user (some history, still early)", () => {
  const snapshot = baseSnapshot({
    streakMonths: 2,
    payCount: 2,          // below the 3-payment gate for several PR/CF sub-scores
    domStddev: 6,
    dominantDay: 15,
    advanceDays: 3,
    selfRatio: 0.6,
    loginDays30: 6,
    hourStd: 5,
    loadCount30: 1,
    paulaInteractions: 5,
    confirmed2fa: 1,
    pushOpens: 3,
    curiosityIndex: 0.06,
    billerCount: 2,
    kycVerified: true,
    kycTier: "simplified",
    utilityRatio: 0.5,
    hoursToFirst: 20,
    deviceScore: 40,
    currentBalance: 150,
    totalLoads: 300,
    totalSpend: 500,
    amountCV: 0.4,
    p2pSendCount: 1,
    daysOld: 20,
  });
  const { breakdown, confidence } = computePTI(snapshot);

  it("gates payCount<3 sub-scores to zero even with decent underlying values", () => {
    console.log("[medium] breakdown:", JSON.stringify(breakdown, null, 2));
    expect(breakdown.payment_reliability.components.payment_day_consistency.score).toBe(0);
    expect(breakdown.payment_reliability.components.advance_payment_days.score).toBe(0);
    expect(breakdown.payment_reliability.components.self_initiated_ratio.score).toBe(0);
    // payCount is 2, which meets the >=2 gate for volatility (unlike the >=3 gates above)
    expect(breakdown.cashflow_stability.components.payment_amount_volatility.score).toBe(2);
  });

  it("keeps payment_day_consistency's .score (consistency signal) distinct from .value (raw dominant day-of-month)", () => {
    // Regression guard: pti_behavioral_signals.payment_day_consistency must persist the
    // CONSISTENCY SCORE, not the raw dominant-day value (dominantDay=15 here) — a prior
    // refactor accidentally wired .value (= dominantDay) into that column instead of .score.
    const component = breakdown.payment_reliability.components.payment_day_consistency;
    expect(component.value).toBe(15); // raw dominantDay passed straight through
    expect(component.score).not.toBe(component.value);
    expect(component.score).toBe(0); // gated to 0 here since payCount(2) < 3
  });

  it("computes plausible non-zero scores for every dimension", () => {
    expect(breakdown.payment_reliability.score).toBe(2); // only streak: min(13,2)
    expect(breakdown.behavioral_consistency.score).toBeGreaterThan(0);
    expect(breakdown.engagement_depth.score).toBeGreaterThan(0);
    expect(breakdown.cashflow_stability.score).toBeGreaterThan(0);
    expect(breakdown.total).toBeGreaterThan(0);
    expect(breakdown.total).toBeLessThan(100);
  });

  it("is flagged medium confidence with caveats about payment count and tenure", () => {
    console.log("[medium] confidence:", JSON.stringify(confidence, null, 2));
    expect(confidence.level).toBe("medium");
    expect(confidence.score).toBeGreaterThan(0);
    expect(confidence.score).toBeLessThan(1);
    expect(confidence.reasons.some(r => /confirmed payment/i.test(r))).toBe(true);
    expect(confidence.reasons.some(r => /day\(s\) old/i.test(r))).toBe(true);
  });
});

describe("computePTIConfidence — dimension-boundary cases", () => {
  it("is exactly at the high threshold (payCount=3, daysOld=30, loginDays30=4)", () => {
    const snapshot = baseSnapshot({ payCount: 3, daysOld: 30, loginDays30: 4 });
    const confidence = computePTIConfidence(snapshot);
    console.log("[boundary=high] confidence:", JSON.stringify(confidence, null, 2));
    expect(confidence.level).toBe("high");
  });

  it("drops to medium just below the high threshold (loginDays30=3)", () => {
    const snapshot = baseSnapshot({ payCount: 3, daysOld: 30, loginDays30: 3 });
    const confidence = computePTIConfidence(snapshot);
    console.log("[boundary=just-below-high] confidence:", JSON.stringify(confidence, null, 2));
    expect(confidence.level).toBe("medium");
  });

  it("is exactly at the low threshold (payCount=0, daysOld=6)", () => {
    const snapshot = baseSnapshot({ payCount: 0, daysOld: 6 });
    const confidence = computePTIConfidence(snapshot);
    console.log("[boundary=low] confidence:", JSON.stringify(confidence, null, 2));
    expect(confidence.level).toBe("low");
  });

  it("moves to medium at daysOld=7 with zero payments (no longer 'brand new')", () => {
    const snapshot = baseSnapshot({ payCount: 0, daysOld: 7 });
    const confidence = computePTIConfidence(snapshot);
    console.log("[boundary=daysOld=7] confidence:", JSON.stringify(confidence, null, 2));
    expect(confidence.level).toBe("medium");
  });

  it("score formula matches the documented 0.5/0.3/0.2 weighting", () => {
    const snapshot = baseSnapshot({ payCount: 3, daysOld: 15, loginDays30: 2 });
    const confidence = computePTIConfidence(snapshot);
    // paymentDepth=1, tenureDepth=15/30=0.5, activityDepth=2/4=0.5
    const expected = Math.round((0.5 * 1 + 0.3 * 0.5 + 0.2 * 0.5) * 100) / 100;
    console.log("[boundary=weighting] confidence:", JSON.stringify(confidence, null, 2), "expected score:", expected);
    expect(confidence.score).toBe(expected);
  });
});

describe("computePTI — dimension sub-score boundary cases", () => {
  it("payment_day_consistency steps down cleanly at each stddev threshold", () => {
    const cases = [
      { domStddev: 2, expected: 4 },
      { domStddev: 5, expected: 3 },
      { domStddev: 8, expected: 2 },
      { domStddev: 12, expected: 1 },
      { domStddev: 12.01, expected: 0 },
    ];
    for (const { domStddev, expected } of cases) {
      const snapshot = baseSnapshot({ payCount: 3, domStddev });
      const { breakdown } = computePTI(snapshot);
      console.log(`[dom_stddev=${domStddev}] payment_day_consistency score:`, breakdown.payment_reliability.components.payment_day_consistency.score);
      expect(breakdown.payment_reliability.components.payment_day_consistency.score).toBe(expected);
    }
  });

  it("kyc_verified distinguishes simplified (7pts) vs full (10pts) tiers", () => {
    const simplified = computePTI(baseSnapshot({ kycVerified: true, kycTier: "simplified" })).breakdown;
    const full = computePTI(baseSnapshot({ kycVerified: true, kycTier: "full" })).breakdown;
    const none = computePTI(baseSnapshot({ kycVerified: false })).breakdown;
    console.log("[kyc] simplified:", simplified.engagement_depth.components.kyc_verified.score,
                "full:", full.engagement_depth.components.kyc_verified.score,
                "none:", none.engagement_depth.components.kyc_verified.score);
    expect(simplified.engagement_depth.components.kyc_verified.score).toBe(7);
    expect(full.engagement_depth.components.kyc_verified.score).toBe(10);
    expect(none.engagement_depth.components.kyc_verified.score).toBe(0);
  });

  it("account_age steps at 7/30/90 day thresholds", () => {
    const cases = [
      { daysOld: 6, expected: 0 },
      { daysOld: 7, expected: 1 },
      { daysOld: 29, expected: 1 },
      { daysOld: 30, expected: 3 },
      { daysOld: 89, expected: 3 },
      { daysOld: 90, expected: 4 },
    ];
    for (const { daysOld, expected } of cases) {
      const { breakdown } = computePTI(baseSnapshot({ daysOld }));
      console.log(`[daysOld=${daysOld}] account_age score:`, breakdown.cashflow_stability.components.account_age.score);
      expect(breakdown.cashflow_stability.components.account_age.score).toBe(expected);
    }
  });

  it("total is capped at 100 even if dimensions could theoretically exceed it", () => {
    const snapshot = baseSnapshot({
      streakMonths: 999, payCount: 50, domStddev: 0, advanceDays: 30, selfRatio: 1,
      loginDays30: 30, hourStd: 0, scratchPlays: 100, spinPlays: 100, missionsDone: 50,
      loadCount30: 50, loadDayStd: 0, paulaInteractions: 100, confirmed2fa: 100, declined2fa: 0,
      pushOpens: 100, curiosityIndex: 1, billerCount: 100, kycVerified: true, kycTier: "full",
      utilityRatio: 1, intentClicks: 10, hoursToFirst: 1, deviceScore: 100, currentBalance: 999999,
      totalLoads: 999999, totalSpend: 1, amountCV: 0, p2pSendCount: 100, p2pRecipientCount: 100,
      daysOld: 9999,
    });
    const { breakdown } = computePTI(snapshot);
    console.log("[max-out] total:", breakdown.total);
    expect(breakdown.total).toBeLessThanOrEqual(100);
  });
});

describe("getPTITier — boundary cases", () => {
  it.each([
    [0, "iniciando"],
    [39, "iniciando"],
    [40, "en_proceso"],
    [59, "en_proceso"],
    [60, "bueno"],
    [79, "bueno"],
    [80, "excelente"],
    [100, "excelente"],
  ])("score=%d maps to tier=%s", (score, expectedTier) => {
    const tier = getPTITier(score);
    console.log(`[tier score=${score}]`, tier);
    expect(tier.tier).toBe(expectedTier);
  });
});
