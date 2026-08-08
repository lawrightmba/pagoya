import { Router, type IRouter, type Request, type Response } from "express";
import Stripe from "stripe";
import { db, pagoyaPaymentsTable } from "@workspace/db";
import { desc, eq, inArray } from "drizzle-orm";
import { logger } from "../lib/logger";
import { alertDispute, alertPayment, alertBillInStripePath } from "../lib/alertService.js";
import { routePayment } from "../billpay/services/router.js";
import { getServiceById } from "../billpay/services/catalog.js";
import { sendWhatsApp } from "../lib/whatsapp.js";
import { taecelCheckSkuAvailability, taecelCheckStockAndAlert } from "../billpay/providers/siprel.js";
import { toSiprelRef } from "../lib/phoneUtils.js";

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY no está configurado en el entorno.");
  return new Stripe(key, { apiVersion: "2025-03-31.basil" });
}

const PLATFORM_FEE_MXN = 25.00;
const PLATFORM_FEE_DESCRIPTION = "Tarifa de plataforma";
const TAECEL_COST_PER_TXN_MXN = 5.00;
const NET_MARGIN_PER_TXN_MXN = 3.00;

const router: IRouter = Router();

// ── Gift card delivery ────────────────────────────────────────────────────────
// Called server-side after Stripe confirms payment. Idempotent: status
// "gift_card_delivered" means SIPREL already ran — skip if already set.
async function deliverGiftCard(payment: {
  paymentIntentId: string;
  categoria: string;
  monto: string;
  telefono: string;
  referencia: string;
}): Promise<void> {
  const service = getServiceById(payment.categoria);
  if (!service?.isGiftCard) return;

  const effectiveMonto = service.fixedAmount ?? parseFloat(payment.monto);
  // SIPREL referencia max 10 chars — strip to last 10 digits (SIPREL hard limit)
  const effectiveRef = toSiprelRef(payment.telefono);

  logger.info({ paymentIntentId: payment.paymentIntentId, serviceId: payment.categoria }, "pagoya: triggering gift card SIPREL delivery");

  try {
    const result = await routePayment({
      serviceId: payment.categoria,
      referencia: effectiveRef,
      monto: effectiveMonto,
      telefono: payment.telefono,
      notas: `stripe:${payment.paymentIntentId}`,
    });

    // Mark as delivered so we never call SIPREL twice for the same payment
    await db
      .update(pagoyaPaymentsTable)
      .set({ status: "gift_card_delivered" })
      .where(eq(pagoyaPaymentsTable.paymentIntentId, payment.paymentIntentId));

    // Send PIN via WhatsApp
    const pin = result.confirmationCode;
    const raw = result.rawResponse as Record<string, unknown> | undefined;
    const pinLine = raw?.pin ? `\n🔑 PIN: *${raw.pin}*` : (pin ? `\n🔑 PIN: *${pin}*` : "");
    await sendWhatsApp(
      payment.telefono,
      `✅ *¡Tu ${service.name} está lista!*${pinLine}\n\nCanjea en la app o sitio web de ${service.name}.\n\nFolio: ${pin}\n\n_PagoYa — pagoyamx.com_`,
    ).catch(() => {});

    logger.info({ paymentIntentId: payment.paymentIntentId, pin }, "pagoya: gift card delivered via SIPREL");

    // Low-stock check — fire-and-forget, never blocks delivery
    if (service.siprelServiceId) {
      taecelCheckStockAndAlert(service.siprelServiceId, service.name, effectiveMonto).catch(() => {});
    }
  } catch (err) {
    logger.error({ paymentIntentId: payment.paymentIntentId, err }, "pagoya: gift card SIPREL delivery failed");
    // Do NOT update status — leave as "succeeded" so the next GET poll retries
    throw err;
  }
}

// GET /api/pagoya/categories
// Returns the list of supported service categories
router.get("/categories", (_req: Request, res: Response) => {
  res.json({
    categories: [
      "Luz",
      "Agua",
      "Gas",
      "Internet",
      "Cable",
      "Teléfono móvil",
      "Streaming",
      "Préstamos",
      "Seguro",
      "Escuela",
      "Renta",
      "Otro",
    ],
  });
});

// POST /api/pagoya/payments
// Creates a real Stripe PaymentIntent and persists the payment record to the database
// Body: { empresa, categoria, monto, referencia, telefono, notas? }
router.post("/payments", async (req: Request, res: Response) => {
  const { empresa, categoria, monto, referencia, telefono, notas } = req.body;

  if (!empresa || !categoria || !monto || !referencia || !telefono) {
    res.status(400).json({
      error: "Faltan campos requeridos: empresa, categoria, monto, referencia, telefono",
    });
    return;
  }

  const montoNum = parseFloat(monto);
  if (isNaN(montoNum) || montoNum <= 0) {
    res.status(400).json({ error: "El monto debe ser un número positivo." });
    return;
  }

  try {
    // ── Gift card SKU availability pre-check (before any charge) ──────────────
    // Fail open: if the Taecel call errors or times out, allow the purchase.
    const catalogService = getServiceById(categoria);
    if (catalogService?.isGiftCard && catalogService.siprelServiceId) {
      try {
        const { available } = await taecelCheckSkuAvailability(catalogService.siprelServiceId);
        if (!available) {
          console.warn(`[GiftCard] SKU unavailable: ${catalogService.siprelServiceId} ${montoNum} MXN`);
          res.status(409).json({
            error: "Lo sentimos, esta tarjeta de regalo no está disponible en este momento. Por favor elige otra opción o intenta más tarde.",
            unavailable: true,
          });
          return;
        }
      } catch (preCheckErr) {
        const msg = preCheckErr instanceof Error ? preCheckErr.message : String(preCheckErr);
        console.error(`[GiftCard] Pre-check failed for SKU ${catalogService.siprelServiceId}: ${msg}`);
        // fail open — proceed with the purchase
      }
    }

    const stripe = getStripe();

    const totalMxn = montoNum + PLATFORM_FEE_MXN;

    // 1. Create Stripe PaymentIntent — charge bill amount + platform fee
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(totalMxn * 100), // Stripe expects centavos
      currency: "mxn",
      metadata: {
        empresa, categoria, referencia, telefono, notas: notas ?? "",
        billAmountMxn: montoNum.toFixed(2),
        platformFeeMxn: PLATFORM_FEE_MXN.toFixed(2),
        platformFeeDesc: PLATFORM_FEE_DESCRIPTION,
      },
      description: `PagoYa — ${empresa} (${categoria}) + ${PLATFORM_FEE_DESCRIPTION}`,
    });

    // 2. Persist to database
    await db.insert(pagoyaPaymentsTable).values({
      paymentIntentId: paymentIntent.id,
      empresa,
      categoria,
      monto: montoNum.toFixed(2),
      referencia,
      telefono,
      notas: notas ?? "",
      status: "pendiente",
    });

    res.status(201).json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error al crear el pago.";
    res.status(502).json({ error: message });
  }
});

// GET /api/pagoya/payments/:paymentIntentId
// Retrieve a payment record from the database by Stripe PaymentIntent ID.
// Also syncs status from Stripe in case the webhook has not yet fired (dev mode).
router.get("/payments/:paymentIntentId", async (req: Request, res: Response) => {
  const { paymentIntentId } = req.params;

  try {
    const [payment] = await db
      .select()
      .from(pagoyaPaymentsTable)
      .where(eq(pagoyaPaymentsTable.paymentIntentId, paymentIntentId))
      .limit(1);

    if (!payment) {
      res.status(404).json({ error: "Transacción no encontrada." });
      return;
    }

    // If still pending, check Stripe directly and sync status into DB.
    if (payment.status === "pendiente") {
      try {
        const stripe = getStripe();
        const intent = await stripe.paymentIntents.retrieve(paymentIntentId);

        let newStatus: string | null = null;
        if (intent.status === "succeeded") newStatus = "succeeded";
        else if (intent.status === "canceled" || intent.status === "requires_payment_method") newStatus = "failed";

        if (newStatus) {
          await db
            .update(pagoyaPaymentsTable)
            .set({ status: newStatus })
            .where(eq(pagoyaPaymentsTable.paymentIntentId, paymentIntentId));
          payment.status = newStatus;
          logger.info({ paymentIntentId, newStatus }, "pagoya: status synced from Stripe (no webhook)");
        }
      } catch (stripeErr) {
        logger.warn({ paymentIntentId, stripeErr }, "pagoya: could not sync status from Stripe");
      }
    }

    // If Stripe confirmed a gift card payment and SIPREL hasn't run yet, deliver now.
    // "gift_card_delivered" status means already done — skip to avoid double delivery.
    if (payment.status === "succeeded" && payment.categoria?.includes("_")) {
      deliverGiftCard({
        paymentIntentId: payment.paymentIntentId,
        categoria: payment.categoria,
        monto: payment.monto,
        telefono: payment.telefono,
        referencia: payment.referencia,
      }).catch(() => {});
    }

    res.json(payment);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error al consultar el pago.";
    res.status(500).json({ error: message });
  }
});

// GET /api/pagoya/recent
// Returns the 5 most recent payments from the database
router.get("/recent", async (_req: Request, res: Response) => {
  try {
    const payments = await db
      .select()
      .from(pagoyaPaymentsTable)
      .orderBy(desc(pagoyaPaymentsTable.createdAt))
      .limit(5);

    res.json({ payments });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error al obtener pagos recientes.";
    res.status(500).json({ error: message });
  }
});

// POST /api/pagoya/webhook
// Stripe sends events here. Must be mounted with express.raw() in app.ts
// to preserve the raw body needed for signature verification.
export async function handlePagoyaWebhook(req: Request, res: Response): Promise<void> {
  const sig = req.headers["stripe-signature"];
  const isDev = process.env.NODE_ENV !== "production";

  // In production always use STRIPE_WEBHOOK_SECRET (Stripe Dashboard).
  // In development, prefer STRIPE_CLI_WEBHOOK_SECRET (stripe listen tunnel) so
  // local test events verify correctly without touching the production secret.
  const webhookSecret = isDev
    ? (process.env.STRIPE_CLI_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET)
    : process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    res.status(400).json({ error: "Faltan cabeceras o configuración del webhook." });
    return;
  }

  let event: ReturnType<Stripe["webhooks"]["constructEvent"]>;

  try {
    const stripe = getStripe();
    // Try primary secret first; in dev fall back to the other secret if available.
    try {
      event = stripe.webhooks.constructEvent(req.body as Buffer, sig, webhookSecret);
    } catch (firstErr) {
      if (isDev && process.env.STRIPE_CLI_WEBHOOK_SECRET && process.env.STRIPE_WEBHOOK_SECRET) {
        // Try the other secret (production secret as fallback in dev)
        event = stripe.webhooks.constructEvent(
          req.body as Buffer,
          sig,
          process.env.STRIPE_WEBHOOK_SECRET
        );
      } else {
        throw firstErr;
      }
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Firma del webhook inválida.";
    res.status(400).json({ error: message });
    return;
  }

  const intentId = (event.data.object as { id: string }).id;

  try {
    if (event.type === "payment_intent.succeeded") {
      const [payment] = await db
        .select()
        .from(pagoyaPaymentsTable)
        .where(eq(pagoyaPaymentsTable.paymentIntentId, intentId))
        .limit(1);

      if (payment && payment.status !== "gift_card_delivered") {
        if (!payment.categoria?.includes("_")) {
          // ───────────────────────────────────────────────────────────────────
          // SAFETY NET: A bill payment (non-gift-card) reached and completed
          // the Stripe path. The bill was NOT submitted to any payment provider.
          // Do NOT silently mark succeeded — flag it loud for human review.
          // ───────────────────────────────────────────────────────────────────
          await db
            .update(pagoyaPaymentsTable)
            .set({ status: "error_bill_in_stripe" })
            .where(eq(pagoyaPaymentsTable.paymentIntentId, intentId));

          logger.error(
            {
              paymentIntentId: intentId,
              telefono: payment.telefono,
              empresa: payment.empresa,
              categoria: payment.categoria,
              monto: payment.monto,
              referencia: payment.referencia,
            },
            "CRITICAL pagoya: bill payment confirmed via Stripe — bill was NOT submitted to provider. Row flagged error_bill_in_stripe. Human review required: refund card or manually submit bill.",
          );

          alertBillInStripePath({
            paymentIntentId: intentId,
            telefono: payment.telefono ?? "",
            amountMxn: parseFloat(payment.monto),
            empresa: payment.empresa ?? "",
            categoria: payment.categoria ?? "",
            referencia: payment.referencia ?? "",
            timestamp: new Date(),
          }).catch(() => {});
        } else {
          // Normal gift-card path
          await db
            .update(pagoyaPaymentsTable)
            .set({ status: "succeeded" })
            .where(eq(pagoyaPaymentsTable.paymentIntentId, intentId));

          deliverGiftCard({
            paymentIntentId: payment.paymentIntentId,
            categoria: payment.categoria,
            monto: payment.monto,
            telefono: payment.telefono,
            referencia: payment.referencia,
          }).catch((err) => logger.error({ paymentIntentId: intentId, err }, "pagoya: webhook gift card delivery failed"));

          logger.info({ paymentIntentId: intentId, event: event.type }, "pagoya: gift card payment succeeded — status updated to succeeded");

          alertPayment({
            telefono: payment.telefono,
            amountMxn: parseFloat(payment.monto),
            method: "stripe_card",
            status: "confirmed",
            reference: payment.referencia,
            timestamp: new Date(),
          }).catch(() => {});
        }
      }
    } else if (
      event.type === "payment_intent.payment_failed" ||
      event.type === "payment_intent.canceled"
    ) {
      await db
        .update(pagoyaPaymentsTable)
        .set({ status: "failed" })
        .where(eq(pagoyaPaymentsTable.paymentIntentId, intentId));
      logger.warn({ paymentIntentId: intentId, event: event.type }, "pagoya: payment failed — status updated to failed");
    } else if (event.type === "charge.dispute.created" || event.type === "charge.dispute.funds_withdrawn") {
      const dispute = event.data.object as Stripe.Dispute;
      const stripeMode = (process.env.VITE_STRIPE_PUBLIC_KEY ?? process.env.STRIPE_SECRET_KEY ?? "").startsWith("pk_test_") || (process.env.STRIPE_SECRET_KEY ?? "").startsWith("sk_test_")
        ? "test" as const
        : "live" as const;
      logger.warn(
        { disputeId: dispute.id, chargeId: dispute.charge, amount: dispute.amount, reason: dispute.reason, stripeMode },
        `pagoya: Stripe dispute opened — ${event.type}`,
      );
      alertDispute({
        chargeId: typeof dispute.charge === "string" ? dispute.charge : dispute.charge?.id ?? "unknown",
        paymentIntentId: typeof dispute.payment_intent === "string" ? dispute.payment_intent : dispute.payment_intent?.id,
        amountMxn: dispute.amount / 100,
        reason: dispute.reason ?? undefined,
        status: dispute.status ?? undefined,
        timestamp: new Date(),
        stripeMode,
      }).catch(() => {});
    } else {
      logger.info({ paymentIntentId: intentId, event: event.type }, "pagoya: webhook event received, no status change");
    }
    res.json({ received: true, type: event.type });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error al actualizar el pago.";
    logger.error({ paymentIntentId: intentId, event: event.type, err }, "pagoya: webhook DB update failed");
    res.status(500).json({ error: message });
  }
}

// ── DEV ONLY: simulate webhook bill-guard safety net ────────────────────────
// POST /api/pagoya/admin/test-bill-guard
// Runs the same bill-guard logic the webhook runs for payment_intent.succeeded,
// but skips Stripe signature verification. Inserts a fake pendiente row, fires
// the guard logic, then cleans up. Returns outcome for inspection.
// Only available when NODE_ENV=development.
router.post("/admin/test-bill-guard", async (req: Request, res: Response) => {
  if (process.env.NODE_ENV !== "development") {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const key = (req.headers["x-admin-key"] as string | undefined) || (req.query.adminKey as string | undefined);
  const expected = process.env.ADMIN_TOKEN ?? process.env.ADMIN_SECRET_KEY;
  if (!key || !expected || key !== expected) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const fakeIntentId = `pi_test_bill_guard_${Date.now()}`;
  const fakeCat = "Agua";  // non-gift-card — no underscore

  // Insert fake pendiente row
  await db.insert(pagoyaPaymentsTable).values({
    paymentIntentId: fakeIntentId,
    empresa: "SADM-TEST",
    categoria: fakeCat,
    monto: "100.00",
    referencia: "000000000",
    telefono: "5500000000",
    status: "pendiente",
  });

  // Run the same bill-guard logic as the webhook
  const [payment] = await db
    .select()
    .from(pagoyaPaymentsTable)
    .where(eq(pagoyaPaymentsTable.paymentIntentId, fakeIntentId))
    .limit(1);

  let outcome = "no_payment_found";

  if (payment && payment.status !== "gift_card_delivered") {
    if (!payment.categoria?.includes("_")) {
      await db
        .update(pagoyaPaymentsTable)
        .set({ status: "error_bill_in_stripe" })
        .where(eq(pagoyaPaymentsTable.paymentIntentId, fakeIntentId));

      logger.error(
        {
          paymentIntentId: fakeIntentId,
          telefono: payment.telefono,
          empresa: payment.empresa,
          categoria: payment.categoria,
          monto: payment.monto,
          referencia: payment.referencia,
          __test: true,
        },
        "CRITICAL pagoya: bill payment confirmed via Stripe — bill was NOT submitted to provider. Row flagged error_bill_in_stripe. Human review required: refund card or manually submit bill.",
      );

      outcome = "error_bill_in_stripe — ERROR logged, alert fired";
      alertBillInStripePath({
        paymentIntentId: fakeIntentId,
        telefono: payment.telefono ?? "",
        amountMxn: parseFloat(payment.monto),
        empresa: payment.empresa ?? "",
        categoria: payment.categoria ?? "",
        referencia: payment.referencia ?? "",
        timestamp: new Date(),
      }).catch(() => {});
    } else {
      outcome = "gift_card_path — deliverGiftCard would run";
    }
  }

  // Cleanup test row
  await db.delete(pagoyaPaymentsTable).where(eq(pagoyaPaymentsTable.paymentIntentId, fakeIntentId));

  res.json({
    test: "bill_guard",
    fakeIntentId,
    categoria: fakeCat,
    isGiftCard: fakeCat.includes("_"),
    outcome,
    note: "Check server logs for CRITICAL ERROR log line",
  });
});

// ── Admin: cancel all pending Stripe PaymentIntents ─────────────────────────
// POST /api/pagoya/admin/cancel-stripe-pending
// Cancels every row with status="pendiente" in Stripe and marks it "cancelled"
// in the DB. Safe to re-run — already-cancelled intents are caught and skipped.
router.post("/admin/cancel-stripe-pending", async (req: Request, res: Response) => {
  const key = (req.headers["x-admin-key"] as string | undefined) || (req.query.adminKey as string | undefined);
  const expected = process.env.ADMIN_TOKEN ?? process.env.ADMIN_SECRET_KEY;
  if (!key || !expected || key !== expected) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const stripe = getStripe();

  const pendiente = await db
    .select()
    .from(pagoyaPaymentsTable)
    .where(eq(pagoyaPaymentsTable.status, "pendiente"));

  const results: Array<{ id: number; paymentIntentId: string; outcome: string }> = [];

  for (const row of pendiente) {
    try {
      await stripe.paymentIntents.cancel(row.paymentIntentId);
      await db
        .update(pagoyaPaymentsTable)
        .set({ status: "cancelled" })
        .where(eq(pagoyaPaymentsTable.id, row.id));
      results.push({ id: row.id, paymentIntentId: row.paymentIntentId, outcome: "cancelled" });
      logger.info({ id: row.id, paymentIntentId: row.paymentIntentId }, "pagoya admin: pending PaymentIntent cancelled");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      // Treat as effectively dead (safe to mark cancelled in DB):
      // - "already canceled" — Stripe already confirmed cancellation
      // - "no longer cancelable" — expired or in terminal state
      // - "No such payment_intent" — PI belongs to a rotated/old Stripe account; auto-expired
      // NOTE: do NOT use the broad msg.includes("canceled") — the Stripe error for
      // cancelling a SUCCEEDED PI also contains the word "canceled" in its second
      // sentence ("Only a PaymentIntent with one of the following statuses may be
      // canceled: ..."), which would incorrectly shadow the succeededInStripe branch.
      const effectivelyDead = msg.includes("already canceled")
        || msg.includes("no longer cancelable")
        || msg.includes("No such payment_intent");

      // Treat as "succeeded in Stripe but DB missed the webhook" — needs human review:
      const succeededInStripe = msg.toLowerCase().includes("status of succeeded");

      if (effectivelyDead) {
        await db
          .update(pagoyaPaymentsTable)
          .set({ status: "cancelled" })
          .where(eq(pagoyaPaymentsTable.id, row.id));
        const reason = msg.includes("No such") ? "foreign_account_auto_expired" : "already_cancelled_in_stripe";
        results.push({ id: row.id, paymentIntentId: row.paymentIntentId, outcome: reason });
      } else if (succeededInStripe) {
        // This PI was actually confirmed in Stripe but webhook never updated our DB.
        // Flag it for human review — do NOT mark as succeeded silently.
        await db
          .update(pagoyaPaymentsTable)
          .set({ status: "error_bill_in_stripe" })
          .where(eq(pagoyaPaymentsTable.id, row.id));
        results.push({ id: row.id, paymentIntentId: row.paymentIntentId, outcome: "ERROR_SUCCEEDED_IN_STRIPE_DB_MISSED_WEBHOOK — manual review required" });
        logger.error({ id: row.id, paymentIntentId: row.paymentIntentId }, "pagoya admin: PI succeeded in Stripe but DB had pendiente — webhook was missed. Flagged error_bill_in_stripe for manual review.");
      } else {
        results.push({ id: row.id, paymentIntentId: row.paymentIntentId, outcome: `error: ${msg}` });
        logger.error({ id: row.id, paymentIntentId: row.paymentIntentId, err }, "pagoya admin: cancel pending PaymentIntent failed");
      }
    }
  }

  res.json({ total: pendiente.length, results });
});


export default router;
