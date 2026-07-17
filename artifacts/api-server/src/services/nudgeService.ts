import { db, usersTable, walletsTable, walletTransactionsTable } from "@workspace/db";
import { eq, and, ne, lte, isNull, isNotNull } from "drizzle-orm";
import { sql as drizzleSql } from "drizzle-orm";
import { logger } from "../lib/logger.js";
import { sendWhatsApp } from "../lib/whatsapp.js";

/**
 * Prepend +52 if the stored phone has no country code prefix.
 * Matches the sendWhatsApp helper which also normalises with "+".
 */
function normalizePhone(phone: string): string {
  if (phone.startsWith("+")) return phone;
  const digits = phone.replace(/\D/g, "");
  // 10-digit → Mexican number, prepend +52
  if (digits.length === 10) return `+52${digits}`;
  // Assume digits already include country code (e.g. 521234567890)
  return `+${digits}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// sendActivationNudge — safe to call directly (e.g. from the debug route)
// ─────────────────────────────────────────────────────────────────────────────

export async function sendActivationNudge(userId: number): Promise<{
  sent: boolean;
  reason?: string;
}> {
  try {
    // ── 1. Load user ───────────────────────────────────────────────────────
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

    if (!user) {
      logger.warn({ userId }, "nudge: user not found — skipping");
      return { sent: false, reason: "user_not_found" };
    }

    // ── 1b. Consent gate: proactive sends require affirmative WhatsApp opt-in ─
    if (!user.whatsappConsentAt) {
      logger.info({ userId }, "nudge: no WhatsApp consent — skipping");
      return { sent: false, reason: "no_consent" };
    }

    // ── 2. De-duplicate: never send twice ─────────────────────────────────
    if (user.nudgeSentAt) {
      logger.info({ userId }, "nudge: already sent — skipping");
      return { sent: false, reason: "already_sent" };
    }

    // ── 3. Skip if the user has already made any non-bonus transaction ────
    const [wallet] = await db
      .select({ id: walletsTable.id })
      .from(walletsTable)
      .where(eq(walletsTable.userId, user.telefono))
      .limit(1);

    if (wallet) {
      const [firstPayment] = await db
        .select({ id: walletTransactionsTable.id })
        .from(walletTransactionsTable)
        .where(
          and(
            eq(walletTransactionsTable.walletId, wallet.id),
            ne(walletTransactionsTable.type, "SIGNUP_BONUS"),
          ),
        )
        .limit(1);

      if (firstPayment) {
        logger.info({ userId }, "nudge: user already transacted — skipping");
        return { sent: false, reason: "already_transacted" };
      }
    }

    // ── 4. Build message ───────────────────────────────────────────────────
    const firstName = (user.kycFullName ?? "").split(" ")[0].trim() || "amigo";
    const phone = normalizePhone(user.telefono);

    // Fetch live bonus amount from config so copy is always accurate
    let bonusDisplay = "$150 MXN";
    try {
      const configR = await db.execute(
        drizzleSql`SELECT bonus_amount, is_active FROM signup_bonus_config WHERE id = 1 LIMIT 1`
      );
      const cfg = configR.rows[0] as { bonus_amount?: string; is_active?: boolean } | undefined;
      if (cfg?.is_active && cfg.bonus_amount) {
        bonusDisplay = `$${parseFloat(cfg.bonus_amount).toFixed(0)} MXN`;
      }
    } catch { /* use default */ }

    const message =
      `Hola ${firstName} 👋 ¡Bienvenido a PagoYa!\n\n` +
      `Tienes *${bonusDisplay} de bienvenida* en tu billetera ahora mismo 🎁\n\n` +
      `¿Con qué empezamos?\n\n` +
      `1️⃣ Pagar un servicio (CFE, Telmex, Izzi, agua…)\n` +
      `2️⃣ Enviar dinero a alguien\n` +
      `3️⃣ Recargar tiempo aire (Telcel, AT&T, Movistar)\n` +
      `🎁 Tarjetas de regalo o Netflix\n\n` +
      `Sin banco, sin filas — en segundos.\n` +
      `Solo responde con el número o dime qué necesitas 👇`;

    // ── 5. Send via Twilio ─────────────────────────────────────────────────
    await sendWhatsApp(phone, message);

    // ── 6. Stamp nudge_sent_at to prevent re-sends ─────────────────────────
    await db
      .update(usersTable)
      .set({ nudgeSentAt: new Date() })
      .where(eq(usersTable.id, userId));

    logger.info({ userId, phone }, "nudge: sent and recorded");
    return { sent: true };
  } catch (err) {
    // Log only — do NOT retry automatically to avoid duplicate sends.
    // Flag for manual review.
    logger.error({ err, userId }, "nudge: send failed — manual review required");
    return { sent: false, reason: "send_error" };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// scheduleNudge — call immediately after successful registration.
// Writes a fire_at timestamp to the DB instead of using setTimeout,
// so the schedule survives server restarts.
// Fire-and-forget; never throws.
// ─────────────────────────────────────────────────────────────────────────────

export function scheduleNudge(userId: number): void {
  db.execute(
    drizzleSql`
      UPDATE users
      SET nudge_scheduled_at = NOW() + INTERVAL '10 minutes'
      WHERE id = ${userId}
        AND nudge_sent_at IS NULL
        AND nudge_scheduled_at IS NULL
    `
  )
    .then(() => {
      logger.info({ userId }, "nudge: scheduled in DB (fires in 10 min)");
    })
    .catch((err) => {
      logger.error({ err, userId }, "nudge: failed to write schedule to DB");
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// startNudgePollCron — call once at server startup.
// Polls every 2 minutes for due nudges and fires them.
// ─────────────────────────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 2 * 60 * 1000;

export function startNudgePollCron(): void {
  const poll = async () => {
    try {
      const due = await db.execute(
        drizzleSql`
          SELECT id
          FROM users
          WHERE nudge_scheduled_at IS NOT NULL
            AND nudge_scheduled_at <= NOW()
            AND nudge_sent_at IS NULL
          LIMIT 20
        `
      );

      const rows = due.rows as { id: number }[];
      if (rows.length === 0) return;

      logger.info({ count: rows.length }, "nudge-cron: processing due nudges");

      for (const row of rows) {
        const result = await sendActivationNudge(row.id);
        logger.info({ userId: row.id, ...result }, "nudge-cron: send result");
      }
    } catch (err) {
      logger.error({ err }, "nudge-cron: poll error");
    }
  };

  // Run once immediately (catches any due nudges from before last restart),
  // then on the interval.
  void poll();
  setInterval(poll, POLL_INTERVAL_MS);
  logger.info({ intervalMs: POLL_INTERVAL_MS }, "nudge-cron: DB-polling cron registered (every 2min)");
}
