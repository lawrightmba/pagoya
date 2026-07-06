/**
 * Stage 2 remediation — HARD GATE integration test.
 *
 * Seeds two real users into the (dev) database, then calls the REAL
 * buildPTISnapshotFromDb and asserts that every one of the 11 Prompt 2
 * derived fields comes back DIFFERENT from DERIVED_FEATURE_DEFAULTS in at
 * least one seeded user — proving the fields are live-wired from real rows,
 * not silently defaulted.
 *
 * User A (rich history): 3 wallet loads + fast drawdowns, a cfe biller with
 * payment_day=15, 6 months of 200 MXN baseline cfe payments, monthly
 * scarcity events always resolved by paying cfe first, and a recent 400 MXN
 * bill shock paid in full/on time from wallet balance.
 *   -> minBalanceBuffer30d=110, drawdownVelocity>0, loadIntervalEntropy>0,
 *      loadAmountCV>0, preDueStagingIndex=0 (real number, not null),
 *      loadToObligationRatio>0 (not null), sequencingStability=1,
 *      shockPaidFullRate=1, billShockWalletResponseRate=1,
 *      billShockResponse='paid_full_ontime'.
 *
 * User B (drained wallet): one load fully spent 35 days ago; balance has
 * been exactly 0 for the entire trailing 30-day window.
 *   -> daysAtZeroPerMonth=30 (its default is 0, and User A's 0 would be
 *      indistinguishable from the default — B disambiguates).
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { sql } from "drizzle-orm";
import { buildPTISnapshotFromDb } from "../pti.js";
import { DERIVED_FEATURE_DEFAULTS } from "../ptiDerivedFeatures.js";

const TEL_A = "stage2testA";
const TEL_B = "stage2testB";

const DAY_MS = 24 * 60 * 60 * 1000;
function daysAgo(n: number): Date {
  return new Date(Date.now() - n * DAY_MS);
}
/** UTC midnight on the `day`-th of the month `monthsBack` months before now. */
function onDayOfMonth(monthsBack: number, day: number): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - monthsBack, day));
}

async function cleanup() {
  const { db } = await import("@workspace/db");
  await db.execute(sql`DELETE FROM bill_payments WHERE telefono IN (${TEL_A}, ${TEL_B})`);
  await db.execute(sql`
    DELETE FROM wallet_transactions
    WHERE wallet_id IN (SELECT id FROM wallets WHERE user_id IN (${TEL_A}, ${TEL_B}))
  `);
  await db.execute(sql`
    DELETE FROM user_billers
    WHERE profile_id IN (SELECT id FROM user_profiles WHERE phone IN (${TEL_A}, ${TEL_B}))
  `);
  await db.execute(sql`DELETE FROM user_profiles WHERE phone IN (${TEL_A}, ${TEL_B})`);
  await db.execute(sql`DELETE FROM wallets WHERE user_id IN (${TEL_A}, ${TEL_B})`);
  await db.execute(sql`DELETE FROM users WHERE telefono IN (${TEL_A}, ${TEL_B})`);
}

describe("buildPTISnapshotFromDb — Stage 2 HARD GATE (seeded-DB integration)", () => {
  beforeAll(async () => {
    const { db } = await import("@workspace/db");
    await cleanup();

    // ── Users + wallets ────────────────────────────────────────────────────
    await db.execute(sql`INSERT INTO users (telefono) VALUES (${TEL_A}), (${TEL_B})`);
    const wa = await db.execute(sql`
      INSERT INTO wallets (user_id, balance_mxn) VALUES (${TEL_A}, 310) RETURNING id
    `);
    const wb = await db.execute(sql`
      INSERT INTO wallets (user_id, balance_mxn) VALUES (${TEL_B}, 0) RETURNING id
    `);
    const walletA = String((wa.rows[0] as Record<string, unknown>).id);
    const walletB = String((wb.rows[0] as Record<string, unknown>).id);

    // ── User A wallet history: loads at t-80/t-50/t-10 (unequal spacing →
    //    entropy > 0; amounts 600/250/400 → CV > 0), each drawn down within
    //    72h (drawdownVelocity > 0). Running balance never re-touches 0 in
    //    the last 30 days (min = 110 → minBalanceBuffer30d = 110).
    const txnsA: [string, number, Date][] = [
      ["load_oxxo", 600, daysAgo(80)],
      ["bill_pay",  500, daysAgo(78)],
      ["load_card", 250, daysAgo(50)],
      ["bill_pay",  240, daysAgo(48)],
      ["load_oxxo", 400, daysAgo(10)],
      ["bill_pay",  200, daysAgo(9)],
    ];
    for (const [type, amount, at] of txnsA) {
      await db.execute(sql`
        INSERT INTO wallet_transactions (wallet_id, type, amount_mxn, status, created_at, confirmed_at)
        VALUES (${walletA}::uuid, ${type}, ${amount}, 'confirmed', ${at.toISOString()}, ${at.toISOString()})
      `);
    }

    // ── User B wallet history: one load fully spent 35 days ago → balance
    //    exactly 0 for the whole trailing-30d window → daysAtZeroPerMonth=30.
    const txnsB: [string, number, Date][] = [
      ["load_oxxo", 300, daysAgo(40)],
      ["bill_pay",  300, daysAgo(35)],
    ];
    for (const [type, amount, at] of txnsB) {
      await db.execute(sql`
        INSERT INTO wallet_transactions (wallet_id, type, amount_mxn, status, created_at, confirmed_at)
        VALUES (${walletB}::uuid, ${type}, ${amount}, 'confirmed', ${at.toISOString()}, ${at.toISOString()})
      `);
    }

    // ── User A biller: cfe, due on the 15th, typical 200 →
    //    preDueStagingIndex/loadToObligationRatio become non-null, and each
    //    monthly 15th where balance < 200 becomes a scarcity event.
    const prof = await db.execute(sql`
      INSERT INTO user_profiles (phone) VALUES (${TEL_A}) RETURNING id
    `);
    const profileId = String((prof.rows[0] as Record<string, unknown>).id);
    await db.execute(sql`
      INSERT INTO user_billers (profile_id, biller_id, biller_name, payment_day, typical_amount)
      VALUES (${profileId}::uuid, 'cfe', 'CFE', 15, 200)
    `);

    // ── User A bill_payments: 6-month baseline of 200 MXN cfe payments on
    //    the 16th (each one is also the paid-first payment for that month's
    //    scarcity event → sequencingStability = 1), then a 400 MXN shock
    //    (>= 1.5 × median 200) 5 days ago, paid from wallet, 2 days early.
    for (let monthsBack = 6; monthsBack >= 1; monthsBack--) {
      const at = onDayOfMonth(monthsBack, 16);
      await db.execute(sql`
        INSERT INTO bill_payments
          (telefono, service_id, service_name, categoria, referencia, monto, provider,
           confirmation_code, status, channel, created_at, days_from_due)
        VALUES
          (${TEL_A}, 'cfe', 'CFE', 'luz', 'REF-BASE', 200, 'siprel',
           'TEST-OK', 'completed', 'wallet_balance', ${at.toISOString()}, 1)
      `);
    }
    const shockAt = daysAgo(5);
    await db.execute(sql`
      INSERT INTO bill_payments
        (telefono, service_id, service_name, categoria, referencia, monto, provider,
         confirmation_code, status, channel, created_at, days_from_due)
      VALUES
        (${TEL_A}, 'cfe', 'CFE', 'luz', 'REF-SHOCK', 400, 'siprel',
         'TEST-OK', 'completed', 'wallet_balance', ${shockAt.toISOString()}, 2)
    `);
  }, 60000);

  afterAll(async () => {
    await cleanup();
  }, 60000);

  it("returns live-computed values for all 11 derived fields (≠ DERIVED_FEATURE_DEFAULTS across the two seeded users)", async () => {
    const snapA = await buildPTISnapshotFromDb(TEL_A);
    const snapB = await buildPTISnapshotFromDb(TEL_B);

    const FIELDS = [
      "minBalanceBuffer30d", "daysAtZeroPerMonth", "drawdownVelocity",
      "loadIntervalEntropy", "loadAmountCV", "preDueStagingIndex",
      "loadToObligationRatio", "sequencingStability", "shockPaidFullRate",
      "billShockWalletResponseRate", "billShockResponse",
    ] as const;

    // Verbatim evidence for the closing verification report:
    console.log("USER A derived subset:", JSON.stringify(
      Object.fromEntries(FIELDS.map((f) => [f, snapA[f]])), null, 2));
    console.log("USER B derived subset:", JSON.stringify(
      Object.fromEntries(FIELDS.map((f) => [f, snapB[f]])), null, 2));
    console.log("DEFAULTS:", JSON.stringify(DERIVED_FEATURE_DEFAULTS, null, 2));

    // User A — every field except daysAtZeroPerMonth differs from its default.
    expect(snapA.minBalanceBuffer30d).toBe(110);                        // default 0
    expect(snapA.drawdownVelocity).toBeGreaterThan(0);                  // default 0
    expect(snapA.loadIntervalEntropy).toBeGreaterThan(0);               // default 0
    expect(snapA.loadAmountCV).toBeGreaterThan(0);                      // default 0
    expect(snapA.preDueStagingIndex).not.toBeNull();                    // default null
    expect(snapA.loadToObligationRatio).not.toBeNull();                 // default null
    expect(snapA.loadToObligationRatio as number).toBeGreaterThan(0);
    expect(snapA.sequencingStability).toBe(1);                          // default null
    expect(snapA.shockPaidFullRate).toBe(1);                            // default 0
    expect(snapA.billShockWalletResponseRate).toBe(1);                  // default 0
    expect(snapA.billShockResponse).toBe("paid_full_ontime");           // default null

    // User B — the one field User A can't distinguish from its default.
    expect(snapB.daysAtZeroPerMonth).toBe(30);                          // default 0

    // Belt-and-braces: across the two users, EVERY field differs from its
    // default at least once (the formal HARD GATE condition).
    for (const field of FIELDS) {
      const differsInA = snapA[field] !== DERIVED_FEATURE_DEFAULTS[field];
      const differsInB = snapB[field] !== DERIVED_FEATURE_DEFAULTS[field];
      expect(differsInA || differsInB, `field ${field} never differed from its default`).toBe(true);
    }
  }, 60000);
});
