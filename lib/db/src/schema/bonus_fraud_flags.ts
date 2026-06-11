import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const bonusFraudFlagsTable = pgTable("bonus_fraud_flags", {
  id: serial("id").primaryKey(),
  telefono: text("telefono").notNull(),
  reason: text("reason").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type BonusFraudFlag = typeof bonusFraudFlagsTable.$inferSelect;
