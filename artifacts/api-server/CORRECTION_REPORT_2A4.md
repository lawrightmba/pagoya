# Build 2A — Package 2A-4 Correction Report (Final)

**Date:** 2026-08-07  
**Canary Run ID:** `canary2a4_1786118258589`  
**Run start:** 2026-08-07T15:57:38.590Z  
**Run end:** 2026-08-07T15:57:39.386Z  
**Test suite:** 95/95 pass (7 pre-existing billpay failures in separate suite — unrelated to 2A-4)  
**Status:** ✅ LOCKED

---

## 1. Root Defect (Corrected)

### Defect: `_resolveBaseRate` used timestamp ordering instead of supersession lineage

**Prior implementation:**

```sql
SELECT id, value, scope, sufficiency_status
FROM latest_base_rate_record_v
WHERE scope = $scope
  AND sufficiency_status <> 'provisional_unknown'
  AND value IS NOT NULL
ORDER BY effective_from DESC
LIMIT 1
```

This violated the Build 2A-1 lineage rule. `latest_base_rate_record_v` already implements
the supersession chain as a view — selecting `ORDER BY effective_from DESC LIMIT 1` on top of it
caused silent wrong-row selection when multiple orphan rows existed (e.g., 24 ungoverned tips for
`2a4_agent_instrumentation` all returned from the view, oldest by `effective_from` could be chosen
over the canonical seed).

**Corrected implementation:**

Count the eligible chain tips from `latest_base_rate_record_v`:

| Tip count | Outcome |
|-----------|---------|
| 0         | `missing_base_rate` refusal |
| 1         | Proceed with that tip |
| >1        | `ambiguous_base_rate_governance` refusal |

When `versionContextId` is provided, the resolver short-circuits to validate exactly
one tip referenced by the version context (immutable lineage pin — can never be ambiguous).

**Static regression guard (Suite 14 test):**
> `no silent universal 0.50 fallback: static grep confirms ORDER BY LIMIT 1 is absent from resolver`

---

## 2. New Refusal Code: `ambiguous_base_rate_governance`

Added to:
- `migrations_2a3.ts` — `refusal_records.reason_code` CHECK constraint
- `migrations_2a4.ts` — `refusal_records.reason_code` CHECK constraint (Section 9)
- `build2a_opinion.test.ts` — `FUSION_CODES` array + new Suite 14 DB insertion test

---

## 3. Canonical Provisional Base Rate Record (Section 16)

A canonical provisional BRR supersedes the `canonical_seed_original` for scope
`2a4_agent_instrumentation`. This removes the original from `latest_base_rate_record_v`.

| Field | Value |
|-------|-------|
| `id` | `b3a7916b-f90a-438f-8a4d-bb30498ab48b` |
| `canonical_seed_key` | `b2a_provisional_v1\|2a4_agent_instrumentation\|provisional\|canary_validation_2a4` |
| `sufficiency_status` | `provisional` (machine-readable, ≠ `sufficient`) |
| `value` | `0.50` (documented neutral prior) |
| `source_type` | `documented_neutral` |
| `approval_authority` | `founder_architecture_review_build2a_2a4` |
| `supersedes` | `6dfa24a1-496f-4f85-a066-fa267ab1662d` (canonical_seed_original) |
| `effective_until` | `2027-08-07` |

**Backward lineage verified:** superseded row is `b2a_seed_v1|2a4_agent_instrumentation|domain_expert|build2a_2a4_spec` ✓

**Provisional vs. sufficient distinction:** Both `sufficiency_status` values exist in the
`base_rate_records` table for `2a4_agent_instrumentation` scope and are machine-distinguishable
by column value alone. Knowledge qualification layers can gate on this field.

---

## 4. `version_context_2a4_v2_provisional` (Section 16b)

Supersedes the prior `version_context_2a4_v1` which pinned the now-superseded `canonical_seed_original`.
The new context pins the canonical provisional BRR.

| Field | Value |
|-------|-------|
| `id` | `87622c8f-1554-47f9-8998-2bec6e6a0139` |
| `label` | `version_context_2a4_v2_provisional` |
| `base_rate_record_id` | `b3a7916b-f90a-438f-8a4d-bb30498ab48b` |
| BRR `sufficiency_status` | `provisional` |

---

## 5. Section 15 Comment Correction

`migrations_2a4.ts` Section 15 comment previously stated:
> "The new governed base_rate_records row is preferred by `_resolveBaseRate` because it has a
> newer `effective_from`."

This was incorrect — the corrected resolver does not use timestamp ordering. The comment now reads:
> "NOTE: This BRR row uses `sufficiency_status='sufficient'`, which does not correctly reflect its
> nature as an unvalidated computational prior. Section 16 creates the correct canonical provisional
> row. This Section 15 row is immutable and remains as a historical artifact."

---

## 6. `opinion_formation_ledger` — Formally Ratified (Section 17)

A `DO $$ ENSURE INDEX $$` block ensures the index on `opinion_formation_ledger.created_at`
exists. The table itself was seeded in a prior migration. Section 17 formally ratifies it
as part of the 2A-4 spec.

---

## 7. Trigger Constraints — Immutable Orphan Rows

24 base_rate_records rows for `2a4_agent_instrumentation` (23 orphan + 1 canonical_seed_original)
have `supersedes=NULL`. Both DELETE and UPDATE triggers (`build2a_no_delete_base_rate_records`,
`build2a_no_update_base_rate_records`) block all mutations. These rows are permanently retained
as Tier 1 audit trail.

**Consequence:** The scope-based resolver ALWAYS refuses with `ambiguous_base_rate_governance`
for `2a4_agent_instrumentation` (24 eligible chain tips). All opinion formation for this scope
requires explicit `versionContextId` pinning — this is **correct behavior** and was verified
in the canary (Paths D1, A, B, C, E, F1, F2).

---

## 8. Test Suite — Suite 14: Base-rate governance resolver (10 new tests)

| Test | Result |
|------|--------|
| `latest_base_rate_record_v`: superseded record not a chain tip | ✅ pass |
| `latest_base_rate_record_v`: chain tip is the current (superseding) record | ✅ pass |
| Timestamp order cannot override supersession lineage | ✅ pass |
| Multiple eligible chain tips: b2atest_scope_mx_unbanked > 1 | ✅ pass |
| `refusal_records` accepts `ambiguous_base_rate_governance` reason code | ✅ pass |
| Canonical provisional BRR: `sufficiency_status='provisional'` | ✅ pass |
| Canonical provisional BRR supersedes canonical_seed_original | ✅ pass |
| `canonical_seed_original` NOT a chain tip (superseded) | ✅ pass |
| `provisional` and `sufficient` machine-distinguishable | ✅ pass |
| `version_context_2a4_v2_provisional` seeded + pins provisional BRR | ✅ pass |

**Total suite result: 95/95 tests pass** (across all 14 suites in `build2a_opinion.test.ts`)

---

## 9. Canary — All Paths Verified

### Pre-flight
- Section 15 governed BRR (historical): ✅ present
- Section 16 canonical provisional BRR: ✅ `b3a7916b` — `sufficiency_status='provisional'` — supersedes `6dfa24a1`
- Governed FGC `v1.1-governed-experimental`: ✅ in `latest_fusion_governance_context_v`
- `version_context_2a4_v2_provisional` (`87622c8f`): ✅ pins provisional BRR
- Scope chain tips for `2a4_agent_instrumentation`: 24 — correctly ambiguous ✅
- Canary pinned VC (per-run): `752f57c0-9b46-4793-8f48-cabb47e07ff5`

### Path A — Cumulative Fusion (LIVE-DB) ✅
Two independent `supports` atoms → `cumulative` operator.
All 6 structural objects retained: evidence_bundle, 2× bundle_members, fusion_context,
opinion, reasoning_trace, sl_binomial_projection_v1. b+d+u invariant ≤ 0.0001. Used
pinned version_context — version_context_id NOT null in trace ✅

### Path B — Averaging Fusion (LIVE-DB) ✅
Two `dependent` atoms → `averaging` operator. All bundle members have
`dependence_declaration='dependent'`. WEC IDs from atom construction verified present
in bundle_members. `unknown_dependence_fallback_applied=false` ✅

### Path C — Consensus & Compromise (LIVE-DB) ✅
One `supports` + one `contradicts`, both high-quality (q≈0.95–0.99).
- UNIT-MATH inline conflict: `0.5710` > threshold `0.30` → C&C selected
- `fusion_context.rerouted_to_consensus_compromise=true` ✅
- `fusion_context.conflict_measure=0.570977` matches inline computation (Δ < 1e-6) ✅
- `fusion_context.conflict_threshold=0.30` from governed FGC ✅
- `fusion_context.governance_context_id=60643045-318c-4a33-85b2-6c4aca7db28b` ✅
- Reasoning trace: `fusion_operator_selected='consensus_compromise'` ✅

### Path D — Base-Rate Refusals (LIVE-DB) ✅
**D1:** `2a4_agent_instrumentation`, `versionContextId=null` →
`ambiguous_base_rate_governance` refusal  
Refusal ID: `2c594698-a636-4668-ba0b-47ec85dbe4cf`  
`refusal_records` row retained ✅

**D2:** `behavioral_consistency` (no BRR for scope `2a4_behavioral_consistency`) →
`missing_base_rate` refusal  
Refusal ID: `5cced14d-dac1-4e16-8231-d667ea046f49`  
`refusal_records` row retained ✅

### Path E — Opinion Supersession (LIVE-DB) ✅
New WEC supersedes `wec2` from Path A. `latest_weighted_contribution_v` excludes
superseded WEC, includes new WEC. New `formOpinion` call creates opinion
`94aeb10c-e835-4a95-a039-dfa74e128b89` with `supersedes = pathA.opinionId`.  
Prior opinion unchanged in DB ✅  
`latest_opinion_v` resolves to new opinion only ✅

### Path F — Governance Resolution (LIVE-DB) ✅

**F1:** Domain-level governance selected as fallback (`scope_type='domain_module'`).  
Opinion formed: `d0ff8d37`. Domain FGC: `60643045` (v1.1-governed-experimental) ✅

**F2:** Claim-level governance context (`threshold=0.45`) inserted then used.  
Claim-level FGC `fd941490` selected over domain-level `60643045`.  
Stored threshold `0.45` (domain 0.30 overridden) ✅  
Opinion formed: `7d28c026` ✅

**F3:** Canary-keyed BRR seeded for `cash_flow_stability` (`aebc0159`). Pinned VC
`25fc1d32` bypasses scope ambiguity. No `fusion_governance_contexts` row for this
scope → `missing_conflict_threshold_governance` refusal.  
Refusal ID: `67627bf9` retained ✅

### Path G — Trace Verification + Independent Replay Checksum (LIVE-DB) ✅
Retrieved trace for Path A's opinion:

| Field | Value |
|-------|-------|
| `trace_id` | `cbd6e6c9-a9ca-4427-bfbf-b675db301df2` |
| `fusion_operator_selected` | `cumulative` |
| `independent_contribution_count` | `2` |
| `dependent_contribution_count` | `0` |
| `discarded_contribution_count` | `0` |
| `zero_weight_contribution_count` | `0` |
| `governance_context_id` (from FC join) | `60643045-318c-4a33-85b2-6c4aca7db28b` |
| `version_context_id` (from opinion) | `752f57c0-9b46-4793-8f48-cabb47e07ff5` |

**Independent SHA-256 replay checksum** (Node.js `createHash('sha256')`, not the service function):
```
stored:      41e8913b42742715a4f0a140135b4ac269f02d2a3d0194ed56b6ebc944d00997
recomputed:  41e8913b42742715a4f0a140135b4ac269f02d2a3d0194ed56b6ebc944d00997
```
**Byte-for-byte equality confirmed ✅**

Canonical payload format:
```json
{
  "bundle_id": "<bundle_id>",
  "fusion_context_id": "<fc_id>",
  "governance_context_id": "<fgc_id>",
  "version_context_id": "<vc_id (string 'null' when null)>",
  "evaluation_time": "<ISO 8601>"
}
```

Additional cross-checks:
- Trace operator matches `fusion_contexts.selected_operator` ✅
- Trace `governance_context_id` matches `fusion_contexts.governance_context_id` ✅
- Bundle member count (2) = `independent_contribution_count` (2) ✅
- Trace `version_context_id` matches canary pinned VC ✅

---

## 10. Package 2A-5 Sentinel

No 2A-5 objects exist. Confirmed:
- No tables named `*2a5*` or `*build2a5*`
- No services named with `2a5` prefix
- No migrations for 2A-5

Package 2A-4 is the locked boundary of this sprint.

---

## 11. Files Modified

| File | Change |
|------|--------|
| `src/services/build2a/opinionPersistence.ts` | `_resolveBaseRate` rewritten: version_context path validates single tip; scope path counts chain tips, refuses with `ambiguous_base_rate_governance` if >1, `missing_base_rate` if 0 |
| `src/services/build2a/migrations_2a4.ts` | Section 9 CHECK updated (added `ambiguous_base_rate_governance`); Section 15 comment corrected; Sections 16/16b/17 added (canonical provisional BRR, `version_context_2a4_v2_provisional`, ledger ratification) |
| `src/services/build2a/migrations_2a3.ts` | CHECK constraint on `refusal_records.reason_code` updated to include `ambiguous_base_rate_governance` |
| `src/services/tests/build2a_opinion.test.ts` | `FUSION_CODES` array updated; Suite 14 "Base-rate governance resolver" added (10 tests) |
| `src/services/build2a/canary_2a4.ts` | Full rewrite: all paths use pinned `versionContextId`; Path D split D1+D2; Path F3 seeds per-run canary BRR + pinned VC; Path G uses `createHash('sha256')` directly (independent code path) |

---

## 12. Known Pre-existing Failures

7 tests in the `billpay` test suite fail due to rate-limiter state accumulation across
test cases (separate Task #8 — no relation to 2A-4). Zero new failures introduced by
this correction pass.
