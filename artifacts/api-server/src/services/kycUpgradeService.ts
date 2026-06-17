import { sql } from "drizzle-orm";
import { sendWhatsApp } from "../lib/whatsapp.js";
import { logger } from "../lib/logger.js";

const KYC_UPGRADE_THRESHOLD_MXN = 3200;

/**
 * Check if a user's cumulative confirmed payments have crossed the KYC upgrade
 * threshold ($3,200 MXN) and, if so, upgrade their kyc_tier to 'standard' and
 * send a conversational CURP request via WhatsApp.
 *
 * This function is SAFE to call fire-and-forget — it never throws.
 * User is identified by telefono (the primary key / unique identifier in PagoYa).
 */
export async function checkAndUpgradeKycTier(telefono: string): Promise<void> {
  try {
    const { db } = await import("@workspace/db");

    // Only act on simplified-tier users
    const userRes = await db.execute(sql`
      SELECT kyc_tier FROM users WHERE telefono = ${telefono} LIMIT 1
    `);
    if (!userRes.rows.length) return;
    const row = userRes.rows[0] as Record<string, unknown>;
    if (row.kyc_tier !== "simplified") return;

    // Sum all confirmed payments for this user
    const sumRes = await db.execute(sql`
      SELECT COALESCE(SUM(monto::numeric), 0) AS total
      FROM bill_payments
      WHERE telefono = ${telefono}
        AND status = 'confirmed'
    `);
    const total = parseFloat(String((sumRes.rows[0] as Record<string, unknown>).total ?? "0"));
    if (total < KYC_UPGRADE_THRESHOLD_MXN) return;

    // Upgrade tier (idempotent — only fires if still 'simplified')
    const updated = await db.execute(sql`
      UPDATE users
      SET kyc_tier = 'standard'
      WHERE telefono = ${telefono}
        AND kyc_tier = 'simplified'
      RETURNING telefono
    `);
    if (!updated.rows.length) return; // already upgraded by concurrent call

    // Write audit log
    await db.execute(sql`
      INSERT INTO kyc_upgrade_log (user_id, from_tier, to_tier, trigger_amount_mxn, triggered_at)
      VALUES (${telefono}, 'simplified', 'standard', ${total}, NOW())
      ON CONFLICT (user_id, from_tier, to_tier) DO NOTHING
    `).catch(() => {});

    logger.info({ telefono, total }, "kyc: upgraded simplified → standard");

    // Get first name for personalised message
    const nameRes = await db.execute(sql`
      SELECT kyc_full_name FROM users WHERE telefono = ${telefono} LIMIT 1
    `);
    const fullName = String((nameRes.rows[0] as Record<string, unknown>)?.kyc_full_name ?? "");
    const firstName = fullName.split(" ")[0] || "estimado usuario";

    const message =
      `¡Hola ${firstName}! 🎉 Tu historial de pagos con PagoYa es excelente.\n\n` +
      `Para seguir construyendo tu *identidad financiera* y acceder a mejores productos en el futuro, puedes registrar tu *CURP* en tu perfil. Es opcional, pero acelera tu progreso hacia el nivel Oro.\n\n` +
      `¿Te gustaría agregarlo ahora? Responde con tu CURP (18 caracteres) o escribe *"después"* si prefieres hacerlo más tarde.`;

    await sendWhatsApp(telefono, message).catch((err) =>
      logger.error({ err, telefono }, "kyc: CURP request WhatsApp failed"),
    );
  } catch (err) {
    // Never throw — never block payment flow
    logger.error({ err, telefono }, "kyc: checkAndUpgradeKycTier failed");
  }
}
