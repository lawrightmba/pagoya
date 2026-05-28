import { pgTable, text, serial, timestamp, integer, boolean, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  telefono: text("telefono").notNull().unique(),
  referredByRepId: text("referred_by_rep_id"),
  recoveryEmail: text("recovery_email"),
  conektaCustomerId: text("conekta_customer_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  kycLevel: integer("kyc_level").notNull().default(0),
  kycCurp: text("kyc_curp"),
  kycFullName: text("kyc_full_name"),
  kycDob: text("kyc_dob"),
  kycStatus: text("kyc_status").notNull().default("none"),
  kycSubmittedAt: timestamp("kyc_submitted_at", { withTimezone: true }),
  kycVerifiedAt: timestamp("kyc_verified_at", { withTimezone: true }),
  kycProvider: text("kyc_provider"),
  kycProviderId: text("kyc_provider_id"),
  // ── Street team signup bonus ─────────────────────────────────────────────────
  signupBonusEligible: boolean("signup_bonus_eligible").default(false),
  signupBonusClaimed: boolean("signup_bonus_claimed").default(false),
  signupRefCode: varchar("signup_ref_code", { length: 50 }),
  // "web_organic" | "rep_referral" | null for legacy rows
  signupSource: varchar("signup_source", { length: 30 }),
  // ── OTP verification ─────────────────────────────────────────────────────────
  otpCode: varchar("otp_code", { length: 6 }),
  otpExpiresAt: timestamp("otp_expires_at"),
  otpVerified: boolean("otp_verified").default(false),
  otpAttempts: integer("otp_attempts").default(0),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({
  id: true,
  createdAt: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
