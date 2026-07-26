/**
 * paulaPTIv2Context — Sprint 9 / Part B
 *
 * Unit tests for buildPTIv2PaulaContext.ts pure helper functions and the
 * prompt renderer. All tests are pure — no DB, no network, no real user data.
 *
 * Coverage:
 *   STANCE-COMPUTED   — computeStanceFromDimAndEd for all dimension × ED combinations
 *   STANCE-INSUF      — INSUFFICIENT_DATA on either dim or ED → continue_modules
 *   FRAMING-WORDS     — prohibited words absent from all framing constants
 *   TRAJ-FRAMING      — trajectory framing returns correct strings
 *   EO-NEUTRAL        — buildEOSummaryStr: prohibited words absent, STALE/UNRESOLVED are neutral
 *   PROMPT-DELIMITERS — renderPTIv2PromptSection has both open/close delimiters
 *   PROMPT-NO-SCORES  — rendered prompt has no raw score numbers or weight identifiers
 *   PROMPT-FALLBACK   — { available: false } → empty string (Paula unaffected)
 *   PROMPT-STANCES    — all 5 stances produce non-empty rendered prompt
 *   SOURCE-PURITY     — source file contains no INSERT/UPDATE/DELETE SQL
 */

import { describe, test, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

import {
  computeStanceFromDimAndEd,
  buildDescriptiveFraming,
  buildTrajectoryFramingStr,
  buildEOSummaryStr,
  renderPTIv2PromptSection,
  type CoachingStance,
  type DimensionCoachingFrame,
  type PTIv2PaulaContext,
  type PTIv2PaulaContextResult,
} from "../buildPTIv2PaulaContext.js";

import type { ShadowDimensionResult } from "../ptiV2Shadow.js";
import type { ExpectedObligationsResult } from "../ptiV2.js";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeDim(status: "COMPUTED" | "INSUFFICIENT_DATA", score = 0): ShadowDimensionResult {
  return { status, normalized_score: score };
}

function makeFrame(stance: CoachingStance): DimensionCoachingFrame {
  return { stance, descriptive_framing: "test framing", trajectory_framing: "" };
}

function makeCtx(overrides: Partial<PTIv2PaulaContext> = {}): PTIv2PaulaContextResult {
  return {
    available:            true,
    aggregate_status:     "COMPUTED",
    payment_reliability:  makeFrame("confident_reinforce"),
    cash_flow_resilience: makeFrame("acknowledge_and_build"),
    behavioral_stability: makeFrame("coach_directly"),
    expected_obligations: "CFE: servicio con patrón de pago regular identificado.",
    ...overrides,
  };
}

function makeEO(obligations: ExpectedObligationsResult["obligations"]): ExpectedObligationsResult {
  return {
    entity_id:   "+521test",
    entity_type: "human",
    domain:      "financial",
    obligations,
    computed_at: new Date().toISOString(),
    version:     "1.0.0",
  };
}

function makeObligation(
  name: string,
  status: "OBSERVED_FULFILLED" | "EXPECTED" | "DUE_WINDOW" | "STALE" | "UNRESOLVED",
): ExpectedObligationsResult["obligations"][0] {
  return {
    entity_id:           "+521test",
    entity_type:         "human",
    domain:              "financial",
    obligation_id:       `eo::+521test::${name.toLowerCase()}`,
    obligation_type:     "utilities",
    service_name:        name,
    expected_date_range: { start: "2026-08-01", end: "2026-08-07" },
    amount_baseline:     { mean_mxn: 300, min_mxn: 290, max_mxn: 310, currency: "MXN" },
    cadence:             "monthly",
    cadence_interval_days: 30,
    expectation_source:   "OBSERVED_RECURRING",
    expectation_confidence: "HIGH",
    first_observed_at:   "2025-12-01T00:00:00Z",
    last_observed_at:    "2026-07-01T00:00:00Z",
    observation_count:   6,
    lifecycle_status:    status,
    version:             "1.0.0",
  };
}

// Prohibited words that must never appear in any framing output
const PROHIBITED_WORDS = [
  "missed", "late", "failed", "delinquent",
  "atrasado", "incumpliste", "fallaste", "perdiste",
  "riesgo", "incumplimiento", "impago", "crediticio",
];

// ─── STANCE-COMPUTED ─────────────────────────────────────────────────────────
describe("STANCE-COMPUTED — computeStanceFromDimAndEd matrix", () => {
  test("COMPUTED dim score ≥ 60 + HIGH ED → confident_reinforce", () => {
    expect(computeStanceFromDimAndEd(makeDim("COMPUTED", 75), "HIGH")).toBe("confident_reinforce");
    expect(computeStanceFromDimAndEd(makeDim("COMPUTED", 60), "HIGH")).toBe("confident_reinforce");
  });

  test("COMPUTED dim score ≥ 60 + MODERATE ED → acknowledge_and_build", () => {
    expect(computeStanceFromDimAndEd(makeDim("COMPUTED", 80), "MODERATE")).toBe("acknowledge_and_build");
  });

  test("COMPUTED dim score ≥ 60 + LOW ED → acknowledge_and_build", () => {
    expect(computeStanceFromDimAndEd(makeDim("COMPUTED", 65), "LOW")).toBe("acknowledge_and_build");
  });

  test("COMPUTED dim score < 60 + HIGH ED → coach_directly", () => {
    expect(computeStanceFromDimAndEd(makeDim("COMPUTED", 40), "HIGH")).toBe("coach_directly");
    expect(computeStanceFromDimAndEd(makeDim("COMPUTED", 0),  "HIGH")).toBe("coach_directly");
  });

  test("COMPUTED dim score < 60 + MODERATE ED → encourage_habits", () => {
    expect(computeStanceFromDimAndEd(makeDim("COMPUTED", 50), "MODERATE")).toBe("encourage_habits");
  });

  test("COMPUTED dim score < 60 + LOW ED → encourage_habits", () => {
    expect(computeStanceFromDimAndEd(makeDim("COMPUTED", 30), "LOW")).toBe("encourage_habits");
  });

  test("boundary: score exactly 59 + HIGH ED → coach_directly", () => {
    expect(computeStanceFromDimAndEd(makeDim("COMPUTED", 59), "HIGH")).toBe("coach_directly");
  });

  test("boundary: score exactly 60 + HIGH ED → confident_reinforce", () => {
    expect(computeStanceFromDimAndEd(makeDim("COMPUTED", 60), "HIGH")).toBe("confident_reinforce");
  });
});

// ─── STANCE-INSUF ─────────────────────────────────────────────────────────────
describe("STANCE-INSUF — INSUFFICIENT_DATA → continue_modules", () => {
  test("INSUFFICIENT_DATA dim + any ED → continue_modules", () => {
    for (const band of ["LOW", "MODERATE", "HIGH", "INSUFFICIENT_DATA"] as const) {
      expect(computeStanceFromDimAndEd(makeDim("INSUFFICIENT_DATA", 80), band)).toBe("continue_modules");
    }
  });

  test("COMPUTED dim + INSUFFICIENT_DATA ED → continue_modules", () => {
    expect(computeStanceFromDimAndEd(makeDim("COMPUTED", 90), "INSUFFICIENT_DATA")).toBe("continue_modules");
  });

  test("both INSUFFICIENT_DATA → continue_modules", () => {
    expect(computeStanceFromDimAndEd(makeDim("INSUFFICIENT_DATA", 0), "INSUFFICIENT_DATA")).toBe("continue_modules");
  });
});

// ─── FRAMING-WORDS ─────────────────────────────────────────────────────────────
describe("FRAMING-WORDS — prohibited words absent from all descriptive framing", () => {
  const dimKeys = ["payment_reliability", "cash_flow_resilience", "behavioral_stability"];
  const scores  = [0, 30, 50, 60, 75, 100];

  for (const dimKey of dimKeys) {
    for (const score of scores) {
      test(`${dimKey} score=${score}: no prohibited words in descriptive framing`, () => {
        const framing = buildDescriptiveFraming(dimKey, makeDim("COMPUTED", score));
        for (const word of PROHIBITED_WORDS) {
          expect(framing.toLowerCase()).not.toContain(word.toLowerCase());
        }
      });
    }
  }

  test("INSUFFICIENT_DATA dim: no prohibited words in framing", () => {
    for (const dimKey of dimKeys) {
      const framing = buildDescriptiveFraming(dimKey, makeDim("INSUFFICIENT_DATA", 0));
      for (const word of PROHIBITED_WORDS) {
        expect(framing.toLowerCase()).not.toContain(word.toLowerCase());
      }
    }
  });
});

// ─── TRAJ-FRAMING ─────────────────────────────────────────────────────────────
describe("TRAJ-FRAMING — trajectory framing strings", () => {
  const dimKeys = ["payment_reliability", "cash_flow_resilience", "behavioral_stability"];
  const directions = ["IMPROVING", "STABLE", "DETERIORATING", "INSUFFICIENT_DATA"];

  for (const dimKey of dimKeys) {
    for (const dir of directions) {
      test(`${dimKey} + ${dir}: no prohibited words`, () => {
        const framing = buildTrajectoryFramingStr(dimKey, dir);
        for (const word of PROHIBITED_WORDS) {
          expect(framing.toLowerCase()).not.toContain(word.toLowerCase());
        }
      });
    }
  }

  test("null direction: returns empty string", () => {
    expect(buildTrajectoryFramingStr("payment_reliability", null)).toBe("");
    expect(buildTrajectoryFramingStr("payment_reliability", undefined)).toBe("");
  });

  test("INSUFFICIENT_DATA direction: returns empty string", () => {
    expect(buildTrajectoryFramingStr("payment_reliability", "INSUFFICIENT_DATA")).toBe("");
  });

  test("IMPROVING: returns non-empty string", () => {
    const s = buildTrajectoryFramingStr("payment_reliability", "IMPROVING");
    expect(s.length).toBeGreaterThan(0);
  });

  test("STABLE: returns non-empty string", () => {
    const s = buildTrajectoryFramingStr("cash_flow_resilience", "STABLE");
    expect(s.length).toBeGreaterThan(0);
  });

  test("DETERIORATING: returns non-empty string, no prohibited words", () => {
    const s = buildTrajectoryFramingStr("behavioral_stability", "DETERIORATING");
    expect(s.length).toBeGreaterThan(0);
    for (const word of PROHIBITED_WORDS) {
      expect(s.toLowerCase()).not.toContain(word.toLowerCase());
    }
  });
});

// ─── EO-NEUTRAL ──────────────────────────────────────────────────────────────
describe("EO-NEUTRAL — EO summary strings are neutral/factual", () => {
  const allStatuses = ["OBSERVED_FULFILLED", "EXPECTED", "DUE_WINDOW", "STALE", "UNRESOLVED"] as const;

  for (const status of allStatuses) {
    test(`${status}: no prohibited words in EO summary`, () => {
      const eo = makeEO([makeObligation("CFE", status)]);
      const summary = buildEOSummaryStr(eo);
      for (const word of PROHIBITED_WORDS) {
        expect(summary.toLowerCase()).not.toContain(word.toLowerCase());
      }
    });
  }

  test("empty obligations: returns non-empty descriptive fallback string", () => {
    const summary = buildEOSummaryStr(makeEO([]));
    expect(summary.length).toBeGreaterThan(0);
    for (const word of PROHIBITED_WORDS) {
      expect(summary.toLowerCase()).not.toContain(word.toLowerCase());
    }
  });

  test("STALE: neutral language, no 'missed'/'late'/'failed' words", () => {
    const summary = buildEOSummaryStr(makeEO([makeObligation("CFE", "STALE")]));
    expect(summary.toLowerCase()).not.toContain("missed");
    expect(summary.toLowerCase()).not.toContain("late");
    expect(summary.toLowerCase()).not.toContain("failed");
  });

  test("UNRESOLVED: neutral language only", () => {
    const summary = buildEOSummaryStr(makeEO([makeObligation("Telmex", "UNRESOLVED")]));
    expect(summary.toLowerCase()).not.toContain("missed");
    expect(summary.toLowerCase()).not.toContain("late");
    expect(summary.toLowerCase()).not.toContain("failed");
    expect(summary.toLowerCase()).not.toContain("delinquent");
    // Must contain a neutral observed-direction phrase
    expect(summary.toLowerCase()).toContain("no se ha observado");
  });

  test("multiple obligations: all included in summary", () => {
    const eo = makeEO([
      makeObligation("CFE",    "OBSERVED_FULFILLED"),
      makeObligation("Telmex", "DUE_WINDOW"),
      makeObligation("Izzi",   "STALE"),
    ]);
    const summary = buildEOSummaryStr(eo);
    expect(summary).toContain("CFE");
    expect(summary).toContain("Telmex");
    expect(summary).toContain("Izzi");
  });
});

// ─── PROMPT-DELIMITERS ────────────────────────────────────────────────────────
describe("PROMPT-DELIMITERS — rendered prompt has open and close delimiters", () => {
  test("renderPTIv2PromptSection includes opening delimiter", () => {
    const output = renderPTIv2PromptSection(makeCtx());
    expect(output).toContain("--- PTI V2 COACHING CONTEXT");
  });

  test("renderPTIv2PromptSection includes closing delimiter", () => {
    const output = renderPTIv2PromptSection(makeCtx());
    expect(output).toContain("--- FIN PTI V2 COACHING CONTEXT ---");
  });

  test("renderPTIv2PromptSection includes the internal-research note", () => {
    const output = renderPTIv2PromptSection(makeCtx());
    expect(output).toContain("investigación interna");
  });
});

// ─── PROMPT-NO-SCORES ────────────────────────────────────────────────────────
describe("PROMPT-NO-SCORES — rendered prompt contains no raw scores or weights", () => {
  // These patterns must not appear in the framing sections of the rendered output.
  // We skip /\bPR\b/, /\bCFR\b/, /\bBS\b/ because the PROHIBICIONES block legitimately
  // lists them as terms Paula must not use — they're in the instruction, not the framing.
  const SCORE_PATTERNS = [
    /\bpti_\w/i,        // internal field names (pti_score, etc.)
    /normalized_score/i,
    /\bweight\b/i,
    /\bthreshold\b/i,
  ];

  test("no internal variable names or weights in rendered output", () => {
    for (const stance of [
      "confident_reinforce", "acknowledge_and_build",
      "coach_directly", "encourage_habits", "continue_modules",
    ] as CoachingStance[]) {
      const ctx = makeCtx({
        payment_reliability:  makeFrame(stance),
        cash_flow_resilience: makeFrame(stance),
        behavioral_stability: makeFrame(stance),
      });
      const output = renderPTIv2PromptSection(ctx);
      for (const pattern of SCORE_PATTERNS) {
        expect(output).not.toMatch(pattern);
      }
    }
  });

  test("no prohibited coaching words appear in the rendered context section", () => {
    const output = renderPTIv2PromptSection(makeCtx());
    const lower = output.toLowerCase();
    // Words that must not appear in the coaching context framing
    for (const word of PROHIBITED_WORDS) {
      // The prohibitions section lists them — but only inside the PROHIBICIONES block
      // We check the framing sections, not the prohibitions list
      const framingSection = output.split("PROHIBICIONES")[0] ?? output;
      expect(framingSection.toLowerCase()).not.toContain(word.toLowerCase());
    }
  });
});

// ─── PROMPT-FALLBACK ─────────────────────────────────────────────────────────
describe("PROMPT-FALLBACK — { available: false } → empty string", () => {
  test("renderPTIv2PromptSection({ available: false }) returns empty string", () => {
    const output = renderPTIv2PromptSection({ available: false });
    expect(output).toBe("");
  });

  test("empty string does not break prompt concatenation", () => {
    const basePrompt = "base prompt text";
    const output = renderPTIv2PromptSection({ available: false });
    const combined = basePrompt + output;
    expect(combined).toBe(basePrompt);
  });
});

// ─── PROMPT-STANCES ──────────────────────────────────────────────────────────
describe("PROMPT-STANCES — all 5 stances produce valid non-empty prompt sections", () => {
  const stances: CoachingStance[] = [
    "confident_reinforce",
    "acknowledge_and_build",
    "coach_directly",
    "encourage_habits",
    "continue_modules",
  ];

  for (const stance of stances) {
    test(`stance='${stance}': renders non-empty section with delimiters`, () => {
      const ctx = makeCtx({
        payment_reliability:  makeFrame(stance),
        cash_flow_resilience: makeFrame(stance),
        behavioral_stability: makeFrame(stance),
      });
      const output = renderPTIv2PromptSection(ctx);
      expect(output.length).toBeGreaterThan(50);
      expect(output).toContain("--- PTI V2 COACHING CONTEXT");
      expect(output).toContain("--- FIN PTI V2 COACHING CONTEXT ---");
    });
  }

  test("PROHIBICIONES block appears in every rendered section", () => {
    for (const stance of stances) {
      const ctx = makeCtx({
        payment_reliability:  makeFrame(stance),
        cash_flow_resilience: makeFrame(stance),
        behavioral_stability: makeFrame(stance),
      });
      const output = renderPTIv2PromptSection(ctx);
      expect(output).toContain("PROHIBICIONES ABSOLUTAS");
    }
  });
});

// ─── SOURCE-PURITY ────────────────────────────────────────────────────────────
describe("SOURCE-PURITY — buildPTIv2PaulaContext.ts contains no write SQL", () => {
  test("source file contains no INSERT keyword", () => {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const srcPath   = path.resolve(__dirname, "../../services/buildPTIv2PaulaContext.ts");
    // Also try path relative to tests dir
    const altPath   = path.resolve(__dirname, "../buildPTIv2PaulaContext.ts");
    const filePath  = fs.existsSync(srcPath) ? srcPath : altPath;
    expect(fs.existsSync(filePath)).toBe(true);
    const src = fs.readFileSync(filePath, "utf-8");
    // Allow the word in comments
    const codeLines = src.split("\n").filter(l => !l.trimStart().startsWith("*") && !l.trimStart().startsWith("//"));
    const codeOnly  = codeLines.join("\n");
    expect(codeOnly).not.toMatch(/\bINSERT\b/i);
    expect(codeOnly).not.toMatch(/\bUPDATE\b/i);
    expect(codeOnly).not.toMatch(/\bDELETE\b/i);
  });

  test("source file does not import from ptiV5.ts", () => {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const srcPath   = path.resolve(__dirname, "../../services/buildPTIv2PaulaContext.ts");
    const altPath   = path.resolve(__dirname, "../buildPTIv2PaulaContext.ts");
    const filePath  = fs.existsSync(srcPath) ? srcPath : altPath;
    const src = fs.readFileSync(filePath, "utf-8");
    expect(src).not.toMatch(/from ['"].*ptiV5/);
    // Use ^import with multiline flag to only match real import statements (not comments)
    expect(src).not.toMatch(/^import.*ptiV5/m);
  });
});

// ─── DESCRIPTIVE-FRAMING — correct tier breakpoints ─────────────────────────
describe("buildDescriptiveFraming — correct tier language", () => {
  test("PR score ≥ 75 → 'muy consistente'", () => {
    const s = buildDescriptiveFraming("payment_reliability", makeDim("COMPUTED", 80));
    expect(s.toLowerCase()).toContain("muy consistente");
  });

  test("PR score 50–74 → 'patrón en construcción'", () => {
    const s = buildDescriptiveFraming("payment_reliability", makeDim("COMPUTED", 55));
    expect(s.toLowerCase()).toContain("construcción");
  });

  test("PR score < 50 → early development language", () => {
    const s = buildDescriptiveFraming("payment_reliability", makeDim("COMPUTED", 25));
    expect(s.toLowerCase()).toContain("temprana");
  });

  test("CFR score ≥ 75 → buffer language", () => {
    const s = buildDescriptiveFraming("cash_flow_resilience", makeDim("COMPUTED", 80));
    expect(s.toLowerCase()).toContain("saludable");
  });

  test("BS score ≥ 75 → 'rutina estable'", () => {
    const s = buildDescriptiveFraming("behavioral_stability", makeDim("COMPUTED", 82));
    expect(s.toLowerCase()).toContain("estable");
  });
});
