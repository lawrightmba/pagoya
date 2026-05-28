import { Router, Request, Response } from "express";
import { db, walletTransactionsTable } from "@workspace/db";
import { sql as drizzleSql } from "drizzle-orm";
import { logger } from "../lib/logger";
import { getOrCreateWallet, creditWallet, getBalance } from "../wallet/services/wallet.js";

const router = Router();

const BELVO_BASE =
  process.env.BELVO_ENV === "production"
    ? "https://api.belvo.com"
    : "https://sandbox.belvo.com";

function belvoAuth(): string {
  const id = process.env.BELVO_KEY_ID!;
  const secret = process.env.BELVO_KEY_SECRET!;
  return "Basic " + Buffer.from(`${id}:${secret}`).toString("base64");
}

async function getUserId(telefono: string): Promise<number | null> {
  const rows = await db.execute(
    drizzleSql`SELECT id FROM users WHERE telefono = ${telefono} LIMIT 1`,
  );
  const row = rows.rows[0] as { id: number } | undefined;
  return row?.id ?? null;
}

// POST /api/belvo-connect/widget-token
// Issues a short-lived Belvo access token to initialize the Connect widget on the frontend
router.post("/widget-token", async (_req: Request, res: Response) => {
  try {
    const r = await fetch(`${BELVO_BASE}/api/token/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: belvoAuth(),
      },
      body: JSON.stringify({
        id: process.env.BELVO_KEY_ID,
        password: process.env.BELVO_KEY_SECRET,
        scopes: "read_institutions,write_links,read_links",
      }),
    });
    const data = await r.json();
    if (!r.ok) throw { status: r.status, data };
    logger.info("belvo-connect: widget token issued");
    res.json({ access: data.access });
  } catch (err: any) {
    logger.error({ err }, "belvo-connect: widget-token failed");
    res
      .status(err.status || 500)
      .json({ error: "No se pudo inicializar la conexión bancaria", detail: err.data });
  }
});

// POST /api/belvo-connect/link
// Body: { telefono, linkId, institution, institutionName }
// Called after the Belvo widget callback — persists the link_id for the user
router.post("/link", async (req: Request, res: Response) => {
  const { telefono, linkId, institution, institutionName } = req.body as {
    telefono?: string;
    linkId?: string;
    institution?: string;
    institutionName?: string;
  };
  if (!telefono || !linkId) {
    return res.status(400).json({ error: "telefono y linkId son requeridos" });
  }
  try {
    const userId = await getUserId(telefono);
    if (!userId) return res.status(404).json({ error: "usuario no encontrado" });
    await db.execute(
      drizzleSql`UPDATE belvo_links SET deleted_at = NOW() WHERE user_id = ${userId} AND deleted_at IS NULL`,
    );
    await db.execute(drizzleSql`
      INSERT INTO belvo_links (user_id, link_id, institution, institution_name, created_at)
      VALUES (${userId}, ${linkId}, ${institution ?? ""}, ${institutionName ?? ""}, NOW())
    `);
    logger.info({ userId, linkId, institution }, "belvo-connect: link saved");
    res.json({ ok: true });
  } catch (err: any) {
    logger.error({ err }, "belvo-connect: save link failed");
    res.status(500).json({ error: "No se pudo guardar la cuenta bancaria" });
  }
});

// GET /api/belvo-connect/link?telefono=
// Returns active linked bank for the user, or { linked: false }
router.get("/link", async (req: Request, res: Response) => {
  const telefono = (req.query.telefono as string | undefined)?.trim();
  if (!telefono) return res.status(400).json({ error: "telefono requerido" });
  try {
    const userId = await getUserId(telefono);
    if (!userId) return res.json({ linked: false });
    const rows = await db.execute(drizzleSql`
      SELECT link_id, institution, institution_name
      FROM belvo_links
      WHERE user_id = ${userId} AND deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT 1
    `);
    const row = rows.rows[0] as Record<string, unknown> | undefined;
    if (!row) return res.json({ linked: false });
    res.json({
      linked: true,
      linkId: row.link_id,
      institution: row.institution,
      institutionName: (row.institution_name as string) || (row.institution as string) || "Banco",
    });
  } catch (err: any) {
    logger.error({ err }, "belvo-connect: get link failed");
    res.status(500).json({ error: "Error al obtener cuenta" });
  }
});

// DELETE /api/belvo-connect/link
// Body: { telefono }
// Soft-deletes the active bank link for the user
router.delete("/link", async (req: Request, res: Response) => {
  const { telefono } = req.body as { telefono?: string };
  if (!telefono) return res.status(400).json({ error: "telefono requerido" });
  try {
    const userId = await getUserId(telefono);
    if (!userId) return res.status(404).json({ error: "usuario no encontrado" });
    await db.execute(
      drizzleSql`UPDATE belvo_links SET deleted_at = NOW() WHERE user_id = ${userId} AND deleted_at IS NULL`,
    );
    logger.info({ userId }, "belvo-connect: link unlinked");
    res.json({ ok: true });
  } catch (err: any) {
    logger.error({ err }, "belvo-connect: unlink failed");
    res.status(500).json({ error: "No se pudo desvincular la cuenta" });
  }
});

// POST /api/belvo-connect/topup
// Body: { telefono, amountMXN }
// Sandbox: directly credits wallet (mock transfer)
// Production TODO: replace inner block with Belvo Pagos seguros en Línea payment initiation
//   when production keys arrive from the pending Belvo upgrade application
router.post("/topup", async (req: Request, res: Response) => {
  const { telefono, amountMXN } = req.body as { telefono?: string; amountMXN?: unknown };
  if (!telefono || amountMXN == null) {
    return res.status(400).json({ error: "telefono y amountMXN son requeridos" });
  }
  const amount = parseFloat(String(amountMXN));
  if (isNaN(amount) || amount < 50 || amount > 50000) {
    return res
      .status(400)
      .json({ error: "Monto inválido — mínimo $50, máximo $50,000 MXN" });
  }
  try {
    const userId = await getUserId(telefono);
    if (!userId) return res.status(404).json({ error: "usuario no encontrado" });

    const linkRows = await db.execute(drizzleSql`
      SELECT link_id, institution_name FROM belvo_links
      WHERE user_id = ${userId} AND deleted_at IS NULL
      ORDER BY created_at DESC LIMIT 1
    `);
    const link = linkRows.rows[0] as Record<string, unknown> | undefined;
    if (!link) {
      return res.status(400).json({ error: "No tienes una cuenta bancaria vinculada" });
    }

    const wallet = await getOrCreateWallet(telefono);
    const description = `Carga vía banco (${link.institution_name || "Belvo"}) — $${amount.toFixed(2)} MXN`;

    const [tx] = await db
      .insert(walletTransactionsTable)
      .values({
        walletId: wallet.id,
        type: "load_banco" as any,
        amountMxn: amount.toFixed(2),
        status: "pending",
        description,
      })
      .returning();

    await creditWallet(tx.walletId, amount, tx.id);
    const newBalance = await getBalance(telefono);

    logger.info({ telefono, amount, newBalance }, "belvo-connect: topup credited (sandbox)");
    res.json({ ok: true, amountMXN: amount, newBalance, sandbox: true });
  } catch (err: any) {
    logger.error({ err }, "belvo-connect: topup failed");
    res.status(err.status || 500).json({ error: "No se pudo procesar la carga" });
  }
});

export { router as belvoConnectRouter };
