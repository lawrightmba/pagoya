---
name: UX audit fixes
description: Key decisions and false positives from the June 2026 UX audit implementation
---

## Stripe (H11) — false positive
`CardEntry.tsx` fully uses `useStripe`, `useElements`, `CardElement`, and `confirmCardPayment`. The `Elements` wrapper in `App.tsx` is required. Do NOT remove it.

## App.tsx shell routing
Only `/vincular-banco` hides BOTH BottomNav and Paula (SupportChat). All other pages including `/bienvenida` and `/confianza` show both. This is the correct intent — Paula should be available everywhere a user might have questions.

## PaymentContext sessionStorage
Mid-payment page refreshes previously wiped the PaymentContext. Fixed by persisting `paymentData` to `sessionStorage` (key `pagoya_payment_ctx_v1`) whenever `empresa` is set. `resetPayment()` clears it. Session-scoped so it doesn't survive tab close.

## Bonus banner dismiss scope
Changed from `localStorage` (permanent) to `sessionStorage` (session-scoped). Users see the bonus banner again on new tab/session — intentional for conversion.

## Trust bar
Home.tsx trust bar now shows: Conekta | OXXO Pay | STP | Banxico | SIPREL (replaced "SPEI" with "STP" which is the actual provider).

## BillPaySelector recently-paid (H6)
Fetches `/api/pagoya/historial?telefono=...&limit=20`, filters `status = completed|confirmado|success`, deduplicates by name, shows top 3 as quick-access chips above the search bar. Gracefully hidden when array is empty or user has no history.

## Fee consistency
PLATFORM_FEE_MXN = 25 MXN (backend). Landing pages pagar-cfe.html + recargas.html updated to $25 throughout, including all calculated totals ($75, $125, $225, $525).

## C1 — returning user re-entry
When `pagoya_phone` is absent from localStorage, Home.tsx WALLET section now shows a "¿Ya tienes cuenta?" card with a link to `/register` instead of incorrectly rendering WalletBalanceWidget.

**Why:** WalletBalanceWidget with no phone would make an API call with an empty telefono param, causing a 400 error silently.
