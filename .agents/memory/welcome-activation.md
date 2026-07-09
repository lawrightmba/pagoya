---
name: welcome_activation template
description: 48h post-registration Paula trigger — conditions, copy constraint, Twilio submission history
---

# welcome_activation Paula Template

**Trigger conditions** (all must be true):
- `totalPaid === 0` — zero completed bill payments
- `hoursRegistered >= 48` — at least 48h since `users.created_at`
- `signup_bonus_claimed === true` — user actually received the $150 bonus

**Why the bonus gate matters:** copy claims "$150 MXN de bienvenida" — if the config is missing from prod the bonus is never credited and the claim is false. Gate prevents false copy from firing.

**Priority:** 9 (between winback_30d=8 and first_payment=10). Tier 3 — Activation.

**cooldown_days:** 9999 (fires exactly once per user lifetime).

**Template category:** UTILITY. Meta may reclassify as MARKETING; acceptable per business decision.

**Body (v2 — fixed):**
`🎁 ¡Tienes $150 MXN de bienvenida en tu wallet de PagoYa, {{nombre}}! Paga CFE, agua o Telmex directo desde tu cel — sin banco, sin filas. Escribe *pagar* para empezar.`
168 chars. Variable in middle.

**Why v2:** Meta rejects templates where a variable (`{{1}}`) appears as the first or last token. First version started with `{{1}},` and was rejected with `subCode=2388299 / "Variables can't be at the start or end of the template."` — fixed by prepending `🎁 ¡Tienes $150 MXN de bienvenida en tu wallet de PagoYa,`.

**Variables schema:** `{ "1": "nombre" }` — $150 is hardcoded (bonus amount change = new template approval cycle).

**Twilio SID (pending):** `HX7b08a0a13db8d010cec343f3bc6bb2e6` — submitted 2026-07-09, status: received/pending Meta review.

**Trigger location:** `paulaTriggers.ts` → WELCOME ACTIVATION section (between RECOVERY and ACHIEVEMENT).

**userRow query extended:** now selects `consecutive_payment_months, created_at, signup_bonus_claimed`.

**PAULA_MESSAGES_EXPECTED_ACTIVE:** 23 (was 22). Defined in `paulaTriggers.ts` line ~193 — the health check reads THIS constant, not the one in seedPaulaMessages.ts.

## Compliance blockers (as of 2026-07-09)

1. **signup_bonus_config is EMPTY in prod** — no $150 bonus credited to any user. Fix: `POST /api/admin/bonus-config` with `{"isActive":true,"bonusAmount":"150.00"}`. Until then `signup_bonus_claimed` stays false for all users and the trigger never fires.

2. **WhatsApp opt-in (web_organic):** Register.tsx line ~1059 has passive disclosure text ("Al registrarte aceptas recibir mensajes de WhatsApp…"). No checked checkbox, no server-side consent timestamp. Compliant at minimum threshold but recommended upgrade: add checkbox + `consent_recorded_at` column.
