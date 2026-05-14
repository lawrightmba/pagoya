import { Router, type Request, type Response } from "express";
import { db, streetTeamTable } from "@workspace/db";
import { logger } from "../lib/logger.js";

const router = Router();

// POST /api/street-team/register
router.post("/register", async (req: Request, res: Response) => {
  const { name, phone, city, colonia, repId, refCode } = req.body as {
    name?: string;
    phone?: string;
    city?: string;
    colonia?: string;
    repId?: string;
    refCode?: string;
  };

  if (!name?.trim() || !phone?.trim() || !city?.trim() || !colonia?.trim()) {
    res.status(400).json({ error: "Se requieren nombre, teléfono, ciudad y colonia." });
    return;
  }

  const validCities = ["Puerto Vallarta", "Guadalajara"];
  if (!validCities.includes(city.trim())) {
    res.status(400).json({ error: "Ciudad no válida." });
    return;
  }

  const validColonias = [
    "Emiliano Zapata", "Versalles", "5 de Diciembre", "Pitillal",
    "Fluvial Vallarta", "Las Juntas / La Mojonera", "Zona Romántica",
    "Marina Vallarta", "Otra / Other",
  ];
  if (!validColonias.includes(colonia.trim())) {
    res.status(400).json({ error: "Colonia no válida." });
    return;
  }

  try {
    const [row] = await db
      .insert(streetTeamTable)
      .values({
        name: name.trim(),
        phone: phone.trim(),
        city: city.trim(),
        colonia: colonia.trim(),
        repId: repId?.trim() || null,
        refCode: refCode?.trim() || null,
      })
      .onConflictDoNothing()
      .returning({ id: streetTeamTable.id, colonia: streetTeamTable.colonia });

    if (!row) {
      res.status(409).json({ error: "Este número ya está registrado." });
      return;
    }

    logger.info(
      { name: name.trim(), phone: phone.trim(), city, colonia, repId: repId ?? null, refCode: refCode ?? null },
      "street-team: new registration",
    );
    res.status(201).json({ success: true, id: row.id, colonia: row.colonia });
  } catch (err) {
    logger.error({ err }, "street-team: registration failed");
    res.status(500).json({ error: "Error al registrarse. Intenta de nuevo." });
  }
});

export default router;
