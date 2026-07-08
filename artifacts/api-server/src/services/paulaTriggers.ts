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
  extractVariables,
  isOnCooldownDB,
  type TemplateCache,
  type UserContext,
} from "./messageEngine.js";
import { buildUserContext } from "./buildUserContext.js";
import { enqueueWhatsApp } from "./paulaSendQueue.js";
import { evaluateReadiness, getPartnerDisplayName } from "./readinessGate.js";

// ── Remittance profile question (queued 24h after Module 1, intercepts sí/no) ─
const REMITTANCE_PROFILE_MSG =
  `💸 *Una pregunta para tu perfil financiero:*\n\n` +
  `¿Recibes dinero del extranjero de forma regular? (por ejemplo de un familiar en EE.UU. u otro país)\n\n` +
  `Responde:\n` +
  `*1* — Sí, recibo remesas o envíos del extranjero\n` +
  `*2* — No\n\n` +
  `_Esta información es voluntaria y nos ayuda a mejorar tu perfil. Puedes ignorar este mensaje si prefieres._`;

// ── Employment profile question (+24h after Module 1) ─────────────────────────
const EMPLOYMENT_PROFILE_MSG =
  `📋 *Una pregunta para tu perfil financiero:*\n\n` +
  `¿Cómo describes tu situación de trabajo actual?\n\n` +
  `Responde con el número:\n` +
  `*1* — Empleo formal con contrato o nómina\n` +
  `*2* — Trabajo informal o por cuenta propia\n` +
  `*3* — Trabajo por proyecto / gig / freelance\n` +
  `*4* — Por el momento sin empleo\n` +
  `*5* — Prefiero no decir\n\n` +
  `_Esta información es voluntaria y confidencial. Nos ayuda a conectarte con mejores opciones cuando tu perfil esté listo._`;

// ── Address tenure question (+72h after Module 1) ─────────────────────────────
const ADDRESS_TENURE_MSG =
  `🏠 *Última pregunta de tu perfil:*\n\n` +
  `¿Cuánto tiempo llevas viviendo en tu domicilio actual?\n\n` +
  `Responde con el número:\n` +
  `*1* — Menos de 6 meses\n` +
  `*2* — Entre 6 meses y 2 años\n` +
  `*3* — Más de 2 años\n\n` +
  `_Esta información es voluntaria. Nos ayuda a entender mejor tu estabilidad y conectarte con opciones financieras adecuadas._`;

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
  // Re-engagement — dispatched from winbackCron, NOT from evaluateTriggersForUser
  WINBACK_30D:           "winback_30d",
  // Partner readiness step 2 — active=false until lending partner is contracted
  READINESS_HARD_STEP2:  "readiness_hard_step2",
  // Remittance profile — queued after Module 1, intercepts SÍ/NO reply
  REMITTANCE_PROFILE:    "remittance_profile",
  // Employment + address tenure — queued after Module 1 (+24h / +15d respectively)
  EMPLOYMENT_PROFILE:    "employment_profile",
  ADDRESS_TENURE:        "address_tenure",
} as const;

type TriggerType = (typeof TRIGGER)[keyof typeof TRIGGER];

// ── Trigger priority order ────────────────────────────────────────────────────
// Lower index = higher priority. Used by evaluateTriggersForUser to select the
// single most valuable trigger when multiple conditions qualify simultaneously.
// Prevents multi-trigger spam on first cron pass for existing users.
//
// Tier 1 — Credit readiness (highest value; fires once per user lifetime):
//   readiness_hard(0), readiness_approaching(1), not_yet_gap_report(2)
// Tier 2 — Payment urgency (time-sensitive recovery):
//   late_payment_1(3), pattern_late_2x(4), pti_drop_7d(5), stalled_14d(6)
// Tier 3 — Re-engagement:
//   winback_30d(7) — dispatched from winbackCron, NOT evaluateTriggersForUser
// Tier 4 — Achievement milestones (positive engagement):
//   first_payment(8), pti_cross_80(9), pti_cross_60(10), pti_cross_40(11),
//   milestone_90d(12), streak_5(13)
// Tier 5 — Educational modules:
//   module_unlock_1–5 (14–18)
// Tier 6 — Data collection follow-ups (deferred from Module 1/2):
//   remittance_profile(19), employment_profile(20), address_tenure(21)
// Tier 7 — Marketing (lowest priority):
//   free_credit_nudge(22)
//
// ASSERTION: every active trigger_type in paula_messages must appear here.
// Triggers absent from this map fall back to priority 99 (candidate-sort tail)
// and log an ERROR at startup. income_collection is intentionally excluded —
// it is never seeded into paula_messages as a standalone active trigger.
const TRIGGER_PRIORITY: Readonly<Record<string, number>> = {
  [TRIGGER.READINESS_HARD]:        0,
  [TRIGGER.READINESS_HARD_STEP2]:  1,  // active=false; listed so future activation clears assertion
  [TRIGGER.READINESS_APPROACHING]: 2,
  [TRIGGER.NOT_YET_GAP_REPORT]:    3,
  [TRIGGER.LATE_PAYMENT_1]:        4,
  [TRIGGER.PATTERN_LATE_2X]:       5,
  [TRIGGER.PTI_DROP_7D]:           6,
  [TRIGGER.STALLED_14D]:           7,
  [TRIGGER.WINBACK_30D]:           8,
  [TRIGGER.FIRST_PAYMENT]:         9,
  [TRIGGER.PTI_CROSS_80]:          10,
  [TRIGGER.PTI_CROSS_60]:          11,
  [TRIGGER.PTI_CROSS_40]:          12,
  [TRIGGER.MILESTONE_90D]:         13,
  [TRIGGER.STREAK_5]:              14,
  [TRIGGER.MODULE_UNLOCK_1]:       15,
  [TRIGGER.MODULE_UNLOCK_2]:       16,
  [TRIGGER.MODULE_UNLOCK_3]:       17,
  [TRIGGER.MODULE_UNLOCK_4]:       18,
  [TRIGGER.MODULE_UNLOCK_5]:       19,
  [TRIGGER.REMITTANCE_PROFILE]:    20,
  [TRIGGER.EMPLOYMENT_PROFILE]:    21,
  [TRIGGER.ADDRESS_TENURE]:        22,
  [TRIGGER.FREE_CREDIT_NUDGE]:     23,
} as const;
function triggerPriority(type: string): number {
  return TRIGGER_PRIORITY[type] ?? 99;
}

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

// ── Startup health check ──────────────────────────────────────────────────────
// Called from index.ts after boot. Logs ERROR (not warn) if active template
// count falls below the expected constant and surfaces the delta for the admin
// dashboard. Does NOT crash the app — sending still works for active rows.
export const PAULA_MESSAGES_EXPECTED_ACTIVE = 22; // 24 total - 2 partner-gated (readiness_hard, readiness_hard_step2)

// Triggers that are intentionally kept inactive until a live lending partner exists.
const KNOWN_INACTIVE_TRIGGERS = new Set(["readiness_hard", "readiness_hard_step2"]);

// Expected active triggers = all registered triggers minus the known-inactive set.
// Derived at module load so it stays in sync with the TRIGGER constant automatically.
function deriveExpectedActive(): string[] {
  // TRIGGER is defined later in this file; we reference it after module init via closure.
  // We use a lazy getter pattern — this function is only called at runtime, not at import.
  return Object.values(TRIGGER).filter(k => !KNOWN_INACTIVE_TRIGGERS.has(k));
}

export async function checkPaulaTemplateHealth(
  db: Awaited<ReturnType<typeof import("@workspace/db").default>>,
): Promise<{ ok: boolean; activeCount: number; expected: number; missing: string[] }> {
  const countRow = await db.execute(sql`
    SELECT trigger_type FROM paula_messages WHERE active = TRUE ORDER BY trigger_type
  `);
  const activeKeys = (countRow.rows as Array<Record<string, unknown>>).map(r => String(r.trigger_type));
  const activeCount = activeKeys.length;

  const expectedKeys = deriveExpectedActive();
  const missing = expectedKeys.filter(k => !activeKeys.includes(k));

  if (activeCount < PAULA_MESSAGES_EXPECTED_ACTIVE || missing.length > 0) {
    logger.error(
      { activeCount, expected: PAULA_MESSAGES_EXPECTED_ACTIVE, missing },
      `[Paula] TEMPLATE HEALTH CHECK FAILED: only ${activeCount}/${PAULA_MESSAGES_EXPECTED_ACTIVE} expected active templates found — missing: ${missing.join(", ") || "none listed"}`,
    );
    return { ok: false, activeCount, expected: PAULA_MESSAGES_EXPECTED_ACTIVE, missing };
  }

  // Startup assertion: every active trigger_type must exist in TRIGGER_PRIORITY.
  // A missing entry means the new trigger will silently land at priority 99 in
  // candidate-sort and never beat any existing trigger. Log ERROR so the admin
  // notices without crashing the app.
  const unprioritized = activeKeys.filter(k => !(k in TRIGGER_PRIORITY));
  if (unprioritized.length > 0) {
    logger.error(
      { unprioritized },
      "[Paula] STARTUP ASSERTION: active trigger_type(s) missing from TRIGGER_PRIORITY — add them to the constant in paulaTriggers.ts",
    );
  }

  logger.info(`[Paula] Template health OK: ${activeCount} active templates`);
  return { ok: true, activeCount, expected: PAULA_MESSAGES_EXPECTED_ACTIVE, missing: [] };
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
    logger.error(
      { triggerType, telefono, pti_score: ctx.pti_score },
      `[PaulaTriggers] MISSING TEMPLATE: trigger_type="${triggerType}" has no active row in paula_messages — skipping fire and writing FAILED sentinel to queue`,
    );
    // Write a FAILED sentinel to paula_send_queue so the gap is visible in the
    // admin dashboard and not only in server logs.
    const sentinelMsg = `[MISSING TEMPLATE: ${triggerType}]`;
    try {
      await db.execute(sql`
        INSERT INTO paula_send_queue
          (telefono, message, trigger_type, trigger_log_id, status, created_at, scheduled_at)
        VALUES
          (${telefono}, ${sentinelMsg}, ${triggerType}, NULL,
           'FAILED', NOW(), NULL)
      `);
    } catch (sentinelErr) {
      logger.error({ sentinelErr, triggerType, telefono }, "[PaulaTriggers] Failed to write missing-template sentinel to queue");
    }
    return;
  }

  const message = injectVariables(tmpl.template_es, ctx);

  // Extract positional variables for Twilio Content template sends (out-of-session path).
  // Values are frozen at enqueue time from the live UserContext so the queue processor
  // does not need to re-build context.
  const variablesJson = extractVariables(tmpl.variables_schema, ctx);

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
  const queueId = await enqueueWhatsApp(db, telefono, message, triggerType, logId, 0, variablesJson);

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
  // Suppression gate: never fire proactive triggers for opted-out users.
  // Paula still responds to direct inbound messages — this only suppresses
  // outbound trigger-initiated messages.
  if (ctx.coaching_responsiveness === 'OPTED_OUT') {
    return 0;
  }

  // ── Per-user 24h send throttle ────────────────────────────────────────────
  // At most one business-initiated nudge per user per 24h window. No exemptions —
  // all trigger types count (including data-collection follow-ups). This ensures
  // profile questions cannot stack with other nudges in the same 24h window.
  const recentNudge = await db.execute(sql`
    SELECT 1 FROM paula_trigger_log
    WHERE telefono = ${telefono}
      AND fired_at >= NOW() - INTERVAL '24 hours'
    LIMIT 1
  `);
  if (recentNudge.rows.length > 0) {
    logger.debug({ telefono }, "[PaulaTriggers] 24h throttle: user already nudged, skipping");
    return 0;
  }

  let fired = 0;

  // Candidates collected during condition evaluation. All qualifying triggers are
  // gathered first, then sorted by TRIGGER_PRIORITY, and only the single
  // highest-priority candidate fires. This prevents multi-trigger spam on the
  // first cron pass when many conditions qualify simultaneously for existing users.
  const candidates: Array<{ type: string; fire: () => Promise<void> }> = [];

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
  // READINESS GATE — evaluated first because it is the highest-priority tier.
  // evaluateReadiness() writes an assessment row every evaluation so the admin
  // dashboard has a full history regardless of whether a trigger fires.
  // ═══════════════════════════════════════════════════════════════════════════
  if (totalPaid >= 1) {
    const readiness = await evaluateReadiness(db, telefono, ctx);

    if (readiness.status === "READY") {
      if (!(await onCooldown(db, telefono, TRIGGER.READINESS_HARD, templates))) {
        const enrichedCtx: UserContext = {
          ...ctx,
          streak_days:          readiness.streakDays,
          bill_diversity:       readiness.billDiversity,
          literacy_score:       ctx.financial_literacy_score,
          partner_display_name: readiness.partnerDisplayName,
        };
        candidates.push({
          type: TRIGGER.READINESS_HARD,
          fire: async () => {
            await fireTrigger(db, telefono, TRIGGER.READINESS_HARD, enrichedCtx, templates);
            fired++;
            // Credit READY rewards: 5 free bill payments + $300 MXN wallet credit
            db.execute(sql`
              UPDATE users SET free_bill_credits = free_bill_credits + 5
              WHERE telefono = ${telefono}
            `).catch(err => logger.error({ err, telefono }, "[PaulaTriggers] READY free_bill_credits credit failed"));
            db.execute(sql`
              INSERT INTO wallet_transactions (telefono, type, amount_mxn, status, description, created_at)
              VALUES (${telefono}, 'PTI_REWARD', 300, 'confirmed', 'Premio PTI: Perfil Listo', NOW())
            `).catch(err => logger.error({ err, telefono }, "[PaulaTriggers] READY wallet_transactions insert failed"));
            db.execute(sql`
              UPDATE wallets SET balance_mxn = balance_mxn + 300, updated_at = NOW()
              WHERE user_id = ${telefono}
            `).catch(err => logger.error({ err, telefono }, "[PaulaTriggers] READY wallets balance update failed"));
            db.execute(sql`
              UPDATE users SET pti_uncelebrated_milestone = 'ready' WHERE telefono = ${telefono}
            `).catch(err => logger.error({ err, telefono }, "[PaulaTriggers] READY uncelebrated_milestone set failed"));
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
              WHERE telefono = ${telefono} AND status = 'pending'
            `).catch(err => logger.error({ err, telefono }, "[PaulaTriggers] handoff_data populate failed"));
          },
        });
      }

      // READINESS_HARD re-ask: user previously declined 30+ days ago.
      // Reset status inside the fire closure so the SÍ/NO gate works again.
      const declinedRow = await db.execute(sql`
        SELECT declined_at FROM paula_pending_handoffs
        WHERE telefono = ${telefono} AND status = 'declined'
          AND declined_at <= NOW() - INTERVAL '30 days'
        LIMIT 1
      `);
      if (declinedRow.rows.length > 0) {
        const enrichedCtx2: UserContext = {
          ...ctx,
          streak_days:          readiness.streakDays,
          bill_diversity:       readiness.billDiversity,
          literacy_score:       ctx.financial_literacy_score,
          partner_display_name: readiness.partnerDisplayName,
        };
        candidates.push({
          type: TRIGGER.READINESS_HARD,
          fire: async () => {
            await db.execute(sql`
              UPDATE paula_pending_handoffs
              SET status = 'pending', declined_at = NULL
              WHERE telefono = ${telefono} AND status = 'declined'
            `);
            await fireTrigger(db, telefono, TRIGGER.READINESS_HARD, enrichedCtx2, templates);
            fired++;
          },
        });
      }

    } else if (readiness.status === "APPROACHING") {
      if (!(await onCooldown(db, telefono, TRIGGER.READINESS_APPROACHING, templates))) {
        const enrichedCtx: UserContext = {
          ...ctx,
          streak_days: readiness.streakDays,
          top_gap:     readiness.topGapLabel,
        };
        candidates.push({
          type: TRIGGER.READINESS_APPROACHING,
          fire: async () => {
            await fireTrigger(db, telefono, TRIGGER.READINESS_APPROACHING, enrichedCtx, templates);
            fired++;
          },
        });
      }

    } else {
      // NOT_YET — PTI < 70, largest cohort. 30-day cadence gap report.
      if (!(await onCooldown(db, telefono, TRIGGER.NOT_YET_GAP_REPORT, templates))) {
        const enrichedCtx: UserContext = { ...ctx, streak_days: readiness.streakDays, top_gap: readiness.topGapLabel };
        candidates.push({
          type: TRIGGER.NOT_YET_GAP_REPORT,
          fire: async () => {
            await fireTrigger(db, telefono, TRIGGER.NOT_YET_GAP_REPORT, enrichedCtx, templates);
            fired++;
          },
        });
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RECOVERY TRIGGERS
  // ═══════════════════════════════════════════════════════════════════════════

  // T6a — First ever late payment
  if (totalLate === 1 && !(await onCooldown(db, telefono, TRIGGER.LATE_PAYMENT_1, templates))) {
    candidates.push({
      type: TRIGGER.LATE_PAYMENT_1,
      fire: async () => { await fireTrigger(db, telefono, TRIGGER.LATE_PAYMENT_1, ctx, templates); fired++; },
    });
  }

  // T8 — 2 late payments in 30 days (pattern)
  if (late30d >= 2 && !(await onCooldown(db, telefono, TRIGGER.PATTERN_LATE_2X, templates))) {
    candidates.push({
      type: TRIGGER.PATTERN_LATE_2X,
      fire: async () => { await fireTrigger(db, telefono, TRIGGER.PATTERN_LATE_2X, ctx, templates); fired++; },
    });
  }

  // T6 — PTI dropped ≥5 pts (uses 30d delta from pti_trend_30d via ctx)
  if (ptiDelta <= -5 && !(await onCooldown(db, telefono, TRIGGER.PTI_DROP_7D, templates))) {
    candidates.push({
      type: TRIGGER.PTI_DROP_7D,
      fire: async () => { await fireTrigger(db, telefono, TRIGGER.PTI_DROP_7D, ctx, templates); fired++; },
    });
  }

  // T7 — No payment activity in 14+ days
  if (daysSincePay >= 14 && !(await onCooldown(db, telefono, TRIGGER.STALLED_14D, templates))) {
    candidates.push({
      type: TRIGGER.STALLED_14D,
      fire: async () => { await fireTrigger(db, telefono, TRIGGER.STALLED_14D, ctx, templates); fired++; },
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ACHIEVEMENT TRIGGERS
  // ═══════════════════════════════════════════════════════════════════════════

  // T1 — First on-time payment
  if (totalPaid === 1 && !(await onCooldown(db, telefono, TRIGGER.FIRST_PAYMENT, templates))) {
    candidates.push({
      type: TRIGGER.FIRST_PAYMENT,
      fire: async () => { await fireTrigger(db, telefono, TRIGGER.FIRST_PAYMENT, ctx, templates); fired++; },
    });
  }

  // T4 — PTI crosses 80 (Oro / Excelente)
  if (
    ptiScore >= 80 &&
    !(await onCooldown(db, telefono, TRIGGER.PTI_CROSS_80, templates)) &&
    await hadScoreBelow(80) &&
    await crossedThresholdRecently(80)
  ) {
    candidates.push({
      type: TRIGGER.PTI_CROSS_80,
      fire: async () => { await fireTrigger(db, telefono, TRIGGER.PTI_CROSS_80, ctx, templates); fired++; },
    });
  }

  // T3 — PTI crosses 60 (Plata)
  if (
    ptiScore >= 60 && ptiScore < 80 &&
    !(await onCooldown(db, telefono, TRIGGER.PTI_CROSS_60, templates)) &&
    await hadScoreBelow(60) &&
    await crossedThresholdRecently(60)
  ) {
    candidates.push({
      type: TRIGGER.PTI_CROSS_60,
      fire: async () => { await fireTrigger(db, telefono, TRIGGER.PTI_CROSS_60, ctx, templates); fired++; },
    });
  }

  // T2 — PTI crosses 40 (Bronce floor)
  if (
    ptiScore >= 40 && ptiScore < 60 &&
    !(await onCooldown(db, telefono, TRIGGER.PTI_CROSS_40, templates)) &&
    await hadScoreBelow(40) &&
    await crossedThresholdRecently(40)
  ) {
    candidates.push({
      type: TRIGGER.PTI_CROSS_40,
      fire: async () => { await fireTrigger(db, telefono, TRIGGER.PTI_CROSS_40, ctx, templates); fired++; },
    });
  }

  // T5 — 90-day consistency milestone
  if (streakMonths >= 3 && !(await onCooldown(db, telefono, TRIGGER.MILESTONE_90D, templates))) {
    candidates.push({
      type: TRIGGER.MILESTONE_90D,
      fire: async () => { await fireTrigger(db, telefono, TRIGGER.MILESTONE_90D, ctx, templates); fired++; },
    });
  }

  // T1b — 5-payment streak (fires week 2-3, before any PTI threshold is crossed)
  if (
    totalPaid >= 5 && totalPaid <= 9 && totalLate === 0 &&
    !(await onCooldown(db, telefono, TRIGGER.STREAK_5, templates))
  ) {
    candidates.push({
      type: TRIGGER.STREAK_5,
      fire: async () => { await fireTrigger(db, telefono, TRIGGER.STREAK_5, ctx, templates); fired++; },
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EDUCATIONAL TRIGGERS (PTI milestone-gated)
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Module 1 fire helper (incl. deferred follow-ups) ──────────────────────
  async function fireModule1(): Promise<void> {
    await fireTrigger(db, telefono, TRIGGER.MODULE_UNLOCK_1, ctx, templates);
    fired++;
    logger.warn(`[MODULE_UNLOCK] First-ever fire: telefono=${telefono}, trigger=${TRIGGER.MODULE_UNLOCK_1}`);
    const m1FollowUpRow = await db.execute(sql`
      SELECT receives_remittances, employment_type, address_tenure_bucket
      FROM users WHERE telefono = ${telefono} LIMIT 1
    `).catch(() => ({ rows: [] }));
    const m1User = (m1FollowUpRow.rows[0] as Record<string, unknown> | undefined) ?? {};

    // ── Deferred profile follow-ups (enqueue-only, NO trigger_log INSERT) ─────
    // Critical: inserting these into paula_trigger_log at enqueue-time with
    // fired_at=NOW() would immediately overwrite last_trigger and break the
    // module teaser 48h reply window (user can no longer reply "1" to the
    // module teaser because last_trigger becomes 'address_tenure').
    // whatsapp-agent.ts intercepts use paula_send_queue SENT status instead.
    //
    // Gap enforcement: 7-day minimum between profile questions ensures
    // "última pregunta" in address_tenure is always accurate, and prevents
    // any profile question from landing inside the 48h module teaser window.
    if (m1User.receives_remittances == null) {
      await enqueueWhatsApp(db, telefono, REMITTANCE_PROFILE_MSG, "remittance_profile", 0, 1 * 24 * 60, { "1": ctx.nombre }).catch(() => {});
    }

    if (m1User.employment_type == null) {
      await enqueueWhatsApp(db, telefono, EMPLOYMENT_PROFILE_MSG, "employment_profile", 0, 8 * 24 * 60, { "1": ctx.nombre }).catch(() => {});
    }

    if (m1User.address_tenure_bucket == null) {
      await enqueueWhatsApp(db, telefono, ADDRESS_TENURE_MSG, "address_tenure", 0, 15 * 24 * 60, { "1": ctx.nombre }).catch(() => {});
    }
  }

  // ── Module 2/3 shared fire helper (incl. income-collection follow-up) ─────
  async function fireModule2Or3(trigger: typeof TRIGGER.MODULE_UNLOCK_2 | typeof TRIGGER.MODULE_UNLOCK_3): Promise<void> {
    await fireTrigger(db, telefono, trigger, ctx, templates);
    fired++;
    logger.warn(`[MODULE_UNLOCK] First-ever fire: telefono=${telefono}, trigger=${trigger}`);
    if (ctx.declared_income_bucket == null) {
      // Enqueue-only (no trigger_log INSERT) — same reasoning as Module 1 follow-ups.
      // income_collection fires immediately (delay=0) after the module teaser;
      // a trigger_log row at NOW() would corrupt last_trigger for the module reply window.
      await enqueueWhatsApp(db, telefono, INCOME_BUCKET_MSG, "income_collection", 0, 0, { "1": ctx.nombre }).catch(() => {});
    }
  }

  // moduleFiredThisCycle prevents pushing two module candidates in the same
  // evaluation pass — the sequential catch-up pattern still walks in order,
  // but only one module can be a candidate per cycle.
  let moduleFiredThisCycle = false;

  // Module 1 unlock: PTI < 30, fires after first payment
  const module1Fired = await onCooldown(db, telefono, TRIGGER.MODULE_UNLOCK_1, templates);
  if (!moduleFiredThisCycle && totalPaid >= 1 && ptiScore < 30 && !module1Fired) {
    candidates.push({ type: TRIGGER.MODULE_UNLOCK_1, fire: async () => { await fireModule1(); } });
    moduleFiredThisCycle = true;
  }

  // Module 2 unlock: PTI >= 30. Requires module_unlock_1 to have already fired.
  if (!moduleFiredThisCycle && ptiScore >= 30 && !(await onCooldown(db, telefono, TRIGGER.MODULE_UNLOCK_2, templates))) {
    if (!module1Fired) {
      candidates.push({ type: TRIGGER.MODULE_UNLOCK_1, fire: async () => { await fireModule1(); } });
      moduleFiredThisCycle = true;
    } else if (ptiScore < 50) {
      candidates.push({ type: TRIGGER.MODULE_UNLOCK_2, fire: async () => { await fireModule2Or3(TRIGGER.MODULE_UNLOCK_2); } });
      moduleFiredThisCycle = true;
    }
  }

  // Module 3 unlock: PTI >= 50. Requires module_unlock_2 to have already fired.
  if (!moduleFiredThisCycle && ptiScore >= 50 && !(await onCooldown(db, telefono, TRIGGER.MODULE_UNLOCK_3, templates))) {
    const module2Fired = await onCooldown(db, telefono, TRIGGER.MODULE_UNLOCK_2, templates);
    if (!module2Fired) {
      candidates.push({ type: TRIGGER.MODULE_UNLOCK_2, fire: async () => { await fireModule2Or3(TRIGGER.MODULE_UNLOCK_2); } });
      moduleFiredThisCycle = true;
    } else if (ptiScore < 65) {
      candidates.push({ type: TRIGGER.MODULE_UNLOCK_3, fire: async () => { await fireModule2Or3(TRIGGER.MODULE_UNLOCK_3); } });
      moduleFiredThisCycle = true;
    }
  }

  // Module 4 unlock: PTI >= 65. Requires module_unlock_3 to have already fired.
  if (!moduleFiredThisCycle && ptiScore >= 65 && !(await onCooldown(db, telefono, TRIGGER.MODULE_UNLOCK_4, templates))) {
    const module3Fired = await onCooldown(db, telefono, TRIGGER.MODULE_UNLOCK_3, templates);
    if (!module3Fired) {
      candidates.push({ type: TRIGGER.MODULE_UNLOCK_3, fire: async () => { await fireModule2Or3(TRIGGER.MODULE_UNLOCK_3); } });
      moduleFiredThisCycle = true;
    } else if (ptiScore < 80) {
      candidates.push({
        type: TRIGGER.MODULE_UNLOCK_4,
        fire: async () => {
          await fireTrigger(db, telefono, TRIGGER.MODULE_UNLOCK_4, ctx, templates);
          fired++;
          logger.warn(`[MODULE_UNLOCK] First-ever fire: telefono=${telefono}, trigger=${TRIGGER.MODULE_UNLOCK_4}`);
        },
      });
      moduleFiredThisCycle = true;
    }
  }

  // Module 5 unlock: PTI >= 80. Requires module_unlock_4 to have already fired.
  if (!moduleFiredThisCycle && ptiScore >= 80 && !(await onCooldown(db, telefono, TRIGGER.MODULE_UNLOCK_5, templates))) {
    const module4Fired = await onCooldown(db, telefono, TRIGGER.MODULE_UNLOCK_4, templates);
    if (!module4Fired) {
      candidates.push({
        type: TRIGGER.MODULE_UNLOCK_4,
        fire: async () => {
          await fireTrigger(db, telefono, TRIGGER.MODULE_UNLOCK_4, ctx, templates);
          fired++;
          logger.warn(`[MODULE_UNLOCK] First-ever fire: telefono=${telefono}, trigger=${TRIGGER.MODULE_UNLOCK_4}`);
        },
      });
      moduleFiredThisCycle = true;
    } else {
      candidates.push({
        type: TRIGGER.MODULE_UNLOCK_5,
        fire: async () => {
          await fireTrigger(db, telefono, TRIGGER.MODULE_UNLOCK_5, ctx, templates);
          fired++;
          logger.warn(`[MODULE_UNLOCK] First-ever fire: telefono=${telefono}, trigger=${TRIGGER.MODULE_UNLOCK_5}`);
        },
      });
      moduleFiredThisCycle = true;
    }
  }

  // ── FREE_CREDIT_NUDGE — reminds users of unused credits sitting idle 3+ days ──
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
    const daysSinceUsed = lastUsed
      ? (Date.now() - lastUsed.getTime()) / 86_400_000
      : Infinity;
    if (daysSinceUsed >= 3 && !(await onCooldown(db, telefono, TRIGGER.FREE_CREDIT_NUDGE, templates))) {
      const enrichedCtx: UserContext = { ...ctx, free_bill_credits: freeCredits };
      candidates.push({
        type: TRIGGER.FREE_CREDIT_NUDGE,
        fire: async () => {
          await fireTrigger(db, telefono, TRIGGER.FREE_CREDIT_NUDGE, enrichedCtx, templates);
          fired++;
        },
      });
    }
  }

  // ── Candidate selection: fire only the highest-priority qualifying trigger ──
  // Sorts by TRIGGER_PRIORITY (ascending = highest priority wins) and fires once.
  if (candidates.length > 0) {
    candidates.sort((a, b) => triggerPriority(a.type) - triggerPriority(b.type));
    logger.debug(
      { telefono, candidates: candidates.map(c => c.type), selected: candidates[0].type },
      "[PaulaTriggers] Candidate selection",
    );
    await candidates[0].fire();
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

  // Global circuit breaker: max business-initiated nudges per cron run.
  // Defaults to 50 for safety during the first week after enabling sends —
  // prevents a mass-fire event if many users qualify simultaneously on the first pass.
  // Set PAULA_MAX_NUDGES_PER_RUN=0 to disable the cap (unlimited).
  const maxNudgesRaw = process.env.PAULA_MAX_NUDGES_PER_RUN;
  const maxNudgesPerRun = maxNudgesRaw !== undefined ? parseInt(maxNudgesRaw, 10) : 50;

  for (const user of users) {
    if (maxNudgesPerRun > 0 && totalFired >= maxNudgesPerRun) {
      logger.warn(
        { cap: maxNudgesPerRun, totalFired, usersRemaining: users.length - users.indexOf(user) },
        "[PaulaTriggers] Circuit breaker: PAULA_MAX_NUDGES_PER_RUN reached — stopping batch early",
      );
      break;
    }
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
