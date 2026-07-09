# PHASE 1 FINDINGS — Diagnostic Decomposition under P2-FOCUS

**Date:** 2026-07-09 · **v1.1 (K1-CORRECT applied — see §1 correction block)** · **Brief:** v1.5 · **Population:** recalibrated 15% point (latentShift 0.6409), primary seed 0xC0FFEE, n=50,000 · **Baseline:** gate 4/5 = 0.0342, bucket5−bucket1 mean score gap = 30.36 pts · **Scripts/logs:** `phase1Diagnostic.ts`, `phase1_diagnostic.log`

## 1. Confirmed disparity drivers (1.1 × 1.2 cross-check)

Two independent methods — gate-level leave-one-out ablation (mean/majority
imputation over the 39 weighted fields) and exact per-component
decomposition of the bucket5−bucket1 gap (computePTI is additive per
component, so per-component attribution is exact; this is what SHAP
converges to on an additive scorer, with zero approximation error). The
decomposition sums to 30.36 pts, matching the gap exactly (internal
validity check passed).

**Dimension shares of the gap:** ED 33% · BC 25% · CF 23% · PR 19%.
ED+CF carry 56% — consistent with F-1a, but note BC+PR carry a real 44%
via the reliability↔SES latent coupling (this is the residual that will
populate the 4.1 business-necessity memo).

**Confirmed drivers (flagged by BOTH methods):**

| driver | LOO gap-reduction | exact component share | class (see §3) |
|---|---|---|---|
| KYC (verified + tier) | 3.03 + 1.27 pts | ED.kyc_verified 14.2% (4.31 pts) | SES-direct + special case |
| currentBalance | 2.40 pts | CF.wallet_balance 4.8% | SES-direct (level) |
| daysToFirstSpei | 1.73 pts | CF.bancarization_speed 5.7% | SES-direct |
| deviceScore | 1.69 pts | ED.device_consistency 5.6% | SES-direct |
| billerCount | 1.93 pts | ED.biller_diversity 6.4% | BEHAVIORAL (retain) |
| spei/cardLoadCount | 1.05/0.94 pts | CF.funding_channel_mix 3.3% | SES-direct (rail mix) |

Method caveats: single-field Δ(4/5) is noisy at these tiny pass rates
(gap-reduction is the stable ranking); `streakMonths` and `payCount`
return undefined 4/5 under imputation because they gate the gate itself
and many sub-scores respectively — payCount's 5.55-pt gap reduction
reflects its role as the payment-depth backbone, not a removal candidate.

**Special case — KYC double-counting (K1-CORRECTED, v1.1 of this doc):**
KYC verified is already a HARD GATE CRITERION; it is additionally worth
10 of ED's 25 points, and that component is the single largest disparity
contributor (4.31 pts, 14.2% of the gap).

> **CORRECTION (K1):** the original version of this finding claimed
> removal "changes nothing about who can pass." That was FALSE. Every
> gate-eligible user is KYC-verified by definition and therefore holds
> those points; removing them uniformly deflates the scores of exactly
> the eligible population, making PTI ≥ 80 harder to reach and worsening
> acceptance component (iv). Credit: Lloyd, Phase 1 review.

What survives the correction: the 4.31-pt distributional contribution is
double-counted exclusion (the risk function of KYC is fully preserved by
the gate criterion), which makes these 10 points the LEAST-CONTESTED
REALLOCATION SOURCE in the model. Frontier candidate #1 is therefore
KYC remove-AND-reallocate as a single move — the removal is only
coherent packaged with its reallocation. kycTier's graded
within-verified gradient (1.27-pt LOO reduction) is a SEPARATE disparity
channel with its own frontier row.

## 2. P2-PREVIEW — removal alone fails twice (the recomposition thesis, confirmed)

Combined mean-neutralization of the 10 SES-direct ED/CF fields:
- Gate 4/5: 0.0342 → **0.4965** (14×), gap 30.36 → 19.49 pts. Removal
  alone gets over halfway — and still fails the 0.80 target.
- **Ceiling re-test (acceptance component iv): FAILS, and in the wrong
  direction.** At latent saturation, P(PTI≥80 | active) drops 19.26% →
  **8.22%**. Mean-imputation removal strands the demoted components'
  points as unearnable for everyone, LOWERING the behavioral ceiling.

Implication — the core Phase 2 design constraint: the ~24 points of
ED/CF max currently sitting on SES-direct components (ED: kyc 10, device
3; CF: wallet_balance 6, bancarization 3, funding_mix 2 — see component
cap table in the log) must be REALLOCATED to conduct-earnable components,
not merely removed. Removal fixes ratios by flattening everyone;
recomposition fixes ratios by making the gate earnable. Only
recomposition can satisfy acceptance components (i)–(iv) simultaneously.
This empirically confirms P2-FOCUS: the frontier's primary axis is ED/CF
recomposition, with PR/BC reweighting evaluated alongside.

## 3. ED/CF field classification (1.3, per P2-FOCUS)

Evidence: corr(field, latent SES) vs corr(field, streakMonths) at n=50k,
plus generator formula citations; classifications below combine both with
the §1 cross-check. Real-data caveat applies throughout: these are
generator-informed; every classification is re-tested on the MFI backtest.

**SES-DIRECT — demotion-to-shadow candidates** (|ses|/|streak| corr ratio
≥ ~1.6, generator draws directly from SES): `deviceScore` (2.43),
`kycTier` (2.45), `totalLoads` (2.45), `totalSpend` (2.44),
`speiLoadCount` (2.13), `cardLoadCount` (2.12), `kycVerified` (1.65 —
but see the double-counting special case), `currentBalance` (Pearson
compressed by lognormal tail; generator formula 3.2+2.2·ses is direct),
`daysToFirstSpei` (empirical corr is an NaN-gating artifact — the field
is only defined for SPEI users; within that subset the generator formula
2.5−1.8·ses is direct). The v4.3 disposition machinery
(`ptiV4_3Disposition.ts`) already implements zero-weight shadow status —
demotion reuses existing, licensee-documented infrastructure.

**BEHAVIORAL — retain, reallocation targets** (ratio ≤ ~0.7):
`billerCount` (0.61), `utilityRatio` (0.58), `hoursToFirst` (0.69),
`amountCV` (0.35 — strongly reliability-linked), `daysOld` (0.15 —
tenure), `oxxoLoadCount` (0.44 — NOTE: the FIELD is behavior-neutral;
the SCORING of funding_channel_mix rewards bank rails, i.e., the
disparity lives in the scoring direction, not the signal — a transform
candidate: score load REGULARITY, not rail identity).

**MIXED — transform candidates** (ratio ~0.9–1.0): `intentClicks` (0.90),
`p2pSendCount` (0.96), `p2pRecipientCount` (0.92).

## 4. What Phase 2 inherits

1. Frontier candidate #1 (K1-corrected): KYC remove-AND-reallocate as
   one move — the 10 points shift to behavioral ED components within the
   same candidate; risk function preserved by the gate criterion;
   removal-alone is incoherent (deflates the eligible population).
2. Primary axis: reallocate the ~24 SES-direct ED/CF points to
   behavioral components (biller diversity, utility share, curriculum/
   literacy progression, load regularity) — sized so the ceiling test
   (iv) passes at ≥22.5%. C1-CIRCULARITY constraint applies to any
   curriculum/literacy reallocation: the live curriculum is PTI-gated,
   so scored progression risks a score→unlock→score ladder; candidates
   de-gate, cap, or document. G1-GAMING applies to ALL reallocations:
   every point moved to a pursuable behavior raises gaming payoff;
   acceptance component (v) grades this per candidate.
3. Rail-mix transform: replace funding_channel_mix's rail-identity
   scoring with rail-agnostic load-regularity scoring.
4. PR/BC reweighting as a parallel candidate (raises the behavior-
   earnable share above 50/100 directly — the F-1a lever).
5. Residual-disparity documentation seed for 4.1: PR/BC carry 44% of the
   gap through the reliability↔SES coupling; advance_payment_days alone
   is 8% — these are the "direct predictor" business-necessity cases.

## 5. Sensitivity harness (1.4) — EXECUTED (v1.5 sequence)

Harness: two research-scope generator parameters — `relSesCoupling`
(reliability→ses latent weight, shipped 0.25) and `sesCouplingScale`
(uniform scale on all SES→field slopes around center, shipped 1.0) —
swept ±25% in a 3×3 grid, n=50k/cell, 15% calibration point, primary
seed. Identity check: defaults reproduce the Phase 1 baseline exactly
(gate 4/5 0.0342, gap 30.36) — hard-fails on any generator regression.
Canonical pinned shift going forward: 0.6409 (4-dp); a 0.08pp
calibration-rate discrepancy vs. the Phase 0.5 log traces to bisection
precision before pinning, now resolved.

Results (`phase14_sensitivity.log`):
- **Diagnostic is generator-robust.** Gate 4/5 spans [0.023, 0.092]
  across the full grid — never within an order of magnitude of 0.80.
  Cohen's d spans [1.03, 1.66], always large. The severity metrics
  (gap, d) move monotonically with both couplings; the 4/5 ratio is
  noisier (ratio of small rates) and is graded per cell.
- **Driver ranking is sensitivity-robust.** ED.kyc_verified is rank-1 in
  every decomposed cell; top-8 component overlap with center is 6–7/8 at
  all four corners. Frontier candidate #1 (K1) and the §3 classification
  survive the perturbation. BC.financial_curiosity_index enters the
  top-8 at high-relSes corners — the PR/BC residual channel strengthens
  exactly as the latent-coupling story predicts.
- **Grading context for acceptance (i):** calibration rate varies
  12.1–19.8% across cells at fixed shift; each candidate's pessimistic
  cell is therefore graded within that cell's own calibration context
  (documented in the harness header). The max-severity corner is
  (relSes 0.3125, slope 1.25): gap 37.3 pts, d 1.66.

The harness accepts any candidate scoring function, satisfying the v1.1
requirement that the sweep apply to the recommended package.
