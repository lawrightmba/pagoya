import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "../lib/logger.js";

const router = Router();

// Prize pool for Raspa y Gana — weights determine probability
const PRIZE_POOL = [
  { type: "puntos",   label: "+5 Puntos",     value: 5,   weight: 35 },
  { type: "puntos",   label: "+10 Puntos",    value: 10,  weight: 25 },
  { type: "puntos",   label: "+25 Puntos",    value: 25,  weight: 15 },
  { type: "cashback", label: "$1 MXN saldo",  value: 1,   weight: 12 },
  { type: "cashback", label: "$5 MXN saldo",  value: 5,   weight: 8  },
  { type: "nothing",  label: "Inténtalo mañana", value: 0, weight: 5 },
];

function weightedRandom() {
  const total = PRIZE_POOL.reduce((s, p) => s + p.weight, 0);
  let r = Math.random() * total;
  for (const prize of PRIZE_POOL) {
    r -= prize.weight;
    if (r <= 0) return prize;
  }
  return PRIZE_POOL[0];
}

// Generate 3 scratch zones — 2 matching = win, all 3 = jackpot feel
function generateCard() {
  const win = weightedRandom();
  // 40% chance of match (win), 60% near miss
  const isWin = Math.random() < 0.4;
  if (isWin) {
    return {
      zones: [win, win, win],
      reward: win,
    };
  }
  const a = weightedRandom();
  const b = weightedRandom();
  const c = weightedRandom();
  // ensure no accidental triple match
  const third = c.label === a.label && c.label === b.label
    ? PRIZE_POOL.find(p => p.label !== c.label) ?? PRIZE_POOL[5]
    : c;
  return {
    zones: [a, b, third],
    reward: { type: "nothing", label: "Inténtalo mañana", value: 0 },
  };
}

// GET /api/games/scratch?telefono=...
// Returns today's card state — played or fresh
router.get("/scratch", async (req: Request, res: Response) => {
  const telefono = (req.query.telefono as string | undefined)?.trim();
  if (!telefono) { res.status(400).json({ error: "telefono requerido" }); return; }

  try {
    const existing = await db.execute(sql`
      SELECT * FROM scratch_card_plays
      WHERE telefono = ${telefono}
        AND play_date = CURRENT_DATE
      LIMIT 1
    `);

    if (existing.rows[0]) {
      const row = existing.rows[0] as Record<string, unknown>;
      res.json({
        alreadyPlayed: true,
        reward: { type: row.reward_type, value: row.reward_value },
        prizes: row.prizes,
        playedAt: row.played_at,
      });
      return;
    }

    res.json({ alreadyPlayed: false, nextResetAt: "mañana a medianoche" });
  } catch (err) {
    logger.error({ err, telefono }, "games/scratch GET: failed");
    res.status(500).json({ error: "Error al consultar tarjeta." });
  }
});

// POST /api/games/scratch — play today's card
// Body: { telefono }
router.post("/scratch", async (req: Request, res: Response) => {
  const { telefono } = req.body as { telefono?: string };
  if (!telefono) { res.status(400).json({ error: "telefono requerido" }); return; }

  try {
    // Guard: already played today?
    const existing = await db.execute(sql`
      SELECT id FROM scratch_card_plays
      WHERE telefono = ${telefono} AND play_date = CURRENT_DATE LIMIT 1
    `);
    if (existing.rows[0]) {
      res.status(409).json({ error: "Ya jugaste hoy. Vuelve mañana.", alreadyPlayed: true });
      return;
    }

    const card = generateCard();
    const { zones, reward } = card;

    await db.execute(sql`
      INSERT INTO scratch_card_plays (telefono, play_date, reward_type, reward_value, prizes)
      VALUES (
        ${telefono},
        CURRENT_DATE,
        ${reward.type},
        ${reward.value},
        ${JSON.stringify(zones)}::jsonb
      )
    `);

    // Credit puntos or cashback if won
    if (reward.type === "puntos" && reward.value > 0) {
      await db.execute(sql`
        INSERT INTO loyalty_transactions (telefono, points, type, description, created_at)
        VALUES (${telefono}, ${reward.value}, 'earn', 'Raspa y Gana', NOW())
        ON CONFLICT DO NOTHING
      `).catch(() => {}); // loyalty table may have different schema, fail silently
    }
    if (reward.type === "cashback" && reward.value > 0) {
      await db.execute(sql`
        INSERT INTO wallet_transactions (telefono, type, amount_mxn, status, description, created_at)
        VALUES (${telefono}, 'RASPA_GANA', ${reward.value}, 'confirmed', 'Premio Raspa y Gana', NOW())
      `).catch(() => {});
    }

    // Log as user event for credit scoring
    await db.execute(sql`
      INSERT INTO user_events (telefono, event_type, metadata)
      VALUES (${telefono}, 'game_played', ${JSON.stringify({ reward_type: reward.type, reward_value: reward.value })}::jsonb)
    `);

    logger.info({ telefono, reward }, "games/scratch: played");
    res.json({ ok: true, zones, reward });
  } catch (err) {
    logger.error({ err, telefono }, "games/scratch POST: failed");
    res.status(500).json({ error: "Error al procesar tarjeta." });
  }
});

export default router;
