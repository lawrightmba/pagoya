import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "../lib/logger.js";
import { getUserMissions } from "../services/missions.js";
import { creditWallet, getOrCreateWallet } from "../wallet/services/wallet.js";

const router = Router();

// ─── Spin wheel prize pool ────────────────────────────────────────────────────
// slot_index matches the visual order in SpinWheel.tsx SLOTS array
const SPIN_PRIZES = [
  { slot_index: 0, type: "puntos",            label: "+50 Puntos",   value: 50,   weight: 30, is_grand_prize_entry: false },
  { slot_index: 1, type: "cashback",          label: "$25 MXN saldo", value: 25,  weight: 8,  is_grand_prize_entry: false },
  { slot_index: 2, type: "puntos",            label: "+100 Puntos",  value: 100,  weight: 25, is_grand_prize_entry: false },
  { slot_index: 3, type: "grand_prize_entry", label: "Gran Premio",  value: 0,    weight: 5,  is_grand_prize_entry: true  },
  { slot_index: 4, type: "puntos",            label: "+200 Puntos",  value: 200,  weight: 15, is_grand_prize_entry: false },
  { slot_index: 5, type: "cashback",          label: "$50 MXN saldo", value: 50,  weight: 7,  is_grand_prize_entry: false },
  { slot_index: 6, type: "puntos",            label: "+500 Puntos",  value: 500,  weight: 10, is_grand_prize_entry: false },
];

function pickSpinPrize() {
  const total = SPIN_PRIZES.reduce((s, p) => s + p.weight, 0);
  let r = Math.random() * total;
  for (const prize of SPIN_PRIZES) {
    r -= prize.weight;
    if (r <= 0) return prize;
  }
  return SPIN_PRIZES[0];
}

// ─── GET /api/games/spin/status?telefono=... ─────────────────────────────────
router.get("/spin/status", async (req: Request, res: Response) => {
  const telefono = (req.query.telefono as string | undefined)?.trim();
  if (!telefono) { res.status(400).json({ error: "telefono requerido" }); return; }

  try {
    const existing = await db.execute(sql`
      SELECT prize_type, prize_label, prize_value, is_grand_prize_entry
      FROM spin_results WHERE telefono = ${telefono} LIMIT 1
    `);

    if (existing.rows[0]) {
      const row = existing.rows[0] as Record<string, unknown>;
      res.json({
        hasSpun: true,
        prize: {
          prize_type: row.prize_type,
          prize_label: row.prize_label,
          prize_value: Number(row.prize_value),
          is_grand_prize_entry: row.is_grand_prize_entry,
        },
      });
      return;
    }

    res.json({ hasSpun: false });
  } catch (err) {
    logger.error({ err, telefono }, "games/spin/status: failed");
    res.status(500).json({ error: "Error al consultar estado." });
  }
});

// ─── POST /api/games/spin ─────────────────────────────────────────────────────
router.post("/spin", async (req: Request, res: Response) => {
  const { telefono } = req.body as { telefono?: string };
  if (!telefono) { res.status(400).json({ error: "telefono requerido" }); return; }

  try {
    // Guard: already spun?
    const existing = await db.execute(sql`
      SELECT id FROM spin_results WHERE telefono = ${telefono} LIMIT 1
    `);
    if (existing.rows[0]) {
      res.status(409).json({ error: "Ya giraste tu ruleta.", alreadySpun: true });
      return;
    }

    const prize = pickSpinPrize();

    // Save result
    await db.execute(sql`
      INSERT INTO spin_results (telefono, prize_type, prize_label, prize_value, slot_index, is_grand_prize_entry)
      VALUES (${telefono}, ${prize.type}, ${prize.label}, ${prize.value}, ${prize.slot_index}, ${prize.is_grand_prize_entry})
    `);

    // Credit prize
    if (prize.type === "puntos" && prize.value > 0) {
      await db.execute(sql`
        INSERT INTO loyalty_transactions (phone, type, points, description, created_at)
        VALUES (${telefono}, 'earn', ${prize.value}, 'Ruleta de Bienvenida', NOW())
        ON CONFLICT DO NOTHING
      `).catch(() => {});

      await db.execute(sql`
        UPDATE loyalty_accounts
        SET points_balance = points_balance + ${prize.value},
            points_lifetime = points_lifetime + ${prize.value},
            updated_at = now()
        WHERE phone = ${telefono}
      `).catch(() => {});
    }

    if (prize.type === "cashback" && prize.value > 0) {
      try {
        const wallet = await getOrCreateWallet(telefono);
        const wtResult = await db.execute(sql`
          INSERT INTO wallet_transactions (wallet_id, type, amount_mxn, status, description)
          VALUES (${wallet.id}, 'loyalty_redemption', ${prize.value}, 'pending', 'Premio Ruleta de Bienvenida')
          RETURNING id
        `);
        const wtId = (wtResult.rows[0] as { id: string }).id;
        await creditWallet(wallet.id, prize.value, wtId);
      } catch (creditErr) {
        logger.error({ creditErr, telefono }, "games/spin: cashback credit failed");
      }
    }

    if (prize.is_grand_prize_entry) {
      // Add entry to current month's grand prize draw
      const month = new Date().toISOString().slice(0, 7); // YYYY-MM
      await db.execute(sql`
        INSERT INTO monthly_grand_prize (month, total_entries)
        VALUES (${month}, 1)
        ON CONFLICT (month) DO UPDATE
          SET total_entries = monthly_grand_prize.total_entries + 1
      `);

      // Store entrant in a separate lookup (using spin_results is_grand_prize_entry flag)
      logger.info({ telefono, month }, "games/spin: grand prize entry recorded");
    }

    logger.info({ telefono, prize }, "games/spin: spun");
    res.json({
      ok: true,
      prize_type: prize.type,
      prize_label: prize.label,
      prize_value: prize.value,
      slot_index: prize.slot_index,
      is_grand_prize_entry: prize.is_grand_prize_entry,
    });
  } catch (err) {
    logger.error({ err, telefono }, "games/spin: failed");
    res.status(500).json({ error: "Error al procesar ruleta." });
  }
});

// ─── Scratch card routes (unchanged) ─────────────────────────────────────────

const PRIZE_POOL = [
  { type: "puntos",   label: "+5 Puntos",        value: 5,  weight: 35 },
  { type: "puntos",   label: "+10 Puntos",        value: 10, weight: 25 },
  { type: "puntos",   label: "+25 Puntos",        value: 25, weight: 15 },
  { type: "cashback", label: "$1 MXN saldo",      value: 1,  weight: 12 },
  { type: "cashback", label: "$5 MXN saldo",      value: 5,  weight: 8  },
  { type: "nothing",  label: "Inténtalo mañana",  value: 0,  weight: 5  },
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

function generateCard() {
  const win = weightedRandom();
  const isWin = Math.random() < 0.4;
  if (isWin) {
    return { zones: [win, win, win], reward: win };
  }
  const a = weightedRandom();
  const b = weightedRandom();
  const c = weightedRandom();
  const third = c.label === a.label && c.label === b.label
    ? PRIZE_POOL.find(p => p.label !== c.label) ?? PRIZE_POOL[5]
    : c;
  return {
    zones: [a, b, third],
    reward: { type: "nothing", label: "Inténtalo mañana", value: 0 },
  };
}

router.get("/scratch", async (req: Request, res: Response) => {
  const telefono = (req.query.telefono as string | undefined)?.trim();
  if (!telefono) { res.status(400).json({ error: "telefono requerido" }); return; }
  try {
    const existing = await db.execute(sql`
      SELECT * FROM scratch_card_plays
      WHERE telefono = ${telefono} AND play_date = CURRENT_DATE LIMIT 1
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

router.post("/scratch", async (req: Request, res: Response) => {
  const { telefono } = req.body as { telefono?: string };
  if (!telefono) { res.status(400).json({ error: "telefono requerido" }); return; }
  try {
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
      VALUES (${telefono}, CURRENT_DATE, ${reward.type}, ${reward.value}, ${JSON.stringify(zones)}::jsonb)
    `);
    if (reward.type === "puntos" && reward.value > 0) {
      await db.execute(sql`
        INSERT INTO loyalty_transactions (phone, type, points, description, created_at)
        VALUES (${telefono}, 'earn', ${reward.value}, 'Raspa y Gana', NOW())
        ON CONFLICT DO NOTHING
      `).catch(() => {});
    }
    if (reward.type === "cashback" && reward.value > 0) {
      await db.execute(sql`
        INSERT INTO wallet_transactions (telefono, type, amount_mxn, status, description, created_at)
        VALUES (${telefono}, 'RASPA_GANA', ${reward.value}, 'confirmed', 'Premio Raspa y Gana', NOW())
      `).catch(() => {});
    }
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

// ─── GET /api/games/missions?telefono=... ─────────────────────────────────────
router.get("/missions", async (req: Request, res: Response) => {
  const telefono = (req.query.telefono as string | undefined)?.trim();
  if (!telefono) { res.status(400).json({ error: "telefono requerido" }); return; }
  try {
    const missions = await getUserMissions(telefono);
    res.json({ missions });
  } catch (err) {
    logger.error({ err, telefono }, "games/missions GET: failed");
    res.status(500).json({ error: "Error al consultar misiones." });
  }
});

// ─── GET /api/games/grand-prize ───────────────────────────────────────────────
router.get("/grand-prize", async (_req: Request, res: Response) => {
  try {
    const month = new Date().toISOString().slice(0, 7);
    const r = await db.execute(sql`
      SELECT month, winner_telefono, prize_amount, awarded_at, total_entries
      FROM monthly_grand_prize WHERE month = ${month} LIMIT 1
    `);
    const row = r.rows[0] as Record<string, unknown> | undefined;
    res.json({
      month,
      prize_amount: 2000,
      total_entries: row ? Number(row.total_entries) : 0,
      winner: row?.winner_telefono
        ? `•••• ${String(row.winner_telefono).slice(-4)}`
        : null,
      awarded_at: row?.awarded_at ?? null,
    });
  } catch (err) {
    logger.error({ err }, "games/grand-prize: failed");
    res.status(500).json({ error: "Error." });
  }
});

export default router;
