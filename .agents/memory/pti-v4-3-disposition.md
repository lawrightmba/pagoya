---
name: PTI v4.3 weight allocation decision
description: Formal disposition of the 15 Stage-1/2 derived fields — zero weight in v4.3, split into permanent-non-scoring vs provisional-pending-backtest.
---

# PTI v4.3 weight allocation decision (Prompt 4)

- Release decision, not a placeholder: all 15 fields ship at ZERO scoring weight in v4.3. Dimension totals unchanged from v4.2 (PR30/BC20/ED25/CF25 in code). v4.3 is scoring-identical to v4.2 by construction, proven by the existing byte-identical regression guard in pti.test.ts.
- Full per-field disposition + rationale text + the fair-lending signoff paragraph live as data (not just prose) in `src/config/ptiV4_3Disposition.ts` (`PTI_V4_3_FIELD_DISPOSITION`, `PTI_V4_3_FAIR_LENDING_SIGNOFF`, `PTI_V4_3_BACKTEST_PRIORITY_FIELDS`) — read that file rather than re-deriving dispositions from the ablation study.
- 5 fields are **permanent_non_scoring** (structural: redundant with an already-scored field, or proxy-load with negative/negligible lift — does not depend on future data volume): minBalanceBuffer30d, activityVelocity30d, daysAtZeroPerMonth, billShockWalletResponseRate, loadAmountCV.
- 10 fields are **provisional_zero_weight** (pending the MFI backtest, not pending more synthetic study): paymentTimingMeanDaysFromDue, paymentTimingVarianceDaysFromDue, interEventRegularityScore, preDueStagingIndex, loadToObligationRatio, drawdownVelocity, loadIntervalEntropy, sequencingStability, shockPaidFullRate, billShockResponse.
- Backtest-priority subset (best synthetic profile + least real coverage — the exact combo the backtest is meant to resolve): preDueStagingIndex, loadToObligationRatio (discount heavily — weak synthesis prior), drawdownVelocity.
- `PTI_MODEL_VERSION` bumped from `v4.2-behavioral` → `v4.3-signal-expansion` to reflect the shipped fields; no test pins the old literal string, and the bump doesn't affect the byte-identical guard since both sides of that comparison share the same constant.
- Do NOT confuse this signoff with `config/fairLendingMapping.ts`'s colonia/income point-value mapping — that's a separate, still-genuinely-pending bias-testing signoff and must not be touched by this decision.
