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
- Genuine (non-zero) clamp validation lives in a companion script —
  `fairLendingClampStressTest.ts` — see its own section below.

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

## Genuine (non-zero) clamp stress test — `fairLendingClampStressTest.ts`
The real `FAIR_LENDING_MAPPING` is all-zero, so testing the ±5/±2 clamp against
it is trivial (0 is always in-bounds). This companion script installs a
TEST-ONLY, deliberately extreme mapping by mutating the imported
`FAIR_LENDING_MAPPING` object's point values **in memory, for the script
process only** (never edits the config file on disk, never DB) — then calls
the real, unmodified `computeFairLendingAdjustment()` against it. Restores the
real mapping in `finally`.
**Run:** `pnpm --filter @workspace/api-server exec tsx src/scripts/fairLendingClampStressTest.ts`
Findings (seed 0xC0FFEE, n=8000):
- Clamp holds with zero breaches under both cap regimes even when raw
  combined totals reach ±18 (far past the ±5/±2 caps); exact-boundary probes
  (5.0, -5.0, 2.0, -2.0, plus float-sum 0.1+0.1+0.1) all clamp/pass through
  correctly with no off-by-one.
- Production activation gate is provably untouched: calling
  `computeFairLendingAdjustment()` with `flagState.enabled=false` (the real
  dev/local default — no signoff row) returns adjustment=0 regardless of how
  extreme the mapping is, proving the `if (!flagState.enabled)` guard is the
  literal first check and cannot be bypassed by mapping content. Also:
  `FAIR_LENDING_MAPPING_VERSION` is computed once at module load from the
  on-disk mapping, so in-memory mutation never produces a hash that could
  match a real `fair_lending_signoff` row.
- Even the MOST extreme, cap-saturating test-only mapping (favorable case for
  the adjustment layer) only closed ~59% of the mean-score gap between
  highest/lowest income bucket (16.4→6.7 pts) and moved four-fifths from
  0.045→0.216 — still far short of the 0.80 pass bar. Conclusion: the ±5/±2
  structural cap makes the adjustment layer a partial mitigant at best against
  a proxy-driven gap this large; it cannot alone achieve four-fifths
  compliance — would need base-model changes too.

## How to read the disparate-impact result honestly
Grouping scores by the NEVER-scored income/colonia metadata shows strong proxy
leakage (four-fifths ≈ 0.045, Cohen's d ≈ 0.9; persists on normal-only segment).
This is a **model-fairness** property (behavioral proxies correlate with SES), not
a code bug. **Magnitude is a function of the generator's assumed SES↔proxy
correlation** — the test shows mechanism + direction, not a calibrated prod figure.
