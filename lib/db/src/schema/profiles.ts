import {
  pgTable,
  text,
  uuid,
  boolean,
  integer,
  numeric,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// ─── user_profiles ────────────────────────────────────────────────────────────
export const userProfilesTable = pgTable(
  "user_profiles",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    phone: text("phone").unique().notNull(),
    name: text("name"),
    email: text("email"),
    language: text("language").notNull().default("es"),
    locationZip: text("location_zip"),
    acquisitionSource: text("acquisition_source"),
    repId: text("rep_id"),
    reminderOptedIn: boolean("reminder_opted_in").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("user_profiles_phone_idx").on(t.phone)],
);

export const insertUserProfileSchema = createInsertSchema(userProfilesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;
export type UserProfile = typeof userProfilesTable.$inferSelect;

// ─── user_billers ─────────────────────────────────────────────────────────────
export const userBillersTable = pgTable(
  "user_billers",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => userProfilesTable.id, { onDelete: "cascade" }),
    billerId: text("biller_id").notNull(),
    billerName: text("biller_name").notNull(),
    serviceRef: text("service_ref"),
    typicalAmount: numeric("typical_amount", { precision: 10, scale: 2 }),
    paymentDay: integer("payment_day"),
    lastPaidAt: timestamp("last_paid_at", { withTimezone: true }),
    lastAmount: numeric("last_amount", { precision: 10, scale: 2 }),
    reminderEnabled: boolean("reminder_enabled").notNull().default(true),
    reminderDaysBefore: integer("reminder_days_before").notNull().default(3),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("user_billers_profile_biller_idx").on(t.profileId, t.billerId),
    index("user_billers_profile_id_idx").on(t.profileId),
  ],
);

export const insertUserBillerSchema = createInsertSchema(userBillersTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertUserBiller = z.infer<typeof insertUserBillerSchema>;
export type UserBiller = typeof userBillersTable.$inferSelect;

// ─── reminder_log ─────────────────────────────────────────────────────────────
export const reminderLogTable = pgTable(
  "reminder_log",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => userProfilesTable.id, { onDelete: "cascade" }),
    billerId: text("biller_id").notNull(),
    channel: text("channel").notNull(),
    status: text("status").notNull(),
    message: text("message"),
    sentAt: timestamp("sent_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("reminder_log_profile_id_idx").on(t.profileId)],
);

export const insertReminderLogSchema = createInsertSchema(reminderLogTable).omit({
  id: true,
  sentAt: true,
});
export type InsertReminderLog = z.infer<typeof insertReminderLogSchema>;
export type ReminderLog = typeof reminderLogTable.$inferSelect;

// ─── nlp_queries ──────────────────────────────────────────────────────────────
export const nlpQueriesTable = pgTable(
  "nlp_queries",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    rawText: text("raw_text").notNull(),
    phone: text("phone"),
    billerId: text("biller_id"),
    amount: numeric("amount", { precision: 10, scale: 2 }),
    confidence: text("confidence"),
    language: text("language"),
    converted: boolean("converted").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("nlp_queries_phone_idx").on(t.phone)],
);

export const insertNlpQuerySchema = createInsertSchema(nlpQueriesTable).omit({
  id: true,
  createdAt: true,
});
export type InsertNlpQuery = z.infer<typeof insertNlpQuerySchema>;
export type NlpQuery = typeof nlpQueriesTable.$inferSelect;
