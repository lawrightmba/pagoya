---
name: PTI Architecture
description: PagoYa Trust Index — dual-model system, DB schema gotchas, cron schedule, frontend widget location
---

## Two separate models

| Model | File | Storage | Schedule | Purpose |
|---|---|---|---|---|
| PagoScore | `api-server/src/services/pagoScore.ts` | `credit_profiles.pago_score` | Nightly 2AM MX | B2B credit profile, Paula AI context, 4-dim (trajectory/financial/routine/social) |
| PTI Widget | `api-server/src/services/pti.ts` | `users.pti_score + pti_breakdown (jsonb)` | Monthly 1st 3AM MX | User-facing scorecard, **v2.0-4dim** (upgraded June 2026) |

Both registered in `ptiCron.ts → startPtiCron()` called from `app.ts`.

## DB schema gotchas (critical — cost debugging time)

- `bill_payments`: biller column is `service_id` AND `empresa`. Status values: `completed`, `success`, `completed_ok`, `confirmed`.
- `wallet_transactions`: NO `telefono` column. Uses `wallet_id` (UUID) → joins to `wallets.id`. Use `wallets.balance_mxn` directly for balance. Use subquery join for load sums.
- `wallets.user_id` = telefono (text, format varies: `3221000001` or `+5213221000001`).
- `user_mission_progress` (NOT `user_missions`): columns `telefono`, `mission_id`, `completed_at`, `rewarded_at`.
- `pti_behavioral_signals` table: per-computation audit trail + B2B export (created June 2026).

## PTI v2.0-4dim formula (pti.ts — current)

| Dimension | Max | Components |
|---|---|---|
| Payment Reliability (PR) | 30 | payment_streak(20) + payment_day_consistency(10) |
| Behavioral Consistency (BC) | 20 | session_cadence(8) + game_engagement(7) + wallet_load_rhythm(5) |
| Engagement Depth (ED) | 25 | biller_diversity(10) + kyc_verified(10) + spend_category_mix(5) |
| Cash-Flow Stability (CF) | 25 | wallet_balance(12) + load_spend_ratio(8) + account_age(5) |

- `payment_day_consistency`: STDDEV of bill_payment day-of-month over 6 months (≤2 → 10pts, ≤5 → 7pts, ≤8 → 4pts, ≤12 → 2pts); needs ≥3 payments.
- `session_cadence`: COUNT(DISTINCT DATE) from user_events WHERE event_type='login' LAST 30 days.
- `game_engagement`: scratch_card_plays + spin_results + missions_done×2 (last 30d).
- `wallet_load_rhythm`: STDDEV of load transaction dates over 90 days.
- `spend_category_mix`: utility ratio from empresa ILIKE CFE/agua/gas pattern; +2pts if pago_seguro_click ≥1.
- `pago_seguro_click`: tracked via POST /api/events; logged in BillPaySelector when renta_pagoseguro is tapped.
- **Backward compat**: legacy flat fields still written to breakdown JSONB (payment_streak, biller_diversity, etc.) for old DB rows.
- **PTIScoreCard.tsx**: shows 4-dimension DimCard bars when `is4Dim=true`, falls back to legacy list otherwise.

## Legacy 7-component formula (v1 — still in DB for existing users until monthly recompute)

payment_streak(25) + biller_diversity(15) + kyc_verified(15) + wallet_balance(15) + mission_completions(15) + load_spend_ratio(10) + account_age(5)

## API endpoints

- `GET /api/pti/score?telefono=xxx` — returns stored score or `{is_new_user: true}` if null
- `POST /api/pti/compute-now` — telefono in body; self-service (no admin token required)
- `POST /api/events` — ALLOWED_EVENTS includes `pago_seguro_click`, `rent_payment_initiated`

## Frontend

- `PTIScoreCard` → `artifacts/pagoya/src/components/PTIScoreCard.tsx` — props: `telefono`, `refreshKey`, `lang`, `pendingCompute`
- `PTIIntroModal` → `artifacts/pagoya/src/components/PTIIntroModal.tsx` — full-screen, localStorage guard `pagoya_pti_intro_seen`
- Both inserted in `Home.tsx`. Card below WalletBalanceWidget. Modal at top of return before `<Helmet>`.
- `refreshKey` increments on intro modal dismiss → forces score re-fetch.
- Scorecard has SVG circular progress ring + 4 animated DimCard fill bars (staggered: ring starts at t=0, bars at t=300ms).

## WhatsApp notification

In `computePTIForAllUsers()` (monthly batch only — NOT on compute-now). Only fires for users with ≥1 completed bill_payment. Message includes score/tier and lowest-dimension improvement tip.
