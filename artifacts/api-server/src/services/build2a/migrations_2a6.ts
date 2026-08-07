/**
 * Build 2A — Package 2A-6 Schema Migrations
 * Prediction, Resolution & Calibration Foundation
 *
 * Tables (13):
 *   prediction_formation_rule_versions
 *   prediction_classification_rule_versions
 *   calibration_metric_set_versions
 *   prediction_governance_contexts
 *   calibration_governance_contexts
 *   behavioral_predictions
 *   behavioral_prediction_outcomes
 *   behavioral_prediction_resolutions
 *   calibration_runs
 *   calibration_metrics
 *   prediction_formation_ledger
 *   prediction_resolution_ledger
 *   calibration_ledger
 *
 * Views (3):
 *   latest_prediction_governance_context_v
 *   latest_calibration_governance_context_v
 *   prediction_calibration_summary_v
 *
 * Triggers: Immutability on Tier 1 tables (reuses existing build2a_block_all_mutations_fn())
 * Seeds: 3 rule/metric versions, all EXPERIMENTAL/CANARY-ONLY
 *
 * All operations are additive / idempotent — safe to run multiple times.
 * Uses direct SQL via db.execute() (drizzle-kit push is broken in this env).
 */

import { logger } from "../../lib/logger.js";

export async function ensureBuild2a6Tables(): Promise<void> {
  const { db } = await import("@workspace/db");
  const { sql } = await import("drizzle-orm");

  logger.info("[Build2A/6] Starting Package 2A-6 schema migration");

  // ── Step 1: Extend refusal_records reason_code CHECK ─────────────────────
  // CUMULATIVE: replace constraint with the full union of all 2A-2 through 2A-6 codes.
  // MUST include every code from every prior package — DROP+RE-ADD narrows to exactly
  // what we list, so missing any prior code makes that code invalid for existing rows.
  //
  // Sentinel guard: if the constraint already contains 'missing_prediction_governance'
  // (a 2A-6 code), it is already at 2A-6 level — skip.
  await db.execute(sql`
    DO $$
    DECLARE
      v_constraint_name text;
      v_constraint_def  text;
    BEGIN
      SELECT conname, pg_get_constraintdef(oid) INTO v_constraint_name, v_constraint_def
      FROM pg_constraint
      WHERE conrelid = 'refusal_records'::regclass
        AND contype = 'c'
        AND pg_get_constraintdef(oid) LIKE '%reason_code%'
      LIMIT 1;

      -- Skip if already at 2A-6 level (idempotent guard)
      IF v_constraint_def IS NOT NULL AND v_constraint_def LIKE '%missing_prediction_governance%' THEN
        RETURN;
      END IF;

      IF v_constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE refusal_records DROP CONSTRAINT ' || quote_ident(v_constraint_name);
      END IF;

      ALTER TABLE refusal_records ADD CONSTRAINT refusal_records_reason_code_check CHECK (
        reason_code IN (
          -- 2A-2 codes (evidence ingestion)
          'no_matching_claim', 'unregistered_source', 'source_not_eligible',
          'revoked_source_eligibility', 'primitive_mismatch',
          'incomplete_bounded_cluster', 'ambiguous_interpretation',
          'prohibited_inference', 'invalid_or_unavailable_version',
          'source_attribution_failed', 'processing_failure',
          -- 2A-3 codes (weighting)
          'missing_integrity_context', 'missing_quality_context',
          'invalid_integrity_score', 'invalid_quality_component',
          'invalid_or_unavailable_weighting_version', 'unsupported_weighting_rule',
          'source_integrity_unresolved', 'quality_inputs_incomplete',
          'weighting_computation_failed',
          -- 2A-4 codes (opinion formation)
          'missing_base_rate', 'ambiguous_base_rate_governance',
          'missing_conflict_threshold_governance',
          'bundle_construction_failed', 'invalid_opinion_computed',
          -- 2A-5 codes (knowledge qualification)
          'missing_knowledge_governance', 'ambiguous_knowledge_governance',
          'predicate_version_unavailable', 'missing_opinion_lineage',
          'qualification_inputs_incomplete', 'prohibited_knowledge_claim',
          'qualification_computation_failed',
          -- 2A-6 codes (prediction / resolution / calibration)
          'insufficient_evidence', 'excluded_disposition', 'governance_context_missing',
          'knowledge_predicate_unavailable', 'insufficient_tip_count',
          'insufficient_calibration_sample', 'conflicting_evidence',
          'claim_falsifiability_undefined', 'missing_falsifiability_condition',
          'missing_prediction_governance', 'ambiguous_prediction_governance',
          'formation_rule_unavailable', 'prediction_already_exists',
          'resolution_computation_failed', 'missing_calibration_governance',
          'ambiguous_calibration_governance', 'calibration_metric_unavailable'
        )
      );
    END $$;
  `);

  // Extend refusal_stage CHECK similarly
  await db.execute(sql`
    DO $$
    BEGIN
      ALTER TABLE refusal_records DROP CONSTRAINT IF EXISTS refusal_records_refusal_stage_check;
    END $$;
  `).catch(() => {});
  await db.execute(sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.constraint_column_usage
        WHERE table_name='refusal_records' AND constraint_name='refusal_records_refusal_stage_check'
      ) THEN
        ALTER TABLE refusal_records ADD CONSTRAINT refusal_records_refusal_stage_check CHECK (
          refusal_stage IN (
            'evidence_ingestion','interpretation','weighting','opinion_formation',
            'knowledge_qualification','prediction_formation','prediction_resolution','calibration'
          )
        );
      END IF;
    END $$;
  `).catch(() => {
    logger.warn("[Build2A/6] refusal_records refusal_stage CHECK constraint skipped");
  });

  // ── Step 2: Prediction rule version tables ────────────────────────────────
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS prediction_formation_rule_versions (
      id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      implementation_key  TEXT NOT NULL UNIQUE,
      version_label    TEXT NOT NULL,
      description      TEXT,
      formula_spec     JSONB NOT NULL DEFAULT '{}',
      is_active        BOOLEAN NOT NULL DEFAULT true,
      approval_authority TEXT NOT NULL DEFAULT 'build2a_2a6_specification_v1',
      notes            TEXT,
      created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS prediction_classification_rule_versions (
      id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      implementation_key  TEXT NOT NULL UNIQUE,
      version_label    TEXT NOT NULL,
      description      TEXT,
      boundary_spec    JSONB NOT NULL DEFAULT '{}',
      is_active        BOOLEAN NOT NULL DEFAULT true,
      approval_authority TEXT NOT NULL DEFAULT 'build2a_2a6_specification_v1',
      notes            TEXT,
      created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS calibration_metric_set_versions (
      id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      implementation_key  TEXT NOT NULL UNIQUE,
      version_label    TEXT NOT NULL,
      description      TEXT,
      metric_spec      JSONB NOT NULL DEFAULT '{}',
      is_active        BOOLEAN NOT NULL DEFAULT true,
      approval_authority TEXT NOT NULL DEFAULT 'build2a_2a6_specification_v1',
      notes            TEXT,
      created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // ── Step 3: Governance context tables ─────────────────────────────────────
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS prediction_governance_contexts (
      id                                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      scope_type                            TEXT NOT NULL CHECK (scope_type IN ('behavioral_claim','domain_module')),
      domain_module_id                      UUID REFERENCES domain_modules(id),
      claim_id                              UUID REFERENCES behavioral_claims(id),
      prediction_formation_rule_version_id  UUID NOT NULL REFERENCES prediction_formation_rule_versions(id),
      prediction_classification_rule_version_id UUID NOT NULL REFERENCES prediction_classification_rule_versions(id),
      resolution_horizon_definition         JSONB NOT NULL DEFAULT '{}',
      approval_authority                    TEXT NOT NULL DEFAULT 'build2a_2a6_specification_v1',
      derivation_method                     TEXT NOT NULL DEFAULT 'seeded',
      effective_from                        TIMESTAMPTZ,
      effective_until                       TIMESTAMPTZ,
      version                               TEXT NOT NULL DEFAULT 'v1',
      supersedes                            UUID REFERENCES prediction_governance_contexts(id),
      notes                                 TEXT,
      created_at                            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT pgc_scope_claim_xor_domain CHECK (
        (scope_type = 'behavioral_claim' AND claim_id IS NOT NULL AND domain_module_id IS NULL)
        OR (scope_type = 'domain_module' AND domain_module_id IS NOT NULL AND claim_id IS NULL)
      )
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS calibration_governance_contexts (
      id                                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      scope_type                        TEXT NOT NULL CHECK (scope_type IN ('behavioral_claim','domain_module')),
      domain_module_id                  UUID REFERENCES domain_modules(id),
      claim_id                          UUID REFERENCES behavioral_claims(id),
      calibration_metric_set_version_id UUID NOT NULL REFERENCES calibration_metric_set_versions(id),
      minimum_calibration_sample_size   INTEGER NOT NULL DEFAULT 10,
      minimum_outcome_diversity         INTEGER,
      minimum_time_coverage_days        INTEGER,
      approval_authority                TEXT NOT NULL DEFAULT 'build2a_2a6_specification_v1',
      derivation_method                 TEXT NOT NULL DEFAULT 'seeded',
      effective_from                    TIMESTAMPTZ,
      effective_until                   TIMESTAMPTZ,
      version                           TEXT NOT NULL DEFAULT 'v1',
      supersedes                        UUID REFERENCES calibration_governance_contexts(id),
      notes                             TEXT,
      created_at                        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT cgc_scope_claim_xor_domain CHECK (
        (scope_type = 'behavioral_claim' AND claim_id IS NOT NULL AND domain_module_id IS NULL)
        OR (scope_type = 'domain_module' AND domain_module_id IS NOT NULL AND claim_id IS NULL)
      )
    )
  `);

  // ── Step 4: Behavioral predictions ───────────────────────────────────────
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS behavioral_predictions (
      id                                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      knowledge_record_id                      UUID NOT NULL REFERENCES knowledge_records(id),
      claim_id                                 UUID NOT NULL REFERENCES behavioral_claims(id),
      predicted_claim_statement                TEXT NOT NULL,
      falsifiability_condition                 TEXT NOT NULL,
      prediction_formation_rule_version_id     UUID NOT NULL REFERENCES prediction_formation_rule_versions(id),
      projected_probability                    NUMERIC(12,10) NOT NULL,
      prediction_classification_rule_version_id UUID NOT NULL REFERENCES prediction_classification_rule_versions(id),
      predicted_outcome_value                  BOOLEAN NOT NULL,
      horizon_start                            TIMESTAMPTZ,
      horizon_end                              TIMESTAMPTZ,
      prediction_governance_context_id         UUID REFERENCES prediction_governance_contexts(id),
      version_context_id                       TEXT,
      supersedes                               UUID REFERENCES behavioral_predictions(id),
      formation_timestamp                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      replay_checksum                          TEXT NOT NULL,
      created_at                               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT bp_probability_range CHECK (projected_probability >= 0 AND projected_probability <= 1),
      CONSTRAINT bp_horizon_order CHECK (horizon_end IS NULL OR horizon_start IS NULL OR horizon_end >= horizon_start)
    )
  `);

  // ── Step 5: Prediction outcomes ──────────────────────────────────────────
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS behavioral_prediction_outcomes (
      id                            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      prediction_id                 UUID NOT NULL REFERENCES behavioral_predictions(id),
      outcome_value                 BOOLEAN,
      outcome_observation_source    TEXT,
      evidence_source_registry_id   UUID REFERENCES evidence_source_registry(id),
      observed_at                   TIMESTAMPTZ,
      is_synthetic_canary_only      BOOLEAN NOT NULL DEFAULT false,
      notes                         TEXT,
      created_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // ── Step 6: Prediction resolutions ──────────────────────────────────────
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS behavioral_prediction_resolutions (
      id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      prediction_id                   UUID NOT NULL REFERENCES behavioral_predictions(id),
      outcome_id                      UUID REFERENCES behavioral_prediction_outcomes(id),
      resolution_classification       TEXT NOT NULL CHECK (
        resolution_classification IN ('correct','incorrect','unresolved','insufficient_evidence')
      ),
      calibration_error_contribution  NUMERIC(20,16),
      resolved_at                     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      version_context_id              TEXT,
      resolution_timestamp            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      replay_checksum                 TEXT NOT NULL,
      created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (prediction_id),
      CONSTRAINT bpr_correct_requires_outcome CHECK (
        resolution_classification NOT IN ('correct','incorrect') OR outcome_id IS NOT NULL
      ),
      CONSTRAINT bpr_calibration_error_contrib CHECK (
        calibration_error_contribution IS NULL OR (
          calibration_error_contribution >= 0 AND calibration_error_contribution <= 1
        )
      )
    )
  `);

  // ── Step 7: Calibration runs and metrics ─────────────────────────────────
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS calibration_runs (
      id                                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      scope                               TEXT NOT NULL,
      calibration_metric_set_version_id   UUID NOT NULL REFERENCES calibration_metric_set_versions(id),
      calibration_governance_context_id   UUID REFERENCES calibration_governance_contexts(id),
      sample_size                         INTEGER NOT NULL,
      included_resolution_count           INTEGER NOT NULL DEFAULT 0,
      excluded_resolution_count           INTEGER NOT NULL DEFAULT 0,
      exclusion_reason_breakdown          JSONB NOT NULL DEFAULT '{}',
      observed_outcome_diversity_count    INTEGER,
      observed_outcome_zero_count         INTEGER,
      observed_outcome_one_count          INTEGER,
      earliest_included_resolution_at     TIMESTAMPTZ,
      latest_included_resolution_at       TIMESTAMPTZ,
      observed_time_coverage_days         NUMERIC(8,2),
      run_timestamp                       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      version_context_id                  TEXT,
      created_at                          TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS calibration_metrics (
      id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      calibration_run_id  UUID NOT NULL REFERENCES calibration_runs(id),
      metric_name         TEXT NOT NULL,
      metric_value        NUMERIC(16,10) NOT NULL,
      bin_detail          JSONB NOT NULL DEFAULT '{}',
      created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // ── Step 8: Ledger tables ────────────────────────────────────────────────
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS prediction_formation_ledger (
      id                                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      knowledge_record_id                  UUID NOT NULL REFERENCES knowledge_records(id),
      prediction_formation_rule_version_id UUID NOT NULL REFERENCES prediction_formation_rule_versions(id),
      status                               TEXT NOT NULL DEFAULT 'pending'
                                             CHECK (status IN ('pending','processing','succeeded','failed','refused')),
      attempts                             INTEGER NOT NULL DEFAULT 0,
      first_seen_at                        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_attempted_at                    TIMESTAMPTZ,
      completed_at                         TIMESTAMPTZ,
      resulting_prediction_id              UUID REFERENCES behavioral_predictions(id),
      resulting_refusal_id                 UUID,
      errors                               JSONB NOT NULL DEFAULT '[]',
      UNIQUE (knowledge_record_id, prediction_formation_rule_version_id)
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS prediction_resolution_ledger (
      id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      prediction_id           UUID NOT NULL REFERENCES behavioral_predictions(id),
      status                  TEXT NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending','processing','succeeded','failed','refused')),
      attempts                INTEGER NOT NULL DEFAULT 0,
      first_seen_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_attempted_at       TIMESTAMPTZ,
      completed_at            TIMESTAMPTZ,
      resulting_resolution_id UUID REFERENCES behavioral_prediction_resolutions(id),
      resulting_refusal_id    UUID,
      errors                  JSONB NOT NULL DEFAULT '[]',
      UNIQUE (prediction_id)
    )
  `);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS calibration_ledger (
      id                                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      scope                             TEXT NOT NULL,
      calibration_governance_context_id UUID REFERENCES calibration_governance_contexts(id),
      idempotency_key                   TEXT NOT NULL,
      status                            TEXT NOT NULL DEFAULT 'pending'
                                          CHECK (status IN ('pending','processing','succeeded','failed','refused')),
      attempts                          INTEGER NOT NULL DEFAULT 0,
      first_seen_at                     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_attempted_at                 TIMESTAMPTZ,
      completed_at                      TIMESTAMPTZ,
      resulting_calibration_run_id      UUID REFERENCES calibration_runs(id),
      resulting_refusal_id              UUID,
      errors                            JSONB NOT NULL DEFAULT '[]',
      UNIQUE (calibration_governance_context_id, idempotency_key)
    )
  `);

  // ── Step 9: Chain-tip views ───────────────────────────────────────────────
  await db.execute(sql`
    CREATE OR REPLACE VIEW latest_prediction_governance_context_v AS
    SELECT pgc.* FROM prediction_governance_contexts pgc
    WHERE NOT EXISTS (
      SELECT 1 FROM prediction_governance_contexts newer
      WHERE newer.supersedes = pgc.id
    )
  `);

  await db.execute(sql`
    CREATE OR REPLACE VIEW latest_calibration_governance_context_v AS
    SELECT cgc.* FROM calibration_governance_contexts cgc
    WHERE NOT EXISTS (
      SELECT 1 FROM calibration_governance_contexts newer
      WHERE newer.supersedes = cgc.id
    )
  `);

  await db.execute(sql`
    CREATE OR REPLACE VIEW prediction_calibration_summary_v AS
    SELECT
      bp.id AS prediction_id,
      bp.claim_id,
      bp.projected_probability,
      bp.predicted_outcome_value,
      bp.horizon_start,
      bp.horizon_end,
      bpr.resolution_classification,
      bpr.calibration_error_contribution,
      bpr.resolved_at,
      cr.id AS calibration_run_id,
      cm.metric_value AS brier_score
    FROM behavioral_predictions bp
    LEFT JOIN behavioral_prediction_resolutions bpr ON bpr.prediction_id = bp.id
    LEFT JOIN calibration_metrics cm ON cm.calibration_run_id IS NOT NULL
    LEFT JOIN calibration_runs cr ON cr.id = cm.calibration_run_id
  `);

  // ── Step 10: Immutability triggers on Tier 1 tables ──────────────────────
  // Reuses build2a_block_all_mutations_fn() defined in Package 2A-1.
  for (const tbl of [
    "behavioral_predictions",
    "behavioral_prediction_resolutions",
    "calibration_runs",
    "calibration_metrics",
  ]) {
    const trigName = `build2a_no_update_${tbl}`;
    await db.execute(sql.raw(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.triggers
          WHERE trigger_name = '${trigName}' AND event_object_table = '${tbl}'
        ) THEN
          CREATE TRIGGER ${trigName}
          BEFORE UPDATE OR DELETE ON ${tbl}
          FOR EACH ROW EXECUTE FUNCTION build2a_block_all_mutations_fn();
        END IF;
      END $$;
    `));
  }

  // ── Step 11: Seeds ────────────────────────────────────────────────────────
  // formation rule: knowledge_persistence_forecast_v1
  await db.execute(sql`
    INSERT INTO prediction_formation_rule_versions
      (implementation_key, version_label, description, formula_spec, approval_authority, notes)
    VALUES (
      'knowledge_persistence_forecast_v1', 'v1.0',
      'Forecasts future behavioral probability as identical to current knowledge belief projection. Formula: P_future = P_current = belief + base_rate * uncertainty.',
      '{"formula": "belief + base_rate * uncertainty", "momentum_component": "none", "trajectory_deferred": "Build 3"}'::jsonb,
      'build2a_2a6_specification_v1',
      'Approved in 2A-6 spec. EXPERIMENTAL/CANARY-ONLY. No momentum component by design; Build 3 (Trajectory) deferred.'
    )
    ON CONFLICT (implementation_key) DO NOTHING
  `);

  // classification rule: binary_more_likely_than_not_v1
  await db.execute(sql`
    INSERT INTO prediction_classification_rule_versions
      (implementation_key, version_label, description, boundary_spec, approval_authority, notes)
    VALUES (
      'binary_more_likely_than_not_v1', 'v1.0',
      'Binary classification: predicted_outcome_value = (projected_probability >= 0.50). p=0.50 boundary maps to true.',
      '{"boundary": 0.50, "boundary_maps_to": true, "type": "binary"}'::jsonb,
      'build2a_2a6_specification_v1',
      'EXPERIMENTAL/CANARY-ONLY. Deterministic boundary: no tie-breaking rules required.'
    )
    ON CONFLICT (implementation_key) DO NOTHING
  `);

  // calibration metric set: brier_score_v1
  await db.execute(sql`
    INSERT INTO calibration_metric_set_versions
      (implementation_key, version_label, description, metric_spec, approval_authority, notes)
    VALUES (
      'brier_score_v1', 'v1.0',
      'Brier score: mean((projected_probability - outcome_value)^2). Binary outcomes only. Derived from outcome_value, never from resolution_classification.',
      '{"formula": "mean((p - y)^2)", "scope": "binary", "y_source": "outcome_value", "minimum_sample_size": 10}'::jsonb,
      'build2a_2a6_specification_v1',
      'EXPERIMENTAL/CANARY-ONLY. y=outcome_value (NOT resolution_classification). minimum_outcome_diversity and minimum_time_coverage_days are NOT active numeric gates in v1.'
    )
    ON CONFLICT (implementation_key) DO NOTHING
  `);

  logger.info("[Build2A/6] Package 2A-6 schema migration complete");
}
