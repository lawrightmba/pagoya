import { Router, type IRouter, type Request, type Response } from "express";
import { db, billPaymentsTable } from "@workspace/db";
import { desc } from "drizzle-orm";
import { routePayment, getAvailableProviders } from "../services/router.js";
import { BILL_CATALOG, getCatalogSummary, getServiceById } from "../services/catalog.js";
import { logger } from "../../lib/logger.js";

const router: IRouter = Router();

async function sendWhatsAppReceipt(params: {
  telefono: string;
  serviceName: string;
  monto: number;
  referencia: string;
  confirmationCode: string;
  provider: string;
}): Promise<void> {
  const adminNumber = process.env.ADMIN_WHATSAPP_NUMBER;

  const msg =
    `✅ *PagoYa — Pago Confirmado*\n` +
    `Servicio: ${params.serviceName}\n` +
    `Monto: $${params.monto.toFixed(2)} MXN\n` +
    `Referencia: ${params.referencia}\n` +
    `Folio: ${params.confirmationCode}\n` +
    `Proveedor: ${params.provider.toUpperCase()}\n` +
    `Tel cliente: ${params.telefono}`;

  const encoded = encodeURIComponent(msg);
  const targets: string[] = [];

  // Send to customer phone
  const cleanTel = params.telefono.replace(/\D/g, "");
  if (cleanTel) targets.push(cleanTel);

  // Also notify admin if configured
  if (adminNumber) {
    const cleanAdmin = adminNumber.replace(/\D/g, "");
    if (cleanAdmin && cleanAdmin !== cleanTel) targets.push(cleanAdmin);
  }

  for (const number of targets) {
    try {
      await fetch(`https://wa.me/${number}?text=${encoded}`, {
        method: "GET",
        signal: AbortSignal.timeout(4000),
      });
    } catch (err) {
      logger.warn({ number, err }, "billpay: WhatsApp receipt send failed (non-fatal)");
    }
  }
}

// GET /api/bills/catalog
// Returns the full bill service catalog grouped by category
router.get("/catalog", (_req: Request, res: Response) => {
  res.json({
    catalog: getCatalogSummary(),
    services: BILL_CATALOG.map((s) => ({
      id: s.id,
      name: s.name,
      category: s.category,
      logoEmoji: s.logoEmoji,
      providers: s.providers,
    })),
    providers: {
      available: getAvailableProviders(),
      all: ["siprel", "evoluciona"],
    },
  });
});

// GET /api/bills/services/:serviceId
// Returns details for a single service
router.get("/services/:serviceId", (req: Request, res: Response) => {
  const service = getServiceById(req.params.serviceId);
  if (!service) {
    res.status(404).json({ error: `Servicio no encontrado: ${req.params.serviceId}` });
    return;
  }
  res.json(service);
});

// POST /api/bills/pay
// Routes a bill payment through SIPREL or Evoluciona (whoever responds first),
// persists the confirmed record to DB, and sends a WhatsApp admin receipt.
// Body: { serviceId, referencia, monto, telefono, notas? }
router.post("/pay", async (req: Request, res: Response) => {
  const { serviceId, referencia, monto, telefono, notas } = req.body as {
    serviceId: string;
    referencia: string;
    monto: number;
    telefono: string;
    notas?: string;
  };

  if (!serviceId || !referencia || !monto || !telefono) {
    res.status(400).json({
      error: "Faltan campos requeridos: serviceId, referencia, monto, telefono",
    });
    return;
  }

  const montoNum = parseFloat(String(monto));
  if (isNaN(montoNum) || montoNum <= 0) {
    res.status(400).json({ error: "El monto debe ser un número positivo." });
    return;
  }

  const service = getServiceById(serviceId);
  if (!service) {
    res.status(404).json({ error: `Servicio no encontrado: ${serviceId}` });
    return;
  }

  try {
    const result = await routePayment({ serviceId, referencia, monto: montoNum, telefono, notas });

    await db.insert(billPaymentsTable).values({
      serviceId: service.id,
      serviceName: service.name,
      categoria: service.category,
      referencia,
      monto: montoNum.toFixed(2),
      telefono,
      notas: notas ?? "",
      provider: result.provider,
      confirmationCode: result.confirmationCode,
      status: "confirmed",
    });

    sendWhatsAppReceipt({
      telefono,
      serviceName: service.name,
      monto: montoNum,
      referencia,
      confirmationCode: result.confirmationCode,
      provider: result.provider,
    }).catch(() => {});

    logger.info({ serviceId, provider: result.provider, confirmationCode: result.confirmationCode }, "billpay: payment confirmed");

    res.status(201).json({
      success: true,
      confirmationCode: result.confirmationCode,
      provider: result.provider,
      timestamp: result.timestamp,
      service: { id: service.id, name: service.name, category: service.category, logoEmoji: service.logoEmoji },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error al procesar el pago.";
    logger.error({ serviceId, err }, "billpay: payment failed");
    res.status(502).json({ error: message });
  }
});

// GET /api/bills/history
// Returns the 10 most recent bill payments from the DB
router.get("/history", async (_req: Request, res: Response) => {
  try {
    const payments = await db
      .select()
      .from(billPaymentsTable)
      .orderBy(desc(billPaymentsTable.createdAt))
      .limit(10);
    res.json({ payments });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error al obtener historial.";
    res.status(500).json({ error: message });
  }
});

export default router;
