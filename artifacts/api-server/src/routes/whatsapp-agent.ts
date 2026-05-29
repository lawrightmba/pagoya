import { Router, type Request, type Response } from "express";
import { sendWhatsApp } from "../lib/whatsapp.js";
import { getSession, saveSession } from "../services/whatsapp-sessions.js";
import {
  createPendingPayment,
  getPendingPayment,
  deletePendingPayment,
  type PendingPaymentRow,
} from "../services/pendingPaymentService.js";
import { logger } from "../lib/logger.js";

const router = Router();

const REP_CODE_PATTERN = /\b([A-Z]{2,4}-\d{2})\b/i;
const CONFIRMATION_PATTERN = /^(s[ií]|yes|confirm(ar)?|confirmo|ok|dale|va|órale|o?rale|andale|ándale|claro|adelante|listo|perfecto|sim[oó]n|sip|proceed|go ahead|estuvo|va que va|le doy|por favor|s[ií] por favor)\s*[!.🙏👍✅]*$/i;
const CANCELLATION_PATTERN = /^(no|cancelar?|cancela|nop|nope|mejor no|nel|nope|para|stop)\s*[!.❌]*$/i;

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

    // ── Pending payment 2FA intercept (DB-backed, restart-safe) ──────────────
    const pending = await getPendingPayment(phoneKey);

    if (pending) {
      const msgNorm = userMessage.trim();

      if (CANCELLATION_PATTERN.test(msgNorm)) {
        await deletePendingPayment(phoneKey);
        await sendWhatsApp(phoneKey, "❌ Pago cancelado. ¿En qué más te puedo ayudar?");
        return;
      }

      if (CONFIRMATION_PATTERN.test(msgNorm)) {
        await deletePendingPayment(phoneKey);
        await sendWhatsApp(phoneKey, `⏳ Procesando tu pago de ${pending.serviceName}...`);

        const result = await executeStagedPayment(pending, port);

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
      // Not a yes/no — fall through to normal agent, pending row stays in DB
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
      pendingPayment: { serviceId: string; serviceName: string; referencia: string; monto: number; telefono: string } | null;
    };

    // ── Persist pending payment to DB if agent staged one ────────────────────
    if (pendingPayment) {
      await createPendingPayment(phoneKey, pendingPayment);
    }

    // ── Persist updated conversation history ─────────────────────────────────
    const newHistory = [
      ...updatedHistory,
      { role: "assistant" as const, content: reply },
    ];
    // Keep last 20 turns to avoid unbounded growth
    saveSession(phoneKey, {
      conversationHistory: newHistory.slice(-20),
    });

    // ── Send reply via WhatsApp ───────────────────────────────────────────────
    await sendWhatsApp(phoneKey, reply);

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
