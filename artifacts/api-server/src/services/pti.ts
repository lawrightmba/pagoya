/**
 * PTI Service — PagoYa Trust Index (4-Dimension behavioral credit model)
 *
 * Four dimensions map directly to the B2B Alternative Data product:
 *   PR — Payment Reliability    (30pts)  strongest signal for lenders
 *   BC — Behavioral Consistency (20pts)  engagement cadence & stability
 *   ED — Engagement Depth       (25pts)  platform integration & identity
 *   CF — Cash-Flow Stability    (25pts)  balance management & load patterns
 *
 * Model version: v2.0-4dim
 * User-facing label: PagoYa Trust Index
 * Internal credit-profile model: pagoScore.ts (separate, B2B-facing)
 */

import { sql } from "drizzle-orm";
import { logger } from "../lib/logger.js";
import { sendWhatsApp } from "../lib/whatsapp.js";

// ─── Public interfaces ────────────────────────────────────────────────────────

export interface PTIDimension {
  score: number;
  max: number;
  label: string;
  components: Record<string, { score: number; max: number; value: number | boolean | string }>;
}

export interface PTIBreakdown {
  payment_reliability:    PTIDimension;  // max 30
  behavioral_consistency: PTIDimension;  // max 20
  engagement_depth:       PTIDimension;  // max 25
  cashflow_stability:     PTIDimension;  // max 25
  total: number;
  model_version: string;
  // Legacy flat fields (kept for backward compat with existing DB rows)
  payment_streak?:      { score: number; months: number; max: number };
  biller_diversity?:    { score: number; count: number;  max: number };
  kyc_verified?:        { score: number; verified: boolean; max: number };
  wallet_balance?:      { score: number; avg_balance_mxn: number; max: number };
  load_spend_ratio?:    { score: number; ratio: number;  max: number };
  account_age?:         { score: number; days: number;   max: number };
}

export const PTI_MODEL_VERSION = "v2.0-4dim";

export function getPTITier(score: number): { tier: string; color: string; label: string } {
  if (score >= 80) return { tier: "excelente",  color: "#00C875", label: "Excelente" };
  if (score >= 60) return { tier: "bueno",      color: "#007A4A", label: "Bueno" };
  if (score >= 40) return { tier: "en_proceso", color: "#F59E0B", label: "En proceso" };
  return              { tier: "iniciando",       color: "#6B7280", label: "Iniciando" };
}

// ─── Compute PTI for a single user ───────────────────────────────────────────

export async function computePTIForUser(telefono: string): Promise<PTIBreakdown> {
  const { db } = await import("@workspace/db");

  // ══════════════════════════════════════════════════════════════════════════
  // DIMENSION 1: PAYMENT RELIABILITY — max 30pts
  // ══════════════════════════════════════════════════════════════════════════

  // 1a. Payment streak — max 20pts (1pt per consecutive month, cap 20)
  const streakRow = await db.execute(sql`
    SELECT COALESCE(consecutive_payment_months, 0) AS streak_months
    FROM users WHERE telefono = ${telefono} LIMIT 1
  `);
  const streakMonths = Number((streakRow.rows[0] as Record<string,unknown>)?.streak_months ?? 0);
  const paymentStreakScore = Math.min(20, streakMonths);

  // 1b. Payment day consistency — max 10pts
  // Measures how predictable the user's payment day-of-month is.
  // Low std-dev across payment DOMs = proactive, scheduled payer = higher score.
  const domRow = await db.execute(sql`
    SELECT
      COUNT(*)::int                                         AS pay_count,
      COALESCE(STDDEV(EXTRACT(DAY FROM created_at)), 15)::numeric AS dom_stddev,
      MODE() WITHIN GROUP (ORDER BY EXTRACT(DAY FROM created_at))::int AS dominant_day
    FROM bill_payments
    WHERE telefono = ${telefono}
      AND status IN ('completed','success','completed_ok','confirmed')
      AND created_at > NOW() - INTERVAL '6 months'
  `);
  const domR = domRow.rows[0] as Record<string,unknown>;
  const payCount     = Number(domR?.pay_count    ?? 0);
  const domStddev    = Number(domR?.dom_stddev   ?? 15);
  const dominantDay  = Number(domR?.dominant_day ?? 0);
  // Need ≥3 payments for pattern; lower std-dev → more consistent → higher score
  let payDayConsistency = 0;
  if (payCount >= 3) {
    if      (domStddev <= 2)  payDayConsistency = 10;
    else if (domStddev <= 5)  payDayConsistency = 7;
    else if (domStddev <= 8)  payDayConsistency = 4;
    else if (domStddev <= 12) payDayConsistency = 2;
  }

  const prScore = paymentStreakScore + payDayConsistency;

  // ══════════════════════════════════════════════════════════════════════════
  // DIMENSION 2: BEHAVIORAL CONSISTENCY — max 20pts
  // ══════════════════════════════════════════════════════════════════════════

  // 2a. Session cadence — max 8pts (logins + hour consistency)
  const loginRow = await db.execute(sql`
    SELECT
      COUNT(DISTINCT DATE(created_at))::int                      AS login_days,
      COALESCE(STDDEV(EXTRACT(HOUR FROM created_at)), 12)::numeric AS hour_std
    FROM user_events
    WHERE telefono = ${telefono}
      AND event_type = 'login'
      AND created_at > NOW() - INTERVAL '30 days'
  `);
  const lr = loginRow.rows[0] as Record<string,unknown>;
  const loginDays30 = Number(lr?.login_days ?? 0);
  const hourStd     = Number(lr?.hour_std   ?? 12);
  let sessionCadenceScore = 0;
  if      (loginDays30 >= 20) sessionCadenceScore = 8;
  else if (loginDays30 >= 12) sessionCadenceScore = 6;
  else if (loginDays30 >= 6)  sessionCadenceScore = 4;
  else if (loginDays30 >= 2)  sessionCadenceScore = 2;
  // Bonus: low hour-of-day variance = habitual usage pattern
  if (loginDays30 >= 4 && hourStd <= 3) sessionCadenceScore = Math.min(8, sessionCadenceScore + 1);

  // 2b. Game & mission engagement — max 7pts
  const gameRow = await db.execute(sql`
    SELECT
      COALESCE((SELECT COUNT(*)::int FROM scratch_card_plays WHERE telefono = ${telefono} AND play_date > CURRENT_DATE - 30), 0) AS scratch_plays,
      COALESCE((SELECT COUNT(*)::int FROM spin_results      WHERE telefono = ${telefono} AND created_at > NOW() - INTERVAL '30 days'), 0) AS spin_plays,
      COALESCE((SELECT COUNT(*)::int FROM user_mission_progress WHERE telefono = ${telefono} AND completed_at IS NOT NULL), 0) AS missions_done
  `);
  const gr = gameRow.rows[0] as Record<string,unknown>;
  const scratchPlays  = Number(gr?.scratch_plays ?? 0);
  const spinPlays     = Number(gr?.spin_plays    ?? 0);
  const missionsDone  = Number(gr?.missions_done ?? 0);
  const totalEngagement = scratchPlays + spinPlays + (missionsDone * 2);
  let gameEngagementScore = 0;
  if      (totalEngagement >= 20) gameEngagementScore = 7;
  else if (totalEngagement >= 10) gameEngagementScore = 5;
  else if (totalEngagement >= 4)  gameEngagementScore = 3;
  else if (totalEngagement >= 1)  gameEngagementScore = 1;

  // 2c. Wallet load rhythm — max 5pts (frequency regularity of top-ups)
  const loadRhythmRow = await db.execute(sql`
    SELECT
      COUNT(*)::int                                         AS load_count,
      COALESCE(STDDEV(EXTRACT(EPOCH FROM created_at) / 86400.0), 30)::numeric AS load_day_std
    FROM wallet_transactions
    WHERE telefono = ${telefono}
      AND type IN ('load_card','load_oxxo','spei_in')
      AND status = 'confirmed'
      AND created_at > NOW() - INTERVAL '90 days'
  `);
  const rhr = loadRhythmRow.rows[0] as Record<string,unknown>;
  const loadCount30 = Number(rhr?.load_count ?? 0);
  const loadDayStd  = Number(rhr?.load_day_std ?? 30);
  let loadRhythmScore = 0;
  if (loadCount30 >= 3) {
    if      (loadDayStd <= 3)  loadRhythmScore = 5;
    else if (loadDayStd <= 7)  loadRhythmScore = 4;
    else if (loadDayStd <= 14) loadRhythmScore = 2;
    else                       loadRhythmScore = 1;
  }

  const bcScore = sessionCadenceScore + gameEngagementScore + loadRhythmScore;

  // ══════════════════════════════════════════════════════════════════════════
  // DIMENSION 3: ENGAGEMENT DEPTH — max 25pts
  // ══════════════════════════════════════════════════════════════════════════

  // 3a. Biller diversity — max 10pts (distinct services paid)
  const billerRow = await db.execute(sql`
    SELECT COUNT(DISTINCT service_id)::int AS biller_count
    FROM bill_payments
    WHERE telefono = ${telefono}
      AND status IN ('completed','success','completed_ok','confirmed')
  `);
  const billerCount = Number((billerRow.rows[0] as Record<string,unknown>)?.biller_count ?? 0);
  const billerDiversityScore = Math.min(10, billerCount * 3);

  // 3b. KYC verified — max 10pts
  const kycRow = await db.execute(sql`
    SELECT kyc_submitted_at IS NOT NULL AS verified, kyc_tier
    FROM users WHERE telefono = ${telefono} LIMIT 1
  `);
  const kycR       = kycRow.rows[0] as Record<string,unknown>;
  const kycVerified = Boolean(kycR?.verified);
  const kycTier    = String(kycR?.kyc_tier ?? "simplified");
  let kycScore = 0;
  if (kycVerified && kycTier === "full")        kycScore = 10;
  else if (kycVerified)                          kycScore = 7;
  else                                           kycScore = 0;

  // 3c. Spend category mix — max 5pts (utility % of spend signals responsible prioritization)
  // Utility = CFE, water, gas. Telecom = Telmex, Izzi etc. Discretionary = gift cards, streaming.
  const categoryRow = await db.execute(sql`
    SELECT
      COUNT(*) FILTER (WHERE empresa ILIKE ANY(ARRAY['%cfe%','%luz%','%agua%','%sacmex%','%seapal%','%gas%','%naturgy%']))::float
        / NULLIF(COUNT(*), 0) AS utility_ratio
    FROM bill_payments
    WHERE telefono = ${telefono}
      AND status IN ('completed','success','completed_ok','confirmed')
  `);
  const utilityRatio = Number((categoryRow.rows[0] as Record<string,unknown>)?.utility_ratio ?? 0);
  let spendCategoryScore = 0;
  if      (utilityRatio >= 0.6) spendCategoryScore = 5;
  else if (utilityRatio >= 0.4) spendCategoryScore = 3;
  else if (utilityRatio >= 0.2) spendCategoryScore = 1;

  // Pago Seguro cross-platform signal (tracked via user_events event_type='pago_seguro_click')
  const pagoSeguroRow = await db.execute(sql`
    SELECT COUNT(*)::int AS clicks
    FROM user_events
    WHERE telefono = ${telefono} AND event_type = 'pago_seguro_click'
  `);
  const pagoSeguroClicks = Number((pagoSeguroRow.rows[0] as Record<string,unknown>)?.clicks ?? 0);
  // Rent click = cross-platform engagement signal, adds up to 2pts within spendCategory cap
  if (pagoSeguroClicks >= 1) spendCategoryScore = Math.min(5, spendCategoryScore + 2);

  const edScore = billerDiversityScore + kycScore + spendCategoryScore;

  // ══════════════════════════════════════════════════════════════════════════
  // DIMENSION 4: CASH-FLOW STABILITY — max 25pts
  // ══════════════════════════════════════════════════════════════════════════

  // 4a. Wallet balance — max 12pts
  const balanceRow = await db.execute(sql`
    SELECT COALESCE(balance_mxn, 0) AS balance
    FROM wallets WHERE user_id = ${telefono} LIMIT 1
  `);
  const currentBalance = Number((balanceRow.rows[0] as Record<string,unknown>)?.balance ?? 0);
  let walletScore = 0;
  if      (currentBalance >= 500) walletScore = 12;
  else if (currentBalance >= 200) walletScore = 8;
  else if (currentBalance >= 50)  walletScore = 4;

  // 4b. Load/spend ratio (last 90 days) — max 8pts
  const ratioRow = await db.execute(sql`
    SELECT
      COALESCE((
        SELECT SUM(wt.amount_mxn::numeric)
        FROM wallet_transactions wt
        JOIN wallets w ON wt.wallet_id = w.id
        WHERE w.user_id = ${telefono}
          AND wt.type IN ('load_card','load_oxxo','spei_in','SIGNUP_BONUS')
          AND wt.status = 'confirmed'
          AND wt.created_at > NOW() - INTERVAL '90 days'
      ), 0) AS total_loads,
      COALESCE((
        SELECT SUM(monto::numeric)
        FROM bill_payments
        WHERE telefono = ${telefono}
          AND status IN ('completed','success','completed_ok','confirmed')
          AND created_at > NOW() - INTERVAL '90 days'
      ), 0) AS total_spend
  `);
  const rr = ratioRow.rows[0] as Record<string,unknown>;
  const totalLoads = Number(rr?.total_loads ?? 0);
  const totalSpend = Number(rr?.total_spend ?? 0);
  let loadSpendRatio = 0;
  let loadSpendScore = 0;
  if (totalLoads > 0 && totalSpend > 0) {
    loadSpendRatio = totalLoads / totalSpend;
    if      (loadSpendRatio >= 1.0) loadSpendScore = 8;
    else if (loadSpendRatio >= 0.7) loadSpendScore = 6;
    else if (loadSpendRatio >= 0.4) loadSpendScore = 3;
  }

  // 4c. Account age — max 5pts
  const ageRow = await db.execute(sql`
    SELECT EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400 AS days_old
    FROM users WHERE telefono = ${telefono} LIMIT 1
  `);
  const daysOld = Number((ageRow.rows[0] as Record<string,unknown>)?.days_old ?? 0);
  let accountAgeScore = 0;
  if      (daysOld >= 90) accountAgeScore = 5;
  else if (daysOld >= 30) accountAgeScore = 3;
  else if (daysOld >= 7)  accountAgeScore = 2;

  const cfScore = walletScore + loadSpendScore + accountAgeScore;

  // ── Total ─────────────────────────────────────────────────────────────────
  const total = Math.min(100, prScore + bcScore + edScore + cfScore);

  // ── Build structured breakdown ────────────────────────────────────────────
  const breakdown: PTIBreakdown = {
    payment_reliability: {
      score: prScore, max: 30, label: "Fiabilidad de Pago",
      components: {
        payment_streak:        { score: paymentStreakScore, max: 20, value: streakMonths },
        payment_day_consistency: { score: payDayConsistency, max: 10, value: dominantDay },
      },
    },
    behavioral_consistency: {
      score: bcScore, max: 20, label: "Consistencia de Comportamiento",
      components: {
        session_cadence:  { score: sessionCadenceScore, max: 8, value: loginDays30 },
        game_engagement:  { score: gameEngagementScore, max: 7, value: totalEngagement },
        wallet_load_rhythm: { score: loadRhythmScore,  max: 5, value: loadCount30 },
      },
    },
    engagement_depth: {
      score: edScore, max: 25, label: "Profundidad de Uso",
      components: {
        biller_diversity:   { score: billerDiversityScore, max: 10, value: billerCount },
        kyc_verified:       { score: kycScore,             max: 10, value: kycVerified },
        spend_category_mix: { score: spendCategoryScore,   max: 5,  value: Math.round(utilityRatio * 100) },
      },
    },
    cashflow_stability: {
      score: cfScore, max: 25, label: "Estabilidad de Flujo",
      components: {
        wallet_balance:   { score: walletScore,    max: 12, value: currentBalance },
        load_spend_ratio: { score: loadSpendScore, max: 8,  value: Math.round(loadSpendRatio * 100) / 100 },
        account_age:      { score: accountAgeScore, max: 5, value: Math.floor(daysOld) },
      },
    },
    total,
    model_version: PTI_MODEL_VERSION,
    // Legacy flat fields for backward compat
    payment_streak:   { score: paymentStreakScore, months: streakMonths, max: 20 },
    biller_diversity: { score: billerDiversityScore, count: billerCount, max: 10 },
    kyc_verified:     { score: kycScore, verified: kycVerified, max: 10 },
    wallet_balance:   { score: walletScore, avg_balance_mxn: currentBalance, max: 12 },
    load_spend_ratio: { score: loadSpendScore, ratio: Math.round(loadSpendRatio * 100) / 100, max: 8 },
    account_age:      { score: accountAgeScore, days: Math.floor(daysOld), max: 5 },
  };

  // ── Persist to users table ────────────────────────────────────────────────
  await db.execute(sql`
    UPDATE users SET
      pti_score             = ${total},
      pti_breakdown         = ${JSON.stringify(breakdown)}::jsonb,
      pti_computed_at       = NOW(),
      pti_first_computed_at = COALESCE(pti_first_computed_at, NOW())
    WHERE telefono = ${telefono}
  `);

  // ── Persist dimension scores to behavioral signals table ──────────────────
  await db.execute(sql`
    INSERT INTO pti_behavioral_signals
      (telefono, computed_at, payment_day_consistency, dominant_payment_day,
       logins_30d, login_cadence_std, game_plays_30d, missions_completed,
       load_count_30d, load_rhythm_std, utility_payment_ratio, pago_seguro_clicks,
       pr_score, bc_score, ed_score, cf_score)
    VALUES (
      ${telefono}, NOW(),
      ${payDayConsistency}, ${dominantDay},
      ${loginDays30}, ${hourStd}, ${scratchPlays + spinPlays}, ${missionsDone},
      ${loadCount30}, ${loadDayStd}, ${utilityRatio}, ${pagoSeguroClicks},
      ${prScore}, ${bcScore}, ${edScore}, ${cfScore}
    )
  `).catch(err => logger.warn({ err, telefono }, "pti: behavioral signals persist failed — continuing"));

  return breakdown;
}

/** Monthly batch: recompute PTI for all users + send WhatsApp notification */
export async function computePTIForAllUsers(): Promise<void> {
  const { db } = await import("@workspace/db");
  const startedAt = Date.now();
  logger.info("[PTI Monthly] Starting monthly PTI computation (v2.0-4dim)...");

  const allUsers = await db.execute(sql`
    SELECT telefono FROM users WHERE telefono IS NOT NULL AND telefono != ''
  `);
  const phones = allUsers.rows.map(r => (r as Record<string,unknown>).telefono as string);

  let updated = 0;
  let errors  = 0;

  for (const telefono of phones) {
    try {
      const bd = await computePTIForUser(telefono);
      const { tier, label } = getPTITier(bd.total);

      const txRow = await db.execute(sql`
        SELECT COUNT(*)::int AS tx_count FROM bill_payments
        WHERE telefono = ${telefono} AND status IN ('completed','success','completed_ok','confirmed')
      `);
      const txCount = Number((txRow.rows[0] as Record<string,unknown>)?.tx_count ?? 0);

      if (txCount >= 1) {
        const tip = buildImprovementTip(bd);
        const msg =
          `📊 *Tu PagoYa Trust Index se actualizó*\n\n` +
          `Tu puntaje: *${bd.total}/100 — ${label}* ${tier === "excelente" ? "🏆" : tier === "bueno" ? "✅" : "📈"}\n\n` +
          `${tip}\n\n` +
          `Ver tu puntaje: pagoyamx.com/inicio`;
        await sendWhatsApp(telefono, msg).catch(() => {});
      }

      updated++;
    } catch (err) {
      logger.error({ err, telefono }, "[PTI Monthly] user failed");
      errors++;
    }
    await new Promise(r => setTimeout(r, 50));
  }

  logger.info(`[PTI Monthly] Complete: ${updated} users updated, ${errors} errors — ${Date.now() - startedAt}ms`);
}

function buildImprovementTip(bd: PTIBreakdown): string {
  const pr = bd.payment_reliability;
  const bc = bd.behavioral_consistency;
  const ed = bd.engagement_depth;
  const cf = bd.cashflow_stability;

  // Find lowest-scoring dimension as improvement opportunity
  const dims = [
    { name: "pr", score: pr.score / pr.max },
    { name: "bc", score: bc.score / bc.max },
    { name: "ed", score: ed.score / ed.max },
    { name: "cf", score: cf.score / cf.max },
  ].sort((a, b) => a.score - b.score);

  switch (dims[0].name) {
    case "pr": return "💡 Sigue pagando cada mes en las mismas fechas para mejorar tu racha.";
    case "bc": return "💡 Abre la app regularmente o juega Raspa y Gana para subir tu consistencia.";
    case "ed": return "💡 Verifica tu identidad en la app para ganar más puntos de perfil.";
    case "cf": return "💡 Mantén saldo en tu billetera para mejorar tu estabilidad financiera.";
    default:   return "🌟 ¡Excelente historial! Sigue así.";
  }
}
