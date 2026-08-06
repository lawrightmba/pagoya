---
name: Build 2A cluster_assembly invariant correction
description: Strengthened lifecycle trigger + repair of stray test-fixture rows; Drizzle error-wrapping pattern for tests
---

## Rule
`build2a_cluster_lifecycle_fn` must cover INSERT|UPDATE|DELETE — not just UPDATE|DELETE.

**Why:** The original BEFORE UPDATE OR DELETE trigger left a gap: direct-SQL could insert a row in `sealed` or `abandoned` state, bypassing all per-state field consistency checks. The audit confirmed this was exploitable via test code.

## INSERT enforcement
- Only `assembly_state = 'assembling'` is permitted on INSERT.
- `cluster_hash`, `sealed_at`, `abandoned_at`, `resulting_atom_id` must all be NULL.

## UPDATE → sealed enforcement
- `resulting_atom_id IS NOT NULL`
- `cluster_hash IS NOT NULL`
- `sealed_at IS NOT NULL`
- `abandoned_at IS NULL`
- `COUNT(*) FROM evidence_atom_observation_links WHERE cluster_assembly_id = NEW.id = NEW.expected_observation_count`

## UPDATE → abandoned enforcement
- `resulting_atom_id IS NULL`, `sealed_at IS NULL`, `abandoned_at IS NOT NULL`

## Repair pattern
Stray test-fixture rows (sealed, resulting_atom_id=NULL, no atom in interpreted_evidence_atoms) must be deleted before remounting the trigger. Drop both triggers first (lifecycle + obs-link delete immutability), delete obs links for stray clusters, delete stray clusters, then reinstall. The repair guard: `assembly_state='sealed' AND resulting_atom_id IS NULL AND NOT EXISTS (SELECT 1 FROM interpreted_evidence_atoms WHERE cluster_assembly_id = cluster_assembly.id)`.

## Drizzle error-wrapping — critical test pattern
Drizzle wraps PostgreSQL RAISE EXCEPTION messages as: `"Failed query: \n  UPDATE ..."`
The `[Build2A]` prefix from the trigger is buried in the error's `.cause`, NOT in the top-level message.

**How to apply:** In vitest, use `.rejects.toThrow()` (no argument) — NOT `.rejects.toThrow("[Build2A]")`. The no-argument form only checks that an error is thrown; the string-argument form checks `.message` which Drizzle overrides.

## Tests that use sealClusterAndCreateAtom() for setup
The `makeSeededSealedCluster()` helper in build2a_immutability.test.ts properly seals via the service. Any test that needs a sealed cluster as a precondition must use this helper — never direct SQL — because the trigger now enforces all sealed-state invariants.
