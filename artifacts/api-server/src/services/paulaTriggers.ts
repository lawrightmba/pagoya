/**
 * Paula Trigger System — Sprint 2
 *
 * Evaluates counseling triggers every 6 hours for all active users.
 * Dead-letter protection: same trigger_type will not re-fire for a user
 * within COOLDOWN_DAYS (7 days by default).
 *
 * Trigger categories:
 *   Achievement  — positive momentum milestones
 *   Recovery     — negative momentum / re-engagement
 *   Educational  — PTI-gated financial literacy modules
 */

import { sql } from "drizzle-orm";
import { logger } from "../lib/logger.js";
import { sendWhatsApp } from "../lib/whatsapp.js";

// ── Trigger type registry ──────────────────────────────────────────────────────
export const TRIGGER = {
  // Achievement
  FIRST_PAYMENT:    "first_payment",
  PTI_CROSS_40:     "pti_cross_40",
  PTI_CROSS_60:     "pti_cross_60",
  PTI_CROSS_80:     "pti_cross_80",
  MILESTONE_90D:    "milestone_90d",
  // Recovery
  PTI_DROP_7D:      "pti_drop_7d",
  STALLED_14D:      "stalled_14d",
  PATTERN_LATE_2X:  "pattern_late_2x",
  // Educational (PTI-gated literacy modules)
  MODULE_UNLOCK_2:  "module_unlock_2",
  MODULE_UNLOCK_3:  "module_unlock_3",
  MODULE_UNLOCK_4:  "module_unlock_4",
  MODULE_UNLOCK_5:  "module_unlock_5",
} as const;

type TriggerType = (typeof TRIGGER)[keyof typeof TRIGGER];

const COOLDOWN_DAYS = 7;

// ── Dead-letter check ─────────────────────────────────────────────────────────
async function isOnCooldown(
  db: Awaited<ReturnType<typeof import("@workspace/db").default>>,
  telefono: string,
  triggerType: TriggerType,
): Promise<boolean> {
  const r = await db.execute(sql`
    SELECT 1 FROM paula_trigger_log
    WHERE telefono     = ${telefono}
      AND trigger_type = ${triggerType}
      AND fired_at     >= NOW() - INTERVAL '7 days'
    LIMIT 1
  `);
  return r.rows.length > 0;
}

// ── Fire a trigger: persist + send WhatsApp ───────────────────────────────────
async function fireTrigger(
  db: Awaited<ReturnType<typeof import("@workspace/db").default>>,
  telefono: string,
  triggerType: TriggerType,
  message: string,
  data: Record<string, unknown> = {},
): Promise<void> {
  // Persist first (fire-and-forget on WhatsApp failure is safe — log stays)
  const insertResult = await db.execute(sql`
    INSERT INTO paula_trigger_log
      (telefono, trigger_type, trigger_data, message_sent, whatsapp_sent, fired_at)
    VALUES
      (${telefono}, ${triggerType}, ${JSON.stringify(data)}::jsonb, ${message}, FALSE, NOW())
    RETURNING id
  `);
  const logId = (insertResult.rows[0] as Record<string, unknown>)?.id;

  await sendWhatsApp(telefono, message)
    .then(async () => {
      if (logId) {
        await db.execute(sql`
          UPDATE paula_trigger_log SET whatsapp_sent = TRUE WHERE id = ${logId}
        `).catch(() => {});
      }
    })
    .catch(err =>
      logger.warn({ err, telefono, triggerType }, "paulaTriggers: WhatsApp send failed — log preserved"),
    );
}

// ── Evaluate all triggers for one user ────────────────────────────────────────
export async function evaluateTriggersForUser(
  db: Awaited<ReturnType<typeof import("@workspace/db").default>>,
  telefono: string,
  nombre: string,
): Promise<number> {
  let fired = 0;

  // ── User context ─────────────────────────────────────────────────────────
  const userRow = await db.execute(sql`
    SELECT pti_score, consecutive_payment_months, kyc_status
    FROM users
    WHERE telefono = ${telefono}
    LIMIT 1
  `);
  if (!userRow.rows.length) return 0;

  const u            = userRow.rows[0] as Record<string, unknown>;
  const ptiScore     = u.pti_score != null ? Number(u.pti_score) : null;
  const streakMonths = Number(u.consecutive_payment_months ?? 0);

  // ── Payment stats ────────────────────────────────────────────────────────
  const payRow = await db.execute(sql`
    SELECT
      COUNT(*)         FILTER (WHERE status IN ('completed','success','completed_ok','confirmed'))                             AS total_paid,
      COUNT(*)         FILTER (WHERE status IN ('failed','late') AND created_at >= NOW() - INTERVAL '30 days')                AS late_30d,
      MAX(created_at)  FILTER (WHERE status IN ('completed','success','completed_ok','confirmed'))                             AS last_payment_at
    FROM bill_payments
    WHERE telefono = ${telefono}
  `);
  const p               = payRow.rows[0] as Record<string, unknown>;
  const totalPaid       = Number(p.total_paid ?? 0);
  const late30d         = Number(p.late_30d ?? 0);
  const lastPaymentAt   = p.last_payment_at ? new Date(p.last_payment_at as string) : null;
  const daysSincePay    = lastPaymentAt
    ? (Date.now() - lastPaymentAt.getTime()) / 86_400_000
    : Infinity;

  // ── PTI 7-day delta (from score history) ────────────────────────────────
  let ptiDelta7d: number | null = null;
  if (ptiScore != null) {
    const deltaRow = await db.execute(sql`
      SELECT pti_score AS old_score
      FROM pti_score_history
      WHERE telefono  = ${telefono}
        AND recorded_at <= NOW() - INTERVAL '7 days'
      ORDER BY recorded_at DESC
      LIMIT 1
    `);
    if (deltaRow.rows.length > 0) {
      const old = Number((deltaRow.rows[0] as Record<string, unknown>).old_score);
      ptiDelta7d = ptiScore - old;
    }
  }

  // ── Did the user previously have a score below threshold X? ─────────────
  async function hadScoreBelow(threshold: number): Promise<boolean> {
    const r = await db.execute(sql`
      SELECT 1 FROM pti_score_history
      WHERE telefono = ${telefono} AND pti_score < ${threshold}
      LIMIT 1
    `);
    return r.rows.length > 0;
  }

  async function crossedThresholdRecently(threshold: number): Promise<boolean> {
    const r = await db.execute(sql`
      SELECT 1 FROM pti_score_history
      WHERE telefono = ${telefono}
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
  if (totalPaid === 1 && !(await isOnCooldown(db, telefono, TRIGGER.FIRST_PAYMENT))) {
    const msg =
      `🎯 ¡Primer pago registrado, ${nombre}! Eso es exactamente cómo empieza un historial de confianza. ` +
      `Cada pago a tiempo es un ladrillo en tu reputación financiera. Sigamos construyendo.`;
    await fireTrigger(db, telefono, TRIGGER.FIRST_PAYMENT, msg, { total_paid: totalPaid });
    fired++;
  }

  // T2 — PTI crosses 40 (En Proceso floor)
  if (
    ptiScore != null && ptiScore >= 40 && ptiScore < 60 &&
    !(await isOnCooldown(db, telefono, TRIGGER.PTI_CROSS_40)) &&
    await hadScoreBelow(40) &&
    await crossedThresholdRecently(40)
  ) {
    const msg =
      `📈 Tu PTI llegó a ${ptiScore} puntos — cruzaste a *En Proceso*. ` +
      `Tu historial ya empieza a tomar forma real. ` +
      `Cada pago desde aquí construye el perfil que los prestamistas buscan.`;
    await fireTrigger(db, telefono, TRIGGER.PTI_CROSS_40, msg, { pti_score: ptiScore });
    fired++;
  }

  // T3 — PTI crosses 60 (Bueno floor)
  if (
    ptiScore != null && ptiScore >= 60 && ptiScore < 80 &&
    !(await isOnCooldown(db, telefono, TRIGGER.PTI_CROSS_60)) &&
    await hadScoreBelow(60) &&
    await crossedThresholdRecently(60)
  ) {
    const msg =
      `✅ Tu PTI llegó a ${ptiScore} puntos — alcanzaste el nivel *Bueno*. ` +
      `Las microfinancieras y algunas SOFOMs ya consideran perfiles como el tuyo. ` +
      `¿Quieres saber qué abre este nivel?`;
    await fireTrigger(db, telefono, TRIGGER.PTI_CROSS_60, msg, { pti_score: ptiScore });
    fired++;
  }

  // T4 — PTI crosses 80 (Excelente floor)
  if (
    ptiScore != null && ptiScore >= 80 &&
    !(await isOnCooldown(db, telefono, TRIGGER.PTI_CROSS_80)) &&
    await hadScoreBelow(80) &&
    await crossedThresholdRecently(80)
  ) {
    const msg =
      `🏆 Tu PTI llegó a ${ptiScore} puntos — nivel *Excelente*. ` +
      `Estás en el top 20% de usuarios PagoYa. ` +
      `A este nivel ya eres candidato para revisión de microcrédito formal. ` +
      `Escríbeme si quieres que te explique cómo funciona ese proceso.`;
    await fireTrigger(db, telefono, TRIGGER.PTI_CROSS_80, msg, { pti_score: ptiScore });
    fired++;
  }

  // T5 — 90-day consistency milestone
  if (streakMonths >= 3 && !(await isOnCooldown(db, telefono, TRIGGER.MILESTONE_90D))) {
    const msg =
      `🗓️ ¡3 meses de actividad consistente, ${nombre}! ` +
      `Eso es exactamente lo que los prestamistas formales buscan: ` +
      `90 días de comportamiento financiero verificado. Tu historial ya tiene el peso que importa.`;
    await fireTrigger(db, telefono, TRIGGER.MILESTONE_90D, msg, { streak_months: streakMonths });
    fired++;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RECOVERY TRIGGERS
  // ═══════════════════════════════════════════════════════════════════════════

  // T6 — PTI dropped ≥5 pts in 7 days
  if (
    ptiDelta7d != null && ptiDelta7d <= -5 &&
    !(await isOnCooldown(db, telefono, TRIGGER.PTI_DROP_7D))
  ) {
    const msg =
      `Hola ${nombre}. Noté que tu PTI bajó ${Math.abs(ptiDelta7d)} puntos esta semana. ` +
      `No pasa nada — un bajón no destruye el historial. ` +
      `¿Pagamos algo hoy para reactivar tu racha?`;
    await fireTrigger(db, telefono, TRIGGER.PTI_DROP_7D, msg, { delta_7d: ptiDelta7d, pti_score: ptiScore });
    fired++;
  }

  // T7 — No payment activity in 14+ days
  if (daysSincePay >= 14 && !(await isOnCooldown(db, telefono, TRIGGER.STALLED_14D))) {
    const msg =
      `Hola ${nombre}. Llevas un tiempo sin actividad en PagoYa. ` +
      `Cada semana inactiva tiene costo en tu historial de confianza. ` +
      `¿Qué servicio puedo ayudarte a pagar hoy?`;
    await fireTrigger(db, telefono, TRIGGER.STALLED_14D, msg, {
      days_since_last_payment: Math.floor(daysSincePay),
    });
    fired++;
  }

  // T8 — 2 late payments in 30 days (pattern)
  if (late30d >= 2 && !(await isOnCooldown(db, telefono, TRIGGER.PATTERN_LATE_2X))) {
    const msg =
      `Hola ${nombre}. Noté dos pagos tardíos este mes. ` +
      `No te preocupes — esto se recupera con consistencia. ` +
      `¿Quieres que te recuerde antes de tu próxima fecha de pago para no perder tu racha?`;
    await fireTrigger(db, telefono, TRIGGER.PATTERN_LATE_2X, msg, { late_30d: late30d });
    fired++;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EDUCATIONAL TRIGGERS (PTI milestone-gated)
  // ═══════════════════════════════════════════════════════════════════════════

  if (ptiScore != null) {
    // Module 2 unlock: PTI 30–49 — Cómo funciona el crédito en México
    if (ptiScore >= 30 && ptiScore < 50 && !(await isOnCooldown(db, telefono, TRIGGER.MODULE_UNLOCK_2))) {
      const msg =
        `📘 Tu PTI llegó a ${ptiScore} puntos — desbloqueaste algo. ` +
        `¿Sabías que en México solo el 35% de adultos tiene historial en el Buró de Crédito? ` +
        `Tú estás construyendo el tuyo, sin necesitar una tarjeta de banco. ` +
        `La próxima vez te explico cómo funciona por dentro.`;
      await fireTrigger(db, telefono, TRIGGER.MODULE_UNLOCK_2, msg, { pti_score: ptiScore });
      fired++;
    }

    // Module 3 unlock: PTI 50–64 — Buró de Crédito, mitos y realidades
    if (ptiScore >= 50 && ptiScore < 65 && !(await isOnCooldown(db, telefono, TRIGGER.MODULE_UNLOCK_3))) {
      const msg =
        `📘 Con ${ptiScore} pts de PTI, tu historial PagoYa ya construye el mismo tipo de reputación ` +
        `que un banco reporta al Buró de Crédito. ` +
        `Dato clave: el historial de pagos es el factor #1 en tu score formal. ` +
        `Eso es exactamente lo que estás haciendo.`;
      await fireTrigger(db, telefono, TRIGGER.MODULE_UNLOCK_3, msg, { pti_score: ptiScore });
      fired++;
    }

    // Module 4 unlock: PTI 65–79 — Qué buscan los bancos
    if (ptiScore >= 65 && ptiScore < 80 && !(await isOnCooldown(db, telefono, TRIGGER.MODULE_UNLOCK_4))) {
      const msg =
        `📘 Tu PTI de ${ptiScore} pts te pone en el rango que los bancos empiezan a considerar. ` +
        `Lo que buscan: pagos puntuales, variedad de servicios, consistencia en el tiempo. ` +
        `Tres cosas que ya tienes. ¿Te explico cómo funciona el proceso?`;
      await fireTrigger(db, telefono, TRIGGER.MODULE_UNLOCK_4, msg, { pti_score: ptiScore });
      fired++;
    }

    // Module 5 unlock: PTI 80+ — Primera solicitud de crédito formal
    if (ptiScore >= 80 && !(await isOnCooldown(db, telefono, TRIGGER.MODULE_UNLOCK_5))) {
      const msg =
        `🎓 Con ${ptiScore} pts de PTI estás en el nivel donde algunas instituciones ` +
        `ya pueden revisar tu caso para un microcrédito formal. ` +
        `¿Quieres que te explique cómo funciona ese proceso? No tienes que comprometerte a nada.`;
      await fireTrigger(db, telefono, TRIGGER.MODULE_UNLOCK_5, msg, { pti_score: ptiScore });
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

  const usersRow = await db.execute(sql`
    SELECT
      u.telefono,
      COALESCE(
        SPLIT_PART(NULLIF(TRIM(u.kyc_full_name), ''), ' ', 1),
        'amig@'
      ) AS nombre
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

  const users = usersRow.rows as Array<{ telefono: string; nombre: string }>;
  let totalFired = 0;
  let errors     = 0;

  for (const user of users) {
    try {
      const fired = await evaluateTriggersForUser(db, user.telefono, user.nombre ?? "amig@");
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
