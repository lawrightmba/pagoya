import { describe, it, expect, afterAll } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { computePTI, PTI_DATA_SNAPSHOT_FIELDS, type PTIDataSnapshot } from "../pti.js";
import { DERIVED_FEATURE_DEFAULTS } from "../ptiDerivedFeatures.js";
import {
  sanitizeLicenseePayload,
  computeLicenseeScore,
  resolveModelVersion,
  registerModelVersion,
  setModelVersionSignoffStatus,
  DEFAULT_LICENSEE_MODEL_VERSION,
} from "../licenseeApi.js";
import { SANDBOX_FIXTURES, getSandboxFixture } from "../licenseeSandboxFixtures.js";

function baseSnapshot(overrides: Partial<PTIDataSnapshot> = {}): PTIDataSnapshot {
  return {
    streakMonths: 0, payCount: 0, domStddev: 15, dominantDay: 0, advanceDays: 0, selfRatio: 0,
    loginDays30: 0, hourStd: 12, scratchPlays: 0, spinPlays: 0, missionsDone: 0,
    loadCount30: 0, loadDayStd: 30, paulaInteractions: 0, confirmed2fa: 0, declined2fa: 0,
    pushOpens: 0, curiosityIndex: 0, billerCount: 0, kycVerified: false, kycTier: "simplified",
    utilityRatio: 0, intentClicks: 0, hoursToFirst: NaN, deviceScore: 0,
    currentBalance: 0, totalLoads: 0, totalSpend: 0, amountCV: 1, p2pSendCount: 0, p2pRecipientCount: 0,
    daysOld: 0, daysToFirstSpei: NaN, oxxoLoadCount: 0, speiLoadCount: 0, cardLoadCount: 0,
    lateRecoveryRatio: NaN, latePaymentCount: 0, paulaResponseLatencyMinutes: NaN,
    ...DERIVED_FEATURE_DEFAULTS,
    ...overrides,
  };
}

// ── 1. Isolation guard — never references the fair-lending adjustment layer ──
describe("licenseeApi — fair-lending isolation guard (Sprint 3)", () => {
  // These guards check for actual IMPORTS / CALLS / references to the
  // adjustment layer's symbols — not prose. The service and route files'
  // own doc comments legitimately name "fairLendingAdjustment.ts" to
  // document the isolation boundary itself, so a blanket word-match would
  // incorrectly fail on that explanatory text. What must never appear is an
  // import statement, a function call, or the raw DB table name.
  const FORBIDDEN_USAGE_PATTERNS = [
    /from\s+["'].*fairLendingAdjustment(\.js)?["']/i,
    /import\(["'].*fairLendingAdjustment(\.js)?["']\)/i,
    /computeFairLendingAdjustment\s*\(/,
    /computeFinalPTI\s*\(/,
    /\bfair_lending_signoff\b/i,
    // Prompt 3 quarantine-tier field names (derivedSignals.ts only — never
    // exposed through the licensee API). Regexes match both camelCase and
    // snake_case spellings.
    /quincena.?alignment.?index/i,
    /load.?channel.?formality.?mix/i,
    /session.?time.?of.?day.?concentration/i,
    /late.?night.?session.?fraction/i,
  ];

  it("service module never imports or calls into the fair-lending adjustment layer", () => {
    const thisFileUrl = import.meta.url;
    const servicePath = fileURLToPath(new URL("../licenseeApi.ts", thisFileUrl));
    const source = readFileSync(servicePath, "utf-8");
    console.log("[licensee isolation guard] scanned licenseeApi.ts service for real usage (not prose)");
    for (const pattern of FORBIDDEN_USAGE_PATTERNS) {
      expect(source).not.toMatch(pattern);
    }
  });

  it("route module never imports or calls into the fair-lending adjustment layer", () => {
    const thisFileUrl = import.meta.url;
    const routePath = fileURLToPath(new URL("../../routes/licenseeApi.ts", thisFileUrl));
    const source = readFileSync(routePath, "utf-8");
    console.log("[licensee isolation guard] scanned routes/licenseeApi.ts for real usage (not prose)");
    for (const pattern of FORBIDDEN_USAGE_PATTERNS) {
      expect(source).not.toMatch(pattern);
    }
  });

  it("never accepts colonia or declared_income_bucket fields into the scored snapshot", () => {
    const raw = { ...baseSnapshot({ payCount: 5, daysOld: 60 }), colonia: "Roma Norte", declaredIncomeBucket: "bucket_3" };
    const { snapshot, forbiddenFieldsPresent } = sanitizeLicenseePayload(raw as unknown as Record<string, unknown>);
    expect(forbiddenFieldsPresent).toEqual(expect.arrayContaining(["colonia", "declaredIncomeBucket"]));
    expect(snapshot).not.toHaveProperty("colonia");
    expect(snapshot).not.toHaveProperty("declaredIncomeBucket");
  });

  it("score response shape never carries a fair-lending-adjustment field", () => {
    const { snapshot, portableMode } = sanitizeLicenseePayload(baseSnapshot({ payCount: 5, daysOld: 60 }) as unknown as Record<string, unknown>);
    const result = computeLicenseeScore({ snapshot, portableMode, modelVersion: "v4.1-behavioral", sandbox: false });
    const keys = Object.keys(result);
    for (const forbidden of ["fair_lending_adjustment", "adjusted_score", "fairLendingScore", "signoff"]) {
      expect(keys).not.toContain(forbidden);
    }
  });
});

// ── 2. computeLicenseeScore uses ONLY computePTI's base breakdown ───────────
describe("computeLicenseeScore — uses computePTI as the sole source of truth", () => {
  it("matches computePTI() exactly for a full (non-portable) snapshot", () => {
    const snapshot = baseSnapshot({
      payCount: 10, daysOld: 90, daysToFirstSpei: 5, oxxoLoadCount: 1, speiLoadCount: 5, cardLoadCount: 2,
    });
    const direct = computePTI(snapshot);
    const { snapshot: sanitized, portableMode } = sanitizeLicenseePayload(snapshot as unknown as Record<string, unknown>);
    expect(portableMode).toBe(false);

    const licenseeResult = computeLicenseeScore({ snapshot: sanitized, portableMode, modelVersion: "v4.1-behavioral", sandbox: false });
    expect(licenseeResult.base_score).toBe(direct.breakdown.total);
    expect(licenseeResult.dimension_breakdown).toEqual(direct.breakdown);
    expect(licenseeResult.confidence).toEqual(direct.confidence);
  });
});

// ── 3. Portable-mode auto-detection ──────────────────────────────────────────
describe("sanitizeLicenseePayload — portable-mode auto-detection", () => {
  it("detects portable mode when all wallet-rail fields are absent from the raw payload", () => {
    const raw: Record<string, unknown> = { payCount: 5, daysOld: 60 };
    const { portableMode } = sanitizeLicenseePayload(raw);
    expect(portableMode).toBe(true);
  });

  it("does not trigger portable mode when any wallet-rail field is present", () => {
    const raw: Record<string, unknown> = { payCount: 5, daysOld: 60, speiLoadCount: 3 };
    const { portableMode } = sanitizeLicenseePayload(raw);
    expect(portableMode).toBe(false);
  });

  it("treats explicit null wallet-rail fields the same as absent (still portable)", () => {
    const raw: Record<string, unknown> = { payCount: 5, daysOld: 60, daysToFirstSpei: null, oxxoLoadCount: null, speiLoadCount: null, cardLoadCount: null };
    const { portableMode } = sanitizeLicenseePayload(raw);
    expect(portableMode).toBe(true);
  });
});

// ── 4. Portable-mode CF reallocation ─────────────────────────────────────────
describe("computeLicenseeScore — portable-mode cash-flow reallocation", () => {
  it("rescales cashflow_stability toward its 25pt max instead of capping at 20 for portable licensees", () => {
    const snapshot = baseSnapshot({
      currentBalance: 500, totalLoads: 1000, totalSpend: 800, amountCV: 0.05,
      p2pSendCount: 5, p2pRecipientCount: 3, daysOld: 90,
      // wallet-rail fields left at defaults (NaN/0) simulating full absence
    });
    const direct = computePTI(snapshot);
    const rawCfScore = direct.breakdown.cashflow_stability.score; // capped effectively at 20 since bancarization/funding score 0

    const { snapshot: sanitized, portableMode } = sanitizeLicenseePayload({
      currentBalance: 500, totalLoads: 1000, totalSpend: 800, amountCV: 0.05,
      p2pSendCount: 5, p2pRecipientCount: 3, daysOld: 90,
    });
    expect(portableMode).toBe(true);

    const result = computeLicenseeScore({ snapshot: sanitized, portableMode, modelVersion: "v4.1-behavioral", sandbox: false });
    expect(result.dimension_breakdown.cashflow_stability.score).toBeGreaterThan(rawCfScore);
    expect(result.dimension_breakdown.cashflow_stability.score).toBeLessThanOrEqual(25);
    expect(result.dimension_breakdown.cashflow_stability.max).toBe(25);
  });

  it("never exceeds a total of 100 after reallocation, even at max engagement", () => {
    // Deliberately a PARTIAL payload (as a real licensee caller would send,
    // omitting wallet-rail fields entirely) rather than a full PTIDataSnapshot
    // — the latter always has those keys explicitly set, which would never
    // trigger portable-mode detection.
    const rawPayload: Record<string, unknown> = {
      streakMonths: 20, payCount: 50, domStddev: 0, advanceDays: 10, selfRatio: 1,
      loginDays30: 30, hourStd: 0, scratchPlays: 100, spinPlays: 100, missionsDone: 50,
      loadCount30: 50, loadDayStd: 0, paulaInteractions: 100, confirmed2fa: 100, declined2fa: 0,
      pushOpens: 100, curiosityIndex: 1, billerCount: 100, kycVerified: true, kycTier: "full",
      utilityRatio: 1, intentClicks: 10, hoursToFirst: 1, deviceScore: 100, currentBalance: 999999,
      totalLoads: 999999, totalSpend: 1, amountCV: 0, p2pSendCount: 100, p2pRecipientCount: 100,
      daysOld: 9999,
    };
    const { snapshot: sanitized, portableMode } = sanitizeLicenseePayload(rawPayload);
    expect(portableMode).toBe(true);
    const result = computeLicenseeScore({ snapshot: sanitized, portableMode, modelVersion: "v4.1-behavioral", sandbox: false });
    expect(result.base_score).toBeLessThanOrEqual(100);
  });

  it("leaves the breakdown untouched (identical to computePTI) when NOT in portable mode", () => {
    const snapshot = baseSnapshot({
      currentBalance: 500, totalLoads: 1000, totalSpend: 800, amountCV: 0.05,
      p2pSendCount: 5, p2pRecipientCount: 3, daysOld: 90,
      daysToFirstSpei: 10, oxxoLoadCount: 2, speiLoadCount: 3, cardLoadCount: 1,
    });
    const direct = computePTI(snapshot);
    const { snapshot: sanitized, portableMode } = sanitizeLicenseePayload(snapshot as unknown as Record<string, unknown>);
    expect(portableMode).toBe(false);
    const result = computeLicenseeScore({ snapshot: sanitized, portableMode, modelVersion: "v4.1-behavioral", sandbox: false });
    expect(result.dimension_breakdown.cashflow_stability.score).toBe(direct.breakdown.cashflow_stability.score);
    expect(result.base_score).toBe(direct.breakdown.total);
  });
});

// ── 5. Sandbox fixtures ───────────────────────────────────────────────────
describe("licenseeSandboxFixtures — synthetic-only, never real user data", () => {
  it("exposes at least 4 representative tiers", () => {
    expect(SANDBOX_FIXTURES.length).toBeGreaterThanOrEqual(4);
  });

  it("falls back to the first fixture for an unknown or missing key", () => {
    const fallback = getSandboxFixture("does_not_exist");
    expect(fallback.key).toBe(SANDBOX_FIXTURES[0].key);
    expect(getSandboxFixture(undefined).key).toBe(SANDBOX_FIXTURES[0].key);
  });

  it("every fixture snapshot scores without throwing and produces a bounded score", () => {
    for (const fixture of SANDBOX_FIXTURES) {
      const { breakdown } = computePTI(fixture.snapshot);
      expect(breakdown.total).toBeGreaterThanOrEqual(0);
      expect(breakdown.total).toBeLessThanOrEqual(100);
    }
  });
});

describe("PTIDataSnapshot schema completeness (licenseeApi.test.ts)", () => {
  it("baseSnapshot() matches canonical PTIDataSnapshot fields", () => {
    const canonical = [...PTI_DATA_SNAPSHOT_FIELDS].sort();
    const actual = Object.keys(baseSnapshot()).sort();
    const missing = canonical.filter((k) => !actual.includes(k));
    const extra = actual.filter((k) => !canonical.includes(k));
    console.log(`[schema-completeness] licenseeApi.test.ts baseSnapshot(): ${actual.length}/${canonical.length} fields, missing=[${missing.join(",")}], extra=[${extra.join(",")}]`);
    expect(missing).toEqual([]);
    expect(extra).toEqual([]);
  });
});

// ── 6. Model version signoff gate (Prompt 4 closeout) ───────────────────────
describe("resolveModelVersion — signoff gate enforcement", () => {
  const TEST_VERSION = "__test_signoff_gate_version__";

  afterAll(async () => {
    await db.execute(sql`DELETE FROM licensee_model_versions WHERE version = ${TEST_VERSION}`);
  });

  it("blocks serving a version registered with signoff_status='pending'", async () => {
    await registerModelVersion({ version: TEST_VERSION, signoffStatus: "pending" });
    const resolution = await resolveModelVersion(TEST_VERSION);
    expect(resolution.ok).toBe(false);
    expect(resolution.reason).toBe("version_pending_signoff");
  });

  it("allows serving the SAME version once flipped to signoff_status='approved'", async () => {
    await setModelVersionSignoffStatus(TEST_VERSION, "approved");
    const resolution = await resolveModelVersion(TEST_VERSION);
    expect(resolution.ok).toBe(true);
    expect(resolution.record?.signoff_status).toBe("approved");
  });

  it("real registry: v4.1-behavioral, v4.2-behavioral, and v4.3-signal-expansion are all approved and servable", async () => {
    for (const version of ["v4.1-behavioral", "v4.2-behavioral", "v4.3-signal-expansion"]) {
      const resolution = await resolveModelVersion(version);
      expect(resolution.ok).toBe(true);
      expect(resolution.record?.signoff_status).toBe("approved");
    }
  });

  it("DEFAULT_LICENSEE_MODEL_VERSION points at an approved, servable version", async () => {
    expect(DEFAULT_LICENSEE_MODEL_VERSION).toBe("v4.3-signal-expansion");
    const resolution = await resolveModelVersion(DEFAULT_LICENSEE_MODEL_VERSION);
    expect(resolution.ok).toBe(true);
  });
});
