/**
 * Build 2A — Source Ingestion Poller (Package 2A-2)
 *
 * The sole ingestion entry point for the Evidence Engine.
 *
 * Architecture:
 *   - DB-poll pattern (no Redis, BullMQ, or separate worker process).
 *   - Runs only when ENABLE_EVIDENCE_ENGINE=true.
 *   - Does NOT affect primary application readiness, Build 1A, Paula, payments, wallet, or PTI.
 *   - No request-path hook — runs entirely in the background on a timer.
 *   - Single-start guard (in-memory boolean) supplements FOR UPDATE SKIP LOCKED.
 *
 * Work-claiming mechanism:
 *   FOR UPDATE SKIP LOCKED on source_processing_ledger.
 *   Two overlapping poll cycles that try to claim the same ledger row will result
 *   in exactly one succeeding; the other skips the row and processes nothing.
 *   The in-memory guard additionally prevents two poll cycles from starting
 *   simultaneously in the same process, providing belt-and-suspenders protection.
 *
 * Poll cycle (per tick):
 *   1. Abandon timed-out assembling clusters (creates refusal_records, updates ledger).
 *   2. Find new resolved agent_task_outcomes not yet in the ledger — INSERT pending rows.
 *   3. Claim a batch of pending/retry-eligible rows (FOR UPDATE SKIP LOCKED).
 *   4. For each claimed row: process it end-to-end.
 *   5. Release the DB lock (transaction commits/rolls back per row).
 *
 * Per-row processing:
 *   a. Read the source outcome row from agent_task_outcomes.
 *   b. Join to agent_tasks to get agent_id for entity resolution.
 *   c. Resolve Behavioral Entity: {autonomous_agent, build1a_agent_system, agent_id}.
 *   d. Resolve Behavioral Claim (claimResolution.ts).
 *   e. Verify exact domain_source_eligibility (domainSourceEligibility.ts).
 *   f. Create cluster_assembly with expected_observation_count from rule_content.
 *   g. Add observation link.
 *   h. Interpret (interpretation.ts).
 *   i. If interpretation succeeded: sealClusterAndCreateAtom, update ledger → succeeded.
 *   j. If interpretation refused: create refusal_record, update ledger → refused.
 *   k. If any step errors: record error in ledger.errors, update ledger → failed, retry eligible.
 */

import { sql } from "drizzle-orm";
import { logger } from "../../lib/logger.js";
import { resolveOrCreateEntity } from "./behavioralEntityResolution.js";
import { resolveClaimForIngestion, resolvePrimitiveAndDomain } from "./claimResolution.js";
import { checkDomainSourceEligibility } from "./domainSourceEligibility.js";
import {
  createCluster,
  addObservationLink,
  abandonTimedOutClusters,
  getExpectedObservationCount,
} from "./clusterAssembly.js";
import { sealClusterAndCreateAtom } from "./atomConstruction.js";
import { interpret } from "./interpretation.js";
import { isBuild2a2Ready } from "./build2aReadiness.js";

/** Maximum ledger rows processed per poll cycle. */
const BATCH_SIZE = 10;
/** Maximum retry attempts before a ledger row is permanently failed. */
const MAX_RETRY_ATTEMPTS = 3;
/** Poll interval in milliseconds. */
const POLL_INTERVAL_MS = 30_000;

/** In-memory guard: prevents two poll cycles from running concurrently in one process. */
let _pollRunning = false;
/** Single-start guard: prevents duplicate poller intervals. */
let _pollerStarted = false;

export type PollRowResult = {
  sourceRecordKey: string;
  ledgerId: string;
  outcome:
    | "atom_created"
    | "refused"
    | "failed"
    | "skipped_no_claim"
    | "skipped_ineligible"
    | "skipped_entity_error";
  atomId?: string;
  refusalId?: string;
  detail?: string;
};

export type PollCycleResult = {
  abandoned_clusters: number;
  new_pending_inserted: number;
  rows_claimed: number;
  rows_processed: PollRowResult[];
};

/**
 * Run one complete poll cycle. Exported for testing.
 * Safe to call concurrently — the in-memory guard and FOR UPDATE SKIP LOCKED
 * ensure at most one cycle processes each row.
 */
export async function runPollCycle(): Promise<PollCycleResult> {
  if (_pollRunning) {
    logger.debug("[Build2A/poller] poll cycle skipped — previous cycle still running");
    return { abandoned_clusters: 0, new_pending_inserted: 0, rows_claimed: 0, rows_processed: [] };
  }

  if (!isBuild2a2Ready()) {
    logger.debug("[Build2A/poller] poll cycle skipped — Package 2A-2 not yet ready");
    return { abandoned_clusters: 0, new_pending_inserted: 0, rows_claimed: 0, rows_processed: [] };
  }

  _pollRunning = true;
  try {
    return await _runPollCycleInner();
  } finally {
    _pollRunning = false;
  }
}

async function _runPollCycleInner(): Promise<PollCycleResult> {
  const dbModule = await import("@workspace/db");
  const db = dbModule.db;
  const pool = dbModule.pool;

  // ── Step 1: Abandon timed-out clusters ────────────────────────────────────
  const abandonedClusters = await abandonTimedOutClusters().catch(err => {
    logger.error({ err }, "[Build2A/poller] abandonTimedOutClusters failed");
    return [];
  });

  // ── Step 2: Resolve the registry/rule IDs needed for this rule ────────────
  // Resolve once per cycle (not per row) for efficiency.
  const [sourceRegistryResult, ruleVersionResult] = await Promise.all([
    db.execute(sql`
      SELECT id FROM evidence_source_registry
      WHERE source_key = 'agent_task_outcomes' AND approval_status = 'approved'
      LIMIT 1
    `),
    db.execute(sql`
      SELECT id, rule_content FROM interpretation_rule_versions
      WHERE implementation_key = 'task_completion_v1' AND is_active = true
      LIMIT 1
    `),
  ]);

  const sourceRegistryRow = sourceRegistryResult.rows[0] as { id: string } | undefined;
  const ruleVersionRow = ruleVersionResult.rows[0] as {
    id: string;
    rule_content: Record<string, unknown>;
  } | undefined;

  if (!sourceRegistryRow || !ruleVersionRow) {
    logger.warn(
      { hasSource: !!sourceRegistryRow, hasRule: !!ruleVersionRow },
      "[Build2A/poller] required registry entries not found — skipping cycle",
    );
    return { abandoned_clusters: abandonedClusters.length, new_pending_inserted: 0, rows_claimed: 0, rows_processed: [] };
  }

  const sourceRegistryId = sourceRegistryRow.id;
  const ruleVersionId = ruleVersionRow.id;

  // ── Step 3: Insert pending ledger rows for new unprocessed outcomes ────────
  const insertResult = await db.execute(sql`
    INSERT INTO source_processing_ledger
      (evidence_source_registry_id, source_record_key, interpretation_rule_version_id)
    SELECT
      ${sourceRegistryId}::uuid,
      ato.id::text,
      ${ruleVersionId}::uuid
    FROM agent_task_outcomes ato
    WHERE ato.resolved_at IS NOT NULL
      AND ato.superseded_by IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM source_processing_ledger spl
        WHERE spl.evidence_source_registry_id = ${sourceRegistryId}::uuid
          AND spl.source_record_key = ato.id::text
          AND spl.interpretation_rule_version_id = ${ruleVersionId}::uuid
      )
    ON CONFLICT (evidence_source_registry_id, source_record_key, interpretation_rule_version_id)
      DO NOTHING
  `);
  const newPending = Number((insertResult as { rowCount?: number }).rowCount ?? 0);

  // ── Step 4: Claim a batch using FOR UPDATE SKIP LOCKED ────────────────────
  // Uses a transaction so the lock is held only while we fetch the IDs.
  // Each row is then processed independently with its own transaction.
  const client = await pool.connect();
  let claimedRows: Array<{ id: string; source_record_key: string }> = [];
  try {
    await client.query("BEGIN");
    const claimRes = await client.query(
      `UPDATE source_processing_ledger
       SET status           = 'processing',
           attempts         = attempts + 1,
           last_attempted_at = NOW()
       WHERE id IN (
         SELECT id FROM source_processing_ledger
         WHERE evidence_source_registry_id = $1::uuid
           AND interpretation_rule_version_id = $2::uuid
           AND (
             status = 'pending'
             OR (status = 'failed' AND attempts < $3)
           )
         ORDER BY first_seen_at ASC
         LIMIT $4
         FOR UPDATE SKIP LOCKED
       )
       RETURNING id, source_record_key`,
      [sourceRegistryId, ruleVersionId, MAX_RETRY_ATTEMPTS, BATCH_SIZE],
    );
    claimedRows = claimRes.rows as Array<{ id: string; source_record_key: string }>;
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {/* ignore */});
    logger.error({ err }, "[Build2A/poller] claim transaction failed");
    return { abandoned_clusters: abandonedClusters.length, new_pending_inserted: newPending, rows_claimed: 0, rows_processed: [] };
  } finally {
    client.release();
  }

  if (claimedRows.length === 0) {
    return { abandoned_clusters: abandonedClusters.length, new_pending_inserted: newPending, rows_claimed: 0, rows_processed: [] };
  }

  // ── Step 5: Process each claimed row ──────────────────────────────────────
  // Pre-resolve primitive/domain IDs once (same for all rows in this rule)
  const primitiveAndDomain = await resolvePrimitiveAndDomain(
    "agent_guided_task_completion",
    "agent_instrumentation",
  );

  const { expectedCount, abandonTimeoutSeconds } = await getExpectedObservationCount(ruleVersionId);

  const rowResults: PollRowResult[] = [];

  for (const claimed of claimedRows) {
    const result = await _processOneRow({
      db,
      ledgerId: claimed.id,
      sourceRecordKey: claimed.source_record_key,
      sourceRegistryId,
      ruleVersionId,
      ruleVersionRow,
      primitiveAndDomain,
      expectedCount,
      abandonTimeoutSeconds,
    });
    rowResults.push(result);
  }

  logger.info(
    {
      abandoned: abandonedClusters.length,
      newPending,
      claimed: claimedRows.length,
      atomsCreated: rowResults.filter(r => r.outcome === "atom_created").length,
      refused: rowResults.filter(r => r.outcome === "refused").length,
      failed: rowResults.filter(r => r.outcome === "failed").length,
    },
    "[Build2A/poller] poll cycle complete",
  );

  return {
    abandoned_clusters: abandonedClusters.length,
    new_pending_inserted: newPending,
    rows_claimed: claimedRows.length,
    rows_processed: rowResults,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DbType = any;

async function _processOneRow(params: {
  db: DbType;
  ledgerId: string;
  sourceRecordKey: string;
  sourceRegistryId: string;
  ruleVersionId: string;
  ruleVersionRow: { id: string; rule_content: Record<string, unknown> };
  primitiveAndDomain: { primitiveId: string; domainModuleId: string } | null;
  expectedCount: number;
  abandonTimeoutSeconds: number;
  ruleVersionRow: { id: string; rule_content: Record<string, unknown> };
}): Promise<PollRowResult> {
  const {
    db, ledgerId, sourceRecordKey, sourceRegistryId,
    ruleVersionId, primitiveAndDomain, expectedCount, abandonTimeoutSeconds,
  } = params;

  const base: PollRowResult = { sourceRecordKey, ledgerId, outcome: "failed" };

  try {
    // a. Read the source outcome row + joined task row
    const outcomeResult = await db.execute(sql`
      SELECT
        ato.id::text              AS outcome_id,
        ato.task_id::text         AS task_id,
        ato.outcome_status,
        ato.failure_class,
        ato.resolution_confidence,
        ato.source_attribution,
        ato.resolved_at,
        ato.superseded_by,
        at2.agent_id,
        at2.task_class,
        at2.created_at            AS task_created_at
      FROM agent_task_outcomes ato
      JOIN agent_tasks at2 ON at2.id = ato.task_id
      WHERE ato.id = ${sourceRecordKey}::uuid
      LIMIT 1
    `);

    const outcomeRow = outcomeResult.rows[0] as {
      outcome_id: string;
      task_id: string;
      outcome_status: string;
      failure_class: string | null;
      resolution_confidence: number | null;
      source_attribution: string;
      resolved_at: string;
      superseded_by: string | null;
      agent_id: number;
      task_class: string;
      task_created_at: string;
    } | undefined;

    if (!outcomeRow) {
      return await _failLedger(db, ledgerId, base, "processing_failure",
        `agent_task_outcomes row ${sourceRecordKey} not found`);
    }

    // b. Resolve Behavioral Entity for the agent
    // entity_type = autonomous_agent, native_system = build1a_agent_system, native_id = agent_id
    const entityResult = await resolveOrCreateEntity(
      "autonomous_agent",
      "build1a_agent_system",
      String(outcomeRow.agent_id),
    );

    if (!entityResult.resolved) {
      return {
        ...base,
        outcome: "skipped_entity_error",
        detail: entityResult.detail,
      };
    }

    const entityId = entityResult.entity.id;

    // c. Resolve primitive/domain IDs
    if (!primitiveAndDomain) {
      return await _failLedger(db, ledgerId, base, "processing_failure",
        "Could not resolve agent_guided_task_completion primitive or agent_instrumentation domain");
    }
    const { primitiveId, domainModuleId } = primitiveAndDomain;

    // d. Resolve active Behavioral Claim
    const claimResult = await resolveClaimForIngestion(
      entityId,
      primitiveId,
      domainModuleId,
      outcomeRow.resolved_at ?? new Date().toISOString(),
    );

    if (!claimResult.resolved) {
      // Record refusal and update ledger
      const refusalId = await _insertRefusal(db, {
        stage: "claim_formulation",
        reasonCode: "no_matching_claim",
        sourceObservationKey: sourceRecordKey,
        sourceRegistryId,
        ruleVersionId,
        detail: claimResult.detail,
      });
      await _refuseLedger(db, ledgerId, refusalId);
      return { ...base, outcome: "skipped_no_claim", refusalId, detail: claimResult.detail };
    }

    const claim = claimResult.claim;

    // e. Verify exact domain_source_eligibility
    const eligResult = await checkDomainSourceEligibility(
      claim.domain_slug,
      "agent_task_outcomes",
      primitiveId,
    );

    if (!eligResult.eligible) {
      const refusalId = await _insertRefusal(db, {
        stage: "source_approval",
        reasonCode: eligResult.refusal_reason === "revoked_eligibility"
          ? "revoked_source_eligibility"
          : eligResult.refusal_reason === "primitive_mismatch"
          ? "primitive_mismatch"
          : "source_not_eligible",
        claimId: claim.id,
        sourceObservationKey: sourceRecordKey,
        sourceRegistryId,
        ruleVersionId,
        detail: eligResult.detail,
      });
      await _refuseLedger(db, ledgerId, refusalId);
      return { ...base, outcome: "skipped_ineligible", refusalId, detail: eligResult.detail };
    }

    // f. Create cluster_assembly
    const cluster = await createCluster(claim.id, ruleVersionId, expectedCount, abandonTimeoutSeconds);

    // g. Add observation link (seq=1)
    await addObservationLink(cluster.id, sourceRegistryId, sourceRecordKey, 1);

    // h. Interpret
    const now = new Date().toISOString();
    const interpResult = await interpret({
      implementationKey: "task_completion_v1",
      ruleVersionId,
      observations: [
        {
          sequence_position: 1,
          source_key: "agent_task_outcomes",
          source_record_key: sourceRecordKey,
          source_data: {
            outcome_id: outcomeRow.outcome_id,
            task_id: outcomeRow.task_id,
            outcome_status: outcomeRow.outcome_status,
            failure_class: outcomeRow.failure_class,
            source_attribution: outcomeRow.source_attribution,
            resolved_at: outcomeRow.resolved_at,
            // Omit: resolution_confidence, task_class, agent_id (not needed for replay)
          },
        },
      ],
      claim: {
        id: claim.id,
        primitive_name: claim.primitive_name,
        domain_slug: claim.domain_slug,
        window_start: claim.window_start,
        window_end: claim.window_end,
        falsifiability_condition: claim.falsifiability_condition,
      },
      interpreted_at: now,
    });

    if (interpResult.refused) {
      // Interpretation refused → record refusal, abandon cluster, update ledger
      const refusalId = await _insertRefusal(db, {
        stage: "interpretation",
        reasonCode: interpResult.reason_code === "ambiguous_interpretation"
          ? "ambiguous_interpretation"
          : interpResult.reason_code === "prohibited_inference"
          ? "prohibited_inference"
          : "invalid_or_unavailable_version",
        claimId: claim.id,
        clusterAssemblyId: cluster.id,
        sourceObservationKey: sourceRecordKey,
        sourceRegistryId,
        ruleVersionId,
        detail: interpResult.detail,
      });

      // Abandon the cluster since no atom will be created
      await db.execute(sql`
        UPDATE cluster_assembly
        SET assembly_state = 'abandoned', abandoned_at = NOW()
        WHERE id = ${cluster.id}::uuid
      `);

      await _refuseLedger(db, ledgerId, refusalId);
      return { ...base, outcome: "refused", refusalId, detail: interpResult.detail };
    }

    // i. Seal cluster and create atom (atomic transaction)
    const sealResult = await sealClusterAndCreateAtom({
      clusterId: cluster.id,
      claimId: claim.id,
      ruleVersionId,
      disposition: interpResult.disposition,
      dependenceDeclaration: interpResult.dependence_declaration,
      effectiveAt: outcomeRow.resolved_at ?? now,
      environmentContext: interpResult.environment_context,
    });

    if (!sealResult.sealed) {
      return await _failLedger(db, ledgerId, base,
        "processing_failure",
        `Seal failed: ${sealResult.detail} (reason: ${sealResult.reason})`);
    }

    // j. Update ledger to succeeded
    await db.execute(sql`
      UPDATE source_processing_ledger
      SET status            = 'succeeded',
          completed_at      = NOW(),
          resulting_atom_id = ${sealResult.atom.id}::uuid
      WHERE id = ${ledgerId}::uuid
    `);

    return { ...base, outcome: "atom_created", atomId: sealResult.atom.id };
  } catch (err) {
    logger.error({ err, ledgerId, sourceRecordKey }, "[Build2A/poller] row processing error");
    return await _failLedger(
      db, ledgerId, base, "processing_failure",
      err instanceof Error ? err.message : String(err),
    );
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function _insertRefusal(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  params: {
    stage: string;
    reasonCode: string;
    claimId?: string;
    clusterAssemblyId?: string;
    sourceObservationKey?: string;
    sourceRegistryId?: string;
    ruleVersionId?: string;
    detail: string;
  },
): Promise<string> {
  const result = await db.execute(sql`
    INSERT INTO refusal_records
      (refusal_stage, reason_code, claim_id, cluster_assembly_id,
       source_observation_key, evidence_source_registry_id,
       interpretation_rule_version_id, detail)
    VALUES (
      ${params.stage},
      ${params.reasonCode},
      ${params.claimId ?? null}::uuid,
      ${params.clusterAssemblyId ?? null}::uuid,
      ${params.sourceObservationKey ?? null},
      ${params.sourceRegistryId ?? null}::uuid,
      ${params.ruleVersionId ?? null}::uuid,
      ${params.detail}
    )
    RETURNING id
  `);
  return (result.rows[0] as { id: string }).id;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function _refuseLedger(db: any, ledgerId: string, refusalId: string): Promise<void> {
  await db.execute(sql`
    UPDATE source_processing_ledger
    SET status               = 'refused',
        completed_at         = NOW(),
        resulting_refusal_id = ${refusalId}::uuid
    WHERE id = ${ledgerId}::uuid
  `);
}

async function _failLedger(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  ledgerId: string,
  base: PollRowResult,
  reasonCode: string,
  detail: string,
): Promise<PollRowResult> {
  const errorEntry = JSON.stringify([{
    reason: reasonCode,
    detail,
    at: new Date().toISOString(),
  }]);
  await db.execute(sql`
    UPDATE source_processing_ledger
    SET status            = 'failed',
        last_attempted_at = NOW(),
        errors            = errors || ${errorEntry}::jsonb
    WHERE id = ${ledgerId}::uuid
  `).catch(err => {
    logger.error({ err, ledgerId }, "[Build2A/poller] failed to update ledger to failed");
  });
  return { ...base, outcome: "failed", detail };
}

/**
 * Start the Evidence Engine source ingestion poller.
 *
 * Checks ENABLE_EVIDENCE_ENGINE=true before starting.
 * Single-start guard prevents duplicate intervals.
 * Does NOT affect application startup, Build 1A, or any request path.
 *
 * Returns a stop function to clean up the interval.
 */
export function startEvidencePoller(): { stop: () => void } {
  if (!process.env.ENABLE_EVIDENCE_ENGINE || process.env.ENABLE_EVIDENCE_ENGINE !== "true") {
    logger.info("[Build2A/poller] ENABLE_EVIDENCE_ENGINE is not 'true' — poller will not start");
    return { stop: () => {/* no-op */} };
  }

  if (_pollerStarted) {
    logger.warn("[Build2A/poller] startEvidencePoller() called more than once — ignoring duplicate");
    return { stop: () => {/* no-op, already started */} };
  }

  _pollerStarted = true;

  const intervalHandle = setInterval(() => {
    runPollCycle().catch(err => {
      logger.error({ err }, "[Build2A/poller] unhandled error in poll cycle");
    });
  }, POLL_INTERVAL_MS);

  // Prevent the interval from keeping the process alive
  if (intervalHandle.unref) intervalHandle.unref();

  logger.info(
    { intervalMs: POLL_INTERVAL_MS, batchSize: BATCH_SIZE },
    "[Build2A/poller] Evidence Engine source ingestion poller started",
  );

  return {
    stop: () => {
      clearInterval(intervalHandle);
      _pollerStarted = false;
      logger.info("[Build2A/poller] poller stopped");
    },
  };
}

/**
 * TEST-ONLY: reset the single-start and running guards.
 * Never call from production code.
 */
export function _resetPollerStateForTesting(): void {
  _pollerStarted = false;
  _pollRunning = false;
}
