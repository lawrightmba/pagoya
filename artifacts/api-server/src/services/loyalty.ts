/**
 * Loyalty points service — earn, tier, WhatsApp notification.
 * Never throws — all errors are logged and swallowed.
 */
import { db } from "@workspace/db";
import { sql, eq, and, gte, desc } from "drizzle-orm";
import { logger } from "../lib/logger.js";
import { sendWhatsApp } from "../lib/whatsapp.js";
import { getOrCreateWallet, creditWallet } from "../wallet/services/wallet.js";

// ─── Raw SQL helpers (tables not in drizzle schema yet) ──────────────────────

// Helper to run raw parameterised queries
async function rawOne<T = Record<string, unknown>>(
  query: string,
  params: unknown[] = [],
): Promise<T | undefined> {
  const result = await db.execute(sql.raw(query));
  // drizzle execute returns { rows: unknown[][] } for raw queries
  // We need to use tagged sql template for parameterised queries
  return undefined; // unused path
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface LoyaltyAccount {
  id: string;
  profile_id: string;
  phone: string;
  points_balance: number;
  points_lifetime: number;
  tier: "bronce" | "plata" | "oro";
}

// ─── Tier thresholds ─────────────────────────────────────────────────────────

const TIER_THRESHOLDS = { plata: 500, oro: 2000 };
const TIER_EMOJIS: Record<string, string> = { bronce: "🥉", plata: "🥈", oro: "🥇" };
const TIER_MULTIPLIERS: Record<string, number> = { bronce: 1, plata: 1.5, oro: 2 };

function calcTier(lifetime: number): "bronce" | "plata" | "oro" {
  if (lifetime >= TIER_THRESHOLDS.oro) return "oro";
  if (lifetime >= TIER_THRESHOLDS.plata) return "plata";
  return "bronce";
}

function nextTierInfo(lifetime: number): { next: string | null; ptsNeeded: number } {
  if (lifetime < TIER_THRESHOLDS.plata) {
    return { next: "plata", ptsNeeded: TIER_THRESHOLDS.plata - lifetime };
  }
  if (lifetime < TIER_THRESHOLDS.oro) {
    return { next: "oro", ptsNeeded: TIER_THRESHOLDS.oro - lifetime };
  }
  return { next: null, ptsNeeded: 0 };
}

// ─── Get or create loyalty account ───────────────────────────────────────────

async function getOrCreateAccount(phone: string): Promise<LoyaltyAccount | null> {
  // Find profile first
  const profileResult = await db.execute(
    sql`SELECT id FROM user_profiles WHERE phone = ${phone} LIMIT 1`,
  );
  const rows = profileResult.rows as Array<{ id: string }>;
  if (!rows.length) return null;
  const profileId = rows[0].id;

  // Upsert loyalty account
  await db.execute(
    sql`INSERT INTO loyalty_accounts (profile_id, phone, points_balance, points_lifetime, tier)
        VALUES (${profileId}, ${phone}, 0, 0, 'bronce')
        ON CONFLICT (phone) DO NOTHING`,
  );

  const accResult = await db.execute(
    sql`SELECT id, profile_id, phone, points_balance, points_lifetime, tier
        FROM loyalty_accounts WHERE phone = ${phone} LIMIT 1`,
  );
  const accRows = accResult.rows as LoyaltyAccount[];
  return accRows[0] ?? null;
}

// ─── Count payments for bonus logic ──────────────────────────────────────────

async function countPayments(accountId: string): Promise<number> {
  const r = await db.execute(
    sql`SELECT COUNT(*) AS cnt FROM loyalty_transactions
        WHERE account_id = ${accountId} AND type = 'earn'`,
  );
  const rows = r.rows as Array<{ cnt: string }>;
  return parseInt(rows[0]?.cnt ?? "0");
}

async function hasStreak7Days(accountId: string): Promise<boolean> {
  // Check if there is at least one earn tx for each of the last 7 calendar days
  const r = await db.execute(
    sql`SELECT COUNT(DISTINCT date_trunc('day', created_at)) AS days
        FROM loyalty_transactions
        WHERE account_id = ${accountId}
          AND type = 'earn'
          AND created_at >= now() - interval '7 days'`,
  );
  const rows = r.rows as Array<{ days: string }>;
  return parseInt(rows[0]?.days ?? "0") >= 7;
}

// ─── Record a transaction ─────────────────────────────────────────────────────

async function insertTransaction(
  accountId: string,
  phone: string,
  type: string,
  points: number,
  balanceAfter: number,
  description: string,
  paymentRef?: string,
): Promise<void> {
  await db.execute(
    sql`INSERT INTO loyalty_transactions
          (account_id, phone, type, points, balance_after, description, payment_ref)
        VALUES
          (${accountId}, ${phone}, ${type}, ${points}, ${balanceAfter}, ${description}, ${paymentRef ?? null})`,
  );
}

// ─── Update account balance and tier ─────────────────────────────────────────

async function updateAccount(
  accountId: string,
  newBalance: number,
  addedPoints: number,
): Promise<{ balance: number; lifetime: number; tier: string }> {
  const r = await db.execute(
    sql`UPDATE loyalty_accounts
        SET points_balance  = points_balance + ${addedPoints},
            points_lifetime = points_lifetime + ${addedPoints},
            updated_at      = now()
        WHERE id = ${accountId}
        RETURNING points_balance, points_lifetime, tier`,
  );
  const rows = r.rows as Array<{ points_balance: number; points_lifetime: number; tier: string }>;
  const updated = rows[0];
  const newTier = calcTier(updated.points_lifetime);

  if (newTier !== updated.tier) {
    await db.execute(
      sql`UPDATE loyalty_accounts
          SET tier = ${newTier}, tier_updated_at = now()
          WHERE id = ${accountId}`,
    );
  }

  return {
    balance: updated.points_balance,
    lifetime: updated.points_lifetime,
    tier: newTier,
  };
}

// ─── sendWhatsApp loyalty message ────────────────────────────────────────────

function sendLoyaltyWhatsApp(
  phone: string,
  pointsEarned: number,
  billerName: string,
  balance: number,
  tier: string,
): void {
  const tierEmoji = TIER_EMOJIS[tier] ?? "🥉";
  const msg =
    `🌟 +${pointsEarned} PagoYa Puntos por tu pago de ${billerName}. ` +
    `Saldo: ${balance} pts (${tierEmoji} ${tier.charAt(0).toUpperCase() + tier.slice(1)}). ` +
    `Canjea en pagoyamx.com/puntos`;
  sendWhatsApp(phone, msg).catch(() => {});
}

// ─── Main: earnPoints ─────────────────────────────────────────────────────────

export async function earnPoints(
  phone: string,
  amountMxn: number,
  paymentType: string,
  billerName = "servicio",
  paymentRef?: string,
): Promise<void> {
  try {
    const account = await getOrCreateAccount(phone);
    if (!account) {
      logger.warn({ phone }, "loyalty: no user_profile found for phone — skipping");
      return;
    }

    const tier = account.tier as "bronce" | "plata" | "oro";
    const multiplier = TIER_MULTIPLIERS[tier] ?? 1;

    // Base: 1 pt per $10 MXN
    let points = Math.floor((amountMxn / 10) * multiplier);

    // Bonus events
    const paymentCount = await countPayments(account.id);
    let bonusDesc = "";

    if (paymentCount === 0) {
      points += 25;
      bonusDesc += " +25 primer pago";
    }
    if (paymentCount === 4) {
      // This is the 5th payment (0-indexed)
      points += 50;
      bonusDesc += " +50 quinto pago";
    }
    if (paymentCount > 0 && await hasStreak7Days(account.id)) {
      points += 100;
      bonusDesc += " +100 racha 7 días";
    }

    if (points <= 0) points = 1; // minimum 1 point

    const newBalance = account.points_balance + points;
    const description = `Pago ${billerName} — $${amountMxn.toFixed(2)} MXN (×${multiplier})${bonusDesc}`;

    // Write to DB
    const updated = await updateAccount(account.id, newBalance, points);

    await insertTransaction(
      account.id,
      phone,
      "earn",
      points,
      updated.balance,
      description,
      paymentRef,
    );

    // WhatsApp (fire and forget)
    sendLoyaltyWhatsApp(phone, points, billerName, updated.balance, updated.tier);

    logger.info(
      { phone, points, tier, balance: updated.balance, paymentType },
      "loyalty: points earned",
    );
  } catch (err) {
    logger.error({ err, phone, amountMxn, paymentType }, "loyalty: earnPoints failed (non-fatal)");
  }
}

// ─── getBalance (for API route) ───────────────────────────────────────────────

export async function getLoyaltyBalance(phone: string): Promise<{
  points_balance: number;
  points_lifetime: number;
  tier: string;
  next_tier: string | null;
  points_to_next_tier: number;
  available_rewards: Array<{
    code: string;
    name_es: string;
    name_en: string;
    points_cost: number;
    reward_type: string;
    reward_value: number;
    can_redeem: boolean;
  }>;
} | null> {
  const r = await db.execute(
    sql`SELECT points_balance, points_lifetime, tier
        FROM loyalty_accounts WHERE phone = ${phone} LIMIT 1`,
  );
  const rows = r.rows as Array<{
    points_balance: number; points_lifetime: number; tier: string;
  }>;

  const rewardsResult = await db.execute(
    sql`SELECT code, name_es, name_en, points_cost, reward_type, reward_value
        FROM loyalty_rewards WHERE active = true ORDER BY points_cost`,
  );
  const rewards = rewardsResult.rows as Array<{
    code: string; name_es: string; name_en: string;
    points_cost: number; reward_type: string; reward_value: string;
  }>;

  if (!rows.length) {
    const { next, ptsNeeded } = nextTierInfo(0);
    return {
      points_balance: 0,
      points_lifetime: 0,
      tier: "bronce",
      next_tier: next,
      points_to_next_tier: ptsNeeded,
      available_rewards: rewards.map((rw) => ({
        ...rw,
        reward_value: parseFloat(rw.reward_value),
        can_redeem: false,
      })),
    };
  }

  const acct = rows[0];
  const { next, ptsNeeded } = nextTierInfo(acct.points_lifetime);
  return {
    points_balance: acct.points_balance,
    points_lifetime: acct.points_lifetime,
    tier: acct.tier,
    next_tier: next,
    points_to_next_tier: ptsNeeded,
    available_rewards: rewards.map((rw) => ({
      ...rw,
      reward_value: parseFloat(rw.reward_value),
      can_redeem: acct.points_balance >= rw.points_cost,
    })),
  };
}

// ─── redeemReward ─────────────────────────────────────────────────────────────

export async function redeemReward(phone: string, rewardCode: string): Promise<{
  success: boolean;
  discount_applied: number;
  new_balance: number;
  reward_type: string;
  redemption_token?: string;
  error?: string;
}> {
  // Load reward
  const rr = await db.execute(
    sql`SELECT id, points_cost, reward_type, reward_value, name_es
        FROM loyalty_rewards WHERE code = ${rewardCode} AND active = true LIMIT 1`,
  );
  const rewardRows = rr.rows as Array<{
    id: string; points_cost: number; reward_type: string;
    reward_value: string; name_es: string;
  }>;
  if (!rewardRows.length) {
    return { success: false, discount_applied: 0, new_balance: 0, reward_type: "", error: "Recompensa no encontrada." };
  }
  const reward = rewardRows[0];

  // Load account
  const ar = await db.execute(
    sql`SELECT id, points_balance FROM loyalty_accounts WHERE phone = ${phone} LIMIT 1`,
  );
  const accRows = ar.rows as Array<{ id: string; points_balance: number }>;
  if (!accRows.length) {
    return { success: false, discount_applied: 0, new_balance: 0, reward_type: reward.reward_type, error: "Cuenta de puntos no encontrada." };
  }
  const acct = accRows[0];

  if (acct.points_balance < reward.points_cost) {
    return { success: false, discount_applied: 0, new_balance: acct.points_balance, reward_type: reward.reward_type, error: "Puntos insuficientes." };
  }

  const deducted = -reward.points_cost;
  const newBalance = acct.points_balance - reward.points_cost;

  // Deduct
  await db.execute(
    sql`UPDATE loyalty_accounts
        SET points_balance = points_balance - ${reward.points_cost}, updated_at = now()
        WHERE id = ${acct.id}`,
  );

  await insertTransaction(
    acct.id,
    phone,
    "redeem",
    deducted,
    newBalance,
    `Canje: ${reward.name_es}`,
    rewardCode,
  );

  // ── FIX 1: wallet_credit — credit the wallet, roll back points on error ──────
  if (reward.reward_type === "wallet_credit") {
    try {
      const wallet = await getOrCreateWallet(phone);
      const rewardValueMxn = parseFloat(reward.reward_value);
      const walletTxDescription = `Canje de puntos — ${reward.name_es}`;

      // Insert pending wallet_transaction row (raw SQL — this table predates Drizzle schema here)
      const wtResult = await db.execute(
        sql`INSERT INTO wallet_transactions (wallet_id, type, amount_mxn, status, description)
            VALUES (${wallet.id}, 'loyalty_redemption', ${reward.reward_value}, 'pending', ${walletTxDescription})
            RETURNING id`,
      );
      const wtRows = wtResult.rows as Array<{ id: string }>;
      const walletTxId = wtRows[0]?.id;
      if (!walletTxId) throw new Error("wallet_transaction insert returned no id");

      await creditWallet(wallet.id, rewardValueMxn, walletTxId);
    } catch (creditErr) {
      logger.error({ creditErr, phone, rewardCode }, "loyalty: wallet credit failed — rolling back points");

      // Restore deducted points
      await db.execute(
        sql`UPDATE loyalty_accounts
            SET points_balance = points_balance + ${reward.points_cost}, updated_at = now()
            WHERE id = ${acct.id}`,
      );
      // Compensating ledger row so the history is auditable
      await insertTransaction(
        acct.id,
        phone,
        "redeem_reversal",
        reward.points_cost,
        acct.points_balance,
        "Saldo no acreditado — puntos restaurados",
        rewardCode,
      );

      return {
        success: false,
        discount_applied: 0,
        new_balance: acct.points_balance,
        reward_type: reward.reward_type,
        error: "No se pudo acreditar el saldo. Tus puntos no fueron afectados.",
      };
    }
  }

  // ── FIX 2 (existing): free_transaction — generate and store token ────────────
  let redemptionToken: string | undefined;
  if (reward.reward_type === "free_transaction") {
    const token = `FREE-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    await db.execute(
      sql`UPDATE loyalty_accounts
          SET redemption_tokens = array_append(redemption_tokens, ${token})
          WHERE id = ${acct.id}`,
    );
    redemptionToken = token;
  }

  // ── WhatsApp confirmation (non-blocking) ──────────────────────────────────────
  if (reward.reward_type === "wallet_credit") {
    sendWhatsApp(
      phone,
      `🎁 ¡Canjeaste ${reward.points_cost} puntos por $${parseFloat(reward.reward_value).toFixed(2)} MXN! Tu saldo fue acreditado en tu monedero PagoYa.`,
    ).then(() => {}).catch((err) => logger.error({ err }, "loyalty: WhatsApp notification failed"));
  } else if (reward.reward_type === "free_transaction" && redemptionToken) {
    sendWhatsApp(
      phone,
      `🎁 ¡Canjeaste ${reward.points_cost} puntos por un pago gratuito! Tu token: ${redemptionToken}. Úsalo en tu próximo pago para eliminar la comisión de $25 MXN.`,
    ).then(() => {}).catch((err) => logger.error({ err }, "loyalty: WhatsApp notification failed"));
  }

  return {
    success: true,
    discount_applied: parseFloat(reward.reward_value),
    new_balance: newBalance,
    reward_type: reward.reward_type,
    redemption_token: redemptionToken,
  };
}

// ─── History ──────────────────────────────────────────────────────────────────

export async function getLoyaltyHistory(phone: string, limit = 20): Promise<Array<{
  id: string; type: string; points: number; balance_after: number;
  description: string | null; created_at: string;
}>> {
  const r = await db.execute(
    sql`SELECT lt.id, lt.type, lt.points, lt.balance_after, lt.description, lt.created_at
        FROM loyalty_transactions lt
        WHERE lt.phone = ${phone}
        ORDER BY lt.created_at DESC
        LIMIT ${limit}`,
  );
  return r.rows as Array<{
    id: string; type: string; points: number; balance_after: number;
    description: string | null; created_at: string;
  }>;
}

// ─── Leaderboard ──────────────────────────────────────────────────────────────

export async function getLeaderboard(): Promise<Array<{
  tier: string; points_lifetime: number; masked_phone: string;
}>> {
  const r = await db.execute(
    sql`SELECT tier, points_lifetime, phone
        FROM loyalty_accounts
        ORDER BY points_lifetime DESC
        LIMIT 10`,
  );
  const rows = r.rows as Array<{ tier: string; points_lifetime: number; phone: string }>;
  return rows.map((row) => ({
    tier: row.tier,
    points_lifetime: row.points_lifetime,
    masked_phone: `•••• ${String(row.phone).slice(-4)}`,
  }));
}

// ─── Admin stats ─────────────────────────────────────────────────────────────

export async function getLoyaltyAdminStats(): Promise<{
  loyalty_accounts_total: number;
  points_issued_today: number;
  points_redeemed_today: number;
  tier_breakdown: { bronce: number; plata: number; oro: number };
  top_reward: string | null;
}> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [totalR, earnR, redeemR, tiersR, topR] = await Promise.all([
    db.execute(sql`SELECT COUNT(*) AS cnt FROM loyalty_accounts`),
    db.execute(
      sql`SELECT COALESCE(SUM(points), 0) AS pts FROM loyalty_transactions
          WHERE type = 'earn' AND created_at >= ${today}`,
    ),
    db.execute(
      sql`SELECT COALESCE(ABS(SUM(points)), 0) AS pts FROM loyalty_transactions
          WHERE type = 'redeem' AND created_at >= ${today}`,
    ),
    db.execute(
      sql`SELECT tier, COUNT(*) AS cnt FROM loyalty_accounts GROUP BY tier`,
    ),
    db.execute(
      sql`SELECT payment_ref AS code, COUNT(*) AS cnt
          FROM loyalty_transactions
          WHERE type = 'redeem'
            AND created_at >= date_trunc('month', now())
          GROUP BY payment_ref ORDER BY cnt DESC LIMIT 1`,
    ),
  ]);

  const tiers: Record<string, number> = { bronce: 0, plata: 0, oro: 0 };
  for (const row of tiersR.rows as Array<{ tier: string; cnt: string }>) {
    tiers[row.tier] = parseInt(row.cnt);
  }

  const totalRows = totalR.rows as Array<{ cnt: string }>;
  const earnRows = earnR.rows as Array<{ pts: string }>;
  const redeemRows = redeemR.rows as Array<{ pts: string }>;
  const topRows = topR.rows as Array<{ code: string }>;

  return {
    loyalty_accounts_total: parseInt(totalRows[0]?.cnt ?? "0"),
    points_issued_today: parseInt(earnRows[0]?.pts ?? "0"),
    points_redeemed_today: parseInt(redeemRows[0]?.pts ?? "0"),
    tier_breakdown: tiers as { bronce: number; plata: number; oro: number },
    top_reward: topRows[0]?.code ?? null,
  };
}
