// READ-ONLY, offline diff tool for B5 evidence gate (Phase 3 fair-lending spec §3.2 / T006).
//
// Purpose: compare computePTI (v4.3, live/user-facing) vs computePTIv5 (shadow)
// on REAL production users, without ever writing to production.
//
// This script does NOT connect to any database. It takes pre-fetched,
// read-only snapshot field values (obtained via the database skill's
// `executeSql({ environment: "production" })` — SELECT-only, no writes) and
// runs them through the two PURE scoring functions (computePTI, computePTIv5).
// Fields not covered by the read-only query (the 15 Stage-2 derived features,
// which are additive/zero-weight and confirmed ~0% populated in prod as of
// July 2026 per ptiDerivedFeatures / DERIVED_FEATURE_DEFAULTS) are left
// undefined so both functions fall back to the same DERIVED_FEATURE_DEFAULTS
// — an apples-to-apples comparison on the fields that actually drive score
// today.
//
// HOLD FOR APPROVAL: this script is intentionally NOT wired to any DB client
// and is not run automatically. Per instruction, it is built now and held —
// do not execute against a live connection or treat as final until approved.

import { computePTI, type PTIDataSnapshot } from "../services/pti";
import { computePTIv5 } from "../services/ptiV5";

// Raw rows exactly as returned by the read-only production query used to
// gather this data (see session evidence — one SELECT, environment:
// "production", SELECT-only enforced by the database skill).
interface RawRow {
  telefono: string;
  streak_months: string;
  advance_days: string;
  self_ratio: string;
  amount_cv: string;
  curiosity_idx: string;
  device_score: string;
  kyc_verified: boolean;
  kyc_tier: string;
  days_old: string;
  days_to_first_spei: string | null;
  oxxo_load_count: string;
  spei_load_count: string;
  card_load_count: string;
  pay_count: string;
  dom_stddev: string;
  dominant_day: string | null;
  login_days30: string;
  hour_std: string;
  scratch_plays: string;
  spin_plays: string;
  missions_done: string;
  load_count30: string;
  load_day_std: string;
  paula_interactions: string;
  confirmed_2fa: string;
  declined_2fa: string;
  push_opens: string;
  biller_count: string;
  utility_ratio: string | null;
  intent_clicks: string;
  hours_to_first: string | null;
  current_balance: string;
  total_loads: string;
  total_spend: string;
  p2p_send_count: string;
  p2p_recipient_count: string;
  late_count: string;
  recovered_count: string;
  median_minutes: string | null;
}

// Paste the CSV rows fetched from production (read-only SELECT, no writes)
// here. Populated below from the July 10 2026 evidence run.
const RAW_ROWS: RawRow[] = [
  { telefono: "5555550001", streak_months: "0", advance_days: "0", self_ratio: "0", amount_cv: "1", curiosity_idx: "0", device_score: "0", kyc_verified: false, kyc_tier: "simplified", days_old: "62.9636533390740741", days_to_first_spei: null, oxxo_load_count: "0", spei_load_count: "0", card_load_count: "0", pay_count: "0", dom_stddev: "15", dominant_day: null, login_days30: "0", hour_std: "12", scratch_plays: "0", spin_plays: "0", missions_done: "0", load_count30: "0", load_day_std: "30", paula_interactions: "0", confirmed_2fa: "0", declined_2fa: "0", push_opens: "0", biller_count: "0", utility_ratio: null, intent_clicks: "0", hours_to_first: null, current_balance: "0.00", total_loads: "0", total_spend: "0", p2p_send_count: "0", p2p_recipient_count: "0", late_count: "0", recovered_count: "0", median_minutes: null },
  { telefono: "+523222304213", streak_months: "0", advance_days: "0.00", self_ratio: "0.0000", amount_cv: "1.0000", curiosity_idx: "0.0000", device_score: "0", kyc_verified: false, kyc_tier: "simplified", days_old: "55.7730887134490741", days_to_first_spei: null, oxxo_load_count: "0", spei_load_count: "0", card_load_count: "0", pay_count: "0", dom_stddev: "15", dominant_day: null, login_days30: "9", hour_std: "9.3884924694901472", scratch_plays: "0", spin_plays: "0", missions_done: "0", load_count30: "1", load_day_std: "30", paula_interactions: "0", confirmed_2fa: "0", declined_2fa: "0", push_opens: "0", biller_count: "0", utility_ratio: null, intent_clicks: "0", hours_to_first: null, current_balance: "500.00", total_loads: "500.00", total_spend: "0", p2p_send_count: "0", p2p_recipient_count: "0", late_count: "0", recovered_count: "0", median_minutes: null },
  { telefono: "4157972483", streak_months: "0", advance_days: "0", self_ratio: "0", amount_cv: "1", curiosity_idx: "0", device_score: "0", kyc_verified: false, kyc_tier: "simplified", days_old: "28.9988258623611111", days_to_first_spei: null, oxxo_load_count: "0", spei_load_count: "0", card_load_count: "0", pay_count: "0", dom_stddev: "15", dominant_day: null, login_days30: "0", hour_std: "12", scratch_plays: "0", spin_plays: "0", missions_done: "0", load_count30: "0", load_day_std: "30", paula_interactions: "0", confirmed_2fa: "0", declined_2fa: "0", push_opens: "0", biller_count: "0", utility_ratio: null, intent_clicks: "0", hours_to_first: null, current_balance: "150.00", total_loads: "0", total_spend: "0", p2p_send_count: "0", p2p_recipient_count: "0", late_count: "0", recovered_count: "0", median_minutes: null },
  { telefono: "3221839799", streak_months: "0", advance_days: "0", self_ratio: "0", amount_cv: "1", curiosity_idx: "0", device_score: "0", kyc_verified: false, kyc_tier: "simplified", days_old: "28.7255200742939815", days_to_first_spei: null, oxxo_load_count: "0", spei_load_count: "0", card_load_count: "0", pay_count: "0", dom_stddev: "15", dominant_day: null, login_days30: "0", hour_std: "12", scratch_plays: "0", spin_plays: "0", missions_done: "0", load_count30: "0", load_day_std: "30", paula_interactions: "0", confirmed_2fa: "0", declined_2fa: "0", push_opens: "0", biller_count: "0", utility_ratio: null, intent_clicks: "0", hours_to_first: null, current_balance: "150.00", total_loads: "0", total_spend: "0", p2p_send_count: "0", p2p_recipient_count: "0", late_count: "0", recovered_count: "0", median_minutes: null },
  { telefono: "4251006528", streak_months: "0", advance_days: "0", self_ratio: "0", amount_cv: "1", curiosity_idx: "0", device_score: "0", kyc_verified: false, kyc_tier: "simplified", days_old: "28.7193254940625000", days_to_first_spei: null, oxxo_load_count: "0", spei_load_count: "0", card_load_count: "0", pay_count: "0", dom_stddev: "15", dominant_day: null, login_days30: "0", hour_std: "12", scratch_plays: "0", spin_plays: "0", missions_done: "0", load_count30: "0", load_day_std: "30", paula_interactions: "0", confirmed_2fa: "0", declined_2fa: "0", push_opens: "0", biller_count: "0", utility_ratio: null, intent_clicks: "0", hours_to_first: null, current_balance: "150.00", total_loads: "0", total_spend: "0", p2p_send_count: "0", p2p_recipient_count: "0", late_count: "0", recovered_count: "0", median_minutes: null },
  { telefono: "3221562382", streak_months: "0", advance_days: "0", self_ratio: "0", amount_cv: "1", curiosity_idx: "0", device_score: "0", kyc_verified: false, kyc_tier: "simplified", days_old: "14.9305360740162037", days_to_first_spei: null, oxxo_load_count: "0", spei_load_count: "0", card_load_count: "0", pay_count: "0", dom_stddev: "15", dominant_day: null, login_days30: "0", hour_std: "12", scratch_plays: "0", spin_plays: "0", missions_done: "0", load_count30: "0", load_day_std: "30", paula_interactions: "0", confirmed_2fa: "0", declined_2fa: "0", push_opens: "0", biller_count: "0", utility_ratio: null, intent_clicks: "0", hours_to_first: null, current_balance: "150.00", total_loads: "0", total_spend: "0", p2p_send_count: "0", p2p_recipient_count: "0", late_count: "0", recovered_count: "0", median_minutes: null },
  { telefono: "8118963105", streak_months: "0", advance_days: "0.00", self_ratio: "0.0000", amount_cv: "1.0000", curiosity_idx: "0.0000", device_score: "0", kyc_verified: false, kyc_tier: "simplified", days_old: "9.9708052907523148", days_to_first_spei: null, oxxo_load_count: "0", spei_load_count: "0", card_load_count: "0", pay_count: "0", dom_stddev: "15", dominant_day: null, login_days30: "4", hour_std: "2.0357199817646444", scratch_plays: "1", spin_plays: "0", missions_done: "0", load_count30: "0", load_day_std: "30", paula_interactions: "0", confirmed_2fa: "0", declined_2fa: "0", push_opens: "0", biller_count: "0", utility_ratio: null, intent_clicks: "0", hours_to_first: null, current_balance: "150.00", total_loads: "0", total_spend: "0", p2p_send_count: "0", p2p_recipient_count: "0", late_count: "0", recovered_count: "0", median_minutes: null },
  { telefono: "8143141695", streak_months: "0", advance_days: "0", self_ratio: "0", amount_cv: "1", curiosity_idx: "0", device_score: "0", kyc_verified: false, kyc_tier: "simplified", days_old: "9.9325143871527778", days_to_first_spei: null, oxxo_load_count: "0", spei_load_count: "0", card_load_count: "0", pay_count: "0", dom_stddev: "15", dominant_day: null, login_days30: "0", hour_std: "12", scratch_plays: "0", spin_plays: "0", missions_done: "0", load_count30: "0", load_day_std: "30", paula_interactions: "0", confirmed_2fa: "0", declined_2fa: "0", push_opens: "0", biller_count: "0", utility_ratio: null, intent_clicks: "0", hours_to_first: null, current_balance: "150.00", total_loads: "0", total_spend: "0", p2p_send_count: "0", p2p_recipient_count: "0", late_count: "0", recovered_count: "0", median_minutes: null },
  { telefono: "8111778514", streak_months: "0", advance_days: "0", self_ratio: "0", amount_cv: "1", curiosity_idx: "0", device_score: "0", kyc_verified: false, kyc_tier: "simplified", days_old: "4.0504226953703704", days_to_first_spei: null, oxxo_load_count: "0", spei_load_count: "0", card_load_count: "0", pay_count: "0", dom_stddev: "15", dominant_day: null, login_days30: "0", hour_std: "12", scratch_plays: "0", spin_plays: "0", missions_done: "0", load_count30: "0", load_day_std: "30", paula_interactions: "0", confirmed_2fa: "0", declined_2fa: "0", push_opens: "0", biller_count: "0", utility_ratio: null, intent_clicks: "0", hours_to_first: null, current_balance: "150.00", total_loads: "0", total_spend: "0", p2p_send_count: "0", p2p_recipient_count: "0", late_count: "0", recovered_count: "0", median_minutes: null },
];

function num(v: string | null | undefined, fallback: number): number {
  if (v === null || v === undefined || v === "") return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function toSnapshot(row: RawRow): PTIDataSnapshot {
  const latePaymentCount = num(row.late_count, 0);
  const recoveredCount = num(row.recovered_count, 0);
  return {
    streakMonths: num(row.streak_months, 0),
    payCount: num(row.pay_count, 0),
    domStddev: num(row.dom_stddev, 15),
    dominantDay: num(row.dominant_day, 0),
    advanceDays: num(row.advance_days, 0),
    selfRatio: num(row.self_ratio, 0),
    loginDays30: num(row.login_days30, 0),
    hourStd: num(row.hour_std, 12),
    scratchPlays: num(row.scratch_plays, 0),
    spinPlays: num(row.spin_plays, 0),
    missionsDone: num(row.missions_done, 0),
    loadCount30: num(row.load_count30, 0),
    loadDayStd: num(row.load_day_std, 30),
    paulaInteractions: num(row.paula_interactions, 0),
    confirmed2fa: num(row.confirmed_2fa, 0),
    declined2fa: num(row.declined_2fa, 0),
    pushOpens: num(row.push_opens, 0),
    curiosityIndex: num(row.curiosity_idx, 0),
    billerCount: num(row.biller_count, 0),
    kycVerified: row.kyc_verified,
    kycTier: row.kyc_tier,
    utilityRatio: num(row.utility_ratio, 0),
    intentClicks: num(row.intent_clicks, 0),
    hoursToFirst: row.hours_to_first === null ? NaN : num(row.hours_to_first, NaN),
    deviceScore: num(row.device_score, 0),
    currentBalance: num(row.current_balance, 0),
    totalLoads: num(row.total_loads, 0),
    totalSpend: num(row.total_spend, 0),
    amountCV: num(row.amount_cv, 1),
    p2pSendCount: num(row.p2p_send_count, 0),
    p2pRecipientCount: num(row.p2p_recipient_count, 0),
    daysOld: num(row.days_old, 0),
    daysToFirstSpei: row.days_to_first_spei === null ? NaN : num(row.days_to_first_spei, NaN),
    oxxoLoadCount: num(row.oxxo_load_count, 0),
    speiLoadCount: num(row.spei_load_count, 0),
    cardLoadCount: num(row.card_load_count, 0),
    latePaymentCount,
    lateRecoveryRatio: latePaymentCount > 0 ? recoveredCount / latePaymentCount : NaN,
    paulaResponseLatencyMinutes: row.median_minutes === null ? NaN : num(row.median_minutes, NaN),
  } as PTIDataSnapshot;
}

function main() {
  console.log("=".repeat(100));
  console.log("PTI v4.3 (live) vs v5.0 (shadow) — READ-ONLY prod diff, no writes performed");
  console.log(`Users compared: ${RAW_ROWS.length} (all real production users as of 2026-07-10)`);
  console.log("Non-derived fields sourced via SELECT-only production query.");
  console.log("15 Stage-2 derived fields NOT queried — both models fall back to the same");
  console.log("DERIVED_FEATURE_DEFAULTS, since prod population for those fields is ~0%.");
  console.log("=".repeat(100));

  const rows: Array<{
    telefono: string;
    v43Score: number;
    v5Score: number;
    delta: number;
  }> = [];

  for (const raw of RAW_ROWS) {
    const snapshot = toSnapshot(raw);
    const v43 = computePTI(snapshot);
    const v5 = computePTIv5(snapshot);
    const v43Score = v43.breakdown.total;
    const v5Score = v5.breakdown.total;
    rows.push({ telefono: raw.telefono, v43Score, v5Score, delta: v5Score - v43Score });
  }

  console.log(
    "telefono".padEnd(16) + "v4.3".padStart(8) + "v5.0".padStart(8) + "delta".padStart(8),
  );
  for (const r of rows) {
    console.log(
      r.telefono.padEnd(16) +
        r.v43Score.toFixed(2).padStart(8) +
        r.v5Score.toFixed(2).padStart(8) +
        (r.delta >= 0 ? "+" : "") + r.delta.toFixed(2).padStart(7),
    );
  }

  const deltas = rows.map((r) => r.delta);
  const maxAbsDelta = Math.max(...deltas.map((d) => Math.abs(d)));
  const meanDelta = deltas.reduce((a, b) => a + b, 0) / deltas.length;

  console.log("-".repeat(100));
  console.log(`Max |delta|: ${maxAbsDelta.toFixed(2)}   Mean delta: ${meanDelta.toFixed(2)}`);
  console.log("=".repeat(100));
}

main();
