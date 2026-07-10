# PHASE 3 — PTI v5.0 IMPLEMENTATION SPEC (DRAFT for signoff gate)

> ✅ **EXTERNAL REVIEW SIGNED 2026-07-10 (Dr. D. Franklin) — DOCUMENT ACTIVE.** External review certification filed at `docs/fair-lending/external-review-signature.md`; founder acknowledgment of receipt co-signed 2026-07-10 (Lloyd Wright). Implementation authorized per Phase 3 §3.4 (paula_messages schema/seed and the approved Meta transition template precede any recompute). **Open item:** Exhibit A (the reviewer's full written opinion) is referenced by the certification as incorporated but was not included in the signed upload — see the flagged gap in `external-review-signature.md`. Any repo copy without this watermark is superseded.


**Basis:** brief v1.9, frontier package Row 5b + G-C · **Date:** 2026-07-09
**Version:** v5.0.0-rc1 (dimension recomposition = major version per the licensee version registry) · **Status:** ACTIVE — founder-signed 2026-07-09 (Row 5b package + G-C gate text) and externally signed 2026-07-10 (Dr. Franklin certification + founder acknowledgment of receipt); entered the signoff registry per `program-record.md`. Generator patch and this spec travel together through the signoff gate.

**Package trade profile (signature record item 1 — stated in all downstream materials, no exceptions):** −9.7% handoff volume vs the v4.3 baseline gate (1,093 vs 1,210 at the 15% calibration point), +0.0007 selection quality (mean latent reliability 0.9852 vs 0.9845), ~9× gate four-fifths improvement (0.034 → 0.30 center; four-seed range 0.20–0.30). Documented volume levers exist (Row 2 configuration; G-B/G-D compensatory gates) and reopen the E2 floor audit if chosen.

## 3.1 Scoring specification (published component cap table)

| dim (cap) | component | pts | change vs v4.3 |
|---|---|---|---|
| PR (36) | payment_streak | 16 | RESTRUCTURED: 0 at ≤2 consecutive months; +4/month above; full at 6. (v4.3: graded from 0, cap 13) |
| | payment_day_consistency | 5 | +1 |
| | advance_payment_days | 8 | unchanged (deliberately not amplified — 4.1 residual) |
| | self_initiated_ratio | 7 | +2 |
| BC (22) | wallet_load_rhythm | 4 | +2 (rail-agnostic load regularity — replaces funding_channel_mix's rail-identity scoring) |
| | all other BC components | unchanged | game/paula components deliberately not upweighted (G1) |
| ED (22) | biller_diversity | 11 | RESTRUCTURED + VERIFIED: verified billers = billers with ≥2 payments each; 0 at ≤3 verified; +5.5/verified above; full at 5. Until event-level per-biller counts ship, proxy = min(billerCount, ⌊payCount/2⌋), flagged in the model card |
| | spend_category_mix | 7 | +3 |
| | signup_utilization_speed | 4 | +2 |
| | kyc_verified | 0 | REMOVED from scoring (gate criterion retains full KYC requirement) |
| | device_consistency | 0 | demoted to shadow (v4.3 disposition machinery) |
| CF (20) | payment_amount_volatility | 7 | +4 |
| | load_spend_ratio | 4 | +1 |
| | account_age | 3 | +1 |
| | p2p_network_activity | 3 | unchanged |
| | buffer_retention | 3 | unchanged (not upweighted — finding [4]) |
| | wallet_balance, bancarization_speed, funding_channel_mix | 0 | demoted to shadow |

Shadow demotions reuse `ptiV4_3Disposition.ts` registry semantics: fields
remain computed and logged (shadow), carry zero weight, and are
re-evaluated against real repayment in the MFI backtest.

**Gate:** G-C AS SIGNED 2026-07-09 (signature record item 2); tolerant
branch retained as a monitored real-data instrument, branch counter
from day one; cycle-based re-spec is a future gate change through the
same signoff path. Fraud-free and literacy criteria unchanged.

**Event-level data requirements (v5 backlog, replaces two proxies):**
(a) per-biller payment counts → true verified-biller diversity;
(b) cycle-level payment ledger → "≥9 of last 10 due cycles" streak.

## 3.1.1 Score continuity & migration

Current production: 9 rows / 7 real users per the 2026-07-09 baseline,
none near the gate (memo §9). Migration is a recompute-in-place with a
Paula transition message ONLY for users whose score shifts by >5 points
(score-change alert infrastructure already exists). The message is a
Twilio/Meta PIPELINE ITEM — variable-free per Meta template
constraints, entering as a ROWS[] entry and traveling the full pipeline
in §3.4 step 4; it lives in `paula_messages` (the table whose absence
in production was the sprint's founding bug). Text (es-MX):
«Actualizamos cómo se calcula tu PTI para que refleje mejor tu
esfuerzo — lo que pagas y qué tan constante eres, no cuánto dinero se
mueve. Tu número puede cambiar un poco hoy; tu camino no cambia.» No
score is displayed as a "drop" without this message (or its
consent-gated fallback, §3.4 step 4) preceding it.

## 3.2 ±5/±2 adjustment layer retirement

Per manifest Gap 2: production no-op (all-zero mapping). Retirement =
delete `fairLendingAdjustment.ts` + mapping table; close the
fair_lending_signoff audit trail with a terminal entry referencing this
spec; PRESERVE as a standing regression test: computePTI must never
import colonia/income data. Zero score impact; no user communication
needed.

## 3.3 Monitoring spec (fairness as a standing instrument)

Admin-dashboard panel, monthly cron:
1. Gate-level 4/5 by proxy group (sex name-derived with error rate
   stated, age band, CONAPO marginación tier, indigenous-language
   municipality flag — the 0.2 proxy set). MIN-N RULE: the ratio
   displays only when every group has ≥500 gate-evaluated users AND the
   expected passer count in the smallest group is ≥10; below that, the
   panel shows per-criterion pass rates with Wilson CIs and a
   "insufficient volume for ratio" flag — never a ratio on single-digit
   cells (Appendix A.3 lesson).
2. KYC funnel completion + drop-off stage by proxy group (S2) — live
   from day one; feeds the alternate-document-path / Paula-in-flow-
   assistance / retry-nudge friction program.
3. PTI-70 TRIPWIRE (memo §9): alert on the first real user crossing
   PTI 70; remediation-status check is a blocking review item at that
   moment. v5.0 shipping before that alert fires is the sequencing
   constraint.
4. Criterion-level failure attribution (which criteria fail, by group) —
   the 0.1 instrument, monthly, same min-n rule.
5. Tolerant-streak branch usage counter — G-C's real-data test: if the
   branch admits materially more low-marginación users than synthetic
   predicted (zero), the income-volatility hypothesis is confirmed on
   real data and 2.5 reopens.
6. WATCH REGISTER (signature record item 3) — volatility payCount gate:
   payment_amount_volatility earns its full 7 points at payCount=2
   exactly. TRIGGER: any change to volatility weight OR gamed-max >30 →
   harden the component gate to payCount≥3 IN-CANDIDATE (graded through
   the rig, not patched ad hoc).

## 3.4 Versioning & rollout

v5.0 enters the licensee version registry with signoff-gate enforcement
(existing infrastructure). Sequence:
1. G-C gate text — **SIGNED 2026-07-09** (signature record item 2).
2. External signature per 4.4.
3. `paula_messages` production schema + seed ships FIRST (standing
   priority — the table has never existed in production; Paula's
   outbound pipeline is silently disabled without it).
4. TRANSITION-MESSAGE PIPELINE (Twilio/Meta — APPROVED BEFORE any
   recompute): variable-free transition message added as a ROWS[]
   entry → template generator run → Meta submission → approval
   confirmed → SID sync into `paula_messages`. CONSENT GATE: the
   WhatsApp template goes only to consented users; for non-consented
   users the identical text is delivered as an in-app notice or
   attached to their next inbound conversation — no unsolicited
   outbound.
5. v5.0 recompute; the step-4 message (or fallback) dispatches for any
   score shift >5 pts before the new score is visible anywhere.
6. Monitoring panel live in the same deploy.

Research-scope generator patch merges as dev tooling in the same PR,
per the v1.4 scope decision.
