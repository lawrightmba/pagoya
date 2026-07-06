import { describe, it, expect } from "vitest";
import {
  classifyTransactionDirection,
  isBalanceRealStatus,
  reconstructBalanceSeries,
  resolveOrderingTimestamp,
  toComparableTimestamp,
  OPENING_BALANCE_MXN,
  type WalletTransactionInput,
} from "../walletBalanceReconstruction.js";

let idCounter = 0;
function nextId(): string {
  idCounter += 1;
  return `tx-${idCounter.toString().padStart(4, "0")}`;
}

function txn(overrides: Partial<WalletTransactionInput> & { type: string; status: string; amountMxn: number }): WalletTransactionInput {
  return {
    id: nextId(),
    createdAt: new Date("2026-01-01T00:00:00Z"),
    confirmedAt: null,
    ...overrides,
  };
}

describe("classifyTransactionDirection", () => {
  it("classifies all 9 confirmed types correctly", () => {
    expect(classifyTransactionDirection("load_oxxo")).toBe("credit");
    expect(classifyTransactionDirection("load_card")).toBe("credit");
    expect(classifyTransactionDirection("spei_in")).toBe("credit");
    expect(classifyTransactionDirection("load_banco")).toBe("credit");
    expect(classifyTransactionDirection("admin_credit")).toBe("credit");
    expect(classifyTransactionDirection("transfer_receive")).toBe("credit");
    expect(classifyTransactionDirection("SIGNUP_BONUS")).toBe("credit");
    expect(classifyTransactionDirection("bill_pay")).toBe("debit");
    expect(classifyTransactionDirection("transfer_send")).toBe("debit");
  });

  it("THROWS on an unrecognized type", () => {
    expect(() => classifyTransactionDirection("some_future_type")).toThrow(
      /unrecognized wallet_transactions\.type "some_future_type"/,
    );
  });

  it("THROWS on lowercase 'signup_bonus' — casing matters, must match the real write site exactly", () => {
    expect(() => classifyTransactionDirection("signup_bonus")).toThrow(/unrecognized/);
  });
});

describe("isBalanceRealStatus", () => {
  it("classifies confirmed and completed as balance-real", () => {
    expect(isBalanceRealStatus("confirmed")).toBe(true);
    expect(isBalanceRealStatus("completed")).toBe(true);
  });

  it("classifies pending and failed as NOT balance-real", () => {
    expect(isBalanceRealStatus("pending")).toBe(false);
    expect(isBalanceRealStatus("failed")).toBe(false);
  });

  it("THROWS on an unrecognized status", () => {
    expect(() => isBalanceRealStatus("reversed")).toThrow(
      /unrecognized wallet_transactions\.status "reversed"/,
    );
  });
});

describe("reconstructBalanceSeries — core cases", () => {
  it("zero transactions -> empty series, not an error", () => {
    const series = reconstructBalanceSeries([]);
    expect(series).toEqual([]);
  });

  it("single transaction", () => {
    const t1 = txn({ type: "load_oxxo", status: "confirmed", amountMxn: 100, confirmedAt: new Date("2026-01-05T10:00:00Z") });
    const series = reconstructBalanceSeries([t1]);
    expect(series).toHaveLength(1);
    expect(series[0].balance).toBe(OPENING_BALANCE_MXN + 100);
    expect(series[0].timestamp).toEqual(new Date("2026-01-05T10:00:00Z"));
  });

  it("same-timestamp transactions (order ambiguity) resolve deterministically via id tiebreaker", () => {
    const ts = new Date("2026-01-05T10:00:00Z");
    const a = txn({ id: "tx-aaa", type: "admin_credit", status: "confirmed", amountMxn: 50, confirmedAt: ts });
    const b = txn({ id: "tx-bbb", type: "bill_pay", status: "confirmed", amountMxn: 20, confirmedAt: ts });
    const runA = reconstructBalanceSeries([a, b]);
    const runB = reconstructBalanceSeries([b, a]);
    expect(runA.map((p) => p.transactionId)).toEqual(["tx-aaa", "tx-bbb"]);
    expect(runB.map((p) => p.transactionId)).toEqual(["tx-aaa", "tx-bbb"]);
    expect(runA.map((p) => p.balance)).toEqual([50, 30]);
    expect(runA).toEqual(runB);
  });

  it("a failed load never affects balance", () => {
    const good = txn({ type: "load_card", status: "confirmed", amountMxn: 200, confirmedAt: new Date("2026-01-02T00:00:00Z") });
    const failed = txn({ type: "load_card", status: "failed", amountMxn: 9999, createdAt: new Date("2026-01-01T00:00:00Z") });
    const series = reconstructBalanceSeries([failed, good]);
    expect(series).toHaveLength(1);
    expect(series[0].balance).toBe(200);
  });

  it("a pending-then-confirmed load: balance rises at confirmed_at, not created_at, and doesn't appear while pending", () => {
    const created = new Date("2026-01-01T09:00:00Z");
    const confirmed = new Date("2026-01-01T09:05:00Z");

    const pendingSnapshot = txn({ id: "tx-pending-load", type: "load_oxxo", status: "pending", amountMxn: 300, createdAt: created, confirmedAt: null });
    const pendingSeries = reconstructBalanceSeries([pendingSnapshot]);
    expect(pendingSeries).toEqual([]);

    const confirmedSnapshot: WalletTransactionInput = { ...pendingSnapshot, status: "confirmed", confirmedAt: confirmed };
    const confirmedSeries = reconstructBalanceSeries([confirmedSnapshot]);
    expect(confirmedSeries).toHaveLength(1);
    expect(confirmedSeries[0].balance).toBe(300);
    expect(confirmedSeries[0].timestamp).toEqual(confirmed);
    expect(confirmedSeries[0].timestamp).not.toEqual(created);
  });

  it("a full month of interleaved loads/spends across multiple types nets out correctly and stays chronologically ordered", () => {
    const rows: WalletTransactionInput[] = [
      txn({ type: "load_oxxo", status: "confirmed", amountMxn: 500, confirmedAt: new Date("2026-02-01T08:00:00Z") }),
      txn({ type: "bill_pay", status: "confirmed", amountMxn: 150, confirmedAt: new Date("2026-02-03T12:00:00Z") }),
      txn({ type: "spei_in", status: "confirmed", amountMxn: 1000, confirmedAt: new Date("2026-02-07T09:30:00Z") }),
      txn({ type: "transfer_send", status: "confirmed", amountMxn: 200, confirmedAt: new Date("2026-02-10T18:00:00Z") }),
      txn({ type: "transfer_receive", status: "confirmed", amountMxn: 80, confirmedAt: new Date("2026-02-12T18:00:00Z") }),
      txn({ type: "load_card", status: "pending", amountMxn: 9999, createdAt: new Date("2026-02-14T00:00:00Z"), confirmedAt: null }),
      txn({ type: "bill_pay", status: "confirmed", amountMxn: 300, confirmedAt: new Date("2026-02-20T11:00:00Z") }),
      txn({ type: "SIGNUP_BONUS", status: "completed", amountMxn: 150, createdAt: new Date("2026-02-21T00:00:00Z"), confirmedAt: null }),
      txn({ type: "admin_credit", status: "confirmed", amountMxn: 40, confirmedAt: new Date("2026-02-25T00:00:00Z") }),
      txn({ type: "load_banco", status: "failed", amountMxn: 9999, createdAt: new Date("2026-02-26T00:00:00Z"), confirmedAt: null }),
    ];
    const series = reconstructBalanceSeries(rows);
    // pending load_card and failed load_banco must be excluded -> 8 balance-real rows
    expect(series).toHaveLength(8);
    const runningBalances = series.map((p) => p.balance);
    expect(runningBalances).toEqual([500, 350, 1350, 1150, 1230, 930, 1080, 1120]);
    // strictly increasing timestamps confirms chronological ordering held
    for (let i = 1; i < series.length; i++) {
      expect(series[i].timestamp.getTime()).toBeGreaterThan(series[i - 1].timestamp.getTime());
    }
  });

  it("a mix of confirmed and completed rows for the same user both count as balance-real", () => {
    const confirmedRow = txn({ type: "admin_credit", status: "confirmed", amountMxn: 60, confirmedAt: new Date("2026-03-01T00:00:00Z") });
    const completedRow = txn({ type: "SIGNUP_BONUS", status: "completed", amountMxn: 150, createdAt: new Date("2026-03-02T00:00:00Z"), confirmedAt: null });
    const series = reconstructBalanceSeries([confirmedRow, completedRow]);
    expect(series).toHaveLength(2);
    expect(series.map((p) => p.balance)).toEqual([60, 210]);
  });

  it("THROWS when a balance-real row has an unrecognized type", () => {
    const bad = txn({ type: "mystery_credit", status: "confirmed", amountMxn: 10, confirmedAt: new Date("2026-01-01T00:00:00Z") });
    expect(() => reconstructBalanceSeries([bad])).toThrow(/unrecognized wallet_transactions\.type/);
  });

  it("THROWS when a row has an unrecognized status (checked even before type classification runs)", () => {
    const bad = txn({ type: "load_oxxo", status: "voided", amountMxn: 10, confirmedAt: new Date("2026-01-01T00:00:00Z") });
    expect(() => reconstructBalanceSeries([bad])).toThrow(/unrecognized wallet_transactions\.status "voided"/);
  });
});

describe("SIGNUP_BONUS — the load-bearing proof of the COALESCE(confirmed_at, created_at) fallback", () => {
  // This is the ONLY row type in the entire schema that is ever
  // balance-real with confirmed_at permanently null (signupBonusService.ts
  // writes status='completed' directly, no creditWallet() call ever sets
  // confirmed_at for it). If this test passes, the COALESCE fallback is
  // proven correct; every other type either never reaches balance-real
  // without a confirmed_at, or gets one via creditWallet().
  it("a SIGNUP_BONUS row (status='completed', confirmed_at=null) is INCLUDED, counts as credit, and orders by created_at via the COALESCE fallback", () => {
    const created = new Date("2026-04-15T14:30:00Z");
    const bonus = txn({
      id: "tx-signup-bonus",
      type: "SIGNUP_BONUS",
      status: "completed",
      amountMxn: 150,
      createdAt: created,
      confirmedAt: null,
    });

    const series = reconstructBalanceSeries([bonus]);

    expect(series).toHaveLength(1);
    expect(series[0].balance).toBe(150); // credit, not debit
    expect(series[0].timestamp).toEqual(created); // COALESCE fallback -> created_at
    expect(resolveOrderingTimestamp(bonus)).toEqual(created);
  });

  it("orders correctly relative to confirmed_at-bearing rows purely by the resolved COALESCE timestamp", () => {
    const earlierBonus = txn({
      type: "SIGNUP_BONUS",
      status: "completed",
      amountMxn: 150,
      createdAt: new Date("2026-04-01T00:00:00Z"),
      confirmedAt: null,
    });
    const laterCredit = txn({
      type: "admin_credit",
      status: "confirmed",
      amountMxn: 25,
      confirmedAt: new Date("2026-04-02T00:00:00Z"),
    });
    const series = reconstructBalanceSeries([laterCredit, earlierBonus]);
    expect(series.map((p) => p.type)).toEqual(["SIGNUP_BONUS", "admin_credit"]);
    expect(series.map((p) => p.balance)).toEqual([150, 175]);
  });
});

describe("spei_in — pending to confirmed transition within the same synthetic sequence", () => {
  it("is excluded while pending and included (with confirmed_at, not created_at) once confirmed", () => {
    const created = new Date("2026-05-01T10:00:00Z");
    const confirmed = new Date("2026-05-01T10:02:00Z");
    const id = "tx-spei-in-001";

    // Snapshot #1: webhook just inserted the row, still pending (STP/SPEI webhook, stpWebhook.ts).
    const pendingSnapshot: WalletTransactionInput = {
      id,
      type: "spei_in",
      status: "pending",
      amountMxn: 1000,
      createdAt: created,
      confirmedAt: null,
    };
    const seriesWhilePending = reconstructBalanceSeries([pendingSnapshot]);
    expect(seriesWhilePending).toEqual([]);

    // Snapshot #2: creditWallet() has run in the same request handler,
    // transitioning status -> confirmed and setting confirmed_at.
    const confirmedSnapshot: WalletTransactionInput = {
      ...pendingSnapshot,
      status: "confirmed",
      confirmedAt: confirmed,
    };
    const seriesAfterConfirm = reconstructBalanceSeries([confirmedSnapshot]);
    expect(seriesAfterConfirm).toHaveLength(1);
    expect(seriesAfterConfirm[0].balance).toBe(1000);
    expect(seriesAfterConfirm[0].timestamp).toEqual(confirmed);
    expect(seriesAfterConfirm[0].timestamp).not.toEqual(created);
  });
});

describe("toComparableTimestamp", () => {
  it("normalizes a naive bill_payments-style timestamp to the UTC assumption used by wallet_transactions", () => {
    const naive = new Date(2026, 5, 15, 9, 30, 0, 0); // local-time constructor, simulating a naive DB read
    const comparable = toComparableTimestamp(naive);
    expect(comparable.getUTCFullYear()).toBe(2026);
    expect(comparable.getUTCMonth()).toBe(5);
    expect(comparable.getUTCDate()).toBe(15);
    expect(comparable.getUTCHours()).toBe(9);
    expect(comparable.getUTCMinutes()).toBe(30);
  });
});
