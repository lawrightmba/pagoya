/**
 * PTI Stress Test — synthetic population runner + report (DEV/LOCAL ONLY)
 * ============================================================================
 * Generates a synthetic population (syntheticPopulation.ts) and runs EVERY
 * profile through the real, unmodified scoring engine (computePTI /
 * getPTITier from pti.ts) plus the real pure fair-lending adjustment
 * (computeFairLendingAdjustment from fairLendingAdjustment.ts). Produces a
 * console report covering distribution, cold-start, tier boundaries,
 * fair-lending caps, disparate-impact proxy leakage, and gaming resistance.
 *
 * Writes NOTHING to any database. No env flags are read for scoring — the
 * fair-lending flag state is constructed in-memory so the pure clamp logic is
 * exercised without touching prod gating or the DB.
 *
 * Run:  pnpm --filter @workspace/api-server exec tsx src/scripts/ptiStressTest.ts
 */

import { computePTI, getPTITier, PTI_MODEL_VERSION, type PTIDataSnapshot } from "../services/pti.js";
import {
  computeFairLendingAdjustment,
  type AdjustmentFlagState,
} from "../services/fairLendingAdjustment.js";
import { FAIR_LENDING_MAPPING_VERSION } from "../config/fairLendingMapping.js";
import { generatePopulation, type SyntheticUser, type Segment } from "../services/syntheticPopulation.js";

// ─── Small stat helpers ───────────────────────────────────────────────────────

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const stddev = (xs: number[]) => {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1));
};
const median = (xs: number[]) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};
const pct = (xs: number[], p: number) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[clampInt(Math.round((p / 100) * (s.length - 1)), 0, s.length - 1)];
};
const clampInt = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
const fmt = (x: number, d = 2) => (Number.isFinite(x) ? x.toFixed(d) : String(x));

function line(char = "─", n = 78) {
  return char.repeat(n);
}
function header(title: string) {
  console.log("\n" + line("═"));
  console.log("  " + title);
  console.log(line("═"));
}

// Cohen's d effect size between two samples.
function cohensD(a: number[], b: number[]): number {
  if (a.length < 2 || b.length < 2) return 0;
  const ma = mean(a);
  const mb = mean(b);
  const va = stddev(a) ** 2;
  const vb = stddev(b) ** 2;
  const pooled = Math.sqrt(((a.length - 1) * va + (b.length - 1) * vb) / (a.length + b.length - 2));
  return pooled === 0 ? 0 : (ma - mb) / pooled;
}

// ─── Score every synthetic user through the REAL engine ───────────────────────

interface Scored {
  user: SyntheticUser;
  base: number;
  tier: string;
  prScore: number;
  bcScore: number;
  edScore: number;
  cfScore: number;
  anomaly: string | null; // NaN / Infinity / out-of-range / threw
}

function scoreAll(pop: SyntheticUser[]): Scored[] {
  const out: Scored[] = [];
  for (const user of pop) {
    // Pass ONLY the PTIDataSnapshot fields (metadata excluded by construction —
    // computePTI destructures named fields, ignoring extras, but we build a
    // clean snapshot to be explicit that colonia/income never reach it).
    const snap = toSnapshot(user);
    let base = NaN;
    let tier = "?";
    let pr = NaN;
    let bc = NaN;
    let ed = NaN;
    let cf = NaN;
    let anomaly: string | null = null;
    try {
      const { breakdown } = computePTI(snap);
      base = breakdown.total;
      pr = breakdown.payment_reliability.score;
      bc = breakdown.behavioral_consistency.score;
      ed = breakdown.engagement_depth.score;
      cf = breakdown.cashflow_stability.score;
      tier = getPTITier(base).tier;
      if (!Number.isFinite(base)) anomaly = `non-finite total (${base})`;
      else if (base < 0 || base > 100) anomaly = `out-of-range total (${base})`;
      else if ([pr, bc, ed, cf].some((x) => !Number.isFinite(x))) anomaly = "non-finite dimension";
      else if (pr < 0 || bc < 0 || ed < 0 || cf < 0) anomaly = "negative dimension";
      else if (pr > 30 || bc > 20 || ed > 25 || cf > 25) anomaly = "dimension over max";
    } catch (err) {
      anomaly = `threw: ${(err as Error).message}`;
    }
    out.push({ user, base, tier, prScore: pr, bcScore: bc, edScore: ed, cfScore: cf, anomaly });
  }
  return out;
}

function toSnapshot(u: SyntheticUser): PTIDataSnapshot {
  const {
    streakMonths, payCount, domStddev, dominantDay, advanceDays, selfRatio,
    loginDays30, hourStd, scratchPlays, spinPlays, missionsDone, loadCount30, loadDayStd,
    paulaInteractions, confirmed2fa, declined2fa, pushOpens, curiosityIndex,
    billerCount, kycVerified, kycTier, utilityRatio, intentClicks, hoursToFirst, deviceScore,
    currentBalance, totalLoads, totalSpend, amountCV, p2pSendCount, p2pRecipientCount, daysOld,
    daysToFirstSpei, oxxoLoadCount, speiLoadCount, cardLoadCount,
    lateRecoveryRatio, latePaymentCount, paulaResponseLatencyMinutes,
    paymentTimingMeanDaysFromDue, paymentTimingVarianceDaysFromDue,
    activityVelocity30d, interEventRegularityScore,
  } = u;
  return {
    streakMonths, payCount, domStddev, dominantDay, advanceDays, selfRatio,
    loginDays30, hourStd, scratchPlays, spinPlays, missionsDone, loadCount30, loadDayStd,
    paulaInteractions, confirmed2fa, declined2fa, pushOpens, curiosityIndex,
    billerCount, kycVerified, kycTier, utilityRatio, intentClicks, hoursToFirst, deviceScore,
    currentBalance, totalLoads, totalSpend, amountCV, p2pSendCount, p2pRecipientCount, daysOld,
    daysToFirstSpei, oxxoLoadCount, speiLoadCount, cardLoadCount,
    lateRecoveryRatio, latePaymentCount, paulaResponseLatencyMinutes,
    paymentTimingMeanDaysFromDue, paymentTimingVarianceDaysFromDue,
    activityVelocity30d, interEventRegularityScore,
  };
}

// ─── Report sections ──────────────────────────────────────────────────────────

const BUGS: string[] = [];
function flagBug(msg: string) {
  BUGS.push(msg);
}

function reportPopulation(pop: SyntheticUser[]) {
  header("1. POPULATION SUMMARY");
  const counts = new Map<Segment, number>();
  for (const u of pop) counts.set(u._segment, (counts.get(u._segment) ?? 0) + 1);
  console.log(`  Total synthetic users: ${pop.length}`);
  console.log(`  Model version under test: ${PTI_MODEL_VERSION}`);
  console.log(`  Fair-lending mapping version: ${FAIR_LENDING_MAPPING_VERSION}`);
  console.log("  Segment breakdown:");
  for (const [seg, n] of [...counts.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`    ${seg.padEnd(28)} ${String(n).padStart(6)}  (${fmt((n / pop.length) * 100, 1)}%)`);
  }
}

function reportDistribution(scored: Scored[]) {
  header("2. SCORE DISTRIBUTION (full population)");
  const valid = scored.filter((s) => s.anomaly === null);
  const scores = valid.map((s) => s.base);
  console.log(`  n (valid) = ${scores.length}   n (anomalous) = ${scored.length - valid.length}`);
  console.log(
    `  min=${fmt(Math.min(...scores), 0)}  p10=${fmt(pct(scores, 10), 0)}  p25=${fmt(pct(scores, 25), 0)}  ` +
      `median=${fmt(median(scores), 0)}  mean=${fmt(mean(scores), 1)}  p75=${fmt(pct(scores, 75), 0)}  ` +
      `p90=${fmt(pct(scores, 90), 0)}  max=${fmt(Math.max(...scores), 0)}  sd=${fmt(stddev(scores), 1)}`,
  );

  // Histogram — bins of 5.
  console.log("\n  Histogram (bin width 5):");
  const bins = new Array(21).fill(0);
  for (const s of scores) bins[clampInt(Math.floor(s / 5), 0, 20)]++;
  const maxBin = Math.max(...bins);
  for (let i = 0; i < bins.length; i++) {
    const lo = i * 5;
    const label = i === 20 ? "100" : `${lo}-${lo + 4}`;
    const barLen = maxBin ? Math.round((bins[i] / maxBin) * 50) : 0;
    console.log(`    ${label.padStart(6)} | ${"█".repeat(barLen).padEnd(50)} ${bins[i]}`);
  }

  // Tier distribution (actual cutoffs 40/60/80).
  console.log("\n  Tier distribution (getPTITier — real cutoffs 40/60/80):");
  const tierCounts = new Map<string, number>();
  for (const s of valid) tierCounts.set(s.tier, (tierCounts.get(s.tier) ?? 0) + 1);
  for (const t of ["iniciando", "en_proceso", "bueno", "excelente"]) {
    const n = tierCounts.get(t) ?? 0;
    console.log(`    ${t.padEnd(12)} ${String(n).padStart(6)}  (${fmt((n / valid.length) * 100, 1)}%)`);
  }

  // Dimension saturation — are any dimensions pinned at max/min for most users?
  console.log("\n  Dimension means (max): PR/30, BC/20, ED/25, CF/25:");
  console.log(
    `    PR=${fmt(mean(valid.map((s) => s.prScore)), 1)}  BC=${fmt(mean(valid.map((s) => s.bcScore)), 1)}  ` +
      `ED=${fmt(mean(valid.map((s) => s.edScore)), 1)}  CF=${fmt(mean(valid.map((s) => s.cfScore)), 1)}`,
  );

  // Sanity checks.
  if (mean(scores) < 5 || mean(scores) > 95) {
    flagBug(`Score distribution mean (${fmt(mean(scores), 1)}) is pinned near an extreme — distribution may be degenerate.`);
  }
}

function reportColdStart(scored: Scored[]) {
  header("3. COLD-START BEHAVIOR (sparse / 1–2 data points)");
  const cold = scored.filter((s) => s.user._segment === "cold_start_sparse");
  const scores = cold.map((s) => s.base);
  const threw = cold.filter((s) => s.anomaly && s.anomaly.startsWith("threw"));
  const nonFinite = cold.filter((s) => s.anomaly && !s.anomaly.startsWith("threw"));

  console.log(`  n = ${cold.length}`);
  console.log(`  score range: ${fmt(Math.min(...scores), 0)}–${fmt(Math.max(...scores), 0)}  mean=${fmt(mean(scores), 2)}`);
  console.log(`  exceptions thrown: ${threw.length}`);
  console.log(`  non-finite / out-of-range scores: ${nonFinite.length}`);

  // Also verify: across the WHOLE population, no NaN leaked from the NaN-carrying
  // fields (hoursToFirst, daysToFirstSpei, lateRecoveryRatio, paulaLatency).
  const allNaN = scored.filter((s) => !Number.isFinite(s.base));
  console.log(`  whole-population non-finite totals: ${allNaN.length}`);

  if (threw.length > 0) flagBug(`Cold-start: ${threw.length} profiles threw during scoring: e.g. "${threw[0].anomaly}".`);
  if (nonFinite.length > 0) flagBug(`Cold-start: ${nonFinite.length} profiles produced non-finite/out-of-range scores.`);
  if (allNaN.length > 0) flagBug(`${allNaN.length} profiles across the population produced non-finite totals (NaN leak from NaN-typed fields?).`);
  if (Math.max(...scores) > 40) {
    flagBug(`Cold-start sparse profile scored ${fmt(Math.max(...scores), 0)} (> en_proceso boundary) despite ≤2 data points — unexpectedly high.`);
  }
  if (threw.length === 0 && nonFinite.length === 0 && allNaN.length === 0) {
    console.log("  → Degrades gracefully: no throws, no NaN/Infinity, all scores in [0,100].");
  }
}

function reportTierBoundaries(scored: Scored[]) {
  header("4. TIER BOUNDARY BEHAVIOR");
  const valid = scored.filter((s) => s.anomaly === null);

  // Confirm getPTITier transitions cleanly at its REAL cutoffs.
  const realCuts = [40, 60, 80];
  console.log("  Real getPTITier cutoffs = 40 / 60 / 80.");
  console.log("  Verifying every scored profile maps to the correct tier for its score:");
  let mismatches = 0;
  for (const s of valid) {
    const expected =
      s.base >= 80 ? "excelente" : s.base >= 60 ? "bueno" : s.base >= 40 ? "en_proceso" : "iniciando";
    if (s.tier !== expected) mismatches++;
  }
  console.log(`    tier/score mismatches: ${mismatches}`);
  if (mismatches > 0) flagBug(`${mismatches} profiles have a tier inconsistent with getPTITier's own cutoffs.`);

  // Spot-check density + transition just below/above each real cutoff.
  for (const c of realCuts) {
    const below = valid.filter((s) => s.base === c - 1);
    const at = valid.filter((s) => s.base === c);
    const belowTiers = new Set(below.map((s) => s.tier));
    const atTiers = new Set(at.map((s) => s.tier));
    console.log(
      `    boundary ${c}: score=${c - 1} → {${[...belowTiers].join(",") || "—"}} (n=${below.length}); ` +
        `score=${c} → {${[...atTiers].join(",") || "—"}} (n=${at.length})`,
    );
  }

  // Address the brief's requested boundaries (30/50/65) which are NOT real cutoffs.
  console.log("\n  NOTE — brief also referenced boundaries 30 / 50 / 65 / 80.");
  console.log("  Only 80 is a real cutoff. 30, 50, 65 are NOT tier boundaries in getPTITier.");
  for (const c of [30, 50, 65]) {
    const at = valid.filter((s) => s.base === c);
    const tiers = new Set(at.map((s) => s.tier));
    console.log(`    score=${c} → tier {${[...tiers].join(",") || "—"}} (n=${at.length}) [interior, no transition here]`);
  }
  flagBug(
    "SPEC DISCREPANCY (not a code bug): brief lists tier boundaries 30/50/65/80, but getPTITier uses 40/60/80. " +
      "30/50/65 are mid-tier interior values. Confirm whether the brief or the code has the intended cutoffs.",
  );
}

function makeFlagState(capOverride: number | null): AdjustmentFlagState {
  return {
    enabled: true,
    reasonIfDisabled: null,
    flagRequested: true,
    gatePassed: true,
    mappingVersion: FAIR_LENDING_MAPPING_VERSION,
    adjustmentCapOverride: capOverride,
  };
}

function reportFairLendingCaps(pop: SyntheticUser[]) {
  header("5. FAIR-LENDING ADJUSTMENT CAPS (±5 pass / ±2 conditional)");

  const passState = makeFlagState(null); // cap ±5
  const condState = makeFlagState(2);    // cap ±2

  let maxAbsPass = 0;
  let maxAbsCond = 0;
  let breaches = 0;
  let nonZero = 0;
  for (const u of pop) {
    const fl = { colonia: u.colonia, coloniaTier: u.coloniaTier, declaredIncomeBucket: u.declaredIncomeBucket };
    const p = computeFairLendingAdjustment(fl, passState);
    const c = computeFairLendingAdjustment(fl, condState);
    maxAbsPass = Math.max(maxAbsPass, Math.abs(p.adjustment));
    maxAbsCond = Math.max(maxAbsCond, Math.abs(c.adjustment));
    if (p.adjustment !== 0 || c.adjustment !== 0) nonZero++;
    if (Math.abs(p.adjustment) > 5 || Math.abs(c.adjustment) > 2) breaches++;
  }

  console.log(`  users evaluated: ${pop.length}`);
  console.log(`  max |adjustment| under pass cap (±5):        ${fmt(maxAbsPass, 2)}`);
  console.log(`  max |adjustment| under conditional cap (±2): ${fmt(maxAbsCond, 2)}`);
  console.log(`  cap breaches: ${breaches}`);
  console.log(`  non-zero adjustments: ${nonZero}`);
  console.log("\n  CAVEAT: FAIR_LENDING_MAPPING ships as an all-zero placeholder (pending");
  console.log("  bias-testing sign-off), so every adjustment is exactly 0 by construction.");
  console.log("  The ±5/±2 clamp is therefore trivially satisfied here — this confirms the");
  console.log("  cap is never EXCEEDED, but does not exercise a non-zero clamp. The clamp math");
  console.log("  itself is covered by fairLendingAdjustment.test.ts with non-zero values.");

  if (breaches > 0) flagBug(`Fair-lending: ${breaches} adjustments exceeded their cap — clamp logic failure.`);
}

function reportDisparateImpact(scored: Scored[]) {
  header("6. DISPARATE-IMPACT / PROXY-LEAKAGE CHECK (metadata NOT scored)");
  const valid = scored.filter((s) => s.anomaly === null);

  console.log("  colonia, coloniaTier and declaredIncomeBucket are NEVER inputs to computePTI.");
  console.log("  This groups the resulting scores by those excluded variables to detect whether");
  console.log("  they leak into the score via correlated behavioral proxies (device, KYC,");
  console.log("  funding-rail mix, balances).\n");

  // Group by income bucket.
  const byBucket = new Map<string, number[]>();
  for (const s of valid) {
    const k = s.user.declaredIncomeBucket;
    if (!byBucket.has(k)) byBucket.set(k, []);
    byBucket.get(k)!.push(s.base);
  }
  const bucketOrder = ["bucket_1_lowest", "bucket_2", "bucket_3", "bucket_4", "bucket_5_highest"];
  console.log("  By declared income bucket:");
  const approvalThreshold = 60; // "bueno" and above = illustrative approval bar
  const rates: { key: string; rate: number; n: number; mean: number }[] = [];
  for (const k of bucketOrder) {
    const xs = byBucket.get(k) ?? [];
    if (!xs.length) continue;
    const rate = xs.filter((x) => x >= approvalThreshold).length / xs.length;
    rates.push({ key: k, rate, n: xs.length, mean: mean(xs) });
    console.log(
      `    ${k.padEnd(16)} n=${String(xs.length).padStart(5)}  mean=${fmt(mean(xs), 1).padStart(5)}  ` +
        `≥${approvalThreshold} rate=${fmt(rate * 100, 1)}%`,
    );
  }
  const maxRate = Math.max(...rates.map((r) => r.rate));
  const minRate = Math.min(...rates.map((r) => r.rate));
  const fourFifths = maxRate > 0 ? minRate / maxRate : 1;
  console.log(`    → four-fifths ratio (min/max selection rate) = ${fmt(fourFifths, 3)} (rule-of-thumb pass ≥ 0.80)`);

  // Effect size: lowest vs highest bucket.
  const lowXs = byBucket.get("bucket_1_lowest") ?? [];
  const highXs = byBucket.get("bucket_5_highest") ?? [];
  const d = cohensD(highXs, lowXs);
  console.log(`    → mean score gap (highest−lowest) = ${fmt(mean(highXs) - mean(lowXs), 1)} pts, Cohen's d = ${fmt(d, 2)}`);

  // Sensitivity: recompute on the "normal" segment ONLY, which excludes the
  // gradient_sweep / gaming / contradictory segments whose latent factors are
  // deliberately coupled. If the effect largely persists here, it is a property
  // of the model reacting to correlated proxies, not an artifact of those
  // stress segments.
  const normal = valid.filter((s) => s.user._segment === "normal");
  const nLow = normal.filter((s) => s.user.declaredIncomeBucket === "bucket_1_lowest").map((s) => s.base);
  const nHigh = normal.filter((s) => s.user.declaredIncomeBucket === "bucket_5_highest").map((s) => s.base);
  if (nLow.length && nHigh.length) {
    const nd = cohensD(nHigh, nLow);
    console.log(
      `    → SENSITIVITY (normal segment only, n=${normal.length}): gap = ${fmt(mean(nHigh) - mean(nLow), 1)} pts, ` +
        `Cohen's d = ${fmt(nd, 2)}`,
    );
  }
  console.log("    → NOTE: the MAGNITUDE of this leakage is a function of the generator's");
  console.log("      assumed correlation between latent SES and the scored proxies (device,");
  console.log("      KYC, funding-rail mix, balances). The test demonstrates the mechanism and");
  console.log("      DIRECTION of proxy leakage, not a calibrated production figure.");

  // Group by colonia marginación tier.
  console.log("\n  By colonia marginación tier:");
  const byTier = new Map<string, number[]>();
  for (const s of valid) {
    const k = s.user.coloniaTier;
    if (!byTier.has(k)) byTier.set(k, []);
    byTier.get(k)!.push(s.base);
  }
  const tierOrder = [
    "tier_1_marginacion_muy_bajo",
    "tier_2_marginacion_bajo",
    "tier_3_marginacion_medio",
    "tier_4_marginacion_alto",
    "tier_5_marginacion_muy_alto",
  ];
  for (const k of tierOrder) {
    const xs = byTier.get(k) ?? [];
    if (!xs.length) continue;
    console.log(`    ${k.padEnd(30)} n=${String(xs.length).padStart(5)}  mean=${fmt(mean(xs), 1).padStart(5)}`);
  }

  console.log("\n  INTERPRETATION:");
  console.log("  A four-fifths ratio < 0.80 or |d| ≥ 0.5 across income groups indicates the");
  console.log("  score materially tracks an EXCLUDED variable through behavioral proxies —");
  console.log("  i.e. excluding colonia/income from scoring does not by itself neutralize");
  console.log("  disparate impact. This is the exact risk the fair-lending sign-off gate exists");
  console.log("  to catch; the synthetic result quantifies it against the current model.");

  if (fourFifths < 0.8) {
    flagBug(
      `Disparate-impact (proxy leakage): income-bucket selection-rate four-fifths ratio = ${fmt(fourFifths, 3)} ` +
        `(< 0.80). Excluded income leaks into the score via correlated behavioral signals. Not a code defect — ` +
        `a model-fairness finding worth a real bias review before any lending use.`,
    );
  }
  if (Math.abs(d) >= 0.5) {
    flagBug(
      `Disparate-impact (proxy leakage): Cohen's d between highest/lowest income buckets = ${fmt(d, 2)} ` +
        `(|d| ≥ 0.5, a "large" effect) despite income never being scored.`,
    );
  }
}

function reportGamingResistance(scored: Scored[]) {
  header("7. GAMING RESISTANCE (cold-start gates)");

  // 7a. Inflated self/advance/consistency with payCount below the gates.
  const gamersA = scored.filter((s) => s.user._segment === "gaming_selfratio_advance");
  console.log("  7a. Inflated selfRatio/advanceDays/domStddev/amountCV with sub-gate payCount");
  console.log("      (self-init, advance-days, day-consistency require payCount≥3; volatility ≥2):");

  const breakdownFor = (u: SyntheticUser) => computePTI(toSnapshot(u)).breakdown;
  let leaks = 0;
  for (const grp of [0, 1, 2]) {
    const sub = gamersA.filter((s) => s.user.payCount === grp);
    if (!sub.length) continue;
    // Inspect PR components + volatility for leakage.
    let prGatedPts = 0;
    let volPts = 0;
    for (const s of sub) {
      const bd = breakdownFor(s.user);
      const pr = bd.payment_reliability.components;
      const gated =
        pr.payment_day_consistency.score + pr.advance_payment_days.score + pr.self_initiated_ratio.score;
      prGatedPts += gated;
      volPts += bd.cashflow_stability.components.payment_amount_volatility?.score ?? 0;
      if (grp < 3 && gated > 0) leaks++;
      if (grp < 2 && (bd.cashflow_stability.components.payment_amount_volatility?.score ?? 0) > 0) leaks++;
    }
    console.log(
      `      payCount=${grp}: n=${sub.length}  Σ gated-PR pts=${prGatedPts} (expect 0)  ` +
        `Σ volatility pts=${volPts} (expect 0 for payCount<2)  mean total=${fmt(mean(sub.map((s) => s.base)), 1)}`,
    );
  }
  if (leaks === 0) {
    console.log("      → Gates HOLD: no gated PR points and no sub-gate volatility points awarded.");
  } else {
    flagBug(`Gaming: ${leaks} gated reward instances leaked to profiles below their payCount gate.`);
  }

  // 7b. PRODUCTION-REACHABLE ungated reward surfaces with zero payments.
  console.log("\n  7b. Production-reachable ungated surfaces, payCount=0 (values the real");
  console.log("      snapshot builder CAN emit for a zero-payment user):");
  const gamersB = scored.filter((s) => s.user._segment === "gaming_ungated_surfaces");
  let routinePts = 0;
  let signupPts = 0;
  let bufferPts = 0;
  for (const s of gamersB) {
    const bd = breakdownFor(s.user);
    const bc = bd.behavioral_consistency.components;
    const ed = bd.engagement_depth.components;
    const cf = bd.cashflow_stability.components;
    routinePts += bc.routine_score?.score ?? 0;
    signupPts += ed.signup_utilization_speed?.score ?? 0;
    bufferPts += cf.buffer_retention?.score ?? 0;
  }
  console.log(`      n=${gamersB.length}  Σ routine pts=${routinePts}  Σ signup-speed pts=${signupPts} (expect 0, hoursToFirst=NaN)  Σ buffer pts=${bufferPts}`);
  console.log("      (mean total for this group: " + fmt(mean(gamersB.map((s) => s.base)), 1) + ")");
  console.log("      routine here is driven ONLY by login-hour regularity (hourStd); the");
  console.log("      day-of-month half stays 0 because domStddev is payment-derived. buffer");
  console.log("      awards its full 3pts for a real balance with no loads in the 90d window.");
  if (routinePts > 0 || bufferPts > 0) {
    flagBug(
      "DESIGN NOTE (production-reachable, by design): with payCount=0 a user still legitimately accrues BC/CF " +
        "points that require no bill payments — routine_score from login-hour regularity (hourStd, from user_events, " +
        "max ~1pt when the payment-derived domStddev half stays 0) and buffer_retention's full 3pts for holding a " +
        "balance with no loads in the 90d window. This is intended (BC/ED/CF reward engagement + balance discipline " +
        "independent of payments), but it means a zero-payment account can reach a non-trivial floor; worth confirming " +
        "that floor is acceptable before any thin-file lending use.",
    );
  }

  // 7c. ROBUSTNESS / invariant-break probes (NOT production-reachable).
  // Constructed inline with field combinations the real snapshot builder never
  // emits, to show whether the engine trusts fields unconditionally.
  console.log("\n  7c. Robustness / invariant-break probes (inputs the real builder never emits):");
  const invSnap = toSnapshot(gamersB[0].user);
  const invSignup = { ...invSnap, payCount: 0, hoursToFirst: 2 };   // real builder → NaN
  const invRoutine = { ...invSnap, payCount: 0, domStddev: 0.3 };   // real builder → 15
  const signupLeak = computePTI(invSignup).breakdown.engagement_depth.components.signup_utilization_speed?.score ?? 0;
  const routineLeak = computePTI(invRoutine).breakdown.behavioral_consistency.components.routine_score?.score ?? 0;
  const routineBaseline = computePTI(invSnap).breakdown.behavioral_consistency.components.routine_score?.score ?? 0;
  console.log(`      finite hoursToFirst + payCount=0  → signup_utilization_speed=${signupLeak} pts (real builder emits NaN → 0)`);
  console.log(`      domStddev=0.3 + payCount=0        → routine_score=${routineLeak} pts vs ${routineBaseline} at default domStddev`);
  if (signupLeak > 0) {
    flagBug(
      "ROBUSTNESS (not production-reachable today): signup_utilization_speed (ED) reads hoursToFirst WITHOUT " +
        "checking payCount, so a finite hoursToFirst with payCount=0 scores points for a first payment that never " +
        "happened. buildPTISnapshotFromDb sets hoursToFirst=NaN whenever there are no payments, so this cannot occur " +
        "in production now — but the engine trusts the field unconditionally, so any future builder regression that " +
        "emitted a finite hoursToFirst at payCount=0 would silently leak points. Cheap hardening: gate " +
        "signup_utilization_speed on payCount≥1.",
    );
  }
  if (routineLeak > routineBaseline) {
    flagBug(
      "ROBUSTNESS (not production-reachable today): routine_score's day-of-month half uses domStddev WITHOUT " +
        "checking payCount. domStddev is payment-derived and defaults to 15 with no payments, so it cannot be driven " +
        "low in production at payCount=0 — but the engine trusts it unconditionally, so a builder regression emitting " +
        "a low domStddev at payCount=0 would add routine points. Cheap hardening: gate the domStddev half of " +
        "routine_score on payCount≥3.",
    );
  }
}

// ─── main ─────────────────────────────────────────────────────────────────────

function main() {
  const seed = Number(process.env.PTI_STRESS_SEED ?? 0xC0FFEE);
  const size = Number(process.env.PTI_STRESS_SIZE ?? 8000);

  console.log(line("█"));
  console.log("  PTI SYNTHETIC POPULATION STRESS TEST");
  console.log(`  seed=${seed}  target size=${size}  (DEV-ONLY, no DB, no prod writes)`);
  console.log(line("█"));

  const pop = generatePopulation({ size, seed });
  const scored = scoreAll(pop);

  reportPopulation(pop);
  reportDistribution(scored);
  reportColdStart(scored);
  reportTierBoundaries(scored);
  reportFairLendingCaps(pop);
  reportDisparateImpact(scored);
  reportGamingResistance(scored);

  header("8. FLAGGED FINDINGS");
  if (BUGS.length === 0) {
    console.log("  No issues flagged.");
  } else {
    BUGS.forEach((b, i) => {
      console.log(`  [${i + 1}] ${b}\n`);
    });
  }
  console.log(line("█"));
  console.log("  END OF REPORT");
  console.log(line("█"));
}

main();
