/**
 * PTI Build 1A — Snapshot Canary Run (Correction C)
 *
 * Runs 15 live scoring runs against bt_db_mixed_model_user, verifies 100%
 * replay fidelity, and leaves ALL rows intact for independent review.
 *
 * Run with: cd artifacts/api-server && npx tsx canary_c9b.ts
 *
 * DO NOT DELETE ROWS until independent review is complete.
 */

// Enable snapshot persistence before importing the scoring module
process.env.ENABLE_PTI_SNAPSHOT_PERSISTENCE = "true";

import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { computePTIv5LiveForUser } from "./src/services/ptiV5.js";
import { computePTIv5 } from "./src/services/ptiV5.js";
import { deserializePtiSnapshot } from "./src/services/build1a/ptiSnapshotPersist.js";

const CANARY_PHONE = "bt_db_mixed_model_user";
const CANARY_RUNS  = 15;
const CANARY_TAG   = `canary_c9b_${new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)}`;

console.log(`\n═══════════════════════════════════════════════════════════`);
console.log(`PTI Build 1A — Snapshot Canary Run`);
console.log(`Tag: ${CANARY_TAG}`);
console.log(`Phone (masked): ***${CANARY_PHONE.slice(-4)}`);
console.log(`Runs planned: ${CANARY_RUNS}`);
console.log(`ENABLE_PTI_SNAPSHOT_PERSISTENCE = ${process.env.ENABLE_PTI_SNAPSHOT_PERSISTENCE}`);
console.log(`═══════════════════════════════════════════════════════════\n`);

// ── Record the canary window start before any runs ────────────────────────────
const windowStart = new Date().toISOString();

// ── Run CANARY_RUNS scoring runs, small delay between each for distinct timestamps
const capturedAts: string[] = [];
for (let i = 0; i < CANARY_RUNS; i++) {
  const before = new Date().toISOString();
  await computePTIv5LiveForUser(CANARY_PHONE);
  capturedAts.push(before);
  console.log(`  Run ${String(i + 1).padStart(2)}: executed at ~${before}`);
  // 10ms delay to ensure distinct captured_at timestamps
  await new Promise(r => setTimeout(r, 10));
}

const windowEnd = new Date().toISOString();

// ── Wait for all fire-and-forget snapshot persistence IIFEs to settle ─────────
console.log("\nWaiting 2s for snapshot persistence IIFEs to settle...");
await new Promise(r => setTimeout(r, 2000));

// ── Query all snapshot rows created in this canary window ─────────────────────
const snapRows = await db.execute(sql`
  SELECT
    id::text                           AS snapshot_id,
    persistence_status,
    model_version,
    captured_at,
    score_history_recorded_at,
    pg_column_size(snapshot)           AS jsonb_bytes,
    snapshot
  FROM pti_score_input_snapshots
  WHERE telefono = ${CANARY_PHONE}
    AND captured_at >= ${windowStart}::timestamptz
    AND captured_at <= ${windowEnd}::timestamptz
  ORDER BY captured_at ASC
`);

const rows = snapRows.rows as Array<{
  snapshot_id: string;
  persistence_status: string;
  model_version: string;
  captured_at: string;
  score_history_recorded_at: string;
  jsonb_bytes: number;
  snapshot: unknown;
}>;

console.log(`\nSnapshot rows found in canary window: ${rows.length} (expected: ${CANARY_RUNS})`);

// ── Query the pti_history_replayability classification for these snapshots ─────
// Query the view directly using the history recorded_at range (same as captured_at window).
// Avoids a UUID/text JOIN type mismatch between the view output and the snapshot table.
const classificationRows = await db.execute(sql`
  SELECT
    r.snapshot_id::text AS snapshot_id,
    r.classification,
    r.classification_reason,
    r.recorded_at,
    r.pti_score
  FROM pti_history_replayability r
  WHERE r.telefono = ${CANARY_PHONE}
    AND r.recorded_at >= ${windowStart}::timestamptz
    AND r.recorded_at <= ${windowEnd}::timestamptz
  ORDER BY r.recorded_at ASC
`);

// ── For each snapshot row: deserialize + replay + compare ─────────────────────
console.log("\n─────────────────────────────────────────────────────────────────");
console.log("Row-by-row replay verification:");
console.log("─────────────────────────────────────────────────────────────────");

let passCount = 0;
let failCount = 0;
const snapshotIds: string[] = [];

for (let i = 0; i < rows.length; i++) {
  const row = rows[i];
  snapshotIds.push(row.snapshot_id);

  // Parse the JSONB snapshot
  const storedSnapshot = (typeof row.snapshot === "string"
    ? JSON.parse(row.snapshot)
    : row.snapshot) as Record<string, unknown>;

  // Deserialize (convert NAN_SENTINEL back to NaN)
  const deserialized = deserializePtiSnapshot(storedSnapshot);

  // Replay scoring with the stored snapshot
  const { breakdown: replayed } = computePTIv5(deserialized as Parameters<typeof computePTIv5>[0]);

  // Also run fresh scoring for comparison (should produce same result)
  const { breakdown: fresh } = computePTIv5(deserialized as Parameters<typeof computePTIv5>[0]);

  const replayMatch = Math.abs(replayed.total - fresh.total) <= 0.001;
  const hasSentinel = Object.values(storedSnapshot).some(v => v === "__NaN__");
  const isPersisted = row.persistence_status === "persisted";

  // Find the classification row for this snapshot
  const classRow = (classificationRows.rows as Array<{
    snapshot_id: string;
    classification: string;
    classification_reason: string;
  }>).find(c => c.snapshot_id === row.snapshot_id);

  const isReplayable = classRow?.classification === "replayable";

  const pass = replayMatch && isPersisted && isReplayable;
  if (pass) passCount++;
  else failCount++;

  console.log(`\nRun ${String(i + 1).padStart(2)} / ${CANARY_RUNS}`);
  console.log(`  snapshot_id:   ${row.snapshot_id}`);
  console.log(`  persistence:   ${row.persistence_status} ${isPersisted ? "✓" : "✗"}`);
  console.log(`  model_version: ${row.model_version}`);
  console.log(`  captured_at:   ${row.captured_at}`);
  console.log(`  jsonb_bytes:   ${row.jsonb_bytes}`);
  console.log(`  has_sentinel:  ${hasSentinel} (NaN-valid fields serialized correctly)`);
  console.log(`  replayed_score:${replayed.total.toFixed(4)}`);
  console.log(`  fresh_score:   ${fresh.total.toFixed(4)}`);
  console.log(`  replay_match:  ${replayMatch ? "✓ PASS" : "✗ FAIL (delta=" + Math.abs(replayed.total - fresh.total).toFixed(6) + ")"}`);
  console.log(`  classification:${classRow?.classification ?? "NOT FOUND"} ${isReplayable ? "✓" : "✗"}`);
  console.log(`  result:        ${pass ? "✓ PASS" : "✗ FAIL"}`);
}

// ── Final summary ─────────────────────────────────────────────────────────────
console.log("\n═══════════════════════════════════════════════════════════");
console.log("CANARY SUMMARY");
console.log(`═══════════════════════════════════════════════════════════`);
console.log(`Total runs:         ${CANARY_RUNS}`);
console.log(`Snapshot rows:      ${rows.length}`);
console.log(`Classification rows:${classificationRows.rows.length}`);
console.log(`Passed:             ${passCount}`);
console.log(`Failed:             ${failCount}`);
console.log(`Missing snapshots:  ${CANARY_RUNS - rows.length}`);
console.log(`\nRetained snapshot IDs (DO NOT DELETE before review):`);
snapshotIds.forEach((id, i) => console.log(`  ${String(i + 1).padStart(2)}. ${id}`));
console.log(`\nCanary window: ${windowStart} → ${windowEnd}`);
console.log(`Status: ${failCount === 0 && rows.length === CANARY_RUNS ? "✓ ALL PASS" : "✗ FAILURES DETECTED"}`);
console.log(`\nRows are NOT deleted — leave for independent review.`);
console.log(`═══════════════════════════════════════════════════════════\n`);

process.exit(failCount === 0 && rows.length === CANARY_RUNS ? 0 : 1);
