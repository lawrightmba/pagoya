import { normalizePhone } from "../lib/phoneUtils.js";

/**
 * readinessGate.ts — Sprint 6
 *
 * Evaluates the 6-criteria readiness gate for a user, writes a
 * readiness_assessments row (every evaluation is recorded for audit + admin
 * dashboard), and returns a ReadinessResult for use by evaluateTriggersForUser.
 *
 * Hard gate (READY):       PTI ≥ 80, streak criterion (see below), diversity ≥ 3,
 *                          KYC verified, zero fraud flags, literacy ≥ 3
 * Soft gate (APPROACHING): PTI ≥ 70, streak ≥ 60d, all other hard criteria met
 * Otherwise:               NOT_YET
 *
 * ── GATE G-C (Phase B3, PTI v5.0 fair-lending remediation) ─────────────────
 * Streak criterion AS SIGNED (program-record.md signature record item 2,
 * founder-signed 2026-07-09; verbatim credit-committee text in
 * docs/fair-lending/phase2-frontier.md): a volatility-tolerant streak —
 * "3 consecutive months, or 2 consecutive months with ≥6 lifetime
 * payments — one-interruption forgiveness targeting income-regularity
 * screening without relaxing payment depth." All other hard criteria
 * (PTI 80, diversity 3, KYC, fraud, literacy) are UNCHANGED — the spec is
 * explicit that "fraud-free and literacy criteria unchanged."
 *
 * This is a REAL-DATA-GROUNDED gate change, not a scoring change: it does
 * not touch computePTI/computePTIv5 or any point value, only which
 * lifetime payment history satisfies the streak criterion for handoff
 * readiness. Per the signed monitoring spec (§3.3 item 5), every
 * evaluation that clears the gate specifically via the tolerant branch
 * (i.e. would NOT have cleared under the old ≥90-day-only rule) is logged
 * and persisted (`tolerant_streak_branch_used`) as a standing real-data
 * instrument, monitored for whether the branch admits materially more
 * low-marginación users than the synthetic package predicted (documented
 * synthetic-null baseline: zero).
 *
 * The SOFT (APPROACHING) gate's streak threshold is untouched — the signed
 * gate text only speaks to the hard READY criterion.
 */

import { sql } from "drizzle-orm";
import type { UserContext } from "./messageEngine.js";

// ── Gate thresholds ────────────────────────────────────────────────────────────
const HARD_PTI         = 80;
const HARD_STREAK_DAYS = 90;
const HARD_DIVERSITY   = 3;
const HARD_LITERACY    = 3;

const SOFT_PTI         = 70;
const SOFT_STREAK_DAYS = 60;

// Gate G-C (signed 2026-07-09) — volatility-tolerant streak branch: 3
// consecutive months, OR 2 consecutive months with >=6 lifetime payments.
const TOLERANT_STREAK_MONTHS         = 2;
const TOLERANT_STREAK_MIN_LIFETIME_PAYMENTS = 6;
const STANDARD_STREAK_MONTHS         = 3; // == HARD_STREAK_DAYS at 30d/mo

// ── Types ──────────────────────────────────────────────────────────────────────
export type ReadinessStatus = "READY" | "APPROACHING" | "NOT_YET";

export interface ReadinessResult {
  status:             ReadinessStatus;
  assessmentId:       number;
  partnerProgramId:   number;
  partnerDisplayName: string;
  topGapLabel:        string;   // human-readable label for {{top_gap}} template var
  streakDays:         number;   // for {{streak_days}} injection
  billDiversity:      number;   // for {{bill_diversity}} injection
  tolerantStreakBranchUsed: boolean; // Gate G-C real-data monitor (§3.3 item 5)
  gaps: {
    pti:        number;
    streakDays: number;
    diversity:  number;
    literacy:   number;
  };
}

type Database = any;

// ── Main evaluation ────────────────────────────────────────────────────────────
export async function evaluateReadiness(
  db: Database,
  telefono: string,
  ctx: UserContext,
): Promise<ReadinessResult> {
  const tel10 = normalizePhone(telefono);

  // ── KYC verified + streak days ────────────────────────────────────────────
  const kycRow = await db.execute(sql`
    SELECT
      (kyc_full_name IS NOT NULL AND kyc_full_name != '') AS kyc_verified,
      COALESCE(consecutive_payment_months, 0)             AS streak_months,
      COALESCE(consecutive_payment_months * 30, 0)        AS streak_days
    FROM users WHERE telefono = ${tel10} LIMIT 1
  `);
  const ku = (kycRow.rows[0] as Record<string, unknown>) ?? {};
  const kycVerified  = Boolean(ku.kyc_verified);
  const streakDays   = Number(ku.streak_days ?? 0);
  const streakMonths = Number(ku.streak_months ?? 0);

  // ── Lifetime payment count (Gate G-C tolerant branch input) ────────────────
  const lifetimeRow = await db.execute(sql`
    SELECT COUNT(*) AS lifetime_payments
    FROM bill_payments
    WHERE telefono = ${tel10}
      AND status IN ('completed', 'success', 'completed_ok', 'confirmed')
  `);
  const lifetimePaymentCount = Number(
    (lifetimeRow.rows[0] as Record<string, unknown>)?.lifetime_payments ?? 0,
  );

  // ── Fraud flags ───────────────────────────────────────────────────────────
  const fraudRow = await db.execute(sql`
    SELECT COUNT(*) AS flag_count FROM bonus_fraud_flags WHERE telefono = ${tel10}
  `);
  const fraudFlags = Number(
    (fraudRow.rows[0] as Record<string, unknown>)?.flag_count ?? 0,
  );

  // ── Bill diversity (distinct completed service types) ─────────────────────
  const divRow = await db.execute(sql`
    SELECT COUNT(DISTINCT service_name) AS diversity
    FROM bill_payments
    WHERE telefono = ${tel10}
      AND status IN ('completed', 'success', 'completed_ok', 'confirmed')
  `);
  const billDiversity = Number(
    (divRow.rows[0] as Record<string, unknown>)?.diversity ?? 0,
  );

  // ── Partner program (first active row — named partners slot in later) ─────
  const partnerRow = await db.execute(sql`
    SELECT id, display_name FROM partner_programs WHERE active = true LIMIT 1
  `);
  const pr = (partnerRow.rows[0] as Record<string, unknown>) ?? {};
  const partnerProgramId   = Number(pr.id ?? 1);
  const partnerDisplayName = String(pr.display_name ?? "instituciones de microcrédito");

  const ptiScore      = ctx.pti_score;
  const literacyScore = ctx.financial_literacy_score;

  // ── Evaluate criteria ──────────────────────────────────────────────────────
  // Gate G-C streak criterion (signed 2026-07-09): 3 consecutive months,
  // OR 2 consecutive months with >=6 lifetime payments (tolerant branch).
  const streakMetStandard  = streakMonths >= STANDARD_STREAK_MONTHS;
  const streakMetTolerant  =
    streakMonths >= TOLERANT_STREAK_MONTHS &&
    lifetimePaymentCount >= TOLERANT_STREAK_MIN_LIFETIME_PAYMENTS;
  const streakMet = streakMetStandard || streakMetTolerant;
  // Real-data monitoring instrument (§3.3 item 5): true only when the
  // tolerant branch is what admitted this user (i.e. standard branch alone
  // would NOT have passed).
  const tolerantStreakBranchUsed = !streakMetStandard && streakMetTolerant;

  const hardMet = {
    pti:       ptiScore      >= HARD_PTI,
    streak:    streakMet,
    diversity: billDiversity >= HARD_DIVERSITY,
    kyc:       kycVerified,
    fraud:     fraudFlags    === 0,
    literacy:  literacyScore >= HARD_LITERACY,
  };
  const allHardMet = Object.values(hardMet).every(Boolean);

  const softMet =
    ptiScore    >= SOFT_PTI         &&
    streakDays  >= SOFT_STREAK_DAYS &&
    hardMet.diversity               &&
    hardMet.kyc                     &&
    hardMet.fraud                   &&
    hardMet.literacy;

  const status: ReadinessStatus = allHardMet ? "READY" : softMet ? "APPROACHING" : "NOT_YET";

  // ── Compute numeric gaps (0 = criterion already met) ──────────────────────
  // streakDays gap reflects Gate G-C: 0 once EITHER branch is satisfied;
  // otherwise reports days remaining to the nearer of the two branches.
  const daysToStandard = Math.max(0, HARD_STREAK_DAYS - streakDays);
  const daysToTolerant =
    lifetimePaymentCount >= TOLERANT_STREAK_MIN_LIFETIME_PAYMENTS
      ? Math.max(0, TOLERANT_STREAK_MONTHS * 30 - streakDays)
      : Infinity;
  const gaps = {
    pti:        Math.max(0, HARD_PTI       - ptiScore),
    streakDays: streakMet ? 0 : Math.min(daysToStandard, daysToTolerant),
    diversity:  Math.max(0, HARD_DIVERSITY - billDiversity),
    literacy:   Math.max(0, HARD_LITERACY  - literacyScore),
  };

  // ── Rank gaps ascending — closest to 0 (but > 0) surfaces first ──────────
  const gapEntries: Array<{ key: string; gap: number; label: string }> = [
    {
      key: "pti", gap: gaps.pti,
      label: `${gaps.pti} punto${gaps.pti !== 1 ? "s" : ""} más de PTI`,
    },
    {
      key: "streakDays", gap: gaps.streakDays,
      label: `${gaps.streakDays} día${gaps.streakDays !== 1 ? "s" : ""} más de pagos consecutivos`,
    },
    {
      key: "diversity", gap: gaps.diversity,
      label: `${gaps.diversity} tipo${gaps.diversity !== 1 ? "s" : ""} de servicio más`,
    },
    {
      key: "literacy", gap: gaps.literacy,
      label: `${gaps.literacy} módulo${gaps.literacy !== 1 ? "s" : ""} educativo${gaps.literacy !== 1 ? "s" : ""} más`,
    },
  ]
    .filter(e => e.gap > 0)
    .sort((a, b) => a.gap - b.gap);

  // Binary criteria appended after numeric — no distance to sort by
  if (!hardMet.kyc)   gapEntries.push({ key: "kyc",   gap: 1, label: "completar tu verificación de identidad" });
  if (!hardMet.fraud) gapEntries.push({ key: "fraud",  gap: 1, label: "resolver un registro pendiente de la cuenta" });

  const topGapLabel = gapEntries[0]?.label ?? "mantener tu ritmo de pagos";

  // ── Write assessment row — every evaluation is recorded ───────────────────
  const insertResult = await db.execute(sql`
    INSERT INTO readiness_assessments (
      telefono, gate_status,
      pti_score_at, streak_days_at, bill_diversity_at,
      kyc_verified_at, fraud_flags_at, literacy_score_at,
      gap_pti, gap_streak_days, gap_diversity, gap_literacy,
      partner_program_id,
      tolerant_streak_branch_used, streak_months_at, lifetime_payment_count_at
    ) VALUES (
      ${tel10}, ${status},
      ${ptiScore}, ${streakDays}, ${billDiversity},
      ${kycVerified}, ${fraudFlags}, ${literacyScore},
      ${gaps.pti}, ${gaps.streakDays}, ${gaps.diversity}, ${gaps.literacy},
      ${partnerProgramId},
      ${tolerantStreakBranchUsed}, ${streakMonths}, ${lifetimePaymentCount}
    )
    RETURNING id
  `);
  const assessmentId = Number(
    (insertResult.rows[0] as Record<string, unknown>).id,
  );

  return {
    status,
    assessmentId,
    partnerProgramId,
    partnerDisplayName,
    topGapLabel,
    streakDays,
    billDiversity,
    tolerantStreakBranchUsed,
    gaps,
  };
}

// ── Partner display name helper (importable without circular deps) ─────────────
export async function getPartnerDisplayName(db: Database): Promise<string> {
  try {
    const r = await db.execute(sql`
      SELECT display_name FROM partner_programs WHERE active = true LIMIT 1
    `);
    return String(
      (r.rows[0] as Record<string, unknown>)?.display_name
        ?? "instituciones de microcrédito",
    );
  } catch {
    return "instituciones de microcrédito";
  }
}
