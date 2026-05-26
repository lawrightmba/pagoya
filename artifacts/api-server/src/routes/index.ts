import { Router, type IRouter, type Request, type Response } from "express";
import fs from "fs";
import path from "path";
import { eq, desc, gte, sql as drizzleSql } from "drizzle-orm";
import {
  db,
  userProfilesTable,
  userBillersTable,
  signupBonusConfigTable,
  repVelocityFlagsTable,
  walletTransactionsTable,
} from "@workspace/db";
import healthRouter from "./health";
import pagoyaRouter from "./pagoya";
import billPayRouter from "../billpay/routes/billpay.js";
import walletRouter from "../wallet/routes/wallet.js";
import { belvoPaymentsRouter } from "./belvo-payments";
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
import whatsappAgentRouter from "./whatsapp-agent.js";
import kycRouter from "./kyc.js";
import { getLoyaltyAdminStats } from "../services/loyalty.js";
import { logger } from "../lib/logger.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/pagoya", pagoyaRouter);
router.use("/bills", billPayRouter);
router.use("/wallet", walletRouter);
router.use("/belvo-payments", belvoPaymentsRouter);
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
router.use("/whatsapp-agent", whatsappAgentRouter);
router.use("/kyc", kycRouter);

console.log("✅ WhatsApp agent webhook ready at POST /api/whatsapp-agent");

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

export default router;
