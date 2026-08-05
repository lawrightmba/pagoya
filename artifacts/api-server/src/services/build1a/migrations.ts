/**
 * Build 1A — Database Migrations
 *
 * Creates all new tables and views for PTI Build 1A via CREATE TABLE IF NOT EXISTS.
 * This follows the established pattern (see phaseETransition.ts) of calling db.execute()
 * at server startup — drizzle-kit push is known broken in this environment.
 *
 * ALL operations are additive. Zero ALTER statements against any existing table.
 * Calling this function multiple times is safe (all statements are idempotent).
 */

import { sql } from "drizzle-orm";
import { logger } from "../../lib/logger.js";

export const PTI_V5_MODEL_VERSION_CURRENT = "v5.0.0-rc1";

export async function ensureBuild1aTables(): Promise<void> {
  const { db } = await import("@workspace/db");

  logger.info("[Build1A] Running schema migrations…");

  // ── 1. pti_validation_runs ────────────────────────────────────────────────
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS pti_validation_runs (
      id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      run_type      TEXT        NOT NULL,
      started_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      completed_at  TIMESTAMPTZ,
      records_checked INTEGER   NOT NULL DEFAULT 0,
      records_passed  INTEGER   NOT NULL DEFAULT 0,
      records_failed  INTEGER   NOT NULL DEFAULT 0,
      details       JSONB       NOT NULL DEFAULT '{}',
      triggered_by  TEXT        NOT NULL DEFAULT 'manual'
    )
  `);

  // ── 2. model_version_registry ─────────────────────────────────────────────
  // Note: no legacy_short_code — the varchar(10) standalone column referenced
  // in the original spec does not exist in pti_score_history. Model versions
  // are stored in breakdown JSONB and have no truncation risk.
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS model_version_registry (
      id            SERIAL      PRIMARY KEY,
      component     TEXT        NOT NULL,
      version_label TEXT        NOT NULL,
      released_at   TIMESTAMPTZ,
      config_hash   TEXT,
      notes         TEXT,
      is_active     BOOLEAN     NOT NULL DEFAULT false,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (component, version_label)
    )
  `);

  // ── 3. agents ─────────────────────────────────────────────────────────────
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS agents (
      id            SERIAL      PRIMARY KEY,
      slug          TEXT        UNIQUE NOT NULL,
      display_name  TEXT        NOT NULL,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // ── 4. agent_versions ─────────────────────────────────────────────────────
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS agent_versions (
      id            SERIAL      PRIMARY KEY,
      agent_id      INTEGER     NOT NULL REFERENCES agents(id),
      version_label TEXT        NOT NULL,
      deployed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      is_active     BOOLEAN     NOT NULL DEFAULT true
    )
  `);

  // ── 5. agent_tasks ────────────────────────────────────────────────────────
  // telefono is nullable text with no hard FK — users.telefono does have a
  // unique constraint, but the known duplicate phone-format rows mean enforcing
  // an FK would reject valid tasks for affected users. Soft link only.
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS agent_tasks (
      id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      agent_id            INTEGER     NOT NULL REFERENCES agents(id),
      agent_version_id    INTEGER     REFERENCES agent_versions(id),
      telefono            TEXT,
      task_class          TEXT        NOT NULL,
      correlation_id      TEXT,
      status              TEXT        NOT NULL DEFAULT 'created',
      created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      started_at          TIMESTAMPTZ,
      completed_at        TIMESTAMPTZ,
      cost_cents          INTEGER,
      cost_source         TEXT,
      cost_status         TEXT        NOT NULL DEFAULT 'unavailable',
      retries             INTEGER     NOT NULL DEFAULT 0,
      scope_deviation     BOOLEAN     NOT NULL DEFAULT false,
      external_action_taken BOOLEAN   NOT NULL DEFAULT false
    )
  `);

  // ── 6. agent_tool_calls ───────────────────────────────────────────────────
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS agent_tool_calls (
      id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      task_id       UUID        NOT NULL REFERENCES agent_tasks(id),
      tool_name     TEXT        NOT NULL,
      requested_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      completed_at  TIMESTAMPTZ,
      status        TEXT        NOT NULL DEFAULT 'success',
      input_summary JSONB       NOT NULL DEFAULT '{}',
      output_summary JSONB      NOT NULL DEFAULT '{}'
    )
  `);

  // ── 7. agent_task_outcomes ────────────────────────────────────────────────
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS agent_task_outcomes (
      id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      task_id               UUID        NOT NULL REFERENCES agent_tasks(id),
      outcome_status        TEXT        NOT NULL,
      resolved_value        JSONB,
      failure_class         TEXT,
      resolution_confidence NUMERIC,
      source_attribution    TEXT        NOT NULL DEFAULT 'automatic',
      resolved_at           TIMESTAMPTZ,
      superseded_by         UUID        REFERENCES agent_task_outcomes(id)
    )
  `);

  // ── 8. agent_predictions ─────────────────────────────────────────────────
  // IMMUTABLE after insert. No application code path may UPDATE a row.
  // Corrections are made by inserting a new row — never overwriting the original.
  // A PostgreSQL rule enforces this at the DB level.
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS agent_predictions (
      id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      task_id             UUID        REFERENCES agent_tasks(id),
      prediction_type     TEXT        NOT NULL,
      prediction_source   TEXT        NOT NULL,
      predicted_value     JSONB       NOT NULL,
      model_version_id    INTEGER     REFERENCES model_version_registry(id),
      predicted_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // Immutability rule — UPDATE becomes a no-op at the DB level.
  // Tested by build1a.test.ts (prediction immutability test).
  await db.execute(sql`
    CREATE OR REPLACE RULE no_update_agent_predictions AS
      ON UPDATE TO agent_predictions DO INSTEAD NOTHING
  `);

  // ── 9. agent_prediction_resolutions ──────────────────────────────────────
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS agent_prediction_resolutions (
      id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      prediction_id         UUID        NOT NULL REFERENCES agent_predictions(id),
      task_outcome_id       UUID        NOT NULL REFERENCES agent_task_outcomes(id),
      resolution_status     TEXT        NOT NULL DEFAULT 'unresolved',
      evaluated_value       JSONB,
      resolution_confidence NUMERIC,
      resolved_at           TIMESTAMPTZ,
      superseded_by         UUID        REFERENCES agent_prediction_resolutions(id)
    )
  `);

  // ── 10. pti_score_input_snapshots ─────────────────────────────────────────
  // Append-only. Persists the PTIDataSnapshot input already produced by
  // buildPTISnapshotFromDb() — created by Option A (Build 1A spec §Conflict 2).
  // Historical rows (before this table existed) are classified as not_replayable.
  // score_history_recorded_at is a soft link to pti_score_history — not an FK,
  // because (a) pti_score_history has no stable unique key beyond telefono+timestamp,
  // (b) the history insert uses NOW() so exact timestamp equality is not guaranteed.
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS pti_score_input_snapshots (
      id                        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      telefono                  TEXT        NOT NULL,
      snapshot                  JSONB       NOT NULL,
      model_version             TEXT        NOT NULL,
      captured_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      score_history_recorded_at TIMESTAMPTZ,
      score_history_telefono    TEXT,
      persistence_status        TEXT        NOT NULL DEFAULT 'persisted',
      created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // ── Views ─────────────────────────────────────────────────────────────────

  // View 1: scoring event counts per user (using real table pti_score_history)
  await db.execute(sql`
    CREATE OR REPLACE VIEW pti_scoring_event_counts AS
    SELECT
      telefono,
      COUNT(*)                                          AS total_events,
      MIN(recorded_at)                                  AS first_recorded_at,
      MAX(recorded_at)                                  AS last_recorded_at,
      CASE
        WHEN COUNT(*) >= 12 THEN '12+'
        WHEN COUNT(*) >= 6  THEN '6-11'
        WHEN COUNT(*) >= 3  THEN '3-5'
        WHEN COUNT(*) >= 2  THEN '2'
        ELSE '1'
      END                                               AS event_bucket
    FROM pti_score_history
    GROUP BY telefono
  `);

  // View 2: snapshot replayability
  // Joins pti_score_input_snapshots (new) against pti_score_history via soft link.
  // Rows in pti_score_history with no matching snapshot are classified not_replayable
  // (historical_output_only). Only snapshots captured after Build 1A deployment
  // will have replayability_status = 'replayable'.
  await db.execute(sql`
    CREATE OR REPLACE VIEW pti_snapshot_replayability AS
    SELECT
      s.id                            AS snapshot_id,
      s.telefono,
      s.model_version,
      s.captured_at,
      s.persistence_status,
      s.score_history_recorded_at,
      (s.score_history_recorded_at IS NOT NULL) AS has_linked_score,
      CASE
        WHEN s.persistence_status = 'persisted'
             AND s.score_history_recorded_at IS NOT NULL  THEN 'replayable'
        WHEN s.persistence_status = 'persisted'           THEN 'snapshot_only'
        WHEN s.persistence_status = 'historical_output_only' THEN 'not_replayable'
        ELSE 'unknown'
      END                             AS replayability_status
    FROM pti_score_input_snapshots s
  `);

  // ── Seeds ─────────────────────────────────────────────────────────────────

  // Seed agents (Paula + Tony)
  await db.execute(sql`
    INSERT INTO agents (slug, display_name)
    VALUES
      ('paula', 'Paula — User Coaching Agent'),
      ('tony',  'Tony — Founder Analytics Co-pilot')
    ON CONFLICT (slug) DO NOTHING
  `);

  // Seed model_version_registry with current live version
  await db.execute(sql`
    INSERT INTO model_version_registry (component, version_label, is_active, released_at, notes)
    VALUES (
      'pti_scoring',
      ${PTI_V5_MODEL_VERSION_CURRENT},
      true,
      NOW(),
      'v5.0 production model — Phase E go-live. Weights: PR 30%, BC 20%, ED 25%, CF 25%.'
    )
    ON CONFLICT (component, version_label) DO NOTHING
  `);

  // Backfill any additional distinct model versions found in pti_score_history.
  // Do not assume only one version exists — read what is actually in the DB.
  try {
    const rows = await db.execute(sql`
      SELECT DISTINCT breakdown->>'model_version' AS model_version
      FROM pti_score_history
      WHERE breakdown->>'model_version' IS NOT NULL
        AND breakdown->>'model_version' <> ''
    `);
    for (const row of rows.rows as Array<{ model_version: string }>) {
      const v = row.model_version;
      if (!v) continue;
      await db.execute(sql`
        INSERT INTO model_version_registry (component, version_label, is_active, notes)
        VALUES (
          'pti_scoring',
          ${v},
          ${v === PTI_V5_MODEL_VERSION_CURRENT},
          'Backfilled from pti_score_history at Build 1A deployment.'
        )
        ON CONFLICT (component, version_label) DO NOTHING
      `);
    }
  } catch (err) {
    // pti_score_history may not yet exist in fresh environments — non-fatal
    logger.warn({ err }, "[Build1A] model_version backfill skipped — pti_score_history unavailable");
  }

  // ── C2: pti_history_replayability — per-row classification view ───────────
  // LEFT JOINs every pti_score_history row against pti_score_input_snapshots
  // so ALL history rows are individually classified, not just those that
  // already have a snapshot. Classification values:
  //   replayable             — exactly one linked snapshot with status='persisted'
  //   historical_output_only — no matching snapshot (pre-Build-1A scores)
  //   input_snapshot_unavailable — exactly one linked snapshot but status!='persisted'
  //   snapshot_unlinked      — a snapshot exists for this (telefono,recorded_at)
  //                            but the history row itself has no snapshot link
  //   ambiguous_linkage      — more than one snapshot matches this history row
  //
  // Linkage is via (h.telefono, h.recorded_at) = (s.score_history_telefono,
  // s.score_history_recorded_at). With C1's fix, both sides share the same
  // capturedAt ISO timestamp, making this an exact match. Pre-C1 snapshots
  // (if any) may have millisecond skew and will appear as historical_output_only.
  //
  // Telefono is included for audit identity but MUST be masked to last-4 in
  // every admin API response and export — see build1aAdmin.ts GET /history-replayability.
  await db.execute(sql`
    CREATE OR REPLACE VIEW pti_history_replayability AS
    WITH snapshot_counts AS (
      SELECT
        score_history_telefono          AS telefono,
        score_history_recorded_at       AS recorded_at,
        COUNT(*)                        AS match_count,
        MIN(id::text)                   AS first_snapshot_id,
        COUNT(*) FILTER (WHERE persistence_status = 'persisted') AS persisted_count
      FROM pti_score_input_snapshots
      WHERE score_history_recorded_at IS NOT NULL
        AND score_history_telefono IS NOT NULL
      GROUP BY score_history_telefono, score_history_recorded_at
    )
    SELECT
      h.telefono,
      h.recorded_at,
      h.pti_score,
      COALESCE(h.breakdown->>'model_version', '(unknown)') AS model_version,
      sc.first_snapshot_id                                  AS snapshot_id,
      CASE
        WHEN sc.match_count IS NULL                              THEN 'historical_output_only'
        WHEN sc.match_count > 1                                  THEN 'ambiguous_linkage'
        WHEN sc.match_count = 1 AND sc.persisted_count = 1      THEN 'replayable'
        WHEN sc.match_count = 1 AND sc.persisted_count = 0      THEN 'input_snapshot_unavailable'
        ELSE                                                          'ambiguous_linkage'
      END AS classification,
      CASE
        WHEN sc.match_count IS NULL
          THEN 'No matching snapshot. Score predates Build 1A or snapshot persistence was disabled.'
        WHEN sc.match_count > 1
          THEN FORMAT('Multiple snapshots (%s) match this (telefono, recorded_at) pair — linkage is ambiguous.', sc.match_count)
        WHEN sc.match_count = 1 AND sc.persisted_count = 1
          THEN 'Exactly one linked snapshot with persistence_status=persisted. Replayable.'
        WHEN sc.match_count = 1 AND sc.persisted_count = 0
          THEN 'Exactly one linked snapshot found but persistence_status != persisted (e.g. invalid_snapshot).'
        ELSE 'Unexpected state.'
      END AS classification_reason
    FROM pti_score_history h
    LEFT JOIN snapshot_counts sc
      ON  sc.telefono   = h.telefono
      AND sc.recorded_at = h.recorded_at
  `);

  // ── C4: Indexes — CREATE INDEX IF NOT EXISTS (idempotent) ─────────────────
  // All indexes listed below are additive; no existing index is removed.
  // agent_tasks indexes
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_agent_tasks_agent_created ON agent_tasks (agent_id, created_at)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_agent_tasks_telefono_created ON agent_tasks (telefono, created_at)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_agent_tasks_status ON agent_tasks (status)`);
  // agent_tool_calls
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_agent_tool_calls_task ON agent_tool_calls (task_id)`);
  // agent_task_outcomes
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_agent_task_outcomes_task ON agent_task_outcomes (task_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_agent_task_outcomes_status ON agent_task_outcomes (outcome_status)`);
  // agent_predictions
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_agent_predictions_task ON agent_predictions (task_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_agent_predictions_type ON agent_predictions (prediction_type)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_agent_predictions_at ON agent_predictions (predicted_at)`);
  // agent_prediction_resolutions
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_agent_pred_resolutions_pred ON agent_prediction_resolutions (prediction_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_agent_pred_resolutions_outcome ON agent_prediction_resolutions (task_outcome_id)`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_agent_pred_resolutions_status ON agent_prediction_resolutions (resolution_status)`);
  // pti_validation_runs
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_pti_validation_runs_type_started ON pti_validation_runs (run_type, started_at)`);
  // pti_score_input_snapshots — for the C2 LEFT JOIN
  await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_pti_snapshots_link ON pti_score_input_snapshots (score_history_telefono, score_history_recorded_at)`);

  logger.info("[Build1A] Schema migrations complete.");
}
