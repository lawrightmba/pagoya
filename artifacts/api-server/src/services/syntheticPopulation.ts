/**
 * Synthetic Population Generator — PTI stress-testing (DEV/LOCAL ONLY)
 * ============================================================================
 * Self-contained. No DB, no network, no real user data. Generates synthetic
 * `PTIDataSnapshot` objects with realistic, correlated, parameterized
 * distributions (not uniform random) so the REAL, unmodified `computePTI`
 * engine (pti.ts) can be stress-tested at volume.
 *
 * NOTHING here is ever written to production. Everything is generated from
 * hand-specified statistical distributions seeded by a deterministic PRNG so
 * runs are reproducible.
 *
 * Each synthetic user also carries METADATA-ONLY fields — colonia, coloniaTier,
 * declaredIncomeBucket — that are NEVER fed into `computePTI` (the base engine
 * doesn't even accept them). They exist solely so the runner can do a
 * disparate-impact / proxy-leakage analysis grouping scores by those excluded
 * variables. They are shaped by a latent socioeconomic factor that ALSO drives
 * some legitimately-scored behavioral signals (device tenure, KYC, funding-rail
 * mix, balance) — which is exactly how excluded variables can leak into a score
 * through correlated proxies even when never scored directly.
 */

import type { PTIDataSnapshot } from "./pti.js";

// ─── Segment taxonomy ─────────────────────────────────────────────────────────

export type Segment =
  | "normal"
  | "cold_start_sparse"
  | "contradictory"
  | "gradient_sweep"
  | "gaming_selfratio_advance"
  | "gaming_ungated_surfaces";

export interface SyntheticUser extends PTIDataSnapshot {
  /** Which generator archetype produced this profile. */
  _segment: Segment;
  /** Stable synthetic id (index-based). */
  _id: number;
  // ── METADATA ONLY — never passed to computePTI ──
  colonia: string;
  coloniaTier: string;        // tier_1_marginacion_muy_bajo .. tier_5_marginacion_muy_alto
  declaredIncomeBucket: string; // bucket_1_lowest .. bucket_5_highest
  /** Latent socioeconomic factor [0,1] used to shape metadata + some signals. Kept for analysis only. */
  _ses: number;
}

// ─── Seeded PRNG (mulberry32) — deterministic & reproducible ──────────────────

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─── Distribution helpers ─────────────────────────────────────────────────────

function makeRng(seed: number) {
  const r = mulberry32(seed);

  const uniform = (min: number, max: number) => min + (max - min) * r();

  // Standard normal via Box-Muller.
  const randn = () => {
    let u = 0;
    let v = 0;
    while (u === 0) u = r();
    while (v === 0) v = r();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  };

  // Normal with clamping.
  const normal = (mean: number, sd: number, min = -Infinity, max = Infinity) =>
    clamp(mean + sd * randn(), min, max);

  // Right-skewed positive values.
  const lognormal = (mu: number, sigma: number) => Math.exp(mu + sigma * randn());

  const bernoulli = (p: number) => r() < p;

  // Poisson (Knuth) — for count-like fields.
  const poisson = (lambda: number) => {
    if (lambda <= 0) return 0;
    const L = Math.exp(-lambda);
    let k = 0;
    let p = 1;
    do {
      k++;
      p *= r();
    } while (p > L);
    return k - 1;
  };

  const pick = <T>(arr: T[]) => arr[Math.floor(r() * arr.length)];

  return { raw: r, uniform, randn, normal, lognormal, bernoulli, poisson, pick };
}

type Rng = ReturnType<typeof makeRng>;

function clamp(x: number, min: number, max: number) {
  return Math.max(min, Math.min(max, x));
}

function round1(x: number) {
  return Math.round(x * 10) / 10;
}

// ─── Colonia / marginación / income metadata (Puerto Vallarta) ────────────────
// Real PV colonia names used elsewhere in the codebase (street_team.colonia,
// PagarPredialVallarta.tsx). Each is given a baseline marginación tier so that a
// user's latent SES can pick a plausible colonia. Names are metadata labels;
// coloniaTier is the field the fair-lending layer would key on.

const COLONIAS_BY_TIER: { name: string; tier: string }[] = [
  { name: "Marina Vallarta", tier: "tier_1_marginacion_muy_bajo" },
  { name: "Fluvial Vallarta", tier: "tier_1_marginacion_muy_bajo" },
  { name: "Versalles", tier: "tier_2_marginacion_bajo" },
  { name: "Zona Romántica", tier: "tier_2_marginacion_bajo" },
  { name: "5 de Diciembre", tier: "tier_3_marginacion_medio" },
  { name: "Emiliano Zapata", tier: "tier_3_marginacion_medio" },
  { name: "El Pitillal", tier: "tier_4_marginacion_alto" },
  { name: "Ixtapa", tier: "tier_4_marginacion_alto" },
  { name: "Las Juntas", tier: "tier_5_marginacion_muy_alto" },
];

const INCOME_BUCKETS = [
  "bucket_1_lowest",
  "bucket_2",
  "bucket_3",
  "bucket_4",
  "bucket_5_highest",
];

/**
 * Assign colonia + tier + income bucket from a latent SES factor, with noise so
 * the mapping is correlated-but-not-deterministic (realistic). Higher SES →
 * lower marginación colonia + higher income bucket.
 */
function assignMetadata(ses: number, rng: Rng): { colonia: string; coloniaTier: string; declaredIncomeBucket: string } {
  // COLONIAS_BY_TIER is ordered wealthiest → poorest. High SES → index 0.
  const n = COLONIAS_BY_TIER.length;
  const noisyPos = clamp((1 - ses) * (n - 1) + rng.normal(0, 1.1), 0, n - 1);
  const colObj = COLONIAS_BY_TIER[Math.round(noisyPos)];

  // Income bucket 1..5, high SES → bucket_5_highest.
  const bIdx = clamp(Math.round(ses * 4 + rng.normal(0, 0.7)), 0, 4);

  return { colonia: colObj.name, coloniaTier: colObj.tier, declaredIncomeBucket: INCOME_BUCKETS[bIdx] };
}

// ─── Core field synthesis from latent factors ─────────────────────────────────
// Three latent factors drive correlated fields:
//   reliability — payment discipline (streak, self-init, advance, low variance)
//   engagement  — app/Paula/game activity cadence
//   ses         — socioeconomic proxy (device, KYC, banking rails, balances)
// reliability & engagement are moderately correlated; ses is weakly correlated
// with reliability (kept weak on purpose so the disparate-impact test measures
// real proxy leakage rather than a hand-planted result).

interface Latents {
  reliability: number;
  engagement: number;
  ses: number;
}

function drawLatents(rng: Rng): Latents {
  const base = clamp(rng.normal(0.5, 0.22), 0, 1);
  const reliability = clamp(0.55 * base + 0.45 * clamp(rng.normal(0.5, 0.22), 0, 1), 0, 1);
  const engagement = clamp(0.5 * reliability + 0.5 * clamp(rng.normal(0.5, 0.24), 0, 1), 0, 1);
  const ses = clamp(0.25 * reliability + 0.75 * clamp(rng.normal(0.5, 0.25), 0, 1), 0, 1);
  return { reliability, engagement, ses };
}

/**
 * Build a full, internally-consistent snapshot from latent factors.
 * `scale` (0..1) globally attenuates activity — used by the gradient sweep to
 * densely span the whole 0..100 score range for boundary coverage.
 */
function synthFromLatents(l: Latents, rng: Rng, scale = 1): PTIDataSnapshot {
  const { reliability: rel, engagement: eng, ses } = l;

  // Account age — right-skewed, older accounts more common among engaged users.
  const daysOld = Math.round(clamp(rng.lognormal(3.4 + 0.8 * eng, 0.9) * scale, 0, 400));

  // Payment history (6mo). payCount right-skewed, gated by tenure.
  const maxByTenure = Math.max(0, Math.floor(daysOld / 15));
  const payCount = Math.max(0, Math.min(maxByTenure, Math.round(rng.poisson(rel * 8 * scale))));

  const monthsPossible = Math.floor(daysOld / 30);
  const streakMonths = Math.max(
    0,
    Math.min(monthsPossible, Math.round(rel * monthsPossible * (0.6 + 0.4 * rng.raw()))),
  );

  const domStddev = payCount > 0 ? round1(clamp(15 - 13 * rel + rng.normal(0, 2), 0.3, 20)) : 15;
  const dominantDay = payCount > 0 ? Math.round(clamp(rng.uniform(1, 28), 1, 28)) : 0;
  const advanceDays = payCount > 0 ? round1(clamp(rel * 10 + rng.normal(0, 1.5), 0, 15)) : 0;
  const selfRatio = payCount > 0 ? round1(clamp(rel * 0.9 + rng.normal(0, 0.12), 0, 1)) : 0;

  // Behavioral consistency
  const loginDays30 = Math.round(clamp(eng * 30 * scale + rng.normal(0, 3), 0, 30));
  const hourStd = round1(clamp(12 - 10 * eng + rng.normal(0, 1.5), 0, 12));
  const scratchPlays = Math.round(clamp(rng.poisson(eng * 8 * scale), 0, 60));
  const spinPlays = Math.round(clamp(rng.poisson(eng * 6 * scale), 0, 60));
  const missionsDone = Math.round(clamp(rng.poisson(eng * 4 * scale), 0, 30));
  const loadCount30 = Math.round(clamp(rng.poisson((0.5 + eng * 4) * scale), 0, 40));
  const loadDayStd = round1(clamp(30 - 27 * eng + rng.normal(0, 3), 0.5, 30));
  const paulaInteractions = Math.round(clamp(rng.poisson(eng * 14 * scale), 0, 80));
  const confirmed2fa = Math.round(clamp(rng.poisson(eng * 4 * scale), 0, 30));
  const declined2fa = Math.round(clamp(rng.poisson((1 - rel) * 1.2), 0, 10));
  const pushOpens = Math.round(clamp(rng.poisson(eng * 6 * scale), 0, 40));
  const curiosityIndex = round1(clamp(eng * 0.28 + rng.normal(0, 0.05), 0, 1));

  // Engagement depth
  const billerCount = payCount > 0 ? Math.round(clamp(rng.poisson(1 + rel * 3.5), 0, 10)) : Math.round(clamp(rng.poisson(0.2), 0, 3));
  const kycVerified = rng.bernoulli(clamp(0.15 + 0.7 * ses + 0.1 * Math.min(daysOld / 60, 1), 0, 0.98));
  const kycTier = kycVerified ? (rng.bernoulli(clamp(0.2 + 0.7 * ses, 0, 0.95)) ? "full" : "simplified") : "simplified";
  const utilityRatio = payCount > 0 ? round1(clamp(rng.normal(0.55, 0.25), 0, 1)) : 0;
  const intentClicks = Math.round(clamp(rng.poisson(0.4 + eng * 1.5), 0, 15));
  const hoursToFirst = payCount > 0 ? round1(clamp(rng.lognormal(2.6 - 1.2 * rel, 0.9), 0.2, 800)) : NaN;
  const deviceScore = Math.round(clamp(ses * 100 + rng.normal(0, 12), 0, 100));

  // Cash-flow stability
  const currentBalance = Math.round(clamp(rng.lognormal(3.2 + 2.2 * ses, 1.1) * scale, 0, 20000));
  const totalLoads = Math.round(clamp(rng.lognormal(5.2 + 2.0 * ses, 0.9) * scale, 0, 120000));
  const spendRatio = clamp(rng.normal(0.9, 0.25), 0.2, 1.6);
  const totalSpend = Math.round(clamp(totalLoads * spendRatio, 0, 120000));
  const amountCV = payCount >= 2 ? round1(clamp(0.6 - 0.5 * rel + rng.normal(0, 0.12), 0.02, 2)) : round1(clamp(rng.uniform(0.5, 2), 0, 2));
  const p2pSendCount = Math.round(clamp(rng.poisson(eng * 3 * scale), 0, 40));
  const p2pRecipientCount = Math.min(p2pSendCount, Math.round(clamp(rng.poisson(eng * 2 * scale), 0, 20)));

  // Wallet load channels — low SES leans cash (OXXO); high SES leans SPEI/card.
  const totalLoadEvents = Math.max(0, loadCount30 + Math.round(rng.poisson(2 * scale)));
  const bankShare = clamp(ses * 0.85 + rng.normal(0, 0.12), 0, 1);
  const speiLoadCount = Math.round(totalLoadEvents * bankShare * clamp(rng.normal(0.6, 0.15), 0, 1));
  const cardLoadCount = Math.round(totalLoadEvents * bankShare * clamp(rng.normal(0.4, 0.15), 0, 1));
  const oxxoLoadCount = Math.max(0, totalLoadEvents - speiLoadCount - cardLoadCount);
  const daysToFirstSpei = speiLoadCount > 0 ? Math.round(clamp(rng.lognormal(2.5 - 1.8 * ses, 0.9), 0, 200)) : NaN;

  // v4.2 high-granularity
  const latePaymentCount = payCount >= 3 ? Math.round(clamp(rng.poisson((1 - rel) * 2.5), 0, payCount)) : 0;
  const lateRecoveryRatio = latePaymentCount > 0 ? round1(clamp(rel * 0.9 + rng.normal(0, 0.12), 0, 1)) : NaN;
  const paulaResponseLatencyMinutes = paulaInteractions > 0 && rng.bernoulli(0.8)
    ? Math.round(clamp(rng.lognormal(3.2 - 1.4 * eng, 0.8), 1, 1440))
    : NaN;

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

// ─── The zero/cold-start baseline (matches pti.test.ts baseSnapshot) ──────────

function coldBaseline(): PTIDataSnapshot {
  return {
    streakMonths: 0, payCount: 0, domStddev: 15, dominantDay: 0, advanceDays: 0, selfRatio: 0,
    loginDays30: 0, hourStd: 12, scratchPlays: 0, spinPlays: 0, missionsDone: 0, loadCount30: 0, loadDayStd: 30,
    paulaInteractions: 0, confirmed2fa: 0, declined2fa: 0, pushOpens: 0, curiosityIndex: 0,
    billerCount: 0, kycVerified: false, kycTier: "simplified", utilityRatio: 0, intentClicks: 0,
    hoursToFirst: NaN, deviceScore: 0,
    currentBalance: 0, totalLoads: 0, totalSpend: 0, amountCV: 1, p2pSendCount: 0, p2pRecipientCount: 0, daysOld: 0,
    daysToFirstSpei: NaN, oxxoLoadCount: 0, speiLoadCount: 0, cardLoadCount: 0,
    lateRecoveryRatio: NaN, latePaymentCount: 0, paulaResponseLatencyMinutes: NaN,
  };
}

// ─── Per-segment builders ─────────────────────────────────────────────────────

function buildColdStart(rng: Rng): PTIDataSnapshot {
  // Only 1–2 real data points; everything else at cold defaults.
  const s = coldBaseline();
  s.daysOld = Math.round(rng.uniform(0, 5));
  // Give at most a whisper of activity.
  if (rng.bernoulli(0.5)) s.loginDays30 = Math.round(rng.uniform(1, 2));
  if (rng.bernoulli(0.3)) s.currentBalance = Math.round(rng.uniform(0, 120));
  if (rng.bernoulli(0.2)) s.paulaInteractions = 1;
  return s;
}

function buildContradictory(rng: Rng): PTIDataSnapshot {
  // High engagement, zero payment history — tests that BC/ED can accrue while
  // PR stays gated to (near) zero, and that nothing NaN/negative results.
  const eng = clamp(rng.normal(0.85, 0.1), 0.5, 1);
  const s = synthFromLatents({ reliability: 0, engagement: eng, ses: clamp(rng.normal(0.6, 0.2), 0, 1) }, rng, 1);
  // Force the payment side fully cold, keep engagement rich.
  s.payCount = 0;
  s.streakMonths = 0;
  s.domStddev = 15;
  s.dominantDay = 0;
  s.advanceDays = 0;
  s.selfRatio = 0;
  s.hoursToFirst = NaN;
  s.latePaymentCount = 0;
  s.lateRecoveryRatio = NaN;
  s.utilityRatio = 0;
  s.daysOld = Math.max(s.daysOld, 30);
  return s;
}

function buildGamingSelfRatioAdvance(rng: Rng): { snap: PTIDataSnapshot; payCount: number } {
  // Inflates the reliability signals that are supposed to be gated behind
  // payCount>=3 (self-init, advance-days, day-consistency) and payCount>=2
  // (volatility) while keeping payCount below those gates.
  const payCount = rng.pick([0, 1, 2]);
  const s = coldBaseline();
  s.daysOld = Math.round(rng.uniform(10, 120));
  s.payCount = payCount;
  s.streakMonths = payCount; // can only be as high as months of payments realistically
  s.selfRatio = 0.98;        // maxed
  s.advanceDays = 14;        // maxed
  s.domStddev = 0.4;         // maxed consistency
  s.dominantDay = 5;
  s.amountCV = 0.03;         // maxed low volatility
  s.billerCount = 4;
  s.utilityRatio = 0.9;
  return { snap: s, payCount };
}

function buildGamingUngatedSurfaces(rng: Rng): PTIDataSnapshot {
  // Probes PRODUCTION-REACHABLE reward surfaces that are NOT behind the
  // payCount cold-start gates, all with payCount=0 (never paid a bill). Every
  // field here is a value the real snapshot builder (buildPTISnapshotFromDb)
  // CAN emit for a zero-payment user:
  //   - domStddev stays at the payment-derived default of 15 (no payments →
  //     cannot be driven low; the routine sub-score's dom half is therefore 0).
  //   - hourStd IS login-derived (user_events), so a regular-logging user with
  //     no bill payments legitimately has low hourStd → routine's hour half.
  //   - hoursToFirst stays NaN (no first payment exists).
  //   - buffer-retention: a real balance with no loads in the 90d window
  //     (currentBalance>0, totalLoads=0) is reachable via older loads.
  const s = coldBaseline();
  s.daysOld = Math.round(rng.uniform(10, 120));
  s.payCount = 0;
  s.domStddev = 15;    // payment-derived default (no payments) — NOT drivable low
  s.hourStd = 0.3;     // login-derived, reachable low → routine hour half
  s.hoursToFirst = NaN; // no payment → NaN, as the real builder emits
  s.currentBalance = 900; // buffer-retention (totalLoads=0 branch), reachable
  s.totalLoads = 0;
  s.loginDays30 = 22;  // legit BC cadence
  return s;
}

// ─── Public API: generate the full population ─────────────────────────────────

export interface GeneratePopulationOptions {
  size?: number;   // approximate total (5000–10000)
  seed?: number;
}

/**
 * Generates the full synthetic population across all segments. Deterministic
 * for a given seed. Returns SyntheticUser[] (snapshot + metadata + segment).
 */
export function generatePopulation(opts: GeneratePopulationOptions = {}): SyntheticUser[] {
  const size = clamp(opts.size ?? 8000, 1000, 20000);
  const rng = makeRng(opts.seed ?? 0xC0FFEE);

  const users: SyntheticUser[] = [];
  let id = 0;

  const push = (snap: PTIDataSnapshot, segment: Segment, ses: number) => {
    const meta = assignMetadata(ses, rng);
    users.push({ ...snap, _segment: segment, _id: id++, _ses: ses, ...meta });
  };

  // Segment mix (fractions of `size`).
  const nColdStart = Math.round(size * 0.08);
  const nContradictory = Math.round(size * 0.05);
  const nGamingA = Math.round(size * 0.05);
  const nGamingB = Math.round(size * 0.04);
  const nGradient = Math.round(size * 0.12);
  const nNormal = size - nColdStart - nContradictory - nGamingA - nGamingB - nGradient;

  // 1) Normal population — the bulk.
  for (let i = 0; i < nNormal; i++) {
    const l = drawLatents(rng);
    push(synthFromLatents(l, rng, 1), "normal", l.ses);
  }

  // 2) Cold-start sparse.
  for (let i = 0; i < nColdStart; i++) {
    push(buildColdStart(rng), "cold_start_sparse", clamp(rng.normal(0.5, 0.25), 0, 1));
  }

  // 3) Contradictory (high engagement, zero payments).
  for (let i = 0; i < nContradictory; i++) {
    const ses = clamp(rng.normal(0.6, 0.2), 0, 1);
    push(buildContradictory(rng), "contradictory", ses);
  }

  // 4) Gaming — inflated self/advance/consistency with sub-gate payCount.
  for (let i = 0; i < nGamingA; i++) {
    const { snap } = buildGamingSelfRatioAdvance(rng);
    push(snap, "gaming_selfratio_advance", clamp(rng.normal(0.5, 0.25), 0, 1));
  }

  // 5) Gaming — ungated reward surfaces with zero payments.
  for (let i = 0; i < nGamingB; i++) {
    push(buildGamingUngatedSurfaces(rng), "gaming_ungated_surfaces", clamp(rng.normal(0.5, 0.25), 0, 1));
  }

  // 6) Gradient sweep — dense coverage across the whole 0..100 score range so
  //    every tier boundary is well populated on both sides. Latents rise
  //    together with a controlled scale, plus jitter so it isn't a single line.
  for (let i = 0; i < nGradient; i++) {
    const g = i / Math.max(1, nGradient - 1); // 0..1
    const jitter = () => clamp(g + rng.normal(0, 0.05), 0, 1);
    const l: Latents = { reliability: jitter(), engagement: jitter(), ses: jitter() };
    push(synthFromLatents(l, rng, clamp(g + rng.normal(0, 0.05), 0.02, 1)), "gradient_sweep", l.ses);
  }

  return users;
}
