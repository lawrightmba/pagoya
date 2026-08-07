---
name: Build 2A Package 2A-3 completion
description: Weighting Foundation — schema, service, tests, canary all locked August 2026
---

## Status: LOCKED (2026-08-07)

**203/203 tests pass across all 6 suites. Canary: 45/45 ✓.**

---

## Schema (4 tables + 1 view, created by migrations_2a3.ts)

| Object | Type | Notes |
|--------|------|-------|
| `integrity_contexts` | table | one row per atom; immutable (UPDATE+DELETE trigger-blocked) |
| `quality_contexts` | table | one row per atom; immutable |
| `weighted_evidence_contributions` | table | ledger; DELETE blocked; supersession chain via `supersedes` FK |
| `weighting_ledger` | table | poller state (pending→processing→succeeded\|refused\|failed); max 5 attempts |
| `latest_weighted_contribution_v` | view | resolves chain tip (row with `supersedes IS NULL`-style subquery) |

**Seeds**: `integrity_discount_v1` in `integrity_rule_versions`; `quality_weighting_v1` in `quality_rule_versions`. Both seeded `ON CONFLICT DO NOTHING`.

**refusal_records extension**: additive-only — added 9 new 2A-3 reason codes to the CHECK constraint (dropped anonymous constraint by `pg_constraint` lookup, recreated with all original + new codes).

---

## Key formulas

**Integrity**: `reliability_score = provenance_confidence × (1−manipulation) × (1−duplication) × (1−circular) × (1−synthetic)`. `integrity_discount_factor = reliability_score`.

**Quality**: weighted linear combination of 7 components (directness, verification_strength, recency, relevance, corroboration, completeness, context_similarity). Weights sum to 1.0. Recency uses 90-day half-life exponential decay pinned to `evaluation_timestamp`.

**Final**: `final_effective_weight = integrity_discount_factor × raw_quality_weight`.

---

## Sharp edges

1. **`resolveImplementationKey` does NOT return `rule_content`** — it only selects 6 core columns. `weighting.ts` fetches `rule_content` separately via `sql.raw()` after dispatch resolution.

2. **`domain_modules` uses `slug`, not `implementation_key`**. `behavioral_primitives` uses `name`. `evidence_source_registry` uses `source_key`.

3. **`agent_task_outcomes` ESR has `source_classification = 'derived'`** in this DB (first seed won, ON CONFLICT DO NOTHING preserves it). Tests must assert `'derived'` not `'outcome'`.

4. **`behavioral_claims` columns**: `entity_id, primitive_id, domain_module_id, window_start, window_end, falsifiability_condition`. No `claim_label`, `min_observations`, `display_label`.

5. **`cluster_assembly` does NOT have `evidence_source_registry_id`** — ESR is found via `evidence_atom_observation_links` join.

6. **Test helper pattern**: use `createCluster` + `addObservationLink` + `sealClusterAndCreateAtom` from Package 2A-2 services — never raw SQL shortcuts (triggers enforce invariants that raw SQL bypasses).

---

## Retained canary IDs (final run, 2026-08-07)

| Key | ID |
|-----|----|
| pathA.atomId | 897b73d0-1fd4-43c5-bea9-bfd7d2c1fa6c |
| pathA.integrityCxId | e273ec2d-c0b2-46f8-99fd-e86778d93d32 |
| pathA.qualityCxId | ff0394d5-54b1-48aa-a5b7-4f5a019da2d1 |
| pathA.contributionId | 048edc27-fa4c-4aa4-be07-024107cac00f |
| pathB.atomId (zero-weight) | a4545cf1-7ece-4a3e-9cc9-fac7b982bfda |
| pathB.contributionId | 2cb8ea8b-bc69-41c9-9411-510ea268e781 |
| pathC.refusalId | f726ba07-09d8-4544-970a-e5cf391133d6 |
| pathD.contribution1Id | 4f787475-90f9-4503-a0cc-a7ee003dc95e |
| pathD.contribution2Id (tip) | fa7da2ee-07e1-4ed4-8633-8197c38dcc5f |

---

## Known pre-existing failures (unrelated to 2A-3)

7 billpay test failures (rate-limiter state leak) — pre-exist from Build 1A; tracked separately.
