import { Router, type Request, type Response } from "express";
import { db, streetTeamTable } from "@workspace/db";
import { logger } from "../lib/logger.js";

const router = Router();

// POST /api/street-team/register
router.post("/register", async (req: Request, res: Response) => {
  const { name, phone, city } = req.body as {
    name?: string;
    phone?: string;
    city?: string;
  };

  if (!name?.trim() || !phone?.trim() || !city?.trim()) {
    res.status(400).json({ error: "Se requieren nombre, teléfono y ciudad." });
    return;
  }

  const validCities = ["Puerto Vallarta", "Guadalajara"];
  if (!validCities.includes(city.trim())) {
    res.status(400).json({ error: "Ciudad no válida." });
    return;
  }

  try {
    const [row] = await db
      .insert(streetTeamTable)
      .values({ name: name.trim(), phone: phone.trim(), city: city.trim() })
      .onConflictDoNothing()
      .returning({ id: streetTeamTable.id });

    if (!row) {
      res.status(409).json({ error: "Este número ya está registrado." });
      return;
    }

    logger.info({ name: name.trim(), phone: phone.trim(), city }, "street-team: new registration");
    res.status(201).json({ success: true, id: row.id });
  } catch (err) {
    logger.error({ err }, "street-team: registration failed");
    res.status(500).json({ error: "Error al registrarse. Intenta de nuevo." });
  }
});

export default router;
