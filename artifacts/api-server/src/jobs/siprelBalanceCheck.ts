import cron from "node-cron";
import { siprelProvider } from "../billpay/services/router.js";
import { sendWhatsApp } from "../lib/whatsapp.js";
import { logger } from "../lib/logger.js";

const LOW_BALANCE_THRESHOLD = 2000;
const ALERT_COOLDOWN_MS = 6 * 60 * 60 * 1000; // max one alert per 6 hours
let lastAlertSentAt = 0;

async function checkSiprelBalance(): Promise<void> {
  // Skip entirely until SIPREL is live — balance is always $0 in dev/mock mode
  // and would spam alerts on every restart. Set STP_ENABLED=true to activate.
  if (process.env.STP_ENABLED !== "true") {
    logger.info("siprelBalanceCheck: STP_ENABLED not set — skipping");
    return;
  }

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
      const now = Date.now();
      if (now - lastAlertSentAt < ALERT_COOLDOWN_MS) {
        logger.info({ lowestBalance, nextAlertIn: Math.round((ALERT_COOLDOWN_MS - (now - lastAlertSentAt)) / 60000) + "min" },
          "siprelBalanceCheck: low balance but cooldown active — skipping alert");
        return;
      }
      lastAlertSentAt = now;
      const msg =
        `⚠️ Alerta PagoYa: Saldo SIPREL bajo — $${lowestBalance.toFixed(2)} MXN disponibles. ` +
        `Recarga necesaria para continuar procesando pagos.`;
      await sendWhatsApp(adminNumber, msg);
      logger.warn({ tiempoAire, pagoServicios }, "siprelBalanceCheck: low-balance alert sent");
    } else {
      // Reset cooldown when balance recovers so next dip alerts immediately
      lastAlertSentAt = 0;
    }
  } catch (err) {
    logger.error({ err }, "siprelBalanceCheck: failed to fetch SIPREL balance");
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
