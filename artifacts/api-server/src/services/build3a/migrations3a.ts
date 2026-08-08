/**
 * Build 3A — Database Migrations (Trajectory Foundation)
 *
 * Peer to Build 1A and Build 2A. Strictly additive — zero ALTER on any locked object.
 * Must run after Packages 2A-1 through 2A-6 are confirmed ready.
 *
 * Tables created (all new):
 *   Tier 1 (fully immutable, UPDATE+DELETE trigger-blocked from INSERT time):
 *     - trajectory_governance_contexts
 *     - behavioral_trajectories
 *     - behavioral_trajectory_members
 *     - trajectory_refusal_records
 *   Tier 2 (DELETE blocked, is_active sole mutable field):
 *     - trajectory_rule_versions
 *   Operational (DELETE blocked, status lifecycle):
 *     - trajectory_computation_ledger
 *
 * Views created:
 *   - latest_behavioral_trajectory_v      (chain-tip)
 *   - latest_trajectory_governance_context_v  (chain-tip)
 *
 * Seed rows:
 *   - trajectory_rule_versions:         finite_difference_trajectory_v1
 *   - trajectory_governance_contexts:   agent_instrumentation domain-level, epsilon=0.01 (CANARY ONLY)
 *
 * Locked Build 2A objects (refusal_records, versionDispatch.ts, all 2A tables): NEVER TOUCHED.
 */

import { sql } from "drizzle-orm";
import { logger } from "../../lib/logger.js";

const FORMULA_DESCRIPTION = [
  "Build 3A finite-difference trajectory v1.",
  "PRIMARY — evidentiary trajectory (belief/disbelief/uncertainty):",
  "  For consecutive opinions ordered by evaluation_time ASC, id ASC:",
  "  elapsed_seconds = EXTRACT(EPOCH FROM t2.evaluation_time - t1.evaluation_time)  [seconds, canonical unit]",
  "  delta_X = X2 - X1  (X ∈ {belief, disbelief, uncertainty})",
  "  velocity_X = delta_X / elapsed_seconds",
  "SEPARATELY OBSERVABLE — derived scalars (never conflated with evidentiary trajectory):",
  "  projected_probability_i = belief_i + base_rate_i * uncertainty_i  (sl_binomial_projection_v1 formula)",
  "  delta_base_rate = base_rate_2 - base_rate_1",
  "  delta_projected_probability = pp_2 - pp_1",
  "  velocity_base_rate, velocity_projected_probability: same formula.",
  "ACCELERATION (3-opinion only, irregular-time Gaussian formula):",
  "  v12 = (X2 - X1) / (t2 - t1);  v23 = (X3 - X2) / (t3 - t2)",
  "  acceleration_X = 2*(v23 - v12) / (t3 - t1)  [all intervals in seconds]",
  "ZERO ELAPSED TIME: if elapsed_seconds == 0 on any required adjacent pair →",
  "  write trajectory_refusal_records (reason_code=degenerate_zero_elapsed_time), never divide by zero.",
  "DIRECTION (only when governance status=applied):",
  "  delta > +epsilon → increasing;  delta < -epsilon → decreasing;  else → stable.",
  "  One shared epsilon across belief/disbelief/uncertainty ([0,1] simplex).",
  "Changing these formulas requires a new implementation_key; this row is immutable once active.",
].join("\n");

export async function ensureBuild3aTables(): Promise<void> {
  const { db } = await import("@workspace/db");

  logger.info("[Build3A] Running Build 3A schema migrations…");

  // ── 1. trajectory_rule_versions (Tier 2) ─────────────────────────────────
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS trajectory_rule_versions (
      id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      implementation_key  TEXT        NOT NULL,
      version_label       TEXT        NOT NULL,
      is_active           BOOLEAN     NOT NULL DEFAULT true,
      formula_description TEXT        NOT NULL,
      created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (implementation_key)
    )
  `);

  // Tier 2: DELETE blocked; only is_active may change
  await db.execute(sql`
    CREATE OR REPLACE FUNCTION build3a_trv_block_delete() RETURNS trigger AS $$
    BEGIN
      RAISE EXCEPTION '[Build3A] trajectory_rule_versions rows cannot be deleted.';
    END;
    $$ LANGUAGE plpgsql
  `);
  await db.execute(sql`DROP TRIGGER IF EXISTS trg_build3a_trv_block_delete ON trajectory_rule_versions`);
  await db.execute(sql`
    CREATE TRIGGER trg_build3a_trv_block_delete
      BEFORE DELETE ON trajectory_rule_versions
      FOR EACH ROW EXECUTE FUNCTION build3a_trv_block_delete()
  `);

  await db.execute(sql`
    CREATE OR REPLACE FUNCTION build3a_trv_guard_update() RETURNS trigger AS $$
    BEGIN
      IF NEW.implementation_key   IS DISTINCT FROM OLD.implementation_key
      OR NEW.version_label        IS DISTINCT FROM OLD.version_label
      OR NEW.formula_description  IS DISTINCT FROM OLD.formula_description
      OR NEW.created_at           IS DISTINCT FROM OLD.created_at THEN
        RAISE EXCEPTION '[Build3A] trajectory_rule_versions: only is_active may be updated.';
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `);
  await db.execute(sql`DROP TRIGGER IF EXISTS trg_build3a_trv_guard_update ON trajectory_rule_versions`);
  await db.execute(sql`
    CREATE TRIGGER trg_build3a_trv_guard_update
      BEFORE UPDATE ON trajectory_rule_versions
      FOR EACH ROW EXECUTE FUNCTION build3a_trv_guard_update()
  `);

  // Seed finite_difference_trajectory_v1
  await db.execute(sql`
    INSERT INTO trajectory_rule_versions (implementation_key, version_label, is_active, formula_description)
    VALUES ('finite_difference_trajectory_v1', 'v1.0', true, ${FORMULA_DESCRIPTION})
    ON CONFLICT (implementation_key) DO NOTHING
  `);

  // ── 2. trajectory_governance_contexts (Tier 1) ───────────────────────────
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS trajectory_governance_contexts (
      id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      scope_type        TEXT        NOT NULL,
      domain_module_id  UUID        REFERENCES domain_modules(id),
      claim_id          UUID        REFERENCES behavioral_claims(id),
      direction_epsilon NUMERIC     NOT NULL,
      approval_authority TEXT       NOT NULL,
      derivation_method TEXT        NOT NULL,
      effective_from    TIMESTAMPTZ,
      effective_until   TIMESTAMPTZ,
      version           TEXT        NOT NULL DEFAULT 'v1',
      supersedes        UUID        REFERENCES trajectory_governance_contexts(id),
      created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT tgc_scope_check CHECK (scope_type IN ('domain_module', 'behavioral_claim')),
      CONSTRAINT tgc_scope_xor CHECK (
        (scope_type = 'domain_module'    AND domain_module_id IS NOT NULL AND claim_id IS NULL)
        OR
        (scope_type = 'behavioral_claim' AND claim_id IS NOT NULL AND domain_module_id IS NULL)
      ),
      CONSTRAINT tgc_epsilon_positive CHECK (direction_epsilon > 0)
    )
  `);

  await db.execute(sql`
    CREATE OR REPLACE FUNCTION build3a_tgc_immutable() RETURNS trigger AS $$
    BEGIN
      RAISE EXCEPTION '[Build3A] trajectory_governance_contexts rows are immutable — UPDATE and DELETE are not permitted.';
    END;
    $$ LANGUAGE plpgsql
  `);
  await db.execute(sql`DROP TRIGGER IF EXISTS trg_build3a_tgc_immutable ON trajectory_governance_contexts`);
  await db.execute(sql`
    CREATE TRIGGER trg_build3a_tgc_immutable
      BEFORE UPDATE OR DELETE ON trajectory_governance_contexts
      FOR EACH ROW EXECUTE FUNCTION build3a_tgc_immutable()
  `);

  // Seed canary-only governance context for agent_instrumentation domain (epsilon=0.01)
  // NOT approved as a production threshold — canary only.
  await db.execute(sql`
    INSERT INTO trajectory_governance_contexts (
      scope_type, domain_module_id, direction_epsilon, approval_authority, derivation_method, version
    )
    SELECT
      'domain_module',
      dm.id,
      0.01,
      'Founder / Architecture Review',
      'Experimental Build 3A canary threshold selected only to exercise categorical direction behavior. It is not empirically calibrated and is not approved as a production behavioral-change threshold.',
      'v1'
    FROM domain_modules dm
    WHERE dm.slug = 'agent_instrumentation'
      AND NOT EXISTS (
        SELECT 1 FROM trajectory_governance_contexts tgc2
        WHERE tgc2.domain_module_id = dm.id
          AND tgc2.scope_type = 'domain_module'
          AND tgc2.supersedes IS NULL
      )
  `);

  // ── 3. behavioral_trajectories (Tier 1) ──────────────────────────────────
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS behavioral_trajectories (
      id                              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      claim_id                        UUID        NOT NULL REFERENCES behavioral_claims(id),
      start_opinion_id                UUID        NOT NULL REFERENCES opinions(id),
      end_opinion_id                  UUID        NOT NULL REFERENCES opinions(id),
      observation_count               INTEGER     NOT NULL,
      elapsed_seconds                 NUMERIC     NOT NULL,
      -- PRIMARY evidentiary trajectory (belief/disbelief/uncertainty vector)
      delta_belief                    NUMERIC     NOT NULL,
      delta_disbelief                 NUMERIC     NOT NULL,
      delta_uncertainty               NUMERIC     NOT NULL,
      -- SEPARATELY OBSERVABLE derived scalars (diagnostic/governance, never conflated with evidentiary)
      delta_base_rate                 NUMERIC     NOT NULL,
      delta_projected_probability     NUMERIC     NOT NULL,
      -- Velocities (per second)
      velocity_belief                 NUMERIC     NOT NULL,
      velocity_disbelief              NUMERIC     NOT NULL,
      velocity_uncertainty            NUMERIC     NOT NULL,
      velocity_base_rate              NUMERIC     NOT NULL,
      velocity_projected_probability  NUMERIC     NOT NULL,
      -- Accelerations (nullable — populated only when observation_count = 3)
      acceleration_belief             NUMERIC,
      acceleration_disbelief          NUMERIC,
      acceleration_uncertainty        NUMERIC,
      acceleration_base_rate          NUMERIC,
      acceleration_projected_probability NUMERIC,
      -- Categorical direction (nullable — only when governance status = 'applied')
      direction_belief                TEXT        CHECK (direction_belief    IN ('increasing','decreasing','stable')),
      direction_disbelief             TEXT        CHECK (direction_disbelief IN ('increasing','decreasing','stable')),
      direction_uncertainty           TEXT        CHECK (direction_uncertainty IN ('increasing','decreasing','stable')),
      -- Direction governance — three-state
      direction_governance_status     TEXT        NOT NULL,
      trajectory_rule_version_id      UUID        NOT NULL REFERENCES trajectory_rule_versions(id),
      trajectory_governance_context_id UUID       REFERENCES trajectory_governance_contexts(id),
      version_context_id              UUID        REFERENCES version_contexts(id),
      supersedes                      UUID        REFERENCES behavioral_trajectories(id),
      replay_checksum                 TEXT        NOT NULL,
      created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      -- Structural invariants
      CONSTRAINT bt_obs_count_floor       CHECK (observation_count >= 2),
      CONSTRAINT bt_elapsed_positive      CHECK (elapsed_seconds > 0),
      CONSTRAINT bt_gov_status_values     CHECK (direction_governance_status IN ('applied','unavailable_no_governance','unavailable_ambiguous_governance')),
      -- HARD CHECK: direction fields must be fully consistent with governance status
      CONSTRAINT bt_direction_governance_integrity CHECK (
        (direction_governance_status = 'applied'
          AND trajectory_governance_context_id IS NOT NULL
          AND direction_belief    IS NOT NULL
          AND direction_disbelief IS NOT NULL
          AND direction_uncertainty IS NOT NULL)
        OR
        (direction_governance_status IN ('unavailable_no_governance','unavailable_ambiguous_governance')
          AND trajectory_governance_context_id IS NULL
          AND direction_belief    IS NULL
          AND direction_disbelief IS NULL
          AND direction_uncertainty IS NULL)
      ),
      -- Acceleration present iff observation_count >= 3
      CONSTRAINT bt_acceleration_consistency CHECK (
        (observation_count >= 3
          AND acceleration_belief               IS NOT NULL
          AND acceleration_disbelief            IS NOT NULL
          AND acceleration_uncertainty          IS NOT NULL
          AND acceleration_base_rate            IS NOT NULL
          AND acceleration_projected_probability IS NOT NULL)
        OR
        (observation_count < 3
          AND acceleration_belief               IS NULL
          AND acceleration_disbelief            IS NULL
          AND acceleration_uncertainty          IS NULL
          AND acceleration_base_rate            IS NULL
          AND acceleration_projected_probability IS NULL)
      )
    )
  `);

  await db.execute(sql`
    CREATE OR REPLACE FUNCTION build3a_bt_immutable() RETURNS trigger AS $$
    BEGIN
      RAISE EXCEPTION '[Build3A] behavioral_trajectories rows are immutable — UPDATE and DELETE are not permitted.';
    END;
    $$ LANGUAGE plpgsql
  `);
  await db.execute(sql`DROP TRIGGER IF EXISTS trg_build3a_bt_immutable ON behavioral_trajectories`);
  await db.execute(sql`
    CREATE TRIGGER trg_build3a_bt_immutable
      BEFORE UPDATE OR DELETE ON behavioral_trajectories
      FOR EACH ROW EXECUTE FUNCTION build3a_bt_immutable()
  `);

  // ── 4. behavioral_trajectory_members (Tier 1) ────────────────────────────
  // Mirrors evidence_bundle_members. Normalized per-opinion set for each trajectory.
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS behavioral_trajectory_members (
      id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      trajectory_id   UUID        NOT NULL REFERENCES behavioral_trajectories(id),
      opinion_id      UUID        NOT NULL REFERENCES opinions(id),
      sequence_number INTEGER     NOT NULL,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (trajectory_id, sequence_number),
      UNIQUE (trajectory_id, opinion_id),
      CHECK (sequence_number >= 1)
    )
  `);

  await db.execute(sql`
    CREATE OR REPLACE FUNCTION build3a_btm_immutable() RETURNS trigger AS $$
    BEGIN
      RAISE EXCEPTION '[Build3A] behavioral_trajectory_members rows are immutable — UPDATE and DELETE are not permitted.';
    END;
    $$ LANGUAGE plpgsql
  `);
  await db.execute(sql`DROP TRIGGER IF EXISTS trg_build3a_btm_immutable ON behavioral_trajectory_members`);
  await db.execute(sql`
    CREATE TRIGGER trg_build3a_btm_immutable
      BEFORE UPDATE OR DELETE ON behavioral_trajectory_members
      FOR EACH ROW EXECUTE FUNCTION build3a_btm_immutable()
  `);

  // ── 5. trajectory_refusal_records (Tier 1, Build3A-owned) ────────────────
  // NEVER touches locked Build 2A refusal_records. Separate table, separate constraints.
  // Reserved ONLY for cases where computation itself cannot validly complete.
  // Missing/ambiguous direction governance is NEVER a refusal (it's a status field).
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS trajectory_refusal_records (
      id                               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      claim_id                         UUID        REFERENCES behavioral_claims(id),
      trajectory_rule_version_id       UUID        REFERENCES trajectory_rule_versions(id),
      trajectory_governance_context_id UUID        REFERENCES trajectory_governance_contexts(id),
      start_opinion_id                 UUID        REFERENCES opinions(id),
      end_opinion_id                   UUID        REFERENCES opinions(id),
      reason_code                      TEXT        NOT NULL,
      detail                           TEXT        NOT NULL DEFAULT '',
      version_context_id               UUID        REFERENCES version_contexts(id),
      created_at                       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT trr_reason_code_check CHECK (
        reason_code IN ('degenerate_zero_elapsed_time', 'trajectory_computation_failed')
      )
    )
  `);

  await db.execute(sql`
    CREATE OR REPLACE FUNCTION build3a_trr_immutable() RETURNS trigger AS $$
    BEGIN
      RAISE EXCEPTION '[Build3A] trajectory_refusal_records rows are immutable — UPDATE and DELETE are not permitted.';
    END;
    $$ LANGUAGE plpgsql
  `);
  await db.execute(sql`DROP TRIGGER IF EXISTS trg_build3a_trr_immutable ON trajectory_refusal_records`);
  await db.execute(sql`
    CREATE TRIGGER trg_build3a_trr_immutable
      BEFORE UPDATE OR DELETE ON trajectory_refusal_records
      FOR EACH ROW EXECUTE FUNCTION build3a_trr_immutable()
  `);

  // ── 6. trajectory_computation_ledger (Operational) ───────────────────────
  // FOR UPDATE SKIP LOCKED concurrency. DELETE blocked, status-only lifecycle.
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS trajectory_computation_ledger (
      id                           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      claim_id                     UUID        NOT NULL REFERENCES behavioral_claims(id),
      trajectory_rule_version_id   UUID        NOT NULL REFERENCES trajectory_rule_versions(id),
      end_opinion_id               UUID        NOT NULL REFERENCES opinions(id),
      status                       TEXT        NOT NULL DEFAULT 'pending',
      attempts                     INTEGER     NOT NULL DEFAULT 0,
      first_seen_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_attempted_at            TIMESTAMPTZ,
      completed_at                 TIMESTAMPTZ,
      resulting_trajectory_id      UUID        REFERENCES behavioral_trajectories(id),
      resulting_refusal_id         UUID        REFERENCES trajectory_refusal_records(id),
      errors                       JSONB       NOT NULL DEFAULT '[]',
      UNIQUE (claim_id, trajectory_rule_version_id, end_opinion_id),
      CHECK (status IN ('pending','processing','succeeded','failed','refused'))
    )
  `);

  await db.execute(sql`
    CREATE OR REPLACE FUNCTION build3a_tcl_block_delete() RETURNS trigger AS $$
    BEGIN
      RAISE EXCEPTION '[Build3A] trajectory_computation_ledger rows cannot be deleted.';
    END;
    $$ LANGUAGE plpgsql
  `);
  await db.execute(sql`DROP TRIGGER IF EXISTS trg_build3a_tcl_block_delete ON trajectory_computation_ledger`);
  await db.execute(sql`
    CREATE TRIGGER trg_build3a_tcl_block_delete
      BEFORE DELETE ON trajectory_computation_ledger
      FOR EACH ROW EXECUTE FUNCTION build3a_tcl_block_delete()
  `);

  // ── 7. Views ──────────────────────────────────────────────────────────────
  // Chain-tip: trajectory not superseded by any newer trajectory
  await db.execute(sql`
    CREATE OR REPLACE VIEW latest_behavioral_trajectory_v AS
    SELECT bt.*
    FROM behavioral_trajectories bt
    WHERE NOT EXISTS (
      SELECT 1 FROM behavioral_trajectories newer
      WHERE newer.supersedes = bt.id
    )
  `);

  // Chain-tip: governance context not superseded by any newer context
  await db.execute(sql`
    CREATE OR REPLACE VIEW latest_trajectory_governance_context_v AS
    SELECT tgc.*
    FROM trajectory_governance_contexts tgc
    WHERE NOT EXISTS (
      SELECT 1 FROM trajectory_governance_contexts newer
      WHERE newer.supersedes = tgc.id
    )
  `);

  logger.info("[Build3A] Build 3A schema migrations complete — 6 tables, 2 views, seeds done.");
}
