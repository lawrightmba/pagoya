/**
 * Taecel background cron jobs:
 *
 * 1. pendingReconciliation — every 10 minutes
 *    Polls statusTXN for bill_payments with status='pending' & provider='siprel'
 *    created more than 5 minutes ago, and updates their status.
 *
 * 2. dailyProductCacheRefresh — daily at 6 AM Mexico City time (UTC-6)
 *    Calls getProducts once and stores in taecel_product_cache.
 *
 * 3. dailySalesReconciliation — daily at 11 PM Mexico City time (UTC-6)
 *    Calls getSales for yesterday and stores discrepancies in daily_reconciliation.
 */

import { db, billPaymentsTable, dailyReconciliationTable } from "@workspace/db";
import { eq, and, lt, gt } from "drizzle-orm";
import { taecelGetProducts, taecelGetSales, taecelStatusTXN } from "../providers/siprel.js";
import { sendWhatsAppReceipt } from "../lib/notifications.js";
import { logger } from "../../lib/logger.js";

// ── HELPER: ms since a date ───────────────────────────────────────────────────
function msAgo(d: Date): number {
  return Date.now() - d.getTime();
}

// ── JOB 1: Pending transaction reconciliation (every 10 min) ─────────────────
export async function pendingReconciliation(): Promise<void> {
  logger.info("taecel-cron: pendingReconciliation running");

  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);

  let pending: typeof billPaymentsTable.$inferSelect[];
  try {
    pending = await db
      .select()
      .from(billPaymentsTable)
      .where(
        and(
          eq(billPaymentsTable.status, "pending"),
          eq(billPaymentsTable.providerUsed, "siprel"),
          lt(billPaymentsTable.createdAt, fiveMinAgo),
        ),
      );
  } catch (err) {
    logger.error({ err }, "taecel-cron: pendingReconciliation DB query failed");
    return;
  }

  logger.info({ count: pending.length }, "taecel-cron: pending transactions found");

  for (const payment of pending) {
    const transId = payment.taecelTransId;
    if (!transId) continue;

    try {
      const statusRes = await taecelStatusTXN(transId);

      if (statusRes.success === true && !Array.isArray(statusRes.data)) {
        const d = statusRes.data as Record<string, string | undefined>;
        const folio = d.Folio ?? transId;
        const carrier = d.Carrier ?? "";
        const cargoMxn = parseFloat((d.Cargo ?? "$0").replace(/[$,]/g, "")) || 0;

        await db
          .update(billPaymentsTable)
          .set({
            status: "confirmed",
            confirmationCode: folio,
            taecelFolio: folio,
            taecelCarrier: carrier,
            taecelCargoMxn: String(cargoMxn),
            bolsaType: d.Bolsa ?? null,
          })
          .where(eq(billPaymentsTable.id, payment.id));

        // Send WhatsApp receipt now that it's confirmed
        sendWhatsAppReceipt({
          telefono: payment.telefono,
          serviceName: payment.serviceName,
          monto: parseFloat(payment.monto),
          referencia: payment.referencia,
          confirmationCode: folio,
          provider: "siprel",
        }).catch(() => {});

        logger.info({ paymentId: payment.id, transId, folio }, "taecel-cron: pending payment confirmed");
      } else if (statusRes.success === false) {
        await db
          .update(billPaymentsTable)
          .set({ status: "failed", confirmationCode: "failed" })
          .where(eq(billPaymentsTable.id, payment.id));

        logger.warn({ paymentId: payment.id, transId }, "taecel-cron: pending payment confirmed as failed");
      }
      // Otherwise still in process — leave pending for next run
    } catch (err) {
      logger.error({ err, paymentId: payment.id, transId }, "taecel-cron: statusTXN check failed for pending payment");
    }
  }
}

// ── JOB 2: Daily product cache refresh (6 AM Mexico City = 12:00 UTC) ────────
export async function dailyProductCacheRefresh(): Promise<void> {
  logger.info("taecel-cron: dailyProductCacheRefresh running");
  try {
    await taecelGetProducts();
    logger.info("taecel-cron: product cache refreshed successfully");
  } catch (err) {
    logger.error({ err }, "taecel-cron: dailyProductCacheRefresh failed");
  }
}

// ── JOB 3: Daily sales reconciliation (11 PM Mexico City = 05:00 UTC next day) ─
export async function dailySalesReconciliation(): Promise<void> {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const fecha = yesterday.toISOString().slice(0, 10);

  logger.info({ fecha }, "taecel-cron: dailySalesReconciliation running");

  try {
    const salesData = await taecelGetSales(fecha) as Array<{ TransID?: string; Monto?: string }> | null;
    const taecelCount = Array.isArray(salesData) ? salesData.length : 0;

    // Count PagoYa bill_payments for the same date (siprel, confirmed)
    const dayStart = new Date(`${fecha}T00:00:00Z`);
    const dayEnd = new Date(`${fecha}T23:59:59Z`);

    const pagoyaPayments = await db
      .select()
      .from(billPaymentsTable)
      .where(
        and(
          eq(billPaymentsTable.providerUsed, "siprel"),
          eq(billPaymentsTable.status, "confirmed"),
          gt(billPaymentsTable.createdAt, dayStart),
          lt(billPaymentsTable.createdAt, dayEnd),
        ),
      );

    const pagoyaCount = pagoyaPayments.length;
    const discrepancies: string[] = [];

    if (taecelCount !== pagoyaCount) {
      discrepancies.push(
        `Count mismatch: Taecel=${taecelCount}, PagoYa=${pagoyaCount}`,
      );
      logger.warn({ fecha, taecelCount, pagoyaCount }, "taecel-cron: reconciliation discrepancy");
    } else {
      logger.info({ fecha, taecelCount }, "taecel-cron: reconciliation matched");
    }

    await db.insert(dailyReconciliationTable).values({
      fecha,
      totalTaecel: taecelCount,
      totalPagoya: pagoyaCount,
      discrepancies: JSON.stringify(discrepancies),
    });
  } catch (err) {
    logger.error({ err, fecha }, "taecel-cron: dailySalesReconciliation failed");
  }
}

// ── SCHEDULER ────────────────────────────────────────────────────────────────
// Simple setInterval-based scheduler. Cron times are approximate; for
// production use a proper scheduler (node-cron, pg-boss, etc.) when needed.
export function startTaecelCrons(): void {
  // Pending reconciliation — every 10 minutes
  setInterval(() => {
    pendingReconciliation().catch((err) => logger.error({ err }, "taecel-cron: pendingReconciliation uncaught"));
  }, 10 * 60 * 1000);

  // Schedule product cache refresh at 6 AM Mexico City (UTC-6 = 12:00 UTC)
  // and daily reconciliation at 11 PM Mexico City (05:00 UTC next day)
  function scheduleDailyAt(utcHour: number, fn: () => Promise<void>, label: string) {
    function msUntilNext(): number {
      const now = new Date();
      const next = new Date();
      next.setUTCHours(utcHour, 0, 0, 0);
      if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
      return next.getTime() - now.getTime();
    }

    function scheduleNext() {
      const delay = msUntilNext();
      logger.info({ label, nextInMs: delay }, `taecel-cron: ${label} scheduled`);
      setTimeout(() => {
        fn().catch((err) => logger.error({ err }, `taecel-cron: ${label} uncaught`));
        setInterval(() => {
          fn().catch((err) => logger.error({ err }, `taecel-cron: ${label} uncaught`));
        }, 24 * 60 * 60 * 1000);
      }, delay);
    }

    scheduleNext();
  }

  scheduleDailyAt(12, dailyProductCacheRefresh, "dailyProductCacheRefresh"); // 6 AM Mexico
  scheduleDailyAt(5,  dailySalesReconciliation, "dailySalesReconciliation"); // 11 PM Mexico

  logger.info("taecel-cron: all cron jobs scheduled");
}
