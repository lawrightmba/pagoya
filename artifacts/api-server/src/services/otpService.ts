import twilio from "twilio";
import { eq, sql } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { sendWhatsApp, sendWhatsAppTemplate, templates } from "../lib/whatsapp.js";
import { logger } from "../lib/logger.js";
import { parseDevice } from "./deviceParser.js";

// ─── Twilio Verify client ──────────────────────────────────────────────────────
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN,
);

function toE164(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  // 10-digit number → assume Mexican, prepend +52
  return digits.length === 10 ? `+52${digits}` : `+${digits}`;
}

// WhatsApp-registered users are stored as last-10 digits (no country code).
// Normalize to last 10 before any DB lookup so +14157972483 → 4157972483.
function normalizeForDb(phone: string): string {
  return phone.replace(/\D/g, "").slice(-10);
}

function verifyServiceSid(): string | null {
  return process.env.TWILIO_VERIFY_SERVICE_SID ?? null;
}

// ─── generateOTP ──────────────────────────────────────────────────────────────
// Sends a 6-digit OTP via Twilio Verify (preferred) or direct WhatsApp (fallback).
// Twilio Verify uses its own pre-approved WhatsApp templates — no Meta approval needed.
export async function generateOTP(phone: string): Promise<{ success: boolean; error?: string }> {
  const sid = verifyServiceSid();

  // ── Path A: Twilio Verify ────────────────────────────────────────────────────
  if (sid && process.env.TWILIO_ACCOUNT_SID) {
    try {
      const e164 = toE164(phone);
      await twilioClient.verify.v2.services(sid).verifications.create({
        to: e164,
        channel: "whatsapp",
      });
      logger.info({ phone: e164 }, "otpService.generateOTP: sent via Twilio Verify");
      return { success: true };
    } catch (err) {
      logger.error({ err, phone }, "otpService.generateOTP: Twilio Verify failed");
      return { success: false, error: "otp_send_failed" };
    }
  }

  // ── Path B: DB-stored OTP + WhatsApp template / free-form (legacy) ───────────
  try {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    const result = await db
      .update(usersTable)
      .set({ otpCode: code, otpExpiresAt: expiresAt, otpAttempts: 0, otpVerified: false })
      .where(eq(usersTable.telefono, normalizeForDb(phone)))
      .returning({ id: usersTable.id });

    if (result.length === 0) {
      logger.warn({ phone }, "otpService.generateOTP: user not found");
      return { success: false, error: "user_not_found" };
    }

    const otpSid = templates.otp();
    if (otpSid) {
      await sendWhatsAppTemplate(phone, otpSid, { "1": code });
    } else {
      await sendWhatsApp(phone, `Tu código de verificación PagoYa es: ${code}. Válido por 5 minutos.`);
    }

    logger.info({ phone }, "otpService.generateOTP: sent via legacy path");
    return { success: true };
  } catch (err) {
    logger.error({ err, phone }, "otpService.generateOTP: error");
    return { success: false, error: "internal_error" };
  }
}

// ─── verifyOTP ────────────────────────────────────────────────────────────────
// Validates the submitted code. Uses Twilio Verify when configured, DB otherwise.
export async function verifyOTP(
  phone: string,
  code: string,
): Promise<{ verified: boolean; reason?: "invalid" | "expired" | "max_attempts" }> {
  const sid = verifyServiceSid();

  // ── Path A: Twilio Verify ────────────────────────────────────────────────────
  if (sid && process.env.TWILIO_ACCOUNT_SID) {
    try {
      const e164 = toE164(phone);
      const check = await twilioClient.verify.v2.services(sid).verificationChecks.create({
        to: e164,
        code,
      });

      if (check.status === "approved") {
        // Mark verified in DB so downstream signup flow can read the flag
        await db
          .update(usersTable)
          .set({ otpVerified: true })
          .where(eq(usersTable.telefono, normalizeForDb(phone)));
        logger.info({ phone: e164 }, "otpService.verifyOTP: approved via Twilio Verify");
        return { verified: true };
      }

      logger.info({ phone: e164, status: check.status }, "otpService.verifyOTP: not approved");
      return { verified: false, reason: "invalid" };
    } catch (err: unknown) {
      // Twilio throws when the verification is expired or max attempts exceeded
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("Max check attempts reached")) {
        return { verified: false, reason: "max_attempts" };
      }
      if (msg.includes("not found") || msg.includes("expired")) {
        return { verified: false, reason: "expired" };
      }
      logger.error({ err, phone }, "otpService.verifyOTP: Twilio Verify check failed");
      return { verified: false, reason: "invalid" };
    }
  }

  // ── Path B: DB-stored OTP (legacy) ────────────────────────────────────────────
  try {
    const [user] = await db
      .select({ otpCode: usersTable.otpCode, otpExpiresAt: usersTable.otpExpiresAt, otpAttempts: usersTable.otpAttempts })
      .from(usersTable)
      .where(eq(usersTable.telefono, normalizeForDb(phone)))
      .limit(1);

    if (!user) {
      logger.warn({ phone }, "otpService.verifyOTP: user not found");
      return { verified: false, reason: "invalid" };
    }

    const attempts = user.otpAttempts ?? 0;
    if (attempts >= 3) {
      return { verified: false, reason: "max_attempts" };
    }

    await db.update(usersTable).set({ otpAttempts: attempts + 1 }).where(eq(usersTable.telefono, normalizeForDb(phone)));

    if (!user.otpExpiresAt || new Date() > user.otpExpiresAt) {
      return { verified: false, reason: "expired" };
    }

    if (user.otpCode !== code) {
      return { verified: false, reason: "invalid" };
    }

    await db.update(usersTable).set({ otpVerified: true }).where(eq(usersTable.telefono, normalizeForDb(phone)));
    logger.info({ phone }, "otpService.verifyOTP: verified via legacy path");
    return { verified: true };
  } catch (err) {
    logger.error({ err, phone }, "otpService.verifyOTP: error");
    return { verified: false, reason: "invalid" };
  }
}

// ─── writeDeviceProfile ────────────────────────────────────────────────────────
// Called from an HTTP route handler AFTER successful OTP verification so it has
// access to req.headers['user-agent'] and req.headers['x-pwa-launch'].
//
// Only writes device profile on FIRST login (device_first_seen_at IS NULL).
// Subsequent calls update device if BOTH os AND model changed (device switch).
// PWA upgrade (browser→pwa) silently updates access_mode only — no log entry.
//
// TODO: Call this from the web OTP-verify route handler:
//   const ua = req.headers['user-agent'] ?? '';
//   const isPwa = req.headers['x-pwa-launch'] === '1';
//   writeDeviceProfile(phone, ua, isPwa).catch(() => {});
export async function writeDeviceProfile(
  phone: string,
  userAgent: string,
  isPwa: boolean,
): Promise<void> {
  const profile = parseDevice(userAgent, isPwa);
  const tel = normalizeForDb(phone);

  try {
    // First login — write full profile only if not already set
    await db.execute(sql`
      INSERT INTO user_device_log (user_id, device_os, device_os_version, device_model, device_type, device_access_mode, change_reason)
      SELECT id, ${profile.os}, ${profile.osVersion}, ${profile.model}, ${profile.type}, ${profile.accessMode}, 'initial'
      FROM users
      WHERE telefono = ${tel}
        AND device_first_seen_at IS NULL
    `);

    const firstSet = await db.execute(sql`
      UPDATE users SET
        device_os            = ${profile.os},
        device_os_version    = ${profile.osVersion},
        device_model         = ${profile.model},
        device_type          = ${profile.type},
        device_access_mode   = ${profile.accessMode},
        device_first_seen_at = NOW(),
        device_updated_at    = NOW()
      WHERE telefono = ${tel}
        AND device_first_seen_at IS NULL
      RETURNING id
    `);

    if ((firstSet.rows?.length ?? 0) > 0) {
      logger.info({ phone: tel, os: profile.os, model: profile.model }, "writeDeviceProfile: initial profile written");
      return;
    }

    // Subsequent logins — detect device switch (both os AND model changed)
    const changed = await db.execute(sql`
      UPDATE users SET
        device_os            = ${profile.os},
        device_os_version    = ${profile.osVersion},
        device_model         = ${profile.model},
        device_type          = ${profile.type},
        device_access_mode   = ${profile.accessMode},
        device_updated_at    = NOW()
      WHERE telefono = ${tel}
        AND device_first_seen_at IS NOT NULL
        AND device_os    IS DISTINCT FROM ${profile.os}
        AND device_model IS DISTINCT FROM ${profile.model}
      RETURNING id
    `);

    if ((changed.rows?.length ?? 0) > 0) {
      await db.execute(sql`
        INSERT INTO user_device_log (user_id, device_os, device_os_version, device_model, device_type, device_access_mode, change_reason)
        SELECT id, ${profile.os}, ${profile.osVersion}, ${profile.model}, ${profile.type}, ${profile.accessMode}, 'update'
        FROM users WHERE telefono = ${tel}
      `);
      logger.info({ phone: tel, os: profile.os, model: profile.model }, "writeDeviceProfile: device change logged");
      return;
    }

    // PWA upgrade only (browser → pwa, no log entry needed)
    if (profile.accessMode === "pwa") {
      await db.execute(sql`
        UPDATE users SET device_access_mode = 'pwa', device_updated_at = NOW()
        WHERE telefono = ${tel} AND device_access_mode = 'browser'
      `);
    }
  } catch (err) {
    logger.error({ err, phone: tel }, "writeDeviceProfile: failed (non-fatal)");
  }
}

// ─── clearOTP ─────────────────────────────────────────────────────────────────
// No-op when using Twilio Verify (it manages state). Clears DB fields otherwise.
export async function clearOTP(phone: string): Promise<void> {
  if (verifyServiceSid()) return; // Twilio Verify manages its own state

  try {
    await db
      .update(usersTable)
      .set({ otpCode: null, otpExpiresAt: null })
      .where(eq(usersTable.telefono, normalizeForDb(phone)));
    logger.info({ phone }, "otpService.clearOTP: cleared");
  } catch (err) {
    logger.error({ err, phone }, "otpService.clearOTP: error");
  }
}
