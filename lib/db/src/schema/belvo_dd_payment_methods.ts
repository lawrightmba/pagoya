import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const belvoDdPaymentMethodsTable = pgTable("belvo_dd_payment_methods", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  belvoCustomerId: text("belvo_customer_id").notNull(),
  belvoPaymentMethodId: text("belvo_payment_method_id").notNull().unique(),
  accountType: text("account_type"),
  bank: text("bank"),
  accountLast4: text("account_last_4"),
  status: text("status").default("pending"),
  consentId: text("consent_id"),
  consentStatus: text("consent_status").default("awaiting_information"),
  consentSubmittedAt: timestamp("consent_submitted_at"),
  consentConfirmedAt: timestamp("consent_confirmed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type BelvoDdPaymentMethod = typeof belvoDdPaymentMethodsTable.$inferSelect;
