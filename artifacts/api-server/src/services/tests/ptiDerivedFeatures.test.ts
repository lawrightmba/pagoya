import { describe, it, expect } from "vitest";
import {
  DERIVED_FEATURE_DEFAULTS,
  computePaymentTimingMeanDays,
  computePaymentTimingVarianceDays,
  rollingStdDev,
  computeVelocity,
  computeInterEventRegularity,
} from "../ptiDerivedFeatures.js";

describe("ptiDerivedFeatures — DERIVED_FEATURE_DEFAULTS", () => {
  it("is all-zero (neutral / zero-weight)", () => {
    expect(DERIVED_FEATURE_DEFAULTS).toEqual({
      paymentTimingMeanDaysFromDue: 0,
      paymentTimingVarianceDaysFromDue: 0,
      activityVelocity30d: 0,
      interEventRegularityScore: 0,
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
