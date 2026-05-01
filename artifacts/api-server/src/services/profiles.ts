import { db, userProfilesTable, userBillersTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { logger } from "../lib/logger.js";

/**
 * Upserts user_profiles and user_billers after a successful payment.
 * Never throws — errors are logged and swallowed so callers are not affected.
 * Returns the profile_id on success, or null on error.
 */
export async function captureUserProfile(params: {
  phone: string;
  billerId: string;
  billerName: string;
  amount: number;
  repId?: string;
}): Promise<string | null> {
  const { phone, billerId, billerName, amount, repId } = params;

  try {
    // 1. Upsert user_profiles on phone
    const [profile] = await db
      .insert(userProfilesTable)
      .values({
        phone,
        repId: repId ?? null,
        acquisitionSource: repId ? "rep" : "organic",
      })
      .onConflictDoUpdate({
        target: userProfilesTable.phone,
        set: {
          updatedAt: sql`now()`,
          // preserve repId if already set; only set if new
          repId: sql`COALESCE(user_profiles.rep_id, EXCLUDED.rep_id)`,
        },
      })
      .returning({ id: userProfilesTable.id });

    if (!profile) return null;
    const profileId = profile.id;

    // 2. Upsert user_billers on (profile_id, biller_id)
    //    Rolling average: typical = existing * 0.7 + new * 0.3
    const today = new Date();
    const paymentDay = today.getDate();

    await db
      .insert(userBillersTable)
      .values({
        profileId,
        billerId,
        billerName,
        typicalAmount: String(amount),
        paymentDay,
        lastPaidAt: today,
        lastAmount: String(amount),
      })
      .onConflictDoUpdate({
        target: [userBillersTable.profileId, userBillersTable.billerId],
        set: {
          billerName,
          typicalAmount: sql`ROUND((user_billers.typical_amount * 0.7 + ${amount} * 0.3)::numeric, 2)`,
          lastPaidAt: today,
          lastAmount: String(amount),
          paymentDay: sql`COALESCE(user_billers.payment_day, ${paymentDay})`,
          updatedAt: sql`now()`,
        },
      });

    logger.info({ phone, billerId, profileId }, "profiles: upserted user profile and biller");
    return profileId;
  } catch (err) {
    logger.error({ err, phone, billerId }, "profiles: captureUserProfile failed (non-fatal)");
    return null;
  }
}
