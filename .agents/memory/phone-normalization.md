---
name: Phone number normalization — HIGH PRIORITY
description: Registration flow creates silent duplicate rows for same number in different formats (e.g. 3222304213 vs +523222304213). Immediate action and systemic fix required.
---

# Phone Number Normalization — HIGH PRIORITY

## Immediate action (next session)
Merge/tombstone **user id 18** (`3222304213`) into canonical row `+523222304213` before any transaction occurs on the local-format row.

Steps:
1. Confirm id 18 has no wallet balance, bill_payments, or device_log rows to migrate.
2. Mark id 18 `is_test_account = true` + set `source_note = 'tombstoned: duplicate of +523222304213 (id N)'`.
3. Or add a proper `is_tombstoned` column and UPDATE.
4. If adding an admin route to do this: gate with `x-admin-key` + explicit confirm body; use the 9-step prod-admin-route-pattern.

## Systemic fix
Normalize `telefono` to E.164 at registration (and as a login backstop):
- Strip non-digits → 10 digits → prepend `+52`
- 12 digits starting with `52` → prepend `+`
- Already E.164 → pass through
- Add UNIQUE constraint or lookup-before-insert guard on normalized form

## Why it matters
A user transacting under the local-format row accumulates payments, PTI history, wallet balance on a shadow row invisible to the +52 row. Fair-lending scoring, Paula triggers, and B2B export diverge silently.

## Current prod state
- `3222304213` (id 18): created 2026-07-13 00:10 UTC, web_organic, no transactions, PTI = 0, no wallet activity as of Phase E recompute.
- `+523222304213`: canonical row, PTI history present (v4.3 score = 11), transition message queued.

**Why:** One confirmed prod occurrence (Phase E evidence review 2026-07-13). Risk scales with user base.
