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
        await computePagoScore(telefono);
        await takeFinancialSnapshot(telefono);
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

export function startPtiCron(): void {
  // 2 AM Mexico City (UTC-6 = 08:00 UTC) — after overnight transactions settle
  scheduleDailyAt(8, runNightlyPtiBatch, "nightlyPtiBatch");
  logger.info("pti-cron: scheduled (nightly 2 AM MX / 08:00 UTC)");
}
