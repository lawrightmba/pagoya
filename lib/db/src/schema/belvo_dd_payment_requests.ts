import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const belvoDdPaymentRequestsTable = pgTable("belvo_dd_payment_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  belvoPaymentMethodId: text("belvo_payment_method_id").notNull(),
  belvoPaymentRequestId: text("belvo_payment_request_id").notNull().unique(),
  leaseId: integer("lease_id"),
  category: text("category").notNull(),
  amountCentavos: integer("amount_centavos").notNull(),
  currency: text("currency").default("mxn"),
  reference: text("reference").notNull(),
  status: text("status").default("initial"),
  failureReason: text("failure_reason"),
  createdAt: timestamp("created_at").defaultNow(),
  settledAt: timestamp("settled_at"),
});

export type BelvoDdPaymentRequest = typeof belvoDdPaymentRequestsTable.$inferSelect;
