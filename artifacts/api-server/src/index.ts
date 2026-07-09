import app from "./app";
import { logger } from "./lib/logger";
import { siprelBalanceCheck } from "./jobs/siprelBalanceCheck.js";
import { startNudgePollCron } from "./services/nudgeService.js";
import { startEnrichmentCrons } from "./services/enrichmentCron.js";
import { assertProductionSafety } from "./services/fairLendingAdjustment.js";
import { startFairLendingRetestCron } from "./services/fairLendingRetestCron.js";
import { checkPaulaTemplateHealth } from "./services/paulaTriggers.js";
import { logRailModes } from "./services/railModeCheck.js";

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

// Sprint 3b: refuse to start if the sandbox/production licensee-issuance
// credential separation has silently collapsed. If SANDBOX_ADMIN_TOKEN is
// configured, PRODUCTION_ADMIN_TOKEN must also be configured AND must not
// equal SANDBOX_ADMIN_TOKEN — otherwise a copy-paste config error could let
// a low-friction sandbox credential silently authorize production licensee
// key issuance.
const sandboxAdminToken = process.env.SANDBOX_ADMIN_TOKEN;
const productionAdminToken = process.env.PRODUCTION_ADMIN_TOKEN;
if (sandboxAdminToken) {
  if (!productionAdminToken || productionAdminToken === sandboxAdminToken) {
    logger.error(
      "[licenseeApi] boot-time check failed: PRODUCTION_ADMIN_TOKEN is unset or equals SANDBOX_ADMIN_TOKEN — refusing to start to prevent silent credential collapse",
    );
    process.exit(1);
  }
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
  // Fire-and-forget: log live/sandbox mode of every payment rail at boot.
  logRailModes().catch((err) => logger.error({ err }, "[rail-mode] probe failed"));
  siprelBalanceCheck.start();
  startNudgePollCron();
  startEnrichmentCrons();
  startFairLendingRetestCron();

  // Non-blocking startup health check: logs ERROR if expected active templates
  // are missing from paula_messages, surfaces delta for admin dashboard.
  import("@workspace/db").then(async ({ db }) => {
    // Startup migration: ensure variables_schema column exists, then seed values
    // from VARIABLES_SCHEMA canonical source. Safe to re-run on every boot
    // (ADD COLUMN IF NOT EXISTS + upsert are idempotent).
    const { sql } = await import("drizzle-orm");
    const { VARIABLES_SCHEMA } = await import("./services/seedPaulaMessages.js");
    try {
      await db.execute(sql`
        ALTER TABLE paula_messages ADD COLUMN IF NOT EXISTS variables_schema JSONB
      `);
      // Upsert all known schemas from canonical VARIABLES_SCHEMA source
      for (const [triggerType, schema] of Object.entries(VARIABLES_SCHEMA)) {
        const schemaStr = JSON.stringify(schema);
        await db.execute(sql`
          UPDATE paula_messages
          SET variables_schema = ${schemaStr}::jsonb
          WHERE trigger_type = ${triggerType}
        `);
      }
      logger.info(
        { count: Object.keys(VARIABLES_SCHEMA).length },
        "[startup-migration] variables_schema column ensured + all schemas synced",
      );
    } catch (e: unknown) {
      logger.error({ e }, "[startup-migration] variables_schema migration failed");
    }

    checkPaulaTemplateHealth(db).catch((healthErr) =>
      logger.error({ healthErr }, "[Paula] Template health check threw unexpectedly"),
    );
  }).catch((importErr) =>
    logger.error({ importErr }, "[Paula] Failed to import db for template health check"),
  );
});
