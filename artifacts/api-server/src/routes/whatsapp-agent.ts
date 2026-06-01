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
    `✅ Resumen de pago:\n\n` +
    `🏢 Servicio: ${pending.serviceName}` +
    referenciaLine +
    `\n💰 Monto: $${pending.monto.toFixed(2)} MXN` +
    `\n💳 Cargo total: ${feeNote}` +
    `\n👛 Método: ${pending.paymentMethod ?? "Cartera PagoYa"} (Saldo disponible: $${pending.walletBalance.toFixed(2)} MXN)\n\n` +
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
        await sendWhatsApp(
          phoneKey,
          `¡Hola ${profileName || ""}! Bienvenido/a a PagoYa 💜 ¿En qué te puedo ayudar?`,
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

        await sendWhatsApp(phoneKey, `⏳ Procesando tu pago de ${pending.serviceName}...`);

        const result = await executeStagedPayment(pending, port);

        // Delete regardless of outcome — prevents double-execution
        await deletePendingPayment(phoneKey);

        if (result.ok) {
          const folio = result.confirmationCode ? `\nFolio: ${result.confirmationCode}` : "";
          await sendWhatsApp(
            phoneKey,
            `✅ *Pago exitoso*\n\n⚡ ${pending.serviceName}\nMonto: $${pending.monto.toFixed(2)} MXN${folio}\n\n¡Listo! Guarda este folio como comprobante.`,
          );
        } else {
          await sendWhatsApp(
            phoneKey,
            `❌ *Pago no procesado*\n\n${result.error ?? "Error desconocido."}\n\nVerifica tu saldo o intenta de nuevo.`,
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
    await sendWhatsApp(
      phoneKey,
      "Lo siento, ocurrió un error. Intenta de nuevo en un momento. 🙏",
    ).catch(() => {});
  }
});

export default router;
