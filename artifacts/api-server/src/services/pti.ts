/**
 * PTI Service — PagoYa Trust Index (4-Dimension behavioral credit model)
 *
 * Four dimensions map directly to the B2B Alternative Data product:
 *   PR — Payment Reliability    (30pts)  strongest signal for lenders
 *   BC — Behavioral Consistency (20pts)  engagement cadence & stability
 *   ED — Engagement Depth       (25pts)  platform integration & identity
 *   CF — Cash-Flow Stability    (25pts)  balance management & load patterns
 *
 * Model version: v2.1-4dim
 * User-facing label: PagoYa Trust Index
 * Internal credit-profile model: pagoScore.ts (separate, B2B-facing)
 *
 * New signals (v2.1):
 *   + paula_interaction_depth — WhatsApp Paula query count (BC)
 *   + push_notification_engagement — push click-through rate (BC)
 *   + signup_utilization_speed — hours to first payment (ED)
 *   + p2p_network_activity — wallet transfer send count (CF)
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
  // Legacy flat fields (backward compat for old DB rows until monthly recompute)
  payment_streak?:      { score: number; months: number; max: number };
  biller_diversity?:    { score: number; count: number;  max: number };
  kyc_verified?:        { score: number; verified: boolean; max: number };
  wallet_balance?:      { score: number; avg_balance_mxn: number; max: number };
  load_spend_ratio?:    { score: number; ratio: number;  max: number };
  account_age?:         { score: number; days: number;   max: number };
}

export const PTI_MODEL_VERSION = "v2.1-4dim";

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
  // Low std-dev across payment DOMs = proactive, scheduled payer.
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
  const payCount    = Number(domR?.pay_count    ?? 0);
  const domStddev   = Number(domR?.dom_stddev   ?? 15);
  const dominantDay = Number(domR?.dominant_day ?? 0);
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

  // 2a. Session cadence — max 5pts (reduced from 8 to make room for new signals)
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
  if      (loginDays30 >= 20) sessionCadenceScore = 5;
  else if (loginDays30 >= 12) sessionCadenceScore = 4;
  else if (loginDays30 >= 6)  sessionCadenceScore = 3;
  else if (loginDays30 >= 2)  sessionCadenceScore = 1;
  if (loginDays30 >= 4 && hourStd <= 3) sessionCadenceScore = Math.min(5, sessionCadenceScore + 1);

  // 2b. Game & mission engagement — max 5pts (reduced from 7)
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
  if      (totalEngagement >= 20) gameEngagementScore = 5;
  else if (totalEngagement >= 10) gameEngagementScore = 4;
  else if (totalEngagement >= 4)  gameEngagementScore = 2;
  else if (totalEngagement >= 1)  gameEngagementScore = 1;

  // 2c. Wallet load rhythm — max 3pts (reduced from 5)
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
    if      (loadDayStd <= 3)  loadRhythmScore = 3;
    else if (loadDayStd <= 7)  loadRhythmScore = 2;
    else                       loadRhythmScore = 1;
  }

  // 2d. Paula WhatsApp interaction depth — max 4pts (NEW v2.1)
  // Measures engagement with the AI assistant: bill queries, balance checks, 2FA completions.
  const paulaRow = await db.execute(sql`
    SELECT
      COUNT(*) FILTER (WHERE event_type = 'paula_interaction')::int     AS interactions,
      COUNT(*) FILTER (WHERE event_type = 'paula_2fa_confirmed')::int   AS confirmed_2fa,
      COUNT(*) FILTER (WHERE event_type = 'paula_2fa_declined')::int    AS declined_2fa
    FROM user_events
    WHERE telefono = ${telefono}
      AND event_type IN ('paula_interaction', 'paula_2fa_confirmed', 'paula_2fa_declined')
      AND created_at > NOW() - INTERVAL '30 days'
  `);
  const pr2 = paulaRow.rows[0] as Record<string,unknown>;
  const paulaInteractions = Number(pr2?.interactions   ?? 0);
  const confirmed2fa      = Number(pr2?.confirmed_2fa  ?? 0);
  const declined2fa       = Number(pr2?.declined_2fa   ?? 0);
  // Interaction volume + 2FA success rate bonus
  let paulaScore = 0;
  if      (paulaInteractions >= 15) paulaScore = 3;
  else if (paulaInteractions >= 6)  paulaScore = 2;
  else if (paulaInteractions >= 2)  paulaScore = 1;
  // 2FA completion bonus: high confirmation rate = trust signal
  if (confirmed2fa >= 2 && (declined2fa === 0 || confirmed2fa / (confirmed2fa + declined2fa) >= 0.7)) {
    paulaScore = Math.min(4, paulaScore + 1);
  }

  // 2e. Push notification engagement — max 3pts (NEW v2.1)
  // Users who open push notifications are more habitual — higher retention signal.
  const pushRow = await db.execute(sql`
    SELECT COUNT(*)::int AS push_opens
    FROM user_events
    WHERE telefono = ${telefono}
      AND event_type = 'push_opened'
      AND created_at > NOW() - INTERVAL '30 days'
  `);
  const pushOpens = Number((pushRow.rows[0] as Record<string,unknown>)?.push_opens ?? 0);
  let pushScore = 0;
  if      (pushOpens >= 8) pushScore = 3;
  else if (pushOpens >= 4) pushScore = 2;
  else if (pushOpens >= 1) pushScore = 1;

  const bcScore = sessionCadenceScore + gameEngagementScore + loadRhythmScore + paulaScore + pushScore;

  // ══════════════════════════════════════════════════════════════════════════
  // DIMENSION 3: ENGAGEMENT DEPTH — max 25pts
  // ══════════════════════════════════════════════════════════════════════════

  // 3a. Biller diversity — max 8pts (reduced from 10 to make room for signup speed)
  const billerRow = await db.execute(sql`
    SELECT COUNT(DISTINCT service_id)::int AS biller_count
    FROM bill_payments
    WHERE telefono = ${telefono}
      AND status IN ('completed','success','completed_ok','confirmed')
  `);
  const billerCount = Number((billerRow.rows[0] as Record<string,unknown>)?.biller_count ?? 0);
  const billerDiversityScore = Math.min(8, billerCount * 2);

  // 3b. KYC verified — max 10pts
  const kycRow = await db.execute(sql`
    SELECT kyc_submitted_at IS NOT NULL AS verified, kyc_tier
    FROM users WHERE telefono = ${telefono} LIMIT 1
  `);
  const kycR       = kycRow.rows[0] as Record<string,unknown>;
  const kycVerified = Boolean(kycR?.verified);
  const kycTier    = String(kycR?.kyc_tier ?? "simplified");
  let kycScore = 0;
  if (kycVerified && kycTier === "full") kycScore = 10;
  else if (kycVerified)                  kycScore = 7;

  // 3c. Spend category mix — max 4pts (reduced from 5)
  // Utility % signals responsible service prioritization.
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
  if      (utilityRatio >= 0.6) spendCategoryScore = 4;
  else if (utilityRatio >= 0.4) spendCategoryScore = 3;
  else if (utilityRatio >= 0.2) spendCategoryScore = 1;

  // Pago Seguro / high-value intent signals (cross-platform behavioral data)
  const intentRow = await db.execute(sql`
    SELECT COUNT(*)::int AS intent_clicks
    FROM user_events
    WHERE telefono = ${telefono}
      AND event_type IN ('pago_seguro_click', 'high_value_intent_click')
  `);
  const intentClicks = Number((intentRow.rows[0] as Record<string,unknown>)?.intent_clicks ?? 0);
  if (intentClicks >= 1) spendCategoryScore = Math.min(4, spendCategoryScore + 1);

  // 3d. Signup bonus utilization speed — max 3pts (NEW v2.1)
  // Hours from registration to first completed payment.
  // Fast utilization = immediate financial intent, not just bonus-hunting.
  const speedRow = await db.execute(sql`
    SELECT
      EXTRACT(EPOCH FROM (MIN(bp.created_at) - u.created_at)) / 3600 AS hours_to_first_payment
    FROM users u
    LEFT JOIN bill_payments bp ON bp.telefono = u.telefono
      AND bp.status IN ('completed','success','completed_ok','confirmed')
    WHERE u.telefono = ${telefono}
    GROUP BY u.created_at
  `);
  const hoursToFirst = Number((speedRow.rows[0] as Record<string,unknown>)?.hours_to_first_payment ?? null);
  let signupSpeedScore = 0;
  if (!isNaN(hoursToFirst) && hoursToFirst > 0) {
    if      (hoursToFirst <= 6)   signupSpeedScore = 3;
    else if (hoursToFirst <= 24)  signupSpeedScore = 2;
    else if (hoursToFirst <= 72)  signupSpeedScore = 1;
  }

  const edScore = billerDiversityScore + kycScore + spendCategoryScore + signupSpeedScore;

  // ══════════════════════════════════════════════════════════════════════════
  // DIMENSION 4: CASH-FLOW STABILITY — max 25pts
  // ══════════════════════════════════════════════════════════════════════════

  // 4a. Wallet balance — max 10pts (reduced from 12)
  const balanceRow = await db.execute(sql`
    SELECT COALESCE(balance_mxn, 0) AS balance
    FROM wallets WHERE user_id = ${telefono} LIMIT 1
  `);
  const currentBalance = Number((balanceRow.rows[0] as Record<string,unknown>)?.balance ?? 0);
  let walletScore = 0;
  if      (currentBalance >= 500) walletScore = 10;
  else if (currentBalance >= 200) walletScore = 7;
  else if (currentBalance >= 50)  walletScore = 3;

  // 4b. Load/spend ratio (last 90 days) — max 7pts (reduced from 8)
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
    if      (loadSpendRatio >= 1.0) loadSpendScore = 7;
    else if (loadSpendRatio >= 0.7) loadSpendScore = 5;
    else if (loadSpendRatio >= 0.4) loadSpendScore = 3;
  }

  // 4c. P2P network activity — max 3pts (NEW v2.1)
  // Wallet-to-wallet transfers signal financial network embeddedness.
  // Sender_telefono is stored via wallets.user_id JOIN; type = 'transfer_send'.
  const p2pRow = await db.execute(sql`
    SELECT
      COUNT(DISTINCT wt.id)::int AS send_count,
      COUNT(DISTINCT SUBSTRING(wt.description FROM 'Enviado a (\\S+)'))::int AS recipient_diversity
    FROM wallet_transactions wt
    JOIN wallets w ON wt.wallet_id = w.id
    WHERE w.user_id = ${telefono}
      AND wt.type = 'transfer_send'
      AND wt.status = 'confirmed'
      AND wt.created_at > NOW() - INTERVAL '90 days'
  `);
  const p2pr = p2pRow.rows[0] as Record<string,unknown>;
  const p2pSendCount      = Number(p2pr?.send_count         ?? 0);
  const p2pRecipientCount = Number(p2pr?.recipient_diversity ?? 0);
  let p2pScore = 0;
  if      (p2pSendCount >= 5 && p2pRecipientCount >= 3) p2pScore = 3;
  else if (p2pSendCount >= 3 && p2pRecipientCount >= 2) p2pScore = 2;
  else if (p2pSendCount >= 1)                           p2pScore = 1;

  // 4d. Account age — max 5pts
  const ageRow = await db.execute(sql`
    SELECT EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400 AS days_old
    FROM users WHERE telefono = ${telefono} LIMIT 1
  `);
  const daysOld = Number((ageRow.rows[0] as Record<string,unknown>)?.days_old ?? 0);
  let accountAgeScore = 0;
  if      (daysOld >= 90) accountAgeScore = 5;
  else if (daysOld >= 30) accountAgeScore = 3;
  else if (daysOld >= 7)  accountAgeScore = 2;

  const cfScore = walletScore + loadSpendScore + p2pScore + accountAgeScore;

  // ── Total ─────────────────────────────────────────────────────────────────
  const total = Math.min(100, prScore + bcScore + edScore + cfScore);

  // ── Build structured breakdown ────────────────────────────────────────────
  const breakdown: PTIBreakdown = {
    payment_reliability: {
      score: prScore, max: 30, label: "Fiabilidad de Pago",
      components: {
        payment_streak:           { score: paymentStreakScore, max: 20, value: streakMonths },
        payment_day_consistency:  { score: payDayConsistency,  max: 10, value: dominantDay },
      },
    },
    behavioral_consistency: {
      score: bcScore, max: 20, label: "Consistencia de Comportamiento",
      components: {
        session_cadence:            { score: sessionCadenceScore, max: 5, value: loginDays30 },
        game_engagement:            { score: gameEngagementScore, max: 5, value: totalEngagement },
        wallet_load_rhythm:         { score: loadRhythmScore,     max: 3, value: loadCount30 },
        paula_interaction_depth:    { score: paulaScore,          max: 4, value: paulaInteractions },
        push_notification_engagement: { score: pushScore,         max: 3, value: pushOpens },
      },
    },
    engagement_depth: {
      score: edScore, max: 25, label: "Profundidad de Uso",
      components: {
        biller_diversity:       { score: billerDiversityScore, max: 8,  value: billerCount },
        kyc_verified:           { score: kycScore,             max: 10, value: kycVerified },
        spend_category_mix:     { score: spendCategoryScore,   max: 4,  value: Math.round(utilityRatio * 100) },
        signup_utilization_speed: { score: signupSpeedScore,   max: 3,  value: isNaN(hoursToFirst) ? 0 : Math.floor(hoursToFirst) },
      },
    },
    cashflow_stability: {
      score: cfScore, max: 25, label: "Estabilidad de Flujo",
      components: {
        wallet_balance:     { score: walletScore,    max: 10, value: currentBalance },
        load_spend_ratio:   { score: loadSpendScore, max: 7,  value: Math.round(loadSpendRatio * 100) / 100 },
        p2p_network_activity: { score: p2pScore,     max: 3,  value: p2pSendCount },
        account_age:        { score: accountAgeScore, max: 5, value: Math.floor(daysOld) },
      },
    },
    total,
    model_version: PTI_MODEL_VERSION,
    // Legacy flat fields
    payment_streak:   { score: paymentStreakScore, months: streakMonths, max: 20 },
    biller_diversity: { score: billerDiversityScore, count: billerCount, max: 8 },
    kyc_verified:     { score: kycScore, verified: kycVerified, max: 10 },
    wallet_balance:   { score: walletScore, avg_balance_mxn: currentBalance, max: 10 },
    load_spend_ratio: { score: loadSpendScore, ratio: Math.round(loadSpendRatio * 100) / 100, max: 7 },
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

  // ── Persist dimension scores to behavioral signals audit table ────────────
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
      ${loadCount30}, ${loadDayStd}, ${utilityRatio}, ${intentClicks},
      ${prScore}, ${bcScore}, ${edScore}, ${cfScore}
    )
  `).catch(err => logger.warn({ err, telefono }, "pti: behavioral signals persist failed — continuing"));

  return breakdown;
}

/** Monthly batch: recompute PTI for all users + send WhatsApp notification */
export async function computePTIForAllUsers(): Promise<void> {
  const { db } = await import("@workspace/db");
  const startedAt = Date.now();
  logger.info("[PTI Monthly] Starting monthly PTI computation (v2.1-4dim)...");

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
  const dims = [
    { name: "pr", score: bd.payment_reliability.score    / bd.payment_reliability.max },
    { name: "bc", score: bd.behavioral_consistency.score / bd.behavioral_consistency.max },
    { name: "ed", score: bd.engagement_depth.score       / bd.engagement_depth.max },
    { name: "cf", score: bd.cashflow_stability.score     / bd.cashflow_stability.max },
  ].sort((a, b) => a.score - b.score);

  switch (dims[0].name) {
    case "pr": return "💡 Sigue pagando cada mes en las mismas fechas para mejorar tu racha.";
    case "bc": return "💡 Abre la app regularmente, habla con Paula o juega Raspa y Gana.";
    case "ed": return "💡 Verifica tu identidad en la app para ganar más puntos de perfil.";
    case "cf": return "💡 Mantén saldo en tu billetera para mejorar tu estabilidad financiera.";
    default:   return "🌟 ¡Excelente historial! Sigue así.";
  }
}
