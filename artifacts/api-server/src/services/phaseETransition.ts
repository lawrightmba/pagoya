/**
 * Phase E — PTI v5.0 Transition Message Dispatch
 *
 * Called ONCE at Phase E go-order, BEFORE v5.0 recompute writes new live scores.
 * Fires the 'pti_v5_transition' message for every user whose score will shift
 * > 5 pts when v5.0 is applied, so no score change is ever displayed without
 * this context message preceding it (spec §3.4, §3.1.1).
 *
 * Consent gate (§3.4 step 4):
 *   - whatsapp_consent_at IS NOT NULL  → enqueue to paula_send_queue (WhatsApp template)
 *   - whatsapp_consent_at IS NULL      → insert into pti_transition_notices (in-app queue)
 *
 * The message body is IDENTICAL for both paths. No variables.
 *
 * Precondition enforced at call site: pti_v5_transition must have a content_sid
 * in paula_messages (Meta approval confirmed). This function checks and reports
 * the precondition — it does NOT block dispatch if the SID is missing, but the
 * send-queue processor will fail at delivery time (SID gate in paulaSendQueue.ts).
 *
 * Idempotent: will not enqueue a second WhatsApp send if a PENDING/SENT row
 * already exists for (telefono, trigger_type). Will not insert a second in-app
 * notice if one is already pending (shown_at IS NULL).
 */

import { sql } from "drizzle-orm";
import { logger } from "../lib/logger.js";
import { enqueueWhatsApp } from "./paulaSendQueue.js";

export const TRANSITION_TRIGGER  = "pti_v5_transition";
export const TRANSITION_MESSAGE  =
  "Actualizamos cómo se calcula tu PTI para que refleje mejor tu esfuerzo — " +
  "lo que pagas y qué tan constante eres, no cuánto dinero se mueve. " +
  "Tu número puede cambiar un poco hoy; tu camino no cambia.";
export const DELTA_THRESHOLD     = 5;

export interface TransitionDispatchResult {
  total_qualifying:    number;
  whatsapp_enqueued:   number;
  inapp_queued:        number;
  already_dispatched:  number;
  content_sid_present: boolean;
  content_sid:         string | null;
  qualifying_users:    Array<{ telefono: string; v4_score: number; v5_score: number; delta: number; path: string }>;
  errors:              string[];
}

/**
 * Ensure the pti_transition_notices table exists (in-app fallback queue for
 * non-consented users). CREATE TABLE IF NOT EXISTS is safe to call on every run.
 */
async function ensureNoticesTable(
  db: Awaited<ReturnType<typeof import("@workspace/db").default>>,
): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS pti_transition_notices (
      id         SERIAL PRIMARY KEY,
      telefono   TEXT NOT NULL,
      message    TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      shown_at   TIMESTAMPTZ
    )
  `);
}

/**
 * Main dispatch function. Call BEFORE the Phase E v5.0 recompute.
 *
 * Returns a full report of what was dispatched, what was already handled,
 * and any errors. Caller (admin route) should log and surface this report.
 */
export async function dispatchV5TransitionMessages(): Promise<TransitionDispatchResult> {
  const { db } = await import("@workspace/db");

  await ensureNoticesTable(db);

  // ── Precondition: check whether Meta approval SID is in paula_messages ────
  const sidCheck = await db.execute(sql`
    SELECT content_sid FROM paula_messages
    WHERE trigger_type = ${TRANSITION_TRIGGER}
    LIMIT 1
  `);
  const sidRow   = sidCheck.rows[0] as Record<string, unknown> | undefined;
  const contentSid = (sidRow?.content_sid as string | null) ?? null;

  // ── Find qualifying users ─────────────────────────────────────────────────
  // Join shadow table against live users; filter to |delta| > threshold.
  // Excludes test accounts; requires both a live score and a shadow score.
  const qualifying = await db.execute(sql`
    SELECT
      u.telefono,
      u.whatsapp_consent_at,
      u.pti_score                              AS v4_score,
      s.pti_v5_total                           AS v5_score,
      ABS(s.pti_v5_total - u.pti_score)        AS delta
    FROM pti_v5_shadow_recompute s
    JOIN users u ON u.telefono = s.telefono
    WHERE u.pti_score    IS NOT NULL
      AND u.is_test_account IS NOT TRUE
      AND ABS(s.pti_v5_total - u.pti_score) > ${DELTA_THRESHOLD}
    ORDER BY delta DESC
  `);

  const rows = qualifying.rows as Array<Record<string, unknown>>;

  const result: TransitionDispatchResult = {
    total_qualifying:    rows.length,
    whatsapp_enqueued:   0,
    inapp_queued:        0,
    already_dispatched:  0,
    content_sid_present: Boolean(contentSid),
    content_sid:         contentSid,
    qualifying_users:    [],
    errors:              [],
  };

  for (const row of rows) {
    const telefono   = String(row.telefono);
    const hasConsent = Boolean(row.whatsapp_consent_at);
    const v4Score    = Number(row.v4_score);
    const v5Score    = Number(row.v5_score);
    const delta      = Number(row.delta);

    try {
      if (hasConsent) {
        // ── WhatsApp path ─────────────────────────────────────────────────
        // Idempotency: skip if a non-dead row for this trigger already exists.
        const already = await db.execute(sql`
          SELECT 1 FROM paula_send_queue
          WHERE telefono     = ${telefono}
            AND trigger_type = ${TRANSITION_TRIGGER}
            AND status NOT IN ('DEAD')
          LIMIT 1
        `);
        if (already.rows.length > 0) {
          result.already_dispatched++;
          result.qualifying_users.push({ telefono, v4_score: v4Score, v5_score: v5Score, delta, path: "whatsapp:already_queued" });
          logger.info({ telefono }, "[PhaseE] Transition already queued — skipping");
          continue;
        }

        await enqueueWhatsApp(
          db, telefono, TRANSITION_MESSAGE, TRANSITION_TRIGGER,
          null, // trigger_log_id — one-off admin event, no trigger log entry
          0,    // no delay — message should go immediately
          {},   // variables: empty (variable-free template)
        );
        result.whatsapp_enqueued++;
        result.qualifying_users.push({ telefono, v4_score: v4Score, v5_score: v5Score, delta, path: "whatsapp:enqueued" });
        logger.info({ telefono, delta }, "[PhaseE] Transition message enqueued (WhatsApp)");

      } else {
        // ── In-app path ───────────────────────────────────────────────────
        // Idempotency: skip if a pending (unshown) notice already exists.
        const already = await db.execute(sql`
          SELECT 1 FROM pti_transition_notices
          WHERE telefono = ${telefono}
            AND shown_at IS NULL
          LIMIT 1
        `);
        if (already.rows.length > 0) {
          result.already_dispatched++;
          result.qualifying_users.push({ telefono, v4_score: v4Score, v5_score: v5Score, delta, path: "inapp:already_pending" });
          logger.info({ telefono }, "[PhaseE] In-app notice already pending — skipping");
          continue;
        }

        await db.execute(sql`
          INSERT INTO pti_transition_notices (telefono, message, created_at)
          VALUES (${telefono}, ${TRANSITION_MESSAGE}, NOW())
        `);
        result.inapp_queued++;
        result.qualifying_users.push({ telefono, v4_score: v4Score, v5_score: v5Score, delta, path: "inapp:queued" });
        logger.info({ telefono, delta }, "[PhaseE] Transition notice queued (in-app)");
      }

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error({ err, telefono }, "[PhaseE] Transition dispatch error");
      result.errors.push(`${telefono}: ${msg}`);
      result.qualifying_users.push({ telefono, v4_score: v4Score, v5_score: v5Score, delta, path: `error:${msg}` });
    }
  }

  logger.info(
    { total: result.total_qualifying, wa: result.whatsapp_enqueued, inapp: result.inapp_queued, errors: result.errors.length },
    "[PhaseE] Transition dispatch complete",
  );

  return result;
}

/**
 * Status probe — no side effects. Returns qualifying users + current dispatch
 * state (what's already queued). Called by the admin status endpoint and the
 * pre-Phase-E precondition check.
 */
export async function getTransitionDispatchStatus(): Promise<{
  content_sid: string | null;
  content_sid_present: boolean;
  qualifying_users: Array<{ telefono: string; v4_score: number; v5_score: number; delta: number }>;
  already_whatsapp_queued: number;
  already_inapp_pending: number;
}> {
  const { db } = await import("@workspace/db");

  const sidCheck = await db.execute(sql`
    SELECT content_sid FROM paula_messages
    WHERE trigger_type = ${TRANSITION_TRIGGER} LIMIT 1
  `);
  const sidRow = sidCheck.rows[0] as Record<string, unknown> | undefined;
  const contentSid = (sidRow?.content_sid as string | null) ?? null;

  const qualifying = await db.execute(sql`
    SELECT
      u.telefono,
      u.pti_score           AS v4_score,
      s.pti_v5_total        AS v5_score,
      ABS(s.pti_v5_total - u.pti_score) AS delta
    FROM pti_v5_shadow_recompute s
    JOIN users u ON u.telefono = s.telefono
    WHERE u.pti_score IS NOT NULL
      AND u.is_test_account IS NOT TRUE
      AND ABS(s.pti_v5_total - u.pti_score) > ${DELTA_THRESHOLD}
    ORDER BY delta DESC
  `);

  const waQueued = await db.execute(sql`
    SELECT COUNT(*) AS cnt FROM paula_send_queue
    WHERE trigger_type = ${TRANSITION_TRIGGER} AND status NOT IN ('DEAD')
  `);

  let inappPending = 0;
  try {
    const inappCheck = await db.execute(sql`
      SELECT COUNT(*) AS cnt FROM pti_transition_notices WHERE shown_at IS NULL
    `);
    inappPending = Number((inappCheck.rows[0] as Record<string, unknown>).cnt ?? 0);
  } catch {
    // table may not exist yet (created lazily at dispatch time)
  }

  return {
    content_sid:              contentSid,
    content_sid_present:      Boolean(contentSid),
    qualifying_users:         (qualifying.rows as Array<Record<string, unknown>>).map(r => ({
      telefono: String(r.telefono),
      v4_score: Number(r.v4_score),
      v5_score: Number(r.v5_score),
      delta:    Number(r.delta),
    })),
    already_whatsapp_queued:  Number((waQueued.rows[0] as Record<string, unknown>).cnt ?? 0),
    already_inapp_pending:    inappPending,
  };
}
