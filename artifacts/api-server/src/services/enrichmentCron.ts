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
        AND status IN ('completed', 'success', 'completed_ok', 'confirmed')
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
      AND bp.status IN ('completed', 'success', 'completed_ok', 'confirmed')
      AND bp.created_at::date IN (
        SELECT created_at::date
        FROM bill_payments
        WHERE telefono = ${telefono}
          AND status IN ('completed', 'success', 'completed_ok', 'confirmed')
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
      AND status IN ('completed', 'success', 'completed_ok', 'confirmed')
  `);
  const r = row.rows[0] as Record<string, unknown> | undefined;
  const rowsWithDue = Number(r?.rows_with_due ?? 0);
  const partialCount = rowsWithDue > 0 ? Number(r?.partial_count ?? 0) : null;
  return { count: partialCount, hasAmountDueData: rowsWithDue > 0 };
}

// ── I. Remittance signals (fields 72–75) ─────────────────────────────────────
// Reads wallet_transactions tagged load_source_type = 'remittance'.
// Returns NULL for all four fields when fewer than 2 tagged transactions exist.
//
// Confidence weighting:
//   keyword_matched — per-transaction confirmation; full weight
//   self_reported   — user-level inference, no per-tx confirmation; 0.75 weight on
//                     avgAmountMxn and a reliability penalty on score fields when
//                     self_reported rows form the majority of the input set.
//
// Regularity (field 72): cadence regularity, not amount CV.
//   CV of inter-arrival intervals in days. Monthly/biweekly remittances score high
//   even when amounts vary. Amount-based CV is explicitly NOT used here.
//
// Source consistency (field 74): fraction of transactions from the dominant sender.
//   Sender is parsed from the stored description format:
//   "SPEI de {ordenante} — clave {claveRastreo}"
//   High score = user receives from one consistent sender (e.g., always Remitly).

async function computeRemittanceSignals(telefono: string): Promise<{
  regularityScore: number | null;
  avgAmountMxn: number | null;
  sourceConsistency: number | null;
  dominantCountry: string | null;
}> {
  const wallet = await db.execute(sql`
    SELECT w.id FROM wallets w
    JOIN users u ON u.telefono = w.user_id
    WHERE u.telefono = ${telefono}
    LIMIT 1
  `);
  const walletId = (wallet.rows[0] as Record<string, unknown> | undefined)?.id;
  if (!walletId) return { regularityScore: null, avgAmountMxn: null, sourceConsistency: null, dominantCountry: null };

  const rows = await db.execute(sql`
    SELECT amount_mxn, description, created_at, load_source_confidence
    FROM wallet_transactions
    WHERE wallet_id = ${walletId as string}
      AND load_source_type = 'remittance'
      AND status = 'confirmed'
    ORDER BY created_at ASC
    LIMIT 100
  `);

  const txns = rows.rows as Array<{
    amount_mxn: string;
    description: string | null;
    created_at: Date | string;
    load_source_confidence: string | null;
  }>;
  if (txns.length < 2) return { regularityScore: null, avgAmountMxn: null, sourceConsistency: null, dominantCountry: null };

  const keywordCount = txns.filter(t => t.load_source_confidence === "keyword_matched").length;
  const selfReportedMajority = keywordCount < txns.length / 2;

  // ── Field 73: avg_remittance_amount_mxn ────────────────────────────────────
  // self_reported rows weighted at 0.75 — user-level signal, not per-tx confirmed.
  let weightedSum = 0;
  let weightedN = 0;
  for (const t of txns) {
    const w = t.load_source_confidence === "keyword_matched" ? 1.0 : 0.75;
    weightedSum += Number(t.amount_mxn) * w;
    weightedN += w;
  }
  const avgAmountMxn = weightedN > 0 ? Math.round((weightedSum / weightedN) * 100) / 100 : null;

  // ── Field 72: remittance_inflow_regularity_score ───────────────────────────
  // CV of inter-arrival intervals (days). Lower CV = more regular cadence = higher score.
  // Penalised by 15 pts when self_reported rows are the majority (lower data confidence).
  const dates = txns
    .map(t => new Date(t.created_at).getTime())
    .filter(ts => !isNaN(ts))
    .sort((a, b) => a - b);

  let regularityScore: number | null = null;
  if (dates.length >= 2) {
    const intervals: number[] = [];
    for (let i = 1; i < dates.length; i++) {
      intervals.push((dates[i] - dates[i - 1]) / 86_400_000); // ms → days
    }
    const meanInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const stdInterval  = Math.sqrt(
      intervals.map(d => (d - meanInterval) ** 2).reduce((a, b) => a + b, 0) / intervals.length,
    );
    const cvInterval = meanInterval > 0 ? stdInterval / meanInterval : 1;
    let score = Math.round(Math.max(0, Math.min(100, (1 - cvInterval) * 100)));
    if (selfReportedMajority) score = Math.max(0, score - 15); // reliability penalty
    regularityScore = score;
  }

  // ── Field 74: remittance_source_consistency ────────────────────────────────
  // Fraction of transactions from the dominant sender.
  // Parses ordenante from the stored description: "SPEI de {ordenante} — clave {id}"
  const senderFreq: Record<string, number> = {};
  for (const t of txns) {
    const desc = t.description ?? "";
    // Extract sender: text between "SPEI de " and " — clave"
    const match = desc.match(/^SPEI de (.+?) — clave/i);
    const senderKey = match ? match[1].trim().toLowerCase() : "unknown";
    senderFreq[senderKey] = (senderFreq[senderKey] ?? 0) + 1;
  }
  const topSenderCount = Math.max(...Object.values(senderFreq));
  let sourceConsistency = Math.round((topSenderCount / txns.length) * 100);
  if (selfReportedMajority) sourceConsistency = Math.max(0, sourceConsistency - 10);

  // ── Field 75: dominant_remittance_country ──────────────────────────────────
  // Inferred from known remittance provider names in the sender field, then
  // falls back to description keyword scan. NULL when no signal found.
  const US_PROVIDERS = ["remitly", "western union", "xoom", "moneygram", "worldremit", "wise", "transferwise", "ria", "sendwave", "pangea"];
  const CA_PROVIDERS = ["transferwise canada", "remitly canada"];
  const ES_PROVIDERS = ["bizum", "spain", "españa"];

  const allSendersAndDesc = txns
    .map(t => ((t.description ?? "")).toLowerCase())
    .join(" ");

  let dominantCountry: string | null = null;
  if (US_PROVIDERS.some(p => allSendersAndDesc.includes(p))) dominantCountry = "US";
  else if (CA_PROVIDERS.some(p => allSendersAndDesc.includes(p))) dominantCountry = "CA";
  else if (ES_PROVIDERS.some(p => allSendersAndDesc.includes(p))) dominantCountry = "ES";
  else if (allSendersAndDesc.includes("canada")) dominantCountry = "CA";
  else if (allSendersAndDesc.includes("españa") || allSendersAndDesc.includes("spain")) dominantCountry = "ES";
  // "usa" / "estados unidos" left out of fallback — too many false positives in concept text

  return { regularityScore, avgAmountMxn, sourceConsistency, dominantCountry };
}

// ── J. Colonia cluster risk (field 81) ────────────────────────────────────────
// Average payment_score of users in the same colonia (k-anon: N≥5 in cohort).
// Returns NULL when colonia is NULL or cohort is too small.

async function computeColoniaClusterRisk(telefono: string): Promise<number | null> {
  const result = await db.execute(sql`
    WITH user_colonia AS (
      SELECT colonia FROM users WHERE telefono = ${telefono} LIMIT 1
    ),
    cohort AS (
      SELECT cp.payment_score
      FROM users u
      JOIN credit_profiles cp ON cp.telefono = u.telefono
      WHERE u.colonia = (SELECT colonia FROM user_colonia)
        AND (SELECT colonia FROM user_colonia) IS NOT NULL
        AND cp.payment_score IS NOT NULL
    )
    SELECT
      CASE WHEN COUNT(*) >= 5
        THEN ROUND(AVG(payment_score)::numeric, 2)
        ELSE NULL
      END AS cluster_score
    FROM cohort
  `);
  const r = result.rows[0] as Record<string, unknown> | undefined;
  return r?.cluster_score != null ? Number(r.cluster_score) : null;
}

// ── K. Referral network risk correlation (field 82) ───────────────────────────
// INTERNAL ONLY — never exposed via B2B API or pti_export_safe.
// Avg payment_score of users in the same referral chain (referred_by matches).

async function computeReferralNetworkRisk(telefono: string): Promise<number | null> {
  const result = await db.execute(sql`
    WITH ref_source AS (
      SELECT referral_code FROM users WHERE telefono = ${telefono} LIMIT 1
    ),
    same_chain AS (
      SELECT cp.payment_score
      FROM users u
      JOIN credit_profiles cp ON cp.telefono = u.telefono
      WHERE u.signup_ref_code = (SELECT referral_code FROM ref_source)
        AND (SELECT referral_code FROM ref_source) IS NOT NULL
        AND u.telefono != ${telefono}
        AND cp.payment_score IS NOT NULL
    )
    SELECT
      CASE WHEN COUNT(*) >= 3
        THEN ROUND(AVG(payment_score)::numeric, 2)
        ELSE NULL
      END AS network_score
    FROM same_chain
  `);
  const r = result.rows[0] as Record<string, unknown> | undefined;
  return r?.network_score != null ? Number(r.network_score) : null;
}

// ── L. Paula sentiment signals (fields 83–85) ─────────────────────────────────
// Keyword-based sentiment scoring on paula_inbound_log messages (Spanish NLP).
// score 0–100: 50 = neutral, >50 positive, <50 stressed.

const STRESS_KEYWORDS = [
  "no puedo", "no tengo", "deuda", "préstamo", "prestamo", "atrasado",
  "vencido", "urgente", "necesito", "ayuda", "problemas", "problema",
  "difícil", "dificil", "no alcanza", "sin dinero", "corte",
];
const POSITIVE_KEYWORDS = [
  "gracias", "excelente", "bien", "pagué", "pague", "listo", "perfecto",
  "genial", "claro", "sí", "si", "ok", "bueno",
];

async function computePaulaSentiment(telefono: string): Promise<{
  score: number | null;
  stressFlag: boolean | null;
  trend30d: number | null;
}> {
  const rows = await db.execute(sql`
    SELECT message_body, received_at
    FROM paula_inbound_log
    WHERE telefono = ${telefono}
      AND received_at >= NOW() - INTERVAL '90 days'
    ORDER BY received_at ASC
  `);

  const messages = rows.rows as Array<{ message_body: string; received_at: Date }>;
  if (messages.length < 3) return { score: null, stressFlag: null, trend30d: null };

  function scoreMsg(text: string): number {
    const t = text.toLowerCase();
    let s = 50;
    for (const kw of STRESS_KEYWORDS)   if (t.includes(kw)) s -= 8;
    for (const kw of POSITIVE_KEYWORDS) if (t.includes(kw)) s += 5;
    return Math.max(0, Math.min(100, s));
  }

  const now = Date.now();
  const cutoff30d = now - 30 * 86_400_000;
  const cutoff60d = now - 60 * 86_400_000;

  const scores = messages.map(m => ({ score: scoreMsg(m.message_body), ts: new Date(m.received_at).getTime() }));
  const allScores = scores.map(s => s.score);
  const avgAll = allScores.reduce((a, b) => a + b, 0) / allScores.length;

  const recent30 = scores.filter(s => s.ts >= cutoff30d).map(s => s.score);
  const prev30   = scores.filter(s => s.ts >= cutoff60d && s.ts < cutoff30d).map(s => s.score);

  let trend30d: number | null = null;
  if (recent30.length >= 2 && prev30.length >= 2) {
    const avgRecent = recent30.reduce((a, b) => a + b, 0) / recent30.length;
    const avgPrev   = prev30.reduce((a, b) => a + b, 0) / prev30.length;
    trend30d = Math.round((avgRecent - avgPrev) * 100) / 100;
  }

  const overallScore = Math.round(avgAll * 100) / 100;
  const stressFlag = overallScore < 40;

  return { score: overallScore, stressFlag, trend30d };
}

// ── M. Employment stability score (field 88) ──────────────────────────────────
// Derived from employment_type (users table) + address_tenure_days.
// formal=100 base / informal=70 / gig=55 / unemployed=20; tenure bonus up to +15.

async function computeEmploymentStability(telefono: string): Promise<number | null> {
  const row = await db.execute(sql`
    SELECT employment_type, address_registered_at FROM users WHERE telefono = ${telefono} LIMIT 1
  `);
  const r = row.rows[0] as Record<string, unknown> | undefined;
  if (!r?.employment_type) return null;

  const baseScore: Record<string, number> = {
    formal: 100, informal: 70, gig: 55, unemployed: 20,
  };
  let score = baseScore[r.employment_type as string] ?? 50;

  if (r.address_registered_at) {
    const tenureDays = Math.floor((Date.now() - new Date(r.address_registered_at as string).getTime()) / 86_400_000);
    const tenureBonus = Math.min(15, Math.floor(tenureDays / 60)); // +1 per 2 months, max +15
    score = Math.min(100, score + tenureBonus);
  }

  return score;
}

// ── Enrichment orchestrator (runs E–M for one user) ───────────────────────────

export async function computeEnrichmentForUser(telefono: string): Promise<void> {
  try {
    const [sloperResult, cvResult, rankResult, partialResult,
           remittanceResult, coloniaRisk, referralRisk, sentimentResult, employmentScore,
    ] = await Promise.all([
      computeBillerCountSlope(telefono),
      computePaymentAmountCV(telefono),
      computePriorityRank(telefono),
      computePartialPaymentCount(telefono),
      computeRemittanceSignals(telefono),
      computeColoniaClusterRisk(telefono),
      computeReferralNetworkRisk(telefono),
      computePaulaSentiment(telefono),
      computeEmploymentStability(telefono),
    ]);

    await db.execute(sql`
      INSERT INTO credit_profiles (telefono, enrichment_computed_at,
        biller_count_slope_90d, biller_count_slope_n,
        payment_amount_cv, payment_amount_cv_n,
        priority_rank_json, priority_rank_n,
        partial_payment_count,
        remittance_inflow_regularity_score, avg_remittance_amount_mxn,
        remittance_source_consistency, dominant_remittance_country,
        colonia_cluster_risk_score, referral_network_risk_correlation,
        paula_sentiment_score, financial_stress_language_flag, sentiment_trend_30d,
        employment_stability_score)
      VALUES (
        ${telefono}, NOW(),
        ${sloperResult.slope}, ${sloperResult.n},
        ${cvResult.cv}, ${cvResult.n},
        ${rankResult.rank ? JSON.stringify(rankResult.rank) : null}::jsonb,
        ${rankResult.n},
        ${partialResult.count},
        ${remittanceResult.regularityScore}, ${remittanceResult.avgAmountMxn},
        ${remittanceResult.sourceConsistency}, ${remittanceResult.dominantCountry},
        ${coloniaRisk}, ${referralRisk},
        ${sentimentResult.score}, ${sentimentResult.stressFlag}, ${sentimentResult.trend30d},
        ${employmentScore}
      )
      ON CONFLICT (telefono) DO UPDATE SET
        enrichment_computed_at               = NOW(),
        biller_count_slope_90d               = EXCLUDED.biller_count_slope_90d,
        biller_count_slope_n                 = EXCLUDED.biller_count_slope_n,
        payment_amount_cv                    = EXCLUDED.payment_amount_cv,
        payment_amount_cv_n                  = EXCLUDED.payment_amount_cv_n,
        priority_rank_json                   = EXCLUDED.priority_rank_json,
        priority_rank_n                      = EXCLUDED.priority_rank_n,
        partial_payment_count                = EXCLUDED.partial_payment_count,
        remittance_inflow_regularity_score   = EXCLUDED.remittance_inflow_regularity_score,
        avg_remittance_amount_mxn            = EXCLUDED.avg_remittance_amount_mxn,
        remittance_source_consistency        = EXCLUDED.remittance_source_consistency,
        dominant_remittance_country          = EXCLUDED.dominant_remittance_country,
        colonia_cluster_risk_score           = EXCLUDED.colonia_cluster_risk_score,
        referral_network_risk_correlation    = EXCLUDED.referral_network_risk_correlation,
        paula_sentiment_score                = EXCLUDED.paula_sentiment_score,
        financial_stress_language_flag       = EXCLUDED.financial_stress_language_flag,
        sentiment_trend_30d                  = EXCLUDED.sentiment_trend_30d,
        employment_stability_score           = EXCLUDED.employment_stability_score
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
      SELECT ptl.id, ptl.telefono, ptl.trigger_type, ptl.fired_at
      FROM paula_trigger_log ptl
      WHERE ptl.fired_at IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM paula_response_metrics prm
          WHERE prm.trigger_id = ptl.id
        )
        AND ptl.fired_at >= NOW() - INTERVAL '30 days'
      ORDER BY ptl.fired_at ASC
      LIMIT 500
    `);

    // paula_trigger_log has fired_at (not sent_at); paula_response_metrics.sent_at
    // is the destination column and retains its name — only the source reference changes.
    const triggers = unlinked.rows as Array<{
      id: number; telefono: string; trigger_type: string; fired_at: Date;
    }>;

    let linked = 0;
    for (const trig of triggers) {
      const reply = await db.execute(sql`
        SELECT received_at
        FROM paula_inbound_log
        WHERE telefono = ${trig.telefono}
          AND received_at > ${trig.fired_at}
          AND received_at <= ${trig.fired_at}::timestamptz + INTERVAL '7 days'
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
          (new Date(respondedAt).getTime() - new Date(trig.fired_at).getTime()) / 3_600_000
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
          ${trig.telefono}, ${trig.id}, ${trig.trigger_type}, ${trig.fired_at},
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
        AND bp.status IN ('completed', 'success', 'completed_ok', 'confirmed')
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
      WHERE status IN ('completed', 'success', 'completed_ok', 'confirmed')
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
