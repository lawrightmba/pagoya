/**
 * Fair-Lending Adjustment Clamp Stress Test (DEV/LOCAL ONLY)
 * ============================================================================
 * Follow-up to ptiStressTest.ts. That run exercised the REAL
 * computeFairLendingAdjustment() but with the REAL config/fairLendingMapping.ts
 * table, which ships all-zero pending bias-testing sign-off — so "no cap
 * breaches" was trivially true (0 is always inside [-5,5]), not a real test
 * of the clamp.
 *
 * This script re-runs the SAME synthetic population through the SAME real,
 * UNMODIFIED computeFairLendingAdjustment() function, but with a TEST-ONLY,
 * non-zero, deliberately extreme mapping substituted for the point values —
 * so the ±5 / ±2 clamp is actually forced to do work.
 *
 * IMPORTANT — no production logic was invented here. The real point-value
 * mapping is, and remains, an all-zero placeholder (see
 * config/fairLendingMapping.ts) pending real bias testing. There is no
 * hidden/undocumented real mapping logic anywhere in the codebase to
 * discover — the ONLY real logic is the (fully implemented, unmodified)
 * summation + clamp inside computeFairLendingAdjustment() and the gate in
 * resolveAdjustmentFlagState()/checkSignoffStatus(). This script mutates the
 * imported FAIR_LENDING_MAPPING object's point values IN MEMORY, for this
 * process only — it never edits the config file on disk, never writes to
 * any DB, and never touches the gate-resolution functions.
 *
 * Run:  pnpm --filter @workspace/api-server exec tsx src/scripts/fairLendingClampStressTest.ts
 */

import { computePTI, type PTIDataSnapshot } from "../services/pti.js";
import {
  computeFairLendingAdjustment,
  type AdjustmentFlagState,
  type FairLendingSnapshot,
} from "../services/fairLendingAdjustment.js";
import { FAIR_LENDING_MAPPING, FAIR_LENDING_MAPPING_VERSION } from "../config/fairLendingMapping.js";
import { generatePopulation, type SyntheticUser } from "../services/syntheticPopulation.js";

// ─── Small stat helpers (mirrors ptiStressTest.ts) ─────────────────────────

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
  console.log("\n" + "═".repeat(78));
  console.log("  " + title);
  console.log("═".repeat(78));
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
  } as PTIDataSnapshot;
}

const findings: string[] = [];
function flagBug(msg: string) {
  findings.push(msg);
}

// ─── 1. Snapshot the REAL mapping so we can restore/compare, then install a  ──
//        TEST-ONLY, deliberately extreme mapping IN MEMORY (never on disk).   ─

const REAL_MAPPING_SNAPSHOT = {
  colonia_tier_adjustment: { ...FAIR_LENDING_MAPPING.colonia_tier_adjustment },
  income_bucket_adjustment: { ...FAIR_LENDING_MAPPING.income_bucket_adjustment },
};
const REAL_MAPPING_ALL_ZERO =
  Object.values(REAL_MAPPING_SNAPSHOT.colonia_tier_adjustment).every((v) => v === 0) &&
  Object.values(REAL_MAPPING_SNAPSHOT.income_bucket_adjustment).every((v) => v === 0);

// Deliberately extreme: positive for the most-marginalized/lowest-income
// groups (the direction that would narrow the disparate-impact gap found by
// ptiStressTest.ts), negative for the least-marginalized/highest-income —
// and individually large enough that COMBINED (colonia + income) totals
// blow past both the ±5 default cap and the ±2 conditional cap, so the
// clamp is actually forced to activate on a large share of the population.
const TEST_ONLY_MAPPING = {
  colonia_tier_adjustment: {
    tier_1_marginacion_muy_bajo: -8,
    tier_2_marginacion_bajo: -3,
    tier_3_marginacion_medio: 0,
    tier_4_marginacion_alto: 4,
    tier_5_marginacion_muy_alto: 9,
    unknown: 0,
  } as Record<string, number>,
  income_bucket_adjustment: {
    bucket_1_lowest: 9,
    bucket_2: 4,
    bucket_3: 0,
    bucket_4: -3,
    bucket_5_highest: -8,
    unknown: 0,
  } as Record<string, number>,
};

function installTestOnlyMapping() {
  Object.assign(FAIR_LENDING_MAPPING.colonia_tier_adjustment, TEST_ONLY_MAPPING.colonia_tier_adjustment);
  Object.assign(FAIR_LENDING_MAPPING.income_bucket_adjustment, TEST_ONLY_MAPPING.income_bucket_adjustment);
}
function restoreRealMapping() {
  Object.assign(FAIR_LENDING_MAPPING.colonia_tier_adjustment, REAL_MAPPING_SNAPSHOT.colonia_tier_adjustment);
  Object.assign(FAIR_LENDING_MAPPING.income_bucket_adjustment, REAL_MAPPING_SNAPSHOT.income_bucket_adjustment);
}

// ─── main ───────────────────────────────────────────────────────────────────

async function main() {
  const seed = process.env.PTI_STRESS_SEED ? Number(process.env.PTI_STRESS_SEED) : 0xc0ffee;
  const size = process.env.PTI_STRESS_SIZE ? Number(process.env.PTI_STRESS_SIZE) : 8000;

  console.log("█".repeat(78));
  console.log("  FAIR-LENDING ADJUSTMENT CLAMP STRESS TEST");
  console.log(`  seed=${seed}  size=${size}  (DEV-ONLY, no DB, no prod contact)`);
  console.log("█".repeat(78));

  header("0. MAPPING PROVENANCE — what is real vs. test-only");
  console.log(`  Real config/fairLendingMapping.ts is loaded as-is: all zero = ${REAL_MAPPING_ALL_ZERO}`);
  console.log("  There is NO real, non-placeholder adjustment-mapping logic anywhere in the");
  console.log("  codebase yet — it is explicitly pending bias-testing sign-off. Nothing was");
  console.log("  invented as production logic here. Instead this script installs a TEST-ONLY");
  console.log("  mapping by mutating the imported FAIR_LENDING_MAPPING object's point values");
  console.log("  IN MEMORY for this process only (config/fairLendingMapping.ts on disk is");
  console.log("  never touched, no DB write occurs). The clamp math and gate functions being");
  console.log("  exercised are the REAL, unmodified computeFairLendingAdjustment() /");
  console.log("  resolveAdjustmentFlagState() implementations.");
  console.log("\n  TEST-ONLY colonia_tier_adjustment:", JSON.stringify(TEST_ONLY_MAPPING.colonia_tier_adjustment));
  console.log("  TEST-ONLY income_bucket_adjustment:", JSON.stringify(TEST_ONLY_MAPPING.income_bucket_adjustment));
  console.log(
    "  Max theoretical |combined raw total| before clamp = 9+9 = 18 (bucket_1_lowest + tier_5) — ",
  );
  console.log("  far beyond both the ±5 default cap and the ±2 conditional cap, by design.");

  console.log("\n  Generating population (same generator/seed as ptiStressTest.ts)...");
  const population = generatePopulation({ seed, size });
  const scored = population.map((u) => ({ user: u, base: computePTI(toSnapshot(u)).breakdown.total }));
  console.log(`  n=${scored.length} scored via the real, unmodified computePTI().`);

  installTestOnlyMapping();
  try {
    // ── 1. Gate proof: adjustment layer cannot activate without a passing
    //      disparate-impact report, REGARDLESS of mapping content. ─────────
    header("1. PRODUCTION ACTIVATION GATE — confirmed untouched");
    console.log("  resolveAdjustmentFlagState()/checkSignoffStatus() were NOT modified by this");
    console.log("  test. To prove the gate still fully blocks activation independent of the");
    console.log("  mapping's point values, we call the real computeFairLendingAdjustment()");
    console.log("  with flagState.enabled=false (the realistic default in dev/local — no");
    console.log("  ENABLE_GEO_INCOME_ADJUSTMENT flag, no fair_lending_signoff row) against the");
    console.log("  most extreme synthetic snapshot in the population, using the EXTREME");
    console.log("  test-only mapping:");
    const disabledFlag: AdjustmentFlagState = {
      enabled: false,
      reasonIfDisabled: "no_signoff_on_file",
      flagRequested: false,
      gatePassed: false,
      mappingVersion: FAIR_LENDING_MAPPING_VERSION,
      adjustmentCapOverride: null,
    };
    const extremeSnap: FairLendingSnapshot = { coloniaTier: "tier_5_marginacion_muy_alto", declaredIncomeBucket: "bucket_1_lowest" };
    const gatedResult = computeFairLendingAdjustment(extremeSnap, disabledFlag);
    console.log(
      `  → adjustment=${gatedResult.adjustment}  applied=${gatedResult.applied}  reason=${gatedResult.reason}`,
    );
    if (gatedResult.adjustment !== 0 || gatedResult.applied) {
      flagBug(
        `CRITICAL: gate bypass — computeFairLendingAdjustment() returned a non-zero/applied adjustment ` +
          `(adjustment=${gatedResult.adjustment}, applied=${gatedResult.applied}) while flagState.enabled=false. ` +
          `The layer's very first check ("if (!flagState.enabled) return {adjustment:0,...}") did not hold.`,
      );
    } else {
      console.log("  → Gate HOLDS: flagState.enabled=false unconditionally zeroes the adjustment,");
      console.log("    even against the most extreme mapping values and the most extreme profile.");
      console.log("    resolveAdjustmentFlagState() is the only path that can flip enabled=true, and");
      console.log("    it requires an on-file fair_lending_signoff row whose approved_mapping_version");
      console.log("    matches the CURRENTLY-LOADED mapping hash (FAIR_LENDING_MAPPING_VERSION), which");
      console.log("    is computed once at module load from the on-disk config — mutating point values");
      console.log("    in memory (as this test does) does NOT retroactively produce a matching signoff.");
    }

    // ── 2. Clamp stress test across the full population, two cap regimes. ──
    header("2. CLAMP STRESS TEST — full population, two cap regimes");
    const capScenarios: { label: string; flag: AdjustmentFlagState; cap: number }[] = [
      {
        label: "pass (default ±5)",
        cap: 5,
        flag: { enabled: true, reasonIfDisabled: null, flagRequested: true, gatePassed: true, mappingVersion: FAIR_LENDING_MAPPING_VERSION, adjustmentCapOverride: null },
      },
      {
        label: "conditional (±2 override)",
        cap: 2,
        flag: { enabled: true, reasonIfDisabled: null, flagRequested: true, gatePassed: true, mappingVersion: FAIR_LENDING_MAPPING_VERSION, adjustmentCapOverride: 2 },
      },
    ];

    const adjByScenario = new Map<string, number[]>();
    for (const scenario of capScenarios) {
      const adjustments: number[] = [];
      let breaches = 0;
      let atCapHigh = 0;
      let atCapLow = 0;
      for (const s of scored) {
        const snap: FairLendingSnapshot = { coloniaTier: s.user.coloniaTier, declaredIncomeBucket: s.user.declaredIncomeBucket };
        const r = computeFairLendingAdjustment(snap, scenario.flag);
        adjustments.push(r.adjustment);
        if (Math.abs(r.adjustment) > scenario.cap) breaches++;
        if (r.adjustment === scenario.cap) atCapHigh++;
        if (r.adjustment === -scenario.cap) atCapLow++;
      }
      adjByScenario.set(scenario.label, adjustments);
      console.log(`\n  ${scenario.label}:`);
      console.log(
        `    min=${fmt(Math.min(...adjustments), 2)}  max=${fmt(Math.max(...adjustments), 2)}  mean=${fmt(mean(adjustments), 2)}`,
      );
      console.log(`    exactly at +${scenario.cap}: n=${atCapHigh}   exactly at -${scenario.cap}: n=${atCapLow}`);
      console.log(`    breaches (|adjustment| > ${scenario.cap}): ${breaches}`);
      if (breaches > 0) {
        flagBug(
          `CRITICAL: ${breaches} profiles exceeded the ${scenario.label} cap of ±${scenario.cap} under the ` +
            `extreme test-only mapping — the clamp in computeFairLendingAdjustment() did not hold.`,
        );
      } else {
        console.log(`    → Clamp HOLDS for all ${adjustments.length} profiles under ${scenario.label}.`);
      }
    }

    // ── 3. Exact-boundary probes — off-by-one / rounding check. ────────────
    header("3. BOUNDARY BEHAVIOR — exact edge values");
    console.log("  Hand-crafted rawTotal values landing exactly ON, and one unit past, each");
    console.log("  cap boundary (integer and fractional), run through the real clamp:");
    const boundaryMapping = {
      colonia_tier_adjustment: { ...FAIR_LENDING_MAPPING.colonia_tier_adjustment },
      income_bucket_adjustment: { ...FAIR_LENDING_MAPPING.income_bucket_adjustment },
    };
    function withRawTotal(total: number, flag: AdjustmentFlagState): number {
      // Route the entire raw total through a single component (income bucket)
      // so rawTotal === the exact value under test, no cross-component drift.
      const saved = FAIR_LENDING_MAPPING.income_bucket_adjustment.bucket_1_lowest;
      const savedTier = FAIR_LENDING_MAPPING.colonia_tier_adjustment.tier_3_marginacion_medio;
      try {
        FAIR_LENDING_MAPPING.income_bucket_adjustment.bucket_1_lowest = total;
        FAIR_LENDING_MAPPING.colonia_tier_adjustment.tier_3_marginacion_medio = 0;
        const r = computeFairLendingAdjustment(
          { coloniaTier: "tier_3_marginacion_medio", declaredIncomeBucket: "bucket_1_lowest" },
          flag,
        );
        return r.adjustment;
      } finally {
        FAIR_LENDING_MAPPING.income_bucket_adjustment.bucket_1_lowest = saved;
        FAIR_LENDING_MAPPING.colonia_tier_adjustment.tier_3_marginacion_medio = savedTier;
      }
    }
    const passFlag = capScenarios[0].flag;
    const condFlag = capScenarios[1].flag;
    const boundaryChecks: { desc: string; raw: number; flag: AdjustmentFlagState; expect: number }[] = [
      { desc: "rawTotal=5.0 (default cap, exact)", raw: 5, flag: passFlag, expect: 5 },
      { desc: "rawTotal=5.0000001 (default cap, +epsilon)", raw: 5.0000001, flag: passFlag, expect: 5 },
      { desc: "rawTotal=4.9999999 (default cap, -epsilon, should NOT clamp)", raw: 4.9999999, flag: passFlag, expect: 4.9999999 },
      { desc: "rawTotal=-5.0 (default cap, exact, negative)", raw: -5, flag: passFlag, expect: -5 },
      { desc: "rawTotal=100 (grossly over default cap)", raw: 100, flag: passFlag, expect: 5 },
      { desc: "rawTotal=2.0 (conditional cap, exact)", raw: 2, flag: condFlag, expect: 2 },
      { desc: "rawTotal=2.0000001 (conditional cap, +epsilon)", raw: 2.0000001, flag: condFlag, expect: 2 },
      { desc: "rawTotal=-2.0 (conditional cap, exact, negative)", raw: -2, flag: condFlag, expect: -2 },
      { desc: "rawTotal=0.1+0.1+0.1 (classic float sum, well under cap)", raw: 0.1 + 0.1 + 0.1, flag: passFlag, expect: 0.1 + 0.1 + 0.1 },
    ];
    let boundaryIssues = 0;
    for (const c of boundaryChecks) {
      const got = withRawTotal(c.raw, c.flag);
      const clean = got === c.expect;
      console.log(`    ${c.desc.padEnd(58)} → ${fmt(got, 8)}  ${clean ? "OK" : "MISMATCH expected " + fmt(c.expect, 8)}`);
      if (!clean) boundaryIssues++;
    }
    Object.assign(FAIR_LENDING_MAPPING.colonia_tier_adjustment, boundaryMapping.colonia_tier_adjustment);
    Object.assign(FAIR_LENDING_MAPPING.income_bucket_adjustment, boundaryMapping.income_bucket_adjustment);
    if (boundaryIssues === 0) {
      console.log("\n  → No off-by-one or rounding issue at the boundary. Math.max(-cap, Math.min(cap,");
      console.log("    rawTotal)) clamps cleanly to exactly ±cap; values strictly inside the cap");
      console.log("    pass through unchanged (including float-sum inputs).");
    } else {
      flagBug(`${boundaryIssues} boundary probes did not match expected clamp output — see section 3 above.`);
    }

    // ── 4. Does the (test-only) adjustment narrow the disparate-impact gap? ─
    header("4. DOES THE ADJUSTMENT NARROW THE DISPARATE-IMPACT GAP FOUND EARLIER?");
    console.log("  Baseline from ptiStressTest.ts (base PTI only, no adjustment):");
    console.log("    four-fifths ratio ≈ 0.045   |   Cohen's d (bucket_5_highest vs bucket_1_lowest) ≈ 0.90");
    console.log("\n  Recomputing on THIS run's population under the default ±5 cap, applying");
    console.log("  final_score = clamp(base + adjustment, 0, 100), using the EXTREME test-only");
    console.log("  mapping (the most favorable case for the adjustment layer — a real, bias-");
    console.log("  tested mapping would very likely be far more conservative than this):");

    const byBucketBase = new Map<string, number[]>();
    const byBucketFinal = new Map<string, number[]>();
    for (const s of scored) {
      const snap: FairLendingSnapshot = { coloniaTier: s.user.coloniaTier, declaredIncomeBucket: s.user.declaredIncomeBucket };
      const r = computeFairLendingAdjustment(snap, passFlag);
      const final = Math.max(0, Math.min(100, s.base + r.adjustment));
      const k = s.user.declaredIncomeBucket;
      if (!byBucketBase.has(k)) byBucketBase.set(k, []);
      if (!byBucketFinal.has(k)) byBucketFinal.set(k, []);
      byBucketBase.get(k)!.push(s.base);
      byBucketFinal.get(k)!.push(final);
    }
    const approvalThreshold = 60;
    function summarize(map: Map<string, number[]>) {
      const order = ["bucket_1_lowest", "bucket_2", "bucket_3", "bucket_4", "bucket_5_highest"];
      const rows = order.map((k) => {
        const xs = map.get(k) ?? [];
        return { k, n: xs.length, mean: mean(xs), rate: xs.length ? xs.filter((x) => x >= approvalThreshold).length / xs.length : 0 };
      });
      const maxRate = Math.max(...rows.map((r) => r.rate));
      const minRate = Math.min(...rows.map((r) => r.rate));
      const fourFifths = maxRate > 0 ? minRate / maxRate : 1;
      const d = cohensD(map.get("bucket_5_highest") ?? [], map.get("bucket_1_lowest") ?? []);
      return { rows, fourFifths, d };
    }
    const baseSummary = summarize(byBucketBase);
    const finalSummary = summarize(byBucketFinal);
    console.log("\n  Base (no adjustment) — this run:");
    for (const r of baseSummary.rows) console.log(`    ${r.k.padEnd(16)} n=${String(r.n).padStart(5)}  mean=${fmt(r.mean, 1).padStart(5)}  ≥60 rate=${fmt(r.rate * 100, 1)}%`);
    console.log(`    four-fifths=${fmt(baseSummary.fourFifths, 3)}  d=${fmt(baseSummary.d, 2)}`);
    console.log("\n  Final (base + extreme test-only adjustment, ±5 cap):");
    for (const r of finalSummary.rows) console.log(`    ${r.k.padEnd(16)} n=${String(r.n).padStart(5)}  mean=${fmt(r.mean, 1).padStart(5)}  ≥60 rate=${fmt(r.rate * 100, 1)}%`);
    console.log(`    four-fifths=${fmt(finalSummary.fourFifths, 3)}  d=${fmt(finalSummary.d, 2)}`);

    const gapBase = baseSummary.rows[4].mean - baseSummary.rows[0].mean;
    const gapFinal = finalSummary.rows[4].mean - finalSummary.rows[0].mean;
    const pctClosed = gapBase !== 0 ? (1 - gapFinal / gapBase) * 100 : 0;
    console.log(`\n  Mean-score gap (highest−lowest bucket): ${fmt(gapBase, 1)} → ${fmt(gapFinal, 1)} pts (${fmt(pctClosed, 1)}% closed)`);
    console.log(`  Cohen's d: ${fmt(baseSummary.d, 2)} → ${fmt(finalSummary.d, 2)}`);
    console.log(`  four-fifths ratio: ${fmt(baseSummary.fourFifths, 3)} → ${fmt(finalSummary.fourFifths, 3)} (pass ≥ 0.80)`);

    flagBug(
      `RESULT (task 3): even the maximally-extreme, cap-saturating test-only mapping only closes ` +
        `${fmt(pctClosed, 1)}% of the mean-score gap (${fmt(gapBase, 1)}→${fmt(gapFinal, 1)} pts) and moves the ` +
        `four-fifths ratio from ${fmt(baseSummary.fourFifths, 3)} to ${fmt(finalSummary.fourFifths, 3)} ` +
        `(pass bar is 0.80). The ±5/±2 STRUCTURAL cap means the adjustment layer, even fully activated with ` +
        `maximally aggressive point values, is a partial mitigant at best against a base-score gap this large — ` +
        `it cannot by itself bring this population into four-fifths compliance. A real bias-tested mapping ` +
        `would need to be paired with base-model changes (reducing the SES-correlated proxies identified in ` +
        `ptiStressTest.ts section 6), not rely on the adjustment layer alone.`,
    );

    header("SUMMARY OF FINDINGS");
    findings.forEach((f, i) => console.log(`  [${i + 1}] ${f}\n`));
    console.log("█".repeat(78));
    console.log("  END OF REPORT");
    console.log("█".repeat(78));
  } finally {
    restoreRealMapping();
    const restoredCorrectly =
      JSON.stringify(FAIR_LENDING_MAPPING.colonia_tier_adjustment) === JSON.stringify(REAL_MAPPING_SNAPSHOT.colonia_tier_adjustment) &&
      JSON.stringify(FAIR_LENDING_MAPPING.income_bucket_adjustment) === JSON.stringify(REAL_MAPPING_SNAPSHOT.income_bucket_adjustment);
    console.log(`\n  [cleanup] real mapping (as loaded from disk, all-zero=${REAL_MAPPING_ALL_ZERO}) restored in-memory: ${restoredCorrectly} (process is exiting anyway; config file was never touched)`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
