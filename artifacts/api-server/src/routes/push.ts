import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "../lib/logger.js";

const router = Router();

// GET /api/push/vapid-public-key
router.get("/vapid-public-key", (_req: Request, res: Response) => {
  const key = process.env.VAPID_PUBLIC_KEY;
  if (!key) {
    res.status(503).json({ error: "Push notifications not configured." });
    return;
  }
  res.json({ publicKey: key });
});

// POST /api/push/subscribe
// Body: { telefono, subscription: { endpoint, keys: { p256dh, auth } }, userAgent? }
router.post("/subscribe", async (req: Request, res: Response) => {
  const { telefono, subscription, userAgent } = req.body as {
    telefono?: string;
    subscription?: { endpoint: string; keys: { p256dh: string; auth: string } };
    userAgent?: string;
  };

  if (!telefono || !subscription?.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
    res.status(400).json({ error: "telefono y subscription requeridos." });
    return;
  }

  try {
    await db.execute(
      sql`INSERT INTO push_subscriptions (telefono, endpoint, p256dh, auth, user_agent)
          VALUES (${telefono}, ${subscription.endpoint}, ${subscription.keys.p256dh}, ${subscription.keys.auth}, ${userAgent ?? null})
          ON CONFLICT (telefono, endpoint) DO UPDATE SET
            p256dh = EXCLUDED.p256dh,
            auth = EXCLUDED.auth,
            user_agent = EXCLUDED.user_agent`,
    );
    logger.info({ telefono }, "push: subscription saved");
    res.json({ success: true });
  } catch (err) {
    logger.error({ err, telefono }, "push: subscribe failed");
    res.status(500).json({ error: "Error al guardar suscripción." });
  }
});

// DELETE /api/push/unsubscribe
// Body: { telefono, endpoint? } — if no endpoint, removes all for user
router.delete("/unsubscribe", async (req: Request, res: Response) => {
  const { telefono, endpoint } = req.body as { telefono?: string; endpoint?: string };

  if (!telefono) {
    res.status(400).json({ error: "telefono requerido." });
    return;
  }

  try {
    if (endpoint) {
      await db.execute(
        sql`DELETE FROM push_subscriptions WHERE telefono = ${telefono} AND endpoint = ${endpoint}`,
      );
    } else {
      await db.execute(
        sql`DELETE FROM push_subscriptions WHERE telefono = ${telefono}`,
      );
    }
    res.json({ success: true });
  } catch (err) {
    logger.error({ err, telefono }, "push: unsubscribe failed");
    res.status(500).json({ error: "Error al eliminar suscripción." });
  }
});

export default router;
