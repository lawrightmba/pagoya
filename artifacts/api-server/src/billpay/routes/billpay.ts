import { Router, type IRouter, type Request, type Response } from "express";
import { db, billPaymentsTable, billPaymentAuditTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { routePayment, getAvailableProviders, siprelProvider } from "../services/router.js";
import { BILL_CATALOG, getCatalogSummary, getCategoriesWithTranslations, getServiceById } from "../services/catalog.js";
import { sendWhatsAppReceipt, sendLowSaldoAlert, SALDO_LOW_THRESHOLD } from "../lib/notifications.js";
import { logger } from "../../lib/logger.js";

const router: IRouter = Router();

// GET /api/bills/catalog
// Returns the full bill service catalog grouped by category, with translations
router.get("/catalog", (_req: Request, res: Response) => {
  res.json({
    categories: getCategoriesWithTranslations(),
    catalog: getCatalogSummary(),
    services: BILL_CATALOG.map((s) => ({
      id: s.id,
      name: s.name,
      category: s.category,
      logoEmoji: s.logoEmoji,
      providers: s.providers,
      minReferencia: s.minReferencia,
      minAmount: s.minAmount,
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
// Routes a bill payment through SIPREL or Evoluciona (first success wins),
// persists the confirmed record + audit log to DB, and sends a WhatsApp receipt.
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

  // Service-specific validation
  if (service.minReferencia && referencia.replace(/\D/g, "").length < service.minReferencia) {
    res.status(400).json({
      error: `La referencia para ${service.name} debe tener al menos ${service.minReferencia} dígitos.`,
    });
    return;
  }

  if (service.minAmount !== undefined && montoNum < service.minAmount) {
    res.status(400).json({
      error: `El monto mínimo para ${service.name} es $${service.minAmount} MXN.`,
    });
    return;
  }

  // 1. Insert payment record (pendiente) + audit: payment.created
  let paymentId: number;
  try {
    const [inserted] = await db.insert(billPaymentsTable).values({
      serviceId: service.id,
      serviceName: service.name,
      categoria: service.category,
      referencia,
      monto: montoNum.toFixed(2),
      telefono,
      notas: notas ?? "",
      provider: "pending",
      providerUsed: null,
      failoverUsed: false,
      confirmationCode: "pending",
      status: "pending",
    }).returning({ id: billPaymentsTable.id });
    paymentId = inserted.id;

    await db.insert(billPaymentAuditTable).values({
      paymentId,
      event: "payment.created",
      details: JSON.stringify({ serviceId, referencia, monto: montoNum, telefono }),
    });
  } catch (dbErr: unknown) {
    const message = dbErr instanceof Error ? dbErr.message : "Error al registrar el pago.";
    logger.error({ serviceId, dbErr }, "billpay: DB insert failed before payment attempt");
    res.status(500).json({ error: message });
    return;
  }

  // 2. Route through provider
  try {
    const result = await routePayment({ serviceId, referencia, monto: montoNum, telefono, notas });

    // 3. Update record with success
    await db.update(billPaymentsTable)
      .set({
        provider: result.provider,
        providerUsed: result.provider,
        failoverUsed: result.failoverUsed,
        confirmationCode: result.confirmationCode,
        status: "confirmed",
      })
      .where(eq(billPaymentsTable.id, paymentId));

    await db.insert(billPaymentAuditTable).values({
      paymentId,
      event: "payment.confirmed",
      details: JSON.stringify({
        provider: result.provider,
        failoverUsed: result.failoverUsed,
        confirmationCode: result.confirmationCode,
      }),
    });

    // 4. WhatsApp receipt (non-blocking)
    sendWhatsAppReceipt({
      telefono,
      serviceName: service.name,
      monto: montoNum,
      referencia,
      confirmationCode: result.confirmationCode,
      provider: result.provider,
    }).catch(() => {});

    // 5. Check SIPREL saldo after successful payment (non-blocking)
    if (siprelProvider.getSaldoBalance) {
      siprelProvider.getSaldoBalance().then(async (balance) => {
        if (balance < SALDO_LOW_THRESHOLD) {
          await sendLowSaldoAlert(balance);
        }
      }).catch(() => {});
    }

    logger.info({ serviceId, provider: result.provider, failoverUsed: result.failoverUsed, confirmationCode: result.confirmationCode }, "billpay: payment confirmed");

    const receiptData = result.rawResponse as Record<string, unknown> | undefined;
    res.status(201).json({
      success: true,
      confirmationCode: result.confirmationCode,
      folio: receiptData?.folio ?? result.confirmationCode,
      authCode: receiptData?.authCode ?? null,
      provider: result.provider,
      failoverUsed: result.failoverUsed,
      timestamp: result.timestamp,
      receiptData: result.rawResponse ?? null,
      service: { id: service.id, name: service.name, category: service.category, logoEmoji: service.logoEmoji },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error al procesar el pago.";
    logger.error({ serviceId, err }, "billpay: payment failed");

    // Update record to failed + audit
    await db.update(billPaymentsTable)
      .set({ status: "failed", provider: "none", providerUsed: "none", confirmationCode: "failed" })
      .where(eq(billPaymentsTable.id, paymentId)).catch(() => {});

    await db.insert(billPaymentAuditTable).values({
      paymentId,
      event: "payment.failed",
      details: message,
    }).catch(() => {});

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
