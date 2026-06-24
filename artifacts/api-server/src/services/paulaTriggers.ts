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
import { evaluateReadiness, getPartnerDisplayName } from "./readinessGate.js";

// ── Income bucket labels (voluntary declaration via standalone follow-up) ──────
const INCOME_BUCKET_MSG =
  `💡 *Una pregunta rápida:*\n\n` +
  `¿En qué rango está tu ingreso mensual aproximado?\n\n` +
  `Responde con el número:\n` +
  `*1* — Menos de $3,000\n` +
  `*2* — $3,000–$5,000\n` +
  `*3* — $5,000–$10,000\n` +
  `*4* — $10,000–$20,000\n` +
  `*5* — Más de $20,000\n\n` +
  `_Esta información es voluntaria y nos ayuda a conectarte con mejores opciones financieras._`;

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
  // Readiness gate
  READINESS_APPROACHING: "readiness_approaching",
  READINESS_HARD:        "readiness_hard",
  // Gap report — below APPROACHING threshold, at least one payment
  NOT_YET_GAP_REPORT:    "not_yet_gap_report",
  // Reward nudge — reminds users of unused free bill credits (7-day cooldown)
  FREE_CREDIT_NUDGE:     "free_credit_nudge",
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
  // Suppression gate: never fire proactive triggers for opted-out users
  // Paula still responds to direct inbound messages — this only suppresses
  // outbound trigger-initiated messages
  if (ctx.coaching_responsiveness === 'OPTED_OUT') {
    return 0; // fired count = 0, log nothing
  }

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
    // Income collection follow-up — standalone approach, fires once (NULL guard at send + parse)
    // whatsapp-agent.ts intercepts the numeric reply and writes users.declared_income_bucket
    if (ctx.declared_income_bucket == null) {
      const logRow = await db.execute(sql`
        INSERT INTO paula_trigger_log
          (telefono, trigger_type, trigger_data, message_sent, whatsapp_sent, fired_at)
        VALUES
          (${telefono}, 'income_collection', '{}'::jsonb, ${INCOME_BUCKET_MSG}, FALSE, NOW())
        RETURNING id
      `).catch(() => ({ rows: [{ id: 0 }] }));
      const incLogId = Number((logRow.rows[0] as Record<string,unknown>).id ?? 0);
      await enqueueWhatsApp(db, telefono, INCOME_BUCKET_MSG, "income_collection", incLogId).catch(() => {});
    }
  }

  // Module 3 unlock: PTI 50–64
  // Also check income_bucket here to catch users who skipped Module 2 follow-up
  if (ptiScore >= 50 && ptiScore < 65 && !(await onCooldown(db, telefono, TRIGGER.MODULE_UNLOCK_3, templates))) {
    await fireTrigger(db, telefono, TRIGGER.MODULE_UNLOCK_3, ctx, templates);
    fired++;
    if (ctx.declared_income_bucket == null) {
      const logRow = await db.execute(sql`
        INSERT INTO paula_trigger_log
          (telefono, trigger_type, trigger_data, message_sent, whatsapp_sent, fired_at)
        VALUES
          (${telefono}, 'income_collection', '{}'::jsonb, ${INCOME_BUCKET_MSG}, FALSE, NOW())
        RETURNING id
      `).catch(() => ({ rows: [{ id: 0 }] }));
      const incLogId = Number((logRow.rows[0] as Record<string,unknown>).id ?? 0);
      await enqueueWhatsApp(db, telefono, INCOME_BUCKET_MSG, "income_collection", incLogId).catch(() => {});
    }
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

  // ═══════════════════════════════════════════════════════════════════════════
  // READINESS GATE TRIGGERS
  // Evaluated last — most consequential.
  // evaluateReadiness writes an assessment row every evaluation so the admin
  // dashboard has a full history regardless of whether a trigger fires.
  // ═══════════════════════════════════════════════════════════════════════════
  if (totalPaid >= 1) {
    const readiness = await evaluateReadiness(db, telefono, ctx);

    if (readiness.status === "READY") {
      // Hard gate — fires exactly once per user lifetime (cooldown_days = 9999)
      if (!(await onCooldown(db, telefono, TRIGGER.READINESS_HARD, templates))) {
        const enrichedCtx: UserContext = {
          ...ctx,
          streak_days:          readiness.streakDays,
          bill_diversity:       readiness.billDiversity,
          literacy_score:       ctx.financial_literacy_score,
          partner_display_name: readiness.partnerDisplayName,
        };
        await fireTrigger(db, telefono, TRIGGER.READINESS_HARD, enrichedCtx, templates);
        fired++;

        // Credit READY rewards: 5 free bill payments + $100 MXN wallet credit
        // These are the largest rewards in the system — reserved for file-ready users only.
        // The lender handoff happens on the back end; user only sees "your profile is ready".
        db.execute(sql`
          UPDATE users
          SET free_bill_credits = free_bill_credits + 5
          WHERE telefono = ${telefono}
        `).catch(err => logger.error({ err, telefono }, "[PaulaTriggers] READY free_bill_credits credit failed"));

        db.execute(sql`
          INSERT INTO wallet_transactions (telefono, type, amount_mxn, status, description, created_at)
          VALUES (${telefono}, 'PTI_REWARD', 300, 'confirmed', 'Premio PTI: Perfil Listo', NOW())
        `).catch(err => logger.error({ err, telefono }, "[PaulaTriggers] READY wallet_transactions insert failed"));

        // Update live balance — wallet_transactions alone does not move balance_mxn
        db.execute(sql`
          UPDATE wallets SET balance_mxn = balance_mxn + 300, updated_at = NOW()
          WHERE user_id = ${telefono}
        `).catch(err => logger.error({ err, telefono }, "[PaulaTriggers] READY wallets balance update failed"));

        db.execute(sql`
          UPDATE users SET pti_uncelebrated_milestone = 'ready' WHERE telefono = ${telefono}
        `).catch(err => logger.error({ err, telefono }, "[PaulaTriggers] READY uncelebrated_milestone set failed"));

        // Populate handoff_data JSONB on paula_pending_handoffs for lending partner packet
        // bancarization_days = days from account creation to first SPEI load — most compelling B2B signal
        db.execute(sql`
          UPDATE paula_pending_handoffs SET handoff_data = ${JSON.stringify({
            pti_score:                enrichedCtx.pti_score,
            tier:                     enrichedCtx.tier,
            consecutive_payment_months: streakMonths,
            streak_days:              readiness.streakDays,
            bill_diversity:           readiness.billDiversity,
            financial_literacy_score: enrichedCtx.financial_literacy_score,
            coaching_responsiveness:  enrichedCtx.coaching_responsiveness,
            device_os:                enrichedCtx.device_os ?? null,
            device_type:              enrichedCtx.device_type ?? null,
            device_access_mode:       enrichedCtx.device_access_mode ?? null,
            first_load_method:        enrichedCtx.first_load_method ?? null,
            last_load_method:         enrichedCtx.last_load_method ?? null,
            oxxo_load_count:          enrichedCtx.oxxo_load_count ?? 0,
            spei_load_count:          enrichedCtx.spei_load_count ?? 0,
            card_load_count:          enrichedCtx.card_load_count ?? 0,
            has_bancarized:           enrichedCtx.has_bancarized ?? false,
            bancarization_days:       enrichedCtx.bancarization_days ?? null,
            colonia:                  enrichedCtx.colonia ?? null,
            declared_income_bucket:   enrichedCtx.declared_income_bucket ?? null,
            partner_display_name:     readiness.partnerDisplayName,
            handoff_generated_at:     new Date().toISOString(),
          })}::jsonb
          WHERE telefono = ${telefono}
            AND status = 'pending'
        `).catch(err => logger.error({ err, telefono }, "[PaulaTriggers] handoff_data populate failed"));
      }

    } else if (readiness.status === "APPROACHING") {
      // Soft gate — cooldown 14 days (set in paula_messages seed)
      if (!(await onCooldown(db, telefono, TRIGGER.READINESS_APPROACHING, templates))) {
        const enrichedCtx: UserContext = {
          ...ctx,
          streak_days: readiness.streakDays,
          top_gap:     readiness.topGapLabel,
        };
        await fireTrigger(db, telefono, TRIGGER.READINESS_APPROACHING, enrichedCtx, templates);
        fired++;
      }

    } else {
      // NOT_YET — PTI < 70, largest cohort. 30-day cadence gap report.
      if (!(await onCooldown(db, telefono, TRIGGER.NOT_YET_GAP_REPORT, templates))) {
        const enrichedCtx: UserContext = { ...ctx, streak_days: readiness.streakDays, top_gap: readiness.topGapLabel };
        await fireTrigger(db, telefono, TRIGGER.NOT_YET_GAP_REPORT, enrichedCtx, templates);
        fired++;
      }
    }

    // READINESS_HARD re-ask: user previously declined, 30+ days ago — give them a second chance.
    // Bypasses the 9999-day standard cooldown by checking declined_at directly.
    if (readiness.status === "READY") {
      const declinedRow = await db.execute(sql`
        SELECT declined_at FROM paula_pending_handoffs
        WHERE telefono = ${telefono} AND status = 'declined'
          AND declined_at <= NOW() - INTERVAL '30 days'
        LIMIT 1
      `);
      if (declinedRow.rows.length > 0) {
        // Reset to pending so the re-ask can fire and the SÍ/NO gate works again
        await db.execute(sql`
          UPDATE paula_pending_handoffs
          SET status = 'pending', declined_at = NULL
          WHERE telefono = ${telefono} AND status = 'declined'
        `);
        const enrichedCtx: UserContext = {
          ...ctx,
          streak_days:          readiness.streakDays,
          bill_diversity:       readiness.billDiversity,
          literacy_score:       ctx.financial_literacy_score,
          partner_display_name: readiness.partnerDisplayName,
        };
        await fireTrigger(db, telefono, TRIGGER.READINESS_HARD, enrichedCtx, templates);
        fired++;
      }
    }
  }

  // ── FREE_CREDIT_NUDGE — reminds users of unused credits sitting idle 3+ days ──
  // Condition: credits > 0 AND not used today or in last 3 days AND 7-day message cooldown
  const creditNudgeRow = await db.execute(sql`
    SELECT free_bill_credits, last_free_credit_used_date, pti_uncelebrated_milestone
    FROM users WHERE telefono = ${telefono} LIMIT 1
  `);
  const cnr = creditNudgeRow.rows[0] as Record<string, unknown> | undefined;
  const freeCredits = Number(cnr?.free_bill_credits ?? 0);
  const hasPendingCelebration = cnr?.pti_uncelebrated_milestone != null;
  if (freeCredits > 0 && !hasPendingCelebration) {
    const lastUsed = cnr?.last_free_credit_used_date
      ? new Date(cnr.last_free_credit_used_date as string)
      : null;
    // Returns Infinity when null (new user who has never used a credit) — correctly satisfies >= 3
    const daysSinceUsed = lastUsed
      ? (Date.now() - lastUsed.getTime()) / 86_400_000
      : Infinity;
    if (daysSinceUsed >= 3 && !(await onCooldown(db, telefono, TRIGGER.FREE_CREDIT_NUDGE, templates))) {
      const enrichedCtx: UserContext = { ...ctx, free_bill_credits: freeCredits };
      await fireTrigger(db, telefono, TRIGGER.FREE_CREDIT_NUDGE, enrichedCtx, templates);
      fired++;
    }
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

  // Update coaching responsiveness for all users based on inbound reply patterns
  await updateCoachingResponsiveness(db);
  console.log('[Paula cron] coaching_responsiveness updated');

  logger.info(
    `[PaulaTriggers] Complete: ${users.length} users, ${totalFired} triggers fired, ${errors} errors — ${Date.now() - startedAt}ms`,
  );
}

// ── Coaching responsiveness detection ─────────────────────────────────────────
// Runs at the end of every 6-hour cron batch.
// Priority order is load-bearing — do NOT reorder or combine into a single CASE:
//   1. OPTED_OUT — set on keyword match, never overridden by subsequent steps
//   2. ENGAGED   — reply-within-24h signal, excludes OPTED_OUT users
//   3. PASSIVE   — 3+ sends, zero 24h replies, excludes OPTED_OUT + ENGAGED
type Database = Awaited<ReturnType<typeof import("@workspace/db").default>>;

async function updateCoachingResponsiveness(db: Database): Promise<void> {
  // Step 1: OPTED_OUT — stop keywords, irreversible
  await db.execute(sql`
    UPDATE users
    SET coaching_responsiveness = 'OPTED_OUT'
    WHERE coaching_responsiveness != 'OPTED_OUT'
      AND telefono IN (
        SELECT DISTINCT telefono
        FROM paula_inbound_log
        WHERE LOWER(message_body) IN ('stop', 'baja', 'cancelar', 'no messages')
      )
  `);

  // Step 2: ENGAGED — replied within 24h of any Paula outbound send
  // Excludes OPTED_OUT (already handled above)
  await db.execute(sql`
    UPDATE users
    SET coaching_responsiveness = 'ENGAGED'
    WHERE coaching_responsiveness NOT IN ('OPTED_OUT', 'ENGAGED')
      AND telefono IN (
        SELECT DISTINCT i.telefono
        FROM paula_inbound_log i
        INNER JOIN paula_send_queue q
          ON q.telefono = i.telefono
          AND q.status = 'SENT'
          AND i.received_at BETWEEN q.sent_at AND q.sent_at + INTERVAL '24 hours'
      )
  `);

  // Step 3: PASSIVE — 3+ sends, zero 24h replies
  // Only touches UNKNOWN — OPTED_OUT and ENGAGED already excluded by state
  await db.execute(sql`
    UPDATE users
    SET coaching_responsiveness = 'PASSIVE'
    WHERE coaching_responsiveness = 'UNKNOWN'
      AND telefono IN (
        SELECT telefono FROM paula_send_queue
        WHERE status = 'SENT'
        GROUP BY telefono
        HAVING COUNT(*) >= 3
      )
      AND telefono NOT IN (
        SELECT DISTINCT i.telefono
        FROM paula_inbound_log i
        INNER JOIN paula_send_queue q
          ON q.telefono = i.telefono
          AND q.status = 'SENT'
          AND i.received_at BETWEEN q.sent_at AND q.sent_at + INTERVAL '24 hours'
      )
  `);
}
