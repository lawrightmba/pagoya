import { pgTable, serial, varchar, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const repVelocityFlagsTable = pgTable("rep_velocity_flags", {
  id: serial("id").primaryKey(),
  repCode: varchar("rep_code", { length: 50 }).notNull(),
  userPhone: varchar("user_phone", { length: 20 }).notNull(),
  flaggedAt: timestamp("flagged_at").defaultNow().notNull(),
  flagType: varchar("flag_type", { length: 20 }).notNull(), // 'WARNING' | 'BLOCK'
  hourlyCount: integer("hourly_count").notNull(),
});

export const insertRepVelocityFlagSchema = createInsertSchema(repVelocityFlagsTable).omit({
  id: true,
});
export type InsertRepVelocityFlag = z.infer<typeof insertRepVelocityFlagSchema>;
export type RepVelocityFlag = typeof repVelocityFlagsTable.$inferSelect;
