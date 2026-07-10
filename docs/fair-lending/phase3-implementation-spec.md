> **DRAFT — PENDING PACKAGE SIGNOFF AND EXTERNAL REVIEW**
> This document is not final. No scoring, gate, or generator change described here ships until the full signoff-gate package (Phase 3 spec + Phase 4 pack + external review) is signed.

# PHASE 3 — PTI v5.0 IMPLEMENTATION SPEC (DRAFT for signoff gate)

**Basis:** brief v1.9, frontier package Row 5b + G-C · **Date:** 2026-07-09
**Version:** v5.0 (dimension recomposition = major version per the licensee version registry) · **Status:** DRAFT — nothing ships without the 4.4 external signature; generator patch and this spec travel together through the signoff gate.

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

**Gate:** G-C as signed (see frontier record — LLOYD-SIGNOFF pending on
the gate text). Fraud-free and literacy criteria unchanged.

**Event-level data requirements (v5 backlog, replaces two proxies):**
(a) per-biller payment counts → true verified-biller diversity;
(b) cycle-level payment ledger → "≥9 of last 10 due cycles" streak.

## 3.1.1 Score continuity & migration

Current production: 11 users, none near the gate (memo §9). Migration is
a recompute-in-place with a Paula transition message ONLY for users whose
score shifts by >5 points (score-change alert infrastructure already
exists). Template (es-MX, for the message_templates seed — which is
itself the standing top-priority production fix): «Actualizamos cómo se
calcula tu PTI para que refleje mejor tu esfuerzo — lo que pagas y qué
tan constante eres, no cuánto dinero se mueve. Tu número puede cambiar
un poco hoy; tu camino no cambia.» No score is displayed as a "drop"
without this message preceding it.

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

## 3.4 Versioning & rollout

v5.0 enters the licensee version registry with signoff-gate enforcement
(existing infrastructure). Sequence: (1) Lloyd signs G-C gate text; (2)
external signature per 4.4; (3) message_templates production seed ships
FIRST (standing priority — Paula must be able to send the transition
message before any score changes); (4) v5.0 recompute; (5) monitoring
panel live same deploy. Research-scope generator patch merges as dev
tooling in the same PR, per the v1.4 scope decision.
