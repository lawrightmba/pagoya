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
import { buildPTIv2Profile, buildExpectedObligations } from "../services/ptiV2.js";

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

// ── GET /api/pti/uncelebrated?telefono=xxx ────────────────────────────────────
// Returns the pending milestone celebration data if the user has one, or null.
// Called by Home.tsx on load to decide whether to show the confetti modal.
const MILESTONE_META: Record<string, {
  label: string; emoji: string; tier: string;
  unlocks: string; freeBillCredits: number; mxn: number; tagline: string;
}> = {
  bronce: {
    label: "Bronce", emoji: "🥉", tier: "Bronce",
    unlocks: "Historial financiero activo + Módulo 1 de educación financiera",
    freeBillCredits: 1, mxn: 0,
    tagline: "Tu historial está registrado. Paga a tiempo y sigue creciendo.",
  },
  plata: {
    label: "Plata", emoji: "🥈", tier: "Plata",
    unlocks: "Módulo 2 de educación financiera + racha de pagos visible en la app",
    freeBillCredits: 2, mxn: 0,
    tagline: "Tu consistencia ya te diferencia. El historial trabaja para ti.",
  },
  oro: {
    label: "Oro", emoji: "🥇", tier: "Oro",
    unlocks: "Módulos 3–4 + desglose PTI completo visible en la app",
    freeBillCredits: 3, mxn: 0,
    tagline: "Top 25% de usuarios PagoYa. Lo que viene vale la pena.",
  },
  elite: {
    label: "Élite", emoji: "💎", tier: "Élite",
    unlocks: "Módulo 5 + perfil en radar de socios financieros",
    freeBillCredits: 3, mxn: 150,
    tagline: "Top 5%. Estás construyendo algo real.",
  },
  ready: {
    label: "Perfil Listo", emoji: "🚀", tier: "Élite",
    unlocks: "Tu expediente financiero está listo — socios financieros podrían estar interesados en tu perfil",
    freeBillCredits: 5, mxn: 300,
    tagline: "Meses de pagos puntuales te trajeron aquí. Esto es lo que construiste.",
  },
};

router.get("/uncelebrated", async (req: Request, res: Response): Promise<void> => {
  const telefono = req.query.telefono as string | undefined;
  if (!telefono) { res.status(400).json({ error: "telefono requerido" }); return; }

  try {
    const { db } = await import("@workspace/db");
    const row = await db.execute(sql`
      SELECT pti_uncelebrated_milestone, free_bill_credits
      FROM users WHERE telefono = ${telefono} LIMIT 1
    `);
    const r = row.rows[0] as Record<string, unknown> | undefined;
    if (!r || !r.pti_uncelebrated_milestone) {
      res.json({ milestone: null });
      return;
    }
    const slug = r.pti_uncelebrated_milestone as string;
    const meta = MILESTONE_META[slug];
    if (!meta) { res.json({ milestone: null }); return; }

    res.json({
      milestone: {
        slug,
        ...meta,
        free_bill_credits_balance: Number(r.free_bill_credits ?? 0),
      },
    });
  } catch (err) {
    logger.error({ err, telefono }, "pti: GET /uncelebrated failed");
    res.status(500).json({ error: "Error" });
  }
});

// ── POST /api/pti/celebrate ───────────────────────────────────────────────────
// Marks the pending milestone as celebrated so the modal doesn't show again.
router.post("/celebrate", async (req: Request, res: Response): Promise<void> => {
  const { telefono } = req.body as { telefono?: string };
  if (!telefono) { res.status(400).json({ error: "telefono requerido" }); return; }

  try {
    const { db } = await import("@workspace/db");
    await db.execute(sql`
      UPDATE users SET pti_uncelebrated_milestone = NULL WHERE telefono = ${telefono}
    `);
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err, telefono }, "pti: POST /celebrate failed");
    res.status(500).json({ error: "Error" });
  }
});

// ── GET /api/pti/v2-profile?telefono=xxx ─────────────────────────────────────
// Internal/admin-only endpoint. Returns the PTI v2 behavioral profile for a
// user, built by reading existing v5 state — no recomputation occurs.
//
// This endpoint is additive: it does not alter users.pti_score,
// users.pti_breakdown, pti_score_history, or pti_trend_snapshots.
//
// The response is NOT a creditworthiness assessment, probability of default,
// or validated lending recommendation. It is the existing deterministic PTI
// behavioral score presented in the v2 vocabulary.
router.get("/v2-profile", async (req: Request, res: Response): Promise<void> => {
  const token = (req.headers["authorization"] ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!token || token !== process.env.ADMIN_TOKEN) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const telefono = req.query.telefono as string | undefined;
  if (!telefono) {
    res.status(400).json({ error: "telefono requerido" });
    return;
  }

  try {
    const profile = await buildPTIv2Profile(telefono);
    if (!profile) {
      res.status(404).json({ error: "No v5 score found for this user" });
      return;
    }
    res.json(profile);
  } catch (err) {
    logger.error({ err, telefono }, "pti: GET /v2-profile failed");
    res.status(500).json({ error: "Error building v2 profile" });
  }
});

// ── GET /api/pti/v2-expected-obligations?telefono=xxx ────────────────────────
// Returns the Expected Obligations result for a user — computed on read from
// confirmed bill_payments, no database writes.
//
// This endpoint is additive and purely descriptive:
//   - Does NOT modify any scoring column, PTI dimension, or user record.
//   - Does NOT interpret UNRESOLVED/STALE lifecycle states as risk signals.
//   - Does NOT require bank account, KYC, SPEI, or card data — works for
//     cash-only users from bill_payments history alone.
//
// Authorization: requires ADMIN_TOKEN bearer header.
router.get("/v2-expected-obligations", async (req: Request, res: Response): Promise<void> => {
  const token = (req.headers["authorization"] ?? "").replace(/^Bearer\s+/i, "").trim();
  if (!token || token !== process.env.ADMIN_TOKEN) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const telefono = req.query.telefono as string | undefined;
  if (!telefono) {
    res.status(400).json({ error: "telefono requerido" });
    return;
  }

  try {
    const result = await buildExpectedObligations(telefono);
    res.json(result);
  } catch (err) {
    logger.error({ err, telefono }, "pti: GET /v2-expected-obligations failed");
    res.status(500).json({ error: "Error building expected obligations" });
  }
});

export default router;
