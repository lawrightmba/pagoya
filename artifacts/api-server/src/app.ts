import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import pinoHttp from "pino-http";
import session from "express-session";
import rateLimit from "express-rate-limit";
import router from "./routes";
import { handlePagoyaWebhook } from "./routes/pagoya";
import { handleConektaWebhook, handleConektaCardWebhook } from "./wallet/routes/wallet.js";
import { handleStpWebhook } from "./routes/stpWebhook.js";
import { logger } from "./lib/logger";
import { startTaecelCrons } from "./billpay/crons/taecel-crons.js";
import { startReminderCron } from "./services/reminders.js";
import { cleanExpiredPayments } from "./services/pendingPaymentService.js";
import { startLowBalanceNudgeCron, startBillDiscoveryNudgeCron } from "./services/lifecycleNudgeService.js";
import { startPtiCron } from "./services/ptiCron.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());

app.use(
  session({
    secret: process.env.SESSION_SECRET ?? "pagoya-session-secret-dev",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 15 * 60 * 1000, // 15 minutes — long enough to complete OTP flow
    },
  }),
);

// Webhooks must be mounted with raw body parser BEFORE express.json()
// so signature verification receives the unmodified payload.
app.post(
  "/api/pagoya/webhook",
  express.raw({ type: "application/json" }),
  handlePagoyaWebhook,
);

app.post(
  "/api/wallet/webhook/conekta",
  express.raw({ type: "application/json" }),
  handleConektaWebhook,
);

app.post(
  "/api/wallet/webhook/conekta-card",
  express.raw({ type: "application/json" }),
  handleConektaCardWebhook,
);

app.post(
  "/api/stp/webhook",
  express.raw({ type: "application/json" }),
  handleStpWebhook,
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, "../public")));

app.get("/manifest.json", (req, res) => {
  res.setHeader("Content-Type", "application/manifest+json");
  res.sendFile(path.join(__dirname, "../public/manifest.json"));
});

// ── Admin token middleware ────────────────────────────────────────────────────
// Protects the command center and sensitive admin routes.
// Pass X-Admin-Token header or ?token= query param with the ADMIN_TOKEN secret.
function requireAdminToken(req: Request, res: Response, next: NextFunction): void {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) { next(); return; } // Skip if not configured (dev convenience)
  const provided =
    (req.headers["x-admin-token"] as string | undefined) ??
    (req.query.token as string | undefined);
  if (provided !== expected) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

app.get("/command-center", requireAdminToken, (req, res) => {
  res.sendFile(path.join(__dirname, "../public/command-center.html"));
});

app.get("/command-center.html", requireAdminToken, (req, res) => {
  res.sendFile(path.join(__dirname, "../public/command-center.html"));
});

// ── Rate limiters ─────────────────────────────────────────────────────────────
const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: "Demasiados intentos. Intenta de nuevo en 15 minutos." },
  standardHeaders: true,
  legacyHeaders: false,
});

const walletLoadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Demasiados intentos. Intenta de nuevo en 15 minutos." },
  standardHeaders: true,
  legacyHeaders: false,
});

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: "Demasiados intentos de OTP. Intenta de nuevo en 15 minutos." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiters to sensitive endpoints before the main router
app.post("/api/bills/pay", paymentLimiter);
app.post("/api/wallet/load/oxxo", walletLoadLimiter);
app.post("/api/wallet/load/card", walletLoadLimiter);
app.post("/api/cards/charge-and-save", walletLoadLimiter);
app.post("/api/wallet/transfer", paymentLimiter);
app.post("/api/otp/send", otpLimiter);
app.post("/api/auth/start", otpLimiter);

app.use("/api", router);

// Start background Taecel cron jobs (pending reconciliation, product cache, sales recon)
startTaecelCrons();
// Start daily payment reminder cron (9 AM Mexico City = 15:00 UTC)
startReminderCron();
// Purge expired pending_payments rows every 10 minutes (correctness is enforced by
// expires_at in SQL, this just keeps the table tidy across restarts)
setInterval(() => { cleanExpiredPayments().catch(() => {}); }, 10 * 60 * 1000);
// Lifecycle nudge crons — low balance every 6h, bill discovery daily at 10am MX
startLowBalanceNudgeCron();
startBillDiscoveryNudgeCron();
// PTI nightly batch — computes PagoYa Trust Index + financial snapshots at 2 AM MX
startPtiCron();

export default app;
