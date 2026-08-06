/**
 * Build 2A — Database Migrations (Package 2A-2: Interpretation Foundation)
 *
 * Creates all Package 2A-2 tables, views, triggers, indexes, and seed data.
 * Must run AFTER ensureBuild2aTables() (Package 2A-1) has completed, because
 * this file references: evidence_source_registry, interpretation_rule_versions,
 * behavioral_claims, behavioral_entities, domain_modules, behavioral_primitives.
 *
 * Table creation order handles circular FKs between cluster_assembly and
 * interpreted_evidence_atoms by deferring those FK columns via ALTER TABLE:
 *   1. source_processing_ledger  (no circular FKs initially)
 *   2. cluster_assembly          (no circular FK initially)
 *   3. interpreted_evidence_atoms  → FK to cluster_assembly ✓
 *   4. evidence_atom_observation_links → FK to cluster_assembly ✓
 *   5. refusal_records           → FK to cluster_assembly ✓
 *   6. ALTER TABLE cluster_assembly         ADD COLUMN resulting_atom_id → interpreted_evidence_atoms
 *   7. ALTER TABLE source_processing_ledger ADD COLUMN resulting_atom_id → interpreted_evidence_atoms
 *   8. ALTER TABLE source_processing_ledger ADD COLUMN resulting_refusal_id → refusal_records
 *
 * Immutability matrix (Package 2A-2):
 *   Tier 1 (fully immutable): interpreted_evidence_atoms, evidence_atom_observation_links,
 *     refusal_records  (reuse build2a_block_all_mutations_fn from 2A-1)
 *   Controlled lifecycle: cluster_assembly  (DELETE blocked; identity fields frozen;
 *     only valid state transitions; terminal states permanently immutable)
 *   Operational ledger: source_processing_ledger  (DELETE blocked; identity/idempotency
 *     fields frozen; status transitions validated)
 *
 * Package 2A-2 seeds:
 *   - interpretation_rule_versions:   task_completion_v1
 *   - domain_source_eligibility:      agent_instrumentation × agent_task_outcomes
 *                                     × agent_guided_task_completion
 *   - domain_source_eligibility:      agent_instrumentation × agent_tasks
 *                                     × agent_guided_task_completion
 */

import { sql } from "drizzle-orm";
import { logger } from "../../lib/logger.js";

export async function ensureBuild2a2Tables(): Promise<void> {
  const { db } = await import("@workspace/db");

  logger.info("[Build2A] Running Package 2A-2 schema migrations…");

  // ── 1. source_processing_ledger ───────────────────────────────────────────
  // Operational ledger. DELETE blocked; identity/idempotency fields frozen;
  // status lifecycle enforced by trigger. Circular FK columns added via ALTER.
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS source_processing_ledger (
      id                             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      evidence_source_registry_id    UUID        NOT NULL REFERENCES evidence_source_registry(id),
      source_record_key              TEXT        NOT NULL,
      interpretation_rule_version_id UUID        NOT NULL REFERENCES interpretation_rule_versions(id),
      status                         TEXT        NOT NULL DEFAULT 'pending',
      attempts                       INTEGER     NOT NULL DEFAULT 0,
      retry_state                    JSONB       NOT NULL DEFAULT '{}',
      first_seen_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_attempted_at              TIMESTAMPTZ,
      completed_at                   TIMESTAMPTZ,
      errors                         JSONB       NOT NULL DEFAULT '[]',
      UNIQUE (evidence_source_registry_id, source_record_key, interpretation_rule_version_id),
      CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'refused'))
    )
  `);

  // ── 2. cluster_assembly ───────────────────────────────────────────────────
  // Controlled lifecycle. DELETE blocked; identity fields frozen; only valid
  // state transitions permitted; terminal states permanently immutable.
  // abandon_timeout_at is set at creation = started_at + configured timeout.
  // Circular FK column (resulting_atom_id) added via ALTER TABLE after atom table.
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS cluster_assembly (
      id                             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      claim_id                       UUID        NOT NULL REFERENCES behavioral_claims(id),
      interpretation_rule_version_id UUID        NOT NULL REFERENCES interpretation_rule_versions(id),
      expected_observation_count     INTEGER     NOT NULL,
      started_at                     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      assembly_state                 TEXT        NOT NULL DEFAULT 'assembling',
      cluster_hash                   TEXT,
      sealed_at                      TIMESTAMPTZ,
      abandoned_at                   TIMESTAMPTZ,
      abandon_timeout_at             TIMESTAMPTZ NOT NULL,
      CHECK (assembly_state IN ('assembling', 'sealed', 'abandoned')),
      CHECK (expected_observation_count > 0)
    )
  `);

  // ── 3. interpreted_evidence_atoms ─────────────────────────────────────────
  // Tier 1: fully immutable after insert. Reinterpretation creates a new atom
  // with new_atom.supersedes = prior_atom.id — never updates the old atom.
  // cluster_assembly_id UNIQUE enforces one atom per sealed cluster.
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS interpreted_evidence_atoms (
      id                             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      claim_id                       UUID        NOT NULL REFERENCES behavioral_claims(id),
      cluster_assembly_id            UUID        NOT NULL UNIQUE REFERENCES cluster_assembly(id),
      disposition                    TEXT        NOT NULL,
      interpretation_rule_version_id UUID        NOT NULL REFERENCES interpretation_rule_versions(id),
      dependence_declaration         TEXT        NOT NULL DEFAULT 'unspecified',
      effective_at                   TIMESTAMPTZ NOT NULL,
      environment_context            JSONB       NOT NULL DEFAULT '{}',
      supersedes                     UUID        REFERENCES interpreted_evidence_atoms(id),
      created_at                     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CHECK (disposition IN ('supports', 'contradicts', 'neutral', 'ambiguous', 'excluded')),
      CHECK (dependence_declaration IN ('independent', 'dependent', 'unspecified'))
    )
  `);

  // ── 4. evidence_atom_observation_links ────────────────────────────────────
  // Tier 1: fully immutable. BEFORE INSERT trigger rejects post-seal/post-abandonment.
  // No duplicate source_record_key within one cluster (UNIQUE on cluster+key).
  // No duplicate sequence within one cluster (UNIQUE on cluster+sequence).
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS evidence_atom_observation_links (
      id                             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      cluster_assembly_id            UUID        NOT NULL REFERENCES cluster_assembly(id),
      evidence_source_registry_id    UUID        NOT NULL REFERENCES evidence_source_registry(id),
      source_record_key              TEXT        NOT NULL,
      sequence_position              INTEGER     NOT NULL,
      created_at                     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CHECK (sequence_position > 0),
      UNIQUE (cluster_assembly_id, source_record_key),
      UNIQUE (cluster_assembly_id, sequence_position)
    )
  `);

  // ── 5. refusal_records ────────────────────────────────────────────────────
  // Tier 1: fully immutable append-only log. All refusal stages supported;
  // Package 2A-2 uses only the early stages.
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS refusal_records (
      id                             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      refusal_stage                  TEXT        NOT NULL,
      reason_code                    TEXT        NOT NULL,
      claim_id                       UUID        REFERENCES behavioral_claims(id),
      source_observation_key         TEXT,
      evidence_source_registry_id    UUID        REFERENCES evidence_source_registry(id),
      cluster_assembly_id            UUID        REFERENCES cluster_assembly(id),
      interpretation_rule_version_id UUID        REFERENCES interpretation_rule_versions(id),
      detail                         TEXT        NOT NULL DEFAULT '',
      created_at                     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CHECK (refusal_stage IN (
        'claim_formulation', 'source_approval', 'interpretation',
        'weighting', 'fusion', 'knowledge_qualification', 'replay'
      )),
      CHECK (reason_code IN (
        'no_matching_claim', 'unregistered_source', 'source_not_eligible',
        'revoked_source_eligibility', 'primitive_mismatch',
        'incomplete_bounded_cluster', 'ambiguous_interpretation',
        'prohibited_inference', 'invalid_or_unavailable_version',
        'source_attribution_failed', 'processing_failure'
      ))
    )
  `);

  // ── 6-8. Additive circular FK columns (via ALTER TABLE) ───────────────────
  // These create the back-references that form the circular FK pattern.
  // Using IF NOT EXISTS so repeated migration runs are safe.
  await db.execute(sql`
    ALTER TABLE cluster_assembly
      ADD COLUMN IF NOT EXISTS resulting_atom_id UUID REFERENCES interpreted_evidence_atoms(id)
  `);
  await db.execute(sql`
    ALTER TABLE source_processing_ledger
      ADD COLUMN IF NOT EXISTS resulting_atom_id UUID REFERENCES interpreted_evidence_atoms(id)
  `);
  await db.execute(sql`
    ALTER TABLE source_processing_ledger
      ADD COLUMN IF NOT EXISTS resulting_refusal_id UUID REFERENCES refusal_records(id)
  `);

  // ── View: latest_interpreted_evidence_atom_v ──────────────────────────────
  // Chain-tip rule: an atom is the current tip if no other atom supersedes it.
  // Multiple reinterpretations produce a chain; only the tip is "current".
  await db.execute(sql`
    CREATE OR REPLACE VIEW latest_interpreted_evidence_atom_v AS
    SELECT iea.*
    FROM interpreted_evidence_atoms iea
    WHERE NOT EXISTS (
      SELECT 1 FROM interpreted_evidence_atoms newer
      WHERE newer.supersedes = iea.id
    )
  `);

  // ── Trigger functions (Package 2A-2) ──────────────────────────────────────

  // Controlled lifecycle for cluster_assembly.
  // DELETE blocked. Identity fields frozen. Only valid state transitions.
  // Terminal states (sealed, abandoned) permanently immutable.
  await db.execute(sql`
    CREATE OR REPLACE FUNCTION build2a_cluster_lifecycle_fn()
    RETURNS TRIGGER LANGUAGE plpgsql AS $$
    BEGIN
      IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION '[Build2A] cluster_assembly DELETE is blocked. Cluster records are permanent.';
      END IF;

      -- Frozen identity fields: never mutable, even during valid transitions
      IF NEW.id IS DISTINCT FROM OLD.id
         OR NEW.claim_id IS DISTINCT FROM OLD.claim_id
         OR NEW.interpretation_rule_version_id IS DISTINCT FROM OLD.interpretation_rule_version_id
         OR NEW.expected_observation_count IS DISTINCT FROM OLD.expected_observation_count
         OR NEW.started_at IS DISTINCT FROM OLD.started_at
      THEN
        RAISE EXCEPTION '[Build2A] cluster_assembly identity fields (id, claim_id, interpretation_rule_version_id, expected_observation_count, started_at) are immutable.';
      END IF;

      -- Terminal states are permanently frozen — no further updates
      IF OLD.assembly_state IN ('sealed', 'abandoned') THEN
        RAISE EXCEPTION '[Build2A] cluster_assembly % is in terminal state ''%'' — no further updates permitted.',
          OLD.id, OLD.assembly_state;
      END IF;

      -- From assembling, only valid target states are allowed
      IF NEW.assembly_state NOT IN ('assembling', 'sealed', 'abandoned') THEN
        RAISE EXCEPTION '[Build2A] cluster_assembly: illegal target state ''%'' for cluster %. Valid: assembling, sealed, abandoned.',
          NEW.assembly_state, OLD.id;
      END IF;

      RETURN NEW;
    END;
    $$
  `);

  // Operational lifecycle for source_processing_ledger.
  // DELETE blocked. Identity/idempotency fields frozen. Status transitions validated.
  await db.execute(sql`
    CREATE OR REPLACE FUNCTION build2a_ledger_lifecycle_fn()
    RETURNS TRIGGER LANGUAGE plpgsql AS $$
    BEGIN
      IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION '[Build2A] source_processing_ledger DELETE is blocked. Ledger records are permanent.';
      END IF;

      -- Frozen identity and idempotency fields
      IF NEW.id IS DISTINCT FROM OLD.id
         OR NEW.evidence_source_registry_id IS DISTINCT FROM OLD.evidence_source_registry_id
         OR NEW.source_record_key IS DISTINCT FROM OLD.source_record_key
         OR NEW.interpretation_rule_version_id IS DISTINCT FROM OLD.interpretation_rule_version_id
         OR NEW.first_seen_at IS DISTINCT FROM OLD.first_seen_at
      THEN
        RAISE EXCEPTION '[Build2A] source_processing_ledger identity and idempotency fields (id, evidence_source_registry_id, source_record_key, interpretation_rule_version_id, first_seen_at) are frozen.';
      END IF;

      -- Validate status transitions
      IF OLD.status = NEW.status THEN
        NULL; -- no status change; other field updates are allowed
      ELSIF OLD.status = 'pending' AND NEW.status = 'processing' THEN
        NULL; -- standard claim
      ELSIF OLD.status = 'processing' AND NEW.status IN ('succeeded', 'failed', 'refused') THEN
        NULL; -- processing → terminal or retriable
      ELSIF OLD.status = 'failed' AND NEW.status = 'processing' THEN
        NULL; -- retry — attempts must be incremented by caller
      ELSIF OLD.status IN ('succeeded', 'refused') THEN
        RAISE EXCEPTION '[Build2A] source_processing_ledger: record % is in terminal status ''%'' — no further transitions permitted.',
          OLD.id, OLD.status;
      ELSE
        RAISE EXCEPTION '[Build2A] source_processing_ledger: illegal status transition ''%'' → ''%'' for record %.',
          OLD.status, NEW.status, OLD.id;
      END IF;

      RETURN NEW;
    END;
    $$
  `);

  // BEFORE INSERT guard for evidence_atom_observation_links.
  // Rejects insertion when the target cluster is not in 'assembling' state.
  // Takes a FOR UPDATE lock on the cluster row to prevent race during assembly.
  await db.execute(sql`
    CREATE OR REPLACE FUNCTION build2a_observation_link_guard_fn()
    RETURNS TRIGGER LANGUAGE plpgsql AS $$
    DECLARE
      v_state TEXT;
    BEGIN
      SELECT assembly_state INTO v_state
      FROM cluster_assembly
      WHERE id = NEW.cluster_assembly_id
      FOR UPDATE;

      IF v_state IS NULL THEN
        RAISE EXCEPTION '[Build2A] evidence_atom_observation_links: cluster_assembly % does not exist.',
          NEW.cluster_assembly_id;
      END IF;

      IF v_state <> 'assembling' THEN
        RAISE EXCEPTION '[Build2A] evidence_atom_observation_links: cannot insert into cluster % — current state is ''%'', must be ''assembling''.',
          NEW.cluster_assembly_id, v_state;
      END IF;

      RETURN NEW;
    END;
    $$
  `);

  // ── Mount Package 2A-2 triggers ───────────────────────────────────────────

  // cluster_assembly: lifecycle (BEFORE UPDATE OR DELETE)
  await db.execute(sql`DROP TRIGGER IF EXISTS build2a_cluster_lifecycle ON cluster_assembly`);
  await db.execute(sql`
    CREATE TRIGGER build2a_cluster_lifecycle
    BEFORE UPDATE OR DELETE ON cluster_assembly
    FOR EACH ROW EXECUTE FUNCTION build2a_cluster_lifecycle_fn()
  `);

  // source_processing_ledger: lifecycle (BEFORE UPDATE OR DELETE)
  await db.execute(sql`DROP TRIGGER IF EXISTS build2a_ledger_lifecycle ON source_processing_ledger`);
  await db.execute(sql`
    CREATE TRIGGER build2a_ledger_lifecycle
    BEFORE UPDATE OR DELETE ON source_processing_ledger
    FOR EACH ROW EXECUTE FUNCTION build2a_ledger_lifecycle_fn()
  `);

  // evidence_atom_observation_links: BEFORE INSERT guard + Tier 1 immutability
  await db.execute(sql`DROP TRIGGER IF EXISTS build2a_observation_link_guard ON evidence_atom_observation_links`);
  await db.execute(sql`
    CREATE TRIGGER build2a_observation_link_guard
    BEFORE INSERT ON evidence_atom_observation_links
    FOR EACH ROW EXECUTE FUNCTION build2a_observation_link_guard_fn()
  `);
  await db.execute(sql`DROP TRIGGER IF EXISTS build2a_no_update_evidence_atom_observation_links ON evidence_atom_observation_links`);
  await db.execute(sql`
    CREATE TRIGGER build2a_no_update_evidence_atom_observation_links
    BEFORE UPDATE ON evidence_atom_observation_links
    FOR EACH ROW EXECUTE FUNCTION build2a_block_all_mutations_fn()
  `);
  await db.execute(sql`DROP TRIGGER IF EXISTS build2a_no_delete_evidence_atom_observation_links ON evidence_atom_observation_links`);
  await db.execute(sql`
    CREATE TRIGGER build2a_no_delete_evidence_atom_observation_links
    BEFORE DELETE ON evidence_atom_observation_links
    FOR EACH ROW EXECUTE FUNCTION build2a_block_all_mutations_fn()
  `);

  // interpreted_evidence_atoms: Tier 1 immutability
  await db.execute(sql`DROP TRIGGER IF EXISTS build2a_no_update_interpreted_evidence_atoms ON interpreted_evidence_atoms`);
  await db.execute(sql`
    CREATE TRIGGER build2a_no_update_interpreted_evidence_atoms
    BEFORE UPDATE ON interpreted_evidence_atoms
    FOR EACH ROW EXECUTE FUNCTION build2a_block_all_mutations_fn()
  `);
  await db.execute(sql`DROP TRIGGER IF EXISTS build2a_no_delete_interpreted_evidence_atoms ON interpreted_evidence_atoms`);
  await db.execute(sql`
    CREATE TRIGGER build2a_no_delete_interpreted_evidence_atoms
    BEFORE DELETE ON interpreted_evidence_atoms
    FOR EACH ROW EXECUTE FUNCTION build2a_block_all_mutations_fn()
  `);

  // refusal_records: Tier 1 immutability
  await db.execute(sql`DROP TRIGGER IF EXISTS build2a_no_update_refusal_records ON refusal_records`);
  await db.execute(sql`
    CREATE TRIGGER build2a_no_update_refusal_records
    BEFORE UPDATE ON refusal_records
    FOR EACH ROW EXECUTE FUNCTION build2a_block_all_mutations_fn()
  `);
  await db.execute(sql`DROP TRIGGER IF EXISTS build2a_no_delete_refusal_records ON refusal_records`);
  await db.execute(sql`
    CREATE TRIGGER build2a_no_delete_refusal_records
    BEFORE DELETE ON refusal_records
    FOR EACH ROW EXECUTE FUNCTION build2a_block_all_mutations_fn()
  `);

  // ── Indexes ───────────────────────────────────────────────────────────────

  // source_processing_ledger
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_spl_status          ON source_processing_ledger (status)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_spl_status_retry    ON source_processing_ledger (status, attempts)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_spl_source_status   ON source_processing_ledger (evidence_source_registry_id, status)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_spl_last_attempted  ON source_processing_ledger (last_attempted_at NULLS FIRST)`);

  // cluster_assembly
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_ca_state_time       ON cluster_assembly (assembly_state, started_at)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_ca_claim_state      ON cluster_assembly (claim_id, assembly_state)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_ca_timeout          ON cluster_assembly (abandon_timeout_at) WHERE assembly_state = 'assembling'`);
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS uq_cluster_assembly_hash
      ON cluster_assembly (cluster_hash)
      WHERE cluster_hash IS NOT NULL
  `);

  // evidence_atom_observation_links
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_eaol_cluster        ON evidence_atom_observation_links (cluster_assembly_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_eaol_source         ON evidence_atom_observation_links (evidence_source_registry_id, source_record_key)`);

  // interpreted_evidence_atoms
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_iea_claim           ON interpreted_evidence_atoms (claim_id, created_at)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_iea_cluster         ON interpreted_evidence_atoms (cluster_assembly_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_iea_rule_version    ON interpreted_evidence_atoms (interpretation_rule_version_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_iea_disposition     ON interpreted_evidence_atoms (disposition)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_iea_dependence      ON interpreted_evidence_atoms (dependence_declaration)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_iea_supersedes      ON interpreted_evidence_atoms (supersedes)`);

  // refusal_records
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_rr_stage            ON refusal_records (refusal_stage, created_at)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_rr_reason_code      ON refusal_records (reason_code)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_rr_claim            ON refusal_records (claim_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_rr_source_key       ON refusal_records (source_observation_key)`);

  // ── Seeds ─────────────────────────────────────────────────────────────────

  // Seed task_completion_v1 interpretation rule.
  // rule_content captures the cluster definition: cluster_size=1 (single agent_task_outcomes
  // observation), abandon_timeout_seconds=300, and the disposition logic table.
  // The cluster_size drives expected_observation_count at assembly time.
  await db.execute(sql`
    INSERT INTO interpretation_rule_versions
      (implementation_key, version_label, is_active, replayable_for_history, rule_content)
    VALUES (
      'task_completion_v1',
      'v1.0',
      true,
      true,
      ${{
        description:
          'Interprets agent-guided task completion from a single resolved agent_task_outcomes record. ' +
          'Disposition derives solely from outcome_status and failure_class. ' +
          'The interpretation is fully replayable from the environment_context captured in the atom.',
        cluster_size: 1,
        abandon_timeout_seconds: 300,
        source_key: 'agent_task_outcomes',
        disposition_logic: {
          supports:    ['completed', 'objective_completed'],
          contradicts: ['failed', 'objective_failed', 'actor_abandonment'],
          excluded:    ['system_error', 'infrastructure_failure', 'timeout', 'technical_error'],
          ambiguous:   ['__other__'],
        },
        dependence_declaration: 'independent',
      }}::jsonb
    )
    ON CONFLICT (implementation_key) DO NOTHING
  `);

  // Seed domain_source_eligibility for agent_instrumentation × agent_task_outcomes
  // × agent_guided_task_completion. Uses NOT EXISTS for functional-index idempotency.
  await db.execute(sql`
    INSERT INTO domain_source_eligibility
      (domain_module_id, evidence_source_registry_id, primitive_id, approval_status, notes)
    SELECT
      dm.id,
      esr.id,
      bp.id,
      'approved',
      'Package 2A-2: agent_task_outcomes authorized for agent_instrumentation under agent_guided_task_completion primitive.'
    FROM domain_modules dm
    CROSS JOIN evidence_source_registry esr
    CROSS JOIN behavioral_primitives bp
    WHERE dm.slug = 'agent_instrumentation'
      AND esr.source_key = 'agent_task_outcomes'
      AND bp.name = 'agent_guided_task_completion'
      AND NOT EXISTS (
        SELECT 1 FROM domain_source_eligibility x
        WHERE x.domain_module_id = dm.id
          AND x.evidence_source_registry_id = esr.id
          AND COALESCE(x.primitive_id, '00000000-0000-0000-0000-000000000000'::uuid)
              = COALESCE(bp.id,         '00000000-0000-0000-0000-000000000000'::uuid)
      )
  `);

  // Seed domain_source_eligibility for agent_instrumentation × agent_tasks
  // × agent_guided_task_completion. (agent_tasks is the direct source for task-initiation
  // evidence when a 2-observation cluster is used in future rules.)
  await db.execute(sql`
    INSERT INTO domain_source_eligibility
      (domain_module_id, evidence_source_registry_id, primitive_id, approval_status, notes)
    SELECT
      dm.id,
      esr.id,
      bp.id,
      'approved',
      'Package 2A-2: agent_tasks authorized for agent_instrumentation under agent_guided_task_completion primitive.'
    FROM domain_modules dm
    CROSS JOIN evidence_source_registry esr
    CROSS JOIN behavioral_primitives bp
    WHERE dm.slug = 'agent_instrumentation'
      AND esr.source_key = 'agent_tasks'
      AND bp.name = 'agent_guided_task_completion'
      AND NOT EXISTS (
        SELECT 1 FROM domain_source_eligibility x
        WHERE x.domain_module_id = dm.id
          AND x.evidence_source_registry_id = esr.id
          AND COALESCE(x.primitive_id, '00000000-0000-0000-0000-000000000000'::uuid)
              = COALESCE(bp.id,         '00000000-0000-0000-0000-000000000000'::uuid)
      )
  `);

  logger.info("[Build2A] Package 2A-2 schema migrations complete.");
}
