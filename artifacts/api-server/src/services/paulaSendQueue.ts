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
import { sendWhatsApp } from "../lib/whatsapp.js";
import { getPartnerDisplayName } from "./readinessGate.js";

const MAX_ATTEMPTS = 3;
const BATCH_SIZE   = 10;

// ── Kill switch ───────────────────────────────────────────────────────────────
// Fail-safe: defaults to false (no sending) unless explicitly set to 'true'.
// Only gates the final Twilio delivery step below — does NOT touch the
// trigger evaluator, queue enqueueing, or any other part of the pipeline,
// so we can still see what WOULD have been sent via logs.
const PAULA_SENDING_ENABLED = process.env.PAULA_SENDING_ENABLED === "true";

// ── Enqueue a WhatsApp send ───────────────────────────────────────────────────
export async function enqueueWhatsApp(
  db: Awaited<ReturnType<typeof import("@workspace/db").default>>,
  telefono: string,
  message: string,
  triggerType: string,
  triggerLogId: number | null,
  delayMinutes = 0,
): Promise<number> {
  const r = await db.execute(sql`
    INSERT INTO paula_send_queue
      (telefono, message, trigger_type, trigger_log_id, status, created_at, scheduled_at)
    VALUES
      (${telefono}, ${message}, ${triggerType}, ${triggerLogId}, 'PENDING', NOW(),
       CASE WHEN ${delayMinutes} > 0
            THEN NOW() + (${delayMinutes} || ' minutes')::INTERVAL
            ELSE NULL END)
    RETURNING id
  `);
  return Number((r.rows[0] as Record<string, unknown>).id);
}

// ── Queue processor (runs every 2 min) ───────────────────────────────────────
export async function processSendQueue(): Promise<void> {
  const { db } = await import("@workspace/db");

  const rows = await db.execute(sql`
    SELECT id, telefono, message, trigger_type, trigger_log_id, attempts
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

    await db.execute(sql`
      UPDATE paula_send_queue
      SET status = 'SENDING', attempts = ${attempts}, last_attempt_at = NOW()
      WHERE id = ${id}
    `);

    try {
      if (PAULA_SENDING_ENABLED) {
        await sendWhatsApp(telefono, message);

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
