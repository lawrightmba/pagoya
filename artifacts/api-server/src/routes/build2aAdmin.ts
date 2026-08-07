/**
 * Build 2A — Admin-only Routes (Package 2A-1)
 *
 * All routes are protected by the existing adminAuth guard (x-admin-key header
 * or ?adminKey query param vs ADMIN_TOKEN env var).
 *
 * Mounted at /api/admin/build2a/* in routes/index.ts.
 * Gated by build2aNotReadyMiddleware (503 while pending/failed).
 *
 * Package 2A-1 routes only — no Evidence Atom, Bundle, Opinion, or replay routes.
 *
 * Routes:
 *   GET  /status           — readiness state + Package 2A-1 table existence
 *   GET  /sources          — evidence_source_registry rows
 *   GET  /modules          — domain_modules rows
 *   GET  /primitives       — behavioral_primitives rows
 *   GET  /eligibility      — domain_source_eligibility rows
 *   GET  /version-dispatch — registered implementation keys across all version tables
 *   GET  /entities         — behavioral_entities (native_id masked for human_user)
 *   GET  /claims           — latest_behavioral_claim_v rows
 *   GET  /base-rates       — latest_base_rate_record_v rows
 *   GET  /validation       — validation queries proving Package 2A-1 schema health
 */

import { Router, type Request, type Response, type NextFunction } from "express";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { logger } from "../lib/logger.js";
import { getBuild2aReadiness } from "../services/build2a/build2aReadiness.js";
import { maskNativeId } from "../services/build2a/behavioralEntityResolution.js";
import {
  listImplementationKeys,
  validatePackage2a1Keys,
} from "../services/build2a/versionDispatch.js";

const router = Router();

// ── GET /status ────────────────────────────────────────────────────────────────
// Returns Build 2A readiness state, Package 2A-1 table existence, and key validation.
router.get("/status", async (_req: Request, res: Response): Promise<void> => {
  try {
    const readiness = getBuild2aReadiness();

    // Verify all Package 2A-1 tables exist
    const tables = [
      "behavioral_primitives", "domain_modules", "evidence_source_registry",
      "domain_source_eligibility", "interpretation_rule_versions",
      "quality_rule_versions", "integrity_rule_versions",
      "fusion_operator_versions", "knowledge_sufficiency_predicate_versions",
      "projection_function_versions", "base_rate_records",
      "behavioral_entities", "behavioral_claims",
      "behavioral_claim_retirements", "version_contexts",
    ];

    const tableChecks: Record<string, boolean> = {};
    for (const tbl of tables) {
      try {
        const r = await db.execute(sql.raw(`SELECT 1 FROM ${tbl} LIMIT 0`));
        tableChecks[tbl] = r !== null;
      } catch {
        tableChecks[tbl] = false;
      }
    }

    // Verify views exist
    const views = ["latest_behavioral_claim_v", "latest_base_rate_record_v"];
    const viewChecks: Record<string, boolean> = {};
    for (const v of views) {
      try {
        await db.execute(sql.raw(`SELECT 1 FROM ${v} LIMIT 0`));
        viewChecks[v] = true;
      } catch {
        viewChecks[v] = false;
      }
    }

    // Validate required implementation keys
    const keyErrors = await validatePackage2a1Keys().catch(() => ["Validation threw unexpectedly"]);

    // Seed counts
    const [primCount, modCount, srcCount, projCount] = await Promise.all([
      db.execute(sql`SELECT COUNT(*)::int AS n FROM behavioral_primitives`),
      db.execute(sql`SELECT COUNT(*)::int AS n FROM domain_modules`),
      db.execute(sql`SELECT COUNT(*)::int AS n FROM evidence_source_registry`),
      db.execute(sql`SELECT COUNT(*)::int AS n FROM projection_function_versions`),
    ]);

    const allTablesExist = Object.values(tableChecks).every(Boolean);
    const allViewsExist = Object.values(viewChecks).every(Boolean);
    const allKeysValid = keyErrors.length === 0;

    res.json({
      package: "2A-1",
      readiness: readiness.state,
      failure_message: readiness.failureMessage,
      schema_healthy: allTablesExist && allViewsExist && allKeysValid,
      tables: tableChecks,
      views: viewChecks,
      key_validation_errors: keyErrors,
      seed_counts: {
        behavioral_primitives: Number((primCount.rows[0] as { n: number }).n),
        domain_modules: Number((modCount.rows[0] as { n: number }).n),
        evidence_source_registry: Number((srcCount.rows[0] as { n: number }).n),
        projection_function_versions: Number((projCount.rows[0] as { n: number }).n),
      },
      feature_flag: {
        ENABLE_EVIDENCE_ENGINE: process.env.ENABLE_EVIDENCE_ENGINE === "true",
      },
    });
  } catch (err) {
    logger.error({ err }, "[Build2A] GET /status failed");
    res.status(500).json({ error: "Status check failed" });
  }
});

// ── GET /sources ───────────────────────────────────────────────────────────────
router.get("/sources", async (_req: Request, res: Response): Promise<void> => {
  try {
    const rows = await db.execute(sql`
      SELECT id, source_key, display_name, source_classification,
             privacy_classification, native_table_name, description,
             approval_status, deprecated_at, created_at
      FROM evidence_source_registry
      ORDER BY source_classification, source_key
    `);
    res.json({ sources: rows.rows, count: rows.rows.length });
  } catch (err) {
    logger.error({ err }, "[Build2A] GET /sources failed");
    res.status(500).json({ error: "Query failed" });
  }
});

// ── GET /modules ───────────────────────────────────────────────────────────────
router.get("/modules", async (_req: Request, res: Response): Promise<void> => {
  try {
    const rows = await db.execute(sql`
      SELECT id, slug, display_name, description, created_at
      FROM domain_modules
      ORDER BY slug
    `);
    res.json({ modules: rows.rows, count: rows.rows.length });
  } catch (err) {
    logger.error({ err }, "[Build2A] GET /modules failed");
    res.status(500).json({ error: "Query failed" });
  }
});

// ── GET /primitives ────────────────────────────────────────────────────────────
router.get("/primitives", async (_req: Request, res: Response): Promise<void> => {
  try {
    const rows = await db.execute(sql`
      SELECT id, name, is_universal, structural_precondition, description, created_at
      FROM behavioral_primitives
      ORDER BY is_universal DESC, name
    `);
    res.json({ primitives: rows.rows, count: rows.rows.length });
  } catch (err) {
    logger.error({ err }, "[Build2A] GET /primitives failed");
    res.status(500).json({ error: "Query failed" });
  }
});

// ── GET /eligibility ───────────────────────────────────────────────────────────
router.get("/eligibility", async (req: Request, res: Response): Promise<void> => {
  try {
    const domainSlug = req.query.domain as string | undefined;
    const sourceKey = req.query.source as string | undefined;

    const rows = await db.execute(sql`
      SELECT dse.id, dm.slug AS domain_slug, esr.source_key,
             bp.name AS primitive_name, dse.approval_status,
             dse.rule_version_id, dse.notes, dse.created_at
      FROM domain_source_eligibility dse
      JOIN domain_modules dm ON dm.id = dse.domain_module_id
      JOIN evidence_source_registry esr ON esr.id = dse.evidence_source_registry_id
      LEFT JOIN behavioral_primitives bp ON bp.id = dse.primitive_id
      WHERE (${domainSlug ?? null}::text IS NULL OR dm.slug = ${domainSlug ?? null})
        AND (${sourceKey ?? null}::text IS NULL OR esr.source_key = ${sourceKey ?? null})
      ORDER BY dm.slug, esr.source_key
    `);
    res.json({ eligibility: rows.rows, count: rows.rows.length });
  } catch (err) {
    logger.error({ err }, "[Build2A] GET /eligibility failed");
    res.status(500).json({ error: "Query failed" });
  }
});

// ── GET /version-dispatch ──────────────────────────────────────────────────────
// Lists all registered implementation keys across all version tables.
router.get("/version-dispatch", async (_req: Request, res: Response): Promise<void> => {
  try {
    const versionTables = [
      "projection_function_versions",
      "interpretation_rule_versions",
      "quality_rule_versions",
      "integrity_rule_versions",
      "fusion_operator_versions",
      "knowledge_sufficiency_predicate_versions",
    ] as const;

    const results: Record<string, unknown[]> = {};
    for (const tbl of versionTables) {
      try {
        results[tbl] = await listImplementationKeys(tbl);
      } catch {
        results[tbl] = [];
      }
    }

    res.json({ version_tables: results });
  } catch (err) {
    logger.error({ err }, "[Build2A] GET /version-dispatch failed");
    res.status(500).json({ error: "Query failed" });
  }
});

// ── GET /entities ──────────────────────────────────────────────────────────────
// native_id is masked for human_user entities.
router.get("/entities", async (_req: Request, res: Response): Promise<void> => {
  try {
    const limit = Math.min(Number((_req.query as { limit?: string }).limit) || 100, 500);
    const rows = await db.execute(sql`
      SELECT id, entity_type, native_system, native_id, created_at
      FROM behavioral_entities
      ORDER BY created_at DESC
      LIMIT ${limit}
    `);

    const masked = (rows.rows as Array<{
      id: string; entity_type: string; native_system: string; native_id: string; created_at: string;
    }>).map(r => ({
      ...r,
      native_id: maskNativeId(r.entity_type, r.native_id),
    }));

    res.json({ entities: masked, count: masked.length });
  } catch (err) {
    logger.error({ err }, "[Build2A] GET /entities failed");
    res.status(500).json({ error: "Query failed" });
  }
});

// ── GET /claims ────────────────────────────────────────────────────────────────
// Returns the latest-active claims from latest_behavioral_claim_v.
router.get("/claims", async (_req: Request, res: Response): Promise<void> => {
  try {
    const limit = Math.min(Number((_req.query as { limit?: string }).limit) || 50, 200);
    const rows = await db.execute(sql`
      SELECT c.id, be.entity_type, be.native_system,
             bp.name AS primitive_name,
             dm.slug AS domain_slug,
             c.window_start, c.window_end, c.falsifiability_condition,
             c.version_context_id, c.supersedes, c.created_at
      FROM latest_behavioral_claim_v c
      JOIN behavioral_entities be ON be.id = c.entity_id
      JOIN behavioral_primitives bp ON bp.id = c.primitive_id
      JOIN domain_modules dm ON dm.id = c.domain_module_id
      ORDER BY c.created_at DESC
      LIMIT ${limit}
    `);
    res.json({ claims: rows.rows, count: rows.rows.length });
  } catch (err) {
    logger.error({ err }, "[Build2A] GET /claims failed");
    res.status(500).json({ error: "Query failed" });
  }
});

// ── GET /base-rates ────────────────────────────────────────────────────────────
router.get("/base-rates", async (_req: Request, res: Response): Promise<void> => {
  try {
    const rows = await db.execute(sql`
      SELECT id, source_type, scope, value, sufficiency_status,
             approval_authority, derivation_method,
             effective_from, effective_to, supersedes, notes, created_at
      FROM latest_base_rate_record_v
      ORDER BY scope, source_type
    `);
    res.json({ base_rates: rows.rows, count: rows.rows.length });
  } catch (err) {
    logger.error({ err }, "[Build2A] GET /base-rates failed");
    res.status(500).json({ error: "Query failed" });
  }
});

// ── GET /validation ────────────────────────────────────────────────────────────
// Runs all required Package 2A-1 validation queries. Read-only probe.
router.get("/validation", async (_req: Request, res: Response): Promise<void> => {
  try {
    const [
      tables,
      indexes,
      triggers,
      dupKeys,
      dupEntities,
      invalidBaseRates,
      unboundedClaims,
    ] = await Promise.all([
      // All Package 2A-1 tables exist
      db.execute(sql`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name IN (
            'behavioral_primitives','domain_modules','evidence_source_registry',
            'domain_source_eligibility','interpretation_rule_versions',
            'quality_rule_versions','integrity_rule_versions',
            'fusion_operator_versions','knowledge_sufficiency_predicate_versions',
            'projection_function_versions','base_rate_records',
            'behavioral_entities','behavioral_claims',
            'behavioral_claim_retirements','version_contexts'
          )
        ORDER BY table_name
      `),
      // Required indexes exist
      db.execute(sql`
        SELECT indexname FROM pg_indexes
        WHERE schemaname = 'public'
          AND indexname IN (
            'idx_behavioral_claims_entity','idx_behavioral_claims_primitive',
            'idx_behavioral_claims_domain','idx_behavioral_claims_window',
            'idx_behavioral_claims_supersedes',
            'idx_behavioral_claim_retirements_claim',
            'idx_base_rate_records_supersedes','idx_base_rate_records_scope',
            'idx_behavioral_entities_type_system',
            'idx_dse_domain_module','idx_dse_source',
            'idx_esr_source_key','idx_esr_approval_status',
            'uq_domain_source_eligibility_key'
          )
        ORDER BY indexname
      `),
      // Immutability triggers exist
      db.execute(sql`
        SELECT trigger_name, event_object_table
        FROM information_schema.triggers
        WHERE trigger_schema = 'public'
          AND trigger_name LIKE 'build2a_%'
        ORDER BY event_object_table, trigger_name
      `),
      // No duplicate implementation keys in any version table
      db.execute(sql`
        SELECT 'projection_function_versions' AS tbl, implementation_key, COUNT(*) AS n
        FROM projection_function_versions
        GROUP BY implementation_key HAVING COUNT(*) > 1
        UNION ALL
        SELECT 'interpretation_rule_versions', implementation_key, COUNT(*)
        FROM interpretation_rule_versions
        GROUP BY implementation_key HAVING COUNT(*) > 1
        UNION ALL
        SELECT 'quality_rule_versions', implementation_key, COUNT(*)
        FROM quality_rule_versions
        GROUP BY implementation_key HAVING COUNT(*) > 1
        UNION ALL
        SELECT 'integrity_rule_versions', implementation_key, COUNT(*)
        FROM integrity_rule_versions
        GROUP BY implementation_key HAVING COUNT(*) > 1
        UNION ALL
        SELECT 'fusion_operator_versions', implementation_key, COUNT(*)
        FROM fusion_operator_versions
        GROUP BY implementation_key HAVING COUNT(*) > 1
        UNION ALL
        SELECT 'knowledge_sufficiency_predicate_versions', implementation_key, COUNT(*)
        FROM knowledge_sufficiency_predicate_versions
        GROUP BY implementation_key HAVING COUNT(*) > 1
      `),
      // No duplicate behavioral entity identities
      db.execute(sql`
        SELECT entity_type, native_system, native_id, COUNT(*) AS n
        FROM behavioral_entities
        GROUP BY entity_type, native_system, native_id
        HAVING COUNT(*) > 1
      `),
      // No invalid base rate rows (constraint should prevent, but verify)
      db.execute(sql`
        SELECT id, source_type, value, sufficiency_status
        FROM base_rate_records
        WHERE NOT (
          (source_type = 'provisional_unknown' AND value IS NULL AND sufficiency_status <> 'sufficient')
          OR
          (source_type <> 'provisional_unknown' AND value IS NOT NULL AND value >= 0 AND value <= 1)
        )
      `),
      // No unbounded claims (window_end <= window_start would be blocked by CHECK)
      db.execute(sql`
        SELECT id FROM behavioral_claims
        WHERE window_end <= window_start OR falsifiability_condition = ''
      `),
    ]);

    const expectedTables = 15;
    const foundTables = tables.rows.length;

    res.json({
      as_of: new Date().toISOString(),
      tables: {
        expected: expectedTables,
        found: foundTables,
        all_present: foundTables === expectedTables,
        table_names: (tables.rows as Array<{ table_name: string }>).map(r => r.table_name),
      },
      indexes: {
        found: indexes.rows.length,
        index_names: (indexes.rows as Array<{ indexname: string }>).map(r => r.indexname),
      },
      triggers: {
        found: triggers.rows.length,
        by_table: triggers.rows,
      },
      duplicate_implementation_keys: {
        count: dupKeys.rows.length,
        violations: dupKeys.rows,
      },
      duplicate_entity_identities: {
        count: dupEntities.rows.length,
        violations: dupEntities.rows,
      },
      invalid_base_rate_rows: {
        count: invalidBaseRates.rows.length,
        violations: invalidBaseRates.rows,
      },
      unbounded_or_invalid_claims: {
        count: unboundedClaims.rows.length,
        violations: unboundedClaims.rows,
      },
      schema_valid:
        foundTables === expectedTables &&
        dupKeys.rows.length === 0 &&
        dupEntities.rows.length === 0 &&
        invalidBaseRates.rows.length === 0 &&
        unboundedClaims.rows.length === 0,
    });
  } catch (err) {
    logger.error({ err }, "[Build2A] GET /validation failed");
    res.status(500).json({ error: "Validation query failed" });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// Package 2A-2 Routes — Interpretation Foundation
// All routes below are additive; no 2A-1 route is modified.
// All routes are gated on 2A-2 readiness.
// No raw PII is returned — all entity identifiers are masked.
// ═══════════════════════════════════════════════════════════════════════════════
import { isBuild2a2Ready, isBuild2a3Ready, isBuild2a4Ready } from "../services/build2a/build2aReadiness.js";

function require2a4Ready(req: Request, res: Response, next: NextFunction): void {
  if (!isBuild2a4Ready()) {
    res.status(503).json({
      error: "Build 2A Package 2A-4 (Opinion Formation) initialization pending or failed",
      hint: "ensureBuild2a4Tables() has not completed. Retry in a moment.",
    });
    return;
  }
  next();
}

function require2a3Ready(req: Request, res: Response, next: NextFunction): void {
  if (!isBuild2a3Ready()) {
    res.status(503).json({
      error: "Package 2A-3 initialization pending or failed",
      hint: "ensureBuild2a3Tables() has not completed. Retry in a moment.",
    });
    return;
  }
  next();
}

function require2a2Ready(req: Request, res: Response, next: NextFunction): void {
  if (!isBuild2a2Ready()) {
    res.status(503).json({
      error: "Package 2A-2 (Interpretation Foundation) is not yet ready. Try again shortly.",
      package: "2A-2",
    });
    return;
  }
  next();
}

// ── GET /ledger ─────────────────────────────────────────────────────────────
// Returns paginated source_processing_ledger rows, newest first.
// Masks native entity identifiers; shows only ledger-internal UUIDs.
router.get("/ledger", require2a2Ready, async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = Math.min(Number(req.query["limit"] ?? 50), 200);
    const status = req.query["status"] as string | undefined;

    const rows = await db.execute(sql`
      SELECT
        id,
        evidence_source_registry_id,
        source_record_key,
        interpretation_rule_version_id,
        status,
        attempts,
        first_seen_at,
        last_attempted_at,
        completed_at,
        -- mask resulting_atom_id and resulting_refusal_id behind stable UUIDs (no PII)
        resulting_atom_id,
        resulting_refusal_id,
        -- omit errors column from list view (may contain raw exception messages)
        jsonb_array_length(COALESCE(errors, '[]'::jsonb)) AS error_count
      FROM source_processing_ledger
      WHERE (${status ?? null} IS NULL OR status = ${status ?? null})
      ORDER BY first_seen_at DESC
      LIMIT ${limit}
    `);

    res.json({ ledger: rows.rows, count: rows.rows.length });
  } catch (err) {
    logger.error({ err }, "[Build2A/2A-2] GET /ledger failed");
    res.status(500).json({ error: "Query failed" });
  }
});

// ── GET /ledger/:id ─────────────────────────────────────────────────────────
router.get("/ledger/:id", require2a2Ready, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const rows = await db.execute(sql`
      SELECT
        id,
        evidence_source_registry_id,
        source_record_key,
        interpretation_rule_version_id,
        status,
        attempts,
        first_seen_at,
        last_attempted_at,
        completed_at,
        resulting_atom_id,
        resulting_refusal_id,
        errors
      FROM source_processing_ledger
      WHERE id = ${id}::uuid
      LIMIT 1
    `);

    if (rows.rows.length === 0) {
      res.status(404).json({ error: "Ledger row not found" });
      return;
    }
    res.json({ ledger_row: rows.rows[0] });
  } catch (err) {
    logger.error({ err }, "[Build2A/2A-2] GET /ledger/:id failed");
    res.status(500).json({ error: "Query failed" });
  }
});

// ── GET /cluster-assembly/:id ────────────────────────────────────────────────
router.get("/cluster-assembly/:id", require2a2Ready, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const [clusterRows, linkRows] = await Promise.all([
      db.execute(sql`
        SELECT
          id,
          claim_id,
          interpretation_rule_version_id,
          assembly_state,
          expected_observation_count,
          abandon_timeout_seconds,
          cluster_hash,
          assembled_at,
          sealed_at,
          abandoned_at
        FROM cluster_assembly
        WHERE id = ${id}::uuid
        LIMIT 1
      `),
      db.execute(sql`
        SELECT
          id,
          cluster_assembly_id,
          evidence_source_registry_id,
          source_record_key,
          sequence_position,
          created_at
        FROM evidence_atom_observation_links
        WHERE cluster_assembly_id = ${id}::uuid
        ORDER BY sequence_position ASC
      `),
    ]);

    if (clusterRows.rows.length === 0) {
      res.status(404).json({ error: "Cluster not found" });
      return;
    }
    res.json({ cluster: clusterRows.rows[0], observation_links: linkRows.rows });
  } catch (err) {
    logger.error({ err }, "[Build2A/2A-2] GET /cluster-assembly/:id failed");
    res.status(500).json({ error: "Query failed" });
  }
});

// ── GET /atoms/:id ───────────────────────────────────────────────────────────
router.get("/atoms/:id", require2a2Ready, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const rows = await db.execute(sql`
      SELECT
        id,
        claim_id,
        cluster_assembly_id,
        interpretation_rule_version_id,
        disposition,
        dependence_declaration,
        effective_at,
        supersedes,
        environment_context,
        created_at
      FROM interpreted_evidence_atoms
      WHERE id = ${id}::uuid
      LIMIT 1
    `);

    if (rows.rows.length === 0) {
      res.status(404).json({ error: "Atom not found" });
      return;
    }
    res.json({ atom: rows.rows[0] });
  } catch (err) {
    logger.error({ err }, "[Build2A/2A-2] GET /atoms/:id failed");
    res.status(500).json({ error: "Query failed" });
  }
});

// ── GET /atoms/:id/observations ──────────────────────────────────────────────
router.get("/atoms/:id/observations", require2a2Ready, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const rows = await db.execute(sql`
      SELECT
        eaol.id,
        eaol.cluster_assembly_id,
        eaol.evidence_source_registry_id,
        eaol.source_record_key,
        eaol.sequence_position,
        eaol.created_at,
        esr.source_key,
        esr.source_description
      FROM evidence_atom_observation_links eaol
      JOIN evidence_source_registry esr ON esr.id = eaol.evidence_source_registry_id
      WHERE eaol.atom_id = ${id}::uuid
      ORDER BY eaol.sequence_position ASC
    `);

    res.json({ atom_id: id, observations: rows.rows, count: rows.rows.length });
  } catch (err) {
    logger.error({ err }, "[Build2A/2A-2] GET /atoms/:id/observations failed");
    res.status(500).json({ error: "Query failed" });
  }
});

// ── GET /refusals ─────────────────────────────────────────────────────────────
router.get("/refusals", require2a2Ready, async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = Math.min(Number(req.query["limit"] ?? 50), 200);
    const stage = req.query["stage"] as string | undefined;

    const rows = await db.execute(sql`
      SELECT
        id,
        refusal_stage,
        reason_code,
        claim_id,
        cluster_assembly_id,
        source_observation_key,
        evidence_source_registry_id,
        interpretation_rule_version_id,
        detail,
        created_at AS refused_at
      FROM refusal_records
      WHERE (${stage ?? null} IS NULL OR refusal_stage = ${stage ?? null})
      ORDER BY refused_at DESC
      LIMIT ${limit}
    `);

    res.json({ refusals: rows.rows, count: rows.rows.length });
  } catch (err) {
    logger.error({ err }, "[Build2A/2A-2] GET /refusals failed");
    res.status(500).json({ error: "Query failed" });
  }
});

// ── GET /2a2-validation ───────────────────────────────────────────────────────
// Package 2A-2 schema health check (additive, does not replace 2A-1 /validation).
router.get("/2a2-validation", require2a2Ready, async (_req: Request, res: Response): Promise<void> => {
  try {
    const [tables2a2, triggers2a2, dupLedger] = await Promise.all([
      db.execute(sql`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name IN (
            'source_processing_ledger',
            'cluster_assembly',
            'interpreted_evidence_atoms',
            'evidence_atom_observation_links',
            'refusal_records'
          )
        ORDER BY table_name
      `),
      db.execute(sql`
        SELECT trigger_name, event_object_table
        FROM information_schema.triggers
        WHERE trigger_schema = 'public'
          AND trigger_name LIKE 'build2a2_%'
        ORDER BY event_object_table, trigger_name
      `),
      db.execute(sql`
        SELECT evidence_source_registry_id, source_record_key, interpretation_rule_version_id, COUNT(*) AS n
        FROM source_processing_ledger
        GROUP BY evidence_source_registry_id, source_record_key, interpretation_rule_version_id
        HAVING COUNT(*) > 1
      `),
    ]);

    const expected2a2Tables = 5;
    const found = tables2a2.rows.length;

    res.json({
      as_of: new Date().toISOString(),
      package: "2A-2",
      tables: {
        expected: expected2a2Tables,
        found,
        all_present: found === expected2a2Tables,
        names: (tables2a2.rows as Array<{ table_name: string }>).map(r => r.table_name),
      },
      triggers: { found: triggers2a2.rows.length, by_table: triggers2a2.rows },
      duplicate_ledger_rows: { count: dupLedger.rows.length, violations: dupLedger.rows },
      schema_valid: found === expected2a2Tables && dupLedger.rows.length === 0,
    });
  } catch (err) {
    logger.error({ err }, "[Build2A/2A-2] GET /2a2-validation failed");
    res.status(500).json({ error: "Validation query failed" });
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// Package 2A-3 — Weighting Foundation routes
// ══════════════════════════════════════════════════════════════════════════════

// ── GET /integrity-contexts/:id ───────────────────────────────────────────────
router.get("/integrity-contexts/:id", require2a3Ready, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await db.execute(sql`
      SELECT ic.*,
             irv.version_label AS integrity_rule_label,
             irv.implementation_key AS rule_key
      FROM integrity_contexts ic
      JOIN integrity_rule_versions irv ON irv.id = ic.integrity_rule_version_id
      WHERE ic.id = ${id}::uuid
    `);
    if (result.rows.length === 0) {
      res.status(404).json({ error: "Integrity context not found" });
      return;
    }
    res.json({ integrity_context: result.rows[0] });
  } catch (err) {
    logger.error({ err }, "[Build2A/3] GET /integrity-contexts/:id failed");
    res.status(500).json({ error: "Query failed" });
  }
});

// ── GET /quality-contexts/:id ─────────────────────────────────────────────────
router.get("/quality-contexts/:id", require2a3Ready, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await db.execute(sql`
      SELECT qc.*,
             qrv.version_label AS quality_rule_label,
             qrv.implementation_key AS rule_key
      FROM quality_contexts qc
      JOIN quality_rule_versions qrv ON qrv.id = qc.quality_rule_version_id
      WHERE qc.id = ${id}::uuid
    `);
    if (result.rows.length === 0) {
      res.status(404).json({ error: "Quality context not found" });
      return;
    }
    res.json({ quality_context: result.rows[0] });
  } catch (err) {
    logger.error({ err }, "[Build2A/3] GET /quality-contexts/:id failed");
    res.status(500).json({ error: "Query failed" });
  }
});

// ── GET /contributions/:id ────────────────────────────────────────────────────
router.get("/contributions/:id", require2a3Ready, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await db.execute(sql`
      SELECT wec.*,
             ic.reliability_score,
             ic.source_classification,
             ic.integrity_flags,
             qc.evaluation_timestamp AS quality_eval_ts,
             iea.disposition AS atom_disposition
      FROM weighted_evidence_contributions wec
      JOIN integrity_contexts ic ON ic.id = wec.integrity_context_id
      JOIN quality_contexts qc ON qc.id = wec.quality_context_id
      JOIN interpreted_evidence_atoms iea ON iea.id = wec.atom_id
      WHERE wec.id = ${id}::uuid
    `);
    if (result.rows.length === 0) {
      res.status(404).json({ error: "Weighted contribution not found" });
      return;
    }
    res.json({ contribution: result.rows[0] });
  } catch (err) {
    logger.error({ err }, "[Build2A/3] GET /contributions/:id failed");
    res.status(500).json({ error: "Query failed" });
  }
});

// ── GET /atoms/:id/contributions ──────────────────────────────────────────────
// Returns all contributions for an atom (chain history + tip indicator).
router.get("/atoms/:id/contributions", require2a3Ready, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await db.execute(sql`
      SELECT wec.*,
             CASE WHEN wec.id IN (SELECT id FROM latest_weighted_contribution_v WHERE atom_id = ${id}::uuid)
                  THEN true ELSE false END AS is_chain_tip
      FROM weighted_evidence_contributions wec
      WHERE wec.atom_id = ${id}::uuid
      ORDER BY wec.computed_at ASC
    `);
    res.json({
      atom_id: id,
      contribution_count: result.rows.length,
      contributions: result.rows,
    });
  } catch (err) {
    logger.error({ err }, "[Build2A/3] GET /atoms/:id/contributions failed");
    res.status(500).json({ error: "Query failed" });
  }
});

// ── GET /weighting-health ─────────────────────────────────────────────────────
// Package 2A-3 schema health check (mirrors /2a2-validation for 2A-3).
router.get("/weighting-health", require2a3Ready, async (_req: Request, res: Response): Promise<void> => {
  try {
    const [tables2a3, triggers2a3, pendingLedger, refusalCodes] = await Promise.all([
      db.execute(sql`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name IN (
            'weighting_ledger', 'integrity_contexts',
            'quality_contexts', 'weighted_evidence_contributions'
          )
        ORDER BY table_name
      `),
      db.execute(sql`
        SELECT trigger_name, event_object_table
        FROM information_schema.triggers
        WHERE trigger_schema = 'public'
          AND trigger_name LIKE 'build2a_weighting_%'
             OR trigger_name LIKE 'build2a_no_%integrity_contexts%'
             OR trigger_name LIKE 'build2a_no_%quality_contexts%'
             OR trigger_name LIKE 'build2a_no_%weighted_evidence_contributions%'
        ORDER BY event_object_table, trigger_name
      `),
      db.execute(sql`
        SELECT status, COUNT(*)::int AS count
        FROM weighting_ledger GROUP BY status ORDER BY status
      `),
      db.execute(sql`
        SELECT reason_code, COUNT(*)::int AS count
        FROM refusal_records WHERE refusal_stage = 'weighting'
        GROUP BY reason_code ORDER BY count DESC
      `),
    ]);

    const expectedTables = 4;
    const found = tables2a3.rows.length;

    res.json({
      as_of: new Date().toISOString(),
      package: "2A-3",
      tables: {
        expected: expectedTables,
        found,
        all_present: found === expectedTables,
        names: (tables2a3.rows as Array<{ table_name: string }>).map(r => r.table_name),
      },
      triggers: { found: triggers2a3.rows.length, by_table: triggers2a3.rows },
      weighting_ledger_by_status: pendingLedger.rows,
      weighting_refusals_by_code: refusalCodes.rows,
      schema_valid: found === expectedTables,
    });
  } catch (err) {
    logger.error({ err }, "[Build2A/3] GET /weighting-health failed");
    res.status(500).json({ error: "Weighting health query failed" });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// Package 2A-4: Opinion Formation — Read-only admin routes
// All routes gated by require2a4Ready.
// ════════════════════════════════════════════════════════════════════════════

// ── GET /bundles/:id ──────────────────────────────────────────────────────────
router.get("/bundles/:id", require2a4Ready, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await db.execute(sql`
      SELECT eb.*, fov.implementation_key AS operator_implementation_key
      FROM evidence_bundles eb
      JOIN fusion_operator_versions fov ON fov.id = eb.fusion_operator_version_id
      WHERE eb.id = ${id}::uuid
    `);
    if (result.rows.length === 0) { res.status(404).json({ error: "Bundle not found" }); return; }
    res.json({ bundle: result.rows[0] });
  } catch (err) {
    logger.error({ err }, "[Build2A/4] GET /bundles/:id failed");
    res.status(500).json({ error: "Query failed" });
  }
});

// ── GET /bundles/:id/members ──────────────────────────────────────────────────
router.get("/bundles/:id/members", require2a4Ready, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await db.execute(sql`
      SELECT ebm.*, wec.final_effective_weight, iea.disposition, iea.dependence_declaration,
             iea.claim_id
      FROM evidence_bundle_members ebm
      JOIN weighted_evidence_contributions wec ON wec.id = ebm.weighted_contribution_id
      JOIN interpreted_evidence_atoms iea ON iea.id = wec.atom_id
      WHERE ebm.bundle_id = ${id}::uuid
      ORDER BY ebm.sequence_number ASC
    `);
    res.json({ bundle_id: id, member_count: result.rows.length, members: result.rows });
  } catch (err) {
    logger.error({ err }, "[Build2A/4] GET /bundles/:id/members failed");
    res.status(500).json({ error: "Query failed" });
  }
});

// ── GET /fusion-contexts/:id ──────────────────────────────────────────────────
router.get("/fusion-contexts/:id", require2a4Ready, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await db.execute(sql`
      SELECT fc.*, fov.implementation_key AS selection_rule_key,
             fgc.scope_type AS governance_scope_type,
             fgc.conflict_threshold AS governance_threshold
      FROM fusion_contexts fc
      JOIN fusion_operator_versions fov ON fov.id = fc.selection_rule_version_id
      JOIN fusion_governance_contexts fgc ON fgc.id = fc.governance_context_id
      WHERE fc.id = ${id}::uuid
    `);
    if (result.rows.length === 0) { res.status(404).json({ error: "Fusion context not found" }); return; }
    res.json({ fusion_context: result.rows[0] });
  } catch (err) {
    logger.error({ err }, "[Build2A/4] GET /fusion-contexts/:id failed");
    res.status(500).json({ error: "Query failed" });
  }
});

// ── GET /fusion-governance-contexts ──────────────────────────────────────────
router.get("/fusion-governance-contexts", require2a4Ready, async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await db.execute(sql`
      SELECT fgc.*, fov.implementation_key AS operator_implementation_key,
             dm.slug AS domain_module_slug,
             bc.id::text AS claim_label
      FROM latest_fusion_governance_context_v fgc
      JOIN fusion_operator_versions fov ON fov.id = fgc.fusion_operator_version_id
      LEFT JOIN domain_modules dm ON dm.id = fgc.domain_module_id
      LEFT JOIN behavioral_claims bc ON bc.id = fgc.claim_id
      ORDER BY fgc.scope_type ASC, fgc.created_at DESC
    `);
    res.json({
      as_of: new Date().toISOString(),
      governance_context_count: result.rows.length,
      governance_contexts: result.rows,
    });
  } catch (err) {
    logger.error({ err }, "[Build2A/4] GET /fusion-governance-contexts failed");
    res.status(500).json({ error: "Query failed" });
  }
});

// ── GET /opinions/:id ─────────────────────────────────────────────────────────
router.get("/opinions/:id", require2a4Ready, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await db.execute(sql`
      SELECT o.*, brr.scope AS base_rate_scope, brr.value AS base_rate_stored_value,
             fc.selected_operator, fc.rerouted_to_consensus_compromise
      FROM opinions o
      JOIN base_rate_records brr ON brr.id = o.base_rate_record_id
      JOIN fusion_contexts fc ON fc.id = o.fusion_context_id
      WHERE o.id = ${id}::uuid
    `);
    if (result.rows.length === 0) { res.status(404).json({ error: "Opinion not found" }); return; }
    res.json({ opinion: result.rows[0] });
  } catch (err) {
    logger.error({ err }, "[Build2A/4] GET /opinions/:id failed");
    res.status(500).json({ error: "Query failed" });
  }
});

// ── GET /opinions/:id/projection ──────────────────────────────────────────────
router.get("/opinions/:id/projection", require2a4Ready, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await db.execute(sql`
      SELECT * FROM sl_binomial_projection_v1 WHERE opinion_id = ${id}::uuid
    `);
    if (result.rows.length === 0) { res.status(404).json({ error: "Opinion not found in projection view" }); return; }
    res.json({ projection: result.rows[0] });
  } catch (err) {
    logger.error({ err }, "[Build2A/4] GET /opinions/:id/projection failed");
    res.status(500).json({ error: "Query failed" });
  }
});

// ── GET /opinions/:id/reasoning-trace ─────────────────────────────────────────
router.get("/opinions/:id/reasoning-trace", require2a4Ready, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await db.execute(sql`
      SELECT rt.*, o.claim_id, o.belief, o.disbelief, o.uncertainty, o.evaluation_time
      FROM reasoning_traces rt
      JOIN opinions o ON o.id = rt.opinion_id
      WHERE rt.opinion_id = ${id}::uuid
    `);
    if (result.rows.length === 0) { res.status(404).json({ error: "Reasoning trace not found" }); return; }
    res.json({ reasoning_trace: result.rows[0] });
  } catch (err) {
    logger.error({ err }, "[Build2A/4] GET /opinions/:id/reasoning-trace failed");
    res.status(500).json({ error: "Query failed" });
  }
});

// ── GET /claims/:id/latest-opinion ───────────────────────────────────────────
router.get("/claims/:id/latest-opinion", require2a4Ready, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const result = await db.execute(sql`
      SELECT o.*,
             proj.projected_probability,
             proj.implementation_key AS projection_key
      FROM latest_opinion_v o
      JOIN sl_binomial_projection_v1 proj ON proj.opinion_id = o.id
      WHERE o.claim_id = ${id}::uuid
      ORDER BY o.evaluation_time DESC
      LIMIT 1
    `);
    if (result.rows.length === 0) {
      res.status(404).json({ error: "No opinion found for this claim" }); return;
    }
    res.json({ claim_id: id, latest_opinion: result.rows[0] });
  } catch (err) {
    logger.error({ err }, "[Build2A/4] GET /claims/:id/latest-opinion failed");
    res.status(500).json({ error: "Query failed" });
  }
});

// ── GET /opinion-health ───────────────────────────────────────────────────────
router.get("/opinion-health", require2a4Ready, async (_req: Request, res: Response): Promise<void> => {
  try {
    const [tables2a4, triggers2a4, ledgerStatus, refusalCodes, opinionCount] = await Promise.all([
      db.execute(sql`
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name IN (
            'evidence_bundles', 'evidence_bundle_members',
            'fusion_governance_contexts', 'fusion_contexts',
            'opinions', 'reasoning_traces', 'opinion_formation_ledger'
          )
        ORDER BY table_name
      `),
      db.execute(sql`
        SELECT trigger_name, event_object_table
        FROM information_schema.triggers
        WHERE trigger_schema = 'public'
          AND trigger_name LIKE 'build2a_no_%evidence_bundle%'
             OR trigger_name LIKE 'build2a_no_%fusion_%'
             OR trigger_name LIKE 'build2a_no_%opinion%'
             OR trigger_name LIKE 'build2a_no_%reasoning%'
             OR trigger_name LIKE 'build2a_opinion_ledger%'
        ORDER BY event_object_table, trigger_name
      `),
      db.execute(sql`
        SELECT status, COUNT(*)::int AS count
        FROM opinion_formation_ledger GROUP BY status ORDER BY status
      `),
      db.execute(sql`
        SELECT reason_code, COUNT(*)::int AS count
        FROM refusal_records WHERE refusal_stage = 'fusion'
        GROUP BY reason_code ORDER BY count DESC
      `),
      db.execute(sql`SELECT COUNT(*)::int AS count FROM opinions`),
    ]);

    const expectedTables = 7;
    const found = tables2a4.rows.length;

    res.json({
      as_of: new Date().toISOString(),
      package: "2A-4",
      tables: {
        expected: expectedTables,
        found,
        all_present: found === expectedTables,
        names: (tables2a4.rows as Array<{ table_name: string }>).map(r => r.table_name),
      },
      triggers: { found: triggers2a4.rows.length, by_table: triggers2a4.rows },
      opinion_formation_ledger_by_status: ledgerStatus.rows,
      fusion_refusals_by_code: refusalCodes.rows,
      total_opinions: (opinionCount.rows[0] as { count: number }).count,
      schema_valid: found === expectedTables,
    });
  } catch (err) {
    logger.error({ err }, "[Build2A/4] GET /opinion-health failed");
    res.status(500).json({ error: "Opinion health query failed" });
  }
});

export default router;
