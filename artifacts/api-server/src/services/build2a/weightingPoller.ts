/**
 * Build 2A — Weighting Poller (Package 2A-3)
 *
 * Async DB poller that continuously weights Evidence Atoms that have not yet
 * received a Weighted Evidence Contribution under the current active rule versions.
 *
 * Architecture mirrors sourceIngestionPoller.ts:
 *   - FOR UPDATE SKIP LOCKED on weighting_ledger rows (prevents duplicate work under concurrent pollers)
 *   - Single-start guard (startWeightingPoller idempotent: only one interval per process)
 *   - ENABLE_EVIDENCE_ENGINE=true flag gate (same as the evidence ingestion poller)
 *   - Chains after Package 2A-3 readiness is confirmed (not 2A-1 or 2A-2 — those pollers are separate)
 *   - Errors in one cycle do not crash the process; they are logged and the cycle retries
 *
 * Processing cycle:
 *   1. Enqueue: Find all sealed atoms with no current contribution under the active rule versions.
 *      Insert weighting_ledger rows (idempotent via ON CONFLICT DO NOTHING).
 *   2. Claim: SELECT FOR UPDATE SKIP LOCKED — claim one pending ledger row at a time.
 *   3. Weight: Call weightAtom() atomically.
 *   4. Update ledger: mark succeeded (or refused/failed).
 *
 * Retry: failed rows are re-queued on the next poll cycle (max 5 attempts, then marked refused).
 */

import { logger } from "../../lib/logger.js";
import { weightAtom, recordWeightingRefusal } from "./weighting.js";
import { isBuild2a3Ready } from "./build2aReadiness.js";

const POLL_INTERVAL_MS  = 10_000;  // poll every 10 seconds
const ROWS_PER_CYCLE    = 10;      // claim at most N atoms per cycle
const MAX_ATTEMPTS      = 5;       // after this many failures, mark refused

let _pollerStarted = false;

/**
 * Start the weighting poller.
 * Idempotent: calling more than once has no effect.
 * Should be called from index.ts after ensureBuild2a3Tables() resolves.
 *
 * Gated by ENABLE_EVIDENCE_ENGINE=true (same flag as the evidence ingestion poller).
 */
export function startWeightingPoller(): void {
  if (process.env["ENABLE_EVIDENCE_ENGINE"] !== "true") {
    logger.info("[Build2A/weightingPoller] ENABLE_EVIDENCE_ENGINE != 'true' — weighting poller not started");
    return;
  }

  if (_pollerStarted) {
    logger.warn("[Build2A/weightingPoller] startWeightingPoller called more than once — ignoring");
    return;
  }

  _pollerStarted = true;
  logger.info("[Build2A/weightingPoller] Starting weighting poller (interval=%dms)", POLL_INTERVAL_MS);

  setInterval(() => {
    runWeightingCycle().catch((err) => {
      logger.error({ err }, "[Build2A/weightingPoller] Unhandled error in weighting cycle");
    });
  }, POLL_INTERVAL_MS);
}

/** TEST-ONLY: reset the started guard so tests can call startWeightingPoller again. */
export function _resetWeightingPollerForTesting(): void {
  _pollerStarted = false;
}

/**
 * One weighting poll cycle.
 * Exported for testing; normally called by the setInterval above.
 */
export async function runWeightingCycle(): Promise<{
  enqueued: number;
  processed: number;
  succeeded: number;
  refused: number;
  failed: number;
}> {
  if (!isBuild2a3Ready()) {
    logger.debug("[Build2A/weightingPoller] Skipping cycle — Package 2A-3 not ready");
    return { enqueued: 0, processed: 0, succeeded: 0, refused: 0, failed: 0 };
  }

  const { db } = await import("@workspace/db");
  const { sql } = await import("drizzle-orm");

  // ── Step 1: Enqueue — atoms with no current contribution under active rules ──
  // Insert ledger rows for any atom that has no weighting_ledger entry for the
  // current active integrity + quality rule versions. Idempotent via ON CONFLICT DO NOTHING.
  const enqueueRes = await db.execute(sql`
    INSERT INTO weighting_ledger (atom_id, integrity_rule_version_id, quality_rule_version_id)
    SELECT iea.id AS atom_id,
           irv.id AS integrity_rule_version_id,
           qrv.id AS quality_rule_version_id
    FROM interpreted_evidence_atoms iea
    CROSS JOIN integrity_rule_versions irv
    CROSS JOIN quality_rule_versions qrv
    JOIN cluster_assembly ca ON ca.id = iea.cluster_assembly_id
    WHERE ca.assembly_state = 'sealed'
      AND irv.is_active = true
      AND irv.implementation_key = 'integrity_discount_v1'
      AND qrv.is_active = true
      AND qrv.implementation_key = 'quality_weighting_v1'
      AND NOT EXISTS (
        SELECT 1 FROM weighting_ledger wl2
        WHERE wl2.atom_id = iea.id
          AND wl2.integrity_rule_version_id = irv.id
          AND wl2.quality_rule_version_id   = qrv.id
      )
    ON CONFLICT (atom_id, integrity_rule_version_id, quality_rule_version_id) DO NOTHING
  `);
  const enqueued = Number((enqueueRes as unknown as { rowCount: number }).rowCount ?? 0);
  if (enqueued > 0) {
    logger.info("[Build2A/weightingPoller] Enqueued %d new weighting_ledger rows", enqueued);
  }

  // ── Step 2: Claim pending rows (FOR UPDATE SKIP LOCKED) ───────────────────
  const { pool } = await import("@workspace/db");
  const client = await pool.connect();

  let processed = 0;
  let succeeded = 0;
  let refused   = 0;
  let failed    = 0;

  try {
    // Claim up to ROWS_PER_CYCLE pending or retryable-failed rows
    const claimRes = await client.query(
      `UPDATE weighting_ledger
       SET status           = 'processing',
           last_attempted_at = NOW(),
           attempts         = attempts + 1
       WHERE id IN (
         SELECT id FROM weighting_ledger
         WHERE status = 'pending'
            OR (status = 'failed' AND attempts < $1)
         ORDER BY first_seen_at ASC
         LIMIT $2
         FOR UPDATE SKIP LOCKED
       )
       RETURNING id, atom_id, attempts`,
      [MAX_ATTEMPTS, ROWS_PER_CYCLE],
    );

    const claimed = claimRes.rows as Array<{ id: string; atom_id: string; attempts: number }>;
    processed = claimed.length;

    for (const row of claimed) {
      await _processOneLedgerRow(client, row, { succeeded_counter: 0, refused_counter: 0, failed_counter: 0 });
    }

    // Count outcomes by re-reading the ledger rows we just processed
    if (claimed.length > 0) {
      const ids = claimed.map(r => r.id);
      const outcomeRes = await client.query(
        `SELECT status, COUNT(*)::int AS n FROM weighting_ledger
         WHERE id = ANY($1::uuid[]) GROUP BY status`,
        [ids],
      );
      for (const row of outcomeRes.rows as Array<{ status: string; n: number }>) {
        if (row.status === "succeeded") succeeded = row.n;
        else if (row.status === "refused")  refused   = row.n;
        else if (row.status === "failed")   failed    = row.n;
      }
    }
  } finally {
    client.release();
  }

  if (processed > 0) {
    logger.info(
      { processed, succeeded, refused, failed },
      "[Build2A/weightingPoller] Cycle complete",
    );
  }

  return { enqueued, processed, succeeded, refused, failed };
}

// ── Internal helpers ──────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function _processOneLedgerRow(client: any, row: { id: string; atom_id: string; attempts: number },
  _counters: { succeeded_counter: number; refused_counter: number; failed_counter: number }): Promise<void> {

  const { db } = await import("@workspace/db");
  const { sql } = await import("drizzle-orm");

  try {
    // If this atom has already been weighted successfully by an earlier cycle (race guard),
    // mark this ledger row succeeded immediately.
    const existingContrib = await db.execute(sql`
      SELECT id FROM weighted_evidence_contributions
      WHERE atom_id = ${row.atom_id}::uuid LIMIT 1
    `);

    if ((existingContrib.rows as unknown[]).length > 0) {
      // Already weighted — mark this ledger row succeeded without re-weighing
      const contribId = (existingContrib.rows[0] as { id: string }).id;
      await db.execute(sql`
        UPDATE weighting_ledger
        SET status                   = 'succeeded',
            completed_at             = NOW(),
            resulting_contribution_id = ${contribId}::uuid
        WHERE id = ${row.id}::uuid
      `);
      return;
    }

    // Hard-limit: exhausted retries → refuse
    if (row.attempts >= MAX_ATTEMPTS) {
      const refusalId = await recordWeightingRefusal({
        atomId: row.atom_id,
        claimId: null,
        esrId: null,
        reasonCode: "weighting_computation_failed",
        detail: `Atom ${row.atom_id} exhausted ${MAX_ATTEMPTS} weighting attempts. Marking refused.`,
        ledgerId: row.id,
      });
      logger.warn({ atomId: row.atom_id, refusalId }, "[Build2A/weightingPoller] Atom exhausted retries — refused");
      return;
    }

    // Weight the atom
    const result = await weightAtom({
      atomId: row.atom_id,
      quality: { evaluation_timestamp: new Date().toISOString() },
    });

    if (result.weighted) {
      await db.execute(sql`
        UPDATE weighting_ledger
        SET status                    = 'succeeded',
            completed_at              = NOW(),
            resulting_contribution_id = ${result.contribution.id}::uuid
        WHERE id = ${row.id}::uuid
      `);
    } else {
      // Refusal from weighting service
      await db.execute(sql`
        UPDATE weighting_ledger
        SET status               = 'refused',
            completed_at         = NOW(),
            resulting_refusal_id = ${result.refusal_id ?? null}::uuid,
            errors               = errors || ${JSON.stringify([{ reason_code: result.reason_code, detail: result.detail, at: new Date().toISOString() }])}::jsonb
        WHERE id = ${row.id}::uuid
      `);
      logger.warn(
        { atomId: row.atom_id, reason: result.reason_code },
        "[Build2A/weightingPoller] Atom weighting refused",
      );
    }
  } catch (err) {
    // Transient error — increment attempts, stay in failed for retry
    const errMsg = err instanceof Error ? err.message : String(err);
    await db.execute(sql`
      UPDATE weighting_ledger
      SET status  = 'failed',
          errors  = errors || ${JSON.stringify([{ error: errMsg, at: new Date().toISOString() }])}::jsonb
      WHERE id = ${row.id}::uuid
    `).catch(() => { /* ignore secondary failure */ });
    logger.error({ err, atomId: row.atom_id }, "[Build2A/weightingPoller] weightAtom threw — will retry");
  }
}
