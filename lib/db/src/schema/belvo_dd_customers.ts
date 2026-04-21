import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const belvoDdCustomersTable = pgTable("belvo_dd_customers", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  belvoCustomerId: text("belvo_customer_id").notNull().unique(),
  documentType: text("document_type"),
  documentNumber: text("document_number"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type BelvoDdCustomer = typeof belvoDdCustomersTable.$inferSelect;
