---
name: Build 1A snapshot NaN sentinel
description: Why null cannot substitute NaN in PTIDataSnapshot JSONB storage, and how the NAN_SENTINEL pattern works.
---

# Build 1A — NaN Sentinel for Snapshot Replay

## The Rule
NaN-valid fields in `PTIDataSnapshot` MUST be stored as the string `"__NaN__"` (exported as `NAN_SENTINEL` from `ptiSnapshotPersist.ts`), NOT as `null`. Before passing a stored snapshot back to `computePTIv5()` for replay, call `deserializePtiSnapshot(raw)` to convert `"__NaN__"` back to `NaN`.

## Four NaN-valid fields (exported as `NAN_VALID_FIELDS`)
- `hoursToFirst` — user has never paid
- `daysToFirstSpei` — user has never had SPEI inbound
- `lateRecoveryRatio` — user has never been late
- `paulaResponseLatencyMinutes` — no Paula interaction data

## Why null is wrong
`JSON.stringify(NaN) === "null"`. If stored as null, the replay is broken:
- `isNaN(null)` = `isNaN(Number(null))` = `isNaN(0)` = `false`
- So `!isNaN(null)` = `true` → enters the paulaResponseLatencyMinutes scoring block
- `null <= 15` → `0 <= 15` = `true` → paulaLatencyScore gets 2 instead of 0
- `daysToFirstSpei`: same trap — `null <= 7` = true → bancarizationScore gets 3 instead of 0

**Why:** The PTI scoring functions use raw `!isNaN()` guards. null passes them (coerces to 0), NaN doesn't. Storing null silently inflates scores during replay.

## How to apply
- `serializePtiSnapshot()` converts NaN-valid fields to `NAN_SENTINEL` before DB write
- `deserializePtiSnapshot()` converts `NAN_SENTINEL` back to `NaN` before replay
- `JSONB → JSON.parse()` round-trip preserves the string sentinel
- The canary test in `build1a_corrections.test.ts` verifies this round-trip
