/**
 * derivedSignals.ts
 *
 * ADDITIVE INSTRUMENTATION ONLY — NOT wired into pti.ts or any live score.
 *
 * Six new derived signals requested for review (July 2026):
 *   1. paymentRailSwitching     — distinct rails used + rail switches, last 90d
 *   2. conditionalPaulaLatency  — median response latency for risk/disengagement
 *                                 Paula triggers (stalled_14d, readiness_hard, winback_30d)
 *                                 only, as opposed to the general
 *                                 paulaResponseLatencyMinutes in pti.ts which
 *                                 averages across ALL trigger types.
 *   3. inflowCV                 — coefficient of variation on wallet LOAD amounts
 *                                 (mirrors the existing amountCV logic in pti.ts,
 *                                 which is computed on bill PAYMENT amounts instead).
 *   4. kycStaleness              — days elapsed since kyc_verified_at.
 *   5. billerCategoryDiversity  — SKIPPED. bill_payments.categoria is 0% populated
 *                                 (0 rows in bill_payments in both dev and production
 *                                 as of 2026-07-05) — see report, not implemented.
 *   6. failedPaymentSignal90d   — union of bill_payments + wallet_transactions
 *                                 failure states, partial coverage only (see caveats
 *                                 in the DB view comment below).
 *
 * None of these functions are called from pti.ts, pagoScore.ts, or any cron that
 * writes to users.pti_score / users.pti_breakdown. They exist purely so the
 * numbers can be reviewed before (if ever) being wired into scoring.
 */

import { sql } from "drizzle-orm";
import { logger } from "../lib/logger.js";

// ─────────────────────────────────────────────────────────────────────────
// 1. PAYMENT METHOD SWITCHING FREQUENCY
// ─────────────────────────────────────────────────────────────────────────
// Uses wallet_transactions.payment_source (tagged at load-confirmation time —
// see wallet.ts / stpWebhook.ts). Looks at the last 90 days of wallet LOADS
// (type LIKE 'load_%') where payment_source is populated, and counts:
//   - distinctRailsUsed: how many different rails (oxxo/card/spei) the user
//     has loaded through
//   - railSwitches90d: how many times the rail on load N differs from load N-1
//     (LAG window function, ordered by created_at)
//
// CAVEAT: payment_source is only backfilled going forward from when the
// tagging code shipped; older wallet_transactions rows predate it and will
// be excluded (IS NOT NULL filter). See report for current population rate.
export interface PaymentRailSwitching {
  telefono: string;
  distinctRailsUsed: number;
  railSwitches90d: number;
}

export async function computePaymentRailSwitching(telefono: string): Promise<PaymentRailSwitching> {
  const { db } = await import("@workspace/db");
  try {
    const row = await db.execute(sql`
      WITH loads AS (
        SELECT
          wt.payment_source,
          wt.created_at,
          LAG(wt.payment_source) OVER (ORDER BY wt.created_at) AS prev_source
        FROM wallet_transactions wt
        JOIN wallets w ON w.id = wt.wallet_id
        WHERE w.user_id = ${telefono}
          AND wt.type LIKE 'load_%'
          AND wt.payment_source IS NOT NULL
          AND wt.created_at >= NOW() - INTERVAL '90 days'
      )
      SELECT
        COUNT(DISTINCT payment_source)::int AS distinct_rails_used,
        COUNT(*) FILTER (
          WHERE payment_source IS DISTINCT FROM prev_source AND prev_source IS NOT NULL
        )::int AS rail_switches_90d
      FROM loads
    `);
    const r = row.rows[0] as Record<string, unknown>;
    return {
      telefono,
      distinctRailsUsed: Number(r?.distinct_rails_used ?? 0),
      railSwitches90d: Number(r?.rail_switches_90d ?? 0),
    };
  } catch (err) {
    logger.error({ err, telefono }, "derivedSignals: computePaymentRailSwitching failed");
    return { telefono, distinctRailsUsed: 0, railSwitches90d: 0 };
  }
}

// ─────────────────────────────────────────────────────────────────────────
// 2. CONDITIONAL PAULA RESPONSE LATENCY (risk/disengagement triggers only)
// ─────────────────────────────────────────────────────────────────────────
// Same shape as the existing paulaResponseLatencyMinutes query in pti.ts
// (median minutes from paula_send_queue.sent_at to the next paula_inbound_log
// reply within 24h, over the last 90 days) — but restricted to
// trigger_type IN ('stalled_14d', 'readiness_hard', 'winback_30d'), joined
// via paula_send_queue.trigger_log_id -> paula_trigger_log.id.
//
// This is intentionally a SEPARATE metric from paulaResponseLatencyMinutes:
// the hypothesis is that responsiveness specifically to risk/disengagement
// nudges may be more predictive than average responsiveness to all nudges
// (which include neutral things like module unlocks).
export interface ConditionalPaulaLatency {
  telefono: string;
  medianMinutesRiskTriggers: number; // NaN if no qualifying reply in window
  riskSendsWithReply: number;
  riskSendsTotal: number;
}

export async function computeConditionalPaulaLatency(telefono: string): Promise<ConditionalPaulaLatency> {
  const { db } = await import("@workspace/db");
  try {
    const row = await db.execute(sql`
      SELECT
        PERCENTILE_CONT(0.5) WITHIN GROUP (
          ORDER BY EXTRACT(EPOCH FROM (i.first_reply_at - q.sent_at)) / 60.0
        ) AS median_minutes,
        COUNT(*) FILTER (WHERE i.first_reply_at IS NOT NULL)::int AS with_reply,
        COUNT(*)::int AS total
      FROM paula_send_queue q
      JOIN paula_trigger_log ptl ON ptl.id = q.trigger_log_id
      CROSS JOIN LATERAL (
        SELECT MIN(il.received_at) AS first_reply_at
        FROM paula_inbound_log il
        WHERE il.telefono = q.telefono
          AND il.received_at > q.sent_at
          AND il.received_at < q.sent_at + INTERVAL '24 hours'
      ) i
      WHERE q.telefono = ${telefono}
        AND q.status = 'SENT'
        AND q.sent_at IS NOT NULL
        AND q.sent_at > NOW() - INTERVAL '90 days'
        AND ptl.trigger_type IN ('stalled_14d', 'readiness_hard', 'winback_30d')
    `);
    const r = row.rows[0] as Record<string, unknown>;
    return {
      telefono,
      medianMinutesRiskTriggers: Number(r?.median_minutes ?? NaN),
      riskSendsWithReply: Number(r?.with_reply ?? 0),
      riskSendsTotal: Number(r?.total ?? 0),
    };
  } catch (err) {
    logger.error({ err, telefono }, "derivedSignals: computeConditionalPaulaLatency failed");
    return { telefono, medianMinutesRiskTriggers: NaN, riskSendsWithReply: 0, riskSendsTotal: 0 };
  }
}

// ─────────────────────────────────────────────────────────────────────────
// 3. INFLOW COEFFICIENT OF VARIATION (wallet loads)
// ─────────────────────────────────────────────────────────────────────────
// Mirrors the amountCV pattern used in pti.ts (there computed on bill
// PAYMENT amounts via payment_amount_volatility / enrichmentCron.ts). This
// version computes CoV on wallet LOAD amounts instead: stddev(amount) /
// avg(amount), over the last 90 days, restricted to load-type transactions
// with payment_source populated (per spec — excludes untagged legacy rows).
export interface InflowCV {
  telefono: string;
  loadCount90d: number;
  avgLoad: number;
  loadStddev: number;
  inflowCV: number; // NaN if loadCount90d < 2 or avgLoad === 0
}

export async function computeInflowCV(telefono: string): Promise<InflowCV> {
  const { db } = await import("@workspace/db");
  try {
    const row = await db.execute(sql`
      SELECT
        COUNT(*)::int AS load_count_90d,
        COALESCE(AVG(wt.amount_mxn::numeric), 0)::numeric AS avg_load,
        COALESCE(STDDEV(wt.amount_mxn::numeric), 0)::numeric AS load_stddev
      FROM wallet_transactions wt
      JOIN wallets w ON w.id = wt.wallet_id
      WHERE w.user_id = ${telefono}
        AND wt.type LIKE 'load_%'
        AND wt.payment_source IS NOT NULL
        AND wt.created_at >= NOW() - INTERVAL '90 days'
    `);
    const r = row.rows[0] as Record<string, unknown>;
    const loadCount90d = Number(r?.load_count_90d ?? 0);
    const avgLoad = Number(r?.avg_load ?? 0);
    const loadStddev = Number(r?.load_stddev ?? 0);
    const inflowCV = loadCount90d >= 2 && avgLoad > 0 ? loadStddev / avgLoad : NaN;
    return { telefono, loadCount90d, avgLoad, loadStddev, inflowCV };
  } catch (err) {
    logger.error({ err, telefono }, "derivedSignals: computeInflowCV failed");
    return { telefono, loadCount90d: 0, avgLoad: 0, loadStddev: 0, inflowCV: NaN };
  }
}

// ─────────────────────────────────────────────────────────────────────────
// 4. KYC STALENESS
// ─────────────────────────────────────────────────────────────────────────
// Trivial derived field: days elapsed since kyc_verified_at. Returns null
// for users who are not yet KYC-verified (kyc_verified_at IS NULL).
export interface KycStaleness {
  telefono: string;
  kycVerifiedAt: Date | null;
  kycStalenessDays: number | null;
}

export async function computeKycStaleness(telefono: string): Promise<KycStaleness> {
  const { db } = await import("@workspace/db");
  try {
    const row = await db.execute(sql`
      SELECT
        kyc_verified_at,
        CASE WHEN kyc_verified_at IS NOT NULL
             THEN EXTRACT(DAY FROM (NOW() - kyc_verified_at))::int
             ELSE NULL END AS kyc_staleness_days
      FROM users
      WHERE telefono = ${telefono}
      LIMIT 1
    `);
    const r = row.rows[0] as Record<string, unknown> | undefined;
    return {
      telefono,
      kycVerifiedAt: (r?.kyc_verified_at as Date | null) ?? null,
      kycStalenessDays: r?.kyc_staleness_days == null ? null : Number(r.kyc_staleness_days),
    };
  } catch (err) {
    logger.error({ err, telefono }, "derivedSignals: computeKycStaleness failed");
    return { telefono, kycVerifiedAt: null, kycStalenessDays: null };
  }
}

// ─────────────────────────────────────────────────────────────────────────
// 5. BILLER CATEGORY DIVERSITY — SKIPPED, NOT IMPLEMENTED
// ─────────────────────────────────────────────────────────────────────────
// Data-quality gate failed: bill_payments.categoria is 0% populated because
// bill_payments itself has 0 rows in both the dev database and the
// production replica as of 2026-07-05 (0 of 0 rows non-null/non-empty).
// Per the task spec ("if mostly null, report the null rate and do NOT
// implement"), this signal is intentionally left unimplemented. Revisit
// once bill_payments has real payment volume — the query would be:
//
//   SELECT telefono, COUNT(DISTINCT categoria)::int AS biller_category_diversity
//   FROM bill_payments
//   WHERE categoria IS NOT NULL AND categoria <> ''
//   GROUP BY telefono;

// ─────────────────────────────────────────────────────────────────────────
// 6. FAILED PAYMENT SIGNAL (PARTIAL COVERAGE) — see failed_payment_signal_90d
//    view, created via direct SQL (see migration note below). This helper
//    just wraps a per-telefono read of that view for convenience.
// ─────────────────────────────────────────────────────────────────────────
// KNOWN LIMITATION: this view unions only bill_payments.status IN
// ('fallido','failed') and wallet_transactions.status = 'failed'. It
// explicitly EXCLUDES:
//   - raw stp_webhook_log failures (status/error columns on inbound SPEI
//     webhook payloads — these represent malformed/rejected webhooks, not
//     necessarily user-attributable failed payment attempts)
//   - bill_payment_audit (event-level audit trail) — this table exists but
//     is currently unpopulated in both dev and production, so it contributes
//     no additional coverage right now.
// This is a partial-coverage metric, not full attempt-level failure tracking.
export interface FailedPaymentSignal {
  telefono: string;
  failedAttempts90d: number;
}

export async function getFailedPaymentSignal(telefono: string): Promise<FailedPaymentSignal> {
  const { db } = await import("@workspace/db");
  try {
    const row = await db.execute(sql`
      SELECT COALESCE(failed_attempts_90d, 0)::int AS failed_attempts_90d
      FROM failed_payment_signal_90d
      WHERE telefono = ${telefono}
    `);
    const r = row.rows[0] as Record<string, unknown> | undefined;
    return { telefono, failedAttempts90d: Number(r?.failed_attempts_90d ?? 0) };
  } catch (err) {
    logger.error({ err, telefono }, "derivedSignals: getFailedPaymentSignal failed");
    return { telefono, failedAttempts90d: 0 };
  }
}
