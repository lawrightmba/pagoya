import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import fs from "fs";
import path from "path";
import { eq, desc, gte, sql as drizzleSql } from "drizzle-orm";
import {
  db,
  pool,
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
import licenseeApiRouter from "./licenseeApi.js";
import landlordRouter from "./landlords.js";
import complaintRouter from "./complaints.js";
import build1aAdminRouter from "./build1aAdmin.js";
import { build1aNotReadyMiddleware } from "../services/build1a/build1aReadiness.js";
import build2aAdminRouter from "./build2aAdmin.js";
import { build2aNotReadyMiddleware } from "../services/build2a/build2aReadiness.js";
import build3aAdminRouter from "./build3aAdmin.js";
import { build3aNotReadyMiddleware } from "../services/build3a/build3aReadiness.js";
import { getLoyaltyAdminStats } from "../services/loyalty.js";
import { sendWhatsApp, sendWhatsAppTemplate, templates } from "../lib/whatsapp.js";
import { logger } from "../lib/logger.js";
import { toE164 } from "../lib/phoneUtils.js";

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
// Build 1A: admin-only instrumentation + readiness dashboard
// C5: build1aNotReadyMiddleware returns 503 while migration is pending/failed.
// It runs before adminAuth so the startup window never surfaces raw DB errors.
// The primary PagoYa app is completely unaffected.
router.use("/admin/build1a", build1aNotReadyMiddleware, adminAuth, build1aAdminRouter);
// Build 2A: Package 2A-1 registry + version admin routes.
// build2aNotReadyMiddleware returns 503 while migration is pending/failed.
// Primary PagoYa app and Build 1A routes are completely unaffected.
router.use("/admin/build2a", build2aNotReadyMiddleware, adminAuth, build2aAdminRouter);
router.use("/admin/build3a", build3aNotReadyMiddleware, adminAuth, build3aAdminRouter);
router.use("/whatsapp-agent", whatsappAgentRouter);
router.use("/kyc", kycRouter);
router.use("/push", pushRouter);
router.use("/bills/pending", pendingPaymentsRouter);
router.use("/video", videoConvertRouter);
router.use("/events", eventsRouter);
router.use("/games", gamesRouter);
router.use("/pti", ptiRouter);
router.use("/v1", licenseeApiRouter);
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
  // Convert to full E.164 — supports MX (+52) and US/CA (+1)
  const clean = toE164((phone ?? "").trim());

  // Reject obviously malformed numbers (E.164 is at least 8 chars: +1XXXXXXX)
  if (!/^\+\d{7,15}$/.test(clean)) {
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

// POST /api/admin/run-enrichment — manually trigger nightly enrichment + monthly seed
// Body: { telefono?: string, seed?: boolean }
// If telefono is provided, runs enrichment for that single user only (faster, for smoke tests).
router.post("/admin/run-enrichment", async (_req: Request, res: Response) => {
  try {
    const { runNightlyEnrichment, seedExpectedPaymentsForCycle, computeEnrichmentForUser } = await import("../services/enrichmentCron.js");
    const { seed, telefono } = _req.body as { seed?: boolean; telefono?: string };
    if (telefono) {
      await computeEnrichmentForUser(telefono);
      res.json({ ok: true, message: `Enrichment run complete for ${telefono}.` });
      return;
    }
    await runNightlyEnrichment();
    if (seed) await seedExpectedPaymentsForCycle();
    res.json({ ok: true, message: "Enrichment run complete — check server logs." });
  } catch (err) {
    logger.error({ err }, "admin/run-enrichment: failed");
    res.status(500).json({ error: "Enrichment failed — check server logs." });
  }
});

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

// POST /api/admin/run-v5-shadow — Phase A backfill: compute v5.0 shadow scores for all
// active users and insert rows into pti_v5_shadow_recompute. Fire-and-forget per user;
// never touches pti_score / pti_breakdown. Remove this route after B4 backfill is confirmed.
router.post("/admin/run-v5-shadow", async (_req: Request, res: Response) => {
  try {
    const { db: dbInst } = await import("@workspace/db");
    const { sql: sqlTag } = await import("drizzle-orm");
    const { computePTIv5ForUser } = await import("../services/ptiV5.js");

    const allUsers = await dbInst.execute(sqlTag`
      SELECT DISTINCT telefono FROM users
      WHERE telefono IS NOT NULL AND telefono != ''
      AND is_test_account IS NOT TRUE
    `);
    const phones = allUsers.rows.map((r: Record<string, unknown>) => r.telefono as string);

    let ok = 0;
    let failed = 0;
    for (const telefono of phones) {
      try {
        await computePTIv5ForUser(telefono);
        ok++;
      } catch (err) {
        logger.warn({ err, telefono }, "admin/run-v5-shadow: per-user shadow compute failed");
        failed++;
      }
      await new Promise(r => setTimeout(r, 50));
    }
    res.json({ ok: true, computed: ok, failed, total: phones.length });
  } catch (err) {
    logger.error({ err }, "admin/run-v5-shadow: failed");
    res.status(500).json({ error: "V5 shadow backfill failed — check server logs." });
  }
});

// GET /api/admin/phase-e-transition-status — Phase C/E probe (no side effects).
// Returns qualifying users, content_sid state, and already-dispatched counts.
// Safe to call at any time; used to verify preconditions before Phase E go-order.
router.get("/admin/phase-e-transition-status", async (_req: Request, res: Response) => {
  try {
    const { getTransitionDispatchStatus } = await import("../services/phaseETransition.js");
    const status = await getTransitionDispatchStatus();
    res.json({ ok: true, ...status });
  } catch (err) {
    logger.error({ err }, "admin/phase-e-transition-status: failed");
    res.status(500).json({ error: "Status check failed — see server logs." });
  }
});

// POST /api/admin/phase-e-dispatch-transition — Phase E step 1 (§3.4 step 5).
// Dispatches the pti_v5_transition message for users with |delta| > 5 pts.
// MUST be called BEFORE the v5.0 recompute writes new live scores.
//
// Safety gate: requires {"confirm":"V5_TRANSITION_DISPATCH"} in request body.
// Idempotent: re-running is safe — already-queued rows are detected and skipped.
//
// Precondition: pti_v5_transition.content_sid must be set in paula_messages
// (Meta approval confirmed). Dispatch proceeds without it but delivery will
// stall in the send-queue until the SID is present.
router.post("/admin/phase-e-dispatch-transition", async (req: Request, res: Response) => {
  if (req.body?.confirm !== "V5_TRANSITION_DISPATCH") {
    res.status(400).json({
      error: "Safety gate: include {\"confirm\":\"V5_TRANSITION_DISPATCH\"} in request body.",
    });
    return;
  }
  try {
    const { dispatchV5TransitionMessages } = await import("../services/phaseETransition.js");
    const result = await dispatchV5TransitionMessages();
    logger.info({ result }, "admin/phase-e-dispatch-transition: complete");
    res.json({ ok: true, ...result });
  } catch (err) {
    logger.error({ err }, "admin/phase-e-dispatch-transition: failed");
    res.status(500).json({ error: "Transition dispatch failed — see server logs." });
  }
});

// POST /api/admin/phase-e-recompute — Phase E step 2: one-time live recompute of all users
// under v5.0. Writes to users.pti_score / pti_breakdown / pti_computed_at for every
// non-test user. Returns before/after score table (9-user evidence standard).
//
// Safety gate: requires {"confirm":"V5_LIVE_RECOMPUTE"} in request body.
// Idempotent: safe to re-run — each call recomputes the score from live data.
// MUST be called AFTER phase-e-dispatch-transition (transition messages must precede flip).
router.post("/admin/phase-e-recompute", async (req: Request, res: Response) => {
  if (req.body?.confirm !== "V5_LIVE_RECOMPUTE") {
    res.status(400).json({
      error: 'Safety gate: include {"confirm":"V5_LIVE_RECOMPUTE"} in request body.',
    });
    return;
  }
  try {
    const { db } = await import("@workspace/db");
    const { sql } = await import("drizzle-orm");
    const { computePTIv5ForAllUsers } = await import("../services/ptiV5.js");

    // Capture before-scores from pti_v5_shadow_recompute (B5 baselines)
    const before = await db.execute(sql`
      SELECT DISTINCT ON (s.telefono)
        s.telefono,
        u.pti_score      AS v4_score,
        s.pti_v5_total   AS shadow_v5_score,
        u.pti_breakdown->>'model_version' AS v4_model
      FROM pti_v5_shadow_recompute s
      JOIN users u ON u.telefono = s.telefono
      WHERE u.is_test_account IS NOT TRUE
      ORDER BY s.telefono, s.computed_at DESC
    `);

    // Run the live recompute
    const { updated, errors } = await computePTIv5ForAllUsers();

    // Capture after-scores
    const after = await db.execute(sql`
      SELECT telefono, pti_score AS v5_live_score,
             pti_breakdown->>'model_version' AS model_version,
             pti_computed_at
      FROM users
      WHERE is_test_account IS NOT TRUE
        AND pti_score IS NOT NULL
      ORDER BY telefono
    `);

    const beforeMap: Record<string, { v4: number; shadowV5: number }> = {};
    for (const r of before.rows as Array<Record<string, unknown>>) {
      beforeMap[String(r.telefono)] = {
        v4: Number(r.v4_score ?? 0),
        shadowV5: Number(r.shadow_v5_score ?? 0),
      };
    }

    const scoreTable = (after.rows as Array<Record<string, unknown>>).map(r => {
      const tel = String(r.telefono);
      const b = beforeMap[tel] ?? { v4: null, shadowV5: null };
      return {
        telefono: tel,
        v4_score: b.v4,
        shadow_v5_score: b.shadowV5,
        live_v5_score: Number(r.v5_live_score),
        delta_from_v4: b.v4 !== null ? Number(r.v5_live_score) - b.v4 : null,
        model_version: String(r.model_version ?? ""),
        computed_at: r.pti_computed_at,
      };
    });

    logger.info({ updated, errors, users: scoreTable.length }, "admin/phase-e-recompute: complete");
    res.json({ ok: true, updated, errors, score_table: scoreTable });
  } catch (err) {
    logger.error({ err }, "admin/phase-e-recompute: failed");
    res.status(500).json({ error: "Phase E recompute failed — see server logs." });
  }
});

// GET /api/admin/pti-v5-monitoring — Phase E monitoring panel.
// Returns: PTI-70 tripwire, tolerant-streak counter, score distribution,
// model version coverage, G-C gate status. Read-only probe.
router.get("/admin/pti-v5-monitoring", async (_req: Request, res: Response) => {
  try {
    const { db } = await import("@workspace/db");
    const { sql } = await import("drizzle-orm");

    // Score distribution by tier
    const tierDist = await db.execute(sql`
      SELECT
        CASE
          WHEN pti_score >= 85 THEN 'Elite'
          WHEN pti_score >= 70 THEN 'Oro'
          WHEN pti_score >= 50 THEN 'Plata'
          WHEN pti_score >= 30 THEN 'Bronce'
          ELSE 'Nuevo'
        END AS tier,
        COUNT(*)::int AS n
      FROM users
      WHERE pti_score IS NOT NULL AND is_test_account IS NOT TRUE
      GROUP BY 1 ORDER BY MIN(pti_score) DESC
    `);

    // PTI-70 tripwire: users at or above 70
    const tripwire70 = await db.execute(sql`
      SELECT COUNT(*)::int AS count FROM users
      WHERE pti_score >= 70 AND is_test_account IS NOT TRUE
    `);

    // Model version coverage
    const modelCoverage = await db.execute(sql`
      SELECT pti_breakdown->>'model_version' AS model_version, COUNT(*)::int AS n
      FROM users
      WHERE pti_score IS NOT NULL AND is_test_account IS NOT TRUE
      GROUP BY 1 ORDER BY n DESC
    `);

    // Tolerant-streak counter: G-C gate (users with streak_months <= 2 in live v5 breakdown)
    const tolerantStreak = await db.execute(sql`
      SELECT COUNT(*)::int AS tolerant_count
      FROM users
      WHERE pti_score IS NOT NULL
        AND is_test_account IS NOT TRUE
        AND (pti_breakdown->'payment_streak'->>'months')::int <= 2
    `);

    // Shadow vs live delta summary (users with both scores)
    const deltaSummary = await db.execute(sql`
      SELECT
        COUNT(*)::int AS users_with_shadow,
        ROUND(AVG(ABS(u.pti_score - s.pti_v5_total))::numeric, 2) AS avg_abs_delta,
        MAX(ABS(u.pti_score - s.pti_v5_total))::int AS max_abs_delta,
        SUM(CASE WHEN u.pti_score < s.pti_v5_total THEN 1 ELSE 0 END)::int AS live_higher_than_shadow,
        SUM(CASE WHEN u.pti_score = s.pti_v5_total THEN 1 ELSE 0 END)::int AS live_equal_shadow,
        SUM(CASE WHEN u.pti_score > s.pti_v5_total THEN 1 ELSE 0 END)::int AS live_lower_than_shadow
      FROM users u
      JOIN (
        SELECT DISTINCT ON (telefono) telefono, pti_v5_total
        FROM pti_v5_shadow_recompute ORDER BY telefono, computed_at DESC
      ) s ON s.telefono = u.telefono
      WHERE u.is_test_account IS NOT TRUE AND u.pti_score IS NOT NULL
    `);

    // ── NEW: History table row counts by model_version ───────────────────────
    // Catches silent version-drift: if nightly computes write to the wrong
    // model_version bucket, counts here diverge from model_version_coverage above.
    const historyByModel = await db.execute(sql`
      SELECT
        COALESCE(breakdown->>'model_version', '(null)') AS model_version,
        COUNT(*)::int                                   AS n
      FROM pti_score_history
      GROUP BY 1
      ORDER BY n DESC
    `);

    // ── NEW: Trend snapshot row counts by model_version ───────────────────────
    // pti_trend_snapshots.model_version was widened from VARCHAR(10) to TEXT;
    // any truncation bug would show mismatched counts here vs historyByModel.
    const snapshotsByModel = await db.execute(sql`
      SELECT
        COALESCE(model_version, '(null)') AS model_version,
        COUNT(*)::int                     AS n
      FROM pti_trend_snapshots
      GROUP BY 1
      ORDER BY n DESC
    `);

    // ── NEW: Users with ≥ 3 same-model trend snapshot rows ───────────────────
    // A user needs at least 3 same-model snapshots for a meaningful trajectory
    // calculation. Low coverage here signals the trajectory layer is starved.
    const usersWithEnoughSnapshots = await db.execute(sql`
      SELECT COUNT(*)::int AS count
      FROM (
        SELECT user_id
        FROM pti_trend_snapshots
        WHERE model_version IS NOT NULL
        GROUP BY user_id, model_version
        HAVING COUNT(*) >= 3
      ) sub
    `);

    // ── NEW: Same-model history span distribution ─────────────────────────────
    // "span_days" = MAX(recorded_at) - MIN(recorded_at) for the active model.
    // Users with < 30 days of same-model history have very limited trajectory
    // signal. Update the hardcoded model string when the active model changes.
    // NOTE: 'v5.0.0-rc1' is hardcoded intentionally — update alongside model_active.
    const historySpanDist = await db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE span_days >= 30)::int AS users_30d_span,
        COUNT(*) FILTER (WHERE span_days >= 60)::int AS users_60d_span,
        COUNT(*) FILTER (WHERE span_days >= 90)::int AS users_90d_span
      FROM (
        SELECT
          telefono,
          EXTRACT(EPOCH FROM (MAX(recorded_at) - MIN(recorded_at))) / 86400.0 AS span_days
        FROM pti_score_history
        WHERE breakdown->>'model_version' = 'v5.0.0-rc1'
        GROUP BY telefono
      ) sub
    `);

    // ── NEW: Silent write failure detection ───────────────────────────────────
    // Compares the set of users who received a pti_score_history row in the most
    // recent nightly batch against those who received a pti_trend_snapshots row
    // in the same window. A non-zero mismatch_count indicates a silent failure
    // of the same kind found in the model_version VARCHAR(10) audit: history rows
    // written but corresponding snapshot rows silently failing.
    //
    // "Last nightly batch" is approximated as all rows within 2 hours of the
    // most recent recorded_at in pti_score_history. This is robust to normal
    // batch sizes but may conflate two consecutive batches if they run < 2h apart
    // (unlikely for a nightly cadence).
    const silentWriteCheck = await db.execute(sql`
      WITH last_batch_anchor AS (
        SELECT MAX(recorded_at) AS max_recorded FROM pti_score_history
      ),
      history_batch AS (
        SELECT DISTINCT h.telefono
        FROM pti_score_history h
        CROSS JOIN last_batch_anchor
        WHERE h.recorded_at >= max_recorded - INTERVAL '2 hours'
      ),
      snapshot_batch AS (
        SELECT DISTINCT u.telefono
        FROM pti_trend_snapshots pts
        JOIN users u ON u.id = pts.user_id
        CROSS JOIN last_batch_anchor
        WHERE pts.computed_at >= max_recorded - INTERVAL '2 hours'
      )
      SELECT
        (SELECT COUNT(*)::int    FROM history_batch)                              AS users_got_history,
        (SELECT COUNT(*)::int    FROM snapshot_batch)                             AS users_got_snapshot,
        (SELECT COUNT(*)::int    FROM history_batch h
         LEFT JOIN snapshot_batch s ON s.telefono = h.telefono
         WHERE s.telefono IS NULL)                                                AS snapshot_write_mismatches,
        (SELECT max_recorded::text FROM last_batch_anchor)                        AS last_batch_at
    `);

    res.json({
      ok: true,
      as_of: new Date().toISOString(),
      model_active: "v5.0.0-rc1",
      tier_distribution: tierDist.rows,
      pti_70_tripwire: { count: Number((tripwire70.rows[0] as Record<string, unknown>).count ?? 0) },
      tolerant_streak_counter: {
        count: Number((tolerantStreak.rows[0] as Record<string, unknown>).tolerant_count ?? 0),
        label: "Users with streak_months ≤ 2 (G-C tolerant branch)",
      },
      model_version_coverage: modelCoverage.rows,
      shadow_vs_live_delta: deltaSummary.rows[0] ?? null,
      // ── New monitoring fields ──────────────────────────────────────────────
      score_history_by_model: historyByModel.rows,
      snapshots_by_model: snapshotsByModel.rows,
      users_with_3plus_snapshots: Number(
        (usersWithEnoughSnapshots.rows[0] as Record<string, unknown>)?.count ?? 0,
      ),
      history_span_distribution: historySpanDist.rows[0] ?? null,
      silent_write_check: silentWriteCheck.rows[0] ?? null,
    });
  } catch (err) {
    logger.error({ err }, "admin/pti-v5-monitoring: failed");
    res.status(500).json({ error: "Monitoring probe failed — see server logs." });
  }
});

// POST /api/admin/run-paula-send-queue — manually trigger one paula_send_queue processing
// pass (for verification). Mirrors the 2-min in-process cron in paulaSendQueue.ts; useful
// on autoscale deployments where the interval timer's cadence is not guaranteed.
router.post("/admin/run-paula-send-queue", async (_req: Request, res: Response) => {
  try {
    const { processSendQueue } = await import("../services/paulaSendQueue.js");
    await processSendQueue();
    res.json({ ok: true, message: "Send queue pass complete — check server logs / paula_send_queue for results." });
  } catch (err) {
    logger.error({ err }, "admin/run-paula-send-queue: failed");
    res.status(500).json({ error: "Send queue pass failed — check server logs." });
  }
});

// GET /api/admin/db-diagnostic — read-only: returns current_database(), server host,
// and the in-memory value of PAULA_SENDING_ENABLED as read at process startup.
// No query params, no side effects.
router.get("/admin/db-diagnostic", async (_req: Request, res: Response) => {
  try {
    const result = await pool.query<{ db: string; host: string }>(
      "SELECT current_database() AS db, inet_server_addr()::text AS host"
    );
    const row = result.rows[0];
    res.json({
      db: row.db,
      host: row.host ?? null,
      paula_sending_enabled: process.env.PAULA_SENDING_ENABLED === "true",
    });
  } catch (err) {
    logger.error({ err }, "admin/db-diagnostic: failed");
    res.status(500).json({ error: "db-diagnostic failed — check server logs." });
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

// POST /api/admin/seed-paula-messages — idempotent upsert of all paula_messages rows.
// Replaces the old seed-paula-messages-step3 endpoint.
// Safe to call on every deploy — upserts content, respects explicit active values.
router.post("/admin/seed-paula-messages", async (_req: Request, res: Response) => {
  try {
    const { seedPaulaMessages, PAULA_MESSAGES_EXPECTED_ACTIVE, PAULA_MESSAGES_TOTAL_IN_SEED } =
      await import("../services/seedPaulaMessages.js");
    const result = await seedPaulaMessages(db);
    res.json({
      ok: true,
      totalInSeed: PAULA_MESSAGES_TOTAL_IN_SEED,
      expectedActive: PAULA_MESSAGES_EXPECTED_ACTIVE,
      ...result,
    });
  } catch (err) {
    logger.error({ err }, "admin/seed-paula-messages: failed");
    res.status(500).json({ error: "Seed failed — check server logs." });
  }
});

// GET /api/admin/paula-template-health — read-only: active template count,
// per-trigger content_sid coverage, send-enablement gate, queue summary.
// Step 7.5 gate: sending_gate_passed must be true (coverage = 22/22) before
// setting PAULA_SENDING_ENABLED=true.
router.get("/admin/paula-template-health", async (_req: Request, res: Response) => {
  try {
    // content_sid column is added by paula-migrate-content-sid; guard for pre-migration
    const colCheck = await db.execute(drizzleSql`
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'paula_messages' AND column_name = 'content_sid'
      LIMIT 1
    `);
    const hasSidColumn = colCheck.rows.length > 0;

    const rows = await db.execute(drizzleSql`
      SELECT trigger_type, active, cooldown_days, updated_at
      FROM paula_messages
      ORDER BY trigger_type
    `);

    // Fetch content_sid values in a separate query to avoid a runtime error when
    // the column does not yet exist (pre-migration environments).
    const sidMap: Record<string, string | null> = {};
    if (hasSidColumn) {
      const sidRows = await db.execute(drizzleSql`
        SELECT trigger_type, content_sid FROM paula_messages
      `);
      for (const r of sidRows.rows as Array<Record<string, unknown>>) {
        sidMap[String(r.trigger_type)] = r.content_sid ? String(r.content_sid) : null;
      }
    }

    const queueSummary = await db.execute(drizzleSql`
      SELECT status, COUNT(*)::int AS cnt, MAX(created_at) AS newest
      FROM paula_send_queue
      GROUP BY status
      ORDER BY cnt DESC
    `);

    const allRows = rows.rows as Array<Record<string, unknown>>;
    const activeRows = allRows.filter(r => r.active === true);
    const inactiveRows = allRows.filter(r => r.active !== true);

    const { PAULA_MESSAGES_EXPECTED_ACTIVE } = await import("../services/paulaTriggers.js");

    // Per-trigger SID coverage — used to determine the step 7.5 sending gate
    const perTrigger = activeRows.map(r => {
      const ttype = String(r.trigger_type);
      const hasSid = hasSidColumn && sidMap[ttype] != null;
      return {
        trigger_type: ttype,
        has_sid: hasSid,
        ...(hasSidColumn ? { content_sid: sidMap[ttype] ?? null } : {}),
      };
    });
    const sidCoverage = perTrigger.filter(t => t.has_sid).length;

    res.json({
      ok: activeRows.length >= PAULA_MESSAGES_EXPECTED_ACTIVE,
      activeCount: activeRows.length,
      expectedActive: PAULA_MESSAGES_EXPECTED_ACTIVE,
      totalInDb: allRows.length,
      // Step 7.5 gate — must be "22/22" before flipping PAULA_SENDING_ENABLED=true
      synced_sids: sidCoverage,
      sid_coverage: `${sidCoverage}/${PAULA_MESSAGES_EXPECTED_ACTIVE}`,
      sending_gate_passed: sidCoverage >= PAULA_MESSAGES_EXPECTED_ACTIVE,
      sid_column_exists: hasSidColumn,
      active: perTrigger,
      inactive: inactiveRows.map(r => ({ trigger_type: r.trigger_type, reason: "partner-gated or intentionally disabled" })),
      sendQueueSummary: queueSummary.rows,
    });
  } catch (err) {
    logger.error({ err }, "admin/paula-template-health: failed");
    res.status(500).json({ error: "Health check failed — check server logs." });
  }
});

// POST /api/admin/paula-migrate-content-sid — idempotent: adds content_sid +
// template_category columns to paula_messages if not already present.
// Safe to call multiple times. Run once after deploy before seed.
router.post("/admin/paula-migrate-content-sid", async (_req: Request, res: Response) => {
  try {
    // paula_messages: content_sid + template_category (original) + variables_schema (B2-REVISED)
    await db.execute(drizzleSql`
      ALTER TABLE paula_messages
        ADD COLUMN IF NOT EXISTS content_sid text,
        ADD COLUMN IF NOT EXISTS template_category text
          CHECK (template_category IN ('UTILITY','MARKETING')),
        ADD COLUMN IF NOT EXISTS variables_schema jsonb
    `);
    // paula_send_queue: variables_json — positional vars frozen from UserContext at enqueue
    await db.execute(drizzleSql`
      ALTER TABLE paula_send_queue
        ADD COLUMN IF NOT EXISTS variables_json jsonb
    `);
    const pmCols = await db.execute(drizzleSql`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'paula_messages'
      ORDER BY ordinal_position
    `);
    const pqCols = await db.execute(drizzleSql`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'paula_send_queue'
      ORDER BY ordinal_position
    `);
    res.json({
      ok: true,
      paula_messages_columns:   (pmCols.rows as Array<Record<string, unknown>>).map(r => r.column_name),
      paula_send_queue_columns: (pqCols.rows as Array<Record<string, unknown>>).map(r => r.column_name),
    });
  } catch (err) {
    logger.error({ err }, "admin/paula-migrate-content-sid: failed");
    res.status(500).json({ error: "Migration failed — check server logs." });
  }
});

// POST /api/admin/sync-template-sids — writes content_sid + approved_category
// to paula_messages for approved Twilio templates. Idempotent: skips rows
// whose content_sid + template_category already match the incoming values.
// Body: { templates: [{ trigger_type, content_sid, approved_category }] }
// Called by twilio:sync script; also usable manually for prod after approval.
router.post("/admin/sync-template-sids", async (req: Request, res: Response) => {
  try {
    const raw = req.body as unknown;
    if (
      !raw ||
      typeof raw !== "object" ||
      !Array.isArray((raw as Record<string, unknown>).templates)
    ) {
      res.status(400).json({ error: "Body must be { templates: [...] }" });
      return;
    }

    const templates = (raw as { templates: Array<Record<string, unknown>> }).templates;
    const written: string[] = [];
    const skipped: string[] = [];

    for (const t of templates) {
      const { trigger_type, content_sid, approved_category } = t as {
        trigger_type?: string;
        content_sid?: string;
        approved_category?: string;
      };

      if (!trigger_type || !content_sid || !approved_category) {
        res.status(400).json({
          error: `Each entry needs trigger_type, content_sid, approved_category — got: ${JSON.stringify(t)}`,
        });
        return;
      }

      if (!["UTILITY", "MARKETING"].includes(approved_category.toUpperCase())) {
        res.status(400).json({
          error: `approved_category must be UTILITY or MARKETING — got: ${approved_category}`,
        });
        return;
      }

      const result = await db.execute(drizzleSql`
        UPDATE paula_messages
        SET content_sid       = ${content_sid},
            template_category = ${approved_category.toUpperCase()}
        WHERE trigger_type = ${trigger_type}
          AND (content_sid IS DISTINCT FROM ${content_sid}
               OR template_category IS DISTINCT FROM ${approved_category.toUpperCase()})
        RETURNING trigger_type
      `);

      if ((result.rows as unknown[]).length > 0) {
        written.push(trigger_type);
      } else {
        skipped.push(trigger_type);
      }
    }

    logger.info({ written, skipped }, "admin/sync-template-sids: complete");
    res.json({ ok: true, written, skipped });
  } catch (err) {
    logger.error({ err }, "admin/sync-template-sids: failed");
    res.status(500).json({ error: "Sync failed — check server logs." });
  }
});

// POST /api/admin/seed-paula-messages-step3 — kept for backwards compat, delegates to new seed.
router.post("/admin/seed-paula-messages-step3", async (_req: Request, res: Response) => {
  try {
    const { seedPaulaMessages, PAULA_MESSAGES_TOTAL_IN_SEED } =
      await import("../services/seedPaulaMessages.js");
    const result = await seedPaulaMessages(db);
    res.json({
      ok: true,
      note: "Redirected to seedPaulaMessages (idempotent upsert). Old step3 endpoint is deprecated.",
      expected: PAULA_MESSAGES_TOTAL_IN_SEED,
      ...result,
    });
  } catch (err) {
    logger.error({ err }, "admin/seed-paula-messages-step3 (compat): failed");
    res.status(500).json({ error: "Seed failed — check server logs." });
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
      drizzleSql`SELECT kyc_full_name, welcome_shown, whatsapp_consent_at FROM users WHERE telefono = ${telefono} LIMIT 1`,
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
      whatsappConsentAt: (user.whatsapp_consent_at as string | null) ?? null,
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

// PATCH /api/user/consent — record WhatsApp opt-in for a logged-in user (re-consent banner path)
router.patch("/user/consent", async (req: Request, res: Response) => {
  const { telefono } = req.body as { telefono?: string };
  if (!telefono?.trim()) { res.status(400).json({ error: "telefono requerido" }); return; }
  try {
    await db.execute(
      drizzleSql`UPDATE users SET whatsapp_consent_at = NOW()
                 WHERE telefono = ${telefono.trim()} AND whatsapp_consent_at IS NULL`,
    );
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "user/consent PATCH: failed");
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
                        signup_source, signup_ref_code, source_note, landing_page, signup_bonus_claimed,
                        nudge_sent_at, welcome_shown,
                        low_balance_nudge_sent_at, bill_discovery_nudge_sent_at,
                        referral_nudge_sent_at, referral_code,
                        kyc_curp,
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

// GET /api/admin/ps-proxy — server-side proxy for PageSeguro investor-stats (avoids browser CORS)
// Accepts: ?url=https://pagoseguromx.com&key=pagoseguro-admin-2026
router.get("/admin/ps-proxy", async (req: Request, res: Response) => {
  const { url, key } = req.query as { url?: string; key?: string };
  if (!url || !key) return res.status(400).json({ error: "Missing url or key query params" });
  try {
    const normalizedUrl = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    const endpoint = normalizedUrl.replace(/\/$/, "") + "/api/admin/investor-stats";
    const upstream = await fetch(endpoint, { headers: { "x-admin-key": key } });
    const body = await upstream.json();
    if (!upstream.ok) return res.status(upstream.status).json(body);
    res.setHeader("Cache-Control", "no-store");
    return res.json(body);
  } catch (err) {
    logger.error({ err }, "ps-proxy: upstream fetch failed");
    return res.status(502).json({ error: "Failed to reach PageSeguro API" });
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
          (SELECT COUNT(*)::int         FROM wallets w JOIN users u ON u.telefono = w.user_id WHERE u.is_test_account IS NOT TRUE) AS wallet_count,
          (SELECT COALESCE(SUM(w.balance_mxn),0)::float FROM wallets w JOIN users u ON u.telefono = w.user_id WHERE u.is_test_account IS NOT TRUE) AS wallet_balance_total,
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

// GET /api/admin/user-list — full user roster for Command Center table
router.get("/admin/user-list", adminAuth, async (_req: Request, res: Response) => {
  try {
    const result = await db.execute(drizzleSql`
      SELECT
        u.telefono,
        COALESCE(u.kyc_full_name, '') AS name,
        u.created_at AT TIME ZONE 'America/Mexico_City' AS registered_at,
        CASE
          WHEN u.signup_source = 'rep_referral'     THEN 'Rep referral (' || COALESCE(u.referred_by_rep_id, '?') || ')'
          WHEN u.signup_source = 'web_organic'      THEN 'Web organic'
          WHEN u.signup_source = 'whatsapp_organic' THEN 'WhatsApp organic'
          WHEN u.signup_source IS NULL               THEN 'Legacy / unknown'
          ELSE u.signup_source
        END AS how_registered,
        COALESCE(w.balance_mxn::numeric, 0)::float AS wallet_balance_mxn,
        COALESCE(
          (SELECT COUNT(*)::int FROM bill_payments bp
           WHERE bp.telefono = u.telefono
             AND bp.status IN ('confirmed','completed','confirmado','success')),
          0
        ) AS payment_count
      FROM users u
      LEFT JOIN wallets w ON w.user_id = u.telefono
      WHERE u.is_test_account IS NOT TRUE
      ORDER BY u.created_at DESC
    `);
    res.set("Cache-Control", "no-store");
    res.json({
      as_of: new Date().toISOString(),
      users: result.rows.map((r) => {
        const row = r as Record<string, unknown>;
        return {
          telefono:          row.telefono,
          name:              row.name || null,
          registered_at:     row.registered_at,
          how_registered:    row.how_registered,
          wallet_balance_mxn: row.wallet_balance_mxn,
          payment_count:     row.payment_count,
        };
      }),
    });
  } catch (err) {
    logger.error({ err }, "admin/user-list: failed");
    res.status(500).json({ error: "Error al obtener lista de usuarios." });
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

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/weekly-baseline — real-user funnel snapshot for weekly review
// ─────────────────────────────────────────────────────────────────────────────
router.get("/admin/weekly-baseline", adminAuth, async (_req: Request, res: Response) => {
  try {
    const [rows, ledgerRows] = await Promise.all([
      db.execute(drizzleSql`
        SELECT
          RIGHT(u.telefono, 4)                    AS last4,
          u.signup_source,
          u.signup_ref_code,
          u.landing_page,
          u.created_at::date                      AS signup_date,
          (u.whatsapp_consent_at IS NOT NULL)     AS has_consent,
          (w.balance_mxn)                         AS balance_mxn,
          (SELECT COUNT(*)::int FROM bill_payments bp WHERE bp.telefono = u.telefono) AS payments,
          u.pti_score
        FROM users u
        LEFT JOIN wallets w ON w.user_id = u.telefono
        WHERE u.is_test_account IS NOT TRUE
        ORDER BY u.created_at
      `),
      // Ledger invariant: balance_mxn must equal confirmed-credits minus confirmed-debits.
      // Debit types reduce balance; all other confirmed types are credits.
      // Pending/failed txs are excluded — they must not affect balance.
      db.execute(drizzleSql`
        SELECT
          RIGHT(w.user_id, 4)                                        AS last4,
          w.balance_mxn::numeric                                     AS wallet_balance,
          COALESCE(SUM(
            CASE
              WHEN wt.status = 'confirmed' AND wt.type IN ('bill_pay','spei_out','p2p_debit')
                THEN -wt.amount_mxn::numeric
              WHEN wt.status IN ('confirmed','completed')
                AND wt.type NOT IN ('bill_pay','spei_out','p2p_debit')
                THEN  wt.amount_mxn::numeric
              ELSE 0
            END
          ), 0)                                                      AS ledger_sum,
          ABS(w.balance_mxn::numeric - COALESCE(SUM(
            CASE
              WHEN wt.status = 'confirmed' AND wt.type IN ('bill_pay','spei_out','p2p_debit')
                THEN -wt.amount_mxn::numeric
              WHEN wt.status IN ('confirmed','completed')
                AND wt.type NOT IN ('bill_pay','spei_out','p2p_debit')
                THEN  wt.amount_mxn::numeric
              ELSE 0
            END
          ), 0)) < 0.01                                              AS balanced
        FROM wallets w
        LEFT JOIN wallet_transactions wt ON wt.wallet_id = w.id
        GROUP BY w.user_id, w.balance_mxn
        ORDER BY w.user_id
      `),
    ]);

    const users = rows.rows as Record<string, unknown>[];
    const ledger = ledgerRows.rows as { last4: string; wallet_balance: string; ledger_sum: string; balanced: boolean }[];
    const ledgerMismatches = ledger.filter(r => !r.balanced);

    const totals = {
      users_total:        users.length,
      users_consented:    users.filter(r => r.has_consent).length,
      users_with_payment: users.filter(r => (r.payments as number) > 0).length,
      users_web_organic:  users.filter(r => r.signup_source === "web_organic").length,
      users_whatsapp:     users.filter(r => r.signup_source === "whatsapp_organic").length,
      users_rep:          users.filter(r => r.signup_source === "rep_referral").length,
    };

    const ledgerSummary = {
      wallets_checked: ledger.length,
      wallets_balanced: ledger.filter(r => r.balanced).length,
      mismatches: ledgerMismatches,
    };

    res.json({ as_of: new Date().toISOString(), totals, users, ledger: ledgerSummary });
  } catch (err) {
    logger.error({ err }, "admin/weekly-baseline: failed");
    res.status(500).json({ error: "Failed" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/test-alert-email — send a test email to verify SMTP config
// ─────────────────────────────────────────────────────────────────────────────
router.post("/admin/test-alert-email", async (_req: Request, res: Response) => {
  try {
    const { alertSignup } = await import("../lib/alertService.js");
    await alertSignup({
      telefono: "5512345678",
      source: "test_ping",
      isTest: true,
      timestamp: new Date(),
    });
    res.json({ ok: true, message: "Test alert sent — check lawrightmba@gmail.com" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ err }, "test-alert-email: failed");
    res.status(500).json({ ok: false, error: msg });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/stripe-payments — recent Stripe payments from pagoya_payments
// Useful for investigating disputes. Accepts optional ?phone= and ?limit= params.
// ─────────────────────────────────────────────────────────────────────────────
router.get("/admin/stripe-payments", async (req: Request, res: Response) => {
  try {
    const limit = Math.min(Number(req.query.limit ?? "50"), 200);
    const phone = req.query.phone ? toE164(String(req.query.phone)) : null;
    const rows = await db.execute(phone
      ? drizzleSql`
          SELECT id, payment_intent_id, telefono, monto, status, categoria, referencia, created_at
          FROM pagoya_payments
          WHERE telefono = ${phone}
          ORDER BY created_at DESC
          LIMIT ${limit}
        `
      : drizzleSql`
          SELECT id, payment_intent_id, telefono, monto, status, categoria, referencia, created_at
          FROM pagoya_payments
          ORDER BY created_at DESC
          LIMIT ${limit}
        `);
    res.json({ count: rows.rows.length, payments: rows.rows });
  } catch (err) {
    logger.error({ err }, "admin/stripe-payments: failed");
    res.status(500).json({ error: "Failed" });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/expire-stale-oxxo — one-shot: mark old pending OXXO loads as expired
// Targets: status='pending', type contains 'oxxo', created_at older than 24h
router.post("/admin/expire-stale-oxxo", adminAuth, async (_req: Request, res: Response) => {
  try {
    const r = await db.execute(drizzleSql`
      UPDATE wallet_transactions
      SET status = 'expired'
      WHERE status = 'pending'
        AND (type ILIKE '%oxxo%' OR type ILIKE '%load%')
        AND created_at < NOW() - INTERVAL '24 hours'
      RETURNING id, wallet_id, type, amount_mxn, created_at
    `);
    return res.json({ expired: r.rows.length, rows: r.rows });
  } catch (err) {
    logger.error({ err }, "expire-stale-oxxo failed");
    return res.status(500).json({ error: "Failed" });
  }
});

// POST /api/admin/mark-test-accounts — flag known dev/test rows so they are
// excluded from all is_test_account IS NOT TRUE filters.
// Body: { phones: string[] }  — list of telefono values to mark.
// ─────────────────────────────────────────────────────────────────────────────
router.post("/admin/mark-test-accounts", adminAuth, async (req: Request, res: Response) => {
  const { phones } = req.body as { phones?: string[] };
  if (!Array.isArray(phones) || phones.length === 0) {
    res.status(400).json({ error: "phones array required" }); return;
  }
  try {
    const results: { telefono: string; updated: number }[] = [];
    for (const raw of phones) {
      const phone = String(raw).trim();
      const r = await db.execute(
        drizzleSql`UPDATE users SET is_test_account = true WHERE telefono = ${phone}`,
      );
      results.push({ telefono: phone, updated: (r as unknown as { rowCount: number }).rowCount ?? 0 });
    }
    logger.info({ results }, "admin/mark-test-accounts: flagged test rows");
    res.json({ ok: true, results });
  } catch (err) {
    logger.error({ err }, "admin/mark-test-accounts: failed");
    res.status(500).json({ error: "Failed" });
  }
});

export default router;
