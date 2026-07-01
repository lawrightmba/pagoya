/**
 * enrichmentCron.ts — Pre-FI Data Enrichment Sprint
 *
 * Nightly (2:30 AM MX) and monthly (1st, 4 AM MX) cron jobs that:
 *   - Link Paula trigger sends to inbound replies (paula_response_metrics)
 *   - Mark expected_payments rows as missed or cured
 *   - Seed expected_payments rows for each user's active billers
 *   - Compute and write enrichment signals to credit_profiles:
 *       E. biller_count_slope_90d  (N ≥ 3 snapshots, else NULL)
 *       F. payment_amount_cv        (N ≥ 8 per-service payments, else NULL)
 *       G. priority_rank_json       (N ≥ 3 multi-bill-day events, else NULL)
 *       H. partial_payment_count    (NULL when amount_due_mxn absent for all rows)
 */

import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "../lib/logger.js";
import {
  MISSED_THRESHOLD_DAYS,
  MIN_N_PAYMENT_CV,
  MIN_N_BILLER_SLOPE,
  MIN_N_PRIORITY_RANK,
} from "../../../../lib/db/src/constants.js";

// ── Helpers ───────────────────────────────────────────────────────────────────

const PAID_STATUSES = ['completed', 'success', 'completed_ok', 'confirmed'];

function toCronMx(hour: number, minute: number, dayOfMonth = '*'): string {
  // Mexico City is UTC-6 (standard) / UTC-5 (DST, approx Apr–Oct)
  // Use UTC-6 offset (08:00 UTC = 02:00 MX in CST) — acceptable approximation
  const utcHour = (hour + 6) % 24;
  return `${minute} ${utcHour} ${dayOfMonth} * *`;
}

// ── E. Biller count slope ─────────────────────────────────────────────────────

async function computeBillerCountSlope(telefono: string): Promise<{
  slope: number | null;
  n: number;
}> {
  const row = await db.execute(sql`
    SELECT
      REGR_SLOPE(biller_count::numeric, (snapshot_date - '2024-01-01'::date)::float)::numeric AS slope,
      COUNT(*)::int AS n
    FROM user_financial_snapshots
    WHERE telefono = ${telefono}
      AND snapshot_date >= NOW() - INTERVAL '90 days'
      AND biller_count IS NOT NULL
  `);
  const r = row.rows[0] as Record<string, unknown> | undefined;
  const n = Number(r?.n ?? 0);
  const slope = n >= MIN_N_BILLER_SLOPE && r?.slope != null ? Number(r.slope) : null;
  return { slope, n };
}

// ── F. Payment amount CV ──────────────────────────────────────────────────────

async function computePaymentAmountCV(telefono: string): Promise<{
  cv: number | null;
  n: number;
}> {
  // Per-service CV, averaged across services that meet the minimum-N floor
  const row = await db.execute(sql`
    SELECT
      AVG(CASE WHEN avg_amount > 0 THEN stddev_amount / avg_amount END)::numeric AS avg_cv,
      SUM(payment_count)::int AS total_n
    FROM (
      SELECT
        service_name,
        COUNT(*)::int                                  AS payment_count,
        AVG(monto::numeric)                            AS avg_amount,
        COALESCE(STDDEV(monto::numeric), 0)            AS stddev_amount
      FROM bill_payments
      WHERE telefono = ${telefono}
        AND status = ANY(${PAID_STATUSES}::text[])
      GROUP BY service_name
      HAVING COUNT(*) >= ${MIN_N_PAYMENT_CV}
    ) sub
  `);
  const r = row.rows[0] as Record<string, unknown> | undefined;
  const n = Number(r?.total_n ?? 0);
  const cv = n >= MIN_N_PAYMENT_CV && r?.avg_cv != null ? Number(r.avg_cv) : null;
  return { cv, n };
}

// ── G. Priority rank ──────────────────────────────────────────────────────────
// Ranks services by payment frequency on multi-bill days (≥2 bills in one day).
// These days reveal the user's implicit priority ordering under resource pressure.

async function computePriorityRank(telefono: string): Promise<{
  rank: string[] | null;
  n: number;
}> {
  // Find all days where the user paid 2+ bills
  const multiBillDayRow = await db.execute(sql`
    SELECT
      bp.service_name,
      COUNT(DISTINCT bp.created_at::date) AS multi_day_count
    FROM bill_payments bp
    WHERE bp.telefono = ${telefono}
      AND bp.status = ANY(${PAID_STATUSES}::text[])
      AND bp.created_at::date IN (
        SELECT created_at::date
        FROM bill_payments
        WHERE telefono = ${telefono}
          AND status = ANY(${PAID_STATUSES}::text[])
        GROUP BY created_at::date
        HAVING COUNT(*) >= 2
      )
    GROUP BY bp.service_name
    ORDER BY multi_day_count DESC
  `);

  const rows = multiBillDayRow.rows as Array<Record<string, unknown>>;
  const totalEvents = rows.reduce((sum, r) => sum + Number(r.multi_day_count ?? 0), 0);

  if (rows.length === 0 || totalEvents < MIN_N_PRIORITY_RANK) {
    return { rank: null, n: totalEvents };
  }

  const rank = rows.map(r => r.service_name as string);
  return { rank, n: totalEvents };
}

// ── H. Partial payment count ──────────────────────────────────────────────────

async function computePartialPaymentCount(telefono: string): Promise<{
  count: number | null;
  hasAmountDueData: boolean;
}> {
  const row = await db.execute(sql`
    SELECT
      COUNT(*) FILTER (
        WHERE amount_due_mxn IS NOT NULL
          AND monto::numeric < amount_due_mxn
      )::int AS partial_count,
      COUNT(*) FILTER (WHERE amount_due_mxn IS NOT NULL)::int AS rows_with_due
    FROM bill_payments
    WHERE telefono = ${telefono}
      AND status = ANY(${PAID_STATUSES}::text[])
  `);
  const r = row.rows[0] as Record<string, unknown> | undefined;
  const rowsWithDue = Number(r?.rows_with_due ?? 0);
  const partialCount = rowsWithDue > 0 ? Number(r?.partial_count ?? 0) : null;
  return { count: partialCount, hasAmountDueData: rowsWithDue > 0 };
}

// ── Enrichment orchestrator (runs E + F + G + H for one user) ────────────────

async function computeEnrichmentForUser(telefono: string): Promise<void> {
  try {
    const [sloperResult, cvResult, rankResult, partialResult] = await Promise.all([
      computeBillerCountSlope(telefono),
      computePaymentAmountCV(telefono),
      computePriorityRank(telefono),
      computePartialPaymentCount(telefono),
    ]);

    await db.execute(sql`
      INSERT INTO credit_profiles (telefono, enrichment_computed_at,
        biller_count_slope_90d, biller_count_slope_n,
        payment_amount_cv, payment_amount_cv_n,
        priority_rank_json, priority_rank_n,
        partial_payment_count)
      VALUES (
        ${telefono}, NOW(),
        ${sloperResult.slope}, ${sloperResult.n},
        ${cvResult.cv}, ${cvResult.n},
        ${rankResult.rank ? JSON.stringify(rankResult.rank) : null}::jsonb,
        ${rankResult.n},
        ${partialResult.count}
      )
      ON CONFLICT (telefono) DO UPDATE SET
        enrichment_computed_at    = NOW(),
        biller_count_slope_90d    = EXCLUDED.biller_count_slope_90d,
        biller_count_slope_n      = EXCLUDED.biller_count_slope_n,
        payment_amount_cv         = EXCLUDED.payment_amount_cv,
        payment_amount_cv_n       = EXCLUDED.payment_amount_cv_n,
        priority_rank_json        = EXCLUDED.priority_rank_json,
        priority_rank_n           = EXCLUDED.priority_rank_n,
        partial_payment_count     = EXCLUDED.partial_payment_count
    `);
  } catch (err) {
    logger.error({ err, telefono }, "[enrichment] computeEnrichmentForUser failed");
  }
}

// ── Paula response metrics linker ─────────────────────────────────────────────
// For each unlinked paula_trigger_log row, look for a reply in paula_inbound_log
// within 7 days. Writes a paula_response_metrics row per trigger.

export async function linkPaulaResponseMetrics(): Promise<void> {
  logger.info("[enrichment] linkPaulaResponseMetrics start");
  try {
    const unlinked = await db.execute(sql`
      SELECT ptl.id, ptl.telefono, ptl.trigger_type, ptl.sent_at
      FROM paula_trigger_log ptl
      WHERE ptl.sent_at IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM paula_response_metrics prm
          WHERE prm.trigger_id = ptl.id
        )
        AND ptl.sent_at >= NOW() - INTERVAL '30 days'
      ORDER BY ptl.sent_at ASC
      LIMIT 500
    `);

    const triggers = unlinked.rows as Array<{
      id: number; telefono: string; trigger_type: string; sent_at: Date;
    }>;

    let linked = 0;
    for (const trig of triggers) {
      const reply = await db.execute(sql`
        SELECT received_at
        FROM paula_inbound_log
        WHERE telefono = ${trig.telefono}
          AND received_at > ${trig.sent_at}
          AND received_at <= ${trig.sent_at}::timestamptz + INTERVAL '7 days'
        ORDER BY received_at ASC
        LIMIT 1
      `);

      const respondedAt = reply.rows[0]
        ? (reply.rows[0] as Record<string, unknown>).received_at as Date
        : null;

      let bucket: string | null = null;
      let latencyH: number | null = null;

      if (respondedAt) {
        latencyH = Math.round(
          (new Date(respondedAt).getTime() - new Date(trig.sent_at).getTime()) / 3_600_000
        );
        if      (latencyH <= 24)  bucket = 'same_day';
        else if (latencyH <= 168) bucket = 'same_week';
        else                      bucket = 'slow';
      } else {
        bucket = 'ignored';
      }

      await db.execute(sql`
        INSERT INTO paula_response_metrics
          (telefono, trigger_id, trigger_type, sent_at, responded_at,
           response_bucket, response_latency_h)
        VALUES (
          ${trig.telefono}, ${trig.id}, ${trig.trigger_type}, ${trig.sent_at},
          ${respondedAt}, ${bucket}, ${latencyH}
        )
        ON CONFLICT DO NOTHING
      `);
      linked++;
    }

    logger.info({ linked }, "[enrichment] linkPaulaResponseMetrics done");
  } catch (err) {
    logger.error({ err }, "[enrichment] linkPaulaResponseMetrics failed");
  }
}

// ── Expected payments status updater ─────────────────────────────────────────
// Marks pending rows as missed (overdue by MISSED_THRESHOLD_DAYS).
// Marks previously-missed rows as cured when a payment lands.

export async function updateExpectedPaymentsStatuses(): Promise<void> {
  logger.info("[enrichment] updateExpectedPaymentsStatuses start");
  try {
    // Mark missed: pending rows where expected_date + threshold < today
    const missed = await db.execute(sql`
      UPDATE expected_payments
      SET status = 'missed', missed_at = NOW(), updated_at = NOW()
      WHERE status = 'pending'
        AND expected_date + ${MISSED_THRESHOLD_DAYS} < CURRENT_DATE
    `);

    // Mark paid: pending/missed rows where a matching bill_payment now exists
    const paid = await db.execute(sql`
      UPDATE expected_payments ep
      SET status = CASE WHEN ep.status = 'missed' THEN 'cured' ELSE 'paid' END,
          cured_at = CASE WHEN ep.status = 'missed' THEN NOW() ELSE ep.cured_at END,
          bill_payment_id = bp.id,
          updated_at = NOW()
      FROM bill_payments bp
      WHERE ep.status IN ('pending', 'missed')
        AND bp.telefono = ep.telefono
        AND bp.service_name = ep.service_name
        AND bp.status = ANY(${PAID_STATUSES}::text[])
        AND bp.created_at::date BETWEEN ep.expected_date - 7 AND ep.expected_date + 30
        AND ep.bill_payment_id IS NULL
    `);

    logger.info(
      { missedRows: missed.rowCount, paidRows: paid.rowCount },
      "[enrichment] updateExpectedPaymentsStatuses done"
    );
  } catch (err) {
    logger.error({ err }, "[enrichment] updateExpectedPaymentsStatuses failed");
  }
}

// ── Expected payments monthly seeder ─────────────────────────────────────────
// Reads user_billers and creates one expected_payments row per user × biller
// for the upcoming billing cycle. Skips if a row already exists for this cycle.

export async function seedExpectedPaymentsForCycle(): Promise<void> {
  logger.info("[enrichment] seedExpectedPaymentsForCycle start");
  try {
    const inserted = await db.execute(sql`
      INSERT INTO expected_payments (telefono, service_name, expected_date, status)
      SELECT
        up.phone                                                            AS telefono,
        ub.biller_name                                                      AS service_name,
        DATE_TRUNC('month', NOW())::date + (ub.payment_day - 1)            AS expected_date,
        'pending'
      FROM user_billers ub
      JOIN user_profiles up ON up.id = ub.profile_id
      WHERE ub.payment_day IS NOT NULL
        AND ub.reminder_enabled = true
        AND NOT EXISTS (
          SELECT 1 FROM expected_payments ep
          WHERE ep.telefono = up.phone
            AND ep.service_name = ub.biller_name
            AND ep.expected_date = DATE_TRUNC('month', NOW())::date + (ub.payment_day - 1)
        )
      ON CONFLICT DO NOTHING
    `);
    logger.info({ rows: inserted.rowCount }, "[enrichment] seedExpectedPaymentsForCycle done");
  } catch (err) {
    logger.error({ err }, "[enrichment] seedExpectedPaymentsForCycle failed");
  }
}

// ── Full nightly enrichment run ───────────────────────────────────────────────

export async function runNightlyEnrichment(): Promise<void> {
  logger.info("[enrichment] runNightlyEnrichment start");

  // 1. Update expected payment statuses (missed / cured)
  await updateExpectedPaymentsStatuses();

  // 2. Link Paula response metrics
  await linkPaulaResponseMetrics();

  // 3. Compute enrichment signals for all active users
  try {
    const usersRow = await db.execute(sql`
      SELECT DISTINCT telefono
      FROM bill_payments
      WHERE status = ANY(${PAID_STATUSES}::text[])
        AND created_at >= NOW() - INTERVAL '180 days'
      ORDER BY telefono
    `);
    const phones = (usersRow.rows as Array<{ telefono: string }>).map(r => r.telefono);
    logger.info({ count: phones.length }, "[enrichment] computing enrichment signals");

    // Sequential to avoid DB overload
    for (const telefono of phones) {
      await computeEnrichmentForUser(telefono);
    }
    logger.info({ count: phones.length }, "[enrichment] runNightlyEnrichment done");
  } catch (err) {
    logger.error({ err }, "[enrichment] user enumeration failed");
  }
}

// ── Cron scheduler ────────────────────────────────────────────────────────────

export function startEnrichmentCrons(): void {
  // Lazy-load node-cron to avoid top-level import issues in test environments
  import("node-cron").then(({ default: cron }) => {
    // Nightly at 02:30 MX (08:30 UTC)
    cron.schedule("30 8 * * *", () => {
      runNightlyEnrichment().catch(err =>
        logger.error({ err }, "[enrichment] nightly run threw")
      );
    });

    // Monthly on 1st at 04:00 MX (10:00 UTC)
    cron.schedule("0 10 1 * *", () => {
      seedExpectedPaymentsForCycle().catch(err =>
        logger.error({ err }, "[enrichment] monthly seed threw")
      );
    });

    logger.info("[enrichment] crons scheduled — nightly 02:30 MX, monthly 1st 04:00 MX");
  }).catch(err => logger.error({ err }, "[enrichment] failed to load node-cron"));
}
