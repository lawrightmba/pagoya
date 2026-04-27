import { pgTable, serial, date, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const dailyReconciliationTable = pgTable("daily_reconciliation", {
  id: serial("id").primaryKey(),
  fecha: date("fecha").notNull(),
  totalTaecel: integer("total_taecel").notNull().default(0),
  totalPagoya: integer("total_pagoya").notNull().default(0),
  discrepancies: text("discrepancies").default("[]"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDailyReconciliationSchema = createInsertSchema(dailyReconciliationTable).omit({
  id: true,
  createdAt: true,
});
export type InsertDailyReconciliation = z.infer<typeof insertDailyReconciliationSchema>;
export type DailyReconciliation = typeof dailyReconciliationTable.$inferSelect;
