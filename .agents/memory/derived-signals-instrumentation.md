---
name: Derived signals instrumentation (PTI, additive-only)
description: Where the 6 new derived-signal candidates live, why one was skipped, and a drizzle gotcha hit while building them
---

Six candidate derived signals for the PTI model were built as pure instrumentation in
`artifacts/api-server/src/services/derivedSignals.ts` — a standalone service, imported by
nothing in the scoring path. `pti.ts` was not touched. Each function is independently
callable (e.g. from an admin route or notebook) to inspect values before any decision is
made about wiring them into scoring.

5 of 6 were implemented: payment rail switching, conditional Paula latency (risk-trigger
subset only), inflow coefficient of variation on wallet loads, KYC staleness, and a
partial-coverage failed-payment signal (backed by a `failed_payment_signal_90d` DB view
created via direct SQL, per the established drizzle-kit-push-is-broken convention).

Biller category diversity was explicitly SKIPPED — `bill_payments.categoria` is 0%
populated because `bill_payments` has 0 rows at all (dev and production) as of
2026-07-05. The intended query is left as a comment in the file for when the table gets
real data.

**Drizzle gotcha:** passing a plain JS array into `sql`...ANY(${arr})`` does NOT bind it
as a single Postgres array parameter — it spreads into `$2, $3, $4` and produces
`op ANY/ALL (array) requires array on right side`. For small fixed/constant sets, just
inline them as a literal `IN (...)` list in the template instead of trying to bind an
array param this way.

**Why this matters:** underlying data is still very sparse in both dev and production as
of 2026-07-05 (e.g. 0 verified-KYC users, 0 recorded payment failures, only 1 user with
wallet-load history) — expect most of these signals to be NaN/0/null for the near
future. Re-check volume before actually wiring any of them into scoring.
