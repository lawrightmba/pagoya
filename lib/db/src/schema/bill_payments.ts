import { pgTable, text, serial, numeric, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const billPaymentsTable = pgTable("bill_payments", {
  id: serial("id").primaryKey(),
  serviceId: text("service_id").notNull(),
  serviceName: text("service_name").notNull(),
  categoria: text("categoria").notNull(),
  referencia: text("referencia").notNull(),
  monto: numeric("monto", { precision: 10, scale: 2 }).notNull(),
  telefono: text("telefono").notNull(),
  notas: text("notas").default(""),
  provider: text("provider").notNull(),
  providerUsed: text("provider_used"),
  failoverUsed: boolean("failover_used").default(false),
  confirmationCode: text("confirmation_code").notNull(),
  status: text("status").notNull().default("confirmed"),
  paymentMethod: text("payment_method").default("card"),
  repId: text("rep_id"),
  // Taecel / SIPREL enrichment fields (added v2.4)
  taecelTransId: text("taecel_trans_id"),
  taecelFolio: text("taecel_folio"),
  taecelCarrier: text("taecel_carrier"),
  taecelCargoMxn: numeric("taecel_cargo_mxn", { precision: 10, scale: 2 }),
  bolsaType: text("bolsa_type"),
  platformFeeMxn: numeric("platform_fee_mxn", { precision: 10, scale: 2 }).default("15.00"),
  // Pre-FI enrichment fields (added v3.0)
  // amount_due_mxn: billed amount from provider (CFE/Telmex only until biller-API pull)
  amountDueMxn: numeric("amount_due_mxn", { precision: 10, scale: 2 }),
  // days_from_due: positive = paid early, negative = paid late. NULL if no user_billers row.
  daysFromDue: integer("days_from_due"),
  // channel: wallet_balance | card_direct (oxxo_cash reserved for future direct OXXO bill pay)
  channel: text("channel"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertBillPaymentSchema = createInsertSchema(billPaymentsTable).omit({
  id: true,
  createdAt: true,
});

export type InsertBillPayment = z.infer<typeof insertBillPaymentSchema>;
export type BillPayment = typeof billPaymentsTable.$inferSelect;
