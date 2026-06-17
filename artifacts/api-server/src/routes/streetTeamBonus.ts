import { Router, type Request, type Response } from "express";
import { eq, and, count, sum } from "drizzle-orm";
import { db, usersTable, walletsTable, walletTransactionsTable, repsTable, streetTeamTable } from "@workspace/db";
import { scheduleNudge } from "../services/nudgeService.js";
import { checkBonusEligibility, checkRepVelocity, creditSignupBonus } from "../services/signupBonusService.js";
import { generateOTP, verifyOTP, clearOTP } from "../services/otpService.js";
import { issueWelcomeTokens } from "../services/loyalty.js";
import { sendWhatsApp } from "../lib/whatsapp.js";
import { logger } from "../lib/logger.js";

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
    };
  }
}

// ── Validation helpers ────────────────────────────────────────────────────────

const MX_PHONE_RE = /^\d{10}$/;

function validatePhone(phone: string): boolean {
  return MX_PHONE_RE.test(phone);
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/street-team/signup-with-bonus
// ─────────────────────────────────────────────────────────────────────────────
router.post("/signup-with-bonus", async (req: Request, res: Response) => {
  const { name, phone, curp, city, colonia, ref_code } = req.body as {
    name?: string;
    phone?: string;
    curp?: string;
    city?: string;
    colonia?: string;
    ref_code?: string;
  };

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
  const refCodeResolved = ref_code?.trim() || "WEB";

  // ── Phone format validation ────────────────────────────────────────────────
  const phoneCleaned = phone.trim().replace(/\D/g, "").slice(-10);
  if (!validatePhone(phoneCleaned)) {
    res.status(400).json({ error: "El teléfono debe ser un número mexicano de 10 dígitos.", field: "phone" });
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
        signupSource: refCodeResolved === "WEB" ? "web_organic" : "rep_referral",
        signupRefCode: refCodeResolved,
        signupBonusEligible: true,
      })
      .onConflictDoNothing();

    // ── 2b. Send OTP ───────────────────────────────────────────────────────
    const otpResult = await generateOTP(phoneCleaned);
    if (!otpResult.success) {
      logger.error({ phone: phoneCleaned, error: otpResult.error }, "streetTeamBonus: OTP send failed");
      res.status(500).json({ error: "otp_send_failed" });
      return;
    }

    // ── 3. Store registration payload in session ───────────────────────────
    const landlordRef = (req.body as { landlord_ref?: string }).landlord_ref?.trim() || undefined;

    req.session.pending_bonus_registration = {
      name: name.trim(),
      phone: phoneCleaned,
      curp: curp?.trim().toUpperCase() ?? "",
      city: city.trim(),
      colonia: colonia.trim(),
      ref_code: refCodeResolved,
      landlord_ref: landlordRef,
    };

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
    // ── 1. Load session payload ────────────────────────────────────────────
    const pending = req.session.pending_bonus_registration;
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
          signupRefCode: pending.ref_code,
          signupSource: pending.ref_code === "WEB" ? "web_organic" : "rep_referral",
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
      }

      // ── Landlord referral: tag user + increment landlord counter ──────────
      if (pending.landlord_ref) {
        const { sql: drizzleSql } = await import("drizzle-orm");
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

    // ── 6. Insert street_team lead row ────────────────────────────────────
    try {
      await db
        .insert(streetTeamTable)
        .values({
          name: pending.name,
          phone: pending.phone,
          city: pending.city,
          colonia: pending.colonia,
          refCode: pending.ref_code,
        })
        .onConflictDoNothing();
    } catch (err) {
      logger.warn({ err, phone: pending.phone }, "streetTeamBonus: street_team insert failed (non-fatal)");
      // Non-fatal — lead record is nice-to-have
    }

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

    res.json({ referidos, bonos_acreditados, valor_total });
  } catch (err) {
    logger.error({ err, repCode }, "rep-recruitment-stats: query error");
    res.status(500).json({ error: "Error interno." });
  }
});

export default router;
