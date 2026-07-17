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

  const customerMsg =
    `✅ *¡Pago confirmado!*\n` +
    `📋 *${params.serviceName}* — $${params.monto.toFixed(2)} MXN\n` +
    `🔖 Folio: ${params.confirmationCode}\n\n` +
    `¿Qué más puedo hacer por ti?\n\n` +
    `1️⃣ Pagar otro servicio (CFE, Telmex, Izzi, agua…)\n` +
    `2️⃣ Enviar dinero a alguien\n` +
    `3️⃣ Recargar tiempo aire (Telcel, AT&T, Movistar)\n` +
    `🎁 Tarjetas de regalo o Netflix\n\n` +
    `Solo responde con el número o dime qué necesitas 👇`;

  const adminMsg =
    `✅ *PagoYa — Pago Confirmado*\n` +
    `Servicio: ${params.serviceName}\n` +
    `Monto: $${params.monto.toFixed(2)} MXN\n` +
    `Referencia: ${params.referencia}\n` +
    `Folio: ${params.confirmationCode}\n` +
    `Proveedor: ${params.provider.toUpperCase()}\n` +
    `Tel cliente: ${params.telefono}`;

  const cleanTel = params.telefono.replace(/\D/g, "");
  if (cleanTel) {
    await sendWhatsApp(cleanTel, customerMsg).catch((err) => {
      logger.warn({ number: cleanTel, err }, "billpay: WhatsApp customer receipt send failed (non-fatal)");
    });
  }

  if (adminNumber) {
    const cleanAdmin = adminNumber.replace(/\D/g, "");
    if (cleanAdmin && cleanAdmin !== cleanTel) {
      await sendWhatsApp(cleanAdmin, adminMsg).catch((err) => {
        logger.warn({ err }, "billpay: WhatsApp admin receipt send failed (non-fatal)");
      });
    }
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
