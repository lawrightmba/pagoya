---
name: PTI Architecture
description: PagoYa Trust Index — dual-model system, DB schema gotchas, cron schedule, frontend widget location
---

## Two separate models

| Model | File | Storage | Schedule | Purpose |
|---|---|---|---|---|
| PagoScore | `api-server/src/services/pagoScore.ts` | `credit_profiles.pago_score` | Nightly 2AM MX | B2B credit profile, Paula AI context, 4-dim (trajectory/financial/routine/social) |
| PTI Widget | `api-server/src/services/pti.ts` | `users.pti_score + pti_breakdown (jsonb)` | Monthly 1st 3AM MX | User-facing scorecard, **v4.1-behavioral** (Sprint 2, July 2026) |

Both registered in `ptiCron.ts → startPtiCron()` called from `app.ts`.

## DB schema gotchas (critical)

- `bill_payments`: has both `service_id` and `empresa`. Status values: `completed`, `success`, `completed_ok`, `confirmed`.
- `wallet_transactions`: NO `telefono` column. Uses `wallet_id` (UUID) → join to `wallets.id`. `wallets.user_id` = telefono.
- P2P transfers stored as `type='transfer_send'` (sender) / `type='transfer_receive'` (receiver) in `wallet_transactions`.
- `user_mission_progress` (NOT `user_missions`): columns `telefono`, `mission_id`, `completed_at`, `rewarded_at`.
- `pti_behavioral_signals` table: per-computation audit trail + B2B export + model training dataset. Has `computed_at` indexed for time-series queries.

## PTI v4.1-behavioral formula (pti.ts — current)

| Dimension | Max | Components |
|---|---|---|
| Payment Reliability (PR) | 30 | payment_streak(20) + payment_day_consistency(10) |
| Behavioral Consistency (BC) | 20 | session_cadence(5) + game_engagement(5) + wallet_load_rhythm(3) + paula_interaction_depth(4) + push_engagement(3) |
| Engagement Depth (ED) | 25 | biller_diversity(8) + kyc_verified(10) + spend_category_mix(4) + signup_utilization_speed(3) |
| Cash-Flow Stability (CF) | 25 | wallet_balance(8) + load_spend_ratio(4) + payment_amount_volatility(3) + p2p_network_activity(3) + account_age(2) + **bancarization_speed(3)** + **funding_channel_mix(2)** |

### Sprint 2 additions (bancarization_speed, funding_channel_mix)
- `bancarization_speed`: days from `users.created_at` to `users.first_spei_load_at` (≤7d→3, ≤30d→2, ≤90d→1, never/NaN→0). Rewards fast graduation from cash (OXXO) to bank-rail (SPEI) funding.
- `funding_channel_mix`: ratio of (spei_load_count + card_load_count) / total loads (≥0.75→2, ≥0.40→1, else 0, gated to 0 if zero loads). Rewards bank-based over cash-based funding mix.
- CF dimension rebalanced to make room (wallet_balance 10→8, load_spend_ratio 7→4, account_age 5→2 collapsed to 2 tiers ≥30d/≥90d, payment_amount_volatility carved out as its own 3pt sub-component from what was previously folded into load_spend_ratio).
- **colonia and declared_income_bucket are explicitly excluded from PTI scoring** (fair-lending risk) — available only for B2B export views, never as scoring inputs.

### Signal sources
- `payment_day_consistency`: STDDEV of bill_payment DOM over 6 months (≤2→10, ≤5→7, ≤8→4, ≤12→2); needs ≥3 payments
- `session_cadence`: COUNT(DISTINCT DATE) from `user_events` WHERE event_type='login' last 30d
- `game_engagement`: scratch_card_plays + spin_results + missions_done×2 last 30d
- `wallet_load_rhythm`: STDDEV of wallet_transactions confirmed load dates over 90d
- `paula_interaction_depth`: COUNT user_events WHERE event_type='paula_interaction' last 30d + 2FA bonus
- `push_notification_engagement`: COUNT user_events WHERE event_type='push_opened' last 30d
- `biller_diversity`: COUNT(DISTINCT service_id) from bill_payments
- `kyc_verified`: kyc_submitted_at IS NOT NULL; full tier = 10pts, simplified = 7pts
- `spend_category_mix`: utility ratio from empresa ILIKE CFE/agua/gas; +1pt if pago_seguro_click or high_value_intent_click exists
- `signup_utilization_speed`: hours from users.created_at to first bill_payment (<6h=3, <24h=2, <72h=1)
- `wallet_balance`: current balance_mxn from wallets
- `load_spend_ratio`: total loads / total spend last 90d
- `p2p_network_activity`: COUNT(transfer_send) + DISTINCT recipients from description field last 90d
- `account_age`: days since users.created_at

### Legacy flat fields
Still written to breakdown JSONB for backward compat; PTIScoreCard reads `is4Dim` flag.

## Event types logged (user_events table) — with source

| event_type | Logged from | Used in |
|---|---|---|
| login | pagoya frontend | session_cadence (BC) |
| push_opened | sw.js notificationclick | push_engagement (BC); requires `telefono` in push payload data |
| paula_interaction | whatsapp-agent.ts (every reply) | paula_depth (BC); has `query_type` metadata |
| paula_2fa_confirmed | whatsapp-agent.ts (payment SÍ) | paula_depth 2FA bonus (BC) |
| paula_2fa_declined | whatsapp-agent.ts (payment NO) | paula_depth 2FA bonus (BC) |
| p2p_sent | p2p.ts (after transfer_send) | p2p_network_activity (CF) |
| pago_seguro_click | BillPaySelector.tsx crossSell | spend_category_mix intent (ED) |
| high_value_intent_click | BillPaySelector.tsx Gas/Renta/Seguro/Predial | spend_category_mix intent (ED) |

## API endpoints

- `GET /api/pti/score?telefono=xxx` — stored score or `{is_new_user: true}` if null
- `POST /api/pti/compute-now` — telefono in body; no admin token required

## Frontend

- `PTIScoreCard` → `artifacts/pagoya/src/components/PTIScoreCard.tsx` — 4 animated DimCard bars; SVG ring
- `PTIIntroModal` → `artifacts/pagoya/src/components/PTIIntroModal.tsx` — localStorage guard `pagoya_pti_intro_seen`
- Both in `Home.tsx`; `refreshKey` increments on intro dismiss → forces score re-fetch

## Compliance

- `AvisoPrivacidad.tsx`: added "Conductuales" row in data table + PTI in Finalidades primarias (Ley Fintech 2018 reference)
- `Register.tsx`: consent text now explicitly covers WhatsApp messages AND behavioral scoring for Trust Index
- Push notifications: `PushPayload.telefono?` field added → sw.js reads it for push_opened event tracking

## WhatsApp notification (monthly batch only)
Fires for users with ≥1 completed payment. Lowest-dimension improvement tip sent.

## Sprint 2b — isolated fair-lending adjustment layer (July 2026)

`fairLendingAdjustment.ts` is a **separate module from pti.ts**, applied strictly post-hoc. `computePTI()`'s 100pt score never sees colonia/declared_income_bucket — enforced by a source-scan regression test in `pti.test.ts` that fails the build if those field names ever appear in `pti.ts`.

- Adjustment is capped `[-5, +5]`, added on top of the 100pt PTI score via `computeFinalPTI()`, never inside `computePTI()`.
- Hard-gated by a real signoff row in `fair_lending_signoff` (prod DB) matching the current `FAIR_LENDING_MAPPING_VERSION` hash — `resolveAdjustmentFlagState()` won't enable without it, even if `ENABLE_GEO_INCOME_ADJUSTMENT=true`.
- `ALLOW_UNSIGNED_ADJUSTMENT_IN_STAGING` bypass only works when `NODE_ENV !== "production"` — hard-locked off in prod regardless of the env var value (logs an error if misconfigured).
- Every call to `computeFinalPTI()` writes an audit row to `pti_fairlending_adjustment_log` (gate_passed, reason, mapping_version always populated, even when not applied).
- `FAIR_LENDING_MAPPING` in `config/fairLendingMapping.ts` is currently all-zero placeholders pending an actual bias-testing study — do not populate real point values without a corresponding signoff row and bias-test report.
