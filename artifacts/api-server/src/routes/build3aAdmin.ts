/**
 * Build 3A — Admin-only Routes (Trajectory Foundation)
 *
 * All routes protected by adminAuth (x-admin-key header or ?adminKey vs ADMIN_TOKEN).
 * Mounted at /api/admin/build3a/* in routes/index.ts.
 * Gated by build3aNotReadyMiddleware (503 while pending/failed).
 *
 * Fully independent of /admin/build2a/* — Build 3A failure cannot affect Build 2A routes.
 * Read-only: no mutation routes, no decision endpoints.
 *
 * Routes:
 *   GET  /readiness                 — Build 3A state + table/view existence + key validation
 *   GET  /trajectories/:id          — one behavioral_trajectory by id (with governance status)
 *   GET  /trajectories/:id/members  — ordered member opinions for a trajectory
 *   GET  /claims/:id/trajectories   — all trajectories for a claim (chain-tip first)
 *   GET  /trajectory-governance     — trajectory_governance_contexts (chain-tip view)
 *   GET  /refusals                  — trajectory_refusal_records
 *   GET  /refusals/:id              — one refusal record by id
 */

import { Router, type Request, type Response } from "express";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { logger } from "../lib/logger.js";
import { getBuild3aReadiness } from "../services/build3a/build3aReadiness.js";
import { validateBuild3aKeys } from "../services/build3a/versionDispatch3a.js";

const router = Router();

// ── GET /readiness ─────────────────────────────────────────────────────────────
router.get("/readiness", async (_req: Request, res: Response): Promise<void> => {
  try {
    const readiness = getBuild3aReadiness();

    const tables = [
      "trajectory_rule_versions",
      "trajectory_governance_contexts",
      "behavioral_trajectories",
      "behavioral_trajectory_members",
      "trajectory_refusal_records",
      "trajectory_computation_ledger",
    ];
    const views = [
      "latest_behavioral_trajectory_v",
      "latest_trajectory_governance_context_v",
    ];

    const tableChecks: Record<string, boolean> = {};
    for (const tbl of tables) {
      try {
        await db.execute(sql.raw(`SELECT 1 FROM ${tbl} LIMIT 0`));
        tableChecks[tbl] = true;
      } catch {
        tableChecks[tbl] = false;
      }
    }

    const viewChecks: Record<string, boolean> = {};
    for (const v of views) {
      try {
        await db.execute(sql.raw(`SELECT 1 FROM ${v} LIMIT 0`));
        viewChecks[v] = true;
      } catch {
        viewChecks[v] = false;
      }
    }

    const keyErrors = await validateBuild3aKeys().catch(() => ["Key validation threw unexpectedly"]);

    const [trajCount, govCount, refusalCount] = await Promise.all([
      db.execute(sql`SELECT COUNT(*) as n FROM behavioral_trajectories`).then(r => Number((r.rows[0] as { n: string }).n)).catch(() => -1),
      db.execute(sql`SELECT COUNT(*) as n FROM trajectory_governance_contexts`).then(r => Number((r.rows[0] as { n: string }).n)).catch(() => -1),
      db.execute(sql`SELECT COUNT(*) as n FROM trajectory_refusal_records`).then(r => Number((r.rows[0] as { n: string }).n)).catch(() => -1),
    ]);

    res.json({
      readiness,
      tables: tableChecks,
      views: viewChecks,
      key_validation: { errors: keyErrors, healthy: keyErrors.length === 0 },
      counts: {
        behavioral_trajectories: trajCount,
        trajectory_governance_contexts: govCount,
        trajectory_refusal_records: refusalCount,
      },
      namespace: "/api/admin/build3a",
      note: "Build 3A is independent of Build 2A. Build 3A failure does not affect /admin/build2a routes.",
    });
  } catch (err) {
    logger.error({ err }, "[Build3A/admin] /readiness threw");
    res.status(500).json({ error: "Readiness check failed — see server logs" });
  }
});

// ── GET /trajectories/:id ──────────────────────────────────────────────────────
router.get("/trajectories/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await db.execute(sql`
      SELECT bt.*,
             trv.implementation_key  AS rule_implementation_key,
             trv.version_label       AS rule_version_label
      FROM behavioral_trajectories bt
      JOIN trajectory_rule_versions trv ON trv.id = bt.trajectory_rule_version_id
      WHERE bt.id = ${id}::uuid
      LIMIT 1
    `);
    if (result.rows.length === 0) {
      res.status(404).json({ error: "Trajectory not found" });
      return;
    }
    res.json({ trajectory: result.rows[0] });
  } catch (err) {
    logger.error({ err }, "[Build3A/admin] GET /trajectories/:id threw");
    res.status(500).json({ error: "Query failed — see server logs" });
  }
});

// ── GET /trajectories/:id/members ─────────────────────────────────────────────
router.get("/trajectories/:id/members", async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await db.execute(sql`
      SELECT
        btm.id,
        btm.sequence_number,
        btm.opinion_id,
        o.belief,
        o.disbelief,
        o.uncertainty,
        o.base_rate,
        o.evaluation_time,
        btm.created_at
      FROM behavioral_trajectory_members btm
      JOIN opinions o ON o.id = btm.opinion_id
      WHERE btm.trajectory_id = ${id}::uuid
      ORDER BY btm.sequence_number ASC
    `);
    res.json({ trajectory_id: id, member_count: result.rows.length, members: result.rows });
  } catch (err) {
    logger.error({ err }, "[Build3A/admin] GET /trajectories/:id/members threw");
    res.status(500).json({ error: "Query failed — see server logs" });
  }
});

// ── GET /claims/:id/trajectories ──────────────────────────────────────────────
router.get("/claims/:id/trajectories", async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await db.execute(sql`
      SELECT bt.*,
             trv.implementation_key AS rule_implementation_key,
             trv.version_label      AS rule_version_label,
             CASE WHEN NOT EXISTS (
               SELECT 1 FROM behavioral_trajectories newer WHERE newer.supersedes = bt.id
             ) THEN true ELSE false END AS is_chain_tip
      FROM behavioral_trajectories bt
      JOIN trajectory_rule_versions trv ON trv.id = bt.trajectory_rule_version_id
      WHERE bt.claim_id = ${id}::uuid
      ORDER BY bt.created_at DESC
    `);
    res.json({ claim_id: id, trajectory_count: result.rows.length, trajectories: result.rows });
  } catch (err) {
    logger.error({ err }, "[Build3A/admin] GET /claims/:id/trajectories threw");
    res.status(500).json({ error: "Query failed — see server logs" });
  }
});

// ── GET /trajectory-governance ─────────────────────────────────────────────────
router.get("/trajectory-governance", async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await db.execute(sql`
      SELECT
        tgc.*,
        dm.slug AS domain_module_slug,
        CASE WHEN NOT EXISTS (
          SELECT 1 FROM trajectory_governance_contexts newer WHERE newer.supersedes = tgc.id
        ) THEN true ELSE false END AS is_chain_tip
      FROM trajectory_governance_contexts tgc
      LEFT JOIN domain_modules dm ON dm.id = tgc.domain_module_id
      ORDER BY tgc.created_at DESC
    `);
    res.json({ governance_context_count: result.rows.length, governance_contexts: result.rows });
  } catch (err) {
    logger.error({ err }, "[Build3A/admin] GET /trajectory-governance threw");
    res.status(500).json({ error: "Query failed — see server logs" });
  }
});

// ── GET /refusals ──────────────────────────────────────────────────────────────
router.get("/refusals", async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await db.execute(sql`
      SELECT trr.*,
             trv.implementation_key AS rule_implementation_key
      FROM trajectory_refusal_records trr
      LEFT JOIN trajectory_rule_versions trv ON trv.id = trr.trajectory_rule_version_id
      ORDER BY trr.created_at DESC
      LIMIT 200
    `);
    res.json({ refusal_count: result.rows.length, refusals: result.rows });
  } catch (err) {
    logger.error({ err }, "[Build3A/admin] GET /refusals threw");
    res.status(500).json({ error: "Query failed — see server logs" });
  }
});

// ── GET /refusals/:id ──────────────────────────────────────────────────────────
router.get("/refusals/:id", async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await db.execute(sql`
      SELECT trr.*,
             trv.implementation_key AS rule_implementation_key
      FROM trajectory_refusal_records trr
      LEFT JOIN trajectory_rule_versions trv ON trv.id = trr.trajectory_rule_version_id
      WHERE trr.id = ${id}::uuid
      LIMIT 1
    `);
    if (result.rows.length === 0) {
      res.status(404).json({ error: "Refusal record not found" });
      return;
    }
    res.json({ refusal: result.rows[0] });
  } catch (err) {
    logger.error({ err }, "[Build3A/admin] GET /refusals/:id threw");
    res.status(500).json({ error: "Query failed — see server logs" });
  }
});

export default router;
