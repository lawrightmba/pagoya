import { db, usersTable, walletsTable, walletTransactionsTable } from "@workspace/db";
import { eq, and, ne } from "drizzle-orm";
import { logger } from "../lib/logger.js";
import { sendWhatsApp } from "../lib/whatsapp.js";

const NUDGE_DELAY_MS = 10 * 60 * 1000; // 10 minutes

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
      `Hola ${firstName} 👋 Tu cuenta PagoYa ya está activa.\n\n` +
      `Tienes *${bonusDisplay} de bienvenida* en tu billetera ahora mismo 🎁\n\n` +
      `Úsalos para pagar tu CFE, Telmex, Izzi o recargar tu celular — ` +
      `sin banco, sin filas, en segundos.\n\n` +
      `¿Quieres pagar algo? Solo dime el servicio aquí mismo.\n` +
      `¿Preguntas? Responde y te ayudo.`;

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
// Fire-and-forget; never throws.
// ─────────────────────────────────────────────────────────────────────────────

export function scheduleNudge(userId: number): void {
  logger.info({ userId, delayMs: NUDGE_DELAY_MS }, "nudge: queued for 10 min");
  setTimeout(async () => {
    try {
      const result = await sendActivationNudge(userId);
      logger.info({ userId, ...result }, "nudge: delayed send complete");
    } catch (err) {
      logger.error({ err, userId }, "nudge: uncaught error in delayed send");
    }
  }, NUDGE_DELAY_MS);
}
