/**
 * PTI v5.0.0-rc1 — Fair-Lending Remediation Scoring Engine (SHADOW MODE)
 * ============================================================================
 * Implements the cap table published in the SIGNED
 * `docs/fair-lending/phase3-implementation-spec.md` §3.1. This module runs
 * in SHADOW MODE ONLY per Phase B of the v5.0 implementation plan: it is
 * computed and logged (see `computePTIv5ForUser` in this file, invoked from
 * the shadow-recompute path), but v4.3 (`pti.ts`) remains the sole
 * user-facing / gate-facing score until Phase E's explicit, separately
 * gated flip.
 *
 * ── SOURCE-OF-TRUTH FOR EVERY FORMULA BELOW ──────────────────────────────
 * Two categories of change vs v4.3, and they are NOT interpreted the same
 * way — the difference matters for anyone auditing this file against the
 * signed spec:
 *
 * 1. FULLY RESPECIFIED components — the spec gives an exact new formula.
 *    Implemented verbatim:
 *      - payment_streak (PR): "0 at ≤2 consecutive months; +4/month above;
 *        full at 6" → max(0, min(16, (streakMonths-2)*4)).
 *      - biller_diversity (ED): "verified billers = billers with ≥2 payments
 *        each; 0 at ≤3 verified; +5.5/verified above; full at 5. Until
 *        event-level per-biller counts ship, proxy = min(billerCount,
 *        floor(payCount/2))" → verified = min(billerCount, floor(payCount/2));
 *        score = max(0, min(11, (verified-3)*5.5)).
 *
 * 2. POINT-CAP-ONLY deltas — the spec states only the new max point value
 *    ("+1", "+2", "+3", "+4") for a component whose internal step structure
 *    it does NOT respecify. For these, THIS FILE MAKES AN EXPLICIT,
 *    DOCUMENTED INTERPRETIVE CHOICE: the v4.3 step thresholds are preserved
 *    unchanged, and the stated point delta is added ONLY to the top
 *    ("full marks") band. No intermediate threshold or step value is
 *    invented. This is the most conservative reading available (it changes
 *    the fewest possible numbers relative to the last signed-off model) but
 *    it IS an interpretation, not a spec quote. APPROVED by the signoff
 *    owner on 2026-07-10 — no longer an open item.
 *    Affected components: payment_day_consistency, self_initiated_ratio,
 *    wallet_load_rhythm, spend_category_mix, signup_utilization_speed,
 *    payment_amount_volatility, load_spend_ratio, account_age.
 *
 * Shadow demotions (kyc_verified, device_consistency, wallet_balance,
 * bancarization_speed, funding_channel_mix → 0 points) reuse the v4.3
 * disposition-registry semantics per the spec; see `ptiV5Disposition.ts`
 * for the v5-specific registry entries.
 *
 * FAIR-LENDING ISOLATION: this file must NEVER import or reference
 * geography or declared-income fields, or the isolated post-hoc adjustment
 * module those fields live in — same guard as pti.ts, see the regression
 * test added in Phase B4.
 */

import { DERIVED_FEATURE_DEFAULTS } from "./ptiDerivedFeatures.js";
import type { PTIDataSnapshot, PTIBreakdown, PTIConfidence } from "./pti.js";
import { computePTIConfidence } from "./pti.js";

export const PTI_V5_MODEL_VERSION = "v5.0.0-rc1";

export function computePTIv5(
  snapshot: PTIDataSnapshot,
): { breakdown: PTIBreakdown; confidence: PTIConfidence } {
  const {
    streakMonths, payCount, domStddev, dominantDay, advanceDays, selfRatio,
    loginDays30, hourStd, scratchPlays, spinPlays, missionsDone, loadCount30, loadDayStd,
    paulaInteractions, confirmed2fa, declined2fa, pushOpens, curiosityIndex,
    billerCount, kycVerified, kycTier, utilityRatio, intentClicks, hoursToFirst, deviceScore,
    currentBalance, totalLoads, totalSpend, amountCV, p2pSendCount, p2pRecipientCount, daysOld,
    daysToFirstSpei, oxxoLoadCount, speiLoadCount, cardLoadCount,
    lateRecoveryRatio, latePaymentCount, paulaResponseLatencyMinutes,
  } = snapshot;
  void DERIVED_FEATURE_DEFAULTS; // zero-weight fields untouched, same as v4.3 — not read here either

  // ══════════════════════════════════════════════════════════════════════
  // DIMENSION 1: PAYMENT RELIABILITY — max 36pts (v5.0.0-rc1)
  // ══════════════════════════════════════════════════════════════════════

  // 1a. Payment streak — max 16pts. FULLY RESPECIFIED (see header).
  const paymentStreakScore = Math.max(0, Math.min(16, (streakMonths - 2) * 4));

  // 1b. Payment day consistency — max 5pts. Interpretive: v4.3 steps kept,
  // top band raised from 4 to 5 (see header category 2).
  let payDayConsistency = 0;
  if (payCount >= 3) {
    if      (domStddev <= 2)  payDayConsistency = 5;
    else if (domStddev <= 5)  payDayConsistency = 3;
    else if (domStddev <= 8)  payDayConsistency = 2;
    else if (domStddev <= 12) payDayConsistency = 1;
  }

  // 1c. Advance payment days — max 8pts. UNCHANGED per spec ("deliberately
  // not amplified — 4.1 residual").
  let advancePayScore = 0;
  if (payCount >= 3) {
    if      (advanceDays >= 7) advancePayScore = 8;
    else if (advanceDays >= 4) advancePayScore = 6;
    else if (advanceDays >= 2) advancePayScore = 4;
    else if (advanceDays >= 1) advancePayScore = 2;
  }

  // 1d. Self-initiated ratio — max 7pts. Interpretive: top band 5 -> 7.
  let selfInitScore = 0;
  if (payCount >= 3) {
    if      (selfRatio >= 0.9) selfInitScore = 7;
    else if (selfRatio >= 0.7) selfInitScore = 4;
    else if (selfRatio >= 0.5) selfInitScore = 3;
    else if (selfRatio >= 0.3) selfInitScore = 1;
  }

  const prScore = paymentStreakScore + payDayConsistency + advancePayScore + selfInitScore;

  // ══════════════════════════════════════════════════════════════════════
  // DIMENSION 2: BEHAVIORAL CONSISTENCY — max 22pts (v5.0.0-rc1)
  // ══════════════════════════════════════════════════════════════════════

  let sessionCadenceScore = 0;
  if      (loginDays30 >= 20) sessionCadenceScore = 2;
  else if (loginDays30 >= 12) sessionCadenceScore = 1;
  else if (loginDays30 >= 4)  sessionCadenceScore = 1;

  let routineScore = 0;
  {
    const hourNorm = Math.max(0, 1 - hourStd / 12);
    const domNorm  = Math.max(0, 1 - domStddev / 15);
    const routineRaw = (hourNorm + domNorm) / 2;
    if      (routineRaw >= 0.70) routineScore = 2;
    else if (routineRaw >= 0.30) routineScore = 1;
  }

  const totalEngagement = scratchPlays + spinPlays + (missionsDone * 2);
  let gameEngagementScore = 0;
  if      (totalEngagement >= 20) gameEngagementScore = 3;
  else if (totalEngagement >= 8)  gameEngagementScore = 2;
  else if (totalEngagement >= 2)  gameEngagementScore = 1;

  // 2d. Wallet load rhythm — max 4pts (rail-agnostic; +2 per spec). Interpretive: top band 2 -> 4.
  let loadRhythmScore = 0;
  if (loadCount30 >= 3) {
    if      (loadDayStd <= 3) loadRhythmScore = 4;
    else if (loadDayStd <= 7) loadRhythmScore = 1;
  }

  let paulaScore = 0;
  if      (paulaInteractions >= 15) paulaScore = 2;
  else if (paulaInteractions >= 4)  paulaScore = 1;
  if (confirmed2fa >= 2 && (declined2fa === 0 || confirmed2fa / (confirmed2fa + declined2fa) >= 0.7)) {
    paulaScore = Math.min(3, paulaScore + 1);
  }

  let pushScore = 0;
  if (pushOpens >= 2) pushScore = 1;

  let curiosityScore = 0;
  if      (curiosityIndex >= 0.20) curiosityScore = 3;
  else if (curiosityIndex >= 0.10) curiosityScore = 2;
  else if (curiosityIndex >= 0.05) curiosityScore = 1;

  let recoveryAfterMissScore = 0;
  if (payCount >= 3) {
    if      (latePaymentCount === 0)      recoveryAfterMissScore = 2;
    else if (lateRecoveryRatio >= 0.75)   recoveryAfterMissScore = 2;
    else if (lateRecoveryRatio >= 0.40)   recoveryAfterMissScore = 1;
  }

  let paulaLatencyScore = 0;
  if (!isNaN(paulaResponseLatencyMinutes)) {
    if      (paulaResponseLatencyMinutes <= 15) paulaLatencyScore = 2;
    else if (paulaResponseLatencyMinutes <= 60) paulaLatencyScore = 1;
  }

  const bcScore = sessionCadenceScore + routineScore + gameEngagementScore + loadRhythmScore
                + paulaScore + pushScore + curiosityScore + recoveryAfterMissScore + paulaLatencyScore;

  // ══════════════════════════════════════════════════════════════════════
  // DIMENSION 3: ENGAGEMENT DEPTH — max 22pts (v5.0.0-rc1)
  // ══════════════════════════════════════════════════════════════════════

  // 3a. Biller diversity — max 11pts. FULLY RESPECIFIED (see header).
  // verified-biller proxy until event-level per-biller counts ship.
  const verifiedBillerProxy = Math.min(billerCount, Math.floor(payCount / 2));
  const billerDiversityScore = Math.max(0, Math.min(11, (verifiedBillerProxy - 3) * 5.5));

  // 3b. KYC verified — SHADOW DEMOTED to 0 points (gate criterion unaffected — see ptiV5Disposition.ts).
  let kycScore = 0;
  void kycVerified;
  void kycTier;

  // 3c. Spend category mix — max 7pts. Interpretive: top band 4 -> 7.
  let spendCategoryScore = 0;
  if      (utilityRatio >= 0.6) spendCategoryScore = 7;
  else if (utilityRatio >= 0.4) spendCategoryScore = 3;
  else if (utilityRatio >= 0.2) spendCategoryScore = 1;
  if (intentClicks >= 1) spendCategoryScore = Math.min(7, spendCategoryScore + 1);

  // 3d. Signup utilization speed — max 4pts. Interpretive: top band 2 -> 4.
  let signupSpeedScore = 0;
  if (!isNaN(hoursToFirst) && hoursToFirst > 0) {
    if      (hoursToFirst <= 12)  signupSpeedScore = 4;
    else if (hoursToFirst <= 72)  signupSpeedScore = 1;
  }

  // 3e. Device consistency — SHADOW DEMOTED to 0 points.
  const deviceConsistencyScore = 0;
  void deviceScore;

  const edScore = billerDiversityScore + kycScore + spendCategoryScore + signupSpeedScore + deviceConsistencyScore;

  // ══════════════════════════════════════════════════════════════════════
  // DIMENSION 4: CASH-FLOW STABILITY — max 20pts (v5.0.0-rc1)
  // ══════════════════════════════════════════════════════════════════════

  // 4a. Wallet balance — SHADOW DEMOTED to 0 points.
  const walletScore = 0;
  void currentBalance;

  // 4b. Load/spend ratio — max 4pts. Interpretive: top band 3 -> 4.
  let loadSpendRatio = 0;
  let loadSpendScore = 0;
  if (totalLoads > 0 && totalSpend > 0) {
    loadSpendRatio = totalLoads / totalSpend;
    if      (loadSpendRatio >= 1.0) loadSpendScore = 4;
    else if (loadSpendRatio >= 0.7) loadSpendScore = 2;
    else if (loadSpendRatio >= 0.4) loadSpendScore = 1;
  }

  // 4c. Payment amount volatility — max 7pts. Interpretive: top band 3 -> 7.
  let volatilityScore = 0;
  if (payCount >= 2) {
    if      (amountCV <= 0.10) volatilityScore = 7;
    else if (amountCV <= 0.25) volatilityScore = 2;
    else if (amountCV <= 0.50) volatilityScore = 1;
  }

  // 4d. P2P network activity — max 3pts. UNCHANGED per spec.
  let p2pScore = 0;
  if      (p2pSendCount >= 5 && p2pRecipientCount >= 3) p2pScore = 3;
  else if (p2pSendCount >= 3 && p2pRecipientCount >= 2) p2pScore = 2;
  else if (p2pSendCount >= 1)                           p2pScore = 1;

  // 4e. Account age — max 3pts. Interpretive: top band 2 -> 3.
  let accountAgeScore = 0;
  if      (daysOld >= 90) accountAgeScore = 3;
  else if (daysOld >= 30) accountAgeScore = 1;

  // 4f. Bancarization speed — SHADOW DEMOTED to 0 points.
  const bancarizationScore = 0;
  void daysToFirstSpei;

  // 4g. Funding channel mix — SHADOW DEMOTED to 0 points.
  const fundingMixScore = 0;
  void oxxoLoadCount;
  void speiLoadCount;
  void cardLoadCount;

  // 4h. Buffer retention — max 3pts. UNCHANGED per spec ("not upweighted — finding [4]").
  let bufferRetentionScore = 0;
  let bufferRetentionRatio = 0;
  if (totalLoads > 0) {
    bufferRetentionRatio = Math.max(0, Math.min(1, currentBalance / totalLoads));
    if      (bufferRetentionRatio >= 0.30) bufferRetentionScore = 3;
    else if (bufferRetentionRatio >= 0.15) bufferRetentionScore = 2;
    else if (bufferRetentionRatio >= 0.05) bufferRetentionScore = 1;
  } else if (currentBalance > 0) {
    bufferRetentionRatio = 1;
    bufferRetentionScore = 3;
  }

  const cfScore = walletScore + loadSpendScore + volatilityScore + p2pScore + accountAgeScore
                + bancarizationScore + fundingMixScore + bufferRetentionScore;

  const total = Math.min(100, prScore + bcScore + edScore + cfScore);
  const confidence = computePTIConfidence(snapshot);

  const breakdown: PTIBreakdown = {
    payment_reliability: {
      score: prScore, max: 36, label: "Fiabilidad de Pago",
      components: {
        payment_streak:          { score: paymentStreakScore, max: 16, value: streakMonths },
        payment_day_consistency: { score: payDayConsistency,  max: 5,  value: dominantDay },
        advance_payment_days:    { score: advancePayScore,    max: 8,  value: Math.round(advanceDays * 10) / 10 },
        self_initiated_ratio:    { score: selfInitScore,      max: 7,  value: Math.round(selfRatio * 100) },
      },
    },
    behavioral_consistency: {
      score: bcScore, max: 22, label: "Consistencia de Comportamiento",
      components: {
        session_cadence:              { score: sessionCadenceScore,     max: 2, value: loginDays30 },
        routine_score:                { score: routineScore,            max: 2, value: Math.round((1 - hourStd / 12) * 100) },
        game_engagement:               { score: gameEngagementScore,    max: 3, value: totalEngagement },
        wallet_load_rhythm:           { score: loadRhythmScore,         max: 4, value: loadCount30 },
        paula_interaction_depth:      { score: paulaScore,              max: 3, value: paulaInteractions },
        push_notification_engagement: { score: pushScore,               max: 1, value: pushOpens },
        financial_curiosity_index:    { score: curiosityScore,          max: 3, value: Math.round(curiosityIndex * 100) },
        recovery_after_miss:          { score: recoveryAfterMissScore,  max: 2, value: isNaN(lateRecoveryRatio) ? -1 : Math.round(lateRecoveryRatio * 100) },
        paula_response_latency:       { score: paulaLatencyScore,       max: 2, value: isNaN(paulaResponseLatencyMinutes) ? -1 : Math.round(paulaResponseLatencyMinutes) },
      },
    },
    engagement_depth: {
      score: edScore, max: 22, label: "Profundidad de Uso",
      components: {
        biller_diversity:         { score: billerDiversityScore,    max: 11, value: verifiedBillerProxy },
        kyc_verified:             { score: kycScore,                max: 0,  value: kycVerified },
        spend_category_mix:       { score: spendCategoryScore,      max: 7,  value: Math.round(utilityRatio * 100) },
        signup_utilization_speed: { score: signupSpeedScore,        max: 4,  value: isNaN(hoursToFirst) ? 0 : Math.floor(hoursToFirst) },
        device_consistency:       { score: deviceConsistencyScore,  max: 0,  value: deviceScore },
      },
    },
    cashflow_stability: {
      score: cfScore, max: 20, label: "Estabilidad de Flujo",
      components: {
        wallet_balance:           { score: walletScore,           max: 0, value: currentBalance },
        load_spend_ratio:         { score: loadSpendScore,        max: 4, value: Math.round(loadSpendRatio * 100) / 100 },
        payment_amount_volatility:{ score: volatilityScore,       max: 7, value: Math.round(amountCV * 100) / 100 },
        p2p_network_activity:     { score: p2pScore,              max: 3, value: p2pSendCount },
        account_age:              { score: accountAgeScore,       max: 3, value: Math.floor(daysOld) },
        bancarization_speed:      { score: bancarizationScore,    max: 0, value: isNaN(daysToFirstSpei) ? -1 : Math.floor(daysToFirstSpei) },
        funding_channel_mix:      { score: fundingMixScore,       max: 0, value: 0 },
        buffer_retention:         { score: bufferRetentionScore,  max: 3, value: Math.round(bufferRetentionRatio * 100) },
      },
    },
    total,
    model_version: PTI_V5_MODEL_VERSION,
    confidence,
    payment_streak:   { score: paymentStreakScore, months: streakMonths, max: 16 },
    biller_diversity: { score: billerDiversityScore, count: verifiedBillerProxy, max: 11 },
    kyc_verified:     { score: kycScore, verified: kycVerified, max: 0 },
    wallet_balance:   { score: walletScore, avg_balance_mxn: currentBalance, max: 0 },
    load_spend_ratio: { score: loadSpendScore, ratio: Math.round(loadSpendRatio * 100) / 100, max: 4 },
    account_age:      { score: accountAgeScore, days: Math.floor(daysOld), max: 3 },
  };

  return { breakdown, confidence };
}

/**
 * Shadow-mode DB entry point — retained for historical record / backfill only.
 * Phase E: shadow mode RETIRED. Use computePTIv5LiveForUser for all new writes.
 */
export async function computePTIv5ForUser(telefono: string): Promise<PTIBreakdown> {
  const { db } = await import("@workspace/db");
  const { sql } = await import("drizzle-orm");
  const { buildPTISnapshotFromDb } = await import("./pti.js");

  const snapshot = await buildPTISnapshotFromDb(telefono);
  const { breakdown } = computePTIv5(snapshot);

  await db.execute(sql`
    INSERT INTO pti_v5_shadow_recompute (telefono, pti_v5_total, pti_v5_breakdown, computed_at)
    VALUES (${telefono}, ${breakdown.total}, ${JSON.stringify(breakdown)}::jsonb, NOW())
  `);

  return breakdown;
}

/**
 * Phase E live entry point — computes v5.0 and writes to the production score
 * columns (users.pti_score, users.pti_breakdown, users.pti_computed_at).
 * Replaces computePTIForUser (v4.3) from Phase E go-order onwards.
 * Also logs to pti_score_history for trend continuity.
 */
export async function computePTIv5LiveForUser(telefono: string): Promise<PTIBreakdown> {
  const { db } = await import("@workspace/db");
  const { sql } = await import("drizzle-orm");
  const { buildPTISnapshotFromDb } = await import("./pti.js");
  const { logger } = await import("../lib/logger.js");

  const exists = await db.execute(sql`SELECT 1 FROM users WHERE telefono = ${telefono} LIMIT 1`);
  if ((exists.rows as unknown[]).length === 0) {
    throw new Error(`computePTIv5LiveForUser: no user row for "${telefono}" — skipping`);
  }

  const snapshot = await buildPTISnapshotFromDb(telefono);
  const { breakdown } = computePTIv5(snapshot);

  await db.execute(sql`
    UPDATE users SET
      pti_score             = ${breakdown.total},
      pti_breakdown         = ${JSON.stringify(breakdown)}::jsonb,
      pti_computed_at       = NOW(),
      pti_first_computed_at = COALESCE(pti_first_computed_at, NOW())
    WHERE telefono = ${telefono}
  `);

  await db.execute(sql`
    INSERT INTO pti_score_history (telefono, pti_score, breakdown, recorded_at)
    VALUES (${telefono}, ${breakdown.total}, ${JSON.stringify(breakdown)}::jsonb, NOW())
  `).catch(err => logger.warn({ err, telefono }, "ptiV5Live: history log failed — continuing"));

  return breakdown;
}

/**
 * Batch wrapper — runs computePTIv5LiveForUser for every non-test user.
 * Replaces computePTIForAllUsers in the monthly PTI batch from Phase E onwards.
 */
export async function computePTIv5ForAllUsers(): Promise<{ updated: number; errors: number }> {
  const { db } = await import("@workspace/db");
  const { sql } = await import("drizzle-orm");
  const { logger } = await import("../lib/logger.js");

  const allUsers = await db.execute(sql`
    SELECT DISTINCT telefono FROM users
    WHERE telefono IS NOT NULL AND telefono != ''
    AND is_test_account IS NOT TRUE
  `);
  const phones = allUsers.rows.map(r => (r as Record<string, unknown>).telefono as string);
  logger.info({ count: phones.length }, "[PTI v5 Live] Starting batch recompute");

  let updated = 0;
  let errors  = 0;

  for (const telefono of phones) {
    try {
      await computePTIv5LiveForUser(telefono);
      updated++;
    } catch (err) {
      logger.error({ err, telefono }, "[PTI v5 Live] User batch failed");
      errors++;
    }
    await new Promise(r => setTimeout(r, 50));
  }

  logger.info({ updated, errors }, "[PTI v5 Live] Batch complete");
  return { updated, errors };
}
