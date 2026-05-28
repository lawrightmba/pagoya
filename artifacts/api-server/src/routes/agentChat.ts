import { Router, type Request, type Response } from "express";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { db, billPaymentsTable, walletsTable, walletTransactionsTable } from "@workspace/db";
import { eq, desc, and, gt } from "drizzle-orm";
import { sendWhatsApp } from "../lib/whatsapp.js";
import { logger } from "../lib/logger.js";
import { getServiceById } from "../billpay/services/catalog.js";

const router = Router();

// ─── Locally-typed message shapes (structurally compatible with Anthropic SDK) ─
type TextBlock = { type: "text"; text: string };
type ToolUseBlock = { type: "tool_use"; id: string; name: string; input: Record<string, unknown> };
type ToolResultBlock = { type: "tool_result"; tool_use_id: string; content: string };
type ContentBlock = TextBlock | ToolUseBlock | ToolResultBlock;
type MessageParam = { role: "user" | "assistant"; content: string | ContentBlock[] };

export interface PendingPaymentStage {
  serviceId: string;
  serviceName: string;
  referencia: string;
  monto: number;
  telefono: string;
}

// ─── System prompt ─────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `Eres Paula, la asistente de PagoYa — una app mexicana de pago de servicios y recargas. Ayudas a usuarios con dudas sobre sus pagos, saldo, servicios disponibles, y también puedes iniciar pagos de servicios directamente desde WhatsApp.

Servicios disponibles: CFE (luz), SACMEX/SIAPA (agua), Gas Natural, Zeta Gas, Izzi, TotalPlay, Megacable, Telmex, Starlink, Sky, Dish, Telcel, AT&T, Movistar, y más. Costo por transacción: $25 MXN. Formas de cargar saldo: efectivo en OXXO, tarjeta de débito/crédito, transferencia SPEI. Puntos de lealtad: 1 punto por cada $10 MXN pagados, con niveles Bronze, Silver, Gold.

PAGOS DIRECTOS: Si el usuario dice "paga mi CFE", "quiero pagar mi luz", "pagar Telmex", etc., usa prepare_bill_payment para iniciar el pago. Necesitas: serviceId (usa los IDs del catálogo: cfe, sacmex, agua_jalisco, gas_natural, zeta_gas, izzi, totalplay, megacable, telmex_internet, starlink, sky, dish, telcel, att, movistar, etc.), referencia (número de cuenta o contrato), monto en MXN, y telefono del usuario. Si el usuario no proporciona referencia o monto, pregúntale antes de llamar la herramienta. Después de llamar prepare_bill_payment, muestra el resumen de pago exactamente como lo indica el campo confirmText y espera confirmación.

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
  {
    name: "prepare_bill_payment",
    description: "Validates and stages a bill payment for user confirmation. Call this when the user wants to pay a service. Verifies the service exists and the user has sufficient wallet balance. Returns a summary for the user to confirm.",
    input_schema: {
      type: "object",
      properties: {
        serviceId: { type: "string", description: "Service catalog ID, e.g. 'cfe', 'telmex_internet', 'izzi'" },
        referencia: { type: "string", description: "Customer account or contract reference number" },
        monto: { type: "number", description: "Payment amount in MXN (not including the $25 MXN platform fee)" },
        telefono: { type: "string", description: "User phone number with country code" },
      },
      required: ["serviceId", "referencia", "monto", "telefono"],
    },
  },
];

// ─── Tool executor ─────────────────────────────────────────────────────────────
async function executeToolCall(
  name: string,
  input: Record<string, unknown>,
  resolvedTelefono: string | null,
): Promise<{ result: unknown; pendingPayment?: PendingPaymentStage }> {
  const tel = ((input.telefono as string | undefined) ?? resolvedTelefono) || null;

  switch (name) {
    case "get_payment_history": {
      if (!tel) return { result: { error: "telefono no disponible" } };
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
      return { result: rows };
    }

    case "get_wallet_balance": {
      if (!tel) return { result: null };
      const [wallet] = await db
        .select({
          balance_mxn: walletsTable.balanceMxn,
          updated_at: walletsTable.updatedAt,
        })
        .from(walletsTable)
        .where(eq(walletsTable.userId, tel))
        .limit(1);
      return { result: wallet ?? null };
    }

    case "get_pending_oxxo": {
      if (!tel) return { result: [] };
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
      return { result: rows };
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
      return { result: { escalated: true } };
    }

    case "prepare_bill_payment": {
      const serviceId = input.serviceId as string;
      const referencia = input.referencia as string;
      const monto = Number(input.monto);
      const telefono = (input.telefono as string | undefined) ?? resolvedTelefono ?? "";

      // Validate service
      const service = getServiceById(serviceId);
      if (!service) {
        return { result: { error: `Servicio no encontrado: ${serviceId}. Verifica el ID del catálogo.` } };
      }

      if (!referencia || referencia.trim().length === 0) {
        return { result: { error: "Referencia/número de cuenta requerida." } };
      }

      if (isNaN(monto) || monto <= 0) {
        return { result: { error: "El monto debe ser un número positivo." } };
      }

      // Check wallet balance
      const cleanTel = telefono.startsWith("+") ? telefono : `+${telefono}`;
      const [wallet] = await db
        .select({ balance_mxn: walletsTable.balanceMxn })
        .from(walletsTable)
        .where(eq(walletsTable.userId, cleanTel))
        .limit(1);

      const balance = wallet ? Number(wallet.balance_mxn) : 0;
      const totalCost = monto + 25; // platform fee

      if (balance < totalCost) {
        return {
          result: {
            error: `Saldo insuficiente. Tienes $${balance.toFixed(2)} MXN pero necesitas $${totalCost.toFixed(2)} MXN (pago $${monto} + comisión $25).`,
          },
        };
      }

      const confirmText = `💳 *Resumen de pago*\n\n${service.logoEmoji} *${service.name}*\nReferencia: ${referencia}\nMonto: $${monto.toFixed(2)} MXN\nComisión: $25.00 MXN\n*Total: $${totalCost.toFixed(2)} MXN*\n\nSaldo actual: $${balance.toFixed(2)} MXN\n\nResponde *SÍ* para confirmar o *NO* para cancelar.`;

      return {
        result: { ready: true, confirmText, serviceName: service.name },
        pendingPayment: {
          serviceId,
          serviceName: service.name,
          referencia,
          monto,
          telefono: cleanTel,
        },
      };
    }

    default:
      return { result: { error: `Unknown tool: ${name}` } };
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
    let stagedPayment: PendingPaymentStage | undefined;

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
            const { result, pendingPayment } = await executeToolCall(tb.name, tb.input, telefono ?? null);
            if (tb.name === "escalate_to_support") escalated = true;
            if (pendingPayment) stagedPayment = pendingPayment;
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

    logger.info({ escalated, msgLen: message.length, hasStagedPayment: !!stagedPayment }, "agentChat: success");
    res.json({ reply: finalReply, escalated, pendingPayment: stagedPayment ?? null });
  } catch (err) {
    logger.error({ err }, "agentChat: error");
    res.json({ reply: "Lo sentimos, ocurrió un error. Intenta de nuevo.", escalated: false, pendingPayment: null });
  }
});

export default router;
