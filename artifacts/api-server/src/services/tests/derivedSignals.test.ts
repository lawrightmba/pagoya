import { describe, it, expect } from "vitest";
import {
  computePaymentRailSwitching,
  computeConditionalPaulaLatency,
  computeInflowCV,
  computeKycStaleness,
  getFailedPaymentSignal,
} from "../derivedSignals.js";

// Additive instrumentation only — these tests confirm each query runs and
// returns a well-shaped result for a nonexistent telefono (safe default
// path), not that specific numeric values are produced (the underlying
// tables are near-empty in dev as of 2026-07-05; see report).
describe("derivedSignals (additive PTI instrumentation, not wired into scoring)", () => {
  const NOPE = "0000000000";

  it("computePaymentRailSwitching returns zeroed defaults for a user with no loads", async () => {
    const r = await computePaymentRailSwitching(NOPE);
    expect(r.telefono).toBe(NOPE);
    expect(r.distinctRailsUsed).toBe(0);
    expect(r.railSwitches90d).toBe(0);
  });

  it("computeConditionalPaulaLatency returns NaN latency with zero sends for a user with no risk-trigger sends", async () => {
    const r = await computeConditionalPaulaLatency(NOPE);
    expect(r.telefono).toBe(NOPE);
    expect(Number.isNaN(r.medianMinutesRiskTriggers)).toBe(true);
    expect(r.riskSendsWithReply).toBe(0);
    expect(r.riskSendsTotal).toBe(0);
  });

  it("computeInflowCV returns NaN cv with zero loads for a user with no wallet loads", async () => {
    const r = await computeInflowCV(NOPE);
    expect(r.telefono).toBe(NOPE);
    expect(r.loadCount90d).toBe(0);
    expect(Number.isNaN(r.inflowCV)).toBe(true);
  });

  it("computeKycStaleness returns null staleness for an unverified/nonexistent user", async () => {
    const r = await computeKycStaleness(NOPE);
    expect(r.telefono).toBe(NOPE);
    expect(r.kycVerifiedAt).toBeNull();
    expect(r.kycStalenessDays).toBeNull();
  });

  it("getFailedPaymentSignal returns zero failed attempts for a user with no failures", async () => {
    const r = await getFailedPaymentSignal(NOPE);
    expect(r.telefono).toBe(NOPE);
    expect(r.failedAttempts90d).toBe(0);
  });
});
