/**
 * PTI Nightly Cron — PagoYa Trust Index batch jobs
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
import { computePTIForAllUsers } from "./pti.js";
import { checkAndUpgradeKycTier } from "./kycUpgradeService.js";

// ── PTI milestone definitions (Cialdini: Reciprocity + Commitment) ────────────
// Unexpected rewards at threshold crossings — never announced in advance.
// Points/cash credited silently so the WhatsApp message feels like a genuine gift.
const PTI_MILESTONES = [
  {
    threshold: 30,
    label: "Bronce Establecido",
    msg: (tel: string) =>
      `🌱 *Tu confianza PagoYa creció*\n\n` +
      `Alcanzaste *30 puntos de confianza* — estás construyendo un historial sólido.\n\n` +
      `Te regalamos *15 puntos* como reconocimiento. ¡Sigue así!\n\n` +
      `_PagoYa — construyendo contigo._`,
    points: 15,
    mxn: 0,
  },
  {
    threshold: 50,
    label: "Nivel Plata",
    msg: (tel: string) =>
      `⭐ *¡Increíble progreso!*\n\n` +
      `Tu puntaje de confianza llegó a *50* — eres usuario Plata.\n\n` +
      `Te enviamos *$10 MXN* directo a tu billetera como reconocimiento.\n\n` +
      `_Este saldo ya está disponible en tu cuenta._`,
    points: 0,
    mxn: 10,
  },
  {
    threshold: 70,
    label: "Top 25%",
    msg: (tel: string) =>
      `🏅 *Eres de los mejores usuarios PagoYa*\n\n` +
      `Con *70 puntos de confianza* estás en el top 25% de nuestra comunidad.\n\n` +
      `Te regalamos *25 puntos* por tu disciplina de pago.\n\n` +
      `Próximamente desbloquearás acceso a adelantos y mejores límites.`,
    points: 25,
    mxn: 0,
  },
  {
    threshold: 85,
    label: "Élite",
    msg: (tel: string) =>
      `🏆 *Usuario élite PagoYa*\n\n` +
      `Tu puntaje de *85 puntos* te pone entre el top 5% de nuestra comunidad.\n\n` +
      `Te enviamos *$20 MXN* de regalo y te ponemos en lista de acceso anticipado a crédito PagoYa.\n\n` +
      `_Gracias por confiar en nosotros._`,
    points: 0,
    mxn: 20,
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
        // Credit loyalty points
        if (m.points > 0) {
          await db.execute(sql`
            INSERT INTO loyalty_transactions (telefono, points, type, description, created_at)
            VALUES (${telefono}, ${m.points}, 'earn', ${`Milestone PTI: ${m.label}`}, NOW())
          `).catch(() => {});
        }
        // Credit wallet cash
        if (m.mxn > 0) {
          await db.execute(sql`
            INSERT INTO wallet_transactions (telefono, type, amount_mxn, status, description, created_at)
            VALUES (${telefono}, 'PTI_REWARD', ${m.mxn}, 'confirmed', ${`Premio PTI: ${m.label}`}, NOW())
          `).catch(() => {});
        }
        // Send WhatsApp — unexpected = strongest reciprocity trigger
        await sendWhatsApp(telefono, m.msg(telefono));
        logger.info({ telefono, milestone: m.label, prevScore, newScore }, "pti-milestone: reward sent");
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
    await db.execute(sql`
      UPDATE users SET
        consecutive_payment_months = CASE
          WHEN EXISTS (
            SELECT 1 FROM bill_payments
            WHERE telefono = ${telefono}
              AND created_at >= date_trunc('month', CURRENT_DATE)
              AND status IN ('completed', 'success')
          ) AND (
            last_payment_streak_updated >= date_trunc('month', CURRENT_DATE - INTERVAL '1 month')
            AND last_payment_streak_updated <  date_trunc('month', CURRENT_DATE)
          ) THEN consecutive_payment_months + 1
          WHEN EXISTS (
            SELECT 1 FROM bill_payments
            WHERE telefono = ${telefono}
              AND created_at >= date_trunc('month', CURRENT_DATE)
              AND status IN ('completed', 'success')
          ) AND last_payment_streak_updated IS NULL THEN 1
          ELSE 0
        END,
        last_payment_streak_updated = CURRENT_DATE
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
function scheduleMonthly1stAt(utcHour: number, fn: () => Promise<void>, label: string) {
  function msUntilNext(): number {
    const now = new Date();
    const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, utcHour, 0, 0, 0));
    // If it's already past the 1st of this month at that hour, schedule for next month
    const thisMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, utcHour, 0, 0, 0));
    const target = thisMonth > now ? thisMonth : next;
    return target.getTime() - now.getTime();
  }

  function scheduleNext() {
    const delay = msUntilNext();
    logger.info({ label, nextInMs: delay }, `pti-cron: ${label} scheduled`);
    setTimeout(() => {
      fn().catch(err => logger.error({ err }, `pti-cron: ${label} uncaught`));
      // Re-schedule for next month
      scheduleNext();
    }, delay);
  }

  scheduleNext();
}

export function startPtiCron(): void {
  // 2 AM Mexico City (UTC-6 = 08:00 UTC) — after overnight transactions settle
  scheduleDailyAt(8, runNightlyPtiBatch, "nightlyPtiBatch");
  // 5 PM Mexico City (UTC-6 = 23:00 UTC) — scratch card scarcity reminder
  scheduleDailyAt(23, sendScratchCardReminders, "scratchCardReminders");
  // 1st of month at 03:00 AM Mexico City (09:00 UTC) — monthly user-facing PTI score
  scheduleMonthly1stAt(9, computePTIForAllUsers, "monthlyPtiBatch");
  logger.info("[PTI Cron] Scheduled: runs 1st of month at 03:00 AM MX");
  logger.info("pti-cron: scheduled (PTI 2 AM MX / scratch reminder 5 PM MX / monthly PTI 1st of month 3 AM MX)");
}
