# Build 3A — Trajectory Foundation: Completion Report

**Completed:** 2026-08-08  
**Build peer:** Build 3A is a peer to Build 1A and Build 2A — not a sub-package of 2A.  
**Status:** ✅ COMPLETE — all tests pass, canary live, server wired.

---

## What Build 3A Delivers

Build 3A characterizes how PTI's evidentiary position on a single Behavioral Claim changes over time. It derives a trajectory from the immutable Opinion history produced by Build 2A's Opinion Formation stage. This is additive-only: zero modifications to any locked Build 1A or Build 2A object.

**Core concept:** A `behavioral_trajectory` is the discrete-time derivative of the belief/disbelief/uncertainty/base_rate/projected_probability scalar fields across ordered opinions for a claim. It is a first-class immutable record, not a cache or a view.

---

## Schema (all new — zero ALTER on existing tables)

| Table | Tier | Purpose |
|---|---|---|
| `trajectory_rule_versions` | 2 (DELETE blocked, `is_active` sole mutable field) | Versioned finite-difference computation rule |
| `trajectory_governance_contexts` | 1 (fully immutable) | Domain-level or claim-level epsilon governance for categorical direction |
| `behavioral_trajectories` | 1 (fully immutable) | One row per (claim, rule, end_opinion) computation result |
| `behavioral_trajectory_members` | 1 (fully immutable) | Maps opinions → trajectory; UNIQUE(trajectory_id, sequence_number) + UNIQUE(trajectory_id, opinion_id) |
| `trajectory_refusal_records` | 1 (fully immutable) | Only two reason codes accepted by CHECK: `degenerate_zero_elapsed_time`, `trajectory_computation_failed` |
| `trajectory_computation_ledger` | Operational (DELETE blocked) | FOR UPDATE SKIP LOCKED deduplication; UNIQUE(claim_id, rule_version_id, end_opinion_id) |

**Views:**
- `latest_behavioral_trajectory_v` — chain-tip trajectory per claim
- `latest_trajectory_governance_context_v` — chain-tip governance context per (scope, domain/claim)

**Seeds:**
- `trajectory_rule_versions`: `finite_difference_trajectory_v1` (active)
- `trajectory_governance_contexts`: domain-level canary row for `agent_instrumentation`, `direction_epsilon = 0.01`, `scope_type = 'domain_module'`

---

## Trajectory Computation Logic

**Numeric fields (always computed, regardless of governance):**
- `delta_X = X_last - X_first` for belief, disbelief, uncertainty, base_rate
- `delta_projected_probability = pp_last - pp_first` where `pp = belief + base_rate * uncertainty`
- `velocity_X = delta_X / elapsed_seconds`
- `acceleration_X = 2*(v23 - v12)/(t3 - t1)` when ≥ 3 opinions (irregular-interval formula); `NULL` for 2-opinion trajectories

**Direction (categorical, requires governance):**
Three-state `direction_governance_status`:
- `applied` — one chain-tip governance context found; `direction_X` = `increasing` / `decreasing` / `stable` per epsilon
- `unavailable_no_governance` — no matching context; `direction_X` = NULL, numeric fields still populated
- `unavailable_ambiguous_governance` — multiple equally-specific chain-tip contexts; no arbitrary selection; `direction_X` = NULL, `trajectory_governance_context_id` = NULL

**Refusal conditions (no `behavioral_trajectory` written):**
- `degenerate_zero_elapsed_time` — adjacent opinions share identical `evaluation_time` (division by zero blocked)
- `trajectory_computation_failed` — unexpected exception during computation

Missing/ambiguous governance is **never** a refusal — it yields a completed trajectory with three-state status.

**Projected probability formula:** `sl_binomial_projection_v1`: `pp = belief + base_rate * uncertainty`  
**Replay checksum:** SHA-256 of `JSON.stringify({ member_opinion_ids, trajectory_rule_version_id, trajectory_governance_context_id: ...or "null", version_context_id: ...or "null" })`

---

## Files Delivered

| File | Role |
|---|---|
| `src/services/build3a/migrations3a.ts` | All 6 tables, 2 views, all triggers, seeds |
| `src/services/build3a/build3aReadiness.ts` | State machine; `build3aNotReadyMiddleware` |
| `src/services/build3a/versionDispatch3a.ts` | Build 3A-owned resolver for `trajectory_rule_versions` |
| `src/services/build3a/trajectoryComputation.ts` | `computeTrajectory`, `computeTrajectoryReplayChecksum`, `resolveTrajectoryGovernanceContext` |
| `src/services/build3a/trajectoryComputationLedger.ts` | FOR UPDATE SKIP LOCKED poller; `startTrajectoryComputationPoller` |
| `src/routes/build3aAdmin.ts` | 7 read-only GET routes under `/api/admin/build3a/` |
| `src/services/build3a/canary_3a.ts` | 8 live-DB canary paths |
| `src/services/tests/build3a_trajectory.test.ts` | 32 tests across 28 suites |
| `src/index.ts` | Wired: `ensureBuild3aTables`, `setBuild3aReady/Failed`, `startTrajectoryComputationPoller` |
| `src/routes/index.ts` | Mounted: `/admin/build3a` with `build3aNotReadyMiddleware` |

**Build 2A test updated (not a locked object):**
- `src/services/tests/build2a_knowledge.test.ts` — forward-guard updated: Build 3A tables now expected to exist; true-future (Build 4+) state/Markov tables still guarded as absent.

---

## Test Results

| Suite | Tests | Status |
|---|---|---|
| Build 3A trajectory (28 suites) | 32 / 32 | ✅ |
| Build 2A-1 through 2A-6 regression | 241 / 241 | ✅ |
| **Total** | **273 / 273** | ✅ |

**Canary (live DB):** 8 / 8 paths PASS

| Path | Description |
|---|---|
| A | Two-opinion velocity — elapsed=100s, exact math verified |
| B | Three-opinion acceleration — irregular timing (60s + 100s), exact formula verified |
| C | Direction `applied` — epsilon=0.01, belief=increasing, disbelief=decreasing, uncertainty=stable |
| D | Direction `unavailable_no_governance` — numeric populated, categorical NULL, no refusal written |
| E | Direction `unavailable_ambiguous_governance` — two real competing IDs shown, no arbitrary pick, no refusal |
| F | Degenerate zero-elapsed-time refusal — `trajectory_refusal_records` row written, no `behavioral_trajectory` |
| G | Exact replay checksum — byte-for-byte match via separate `createHash("sha256")` code path |
| H | Immutable supersession — prior unchanged, new trajectory chains, `latest_behavioral_trajectory_v` correct |

**Real-data eligibility check:** NOT YET EMPIRICALLY ELIGIBLE.

Corrected eligibility query (fixture-excluded) returns **0 pre-existing real claims** with ≥2 opinions. Every opinion currently in the live database belongs to a test or canary fixture from a Build 2A or Build 3A implementation session. The complete fixture inventory in the opinions table as of 2026-08-08:

| Fixture type | Origin | Claim count |
|---|---|---|
| `Build3A test falsifiability: *` | Build 3A test runner (this session) | 78 claims |
| `Canary3A falsifiability: *` | Build 3A canary (this session) | varies |
| `no_gov_test/*`, `ambig_gov_test/*` | Build 3A governance-variant test fixtures | 12 claims |
| `Canary 2A-4 claim for entity A *` | Build 2A-4 canary runs | 5 claims |
| `Pred test falsifiability: *` | Build 2A-6 prediction test fixtures | 70 claims |
| `Canary 2A-6: *` | Build 2A-6 canary fixtures | 50 claims |
| `KQ test claim *` | Build 2A-5 knowledge qualification fixtures | many |

**Corrected statement:** Build 3A engineering validation is complete. Trajectory mathematics and mechanics are proven with controlled fixtures. Real behavioral trajectory analysis cannot yet be claimed because insufficient pre-existing Opinion history exists in the live database. This is expected and is not a Build 3A implementation failure. Eligibility requires a real Claim with ≥2 Opinions created from genuine production behavioral events, independent of any test or canary run.

The real-data eligibility check in `canary_3a.ts` has been corrected (2026-08-08) to explicitly exclude all known fixture markers before querying for eligible claims. The corrected query also excludes the current canary run ID to prevent a live canary from counting its own freshly-inserted opinions as real data.

---

## Locked-Object Integrity

- Zero modifications to any Build 1A or Build 2A schema file, migration, or service.
- `refusal_records` (Build 2A-6) unchanged — 49-value CHECK constraint intact, verified by test.
- `versionDispatch.ts` (Build 2A) unmodified — Build 3A owns `versionDispatch3a.ts`.
- `trajectory_rule_versions` is not in the locked `VersionTableName` union type; the owned resolver handles it correctly.

---

## Stop Conditions

No stop condition was triggered. No locked object required modification. All Build 3A objects are additive-only.

---

## Admin API Routes

All routes behind `build3aNotReadyMiddleware` → `adminAuth` at `/api/admin/build3a/`:

| Route | Description |
|---|---|
| `GET /status` | Build 3A readiness state |
| `GET /trajectory-rule-versions` | All rule versions |
| `GET /governance-contexts` | All governance contexts |
| `GET /trajectories` | Recent trajectories (50) |
| `GET /trajectories/:id` | Single trajectory + members |
| `GET /refusal-records` | Recent refusals (50) |
| `GET /ledger` | Recent ledger entries (100) |
