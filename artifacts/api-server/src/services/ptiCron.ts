/**
 * PTI Nightly Cron — Predictive Trust Index batch jobs
 *
 * Phase 0 / Phase 1 architecture decision:
 *   PTI = nightly batch (computed at 2 AM Mexico City = 08:00 UTC)
 *   Event-triggered recalculation deferred to Phase 2+ once credit gating is live.
 *   Nightly is simpler, auditable, and sufficient until a real-time credit product exists.
 *
 * Jobs:
 *   1. nightlyFinancialSnapshots — captures a daily baseline row per active user
 *      → enables Phase 2 30/60/90-day trend vectors WITHOUT retroactive data loss
 *   2. nightlyPtiBatch           — recomputes PTI + writes pti_signals for all active users
 */

import { sql } from "drizzle-orm";
import { logger } from "../lib/logger.js";
import { computePagoScore } from "./pagoScore.js";
import { sendWhatsApp } from "../lib/whatsapp.js";
import { computePTIForAllUsers, computePTIv3Signals } from "./pti.js";
import { checkAndUpgradeKycTier } from "./kycUpgradeService.js";
import { runPaulaTriggerBatch } from "./paulaTriggers.js";
import { processSendQueue } from "./paulaSendQueue.js";

// ── PTI milestone definitions (Tala philosophy: the reward is progress, not a prize)
// "Paga a tiempo y crece" — each tier unlocks access, not just a gift.
// Free bill credits = $25 MXN of real platform value, fully on-platform, zero cash-out risk.
const PTI_MILESTONES = [
  {
    threshold: 30,
    label: "Bronce",
    slug: "bronce",
    msg: () =>
      `🥉 *Subiste a Bronce*\n\n` +
      `Con *30 puntos* ya tienes historial real. Cada pago que haces queda registrado y suma a tu perfil financiero.\n\n` +
      `Te acreditamos *1 pago de servicio gratis* — úsalo cuando quieras.\n\n` +
      `_Paga a tiempo y sigue creciendo._`,
    freeBillCredits: 1,
    mxn: 0,
  },
  {
    threshold: 50,
    label: "Plata",
    slug: "plata",
    msg: () =>
      `🥈 *Llegaste a Plata*\n\n` +
      `*50 puntos* — tu consistencia de pago ya empieza a diferenciarte. Las instituciones financieras valoran exactamente esto.\n\n` +
      `Te acreditamos *2 pagos de servicio gratis* como reconocimiento.\n\n` +
      `_Tu historial está trabajando para ti._`,
    freeBillCredits: 2,
    mxn: 0,
  },
  {
    threshold: 70,
    label: "Oro",
    slug: "oro",
    msg: () =>
      `🥇 *Nivel Oro — top 25% de usuarios PagoYa*\n\n` +
      `*70 puntos* es un perfil sólido. Llevas meses demostrando que pagas a tiempo — eso vale.\n\n` +
      `Te acreditamos *3 pagos de servicio gratis* + ya puedes ver tu desglose PTI completo en la app.\n\n` +
      `_Sigue así — lo que viene vale la pena._`,
    freeBillCredits: 3,
    mxn: 0,
  },
  {
    threshold: 85,
    label: "Élite",
    slug: "elite",
    msg: () =>
      `💎 *Élite — top 5% de usuarios PagoYa*\n\n` +
      `Con *85 puntos* tu perfil financiero está en un nivel donde los socios financieros empiezan a fijarse.\n\n` +
      `Tu recompensa: *3 pagos gratis + $150 MXN* ya en tu billetera. Úsalos cuando quieras.\n\n` +
      `Sigue así. Pronto habrá noticias.`,
    freeBillCredits: 3,
    mxn: 150,
  },
];

// ── Milestone detector — runs after each nightly PTI computation ──────────────
async function checkPtiMilestones(
  telefono: string,
  prevScore: number,
  newScore: number,
): Promise<void> {
  if (newScore <= prevScore) return; // only reward upward movement
  const { db } = await import("@workspace/db");

  for (const m of PTI_MILESTONES) {
    // Crossed this threshold for the first time (was below, now at or above)
    if (prevScore < m.threshold && newScore >= m.threshold) {
      try {
        // Credit free bill payments (platform fee waivers — $25 MXN value each)
        if (m.freeBillCredits > 0) {
          await db.execute(sql`
            UPDATE users
            SET free_bill_credits = free_bill_credits + ${m.freeBillCredits}
            WHERE telefono = ${telefono}
          `).catch(() => {});
        }
        // Credit wallet cash bonus (Élite+ only)
        // Must update BOTH wallet_transactions (ledger history) AND wallets.balance_mxn (live balance).
        // Inserting only into wallet_transactions without updating balance_mxn leaves the spendable
        // balance unchanged — the user would see the credit in history but couldn't spend it.
        if (m.mxn > 0) {
          // Look up wallet_id by telefono — wallet_transactions requires wallet_id (UUID FK), not telefono
          await db.execute(sql`
            INSERT INTO wallet_transactions (wallet_id, type, amount_mxn, status, description, created_at)
            SELECT id, 'PTI_REWARD', ${m.mxn}, 'confirmed', ${`Premio PTI: ${m.label}`}, NOW()
            FROM wallets WHERE user_id = ${telefono} LIMIT 1
          `).catch((err: unknown) => {
            logger.error({ err, telefono, milestone: m.label }, "pti-milestone: wallet_transactions insert failed");
          });
          await db.execute(sql`
            UPDATE wallets SET balance_mxn = balance_mxn + ${m.mxn}, updated_at = NOW()
            WHERE user_id = ${telefono}
          `).catch((err: unknown) => {
            logger.error({ err, telefono, milestone: m.label }, "pti-milestone: wallets balance update failed");
          });
        }
        // Mark uncelebrated so the app shows the celebration modal on next open
        await db.execute(sql`
          UPDATE users SET pti_uncelebrated_milestone = ${m.slug} WHERE telefono = ${telefono}
        `).catch(() => {});
        // Send WhatsApp — unexpected gift = strongest reciprocity moment
        await sendWhatsApp(telefono, m.msg());
        logger.info({ telefono, milestone: m.label, prevScore, newScore, freeBillCredits: m.freeBillCredits, mxn: m.mxn }, "pti-milestone: reward sent");
      } catch (err) {
        logger.error({ err, telefono, milestone: m.label }, "pti-milestone: reward failed");
      }
    }
  }
}

// ── Scratch card reminder — 5 PM Mexico City (23:00 UTC) ─────────────────────
// Cialdini: Scarcity — "tienes hasta medianoche" creates urgency without fabrication
export async function sendScratchCardReminders(): Promise<void> {
  // Scratch card reminders are business-initiated WhatsApp messages.
  // They require an approved Meta template to deliver outside a session window.
  // Suppress until SCRATCH_REMINDERS_ENABLED=true is set (after Meta biz verification).
  if (process.env.SCRATCH_REMINDERS_ENABLED !== "true") {
    logger.info("pti-cron: scratch reminders suppressed — SCRATCH_REMINDERS_ENABLED not set");
    return;
  }
  logger.info("pti-cron: sendScratchCardReminders running");
  try {
    const { db } = await import("@workspace/db");

    // Users active in last 7 days who have NOT played today's scratch card
    const targets = await db.execute(sql`
      SELECT DISTINCT ue.telefono
      FROM user_events ue
      WHERE ue.created_at > NOW() - INTERVAL '7 days'
        AND ue.telefono IS NOT NULL
        AND ue.telefono != ''
        AND NOT EXISTS (
          SELECT 1 FROM scratch_card_plays scp
          WHERE scp.telefono = ue.telefono
            AND scp.play_date = CURRENT_DATE
        )
      LIMIT 500
    `);

    const phones = targets.rows.map(r => (r as Record<string, unknown>).telefono as string);
    logger.info({ count: phones.length }, "pti-cron: scratch reminder targets");

    for (const telefono of phones) {
      await sendWhatsApp(
        telefono,
        `🎟️ *Tu tarjeta Raspa y Gana de hoy te está esperando*\n\n` +
        `Tienes hasta *medianoche* para raspar — podrías ganar puntos o saldo MXN.\n\n` +
        `Juega aquí → pagoya.mx/juegos`,
      ).catch(() => {});
      await new Promise(r => setTimeout(r, 200)); // rate-limit WhatsApp sends
    }

    logger.info({ count: phones.length }, "pti-cron: scratch reminders sent");
  } catch (err) {
    logger.error({ err }, "pti-cron: sendScratchCardReminders failed");
  }
}

// ── JOB 1: Financial snapshot — one row per user per day ──────────────────────
// This is the single most important Phase 0 action:
// Without this running daily, Phase 2 trend vectors will have zero baseline data.
export async function takeFinancialSnapshot(telefono: string): Promise<void> {
  try {
    const { db } = await import("@workspace/db");

    const row = await db.execute(sql`
      WITH
        wallet AS (
          SELECT COALESCE(SUM(
            CASE
              WHEN type IN ('load_card','load_oxxo','spei_in','SIGNUP_BONUS','RASPA_GANA') THEN amount_mxn::numeric
              WHEN type IN ('bill_pay','transfer_out') THEN -amount_mxn::numeric
              ELSE 0
            END
          ), 0) AS balance
          FROM wallet_transactions
          WHERE telefono = ${telefono} AND status = 'confirmed'
        ),
        billers AS (
          SELECT COUNT(DISTINCT empresa)::int AS biller_count FROM bill_payments WHERE telefono = ${telefono}
        ),
        tx30 AS (
          SELECT COUNT(*)::int AS tx_count
          FROM bill_payments
          WHERE telefono = ${telefono} AND created_at > NOW() - INTERVAL '30 days'
        ),
        loads30 AS (
          SELECT
            COUNT(*)::int AS load_count,
            COUNT(*) FILTER (WHERE type IN ('spei_in','load_card'))::float /
              NULLIF(COUNT(*), 0) AS digital_ratio
          FROM wallet_transactions
          WHERE telefono = ${telefono}
            AND type IN ('load_card','load_oxxo','spei_in')
            AND status = 'confirmed'
            AND created_at > NOW() - INTERVAL '30 days'
        ),
        pts AS (
          SELECT COALESCE(SUM(points)::int, 0) AS points_balance
          FROM loyalty_transactions WHERE telefono = ${telefono}
        ),
        tier_q AS (
          SELECT loyalty_tier AS tier FROM users WHERE telefono = ${telefono} LIMIT 1
        ),
        pti_q AS (
          SELECT pago_score FROM credit_profiles WHERE telefono = ${telefono} LIMIT 1
        )
      SELECT
        wallet.balance,
        billers.biller_count,
        tx30.tx_count,
        loads30.load_count,
        COALESCE(loads30.digital_ratio, 0) AS digital_ratio,
        pts.points_balance,
        COALESCE(tier_q.tier, 'Bronce') AS tier,
        COALESCE(pti_q.pago_score, 0) AS pti_score
      FROM wallet, billers, tx30, loads30, pts
      LEFT JOIN tier_q ON true
      LEFT JOIN pti_q ON true
    `);

    const r = row.rows[0] as Record<string, unknown> | undefined;
    if (!r) return;

    await db.execute(sql`
      INSERT INTO user_financial_snapshots
        (telefono, snapshot_date, wallet_balance, biller_count, tx_count_30d,
         load_count_30d, digital_load_ratio, points_balance, tier, pti_score)
      VALUES (
        ${telefono},
        CURRENT_DATE,
        ${Number(r.balance ?? 0)},
        ${Number(r.biller_count ?? 0)},
        ${Number(r.tx_count ?? 0)},
        ${Number(r.load_count ?? 0)},
        ${Number(r.digital_ratio ?? 0)},
        ${Number(r.points_balance ?? 0)},
        ${String(r.tier ?? 'Bronce')},
        ${Number(r.pti_score ?? 0)}
      )
      ON CONFLICT (telefono, snapshot_date) DO UPDATE SET
        wallet_balance    = EXCLUDED.wallet_balance,
        biller_count      = EXCLUDED.biller_count,
        tx_count_30d      = EXCLUDED.tx_count_30d,
        load_count_30d    = EXCLUDED.load_count_30d,
        digital_load_ratio = EXCLUDED.digital_load_ratio,
        points_balance    = EXCLUDED.points_balance,
        tier              = EXCLUDED.tier,
        pti_score         = EXCLUDED.pti_score
    `);
  } catch (err) {
    logger.error({ err, telefono }, "pti-cron: snapshot failed");
  }
}

// ── JOB 3: Consecutive payment month streak ───────────────────────────────────
// Logic:
//   - If user paid at least one bill this calendar month AND streak was updated
//     last month → increment counter
//   - If user paid this month but no prior streak → set to 1
//   - Otherwise (gap or no payment this month) → reset to 0
//   - Always write last_payment_streak_updated = today
export async function updatePaymentStreak(telefono: string): Promise<void> {
  try {
    const { db } = await import("@workspace/db");
    // Paid this calendar month (all four terminal success statuses)
    await db.execute(sql`
      UPDATE users SET
        consecutive_payment_months = CASE
          -- Paid this month AND last recorded month was the immediately prior month → extend streak
          WHEN EXISTS (
            SELECT 1 FROM bill_payments
            WHERE telefono = ${telefono}
              AND created_at >= date_trunc('month', CURRENT_DATE)
              AND status IN ('completed', 'success', 'completed_ok', 'confirmed')
          ) AND (
            last_payment_streak_updated >= date_trunc('month', CURRENT_DATE - INTERVAL '1 month')
            AND last_payment_streak_updated <  date_trunc('month', CURRENT_DATE)
          ) THEN consecutive_payment_months + 1
          -- Paid this month AND no prior streak record (brand-new user) → start at 1
          WHEN EXISTS (
            SELECT 1 FROM bill_payments
            WHERE telefono = ${telefono}
              AND created_at >= date_trunc('month', CURRENT_DATE)
              AND status IN ('completed', 'success', 'completed_ok', 'confirmed')
          ) AND last_payment_streak_updated IS NULL THEN 1
          -- Paid this month AND streak was recorded this month already → already counted, no change
          WHEN EXISTS (
            SELECT 1 FROM bill_payments
            WHERE telefono = ${telefono}
              AND created_at >= date_trunc('month', CURRENT_DATE)
              AND status IN ('completed', 'success', 'completed_ok', 'confirmed')
          ) AND last_payment_streak_updated >= date_trunc('month', CURRENT_DATE) THEN consecutive_payment_months
          -- No payment this month → reset streak
          ELSE 0
        END,
        -- ONLY advance the timestamp when a payment was found this month.
        -- If ELSE fired (no payment), preserve the old timestamp so the next
        -- month's check can still correctly detect the prior-month boundary.
        last_payment_streak_updated = CASE
          WHEN EXISTS (
            SELECT 1 FROM bill_payments
            WHERE telefono = ${telefono}
              AND created_at >= date_trunc('month', CURRENT_DATE)
              AND status IN ('completed', 'success', 'completed_ok', 'confirmed')
          ) THEN CURRENT_DATE
          ELSE last_payment_streak_updated
        END
      WHERE telefono = ${telefono}
    `);
  } catch (err) {
    logger.error({ err, telefono }, "pti-cron: updatePaymentStreak failed");
  }
}

// ── JOB 2: Nightly PTI batch — recompute for all active users ─────────────────
export async function runNightlyPtiBatch(): Promise<void> {
  const startedAt = Date.now();
  logger.info("pti-cron: nightlyPtiBatch starting");

  try {
    const { db } = await import("@workspace/db");

    // "Active" = any user_events or bill_payments in the last 90 days
    const activeUsers = await db.execute(sql`
      SELECT DISTINCT telefono FROM (
        SELECT telefono FROM user_events
          WHERE created_at > NOW() - INTERVAL '90 days'
        UNION
        SELECT telefono FROM bill_payments
          WHERE created_at > NOW() - INTERVAL '90 days'
      ) t
      WHERE telefono IS NOT NULL AND telefono != ''
    `);

    const phones = activeUsers.rows.map(r => (r as Record<string, unknown>).telefono as string);
    logger.info({ count: phones.length }, "pti-cron: active users found");

    let computed = 0;
    let failed = 0;

    for (const telefono of phones) {
      try {
        // Capture prev score BEFORE computing so we can detect milestone crossings
        const prevRow = await db.execute(sql`
          SELECT pago_score FROM credit_profiles WHERE telefono = ${telefono} LIMIT 1
        `);
        const prevScore = Number((prevRow.rows[0] as Record<string, unknown> | undefined)?.pago_score ?? 0);

        const result = await computePagoScore(telefono);
        await takeFinancialSnapshot(telefono);
        await updatePaymentStreak(telefono);

        // PTI v3: compute granular signals + trend layer (fire-and-forget — never blocks batch)
        computePTIv3Signals(telefono).catch(() => {});

        // Check for milestone crossings — sends WhatsApp + credits rewards (non-blocking)
        if (result && result.pagoScore !== prevScore) {
          checkPtiMilestones(telefono, prevScore, result.pagoScore).catch(() => {});
        }

        // KYC upgrade sweep — catch users who crossed $3,200 MXN since last check
        checkAndUpgradeKycTier(telefono).catch(() => {});

        computed++;
      } catch (err) {
        logger.error({ err, telefono }, "pti-cron: user batch failed");
        failed++;
      }
      // Small delay to avoid DB saturation during batch
      await new Promise(r => setTimeout(r, 50));
    }

    const elapsedMs = Date.now() - startedAt;
    logger.info({ computed, failed, elapsedMs }, "pti-cron: nightlyPtiBatch complete");
  } catch (err) {
    logger.error({ err }, "pti-cron: nightlyPtiBatch top-level failure");
  }
}

// ── SCHEDULER ────────────────────────────────────────────────────────────────
function scheduleDailyAt(utcHour: number, fn: () => Promise<void>, label: string) {
  function msUntilNext(): number {
    const now = new Date();
    const next = new Date();
    next.setUTCHours(utcHour, 0, 0, 0);
    if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
    return next.getTime() - now.getTime();
  }

  function scheduleNext() {
    const delay = msUntilNext();
    logger.info({ label, nextInMs: delay }, `pti-cron: ${label} scheduled`);
    setTimeout(() => {
      fn().catch(err => logger.error({ err }, `pti-cron: ${label} uncaught`));
      setInterval(() => {
        fn().catch(err => logger.error({ err }, `pti-cron: ${label} uncaught`));
      }, 24 * 60 * 60 * 1000);
    }, delay);
  }

  scheduleNext();
}

// ── Monthly PTI batch — 1st of month at 03:00 AM Mexico City (09:00 UTC) ─────
// Node.js setTimeout uses a 32-bit signed integer for the delay.
// Max safe value = 2^31 - 1 ms ≈ 24.8 days. Any larger value overflows to 1 ms
// and fires immediately, creating an infinite loop. We chunk the wait into safe
// segments and re-check each time whether the target has been reached.
const MAX_SAFE_TIMEOUT_MS = 2_147_483_647; // 2^31 - 1

function safeSetTimeout(fn: () => void, ms: number): void {
  if (ms <= MAX_SAFE_TIMEOUT_MS) {
    setTimeout(fn, ms);
  } else {
    setTimeout(() => safeSetTimeout(fn, ms - MAX_SAFE_TIMEOUT_MS), MAX_SAFE_TIMEOUT_MS);
  }
}

function scheduleMonthly1stAt(utcHour: number, fn: () => Promise<void>, label: string) {
  function msUntilNext(): number {
    const now = new Date();
    const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, utcHour, 0, 0, 0));
    const thisMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, utcHour, 0, 0, 0));
    const target = thisMonth > now ? thisMonth : next;
    return Math.max(1000, target.getTime() - now.getTime());
  }

  function scheduleNext() {
    const delay = msUntilNext();
    const nextDate = new Date(Date.now() + delay).toISOString();
    logger.info({ label, nextRunAt: nextDate }, `pti-cron: ${label} scheduled`);
    safeSetTimeout(() => {
      fn().catch(err => logger.error({ err }, `pti-cron: ${label} uncaught`));
      scheduleNext();
    }, delay);
  }

  scheduleNext();
}

// ── Monthly landlord PTI report — runs after computePTIForAllUsers ────────────
// Sends each landlord (who has a WhatsApp number) a summary of their tenants'
// PTI scores, tiers, and payment streaks for the month.
export async function sendLandlordMonthlyReports(): Promise<void> {
  logger.info("pti-cron: sendLandlordMonthlyReports starting");
  try {
    const { db } = await import("@workspace/db");

    // All active landlords with a WhatsApp number who have at least one tenant
    const landlords = await db.execute(sql`
      SELECT l.landlord_code, l.full_name, l.whatsapp, l.total_commission_mxn
      FROM landlords l
      WHERE l.status = 'active'
        AND l.whatsapp IS NOT NULL
        AND l.whatsapp != ''
        AND EXISTS (
          SELECT 1 FROM users u WHERE u.referred_by_landlord = l.landlord_code
        )
      ORDER BY l.full_name
    `);

    const monthLabel = new Date().toLocaleDateString("es-MX", { month: "long", year: "numeric" });

    for (const row of landlords.rows) {
      const { landlord_code, full_name, whatsapp, total_commission_mxn } =
        row as { landlord_code: string; full_name: string; whatsapp: string; total_commission_mxn: number };

      try {
        // Get all tenants for this landlord with their PTI data
        const tenants = await db.execute(sql`
          SELECT
            COALESCE(u.kyc_full_name, 'Inquilino') AS name,
            COALESCE(u.pti_score, 0)               AS pti_score,
            COALESCE(u.consecutive_payment_months, 0) AS streak
          FROM users u
          WHERE u.referred_by_landlord = ${landlord_code}
          ORDER BY u.pti_score DESC NULLS LAST
          LIMIT 20
        `);

        if (tenants.rows.length === 0) continue;

        // Map score → tier label + emoji
        function tierLabel(score: number): string {
          if (score >= 85) return "🏆 Élite";
          if (score >= 70) return "🏅 Oro";
          if (score >= 50) return "⭐ Plata";
          if (score >= 30) return "🟤 Bronce";
          return "🔴 Nuevo";
        }

        const landlordFirstName = full_name.trim().split(" ")[0] || full_name.trim();
        const tenantLines = tenants.rows.map((t) => {
          const { name, pti_score, streak } = t as { name: string; pti_score: number; streak: number };
          const firstName = name.trim().split(" ")[0] || name.trim();
          const streakText = streak > 0 ? `${streak} mes${streak !== 1 ? "es" : ""} seguido${streak !== 1 ? "s" : ""}` : "sin racha aún";
          return `• ${firstName}: ${tierLabel(pti_score)} (${Math.round(pti_score)} pts) · ${streakText}`;
        }).join("\n");

        const activatedCount = (tenants.rows as Array<{ pti_score: number }>).filter(t => t.pti_score > 0).length;

        const message =
          `🏠 *Reporte PagoYa — ${monthLabel}*\n\n` +
          `Hola ${landlordFirstName}, aquí está el resumen de confianza financiera de tus inquilinos:\n\n` +
          `${tenantLines}\n\n` +
          (total_commission_mxn > 0
            ? `💰 Comisión total acumulada: *$${Number(total_commission_mxn).toFixed(0)} MXN*\n\n`
            : "") +
          `📌 _${activatedCount} de ${tenants.rows.length} inquilinos han completado al menos un pago._\n\n` +
          `_PagoYa — construyendo historial financiero, una cuenta a la vez._`;

        await sendWhatsApp(whatsapp, message);
        logger.info({ landlord_code, tenants: tenants.rows.length }, "pti-cron: landlord monthly report sent");

        // Rate-limit: 500ms between landlords to avoid WhatsApp flooding
        await new Promise(r => setTimeout(r, 500));
      } catch (err) {
        logger.error({ err, landlord_code }, "pti-cron: landlord monthly report failed for one landlord");
      }
    }

    logger.info({ count: landlords.rows.length }, "pti-cron: sendLandlordMonthlyReports complete");
  } catch (err) {
    logger.error({ err }, "pti-cron: sendLandlordMonthlyReports top-level failure");
  }
}

// ── Monthly batch wrapper — PTI compute + landlord reports ────────────────────
async function runMonthlyBatchAndReport(): Promise<void> {
  await computePTIForAllUsers();
  await sendLandlordMonthlyReports();
}

export function startPtiCron(): void {
  // 2 AM Mexico City (UTC-6 = 08:00 UTC) — after overnight transactions settle
  scheduleDailyAt(8, runNightlyPtiBatch, "nightlyPtiBatch");
  // 5 PM Mexico City (UTC-6 = 23:00 UTC) — scratch card scarcity reminder
  scheduleDailyAt(23, sendScratchCardReminders, "scratchCardReminders");
  // 1st of month at 03:00 AM Mexico City (09:00 UTC) — PTI compute + landlord reports
  scheduleMonthly1stAt(9, runMonthlyBatchAndReport, "monthlyPtiBatch");
  logger.info("[PTI Cron] Scheduled: runs 1st of month at 03:00 AM MX");
  logger.info("pti-cron: scheduled (PTI 2 AM MX / scratch reminder 5 PM MX / monthly PTI 1st of month 3 AM MX)");

  // Paula trigger evaluation — every 6 hours (counseling is time-sensitive)
  const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
  const runTriggers = () => {
    runPaulaTriggerBatch().catch(err =>
      logger.error({ err }, "pti-cron: paulaTriggerBatch top-level failure"),
    );
  };
  // First run after 5-minute warm-up to let other crons settle
  setTimeout(() => {
    runTriggers();
    setInterval(runTriggers, SIX_HOURS_MS);
    logger.info("pti-cron: paulaTriggerBatch registered (every 6h, first run in 5min)");
  }, 5 * 60 * 1000);

  // Paula send queue processor — every 2 minutes
  const TWO_MIN_MS = 2 * 60 * 1000;
  const runQueue = () => {
    processSendQueue().catch(err =>
      logger.error({ err }, "pti-cron: paulaSendQueue processor top-level failure"),
    );
  };
  setInterval(runQueue, TWO_MIN_MS);
  logger.info("pti-cron: paulaSendQueue processor registered (every 2min)");
}
