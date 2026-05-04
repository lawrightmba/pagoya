import { Router, type IRouter, type Request, type Response } from "express";
import fs from "fs";
import path from "path";
import { eq } from "drizzle-orm";
import { db, userProfilesTable, userBillersTable } from "@workspace/db";
import healthRouter from "./health";
import pagoyaRouter from "./pagoya";
import billPayRouter from "../billpay/routes/billpay.js";
import walletRouter from "../wallet/routes/wallet.js";
import { belvoPaymentsRouter } from "./belvo-payments";
import proxyRouter from "./proxy";
import autofillRouter from "./autofill.js";
import loyaltyRouter from "./loyalty.js";
import streetTeamRouter from "./street-team.js";
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

// ─── Reminder opt-out ─────────────────────────────────────────────────────────

// POST /api/reminders/optout
// Body: { phone: string }
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

export default router;
