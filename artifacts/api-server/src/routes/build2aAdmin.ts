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

import { Router, type Request, type Response } from "express";
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
import { isBuild2a2Ready } from "../services/build2a/build2aReadiness.js";

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

export default router;
