---
name: enrichmentCron.ts schema bugs
description: Bugs found and fixed in enrichmentCron.ts during July 2026 smoke test; real column mismatches vs what the code assumed.
---

# enrichmentCron.ts — Schema Mismatch Bugs (found July 2026 smoke test)

## Rule
When editing enrichmentCron.ts sub-functions, always verify actual column names against the live DB before deploying. All 6 bugs below were silent at startup and only surfaced when `computeEnrichmentForUser` ran.

**Why:** The cron was built against a spec that drifted from the real schema. The inner `try/catch` swallows all errors and returns `ok:true` regardless, so these were invisible until forced by smoke test.

**How to apply:** If you add a new sub-function, run `executeSql(SELECT column_name FROM information_schema.columns WHERE table_name = '...')` against every table you query before committing.

---

## Bugs Fixed

### 1. `ANY(${PAID_STATUSES}::text[])` — Drizzle parameterization (5 locations)
- **What broke:** Drizzle treats `${array}` as a tuple `($1,$2,...)` not a postgres array, making `= ANY(...)` parse as `= ANY(($1,$2,...))` which Postgres rejects.
- **Fix:** Replace all 5 with a literal `IN ('completed', 'success', 'completed_ok', 'confirmed')`.
- **Locations:** enrichmentCron.ts lines ~76, ~102, ~107, ~141, ~648 (search `PAID_STATUSES` to find them).

### 2. `wallets JOIN users ON u.id = w.user_id` — type mismatch
- **What broke:** `wallets.user_id` stores telefono (text), not `users.id` (integer). JOIN throws `operator does not exist: integer = text`.
- **Fix:** `ON u.telefono = w.user_id`.
- **Location:** `computeRemittanceSignals`, wallet lookup query.

### 3. `SELECT ref_code FROM users` — column doesn't exist
- **What broke:** Column is named `referral_code` (user's own code) and `signup_ref_code` (code used at signup = who referred them).
- **Fix:** `ref_code` → `referral_code`; `u.referred_by` → `u.signup_ref_code`.
- **Location:** `computeReferralNetworkRisk`.

### 4. `SELECT body FROM paula_inbound_log` — column doesn't exist
- **What broke:** Column is named `message_body`, not `body`.
- **Fix:** `body` → `message_body` in SELECT and in the JS `m.body` → `m.message_body`.
- **Location:** `computePaulaSentiment`, lines ~355 and ~378.

---

## Actual field values for 6-transaction test case (seed: 5 manual + 1 STP webhook, all keyword_matched)
- **field_72** (regularity): 38 — JS uses population stddev (N denominator); Postgres STDDEV is sample (N-1); they differ
- **field_73** (avg_amount_mxn): 3600.00
- **field_74** (source_consistency): 83
- **field_75** (dominant_country): "US" (Remitly → US bucket)

---

## wallets.user_id convention
`wallets.user_id` is a TEXT column containing the telefono, NOT a FK to `users.id` (integer). Any JOIN between wallets and users must use `u.telefono = w.user_id`, never `u.id = w.user_id`.
