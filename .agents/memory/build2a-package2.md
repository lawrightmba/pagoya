---
name: PTI Build 2A Package 2A-2 — Interpretation Foundation
description: Column-name traps, schema facts, and architecture decisions for Package 2A-2 (locked complete).
---

## Status
Complete and locked as of 2026-08-06. 48 tests pass (4 suites). Canary confirmed all 3 paths.

## Sharp Schema Facts (prevent regressions)

### evidence_source_registry
Actual columns: `id, source_key, display_name, source_classification, privacy_classification, native_table_name, description, approval_status, deprecated_at, created_at`
**No** `source_description`, `data_freshness_policy`, or `approved_by`.

### behavioral_entities
Tier 1 (fully immutable). **Cannot** `ON CONFLICT DO UPDATE` — triggers block it.
Pattern: `INSERT ... ON CONFLICT DO NOTHING` then `SELECT ... WHERE native_system=... AND native_id=...`.

### behavioral_claims
Actual columns: `id, entity_id, primitive_id, domain_module_id, window_start, window_end, falsifiability_condition, version_context_id, supersedes, created_at`
**No** `behavioral_primitive_id`, `domain_slug`, or `primitive_name` on this table.
`primitive_name` and `domain_slug` are JOIN aliases in queries (from bp.name, dm.slug).

### domain_modules
Column: `slug` (not `domain_slug`).

### behavioral_primitives
Column: `name` (not `primitive_name`).

### domain_source_eligibility
Columns: `id, domain_module_id, evidence_source_registry_id, primitive_id, approval_status, rule_version_id, notes, created_at`
**No** `approved_by` or `eligibility_status`.

### agents (Build 1A)
Columns: `id SERIAL, slug TEXT UNIQUE, display_name TEXT, created_at`
**No** `canonical_seed_key`. Idempotency key for tests: `slug`.

### agent_tasks (Build 1A)
No unique constraint except PK. Use `correlation_id` as idempotency handle in tests.

### interpretation_rule_versions rule_content
Uses `cluster_size` key (not `expected_observation_count`).
`clusterAssembly.getExpectedObservationCount()` reads `rc["cluster_size"]`.

## Architecture Decisions

### Cluster hash key
SHA-256 of `v1::{ruleVersionId}::{claimId}::{sorted obs by seq_position}`.
`computeClusterHash(links, ruleVersionId, claimId)` — links array is FIRST param.

### Single-observation cluster
`task_completion_v1` uses `cluster_size=1`. The resolved `agent_task_outcomes` row is the sole observation.

### Poller
Gated on `ENABLE_EVIDENCE_ENGINE=true`. Not started in dev unless explicitly enabled.

### Canary retained evidence (2026-08-06)
- canary_run_id: b2a_canary_1786047869829
- atom_id: fbd9aea5-cf99-4955-8d5a-fac5845f9093
- refusal_id: a1847806-e39d-435e-8a25-73dc39e9760b
- abandoned_cluster: c407d19b-1b3c-4277-a533-7ea2b2a88d29

**Why:** Evidence intentionally retained per spec — canary rows are permanent audit trail.

## Test Files
- `build2a_regression.test.ts` — 14 tests
- `build2a_ingestion.test.ts` — 6 tests
- `build2a_interpretation.test.ts` — 13 tests
- `build2a_immutability.test.ts` — 15 tests

## Do NOT Begin Package 2A-3 Without Explicit Instruction
