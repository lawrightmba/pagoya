import {
  pgTable,
  text,
  uuid,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const streetTeamTable = pgTable(
  "street_team",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    name: text("name").notNull(),
    phone: text("phone").notNull(),
    city: text("city").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("street_team_phone_idx").on(t.phone),
    index("street_team_city_idx").on(t.city),
  ],
);

export const insertStreetTeamSchema = createInsertSchema(streetTeamTable).omit({
  id: true,
  createdAt: true,
});
export type InsertStreetTeam = z.infer<typeof insertStreetTeamSchema>;
export type StreetTeam = typeof streetTeamTable.$inferSelect;
