import { Router, type Request, type Response } from "express";
import { assignNextLndCode } from "./landlords.js";
import { eq, and, count, sum, sql as drizzleSql } from "drizzle-orm";
import { db, usersTable, walletsTable, walletTransactionsTable, repsTable } from "@workspace/db";
import { scheduleNudge } from "../services/nudgeService.js";
import { checkBonusEligibility, checkRepVelocity, creditSignupBonus } from "../services/signupBonusService.js";
import { generateOTP, verifyOTP, clearOTP, writeDeviceProfile } from "../services/otpService.js";
import { resolveRepAttribution } from "../services/repAttribution.js";
import { issueWelcomeTokens } from "../services/loyalty.js";
import { sendWhatsApp } from "../lib/whatsapp.js";
import { logger } from "../lib/logger.js";
import { alertSignup } from "../lib/alertService.js";

const router = Router();

// Extend express-session with our pending registration shape
declare module "express-session" {
  interface SessionData {
    pending_bonus_registration?: {
      name: string;
      phone: string;
      curp: string;
      city: string;
      colonia: string;
      ref_code: string;
      landlord_ref?: string;
      is_generic_landlord?: boolean;
      whatsapp_consent_at?: string;
      landing_page?: string;
    };
  }
}

import { toE164 } from "../lib/phoneUtils.js";

// ── Validation helpers ────────────────────────────────────────────────────────

// Accept Mexican (+52) and US/Canadian (+1) E.164 numbers.
// After toE164(), a 10-digit MX number becomes "+52XXXXXXXXXX" and a
// US number like +17138052626 becomes "+17138052626".
const INTL_PHONE_RE = /^\+52[1-9]\d{9}$|^\+1[2-9]\d{9}$/;

function validatePhone(phone: string): boolean {
  return INTL_PHONE_RE.test(phone);
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/street-team/signup-with-bonus
// ─────────────────────────────────────────────────────────────────────────────
router.post("/signup-with-bonus", async (req: Request, res: Response) => {
  const { name, phone, curp, city, colonia, ref_code, whatsapp_consent_at, landing_page } = req.body as {
    name?: string;
    phone?: string;
    curp?: string;
    city?: string;
    colonia?: string;
    ref_code?: string;
    whatsapp_consent_at?: string;
    landing_page?: string;
  };

  // WS3.3 — landing-page attribution: sanitize to an internal path only
  const landingPageClean =
    typeof landing_page === "string" && landing_page.startsWith("/") && landing_page.length <= 200
      ? landing_page
      : undefined;

  // ── Required field validation ──────────────────────────────────────────────
  if (!name?.trim()) {
    res.status(400).json({ error: "Se requiere el nombre.", field: "name" });
    return;
  }
  if (!phone?.trim()) {
    res.status(400).json({ error: "Se requiere el teléfono.", field: "phone" });
    return;
  }
  if (!city?.trim()) {
    res.status(400).json({ error: "Se requiere la ciudad.", field: "city" });
    return;
  }
  if (!colonia?.trim()) {
    res.status(400).json({ error: "Se requiere la colonia.", field: "colonia" });
    return;
  }
  // ref_code is optional — web sign-ups that arrive without a rep referral
  // are tagged as "WEB" (organic) and still qualify for the signup bonus
  // when the bonus config has no eligibleRepCodes restriction.
  // WS1: codes are validated against the reps table; unknown/inactive codes
  // log ERROR and are stored raw for manual review (never silently defaulted).
  const attribution = await resolveRepAttribution(ref_code, "web_organic", "streetTeamBonus:signup-with-bonus");
  const refCodeResolved = attribution.refCode;

  // ── Phone format validation ────────────────────────────────────────────────
  const phoneCleaned = toE164(phone.trim());
  if (!validatePhone(phoneCleaned)) {
    res.status(400).json({
      error: "El teléfono debe ser un número mexicano (+52) o estadounidense/canadiense (+1) válido.",
      field: "phone",
    });
    return;
  }

  try {
    // ── 1. Bonus eligibility check ─────────────────────────────────────────
    const eligibility = await checkBonusEligibility(phoneCleaned, curp?.trim().toUpperCase() ?? "", refCodeResolved);
    if (!eligibility.eligible) {
      logger.info({ phone: phoneCleaned, reason: eligibility.reason }, "streetTeamBonus: not eligible");
      res.status(400).json({ eligible: false, reason: eligibility.reason });
      return;
    }

    // ── 2a. Pre-create minimal user row so generateOTP can UPDATE it ──────────
    // Full details (name, KYC, bonus) are written in verify-bonus-otp after success.
    await db
      .insert(usersTable)
      .values({
        telefono: phoneCleaned,
        signupSource: attribution.source,
        signupRefCode: attribution.refCode,
        signupBonusEligible: true,
        landingPage: landingPageClean,
      })
      .onConflictDoNothing();

    // ── 2b. Send OTP ───────────────────────────────────────────────────────
    const otpResult = await generateOTP(phoneCleaned);
    if (!otpResult.success) {
      logger.error({ phone: phoneCleaned, error: otpResult.error }, "streetTeamBonus: OTP send failed");
      res.status(500).json({ error: "otp_send_failed" });
      return;
    }

    // ── 3. Store registration payload in session + street_team ─────────────
    // Session is in-memory and is lost on server restart. We also write the
    // essentials to street_team (phone-unique) so verify-bonus-otp can recover
    // if the session is gone (e.g. server restarted between signup and verify).
    const landlordRef = (req.body as { landlord_ref?: string }).landlord_ref?.trim() || undefined;
    const isGenericLandlord = !!(req.body as { is_generic_landlord?: boolean }).is_generic_landlord;

    req.session.pending_bonus_registration = {
      name: name.trim(),
      phone: phoneCleaned,
      curp: curp?.trim().toUpperCase() ?? "",
      city: city.trim(),
      colonia: colonia.trim(),
      ref_code: refCodeResolved,
      landlord_ref: landlordRef,
      is_generic_landlord: isGenericLandlord || undefined,
      whatsapp_consent_at: whatsapp_consent_at?.trim() || undefined,
      landing_page: landingPageClean,
    };

    // Persist to street_team as a session-resilient fallback. On conflict
    // (resend attempt), update the name/city/colonia to latest values.
    db.execute(
      drizzleSql`
        INSERT INTO street_team (name, phone, city, colonia, ref_code)
        VALUES (${name.trim()}, ${phoneCleaned}, ${city.trim()}, ${colonia.trim()}, ${refCodeResolved})
        ON CONFLICT (phone) DO UPDATE
          SET name     = EXCLUDED.name,
              city     = EXCLUDED.city,
              colonia  = EXCLUDED.colonia,
              ref_code = EXCLUDED.ref_code
      `
    ).catch((err: unknown) => {
      logger.warn({ err, phone: phoneCleaned }, "streetTeamBonus: street_team pre-insert failed (non-fatal)");
    });

    // ── 4. Return OTP challenge ────────────────────────────────────────────
    res.status(200).json({ status: "otp_required" });
  } catch (err) {
    logger.error({ err, phone: phoneCleaned }, "streetTeamBonus: signup-with-bonus error");
    res.status(500).json({ error: "Error interno. Intenta de nuevo." });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/street-team/verify-bonus-otp
// ─────────────────────────────────────────────────────────────────────────────
router.post("/verify-bonus-otp", async (req: Request, res: Response) => {
  const { phone, code } = req.body as { phone?: string; code?: string };

  try {
    // ── 1. Load session payload (with street_team fallback) ───────────────
    // The session is in-memory and is wiped on server restart. If the session
    // is gone we try to reconstruct `pending` from the street_team row that
    // was written at signup-with-bonus time.
    let pending = req.session.pending_bonus_registration;

    if (!pending) {
      const phoneFallback = toE164((phone ?? "").trim());
      if (phoneFallback) {
        const fallbackRow = await db.execute(
          drizzleSql`SELECT name, phone, city, colonia, ref_code FROM street_team WHERE phone = ${phoneFallback} LIMIT 1`
        );
        const r = fallbackRow.rows[0] as { name?: string; phone?: string; city?: string; colonia?: string; ref_code?: string } | undefined;
        if (r?.phone) {
          logger.info({ phone: phoneFallback }, "streetTeamBonus: session lost — recovered from street_team");
          pending = {
            name:      r.name    ?? "",
            phone:     r.phone,
            curp:      "",
            city:      r.city    ?? "",
            colonia:   r.colonia ?? "",
            ref_code:  r.ref_code ?? "",
          };
        }
      }
    }

    if (!pending) {
      res.status(400).json({ error: "session_expired" });
      return;
    }

    // ── 2. Verify OTP ─────────────────────────────────────────────────────
    const otpResult = await verifyOTP(pending.phone, code ?? "");
    if (!otpResult.verified) {
      res.status(400).json({ verified: false, reason: otpResult.reason });
      return;
    }

    // ── 2b. Capture device fingerprint (fire-and-forget, never blocks) ────
    // Writes device_os, device_type, device_model, device_access_mode to users.
    // Also logs to user_device_log. Silently swallowed on any error.
    const _ua = (req.headers["user-agent"] as string | undefined) ?? "";
    const _isPwa = req.headers["x-pwa-launch"] === "1";
    writeDeviceProfile(pending.phone, _ua, _isPwa).catch(() => {});

    // ── 2c. Re-resolve attribution (rep status may have changed since step 1;
    // also guards against a raw invalid code stored in the session) ──────────
    const verifyAttribution = await resolveRepAttribution(pending.ref_code, "web_organic", "streetTeamBonus:verify-bonus-otp");

    // ── 3. Rep velocity check (BLOCK does not abort — continue) ───────────
    const velocity = await checkRepVelocity(pending.ref_code);
    const bonusBlocked = velocity.flag === "BLOCK";
    if (bonusBlocked) {
      logger.warn({ repCode: pending.ref_code }, "streetTeamBonus: rep BLOCKED — skipping bonus credit");
    }

    // ── 4. Create user record ──────────────────────────────────────────────
    let userId: number;
    try {
      const [newUser] = await db
        .insert(usersTable)
        .values({
          telefono: pending.phone,
          kycFullName: pending.name,
          kycCurp: pending.curp,
          signupBonusEligible: !bonusBlocked,
          signupRefCode: verifyAttribution.refCode,
          signupSource: verifyAttribution.source,
          landingPage: pending.landing_page,
        })
        .onConflictDoNothing()
        .returning({ id: usersTable.id });

      if (newUser) {
        userId = newUser.id;
      } else {
        // Conflict — user already exists; fetch their id
        const [existing] = await db
          .select({ id: usersTable.id })
          .from(usersTable)
          .where(eq(usersTable.telefono, pending.phone))
          .limit(1);

        if (!existing) {
          res.status(500).json({ error: "user_creation_failed" });
          return;
        }
        userId = existing.id;

        // WS1/WS3.3: the row pre-existed (e.g. partial signup pre-create) —
        // backfill attribution + landing_page where the existing values are
        // NULL/empty so they aren't silently lost on the conflict path.
        await db.execute(drizzleSql`
          UPDATE users
          SET kyc_full_name = COALESCE(NULLIF(kyc_full_name, ''), ${pending.name}),
              kyc_curp      = COALESCE(NULLIF(kyc_curp, ''), ${pending.curp}),
              signup_ref_code = CASE WHEN signup_ref_code IS NULL OR signup_ref_code = ''
                                     THEN ${verifyAttribution.refCode} ELSE signup_ref_code END,
              signup_source   = CASE WHEN signup_source IS NULL OR signup_source = ''
                                     THEN ${verifyAttribution.source} ELSE signup_source END,
              landing_page  = COALESCE(landing_page, ${pending.landing_page ?? null})
          WHERE telefono = ${pending.phone}
        `);
      }

      // ── WhatsApp consent timestamp (fire-and-forget; never blocks) ──────────
      // Writes the ISO timestamp recorded when the user ticked the opt-in checkbox.
      // Only updates rows where the column is still NULL to avoid overwriting a
      // previously recorded consent (e.g. a returning user re-triggering OTP).
      if (pending.whatsapp_consent_at) {
        db.execute(
          drizzleSql`UPDATE users SET whatsapp_consent_at = ${new Date(pending.whatsapp_consent_at)}
                     WHERE telefono = ${pending.phone} AND whatsapp_consent_at IS NULL`,
        ).catch((err: unknown) => {
          logger.warn({ err, phone: pending.phone }, "streetTeamBonus: consent timestamp write failed (non-fatal)");
        });
      }

      // ── Landlord referral: tag user + increment landlord counter ──────────
      if (pending.landlord_ref) {
        db.execute(
          drizzleSql`UPDATE users SET referred_by_landlord = ${pending.landlord_ref} WHERE telefono = ${pending.phone}`,
        ).then(() =>
          db.execute(
            drizzleSql`UPDATE landlords SET referred_users = referred_users + 1, updated_at = NOW() WHERE landlord_code = ${pending.landlord_ref!} AND status = 'active'`,
          ),
        ).catch((err: unknown) => {
          logger.warn({ err, landlordRef: pending.landlord_ref, phone: pending.phone }, "streetTeamBonus: landlord tag failed (non-fatal)");
        });
      }

      // ── Generic landlord self-registration: auto-assign LND code ─────────
      if (pending.is_generic_landlord) {
        assignNextLndCode({
          telefono: pending.phone,
          full_name: pending.name,
          whatsapp: pending.phone,
        }).catch((err: unknown) => {
          logger.warn({ err, phone: pending.phone }, "streetTeamBonus: generic landlord LND assignment failed (non-fatal)");
        });
      }
    } catch (err) {
      logger.error({ err, phone: pending.phone }, "streetTeamBonus: user creation failed");
      res.status(500).json({ error: "user_creation_failed" });
      return;
    }

    // ── 5. Create wallet record ────────────────────────────────────────────
    try {
      await db
        .insert(walletsTable)
        .values({ userId: pending.phone })
        .onConflictDoNothing();
    } catch (err) {
      logger.error({ err, phone: pending.phone }, "streetTeamBonus: wallet creation failed");
      // Non-fatal — wallet may already exist; continue
    }

    // ── 5.5b. Assign STP CLABE (fire-and-forget) ─────────────────────────
    // Inactive until STP_ENABLED=true is set (live STP credentials received).
    // When active: generates a unique 18-digit CLABE and registers it with STP
    // via RegistraCuentaFisica SOAP. Never blocks or rolls back registration.
    if (process.env.STP_ENABLED === "true") {
      import("../services/stpService.js")
        .then(({ assignClabeToUser }) =>
          assignClabeToUser(pending.phone, userId, {
            fullName: pending.name,
            curp: pending.curp,
            dob: undefined,
          }),
        )
        .catch((err) => {
          logger.error({ err, phone: pending.phone, userId }, "streetTeamBonus: CLABE assignment failed (non-fatal)");
        });
    }

    // ── 5.5. Issue 3 free transaction tokens (fire-and-forget) ───────────
    // A token issuance failure must NEVER block or roll back registration.
    issueWelcomeTokens(pending.phone).catch((err) => {
      logger.error({ err, phone: pending.phone }, "streetTeamBonus: free token issuance failed (non-fatal)");
    });

    // ── 6. Ensure street_team lead row is complete ────────────────────────
    // Row was pre-inserted at signup-with-bonus time. This upsert fills in any
    // gaps (e.g. first attempt failed) and is otherwise a no-op.
    db.execute(
      drizzleSql`
        INSERT INTO street_team (name, phone, city, colonia, ref_code)
        VALUES (${pending.name}, ${pending.phone}, ${pending.city}, ${pending.colonia}, ${pending.ref_code})
        ON CONFLICT (phone) DO NOTHING
      `
    ).catch((err: unknown) => {
      logger.warn({ err, phone: pending.phone }, "streetTeamBonus: street_team ensure-row failed (non-fatal)");
    });

    // ── 7. Credit signup bonus (skip if rep is blocked) ───────────────────
    let bonusCredited = false;
    let bonusAmount = 0;

    if (!bonusBlocked) {
      // Re-read the config amount via eligibility (amount came from config row)
      // Use the amount stored at eligibility check time by calling checkBonusEligibility again,
      // or fall back to the signupBonusService which reads from config row id=1
      const eligibility = await checkBonusEligibility(pending.phone, pending.curp, pending.ref_code);
      const creditAmount = eligibility.eligible ? parseFloat(eligibility.amount) : 0;

      if (creditAmount > 0) {
        const creditResult = await creditSignupBonus(userId, pending.ref_code, creditAmount);
        if (creditResult.success) {
          bonusCredited = true;
          bonusAmount = creditResult.amount ?? 0;
        } else {
          logger.warn({ userId, reason: creditResult.reason }, "streetTeamBonus: bonus credit failed");
        }
      }
    }

    // ── 8. Clear OTP ──────────────────────────────────────────────────────
    await clearOTP(pending.phone);

    // ── 9. Clear session ──────────────────────────────────────────────────
    delete req.session.pending_bonus_registration;

    // ── 9b. Admin signup alert (fire-and-forget) ──────────────────────────
    alertSignup({
      telefono: pending.phone,
      source: verifyAttribution.source,
      isTest: false,
      timestamp: new Date(),
    }).catch(() => {});

    // ── 10. WhatsApp confirmation ──────────────────────────────────────────
    try {
      const firstName = pending.name.trim().split(" ")[0] || pending.name.trim();
      const accountNum = `PY-${String(userId).padStart(5, "0")}`;
      let message =
        `¡Hola ${firstName}! Bienvenido/a a PagoYa 👋\n` +
        `Soy Paula, la asistente oficial de PagoYa Technologies — empresa mexicana de pagos digitales.\n\n` +
        `Tu cuenta está activa y protegida.\n` +
        `Número de cuenta: *${accountNum}*\n\n` +
        `Escribe *PAGAR* para hacer tu primer pago, o *SALDO* para ver tu cartera.`;

      if (bonusCredited) {
        message +=
          `\n\nAdemás, hemos acreditado *$${bonusAmount.toFixed(2)} MXN* a tu cartera` +
          ` como bono de bienvenida. Úsalos en cualquier pago.`;
      }

      await sendWhatsApp(pending.phone, message);
    } catch (err) {
      logger.warn({ err, phone: pending.phone }, "streetTeamBonus: WhatsApp confirmation failed (non-fatal)");
    }

    // ── 11. Schedule 10-min activation nudge ──────────────────────────────
    // Fire-and-forget setTimeout; check at send time if they've already transacted.
    scheduleNudge(userId);

    // ── 12. Respond ───────────────────────────────────────────────────────
    logger.info({ userId, bonusCredited, bonusAmount }, "streetTeamBonus: verify-bonus-otp complete");
    res.status(200).json({ success: true, userId, bonusCredited, bonusAmount: bonusAmount ?? 0 });
  } catch (err) {
    logger.error({ err }, "streetTeamBonus: verify-bonus-otp error");
    res.status(500).json({ error: "Error interno. Intenta de nuevo." });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/street-team/rep-profile
// ─────────────────────────────────────────────────────────────────────────────
router.get("/rep-profile", async (req: Request, res: Response) => {
  const repId = (req.query.repId as string | undefined)?.trim();
  if (!repId) {
    res.status(400).json({ error: "Se requiere repId." });
    return;
  }
  try {
    const [rep] = await db
      .select({ id: repsTable.id, name: repsTable.name, repCode: repsTable.repCode, status: repsTable.status })
      .from(repsTable)
      .where(eq(repsTable.id, repId))
      .limit(1);

    if (!rep) {
      res.status(404).json({ error: "Rep no encontrado." });
      return;
    }
    res.json({ id: rep.id, name: rep.name, rep_code: rep.repCode ?? null, status: rep.status });
  } catch (err) {
    logger.error({ err, repId }, "rep-profile: query error");
    res.status(500).json({ error: "Error interno." });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/street-team/rep-recruitment-stats
// ─────────────────────────────────────────────────────────────────────────────
router.get("/rep-recruitment-stats", async (req: Request, res: Response) => {
  const repCode = (req.query.repCode as string | undefined)?.trim();
  if (!repCode) {
    res.status(400).json({ error: "Se requiere repCode." });
    return;
  }
  try {
    // Count users who signed up with this rep code
    const [referidosRow] = await db
      .select({ total: count() })
      .from(usersTable)
      .where(eq(usersTable.signupRefCode, repCode));

    const referidos = Number(referidosRow?.total ?? 0);

    // Count and sum SIGNUP_BONUS wallet transactions for this rep code
    const bonusDesc = `Bono de bienvenida — ref: ${repCode}`;
    const [bonusRow] = await db
      .select({ bonos: count(), valor: sum(walletTransactionsTable.amountMxn) })
      .from(walletTransactionsTable)
      .where(
        and(
          eq(walletTransactionsTable.type, "SIGNUP_BONUS"),
          eq(walletTransactionsTable.description, bonusDesc),
        )
      );

    const bonos_acreditados = Number(bonusRow?.bonos ?? 0);
    const valor_total = parseFloat(bonusRow?.valor ?? "0") || 0;

    // Count users who signed up with this rep code AND have made ≥1 real payment
    const convertedResult = await db.execute(
      drizzleSql`
        SELECT COUNT(DISTINCT u.id)::int AS converted
        FROM users u
        INNER JOIN bill_payments bp
          ON bp.telefono = u.telefono
          AND bp.status IN ('completed', 'confirmed', 'confirmado', 'success')
        WHERE u.signup_ref_code = ${repCode}
      `
    );
    const converted_count = Number((convertedResult.rows[0] as { converted?: number } | undefined)?.converted ?? 0);

    res.json({ referidos, bonos_acreditados, valor_total, converted_count });
  } catch (err) {
    logger.error({ err, repCode }, "rep-recruitment-stats: query error");
    res.status(500).json({ error: "Error interno." });
  }
});

export default router;
