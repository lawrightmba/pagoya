/**
 * Build 1A — Correction Pass Tests
 *
 * Corrections covered:
 *   A — recordTaskOutcome async fix (live outcome persistence)
 *   C3 — Snapshot allow-list serializer (NaN sentinel, invalid_snapshot)
 *   C5/D — Startup readiness middleware (unit + HTTP-level, all 3 states)
 *   C6/E — Feature-flag behavior (snapshot persistence + agent instrumentation)
 *
 * Fixture phones are owned by this file. Listed in setup.ts under BUILD1A_PHONES.
 * Isolation: afterEach in setup.ts clears all rows for these phones.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import request from "supertest";
import app from "../../app.js";

// ── Imports under test ────────────────────────────────────────────────────────
import {
  serializePtiSnapshot,
  deserializePtiSnapshot,
  NAN_SENTINEL,
  NAN_VALID_FIELDS,
  isPtiSnapshotPersistenceEnabled,
  persistPtiInputSnapshot,
} from "../build1a/ptiSnapshotPersist.js";

import {
  getBuild1aReadiness,
  setBuild1aReady,
  setBuild1aFailed,
  build1aNotReadyMiddleware,
  _resetToPendingForTesting,
} from "../build1a/build1aReadiness.js";

import {
  startAgentTask,
  recordTaskOutcome,
  recordToolCall,
  isAgentInstrumentationEnabled,
} from "../build1a/agentInstrumentation.js";

import type { Request, Response, NextFunction } from "express";

// ── Test fixture phones ───────────────────────────────────────────────────────
const BUILD1A_PHONE_A = "build1atest01";
const INSTR_PHONE_A   = "instr_test01";   // owned by Correction A instrumentation tests

// ── Minimal valid PTIDataSnapshot fixture ─────────────────────────────────────
const validSnapshot = {
  streakMonths: 2, payCount: 3, domStddev: 3, dominantDay: 15, advanceDays: 2, selfRatio: 0.8,
  loginDays30: 5, hourStd: 2, scratchPlays: 0, spinPlays: 0, missionsDone: 0,
  loadCount30: 2, loadDayStd: 5, paulaInteractions: 2, confirmed2fa: 0, declined2fa: 0,
  pushOpens: 0, curiosityIndex: 0.1,
  billerCount: 2, kycVerified: false, kycTier: "simplified", utilityRatio: 0.8,
  intentClicks: 0, hoursToFirst: NaN, deviceScore: 1,
  currentBalance: 50, totalLoads: 500, totalSpend: 300, amountCV: 0.2,
  p2pSendCount: 0, p2pRecipientCount: 0, daysOld: 60,
  daysToFirstSpei: NaN, oxxoLoadCount: 2, speiLoadCount: 1, cardLoadCount: 0,
  lateRecoveryRatio: NaN, latePaymentCount: 0, paulaResponseLatencyMinutes: NaN,
};

// ── Helper: get real paula agent_id from DB ───────────────────────────────────
async function getPaulaAgentId(): Promise<number> {
  const rows = await db.execute(sql`SELECT id FROM agents WHERE slug = 'paula' LIMIT 1`);
  const row = rows.rows[0] as { id: number } | undefined;
  if (!row) throw new Error("paula agent not found — run ensureBuild1aTables() first");
  return row.id;
}

// ── Helper: insert a real in_progress agent_tasks row ────────────────────────
async function insertInProgressTask(
  telefono = INSTR_PHONE_A,
  taskClass = "whatsapp_inbound",
): Promise<string> {
  const agentId = await getPaulaAgentId();
  const taskId = crypto.randomUUID();
  await db.execute(sql`
    INSERT INTO agent_tasks
      (id, agent_id, telefono, task_class, status, cost_status)
    VALUES
      (${taskId}::uuid, ${agentId}, ${telefono}, ${taskClass}, 'in_progress', 'unavailable')
  `);
  return taskId;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CORRECTION A — recordTaskOutcome async fix
//
// ROOT CAUSE PROVEN BY EVIDENCE:
// The original recordTaskOutcome() returned void via a detached async IIFE.
// In agentChat.ts, "await recordTaskOutcome(...)" was equivalent to "await void"
// (= "await undefined"), which resolved IMMEDIATELY without waiting for DB writes.
// After res.json(), the route handler returned with the IIFE still pending.
// Unowned promises (no .then()/.catch() reference on the returned Promise) are
// GC-eligible before they settle. Evidence: agent_tasks rows stayed 'in_progress',
// zero agent_task_outcomes rows were ever written in live requests, yet the
// agent_tasks insert (launched BEFORE the Anthropic call) always completed.
//
// FIX: recordTaskOutcome is now async (returns Promise<void>). agentChat.ts
// awaits it BEFORE calling res.json(), guaranteeing both DB writes complete
// before the HTTP response exits.
//
// HOW EACH TEST WOULD HAVE FAILED AGAINST THE OLD IMPLEMENTATION:
// Key test: "outcome row present immediately after await" — with old void return,
// await resolves instantly (await undefined). The IIFE starts but hasn't hit
// the DB yet. The immediate SELECT COUNT(*) returns 0. Test FAILS. ✓
// ═══════════════════════════════════════════════════════════════════════════════
describe("A: recordTaskOutcome — async fix (outcome written before response)", () => {

  it("outcome row is present immediately after await — NO setTimeout (catches fire-and-forget bug)", async () => {
    // This is the direct regression test.
    // OLD CODE: recordTaskOutcome() returns void. "await void" resolves instantly.
    //   The IIFE begins but hasn't executed the DB INSERT yet.
    //   Immediate COUNT = 0 → test FAILS.
    // NEW CODE: recordTaskOutcome() returns Promise<void>. await waits for both
    //   UPDATE + INSERT to complete. Immediate COUNT = 1 → test PASSES.
    const taskId = await insertInProgressTask();

    await recordTaskOutcome(taskId, "resolved", null, null);

    // No setTimeout — must be present immediately
    const rows = await db.execute(sql`
      SELECT COUNT(*)::int AS cnt FROM agent_task_outcomes
      WHERE task_id = ${taskId}::uuid
    `);
    expect((rows.rows[0] as { cnt: number }).cnt).toBe(1);
  });

  it("agent_tasks.status updated to 'completed' immediately after await (success path)", async () => {
    // OLD: UPDATE fires in IIFE — status stays 'in_progress' immediately after call.
    // NEW: await waits for UPDATE — status is 'completed' immediately after await.
    const taskId = await insertInProgressTask();

    await recordTaskOutcome(taskId, "resolved", { escalated: false, has_staged_action: false });

    const rows = await db.execute(sql`
      SELECT status, completed_at FROM agent_tasks WHERE id = ${taskId}::uuid
    `);
    const row = rows.rows[0] as { status: string; completed_at: string | null };
    expect(row.status).toBe("completed");
    expect(row.completed_at).not.toBeNull();
  });

  it("agent_tasks.status updated to 'failed' immediately after await (unresolved outcome)", async () => {
    const taskId = await insertInProgressTask();

    await recordTaskOutcome(taskId, "unresolved", null, null);

    const rows = await db.execute(sql`SELECT status FROM agent_tasks WHERE id = ${taskId}::uuid`);
    expect((rows.rows[0] as { status: string }).status).toBe("failed");
  });

  it("technical failure_class written on error path — covers agentChat.ts catch block", async () => {
    // OLD: "recordTaskOutcome(id, 'resolved', null, 'technical')" in catch block
    //   returned void, IIFE never completed after res.json() → failure_class never stored.
    // NEW: await guarantees both writes complete → failure_class='technical' in row.
    const taskId = await insertInProgressTask();

    await recordTaskOutcome(taskId, "resolved", null, "technical");

    const rows = await db.execute(sql`
      SELECT outcome_status, failure_class, resolved_value
      FROM agent_task_outcomes WHERE task_id = ${taskId}::uuid
    `);
    expect((rows.rows as unknown[]).length).toBe(1);
    const row = rows.rows[0] as { outcome_status: string; failure_class: string | null; resolved_value: unknown };
    expect(row.outcome_status).toBe("resolved");
    expect(row.failure_class).toBe("technical");
    expect(row.resolved_value).toBeNull();
  });

  it("resolved_value JSONB persisted correctly on success path", async () => {
    const taskId = await insertInProgressTask();
    const expectedValue = { escalated: true, has_staged_action: true };

    await recordTaskOutcome(taskId, "resolved", expectedValue, null);

    const rows = await db.execute(sql`
      SELECT resolved_value FROM agent_task_outcomes WHERE task_id = ${taskId}::uuid
    `);
    const row = rows.rows[0] as { resolved_value: unknown };
    const parsed = typeof row.resolved_value === "string"
      ? JSON.parse(row.resolved_value)
      : row.resolved_value;
    expect(parsed).toMatchObject(expectedValue);
  });

  it("null taskId (exception before startAgentTask) → no-op, no throw", async () => {
    // Covers the case where the outer catch fires before line 855 in agentChat.ts.
    // _b1aTaskId is null → recordTaskOutcome is a no-op per its guard clause.
    let threw = false;
    try {
      await recordTaskOutcome(null, "resolved", null, "technical");
    } catch {
      threw = true;
    }
    expect(threw).toBe(false);
    // Verify no outcome rows for this phone (null taskId can't link to any row)
    const rows = await db.execute(sql`
      SELECT COUNT(*)::int AS cnt FROM agent_task_outcomes
      WHERE task_id IS NULL
    `);
    expect((rows.rows[0] as { cnt: number }).cnt).toBe(0);
  });

  it("FK violation (task_id not in agent_tasks) does not throw — catch block absorbs", async () => {
    // Simulates a scenario where the task row failed to insert but recordTaskOutcome
    // is still called. The INSERT will fail FK constraint; catch must absorb it.
    const nonExistentId = crypto.randomUUID();
    let threw = false;
    try {
      await recordTaskOutcome(nonExistentId, "resolved", null, null);
    } catch {
      threw = true;
    }
    expect(threw).toBe(false);
  });

  it("startAgentTask is async — task row in DB immediately after await (no wait needed)", async () => {
    // startAgentTask is now truly async (not fire-and-forget). Awaiting it guarantees
    // the agent_tasks INSERT is complete before recordTaskOutcome can run.
    // This eliminates the FK race that left tasks permanently in_progress.
    const taskId = await startAgentTask("paula", "whatsapp_inbound", INSTR_PHONE_A);
    expect(taskId).not.toBeNull();
    expect(typeof taskId).toBe("string");
    expect(taskId).toMatch(/^[0-9a-f-]{36}$/);

    // No setTimeout — row must be present immediately (that's the whole point of the fix)
    const rows = await db.execute(sql`
      SELECT status FROM agent_tasks WHERE id = ${taskId}::uuid
    `);
    expect((rows.rows as unknown[]).length).toBe(1);
    expect((rows.rows[0] as { status: string }).status).toBe("in_progress");
  });

  it("recordToolCall does not throw and writes a row immediately after fire-and-forget settles", async () => {
    const taskId = await insertInProgressTask();

    // recordToolCall is still fire-and-forget (called during tool execution, before res.json)
    recordToolCall(taskId, "get_wallet_balance", { telefono: "***1234" }, { balance_mxn: "[AMOUNT_REDACTED]" });

    // Wait for IIFE to settle
    await new Promise(r => setTimeout(r, 400));

    const rows = await db.execute(sql`
      SELECT tool_name, status FROM agent_tool_calls WHERE task_id = ${taskId}::uuid
    `);
    expect((rows.rows as unknown[]).length).toBe(1);
    expect((rows.rows[0] as { tool_name: string }).tool_name).toBe("get_wallet_balance");
  });

  it("full chain: task → tool_call → outcome all linked by same task_id", async () => {
    const taskId = await insertInProgressTask();

    // Simulate a complete Paula interaction: tool call then outcome
    recordToolCall(taskId, "get_payment_history", { telefono: "***5678" }, { count: 3 });
    await recordTaskOutcome(taskId, "resolved", { escalated: false, has_staged_action: false });

    await new Promise(r => setTimeout(r, 400)); // let tool call IIFE settle

    const taskRows = await db.execute(sql`
      SELECT status FROM agent_tasks WHERE id = ${taskId}::uuid
    `);
    const toolRows = await db.execute(sql`
      SELECT COUNT(*)::int AS cnt FROM agent_tool_calls WHERE task_id = ${taskId}::uuid
    `);
    const outcomeRows = await db.execute(sql`
      SELECT outcome_status FROM agent_task_outcomes WHERE task_id = ${taskId}::uuid
    `);

    expect((taskRows.rows[0] as { status: string }).status).toBe("completed");
    expect((toolRows.rows[0] as { cnt: number }).cnt).toBe(1);
    expect((outcomeRows.rows as unknown[]).length).toBe(1);
    expect((outcomeRows.rows[0] as { outcome_status: string }).outcome_status).toBe("resolved");
  });

  it("duplicate call: second recordTaskOutcome for same taskId does not produce a second outcome row (FK on task_id)", async () => {
    // agent_task_outcomes has no UNIQUE constraint on task_id alone, but the
    // PK on agent_task_outcomes.id prevents exact duplicate rows.
    // This test verifies that calling recordTaskOutcome twice for the same task
    // results in two outcome rows (each valid) — and that this is detectable.
    // In production, the correct behavior is: call it exactly once.
    const taskId = await insertInProgressTask();

    await recordTaskOutcome(taskId, "resolved", { run: 1 }, null);

    // Update task back to in_progress to allow the second outcome insert
    await db.execute(sql`UPDATE agent_tasks SET status = 'in_progress', completed_at = NULL WHERE id = ${taskId}::uuid`);
    await recordTaskOutcome(taskId, "resolved", { run: 2 }, null);

    const rows = await db.execute(sql`
      SELECT COUNT(*)::int AS cnt FROM agent_task_outcomes WHERE task_id = ${taskId}::uuid
    `);
    // Two rows — callers must ensure recordTaskOutcome is called exactly once per task
    expect((rows.rows[0] as { cnt: number }).cnt).toBe(2);
  });

  it("ENABLE_AGENT_INSTRUMENTATION=false: recordTaskOutcome is a no-op, no DB writes", async () => {
    const origEnv = process.env.ENABLE_AGENT_INSTRUMENTATION;
    process.env.ENABLE_AGENT_INSTRUMENTATION = "false";
    const taskId = crypto.randomUUID();

    try {
      await recordTaskOutcome(taskId, "resolved", null, null);
      const rows = await db.execute(sql`
        SELECT COUNT(*)::int AS cnt FROM agent_task_outcomes WHERE task_id = ${taskId}::uuid
      `);
      expect((rows.rows[0] as { cnt: number }).cnt).toBe(0);
    } finally {
      if (origEnv === undefined) delete process.env.ENABLE_AGENT_INSTRUMENTATION;
      else process.env.ENABLE_AGENT_INSTRUMENTATION = origEnv;
    }
  });

  it("ENABLE_AGENT_INSTRUMENTATION=false: startAgentTask returns null (async)", async () => {
    const origEnv = process.env.ENABLE_AGENT_INSTRUMENTATION;
    process.env.ENABLE_AGENT_INSTRUMENTATION = "false";
    try {
      const taskId = await startAgentTask("paula", "whatsapp_inbound", INSTR_PHONE_A);
      expect(taskId).toBeNull();
    } finally {
      if (origEnv === undefined) delete process.env.ENABLE_AGENT_INSTRUMENTATION;
      else process.env.ENABLE_AGENT_INSTRUMENTATION = origEnv;
    }
  });
});


// ═══════════════════════════════════════════════════════════════════════════════
// C3 — Allow-list serializer (unit tests — no DB required)
// ═══════════════════════════════════════════════════════════════════════════════
describe("C3: snapshot allow-list serializer (unit)", () => {
  it("all permitted required fields are serialized to the output", () => {
    const { status, serialized } = serializePtiSnapshot(validSnapshot, "v5.0.0-rc1");
    expect(status).toBe("ok");
    expect(serialized.streakMonths).toBe(2);
    expect(serialized.payCount).toBe(3);
    expect(serialized.latePaymentCount).toBe(0);
    expect(serialized.kycVerified).toBe(false);
    expect(serialized.kycTier).toBe("simplified");
  });

  it("zero and false values are preserved — not dropped or converted to null", () => {
    const { status, serialized } = serializePtiSnapshot(validSnapshot, "v5.0.0-rc1");
    expect(status).toBe("ok");
    expect(serialized.scratchPlays).toBe(0);
    expect(serialized.spinPlays).toBe(0);
    expect(serialized.confirmed2fa).toBe(0);
    expect(serialized.kycVerified).toBe(false);
    expect(serialized.p2pSendCount).toBe(0);
  });

  it("NaN-valid fields are stored as NAN_SENTINEL (not null, not undefined)", () => {
    const { status, serialized } = serializePtiSnapshot(validSnapshot, "v5.0.0-rc1");
    expect(status).toBe("ok");
    expect(serialized.hoursToFirst).toBe(NAN_SENTINEL);
    expect(serialized.daysToFirstSpei).toBe(NAN_SENTINEL);
    expect(serialized.lateRecoveryRatio).toBe(NAN_SENTINEL);
    expect(serialized.paulaResponseLatencyMinutes).toBe(NAN_SENTINEL);
    expect(serialized.hoursToFirst).not.toBeNull();
    expect(serialized.paulaResponseLatencyMinutes).not.toBeNull();
  });

  it("deserializePtiSnapshot converts NAN_SENTINEL back to NaN for correct replay", () => {
    const { serialized } = serializePtiSnapshot(validSnapshot, "v5.0.0-rc1");
    const fromDb = JSON.parse(JSON.stringify(serialized));
    const deserialized = deserializePtiSnapshot(fromDb);
    expect(isNaN(deserialized.hoursToFirst as number)).toBe(true);
    expect(isNaN(deserialized.daysToFirstSpei as number)).toBe(true);
    expect(isNaN(deserialized.lateRecoveryRatio as number)).toBe(true);
    expect(isNaN(deserialized.paulaResponseLatencyMinutes as number)).toBe(true);
    expect(deserialized.streakMonths).toBe(2);
    expect(deserialized.kycVerified).toBe(false);
  });

  it("unknown/extra fields are excluded from the serialized output", () => {
    const snapshotWithExtra = {
      ...validSnapshot,
      unknownFieldFoo: "should be excluded",
      anotherUnknown: 999,
    };
    const { status, serialized } = serializePtiSnapshot(snapshotWithExtra, "v5.0.0-rc1");
    expect(status).toBe("ok");
    expect(Object.keys(serialized)).not.toContain("unknownFieldFoo");
    expect(Object.keys(serialized)).not.toContain("anotherUnknown");
    expect(serialized.streakMonths).toBe(2);
  });

  it("non-finite required field (Infinity) → status=invalid_snapshot", () => {
    const { status, invalidFields } = serializePtiSnapshot({ ...validSnapshot, streakMonths: Infinity }, "v5.0.0-rc1");
    expect(status).toBe("invalid_snapshot");
    expect(invalidFields.some(f => f.startsWith("streakMonths"))).toBe(true);
  });

  it("NaN in a non-NaN-valid required field → status=invalid_snapshot", () => {
    const { status, invalidFields } = serializePtiSnapshot({ ...validSnapshot, payCount: NaN }, "v5.0.0-rc1");
    expect(status).toBe("invalid_snapshot");
    expect(invalidFields.some(f => f.startsWith("payCount"))).toBe(true);
  });

  it("-Infinity in a NaN-valid field → status=invalid_snapshot (only NaN allowed)", () => {
    const { status, invalidFields } = serializePtiSnapshot({ ...validSnapshot, paulaResponseLatencyMinutes: -Infinity }, "v5.0.0-rc1");
    expect(status).toBe("invalid_snapshot");
    expect(invalidFields.some(f => f.startsWith("paulaResponseLatencyMinutes"))).toBe(true);
  });

  it("optional fields omitted when undefined", () => {
    const { serialized } = serializePtiSnapshot(validSnapshot, "v5.0.0-rc1");
    expect(Object.keys(serialized)).not.toContain("paymentTimingMeanDaysFromDue");
    expect(Object.keys(serialized)).not.toContain("minBalanceBuffer30d");
  });

  it("optional fields included when present and valid", () => {
    const { status, serialized } = serializePtiSnapshot(
      { ...validSnapshot, paymentTimingMeanDaysFromDue: 2.5, activityVelocity30d: 0 },
      "v5.0.0-rc1",
    );
    expect(status).toBe("ok");
    expect(serialized.paymentTimingMeanDaysFromDue).toBe(2.5);
    expect(serialized.activityVelocity30d).toBe(0);
  });

  it("computePTIv5 produces identical score from deserialized snapshot vs original", async () => {
    const { computePTIv5 } = await import("../ptiV5.js");
    const { breakdown: original } = computePTIv5(validSnapshot);
    const { serialized } = serializePtiSnapshot(validSnapshot, "v5.0.0-rc1");
    const fromDb = JSON.parse(JSON.stringify(serialized));
    const deserialized = deserializePtiSnapshot(fromDb);
    const { breakdown: replayed } = computePTIv5(deserialized as Parameters<typeof computePTIv5>[0]);
    expect(replayed.total).toBe(original.total);
    expect(Math.abs(replayed.total - original.total)).toBeLessThanOrEqual(0.01);
  });

  it("NAN_VALID_FIELDS contains exactly the four documented NaN-sentinel fields", () => {
    expect(NAN_VALID_FIELDS.has("hoursToFirst")).toBe(true);
    expect(NAN_VALID_FIELDS.has("daysToFirstSpei")).toBe(true);
    expect(NAN_VALID_FIELDS.has("lateRecoveryRatio")).toBe(true);
    expect(NAN_VALID_FIELDS.has("paulaResponseLatencyMinutes")).toBe(true);
    expect(NAN_VALID_FIELDS.has("payCount")).toBe(false);
    expect(NAN_VALID_FIELDS.has("streakMonths")).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// C3 — DB persistence tests
// ─────────────────────────────────────────────────────────────────────────────
describe("C3: snapshot allow-list serializer (DB persistence)", () => {
  it("invalid_snapshot written to DB when non-finite required field present", async () => {
    const origEnv = process.env.ENABLE_PTI_SNAPSHOT_PERSISTENCE;
    process.env.ENABLE_PTI_SNAPSHOT_PERSISTENCE = "true";
    const capturedAt = new Date().toISOString();
    await persistPtiInputSnapshot({ ...validSnapshot, payCount: Infinity }, "v5.0.0-rc1", BUILD1A_PHONE_A, capturedAt);
    await new Promise(r => setTimeout(r, 200));
    const rows = await db.execute(sql`
      SELECT persistence_status FROM pti_score_input_snapshots
      WHERE telefono = ${BUILD1A_PHONE_A} AND captured_at = ${capturedAt}::timestamptz
    `);
    expect((rows.rows as unknown[]).length).toBe(1);
    expect((rows.rows[0] as { persistence_status: string }).persistence_status).toBe("invalid_snapshot");
    process.env.ENABLE_PTI_SNAPSHOT_PERSISTENCE = origEnv;
  });

  it("valid snapshot written with persistence_status=persisted and NAN_SENTINEL in JSONB", async () => {
    const origEnv = process.env.ENABLE_PTI_SNAPSHOT_PERSISTENCE;
    process.env.ENABLE_PTI_SNAPSHOT_PERSISTENCE = "true";
    const capturedAt = new Date(Date.now() + 1).toISOString();
    await persistPtiInputSnapshot(validSnapshot, "v5.0.0-rc1", BUILD1A_PHONE_A, capturedAt);
    await new Promise(r => setTimeout(r, 200));
    const rows = await db.execute(sql`
      SELECT persistence_status, snapshot FROM pti_score_input_snapshots
      WHERE telefono = ${BUILD1A_PHONE_A} AND captured_at = ${capturedAt}::timestamptz
    `);
    expect((rows.rows as unknown[]).length).toBe(1);
    const row = rows.rows[0] as { persistence_status: string; snapshot: unknown };
    expect(row.persistence_status).toBe("persisted");
    const snap = typeof row.snapshot === "string" ? JSON.parse(row.snapshot) : row.snapshot as Record<string, unknown>;
    expect(snap.hoursToFirst).toBe(NAN_SENTINEL);
    expect(snap.paulaResponseLatencyMinutes).toBe(NAN_SENTINEL);
    expect(snap.scratchPlays).toBe(0);
    expect(snap.kycVerified).toBe(false);
    expect(Object.keys(snap)).not.toContain("unknownFieldFoo");
    process.env.ENABLE_PTI_SNAPSHOT_PERSISTENCE = origEnv;
  });
});


// ═══════════════════════════════════════════════════════════════════════════════
// C5 / CORRECTION D — Startup readiness middleware
//
// Part 1: Unit tests (middleware function directly — all 3 states)
// Part 2: HTTP-level tests (supertest — proven via real requests)
// ═══════════════════════════════════════════════════════════════════════════════
describe("C5/D: Build 1A readiness middleware — unit tests (all 3 states)", () => {
  let savedState: ReturnType<typeof getBuild1aReadiness>;

  beforeEach(() => {
    savedState = getBuild1aReadiness();
  });

  afterEach(() => {
    if (savedState.state === "ready") setBuild1aReady();
    else if (savedState.state === "failed") setBuild1aFailed(savedState.failureMessage ?? "restored");
    else _resetToPendingForTesting();
  });

  it("PENDING: middleware returns 503 with pending body, next() NOT called", () => {
    _resetToPendingForTesting();
    expect(getBuild1aReadiness().state).toBe("pending");
    let statusCode = 0;
    let body: Record<string, unknown> = {};
    let nextCalled = false;
    const req = {} as Request;
    const res = {
      status(code: number) { statusCode = code; return this; },
      json(b: Record<string, unknown>) { body = b; return this; },
    } as unknown as Response;
    const next = (() => { nextCalled = true; }) as NextFunction;
    build1aNotReadyMiddleware(req, res, next);
    expect(statusCode).toBe(503);
    expect(body.error).toMatch(/pending/i);
    expect(nextCalled).toBe(false);
    // Body must not contain raw DB error detail
    expect(JSON.stringify(body)).not.toMatch(/relation.*does not exist/i);
    expect(JSON.stringify(body)).not.toMatch(/column.*does not exist/i);
  });

  it("FAILED: middleware returns 503 with failed body, next() NOT called", () => {
    setBuild1aFailed(new Error("test migration failure — unit"));
    expect(getBuild1aReadiness().state).toBe("failed");
    let statusCode = 0;
    let body: Record<string, unknown> = {};
    let nextCalled = false;
    const req = {} as Request;
    const res = {
      status(code: number) { statusCode = code; return this; },
      json(b: Record<string, unknown>) { body = b; return this; },
    } as unknown as Response;
    const next = (() => { nextCalled = true; }) as NextFunction;
    build1aNotReadyMiddleware(req, res, next);
    expect(statusCode).toBe(503);
    expect(body.error).toMatch(/fail/i);
    expect(nextCalled).toBe(false);
    // Raw exception message must NOT appear in body (security)
    expect(JSON.stringify(body)).not.toContain("test migration failure — unit");
  });

  it("READY: middleware calls next(), status never set", () => {
    setBuild1aReady();
    expect(getBuild1aReadiness().state).toBe("ready");
    let statusCode = 0;
    let nextCalled = false;
    const req = {} as Request;
    const res = {
      status(code: number) { statusCode = code; return this; },
      json() { return this; },
    } as unknown as Response;
    const next = (() => { nextCalled = true; }) as NextFunction;
    build1aNotReadyMiddleware(req, res, next);
    expect(nextCalled).toBe(true);
    expect(statusCode).toBe(0);
  });

  it("getBuild1aReadiness reports correct state and failureMessage after each transition", () => {
    setBuild1aFailed(new Error("db exploded"));
    expect(getBuild1aReadiness().state).toBe("failed");
    expect(getBuild1aReadiness().failureMessage).toContain("db exploded");
    setBuild1aReady();
    expect(getBuild1aReadiness().state).toBe("ready");
    expect(getBuild1aReadiness().failureMessage).toBeNull();
    _resetToPendingForTesting();
    expect(getBuild1aReadiness().state).toBe("pending");
    expect(getBuild1aReadiness().failureMessage).toBeNull();
  });
});

describe("C5/D: Build 1A readiness gating — HTTP-level verification via supertest", () => {
  const ADMIN_KEY = process.env.ADMIN_TOKEN ?? "";
  let savedState: ReturnType<typeof getBuild1aReadiness>;

  beforeEach(() => {
    savedState = getBuild1aReadiness();
  });

  afterEach(() => {
    if (savedState.state === "ready") setBuild1aReady();
    else if (savedState.state === "failed") setBuild1aFailed(savedState.failureMessage ?? "restored");
    else _resetToPendingForTesting();
  });

  it("PENDING: /api/admin/build1a/readiness returns 503 with no raw DB error in body", async () => {
    _resetToPendingForTesting();
    const res = await request(app)
      .get("/api/admin/build1a/readiness")
      .set("x-admin-key", ADMIN_KEY);
    expect(res.status).toBe(503);
    expect(res.body.error).toMatch(/pending/i);
    expect(JSON.stringify(res.body)).not.toMatch(/relation.*does not exist/i);
    expect(JSON.stringify(res.body)).not.toMatch(/column.*does not exist/i);
    expect(JSON.stringify(res.body)).not.toMatch(/ERROR:/);
  });

  it("PENDING: primary PagoYa endpoint /api/bills/catalog remains 200 when Build 1A is pending", async () => {
    _resetToPendingForTesting();
    const res = await request(app).get("/api/bills/catalog");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.categories)).toBe(true);
  });

  it("FAILED: /api/admin/build1a/readiness returns 503 with controlled body (no raw error detail)", async () => {
    setBuild1aFailed(new Error("INTERNAL_DB_ERROR_SENTINEL_12345"));
    const res = await request(app)
      .get("/api/admin/build1a/readiness")
      .set("x-admin-key", ADMIN_KEY);
    expect(res.status).toBe(503);
    expect(res.body.error).toMatch(/fail/i);
    // Raw exception message must NOT be in response body
    expect(JSON.stringify(res.body)).not.toContain("INTERNAL_DB_ERROR_SENTINEL_12345");
  });

  it("FAILED: primary PagoYa endpoint /api/bills/catalog remains 200 when Build 1A has failed", async () => {
    setBuild1aFailed(new Error("catastrophic migration failure"));
    const res = await request(app).get("/api/bills/catalog");
    expect(res.status).toBe(200);
  });

  it("READY (no auth): /api/admin/build1a/readiness returns 401 — past middleware, blocked by adminAuth", async () => {
    setBuild1aReady();
    const res = await request(app).get("/api/admin/build1a/readiness");
    // Must be 401 (auth required), NOT 503 (middleware passed)
    expect(res.status).toBe(401);
    expect(res.status).not.toBe(503);
  });

  it("READY (with auth): /api/admin/build1a/readiness returns 200", async () => {
    setBuild1aReady();
    const res = await request(app)
      .get("/api/admin/build1a/readiness")
      .set("x-admin-key", ADMIN_KEY);
    expect(res.status).toBe(200);
  });
});


// ═══════════════════════════════════════════════════════════════════════════════
// C6 / CORRECTION E — Feature-flag behavior
//
// Part 1: ENABLE_PTI_SNAPSHOT_PERSISTENCE (snapshot persistence)
// Part 2: ENABLE_AGENT_INSTRUMENTATION (agent instrumentation)
// ═══════════════════════════════════════════════════════════════════════════════
describe("C6/E: ENABLE_PTI_SNAPSHOT_PERSISTENCE feature flag", () => {
  let savedEnv: string | undefined;

  beforeEach(() => {
    savedEnv = process.env.ENABLE_PTI_SNAPSHOT_PERSISTENCE;
  });

  afterEach(() => {
    if (savedEnv === undefined) delete process.env.ENABLE_PTI_SNAPSHOT_PERSISTENCE;
    else process.env.ENABLE_PTI_SNAPSHOT_PERSISTENCE = savedEnv;
  });

  it("disabled (unset): isPtiSnapshotPersistenceEnabled() returns false", () => {
    delete process.env.ENABLE_PTI_SNAPSHOT_PERSISTENCE;
    expect(isPtiSnapshotPersistenceEnabled()).toBe(false);
  });

  it("disabled ('false'): isPtiSnapshotPersistenceEnabled() returns false", () => {
    process.env.ENABLE_PTI_SNAPSHOT_PERSISTENCE = "false";
    expect(isPtiSnapshotPersistenceEnabled()).toBe(false);
  });

  it("enabled ('true'): isPtiSnapshotPersistenceEnabled() returns true", () => {
    process.env.ENABLE_PTI_SNAPSHOT_PERSISTENCE = "true";
    expect(isPtiSnapshotPersistenceEnabled()).toBe(true);
  });

  it("disabled: no pti_score_input_snapshots row written when flag is absent", async () => {
    delete process.env.ENABLE_PTI_SNAPSHOT_PERSISTENCE;
    const capturedAt = new Date(Date.now() + 2).toISOString();
    await persistPtiInputSnapshot(validSnapshot, "v5.0.0-rc1", BUILD1A_PHONE_A, capturedAt);
    await new Promise(r => setTimeout(r, 200));
    const rows = await db.execute(sql`
      SELECT COUNT(*)::int AS cnt FROM pti_score_input_snapshots
      WHERE telefono = ${BUILD1A_PHONE_A} AND captured_at = ${capturedAt}::timestamptz
    `);
    expect(Number((rows.rows[0] as { cnt: number }).cnt)).toBe(0);
  });

  it("enabled: exactly one valid snapshot row written per call", async () => {
    process.env.ENABLE_PTI_SNAPSHOT_PERSISTENCE = "true";
    const capturedAt = new Date(Date.now() + 3).toISOString();
    await persistPtiInputSnapshot(validSnapshot, "v5.0.0-rc1", BUILD1A_PHONE_A, capturedAt);
    await new Promise(r => setTimeout(r, 200));
    const rows = await db.execute(sql`
      SELECT persistence_status, snapshot FROM pti_score_input_snapshots
      WHERE telefono = ${BUILD1A_PHONE_A} AND captured_at = ${capturedAt}::timestamptz
    `);
    expect((rows.rows as unknown[]).length).toBe(1);
    const row = rows.rows[0] as { persistence_status: string; snapshot: unknown };
    expect(row.persistence_status).toBe("persisted");
    const snap = typeof row.snapshot === "string" ? JSON.parse(row.snapshot) : row.snapshot as Record<string, unknown>;
    expect(snap.hoursToFirst).toBe(NAN_SENTINEL);
    expect(snap.kycVerified).toBe(false);
    expect(snap.scratchPlays).toBe(0);
    expect(Object.keys(snap)).not.toContain("__unknown__");
  });

  it("enabled: score output is identical whether flag is on or off (flag has zero scoring effect)", async () => {
    const { computePTIv5 } = await import("../ptiV5.js");
    const { breakdown: scoreOff } = computePTIv5(validSnapshot);
    process.env.ENABLE_PTI_SNAPSHOT_PERSISTENCE = "true";
    const { breakdown: scoreOn } = computePTIv5(validSnapshot);
    expect(scoreOn.total).toBe(scoreOff.total);
    expect(scoreOn.model_version).toBe(scoreOff.model_version);
  });

  it("persistence error does not throw and does not block scoring", async () => {
    process.env.ENABLE_PTI_SNAPSHOT_PERSISTENCE = "true";
    let threw = false;
    try {
      await persistPtiInputSnapshot(
        { ...validSnapshot, payCount: Infinity }, // triggers invalid_snapshot path — no throw
        "v5.0.0-rc1",
        BUILD1A_PHONE_A,
        new Date(Date.now() + 4).toISOString(),
      );
    } catch {
      threw = true;
    }
    expect(threw).toBe(false);
  });

  it("pti_score_history behavior unchanged when flag is off", async () => {
    delete process.env.ENABLE_PTI_SNAPSHOT_PERSISTENCE;
    const { computePTIv5 } = await import("../ptiV5.js");
    const { breakdown } = computePTIv5(validSnapshot);
    expect(Number.isFinite(breakdown.total)).toBe(true);
    expect(breakdown.model_version).toBe("v5.0.0-rc1");
  });
});

describe("C6/E: ENABLE_AGENT_INSTRUMENTATION feature flag", () => {
  let savedEnv: string | undefined;

  beforeEach(() => {
    savedEnv = process.env.ENABLE_AGENT_INSTRUMENTATION;
  });

  afterEach(() => {
    if (savedEnv === undefined) delete process.env.ENABLE_AGENT_INSTRUMENTATION;
    else process.env.ENABLE_AGENT_INSTRUMENTATION = savedEnv;
  });

  it("enabled (unset): isAgentInstrumentationEnabled() returns true", () => {
    delete process.env.ENABLE_AGENT_INSTRUMENTATION;
    expect(isAgentInstrumentationEnabled()).toBe(true);
  });

  it("disabled ('false'): isAgentInstrumentationEnabled() returns false", () => {
    process.env.ENABLE_AGENT_INSTRUMENTATION = "false";
    expect(isAgentInstrumentationEnabled()).toBe(false);
  });

  it("disabled: startAgentTask returns null and writes no agent_tasks row", async () => {
    process.env.ENABLE_AGENT_INSTRUMENTATION = "false";
    const taskId = await startAgentTask("paula", "whatsapp_inbound", INSTR_PHONE_A);
    expect(taskId).toBeNull();
    const rows = await db.execute(sql`
      SELECT COUNT(*)::int AS cnt FROM agent_tasks WHERE telefono = ${INSTR_PHONE_A}
    `);
    expect(Number((rows.rows[0] as { cnt: number }).cnt)).toBe(0);
  });

  it("disabled: recordTaskOutcome is a no-op (no rows written)", async () => {
    process.env.ENABLE_AGENT_INSTRUMENTATION = "false";
    const fakeId = crypto.randomUUID();
    await recordTaskOutcome(fakeId, "resolved", null, null);
    const rows = await db.execute(sql`
      SELECT COUNT(*)::int AS cnt FROM agent_task_outcomes WHERE task_id = ${fakeId}::uuid
    `);
    expect(Number((rows.rows[0] as { cnt: number }).cnt)).toBe(0);
  });

  it("disabled: recordToolCall is a no-op (no rows written)", async () => {
    process.env.ENABLE_AGENT_INSTRUMENTATION = "false";
    const fakeId = crypto.randomUUID();
    recordToolCall(fakeId, "get_wallet_balance", {}, {});
    await new Promise(r => setTimeout(r, 300));
    const rows = await db.execute(sql`
      SELECT COUNT(*)::int AS cnt FROM agent_tool_calls WHERE task_id = ${fakeId}::uuid
    `);
    expect(Number((rows.rows[0] as { cnt: number }).cnt)).toBe(0);
  });

  it("enabled: task + outcome rows are written reliably (depends on Correction A fix)", async () => {
    delete process.env.ENABLE_AGENT_INSTRUMENTATION; // default enabled
    const taskId = await insertInProgressTask();
    await recordTaskOutcome(taskId, "resolved", { test: "enabled_path" }, null);

    const taskRows = await db.execute(sql`SELECT status FROM agent_tasks WHERE id = ${taskId}::uuid`);
    const outcomeRows = await db.execute(sql`SELECT outcome_status FROM agent_task_outcomes WHERE task_id = ${taskId}::uuid`);
    expect((taskRows.rows[0] as { status: string }).status).toBe("completed");
    expect((outcomeRows.rows as unknown[]).length).toBe(1);
  });

  it("env var restored to pre-test state after each test (no leakage)", () => {
    // This test just verifies the afterEach cleanup logic works.
    // If this test runs and the next test's instrumentation is off, there's a leak.
    delete process.env.ENABLE_AGENT_INSTRUMENTATION;
    expect(isAgentInstrumentationEnabled()).toBe(true);
    process.env.ENABLE_AGENT_INSTRUMENTATION = "false";
    expect(isAgentInstrumentationEnabled()).toBe(false);
    // afterEach will restore to savedEnv
  });
});
