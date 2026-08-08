---
name: Phone E.164 normalization
description: Full E.164 storage for all telefono/phone columns; US/CA/MX support; migration pattern
---

## What was done (2026-08-08)

All phone storage normalized from bare 10-digit to full E.164 (`+521234567890`, `+17138052626`).

## Core utility: `lib/phoneUtils.ts`

- `toE164(raw)` — canonical converter. Handles: already-E164, MX bare 10-digit (+52), MX legacy 521-prefix (13 digits), US/CA 11-digit starting with 1.
- `normalizePhone` — alias for `toE164`; use everywhere for DB lookups.
- `toSiprelRef(raw)` — last 10 digits only; use ONLY for SIPREL/Taecel referencia field (SIPREL hard limit ≤10 chars).

## Migration: `services/migrations_phone_e164.ts`

- Idempotent startup migration; runs at server start via `index.ts`.
- Guards: `WHERE telefono ~ '^\d{10}$' OR telefono LIKE '+%'` → no-op on already-E164 rows.
- FK ordering: `users` first, then `wallets.user_id`, then `saved_cards.user_telefono` (FK checks pass because parent updated first).
- 19 tables covered (see migration file for full list).
- US/CA correction pass at end: `knownUSCorrections` array — add new entries for any confirmed US/CA users that were migrated incorrectly.

## Code sweep (21 spots fixed)

All inline `.replace(/\D/g, "").slice(-10)` patterns replaced with `normalizePhone()` across:
- `otpService.ts`, `streetTeamBonus.ts`, `whatsapp-agent.ts` (4 spots), `agentChat.ts` (5 spots), `routes/index.ts`, `complaints.ts`, `pti.ts`, `billpay.ts`, `pagoya.ts`, `loadMethodCounters.ts`, `readinessGate.ts`

SIPREL-specific spots use `toSiprelRef()`: `billpay.ts:87` (gift card referencia), `pagoya.ts:40` (Stripe gift card referencia).

## WhatsApp webhook phoneKey fix

Before: `normalizePhone(rawWaId.replace(/^whatsapp:\+?/i, ""))` → stripped `+` → lost country code
After: `normalizePhone(rawWaId.replace(/^whatsapp:/i, ""))` → preserves `+` → toE164 works correctly

**Why:** Twilio sends `whatsapp:+521234567890`; stripping `whatsapp:+` gave `521234567890` which toE164 treated as MX-without-+. Stripping only `whatsapp:` preserves the `+` so toE164 correctly identifies the country code.

## whatsapp.ts formatTo fix

Added `if (to.startsWith("+"))` branch that does `whatsapp:+${digits}` directly, preserving the already-correct country code. Legacy 10-digit bare numbers still fall through to the +52 prepend (backward compat).

## Production considerations

- When deploying: migration auto-runs and normalises all existing rows.
- Stuck user (+17138052626 stored as 7138052626): corrected via `knownUSCorrections` in migration.
- All existing MX users (10-digit stored): correctly get +52 prepended.
- New US/CA registrations: `validatePhone` in `streetTeamBonus.ts` now accepts `INTL_PHONE_RE = /^\+52[1-9]\d{9}$|^\+1[2-9]\d{9}$/`.

## Sharp edges

- WhatsApp MARKETING templates: Meta blocks delivery to US numbers (error 63049). OTP is UTILITY — likely fine.
- Paula proactive sends: all now use E.164 telefono → `formatTo` correctly routes to US numbers.
- STP webhook: uses `conceptoPago` / CLABE matching, not telefono directly — unaffected.
- SIPREL referencia: always 10-digit even for US users (phone area code suffix, no country code prefix in billing ref).
