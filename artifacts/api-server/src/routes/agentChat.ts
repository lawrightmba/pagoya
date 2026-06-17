import { Router, type Request, type Response } from "express";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { db, billPaymentsTable, walletsTable, walletTransactionsTable, usersTable } from "@workspace/db";
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
  fee: number;
  walletBalance: number;
  paymentMethod: string;
}

export interface PendingWithdrawalStage {
  telefono: string;
  destinationClabe: string;
  amountMXN: number;
  beneficiaryName: string;
  walletBalance: number;
}

// ─── System prompt ─────────────────────────────────────────────────────────────
function buildSystemPrompt(
  profileName?: string | null,
  ptiTier?: string | null,
  ptiScore?: number | null,
  lang?: "es" | "en" | null,
): string {
  const greeting = profileName ? ` El nombre del usuario en WhatsApp es "${profileName}".` : "";

  // PTI-personalized tone — Cialdini: Liking + Authority
  // Bronce: warm, encouraging (building confidence)
  // Plata: peer-level warmth (acknowledging progress)
  // Oro: peer-level, assumes competence (respects autonomy)
  let ptiContext = "";
  if (ptiTier && ptiScore != null) {
    if (ptiTier === "Oro" || ptiScore >= 70) {
      ptiContext = ` Este usuario es de nivel *Oro* con ${ptiScore} puntos de confianza PagoYa — está en el top 25% de usuarios. Trátalo como par: asume que ya conoce el sistema, sé directo y profesional. Puedes mencionar su buen historial cuando sea relevante: "Como usuario Oro, ya sabes cómo funciona esto."`;
    } else if (ptiTier === "Plata" || ptiScore >= 50) {
      ptiContext = ` Este usuario es de nivel *Plata* con ${ptiScore} puntos de confianza — lleva buen camino. Usa un tono cálido y de reconocimiento. Puedes reforzar su progreso sutilmente: "Con tu historial, esto es pan comido."`;
    } else {
      ptiContext = ` Este usuario está en nivel *Bronce* con ${ptiScore} puntos de confianza — está comenzando su camino. Usa un tono especialmente cálido, paciente y alentador. Celebra cada acción que tome.`;
    }
  }

  const langInstruction = lang === "en"
    ? " IMPORTANT: This user's preferred language is ENGLISH. You MUST respond exclusively in English for the entire conversation. Do not switch to Spanish even if the user writes something in Spanish."
    : " Responde siempre en español mexicano natural, a menos que el usuario te escriba en otro idioma.";

  return `Eres Paula, la asistente inteligente de PagoYa — la app mexicana de pago de servicios y recargas para los 40 millones de mexicanos sin acceso bancario.${greeting}${ptiContext} Eres conversacional, empática y directa. Hablas en español mexicano natural.

IDENTIDAD FINANCIERA: Recuerda siempre que cada pago que hace el usuario construye su historial financiero real — su PTI (PagoYa Trust Index). Cuando sea natural, refuerza este mensaje con frases como: "Cada pago que haces suma a tu historial financiero", "Con tu consistencia, tu PTI sigue creciendo", "PagoYa guarda tu historial para que siempre puedas demostrar tu responsabilidad financiera." No lo digas en cada mensaje — solo cuando sea relevante y natural.

SOLICITUD DE CURP: Si el usuario menciona querer acceder a productos financieros (préstamos, crédito, tarjeta), O si llevas un tiempo interactuando y el usuario tiene buen historial de pagos, puedes mencionarle de forma conversacional: "Para que puedas acceder a más beneficios y mejores productos, puedes registrar tu CURP en tu perfil de PagoYa — es un paso sencillo que fortalece tu identidad financiera." Solo mencionarlo una vez por sesión, nunca presionar.

MISIÓN DE PAGOYA: Permitir que cualquier persona con WhatsApp pague sus servicios (luz, agua, gas, internet, celular) sin necesitar una cuenta bancaria ni descargar una app. Solo WhatsApp + saldo en la billetera digital.

Servicios disponibles: CFE (luz), SACMEX/SIAPA (agua), Gas Natural, Zeta Gas, Izzi, TotalPlay, Megacable, Telmex, Starlink, Sky, Dish, Telcel, AT&T, Movistar, y más. Gift Cards digitales: Netflix ($300/$400/$500/$700), Amazon ($100–$1,000), Google Play ($50–$500), Uber ($150), Uber Eats ($300), Cinépolis ($60–$210), Starbucks ($200/$300), Liverpool ($500–$2,000), Soriana ($500).
Costo por transacción: $25 MXN.
Formas de cargar saldo: efectivo en OXXO (barcode que llega a tu WhatsApp), tarjeta de débito/crédito, transferencia SPEI.
Puntos de lealtad: 1 punto por cada $10 MXN pagados — niveles Bronce, Plata (500 pts), Oro (2,000 pts). Los niveles más altos dan multiplicadores y cashback.

PAGOS DIRECTOS: Si el usuario dice "paga mi CFE", "quiero pagar mi luz", "pagar Telmex", etc., usa prepare_bill_payment para iniciar el pago. Necesitas: serviceId (IDs del catálogo: cfe, sacmex, agua_jalisco, gas_natural, zeta_gas, izzi, totalplay, megacable, telmex_internet, starlink, sky, dish, telcel, att, movistar), referencia (número de cuenta o contrato), monto en MXN, y telefono del usuario. Si el usuario no da referencia o monto, pregúntale SOLO UNA cosa a la vez — primero la referencia, luego el monto en un mensaje separado. Nunca pidas ambas en el mismo mensaje. Después de llamar prepare_bill_payment, muestra el confirmText exactamente y espera respuesta.

GIFT CARDS: PagoYa vende gift cards digitales — el PIN llega por WhatsApp en segundos después del pago.
Marcas y denominaciones disponibles: Netflix $300/$400/$500/$700 | Amazon $100/$200/$500/$1,000 | Google Play $50/$100/$200/$500 | Uber $150 | Uber Eats $300 | Cinépolis $60/$120/$210 | Starbucks $200/$300 | Liverpool $500/$1,000/$2,000 | Soriana $500.
Cómo comprar: el usuario abre pagoya.mx, selecciona la gift card, elige la denominación, paga con tarjeta débito/crédito (costo: denominación + $25 MXN comisión) o con saldo de su Cartera PagoYa (sin comisión). El PIN digital llega por WhatsApp en segundos.
Si el usuario tiene saldo en su cartera y quiere pagar una gift card desde WhatsApp, usa prepare_bill_payment con el serviceId correcto (ej: "netflix_300") y sin referencia — para gift cards la referencia no aplica.
Preguntas frecuentes: "¿Cuándo llega el PIN?" → en segundos por WhatsApp. "¿Cómo uso el código?" → en Netflix.com/redeem, Amazon.com.mx/redimir, etc. "¿Se puede devolver?" → no, las gift cards son finales una vez entregado el PIN. "¿Funciona fuera de México?" → depende de la plataforma; Netflix MX funciona en cuentas mexicanas.

SALDO: Cuando el usuario pregunta cómo cargar saldo o depositar, usa get_deposit_instructions para darle las opciones paso a paso.

PUNTOS: Cuando el usuario pregunta por sus puntos, nivel, o recompensas, usa get_loyalty_points.

Cuando el usuario pregunta sobre SU cuenta específica (su saldo, sus pagos anteriores, su depósito pendiente), usa las herramientas correspondientes. No inventes datos.

CANCELACIÓN Y CAMBIOS DE OPINIÓN (Gap 1): Esta regla tiene PRIORIDAD MÁXIMA sobre cualquier flujo activo. Si el usuario en CUALQUIER momento del flujo (antes de dar la referencia, durante, o en la confirmación) dice "espera", "me equivoqué", "no quiero", "cancela", "mejor no", "un momento", "olvídalo", "para", "no", o cualquier variante de arrepentimiento o duda — abandona INMEDIATAMENTE el flujo sin preguntar nada más y responde: "Sin problema, lo cancelé. ¿En qué más te puedo ayudar?" No hagas ninguna pregunta adicional. No retomes el flujo cancelado. Empieza desde cero si el usuario quiere intentar de nuevo. Antes de mostrar el resumen de pago, siempre incluye al final: "Responde SÍ para confirmar o NO para cancelar en cualquier momento."

RECUPERACIÓN DE ERRORES (Gap 2): Cuando prepare_bill_payment devuelve un error de saldo insuficiente, di exactamente: "Tu saldo no alcanza para este pago. ¿Quieres que te explique cómo cargar saldo rápido en OXXO?" — nunca solo digas "hubo un error". Cuando el servicio no se encuentra, di: "No encontré ese servicio. ¿Me puedes decir el nombre completo? Por ejemplo: CFE, Telmex, Izzi." Cuando falla la conexión o el sistema, di: "Tuve un problema técnico ahorita. Espera un momento e intenta de nuevo — si persiste, puedo escalarlo a un agente."

LENGUAJE SENCILLO — USUARIO TIPO DOÑA CARMEN (Gap 3): Habla como si le explicaras a tu abuela. Nunca uses: "procesar", "transacción", "validar", "referencia de pago" (di "número de cuenta"), "débito" (di "tarjeta"), "plataforma" (di "app"). Si el usuario escribe con faltas de ortografía o abreviaciones ("kiero pagar mi luuss", "k onda", "manda el cobro"), interprétalo con buena fe y confirma lo que entendiste antes de actuar: "Entendí que quieres pagar tu luz de CFE, ¿es correcto?" Si un mensaje es muy corto o ambiguo, no pidas más datos todavía — primero confirma el servicio que crees que quiere pagar.

UMBRAL DE ESCALACIÓN (Gap 5): Usa escalate_to_support en cualquiera de estos casos: (1) el usuario reporta un problema que no puedes resolver (pago fallido sin reembolso, cuenta bloqueada, disputa); (2) el usuario ha preguntado lo mismo 3 veces o más y sigue confundido; (3) el usuario dice que pagó pero no le llegó el servicio o el PIN; (4) el usuario expresa frustración fuerte ("esto no sirve", "me robaron", "voy a reportarlos"). Al escalar, di: "Voy a pasarte con un agente de PagoYa que te puede ayudar mejor. Te contactarán por WhatsApp en unos minutos."

RETIROS / TRANSFERENCIA A CUENTA BANCARIA (SPEI OUT): Cuando el usuario quiere retirar su saldo, transferir a su banco, o enviar dinero a una CLABE, usa prepare_withdrawal. Necesitas: CLABE destino (18 dígitos, el usuario la encuentra en su app bancaria o estado de cuenta), monto (mínimo $50, máximo $8,000 MXN), y nombre completo del titular de la cuenta destino. El retiro llega en minutos por SPEI — sistema oficial del Banco de México. Sin comisión adicional: solo se descuenta el monto exacto del saldo. Si el usuario no sabe su CLABE, dile: "La CLABE la encuentras en tu app bancaria → Datos de cuenta → CLABE interbancaria. Son 18 números."

TRANSFERENCIA ENTRE USUARIOS PAGOYA (P2P): Cuando el usuario quiere enviarle dinero a otra persona que también usa PagoYa, usa prepare_p2p_transfer. Es instantáneo, sin comisión, mínimo $10 MXN, límite diario $2,500 MXN. Necesitas: número de teléfono del destinatario y monto. Puedes pedir una nota opcional. Si el destinatario no está registrado en PagoYa, infórmale al usuario: "Esa persona todavía no tiene cuenta PagoYa. Pueden registrarse gratis en pagoyamx.com o escribiéndole a este número de WhatsApp."

Sé conciso — máximo 3 oraciones por respuesta salvo que el usuario pida más detalle. No menciones que eres Claude ni que usas IA de Anthropic.${langInstruction}`;
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
  {
    name: "prepare_withdrawal",
    description: "Stages a SPEI cash-out withdrawal for user confirmation. Use when the user wants to send money to their bank account, withdraw their wallet balance, or transfer funds to a CLABE. Validates the CLABE and that the user has sufficient balance. Min $50 MXN, max $8,000 MXN.",
    input_schema: {
      type: "object",
      properties: {
        telefono: { type: "string", description: "User phone number with country code" },
        destination_clabe: { type: "string", description: "18-digit CLABE of the destination bank account" },
        amount_mxn: { type: "number", description: "Amount to withdraw in MXN (min $50, max $8,000)" },
        beneficiary_name: { type: "string", description: "Full name of the account holder at the destination bank. Ask the user if not provided." },
      },
      required: ["telefono", "destination_clabe", "amount_mxn", "beneficiary_name"],
    },
  },
  {
    name: "prepare_p2p_transfer",
    description: "Stages a wallet-to-wallet P2P transfer to another registered PagoYa user for confirmation. Instant and free. Min $10 MXN, daily limit $2,500 MXN. Use when the user wants to send money to another PagoYa user by phone number.",
    input_schema: {
      type: "object",
      properties: {
        telefono: { type: "string", description: "Sender's phone number with country code" },
        recipient_phone: { type: "string", description: "Recipient's phone number (any format — will be normalized)" },
        amount_mxn: { type: "number", description: "Amount to send in MXN (min $10, daily limit $2,500)" },
        memo: { type: "string", description: "Optional note for the transfer (e.g. 'Para la renta', 'Para los tacos')" },
      },
      required: ["telefono", "recipient_phone", "amount_mxn"],
    },
  },
];

// ─── Tool executor ─────────────────────────────────────────────────────────────
async function executeToolCall(
  name: string,
  input: Record<string, unknown>,
  resolvedTelefono: string | null,
): Promise<{ result: unknown; pendingPayment?: PendingPaymentStage; pendingWithdrawal?: PendingWithdrawalStage }> {
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
          fee,
          walletBalance: balance,
          paymentMethod: "Cartera PagoYa",
        },
      };
    }

    case "prepare_withdrawal": {
      const destClabe = (input.destination_clabe as string | undefined)?.replace(/\s/g, "") ?? "";
      const amtMxn = Number(input.amount_mxn ?? 0);
      const beneName = (input.beneficiary_name as string | undefined) ?? "";
      const wTel = ((input.telefono as string | undefined) ?? resolvedTelefono ?? "").trim();
      const cleanWTel = wTel.startsWith("+") ? wTel : `+${wTel}`;

      if (!/^\d{18}$/.test(destClabe)) {
        return { result: { error: "CLABE inválida — debe tener exactamente 18 dígitos numéricos." } };
      }
      if (amtMxn < 50) {
        return { result: { error: "El monto mínimo de retiro es $50 MXN." } };
      }
      if (amtMxn > 8000) {
        return { result: { error: "El monto máximo de retiro por transacción es $8,000 MXN." } };
      }
      if (!beneName.trim()) {
        return { result: { error: "Se requiere el nombre completo del titular de la cuenta destino." } };
      }
      // Beneficiary name must have at least 2 words (nombre + apellido) for SPEI
      if (beneName.trim().split(/\s+/).filter(Boolean).length < 2) {
        return { result: { error: "El nombre del beneficiario debe incluir nombre y apellido completos para que el banco receptor pueda identificarlo." } };
      }

      // Verify sender's stored legal name has 3+ words (nombre + ambos apellidos) — required by STP
      const senderTelNorm = cleanWTel.replace(/\D/g, "").slice(-10);
      const [senderRow] = await db
        .select({ kycFullName: usersTable.kycFullName })
        .from(usersTable)
        .where(eq(usersTable.telefono, senderTelNorm))
        .limit(1);

      const senderNameParts = (senderRow?.kycFullName ?? "").trim().split(/\s+/).filter(Boolean);
      if (senderNameParts.length < 3) {
        return {
          result: {
            error: senderNameParts.length < 2
              ? "Para hacer una transferencia SPEI necesito tu nombre completo con nombre y ambos apellidos. ¿Me puedes decir tu nombre completo? Por ejemplo: *María Alejandra Pizano Ríos*."
              : "Para hacer una transferencia SPEI necesito tu nombre completo con *ambos apellidos* (paterno y materno). Solo tengo un apellido registrado. ¿Me puedes decir tu segundo apellido para completarlo?",
          },
        };
      }

      const [walletRow] = await db
        .select({ balance_mxn: walletsTable.balanceMxn })
        .from(walletsTable)
        .where(eq(walletsTable.userId, cleanWTel))
        .limit(1);

      const wBalance = walletRow ? Number(walletRow.balance_mxn) : 0;

      if (wBalance < amtMxn) {
        return {
          result: {
            error: `Saldo insuficiente. Tienes $${wBalance.toFixed(2)} MXN pero quieres retirar $${amtMxn.toFixed(2)} MXN.`,
          },
        };
      }

      const maskedClabe = `${"*".repeat(14)}${destClabe.slice(-4)}`;
      const confirmText =
        `🏦 *Resumen de retiro*\n\n` +
        `💰 Monto: $${amtMxn.toFixed(2)} MXN\n` +
        `🏦 CLABE destino: ${maskedClabe}\n` +
        `👤 Titular: ${beneName}\n` +
        `💳 Comisión: Sin comisión ✅\n` +
        `⏱️ Llega en: minutos (SPEI)\n\n` +
        `Saldo actual: $${wBalance.toFixed(2)} MXN\n` +
        `Saldo después del retiro: $${(wBalance - amtMxn).toFixed(2)} MXN\n\n` +
        `Responde *SÍ* para confirmar o *NO* para cancelar.`;

      return {
        result: { ready: true, confirmText },
        pendingWithdrawal: {
          telefono: cleanWTel,
          destinationClabe: destClabe,
          amountMXN: amtMxn,
          beneficiaryName: beneName,
          walletBalance: wBalance,
        },
      };
    }

    case "prepare_p2p_transfer": {
      const senderRaw = ((input.telefono as string | undefined) ?? resolvedTelefono ?? "").trim();
      const recipientRaw = ((input.recipient_phone as string | undefined) ?? "").trim();
      const amtMxn = Number(input.amount_mxn ?? 0);
      const memo = ((input.memo as string | undefined) ?? "").trim();

      const senderNorm = senderRaw.replace(/\D/g, "").slice(-10);
      const recipientNorm = recipientRaw.replace(/\D/g, "").slice(-10);

      if (recipientNorm.length < 10) {
        return { result: { error: "Número de teléfono del destinatario inválido. Pídele que te confirme su número completo." } };
      }
      if (senderNorm === recipientNorm) {
        return { result: { error: "No puedes enviarte dinero a ti mismo." } };
      }
      if (amtMxn < 10) {
        return { result: { error: "El monto mínimo de transferencia entre usuarios es $10 MXN." } };
      }
      if (amtMxn > 2500) {
        return { result: { error: "El límite diario de transferencias entre usuarios es $2,500 MXN." } };
      }

      // Look up recipient
      const [recipientRow] = await db
        .select({ telefono: usersTable.telefono, kycFullName: usersTable.kycFullName })
        .from(usersTable)
        .where(eq(usersTable.telefono, recipientNorm))
        .limit(1);

      if (!recipientRow) {
        return {
          result: {
            error: `Ese número (+${recipientNorm}) todavía no tiene cuenta PagoYa. Para registrarse es gratis — solo necesitan escribirle a este mismo número de WhatsApp o entrar a pagoyamx.com.`,
          },
        };
      }

      const recipientName = recipientRow.kycFullName
        ? recipientRow.kycFullName.split(" ")[0]
        : `+${recipientNorm}`;

      // Check sender balance
      const cleanSender = senderRaw.startsWith("+") ? senderRaw : `+${senderRaw}`;
      const [walletRow] = await db
        .select({ balance_mxn: walletsTable.balanceMxn })
        .from(walletsTable)
        .where(eq(walletsTable.userId, cleanSender))
        .limit(1);

      const senderBalance = walletRow ? Number(walletRow.balance_mxn) : 0;

      if (senderBalance < amtMxn) {
        return {
          result: {
            error: `Saldo insuficiente. Tienes $${senderBalance.toFixed(2)} MXN pero quieres enviar $${amtMxn.toFixed(2)} MXN.`,
          },
        };
      }

      const confirmText =
        `💸 *Resumen de transferencia*\n\n` +
        `💰 Monto: $${amtMxn.toFixed(2)} MXN\n` +
        `👤 Para: ${recipientName} (****${recipientNorm.slice(-4)})\n` +
        (memo ? `📝 Nota: ${memo}\n` : "") +
        `💳 Comisión: Sin comisión ✅\n` +
        `⚡ Llega: al instante\n\n` +
        `Saldo actual: $${senderBalance.toFixed(2)} MXN\n` +
        `Saldo después de enviar: $${(senderBalance - amtMxn).toFixed(2)} MXN\n\n` +
        `Responde *SÍ* para confirmar o *NO* para cancelar.`;

      return {
        result: { ready: true, confirmText },
        pendingP2P: {
          senderTelefono: cleanSender,
          recipientTelefono: recipientNorm,
          recipientName,
          amountMXN: amtMxn,
          walletBalance: senderBalance,
          memo: memo || undefined,
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
    lang,
  } = req.body as {
    message?: string;
    telefono?: string;
    history?: Array<{ role: "user" | "assistant"; content: string }>;
    profileName?: string | null;
    lang?: "es" | "en" | null;
  };

  if (!message || message.trim().length === 0) {
    res.status(400).json({ reply: "Mensaje vacío.", escalated: false });
    return;
  }

  try {
    // Fetch PTI for tone personalization — non-blocking, degrades gracefully
    let ptiTier: string | null = null;
    let ptiScore: number | null = null;
    if (telefono) {
      try {
        const ptiRow = await db.execute(
          sql`SELECT tier, pago_score FROM credit_profiles WHERE telefono = ${telefono} LIMIT 1`
        );
        if (ptiRow.rows.length > 0) {
          const r = ptiRow.rows[0] as Record<string, unknown>;
          ptiTier = (r.tier as string) ?? null;
          ptiScore = r.pago_score != null ? Number(r.pago_score) : null;
        }
      } catch { /* PTI unavailable — Paula falls back to neutral tone */ }
    }

    const messages: MessageParam[] = [
      ...history.map((h) => ({ role: h.role, content: h.content })),
      { role: "user", content: message.trim() },
    ];

    let escalated = false;
    let finalReply = "";
    let stagedPayment: PendingPaymentStage | undefined;
    let stagedWithdrawal: PendingWithdrawalStage | undefined;
    let stagedP2P: { senderTelefono: string; recipientTelefono: string; recipientName: string; amountMXN: number; walletBalance: number; memo?: string } | undefined;

    for (let i = 0; i < 5; i++) {
      const response = await (anthropic.messages.create as (p: unknown) => Promise<{
        stop_reason: string;
        content: ContentBlock[];
      }>)({
        model: "claude-sonnet-4-5",
        max_tokens: 1024,
        system: buildSystemPrompt(profileName, ptiTier, ptiScore, lang),
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
            const { result, pendingPayment, pendingWithdrawal, pendingP2P } = await executeToolCall(tb.name, tb.input, telefono ?? null);
            if (tb.name === "escalate_to_support") escalated = true;
            if (pendingPayment) stagedPayment = pendingPayment;
            if (pendingWithdrawal) stagedWithdrawal = pendingWithdrawal;
            if (pendingP2P) stagedP2P = pendingP2P;
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

    logger.info({ escalated, msgLen: message.length, hasStagedPayment: !!stagedPayment, hasStagedWithdrawal: !!stagedWithdrawal, hasStagedP2P: !!stagedP2P }, "agentChat: success");
    res.json({ reply: finalReply, escalated, pendingPayment: stagedPayment ?? null, pendingWithdrawal: stagedWithdrawal ?? null, pendingP2P: stagedP2P ?? null });
  } catch (err) {
    logger.error({ err }, "agentChat: error");
    res.json({ reply: "Lo sentimos, ocurrió un error. Intenta de nuevo.", escalated: false, pendingPayment: null });
  }
});

export default router;
