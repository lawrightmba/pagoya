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
