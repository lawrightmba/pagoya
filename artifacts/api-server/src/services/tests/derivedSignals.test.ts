import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { sql } from "drizzle-orm";
import {
  computePaymentRailSwitching,
  computeConditionalPaulaLatency,
  computeInflowCV,
  computeKycStaleness,
  getFailedPaymentSignal,
  computeQuincenaAlignment,
  computeLoadChannelFormalityMix,
  computeSessionTimeOfDayConcentration,
  exportQuarantinedSignalCorpus,
  quarantinedSignalCorpusToCsv,
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

  it("quarantine-tier signals return NaN/zero defaults for a user with no data", async () => {
    const q = await computeQuincenaAlignment(NOPE);
    expect(q.quincenaEventCount90d).toBe(0);
    expect(Number.isNaN(q.quincenaAlignmentIndex)).toBe(true);

    const f = await computeLoadChannelFormalityMix(NOPE);
    expect(f.totalLoadAmount90d).toBe(0);
    expect(Number.isNaN(f.loadChannelFormalityMix)).toBe(true);

    const s = await computeSessionTimeOfDayConcentration(NOPE);
    expect(s.sessionCount30d).toBe(0);
    expect(Number.isNaN(s.sessionTimeOfDayConcentration)).toBe(true);
    expect(Number.isNaN(s.lateNightSessionFraction)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// QUARANTINE TIER — seeded integration tests (Prompt 3)
// ═══════════════════════════════════════════════════════════════════════════
// Seeds a real user with controlled-timestamp loads, payments, and login
// events, then asserts the three quarantined signals produce the exact
// expected NON-default values, and that the export corpus is keyed on the
// HMAC-hashed id with the raw telefono absent from every output byte.
const TEL_Q = "quarantest01";

// All seed timestamps are 18:00 UTC = 12:00 America/Mexico_City (UTC-6),
// so UTC date === MX local date, making day-of-month assertions exact.
// "Last month" dates are always within the trailing 90-day window.
function lastMonthUtc(day: number): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, day, 18, 0, 0));
}
function lastDayOfLastMonthUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0, 18, 0, 0));
}
function daysAgoAtUtcHour(daysAgo: number, utcHour: number): Date {
  const d = new Date(Date.now() - daysAgo * 86_400_000);
  d.setUTCHours(utcHour, 0, 0, 0);
  return d;
}

async function cleanupQ() {
  const { db } = await import("@workspace/db");
  await db.execute(sql`DELETE FROM user_events WHERE telefono = ${TEL_Q}`);
  await db.execute(sql`DELETE FROM bill_payments WHERE telefono = ${TEL_Q}`);
  await db.execute(sql`
    DELETE FROM wallet_transactions
    WHERE wallet_id IN (SELECT id FROM wallets WHERE user_id = ${TEL_Q})
  `);
  await db.execute(sql`DELETE FROM wallets WHERE user_id = ${TEL_Q}`);
  await db.execute(sql`DELETE FROM users WHERE telefono = ${TEL_Q}`);
}

describe("quarantine tier — seeded integration (non-default values + hashed export)", () => {
  // NOTE: seeding must be beforeEach, not beforeAll — the global test setup
  // (src/billpay/tests/setup.ts) wipes wallet_transactions / wallets /
  // bill_payments / users AFTER EVERY TEST, so beforeAll-seeded rows only
  // survive for the first `it` in the describe. user_events is NOT wiped by
  // that hook, hence cleanupQ handles it explicitly.
  beforeEach(async () => {
    const { db } = await import("@workspace/db");
    await cleanupQ();

    await db.execute(sql`INSERT INTO users (telefono) VALUES (${TEL_Q})`);
    const w = await db.execute(sql`
      INSERT INTO wallets (user_id, balance_mxn) VALUES (${TEL_Q}, 0) RETURNING id
    `);
    const walletId = String((w.rows[0] as Record<string, unknown>).id);

    // Confirmed loads: spei_in $600 on the 15th (quincena-aligned, formal),
    // load_card $250 on the 14th (aligned, formal), load_oxxo $150 on the
    // 8th (NOT aligned, cash-network). Plus one PENDING load on the 15th
    // that must be excluded from both signals.
    const loads: [string, number, string, Date][] = [
      ["spei_in", 600, "confirmed", lastMonthUtc(15)],
      ["load_card", 250, "confirmed", lastMonthUtc(14)],
      ["load_oxxo", 150, "confirmed", lastMonthUtc(8)],
      ["load_oxxo", 999, "pending", lastMonthUtc(15)],
    ];
    for (const [type, amount, status, at] of loads) {
      await db.execute(sql`
        INSERT INTO wallet_transactions (wallet_id, type, amount_mxn, status, created_at)
        VALUES (${walletId}, ${type}, ${amount}, ${status}, ${at.toISOString()}::timestamptz)
      `);
    }

    // One completed bill payment on the LAST day of last month (aligned via
    // the month-end window). bill_payments.created_at is a naive UTC column,
    // so the ISO string is cast to plain timestamp (tz suffix dropped = UTC).
    await db.execute(sql`
      INSERT INTO bill_payments
        (service_id, service_name, categoria, referencia, monto, telefono,
         provider, confirmation_code, status, created_at)
      VALUES
        ('cfe', 'CFE', 'servicios', '123456789012', 350, ${TEL_Q},
         'taecel', 'QUARANTEST', 'completed', ${lastDayOfLastMonthUtc().toISOString()}::timestamp)
    `);

    // 10 login events in the last ~2 weeks: 8 at 08:00 UTC (= 02:00 MX,
    // late-night bucket) and 2 at 20:00 UTC (= 14:00 MX).
    for (let i = 0; i < 8; i++) {
      await db.execute(sql`
        INSERT INTO user_events (telefono, event_type, created_at)
        VALUES (${TEL_Q}, 'login', ${daysAgoAtUtcHour(2 + i, 8).toISOString()}::timestamptz)
      `);
    }
    for (let i = 0; i < 2; i++) {
      await db.execute(sql`
        INSERT INTO user_events (telefono, event_type, created_at)
        VALUES (${TEL_Q}, 'login', ${daysAgoAtUtcHour(11 + i, 20).toISOString()}::timestamptz)
      `);
    }
  });

  afterAll(async () => {
    await cleanupQ();
  });

  it("computeQuincenaAlignment: 3 of 4 events aligned → index 0.75", async () => {
    const q = await computeQuincenaAlignment(TEL_Q);
    // Events: spei 15th ✓, card 14th ✓, oxxo 8th ✗, bill payment month-end ✓
    // (pending load excluded entirely).
    expect(q.quincenaEventCount90d).toBe(4);
    expect(q.quincenaAlignmentIndex).toBeCloseTo(0.75, 10);
  });

  it("computeLoadChannelFormalityMix: $850 of $1000 via formal rails → 0.85", async () => {
    const f = await computeLoadChannelFormalityMix(TEL_Q);
    expect(f.totalLoadAmount90d).toBe(1000);
    expect(f.speiFraction).toBeCloseTo(0.6, 10);
    expect(f.cardFraction).toBeCloseTo(0.25, 10);
    expect(f.cashNetworkFraction).toBeCloseTo(0.15, 10);
    expect(f.loadChannelFormalityMix).toBeCloseTo(0.85, 10);
  });

  it("computeSessionTimeOfDayConcentration: 8/10 late-night, entropy ≈ 0.1575", async () => {
    const s = await computeSessionTimeOfDayConcentration(TEL_Q);
    expect(s.sessionCount30d).toBe(10);
    expect(s.lateNightSessionFraction).toBeCloseTo(0.8, 10);
    // Two hour buckets, p = 0.8 / 0.2:
    // H = -(0.8·ln0.8 + 0.2·ln0.2) = 0.500402; H / ln(24) = 0.157456
    expect(s.sessionTimeOfDayConcentration).toBeCloseTo(0.157456, 4);
  });

  it("exportQuarantinedSignalCorpus: keyed on HMAC hash, raw telefono absent, values non-default", async () => {
    const rows = await exportQuarantinedSignalCorpus([TEL_Q]);
    expect(rows).toHaveLength(1);
    const row = rows[0];

    // Keyed on 64-hex HMAC-SHA256, never the raw telefono.
    expect(row.hashedId).toMatch(/^[0-9a-f]{64}$/);
    expect(row.hashedId).not.toBe(TEL_Q);
    expect(JSON.stringify(rows)).not.toContain(TEL_Q);

    // Actual non-default values flow through to the corpus.
    expect(row.quincenaAlignmentIndex).toBeCloseTo(0.75, 10);
    expect(row.loadChannelFormalityMix).toBeCloseTo(0.85, 10);
    expect(row.lateNightSessionFraction).toBeCloseTo(0.8, 10);
    expect(row.sessionTimeOfDayConcentration).toBeCloseTo(0.157456, 4);
    expect(row.sessionCount30d).toBe(10);
    expect(row.totalLoadAmount90d).toBe(1000);

    const csv = quarantinedSignalCorpusToCsv(rows);
    expect(csv).not.toContain(TEL_Q);
    expect(csv.split("\n")).toHaveLength(2);
    expect(csv).toContain(row.hashedId);

    // Verbatim corpus output for the report:
    console.log("[quarantine corpus JSON]", JSON.stringify(rows, null, 2));
    console.log("[quarantine corpus CSV]\n" + csv);
  });
});
