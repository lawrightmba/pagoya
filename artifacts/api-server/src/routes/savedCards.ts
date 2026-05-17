import { Router, type Request, type Response } from "express";
import { eq } from "drizzle-orm";
import {
  db,
  usersTable,
  savedCardsTable,
  walletsTable,
  walletTransactionsTable,
} from "@workspace/db";
import { creditWallet, getOrCreateWallet } from "../wallet/services/wallet.js";
import { createCardOrder } from "../wallet/lib/conekta.js";
import { logger } from "../lib/logger.js";

const router = Router();

const CONEKTA_API_URL = "https://api.conekta.io";

function cardApiHeaders(): Record<string, string> {
  const key = process.env.CONEKTA_CARD_API_KEY;
  if (!key) throw new Error("CONEKTA_CARD_API_KEY no está configurado.");
  return {
    Authorization: `Basic ${Buffer.from(`${key}:`).toString("base64")}`,
    "Content-Type": "application/json",
    Accept: "application/vnd.conekta-v2.2.0+json",
  };
}

async function createConektaCustomer(
  telefono: string,
  tokenId: string,
): Promise<{ customerId: string; sourceId: string; lastFour: string; brand: string }> {
  const res = await fetch(`${CONEKTA_API_URL}/customers`, {
    method: "POST",
    headers: cardApiHeaders(),
    body: JSON.stringify({
      email: `wallet-${telefono.replace(/\D/g, "")}@pagoya.mx`,
      name: "PagoYa User",
      phone: telefono,
      payment_sources: [{ type: "card", token_id: tokenId }],
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Conekta createCustomer ${res.status}: ${text}`);
  }
  const data = (await res.json()) as any;
  const source = data.payment_sources?.data?.[0];
  return {
    customerId: data.id,
    sourceId: source?.id ?? "",
    lastFour: source?.last4 ?? "****",
    brand: (source?.brand ?? "card").toLowerCase(),
  };
}

async function addSourceToCustomer(
  customerId: string,
  tokenId: string,
): Promise<{ sourceId: string; lastFour: string; brand: string }> {
  const res = await fetch(`${CONEKTA_API_URL}/customers/${customerId}/payment_sources`, {
    method: "POST",
    headers: cardApiHeaders(),
    body: JSON.stringify({ type: "card", token_id: tokenId }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Conekta addSource ${res.status}: ${text}`);
  }
  const source = (await res.json()) as any;
  return {
    sourceId: source.id,
    lastFour: source.last4 ?? "****",
    brand: (source.brand ?? "card").toLowerCase(),
  };
}

async function chargeCustomerSource(
  customerId: string,
  sourceId: string,
  amountMXN: number,
  walletId: string,
): Promise<{ orderId: string; status: string }> {
  const res = await fetch(`${CONEKTA_API_URL}/orders`, {
    method: "POST",
    headers: cardApiHeaders(),
    body: JSON.stringify({
      currency: "MXN",
      customer_id: customerId,
      line_items: [
        {
          name: "Carga con tarjeta PagoYa",
          quantity: 1,
          unit_price: Math.round(amountMXN * 100),
        },
      ],
      charges: [
        { payment_method: { type: "card", payment_source_id: sourceId } },
      ],
      metadata: { walletId, type: "card_topup" },
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Conekta charge ${res.status}: ${text}`);
  }
  const data = (await res.json()) as any;
  const status =
    data.charges?.data?.[0]?.status ?? data.payment_status ?? "pending_payment";
  return { orderId: data.id, status };
}

async function deleteConektaSource(customerId: string, sourceId: string): Promise<void> {
  const res = await fetch(
    `${CONEKTA_API_URL}/customers/${customerId}/payment_sources/${sourceId}`,
    {
      method: "DELETE",
      headers: cardApiHeaders(),
      signal: AbortSignal.timeout(10_000),
    },
  );
  if (!res.ok && res.status !== 404) {
    const text = await res.text();
    throw new Error(`Conekta deleteSource ${res.status}: ${text}`);
  }
}

// ── POST /api/cards/charge-and-save ───────────────────────────────────────────
// Body: { telefono, amount_mxn, save_card, tokenId }
// save_card=false: identical to existing one-time card charge
// save_card=true:  create/retrieve Conekta customer, save source, charge, persist card
router.post("/charge-and-save", async (req: Request, res: Response) => {
  const { telefono, amount_mxn, save_card, tokenId } = req.body as {
    telefono?: string;
    amount_mxn?: number;
    save_card?: boolean;
    tokenId?: string;
  };

  if (!telefono || !tokenId) {
    res.status(400).json({ error: "Se requieren telefono y tokenId." });
    return;
  }

  const amtNum = Number(amount_mxn);
  if (isNaN(amtNum) || amtNum < 50) {
    res.status(400).json({ error: "El monto mínimo para carga con tarjeta es $50 MXN." });
    return;
  }
  if (amtNum > 10_000) {
    res.status(400).json({ error: "El monto máximo para carga con tarjeta es $10,000 MXN." });
    return;
  }

  try {
    const wallet = await getOrCreateWallet(telefono);

    if (!save_card) {
      const cardOrder = await createCardOrder(wallet.id, amtNum, tokenId);
      const [tx] = await db
        .insert(walletTransactionsTable)
        .values({
          walletId: wallet.id,
          type: "load_card",
          amountMxn: amtNum.toFixed(2),
          status: "pending",
          conektaOrderId: cardOrder.orderId,
          description: `Carga con tarjeta PagoYa — $${amtNum.toFixed(2)} MXN`,
        })
        .returning();

      if (cardOrder.status === "paid") {
        await creditWallet(wallet.id, amtNum, tx.id);
        const [walletRow] = await db
          .select({ balanceMxn: walletsTable.balanceMxn })
          .from(walletsTable)
          .where(eq(walletsTable.id, wallet.id))
          .limit(1);
        res.json({ success: true, newBalance: parseFloat(walletRow?.balanceMxn ?? "0") });
      } else {
        res.json({ success: false, status: "pending" });
      }
      return;
    }

    // ── save_card: true path ───────────────────────────────────────────────
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.telefono, telefono))
      .limit(1);

    let customerId = user?.conektaCustomerId ?? null;
    let sourceId: string;
    let lastFour: string;
    let brand: string;

    if (!customerId) {
      const created = await createConektaCustomer(telefono, tokenId);
      customerId = created.customerId;
      sourceId = created.sourceId;
      lastFour = created.lastFour;
      brand = created.brand;
      await db
        .update(usersTable)
        .set({ conektaCustomerId: customerId })
        .where(eq(usersTable.telefono, telefono));
    } else {
      const added = await addSourceToCustomer(customerId, tokenId);
      sourceId = added.sourceId;
      lastFour = added.lastFour;
      brand = added.brand;
    }

    const chargeResult = await chargeCustomerSource(customerId, sourceId, amtNum, wallet.id);

    const [tx] = await db
      .insert(walletTransactionsTable)
      .values({
        walletId: wallet.id,
        type: "load_card",
        amountMxn: amtNum.toFixed(2),
        status: "pending",
        conektaOrderId: chargeResult.orderId,
        description: `Carga con tarjeta guardada ···${lastFour} PagoYa — $${amtNum.toFixed(2)} MXN`,
      })
      .returning();

    if (chargeResult.status === "paid") {
      await creditWallet(wallet.id, amtNum, tx.id);
    }

    await db.insert(savedCardsTable).values({
      userTelefono: telefono,
      conektaCardToken: sourceId,
      lastFour,
      brand,
      isDefault: false,
    });

    logger.info({ telefono, sourceId, lastFour }, "savedCards: card saved and charged");

    if (chargeResult.status === "paid") {
      const [walletRow] = await db
        .select({ balanceMxn: walletsTable.balanceMxn })
        .from(walletsTable)
        .where(eq(walletsTable.id, wallet.id))
        .limit(1);
      res.status(201).json({
        success: true,
        saved: true,
        newBalance: parseFloat(walletRow?.balanceMxn ?? "0"),
      });
    } else {
      res.status(201).json({ success: false, saved: true, status: "pending" });
    }
  } catch (err: unknown) {
    logger.error({ err, telefono }, "savedCards: charge-and-save failed");
    res
      .status(500)
      .json({ error: err instanceof Error ? err.message : "Error al procesar el pago." });
  }
});

// ── GET /api/cards/:telefono ───────────────────────────────────────────────────
// Returns saved cards for a user — never exposes raw tokens
router.get("/:telefono", async (req: Request, res: Response) => {
  try {
    const cards = await db
      .select({
        id: savedCardsTable.id,
        lastFour: savedCardsTable.lastFour,
        brand: savedCardsTable.brand,
        isDefault: savedCardsTable.isDefault,
        createdAt: savedCardsTable.createdAt,
      })
      .from(savedCardsTable)
      .where(eq(savedCardsTable.userTelefono, req.params.telefono))
      .orderBy(savedCardsTable.createdAt);
    res.json({ cards });
  } catch (err) {
    logger.error({ err }, "savedCards: list failed");
    res.status(500).json({ error: "Error al obtener las tarjetas." });
  }
});

// ── DELETE /api/cards/:id ──────────────────────────────────────────────────────
// Removes saved card from DB and deletes source from Conekta customer
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const [card] = await db
      .select()
      .from(savedCardsTable)
      .where(eq(savedCardsTable.id, req.params.id))
      .limit(1);

    if (!card) {
      res.status(404).json({ error: "Tarjeta no encontrada." });
      return;
    }

    const [user] = await db
      .select({ conektaCustomerId: usersTable.conektaCustomerId })
      .from(usersTable)
      .where(eq(usersTable.telefono, card.userTelefono))
      .limit(1);

    if (user?.conektaCustomerId) {
      await deleteConektaSource(user.conektaCustomerId, card.conektaCardToken).catch(
        (err) => {
          logger.warn({ err }, "savedCards: Conekta deleteSource failed, proceeding with DB delete");
        },
      );
    }

    await db.delete(savedCardsTable).where(eq(savedCardsTable.id, req.params.id));
    logger.info({ cardId: req.params.id }, "savedCards: card deleted");
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "savedCards: delete failed");
    res.status(500).json({ error: "Error al eliminar la tarjeta." });
  }
});

// ── POST /api/cards/:id/charge ─────────────────────────────────────────────────
// Charge a previously saved card — looks up conekta_card_token (source ID) and customer
router.post("/:id/charge", async (req: Request, res: Response) => {
  const { amount_mxn } = req.body as { amount_mxn?: number };

  const amtNum = Number(amount_mxn);
  if (isNaN(amtNum) || amtNum < 50) {
    res.status(400).json({ error: "El monto mínimo para carga con tarjeta es $50 MXN." });
    return;
  }
  if (amtNum > 10_000) {
    res.status(400).json({ error: "El monto máximo para carga con tarjeta es $10,000 MXN." });
    return;
  }

  try {
    const [card] = await db
      .select()
      .from(savedCardsTable)
      .where(eq(savedCardsTable.id, req.params.id))
      .limit(1);

    if (!card) {
      res.status(404).json({ error: "Tarjeta no encontrada." });
      return;
    }

    const [user] = await db
      .select({ conektaCustomerId: usersTable.conektaCustomerId })
      .from(usersTable)
      .where(eq(usersTable.telefono, card.userTelefono))
      .limit(1);

    if (!user?.conektaCustomerId) {
      res.status(400).json({ error: "Cliente Conekta no encontrado. Contacta soporte." });
      return;
    }

    const wallet = await getOrCreateWallet(card.userTelefono);
    const chargeResult = await chargeCustomerSource(
      user.conektaCustomerId,
      card.conektaCardToken,
      amtNum,
      wallet.id,
    );

    const [tx] = await db
      .insert(walletTransactionsTable)
      .values({
        walletId: wallet.id,
        type: "load_card",
        amountMxn: amtNum.toFixed(2),
        status: "pending",
        conektaOrderId: chargeResult.orderId,
        description: `Carga con tarjeta guardada ···${card.lastFour} — $${amtNum.toFixed(2)} MXN`,
      })
      .returning();

    if (chargeResult.status === "paid") {
      await creditWallet(wallet.id, amtNum, tx.id);
      const [walletRow] = await db
        .select({ balanceMxn: walletsTable.balanceMxn })
        .from(walletsTable)
        .where(eq(walletsTable.id, wallet.id))
        .limit(1);
      logger.info({ cardId: req.params.id, amtNum }, "savedCards: saved card charged");
      res.json({
        success: true,
        newBalance: parseFloat(walletRow?.balanceMxn ?? "0"),
      });
    } else {
      res.json({ success: false, status: "pending" });
    }
  } catch (err: unknown) {
    logger.error({ err }, "savedCards: saved card charge failed");
    res
      .status(500)
      .json({ error: err instanceof Error ? err.message : "Error al procesar el pago." });
  }
});

export default router;
