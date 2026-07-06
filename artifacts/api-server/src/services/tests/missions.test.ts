/**
 * Targeted regression tests for the missions.ts swallowed-schema-error bugs.
 *
 * Bug class: updateMissionProgress swallows ALL errors via a non-fatal catch,
 * so a SQL query referencing a non-existent column fails silently on every
 * call and the affected mission goal_type never progresses.
 *
 * Instance 1 (distinct_billers): queried COUNT(DISTINCT biller_name) FROM
 * bill_payments, but that table has service_name (biller_name lives on
 * user_billers/profiles).
 *
 * Instance 2 (wallet_loads): joined wallets via w.phone, but wallets is keyed
 * by user_id (references users.telefono).
 *
 * Each test seeds a real mission + real rows, calls the REAL
 * updateMissionProgress, and asserts:
 *   1. logger.error is never called (no swallowed "non-fatal" failure), and
 *   2. user_mission_progress.current_value equals the exact expected count.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { sql } from "drizzle-orm";
import { logger } from "../../lib/logger.js";
import { updateMissionProgress } from "../missions.js";

const TEL = "missionstest1";
const MISSION_ID = "test_distinct_billers";
const TEL_W = "missionstest2";
const MISSION_ID_W = "test_wallet_loads";

async function cleanup() {
  const { db } = await import("@workspace/db");
  await db.execute(sql`DELETE FROM user_mission_progress WHERE telefono IN (${TEL}, ${TEL_W})`);
  await db.execute(sql`DELETE FROM loyalty_missions WHERE id IN (${MISSION_ID}, ${MISSION_ID_W})`);
  await db.execute(sql`DELETE FROM bill_payments WHERE telefono = ${TEL}`);
  await db.execute(sql`
    DELETE FROM wallet_transactions
    WHERE wallet_id IN (SELECT id FROM wallets WHERE user_id = ${TEL_W})
  `);
  await db.execute(sql`DELETE FROM wallets WHERE user_id = ${TEL_W}`);
  await db.execute(sql`DELETE FROM users WHERE telefono IN (${TEL}, ${TEL_W})`);
}

describe("updateMissionProgress — distinct_billers (biller_name → service_name regression)", () => {
  beforeAll(async () => {
    const { db } = await import("@workspace/db");
    await cleanup();

    await db.execute(sql`INSERT INTO users (telefono) VALUES (${TEL})`);

    // goal_value=99 so the mission cannot complete during the test — keeps the
    // WhatsApp / loyalty-points completion path out of scope.
    await db.execute(sql`
      INSERT INTO loyalty_missions
        (id, title_es, title_en, description_es, description_en, icon,
         goal_type, goal_value, reward_points, sort_order, is_active, is_repeatable)
      VALUES
        (${MISSION_ID}, 'Prueba', 'Test', 'Prueba', 'Test', '🧪',
         'distinct_billers', 99, 10, 999, TRUE, FALSE)
    `);

    // 3 completed payments across 2 DISTINCT service_names (+1 non-completed
    // row that must NOT count).
    const rows: [string, string, string][] = [
      ["cfe", "CFE", "completed"],
      ["cfe", "CFE", "completed"],
      ["telmex", "Telmex", "completed"],
      ["izzi", "Izzi", "fallido"],
    ];
    for (const [serviceId, serviceName, status] of rows) {
      await db.execute(sql`
        INSERT INTO bill_payments
          (service_id, service_name, categoria, referencia, monto, telefono,
           provider, confirmation_code, status)
        VALUES
          (${serviceId}, ${serviceName}, 'servicios', '123456789012', 200, ${TEL},
           'taecel', 'MISSIONTEST', ${status})
      `);
    }
  });

  afterAll(async () => {
    await cleanup();
  });

  it("increments distinct_billers progress from real bill_payments rows without any swallowed error", async () => {
    const errorSpy = vi.spyOn(logger, "error");
    try {
      await updateMissionProgress(TEL, "bill_payment");

      // 1. No "missions: updateMissionProgress failed (non-fatal)" swallow.
      expect(errorSpy).not.toHaveBeenCalled();
    } finally {
      errorSpy.mockRestore();
    }

    // 2. Progress row exists with current_value = 2 (cfe + telmex; the
    //    duplicate cfe and the non-completed izzi row must not inflate it).
    const { db } = await import("@workspace/db");
    const r = await db.execute(sql`
      SELECT current_value FROM user_mission_progress
      WHERE telefono = ${TEL} AND mission_id = ${MISSION_ID}
    `);
    expect(r.rows).toHaveLength(1);
    expect(Number((r.rows[0] as { current_value: number }).current_value)).toBe(2);
  });
});

describe("updateMissionProgress — wallet_loads (w.phone → w.user_id regression)", () => {
  beforeAll(async () => {
    const { db } = await import("@workspace/db");
    await cleanup();

    await db.execute(sql`INSERT INTO users (telefono) VALUES (${TEL_W})`);

    // goal_value=99 so the mission cannot complete during the test.
    await db.execute(sql`
      INSERT INTO loyalty_missions
        (id, title_es, title_en, description_es, description_en, icon,
         goal_type, goal_value, reward_points, sort_order, is_active, is_repeatable)
      VALUES
        (${MISSION_ID_W}, 'Prueba cargas', 'Test loads', 'Prueba', 'Test', '💰',
         'wallet_loads', 99, 10, 998, TRUE, FALSE)
    `);

    const w = await db.execute(sql`
      INSERT INTO wallets (user_id, balance_mxn) VALUES (${TEL_W}, 0) RETURNING id
    `);
    const walletId = String((w.rows[0] as Record<string, unknown>).id);

    // 3 confirmed qualifying loads across all 3 counted rails, plus one
    // pending load and one confirmed non-load type — neither must count.
    const txns: [string, string][] = [
      ["load_oxxo", "confirmed"],
      ["spei_in", "confirmed"],
      ["load_card", "confirmed"],
      ["load_oxxo", "pending"],
      ["bill_payment", "confirmed"],
    ];
    for (const [type, status] of txns) {
      await db.execute(sql`
        INSERT INTO wallet_transactions (wallet_id, type, amount_mxn, status)
        VALUES (${walletId}, ${type}, 100, ${status})
      `);
    }
  });

  afterAll(async () => {
    await cleanup();
  });

  it("increments wallet_loads progress from real wallet_transactions rows without any swallowed error", async () => {
    const errorSpy = vi.spyOn(logger, "error");
    try {
      await updateMissionProgress(TEL_W, "wallet_load");

      // 1. No "missions: updateMissionProgress failed (non-fatal)" swallow.
      expect(errorSpy).not.toHaveBeenCalled();
    } finally {
      errorSpy.mockRestore();
    }

    // 2. Progress row exists with current_value = 3 (the pending load and the
    //    confirmed non-load type must not count).
    const { db } = await import("@workspace/db");
    const r = await db.execute(sql`
      SELECT current_value FROM user_mission_progress
      WHERE telefono = ${TEL_W} AND mission_id = ${MISSION_ID_W}
    `);
    expect(r.rows).toHaveLength(1);
    expect(Number((r.rows[0] as { current_value: number }).current_value)).toBe(3);
  });
});
