import { Router, type Request, type Response } from "express";
import { eq, sql as drizzleSql } from "drizzle-orm";
import { db, usersTable, walletsTable, signupBonusConfigTable } from "@workspace/db";
import { sendWhatsApp } from "../lib/whatsapp.js";
import { getSession, saveSession, type PendingWithdrawalSession, type PendingP2PSession } from "../services/whatsapp-sessions.js";
import {
  createPendingPayment,
  getPendingPayment,
  confirmPendingPayment,
  deletePendingPayment,
  type PendingPaymentRow,
} from "../services/pendingPaymentService.js";
import { creditSignupBonus } from "../services/signupBonusService.js";
import { scheduleNudge } from "../services/nudgeService.js";
import { scheduleReferralNudgeIfEligible } from "../services/lifecycleNudgeService.js";
import { logger } from "../lib/logger.js";

// ── Language detection ────────────────────────────────────────────────────────
// Strong English-only indicators (words that don't appear naturally in Spanish)
const ENGLISH_STRONG = /\b(hi|hello|hey|help|pay|balance|account|register|english|i want|i need|i have|i don|transfer|withdraw|top.?up|gift.?card|please|thank you|thanks|send|money|bill|wallet|deposit|charge|recharge|how do|what is|i need help)\b/i;

// Words that are too ambiguous (appear naturally in Spanish) — excluded:
// "no", "cancel", "cancel", "what", "how", "yes", "service", "recharge"
// "no" → very common Spanish word ("No tengo cuenta")
// "cancel" → used as loanword in Mexican Spanish

function detectLang(msg: string): "es" | "en" {
  return ENGLISH_STRONG.test(msg) ? "en" : "es";
}

// ── Paula message topic classifier ───────────────────────────────────────────
// Classifies each inbound Paula message into a topic bucket.
// Powers users.financial_curiosity_index (proactive / total ratio in PTI v4.0).
// Buckets: savings_goal | pti_inquiry | balance_check | bill_lookup | complaint | cost_inquiry | other
function classifyPaulaMessage(body: string): string {
  const b = body.toLowerCase().trim();
  if (/ahorro|ahorrar|guardar dinero|meta|objetivo|presupuesto|budget|ahorros/.test(b))
    return "savings_goal";
  if (/puntaje|pti|score|calificaci|confianza|historial financiero|credito|trust index/.test(b))
    return "pti_inquiry";
  if (/saldo|cuanto tengo|balance|mi dinero|mi billetera|cuánto me queda/.test(b))
    return "balance_check";
  if (/pagar|pago|servicio|cfe|agua|telmex|recibo|luz|predial|gas|internet|telefono|factura/.test(b))
    return "bill_lookup";
  if (/queja|problema|error|fallo|no funciona|no puedo|no me deja|mal|ayuda urgente/.test(b))
    return "complaint";
  if (/cuanto cuesta|comisi|cobro|fee|cargo|costo|tarifa/.test(b))
    return "cost_inquiry";
  return "other";
}

// Explicit language-switch commands — work at any point in the conversation
const SWITCH_TO_ENGLISH = /^(english|switch to english|in english|en inglés|en english|speak english|habla inglés)\s*[!.]*$/i;
const SWITCH_TO_SPANISH = /^(español|en español|spanish|habla español|switch to spanish|en español por favor)\s*[!.]*$/i;

// ── Bilingual message strings ─────────────────────────────────────────────────
type Lang = "es" | "en";

const m = {
  invalidName: (lang: Lang) => lang === "en"
    ? "Please tell me your full name including at least one last name (letters only, no numbers). For example: *Maria Gonzalez* or *Carlos Ruiz Lopez*."
    : "Por favor dime tu nombre completo incluyendo al menos un apellido (solo letras, sin números). Por ejemplo: *María González* o *Carlos Ruiz López*.",

  invalidNameTooShort: (lang: Lang) => lang === "en"
    ? "I need your full name — please include your last name too. For example: *Maria Gonzalez* or *Carlos Ruiz Lopez*."
    : "Necesito tu nombre completo — por favor incluye también tu apellido. Por ejemplo: *María González* o *Carlos Ruiz López*.",

  registrationError: (lang: Lang) => lang === "en"
    ? "Sorry, I had a problem creating your account. Please try again in a moment."
    : "Lo siento, tuve un problema al crear tu cuenta. Por favor intenta de nuevo en un momento.",

  registrationSuccess: (lang: Lang, firstName: string, _phoneKey: string, _rawName: string, bonusAmount: number) => {
    if (lang === "en") {
      if (bonusAmount > 0) {
        return (
          `✅ *Done, ${firstName}!* Your PagoYa account is active.\n\n` +
          `🎁 We loaded *$${bonusAmount.toFixed(0)} MXN* as a welcome gift — use it right now to pay CFE, Telmex, water, or top up your phone, no OXXO visit needed first.\n\n` +
          `What service do you want to pay?`
        );
      }
      return (
        `✅ *Done, ${firstName}!* Your PagoYa account is active.\n\n` +
        `You can pay CFE, Telmex, water, top up any phone, and more — right here in WhatsApp.\n\n` +
        `What service do you want to pay?`
      );
    }
    if (bonusAmount > 0) {
      return (
        `✅ *¡Listo, ${firstName}!* Tu cuenta PagoYa está activa.\n\n` +
        `🎁 Te cargamos *$${bonusAmount.toFixed(0)} MXN* de regalo — úsalos ahora mismo para pagar tu CFE, Telmex, agua o recargar tu celular, sin ir al OXXO primero.\n\n` +
        `¿Qué servicio quieres pagar?`
      );
    }
    return (
      `✅ *¡Listo, ${firstName}!* Tu cuenta PagoYa está activa.\n\n` +
      `Puedes pagar CFE, Telmex, agua, recargar cualquier celular y más — aquí mismo en WhatsApp.\n\n` +
      `¿Qué servicio quieres pagar?`
    );
  },

  newUserGreeting: (lang: Lang, _firstName: string): string => {
    if (lang === "en") {
      return (
        `👋 Hi! I'm *Paula*, your PagoYa assistant.\n\n` +
        `I help you pay CFE, Telmex, water, mobile top-ups and more — right here in WhatsApp, no bank account needed. Load cash at any OXXO and it's available instantly.\n\n` +
        `What's your *full name* so I can create your free account?`
      );
    }
    return (
      `¡Hola! 👋 Soy *Paula*, tu asistente de PagoYa.\n\n` +
      `Te ayudo a pagar CFE, Telmex, agua, recargas y más — todo aquí en WhatsApp, sin cuenta bancaria ni filas. Tu saldo lo cargas en efectivo en cualquier OXXO y queda disponible al instante.\n\n` +
      `¿Me dices tu *nombre completo* para crear tu cuenta gratis?`
    );
  },

  securityFAQ: (lang: Lang): string => lang === "en"
    ? `🔒 *Yes, it's safe.*\n\nEvery payment goes through *STP (Sistema de Transferencias y Pagos)* — the Bank of Mexico's official payment network, the same one used by Banamex and BBVA. Your payments carry an official folio ID.\n\nNo bank account needed. Just your name to register.`
    : `🔒 *Sí, es seguro.*\n\nTodos los pagos viajan por *STP (Sistema de Transferencias y Pagos)* — la red oficial del Banco de México, la misma que usan Banamex y BBVA. Tus pagos quedan respaldados con folio oficial.\n\nNo necesitas cuenta bancaria. Solo tu nombre para registrarte.`,

  repGreeting: (lang: Lang, firstName: string) => {
    if (lang === "en") {
      return (
        `Hello${firstName ? ` ${firstName}` : ""}! Welcome to PagoYa 👋\n` +
        `I'm Paula, PagoYa's official assistant — a Mexican digital payments company.\n\n` +
        `How can I help you today?\n` +
        `Type *PAY* to pay a bill, or *BALANCE* to check your wallet.`
      );
    }
    return (
      `¡Hola${firstName ? ` ${firstName}` : ""}! Bienvenido a PagoYa 👋\n` +
      `Soy Paula, la asistente oficial de PagoYa Technologies — empresa mexicana de pagos digitales.\n\n` +
      `¿En qué te puedo ayudar hoy?\n` +
      `Escribe *PAGAR* para pagar un servicio, o *SALDO* para consultar tu saldo.`
    );
  },

  paymentCancelled: (lang: Lang) => lang === "en"
    ? "❌ Payment cancelled. How else can I help you?"
    : "❌ Pago cancelado. ¿En qué más te puedo ayudar?",

  p2pProcessing: (lang: Lang, amount: number, recipientName: string) => lang === "en"
    ? `⏳ Sending *$${amount.toFixed(2)} MXN* to ${recipientName}...`
    : `⏳ Enviando *$${amount.toFixed(2)} MXN* a ${recipientName}...`,

  p2pSuccess: (lang: Lang, amount: number, recipientName: string, newBalance: number) => lang === "en"
    ? `✅ *Transfer sent!*\n\n💸 $${amount.toFixed(2)} MXN → ${recipientName}\n💳 No fee\n\nYour new balance: *$${newBalance.toFixed(2)} MXN*`
    : `✅ *¡Transferencia enviada!*\n\n💸 $${amount.toFixed(2)} MXN → ${recipientName}\n💳 Sin comisión\n\nTu saldo actual: *$${newBalance.toFixed(2)} MXN*`,

  p2pFailed: (lang: Lang, amount: number, reason: string) => lang === "en"
    ? `❌ The transfer of *$${amount.toFixed(2)} MXN* could not be completed.\n\n${reason}\n\nYour balance was not affected.`
    : `❌ La transferencia de *$${amount.toFixed(2)} MXN* no se pudo completar.\n\n${reason}\n\nTu saldo no fue afectado.`,

  p2pCancelled: (lang: Lang) => lang === "en"
    ? "Transfer cancelled. Anything else I can help you with?"
    : "Transferencia cancelada. ¿En qué más te puedo ayudar?",

  ambiguousP2P: (lang: Lang, amount: number, recipientName: string) => lang === "en"
    ? `Please reply *SÍ* to confirm the $${amount.toFixed(2)} MXN transfer to ${recipientName}, or *NO* to cancel.`
    : `Por favor responde *SÍ* para confirmar el envío de $${amount.toFixed(2)} MXN a ${recipientName}, o *NO* para cancelar.`,

  withdrawalCancelled: (lang: Lang) => lang === "en"
    ? "❌ Withdrawal cancelled. Your balance was not affected. How else can I help you?"
    : "❌ Retiro cancelado. Tu saldo no fue afectado. ¿En qué más te puedo ayudar?",

  paymentConnecting: (lang: Lang, serviceName: string) => lang === "en"
    ? `⏳ Connecting to ${serviceName}...`
    : `⏳ Conectando con ${serviceName}...`,

  paymentSending: (lang: Lang) => lang === "en"
    ? `🔄 Processing your payment...`
    : `🔄 Procesando tu pago...`,

  paymentProcessing: (lang: Lang, serviceName: string) => lang === "en"
    ? `⏱️ Still connecting with ${serviceName}. One more moment.`
    : `⏱️ Conectando con ${serviceName}, un momento más.`,

  paymentSuccess: (lang: Lang, pending: PendingPaymentRow, folio: string, nowMx: string) => {
    if (lang === "en") {
      return (
        `✅ *PagoYa | Official Receipt*\n` +
        `──────────────────\n` +
        `Service: ${pending.serviceName}\n` +
        `Amount: $${pending.monto.toFixed(2)} MXN\n` +
        `Fee: $${pending.fee.toFixed(2)} MXN\n` +
        `Confirmation Folio: ${folio}\n` +
        `Date: ${nowMx}\n` +
        `──────────────────\n` +
        `Your payment is backed by STP/SPEI — the Bank of Mexico's payment system.\n` +
        `Save this message as your official receipt.`
      );
    }
    return (
      `✅ *PagoYa | Comprobante Oficial*\n` +
      `──────────────────\n` +
      `Servicio: ${pending.serviceName}\n` +
      `Monto: $${pending.monto.toFixed(2)} MXN\n` +
      `Comisión: $${pending.fee.toFixed(2)} MXN\n` +
      `Folio de confirmación: ${folio}\n` +
      `Fecha: ${nowMx}\n` +
      `──────────────────\n` +
      `Tu pago está respaldado por STP/SPEI — sistema de pagos del Banco de México.\n` +
      `Conserva este mensaje como comprobante oficial.`
    );
  },

  paymentFailed: (lang: Lang, pending: PendingPaymentRow, incCode: string, cause: string) => {
    if (lang === "en") {
      return (
        `❌ *PagoYa | Payment Not Processed*\n` +
        `──────────────────\n` +
        `Service: ${pending.serviceName}\n` +
        `Amount: $${pending.monto.toFixed(2)} MXN\n` +
        `Status: Not completed\n` +
        `Code: ${incCode}\n` +
        `──────────────────\n` +
        `⚠️ Your money was NOT deducted from your wallet.\n` +
        `Current balance: $${pending.walletBalance.toFixed(2)} MXN ✓\n` +
        `Reason: ${cause}\n\n` +
        `Type *HELP* to speak with support, or try again.`
      );
    }
    return (
      `❌ *PagoYa | Pago No Procesado*\n` +
      `──────────────────\n` +
      `Servicio: ${pending.serviceName}\n` +
      `Monto: $${pending.monto.toFixed(2)} MXN\n` +
      `Estado: No completado\n` +
      `Código: ${incCode}\n` +
      `──────────────────\n` +
      `⚠️ Tu saldo NO fue deducido.\n` +
      `Saldo actual: $${pending.walletBalance.toFixed(2)} MXN ✓\n` +
      `Causa: ${cause}\n\n` +
      `Escribe *AYUDA* para hablar con soporte, o intenta de nuevo.`
    );
  },

  askColonia: (lang: Lang) => lang === "en"
    ? `Great! One quick question — which *neighborhood (colonia)* do you live in?\n\nThis helps us personalize your experience. (You can type "skip" to continue without it.)`
    : `¡Perfecto! Una pregunta rápida — ¿en qué *colonia* vives?\n\nEsto nos ayuda a personalizar tu experiencia. (Escribe "saltar" si prefieres no decirlo.)`,

  ambiguousPayment: (lang: Lang) => lang === "en"
    ? "Please reply *YES* to confirm or *CANCEL* to cancel the payment."
    : "Por favor responde *SÍ* para confirmar o *CANCELAR* para cancelar el pago.",

  ambiguousWithdrawal: (lang: Lang) => lang === "en"
    ? "Please reply *YES* to confirm the withdrawal or *NO* to cancel."
    : "Por favor responde *SÍ* para confirmar el retiro o *NO* para cancelar.",

  withdrawalProcessing: (lang: Lang, amountMXN: number) => lang === "en"
    ? `⏳ Processing your SPEI withdrawal of $${amountMXN.toFixed(2)} MXN...`
    : `⏳ Procesando tu retiro SPEI de $${amountMXN.toFixed(2)} MXN...`,

  withdrawalSuccess: (lang: Lang, pendingW: PendingWithdrawalSession, maskedClabe: string, claveRastreo: string, nowMx: string, newBalance: number) => {
    if (lang === "en") {
      return (
        `✅ *PagoYa | SPEI Transfer Sent*\n` +
        `──────────────────\n` +
        `💰 Amount sent: $${pendingW.amountMXN.toFixed(2)} MXN\n` +
        `🏦 Destination CLABE: ${maskedClabe}\n` +
        `👤 Account holder: ${pendingW.beneficiaryName}\n` +
        `🔑 Tracking key: ${claveRastreo}\n` +
        `📅 Date: ${nowMx}\n` +
        `──────────────────\n` +
        `Your money is on its way via SPEI — arrives in minutes.\n` +
        `Remaining balance: $${newBalance.toFixed(2)} MXN\n\n` +
        `Save this message as your receipt.`
      );
    }
    return (
      `✅ *PagoYa | Retiro SPEI Enviado*\n` +
      `──────────────────\n` +
      `💰 Monto enviado: $${pendingW.amountMXN.toFixed(2)} MXN\n` +
      `🏦 CLABE destino: ${maskedClabe}\n` +
      `👤 Titular: ${pendingW.beneficiaryName}\n` +
      `🔑 Clave rastreo: ${claveRastreo}\n` +
      `📅 Fecha: ${nowMx}\n` +
      `──────────────────\n` +
      `Tu dinero está en camino por SPEI — llega en minutos.\n` +
      `Saldo restante: $${newBalance.toFixed(2)} MXN\n\n` +
      `Guarda este mensaje como comprobante.`
    );
  },

  withdrawalFailed: (lang: Lang, pendingW: PendingWithdrawalSession, reason: string, error: string) => {
    if (lang === "en") {
      return (
        `❌ *PagoYa | Transfer Not Processed*\n` +
        `──────────────────\n` +
        `Amount: $${pendingW.amountMXN.toFixed(2)} MXN\n` +
        `Status: Not completed\n` +
        `──────────────────\n` +
        `⚠️ ${reason}\n` +
        `Reason: ${error}\n\n` +
        `Type *HELP* to speak with support.`
      );
    }
    return (
      `❌ *PagoYa | Retiro No Procesado*\n` +
      `──────────────────\n` +
      `Monto: $${pendingW.amountMXN.toFixed(2)} MXN\n` +
      `Estado: No completado\n` +
      `──────────────────\n` +
      `⚠️ ${reason}\n` +
      `Causa: ${error}\n\n` +
      `Escribe *AYUDA* para hablar con soporte.`
    );
  },

  withdrawalNetworkError: (lang: Lang) => lang === "en"
    ? "❌ Network error processing the transfer. Your balance was not affected. Please try again."
    : "❌ Error de red al procesar el retiro. Tu saldo no fue afectado. Intenta de nuevo.",

  generalError: (lang: Lang, incCode: string) => lang === "en"
    ? `Sorry, something went wrong right now.\nIncident code: ${incCode}\nYour balance was not affected.\n\nType *HELP* or visit pagoyamx.com for support.`
    : `Lo siento, algo salió mal en este momento.\nCódigo de incidencia: ${incCode}\nTu saldo no fue afectado.\n\nEscribe *AYUDA* o visita pagoyamx.com para soporte.`,
};

// ── WhatsApp registration helpers ────────────────────────────────────────────

async function isRegistered(phoneKey: string): Promise<boolean> {
  const clean = phoneKey.replace(/\D/g, "").slice(-10);
  const [row] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.telefono, clean))
    .limit(1);
  return !!row;
}

async function registerWhatsAppUser(
  phoneKey: string,
  name: string,
  colonia?: string,
): Promise<{ userId: number; bonusAmount: number }> {
  const clean = phoneKey.replace(/\D/g, "").slice(-10);

  // Upsert user
  const [newUser] = await db
    .insert(usersTable)
    .values({
      telefono: clean,
      kycFullName: name.trim(),
      signupBonusEligible: true,
      signupRefCode: "WEB",
      signupSource: "whatsapp_organic",
    })
    .onConflictDoNothing()
    .returning({ id: usersTable.id });

  let userId: number;
  if (newUser) {
    userId = newUser.id;
  } else {
    const [existing] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.telefono, clean))
      .limit(1);
    userId = existing!.id;
    // Backfill name + source if the user pre-existed with no name (e.g. partial web flow)
    await db.execute(drizzleSql`
      UPDATE users
      SET kyc_full_name = ${name.trim()},
          signup_source  = 'whatsapp_organic'
      WHERE telefono = ${clean}
        AND (kyc_full_name IS NULL OR kyc_full_name = '')
    `);
  }

  // Write colonia if captured (fire-and-forget — never blocks registration)
  if (colonia) {
    db.execute(drizzleSql`UPDATE users SET colonia = ${colonia.trim()} WHERE telefono = ${clean}`)
      .catch(() => {});
  }

  // Create wallet (idempotent)
  await db.insert(walletsTable).values({ userId: clean }).onConflictDoNothing();

  // Assign STP CLABE fire-and-forget
  if (process.env.STP_ENABLED === "true") {
    import("../services/stpService.js")
      .then(({ assignClabeToUser }) => assignClabeToUser(clean, userId, { fullName: name.trim() }))
      .catch((err) => logger.error({ err, clean }, "whatsapp-register: STP CLABE assignment failed"));
  }

  // Credit signup bonus (reads amount from config row id=1)
  let bonusAmount = 0;
  try {
    const [config] = await db
      .select({ isActive: signupBonusConfigTable.isActive, bonusAmount: signupBonusConfigTable.bonusAmount })
      .from(signupBonusConfigTable)
      .where(eq(signupBonusConfigTable.id, 1))
      .limit(1);

    if (config?.isActive) {
      const creditAmount = parseFloat(config.bonusAmount ?? "0");
      if (creditAmount > 0) {
        const result = await creditSignupBonus(userId, "WEB", creditAmount);
        if (result.success) bonusAmount = result.amount ?? creditAmount;
      }
    }
  } catch (err) {
    logger.error({ err, clean }, "whatsapp-register: bonus credit failed (non-fatal)");
  }

  logger.info({ userId, clean, bonusAmount }, "whatsapp-register: user created via WhatsApp");
  return { userId, bonusAmount };
}

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
    return "Tu cartera PagoYa no tiene saldo suficiente.\n\nPara cargar en OXXO: escribe *SALDO* y te mando el código de depósito al instante. También puedes cargar con tarjeta o transferencia SPEI.\n\nEscribe *SALDO* y continuamos.";
  }
  // SIPREL error 2 — CFE / biller account not found
  if (e.includes("DESTINATION_UNAVAILABLE")) {
    return `No encontramos esa cuenta en ${serviceName}. Verifica tu número de contrato. ¿Necesitas ayuda? Marca 071 (gratis).`;
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
    return "El proveedor tardó demasiado en confirmar. Es posible que el pago esté en proceso — espera 5 min y revisa tu historial antes de reintentar.";
  }
  // Network / fetch error
  if (e.includes("NETWORK") || e.includes("FETCH") || e.includes("CONEXIÓN") || e.includes("CONNECTION")) {
    return "Error de conexión al procesar. Intenta de nuevo en unos segundos.";
  }
  return "Error técnico al procesar el pago. Tu saldo no fue afectado.";
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
function buildConfirmationMessage(pending: PendingPaymentRow, lang: Lang = "es"): string {
  const total = pending.monto + pending.fee;
  const feeNote = pending.fee > 0
    ? (lang === "en"
        ? `$${total.toFixed(2)} MXN (includes $${pending.fee.toFixed(0)} fee)`
        : `$${total.toFixed(2)} MXN (incluye comisión $${pending.fee.toFixed(0)})`)
    : (lang === "en"
        ? `$${total.toFixed(2)} MXN (no fee 🎁)`
        : `$${total.toFixed(2)} MXN (sin comisión 🎁)`);

  const referenciaLine = pending.referencia && pending.referencia !== pending.telefono
    ? (lang === "en" ? `\n📋 Reference: ${pending.referencia}` : `\n📋 Referencia: ${pending.referencia}`)
    : "";

  const method = pending.paymentMethod ?? (lang === "en" ? "PagoYa Balance" : "Saldo PagoYa");

  if (lang === "en") {
    return (
      `✅ Payment Summary:\n` +
      `──────────────────\n` +
      `🏢 Service: ${pending.serviceName}` +
      referenciaLine +
      `\n💰 Amount: $${pending.monto.toFixed(2)} MXN` +
      `\n💳 Total charge: ${feeNote}` +
      `\n👛 Method: ${method} (Balance: $${pending.walletBalance.toFixed(2)} MXN)` +
      `\n🏦 Payment network: STP (Bank of Mexico)` +
      `\n──────────────────\n\n` +
      `Confirm this payment?\n` +
      `Reply *YES* to continue or *CANCEL* to cancel.`
    );
  }
  return (
    `✅ Resumen de pago:\n` +
    `──────────────────\n` +
    `🏢 Servicio: ${pending.serviceName}` +
    referenciaLine +
    `\n💰 Monto: $${pending.monto.toFixed(2)} MXN` +
    `\n💳 Cargo total: ${feeNote}` +
    `\n👛 Método: ${method} (Saldo: $${pending.walletBalance.toFixed(2)} MXN)` +
    `\n🏦 Red de pago: STP (Banco de México)` +
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
  const phoneKey = (() => {
    const raw = rawWaId.replace(/^whatsapp:\+?/i, "").replace(/\D/g, "");
    // Mexico: WhatsApp sometimes sends 521XXXXXXXXXX (13 digits, legacy mobile prefix).
    // Correct E.164 is 52XXXXXXXXXX (12 digits). Strip the extra 1.
    if (/^521\d{10}$/.test(raw)) return "52" + raw.slice(3);
    return raw;
  })();

  // Paula inbound log — fire-and-forget, same pattern as paula_interaction events
  // topic_category powers financial_curiosity_index in PTI v4.0 (proactive/total ratio)
  db.execute(sql`
    INSERT INTO paula_inbound_log (telefono, received_at, message_body, message_length, topic_category)
    VALUES (
      ${phoneKey},
      NOW(),
      ${userMessage ?? null},
      ${userMessage ? userMessage.length : null},
      ${classifyPaulaMessage(userMessage ?? '')}
    )
  `).catch(() => {}); // never block the response on log failure

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

    // ── Language detection + explicit switch commands ─────────────────────────
    if (SWITCH_TO_ENGLISH.test(userMessage.trim())) {
      saveSession(phoneKey, { lang: "en" });
      session.lang = "en";
      await sendWhatsApp(phoneKey, "Got it! I'll continue in English from now on. How can I help you?");
      return;
    }
    if (SWITCH_TO_SPANISH.test(userMessage.trim())) {
      saveSession(phoneKey, { lang: "es" });
      session.lang = "es";
      await sendWhatsApp(phoneKey, "¡Listo! Seguimos en español. ¿En qué te puedo ayudar?");
      return;
    }

    // ── Founder content calendar shortcut ────────────────────────────────────
    if (/^(content calendar|calendar|calendario de contenido|calendario contenido|contenido|weekly post)$/i.test(userMessage.trim())) {
      const CALENDAR = [
        { week: 1, date: "Jul 1",  status: "✅ Ready",     title: "The Abuela story — article distillation" },
        { week: 2, date: "Jul 8",  status: "📝 Draft",     title: "What $58B in US-MX remittances tells you about creditworthiness" },
        { week: 3, date: "Jul 15", status: "📝 Draft",     title: "The problem with calling it 'financial inclusion'" },
        { week: 4, date: "Jul 22", status: "📝 Draft",     title: "What 90 behavioral dimensions tell you that a FICO score can't" },
        { week: 5, date: "Jul 29", status: "📝 Draft",     title: "Why WhatsApp is the world's most underrated financial data layer" },
        { week: 6, date: "Aug 5",  status: "📝 Draft",     title: "Nearshoring created 500K new earners with zero credit files" },
        { week: 7, date: "Aug 12", status: "📝 Draft",     title: "The woman who paid her electricity bill for 22 years in cash" },
        { week: 8, date: "Aug 19", status: "📝 Draft",     title: "Why remittance corridors are behavioral data goldmines" },
      ];
      const lines = CALENDAR.map(w => `W${w.week} (${w.date}) ${w.status}\n${w.title}`).join("\n\n");
      await sendWhatsApp(phoneKey, `📅 *PagoYa Content Calendar — Behavioral Credit Data*\n\n${lines}\n\n_Post Tuesdays. Link to article in first comment, not the post body._`);
      return;
    }

    // Auto-detect on first message only (never downgrade en → es)
    if (!session.lang || session.lang === "es") {
      const detected = detectLang(userMessage);
      if (detected === "en") {
        saveSession(phoneKey, { lang: "en" });
        session.lang = "en";
      }
    }
    const lang: Lang = session.lang ?? "es";

    // ── Rep-code detection (first message only) ──────────────────────────────
    if (!session.repCode) {
      const match = REP_CODE_PATTERN.exec(userMessage);
      if (match) {
        saveSession(phoneKey, { repCode: match[1], profileName });
        const firstName = (profileName || "").split(" ")[0] || profileName || "";
        await sendWhatsApp(phoneKey, m.repGreeting(lang, firstName));
        return;
      }
    }

    // ── OXXO load complaint detection ─────────────────────────────────────────
    const OXXO_COMPLAINT_RE = /pagu[eé]\s+(en\s+)?oxxo|oxxo.*(no|no\s+se).*(aparece|carg|llega|actualiz|reflej)|cargué.*oxxo|deposité.*oxxo|ticket.*oxxo|saldo.*oxxo|oxxo.*saldo|no.*aparece.*saldo/i;
    if (OXXO_COMPLAINT_RE.test(userMessage)) {
      const adminNumber = process.env.ADMIN_WHATSAPP_NUMBER;
      if (adminNumber) {
        sendWhatsApp(adminNumber,
          `🔴 *OXXO Load Complaint*\nPhone: +${phoneKey}\nMessage: "${userMessage.slice(0, 200)}"\nTime: ${new Date().toLocaleString("es-MX", { timeZone: "America/Mexico_City" })}`
        ).catch(() => {});
      }
      const reply = lang === "en"
        ? `Thanks for reaching out! 🙏\n\nOXXO deposits usually update in *5–15 minutes*. If your balance still hasn't appeared:\n\n1️⃣ Check your OXXO receipt — confirm the reference number matches your PagoYa account\n2️⃣ Send a *photo of your receipt* here — our team will manually verify your deposit within *1 hour*\n\nWe've already alerted our support team to look out for your transaction. You're not alone! 💪`
        : `¡Gracias por avisarnos! 🙏\n\nLos depósitos en OXXO normalmente se reflejan en *5–15 minutos*. Si tu saldo todavía no aparece:\n\n1️⃣ Revisa tu ticket de OXXO y confirma que la referencia corresponda a tu cuenta PagoYa\n2️⃣ Mándanos *foto de tu ticket* aquí — nuestro equipo verificará tu depósito manualmente en *1 hora*\n\nYa alertamos a nuestro equipo de soporte para buscar tu transacción. ¡Estamos contigo! 💪`;
      await sendWhatsApp(phoneKey, reply);
      return;
    }

    // Save profileName on first real message if not yet stored
    if (!session.profileName && profileName) {
      saveSession(phoneKey, { profileName });
    }

    // ── New-user registration flow ───────────────────────────────────────────
    // Step 3: colonia submitted — finish registration
    if (session.awaitingColonia && session.pendingRegistration) {
      const coloniaRaw = userMessage.trim();
      const skip = /^(saltar|skip|no|omitir|ninguna|nada|-)$/i.test(coloniaRaw);

      // If the message looks like a question, answer it via Claude then re-ask for colonia
      const QUESTION_RE_COL = /^(qué|que|cómo|como|cuánto|cuanto|cuál|cual|para qué|para que|por qué|por que|cuándo|cuando|dónde|donde|es que|puedo|pueden|hay|tiene|tienes|sirve|funciona|cuanto vale|cuánto vale|cuánto cuesta|cuanto cuesta|qué es|que es|cómo funciona|como funciona|no entiendo|no sé|gratis|cobr|carg|deposit)/i;
      if (!skip && QUESTION_RE_COL.test(coloniaRaw)) {
        try {
          const agentRes = await fetch(`http://localhost:${port}/api/agent/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: userMessage, telefono: `+${phoneKey}`, history: session.conversationHistory, profileName: session.profileName ?? profileName ?? null, lang }),
          });
          if (agentRes.ok) {
            const { reply } = await agentRes.json() as { reply: string };
            const reAsk = lang === "en"
              ? `\n\nJust one last thing — which *neighborhood* do you live in? (Or type "skip" to continue.)`
              : `\n\nNada más dime — ¿en qué *colonia* vives? (O escribe "saltar" para continuar.)`;
            await sendWhatsApp(phoneKey, reply + reAsk);
            return;
          }
        } catch { /* fall through to normal colonia handling */ }
      }

      const colonia = skip ? undefined : coloniaRaw.slice(0, 100);
      const { name } = session.pendingRegistration;
      saveSession(phoneKey, { awaitingColonia: false, pendingRegistration: undefined });
      try {
        const { userId, bonusAmount } = await registerWhatsAppUser(phoneKey, name, colonia);
        const firstName = name.split(" ")[0];
        await sendWhatsApp(phoneKey, m.registrationSuccess(lang, firstName, phoneKey, name, bonusAmount));
        // Wedge 1 — fire 10-min activation nudge
        scheduleNudge(userId);
      } catch (err) {
        logger.error({ err, phoneKey }, "whatsapp-agent: registration failed (colonia step)");
        await sendWhatsApp(phoneKey, m.registrationError(lang));
        saveSession(phoneKey, { awaitingColonia: true, pendingRegistration: session.pendingRegistration });
      }
      return;
    }

    // Step 2: we already asked for name — this message IS the name
    if (session.awaitingName) {
      const rawName = userMessage.trim();

      // Detect off-topic questions mid-registration — answer, then re-ask for name
      const QUESTION_RE = /^(qué|que|cómo|como|cuánto|cuanto|cuál|cual|para qué|para que|por qué|por que|cuándo|cuando|dónde|donde|es que|puedo|pueden|hay|tiene|tienes|sirve|funciona|cuanto vale|cuánto vale|cuánto cuesta|cuanto cuesta|qué es|que es|cómo funciona|como funciona|no entiendo|no sé|a qué|a que|gratis|cobr|carg|deposit)/i;
      if (QUESTION_RE.test(rawName)) {
        const reAsk = lang === "en"
          ? `\n\nWhenever you're ready, just tell me your *full name* (first name + last name) to create your account.`
          : `\n\nCuando quieras, solo dime tu *nombre completo* (nombre y apellido) para crear tu cuenta.`;

        // Security / trust questions — use pre-written copy, skip Claude
        const SECURITY_RE = /\b(seguro|confiable|confiar|fraude|robar|hackear|es seguro|qué es pagoya|que es pagoya|cómo funciona|como funciona|stp|banxico|legitim|real|verdad|estafa|scam)\b/i;
        if (SECURITY_RE.test(rawName)) {
          await sendWhatsApp(phoneKey, m.securityFAQ(lang) + reAsk);
          return;
        }

        // All other questions — route to Claude
        try {
          const agentRes = await fetch(`http://localhost:${port}/api/agent/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: userMessage, telefono: `+${phoneKey}`, history: session.conversationHistory, profileName: session.profileName ?? profileName ?? null, lang }),
          });
          if (agentRes.ok) {
            const { reply } = await agentRes.json() as { reply: string };
            await sendWhatsApp(phoneKey, reply + reAsk);
            return;
          }
        } catch { /* fall through to normal name validation */ }
      }

      if (rawName.length < 2 || rawName.length > 80 || /\d/.test(rawName)) {
        await sendWhatsApp(phoneKey, m.invalidName(lang));
        return;
      }
      // Require at least nombre + 1 apellido (minimum 2 words)
      const wordCount = rawName.trim().split(/\s+/).filter(Boolean).length;
      if (wordCount < 2) {
        await sendWhatsApp(phoneKey, m.invalidNameTooShort(lang));
        return;
      }
      // Name confirmed — ask for colonia before completing registration
      saveSession(phoneKey, { awaitingName: false, awaitingColonia: true, pendingRegistration: { name: rawName } });
      await sendWhatsApp(phoneKey, m.askColonia(lang));
      return;
    }

    // Step 1: new phone number — not yet registered → ask for name
    const registered = await isRegistered(phoneKey);
    if (!registered) {
      saveSession(phoneKey, { awaitingName: true });
      const firstName = (profileName || "").split(" ")[0] || "";
      await sendWhatsApp(phoneKey, m.newUserGreeting(lang, firstName));
      return;
    }

    // ── Pending payment confirmation intercept (DB-backed, restart-safe) ─────
    const pending = await getPendingPayment(phoneKey);

    if (pending && pending.status === "awaiting_confirmation") {
      const msgNorm = userMessage.trim();

      if (STRICT_CANCEL_PATTERN.test(msgNorm)) {
        console.log(`[Paula] Payment confirmation: cancelled | biller: ${pending.serviceName} | amount: ${pending.monto} | userId: ${pending.telefono}`);
        db.execute(drizzleSql`INSERT INTO user_events (telefono, event_type, metadata) VALUES (${phoneKey}, 'paula_2fa_declined', ${JSON.stringify({ biller: pending.serviceName, amount: pending.monto })}::jsonb)`).catch(() => {});
        await deletePendingPayment(phoneKey);
        await sendWhatsApp(phoneKey, m.paymentCancelled(lang));
        return;
      }

      if (STRICT_CONFIRM_PATTERN.test(msgNorm)) {
        console.log(`[Paula] Payment confirmation: confirmed | biller: ${pending.serviceName} | amount: ${pending.monto} | userId: ${pending.telefono}`);
        db.execute(drizzleSql`INSERT INTO user_events (telefono, event_type, metadata) VALUES (${phoneKey}, 'paula_2fa_confirmed', ${JSON.stringify({ biller: pending.serviceName, amount: pending.monto })}::jsonb)`).catch(() => {});

        // Reset TTL to 5 minutes from now (spec: TTL starts from SÍ)
        await confirmPendingPayment(phoneKey);

        // Start payment immediately — narration runs in parallel
        const paymentPromise = executeStagedPayment(pending, port);
        let paymentDone = false;
        void paymentPromise.finally(() => { paymentDone = true; });

        // Message 1 — always shown at t=0
        await sendWhatsApp(phoneKey, m.paymentConnecting(lang, pending.serviceName));

        // Message 2 — shown at t≈6 s if still processing
        await sleep(6_000);
        if (!paymentDone) {
          await sendWhatsApp(phoneKey, m.paymentSending(lang));
        }

        // Message 3 — "seguimos procesando" fallback at t≈16 s (slow Telcel / SIPREL retry)
        await sleep(10_000);
        if (!paymentDone) {
          await sendWhatsApp(phoneKey, m.paymentProcessing(lang, pending.serviceName));
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
          await sendWhatsApp(phoneKey, m.paymentSuccess(lang, pending, folio, nowMx));

          // ── Post-payment growth hooks (fire-and-forget) ───────────────────
          void (async () => {
            try {
              const clean10 = phoneKey.replace(/\D/g, "").slice(-10);
              const pr = await db.execute(drizzleSql`
                SELECT u.id, COUNT(bp.id)::int AS payment_count
                FROM users u
                LEFT JOIN bill_payments bp ON bp.telefono = u.telefono
                WHERE u.telefono = ${clean10}
                GROUP BY u.id LIMIT 1
              `);
              const info = pr.rows[0] as { id: number; payment_count: number } | undefined;
              if (info) {
                // Wedge 3 — viral referral loop (fires 60 min later, gated on ≥3 payments)
                scheduleReferralNudgeIfEligible(info.id);

                // Wedge 1 — first-payment app download upsell (2 s after success)
                if (info.payment_count === 1) {
                  await sleep(2_000);
                  await sendWhatsApp(phoneKey, lang === "en"
                    ? `🎉 That was your *first payment* with PagoYa!\n\nDownload the app to track your payment history and build your financial profile: *pagoyamx.com* ✨`
                    : `🎉 ¡Ese fue tu *primer pago* con PagoYa!\n\nDescarga la app para ver tu historial y construir tu perfil financiero: *pagoyamx.com* ✨`
                  );
                }
              }
            } catch (err) {
              logger.error({ err }, "whatsapp-agent: post-payment hooks failed (non-fatal)");
            }
          })();
        } else {
          const incCode = `ERR-${Date.now().toString(36).toUpperCase().slice(-8)}`;
          await sendWhatsApp(phoneKey, m.paymentFailed(lang, pending, incCode, mapSiprelError(result.error ?? "", pending.serviceName)));
        }
        return;
      }

      // Ambiguous response — loop back to confirmation prompt
      await sendWhatsApp(phoneKey, m.ambiguousPayment(lang));
      return;
    }

    // ── Handoff intercept (DB-backed — survives restarts) ─────────────────────
    // Checked before pendingPayment/P2P/withdrawal — handoff reply takes priority.
    // Fall-through (unrelated message while handoff pending) does NOT clear the
    // pending row — the offer stays open until an explicit SÍ or NO.
    {
      const handoffRow = await db.execute(sql`
        SELECT assessment_id, partner_display_name
        FROM paula_pending_handoffs
        WHERE telefono = ${phoneKey}
        LIMIT 1
      `);
      const pendingHandoff = handoffRow.rows[0] as
        { assessment_id: number; partner_display_name: string } | undefined;

      if (pendingHandoff) {
        const isYes = /^(sí|si|yes|yep|dale|va|ok|claro|quiero|conecta)$/i
          .test(userMessage.trim());
        const isNo  = /^(no|nel|nope|no\s+gracias|cancelar)$/i
          .test(userMessage.trim());

        if (isYes) {
          db.execute(sql`
            UPDATE readiness_assessments
            SET handoff_requested = true, handoff_at = NOW()
            WHERE id = ${pendingHandoff.assessment_id}
          `).catch(() => {});

          db.execute(sql`
            DELETE FROM paula_pending_handoffs WHERE telefono = ${phoneKey}
          `).catch(() => {});

          db.execute(sql`
            INSERT INTO user_events (telefono, event_type, metadata)
            VALUES (${phoneKey}, 'handoff_requested', ${JSON.stringify({
              assessmentId: pendingHandoff.assessment_id,
              partner: pendingHandoff.partner_display_name,
            })}::jsonb)
          `).catch(() => {});

          const replyText =
            `¡Perfecto! 🎉 Hemos registrado tu solicitud. Alguien del equipo PagoYa ` +
            `se pondrá en contacto contigo en los próximos días para guiarte en el ` +
            `proceso con ${pendingHandoff.partner_display_name}.\n\n` +
            `Mientras tanto, sigue pagando tus servicios a tiempo — eso fortalece ` +
            `aún más tu perfil. 💪`;
          await sendWhatsApp(phoneKey, replyText);
          return;
        }

        if (isNo) {
          db.execute(sql`
            DELETE FROM paula_pending_handoffs WHERE telefono = ${phoneKey}
          `).catch(() => {});

          const replyText =
            `Entendido, no hay problema. 😊 Tu perfil sigue aquí — cuando quieras ` +
            `explorar tus opciones, solo dímelo.`;
          await sendWhatsApp(phoneKey, replyText);
          return;
        }

        // Unrelated message — do NOT clear pendingHandoff. The offer stays open.
        // Fall through to normal Paula routing below.
      }
    }

    // ── Income bucket collection intercept ────────────────────────────────────
    // Fires after handoff block. Intercepts a numeric 1–5 reply when:
    //   (a) users.declared_income_bucket IS NULL  (NULL guard at parse time)
    //   (b) the last Paula outbound to this user was trigger_type='income_collection'
    // User is never re-asked once bucket is set.
    {
      const INCOME_MAP: Record<string, string> = {
        "1": "lt_3k", "2": "3k_5k", "3": "5k_10k", "4": "10k_20k", "5": "gt_20k",
      };
      const msgTrimmed = userMessage.trim();
      const mappedBucket = INCOME_MAP[msgTrimmed];

      if (mappedBucket) {
        // Check if last Paula outbound was income_collection AND bucket not yet set
        const incCheck = await db.execute(sql`
          SELECT u.declared_income_bucket,
                 (SELECT trigger_type FROM paula_trigger_log
                  WHERE telefono = ${phoneKey}
                  ORDER BY fired_at DESC LIMIT 1) AS last_trigger
          FROM users u WHERE u.telefono = ${phoneKey} LIMIT 1
        `);
        const incRow = incCheck.rows[0] as
          { declared_income_bucket: string | null; last_trigger: string | null } | undefined;

        if (incRow && incRow.declared_income_bucket == null && incRow.last_trigger === "income_collection") {
          await db.execute(sql`
            UPDATE users SET declared_income_bucket = ${mappedBucket}
            WHERE telefono = ${phoneKey}
          `);
          await sendWhatsApp(phoneKey,
            `✅ ¡Gracias! Guardamos tu rango de ingresos.\n\n` +
            `Esta información nos ayuda a conectarte con mejores opciones cuando tu perfil esté listo. 💪\n\n` +
            `_Paula — tu asesora financiera_`
          );
          return;
        }
      }
    }

    // ── Remittance profile reply intercept ───────────────────────────────────
    // Fires after income-bucket block. Intercepts a 1/2 reply (or sí/no) when:
    //   (a) users.receives_remittances IS NULL (NULL guard)
    //   (b) last Paula outbound was trigger_type='remittance_profile'
    // Sets receives_remittances = true/false on users. FORWARD-ONLY:
    // future SPEI-in loads for this user are tagged at webhook time;
    // historical transactions are NOT modified.
    {
      const remitMsgTrimmed = userMessage.trim().toLowerCase();
      const isRemitYes = remitMsgTrimmed === "1" || /^s[ií]$/i.test(remitMsgTrimmed);
      const isRemitNo  = remitMsgTrimmed === "2" || remitMsgTrimmed === "no";

      if (isRemitYes || isRemitNo) {
        const remitCheck = await db.execute(sql`
          SELECT u.receives_remittances,
                 (SELECT trigger_type FROM paula_trigger_log
                  WHERE telefono = ${phoneKey}
                  ORDER BY fired_at DESC LIMIT 1) AS last_trigger
          FROM users u WHERE u.telefono = ${phoneKey} LIMIT 1
        `);
        const remitRow = remitCheck.rows[0] as
          { receives_remittances: boolean | null; last_trigger: string | null } | undefined;

        if (remitRow && remitRow.receives_remittances == null && remitRow.last_trigger === "remittance_profile") {
          const flagValue = isRemitYes;
          await db.execute(sql`
            UPDATE users SET receives_remittances = ${flagValue}
            WHERE telefono = ${phoneKey}
          `);

          if (isRemitYes) {
            // Self-report applies FORWARD only — receives_remittances flag is set above.
            // Future SPEI-in loads for this user will be tagged at webhook time with
            // load_source_type='remittance' and load_source_confidence='self_reported'.
            // Historical untagged transactions are NOT retroactively changed — a self-report
            // is evidence about the user, not per-transaction confirmation of past transfers.

            await sendWhatsApp(phoneKey,
              `✅ ¡Gracias! Guardamos que recibes apoyos del extranjero.\n\n` +
              `Esto enriquece tu perfil financiero y puede ayudarte a acceder a mejores opciones más adelante. 💪\n\n` +
              `_Paula — tu asesora financiera_`
            );
          } else {
            await sendWhatsApp(phoneKey,
              `Entendido, gracias por responder. 👍\n\n` +
              `Seguimos construyendo tu perfil con tus pagos. Cualquier duda, escríbeme.\n\n` +
              `_Paula — tu asesora financiera_`
            );
          }
          return;
        }
      }
    }

    // ── Employment type reply intercept ──────────────────────────────────────
    // Fires after remittance block. Intercepts a numeric 1–5 reply when:
    //   (a) users.employment_type IS NULL
    //   (b) last Paula outbound to this user was trigger_type='employment_profile'
    {
      const EMPLOYMENT_MAP: Record<string, string> = {
        "1": "formal", "2": "informal", "3": "gig", "4": "unemployed", "5": "prefer_not_say",
      };
      const empMsgTrimmed = userMessage.trim();
      const mappedEmployment = EMPLOYMENT_MAP[empMsgTrimmed];

      if (mappedEmployment) {
        const empCheck = await db.execute(sql`
          SELECT u.employment_type,
                 (SELECT trigger_type FROM paula_trigger_log
                  WHERE telefono = ${phoneKey}
                  ORDER BY fired_at DESC LIMIT 1) AS last_trigger
          FROM users u WHERE u.telefono = ${phoneKey} LIMIT 1
        `);
        const empRow = empCheck.rows[0] as
          { employment_type: string | null; last_trigger: string | null } | undefined;

        if (empRow && empRow.employment_type == null && empRow.last_trigger === "employment_profile") {
          await db.execute(sql`
            UPDATE users SET employment_type = ${mappedEmployment}
            WHERE telefono = ${phoneKey}
          `);
          await sendWhatsApp(phoneKey,
            `✅ ¡Gracias! Guardamos tu situación de trabajo.\n\n` +
            `Seguimos construyendo tu perfil financiero. ¡Cada dato cuenta! 💪\n\n` +
            `_Paula — tu asesora financiera_`
          );
          return;
        }
      }
    }

    // ── Address tenure reply intercept ────────────────────────────────────────
    // Intercepts a numeric 1–3 reply when:
    //   (a) users.address_tenure_bucket IS NULL
    //   (b) last Paula outbound was trigger_type='address_tenure'
    // Stores actual self-reported residence duration — NOT a proxy for signup date.
    {
      const TENURE_MAP: Record<string, string> = {
        "1": "lt_6m", "2": "6m_2y", "3": "gt_2y",
      };
      const addrMsgTrimmed = userMessage.trim();
      const mappedTenure = TENURE_MAP[addrMsgTrimmed];

      if (mappedTenure) {
        const addrCheck = await db.execute(sql`
          SELECT u.address_tenure_bucket,
                 (SELECT trigger_type FROM paula_trigger_log
                  WHERE telefono = ${phoneKey}
                  ORDER BY fired_at DESC LIMIT 1) AS last_trigger
          FROM users u WHERE u.telefono = ${phoneKey} LIMIT 1
        `);
        const addrRow = addrCheck.rows[0] as
          { address_tenure_bucket: string | null; last_trigger: string | null } | undefined;

        if (addrRow && addrRow.address_tenure_bucket == null && addrRow.last_trigger === "address_tenure") {
          await db.execute(sql`
            UPDATE users SET address_tenure_bucket = ${mappedTenure}
            WHERE telefono = ${phoneKey}
          `);
          await sendWhatsApp(phoneKey,
            `✅ ¡Perfecto! Guardamos el tiempo en tu domicilio actual.\n\n` +
            `Tu perfil financiero con PagoYa está tomando forma. 🏠\n\n` +
            `_Paula — tu asesora financiera_`
          );
          return;
        }
      }
    }

    // ── Colonia backfill reply intercept ──────────────────────────────────────
    // Catches replies to the "¿en qué colonia vives?" cron message.
    // Active for 48 h after colonia_asked_at was set, while colonia is still NULL.
    {
      const coloniaCheckR = await db.execute(sql`
        SELECT colonia, colonia_asked_at FROM users
        WHERE telefono = ${phoneKey} LIMIT 1
      `);
      const coloniaRow = coloniaCheckR.rows[0] as
        { colonia: string | null; colonia_asked_at: string | null } | undefined;

      if (coloniaRow && !coloniaRow.colonia && coloniaRow.colonia_asked_at) {
        const askedHoursAgo = (Date.now() - new Date(coloniaRow.colonia_asked_at).getTime()) / 3_600_000;
        if (askedHoursAgo < 48) {
          const coloniaInput = userMessage.trim();
          const isSkip = /^(no|skip|saltar|nada|ninguna|-)$/i.test(coloniaInput);
          if (!isSkip && coloniaInput.length >= 2 && coloniaInput.length <= 100) {
            await db.execute(sql`UPDATE users SET colonia = ${coloniaInput} WHERE telefono = ${phoneKey}`);
            await sendWhatsApp(phoneKey,
              `¡Gracias! Registramos que vives en *${coloniaInput}*. ` +
              `Si hay novedades o beneficios en tu zona, serás de los primeros en saberlo 💬`
            );
            return;
          }
          // Skip word or too short — fall through to normal Paula routing
        }
      }
    }

    // ── Lender handoff consent intercept (DB-backed) ─────────────────────────
    // Fires when user replies SÍ/NO to the READINESS_HARD message.
    // Requires: pending handoff row + a readiness_hard trigger sent in last 7 days.
    {
      const handoffR = await db.execute(sql`
        SELECT ph.id
        FROM paula_pending_handoffs ph
        JOIN paula_trigger_log ptl
          ON ptl.telefono = ${phoneKey}
          AND ptl.trigger_type = 'readiness_hard'
          AND ptl.created_at >= NOW() - INTERVAL '7 days'
        WHERE ph.telefono = ${phoneKey}
          AND ph.status = 'pending'
        LIMIT 1
      `);
      if (handoffR.rows.length > 0) {
        const msgNorm = userMessage.trim();
        if (STRICT_CONFIRM_PATTERN.test(msgNorm)) {
          // Double-send guard: UPDATE only succeeds if status is still 'pending'
          const consentResult = await db.execute(sql`
            UPDATE paula_pending_handoffs
            SET status = 'consented', consented_at = NOW()
            WHERE telefono = ${phoneKey} AND status = 'pending'
            RETURNING id
          `);
          if (consentResult.rows.length === 0) {
            // Already consented — silently ignore to prevent Step 2 double-send
            return;
          }

          // Fetch Step 2 template and user's name for immediate send (Option B — no queue delay)
          const [step2R, userNameR] = await Promise.all([
            db.execute(sql`
              SELECT template_es FROM paula_messages
              WHERE trigger_type = 'readiness_hard_step2' AND active = true
              LIMIT 1
            `),
            db.execute(sql`
              SELECT kyc_full_name FROM users WHERE telefono = ${phoneKey} LIMIT 1
            `),
          ]);

          const step2Template = (step2R.rows[0] as Record<string, string> | undefined)?.template_es;
          const fullName = (userNameR.rows[0] as Record<string, string> | undefined)?.kyc_full_name ?? "";
          const firstName = fullName.split(" ")[0] ?? fullName;

          if (step2Template && firstName) {
            const step2Msg = step2Template.replace(/\{\{nombre\}\}/g, firstName);
            await sendWhatsApp(phoneKey, step2Msg);
          }

          return;
        }
        if (STRICT_CANCEL_PATTERN.test(msgNorm)) {
          await db.execute(sql`
            UPDATE paula_pending_handoffs
            SET status = 'declined', declined_at = NOW()
            WHERE telefono = ${phoneKey} AND status = 'pending'
          `);
          await sendWhatsApp(
            phoneKey,
            `Entendido. Cuando estés listo, aquí estaremos.\n\n` +
            `Sigue pagando a tiempo — tu historial seguirá creciendo y las opciones seguirán abiertas. 💬`
          );
          return;
        }
      }
    }

    // ── Pending withdrawal confirmation intercept (session-backed) ───────────
    const pendingW = session.pendingWithdrawal;
    if (pendingW && Date.now() < pendingW.expiresAt) {
      const msgNorm = userMessage.trim();

      if (STRICT_CANCEL_PATTERN.test(msgNorm)) {
        saveSession(phoneKey, { pendingWithdrawal: null });
        await sendWhatsApp(phoneKey, m.withdrawalCancelled(lang));
        return;
      }

      if (STRICT_CONFIRM_PATTERN.test(msgNorm)) {
        saveSession(phoneKey, { pendingWithdrawal: null });
        await sendWhatsApp(phoneKey, m.withdrawalProcessing(lang, pendingW.amountMXN));

        const port = process.env.PORT ?? "3000";
        try {
          const resp = await fetch(`http://localhost:${port}/api/wallet/withdraw`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              telefono: pendingW.telefono,
              destinationClabe: pendingW.destinationClabe,
              amountMXN: pendingW.amountMXN,
              beneficiaryName: pendingW.beneficiaryName,
              concept: `Retiro PagoYa ${pendingW.telefono.slice(-4)}`,
            }),
          });

          const data = (await resp.json()) as {
            success?: boolean;
            claveRastreo?: string;
            newBalanceMXN?: number;
            error?: string;
            refunded?: boolean;
          };

          const nowMx = new Date().toLocaleString("es-MX", {
            timeZone: "America/Mexico_City",
            day: "2-digit", month: "short", year: "numeric",
            hour: "2-digit", minute: "2-digit",
          });

          if (resp.ok && data.success) {
            const maskedClabe = `${"*".repeat(14)}${pendingW.destinationClabe.slice(-4)}`;
            await sendWhatsApp(phoneKey, m.withdrawalSuccess(lang, pendingW, maskedClabe, data.claveRastreo ?? "—", nowMx, data.newBalanceMXN ?? 0));
          } else {
            const reason = data.refunded
              ? (lang === "en" ? "Your balance was automatically restored." : "Tu saldo fue restaurado automáticamente.")
              : (lang === "en" ? "Please check your balance and try again." : "Verifica tu saldo y vuelve a intentar.");
            await sendWhatsApp(phoneKey, m.withdrawalFailed(lang, pendingW, reason, data.error ?? (lang === "en" ? "Technical error sending SPEI." : "Error técnico al enviar SPEI.")));
          }
        } catch (err) {
          logger.error({ err, phoneKey }, "whatsapp-agent: withdrawal execution failed");
          await sendWhatsApp(phoneKey, m.withdrawalNetworkError(lang));
        }
        return;
      }

      // Ambiguous — remind
      await sendWhatsApp(phoneKey, m.ambiguousWithdrawal(lang));
      return;
    }

    // Clear expired pending withdrawal
    if (pendingW && Date.now() >= pendingW.expiresAt) {
      saveSession(phoneKey, { pendingWithdrawal: null });
    }

    // ── Pending P2P transfer confirmation intercept (session-backed) ──────────
    const pendingP2P = session.pendingP2P;
    if (pendingP2P && Date.now() < pendingP2P.expiresAt) {
      const msgNorm = userMessage.trim();

      if (STRICT_CANCEL_PATTERN.test(msgNorm)) {
        saveSession(phoneKey, { pendingP2P: null });
        await sendWhatsApp(phoneKey, m.p2pCancelled(lang));
        return;
      }

      if (STRICT_CONFIRM_PATTERN.test(msgNorm)) {
        saveSession(phoneKey, { pendingP2P: null });
        await sendWhatsApp(phoneKey, m.p2pProcessing(lang, pendingP2P.amountMXN, pendingP2P.recipientName));

        try {
          const resp = await fetch(`http://localhost:${port}/api/wallet/transfer`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              senderTelefono: pendingP2P.senderTelefono,
              receiverTelefono: pendingP2P.recipientTelefono,
              amountMXN: pendingP2P.amountMXN,
              memo: pendingP2P.memo,
              source: "agent",
            }),
          });

          const data = (await resp.json()) as {
            newSenderBalance?: number;
            error?: string;
            code?: string;
          };

          if (resp.ok && data.newSenderBalance !== undefined) {
            await sendWhatsApp(phoneKey, m.p2pSuccess(lang, pendingP2P.amountMXN, pendingP2P.recipientName, data.newSenderBalance));
          } else {
            const reason = data.code === "INSUFFICIENT_BALANCE"
              ? (lang === "en" ? "Insufficient balance." : "Saldo insuficiente.")
              : data.code === "DAILY_LIMIT_EXCEEDED"
              ? (lang === "en" ? "Daily transfer limit reached ($2,500 MXN)." : "Límite diario de transferencias alcanzado ($2,500 MXN).")
              : (data.error ?? (lang === "en" ? "Technical error." : "Error técnico."));
            await sendWhatsApp(phoneKey, m.p2pFailed(lang, pendingP2P.amountMXN, reason));
          }
        } catch (err) {
          logger.error({ err, phoneKey }, "whatsapp-agent: P2P execution failed");
          await sendWhatsApp(phoneKey, m.p2pFailed(lang, pendingP2P.amountMXN, lang === "en" ? "Connection error. Please try again." : "Error de conexión. Intenta de nuevo."));
        }
        return;
      }

      // Ambiguous — remind
      await sendWhatsApp(phoneKey, m.ambiguousP2P(lang, pendingP2P.amountMXN, pendingP2P.recipientName));
      return;
    }

    // Clear expired pending P2P
    if (pendingP2P && Date.now() >= pendingP2P.expiresAt) {
      saveSession(phoneKey, { pendingP2P: null });
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
        lang,
      }),
    });

    if (!agentRes.ok) {
      throw new Error(`agent/chat returned ${agentRes.status}`);
    }

    const { reply, pendingPayment, pendingWithdrawal, pendingP2P: incomingP2P } = (await agentRes.json()) as {
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
      pendingWithdrawal: {
        telefono: string;
        destinationClabe: string;
        amountMXN: number;
        beneficiaryName: string;
        walletBalance: number;
      } | null;
      pendingP2P: {
        senderTelefono: string;
        recipientTelefono: string;
        recipientName: string;
        amountMXN: number;
        walletBalance: number;
        memo?: string;
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

    if (incomingP2P) {
      // Store pending P2P in session with 10-min TTL
      const p2pSession: PendingP2PSession = {
        ...incomingP2P,
        expiresAt: Date.now() + 10 * 60 * 1000,
      };
      saveSession(phoneKey, { pendingP2P: p2pSession });
      // Send Paula's reply (contains the confirmText built by prepare_p2p_transfer)
      await sendWhatsApp(phoneKey, reply);
      logger.info({ phoneKey, amountMXN: incomingP2P.amountMXN, recipientTelefono: incomingP2P.recipientTelefono }, "whatsapp-agent: P2P staged");
    } else if (pendingWithdrawal) {
      // Store pending withdrawal in session with 10-min TTL
      const withdrawal: PendingWithdrawalSession = {
        ...pendingWithdrawal,
        expiresAt: Date.now() + 10 * 60 * 1000,
      };
      saveSession(phoneKey, { pendingWithdrawal: withdrawal });
      // Send Paula's reply (contains the confirmText built by prepare_withdrawal)
      await sendWhatsApp(phoneKey, reply);
      logger.info({ phoneKey, amountMXN: pendingWithdrawal.amountMXN }, "whatsapp-agent: withdrawal staged");
    } else if (pendingPayment) {
      // Persist pending payment to DB (awaiting_confirmation, 30-min TTL)
      await createPendingPayment(phoneKey, {
        serviceId:     pendingPayment.serviceId,
        serviceName:   pendingPayment.serviceName,
        referencia:    pendingPayment.referencia,
        monto:         pendingPayment.monto,
        telefono:      pendingPayment.telefono,
        fee:           pendingPayment.fee ?? 25,
        walletBalance: pendingPayment.walletBalance ?? 0,
        paymentMethod: pendingPayment.paymentMethod ?? "Saldo PagoYa",
      });

      // Fetch the staged row to build the structured message
      const staged = await getPendingPayment(phoneKey);
      if (staged) {
        // Send the structured confirmation message (replaces Paula's confirmText)
        await sendWhatsApp(phoneKey, buildConfirmationMessage(staged, lang));
      } else {
        // Fallback: send Paula's reply
        await sendWhatsApp(phoneKey, reply);
      }
    } else {
      // No pending payment — send Paula's reply normally
      await sendWhatsApp(phoneKey, reply);
    }

    // Log Paula interaction for PTI behavioral scoring (fire-and-forget)
    {
      const queryType = /pagar|pago|cfe|telmex|agua|predial|luz|gas|factur/i.test(userMessage) ? "bill_query"
        : /saldo|balance|cuánto|cuanto|dinero|tengo|cuenta/i.test(userMessage) ? "balance_query"
        : /transferir|mandar|enviar|transfer|p2p/i.test(userMessage) ? "p2p_query"
        : "general_query";
      db.execute(drizzleSql`INSERT INTO user_events (telefono, event_type, metadata) VALUES (${phoneKey}, 'paula_interaction', ${JSON.stringify({ query_type: queryType, msg_len: userMessage.length })}::jsonb)`).catch(() => {});
    }
    logger.info({ phoneKey, hasPendingPayment: !!pendingPayment }, "whatsapp-agent: reply sent");
  } catch (err) {
    logger.error({ err }, "whatsapp-agent: error");
    const incCode = `INC-${Date.now().toString(36).toUpperCase().slice(-8)}`;
    const errLang: Lang = (getSession(phoneKey).lang) ?? "es";
    await sendWhatsApp(phoneKey, m.generalError(errLang, incCode)).catch(() => {});
  }
});

export default router;
