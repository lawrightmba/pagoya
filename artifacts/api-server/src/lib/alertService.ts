import nodemailer from "nodemailer";
import { logger } from "./logger.js";

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;
  return nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT ?? "587"),
    secure: process.env.SMTP_SECURE === "true",
    auth: { user, pass },
  });
}

const ALERT_TO = process.env.ALERT_EMAIL ?? process.env.SMTP_USER ?? "";
const ALERT_FROM = process.env.SMTP_USER ?? "alerts@pagoyamx.com";

async function send(subject: string, text: string): Promise<void> {
  if (!ALERT_TO) {
    logger.warn({ subject }, "[alert] ALERT_EMAIL not set — skipping");
    return;
  }
  const transport = getTransporter();
  if (!transport) {
    logger.warn({ subject }, "[alert] SMTP not configured (SMTP_HOST/USER/PASS) — skipping");
    return;
  }
  try {
    await transport.sendMail({ from: ALERT_FROM, to: ALERT_TO, subject, text });
    logger.info({ subject, to: ALERT_TO }, "[alert] sent");
  } catch (err) {
    logger.error({ err, subject }, "[alert] send failed");
  }
}

export async function alertSignup(params: {
  telefono: string;
  source: string;
  isTest: boolean;
  timestamp: Date;
}): Promise<void> {
  const last4 = params.telefono.slice(-4);
  const testFlag = params.isTest ? " [TEST ACCOUNT]" : "";
  await send(
    `[PagoYa] New signup — ***${last4}${testFlag}`,
    [
      `New user registered on PagoYa.`,
      ``,
      `Phone (last 4): ***${last4}`,
      `Source:         ${params.source}`,
      `Test account:   ${params.isTest}`,
      `Timestamp:      ${params.timestamp.toISOString()}`,
      ``,
      `Admin: https://pagoyamx.com (Command Center → Usuarios)`,
    ].join("\n"),
  );
}

export async function alertPayment(params: {
  telefono: string;
  amountMxn: number;
  method: string;
  status: string;
  reference?: string;
  timestamp: Date;
}): Promise<void> {
  const last4 = params.telefono.slice(-4);
  await send(
    `[PagoYa] Payment ${params.status} — $${params.amountMxn} MXN via ${params.method}`,
    [
      `Payment event on PagoYa.`,
      ``,
      `Phone (last 4): ***${last4}`,
      `Amount:         $${params.amountMxn.toFixed(2)} MXN`,
      `Method:         ${params.method}`,
      `Status:         ${params.status}`,
      `Reference:      ${params.reference ?? "n/a"}`,
      `Timestamp:      ${params.timestamp.toISOString()}`,
    ].join("\n"),
  );
}

export async function alertDispute(params: {
  chargeId: string;
  paymentIntentId?: string;
  amountMxn?: number;
  reason?: string;
  status?: string;
  timestamp: Date;
  stripeMode: "test" | "live";
}): Promise<void> {
  const modeWarning = params.stripeMode === "test"
    ? "\n⚠️  STRIPE TEST MODE — this is a simulated dispute, no real money at risk."
    : "\n🚨 LIVE MODE DISPUTE — real funds may be withdrawn within 48h. Log in to Stripe immediately.";
  await send(
    `[PagoYa] ⚠️ Stripe dispute opened — ${params.chargeId}`,
    [
      `A Stripe dispute (chargeback) has been opened.`,
      modeWarning,
      ``,
      `Charge ID:        ${params.chargeId}`,
      `Payment Intent:   ${params.paymentIntentId ?? "n/a"}`,
      `Amount:           ${params.amountMxn != null ? `$${params.amountMxn.toFixed(2)} MXN` : "unknown"}`,
      `Reason:           ${params.reason ?? "unknown"}`,
      `Status:           ${params.status ?? "unknown"}`,
      `Timestamp:        ${params.timestamp.toISOString()}`,
      ``,
      `Stripe Dashboard: https://dashboard.stripe.com/disputes`,
      `Respond by:       Check dashboard — typically 7-21 days from opening.`,
    ].join("\n"),
  );
}
