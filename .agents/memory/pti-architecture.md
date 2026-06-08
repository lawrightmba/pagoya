---
name: PTI Architecture
description: PagoYa Trust Index — dual-model system, DB schema gotchas, cron schedule, frontend widget location
---

## Two separate models

| Model | File | Storage | Schedule | Purpose |
|---|---|---|---|---|
| PagoScore | `api-server/src/services/pagoScore.ts` | `credit_profiles.pago_score` | Nightly 2AM MX | Milestone rewards, Paula AI context, sophisticated 4-dim model |
| PTI Widget | `api-server/src/services/pti.ts` | `users.pti_score + pti_breakdown + pti_computed_at + pti_first_computed_at` | Monthly 1st 3AM MX | User-facing score card, 7-component breakdown |

Both registered in `ptiCron.ts → startPtiCron()` called from `app.ts`.

## DB schema gotchas (critical — cost debugging time)

- `bill_payments`: biller column is `service_id` (NOT `empresa`). Status values: `completed`, `success`, `completed_ok`.
- `wallet_transactions`: NO `telefono` column. Uses `wallet_id` (UUID) → joins to `wallets.id`. Use `wallets.balance_mxn` directly for balance. Use subquery join for load sums.
- `wallets.user_id` = telefono (text, format varies: `3221000001` or `+5213221000001`).
- `user_mission_progress` (NOT `user_missions`): columns `telefono`, `mission_id`, `completed_at`, `rewarded_at`.

## 7-component formula (pti.ts)

| Component | Max | Data source |
|---|---|---|
| payment_streak | 25 | `users.consecutive_payment_months` (1pt/month) |
| biller_diversity | 15 | `COUNT(DISTINCT service_id) FROM bill_payments` (5pts each) |
| kyc_verified | 15 | `users.kyc_submitted_at IS NOT NULL` |
| wallet_balance | 15 | `wallets.balance_mxn` WHERE `user_id = telefono` |
| mission_completions | 15 | `COUNT(*) FROM user_mission_progress WHERE completed_at IS NOT NULL` (3pts each) |
| load_spend_ratio | 10 | loads via wallet_transactions→wallets join; spend via `bill_payments.monto` |
| account_age | 5 | `EXTRACT(EPOCH FROM NOW()-users.created_at)/86400` |

## API endpoints

- `GET /api/pti/score?telefono=xxx` — returns stored score or `{is_new_user: true}` if null
- `POST /api/pti/compute-now` — telefono in body; self-service (no admin token required)

## Frontend

- `PTIScoreCard` → `artifacts/pagoya/src/components/PTIScoreCard.tsx` — props: `telefono`, `refreshKey`
- `PTIIntroModal` → `artifacts/pagoya/src/components/PTIIntroModal.tsx` — full-screen, position:fixed, localStorage guard `pagoya_pti_intro_seen`
- Both inserted in `Home.tsx`. Card below WalletBalanceWidget. Modal at top of return before `<Helmet>`.
- `refreshKey` increments on intro modal dismiss → forces score re-fetch.

## WhatsApp notification

In `computePTIForAllUsers()` (monthly batch only — NOT on compute-now). Only fires for users with ≥1 completed bill_payment. Message includes score/tier, biggest achievement, improvement tip.

## Original pagoScore / credit_profiles model (kept intact)

- Internal name: PagoYa Trust Index. User-facing name: PagoScore.
- Model version `v1.0-heuristic` in `PTI_MODEL_VERSION` constant.
- 4 dimensions: Trajectory 30pts, Financial 25pts, Routine 25pts, Social 20pts.
- Milestone rewards at 30/50/70/85 pts (WhatsApp + loyalty points/MXN credits).
- Paula AI reads `credit_profiles.pago_score` for tone adaptation.
- Phase 2 prerequisite: `user_financial_snapshots` accumulates 30 days of baselines (started June 2026).
