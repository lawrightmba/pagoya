/**
 * Paula Send Queue Processor — Sprint 3
 *
 * Runs every 2 minutes. Drains up to 10 PENDING/FAILED rows from
 * paula_send_queue, attempts Twilio delivery, updates status.
 *
 * Retry policy:
 *   attempt 1 → FAILED → retry in ~2 min
 *   attempt 2 → FAILED → retry in ~2 min
 *   attempt 3 → DEAD   → never retried, surfaced for manual review
 *
 * Uses FOR UPDATE SKIP LOCKED for safe future multi-process expansion.
 */

import { sql } from "drizzle-orm";
import { logger } from "../lib/logger.js";
import { sendWhatsApp, sendWhatsAppTemplate } from "../lib/whatsapp.js";
import { getPartnerDisplayName } from "./readinessGate.js";

const MAX_ATTEMPTS = 3;
const BATCH_SIZE   = 10;

// ── Kill switch ───────────────────────────────────────────────────────────────
// Fail-safe: defaults to false (no sending) unless explicitly set to 'true'.
// Only gates the final Twilio delivery step below — does NOT touch the
// trigger evaluator, queue enqueueing, or any other part of the pipeline,
// so we can still see what WOULD have been sent via logs.
const PAULA_SENDING_ENABLED = process.env.PAULA_SENDING_ENABLED === "true";

// ── Session-window check ──────────────────────────────────────────────────────
// Returns true if the user sent an inbound message within the last 24 hours,
// meaning we are inside their open WhatsApp session and freeform sends are permitted.
// Outside a session window, business-initiated sends require a Twilio Content SID
// (Meta-approved template) — freeform text is silently dropped by WhatsApp.
async function isWithin24hSession(
  db: Awaited<ReturnType<typeof import("@workspace/db").default>>,
  telefono: string,
): Promise<boolean> {
  const r = await db.execute(sql`
    SELECT 1 FROM paula_inbound_log
    WHERE telefono = ${telefono}
      AND received_at >= NOW() - INTERVAL '24 hours'
    LIMIT 1
  `);
  return r.rows.length > 0;
}

// ── Template SID lookup ───────────────────────────────────────────────────────
// Returns { contentSid, variables } for a business-initiated send, or null if
// the template has no content_sid assigned yet (Workstream B pending approval).
// variablesJson is the positional map frozen at enqueue time from the queue row.
async function getTemplateSid(
  db: Awaited<ReturnType<typeof import("@workspace/db").default>>,
  triggerType: string,
  variablesJson: Record<string, string>,
): Promise<{ contentSid: string; variables: Record<string, string> } | null> {
  // Check if content_sid column exists (may not yet be in prod during migration window)
  const colCheck = await db.execute(sql`
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'paula_messages' AND column_name = 'content_sid'
    LIMIT 1
  `);
  if (!colCheck.rows.length) return null;

  const r = await db.execute(sql`
    SELECT content_sid FROM paula_messages
    WHERE trigger_type = ${triggerType} AND content_sid IS NOT NULL
    LIMIT 1
  `);
  if (!r.rows.length) return null;

  const contentSid = String((r.rows[0] as Record<string, unknown>).content_sid);

  // Variables are passed directly from the queue row (frozen at enqueue time
  // from UserContext via extractVariables). No re-derivation at send time.
  return { contentSid, variables: variablesJson };
}

// ── Enqueue a WhatsApp send ───────────────────────────────────────────────────
// variablesJson: positional Content template variables frozen from UserContext at
// enqueue time (e.g. {"1":"María","2":"45"}). Stored alongside the pre-rendered
// freeform message so the processor can use whichever path applies at send time.
export async function enqueueWhatsApp(
  db: Awaited<ReturnType<typeof import("@workspace/db").default>>,
  telefono: string,
  message: string,
  triggerType: string,
  triggerLogId: number | null,
  delayMinutes = 0,
  variablesJson: Record<string, string> = {},
): Promise<number> {
  const variablesJsonStr = JSON.stringify(variablesJson);
  const r = await db.execute(sql`
    INSERT INTO paula_send_queue
      (telefono, message, trigger_type, trigger_log_id, status, created_at, scheduled_at, variables_json)
    VALUES
      (${telefono}, ${message}, ${triggerType}, ${triggerLogId}, 'PENDING', NOW(),
       CASE WHEN ${delayMinutes} > 0
            THEN NOW() + (${delayMinutes} || ' minutes')::INTERVAL
            ELSE NULL END,
       ${variablesJsonStr}::jsonb)
    RETURNING id
  `);
  return Number((r.rows[0] as Record<string, unknown>).id);
}

// ── Queue processor (runs every 2 min) ───────────────────────────────────────
export async function processSendQueue(): Promise<void> {
  const { db } = await import("@workspace/db");

  const rows = await db.execute(sql`
    SELECT id, telefono, message, trigger_type, trigger_log_id, attempts, variables_json
    FROM paula_send_queue
    WHERE status IN ('PENDING', 'FAILED')
      AND attempts < ${MAX_ATTEMPTS}
      AND (scheduled_at IS NULL OR scheduled_at <= NOW())
    ORDER BY created_at ASC
    LIMIT ${BATCH_SIZE}
    FOR UPDATE SKIP LOCKED
  `);

  if (!rows.rows.length) return;

  logger.info(`[SendQueue] Processing ${rows.rows.length} messages`);

  for (const row of rows.rows as Array<Record<string, unknown>>) {
    const id           = Number(row.id);
    const telefono     = String(row.telefono);
    const message      = String(row.message);
    const triggerType  = String(row.trigger_type ?? "");
    const triggerLogId = row.trigger_log_id != null ? Number(row.trigger_log_id) : null;
    const attempts     = Number(row.attempts) + 1;
    // variables_json frozen at enqueue time; null-safe fallback for pre-migration rows
    const variablesJson: Record<string, string> =
      row.variables_json ? (row.variables_json as Record<string, string>) : {};

    await db.execute(sql`
      UPDATE paula_send_queue
      SET status = 'SENDING', attempts = ${attempts}, last_attempt_at = NOW()
      WHERE id = ${id}
    `);

    try {
      if (PAULA_SENDING_ENABLED) {
        // B3 — Session-window enforcement:
        // All Paula triggers are business-initiated (cron-fired, not reply-triggered).
        // If the user is within their 24h WhatsApp session we can use freeform.
        // If not, we MUST use an approved Twilio Content template (content_sid).
        // Sending freeform outside a session window = silent drop by WhatsApp.
        const withinSession = await isWithin24hSession(db, telefono);

        if (withinSession) {
          // Within session — freeform permitted
          await sendWhatsApp(telefono, message);
          logger.info({ id, telefono, triggerType, withinSession: true }, "[SendQueue] Freeform send (within session)");
        } else {
          // Outside session — require approved Content SID
          const tmplSid = await getTemplateSid(db, triggerType, variablesJson);
          if (!tmplSid) {
            // No content_sid configured yet — mark FAILED loudly, do not attempt freeform
            const errMsg = `Business-initiated send blocked: trigger="${triggerType}" has no content_sid and recipient is outside 24h session window. Assign an approved Twilio Content SID to proceed.`;
            logger.error({ id, telefono, triggerType }, `[SendQueue] ${errMsg}`);
            await db.execute(sql`
              UPDATE paula_send_queue
              SET status = 'FAILED', error_detail = ${errMsg}
              WHERE id = ${id}
            `);
            continue;
          }
          await sendWhatsAppTemplate(telefono, tmplSid.contentSid, tmplSid.variables);
          logger.info({ id, telefono, triggerType, withinSession: false, contentSid: tmplSid.contentSid }, "[SendQueue] Template send (outside session)");
        }

        await db.execute(sql`
          UPDATE paula_send_queue
          SET status = 'SENT', sent_at = NOW()
          WHERE id = ${id}
        `);
      } else {
        logger.info(
          { id, telefono, triggerType },
          "[SendQueue] PAULA_SENDING_ENABLED=false — skipping send",
        );

        await db.execute(sql`
          UPDATE paula_send_queue
          SET status = 'SKIPPED_DRY_RUN'
          WHERE id = ${id}
        `);
      }

      // When a readiness_hard message is confirmed sent — write pending handoff to DB.
      // DB-backed so the handoff offer survives server restarts.
      // Gated on PAULA_SENDING_ENABLED: a dry-run "would-have-sent" must never
      // advance a real user's handoff-consent state.
      if (triggerType === 'readiness_hard' && PAULA_SENDING_ENABLED) {
        try {
          const latestAssessment = await db.execute(sql`
            SELECT id FROM readiness_assessments
            WHERE telefono = ${telefono}
              AND gate_status = 'READY'
            ORDER BY assessed_at DESC LIMIT 1
          `);
          const assessmentId = Number(
            (latestAssessment.rows[0] as Record<string, unknown>)?.id,
          );
          if (assessmentId) {
            const partnerName = await getPartnerDisplayName(db);
            await db.execute(sql`
              INSERT INTO paula_pending_handoffs
                (telefono, assessment_id, partner_display_name)
              VALUES
                (${telefono}, ${assessmentId}, ${partnerName})
              ON CONFLICT (telefono) DO UPDATE
                SET assessment_id        = EXCLUDED.assessment_id,
                    partner_display_name = EXCLUDED.partner_display_name,
                    created_at           = NOW()
            `);
          }
        } catch (handoffErr) {
          logger.warn({ handoffErr, telefono }, "[SendQueue] Failed to write pending handoff row");
        }
      }

      if (triggerLogId != null) {
        // whatsapp_sent only reflects a real, confirmed delivery — never a dry run.
        // send_queue_id is still linked either way for traceability.
        await db.execute(sql`
          UPDATE paula_trigger_log
          SET whatsapp_sent = ${PAULA_SENDING_ENABLED}, send_queue_id = ${id}
          WHERE id = ${triggerLogId}
        `).catch(() => {});
      }

      logger.info(
        { id, telefono, sent: PAULA_SENDING_ENABLED },
        PAULA_SENDING_ENABLED ? "[SendQueue] Message sent" : "[SendQueue] Dry run recorded",
      );
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      const nextStatus = attempts >= MAX_ATTEMPTS ? "DEAD" : "FAILED";

      await db.execute(sql`
        UPDATE paula_send_queue
        SET status = ${nextStatus}, error_detail = ${errMsg}
        WHERE id = ${id}
      `);

      logger.warn({ id, telefono, attempts, nextStatus, err }, "[SendQueue] Delivery failed");
    }
  }
}
