/**
 * buildPTIv2PaulaContext — Sprint 9 / Part B
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Read-only service: fetches shadow behavioral profile, Evidence Depth, and
 * Expected Obligations for one user and pre-computes a structured coaching
 * context for Paula's system prompt.
 *
 * HARD CONSTRAINTS — must hold in every code path:
 *   ✗ Never writes to any table. No INSERT, UPDATE, or DELETE anywhere.
 *   ✗ Never imports from ptiV5.ts or invokes any score-compute function.
 *   ✗ Only imported from agentChat.ts. No other caller.
 *   ✗ On any error → { available: false }. Paula falls back gracefully.
 *   ✗ EO UNRESOLVED framing: neutral language only.
 *     Words missed, late, failed, delinquent MUST NOT appear in any framing.
 *   ✗ Trajectory framing: observed-direction language only.
 *     No risk, default probability, creditworthy, or predictive language.
 *   ✗ No raw scores, weights, thresholds, or internal feature names in output.
 */

import type { ShadowDimensionResult } from "./ptiV2Shadow.js";
import type { EvidenceBand, ExpectedObligationsResult } from "./ptiV2.js";

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1 — EXPORTED TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Five coaching stances — computed deterministically from shadow dimension
 * normalized_score and Evidence Depth band.
 * No LLM involved in stance assignment.
 */
export type CoachingStance =
  | "confident_reinforce"   // strong dimension + HIGH evidence
  | "acknowledge_and_build" // strong dimension + LOW/MODERATE evidence
  | "coach_directly"        // weak dimension  + HIGH evidence
  | "encourage_habits"      // weak dimension  + LOW/MODERATE evidence
  | "continue_modules";     // INSUFFICIENT_DATA on either dimension or ED

export interface DimensionCoachingFrame {
  stance:              CoachingStance;
  /**
   * Plain observed-pattern description. No raw numbers from the scoring system.
   * Describes what has been observed, not what it implies about creditworthiness.
   */
  descriptive_framing: string;
  /**
   * Observed-direction language only. Empty string when trajectory is unavailable.
   * NEVER contains: riesgo, incumplimiento, probabilidad, impago, crediticio,
   *   delinquent, missed, late, failed, atrasado, perdiste, incumpliste.
   */
  trajectory_framing:  string;
}

export interface PTIv2PaulaContext {
  available:            true;
  aggregate_status:     "COMPUTED" | "INSUFFICIENT_DATA";
  payment_reliability:  DimensionCoachingFrame;
  cash_flow_resilience: DimensionCoachingFrame;
  behavioral_stability: DimensionCoachingFrame;
  /** Plain neutral EO summary. No negative framing for UNRESOLVED or STALE. */
  expected_obligations: string;
}

export type PTIv2PaulaContextResult =
  | PTIv2PaulaContext
  | { available: false };

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2 — TRAJECTORY FRAMING STRINGS (observed-direction only)
//
// All strings describe observed behavioral direction.
// No prediction, no risk inference, no default probability.
// ═══════════════════════════════════════════════════════════════════════════════

const TRAJ_FRAMING: Record<string, Record<string, string>> = {
  payment_reliability: {
    IMPROVING:          "este aspecto de su comportamiento observado ha mostrado mayor consistencia en el período reciente",
    STABLE:             "este aspecto de su comportamiento observado ha sido consistente a lo largo del período observado",
    DETERIORATING:      "el patrón reciente en este aspecto ha sido menos consistente que el período anterior observado",
    INSUFFICIENT_DATA:  "no hay suficiente historial todavía para describir una dirección en este aspecto",
  },
  cash_flow_resilience: {
    IMPROVING:          "este aspecto de su comportamiento observado ha mostrado mayor consistencia en el período reciente",
    STABLE:             "este aspecto de su comportamiento observado ha sido consistente a lo largo del período observado",
    DETERIORATING:      "el patrón reciente en este aspecto ha sido menos consistente que el período anterior observado",
    INSUFFICIENT_DATA:  "no hay suficiente historial todavía para describir una dirección en este aspecto",
  },
  behavioral_stability: {
    IMPROVING:          "este aspecto de su comportamiento observado ha mostrado mayor consistencia en el período reciente",
    STABLE:             "este aspecto de su comportamiento observado ha sido consistente a lo largo del período observado",
    DETERIORATING:      "el patrón reciente en este aspecto ha sido menos consistente que el período anterior observado",
    INSUFFICIENT_DATA:  "no hay suficiente historial todavía para describir una dirección en este aspecto",
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3 — STANCE EXAMPLE PHRASINGS (for prompt injection)
// ═══════════════════════════════════════════════════════════════════════════════

const STANCE_PHRASINGS: Record<CoachingStance, string> = {
  confident_reinforce:
    "Reconoce el patrón positivo de forma natural. Ejemplo: " +
    "\"Lo que haces bien — pagar de forma constante — es exactamente lo que fortalece tu historial financiero.\" " +
    "O bien: \"Con la consistencia que muestras, cada pago refuerza el patrón que ya tienes.\"",

  acknowledge_and_build:
    "Reconoce lo positivo y contextualiza que el historial se está construyendo. Ejemplo: " +
    "\"Estás construyendo un patrón sólido. Cada pago suma a tu historial.\" " +
    "O bien: \"El camino que llevas es exactamente el que fortalece un historial financiero real.\"",

  coach_directly:
    "Ofrece orientación práctica sobre los hábitos específicos que construyen consistencia. Ejemplo: " +
    "\"La consistencia en el momento y monto de los pagos es lo que más importa para tu historial.\" " +
    "O bien: \"Pagar en la misma ventana cada mes es el hábito más valioso que puedes establecer.\"",

  encourage_habits:
    "Enfócate en el primer paso concreto. Ejemplo: " +
    "\"El hábito más importante es hacer tu primer pago antes de que llegue el aviso.\" " +
    "O bien: \"Cada pago que haces es un ladrillo en tu historial financiero.\"",

  continue_modules:
    "Continúa con los módulos de educación financiera. " +
    "Aún no hay suficiente historial observado para personalizar la orientación de este aspecto.",
};

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4 — PURE HELPER FUNCTIONS (exported for unit testing)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Deterministic stance computation from one shadow dimension + Evidence Depth band.
 * Pure function — no DB, no LLM, no randomness.
 */
export function computeStanceFromDimAndEd(
  dim: ShadowDimensionResult,
  edBand: EvidenceBand,
): CoachingStance {
  if (dim.status === "INSUFFICIENT_DATA" || edBand === "INSUFFICIENT_DATA") {
    return "continue_modules";
  }
  const score = dim.normalized_score ?? 0;
  if (score >= 60) {
    return edBand === "HIGH" ? "confident_reinforce" : "acknowledge_and_build";
  }
  return edBand === "HIGH" ? "coach_directly" : "encourage_habits";
}

/**
 * Descriptive framing for one shadow dimension (no raw numbers, no predictions).
 * Pure function — exportable for unit testing.
 */
export function buildDescriptiveFraming(
  dimKey: string,
  dim: ShadowDimensionResult,
): string {
  if (dim.status === "INSUFFICIENT_DATA") {
    return "Aún no hay suficiente historial observado para este aspecto.";
  }
  const score = dim.normalized_score ?? 0;

  if (dimKey === "payment_reliability") {
    if (score >= 75) return "Los pagos de servicios han mostrado un patrón muy consistente, puntual y frecuente.";
    if (score >= 50) return "Los pagos de servicios muestran un patrón en construcción, con señales de regularidad.";
    return "El patrón de pagos de servicios está en una etapa temprana de desarrollo.";
  }

  if (dimKey === "cash_flow_resilience") {
    if (score >= 75) return "El flujo de fondos muestra un balance positivo y un margen de reserva saludable.";
    if (score >= 50) return "El flujo de fondos muestra entradas y salidas que se están equilibrando.";
    return "El flujo de fondos muestra un margen ajustado entre entradas y salidas recientes.";
  }

  // behavioral_stability
  if (score >= 75) return "Los hábitos financieros muestran una rutina estable y predecible a lo largo del tiempo.";
  if (score >= 50) return "Los hábitos financieros muestran cierta regularidad en construcción.";
  return "Los hábitos financieros están en una etapa temprana de establecimiento de rutina.";
}

/**
 * Trajectory framing from observed direction string.
 * Returns empty string when trajectory is unavailable.
 * Pure function — exportable for unit testing.
 */
export function buildTrajectoryFramingStr(
  dimKey: string,
  direction: string | null | undefined,
): string {
  if (!direction || direction === "INSUFFICIENT_DATA") return "";
  const upper = direction.toUpperCase();
  return TRAJ_FRAMING[dimKey]?.[upper] ?? "";
}

/**
 * Plain-text EO summary. UNRESOLVED and STALE produce neutral language only.
 * Words missed, late, failed, delinquent, atrasado are prohibited in all branches.
 * Pure function — exportable for unit testing.
 */
export function buildEOSummaryStr(eo: ExpectedObligationsResult): string {
  if (!eo.obligations || eo.obligations.length === 0) {
    return "No se han identificado servicios con un patrón recurrente establecido aún.";
  }

  const lines: string[] = [];
  for (const ob of eo.obligations) {
    const name = ob.service_name;
    switch (ob.lifecycle_status) {
      case "OBSERVED_FULFILLED":
      case "EXPECTED":
        lines.push(`${name}: servicio con patrón de pago regular identificado.`);
        break;
      case "DUE_WINDOW":
        lines.push(`${name}: servicio con patrón de pago regular; el pago de este ciclo está dentro de la ventana habitual.`);
        break;
      case "STALE":
        // NEUTRAL: pattern no longer active — no negative language
        lines.push(`${name}: servicio con historial previo de pagos regulares; el patrón reciente no ha mostrado actividad.`);
        break;
      case "UNRESOLVED":
        // NEUTRAL: "no se ha observado un pago en la ventana habitual" — exact spec language
        lines.push(`${name}: servicio con patrón identificado; no se ha observado un pago en la ventana habitual para este servicio.`);
        break;
      default:
        lines.push(`${name}: servicio con patrón registrado.`);
    }
  }
  return lines.join(" | ");
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 5 — PROMPT SECTION RENDERER (pure, no DB)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Renders the PTI V2 COACHING CONTEXT block for inclusion in the system prompt.
 * Returns empty string when context is unavailable — Paula sees no change.
 *
 * The block is delimited so prompt readers can locate it.
 * Contains NO raw scores, weights, thresholds, or internal feature names.
 * Pure function — no DB, no LLM.
 */
export function renderPTIv2PromptSection(ctx: PTIv2PaulaContextResult): string {
  if (!ctx.available) return "";

  function dimBlock(
    label: string,
    frame: DimensionCoachingFrame,
  ): string {
    const trajLine = frame.trajectory_framing
      ? `\n  Dirección reciente: ${frame.trajectory_framing}.`
      : "";
    return (
      `${label}:\n` +
      `  Observación: ${frame.descriptive_framing}${trajLine}\n` +
      `  Enfoque sugerido: ${STANCE_PHRASINGS[frame.stance]}`
    );
  }

  return `\n\n--- PTI V2 COACHING CONTEXT (investigación interna — no citar nombres técnicos) ---
Este contexto proviene de patrones de comportamiento financiero observados.
Úsalo ÚNICAMENTE para personalizar el tono y los ejemplos que ofreces. Nunca lo menciones directamente ni cites sus etiquetas.

${dimBlock("PAGO DE SERVICIOS", ctx.payment_reliability)}

${dimBlock("FLUJO DE FONDOS", ctx.cash_flow_resilience)}

${dimBlock("RUTINA FINANCIERA", ctx.behavioral_stability)}

SERVICIOS RECURRENTES IDENTIFICADOS:
  ${ctx.expected_obligations}

PROHIBICIONES ABSOLUTAS — este contexto no debe generar:
  - Menciones de puntajes, porcentajes, pesos, rangos, ni thresholds: "aumenta tu PTI", "necesitas más puntos", "tu puntaje es X".
  - Interpretaciones predictivas: "eres bajo riesgo", "es probable que pagues / no pagues", "calificas para crédito".
  - Nombres de dimensiones técnicas: PTI, shadow, PR, CFR, BS, Evidence Depth.
  - Lenguaje negativo sobre los servicios listados: nunca impliquen atraso, incumplimiento, ni deuda.
  - Las palabras "incumpliste", "fallaste", "atrasado", "deuda" están prohibidas en respuesta a este contexto.
--- FIN PTI V2 COACHING CONTEXT ---`.trimStart();
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 6 — ASYNC DB ADAPTER (read-only)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Builds Paula's PTI v2 coaching context for one user.
 *
 * Calls:
 *   1. buildShadowBehavioralProfile(telefono) — read-only shadow profile
 *   2. buildPTIv2Profile(telefono)            — read-only, provides evidence_depth.band + trajectory
 *   3. buildExpectedObligations(telefono)     — read-only EO
 *
 * All three are read-only adapters. No writes anywhere in any call chain.
 * On any error → { available: false }. Paula's existing behavior is unaffected.
 *
 * NEVER CALL FROM ANYWHERE EXCEPT agentChat.ts.
 */
export async function buildPTIv2PaulaContext(
  telefono: string,
): Promise<PTIv2PaulaContextResult> {
  try {
    const [{ buildShadowBehavioralProfile }, { buildPTIv2Profile }, { buildExpectedObligations }] =
      await Promise.all([
        import("./ptiV2Shadow.js"),
        import("./ptiV2.js"),
        import("./ptiV2.js"),
      ]);

    const [shadow, profile, eo] = await Promise.all([
      buildShadowBehavioralProfile(telefono),
      buildPTIv2Profile(telefono),
      buildExpectedObligations(telefono),
    ]);

    // Explicit null guard: buildPTIv2Profile returns PTIv2Profile | null
    if (profile === null) {
      return { available: false };
    }

    // Require at least 2 computable shadow dimensions
    if (shadow.aggregate.status === "INSUFFICIENT_DATA") {
      return { available: false };
    }

    const edBand = profile.evidence_depth.band;

    // Per-dimension trajectory direction from recent window
    function recentDir(
      key: "payment_reliability" | "cash_flow_resilience" | "behavioral_stability",
    ): string | null {
      const dimResult = profile.trajectory.dimensions[key];
      const recent = dimResult?.recent;
      if (!recent || recent.status !== "COMPUTED") return null;
      return recent.direction ?? null;
    }

    const prDir  = recentDir("payment_reliability");
    const cfrDir = recentDir("cash_flow_resilience");
    const bsDir  = recentDir("behavioral_stability");

    const prDim  = shadow.dimensions.payment_reliability;
    const cfrDim = shadow.dimensions.cash_flow_resilience;
    const bsDim  = shadow.dimensions.behavioral_stability;

    return {
      available:       true,
      aggregate_status: shadow.aggregate.status,

      payment_reliability: {
        stance:              computeStanceFromDimAndEd(prDim, edBand),
        descriptive_framing: buildDescriptiveFraming("payment_reliability", prDim),
        trajectory_framing:  buildTrajectoryFramingStr("payment_reliability", prDir),
      },

      cash_flow_resilience: {
        stance:              computeStanceFromDimAndEd(cfrDim, edBand),
        descriptive_framing: buildDescriptiveFraming("cash_flow_resilience", cfrDim),
        trajectory_framing:  buildTrajectoryFramingStr("cash_flow_resilience", cfrDir),
      },

      behavioral_stability: {
        stance:              computeStanceFromDimAndEd(bsDim, edBand),
        descriptive_framing: buildDescriptiveFraming("behavioral_stability", bsDim),
        trajectory_framing:  buildTrajectoryFramingStr("behavioral_stability", bsDir),
      },

      expected_obligations: buildEOSummaryStr(eo),
    };
  } catch {
    return { available: false };
  }
}
