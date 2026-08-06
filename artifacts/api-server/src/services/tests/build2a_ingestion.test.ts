/**
 * Build 2A — Package 2A-2 Ingestion Tests
 *
 * Covers:
 *   - Ledger row creation (pending → processing → succeeded/refused/failed lifecycle)
 *   - Concurrent claiming proof (FOR UPDATE SKIP LOCKED prevents double-processing)
 *   - Duplicate idempotency (same source record key produces exactly one ledger row)
 *   - Retry: attempts counter increments; terminal statuses block restart
 *   - DELETE on ledger rows is blocked by trigger
 *
 * Uses the vitest + pg-pool pattern already established for Build 2A tests.
 * All identifiers are prefixed with b2a_ingest_ or a short timestamp-based canary key
 * to allow parallelisation without collisions.
 *
 * Isolation: setup seeds minimum supporting rows; teardown deletes all test-keyed rows.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { sql } from "drizzle-orm";
import { db, pool } from "@workspace/db";
import { runPollCycle, _resetPollerStateForTesting } from "../build2a/sourceIngestionPoller.js";
import { isBuild2a2Ready, setBuild2a2Ready, _reset2a2ToPendingForTesting } from "../build2a/build2aReadiness.js";

// ── Helpers ───────────────────────────────────────────────────────────────────

const RUN_ID = `ingest_${Date.now()}`;

async function seedMinimumRegistryRows() {
  // Ensure the approved source registry row exists (idempotent)
  await db.execute(sql`
    INSERT INTO evidence_source_registry
      (source_key, display_name, source_classification, privacy_classification,
       native_table_name, description, approval_status)
    VALUES (
      'agent_task_outcomes',
      'Agent Task Outcomes',
      'outcome',
      'internal_operational',
      'agent_task_outcomes',
      'Build 1A agent task resolution outcomes',
      'approved'
    )
    ON CONFLICT (source_key) DO NOTHING
  `);

  // Ensure a behavioral primitive exists
  await db.execute(sql`
    INSERT INTO behavioral_primitives
      (name, description)
    VALUES ('agent_guided_task_completion', 'Agent completes a guided task')
    ON CONFLICT (name) DO NOTHING
  `);

  // Ensure domain module exists
  await db.execute(sql`
    INSERT INTO domain_modules
      (slug, display_name, description)
    VALUES ('agent_instrumentation', 'Agent Instrumentation', 'Instrumentation domain for agent behavior')
    ON CONFLICT (slug) DO NOTHING
  `);

  // Ensure interpretation rule version exists
  await db.execute(sql`
    INSERT INTO interpretation_rule_versions
      (implementation_key, version_label, is_active, replayable_for_history, rule_content)
    VALUES (
      'task_completion_v1',
      '1.0.0',
      true,
      false,
      '{"expected_observation_count":1,"abandon_timeout_seconds":3600}'::jsonb
    )
    ON CONFLICT (implementation_key) DO NOTHING
  `);

  // Ensure domain_source_eligibility row links the above
  await db.execute(sql`
    INSERT INTO domain_source_eligibility
      (domain_module_id, evidence_source_registry_id, primitive_id, approval_status, notes)
    SELECT dm.id, esr.id, bp.id, 'approved',
           'build2a_ingestion_test: agent_task_outcomes × agent_instrumentation × agent_guided_task_completion'
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
              = COALESCE(bp.id, '00000000-0000-0000-0000-000000000000'::uuid)
      )
  `);
}

async function insertFakeOutcome(suffix: string): Promise<{ outcomeId: string; agentId: number }> {
  // agents table: id SERIAL, slug TEXT UNIQUE, display_name TEXT
  const agentSlug = `${RUN_ID}_${suffix}`;
  await db.execute(sql`
    INSERT INTO agents (slug, display_name, created_at)
    VALUES (${agentSlug}, ${`Test Agent ${suffix}`}, NOW())
    ON CONFLICT (slug) DO NOTHING
  `);
  const agentRes = await db.execute(sql`
    SELECT id FROM agents WHERE slug = ${agentSlug} LIMIT 1
  `);
  const agentId = (agentRes.rows[0] as { id: number }).id;

  // agent_tasks: no unique constraint except PK — use correlation_id as idempotency key
  const corrId = `${RUN_ID}_${suffix}`;
  const existingTask = await db.execute(sql`
    SELECT id FROM agent_tasks WHERE correlation_id = ${corrId} LIMIT 1
  `);
  let taskId: string;
  if (existingTask.rows.length > 0) {
    taskId = (existingTask.rows[0] as { id: string }).id;
  } else {
    const taskRes = await db.execute(sql`
      INSERT INTO agent_tasks
        (agent_id, task_class, correlation_id, created_at)
      VALUES (${agentId}, 'guided_bill_payment', ${corrId}, NOW())
      RETURNING id
    `);
    taskId = (taskRes.rows[0] as { id: string }).id;
  }

  // Insert a resolved agent_task_outcome (no unique constraint — always new)
  const outcomeRes = await db.execute(sql`
    INSERT INTO agent_task_outcomes
      (task_id, outcome_status, source_attribution, resolved_at)
    VALUES (${taskId}::uuid, 'completed', 'build2a_test', NOW())
    RETURNING id
  `);
  const outcomeId = (outcomeRes.rows[0] as { id: string }).id;

  return { outcomeId, agentId };
}

async function cleanupRun() {
  // Ledger rows are permanent (trigger blocks DELETE). Outcomes can be deleted.
  // Tier 1 tables (atoms, links, refusals) cannot be deleted by design.
  await db.execute(sql`
    DELETE FROM agent_task_outcomes WHERE source_attribution = 'build2a_test'
  `).catch(() => {});

  await db.execute(sql`
    DELETE FROM agent_tasks WHERE correlation_id LIKE ${RUN_ID + '_%'}
  `).catch(() => {});

  await db.execute(sql`
    DELETE FROM agents WHERE slug LIKE ${RUN_ID + '_%'}
  `).catch(() => {});
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeAll(async () => {
  await seedMinimumRegistryRows();
  // Force 2A-2 readiness for tests (bypasses migration wait)
  setBuild2a2Ready();
  _resetPollerStateForTesting();
});

afterAll(async () => {
  _reset2a2ToPendingForTesting();
  await cleanupRun();
});

describe("Ledger row idempotency", () => {
  it("inserts exactly one pending row per unique (esr, source_record_key, rule_version) triple", async () => {
    const { outcomeId } = await insertFakeOutcome("idem_01");

    // Run poll cycle twice — second should find no new rows to insert
    await runPollCycle();
    await runPollCycle();

    const countRes = await db.execute(sql`
      SELECT COUNT(*) AS n FROM source_processing_ledger
      WHERE source_record_key = ${outcomeId}
    `);
    const n = Number((countRes.rows[0] as { n: string }).n);
    expect(n).toBe(1);
  });
});

describe("Concurrent claiming (FOR UPDATE SKIP LOCKED)", () => {
  it("prevents two concurrent claims from both processing the same row", async () => {
    const { outcomeId } = await insertFakeOutcome("conc_01");

    // Manually insert a pending ledger row
    const esr = await db.execute(sql`
      SELECT id FROM evidence_source_registry WHERE source_key = 'agent_task_outcomes' LIMIT 1
    `);
    const rv = await db.execute(sql`
      SELECT id FROM interpretation_rule_versions WHERE implementation_key = 'task_completion_v1' LIMIT 1
    `);
    const esrId = (esr.rows[0] as { id: string }).id;
    const rvId = (rv.rows[0] as { id: string }).id;

    await db.execute(sql`
      INSERT INTO source_processing_ledger
        (evidence_source_registry_id, source_record_key, interpretation_rule_version_id)
      VALUES (${esrId}::uuid, ${outcomeId}, ${rvId}::uuid)
      ON CONFLICT DO NOTHING
    `);

    // Simulate two concurrent claim transactions: only one should succeed
    const c1 = await pool.connect();
    const c2 = await pool.connect();

    try {
      await c1.query("BEGIN");
      await c2.query("BEGIN");

      // c1 acquires the lock
      const r1 = await c1.query(
        `UPDATE source_processing_ledger
         SET status = 'processing', attempts = attempts + 1
         WHERE id IN (
           SELECT id FROM source_processing_ledger
           WHERE source_record_key = $1
             AND status = 'pending'
           FOR UPDATE SKIP LOCKED
         )
         RETURNING id`,
        [outcomeId],
      );

      // c2 tries to claim the same row — SKIP LOCKED means it gets 0 rows
      const r2 = await c2.query(
        `UPDATE source_processing_ledger
         SET status = 'processing', attempts = attempts + 1
         WHERE id IN (
           SELECT id FROM source_processing_ledger
           WHERE source_record_key = $1
             AND status = 'pending'
           FOR UPDATE SKIP LOCKED
         )
         RETURNING id`,
        [outcomeId],
      );

      await c1.query("ROLLBACK");
      await c2.query("ROLLBACK");

      // c1 claimed the row; c2 got nothing
      expect(r1.rows.length).toBe(1);
      expect(r2.rows.length).toBe(0);
    } finally {
      c1.release();
      c2.release();
    }
  });
});

describe("Retry counter", () => {
  it("increments attempts on each processing claim", async () => {
    const { outcomeId } = await insertFakeOutcome("retry_01");

    const esr = await db.execute(sql`SELECT id FROM evidence_source_registry WHERE source_key = 'agent_task_outcomes' LIMIT 1`);
    const rv = await db.execute(sql`SELECT id FROM interpretation_rule_versions WHERE implementation_key = 'task_completion_v1' LIMIT 1`);
    const esrId = (esr.rows[0] as { id: string }).id;
    const rvId = (rv.rows[0] as { id: string }).id;

    await db.execute(sql`
      INSERT INTO source_processing_ledger
        (evidence_source_registry_id, source_record_key, interpretation_rule_version_id, status, attempts)
      VALUES (${esrId}::uuid, ${outcomeId}, ${rvId}::uuid, 'failed', 1)
      ON CONFLICT DO NOTHING
    `);

    // Manually mark as failed with 1 attempt, then claim again
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query(
        `UPDATE source_processing_ledger
         SET status = 'processing', attempts = attempts + 1
         WHERE id IN (
           SELECT id FROM source_processing_ledger
           WHERE source_record_key = $1
             AND status = 'failed'
             AND attempts < 3
           FOR UPDATE SKIP LOCKED
         )
         RETURNING id, attempts`,
        [outcomeId],
      );
      await client.query("COMMIT");

      expect(result.rows.length).toBe(1);
      expect((result.rows[0] as { attempts: number }).attempts).toBe(2);
    } finally {
      client.release();
    }
  });

  it("blocks retry when attempts >= MAX_RETRY_ATTEMPTS (3)", async () => {
    const { outcomeId } = await insertFakeOutcome("retry_max");

    const esr = await db.execute(sql`SELECT id FROM evidence_source_registry WHERE source_key = 'agent_task_outcomes' LIMIT 1`);
    const rv = await db.execute(sql`SELECT id FROM interpretation_rule_versions WHERE implementation_key = 'task_completion_v1' LIMIT 1`);
    const esrId = (esr.rows[0] as { id: string }).id;
    const rvId = (rv.rows[0] as { id: string }).id;

    // Insert as failed with 3 attempts (at the max)
    await db.execute(sql`
      INSERT INTO source_processing_ledger
        (evidence_source_registry_id, source_record_key, interpretation_rule_version_id, status, attempts)
      VALUES (${esrId}::uuid, ${outcomeId}, ${rvId}::uuid, 'failed', 3)
      ON CONFLICT DO NOTHING
    `);

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query(
        `UPDATE source_processing_ledger
         SET status = 'processing', attempts = attempts + 1
         WHERE id IN (
           SELECT id FROM source_processing_ledger
           WHERE source_record_key = $1
             AND status = 'failed'
             AND attempts < 3
           FOR UPDATE SKIP LOCKED
         )
         RETURNING id`,
        [outcomeId],
      );
      await client.query("ROLLBACK");

      // The query's WHERE clause (attempts < 3) should find 0 rows
      expect(result.rows.length).toBe(0);
    } finally {
      client.release();
    }
  });
});

describe("Terminal status protection", () => {
  it("blocks terminal rows (succeeded) from being reclaimed", async () => {
    const { outcomeId } = await insertFakeOutcome("terminal_01");

    const esr = await db.execute(sql`SELECT id FROM evidence_source_registry WHERE source_key = 'agent_task_outcomes' LIMIT 1`);
    const rv = await db.execute(sql`SELECT id FROM interpretation_rule_versions WHERE implementation_key = 'task_completion_v1' LIMIT 1`);
    const esrId = (esr.rows[0] as { id: string }).id;
    const rvId = (rv.rows[0] as { id: string }).id;

    await db.execute(sql`
      INSERT INTO source_processing_ledger
        (evidence_source_registry_id, source_record_key, interpretation_rule_version_id, status)
      VALUES (${esrId}::uuid, ${outcomeId}, ${rvId}::uuid, 'succeeded')
      ON CONFLICT DO NOTHING
    `);

    // Trigger should prevent direct transition from succeeded → processing
    await expect(
      db.execute(sql`
        UPDATE source_processing_ledger
        SET status = 'processing'
        WHERE source_record_key = ${outcomeId}
      `)
    ).rejects.toThrow();
  });

  it("DELETE on ledger rows is blocked by trigger", async () => {
    const { outcomeId } = await insertFakeOutcome("del_block_01");

    const esr = await db.execute(sql`SELECT id FROM evidence_source_registry WHERE source_key = 'agent_task_outcomes' LIMIT 1`);
    const rv = await db.execute(sql`SELECT id FROM interpretation_rule_versions WHERE implementation_key = 'task_completion_v1' LIMIT 1`);
    const esrId = (esr.rows[0] as { id: string }).id;
    const rvId = (rv.rows[0] as { id: string }).id;

    await db.execute(sql`
      INSERT INTO source_processing_ledger
        (evidence_source_registry_id, source_record_key, interpretation_rule_version_id)
      VALUES (${esrId}::uuid, ${outcomeId}, ${rvId}::uuid)
      ON CONFLICT DO NOTHING
    `);

    await expect(
      db.execute(sql`DELETE FROM source_processing_ledger WHERE source_record_key = ${outcomeId}`)
    ).rejects.toThrow();
  });
});
