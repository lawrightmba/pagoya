import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "../lib/logger.js";
import { computePagoScore } from "../services/pagoScore.js";

const router = Router();

// POST /api/events — log a behavioral event for credit scoring
// Body: { telefono, event_type, metadata? }
router.post("/", async (req: Request, res: Response) => {
  const { telefono, event_type, metadata = {} } = req.body as {
    telefono?: string;
    event_type?: string;
    metadata?: Record<string, unknown>;
  };

  if (!telefono || !event_type) {
    res.status(400).json({ error: "telefono and event_type required" });
    return;
  }

  const ALLOWED_EVENTS = new Set([
    "login", "session_end", "bill_paid", "wallet_loaded", "wallet_checked",
    "game_played", "recarga_initiated", "feature_viewed", "referral_sent",
    "push_opened", "streak_completed", "loyalty_checked",
  ]);

  if (!ALLOWED_EVENTS.has(event_type)) {
    res.status(400).json({ error: "unknown event_type" });
    return;
  }

  try {
    await db.execute(sql`
      INSERT INTO user_events (telefono, event_type, metadata)
      VALUES (${telefono}, ${event_type}, ${JSON.stringify(metadata)}::jsonb)
    `);

    // Recompute PagoScore asynchronously — don't block the response
    setImmediate(() => computePagoScore(telefono));

    res.json({ ok: true });
  } catch (err) {
    logger.error({ err, telefono, event_type }, "events: log failed");
    res.status(500).json({ error: "Error al registrar evento." });
  }
});

// GET /api/events/score/:telefono — admin view of PagoScore
router.get("/score/:telefono", async (req: Request, res: Response) => {
  const { telefono } = req.params;
  try {
    const rows = await db.execute(sql`
      SELECT * FROM credit_profiles WHERE telefono = ${telefono} LIMIT 1
    `);
    if (!rows.rows[0]) {
      // Trigger first computation
      const score = await computePagoScore(telefono);
      res.json(score ?? { telefono, pagoScore: 0 });
    } else {
      const row = rows.rows[0] as Record<string, unknown>;
      res.json({
        telefono,
        pagoScore: row.pago_score,
        paymentScore: row.payment_score,
        routineScore: row.routine_score,
        engagementScore: row.engagement_score,
        walletScore: row.wallet_score,
        socialScore: row.social_score,
        billsPaid: row.bills_paid,
        loginStreakDays: row.login_streak_days,
        lastComputedAt: row.last_computed_at,
      });
    }
  } catch (err) {
    logger.error({ err, telefono }, "events/score: failed");
    res.status(500).json({ error: "Error al obtener PagoScore." });
  }
});

export default router;
