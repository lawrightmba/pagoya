// ─── CONEKTA / DIGITAL FEMSA — OXXO CASH-IN ADAPTER ────────────────────────
//
// This module handles two responsibilities:
//   1. Creating OXXO cash payment orders via the Digitalfemsa REST API
//   2. Verifying webhook signatures for incoming charge.paid / charge.expired events
//
// ─── REQUIRED MANUAL STEP ────────────────────────────────────────────────────
// Before live OXXO cash-ins will work you must register the webhook URL in the
// Conekta / Digitalfemsa dashboard:
//
//   URL:    https://pagoyamx.com/api/wallet/webhook/conekta
//   Events: charge.paid, charge.expired
//
// The public key for signature verification is available in the dashboard under
// Developers → Webhooks → Public Key. Store it as CONEKTA_WEBHOOK_PUBLIC_KEY
// (or the legacy alias CONEKTA_PUBLIC_KEY) in Replit Secrets.
// ─────────────────────────────────────────────────────────────────────────────

import { createVerify, createHmac, timingSafeEqual } from "node:crypto";
import { logger } from "../../lib/logger.js";

const CONEKTA_BASE_URL = "https://api.digitalfemsa.io";

export interface ConektaOxxoOrder {
  orderId: string;
  reference: string;
  voucherUrl: string;
  expiresAt: Date;
}

function getConektaApiKey(): string {
  const key = process.env.CONEKTA_API_KEY;
  if (!key) throw new Error("CONEKTA_API_KEY no está configurado.");
  return key;
}

function conektaHeaders(apiKey: string): Record<string, string> {
  const encoded = Buffer.from(`${apiKey}:`).toString("base64");
  return {
    Authorization: `Basic ${encoded}`,
    "Content-Type": "application/json",
    Accept: "application/vnd.app-v2.1.0+json",
  };
}

export async function createOxxoOrder(params: {
  amountMXN: number;
  customerEmail: string;
  customerName: string;
  description: string;
  expiresAfterDays?: number;
}): Promise<ConektaOxxoOrder> {
  const apiKey = getConektaApiKey();
  const expiresAfterDays = params.expiresAfterDays ?? 5;
  const expiresAt = Math.floor(Date.now() / 1000) + expiresAfterDays * 86400;

  const body = {
    currency: "MXN",
    customer_info: {
      email: params.customerEmail,
      name: params.customerName,
    },
    line_items: [
      {
        name: params.description,
        quantity: 1,
        unit_price: Math.round(params.amountMXN * 100),
      },
    ],
    charges: [
      {
        payment_method: {
          type: "cash",
          expires_at: expiresAt,
        },
      },
    ],
  };

  const response = await fetch(`${CONEKTA_BASE_URL}/orders`, {
    method: "POST",
    headers: conektaHeaders(apiKey),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Conekta error ${response.status}: ${text}`);
  }

  const data = (await response.json()) as {
    id: string;
    charges: {
      data: Array<{
        payment_method: {
          reference?: string;
          barcode_url?: string;
          store_reference?: string;
          expire_at?: number;
        };
      }>;
    };
  };

  const charge = data.charges?.data?.[0];
  const pm = charge?.payment_method ?? {};
  const reference = pm.reference ?? pm.store_reference ?? "";
  const voucherUrl = pm.barcode_url ?? `https://api.digitalfemsa.io/orders/${data.id}/barcode`;
  const expireTs = pm.expire_at ? pm.expire_at * 1000 : expiresAt * 1000;

  logger.info({ orderId: data.id, reference }, "conekta: OXXO order created");

  return {
    orderId: data.id,
    reference,
    voucherUrl,
    expiresAt: new Date(expireTs),
  };
}

export interface ConektaCardOrder {
  orderId: string;
  status: string;
}

export async function createCardOrder(
  walletId: string,
  amountMXN: number,
  tokenId: string,
): Promise<ConektaCardOrder> {
  const cardApiKey = process.env.CONEKTA_CARD_API_KEY;
  if (!cardApiKey) throw new Error("CONEKTA_CARD_API_KEY no está configurado.");

  const encoded = Buffer.from(`${cardApiKey}:`).toString("base64");
  const cardHeaders = {
    Authorization: `Basic ${encoded}`,
    "Content-Type": "application/json",
    Accept: "application/vnd.conekta-v2.2.0+json",
  };

  const body = {
    currency: "MXN",
    customer_info: {
      email: `wallet-${walletId}@pagoya.mx`,
      name: "PagoYa Card User",
    },
    line_items: [
      {
        name: "Carga con tarjeta PagoYa",
        quantity: 1,
        unit_price: Math.round(amountMXN * 100),
      },
    ],
    charges: [
      {
        payment_method: {
          type: "card",
          token_id: tokenId,
        },
      },
    ],
    metadata: { walletId, type: "card_topup" },
  };

  const response = await fetch(`https://api.conekta.io/orders`, {
    method: "POST",
    headers: cardHeaders,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Conekta error ${response.status}: ${text}`);
  }

  const data = (await response.json()) as {
    id: string;
    payment_status?: string;
    charges: { data: Array<{ status: string }> };
  };

  const status =
    data.charges?.data?.[0]?.status ?? data.payment_status ?? "pending_payment";

  logger.info({ orderId: data.id, status, walletId }, "conekta: card order created");

  return { orderId: data.id, status };
}

function normalizePemKey(raw: string): string {
  const key = raw.trim();
  if (key.includes("\n")) return key;
  // Strip ALL whitespace including spaces (Replit Secrets replaces \n with spaces)
  const body = key
    .replace("-----BEGIN PUBLIC KEY-----", "")
    .replace("-----END PUBLIC KEY-----", "")
    .replace(/\s+/g, "");
  const lines = body.match(/.{1,64}/g) ?? [];
  logger.info({ bodyPreview: body.substring(0, 20) }, "conekta: normalizePemKey called");
  return "-----BEGIN PUBLIC KEY-----\n" + lines.join("\n") + "\n-----END PUBLIC KEY-----";
}

// ─── CARD WEBHOOK SIGNATURE VERIFICATION (api.conekta.io / HMAC-SHA256) ─────
// Conekta v2.2 sends a Digest header: sha256=<base64-hmac-sha256>
// using the shared secret configured in the Conekta dashboard for the webhook.
// Store the secret as CONEKTA_CARD_WEBHOOK_SECRET in Replit Secrets.
//
//   Webhook URL:  https://pagoyamx.com/api/wallet/webhook/conekta-card
//   Events:       charge.paid, charge.failed
// ─────────────────────────────────────────────────────────────────────────────
export function verifyCardWebhookSignature(
  rawBody: Buffer,
  signatureHeader: string | undefined,
): boolean {
  const secret = process.env.CONEKTA_CARD_WEBHOOK_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV !== "production") return true;
    throw new Error("CONEKTA_CARD_WEBHOOK_SECRET no está configurado.");
  }
  if (!signatureHeader) return false;

  const prefix = "sha256=";
  const provided = signatureHeader.startsWith(prefix)
    ? signatureHeader.slice(prefix.length)
    : signatureHeader;

  const expected = createHmac("sha256", secret).update(rawBody).digest("base64");

  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(provided));
  } catch {
    return false;
  }
}

export function verifyConektaWebhookSignature(
  rawBody: Buffer,
  signatureHeader: string | undefined,
): boolean {
  if (!signatureHeader) return false;
  // Accept either the canonical name or the legacy alias stored in Replit Secrets
  const publicKey =
    process.env.CONEKTA_WEBHOOK_PUBLIC_KEY ?? process.env.CONEKTA_PUBLIC_KEY;
  if (!publicKey) {
    if (process.env.NODE_ENV !== "production") return true;
    throw new Error(
      "CONEKTA_WEBHOOK_PUBLIC_KEY (or CONEKTA_PUBLIC_KEY) no está configurado.",
    );
  }
  try {
    const verify = createVerify("SHA256");
    verify.update(rawBody);
    return verify.verify(normalizePemKey(publicKey), signatureHeader, "base64");
  } catch {
    return false;
  }
}
