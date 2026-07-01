---
name: PTI branding + fields 72-88
description: Predictive Trust Index rename rules, fields 72-88 schema/compute architecture, and ptiCron timeout fix.
---

## Branding rule
- User-facing name: **Predictive Trust Index (PTI)** — updated in all UI strings, comments, video scenes, pitch materials
- Schema names unchanged: `pti_score`, `pti_*` columns, `pti_export_safe` view, `ptiCron.ts`, etc.
- Abbreviation "PTI" still valid — works for both old and new full name

**Why:** PTI needs to be licensable/partner-facing IP independent of PagoYa brand. Schema rename would break B2B API contracts.

## Fields 72-88 — where they live

| Fields | Table | Status |
|---|---|---|
| 72–75 remittance signals | `credit_profiles` (computed from `wallet_transactions.load_source_type = 'remittance'`) | Computed nightly; NULL until remittance txns exist |
| 76 cross_platform_consistency_score | `users` column | Schema-only, NULL; activates when PagoSeguro user-matching is live |
| 77–80 loan outcome feedback | `loan_outcomes` table | Ingested via POST /api/b2b/loan-outcomes; `calibration_delta` auto-computed |
| 81 colonia_cluster_risk_score | `credit_profiles` | k-anon: cohort N≥5 required, else NULL |
| 82 referral_network_risk_correlation | `credit_profiles` | **INTERNAL ONLY** — never expose via B2B API, pti_export_safe, or any partner endpoint |
| 83–85 paula sentiment | `credit_profiles` | Keyword-based, N≥3 messages required |
| 86 address_tenure_days | derived from `users.address_registered_at` | Self-reported capture needed first |
| 87 employment_type | `users` column | Self-reported: formal / informal / gig / unemployed |
| 88 employment_stability_score | `credit_profiles` | Derived from employment_type + address_registered_at tenure |

## New columns added to existing tables
- `wallet_transactions.load_source_type TEXT` — tag remittance inflows
- `users.address_registered_at TIMESTAMPTZ` — for address tenure
- `users.employment_type TEXT`
- `users.cross_platform_consistency_score NUMERIC(5,2)` — deferred

## New tables
- `loan_outcomes` — partner-reported; telefono_hashed (not raw), outcome status, calibration_delta

## ptiCron.ts setTimeout overflow fix
Node.js setTimeout uses a 32-bit signed int. Max safe = 2^31-1 ms ≈ 24.8 days.
Monthly PTI batch scheduled for 1st of month — delay often > 24.8 days → overflow → infinite loop → OOM crash.

**Fix:** `safeSetTimeout(fn, ms)` in ptiCron.ts — recursively chunks any delay > MAX_SAFE_TIMEOUT_MS.
`msUntilNext()` now has a `Math.max(1000, ...)` floor to prevent accidental 0ms scheduling.
Log now shows `nextRunAt` ISO string instead of raw `nextInMs` number.

**How to apply:** Any future scheduled job with a delay potentially > 24 days must use `safeSetTimeout`, not `setTimeout` directly.
