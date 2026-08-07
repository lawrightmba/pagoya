/**
 * Build 2A — Database Migrations (Package 2A-4: Opinion Formation)
 *
 * Creates all Package 2A-4 tables, views, triggers, indexes, and seed data.
 * Must run AFTER Packages 2A-1, 2A-2, and 2A-3 are confirmed ready.
 *
 * Tables created (all new — no existing Tier 1 tables modified):
 *   Tier 1 (fully immutable, UPDATE+DELETE trigger-blocked):
 *     - evidence_bundles
 *     - evidence_bundle_members
 *     - fusion_governance_contexts
 *     - fusion_contexts
 *     - opinions
 *     - reasoning_traces
 *   Operational (DELETE blocked, lifecycle-controlled):
 *     - opinion_formation_ledger
 *
 * Views created:
 *   - latest_fusion_governance_context_v
 *   - latest_opinion_v
 *   - sl_binomial_projection_v1
 *
 * Additive extension to locked 2A-3 refusal_records reason_code CHECK:
 *   Adds fusion-stage reason codes. No existing codes removed.
 *
 * Implementation keys seeded:
 *   - sl_opinion_formation_v1 → fusion_operator_versions  (all 3 operators defined)
 *
 * Data seeds:
 *   - base_rate_records:            2a4_agent_instrumentation domain-level canary base rate
 *   - fusion_governance_contexts:   agent_instrumentation domain-level governance
 *   - version_contexts:             version_context_2a4_v1 (ties all version rows together)
 *
 * Immutability matrix (Package 2A-4):
 *   Tier 1: evidence_bundles, evidence_bundle_members, fusion_governance_contexts,
 *            fusion_contexts, opinions, reasoning_traces
 *   Operational: opinion_formation_ledger (DELETE blocked, lifecycle-controlled)
 */

import { sql } from "drizzle-orm";
import { logger } from "../../lib/logger.js";

export async function ensureBuild2a4Tables(): Promise<void> {
  const { db } = await import("@workspace/db");

  logger.info("[Build2A] Running Package 2A-4 schema migrations…");

  // ── 1. opinion_formation_ledger ────────────────────────────────────────────
  // Operational processing ledger: tracks which claims need opinion formation.
  // Idempotency key: (claim_id, fusion_operator_version_id).
  // DELETE blocked; identity fields frozen; status lifecycle enforced by trigger.
  // Resulting FK columns added via ALTER after opinions table is created.
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS opinion_formation_ledger (
      id                         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      claim_id                   UUID        NOT NULL REFERENCES behavioral_claims(id),
      fusion_operator_version_id UUID        NOT NULL REFERENCES fusion_operator_versions(id),
      status                     TEXT        NOT NULL DEFAULT 'pending',
      attempts                   INTEGER     NOT NULL DEFAULT 0,
      first_seen_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_attempted_at          TIMESTAMPTZ,
      completed_at               TIMESTAMPTZ,
      resulting_opinion_id       UUID,
      resulting_refusal_id       UUID        REFERENCES refusal_records(id),
      errors                     JSONB       NOT NULL DEFAULT '[]',
      UNIQUE (claim_id, fusion_operator_version_id),
      CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'refused'))
    )
  `);

  // ── 2. evidence_bundles ────────────────────────────────────────────────────
  // Tier 1: fully immutable after insert. One bundle per (claim, formation pass).
  // Members drawn exclusively from latest_weighted_contribution_v (chain tips).
  // deterministic_ordering_rule stores the tie-break rule as text so replay
  // can re-verify the same ordering without re-deriving it.
  // Backward supersession via supersedes — the prior bundle row is unchanged.
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS evidence_bundles (
      id                         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      claim_id                   UUID        NOT NULL REFERENCES behavioral_claims(id),
      fusion_operator_version_id UUID        NOT NULL REFERENCES fusion_operator_versions(id),
      deterministic_ordering_rule TEXT        NOT NULL,
      bundle_version             INTEGER     NOT NULL DEFAULT 1,
      construction_timestamp     TIMESTAMPTZ NOT NULL,
      supersedes                 UUID        REFERENCES evidence_bundles(id),
      created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CHECK (bundle_version >= 1)
    )
  `);

  // ── 3. evidence_bundle_members ────────────────────────────────────────────
  // Tier 1: fully immutable. Materialises the ordered set of weighted contributions
  // included in one bundle. sequence_number is explicit (from ordering rule) — never
  // derived from DB insertion order.
  // dependence_group_id: atoms sharing a UUID here are treated as dependent on each
  // other; NULL means no explicit group declared.
  // Zero-weight contributions are INCLUDED — not filtered (spec requirement).
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS evidence_bundle_members (
      id                         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      bundle_id                  UUID        NOT NULL REFERENCES evidence_bundles(id),
      weighted_contribution_id   UUID        NOT NULL REFERENCES weighted_evidence_contributions(id),
      sequence_number            INTEGER     NOT NULL,
      dependence_group_id        UUID,
      created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (bundle_id, sequence_number),
      UNIQUE (bundle_id, weighted_contribution_id),
      CHECK (sequence_number >= 1)
    )
  `);

  // ── 4. fusion_governance_contexts ─────────────────────────────────────────
  // Tier 1: fully immutable. THE critical object — supplies conflict_threshold
  // and conflict_metric_definition from an explicitly approved authority.
  //
  // Resolution at fusion time:
  //   1. Look for a claim-level row (scope_type='behavioral_claim', claim_id matches).
  //   2. If not found, look for a domain-level row (scope_type='domain_module',
  //      domain_module_id of the claim matches).
  //   3. Neither → HALT with refusal 'missing_conflict_threshold_governance'.
  //   NEVER invent a threshold at runtime.
  //
  // Per spec §: scope_type MUST be 'domain_module' or 'behavioral_claim' — NO 'global'.
  // effective_from/until allow time-bounded governance without altering prior rows.
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS fusion_governance_contexts (
      id                         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      scope_type                 TEXT        NOT NULL,
      domain_module_id           UUID        REFERENCES domain_modules(id),
      claim_id                   UUID        REFERENCES behavioral_claims(id),
      conflict_threshold         NUMERIC(5,4) NOT NULL,
      conflict_metric_definition TEXT        NOT NULL,
      fusion_operator_version_id UUID        NOT NULL REFERENCES fusion_operator_versions(id),
      approval_authority         TEXT        NOT NULL,
      derivation_method          TEXT        NOT NULL,
      effective_from             TIMESTAMPTZ,
      effective_until            TIMESTAMPTZ,
      version                    TEXT        NOT NULL,
      supersedes                 UUID        REFERENCES fusion_governance_contexts(id),
      created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CHECK (scope_type IN ('domain_module', 'behavioral_claim')),
      CHECK (conflict_threshold >= 0 AND conflict_threshold <= 1),
      CHECK (
        (scope_type = 'domain_module'    AND domain_module_id IS NOT NULL) OR
        (scope_type = 'behavioral_claim' AND claim_id IS NOT NULL)
      )
    )
  `);

  // ── 5. fusion_contexts ────────────────────────────────────────────────────
  // Tier 1: fully immutable. Records every decision made during operator selection
  // and conflict assessment. bundle_id UNIQUE enforces one fusion context per bundle.
  // conflict_threshold is PINNED from the resolved governance context at fusion time
  // (never re-read from governance at replay — always from this row).
  // operator_parameters stores the non-associative grouping used for replay.
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS fusion_contexts (
      id                              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      bundle_id                       UUID        NOT NULL UNIQUE REFERENCES evidence_bundles(id),
      selected_operator               TEXT        NOT NULL,
      selection_rule_version_id       UUID        NOT NULL REFERENCES fusion_operator_versions(id),
      governance_context_id           UUID        NOT NULL REFERENCES fusion_governance_contexts(id),
      dependence_declarations_summary JSONB       NOT NULL DEFAULT '{}',
      unknown_dependence_fallback_applied BOOLEAN NOT NULL DEFAULT false,
      conflict_measure                NUMERIC(7,6),
      conflict_threshold              NUMERIC(5,4) NOT NULL,
      rerouted_to_consensus_compromise BOOLEAN    NOT NULL DEFAULT false,
      operator_parameters             JSONB       NOT NULL DEFAULT '{}',
      version_context_id              UUID        REFERENCES version_contexts(id),
      created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CHECK (selected_operator IN ('cumulative', 'averaging', 'consensus_compromise')),
      CHECK (conflict_threshold >= 0 AND conflict_threshold <= 1)
    )
  `);

  // ── 6. opinions ───────────────────────────────────────────────────────────
  // Tier 1: fully immutable. The output of opinion formation — a versioned,
  // replayable SL binomial opinion on a behavioral claim.
  //
  // HARD invariant: abs((belief + disbelief + uncertainty) - 1.0) < 0.0001
  //   Enforced by DB CHECK. Any computation that violates this is rejected.
  //
  // No column may represent a decision. belief/disbelief/uncertainty are
  // reasoning outputs only. Downstream decision logic is Build 6+ (Authority layer).
  //
  // base_rate_record_id NOT NULL: must reference a row where value IS NOT NULL.
  // provisional_unknown base rates halt before opinion creation (refusal recorded).
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS opinions (
      id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      claim_id             UUID        NOT NULL REFERENCES behavioral_claims(id),
      evidence_bundle_id   UUID        NOT NULL REFERENCES evidence_bundles(id),
      fusion_context_id    UUID        NOT NULL REFERENCES fusion_contexts(id),
      belief               NUMERIC(5,4) NOT NULL,
      disbelief            NUMERIC(5,4) NOT NULL,
      uncertainty          NUMERIC(5,4) NOT NULL,
      base_rate            NUMERIC(5,4) NOT NULL,
      base_rate_record_id  UUID        NOT NULL REFERENCES base_rate_records(id),
      mathematical_validity_status TEXT NOT NULL,
      evaluation_time      TIMESTAMPTZ NOT NULL,
      version_context_id   UUID        REFERENCES version_contexts(id),
      supersedes           UUID        REFERENCES opinions(id),
      created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CHECK (belief      >= 0 AND belief      <= 1),
      CHECK (disbelief   >= 0 AND disbelief   <= 1),
      CHECK (uncertainty >= 0 AND uncertainty <= 1),
      CHECK (base_rate   >= 0 AND base_rate   <= 1),
      CHECK (ABS((belief + disbelief + uncertainty) - 1.0) < 0.0001)
    )
  `);

  // ── 7. reasoning_traces ───────────────────────────────────────────────────
  // Tier 1: fully immutable. Exactly one trace per Opinion (opinion_id UNIQUE).
  // If trace insertion fails, the containing transaction is rolled back — ensuring
  // NO Opinion ever exists without its trace.
  //
  // discarded_contribution_count: atoms that have contributions in
  //   weighted_evidence_contributions but are NOT in latest_weighted_contribution_v
  //   (i.e., superseded intermediate chain nodes). Must reconcile exactly.
  // zero_weight_contribution_count: bundle members with final_effective_weight = 0.
  //   Included in the bundle and fusion, not filtered out.
  //
  // replay_checksum: SHA-256-like deterministic hash over bundle_id + fusion_context_id
  //   + governance_context_id + version_context_id + evaluation_time.
  //   Enables independent audit of replay correctness.
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS reasoning_traces (
      id                            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      opinion_id                    UUID        NOT NULL UNIQUE REFERENCES opinions(id),
      reasoning_version             TEXT        NOT NULL,
      fusion_operator_selected      TEXT        NOT NULL,
      selection_reason              TEXT        NOT NULL,
      conflict_measurement          NUMERIC(7,6),
      dependence_assessment         JSONB       NOT NULL DEFAULT '{}',
      independent_contribution_count INTEGER   NOT NULL DEFAULT 0,
      dependent_contribution_count  INTEGER    NOT NULL DEFAULT 0,
      discarded_contribution_count  INTEGER    NOT NULL DEFAULT 0,
      zero_weight_contribution_count INTEGER   NOT NULL DEFAULT 0,
      uncertainty_change            NUMERIC(7,6),
      replay_checksum               TEXT        NOT NULL,
      created_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CHECK (independent_contribution_count >= 0),
      CHECK (dependent_contribution_count   >= 0),
      CHECK (discarded_contribution_count   >= 0),
      CHECK (zero_weight_contribution_count >= 0)
    )
  `);

  // ── 8. Add FK: opinion_formation_ledger → opinions ─────────────────────────
  await db.execute(sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'opinion_formation_ledger'::regclass
          AND conname = 'opinion_formation_ledger_resulting_opinion_id_fkey'
      ) THEN
        ALTER TABLE opinion_formation_ledger
          ADD CONSTRAINT opinion_formation_ledger_resulting_opinion_id_fkey
          FOREIGN KEY (resulting_opinion_id)
          REFERENCES opinions(id);
      END IF;
    END;
    $$
  `);

  // ── 9. Extend refusal_records reason_code CHECK (additive only) ───────────
  // Adds 4 fusion-stage reason codes. No existing codes removed or altered.
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
          'weighting_computation_failed',
          'missing_base_rate', 'missing_conflict_threshold_governance',
          'bundle_construction_failed', 'invalid_opinion_computed'
        ));
    END;
    $$
  `);

  // ── 10. Views ──────────────────────────────────────────────────────────────

  // latest_fusion_governance_context_v: non-superseded governance rows.
  // Claim-level precedence over domain-level is resolved in application code,
  // not in this view — the view returns ALL current rows for all scopes.
  await db.execute(sql`
    CREATE OR REPLACE VIEW latest_fusion_governance_context_v AS
    SELECT fgc.*
    FROM fusion_governance_contexts fgc
    WHERE NOT EXISTS (
      SELECT 1 FROM fusion_governance_contexts newer
      WHERE newer.supersedes = fgc.id
    )
  `);

  // latest_opinion_v: chain-tip opinions only.
  await db.execute(sql`
    CREATE OR REPLACE VIEW latest_opinion_v AS
    SELECT o.*
    FROM opinions o
    WHERE NOT EXISTS (
      SELECT 1 FROM opinions newer
      WHERE newer.supersedes = o.id
    )
  `);

  // sl_binomial_projection_v1: SL expected probability projection.
  // Formula: P(X=1) = belief + base_rate × uncertainty
  // implementation_key = 'sl_binomial_projection_v1' (seeded in 2A-1).
  await db.execute(sql`
    CREATE OR REPLACE VIEW sl_binomial_projection_v1 AS
    SELECT
      o.id                                                    AS opinion_id,
      ROUND(CAST(o.belief + o.base_rate * o.uncertainty AS NUMERIC), 6) AS projected_probability,
      o.evaluation_time,
      'sl_binomial_projection_v1'::TEXT                       AS implementation_key
    FROM opinions o
  `);

  // ── 11. Trigger functions ──────────────────────────────────────────────────

  // opinion_formation_ledger lifecycle: DELETE blocked; identity frozen; status transitions.
  await db.execute(sql`
    CREATE OR REPLACE FUNCTION build2a_opinion_ledger_lifecycle_fn()
    RETURNS TRIGGER LANGUAGE plpgsql AS $$
    BEGIN
      IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION '[Build2A/4] opinion_formation_ledger DELETE is blocked. Ledger records are permanent.';
      END IF;
      IF NEW.id IS DISTINCT FROM OLD.id
         OR NEW.claim_id IS DISTINCT FROM OLD.claim_id
         OR NEW.fusion_operator_version_id IS DISTINCT FROM OLD.fusion_operator_version_id
         OR NEW.first_seen_at IS DISTINCT FROM OLD.first_seen_at
      THEN
        RAISE EXCEPTION '[Build2A/4] opinion_formation_ledger identity fields (id, claim_id, fusion_operator_version_id, first_seen_at) are frozen.';
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
        RAISE EXCEPTION '[Build2A/4] opinion_formation_ledger: record % is in terminal status ''%'' — no further transitions.',
          OLD.id, OLD.status;
      ELSE
        RAISE EXCEPTION '[Build2A/4] opinion_formation_ledger: illegal transition ''%'' -> ''%'' for record %.',
          OLD.status, NEW.status, OLD.id;
      END IF;
      RETURN NEW;
    END;
    $$
  `);

  // ── 12. Mount triggers ─────────────────────────────────────────────────────

  // opinion_formation_ledger lifecycle
  await db.execute(sql`DROP TRIGGER IF EXISTS build2a_opinion_ledger_lifecycle ON opinion_formation_ledger`);
  await db.execute(sql`
    CREATE TRIGGER build2a_opinion_ledger_lifecycle
    BEFORE UPDATE OR DELETE ON opinion_formation_ledger
    FOR EACH ROW EXECUTE FUNCTION build2a_opinion_ledger_lifecycle_fn()
  `);

  // evidence_bundles: Tier 1
  await db.execute(sql`DROP TRIGGER IF EXISTS build2a_no_update_evidence_bundles ON evidence_bundles`);
  await db.execute(sql`
    CREATE TRIGGER build2a_no_update_evidence_bundles
    BEFORE UPDATE ON evidence_bundles
    FOR EACH ROW EXECUTE FUNCTION build2a_block_all_mutations_fn()
  `);
  await db.execute(sql`DROP TRIGGER IF EXISTS build2a_no_delete_evidence_bundles ON evidence_bundles`);
  await db.execute(sql`
    CREATE TRIGGER build2a_no_delete_evidence_bundles
    BEFORE DELETE ON evidence_bundles
    FOR EACH ROW EXECUTE FUNCTION build2a_block_all_mutations_fn()
  `);

  // evidence_bundle_members: Tier 1
  await db.execute(sql`DROP TRIGGER IF EXISTS build2a_no_update_evidence_bundle_members ON evidence_bundle_members`);
  await db.execute(sql`
    CREATE TRIGGER build2a_no_update_evidence_bundle_members
    BEFORE UPDATE ON evidence_bundle_members
    FOR EACH ROW EXECUTE FUNCTION build2a_block_all_mutations_fn()
  `);
  await db.execute(sql`DROP TRIGGER IF EXISTS build2a_no_delete_evidence_bundle_members ON evidence_bundle_members`);
  await db.execute(sql`
    CREATE TRIGGER build2a_no_delete_evidence_bundle_members
    BEFORE DELETE ON evidence_bundle_members
    FOR EACH ROW EXECUTE FUNCTION build2a_block_all_mutations_fn()
  `);

  // fusion_governance_contexts: Tier 1
  await db.execute(sql`DROP TRIGGER IF EXISTS build2a_no_update_fusion_governance_contexts ON fusion_governance_contexts`);
  await db.execute(sql`
    CREATE TRIGGER build2a_no_update_fusion_governance_contexts
    BEFORE UPDATE ON fusion_governance_contexts
    FOR EACH ROW EXECUTE FUNCTION build2a_block_all_mutations_fn()
  `);
  await db.execute(sql`DROP TRIGGER IF EXISTS build2a_no_delete_fusion_governance_contexts ON fusion_governance_contexts`);
  await db.execute(sql`
    CREATE TRIGGER build2a_no_delete_fusion_governance_contexts
    BEFORE DELETE ON fusion_governance_contexts
    FOR EACH ROW EXECUTE FUNCTION build2a_block_all_mutations_fn()
  `);

  // fusion_contexts: Tier 1
  await db.execute(sql`DROP TRIGGER IF EXISTS build2a_no_update_fusion_contexts ON fusion_contexts`);
  await db.execute(sql`
    CREATE TRIGGER build2a_no_update_fusion_contexts
    BEFORE UPDATE ON fusion_contexts
    FOR EACH ROW EXECUTE FUNCTION build2a_block_all_mutations_fn()
  `);
  await db.execute(sql`DROP TRIGGER IF EXISTS build2a_no_delete_fusion_contexts ON fusion_contexts`);
  await db.execute(sql`
    CREATE TRIGGER build2a_no_delete_fusion_contexts
    BEFORE DELETE ON fusion_contexts
    FOR EACH ROW EXECUTE FUNCTION build2a_block_all_mutations_fn()
  `);

  // opinions: Tier 1
  await db.execute(sql`DROP TRIGGER IF EXISTS build2a_no_update_opinions ON opinions`);
  await db.execute(sql`
    CREATE TRIGGER build2a_no_update_opinions
    BEFORE UPDATE ON opinions
    FOR EACH ROW EXECUTE FUNCTION build2a_block_all_mutations_fn()
  `);
  await db.execute(sql`DROP TRIGGER IF EXISTS build2a_no_delete_opinions ON opinions`);
  await db.execute(sql`
    CREATE TRIGGER build2a_no_delete_opinions
    BEFORE DELETE ON opinions
    FOR EACH ROW EXECUTE FUNCTION build2a_block_all_mutations_fn()
  `);

  // reasoning_traces: Tier 1
  await db.execute(sql`DROP TRIGGER IF EXISTS build2a_no_update_reasoning_traces ON reasoning_traces`);
  await db.execute(sql`
    CREATE TRIGGER build2a_no_update_reasoning_traces
    BEFORE UPDATE ON reasoning_traces
    FOR EACH ROW EXECUTE FUNCTION build2a_block_all_mutations_fn()
  `);
  await db.execute(sql`DROP TRIGGER IF EXISTS build2a_no_delete_reasoning_traces ON reasoning_traces`);
  await db.execute(sql`
    CREATE TRIGGER build2a_no_delete_reasoning_traces
    BEFORE DELETE ON reasoning_traces
    FOR EACH ROW EXECUTE FUNCTION build2a_block_all_mutations_fn()
  `);

  // ── 13. Indexes ────────────────────────────────────────────────────────────

  // opinion_formation_ledger
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_ofl_status           ON opinion_formation_ledger (status)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_ofl_claim_status     ON opinion_formation_ledger (claim_id, status)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_ofl_status_retry     ON opinion_formation_ledger (status, attempts)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_ofl_first_seen       ON opinion_formation_ledger (first_seen_at)`);

  // evidence_bundles
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_eb_claim             ON evidence_bundles (claim_id, construction_timestamp)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_eb_operator          ON evidence_bundles (fusion_operator_version_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_eb_supersedes        ON evidence_bundles (supersedes)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_eb_version           ON evidence_bundles (claim_id, bundle_version)`);

  // evidence_bundle_members
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_ebm_bundle           ON evidence_bundle_members (bundle_id, sequence_number)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_ebm_contribution     ON evidence_bundle_members (weighted_contribution_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_ebm_dep_group        ON evidence_bundle_members (dependence_group_id) WHERE dependence_group_id IS NOT NULL`);

  // fusion_governance_contexts
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_fgc_scope_domain     ON fusion_governance_contexts (scope_type, domain_module_id) WHERE scope_type = 'domain_module'`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_fgc_scope_claim      ON fusion_governance_contexts (scope_type, claim_id) WHERE scope_type = 'behavioral_claim'`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_fgc_operator         ON fusion_governance_contexts (fusion_operator_version_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_fgc_supersedes       ON fusion_governance_contexts (supersedes)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_fgc_effective        ON fusion_governance_contexts (effective_from, effective_until)`);

  // fusion_contexts
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_fc_governance        ON fusion_contexts (governance_context_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_fc_operator          ON fusion_contexts (selected_operator)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_fc_version_context   ON fusion_contexts (version_context_id)`);

  // opinions
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_op_claim             ON opinions (claim_id, evaluation_time)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_op_bundle            ON opinions (evidence_bundle_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_op_fusion_context    ON opinions (fusion_context_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_op_base_rate_record  ON opinions (base_rate_record_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_op_supersedes        ON opinions (supersedes)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_op_version_context   ON opinions (version_context_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_op_belief            ON opinions (belief)`);

  // reasoning_traces
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_rt_operator          ON reasoning_traces (fusion_operator_selected)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_rt_checksum          ON reasoning_traces (replay_checksum)`);

  // ── 14. Seeds ──────────────────────────────────────────────────────────────

  // Seed sl_opinion_formation_v1 into fusion_operator_versions.
  // Defines all three SL operators (cumulative, averaging, consensus_compromise)
  // and the conflict measure. No parameters are invented at runtime — all formulas
  // and conflict_threshold policy are stored in governance_contexts, not here.
  // This row represents the *implementation* (the math); governance_contexts
  // represent the *policy* (when to apply C&C).
  await db.execute(sql`
    INSERT INTO fusion_operator_versions
      (implementation_key, version_label, is_active, replayable_for_history,
       operator_description, parameters)
    VALUES (
      'sl_opinion_formation_v1',
      'v1.0',
      true,
      true,
      'Subjective Logic binomial opinion formation: three operators (cumulative, averaging, consensus_compromise). Non-associative — operator applied in stored sequence_number order. Conflict measured pairwise; governance context supplies threshold.',
      ${{
        operators: {
          cumulative: {
            description: 'Standard SL cumulative fusion for independent evidence.',
            formula_pair: 'k=u1+u2-u1*u2; b=(b1*u2+b2*u1)/k; d=(d1*u2+d2*u1)/k; u=(u1*u2)/k',
            dogmatic_fallback: 'b=(b1+b2)/2; d=(d1+d2)/2; u=0',
            invariant: 'b+d+u=1',
          },
          averaging: {
            description: 'SL averaging fusion for dependent/unspecified evidence.',
            formula_pair: 'k=u1+u2; b=(b1*u2+b2*u1)/k; d=(d1*u2+d2*u1)/k; u=2*u1*u2/k',
            dogmatic_fallback: 'b=(b1+b2)/2; d=(d1+d2)/2; u=0',
            invariant: 'b+d+u=1',
          },
          consensus_compromise: {
            description: 'SL uncertainty-augmented compromise for conflicting evidence.',
            formula_pair: 'C=b1*d2+d1*b2; b=(b1+b2)/2-C/2; d=(d1+d2)/2-C/2; u=(u1+u2)/2+C',
            invariant: 'b+d+u=1',
          },
        },
        conflict_measure: {
          description: 'Pairwise SL conflict: C(ω1,ω2) = b1*d2 + d1*b2. Aggregate = max(C) over all consecutive ordered pairs in the bundle, evaluated in sequence_number order before fusion.',
          range: '[0, 0.5]',
        },
        disposition_to_sl: {
          supports:    'b=weight; d=0;        u=1-weight',
          contradicts: 'b=0;      d=weight;   u=1-weight',
          neutral:     'b=0;      d=0;        u=1        (vacuous)',
          ambiguous:   'b=weight/2; d=weight/2; u=1-weight',
          excluded:    'b=0;      d=0;        u=1        (treated as vacuous)',
        },
        non_associativity_note: 'Operators are non-associative. Grouping is always left-to-right in sequence_number order as stored in evidence_bundle_members.',
        projection: 'P(X=1) = belief + base_rate * uncertainty   (SL binomial projection, sl_binomial_projection_v1)',
        version: 'v1.0',
      }}::jsonb
    )
    ON CONFLICT (implementation_key) DO NOTHING
  `);

  // Seed base_rate_record for agent_instrumentation domain module canary.
  // scope='2a4_agent_instrumentation': neutral base rate (50%) for agent task
  // completion probability prior to any behavioural evidence.
  // derivation_method: domain expert elicitation assuming uniform prior.
  // This seed enables the canary and tests to have a valid non-provisional base rate.
  // base_rate_records has no UNIQUE constraint on canonical_seed_key (column is plain TEXT),
  // so we use WHERE NOT EXISTS instead of ON CONFLICT.
  await db.execute(sql`
    INSERT INTO base_rate_records
      (source_type, scope, value, sufficiency_status, approval_authority,
       derivation_method, effective_from, notes, canonical_seed_key)
    SELECT
      'domain_expert',
      '2a4_agent_instrumentation',
      0.50,
      'sufficient',
      'build2a_2a4_specification_v1',
      'prior_elicitation_uniform_agent_task_completion',
      '2026-01-01 00:00:00+00',
      'Neutral (50%) base rate for agent task completion. Uniform prior pending empirical calibration. Used by Package 2A-4 canary and tests.',
      'b2a_seed_v1|2a4_agent_instrumentation|domain_expert|build2a_2a4_spec'
    WHERE NOT EXISTS (
      SELECT 1 FROM base_rate_records
      WHERE canonical_seed_key = 'b2a_seed_v1|2a4_agent_instrumentation|domain_expert|build2a_2a4_spec'
    )
  `);

  // Seed fusion_governance_context for agent_instrumentation domain module.
  // Supplies the conflict_threshold and conflict_metric_definition that the
  // fusion service reads at runtime — NEVER invents these values.
  // scope_type='domain_module': applies to all claims under agent_instrumentation.
  // A claim-level row would take precedence (none seeded here — none needed for canary).
  await db.execute(sql`
    DO $$
    DECLARE
      v_domain_id UUID;
      v_fov_id    UUID;
    BEGIN
      SELECT id INTO v_domain_id FROM domain_modules WHERE slug = 'agent_instrumentation' LIMIT 1;
      SELECT id INTO v_fov_id   FROM fusion_operator_versions WHERE implementation_key = 'sl_opinion_formation_v1' LIMIT 1;

      IF v_domain_id IS NULL THEN
        RAISE EXCEPTION '[Build2A/4] domain_modules seed missing: agent_instrumentation not found';
      END IF;
      IF v_fov_id IS NULL THEN
        RAISE EXCEPTION '[Build2A/4] fusion_operator_versions seed missing: sl_opinion_formation_v1 not found';
      END IF;

      -- Insert only if no existing domain-level governance for agent_instrumentation
      IF NOT EXISTS (
        SELECT 1 FROM fusion_governance_contexts
        WHERE scope_type = 'domain_module' AND domain_module_id = v_domain_id
      ) THEN
        INSERT INTO fusion_governance_contexts
          (scope_type, domain_module_id, claim_id, conflict_threshold, conflict_metric_definition,
           fusion_operator_version_id, approval_authority, derivation_method,
           effective_from, effective_until, version, supersedes)
        VALUES (
          'domain_module',
          v_domain_id,
          NULL,
          0.30,
          'Pairwise conflict C(ω1,ω2) = b1*d2 + d1*b2 where b,d are the SL belief and disbelief masses of each atom''''s opinion before fusion. Aggregate conflict = max(C) over all consecutive ordered pairs in the bundle (evaluated left-to-right by sequence_number). Threshold 0.30 triggers rerouting to consensus_compromise operator.',
          v_fov_id,
          'build2a_2a4_specification_v1',
          'theoretical_sl_standard_conflict_threshold',
          '2026-01-01 00:00:00+00',
          NULL,
          'v1.0',
          NULL
        );
      END IF;
    END;
    $$
  `);

  // Seed version_context_2a4_v1: ties together all active version rows at 2A-4 launch.
  // Allows opinions to reference a single version context that pins the exact model
  // configuration used at formation time, enabling deterministic replay.
  await db.execute(sql`
    DO $$
    DECLARE
      v_irv_id  UUID;
      v_qrv_id  UUID;
      v_irrv_id UUID;
      v_fov_id  UUID;
      v_pfv_id  UUID;
      v_brr_id  UUID;
    BEGIN
      SELECT id INTO v_irv_id  FROM interpretation_rule_versions WHERE implementation_key = 'task_completion_v1'      AND is_active = true LIMIT 1;
      SELECT id INTO v_qrv_id  FROM quality_rule_versions          WHERE implementation_key = 'quality_weighting_v1'  AND is_active = true LIMIT 1;
      SELECT id INTO v_irrv_id FROM integrity_rule_versions         WHERE implementation_key = 'integrity_discount_v1' AND is_active = true LIMIT 1;
      SELECT id INTO v_fov_id  FROM fusion_operator_versions        WHERE implementation_key = 'sl_opinion_formation_v1' AND is_active = true LIMIT 1;
      SELECT id INTO v_pfv_id  FROM projection_function_versions    WHERE implementation_key = 'sl_binomial_projection_v1' AND is_active = true LIMIT 1;
      SELECT id INTO v_brr_id  FROM base_rate_records WHERE canonical_seed_key = 'b2a_seed_v1|2a4_agent_instrumentation|domain_expert|build2a_2a4_spec' LIMIT 1;

      IF NOT EXISTS (SELECT 1 FROM version_contexts WHERE label = 'version_context_2a4_v1') THEN
        INSERT INTO version_contexts
          (label, interpretation_rule_version_id, quality_rule_version_id,
           integrity_rule_version_id, fusion_operator_version_id,
           projection_function_version_id, base_rate_record_id,
           evidence_source_registry_snapshot_hash, domain_module_version_map)
        VALUES (
          'version_context_2a4_v1',
          v_irv_id, v_qrv_id, v_irrv_id, v_fov_id, v_pfv_id, v_brr_id,
          'snapshot_2a4_launch',
          '{"agent_instrumentation": "v1.0"}'::jsonb
        );
      END IF;
    END;
    $$
  `);

  logger.info("[Build2A] Package 2A-4 schema migrations complete.");
}
