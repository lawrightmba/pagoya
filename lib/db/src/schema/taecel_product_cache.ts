import { pgTable, serial, timestamp, text } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const taecelProductCacheTable = pgTable("taecel_product_cache", {
  id: serial("id").primaryKey(),
  cachedAt: timestamp("cached_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  data: text("data").notNull(),
});

export const insertTaecelProductCacheSchema = createInsertSchema(taecelProductCacheTable).omit({ id: true });
export type InsertTaecelProductCache = z.infer<typeof insertTaecelProductCacheSchema>;
export type TaecelProductCache = typeof taecelProductCacheTable.$inferSelect;
