---
name: PTI derived features live wiring
description: Prompt 2 / Stage 2 derived features are live in buildPTISnapshotFromDb; integration test is the regression gate
---

# PTI derived features — live wiring (Stage 2, July 2026)

- All 11 Prompt-2 derived fields (minBalanceBuffer30d, daysAtZeroPerMonth, drawdownVelocity, loadIntervalEntropy, loadAmountCV, preDueStagingIndex, loadToObligationRatio, sequencingStability, shockPaidFullRate, billShockWalletResponseRate, billShockResponse) are computed LIVE in `buildPTISnapshotFromDb` from full wallet_transactions / bill_payments / user_billers history. Zero weight in scoring (v4.3 isolation guard keeps computePTI byte-identical).
- **Rule:** any new optional PTIDataSnapshot field must ALSO be wired into `buildPTISnapshotFromDb` AND covered by the seeded-DB integration test `ptiSnapshotIntegration.test.ts` (asserts fields differ from DERIVED_FEATURE_DEFAULTS for seeded users). **Why:** the original Prompt 2 work added fields to the type/defaults only — production silently served defaults for months; the closeout audit caught it.
- Fallback semantics: derived-feature computation is try/catch'd; a throw (e.g. unenumerated wallet txn type in TYPE_DIRECTION) falls back to DERIVED_FEATURE_DEFAULTS with a WARN log — loud, not silent.
- `classifyBillShockResponse` (categorical: paid_full_ontime/paid_partial/paid_late/unpaid_30d/null): wider attempt set incl. fallido/solicitud_manual; failed attempt → 30d cure lookforward; <30d uncured = indeterminate → walk back to earlier candidate.
- Bill-shock detection is deliberately TRANSACTED (monto) based, not billed (amount_due_mxn) — amount_due_mxn is never populated in prod; documented in detectBillShockEvents docstring.
- Pre-existing known failures: 7 billpay.test.ts failures, all caused by DAILY_BILL_CAP_MXN accumulating monto across tests sharing a real DB with no reset (assertions fail on unexpected HTTP 429; test 14's TypeError is downstream of the 429). NOT schema drift — the "column biller_name does not exist" errors in the run output are non-fatal missions.ts noise that fails no tests. Same 7 test names verified verbatim across sessions.
- missions.ts distinct_billers bug FIXED July 2026 (biller_name → service_name, standalone commit, regression test in missions.test.ts). Sibling bug still OPEN: wallet_loads branch joins `w.phone` but wallets is keyed by `user_id` — same silent non-fatal swallow, so wallet_loads missions never progress; awaiting separate approval. Lesson: missions.ts swallows ALL errors as non-fatal, so schema mismatches there are invisible except as log noise — check its raw SQL against actual schema when touching gamification.
