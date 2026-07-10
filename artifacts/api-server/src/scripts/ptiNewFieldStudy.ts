/**
 * PTI New-Field Ablation & Proxy-Correlation Study (DEV/LOCAL ONLY)
 * ============================================================================
 * Weight-allocation input for Prompt 4 (v4.3 rebalancing): per-field ablation
 * lift, coverage, multicollinearity, income-proxy correlation, four-fifths
 * impact, monotonicity, and cross-cohort stability for the 15 fields added in
 * Stage 1 (4) and Stage 2 (11).
 *
 * WHY THIS SCRIPT SYNTHESIZES THE 15 FIELDS ITSELF
 * ------------------------------------------------
 * The production-correct behavior of syntheticPopulation.ts is to hold all 15
 * fields at DERIVED_FEATURE_DEFAULTS (zero variance) — which makes ablation
 * structurally impossible. Per explicit task authorization, this script
 * synthesizes values for the 15 fields, conditioned on latent factors, WITHOUT
 * touching syntheticPopulation.ts: the population is generated with the exact
 * same generator + seed as all prior runs (byte-identical), and synthesis uses
 * a SEPARATE per-user PRNG stream (seed XOR user-id hash) so the base
 * population's RNG sequence is never perturbed.
 *
 * LATENT FACTORS — exact vs estimated (CIRCULARITY WARNING)
 * ---------------------------------------------------------
 * `_ses` is stored on every SyntheticUser (exact). The generator does NOT
 * store `reliability`/`engagement`, so this script estimates them from
 * observables the generator derived from those very latents:
 *   relHat: mean of selfRatio/0.9, advanceDays/10, (15-domStddev)/13,
 *           streak/monthsPossible (only gates that produced data);
 *           segment overrides: contradictory→0, gaming_*→U(0,0.25),
 *           cold_start_sparse→prior draw N(0.5,0.22).
 *   engHat: 0.5*loginDays30/30 + 0.25*min(paula/14,1) + 0.25*(12-hourStd)/10.
 * CIRCULARITY: designed-risk cohorts are defined by relHat, and most fields
 * are synthesized FROM relHat — so ablation deltas partly measure the
 * synthesis coupling itself, not real-world predictive power. Every delta
 * below is an upper bound under its stated assumption, not an estimate of
 * production lift. Fields flagged WEAK with large deltas deserve extra
 * suspicion.
 *
 * TEST WEIGHT — item 1/5 mechanism
 * --------------------------------
 * computePTI ignores the 15 fields (zero weight), so "included at test
 * weight" is a bolt-on: score' = clamp(base + 3 * unit(field), 0, 100), where
 * unit() maps the field to [0,1] oriented so higher = better designed-risk
 * behavior (orientation documented per field). Users whose field is
 * null/not-computable get 0 boost — coverage gaps therefore show up in the
 * four-fifths number, deliberately (that is what would happen in prod).
 *
 * Writes NOTHING to any DB.
 * Run: pnpm --filter @workspace/api-server exec tsx src/scripts/ptiNewFieldStudy.ts
 */

import { computePTI, type PTIDataSnapshot } from "../services/pti.js";
import { generatePopulation, makeRng, type SyntheticUser, type Segment } from "../services/syntheticPopulation.js";
import { toSnapshot } from "./ptiStressTest.js";

// ─── stat helpers (mirror ptiStressTest.ts) ─────────────────────────────────

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const stddev = (xs: number[]) => {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1));
};
const fmt = (x: number, d = 3) => (Number.isFinite(x) ? x.toFixed(d) : "n/a");
function cohensD(a: number[], b: number[]): number {
  if (a.length < 2 || b.length < 2) return NaN;
  const va = stddev(a) ** 2;
  const vb = stddev(b) ** 2;
  const pooled = Math.sqrt(((a.length - 1) * va + (b.length - 1) * vb) / (a.length + b.length - 2));
  return pooled === 0 ? 0 : (mean(a) - mean(b)) / pooled;
}
function pearson(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n < 3) return NaN;
  const mx = mean(x);
  const my = mean(y);
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    const a = x[i] - mx;
    const b = y[i] - my;
    sxy += a * b;
    sxx += a * a;
    syy += b * b;
  }
  return sxx === 0 || syy === 0 ? NaN : sxy / Math.sqrt(sxx * syy);
}
const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
function header(t: string) {
  console.log("\n" + "═".repeat(100));
  console.log("  " + t);
  console.log("═".repeat(100));
}

// ─── latent estimation ──────────────────────────────────────────────────────

interface Lat { rel: number; eng: number; ses: number; }

function estimateLatents(u: SyntheticUser, rng: ReturnType<typeof makeRng>): Lat {
  const ses = u._ses;
  const eng = clamp(
    0.5 * (u.loginDays30 / 30) + 0.25 * Math.min(u.paulaInteractions / 14, 1) + 0.25 * clamp((12 - u.hourStd) / 10, 0, 1),
    0, 1,
  );
  let rel: number;
  if (u._segment === "contradictory") rel = 0;
  else if (u._segment === "gaming_selfratio_advance" || u._segment === "gaming_ungated_surfaces") rel = rng.uniform(0, 0.25);
  else if (u._segment === "cold_start_sparse") rel = clamp(rng.normal(0.5, 0.22), 0, 1);
  else {
    const parts: number[] = [];
    if (u.payCount > 0) {
      parts.push(clamp(u.selfRatio / 0.9, 0, 1));
      parts.push(clamp(u.advanceDays / 10, 0, 1));
      parts.push(clamp((15 - u.domStddev) / 13, 0, 1));
    } else {
      parts.push(0);
    }
    const monthsPossible = Math.floor(u.daysOld / 30);
    if (monthsPossible > 0) parts.push(clamp(u.streakMonths / monthsPossible, 0, 1));
    rel = clamp(mean(parts), 0, 1);
  }
  return { rel, eng, ses };
}

// ─── field specs: synthesis assumption + confidence + orientation ───────────

type Conf = "STRONG" | "MODERATE" | "WEAK";
interface FieldSpec {
  name: string;
  stage: "Stage1" | "Stage2";
  assumption: string;
  confidence: Conf;
  orientationDoc: string;
  defaultVal: number | null;
  unit: (v: number) => number; // [0,1], higher = better
}

const SPECS: FieldSpec[] = [
  {
    name: "paymentTimingMeanDaysFromDue", stage: "Stage1",
    assumption: "= -advanceDays + N(0,2.5), winsorized ±20 (mirror of scored advanceDays: same payment timestamps, opposite sign)",
    confidence: "STRONG",
    orientationDoc: "lower(earlier)=better; unit=(20-v)/40",
    defaultVal: 0, unit: (v) => clamp((20 - v) / 40, 0, 1),
  },
  {
    name: "paymentTimingVarianceDaysFromDue", stage: "Stage1",
    assumption: "= (0.6*domStddev + N(0,1.5))² gated payCount≥2 (mirror of scored domStddev: same day-of-month dispersion)",
    confidence: "STRONG",
    orientationDoc: "lower=better; unit=1-min(v/225,1)",
    defaultVal: 0, unit: (v) => clamp(1 - v / 225, 0, 1),
  },
  {
    name: "activityVelocity30d", stage: "Stage1",
    assumption: "= N(0.15*(engHat-0.4), 0.12) gated loginDays30≥1 — GUESS: no prior links engagement LEVEL to its derivative",
    confidence: "WEAK",
    orientationDoc: "higher=better; unit=clamp((v+0.3)/0.6)",
    defaultVal: 0, unit: (v) => clamp((v + 0.3) / 0.6, 0, 1),
  },
  {
    name: "interEventRegularityScore", stage: "Stage1",
    assumption: "= 0.45*engHat + 0.25*relHat + N(0,0.15) gated loginDays30≥2 (regular cadence tracks both latents)",
    confidence: "MODERATE",
    orientationDoc: "higher=better; unit=v",
    defaultVal: 0, unit: (v) => clamp(v, 0, 1),
  },
  {
    name: "minBalanceBuffer30d", stage: "Stage2",
    assumption: "= currentBalance × clamp(U(0.05,0.6)+0.25*relHat, 0, 0.9) — mechanically ≤ balance, so inherits balance's DIRECT ses-coupling by design (proxy-leak probe)",
    confidence: "STRONG",
    orientationDoc: "higher=better; unit=log1p(v)/log1p(5000)",
    defaultVal: 0, unit: (v) => clamp(Math.log1p(Math.max(0, v)) / Math.log1p(5000), 0, 1),
  },
  {
    name: "daysAtZeroPerMonth", stage: "Stage2",
    assumption: "= min(30, Poisson(7*(1-0.5*relHat-0.5*ses))) gated daysOld≥15 (zero-balance days rise as reliability AND ses fall)",
    confidence: "MODERATE",
    orientationDoc: "lower=better; unit=1-v/30",
    defaultVal: 0, unit: (v) => clamp(1 - v / 30, 0, 1),
  },
  {
    name: "drawdownVelocity", stage: "Stage2",
    assumption: "= clamp(0.15+0.5*(1-relHat)+0.2*(1-ses)+N(0,0.12), 0.02, 1) gated loadCount30≥1 (fast drain = low discipline, thin margin)",
    confidence: "MODERATE",
    orientationDoc: "lower=better; unit=1-v",
    defaultVal: 0, unit: (v) => clamp(1 - v, 0, 1),
  },
  {
    name: "loadIntervalEntropy", stage: "Stage2",
    assumption: "= clamp(0.85-0.4*engHat-0.25*relHat+N(0,0.12), 0, 1) gated loadCount30≥3 (mirror of scored loadDayStd direction)",
    confidence: "MODERATE",
    orientationDoc: "lower=better; unit=1-v",
    defaultVal: 0, unit: (v) => clamp(1 - v, 0, 1),
  },
  {
    name: "loadAmountCV", stage: "Stage2",
    assumption: "= clamp(0.75-0.45*relHat+N(0,0.15), 0.02, 2) gated loadCount30≥2 (same construction the generator uses for scored amountCV)",
    confidence: "STRONG",
    orientationDoc: "lower=better; unit=1-min(v/2,1)",
    defaultVal: 0, unit: (v) => clamp(1 - v / 2, 0, 1),
  },
  {
    name: "preDueStagingIndex", stage: "Stage2",
    assumption: "= clamp(0.15+0.6*relHat+N(0,0.15), 0, 1) gated billerCount≥1 AND payCount≥1, else null (staging-ahead-of-due is a reliability behavior)",
    confidence: "MODERATE",
    orientationDoc: "higher=better; unit=v",
    defaultVal: null, unit: (v) => clamp(v, 0, 1),
  },
  {
    name: "loadToObligationRatio", stage: "Stage2",
    assumption: "= max(0, 0.7+0.5*ses+0.3*relHat+N(0,0.35)) gated billerCount≥1, else null — GUESS: load-capacity vs obligation coupling to ses has no behavioral data behind it",
    confidence: "WEAK",
    orientationDoc: "higher=better; unit=min(v/1.5,1)",
    defaultVal: null, unit: (v) => clamp(v / 1.5, 0, 1),
  },
  {
    name: "sequencingStability", stage: "Stage2",
    assumption: "= clamp(0.2+0.6*relHat+N(0,0.18), 0, 1) gated billerCount≥2 AND latePaymentCount≥1 (needs ≥2 scarcity events), else null — GUESS: scarcity-event behavior is exactly what we lack data on",
    confidence: "WEAK",
    orientationDoc: "higher=better; unit=v",
    defaultVal: null, unit: (v) => clamp(v, 0, 1),
  },
  {
    name: "shockPaidFullRate", stage: "Stage2",
    assumption: "shock incidence Bernoulli(0.4) gated payCount≥2; rate = clamp(0.25+0.55*relHat+0.15*ses+N(0,0.15), 0, 1) (paying through a shock is reliability+capacity)",
    confidence: "MODERATE",
    orientationDoc: "higher=better; unit=v",
    defaultVal: 0, unit: (v) => clamp(v, 0, 1),
  },
  {
    name: "billShockWalletResponseRate", stage: "Stage2",
    assumption: "= clamp(0.15+0.55*ses+N(0,0.2), 0, 1) given a shock with paid rate>0.05 — wallet-funded response requires standing balance → deliberate ses probe",
    confidence: "MODERATE",
    orientationDoc: "higher=better; unit=v",
    defaultVal: 0, unit: (v) => clamp(v, 0, 1),
  },
  {
    name: "billShockResponse", stage: "Stage2",
    assumption: "ordinal from q=relHat+N(0,0.2): q>0.65→paid_full_ontime(3), >0.45→paid_late(2), >0.25→paid_partial(1), else unpaid_30d(0); null if no shock (encoded 0-3 for correlation)",
    confidence: "MODERATE",
    orientationDoc: "higher ordinal=better; unit=v/3",
    defaultVal: null, unit: (v) => clamp(v / 3, 0, 1),
  },
];

// ─── per-user synthesis (single per-user RNG; fixed field order) ────────────

interface SynthUser {
  u: SyntheticUser;
  lat: Lat;
  base: number;
  vals: Record<string, number | null>; // null = not computable (gate failed)
}

function synthesizeAll(u: SyntheticUser, seed: number, base: number): SynthUser {
  const rng = makeRng(((seed ^ Math.imul(u._id + 1, 2654435761)) >>> 0) || 1);
  const lat = estimateLatents(u, rng);
  const { rel, eng, ses } = lat;
  const v: Record<string, number | null> = {};

  v.paymentTimingMeanDaysFromDue = u.payCount >= 1 ? clamp(-u.advanceDays + rng.normal(0, 2.5), -20, 20) : null;
  v.paymentTimingVarianceDaysFromDue = u.payCount >= 2 ? clamp(0.6 * u.domStddev + rng.normal(0, 1.5), 0.3, 15) ** 2 : null;
  v.activityVelocity30d = u.loginDays30 >= 1 ? rng.normal(0.15 * (eng - 0.4), 0.12) : null;
  v.interEventRegularityScore = u.loginDays30 >= 2 ? clamp(0.45 * eng + 0.25 * rel + rng.normal(0, 0.15), 0, 1) : null;
  v.minBalanceBuffer30d = u.currentBalance > 0 ? Math.round(u.currentBalance * clamp(rng.uniform(0.05, 0.6) + 0.25 * rel, 0, 0.9)) : null;
  v.daysAtZeroPerMonth = u.daysOld >= 15 ? Math.min(30, rng.poisson(7 * clamp(1 - 0.5 * rel - 0.5 * ses, 0, 1))) : null;
  v.drawdownVelocity = u.loadCount30 >= 1 ? clamp(0.15 + 0.5 * (1 - rel) + 0.2 * (1 - ses) + rng.normal(0, 0.12), 0.02, 1) : null;
  v.loadIntervalEntropy = u.loadCount30 >= 3 ? clamp(0.85 - 0.4 * eng - 0.25 * rel + rng.normal(0, 0.12), 0, 1) : null;
  v.loadAmountCV = u.loadCount30 >= 2 ? clamp(0.75 - 0.45 * rel + rng.normal(0, 0.15), 0.02, 2) : null;
  v.preDueStagingIndex = u.billerCount >= 1 && u.payCount >= 1 ? clamp(0.15 + 0.6 * rel + rng.normal(0, 0.15), 0, 1) : null;
  v.loadToObligationRatio = u.billerCount >= 1 ? Math.max(0, 0.7 + 0.5 * ses + 0.3 * rel + rng.normal(0, 0.35)) : null;
  v.sequencingStability = u.billerCount >= 2 && u.latePaymentCount >= 1 ? clamp(0.2 + 0.6 * rel + rng.normal(0, 0.18), 0, 1) : null;

  const hadShock = u.payCount >= 2 && rng.bernoulli(0.4);
  v.shockPaidFullRate = hadShock ? clamp(0.25 + 0.55 * rel + 0.15 * ses + rng.normal(0, 0.15), 0, 1) : null;
  v.billShockWalletResponseRate = hadShock && (v.shockPaidFullRate as number) > 0.05 ? clamp(0.15 + 0.55 * ses + rng.normal(0, 0.2), 0, 1) : null;
  if (hadShock) {
    const q = rel + rng.normal(0, 0.2);
    v.billShockResponse = q > 0.65 ? 3 : q > 0.45 ? 2 : q > 0.25 ? 1 : 0;
  } else {
    v.billShockResponse = null;
  }

  return { u, lat, base, vals: v };
}

// ─── scored-field accessors (39 fields; booleans/strings encoded) ───────────

const SCORED_ACCESSORS: { name: string; get: (u: SyntheticUser) => number }[] = [
  "streakMonths", "payCount", "domStddev", "dominantDay", "advanceDays", "selfRatio",
  "loginDays30", "hourStd", "scratchPlays", "spinPlays", "missionsDone", "loadCount30", "loadDayStd",
  "paulaInteractions", "confirmed2fa", "declined2fa", "pushOpens", "curiosityIndex",
  "billerCount", "utilityRatio", "intentClicks", "hoursToFirst", "deviceScore",
  "currentBalance", "totalLoads", "totalSpend", "amountCV", "p2pSendCount", "p2pRecipientCount", "daysOld",
  "daysToFirstSpei", "oxxoLoadCount", "speiLoadCount", "cardLoadCount",
  "lateRecoveryRatio", "latePaymentCount", "paulaResponseLatencyMinutes",
].map((f) => ({ name: f, get: (u: SyntheticUser) => u[f as keyof PTIDataSnapshot] as number }));
SCORED_ACCESSORS.push({ name: "kycVerified", get: (u) => (u.kycVerified ? 1 : 0) });
SCORED_ACCESSORS.push({ name: "kycTier", get: (u) => (u.kycTier === "full" ? 1 : 0) });

// The 8 income-proxy variables flagged by the original disparate-impact
// stress test (ptiStressTest.ts §6 / ptiAblationStudy.ts FIELD_META
// sesLink="direct"):
const PROXY_NAMES = ["deviceScore", "currentBalance", "totalLoads", "totalSpend", "speiLoadCount", "cardLoadCount", "oxxoLoadCount", "kycVerified"];

// ─── four-fifths (identical logic to ptiAblationStudy.computeMetrics) ───────

const BUCKET_ORDER = ["bucket_1_lowest", "bucket_2", "bucket_3", "bucket_4", "bucket_5_highest"];
const APPROVAL_THRESHOLD = 60;
function fourFifths(scores: number[], buckets: string[]): number {
  const byBucket = new Map<string, number[]>();
  for (let i = 0; i < scores.length; i++) {
    const s = scores[i];
    if (!Number.isFinite(s) || s < 0 || s > 100) continue;
    if (!byBucket.has(buckets[i])) byBucket.set(buckets[i], []);
    byBucket.get(buckets[i])!.push(s);
  }
  const rates: number[] = [];
  for (const k of BUCKET_ORDER) {
    const xs = byBucket.get(k) ?? [];
    if (xs.length) rates.push(xs.filter((x) => x >= APPROVAL_THRESHOLD).length / xs.length);
  }
  const maxR = Math.max(...rates);
  return maxR > 0 ? Math.min(...rates) / maxR : 1;
}

// ─── designed-risk cohorts + bolt-on scoring ────────────────────────────────

const TEST_WEIGHT = 3;
const LOW_RISK_MIN = 0.6;   // relHat ≥ 0.6 → designed low-risk
const HIGH_RISK_MAX = 0.35; // relHat ≤ 0.35 → designed high-risk

function boltOnScore(su: SynthUser, spec: FieldSpec): number {
  const raw = su.vals[spec.name];
  const boost = raw === null ? 0 : TEST_WEIGHT * spec.unit(raw);
  return clamp(su.base + boost, 0, 100);
}

function riskSeparationD(sus: SynthUser[], scoreOf: (su: SynthUser) => number): number {
  const good: number[] = [];
  const bad: number[] = [];
  for (const su of sus) {
    if (su.lat.rel >= LOW_RISK_MIN) good.push(scoreOf(su));
    else if (su.lat.rel <= HIGH_RISK_MAX) bad.push(scoreOf(su));
  }
  return cohensD(good, bad);
}

// ─── monotonicity: decile means of relHat vs field value ────────────────────

function monotonicity(sus: SynthUser[], field: string): { verdict: string; detail: string } {
  const pairs = sus
    .filter((su) => su.vals[field] !== null && Number.isFinite(su.vals[field] as number))
    .map((su) => ({ v: su.vals[field] as number, rel: su.lat.rel }))
    .sort((a, b) => a.v - b.v);
  if (pairs.length < 100) return { verdict: "n/a", detail: `only ${pairs.length} computed values` };
  const nDec = 10;
  const decMeans: number[] = [];
  for (let d = 0; d < nDec; d++) {
    const lo = Math.floor((d * pairs.length) / nDec);
    const hi = Math.floor(((d + 1) * pairs.length) / nDec);
    decMeans.push(mean(pairs.slice(lo, hi).map((p) => p.rel)));
  }
  const trend = Math.sign(decMeans[nDec - 1] - decMeans[0]);
  const TOL = 0.02;
  let reversalAt = -1;
  for (let d = 1; d < nDec; d++) {
    const diff = decMeans[d] - decMeans[d - 1];
    if (trend !== 0 && Math.sign(diff) === -trend && Math.abs(diff) > TOL) { reversalAt = d + 1; break; }
  }
  const dir = trend > 0 ? "↑" : trend < 0 ? "↓" : "flat";
  const detail = `decile relHat means [${decMeans.map((m) => m.toFixed(2)).join(",")}] trend=${dir}`;
  return reversalAt === -1
    ? { verdict: "yes", detail }
    : { verdict: `NO (reversal at decile ${reversalAt})`, detail };
}

// ─── main ───────────────────────────────────────────────────────────────────

const STABILITY_SEGMENTS: Segment[] = ["normal", "gradient_sweep", "cold_start_sparse", "contradictory", "gaming_selfratio_advance", "gaming_ungated_surfaces"];

async function main() {
  const seed = process.env.PTI_STRESS_SEED ? Number(process.env.PTI_STRESS_SEED) : 0xc0ffee;
  const size = process.env.PTI_STRESS_SIZE ? Number(process.env.PTI_STRESS_SIZE) : 8000;

  console.log("█".repeat(100));
  console.log("  PTI NEW-FIELD ABLATION & PROXY-CORRELATION STUDY — 15 Stage-1/2 fields");
  console.log(`  seed=${seed} size=${size} testWeight=+${TEST_WEIGHT}pts (bolt-on) cohorts: relHat≥${LOW_RISK_MIN} vs ≤${HIGH_RISK_MAX}  (DEV-ONLY, no DB)`);
  console.log("█".repeat(100));

  const population = generatePopulation({ seed, size });
  const sus: SynthUser[] = population.map((u) => synthesizeAll(u, seed, computePTI(toSnapshot(u)).breakdown.total));
  const buckets = population.map((u) => u.declaredIncomeBucket);
  const baseScores = sus.map((su) => su.base);

  const dBase = riskSeparationD(sus, (su) => su.base);
  const ffBase = fourFifths(baseScores, buckets);
  const nGood = sus.filter((su) => su.lat.rel >= LOW_RISK_MIN).length;
  const nBad = sus.filter((su) => su.lat.rel <= HIGH_RISK_MAX).length;

  header("0. BASELINE (all 15 fields at defaults — identical to prior harness runs)");
  console.log(`  n=${sus.length}  designed-low-risk n=${nGood}  designed-high-risk n=${nBad}`);
  console.log(`  baseline risk-separation Cohen's d (low-risk vs high-risk cohort scores) = ${fmt(dBase)}`);
  console.log(`  baseline four-fifths ratio (income buckets, ≥${APPROVAL_THRESHOLD}) = ${fmt(ffBase)}`);

  header("1-7. PER-FIELD ANALYSIS");
  interface Row {
    spec: FieldSpec; delta: number; covComputed: number; covNonDefault: number;
    top3: string; proxyLine: string; maxProxy: string; ff: number;
    mono: string; stability: string; stable: string; sesR: number;
  }
  const rows: Row[] = [];

  for (const spec of SPECS) {
    const f = spec.name;
    const computed = sus.filter((su) => su.vals[f] !== null && Number.isFinite(su.vals[f] as number));
    const covComputed = computed.length / sus.length;
    const covNonDefault = spec.defaultVal === null
      ? covComputed
      : computed.filter((su) => su.vals[f] !== spec.defaultVal).length / sus.length;

    // item 1: ablation delta at +3pts bolt-on
    const dWith = riskSeparationD(sus, (su) => boltOnScore(su, spec));
    const delta = dWith - dBase;

    // item 3: top-3 scored-field correlations
    const fv = computed.map((su) => su.vals[f] as number);
    const corrs: { name: string; r: number }[] = [];
    for (const acc of SCORED_ACCESSORS) {
      const xs: number[] = [];
      const ys: number[] = [];
      for (const su of computed) {
        const sv = acc.get(su.u);
        if (Number.isFinite(sv)) { xs.push(su.vals[f] as number); ys.push(sv); }
      }
      const r = pearson(xs, ys);
      if (Number.isFinite(r)) corrs.push({ name: acc.name, r });
    }
    corrs.sort((a, b) => Math.abs(b.r) - Math.abs(a.r));
    const top3 = corrs.slice(0, 3).map((c) => `${c.name}(${c.r.toFixed(2)})`).join(" ");

    // item 4: proxy correlations (full vector) + ses direct
    const proxyRs = PROXY_NAMES.map((p) => {
      const acc = SCORED_ACCESSORS.find((a) => a.name === p)!;
      const xs: number[] = [];
      const ys: number[] = [];
      for (const su of computed) {
        const sv = acc.get(su.u);
        if (Number.isFinite(sv)) { xs.push(su.vals[f] as number); ys.push(sv); }
      }
      return { p, r: pearson(xs, ys) };
    });
    const maxProxyObj = proxyRs.reduce((a, b) => (Math.abs(b.r) > Math.abs(a.r) ? b : a));
    const sesR = pearson(fv, computed.map((su) => su.u._ses));
    const proxyLine = proxyRs.map((x) => `${x.p}=${Number.isFinite(x.r) ? x.r.toFixed(2) : "n/a"}`).join(" ");

    // item 5: four-fifths at +3pts
    const ffWith = fourFifths(sus.map((su) => boltOnScore(su, spec)), buckets);

    // item 6: monotonicity
    const mono = monotonicity(sus, f);

    // item 7: stability across segments
    const segDeltas: string[] = [];
    const segNums: number[] = [];
    for (const seg of STABILITY_SEGMENTS) {
      const segSus = sus.filter((su) => su.u._segment === seg);
      const g = segSus.filter((su) => su.lat.rel >= LOW_RISK_MIN).length;
      const b = segSus.filter((su) => su.lat.rel <= HIGH_RISK_MAX).length;
      if (g < 30 || b < 30) { segDeltas.push(`${seg}=n/a(${g}/${b})`); continue; }
      const dB = riskSeparationD(segSus, (su) => su.base);
      const dW = riskSeparationD(segSus, (su) => boltOnScore(su, spec));
      const dd = dW - dB;
      segNums.push(dd);
      segDeltas.push(`${seg}=${dd >= 0 ? "+" : ""}${dd.toFixed(3)}`);
    }
    const spread = segNums.length >= 2 ? Math.max(...segNums) - Math.min(...segNums) : 0;
    const sameSign = segNums.length >= 2 ? segNums.every((x) => Math.sign(x) === Math.sign(segNums[0]) || Math.abs(x) < 0.005) : true;
    const stable = segNums.length < 2 ? "n/a (only 1 segment measurable)" : sameSign && spread < Math.max(0.02, Math.abs(delta) * 1.5) ? "yes" : `NO (spread=${spread.toFixed(3)}, signConsistent=${sameSign})`;

    rows.push({
      spec, delta, covComputed, covNonDefault, top3, proxyLine,
      maxProxy: `${maxProxyObj.p}(${Number.isFinite(maxProxyObj.r) ? maxProxyObj.r.toFixed(2) : "n/a"})`,
      ff: ffWith, mono: mono.verdict, stability: segDeltas.join("  "), stable, sesR,
    });

    console.log(`\n── ${f}  [${spec.stage}, assumption confidence: ${spec.confidence}] ${"─".repeat(Math.max(1, 60 - f.length))}`);
    console.log(`  synthesis: ${spec.assumption}`);
    console.log(`  orientation: ${spec.orientationDoc}`);
    console.log(`  coverage: computed=${(covComputed * 100).toFixed(1)}%  non-default=${(covNonDefault * 100).toFixed(1)}%`);
    console.log(`  ablation: d(base)=${fmt(dBase)} → d(+${TEST_WEIGHT}pts)=${fmt(dWith)}  Δd=${delta >= 0 ? "+" : ""}${fmt(delta)}`);
    console.log(`  top-3 scored-field correlations: ${top3}`);
    console.log(`  proxy correlations: ${proxyLine}`);
    console.log(`  max proxy=${rows[rows.length - 1].maxProxy}   direct r(field,_ses)=${fmt(sesR, 2)}`);
    console.log(`  four-fifths: ${fmt(ffBase)} → ${fmt(ffWith)}`);
    console.log(`  monotonic vs designed risk: ${mono.verdict}   ${mono.detail}`);
    console.log(`  per-segment Δd: ${segDeltas.join("  ")}`);
    console.log(`  stable across cohorts: ${stable}`);
  }

  header("SUMMARY TABLE (one row per field)");
  console.log("field | conf | Δd | cov% | maxProxy | r(_ses) | 4/5@+3 | mono | stable");
  for (const r of rows) {
    console.log(
      `${r.spec.name} | ${r.spec.confidence} | ${r.delta >= 0 ? "+" : ""}${r.delta.toFixed(3)} | ${(r.covComputed * 100).toFixed(1)} | ${r.maxProxy} | ${Number.isFinite(r.sesR) ? r.sesR.toFixed(2) : "n/a"} | ${r.ff.toFixed(3)} | ${r.mono} | ${r.stable}`,
    );
  }
  console.log(`\nbaseline: d=${fmt(dBase)}  4/5=${fmt(ffBase)}  (4/5 pass bar = 0.80)`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
