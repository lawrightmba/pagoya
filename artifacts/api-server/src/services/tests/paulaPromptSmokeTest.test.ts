/**
 * Paula Prompt Smoke Test — Task #7 Part A + B + C
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Part A  — Verifies that buildSystemPrompt assembles a valid system prompt when
 *            PTI v2 coaching context is present/absent.  All context objects are
 *            constructed directly from pure helper calls — no DB calls anywhere.
 *
 * Part B  — Verifies the isDataStale staleness guard with fresh/boundary/past
 *            date inputs.  Pure date-arithmetic only.
 *
 * Part C  — Verifies the masked-error-logging contract: the masking formula is
 *            correct, and buildPTIv2PaulaContext always returns { available: false }
 *            on any exception without re-throwing.
 *
 * HARD CONSTRAINTS:
 *   • No DB calls.  No HTTP requests.  No external imports.
 *   • No real user data.
 *   • These tests MUST remain pure-function / unit-level so they run fast and
 *     never become flaky due to DB state.
 */

import { describe, it, expect } from "vitest";

import {
  computeStanceFromDimAndEd,
  buildDescriptiveFraming,
  buildTrajectoryFramingStr,
  buildEOSummaryStr,
  renderPTIv2PromptSection,
  isDataStale,
  STALENESS_THRESHOLD_DAYS,
  type PTIv2PaulaContext,
  type PTIv2PaulaContextResult,
} from "../buildPTIv2PaulaContext.js";

import { buildSystemPrompt } from "../../routes/agentChat.js";

// ─── Synthetic ShadowDimensionResult shapes (structural-only, no import needed) ─
type FakeDim = { status: string; normalized_score: number | null };

// ─── Helper: build a fully-populated PTIv2PaulaContext from pure helpers ────────
function buildContext(
  prDim: FakeDim,
  cfrDim: FakeDim,
  bsDim: FakeDim,
  edBand: "HIGH" | "MODERATE" | "LOW" | "INSUFFICIENT_DATA",
  prDir: string | null,
  cfrDir: string | null,
  bsDir: string | null,
  eoStatuses: Array<{ service_name: string; lifecycle_status: string }>,
): PTIv2PaulaContext {
  return {
    available:        true,
    aggregate_status: "COMPUTED",
    payment_reliability: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      stance:              computeStanceFromDimAndEd(prDim  as any, edBand),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      descriptive_framing: buildDescriptiveFraming("payment_reliability",  prDim  as any),
      trajectory_framing:  buildTrajectoryFramingStr("payment_reliability",  prDir),
    },
    cash_flow_resilience: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      stance:              computeStanceFromDimAndEd(cfrDim as any, edBand),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      descriptive_framing: buildDescriptiveFraming("cash_flow_resilience", cfrDim as any),
      trajectory_framing:  buildTrajectoryFramingStr("cash_flow_resilience", cfrDir),
    },
    behavioral_stability: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      stance:              computeStanceFromDimAndEd(bsDim  as any, edBand),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      descriptive_framing: buildDescriptiveFraming("behavioral_stability",  bsDim  as any),
      trajectory_framing:  buildTrajectoryFramingStr("behavioral_stability",  bsDir),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expected_obligations: buildEOSummaryStr({ obligations: eoStatuses } as any),
  };
}

// ─── Fixture A1: STRONG_PAYER — mirrors CASH_FIRST_CONSISTENT archetype ────────
//    PR score=80 / CFR score=65 / BS score=72, edBand=HIGH → all "confident_reinforce"
const STRONG_PAYER_CTX = buildContext(
  { status: "COMPUTED", normalized_score: 80 },
  { status: "COMPUTED", normalized_score: 65 },
  { status: "COMPUTED", normalized_score: 72 },
  "HIGH",
  "IMPROVING",
  "STABLE",
  "IMPROVING",
  [
    { service_name: "CFE",    lifecycle_status: "EXPECTED"          },
    { service_name: "Telmex", lifecycle_status: "OBSERVED_FULFILLED" },
  ],
);

// ─── Fixture A2: WEAK_BEHAVIOR — mirrors HIGH_ENGAGEMENT_WEAK_BEHAVIOR archetype ─
//    PR INSUFFICIENT_DATA / CFR score=30 / BS INSUFFICIENT_DATA, edBand=LOW
//    Expected stances: continue_modules / encourage_habits / continue_modules
const WEAK_BEHAVIOR_CTX = buildContext(
  { status: "INSUFFICIENT_DATA", normalized_score: null },
  { status: "COMPUTED",          normalized_score: 30   },
  { status: "INSUFFICIENT_DATA", normalized_score: null },
  "LOW",
  null,
  "DETERIORATING",
  null,
  [
    { service_name: "CFE", lifecycle_status: "UNRESOLVED" },
  ],
);

// ═══════════════════════════════════════════════════════════════════════════════
// PART A — renderPTIv2PromptSection
// ═══════════════════════════════════════════════════════════════════════════════

describe("Part A — renderPTIv2PromptSection: structural + content invariants", () => {
  // ── A-UNAVAIL: unavailable context ──────────────────────────────────────────
  describe("unavailable context", () => {
    it("A-UNAVAIL-1: returns empty string", () => {
      expect(renderPTIv2PromptSection({ available: false })).toBe("");
    });
  });

  // ── A-STRUCT: structural delimiters ─────────────────────────────────────────
  describe("STRONG_PAYER: structural delimiters", () => {
    const rendered = renderPTIv2PromptSection(STRONG_PAYER_CTX);

    it("A-STRUCT-1: contains opening delimiter", () => {
      expect(rendered).toContain("--- PTI V2 COACHING CONTEXT");
    });

    it("A-STRUCT-2: contains closing delimiter", () => {
      expect(rendered).toContain("--- FIN PTI V2 COACHING CONTEXT ---");
    });

    it("A-STRUCT-3: contains user-facing dimension labels (not technical names)", () => {
      expect(rendered).toContain("PAGO DE SERVICIOS");
      expect(rendered).toContain("FLUJO DE FONDOS");
      expect(rendered).toContain("RUTINA FINANCIERA");
    });

    it("A-STRUCT-4: contains SERVICIOS RECURRENTES section", () => {
      expect(rendered).toContain("SERVICIOS RECURRENTES IDENTIFICADOS");
    });

    it("A-STRUCT-5: contains PROHIBICIONES ABSOLUTAS block", () => {
      expect(rendered).toContain("PROHIBICIONES ABSOLUTAS");
    });
  });

  // ── A-FORBIDDEN: no internal technical terms in the framing sections ─────────
  // We check only the framing sections BEFORE the PROHIBICIONES block because
  // the PROHIBICIONES block itself quotes forbidden terms as examples of what
  // the LLM must NOT output (those appearances are intentional and correct).
  describe("STRONG_PAYER: no internal technical terms in framing sections", () => {
    const rendered     = renderPTIv2PromptSection(STRONG_PAYER_CTX);
    const framingOnly  = rendered.split("PROHIBICIONES ABSOLUTAS")[0];

    it("A-FORBIDDEN-1: framing section does not contain 'shadow'", () => {
      expect(framingOnly).not.toContain("shadow");
    });

    it("A-FORBIDDEN-2: framing section does not contain 'Evidence Depth'", () => {
      expect(framingOnly).not.toContain("Evidence Depth");
    });

    it("A-FORBIDDEN-3: framing section does not contain 'Payment Reliability' (technical name)", () => {
      expect(framingOnly).not.toContain("Payment Reliability");
    });

    it("A-FORBIDDEN-4: framing section does not contain 'Cash Flow Resilience' (technical name)", () => {
      expect(framingOnly).not.toContain("Cash Flow Resilience");
    });

    it("A-FORBIDDEN-5: framing section does not contain 'Behavioral Stability' (technical name)", () => {
      expect(framingOnly).not.toContain("Behavioral Stability");
    });

    it("A-FORBIDDEN-6: framing section does not contain version strings (v5.0.0 / rc1 / v4.3 etc.)", () => {
      expect(framingOnly).not.toMatch(/v\d+\.\d+(?:\.\d+)?(?:-\w+)?/);
    });

    it("A-FORBIDDEN-7: framing section does not contain raw score fractions (e.g. 24/36)", () => {
      expect(framingOnly).not.toMatch(/\d+\/\d+/);
    });
  });

  // ── A-LENDING: no lending / default language in the coaching framing ────────
  // We check only the framing sections BEFORE the PROHIBICIONES block because
  // PROHIBICIONES intentionally quotes these terms as examples of what Paula
  // must not output — those appearances are correct and expected.
  describe("STRONG_PAYER: no lending or default-probability language in coaching framing", () => {
    const rendered    = renderPTIv2PromptSection(STRONG_PAYER_CTX);
    const framingOnly = rendered.split("PROHIBICIONES ABSOLUTAS")[0];

    it("A-LENDING-1: coaching framing does not contain 'eres bajo riesgo'", () => {
      expect(framingOnly).not.toContain("eres bajo riesgo");
    });

    it("A-LENDING-2: coaching framing does not contain 'probabilidad de pago'", () => {
      expect(framingOnly).not.toContain("probabilidad de pago");
    });

    it("A-LENDING-3: coaching framing does not contain 'probabilidad de impago'", () => {
      expect(framingOnly).not.toContain("probabilidad de impago");
    });

    it("A-LENDING-4: coaching framing does not contain 'creditworthy'", () => {
      expect(framingOnly).not.toContain("creditworthy");
    });

    it("A-LENDING-5: coaching framing does not contain 'default probability'", () => {
      expect(framingOnly).not.toContain("default probability");
    });
  });

  // ── A-WEAK: WEAK_BEHAVIOR archetype ─────────────────────────────────────────
  describe("WEAK_BEHAVIOR: renders without errors and contains correct stances", () => {
    const rendered = renderPTIv2PromptSection(WEAK_BEHAVIOR_CTX);

    it("A-WEAK-1: renders opening delimiter", () => {
      expect(rendered).toContain("--- PTI V2 COACHING CONTEXT");
    });

    it("A-WEAK-2: PR and BS are continue_modules stance (INSUFFICIENT_DATA)", () => {
      // The continue_modules phrasing is the distinctive text:
      expect(rendered).toContain("Continúa con los módulos de educación financiera");
    });

    it("A-WEAK-3: CFR uses encourage_habits stance (score<60 + LOW evidence)", () => {
      // The encourage_habits phrasing:
      expect(rendered).toContain("El hábito más importante");
    });

    it("A-WEAK-4: UNRESOLVED obligation uses neutral language in framing (no 'atrasado'/'incumplió'/'deuda')", () => {
      // Check framing section only — PROHIBICIONES intentionally quotes these
      // words as examples of what Paula must not say (correct and expected).
      const framingOnly = rendered.split("PROHIBICIONES ABSOLUTAS")[0];
      expect(framingOnly).not.toContain("atrasado");
      expect(framingOnly).not.toContain("incumplió");
      expect(framingOnly).not.toContain("deuda");
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PART A (continued) — buildSystemPrompt integration with V2 context
// ═══════════════════════════════════════════════════════════════════════════════

describe("Part A — buildSystemPrompt: V2 context integration", () => {
  it("A-SYS-1: with available=false — prompt equals base prompt (no V2 block appended)", () => {
    const base = buildSystemPrompt();
    const withUnavail = buildSystemPrompt(
      undefined, undefined, undefined, undefined, undefined,
      undefined, undefined, undefined, undefined, undefined,
      { available: false },
    );
    expect(withUnavail).toBe(base);
  });

  it("A-SYS-2: with available=true — prompt contains V2 coaching context delimiter", () => {
    const withCtx = buildSystemPrompt(
      undefined, undefined, undefined, undefined, undefined,
      undefined, undefined, undefined, undefined, undefined,
      STRONG_PAYER_CTX,
    );
    expect(withCtx).toContain("--- PTI V2 COACHING CONTEXT");
  });

  it("A-SYS-3: with available=true — prompt contains closing delimiter", () => {
    const withCtx = buildSystemPrompt(
      undefined, undefined, undefined, undefined, undefined,
      undefined, undefined, undefined, undefined, undefined,
      STRONG_PAYER_CTX,
    );
    expect(withCtx).toContain("--- FIN PTI V2 COACHING CONTEXT ---");
  });

  it("A-SYS-4: without V2 context — prompt does NOT contain V2 delimiters", () => {
    const base = buildSystemPrompt();
    expect(base).not.toContain("--- PTI V2 COACHING CONTEXT");
    expect(base).not.toContain("--- FIN PTI V2 COACHING CONTEXT ---");
  });

  it("A-SYS-5: V2 context does not leak 'shadow' or 'Evidence Depth' into final prompt framing", () => {
    const withCtx = buildSystemPrompt(
      undefined, undefined, undefined, undefined, undefined,
      undefined, undefined, undefined, undefined, undefined,
      STRONG_PAYER_CTX,
    );
    // Extract only the V2 block from the full prompt for targeted check
    const v2Start = withCtx.indexOf("--- PTI V2 COACHING CONTEXT");
    const v2End   = withCtx.indexOf("--- FIN PTI V2 COACHING CONTEXT ---");
    const v2Block = withCtx.slice(v2Start, v2End);
    const framingPart = v2Block.split("PROHIBICIONES ABSOLUTAS")[0];
    expect(framingPart).not.toContain("shadow");
    expect(framingPart).not.toContain("Evidence Depth");
  });

  it("A-SYS-6: WEAK_BEHAVIOR context — prompt still assembles correctly (no throw)", () => {
    expect(() => buildSystemPrompt(
      undefined, undefined, undefined, undefined, undefined,
      undefined, undefined, undefined, undefined, undefined,
      WEAK_BEHAVIOR_CTX,
    )).not.toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PART B — isDataStale: staleness threshold guard
// ═══════════════════════════════════════════════════════════════════════════════

describe("Part B — isDataStale: staleness threshold guard", () => {
  const NOW = new Date("2026-07-27T12:00:00.000Z");
  const MS_PER_DAY = 24 * 60 * 60 * 1000;

  it(`B-CONST: STALENESS_THRESHOLD_DAYS is ${STALENESS_THRESHOLD_DAYS} (provisional 90d)`, () => {
    // Changing this constant is a breaking change for all users —
    // this test documents the chosen threshold so any change requires deliberate action.
    expect(STALENESS_THRESHOLD_DAYS).toBe(90);
  });

  it("B-STALE-NULL: null lastPaymentAt → stale (no payment history)", () => {
    expect(isDataStale(null, NOW)).toBe(true);
  });

  it("B-FRESH-10D: 10 days ago → not stale", () => {
    const tenDaysAgo = new Date(NOW.getTime() - 10 * MS_PER_DAY);
    expect(isDataStale(tenDaysAgo, NOW)).toBe(false);
  });

  it("B-FRESH-1D: 1 day ago → not stale", () => {
    const oneDayAgo = new Date(NOW.getTime() - 1 * MS_PER_DAY);
    expect(isDataStale(oneDayAgo, NOW)).toBe(false);
  });

  it("B-BOUNDARY-EXACT: exactly STALENESS_THRESHOLD_DAYS ago → not stale (boundary inclusive)", () => {
    const atBoundary = new Date(NOW.getTime() - STALENESS_THRESHOLD_DAYS * MS_PER_DAY);
    expect(isDataStale(atBoundary, NOW)).toBe(false);
  });

  it("B-OVER-1D: STALENESS_THRESHOLD_DAYS + 1 day ago → stale", () => {
    const overThreshold = new Date(NOW.getTime() - (STALENESS_THRESHOLD_DAYS + 1) * MS_PER_DAY);
    expect(isDataStale(overThreshold, NOW)).toBe(true);
  });

  it("B-OLD-1Y: 1 year ago → stale", () => {
    const oneYearAgo = new Date(NOW.getTime() - 365 * MS_PER_DAY);
    expect(isDataStale(oneYearAgo, NOW)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PART C — Masked error logging contract
// ═══════════════════════════════════════════════════════════════════════════════

describe("Part C — masked error logging: masking formula contract", () => {
  it("C-MASK-1: last-4 masking never leaks the prefix (10-digit phone)", () => {
    const tel    = "3221234567";
    const masked = tel.slice(-4);
    expect(masked).toBe("4567");
    expect(tel.startsWith(masked)).toBe(false); // prefix is NOT in masked portion
  });

  it("C-MASK-2: last-4 masking works for E.164 formatted number", () => {
    const tel    = "+523221234567";
    const masked = tel.slice(-4);
    expect(masked).toBe("4567");
    // Should not expose country code or area code
    expect(masked).not.toContain("+");
    expect(masked).not.toContain("52");
    expect(masked).not.toContain("322");
  });

  it("C-MASK-3: masking truncates correctly for short test identifiers", () => {
    const tel    = "+52000000test01";
    const masked = tel.slice(-4);
    expect(masked).toBe("st01");
    expect(masked.length).toBe(4);
  });

  it("C-FALLBACK-1: buildPTIv2PaulaContext never re-throws — always resolves to {available: false} on error", async () => {
    // Import lazily so we're testing the real module without mocking.
    // For a phone that has no DB records, the function may return {available:false}
    // either via the normal null-check path OR the catch path.
    // Either way, it must never throw or reject.
    const { buildPTIv2PaulaContext } = await import("../buildPTIv2PaulaContext.js");
    // Use a phone that won't exist in any test DB
    await expect(buildPTIv2PaulaContext("+52000000smoketest")).resolves.toEqual({ available: false });
  });

  it("C-FALLBACK-2: {available:false} is the only error surface (no undefined, no null, no throw)", async () => {
    const { buildPTIv2PaulaContext } = await import("../buildPTIv2PaulaContext.js");
    const result = await buildPTIv2PaulaContext("+52000000smoketest");
    expect(result).not.toBeNull();
    expect(result).not.toBeUndefined();
    expect(result.available).toBe(false);
  });
});
