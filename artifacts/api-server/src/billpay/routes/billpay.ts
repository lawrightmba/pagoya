import { Router, type IRouter, type Request, type Response } from "express";
import { db, billPaymentsTable, billPaymentAuditTable, repCommissionsTable, usersTable, repsTable, walletsTable, walletTransactionsTable } from "@workspace/db";
import { desc, eq, sql, and, gte } from "drizzle-orm";
import { routePayment, getAvailableProviders, siprelProvider } from "../services/router.js";
import { taecelGetProducts, taecelCheckSkuAvailability, taecelCheckStockAndAlert } from "../providers/siprel.js";
import { taecelProductCacheTable } from "@workspace/db";
import { BILL_CATALOG, getCatalogSummary, getCategoriesWithTranslations, getServiceById } from "../services/catalog.js";
import { sendWhatsAppReceipt, sendLowSaldoAlert, SALDO_LOW_THRESHOLD } from "../lib/notifications.js";
import { sendWhatsApp } from "../../lib/whatsapp.js";
import { getOrCreateWallet, getBalance } from "../../wallet/services/wallet.js";
import { captureUserProfile } from "../../services/profiles.js";
import { earnPoints } from "../../services/loyalty.js";
import { sendPushToUser } from "../../services/pushService.js";
import { scheduleReferralNudgeIfEligible } from "../../services/lifecycleNudgeService.js";
import { logger } from "../../lib/logger.js";

const BILL_PAY_COMMISSION_AMOUNT = "5.00";
const COMMISSION_HOLD_DAYS = 7;
const PLATFORM_FEE_MXN = "25.00";
const TAECEL_COST_PER_TXN_MXN = 5.00;
const NET_MARGIN_PER_TXN_MXN = 3.00;

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
      maxReferencia: s.maxReferencia,
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
// Routes a bill payment through SIPREL or Evoluciona (first success wins).
// Strict ordering: balance check → provider call → atomic DB commit (wallet debit
// + bill_payment insert in one transaction). The wallet is only debited after the
// provider confirms success. A failed provider call records a 'fallido' bill_payment
// but never touches the wallet.
// Body: { serviceId, referencia, monto, telefono, notas?, rep_id?, paymentSource? }
router.post("/pay", async (req: Request, res: Response) => {
  const { serviceId, referencia, monto, telefono, notas, rep_id, paymentSource, free_tx_token } = req.body as {
    serviceId: string;
    referencia: string;
    monto: number;
    telefono: string;
    notas?: string;
    rep_id?: string;
    paymentSource?: "wallet" | "card";
    free_tx_token?: string;
  };

  const service = getServiceById(serviceId);
  if (!service) {
    res.status(404).json({ error: `Servicio no encontrado: ${serviceId}` });
    return;
  }

  // Gift cards: referencia is not user-supplied — use last 10 digits of phone (SIPREL max 10 chars).
  // monto is fixed to the denomination baked into the catalog entry.
  const effectiveReferencia = service.isGiftCard ? telefono.replace(/\D/g, "").slice(-10) : referencia;
  const effectiveMonto = service.isGiftCard && service.fixedAmount != null
    ? service.fixedAmount
    : parseFloat(String(monto));

  if (!serviceId || !telefono) {
    res.status(400).json({ error: "Faltan campos requeridos: serviceId, telefono" });
    return;
  }
  if (!service.isGiftCard && !referencia) {
    res.status(400).json({ error: "Falta el campo requerido: referencia" });
    return;
  }
  if (!service.isGiftCard && !monto) {
    res.status(400).json({ error: "Falta el campo requerido: monto" });
    return;
  }

  const montoNum = effectiveMonto;
  if (isNaN(montoNum) || montoNum <= 0) {
    res.status(400).json({ error: "El monto debe ser un número positivo." });
    return;
  }

  // Service-specific validation — skip referencia checks for gift cards
  if (!service.isGiftCard) {
    if (service.minReferencia && referencia.replace(/\D/g, "").length < service.minReferencia) {
      res.status(400).json({
        error: `La referencia para ${service.name} debe tener al menos ${service.minReferencia} dígitos.`,
      });
      return;
    }
    if (service.maxReferencia && referencia.replace(/\D/g, "").length > service.maxReferencia) {
      res.status(400).json({
        error: `La referencia para ${service.name} debe tener máximo ${service.maxReferencia} dígitos.`,
      });
      return;
    }
    if (service.minAmount !== undefined && montoNum < service.minAmount) {
      res.status(400).json({
        error: `El monto mínimo para ${service.name} es $${service.minAmount} MXN.`,
      });
      return;
    }
  }

  // ── Gift card SKU availability pre-check (fail open) ────────────────────────
  // Runs before any charge is initiated. A 5-second timeout is enforced via the
  // taecelPost helper. On any error the purchase proceeds (fail-open policy).
  if (service.isGiftCard && service.siprelServiceId) {
    try {
      const { available } = await taecelCheckSkuAvailability(service.siprelServiceId);
      if (!available) {
        console.warn(`[GiftCard] SKU unavailable: ${service.siprelServiceId} ${effectiveMonto} MXN`);
        res.status(409).json({
          error: "Lo sentimos, esta tarjeta de regalo no está disponible en este momento. Por favor elige otra opción o intenta más tarde.",
          unavailable: true,
        });
        return;
      }
    } catch (preCheckErr) {
      const msg = preCheckErr instanceof Error ? preCheckErr.message : String(preCheckErr);
      console.error(`[GiftCard] Pre-check failed for SKU ${service.siprelServiceId}: ${msg}`);
      // fail open — proceed with the purchase
    }
  }

  // ── Token pre-validation (fail fast, no DB writes) ───────────────────────────
  let freeTxTokenValid = false;
  if (free_tx_token) {
    const tokenCheck = await db.execute(
      sql`SELECT id FROM loyalty_accounts
          WHERE phone = ${telefono} AND ${free_tx_token} = ANY(redemption_tokens) LIMIT 1`,
    );
    if (!(tokenCheck.rows as unknown[]).length) {
      res.status(400).json({ error: "Token de pago gratuito inválido o ya utilizado." });
      return;
    }
    freeTxTokenValid = true;
  }

  // Fee is waived when a valid free-transaction token is supplied
  const effectiveFee = freeTxTokenValid ? "0.00" : PLATFORM_FEE_MXN;

  // ── Step 1: Wallet balance pre-check (no DB writes yet) ─────────────────────
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

  // Resolve effective rep_id: body > user referral lookup (no DB writes)
  let effectiveRepId: string | null = rep_id ?? null;
  let userNumericId: number | null = null;
  if (telefono) {
    try {
      const [user] = await db
        .select({ referredByRepId: usersTable.referredByRepId, id: usersTable.id })
        .from(usersTable)
        .where(eq(usersTable.telefono, telefono))
        .limit(1);
      if (user?.referredByRepId) effectiveRepId = user.referredByRepId;
      if (user?.id) userNumericId = user.id;
    } catch {
      // Non-fatal — proceed without rep attribution
    }
  }

  // ── Daily per-user bill payment cap (AML floor) ───────────────────────────────
  const DAILY_BILL_CAP_MXN = 50_000;
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const [dailyRow] = await db
      .select({ total: sql<string>`COALESCE(SUM(monto::numeric), 0)` })
      .from(billPaymentsTable)
      .where(
        and(
          eq(billPaymentsTable.telefono, telefono),
          eq(billPaymentsTable.status, "confirmed"),
          gte(billPaymentsTable.createdAt, startOfDay),
        ),
      );
    const todayTotal = parseFloat(dailyRow?.total ?? "0");
    if (todayTotal + montoNum > DAILY_BILL_CAP_MXN) {
      res.status(429).json({
        error: `Límite diario alcanzado. El máximo de pagos por día es $${DAILY_BILL_CAP_MXN.toLocaleString("es-MX")} MXN.`,
      });
      return;
    }
  } catch {
    // Non-fatal — don't block payment if daily-cap query fails
  }

  // ── Step 2: Call the provider (no DB writes yet) ─────────────────────────────
  let result: Awaited<ReturnType<typeof routePayment>>;
  try {
    result = await routePayment({ serviceId, referencia: effectiveReferencia, monto: montoNum, telefono, notas });
  } catch (providerErr: unknown) {
    // Provider failed — wallet is untouched. Record the failure and return a clear message.
    const message = providerErr instanceof Error ? providerErr.message : "Error al procesar el pago.";
    logger.error({ serviceId, err: providerErr }, "billpay: payment failed");

    await db.insert(billPaymentsTable).values({
      serviceId: service.id,
      serviceName: service.name,
      categoria: service.category,
      referencia,
      monto: montoNum.toFixed(2),
      telefono,
      notas: notas ?? "",
      provider: "none",
      providerUsed: "none",
      failoverUsed: false,
      confirmationCode: "failed",
      status: "fallido",
      paymentMethod: paymentSource === "wallet" ? "wallet" : "card",
      repId: effectiveRepId,
      platformFeeMxn: effectiveFee,
    }).returning({ id: billPaymentsTable.id })
      .then(([r]) =>
        db.insert(billPaymentAuditTable).values({
          paymentId: r.id,
          event: "payment.failed",
          details: message,
        }),
      )
      .catch(() => {});

    // ── Non-blocking: alert if SIPREL failure rate >10% in last hour ───────────
    const adminNumber = process.env.ADMIN_WHATSAPP_NUMBER;
    if (adminNumber) {
      db.execute(sql`
        SELECT
          COUNT(*) FILTER (WHERE status = 'fallido') AS failures,
          COUNT(*) AS total
        FROM bill_payments
        WHERE created_at >= NOW() - INTERVAL '1 hour'
      `).then((r) => {
        const row = r.rows[0] as { failures: string; total: string } | undefined;
        const failures = parseInt(row?.failures ?? "0", 10);
        const total = parseInt(row?.total ?? "0", 10);
        if (total >= 5 && failures / total >= 0.10) {
          import("../../lib/whatsapp.js")
            .then(({ sendWhatsApp }) => sendWhatsApp(
              adminNumber,
              `⚠️ *PagoYa | Alta tasa de fallos SIPREL*\n` +
              `Última hora: ${failures}/${total} pagos fallidos (${Math.round(failures / total * 100)}%)\n` +
              `Servicio: ${serviceId}\n` +
              `${new Date().toLocaleString("es-MX", { timeZone: "America/Mexico_City" })}`
            ))
            .catch(() => {});
        }
      }).catch(() => {});
    }

    res.status(502).json({ error: "Tu pago no se procesó. Tu saldo no fue afectado." });
    return;
  }

  // ── Step 3: Provider confirmed — commit bill_payment + wallet debit atomically ─
  const raw = result.rawResponse as Record<string, unknown> | undefined;
  const maskedRef = `••••${referencia.slice(-4)}`;
  let paymentId!: number;

  try {
    await db.transaction(async (tx) => {
      // 3a. Insert the confirmed bill_payment record
      const [inserted] = await tx.insert(billPaymentsTable).values({
        serviceId: service.id,
        serviceName: service.name,
        categoria: service.category,
        referencia,
        monto: montoNum.toFixed(2),
        telefono,
        notas: notas ?? "",
        provider: result.provider,
        providerUsed: result.provider,
        failoverUsed: result.failoverUsed,
        confirmationCode: result.confirmationCode,
        status: result.status ?? "confirmed",
        taecelTransId: typeof raw?.transID === "string" ? raw.transID : null,
        taecelFolio: typeof raw?.folio === "string" ? raw.folio : null,
        taecelCarrier: typeof raw?.carrier === "string" ? raw.carrier : null,
        taecelCargoMxn: typeof raw?.cargoMxn === "number" ? String(raw.cargoMxn) : null,
        bolsaType: typeof raw?.bolsaType === "string" ? raw.bolsaType : null,
        paymentMethod: paymentSource === "wallet" ? "wallet" : "card",
        repId: effectiveRepId,
        platformFeeMxn: effectiveFee,
      }).returning({ id: billPaymentsTable.id });
      paymentId = inserted.id;

      // 3b. Audit: payment confirmed
      await tx.insert(billPaymentAuditTable).values({
        paymentId,
        event: "payment.confirmed",
        details: JSON.stringify({
          provider: result.provider,
          failoverUsed: result.failoverUsed,
          confirmationCode: result.confirmationCode,
        }),
      });

      // 3c. Wallet debit — inlined here so it shares this transaction
      if (walletId) {
        // Atomic conditional debit: the UPDATE only executes if balance_mxn is still
        // sufficient at the moment the statement runs. This eliminates the race window
        // that exists between a separate SELECT (balance read) and a subsequent UPDATE
        // under PostgreSQL's READ COMMITTED isolation.
        const updated = await tx
          .update(walletsTable)
          .set({
            balanceMxn: sql`balance_mxn - ${montoNum.toFixed(2)}`,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(walletsTable.id, walletId),
              sql`balance_mxn >= ${montoNum.toFixed(2)}::numeric`,
            ),
          )
          .returning({ id: walletsTable.id });

        if (updated.length === 0) {
          throw new Error("INSUFFICIENT_BALANCE");
        }

        await tx.insert(walletTransactionsTable).values({
          walletId,
          type: "bill_pay",
          amountMxn: montoNum.toFixed(2),
          status: "confirmed",
          description: `Pago ${service.name} — ref ${maskedRef}`,
          confirmedAt: new Date(),
        });
      }

      // 3d. Free-tx token consumption — atomic with the payment insert above
      if (freeTxTokenValid && free_tx_token) {
        // Remove the token from the array so it cannot be reused
        await tx.execute(
          sql`UPDATE loyalty_accounts
              SET redemption_tokens = array_remove(redemption_tokens, ${free_tx_token})
              WHERE phone = ${telefono}`,
        );
        // Audit row in loyalty_transactions (table not in Drizzle schema — raw SQL)
        await tx.execute(
          sql`INSERT INTO loyalty_transactions
                (account_id, phone, type, points, balance_after, description, payment_ref)
              SELECT id, phone, 'token_consumed', 0, points_balance,
                     'Free transaction token applied', ${String(paymentId)}
              FROM loyalty_accounts WHERE phone = ${telefono} LIMIT 1`,
        );
      }
    });
  } catch (txErr: unknown) {
    // ── Step 5: Rare — provider confirmed but DB transaction failed ─────────────
    // The provider already processed the payment. Flag for manual reconciliation.
    const txMsg = txErr instanceof Error ? txErr.message : String(txErr);
    logger.error(
      {
        serviceId,
        referencia,
        telefono,
        txErr: txMsg,
        confirmationCode: result.confirmationCode,
        provider: result.provider,
      },
      "billpay: DB transaction failed after provider success — MANUAL RECONCILIATION REQUIRED",
    );

    // Persist the confirmed payment record and discrepancy audit outside the failed transaction
    db.insert(billPaymentsTable).values({
      serviceId: service.id,
      serviceName: service.name,
      categoria: service.category,
      referencia,
      monto: montoNum.toFixed(2),
      telefono,
      notas: notas ?? "",
      provider: result.provider,
      providerUsed: result.provider,
      failoverUsed: result.failoverUsed,
      confirmationCode: result.confirmationCode,
      status: result.status ?? "confirmed",
      paymentMethod: paymentSource === "wallet" ? "wallet" : "card",
      repId: effectiveRepId,
      platformFeeMxn: effectiveFee,
    }).returning({ id: billPaymentsTable.id })
      .then(([r]) =>
        db.insert(billPaymentAuditTable).values({
          paymentId: r.id,
          event: "wallet_deduction_failed_post_provider_success",
          details: JSON.stringify({
            confirmationCode: result.confirmationCode,
            provider: result.provider,
            txError: txMsg,
          }),
        }),
      )
      .catch((saveErr) => {
        logger.error(
          { saveErr },
          "billpay: could not persist reconciliation record — URGENT manual action required",
        );
      });

    res.status(500).json({ error: "Tu pago no se procesó. Tu saldo no fue afectado." });
    return;
  }

  // ── Step 4: Non-blocking side effects (transaction already committed) ─────────

  // Rep commission — 5 MXN per confirmed bill payment, 7-day hold
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

  // Landlord commission — $150 MXN on the user's FIRST confirmed bill payment
  (async () => {
    try {
      const landlordRow = await db.execute(
        sql`SELECT referred_by_landlord FROM users WHERE telefono = ${telefono} AND referred_by_landlord IS NOT NULL LIMIT 1`,
      );
      if (landlordRow.rows.length === 0) return;
      const landlordCode = (landlordRow.rows[0] as { referred_by_landlord: string }).referred_by_landlord;

      const priorPayments = await db.execute(
        sql`SELECT COUNT(*) as cnt FROM bill_payments WHERE telefono = ${telefono} AND status = 'confirmed' AND id < ${paymentId}`,
      );
      const prior = parseInt((priorPayments.rows[0] as { cnt: string }).cnt, 10);
      if (prior > 0) return;

      const updated = await db.execute(
        sql`UPDATE landlords SET total_commission_mxn = total_commission_mxn + 150, updated_at = NOW()
            WHERE landlord_code = ${landlordCode}
            RETURNING full_name, total_commission_mxn`,
      );
      if (updated.rows.length === 0) return;
      const { full_name, total_commission_mxn } = updated.rows[0] as { full_name: string; total_commission_mxn: number };

      await db.execute(
        sql`INSERT INTO landlord_commissions (landlord_code, user_id, payment_id, amount_mxn)
            VALUES (${landlordCode}, ${telefono}, ${String(paymentId)}, 150)`,
      );

      const adminNumber = process.env.ADMIN_WHATSAPP_NUMBER;
      if (adminNumber) {
        sendWhatsApp(
          adminNumber,
          `💰 Comisión de propietario generada\nPropietario: ${landlordCode} (${full_name})\nInquilino: ${telefono}\nComisión: $150 MXN\nTotal acumulado: $${total_commission_mxn} MXN`,
        ).catch(() => {});
      }

      logger.info({ landlordCode, telefono, paymentId }, "billpay: landlord commission credited");
    } catch (err) {
      logger.error({ err, telefono, paymentId }, "billpay: landlord commission failed (non-fatal)");
    }
  })();

  // WhatsApp receipt
  sendWhatsAppReceipt({
    telefono,
    serviceName: service.name,
    monto: montoNum,
    referencia,
    confirmationCode: result.confirmationCode,
    provider: result.provider,
  }).catch(() => {});

  // User profile capture for retention / reminders
  captureUserProfile({
    phone: telefono,
    billerId: serviceId,
    billerName: service.name,
    amount: montoNum,
    repId: effectiveRepId ?? undefined,
  }).catch(() => {});

  // Loyalty points
  earnPoints(telefono, montoNum, "bill_pay", service.name, String(paymentId)).catch(() => {});

  // Referral nudge — schedule 60-min delayed send if user meets eligibility criteria
  if (userNumericId !== null) {
    scheduleReferralNudgeIfEligible(userNumericId);
  }

  // Push notification — payment confirmed
  sendPushToUser(telefono, {
    title: `✅ Pago confirmado — ${service.name}`,
    body: `$${montoNum.toFixed(2)} MXN pagados exitosamente.`,
    url: "/",
  }).catch(() => {});

  // SIPREL saldo low-balance alert
  if (siprelProvider.getSaldoBalance) {
    siprelProvider.getSaldoBalance().then(async ({ pagoServicios }) => {
      if (pagoServicios < SALDO_LOW_THRESHOLD) {
        await sendLowSaldoAlert(pagoServicios);
      }
    }).catch(() => {});
  }

  // Gift card post-fulfillment low-stock check (fire-and-forget)
  if (service.isGiftCard && service.siprelServiceId) {
    taecelCheckStockAndAlert(service.siprelServiceId, service.name, montoNum).catch(() => {});
  }

  logger.info(
    { serviceId, provider: result.provider, failoverUsed: result.failoverUsed, confirmationCode: result.confirmationCode },
    "billpay: payment confirmed",
  );

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
    process.env.SIPREL_NIP &&
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
// Returns SIPREL saldo balances (Tiempo Aire + Pago de Servicios)
router.get("/admin/balance", async (_req: Request, res: Response) => {
  if (!siprelProvider.getSaldoBalance || !siprelProvider.isAvailable()) {
    res.json({
      tiempoAire: null,
      pagoServicios: null,
      currency: "MXN",
      provider: "siprel",
      configured: false,
      lowBalance: false,
      threshold: 500,
    });
    return;
  }

  try {
    const { tiempoAire, pagoServicios } = await siprelProvider.getSaldoBalance();
    res.json({
      tiempoAire,
      pagoServicios,
      currency: "MXN",
      provider: "siprel",
      configured: true,
      lowBalance: pagoServicios < 500,
      threshold: 500,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error al obtener saldo.";
    logger.error({ err }, "billpay: admin balance check failed");
    res.status(502).json({ error: message, configured: true, tiempoAire: null, pagoServicios: null });
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

// GET /api/bills/admin/revenue
// Platform fee revenue reporting: today / this month / all-time
router.get("/admin/revenue", async (_req: Request, res: Response) => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [allTime] = await db
      .select({
        totalFee: sql<string>`COALESCE(SUM(platform_fee_mxn), 0)`,
        txCount: sql<string>`COUNT(*)`,
      })
      .from(billPaymentsTable)
      .where(eq(billPaymentsTable.status, "confirmed"));

    const [thisMonth] = await db
      .select({
        totalFee: sql<string>`COALESCE(SUM(platform_fee_mxn), 0)`,
        txCount: sql<string>`COUNT(*)`,
      })
      .from(billPaymentsTable)
      .where(and(
        eq(billPaymentsTable.status, "confirmed"),
        gte(billPaymentsTable.createdAt, monthStart),
      ));

    const [today] = await db
      .select({
        totalFee: sql<string>`COALESCE(SUM(platform_fee_mxn), 0)`,
        txCount: sql<string>`COUNT(*)`,
      })
      .from(billPaymentsTable)
      .where(and(
        eq(billPaymentsTable.status, "confirmed"),
        gte(billPaymentsTable.createdAt, todayStart),
      ));

    const todayTxCount = parseInt(today.txCount ?? "0");
    const daysIntoMonth = now.getDate();
    const dailyAvg = daysIntoMonth > 0 ? parseFloat(thisMonth.totalFee ?? "0") / daysIntoMonth : 0;
    const projectedMonthly = dailyAvg * 30;

    res.json({
      today: parseFloat(today.totalFee ?? "0"),
      thisMonth: parseFloat(thisMonth.totalFee ?? "0"),
      allTime: parseFloat(allTime.totalFee ?? "0"),
      transactionCount: {
        today: todayTxCount,
        thisMonth: parseInt(thisMonth.txCount ?? "0"),
        allTime: parseInt(allTime.txCount ?? "0"),
      },
      avgFeePerTransaction: parseFloat(PLATFORM_FEE_MXN),
      taecelCostPerTxn: TAECEL_COST_PER_TXN_MXN,
      netMarginPerTxn: NET_MARGIN_PER_TXN_MXN,
      projectedMonthlyRevenue: projectedMonthly,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error al obtener ingresos.";
    logger.error({ err }, "billpay: admin/revenue failed");
    res.status(500).json({ error: message });
  }
});

// GET /api/bills/admin/colonia-breakdown
// Returns user registration counts grouped by colonia
router.get("/admin/colonia-breakdown", async (_req: Request, res: Response) => {
  try {
    const rows = await db
      .select({
        colonia: usersTable.colonia,
        count: sql<string>`COUNT(*)`,
      })
      .from(usersTable)
      .groupBy(usersTable.colonia)
      .orderBy(sql`COUNT(*) DESC`);

    const total = rows.reduce((s, r) => s + parseInt(r.count ?? "0"), 0);
    res.json({
      total,
      breakdown: rows.map((r) => ({
        colonia: r.colonia ?? "—",
        count: parseInt(r.count ?? "0"),
        pct: total > 0 ? Math.round((parseInt(r.count ?? "0") / total) * 100) : 0,
      })),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error";
    logger.error({ err }, "billpay: admin/colonia-breakdown failed");
    res.status(500).json({ error: message });
  }
});

// GET /api/bills/admin/user-transactions?phone=5213221234567
// Returns transaction history for a specific user
router.get("/admin/user-transactions", async (req: Request, res: Response) => {
  try {
    const rawPhone = String(req.query.phone ?? "").replace(/\D/g, "");
    if (!rawPhone || rawPhone.length < 7) {
      res.status(400).json({ error: "phone requerido (solo dígitos, min 7)" });
      return;
    }

    // Accept last-10-digits match so admin can type 3221234567 or 523221234567
    const phoneSuffix = rawPhone.slice(-10);

    const [user] = await db
      .select({ id: usersTable.id, name: usersTable.name, phone: usersTable.phone, colonia: usersTable.colonia })
      .from(usersTable)
      .where(sql`RIGHT(REGEXP_REPLACE(${usersTable.phone}, '[^0-9]', '', 'g'), 10) = ${phoneSuffix}`)
      .limit(1);

    if (!user) {
      res.status(404).json({ error: "Usuario no encontrado" });
      return;
    }

    const txs = await db
      .select({
        id: walletTransactionsTable.id,
        type: walletTransactionsTable.type,
        amount: walletTransactionsTable.amount,
        description: walletTransactionsTable.description,
        balanceAfter: walletTransactionsTable.balanceAfter,
        createdAt: walletTransactionsTable.createdAt,
      })
      .from(walletTransactionsTable)
      .where(eq(walletTransactionsTable.userId, user.id))
      .orderBy(desc(walletTransactionsTable.createdAt))
      .limit(50);

    res.json({ user, transactions: txs });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error";
    logger.error({ err }, "billpay: admin/user-transactions failed");
    res.status(500).json({ error: message });
  }
});

// GET /api/bills/admin/products
// Returns the cached Taecel product list. Admin can force a refresh via ?refresh=1
router.get("/admin/products", async (req: Request, res: Response) => {
  try {
    const forceRefresh = req.query.refresh === "1";

    // Show cache metadata
    const [cached] = await db
      .select()
      .from(taecelProductCacheTable)
      .orderBy(desc(taecelProductCacheTable.cachedAt))
      .limit(1);

    const cacheAge = cached
      ? Math.round((Date.now() - new Date(cached.cachedAt).getTime()) / 1000 / 60)
      : null;
    const isFresh = cached ? cached.expiresAt > new Date() : false;

    if (forceRefresh || !isFresh) {
      logger.info({ forceRefresh }, "billpay: admin/products fetching live from Taecel");
      const data = await taecelGetProducts();
      res.json({ source: "live", cacheAgeMinutes: null, products: data });
    } else {
      res.json({
        source: "cache",
        cacheAgeMinutes: cacheAge,
        cachedAt: cached?.cachedAt,
        expiresAt: cached?.expiresAt,
        products: JSON.parse(cached?.data ?? "null"),
      });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error al obtener productos.";
    logger.error({ err }, "billpay: admin/products failed");
    res.status(502).json({ error: message });
  }
});

// POST /api/bills/request
// Manual capture fallback for services not in the catalog.
// Logs the request and sends a WhatsApp acknowledgement to the user.
// Body: { telefono, serviceName, referencia, monto?, notas? }
router.post("/request", async (req: Request, res: Response) => {
  const { telefono, serviceName, referencia, monto, notas } = req.body as {
    telefono?: string;
    serviceName?: string;
    referencia?: string;
    monto?: number;
    notas?: string;
  };

  if (!telefono || !serviceName) {
    res.status(400).json({ error: "Se requieren telefono y serviceName." });
    return;
  }

  try {
    // Persist as a manual-capture bill payment for ops visibility
    await db.insert(billPaymentsTable).values({
      serviceId: "manual_capture",
      serviceName: serviceName.trim(),
      categoria: "manual",
      referencia: referencia ?? "",
      monto: monto ? String(Number(monto).toFixed(2)) : "0.00",
      telefono,
      notas: notas ?? "",
      provider: "manual",
      providerUsed: "manual",
      failoverUsed: false,
      confirmationCode: "pendiente",
      status: "solicitud_manual",
      paymentMethod: "wallet",
      platformFeeMxn: "0.00",
    });

    // WhatsApp acknowledgement — non-blocking
    const { sendWhatsApp } = await import("../../lib/whatsapp.js");
    sendWhatsApp(
      telefono,
      `✅ Recibimos tu solicitud de pago\n\n` +
      `*Servicio:* ${serviceName}\n` +
      `${referencia ? `*Referencia:* ${referencia}\n` : ""}` +
      `${monto ? `*Monto:* $${Number(monto).toFixed(2)} MXN\n` : ""}` +
      `\nUn asesor te contactará en breve para completar tu pago.\n` +
      `_PagoYa — pagoseguromx.com_`,
    ).catch(() => {});

    logger.info({ telefono, serviceName, referencia }, "billpay: manual capture request logged");
    res.status(201).json({ success: true, message: "Solicitud registrada. Te contactaremos pronto." });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error al registrar solicitud.";
    logger.error({ err, telefono, serviceName }, "billpay: manual capture request failed");
    res.status(500).json({ error: message });
  }
});

export default router;
