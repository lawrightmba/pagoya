import { describe, it, expect } from "vitest";
import {
  detectBillShockEvents,
  computeShockPaidFullRate,
  computeBillShockWalletResponseRate,
  detectScarcityEvents,
  computeSequencingStability,
  classifyBillShockResponse,
  type BillPaymentInput,
  type BalanceLookup,
} from "../ptiEventFeatures.js";
import type { UserBillerInput } from "../ptiDerivedFeatures.js";

let counter = 0;
function pay(overrides: Partial<BillPaymentInput> & { serviceId: string; monto: number }): BillPaymentInput {
  counter += 1;
  return {
    status: "confirmed",
    channel: "wallet_balance",
    createdAt: new Date(Date.UTC(2026, 0, 1 + counter)),
    ...overrides,
  };
}

function baselineRun(serviceId: string, amounts: number[], startDay: number): BillPaymentInput[] {
  return amounts.map((amt, i) =>
    pay({ serviceId, monto: amt, createdAt: new Date(Date.UTC(2026, 0, startDay + i)) }),
  );
}

describe("detectBillShockEvents", () => {
  it("returns [] when a service has fewer than 6 prior non-excluded payments", () => {
    const payments = baselineRun("cfe", [100, 100, 100], 1);
    expect(detectBillShockEvents(payments)).toEqual([]);
  });

  it("flags a payment >= 1.5x the trailing-6 median as a shock event", () => {
    const history = baselineRun("cfe", [100, 100, 100, 100, 100, 100], 1);
    const shock = pay({ serviceId: "cfe", monto: 200, createdAt: new Date(Date.UTC(2026, 0, 10)) });
    const events = detectBillShockEvents([...history, shock]);
    expect(events).toHaveLength(1);
    expect(events[0].monto).toBe(200);
    expect(events[0].baselineMedian).toBe(100);
  });

  it("does not flag a payment just under the 1.5x threshold", () => {
    const history = baselineRun("cfe", [100, 100, 100, 100, 100, 100], 1);
    const notShock = pay({ serviceId: "cfe", monto: 149, createdAt: new Date(Date.UTC(2026, 0, 10)) });
    expect(detectBillShockEvents([...history, notShock])).toEqual([]);
  });

  it("excludes fallido/solicitud_manual rows from the trailing median baseline", () => {
    // 6 clean payments of 100, plus 3 interleaved fallido rows of 900 that
    // must NOT contribute to the median (else the baseline would rise and
    // hide the shock).
    const clean = baselineRun("telmex", [100, 100, 100, 100, 100, 100], 1);
    const noise = [7, 8, 9].map((d) =>
      pay({ serviceId: "telmex", monto: 900, status: "fallido", createdAt: new Date(Date.UTC(2026, 0, d)) }),
    );
    const shock = pay({ serviceId: "telmex", monto: 200, createdAt: new Date(Date.UTC(2026, 0, 20)) });
    const events = detectBillShockEvents([...clean, ...noise, shock]);
    expect(events).toHaveLength(1);
    expect(events[0].baselineMedian).toBe(100);
  });

  it("keeps service_id baselines independent", () => {
    const cfeHistory = baselineRun("cfe", [100, 100, 100, 100, 100, 100], 1);
    const telmexHistory = baselineRun("telmex", [10, 10, 10, 10, 10, 10], 1);
    const cfeShock = pay({ serviceId: "cfe", monto: 200, createdAt: new Date(Date.UTC(2026, 0, 20)) });
    const events = detectBillShockEvents([...cfeHistory, ...telmexHistory, cfeShock]);
    expect(events).toHaveLength(1);
    expect(events[0].serviceId).toBe("cfe");
  });
});

describe("computeShockPaidFullRate", () => {
  it("returns 0 when there are no shock-crossing attempts", () => {
    const history = baselineRun("cfe", [100, 100, 100, 100, 100, 100], 1);
    expect(computeShockPaidFullRate(history)).toBe(0);
  });

  it("counts a fallido shock-magnitude attempt as a candidate, but not as paid", () => {
    const history = baselineRun("cfe", [100, 100, 100, 100, 100, 100], 1);
    const failedShock = pay({ serviceId: "cfe", monto: 300, status: "fallido", createdAt: new Date(Date.UTC(2026, 0, 20)) });
    expect(computeShockPaidFullRate([...history, failedShock])).toBe(0);
  });

  it("is 1.0 when all shock-magnitude attempts succeeded", () => {
    const history = baselineRun("cfe", [100, 100, 100, 100, 100, 100], 1);
    const shock = pay({ serviceId: "cfe", monto: 300, createdAt: new Date(Date.UTC(2026, 0, 20)) });
    expect(computeShockPaidFullRate([...history, shock])).toBe(1);
  });

  it("is 0.5 with one paid and one failed shock-magnitude attempt", () => {
    const history = baselineRun("cfe", [100, 100, 100, 100, 100, 100], 1);
    const paidShock = pay({ serviceId: "cfe", monto: 300, createdAt: new Date(Date.UTC(2026, 0, 20)) });
    const failedShock = pay({ serviceId: "cfe", monto: 300, status: "fallido", createdAt: new Date(Date.UTC(2026, 0, 21)) });
    expect(computeShockPaidFullRate([...history, paidShock, failedShock])).toBe(0.5);
  });
});

describe("computeBillShockWalletResponseRate", () => {
  it("returns 0 for an empty event list", () => {
    expect(computeBillShockWalletResponseRate([])).toBe(0);
  });

  it("excludes events with a null channel from both numerator and denominator", () => {
    const events = [
      { serviceId: "cfe", monto: 200, baselineMedian: 100, channel: null, createdAtMs: 1 },
      { serviceId: "cfe", monto: 200, baselineMedian: 100, channel: "wallet_balance" as const, createdAtMs: 2 },
    ];
    expect(computeBillShockWalletResponseRate(events)).toBe(1);
  });

  it("computes the fraction paid via wallet_balance vs card_direct", () => {
    const events = [
      { serviceId: "cfe", monto: 200, baselineMedian: 100, channel: "wallet_balance", createdAtMs: 1 },
      { serviceId: "cfe", monto: 200, baselineMedian: 100, channel: "card_direct", createdAtMs: 2 },
    ];
    expect(computeBillShockWalletResponseRate(events)).toBe(0.5);
  });
});

function constantBalance(balance: number): BalanceLookup {
  return { balanceAsOf: () => balance };
}

describe("detectScarcityEvents", () => {
  const asOf = new Date(Date.UTC(2026, 3, 1));

  it("returns [] immediately for zero billers, not scanning anything", () => {
    expect(detectScarcityEvents([], constantBalance(0), [], asOf)).toEqual([]);
  });

  it("detects no events when balance always covers obligations", () => {
    const billers: UserBillerInput[] = [{ billerId: "cfe", paymentDay: 15, typicalAmount: 100 }];
    expect(detectScarcityEvents(billers, constantBalance(100000), [], asOf)).toEqual([]);
  });

  it("detects a scarcity event when balance is below the forward obligation total", () => {
    const billers: UserBillerInput[] = [{ billerId: "cfe", paymentDay: 15, typicalAmount: 100 }];
    const events = detectScarcityEvents(billers, constantBalance(0), [], asOf);
    expect(events.length).toBeGreaterThan(0);
    expect(events[0].atRiskBillerIds).toContain("cfe");
  });

  it("handles same-day bills (two billers due on the same day) by including both in the obligation window", () => {
    const billers: UserBillerInput[] = [
      { billerId: "cfe", paymentDay: 15, typicalAmount: 100 },
      { billerId: "telmex", paymentDay: 15, typicalAmount: 100 },
    ];
    const events = detectScarcityEvents(billers, constantBalance(150), [], asOf);
    // 150 < 200 (both obligations) -> scarcity event with both billers at risk
    expect(events.length).toBeGreaterThan(0);
    expect(events[0].atRiskBillerIds.sort()).toEqual(["cfe", "telmex"]);
  });

  it("records the biller actually paid first within the 7-day window", () => {
    const billers: UserBillerInput[] = [{ billerId: "cfe", paymentDay: 15, typicalAmount: 100 }];
    const payment = pay({ serviceId: "cfe", monto: 100, createdAt: new Date(Date.UTC(2026, 0, 15, 6)) });
    const events = detectScarcityEvents(billers, constantBalance(0), [payment], asOf);
    const januaryEvent = events.find((e) => e.dueDateMs === Date.UTC(2026, 0, 15));
    expect(januaryEvent?.paidFirstBillerId).toBe("cfe");
  });

  it("leaves paidFirstBillerId null when no payment falls in the window", () => {
    const billers: UserBillerInput[] = [{ billerId: "cfe", paymentDay: 15, typicalAmount: 100 }];
    const events = detectScarcityEvents(billers, constantBalance(0), [], asOf);
    expect(events.every((e) => e.paidFirstBillerId === null)).toBe(true);
  });
});

describe("computeSequencingStability", () => {
  it("returns null with zero events (zero billers case)", () => {
    expect(computeSequencingStability([])).toBeNull();
  });

  it("returns null with only 1 event with a known paid-first biller", () => {
    expect(
      computeSequencingStability([{ dueDateMs: 1, atRiskBillerIds: ["cfe"], paidFirstBillerId: "cfe" }]),
    ).toBeNull();
  });

  it("is 1.0 when the same biller is always paid first", () => {
    const events = [1, 2, 3].map((d) => ({ dueDateMs: d, atRiskBillerIds: ["cfe"], paidFirstBillerId: "cfe" }));
    expect(computeSequencingStability(events)).toBe(1);
  });

  it("is 0.5 when the paid-first biller alternates evenly", () => {
    const events = [
      { dueDateMs: 1, atRiskBillerIds: ["cfe", "telmex"], paidFirstBillerId: "cfe" },
      { dueDateMs: 2, atRiskBillerIds: ["cfe", "telmex"], paidFirstBillerId: "telmex" },
    ];
    expect(computeSequencingStability(events)).toBe(0.5);
  });

  it("ignores events with an unknown (null) paid-first biller when computing the denominator", () => {
    const events = [
      { dueDateMs: 1, atRiskBillerIds: ["cfe"], paidFirstBillerId: "cfe" },
      { dueDateMs: 2, atRiskBillerIds: ["cfe"], paidFirstBillerId: "cfe" },
      { dueDateMs: 3, atRiskBillerIds: ["cfe"], paidFirstBillerId: null },
    ];
    expect(computeSequencingStability(events)).toBe(1);
  });
});

describe("classifyBillShockResponse (Prompt 2 Part C item 9 — Stage 2 remediation)", () => {
  // Baseline of 6 payments at 200 MXN establishes a trailing median of 200;
  // shock threshold = 1.5 * 200 = 300.
  const asOf = new Date(Date.UTC(2026, 2, 15)); // Mar 15 2026

  it("returns null when there are no payments at all", () => {
    expect(classifyBillShockResponse([], asOf)).toBeNull();
  });

  it("returns null when no payment ever crosses the shock threshold", () => {
    const rows = baselineRun("cfe", [200, 200, 200, 200, 200, 200, 250], 1);
    expect(classifyBillShockResponse(rows, asOf)).toBeNull();
  });

  it("classifies a successful shock payment with no due metadata as paid_full_ontime", () => {
    const rows = [
      ...baselineRun("cfe", [200, 200, 200, 200, 200, 200], 1),
      pay({ serviceId: "cfe", monto: 400, createdAt: new Date(Date.UTC(2026, 0, 20)) }),
    ];
    expect(classifyBillShockResponse(rows, asOf)).toBe("paid_full_ontime");
  });

  it("classifies as paid_partial when monto < amountDueMxn on the shock payment", () => {
    const rows = [
      ...baselineRun("cfe", [200, 200, 200, 200, 200, 200], 1),
      pay({
        serviceId: "cfe", monto: 400, amountDueMxn: 600,
        createdAt: new Date(Date.UTC(2026, 0, 20)),
      }),
    ];
    expect(classifyBillShockResponse(rows, asOf)).toBe("paid_partial");
  });

  it("classifies as paid_late when daysFromDue < 0 on the shock payment", () => {
    const rows = [
      ...baselineRun("cfe", [200, 200, 200, 200, 200, 200], 1),
      pay({
        serviceId: "cfe", monto: 400, daysFromDue: -3,
        createdAt: new Date(Date.UTC(2026, 0, 20)),
      }),
    ];
    expect(classifyBillShockResponse(rows, asOf)).toBe("paid_late");
  });

  it("partial takes precedence over late when both signals present", () => {
    const rows = [
      ...baselineRun("cfe", [200, 200, 200, 200, 200, 200], 1),
      pay({
        serviceId: "cfe", monto: 400, amountDueMxn: 600, daysFromDue: -3,
        createdAt: new Date(Date.UTC(2026, 0, 20)),
      }),
    ];
    expect(classifyBillShockResponse(rows, asOf)).toBe("paid_partial");
  });

  it("classifies a failed shock attempt with no cure and >=30d elapsed as unpaid_30d", () => {
    const rows = [
      ...baselineRun("cfe", [200, 200, 200, 200, 200, 200], 1),
      pay({
        serviceId: "cfe", monto: 400, status: "fallido",
        createdAt: new Date(Date.UTC(2026, 0, 20)), // 54 days before asOf
      }),
    ];
    expect(classifyBillShockResponse(rows, asOf)).toBe("unpaid_30d");
  });

  it("a failed shock attempt cured by a successful payment within 30d classifies the cure", () => {
    const rows = [
      ...baselineRun("cfe", [200, 200, 200, 200, 200, 200], 1),
      pay({
        serviceId: "cfe", monto: 400, status: "fallido",
        createdAt: new Date(Date.UTC(2026, 0, 20)),
      }),
      pay({
        serviceId: "cfe", monto: 400, daysFromDue: -2,
        createdAt: new Date(Date.UTC(2026, 0, 25)),
      }),
    ];
    // Most recent candidate is the successful 400 payment itself (it also
    // crosses the threshold) → classified directly as paid_late.
    expect(classifyBillShockResponse(rows, asOf)).toBe("paid_late");
  });

  it("a failed shock cured by a NON-shock-magnitude success classifies the cure (paid_partial here)", () => {
    const rows = [
      ...baselineRun("cfe", [200, 200, 200, 200, 200, 200], 1),
      pay({
        serviceId: "cfe", monto: 400, status: "fallido",
        createdAt: new Date(Date.UTC(2026, 0, 20)),
      }),
      // Cure is only 250 (< 1.5×200 = 300, so NOT itself a shock candidate),
      // and 250 < amountDueMxn 400 → the cure classifies as paid_partial.
      pay({
        serviceId: "cfe", monto: 250, amountDueMxn: 400,
        createdAt: new Date(Date.UTC(2026, 0, 28)),
      }),
    ];
    expect(classifyBillShockResponse(rows, asOf)).toBe("paid_partial");
  });

  it("a recent failed attempt (<30d, uncured) is indeterminate — falls back to earlier candidate", () => {
    const rows = [
      ...baselineRun("cfe", [200, 200, 200, 200, 200, 200], 1),
      pay({ serviceId: "cfe", monto: 400, createdAt: new Date(Date.UTC(2026, 0, 20)) }), // earlier success
      pay({
        serviceId: "cfe", monto: 500, status: "fallido",
        createdAt: new Date(Date.UTC(2026, 2, 10)), // 5 days before asOf, uncured
      }),
    ];
    expect(classifyBillShockResponse(rows, asOf)).toBe("paid_full_ontime");
  });

  it("a recent failed attempt (<30d, uncured) with no earlier candidate returns null", () => {
    const rows = [
      ...baselineRun("cfe", [200, 200, 200, 200, 200, 200], 1),
      pay({
        serviceId: "cfe", monto: 500, status: "fallido",
        createdAt: new Date(Date.UTC(2026, 2, 10)),
      }),
    ];
    expect(classifyBillShockResponse(rows, asOf)).toBeNull();
  });
});
