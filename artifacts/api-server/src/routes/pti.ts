/**
 * PTI API Routes
 *
 * GET  /api/pti/score?telefono=xxx  — returns current user's PTI score
 * POST /api/pti/compute-now         — admin: trigger immediate compute for a user
 */

import { Router, type Request, type Response } from "express";
import { sql } from "drizzle-orm";
import { logger } from "../lib/logger.js";
import { computePTIForUser, getPTITier, type PTIBreakdown } from "../services/pti.js";

const router = Router();

// ── GET /api/pti/score?telefono=xxx ──────────────────────────────────────────
router.get("/score", async (req: Request, res: Response): Promise<void> => {
  const telefono = req.query.telefono as string | undefined;
  if (!telefono) {
    res.status(400).json({ error: "telefono requerido" });
    return;
  }

  try {
    const { db } = await import("@workspace/db");
    const row = await db.execute(sql`
      SELECT pti_score, pti_breakdown, pti_computed_at, pti_first_computed_at
      FROM users WHERE telefono = ${telefono} LIMIT 1
    `);

    const r = row.rows[0] as Record<string, unknown> | undefined;
    if (!r) {
      res.status(404).json({ error: "Usuario no encontrado" });
      return;
    }

    if (r.pti_score == null) {
      res.json({
        score: null,
        is_new_user: true,
        message: "Tu primer puntaje se calculará el próximo día 1 del mes.",
      });
      return;
    }

    const score = Number(r.pti_score);
    const { tier, label: tier_label, color: tier_color } = getPTITier(score);
    const computedAt = r.pti_computed_at as string | null;

    // Compute next update: 1st of next month
    const now = new Date();
    const nextUpdate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const nextUpdateStr = nextUpdate.toISOString().split("T")[0];

    res.json({
      score,
      tier,
      tier_label,
      tier_color,
      breakdown: r.pti_breakdown as PTIBreakdown,
      computed_at: computedAt,
      next_update: nextUpdateStr,
      is_new_user: false,
    });
  } catch (err) {
    logger.error({ err, telefono }, "pti: GET /score failed");
    res.status(500).json({ error: "Error calculando puntaje" });
  }
});

// ── POST /api/pti/compute-now ────────────────────────────────────────────────
// Triggers immediate score computation for a specific user.
// Admin token allows computing for any user; no token = self-service (telefono required).
router.post("/compute-now", async (req: Request, res: Response): Promise<void> => {
  const { telefono } = req.body as { telefono?: string };
  if (!telefono) {
    res.status(400).json({ error: "telefono requerido" });
    return;
  }

  try {
    const breakdown = await computePTIForUser(telefono);
    const { tier, label: tier_label, color: tier_color } = getPTITier(breakdown.total);
    res.json({ score: breakdown.total, tier, tier_label, tier_color, breakdown });
  } catch (err) {
    logger.error({ err, telefono }, "pti: POST /compute-now failed");
    res.status(500).json({ error: "Error calculando puntaje" });
  }
});

// ── GET /api/pti/trend/:telefono ─────────────────────────────────────────────
// Returns 30-day PTI trend label, delta, and coaching message.
// Trend labels: IMPROVING | PLATEAUING | DECLINING | STALLED | NEUTRAL | NEW
router.get("/trend/:telefono", async (req: Request, res: Response): Promise<void> => {
  const rawTel = req.params.telefono ?? "";
  if (!rawTel) {
    res.status(400).json({ error: "telefono requerido" });
    return;
  }

  try {
    const { db } = await import("@workspace/db");
    const tel10 = rawTel.replace(/\D/g, "").slice(-10);

    const row = await db.execute(sql`
      SELECT pti_score, score_30d_ago, delta_30d, trend_label,
             last_payment_at, payments_30d, recorded_at
      FROM pti_trend_30d
      WHERE telefono = ${tel10}
      LIMIT 1
    `);

    if (!row.rows.length) {
      res.json({
        telefono: tel10,
        trend_label: "NEW",
        delta_30d: 0,
        coaching_message: "Estás construyendo tu primer historial de confianza. Cada pago que hagas suma. ¡Vamos bien!",
      });
      return;
    }

    const r = row.rows[0] as Record<string, unknown>;
    const trendLabel = (r.trend_label as string) ?? "NEW";
    const delta      = Number(r.delta_30d ?? 0);
    const score      = Number(r.pti_score ?? 0);
    const payments30 = Number(r.payments_30d ?? 0);

    const coachingMessages: Record<string, string> = {
      IMPROVING:    `Tu PTI subió ${delta} puntos este mes — vas en la dirección correcta. Eso equivale a mejorar tu historial de pagos ante el Buró de Crédito.`,
      ACCELERATING: `Tu PTI subió ${delta} puntos y todas tus dimensiones están mejorando. Estás en modo acelerado — las SOFOMs y microfinancieras notarían este perfil.`,
      PLATEAUING:   `Tu PTI está estable en ${score} pts. Para subir más rápido, enfócate en tu dimensión con más oportunidad este mes.`,
      DECLINING:    `Tu PTI bajó ${Math.abs(delta)} puntos este mes. No pasa nada — un bajón no destruye el historial. Paguemos algo hoy para reactivar tu racha.`,
      STALLED:      `Llevas un tiempo sin actividad. Cada semana inactiva tiene costo en tu historial de confianza. ¿Qué servicio podemos pagar hoy?`,
      NEUTRAL:      `Tu PTI tuvo movimiento leve este mes. La consistencia es el factor más importante — sigue así.`,
      NEW:          `Estás construyendo tu primer historial de confianza. Cada pago que hagas suma. ¡Vamos bien!`,
    };

    res.json({
      telefono: tel10,
      pti_score: score,
      score_30d_ago: r.score_30d_ago != null ? Number(r.score_30d_ago) : null,
      delta_30d: delta,
      trend_label: trendLabel,
      payments_30d: payments30,
      last_payment_at: r.last_payment_at ?? null,
      coaching_message: coachingMessages[trendLabel] ?? coachingMessages.NEUTRAL,
    });
  } catch (err) {
    logger.error({ err, rawTel }, "pti: GET /trend failed");
    res.status(500).json({ error: "Error calculando tendencia" });
  }
});

export default router;
