import { pgTable, text, numeric, uuid, timestamp, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { walletsTable } from "./wallets.js";

export const walletTransactionsTable = pgTable(
  "wallet_transactions",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    walletId: uuid("wallet_id")
      .notNull()
      .references(() => walletsTable.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    amountMxn: numeric("amount_mxn", { precision: 10, scale: 2 }).notNull(),
    status: text("status").notNull().default("pending"),
    conektaOrderId: text("conekta_order_id"),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    voucherUrl: text("voucher_url"),
    voucherExpiresAt: timestamp("voucher_expires_at", { withTimezone: true }),
    description: text("description"),
    peerTransferId: uuid("peer_transfer_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    // ── STP / SPEI fields ─────────────────────────────────────────────────────
    // STP claveRastreo — unique tracking key for every SPEI transfer (18 chars).
    stpClaveRastreo: text("stp_clave_rastreo"),
    // Official Banxico CEP (Comprobante Electrónico de Pago) URL for this transfer.
    // Lets users retrieve the official receipt from banxico.org.mx.
    cepUrl: text("cep_url"),
  },
  (t) => [
    index("wallet_tx_wallet_id_idx").on(t.walletId),
    index("wallet_tx_conekta_order_idx").on(t.conektaOrderId),
    index("wallet_tx_status_idx").on(t.status),
  ],
);

export const insertWalletTransactionSchema = createInsertSchema(walletTransactionsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertWalletTransaction = z.infer<typeof insertWalletTransactionSchema>;
export type WalletTransaction = typeof walletTransactionsTable.$inferSelect;
