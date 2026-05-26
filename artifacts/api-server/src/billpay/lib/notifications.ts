import { logger } from "../../lib/logger.js";
import { sendWhatsApp } from "../../lib/whatsapp.js";

const SALDO_LOW_THRESHOLD = 500;

export async function sendWhatsAppReceipt(params: {
  telefono: string;
  serviceName: string;
  monto: number;
  referencia: string;
  confirmationCode: string;
  provider: string;
}): Promise<void> {
  const adminNumber = process.env.ADMIN_WHATSAPP_NUMBER;

  const msg =
    `✅ *PagoYa — Pago Confirmado*\n` +
    `Servicio: ${params.serviceName}\n` +
    `Monto: $${params.monto.toFixed(2)} MXN\n` +
    `Referencia: ${params.referencia}\n` +
    `Folio: ${params.confirmationCode}\n` +
    `Proveedor: ${params.provider.toUpperCase()}\n` +
    `Tel cliente: ${params.telefono}\n\n` +
    `¿Tienes dudas o necesitas algo más? Responde aquí y Paula, nuestra asistente, te ayuda al instante 💬`;

  const targets: string[] = [];

  const cleanTel = params.telefono.replace(/\D/g, "");
  if (cleanTel) targets.push(cleanTel);

  if (adminNumber) {
    const cleanAdmin = adminNumber.replace(/\D/g, "");
    if (cleanAdmin && cleanAdmin !== cleanTel) targets.push(cleanAdmin);
  }

  for (const number of targets) {
    await sendWhatsApp(number, msg).catch((err) => {
      logger.warn({ number, err }, "billpay: WhatsApp receipt send failed (non-fatal)");
    });
  }
}

export async function sendLowSaldoAlert(balance: number): Promise<void> {
  const adminNumber = process.env.ADMIN_WHATSAPP_NUMBER;
  if (!adminNumber) return;

  const msg =
    `⚠️ *PagoYa — Saldo SIPREL Bajo*\n` +
    `Saldo actual: $${balance.toFixed(2)} MXN\n` +
    `Umbral mínimo: $${SALDO_LOW_THRESHOLD} MXN\n` +
    `Acción requerida: recargar saldo SIPREL para continuar procesando pagos.`;

  const cleanAdmin = adminNumber.replace(/\D/g, "");
  await sendWhatsApp(cleanAdmin, msg).catch((err) => {
    logger.warn({ err }, "billpay: low saldo alert send failed (non-fatal)");
  });
  logger.warn({ balance }, "billpay: low saldo alert sent to admin");
}

export { SALDO_LOW_THRESHOLD };
