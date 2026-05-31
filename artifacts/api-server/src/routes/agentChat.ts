import { Router, type Request, type Response } from "express";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { db, billPaymentsTable, walletsTable, walletTransactionsTable } from "@workspace/db";
import { eq, desc, and, gt, sql } from "drizzle-orm";
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
function buildSystemPrompt(profileName?: string | null): string {
  const greeting = profileName ? ` El nombre del usuario en WhatsApp es "${profileName}".` : "";
  return `Eres Paula, la asistente inteligente de PagoYa — la app mexicana de pago de servicios y recargas para los 40 millones de mexicanos sin acceso bancario.${greeting} Eres conversacional, empática y directa. Hablas en español mexicano natural.

MISIÓN DE PAGOYA: Permitir que cualquier persona con WhatsApp pague sus servicios (luz, agua, gas, internet, celular) sin necesitar una cuenta bancaria ni descargar una app. Solo WhatsApp + saldo en la billetera digital.

Servicios disponibles: CFE (luz), SACMEX/SIAPA (agua), Gas Natural, Zeta Gas, Izzi, TotalPlay, Megacable, Telmex, Starlink, Sky, Dish, Telcel, AT&T, Movistar, y más. Gift Cards digitales: Netflix ($300/$400/$500/$700), Amazon ($100–$1,000), Google Play ($50–$500), Uber ($150), Uber Eats ($300), Cinépolis ($60–$210), Starbucks ($200/$300), Liverpool ($500–$2,000), Soriana ($500).
Costo por transacción: $25 MXN.
Formas de cargar saldo: efectivo en OXXO (barcode que llega a tu WhatsApp), tarjeta de débito/crédito, transferencia SPEI.
Puntos de lealtad: 1 punto por cada $10 MXN pagados — niveles Bronce, Plata (500 pts), Oro (2,000 pts). Los niveles más altos dan multiplicadores y cashback.

PAGOS DIRECTOS: Si el usuario dice "paga mi CFE", "quiero pagar mi luz", "pagar Telmex", etc., usa prepare_bill_payment para iniciar el pago. Necesitas: serviceId (IDs del catálogo: cfe, sacmex, agua_jalisco, gas_natural, zeta_gas, izzi, totalplay, megacable, telmex_internet, starlink, sky, dish, telcel, att, movistar), referencia (número de cuenta o contrato), monto en MXN, y telefono del usuario. Si el usuario no da referencia o monto, pregúntale antes de llamar la herramienta. Después de llamar prepare_bill_payment, muestra el confirmText exactamente y espera respuesta.

GIFT CARDS: PagoYa vende gift cards digitales — el PIN llega por WhatsApp en segundos después del pago.
Marcas y denominaciones disponibles: Netflix $300/$400/$500/$700 | Amazon $100/$200/$500/$1,000 | Google Play $50/$100/$200/$500 | Uber $150 | Uber Eats $300 | Cinépolis $60/$120/$210 | Starbucks $200/$300 | Liverpool $500/$1,000/$2,000 | Soriana $500.
Cómo comprar: el usuario abre pagoya.mx, selecciona la gift card, elige la denominación, paga con tarjeta débito/crédito (costo: denominación + $25 MXN comisión) o con saldo de su Cartera PagoYa (sin comisión). El PIN digital llega por WhatsApp en segundos.
Si el usuario tiene saldo en su cartera y quiere pagar una gift card desde WhatsApp, usa prepare_bill_payment con el serviceId correcto (ej: "netflix_300") y sin referencia — para gift cards la referencia no aplica.
Preguntas frecuentes: "¿Cuándo llega el PIN?" → en segundos por WhatsApp. "¿Cómo uso el código?" → en Netflix.com/redeem, Amazon.com.mx/redimir, etc. "¿Se puede devolver?" → no, las gift cards son finales una vez entregado el PIN. "¿Funciona fuera de México?" → depende de la plataforma; Netflix MX funciona en cuentas mexicanas.

SALDO: Cuando el usuario pregunta cómo cargar saldo o depositar, usa get_deposit_instructions para darle las opciones paso a paso.

PUNTOS: Cuando el usuario pregunta por sus puntos, nivel, o recompensas, usa get_loyalty_points.

Cuando el usuario pregunta sobre SU cuenta específica (su saldo, sus pagos anteriores, su depósito pendiente), usa las herramientas correspondientes. No inventes datos.

Cuando el usuario reporta un problema que no puedes resolver (pago fallido sin reembolso, cuenta bloqueada, disputa), usa escalate_to_support.

Responde siempre en el mismo idioma que el usuario. Sé conciso — máximo 3 oraciones por respuesta salvo que el usuario pida más detalle. No menciones que eres Claude ni que usas IA de Anthropic.`;
}

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
    name: "get_loyalty_points",
    description: "Returns the user's current loyalty points balance, lifetime points, and tier (Bronce/Plata/Oro). Use when user asks about their points, rewards, level, or how many points they have.",
    input_schema: {
      type: "object",
      properties: {
        telefono: { type: "string", description: "User phone number with country code" },
      },
      required: ["telefono"],
    },
  },
  {
    name: "get_deposit_instructions",
    description: "Returns step-by-step instructions for how the user can add saldo (money) to their PagoYa wallet. Covers OXXO cash deposit, SPEI bank transfer, and debit/credit card. Use when user asks how to load money, deposit, or add saldo.",
    input_schema: {
      type: "object",
      properties: {
        telefono: { type: "string", description: "User phone number with country code" },
        method: {
          type: "string",
          enum: ["oxxo", "spei", "card", "all"],
          description: "Which deposit method to explain. Default 'all' shows all options.",
        },
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

    case "get_loyalty_points": {
      if (!tel) return { result: { error: "telefono no disponible" } };
      try {
        const cleanTel = tel.startsWith("+") ? tel : `+${tel}`;
        const result = await db.execute(
          sql`SELECT la.points_balance, la.points_lifetime, la.tier
              FROM loyalty_accounts la
              WHERE la.phone = ${cleanTel}
              LIMIT 1`,
        );
        const rows = result.rows as Array<{
          points_balance: string;
          points_lifetime: string;
          tier: string;
        }>;
        if (!rows.length) {
          return { result: { points_balance: 0, points_lifetime: 0, tier: "bronce", message: "Cuenta nueva — gana puntos pagando servicios." } };
        }
        const row = rows[0];
        const balance = parseInt(row.points_balance ?? "0");
        const lifetime = parseInt(row.points_lifetime ?? "0");
        const tier = row.tier ?? "bronce";
        const ptsToPlata = Math.max(0, 500 - lifetime);
        const ptsToOro = Math.max(0, 2000 - lifetime);
        return {
          result: {
            points_balance: balance,
            points_lifetime: lifetime,
            tier,
            next_tier: tier === "bronce" ? `Plata (faltan ${ptsToPlata} pts)` : tier === "plata" ? `Oro (faltan ${ptsToOro} pts)` : "¡Ya estás en el nivel máximo Oro! 🥇",
          },
        };
      } catch (err) {
        logger.error({ err }, "agentChat: get_loyalty_points failed");
        return { result: { error: "No se pudo consultar los puntos en este momento." } };
      }
    }

    case "get_deposit_instructions": {
      const method = (input.method as string | undefined) ?? "all";
      const appUrl = "https://pagoya.mx";
      const instructions: Record<string, string> = {
        oxxo: `💵 *Depositar en OXXO*\n1. Abre la app PagoYa en ${appUrl}\n2. Ve a "Cargar Saldo" → "Efectivo OXXO"\n3. Te llegará un código de barras por WhatsApp\n4. Muéstralo en cualquier OXXO y paga en efectivo\n5. Tu saldo se acredita en minutos ✅`,
        spei: `🏦 *Transferencia SPEI*\n1. Abre la app PagoYa en ${appUrl}\n2. Ve a "Cargar Saldo" → "Transferencia SPEI"\n3. Copia el número CLABE que aparece\n4. Haz la transferencia desde tu banco\n5. Tu saldo se acredita en minutos ✅`,
        card: `💳 *Tarjeta de débito o crédito*\n1. Abre la app PagoYa en ${appUrl}\n2. Ve a "Cargar Saldo" → "Tarjeta"\n3. Ingresa los datos de tu tarjeta (Visa/Mastercard)\n4. Tu saldo se acredita al instante ✅`,
      };
      if (method === "oxxo") return { result: { instructions: instructions.oxxo } };
      if (method === "spei") return { result: { instructions: instructions.spei } };
      if (method === "card") return { result: { instructions: instructions.card } };
      return {
        result: {
          instructions: `Puedes cargar saldo de 3 formas:\n\n${instructions.oxxo}\n\n${instructions.spei}\n\n${instructions.card}`,
        },
      };
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
      const inputReferencia = (input.referencia as string | undefined) ?? "";
      const inputMonto = Number(input.monto);
      const telefono = (input.telefono as string | undefined) ?? resolvedTelefono ?? "";

      const service = getServiceById(serviceId);
      if (!service) {
        return { result: { error: `Servicio no encontrado: ${serviceId}. Verifica el ID del catálogo.` } };
      }

      // Gift cards: referencia = phone, monto = fixedAmount from catalog
      const isGiftCard = service.isGiftCard === true;
      const cleanTel = telefono.startsWith("+") ? telefono : `+${telefono}`;
      const referencia = isGiftCard ? cleanTel : inputReferencia;
      const monto = isGiftCard && service.fixedAmount != null ? service.fixedAmount : inputMonto;

      if (!isGiftCard && (!referencia || referencia.trim().length === 0)) {
        return { result: { error: "Referencia/número de cuenta requerida." } };
      }

      if (isNaN(monto) || monto <= 0) {
        return { result: { error: "El monto debe ser un número positivo." } };
      }

      const [wallet] = await db
        .select({ balance_mxn: walletsTable.balanceMxn })
        .from(walletsTable)
        .where(eq(walletsTable.userId, cleanTel))
        .limit(1);

      const balance = wallet ? Number(wallet.balance_mxn) : 0;
      // Gift cards via wallet: no platform fee (same as web app wallet path)
      const fee = isGiftCard ? 0 : 25;
      const totalCost = monto + fee;

      if (balance < totalCost) {
        return {
          result: {
            error: `Saldo insuficiente. Tienes $${balance.toFixed(2)} MXN pero necesitas $${totalCost.toFixed(2)} MXN${fee > 0 ? ` (gift card $${monto} + comisión $${fee})` : ""}. ¿Quieres que te explique cómo cargar saldo?`,
          },
        };
      }

      const feeLine = fee > 0 ? `\nComisión: $${fee.toFixed(2)} MXN` : "\nComisión: Sin comisión 🎁";
      const confirmText = `💳 *Resumen de pago*\n\n${service.logoEmoji} *${service.name}*${isGiftCard ? "" : `\nReferencia: ${referencia}`}\nMonto: $${monto.toFixed(2)} MXN${feeLine}\n*Total: $${totalCost.toFixed(2)} MXN*\n\nSaldo actual: $${balance.toFixed(2)} MXN\n\nResponde *SÍ* para confirmar o *NO* para cancelar.`;

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
    profileName,
  } = req.body as {
    message?: string;
    telefono?: string;
    history?: Array<{ role: "user" | "assistant"; content: string }>;
    profileName?: string | null;
  };

  if (!message || message.trim().length === 0) {
    res.status(400).json({ reply: "Mensaje vacío.", escalated: false });
    return;
  }

  try {
    const messages: MessageParam[] = [
      ...history.map((h) => ({ role: h.role, content: h.content })),
      { role: "user", content: message.trim() },
    ];

    let escalated = false;
    let finalReply = "";
    let stagedPayment: PendingPaymentStage | undefined;

    for (let i = 0; i < 5; i++) {
      const response = await (anthropic.messages.create as (p: unknown) => Promise<{
        stop_reason: string;
        content: ContentBlock[];
      }>)({
        model: "claude-sonnet-4-5",
        max_tokens: 1024,
        system: buildSystemPrompt(profileName),
        tools: TOOLS,
        messages,
      });

      if (response.stop_reason === "tool_use") {
        const toolBlocks = response.content.filter(
          (b): b is ToolUseBlock => b.type === "tool_use",
        );

        messages.push({ role: "assistant", content: response.content });

        const results = await Promise.all(
          toolBlocks.map(async (tb) => {
            const { result, pendingPayment } = await executeToolCall(tb.name, tb.input, telefono ?? null);
            if (tb.name === "escalate_to_support") escalated = true;
            if (pendingPayment) stagedPayment = pendingPayment;
            return { id: tb.id, result };
          }),
        );

        messages.push({
          role: "user",
          content: results.map((r) => ({
            type: "tool_result" as const,
            tool_use_id: r.id,
            content: JSON.stringify(r.result),
          })),
        });
      } else {
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
