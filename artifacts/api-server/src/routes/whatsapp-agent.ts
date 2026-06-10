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
function buildConfirmationMessage(pending: PendingPaymentRow): string {
  const total = pending.monto + pending.fee;
  const feeNote = pending.fee > 0
    ? `$${total.toFixed(2)} MXN (incluye comisión $${pending.fee.toFixed(0)})`
    : `$${total.toFixed(2)} MXN (sin comisión 🎁)`;

  const referenciaLine = pending.referencia && pending.referencia !== pending.telefono
    ? `\n📋 Referencia: ${pending.referencia}`
    : "";

  return (
    `✅ Resumen de pago:\n` +
    `──────────────────\n` +
    `🏢 Servicio: ${pending.serviceName}` +
    referenciaLine +
    `\n💰 Monto: $${pending.monto.toFixed(2)} MXN` +
    `\n💳 Cargo total: ${feeNote}` +
    `\n👛 Método: ${pending.paymentMethod ?? "Cartera PagoYa"} (Saldo: $${pending.walletBalance.toFixed(2)} MXN)` +
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

    // ── Rep-code detection (first message only) ──────────────────────────────
    if (!session.repCode) {
      const match = REP_CODE_PATTERN.exec(userMessage);
      if (match) {
        saveSession(phoneKey, { repCode: match[1], profileName });
        const firstName = (profileName || "").split(" ")[0] || profileName || "";
        await sendWhatsApp(
          phoneKey,
          `¡Hola ${firstName}! Bienvenido/a a PagoYa 👋\n` +
          `Soy Paula, la asistente oficial de PagoYa Technologies — empresa mexicana de pagos digitales.\n\n` +
          `¿En qué te puedo ayudar hoy?\n` +
          `Escribe *PAGAR* para pagar un servicio, o *SALDO* para consultar tu cartera.`,
        );
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
        await sendWhatsApp(phoneKey, "Por favor dime tu nombre completo (solo letras, sin números). ¿Cómo te llamas?");
        return;
      }
      saveSession(phoneKey, { awaitingName: false });
      try {
        const { bonusAmount } = await registerWhatsAppUser(phoneKey, rawName);
        const firstName = rawName.split(" ")[0];
        const bonusLine = bonusAmount > 0
          ? `\n\n🎁 *¡Bonus de bienvenida!* Acreditamos $${bonusAmount.toFixed(0)} MXN en tu cartera como regalo de inicio.`
          : "";
        await sendWhatsApp(
          phoneKey,
          `✅ *¡Listo, ${firstName}! Tu cuenta PagoYa está activa.*\n` +
          `──────────────────\n` +
          `📱 Número registrado: +52${phoneKey.slice(-10)}\n` +
          `👤 Nombre: ${rawName}${bonusLine}\n` +
          `──────────────────\n\n` +
          `Con PagoYa puedes:\n` +
          `💡 Pagar CFE, Telmex, agua, gas y más\n` +
          `📱 Recargar cualquier celular\n` +
          `🎮 Comprar gift cards (Netflix, Steam, etc.)\n` +
          `🏦 Transferir a cualquier banco por SPEI\n\n` +
          `Para cargar saldo escribe *SALDO* y te explico cómo.\n` +
          `¿En qué te ayudo hoy?`,
        );
      } catch (err) {
        logger.error({ err, phoneKey }, "whatsapp-agent: registration failed");
        await sendWhatsApp(phoneKey, "Lo siento, tuve un problema al crear tu cuenta. Por favor intenta de nuevo en un momento.");
        saveSession(phoneKey, { awaitingName: true });
      }
      return;
    }

    // Step 1: new phone number — not yet registered → ask for name
    const registered = await isRegistered(phoneKey);
    if (!registered) {
      saveSession(phoneKey, { awaitingName: true });
      const firstName = (profileName || "").split(" ")[0] || "";
      const greeting = firstName ? `¡Hola, ${firstName}!` : "¡Hola!";
      await sendWhatsApp(
        phoneKey,
        `${greeting} 👋 Bienvenido/a a *PagoYa*.\n\n` +
        `Somos una empresa mexicana de tecnología financiera. Te permitimos hacer *pagos de servicios, recargas, gift cards y transferencias bancarias* — todo desde este chat de WhatsApp, sin necesidad de tener cuenta bancaria.\n\n` +
        `🏦 *¿Cómo funciona tu dinero?*\n` +
        `Tu saldo vive en una *Cartera Digital PagoYa*. Para cargarla, depositas en efectivo en cualquier OXXO del país usando un código que te damos. Ese saldo queda disponible al instante.\n\n` +
        `🔒 *¿Es seguro?*\n` +
        `Sí. Todos los movimientos de dinero viajan por *STP (Sistema de Transferencias y Pagos)*, la red oficial del *Banco de México* (Banxico). Es el mismo sistema que usan los bancos grandes como Banamex y BBVA — tus pagos quedan respaldados con folio oficial.\n\n` +
        `📋 *¿Qué necesitas para registrarte?*\n` +
        `Solo tu nombre. No pedimos RFC, no pedimos comprobante de domicilio, no pedimos cuenta bancaria.\n\n` +
        `Para crear tu cuenta gratis ahora mismo, ¿me puedes decir tu *nombre completo*?`,
      );
      return;
    }

    // ── Pending payment confirmation intercept (DB-backed, restart-safe) ─────
    const pending = await getPendingPayment(phoneKey);

    if (pending && pending.status === "awaiting_confirmation") {
      const msgNorm = userMessage.trim();

      if (STRICT_CANCEL_PATTERN.test(msgNorm)) {
        console.log(`[Paula] Payment confirmation: cancelled | biller: ${pending.serviceName} | amount: ${pending.monto} | userId: ${pending.telefono}`);
        await deletePendingPayment(phoneKey);
        await sendWhatsApp(phoneKey, "❌ Pago cancelado. ¿En qué más te puedo ayudar?");
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
        await sendWhatsApp(phoneKey, `⏳ Conectando con ${pending.serviceName}...`);

        // Message 2 — shown at t≈6 s if still processing
        await sleep(6_000);
        if (!paymentDone) {
          await sendWhatsApp(phoneKey, `🔄 Enviando tu pago a través de SIPREL / STP...`);
        }

        // Message 3 — "seguimos procesando" fallback at t≈16 s (slow Telcel / SIPREL retry)
        await sleep(10_000);
        if (!paymentDone) {
          await sendWhatsApp(
            phoneKey,
            `⏱️ Seguimos procesando tu pago con ${pending.serviceName}.\n` +
            `SIPREL está confirmando con la red STP. Un momento más.`,
          );
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
          await sendWhatsApp(
            phoneKey,
            `✅ *PagoYa | Comprobante Oficial*\n` +
            `──────────────────\n` +
            `Servicio: ${pending.serviceName}\n` +
            `Monto: $${pending.monto.toFixed(2)} MXN\n` +
            `Comisión: $${pending.fee.toFixed(2)} MXN\n` +
            `Folio SIPREL: ${folio}\n` +
            `Fecha: ${nowMx}\n` +
            `──────────────────\n` +
            `Tu pago está respaldado por STP/SPEI — sistema de pagos del Banco de México.\n` +
            `Conserva este mensaje como comprobante oficial.`,
          );
        } else {
          const incCode = `ERR-${Date.now().toString(36).toUpperCase().slice(-8)}`;
          await sendWhatsApp(
            phoneKey,
            `❌ *PagoYa | Pago No Procesado*\n` +
            `──────────────────\n` +
            `Servicio: ${pending.serviceName}\n` +
            `Monto: $${pending.monto.toFixed(2)} MXN\n` +
            `Estado: No completado\n` +
            `Código: ${incCode}\n` +
            `──────────────────\n` +
            `⚠️ Tu dinero NO fue deducido de tu cartera.\n` +
            `Saldo actual: $${pending.walletBalance.toFixed(2)} MXN ✓\n` +
            `Causa: ${mapSiprelError(result.error ?? "", pending.serviceName)}\n\n` +
            `Escribe *AYUDA* para hablar con soporte, o intenta de nuevo.`,
          );
        }
        return;
      }

      // Ambiguous response — loop back to confirmation prompt
      await sendWhatsApp(
        phoneKey,
        "Por favor responde *SÍ* para confirmar o *CANCELAR* para cancelar el pago.",
      );
      return;
    }

    // ── Pending withdrawal confirmation intercept (session-backed) ───────────
    const pendingW = session.pendingWithdrawal;
    if (pendingW && Date.now() < pendingW.expiresAt) {
      const msgNorm = userMessage.trim();

      if (STRICT_CANCEL_PATTERN.test(msgNorm)) {
        saveSession(phoneKey, { pendingWithdrawal: null });
        await sendWhatsApp(phoneKey, "❌ Retiro cancelado. Tu saldo no fue afectado. ¿En qué más te puedo ayudar?");
        return;
      }

      if (STRICT_CONFIRM_PATTERN.test(msgNorm)) {
        saveSession(phoneKey, { pendingWithdrawal: null });
        await sendWhatsApp(phoneKey, `⏳ Procesando tu retiro SPEI de $${pendingW.amountMXN.toFixed(2)} MXN...`);

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
            await sendWhatsApp(
              phoneKey,
              `✅ *PagoYa | Retiro SPEI Enviado*\n` +
              `──────────────────\n` +
              `💰 Monto enviado: $${pendingW.amountMXN.toFixed(2)} MXN\n` +
              `🏦 CLABE destino: ${maskedClabe}\n` +
              `👤 Titular: ${pendingW.beneficiaryName}\n` +
              `🔑 Clave rastreo: ${data.claveRastreo ?? "—"}\n` +
              `📅 Fecha: ${nowMx}\n` +
              `──────────────────\n` +
              `Tu dinero está en camino por SPEI — llega en minutos.\n` +
              `Saldo restante: $${(data.newBalanceMXN ?? 0).toFixed(2)} MXN\n\n` +
              `Guarda este mensaje como comprobante.`,
            );
          } else {
            const reason = data.refunded
              ? "Tu saldo fue restaurado automáticamente."
              : "Verifica tu saldo y vuelve a intentar.";
            await sendWhatsApp(
              phoneKey,
              `❌ *PagoYa | Retiro No Procesado*\n` +
              `──────────────────\n` +
              `Monto: $${pendingW.amountMXN.toFixed(2)} MXN\n` +
              `Estado: No completado\n` +
              `──────────────────\n` +
              `⚠️ ${reason}\n` +
              `Causa: ${data.error ?? "Error técnico al enviar SPEI."}\n\n` +
              `Escribe *AYUDA* para hablar con soporte.`,
            );
          }
        } catch (err) {
          logger.error({ err, phoneKey }, "whatsapp-agent: withdrawal execution failed");
          await sendWhatsApp(phoneKey, "❌ Error de red al procesar el retiro. Tu saldo no fue afectado. Intenta de nuevo.");
        }
        return;
      }

      // Ambiguous — remind
      await sendWhatsApp(phoneKey, "Por favor responde *SÍ* para confirmar el retiro o *NO* para cancelar.");
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
        await sendWhatsApp(phoneKey, buildConfirmationMessage(staged));
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
    await sendWhatsApp(
      phoneKey,
      `Lo siento, algo salió mal en este momento.\n` +
      `Código de incidencia: ${incCode}\n` +
      `Tu saldo no fue afectado.\n\n` +
      `Escribe *AYUDA* o visita pagoyamx.com para soporte.`,
    ).catch(() => {});
  }
});

export default router;
