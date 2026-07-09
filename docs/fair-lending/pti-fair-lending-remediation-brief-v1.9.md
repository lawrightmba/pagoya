# FABLE 5 TASK BRIEF: PTI Fair-Lending Remediation — Diagnostic, LDA Search, and Documentation Pack

**Version 1.9** — FRONTIER DECISION resolved: option (a) MODIFIED. (D1) Synthetic acceptance for (i)–(iii) re-graded as LDA SEARCH EXHAUSTION: the package is accepted when no remaining candidate materially improves the gate 4/5 without failing (iv)–(vi). Fraction-of-oracle becomes a REPORTED per-cell context metric (the oracle bound varies with the coupling grid), NOT a pass threshold; the 66% figure is dropped as reverse-engineered from Row 2's position. 0.80 is retained as the REAL-DATA target; the search reopens on MFI data by standing design. (D2) Option (b) rejected — group proxy at scoring time is the disparate-treatment exposure 2.6 exists to exclude; not reopened. Option (c) rejected — terminal-at-0.80 misrepresents the search given F-2. (D3) F-2 leads the 4.1 memo as a CONDITIONAL result with the caveat stated both directions (weaker real coupling → 0.80 may be reachable and the search reopens; stronger → the mechanism is documented); the oracle bound is computed and reported in all nine sensitivity cells. ROW 5 PACKAGE (P1–P4): Row 2 with E2 floor restructures (marginal-behavior-above-floor scoring for biller_diversity and payment_streak, floors aligned to the G-C gate minimums) + G-C tolerant-streak gate + per-biller payment-count verification INSIDE the candidate (verification changes who earns points and is graded, not bolted on); full six-component rig re-run from scratch (no result carries over); double-count audit in the package output; G-C gate text delivered verbatim as a LLOYD-SIGNOFF item (it rewrites the READY promise); package record reports fraction-of-oracle per cell and documents search exhaustion. Then Phase 3 spec + Phase 4 documentation pack drafting.

*Version 1.6 changes (superseded where amended): acceptance (vi) performance retention; A1 all-cells; N1 null-candidate.*

## Context
PTI v4.3 (54 computed signals — **39 weighted + 15 zero-weight v4.3-expansion fields**; the zero-weight status is the documented release design per `ptiV4_3Disposition.ts` (5 permanent, 10 provisional pending real backtest data), NOT code drift — across 4 weighted dimensions: PR 30 / BC 20 / ED 25 / CF 25) failed an internal fair-lending stress test on 8,000 synthetic profiles: four-fifths ratio ~0.045, Cohen's d ~0.90, driven by 7–8 income-correlated proxy fields. The existing ±5/±2 group adjustment layer is structurally insufficient and is itself a disparate-treatment risk — **and per the code audit is currently inert in production** (the colonia/income mapping table in `fairLendingMapping.ts` is all zeros pending bias-test signoff, so the layer adjusts no one). External advisor (Dr. Franklin) is disengaged; this brief moves the analytical work to Fable, with external review repositioned as a final signoff on finished work.

**Immediate Lloyd-side materials fixes (independent of this remediation, do now):**
- Every external "54 signals" reference gets a footnote: 39 scored, 15 running in shadow pending validation on real loan data. Framed correctly, the shadow fields are a diligence asset (disciplined validation-before-weighting), not a gap.
- Any material claiming the ±5/±2 layer "corrects" disparity is describing intended future behavior; correct to "designed, audited, and currently held inert pending bias-test signoff."

**Reproducibility note (manifest Gap 1/5):** the 8,000-profile population and the 0.045/0.90 findings exist only as deterministic re-runs from a pinned seed (`0xC0FFEE`, mulberry32); no frozen dataset or results file exists. Phase 2.0 fixes this.

Objective: produce an industry-standard remediation — measured at the decision gate, achieved through feature- and training-level changes, with a documented less-discriminatory-alternative (LDA) search and business-necessity memo — sufficient to survive a licensee compliance review.

Standing constraints:
- Explainability is non-negotiable (Banxico/CNBV posture + PTI's own positioning). No black-box remediation (no adversarial debiasing nets in production). Monotonic, transparent methods only.
- All work versioned under the existing PTI signoff-gate system. No scoring change ships without a version bump and signoff record.
- Evidence standard applies: every phase delivers artifacts (tables, code, sensitivity runs), not summaries.

---

## PHASE 0 — Re-specify the test (the gap may be mismeasured)

0.1 Decision-point analysis: re-derive the four-fifths ratio AT THE READINESS
    GATE (PTI ≥ 80 AND streak ≥ 90d AND diversity ≥ 3 AND KYC AND fraud-free
    AND literacy ≥ 3), not on score distributions. The 4/5 rule governs
    selection rates at decision points. Report: pass rate per proxy group at
    the gate, ratio, and how it differs from the distributional 0.045.
    Also report at alternative thresholds (PTI 70, 75, 85) — threshold
    placement is itself a remediation lever.

    FLAGGED HYPOTHESIS — streak ≥ 90d as income-volatility proxy: the streak
    criterion may itself be a disparate-impact channel independent of the PTI
    score. Irregular/informal income (day labor, remittance-timed, seasonal)
    breaks payment streaks even at identical willingness-to-pay; a hard
    90-day-unbroken requirement then screens on income *regularity*, not
    repayment character. Report the streak criterion's STANDALONE pass-rate
    ratio per proxy group (each gate criterion decomposed separately, not
    just the joint gate). CAVEAT: the synthetic generator couples
    streakMonths only to latent reliability (weak SES link via the
    0.25·reliability term in the ses draw), so the synthetic test likely
    UNDERSTATES this channel — a null synthetic result does NOT clear the
    hypothesis. Mark as mandatory re-test on real MFI data and carry the
    hypothesis into 2.5 regardless of the synthetic outcome.

    CRITERION-LEVEL FAILURE ATTRIBUTION (required output): for EVERY
    profile failing the gate, record WHICH criteria failed (PTI<80,
    streak, biller diversity, KYC, literacy, fraud), tabulated by income
    bucket and marginación tier. This converts an opaque per-group pass
    rate into a mechanism, and it tests the streak hypothesis exactly
    where it matters — at the decision point. Decision rule: if bottom
    buckets fail overwhelmingly on streak while clearing biller
    diversity, remediation 2.5 (volatility-tolerant streak) JUMPS THE
    QUEUE ahead of any scoring change.

    PREREQUISITE — definitive gate-level numbers require Phase 0.5 first
    (generator recalibration, THEN ≥50k scale). Gate analysis on the
    current payment-starved 8k population is directional only; see the
    Appendix A.3/A.4 preview caveats.

0.2 Proxy methodology audit: document exactly how protected-class proxies
    were constructed in the synthetic test (income bands? geography?
    gender-from-name?). For the Mexican context, define the defensible proxy
    set: sex (name-derived, with error rates stated), age band, region/
    municipality marginalization index (CONAPO), indigenous-language
    municipality flag (INEGI). US-style race proxies (BISG) do not transfer;
    the licensee-facing standard is sex/age/region under Mexican law plus
    US-style methodology for investor diligence.

0.3 Standards memo: one page defining which standard applies to whom —
    four-fifths (US convention, investor diligence), ECOA/Reg B disparate
    impact framework (methodology reference), CNBV/Banxico explainability
    and non-discrimination posture (the actual licensing jurisdiction),
    LFPDPPP constraints on the proxy data itself. This memo is what Julio
    reviews.

## PHASE 0.5 — Generator recalibration + scale (prerequisite to definitive gate analysis)

Both steps required, in this order. Scaling first is precision without
validity: 50k draws from a payment-starved population just measures the
wrong thing more precisely.

0.5a Recalibrate payment behavior to a documented LENDING-CANDIDATE
     target. The current generator produces a general-population mix in
     which ~0–1% of any income bucket clears the gate (Appendix A.3) —
     but the gate is applied to PagoYa GRADUATES (users who completed the
     Paula funnel: first payment → literacy curriculum → sustained use),
     not to the raw signup base. Define and document the target cohort.
     CALIBRATION SWEEP (S1, signed off): run 0.5 at THREE calibration
     points — 15% / 22.5% / 30% of tenured (≥120d), payment-active
     (payCount ≥ 4) users clearing PTI ≥ 80. Documented rationale: the
     band is anchored to gate design intent (the gate is a hard handoff
     filter; the excelente tier is designed selective), and NO empirical
     anchor exists pre-MFI-cohort — the model card states this
     explicitly. All downstream gate-level findings are reported at all
     three points; findings that hold across the band are calibration-
     robust, findings that don't are flagged as calibration-sensitive.
     Implement as a documented segment mix /
     latent-distribution shift in `syntheticPopulation.ts` (new segment or
     re-weighted segments), versioned alongside the seed and commit hash.
     CRITICAL CONSTRAINT: recalibration must shift payment DEPTH
     (tenure, payCount, streak feasibility), not the SES–behavior
     coupling strengths — those are the quantity under test and must
     carry over unchanged so disparity findings remain comparable across
     the recalibration.

0.5b THEN scale to ≥50k profiles (the generator is seeded and cheap) so
     gate-level cells stop being single-digit counts. Report exact
     binomial CIs on every gate-level ratio regardless of n. Freeze and
     persist the recalibrated primary + holdout populations per Phase
     2.0(c).

Output: the recalibration memo (target, rationale, before/after
population summary statistics, confirmation SES couplings untouched).
SCOPE (v1.4): the generator patch (latentShift, 100k cap) stays in
research scope — NOT ported to the production repo now; it travels with
the Phase 3 implementation spec through the normal signoff path as dev
tooling. The memo is —
this memo is part of the Phase 4 documentation pack, since the licensee's
compliance team will ask why the synthetic cohort looks the way it does.

## PHASE 1 — Diagnostic decomposition (which fields, how much, and why)

1.1 Leave-one-out disparate impact attribution: for each of the 39 WEIGHTED
    signals (not just the suspected 7–8), recompute gate-level pass-rate
    ratios with the field removed. Rank fields by marginal disparity
    contribution. The 15 zero-weight v4.3-expansion fields are scoring-
    inert BY RELEASE DESIGN (`ptiV4_3Disposition.ts` — not drift) —
    retain them in the ablation as null controls (ablation must
    show zero effect; a nonzero effect indicates a wiring bug, which is
    itself a finding). Extend, don't rebuild: `ptiAblationStudy.ts` already
    implements mean-imputation single-field ablation over all fields with
    FIELD_META sesLink annotations — re-derive its metric at the gate level
    rather than the score-distribution level.

1.2 SHAP-based group gap decomposition: decompose the mean score gap between
    proxy groups into per-feature contributions. Cross-check against 1.1 —
    fields flagged by both methods are the confirmed drivers.

1.3 Legitimacy classification (P2-FOCUS: this is the center of gravity,
    and the ED/CF dimensions are the territory — F-1a guarantees gate
    access is mediated by them). Classify EVERY ED/CF field, not just
    confirmed drivers:
    - BEHAVIORAL — earned by conduct regardless of SES (biller
      diversity, missions/curriculum completion, utility-payment share,
      intent actions). Keep, possibly up-weight.
      C1-CIRCULARITY (v1.5): any reallocation to curriculum/literacy
      progression must document the module UNLOCK CONDITIONS and
      demonstrate no score→unlock→score circularity that recreates an
      access gradient. The live curriculum is PTI-GATED: scoring
      progression through PTI-gated modules builds a ladder (higher
      PTI → unlock → more points → higher PTI) that low-scoring users
      cannot board — reconstructing the disparity through product
      mechanics. Candidates must either de-gate the scored modules, cap
      the reallocated weight, or document the residual ladder effect
      explicitly in the frontier table.
    - MIXED — behavioral signal entangled with SES (transform
      candidates: within-group normalization or residualization).
    - SES-DIRECT — device quality, balance/load LEVELS, funding-rail
      mix, KYC tier, speed-to-bank-rail. DEMOTION-TO-SHADOW candidates:
      move to zero-weight shadow status (the v4.3 disposition machinery
      already exists for exactly this), pending real-repayment
      validation that they add risk signal BEYOND their SES correlation.
    The frontier's primary axis in Phase 2 is ED/CF RECOMPOSITION;
    reweighting toward PR/BC is evaluated as a candidate alongside, not
    assumed. For each confirmed driver, additionally classify:
    (a) DIRECT PREDICTOR — plausibly causal for repayment (e.g., payment
        punctuality). Disparity here may be business-necessity defensible.
    (b) PROXY-ONLY — predictive power flows mainly through income/class
        correlation, not repayment behavior (candidates: remittance patterns,
        top-up sizes, device/channel signals). These are removal/transform
        candidates.
    (c) MIXED — partial. Candidates for transformation rather than removal.
    Justify each classification with the correlation structure, not intuition.

1.4 Synthetic-data validity audit: the 8,000 profiles encode generator
    assumptions. Document the generator, run sensitivity analysis (vary the
    assumed income–behavior correlations ±25%), and report how stable the
    disparity findings are. If findings are generator-fragile, say so — it
    bounds how much remediation should be tuned to synthetic data vs.
    deferred to real MFI data. The perturbation grid built here is reused
    in Phase 2 against the recommended package (see Phase 2 deliverable) —
    build it as a parameterized harness, not a one-off script.

## PHASE 2 — LDA search (the core deliverable)

2.0 HOLDOUT EVALUATION BATCH (new — anti-overfitting + fixes manifest Gap
    1/5): before any candidate search, generate a SECOND 8,000-profile
    population from a fresh, documented seed (holdout batch), disjoint from
    the primary seed (0xC0FFEE). Rules:
    (a) All candidate exploration, ranking, and package selection in
        2.1–2.5 runs on the PRIMARY population only.
    (b) The final frontier table and the recommended package are then
        re-evaluated ONCE on the holdout population; report primary-vs-
        holdout deltas for AUC/KS and gate-level 4/5 ratio. Material
        divergence (>0.05 on the 4/5 ratio) means the package is tuned to
        seed noise — iterate on primary, re-evaluate on a THIRD fresh seed.
    (c) Artifact fix: persist BOTH populations as frozen versioned files
        (CSV/JSON + seed + generator commit hash) and persist all run
        outputs as result files, not console transcripts. No more
        "regenerated per run" datasets cited as fixed artifacts.

Run a systematic search over remediation candidates. For EACH candidate,
report the accuracy–disparity frontier point: predictive performance
(AUC/KS on synthetic repayment labels) vs. gate-level 4/5 ratio.

Candidates, in escalating order of intervention (P2-FOCUS: the primary
axis throughout is ED/CF recomposition per 1.3; 2.1–2.4 are instruments
toward that recomposition, and PR/BC reweighting rides alongside).
FRONTIER CANDIDATE #1 (K1, v1.5): KYC remove-AND-reallocate as ONE move —
delete the 10 ED points paid for the gate-required KYC criterion and
reallocate them to behavioral ED components in the same candidate.
Removal and reallocation are inseparable: removal-alone uniformly
deflates gate-eligible users (who all hold these points) and worsens
acceptance (iv). kycTier's graded within-verified gradient is a SEPARATE
channel, evaluated on its own frontier row:
2.1 Feature removal: drop PROXY-ONLY fields from 1.3, individually and in
    combination.
2.2 Feature transformation: within-group rank/quantile normalization or
    residualization of MIXED fields (remove the income-correlated component,
    keep the behavioral component). Must remain explainable — document the
    transform in plain language.
2.3 Reweighing (Kamiran–Calders): reweight training instances to balance
    outcomes across proxy groups. Pre-processing only; model stays
    transparent.
2.4 Fairness-constrained scoring weights (reductions approach, Agarwal et
    al.): re-derive the 4-dimension weights under a demographic-parity or
    equalized-odds constraint at the gate. Weights remain visible and
    documentable.
2.5 Threshold/criteria re-architecture: vary the readiness gate itself —
    PTI cutoff, streak length, diversity count — for disparity impact at
    constant portfolio risk. The gate has 6 criteria; disparity may
    concentrate in one or two. Per the 0.1 flagged hypothesis, treat the
    streak criterion as a first-class candidate: sweep streak length
    (60/90/120d) AND streak *definition* — evaluate volatility-tolerant
    alternatives to hard-unbroken (e.g., "≥9 paid of last 10 due cycles,"
    or streak with one forgiven miss per 6 months) that preserve the
    discipline signal while not screening on income regularity. Also test
    interaction with the soft gate (70/60) — if disparity concentrates in
    the hard/soft delta, the APPROACHING→READY funnel is the lever.

    CENTERPIECE (S3) — conjunctive-gate compounding analysis: all four
    measured criteria carry standalone income gradients (streak 0.42,
    KYC 0.47, biller 0.69, plus PTI itself — Appendix A.4), and ANDed
    criteria compound disparity multiplicatively, so no single-criterion
    fix can clear the gate. Deliverable: the marginal contribution of
    each criterion to (a) risk-filtering power and (b) gate-level
    disparity — computed as gate 4/5 and portfolio-risk proxy with each
    criterion removed/relaxed, one at a time and in combination — plus
    AT LEAST ONE compensatory-gate design candidate (strong performance
    on one criterion partially offsetting weakness on another, e.g., a
    points-based gate over the six criteria with a documented floor per
    criterion) evaluated on the accuracy–disparity frontier alongside
    the scoring remediations of 2.1–2.4. Compensatory designs must stay
    explainable: the gate remains a published formula, not a model.

    KYC criterion (S2): include in the decomposition — not as a removal
    candidate (regulatory-required for the lending handoff) but with the
    remediation channel named concretely: alternate document paths,
    Paula in-flow KYC assistance, and abandonment retry nudges. The 4.1
    memo frames this as INSTRUMENTED FRICTION REDUCTION — measure where
    completion drops by proxy group and fix the funnel — not assumed
    disparity.
2.6 Explicitly EXCLUDED: group-based score adjustments (retire the ±5/±2
    layer — document why: disparate-treatment exposure; note per manifest
    Gap 2 the layer is ALREADY inert in production — all-zero mapping
    table — so retirement is code/doc removal with zero score impact, and
    any external material claiming the layer "corrects" disparity must be
    corrected NOW, independent of this remediation), adversarial/
    black-box debiasing (explainability), and any use of protected-class
    or proxy fields as scoring inputs.

Deliverable: the frontier table (candidate | AUC/KS | 4/5 at gate |
holdout 4/5 at gate | explainability impact | implementation cost), a
recommended package (likely a combination: remove + transform + reweigh +
threshold), and the projected post-remediation ratio. Target: 4/5 ≥ 0.80
at the gate on synthetic data, with the residual gap attributed entirely
to Phase-1.3(a) direct predictors.

SENSITIVITY SWEEP ON THE RECOMMENDED PACKAGE (extends 1.4): the ±25%
generator-correlation perturbation from Phase 1.4 must be re-run against
the FINAL recommended package, not just the unremediated diagnostic.
Report the post-remediation 4/5 ratio as a RANGE (min/median/max across
the perturbation grid), not a point estimate. Acceptance is SIX-
component conjunctive (v1.6): the package passes only if
(i) 4/5 ≥ 0.80 in ALL NINE sensitivity cells (A1: the ratio is
    non-monotonic across the grid; no designated pessimistic corner),
(ii) 4/5 ≥ 0.80 on the 2.0 holdout batch,
(iii) 4/5 ≥ 0.80 at both feasible calibration points {15%, ceiling},
(iv) CALIBRATION-FEASIBILITY RE-TEST: the 22.5% point becomes reachable
     (the package demonstrably raises the F-1a behavioral ceiling), AND
(v) GAMING BATTERY (G1): the full gaming-resistance battery (stress test
    §7 probes — inflated self/advance/consistency with sub-gate
    payCount; ungated reward surfaces with zero payments) re-run under
    the candidate's weights shows no new exploitable surface, AND the
    zero-payment floor (stress finding [4]) is reported per candidate,
    AND
(vi) PERFORMANCE RETENTION (V1, (c) per C-REVISED v1.7): the candidate
    score retains ≥95% of the baseline Spearman rank correlation with
    latent reliability on (a) the full population and (b) the
    payment-active subset (payCount≥4, daysOld≥120); and (c) SELECTION
    QUALITY: mean(_rel | candidate gate-passers) ≥ mean(_rel | baseline
    gate-passers) − 0.02, each score's own passer set. Within-passer
    Spearman is reported, not graded. Tolerances provisional
    [LLOYD-SIGNOFF at frontier review]. This is the frontier's
    performance axis — without it, "comparable performance" is ungraded
    and the business-necessity framework collapses. Real-data caveat:
    latent reliability is generator truth; the MFI backtest re-grades
    (vi) on actual repayment outcomes.
NULL-CANDIDATE PRE-RUN (N1): every candidate ships with a null
parameterization that reproduces baseline exactly (gate 4/5 = 0.0342,
b5−b1 gap = 30.36, per-user total identity) before its real
parameterization runs.
    Rationale: reallocation toward pursued-behavior fields raises the
    gaming payoff BY DESIGN — every point moved from an SES-direct field
    (hard to fake) to a behavioral field (pursuable) is a point a gamer
    can chase. Fairness and gaming-resistance trade off directly and
    must be graded together.
A package that hits 0.80 only at the generator's central assumptions is
not a finding — it's an artifact of the generator.

## PHASE 3 — Implementation spec (no code yet — spec for the signoff gate)

3.1 PTI version spec (v4.4 or v5.0 depending on scope): exact field
    removals/transforms, new weights, gate changes, migration behavior for
    existing user scores (score continuity policy — users must not see
    unexplained drops; define the transition message Paula sends if scores
    shift, consistent with the score-change alert infrastructure).
3.2 Retirement plan for the ±5/±2 adjustment layer, including audit-log
    closure. Simplified by manifest Gap 2: the layer is a production no-op
    (all-zero mapping), so retirement = remove code + mapping table +
    close out fair_lending_signoff audit trail + preserve the regression
    guard (computePTI must never import colonia/income data) as a
    standing test. No user score changes, no migration, no Paula
    transition message needed for this item.
3.3 Monitoring spec: gate-level 4/5 ratio computed monthly on REAL users
    once volume permits, wired into the admin dashboard alongside the
    ledger invariant — fairness as a standing instrument, not a one-time
    test. Define the minimum n before the metric is meaningful and what
    happens below it. ADD (S2): KYC funnel completion as a standing
    production metric — completion rate and drop-off stage, by proxy
    group once n permits — so the 2.5 KYC friction-reduction channel is
    instrumented from day one rather than argued from assumption.

## PHASE 4 — Documentation pack (what the licensee's compliance team reads)

4.1 Business-necessity memo: for each retained direct predictor with
    residual disparity — the predictive justification, the LDA search
    showing no comparable less-discriminatory alternative, citations to
    the methodology literature.
4.2 LDA search record: full frontier table, methodology, code references.
4.3 Model card update: PTI methodology, fairness testing regime, monitoring
    commitments, known limitations (synthetic-data caveat until MFI
    backtest).
4.4 External review packet: the above assembled for a fixed-scope external
    review (Dr. Franklin re-engagement, or a fair-lending consultant
    alternative). The reviewer validates finished work and signs; they do
    not produce. Draft the re-engagement email framing it exactly that way:
    bounded scope, materials complete, signature-level engagement.

## Sequencing and effort
Phase 0 first — 0.2/0.3 (proxy methodology, standards memo) can run
immediately; the DEFINITIVE 0.1 gate-level numbers wait on Phase 0.5
(recalibrate, then scale — in that order). Phase 2.0 (holdout generation +
artifact freezing) runs on the RECALIBRATED generator, immediately after
0.5 and before any candidate
work — it is cheap and everything downstream depends on it. Phases 1–2 are
the deep-research core (multiple sessions; the LDA search is compute +
iteration). The recommended package clears Phase 2 only under the
conjunctive test: 4/5 ≥ 0.80 on primary, on holdout, and at the
pessimistic end of the ±25% sensitivity sweep. Phase 3–4 are drafting. Nothing ships to production scoring until the external
signature in 4.4 — the signoff gate exists for exactly this.

## What this plan does NOT claim
- It does not eliminate disparity. It minimizes it, justifies the remainder,
  and documents the search — which is the actual legal and industry standard.
- It does not substitute for the MFI backtest. Synthetic remediation must be
  re-validated on real loan outcomes; the monitoring spec (3.3) is the
  bridge.
- It does not make Fable the validator. Fable produces; an external
  reviewer signs. Credibility with licensees requires the separation.

---

## APPENDIX A — Empirical preview run (2026-07-09, read-only bundle @ commit 1b2d787)

Executed against the unmodified bundle code (`ptiStressTest.ts` + a bounded
fresh-seed sweep script). Three findings that scope the phases above:

**A.1 Baseline reproduces exactly.** Pinned seed 0xC0FFEE (12648430), n=8,000:
four-fifths = 0.045 at the PTI≥60 selection threshold, Cohen's d = 0.90
(top vs. bottom income bucket), matching the ablation study's tolerance
check. Confirms manifest Gap 1/5 is a documentation problem, not a
reproducibility problem — but note the 0.045 is measured at PTI≥60, i.e.,
a score-distribution threshold, NOT the readiness gate. Phase 0.1's premise
is confirmed as necessary.

**A.2 Fresh-seed sweep (Phase 2.0 preview), 5 seeds × 8,000 profiles:**

| seed | 4/5 @PTI≥60 | Cohen's d | 4/5 @gate-proxy |
|---|---|---|---|
| 0xC0FFEE | 0.045 | 0.90 | 0.000 |
| 0xBEEF01 | 0.019 | 0.97 | 0.000 |
| 0x5EED02 | 0.071 | 0.89 | 0.000 |
| 0x5EED03 | 0.030 | 0.90 | 0.000 |
| 0x5EED04 | 0.025 | 0.94 | 0.000 |

The EFFECT SIZE is seed-robust (d = 0.89–0.97 — the mechanism is real and
stable). The FOUR-FIFTHS POINT ESTIMATE is seed-noisy (0.019–0.071, a ~4×
range) because minimum selection rates are tiny and ratio-of-small-rates
is unstable. Implication: stop quoting "0.045" as a precise figure in any
external material — quote "four-fifths ≪ 0.80, d ≈ 0.9" — and Phase 2.0's
holdout requirement is validated as necessary, not precautionary.

**A.3 Gate-proxy readout (bounded Phase 0.1 preview).** Using the four
snapshot-available gate criteria (PTI≥80, streakMonths≥3, billerCount≥3,
KYC; literacy and fraud-free unavailable in synthetic snapshots): the
bottom three income buckets pass at 0.00% across ALL five seeds; only
buckets 4–5 pass at all (0.05%–1.0%). Gate-level four-fifths = 0.000 —
WORSE than the distributional 0.045, not better. Phase 0's rescoping
branch resolves in advance: the disparity is not mismeasured optimistically;
it is at least as severe at the decision point. Caveats: gate-proxy is
4-of-6 criteria, streak approximated as streakMonths≥3, and passing-cell
counts are single-digit at n=8k (hence the 0.1 population-size requirement).

Artifacts: `stress_primary.log` (full console output, now persisted as a
file per Phase 2.0(c)), `holdoutSeedPreview.ts` (sweep script). Shims used
for the run (logger/whatsapp/wallet-reconstruction stubs) touch no scoring
logic; computePTI, the generator, and all thresholds ran unmodified.

**A.4 Criterion-level failure attribution — PRE-RECALIBRATION mechanism
preview (v1.2 amendment 3; seed 0xC0FFEE, n=8,000; gate-proxy = 4 of 6
criteria).** Absolute rates are directional only pending Phase 0.5; the
mechanism structure is the point.

Full population — per-criterion pass rate by income bucket (lowest → highest):

| criterion | bkt 1 | bkt 2 | bkt 3 | bkt 4 | bkt 5 | 4/5 ratio |
|---|---|---|---|---|---|---|
| PTI ≥ 80 | 0.0% | 0.0% | 0.0% | 0.3% | 1.1% | 0.00 |
| streak ≥ 90d | 2.8% | 3.2% | 4.5% | 4.9% | 6.7% | 0.42 |
| biller ≥ 3 | 30.0% | 33.8% | 39.0% | 42.0% | 43.4% | 0.69 |
| KYC verified | 28.6% | 38.0% | 47.2% | 56.4% | 60.6% | 0.47 |

Payment-active subset (payCount≥4, daysOld≥120 — crude 0.5a graduate proxy,
n=473, cells small): PTI≥80 passes 0/0/0/2.5/9.1% by bucket; streak
38–64%; KYC 42–82%.

Readings, with caveats attached:
1. On the CURRENT generator, PTI < 80 is the near-universal blocker
   (~100% of gate failers fail it in every bucket, both views); the
   streak-ONLY-blocker rate (fails streak, passes the other three) is
   ~0%. The preview therefore CANNOT adjudicate the streak hypothesis —
   not because streak is cleared, but because the payment-starved
   population deflates PTI so far that nothing else gets a chance to
   bind, AND the generator understates streak's SES coupling by design.
   The post-0.5 rerun is the actual decision point for the 2.5
   queue-jump rule.
2. Every criterion already shows an income gradient pre-recalibration.
   Standalone four-fifths per criterion: streak 0.42, KYC 0.47, biller
   0.69 — all well under 0.80 individually.
3. NEW FLAG — KYC as a gate-level disparity channel: the KYC gradient is
   the steepest large-cell gradient in both views (28.6%→60.6% full;
   42%→82% active). In the generator this is by construction (KYC drawn
   directly from latent SES), so the synthetic magnitude is assumed, not
   discovered — but the real-world analogue (KYC completion friction
   correlates with documentation access) is plausible and must be
   measured on real data. KYC is regulatory-required for the lending
   handoff, so it is business-necessity defensible — but Phase 4.1 should
   document the gradient and the necessity argument explicitly rather
   than letting a licensee's compliance team discover it. Add to 0.1
   criterion attribution and to the 4.1 memo scope.

Artifacts: `gate_attribution.log`, `gateCriterionAttribution.ts`.

---

## APPENDIX B — Phase 0.5 execution results (2026-07-09, v1.3 S1)

Executed. Full detail in the Phase 0.5 recalibration memo (separate
artifact); headline results:

**B.1 Calibration sweep partially infeasible (FINDING F-1).** 15% target
achieved at latentShift = 0.6409 (validated 15.29%/15.36% primary/holdout
at n=50k). The 22.5% and 30% points are STRUCTURALLY UNREACHABLE: at
latent saturation (reliability/engagement ≈ 1.0 population-wide), only
19.3% of tenured payment-active users clear PTI ≥ 80. Dimension
decomposition at the ceiling shows behavior fully equalized across income
buckets (PR/BC within 0.3 pts) while the entire remaining gap — bucket 1
mean total 68.6 vs. bucket 5 76.6 — sits in the SES-loaded ED/CF
dimensions. PTI ≥ 80 is partially an SES bar, not a pure behavior bar.
F-1 pre-answers Phase 1.3 (drivers will be the ED/CF SES-direct fields)
and is the strongest single piece of evidence for the remediation.
DECISION PENDING [LLOYD]: two-point sweep {15%, ceiling} recommended,
with post-remediation calibration-feasibility re-test as an outcome
metric (memo §6).

**B.2 Gate-level disparity established at scale.** At the 15% calibration,
n=50k, both seeds: gate four-fifths = 0.034 [Katz 95% CI 0.014–0.083]
primary, 0.058 [0.029–0.116] holdout. Upper confidence bounds are an
order of magnitude below 0.80. No longer a small-cell artifact.

**B.3 Streak queue-jump ruling (synthetic): NOT TRIGGERED.** PTI < 80
fails for 97.7–100% of gate failers in every bucket on both seeds;
streak-ONLY blocking is 0.0–1.9% and reverse-gradient. The binding
differential is the score itself. Phases 1–2 remain the main line; the
S3 compounding analysis stands; the streak hypothesis remains open for
the real-MFI re-test per the standing generator caveat.

**B.4 Coupling invariance.** Coefficients untouched by construction;
empirical SES correlations moved modestly (+0.06–0.08) through clamps —
footnoted for cross-shift comparisons (memo §5).

---

## APPENDIX C — Phase 1 execution results (2026-07-09, v1.4 P2-FOCUS)

Executed on the recalibrated 15% population (n=50k, primary seed). Full
detail in `phase1-findings.md`; headlines:

**C.1 Confirmed drivers (LOO ablation × exact additive decomposition,
cross-checked):** KYC (14.2% of the 30.36-pt gap — largest single
component), currentBalance, daysToFirstSpei/bancarization, deviceScore,
funding-rail mix. Dimension shares: ED 33 / BC 25 / CF 23 / PR 19 —
ED+CF carry 56% (F-1a confirmed empirically); BC+PR's 44% via the
reliability↔SES coupling seeds the 4.1 business-necessity residual.

**C.2 KYC DOUBLE-COUNTING (K1-CORRECTED in v1.5):** KYC is a hard gate
criterion AND worth 10/25 ED points; that component is the largest
single disparity contributor (14.2% of the gap). CORRECTION: the v1.4
claim that removal "changes nothing about who can pass" was false —
gate-eligible users all hold these points, so removal-alone deflates
the eligible population and worsens acceptance (iv). Retained: the
contribution is double-counted exclusion, risk function preserved by
the gate; the 10 points are the least-contested REALLOCATION source.
Frontier candidate #1 = KYC remove-AND-reallocate as one move; kycTier
gradient is a separate channel.

**C.3 Removal alone fails twice (recomposition thesis confirmed):**
neutralizing all 10 SES-direct ED/CF fields lifts gate 4/5 from 0.034 to
0.497 — a 14× improvement that still misses 0.80 — and LOWERS the
behavioral ceiling from 19.3% to 8.2%, failing acceptance component (iv)
in the wrong direction. The ~24 SES-direct ED/CF points must be
REALLOCATED to conduct-earnable components, not removed. P2-FOCUS is now
an empirical result, not a directive.

**C.4 Classification (1.3) complete:** 9 SES-direct demotion-to-shadow
candidates (reusing the existing v4.3 disposition machinery), 6
behavioral retention/reallocation targets, 3 mixed transform candidates;
funding_channel_mix flagged as scoring-direction disparity (score load
regularity, not rail identity). Full table with correlation evidence and
two flagged empirical artifacts (lognormal compression, NaN-gating) in
the findings doc.

**C.5 Deferred:** 1.4 sensitivity harness — next session, prerequisite to
grading any Phase 2 candidate.


---

## APPENDIX D — Phase 1.4 sensitivity harness results (2026-07-09, v1.5)

Executed per the confirmed sequence, before any LDA candidate grading.
3×3 grid (relSesCoupling 0.1875/0.25/0.3125 × sesCouplingScale
0.75/1.0/1.25), n=50k/cell, identity-checked against the Phase 1
baseline. Headlines: (1) the diagnostic is GENERATOR-ROBUST — gate 4/5
spans [0.023, 0.092] and Cohen's d [1.03, 1.66] across the full ±25%
grid; no cell approaches 0.80; (2) the DRIVER RANKING is
sensitivity-robust — ED.kyc_verified is rank-1 in every decomposed cell,
top-8 overlap 6–7/8 at all corners, so frontier candidate #1 (K1) and
the 1.3 classification carry over unconditionally; (3) acceptance-(i)
grading context defined: pessimistic-cell grading within each cell's own
calibration context; max-severity corner is (0.3125, 1.25). The harness
takes any candidate scoring function — the LDA search now has its
grading rig. Full table in `phase14_sensitivity.log` and
phase1-findings §5.

---

## APPENDIX E — Phase 2 opened: rig live, candidate #1 graded (2026-07-09, v1.6)

Six-component rig implemented and live (`phase2CandidateRig.ts`); N1
identity check exact (per-user |cand−base| = 0 at null). Candidate #1
(KYC remove-and-reallocate: kyc 10→0, biller 6→11, spend-mix 4→7,
signup-speed 2→4; ED total constant) graded on all six components — full
row in `phase2-frontier.md`. Headlines: FAILS (i)(ii)(iii) as a lone
candidate, as expected; PASSES (iv) — ceiling 19.26%→24.70%, restoring
the 22.5% calibration feasibility on its own (F-1a's lever confirmed
live); PASSES (v) with the zero-payment floor IMPROVING (p99 44→36.6)
and one watch item (gamed-profile max 18→26, inert); (vi) PASSES (a)(b)
with retention >100% — a strict fairness+performance Pareto move — and
(c) fails on a statistically fragile ratio of near-zero correlations,
flagged as a SPEC ISSUE with a proposed re-grade pending [LLOYD-SIGNOFF]
(absolute bound on the union of passer sets, or demote (c) to
reported-not-graded until real repayment data). A1 vindicated
immediately: the candidate helps at low coupling and is neutral-to-worse
at high relSes — a designated-corner rule would have misgraded it.
Queue: Row 2 full recomposition package, Row 3 PR/BC reweight, Row 4 S3
compensatory gate.

---

## APPENDIX F — Rig v2 + Row 2 graded (2026-07-09, v1.7)

C-REVISED, graded G1, and the parameterized gate are live in
`phase2RigV2.ts` (R4-ready). Row 1 retro re-grade: (vi) now PASSES all
three subtests — selection quality 0.9845→0.9838 within tolerance. Row 2
(full recomposition, PR+BC=58, parameterization in the frontier record):
FAILS (i)(ii)(iii) at 4/5 0.167–0.350 — an order-of-magnitude improvement
that is still short of 0.80 — while PASSING (iv) at 40.35% ceiling, (v)
graded (gamed max 31.5 with an R2-G1 proximity note; zero-payment floor
p99 44→29), and (vi) on all three subtests, including 46% MORE gate
handoffs at equal selection quality (n 1,210→1,768, mean _rel
0.9845→0.9856). Scoring-side headroom is largely spent; the residual now
lives in the reliability↔SES latent coupling (the 4.1 business-necessity
residual) and the gate's own conjunctive criteria — Rows 3–4 (PR/BC
reweight marginal test; S3 compensatory gate as a full system) are queued
accordingly, with Row 5 = Row 2 + Row 4 as the likely package.

---

## APPENDIX G — Rows 3–4, oracle bound, double-count audit (2026-07-09, v1.8)

E1/E2 delivered (gamed-max decomposition: the 31.5 profile is
gaming_selfratio_advance with +13.5 pts from Row-2 upweights, led by
biller_diversity ×1.83 and volatility ×2.33; margin to threshold 8.5 pts
— in-candidate mitigation if Rows 5+ add chaseable weight: per-biller
payment-count verification). Double-count audit standing (biller 7.33/11
and streak 3.69/16 floor portions OPEN; K1 remove-and-reallocate rule
governs). Row 3: diminishing returns measured (+0.01–0.04 ratio in
high-coupling cells only) — the latent coupling rides along with PR/BC
weight. Row 4: three gate variants graded as full systems with
R4-EXPLAIN statements; ratio ~flat, volume moves 1.5–3.5×; G-C wins the
explainability tiebreaker and joins the package; G-B/G-D held as MFI
volume levers. FINDING F-2 (oracle bound): a PERFECT behavior score
yields 4/5 ≈ 0.39 at the gate; the criteria alone yield 0.496; 0.80 is
infeasible on synthetic for any accurate explainable system — Row 2 is
at ~2/3 of oracle. FRONTIER DECISION pending [LLOYD]: re-grade (i)–(iii)
as fraction-of-oracle (≥66% proposed) with 0.80 retained as the
real-data target (recommended), vs. group-based preprocessing (Julio
flag), vs. terminal record.

---

## APPENDIX H — Row 5/5b package, exhaustion declaration, Phases 3–4 drafted (2026-07-09, v1.9)

Row 5 first assembly FAILED (iv) (ceiling 19.65%, volume 734) — the E2
restructures deflated the eligible population, K1's mechanism one level
down, caught by P2's mandatory re-run. Row 5b (steepened marginal
curves) PASSES the full rig: (iv) 28.67%; (v) with the E1 gamed max
collapsing 31.5→18.0 under verification; (vi) all three; double-count
audit CLEAN (both restructured components exactly 0 at their gate
floors). Holdout divergence (0.300 vs 0.197) triggered the 2.0(b) rule →
third/fourth seeds 0.293/0.283: holdout is the low outlier, package not
seed-tuned. Per-cell fraction-of-oracle 0.45–0.89 reported as context
(D1). Honest volume statement on record: −10% handoffs vs baseline at
higher selection quality, with Row 2 / G-B/G-D documented as volume
dials. G-C tolerant branch is synthetic-null under the package —
retained on real-data grounds, documented per P4. SEARCH EXHAUSTION
DECLARED under D1; package = Row 5b + G-C. Phase 3 spec drafted (v5.0
cap table, migration + Paula transition message, ±5/±2 retirement,
monitoring spec with min-n rule, PTI-70 tripwire, tolerant-branch
counter, rollout sequencing gated on the message_templates production
seed). Phase 4 pack drafted: 4.1 memo with F-2 leading as a conditional
result stated both directions; 4.3 model card delta; 4.4 packet + the
Franklin re-engagement email. Open signoffs: G-C gate text [LLOYD],
(vi) tolerances [LLOYD], external signature [4.4].
