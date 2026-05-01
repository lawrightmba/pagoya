import { createVerify } from "node:crypto";
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

function normalizePemKey(raw: string): string {
  const key = raw.trim();
  if (key.includes("\n")) return key;
  const body = key
    .replace("-----BEGIN PUBLIC KEY-----", "")
    .replace("-----END PUBLIC KEY-----", "")
    .replace(/\s/g, "");
  const lines = body.match(/.{1,64}/g) ?? [];
  return "-----BEGIN PUBLIC KEY-----\n" + lines.join("\n") + "\n-----END PUBLIC KEY-----";
}

export function verifyConektaWebhookSignature(
  rawBody: Buffer,
  signatureHeader: string | undefined,
): boolean {
  if (!signatureHeader) return false;
  const publicKey = process.env.CONEKTA_WEBHOOK_PUBLIC_KEY;
  if (!publicKey) {
    if (process.env.NODE_ENV !== "production") return true;
    throw new Error("CONEKTA_WEBHOOK_PUBLIC_KEY no está configurado.");
  }
  try {
    const verify = createVerify("SHA256");
    verify.update(rawBody);
    return verify.verify(normalizePemKey(publicKey), signatureHeader, "base64");
  } catch {
    return false;
  }
}
