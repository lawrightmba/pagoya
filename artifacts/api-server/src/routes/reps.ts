import { Router, type Request, type Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { sql as drizzleSql } from "drizzle-orm";
import { db, repsTable } from "@workspace/db";
import { logger } from "../lib/logger.js";
import { sendWhatsApp } from "../lib/whatsapp.js";

const ADMIN_KEY = process.env.ADMIN_TOKEN ?? process.env.ADMIN_SECRET_KEY ?? "";
function isAdmin(req: Request): boolean {
  return !!ADMIN_KEY && req.headers["x-admin-key"] === ADMIN_KEY;
}

const router = Router();

const JWT_SECRET = process.env.REP_JWT_SECRET ?? "pagoya-rep-jwt-dev-secret";
const TOKEN_TTL  = "30d";

// POST /api/reps/login
router.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    res.status(400).json({ error: "Se requieren email y contraseña." });
    return;
  }

  try {
    const [rep] = await db
      .select()
      .from(repsTable)
      .where(eq(repsTable.email, email.trim().toLowerCase()))
      .limit(1);

    if (!rep || !rep.passwordHash) {
      res.status(401).json({ error: "Credenciales incorrectas." });
      return;
    }

    if (rep.status !== "active") {
      res.status(403).json({ error: "Cuenta suspendida. Contacta a soporte." });
      return;
    }

    const valid = await bcrypt.compare(password, rep.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Credenciales incorrectas." });
      return;
    }

    const token = jwt.sign(
      { repId: rep.id, repCode: rep.repCode, email: rep.email },
      JWT_SECRET,
      { expiresIn: TOKEN_TTL },
    );

    logger.info({ repId: rep.id }, "reps: login successful");
    res.json({ token, repId: rep.id, repCode: rep.repCode, name: rep.name });
  } catch (err) {
    logger.error({ err }, "reps: login failed");
    res.status(500).json({ error: "Error del servidor." });
  }
});

// GET /api/reps/me  — verify token and return rep info
router.get("/me", async (req: Request, res: Response) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    res.status(401).json({ error: "No autorizado." });
    return;
  }
  try {
    const payload = jwt.verify(auth.slice(7), JWT_SECRET) as { repId: string };
    const [rep] = await db
      .select({ id: repsTable.id, name: repsTable.name, email: repsTable.email, repCode: repsTable.repCode, status: repsTable.status })
      .from(repsTable)
      .where(eq(repsTable.id, payload.repId))
      .limit(1);

    if (!rep) {
      res.status(404).json({ error: "Rep no encontrado." });
      return;
    }
    res.json(rep);
  } catch {
    res.status(401).json({ error: "Token inválido o expirado." });
  }
});

// POST /api/reps/admin/create
// Admin-initiated rep onboarding. Generates the next ENG-XX code, creates the
// rep record, sends a WhatsApp welcome kit to the new rep.
// Body: { name, phone, colonia }
router.post("/admin/create", async (req: Request, res: Response) => {
  const { name, phone, colonia } = req.body as {
    name?: string;
    phone?: string;
    colonia?: string;
  };

  if (!name?.trim() || !phone?.trim() || !colonia?.trim()) {
    res.status(400).json({ error: "Se requieren: nombre, teléfono y colonia." });
    return;
  }

  try {
    // ── 1. Generate next ENG-XX code ─────────────────────────────────────────
    const allReps = await db.select({ repCode: repsTable.repCode }).from(repsTable);
    const maxNum = allReps.reduce((max, r) => {
      const m = r.repCode?.match(/^ENG-(\d+)$/i);
      return m ? Math.max(max, parseInt(m[1], 10)) : max;
    }, 0);
    const repCode = `ENG-${String(maxNum + 1).padStart(2, "0")}`;

    // ── 2. Derive login credentials ──────────────────────────────────────────
    const phoneDigits = phone.replace(/\D/g, "");
    const email = `${phoneDigits}@rep.pagoyamx.com`;
    const initialPassword = phoneDigits;
    const passwordHash = await bcrypt.hash(initialPassword, 10);

    // ── 3. Insert rep record ─────────────────────────────────────────────────
    const [newRep] = await db
      .insert(repsTable)
      .values({
        id: crypto.randomUUID(),
        name: name.trim(),
        phone: phone.trim(),
        email,
        passwordHash,
        status: "active",
        repCode,
      })
      .returning({ id: repsTable.id, repCode: repsTable.repCode });

    const referralLink = `https://pagoyamx.com/r/${repCode}`;

    // ── 4. WhatsApp welcome kit ──────────────────────────────────────────────
    const firstName = name.trim().split(" ")[0];
    const waMsg =
      `Hola ${firstName}, bienvenido/a al equipo PagoYa! 🎉\n\n` +
      `Tu código de referido es *${repCode}*.\n` +
      `Tu link: ${referralLink}\n\n` +
      `Tus comisiones:\n` +
      `• $150 MXN por registro\n` +
      `• $500 MXN primer pago\n` +
      `• $300 MXN por referido\n\n` +
      `Dashboard: pagoseguromx.com/rep-login\n` +
      `Email: ${email}\n` +
      `Contraseña inicial: ${initialPassword} (cámbiala pronto)`;

    await sendWhatsApp(phone.trim(), waMsg).catch((err) => {
      logger.warn({ repCode, err }, "reps: admin/create — WhatsApp send failed (non-fatal)");
    });

    logger.info({ repCode, repId: newRep.id, colonia }, "reps: admin kit created");

    res.status(201).json({
      repCode,
      referralLink,
      name: name.trim(),
      email,
      initialPassword,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ err }, "reps: admin/create failed");
    if (msg.includes("unique") || msg.includes("duplicate")) {
      res.status(409).json({ error: "Ya existe un rep con ese teléfono o código." });
    } else {
      res.status(500).json({ error: "Error al crear el rep." });
    }
  }
});

// GET /api/reps/admin/list
// All reps with live stats: signup_count, converted_count, commission totals, last_activity
router.get("/admin/list", async (req: Request, res: Response) => {
  if (!isAdmin(req)) { res.status(401).json({ error: "No autorizado." }); return; }
  try {
    const rows = await db.execute(drizzleSql`
      SELECT
        r.id,
        r.name,
        r.phone,
        r.rep_code      AS "repCode",
        r.status,
        TO_CHAR(r.created_at AT TIME ZONE 'America/Mexico_City', 'Mon DD, YYYY') AS joined,
        (SELECT COUNT(*)::int  FROM users u WHERE u.signup_ref_code = r.rep_code)                               AS signup_count,
        (SELECT COUNT(*)::int  FROM users u WHERE u.signup_ref_code = r.rep_code
          AND EXISTS (SELECT 1 FROM bill_payments bp WHERE bp.telefono = u.telefono AND bp.status = 'confirmed'))  AS converted_count,
        COALESCE((SELECT SUM(c.amount) FROM rep_commissions c WHERE c.rep_id = r.id), 0)::numeric               AS commission_total,
        COALESCE((SELECT SUM(c.amount) FROM rep_commissions c WHERE c.rep_id = r.id AND c.status = 'pending'), 0)::numeric AS commission_pending,
        (SELECT TO_CHAR(MAX(bp.created_at) AT TIME ZONE 'America/Mexico_City', 'Mon DD HH24:MI')
           FROM bill_payments bp
           JOIN  users u ON u.telefono = bp.telefono
           WHERE u.signup_ref_code = r.rep_code AND bp.status = 'confirmed')                                    AS last_activity
      FROM reps r
      ORDER BY signup_count DESC, r.created_at ASC
    `);
    res.json({ reps: rows.rows });
  } catch (err) {
    logger.error({ err }, "reps: admin/list failed");
    res.status(500).json({ error: "Error al obtener reps." });
  }
});

// GET /api/reps/admin/:repCode/users
// All users recruited by a specific rep, with payment stats
router.get("/admin/:repCode/users", async (req: Request, res: Response) => {
  if (!isAdmin(req)) { res.status(401).json({ error: "No autorizado." }); return; }
  const { repCode } = req.params;
  try {
    const rows = await db.execute(drizzleSql`
      SELECT
        u.id,
        u.name,
        u.phone,
        u.colonia,
        TO_CHAR(u.created_at AT TIME ZONE 'America/Mexico_City', 'Mon DD, YYYY') AS registered,
        (SELECT COUNT(*)::int   FROM bill_payments bp WHERE bp.telefono = u.phone AND bp.status = 'confirmed')           AS payment_count,
        COALESCE((SELECT SUM(bp.monto) FROM bill_payments bp WHERE bp.telefono = u.phone AND bp.status = 'confirmed'), 0)::numeric AS payment_volume,
        (SELECT TO_CHAR(MAX(bp.created_at) AT TIME ZONE 'America/Mexico_City', 'Mon DD')
           FROM bill_payments bp WHERE bp.telefono = u.phone AND bp.status = 'confirmed')                                AS last_payment
      FROM users u
      WHERE u.signup_ref_code = ${repCode}
      ORDER BY u.created_at DESC
    `);
    res.json({ users: rows.rows, repCode });
  } catch (err) {
    logger.error({ err, repCode }, "reps: admin/:repCode/users failed");
    res.status(500).json({ error: "Error al obtener usuarios del rep." });
  }
});

// PATCH /api/reps/admin/:id/status
// Toggle rep status: active <-> inactive
router.patch("/admin/:id/status", async (req: Request, res: Response) => {
  if (!isAdmin(req)) { res.status(401).json({ error: "No autorizado." }); return; }
  const { id } = req.params;
  const { status } = req.body as { status?: string };
  if (!status || !["active", "inactive"].includes(status)) {
    res.status(400).json({ error: "Status debe ser 'active' o 'inactive'." });
    return;
  }
  try {
    const [updated] = await db
      .update(repsTable)
      .set({ status })
      .where(eq(repsTable.id, id))
      .returning({ id: repsTable.id, name: repsTable.name, status: repsTable.status });
    if (!updated) { res.status(404).json({ error: "Rep no encontrado." }); return; }
    logger.info({ id, status }, "reps: status updated");
    res.json(updated);
  } catch (err) {
    logger.error({ err }, "reps: admin/status failed");
    res.status(500).json({ error: "Error al actualizar status." });
  }
});

export default router;
