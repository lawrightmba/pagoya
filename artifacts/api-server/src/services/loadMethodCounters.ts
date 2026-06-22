/**
 * loadMethodCounters.ts
 *
 * Atomically updates users.oxxo_load_count / spei_load_count / card_load_count
 * and related trajectory fields whenever a wallet load transaction is confirmed.
 *
 * Call sites:
 *   - handleConektaWebhook (wallet.ts)  — load_oxxo + load_card confirmed via Conekta
 *   - stpWebhook (stpWebhook.ts)        — spei_in confirmed
 *   - savedCards route (savedCards.ts)  — load_card immediate pay
 *
 * Keep in sync with pagoScore.ts lines 177-186 which queries live transaction
 * history for the same bancarization signal used in PTI scoring.
 * The columns here are a denormalized cache for fast handoff packet assembly.
 */

import { sql } from "drizzle-orm";
import { logger } from "../lib/logger.js";

type LoadMethod = "oxxo" | "spei" | "card";

/**
 * Maps wallet_transactions.type → load method string.
 * Returns null for non-load types (SIGNUP_BONUS, RASPA_GANA, etc.) — caller skips.
 */
export function mapTransactionTypeToMethod(type: string): LoadMethod | null {
  if (type === "load_oxxo") return "oxxo";
  if (type === "spei_in")   return "spei";
  if (type === "load_card") return "card";
  return null;
}

/**
 * Atomically increments the relevant load counter and updates trajectory fields.
 * fire-and-forget safe — errors are logged, never propagate to the caller.
 */
export async function updateLoadMethodCounters(
  db: Awaited<ReturnType<typeof import("@workspace/db").default>>,
  telefono: string,
  method: LoadMethod,
): Promise<void> {
  try {
    const tel10 = telefono.replace(/\D/g, "").slice(-10);
    await db.execute(sql`
      UPDATE users SET
        oxxo_load_count = oxxo_load_count + ${method === "oxxo" ? 1 : 0},
        spei_load_count = spei_load_count + ${method === "spei" ? 1 : 0},
        card_load_count = card_load_count + ${method === "card" ? 1 : 0},
        first_load_method    = COALESCE(first_load_method, ${method}),
        last_load_method     = ${method},
        first_spei_load_at   = CASE
          WHEN ${method} = 'spei' AND first_spei_load_at IS NULL
          THEN NOW()
          ELSE first_spei_load_at
        END,
        load_method_updated_at = NOW()
      WHERE RIGHT(REGEXP_REPLACE(telefono, '\\D', '', 'g'), 10) = ${tel10}
    `);
    logger.info({ telefono: tel10, method }, "loadMethodCounters: updated");
  } catch (err) {
    logger.error({ err, telefono, method }, "loadMethodCounters: update failed (non-fatal)");
  }
}

/**
 * backfillPaymentMethodCounters — admin-callable one-time migration.
 * Reads wallet_transactions history and resets all counters from source-of-truth.
 * Gate: only runs for users where ALL three counters sum to 0.
 *
 * NOTE: wallets.user_id stores telefono in inconsistent formats
 * (+5215551234567 / 3221000001 / 4157972483).
 * Normalized via RIGHT(..., 10) — length guard prevents false matches.
 */
export async function backfillPaymentMethodCounters(
  db: Awaited<ReturnType<typeof import("@workspace/db").default>>,
): Promise<void> {
  const { rows } = await db.execute(sql`
    SELECT
      u.id,
      u.telefono,
      COALESCE(SUM(CASE WHEN wt.type = 'load_oxxo' THEN 1 ELSE 0 END), 0)::int AS oxxo,
      COALESCE(SUM(CASE WHEN wt.type = 'spei_in'   THEN 1 ELSE 0 END), 0)::int AS spei,
      COALESCE(SUM(CASE WHEN wt.type = 'load_card' THEN 1 ELSE 0 END), 0)::int AS card,
      (ARRAY_AGG(wt.type ORDER BY wt.created_at ASC) FILTER (
        WHERE wt.type IN ('load_oxxo','spei_in','load_card')
      ))[1]                                                              AS first_method,
      (ARRAY_AGG(wt.type ORDER BY wt.created_at DESC) FILTER (
        WHERE wt.type IN ('load_oxxo','spei_in','load_card')
      ))[1]                                                              AS last_method,
      MIN(wt.created_at) FILTER (WHERE wt.type = 'spei_in')             AS first_spei_at
    FROM users u
    LEFT JOIN wallets w
      ON LENGTH(RIGHT(REGEXP_REPLACE(w.user_id, '\\D', '', 'g'), 10)) = 10
      AND LENGTH(RIGHT(REGEXP_REPLACE(u.telefono, '\\D', '', 'g'), 10)) = 10
      AND RIGHT(REGEXP_REPLACE(w.user_id,   '\\D', '', 'g'), 10)
        = RIGHT(REGEXP_REPLACE(u.telefono,  '\\D', '', 'g'), 10)
    LEFT JOIN wallet_transactions wt
      ON wt.wallet_id = w.id
      AND wt.status = 'confirmed'
      AND wt.type IN ('load_oxxo','spei_in','load_card')
    WHERE u.is_test_account IS NOT TRUE
      AND u.oxxo_load_count = 0
      AND u.spei_load_count = 0
      AND u.card_load_count = 0
    GROUP BY u.id, u.telefono
    HAVING COUNT(wt.id) > 0
  `);

  const users = rows as Array<{
    id: number; telefono: string;
    oxxo: number; spei: number; card: number;
    first_method: string | null; last_method: string | null;
    first_spei_at: string | null;
  }>;

  logger.info({ count: users.length }, "backfillPaymentMethodCounters: starting");

  for (const u of users) {
    const firstMethod = mapTransactionTypeToMethod(u.first_method ?? "") ?? u.first_method;
    const lastMethod  = mapTransactionTypeToMethod(u.last_method  ?? "") ?? u.last_method;
    await db.execute(sql`
      UPDATE users SET
        oxxo_load_count        = ${u.oxxo},
        spei_load_count        = ${u.spei},
        card_load_count        = ${u.card},
        first_load_method      = ${firstMethod},
        last_load_method       = ${lastMethod},
        first_spei_load_at     = ${u.first_spei_at ? new Date(u.first_spei_at) : null},
        load_method_updated_at = NOW()
      WHERE id = ${u.id}
    `);
    logger.info({ telefono: u.telefono, oxxo: u.oxxo, spei: u.spei, card: u.card },
      "backfillPaymentMethodCounters: user updated");
  }

  logger.info({ count: users.length }, "backfillPaymentMethodCounters: complete");
}
