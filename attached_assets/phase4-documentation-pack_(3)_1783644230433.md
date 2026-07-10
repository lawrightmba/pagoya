# PHASE 4 — DOCUMENTATION PACK (DRAFT)

> ⚠️ **DRAFT — PACKAGE AND GATE TEXT FOUNDER-SIGNED 2026-07-09; DOCUMENT PENDING FOUNDER LINE REVIEW AND EXTERNAL REVIEW.** Founder signatures attach to the Row 5b package and the G-C gate text (signature record 2026-07-09), NOT to this document. Gates remaining on this document: (1) founder line review, (2) external signature per 4.4 (Dr. Franklin or alternate). Any repo copy without this watermark is superseded.


**Basis:** brief v1.9 · frontier record (= the 4.2 LDA search record, complete with logs, scripts, seeds, and checksums) · Phase 3 spec

---

## 4.1 BUSINESS-NECESSITY MEMO (draft)

### Lead result (F-2, conditional — per D3)

Under the synthetic test environment's assumptions, a PERFECT behavioral
score — the latent reliability variable itself — produces a gate-level
four-fifths ratio of ≈0.39, and the gate's non-score criteria alone
produce 0.496. The 0.80 threshold is therefore unattainable on this test
population by ANY accurate, explainable behavior-based system; the
signed package reaches 45–80% of the per-cell oracle bound across the
±25% assumption grid (min 0.45 at cell relSes 0.3125 / slope 0.75; max
0.80 at cell relSes 0.1875 / slope 1.25 — Row 5b nine-cell table). **This result is conditional in both directions:**
if real-world income–behavior coupling is weaker than assumed, 0.80 may
be reachable and the less-discriminatory-alternative search REOPENS on
MFI data (a standing design commitment, monitored monthly); if stronger,
the mechanism is documented here rather than discovered by a reviewer.
0.80 remains the real-data target.

### The remediation performed (summary; full record in the LDA search file)

v4.3 → v5.0 moved the gate-level four-fifths from 0.034 to 0.28–0.30
(four-seed range 0.20–0.30) — a ~9× reduction in disparate impact —
while IMPROVING rank correlation with the reliability ground truth
(+3–45% across populations) and improving handoff selection quality
(mean latent reliability 0.9852 vs 0.9845, +0.0007). The trade is
stated plainly per the signature record: the package hands off 9.7%
FEWER users than the v4.3 baseline gate (1,093 vs 1,210 at the 15%
calibration point) — the price of eliminating score/gate double-
counting and hardening the biller gaming surface. Documented volume
levers (the Row 2 configuration; the G-B/G-D compensatory gates) can
recover or exceed baseline volume at a priced selection-quality delta
and reopen the E2 floor audit if selected. Interventions: removal of
all SES-direct scoring fields (device quality, balance levels,
bancarization speed, funding-rail identity, KYC-tier scoring),
reallocation of their 24 points to conduct-earnable components,
double-count elimination between score components and gate criteria,
per-biller payment verification, and a volatility-tolerant streak
criterion. Excluded by design: group-based score adjustments (the
legacy ±5/±2 layer is retired as disparate-treatment exposure) and
black-box debiasing (explainability posture, Banxico/CNBV).

### Retained predictors with residual disparity (the necessity cases)

1. **The reliability construct itself (PR/BC dimensions, 44% of the
   pre-remediation gap; advance_payment_days the largest single item at
   8%).** Payment punctuality, streak persistence, self-initiation, and
   low amount volatility are the direct measures of repayment behavior —
   the product's entire predictive claim. Their residual correlation
   with income is an empirical property of the population, not a proxy
   channel: the F-2 oracle computation shows a perfect measure of the
   same construct carries at least as much disparity. LDA search found
   no comparable less-discriminatory alternative (Rows 1–5b, nine-cell
   grid, four seeds); reweighting away from these fields fails the
   performance-retention test by construction.
2. **billerCount ≥ 3 gate criterion (standalone 4/5 ≈ 0.69).** Retained
   as a hard floor: multi-biller history is the minimum evidentiary
   basis for the cross-obligation reliability claim made to the lender
   at handoff; a 1–2 biller record cannot distinguish habit from
   coincidence. The criterion is count-based and conduct-earnable at
   zero cost (PagoYa's biller catalog is free to use); the scored
   component now rewards only diversity BEYOND this floor, eliminating
   double-counting. Monitored per-criterion monthly.
3. **KYC-verified gate criterion (standalone gradient the steepest
   measured).** Regulatory requirement for the lending handoff — not
   subject to LDA substitution. The disparity channel is completion
   FRICTION, not the requirement: addressed product-side (alternate
   document paths, Paula in-flow assistance, abandonment retry nudges)
   and instrumented from day one via the KYC-funnel monitor. KYC is no
   longer scored — the criterion's risk function is fully preserved by
   the gate alone.

### Method citations
Four-fifths rule (EEOC 29 CFR 1607.4(D), as investor-diligence
convention); ECOA/Reg B disparate-impact framework (methodology
reference); leave-one-out and exact additive decomposition for driver
attribution; Kamiran–Calders and Agarwal et al. reviewed and excluded
with reasons in the search record (no training step in a rule-based
scorer; scoring-time proxies excluded as disparate treatment). Mexican
proxy set per Phase 0.2: sex (name-derived, error rates stated), age
band, CONAPO marginación index, INEGI indigenous-language municipality
flag. Julio reviews the 0.3 standards memo alongside this document.

---

## 4.3 MODEL CARD UPDATE (delta)

- **Methodology:** PTI v5.0 — 4 dimensions (PR 36 / BC 22 / ED 22 /
  CF 20), published component cap table (Phase 3 spec §3.1), rule-based
  and fully explainable; no protected-class or proxy inputs; group-based
  adjustment layer retired.
- **Fairness testing regime:** six-component acceptance (all-cells ±25%
  sensitivity grid · fresh-seed holdout + divergence rule · dual
  calibration points · behavioral-ceiling feasibility · graded
  gaming-resistance battery with zero-payment floor · performance
  retention incl. handoff selection quality), on 50k-profile frozen
  populations with pinned seeds and checksums.
- **Known limitations:** (1) all fairness results are synthetic until
  the MFI backtest; calibration targets are anchored to gate design
  intent — no empirical anchor exists pre-MFI, and two of three
  calibration points were structurally unreachable under v4.3 (finding
  F-1a — itself disclosed); (2) two scoring inputs are proxies pending
  event-level data: verified-biller count (⌊payCount/2⌋ cap) and the
  tolerant streak (month-level, pending "9 of last 10 cycles");
  (3) the oracle-bound result (F-2) is conditional on generator
  couplings, disclosed in both directions; (4) 15 v4.3-expansion fields
  remain zero-weight shadow (39→~34 scored after v5.0 demotions;
  external "54 signals" framing carries the standing footnote).
- **Volume statement (signature record item 1):** −9.7% handoffs vs the
  v4.3 baseline gate at +0.0007 selection quality and ~9× four-fifths
  improvement; documented volume levers exist with priced deltas.
- **Monitoring commitments:** monthly gate-level 4/5 with min-n rule,
  criterion-level attribution, KYC-funnel completion by proxy group,
  tolerant-streak branch counter, volatility payCount watch-register
  item (trigger: weight change or gamed-max >30 → payCount≥3
  in-candidate), PTI-70 remediation tripwire. The LDA search reopens on
  real data by standing design.

---

## 4.4 EXTERNAL REVIEW PACKET + RE-ENGAGEMENT EMAIL (draft)

**Packet contents (all complete):** brief v1.9 (methodology + amendment
audit trail) · Phase 0.5 recalibration memo · Phase 1 findings ·
frontier record with full logs, scripts, seeds, checksums (the 4.2
record) · Phase 3 spec · this memo and model card delta.

**Draft email — Dr. Franklin:**

Subject: PTI fair-lending remediation — fixed-scope review & signature

Doug —

Since we last spoke I took the fair-lending work from diagnosis through
a completed remediation, and I'd like to re-engage you in a deliberately
narrow role: reviewing finished work and signing it, not producing any.

What exists, all documented and reproducible: a decision-gate-level
disparate-impact diagnosis on 50k synthetic profiles (four-fifths 0.034
under v4.3); a driver decomposition; a systematic
less-discriminatory-alternative search across scoring recomposition,
gate re-architecture, and anti-gaming designs, graded under a
six-component acceptance test with sensitivity grids and holdout seeds;
a v5.0 spec that improves the gate-level ratio ~9× while improving
rank correlation with the generator's reliability latent — a relative
grading axis; absolute validation at the MFI backtest, stated in the
packet; and a business-necessity memo whose
lead result is an oracle bound — a computed ceiling on what any accurate
behavior score could achieve on this population — rather than an
argued claim.

As of July 9 the founder signatures are on record — the Row 5b package
as the LDA-search recommended configuration and the readiness-gate text
— so your signature is the single remaining gate before v5.0 enters the
signoff registry. The ask: a fixed-scope review of the packet (est. 4–6
hours), a written opinion on the methodology and the necessity memo —
including whether the stated trade (−9.7% handoff volume for a ~9×
disparate-impact reduction at slightly improved selection quality)
is defensibly framed — and your signature on the external-review line
of the v5.0 signoff record. Any gaps you flag,
I fix and return — the production stays on my side. Happy to discuss a
fee for exactly that scope.

If your availability hasn't changed, I can also take this to a
fair-lending consultant instead — but you know the model's history, and
your name is the one I'd rather have on it.

— Lloyd

---

**Pack status:** 4.1/4.3/4.4 drafted; 4.2 = frontier record (complete).
Signoff status: G-C gate text SIGNED 2026-07-09 · Row 5b package SIGNED
2026-07-09 (tolerances ratified with the package) · documents SIGNED
PENDING CORRECTIONS A–F (this revision applies them) · REMAINING:
external signature [4.4]. Sequencing: `paula_messages` production
schema/seed + approved transition template (Twilio/Meta pipeline, Phase
3 §3.4 steps 3–4) ship before any v5.0 recompute.
