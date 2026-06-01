import twilio from "twilio";
import { logger } from "./logger.js";

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN,
);

const rawFrom = process.env.TWILIO_WHATSAPP_FROM ?? "whatsapp:+14155238886";
const FROM = rawFrom.startsWith("whatsapp:") ? rawFrom : `whatsapp:${rawFrom}`;

export async function sendWhatsApp(to: string, body: string): Promise<void> {
  if (!process.env.TWILIO_ACCOUNT_SID) {
    logger.warn({ to, preview: body.slice(0, 60) }, "[WhatsApp] Twilio not configured — skipping");
    return;
  }

  let toFormatted: string;
  if (to.startsWith("whatsapp:")) {
    // Still strip spaces from the number portion
    toFormatted = "whatsapp:+" + to.replace(/^whatsapp:\+?/, "").replace(/\D/g, "");
  } else {
    toFormatted = "whatsapp:+" + to.replace(/\D/g, "");
  }

  try {
    await client.messages.create({ from: FROM, to: toFormatted, body });
    logger.info({ to: toFormatted }, "[WhatsApp] Sent");
  } catch (err) {
    logger.error({ err, to: toFormatted }, "[WhatsApp] Failed to send");
  }
}
