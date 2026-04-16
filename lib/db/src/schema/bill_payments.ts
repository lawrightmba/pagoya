import { pgTable, text, serial, numeric, timestamp, boolean } from "drizzle-orm/pg-core";
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
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertBillPaymentSchema = createInsertSchema(billPaymentsTable).omit({
  id: true,
  createdAt: true,
});

export type InsertBillPayment = z.infer<typeof insertBillPaymentSchema>;
export type BillPayment = typeof billPaymentsTable.$inferSelect;
