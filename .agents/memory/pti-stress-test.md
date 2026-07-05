---
name: PTI synthetic stress-test harness
description: DEV-only synthetic-population generator + runner that exercises the real computePTI; where it lives, how to run it, and what its findings mean.
---

# PTI synthetic stress-test harness

Two DEV-ONLY files that stress-test the REAL, unmodified PTI engine with a
seeded synthetic population. No DB reads/writes, no prod data, no network.

- Generator: `artifacts/api-server/src/services/syntheticPopulation.ts` — seeded
  mulberry32 RNG; latent factors (reliability/engagement/ses); 6 segments
  (normal, gradient_sweep, cold_start_sparse, contradictory,
  gaming_selfratio_advance, gaming_ungated_surfaces); assigns fair-lending
  metadata (colonia/coloniaTier/declaredIncomeBucket) using the REAL mapping keys.
- Runner/report: `artifacts/api-server/src/scripts/ptiStressTest.ts` — runs each
  profile through `computePTI`/`getPTITier` and the pure
  `computeFairLendingAdjustment` (AdjustmentFlagState hand-built, no DB).

**Run:** `pnpm --filter @workspace/api-server exec tsx src/scripts/ptiStressTest.ts`
Env overrides: `PTI_STRESS_SEED`, `PTI_STRESS_SIZE` (default seed 0xC0FFEE, 8000).

## Durable facts this harness relies on (verify before trusting)
- `getPTITier` cutoffs are **40/60/80** (the "PTI brief" 30/50/65/80 are interior
  values, NOT tier edges — that discrepancy is finding #1, a spec/code mismatch).
- Cold-start gates in `pti.ts`: payCount≥3 activates payDayConsistency /
  advancePayScore / selfInitScore; payCount≥2 activates volatilityScore;
  loadCount30≥3 activates loadRhythm.
- `FAIR_LENDING_MAPPING` ships all-zero (placeholder pending bias sign-off) ⇒
  every adjustment is exactly 0, so the ±5/±2 cap is only trivially validated
  here; real clamp math is covered by `fairLendingAdjustment.test.ts`.

## Field provenance that matters for "is this gaming vector reachable?"
- `domStddev` is **payment-derived** (STDDEV of day-of-month over `bill_payments`,
  defaults to **15** when no payments) → cannot be driven low at payCount=0 in
  production. A low domStddev at payCount=0 is an INVARIANT-BREAK probe, not reachable.
- `hourStd` is **login-derived** (`user_events`, defaults 12) → independent of
  payments, so low hourStd at payCount=0 IS reachable → routine_score's hour half
  (~1pt) legitimately accrues for a zero-payment user.
- `hoursToFirst` is **NaN** whenever payCount=0 (real builder) → signup_utilization_speed
  can't leak in prod; feeding a finite value is an invariant-break probe.
- `buffer_retention` awards full 3pts for currentBalance>0 with totalLoads(90d)=0
  → reachable (older loads outside window). By design.

**Why this matters:** an earlier draft overclaimed that low-domStddev routine
points were production-reachable. They are not (domStddev is payment-derived).
Section 7 now splits **7b production-reachable** vs **7c robustness/invariant-break**.

## How to read the disparate-impact result honestly
Grouping scores by the NEVER-scored income/colonia metadata shows strong proxy
leakage (four-fifths ≈ 0.045, Cohen's d ≈ 0.9; persists on normal-only segment).
This is a **model-fairness** property (behavioral proxies correlate with SES), not
a code bug. **Magnitude is a function of the generator's assumed SES↔proxy
correlation** — the test shows mechanism + direction, not a calibrated prod figure.
