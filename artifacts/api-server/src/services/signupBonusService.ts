import { eq, and, gt, or, sql } from "drizzle-orm";
import {
  db,
  usersTable,
  walletsTable,
  walletTransactionsTable,
  repVelocityFlagsTable,
  signupBonusConfigTable,
} from "@workspace/db";
import { logger } from "../lib/logger.js";

// ─── Shared helper: load config row id=1 ─────────────────────────────────────
async function loadConfig() {
  const [config] = await db
    .select()
    .from(signupBonusConfigTable)
    .where(eq(signupBonusConfigTable.id, 1))
    .limit(1);
  return config ?? null;
}

// ─── 1. checkBonusEligibility ─────────────────────────────────────────────────
export async function checkBonusEligibility(
  phone: string,
  curp: string,
  refCode?: string,
): Promise<
  | { eligible: true; amount: string }
  | { eligible: false; reason: "duplicate" | "inactive" | "rep_not_eligible" | "config_missing" | "error" }
> {
  try {
    // Duplicate check — phone already in users table; also check CURP if one was provided
    const dupConditions = curp
      ? or(eq(usersTable.telefono, phone), eq(usersTable.kycCurp, curp))
      : eq(usersTable.telefono, phone);
    const existing = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(dupConditions)
      .limit(1);

    if (existing.length > 0) {
      logger.info({ phone, curp }, "signupBonusService.checkBonusEligibility: duplicate");
      return { eligible: false, reason: "duplicate" };
    }

    // Config check
    const config = await loadConfig();
    if (!config) {
      logger.error({}, "signupBonusService.checkBonusEligibility: config row missing");
      return { eligible: false, reason: "config_missing" };
    }

    if (!config.isActive) {
      return { eligible: false, reason: "inactive" };
    }

    // Rep code check (only if config restricts to specific codes)
    if (config.eligibleRepCodes) {
      const allowed = config.eligibleRepCodes
        .split(",")
        .map((c) => c.trim().toUpperCase());
      if (!refCode || !allowed.includes(refCode.trim().toUpperCase())) {
        logger.info({ refCode }, "signupBonusService.checkBonusEligibility: rep not eligible");
        return { eligible: false, reason: "rep_not_eligible" };
      }
    }

    return { eligible: true, amount: config.bonusAmount };
  } catch (err) {
    logger.error({ err, phone }, "signupBonusService.checkBonusEligibility: error");
    return { eligible: false, reason: "error" };
  }
}

// ─── 2. checkRepVelocity ──────────────────────────────────────────────────────
export async function checkRepVelocity(repCode: string): Promise<{
  allowed: boolean;
  flag: "WARNING" | "BLOCK" | null;
  count: number;
}> {
  // Organic / web sign-ups are not associated with any rep — skip velocity check.
  if (repCode === "WEB") {
    return { allowed: true, flag: null, count: 0 };
  }

  try {
    const config = await loadConfig();
    const warningThreshold = config?.warningThreshold ?? 10;
    const blockThreshold = config?.blockThreshold ?? 20;

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const rows = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(repVelocityFlagsTable)
      .where(
        and(
          eq(repVelocityFlagsTable.repCode, repCode),
          gt(repVelocityFlagsTable.flaggedAt, oneHourAgo),
        ),
      );

    const count = rows[0]?.count ?? 0;

    if (count >= blockThreshold) {
      logger.warn({ repCode, count }, "signupBonusService.checkRepVelocity: BLOCK");
      return { allowed: false, flag: "BLOCK", count };
    }

    if (count >= warningThreshold) {
      logger.warn({ repCode, count }, "signupBonusService.checkRepVelocity: WARNING");
      return { allowed: true, flag: "WARNING", count };
    }

    return { allowed: true, flag: null, count };
  } catch (err) {
    logger.error({ err, repCode }, "signupBonusService.checkRepVelocity: error");
    // Fail open — don't block the user if the velocity check itself errors
    return { allowed: true, flag: null, count: 0 };
  }
}

// ─── 3. creditSignupBonus ─────────────────────────────────────────────────────
export async function creditSignupBonus(
  userId: number,
  repCode: string,
  amount: number,
): Promise<{ success: boolean; amount?: number; reason?: "already_claimed" | "wallet_not_found" | "error" }> {
  try {
    // Confirm not already claimed + get phone for wallet lookup
    const [user] = await db
      .select({
        telefono: usersTable.telefono,
        signupBonusClaimed: usersTable.signupBonusClaimed,
      })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

    if (!user) {
      return { success: false, reason: "error" };
    }

    if (user.signupBonusClaimed) {
      logger.info({ userId }, "signupBonusService.creditSignupBonus: already claimed");
      return { success: false, reason: "already_claimed" };
    }

    // Find wallet by phone (wallets.user_id references users.telefono)
    const [wallet] = await db
      .select({ id: walletsTable.id })
      .from(walletsTable)
      .where(eq(walletsTable.userId, user.telefono))
      .limit(1);

    if (!wallet) {
      logger.warn({ userId, phone: user.telefono }, "signupBonusService.creditSignupBonus: wallet not found");
      return { success: false, reason: "wallet_not_found" };
    }

    // Insert wallet transaction
    const isWebSignup = repCode === "WEB";
    await db.insert(walletTransactionsTable).values({
      walletId: wallet.id,
      type: "SIGNUP_BONUS",
      amountMxn: String(amount),
      status: "completed",
      description: isWebSignup
        ? "Bono de bienvenida — registro web"
        : `Bono de bienvenida — ref: ${repCode}`,
    });

    // Mark bonus as claimed on user record
    await db
      .update(usersTable)
      .set({ signupBonusClaimed: true, signupBonusEligible: false })
      .where(eq(usersTable.id, userId));

    // Velocity check — insert flag row if WARNING or BLOCK (skip for WEB/organic)
    if (!isWebSignup) {
      const velocity = await checkRepVelocity(repCode);
      if (velocity.flag === "WARNING" || velocity.flag === "BLOCK") {
        await db.insert(repVelocityFlagsTable).values({
          repCode,
          userPhone: user.telefono,
          flagType: velocity.flag,
          hourlyCount: velocity.count,
        });
        logger.warn({ repCode, flag: velocity.flag, count: velocity.count }, "signupBonusService: velocity flag inserted");
      }
    }

    logger.info({ userId, repCode, amount }, "signupBonusService.creditSignupBonus: success");
    return { success: true, amount };
  } catch (err) {
    logger.error({ err, userId, repCode }, "signupBonusService.creditSignupBonus: error");
    return { success: false, reason: "error" };
  }
}
