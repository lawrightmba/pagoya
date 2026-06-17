import { Router, type Request, type Response } from "express";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { sendWhatsApp } from "../lib/whatsapp.js";
import { logger } from "../lib/logger.js";

const router = Router();

// POST /api/complaints — receive a complaint from web or WhatsApp
router.post("/", async (req: Request, res: Response): Promise<void> => {
  const { user_id, channel = "web", complaint_text } = req.body as {
    user_id?: string;
    channel?: string;
    complaint_text?: string;
  };

  if (!complaint_text?.trim()) {
    res.status(400).json({ error: "complaint_text is required" });
    return;
  }

  try {
    const insertRes = await db.execute(sql`
      INSERT INTO complaint_log (user_id, channel, complaint_text, status, received_at)
      VALUES (${user_id ?? null}, ${channel}, ${complaint_text.trim()}, 'received', NOW())
      RETURNING id
    `);
    const complaintId = (insertRes.rows[0] as Record<string, unknown>).id;

    // Notify admin via WhatsApp (fire-and-forget)
    const adminNumber = process.env.ADMIN_WHATSAPP_NUMBER;
    if (adminNumber) {
      const preview = complaint_text.substring(0, 200);
      sendWhatsApp(
        adminNumber,
        `⚠️ *Nueva queja recibida en PagoYa*\n\nCanal: ${channel}\nUsuario: ${user_id ?? "Anónimo"}\nMensaje: ${preview}`,
      ).catch((err) => logger.error({ err }, "complaints: admin notify failed"));
    }

    logger.info({ complaintId, channel, user_id }, "complaints: received");
    res.status(201).json({ complaint_id: complaintId, status: "received" });
  } catch (err) {
    logger.error({ err }, "complaints: insert failed");
    res.status(500).json({ error: "Error al registrar queja" });
  }
});

export default router;
