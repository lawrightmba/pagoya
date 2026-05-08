import { db, userProfilesTable, userBillersTable, reminderLogTable } from "@workspace/db";
import { eq, and, isNotNull, sql } from "drizzle-orm";
import { logger } from "../lib/logger.js";
import { sendWhatsApp } from "../lib/whatsapp.js";

/**
 * Send a WhatsApp message via Twilio.
 */
async function sendWhatsAppReminder(phone: string, message: string): Promise<void> {
  await sendWhatsApp(phone, message);
}

function buildMessage(params: {
  language: string;
  name: string | null;
  billerName: string;
  reminderDaysBefore: number;
  phone: string;
}): string {
  const { language, name, billerName, reminderDaysBefore, phone } = params;
  const displayName = name ?? "usuario";
  const ref = encodeURIComponent(phone);

  if (language === "en") {
    return (
      `💡 Hi ${displayName}, your ${billerName} is due in ` +
      `${reminderDaysBefore} day${reminderDaysBefore !== 1 ? "s" : ""}. ` +
      `Pay in under 2 min: https://pagoyamx.com/?ref=${ref}`
    );
  }
  return (
    `💡 Hola ${displayName}, tu ${billerName} vence en ` +
    `${reminderDaysBefore} día${reminderDaysBefore !== 1 ? "s" : ""}. ` +
    `Paga en menos de 2 min: https://pagoyamx.com/?ref=${ref}`
  );
}

/**
 * Daily reminder engine — runs at 9 AM Mexico City time (15:00 UTC).
 * Queries user_billers whose payment_day is (today + reminder_days_before)
 * and who haven't paid this month yet.
 */
export async function runDailyReminders(): Promise<void> {
  logger.info("reminders: starting daily reminder run");

  const today = new Date();
  const todayDayOfMonth = today.getUTCDate();

  // Start of current month in UTC
  const startOfMonth = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));

  try {
    // Fetch all eligible billers joined with their profile
    const billers = await db
      .select({
        billerId: userBillersTable.billerId,
        billerName: userBillersTable.billerName,
        profileId: userBillersTable.profileId,
        reminderDaysBefore: userBillersTable.reminderDaysBefore,
        lastPaidAt: userBillersTable.lastPaidAt,
        paymentDay: userBillersTable.paymentDay,
        phone: userProfilesTable.phone,
        name: userProfilesTable.name,
        language: userProfilesTable.language,
        reminderOptedIn: userProfilesTable.reminderOptedIn,
      })
      .from(userBillersTable)
      .innerJoin(userProfilesTable, eq(userBillersTable.profileId, userProfilesTable.id))
      .where(
        and(
          eq(userBillersTable.reminderEnabled, true),
          eq(userProfilesTable.reminderOptedIn, true),
          isNotNull(userBillersTable.paymentDay),
        ),
      );

    let sent = 0;
    let skipped = 0;

    for (const biller of billers) {
      const { paymentDay, reminderDaysBefore, lastPaidAt } = biller;

      // Check if today is the reminder day: payment_day - reminder_days_before
      if (paymentDay === null) continue;
      const dueDay = paymentDay;
      const reminderDay = dueDay - reminderDaysBefore;
      if (todayDayOfMonth !== reminderDay) {
        skipped++;
        continue;
      }

      // Check if already paid this month
      if (lastPaidAt && new Date(lastPaidAt) >= startOfMonth) {
        skipped++;
        continue;
      }

      const message = buildMessage({
        language: biller.language,
        name: biller.name,
        billerName: biller.billerName,
        reminderDaysBefore,
        phone: biller.phone,
      });

      let status: "sent" | "failed" = "failed";
      try {
        await sendWhatsAppReminder(biller.phone, message);
        status = "sent";
        sent++;
      } catch (err) {
        logger.error({ err, phone: biller.phone, billerId: biller.billerId }, "reminders: send failed");
      }

      // Log every attempt
      await db.insert(reminderLogTable).values({
        profileId: biller.profileId,
        billerId: biller.billerId,
        channel: "whatsapp",
        status,
        message,
      }).catch((err) => logger.error({ err }, "reminders: failed to log reminder"));
    }

    logger.info({ sent, skipped, total: billers.length }, "reminders: daily run complete");
  } catch (err) {
    logger.error({ err }, "reminders: daily run failed");
  }
}

/**
 * Schedules the daily reminder job at 9 AM Mexico City time (15:00 UTC).
 */
export function startReminderCron(): void {
  function msUntilNext(): number {
    const now = new Date();
    const next = new Date();
    next.setUTCHours(15, 0, 0, 0); // 9 AM Mexico City (UTC-6)
    if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
    return next.getTime() - now.getTime();
  }

  function scheduleNext() {
    const delay = msUntilNext();
    logger.info({ nextInMs: delay }, "reminders: daily reminder cron scheduled");
    setTimeout(() => {
      runDailyReminders().catch((err) => logger.error({ err }, "reminders: uncaught error"));
      setInterval(() => {
        runDailyReminders().catch((err) => logger.error({ err }, "reminders: uncaught error"));
      }, 24 * 60 * 60 * 1000);
    }, delay);
  }

  scheduleNext();
}
