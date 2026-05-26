import { Router, type Request, type Response } from "express";
import { sendWhatsApp } from "../lib/whatsapp.js";
import { getSession, saveSession } from "../services/whatsapp-sessions.js";
import { logger } from "../lib/logger.js";

const router = Router();

const REP_CODE_PATTERN = /\b([A-Z]{2,4}-\d{2})\b/i;

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

    // ── Rep-code detection (first message only) ──────────────────────────────
    if (!session.repCode) {
      const match = REP_CODE_PATTERN.exec(userMessage);
      if (match) {
        saveSession(phoneKey, { repCode: match[1], profileName });
        // Welcome message — do not forward the raw rep-code string to the agent
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

    // ── Append user turn to history ──────────────────────────────────────────
    const updatedHistory = [
      ...session.conversationHistory,
      { role: "user" as const, content: userMessage },
    ];

    // ── Call existing /api/agent/chat on localhost ───────────────────────────
    const port = process.env.PORT ?? "3000";
    const agentRes = await fetch(`http://localhost:${port}/api/agent/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: userMessage,
        telefono: `+${phoneKey}`,
        history: session.conversationHistory,
      }),
    });

    if (!agentRes.ok) {
      throw new Error(`agent/chat returned ${agentRes.status}`);
    }

    const { reply } = (await agentRes.json()) as { reply: string; escalated: boolean };

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

    logger.info({ phoneKey }, "whatsapp-agent: reply sent");
  } catch (err) {
    logger.error({ err }, "whatsapp-agent: error");
    await sendWhatsApp(
      phoneKey,
      "Lo siento, ocurrió un error. Intenta de nuevo en un momento. 🙏",
    ).catch(() => {});
  }
});

export default router;
