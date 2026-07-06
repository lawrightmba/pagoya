/**
 * Sprint 3 — Standalone Licensable PTI API: sandbox synthetic fixtures.
 *
 * These are the ONLY data a `sandbox_mode=true` licensee key can ever
 * score against — real user payloads are rejected outright for sandbox
 * keys (see licenseeApi.ts). Every fixture is purely synthetic, spans
 * zero-data through high-confidence, and never touches real user data.
 */

import type { PTIDataSnapshot } from "./pti.js";
import { DERIVED_FEATURE_DEFAULTS } from "./ptiDerivedFeatures.js";

export interface SandboxFixture {
  key: string;
  label: string;
  description: string;
  snapshot: PTIDataSnapshot;
}

const zeroDataSnapshot: PTIDataSnapshot = {
  streakMonths: 0, payCount: 0, domStddev: 0, dominantDay: 0, advanceDays: 0, selfRatio: 0,
  lateRecoveryRatio: NaN, latePaymentCount: 0, paulaResponseLatencyMinutes: NaN,
  loginDays30: 0, hourStd: 0, scratchPlays: 0, spinPlays: 0, missionsDone: 0,
  loadCount30: 0, loadDayStd: 0, paulaInteractions: 0, confirmed2fa: 0, declined2fa: 0,
  pushOpens: 0, curiosityIndex: 0,
  billerCount: 0, kycVerified: false, kycTier: "simplified", utilityRatio: 0, intentClicks: 0,
  hoursToFirst: NaN, deviceScore: 0,
  currentBalance: 0, totalLoads: 0, totalSpend: 0, amountCV: 0, p2pSendCount: 0, p2pRecipientCount: 0,
  daysOld: 1, daysToFirstSpei: NaN, oxxoLoadCount: 0, speiLoadCount: 0, cardLoadCount: 0,
  ...DERIVED_FEATURE_DEFAULTS,
};

export const SANDBOX_FIXTURES: SandboxFixture[] = [
  {
    key: "zero_data",
    label: "Brand-new user, zero activity",
    description: "Just signed up, no payments, no logins, no wallet loads yet.",
    snapshot: zeroDataSnapshot,
  },
  {
    key: "early_engagement",
    label: "Early engagement, low confidence",
    description: "A few days old, one payment made, still building a track record.",
    snapshot: {
      ...zeroDataSnapshot,
      streakMonths: 1, payCount: 1, domStddev: 10, dominantDay: 15, advanceDays: 1, selfRatio: 1,
      loginDays30: 3, hourStd: 6, scratchPlays: 2, missionsDone: 1,
      loadCount30: 1, paulaInteractions: 2,
      billerCount: 1, utilityRatio: 1, hoursToFirst: 20, deviceScore: 40,
      currentBalance: 40, totalLoads: 100, totalSpend: 60, amountCV: 0.2,
      daysOld: 6, oxxoLoadCount: 1,
    },
  },
  {
    key: "portable_no_wallet_rail",
    label: "Portable mode — no wallet-rail data",
    description:
      "Represents a licensee's own user with no PagoYa wallet history at all " +
      "(no SPEI/OXXO/card load fields supplied) — exercises automatic portable-mode routing.",
    snapshot: (() => {
      // Intentionally OMIT the wallet-rail keys entirely at runtime (not just
      // zero/NaN them out) so that the API's field-ABSENCE portable-mode
      // detection actually triggers for this fixture, exactly as it would
      // for a real licensee payload that never included these keys. The type
      // cast below is safe: computePTI() treats a missing key the same as an
      // explicit NaN/0 for these specific fields (see pti.ts destructuring).
      const full: Record<string, unknown> = {
        ...zeroDataSnapshot,
        streakMonths: 4, payCount: 8, domStddev: 3, dominantDay: 5, advanceDays: 5, selfRatio: 0.8,
        loginDays30: 15, hourStd: 3, scratchPlays: 10, spinPlays: 5, missionsDone: 4,
        loadCount30: 6, loadDayStd: 4, paulaInteractions: 8, confirmed2fa: 3,
        pushOpens: 4, curiosityIndex: 0.1,
        billerCount: 3, kycVerified: true, kycTier: "simplified", utilityRatio: 0.6, intentClicks: 1,
        hoursToFirst: 10, deviceScore: 65,
        currentBalance: 250, totalLoads: 900, totalSpend: 700, amountCV: 0.15,
        p2pSendCount: 2, p2pRecipientCount: 2, daysOld: 120,
      };
      delete full.daysToFirstSpei;
      delete full.oxxoLoadCount;
      delete full.speiLoadCount;
      delete full.cardLoadCount;
      return full as unknown as PTIDataSnapshot;
    })(),
  },
  {
    key: "high_confidence",
    label: "High-confidence, mature user",
    description: "Long tenure, consistent payments, deep engagement across all dimensions.",
    snapshot: {
      streakMonths: 10, payCount: 24, domStddev: 1, dominantDay: 1, advanceDays: 8, selfRatio: 0.95,
      lateRecoveryRatio: 1, latePaymentCount: 2, paulaResponseLatencyMinutes: 8,
      loginDays30: 26, hourStd: 1.5, scratchPlays: 30, spinPlays: 20, missionsDone: 12,
      loadCount30: 12, loadDayStd: 2, paulaInteractions: 20, confirmed2fa: 10, declined2fa: 0,
      pushOpens: 10, curiosityIndex: 0.25,
      billerCount: 6, kycVerified: true, kycTier: "full", utilityRatio: 0.7, intentClicks: 3,
      hoursToFirst: 4, deviceScore: 95,
      currentBalance: 800, totalLoads: 6000, totalSpend: 5200, amountCV: 0.08,
      p2pSendCount: 8, p2pRecipientCount: 5, daysOld: 300,
      daysToFirstSpei: 5, oxxoLoadCount: 2, speiLoadCount: 20, cardLoadCount: 4,
      ...DERIVED_FEATURE_DEFAULTS,
    },
  },
];

export function getSandboxFixture(key?: string): SandboxFixture {
  const found = key ? SANDBOX_FIXTURES.find(f => f.key === key) : undefined;
  return found ?? SANDBOX_FIXTURES[0];
}
