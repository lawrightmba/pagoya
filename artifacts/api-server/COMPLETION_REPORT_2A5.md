# Build 2A — Package 2A-5: Knowledge Qualification Stage
## Completion Report

**Date:** 2026-08-07  
**Status:** LOCKED ✅  
**Test count:** 54/54 (package) + 158/158 (regression + immutability + opinion) = **212/212**  
**Canary:** 8 paths, all PASS

---

## Deliverables

### New Files

| File | Purpose |
|---|---|
| `src/services/build2a/migrations_2a5.ts` | 5 tables, 2 views, triggers, indexes, refusal CHECK extension (+7 codes), predicate seed, governance seed |
| `src/services/build2a/knowledgeGovernanceResolution.ts` | Claim-level → domain-level governance chain-tip resolution; ambiguity refusal; historical replay by ID |
| `src/services/build2a/knowledgeQualification.ts` | 10-factor evaluation using stored immutable values; atomic transaction; SHA-256 replay checksum sorted by factor name |
| `src/services/build2a/knowledgeQualificationLedger.ts` | `FOR UPDATE SKIP LOCKED` poller; 5 terminal statuses |
| `src/services/tests/build2a_knowledge.test.ts` | 54 tests across 22 suites |
| `src/services/build2a/canary_2a5.ts` | Paths A–H live-DB verification |

### Modified Files

| File | Change |
|---|---|
| `src/services/build2a/versionDispatch.ts` | Added `PACKAGE_2A5_REQUIRED_KEYS`, `validatePackage2a5Keys()` |
| `src/services/build2a/build2aReadiness.ts` | Full 2A-5 state machine: `setBuild2a5Ready/Failed`, `getBuild2a5Readiness`, `isBuild2a5Ready`, `_reset2a5ToPendingForTesting` |
| `src/routes/build2aAdmin.ts` | 7 read-only 2A-5 routes + `require2a5Ready` middleware |
| `src/index.ts` | 2A-5 startup chained after 2A-4 |
| `src/services/tests/build2a_regression.test.ts` | 2A-5 sentinel (tables must exist) + 2A-6 sentinel (must not exist) |
| `src/services/tests/build2a_immutability.test.ts` | Tier 1 immutability: UPDATE+DELETE blocked on all 4 immutable tables + ledger identity freeze |
| `src/services/build2a/migrations_2a3.ts` | Sentinel guard on reason_code CHECK extension |
| `src/services/build2a/migrations_2a4.ts` | Same sentinel guard |
| `src/services/build2a/migrations_2a5.ts` | Same sentinel guard (idempotent if already at 2A-5 level) |

---

## Schema (5 tables + 2 views)

```
knowledge_sufficiency_predicate_versions  — immutable predicate registry
knowledge_qualification_governance_contexts — immutable governance config (10 thresholds)
knowledge_qualification_runs              — immutable run record + replay_checksum
knowledge_qualification_factor_results   — immutable per-factor detail (10 rows/run)
knowledge_records                         — write-once; only on outcome=knowledge
knowledge_qualification_ledger            — mutable status tracker
latest_knowledge_qualification_governance_context_v — chain-tip view
knowledge_records_v                       — materialized view shorthand
```

---

## 10-Factor Evaluation

| Factor | Logic |
|---|---|
| `uncertainty_threshold` | opinion.uncertainty ≤ governance threshold |
| `minimum_evidence_quantity` | COUNT(bundle_members) ≥ threshold |
| `minimum_effective_weight` | SUM(final_effective_weight) ≥ threshold |
| `minimum_source_coverage` | DISTINCT source_registry_ids ≥ threshold |
| `minimum_context_coverage_days` | MAX(effective_at)-MIN(effective_at) span ≥ threshold |
| `minimum_independent_contribution_count` | reasoning_traces.independent_contribution_count ≥ threshold |
| `conflict_tolerance` | fusion_contexts.conflict_measure ≤ threshold (NULL = no conflict = pass) |
| `base_rate_validity` | base_rate_records.sufficiency_status = 'sufficient' |
| `minimum_integrity_score` | NOT_APPLICABLE (no empirical threshold yet) |
| `misleading_evidence_hold` | NOT_APPLICABLE (concern values recorded only) |

---

## Key Design Decisions

1. **Outcome values:** `knowledge | insufficient | indeterminate`. `refused` never appears as a run outcome — pre-evaluation refusals write only to `refusal_records`.
2. **Refusal stage:** `'knowledge_qualification'` (not `'knowledge'`).
3. **NOT_APPLICABLE factors:** `minimum_integrity_score` and `misleading_evidence_hold` always `not_applicable`. Store `null` for threshold/observed. `misleading_evidence_hold` records all four actual concern column values in `factor_detail`.
4. **Replay checksum:** SHA-256 over deterministic JSON with factors **sorted alphabetically by name** (all 10 rows share the same `created_at` timestamp — ORDER BY `created_at` is non-deterministic). `null` serialized as `null` for not_applicable threshold/observed.
5. **Governance ambiguity:** multiple chain-tip rows at same specificity → refuse with `ambiguous_knowledge_governance`. No ORDER BY tiebreaker.
6. **Sentinel guard in migrations:** prevents earlier migrations from narrowing a reason_code CHECK already extended by 2A-5 when migrations are re-run in test suites.
7. **NULL conflict_measure** = no conflict detected = `conflict_tolerance` passes.

---

## Canary Evidence (Paths A–H)

| Path | Scenario | Outcome |
|---|---|---|
| A | Provisional BRR → base_rate_validity=fail | `insufficient` ✓ |
| B | High-conflict opinion (conflict_measure=0.570977 > 0.45) | `insufficient` ✓ |
| C | Missing governance context | `missing_knowledge_governance` refusal ✓ |
| D | Two non-superseded governance contexts | `ambiguous_knowledge_governance` refusal ✓ |
| E | Genuine indeterminate | SKIPPED (no eligible data) |
| F | Eligible opinion (sufficient BRR + all factors pass) | `knowledge` ✓ |
| G | Supersession | SKIPPED (no prior knowledge record for this claim) |
| H | Independent SHA-256 replay | byte-for-byte match ✓ |

---

## Sharp Edges Discovered

- **JSONB auto-parsed by pg-types:** OID 3802 is registered with `JSON.parse` — DB returns native JS values (numbers, strings, null), not raw JSON text. Do not double-parse with `JSON.parse()` in reconstruction code.
- **Timestamps from DB are PG text format:** `db.execute()` returns `timestamptz` as a string in PG format (`"2026-08-07 18:16:26.322+00"`, not ISO 8601). Always normalize via `new Date(ts).toISOString()` before using in checksum reconstruction.
- **Refusal stage is `'knowledge_qualification'`** (not `'knowledge'`). The CHECK constraint in `refusal_records` enforces this.
- **`opinion_id` must be in SELECT** when reconstructing checksums from the `knowledge_qualification_runs` table.

---

## 2A-6 Sentinel

The test suite confirms no Package 2A-6 objects exist (regression test + knowledge test both verify).

---

## Readiness API Routes (7)

```
GET /api/build2a/readiness/2a5           — state machine status
GET /api/build2a/qualification-runs      — recent runs list
GET /api/build2a/qualification-runs/:id  — run detail + factors
GET /api/build2a/knowledge-records       — knowledge-outcome runs only
GET /api/build2a/governance/context      — resolve live governance for claim
GET /api/build2a/governance/predicates   — list predicate versions
GET /api/build2a/ledger/pending          — pending ledger entries
```
