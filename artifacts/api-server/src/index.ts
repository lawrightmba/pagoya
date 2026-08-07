import app from "./app";
import { logger } from "./lib/logger";
import { siprelBalanceCheck } from "./jobs/siprelBalanceCheck.js";
import { startNudgePollCron } from "./services/nudgeService.js";
import { startEnrichmentCrons } from "./services/enrichmentCron.js";
import { checkPaulaTemplateHealth } from "./services/paulaTriggers.js";
import { logRailModes } from "./services/railModeCheck.js";
import { ensureBuild1aTables } from "./services/build1a/migrations.js";
import { setBuild1aReady, setBuild1aFailed } from "./services/build1a/build1aReadiness.js";
import { ensureBuild2aTables } from "./services/build2a/migrations.js";
import { ensureBuild2a2Tables } from "./services/build2a/migrations_2a2.js";
import { ensureBuild2a3Tables } from "./services/build2a/migrations_2a3.js";
import { ensureBuild2a4Tables } from "./services/build2a/migrations_2a4.js";
import { ensureBuild2a5Tables } from "./services/build2a/migrations_2a5.js";
import {
  setBuild2aReady,
  setBuild2aFailed,
  getBuild2aReadiness,
  setBuild2a2Ready,
  setBuild2a2Failed,
  getBuild2a2Readiness,
  setBuild2a3Ready,
  setBuild2a3Failed,
  setBuild2a4Ready,
  setBuild2a4Failed,
  setBuild2a5Ready,
  setBuild2a5Failed,
} from "./services/build2a/build2aReadiness.js";
import { startEvidencePoller } from "./services/build2a/sourceIngestionPoller.js";
import { startWeightingPoller } from "./services/build2a/weightingPoller.js";
import { startOpinionPoller } from "./services/build2a/opinionPoller.js";
import { startKnowledgeQualificationPoller } from "./services/build2a/knowledgeQualificationLedger.js";

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
  // Build 1A: create new tables and seed reference data (idempotent, additive only).
  // C5: Track readiness so Build 1A routes return a controlled 503 while pending/failed.
  // Primary PagoYa app is NEVER affected by Build 1A migration state.
  ensureBuild1aTables()
    .then(() => setBuild1aReady())
    .catch((err) => {
      setBuild1aFailed(err);
      logger.error({ err }, "[Build1A] Schema migration failed — Build 1A routes will return 503, app continues");
    });
  // Build 2A: create Package 2A-1 registry, version, and governance tables (idempotent, additive only).
  // Build 2A-2 chains after 2A-1: only attempts 2A-2 if 2A-1 succeeded.
  // Primary PagoYa app and Build 1A are NEVER affected by Build 2A migration state.
  // ENABLE_EVIDENCE_ENGINE flag gates runtime processing but NOT schema initialization.
  ensureBuild2aTables()
    .then(() => {
      setBuild2aReady();
      // Chain Package 2A-2 only after 2A-1 succeeds
      return ensureBuild2a2Tables();
    })
    .then(() => {
      setBuild2a2Ready();
      // Start the Evidence Engine ingestion poller only when ENABLE_EVIDENCE_ENGINE=true
      startEvidencePoller();
      // Chain Package 2A-3 only after 2A-2 succeeds
      return ensureBuild2a3Tables();
    })
    .then(() => {
      setBuild2a3Ready();
      // Start the Weighting poller only when ENABLE_EVIDENCE_ENGINE=true
      startWeightingPoller();
      // Chain Package 2A-4 only after 2A-3 succeeds
      return ensureBuild2a4Tables();
    })
    .then(() => {
      setBuild2a4Ready();
      // Start the Opinion Formation poller only when ENABLE_EVIDENCE_ENGINE=true
      startOpinionPoller();
      // Chain Package 2A-5 only after 2A-4 succeeds
      return ensureBuild2a5Tables();
    })
    .then(() => {
      setBuild2a5Ready();
      // Start the Knowledge Qualification poller only when ENABLE_EVIDENCE_ENGINE=true
      startKnowledgeQualificationPoller();
    })
    .catch((err) => {
      // Determine which package failed by checking readiness states in order
      const { state: state2a1 } = getBuild2aReadiness();
      const { state: state2a2 } = getBuild2a2Readiness();
      if (state2a1 !== "ready") {
        setBuild2aFailed(err);
        logger.error({ err }, "[Build2A] Package 2A-1 schema migration failed — Build 2A routes will return 503, app continues");
      } else if (state2a2 !== "ready") {
        setBuild2a2Failed(err);
        logger.error({ err }, "[Build2A] Package 2A-2 schema migration failed — 2A-2 routes will return 503, app continues");
      } else if (state2a1 === "ready" && state2a2 === "ready") {
        // Either 2A-3, 2A-4, or 2A-5 failed; check 2A-3/2A-4 readiness
        import("./services/build2a/build2aReadiness.js").then(({ getBuild2a3Readiness, getBuild2a4Readiness }) => {
          const { state: state2a3 } = getBuild2a3Readiness();
          const { state: state2a4 } = getBuild2a4Readiness();
          if (state2a3 !== "ready") {
            setBuild2a3Failed(err);
            logger.error({ err }, "[Build2A] Package 2A-3 schema migration failed — 2A-3 routes will return 503, app continues");
          } else if (state2a4 !== "ready") {
            setBuild2a4Failed(err);
            logger.error({ err }, "[Build2A] Package 2A-4 schema migration failed — 2A-4 routes will return 503, app continues");
          } else {
            setBuild2a5Failed(err);
            logger.error({ err }, "[Build2A] Package 2A-5 schema migration failed — 2A-5 routes will return 503, app continues");
          }
        }).catch(() => {
          setBuild2a3Failed(err);
        });
      }
    });
  // Fire-and-forget: log live/sandbox mode of every payment rail at boot.
  logRailModes().catch((err) => logger.error({ err }, "[rail-mode] probe failed"));
  siprelBalanceCheck.start();
  startNudgePollCron();
  startEnrichmentCrons();
  // The ±5/±2 fair-lending adjustment layer (fairLendingAdjustment.ts) and
  // its daily retest cron (fairLendingRetestCron.ts) were retired 2026-07-10
  // per phase3-implementation-spec.md §3.2 — always a production no-op
  // (all-zero mapping). Terminal audit entry: fair_lending_signoff id=752.

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
