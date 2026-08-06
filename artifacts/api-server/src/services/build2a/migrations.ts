/**
 * Build 2A — Database Migrations (Package 2A-1: Registries and Version Foundations)
 *
 * Creates all Package 2A-1 tables, views, triggers, and seed data via
 * CREATE TABLE IF NOT EXISTS / CREATE OR REPLACE VIEW / DROP+CREATE TRIGGER.
 * This follows the established convention: drizzle-kit push is broken in this
 * environment; all schema changes go through db.execute(sql`...`) at startup.
 *
 * ALL operations are additive and idempotent. Zero ALTER statements against
 * any existing table. Calling this function multiple times is safe.
 *
 * Immutability matrix (enforced at Postgres level):
 *   Tier 1 (fully immutable): behavioral_primitives, domain_modules,
 *     base_rate_records, behavioral_entities, behavioral_claims,
 *     behavioral_claim_retirements, version_contexts
 *   Tier 2 (lifecycle-only mutation):
 *     evidence_source_registry (approval_status, deprecated_at only)
 *     domain_source_eligibility (approval_status only)
 *     *_versions tables (is_active only)
 */

import { sql } from "drizzle-orm";
import { logger } from "../../lib/logger.js";

export async function ensureBuild2aTables(): Promise<void> {
  const { db } = await import("@workspace/db");

  logger.info("[Build2A] Running Package 2A-1 schema migrations…");

  // ── 1. behavioral_primitives ───────────────────────────────────────────────
  // Tier 1: fully immutable after insert. Represents observable behavioral
  // concepts that can be assessed from evidence. Does NOT include morality,
  // character, intent, personality, general worthiness, or protected-class concepts.
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS behavioral_primitives (
      id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      name                    TEXT        NOT NULL,
      is_universal            BOOLEAN     NOT NULL DEFAULT true,
      structural_precondition TEXT,
      description             TEXT        NOT NULL DEFAULT '',
      created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (name)
    )
  `);

  // ── 2. domain_modules ──────────────────────────────────────────────────────
  // Tier 1: fully immutable after insert. Represents a scoring domain that
  // groups evidence sources and behavioral primitives for assessment.
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS domain_modules (
      id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      slug         TEXT        NOT NULL,
      display_name TEXT        NOT NULL,
      description  TEXT        NOT NULL DEFAULT '',
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (slug)
    )
  `);

  // ── 3. evidence_source_registry ───────────────────────────────────────────
  // Tier 2: DELETE blocked; only approval_status and deprecated_at may change.
  // Records approved evidence sources. Classification and native reference are
  // immutable once registered.
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS evidence_source_registry (
      id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      source_key             TEXT        NOT NULL,
      display_name           TEXT        NOT NULL,
      source_classification  TEXT        NOT NULL,
      privacy_classification TEXT        NOT NULL,
      native_table_name      TEXT        NOT NULL,
      description            TEXT        NOT NULL DEFAULT '',
      approval_status        TEXT        NOT NULL DEFAULT 'approved',
      deprecated_at          TIMESTAMPTZ,
      created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (source_key),
      CHECK (source_classification IN ('direct', 'derived', 'model_resolution', 'aggregate', 'outcome')),
      CHECK (approval_status IN ('approved', 'deprecated', 'revoked'))
    )
  `);

  // ── 4. domain_source_eligibility ──────────────────────────────────────────
  // Tier 2: DELETE blocked; only approval_status may change.
  // Records the explicit authorization of a source for use within a domain module.
  // Broad source classification alone is insufficient — this row is required.
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS domain_source_eligibility (
      id                         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      domain_module_id           UUID        NOT NULL REFERENCES domain_modules(id),
      evidence_source_registry_id UUID       NOT NULL REFERENCES evidence_source_registry(id),
      primitive_id               UUID        REFERENCES behavioral_primitives(id),
      approval_status            TEXT        NOT NULL DEFAULT 'approved',
      rule_version_id            UUID,
      notes                      TEXT        NOT NULL DEFAULT '',
      created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CHECK (approval_status IN ('approved', 'revoked'))
    )
  `);

  // Functional unique index: (module, source) pair with or without primitive must be unique
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS uq_domain_source_eligibility_key
      ON domain_source_eligibility (
        domain_module_id,
        evidence_source_registry_id,
        COALESCE(primitive_id, '00000000-0000-0000-0000-000000000000'::uuid)
      )
  `);

  // ── 5. interpretation_rule_versions ───────────────────────────────────────
  // Tier 2: DELETE blocked; only is_active may change.
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS interpretation_rule_versions (
      id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      implementation_key   TEXT        NOT NULL,
      version_label        TEXT        NOT NULL,
      is_active            BOOLEAN     NOT NULL DEFAULT false,
      replayable_for_history BOOLEAN   NOT NULL DEFAULT true,
      rule_content         JSONB       NOT NULL DEFAULT '{}',
      created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (implementation_key)
    )
  `);

  // ── 6. quality_rule_versions ──────────────────────────────────────────────
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS quality_rule_versions (
      id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      implementation_key   TEXT        NOT NULL,
      version_label        TEXT        NOT NULL,
      is_active            BOOLEAN     NOT NULL DEFAULT false,
      replayable_for_history BOOLEAN   NOT NULL DEFAULT true,
      rule_content         JSONB       NOT NULL DEFAULT '{}',
      created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (implementation_key)
    )
  `);

  // ── 7. integrity_rule_versions ────────────────────────────────────────────
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS integrity_rule_versions (
      id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      implementation_key   TEXT        NOT NULL,
      version_label        TEXT        NOT NULL,
      is_active            BOOLEAN     NOT NULL DEFAULT false,
      replayable_for_history BOOLEAN   NOT NULL DEFAULT true,
      rule_content         JSONB       NOT NULL DEFAULT '{}',
      created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (implementation_key)
    )
  `);

  // ── 8. fusion_operator_versions ───────────────────────────────────────────
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS fusion_operator_versions (
      id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      implementation_key   TEXT        NOT NULL,
      version_label        TEXT        NOT NULL,
      is_active            BOOLEAN     NOT NULL DEFAULT false,
      replayable_for_history BOOLEAN   NOT NULL DEFAULT true,
      operator_description TEXT        NOT NULL DEFAULT '',
      parameters           JSONB       NOT NULL DEFAULT '{}',
      created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (implementation_key)
    )
  `);

  // ── 9. knowledge_sufficiency_predicate_versions ───────────────────────────
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS knowledge_sufficiency_predicate_versions (
      id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      implementation_key      TEXT        NOT NULL,
      version_label           TEXT        NOT NULL,
      is_active               BOOLEAN     NOT NULL DEFAULT false,
      replayable_for_history  BOOLEAN     NOT NULL DEFAULT true,
      predicate_expression    TEXT        NOT NULL DEFAULT '',
      parameters              JSONB       NOT NULL DEFAULT '{}',
      created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (implementation_key)
    )
  `);

  // ── 10. projection_function_versions ─────────────────────────────────────
  // The approved sl_binomial_projection_v1 is seeded below.
  // No free-text projection version in version_contexts — FK only.
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS projection_function_versions (
      id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      implementation_key   TEXT        NOT NULL,
      version_label        TEXT        NOT NULL,
      is_active            BOOLEAN     NOT NULL DEFAULT false,
      replayable_for_history BOOLEAN   NOT NULL DEFAULT true,
      formula_description  TEXT        NOT NULL,
      parameters           JSONB       NOT NULL DEFAULT '{}',
      created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (implementation_key)
    )
  `);

  // ── 11. base_rate_records ─────────────────────────────────────────────────
  // Tier 1: fully immutable. Backward lineage: new_row.supersedes = old_row.id.
  // Never update old row. Constraints enforced by CHECK:
  //   provisional_unknown → value IS NULL, sufficiency_status != 'sufficient'
  //   all other source_types → value IS NOT NULL, value IN [0,1]
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS base_rate_records (
      id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      source_type         TEXT        NOT NULL,
      scope               TEXT        NOT NULL,
      value               NUMERIC,
      sufficiency_status  TEXT        NOT NULL,
      approval_authority  TEXT        NOT NULL,
      derivation_method   TEXT        NOT NULL,
      effective_from      TIMESTAMPTZ NOT NULL,
      effective_to        TIMESTAMPTZ,
      supersedes          UUID        REFERENCES base_rate_records(id),
      notes               TEXT        NOT NULL DEFAULT '',
      created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CHECK (source_type IN ('empirical', 'domain_expert', 'documented_neutral', 'provisional_unknown')),
      CHECK (sufficiency_status IN ('sufficient', 'insufficient', 'provisional')),
      CHECK (
        (source_type = 'provisional_unknown' AND value IS NULL AND sufficiency_status <> 'sufficient')
        OR
        (source_type <> 'provisional_unknown' AND value IS NOT NULL AND value >= 0 AND value <= 1)
      )
    )
  `);

  // ── 12. behavioral_entities ───────────────────────────────────────────────
  // Tier 1: fully immutable. Stable identity by (entity_type, native_system, native_id).
  // Human Tony and autonomous-agent Tony CANNOT collide because entity_type differs.
  // native_id for human_user is the user's internal ID (never raw telefono).
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS behavioral_entities (
      id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      entity_type  TEXT        NOT NULL,
      native_system TEXT       NOT NULL,
      native_id    TEXT        NOT NULL,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (entity_type, native_system, native_id),
      CHECK (entity_type IN ('human_user', 'autonomous_agent', 'financial_instrument', 'merchant'))
    )
  `);

  // ── 13. version_contexts ──────────────────────────────────────────────────
  // Tier 1: fully immutable. Every referenced component must be pinned.
  // No free-text projection version — use FK to projection_function_versions.
  // FKs are nullable so version_contexts can be created before all version
  // tables are seeded (Package 2A-1 seeds only projection_function_versions).
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS version_contexts (
      id                                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      label                                    TEXT        NOT NULL,
      evidence_source_registry_snapshot_hash   TEXT        NOT NULL,
      domain_module_version_map                JSONB       NOT NULL DEFAULT '{}',
      interpretation_rule_version_id           UUID        REFERENCES interpretation_rule_versions(id),
      quality_rule_version_id                  UUID        REFERENCES quality_rule_versions(id),
      integrity_rule_version_id                UUID        REFERENCES integrity_rule_versions(id),
      fusion_operator_version_id               UUID        REFERENCES fusion_operator_versions(id),
      knowledge_sufficiency_predicate_version_id UUID      REFERENCES knowledge_sufficiency_predicate_versions(id),
      base_rate_record_id                      UUID        REFERENCES base_rate_records(id),
      projection_function_version_id           UUID        REFERENCES projection_function_versions(id),
      created_at                               TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // ── 14. behavioral_claims ─────────────────────────────────────────────────
  // Tier 1: fully immutable. Backward lineage: supersedes = prior claim's id.
  // window_end > window_start enforced by CHECK.
  // falsifiability_condition must be non-empty.
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS behavioral_claims (
      id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      entity_id              UUID        NOT NULL REFERENCES behavioral_entities(id),
      primitive_id           UUID        NOT NULL REFERENCES behavioral_primitives(id),
      domain_module_id       UUID        NOT NULL REFERENCES domain_modules(id),
      window_start           TIMESTAMPTZ NOT NULL,
      window_end             TIMESTAMPTZ NOT NULL,
      falsifiability_condition TEXT      NOT NULL,
      version_context_id     UUID        REFERENCES version_contexts(id),
      supersedes             UUID        REFERENCES behavioral_claims(id),
      created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CHECK (window_end > window_start),
      CHECK (falsifiability_condition <> '')
    )
  `);

  // ── 15. behavioral_claim_retirements ──────────────────────────────────────
  // Tier 1: fully immutable additive log. A Claim is retired by inserting
  // a retirement row. Never update the Claim. UNIQUE(claim_id) prevents
  // duplicate retirements (specification does not permit multiple events).
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS behavioral_claim_retirements (
      id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      claim_id         UUID        NOT NULL REFERENCES behavioral_claims(id),
      retirement_reason TEXT       NOT NULL,
      retired_by       TEXT        NOT NULL,
      retired_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (claim_id)
    )
  `);

  // ── Trigger functions ──────────────────────────────────────────────────────

  // Tier 1: block all mutations (UPDATE and DELETE)
  await db.execute(sql`
    CREATE OR REPLACE FUNCTION build2a_block_all_mutations_fn()
    RETURNS TRIGGER LANGUAGE plpgsql AS $$
    BEGIN
      RAISE EXCEPTION '[Build2A] Tier 1 table "%" is fully immutable — UPDATE and DELETE are blocked. Create a new row instead.',
        TG_TABLE_NAME;
    END;
    $$
  `);

  // Tier 2 — evidence_source_registry: allow approval_status + deprecated_at only
  await db.execute(sql`
    CREATE OR REPLACE FUNCTION build2a_esr_lifecycle_fn()
    RETURNS TRIGGER LANGUAGE plpgsql AS $$
    BEGIN
      IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION '[Build2A] Tier 2: evidence_source_registry DELETE is blocked. Source records are permanent.';
      END IF;
      IF NEW.id IS DISTINCT FROM OLD.id
         OR NEW.source_key IS DISTINCT FROM OLD.source_key
         OR NEW.display_name IS DISTINCT FROM OLD.display_name
         OR NEW.source_classification IS DISTINCT FROM OLD.source_classification
         OR NEW.privacy_classification IS DISTINCT FROM OLD.privacy_classification
         OR NEW.native_table_name IS DISTINCT FROM OLD.native_table_name
         OR NEW.description IS DISTINCT FROM OLD.description
         OR NEW.created_at IS DISTINCT FROM OLD.created_at
      THEN
        RAISE EXCEPTION '[Build2A] Tier 2: only approval_status and deprecated_at may be updated on evidence_source_registry.';
      END IF;
      RETURN NEW;
    END;
    $$
  `);

  // Tier 2 — domain_source_eligibility: allow approval_status only
  await db.execute(sql`
    CREATE OR REPLACE FUNCTION build2a_dse_lifecycle_fn()
    RETURNS TRIGGER LANGUAGE plpgsql AS $$
    BEGIN
      IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION '[Build2A] Tier 2: domain_source_eligibility DELETE is blocked. Eligibility records are permanent.';
      END IF;
      IF NEW.id IS DISTINCT FROM OLD.id
         OR NEW.domain_module_id IS DISTINCT FROM OLD.domain_module_id
         OR NEW.evidence_source_registry_id IS DISTINCT FROM OLD.evidence_source_registry_id
         OR NEW.primitive_id IS DISTINCT FROM OLD.primitive_id
         OR NEW.rule_version_id IS DISTINCT FROM OLD.rule_version_id
         OR NEW.notes IS DISTINCT FROM OLD.notes
         OR NEW.created_at IS DISTINCT FROM OLD.created_at
      THEN
        RAISE EXCEPTION '[Build2A] Tier 2: only approval_status may be updated on domain_source_eligibility.';
      END IF;
      RETURN NEW;
    END;
    $$
  `);

  // Tier 2 — version tables: allow is_active only
  // Uses to_jsonb row comparison so ALL columns are covered generically,
  // including table-specific columns like rule_content, formula_description, etc.
  // Removing 'is_active' from both sides before comparison means only changes
  // to other columns trigger the exception.
  await db.execute(sql`
    CREATE OR REPLACE FUNCTION build2a_version_lifecycle_fn()
    RETURNS TRIGGER LANGUAGE plpgsql AS $$
    BEGIN
      IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION '[Build2A] Tier 2: version table "%" DELETE is blocked. Version records are permanent.',
          TG_TABLE_NAME;
      END IF;
      -- Block any update that changes anything other than is_active.
      -- to_jsonb row comparison covers all columns (common + table-specific)
      -- without needing to enumerate them per table.
      IF (to_jsonb(NEW) - 'is_active') IS DISTINCT FROM (to_jsonb(OLD) - 'is_active') THEN
        RAISE EXCEPTION '[Build2A] Tier 2: only is_active may be updated on version table "%". An implementation change requires a new row with a new implementation_key.',
          TG_TABLE_NAME;
      END IF;
      RETURN NEW;
    END;
    $$
  `);

  // ── Apply triggers — Tier 1 tables ────────────────────────────────────────

  for (const tbl of [
    'behavioral_primitives',
    'domain_modules',
    'base_rate_records',
    'behavioral_entities',
    'behavioral_claims',
    'behavioral_claim_retirements',
    'version_contexts',
  ] as const) {
    await db.execute(sql.raw(`DROP TRIGGER IF EXISTS build2a_no_update_${tbl} ON ${tbl}`));
    await db.execute(sql.raw(`
      CREATE TRIGGER build2a_no_update_${tbl}
        BEFORE UPDATE ON ${tbl}
        FOR EACH ROW EXECUTE FUNCTION build2a_block_all_mutations_fn()
    `));
    await db.execute(sql.raw(`DROP TRIGGER IF EXISTS build2a_no_delete_${tbl} ON ${tbl}`));
    await db.execute(sql.raw(`
      CREATE TRIGGER build2a_no_delete_${tbl}
        BEFORE DELETE ON ${tbl}
        FOR EACH ROW EXECUTE FUNCTION build2a_block_all_mutations_fn()
    `));
  }

  // ── Apply triggers — Tier 2 tables ────────────────────────────────────────

  // evidence_source_registry
  await db.execute(sql`DROP TRIGGER IF EXISTS build2a_esr_lifecycle ON evidence_source_registry`);
  await db.execute(sql`
    CREATE TRIGGER build2a_esr_lifecycle
      BEFORE UPDATE OR DELETE ON evidence_source_registry
      FOR EACH ROW EXECUTE FUNCTION build2a_esr_lifecycle_fn()
  `);

  // domain_source_eligibility
  await db.execute(sql`DROP TRIGGER IF EXISTS build2a_dse_lifecycle ON domain_source_eligibility`);
  await db.execute(sql`
    CREATE TRIGGER build2a_dse_lifecycle
      BEFORE UPDATE OR DELETE ON domain_source_eligibility
      FOR EACH ROW EXECUTE FUNCTION build2a_dse_lifecycle_fn()
  `);

  // Version tables
  for (const vtbl of [
    'interpretation_rule_versions',
    'quality_rule_versions',
    'integrity_rule_versions',
    'fusion_operator_versions',
    'knowledge_sufficiency_predicate_versions',
    'projection_function_versions',
  ] as const) {
    await db.execute(sql.raw(`DROP TRIGGER IF EXISTS build2a_version_lifecycle_${vtbl} ON ${vtbl}`));
    await db.execute(sql.raw(`
      CREATE TRIGGER build2a_version_lifecycle_${vtbl}
        BEFORE UPDATE OR DELETE ON ${vtbl}
        FOR EACH ROW EXECUTE FUNCTION build2a_version_lifecycle_fn()
    `));
  }

  // ── Views ──────────────────────────────────────────────────────────────────

  // latest_behavioral_claim_v: a Claim is current when:
  //   1. No newer Claim has supersedes = c.id (no one points at it as the prior)
  //   2. No retirement row exists for it
  // NOT determined by timestamp alone.
  await db.execute(sql`
    CREATE OR REPLACE VIEW latest_behavioral_claim_v AS
    SELECT c.*
    FROM behavioral_claims c
    WHERE NOT EXISTS (
      SELECT 1 FROM behavioral_claims newer
      WHERE newer.supersedes = c.id
    )
    AND NOT EXISTS (
      SELECT 1 FROM behavioral_claim_retirements r
      WHERE r.claim_id = c.id
    )
  `);

  // latest_base_rate_record_v: a record is current when no newer row supersedes it.
  await db.execute(sql`
    CREATE OR REPLACE VIEW latest_base_rate_record_v AS
    SELECT b.*
    FROM base_rate_records b
    WHERE NOT EXISTS (
      SELECT 1 FROM base_rate_records newer
      WHERE newer.supersedes = b.id
    )
  `);

  // ── Indexes ────────────────────────────────────────────────────────────────
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_behavioral_claims_entity ON behavioral_claims (entity_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_behavioral_claims_primitive ON behavioral_claims (primitive_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_behavioral_claims_domain ON behavioral_claims (domain_module_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_behavioral_claims_window ON behavioral_claims (window_start, window_end)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_behavioral_claims_supersedes ON behavioral_claims (supersedes)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_behavioral_claim_retirements_claim ON behavioral_claim_retirements (claim_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_base_rate_records_supersedes ON base_rate_records (supersedes)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_base_rate_records_scope ON base_rate_records (scope, source_type)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_behavioral_entities_type_system ON behavioral_entities (entity_type, native_system)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_dse_domain_module ON domain_source_eligibility (domain_module_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_dse_source ON domain_source_eligibility (evidence_source_registry_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_esr_source_key ON evidence_source_registry (source_key)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_esr_approval_status ON evidence_source_registry (approval_status)`);

  // ── Seeds ──────────────────────────────────────────────────────────────────

  // Seed 12 behavioral primitives (approved, observable, non-moralistic)
  const primitives = [
    {
      name: 'on_time_payment_pattern',
      is_universal: true,
      structural_precondition: null,
      description: 'Recurring behavior of making payments at or before their due date across multiple payment events.',
    },
    {
      name: 'payment_timing_consistency',
      is_universal: true,
      structural_precondition: null,
      description: 'Stability of payment timing relative to due dates across multiple payment events; low variance indicates high consistency.',
    },
    {
      name: 'advance_payment_initiation',
      is_universal: true,
      structural_precondition: null,
      description: 'Initiating payment before the deadline without external prompting; measured as days-in-advance at payment time.',
    },
    {
      name: 'multi_service_financial_utilization',
      is_universal: true,
      structural_precondition: null,
      description: 'Using multiple distinct financial service types (utilities, telecoms, top-ups, P2P) across the platform over a measured window.',
    },
    {
      name: 'platform_access_regularity',
      is_universal: true,
      structural_precondition: null,
      description: 'Regularity of authenticated platform access sessions; measured by session-hour distribution entropy and inter-session gap stability.',
    },
    {
      name: 'working_balance_maintenance',
      is_universal: true,
      structural_precondition: null,
      description: 'Maintaining a positive working balance sufficient to support intended transaction activity over time.',
    },
    {
      name: 'fund_loading_method_stability',
      is_universal: true,
      structural_precondition: null,
      description: 'Consistent use of the same fund-loading methods (OXXO, SPEI, card) over time; indicates stable financial infrastructure.',
    },
    {
      name: 'identity_document_provision',
      is_universal: false,
      structural_precondition: 'kyc_verification_initiated',
      description: 'Providing required identity documents when KYC verification has been initiated; applicable only when KYC process is offered.',
    },
    {
      name: 'communication_response_rate',
      is_universal: true,
      structural_precondition: null,
      description: 'Rate of meaningful response to platform-initiated communications (WhatsApp, push) within a defined latency window.',
    },
    {
      name: 'post_disruption_payment_recovery',
      is_universal: false,
      structural_precondition: 'prior_payment_disruption_observed',
      description: 'Returning to on-time payment behavior after a confirmed missed or late payment event; applicable only when prior disruption is observed.',
    },
    {
      name: 'financial_feature_exploration',
      is_universal: true,
      structural_precondition: null,
      description: 'Progressive exploration of available financial product features and service categories over time; breadth not depth.',
    },
    {
      name: 'agent_guided_task_completion',
      is_universal: false,
      structural_precondition: 'agent_guided_session_active',
      description: 'Completing tasks initiated through agent-guided interactions (Paula/Tony); applicable only when an agent session has been initiated.',
    },
  ];

  for (const p of primitives) {
    await db.execute(sql`
      INSERT INTO behavioral_primitives (name, is_universal, structural_precondition, description)
      VALUES (${p.name}, ${p.is_universal}, ${p.structural_precondition ?? null}, ${p.description})
      ON CONFLICT (name) DO NOTHING
    `);
  }

  // Seed domain modules (aligned to PTI scoring dimensions + agent instrumentation)
  const modules = [
    { slug: 'payment_reliability',    display_name: 'Payment Reliability',    description: 'Assesses the consistency, timeliness, and reliability of payment behavior. Maps to PTI PR dimension (30% weight in v5).' },
    { slug: 'behavioral_consistency', display_name: 'Behavioral Consistency',  description: 'Assesses stability of platform engagement patterns, session regularity, and multi-channel behavior. Maps to PTI BC dimension (20% weight in v5).' },
    { slug: 'engagement_depth',       display_name: 'Engagement Depth',        description: 'Assesses breadth of service adoption, identity verification depth, and feature exploration. Maps to PTI ED dimension (25% weight in v5).' },
    { slug: 'cash_flow_stability',    display_name: 'Cash Flow Stability',      description: 'Assesses balance maintenance, fund loading patterns, and overall financial flow stability. Maps to PTI CF dimension (25% weight in v5).' },
    { slug: 'agent_instrumentation',  display_name: 'Agent Instrumentation',   description: 'Observes agent task completion, tool call patterns, and prediction accuracy. Not a PTI scoring dimension; governs agent behavioral evidence.' },
  ];

  for (const m of modules) {
    await db.execute(sql`
      INSERT INTO domain_modules (slug, display_name, description)
      VALUES (${m.slug}, ${m.display_name}, ${m.description})
      ON CONFLICT (slug) DO NOTHING
    `);
  }

  // Seed evidence_source_registry — approved Build 1A sources only.
  // Classifications are exact as specified: direct/direct/derived/model_resolution/aggregate/outcome.
  // These sources are NOT automatically authorized for every domain — explicit
  // domain_source_eligibility rows are required (seeded by later packages).
  const sources = [
    {
      source_key: 'agent_tasks',
      display_name: 'Agent Tasks',
      source_classification: 'direct',
      privacy_classification: 'operational',
      native_table_name: 'agent_tasks',
      description: 'Direct record of agent task invocations including task class, status, and telefono association.',
    },
    {
      source_key: 'agent_tool_calls',
      display_name: 'Agent Tool Calls',
      source_classification: 'direct',
      privacy_classification: 'operational',
      native_table_name: 'agent_tool_calls',
      description: 'Direct record of individual tool calls made within agent tasks, including tool name, status, and redacted I/O summaries.',
    },
    {
      source_key: 'agent_task_outcomes',
      display_name: 'Agent Task Outcomes',
      source_classification: 'derived',
      privacy_classification: 'operational',
      native_table_name: 'agent_task_outcomes',
      description: 'Derived outcome records for agent tasks; derived from task completion state and external action evidence.',
    },
    {
      source_key: 'agent_prediction_resolutions',
      display_name: 'Agent Prediction Resolutions',
      source_classification: 'model_resolution',
      privacy_classification: 'operational',
      native_table_name: 'agent_prediction_resolutions',
      description: 'Model resolution records linking agent predictions to observed outcomes; classification reflects model-grounded evaluation.',
    },
    {
      source_key: 'pti_score_input_snapshots',
      display_name: 'PTI Score Input Snapshots',
      source_classification: 'aggregate',
      privacy_classification: 'financial_behavioral',
      native_table_name: 'pti_score_input_snapshots',
      description: 'Aggregate PTI input snapshots capturing the full behavioral signal set used to compute a PTI score at a point in time.',
    },
    {
      source_key: 'loan_outcomes',
      display_name: 'Loan Outcomes',
      source_classification: 'outcome',
      privacy_classification: 'financial_outcome',
      native_table_name: 'loan_outcomes',
      description: 'Loan origination and repayment outcome records from lending partners; stored with hashed identifiers only.',
    },
  ];

  for (const s of sources) {
    await db.execute(sql`
      INSERT INTO evidence_source_registry
        (source_key, display_name, source_classification, privacy_classification, native_table_name, description)
      VALUES
        (${s.source_key}, ${s.display_name}, ${s.source_classification},
         ${s.privacy_classification}, ${s.native_table_name}, ${s.description})
      ON CONFLICT (source_key) DO NOTHING
    `);
  }

  // Seed sl_binomial_projection_v1 — the only Package 2A-1 approved projection key.
  // Formula: P = b + a × u  (base rate + adjustment × uncertainty factor)
  await db.execute(sql`
    INSERT INTO projection_function_versions
      (implementation_key, version_label, is_active, replayable_for_history, formula_description, parameters)
    VALUES (
      'sl_binomial_projection_v1',
      'v1.0',
      true,
      true,
      'P = b + a × u',
      '{"description": "Binomial projection: P is the projected probability, b is the base rate, a is the adjustment coefficient, u is the uncertainty factor. Requires a non-null base rate record.", "inputs": ["base_rate_b", "adjustment_a", "uncertainty_u"], "output": "projected_probability_P"}'::jsonb
    )
    ON CONFLICT (implementation_key) DO NOTHING
  `);

  logger.info("[Build2A] Package 2A-1 schema migrations complete.");
}
