---
name: B2B Alternative Data API
description: B2B PTI export endpoints, anonymization views, key provisioning, and audit log infrastructure
---

## Routes
All under `/api/b2b/` — registered in `routes/index.ts`.
File: `artifacts/api-server/src/routes/b2b.ts`

| Endpoint | Method | Auth | Purpose |
|---|---|---|---|
| `/api/b2b/cohort` | GET | x-api-key | k-anon cohort stats (n≥5 only) |
| `/api/b2b/user/:hash` | GET | x-api-key | single user PTI by hashed_user_id |
| `/api/b2b/batch` | POST | x-api-key | bulk lookup, max 500 IDs |
| `/api/b2b/audit` | GET | x-api-key | partner's own audit log (90 days) |
| `/api/b2b/admin/provision-key` | POST | x-admin-secret | create a new partner key |

## DB tables / views

| Object | Type | Purpose |
|---|---|---|
| `pti_export_safe` | VIEW | per-user anon: hashed_user_id, colonia, pti dims. NO telefono |
| `pti_cohort_safe` | VIEW | HAVING COUNT(*) >= 5 — k-anonymity enforced aggregate |
| `b2b_api_keys` | TABLE | partner registry — stores SHA-256 hash of key, never raw key |
| `b2b_audit_log` | TABLE | full data lineage: partner, endpoint, hashed_user_ids[], response_ms |

## Anonymization

- `hashed_user_id` = SHA-256(telefono + 'pagoya2026') — consistent across both views; pgcrypto extension enabled
- Cohorts below 5 users suppressed entirely (k-anonymity)
- Score band = FLOOR(pti_score/10)*10 (10-point buckets)
- telefono is NEVER returned in any B2B response

## Key lifecycle

- `POST /api/b2b/admin/provision-key` requires `x-admin-secret: $ADMIN_SECRET` env var
- Returns raw key once only; only `api_key_hash` stored
- Key revocation: `UPDATE b2b_api_keys SET is_active = false WHERE partner_name = '...'`

## PII audit result (June 2026)

`telefono` in PushPayload flow: server push → browser OS notification store → sw.js notificationclick → `/api/events` (our DB only).
- sw.js: no PostHog/analytics, completely isolated execution context
- App.tsx: gtag tracks page_path only — never sees push payload
- `/api/events`: DB INSERT only, no outbound calls
- **Verdict: CLEARED — no telefono ever reaches a third-party analytics endpoint**
