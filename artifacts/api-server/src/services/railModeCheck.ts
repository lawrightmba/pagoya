// ─── RAIL MODE CHECK — startup visibility for payment rail live/sandbox modes ──
//
// Why this exists: in July 2026 the prod OXXO rail silently ran on a
// DigitalFemsa SANDBOX key (livemode:false) — users got barcodes no OXXO
// cashier could accept. Key prefixes can't distinguish Conekta/DigitalFemsa
// live vs sandbox, so we ask each API and log the answer at every boot.
// Non-blocking, fire-and-forget: never delays or prevents startup.

import { logger } from "../lib/logger.js";

async function probeConektaLivemode(baseUrl: string, apiKey: string): Promise<string> {
  try {
    const res = await fetch(`${baseUrl}/orders?limit=1`, {
      headers: {
        Accept: "application/vnd.conekta-v2.1.0+json",
        Authorization: `Bearer ${apiKey}`,
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return `UNKNOWN (HTTP ${res.status})`;
    const data = (await res.json()) as { data?: Array<{ livemode?: boolean }> };
    const order = data.data?.[0];
    if (!order || typeof order.livemode !== "boolean") return "UNKNOWN (no orders to inspect)";
    return order.livemode ? "LIVE" : "SANDBOX";
  } catch (err) {
    return `UNKNOWN (${err instanceof Error ? err.message : "probe failed"})`;
  }
}

export async function logRailModes(): Promise<void> {
  const oxxoKey = process.env.CONEKTA_API_KEY;
  const cardKey = process.env.CONEKTA_CARD_API_KEY;

  const [oxxoMode, cardMode] = await Promise.all([
    oxxoKey ? probeConektaLivemode("https://api.digitalfemsa.io", oxxoKey) : Promise.resolve("NOT CONFIGURED"),
    cardKey ? probeConektaLivemode("https://api.conekta.io", cardKey) : Promise.resolve("NOT CONFIGURED"),
  ]);

  // SIPREL: app.taecel.com is the production endpoint; a distinct sandbox URL would show here.
  const siprelBase = process.env.SIPREL_BASE_URL ?? "https://app.taecel.com/api/";
  const siprelMode = !process.env.SIPREL_API_KEY
    ? "NOT CONFIGURED"
    : siprelBase.includes("app.taecel.com")
      ? "LIVE (production endpoint)"
      : `NON-STANDARD ENDPOINT (${siprelBase})`;

  // STP SPEI: SOAP registration only runs when STP_ENABLED === "true".
  const stpMode =
    process.env.STP_ENABLED === "true"
      ? `ENABLED (${process.env.STP_SOAP_URL ?? "STP_SOAP_URL unset"})`
      : "DISABLED (STP_ENABLED != true — CLABEs local-only, no SOAP registration)";

  // Twilio WhatsApp: the shared sandbox number is a known constant.
  const twilioFrom = process.env.TWILIO_WHATSAPP_FROM ?? "whatsapp:+14155238886";
  const twilioMode = !process.env.TWILIO_ACCOUNT_SID
    ? "NOT CONFIGURED"
    : twilioFrom.includes("+14155238886")
      ? "SANDBOX (shared Twilio sandbox number)"
      : `LIVE SENDER (${twilioFrom})`;

  const summary = {
    oxxo_digitalfemsa: oxxoMode,
    card_conekta: cardMode,
    siprel_billpay: siprelMode,
    stp_spei_inbound: stpMode,
    twilio_whatsapp: twilioMode,
  };

  logger.info(summary, "[rail-mode] payment rail live/sandbox status");
  if (oxxoMode === "SANDBOX" || cardMode === "SANDBOX") {
    logger.error(summary, "[rail-mode] ⚠️ SANDBOX KEY DETECTED on a money rail — fix before accepting real users");
  }
}
