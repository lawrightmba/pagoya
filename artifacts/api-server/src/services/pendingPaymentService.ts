import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "../lib/logger.js";

const TTL_MINUTES = 5;

export interface PendingPaymentRow {
  serviceId: string;
  serviceName: string;
  referencia: string;
  monto: number;
  telefono: string;
}

/**
 * Upsert a pending payment for a phone key.
 * Any existing pending payment for this phone_key is replaced.
 * expires_at is set to NOW() + 5 minutes by the DB.
 */
export async function createPendingPayment(
  phoneKey: string,
  payment: PendingPaymentRow,
): Promise<void> {
  await db.execute(
    sql`INSERT INTO pending_payments
          (phone_key, service_id, service_name, referencia, monto, telefono, expires_at)
        VALUES (
          ${phoneKey},
          ${payment.serviceId},
          ${payment.serviceName},
          ${payment.referencia},
          ${payment.monto},
          ${payment.telefono},
          NOW() + INTERVAL '${sql.raw(String(TTL_MINUTES))} minutes'
        )
        ON CONFLICT (phone_key) DO UPDATE SET
          service_id   = EXCLUDED.service_id,
          service_name = EXCLUDED.service_name,
          referencia   = EXCLUDED.referencia,
          monto        = EXCLUDED.monto,
          telefono     = EXCLUDED.telefono,
          staged_at    = NOW(),
          expires_at   = NOW() + INTERVAL '${sql.raw(String(TTL_MINUTES))} minutes',
          created_at   = NOW()`,
  );
}

/**
 * Returns the active pending payment for a phone key, or null if none / expired.
 * Expiry is enforced in SQL (expires_at > NOW()), so this is restart-safe.
 */
export async function getPendingPayment(phoneKey: string): Promise<PendingPaymentRow | null> {
  const rows = await db.execute(
    sql`SELECT service_id, service_name, referencia, monto::float, telefono
        FROM pending_payments
        WHERE phone_key = ${phoneKey}
          AND expires_at > NOW()
        LIMIT 1`,
  );

  const row = rows.rows[0] as Record<string, unknown> | undefined;
  if (!row) return null;

  return {
    serviceId:   row.service_id as string,
    serviceName: row.service_name as string,
    referencia:  row.referencia as string,
    monto:       row.monto as number,
    telefono:    row.telefono as string,
  };
}

/**
 * Delete the pending payment for a phone key (after confirm or cancel).
 */
export async function deletePendingPayment(phoneKey: string): Promise<void> {
  await db.execute(
    sql`DELETE FROM pending_payments WHERE phone_key = ${phoneKey}`,
  );
}

/**
 * Purge all rows whose expires_at is in the past.
 * Called by the cleanup cron — not required for correctness but keeps the table tidy.
 */
export async function cleanExpiredPayments(): Promise<number> {
  const result = await db.execute(
    sql`DELETE FROM pending_payments WHERE expires_at <= NOW()`,
  );
  const count = (result as unknown as { rowCount?: number }).rowCount ?? 0;
  if (count > 0) {
    logger.info({ count }, "pendingPayments: cleaned expired rows");
  }
  return count;
}
