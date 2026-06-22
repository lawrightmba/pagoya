/**
 * Paula Message Engine — Sprint 3
 *
 * Responsibilities:
 *   1. Load all active templates from paula_messages once per batch (TemplateCache)
 *   2. Inject {{variable}} tokens at send time (injectVariables)
 *   3. Dead-letter check using per-trigger cooldown_days from the template row
 */

import { sql } from "drizzle-orm";
import { logger } from "../lib/logger.js";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface UserContext {
  nombre: string;
  pti_score: number;
  pti_delta: number;
  pti_trend: string;
  days_streak: number;
  weakest_dimension: string;
  strongest_dimension: string;
  bill_category_count: number;
  tier: string;
  financial_literacy_score: number;   // 0–5, count of fired module_unlock_% triggers
  modules_unlocked: string[];          // ordered: ['module_unlock_1', 'module_unlock_2', ...]
  coaching_responsiveness: string;     // 'ENGAGED' | 'PASSIVE' | 'OPTED_OUT' | 'UNKNOWN'

  // Optional readiness fields — populated at trigger evaluation time only
  // Injected into enrichedCtx for readiness_approaching / readiness_hard templates
  streak_days?:           number;   // calendar days of consecutive payments
  bill_diversity?:        number;   // count of distinct service types paid
  literacy_score?:        number;   // alias for financial_literacy_score in readiness templates
  top_gap?:               string;   // human-readable label for closest-to-met criterion
  partner_display_name?:  string;   // from partner_programs.display_name

  // Optional device + load method fields — populated from users table
  // Used in handoff_data payload for lending partner enrichment
  device_os?:            string;
  device_type?:          string;
  device_access_mode?:   string;
  first_load_method?:    string;
  last_load_method?:     string;
  oxxo_load_count?:      number;
  spei_load_count?:      number;
  card_load_count?:      number;
  has_bancarized?:       boolean;
  bancarization_days?:   number | null;
  colonia?:              string | null;
  declared_income_bucket?: string | null;
}

export interface TemplateRow {
  template_es: string;
  cooldown_days: number;
}

export type TemplateCache = Map<string, TemplateRow>;

// ── Template loader (once per batch) ─────────────────────────────────────────

export async function loadMessageTemplates(
  db: Awaited<ReturnType<typeof import("@workspace/db").default>>,
): Promise<TemplateCache> {
  const rows = await db.execute(sql`
    SELECT trigger_type, template_es, cooldown_days
    FROM paula_messages
    WHERE active = TRUE
  `);

  const cache: TemplateCache = new Map();
  for (const row of rows.rows as Array<Record<string, unknown>>) {
    cache.set(row.trigger_type as string, {
      template_es:   row.template_es   as string,
      cooldown_days: Number(row.cooldown_days),
    });
  }
  logger.info(`[MessageEngine] Loaded ${cache.size} active templates`);
  return cache;
}

// ── Variable injection ────────────────────────────────────────────────────────

export function injectVariables(template: string, ctx: UserContext): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    const value = (ctx as unknown as Record<string, unknown>)[key];
    if (value === undefined) {
      logger.warn(`[Paula] Unresolved template variable: {{${key}}}`);
      return `{{${key}}}`;
    }
    return String(value);
  });
}

// ── Dead-letter check using per-trigger cooldown_days ────────────────────────

export async function isOnCooldownDB(
  db: Awaited<ReturnType<typeof import("@workspace/db").default>>,
  telefono: string,
  triggerType: string,
  cooldownDays: number,
): Promise<boolean> {
  if (cooldownDays >= 9999) {
    const r = await db.execute(sql`
      SELECT 1 FROM paula_trigger_log
      WHERE telefono     = ${telefono}
        AND trigger_type = ${triggerType}
      LIMIT 1
    `);
    return r.rows.length > 0;
  }
  const r = await db.execute(sql`
    SELECT 1 FROM paula_trigger_log
    WHERE telefono     = ${telefono}
      AND trigger_type = ${triggerType}
      AND fired_at     >= NOW() - (${cooldownDays} || ' days')::INTERVAL
    LIMIT 1
  `);
  return r.rows.length > 0;
}
