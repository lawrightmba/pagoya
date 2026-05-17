import { Router, type Request, type Response } from "express";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import { eq, and } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { logger } from "../lib/logger.js";

const router = Router();

const RECOVERY_JWT_SECRET =
  process.env.RECOVERY_JWT_SECRET ?? "pagoya-recovery-jwt-dev-secret";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT ?? "587"),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

interface RecoveryTokenPayload {
  sub: number;
  recoveryEmail: string;
  iat?: number;
  exp?: number;
}

// ── POST /api/auth/add-recovery-email ─────────────────────────────────────────
// Authenticated by phone — accepts { phone, email }, saves recovery_email.
router.post("/add-recovery-email", async (req: Request, res: Response) => {
  const { phone, email } = req.body as { phone?: string; email?: string };

  if (!phone || !email) {
    res.status(400).json({ error: "Se requieren los campos 'phone' y 'email'." });
    return;
  }

  if (!EMAIL_REGEX.test(email)) {
    res.status(400).json({ error: "Formato de correo electrónico inválido." });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.telefono, phone.trim()))
      .limit(1);

    if (!user) {
      res.status(404).json({ error: "Usuario no encontrado." });
      return;
    }

    const [conflict] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.recoveryEmail, normalizedEmail))
      .limit(1);

    if (conflict && conflict.id !== user.id) {
      res.status(409).json({ error: "Ese correo ya está registrado como recuperación." });
      return;
    }

    await db
      .update(usersTable)
      .set({ recoveryEmail: normalizedEmail })
      .where(eq(usersTable.id, user.id));

    logger.info({ userId: user.id }, "accountRecovery: recovery email saved");
    res.json({ success: true, message: "Correo de recuperación guardado." });
  } catch (err) {
    logger.error({ err }, "accountRecovery: add-recovery-email failed");
    res.status(500).json({ error: "Error al guardar el correo de recuperación." });
  }
});

// ── POST /api/auth/request-recovery ───────────────────────────────────────────
// Public — accepts { email }, sends token link if email matches a recovery_email.
router.post("/request-recovery", async (req: Request, res: Response) => {
  const GENERIC_OK = {
    success: true,
    message: "Si ese correo está registrado, recibirás un enlace en breve.",
  };

  const { email } = req.body as { email?: string };

  if (!email || !EMAIL_REGEX.test(email)) {
    res.json(GENERIC_OK);
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.recoveryEmail, normalizedEmail))
      .limit(1);

    if (!user) {
      res.json(GENERIC_OK);
      return;
    }

    const token = jwt.sign(
      { sub: user.id, recoveryEmail: normalizedEmail } satisfies Omit<RecoveryTokenPayload, "iat" | "exp">,
      RECOVERY_JWT_SECRET,
      { expiresIn: "1h" },
    );

    const appBase = process.env.APP_BASE_URL ?? "https://pagoyamx.com";
    const link = `${appBase}/recuperar-cuenta?token=${encodeURIComponent(token)}`;

    const fromAddress = process.env.RECOVERY_EMAIL_FROM ?? "noreply@pagoyamx.com";

    const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:system-ui,sans-serif;background:#f4f6f9;margin:0;padding:32px 16px">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:16px;padding:40px 32px;box-shadow:0 2px 12px rgba(0,0,0,.08)">
    <img src="${appBase}/pagoya-logo.png" alt="PagoYa" style="height:40px;margin-bottom:28px">
    <h2 style="margin:0 0 12px;font-size:22px;color:#0A2540">Recupera tu cuenta</h2>
    <p style="margin:0 0 24px;color:#4a5568;line-height:1.6">
      Haz clic en el botón para cambiar el número de teléfono de tu cuenta PagoYa.
      Este enlace es válido por <strong>1 hora</strong>.
    </p>
    <a href="${link}" style="display:inline-block;background:#1D9E75;color:#fff;text-decoration:none;padding:14px 32px;border-radius:12px;font-weight:700;font-size:16px">
      Recuperar mi cuenta
    </a>
    <p style="margin:24px 0 0;font-size:12px;color:#a0aec0;line-height:1.5">
      Si no solicitaste esto, ignora este mensaje. Tu cuenta está segura.<br>
      © ${new Date().getFullYear()} Longview Meridian Technologies LLC · PagoYa
    </p>
  </div>
</body>
</html>`;

    const transporter = createTransporter();
    await transporter.sendMail({
      from: fromAddress,
      to: normalizedEmail,
      subject: "Recupera tu cuenta PagoYa",
      html,
      text: `Recupera tu cuenta PagoYa: ${link}  (válido 1 hora)`,
    });

    logger.info({ userId: user.id }, "accountRecovery: recovery email sent");
    res.json(GENERIC_OK);
  } catch (err) {
    logger.error({ err }, "accountRecovery: request-recovery failed");
    res.json(GENERIC_OK);
  }
});

// ── POST /api/auth/complete-recovery ──────────────────────────────────────────
// Validates token, updates phone, clears recovery_email (invalidates token).
router.post("/complete-recovery", async (req: Request, res: Response) => {
  const { token, newPhone } = req.body as { token?: string; newPhone?: string };

  if (!token || !newPhone) {
    res.status(400).json({ error: "Se requieren los campos 'token' y 'newPhone'." });
    return;
  }

  const cleanPhone = newPhone.trim();
  if (!cleanPhone || cleanPhone.length < 7) {
    res.status(400).json({ error: "Número de teléfono inválido." });
    return;
  }

  let payload: RecoveryTokenPayload;
  try {
    payload = jwt.verify(token, RECOVERY_JWT_SECRET) as RecoveryTokenPayload;
  } catch {
    res.status(401).json({ error: "El enlace de recuperación es inválido o ha expirado." });
    return;
  }

  try {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(
        and(
          eq(usersTable.id, payload.sub),
          eq(usersTable.recoveryEmail, payload.recoveryEmail),
        ),
      )
      .limit(1);

    if (!user) {
      res.status(401).json({ error: "El enlace de recuperación ya fue utilizado o no es válido." });
      return;
    }

    const [phoneTaken] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.telefono, cleanPhone))
      .limit(1);

    if (phoneTaken) {
      res.status(409).json({ error: "Ese número de teléfono ya está en uso." });
      return;
    }

    await db
      .update(usersTable)
      .set({ telefono: cleanPhone, recoveryEmail: null })
      .where(eq(usersTable.id, user.id));

    logger.info({ userId: user.id }, "accountRecovery: phone updated via recovery");
    res.json({ success: true, message: "Tu número de teléfono ha sido actualizado." });
  } catch (err) {
    logger.error({ err }, "accountRecovery: complete-recovery failed");
    res.status(500).json({ error: "Error al completar la recuperación." });
  }
});

export default router;
