---
name: Build 2A Package 2A-1 — Evidence Engine Foundation
description: Schema, services, cleanup patterns, and test conventions for the Package 2A-1 correction sprint. 69/69 tests passing as of 2026-08-06.
---

## Schema
15 tables, 2 views, 6 services. No Package 2A-2+ objects. No Build 1A tables touched.

## Key patterns

### canonical_seed_key (base_rate_records)
- Column: `TEXT NULL` on `base_rate_records`.
- Partial unique index: `WHERE canonical_seed_key IS NOT NULL` — enforces one canonical row per key, operational rows (NULL) unconstrained.
- Format: `'b2a_seed_v1|{scope}|{source_type}|{derivation_method}'`
- Seeds use `ON CONFLICT DO NOTHING` — idempotent against the partial index.
- Cleanup in `ensureBuild2aTables()` runs 4 steps:
  1. Step 0: clear phantom keys (any canonical_seed_key NOT IN the 7 known keys) — needed if prior run had a broader stamping algorithm.
  2. Step 1: stamp oldest row per identity using DISTINCT ON, restricted to 7 known seed triples only.
  3. Step 2: clear `supersedes` on duplicate rows (FK safety before deletion).
  4. Step 3: delete duplicate rows (canonical_seed_key IS NULL AND matching canonical identity exists).
- All 4 steps are rerun-safe and require Tier 1 triggers to be temporarily dropped.

**Why the seed-triple restriction in step 1 matters:** Without it, test rows with novel derivation methods get incorrectly stamped as canonical. Step 0 handles cleanup of any phantom keys from a prior broad run.

### display_label (behavioral_entities)
- Column: `TEXT NULL` on `behavioral_entities`.
- Stored ONLY at insert time via `resolveOrCreateEntity(entityType, nativeSystem, nativeId, displayLabel?)`.
- Never used for identity, joins, or resolution. Never updated on conflict.
- Mismatch on second resolution: returns existing entity unchanged + debug log (no exception).

### Trigger lifecycle during migration cleanup
- `DROP TRIGGER IF EXISTS build2a_no_update_base_rate_records ON base_rate_records` (before steps 0-3).
- `DROP TRIGGER IF EXISTS build2a_no_delete_base_rate_records ON base_rate_records` (before steps 0-3).
- Triggers recreated by the Tier 1 trigger loop immediately after the cleanup section.

## Sharp edges (still apply)
1. **Drizzle `ANY(${jsArray})`** generates `($1,$2,...)` not `ARRAY[$1,$2,...]` — use `sql.raw()` with inline string literals for any IN clause over an array.
2. **Drizzle trigger error wrapping**: Drizzle 0.45.2 wraps PG `RAISE EXCEPTION` in `error.cause.message`, not `error.message`. Trigger-rejection tests use `.rejects.toThrow()` + data-integrity check, NOT `.rejects.toThrow('specific text')`.
3. **`to_jsonb` lifecycle guard**: Tier 2 version table triggers use `(to_jsonb(NEW) - 'is_active') IS DISTINCT FROM (to_jsonb(OLD) - 'is_active')` to generically block all-but-is_active updates.

## Test structure (69 tests, 9 groups)
1. Migration idempotency (10 tests) — includes canonical count = 7, each key once
2. Behavioral Entity identity (8 tests) — includes display_label stored/mismatch tests
3. Claim constraints (6 tests)
4. Behavioral Claim retirement (3 tests)
5. Base-rate constraints (10 tests) — uses canonical seed rows, not fresh inserts; includes cleanup idempotency, novel derivation_method safety, approved version safety
6. Source/domain eligibility (5 tests)
7. Version-dispatch foundation (9 tests)
8. Immutability matrix (9 tests)
9. Build 1A regression (5 tests)

## Known 7 canonical seed triples
| scope | source_type | derivation_method |
|---|---|---|
| b2atest_scope_global | provisional_unknown | no_data_available |
| b2atest_scope_mx_unbanked | empirical | sample_of_n_gt_1000 |
| b2atest_scope_immutable | empirical | b2atest_method |
| b2atest_scope_supersession | domain_expert | expert_estimate_2024 |
| b2atest_scope_supersession | empirical | sample_2025 |
| b2atest_scope_view_tip | domain_expert | old_estimate |
| b2atest_scope_view_tip | empirical | new_estimate |

**Why:** These 7 are the only migration-seeded rows. Any canonical_seed_key outside this list is a phantom and should be cleared by step 0 on next migration run.
