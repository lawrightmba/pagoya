---
name: PTI model-lineage data-integrity sprint
description: Fixes to prevent model-version transitions from being misread as behavioral change in trajectory, Paula threshold-crossing, and B2B output.
---

## What was shipped (2026-07-26)

**DB migrations (direct SQL — drizzle-kit push broken):**
- `pti_trend_snapshots.model_version TEXT` — new nullable column; index on (user_id, model_version, computed_at DESC)
- `pti_trend_snapshots.trajectory` widened VARCHAR(10) → TEXT (was truncating 'insufficient_data' at 17 chars, causing silent INSERT failures in computePTIv3Signals)
- `users.pti_trajectory` widened VARCHAR(10) → TEXT (same reason; required DROP+recreate of pti_export_safe view)

**`services/pti.ts`:**
- Exported `computeTrajectory(currentScore, currentModelVersion, prevSnaps)` pure function
- Exported `TRAJECTORY_INSUFFICIENT = "insufficient_data"`, `TrajectorySnapshot`, `TrajectoryResult` interfaces
- `computePTIv3Signals`: reads `snapshotModelVersion` from current `pti_breakdown.model_version`; queries LIMIT 20 snapshots (not 3) to find 3 same-model rows; writes `model_version` in INSERT
- Trajectory minimum: 3 same-model snapshots required; fewer → `TRAJECTORY_INSUFFICIENT`
- Cross-model rows and null-version rows are excluded, never mixed

**`services/paulaTriggers.ts`:**
- `hadScoreBelow` / `crossedThresholdRecently` now filter `pti_score_history` by `breakdown->>'model_version' = currentModelVersion`
- Fail-safe: if `currentModelVersion` is null → both return false (no trigger fires)
- Fetches `currentModelVersion` via a single extra query on `users.pti_breakdown->>'model_version'`

**`routes/b2b.ts`:**
- Trend snapshot query now SELECTs `model_version`
- Response adds `trend_model_version` as additive optional field in `pti` block

**`tests/ptiModelLineage.test.ts`:** 16 tests covering all 7 scenarios. Pure unit tests for (a)-(e); DB integration tests for (f)-(g) are self-contained (each test creates/destroys its own rows with unique telefono keys — no shared beforeAll/afterAll).

## Key gotchas

**VARCHAR(10) on trajectory columns:** Both `users.pti_trajectory` and `pti_trend_snapshots.trajectory` were VARCHAR(10). The value 'insufficient_data' is 17 chars. Inserting it causes a silent failure (caught by the outer try/catch in `computePTIv3Signals`) — the entire INSERT never fires, leaving no snapshot row. Widening to TEXT is the fix.

**pti_export_safe view must DROP before ALTER on users.pti_trajectory:** The view references that column, blocking direct `ALTER COLUMN TYPE`. Pattern: DROP VIEW → ALTER COLUMN → CREATE VIEW (same as pti_export_safe creation — see architecture memory).

**Why:** 'insufficient_data' is the canonical signal that trajectory is uncomputable due to insufficient same-model history. It must be stored and queryable, not silently swallowed.

**How to apply:** Any new trajectory value longer than 10 chars must check these two columns. Both are now TEXT so this won't recur unless a new column is added.

## ptiSnapshotIntegration.test.ts parallel-execution conflict

This test has a pre-existing FK race: when run alongside other DB-using test files, the `INSERT INTO wallets` FK check fires before the `INSERT INTO users` is visible (vitest runs files in parallel workers). Not caused by the lineage sprint. Run it alone: `pnpm exec vitest run src/services/tests/ptiSnapshotIntegration.test.ts`.

**Why:** `wallets.user_id REFERENCES users(telefono) ON DELETE CASCADE` — FK check happens in a parallel worker that may not yet see another worker's INSERT.

**How to apply:** If adding new DB integration tests, make them self-contained (own setup+cleanup in the test body, not in beforeAll/afterAll). Use unique telefono values per test, not per file.
