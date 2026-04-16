import { pgTable, text, serial, numeric, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { billPaymentsTable } from "./bill_payments.js";

export const repCommissionsTable = pgTable("rep_commissions", {
  id: serial("id").primaryKey(),
  repId: text("rep_id").notNull(),
  billPaymentId: integer("bill_payment_id")
    .notNull()
    .references(() => billPaymentsTable.id, { onDelete: "cascade" }),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  type: text("type").notNull(),
  status: text("status").notNull().default("pending"),
  holdUntil: timestamp("hold_until").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertRepCommissionSchema = createInsertSchema(repCommissionsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertRepCommission = z.infer<typeof insertRepCommissionSchema>;
export type RepCommission = typeof repCommissionsTable.$inferSelect;
