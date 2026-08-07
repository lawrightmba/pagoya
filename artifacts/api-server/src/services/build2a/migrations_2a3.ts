/**
 * Build 2A — Database Migrations (Package 2A-3: Weighting Foundation)
 *
 * Creates all Package 2A-3 tables, views, triggers, indexes, and seed data.
 * Must run AFTER Packages 2A-1 and 2A-2 are confirmed ready.
 *
 * Tables created (all new — no existing tables modified except one additive constraint):
 *   - weighting_ledger        (operational; DELETE blocked; lifecycle-controlled)
 *   - integrity_contexts      (Tier 1 immutable)
 *   - quality_contexts        (Tier 1 immutable)
 *   - weighted_evidence_contributions (Tier 1 immutable)
 *
 * View created:
 *   - latest_weighted_contribution_v
 *
 * Additive extension to locked 2A-2 table (no behavior change, purely additive):
 *   - refusal_records.reason_code CHECK constraint extended to include 2A-3
 *     weighting-stage reason codes (spec §14). The 'weighting' refusal_stage
 *     value already existed in the locked 2A-2 CHECK; only reason_code enum
 *     is extended. No existing rows are affected, no 2A-2 service code changes.
 *
 * Implementation keys seeded (into pre-existing Package 2A-1 version tables):
 *   - integrity_discount_v1   → integrity_rule_versions
 *   - quality_weighting_v1    → quality_rule_versions
 *
 * Immutability matrix (Package 2A-3):
 *   Tier 1 fully immutable: integrity_contexts, quality_contexts,
 *     weighted_evidence_contributions
 *   Operational (DELETE blocked, lifecycle-controlled): weighting_ledger
 */

import { sql } from "drizzle-orm";
import { logger } from "../../lib/logger.js";

export async function ensureBuild2a3Tables(): Promise<void> {
  const { db } = await import("@workspace/db");

  logger.info("[Build2A] Running Package 2A-3 schema migrations…");

  // ── 1. weighting_ledger ───────────────────────────────────────────────────
  // Operational processing ledger for the weighting stage.
  // Authorized by spec §15: "create a Package 2A-3 operational processing ledger
  // or extend the approved source-processing pattern with a distinct weighting-stage ledger."
  //
  // Idempotency key: (atom_id, integrity_rule_version_id, quality_rule_version_id).
  // One ledger row per atom/rule combination. Revised rules create a new ledger row
  // for the same atom — enabling reweighting without overwriting history.
  // DELETE blocked; identity fields frozen; status lifecycle enforced by trigger.
  // FK to weighted_evidence_contributions added via ALTER after that table is created.
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS weighting_ledger (
      id                           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      atom_id                      UUID        NOT NULL REFERENCES interpreted_evidence_atoms(id),
      integrity_rule_version_id    UUID        NOT NULL REFERENCES integrity_rule_versions(id),
      quality_rule_version_id      UUID        NOT NULL REFERENCES quality_rule_versions(id),
      status                       TEXT        NOT NULL DEFAULT 'pending',
      attempts                     INTEGER     NOT NULL DEFAULT 0,
      first_seen_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_attempted_at            TIMESTAMPTZ,
      completed_at                 TIMESTAMPTZ,
      resulting_contribution_id    UUID,
      resulting_refusal_id         UUID        REFERENCES refusal_records(id),
      errors                       JSONB       NOT NULL DEFAULT '[]',
      UNIQUE (atom_id, integrity_rule_version_id, quality_rule_version_id),
      CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'refused'))
    )
  `);

  // ── 2. integrity_contexts ─────────────────────────────────────────────────
  // Tier 1: fully immutable after insert. Records the provenance-confidence and
  // integrity assessment applied to one Evidence Atom. Component values are preserved
  // separately so reliability_score is always traceable to its inputs and rule version.
  //
  // Integrity concerns reduce effective contribution weight but NEVER alter the
  // atom's disposition (supports/contradicts/neutral/ambiguous/excluded). Those
  // dispositions are owned permanently by Package 2A-2 and remain immutable.
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS integrity_contexts (
      id                           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      atom_id                      UUID        NOT NULL REFERENCES interpreted_evidence_atoms(id),
      evidence_source_registry_id  UUID        REFERENCES evidence_source_registry(id),
      integrity_rule_version_id    UUID        NOT NULL REFERENCES integrity_rule_versions(id),
      implementation_key           TEXT        NOT NULL,
      source_classification        TEXT        NOT NULL,
      provenance_confidence        NUMERIC(5,4) NOT NULL,
      manipulation_concern         NUMERIC(5,4) NOT NULL DEFAULT 0.0,
      duplication_concern          NUMERIC(5,4) NOT NULL DEFAULT 0.0,
      circular_concern             NUMERIC(5,4) NOT NULL DEFAULT 0.0,
      synthetic_concern            NUMERIC(5,4) NOT NULL DEFAULT 0.0,
      integrity_flags              TEXT[]      NOT NULL DEFAULT '{}',
      integrity_reason_codes       TEXT[]      NOT NULL DEFAULT '{}',
      reliability_score            NUMERIC(5,4) NOT NULL,
      effective_at                 TIMESTAMPTZ NOT NULL,
      created_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CHECK (provenance_confidence  >= 0 AND provenance_confidence  <= 1),
      CHECK (manipulation_concern   >= 0 AND manipulation_concern   <= 1),
      CHECK (duplication_concern    >= 0 AND duplication_concern    <= 1),
      CHECK (circular_concern       >= 0 AND circular_concern       <= 1),
      CHECK (synthetic_concern      >= 0 AND synthetic_concern      <= 1),
      CHECK (reliability_score      >= 0 AND reliability_score      <= 1)
    )
  `);

  // ── 3. quality_contexts ───────────────────────────────────────────────────
  // Tier 1: fully immutable after insert. Records the quality rule and component
  // values applied to one Evidence Atom. The evaluation_timestamp is pinned at
  // weighting time — NOT wall-clock NOW(). This enables deterministic replay:
  // same atom + same rule + same evaluation_timestamp → same output.
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS quality_contexts (
      id                           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      atom_id                      UUID        NOT NULL REFERENCES interpreted_evidence_atoms(id),
      domain_module_id             UUID        REFERENCES domain_modules(id),
      quality_rule_version_id      UUID        NOT NULL REFERENCES quality_rule_versions(id),
      implementation_key           TEXT        NOT NULL,
      source_classification        TEXT        NOT NULL,
      directness                   NUMERIC(5,4) NOT NULL,
      verification_strength        NUMERIC(5,4) NOT NULL,
      recency                      NUMERIC(5,4) NOT NULL,
      relevance                    NUMERIC(5,4) NOT NULL,
      corroboration                NUMERIC(5,4) NOT NULL,
      completeness                 NUMERIC(5,4) NOT NULL,
      context_similarity           NUMERIC(5,4) NOT NULL,
      evaluation_timestamp         TIMESTAMPTZ NOT NULL,
      raw_quality_weight           NUMERIC(7,6) NOT NULL,
      effective_at                 TIMESTAMPTZ NOT NULL,
      created_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CHECK (directness            >= 0 AND directness            <= 1),
      CHECK (verification_strength >= 0 AND verification_strength <= 1),
      CHECK (recency               >= 0 AND recency               <= 1),
      CHECK (relevance             >= 0 AND relevance             <= 1),
      CHECK (corroboration         >= 0 AND corroboration         <= 1),
      CHECK (completeness          >= 0 AND completeness          <= 1),
      CHECK (context_similarity    >= 0 AND context_similarity    <= 1),
      CHECK (raw_quality_weight    >= 0 AND raw_quality_weight    <= 1)
    )
  `);

  // ── 4. weighted_evidence_contributions ────────────────────────────────────
  // Tier 1: fully immutable after insert. The final product of one weighting
  // computation. Stores all component values denormalized from integrity and
  // quality contexts for self-contained inspection.
  //
  // Backward supersession: new_contribution.supersedes = prior_contribution.id.
  // Prior contribution row remains untouched. latest_weighted_contribution_v
  // derives the chain tip from absence of a newer contribution pointing at this row.
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS weighted_evidence_contributions (
      id                           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      atom_id                      UUID        NOT NULL REFERENCES interpreted_evidence_atoms(id),
      integrity_context_id         UUID        NOT NULL REFERENCES integrity_contexts(id),
      quality_context_id           UUID        NOT NULL REFERENCES quality_contexts(id),
      integrity_rule_version_id    UUID        NOT NULL REFERENCES integrity_rule_versions(id),
      quality_rule_version_id      UUID        NOT NULL REFERENCES quality_rule_versions(id),
      implementation_key           TEXT        NOT NULL,
      integrity_discount_factor    NUMERIC(5,4) NOT NULL,
      raw_quality_weight           NUMERIC(7,6) NOT NULL,
      directness                   NUMERIC(5,4) NOT NULL,
      verification_strength        NUMERIC(5,4) NOT NULL,
      recency                      NUMERIC(5,4) NOT NULL,
      relevance                    NUMERIC(5,4) NOT NULL,
      corroboration                NUMERIC(5,4) NOT NULL,
      completeness                 NUMERIC(5,4) NOT NULL,
      context_similarity           NUMERIC(5,4) NOT NULL,
      final_effective_weight       NUMERIC(7,6) NOT NULL,
      evaluation_timestamp         TIMESTAMPTZ NOT NULL,
      supersedes                   UUID        REFERENCES weighted_evidence_contributions(id),
      computed_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CHECK (integrity_discount_factor >= 0 AND integrity_discount_factor <= 1),
      CHECK (raw_quality_weight        >= 0 AND raw_quality_weight        <= 1),
      CHECK (final_effective_weight    >= 0 AND final_effective_weight    <= 1)
    )
  `);

  // ── 5. Add FK from weighting_ledger → weighted_evidence_contributions ──────
  // Deferred until after weighted_evidence_contributions exists.
  await db.execute(sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'weighting_ledger'::regclass
          AND conname = 'weighting_ledger_resulting_contribution_id_fkey'
      ) THEN
        ALTER TABLE weighting_ledger
          ADD CONSTRAINT weighting_ledger_resulting_contribution_id_fkey
          FOREIGN KEY (resulting_contribution_id)
          REFERENCES weighted_evidence_contributions(id);
      END IF;
    END;
    $$
  `);

  // ── 6. Extend refusal_records reason_code CHECK (additive only) ───────────
  // refusal_records already has refusal_stage='weighting' in its stage CHECK
  // (from Package 2A-2). Only reason_code enumeration is extended to support
  // the weighting-stage codes required by spec §14.
  // This is purely additive: no existing rows are affected, no 2A-2 service code
  // is changed, and no previously-valid reason_code becomes invalid.
  await db.execute(sql`
    DO $$
    DECLARE
      v_constraint_name text;
    BEGIN
      SELECT conname INTO v_constraint_name
      FROM pg_constraint
      WHERE conrelid = 'refusal_records'::regclass
        AND contype = 'c'
        AND pg_get_constraintdef(oid) LIKE '%reason_code%'
      LIMIT 1;

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
          'weighting_computation_failed'
        ));
    END;
    $$
  `);

  // ── 7. View: latest_weighted_contribution_v ───────────────────────────────
  // Chain-tip: a contribution is current when no newer contribution's supersedes
  // field points to it. Matches Package 2A-2's latest_interpreted_evidence_atom_v pattern.
  await db.execute(sql`
    CREATE OR REPLACE VIEW latest_weighted_contribution_v AS
    SELECT wec.*
    FROM weighted_evidence_contributions wec
    WHERE NOT EXISTS (
      SELECT 1 FROM weighted_evidence_contributions newer
      WHERE newer.supersedes = wec.id
    )
  `);

  // ── 8. Trigger functions ──────────────────────────────────────────────────

  // Weighting ledger lifecycle: DELETE blocked; identity frozen; status transitions validated.
  await db.execute(sql`
    CREATE OR REPLACE FUNCTION build2a_weighting_ledger_lifecycle_fn()
    RETURNS TRIGGER LANGUAGE plpgsql AS $$
    BEGIN
      IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION '[Build2A/3] weighting_ledger DELETE is blocked. Ledger records are permanent.';
      END IF;
      IF NEW.id IS DISTINCT FROM OLD.id
         OR NEW.atom_id IS DISTINCT FROM OLD.atom_id
         OR NEW.integrity_rule_version_id IS DISTINCT FROM OLD.integrity_rule_version_id
         OR NEW.quality_rule_version_id IS DISTINCT FROM OLD.quality_rule_version_id
         OR NEW.first_seen_at IS DISTINCT FROM OLD.first_seen_at
      THEN
        RAISE EXCEPTION '[Build2A/3] weighting_ledger identity fields (id, atom_id, rule versions, first_seen_at) are frozen.';
      END IF;
      IF OLD.status = NEW.status THEN
        NULL;
      ELSIF OLD.status = 'pending' AND NEW.status = 'processing' THEN
        NULL;
      ELSIF OLD.status = 'processing' AND NEW.status IN ('succeeded', 'failed', 'refused') THEN
        NULL;
      ELSIF OLD.status = 'failed' AND NEW.status = 'processing' THEN
        NULL;
      ELSIF OLD.status IN ('succeeded', 'refused') THEN
        RAISE EXCEPTION '[Build2A/3] weighting_ledger: record % is in terminal status ''%'' — no further transitions.',
          OLD.id, OLD.status;
      ELSE
        RAISE EXCEPTION '[Build2A/3] weighting_ledger: illegal transition ''%'' -> ''%'' for record %.',
          OLD.status, NEW.status, OLD.id;
      END IF;
      RETURN NEW;
    END;
    $$
  `);

  // ── 9. Mount triggers ─────────────────────────────────────────────────────

  // weighting_ledger lifecycle
  await db.execute(sql`DROP TRIGGER IF EXISTS build2a_weighting_ledger_lifecycle ON weighting_ledger`);
  await db.execute(sql`
    CREATE TRIGGER build2a_weighting_ledger_lifecycle
    BEFORE UPDATE OR DELETE ON weighting_ledger
    FOR EACH ROW EXECUTE FUNCTION build2a_weighting_ledger_lifecycle_fn()
  `);

  // integrity_contexts: Tier 1
  await db.execute(sql`DROP TRIGGER IF EXISTS build2a_no_update_integrity_contexts ON integrity_contexts`);
  await db.execute(sql`
    CREATE TRIGGER build2a_no_update_integrity_contexts
    BEFORE UPDATE ON integrity_contexts
    FOR EACH ROW EXECUTE FUNCTION build2a_block_all_mutations_fn()
  `);
  await db.execute(sql`DROP TRIGGER IF EXISTS build2a_no_delete_integrity_contexts ON integrity_contexts`);
  await db.execute(sql`
    CREATE TRIGGER build2a_no_delete_integrity_contexts
    BEFORE DELETE ON integrity_contexts
    FOR EACH ROW EXECUTE FUNCTION build2a_block_all_mutations_fn()
  `);

  // quality_contexts: Tier 1
  await db.execute(sql`DROP TRIGGER IF EXISTS build2a_no_update_quality_contexts ON quality_contexts`);
  await db.execute(sql`
    CREATE TRIGGER build2a_no_update_quality_contexts
    BEFORE UPDATE ON quality_contexts
    FOR EACH ROW EXECUTE FUNCTION build2a_block_all_mutations_fn()
  `);
  await db.execute(sql`DROP TRIGGER IF EXISTS build2a_no_delete_quality_contexts ON quality_contexts`);
  await db.execute(sql`
    CREATE TRIGGER build2a_no_delete_quality_contexts
    BEFORE DELETE ON quality_contexts
    FOR EACH ROW EXECUTE FUNCTION build2a_block_all_mutations_fn()
  `);

  // weighted_evidence_contributions: Tier 1
  await db.execute(sql`DROP TRIGGER IF EXISTS build2a_no_update_weighted_evidence_contributions ON weighted_evidence_contributions`);
  await db.execute(sql`
    CREATE TRIGGER build2a_no_update_weighted_evidence_contributions
    BEFORE UPDATE ON weighted_evidence_contributions
    FOR EACH ROW EXECUTE FUNCTION build2a_block_all_mutations_fn()
  `);
  await db.execute(sql`DROP TRIGGER IF EXISTS build2a_no_delete_weighted_evidence_contributions ON weighted_evidence_contributions`);
  await db.execute(sql`
    CREATE TRIGGER build2a_no_delete_weighted_evidence_contributions
    BEFORE DELETE ON weighted_evidence_contributions
    FOR EACH ROW EXECUTE FUNCTION build2a_block_all_mutations_fn()
  `);

  // ── 10. Indexes ───────────────────────────────────────────────────────────

  // weighting_ledger
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_wl_status            ON weighting_ledger (status)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_wl_atom_status       ON weighting_ledger (atom_id, status)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_wl_status_retry      ON weighting_ledger (status, attempts)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_wl_first_seen        ON weighting_ledger (first_seen_at)`);

  // integrity_contexts
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_ic_atom              ON integrity_contexts (atom_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_ic_esr               ON integrity_contexts (evidence_source_registry_id, effective_at)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_ic_rule_version      ON integrity_contexts (integrity_rule_version_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_ic_implementation_key ON integrity_contexts (implementation_key)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_ic_reliability       ON integrity_contexts (reliability_score)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_ic_flags             ON integrity_contexts USING GIN (integrity_flags)`);

  // quality_contexts
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_qc_atom              ON quality_contexts (atom_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_qc_domain            ON quality_contexts (domain_module_id, effective_at)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_qc_rule_version      ON quality_contexts (quality_rule_version_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_qc_implementation_key ON quality_contexts (implementation_key)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_qc_eval_timestamp    ON quality_contexts (evaluation_timestamp)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_qc_raw_quality       ON quality_contexts (raw_quality_weight)`);

  // weighted_evidence_contributions
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_wec_atom             ON weighted_evidence_contributions (atom_id, computed_at)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_wec_atom_supersedes  ON weighted_evidence_contributions (atom_id, supersedes NULLS FIRST)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_wec_integrity_ctx    ON weighted_evidence_contributions (integrity_context_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_wec_quality_ctx      ON weighted_evidence_contributions (quality_context_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_wec_implementation_key ON weighted_evidence_contributions (implementation_key)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_wec_weight           ON weighted_evidence_contributions (final_effective_weight)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_wec_supersedes       ON weighted_evidence_contributions (supersedes)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_wec_eval_timestamp   ON weighted_evidence_contributions (evaluation_timestamp)`);

  // ── 11. Seeds ─────────────────────────────────────────────────────────────

  // Seed integrity_discount_v1.
  // Formula: reliability_score = provenance_confidence
  //            × (1 - manipulation_concern)
  //            × (1 - duplication_concern)
  //            × (1 - circular_concern)
  //            × (1 - synthetic_concern)
  // integrity_discount_factor = reliability_score
  // All parameters pinned in rule_content — no values invented at weighting time.
  await db.execute(sql`
    INSERT INTO integrity_rule_versions
      (implementation_key, version_label, is_active, replayable_for_history, rule_content)
    VALUES (
      'integrity_discount_v1',
      'v1.0',
      true,
      true,
      ${{
        description:
          'Product-of-confidence integrity model. reliability_score is the product of provenance_confidence ' +
          'and four concern-reduction factors. integrity_discount_factor equals reliability_score. ' +
          'Integrity concerns reduce weight only — they never alter atom dispositions (Package 2A-2 owns those).',
        formula:
          'reliability_score = provenance_confidence × (1-manipulation_concern) × (1-duplication_concern) × (1-circular_concern) × (1-synthetic_concern); integrity_discount_factor = reliability_score',
        version: 'v1.0',
        provenance_defaults_by_source_classification: {
          direct: 0.92,
          derived: 0.82,
          model_resolution: 0.70,
          aggregate: 0.62,
          outcome: 0.88,
        },
        concern_levels: {
          none: 0.0,
          suspected: 0.5,
          confirmed: 1.0,
        },
        integrity_flags_vocabulary: [
          'duplicate_observation',
          'repeated_easy_task_inflation',
          'coordinated_interaction',
          'circular_activity',
          'self_generated_interaction',
          'synthetic_outcome_concern',
          'source_reuse',
          'source_version_laundering',
        ],
      }}::jsonb
    )
    ON CONFLICT (implementation_key) DO NOTHING
  `);

  // Seed quality_weighting_v1.
  // Formula: raw_quality_weight = Σ(weight_i × component_i) / Σ(weight_i)
  //          final_effective_weight = integrity_discount_factor × raw_quality_weight
  // Recency: exp(-ln(2) / half_life_days × days_elapsed)
  //   days_elapsed = (evaluation_timestamp − atom.effective_at) in days
  //   evaluation_timestamp is PINNED at weighting time — deterministic for replay.
  // All parameters pinned in rule_content.
  await db.execute(sql`
    INSERT INTO quality_rule_versions
      (implementation_key, version_label, is_active, replayable_for_history, rule_content)
    VALUES (
      'quality_weighting_v1',
      'v1.0',
      true,
      true,
      ${{
        description:
          'Weighted linear combination quality model. raw_quality_weight is a weighted average of seven components. ' +
          'final_effective_weight = integrity_discount_factor × raw_quality_weight. ' +
          'Recency uses a pinned evaluation_timestamp for deterministic replay. ' +
          'All parameters are immutable once seeded in this rule version.',
        formula:
          'raw_quality_weight = Σ(weight_i × component_i) / Σ(weight_i); final_effective_weight = integrity_discount_factor × raw_quality_weight',
        version: 'v1.0',
        component_weights: {
          directness: 0.25,
          verification_strength: 0.20,
          recency: 0.20,
          relevance: 0.15,
          corroboration: 0.10,
          completeness: 0.05,
          context_similarity: 0.05,
        },
        directness_by_source_classification: {
          direct: 0.95,
          derived: 0.75,
          model_resolution: 0.60,
          aggregate: 0.45,
          outcome: 0.85,
        },
        verification_defaults_by_source_classification: {
          direct: 0.90,
          derived: 0.80,
          model_resolution: 0.70,
          aggregate: 0.60,
          outcome: 0.85,
        },
        recency_decay: {
          formula: 'exp(-ln(2) / half_life_days × days_elapsed)',
          half_life_days: 90,
        },
        relevance_default: 0.90,
        corroboration_default_unspecified: 0.50,
        completeness_default_all_present: 1.0,
        context_similarity_default: 1.0,
      }}::jsonb
    )
    ON CONFLICT (implementation_key) DO NOTHING
  `);

  logger.info("[Build2A] Package 2A-3 schema migrations complete.");
}
