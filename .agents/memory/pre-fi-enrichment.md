---
name: Pre-FI B2B enrichment sprint
description: All tables, columns, services, and API endpoints added in the pre-Founders Institute data enrichment sprint.
---

## What shipped

### Schema additions (all via raw SQL — drizzle-kit push broken)
- `bill_payments`: 3 new columns — `amount_due_mxn` (numeric), `days_from_due` (integer), `channel` (varchar)
- `expected_payments`: new table — telefono, service_name, expected_date, status, bill_payment_id, missed_at, cured_at
- `paula_response_metrics`: new table — telefono, trigger_id, trigger_type, sent_at, responded_at, response_bucket, response_latency_h
- `credit_profiles`: 8 new columns — biller_count_slope_90d, biller_count_slope_n, payment_amount_cv, payment_amount_cv_n, priority_rank_json, priority_rank_n, partial_payment_count, enrichment_computed_at
- Also added to Drizzle schema: `lib/db/src/schema/bill_payments.ts` (amountDueMxn, daysFromDue, channel)

### Constants (single source of truth)
- `lib/db/src/constants.ts`: MISSED_THRESHOLD_DAYS=5, MIN_N_PAYMENT_CV=8, MIN_N_BILLER_SLOPE=3, MIN_N_PRIORITY_RANK=3

### Services
- `artifacts/api-server/src/services/enrichmentCron.ts`: all enrichment jobs
  - Nightly 02:30 MX: `runNightlyEnrichment()` — status updates + Paula linking + signals E-H
  - Monthly 1st 04:00 MX: `seedExpectedPaymentsForCycle()` — seeds expected_payments from user_billers
  - Registered in `index.ts` via `startEnrichmentCrons()`

### Data capture at payment time (billpay.ts)
- `channel` set at INSERT: `wallet_balance` or `card_direct`
- `days_from_due` set via fire-and-forget UPDATE post-transaction, joining user_billers → user_profiles

### B2B API (b2b.ts)
- New: `GET /api/b2b/profile/:hashed_id` — consent-gated per-user enriched profile
- Gate: readiness_assessments.gate_status='READY' AND paula_pending_handoffs.status='consented'
- Returns: PTI + trajectory + income + payment_reliability + elasticity + channel_profile + biller_mix + priority_rank + paula_engagement + data_completeness + data_reliability

### Admin trigger
- `POST /api/admin/run-enrichment` (with x-admin-token header): runs nightly enrichment immediately
- Optional body `{ seed: true }` also runs the monthly expected_payments seed

## Key architectural decisions

**Why:** `user_billers` uses `profile_id` FK to `user_profiles` — NOT telefono directly. Always join: `user_billers ub JOIN user_profiles up ON up.id = ub.profile_id WHERE up.phone = telefono`.

**Why:** `paula_inbound_log` column is `received_at` (not `created_at`).

**Why:** Consent gate for `/api/b2b/profile` uses PostgreSQL `encode(sha256((u.telefono || 'pagoya2026')::bytea), 'hex')` to resolve hashed_id → user server-side without ever returning telefono to the partner.

**Why:** Statistical fields return NULL below minimum-N floors (not 0 or a misleading number). Use `data_reliability` object (not `data_completeness`) to tell buyers whether a field is trustworthy.

**Why:** `partial_payment_count` is NULL (not 0) when `amount_due_mxn` is NULL for all of a user's rows — signals missing data, not no partials.
