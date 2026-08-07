---
name: Build 2A Package 2A-6
description: Prediction, Resolution & Calibration Foundation — completion facts, sharp edges, and invariants.
---

## Status
COMPLETE — 2026-08-07. 62/62 tests + 55/55 knowledge tests + 8/8 canary paths. Build 3 (Trajectory) may begin.

## Sharp Edges

### domain_modules is Tier 1 Immutable
`ON CONFLICT (slug) DO UPDATE` triggers the immutability fn. Always use `ON CONFLICT DO NOTHING` then `SELECT`.

**Why:** Canary paths B and C threw on this — immutability trigger fires on the UPDATE path of ON CONFLICT DO UPDATE.

### evidence_source_registry actual columns
`source_key, display_name, source_classification, privacy_classification, native_table_name, description, approval_status, deprecated_at`. No `source_type`, `source_label`, `canonical_seed_key`, or `collection_method`. Tier 2 — DELETE blocked; `approval_status` + `deprecated_at` are mutable (DO UPDATE on those is fine).

### Domain-level prediction governance accumulates permanently
`behavioral_predictions.prediction_governance_context_id` FK blocks DELETE of referenced `prediction_governance_contexts` rows. Use **claim-level governance** (`scope_type='behavioral_claim'`) for test and canary paths that need isolated, per-prediction governance.

**Why:** Domain-level rows from prior test runs can't be deleted → chain-tip returns ambiguity. Claim-level governance takes precedence over domain-level and is FK-safe.

### Cumulative refusal_stage CHECK constraint
The `refusal_records` `refusal_stage` CHECK must include values from ALL packages (2A-2 through 2A-6). Each migration must sentinel-guard to avoid re-installing a partial value list.

## Key Invariants

### Brier Score
`calibration_error_contribution = (projected_probability - outcome_value)^2` where `outcome_value ∈ {0.0, 1.0}`. Source is `outcome_value`, NOT `resolution_classification`.

### Calibration Sample Integrity
`is_synthetic_canary_only = true` rows excluded. Refusal produces ZERO `calibration_runs` rows. Minimum sample: 10 genuine non-synthetic correct/incorrect resolutions.

### Governance Chain-Tip Precedence
Claim-level > domain-level. 2+ unsuperseded chain-tip contexts at same specificity → `ambiguous_prediction_governance` (no ORDER BY fallback).

## Calibration State at Completion
1 genuine non-synthetic resolution exists (canary Path D's live outcome). Minimum = 10. System will compute real Brier scores when 10+ genuine resolutions accumulate.
