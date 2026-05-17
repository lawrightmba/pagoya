import { pgTable, uuid, jsonb, text, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const stpWebhookLogTable = pgTable("stp_webhook_log", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  rawPayload: jsonb("raw_payload"),
  status: text("status").notNull(),
  error: text("error"),
  receivedAt: timestamp("received_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertStpWebhookLogSchema = createInsertSchema(stpWebhookLogTable).omit({
  id: true,
  receivedAt: true,
});
export type InsertStpWebhookLog = z.infer<typeof insertStpWebhookLogSchema>;
export type StpWebhookLog = typeof stpWebhookLogTable.$inferSelect;
