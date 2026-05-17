// ─── STP (SPEI) INBOUND TRANSFER HANDLER ─────────────────────────────────────
//
// Two responsibilities:
//   1. handleStpWebhook — raw-body POST handler mounted in app.ts BEFORE
//      express.json() so HMAC-SHA256 signature validation has the untouched body.
//   2. GET /api/stp/instructions/:telefono — returns CLABE / empresa for the UI.
//
// Required env vars (see .env.example):
//   STP_EMPRESA, STP_CLABE_RECEPTOR, STP_WEBHOOK_SECRET, STP_ENABLED
// ─────────────────────────────────────────────────────────────────────────────

import { Router, type Request, type Response, type RequestHandler } from "express";
import { createHmac, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import {
  db,
  usersTable,
  walletTransactionsTable,
  stpWebhookLogTable,
} from "@workspace/db";
import { getOrCreateWallet, creditWallet } from "../wallet/services/wallet.js";
import { sendWhatsApp } from "../lib/whatsapp.js";
import { logger } from "../lib/logger.js";

// ── Signature verification ─────────────────────────────────────────────────
function verifyStpSignature(rawBody: Buffer, signatureHeader: string | undefined): boolean {
  const secret = process.env.STP_WEBHOOK_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV !== "production") return true;
    logger.warn("stp: STP_WEBHOOK_SECRET not configured — rejecting webhook");
    return false;
  }
  if (!signatureHeader) return false;

  const prefix = "sha256=";
  const provided = signatureHeader.startsWith(prefix)
    ? signatureHeader.slice(prefix.length)
    : signatureHeader;

  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");

  try {
    return timingSafeEqual(
      Buffer.from(expected, "utf8"),
      Buffer.from(provided, "utf8"),
    );
  } catch {
    return false;
  }
}

// ── Normalise a telefono extracted from the payment concept ───────────────
function normalizeTelefono(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return "+52" + digits;
  if (digits.length === 12 && digits.startsWith("52")) return "+" + digits;
  if (digits.length === 13 && digits.startsWith("521")) return "+" + digits.slice(0, 12);
  return null;
}

// ── handleStpWebhook — mounted in app.ts with raw body parser ─────────────
export const handleStpWebhook: RequestHandler = async (req, res) => {
  const rawBody = req.body as Buffer;

  const signatureHeader = (
    req.headers["x-stp-signature"] ??
    req.headers["stp-signature"]
  ) as string | undefined;

  if (!verifyStpSignature(rawBody, signatureHeader)) {
    logger.warn({ signatureHeader }, "stp: invalid webhook signature");
    res.status(401).json({ error: "Invalid signature" });
    return;
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody.toString("utf8")) as Record<string, unknown>;
  } catch {
    logger.warn("stp: invalid JSON payload");
    res.status(400).json({ error: "Invalid JSON" });
    return;
  }

  const {
    claveRastreo,
    monto,
    conceptoPago,
    ordenante,
    estado,
  } = payload as {
    claveRastreo?: string;
    monto?: number | string;
    conceptoPago?: string;
    ordenante?: string;
    fechaOperacion?: string;
    estado?: string;
  };

  const isSuccess =
    estado === "LIQUIDADA" ||
    estado === "LQ" ||
    estado === "APPLIED" ||
    estado === "CONFIRMADA";

  if (!isSuccess) {
    await db
      .insert(stpWebhookLogTable)
      .values({ rawPayload: payload, status: "ignored", error: `estado=${estado ?? "unknown"}` })
      .catch((err) => logger.error({ err }, "stp: log insert failed"));
    logger.info({ estado, claveRastreo }, "stp: webhook received but estado is not success — ignored");
    res.json({ ok: true });
    return;
  }

  // STP sends monto in centavos
  const rawMonto = typeof monto === "number" ? monto : parseFloat(String(monto ?? "0"));
  const amountMXN = rawMonto / 100;

  const telefono = normalizeTelefono(conceptoPago ?? "");

  if (!telefono || amountMXN < 1) {
    await db
      .insert(stpWebhookLogTable)
      .values({
        rawPayload: payload,
        status: "unmatched",
        error: `Cannot resolve telefono from conceptoPago="${conceptoPago}" or invalid monto=${monto}`,
      })
      .catch((err) => logger.error({ err }, "stp: log insert failed"));
    logger.warn({ conceptoPago, monto, claveRastreo }, "stp: unmatched SPEI — no telefono or zero amount");
    res.json({ ok: true });
    return;
  }

  const [user] = await db
    .select({ telefono: usersTable.telefono })
    .from(usersTable)
    .where(eq(usersTable.telefono, telefono))
    .limit(1);

  if (!user) {
    await db
      .insert(stpWebhookLogTable)
      .values({
        rawPayload: payload,
        status: "unmatched",
        error: `User not found for telefono=${telefono}`,
      })
      .catch((err) => logger.error({ err }, "stp: log insert failed"));
    logger.warn({ telefono, claveRastreo }, "stp: no user found for SPEI transfer — logged for manual reconciliation");
    res.json({ ok: true });
    return;
  }

  try {
    const wallet = await getOrCreateWallet(telefono);

    const [tx] = await db
      .insert(walletTransactionsTable)
      .values({
        walletId: wallet.id,
        type: "spei_in",
        amountMxn: amountMXN.toFixed(2),
        status: "pending",
        description: `SPEI de ${ordenante ?? "remitente"} — clave ${claveRastreo ?? "N/A"}`,
      })
      .returning();

    await creditWallet(wallet.id, amountMXN, tx.id);

    // WhatsApp confirmation — non-blocking
    sendWhatsApp(
      telefono,
      `✅ *PagoYa — Transferencia SPEI Recibida*\n` +
        `Monto: $${amountMXN.toFixed(2)} MXN\n` +
        `De: ${ordenante ?? "remitente"}\n` +
        `Clave rastreo: ${claveRastreo ?? "N/A"}\n` +
        `Tu saldo ha sido actualizado automáticamente.`,
    ).catch(() => {});

    await db
      .insert(stpWebhookLogTable)
      .values({ rawPayload: payload, status: "credited", error: null })
      .catch((err) => logger.error({ err }, "stp: log insert failed"));

    logger.info({ telefono, amountMXN, claveRastreo }, "stp: SPEI transfer credited to wallet");

    // Always respond 200 so STP does not retry
    res.json({ ok: true });
  } catch (err: unknown) {
    logger.error({ err, telefono, claveRastreo }, "stp: failed to credit wallet for SPEI transfer");

    await db
      .insert(stpWebhookLogTable)
      .values({
        rawPayload: payload,
        status: "error",
        error: err instanceof Error ? err.message : "Unknown error",
      })
      .catch(() => {});

    // Respond 200 to prevent STP retries; the log entry enables manual reconciliation
    res.json({ ok: true });
  }
};

// ── Router — GET /api/stp/instructions/:telefono ───────────────────────────
const router = Router();

router.get("/instructions/:telefono", (_req: Request, res: Response) => {
  const telefono = _req.params.telefono;
  res.json({
    clabe: process.env.STP_CLABE_RECEPTOR ?? null,
    empresa: process.env.STP_EMPRESA ?? null,
    concept_instructions: `Escribe tu número de teléfono: ${telefono}`,
    enabled: process.env.STP_ENABLED === "true",
  });
});

export default router;
