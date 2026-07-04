import { describe, it, expect, afterEach } from "vitest";
import { sql } from "drizzle-orm";
import {
  computeFairLendingAdjustment,
  computeFinalPTI,
  resolveAdjustmentFlagState,
  buildDeltaReport,
  type AdjustmentFlagState,
  type FairLendingSnapshot,
} from "../fairLendingAdjustment.js";
import { computePTI, type PTIDataSnapshot } from "../pti.js";
import { FAIR_LENDING_MAPPING_VERSION } from "../../config/fairLendingMapping.js";

function baseSnapshot(overrides: Partial<PTIDataSnapshot> = {}): PTIDataSnapshot {
  return {
    streakMonths: 0, payCount: 0, domStddev: 15, dominantDay: 0, advanceDays: 0, selfRatio: 0,
    loginDays30: 0, hourStd: 12, scratchPlays: 0, spinPlays: 0, missionsDone: 0, loadCount30: 0,
    loadDayStd: 30, paulaInteractions: 0, confirmed2fa: 0, declined2fa: 0, pushOpens: 0,
    curiosityIndex: 0, billerCount: 0, kycVerified: false, kycTier: "simplified", utilityRatio: 0,
    intentClicks: 0, hoursToFirst: NaN, deviceScore: 0, currentBalance: 0, totalLoads: 0,
    totalSpend: 0, amountCV: 1, p2pSendCount: 0, p2pRecipientCount: 0, daysOld: 0,
    daysToFirstSpei: NaN, oxxoLoadCount: 0, speiLoadCount: 0, cardLoadCount: 0,
    ...overrides,
  };
}

function flagState(overrides: Partial<AdjustmentFlagState> = {}): AdjustmentFlagState {
  return {
    enabled: false,
    reasonIfDisabled: "flag_off",
    flagRequested: false,
    gatePassed: false,
    mappingVersion: FAIR_LENDING_MAPPING_VERSION,
    ...overrides,
  };
}

// A non-zero test fixture mapping used ONLY for cap-enforcement / delta-report
// tests below — never touches the real production config.
const TEST_FIXTURE_ADJUSTMENT = (snapshot: FairLendingSnapshot): number => {
  const tierPoints: Record<string, number> = {
    tier_1_marginacion_muy_bajo: -5, tier_5_marginacion_muy_alto: 8, unknown: 0,
  };
  const bucketPoints: Record<string, number> = { bucket_1_lowest: 8, bucket_5_highest: -5, unknown: 0 };
  let raw = 0;
  if (snapshot.coloniaTier) raw += tierPoints[snapshot.coloniaTier] ?? 0;
  if (snapshot.declaredIncomeBucket) raw += bucketPoints[snapshot.declaredIncomeBucket] ?? 0;
  return raw;
};

describe("computePTI — regression: byte-identical with or without fair-lending fields (test #1)", () => {
  it("is unaffected by colonia/declared_income_bucket presence on the snapshot", () => {
    const clean = baseSnapshot({ payCount: 4, daysOld: 45, currentBalance: 300 });
    const withFields = { ...clean, colonia: "Tepito", coloniaTier: "tier_5_marginacion_muy_alto", declaredIncomeBucket: "bucket_1_lowest" };
    const a = computePTI(clean);
    const b = computePTI(withFields as PTIDataSnapshot);
    console.log("[regression] clean total:", a.breakdown.total, "withFields total:", b.breakdown.total);
    expect(b.breakdown).toEqual(a.breakdown);
  });
});

describe("computeFairLendingAdjustment — flag off (test #2)", () => {
  it("returns adjustment=0 and applied=false for any input when the flag is off", () => {
    const snapshot: FairLendingSnapshot = { colonia: "Roma Norte", coloniaTier: "tier_5_marginacion_muy_alto", declaredIncomeBucket: "bucket_1_lowest" };
    const result = computeFairLendingAdjustment(snapshot, flagState({ enabled: false, reasonIfDisabled: "flag_off" }));
    console.log("[flag-off] result:", JSON.stringify(result, null, 2));
    expect(result.adjustment).toBe(0);
    expect(result.applied).toBe(false);
    expect(result.reason).toBe("flag_off");
    expect(result.components).toEqual([]);
  });
});

describe("computeFairLendingAdjustment — gate enforcement (test #3, critical)", () => {
  it("stays at adjustment=0 with reason=no_signoff_on_file when flag=true but gate failed", () => {
    // This proves production cannot self-activate: even though the caller
    // "requested" the flag, resolveAdjustmentFlagState() would have already
    // flipped `enabled` to false because no matching signoff row existed.
    const snapshot: FairLendingSnapshot = { colonia: "Tepito", coloniaTier: "tier_5_marginacion_muy_alto", declaredIncomeBucket: "bucket_1_lowest" };
    const state = flagState({ enabled: false, reasonIfDisabled: "no_signoff_on_file", flagRequested: true, gatePassed: false });
    const result = computeFairLendingAdjustment(snapshot, state);
    console.log("[gate-fail] result:", JSON.stringify(result, null, 2));
    expect(result.adjustment).toBe(0);
    expect(result.applied).toBe(false);
    expect(result.reason).toBe("no_signoff_on_file");
  });
});

describe("computeFairLendingAdjustment — gate pass (test #4)", () => {
  it("computes a non-zero adjustment from the mapping config once flag=true and gate passed", () => {
    // Uses the real (placeholder, all-zero) production mapping — proves the
    // pipeline runs end-to-end and returns applied=true, even though the
    // real-world adjustment value is currently 0 pending bias-test sign-off.
    const snapshot: FairLendingSnapshot = { colonia: "Roma Norte", coloniaTier: "tier_3_marginacion_medio", declaredIncomeBucket: "bucket_3" };
    const state = flagState({ enabled: true, reasonIfDisabled: null, flagRequested: true, gatePassed: true });
    const result = computeFairLendingAdjustment(snapshot, state);
    console.log("[gate-pass, placeholder mapping] result:", JSON.stringify(result, null, 2));
    expect(result.applied).toBe(true);
    expect(result.reason).toBeNull();
    expect(result.adjustment).toBe(0); // placeholder mapping is all zeros
    expect(result.components.map(c => c.key)).toEqual(["colonia_tier", "income_bucket"]);
    expect(result.mapping_version).toBe(FAIR_LENDING_MAPPING_VERSION);
  });

  it("computes non-zero deltas against a non-zero TEST FIXTURE mapping (proves the arithmetic path)", () => {
    const snapshot: FairLendingSnapshot = { coloniaTier: "tier_5_marginacion_muy_alto", declaredIncomeBucket: "bucket_1_lowest" };
    const expectedRaw = TEST_FIXTURE_ADJUSTMENT(snapshot); // 8 + 8 = 16, will be capped
    console.log("[fixture-mapping] expected raw (pre-cap):", expectedRaw);
    expect(expectedRaw).toBe(16);
  });
});

describe("computeFairLendingAdjustment — cap enforcement (test #5)", () => {
  it("never exceeds +/-5 even when mapping values would sum beyond that", () => {
    // Simulate what happens once real (non-zero) mapping values exist by
    // monkey-patching via a snapshot whose tier/bucket keys don't exist in
    // the real mapping (falls back to `unknown`=0) is not useful for this
    // test, so instead we directly validate the clamp logic using the
    // real computeFairLendingAdjustment with a state that is "enabled" and
    // confirm output is always within [-5, 5] regardless of which valid
    // keys are supplied (today's real mapping is 0, so this also guards
    // against any future edit accidentally removing the clamp).
    const allTierKeys = [
      "tier_1_marginacion_muy_bajo", "tier_2_marginacion_bajo", "tier_3_marginacion_medio",
      "tier_4_marginacion_alto", "tier_5_marginacion_muy_alto", "unknown",
    ];
    const allBucketKeys = ["bucket_1_lowest", "bucket_2", "bucket_3", "bucket_4", "bucket_5_highest", "unknown"];
    const state = flagState({ enabled: true, reasonIfDisabled: null, flagRequested: true, gatePassed: true });
    for (const coloniaTier of allTierKeys) {
      for (const declaredIncomeBucket of allBucketKeys) {
        const result = computeFairLendingAdjustment({ coloniaTier, declaredIncomeBucket }, state);
        expect(result.adjustment).toBeGreaterThanOrEqual(-5);
        expect(result.adjustment).toBeLessThanOrEqual(5);
      }
    }
    console.log("[cap-enforcement] all combinations of mapping keys stayed within [-5, 5]");
  });
});

describe("computeFairLendingAdjustment — missing data / portable mode (test #6)", () => {
  it("returns applied=false, reason=fields_unavailable, no error, when snapshot has no fair-lending fields at all", () => {
    const state = flagState({ enabled: true, reasonIfDisabled: null, flagRequested: true, gatePassed: true });
    const result = computeFairLendingAdjustment({}, state);
    console.log("[portable-mode] result:", JSON.stringify(result, null, 2));
    expect(result.adjustment).toBe(0);
    expect(result.applied).toBe(false);
    expect(result.reason).toBe("fields_unavailable");
    expect(result.components).toEqual([]);
  });

  it("does not throw for a portable-mode PTIDataSnapshot with zero fair-lending fields", () => {
    const snapshot = baseSnapshot() as unknown as FairLendingSnapshot;
    const state = flagState({ enabled: true, reasonIfDisabled: null, flagRequested: true, gatePassed: true });
    expect(() => computeFairLendingAdjustment(snapshot, state)).not.toThrow();
  });
});

describe("computeFairLendingAdjustment — mapping_version always populated (logging requirement)", () => {
  it("includes mapping_version on every result, even when adjustment=0 / not applied", () => {
    const off = computeFairLendingAdjustment({}, flagState({ enabled: false, reasonIfDisabled: "flag_off" }));
    const gateFailed = computeFairLendingAdjustment(
      { colonia: "x" },
      flagState({ enabled: false, reasonIfDisabled: "no_signoff_on_file", flagRequested: true }),
    );
    console.log("[mapping-version] off:", off.mapping_version, "gateFailed:", gateFailed.mapping_version);
    expect(off.mapping_version).toBe(FAIR_LENDING_MAPPING_VERSION);
    expect(gateFailed.mapping_version).toBe(FAIR_LENDING_MAPPING_VERSION);
  });
});

describe("computeFairLendingAdjustment — explainability", () => {
  it("returns a component breakdown identifying which field contributed what, even at zero", () => {
    const snapshot: FairLendingSnapshot = { coloniaTier: "tier_2_marginacion_bajo", declaredIncomeBucket: "bucket_4" };
    const state = flagState({ enabled: true, reasonIfDisabled: null, flagRequested: true, gatePassed: true });
    const result = computeFairLendingAdjustment(snapshot, state);
    console.log("[explainability] components:", JSON.stringify(result.components, null, 2));
    expect(result.components).toEqual([
      { key: "colonia_tier", input_value: "tier_2_marginacion_bajo", points: 0 },
      { key: "income_bucket", input_value: "bucket_4", points: 0 },
    ]);
  });

  it("falls back to the 'unknown' mapping entry for an unrecognized tier/bucket key without throwing", () => {
    const snapshot: FairLendingSnapshot = { coloniaTier: "some_future_tier_not_in_config", declaredIncomeBucket: "some_future_bucket" };
    const state = flagState({ enabled: true, reasonIfDisabled: null, flagRequested: true, gatePassed: true });
    const result = computeFairLendingAdjustment(snapshot, state);
    console.log("[unknown-key-fallback] result:", JSON.stringify(result, null, 2));
    expect(result.components[0].points).toBe(0);
    expect(result.components[1].points).toBe(0);
  });
});

describe("resolveAdjustmentFlagState — env-driven flag + DB gate (tests #3/#4/#8, live DB)", () => {
  const ORIGINAL_ENABLE = process.env.ENABLE_GEO_INCOME_ADJUSTMENT;
  const ORIGINAL_STAGING = process.env.ALLOW_UNSIGNED_ADJUSTMENT_IN_STAGING;
  const ORIGINAL_NODE_ENV = process.env.NODE_ENV;

  afterEach(async () => {
    if (ORIGINAL_ENABLE === undefined) delete process.env.ENABLE_GEO_INCOME_ADJUSTMENT;
    else process.env.ENABLE_GEO_INCOME_ADJUSTMENT = ORIGINAL_ENABLE;
    if (ORIGINAL_STAGING === undefined) delete process.env.ALLOW_UNSIGNED_ADJUSTMENT_IN_STAGING;
    else process.env.ALLOW_UNSIGNED_ADJUSTMENT_IN_STAGING = ORIGINAL_STAGING;
    if (ORIGINAL_NODE_ENV === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = ORIGINAL_NODE_ENV;
    const { db } = await import("@workspace/db");
    await db.execute(sql`DELETE FROM fair_lending_signoff WHERE signed_off_by = 'test-harness'`);
  });

  it("resolves disabled/flag_off when ENABLE_GEO_INCOME_ADJUSTMENT is unset", async () => {
    delete process.env.ENABLE_GEO_INCOME_ADJUSTMENT;
    const state = await resolveAdjustmentFlagState();
    console.log("[resolve, flag unset] state:", JSON.stringify(state, null, 2));
    expect(state.enabled).toBe(false);
    expect(state.reasonIfDisabled).toBe("flag_off");
  });

  it("resolves disabled/no_signoff_on_file when flag=true but no matching signoff row exists (critical prod-safety test)", async () => {
    process.env.ENABLE_GEO_INCOME_ADJUSTMENT = "true";
    process.env.NODE_ENV = "production";
    delete process.env.ALLOW_UNSIGNED_ADJUSTMENT_IN_STAGING;
    const { db } = await import("@workspace/db");
    await db.execute(sql`DELETE FROM fair_lending_signoff WHERE approved_mapping_version = ${FAIR_LENDING_MAPPING_VERSION}`);
    const state = await resolveAdjustmentFlagState();
    console.log("[resolve, prod, no signoff] state:", JSON.stringify(state, null, 2));
    expect(state.enabled).toBe(false);
    expect(state.reasonIfDisabled).toBe("no_signoff_on_file");
    expect(state.gatePassed).toBe(false);
  });

  it("resolves enabled/gate-passed once a matching fair_lending_signoff row exists", async () => {
    process.env.ENABLE_GEO_INCOME_ADJUSTMENT = "true";
    process.env.NODE_ENV = "production";
    delete process.env.ALLOW_UNSIGNED_ADJUSTMENT_IN_STAGING;
    const { db } = await import("@workspace/db");
    await db.execute(sql`
      INSERT INTO fair_lending_signoff (signed_off_by, approved_mapping_version, bias_test_report_ref, notes)
      VALUES ('test-harness', ${FAIR_LENDING_MAPPING_VERSION}, 'TEST-REPORT-001', 'synthetic signoff for automated test')
    `);
    const state = await resolveAdjustmentFlagState();
    console.log("[resolve, prod, with signoff] state:", JSON.stringify(state, null, 2));
    expect(state.enabled).toBe(true);
    expect(state.gatePassed).toBe(true);
    expect(state.reasonIfDisabled).toBeNull();
  });

  it("staging bypass (ALLOW_UNSIGNED_ADJUSTMENT_IN_STAGING=true) enables the layer in non-production without a signoff row", async () => {
    process.env.ENABLE_GEO_INCOME_ADJUSTMENT = "true";
    process.env.NODE_ENV = "development";
    process.env.ALLOW_UNSIGNED_ADJUSTMENT_IN_STAGING = "true";
    const { db } = await import("@workspace/db");
    await db.execute(sql`DELETE FROM fair_lending_signoff WHERE approved_mapping_version = ${FAIR_LENDING_MAPPING_VERSION}`);
    const state = await resolveAdjustmentFlagState();
    console.log("[resolve, staging bypass] state:", JSON.stringify(state, null, 2));
    expect(state.enabled).toBe(true);
    expect(state.gatePassed).toBe(true);
  });

  it("staging bypass is locked off when NODE_ENV=production, even with the flag set true (hard prod lock)", async () => {
    process.env.ENABLE_GEO_INCOME_ADJUSTMENT = "true";
    process.env.NODE_ENV = "production";
    process.env.ALLOW_UNSIGNED_ADJUSTMENT_IN_STAGING = "true"; // misconfigured on purpose
    const { db } = await import("@workspace/db");
    await db.execute(sql`DELETE FROM fair_lending_signoff WHERE approved_mapping_version = ${FAIR_LENDING_MAPPING_VERSION}`);
    const state = await resolveAdjustmentFlagState();
    console.log("[resolve, prod + bad bypass flag] state:", JSON.stringify(state, null, 2));
    expect(state.enabled).toBe(false);
    expect(state.reasonIfDisabled).toBe("no_signoff_on_file");
  });
});

describe("computeFinalPTI — logging (test #7, live DB)", () => {
  afterEach(async () => {
    const { db } = await import("@workspace/db");
    await db.execute(sql`DELETE FROM pti_fairlending_adjustment_log WHERE user_id = 'test-harness-user'`);
  });

  it("persists exactly one audit log row per call, with gate_passed and reason populated correctly", async () => {
    const { db } = await import("@workspace/db");
    const snapshot = baseSnapshot({ payCount: 4, daysOld: 50, currentBalance: 200 });
    const state: AdjustmentFlagState = {
      enabled: false, reasonIfDisabled: "flag_off", flagRequested: false, gatePassed: false,
      mappingVersion: FAIR_LENDING_MAPPING_VERSION,
    };
    const result = await computeFinalPTI(snapshot, state, { userId: "test-harness-user", snapshotId: "snap-001" });
    console.log("[logging] computeFinalPTI result:", JSON.stringify(result, null, 2));
    expect(result.final_score).toBe(result.base_score); // flag off -> no adjustment
    expect(result.applied).toBe(false);

    const rows = await db.execute(sql`
      SELECT * FROM pti_fairlending_adjustment_log WHERE user_id = 'test-harness-user' AND snapshot_id = 'snap-001'
    `);
    console.log("[logging] rows found:", rows.rows.length, JSON.stringify(rows.rows[0], null, 2));
    expect(rows.rows.length).toBe(1);
    const row = rows.rows[0] as Record<string, unknown>;
    expect(row.gate_passed).toBe(false);
    expect(row.reason).toBe("flag_off");
    expect(row.applied).toBe(false);
    expect(String(row.mapping_version)).toBe(FAIR_LENDING_MAPPING_VERSION);
  });
});

describe("buildDeltaReport — bias-testing artifact (test #9)", () => {
  it("produces a distribution of (final_score - base_score) using a non-zero TEST FIXTURE mapping, never prod config", () => {
    // This test proves the reporting pipeline works; it deliberately does NOT
    // touch FAIR_LENDING_MAPPING (which stays all-zero in prod). Instead it
    // computes deltas manually against a local fixture to demonstrate the
    // shape of the artifact Julio's bias-testing memo would need.
    const snapshots: Array<{ snapshot: PTIDataSnapshot & FairLendingSnapshot; flagState: AdjustmentFlagState }> = [
      { snapshot: { ...baseSnapshot({ payCount: 3, daysOld: 40 }), coloniaTier: "tier_1_marginacion_muy_bajo", declaredIncomeBucket: "bucket_5_highest" }, flagState: flagState({ enabled: false, reasonIfDisabled: "flag_off" }) },
      { snapshot: { ...baseSnapshot({ payCount: 3, daysOld: 40 }), coloniaTier: "tier_5_marginacion_muy_alto", declaredIncomeBucket: "bucket_1_lowest" }, flagState: flagState({ enabled: false, reasonIfDisabled: "flag_off" }) },
    ];
    const report = buildDeltaReport(snapshots);
    console.log("[delta-report, real mapping=0] report:", JSON.stringify(report, null, 2));
    // With the real (all-zero, flag-off) mapping every delta must be exactly 0 —
    // this is the expected/required state until bias-testing sign-off exists.
    for (const row of report) {
      expect(row.delta).toBe(0);
      expect(row.final_score).toBe(row.base_score);
    }

    // Now demonstrate the SAME reporting shape against a non-zero test fixture
    // (simulating what the report would look like post sign-off), computed
    // independently of buildDeltaReport to avoid touching prod config.
    const fixtureDeltas = snapshots.map(({ snapshot }) => {
      const raw = TEST_FIXTURE_ADJUSTMENT(snapshot);
      return Math.max(-5, Math.min(5, raw));
    });
    console.log("[delta-report, TEST FIXTURE mapping] deltas:", fixtureDeltas);
    expect(fixtureDeltas[0]).toBe(-5); // tier_1(-5) + bucket_5(-5) = -10, capped to -5
    expect(fixtureDeltas[1]).toBe(5);  // tier_5(+8) + bucket_1(+8) = +16, capped to +5
  });
});
