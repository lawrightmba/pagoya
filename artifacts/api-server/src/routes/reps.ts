import { Router, type Request, type Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { db, repsTable } from "@workspace/db";
import { logger } from "../lib/logger.js";

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

export default router;
