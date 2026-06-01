---
name: SIPREL gift card referencia limit
description: SIPREL rejects referencia longer than 10 chars for gift card transactions — phone numbers must be trimmed.
---

## Rule
For gift card calls to SIPREL, the `referencia` field must be ≤ 10 characters.

**Why:** SIPREL's `requestTXN` endpoint returns error 405 "El campo referencia no puede superar los 10 caracteres de longitud." if the referencia is longer. Mexican phone numbers with country code (e.g. "52 322 183 9799") are 15 chars and will always fail.

**How to apply:** Always strip non-digits and take the last 10 when building the gift card referencia:
```javascript
telefono.replace(/\D/g, "").slice(-10)
```
This is applied in two places:
- `pagoya.ts` → `deliverGiftCard()` (card payment path via Stripe)
- `billpay.ts` → `effectiveReferencia` for `isGiftCard` services (wallet payment path)
