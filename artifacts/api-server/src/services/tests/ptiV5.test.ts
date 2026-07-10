import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { computePTIv5, PTI_V5_MODEL_VERSION } from "../ptiV5.js";
import { computePTI, type PTIDataSnapshot } from "../pti.js";
import { PTI_V5_FIELD_DISPOSITION, PTI_V5_POINT_ALLOCATION } from "../../config/ptiV5Disposition.js";

function baseSnapshot(overrides: Partial<PTIDataSnapshot> = {}): PTIDataSnapshot {
  return {
    streakMonths: 0, payCount: 0, domStddev: 99, dominantDay: 1, advanceDays: 0, selfRatio: 0,
    loginDays30: 0, hourStd: 99, scratchPlays: 0, spinPlays: 0, missionsDone: 0,
    loadCount30: 0, loadDayStd: 99, paulaInteractions: 0, confirmed2fa: 0, declined2fa: 0,
    pushOpens: 0, curiosityIndex: 0,
    billerCount: 0, kycVerified: false, kycTier: "simplified", utilityRatio: 0, intentClicks: 0,
    hoursToFirst: NaN, deviceScore: 0,
    currentBalance: 0, totalLoads: 0, totalSpend: 0, amountCV: 1, p2pSendCount: 0, p2pRecipientCount: 0,
    daysOld: 0, daysToFirstSpei: NaN, oxxoLoadCount: 0, speiLoadCount: 0, cardLoadCount: 0,
    lateRecoveryRatio: NaN, latePaymentCount: 0, paulaResponseLatencyMinutes: NaN,
    ...overrides,
  };
}

describe("computePTIv5 — v5.0.0-rc1 shadow model (Phase B, PTI fair-lending remediation)", () => {
  it("tags output with the v5 model version, not the v4.3 one", () => {
    const { breakdown } = computePTIv5(baseSnapshot());
    expect(breakdown.model_version).toBe(PTI_V5_MODEL_VERSION);
    expect(breakdown.model_version).not.toBe("v4.3-signal-expansion");
  });

  it("dimension maxes match the signed spec §3.1 cap table (PR36/BC22/ED22/CF20=100)", () => {
    const { breakdown } = computePTIv5(baseSnapshot());
    expect(breakdown.payment_reliability.max).toBe(PTI_V5_POINT_ALLOCATION.payment_reliability_max);
    expect(breakdown.behavioral_consistency.max).toBe(PTI_V5_POINT_ALLOCATION.behavioral_consistency_max);
    expect(breakdown.engagement_depth.max).toBe(PTI_V5_POINT_ALLOCATION.engagement_depth_max);
    expect(breakdown.cashflow_stability.max).toBe(PTI_V5_POINT_ALLOCATION.cashflow_stability_max);
    expect(
      breakdown.payment_reliability.max + breakdown.behavioral_consistency.max +
      breakdown.engagement_depth.max + breakdown.cashflow_stability.max,
    ).toBe(100);
  });

  describe("payment_streak — fully respecified formula", () => {
    const cases = [
      { streakMonths: 0, expected: 0 },
      { streakMonths: 2, expected: 0 },
      { streakMonths: 3, expected: 4 },
      { streakMonths: 4, expected: 8 },
      { streakMonths: 5, expected: 12 },
      { streakMonths: 6, expected: 16 },
      { streakMonths: 10, expected: 16 }, // capped at full (max)
    ];
    for (const { streakMonths, expected } of cases) {
      it(`streakMonths=${streakMonths} -> ${expected}`, () => {
        const { breakdown } = computePTIv5(baseSnapshot({ streakMonths }));
        console.log(`[payment_streak] streakMonths=${streakMonths} score=${breakdown.payment_reliability.components.payment_streak.score}`);
        expect(breakdown.payment_reliability.components.payment_streak.score).toBe(expected);
      });
    }
  });

  describe("biller_diversity — fully respecified formula (proxy = min(billerCount, floor(payCount/2)))", () => {
    const cases = [
      { billerCount: 1, payCount: 2, expected: 0 },   // verified=1
      { billerCount: 3, payCount: 6, expected: 0 },   // verified=3, at the "0 at <=3" boundary
      { billerCount: 4, payCount: 8, expected: 5.5 }, // verified=4
      { billerCount: 5, payCount: 10, expected: 11 }, // verified=5, full
      { billerCount: 10, payCount: 30, expected: 11 }, // verified capped by proxy formula, still full
    ];
    for (const { billerCount, payCount, expected } of cases) {
      it(`billerCount=${billerCount},payCount=${payCount} -> ${expected}`, () => {
        const { breakdown } = computePTIv5(baseSnapshot({ billerCount, payCount }));
        console.log(`[biller_diversity] billerCount=${billerCount} payCount=${payCount} score=${breakdown.engagement_depth.components.biller_diversity.score}`);
        expect(breakdown.engagement_depth.components.biller_diversity.score).toBe(expected);
      });
    }
  });

  it("shadow-demoted fields (kyc_verified, device_consistency, wallet_balance, bancarization_speed, funding_channel_mix) always score 0", () => {
    const { breakdown } = computePTIv5(baseSnapshot({
      kycVerified: true, deviceScore: 100, currentBalance: 5000, daysToFirstSpei: 1,
      oxxoLoadCount: 0, speiLoadCount: 20, cardLoadCount: 0,
    }));
    for (const key of Object.keys(PTI_V5_FIELD_DISPOSITION)) {
      const componentScores = [
        breakdown.engagement_depth.components[key]?.score,
        breakdown.cashflow_stability.components[key]?.score,
      ].filter((v) => v !== undefined);
      console.log(`[shadow-demoted] ${key} scores found:`, componentScores);
      expect(componentScores.length).toBeGreaterThan(0);
      for (const s of componentScores) expect(s).toBe(0);
    }
  });

  it("total never exceeds 100 even with maximal inputs", () => {
    const { breakdown } = computePTIv5(baseSnapshot({
      streakMonths: 12, payCount: 20, domStddev: 0, dominantDay: 1, advanceDays: 10, selfRatio: 1,
      loginDays30: 30, hourStd: 0, scratchPlays: 50, spinPlays: 50, missionsDone: 50,
      loadCount30: 10, loadDayStd: 0, paulaInteractions: 30, confirmed2fa: 10, declined2fa: 0,
      pushOpens: 10, curiosityIndex: 1, billerCount: 20, utilityRatio: 1, intentClicks: 5,
      hoursToFirst: 1, currentBalance: 100000, totalLoads: 100000, totalSpend: 90000, amountCV: 0,
      p2pSendCount: 10, p2pRecipientCount: 10, daysOld: 400, lateRecoveryRatio: 1, latePaymentCount: 1,
      paulaResponseLatencyMinutes: 1,
    }));
    console.log("[max inputs] total:", breakdown.total);
    expect(breakdown.total).toBeLessThanOrEqual(100);
  });

  it("never references colonia or declared_income_bucket in source (regression guard, extends pti.ts guard to v5)", () => {
    const thisFileUrl = import.meta.url;
    const ptiV5Path = fileURLToPath(new URL("../ptiV5.ts", thisFileUrl));
    const source = readFileSync(ptiV5Path, "utf-8");
    console.log("[fair-lending guard] scanned ptiV5.ts for forbidden field references");
    expect(source).not.toMatch(/\bcolonia\b/i);
    expect(source).not.toMatch(/declared_income_bucket|declaredIncomeBucket/i);
    expect(source).not.toMatch(/fairLendingMapping|fairLendingAdjustment/);
  });

  it("produces byte-identical v5 output whether or not fair-lending fields exist on the snapshot", () => {
    const base = baseSnapshot({ payCount: 5, daysOld: 60, streakMonths: 4, billerCount: 3 });
    const withExtraFields = { ...base, colonia: "Roma Norte", declaredIncomeBucket: "bucket_3" } as PTIDataSnapshot;
    const a = computePTIv5(base);
    const b = computePTIv5(withExtraFields);
    expect(b.breakdown).toEqual(a.breakdown);
    expect(b.confidence).toEqual(a.confidence);
  });

  it("v5 and v4.3 diverge (proves v5 is not silently falling back to v4.3 logic)", () => {
    const snap = baseSnapshot({ streakMonths: 4, payCount: 4, billerCount: 4 });
    const v4 = computePTI(snap);
    const v5 = computePTIv5(snap);
    console.log("[v4 vs v5] v4.total:", v4.breakdown.total, "v5.total:", v5.breakdown.total);
    expect(v5.breakdown.total).not.toBe(v4.breakdown.total);
    expect(v5.breakdown.model_version).not.toBe(v4.breakdown.model_version);
  });
});
