import { Router, type IRouter, type Request, type Response } from "express";
import Stripe from "stripe";
import { db, pagoyaPaymentsTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { logger } from "../lib/logger";
import { routePayment } from "../billpay/services/router.js";
import { getServiceById } from "../billpay/services/catalog.js";
import { sendWhatsApp } from "../lib/whatsapp.js";
import { taecelCheckSkuAvailability, taecelCheckStockAndAlert } from "../billpay/providers/siprel.js";

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
  // SIPREL referencia max 10 chars — use last 10 numeric digits of phone
  const effectiveRef = payment.telefono.replace(/\D/g, "").slice(-10);

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
        await db
          .update(pagoyaPaymentsTable)
          .set({ status: "succeeded" })
          .where(eq(pagoyaPaymentsTable.paymentIntentId, intentId));

        // Trigger gift card delivery from webhook if this is a gift card
        if (payment.categoria?.includes("_")) {
          deliverGiftCard({
            paymentIntentId: payment.paymentIntentId,
            categoria: payment.categoria,
            monto: payment.monto,
            telefono: payment.telefono,
            referencia: payment.referencia,
          }).catch((err) => logger.error({ paymentIntentId: intentId, err }, "pagoya: webhook gift card delivery failed"));
        }
      }
      logger.info({ paymentIntentId: intentId, event: event.type }, "pagoya: payment succeeded — status updated to succeeded");
    } else if (
      event.type === "payment_intent.payment_failed" ||
      event.type === "payment_intent.canceled"
    ) {
      await db
        .update(pagoyaPaymentsTable)
        .set({ status: "failed" })
        .where(eq(pagoyaPaymentsTable.paymentIntentId, intentId));
      logger.warn({ paymentIntentId: intentId, event: event.type }, "pagoya: payment failed — status updated to failed");
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

export default router;
