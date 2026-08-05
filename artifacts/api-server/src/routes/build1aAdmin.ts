/**
 * Build 1A — Admin-only Routes
 *
 * All routes are protected by the existing adminAuth guard (x-admin-key header
 * or ?adminKey query param vs ADMIN_TOKEN / ADMIN_SECRET_KEY env var).
 * No new auth mechanism is introduced.
 *
 * Mounted at /api/admin/build1a/* in routes/index.ts.
 *
 * Routes:
 *   GET  /validation-runs          — list recent validation runs
 *   POST /validate                 — trigger all validation checks now
 *   GET  /readiness                — full readiness report (JSON)
 *   GET  /readiness.csv            — readiness report (CSV, stable field names)
 *   GET  /unresolved-outcomes      — count of unresolved agent_task_outcomes
 *   GET  /unresolved-predictions   — count of unresolved agent_prediction_resolutions
 *   GET  /orphans                  — orphaned record counts across new tables
 *   GET  /model-versions           — model_version_registry contents
 *   GET  /agents                   — agents + agent_versions
 */

import { Router, type Request, type Response } from "express";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { logger } from "../lib/logger.js";
import { runAllValidations } from "../services/build1a/ptiValidation.js";
import { buildReadinessReport, reportToCsv } from "../services/build1a/readinessReport.js";

const router = Router();

// ── Admin auth (mirrors the existing pattern in routes/index.ts) ───────────────
import type { NextFunction } from "express";
const adminAuth = (req: Request, res: Response, next: NextFunction): void => {
  const key =
    (req.headers["x-admin-key"] as string | undefined) ||
    (req.query.adminKey as string | undefined);
  const expected = process.env.ADMIN_TOKEN ?? process.env.ADMIN_SECRET_KEY;
  if (!key || !expected || key !== expected) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
};

router.use(adminAuth);

// ── GET /validation-runs ───────────────────────────────────────────────────────
router.get("/validation-runs", async (_req: Request, res: Response): Promise<void> => {
  try {
    const rows = await db.execute(sql`
      SELECT id, run_type, started_at, completed_at,
             records_checked, records_passed, records_failed,
             triggered_by
      FROM pti_validation_runs
      ORDER BY started_at DESC
      LIMIT 100
    `);
    res.json({ validation_runs: rows.rows, count: rows.rows.length });
  } catch (err) {
    logger.error({ err }, "[Build1A] GET /validation-runs failed");
    res.status(500).json({ error: "Query failed" });
  }
});

// ── GET /validation-runs/:id ───────────────────────────────────────────────────
router.get("/validation-runs/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const rows = await db.execute(sql`
      SELECT * FROM pti_validation_runs WHERE id = ${id}::uuid LIMIT 1
    `);
    if (rows.rows.length === 0) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json({ run: rows.rows[0] });
  } catch (err) {
    logger.error({ err }, "[Build1A] GET /validation-runs/:id failed");
    res.status(500).json({ error: "Query failed" });
  }
});

// ── POST /validate ────────────────────────────────────────────────────────────
router.post("/validate", async (req: Request, res: Response): Promise<void> => {
  const triggeredBy = (req.body?.triggered_by as string) || "manual";
  try {
    logger.info({ triggeredBy }, "[Build1A] Validation run triggered");
    const results = await runAllValidations(triggeredBy);
    const summary = results.map(r => ({
      run_type: r.runType,
      records_checked: r.recordsChecked,
      records_passed: r.recordsPassed,
      records_failed: r.recordsFailed,
      passed: r.recordsFailed === 0,
    }));
    res.json({ ok: true, runs: summary });
  } catch (err) {
    logger.error({ err }, "[Build1A] POST /validate failed");
    res.status(500).json({ error: "Validation run failed" });
  }
});

// ── GET /readiness ─────────────────────────────────────────────────────────────
router.get("/readiness", async (_req: Request, res: Response): Promise<void> => {
  try {
    const report = await buildReadinessReport();
    res.json(report);
  } catch (err) {
    logger.error({ err }, "[Build1A] GET /readiness failed");
    res.status(500).json({ error: "Report generation failed" });
  }
});

// ── GET /readiness.csv ────────────────────────────────────────────────────────
// Stable field names, ISO 8601 timestamps, no raw telefono or amounts.
router.get("/readiness.csv", async (_req: Request, res: Response): Promise<void> => {
  try {
    const report = await buildReadinessReport();
    const csv = reportToCsv(report);
    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="pti_readiness_${report.generated_at.replace(/:/g, "-")}.csv"`,
    );
    res.send(csv);
  } catch (err) {
    logger.error({ err }, "[Build1A] GET /readiness.csv failed");
    res.status(500).json({ error: "CSV generation failed" });
  }
});

// ── GET /unresolved-outcomes ───────────────────────────────────────────────────
router.get("/unresolved-outcomes", async (_req: Request, res: Response): Promise<void> => {
  try {
    const rows = await db.execute(sql`
      SELECT outcome_status, COUNT(*)::int AS count
      FROM agent_task_outcomes
      WHERE outcome_status IN ('unresolved', 'delayed', 'disputed')
        AND superseded_by IS NULL
      GROUP BY outcome_status
      ORDER BY count DESC
    `);
    const total = (rows.rows as Array<{ count: number }>)
      .reduce((s, r) => s + Number(r.count), 0);
    res.json({ total_unresolved: total, by_status: rows.rows });
  } catch (err) {
    logger.error({ err }, "[Build1A] GET /unresolved-outcomes failed");
    res.status(500).json({ error: "Query failed" });
  }
});

// ── GET /unresolved-predictions ───────────────────────────────────────────────
router.get("/unresolved-predictions", async (_req: Request, res: Response): Promise<void> => {
  try {
    const rows = await db.execute(sql`
      SELECT resolution_status, COUNT(*)::int AS count
      FROM agent_prediction_resolutions
      WHERE resolution_status IN ('unresolved', 'delayed', 'disputed')
        AND superseded_by IS NULL
      GROUP BY resolution_status
      ORDER BY count DESC
    `);
    const total = (rows.rows as Array<{ count: number }>)
      .reduce((s, r) => s + Number(r.count), 0);
    res.json({ total_unresolved: total, by_status: rows.rows });
  } catch (err) {
    logger.error({ err }, "[Build1A] GET /unresolved-predictions failed");
    res.status(500).json({ error: "Query failed" });
  }
});

// ── GET /orphans ───────────────────────────────────────────────────────────────
router.get("/orphans", async (_req: Request, res: Response): Promise<void> => {
  try {
    const [
      tasksNoOutcome,
      toolCallsNoTask,
      predictionsNoVersion,
      resolutionsNoOutcome,
      snapshotsUnlinked,
    ] = await Promise.all([
      // Tasks with no outcome row
      db.execute(sql`
        SELECT COUNT(*)::int AS count FROM agent_tasks t
        WHERE NOT EXISTS (SELECT 1 FROM agent_task_outcomes o WHERE o.task_id = t.id)
      `),
      // Tool calls referencing tasks that don't exist (shouldn't happen with FK, but defensive)
      db.execute(sql`
        SELECT COUNT(*)::int AS count FROM agent_tool_calls tc
        WHERE NOT EXISTS (SELECT 1 FROM agent_tasks t WHERE t.id = tc.task_id)
      `),
      // Predictions with null model_version_id
      db.execute(sql`
        SELECT COUNT(*)::int AS count FROM agent_predictions
        WHERE model_version_id IS NULL
      `),
      // Resolutions with no matching outcome (FK prevents, but check for nulls)
      db.execute(sql`
        SELECT COUNT(*)::int AS count FROM agent_prediction_resolutions
        WHERE task_outcome_id IS NULL
      `),
      // Snapshots with no linked score history row
      db.execute(sql`
        SELECT COUNT(*)::int AS count FROM pti_score_input_snapshots
        WHERE score_history_recorded_at IS NULL
          AND persistence_status = 'persisted'
      `),
    ]);

    res.json({
      agent_tasks_without_outcome: Number((tasksNoOutcome.rows[0] as { count: number }).count),
      tool_calls_without_task: Number((toolCallsNoTask.rows[0] as { count: number }).count),
      predictions_without_model_version: Number((predictionsNoVersion.rows[0] as { count: number }).count),
      resolutions_without_outcome: Number((resolutionsNoOutcome.rows[0] as { count: number }).count),
      snapshots_unlinked_to_score: Number((snapshotsUnlinked.rows[0] as { count: number }).count),
      note: "agent_tasks_without_outcome > 0 is normal for in-progress tasks. It is only a concern for completed tasks.",
    });
  } catch (err) {
    logger.error({ err }, "[Build1A] GET /orphans failed");
    res.status(500).json({ error: "Query failed" });
  }
});

// ── GET /model-versions ───────────────────────────────────────────────────────
router.get("/model-versions", async (_req: Request, res: Response): Promise<void> => {
  try {
    const rows = await db.execute(sql`
      SELECT id, component, version_label, released_at, is_active, notes
      FROM model_version_registry
      ORDER BY id
    `);
    res.json({ model_versions: rows.rows });
  } catch (err) {
    logger.error({ err }, "[Build1A] GET /model-versions failed");
    res.status(500).json({ error: "Query failed" });
  }
});

// ── GET /agents ────────────────────────────────────────────────────────────────
router.get("/agents", async (_req: Request, res: Response): Promise<void> => {
  try {
    const agents = await db.execute(sql`
      SELECT a.id, a.slug, a.display_name, a.created_at,
             COALESCE(
               json_agg(json_build_object(
                 'id', av.id, 'version_label', av.version_label,
                 'deployed_at', av.deployed_at, 'is_active', av.is_active
               ) ORDER BY av.deployed_at DESC) FILTER (WHERE av.id IS NOT NULL),
               '[]'
             ) AS versions
      FROM agents a
      LEFT JOIN agent_versions av ON av.agent_id = a.id
      GROUP BY a.id, a.slug, a.display_name, a.created_at
      ORDER BY a.id
    `);
    res.json({ agents: agents.rows });
  } catch (err) {
    logger.error({ err }, "[Build1A] GET /agents failed");
    res.status(500).json({ error: "Query failed" });
  }
});

// ── GET /tasks (recent, admin view) ──────────────────────────────────────────
router.get("/tasks", async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const agentSlug = req.query.agent as string | undefined;
    const statusFilter = req.query.status as string | undefined;

    const rows = await db.execute(sql`
      SELECT t.id, a.slug AS agent, t.task_class, t.status,
             t.cost_status, t.created_at, t.completed_at,
             t.scope_deviation, t.external_action_taken,
             t.retries,
             -- mask telefono to last 4 digits
             CASE WHEN t.telefono IS NOT NULL
               THEN '***' || RIGHT(t.telefono, 4)
               ELSE NULL END AS telefono_masked
      FROM agent_tasks t
      JOIN agents a ON a.id = t.agent_id
      WHERE (${agentSlug ?? null}::text IS NULL OR a.slug = ${agentSlug ?? null})
        AND (${statusFilter ?? null}::text IS NULL OR t.status = ${statusFilter ?? null})
      ORDER BY t.created_at DESC
      LIMIT ${limit}
    `);
    res.json({ tasks: rows.rows, count: rows.rows.length });
  } catch (err) {
    logger.error({ err }, "[Build1A] GET /tasks failed");
    res.status(500).json({ error: "Query failed" });
  }
});

export default router;
