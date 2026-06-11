import { Router, type Request, type Response } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable, walletsTable, signupBonusConfigTable } from "@workspace/db";
import { sendWhatsApp } from "../lib/whatsapp.js";
import { getSession, saveSession, type PendingWithdrawalSession } from "../services/whatsapp-sessions.js";
import {
  createPendingPayment,
  getPendingPayment,
  confirmPendingPayment,
  deletePendingPayment,
  type PendingPaymentRow,
} from "../services/pendingPaymentService.js";
import { creditSignupBonus } from "../services/signupBonusService.js";
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

// Explicit language-switch commands — work at any point in the conversation
const SWITCH_TO_ENGLISH = /^(english|switch to english|in english|en inglés|en english|speak english|habla inglés)\s*[!.]*$/i;
const SWITCH_TO_SPANISH = /^(español|en español|spanish|habla español|switch to spanish|en español por favor)\s*[!.]*$/i;

// ── Bilingual message strings ─────────────────────────────────────────────────
type Lang = "es" | "en";

const m = {
  invalidName: (lang: Lang) => lang === "en"
    ? "Please tell me your full name (letters only, no numbers). What's your name?"
    : "Por favor dime tu nombre completo (solo letras, sin números). ¿Cómo te llamas?",

  registrationError: (lang: Lang) => lang === "en"
    ? "Sorry, I had a problem creating your account. Please try again in a moment."
    : "Lo siento, tuve un problema al crear tu cuenta. Por favor intenta de nuevo en un momento.",

  registrationSuccess: (lang: Lang, firstName: string, phoneKey: string, rawName: string, bonusAmount: number) => {
    const bonusLine = bonusAmount > 0
      ? (lang === "en"
        ? `\n\n🎁 *Welcome bonus!* We've credited $${bonusAmount.toFixed(0)} MXN to your wallet as a gift.`
        : `\n\n🎁 *¡Bonus de bienvenida!* Acreditamos $${bonusAmount.toFixed(0)} MXN en tu cartera como regalo de inicio.`)
      : "";
    if (lang === "en") {
      return (
        `✅ *Done, ${firstName}! Your PagoYa account is active.*\n` +
        `──────────────────\n` +
        `📱 Registered number: +${phoneKey.replace(/\D/g, "")}\n` +
        `👤 Name: ${rawName}${bonusLine}\n` +
        `──────────────────\n\n` +
        `With PagoYa you can:\n` +
        `💡 Pay CFE electricity, Telmex, water, gas, and more\n` +
        `📱 Top up any mobile phone\n` +
        `🎮 Buy gift cards (Netflix, Amazon, etc.)\n` +
        `🏦 Transfer to any bank via SPEI\n\n` +
        `To add funds, type *BALANCE* and I'll explain how.\n` +
        `How can I help you today?`
      );
    }
    return (
      `✅ *¡Listo, ${firstName}! Tu cuenta PagoYa está activa.*\n` +
      `──────────────────\n` +
      `📱 Número registrado: +${phoneKey.replace(/\D/g, "")}\n` +
      `👤 Nombre: ${rawName}${bonusLine}\n` +
      `──────────────────\n\n` +
      `Con PagoYa puedes:\n` +
      `💡 Pagar CFE, Telmex, agua, gas y más\n` +
      `📱 Recargar cualquier celular\n` +
      `🎮 Comprar gift cards (Netflix, Steam, etc.)\n` +
      `🏦 Transferir a cualquier banco por SPEI\n\n` +
      `Para cargar saldo escribe *SALDO* y te explico cómo.\n` +
      `¿En qué te ayudo hoy?`
    );
  },

  newUserGreeting: (lang: Lang, firstName: string) => {
    const greet = firstName
      ? (lang === "en" ? `Hello, ${firstName}!` : `¡Hola, ${firstName}!`)
      : (lang === "en" ? "Hello!" : "¡Hola!");
    if (lang === "en") {
      return (
        `${greet} 👋 Welcome to *PagoYa*!\n\n` +
        `I'm *Paula*, your personal assistant for PagoYa. You can ask me anything — I'm here to help! For example, you can say:\n` +
        `_"Paula, I need to pay my CFE electricity bill"_ — and I'll take care of it right here in this chat. You can also find me on our website at *pagoyamx.com*.\n\n` +
        `PagoYa lets you make *bill payments, mobile top-ups, gift cards, and bank transfers* — all from WhatsApp, without needing a bank account.\n\n` +
        `🏦 *How does your money work?*\n` +
        `Your balance lives in a *PagoYa Digital Wallet*. To fund it, you deposit cash at any OXXO store nationwide using a code we give you. The balance is available instantly.\n\n` +
        `🔒 *Is it safe?*\n` +
        `Yes. All money movements travel through *STP (Sistema de Transferencias y Pagos)*, the official network of the *Bank of Mexico (Banxico)*. It's the same system used by Banamex and BBVA — your payments are backed by an official transaction ID.\n\n` +
        `📋 *What do you need to register?*\n` +
        `Just your name. No tax ID, no proof of address, no bank account required.\n\n` +
        `To create your free account right now, could you tell me your *full name*?`
      );
    }
    return (
      `${greet} 👋 ¡Bienvenido/a a *PagoYa*!\n\n` +
      `Soy *Paula*, tu asistente personal de PagoYa. Puedes preguntarme lo que quieras — ¡estoy aquí para ayudarte! Por ejemplo, puedes decirme:\n` +
      `_"Paula, necesito pagar mi recibo de CFE"_ — y lo resolvemos aquí mismo en este chat. También puedes encontrarme en nuestro sitio web *pagoyamx.com*.\n\n` +
      `PagoYa te permite hacer *pagos de servicios, recargas, gift cards y transferencias bancarias* — todo desde WhatsApp, sin necesidad de tener cuenta bancaria.\n\n` +
      `🏦 *¿Cómo funciona tu dinero?*\n` +
      `Tu saldo vive en una *Cartera Digital PagoYa*. Para cargarla, depositas en efectivo en cualquier OXXO del país usando un código que te damos. Ese saldo queda disponible al instante.\n\n` +
      `🔒 *¿Es seguro?*\n` +
      `Sí. Todos los movimientos de dinero viajan por *STP (Sistema de Transferencias y Pagos)*, la red oficial del *Banco de México* (Banxico). Es el mismo sistema que usan los bancos grandes como Banamex y BBVA — tus pagos quedan respaldados con folio oficial.\n\n` +
      `📋 *¿Qué necesitas para registrarte?*\n` +
      `Solo tu nombre. No pedimos RFC, no pedimos comprobante de domicilio, no pedimos cuenta bancaria.\n\n` +
      `Para crear tu cuenta gratis ahora mismo, ¿me puedes decir tu *nombre completo*?`
    );
  },

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
      `¡Hola${firstName ? ` ${firstName}` : ""}! Bienvenido/a a PagoYa 👋\n` +
      `Soy Paula, la asistente oficial de PagoYa Technologies — empresa mexicana de pagos digitales.\n\n` +
      `¿En qué te puedo ayudar hoy?\n` +
      `Escribe *PAGAR* para pagar un servicio, o *SALDO* para consultar tu cartera.`
    );
  },

  paymentCancelled: (lang: Lang) => lang === "en"
    ? "❌ Payment cancelled. How else can I help you?"
    : "❌ Pago cancelado. ¿En qué más te puedo ayudar?",

  withdrawalCancelled: (lang: Lang) => lang === "en"
    ? "❌ Withdrawal cancelled. Your balance was not affected. How else can I help you?"
    : "❌ Retiro cancelado. Tu saldo no fue afectado. ¿En qué más te puedo ayudar?",

  paymentConnecting: (lang: Lang, serviceName: string) => lang === "en"
    ? `⏳ Connecting to ${serviceName}...`
    : `⏳ Conectando con ${serviceName}...`,

  paymentSending: (lang: Lang) => lang === "en"
    ? `🔄 Sending your payment through SIPREL / STP...`
    : `🔄 Enviando tu pago a través de SIPREL / STP...`,

  paymentProcessing: (lang: Lang, serviceName: string) => lang === "en"
    ? `⏱️ Still processing your payment with ${serviceName}.\nSIPREL is confirming with the STP network. One more moment.`
    : `⏱️ Seguimos procesando tu pago con ${serviceName}.\nSIPREL está confirmando con la red STP. Un momento más.`,

  paymentSuccess: (lang: Lang, pending: PendingPaymentRow, folio: string, nowMx: string) => {
    if (lang === "en") {
      return (
        `✅ *PagoYa | Official Receipt*\n` +
        `──────────────────\n` +
        `Service: ${pending.serviceName}\n` +
        `Amount: $${pending.monto.toFixed(2)} MXN\n` +
        `Fee: $${pending.fee.toFixed(2)} MXN\n` +
        `SIPREL Folio: ${folio}\n` +
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
      `Folio SIPREL: ${folio}\n` +
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
      `⚠️ Tu dinero NO fue deducido de tu cartera.\n` +
      `Saldo actual: $${pending.walletBalance.toFixed(2)} MXN ✓\n` +
      `Causa: ${cause}\n\n` +
      `Escribe *AYUDA* para hablar con soporte, o intenta de nuevo.`
    );
  },

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
    return "Tu cartera PagoYa no tiene saldo suficiente. Carga saldo y vuelve a intentar.";
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
    return "SIPREL tardó demasiado en confirmar. Es posible que el pago esté en proceso — espera 5 min y revisa tu historial antes de reintentar.";
  }
  // Network / fetch error
  if (e.includes("NETWORK") || e.includes("FETCH") || e.includes("CONEXIÓN") || e.includes("CONNECTION")) {
    return "Error de conexión al procesar. Intenta de nuevo en unos segundos.";
  }
  return "Error técnico al procesar el pago. Tu cartera no fue afectada.";
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

  const method = pending.paymentMethod ?? (lang === "en" ? "PagoYa Wallet" : "Cartera PagoYa");

  if (lang === "en") {
    return (
      `✅ Payment Summary:\n` +
      `──────────────────\n` +
      `🏢 Service: ${pending.serviceName}` +
      referenciaLine +
      `\n💰 Amount: $${pending.monto.toFixed(2)} MXN` +
      `\n💳 Total charge: ${feeNote}` +
      `\n👛 Method: ${method} (Balance: $${pending.walletBalance.toFixed(2)} MXN)` +
      `\n🏦 Payment network: SIPREL / STP` +
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
    `\n🏦 Red de pago: SIPREL / STP` +
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

    // Save profileName on first real message if not yet stored
    if (!session.profileName && profileName) {
      saveSession(phoneKey, { profileName });
    }

    // ── New-user registration flow ───────────────────────────────────────────
    // Step 2: we already asked for name — this message IS the name
    if (session.awaitingName) {
      const rawName = userMessage.trim();
      if (rawName.length < 2 || rawName.length > 60 || /\d/.test(rawName)) {
        await sendWhatsApp(phoneKey, m.invalidName(lang));
        return;
      }
      saveSession(phoneKey, { awaitingName: false });
      try {
        const { bonusAmount } = await registerWhatsAppUser(phoneKey, rawName);
        const firstName = rawName.split(" ")[0];
        await sendWhatsApp(phoneKey, m.registrationSuccess(lang, firstName, phoneKey, rawName, bonusAmount));
      } catch (err) {
        logger.error({ err, phoneKey }, "whatsapp-agent: registration failed");
        await sendWhatsApp(phoneKey, m.registrationError(lang));
        saveSession(phoneKey, { awaitingName: true });
      }
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
        await deletePendingPayment(phoneKey);
        await sendWhatsApp(phoneKey, m.paymentCancelled(lang));
        return;
      }

      if (STRICT_CONFIRM_PATTERN.test(msgNorm)) {
        console.log(`[Paula] Payment confirmation: confirmed | biller: ${pending.serviceName} | amount: ${pending.monto} | userId: ${pending.telefono}`);

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

    const { reply, pendingPayment, pendingWithdrawal } = (await agentRes.json()) as {
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
    };

    // ── Persist updated conversation history ─────────────────────────────────
    const newHistory = [
      ...updatedHistory,
      { role: "assistant" as const, content: reply },
    ];
    saveSession(phoneKey, {
      conversationHistory: newHistory.slice(-20),
    });

    if (pendingWithdrawal) {
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
        paymentMethod: pendingPayment.paymentMethod ?? "Cartera PagoYa",
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

    logger.info({ phoneKey, hasPendingPayment: !!pendingPayment }, "whatsapp-agent: reply sent");
  } catch (err) {
    logger.error({ err }, "whatsapp-agent: error");
    const incCode = `INC-${Date.now().toString(36).toUpperCase().slice(-8)}`;
    const errLang: Lang = (getSession(phoneKey).lang) ?? "es";
    await sendWhatsApp(phoneKey, m.generalError(errLang, incCode)).catch(() => {});
  }
});

export default router;
