import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import fs from "fs";
import path from "path";
import { eq, desc, gte, sql as drizzleSql } from "drizzle-orm";
import {
  db,
  usersTable,
  userProfilesTable,
  userBillersTable,
  signupBonusConfigTable,
  repVelocityFlagsTable,
  walletTransactionsTable,
} from "@workspace/db";
import { sendActivationNudge } from "../services/nudgeService.js";
import { sendLowBalanceNudge, sendBillDiscoveryNudge, sendReferralNudge } from "../services/lifecycleNudgeService.js";
import healthRouter from "./health";
import pagoyaRouter from "./pagoya";
import billPayRouter from "../billpay/routes/billpay.js";
import walletRouter from "../wallet/routes/wallet.js";
import { belvoPaymentsRouter } from "./belvo-payments";
import { belvoConnectRouter } from "./belvo-connect";
import proxyRouter from "./proxy";
import autofillRouter from "./autofill.js";
import loyaltyRouter from "./loyalty.js";
import streetTeamRouter from "./street-team.js";
import streetTeamBonusRouter from "./streetTeamBonus.js";
import repsRouter from "./reps.js";
import historialRouter from "./historial.js";
import accountRecoveryRouter from "./accountRecovery.js";
import savedCardsRouter from "./savedCards.js";
import stpRouter from "./stpWebhook.js";
import agentChatRouter from "./agentChat.js";
import commandCenterAgentRouter from "./commandCenterAgent.js";
import whatsappAgentRouter from "./whatsapp-agent.js";
import kycRouter from "./kyc.js";
import pushRouter from "./push.js";
import pendingPaymentsRouter from "./pendingPayments.js";
import videoConvertRouter from "./videoConvert.js";
import eventsRouter from "./events.js";
import gamesRouter from "./games.js";
import b2bRouter from "./b2b.js";
import ptiRouter from "./pti.js";
import landlordRouter from "./landlords.js";
import complaintRouter from "./complaints.js";
import { getLoyaltyAdminStats } from "../services/loyalty.js";
import { sendWhatsApp, sendWhatsAppTemplate, templates } from "../lib/whatsapp.js";
import { logger } from "../lib/logger.js";

const router: IRouter = Router();

// ─── Admin auth guard ──────────────────────────────────────────────────────────
const adminAuth = (req: Request, res: Response, next: NextFunction): void => {
  const key = (req.headers["x-admin-key"] as string | undefined) || (req.query.adminKey as string | undefined);
  const expected = process.env.ADMIN_TOKEN ?? process.env.ADMIN_SECRET_KEY;
  if (!key || !expected || key !== expected) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
};

router.use(healthRouter);
router.use("/pagoya", pagoyaRouter);
router.use("/bills", billPayRouter);
router.use("/wallet", walletRouter);
router.use("/belvo-payments", belvoPaymentsRouter);
router.use("/belvo-connect", belvoConnectRouter);
router.use("/autofill", autofillRouter);
router.use("/loyalty", loyaltyRouter);
router.use("/street-team", streetTeamRouter);
router.use("/street-team", streetTeamBonusRouter);
router.use("/reps", repsRouter);
router.use("/historial", historialRouter);
router.use("/auth", accountRecoveryRouter);
router.use("/cards", savedCardsRouter);
router.use("/stp", stpRouter);
router.use("/agent/chat", agentChatRouter);
router.use("/command-center/chat", commandCenterAgentRouter);
router.use("/whatsapp-agent", whatsappAgentRouter);
router.use("/kyc", kycRouter);
router.use("/push", pushRouter);
router.use("/bills/pending", pendingPaymentsRouter);
router.use("/video", videoConvertRouter);
router.use("/events", eventsRouter);
router.use("/games", gamesRouter);
router.use("/pti", ptiRouter);
router.use("/b2b", b2bRouter);
router.use("/landlords", landlordRouter);
router.use("/complaints", complaintRouter);

console.log("✅ WhatsApp agent webhook ready at POST /api/whatsapp-agent");
console.log("✅ PTI routes ready at GET /api/pti/score and POST /api/pti/compute-now");

// ─── Homepage "notify me" lead capture ───────────────────────────────────────
// POST /api/notifications/register-interest
// Sends an immediate WhatsApp message inviting the user to complete registration.
router.post("/notifications/register-interest", async (req: Request, res: Response) => {
  const { phone, language } = req.body as { phone?: string; language?: string };
  const clean = (phone ?? "").replace(/\D/g, "").slice(-10);

  if (clean.length !== 10) {
    res.status(400).json({ error: "invalid_phone" });
    return;
  }

  const es = language !== "en";

  const message = es
    ? `👋 ¡Hola! Guardamos tu número en *PagoYa*.\n\n` +
      `Con PagoYa puedes pagar CFE, Telmex, recargas y más — sin banco, sin filas, desde WhatsApp.\n\n` +
      `Para crear tu cuenta gratis responde *HOLA* y te guío en 2 minutos. 🚀`
    : `👋 Hi! We saved your number in *PagoYa*.\n\n` +
      `With PagoYa you can pay CFE, Telmex, top up your phone and more — no bank account needed, all from WhatsApp.\n\n` +
      `To create your free account reply *HOLA* and I'll guide you in 2 minutes. 🚀`;

  // Fire-and-forget — don't block the response on Twilio
  // Use approved template for business-initiated sends; fall back to free-form
  // within active session windows (e.g. sandbox / pre-Meta-verification).
  const registerSid = templates.registerInterest();
  const sendPromise = registerSid
    ? sendWhatsAppTemplate(clean, registerSid)
    : sendWhatsApp(clean, message);
  sendPromise.catch((err) =>
    logger.error({ err, clean }, "register-interest: WhatsApp send failed"),
  );

  logger.info({ clean }, "register-interest: outreach sent");
  res.json({ success: true });
});

// ─── Reminder opt-out ─────────────────────────────────────────────────────────

// POST /api/reminders/optout
// Body: { phone: string }
// GET /api/config/whatsapp — returns the public WhatsApp number users message
router.get("/config/whatsapp", (_req: Request, res: Response) => {
  const raw = process.env.TWILIO_WHATSAPP_FROM ?? "";
  const number = raw.replace(/^whatsapp:\+?/i, "").replace(/\D/g, "");
  res.json({ number: number || null });
});

router.post("/reminders/optout", async (req: Request, res: Response) => {
  const { phone } = req.body as { phone?: string };
  if (!phone) {
    res.status(400).json({ error: "Se requiere el campo 'phone'." });
    return;
  }
  try {
    const [profile] = await db
      .select({ id: userProfilesTable.id })
      .from(userProfilesTable)
      .where(eq(userProfilesTable.phone, phone))
      .limit(1);

    if (!profile) {
      res.json({ success: true, message: "Recordatorios cancelados" });
      return;
    }

    await db
      .update(userProfilesTable)
      .set({ reminderOptedIn: false, updatedAt: new Date() })
      .where(eq(userProfilesTable.id, profile.id));

    await db
      .update(userBillersTable)
      .set({ reminderEnabled: false, updatedAt: new Date() })
      .where(eq(userBillersTable.profileId, profile.id));

    logger.info({ phone }, "reminders: user opted out");
    res.json({ success: true, message: "Recordatorios cancelados" });
  } catch (err) {
    logger.error({ err, phone }, "reminders: optout failed");
    res.status(500).json({ error: "Error al cancelar recordatorios." });
  }
});

// GET /api/reminders/status/:phone
router.get("/reminders/status/:phone", async (req: Request, res: Response) => {
  const { phone } = req.params;
  try {
    const [profile] = await db
      .select()
      .from(userProfilesTable)
      .where(eq(userProfilesTable.phone, phone))
      .limit(1);

    if (!profile) {
      res.json({ opted_in: true, billers: [] });
      return;
    }

    const billers = await db
      .select({
        billerName: userBillersTable.billerName,
        reminderEnabled: userBillersTable.reminderEnabled,
        paymentDay: userBillersTable.paymentDay,
      })
      .from(userBillersTable)
      .where(eq(userBillersTable.profileId, profile.id));

    res.json({ opted_in: profile.reminderOptedIn, billers });
  } catch (err) {
    logger.error({ err, phone }, "reminders: status lookup failed");
    res.status(500).json({ error: "Error al consultar estado." });
  }
});

router.use("/", proxyRouter);

// POST /api/upload-logo  — DEV TOOL: replaces pagoya-logo.png via base64 upload
// Protected by X-Upload-Token header. Remove this endpoint once the real logo is in place.
router.post("/upload-logo", (req: Request, res: Response) => {
  const token = req.headers["x-upload-token"];
  if (token !== "pagoya-dev-only") {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const { image } = req.body as { image?: string };
  if (!image) {
    res.status(400).json({ error: "Missing 'image' field (base64 PNG)" });
    return;
  }
  try {
    const buf = Buffer.from(image, "base64");
    const dest = path.resolve(process.cwd(), "../pagoya/public/pagoya-logo.png");
    fs.writeFileSync(dest, buf);
    res.json({ success: true, path: "/pagoya-logo.png", bytes: buf.length });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// POST /api/sync
// Called by the "Sync Latest" button on the command center dashboard.
// Returns the current deployment version and timestamp so the frontend
// knows the API server is reachable. Always responds with "up to date"
// since the deployed static files are fixed at build time.
router.post("/sync", (_req: Request, res: Response) => {
  res.json({
    message: "up to date",
    version: process.env.npm_package_version ?? "2.2",
    timestamp: new Date().toISOString(),
  });
});

// GET /api/stats — public platform stats, no auth required
router.get("/stats", async (_req: Request, res: Response) => {
  try {
    const result = await db.execute(
      drizzleSql`SELECT COUNT(*)::int AS total FROM bill_payments WHERE status IN ('confirmed', 'completed', 'confirmado', 'success')`
    );
    const total = parseInt(String((result.rows[0] as Record<string, unknown>)?.total ?? "0"), 10);
    res.set("Cache-Control", "public, max-age=60");
    res.json({ payments_completed: total });
  } catch {
    res.json({ payments_completed: 0 });
  }
});

// ─── Admin auth guard — verified pre-publish [June 2026] ──────────────────────
router.all(/^\/admin/, adminAuth);

// POST /api/admin/run-winback — manually trigger 30d win-back sweep (for verification)
router.post("/admin/run-winback", async (_req: Request, res: Response) => {
  try {
    const { runWinbackSweep } = await import("../services/winbackCron.js");
    const result = await runWinbackSweep();
    res.json({ ok: true, ...result });
  } catch (err) {
    logger.error({ err }, "admin/run-winback: failed");
    res.status(500).json({ error: "Winback sweep failed — check server logs." });
  }
});

// POST /api/admin/backfill-payment-counters — one-time backfill for existing users
// Only updates users where all three load counters are 0 (gate prevents overwrites)
router.post("/admin/backfill-payment-counters", async (_req: Request, res: Response) => {
  try {
    const { backfillPaymentMethodCounters } = await import("../services/loadMethodCounters.js");
    await backfillPaymentMethodCounters(db as Parameters<typeof backfillPaymentMethodCounters>[0]);
    res.json({ ok: true, message: "Backfill complete — check server logs for details." });
  } catch (err) {
    logger.error({ err }, "admin/backfill-payment-counters: failed");
    res.status(500).json({ error: "Backfill failed — check server logs." });
  }
});

// GET /api/admin/stats — command center overview including loyalty
router.get("/admin/stats", async (_req: Request, res: Response) => {
  try {
    const loyalty = await getLoyaltyAdminStats();
    res.json({ loyalty });
  } catch (err) {
    logger.error({ err }, "admin/stats: failed");
    res.status(500).json({ error: "Error al obtener estadísticas." });
  }
});

// GET /api/admin/bonus-config-read — read current config row id=1
router.get("/admin/bonus-config-read", async (_req: Request, res: Response) => {
  try {
    const [config] = await db
      .select()
      .from(signupBonusConfigTable)
      .where(eq(signupBonusConfigTable.id, 1))
      .limit(1);
    if (!config) {
      res.status(404).json({ error: "Config not found" });
      return;
    }
    res.json({
      is_active: config.isActive,
      bonus_amount: config.bonusAmount,
      eligible_rep_codes: config.eligibleRepCodes,
      warning_threshold: config.warningThreshold,
      block_threshold: config.blockThreshold,
    });
  } catch (err) {
    logger.error({ err }, "admin/bonus-config-read: failed");
    res.status(500).json({ error: "Error al leer configuración." });
  }
});

// POST /api/admin/bonus-config — update signup bonus config row id=1
router.post("/admin/bonus-config", async (req: Request, res: Response) => {
  try {
    const { is_active, bonus_amount, eligible_rep_codes, warning_threshold, block_threshold } = req.body as {
      is_active?: boolean;
      bonus_amount?: string | number;
      eligible_rep_codes?: string;
      warning_threshold?: number;
      block_threshold?: number;
    };

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (is_active !== undefined) updates.isActive = is_active;
    if (bonus_amount !== undefined) updates.bonusAmount = String(bonus_amount);
    if (eligible_rep_codes !== undefined) updates.eligibleRepCodes = eligible_rep_codes || null;
    if (warning_threshold !== undefined) updates.warningThreshold = Number(warning_threshold);
    if (block_threshold !== undefined) updates.blockThreshold = Number(block_threshold);

    await db.update(signupBonusConfigTable).set(updates).where(eq(signupBonusConfigTable.id, 1));
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "admin/bonus-config: failed");
    res.status(500).json({ error: "Error al guardar configuración." });
  }
});

// POST /api/debug/nudge/:userId — DEV ONLY: trigger nudge immediately (no 10-min wait)
// Use this to verify Twilio fires correctly in the Sandbox before deploying.
if (process.env.NODE_ENV !== "production") {
  router.post("/debug/nudge/:userId", async (req: Request, res: Response) => {
    const userId = parseInt(req.params.userId, 10);
    if (isNaN(userId) || userId <= 0) {
      res.status(400).json({ error: "userId must be a positive integer" });
      return;
    }
    try {
      const result = await sendActivationNudge(userId);
      res.json({ result });
    } catch (err) {
      logger.error({ err, userId }, "debug/nudge: error");
      res.status(500).json({ error: String(err) });
    }
  });

  // POST /api/debug/reset-welcome/:userId — DEV ONLY: reset welcome_shown to false
  router.post("/debug/reset-welcome/:userId", async (req: Request, res: Response) => {
    const userId = parseInt(req.params.userId, 10);
    if (isNaN(userId) || userId <= 0) {
      res.status(400).json({ error: "userId must be a positive integer" });
      return;
    }
    try {
      await db.execute(drizzleSql`UPDATE users SET welcome_shown = false WHERE id = ${userId}`);
      res.json({ ok: true, userId });
    } catch (err) {
      logger.error({ err, userId }, "debug/reset-welcome: error");
      res.status(500).json({ error: String(err) });
    }
  });

  // POST /api/debug/low-balance-nudge/:userId — DEV ONLY: trigger low balance nudge immediately
  router.post("/debug/low-balance-nudge/:userId", async (req: Request, res: Response) => {
    const userId = parseInt(req.params.userId, 10);
    if (isNaN(userId) || userId <= 0) {
      res.status(400).json({ error: "userId must be a positive integer" });
      return;
    }
    try {
      const result = await sendLowBalanceNudge(userId);
      res.json({ result });
    } catch (err) {
      logger.error({ err, userId }, "debug/low-balance-nudge: error");
      res.status(500).json({ error: String(err) });
    }
  });

  // POST /api/debug/bill-discovery-nudge/:userId — DEV ONLY: trigger bill discovery nudge immediately
  router.post("/debug/bill-discovery-nudge/:userId", async (req: Request, res: Response) => {
    const userId = parseInt(req.params.userId, 10);
    if (isNaN(userId) || userId <= 0) {
      res.status(400).json({ error: "userId must be a positive integer" });
      return;
    }
    try {
      const result = await sendBillDiscoveryNudge(userId);
      res.json({ result });
    } catch (err) {
      logger.error({ err, userId }, "debug/bill-discovery-nudge: error");
      res.status(500).json({ error: String(err) });
    }
  });

  // POST /api/debug/referral-nudge/:userId — DEV ONLY: trigger referral nudge immediately (no delay)
  router.post("/debug/referral-nudge/:userId", async (req: Request, res: Response) => {
    const userId = parseInt(req.params.userId, 10);
    if (isNaN(userId) || userId <= 0) {
      res.status(400).json({ error: "userId must be a positive integer" });
      return;
    }
    try {
      const result = await sendReferralNudge(userId);
      res.json({ result });
    } catch (err) {
      logger.error({ err, userId }, "debug/referral-nudge: error");
      res.status(500).json({ error: String(err) });
    }
  });

  // POST /api/debug/reset-lifecycle-nudges/:userId — DEV ONLY: reset all three lifecycle nudge timestamps
  router.post("/debug/reset-lifecycle-nudges/:userId", async (req: Request, res: Response) => {
    const userId = parseInt(req.params.userId, 10);
    if (isNaN(userId) || userId <= 0) {
      res.status(400).json({ error: "userId must be a positive integer" });
      return;
    }
    try {
      await db.execute(drizzleSql`
        UPDATE users SET
          low_balance_nudge_sent_at = NULL,
          bill_discovery_nudge_sent_at = NULL,
          referral_nudge_sent_at = NULL
        WHERE id = ${userId}
      `);
      res.json({ ok: true, userId, reset: ["low_balance_nudge_sent_at", "bill_discovery_nudge_sent_at", "referral_nudge_sent_at"] });
    } catch (err) {
      logger.error({ err, userId }, "debug/reset-lifecycle-nudges: error");
      res.status(500).json({ error: String(err) });
    }
  });
}

// ─── User routes ──────────────────────────────────────────────────────────────

// GET /api/user/me?telefono=... — first name, bonus amount from config, welcome_shown flag
router.get("/user/me", async (req: Request, res: Response) => {
  const telefono = (req.query.telefono as string | undefined)?.trim();
  if (!telefono) { res.status(400).json({ error: "telefono requerido" }); return; }
  try {
    const userRows = await db.execute(
      drizzleSql`SELECT kyc_full_name, welcome_shown FROM users WHERE telefono = ${telefono} LIMIT 1`,
    );
    const user = userRows.rows[0] as Record<string, unknown> | undefined;
    if (!user) { res.status(404).json({ error: "usuario no encontrado" }); return; }

    const [config] = await db
      .select({ bonusAmount: signupBonusConfigTable.bonusAmount })
      .from(signupBonusConfigTable)
      .where(eq(signupBonusConfigTable.id, 1))
      .limit(1);

    const firstName = ((user.kyc_full_name as string) ?? "").split(" ")[0] || "Usuario";
    res.json({
      firstName,
      telefono,
      welcomeShown: (user.welcome_shown as boolean) ?? false,
      bonusAmount: config ? parseFloat(config.bonusAmount ?? "25") : 25,
    });
  } catch (err) {
    logger.error({ err }, "user/me: failed");
    res.status(500).json({ error: "Error al obtener usuario." });
  }
});

// GET /api/user/welcome-shown?telefono=...
router.get("/user/welcome-shown", async (req: Request, res: Response) => {
  const telefono = (req.query.telefono as string | undefined)?.trim();
  if (!telefono) { res.status(400).json({ error: "telefono requerido" }); return; }
  try {
    const rows = await db.execute(
      drizzleSql`SELECT welcome_shown FROM users WHERE telefono = ${telefono} LIMIT 1`,
    );
    const row = rows.rows[0] as Record<string, unknown> | undefined;
    if (!row) { res.status(404).json({ error: "usuario no encontrado" }); return; }
    res.json({ welcomeShown: (row.welcome_shown as boolean) ?? false });
  } catch (err) {
    logger.error({ err }, "user/welcome-shown GET: failed");
    res.status(500).json({ error: "Error." });
  }
});

// PATCH /api/user/welcome-shown — set welcome_shown = true for a phone number
router.patch("/user/welcome-shown", async (req: Request, res: Response) => {
  const { telefono } = req.body as { telefono?: string };
  if (!telefono) { res.status(400).json({ error: "telefono requerido" }); return; }
  try {
    await db.execute(drizzleSql`UPDATE users SET welcome_shown = true WHERE telefono = ${telefono}`);
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "user/welcome-shown PATCH: failed");
    res.status(500).json({ error: "Error." });
  }
});

// GET /api/traction/metrics — live KPI snapshot for the command center traction tab
router.get("/traction/metrics", async (_req: Request, res: Response) => {
  try {
    const result = await db.execute(drizzleSql`
      SELECT
        (SELECT COUNT(*)::int FROM users)                                                              AS total_users,
        (SELECT COUNT(*)::int FROM users WHERE created_at > NOW() - INTERVAL '7 days')                AS new_users_7d,
        (SELECT COUNT(*)::int FROM users WHERE created_at > NOW() - INTERVAL '30 days')               AS new_users_30d,
        (SELECT COUNT(*)::int FROM bill_payments WHERE status = 'completed')                          AS total_payments,
        (SELECT COUNT(*)::int FROM bill_payments WHERE status = 'completed'
             AND created_at > NOW() - INTERVAL '7 days')                                              AS payments_7d,
        (SELECT COALESCE(SUM(monto),0)::numeric FROM bill_payments WHERE status = 'completed')        AS total_volume_mxn,
        (SELECT COALESCE(SUM(monto),0)::numeric FROM bill_payments
             WHERE status = 'completed' AND created_at > NOW() - INTERVAL '7 days')                   AS volume_7d_mxn,
        (SELECT COALESCE(SUM(platform_fee_mxn),0)::numeric FROM bill_payments
             WHERE status = 'completed')                                                               AS fee_revenue_total,
        (SELECT COALESCE(SUM(platform_fee_mxn),0)::numeric FROM bill_payments
             WHERE status = 'completed' AND created_at > NOW() - INTERVAL '7 days')                   AS fee_revenue_7d,
        (SELECT COUNT(*)::int FROM reps WHERE status = 'active')                                      AS active_reps,
        (SELECT COUNT(*)::int FROM reps)                                                               AS total_reps,
        (SELECT COUNT(*)::int FROM wallet_transactions WHERE status = 'confirmed'
             AND type IN ('load_card','load_oxxo','spei_in'))                                         AS total_loads,
        (SELECT COALESCE(SUM(amount_mxn),0)::numeric FROM wallet_transactions
             WHERE status = 'confirmed' AND type IN ('load_card','load_oxxo','spei_in'))              AS total_loaded_mxn
    `);
    const row = result.rows[0] as Record<string, unknown>;
    res.json({ ...row, as_of: new Date().toISOString() });
  } catch (err) {
    logger.error({ err }, "traction/metrics: query failed");
    res.status(500).json({ error: "Error al obtener métricas." });
  }
});

// GET /api/admin/users — all users with nudge + welcome_shown + lifecycle nudge status (most recent first, cap 200)
router.get("/admin/users", async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt((req.query.limit as string) ?? "200", 10) || 200, 500);
    const result = await db.execute(
      drizzleSql`SELECT id, telefono AS phone, kyc_full_name AS name,
                        signup_source, signup_ref_code, signup_bonus_claimed,
                        nudge_sent_at, welcome_shown,
                        low_balance_nudge_sent_at, bill_discovery_nudge_sent_at,
                        referral_nudge_sent_at, referral_code,
                        created_at
                 FROM users
                 ORDER BY created_at DESC
                 LIMIT ${limit}`,
    );
    const users = result.rows as Record<string, unknown>[];
    res.json({ users, count: users.length });
  } catch (err) {
    logger.error({ err }, "admin/users: failed");
    res.status(500).json({ error: "Error al obtener usuarios." });
  }
});

// GET /api/admin/rep-flags — all rep velocity flags ordered by flagged_at DESC
router.get("/admin/rep-flags", async (_req: Request, res: Response) => {
  try {
    const flags = await db
      .select()
      .from(repVelocityFlagsTable)
      .orderBy(desc(repVelocityFlagsTable.flaggedAt));
    res.json({ flags });
  } catch (err) {
    logger.error({ err }, "admin/rep-flags: failed");
    res.status(500).json({ error: "Error al obtener alertas." });
  }
});

// GET /api/admin/bonus-stats — bonus campaign stats with optional date range
router.get("/admin/bonus-stats", async (req: Request, res: Response) => {
  try {
    const { range = "today", start_date, end_date } = req.query as {
      range?: string;
      start_date?: string;
      end_date?: string;
    };

    let startDate: Date;
    let endDate: Date = new Date();

    if (range === "today") {
      startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
    } else if (range === "week") {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      startDate.setHours(0, 0, 0, 0);
    } else if (range === "custom" && start_date) {
      startDate = new Date(start_date);
      if (end_date) endDate = new Date(end_date);
    } else {
      startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
    }

    // Total count + value
    const totals = await db
      .select({
        count: drizzleSql<number>`count(*)::int`,
        total_value: drizzleSql<string>`coalesce(sum(amount_mxn::numeric), 0)::text`,
      })
      .from(walletTransactionsTable)
      .where(
        drizzleSql`type = 'SIGNUP_BONUS' AND created_at >= ${startDate} AND created_at <= ${endDate}`,
      );

    // By rep code (extracted from description field)
    const byRep = await db
      .select({
        ref_code: drizzleSql<string>`split_part(description, 'ref: ', 2)`,
        count: drizzleSql<number>`count(*)::int`,
        total_value: drizzleSql<string>`coalesce(sum(amount_mxn::numeric), 0)::text`,
      })
      .from(walletTransactionsTable)
      .where(
        drizzleSql`type = 'SIGNUP_BONUS' AND created_at >= ${startDate} AND created_at <= ${endDate}`,
      )
      .groupBy(drizzleSql`split_part(description, 'ref: ', 2)`);

    // By date
    const byDate = await db
      .select({
        date: drizzleSql<string>`date(created_at)::text`,
        count: drizzleSql<number>`count(*)::int`,
        total_value: drizzleSql<string>`coalesce(sum(amount_mxn::numeric), 0)::text`,
      })
      .from(walletTransactionsTable)
      .where(
        drizzleSql`type = 'SIGNUP_BONUS' AND created_at >= ${startDate} AND created_at <= ${endDate}`,
      )
      .groupBy(drizzleSql`date(created_at)`)
      .orderBy(drizzleSql`date(created_at) desc`);

    const distinctReps = byRep.filter((r) => r.ref_code && r.ref_code.trim()).length;

    res.json({
      total_bonuses_issued: totals[0]?.count ?? 0,
      total_bonus_value: totals[0]?.total_value ?? "0",
      active_reps: distinctReps,
      by_rep: byRep.filter((r) => r.ref_code && r.ref_code.trim()),
      by_date: byDate,
    });
  } catch (err) {
    logger.error({ err }, "admin/bonus-stats: failed");
    res.status(500).json({ error: "Error al obtener estadísticas." });
  }
});

// GET /api/admin/investor-stats — comprehensive investor-facing metrics
// Protected by existing adminAuth (/admin/* guard above). Apps Script uses ?adminKey=
router.get("/admin/investor-stats", async (_req: Request, res: Response) => {
  try {
    const [main, weekly, topBillers] = await Promise.all([
      db.execute(drizzleSql`
        SELECT
          (SELECT COUNT(*)::int  FROM users WHERE is_test_account IS NOT TRUE)                                                      AS users_total,
          (SELECT COUNT(*)::int  FROM users WHERE is_test_account IS NOT TRUE AND created_at > NOW() - INTERVAL '7 days')           AS users_7d,
          (SELECT COUNT(*)::int  FROM users WHERE is_test_account IS NOT TRUE AND created_at > NOW() - INTERVAL '30 days')          AS users_30d,
          (SELECT COUNT(*)::int  FROM users WHERE is_test_account IS NOT TRUE AND kyc_full_name IS NOT NULL AND kyc_full_name != '') AS users_with_name,
          (SELECT COUNT(*)::int  FROM users WHERE is_test_account IS NOT TRUE AND signup_source = 'whatsapp_organic')               AS users_whatsapp,
          (SELECT COUNT(*)::int  FROM users WHERE is_test_account IS NOT TRUE AND signup_source = 'web_organic')                    AS users_web,
          (SELECT COUNT(*)::int  FROM users WHERE is_test_account IS NOT TRUE AND signup_source = 'rep_referral')                   AS users_rep,
          (SELECT COUNT(*)::int  FROM bill_payments WHERE status IN ('confirmed','completed','confirmado','success'))                AS payments_total,
          (SELECT COALESCE(SUM(monto),0)::float            FROM bill_payments WHERE status IN ('confirmed','completed','confirmado','success'))                                                          AS volume_total,
          (SELECT COALESCE(SUM(platform_fee_mxn),0)::float FROM bill_payments WHERE status IN ('confirmed','completed','confirmado','success'))                                                          AS revenue_total,
          (SELECT COUNT(*)::int  FROM bill_payments WHERE status IN ('confirmed','completed','confirmado','success') AND created_at > NOW() - INTERVAL '7 days')                                        AS payments_7d,
          (SELECT COALESCE(SUM(monto),0)::float            FROM bill_payments WHERE status IN ('confirmed','completed','confirmado','success') AND created_at > NOW() - INTERVAL '7 days')               AS volume_7d,
          (SELECT COALESCE(SUM(platform_fee_mxn),0)::float FROM bill_payments WHERE status IN ('confirmed','completed','confirmado','success') AND created_at > NOW() - INTERVAL '7 days')               AS revenue_7d,
          (SELECT COUNT(*)::int  FROM bill_payments WHERE status IN ('confirmed','completed','confirmado','success') AND created_at > NOW() - INTERVAL '30 days')                                       AS payments_30d,
          (SELECT COALESCE(SUM(monto),0)::float            FROM bill_payments WHERE status IN ('confirmed','completed','confirmado','success') AND created_at > NOW() - INTERVAL '30 days')              AS volume_30d,
          (SELECT COALESCE(SUM(platform_fee_mxn),0)::float FROM bill_payments WHERE status IN ('confirmed','completed','confirmado','success') AND created_at > NOW() - INTERVAL '30 days')              AS revenue_30d,
          (SELECT COUNT(*)::int         FROM wallets)                                                                               AS wallet_count,
          (SELECT COALESCE(SUM(balance_mxn),0)::float FROM wallets)                                                                AS wallet_balance_total,
          (SELECT COALESCE(AVG(pti_score),0)::float   FROM users WHERE is_test_account IS NOT TRUE AND pti_score IS NOT NULL)      AS avg_pti_score
      `),
      db.execute(drizzleSql`
        SELECT
          date_trunc('week', created_at AT TIME ZONE 'America/Mexico_City')::date AS week_start,
          COUNT(*)::int AS signups
        FROM users
        WHERE is_test_account IS NOT TRUE
          AND created_at > NOW() - INTERVAL '12 weeks'
        GROUP BY week_start
        ORDER BY week_start ASC
      `),
      db.execute(drizzleSql`
        SELECT service_name,
               COUNT(*)::int                                               AS tx_count,
               COALESCE(SUM(monto),0)::float                              AS volume_mxn,
               COALESCE(SUM(platform_fee_mxn),0)::float                  AS revenue_mxn
        FROM bill_payments
        WHERE status IN ('confirmed','completed','confirmado','success')
        GROUP BY service_name
        ORDER BY volume_mxn DESC
        LIMIT 5
      `),
    ]);

    const row = main.rows[0] as Record<string, unknown>;
    res.set("Cache-Control", "no-store");
    res.json({
      as_of: new Date().toISOString(),
      users: {
        total:         row.users_total,
        new_7d:        row.users_7d,
        new_30d:       row.users_30d,
        with_name:     row.users_with_name,
        by_source: {
          whatsapp_organic: row.users_whatsapp,
          web_organic:      row.users_web,
          rep_referral:     row.users_rep,
        },
      },
      payments: {
        completed:      row.payments_total,
        volume_total:   row.volume_total,
        revenue_total:  row.revenue_total,
        last_7d:  { count: row.payments_7d,  volume: row.volume_7d,  revenue: row.revenue_7d  },
        last_30d: { count: row.payments_30d, volume: row.volume_30d, revenue: row.revenue_30d },
      },
      wallets: {
        count:         row.wallet_count,
        balance_total: row.wallet_balance_total,
      },
      pti: {
        avg_score: row.avg_pti_score,
      },
      growth: {
        weekly_signups: weekly.rows.map((r) => {
          const rr = r as Record<string, unknown>;
          return { week: rr.week_start, signups: rr.signups };
        }),
      },
      top_billers: topBillers.rows.map((r) => {
        const rr = r as Record<string, unknown>;
        return { service: rr.service_name, count: rr.tx_count, volume: rr.volume_mxn, revenue: rr.revenue_mxn };
      }),
    });
  } catch (err) {
    logger.error({ err }, "admin/investor-stats: failed");
    res.status(500).json({ error: "Error al obtener métricas." });
  }
});

// GET /api/admin/compliance-summary — live compliance dashboard for institutional review
router.get("/admin/compliance-summary", async (_req: Request, res: Response) => {
  try {
    const [kycRes, ptiRes, txRes, userSummary] = await Promise.all([
      db.execute(drizzleSql`
        SELECT kyc_tier, COUNT(*)::int AS n
        FROM users WHERE is_test_account IS NOT TRUE
        GROUP BY kyc_tier ORDER BY n DESC
      `),
      db.execute(drizzleSql`
        SELECT
          CASE WHEN pti_score >= 70 THEN 'Oro' WHEN pti_score >= 40 THEN 'Plata' ELSE 'Bronce' END AS tier,
          COUNT(*)::int AS n
        FROM users WHERE is_test_account IS NOT TRUE AND pti_score IS NOT NULL
        GROUP BY 1
      `),
      db.execute(drizzleSql`
        SELECT
          date_trunc('week', created_at AT TIME ZONE 'America/Mexico_City')::date AS week_start,
          COUNT(*)::int AS tx_count,
          COALESCE(SUM(monto), 0)::float AS volume_mxn,
          COALESCE(AVG(monto), 0)::float AS avg_mxn
        FROM bill_payments
        WHERE status IN ('confirmed','completed','confirmado','success')
          AND created_at > NOW() - INTERVAL '8 weeks'
        GROUP BY 1 ORDER BY 1 ASC
      `),
      db.execute(drizzleSql`
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days')::int AS new_30d,
          COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '90 days')::int AS new_90d,
          COUNT(*) FILTER (WHERE kyc_tier IN ('standard','enhanced'))::int AS kyc_upgraded,
          COUNT(*) FILTER (WHERE kyc_curp IS NOT NULL)::int AS curp_on_file,
          COUNT(*) FILTER (WHERE pti_score IS NOT NULL)::int AS pti_scored,
          COUNT(*) FILTER (WHERE referred_by_institution IS NOT NULL)::int AS from_institution
        FROM users WHERE is_test_account IS NOT TRUE
      `),
    ]);

    const handoffCountRes = await db.execute(drizzleSql`
      SELECT COUNT(*) AS cnt FROM readiness_assessments WHERE handoff_requested = true
    `);
    const handoffPending = Number((handoffCountRes.rows[0] as Record<string, unknown>)?.cnt ?? 0);

    const s = userSummary.rows[0] as Record<string, unknown>;
    res.set("Cache-Control", "no-store");
    res.json({
      as_of: new Date().toISOString(),
      users: {
        total:           s.total,
        new_30d:         s.new_30d,
        new_90d:         s.new_90d,
        kyc_upgraded:    s.kyc_upgraded,
        curp_on_file:    s.curp_on_file,
        pti_scored:      s.pti_scored,
        from_institution: s.from_institution,
      },
      kyc_tiers:  kycRes.rows,
      pti_tiers:  ptiRes.rows,
      weekly_tx:  txRes.rows,
      handoff_requests_pending: handoffPending,
    });
  } catch (err) {
    logger.error({ err }, "admin/compliance-summary: failed");
    res.status(500).json({ error: "Error al obtener resumen de cumplimiento." });
  }
});

// GET /api/admin/handoff-requests
// Users who replied SÍ to the readiness_hard message — ops follow-up queue
router.get("/admin/handoff-requests", async (_req: Request, res: Response) => {
  try {
    const rows = await db.execute(drizzleSql`
      SELECT
        ra.id                AS assessment_id,
        ra.telefono,
        u.kyc_full_name      AS nombre,
        ra.gate_status,
        ra.pti_score_at,
        ra.streak_days_at,
        ra.bill_diversity_at,
        ra.literacy_score_at,
        ra.handoff_at,
        pp.display_name      AS partner_display_name,
        ra.handoff_notes
      FROM readiness_assessments ra
      LEFT JOIN users          u  ON u.telefono  = ra.telefono
      LEFT JOIN partner_programs pp ON pp.id     = ra.partner_program_id
      WHERE ra.handoff_requested = true
      ORDER BY ra.handoff_at DESC
      LIMIT 100
    `);
    res.json({ handoff_requests: rows.rows, count: rows.rows.length });
  } catch (err) {
    logger.error({ err }, "admin/handoff-requests: failed");
    res.status(500).json({ error: "Failed to fetch handoff requests" });
  }
});

export default router;
