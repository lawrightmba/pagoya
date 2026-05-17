import cron from "node-cron";
import { siprelProvider } from "../billpay/services/router.js";
import { sendWhatsApp } from "../lib/whatsapp.js";
import { logger } from "../lib/logger.js";

const LOW_BALANCE_THRESHOLD = 2000;

async function checkSiprelBalance(): Promise<void> {
  const adminNumber = process.env.ADMIN_WHATSAPP_NUMBER;
  if (!adminNumber) {
    logger.warn("siprelBalanceCheck: ADMIN_WHATSAPP_NUMBER not set, skipping alert");
    return;
  }

  try {
    const { tiempoAire, pagoServicios } = await siprelProvider.getSaldoBalance();
    const lowestBalance = Math.min(tiempoAire, pagoServicios);

    logger.info({ tiempoAire, pagoServicios }, "siprelBalanceCheck: balance fetched");

    if (lowestBalance < LOW_BALANCE_THRESHOLD) {
      const msg =
        `⚠️ Alerta PagoYa: Saldo SIPREL bajo — $${lowestBalance.toFixed(2)} MXN disponibles. ` +
        `Recarga necesaria para continuar procesando pagos.`;
      await sendWhatsApp(adminNumber, msg);
      logger.warn({ tiempoAire, pagoServicios }, "siprelBalanceCheck: low-balance alert sent");
    }
  } catch (err) {
    logger.error({ err }, "siprelBalanceCheck: failed to fetch SIPREL balance");

    const adminNumber = process.env.ADMIN_WHATSAPP_NUMBER;
    if (adminNumber) {
      await sendWhatsApp(
        adminNumber,
        "🔴 PagoYa: No se pudo verificar el saldo de SIPREL. Revisar credenciales o conexión.",
      ).catch((sendErr) =>
        logger.error({ sendErr }, "siprelBalanceCheck: failed to send error alert"),
      );
    }
  }
}

const task = cron.schedule(
  "0 * * * *",
  () => {
    checkSiprelBalance().catch((err) =>
      logger.error({ err }, "siprelBalanceCheck: uncaught error"),
    );
  },
  { scheduled: false },
);

export const siprelBalanceCheck = {
  start(): void {
    task.start();
    logger.info("siprelBalanceCheck: job scheduled (every 60 min)");
  },
};
