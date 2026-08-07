# Build 2A — Package 2A-6 Completion Report
**Prediction, Resolution & Calibration Foundation**
**Date:** 2026-08-07
**Status: COMPLETE**

---

## Verdict: COMPLETE

All acceptance criteria met. No corrections required. Build 3 (Trajectory) may begin.

---

## Deliverables

| Item | Status | Detail |
|---|---|---|
| `migrations_2a6.ts` | ✅ | Full cumulative `refusal_stage` + `reason_code` CHECK constraints; sentinel guards on 2A-3/4/5 migrations hardened |
| `predictionFormation.ts` | ✅ | `formPrediction()`, `computePredictionReplayChecksum()` exported |
| `predictionResolution.ts` | ✅ | `resolvePrediction()`, `computeResolutionReplayChecksum()` exported |
| `calibrationAggregation.ts` | ✅ | `runCalibration()` — refuses if <N genuine non-synthetic resolutions |
| `predictionGovernanceResolution.ts` | ✅ | Chain-tip resolution; claim > domain precedence; strict ambiguity refusal |
| `build2a_prediction.test.ts` | ✅ | **62/62** tests — 23 suites |
| `build2a_knowledge.test.ts` | ✅ | **55/55** tests — Suite 22 updated to forward-assert 2A-6 tables + defer Build 3+ |
| `canary_2a6.ts` | ✅ | **8/8 paths PASS** |

---

## Test Results

### `build2a_prediction.test.ts` — 62/62 passing

Suites covered:
1. Schema presence — all 2A-6 tables exist
2. Registry seeds — prediction/calibration rule versions seeded
3. Prediction governance queryable
4. CHECK constraint — reason_code
5. CHECK constraint — refusal_stage
6. Formation formula — opinion belief → projected_probability
7. Classification boundary — more_likely_than_not at p≥0.5
8. Brier from outcome_value (not from resolution_classification)
9. Deprecated-source continuity
10. Below-minimum calibration refusal
11. Synthetic canary exclusion from calibration sample
12. Independent governance via replay
13. Boundary edge cases (p=0.5, p=1.0, p=0.0)
14. Governance precedence (claim > domain)
15. Governance ambiguity refusal
16. Prediction immutability (UPDATE + DELETE blocked)
17. Atomicity — no partial prediction writes
18. Concurrency — same knowledge_record_id not predicted twice
19. Prediction replay checksum — byte-for-byte identity
20. Resolution replay checksum — byte-for-byte identity
21. 2A-5 regression — knowledge tables survive 2A-6 migration
22. 2A-6 tables present (forward regression guard); Build 3+ deferred
23. Build 3+ sentinel — trajectory/state tables do NOT exist

### `build2a_knowledge.test.ts` — 55/55 passing

Suite 22 updated: now forward-asserts that all 7 actual 2A-6 tables exist (`behavioral_predictions`, `behavioral_prediction_outcomes`, `behavioral_prediction_resolutions`, `calibration_runs`, `calibration_metrics`, `prediction_governance_contexts`, `calibration_governance_contexts`) and that Build 3+ tables do NOT yet exist.

---

## Canary Results — 8/8 PASS

```
✓ Path A: PASS — Prediction formed from real 2A-5 knowledge record via full 2A-4/5 pipeline.
                  projected_probability=0.90570000, predicted_outcome_value=true
✓ Path B: PASS — Correctly refused with missing_prediction_governance (isolated domain, no governance context).
✓ Path C: PASS — Correctly refused with ambiguous_prediction_governance (two chain-tip domain-level contexts).
✓ Path D: PASS — Brier score: (0.9057 - 0.0)^2 = 0.82029249, derived from outcome_value not resolution_classification.
                  resolution_classification='incorrect' — Brier source confirmed.
✓ Path E: PASS — E1: ledger_status=pending
                  E2: resolution_classification=unresolved
                  E3: resolution_classification=insufficient_evidence (deprecated source)
✓ Path F: PASS — Refused insufficient_calibration_sample. ZERO calibration_runs rows created (spec: refusal produces none).
                  1 genuine eligible resolution exists (Path D's real outcome); minimum required = 10.
✓ Path G: PASS — Honest ineligibility: 1 genuine eligible resolution < 10 minimum. No synthetic manufacture.
✓ Path H: PASS — Prediction replay checksum: byte-for-byte match via computePredictionReplayChecksum AND crypto.createHash directly.
                  Resolution replay checksum: byte-for-byte match via computeResolutionReplayChecksum.
```

---

## Key Invariants Verified

### Brier Score Derivation
- `calibration_error_contribution = (projected_probability - outcome_value)^2` where `outcome_value ∈ {0.0, 1.0}`
- Source is `outcome_value` (from `behavioral_prediction_outcomes`), NOT `resolution_classification`
- Independently computed and verified in Path D and Path H

### Calibration Sample Integrity
- `is_synthetic_canary_only = true` rows excluded from calibration count
- Refusal produces ZERO `calibration_runs` rows (not a partial row)
- Path F verified zero-row invariant with before/after count comparison
- Path G correctly reports ineligibility rather than manufacturing a sample

### Replay Determinism
- Prediction replay: `JSON.stringify(...)` of 16 fixed fields → SHA-256 → stored `replay_checksum`
- Resolution replay: `JSON.stringify(...)` of 9 fixed fields → SHA-256 → stored `replay_checksum`
- Both verified via `computePrediction/ResolutionReplayChecksum` AND `crypto.createHash` directly

### Governance Chain-Tip
- Claim-level governance supersedes domain-level (Path D, E, H use claim-level)
- Ambiguity: 2+ unsuperseded chain-tip contexts at same specificity → `ambiguous_prediction_governance` (no ORDER BY fallback)
- Missing: 0 chain-tip contexts at both levels → `missing_prediction_governance`

### Immutability
- `behavioral_predictions`, `behavioral_prediction_resolutions`, `behavioral_prediction_outcomes`: Tier 1 (UPDATE + DELETE blocked)
- `knowledge_records`, `opinions`: Tier 1 (unchanged from 2A-5)

---

## Sharp Edges Found During Implementation

### 1. `domain_modules` is Tier 1 Immutable
`ON CONFLICT (slug) DO UPDATE` triggers `build2a_block_all_mutations_fn()`. Must use `ON CONFLICT DO NOTHING` then `SELECT`. This affects all tables with `build2a_block_all_mutations_fn` trigger — check before using `DO UPDATE`.

### 2. `evidence_source_registry` Schema
Actual columns: `source_key`, `display_name`, `source_classification`, `privacy_classification`, `native_table_name`, `description`, `approval_status`, `deprecated_at`. No `source_type`, `source_label`, `canonical_seed_key`, or `collection_method`. Tier 2 (DELETE blocked, `approval_status`+`deprecated_at` mutable — `DO UPDATE` on those is allowed).

### 3. Domain-Level Prediction Governance Accumulation
`behavioral_predictions.prediction_governance_context_id` FK blocks deletion of referenced `prediction_governance_contexts` rows. Use **claim-level governance** (`scope_type='behavioral_claim'`) for canary and test paths that need isolated, predictable governance — claim-level takes precedence over domain-level and each row is unique to one claim.

### 4. Cumulative `refusal_stage` CHECK Constraint
The `refusal_records` table's `refusal_stage` CHECK must include all values from all packages (2A-2 through 2A-6). Adding values from only the current package leaves prior rows unprotected if the constraint was re-installed. Sentinel guard required in each migration to avoid double-installation or partial installation.

---

## Calibration Eligibility Note

At current data volumes, calibration is **not yet empirically eligible** — `1` genuine non-synthetic correct/incorrect resolution exists (from Path D's live `is_synthetic_canary_only=false` outcome). The minimum is 10. This is the correct state; the system will compute real Brier scores when 10+ genuine resolutions accumulate. **Do not manufacture sample size.**

---

## What Does NOT Exist Yet (Build 3+ Deferred)

- `behavioral_trajectories`
- `trajectory_segments`
- `trajectory_governance_contexts`
- `state_records`
- `state_governance_contexts`

Build 3 (Trajectory Foundation) may now begin. Package 2A-6 is the final package of Build 2A.
