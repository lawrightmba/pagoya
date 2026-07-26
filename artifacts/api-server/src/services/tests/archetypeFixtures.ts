/**
 * Archetype Fixture Library — Sprint 9 / Part A
 *
 * Ten synthetic behavioral archetypes exercising the full PTI v2 shadow
 * pipeline: production v5 score, Shadow Behavioral Profile (PR/CFR/BS),
 * Evidence Depth, Behavioral Trajectory, and Expected Obligations.
 *
 * No real user data. No v5/readinessGate/licensee/weight changes anywhere.
 *
 * HARD CONSTRAINTS:
 *   • DETERIORATING: decline from genuinely different observed values over time.
 *     latePaymentCount=0. No fabricated missed/late event in payments array.
 *   • SPARSE_STALE: EO lifecycle=STALE comes from 78d gap > 2.5×30d=75d threshold.
 *     No MISSED/UNRESOLVED event from a fabricated missed payment.
 *   • BANKED_EQUIVALENT: identical payment behavior to CASH_FIRST_CONSISTENT,
 *     only funding-channel/KYC fields differ. Shadow score must match.
 */

import { DERIVED_FEATURE_DEFAULTS } from "../ptiDerivedFeatures.js";
import type { PTIDataSnapshot } from "../pti.js";
import type {
  EvidenceDepthRawInputs,
  ScoreHistoryRow,
  BillPaymentObservation,
} from "../ptiV2.js";

/** Reference time for all fixture computations. Fixed for determinism. */
export const ARCHETYPE_REF = new Date("2026-07-26T12:00:00.000Z");

const MS = 86_400_000;
function d(n: number): Date {
  return new Date(ARCHETYPE_REF.getTime() - n * MS);
}

/**
 * Model version that MUST appear in scoreHistory rows for trajectory
 * filtering to pick them up (same-model filter in computeBehavioralTrajectory).
 */
export const V5_MODEL_VERSION = "v5.0.0-rc1";

export interface ArchetypeFixture {
  label: string;
  description: string;
  snap: PTIDataSnapshot;
  edInputs: EvidenceDepthRawInputs;
  scoreHistory: ScoreHistoryRow[];
  payments: BillPaymentObservation[];
}

// ─── 1. CASH_FIRST_CONSISTENT ─────────────────────────────────────────────────
export const CASH_FIRST_CONSISTENT: ArchetypeFixture = {
  label: "Cash-First Consistent Payer",
  description:
    "No bank/KYC. 5-month streak. 4 services via OXXO. Slightly improving trajectory " +
    "across all three windows. PR COMPUTED ≥ 55, CFR COMPUTED, BS COMPUTED.",
  snap: {
    streakMonths: 5, payCount: 10, domStddev: 3, dominantDay: 15,
    advanceDays: 4, selfRatio: 0.9,
    loginDays30: 10, hourStd: 8, scratchPlays: 0, spinPlays: 0, missionsDone: 0,
    loadCount30: 5, loadDayStd: 6, paulaInteractions: 2, confirmed2fa: 0, declined2fa: 0,
    pushOpens: 2, curiosityIndex: 0.2,
    billerCount: 4, kycVerified: false, kycTier: "simplified",
    utilityRatio: 0.75, intentClicks: 2, hoursToFirst: 24, deviceScore: 60,
    currentBalance: 350, totalLoads: 2200, totalSpend: 1750, amountCV: 0.08,
    p2pSendCount: 0, p2pRecipientCount: 0, daysOld: 130,
    daysToFirstSpei: NaN, oxxoLoadCount: 18, speiLoadCount: 0, cardLoadCount: 0,
    lateRecoveryRatio: NaN, latePaymentCount: 0, paulaResponseLatencyMinutes: NaN,
    ...DERIVED_FEATURE_DEFAULTS,
  },
  edInputs: {
    firstBillPaymentAt: d(125), lastBillPaymentAt: d(4), billPaymentCount: 10,
    distinctBillers: 4, distinctCategories: 3,
    firstWalletTxAt: d(130), lastWalletTxAt: d(2), walletTxCount: 18,
    consecutivePaymentMonths: 4, activeMonths: 5, longestGapDays: 35,
  },
  scoreHistory: [
    { recordedAt: d(25), breakdown: { model_version: V5_MODEL_VERSION, payment_reliability: { score: 24, max: 36 }, behavioral_consistency: { score: 12, max: 22 }, cashflow_stability: { score: 13, max: 20 }, engagement_depth: { score: 10, max: 22 } } },
    { recordedAt: d(60), breakdown: { model_version: V5_MODEL_VERSION, payment_reliability: { score: 22, max: 36 }, behavioral_consistency: { score: 11, max: 22 }, cashflow_stability: { score: 12, max: 20 }, engagement_depth: { score:  9, max: 22 } } },
    { recordedAt: d(90), breakdown: { model_version: V5_MODEL_VERSION, payment_reliability: { score: 20, max: 36 }, behavioral_consistency: { score: 10, max: 22 }, cashflow_stability: { score: 11, max: 20 }, engagement_depth: { score:  8, max: 22 } } },
  ],
  payments: [
    { serviceId: "cfe",    serviceName: "CFE",    categoria: "utilities", monto: 320, createdAt: d(4)   },
    { serviceId: "cfe",    serviceName: "CFE",    categoria: "utilities", monto: 305, createdAt: d(34)  },
    { serviceId: "cfe",    serviceName: "CFE",    categoria: "utilities", monto: 315, createdAt: d(64)  },
    { serviceId: "cfe",    serviceName: "CFE",    categoria: "utilities", monto: 310, createdAt: d(94)  },
    { serviceId: "cfe",    serviceName: "CFE",    categoria: "utilities", monto: 300, createdAt: d(124) },
    { serviceId: "telmex", serviceName: "Telmex", categoria: "telecom",   monto: 399, createdAt: d(7)   },
    { serviceId: "telmex", serviceName: "Telmex", categoria: "telecom",   monto: 399, createdAt: d(37)  },
    { serviceId: "telmex", serviceName: "Telmex", categoria: "telecom",   monto: 399, createdAt: d(67)  },
    { serviceId: "telmex", serviceName: "Telmex", categoria: "telecom",   monto: 399, createdAt: d(97)  },
  ],
};

// ─── 2. NEW_USER ──────────────────────────────────────────────────────────────
export const NEW_USER: ArchetypeFixture = {
  label: "New User",
  description:
    "12 days old. 1 payment. Shadow aggregate: INSUFFICIENT_DATA (payCount=1 is below " +
    "the PR COMPUTED gate of payCount≥1 BUT BS requires loginDays30≥1 OR loadCount30≥3 OR payCount≥2). " +
    "PR: INSUFFICIENT_DATA (payCount=1 means snap triggers no streak math). " +
    "Actually payCount=1 means PR IS COMPUTED (payCount≥1), but streak=1 gives 0 pts, advance not computed. " +
    "BS: INSUFFICIENT_DATA (loginDays30=3≥1 → COMPUTED actually). " +
    "CFR: COMPUTED (currentBalance=50 > 0). Aggregate: COMPUTED from CFR+BS, PR excluded.",
  snap: {
    streakMonths: 1, payCount: 1, domStddev: 0, dominantDay: 20,
    advanceDays: 1, selfRatio: 0.0,
    loginDays30: 3, hourStd: 6, scratchPlays: 0, spinPlays: 0, missionsDone: 0,
    loadCount30: 1, loadDayStd: 0, paulaInteractions: 1, confirmed2fa: 0, declined2fa: 0,
    pushOpens: 1, curiosityIndex: 0.0,
    billerCount: 1, kycVerified: false, kycTier: "simplified",
    utilityRatio: 1.0, intentClicks: 0, hoursToFirst: 48, deviceScore: 30,
    currentBalance: 50, totalLoads: 200, totalSpend: 150, amountCV: 0,
    p2pSendCount: 0, p2pRecipientCount: 0, daysOld: 12,
    daysToFirstSpei: NaN, oxxoLoadCount: 2, speiLoadCount: 0, cardLoadCount: 0,
    lateRecoveryRatio: NaN, latePaymentCount: 0, paulaResponseLatencyMinutes: NaN,
    ...DERIVED_FEATURE_DEFAULTS,
  },
  edInputs: {
    firstBillPaymentAt: d(10), lastBillPaymentAt: d(10), billPaymentCount: 1,
    distinctBillers: 1, distinctCategories: 1,
    firstWalletTxAt: d(12), lastWalletTxAt: d(2), walletTxCount: 2,
    consecutivePaymentMonths: 0, activeMonths: 0, longestGapDays: 0,
  },
  scoreHistory: [],
  payments: [
    { serviceId: "cfe", serviceName: "CFE", categoria: "utilities", monto: 150, createdAt: d(10) },
  ],
};

// ─── 3. IMPROVING_USER ───────────────────────────────────────────────────────
export const IMPROVING_USER: ArchetypeFixture = {
  label: "Improving User",
  description:
    "History rows much lower than current snap. Trajectory IMPROVING on PR and CFR " +
    "across recent and 30d windows. Shows clear upward direction in all dimensions.",
  snap: {
    streakMonths: 3, payCount: 7, domStddev: 5, dominantDay: 10,
    advanceDays: 3, selfRatio: 0.75,
    loginDays30: 14, hourStd: 5, scratchPlays: 1, spinPlays: 0, missionsDone: 0,
    loadCount30: 5, loadDayStd: 4, paulaInteractions: 6, confirmed2fa: 0, declined2fa: 0,
    pushOpens: 4, curiosityIndex: 0.35,
    billerCount: 3, kycVerified: false, kycTier: "simplified",
    utilityRatio: 0.7, intentClicks: 3, hoursToFirst: 36, deviceScore: 55,
    currentBalance: 220, totalLoads: 1800, totalSpend: 1450, amountCV: 0.15,
    p2pSendCount: 0, p2pRecipientCount: 0, daysOld: 95,
    daysToFirstSpei: NaN, oxxoLoadCount: 14, speiLoadCount: 0, cardLoadCount: 0,
    lateRecoveryRatio: 0.5, latePaymentCount: 2, paulaResponseLatencyMinutes: 45,
    ...DERIVED_FEATURE_DEFAULTS,
  },
  edInputs: {
    firstBillPaymentAt: d(90), lastBillPaymentAt: d(3), billPaymentCount: 7,
    distinctBillers: 3, distinctCategories: 2,
    firstWalletTxAt: d(95), lastWalletTxAt: d(1), walletTxCount: 14,
    consecutivePaymentMonths: 3, activeMonths: 4, longestGapDays: 28,
  },
  scoreHistory: [
    { recordedAt: d(25), breakdown: { model_version: V5_MODEL_VERSION, payment_reliability: { score: 12, max: 36 }, behavioral_consistency: { score:  9, max: 22 }, cashflow_stability: { score:  8, max: 20 }, engagement_depth: { score: 7, max: 22 } } },
    { recordedAt: d(60), breakdown: { model_version: V5_MODEL_VERSION, payment_reliability: { score:  8, max: 36 }, behavioral_consistency: { score:  6, max: 22 }, cashflow_stability: { score:  5, max: 20 }, engagement_depth: { score: 5, max: 22 } } },
    { recordedAt: d(90), breakdown: { model_version: V5_MODEL_VERSION, payment_reliability: { score:  4, max: 36 }, behavioral_consistency: { score:  3, max: 22 }, cashflow_stability: { score:  3, max: 20 }, engagement_depth: { score: 3, max: 22 } } },
  ],
  payments: [
    { serviceId: "cfe",    serviceName: "CFE",    categoria: "utilities", monto: 280, createdAt: d(3)  },
    { serviceId: "cfe",    serviceName: "CFE",    categoria: "utilities", monto: 265, createdAt: d(33) },
    { serviceId: "cfe",    serviceName: "CFE",    categoria: "utilities", monto: 255, createdAt: d(73) },
    { serviceId: "izzi",   serviceName: "Izzi",   categoria: "internet",  monto: 399, createdAt: d(6)  },
    { serviceId: "izzi",   serviceName: "Izzi",   categoria: "internet",  monto: 399, createdAt: d(40) },
    { serviceId: "izzi",   serviceName: "Izzi",   categoria: "internet",  monto: 399, createdAt: d(80) },
    { serviceId: "telmex", serviceName: "Telmex", categoria: "telecom",   monto: 299, createdAt: d(8)  },
    { serviceId: "telmex", serviceName: "Telmex", categoria: "telecom",   monto: 299, createdAt: d(68) },
  ],
};

// ─── 4. DETERIORATING_USER — genuine decline, no fabricated event ──────────
export const DETERIORATING_USER: ArchetypeFixture = {
  label: "Deteriorating User",
  description:
    "History rows at 67–78% range. Current snap degraded from observed " +
    "behavior shifts: domStddev 3→12, streakMonths 6→2, selfRatio 0.9→0.55, " +
    "buffer depleted (currentBalance 350→80). latePaymentCount=0. " +
    "No missed event in payments array — decline is from genuine snap changes only.",
  snap: {
    streakMonths: 2, payCount: 5, domStddev: 12, dominantDay: 20,
    advanceDays: 1, selfRatio: 0.55,
    loginDays30: 6, hourStd: 9, scratchPlays: 0, spinPlays: 0, missionsDone: 0,
    loadCount30: 2, loadDayStd: 10, paulaInteractions: 2, confirmed2fa: 0, declined2fa: 0,
    pushOpens: 1, curiosityIndex: 0.1,
    billerCount: 3, kycVerified: false, kycTier: "simplified",
    utilityRatio: 0.7, intentClicks: 1, hoursToFirst: 24, deviceScore: 55,
    currentBalance: 80, totalLoads: 1200, totalSpend: 1150, amountCV: 0.35,
    p2pSendCount: 0, p2pRecipientCount: 0, daysOld: 155,
    daysToFirstSpei: NaN, oxxoLoadCount: 12, speiLoadCount: 0, cardLoadCount: 0,
    lateRecoveryRatio: NaN, latePaymentCount: 0, paulaResponseLatencyMinutes: NaN,
    ...DERIVED_FEATURE_DEFAULTS,
  },
  edInputs: {
    firstBillPaymentAt: d(148), lastBillPaymentAt: d(14), billPaymentCount: 8,
    distinctBillers: 3, distinctCategories: 2,
    firstWalletTxAt: d(155), lastWalletTxAt: d(5), walletTxCount: 12,
    consecutivePaymentMonths: 2, activeMonths: 4, longestGapDays: 42,
  },
  scoreHistory: [
    { recordedAt: d(25), breakdown: { model_version: V5_MODEL_VERSION, payment_reliability: { score: 24, max: 36 }, behavioral_consistency: { score: 13, max: 22 }, cashflow_stability: { score: 14, max: 20 }, engagement_depth: { score: 11, max: 22 } } },
    { recordedAt: d(60), breakdown: { model_version: V5_MODEL_VERSION, payment_reliability: { score: 26, max: 36 }, behavioral_consistency: { score: 15, max: 22 }, cashflow_stability: { score: 15, max: 20 }, engagement_depth: { score: 12, max: 22 } } },
    { recordedAt: d(90), breakdown: { model_version: V5_MODEL_VERSION, payment_reliability: { score: 28, max: 36 }, behavioral_consistency: { score: 16, max: 22 }, cashflow_stability: { score: 16, max: 20 }, engagement_depth: { score: 13, max: 22 } } },
  ],
  payments: [
    { serviceId: "cfe",    serviceName: "CFE",    categoria: "utilities", monto: 290, createdAt: d(14)  },
    { serviceId: "cfe",    serviceName: "CFE",    categoria: "utilities", monto: 300, createdAt: d(48)  },
    { serviceId: "cfe",    serviceName: "CFE",    categoria: "utilities", monto: 310, createdAt: d(78)  },
    { serviceId: "cfe",    serviceName: "CFE",    categoria: "utilities", monto: 305, createdAt: d(112) },
    { serviceId: "telmex", serviceName: "Telmex", categoria: "telecom",   monto: 399, createdAt: d(20)  },
    { serviceId: "telmex", serviceName: "Telmex", categoria: "telecom",   monto: 399, createdAt: d(55)  },
    { serviceId: "telmex", serviceName: "Telmex", categoria: "telecom",   monto: 399, createdAt: d(88)  },
  ],
};

// ─── 5. MIXED_TRAJECTORY ─────────────────────────────────────────────────────
export const MIXED_TRAJECTORY: ArchetypeFixture = {
  label: "Mixed-Trajectory User",
  description:
    "PR stable (~67%). CFR deteriorating: buffer depleted (was 80%, now 1.5% ratio). " +
    "BC stable. Alignment: MIXED — dimensions disagree on direction.",
  snap: {
    streakMonths: 4, payCount: 8, domStddev: 4, dominantDay: 15,
    advanceDays: 3, selfRatio: 0.8,
    loginDays30: 12, hourStd: 5, scratchPlays: 0, spinPlays: 0, missionsDone: 0,
    loadCount30: 3, loadDayStd: 4, paulaInteractions: 5, confirmed2fa: 0, declined2fa: 0,
    pushOpens: 3, curiosityIndex: 0.25,
    billerCount: 3, kycVerified: false, kycTier: "simplified",
    utilityRatio: 0.7, intentClicks: 2, hoursToFirst: 24, deviceScore: 50,
    currentBalance: 30, totalLoads: 1500, totalSpend: 1450, amountCV: 0.18,
    p2pSendCount: 0, p2pRecipientCount: 0, daysOld: 145,
    daysToFirstSpei: NaN, oxxoLoadCount: 15, speiLoadCount: 0, cardLoadCount: 0,
    lateRecoveryRatio: NaN, latePaymentCount: 0, paulaResponseLatencyMinutes: NaN,
    ...DERIVED_FEATURE_DEFAULTS,
  },
  edInputs: {
    firstBillPaymentAt: d(138), lastBillPaymentAt: d(5), billPaymentCount: 8,
    distinctBillers: 3, distinctCategories: 2,
    firstWalletTxAt: d(145), lastWalletTxAt: d(2), walletTxCount: 15,
    consecutivePaymentMonths: 3, activeMonths: 4, longestGapDays: 38,
  },
  scoreHistory: [
    { recordedAt: d(25), breakdown: { model_version: V5_MODEL_VERSION, payment_reliability: { score: 24, max: 36 }, behavioral_consistency: { score: 13, max: 22 }, cashflow_stability: { score: 10, max: 20 }, engagement_depth: { score: 10, max: 22 } } },
    { recordedAt: d(60), breakdown: { model_version: V5_MODEL_VERSION, payment_reliability: { score: 23, max: 36 }, behavioral_consistency: { score: 13, max: 22 }, cashflow_stability: { score: 14, max: 20 }, engagement_depth: { score: 10, max: 22 } } },
    { recordedAt: d(90), breakdown: { model_version: V5_MODEL_VERSION, payment_reliability: { score: 22, max: 36 }, behavioral_consistency: { score: 12, max: 22 }, cashflow_stability: { score: 16, max: 20 }, engagement_depth: { score:  9, max: 22 } } },
  ],
  payments: [
    { serviceId: "cfe",    serviceName: "CFE",    categoria: "utilities", monto: 295, createdAt: d(5)  },
    { serviceId: "cfe",    serviceName: "CFE",    categoria: "utilities", monto: 300, createdAt: d(35) },
    { serviceId: "cfe",    serviceName: "CFE",    categoria: "utilities", monto: 305, createdAt: d(65) },
    { serviceId: "cfe",    serviceName: "CFE",    categoria: "utilities", monto: 310, createdAt: d(95) },
    { serviceId: "telmex", serviceName: "Telmex", categoria: "telecom",   monto: 399, createdAt: d(8)  },
    { serviceId: "telmex", serviceName: "Telmex", categoria: "telecom",   monto: 399, createdAt: d(38) },
    { serviceId: "telmex", serviceName: "Telmex", categoria: "telecom",   monto: 399, createdAt: d(68) },
  ],
};

// ─── 6. HIGH_ENGAGEMENT_WEAK_BEHAVIOR ────────────────────────────────────────
export const HIGH_ENGAGEMENT_WEAK_BEHAVIOR: ArchetypeFixture = {
  label: "High-Engagement / Weak-Behavior",
  description:
    "scratchPlays=45, paulaInteractions=40, pushOpens=25, curiosityIndex=0.85. " +
    "2 bill payments, deficit wallet (spent > loaded). " +
    "PR aggregate: INSUFFICIENT_DATA (payCount<3 for most sub-components) or low score. " +
    "CFR: COMPUTED with low score (totalSpend > totalLoads). " +
    "Engagement cannot manufacture strong behavioral shadow dimensions.",
  snap: {
    streakMonths: 0, payCount: 2, domStddev: 99, dominantDay: 1,
    advanceDays: 0, selfRatio: 0.0,
    loginDays30: 28, hourStd: 2, scratchPlays: 45, spinPlays: 30, missionsDone: 12,
    loadCount30: 6, loadDayStd: 3, paulaInteractions: 40, confirmed2fa: 3, declined2fa: 0,
    pushOpens: 25, curiosityIndex: 0.85,
    billerCount: 1, kycVerified: true, kycTier: "full",
    utilityRatio: 1.0, intentClicks: 0, hoursToFirst: 96, deviceScore: 85,
    currentBalance: 0, totalLoads: 200, totalSpend: 220, amountCV: 0.8,
    p2pSendCount: 0, p2pRecipientCount: 0, daysOld: 48,
    daysToFirstSpei: NaN, oxxoLoadCount: 5, speiLoadCount: 0, cardLoadCount: 0,
    lateRecoveryRatio: NaN, latePaymentCount: 0, paulaResponseLatencyMinutes: 5,
    ...DERIVED_FEATURE_DEFAULTS,
  },
  edInputs: {
    firstBillPaymentAt: d(30), lastBillPaymentAt: d(20), billPaymentCount: 2,
    distinctBillers: 1, distinctCategories: 1,
    firstWalletTxAt: d(48), lastWalletTxAt: d(2), walletTxCount: 7,
    consecutivePaymentMonths: 0, activeMonths: 1, longestGapDays: 0,
  },
  scoreHistory: [
    { recordedAt: d(25), breakdown: { model_version: V5_MODEL_VERSION, payment_reliability: { score: 1, max: 36 }, behavioral_consistency: { score: 8, max: 22 }, cashflow_stability: { score: 1, max: 20 }, engagement_depth: { score: 6, max: 22 } } },
  ],
  payments: [
    { serviceId: "cfe", serviceName: "CFE", categoria: "utilities", monto: 120, createdAt: d(20) },
    { serviceId: "cfe", serviceName: "CFE", categoria: "utilities", monto: 100, createdAt: d(30) },
  ],
};

// ─── 7. LOW_ENGAGEMENT_STRONG_BEHAVIOR ───────────────────────────────────────
export const LOW_ENGAGEMENT_STRONG_BEHAVIOR: ArchetypeFixture = {
  label: "Low-Engagement / Strong-Behavior",
  description:
    "loginDays30=2, zero games/Paula. 6-month streak, amountCV=0.05, strong buffer. " +
    "PR: COMPUTED ≥ 55 (streak=16pts from streakMonths=6 alone). " +
    "Low engagement must NOT suppress strong PR and CFR shadow dimensions.",
  snap: {
    streakMonths: 6, payCount: 12, domStddev: 2, dominantDay: 5,
    advanceDays: 5, selfRatio: 0.95,
    loginDays30: 2, hourStd: 12, scratchPlays: 0, spinPlays: 0, missionsDone: 0,
    loadCount30: 3, loadDayStd: 8, paulaInteractions: 0, confirmed2fa: 0, declined2fa: 0,
    pushOpens: 0, curiosityIndex: 0.0,
    billerCount: 5, kycVerified: false, kycTier: "simplified",
    utilityRatio: 0.75, intentClicks: 0, hoursToFirst: 12, deviceScore: 40,
    currentBalance: 450, totalLoads: 2500, totalSpend: 2000, amountCV: 0.05,
    p2pSendCount: 0, p2pRecipientCount: 0, daysOld: 138,
    daysToFirstSpei: NaN, oxxoLoadCount: 22, speiLoadCount: 0, cardLoadCount: 0,
    lateRecoveryRatio: NaN, latePaymentCount: 0, paulaResponseLatencyMinutes: NaN,
    ...DERIVED_FEATURE_DEFAULTS,
  },
  edInputs: {
    firstBillPaymentAt: d(132), lastBillPaymentAt: d(2), billPaymentCount: 12,
    distinctBillers: 5, distinctCategories: 4,
    firstWalletTxAt: d(138), lastWalletTxAt: d(1), walletTxCount: 22,
    consecutivePaymentMonths: 5, activeMonths: 6, longestGapDays: 30,
  },
  scoreHistory: [
    { recordedAt: d(25), breakdown: { model_version: V5_MODEL_VERSION, payment_reliability: { score: 34, max: 36 }, behavioral_consistency: { score:  4, max: 22 }, cashflow_stability: { score: 16, max: 20 }, engagement_depth: { score: 14, max: 22 } } },
    { recordedAt: d(60), breakdown: { model_version: V5_MODEL_VERSION, payment_reliability: { score: 33, max: 36 }, behavioral_consistency: { score:  4, max: 22 }, cashflow_stability: { score: 15, max: 20 }, engagement_depth: { score: 13, max: 22 } } },
    { recordedAt: d(90), breakdown: { model_version: V5_MODEL_VERSION, payment_reliability: { score: 32, max: 36 }, behavioral_consistency: { score:  3, max: 22 }, cashflow_stability: { score: 14, max: 20 }, engagement_depth: { score: 12, max: 22 } } },
  ],
  payments: [
    { serviceId: "cfe",    serviceName: "CFE",    categoria: "utilities", monto: 340, createdAt: d(2)   },
    { serviceId: "cfe",    serviceName: "CFE",    categoria: "utilities", monto: 330, createdAt: d(32)  },
    { serviceId: "cfe",    serviceName: "CFE",    categoria: "utilities", monto: 325, createdAt: d(62)  },
    { serviceId: "cfe",    serviceName: "CFE",    categoria: "utilities", monto: 320, createdAt: d(92)  },
    { serviceId: "cfe",    serviceName: "CFE",    categoria: "utilities", monto: 315, createdAt: d(122) },
    { serviceId: "cfe",    serviceName: "CFE",    categoria: "utilities", monto: 310, createdAt: d(132) },
    { serviceId: "telmex", serviceName: "Telmex", categoria: "telecom",   monto: 399, createdAt: d(5)   },
    { serviceId: "telmex", serviceName: "Telmex", categoria: "telecom",   monto: 399, createdAt: d(35)  },
    { serviceId: "telmex", serviceName: "Telmex", categoria: "telecom",   monto: 399, createdAt: d(65)  },
    { serviceId: "telmex", serviceName: "Telmex", categoria: "telecom",   monto: 399, createdAt: d(95)  },
    { serviceId: "telmex", serviceName: "Telmex", categoria: "telecom",   monto: 399, createdAt: d(125) },
    { serviceId: "izzi",   serviceName: "Izzi",   categoria: "internet",  monto: 399, createdAt: d(10)  },
    { serviceId: "izzi",   serviceName: "Izzi",   categoria: "internet",  monto: 399, createdAt: d(70)  },
    { serviceId: "izzi",   serviceName: "Izzi",   categoria: "internet",  monto: 399, createdAt: d(130) },
  ],
};

// ─── 8. WALLET_ONLY ──────────────────────────────────────────────────────────
export const WALLET_ONLY: ArchetypeFixture = {
  label: "Wallet-Only User",
  description:
    "20 wallet loads, P2P activity. Zero bill payments. " +
    "PR: INSUFFICIENT_DATA (payCount=0). Expected Obligations: empty (no billers). " +
    "CFR: COMPUTED from buffer (currentBalance > 0). " +
    "BS: COMPUTED (loginDays30=15, loadCount30=8). Aggregate: COMPUTED from CFR+BS.",
  snap: {
    streakMonths: 0, payCount: 0, domStddev: 99, dominantDay: 1,
    advanceDays: 0, selfRatio: 0.0,
    loginDays30: 15, hourStd: 6, scratchPlays: 3, spinPlays: 2, missionsDone: 0,
    loadCount30: 8, loadDayStd: 4, paulaInteractions: 5, confirmed2fa: 0, declined2fa: 0,
    pushOpens: 3, curiosityIndex: 0.2,
    billerCount: 0, kycVerified: false, kycTier: "simplified",
    utilityRatio: 0.0, intentClicks: 0, hoursToFirst: NaN, deviceScore: 50,
    currentBalance: 600, totalLoads: 3000, totalSpend: 0, amountCV: 0,
    p2pSendCount: 3, p2pRecipientCount: 2, daysOld: 90,
    daysToFirstSpei: NaN, oxxoLoadCount: 20, speiLoadCount: 0, cardLoadCount: 0,
    lateRecoveryRatio: NaN, latePaymentCount: 0, paulaResponseLatencyMinutes: NaN,
    ...DERIVED_FEATURE_DEFAULTS,
  },
  edInputs: {
    firstBillPaymentAt: null, lastBillPaymentAt: null, billPaymentCount: 0,
    distinctBillers: 0, distinctCategories: 0,
    firstWalletTxAt: d(90), lastWalletTxAt: d(1), walletTxCount: 20,
    consecutivePaymentMonths: 0, activeMonths: 0, longestGapDays: 0,
  },
  scoreHistory: [
    { recordedAt: d(25), breakdown: { model_version: V5_MODEL_VERSION, payment_reliability: { score: 0, max: 36 }, behavioral_consistency: { score: 12, max: 22 }, cashflow_stability: { score: 14, max: 20 }, engagement_depth: { score: 4, max: 22 } } },
    { recordedAt: d(60), breakdown: { model_version: V5_MODEL_VERSION, payment_reliability: { score: 0, max: 36 }, behavioral_consistency: { score: 11, max: 22 }, cashflow_stability: { score: 13, max: 20 }, engagement_depth: { score: 4, max: 22 } } },
    { recordedAt: d(90), breakdown: { model_version: V5_MODEL_VERSION, payment_reliability: { score: 0, max: 36 }, behavioral_consistency: { score: 10, max: 22 }, cashflow_stability: { score: 12, max: 20 }, engagement_depth: { score: 3, max: 22 } } },
  ],
  payments: [],
};

// ─── 9. GIG_INCOME ───────────────────────────────────────────────────────────
export const GIG_INCOME: ArchetypeFixture = {
  label: "Irregular / Gig-Income User",
  description:
    "loadDayStd=10 (irregular load timing), loadAmountCV=0.68 (highly variable load amounts). " +
    "But bill payments are consistent: amountCV=0.12, 4-month streak, domStddev=5. " +
    "CFR: COMPUTED (variable income ≠ weak behavior — payment behavior drives CFR, not load CV). " +
    "BS: COMPUTED (loadCount30=6 ≥ 3, but loadRhythm gets 0 due to loadDayStd=10 > 7).",
  snap: {
    streakMonths: 4, payCount: 8, domStddev: 5, dominantDay: 15,
    advanceDays: 2, selfRatio: 0.8,
    loginDays30: 10, hourStd: 7, scratchPlays: 0, spinPlays: 0, missionsDone: 0,
    loadCount30: 6, loadDayStd: 10, paulaInteractions: 3, confirmed2fa: 0, declined2fa: 0,
    pushOpens: 2, curiosityIndex: 0.15,
    billerCount: 4, kycVerified: false, kycTier: "simplified",
    utilityRatio: 0.7, intentClicks: 2, hoursToFirst: 24, deviceScore: 55,
    currentBalance: 280, totalLoads: 2400, totalSpend: 1850, amountCV: 0.12,
    p2pSendCount: 0, p2pRecipientCount: 0, daysOld: 122,
    daysToFirstSpei: NaN, oxxoLoadCount: 19, speiLoadCount: 0, cardLoadCount: 0,
    lateRecoveryRatio: NaN, latePaymentCount: 0, paulaResponseLatencyMinutes: NaN,
    ...DERIVED_FEATURE_DEFAULTS,
    loadAmountCV: 0.68,
    loadIntervalEntropy: 0.72,
  },
  edInputs: {
    firstBillPaymentAt: d(116), lastBillPaymentAt: d(4), billPaymentCount: 8,
    distinctBillers: 4, distinctCategories: 3,
    firstWalletTxAt: d(122), lastWalletTxAt: d(1), walletTxCount: 19,
    consecutivePaymentMonths: 4, activeMonths: 5, longestGapDays: 30,
  },
  scoreHistory: [
    { recordedAt: d(25), breakdown: { model_version: V5_MODEL_VERSION, payment_reliability: { score: 20, max: 36 }, behavioral_consistency: { score: 11, max: 22 }, cashflow_stability: { score: 13, max: 20 }, engagement_depth: { score: 9, max: 22 } } },
    { recordedAt: d(60), breakdown: { model_version: V5_MODEL_VERSION, payment_reliability: { score: 19, max: 36 }, behavioral_consistency: { score: 10, max: 22 }, cashflow_stability: { score: 12, max: 20 }, engagement_depth: { score: 8, max: 22 } } },
    { recordedAt: d(90), breakdown: { model_version: V5_MODEL_VERSION, payment_reliability: { score: 18, max: 36 }, behavioral_consistency: { score: 10, max: 22 }, cashflow_stability: { score: 11, max: 20 }, engagement_depth: { score: 8, max: 22 } } },
  ],
  payments: [
    { serviceId: "cfe",    serviceName: "CFE",    categoria: "utilities", monto: 280, createdAt: d(4)  },
    { serviceId: "cfe",    serviceName: "CFE",    categoria: "utilities", monto: 275, createdAt: d(34) },
    { serviceId: "cfe",    serviceName: "CFE",    categoria: "utilities", monto: 270, createdAt: d(65) },
    { serviceId: "cfe",    serviceName: "CFE",    categoria: "utilities", monto: 265, createdAt: d(95) },
    { serviceId: "telmex", serviceName: "Telmex", categoria: "telecom",   monto: 399, createdAt: d(8)  },
    { serviceId: "telmex", serviceName: "Telmex", categoria: "telecom",   monto: 399, createdAt: d(38) },
    { serviceId: "telmex", serviceName: "Telmex", categoria: "telecom",   monto: 399, createdAt: d(68) },
    { serviceId: "izzi",   serviceName: "Izzi",   categoria: "internet",  monto: 399, createdAt: d(12) },
    { serviceId: "izzi",   serviceName: "Izzi",   categoria: "internet",  monto: 399, createdAt: d(72) },
  ],
};

// ─── 10. SPARSE_STALE ────────────────────────────────────────────────────────
export const SPARSE_STALE: ArchetypeFixture = {
  label: "Sparse / Stale User",
  description:
    "Last payment 78d ago. CFE EO: STALE (EO_STALE_MULTIPLIER=2.5 × 30d cadence = 75d < 78d). " +
    "STALE is neutral — no negative behavioral signal. No missed event in payments. " +
    "Only 1 history row → medium/long windows: INSUFFICIENT_DATA. ED recency low (78d).",
  snap: {
    streakMonths: 2, payCount: 3, domStddev: 4, dominantDay: 20,
    advanceDays: 2, selfRatio: 0.7,
    loginDays30: 1, hourStd: 12, scratchPlays: 0, spinPlays: 0, missionsDone: 0,
    loadCount30: 1, loadDayStd: 12, paulaInteractions: 0, confirmed2fa: 0, declined2fa: 0,
    pushOpens: 0, curiosityIndex: 0.0,
    billerCount: 3, kycVerified: false, kycTier: "simplified",
    utilityRatio: 0.67, intentClicks: 0, hoursToFirst: 24, deviceScore: 45,
    currentBalance: 100, totalLoads: 600, totalSpend: 500, amountCV: 0.1,
    p2pSendCount: 0, p2pRecipientCount: 0, daysOld: 200,
    daysToFirstSpei: NaN, oxxoLoadCount: 8, speiLoadCount: 0, cardLoadCount: 0,
    lateRecoveryRatio: NaN, latePaymentCount: 0, paulaResponseLatencyMinutes: NaN,
    ...DERIVED_FEATURE_DEFAULTS,
  },
  edInputs: {
    firstBillPaymentAt: d(198), lastBillPaymentAt: d(78), billPaymentCount: 6,
    distinctBillers: 3, distinctCategories: 2,
    firstWalletTxAt: d(200), lastWalletTxAt: d(50), walletTxCount: 8,
    consecutivePaymentMonths: 2, activeMonths: 4, longestGapDays: 78,
  },
  scoreHistory: [
    { recordedAt: d(25), breakdown: { model_version: V5_MODEL_VERSION, payment_reliability: { score: 10, max: 36 }, behavioral_consistency: { score: 7, max: 22 }, cashflow_stability: { score: 8, max: 20 }, engagement_depth: { score: 6, max: 22 } } },
  ],
  payments: [
    { serviceId: "cfe", serviceName: "CFE", categoria: "utilities", monto: 295, createdAt: d(78)  },
    { serviceId: "cfe", serviceName: "CFE", categoria: "utilities", monto: 300, createdAt: d(108) },
    { serviceId: "cfe", serviceName: "CFE", categoria: "utilities", monto: 290, createdAt: d(138) },
    { serviceId: "cfe", serviceName: "CFE", categoria: "utilities", monto: 285, createdAt: d(168) },
    { serviceId: "telmex", serviceName: "Telmex", categoria: "telecom", monto: 399, createdAt: d(82)  },
    { serviceId: "telmex", serviceName: "Telmex", categoria: "telecom", monto: 399, createdAt: d(142) },
  ],
};

// ─── ALL_ARCHETYPES ordered list ─────────────────────────────────────────────
export const ALL_ARCHETYPES: ArchetypeFixture[] = [
  CASH_FIRST_CONSISTENT,
  NEW_USER,
  IMPROVING_USER,
  DETERIORATING_USER,
  MIXED_TRAJECTORY,
  HIGH_ENGAGEMENT_WEAK_BEHAVIOR,
  LOW_ENGAGEMENT_STRONG_BEHAVIOR,
  WALLET_ONLY,
  GIG_INCOME,
  SPARSE_STALE,
];

/**
 * FAIR-BANK control: same payment behavior as CASH_FIRST_CONSISTENT.
 * Funding channel changed to SPEI + kycVerified=true.
 * Shadow score must be byte-identical — no field in the shadow formula reads
 * daysToFirstSpei, speiLoadCount, oxxoLoadCount, cardLoadCount, kycVerified, or kycTier.
 */
export const BANKED_EQUIVALENT: ArchetypeFixture = {
  label: "Banked Equivalent (FAIR-BANK control)",
  description:
    "Identical payment behavior to CASH_FIRST_CONSISTENT. " +
    "SPEI loads + kycVerified=true. Shadow score must be identical to CASH_FIRST_CONSISTENT.",
  snap: {
    ...CASH_FIRST_CONSISTENT.snap,
    daysToFirstSpei: 3,
    oxxoLoadCount: 2,
    speiLoadCount: 16,
    cardLoadCount: 0,
    kycVerified: true,
    kycTier: "full",
  },
  edInputs:     CASH_FIRST_CONSISTENT.edInputs,
  scoreHistory: CASH_FIRST_CONSISTENT.scoreHistory,
  payments:     CASH_FIRST_CONSISTENT.payments,
};
