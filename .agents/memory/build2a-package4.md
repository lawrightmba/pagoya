---
name: Build 2A Package 2A-4
description: Opinion Formation Stage — 7 new schema objects, SL math library, 3-operator fusion, canary, 13 test suites. Sharp edges and corrections made during delivery.
---

## What Was Delivered

- **7 schema objects**: `evidence_bundles`, `evidence_bundle_members`, `fusion_governance_contexts`, `fusion_contexts`, `opinions`, `reasoning_traces` (all Tier 1/immutable), `opinion_formation_ledger` (operational, for `FOR UPDATE SKIP LOCKED` poller concurrency), plus 2 views (`latest_fusion_governance_context_v`, `latest_opinion_v`) and reuse of `sl_binomial_projection_v1`.
- **SL math**: `fusionMath.ts` — `cumulativeFuse`, `averagingFuse`, `consensusCompromiseFuse`, `dispositionToSlOpinion`, `foldOpinions`, `pairwiseConflict`, `maxConsecutivePairwiseConflict`, `slBinomialProjection`, `validateSlInvariant`, `auditOpinion`.
- **Pipeline**: `bundleAssembly.ts` → `fusionSelection.ts` → `opinionPersistence.ts` (orchestrator) → `reasoningTraces.ts`; poller in `opinionPoller.ts`.
- **Test result**: 1098/1105 passed (7 failures are pre-existing Task #8 billpay rate-limiter bug, unrelated to 2A-4).
- **Canary**: 10/10 paths passed (`canary_2a4.ts`).

## Sharp Edges Discovered During Delivery

### TypeScript patterns in this codebase
- The `pg` package is available but its types aren't wired for generics in `tsconfig`. Use `any` as a local alias for `PoolClient` (`type PoolClient = any`) and use plain `client.query()` with type assertions on `.rows` instead of `client.query<T>()`.
- `NextFunction` must be imported from `express` explicitly — it is not included in the `{ Router, Request, Response }` destructure by default.

### `behavioral_entities` table
- Unique constraint is **three columns**: `(entity_type, native_system, native_id)` — not two.
- `entity_type` CHECK constraint allows: `'human_user', 'autonomous_agent', 'financial_instrument', 'merchant'`.
- Table is Tier 1 immutable — ON CONFLICT MUST use `DO NOTHING`, never `DO UPDATE` (triggers block all updates).

### `behavioral_claims` table
- Required columns: `entity_id`, `primitive_id`, `domain_module_id`, `window_start`, `window_end`, `falsifiability_condition`. No `claim_label` column.

### `base_rate_records.canonical_seed_key`
- Plain TEXT column with no UNIQUE constraint — cannot use `ON CONFLICT (canonical_seed_key)`.
- Use `INSERT … SELECT … WHERE NOT EXISTS (SELECT 1 FROM base_rate_records WHERE canonical_seed_key = '…')`.

### `refusal_records`
- The cluster-related FK column is `cluster_assembly_id`, not `cluster_id`.
- For fusion-stage refusals, omit `cluster_assembly_id` entirely (it's nullable).
- `reason_code` CHECK is extended by `migrations_2a4.ts` to add: `'missing_base_rate'`, `'missing_conflict_threshold_governance'`, `'bundle_construction_failed'`, `'invalid_opinion_computed'`.

### `pairwiseConflict` formula
- Formula is un-normalized: `C = b1*d2 + d1*b2`, range **[0, 1]**.
- Maximum = 1 for fully opposing dogmatic opinions (b1=1, d2=1).
- The C&C operator uses this raw C internally. `clamp01` guards the output.

### SL cumulative fusion associativity
- Cumulative SL fusion (`cumulativeFuse`) is **associative** (corresponds to Dempster-Shafer combination). Tests must NOT assert non-associativity for this operator.
- Averaging fusion (`averagingFuse`) IS non-associative — use for that property demonstration.

### Decision-separation static grep
- The test scans raw file content including comments. Forbidden words: `approval, approve, denial, deny, lending, credit_decision, authority_score, exposure_limit, grant, reject`.
- Do not put any of these words in comments in 2A-4 source files, even as part of a "No X/Y/Z" disclaimer. Use neutral language: "No outcome-determination logic", "only mathematical operations".

### `build2a_package1.test.ts` sentinel
- The "no Package 2A-2 or later tables" sentinel must be updated with each package delivery to remove table names that now legitimately exist (e.g., after 2A-4 delivery, remove `evidence_bundles`, `fusion_contexts`, `opinions` from the sentinel list).

### Test migration pattern
- Each new package's test file MUST call `ensureBuild2a4Tables()` in its `beforeAll` — the tables don't exist until that migration runs.
- Prior packages' migrations (`ensureBuild2aTables`, `ensureBuild2a2Tables`, etc.) have already run and persist in the dev DB.
