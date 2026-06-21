/**
 * buildUserContext — Sprint 3 + Sprint 4
 *
 * Assembles the full UserContext for a given telefono.
 * Called ONCE per user per cron batch — result is reused across all triggers
 * that fire for that user in the same run.
 *
 * Sprint 4 additions:
 *   - financial_literacy_score: COUNT of fired module_unlock_% triggers
 *   - modules_unlocked: ordered list of fired module triggers
 *   - coaching_responsiveness: from users.coaching_responsiveness
 */

import { sql } from "drizzle-orm";
import type { UserContext } from "./messageEngine.js";

// ── Dimension name → human-readable Buró language ────────────────────────────
const DIMENSION_LABELS: Record<string, string> = {
  payment_reliability:    "Historial de pagos",
  behavioral_consistency: "Consistencia de comportamiento",
  engagement_depth:       "Variedad de servicios",
  cashflow_stability:     "Estabilidad de flujo",
};

function labelDimension(key: string): string {
  return DIMENSION_LABELS[key] ?? key;
}

// ── PTI score → tier label ────────────────────────────────────────────────────
function scoreTier(score: number): string {
  if (score >= 80) return "ORO";
  if (score >= 60) return "PLATA";
  if (score >= 40) return "BRONCE";
  return "INICIO";
}

// ── Build context ─────────────────────────────────────────────────────────────
export async function buildUserContext(
  db: Awaited<ReturnType<typeof import("@workspace/db").default>>,
  telefono: string,
): Promise<UserContext> {
  // ── Query 1: user + PTI trend + payment aggregates ───────────────────────
  const row = await db.execute(sql`
    SELECT
      COALESCE(
        SPLIT_PART(NULLIF(TRIM(u.kyc_full_name), ''), ' ', 1),
        'amig@'
      )                                           AS nombre,
      COALESCE(u.pti_score, 0)                    AS pti_score,
      COALESCE(t.delta_30d, 0)                    AS pti_delta,
      COALESCE(t.trend_label, 'NEUTRAL')          AS pti_trend,

      -- days_streak: days since user's first completed payment
      COALESCE(
        EXTRACT(DAY FROM NOW() - MIN(bp.created_at)
          FILTER (WHERE bp.status IN ('completed','success','completed_ok','confirmed')))::INT,
        0
      )                                           AS days_streak,

      -- PTI dimension breakdown (stored as jsonb in users)
      u.pti_breakdown,

      -- Distinct bill categories paid
      COUNT(DISTINCT bp.service_type)
        FILTER (WHERE bp.status IN ('completed','success','completed_ok','confirmed'))
                                                  AS bill_category_count,

      -- Sprint 4: coaching responsiveness
      COALESCE(u.coaching_responsiveness, 'UNKNOWN') AS coaching_responsiveness

    FROM users u
    LEFT JOIN pti_trend_30d t
      ON t.telefono = u.telefono
    LEFT JOIN bill_payments bp
      ON bp.telefono = u.telefono
    WHERE u.telefono = ${telefono}
    GROUP BY u.kyc_full_name, u.pti_score, t.delta_30d, t.trend_label, u.pti_breakdown, u.coaching_responsiveness
    LIMIT 1
  `);

  if (!row.rows.length) {
    throw new Error(`buildUserContext: user not found — ${telefono}`);
  }

  const r = row.rows[0] as Record<string, unknown>;

  // ── Dimension strengths / weaknesses from pti_breakdown JSONB ───────────
  const breakdown = (r.pti_breakdown as Record<string, number> | null) ?? {};
  const dimEntries = Object.entries(breakdown).sort((a, b) => b[1] - a[1]);
  const strongest  = dimEntries[0]?.[0] ?? "payment_reliability";
  const weakest    = dimEntries[dimEntries.length - 1]?.[0] ?? "cashflow_stability";

  const ptiScore = Number(r.pti_score ?? 0);

  // ── Query 2: financial_literacy_score (Sprint 4) ─────────────────────────
  const literacyCountResult = await db.execute(sql`
    SELECT COUNT(*) AS literacy_score
    FROM paula_trigger_log
    WHERE telefono = ${telefono}
      AND trigger_type LIKE 'module_unlock_%'
  `);
  const financial_literacy_score = Number(
    (literacyCountResult.rows[0] as Record<string, unknown>)?.literacy_score ?? 0,
  );

  // ── Query 3: modules_unlocked ordered list (Sprint 4) ───────────────────
  const modulesResult = await db.execute(sql`
    SELECT trigger_type
    FROM paula_trigger_log
    WHERE telefono = ${telefono}
      AND trigger_type LIKE 'module_unlock_%'
    ORDER BY fired_at ASC
  `);
  const modules_unlocked: string[] = (
    modulesResult.rows as Array<{ trigger_type: string }>
  ).map(row => row.trigger_type);

  return {
    nombre:                  String(r.nombre ?? "amig@"),
    pti_score:               ptiScore,
    pti_delta:               Number(r.pti_delta ?? 0),
    pti_trend:               String(r.pti_trend ?? "NEUTRAL"),
    days_streak:             Number(r.days_streak ?? 0),
    weakest_dimension:       labelDimension(weakest),
    strongest_dimension:     labelDimension(strongest),
    bill_category_count:     Number(r.bill_category_count ?? 0),
    tier:                    scoreTier(ptiScore),
    // Sprint 4
    financial_literacy_score,
    modules_unlocked,
    coaching_responsiveness: String(r.coaching_responsiveness ?? "UNKNOWN"),
  };
}
