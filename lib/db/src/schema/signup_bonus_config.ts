import { pgTable, serial, boolean, decimal, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const signupBonusConfigTable = pgTable("signup_bonus_config", {
  id: serial("id").primaryKey(),
  isActive: boolean("is_active").default(false).notNull(),
  bonusAmount: decimal("bonus_amount", { precision: 10, scale: 2 }).default("25.00").notNull(),
  eligibleRepCodes: text("eligible_rep_codes"), // comma-separated rep codes
  warningThreshold: integer("warning_threshold").default(10).notNull(),
  blockThreshold: integer("block_threshold").default(20).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertSignupBonusConfigSchema = createInsertSchema(signupBonusConfigTable).omit({
  id: true,
});
export type InsertSignupBonusConfig = z.infer<typeof insertSignupBonusConfigSchema>;
export type SignupBonusConfig = typeof signupBonusConfigTable.$inferSelect;
