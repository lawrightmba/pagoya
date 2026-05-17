import { pgTable, text, uuid, boolean, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users.js";

export const savedCardsTable = pgTable("saved_cards", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userTelefono: text("user_telefono")
    .notNull()
    .references(() => usersTable.telefono, { onDelete: "cascade" }),
  conektaCardToken: text("conekta_card_token").notNull(),
  lastFour: text("last_four").notNull(),
  brand: text("brand").notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const insertSavedCardSchema = createInsertSchema(savedCardsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertSavedCard = z.infer<typeof insertSavedCardSchema>;
export type SavedCard = typeof savedCardsTable.$inferSelect;
