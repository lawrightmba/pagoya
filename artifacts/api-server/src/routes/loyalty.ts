import { Router, type Request, type Response } from "express";
import {
  getLoyaltyBalance,
  redeemReward,
  getLoyaltyHistory,
  getLeaderboard,
} from "../services/loyalty.js";
import { logger } from "../lib/logger.js";

const router = Router();

// GET /api/loyalty/balance/:phone
router.get("/balance/:phone", async (req: Request, res: Response) => {
  const { phone } = req.params;
  try {
    const balance = await getLoyaltyBalance(phone);
    res.json(balance ?? {
      points_balance: 0,
      points_lifetime: 0,
      tier: "bronce",
      next_tier: "plata",
      points_to_next_tier: 500,
      available_rewards: [],
    });
  } catch (err) {
    logger.error({ err, phone }, "loyalty: balance lookup failed");
    res.status(500).json({ error: "Error al consultar puntos." });
  }
});

// POST /api/loyalty/redeem
// Body: { phone: string, reward_code: string }
router.post("/redeem", async (req: Request, res: Response) => {
  const { phone, reward_code } = req.body as { phone?: string; reward_code?: string };
  if (!phone || !reward_code) {
    res.status(400).json({ error: "Se requieren 'phone' y 'reward_code'." });
    return;
  }
  try {
    const result = await redeemReward(phone, reward_code);
    if (!result.success) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.json(result);
  } catch (err) {
    logger.error({ err, phone, reward_code }, "loyalty: redeem failed");
    res.status(500).json({ error: "Error al canjear puntos." });
  }
});

// GET /api/loyalty/history/:phone
router.get("/history/:phone", async (req: Request, res: Response) => {
  const { phone } = req.params;
  const limit = Math.min(parseInt(String(req.query.limit ?? "20")) || 20, 100);
  try {
    const history = await getLoyaltyHistory(phone, limit);
    res.json({ history });
  } catch (err) {
    logger.error({ err, phone }, "loyalty: history lookup failed");
    res.status(500).json({ error: "Error al obtener historial." });
  }
});

// GET /api/loyalty/leaderboard
router.get("/leaderboard", async (_req: Request, res: Response) => {
  try {
    const leaderboard = await getLeaderboard();
    res.json({ leaderboard });
  } catch (err) {
    logger.error({ err }, "loyalty: leaderboard failed");
    res.status(500).json({ error: "Error al obtener leaderboard." });
  }
});

export default router;
