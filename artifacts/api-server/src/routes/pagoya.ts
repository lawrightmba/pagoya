import { Router, type IRouter, type Request, type Response } from "express";
import Stripe from "stripe";
import { db, pagoyaPaymentsTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { logger } from "../lib/logger";

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY no está configurado en el entorno.");
  return new Stripe(key, { apiVersion: "2025-03-31.basil" });
}

const router: IRouter = Router();

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
    const stripe = getStripe();

    // 1. Create Stripe PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(montoNum * 100), // Stripe expects centavos
      currency: "mxn",
      metadata: { empresa, categoria, referencia, telefono, notas: notas ?? "" },
      description: `PagoYa — ${empresa} (${categoria})`,
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
      await db
        .update(pagoyaPaymentsTable)
        .set({ status: "succeeded" })
        .where(eq(pagoyaPaymentsTable.paymentIntentId, intentId));
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
