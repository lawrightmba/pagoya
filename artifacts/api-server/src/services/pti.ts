/**
 * PTI Service — Predictive Trust Index (4-Dimension behavioral credit model)
 *
 * Four dimensions map directly to the B2B Alternative Data product:
 *   PR — Payment Reliability    (30pts)  strongest signal for lenders
 *   BC — Behavioral Consistency (20pts)  engagement cadence & stability
 *   ED — Engagement Depth       (25pts)  platform integration & identity
 *   CF — Cash-Flow Stability    (25pts)  balance management & load patterns
 *
 * Model version: v2.1-4dim
 * User-facing label: Predictive Trust Index
 * Internal credit-profile model: pagoScore.ts (separate, B2B-facing)
 *
 * New signals (v2.1):
 *   + paula_interaction_depth — WhatsApp Paula query count (BC)
 *   + push_notification_engagement — push click-through rate (BC)
 *   + signup_utilization_speed — hours to first payment (ED)
 *   + p2p_network_activity — wallet transfer send count (CF)
 *
 * New signals (v4.1 — Sprint 2, July 2026):
 *   + bancarization_speed — days from signup to first SPEI (bank transfer)
 *     wallet load. Our single most compelling proprietary signal for lenders:
 *     it measures how fast an unbanked user adopts formal banking rails. (CF)
 *   + funding_channel_mix — ratio of bank-based (SPEI/card) vs. cash-based
 *     (OXXO) wallet loads, i.e. progression away from cash dependency. (CF)
 *   NOTE: colonia and declared_income_bucket were deliberately EXCLUDED from
 *   scoring (fair-lending risk of geography/income-based credit signals).
 *   They remain available for B2B context/segmentation only, never scoring.
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
  confidence?: PTIConfidence;
  // Legacy flat fields (backward compat for old DB rows until monthly recompute)
  payment_streak?:      { score: number; months: number; max: number };
  biller_diversity?:    { score: number; count: number;  max: number };
  kyc_verified?:        { score: number; verified: boolean; max: number };
  wallet_balance?:      { score: number; avg_balance_mxn: number; max: number };
  load_spend_ratio?:    { score: number; ratio: number;  max: number };
  account_age?:         { score: number; days: number;   max: number };
}

/**
 * PTIDataSnapshot — the complete set of raw behavioral inputs the 4-dimension
 * scoring model needs. This is what makes the engine portable: any caller
 * (PagoYa's own DB, PagoSeguro, a partner sending synthetic/demo data) can
 * build one of these and get a real score back with zero PagoYa DB access.
 *
 * `computePTIForUser` (below) is just one producer of this snapshot — it reads
 * PagoYa's Postgres tables and fills these fields. A standalone/demo caller
 * fills them from whatever data it has (or from synthetic test fixtures).
 */
export interface PTIDataSnapshot {
  // Payment Reliability inputs
  streakMonths: number;          // consecutive months with ≥1 completed payment
  payCount: number;              // confirmed payments in the last 6 months
  domStddev: number;             // stddev of day-of-month payments land on
  dominantDay: number;           // most common day-of-month for payments
  advanceDays: number;           // avg days paid before due date
  selfRatio: number;             // 0–1, ratio of self-initiated vs. reminder-triggered payments

  // Behavioral Consistency inputs
  loginDays30: number;           // distinct login days in last 30 days
  hourStd: number;               // stddev of login hour-of-day
  scratchPlays: number;
  spinPlays: number;
  missionsDone: number;
  loadCount30: number;           // wallet loads in last 90 days (var name kept for back-compat)
  loadDayStd: number;            // stddev of days between wallet loads
  paulaInteractions: number;     // WhatsApp Paula interactions in last 30 days
  confirmed2fa: number;
  declined2fa: number;
  pushOpens: number;             // push notification opens in last 30 days
  curiosityIndex: number;        // 0–1, ratio of proactive financial-literacy Paula topics

  // Engagement Depth inputs
  billerCount: number;           // distinct billers ever paid
  kycVerified: boolean;
  kycTier: string;               // "simplified" | "full"
  utilityRatio: number;          // 0–1, ratio of payments that are essential utilities
  intentClicks: number;          // PagoSeguro / high-value-intent click events
  hoursToFirst: number;          // hours from signup to first payment (NaN if never paid)
  deviceScore: number;           // 0–100, device tenure/consistency score

  // Cash-Flow Stability inputs
  currentBalance: number;        // current wallet balance, MXN
  totalLoads: number;            // wallet loads in last 90 days, MXN
  totalSpend: number;            // bill payments in last 90 days, MXN
  amountCV: number;              // coefficient of variation across payment amounts
  p2pSendCount: number;          // P2P transfers sent in last 90 days
  p2pRecipientCount: number;     // distinct P2P recipients in last 90 days
  daysOld: number;               // account age in days
  daysToFirstSpei: number;       // days from signup to first SPEI load (NaN if never)
  oxxoLoadCount: number;         // lifetime cash-based (OXXO) wallet loads
  speiLoadCount: number;         // lifetime bank-transfer (SPEI) wallet loads
  cardLoadCount: number;         // lifetime card wallet loads
}

export interface PTIConfidence {
  level: "high" | "medium" | "low";
  score: number;       // 0–1, continuous data-sufficiency signal
  reasons: string[];   // human-readable notes on what's limiting confidence
}

/**
 * Computes a confidence rating for a PTI score based on how much real
 * behavioral data backs it up. A score of 45 built on 90 days of consistent
 * payment history means something very different from a score of 45 built
 * on 3 days of account age with zero payments — lenders need to know which.
 */
export function computePTIConfidence(snapshot: PTIDataSnapshot): PTIConfidence {
  const reasons: string[] = [];

  const paymentDepth = Math.min(snapshot.payCount / 3, 1);
  const tenureDepth   = Math.min(snapshot.daysOld / 30, 1);
  const activityDepth = Math.min(snapshot.loginDays30 / 4, 1);

  const score = Math.round((0.5 * paymentDepth + 0.3 * tenureDepth + 0.2 * activityDepth) * 100) / 100;

  if (snapshot.payCount === 0) {
    reasons.push("No confirmed payments yet — payment reliability sub-scores requiring ≥3 payments are gated to zero, not truly low.");
  } else if (snapshot.payCount < 3) {
    reasons.push(`Only ${snapshot.payCount} confirmed payment(s) — several payment reliability signals require 3+ to activate.`);
  }
  if (snapshot.daysOld < 30) {
    reasons.push(`Account is ${Math.floor(snapshot.daysOld)} day(s) old — score may shift materially as tenure accrues.`);
  }
  if (snapshot.loginDays30 === 0) {
    reasons.push("No activity in the last 30 days — behavioral consistency dimension is uninformative.");
  }

  let level: PTIConfidence["level"];
  if (snapshot.payCount >= 3 && snapshot.daysOld >= 30 && snapshot.loginDays30 >= 4) {
    level = "high";
  } else if (snapshot.payCount === 0 && snapshot.daysOld < 7) {
    level = "low";
  } else {
    level = "medium";
  }

  if (reasons.length === 0) {
    reasons.push("Sufficient payment history, account tenure, and recent activity to trust this score.");
  }

  return { level, score, reasons };
}

/**
 * Pure scoring function — no I/O, no DB access. Given a complete data
 * snapshot, deterministically computes the 4-dimension PTI breakdown plus a
 * confidence rating. This is the portable core of the engine: it is exactly
 * what `computePTIForUser` runs internally, and exactly what an external
 * partner/demo caller can run with their own data.
 */
export function computePTI(snapshot: PTIDataSnapshot): { breakdown: PTIBreakdown; confidence: PTIConfidence } {
  const {
    streakMonths, payCount, domStddev, dominantDay, advanceDays, selfRatio,
    loginDays30, hourStd, scratchPlays, spinPlays, missionsDone, loadCount30, loadDayStd,
    paulaInteractions, confirmed2fa, declined2fa, pushOpens, curiosityIndex,
    billerCount, kycVerified, kycTier, utilityRatio, intentClicks, hoursToFirst, deviceScore,
    currentBalance, totalLoads, totalSpend, amountCV, p2pSendCount, p2pRecipientCount, daysOld,
    daysToFirstSpei, oxxoLoadCount, speiLoadCount, cardLoadCount,
  } = snapshot;

  // ══════════════════════════════════════════════════════════════════════════
  // DIMENSION 1: PAYMENT RELIABILITY — max 30pts (v4.0-behavioral)
  // ══════════════════════════════════════════════════════════════════════════

  // 1a. Payment streak — max 13pts
  const paymentStreakScore = Math.min(13, streakMonths);

  // 1b. Payment day consistency — max 4pts
  let payDayConsistency = 0;
  if (payCount >= 3) {
    if      (domStddev <= 2)  payDayConsistency = 4;
    else if (domStddev <= 5)  payDayConsistency = 3;
    else if (domStddev <= 8)  payDayConsistency = 2;
    else if (domStddev <= 12) payDayConsistency = 1;
  }

  // 1c. Advance payment days — max 8pts
  let advancePayScore = 0;
  if (payCount >= 3) {
    if      (advanceDays >= 7) advancePayScore = 8;
    else if (advanceDays >= 4) advancePayScore = 6;
    else if (advanceDays >= 2) advancePayScore = 4;
    else if (advanceDays >= 1) advancePayScore = 2;
  }

  // 1d. Self-initiated ratio — max 5pts
  let selfInitScore = 0;
  if (payCount >= 3) {
    if      (selfRatio >= 0.9) selfInitScore = 5;
    else if (selfRatio >= 0.7) selfInitScore = 4;
    else if (selfRatio >= 0.5) selfInitScore = 3;
    else if (selfRatio >= 0.3) selfInitScore = 1;
  }

  const prScore = paymentStreakScore + payDayConsistency + advancePayScore + selfInitScore;

  // ══════════════════════════════════════════════════════════════════════════
  // DIMENSION 2: BEHAVIORAL CONSISTENCY — max 20pts
  // ══════════════════════════════════════════════════════════════════════════

  // 2a. Session cadence — max 3pts
  let sessionCadenceScore = 0;
  if      (loginDays30 >= 20) sessionCadenceScore = 3;
  else if (loginDays30 >= 12) sessionCadenceScore = 2;
  else if (loginDays30 >= 4)  sessionCadenceScore = 1;

  // 2b. Routine score composite — max 3pts
  let routineScore = 0;
  {
    const hourNorm = Math.max(0, 1 - hourStd / 12);
    const domNorm  = Math.max(0, 1 - domStddev / 15);
    const routineRaw = (hourNorm + domNorm) / 2;
    if      (routineRaw >= 0.70) routineScore = 3;
    else if (routineRaw >= 0.50) routineScore = 2;
    else if (routineRaw >= 0.30) routineScore = 1;
  }

  // 2c. Game & mission engagement — max 3pts
  const totalEngagement = scratchPlays + spinPlays + (missionsDone * 2);
  let gameEngagementScore = 0;
  if      (totalEngagement >= 20) gameEngagementScore = 3;
  else if (totalEngagement >= 8)  gameEngagementScore = 2;
  else if (totalEngagement >= 2)  gameEngagementScore = 1;

  // 2d. Wallet load rhythm — max 2pts
  let loadRhythmScore = 0;
  if (loadCount30 >= 3) {
    if      (loadDayStd <= 3) loadRhythmScore = 2;
    else if (loadDayStd <= 7) loadRhythmScore = 1;
  }

  // 2e. Paula WhatsApp interaction depth — max 3pts
  let paulaScore = 0;
  if      (paulaInteractions >= 15) paulaScore = 2;
  else if (paulaInteractions >= 4)  paulaScore = 1;
  if (confirmed2fa >= 2 && (declined2fa === 0 || confirmed2fa / (confirmed2fa + declined2fa) >= 0.7)) {
    paulaScore = Math.min(3, paulaScore + 1);
  }

  // 2f. Push notification engagement — max 2pts
  let pushScore = 0;
  if      (pushOpens >= 6) pushScore = 2;
  else if (pushOpens >= 2) pushScore = 1;

  // 2g. Financial curiosity index — max 4pts
  let curiosityScore = 0;
  if      (curiosityIndex >= 0.20) curiosityScore = 4;
  else if (curiosityIndex >= 0.10) curiosityScore = 3;
  else if (curiosityIndex >= 0.05) curiosityScore = 2;
  else if (curiosityIndex >= 0.02) curiosityScore = 1;

  const bcScore = sessionCadenceScore + routineScore + gameEngagementScore + loadRhythmScore
                + paulaScore + pushScore + curiosityScore;

  // ══════════════════════════════════════════════════════════════════════════
  // DIMENSION 3: ENGAGEMENT DEPTH — max 25pts
  // ══════════════════════════════════════════════════════════════════════════

  // 3a. Biller diversity — max 6pts
  const billerDiversityScore = Math.min(6, Math.floor(billerCount * 1.5));

  // 3b. KYC verified — max 10pts
  let kycScore = 0;
  if (kycVerified && kycTier === "full") kycScore = 10;
  else if (kycVerified)                  kycScore = 7;

  // 3c. Spend category mix — max 4pts
  let spendCategoryScore = 0;
  if      (utilityRatio >= 0.6) spendCategoryScore = 4;
  else if (utilityRatio >= 0.4) spendCategoryScore = 3;
  else if (utilityRatio >= 0.2) spendCategoryScore = 1;
  if (intentClicks >= 1) spendCategoryScore = Math.min(4, spendCategoryScore + 1);

  // 3d. Signup utilization speed — max 2pts
  let signupSpeedScore = 0;
  if (!isNaN(hoursToFirst) && hoursToFirst > 0) {
    if      (hoursToFirst <= 12)  signupSpeedScore = 2;
    else if (hoursToFirst <= 72)  signupSpeedScore = 1;
  }

  // 3e. Device consistency — max 3pts
  let deviceConsistencyScore = 0;
  if      (deviceScore >= 80) deviceConsistencyScore = 3;
  else if (deviceScore >= 50) deviceConsistencyScore = 2;
  else if (deviceScore >= 20) deviceConsistencyScore = 1;

  const edScore = billerDiversityScore + kycScore + spendCategoryScore + signupSpeedScore + deviceConsistencyScore;

  // ══════════════════════════════════════════════════════════════════════════
  // DIMENSION 4: CASH-FLOW STABILITY — max 25pts
  // ══════════════════════════════════════════════════════════════════════════

  // 4a. Wallet balance — max 8pts
  let walletScore = 0;
  if      (currentBalance >= 500) walletScore = 8;
  else if (currentBalance >= 200) walletScore = 5;
  else if (currentBalance >= 50)  walletScore = 3;

  // 4b. Load/spend ratio (last 90 days) — max 4pts
  let loadSpendRatio = 0;
  let loadSpendScore = 0;
  if (totalLoads > 0 && totalSpend > 0) {
    loadSpendRatio = totalLoads / totalSpend;
    if      (loadSpendRatio >= 1.0) loadSpendScore = 4;
    else if (loadSpendRatio >= 0.7) loadSpendScore = 2;
    else if (loadSpendRatio >= 0.4) loadSpendScore = 1;
  }

  // 4c. Payment amount volatility — max 3pts
  let volatilityScore = 0;
  if (payCount >= 2) {
    if      (amountCV <= 0.10) volatilityScore = 3;
    else if (amountCV <= 0.25) volatilityScore = 2;
    else if (amountCV <= 0.50) volatilityScore = 1;
  }

  // 4d. P2P network activity — max 3pts
  let p2pScore = 0;
  if      (p2pSendCount >= 5 && p2pRecipientCount >= 3) p2pScore = 3;
  else if (p2pSendCount >= 3 && p2pRecipientCount >= 2) p2pScore = 2;
  else if (p2pSendCount >= 1)                           p2pScore = 1;

  // 4e. Account age — max 2pts
  let accountAgeScore = 0;
  if      (daysOld >= 90) accountAgeScore = 2;
  else if (daysOld >= 30) accountAgeScore = 1;

  // 4f. Bancarization speed — max 3pts (NEW v4.1)
  // Days from signup to first SPEI (bank transfer) load. Rewards fast
  // adoption of formal banking rails — our strongest proprietary B2B signal.
  let bancarizationScore = 0;
  if (!isNaN(daysToFirstSpei)) {
    if      (daysToFirstSpei <= 7)  bancarizationScore = 3;
    else if (daysToFirstSpei <= 30) bancarizationScore = 2;
    else if (daysToFirstSpei <= 90) bancarizationScore = 1;
  }

  // 4g. Funding channel mix — max 2pts (NEW v4.1)
  // Ratio of bank-based (SPEI + card) vs. total wallet loads — measures
  // progression away from cash (OXXO) dependency toward formal banking rails.
  let fundingMixScore = 0;
  let fundingMixRatio = 0;
  const totalLoadEvents = oxxoLoadCount + speiLoadCount + cardLoadCount;
  if (totalLoadEvents > 0) {
    fundingMixRatio = (speiLoadCount + cardLoadCount) / totalLoadEvents;
    if      (fundingMixRatio >= 0.75) fundingMixScore = 2;
    else if (fundingMixRatio >= 0.40) fundingMixScore = 1;
  }

  const cfScore = walletScore + loadSpendScore + volatilityScore + p2pScore + accountAgeScore
                + bancarizationScore + fundingMixScore;

  // ── Total ─────────────────────────────────────────────────────────────────
  const total = Math.min(100, prScore + bcScore + edScore + cfScore);

  // ── Build structured breakdown ────────────────────────────────────────────
  const confidence = computePTIConfidence(snapshot);

  const breakdown: PTIBreakdown = {
    payment_reliability: {
      score: prScore, max: 30, label: "Fiabilidad de Pago",
      components: {
        payment_streak:          { score: paymentStreakScore, max: 13, value: streakMonths },
        payment_day_consistency: { score: payDayConsistency,  max: 4,  value: dominantDay },
        advance_payment_days:    { score: advancePayScore,    max: 8,  value: Math.round(advanceDays * 10) / 10 },
        self_initiated_ratio:    { score: selfInitScore,      max: 5,  value: Math.round(selfRatio * 100) },
      },
    },
    behavioral_consistency: {
      score: bcScore, max: 20, label: "Consistencia de Comportamiento",
      components: {
        session_cadence:              { score: sessionCadenceScore, max: 3, value: loginDays30 },
        routine_score:                { score: routineScore,        max: 3, value: Math.round((1 - hourStd / 12) * 100) },
        game_engagement:              { score: gameEngagementScore, max: 3, value: totalEngagement },
        wallet_load_rhythm:           { score: loadRhythmScore,     max: 2, value: loadCount30 },
        paula_interaction_depth:      { score: paulaScore,          max: 3, value: paulaInteractions },
        push_notification_engagement: { score: pushScore,           max: 2, value: pushOpens },
        financial_curiosity_index:    { score: curiosityScore,      max: 4, value: Math.round(curiosityIndex * 100) },
      },
    },
    engagement_depth: {
      score: edScore, max: 25, label: "Profundidad de Uso",
      components: {
        biller_diversity:         { score: billerDiversityScore,    max: 6,  value: billerCount },
        kyc_verified:             { score: kycScore,                max: 10, value: kycVerified },
        spend_category_mix:       { score: spendCategoryScore,      max: 4,  value: Math.round(utilityRatio * 100) },
        signup_utilization_speed: { score: signupSpeedScore,        max: 2,  value: isNaN(hoursToFirst) ? 0 : Math.floor(hoursToFirst) },
        device_consistency:       { score: deviceConsistencyScore,  max: 3,  value: deviceScore },
      },
    },
    cashflow_stability: {
      score: cfScore, max: 25, label: "Estabilidad de Flujo",
      components: {
        wallet_balance:           { score: walletScore,        max: 8, value: currentBalance },
        load_spend_ratio:         { score: loadSpendScore,     max: 4, value: Math.round(loadSpendRatio * 100) / 100 },
        payment_amount_volatility:{ score: volatilityScore,    max: 3, value: Math.round(amountCV * 100) / 100 },
        p2p_network_activity:     { score: p2pScore,           max: 3, value: p2pSendCount },
        account_age:              { score: accountAgeScore,    max: 2, value: Math.floor(daysOld) },
        bancarization_speed:      { score: bancarizationScore, max: 3, value: isNaN(daysToFirstSpei) ? -1 : Math.floor(daysToFirstSpei) },
        funding_channel_mix:      { score: fundingMixScore,    max: 2, value: Math.round(fundingMixRatio * 100) },
      },
    },
    total,
    model_version: PTI_MODEL_VERSION,
    confidence,
    // Legacy flat fields (backward compat)
    payment_streak:   { score: paymentStreakScore, months: streakMonths, max: 13 },
    biller_diversity: { score: billerDiversityScore, count: billerCount, max: 6 },
    kyc_verified:     { score: kycScore, verified: kycVerified, max: 10 },
    wallet_balance:   { score: walletScore, avg_balance_mxn: currentBalance, max: 9 },
    load_spend_ratio: { score: loadSpendScore, ratio: Math.round(loadSpendRatio * 100) / 100, max: 5 },
    account_age:      { score: accountAgeScore, days: Math.floor(daysOld), max: 4 },
  };

  return { breakdown, confidence };
}

export const PTI_MODEL_VERSION = "v4.1-behavioral";

export function getPTITier(score: number): { tier: string; color: string; label: string } {
  if (score >= 80) return { tier: "excelente",  color: "#00C875", label: "Excelente" };
  if (score >= 60) return { tier: "bueno",      color: "#007A4A", label: "Bueno" };
  if (score >= 40) return { tier: "en_proceso", color: "#F59E0B", label: "En proceso" };
  return              { tier: "iniciando",       color: "#6B7280", label: "Iniciando" };
}

// ─── Compute PTI for a single user ───────────────────────────────────────────

export async function computePTIForUser(telefono: string): Promise<PTIBreakdown> {
  const { db } = await import("@workspace/db");
  const snapshot = await buildPTISnapshotFromDb(telefono);

  const { breakdown, confidence } = computePTI(snapshot);
  void confidence; // already embedded in breakdown.confidence

  // ── Persist to users table ────────────────────────────────────────────────
  await db.execute(sql`
    UPDATE users SET
      pti_score             = ${breakdown.total},
      pti_breakdown         = ${JSON.stringify(breakdown)}::jsonb,
      pti_computed_at       = NOW(),
      pti_first_computed_at = COALESCE(pti_first_computed_at, NOW())
    WHERE telefono = ${telefono}
  `);

  // ── Log to score history (powers pti_trend_30d view + Paula trend coaching) ─
  await db.execute(sql`
    INSERT INTO pti_score_history (telefono, pti_score, breakdown, recorded_at)
    VALUES (${telefono}, ${breakdown.total}, ${JSON.stringify(breakdown)}::jsonb, NOW())
  `).catch(err => logger.warn({ err, telefono }, "pti: history log failed — continuing"));

  // ── Persist dimension scores to behavioral signals audit table ────────────
  await db.execute(sql`
    INSERT INTO pti_behavioral_signals
      (telefono, computed_at, payment_day_consistency, dominant_payment_day,
       logins_30d, login_cadence_std, game_plays_30d, missions_completed,
       load_count_30d, load_rhythm_std, utility_payment_ratio, pago_seguro_clicks,
       pr_score, bc_score, ed_score, cf_score)
    VALUES (
      ${telefono}, NOW(),
      ${breakdown.payment_reliability.components.payment_day_consistency.score}, ${snapshot.dominantDay},
      ${snapshot.loginDays30}, ${snapshot.hourStd}, ${snapshot.scratchPlays + snapshot.spinPlays}, ${snapshot.missionsDone},
      ${snapshot.loadCount30}, ${snapshot.loadDayStd}, ${snapshot.utilityRatio}, ${snapshot.intentClicks},
      ${breakdown.payment_reliability.score}, ${breakdown.behavioral_consistency.score},
      ${breakdown.engagement_depth.score}, ${breakdown.cashflow_stability.score}
    )
  `).catch(err => logger.warn({ err, telefono }, "pti: behavioral signals persist failed — continuing"));

  return breakdown;
}

/**
 * Fetches all raw behavioral fields PagoYa's Postgres tables hold for a user
 * and assembles them into a portable PTIDataSnapshot. This is the ONLY place
 * in the engine that touches the database — everything downstream of this
 * (computePTI) is pure and works identically for a partner's synthetic data.
 */
async function buildPTISnapshotFromDb(telefono: string): Promise<PTIDataSnapshot> {
  const { db } = await import("@workspace/db");

  // ══════════════════════════════════════════════════════════════════════════
  // DIMENSION 1: PAYMENT RELIABILITY — max 30pts (v4.0-behavioral)
  // ══════════════════════════════════════════════════════════════════════════

  // Fetch pre-computed v4.0 behavioral signals (written nightly by computePTIv3Signals)
  const v4SignalsRow = await db.execute(sql`
    SELECT
      COALESCE(advance_payment_days_avg,   0) AS advance_days,
      COALESCE(self_initiated_ratio,       0) AS self_ratio,
      COALESCE(payment_amount_volatility,  1) AS amount_cv,
      COALESCE(financial_curiosity_index,  0) AS curiosity_idx,
      COALESCE(device_consistency_score,   0) AS device_score,
      COALESCE(recovery_score,             0) AS recovery_sc
    FROM users WHERE telefono = ${telefono} LIMIT 1
  `);
  const v4s            = v4SignalsRow.rows[0] as Record<string,unknown>;
  const advanceDays    = Number(v4s?.advance_days  ?? 0);
  const selfRatio      = Number(v4s?.self_ratio     ?? 0);
  const amountCV       = Number(v4s?.amount_cv      ?? 1);
  const curiosityIndex = Number(v4s?.curiosity_idx  ?? 0);
  const deviceScore    = Number(v4s?.device_score   ?? 0);

  // 1a. Payment streak
  const streakRow = await db.execute(sql`
    SELECT COALESCE(consecutive_payment_months, 0) AS streak_months
    FROM users WHERE telefono = ${telefono} LIMIT 1
  `);
  const streakMonths = Number((streakRow.rows[0] as Record<string,unknown>)?.streak_months ?? 0);

  // 1b. Payment day consistency (last 6 months of confirmed payments)
  const domRow = await db.execute(sql`
    SELECT
      COUNT(*)::int                                               AS pay_count,
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

  // ══════════════════════════════════════════════════════════════════════════
  // DIMENSION 2: BEHAVIORAL CONSISTENCY — raw inputs
  // ══════════════════════════════════════════════════════════════════════════

  // 2a. Session cadence
  const loginRow = await db.execute(sql`
    SELECT
      COUNT(DISTINCT DATE(created_at))::int                        AS login_days,
      COALESCE(STDDEV(EXTRACT(HOUR FROM created_at)), 12)::numeric AS hour_std
    FROM user_events
    WHERE telefono = ${telefono}
      AND event_type = 'login'
      AND created_at > NOW() - INTERVAL '30 days'
  `);
  const lr = loginRow.rows[0] as Record<string,unknown>;
  const loginDays30 = Number(lr?.login_days ?? 0);
  const hourStd     = Number(lr?.hour_std   ?? 12);

  // 2c. Game & mission engagement
  const gameRow = await db.execute(sql`
    SELECT
      COALESCE((SELECT COUNT(*)::int FROM scratch_card_plays    WHERE telefono = ${telefono} AND play_date > CURRENT_DATE - 30), 0) AS scratch_plays,
      COALESCE((SELECT COUNT(*)::int FROM spin_results          WHERE telefono = ${telefono} AND spun_at > NOW() - INTERVAL '30 days'), 0) AS spin_plays,
      COALESCE((SELECT COUNT(*)::int FROM user_mission_progress WHERE telefono = ${telefono} AND completed_at IS NOT NULL), 0) AS missions_done
  `);
  const gr = gameRow.rows[0] as Record<string,unknown>;
  const scratchPlays = Number(gr?.scratch_plays ?? 0);
  const spinPlays    = Number(gr?.spin_plays    ?? 0);
  const missionsDone = Number(gr?.missions_done ?? 0);

  // 2d. Wallet load rhythm (last 90 days)
  const loadRhythmRow = await db.execute(sql`
    SELECT
      COUNT(*)::int                                                         AS load_count,
      COALESCE(STDDEV(EXTRACT(EPOCH FROM wt.created_at) / 86400.0), 30)::numeric AS load_day_std
    FROM wallet_transactions wt
    JOIN wallets w ON wt.wallet_id = w.id
    WHERE w.user_id = ${telefono}
      AND wt.type IN ('load_card','load_oxxo','spei_in','load_spei','spei_in')
      AND wt.status = 'confirmed'
      AND wt.created_at > NOW() - INTERVAL '90 days'
  `);
  const rhr = loadRhythmRow.rows[0] as Record<string,unknown>;
  const loadCount30 = Number(rhr?.load_count   ?? 0);
  const loadDayStd  = Number(rhr?.load_day_std ?? 30);

  // 2e. Paula WhatsApp interaction depth
  const paulaRow = await db.execute(sql`
    SELECT
      COUNT(*) FILTER (WHERE event_type = 'paula_interaction')::int   AS interactions,
      COUNT(*) FILTER (WHERE event_type = 'paula_2fa_confirmed')::int AS confirmed_2fa,
      COUNT(*) FILTER (WHERE event_type = 'paula_2fa_declined')::int  AS declined_2fa
    FROM user_events
    WHERE telefono = ${telefono}
      AND event_type IN ('paula_interaction', 'paula_2fa_confirmed', 'paula_2fa_declined')
      AND created_at > NOW() - INTERVAL '30 days'
  `);
  const pr2 = paulaRow.rows[0] as Record<string,unknown>;
  const paulaInteractions = Number(pr2?.interactions  ?? 0);
  const confirmed2fa      = Number(pr2?.confirmed_2fa ?? 0);
  const declined2fa       = Number(pr2?.declined_2fa  ?? 0);

  // 2f. Push notification engagement
  const pushRow = await db.execute(sql`
    SELECT COUNT(*)::int AS push_opens
    FROM user_events
    WHERE telefono = ${telefono}
      AND event_type = 'push_opened'
      AND created_at > NOW() - INTERVAL '30 days'
  `);
  const pushOpens = Number((pushRow.rows[0] as Record<string,unknown>)?.push_opens ?? 0);

  // ══════════════════════════════════════════════════════════════════════════
  // DIMENSION 3: ENGAGEMENT DEPTH — raw inputs
  // ══════════════════════════════════════════════════════════════════════════

  // 3a. Biller diversity
  const billerRow = await db.execute(sql`
    SELECT COUNT(DISTINCT service_id)::int AS biller_count
    FROM bill_payments
    WHERE telefono = ${telefono}
      AND status IN ('completed','success','completed_ok','confirmed')
  `);
  const billerCount = Number((billerRow.rows[0] as Record<string,unknown>)?.biller_count ?? 0);

  // 3b. KYC verified
  const kycRow = await db.execute(sql`
    SELECT kyc_submitted_at IS NOT NULL AS verified, kyc_tier
    FROM users WHERE telefono = ${telefono} LIMIT 1
  `);
  const kycR       = kycRow.rows[0] as Record<string,unknown>;
  const kycVerified = Boolean(kycR?.verified);
  const kycTier    = String(kycR?.kyc_tier ?? "simplified");

  // 3c. Spend category mix — utility % signals responsible service prioritization
  const categoryRow = await db.execute(sql`
    SELECT
      COUNT(*) FILTER (WHERE COALESCE(service_name,'') ILIKE ANY(ARRAY['%cfe%','%luz%','%agua%','%sacmex%','%seapal%','%gas%','%naturgy%']))::float
        / NULLIF(COUNT(*), 0) AS utility_ratio
    FROM bill_payments
    WHERE telefono = ${telefono}
      AND status IN ('completed','success','completed_ok','confirmed')
  `);
  const utilityRatio = Number((categoryRow.rows[0] as Record<string,unknown>)?.utility_ratio ?? 0);

  // Pago Seguro / high-value intent signals (cross-platform behavioral data)
  const intentRow = await db.execute(sql`
    SELECT COUNT(*)::int AS intent_clicks
    FROM user_events
    WHERE telefono = ${telefono}
      AND event_type IN ('pago_seguro_click', 'high_value_intent_click')
  `);
  const intentClicks = Number((intentRow.rows[0] as Record<string,unknown>)?.intent_clicks ?? 0);

  // 3d. Signup utilization speed
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

  // ══════════════════════════════════════════════════════════════════════════
  // DIMENSION 4: CASH-FLOW STABILITY — raw inputs
  // ══════════════════════════════════════════════════════════════════════════

  // 4a. Wallet balance
  const balanceRow = await db.execute(sql`
    SELECT COALESCE(balance_mxn, 0) AS balance
    FROM wallets WHERE user_id = ${telefono} LIMIT 1
  `);
  const currentBalance = Number((balanceRow.rows[0] as Record<string,unknown>)?.balance ?? 0);

  // 4b. Load/spend ratio (last 90 days)
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

  // 4d. P2P network activity
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

  // 4e. Account age
  const ageRow = await db.execute(sql`
    SELECT EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400 AS days_old
    FROM users WHERE telefono = ${telefono} LIMIT 1
  `);
  const daysOld = Number((ageRow.rows[0] as Record<string,unknown>)?.days_old ?? 0);

  // 4f/4g. Bancarization speed + funding channel mix (NEW v4.1)
  const bankingRow = await db.execute(sql`
    SELECT
      EXTRACT(EPOCH FROM (first_spei_load_at - created_at)) / 86400 AS days_to_first_spei,
      COALESCE(oxxo_load_count, 0) AS oxxo_load_count,
      COALESCE(spei_load_count, 0) AS spei_load_count,
      COALESCE(card_load_count, 0) AS card_load_count
    FROM users WHERE telefono = ${telefono} LIMIT 1
  `);
  const bankingR = bankingRow.rows[0] as Record<string,unknown>;
  const daysToFirstSpei = bankingR?.days_to_first_spei == null ? NaN : Number(bankingR.days_to_first_spei);
  const oxxoLoadCount   = Number(bankingR?.oxxo_load_count ?? 0);
  const speiLoadCount   = Number(bankingR?.spei_load_count ?? 0);
  const cardLoadCount   = Number(bankingR?.card_load_count ?? 0);

  return {
    streakMonths, payCount, domStddev, dominantDay, advanceDays, selfRatio,
    loginDays30, hourStd, scratchPlays, spinPlays, missionsDone, loadCount30, loadDayStd,
    paulaInteractions, confirmed2fa, declined2fa, pushOpens, curiosityIndex,
    billerCount, kycVerified, kycTier, utilityRatio, intentClicks, hoursToFirst, deviceScore,
    currentBalance, totalLoads, totalSpend, amountCV, p2pSendCount, p2pRecipientCount, daysOld,
    daysToFirstSpei, oxxoLoadCount, speiLoadCount, cardLoadCount,
  };
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
        // Fetch trajectory for v3 trend message
        const trajRow = await db.execute(sql`
          SELECT pti_trajectory, pti_b2b_score FROM users
          WHERE telefono = ${telefono} LIMIT 1
        `);
        const tr = trajRow.rows[0] as Record<string, unknown> | undefined;
        const trajectory  = String(tr?.pti_trajectory ?? 'stable');
        const b2bScore    = Number(tr?.pti_b2b_score  ?? 0);

        const trajectoryLine = trajectory === 'rising'
          ? `📈 *Tu puntaje está subiendo* — vas por buen camino.`
          : trajectory === 'falling'
          ? `⚠️ *Tu puntaje bajó este período* — pagar en las próximas semanas te ayudará a recuperarlo.`
          : `➡️ Tu puntaje se mantiene estable.`;

        const b2bLine = b2bScore >= 500
          ? `\n🏦 Tu perfil financiero equivale a *${b2bScore}/850 puntos* en escala de crédito.`
          : '';

        const tip = buildImprovementTip(bd);
        const msg =
          `📊 *Tu Predictive Trust Index se actualizó*\n\n` +
          `Tu puntaje: *${bd.total}/100 — ${label}* ${tier === "excelente" ? "🏆" : tier === "bueno" ? "✅" : "📈"}\n\n` +
          `${trajectoryLine}${b2bLine}\n\n` +
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

// ─── PTI v3.0 — Granular Data Capture + Trend Layer ──────────────────────────
//
// Runs nightly (after computePagoScore) for every active user.
// Computes P0/P1 aggregate signals, trend vectors from pti_trend_snapshots,
// and the B2B score (350–850 scale). All results written to users.* and a
// new pti_trend_snapshots row.
//
// Wallet load queries MUST join through wallets (no direct telefono on wt):
//   wallet_transactions wt JOIN wallets w ON w.id = wt.wallet_id
//   WHERE w.user_id = telefono
export async function computePTIv3Signals(telefono: string): Promise<void> {
  const { db } = await import("@workspace/db");

  try {
    // ── 3A: Load amount stats (avg + stddev) — last 90 days ──────────────
    const loadStatsRow = await db.execute(sql`
      SELECT
        COUNT(*)::int                                         AS load_count,
        COALESCE(AVG(wt.amount_mxn::numeric), 0)::numeric    AS avg_load,
        COALESCE(STDDEV(wt.amount_mxn::numeric), 0)::numeric AS load_stddev,
        COALESCE(SUM(wt.amount_mxn::numeric), 0)::numeric    AS total_loads_90d
      FROM wallet_transactions wt
      JOIN wallets w ON w.id = wt.wallet_id
      WHERE w.user_id = ${telefono}
        AND wt.type IN ('load_oxxo', 'load_spei', 'load_card', 'spei_in')
        AND wt.status = 'confirmed'
        AND wt.created_at >= NOW() - INTERVAL '90 days'
    `);
    const lsr          = loadStatsRow.rows[0] as Record<string, unknown>;
    const loadCount    = Number(lsr?.load_count    ?? 0);
    const avgLoad      = Number(lsr?.avg_load      ?? 0);
    const loadStddev   = Number(lsr?.load_stddev   ?? 0);
    const totalLoads90 = Number(lsr?.total_loads_90d ?? 0);

    // Income regularity score (0–100): coefficient of variation, lower = more regular
    let incomeRegularityScore = 0;
    if (loadCount >= 2 && avgLoad > 0) {
      const cv = loadStddev / avgLoad;
      if      (cv <= 0.10) incomeRegularityScore = 100;
      else if (cv <= 0.25) incomeRegularityScore = 80;
      else if (cv <= 0.50) incomeRegularityScore = 60;
      else if (cv <= 1.00) incomeRegularityScore = 40;
      else                 incomeRegularityScore = 20;
    } else if (loadCount === 1) {
      incomeRegularityScore = 30;
    }

    // ── 3B: Monthly bill obligations + load-to-bill ratio — last 90 days ─
    const billObligRow = await db.execute(sql`
      SELECT COALESCE(SUM(monto::numeric), 0) / 3.0 AS monthly_obligations
      FROM bill_payments
      WHERE telefono = ${telefono}
        AND status IN ('completed','success','completed_ok','confirmed')
        AND created_at >= NOW() - INTERVAL '90 days'
    `);
    const monthlyObligations = Number(
      (billObligRow.rows[0] as Record<string, unknown>)?.monthly_obligations ?? 0
    );
    const walletLoadToBillRatio = monthlyObligations > 0
      ? Math.round((totalLoads90 / (monthlyObligations * 3)) * 100) / 100
      : 0;

    // ── 3C: Essential bill ratio — last 90 days ───────────────────────────
    const essentialRow = await db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE
          LOWER(COALESCE(service_name, '')) LIKE ANY(ARRAY[
            '%cfe%','%agua%','%gas%','%predial%','%electricidad%','%luz%'
          ])
        )::float / NULLIF(COUNT(*), 0) AS essential_ratio
      FROM bill_payments
      WHERE telefono = ${telefono}
        AND status IN ('completed','success','completed_ok','confirmed')
        AND created_at >= NOW() - INTERVAL '90 days'
    `);
    const essentialRatio = Number(
      (essentialRow.rows[0] as Record<string, unknown>)?.essential_ratio ?? 0
    );

    // ── 3D: Payday window (dominant load day-of-month) + consistency ──────
    const paydayRow = await db.execute(sql`
      SELECT
        MODE() WITHIN GROUP (
          ORDER BY EXTRACT(DAY FROM wt.created_at)
        )::int                                                       AS dominant_day,
        COALESCE(STDDEV(EXTRACT(DAY FROM wt.created_at)), 15)::numeric AS day_stddev
      FROM wallet_transactions wt
      JOIN wallets w ON w.id = wt.wallet_id
      WHERE w.user_id = ${telefono}
        AND wt.type IN ('load_oxxo', 'load_spei', 'load_card', 'spei_in')
        AND wt.status = 'confirmed'
        AND wt.created_at >= NOW() - INTERVAL '90 days'
    `);
    const pdr             = paydayRow.rows[0] as Record<string, unknown>;
    const dominantPayDay  = Number(pdr?.dominant_day ?? 0);
    const paydayDayStddev = Number(pdr?.day_stddev   ?? 15);

    let dominantPaydayWindow = 'unknown';
    if (loadCount >= 2) {
      if      (dominantPayDay >= 1  && dominantPayDay <= 7)  dominantPaydayWindow = '1-7';
      else if (dominantPayDay >= 8  && dominantPayDay <= 15) dominantPaydayWindow = '8-15';
      else if (dominantPayDay >= 16 && dominantPayDay <= 20) dominantPaydayWindow = '16-20';
      else if (dominantPayDay >= 21)                         dominantPaydayWindow = '21-31';
    }

    let paydayConsistency = 0;
    if (loadCount >= 2) {
      if      (paydayDayStddev <= 2)  paydayConsistency = 100;
      else if (paydayDayStddev <= 5)  paydayConsistency = 80;
      else if (paydayDayStddev <= 8)  paydayConsistency = 60;
      else if (paydayDayStddev <= 12) paydayConsistency = 40;
      else                            paydayConsistency = 20;
    }

    // ── 3E: Platform tenure + active months + longest payment gap ─────────
    const tenureRow = await db.execute(sql`
      SELECT EXTRACT(DAY FROM NOW() - created_at)::int AS tenure_days
      FROM users WHERE telefono = ${telefono} LIMIT 1
    `);
    const tenureDays = Number(
      (tenureRow.rows[0] as Record<string, unknown>)?.tenure_days ?? 0
    );

    const activeMonthsRow = await db.execute(sql`
      SELECT COUNT(DISTINCT DATE_TRUNC('month', created_at))::int AS active_months
      FROM bill_payments
      WHERE telefono = ${telefono}
        AND status IN ('completed','success','completed_ok','confirmed')
    `);
    const activeMonths = Number(
      (activeMonthsRow.rows[0] as Record<string, unknown>)?.active_months ?? 0
    );

    const gapRow = await db.execute(sql`
      SELECT COALESCE(MAX(
        EXTRACT(DAY FROM lead_date - created_at)
      )::int, 0) AS longest_gap
      FROM (
        SELECT
          created_at,
          LEAD(created_at) OVER (ORDER BY created_at) AS lead_date
        FROM bill_payments
        WHERE telefono = ${telefono}
          AND status IN ('completed','success','completed_ok','confirmed')
      ) gaps
      WHERE lead_date IS NOT NULL
    `);
    const longestGapDays = Number(
      (gapRow.rows[0] as Record<string, unknown>)?.longest_gap ?? 0
    );

    // ── 3F: Trend layer — velocity + trajectory from pti_trend_snapshots ──
    const userRow = await db.execute(sql`
      SELECT id, pti_score, pti_breakdown FROM users
      WHERE telefono = ${telefono} LIMIT 1
    `);
    const ur = userRow.rows[0] as Record<string, unknown> | undefined;
    if (!ur) return;

    const userId   = Number(ur.id);
    const ptiTotal = Number(ur.pti_score ?? 0);
    const ptiBreakdown = ur.pti_breakdown as Record<string, unknown> | null;

    const prevSnapsRow = await db.execute(sql`
      SELECT pti_total, computed_at
      FROM pti_trend_snapshots
      WHERE user_id = ${userId}
      ORDER BY computed_at DESC
      LIMIT 3
    `);
    const prevSnaps = prevSnapsRow.rows as Array<Record<string, unknown>>;

    const snap30 = prevSnaps[0];
    const snap60 = prevSnaps[1];
    const snap90 = prevSnaps[2];

    const trend30d = snap30 ? ptiTotal - Number(snap30.pti_total ?? ptiTotal) : 0;
    const trend60d = snap60 ? ptiTotal - Number(snap60.pti_total ?? ptiTotal) : trend30d;
    const trend90d = snap90 ? ptiTotal - Number(snap90.pti_total ?? ptiTotal) : trend60d;

    // Velocity = average weekly point change over last ~30 days
    const velocity = snap30 ? Math.round((trend30d / 4) * 100) / 100 : 0;

    let trajectory = 'stable';
    if      (trend30d >= 5)  trajectory = 'rising';
    else if (trend30d <= -5) trajectory = 'falling';

    // ── 3G: B2B score — ROUND(350 + (pti/100)*500), floor 350, ceiling 850 ─
    const ptiB2bScore = Math.max(350, Math.min(850,
      Math.round(350 + (ptiTotal / 100.0) * 500)
    ));

    // ── 3I: Advance payment days avg — proactive vs reactive payer ───────────
    const advanceRow = await db.execute(sql`
      SELECT COALESCE(AVG(days_before_due::numeric), 0)::numeric AS avg_advance
      FROM bill_payments
      WHERE telefono = ${telefono}
        AND status IN ('completed','success','completed_ok','confirmed')
        AND days_before_due IS NOT NULL
        AND created_at >= NOW() - INTERVAL '90 days'
    `);
    const advancePayDays = Number(
      (advanceRow.rows[0] as Record<string,unknown>)?.avg_advance ?? 0
    );

    // ── 3J: Self-initiated ratio — self-started vs reminder-triggered ─────
    const selfInitRow = await db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE payment_initiation = 'self')::float
          / NULLIF(COUNT(*), 0) AS self_ratio
      FROM bill_payments
      WHERE telefono = ${telefono}
        AND status IN ('completed','success','completed_ok','confirmed')
        AND payment_initiation IS NOT NULL
        AND created_at >= NOW() - INTERVAL '90 days'
    `);
    const selfInitRatio = Number(
      (selfInitRow.rows[0] as Record<string,unknown>)?.self_ratio ?? 0
    );

    // ── 3K: Payment amount volatility — CV across billers ────────────────
    // Low CV = consistent amounts = stable income and predictable obligations.
    const volRow = await db.execute(sql`
      SELECT COALESCE(AVG(
        CASE WHEN biller_avg > 0 THEN biller_std / biller_avg ELSE 1 END
      ), 1)::numeric AS avg_cv
      FROM (
        SELECT
          COALESCE(service_name, service_id) AS biller,
          COALESCE(STDDEV(monto::numeric), 0)         AS biller_std,
          COALESCE(AVG(monto::numeric), 1)            AS biller_avg
        FROM bill_payments
        WHERE telefono = ${telefono}
          AND status IN ('completed','success','completed_ok','confirmed')
          AND created_at >= NOW() - INTERVAL '90 days'
        GROUP BY COALESCE(service_name, service_id)
        HAVING COUNT(*) >= 2
      ) billers
    `);
    const payAmountCV = Math.min(2, Number(
      (volRow.rows[0] as Record<string,unknown>)?.avg_cv ?? 1
    ));

    // ── 3L: Recovery score — return rate after payment gaps ──────────────
    // After any gap of 30+ days between payments, did the user return and pay?
    // Recovery rate = recovered_gaps / total_gaps (0–100 scale)
    const gapRecovRow = await db.execute(sql`
      WITH payment_gaps AS (
        SELECT
          created_at AS pay_date,
          LEAD(created_at) OVER (ORDER BY created_at) AS next_pay_date,
          EXTRACT(DAY FROM LEAD(created_at) OVER (ORDER BY created_at) - created_at) AS gap_days
        FROM bill_payments
        WHERE telefono = ${telefono}
          AND status IN ('completed','success','completed_ok','confirmed')
      )
      SELECT
        COUNT(*) FILTER (WHERE gap_days >= 30)::float       AS total_gaps,
        COUNT(*) FILTER (WHERE gap_days >= 30 AND gap_days <= 60)::float AS recovered_gaps
      FROM payment_gaps
      WHERE gap_days IS NOT NULL
    `);
    const gapR        = gapRecovRow.rows[0] as Record<string,unknown>;
    const totalGaps   = Number(gapR?.total_gaps    ?? 0);
    const recovGaps   = Number(gapR?.recovered_gaps ?? 0);
    const recovRate   = totalGaps > 0 ? recovGaps / totalGaps : 1; // no gaps = perfect
    const recovScore  = Math.round(recovRate * 100);

    // ── 3M: Financial curiosity index — proactive Paula topics ────────────
    // Ratio of savings/PTI questions to total Paula messages.
    // Sourced from paula_inbound_log.topic_category (classified by classifyPaulaMessage)
    const curiosityRow = await db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE topic_category IN ('savings_goal','pti_inquiry'))::float
          / NULLIF(COUNT(*), 0) AS curiosity_idx
      FROM paula_inbound_log
      WHERE telefono = ${telefono}
        AND topic_category IS NOT NULL
        AND received_at >= NOW() - INTERVAL '90 days'
    `);
    const finCuriosityIndex = Number(
      (curiosityRow.rows[0] as Record<string,unknown>)?.curiosity_idx ?? 0
    );

    // ── 3N: Device consistency score — same device tenure ────────────────
    // How long the current device has been in use (device_first_seen_at).
    // Long-tenured device = stable identity, not transient.
    const deviceRow = await db.execute(sql`
      SELECT
        EXTRACT(DAY FROM NOW() - COALESCE(device_first_seen_at, NOW()))::int AS device_days
      FROM users WHERE telefono = ${telefono} LIMIT 1
    `);
    const deviceDays = Number(
      (deviceRow.rows[0] as Record<string,unknown>)?.device_days ?? 0
    );
    let devConsistScore = 0;
    if      (deviceDays >= 120) devConsistScore = 100;
    else if (deviceDays >= 90)  devConsistScore = 80;
    else if (deviceDays >= 60)  devConsistScore = 60;
    else if (deviceDays >= 30)  devConsistScore = 40;
    else if (deviceDays >= 7)   devConsistScore = 20;

    // ── 3H: Write ALL aggregate signals to users + insert trend snapshot ──
    await db.execute(sql`
      UPDATE users SET
        avg_monthly_load_amount   = ${Math.round(avgLoad * 100) / 100},
        load_amount_stddev        = ${Math.round(loadStddev * 100) / 100},
        income_regularity_score   = ${incomeRegularityScore},
        monthly_bill_obligations  = ${Math.round(monthlyObligations * 100) / 100},
        wallet_load_to_bill_ratio = ${walletLoadToBillRatio},
        essential_bill_ratio      = ${Math.round(essentialRatio * 100) / 100},
        dominant_payday_window    = ${dominantPaydayWindow},
        payday_consistency        = ${paydayConsistency},
        platform_tenure_days      = ${tenureDays},
        active_months             = ${activeMonths},
        longest_gap_days          = ${longestGapDays},
        pti_b2b_score             = ${ptiB2bScore},
        pti_trajectory            = ${trajectory},
        advance_payment_days_avg  = ${Math.round(advancePayDays * 100) / 100},
        self_initiated_ratio      = ${Math.round(selfInitRatio * 10000) / 10000},
        payment_amount_volatility = ${Math.round(payAmountCV * 10000) / 10000},
        recovery_score            = ${recovScore},
        financial_curiosity_index = ${Math.round(finCuriosityIndex * 10000) / 10000},
        device_consistency_score  = ${devConsistScore}
      WHERE telefono = ${telefono}
    `);

    // Insert trend snapshot — extract dimension scores from stored breakdown JSON
    await db.execute(sql`
      INSERT INTO pti_trend_snapshots
        (user_id, computed_at, pti_total,
         payment_reliability, behavioral_consistency, engagement_depth, cash_flow_stability,
         trend_30d, trend_60d, trend_90d, trajectory, velocity, pti_b2b_score)
      VALUES (
        ${userId},
        NOW(),
        ${ptiTotal},
        ${ptiBreakdown ? Number((ptiBreakdown as any)?.payment_reliability?.score ?? 0) : 0},
        ${ptiBreakdown ? Number((ptiBreakdown as any)?.behavioral_consistency?.score ?? 0) : 0},
        ${ptiBreakdown ? Number((ptiBreakdown as any)?.engagement_depth?.score ?? 0) : 0},
        ${ptiBreakdown ? Number((ptiBreakdown as any)?.cashflow_stability?.score ?? 0) : 0},
        ${trend30d},
        ${trend60d},
        ${trend90d},
        ${trajectory},
        ${velocity},
        ${ptiB2bScore}
      )
    `).catch(err => logger.warn({ err, telefono }, "pti-v3: trend snapshot insert failed"));

    logger.info({ telefono, ptiB2bScore, trajectory, trend30d }, "pti-v3: signals computed");

  } catch (err) {
    logger.error({ err, telefono }, "pti-v3: computePTIv3Signals failed");
  }
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
