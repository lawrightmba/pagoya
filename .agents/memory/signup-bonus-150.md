---
name: Signup bonus $150 rollout
description: All surfaces updated for $150 MXN signup bonus with no-load-required first-transaction flow
---

## Rule
Signup bonus is $150 MXN, credited at registration (not at first OXXO load). Users can pay immediately without loading at OXXO first.

**Why:** Previous $25 bonus required OXXO load first, causing funnel drop-off. $150 on registration removes the blocker.

**How to apply:**
- `signup_bonus_config` table row id=1 holds the live amount — query it before hardcoding any amount in copy
- `bonus_fraud_flags` table logs duplicate_phone attempts (schema in lib/db/src/schema/bonus_fraud_flags.ts)
- `BonusBanner.tsx` uses sessionStorage key `bonus_banner_v2` — bump version if copy changes again
- `BillPaySelector.tsx` shows bonus banner when `wallet.balance > 0 AND no completed payments` — fetches /api/wallet/balance + /api/pagoya/historial
- `PaymentSuccess.tsx` shows first-payment celebration when historial returns exactly 1 completed payment
- `Home.tsx` fetches live count from public `/api/stats` endpoint (no auth) for social proof counter
- OXXO complaint regex in whatsapp-agent fires before profileName check (line ~594); alerts ADMIN_WHATSAPP_NUMBER and sends templated response
- Transaction description: "Bono de bienvenida PagoYa — úsalo en tu primer pago" (both web and WhatsApp)
- `$25 MXN` references in HTML files are the SERVICE FEE — do NOT change them
