/**
 * PTI Service — PagoYa Trust Index (7-component breakdown)
 *
 * User-facing score shown on the dashboard widget.
 * Stored in users.pti_score + users.pti_breakdown + users.pti_computed_at.
 *
 * Separate from the nightly pagoScore.ts (credit-profile model).
 * This is the simplified, human-readable score the user sees.
 */

import { sql } from "drizzle-orm";
import { logger } from "../lib/logger.js";
import { sendWhatsApp } from "../lib/whatsapp.js";

export interface PTIBreakdown {
  payment_streak:      { score: number; months: number; max: number };
  biller_diversity:    { score: number; count: number;  max: number };
  kyc_verified:        { score: number; verified: boolean; max: number };
  wallet_balance:      { score: number; avg_balance_mxn: number; max: number };
  mission_completions: { score: number; count: number;  max: number };
  load_spend_ratio:    { score: number; ratio: number;  max: number };
  account_age:         { score: number; days: number;   max: number };
  total: number;
}

export function getPTITier(score: number): { tier: string; color: string; label: string } {
  if (score >= 80) return { tier: "excelente",  color: "#00C875", label: "Excelente" };
  if (score >= 60) return { tier: "bueno",      color: "#007A4A", label: "Bueno" };
  if (score >= 40) return { tier: "en_proceso", color: "#F59E0B", label: "En proceso" };
  return              { tier: "iniciando",       color: "#6B7280", label: "Iniciando" };
}

/** Compute PTI for a single user (by telefono) and write result to users table */
export async function computePTIForUser(telefono: string): Promise<PTIBreakdown> {
  const { db } = await import("@workspace/db");

  // ── 1. Payment streak (consecutive months) — max 25pts ──────────────────────
  const streakRow = await db.execute(sql`
    SELECT COALESCE(consecutive_payment_months, 0) AS streak_months
    FROM users WHERE telefono = ${telefono} LIMIT 1
  `);
  const streakMonths = Number((streakRow.rows[0] as Record<string,unknown>)?.streak_months ?? 0);
  const paymentStreakScore = Math.min(25, streakMonths);

  // ── 2. Biller diversity — max 15pts ─────────────────────────────────────────
  // bill_payments uses service_id (not empresa) as the biller identifier
  const billerRow = await db.execute(sql`
    SELECT COUNT(DISTINCT service_id)::int AS biller_count
    FROM bill_payments
    WHERE telefono = ${telefono}
      AND status IN ('completed','success','completed_ok')
  `);
  const billerCount = Number((billerRow.rows[0] as Record<string,unknown>)?.biller_count ?? 0);
  const billerDiversityScore = Math.min(15, billerCount * 5);

  // ── 3. KYC verified — max 15pts ─────────────────────────────────────────────
  const kycRow = await db.execute(sql`
    SELECT kyc_submitted_at IS NOT NULL AS verified
    FROM users WHERE telefono = ${telefono} LIMIT 1
  `);
  const kycVerified = Boolean((kycRow.rows[0] as Record<string,unknown>)?.verified);
  const kycScore = kycVerified ? 15 : 0;

  // ── 4. Wallet balance — max 15pts ────────────────────────────────────────────
  // wallets table has balance_mxn directly; joined to users via wallets.user_id = telefono
  const balanceRow = await db.execute(sql`
    SELECT COALESCE(balance_mxn, 0) AS balance
    FROM wallets
    WHERE user_id = ${telefono}
    LIMIT 1
  `);
  const currentBalance = Number((balanceRow.rows[0] as Record<string,unknown>)?.balance ?? 0);
  let walletScore = 0;
  if (currentBalance >= 500) walletScore = 15;
  else if (currentBalance >= 200) walletScore = 10;
  else if (currentBalance >= 50) walletScore = 5;

  // ── 5. Mission completions — max 15pts ───────────────────────────────────────
  const missionRow = await db.execute(sql`
    SELECT COUNT(*)::int AS completed_count
    FROM user_mission_progress
    WHERE telefono = ${telefono} AND completed_at IS NOT NULL
  `);
  const missionCount = Number((missionRow.rows[0] as Record<string,unknown>)?.completed_count ?? 0);
  const missionScore = Math.min(15, missionCount * 3);

  // ── 6. Load / spend ratio (last 90 days) — max 10pts ─────────────────────────
  // Loads: wallet_transactions joined through wallets (wallets.user_id = telefono)
  // Spend: bill_payments directly (has telefono column)
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
          AND status IN ('completed','success','completed_ok')
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
    if (loadSpendRatio >= 1.0) loadSpendScore = 10;
    else if (loadSpendRatio >= 0.7) loadSpendScore = 7;
    else if (loadSpendRatio >= 0.4) loadSpendScore = 4;
  }

  // ── 7. Account age — max 5pts ────────────────────────────────────────────────
  const ageRow = await db.execute(sql`
    SELECT EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400 AS days_old
    FROM users WHERE telefono = ${telefono} LIMIT 1
  `);
  const daysOld = Number((ageRow.rows[0] as Record<string,unknown>)?.days_old ?? 0);
  let accountAgeScore = 0;
  if (daysOld >= 90) accountAgeScore = 5;
  else if (daysOld >= 30) accountAgeScore = 3;
  else if (daysOld >= 7) accountAgeScore = 2;

  const total = Math.min(100,
    paymentStreakScore + billerDiversityScore + kycScore +
    walletScore + missionScore + loadSpendScore + accountAgeScore
  );

  const breakdown: PTIBreakdown = {
    payment_streak:      { score: paymentStreakScore, months: streakMonths, max: 25 },
    biller_diversity:    { score: billerDiversityScore, count: billerCount, max: 15 },
    kyc_verified:        { score: kycScore, verified: kycVerified, max: 15 },
    wallet_balance:      { score: walletScore, avg_balance_mxn: currentBalance, max: 15 },
    mission_completions: { score: missionScore, count: missionCount, max: 15 },
    load_spend_ratio:    { score: loadSpendScore, ratio: Math.round(loadSpendRatio * 100) / 100, max: 10 },
    account_age:         { score: accountAgeScore, days: Math.floor(daysOld), max: 5 },
    total,
  };

  // Persist to users table
  await db.execute(sql`
    UPDATE users SET
      pti_score             = ${total},
      pti_breakdown         = ${JSON.stringify(breakdown)}::jsonb,
      pti_computed_at       = NOW(),
      pti_first_computed_at = COALESCE(pti_first_computed_at, NOW())
    WHERE telefono = ${telefono}
  `);

  return breakdown;
}

/** Monthly batch: recompute PTI for all users + send WhatsApp notification */
export async function computePTIForAllUsers(): Promise<void> {
  const { db } = await import("@workspace/db");
  const startedAt = Date.now();
  logger.info("[PTI Monthly] Starting monthly PTI computation...");

  const allUsers = await db.execute(sql`
    SELECT telefono FROM users WHERE telefono IS NOT NULL AND telefono != ''
  `);
  const phones = allUsers.rows.map(r => (r as Record<string,unknown>).telefono as string);

  let updated = 0;
  let errors = 0;

  for (const telefono of phones) {
    try {
      const breakdown = await computePTIForUser(telefono);
      const { tier, label } = getPTITier(breakdown.total);

      // Only notify users with ≥1 completed transaction
      const txRow = await db.execute(sql`
        SELECT COUNT(*)::int AS tx_count
        FROM bill_payments
        WHERE telefono = ${telefono} AND status IN ('completed','success')
      `);
      const txCount = Number((txRow.rows[0] as Record<string,unknown>)?.tx_count ?? 0);

      if (txCount >= 1) {
        // Build personalised improvement tip
        const bd = breakdown;
        let tip = "¡Sigue usando PagoYa cada mes para subir tu puntaje!";
        if (bd.biller_diversity.count < 3) {
          tip = "Consejo: Paga 1 servicio diferente para sumar más puntos de diversidad.";
        } else if (!bd.kyc_verified.verified) {
          tip = "Consejo: Verifica tu identidad en la app para ganar +15 pts.";
        } else if (bd.payment_streak.months < 25) {
          tip = "Consejo: Sigue pagando cada mes para subir tu racha de pagos.";
        }

        const majorAchievement = getMajorAchievement(bd);

        const msg =
          `📊 *Tu PagoYa Trust Index se actualizó*\n\n` +
          `Tu puntaje este mes: *${bd.total}/100 — ${label}* ${tier === "excelente" ? "🏆" : tier === "bueno" ? "✅" : "📈"}\n\n` +
          `${majorAchievement}\n\n` +
          `${tip}\n\n` +
          `Ver tu puntaje completo: pagoyamx.com/inicio`;

        await sendWhatsApp(telefono, msg).catch(() => {});
      }

      updated++;
    } catch (err) {
      logger.error({ err, telefono }, "[PTI Monthly] user failed");
      errors++;
    }
    await new Promise(r => setTimeout(r, 50));
  }

  const elapsed = Date.now() - startedAt;
  logger.info(`[PTI Monthly] Complete: ${updated} users updated, ${errors} errors — ${elapsed}ms`);
}

function getMajorAchievement(bd: PTIBreakdown): string {
  const components = [
    { label: `${bd.payment_streak.months} mes${bd.payment_streak.months !== 1 ? "es" : ""} de pagos consecutivos 🔥`, score: bd.payment_streak.score },
    { label: `${bd.biller_diversity.count} servicios distintos pagados 🏢`, score: bd.biller_diversity.score },
    { label: `Identidad verificada 🪪`, score: bd.kyc_verified.score },
    { label: `${bd.mission_completions.count} misiones completadas 🏆`, score: bd.mission_completions.score },
    { label: `Saldo promedio de $${bd.wallet_balance.avg_balance_mxn.toFixed(0)} MXN 💰`, score: bd.wallet_balance.score },
  ];
  const best = components.sort((a, b) => b.score - a.score)[0];
  return best ? `Mayor logro: ${best.label}` : "¡Sigue construyendo tu historial!";
}
