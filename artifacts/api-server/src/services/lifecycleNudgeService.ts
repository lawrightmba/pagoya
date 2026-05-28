import { db } from "@workspace/db";
import { sql as drizzleSql } from "drizzle-orm";
import { logger } from "../lib/logger.js";
import { sendWhatsApp } from "../lib/whatsapp.js";

const REFERRAL_DELAY_MS = 60 * 60 * 1000; // 60 minutes

// Types excluded from "real payment" counts — loads and signup bonuses
const NON_PAYMENT_TYPES = `'SIGNUP_BONUS','load_oxxo','load_card','load_spei','load_banco','peer_transfer_in'`;

function normalizePhone(phone: string): string {
  if (phone.startsWith("+")) return phone;
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+52${digits}`;
  return `+${digits}`;
}

async function getBonusAmount(): Promise<number> {
  try {
    const r = await db.execute(drizzleSql`SELECT value FROM admin_config WHERE key = 'signup_bonus_amount' LIMIT 1`);
    const row = r.rows[0] as { value?: string } | undefined;
    return row?.value ? parseInt(row.value, 10) : 25;
  } catch {
    return 25;
  }
}

async function getRealPaymentCount(telefono: string): Promise<number> {
  const r = await db.execute(drizzleSql`
    SELECT COUNT(*) AS cnt
    FROM wallet_transactions wt
    JOIN wallets w ON w.id = wt.wallet_id
    WHERE w.user_id = ${telefono}
      AND wt.type NOT IN (${drizzleSql.raw(NON_PAYMENT_TYPES)})
      AND wt.status NOT IN ('pending','failed')
  `);
  return parseInt(String((r.rows[0] as any)?.cnt ?? "0"), 10);
}

async function getLastPaymentDate(telefono: string): Promise<Date | null> {
  const r = await db.execute(drizzleSql`
    SELECT wt.created_at
    FROM wallet_transactions wt
    JOIN wallets w ON w.id = wt.wallet_id
    WHERE w.user_id = ${telefono}
      AND wt.type NOT IN (${drizzleSql.raw(NON_PAYMENT_TYPES)})
      AND wt.status NOT IN ('pending','failed')
    ORDER BY wt.created_at DESC
    LIMIT 1
  `);
  const row = r.rows[0] as { created_at?: string } | undefined;
  return row?.created_at ? new Date(row.created_at) : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// NUDGE 1 — Low Balance Reminder
// Trigger: balance 0–50, ≥1 real payment, no payment in 7 days, last nudge >14 days
// Cron: every 6 hours
// ─────────────────────────────────────────────────────────────────────────────
export async function sendLowBalanceNudge(userId: number): Promise<{ sent: boolean; reason?: string }> {
  try {
    const r = await db.execute(drizzleSql`SELECT * FROM users WHERE id = ${userId} LIMIT 1`);
    const user = r.rows[0] as Record<string, unknown> | undefined;
    if (!user) return { sent: false, reason: "user_not_found" };

    const telefono = user.telefono as string;

    const realCount = await getRealPaymentCount(telefono);
    if (realCount < 1) return { sent: false, reason: "no_real_payments" };

    const walletR = await db.execute(drizzleSql`
      SELECT balance_mxn FROM wallets WHERE user_id = ${telefono} LIMIT 1
    `);
    const balance = parseFloat(String((walletR.rows[0] as any)?.balance_mxn ?? "0"));
    if (balance <= 0 || balance >= 50) return { sent: false, reason: "balance_not_low" };

    const lastSent = user.low_balance_nudge_sent_at as string | null;
    if (lastSent) {
      const daysSince = (Date.now() - new Date(lastSent).getTime()) / 86_400_000;
      if (daysSince < 14) return { sent: false, reason: "too_recent" };
    }

    const lastPayment = await getLastPaymentDate(telefono);
    if (lastPayment) {
      const daysSince = (Date.now() - lastPayment.getTime()) / 86_400_000;
      if (daysSince < 7) return { sent: false, reason: "recently_active" };
    }

    // Get most recent paid service name from description
    const svcR = await db.execute(drizzleSql`
      SELECT wt.description
      FROM wallet_transactions wt
      JOIN wallets w ON w.id = wt.wallet_id
      WHERE w.user_id = ${telefono}
        AND wt.type NOT IN (${drizzleSql.raw(NON_PAYMENT_TYPES)})
        AND wt.status NOT IN ('pending','failed')
      ORDER BY wt.created_at DESC
      LIMIT 1
    `);
    const desc = String((svcR.rows[0] as any)?.description ?? "");
    const serviceMatch = desc.match(/^([A-ZÀ-Ü][^\s·]+)/);
    const mostRecentService = serviceMatch ? serviceMatch[1] : "recibo";

    const firstName = ((user.kyc_full_name as string) ?? "").split(" ")[0].trim() || "amigo";
    const phone = normalizePhone(telefono);
    const balanceStr = balance.toFixed(2).replace(/\.00$/, "");

    const message =
      `Hola ${firstName} 👋 Tu saldo en PagoYa está bajo ` +
      `($${balanceStr} MXN disponibles).\n\n` +
      `Recarga antes de que llegue tu próximo ${mostRecentService} ` +
      `y págalo en segundos desde aquí.\n\n` +
      `💳 pagoyamx.com/cargar\n\n` +
      `O escríbele a Paula y te ayuda ahora mismo 💬`;

    await sendWhatsApp(phone, message);
    await db.execute(drizzleSql`UPDATE users SET low_balance_nudge_sent_at = NOW() WHERE id = ${userId}`);
    logger.info({ userId, balance, mostRecentService }, "lifecycle: low-balance nudge sent");
    return { sent: true };
  } catch (err) {
    logger.error({ err, userId }, "lifecycle: low-balance nudge failed");
    return { sent: false, reason: "send_error" };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// NUDGE 2 — Bill Discovery
// Trigger: ≥2 real payments, low biller diversity, balance ≥25, account ≥14 days, last nudge >30 days
// Cron: daily at 10am Mexico City (16:00 UTC)
// ─────────────────────────────────────────────────────────────────────────────
export async function sendBillDiscoveryNudge(userId: number): Promise<{ sent: boolean; reason?: string }> {
  try {
    const r = await db.execute(drizzleSql`SELECT * FROM users WHERE id = ${userId} LIMIT 1`);
    const user = r.rows[0] as Record<string, unknown> | undefined;
    if (!user) return { sent: false, reason: "user_not_found" };

    const telefono = user.telefono as string;

    const realCount = await getRealPaymentCount(telefono);
    if (realCount < 2) return { sent: false, reason: "not_enough_payments" };

    const walletR = await db.execute(drizzleSql`
      SELECT balance_mxn FROM wallets WHERE user_id = ${telefono} LIMIT 1
    `);
    const balance = parseFloat(String((walletR.rows[0] as any)?.balance_mxn ?? "0"));
    if (balance < 25) return { sent: false, reason: "insufficient_balance" };

    const lastSent = user.bill_discovery_nudge_sent_at as string | null;
    if (lastSent) {
      const daysSince = (Date.now() - new Date(lastSent).getTime()) / 86_400_000;
      if (daysSince < 30) return { sent: false, reason: "too_recent" };
    }

    const createdAt = new Date(user.created_at as string);
    const accountAgeDays = (Date.now() - createdAt.getTime()) / 86_400_000;
    if (accountAgeDays < 14) return { sent: false, reason: "account_too_new" };

    // Services this user has already paid (extract first capitalised word from description)
    const paidR = await db.execute(drizzleSql`
      SELECT DISTINCT
        REGEXP_REPLACE(wt.description, E'[[:space:]·\\|].*$', '') AS svc
      FROM wallet_transactions wt
      JOIN wallets w ON w.id = wt.wallet_id
      WHERE w.user_id = ${telefono}
        AND wt.type NOT IN (${drizzleSql.raw(NON_PAYMENT_TYPES)})
        AND wt.status NOT IN ('pending','failed')
        AND wt.description IS NOT NULL
    `);
    const paidSet = new Set(
      (paidR.rows as any[]).map(row => (row.svc as string ?? "").toLowerCase())
    );

    // Count unique services — gate on low diversity (≤ 2 unique)
    if (paidSet.size > 2) return { sent: false, reason: "high_diversity" };

    // Platform-wide top services the user hasn't paid yet
    const topR = await db.execute(drizzleSql`
      SELECT
        REGEXP_REPLACE(description, E'[[:space:]·\\|].*$', '') AS svc,
        COUNT(*) AS cnt
      FROM wallet_transactions
      WHERE type NOT IN (${drizzleSql.raw(NON_PAYMENT_TYPES)})
        AND status NOT IN ('pending','failed')
        AND description IS NOT NULL
        AND description != ''
      GROUP BY svc
      ORDER BY cnt DESC
      LIMIT 20
    `);

    const suggestions = (topR.rows as any[])
      .map(row => (row.svc as string ?? "").trim())
      .filter(s => s.length > 1 && !paidSet.has(s.toLowerCase()))
      .slice(0, 2);

    // Hardcoded fallback if platform has no history yet
    const fallbacks = ["Telmex", "CFE", "Izzi", "Totalplay", "Telcel", "Agua SAPA"];
    while (suggestions.length < 2) {
      const fb = fallbacks.find(f => !paidSet.has(f.toLowerCase()) && !suggestions.includes(f));
      if (!fb) break;
      suggestions.push(fb);
    }

    if (suggestions.length < 1) return { sent: false, reason: "no_suggestions" };

    const service1 = suggestions[0];
    const service2 = suggestions[1] ?? "más servicios";
    const firstName = ((user.kyc_full_name as string) ?? "").split(" ")[0].trim() || "amigo";
    const phone = normalizePhone(telefono);

    const message =
      `Hola ${firstName} 💡 ¿Sabías que también puedes pagar estos ` +
      `servicios con tu billetera PagoYa?\n\n` +
      `${service1} · ${service2}\n\n` +
      `Más de 20 servicios disponibles — luz, agua, teléfono, internet, ` +
      `streaming y más.\n\n` +
      `👉 pagoyamx.com/pagar\n\n` +
      `Paula te ayuda a encontrar el tuyo 💬`;

    await sendWhatsApp(phone, message);
    await db.execute(drizzleSql`UPDATE users SET bill_discovery_nudge_sent_at = NOW() WHERE id = ${userId}`);
    logger.info({ userId, service1, service2 }, "lifecycle: bill-discovery nudge sent");
    return { sent: true };
  } catch (err) {
    logger.error({ err, userId }, "lifecycle: bill-discovery nudge failed");
    return { sent: false, reason: "send_error" };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// NUDGE 3 — Referral Ask
// Trigger: ≥3 real payments, never referred anyone, send once, last payment <7 days
// Fired via scheduleReferralNudgeIfEligible() at payment success — NOT a cron
// ─────────────────────────────────────────────────────────────────────────────
export async function sendReferralNudge(userId: number): Promise<{ sent: boolean; reason?: string }> {
  try {
    const r = await db.execute(drizzleSql`SELECT * FROM users WHERE id = ${userId} LIMIT 1`);
    const user = r.rows[0] as Record<string, unknown> | undefined;
    if (!user) return { sent: false, reason: "user_not_found" };

    const telefono = user.telefono as string;

    const realCount = await getRealPaymentCount(telefono);
    if (realCount < 3) return { sent: false, reason: "not_enough_payments" };

    // Check if user has ever referred anyone (by phone or by their referral_code)
    const existingCode = user.referral_code as string | null;
    const refCheckR = await db.execute(drizzleSql`
      SELECT COUNT(*) AS cnt FROM users
      WHERE signup_ref_code = ${telefono}
         OR (${existingCode} IS NOT NULL AND signup_ref_code = ${existingCode ?? ""})
    `);
    const referredCount = parseInt(String((refCheckR.rows[0] as any)?.cnt ?? "0"), 10);
    if (referredCount > 0) return { sent: false, reason: "already_referred" };

    if (user.referral_nudge_sent_at) return { sent: false, reason: "already_sent" };

    const lastPayment = await getLastPaymentDate(telefono);
    if (!lastPayment) return { sent: false, reason: "no_payments" };
    const daysSincePayment = (Date.now() - lastPayment.getTime()) / 86_400_000;
    if (daysSincePayment > 7) return { sent: false, reason: "not_recently_active" };

    // Ensure referral_code exists — generate user_XXXX from last 4 digits
    let referralCode = existingCode;
    if (!referralCode) {
      const last4 = telefono.replace(/\D/g, "").slice(-4);
      referralCode = `user_${last4}`;
      await db.execute(drizzleSql`UPDATE users SET referral_code = ${referralCode} WHERE id = ${userId}`);
    }

    const bonusAmount = await getBonusAmount();
    const firstName = ((user.kyc_full_name as string) ?? "").split(" ")[0].trim() || "amigo";
    const phone = normalizePhone(telefono);
    const referralLink = `pagoyamx.com/register?ref=${referralCode}`;

    const message =
      `Hola ${firstName} ¡Gracias por tu pago! 🎉\n\n` +
      `¿Conoces a alguien que pague sus recibos en OXXO o en efectivo?\n\n` +
      `Comparte PagoYa con ellos — cuando se registren con tu enlace, ` +
      `ambos reciben $${bonusAmount} MXN en su billetera.\n\n` +
      `🔗 ${referralLink}\n\n` +
      `Es gratis y en menos de 2 minutos están listos 💬`;

    await sendWhatsApp(phone, message);
    await db.execute(drizzleSql`UPDATE users SET referral_nudge_sent_at = NOW() WHERE id = ${userId}`);
    logger.info({ userId, referralCode }, "lifecycle: referral nudge sent");
    return { sent: true };
  } catch (err) {
    logger.error({ err, userId }, "lifecycle: referral nudge failed");
    return { sent: false, reason: "send_error" };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// scheduleReferralNudgeIfEligible
// Call this at payment success — fires after 60-min delay, fire-and-forget, never throws
// ─────────────────────────────────────────────────────────────────────────────
export function scheduleReferralNudgeIfEligible(userId: number): void {
  logger.info({ userId, delayMs: REFERRAL_DELAY_MS }, "lifecycle: referral nudge queued (60 min)");
  setTimeout(async () => {
    try {
      const result = await sendReferralNudge(userId);
      logger.info({ userId, ...result }, "lifecycle: referral nudge delayed send complete");
    } catch (err) {
      logger.error({ err, userId }, "lifecycle: referral nudge uncaught error in delayed send");
    }
  }, REFERRAL_DELAY_MS);
}

// ─────────────────────────────────────────────────────────────────────────────
// Cron: Low Balance — every 6 hours
// ─────────────────────────────────────────────────────────────────────────────
export function startLowBalanceNudgeCron(): void {
  const INTERVAL_MS = 6 * 60 * 60 * 1000;
  const run = async () => {
    logger.info("lifecycle-cron: low-balance sweep starting");
    const r = await db.execute(drizzleSql`SELECT id FROM users ORDER BY created_at DESC`).catch(() => ({ rows: [] as any[] }));
    let sent = 0;
    for (const row of r.rows) {
      const result = await sendLowBalanceNudge((row as any).id);
      if (result.sent) sent++;
    }
    logger.info({ sent }, "lifecycle-cron: low-balance sweep complete");
  };
  run().catch(() => {});
  setInterval(() => run().catch(() => {}), INTERVAL_MS);
  logger.info("lifecycle-cron: low-balance cron registered (every 6h)");
}

// ─────────────────────────────────────────────────────────────────────────────
// Cron: Bill Discovery — daily at 10am Mexico City (16:00 UTC)
// ─────────────────────────────────────────────────────────────────────────────
export function startBillDiscoveryNudgeCron(): void {
  const scheduleNext = () => {
    const now = new Date();
    const next = new Date();
    next.setUTCHours(16, 0, 0, 0);
    if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
    const delayMs = next.getTime() - now.getTime();
    logger.info({ nextInMs: delayMs }, "lifecycle-cron: bill-discovery scheduled");
    setTimeout(async () => {
      logger.info("lifecycle-cron: bill-discovery sweep starting");
      const r = await db.execute(drizzleSql`SELECT id FROM users ORDER BY created_at DESC`).catch(() => ({ rows: [] as any[] }));
      let sent = 0;
      for (const row of r.rows) {
        const result = await sendBillDiscoveryNudge((row as any).id);
        if (result.sent) sent++;
      }
      logger.info({ sent }, "lifecycle-cron: bill-discovery sweep complete");
      scheduleNext();
    }, delayMs);
  };
  scheduleNext();
}
