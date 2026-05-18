import { Router, type Request, type Response } from "express";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { db, billPaymentsTable, walletsTable, walletTransactionsTable } from "@workspace/db";
import { eq, desc, and, gt } from "drizzle-orm";
import { sendWhatsApp } from "../lib/whatsapp.js";
import { logger } from "../lib/logger.js";

const router = Router();

// ─── Locally-typed message shapes (structurally compatible with Anthropic SDK) ─
type TextBlock = { type: "text"; text: string };
type ToolUseBlock = { type: "tool_use"; id: string; name: string; input: Record<string, unknown> };
type ToolResultBlock = { type: "tool_result"; tool_use_id: string; content: string };
type ContentBlock = TextBlock | ToolUseBlock | ToolResultBlock;
type MessageParam = { role: "user" | "assistant"; content: string | ContentBlock[] };

// ─── System prompt ─────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `Eres el asistente de soporte de PagoYa, una app mexicana de pago de servicios y recargas. Ayudas a usuarios con dudas sobre sus pagos, saldo, y servicios disponibles.

Servicios disponibles: CFE, Telmex, Telcel, Izzi, Totalplay, Sky, Megacable, AT&T, Movistar, agua, internet y más. Costo por transacción: $25 MXN. Formas de cargar saldo: efectivo en OXXO, tarjeta de débito/crédito, transferencia SPEI. Puntos de lealtad: 1 punto por cada $10 MXN pagados, con niveles Bronze, Silver, Gold.

Cuando el usuario pregunta sobre SU cuenta específica (su saldo, sus pagos, su depósito), usa las herramientas disponibles para consultar su información real antes de responder. No inventes datos.

Cuando el usuario reporta un problema que no puedes resolver (pago fallido sin reembolso, cuenta bloqueada, disputa), usa escalate_to_support y confirma al usuario que un agente humano los contactará pronto.

Responde siempre en el mismo idioma que el usuario. Si escribe en español, responde en español. Si escribe en inglés, responde en inglés. Sé conciso — máximo 3 oraciones por respuesta salvo que el usuario pida más detalle. No menciones que eres Claude ni que usas IA de Anthropic.`;

// ─── Tool definitions ──────────────────────────────────────────────────────────
const TOOLS = [
  {
    name: "get_payment_history",
    description: "Returns the last 10 bill payments for the given user telefono.",
    input_schema: {
      type: "object",
      properties: {
        telefono: { type: "string", description: "User phone number with country code, e.g. +521234567890" },
      },
      required: ["telefono"],
    },
  },
  {
    name: "get_wallet_balance",
    description: "Returns the current wallet balance for the given user telefono.",
    input_schema: {
      type: "object",
      properties: {
        telefono: { type: "string", description: "User phone number with country code" },
      },
      required: ["telefono"],
    },
  },
  {
    name: "get_pending_oxxo",
    description: "Returns any pending OXXO cash deposit orders from the last 48 hours for the given user.",
    input_schema: {
      type: "object",
      properties: {
        telefono: { type: "string", description: "User phone number with country code" },
      },
      required: ["telefono"],
    },
  },
  {
    name: "escalate_to_support",
    description: "Escalates the issue to a human support agent via WhatsApp. Use when the user has a problem you cannot resolve (payment dispute, blocked account, unrefunded charge, etc.).",
    input_schema: {
      type: "object",
      properties: {
        telefono: { type: "string", description: "User phone number" },
        issue_summary: { type: "string", description: "Brief description of the issue in Spanish" },
      },
      required: ["issue_summary"],
    },
  },
];

// ─── Tool executor ─────────────────────────────────────────────────────────────
async function executeToolCall(
  name: string,
  input: Record<string, unknown>,
  resolvedTelefono: string | null,
): Promise<unknown> {
  const tel = ((input.telefono as string | undefined) ?? resolvedTelefono) || null;

  switch (name) {
    case "get_payment_history": {
      if (!tel) return { error: "telefono no disponible" };
      const rows = await db
        .select({
          service_name: billPaymentsTable.serviceName,
          amount: billPaymentsTable.monto,
          fee: billPaymentsTable.platformFeeMxn,
          status: billPaymentsTable.status,
          provider_used: billPaymentsTable.providerUsed,
          created_at: billPaymentsTable.createdAt,
        })
        .from(billPaymentsTable)
        .where(eq(billPaymentsTable.telefono, tel))
        .orderBy(desc(billPaymentsTable.createdAt))
        .limit(10);
      return rows;
    }

    case "get_wallet_balance": {
      if (!tel) return null;
      const [wallet] = await db
        .select({
          balance_mxn: walletsTable.balanceMxn,
          updated_at: walletsTable.updatedAt,
        })
        .from(walletsTable)
        .where(eq(walletsTable.userId, tel))
        .limit(1);
      return wallet ?? null;
    }

    case "get_pending_oxxo": {
      if (!tel) return [];
      const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
      const rows = await db
        .select({
          amount: walletTransactionsTable.amountMxn,
          created_at: walletTransactionsTable.createdAt,
          reference: walletTransactionsTable.description,
        })
        .from(walletTransactionsTable)
        .innerJoin(walletsTable, eq(walletTransactionsTable.walletId, walletsTable.id))
        .where(
          and(
            eq(walletsTable.userId, tel),
            eq(walletTransactionsTable.type, "oxxo_pending"),
            gt(walletTransactionsTable.createdAt, cutoff),
          ),
        );
      return rows;
    }

    case "escalate_to_support": {
      const summary = (input.issue_summary as string | undefined) ?? "Sin detalle";
      const userTel = tel ?? "desconocido";
      const adminNumber = process.env.ADMIN_WHATSAPP_NUMBER ?? "";
      if (adminNumber) {
        await sendWhatsApp(
          adminNumber,
          `🆘 Soporte PagoYa requerido\nUsuario: ${userTel}\nProblema: ${summary}`,
        ).catch((err) => logger.error({ err }, "agentChat: WhatsApp escalation failed"));
      } else {
        logger.warn({ userTel, summary }, "agentChat: ADMIN_WHATSAPP_NUMBER not set — escalation not sent");
      }
      return { escalated: true };
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}

// ─── POST /api/agent/chat ──────────────────────────────────────────────────────
router.post("/", async (req: Request, res: Response) => {
  const {
    message,
    telefono,
    history = [],
  } = req.body as {
    message?: string;
    telefono?: string;
    history?: Array<{ role: "user" | "assistant"; content: string }>;
  };

  if (!message || message.trim().length === 0) {
    res.status(400).json({ reply: "Mensaje vacío.", escalated: false });
    return;
  }

  try {
    // Build initial messages: history + new user message
    const messages: MessageParam[] = [
      ...history.map((h) => ({ role: h.role, content: h.content })),
      { role: "user", content: message.trim() },
    ];

    let escalated = false;
    let finalReply = "";

    // Tool-use loop — max 5 iterations to guard against runaway loops
    for (let i = 0; i < 5; i++) {
      const response = await (anthropic.messages.create as (p: unknown) => Promise<{
        stop_reason: string;
        content: ContentBlock[];
      }>)({
        model: "claude-haiku-4-5",
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        tools: TOOLS,
        messages,
      });

      if (response.stop_reason === "tool_use") {
        const toolBlocks = response.content.filter(
          (b): b is ToolUseBlock => b.type === "tool_use",
        );

        // Append the assistant message (contains tool_use blocks)
        messages.push({ role: "assistant", content: response.content });

        // Execute all tools in this turn in parallel
        const results = await Promise.all(
          toolBlocks.map(async (tb) => {
            const result = await executeToolCall(tb.name, tb.input, telefono ?? null);
            if (tb.name === "escalate_to_support") escalated = true;
            return { id: tb.id, result };
          }),
        );

        // Append tool_result message
        messages.push({
          role: "user",
          content: results.map((r) => ({
            type: "tool_result" as const,
            tool_use_id: r.id,
            content: JSON.stringify(r.result),
          })),
        });
      } else {
        // stop_reason === "end_turn" — extract text reply
        const textBlock = response.content.find((b): b is TextBlock => b.type === "text");
        finalReply = textBlock?.text ?? "";
        break;
      }
    }

    if (!finalReply) {
      finalReply = "Lo sentimos, ocurrió un error. Intenta de nuevo.";
    }

    logger.info({ escalated, msgLen: message.length }, "agentChat: success");
    res.json({ reply: finalReply, escalated });
  } catch (err) {
    logger.error({ err }, "agentChat: error");
    res.json({ reply: "Lo sentimos, ocurrió un error. Intenta de nuevo.", escalated: false });
  }
});

export default router;
