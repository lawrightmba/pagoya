import { Router, type Request, type Response } from "express";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { sendWhatsApp } from "../lib/whatsapp.js";
import { logger } from "../lib/logger.js";

const router = Router();

function checkAdmin(req: Request): boolean {
  const key = (req.headers["x-admin-key"] as string) ?? (req.query.adminKey as string) ?? "";
  const valid = process.env.ADMIN_TOKEN ?? process.env.ADMIN_SECRET_KEY ?? "";
  return key === valid && valid.length > 0;
}

function generateTicketRef(id: number): string {
  return "PY-" + String(id).padStart(5, "0");
}

// POST /api/complaints — submit a support ticket
router.post("/", async (req: Request, res: Response): Promise<void> => {
  const { user_id, channel = "web", complaint_text, telefono, category = "otro" } = req.body as {
    user_id?: string;
    channel?: string;
    complaint_text?: string;
    telefono?: string;
    category?: string;
  };

  if (!complaint_text?.trim()) {
    res.status(400).json({ error: "complaint_text is required" });
    return;
  }

  const VALID_CATEGORIES = ["pagos", "saldo", "cuenta", "bono", "otro"];
  const cat = VALID_CATEGORIES.includes(category) ? category : "otro";
  const tel = telefono?.replace(/\D/g, "").slice(-10) || null;

  try {
    const insertRes = await db.execute(sql`
      INSERT INTO complaint_log (user_id, channel, complaint_text, status, received_at, telefono, category)
      VALUES (${user_id ?? null}, ${channel}, ${complaint_text.trim()}, 'recibido', NOW(), ${tel}, ${cat})
      RETURNING id
    `);
    const id = (insertRes.rows[0] as Record<string, unknown>).id as number;
    const ticketRef = generateTicketRef(id);

    await db.execute(sql`
      UPDATE complaint_log SET ticket_ref = ${ticketRef} WHERE id = ${id}
    `);

    const adminNumber = process.env.ADMIN_WHATSAPP_NUMBER;
    if (adminNumber) {
      const preview = complaint_text.substring(0, 200);
      sendWhatsApp(
        adminNumber,
        `⚠️ *Nuevo ticket ${ticketRef}*\nCanal: ${channel}\nCategoría: ${cat}\nTeléfono: ${tel ?? "—"}\nMensaje: ${preview}`,
      ).catch((err) => logger.error({ err }, "complaints: admin notify failed"));
    }

    logger.info({ id, ticketRef, channel, cat }, "complaints: created");
    res.status(201).json({ ticket_ref: ticketRef, status: "recibido" });
  } catch (err) {
    logger.error({ err }, "complaints: insert failed");
    res.status(500).json({ error: "Error al registrar ticket" });
  }
});

// GET /api/complaints/my/:telefono — user sees their own tickets
router.get("/my/:telefono", async (req: Request, res: Response): Promise<void> => {
  const raw = req.params.telefono?.replace(/\D/g, "").slice(-10);
  if (!raw || raw.length < 7) {
    res.status(400).json({ error: "telefono inválido" });
    return;
  }
  try {
    const r = await db.execute(sql`
      SELECT ticket_ref, category, status, complaint_text, admin_response, received_at, admin_responded_at
      FROM complaint_log
      WHERE telefono = ${raw}
      ORDER BY received_at DESC
      LIMIT 20
    `);
    res.json({ tickets: r.rows });
  } catch (err) {
    logger.error({ err }, "complaints/my: query failed");
    res.status(500).json({ error: "Error al consultar tickets" });
  }
});

// GET /api/complaints/admin — list all tickets (admin)
router.get("/admin", async (req: Request, res: Response): Promise<void> => {
  if (!checkAdmin(req)) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { status, limit = "50", offset = "0" } = req.query as Record<string, string>;
  const lim = Math.min(parseInt(limit) || 50, 200);
  const off = parseInt(offset) || 0;
  try {
    let dataQuery: Awaited<ReturnType<typeof db.execute>>;
    let countQuery: Awaited<ReturnType<typeof db.execute>>;
    if (status) {
      dataQuery = await db.execute(sql`
        SELECT id, ticket_ref, category, channel, status, complaint_text, telefono,
               admin_response, received_at, admin_responded_at, whatsapp_sent
        FROM complaint_log WHERE status = ${status}
        ORDER BY received_at DESC LIMIT ${lim} OFFSET ${off}
      `);
      countQuery = await db.execute(sql`SELECT COUNT(*)::int AS n FROM complaint_log WHERE status = ${status}`);
    } else {
      dataQuery = await db.execute(sql`
        SELECT id, ticket_ref, category, channel, status, complaint_text, telefono,
               admin_response, received_at, admin_responded_at, whatsapp_sent
        FROM complaint_log
        ORDER BY received_at DESC LIMIT ${lim} OFFSET ${off}
      `);
      countQuery = await db.execute(sql`SELECT COUNT(*)::int AS n FROM complaint_log`);
    }
    const total = Number((countQuery.rows[0] as Record<string, unknown>).n ?? 0);
    res.json({ tickets: dataQuery.rows, total });
  } catch (err) {
    logger.error({ err }, "complaints/admin: query failed");
    res.status(500).json({ error: "Error al cargar tickets" });
  }
});

// PATCH /api/complaints/admin/:id — respond and/or resolve (admin)
router.patch("/admin/:id", async (req: Request, res: Response): Promise<void> => {
  if (!checkAdmin(req)) { res.status(401).json({ error: "Unauthorized" }); return; }
  const id = parseInt(req.params.id);
  const { admin_response, status = "resuelto", send_whatsapp = false } = req.body as {
    admin_response?: string;
    status?: string;
    send_whatsapp?: boolean;
  };

  if (isNaN(id)) { res.status(400).json({ error: "id inválido" }); return; }

  try {
    const updateRes = await db.execute(sql`
      UPDATE complaint_log
      SET
        admin_response = COALESCE(${admin_response ?? null}, admin_response),
        status = ${status},
        admin_responded_at = NOW()
      WHERE id = ${id}
      RETURNING ticket_ref, telefono, admin_response
    `);

    if (!updateRes.rows.length) { res.status(404).json({ error: "Ticket no encontrado" }); return; }

    const row = updateRes.rows[0] as Record<string, unknown>;
    let whatsappSent = false;

    if (send_whatsapp && admin_response && row.telefono) {
      const telefono = row.telefono as string;
      const ref = row.ticket_ref as string;
      const msg = `✅ *Respuesta de PagoYa — Ticket ${ref}*\n\n${admin_response}\n\n¿Necesitas algo más? Responde aquí y te ayudamos.`;
      try {
        await sendWhatsApp(telefono, msg);
        await db.execute(sql`UPDATE complaint_log SET whatsapp_sent = true WHERE id = ${id}`);
        whatsappSent = true;
      } catch (waErr) {
        logger.error({ waErr }, "complaints/admin: whatsapp send failed");
      }
    }

    res.json({ ok: true, ticket_ref: row.ticket_ref, status, whatsapp_sent: whatsappSent });
  } catch (err) {
    logger.error({ err }, "complaints/admin: update failed");
    res.status(500).json({ error: "Error al actualizar ticket" });
  }
});

export default router;
