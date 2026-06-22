// ─── STP (SPEI) INBOUND TRANSFER HANDLER ─────────────────────────────────────
//
// Two responsibilities:
//   1. handleStpWebhook — raw-body POST handler mounted in app.ts BEFORE
//      express.json() so HMAC-SHA256 signature validation has the untouched body.
//   2. GET /api/stp/instructions/:telefono — returns user-specific CLABE + empresa.
//   3. GET /api/stp/clabe/:telefono — returns user's assigned CLABE (or null).
//   4. GET /api/stp/account/check/:clabe — checks CLABE status with STP.
//
// Required env vars (see .env.example):
//   STP_EMPRESA, STP_CLABE_RECEPTOR, STP_WEBHOOK_SECRET, STP_ENABLED
//   STP_BANK_CODE, STP_CITY_CODE, STP_SOAP_URL
// ─────────────────────────────────────────────────────────────────────────────

import { Router, type Request, type Response, type RequestHandler } from "express";
import { createHmac, timingSafeEqual } from "node:crypto";
import { eq, sql as drizzleSql } from "drizzle-orm";
import {
  db,
  usersTable,
  walletTransactionsTable,
  stpWebhookLogTable,
} from "@workspace/db";
import { getOrCreateWallet, creditWallet } from "../wallet/services/wallet.js";
import { sendWhatsApp } from "../lib/whatsapp.js";
import { logger } from "../lib/logger.js";
import { generateCepUrl, checkStpAccount } from "../services/stpService.js";
import { updateLoadMethodCounters } from "../services/loadMethodCounters.js";

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

// ── Resolve user by CLABE (primary) or phone in conceptoPago (fallback) ───
async function resolveUserTelefono(
  cuentaBeneficiario: string | undefined,
  conceptoPago: string | undefined,
): Promise<{ telefono: string; matchedBy: "clabe" | "conceptoPago" } | null> {
  // 1. Try CLABE match — preferred once users have per-user CLABEs assigned
  if (cuentaBeneficiario && cuentaBeneficiario.length === 18) {
    const [byClabe] = await db
      .select({ telefono: usersTable.telefono })
      .from(usersTable)
      .where(eq(usersTable.stpClabe, cuentaBeneficiario))
      .limit(1);

    if (byClabe) {
      return { telefono: byClabe.telefono, matchedBy: "clabe" };
    }
  }

  // 2. Fallback: extract phone number from conceptoPago
  const telefono = normalizeTelefono(conceptoPago ?? "");
  if (!telefono) return null;

  const [byPhone] = await db
    .select({ telefono: usersTable.telefono })
    .from(usersTable)
    .where(eq(usersTable.telefono, telefono))
    .limit(1);

  if (!byPhone) return null;
  return { telefono: byPhone.telefono, matchedBy: "conceptoPago" };
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
    cuentaBeneficiario,
    fechaOperacion,
    estado,
  } = payload as {
    claveRastreo?: string;
    monto?: number | string;
    conceptoPago?: string;
    ordenante?: string;
    cuentaBeneficiario?: string;
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

  // Resolve user by CLABE first, then conceptoPago fallback
  const userMatch = await resolveUserTelefono(
    cuentaBeneficiario as string | undefined,
    conceptoPago as string | undefined,
  );

  if (!userMatch || amountMXN < 1) {
    await db
      .insert(stpWebhookLogTable)
      .values({
        rawPayload: payload,
        status: "unmatched",
        error: userMatch
          ? `Invalid monto=${monto}`
          : `Cannot resolve user — cuentaBeneficiario="${cuentaBeneficiario}" conceptoPago="${conceptoPago}"`,
      })
      .catch((err) => logger.error({ err }, "stp: log insert failed"));
    logger.warn(
      { cuentaBeneficiario, conceptoPago, monto, claveRastreo },
      "stp: unmatched SPEI — no user found or zero amount",
    );
    res.json({ ok: true });
    return;
  }

  const { telefono, matchedBy } = userMatch;

  // Generate CEP URL for the official Banxico receipt
  let cepUrl: string | null = null;
  if (claveRastreo && fechaOperacion) {
    try {
      cepUrl = generateCepUrl({
        claveRastreo,
        fechaOperacion: String(fechaOperacion),
        amountMxn: amountMXN,
      });
    } catch (err) {
      logger.warn({ err, claveRastreo }, "stp: CEP URL generation failed (non-fatal)");
    }
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
        stpClaveRastreo: claveRastreo ?? null,
        cepUrl: cepUrl ?? null,
      })
      .returning();

    await creditWallet(wallet.id, amountMXN, tx.id);

    // Tag payment_source for OXXO→digital migration signal in PTI scoring
    db.execute(drizzleSql`UPDATE wallet_transactions SET payment_source = 'spei' WHERE id = ${tx.id}`).catch(() => {});

    // Update load method trajectory counters (denormalized cache; keep in sync with pagoScore.ts lines 177-186)
    updateLoadMethodCounters(db, telefono, "spei").catch(() => {});

    // WhatsApp confirmation — include CEP link for official receipt
    const cepLine = cepUrl
      ? `\n📄 Comprobante oficial (Banxico):\n${cepUrl}`
      : "";

    const matchNote = matchedBy === "clabe"
      ? ""
      : "\n_(transferencia identificada por concepto de pago)_";

    sendWhatsApp(
      telefono,
      `✅ *PagoYa — Transferencia SPEI Recibida*\n` +
        `Monto: $${amountMXN.toFixed(2)} MXN\n` +
        `De: ${ordenante ?? "remitente"}\n` +
        `Clave rastreo: ${claveRastreo ?? "N/A"}\n` +
        `Tu saldo ha sido actualizado automáticamente.` +
        cepLine +
        matchNote,
    ).catch(() => {});

    await db
      .insert(stpWebhookLogTable)
      .values({ rawPayload: payload, status: "credited", error: null })
      .catch((err) => logger.error({ err }, "stp: log insert failed"));

    logger.info(
      { telefono, amountMXN, claveRastreo, matchedBy, cepUrl },
      "stp: SPEI transfer credited to wallet",
    );

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

// ── Router ──────────────────────────────────────────────────────────────────
const router = Router();

// GET /api/stp/instructions/:telefono
// Returns the SPEI deposit instructions for a user.
// If the user has a personal CLABE assigned, returns that.
// Falls back to the shared CLABE receptor with conceptoPago instructions.
router.get("/instructions/:telefono", async (req: Request, res: Response) => {
  const { telefono } = req.params;

  const [user] = await db
    .select({ stpClabe: usersTable.stpClabe })
    .from(usersTable)
    .where(eq(usersTable.telefono, telefono))
    .limit(1)
    .catch(() => []);

  const personalClabe = user?.stpClabe ?? null;
  const sharedClabe = process.env.STP_CLABE_RECEPTOR ?? null;
  const empresa = process.env.STP_EMPRESA ?? null;
  const enabled = process.env.STP_ENABLED === "true";

  if (personalClabe) {
    res.json({
      clabe: personalClabe,
      empresa,
      enabled,
      type: "personal",
      concept_instructions: null,
      note: "Usa esta CLABE única para tus depósitos SPEI. No necesitas escribir nada en el concepto.",
    });
  } else {
    res.json({
      clabe: sharedClabe,
      empresa,
      enabled,
      type: "shared",
      concept_instructions: `Escribe tu número de teléfono en el concepto: ${telefono}`,
      note: "Escribe tu número celular completo (con +52) en el campo concepto de pago.",
    });
  }
});

// GET /api/stp/clabe/:telefono
// Returns just the user's assigned CLABE (for admin / KYC dashboards).
router.get("/clabe/:telefono", async (req: Request, res: Response) => {
  const { telefono } = req.params;
  const [user] = await db
    .select({ stpClabe: usersTable.stpClabe, telefono: usersTable.telefono })
    .from(usersTable)
    .where(eq(usersTable.telefono, telefono))
    .limit(1)
    .catch(() => []);

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json({ telefono: user.telefono, clabe: user.stpClabe ?? null });
});

// GET /api/stp/account/check/:clabe
// Checks whether a CLABE is active in STP (delegates to consultaCuentaFisica).
router.get("/account/check/:clabe", async (req: Request, res: Response) => {
  const { clabe } = req.params;
  if (!/^\d{18}$/.test(clabe)) {
    res.status(400).json({ error: "CLABE must be 18 numeric digits" });
    return;
  }
  const result = await checkStpAccount(clabe);
  res.json(result);
});

export default router;
