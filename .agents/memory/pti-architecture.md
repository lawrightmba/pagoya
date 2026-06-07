---
name: PTI Architecture
description: PagoYa Trust Index scoring system — tables, cron schedule, model versioning, payment_source tagging
---

## Core decisions

**Internal name**: PagoYa Trust Index (PTI). **User-facing name**: PagoScore.
Naming distinction keeps us out of CNBV regulated territory while dataset accumulates.

**Computation frequency**: Nightly batch at 2 AM Mexico City (08:00 UTC) via `ptiCron.ts`.
Event-triggered recalculation deferred to Phase 2+ when a real-time credit product gates on it.

**Model version**: `v1.0-heuristic` — exported as `PTI_MODEL_VERSION` constant in `pagoScore.ts`.
Bump version any time weights or signal definitions change. Old rows retain their version tag for history comparison.

## Tables (all created via direct SQL — drizzle-kit push is broken)

| Table | Purpose |
|---|---|
| `user_events` | Behavioral event log (login, bill_paid, game_played, etc.) |
| `credit_profiles` | Latest PTI score + dimension scores per user |
| `pti_signals` | Per-signal audit trail — one row per signal per computation |
| `user_financial_snapshots` | Nightly baseline snapshot — Phase 2 trend clock starts here |
| `scratch_card_plays` | Raspa y Gana daily game state |

## pti_signals schema
```sql
telefono, signal_name, signal_value (0–1 normalized), signal_meta (jsonb),
model_version (text), computed_at (timestamptz)
```
Signals stored: routine_login_days, routine_login_consistency, routine_biller_diversity,
routine_topup_stability, financial_on_time_rate, financial_income_stability,
financial_recovery_rate, financial_activation_speed, trajectory_digital_ratio,
trajectory_oxxo_migration, trajectory_activity_growth, trajectory_load_frequency,
social_game_engagement, social_referrals, social_streaks

## user_financial_snapshots schema
```sql
telefono, snapshot_date (UNIQUE per user), wallet_balance, biller_count, tx_count_30d,
load_count_30d, digital_load_ratio, points_balance, tier, pti_score
```
Populated nightly by `ptiCron.ts → takeFinancialSnapshot()`. Phase 2 30/60/90-day
trend vectors require this baseline — it must run from day one.

## PTI dimension weights (v1.0-heuristic)
- Longitudinal Trajectory: 30 pts
- Financial Behavior: 25 pts
- Routine & Stability: 25 pts
- Social & Community: 20 pts

**Why heuristic**: no repayment data yet. Replace with empirically-derived weights once
a credit product exists and default rates can be observed.

## payment_source column
Added to `wallet_transactions` via direct SQL. Tagged at insert time:
- OXXO load → `payment_source = 'oxxo'`
- Card load → `payment_source = 'card'`
- SPEI/STP → `payment_source = 'spei'`
- Backfill applied to existing rows via type column estimation.

This powers the OXXO→digital migration signal (single strongest upward-mobility indicator).

## Paula language signal — flagged non-credit
Language formality in Paula interactions has fair lending risk (education/class proxy).
Documented as engagement-only signal, NOT a credit input. Must be stated explicitly
before Accion diligence — they will ask.

## Phase 2 prerequisite
user_financial_snapshots must accumulate 30 days before trend vectors are computable.
Phase 2 clock started: June 7, 2026.

## Phase 3 prerequisite
All P2P social graph signals require STP P2P transfers to be live. STP contract is
the single highest-leverage infrastructure item for the credit model, not just product.
