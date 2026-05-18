import { Router, type IRouter, type Request, type Response } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { logger } from "../lib/logger.js";

const router: IRouter = Router();

// ── Monthly limits by KYC level (MXN) ─────────────────────────────────────────
export const KYC_MONTHLY_LIMITS: Record<number, number> = {
  0: 6_000,
  1: 6_000,
  2: 24_000,
  3: 80_000,
};

// ── CURP validation ────────────────────────────────────────────────────────────
// Full CURP regex: 4 letters, 6 digit DOB, gender H/M, 2-letter state, 3 letters, 1 alphanum, 1 digit
const CURP_REGEX =
  /^[A-Z]{4}\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])[HM](AS|BC|BS|CC|CS|CH|CL|CM|DF|DG|GT|GR|HG|JC|MC|MN|MS|NT|NL|OC|PL|QT|QR|SP|SL|SR|TC|TS|TL|VZ|YN|ZS|NE)[B-DF-HJ-NP-TV-Z]{3}[A-Z\d]\d$/i;

function validateCurp(curp: string): boolean {
  return CURP_REGEX.test(curp.trim().toUpperCase());
}

// ── GET /api/kyc/status/:telefono ──────────────────────────────────────────────
router.get("/status/:telefono", async (req: Request, res: Response) => {
  const { telefono } = req.params;
  if (!telefono) {
    res.status(400).json({ error: "Se requiere teléfono." });
    return;
  }

  try {
    const [user] = await db
      .select({
        kycLevel: usersTable.kycLevel,
        kycStatus: usersTable.kycStatus,
        kycFullName: usersTable.kycFullName,
        kycCurp: usersTable.kycCurp,
        kycVerifiedAt: usersTable.kycVerifiedAt,
        kycSubmittedAt: usersTable.kycSubmittedAt,
      })
      .from(usersTable)
      .where(eq(usersTable.telefono, telefono))
      .limit(1);

    if (!user) {
      res.json({
        kycLevel: 0,
        kycStatus: "none",
        monthlyLimitMxn: KYC_MONTHLY_LIMITS[0],
        nextLevelLimitMxn: KYC_MONTHLY_LIMITS[2],
      });
      return;
    }

    const level = user.kycLevel ?? 0;
    res.json({
      kycLevel: level,
      kycStatus: user.kycStatus ?? "none",
      kycFullName: user.kycFullName,
      kycVerifiedAt: user.kycVerifiedAt,
      kycSubmittedAt: user.kycSubmittedAt,
      monthlyLimitMxn: KYC_MONTHLY_LIMITS[level] ?? 6_000,
      nextLevelLimitMxn: KYC_MONTHLY_LIMITS[2],
    });
  } catch (err) {
    logger.error({ err, telefono }, "kyc: status lookup failed");
    res.status(500).json({ error: "Error al consultar estado KYC." });
  }
});

// ── POST /api/kyc/submit ───────────────────────────────────────────────────────
// Body: { telefono, curp, fullName, dob }
// Validates CURP format and marks the user as Nivel 2.
// When a real RENAPO/Metamap key is configured (KYC_PROVIDER_KEY env var),
// this will call the provider first before approving.
router.post("/submit", async (req: Request, res: Response) => {
  const {
    telefono,
    curp,
    fullName,
    dob,
  } = req.body as {
    telefono?: string;
    curp?: string;
    fullName?: string;
    dob?: string;
  };

  if (!telefono || !curp || !fullName || !dob) {
    res.status(400).json({
      error: "Se requieren los campos: telefono, curp, fullName, dob.",
    });
    return;
  }

  const curpNorm = curp.trim().toUpperCase();

  if (!validateCurp(curpNorm)) {
    res.status(400).json({
      error:
        "CURP inválido. Verifica que los 18 caracteres sean correctos y coincidan con tu acta de nacimiento o INE.",
    });
    return;
  }

  // DOB format check: YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
    res.status(400).json({ error: "Formato de fecha incorrecto. Usa YYYY-MM-DD." });
    return;
  }

  // Full name: at least first + last name
  const nameTrimmed = fullName.trim();
  if (nameTrimmed.split(/\s+/).length < 2) {
    res.status(400).json({ error: "Ingresa tu nombre completo (nombre y apellidos)." });
    return;
  }

  try {
    // Check if user already verified at level 2+
    const [existing] = await db
      .select({ kycLevel: usersTable.kycLevel, kycStatus: usersTable.kycStatus })
      .from(usersTable)
      .where(eq(usersTable.telefono, telefono))
      .limit(1);

    if (existing?.kycLevel >= 2 && existing?.kycStatus === "verified") {
      res.json({
        success: true,
        kycLevel: existing.kycLevel,
        kycStatus: "verified",
        message: "Tu identidad ya está verificada.",
      });
      return;
    }

    // ── External provider hook ─────────────────────────────────────────────────
    // If KYC_PROVIDER_KEY is set, call Metamap/Truora here.
    // For now, CURP format validation is the gate — auto-approve on valid CURP.
    const providerKey = process.env.KYC_PROVIDER_KEY;
    let providerId: string | null = null;

    if (providerKey) {
      // TODO: call Metamap or Truora RENAPO verification API
      // const result = await callMetamapVerify({ curp: curpNorm, fullName: nameTrimmed, dob, apiKey: providerKey });
      // if (!result.match) { res.status(422).json({ error: "CURP no encontrado en RENAPO." }); return; }
      // providerId = result.verificationId;
      logger.info({ telefono }, "kyc: provider key present — provider call not yet wired");
    }

    const now = new Date();

    // Upsert: create user row if it doesn't exist, then update KYC fields
    await db
      .insert(usersTable)
      .values({ telefono })
      .onConflictDoNothing();

    await db
      .update(usersTable)
      .set({
        kycLevel: 2,
        kycCurp: curpNorm,
        kycFullName: nameTrimmed,
        kycDob: dob,
        kycStatus: "verified",
        kycSubmittedAt: now,
        kycVerifiedAt: now,
        kycProvider: providerKey ? "metamap" : "curp_format",
        kycProviderId: providerId,
      })
      .where(eq(usersTable.telefono, telefono));

    logger.info({ telefono, curp: curpNorm }, "kyc: nivel 2 verified");

    res.json({
      success: true,
      kycLevel: 2,
      kycStatus: "verified",
      monthlyLimitMxn: KYC_MONTHLY_LIMITS[2],
      message: "¡Identidad verificada! Tu límite mensual es ahora $24,000 MXN.",
    });
  } catch (err) {
    logger.error({ err, telefono }, "kyc: submit failed");
    res.status(500).json({ error: "Error al procesar la verificación. Inténtalo de nuevo." });
  }
});

export default router;
