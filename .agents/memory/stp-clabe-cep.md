---
name: STP CLABE + CEP integration
description: Per-user CLABE assignment on registration; webhook CLABE-first matching; CEP URL generation and storage
---

## CLABE generation

Formula: `bank(3) + city(3) + userId.padStart(11, "0") + controlDigit(1)` = 18 digits

Control digit algorithm (Banxico standard):
```
weights = [3,7,1, 3,7,1, 3,7,1, 3,7,1, 3,7,1, 3,7]
sum = Σ ( (digit[i] × weight[i]) mod 10 )
control = (10 - (sum mod 10)) mod 10
```

Env vars:
- `STP_BANK_CODE` — 3-digit Banxico bank code (default dev: "646")
- `STP_CITY_CODE` — 3-digit city code (default dev: "000")
- `STP_EMPRESA` — institution name in STP (e.g. "PAGOYA")
- `STP_SOAP_URL` — STP SPEI WS endpoint
- `STP_ENABLED=true` — gates all SOAP calls; in dev CLABEs are generated/stored but SOAP is skipped

## Where things live

- Service: `artifacts/api-server/src/services/stpService.ts`
  - `buildClabe(bankCode, cityCode, userId)` → 18-digit string
  - `computeClabeControlDigit(digits17)` → 1-digit string
  - `generateCepUrl({claveRastreo, fechaOperacion, amountMxn, bankCode?})` → Banxico URL
  - `assignClabeToUser(telefono, userId, kycData?)` → saves to DB + optionally fires SOAP
  - `checkStpAccount(clabe)` / `withdrawStpAccount(clabe, telefono)` — SOAP stubs

- DB columns:
  - `users.stp_clabe TEXT UNIQUE` — assigned CLABE
  - `wallet_transactions.stp_clave_rastreo TEXT` — STP tracking key
  - `wallet_transactions.cep_url TEXT` — Banxico CEP URL

## Registration flow hook

In `streetTeamBonus.ts` step 5.5b: `assignClabeToUser` is called fire-and-forget after wallet creation.

## Webhook matching (stpWebhook.ts)

Priority order:
1. Match `cuentaBeneficiario` (18-digit destination CLABE) → `users.stp_clabe`
2. Fallback: extract phone from `conceptoPago` → `users.telefono`

CEP URL stored in `wallet_transactions.cep_url` and sent in WhatsApp confirmation.

## CEP URL format

`https://www.banxico.org.mx/cep/?i=90{bankCode}&s={YYYYMMDD}&d={centavos}&t={claveRastreo}`

Example: `https://www.banxico.org.mx/cep/?i=90646&s=20260601&d=25000&t=PAGOYA12345`

## STP endpoints

- `GET /api/stp/instructions/:telefono` — returns personal CLABE (or shared+concept instructions)
- `GET /api/stp/clabe/:telefono` — returns raw CLABE for admin use
- `GET /api/stp/account/check/:clabe` — calls STP consultaCuentaFisica

## For go-live

Set env vars above, then test RegistraCuentaFisica against STP sandbox. Backfill CLABEs for existing users with a one-off script if needed (call `assignClabeToUser` for all users missing `stp_clabe`).

**Why:**
STP WALLET members must register each end-user CLABE before accepting inbound SPEI. The CLABE is derived from the user DB id so it's deterministic and collision-free.
