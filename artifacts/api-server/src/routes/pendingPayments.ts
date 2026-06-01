import { Router, type Request, type Response } from "express";
import {
  getPendingPayment,
  confirmPendingPayment,
  deletePendingPayment,
} from "../services/pendingPaymentService.js";
import { logger } from "../lib/logger.js";

const router = Router();

/** Normalise a telefono string to digits-only phone key (same as whatsapp-agent). */
function toPhoneKey(telefono: string): string {
  return telefono.replace(/\D/g, "");
}

async function executeStagedPayment(
  pending: { serviceId: string; referencia: string; monto: number; telefono: string },
  port: string,
): Promise<{ ok: boolean; confirmationCode?: string; error?: string }> {
  try {
    const resp = await fetch(`http://localhost:${port}/api/bills/pay`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serviceId: pending.serviceId,
        referencia: pending.referencia,
        monto: pending.monto,
        telefono: pending.telefono,
        paymentSource: "wallet",
      }),
    });
    const data = (await resp.json()) as { success?: boolean; confirmationCode?: string; error?: string };
    if (!resp.ok || !data.success) {
      return { ok: false, error: data.error ?? "Error al procesar el pago." };
    }
    return { ok: true, confirmationCode: data.confirmationCode };
  } catch (err) {
    logger.error({ err }, "pendingPayments: executeStagedPayment failed");
    return { ok: false, error: "Error de conexión al procesar el pago." };
  }
}

/**
 * POST /api/bills/pending/confirm
 * Body: { telefono: string }
 * Called by the web overlay confirmation card when user clicks "Confirmar pago".
 */
router.post("/confirm", async (req: Request, res: Response) => {
  const { telefono } = req.body as { telefono?: string };
  if (!telefono) {
    res.status(400).json({ error: "telefono requerido" });
    return;
  }

  const phoneKey = toPhoneKey(telefono);
  const port = process.env.PORT ?? "3000";

  try {
    const pending = await getPendingPayment(phoneKey);
    if (!pending) {
      res.status(404).json({ error: "No hay pago pendiente activo." });
      return;
    }

    console.log(`[Paula] Payment confirmation: confirmed | biller: ${pending.serviceName} | amount: ${pending.monto} | userId: ${pending.telefono}`);

    await confirmPendingPayment(phoneKey);

    const result = await executeStagedPayment(pending, port);

    // Always delete after execution attempt — prevents stale 'confirmed' rows
    await deletePendingPayment(phoneKey);

    if (result.ok) {
      logger.info({ phoneKey, serviceName: pending.serviceName, monto: pending.monto }, "pendingPayments: web confirm success");
      res.json({ success: true, confirmationCode: result.confirmationCode });
    } else {
      logger.warn({ phoneKey, error: result.error }, "pendingPayments: web confirm execution failed");
      res.status(422).json({ success: false, error: result.error });
    }
  } catch (err) {
    logger.error({ err, phoneKey }, "pendingPayments: confirm endpoint failed");
    res.status(500).json({ error: "Error al confirmar el pago." });
  }
});

/**
 * POST /api/bills/pending/cancel
 * Body: { telefono: string }
 * Called by the web overlay confirmation card when user clicks "Cancelar".
 */
router.post("/cancel", async (req: Request, res: Response) => {
  const { telefono } = req.body as { telefono?: string };
  if (!telefono) {
    res.status(400).json({ error: "telefono requerido" });
    return;
  }

  const phoneKey = toPhoneKey(telefono);

  try {
    const pending = await getPendingPayment(phoneKey);
    const billerName = pending?.serviceName ?? "desconocido";
    const amount = pending?.monto ?? 0;

    console.log(`[Paula] Payment confirmation: cancelled | biller: ${billerName} | amount: ${amount} | userId: ${telefono}`);

    await deletePendingPayment(phoneKey);
    logger.info({ phoneKey }, "pendingPayments: web cancel");
    res.json({ success: true });
  } catch (err) {
    logger.error({ err, phoneKey }, "pendingPayments: cancel endpoint failed");
    res.status(500).json({ error: "Error al cancelar el pago." });
  }
});

/**
 * GET /api/bills/pending?telefono=...
 * Returns the active pending payment for a user, or null.
 * Used by the web overlay to restore state on page reload.
 */
router.get("/", async (req: Request, res: Response) => {
  const telefono = (req.query.telefono as string | undefined)?.trim();
  if (!telefono) {
    res.status(400).json({ error: "telefono requerido" });
    return;
  }

  const phoneKey = toPhoneKey(telefono);

  try {
    const pending = await getPendingPayment(phoneKey);
    res.json({ pending: pending ?? null });
  } catch (err) {
    logger.error({ err, phoneKey }, "pendingPayments: GET failed");
    res.status(500).json({ error: "Error al consultar pago pendiente." });
  }
});

export default router;
