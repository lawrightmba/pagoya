import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "../lib/logger.js";

const STAGING_TTL_MINUTES = 30;
const CONFIRMED_TTL_MINUTES = 5;

export interface PendingPaymentRow {
  serviceId: string;
  serviceName: string;
  referencia: string;
  monto: number;
  telefono: string;
  fee: number;
  walletBalance: number;
  status: "awaiting_confirmation" | "confirmed";
}

/**
 * Upsert a pending payment for a phone key.
 * Any existing pending payment for this phone_key is replaced.
 * Initial TTL = 30 minutes (generous window for user to read and confirm).
 * status = 'awaiting_confirmation' — must be explicitly confirmed before execution.
 */
export async function createPendingPayment(
  phoneKey: string,
  payment: Omit<PendingPaymentRow, "status">,
): Promise<void> {
  await db.execute(
    sql`INSERT INTO pending_payments
          (phone_key, service_id, service_name, referencia, monto, telefono, fee, wallet_balance, status, expires_at)
        VALUES (
          ${phoneKey},
          ${payment.serviceId},
          ${payment.serviceName},
          ${payment.referencia},
          ${payment.monto},
          ${payment.telefono},
          ${payment.fee},
          ${payment.walletBalance},
          'awaiting_confirmation',
          NOW() + INTERVAL '${sql.raw(String(STAGING_TTL_MINUTES))} minutes'
        )
        ON CONFLICT (phone_key) DO UPDATE SET
          service_id     = EXCLUDED.service_id,
          service_name   = EXCLUDED.service_name,
          referencia     = EXCLUDED.referencia,
          monto          = EXCLUDED.monto,
          telefono       = EXCLUDED.telefono,
          fee            = EXCLUDED.fee,
          wallet_balance = EXCLUDED.wallet_balance,
          status         = 'awaiting_confirmation',
          staged_at      = NOW(),
          expires_at     = NOW() + INTERVAL '${sql.raw(String(STAGING_TTL_MINUTES))} minutes',
          created_at     = NOW()`,
  );
}

/**
 * Transition a pending payment from awaiting_confirmation → confirmed.
 * Resets TTL to 5 minutes from now (spec: TTL starts from moment user says SÍ).
 */
export async function confirmPendingPayment(phoneKey: string): Promise<void> {
  await db.execute(
    sql`UPDATE pending_payments
        SET status = 'confirmed',
            expires_at = NOW() + INTERVAL '${sql.raw(String(CONFIRMED_TTL_MINUTES))} minutes'
        WHERE phone_key = ${phoneKey}`,
  );
}

/**
 * Returns the active pending payment for a phone key, or null if none / expired.
 * Expiry is enforced in SQL (expires_at > NOW()), so this is restart-safe.
 */
export async function getPendingPayment(phoneKey: string): Promise<PendingPaymentRow | null> {
  const rows = await db.execute(
    sql`SELECT service_id, service_name, referencia, monto::float, telefono,
               fee::float, wallet_balance::float, status
        FROM pending_payments
        WHERE phone_key = ${phoneKey}
          AND expires_at > NOW()
        LIMIT 1`,
  );

  const row = rows.rows[0] as Record<string, unknown> | undefined;
  if (!row) return null;

  return {
    serviceId:     row.service_id as string,
    serviceName:   row.service_name as string,
    referencia:    row.referencia as string,
    monto:         row.monto as number,
    telefono:      row.telefono as string,
    fee:           row.fee as number,
    walletBalance: row.wallet_balance as number,
    status:        (row.status as "awaiting_confirmation" | "confirmed"),
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
