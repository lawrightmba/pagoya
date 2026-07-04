import app from "./app";
import { logger } from "./lib/logger";
import { siprelBalanceCheck } from "./jobs/siprelBalanceCheck.js";
import { startNudgePollCron } from "./services/nudgeService.js";
import { startEnrichmentCrons } from "./services/enrichmentCron.js";
import { assertProductionSafety } from "./services/fairLendingAdjustment.js";
import { startFairLendingRetestCron } from "./services/fairLendingRetestCron.js";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// Blocking boot-time safety check: refuse to start if the fair-lending
// adjustment layer is enabled in production without a valid, current,
// passing signoff on file. This must never degrade silently — see
// fairLendingAdjustment.ts for the full rationale.
await assertProductionSafety().catch((err) => {
  logger.error({ err }, "[fairLendingAdjustment] boot-time production safety check failed — refusing to start");
  process.exit(1);
});

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
  siprelBalanceCheck.start();
  startNudgePollCron();
  startEnrichmentCrons();
  startFairLendingRetestCron();
});
