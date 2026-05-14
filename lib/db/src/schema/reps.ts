import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const repsTable = pgTable("reps", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email").unique(),
  passwordHash: text("password_hash"),
  status: text("status").notNull().default("active"),
  repCode: text("rep_code").unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertRepSchema = createInsertSchema(repsTable).omit({ createdAt: true });
export type InsertRep = z.infer<typeof insertRepSchema>;
export type Rep = typeof repsTable.$inferSelect;
