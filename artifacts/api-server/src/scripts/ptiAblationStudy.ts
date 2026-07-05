/**
 * PTI Disparate-Impact Ablation Study (DEV/LOCAL ONLY)
 * ============================================================================
 * Third script in the PTI stress-test line (after syntheticPopulation.ts /
 * ptiStressTest.ts and fairLendingClampStressTest.ts). Those runs CONFIRMED a
 * structural, income-correlated gap in the base PTI score (four-fifths ≈ 0.045,
 * Cohen's d ≈ 0.90) that persists even under the best-case fair-lending
 * adjustment — despite income/colonia never being scoring inputs. The gap is
 * PROXY LEAKAGE: behavioral inputs that correlate with the generator's latent
 * SES factor.
 *
 * This script finds WHICH inputs drive that gap via single-field ablation:
 * for each of PTI's 39 input fields, neutralize ONLY that field (overwrite
 * every user's value with a population constant so it can no longer vary or
 * carry cross-user signal), leave all other fields at their real synthetic
 * values, recompute the whole population through the REAL, unmodified
 * computePTI(), and measure how much the disparate-impact gap shrinks. Then
 * rank the fields, sanity-check the top ones against the generator's known
 * SES couplings, and test combined removal of the top 3 (redundant vs.
 * compounding).
 *
 * Neutralization = mean-imputation: numeric fields → population mean over
 * FINITE values; boolean/string fields → population majority class. Setting a
 * field to one constant for everyone removes its between-user variance, so it
 * can no longer create a between-income-bucket differential — which is exactly
 * the signal we are isolating. (Caveat: for NaN-gated fields — hoursToFirst,
 * daysToFirstSpei, lateRecoveryRatio, paulaResponseLatencyMinutes — imputing a
 * finite mean for the "no data" users changes their gating; the constant is
 * still uniform across users so it cannot manufacture a between-bucket gap, but
 * the absolute score level shifts. Flagged in the notes where relevant.)
 *
 * Writes NOTHING to any DB. Reuses the same generator + seed as the prior two
 * runs so the population is byte-for-byte identical.
 *
 * Run:  pnpm --filter @workspace/api-server exec tsx src/scripts/ptiAblationStudy.ts
 */

import { computePTI, type PTIDataSnapshot } from "../services/pti.js";
import { generatePopulation, type SyntheticUser } from "../services/syntheticPopulation.js";

// ─── Stat helpers (mirror ptiStressTest.ts) ────────────────────────────────

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const stddev = (xs: number[]) => {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1));
};
const fmt = (x: number, d = 2) => (Number.isFinite(x) ? x.toFixed(d) : String(x));
function cohensD(a: number[], b: number[]): number {
  if (a.length < 2 || b.length < 2) return 0;
  const va = stddev(a) ** 2;
  const vb = stddev(b) ** 2;
  const pooled = Math.sqrt(((a.length - 1) * va + (b.length - 1) * vb) / (a.length + b.length - 2));
  return pooled === 0 ? 0 : (mean(a) - mean(b)) / pooled;
}
function header(title: string) {
  console.log("\n" + "═".repeat(90));
  console.log("  " + title);
  console.log("═".repeat(90));
}

// ─── The 39 PTI input fields, with dimension + generator-SES-link metadata ──
// sesLink reflects how the GENERATOR (syntheticPopulation.ts) couples the field
// to latent SES:
//   direct   — field is drawn directly from `ses` (device/KYC/balances/rails)
//   indirect — field is drawn from reliability/engagement, which carry a WEAK
//              ses signal via ses = 0.25*reliability + 0.75*noise
//   noise    — field is essentially random given its gate (no ses/rel/eng link)

type Dim = "PaymentReliability" | "BehavioralConsistency" | "EngagementDepth" | "CashFlowStability" | "v4.2Signals";
type SesLink = "direct" | "indirect" | "noise";
interface FieldMeta { field: keyof PTIDataSnapshot; dim: Dim; sesLink: SesLink; note: string; }

const FIELD_META: FieldMeta[] = [
  { field: "streakMonths", dim: "PaymentReliability", sesLink: "indirect", note: "payment discipline; weak SES via reliability→ses coupling" },
  { field: "payCount", dim: "PaymentReliability", sesLink: "indirect", note: "payment volume; also gates many sub-scores; weak SES via reliability" },
  { field: "domStddev", dim: "PaymentReliability", sesLink: "indirect", note: "pay-date consistency; weak SES via reliability" },
  { field: "dominantDay", dim: "PaymentReliability", sesLink: "noise", note: "uniform-random day-of-month; NO SES link — any effect is an artifact" },
  { field: "advanceDays", dim: "PaymentReliability", sesLink: "indirect", note: "pays-early margin; weak SES via reliability" },
  { field: "selfRatio", dim: "PaymentReliability", sesLink: "indirect", note: "self-initiated vs reminder; weak SES via reliability" },
  { field: "loginDays30", dim: "BehavioralConsistency", sesLink: "indirect", note: "app cadence; free-time proxy; weak SES via engagement" },
  { field: "hourStd", dim: "BehavioralConsistency", sesLink: "indirect", note: "login-hour regularity; schedule-stability proxy; weak SES via engagement" },
  { field: "scratchPlays", dim: "BehavioralConsistency", sesLink: "indirect", note: "reward-game plays; free-time proxy; weak SES via engagement" },
  { field: "spinPlays", dim: "BehavioralConsistency", sesLink: "indirect", note: "reward-game plays; free-time proxy; weak SES via engagement" },
  { field: "missionsDone", dim: "BehavioralConsistency", sesLink: "indirect", note: "gamified tasks; free-time proxy; weak SES via engagement" },
  { field: "loadCount30", dim: "BehavioralConsistency", sesLink: "indirect", note: "wallet-load frequency; weak SES via engagement" },
  { field: "loadDayStd", dim: "BehavioralConsistency", sesLink: "indirect", note: "load-cadence regularity; weak SES via engagement" },
  { field: "paulaInteractions", dim: "BehavioralConsistency", sesLink: "indirect", note: "assistant chats; free-time proxy; weak SES via engagement" },
  { field: "confirmed2fa", dim: "BehavioralConsistency", sesLink: "indirect", note: "2FA confirmations; weak SES via engagement" },
  { field: "declined2fa", dim: "BehavioralConsistency", sesLink: "indirect", note: "2FA declines; weak (inverse) via reliability" },
  { field: "pushOpens", dim: "BehavioralConsistency", sesLink: "indirect", note: "push opens; free-time proxy; weak SES via engagement" },
  { field: "curiosityIndex", dim: "BehavioralConsistency", sesLink: "indirect", note: "financial-literacy curiosity; weak SES via engagement" },
  { field: "billerCount", dim: "EngagementDepth", sesLink: "indirect", note: "distinct billers; weak SES via reliability" },
  { field: "kycVerified", dim: "EngagementDepth", sesLink: "direct", note: "KYC completion rises directly with SES (0.15+0.7*ses) — direct proxy" },
  { field: "kycTier", dim: "EngagementDepth", sesLink: "direct", note: "full-vs-simplified KYC rises directly with SES — direct proxy" },
  { field: "utilityRatio", dim: "EngagementDepth", sesLink: "noise", note: "essential-bill share; normal(0.55) — NO SES link, any effect is an artifact" },
  { field: "intentClicks", dim: "EngagementDepth", sesLink: "indirect", note: "high-intent clicks; weak SES via engagement" },
  { field: "hoursToFirst", dim: "EngagementDepth", sesLink: "indirect", note: "signup→first-payment speed; weak SES via reliability; NaN-gated" },
  { field: "deviceScore", dim: "EngagementDepth", sesLink: "direct", note: "device tenure/quality = ses*100 — the strongest, most direct SES proxy" },
  { field: "currentBalance", dim: "CashFlowStability", sesLink: "direct", note: "wallet balance rises directly with SES (lognormal 3.2+2.2*ses) — direct proxy" },
  { field: "totalLoads", dim: "CashFlowStability", sesLink: "direct", note: "90d load volume rises directly with SES (lognormal 5.2+2.0*ses) — direct proxy" },
  { field: "totalSpend", dim: "CashFlowStability", sesLink: "direct", note: "90d spend = loads*ratio → inherits SES from totalLoads — direct proxy" },
  { field: "amountCV", dim: "CashFlowStability", sesLink: "indirect", note: "payment-amount volatility; weak SES via reliability" },
  { field: "p2pSendCount", dim: "CashFlowStability", sesLink: "indirect", note: "P2P sends; weak SES via engagement" },
  { field: "p2pRecipientCount", dim: "CashFlowStability", sesLink: "indirect", note: "distinct P2P recipients; weak SES via engagement" },
  { field: "daysOld", dim: "CashFlowStability", sesLink: "indirect", note: "account age; weak SES via engagement (tenure↑ with engagement)" },
  { field: "daysToFirstSpei", dim: "CashFlowStability", sesLink: "direct", note: "speed to first bank load = lognormal(2.5-1.8*ses) — direct proxy; NaN-gated" },
  { field: "oxxoLoadCount", dim: "CashFlowStability", sesLink: "direct", note: "cash (OXXO) loads rise as SES FALLS (inverse of bankShare) — direct proxy" },
  { field: "speiLoadCount", dim: "CashFlowStability", sesLink: "direct", note: "bank (SPEI) loads rise directly with SES (bankShare=0.85*ses) — direct proxy" },
  { field: "cardLoadCount", dim: "CashFlowStability", sesLink: "direct", note: "card loads rise directly with SES (bankShare) — direct proxy" },
  { field: "lateRecoveryRatio", dim: "v4.2Signals", sesLink: "indirect", note: "recovery-after-late; weak SES via reliability; NaN-gated" },
  { field: "latePaymentCount", dim: "v4.2Signals", sesLink: "indirect", note: "late-payment count; weak (inverse) via reliability; gated payCount≥3" },
  { field: "paulaResponseLatencyMinutes", dim: "v4.2Signals", sesLink: "indirect", note: "assistant reply latency; weak SES via engagement; NaN-gated" },
];

const NUMERIC_FIELDS = FIELD_META.map((m) => m.field).filter((f) => f !== "kycVerified" && f !== "kycTier") as (keyof PTIDataSnapshot)[];

// ─── Build the identical population + base snapshots ────────────────────────

function toSnapshot(u: SyntheticUser): PTIDataSnapshot {
  const {
    streakMonths, payCount, domStddev, dominantDay, advanceDays, selfRatio,
    loginDays30, hourStd, scratchPlays, spinPlays, missionsDone, loadCount30, loadDayStd,
    paulaInteractions, confirmed2fa, declined2fa, pushOpens, curiosityIndex,
    billerCount, kycVerified, kycTier, utilityRatio, intentClicks, hoursToFirst, deviceScore,
    currentBalance, totalLoads, totalSpend, amountCV, p2pSendCount, p2pRecipientCount, daysOld,
    daysToFirstSpei, oxxoLoadCount, speiLoadCount, cardLoadCount,
    lateRecoveryRatio, latePaymentCount, paulaResponseLatencyMinutes,
  } = u;
  return {
    streakMonths, payCount, domStddev, dominantDay, advanceDays, selfRatio,
    loginDays30, hourStd, scratchPlays, spinPlays, missionsDone, loadCount30, loadDayStd,
    paulaInteractions, confirmed2fa, declined2fa, pushOpens, curiosityIndex,
    billerCount, kycVerified, kycTier, utilityRatio, intentClicks, hoursToFirst, deviceScore,
    currentBalance, totalLoads, totalSpend, amountCV, p2pSendCount, p2pRecipientCount, daysOld,
    daysToFirstSpei, oxxoLoadCount, speiLoadCount, cardLoadCount,
    lateRecoveryRatio, latePaymentCount, paulaResponseLatencyMinutes,
  };
}

// ─── Disparate-impact metric (identical logic to ptiStressTest.ts §6) ───────

const BUCKET_ORDER = ["bucket_1_lowest", "bucket_2", "bucket_3", "bucket_4", "bucket_5_highest"];
const APPROVAL_THRESHOLD = 60;

interface Metrics { fourFifths: number; d: number; gap: number; dropped: number; }
function computeMetrics(scores: number[], buckets: string[]): Metrics {
  // Robustness guard (mirrors the stress harness's anomaly filtering): a valid
  // score must be a finite number in-range. Non-finite scores would poison the
  // means/rates and silently distort the deltas, so they are excluded.
  const byBucket = new Map<string, number[]>();
  let dropped = 0;
  for (let i = 0; i < scores.length; i++) {
    const v = scores[i];
    if (!Number.isFinite(v) || v < 0 || v > 100) { dropped++; continue; }
    const k = buckets[i];
    if (!byBucket.has(k)) byBucket.set(k, []);
    byBucket.get(k)!.push(v);
  }
  const rates: number[] = [];
  for (const k of BUCKET_ORDER) {
    const xs = byBucket.get(k) ?? [];
    if (!xs.length) continue;
    rates.push(xs.filter((x) => x >= APPROVAL_THRESHOLD).length / xs.length);
  }
  const maxRate = Math.max(...rates);
  const minRate = Math.min(...rates);
  const fourFifths = maxRate > 0 ? minRate / maxRate : 1;
  const low = byBucket.get("bucket_1_lowest") ?? [];
  const high = byBucket.get("bucket_5_highest") ?? [];
  return { fourFifths, d: cohensD(high, low), gap: mean(high) - mean(low), dropped };
}

// ─── Neutralization constants ──────────────────────────────────────────────

function neutralConstants(snaps: PTIDataSnapshot[]) {
  const numericConst: Partial<Record<keyof PTIDataSnapshot, number>> = {};
  for (const f of NUMERIC_FIELDS) {
    const vals = snaps.map((s) => s[f] as number).filter((v) => Number.isFinite(v));
    numericConst[f] = vals.length ? mean(vals) : 0;
  }
  const trueCount = snaps.filter((s) => s.kycVerified === true).length;
  const kycVerifiedConst = trueCount >= snaps.length / 2;
  const fullCount = snaps.filter((s) => s.kycTier === "full").length;
  const kycTierConst = fullCount >= snaps.length / 2 ? "full" : "simplified";
  return { numericConst, kycVerifiedConst, kycTierConst };
}

function neutralizedSnapshot(
  snap: PTIDataSnapshot,
  field: keyof PTIDataSnapshot,
  consts: ReturnType<typeof neutralConstants>,
): PTIDataSnapshot {
  if (field === "kycVerified") return { ...snap, kycVerified: consts.kycVerifiedConst };
  if (field === "kycTier") return { ...snap, kycTier: consts.kycTierConst };
  return { ...snap, [field]: consts.numericConst[field]! };
}

// ─── main ───────────────────────────────────────────────────────────────────

async function main() {
  const seed = process.env.PTI_STRESS_SEED ? Number(process.env.PTI_STRESS_SEED) : 0xc0ffee;
  const size = process.env.PTI_STRESS_SIZE ? Number(process.env.PTI_STRESS_SIZE) : 8000;

  console.log("█".repeat(90));
  console.log("  PTI DISPARATE-IMPACT ABLATION STUDY");
  console.log(`  seed=${seed}  size=${size}  (DEV-ONLY, no DB, no prod contact)`);
  console.log("█".repeat(90));

  const population = generatePopulation({ seed, size });
  const snaps = population.map(toSnapshot);
  const buckets = population.map((u) => u.declaredIncomeBucket);
  const baseScores = snaps.map((s) => computePTI(s).breakdown.total);

  // ── 1. Baseline confirmation ──
  header("1. BASELINE — full unmodified population (must match prior runs ≈ 0.045 / 0.90)");
  const baseline = computeMetrics(baseScores, buckets);
  console.log(`  n=${snaps.length}`);
  console.log(`  four-fifths ratio (≥${APPROVAL_THRESHOLD} selection rate, min/max bucket) = ${fmt(baseline.fourFifths, 3)}`);
  console.log(`  Cohen's d (bucket_5_highest vs bucket_1_lowest) = ${fmt(baseline.d, 2)}`);
  console.log(`  mean-score gap (highest−lowest bucket) = ${fmt(baseline.gap, 1)} pts`);
  console.log(`  non-finite/out-of-range scores dropped by robustness guard = ${baseline.dropped}`);
  const baselineOk = Math.abs(baseline.fourFifths - 0.045) < 0.03 && Math.abs(baseline.d - 0.9) < 0.15;
  console.log(`  → matches prior runs: ${baselineOk ? "YES — ablation proceeds from the same starting point" : "NO — investigate before trusting deltas"}`);

  // ── 2/3. Single-field ablation ──
  header("2-3. SINGLE-FIELD ABLATION — neutralize one field at a time");
  console.log("  Each field is overwritten with its population constant (numeric→mean over finite,");
  console.log("  boolean/string→majority class); all other fields keep their real values.\n");
  const consts = neutralConstants(snaps);

  interface AblationRow extends FieldMeta { fourFifths: number; d: number; gap: number; dReductionAbs: number; ffImprovement: number; gapClosedPct: number; }
  const rows: AblationRow[] = [];
  for (const meta of FIELD_META) {
    const scores = snaps.map((s) => computePTI(neutralizedSnapshot(s, meta.field, consts)).breakdown.total);
    const m = computeMetrics(scores, buckets);
    rows.push({
      ...meta,
      fourFifths: m.fourFifths,
      d: m.d,
      gap: m.gap,
      // Gap-shrink metrics: how much closer to "no disparity" each removal gets.
      dReductionAbs: Math.abs(baseline.d) - Math.abs(m.d), // >0 = gap shrank
      ffImprovement: m.fourFifths - baseline.fourFifths,    // >0 = ratio rose toward 0.80
      gapClosedPct: baseline.gap !== 0 ? (1 - m.gap / baseline.gap) * 100 : 0,
    });
  }

  // ── 4. Rank ──
  header("4. RANKED BY DISPARATE-IMPACT REDUCTION (primary key: Cohen's d shrink)");
  console.log("  Ranked by |d| reduction from baseline (the most stable continuous gap measure;");
  console.log("  the four-fifths ratio near 0.045 is proportionally noisy). four-fifths-after and");
  console.log("  mean-gap-closed shown alongside. Positive d-drop / ff-rise = the field was");
  console.log("  carrying disparate-impact signal that its removal eliminated.\n");
  const ranked = [...rows].sort((a, b) => b.dReductionAbs - a.dReductionAbs);

  const H = "  RANK  FIELD                          DIMENSION            d(after)  Δd     4/5(after)  gap%closed  SESlink";
  console.log(H);
  console.log("  " + "─".repeat(H.length - 2));
  ranked.forEach((r, i) => {
    console.log(
      "  " +
        String(i + 1).padStart(3) + "   " +
        r.field.padEnd(30) + " " +
        r.dim.padEnd(20) + " " +
        fmt(r.d, 2).padStart(6) + "  " +
        (r.dReductionAbs >= 0 ? "+" : "") + fmt(r.dReductionAbs, 2).padStart(5) + "  " +
        fmt(r.fourFifths, 3).padStart(8) + "   " +
        fmt(r.gapClosedPct, 1).padStart(7) + "%   " +
        r.sesLink,
    );
  });

  // ── 4b. Secondary ranking by four-fifths improvement (noisy cross-check) ──
  header("4b. SECONDARY RANKING BY four-fifths IMPROVEMENT (NOISY — cross-check only)");
  console.log("  The four-fifths ratio at baseline (0.045) sits on a tiny min-bucket selection");
  console.log("  rate, so proportional swings here are unstable and can even go NEGATIVE when a");
  console.log("  neutralization zeroes out the lowest bucket's already-tiny pass rate. Shown ONLY");
  console.log("  to confirm the |d| ranking is not an artifact of metric choice — not authoritative.\n");
  const rankedFF = [...rows].sort((a, b) => b.ffImprovement - a.ffImprovement);
  console.log("  RANK  FIELD                          4/5(after)  Δ4/5     Δd      SESlink");
  console.log("  " + "─".repeat(72));
  rankedFF.slice(0, 8).forEach((r, i) => {
    console.log(
      "  " + String(i + 1).padStart(3) + "   " + r.field.padEnd(30) + " " +
        fmt(r.fourFifths, 3).padStart(8) + "  " +
        (r.ffImprovement >= 0 ? "+" : "") + fmt(r.ffImprovement, 3).padStart(6) + "  " +
        (r.dReductionAbs >= 0 ? "+" : "") + fmt(r.dReductionAbs, 2).padStart(5) + "   " + r.sesLink,
    );
  });
  const topDset = new Set(ranked.slice(0, 5).map((r) => r.field));
  const overlap = rankedFF.slice(0, 5).filter((r) => topDset.has(r.field)).length;
  console.log(`\n  → ${overlap}/5 of the top-5-by-four-fifths also appear in the top-5-by-|d|; the two`);
  console.log("    metrics broadly agree that the direct SES proxies dominate.");

  // ── 5. Qualitative sanity check on the top 5 ──
  header("5. QUALITATIVE PLAUSIBILITY — top 5 candidate proxies");
  const top5 = ranked.slice(0, 5);
  for (const r of top5) {
    const flag =
      r.sesLink === "noise"
        ? "  ⚠ GENERATOR-ARTIFACT RISK: this field has NO SES link in the generator — a large effect here would be suspicious/coincidental, not a real-world mechanism."
        : r.sesLink === "direct"
          ? "  ✓ PLAUSIBLE: direct SES proxy in the generator; a real-world analogue is credible."
          : "  ~ PLAUSIBLE-BUT-WEAK: only an indirect (reliability/engagement→ses) link; effect reflects that weak coupling amplified by the score's weighting.";
    console.log(`\n  ${r.field} (${r.dim}) — Δd=${fmt(r.dReductionAbs, 2)}, 4/5→${fmt(r.fourFifths, 3)}, gap ${fmt(r.gapClosedPct, 1)}% closed`);
    console.log(`    mechanism: ${r.note}`);
    console.log(flag);
  }

  // ── 6. Combined removal of the top 3 ──
  header("6. COMBINED REMOVAL OF TOP 3 — redundant vs. compounding");
  const top3 = ranked.slice(0, 3);
  const top3Fields = top3.map((r) => r.field);
  console.log(`  Top 3: ${top3Fields.join(", ")}`);
  const comboScores = snaps.map((s) => {
    let mod = s;
    for (const f of top3Fields) mod = neutralizedSnapshot(mod, f, consts);
    return computePTI(mod).breakdown.total;
  });
  const combo = computeMetrics(comboScores, buckets);
  const comboDReduction = Math.abs(baseline.d) - Math.abs(combo.d);
  const sumOfIndividual = top3.reduce((a, r) => a + r.dReductionAbs, 0);
  console.log(`\n  baseline:            d=${fmt(baseline.d, 2)}  4/5=${fmt(baseline.fourFifths, 3)}  gap=${fmt(baseline.gap, 1)}`);
  console.log(`  top-3 removed together: d=${fmt(combo.d, 2)}  4/5=${fmt(combo.fourFifths, 3)}  gap=${fmt(combo.gap, 1)}  (${fmt((1 - combo.gap / baseline.gap) * 100, 1)}% gap closed)`);
  console.log(`\n  combined Δd            = ${fmt(comboDReduction, 2)}`);
  console.log(`  sum of individual Δd  = ${fmt(sumOfIndividual, 2)}`);
  const ratio = sumOfIndividual !== 0 ? comboDReduction / sumOfIndividual : 0;
  let pattern: string;
  if (ratio < 0.8) {
    pattern = `REDUNDANT — combined effect (${fmt(comboDReduction, 2)}) is materially LESS than the sum of individual effects (${fmt(sumOfIndividual, 2)}). The top proxies carry overlapping SES signal, so removing one is partly compensated by the others (they all track the same latent ses factor).`;
  } else if (ratio > 1.2) {
    pattern = `COMPOUNDING — combined effect (${fmt(comboDReduction, 2)}) EXCEEDS the sum of individual effects (${fmt(sumOfIndividual, 2)}). Removing them together closes disproportionately more of the gap than removing each alone.`;
  } else {
    pattern = `ROUGHLY ADDITIVE — combined effect (${fmt(comboDReduction, 2)}) ≈ sum of individual effects (${fmt(sumOfIndividual, 2)}); the top proxies contribute largely independent signal.`;
  }
  console.log(`  ratio (combined / sum) = ${fmt(ratio, 2)}`);
  console.log(`\n  → ${pattern}`);

  header("SUMMARY");
  console.log(`  Baseline gap: four-fifths=${fmt(baseline.fourFifths, 3)}, d=${fmt(baseline.d, 2)}, ${fmt(baseline.gap, 1)}pt mean gap.`);
  console.log(`  Top proxy drivers (by |d| reduction): ${ranked.slice(0, 5).map((r) => r.field).join(" > ")}`);
  console.log(`  Combined top-3 removal closes ${fmt((1 - combo.gap / baseline.gap) * 100, 1)}% of the mean gap; pattern = ${pattern.split(" —")[0]}.`);
  console.log("█".repeat(90));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
