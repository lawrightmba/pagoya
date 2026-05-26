import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { sendWhatsApp } from "../lib/whatsapp.js";
import { logger } from "../lib/logger.js";

// ─── generateOTP ──────────────────────────────────────────────────────────────
// Generates a 6-digit code, persists it to the user row, and sends via WhatsApp.
export async function generateOTP(phone: string): Promise<{ success: boolean; error?: string }> {
  try {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    const result = await db
      .update(usersTable)
      .set({
        otpCode: code,
        otpExpiresAt: expiresAt,
        otpAttempts: 0,
        otpVerified: false,
      })
      .where(eq(usersTable.telefono, phone))
      .returning({ id: usersTable.id });

    if (result.length === 0) {
      logger.warn({ phone }, "otpService.generateOTP: user not found");
      return { success: false, error: "user_not_found" };
    }

    await sendWhatsApp(
      phone,
      `Tu código de verificación PagoYa es: ${code}. Válido por 5 minutos.`,
    );

    logger.info({ phone }, "otpService.generateOTP: OTP sent");
    return { success: true };
  } catch (err) {
    logger.error({ err, phone }, "otpService.generateOTP: error");
    return { success: false, error: "internal_error" };
  }
}

// ─── verifyOTP ────────────────────────────────────────────────────────────────
// Validates the submitted code against the stored OTP. Increments attempts on
// every call. Returns { verified: true } on match, or { verified: false, reason }.
export async function verifyOTP(
  phone: string,
  code: string,
): Promise<{ verified: boolean; reason?: "invalid" | "expired" | "max_attempts" }> {
  try {
    const [user] = await db
      .select({
        otpCode: usersTable.otpCode,
        otpExpiresAt: usersTable.otpExpiresAt,
        otpAttempts: usersTable.otpAttempts,
      })
      .from(usersTable)
      .where(eq(usersTable.telefono, phone))
      .limit(1);

    if (!user) {
      logger.warn({ phone }, "otpService.verifyOTP: user not found");
      return { verified: false, reason: "invalid" };
    }

    const attempts = user.otpAttempts ?? 0;

    if (attempts >= 3) {
      logger.warn({ phone, attempts }, "otpService.verifyOTP: max attempts reached");
      return { verified: false, reason: "max_attempts" };
    }

    // Increment attempts before checking — counts even failed reads
    await db
      .update(usersTable)
      .set({ otpAttempts: attempts + 1 })
      .where(eq(usersTable.telefono, phone));

    if (!user.otpExpiresAt || new Date() > user.otpExpiresAt) {
      logger.info({ phone }, "otpService.verifyOTP: OTP expired");
      return { verified: false, reason: "expired" };
    }

    if (user.otpCode !== code) {
      logger.info({ phone }, "otpService.verifyOTP: code mismatch");
      return { verified: false, reason: "invalid" };
    }

    // Code matches — mark verified
    await db
      .update(usersTable)
      .set({ otpVerified: true })
      .where(eq(usersTable.telefono, phone));

    logger.info({ phone }, "otpService.verifyOTP: verified");
    return { verified: true };
  } catch (err) {
    logger.error({ err, phone }, "otpService.verifyOTP: error");
    return { verified: false, reason: "invalid" };
  }
}

// ─── clearOTP ─────────────────────────────────────────────────────────────────
// Nulls out otp_code and otp_expires_at once verification is complete.
export async function clearOTP(phone: string): Promise<void> {
  try {
    await db
      .update(usersTable)
      .set({
        otpCode: null,
        otpExpiresAt: null,
      })
      .where(eq(usersTable.telefono, phone));

    logger.info({ phone }, "otpService.clearOTP: cleared");
  } catch (err) {
    logger.error({ err, phone }, "otpService.clearOTP: error");
  }
}
