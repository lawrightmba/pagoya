import express, { type Express } from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import pinoHttp from "pino-http";
import router from "./routes";
import { handlePagoyaWebhook } from "./routes/pagoya";
import { handleConektaWebhook } from "./wallet/routes/wallet.js";
import { logger } from "./lib/logger";

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

export default app;
