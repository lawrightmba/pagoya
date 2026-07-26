---
name: CFR Archetype Analysis
description: Cash Flow Resilience (35% weight) structural assessment across Sprint 9 synthetic archetypes — findings and verdict.
---

# CFR Archetype Analysis — Sprint 9

## Scope
10 synthetic archetypes + BANKED_EQUIVALENT control. Reference time: 2026-07-26.

## Key Findings

### CFR behavior across archetypes

| Archetype                     | CFR Status          | CFR Score | Assessment |
|-------------------------------|---------------------|-----------|------------|
| CASH_FIRST_CONSISTENT         | COMPUTED            | high      | Strong buffer: currentBalance/totalLoads ≥ 15% |
| NEW_USER                      | COMPUTED            | low-med   | Small balance (50 MXN) → positive but modest signal |
| IMPROVING_USER                | COMPUTED            | medium    | Buffer in recovery; improving trajectory |
| DETERIORATING_USER            | COMPUTED            | low       | currentBalance depleted (80 MXN vs 350 prior); CFR reflects genuine shift |
| MIXED_TRAJECTORY              | COMPUTED            | low-med   | PR stable, CFR deteriorating (30 MXN buffer) |
| HIGH_ENGAGEMENT_WEAK_BEHAVIOR | COMPUTED            | low       | Deficit wallet (totalSpend > totalLoads) → correctly shows low CFR despite high engagement |
| LOW_ENGAGEMENT_STRONG_BEHAVIOR| COMPUTED            | high      | Strong buffer (450/2500 = 18%); low engagement does not suppress CFR |
| WALLET_ONLY                   | COMPUTED            | high      | 600 MXN balance with no bill payments — CFR correctly signals buffer-only users |
| GIG_INCOME                    | COMPUTED            | medium    | Payment behavior drives CFR, not load timing variability (loadAmountCV=0.68 ignored) |
| SPARSE_STALE                  | COMPUTED            | medium    | Moderate buffer (100 MXN / 600 loaded) |

### Critical Invariant Findings

**FAIR-BANK: PASS** — BANKED_EQUIVALENT and CASH_FIRST_CONSISTENT produce identical CFR.
Fields `daysToFirstSpei`, `speiLoadCount`, `oxxoLoadCount`, `cardLoadCount` are confirmed orthogonal to shadow formula.

**GIG-FAIR: PASS** — `loadAmountCV` and `loadIntervalEntropy` do not appear in the shadow CFR computation.
CFR is driven by `currentBalance`, `totalLoads`, `totalSpend`, `amountCV` (payment-side), and `loadCount30`.
Variable load income (high `loadAmountCV`) is not penalized by the shadow formula.

**WALLET_ONLY: PASS** — Users with no bill payments but a positive wallet balance receive CFR COMPUTED.
CFR is not gated on `billerCount` or `payCount`.

**ENGAGE-WEAK: PASS** — HIGH_ENGAGEMENT_WEAK_BEHAVIOR correctly receives low CFR score when
`totalSpend > totalLoads`. Engagement signals (`scratchPlays`, `paulaInteractions`) are orthogonal to CFR.

### Structural Verdict

**CFR weight at 35% is STRUCTURALLY SOUND** across all 10 tested archetypes.

No edge case among the archetypes reveals a structural flaw that would require changing the
aggregation weight. The `DETERIORATING_USER` snap shows CFR sensitivity to buffer depletion —
this is the intended behavior (CFR measures observed cash flow patterns, not risk inference).

## What NOT to Change
Per sprint spec §3.2: if archetype testing reveals a structural flaw, document and stop —
do not change aggregation logic. No flaw was found. Weight remains 35%.

**Why:** The CFR formula correctly separates payment-behavior signals from funding-channel signals.
Loading via OXXO vs SPEI vs card doesn't change CFR. Load timing variance doesn't change CFR.
Engagement depth doesn't change CFR. Only wallet-side signals (balance ratio, spend ratio, amountCV) drive it.

**How to apply:** When adding new snap fields, verify they do not route through CFR unless they
are genuine cash-flow signals (balance, load amounts, spend amounts). Use FAIR-BANK + GIG-FAIR
invariant tests as regression gates.
