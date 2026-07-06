/**
 * Targeted regression test for the missions.ts distinct_billers bug.
 *
 * Before the fix, updateMissionProgress ran
 *   SELECT COUNT(DISTINCT biller_name) FROM bill_payments
 * but bill_payments has service_name, not biller_name — so the query threw
 * "column does not exist" on every call, the error was swallowed by the
 * non-fatal catch, and distinct_billers missions silently never progressed.
 *
 * This test seeds a real distinct_billers mission + 3 completed bill_payments
 * across 2 distinct service_names, calls the REAL updateMissionProgress, and
 * asserts:
 *   1. logger.error is never called (no swallowed "non-fatal" failure), and
 *   2. user_mission_progress.current_value === 2 (distinct services counted).
 */
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { sql } from "drizzle-orm";
import { logger } from "../../lib/logger.js";
import { updateMissionProgress } from "../missions.js";

const TEL = "missionstest1";
const MISSION_ID = "test_distinct_billers";

async function cleanup() {
  const { db } = await import("@workspace/db");
  await db.execute(sql`DELETE FROM user_mission_progress WHERE telefono = ${TEL}`);
  await db.execute(sql`DELETE FROM loyalty_missions WHERE id = ${MISSION_ID}`);
  await db.execute(sql`DELETE FROM bill_payments WHERE telefono = ${TEL}`);
  await db.execute(sql`DELETE FROM users WHERE telefono = ${TEL}`);
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
