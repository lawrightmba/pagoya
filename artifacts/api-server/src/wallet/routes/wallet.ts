import { Router, type IRouter, type Request, type Response } from "express";
import { eq, sql as drizzleSql, count, sum } from "drizzle-orm";
import { db, walletsTable, walletTransactionsTable } from "@workspace/db";
import {
  getOrCreateWallet,
  getBalance,
  creditWallet,
  getRecentTransactions,
} from "../services/wallet.js";
import { createOxxoOrder, createCardOrder, verifyConektaWebhookSignature, verifyCardWebhookSignature } from "../lib/conekta.js";
import { captureUserProfile } from "../../services/profiles.js";
import { earnPoints } from "../../services/loyalty.js";
import { logger } from "../../lib/logger.js";
import { sendWhatsApp } from "../../lib/whatsapp.js";

const router: IRouter = Router();

// POST /api/wallet/load/oxxo
// Creates a Conekta OXXO charge and a pending wallet_transaction.
// Body: { telefono, amountMXN }
router.post("/load/oxxo", async (req: Request, res: Response) => {
  const { telefono, amountMXN } = req.body as {
    telefono?: string;
    amountMXN?: number;
  };

  if (!telefono) {
    res.status(400).json({ error: "El campo telefono es requerido." });
    return;
  }

  const amount = Number(amountMXN);
  if (isNaN(amount) || amount < 50) {
    res.status(400).json({ error: "El monto mínimo para carga OXXO es $50 MXN." });
    return;
  }
  if (amount > 10_000) {
    res.status(400).json({ error: "El monto máximo para carga OXXO es $10,000 MXN." });
    return;
  }

  try {
    const wallet = await getOrCreateWallet(telefono);

    const description = `Carga PagoYa — $${amount.toFixed(2)} MXN`;
    const oxxo = await createOxxoOrder({
      amountMXN: amount,
      customerEmail: `${telefono}@pagoya.mx`,
      customerName: "Usuario PagoYa",
      description,
      expiresAfterDays: 5,
    });

    const [tx] = await db
      .insert(walletTransactionsTable)
      .values({
        walletId: wallet.id,
        type: "load_oxxo",
        amountMxn: amount.toFixed(2),
        status: "pending",
        conektaOrderId: oxxo.orderId,
        voucherUrl: oxxo.voucherUrl,
        voucherExpiresAt: oxxo.expiresAt,
        description,
      })
      .returning();

    res.status(201).json({
      voucherUrl: oxxo.voucherUrl,
      barcodeReference: oxxo.reference,
      expiresAt: oxxo.expiresAt.toISOString(),
      transactionId: tx.id,
      amountMXN: amount,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error al crear la orden OXXO.";
    logger.error({ err, telefono }, "wallet: OXXO order failed");
    res.status(502).json({ error: message });
  }
});

// POST /api/wallet/load/card
// Creates a Conekta card charge and immediately credits the wallet if Conekta
// returns a synchronous "paid" status.  If the charge is "pending_payment"
// (3DS / async) the wallet will be credited by the charge.paid webhook instead.
// Body: { walletId: string, amount: number, tokenId: string }
router.post("/load/card", async (req: Request, res: Response) => {
  const { walletId, amount, tokenId } = req.body as {
    walletId?: string;
    amount?: number;
    tokenId?: string;
  };

  if (!walletId || !tokenId) {
    res.status(400).json({ error: "Los campos walletId y tokenId son requeridos." });
    return;
  }

  const amt = Number(amount);
  if (isNaN(amt) || amt < 50) {
    res.status(400).json({ error: "El monto mínimo para carga con tarjeta es $50 MXN." });
    return;
  }
  if (amt > 10_000) {
    res.status(400).json({ error: "El monto máximo para carga con tarjeta es $10,000 MXN." });
    return;
  }

  try {
    const cardOrder = await createCardOrder(walletId, amt, tokenId);

    const description = `Carga con tarjeta PagoYa — $${amt.toFixed(2)} MXN`;

    const [tx] = await db
      .insert(walletTransactionsTable)
      .values({
        walletId,
        type: "load_card",
        amountMxn: amt.toFixed(2),
        status: "pending",
        conektaOrderId: cardOrder.orderId,
        description,
      })
      .returning();

    if (cardOrder.status === "paid") {
      await creditWallet(tx.walletId, amt, tx.id);
      const [walletRow] = await db
        .select({ balanceMxn: walletsTable.balanceMxn })
        .from(walletsTable)
        .where(eq(walletsTable.id, walletId))
        .limit(1);
      const newBalance = parseFloat(walletRow?.balanceMxn ?? "0");
      logger.info(
        { walletId, amount: amt, orderId: cardOrder.orderId },
        "wallet: card topup credited immediately",
      );
      res.json({ success: true, newBalance });
      return;
    }

    res.json({ success: false, status: "pending" });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Error al procesar el pago con tarjeta.";
    logger.error({ err, walletId }, "wallet: card topup failed");
    res.status(500).json({ error: message });
  }
});

// POST /api/wallet/webhook/conekta
// Receives Conekta charge.paid events. Must be mounted with raw body parser.
// This handler is exported to be mounted in app.ts BEFORE express.json().
export async function handleConektaWebhook(req: Request, res: Response): Promise<void> {
  const rawBody = req.body as Buffer;

  const signatureHeader = (
    req.headers["conekta-signature"] ||
    req.headers["x-conekta-signature"] ||
    req.headers["digest"]
  ) as string | undefined;

  const isValid = verifyConektaWebhookSignature(rawBody, signatureHeader);
  if (!isValid) {
    res.status(401).json({ error: "Invalid signature" });
    return;
  }

  // Always respond 200 immediately — Digital Femsa retries on non-200
  res.status(200).json({ received: true });

  setImmediate(async () => {
    try {
      const bodyStr = Buffer.isBuffer(rawBody)
        ? rawBody.toString("utf8")
        : typeof rawBody === "string"
          ? rawBody
          : rawBody && typeof rawBody === "object"
            ? JSON.stringify(rawBody)
            : "";

      const event = JSON.parse(bodyStr) as {
        type: string;
        data: {
          object: {
            id: string;
            amount?: number;
            metadata?: Record<string, string>;
          };
        };
      };

      const conektaOrderId = event.data.object.id;
      const meta = event.data.object.metadata ?? {};

      if (event.type === "charge.paid") {
        const [tx] = await db
          .select()
          .from(walletTransactionsTable)
          .where(eq(walletTransactionsTable.conektaOrderId, conektaOrderId))
          .limit(1);

        if (!tx || tx.status !== "pending") {
          logger.info(
            { conektaOrderId, txStatus: tx?.status ?? "not_found" },
            "conekta webhook: duplicate charge.paid delivery — already processed, skipping",
          );
          return;
        }

        // ── Card top-up (sync paid already handled in route; this covers async 3DS) ──
        if (tx.type === "load_card" || meta.type === "card_topup") {
          await creditWallet(tx.walletId, parseFloat(tx.amountMxn), tx.id);
          logger.info(
            { conektaOrderId, walletId: tx.walletId, source: "card" },
            "wallet: card_topup credited via webhook",
          );
          return;
        }

        // ── OXXO cash-in (existing flow) ──────────────────────────────────────────
        await creditWallet(tx.walletId, parseFloat(tx.amountMxn), tx.id);

        const telefono = await getUserTelefonoByWalletId(tx.walletId);
        const newBalance = await getBalance(telefono);

        const msg =
          `✅ Tu saldo PagoYa fue acreditado\n\n` +
          `Monto: $${parseFloat(tx.amountMxn).toFixed(2)} MXN\n` +
          `Nuevo saldo: $${newBalance.toFixed(2)} MXN\n\n` +
          `Ya puedes pagar tus servicios.\n_PagoYa — pagoseguromx.com_`;

        sendWhatsApp(telefono, msg).catch(() => {});

        // Capture profile for retention/reminders (non-blocking)
        captureUserProfile({
          phone: telefono,
          billerId: "oxxo_wallet_load",
          billerName: "Carga OXXO",
          amount: parseFloat(tx.amountMxn),
        }).catch(() => {});

        // Loyalty points for OXXO wallet load (non-blocking)
        earnPoints(telefono, parseFloat(tx.amountMxn), "oxxo_load", "Carga OXXO", tx.id).catch(() => {});

        logger.info({ conektaOrderId, walletId: tx.walletId }, "wallet: credited via Conekta webhook");

      } else if (event.type === "charge.expired") {
        const [tx] = await db
          .select()
          .from(walletTransactionsTable)
          .where(eq(walletTransactionsTable.conektaOrderId, conektaOrderId))
          .limit(1);

        if (!tx || tx.status !== "pending") return;

        await db
          .update(walletTransactionsTable)
          .set({ status: "failed" })
          .where(eq(walletTransactionsTable.id, tx.id));

        const telefono = await getUserTelefonoByWalletId(tx.walletId);

        const msg =
          `❌ Tu carga OXXO venció sin acreditarse\n\n` +
          `Monto: $${parseFloat(tx.amountMxn).toFixed(2)} MXN\n\n` +
          `Si pagaste en OXXO y no se acreditó, contáctanos. De lo contrario puedes generar una nueva carga.\n_PagoYa — pagoseguromx.com_`;

        sendWhatsApp(telefono, msg).catch(() => {});

        logger.info({ conektaOrderId, walletId: tx.walletId }, "wallet: transaction expired via Conekta webhook");

      } else {
        return;
      }
    } catch (err: unknown) {
      logger.error({ err }, "wallet: webhook processing error (non-fatal)");
    }
  });
}

// POST /api/wallet/webhook/conekta-card
// Receives charge.paid / charge.failed events from api.conekta.io (card charges).
// Mounted in app.ts with raw body parser BEFORE express.json().
// Always returns 200 — Conekta retries indefinitely on non-200.
export async function handleConektaCardWebhook(req: Request, res: Response): Promise<void> {
  const rawBody = req.body as Buffer;

  const signatureHeader = (
    req.headers["digest"] ||
    req.headers["x-conekta-hmac-sha256"]
  ) as string | undefined;

  const isValid = verifyCardWebhookSignature(rawBody, signatureHeader);
  if (!isValid) {
    res.status(401).json({ error: "Invalid signature" });
    return;
  }

  res.status(200).json({ received: true });

  setImmediate(async () => {
    try {
      const bodyStr = Buffer.isBuffer(rawBody)
        ? rawBody.toString("utf8")
        : typeof rawBody === "string"
          ? rawBody
          : rawBody && typeof rawBody === "object"
            ? JSON.stringify(rawBody)
            : "";

      const event = JSON.parse(bodyStr) as {
        type: string;
        data: {
          object: {
            id: string;
            order_id?: string;
            amount?: number;
            metadata?: Record<string, string>;
          };
        };
      };

      const meta = event.data.object.metadata ?? {};

      // Resolve the order ID: charge events carry order_id; order events use id directly.
      const candidateIds = [event.data.object.order_id, event.data.object.id].filter(
        (v): v is string => typeof v === "string" && v.length > 0,
      );

      async function findPendingTx() {
        for (const orderId of candidateIds) {
          const [tx] = await db
            .select()
            .from(walletTransactionsTable)
            .where(eq(walletTransactionsTable.conektaOrderId, orderId))
            .limit(1);
          if (tx) return tx;
        }
        return undefined;
      }

      if (event.type === "charge.paid") {
        if (meta.type && meta.type !== "card_topup") return;

        const tx = await findPendingTx();

        if (!tx) {
          logger.info(
            { candidateIds },
            "card webhook: charge.paid — no matching transaction, skipping",
          );
          return;
        }

        if (tx.status !== "pending") {
          logger.info(
            { conektaOrderId: tx.conektaOrderId, txStatus: tx.status },
            "card webhook: charge.paid already processed (idempotency), skipping",
          );
          return;
        }

        await creditWallet(tx.walletId, parseFloat(tx.amountMxn), tx.id);
        logger.info(
          { conektaOrderId: tx.conektaOrderId, walletId: tx.walletId },
          "wallet: card_topup credited via card webhook",
        );
      } else if (event.type === "charge.failed") {
        if (meta.type && meta.type !== "card_topup") return;

        const tx = await findPendingTx();

        if (!tx || tx.status !== "pending") {
          logger.info(
            { candidateIds, txStatus: tx?.status ?? "not_found" },
            "card webhook: charge.failed — no pending transaction, skipping",
          );
          return;
        }

        await db
          .update(walletTransactionsTable)
          .set({ status: "failed" })
          .where(eq(walletTransactionsTable.id, tx.id));

        logger.info(
          { conektaOrderId: tx.conektaOrderId, walletId: tx.walletId },
          "wallet: card_topup failed via card webhook",
        );
      } else {
        logger.info({ eventType: event.type }, "card webhook: unhandled event type, ignoring");
      }
    } catch (err: unknown) {
      logger.error({ err }, "wallet: card webhook processing error (non-fatal)");
    }
  });
}

async function getUserTelefonoByWalletId(walletId: string): Promise<string> {
  const [wallet] = await db
    .select({ userId: walletsTable.userId })
    .from(walletsTable)
    .where(eq(walletsTable.id, walletId))
    .limit(1);
  return wallet?.userId ?? "";
}

// GET /api/wallet/balance
// Body (or query): { telefono }
router.get("/balance", async (req: Request, res: Response) => {
  const telefono = (req.query.telefono ?? req.body?.telefono) as string | undefined;
  if (!telefono) {
    res.status(400).json({ error: "El campo telefono es requerido." });
    return;
  }
  try {
    const wallet = await getOrCreateWallet(telefono as string);
    res.json({
      walletId: wallet.id,
      balanceMXN: parseFloat(wallet.balanceMxn ?? "0"),
      currency: wallet.currency,
      lastUpdated: wallet.updatedAt,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error al consultar saldo.";
    res.status(500).json({ error: message });
  }
});

// GET /api/wallet/transactions?telefono=X&limit=N
router.get("/transactions", async (req: Request, res: Response) => {
  const telefono = req.query.telefono as string | undefined;
  if (!telefono) {
    res.status(400).json({ error: "El campo telefono es requerido." });
    return;
  }
  const limit = Math.min(parseInt(String(req.query.limit ?? "10")) || 10, 50);
  try {
    const wallet = await getOrCreateWallet(telefono);
    const transactions = await getRecentTransactions(wallet.id, limit);
    res.json({
      transactions: transactions.map((t) => ({
        id: t.id,
        type: t.type,
        amountMXN: parseFloat(t.amountMxn),
        status: t.status,
        source:
          t.type === "load_card" ? "card"
          : t.type === "load_oxxo" ? "oxxo"
          : null,
        description: t.description,
        createdAt: t.createdAt,
        confirmedAt: t.confirmedAt,
      })),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error al consultar transacciones.";
    res.status(500).json({ error: message });
  }
});

// GET /api/wallet/admin/stats
// Summary stats for the admin command center wallet panel.
router.get("/admin/stats", async (_req: Request, res: Response) => {
  try {
    const [[walletCount], [txStats], [pendingStats]] = await Promise.all([
      db.select({ total: count() }).from(walletsTable),
      db.select({
        totalBalance: drizzleSql<string>`COALESCE(SUM(balance_mxn::numeric), 0)`,
      }).from(walletsTable),
      db.select({
        pendingCount: count(),
        pendingAmount: drizzleSql<string>`COALESCE(SUM(amount_mxn::numeric), 0)`,
      }).from(walletTransactionsTable).where(eq(walletTransactionsTable.status, "pending")),
    ]);

    const [confirmedStats] = await db
      .select({
        confirmedCount: count(),
        confirmedAmount: drizzleSql<string>`COALESCE(SUM(amount_mxn::numeric), 0)`,
      })
      .from(walletTransactionsTable)
      .where(eq(walletTransactionsTable.status, "confirmed"));

    const [failedStats] = await db
      .select({ failedCount: count() })
      .from(walletTransactionsTable)
      .where(eq(walletTransactionsTable.status, "failed"));

    res.json({
      walletCount: walletCount.total,
      totalBalanceMXN: parseFloat(txStats.totalBalance),
      pendingLoads: {
        count: pendingStats.pendingCount,
        amountMXN: parseFloat(pendingStats.pendingAmount),
      },
      confirmedLoads: {
        count: confirmedStats.confirmedCount,
        amountMXN: parseFloat(confirmedStats.confirmedAmount),
      },
      failedLoads: {
        count: failedStats.failedCount,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error al obtener estadísticas.";
    res.status(500).json({ error: message });
  }
});

// GET /api/wallet/test-conekta
// Verifies Conekta credentials and API reachability without touching the DB.
// Use this before registering the real webhook in the Conekta Dashboard.
//
// Note: CONEKTA_WEBHOOK_SECRET exists in Replit Secrets but is NOT used for
// webhook verification. Signature verification relies on CONEKTA_WEBHOOK_PUBLIC_KEY
// (or the legacy alias CONEKTA_PUBLIC_KEY) — an RSA public key, not a shared secret.
router.get("/test-conekta", async (_req: Request, res: Response) => {
  const resolvedKey = process.env.CONEKTA_API_KEY;
  const apiKeyPresent = !!resolvedKey;
  const webhookPublicKeyPresent = !!(
    process.env.CONEKTA_WEBHOOK_PUBLIC_KEY ?? process.env.CONEKTA_PUBLIC_KEY
  );

  if (!apiKeyPresent) {
    res.json({
      configured: false,
      apiKeyPresent: false,
      webhookPublicKeyPresent,
      conektaApiReachable: false,
      error: "CONEKTA_API_KEY no está configurado.",
    });
    return;
  }

  let conektaApiReachable = false;
  let error: string | null = null;

  try {
    const encoded = Buffer.from(`${resolvedKey}:`).toString("base64");
    const response = await fetch("https://api.digitalfemsa.io/customers?limit=1", {
      method: "GET",
      headers: {
        Authorization: `Basic ${encoded}`,
        Accept: "application/vnd.app-v2.1.0+json",
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(8_000),
    });

    if (response.ok || response.status === 200) {
      conektaApiReachable = true;
    } else {
      const body = await response.text();
      error = `Conekta respondió con ${response.status}: ${body.slice(0, 200)}`;
    }
  } catch (err: unknown) {
    error = err instanceof Error ? err.message : "Error de red al contactar Conekta.";
  }

  res.json({
    configured: apiKeyPresent && conektaApiReachable,
    apiKeyPresent,
    webhookPublicKeyPresent,
    conektaApiReachable,
    error,
  });
});

export default router;

