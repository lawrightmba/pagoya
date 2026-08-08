import twilio from "twilio";
import { logger } from "./logger.js";

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN,
);

const rawFrom = process.env.TWILIO_WHATSAPP_FROM ?? "whatsapp:+14155238886";
const FROM = rawFrom.startsWith("whatsapp:") ? rawFrom : `whatsapp:${rawFrom}`;

// ─── Phone normalisation ───────────────────────────────────────────────────────
function formatTo(to: string): string {
  // Already prefixed by Twilio (e.g. "whatsapp:+521234567890")
  if (to.startsWith("whatsapp:")) {
    return "whatsapp:+" + to.replace(/^whatsapp:\+?/, "").replace(/\D/g, "");
  }
  // Canonical E.164 (e.g. "+521234567890" or "+17138052626") — strip non-digits, keep country code
  if (to.startsWith("+")) {
    return "whatsapp:+" + to.replace(/\D/g, "");
  }
  // Legacy: bare 10-digit Mexican number — kept for backward compat with any old caller
  const digits = to.replace(/\D/g, "");
  const withCountry = digits.length === 10 ? `52${digits}` : digits;
  return `whatsapp:+${withCountry}`;
}

// ─── Free-form message ─────────────────────────────────────────────────────────
// Use for replies within an active 24-hour session window.
export async function sendWhatsApp(to: string, body: string): Promise<void> {
  if (!process.env.TWILIO_ACCOUNT_SID) {
    logger.warn({ to, preview: body.slice(0, 60) }, "[WhatsApp] Twilio not configured — skipping");
    return;
  }

  const toFormatted = formatTo(to);

  try {
    await client.messages.create({ from: FROM, to: toFormatted, body });
    logger.info({ to: toFormatted }, "[WhatsApp] Sent");
  } catch (err) {
    logger.error({ err, to: toFormatted }, "[WhatsApp] Failed to send");
  }
}

// ─── Template message ──────────────────────────────────────────────────────────
// Required for business-initiated messages (OTPs, alerts, reminders) sent
// outside an active session window. contentSid comes from TWILIO_TEMPLATE_*
// env vars set after Meta approval. variables maps "1", "2", ... to values.
export async function sendWhatsAppTemplate(
  to: string,
  contentSid: string,
  variables: Record<string, string> = {},
): Promise<void> {
  if (!process.env.TWILIO_ACCOUNT_SID) {
    logger.warn({ to, contentSid }, "[WhatsApp] Twilio not configured — skipping template");
    return;
  }

  const toFormatted = formatTo(to);

  try {
    await client.messages.create({
      from: FROM,
      to: toFormatted,
      contentSid,
      contentVariables: JSON.stringify(variables),
    });
    logger.info({ to: toFormatted, contentSid }, "[WhatsApp] Template sent");
  } catch (err) {
    logger.error({ err, to: toFormatted, contentSid }, "[WhatsApp] Template send failed");
    throw err;
  }
}

// ─── Template SID helpers ──────────────────────────────────────────────────────
// Returns the approved template SID from env, or null if not yet configured.
export const templates = {
  otp: () => process.env.TWILIO_TEMPLATE_OTP ?? null,
  welcome: () => process.env.TWILIO_TEMPLATE_WELCOME ?? null,
  paymentConfirmation: () => process.env.TWILIO_TEMPLATE_PAYMENT_CONFIRMATION ?? null,
  billReminder: () => process.env.TWILIO_TEMPLATE_BILL_REMINDER ?? null,
  registerInterest: () => process.env.TWILIO_TEMPLATE_REGISTER_INTEREST ?? null,
};
