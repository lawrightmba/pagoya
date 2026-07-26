---
name: PTI v2 Behavioral Profile Adapter
description: Additive presentation layer over v5 scoring — new vocabulary, trajectory, Evidence Depth shell. Zero scoring changes.
---

## What was built (2026-07-26)

**New file: `services/ptiV2.ts`**
- Pure read adapter — calls no compute function, writes to no table
- `mapBreakdownToV2Dimensions(bd)` — exported pure function, testable
- `buildTrajectoryObservation(snap)` — exported pure function
- `buildEvidenceDepthShell()` — exported pure function
- `buildPTIv2Profile(telefono)` — DB adapter (reads users + pti_trend_snapshots only)

**Dimension label mapping (internal key → v2 key):**
- `payment_reliability` → `payment_reliability` (unchanged)
- `cashflow_stability` → `cash_flow_resilience`
- `behavioral_consistency` → `behavioral_stability`
- `engagement_depth` → `engagement_depth` (unchanged)

**Trajectory direction mapping:**
- `rising` → `improving`
- `falling` → `deteriorating`
- `stable` → `stable`
- `insufficient_data` → `insufficient_data`

**Evidence Depth:** shell only — score=null, status="NOT_COMPUTED", version="0.0.0-not-computed". Zero influence on behavioral score.

**New route:** `GET /api/pti/v2-profile?telefono=xxx` (ADMIN_TOKEN Bearer required) in `routes/pti.ts`.

**New test file:** `services/tests/ptiV2.test.ts` — 26 tests, all pass.

## Invariants that must hold forever

1. `mapBreakdownToV2Dimensions` output scores/maxes must equal input scores/maxes exactly.
2. `evidence_depth` must never influence `behavioral_profile.score` in any code path.
3. `validation_status` must stay "PRE_VALIDATION" — never imply default probability, creditworthiness, or calibrated risk.
4. `trajectory.direction` describes observed behavioral direction only — no causal/predictive claim.
5. `entity_type` = "human", `domain` = "financial" always (no non-human/non-financial implementation this sprint).

## engagement_depth component categorization

- **Genuine behavior:** `biller_diversity`, `spend_category_mix`
- **Evidence depth candidates:** `signup_utilization_speed` (activation onset, not recurring), `device_consistency` (0 pts, observation quality not behavioral choice)
- **Ambiguous:** `kyc_verified` (0 pts, compliance gate + intent signal + infra constraint — needs review)
