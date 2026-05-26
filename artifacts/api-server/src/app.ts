import express, { type Express } from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import pinoHttp from "pino-http";
import session from "express-session";
import router from "./routes";
import { handlePagoyaWebhook } from "./routes/pagoya";
import { handleConektaWebhook, handleConektaCardWebhook } from "./wallet/routes/wallet.js";
import { handleStpWebhook } from "./routes/stpWebhook.js";
import { logger } from "./lib/logger";
import { startTaecelCrons } from "./billpay/crons/taecel-crons.js";
import { startReminderCron } from "./services/reminders.js";

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

app.get("/command-center", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/command-center.html"));
});

app.get("/command-center.html", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/command-center.html"));
});

app.use("/api", router);

// Start background Taecel cron jobs (pending reconciliation, product cache, sales recon)
startTaecelCrons();
// Start daily payment reminder cron (9 AM Mexico City = 15:00 UTC)
startReminderCron();

export default app;
