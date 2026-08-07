/**
 * Build 2A — Database Migrations (Package 2A-5: Knowledge Qualification)
 *
 * Creates all Package 2A-5 tables, views, triggers, indexes, and seed data.
 * Must run AFTER Packages 2A-1 through 2A-4 are confirmed ready.
 *
 * Tables created (all new — no existing Tier 1 tables modified):
 *   Tier 1 (fully immutable, UPDATE+DELETE trigger-blocked):
 *     - knowledge_qualification_governance_contexts
 *     - knowledge_qualification_runs
 *     - knowledge_qualification_factor_results
 *     - knowledge_records
 *   Operational (DELETE blocked, lifecycle-controlled):
 *     - knowledge_qualification_ledger
 *
 * Views created:
 *   - latest_knowledge_qualification_governance_context_v
 *   - latest_knowledge_record_v
 *
 * Additive extension to locked 2A-4 refusal_records reason_code CHECK:
 *   Adds 7 knowledge-stage reason codes. No existing codes removed.
 *
 * Predicate seed:
 *   - agent_task_completion_sufficiency_v1 → knowledge_sufficiency_predicate_versions
 *
 * Governance seed:
 *   - Domain-level (agent_instrumentation), EXPERIMENTAL/CANARY-ONLY
 *
 * Immutability matrix (Package 2A-5):
 *   Tier 1: knowledge_qualification_governance_contexts, knowledge_qualification_runs,
 *            knowledge_qualification_factor_results, knowledge_records
 *   Operational: knowledge_qualification_ledger (DELETE blocked, lifecycle-controlled)
 *
 * ADDITIVE-ONLY: zero ALTER TABLE on any 2A-1 through 2A-4 table.
 * Exception: refusal_records reason_code CHECK is extended additively (2A-4 established pattern).
 */

import { sql } from "drizzle-orm";
import { logger } from "../../lib/logger.js";

export async function ensureBuild2a5Tables(): Promise<void> {
  const { db } = await import("@workspace/db");

  logger.info("[Build2A] Running Package 2A-5 schema migrations…");

  // ── 1. knowledge_qualification_governance_contexts ─────────────────────────
  // Tier 1: fully immutable after insert. Supplies all factor thresholds and
  // policy decisions that the qualification service reads at evaluation time.
  // NEVER invents thresholds at runtime — they must come from this table.
  //
  // Resolution order (enforced in application code, not in DB):
  //   1. Claim-level (scope_type='behavioral_claim', matching claim_id)
  //   2. Domain-level (scope_type='domain_module', matching domain_module_id)
  //   3. Neither → refuse with missing_knowledge_governance
  //
  // Multiple chain-tip rows at the same specificity level → refuse with
  // ambiguous_knowledge_governance. NEVER use ORDER BY timestamp/UUID/version alone.
  //
  // minimum_integrity_score and misleading_evidence_hold store
  // 'NOT_APPLICABLE/NOT_YET_CALIBRATED' as explicit text — never a number.
  // base_rate_validity_required stores the required sufficiency_status string ('sufficient').
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS knowledge_qualification_governance_contexts (
      id                                          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      scope_type                                  TEXT        NOT NULL,
      domain_module_id                            UUID        REFERENCES domain_modules(id),
      claim_id                                    UUID        REFERENCES behavioral_claims(id),
      knowledge_sufficiency_predicate_version_id  UUID        NOT NULL REFERENCES knowledge_sufficiency_predicate_versions(id),
      -- Factor thresholds (individual columns for query and audit clarity)
      uncertainty_threshold                       NUMERIC(5,4) NOT NULL,
      minimum_evidence_quantity                   INTEGER     NOT NULL,
      minimum_effective_weight                    NUMERIC(10,4) NOT NULL,
      minimum_source_coverage                     INTEGER     NOT NULL,
      minimum_context_coverage_days               NUMERIC(10,4) NOT NULL,
      minimum_independent_contribution_count      INTEGER     NOT NULL,
      conflict_tolerance                          NUMERIC(5,4) NOT NULL,
      base_rate_validity_required                 TEXT        NOT NULL,
      minimum_integrity_score                     TEXT        NOT NULL,
      misleading_evidence_hold                    TEXT        NOT NULL,
      -- Governance metadata
      approval_authority                          TEXT        NOT NULL,
      derivation_method                           TEXT        NOT NULL,
      effective_from                              TIMESTAMPTZ,
      effective_until                             TIMESTAMPTZ,
      version                                     TEXT        NOT NULL,
      supersedes                                  UUID        REFERENCES knowledge_qualification_governance_contexts(id),
      notes                                       TEXT,
      created_at                                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CHECK (scope_type IN ('behavioral_claim', 'domain_module')),
      CHECK (
        (scope_type = 'domain_module'    AND domain_module_id IS NOT NULL AND claim_id IS NULL) OR
        (scope_type = 'behavioral_claim' AND claim_id IS NOT NULL AND domain_module_id IS NULL)
      ),
      CHECK (uncertainty_threshold >= 0 AND uncertainty_threshold <= 1),
      CHECK (minimum_evidence_quantity >= 1),
      CHECK (minimum_effective_weight >= 0),
      CHECK (minimum_source_coverage >= 0),
      CHECK (minimum_context_coverage_days >= 0),
      CHECK (minimum_independent_contribution_count >= 0),
      CHECK (conflict_tolerance >= 0 AND conflict_tolerance <= 1),
      CHECK (base_rate_validity_required IN ('sufficient'))
    )
  `);

  // ── 2. knowledge_qualification_runs ───────────────────────────────────────
  // Tier 1: fully immutable. Records the result of one qualification evaluation.
  // outcome CHECK: only 'knowledge' | 'insufficient' | 'indeterminate'.
  // 'refused' is NOT an outcome — pre-evaluation refusals are recorded in
  // refusal_records only and never produce a run row.
  //
  // evaluation_timestamp: the wall-clock time AT which evaluation occurred.
  //   Must be included in replay_checksum so replays at different times
  //   use the historical timestamp, not the current one.
  // replay_checksum: SHA-256 over all deterministic inputs (see knowledgeQualification.ts).
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS knowledge_qualification_runs (
      id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      opinion_id            UUID        NOT NULL REFERENCES opinions(id),
      predicate_version_id  UUID        NOT NULL REFERENCES knowledge_sufficiency_predicate_versions(id),
      governance_context_id UUID        NOT NULL REFERENCES knowledge_qualification_governance_contexts(id),
      version_context_id    UUID        REFERENCES version_contexts(id),
      outcome               TEXT        NOT NULL,
      evaluation_timestamp  TIMESTAMPTZ NOT NULL,
      replay_checksum       TEXT        NOT NULL,
      created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CHECK (outcome IN ('knowledge', 'insufficient', 'indeterminate'))
    )
  `);

  // ── 3. knowledge_qualification_factor_results ──────────────────────────────
  // Tier 1: fully immutable. One row per (run, factor_name).
  // UNIQUE (run_id, factor_name) enforces complete factor set per run.
  //
  // factor_result CHECK: 'pass' | 'fail' | 'not_applicable' | 'indeterminate'
  //
  // threshold_value: NULL for not_applicable factors (no threshold applies).
  // observed_value:  NULL for not_applicable or when data was genuinely missing.
  // factor_detail:   JSONB — for misleading_evidence_hold: always records all four
  //   concern values (manipulation_concern, duplication_concern, circular_concern,
  //   synthetic_concern) even though factor_result='not_applicable'.
  //
  // NOTE: 'not_applicable' factors are NEVER counted as pass in outcome determination.
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS knowledge_qualification_factor_results (
      id               UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
      run_id           UUID    NOT NULL REFERENCES knowledge_qualification_runs(id),
      factor_name      TEXT    NOT NULL,
      factor_result    TEXT    NOT NULL,
      threshold_value  JSONB,
      observed_value   JSONB,
      factor_detail    JSONB   NOT NULL DEFAULT '{}',
      created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (run_id, factor_name),
      CHECK (factor_result IN ('pass', 'fail', 'not_applicable', 'indeterminate'))
    )
  `);

  // ── 4. knowledge_records ──────────────────────────────────────────────────
  // Tier 1: fully immutable. Created ONLY when qualification run outcome='knowledge'.
  // Invariant: NO knowledge_records row for runs with outcome='insufficient' or 'indeterminate'.
  // UNIQUE (run_id): exactly one record per successful run.
  //
  // claim_id is denormalized from opinion (via opinion.claim_id) for direct FK.
  // Backward supersession via supersedes — the prior record row is unchanged.
  // latest_knowledge_record_v (chain-tip view) returns only the current record.
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS knowledge_records (
      id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      opinion_id            UUID        NOT NULL REFERENCES opinions(id),
      run_id                UUID        NOT NULL UNIQUE REFERENCES knowledge_qualification_runs(id),
      claim_id              UUID        NOT NULL REFERENCES behavioral_claims(id),
      knowledge_at          TIMESTAMPTZ NOT NULL,
      predicate_version_id  UUID        NOT NULL REFERENCES knowledge_sufficiency_predicate_versions(id),
      governance_context_id UUID        NOT NULL REFERENCES knowledge_qualification_governance_contexts(id),
      version_context_id    UUID        REFERENCES version_contexts(id),
      supersedes            UUID        REFERENCES knowledge_records(id),
      created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // ── 5. knowledge_qualification_ledger ─────────────────────────────────────
  // Operational processing ledger. Mirrors opinion_formation_ledger architecture.
  // Idempotency key: (opinion_id, predicate_version_id).
  // DELETE blocked; identity fields frozen; status lifecycle enforced by trigger.
  //
  // Terminal statuses: succeeded (=knowledge produced), insufficient, indeterminate, refused.
  // Pre-evaluation refusals: resulting_refusal_id set, no resulting_run_id.
  // Post-evaluation non-knowledge: resulting_run_id set, no resulting_refusal_id.
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS knowledge_qualification_ledger (
      id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      opinion_id           UUID        NOT NULL REFERENCES opinions(id),
      predicate_version_id UUID        NOT NULL REFERENCES knowledge_sufficiency_predicate_versions(id),
      status               TEXT        NOT NULL DEFAULT 'pending',
      attempts             INTEGER     NOT NULL DEFAULT 0,
      first_seen_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_attempted_at    TIMESTAMPTZ,
      completed_at         TIMESTAMPTZ,
      resulting_run_id     UUID        REFERENCES knowledge_qualification_runs(id),
      resulting_refusal_id UUID        REFERENCES refusal_records(id),
      errors               JSONB       NOT NULL DEFAULT '[]',
      UNIQUE (opinion_id, predicate_version_id),
      CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'refused', 'insufficient', 'indeterminate'))
    )
  `);

  // ── 6. Extend refusal_records reason_code CHECK (additive only) ───────────
  // Adds 7 knowledge-stage reason codes. No existing codes removed or altered.
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

      -- SENTINEL GUARD: if the constraint already contains 'missing_knowledge_governance'
      -- (a 2A-5-specific code), the 2A-5 extension has already been applied — skip.
      IF v_constraint_def IS NOT NULL AND v_constraint_def LIKE '%missing_knowledge_governance%' THEN
        RETURN; -- already extended to 2A-5 level; skip to avoid redundant DROP+ADD
      END IF;

      IF v_constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE refusal_records DROP CONSTRAINT ' || quote_ident(v_constraint_name);
      END IF;

      ALTER TABLE refusal_records
        ADD CONSTRAINT refusal_records_reason_code_check
        CHECK (reason_code IN (
          'no_matching_claim', 'unregistered_source', 'source_not_eligible',
          'revoked_source_eligibility', 'primitive_mismatch',
          'incomplete_bounded_cluster', 'ambiguous_interpretation',
          'prohibited_inference', 'invalid_or_unavailable_version',
          'source_attribution_failed', 'processing_failure',
          'missing_integrity_context', 'missing_quality_context',
          'invalid_integrity_score', 'invalid_quality_component',
          'invalid_or_unavailable_weighting_version', 'unsupported_weighting_rule',
          'source_integrity_unresolved', 'quality_inputs_incomplete',
          'weighting_computation_failed',
          'missing_base_rate', 'ambiguous_base_rate_governance',
          'missing_conflict_threshold_governance',
          'bundle_construction_failed', 'invalid_opinion_computed',
          'missing_knowledge_governance', 'ambiguous_knowledge_governance',
          'predicate_version_unavailable', 'missing_opinion_lineage',
          'qualification_inputs_incomplete', 'prohibited_knowledge_claim',
          'qualification_computation_failed'
        ));
    END;
    $$
  `);

  // ── 7. Views ───────────────────────────────────────────────────────────────

  // latest_knowledge_qualification_governance_context_v:
  // Chain-tip governance contexts — rows NOT referenced by a newer row's supersedes.
  // Application code enforces claim-level precedence over domain-level;
  // this view returns ALL chain-tip rows for all scopes.
  await db.execute(sql`
    CREATE OR REPLACE VIEW latest_knowledge_qualification_governance_context_v AS
    SELECT kqgc.*
    FROM knowledge_qualification_governance_contexts kqgc
    WHERE NOT EXISTS (
      SELECT 1 FROM knowledge_qualification_governance_contexts newer
      WHERE newer.supersedes = kqgc.id
    )
  `);

  // latest_knowledge_record_v:
  // Chain-tip knowledge records — the current (non-superseded) record per opinion.
  await db.execute(sql`
    CREATE OR REPLACE VIEW latest_knowledge_record_v AS
    SELECT kr.*
    FROM knowledge_records kr
    WHERE NOT EXISTS (
      SELECT 1 FROM knowledge_records newer
      WHERE newer.supersedes = kr.id
    )
  `);

  // ── 8. Trigger functions ───────────────────────────────────────────────────

  // knowledge_qualification_ledger lifecycle:
  // DELETE blocked; identity frozen; status transitions enforced.
  await db.execute(sql`
    CREATE OR REPLACE FUNCTION build2a_kq_ledger_lifecycle_fn()
    RETURNS TRIGGER LANGUAGE plpgsql AS $$
    BEGIN
      IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION '[Build2A/5] knowledge_qualification_ledger DELETE is blocked. Ledger records are permanent.';
      END IF;
      -- Identity freeze
      IF NEW.id IS DISTINCT FROM OLD.id
         OR NEW.opinion_id IS DISTINCT FROM OLD.opinion_id
         OR NEW.predicate_version_id IS DISTINCT FROM OLD.predicate_version_id
         OR NEW.first_seen_at IS DISTINCT FROM OLD.first_seen_at
      THEN
        RAISE EXCEPTION '[Build2A/5] knowledge_qualification_ledger identity fields (id, opinion_id, predicate_version_id, first_seen_at) are frozen.';
      END IF;
      -- Status lifecycle enforcement
      IF OLD.status = NEW.status THEN
        NULL; -- no-op update OK
      ELSIF OLD.status = 'pending' AND NEW.status = 'processing' THEN
        NULL;
      ELSIF OLD.status = 'processing' AND NEW.status IN ('succeeded', 'failed', 'refused', 'insufficient', 'indeterminate') THEN
        NULL;
      ELSIF OLD.status = 'failed' AND NEW.status = 'processing' THEN
        NULL; -- retry
      ELSIF OLD.status IN ('succeeded', 'refused', 'insufficient', 'indeterminate') THEN
        RAISE EXCEPTION '[Build2A/5] knowledge_qualification_ledger: record % is in terminal status ''%'' — no further transitions.',
          OLD.id, OLD.status;
      ELSE
        RAISE EXCEPTION '[Build2A/5] knowledge_qualification_ledger: illegal transition ''%'' -> ''%'' for record %.',
          OLD.status, NEW.status, OLD.id;
      END IF;
      RETURN NEW;
    END;
    $$
  `);

  // ── 9. Mount triggers ──────────────────────────────────────────────────────

  // knowledge_qualification_ledger lifecycle
  await db.execute(sql`DROP TRIGGER IF EXISTS build2a_kq_ledger_lifecycle ON knowledge_qualification_ledger`);
  await db.execute(sql`
    CREATE TRIGGER build2a_kq_ledger_lifecycle
    BEFORE UPDATE OR DELETE ON knowledge_qualification_ledger
    FOR EACH ROW EXECUTE FUNCTION build2a_kq_ledger_lifecycle_fn()
  `);

  // knowledge_qualification_governance_contexts: Tier 1
  await db.execute(sql`DROP TRIGGER IF EXISTS build2a_no_update_kq_governance_contexts ON knowledge_qualification_governance_contexts`);
  await db.execute(sql`
    CREATE TRIGGER build2a_no_update_kq_governance_contexts
    BEFORE UPDATE ON knowledge_qualification_governance_contexts
    FOR EACH ROW EXECUTE FUNCTION build2a_block_all_mutations_fn()
  `);
  await db.execute(sql`DROP TRIGGER IF EXISTS build2a_no_delete_kq_governance_contexts ON knowledge_qualification_governance_contexts`);
  await db.execute(sql`
    CREATE TRIGGER build2a_no_delete_kq_governance_contexts
    BEFORE DELETE ON knowledge_qualification_governance_contexts
    FOR EACH ROW EXECUTE FUNCTION build2a_block_all_mutations_fn()
  `);

  // knowledge_qualification_runs: Tier 1
  await db.execute(sql`DROP TRIGGER IF EXISTS build2a_no_update_kq_runs ON knowledge_qualification_runs`);
  await db.execute(sql`
    CREATE TRIGGER build2a_no_update_kq_runs
    BEFORE UPDATE ON knowledge_qualification_runs
    FOR EACH ROW EXECUTE FUNCTION build2a_block_all_mutations_fn()
  `);
  await db.execute(sql`DROP TRIGGER IF EXISTS build2a_no_delete_kq_runs ON knowledge_qualification_runs`);
  await db.execute(sql`
    CREATE TRIGGER build2a_no_delete_kq_runs
    BEFORE DELETE ON knowledge_qualification_runs
    FOR EACH ROW EXECUTE FUNCTION build2a_block_all_mutations_fn()
  `);

  // knowledge_qualification_factor_results: Tier 1
  await db.execute(sql`DROP TRIGGER IF EXISTS build2a_no_update_kq_factor_results ON knowledge_qualification_factor_results`);
  await db.execute(sql`
    CREATE TRIGGER build2a_no_update_kq_factor_results
    BEFORE UPDATE ON knowledge_qualification_factor_results
    FOR EACH ROW EXECUTE FUNCTION build2a_block_all_mutations_fn()
  `);
  await db.execute(sql`DROP TRIGGER IF EXISTS build2a_no_delete_kq_factor_results ON knowledge_qualification_factor_results`);
  await db.execute(sql`
    CREATE TRIGGER build2a_no_delete_kq_factor_results
    BEFORE DELETE ON knowledge_qualification_factor_results
    FOR EACH ROW EXECUTE FUNCTION build2a_block_all_mutations_fn()
  `);

  // knowledge_records: Tier 1
  await db.execute(sql`DROP TRIGGER IF EXISTS build2a_no_update_knowledge_records ON knowledge_records`);
  await db.execute(sql`
    CREATE TRIGGER build2a_no_update_knowledge_records
    BEFORE UPDATE ON knowledge_records
    FOR EACH ROW EXECUTE FUNCTION build2a_block_all_mutations_fn()
  `);
  await db.execute(sql`DROP TRIGGER IF EXISTS build2a_no_delete_knowledge_records ON knowledge_records`);
  await db.execute(sql`
    CREATE TRIGGER build2a_no_delete_knowledge_records
    BEFORE DELETE ON knowledge_records
    FOR EACH ROW EXECUTE FUNCTION build2a_block_all_mutations_fn()
  `);

  // ── 10. Indexes ────────────────────────────────────────────────────────────

  // knowledge_qualification_governance_contexts
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_kqgc_scope_domain   ON knowledge_qualification_governance_contexts (scope_type, domain_module_id) WHERE scope_type = 'domain_module'`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_kqgc_scope_claim    ON knowledge_qualification_governance_contexts (scope_type, claim_id) WHERE scope_type = 'behavioral_claim'`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_kqgc_predicate      ON knowledge_qualification_governance_contexts (knowledge_sufficiency_predicate_version_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_kqgc_supersedes     ON knowledge_qualification_governance_contexts (supersedes)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_kqgc_effective      ON knowledge_qualification_governance_contexts (effective_from, effective_until)`);

  // knowledge_qualification_runs
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_kqr_opinion         ON knowledge_qualification_runs (opinion_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_kqr_predicate       ON knowledge_qualification_runs (predicate_version_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_kqr_governance      ON knowledge_qualification_runs (governance_context_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_kqr_outcome         ON knowledge_qualification_runs (outcome)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_kqr_checksum        ON knowledge_qualification_runs (replay_checksum)`);

  // knowledge_qualification_factor_results
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_kqfr_run            ON knowledge_qualification_factor_results (run_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_kqfr_factor_name    ON knowledge_qualification_factor_results (factor_name, factor_result)`);

  // knowledge_records
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_kr_opinion          ON knowledge_records (opinion_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_kr_claim            ON knowledge_records (claim_id, knowledge_at)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_kr_predicate        ON knowledge_records (predicate_version_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_kr_supersedes       ON knowledge_records (supersedes)`);

  // knowledge_qualification_ledger
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_kql_status          ON knowledge_qualification_ledger (status)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_kql_opinion_status  ON knowledge_qualification_ledger (opinion_id, status)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_kql_status_retry    ON knowledge_qualification_ledger (status, attempts)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_kql_first_seen      ON knowledge_qualification_ledger (first_seen_at)`);

  // ── 11. Seeds — Predicate version ─────────────────────────────────────────
  //
  // Seed agent_task_completion_sufficiency_v1 into knowledge_sufficiency_predicate_versions.
  // This row defines WHICH factors exist, their ordering, required vs not-applicable
  // behavior, and deterministic evaluation rules.
  // Domain scope does NOT belong here — that belongs in governance contexts.
  // The predicate_expression field holds the human-readable factor specification.
  // The parameters field holds the machine-readable factor definitions (ordered).
  await db.execute(sql`
    INSERT INTO knowledge_sufficiency_predicate_versions
      (implementation_key, version_label, is_active, replayable_for_history,
       predicate_expression, parameters)
    VALUES (
      'agent_task_completion_sufficiency_v1',
      'v1.0',
      true,
      true,
      'Ten-factor knowledge sufficiency predicate for agent task completion behavioral claims. Factors 1-8 are required and measurable. Factors 9-10 (minimum_integrity_score, misleading_evidence_hold) are NOT_APPLICABLE/NOT_YET_CALIBRATED and must never be counted as pass in outcome determination. All factor inputs are read from stored immutable Opinion lineage only — no recomputation of fusion, base rate, or weighting. Outcome = knowledge iff all required applicable factors pass and none are indeterminate.',
      ${{
        predicate_version: "agent_task_completion_sufficiency_v1 / v1.0",
        evaluation_order: "factors_are_evaluated_in_the_order_listed_below",
        factors: [
          {
            name: "uncertainty_threshold",
            required: true,
            not_applicable: false,
            input_source: "opinions.uncertainty",
            comparison: "observed <= threshold",
            description: "SL opinion uncertainty mass must be at or below the governance threshold.",
          },
          {
            name: "minimum_evidence_quantity",
            required: true,
            not_applicable: false,
            input_source: "COUNT(evidence_bundle_members WHERE bundle_id = opinion.evidence_bundle_id)",
            comparison: "observed >= threshold",
            description: "Number of evidence atoms in the opinion bundle must meet or exceed minimum.",
          },
          {
            name: "minimum_effective_weight",
            required: true,
            not_applicable: false,
            input_source: "SUM(weighted_evidence_contributions.final_effective_weight) for bundle members",
            comparison: "observed >= threshold",
            description: "Total effective weight of all bundle members must meet or exceed minimum.",
          },
          {
            name: "minimum_source_coverage",
            required: true,
            not_applicable: false,
            experimental: "EXPERIMENTAL_NON_DISCRIMINATING",
            input_source: "COUNT(DISTINCT evidence_atom_observation_links.evidence_source_registry_id) via atoms -> cluster -> links",
            comparison: "observed >= threshold",
            description: "Number of distinct evidence sources represented in the bundle.",
          },
          {
            name: "minimum_context_coverage_days",
            required: true,
            not_applicable: false,
            experimental: "EXPERIMENTAL_NON_DISCRIMINATING",
            input_source: "SPAN_DAYS(MIN(iea.effective_at), MAX(iea.effective_at)) for bundle members",
            comparison: "observed >= threshold",
            description: "Time span (days) between earliest and latest atom effective_at in the bundle.",
          },
          {
            name: "minimum_independent_contribution_count",
            required: true,
            not_applicable: false,
            input_source: "reasoning_traces.independent_contribution_count",
            comparison: "observed >= threshold",
            description: "Number of independent (non-dependent) evidence contributions as recorded in the reasoning trace.",
          },
          {
            name: "conflict_tolerance",
            required: true,
            not_applicable: false,
            input_source: "fusion_contexts.conflict_measure (stored value — never recomputed)",
            comparison: "observed <= threshold OR observed IS NULL (null = no conflict detected = pass)",
            description: "Maximum pairwise SL conflict in the bundle must not exceed the tolerance. NULL conflict (single atom or no conflict measured) passes.",
          },
          {
            name: "base_rate_validity",
            required: true,
            not_applicable: false,
            input_source: "base_rate_records.sufficiency_status WHERE id = opinions.base_rate_record_id",
            comparison: "observed == governance.base_rate_validity_required (='sufficient')",
            description: "The base rate record referenced by the opinion must have sufficiency_status='sufficient'. Provisional or provisional_unknown base rates fail.",
          },
          {
            name: "minimum_integrity_score",
            required: false,
            not_applicable: true,
            not_applicable_reason: "NOT_APPLICABLE/NOT_YET_CALIBRATED — no empirically validated integrity threshold exists for this predicate version. This factor must never be counted as pass. factor_result must always be 'not_applicable'.",
            input_source: "NOT_APPLICABLE",
            description: "Integrity score threshold is not yet calibrated. Factor is permanently not_applicable for v1.0.",
          },
          {
            name: "misleading_evidence_hold",
            required: false,
            not_applicable: true,
            not_applicable_reason: "NOT_APPLICABLE/NOT_YET_CALIBRATED — no calibrated hold policy exists. factor_result must always be 'not_applicable'. However, factor_detail MUST record all four concern values from every integrity_context in the bundle for visibility and future calibration.",
            concern_columns: ["manipulation_concern", "duplication_concern", "circular_concern", "synthetic_concern"],
            input_source: "integrity_contexts.{manipulation_concern,duplication_concern,circular_concern,synthetic_concern} via weighted_evidence_contributions.integrity_context_id",
            description: "Misleading evidence hold is not yet calibrated. Always not_applicable but concern values must be recorded in factor_detail.",
          },
        ],
        outcome_logic: {
          knowledge: "All required applicable factors pass AND none are indeterminate",
          insufficient: "Evaluation completed AND one or more required measurable factors fail (no indeterminate among required)",
          indeterminate: "One or more required factors cannot be resolved from preserved data",
          refused: "Pre-evaluation halted — missing/ambiguous governance, unavailable predicate, invalid opinion lineage → refusal_records only, no run row created",
        },
        not_applicable_rule: "Factors with not_applicable=true are NEVER counted as pass. They are recorded as factor_result='not_applicable' but excluded from outcome determination.",
        atomicity_rule: "Run + factor_results + knowledge_record (if outcome=knowledge) must all succeed or all rollback. No partial state.",
        replay_rule: "Historical replay must use historical opinion/predicate/governance/version_context/evaluation_timestamp — never current ones.",
      }}::jsonb
    )
    ON CONFLICT (implementation_key) DO NOTHING
  `);

  // ── 12. Seeds — Governance context ────────────────────────────────────────
  //
  // Domain-level governance context for agent_instrumentation.
  // EXPERIMENTAL/CANARY-ONLY: thresholds are approved computational priors for
  // pipeline validation, NOT empirically calibrated behavioral thresholds.
  // Authorized by Founder/Architecture Review 2026-08-07.
  await db.execute(sql`
    DO $$
    DECLARE
      v_domain_id   UUID;
      v_pred_id     UUID;
    BEGIN
      SELECT id INTO v_domain_id FROM domain_modules WHERE slug = 'agent_instrumentation' LIMIT 1;
      SELECT id INTO v_pred_id   FROM knowledge_sufficiency_predicate_versions
        WHERE implementation_key = 'agent_task_completion_sufficiency_v1' LIMIT 1;

      IF v_domain_id IS NULL THEN
        RAISE EXCEPTION '[Build2A/5] domain_modules seed missing: agent_instrumentation not found';
      END IF;
      IF v_pred_id IS NULL THEN
        RAISE EXCEPTION '[Build2A/5] knowledge_sufficiency_predicate_versions seed missing: agent_task_completion_sufficiency_v1 not found';
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM knowledge_qualification_governance_contexts
        WHERE scope_type = 'domain_module'
          AND domain_module_id = v_domain_id
          AND version = 'v1.0-experimental-canary'
      ) THEN
        INSERT INTO knowledge_qualification_governance_contexts (
          scope_type, domain_module_id, claim_id,
          knowledge_sufficiency_predicate_version_id,
          uncertainty_threshold, minimum_evidence_quantity, minimum_effective_weight,
          minimum_source_coverage, minimum_context_coverage_days,
          minimum_independent_contribution_count, conflict_tolerance,
          base_rate_validity_required, minimum_integrity_score, misleading_evidence_hold,
          approval_authority, derivation_method,
          effective_from, effective_until, version, supersedes, notes
        ) VALUES (
          'domain_module', v_domain_id, NULL,
          v_pred_id,
          0.30, 2, 1.00, 1, 0, 1, 0.45,
          'sufficient',
          'NOT_APPLICABLE/NOT_YET_CALIBRATED',
          'NOT_APPLICABLE/NOT_YET_CALIBRATED',
          'founder_architecture_review_build2a_2a5',
          'Approved experimental thresholds for Build 2A-5 Knowledge Qualification pipeline validation only. Thresholds are computational priors, NOT empirically calibrated behavioral sufficiency standards. uncertainty_threshold=0.30 (SL uncertainty ceiling), minimum_evidence_quantity=2 (minimum bundle atoms), minimum_effective_weight=1.00 (minimum effective evidence mass), minimum_source_coverage=1 (EXPERIMENTAL_NON_DISCRIMINATING), minimum_context_coverage_days=0 (EXPERIMENTAL_NON_DISCRIMINATING), minimum_independent_contribution_count=1, conflict_tolerance=0.45 (SL conflict ceiling), base_rate_validity_required=sufficient. minimum_integrity_score and misleading_evidence_hold are explicitly NOT_APPLICABLE/NOT_YET_CALIBRATED. Authorized by Founder/Architecture Review 2026-08-07. Scope: agent_instrumentation domain, Build 2A-5 canary ONLY.',
          '2026-08-07 00:00:00+00',
          '2027-08-07 00:00:00+00',
          'v1.0-experimental-canary',
          NULL,
          'EXPERIMENTAL/CANARY-ONLY. These thresholds are deliberately permissive computational priors chosen to exercise the qualification pipeline mechanics, not to produce calibrated production-grade knowledge claims. All knowledge claims generated against this governance context are experimental artifacts. This context must NOT be referenced for production behavioral inference. minimum_source_coverage=1 and minimum_context_coverage_days=0 are intentionally non-discriminating (EXPERIMENTAL_NON_DISCRIMINATING) to allow pipeline validation with minimal data. Do not extend effective_until without empirical calibration review.'
        );
      END IF;
    END;
    $$
  `);

  logger.info("[Build2A] Package 2A-5 schema migrations complete.");
}
