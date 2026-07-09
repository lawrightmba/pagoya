# PHASE 0.5 RECALIBRATION MEMO — Generator recalibration, calibration sweep, and scaled gate analysis

**Date:** 2026-07-09 · **Base:** read-only bundle @ commit `1b2d787` + Phase 0.5 generator patch (documented below) · **Brief:** v1.3 (S1 signed off) · **Status:** Phase 0.5 executed; §6 decision RESOLVED — option (a) accepted (two-point sweep {15%, ceiling≈19.3%}, F-1 recorded, (b) rejected per S1 invariance, (c) folded into 2.5); post-remediation calibration-feasibility re-test adopted as a Phase 2 acceptance component (22.5% must become reachable). F-1 restated per v1.4 F1-SPLIT: F-1a architectural (PR+BC max = 50/100 per pti.ts:589–629, so gate clearance requires ≥30 pts from ED/CF — generator-independent), F-1b magnitude (~11.4-pt bucket-1 ceiling deficit — generator-conditional, carries the §5 coupling footnote).

## 1. Method

Recalibration implemented as a single documented parameter, `latentShift`,
added to `generatePopulation()`: it raises the MEANS of the normal
segment's reliability/engagement latent draws (payment depth — tenure,
payCount, streak feasibility — all flow from these). Per the S1
constraint, the SES noise term is unshifted and every coupling
coefficient (0.55/0.45 base mix, 0.5 rel→eng, 0.25 rel→ses, and all
field-synthesis formulas) is untouched. Mean SES rises only through the
fixed 0.25·reliability coupling, as it would for any genuinely more
reliable cohort. Population cap raised 20k → 100k for gate-level cell
sizes. Calibration metric: P(PTI ≥ 80 | payCount ≥ 4 AND daysOld ≥ 120),
bisection at n=8,000, validated at n=50,000.

## 2. Calibration sweep result — S1 partially infeasible

| Target | latentShift | 50k check | Status |
|---|---|---|---|
| 15.0% | 0.6409 | 15.29% (primary) / 15.36% (holdout) | ✅ calibrated |
| 22.5% | — | — | ❌ UNREACHABLE |
| 30.0% | — | — | ❌ UNREACHABLE |

At latent saturation (shift = 1.2; reliability/engagement ≈ 1.0 for the
entire normal segment), only **19.3%** of tenured payment-active users
clear PTI ≥ 80. The 22.5% and 30% calibration points cannot be reached by
ANY behavioral improvement under the current score architecture and the
generator's SES assumptions.

## 3. Why: the PTI-80 ceiling is structural (Findings F-1a / F-1b)

**F-1a (ARCHITECTURAL — codebase-verifiable, generator-independent).**
Per `pti.ts` (commit 1b2d787): `total = Math.min(100, prScore + bcScore +
edScore + cfScore)` (line 589) with dimension caps PR max 30 (line 596),
BC max 20 (line 605), ED max 25 (line 619), CF max 25 (line 629).
Therefore PR + BC ≤ 50, and clearing the gate at PTI ≥ 80 REQUIRES ≥ 30
of the 50 points available from ED + CF. ED's components are biller
diversity, KYC, spend category, signup speed, and device consistency;
CF's are wallet balance, load/spend volume, volatility, P2P, account
age, bancarization, funding mix, and buffer retention. Gate access is
therefore NECESSARILY mediated by the two dimensions containing every
SES-direct field in the model. This holds for any population, real or
synthetic — it is a property of the weight architecture, and it survives
any critique of the generator.

**F-1b (MAGNITUDE — generator-conditional).** How LARGE the resulting
gap is depends on the generator's SES-coupling assumptions:

Dimension decomposition at the ceiling point (shift = 1.2, active subset,
n=8,405 of 50k):

| bucket | PR/30 | BC/20 | ED/25 | CF/25 | total |
|---|---|---|---|---|---|
| 1 (lowest) | 21.6 | 17.8 | 15.6 | 13.6 | 68.6 |
| 5 (highest) | 21.3 | 17.5 | 20.6 | 17.2 | 76.6 |

With behavior equalized (PR and BC identical across buckets to within
0.3 pts), the entire 8-point total gap sits in ED and CF — the dimensions
loaded with SES-direct fields (deviceScore, KYC tier, balances, funding
rails). The lowest bucket's mean total at maximal behavior is **68.6 —
11.4 points below the gate cutoff — attributable entirely to SES-linked
fields**. The ~11.4-pt bucket-1 ceiling deficit carries the
coupling-assumption footnote (§5): its magnitude is a function of the
generator's assumed SES→field couplings and will be re-measured on real
data. F-1a's direction, however, is not assumption-dependent. Together:
PTI ≥ 80 is not a pure behavior bar under the current architecture; it
is partially an SES bar. This is the mechanism behind the 0.045
distributional finding, the ~0.03–0.06 gate-level finding, and the
calibration infeasibility, all at once — and it pre-answers Phase 1.3:
the confirmed drivers will be the ED/CF SES-direct fields, matching the
ablation study's own FIELD_META "direct" annotations.

## 4. Scaled gate analysis at the achieved calibration point (15%, n=50k)

| | PRIMARY (0xC0FFEE) | HOLDOUT (0xBEEF01) |
|---|---|---|
| Gate pass, bucket 1 | 0.19% [0.08–0.43] | 0.29% [0.15–0.57] |
| Gate pass, bucket 5 | 5.41% [4.92–5.96] | 5.00% [4.53–5.52] |
| Gate four-fifths | **0.034** [0.014–0.083] | **0.058** [0.029–0.116] |

(Wilson 95% CIs on rates; Katz log-ratio 95% CI on the four-fifths.)
The gate-level disparity finding is now established at scale, on two
seeds, with confidence intervals whose UPPER bounds sit an order of
magnitude below 0.80. This is no longer a small-cell artifact.

**Criterion attribution — streak queue-jump ruling (synthetic): NOT
TRIGGERED.** Among gate failers, PTI < 80 fails for 97.7–100% in every
bucket on both seeds; the streak-ONLY blocker rate (fails streak, passes
everything else) is 0.0–1.9% and runs in the REVERSE direction (higher in
top buckets, because they clear PTI more often). On synthetic data the
binding differential is the score itself, not the streak criterion —
remediation 2.5 does not jump the queue; Phases 1–2 scoring remediation
remains the main line, with the S3 compounding analysis intact. Standing
caveat unchanged: the generator understates streak's SES coupling by
design, so this ruling binds for synthetic data only and the hypothesis
stays open for the real-MFI re-test.

## 5. Coupling invariance check

Coupling COEFFICIENTS are untouched by construction (code diff is one
function signature + three mean shifts). Empirical correlations with
latent SES moved modestly (device 0.546→0.614, KYC 0.232→0.309, SPEI
share 0.481→0.557) — a mechanical consequence of pushing shifted
distributions through clamps, not a coupling change. Mean SES rose
0.504→0.582 via the fixed coupling term, as predicted. Cross-shift
comparisons of disparity magnitudes should carry this footnote.

## 6. DECISION — RESOLVED (v1.4)

**Option (a) ACCEPTED** (2026-07-09): two-point sweep {15%, ceiling ≈
19.3%}, F-1a/F-1b recorded; option (b) rejected per S1 invariance;
option (c) folded into 2.5 threshold work. ADOPTED into Phase 2
acceptance: the recommended package must make the 22.5% calibration
point reachable (calibration feasibility as an outcome metric). Original
options preserved below for the record.

### Original options as presented

S1 specified a three-point sweep; two points are structurally
unreachable. Options:
(a) **Accept a two-point sweep** — {15%, ceiling ≈ 19.3%} — and record
    F-1 as the reason. The Phase 2 triple-conjunctive test then reads
    "…at both feasible calibration points." RECOMMENDED: the
    infeasibility is itself the strongest evidence yet for the
    remediation, and the post-remediation model should be RE-TESTED for
    calibration feasibility — if the LDA package works, 22.5%/30% should
    become reachable, which turns S1 into an outcome metric.
(b) Permit calibration to also shift the SES noise mean — rejected as
    default: violates the signed S1 invariance constraint and would
    manufacture the target by making the cohort richer, not better-paying.
(c) Rescope the target metric (e.g., PTI ≥ 70 soft-gate clearing rate) —
    defensible but moves the goalposts mid-analysis; better handled
    inside 2.5's threshold re-architecture.

## 7. Artifacts

- `phase05_calibration.log`, `ceiling.log` — full run output
- `frozen_eval_shift06409_primary_c0ffee_50k.csv(.gz)` — sha256 3c444256…
- `frozen_eval_shift06409_holdout_beef01_50k.csv(.gz)` — sha256 7602a01b…
- `phase05Calibration.ts`, `ceilingAnalysis.ts`, generator patch in
  `syntheticPopulation.ts` (option `latentShift`, cap 100k)
- Regeneration tuple: (commit 1b2d787 + patch, seed, size=50000,
  latentShift=0.6409)

## 8. Model-card line (per S1)

"Synthetic calibration targets are anchored to gate design intent; no
empirical anchor exists prior to the MFI backtest cohort. The 22.5% and
30% calibration points were found structurally unreachable under the
v4.3 architecture (see F-1), which is itself a documented fairness
finding."


## 9. RISK-ADD (v1.4) — F-1 product coupling: Paula template sequencing constraint

Paula's live template set coaches users toward PTI 80 ("sigue así",
"/80 necesario" framing). Under F-1a, a maximally disciplined low-SES
user CANNOT reach 80 under the current architecture — the product would
be making structurally unkeepable promises to exactly the users it is
built for. Constraint: the scoring remediation (or an interim gate/
threshold change) must ship BEFORE real cohorts approach PTI 70+.
NO TEMPLATE ACTION NOW — production n=7, nobody near the gate; this is
recorded as a sequencing dependency between the remediation timeline and
Paula funnel maturity, not a copy fix. Owner: remediation roadmap
(Phase 3.1 score-continuity/messaging spec inherits it).

## 10. Scope note (v1.4) — generator patch

The Phase 0.5 generator patch (`latentShift`, 100k cap, and the Phase
1.4 `sesCouplingScale` harness) is HELD IN RESEARCH SCOPE. Do not port
to the Replit production repo; it travels with the Phase 3
implementation spec through the normal signoff path as dev tooling.

## 9. RISK — F-1 product coupling (v1.4 RISK-ADD, sequencing constraint)

Paula's live template set coaches users toward PTI 80 as an achievable
goal ("sigue así", "/80 necesario"). Under F-1a, a maximally disciplined
low-SES user CANNOT reach 80 — the architecture requires ≥30 ED/CF
points and their SES-direct components are not earnable by conduct. If
real cohorts approach PTI 70+ before remediation ships, the product will
be making structurally unkeepable promises to precisely the users the
trust architecture exists to serve — a trust, fairness, and (for a
licensee) conduct-risk problem simultaneously.

Disposition: NO template action now — production has n=7 templates'
worth of users in early funnel and nobody near the gate. This is a
SEQUENCING CONSTRAINT: remediation (or at minimum the ED/CF
recomposition portion of it) ships before any real cohort approaches
PTI 70+. Wire a tripwire into the 3.3 monitoring spec: alert when the
first real user crosses PTI 70, re-check remediation status at that
moment.

## 10. Generator patch scope (v1.4)

Held in research scope. NOT ported to the production repo now; it
travels with the Phase 3 implementation spec through the normal
signoff-gate path as dev tooling.
