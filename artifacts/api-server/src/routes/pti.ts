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

export default router;
