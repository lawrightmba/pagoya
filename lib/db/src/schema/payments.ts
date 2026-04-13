import { pgTable, text, serial, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const pagoyaPaymentsTable = pgTable("pagoya_payments", {
  id: serial("id").primaryKey(),
  paymentIntentId: text("payment_intent_id").notNull().unique(),
  empresa: text("empresa").notNull(),
  categoria: text("categoria").notNull(),
  monto: numeric("monto", { precision: 10, scale: 2 }).notNull(),
  referencia: text("referencia").notNull(),
  telefono: text("telefono").notNull(),
  notas: text("notas").default(""),
  status: text("status").notNull().default("pendiente"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPagoyaPaymentSchema = createInsertSchema(pagoyaPaymentsTable).omit({
  id: true,
  createdAt: true,
});

export type InsertPagoyaPayment = z.infer<typeof insertPagoyaPaymentSchema>;
export type PagoyaPayment = typeof pagoyaPaymentsTable.$inferSelect;
