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
  kycDismissedAt: timestamp("kyc_dismissed_at", { withTimezone: true }),
  kycProvider: text("kyc_provider"),
  kycProviderId: text("kyc_provider_id"),
  // ── Street team signup bonus ─────────────────────────────────────────────────
  signupBonusEligible: boolean("signup_bonus_eligible").default(false),
  signupBonusClaimed: boolean("signup_bonus_claimed").default(false),
  signupRefCode: varchar("signup_ref_code", { length: 50 }),
  // "web_organic" | "rep_referral" | null for legacy rows
  signupSource: varchar("signup_source", { length: 30 }),
  // ── Activation nudge ─────────────────────────────────────────────────────────
  // nudge_scheduled_at: set to NOW()+10min at registration; polled every 2min to fire.
  // nudge_sent_at: stamped when the nudge is actually sent. Used to de-duplicate.
  nudgeScheduledAt: timestamp("nudge_scheduled_at"),
  nudgeSentAt: timestamp("nudge_sent_at"),
  // ── OTP verification ─────────────────────────────────────────────────────────
  otpCode: varchar("otp_code", { length: 6 }),
  otpExpiresAt: timestamp("otp_expires_at"),
  otpVerified: boolean("otp_verified").default(false),
  otpAttempts: integer("otp_attempts").default(0),
  // ── STP / SPEI ───────────────────────────────────────────────────────────────
  // Unique 18-digit CLABE assigned to this user by STP (via RegistraCuentaFisica).
  // Null = not yet assigned (pre-STP-integration users or assignment in progress).
  stpClabe: text("stp_clabe").unique(),
  // ── WhatsApp opt-in consent ───────────────────────────────────────────────────
  // Timestamp (with TZ) recorded server-side when the user ticked the explicit
  // WhatsApp consent checkbox during registration. Null = legacy user who registered
  // before the checkbox was introduced (passive-consent footer only).
  whatsappConsentAt: timestamp("whatsapp_consent_at", { withTimezone: true }),
  // ── Attribution annotation ───────────────────────────────────────────────────
  // Free-text admin note about how signup_source was determined or corrected.
  // Never overwrites signup_source itself — audit annotation only.
  sourceNote: text("source_note"),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({
  id: true,
  createdAt: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
