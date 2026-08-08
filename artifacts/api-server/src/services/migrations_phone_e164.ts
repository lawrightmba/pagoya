/**
 * Phone number E.164 migration.
 *
 * Normalises all stored phone/telefono columns from the legacy 10-digit
 * format to full E.164 (e.g. "3221839799" → "+523221839799").
 *
 * Also handles the small number of rows already stored in partial E.164
 * ("+521234567890" style with a stray "+" or inconsistent prefix) by
 * re-normalising them to the canonical "+<digits>" form.
 *
 * Idempotent: all UPDATE statements are guarded with WHERE clauses that
 * match only rows still in the old format, so re-running is a no-op.
 *
 * FK ordering: `users` is updated first (it is the FK parent for wallets
 * and saved_cards), then child tables so FK checks pass.
 */

import { pool } from "@workspace/db";
import { logger } from "../lib/logger.js";

/** Convert a SQL column to E.164 in-place. Handles both 10-digit and partial-E164 rows. */
function upgradeColSql(table: string, col: string): string {
  return `
    UPDATE ${table}
    SET ${col} = CASE
      WHEN ${col} ~ '^\\d{10}$'
        THEN '+52' || ${col}
      WHEN ${col} LIKE '+%'
        THEN '+' || REGEXP_REPLACE(${col}, '[^0-9]', '', 'g')
      ELSE ${col}
    END
    WHERE ${col} ~ '^\\d{10}$'
       OR ${col} LIKE '+%'
  `;
}

export async function runPhoneE164Migration(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // ── 1. users (FK parent — must go first) ────────────────────────────────
    await client.query(upgradeColSql("users", "telefono"));
    logger.info("[phone-e164] users.telefono normalised");

    // ── 2. wallets (FK child of users.telefono via user_id) ─────────────────
    // user_id in wallets stores telefono as the join key
    const walletsExists = await client.query(`
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'wallets'
    `);
    if (walletsExists.rowCount) {
      await client.query(upgradeColSql("wallets", "user_id"));
      logger.info("[phone-e164] wallets.user_id normalised");
    }

    // ── 3. saved_cards (FK child of users.telefono) ──────────────────────────
    const savedCardsExists = await client.query(`
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'saved_cards' AND column_name = 'user_telefono'
    `);
    if (savedCardsExists.rowCount) {
      await client.query(upgradeColSql("saved_cards", "user_telefono"));
      logger.info("[phone-e164] saved_cards.user_telefono normalised");
    }

    // ── 4. Standalone tables (no FK to users.telefono) ───────────────────────
    const standaloneUpdates: Array<[string, string]> = [
      ["bill_payments",            "telefono"],
      ["bonus_fraud_flags",        "telefono"],
      ["pagoya_payments",          "telefono"],
      ["loyalty_accounts",         "phone"],
      ["loyalty_transactions",     "phone"],
      ["scratch_card_plays",       "telefono"],
      ["user_events",              "telefono"],
      ["complaint_log",            "telefono"],
      ["reminder_log",             "telefono"],
      ["push_subscriptions",       "telefono"],
      ["user_billers",             "telefono"],
      ["pti_behavioral_signals",   "telefono"],
      ["pti_score_history",        "telefono"],
      ["pti_score_input_snapshots","telefono"],
      ["paula_messages",           "telefono"],
      ["paula_trigger_log",        "telefono"],
      ["paula_send_queue",         "telefono"],
      ["paula_inbound_log",        "phone_key"],
      ["street_team",              "phone"],
      ["rep_velocity_flags",       "user_phone"],
    ];

    for (const [table, col] of standaloneUpdates) {
      // Check table exists before updating (some tables may not be present in all envs)
      const exists = await client.query(`
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2
      `, [table, col]);
      if (exists.rowCount) {
        await client.query(upgradeColSql(table, col));
        logger.info(`[phone-e164] ${table}.${col} normalised`);
      }
    }

    // ── US/CA number correction pass ─────────────────────────────────────────
    // If a US/CA user registered before this migration ran, their 10-digit number
    // would have been incorrectly prefixed with +52 in the general backfill above.
    // Known case: +17138052626 (Houston 713) registered 2026-08-08 via web flow.
    // Correct +527138052626 → +17138052626 for registrations after 2026-08-07
    // (the date constraint prevents touching any existing MX Querétaro 713 users).
    const knownUSCorrections: Array<{ wrong: string; correct: string; since: string }> = [
      { wrong: "+527138052626", correct: "+17138052626", since: "2026-08-07" },
    ];
    for (const { wrong, correct, since } of knownUSCorrections) {
      await client.query(`
        UPDATE users SET telefono = $1 WHERE telefono = $2 AND created_at >= $3::date
      `, [correct, wrong, since]);
      await client.query(`
        UPDATE wallets SET user_id = $1
        WHERE user_id = $2
          AND EXISTS (SELECT 1 FROM users WHERE telefono = $1)
      `, [correct, wrong]);
      await client.query(`
        UPDATE saved_cards SET user_telefono = $1 WHERE user_telefono = $2
      `, [correct, wrong]);
      logger.info(`[phone-e164] US/CA correction applied: ${wrong} → ${correct}`);
    }

    await client.query("COMMIT");
    logger.info("[phone-e164] migration complete — all phone columns normalised to E.164");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {/* ignore */});
    logger.error({ err }, "[phone-e164] migration failed — rolled back");
    throw err;
  } finally {
    client.release();
  }
}
