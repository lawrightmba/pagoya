import { Router, type IRouter, type Request, type Response } from "express";
import { eq, sql as drizzleSql, count, sum } from "drizzle-orm";
import { db, walletsTable, walletTransactionsTable } from "@workspace/db";
import {
  getOrCreateWallet,
  getBalance,
  creditWallet,
  getRecentTransactions,
} from "../services/wallet.js";
import { createOxxoOrder, verifyConektaWebhookSignature } from "../lib/conekta.js";
import { logger } from "../../lib/logger.js";

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

// POST /api/wallet/webhook/conekta
// Receives Conekta charge.paid events. Must be mounted with raw body parser.
// This handler is exported to be mounted in app.ts BEFORE express.json().
export async function handleConektaWebhook(req: Request, res: Response): Promise<void> {
  const rawBody = req.body as Buffer;
  const sigHeader = req.headers["conekta-signature"] as string | undefined;

  let verified: boolean;
  try {
    verified = verifyConektaWebhookSignature(rawBody, sigHeader);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error de configuración del webhook.";
    res.status(400).json({ error: message });
    return;
  }

  if (!verified) {
    res.status(400).json({ error: "Firma del webhook inválida." });
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
        data: { object: { id: string; amount?: number } };
      };

      const conektaOrderId = event.data.object.id;

      if (event.type === "charge.paid") {
        const [tx] = await db
          .select()
          .from(walletTransactionsTable)
          .where(eq(walletTransactionsTable.conektaOrderId, conektaOrderId))
          .limit(1);

        if (!tx || tx.status !== "pending") return;

        await creditWallet(tx.walletId, parseFloat(tx.amountMxn), tx.id);

        const telefono = await getUserTelefonoByWalletId(tx.walletId);
        const newBalance = await getBalance(telefono);

        const msg =
          `✅ Tu saldo PagoYa fue acreditado\n\n` +
          `Monto: $${parseFloat(tx.amountMxn).toFixed(2)} MXN\n` +
          `Nuevo saldo: $${newBalance.toFixed(2)} MXN\n\n` +
          `Ya puedes pagar tus servicios.\n_PagoYa — pagoseguromx.com_`;

        const encoded = encodeURIComponent(msg);
        fetch(`https://wa.me/${telefono.replace(/\D/g, "")}?text=${encoded}`, {
          signal: AbortSignal.timeout(4_000),
        }).catch(() => {});

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

        const encoded = encodeURIComponent(msg);
        fetch(`https://wa.me/${telefono.replace(/\D/g, "")}?text=${encoded}`, {
          signal: AbortSignal.timeout(4_000),
        }).catch(() => {});

        logger.info({ conektaOrderId, walletId: tx.walletId }, "wallet: transaction expired via Conekta webhook");

      } else {
        return;
      }
    } catch (err: unknown) {
      logger.error({ err }, "wallet: webhook processing error (non-fatal)");
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

export default router;
