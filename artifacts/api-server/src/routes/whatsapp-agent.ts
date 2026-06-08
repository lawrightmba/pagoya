import { Router, type Request, type Response } from "express";
import { sendWhatsApp } from "../lib/whatsapp.js";
import { getSession, saveSession } from "../services/whatsapp-sessions.js";
import {
  createPendingPayment,
  getPendingPayment,
  confirmPendingPayment,
  deletePendingPayment,
  type PendingPaymentRow,
} from "../services/pendingPaymentService.js";
import { logger } from "../lib/logger.js";

const router = Router();

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Map SIPREL/billpay raw error strings → plain Spanish cause line for users.
 * Matches on the error-code labels embedded in thrown messages.
 */
function mapSiprelError(error: string, serviceName: string): string {
  const e = error.toUpperCase();
  // Wallet pre-check — insufficient balance
  if (e.includes("INSUFFICIENT_BALANCE") || e.includes("SALDO INSUFICIENTE")) {
    return "Tu cartera PagoYa no tiene saldo suficiente. Carga saldo y vuelve a intentar.";
  }
  // SIPREL error 2 — CFE / biller account not found
  if (e.includes("DESTINATION_UNAVAILABLE")) {
    return `No encontramos esa cuenta en ${serviceName}. Verifica tu número de contrato e intenta de nuevo.`;
  }
  // SIPREL error 1 — phone number rejected
  if (e.includes("INVALID_PHONE")) {
    return "El número de teléfono no es válido para este servicio. Verifica e intenta de nuevo.";
  }
  // SIPREL error 4 — line inactive
  if (e.includes("INACTIVE_LINE")) {
    return `La línea o cuenta en ${serviceName} aparece inactiva. Contacta directamente a ${serviceName}.`;
  }
  // SIPREL errors 3/5/6/8 — carrier / internal timeout
  if (e.includes("NO_CARRIER_RESPONSE") || e.includes("INTERNAL_TIMEOUT") || e.includes("AUTHORIZER_UNAVAILABLE")) {
    return `${serviceName} no respondió a tiempo. Tu pago no fue aplicado. Intenta de nuevo en unos minutos.`;
  }
  // SIPREL error 7/3129 — transaction table full
  if (e.includes("TRANSACTION_TABLE_FULL")) {
    return "El sistema de pagos está saturado temporalmente. Intenta de nuevo en 2–3 minutos.";
  }
  // SERVICE_WEB error 403 — bad credentials (admin alert fires separately)
  if (e.includes("INVALID_CREDENTIALS")) {
    return "Error de configuración interno. Ya notificamos a soporte. Intenta más tarde.";
  }
  // SIPREL error 3133 — product/SKU not found
  if (e.includes("PRODUCT_NOT_FOUND") || e.includes("SKU_PENDING") || e.includes("SKU_NOT_CONFIGURED")) {
    return `El servicio ${serviceName} no está disponible en este momento. Contáctanos para soporte.`;
  }
  // 60-second polling timeout (timedOut path returns success:true / status:"pending", handled separately)
  if (e.includes("TIMED OUT") || e.includes("TIMEOUT") || e.includes("60 S")) {
    return "SIPREL tardó demasiado en confirmar. Es posible que el pago esté en proceso — espera 5 min y revisa tu historial antes de reintentar.";
  }
  // Network / fetch error
  if (e.includes("NETWORK") || e.includes("FETCH") || e.includes("CONEXIÓN") || e.includes("CONNECTION")) {
    return "Error de conexión al procesar. Intenta de nuevo en unos segundos.";
  }
  return "Error técnico al procesar el pago. Tu cartera no fue afectada.";
}

const REP_CODE_PATTERN = /\b([A-Z]{2,4}-\d{2})\b/i;

// Strict confirmation: only SÍ / SI / si / sí / yes (+ optional punctuation/emoji)
const STRICT_CONFIRM_PATTERN = /^(s[ií]|yes)\s*[!.🙏👍✅]*$/i;

// Strict cancellation: CANCELAR / cancel / no / nop / nope (+ optional punctuation/emoji)
const STRICT_CANCEL_PATTERN = /^(cancelar?|cancel|no|nop|nope)\s*[!.❌]*$/i;

async function executeStagedPayment(
  pending: PendingPaymentRow,
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
    logger.error({ err }, "whatsapp-agent: executeStagedPayment failed");
    return { ok: false, error: "Error de conexión al procesar el pago." };
  }
}

/** Build the structured confirmation message per spec. */
function buildConfirmationMessage(pending: PendingPaymentRow): string {
  const total = pending.monto + pending.fee;
  const feeNote = pending.fee > 0
    ? `$${total.toFixed(2)} MXN (incluye comisión $${pending.fee.toFixed(0)})`
    : `$${total.toFixed(2)} MXN (sin comisión 🎁)`;

  const referenciaLine = pending.referencia && pending.referencia !== pending.telefono
    ? `\n📋 Referencia: ${pending.referencia}`
    : "";

  return (
    `✅ Resumen de pago:\n` +
    `──────────────────\n` +
    `🏢 Servicio: ${pending.serviceName}` +
    referenciaLine +
    `\n💰 Monto: $${pending.monto.toFixed(2)} MXN` +
    `\n💳 Cargo total: ${feeNote}` +
    `\n👛 Método: ${pending.paymentMethod ?? "Cartera PagoYa"} (Saldo: $${pending.walletBalance.toFixed(2)} MXN)` +
    `\n🏦 Red de pago: SIPREL / STP` +
    `\n──────────────────\n\n` +
    `¿Confirmar este pago?\n` +
    `Responde *SÍ* para continuar o *CANCELAR* para cancelar.`
  );
}

router.post("/", async (req: Request, res: Response) => {
  const body = req.body as Record<string, string>;
  const userMessage: string = body.Body ?? "";
  const from: string = body.From ?? "";
  const profileName: string = body.ProfileName ?? "";
  const rawWaId: string = body.WaId ?? from;

  // Normalise: strip "whatsapp:+" prefix, keep digits only → session key + reply target
  const phoneKey = rawWaId.replace(/^whatsapp:\+?/i, "").replace(/\D/g, "");

  console.log(
    `[${new Date().toISOString()}] whatsapp-agent inbound | phone=${phoneKey} | msg="${userMessage.slice(0, 50)}"`,
  );

  // Always return empty TwiML immediately so Twilio never retries
  res.set("Content-Type", "text/xml");
  res.send('<?xml version="1.0" encoding="UTF-8"?><Response/>');

  // ── Process async after responding to Twilio ───────────────────────────────
  try {
    const session = getSession(phoneKey);
    const port = process.env.PORT ?? "3000";

    // ── Rep-code detection (first message only) ──────────────────────────────
    if (!session.repCode) {
      const match = REP_CODE_PATTERN.exec(userMessage);
      if (match) {
        saveSession(phoneKey, { repCode: match[1], profileName });
        const firstName = (profileName || "").split(" ")[0] || profileName || "";
        await sendWhatsApp(
          phoneKey,
          `¡Hola ${firstName}! Bienvenido/a a PagoYa 👋\n` +
          `Soy Paula, la asistente oficial de PagoYa Technologies — empresa mexicana de pagos digitales.\n\n` +
          `¿En qué te puedo ayudar hoy?\n` +
          `Escribe *PAGAR* para pagar un servicio, o *SALDO* para consultar tu cartera.`,
        );
        return;
      }
    }

    // Save profileName on first real message if not yet stored
    if (!session.profileName && profileName) {
      saveSession(phoneKey, { profileName });
    }

    // ── Pending payment confirmation intercept (DB-backed, restart-safe) ─────
    const pending = await getPendingPayment(phoneKey);

    if (pending && pending.status === "awaiting_confirmation") {
      const msgNorm = userMessage.trim();

      if (STRICT_CANCEL_PATTERN.test(msgNorm)) {
        console.log(`[Paula] Payment confirmation: cancelled | biller: ${pending.serviceName} | amount: ${pending.monto} | userId: ${pending.telefono}`);
        await deletePendingPayment(phoneKey);
        await sendWhatsApp(phoneKey, "❌ Pago cancelado. ¿En qué más te puedo ayudar?");
        return;
      }

      if (STRICT_CONFIRM_PATTERN.test(msgNorm)) {
        console.log(`[Paula] Payment confirmation: confirmed | biller: ${pending.serviceName} | amount: ${pending.monto} | userId: ${pending.telefono}`);

        // Reset TTL to 5 minutes from now (spec: TTL starts from SÍ)
        await confirmPendingPayment(phoneKey);

        // Start payment immediately — narration runs in parallel
        const paymentPromise = executeStagedPayment(pending, port);
        let paymentDone = false;
        void paymentPromise.finally(() => { paymentDone = true; });

        // Message 1 — always shown at t=0
        await sendWhatsApp(phoneKey, `⏳ Conectando con ${pending.serviceName}...`);

        // Message 2 — shown at t≈6 s if still processing
        await sleep(6_000);
        if (!paymentDone) {
          await sendWhatsApp(phoneKey, `🔄 Enviando tu pago a través de SIPREL / STP...`);
        }

        // Message 3 — "seguimos procesando" fallback at t≈16 s (slow Telcel / SIPREL retry)
        await sleep(10_000);
        if (!paymentDone) {
          await sendWhatsApp(
            phoneKey,
            `⏱️ Seguimos procesando tu pago con ${pending.serviceName}.\n` +
            `SIPREL está confirmando con la red STP. Un momento más.`,
          );
        }

        const result = await paymentPromise;

        // Delete regardless of outcome — prevents double-execution
        await deletePendingPayment(phoneKey);

        const nowMx = new Date().toLocaleString("es-MX", {
          timeZone: "America/Mexico_City",
          day: "2-digit", month: "short", year: "numeric",
          hour: "2-digit", minute: "2-digit",
        });

        if (result.ok) {
          const folio = result.confirmationCode ?? "—";
          await sendWhatsApp(
            phoneKey,
            `✅ *PagoYa | Comprobante Oficial*\n` +
            `──────────────────\n` +
            `Servicio: ${pending.serviceName}\n` +
            `Monto: $${pending.monto.toFixed(2)} MXN\n` +
            `Comisión: $${pending.fee.toFixed(2)} MXN\n` +
            `Folio SIPREL: ${folio}\n` +
            `Fecha: ${nowMx}\n` +
            `──────────────────\n` +
            `Tu pago está respaldado por STP/SPEI — sistema de pagos del Banco de México.\n` +
            `Conserva este mensaje como comprobante oficial.`,
          );
        } else {
          const incCode = `ERR-${Date.now().toString(36).toUpperCase().slice(-8)}`;
          await sendWhatsApp(
            phoneKey,
            `❌ *PagoYa | Pago No Procesado*\n` +
            `──────────────────\n` +
            `Servicio: ${pending.serviceName}\n` +
            `Monto: $${pending.monto.toFixed(2)} MXN\n` +
            `Estado: No completado\n` +
            `Código: ${incCode}\n` +
            `──────────────────\n` +
            `⚠️ Tu dinero NO fue deducido de tu cartera.\n` +
            `Saldo actual: $${pending.walletBalance.toFixed(2)} MXN ✓\n` +
            `Causa: ${mapSiprelError(result.error ?? "", pending.serviceName)}\n\n` +
            `Escribe *AYUDA* para hablar con soporte, o intenta de nuevo.`,
          );
        }
        return;
      }

      // Ambiguous response — loop back to confirmation prompt
      await sendWhatsApp(
        phoneKey,
        "Por favor responde *SÍ* para confirmar o *CANCELAR* para cancelar el pago.",
      );
      return;
    }

    // ── Append user turn to history ──────────────────────────────────────────
    const updatedHistory = [
      ...session.conversationHistory,
      { role: "user" as const, content: userMessage },
    ];

    // ── Call existing /api/agent/chat on localhost ───────────────────────────
    const agentRes = await fetch(`http://localhost:${port}/api/agent/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: userMessage,
        telefono: `+${phoneKey}`,
        history: session.conversationHistory,
        profileName: session.profileName ?? profileName ?? null,
      }),
    });

    if (!agentRes.ok) {
      throw new Error(`agent/chat returned ${agentRes.status}`);
    }

    const { reply, pendingPayment } = (await agentRes.json()) as {
      reply: string;
      escalated: boolean;
      pendingPayment: {
        serviceId: string;
        serviceName: string;
        referencia: string;
        monto: number;
        telefono: string;
        fee: number;
        walletBalance: number;
        paymentMethod: string;
      } | null;
    };

    // ── Persist updated conversation history ─────────────────────────────────
    const newHistory = [
      ...updatedHistory,
      { role: "assistant" as const, content: reply },
    ];
    saveSession(phoneKey, {
      conversationHistory: newHistory.slice(-20),
    });

    if (pendingPayment) {
      // Persist pending payment to DB (awaiting_confirmation, 30-min TTL)
      await createPendingPayment(phoneKey, {
        serviceId:     pendingPayment.serviceId,
        serviceName:   pendingPayment.serviceName,
        referencia:    pendingPayment.referencia,
        monto:         pendingPayment.monto,
        telefono:      pendingPayment.telefono,
        fee:           pendingPayment.fee ?? 25,
        walletBalance: pendingPayment.walletBalance ?? 0,
        paymentMethod: pendingPayment.paymentMethod ?? "Cartera PagoYa",
      });

      // Fetch the staged row to build the structured message
      const staged = await getPendingPayment(phoneKey);
      if (staged) {
        // Send the structured confirmation message (replaces Paula's confirmText)
        await sendWhatsApp(phoneKey, buildConfirmationMessage(staged));
      } else {
        // Fallback: send Paula's reply
        await sendWhatsApp(phoneKey, reply);
      }
    } else {
      // No pending payment — send Paula's reply normally
      await sendWhatsApp(phoneKey, reply);
    }

    logger.info({ phoneKey, hasPendingPayment: !!pendingPayment }, "whatsapp-agent: reply sent");
  } catch (err) {
    logger.error({ err }, "whatsapp-agent: error");
    const incCode = `INC-${Date.now().toString(36).toUpperCase().slice(-8)}`;
    await sendWhatsApp(
      phoneKey,
      `Lo siento, algo salió mal en este momento.\n` +
      `Código de incidencia: ${incCode}\n` +
      `Tu saldo no fue afectado.\n\n` +
      `Escribe *AYUDA* o visita pagoyamx.com para soporte.`,
    ).catch(() => {});
  }
});

export default router;
