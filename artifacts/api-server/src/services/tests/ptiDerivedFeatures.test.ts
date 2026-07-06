import { describe, it, expect } from "vitest";
import {
  DERIVED_FEATURE_DEFAULTS,
  computePaymentTimingMeanDays,
  computePaymentTimingVarianceDays,
  rollingStdDev,
  computeVelocity,
  computeInterEventRegularity,
  computeMinBalanceBuffer30d,
  computeDaysAtZeroPerMonth,
  computeDrawdownVelocity,
  computeLoadIntervalEntropy,
  computeLoadAmountCV,
  computePreDueStagingIndex,
  computeLoadToObligationRatio,
  type UserBillerInput,
} from "../ptiDerivedFeatures.js";
import type { WalletTransactionInput, BalancePoint } from "../walletBalanceReconstruction.js";

describe("ptiDerivedFeatures — DERIVED_FEATURE_DEFAULTS", () => {
  it("is all-zero/null (neutral / zero-weight)", () => {
    expect(DERIVED_FEATURE_DEFAULTS).toEqual({
      paymentTimingMeanDaysFromDue: 0,
      paymentTimingVarianceDaysFromDue: 0,
      activityVelocity30d: 0,
      interEventRegularityScore: 0,
      minBalanceBuffer30d: 0,
      daysAtZeroPerMonth: 0,
      drawdownVelocity: 0,
      loadIntervalEntropy: 0,
      loadAmountCV: 0,
      preDueStagingIndex: null,
      loadToObligationRatio: null,
      sequencingStability: null,
      shockPaidFullRate: 0,
      billShockWalletResponseRate: 0,
    });
  });
});

describe("computePaymentTimingMeanDays (Part A)", () => {
  it("returns 0 for empty input", () => {
    expect(computePaymentTimingMeanDays([])).toBe(0);
  });

  it("averages a simple series", () => {
    expect(computePaymentTimingMeanDays([2, 4, 6])).toBe(4);
  });

  it("winsorizes outliers to +/-20 before averaging", () => {
    // 100 gets clamped to 20, -100 gets clamped to -20 -> mean of [20, -20, 0] = 0
    expect(computePaymentTimingMeanDays([100, -100, 0])).toBe(0);
  });

  it("treats NaN entries as 0 after winsorizing", () => {
    expect(computePaymentTimingMeanDays([NaN, 10])).toBe(5);
  });
});

describe("computePaymentTimingVarianceDays (Part A)", () => {
  it("returns 0 for fewer than 2 data points", () => {
    expect(computePaymentTimingVarianceDays([])).toBe(0);
    expect(computePaymentTimingVarianceDays([5])).toBe(0);
  });

  it("computes sample variance on a simple series", () => {
    // [2,4,6] mean=4, sq diffs = 4,0,4 -> sum=8 / (n-1=2) = 4
    expect(computePaymentTimingVarianceDays([2, 4, 6])).toBe(4);
  });

  it("is 0 for a perfectly constant series", () => {
    expect(computePaymentTimingVarianceDays([5, 5, 5])).toBe(0);
  });
});

describe("rollingStdDev (Part B, generic)", () => {
  it("returns [] for empty input or window < 2", () => {
    expect(rollingStdDev([], 3)).toEqual([]);
    expect(rollingStdDev([1, 2, 3], 1)).toEqual([]);
  });

  it("returns one value per input element", () => {
    const out = rollingStdDev([1, 2, 3, 4, 5], 3);
    expect(out.length).toBe(5);
  });

  it("first element (no prior window) is 0", () => {
    const out = rollingStdDev([10, 20, 30], 2);
    expect(out[0]).toBe(0);
  });

  it("is 0 across a perfectly flat series", () => {
    const out = rollingStdDev([7, 7, 7, 7], 2);
    expect(out.every((v) => v === 0)).toBe(true);
  });
});

describe("computeVelocity (Part B, generic)", () => {
  it("returns 0 for fewer than 2 points", () => {
    expect(computeVelocity([])).toBe(0);
    expect(computeVelocity([5])).toBe(0);
  });

  it("computes average delta for a monotonic series", () => {
    expect(computeVelocity([1, 3, 5, 7])).toBe(2);
  });

  it("is negative for a declining series", () => {
    expect(computeVelocity([10, 5, 0])).toBe(-5);
  });

  it("is 0 for a flat series", () => {
    expect(computeVelocity([4, 4, 4])).toBe(0);
  });
});

describe("computeInterEventRegularity (Part B, generic)", () => {
  it("returns 0 for fewer than 3 timestamps", () => {
    expect(computeInterEventRegularity([])).toBe(0);
    expect(computeInterEventRegularity([1, 2])).toBe(0);
  });

  it("returns 1 for perfectly evenly-spaced events", () => {
    expect(computeInterEventRegularity([0, 100, 200, 300])).toBe(1);
  });

  it("is lower for irregularly-spaced events than for regular ones", () => {
    const regular = computeInterEventRegularity([0, 100, 200, 300, 400]);
    const irregular = computeInterEventRegularity([0, 10, 400, 410, 900]);
    expect(irregular).toBeLessThan(regular);
  });

  it("is order-independent (sorts timestamps internally)", () => {
    const sorted = computeInterEventRegularity([0, 100, 200, 300]);
    const shuffled = computeInterEventRegularity([300, 0, 200, 100]);
    expect(shuffled).toBe(sorted);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Prompt 2, Stage 2, Part A/B tests
// ─────────────────────────────────────────────────────────────────────────

function bp(daysFromEpoch: number, balance: number): BalancePoint {
  return {
    timestamp: new Date(Date.UTC(2026, 0, 1 + daysFromEpoch)),
    balance,
    transactionId: `t-${daysFromEpoch}-${balance}`,
    type: "load_oxxo",
  };
}

let idCounter = 0;
function wtx(overrides: Partial<WalletTransactionInput> & { type: string; status: string; amountMxn: number }): WalletTransactionInput {
  idCounter += 1;
  return {
    id: `wtx-${idCounter}`,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    confirmedAt: null,
    ...overrides,
  };
}

describe("computeMinBalanceBuffer30d (Prompt 2, Part A)", () => {
  const asOf = new Date(Date.UTC(2026, 0, 31));

  it("returns the opening-balance assumption (0) when the series is empty", () => {
    expect(computeMinBalanceBuffer30d([], asOf)).toBe(0);
  });

  it("finds the minimum within the trailing 30-day window, ignoring points before it", () => {
    // A point strictly before the window (bp(-5, ...)) establishes the
    // carried starting balance for the window; without one, the opening
    // balance assumption (0) is the floor for the whole window.
    const series = [bp(-5, 9999), bp(5, 100), bp(20, 5), bp(29, 50)];
    expect(computeMinBalanceBuffer30d(series, asOf)).toBe(5);
  });

  it("carries the last balance from before the window as the starting floor", () => {
    const series = [bp(-10, 3), bp(25, 40)];
    expect(computeMinBalanceBuffer30d(series, asOf)).toBe(3);
  });
});

describe("computeDaysAtZeroPerMonth (Prompt 2, Part A)", () => {
  const asOf = new Date(Date.UTC(2026, 0, 31, 12));

  it("returns 0 when the balance never touches zero", () => {
    const series = [bp(0, 100), bp(30, 200)];
    expect(computeDaysAtZeroPerMonth(series, asOf)).toBe(0);
  });

  it("counts calendar days where end-of-day balance is exactly 0", () => {
    const series = [bp(0, 100), bp(10, 0), bp(15, 50)];
    expect(computeDaysAtZeroPerMonth(series, asOf)).toBeGreaterThan(0);
  });

  it("zero-balance start (no transactions before window) does not count as zero days once funded", () => {
    const series = [bp(0, 500)];
    expect(computeDaysAtZeroPerMonth(series, asOf)).toBe(0);
  });
});

describe("computeDrawdownVelocity (Prompt 2, Part A)", () => {
  it("returns 0 when there are no loads", () => {
    expect(computeDrawdownVelocity([])).toBe(0);
  });

  it("computes the spend-within-72h / load-amount ratio for a single load", () => {
    const load = wtx({ type: "load_oxxo", status: "confirmed", amountMxn: 100, createdAt: new Date("2026-02-01T00:00:00Z") });
    const spend = wtx({ type: "bill_pay", status: "confirmed", amountMxn: 50, createdAt: new Date("2026-02-01T10:00:00Z") });
    expect(computeDrawdownVelocity([load, spend])).toBe(0.5);
  });

  it("caps the ratio at 1.0 even if spend exceeds the load amount", () => {
    const load = wtx({ type: "load_oxxo", status: "confirmed", amountMxn: 100, createdAt: new Date("2026-02-01T00:00:00Z") });
    const spend = wtx({ type: "bill_pay", status: "confirmed", amountMxn: 500, createdAt: new Date("2026-02-01T10:00:00Z") });
    expect(computeDrawdownVelocity([load, spend])).toBe(1);
  });

  it("ignores non-balance-real (pending/failed) transactions", () => {
    const load = wtx({ type: "load_oxxo", status: "pending", amountMxn: 100, createdAt: new Date("2026-02-01T00:00:00Z") });
    expect(computeDrawdownVelocity([load])).toBe(0);
  });
});

describe("computeLoadIntervalEntropy (Prompt 2, Part A)", () => {
  it("returns 0 with fewer than 3 loads", () => {
    const loads = [
      wtx({ type: "load_oxxo", status: "confirmed", amountMxn: 100, createdAt: new Date("2026-01-01T00:00:00Z") }),
    ];
    expect(computeLoadIntervalEntropy(loads)).toBe(0);
  });

  it("returns 1 for perfectly evenly-spaced loads", () => {
    const loads = [0, 10, 20, 30].map((d) =>
      wtx({ type: "load_card", status: "confirmed", amountMxn: 100, createdAt: new Date(Date.UTC(2026, 0, 1 + d)) }),
    );
    expect(computeLoadIntervalEntropy(loads)).toBe(1);
  });
});

describe("computeLoadAmountCV (Prompt 2, Part A)", () => {
  const asOf = new Date(Date.UTC(2026, 3, 1));

  it("returns 0 with fewer than 2 in-window loads", () => {
    const loads = [wtx({ type: "load_oxxo", status: "confirmed", amountMxn: 100, createdAt: new Date(Date.UTC(2026, 2, 20)) })];
    expect(computeLoadAmountCV(loads, asOf)).toBe(0);
  });

  it("is 0 for identical load amounts", () => {
    const loads = [100, 100, 100].map((amt) =>
      wtx({ type: "load_oxxo", status: "confirmed", amountMxn: amt, createdAt: new Date(Date.UTC(2026, 2, 20)) }),
    );
    expect(computeLoadAmountCV(loads, asOf)).toBe(0);
  });

  it("is positive for varying load amounts", () => {
    const loads = [50, 100, 200].map((amt) =>
      wtx({ type: "load_oxxo", status: "confirmed", amountMxn: amt, createdAt: new Date(Date.UTC(2026, 2, 20)) }),
    );
    expect(computeLoadAmountCV(loads, asOf)).toBeGreaterThan(0);
  });

  it("excludes loads outside the trailing-90-day window", () => {
    const inWindow = wtx({ type: "load_oxxo", status: "confirmed", amountMxn: 100, createdAt: new Date(Date.UTC(2026, 2, 20)) });
    const outOfWindow = wtx({ type: "load_oxxo", status: "confirmed", amountMxn: 9999, createdAt: new Date(Date.UTC(2025, 0, 1)) });
    expect(computeLoadAmountCV([inWindow, outOfWindow], asOf)).toBe(0); // only 1 in-window load
  });
});

describe("computePreDueStagingIndex (Prompt 2, Part B)", () => {
  const asOf = new Date(Date.UTC(2026, 3, 1));

  it("returns null for zero billers (the documented every-real-user-today case)", () => {
    expect(computePreDueStagingIndex([], [bp(0, 100)], asOf)).toBeNull();
  });

  it("returns a fraction between 0 and 1 when billers are present", () => {
    const billers: UserBillerInput[] = [{ billerId: "cfe", paymentDay: 15, typicalAmount: 200 }];
    const series = [bp(-400, 1000)];
    const result = computePreDueStagingIndex(billers, series, asOf);
    expect(result).not.toBeNull();
    expect(result as number).toBeGreaterThanOrEqual(0);
    expect(result as number).toBeLessThanOrEqual(1);
  });
});

describe("computeLoadToObligationRatio (Prompt 2, Part B)", () => {
  const asOf = new Date(Date.UTC(2026, 3, 1));

  it("returns null for zero billers", () => {
    expect(computeLoadToObligationRatio([], [], asOf)).toBeNull();
  });

  it("computes trailing-90d loads over trailing-90d predicted obligation total", () => {
    const billers: UserBillerInput[] = [{ billerId: "cfe", paymentDay: 15, typicalAmount: 100 }];
    const loads = [wtx({ type: "load_oxxo", status: "confirmed", amountMxn: 300, createdAt: new Date(Date.UTC(2026, 2, 20)) })];
    const result = computeLoadToObligationRatio(billers, loads, asOf);
    expect(result).not.toBeNull();
    expect(result as number).toBeGreaterThan(0);
  });
});
