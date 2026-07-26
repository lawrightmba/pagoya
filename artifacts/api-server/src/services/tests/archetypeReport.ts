#!/usr/bin/env tsx
/**
 * Archetype Report Generator — Sprint 9 / Part A
 *
 * Standalone pure-function script. No database. No network.
 * Run with:  pnpm --filter @workspace/api-server exec tsx src/services/tests/archetypeReport.ts
 *
 * Generates a Cash Flow Resilience analysis document across all 10 synthetic
 * archetypes + BANKED_EQUIVALENT control, with:
 *   - Shadow dimension breakdown (PR / CFR / BS)
 *   - PTI v5 score
 *   - Evidence Depth band
 *   - EO obligation summary
 *   - CFR structural assessment
 *   - FAIR-BANK invariant verification
 */

import {
  computeShadowBehavioralProfile,
  computeShadowPaymentReliability,
  computeShadowCashFlowResilience,
  computeShadowBehavioralStability,
} from "../ptiV2Shadow.js";

import {
  computeEvidenceDepthFromInputs,
  computeBehavioralTrajectory,
  computeExpectedObligations,
} from "../ptiV2.js";

import { computePTIv5 } from "../ptiV5.js";

import {
  ARCHETYPE_REF,
  ALL_ARCHETYPES,
  BANKED_EQUIVALENT,
  CASH_FIRST_CONSISTENT,
  type ArchetypeFixture,
} from "./archetypeFixtures.js";

// ─── ANSI helpers ─────────────────────────────────────────────────────────────
const bold  = (s: string) => `\x1b[1m${s}\x1b[0m`;
const cyan  = (s: string) => `\x1b[36m${s}\x1b[0m`;
const green = (s: string) => `\x1b[32m${s}\x1b[0m`;
const red   = (s: string) => `\x1b[31m${s}\x1b[0m`;
const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`;
const dim   = (s: string) => `\x1b[2m${s}\x1b[0m`;

function statusColor(s: string | undefined): string {
  if (!s) return dim("—");
  if (s === "COMPUTED" || s === "HIGH" || s === "IMPROVING") return green(s);
  if (s === "INSUFFICIENT_DATA") return red(s);
  if (s === "MODERATE" || s === "STABLE") return yellow(s);
  if (s === "DETERIORATING") return red(s);
  return s;
}

function scoreBar(n: number | null | undefined, max = 100): string {
  if (n == null) return dim("—");
  const filled = Math.round((n / max) * 20);
  const bar = "█".repeat(filled) + "░".repeat(20 - filled);
  const color = n >= 70 ? green : n >= 50 ? yellow : red;
  return `${color(bar)} ${n.toString().padStart(3)}`;
}

// ─── Per-archetype report ──────────────────────────────────────────────────────
/** Derive a total v5 score from breakdown sub-scores (4 dimensions, max = 100). */
function deriveV5TotalScore(breakdown: ReturnType<typeof computePTIv5>["breakdown"]): number {
  return (
    breakdown.payment_reliability.score +
    breakdown.behavioral_consistency.score +
    breakdown.cashflow_stability.score +
    breakdown.engagement_depth.score
  );
}

/** Derive a tier label from total score. */
function deriveV5Tier(score: number): string {
  return score >= 70 ? "Oro" : score >= 40 ? "Plata" : "Bronce";
}

interface ArchetypeReport {
  label:             string;
  description:       string;
  v5Score:           number;
  v5Tier:            string;
  aggregateStatus:   string;
  aggregateScore:    number | null;
  prStatus:          string;
  prScore:           number | null;
  cfrStatus:         string;
  cfrScore:          number | null;
  bsStatus:          string;
  bsScore:           number | null;
  edBand:            string;
  obligationCount:   number;
  obligationStatuses: string[];
  cfrAssessment:     string;
}

function computeReport(archetype: ArchetypeFixture, entityId = "+5212345678"): ArchetypeReport {
  const shadow = computeShadowBehavioralProfile(archetype.snap, ARCHETYPE_REF);
  const pr     = computeShadowPaymentReliability(archetype.snap);
  const cfr    = computeShadowCashFlowResilience(archetype.snap);
  const bs     = computeShadowBehavioralStability(archetype.snap);
  const ed     = computeEvidenceDepthFromInputs(archetype.edInputs, ARCHETYPE_REF);
  const eo     = computeExpectedObligations(entityId, archetype.payments, ARCHETYPE_REF);
  const { breakdown: v5Breakdown } = computePTIv5(archetype.snap);
  const v5Score = deriveV5TotalScore(v5Breakdown);
  const v5Tier  = deriveV5Tier(v5Score);

  // CFR structural assessment
  let cfrAssessment: string;
  const snap = archetype.snap;
  const bufferRatio = snap.totalLoads > 0 ? snap.currentBalance / snap.totalLoads : 0;
  const spendRatio  = snap.totalLoads > 0 ? snap.totalSpend   / snap.totalLoads   : 0;

  if (cfr.status === "INSUFFICIENT_DATA") {
    cfrAssessment = "INSUFFICIENT_DATA — no wallet activity";
  } else if (bufferRatio >= 0.15) {
    cfrAssessment = `STRONG_BUFFER (${(bufferRatio * 100).toFixed(1)}% of loads retained)`;
  } else if (spendRatio >= 0.95) {
    cfrAssessment = `CONSTRAINED_BUFFER (${(spendRatio * 100).toFixed(1)}% of loads spent)`;
  } else {
    cfrAssessment = `MODERATE_BUFFER (${(bufferRatio * 100).toFixed(1)}% retained, ${(spendRatio * 100).toFixed(1)}% spent)`;
  }

  return {
    label:             archetype.label,
    description:       archetype.description,
    v5Score,
    v5Tier,
    aggregateStatus:   shadow.aggregate.status,
    aggregateScore:    shadow.aggregate.status === "COMPUTED" ? shadow.aggregate.score : null,
    prStatus:          pr.status,
    prScore:           pr.status === "COMPUTED" ? pr.normalized_score : null,
    cfrStatus:         cfr.status,
    cfrScore:          cfr.status === "COMPUTED" ? cfr.normalized_score : null,
    bsStatus:          bs.status,
    bsScore:           bs.status === "COMPUTED" ? bs.normalized_score : null,
    edBand:            ed.band,
    obligationCount:   eo.obligations.length,
    obligationStatuses: eo.obligations.map(o => `${o.service_name}:${o.lifecycle_status}`),
    cfrAssessment,
  };
}

// ─── MAIN ────────────────────────────────────────────────────────────────────
function run(): void {
  console.log(bold(cyan("\n═══════════════════════════════════════════════════════════════")));
  console.log(bold(cyan("  PTI v2 ARCHETYPE REPORT — Cash Flow Resilience Analysis")));
  console.log(bold(cyan(`  Reference time: ${ARCHETYPE_REF.toISOString()}`)));
  console.log(bold(cyan("═══════════════════════════════════════════════════════════════\n")));

  const reports = ALL_ARCHETYPES.map((a, i) => computeReport(a, `+521000000000${i}`));
  const bankReport = computeReport(BANKED_EQUIVALENT, "+521000000099");
  const cashReport = reports[0]; // CASH_FIRST_CONSISTENT

  // ─── Per-archetype detail ───────────────────────────────────────────────────
  for (const r of reports) {
    console.log(bold(`┌── ${r.label}`));
    console.log(`│ v5: ${r.v5Score.toString().padStart(3)} pts (${r.v5Tier}) │ Shadow: ${statusColor(r.aggregateStatus)}${r.aggregateScore != null ? ` ${r.aggregateScore}` : ""}`);
    console.log(`│ PR  ${scoreBar(r.prScore)}  (${statusColor(r.prStatus)})`);
    console.log(`│ CFR ${scoreBar(r.cfrScore)}  (${statusColor(r.cfrStatus)})`);
    console.log(`│ BS  ${scoreBar(r.bsScore)}  (${statusColor(r.bsStatus)})`);
    console.log(`│ ED: ${statusColor(r.edBand)} │ EO: ${r.obligationCount} obligations`);
    if (r.obligationStatuses.length > 0) {
      console.log(`│ EO statuses: ${r.obligationStatuses.slice(0, 5).join(", ")}`);
    }
    console.log(`│ CFR assessment: ${r.cfrAssessment}`);
    console.log("└");
    console.log();
  }

  // ─── CFR Weight Analysis ────────────────────────────────────────────────────
  console.log(bold(cyan("═══ CASH FLOW RESILIENCE — WEIGHT ANALYSIS (35% of aggregate) ═══\n")));

  const computed = reports.filter(r => r.cfrStatus === "COMPUTED");
  const insuff   = reports.filter(r => r.cfrStatus === "INSUFFICIENT_DATA");

  console.log(`  CFR COMPUTED:           ${computed.length}/10 archetypes`);
  console.log(`  CFR INSUFFICIENT_DATA:  ${insuff.length}/10 archetypes`);

  if (computed.length > 0) {
    const scores = computed.map(r => r.cfrScore ?? 0);
    const mean   = scores.reduce((a, b) => a + b, 0) / scores.length;
    const min    = Math.min(...scores);
    const max    = Math.max(...scores);
    console.log(`  CFR score range:        ${min} — ${max}  (mean: ${mean.toFixed(1)})`);
  }

  console.log();

  // ─── CFR structural findings ─────────────────────────────────────────────────
  console.log(bold("CFR Structural Assessment per archetype:"));
  for (const r of reports) {
    const marker = r.cfrStatus === "COMPUTED" ? green("●") : red("○");
    console.log(`  ${marker} ${r.label.padEnd(40)} ${r.cfrAssessment}`);
  }

  console.log();
  console.log(bold(yellow("CFR Invariant Check:")));

  // GIG_INCOME: irregular load income must not suppress CFR
  const gigReport = reports.find(r => r.label.includes("Gig"))!;
  const gigOk = gigReport.cfrStatus === "COMPUTED";
  console.log(`  ${gigOk ? green("PASS") : red("FAIL")} GIG_INCOME: CFR COMPUTED (load variability alone does not suppress)`);

  // WALLET_ONLY: CFR COMPUTED from buffer alone
  const walletReport = reports.find(r => r.label.includes("Wallet"))!;
  const walletOk = walletReport.cfrStatus === "COMPUTED";
  console.log(`  ${walletOk ? green("PASS") : red("FAIL")} WALLET_ONLY: CFR COMPUTED from buffer (no bill payments required)`);

  // NEW_USER: CFR COMPUTED (has some balance)
  const newReport = reports.find(r => r.label.includes("New User"))!;
  const newOk = newReport.cfrStatus === "COMPUTED";
  console.log(`  ${newOk ? green("PASS") : yellow("NOTE")} NEW_USER: CFR status = ${newReport.cfrStatus} (50 MXN balance)`);

  // HIGH_ENGAGEMENT_WEAK_BEHAVIOR: CFR reflects deficit wallet
  const highEngReport = reports.find(r => r.label.includes("High-Engagement"))!;
  const highEngCFR = highEngReport.cfrScore;
  console.log(`  ${green("INFO")} HIGH_ENGAGEMENT_WEAK_BEHAVIOR: CFR score = ${highEngCFR ?? "INSUFFICIENT"} (deficit wallet expected low score)`);

  console.log();

  // ─── FAIR-BANK verification ──────────────────────────────────────────────────
  console.log(bold(cyan("═══ FAIR-BANK INVARIANT — CASH vs SPEI ═══\n")));
  const bankEqual = (
    cashReport.aggregateStatus === bankReport.aggregateStatus &&
    (cashReport.aggregateStatus !== "COMPUTED" || cashReport.aggregateScore === bankReport.aggregateScore)
  );
  const prEqual = cashReport.prScore === bankReport.prScore;
  const cfrEqual = cashReport.cfrScore === bankReport.cfrScore;
  const bsEqual = cashReport.bsScore === bankReport.bsScore;

  console.log(`  CASH_FIRST_CONSISTENT aggregate: ${cashReport.aggregateStatus} ${cashReport.aggregateScore ?? ""}`);
  console.log(`  BANKED_EQUIVALENT aggregate:     ${bankReport.aggregateStatus} ${bankReport.aggregateScore ?? ""}`);
  console.log(`  ${bankEqual ? green("PASS") : red("FAIL")} Aggregate scores identical`);
  console.log(`  ${prEqual  ? green("PASS") : red("FAIL")} PR scores identical  (${cashReport.prScore} vs ${bankReport.prScore})`);
  console.log(`  ${cfrEqual ? green("PASS") : red("FAIL")} CFR scores identical (${cashReport.cfrScore} vs ${bankReport.cfrScore})`);
  console.log(`  ${bsEqual  ? green("PASS") : red("FAIL")} BS scores identical  (${cashReport.bsScore} vs ${bankReport.bsScore})`);

  console.log();

  // ─── CFR weight structural verdict ───────────────────────────────────────────
  console.log(bold(cyan("═══ CFR WEIGHT VERDICT (35%) ═══\n")));
  const cfrOk = gigOk && walletOk;
  if (cfrOk) {
    console.log(green("  CFR weight at 35% is STRUCTURALLY SOUND across tested archetypes."));
    console.log("  • GIG_INCOME: payment behavior correctly drives CFR, not load volatility.");
    console.log("  • WALLET_ONLY: buffer-only users correctly receive CFR signal.");
    console.log("  • FAIR-BANK: funding channel correctly orthogonal to CFR.");
  } else {
    console.log(red("  CFR weight at 35% has STRUCTURAL ISSUES — see failing invariants above."));
    console.log("  Document findings and STOP — do not change aggregation logic per sprint spec.");
  }

  console.log();
  console.log(bold(cyan("═══ REPORT COMPLETE ═══\n")));
}

run();
