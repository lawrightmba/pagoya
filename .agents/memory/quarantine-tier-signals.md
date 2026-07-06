---
name: Quarantine-tier derived signals
description: Prompt 3 quarantined signals in derivedSignals.ts — pitfalls found while building them
---

# Quarantine tier (derivedSignals.ts)

Three quarantined signals live ONLY in derivedSignals.ts: quincenaAlignmentIndex, loadChannelFormalityMix, sessionTimeOfDayConcentration (+lateNightSessionFraction). Computed/logged/exported, never scored. Source-scan regex guards in pti.test.ts + licenseeApi.test.ts forbid the four field names (camel+snake via `/quincena.?alignment.?index/i` style) in pti.ts and licenseeApi.ts (service + route).

Export corpus keyed on HMAC-SHA256(telefono, TELEFONO_HASH_SECRET); raw telefono never in rows/CSV; NaN → empty CSV cell.

## Durable pitfalls
- **`LIKE 'load_%'` silently excludes SPEI loads.** The SPEI inflow type is `spei_in`, not `load_spei`. Any query meaning "all wallet loads" must enumerate `('load_oxxo','spei_in','load_card')`. (Pre-existing derivedSignals functions using LIKE 'load_%' + payment_source IS NOT NULL are intentionally different semantics — left alone.)
- **Why:** caught when quincena counted 3/4 seeded events; the spei_in row was invisible to the LIKE pattern.
- **Global vitest setup wipes tables after EVERY test.** `src/billpay/tests/setup.ts` afterEach deletes ALL rows of wallet_transactions/wallets/bill_payments/users/rep_commissions/bill_payment_audit/taecel_product_cache. Seeded integration tests in api-server must seed in `beforeEach` (not beforeAll) if they have >1 `it`, or keep one `it` per describe (missions.test.ts pattern). `user_events` is NOT wiped — clean it manually.
- **Vitest console.log is suppressed by default** — use `--silent=false --disableConsoleIntercept` to see test-emitted output (needed for verbatim corpus evidence).
- **Timezone hops:** wallet_transactions/user_events created_at are timestamptz (one `AT TIME ZONE 'America/Mexico_City'` hop → local); bill_payments.created_at is naive UTC (two hops: `AT TIME ZONE 'UTC' AT TIME ZONE ...`). Seeding at 18:00 UTC = 12:00 MX keeps UTC and MX calendar dates equal for deterministic day-of-month tests.
- **Quincena window:** d BETWEEN 13 AND 17 OR d >= days_in_month-2 OR d <= 2 (the d<=2 term is month-end +2d spillover into the next month).
- sessionTimeOfDayConcentration is spec-literally the NORMALIZED ENTROPY (H/ln 24) despite the "concentration" name — do not invert.
