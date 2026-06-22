import { db } from "@workspace/db";
import { sql as drizzleSql } from "drizzle-orm";
import { logger } from "../lib/logger.js";
import { sendWhatsApp } from "../lib/whatsapp.js";

// Types that do NOT count as real bill payments (same as rest of lifecycle system)
const NON_PAYMENT_TYPES = `'SIGNUP_BONUS','load_oxxo','load_card','load_spei','load_banco','peer_transfer_in'`;

function normalizePhone(phone: string): string {
  if (phone.startsWith("+")) return phone;
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+52${digits}`;
  return `+${digits}`;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// ─────────────────────────────────────────────────────────────────────────────
// runWinbackSweep
//
// Eligibility:
//   1. account ≥30 days old
//   2. received 24h activation nudge (confirmed real registered user)
//   3. winback_sent_at IS NULL (never received win-back)
//   4. zero completed bill payments
//   5. telefono IS NOT NULL (can be reached via WhatsApp)
//
// Batch safety: max 50 per sweep, 500ms between sends, never throws
// ─────────────────────────────────────────────────────────────────────────────
export async function runWinbackSweep(): Promise<{ sent: number; skipped: number }> {
  logger.info("winback-cron: sweep starting");
  let sent = 0;
  let skipped = 0;

  try {
    const eligibleR = await db.execute(drizzleSql`
      SELECT u.id, u.telefono, u.kyc_full_name
      FROM users u
      WHERE u.created_at < NOW() - INTERVAL '30 days'
        AND u.activation_nudge_24h_sent_at IS NOT NULL
        AND u.winback_sent_at IS NULL
        AND u.telefono IS NOT NULL
        AND (u.is_test_account IS NULL OR u.is_test_account = false)
        AND NOT EXISTS (
          SELECT 1 FROM wallet_transactions wt
          JOIN wallets w ON w.id = wt.wallet_id
          WHERE w.user_id = u.telefono
            AND wt.type NOT IN (${drizzleSql.raw(NON_PAYMENT_TYPES)})
            AND wt.status NOT IN ('pending', 'failed')
        )
      LIMIT 50
    `);

    const users = eligibleR.rows as Array<{
      id: number;
      telefono: string;
      kyc_full_name: string | null;
    }>;

    // Load winback_30d template from paula_messages
    const tmplR = await db.execute(drizzleSql`
      SELECT template_es FROM paula_messages
      WHERE trigger_type = 'winback_30d' AND active = true
      LIMIT 1
    `);
    const templateEs = (tmplR.rows[0] as { template_es?: string } | undefined)?.template_es;

    if (!templateEs) {
      logger.warn("winback-cron: winback_30d template not found or inactive — aborting sweep");
      return { sent: 0, skipped: users.length };
    }

    for (const user of users) {
      try {
        const rawName = (user.kyc_full_name ?? "").trim();
        const firstName = rawName.split(/\s+/)[0] || "amigo";
        const message = templateEs.replace(/\{\{nombre\}\}/g, firstName);
        const phone = normalizePhone(user.telefono);

        await sendWhatsApp(phone, message);

        // Stamp winback_sent_at only on successful send
        await db.execute(drizzleSql`
          UPDATE users SET winback_sent_at = NOW() WHERE id = ${user.id}
        `);

        // Log to paula_trigger_log
        await db.execute(drizzleSql`
          INSERT INTO paula_trigger_log
            (telefono, trigger_type, trigger_data, message_sent, whatsapp_sent, fired_at)
          VALUES (
            ${user.telefono},
            'winback_30d',
            ${JSON.stringify({ userId: user.id })}::jsonb,
            ${message},
            true,
            NOW()
          )
        `);

        sent++;
        logger.info({ userId: user.id, telefono: user.telefono }, "winback-cron: message sent");

        // 500ms between sends — respect Twilio rate limits
        if (sent < users.length) await sleep(500);
      } catch (err) {
        skipped++;
        logger.warn({ err, userId: user.id }, "winback-cron: send failed — will retry next run");
        // Do NOT update winback_sent_at — allows retry on next cron run
      }
    }
  } catch (err) {
    logger.error({ err }, "winback-cron: sweep failed");
  }

  logger.info({ sent, skipped }, "winback-cron: sweep complete");
  return { sent, skipped };
}

// ─────────────────────────────────────────────────────────────────────────────
// startWinbackCron — daily at 10 AM MX (16:00 UTC)
// ─────────────────────────────────────────────────────────────────────────────
export function startWinbackCron(): void {
  const scheduleNext = () => {
    const now = new Date();
    const next = new Date();
    next.setUTCHours(16, 0, 0, 0); // 10 AM MX (UTC-6)
    if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
    const delayMs = next.getTime() - now.getTime();
    logger.info({ nextInMs: delayMs }, "winback-cron: scheduled");
    setTimeout(async () => {
      await runWinbackSweep();
      scheduleNext();
    }, delayMs);
  };
  scheduleNext();
  logger.info("winback-cron: 30d win-back cron registered (daily 10 AM MX)");
}
