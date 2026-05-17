import { Router, type IRouter, type Request, type Response } from "express";
import { eq, desc } from "drizzle-orm";
import { db, billPaymentsTable } from "@workspace/db";
import { logger } from "../lib/logger.js";

const router: IRouter = Router();

// GET /api/historial?phone=521234567890
// Returns the last 50 bill payments for the given phone number.
// Response fields: id, service_name, reference_number, amount, fee, status,
//                  provider_used, created_at
router.get("/", async (req: Request, res: Response) => {
  const phone = (req.query["phone"] as string | undefined)?.trim();

  if (!phone) {
    res.status(400).json({ error: "Se requiere el parámetro 'phone'." });
    return;
  }

  try {
    const rows = await db
      .select({
        id: billPaymentsTable.id,
        service_name: billPaymentsTable.serviceName,
        reference_number: billPaymentsTable.referencia,
        amount: billPaymentsTable.monto,
        fee: billPaymentsTable.platformFeeMxn,
        status: billPaymentsTable.status,
        provider_used: billPaymentsTable.providerUsed,
        created_at: billPaymentsTable.createdAt,
      })
      .from(billPaymentsTable)
      .where(eq(billPaymentsTable.telefono, phone))
      .orderBy(desc(billPaymentsTable.createdAt))
      .limit(50);

    res.json({ payments: rows });
  } catch (err: unknown) {
    logger.error({ err, phone }, "historial: query failed");
    res.status(500).json({ error: "Error al obtener el historial." });
  }
});

export default router;
