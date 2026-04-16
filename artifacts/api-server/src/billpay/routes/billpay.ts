import { Router, type IRouter, type Request, type Response } from "express";
import { db, billPaymentsTable, billPaymentAuditTable, repCommissionsTable, usersTable, repsTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { routePayment, getAvailableProviders, siprelProvider } from "../services/router.js";
import { BILL_CATALOG, getCatalogSummary, getCategoriesWithTranslations, getServiceById } from "../services/catalog.js";
import { sendWhatsAppReceipt, sendLowSaldoAlert, SALDO_LOW_THRESHOLD } from "../lib/notifications.js";
import { getOrCreateWallet, getBalance, debitWallet } from "../../wallet/services/wallet.js";
import { logger } from "../../lib/logger.js";

const BILL_PAY_COMMISSION_AMOUNT = "5.00";
const COMMISSION_HOLD_DAYS = 7;

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
// Body: { serviceId, referencia, monto, telefono, notas?, rep_id?, paymentSource? }
router.post("/pay", async (req: Request, res: Response) => {
  const { serviceId, referencia, monto, telefono, notas, rep_id, paymentSource } = req.body as {
    serviceId: string;
    referencia: string;
    monto: number;
    telefono: string;
    notas?: string;
    rep_id?: string;
    paymentSource?: "wallet" | "card";
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

  // 0a. Wallet balance pre-check (before we touch the DB or provider)
  let walletId: string | null = null;
  if (paymentSource === "wallet") {
    try {
      const wallet = await getOrCreateWallet(telefono);
      const balance = parseFloat(wallet.balanceMxn ?? "0");
      if (balance < montoNum) {
        res.status(400).json({
          error: "INSUFFICIENT_BALANCE",
          currentBalance: balance,
          required: montoNum,
        });
        return;
      }
      walletId = wallet.id;
    } catch (walletErr: unknown) {
      const message = walletErr instanceof Error ? walletErr.message : "Error al verificar saldo.";
      res.status(500).json({ error: message });
      return;
    }
  }

  // 0b. Resolve effective rep_id: body > user referral lookup
  let effectiveRepId: string | null = rep_id ?? null;
  if (!effectiveRepId && telefono) {
    try {
      const [user] = await db
        .select({ referredByRepId: usersTable.referredByRepId })
        .from(usersTable)
        .where(eq(usersTable.telefono, telefono))
        .limit(1);
      if (user?.referredByRepId) effectiveRepId = user.referredByRepId;
    } catch {
      // Non-fatal — proceed without rep attribution
    }
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
      repId: effectiveRepId,
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

    // 4. Rep commission (non-blocking) — 5 MXN per confirmed bill payment, 7-day hold
    if (effectiveRepId) {
      const holdUntil = new Date();
      holdUntil.setDate(holdUntil.getDate() + COMMISSION_HOLD_DAYS);
      db.insert(repCommissionsTable).values({
        repId: effectiveRepId,
        billPaymentId: paymentId,
        amount: BILL_PAY_COMMISSION_AMOUNT,
        type: "bill_pay",
        status: "pending",
        holdUntil,
      }).catch((err: unknown) => {
        logger.error({ err, repId: effectiveRepId, paymentId }, "billpay: commission insert failed");
      });
    }

    // 5. Wallet debit — only after provider confirms; non-fatal on failure
    if (walletId) {
      debitWallet(
        walletId,
        montoNum,
        `Pago ${service.name} ref ${referencia}`,
      ).catch((walletErr: unknown) => {
        const msg = walletErr instanceof Error ? walletErr.message : String(walletErr);
        logger.error(
          { walletId, paymentId, amount: montoNum, err: msg },
          "wallet: debit failed after confirmed bill pay — flag for reconciliation",
        );
      });
    }

    // 6. WhatsApp receipt (non-blocking)
    sendWhatsAppReceipt({
      telefono,
      serviceName: service.name,
      monto: montoNum,
      referencia,
      confirmationCode: result.confirmationCode,
      provider: result.provider,
    }).catch(() => {});

    // 6. Check SIPREL saldo after successful payment (non-blocking)
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

// GET /api/bills/history?limit=N
// Returns the N most recent bill payments from the DB (default 20, max 100)
router.get("/history", async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(String(req.query.limit ?? "20")) || 20, 100);
    const payments = await db
      .select()
      .from(billPaymentsTable)
      .orderBy(desc(billPaymentsTable.createdAt))
      .limit(limit);
    res.json({ payments });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error al obtener historial.";
    res.status(500).json({ error: message });
  }
});

// GET /api/bills/admin/health
// Returns live health status of all configured bill pay providers
router.get("/admin/health", (_req: Request, res: Response) => {
  const siprelConfigured = !!(
    process.env.SIPREL_API_KEY &&
    process.env.SIPREL_USER_ID &&
    process.env.SIPREL_BASE_URL
  );
  const evolucionaConfigured = !!(
    process.env.EVOLUCIONA_API_KEY &&
    process.env.EVOLUCIONA_USER_ID
  );

  res.json({
    providers: {
      siprel: {
        name: "SIPREL",
        configured: siprelConfigured,
        status: siprelConfigured ? "healthy" : "unconfigured",
      },
      evoluciona: {
        name: "Evoluciona Móvil",
        configured: evolucionaConfigured,
        mode: process.env.EVOLUCIONA_MODE ?? "postpago",
        status: evolucionaConfigured ? "healthy" : "unconfigured",
      },
    },
    timestamp: new Date().toISOString(),
  });
});

// GET /api/bills/admin/balance
// Returns the current SIPREL saldo balance (calls live API if configured)
router.get("/admin/balance", async (_req: Request, res: Response) => {
  if (!siprelProvider.getSaldoBalance || !siprelProvider.isAvailable()) {
    res.json({
      balance: null,
      currency: "MXN",
      provider: "siprel",
      configured: false,
      lowBalance: false,
      threshold: 500,
    });
    return;
  }

  try {
    const balance = await siprelProvider.getSaldoBalance();
    res.json({
      balance,
      currency: "MXN",
      provider: "siprel",
      configured: true,
      lowBalance: balance < 500,
      threshold: 500,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error al obtener saldo.";
    logger.error({ err }, "billpay: admin balance check failed");
    res.status(502).json({ error: message, configured: true, balance: null });
  }
});

// GET /api/bills/reps/:repId/commissions
// Rep dashboard: commission summary + last 10 bill payments for this rep
router.get("/reps/:repId/commissions", async (req: Request, res: Response) => {
  const { repId } = req.params;
  try {
    const commissions = await db
      .select()
      .from(repCommissionsTable)
      .where(eq(repCommissionsTable.repId, repId))
      .orderBy(desc(repCommissionsTable.createdAt));

    const lifetimeTotal = commissions
      .filter((c) => c.status === "pending" || c.status === "paid")
      .reduce((sum, c) => sum + parseFloat(c.amount), 0);
    const pendingTotal = commissions
      .filter((c) => c.status === "pending")
      .reduce((sum, c) => sum + parseFloat(c.amount), 0);
    const paidTotal = commissions
      .filter((c) => c.status === "paid")
      .reduce((sum, c) => sum + parseFloat(c.amount), 0);

    // Fetch last 10 bill payments attributed to this rep
    const recentPayments = await db
      .select({
        id: billPaymentsTable.id,
        serviceName: billPaymentsTable.serviceName,
        monto: billPaymentsTable.monto,
        status: billPaymentsTable.status,
        createdAt: billPaymentsTable.createdAt,
      })
      .from(billPaymentsTable)
      .where(eq(billPaymentsTable.repId, repId))
      .orderBy(desc(billPaymentsTable.createdAt))
      .limit(10);

    res.json({
      repId,
      summary: {
        lifetimeTotal: lifetimeTotal.toFixed(2),
        pendingTotal: pendingTotal.toFixed(2),
        paidTotal: paidTotal.toFixed(2),
        totalTransactions: commissions.length,
        currency: "MXN",
      },
      recentPayments: recentPayments.map((p) => ({
        ...p,
        commissionAmount: BILL_PAY_COMMISSION_AMOUNT,
      })),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error al obtener comisiones.";
    res.status(500).json({ error: message });
  }
});

// GET /api/bills/admin/reps
// Admin view: all reps with commission totals by type
router.get("/admin/reps", async (_req: Request, res: Response) => {
  try {
    const allReps = await db.select().from(repsTable).orderBy(repsTable.id);

    const allCommissions = await db
      .select()
      .from(repCommissionsTable);

    const repMap: Record<string, {
      id: string; name: string; phone: string;
      billPayCount: number; billPayTotal: string; billPayPending: string;
      signupCount: number; signupTotal: string;
      referralCount: number; referralTotal: string;
    }> = {};

    for (const rep of allReps) {
      repMap[rep.id] = {
        id: rep.id, name: rep.name, phone: rep.phone,
        billPayCount: 0, billPayTotal: "0.00", billPayPending: "0.00",
        signupCount: 0, signupTotal: "0.00",
        referralCount: 0, referralTotal: "0.00",
      };
    }

    for (const c of allCommissions) {
      if (!repMap[c.repId]) continue;
      const amt = parseFloat(c.amount);
      if (c.type === "bill_pay") {
        repMap[c.repId].billPayCount += 1;
        repMap[c.repId].billPayTotal = (parseFloat(repMap[c.repId].billPayTotal) + amt).toFixed(2);
        if (c.status === "pending") {
          repMap[c.repId].billPayPending = (parseFloat(repMap[c.repId].billPayPending) + amt).toFixed(2);
        }
      } else if (c.type === "signup") {
        repMap[c.repId].signupCount += 1;
        repMap[c.repId].signupTotal = (parseFloat(repMap[c.repId].signupTotal) + amt).toFixed(2);
      } else if (c.type === "referral") {
        repMap[c.repId].referralCount += 1;
        repMap[c.repId].referralTotal = (parseFloat(repMap[c.repId].referralTotal) + amt).toFixed(2);
      }
    }

    res.json({ reps: Object.values(repMap) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error al obtener reps.";
    res.status(500).json({ error: message });
  }
});

export default router;
