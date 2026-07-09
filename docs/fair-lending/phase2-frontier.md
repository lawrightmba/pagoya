# PHASE 2 FRONTIER RECORD — LDA Search (running artifact, feeds 4.2)

**Brief:** v1.6 · **Rig:** six-component acceptance (`phase2CandidateRig.ts`) · **Started:** 2026-07-09

**VI-CAVEAT (v1.7, applies to every row):** base full-population Spearman
ρ ≈ 0.39 means the performance axis is weakly identified on synthetic
data. Retention grades candidates RELATIVELY against baseline; it does
not validate absolute predictive power — the MFI backtest does that.

Candidate scoring convention: per-component point-scale factors on the exact
component scores computePTI emits — component logic untouched, candidate =
a published table of component caps (explainability preserved by
construction). Every run opens with the N1 null-candidate identity check.

---

## ROW 1 — Candidate #1: KYC remove-and-reallocate (K1)

**Parameterization (explicit per v1.6):**
ED.kyc_verified 10→0 · ED.biller_diversity 6→11 · ED.spend_category_mix
4→7 · ED.signup_utilization_speed 2→4. ED total unchanged at 25. All
other components ×1. C1 n/a (no curriculum component). kycTier separate-
channel row subsumed (the tier gradient rode inside kyc_verified's graded
scoring; factor 0 removes both).

**N1:** PASS (per-user max |cand−base| = 0 at null; 0.0342 / 30.36 exact).

| component | result | detail |
|---|---|---|
| (i) all 9 cells ≥0.80 | **FAIL** | cand 4/5 range 0.030–0.152; improves low/mid-coupling cells (center 0.034→0.049; best 0.092→0.152) but ~flat-to-slightly-worse at high relSes (0.075→0.067 at (0.3125, 0.75)) |
| (ii) holdout | **FAIL** | 0.058→0.060 |
| (iii) both calibration points | **FAIL** | 15%: 0.049 · ceiling: 0.048→0.082 |
| (iv) ceiling ≥22.5% | **PASS** | 19.26% → **24.70%** |
| (v) gaming + floor | **PASS**, one watch item | no gamed profile reaches ≥60/≥80/gate under either scoring (0.00% everywhere); zero-payment floor IMPROVES (p99 44.0→36.6, max 53.0→43.8); watch: gaming_selfratio_advance max score rises 18→26 (biller-diversity upweight is chaseable) — inert at current levels, re-check when combined with further behavioral upweights |
| (vi) performance | (a) PASS 102.8% · (b) PASS 121.2% · (c) C-REVISED **PASS** | full-pop ρ 0.392→0.403; active ρ 0.190→0.231; selection quality: mean _rel 0.9845 (base passers, n=1,210) vs 0.9838 (cand passers, n=1,239) — within tolerance −0.02. Within-passer Spearman [diagnostic]: 0.027→0.035 |

**Verdict:** NOT the package (expected — single frontier row), but three
results worth keeping:
1. Candidate #1 alone RESTORES CALIBRATION FEASIBILITY (iv) — the
   22.5% target unreachable under v4.3 becomes reachable with just the
   KYC reallocation. F-1a's lever confirmed live.
2. It IMPROVES performance retention on the population and active
   subsets while improving fairness — a strict Pareto move on those
   axes, exactly what "least-contested reallocation source" predicted.
3. The A1 all-cells rule earned its keep immediately: the candidate
   HELPS at low coupling and is ~neutral-to-negative at high relSes
   (up-weighted biller_diversity carries more reliability→SES
   correlation there). A designated-corner rule would have graded this
   wrong.

**(vi)(c) RESOLVED (C-REVISED, v1.7):** replaced by selection quality —
mean(_rel) of each score's own passer set, tolerance −0.02; within-passer
Spearman reported-not-graded. Row 1 re-graded retroactively above: (vi)
now passes on all three subtests. Verdict amendment: with (vi) fully
passing, Row 1 is a strict fairness+performance Pareto move failing only
the disparity thresholds (i)–(iii) it was never sized to clear alone.

**Coverage note (vi):** _rel is defined for 74% of the population
(normal + gradient + cold-start segments); gaming/contradictory builders
carry no reliability latent. Reported n's reflect this.

---

## Queue (per v1.5/v1.6 sequencing)

- Row 2: Candidate #1 + funding_channel_mix transform (rail-agnostic
  load regularity) + wallet_balance/bancarization/device demotion with
  reallocation into PR/BC and behavioral ED/CF (the full recomposition
  package sized against (iv)).
- Row 3: PR/BC reweighting variant (raise behavior-earnable share above
  50/100 directly).
- Row 4: S3 compensatory-gate design candidate (points-based gate with
  per-criterion floors).
- Each row: full six-component rig; C1 documentation wherever curriculum
  weight appears; G1 watch item re-checked as behavioral weight
  accumulates.

---

## ROW 2 — Full recomposition package (P2-FOCUS)

**Parameterization (points; Σ maxes = 100 asserted in-rig):**
Demote (−24): ED.kyc_verified 10→0 · ED.device_consistency 3→0 ·
CF.wallet_balance 6→0 · CF.bancarization_speed 3→0 ·
CF.funding_channel_mix 2→0.
Reallocate (+24): ED.biller_diversity 6→11 · ED.spend_category_mix 4→7 ·
ED.signup_utilization_speed 2→4 · BC.wallet_load_rhythm 2→4 (rail-
agnostic regularity, the funding-mix transform) ·
CF.payment_amount_volatility 3→7 (payCount≥2-gated: floor-safe,
game-resistant) · CF.load_spend_ratio 3→4 · CF.account_age 2→3 ·
PR.payment_streak 13→16 · PR.self_initiated_ratio 5→7 ·
PR.payment_day_consistency 4→5.
New dimension caps PR 36 / BC 22 / ED 22 / CF 20 → **PR+BC = 58** (F-1a
lever engaged). Deliberately untouched: advance_payment_days (largest PR
residual — not amplified), game_engagement/paula_* (G1), buffer_retention
(finding [4]). C1: n/a. Gate: baseline (R4 rig supports candidate gates).

**N1:** PASS (exact).

| component | result | detail |
|---|---|---|
| (i) all 9 cells | **FAIL** | 4/5 range 0.167–0.350 (base 0.023–0.092): 5–10× improvement, uniform across the grid, still ≪ 0.80 |
| (ii) holdout | **FAIL** | 0.058→0.229 |
| (iii) calibration points | **FAIL** | 15%: 0.262 · ceiling: 0.196 |
| (iv) ceiling ≥22.5% | **PASS** | 19.26% → **40.35%** |
| (v) gaming (GRADED) | **PASS** | gamed ≥60: 0.00% both segments; selfratio max 31.5 (< 40 but within 10 pts — R2-G1 proximity note: further chaseable-component weight requires in-candidate earn-rate caps); ungated max DROPS 14→9; zero-payment floor p99 44→29 |
| (vi) performance | **PASS all three** | (a) 106.4% · (b) 153.0% · (c) selection quality 0.9845→0.9856 with n passers 1,210→**1,768** |

**Verdict:** NOT the package yet — but the shape of the endgame is now
visible:
1. Recomposition at this depth moves 4/5 an order of magnitude
   (0.034→0.26 center) while IMPROVING every performance measure. The
   (vi)(c) result is the Series A sentence: the recomposed score hands
   off 46% MORE users at equal selection quality (mean latent
   reliability 0.9856 vs 0.9845).
2. The residual gap has changed character. With SES-direct components
   at zero weight, what remains is (a) the reliability↔SES latent
   coupling flowing through legitimately behavioral fields — the 4.1
   business-necessity residual — and (b) the GATE's own non-PTI
   criteria (KYC 0.47, streak 0.42, biller 0.69 standalone 4/5),
   conjunctively compounding per S3. Scoring-side headroom is largely
   spent; Rows 3–4 test how much reweighting and gate re-architecture
   can claim, and what remains is documented, not eliminated — exactly
   the standard the brief set ("What this plan does NOT claim").
3. (iv) is no longer binding: 40.35% ceiling means the post-remediation
   architecture could support calibration targets the original S1 sweep
   couldn't reach.

## Queue

- Row 3: PR/BC reweight variant on top of Row 2 (test marginal value of
  pushing PR+BC beyond 58).
- Row 4: S3 compensatory gate (points-based, per-criterion floors) as a
  full system via the parameterized gate — the S3 compounding analysis
  says this is where the remaining ratio lives.
- Row 5: Row 2 + Row 4 combined = likely package candidate.

---

## DOUBLE-COUNT AUDIT (E2, standing checklist for Row 5 assembly)

Score components × gate criteria, floor-overlap audit (quantified at the
15% point, center cell, Row-2 scale):

| score component | overlapping gate criterion | double-counted floor portion | status |
|---|---|---|---|
| ED.kyc_verified | KYC required | was 10/10 (binary) | RESOLVED Rows 1–2 (removed & reallocated) |
| ED.biller_diversity | billerCount ≥ 3 | **7.33 of 11 pts** earned at the gate floor — guaranteed to every gate-eligible user (min among eligibles = 7.33) | OPEN — Row 2 exhibits it |
| PR.payment_streak | streak ≥ 90d | **3.69 of 16 pts** at streakMonths=3 floor | OPEN — Row 2 exhibits it |
| (G-B/G-D only) gate points for biller≥3 / streak≥3 | graded score components for the same fields | structural — the compensatory gate re-awards what the score already grades | OPEN — flag for Row 5 if a points gate is retained |

K1's lesson generalizes and is the checklist rule: floor portions are
restructured by REMOVE-AND-REALLOCATE (rescale the component to score
marginal behavior above the gate floor — e.g., biller points begin at the
4th biller — and reallocate the floor points in the same move). Removal
alone deflates exactly the eligible population. Row 5 assembly runs this
audit as a gate item.

---

## ROW 3 — PR/BC push (PR+BC = 65) · MARGINAL-VALUE MEASUREMENT

Row 2 + {CF.p2p 3→0, CF.buffer_retention 3→0, CF.account_age 3→2} →
{PR.payment_streak 16→19, PR.payment_day_consistency 5→7,
BC.recovery_after_miss 2→4}.

Measured marginal value over Row 2: 4/5 +0.01–0.04 in high-coupling
cells, ~0 at center, −0.02 on holdout (seed noise range); (iv) 40.35→
46.56%; (vi) improves further ((b) 160.5%, passers 2,072 @ 0.9852);
gaming and floor both improve (ungated max 9→5, floor p99 29→24.8).
**Verdict: diminishing returns confirmed.** The ratio barely moves
because payment_streak/consistency carry the reliability↔SES latent
coupling with them — reweighting toward behavior cannot outrun the
coupling. Keep as an optional refinement; not the lever.

---

## ROW 4 — Gate variants as full systems (score = Row 2; R4-EXPLAIN statements attached)

| system | center 4/5 | all-cells range | holdout | passers (vs 1,210 base) | mean _rel | (v) | (vi) |
|---|---|---|---|---|---|---|---|
| G-B compensatory points | 0.249 | 0.168–0.371 | 0.226 | 3,827 (+216%) | 0.9808 | PASS | PASS |
| G-C tolerant streak | 0.266 | 0.173–0.366 | 0.233 | 1,861 (+54%) | 0.9857 | PASS | PASS |
| G-D compensatory + tolerant | 0.243 | 0.181–0.357 | 0.221 | 4,248 (+251%) | 0.9802 | PASS | PASS |

All FAIL (i)–(iii) at 0.80. Gate re-architecture does not materially move
the RATIO (it moves VOLUME and criterion incidence); the tolerant streak
barely moves the ratio on synthetic — consistent with the Phase 0.5
finding that PTI<80, not streak, binds here. Its value is real-data-
contingent and it stays in the package for that reason, not this one.
Zero gamed gate-clears under every variant (PTI≥72 floor holds).

**R4-EXPLAIN statements:**

*G-C — Paula (es-MX):* «Tu racha cuenta aunque un mes se te haya
cruzado: con 2 meses seguidos y 6 pagos en total, sigues en camino. Lo
demás igual: PTI de 80, 3 servicios y tu verificación.»
*G-C — committee:* Baseline gate with a volatility-tolerant streak:
3 consecutive months OR 2 consecutive months with ≥6 lifetime payments
(one-interruption forgiveness; event-level "9 of last 10 cycles"
definition pending real cycle data). Targets income-regularity screening
without relaxing payment depth. +54% handoffs at +0.001 mean latent
reliability.

*G-B — Paula (es-MX):* «Para estar lista: verificación, PTI de 72,
2 meses de racha y 2 servicios — eso no se negocia. Después reúnes 5
puntos entre tu racha, tu variedad de pagos y tu puntaje: si uno va
fuerte, apoya al otro.»
*G-B — committee:* Four non-negotiable floors (KYC · PTI≥72 · 2-month
streak · 2 billers) plus a 5-point composite: score strength (≥80: 2,
≥85: +1), streak depth (≥3mo: 2, ≥5mo: +1), biller depth (≥3: 2, ≥5: +1).
Strength on one criterion offsets marginal performance on another, never
below floors. +216% handoff volume at −0.004 mean latent reliability
(within tolerance).

*G-D — Paula (es-MX):* «Cuatro básicos: verificación, PTI 72, 2 meses de
racha — un tropiezo no la borra — y 2 servicios. Luego 5 puntos entre
racha, variedad y puntaje: tus fortalezas se apoyan entre sí.»
*G-D — committee:* G-B floors and points with the tolerant streak feeding
streak credit. Maximum handoff volume (3.5× baseline) at 0.9802 mean
latent reliability.

**Explainability tiebreaker (R4-EXPLAIN):** G-C wins on explainability —
a one-sentence change to the existing gate. G-B/G-D are explainable
without a lookup table (a 3-row points list) but are a bigger product
and partner surface. Since the ratio is ~flat across variants, the
tiebreaker governs: G-C joins the package now; G-B/G-D are held as
VOLUME levers for MFI pilot sizing — a partner-facing choice, priced at
−0.004 selection quality per the table. Double-count audit flags G-B/G-D
internally (see audit table).

---

## FINDING F-2 — THE ORACLE BOUND (center cell; reframes the 0.80 target)

Score := latent reliability itself (perfect behavioral prediction):
- Criteria-only gate (streak & biller & KYC, NO score): 4/5 = **0.496**
- Oracle score + baseline criteria (volume-matched): 4/5 = **0.390**
- Oracle score alone, no criteria: 4/5 = 0.625

Under this generator's couplings, a PERFECT behavior score cannot exceed
4/5 ≈ 0.39 at the gate, and the gate criteria alone — with no score at
all — sit at 0.496. **Acceptance components (i)–(iii) at 0.80 are
infeasible on synthetic data for ANY accurate, explainable
behavior-based system.** Row 2 (0.26 center) already achieves ~2/3 of the
oracle bound; the gap to 0.80 is attributable to (a) the
reliability↔SES latent coupling (behavior itself is income-correlated in
the generator) and (b) the conjunctive criteria (S3 compounding),
not to remediable scoring choices. This is the business-necessity
attribution for the 4.1 memo, computed rather than argued. Real-data
caveat cuts both ways: the coupling strength is a generator assumption —
the MFI backtest measures the real oracle bound.

**FRONTIER DECISION [LLOYD]:** with F-2 on record, options for the
(i)–(iii) grading standard:
(a) RECOMMENDED — re-grade (i)–(iii) as fraction-of-oracle-bound per
    cell (proposal: ≥66%, which Row 2 meets at center) + retain 0.80 as
    the REAL-DATA target for the MFI backtest, where the coupling is an
    empirical question. Recommended package: Row 2 + G-C, with Row 3 and
    G-B/G-D as documented options; 4.1 memo writes the residual to F-1a,
    F-2, and the criterion set.
(b) Authorize group-based preprocessing (2.2 within-group normalization
    / 2.3 reweighing). Flagged tension: in a rule-based scorer these
    require a group proxy AT SCORING TIME — the disparate-treatment
    exposure 2.6 exists to exclude. Not recommended without Julio.
(c) Hold 0.80 as-is and record the frontier as terminal on synthetic —
    defensible but leaves the package formally ungraded.

---

## ROW 5 / 5b — ASSEMBLED PACKAGE (P1–P4, brief v1.9)

**Row 5 (first assembly) — FAILED (iv), recorded for the audit trail:**
marginal curves too shallow (biller full at 6 verified, streak full at
7 months) → the ~11 restructured floor points became unrecoverable for
the ceiling cohort: ceiling 19.65% < 22.5%, passer volume collapsed to
734. K1's deflation mechanism, one level down — caught by the mandatory
full re-run (P2).

**Row 5b (accepted assembly):**
- Row 2 factors, with two REPLACEMENT components (raw-field scoring):
  · ED.biller_diversity (11 pts): verified billers v = min(billerCount,
    ⌊payCount/2⌋) — per-biller ≥2-payments verification, snapshot proxy
    pending event-level data. Score 0 at v≤3 (gate floor), +5.5/verified
    biller above, full at 5.
  · PR.payment_streak (16 pts): 0 at ≤2 months (the G-C tolerant floor),
    +4/month above, full at 6 months.
- Gate G-C (verbatim below). All other Row 2 factors unchanged.

**N1:** PASS (exact). **Double-count audit: CLEAN** — both restructured
components are exactly 0 at their gate floors for every user; min biller
component among gate-passers = 0.00 (marginal-only, as designed).

| component | result | detail |
|---|---|---|
| (i) D1 exhaustion + per-cell context | **ACCEPTED under D1** | pkg 4/5 range 0.168–0.358 across the grid; fraction-of-oracle per cell 0.45–0.80 (reported context, not a threshold); exhaustion documented below |
| (ii) holdout + seed check | **PASS per 2.0(b)** | holdout 0.197 vs primary 0.300 triggered the >0.05 rule → third + fourth seeds: 0.293, 0.283. Holdout is the low outlier (bucket-1 small-cell noise); four-seed range [0.197, 0.300], median ≈0.29 |
| (iii) calibration points | 15%: 0.300 · ceiling: 0.216 (reported under D1) | |
| (iv) ceiling ≥22.5% | **PASS** | 19.26% → **28.67%** |
| (v) gaming (graded) | **PASS** | selfratio max **31.5 → 18.0** (verification neutralizes the E1 profile exactly as designed); ungated max 9; zero gamed gate-clears; floor p99 28.3 |
| (vi) performance | **PASS all three** | (a) 103.2% · (b) 144.8% · (c) 0.9852 vs 0.9845 (n 1,093 vs 1,210) |

**Honest volume statement:** the package hands off ~10% FEWER users than
the baseline gate (1,093 vs 1,210 finite-_rel) at slightly higher
selection quality — the price of audit-clean floors and gaming
hardening. Row 2's +46% volume is available by relaxing the floor
restructures; G-B/G-D add up to 3.5× as partner-facing volume levers at
−0.004 selection quality. This is a documented dial, not a defect.

**G-C tolerant-branch synthetic result:** ZERO additional passers on
synthetic under the package (tolerant-branch users hold 0 streak points
and rarely reach 80). The +54% figure from Row 4 applied to Row 2's
score without floor restructures. G-C is retained on REAL-DATA grounds
(the income-volatility hypothesis the generator understates by design) —
synthetic-null documented per P4.

## SEARCH EXHAUSTION DECLARATION (D1)

Candidates measured: KYC remove-and-reallocate (Row 1), full
recomposition (Row 2), PR/BC push (Row 3 — marginal: +0.01–0.04 in
high-coupling cells only), three gate re-architectures (Row 4 — ratio
flat, volume moves), floor restructures + verification (Rows 5/5b).
Excluded by design: group-based adjustments and scoring-time proxies
(2.6, D2), black-box debiasing (explainability). Remaining unexplored
moves are curve-tuning within measured families (marginal by Row 3/5b
evidence) or volume levers that do not move the ratio (Row 4 evidence).
**No remaining candidate materially improves the gate 4/5 without
failing (iv)–(vi). The package is Row 5b + G-C. 0.80 remains the
real-data target; the search reopens on the MFI backtest by standing
design.**

## G-C GATE TEXT — [LLOYD-SIGNOFF REQUIRED: rewrites the READY promise]

**Exact definition:** READY requires ALL of: (1) PTI ≥ 80 (package
scoring); (2) payment streak: 3 consecutive months, OR 2 consecutive
months with ≥6 total payments (one-interruption forgiveness; to be
re-specified as "≥9 of the last 10 due cycles" when event-level cycle
data ships in v5); (3) ≥3 active billers (raw count — the user-facing
promise; VERIFIED count governs scoring only); (4) KYC verified; plus
the existing fraud-free and literacy criteria unchanged.

**Paula (es-MX, two lines):** «Tu racha cuenta aunque un mes se te haya
cruzado: con 2 meses seguidos y 6 pagos en total, sigues en camino. Lo
demás igual: PTI de 80, 3 servicios y tu verificación.»

**Credit-committee statement:** Baseline readiness gate with a
volatility-tolerant streak criterion: 3 consecutive months, or 2
consecutive months with ≥6 lifetime payments — one-interruption
forgiveness targeting income-regularity screening without relaxing
payment depth. Under the shipped package the branch admits no synthetic
passers (documented); it exists for real-world irregular-income cohorts
and is monitored via the 3.3 fairness instrument from day one.
