import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { billPaymentsTable } from "./bill_payments.js";

export const billPaymentAuditTable = pgTable("bill_payment_audit", {
  id: serial("id").primaryKey(),
  paymentId: integer("payment_id")
    .notNull()
    .references(() => billPaymentsTable.id, { onDelete: "cascade" }),
  event: text("event").notNull(),
  details: text("details").default(""),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type BillPaymentAudit = typeof billPaymentAuditTable.$inferSelect;
