---
name: Lending partner data enrichment
description: Device fingerprint + payment method trajectory + income + colonia signals for B2B PTI handoff packet
---

## Architecture

### Schema (all live as of June 2026)
- 16 new columns on `users`: 7 device (device_os, device_os_version, device_model, device_type, device_access_mode, device_first_seen_at, device_updated_at) + 7 load method (first/last_load_method, oxxo/spei/card_load_count, first_spei_load_at, load_method_updated_at) + colonia + declared_income_bucket
- `user_device_log` table — device change history (change_reason: 'initial' | 'update')
- `pti_export_safe` VIEW — anonymized export (no device_model, no exact dates). Created with CREATE VIEW, did NOT exist before.
- `paula_pending_handoffs.handoff_data JSONB` — full enrichment packet stamped at READY trigger fire

### Key quirks
- `wallet_transactions.type` for SPEI is `spei_in` (NOT `load_spei`). All counter wiring uses `spei_in`.
- `wallets.user_id` stores telefono as TEXT in inconsistent formats (+52..., 10-digit, 7-digit). Backfill JOIN uses `RIGHT(REGEXP_REPLACE(...,'\\D','','g'), 10)` with LENGTH=10 guard.
- `pti_export_safe` view is CREATE not ALTER (didn't exist).
- Load method counters are denormalized cache of what `pagoScore.ts lines 177-186` already computes live. Comment in all counter UPDATE blocks: "keep in sync with pagoScore.ts lines 177-186".

### Counter wiring touch points (fire-and-forget, never blocks response)
- `stpWebhook.ts` — after creditWallet at line ~219 → `updateLoadMethodCounters(db, telefono, "spei")`
- `wallet/routes/wallet.ts` — OXXO Conekta webhook after creditWallet → method "oxxo"; card immediate + card webhook → method "card" (uses `getUserTelefonoByWalletId` for wallet ID → telefono lookup)
- `savedCards.ts` — 3 creditWallet call sites → all method "card"

### Services
- `services/deviceParser.ts` — `parseDevice(ua, isPwa)` → DeviceProfile. iOS/Android/desktop. Graceful fallback always.
- `services/loadMethodCounters.ts` — `updateLoadMethodCounters(db, telefono, method)` + `backfillPaymentMethodCounters(db)`
- `services/otpService.ts` — `writeDeviceProfile(phone, ua, isPwa)` exported; TODO comment marks where to call it from the web OTP-verify route handler (route not yet found).

### Income collection (Paula Module 2/3 standalone)
- After MODULE_UNLOCK_2 or MODULE_UNLOCK_3 fires, if `ctx.declared_income_bucket == null` → enqueue "income_collection" message with 1–5 menu
- `whatsapp-agent.ts` income intercept: checks numeric 1–5 reply + last paula_trigger_log entry = 'income_collection' + declared_income_bucket IS NULL → writes bucket and confirms
- Double NULL guard: at send time (ctx.declared_income_bucket check) AND at parse time (DB query)
- Bucket values: lt_3k, 3k_5k, 5k_10k, 10k_20k, gt_20k

### Handoff data packet
- Populated at READINESS_HARD trigger fire (fire-and-forget UPDATE on paula_pending_handoffs WHERE status='pending')
- Includes: pti_score, tier, streak, bill_diversity, literacy_score, device signals, load method trajectory, has_bancarized, bancarization_days (days from created_at to first_spei_load_at — most compelling B2B signal), colonia, income_bucket, partner_display_name

### Admin endpoints
- `POST /api/admin/backfill-payment-counters` — runs backfillPaymentMethodCounters, gated so only fires for users with all counters = 0

### Bug fixed in this session
- `buildUserContext.ts` had `COUNT(DISTINCT bp.service_type)` — column is actually `service_name`. Fixed.
