import { pgTable, serial, integer, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const belvoLinksTable = pgTable("belvo_links", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  linkId: text("link_id").notNull().unique(),
  institution: text("institution"),
  accountVerified: boolean("account_verified").default(false),
  kycVerified: boolean("kyc_verified").default(false),
  kycName: text("kyc_name"),
  kycDocumentId: text("kyc_document_id"),
  createdAt: timestamp("created_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
});

export type BelvoLink = typeof belvoLinksTable.$inferSelect;
