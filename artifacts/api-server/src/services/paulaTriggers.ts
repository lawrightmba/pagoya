/**
 * Paula Trigger System — Sprint 3
 *
 * Evaluates counseling triggers every 6 hours for all active users.
 *
 * Architecture:
 *   - Templates loaded ONCE per batch from paula_messages (DB) → TemplateCache
 *   - UserContext built ONCE per user → reused across all triggers for that user
 *   - Dead-letter cooldown uses per-trigger cooldown_days from DB (not hardcoded)
 *   - Messages are enqueued to paula_send_queue (not sent inline)
 *
 * Trigger categories:
 *   Achievement  — positive momentum milestones
 *   Recovery     — negative momentum / re-engagement
 *   Educational  — PTI-gated financial literacy modules
 */

import { sql } from "drizzle-orm";
import { logger } from "../lib/logger.js";
import {
  loadMessageTemplates,
  injectVariables,
  isOnCooldownDB,
  type TemplateCache,
  type UserContext,
} from "./messageEngine.js";
import { buildUserContext } from "./buildUserContext.js";
import { enqueueWhatsApp } from "./paulaSendQueue.js";

// ── Trigger type registry ──────────────────────────────────────────────────────
export const TRIGGER = {
  // Achievement
  FIRST_PAYMENT:    "first_payment",
  STREAK_5:         "streak_5",
  PTI_CROSS_40:     "pti_cross_40",
  PTI_CROSS_60:     "pti_cross_60",
  PTI_CROSS_80:     "pti_cross_80",
  MILESTONE_90D:    "milestone_90d",
  // Recovery
  LATE_PAYMENT_1:   "late_payment_1",
  PTI_DROP_7D:      "pti_drop_7d",
  STALLED_14D:      "stalled_14d",
  PATTERN_LATE_2X:  "pattern_late_2x",
  // Educational (PTI-gated literacy modules)
  MODULE_UNLOCK_1:  "module_unlock_1",
  MODULE_UNLOCK_2:  "module_unlock_2",
  MODULE_UNLOCK_3:  "module_unlock_3",
  MODULE_UNLOCK_4:  "module_unlock_4",
  MODULE_UNLOCK_5:  "module_unlock_5",
} as const;

type TriggerType = (typeof TRIGGER)[keyof typeof TRIGGER];

// ── Cooldown check (uses per-trigger cooldown_days from DB row) ───────────────
async function onCooldown(
  db: Awaited<ReturnType<typeof import("@workspace/db").default>>,
  telefono: string,
  triggerType: TriggerType,
  templates: TemplateCache,
): Promise<boolean> {
  const tmpl = templates.get(triggerType);
  const cooldownDays = tmpl?.cooldown_days ?? 7;
  return isOnCooldownDB(db, telefono, triggerType, cooldownDays);
}

// ── Fire a trigger: log + enqueue (never sends inline) ───────────────────────
async function fireTrigger(
  db: Awaited<ReturnType<typeof import("@workspace/db").default>>,
  telefono: string,
  triggerType: TriggerType,
  ctx: UserContext,
  templates: TemplateCache,
): Promise<void> {
  const tmpl = templates.get(triggerType);
  if (!tmpl) {
    logger.warn(`[PaulaTriggers] No template found for trigger: ${triggerType} — skipping`);
    return;
  }

  const message = injectVariables(tmpl.template_es, ctx);

  // Persist trigger log first (audit trail independent of delivery)
  const insertResult = await db.execute(sql`
    INSERT INTO paula_trigger_log
      (telefono, trigger_type, trigger_data, message_sent, whatsapp_sent, fired_at)
    VALUES
      (${telefono}, ${triggerType}, ${JSON.stringify(ctx)}::jsonb, ${message}, FALSE, NOW())
    RETURNING id
  `);
  const logId = Number((insertResult.rows[0] as Record<string, unknown>).id);

  // Enqueue for delivery — processor handles retries and status updates
  const queueId = await enqueueWhatsApp(db, telefono, message, triggerType, logId);

  // Link send_queue_id back for cross-table traceability
  await db.execute(sql`
    UPDATE paula_trigger_log SET send_queue_id = ${queueId} WHERE id = ${logId}
  `).catch(() => {});
}

// ── Evaluate all triggers for one user ────────────────────────────────────────
// ctx and templates are pre-built — this function does no context fetching
export async function evaluateTriggersForUser(
  db: Awaited<ReturnType<typeof import("@workspace/db").default>>,
  telefono: string,
  ctx: UserContext,
  templates: TemplateCache,
): Promise<number> {
  let fired = 0;

  // ── Payment condition data (trigger logic only — not used in messages) ────
  const userRow = await db.execute(sql`
    SELECT consecutive_payment_months FROM users WHERE telefono = ${telefono} LIMIT 1
  `);
  if (!userRow.rows.length) return 0;
  const u            = userRow.rows[0] as Record<string, unknown>;
  const streakMonths = Number(u.consecutive_payment_months ?? 0);

  const payRow = await db.execute(sql`
    SELECT
      COUNT(*) FILTER (WHERE status IN ('completed','success','completed_ok','confirmed')) AS total_paid,
      COUNT(*) FILTER (WHERE status IN ('failed','late'))                                 AS total_late,
      COUNT(*) FILTER (WHERE status IN ('failed','late')
                        AND created_at >= NOW() - INTERVAL '30 days')                    AS late_30d,
      MAX(created_at) FILTER (WHERE status IN ('completed','success','completed_ok','confirmed'))
                                                                                          AS last_payment_at
    FROM bill_payments WHERE telefono = ${telefono}
  `);
  const p               = payRow.rows[0] as Record<string, unknown>;
  const totalPaid       = Number(p.total_paid ?? 0);
  const totalLate       = Number(p.total_late ?? 0);
  const late30d         = Number(p.late_30d ?? 0);
  const lastPaymentAt   = p.last_payment_at ? new Date(p.last_payment_at as string) : null;
  const daysSincePay    = lastPaymentAt
    ? (Date.now() - lastPaymentAt.getTime()) / 86_400_000
    : Infinity;

  const ptiScore = ctx.pti_score;
  const ptiDelta = ctx.pti_delta;

  // PTI history helpers (threshold crossing guards)
  async function hadScoreBelow(threshold: number): Promise<boolean> {
    const r = await db.execute(sql`
      SELECT 1 FROM pti_score_history
      WHERE telefono = ${telefono} AND pti_score < ${threshold} LIMIT 1
    `);
    return r.rows.length > 0;
  }
  async function crossedThresholdRecently(threshold: number): Promise<boolean> {
    const r = await db.execute(sql`
      SELECT 1 FROM pti_score_history
      WHERE telefono  = ${telefono}
        AND pti_score >= ${threshold}
        AND recorded_at >= NOW() - INTERVAL '30 days'
      LIMIT 1
    `);
    return r.rows.length > 0;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ACHIEVEMENT TRIGGERS
  // ═══════════════════════════════════════════════════════════════════════════

  // T1 — First on-time payment
  if (totalPaid === 1 && !(await onCooldown(db, telefono, TRIGGER.FIRST_PAYMENT, templates))) {
    await fireTrigger(db, telefono, TRIGGER.FIRST_PAYMENT, ctx, templates);
    fired++;
  }

  // T1b — 5-payment streak (fires week 2-3, before any PTI threshold is crossed)
  if (
    totalPaid >= 5 && totalPaid <= 9 && totalLate === 0 &&
    !(await onCooldown(db, telefono, TRIGGER.STREAK_5, templates))
  ) {
    await fireTrigger(db, telefono, TRIGGER.STREAK_5, ctx, templates);
    fired++;
  }

  // T2 — PTI crosses 40 (Bronce floor)
  if (
    ptiScore >= 40 && ptiScore < 60 &&
    !(await onCooldown(db, telefono, TRIGGER.PTI_CROSS_40, templates)) &&
    await hadScoreBelow(40) &&
    await crossedThresholdRecently(40)
  ) {
    await fireTrigger(db, telefono, TRIGGER.PTI_CROSS_40, ctx, templates);
    fired++;
  }

  // T3 — PTI crosses 60 (coaching moment between Plata entry and approach)
  if (
    ptiScore >= 60 && ptiScore < 80 &&
    !(await onCooldown(db, telefono, TRIGGER.PTI_CROSS_60, templates)) &&
    await hadScoreBelow(60) &&
    await crossedThresholdRecently(60)
  ) {
    await fireTrigger(db, telefono, TRIGGER.PTI_CROSS_60, ctx, templates);
    fired++;
  }

  // T4 — PTI crosses 80 (Oro / Excelente)
  if (
    ptiScore >= 80 &&
    !(await onCooldown(db, telefono, TRIGGER.PTI_CROSS_80, templates)) &&
    await hadScoreBelow(80) &&
    await crossedThresholdRecently(80)
  ) {
    await fireTrigger(db, telefono, TRIGGER.PTI_CROSS_80, ctx, templates);
    fired++;
  }

  // T5 — 90-day consistency milestone
  if (streakMonths >= 3 && !(await onCooldown(db, telefono, TRIGGER.MILESTONE_90D, templates))) {
    await fireTrigger(db, telefono, TRIGGER.MILESTONE_90D, ctx, templates);
    fired++;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RECOVERY TRIGGERS
  // ═══════════════════════════════════════════════════════════════════════════

  // T6a — First ever late payment (most critical recovery moment)
  if (totalLate === 1 && !(await onCooldown(db, telefono, TRIGGER.LATE_PAYMENT_1, templates))) {
    await fireTrigger(db, telefono, TRIGGER.LATE_PAYMENT_1, ctx, templates);
    fired++;
  }

  // T6 — PTI dropped ≥5 pts (uses 30d delta from pti_trend_30d via ctx)
  if (ptiDelta <= -5 && !(await onCooldown(db, telefono, TRIGGER.PTI_DROP_7D, templates))) {
    await fireTrigger(db, telefono, TRIGGER.PTI_DROP_7D, ctx, templates);
    fired++;
  }

  // T7 — No payment activity in 14+ days
  if (daysSincePay >= 14 && !(await onCooldown(db, telefono, TRIGGER.STALLED_14D, templates))) {
    await fireTrigger(db, telefono, TRIGGER.STALLED_14D, ctx, templates);
    fired++;
  }

  // T8 — 2 late payments in 30 days (pattern)
  if (late30d >= 2 && !(await onCooldown(db, telefono, TRIGGER.PATTERN_LATE_2X, templates))) {
    await fireTrigger(db, telefono, TRIGGER.PATTERN_LATE_2X, ctx, templates);
    fired++;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EDUCATIONAL TRIGGERS (PTI milestone-gated)
  // ═══════════════════════════════════════════════════════════════════════════

  // Module 1 unlock: PTI < 30, fires after first payment
  // "Welcome to your credit journey" — frames everything that follows
  // cooldown_days = 9999, fires exactly once per user lifetime
  if (
    totalPaid >= 1 &&
    ptiScore < 30 &&
    !(await onCooldown(db, telefono, TRIGGER.MODULE_UNLOCK_1, templates))
  ) {
    await fireTrigger(db, telefono, TRIGGER.MODULE_UNLOCK_1, ctx, templates);
    fired++;
  }

  // Module 2 unlock: PTI 30–49
  if (ptiScore >= 30 && ptiScore < 50 && !(await onCooldown(db, telefono, TRIGGER.MODULE_UNLOCK_2, templates))) {
    await fireTrigger(db, telefono, TRIGGER.MODULE_UNLOCK_2, ctx, templates);
    fired++;
  }

  // Module 3 unlock: PTI 50–64
  if (ptiScore >= 50 && ptiScore < 65 && !(await onCooldown(db, telefono, TRIGGER.MODULE_UNLOCK_3, templates))) {
    await fireTrigger(db, telefono, TRIGGER.MODULE_UNLOCK_3, ctx, templates);
    fired++;
  }

  // Module 4 unlock: PTI 65–79
  if (ptiScore >= 65 && ptiScore < 80 && !(await onCooldown(db, telefono, TRIGGER.MODULE_UNLOCK_4, templates))) {
    await fireTrigger(db, telefono, TRIGGER.MODULE_UNLOCK_4, ctx, templates);
    fired++;
  }

  // Module 5 unlock: PTI 80+
  if (ptiScore >= 80 && !(await onCooldown(db, telefono, TRIGGER.MODULE_UNLOCK_5, templates))) {
    await fireTrigger(db, telefono, TRIGGER.MODULE_UNLOCK_5, ctx, templates);
    fired++;
  }

  return fired;
}

// ── Batch evaluation for all active users ─────────────────────────────────────
export async function runPaulaTriggerBatch(): Promise<void> {
  const { db } = await import("@workspace/db");
  const startedAt = Date.now();
  logger.info("[PaulaTriggers] Starting trigger evaluation batch...");

  // Load templates ONCE for the entire batch
  const templates = await loadMessageTemplates(db);
  if (templates.size === 0) {
    logger.warn("[PaulaTriggers] No active templates found — aborting batch");
    return;
  }

  const usersRow = await db.execute(sql`
    SELECT u.telefono
    FROM users u
    WHERE u.telefono IS NOT NULL AND u.telefono != ''
      AND u.is_test_account IS NOT TRUE
      AND (
        u.pti_score IS NOT NULL
        OR EXISTS (
          SELECT 1 FROM bill_payments bp
          WHERE bp.telefono = u.telefono
            AND bp.status IN ('completed','success','completed_ok','confirmed')
        )
      )
    LIMIT 2000
  `);

  const users = usersRow.rows as Array<{ telefono: string }>;
  let totalFired = 0;
  let errors     = 0;

  for (const user of users) {
    try {
      // Build context ONCE per user — reused across all trigger evaluations
      const ctx = await buildUserContext(db, user.telefono);
      const fired = await evaluateTriggersForUser(db, user.telefono, ctx, templates);
      totalFired += fired;
    } catch (err) {
      logger.error({ err, telefono: user.telefono }, "[PaulaTriggers] evaluation failed for user");
      errors++;
    }
    // 20ms between users to avoid DB hammering
    await new Promise((r) => setTimeout(r, 20));
  }

  logger.info(
    `[PaulaTriggers] Complete: ${users.length} users, ${totalFired} triggers fired, ${errors} errors — ${Date.now() - startedAt}ms`,
  );
}
