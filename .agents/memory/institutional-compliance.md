---
name: Institutional compliance layer
description: What was built for Ley Fintech 2018 institutional credibility — DB columns, API endpoint, public page, admin tab, Paula prompt.
---

## What exists

**DB columns added to `users`:**
- `kyc_tier TEXT NOT NULL DEFAULT 'simplified'` — values: simplified / standard / enhanced
- `referred_by_institution TEXT` — nullable, for partner pilot attribution

**KYC tier logic:** users with cumulative wallet activity >$3,200 MXN should be upgraded to 'standard' (CURP required). Backfill query via executeSql joins through wallets table (not direct user_id on wallet_transactions — use wallet_id join).

**API endpoint:** `GET /api/admin/compliance-summary` (adminAuth, x-admin-key header)
- Returns: users summary, kyc_tiers[], pti_tiers[], weekly_tx[] (8 weeks of bill_payments)
- Lives at end of `artifacts/api-server/src/routes/index.ts`

**Public page:** `/cumplimiento` → `artifacts/pagoya/src/pages/Cumplimiento.tsx`
- 5 sections: KYC tiering, AML monitoring, record retention, consumer protection, financial inclusion
- Linked from footer of AvisoPrivacidad.tsx and from /confianza institutional section

**PTI/Confianza page update:** `artifacts/pagoya/src/pages/Confianza.tsx`
- Definition block now says "sistema de datos alternativos" + "identidad financiera conductual"
- Added institutional partner section at bottom with link to /cumplimiento

**Admin dashboard tab:** CUMPLIMIENTO (🛡️) in AdminDashboard.tsx
- KPI cards (6 metrics), KYC tier bar chart, PTI tier bar chart, weekly tx table
- Fetches from /api/admin/compliance-summary

**Paula system prompt (`artifacts/api-server/src/routes/agentChat.ts`):**
- Added IDENTIDAD FINANCIERA block: reinforces "cada pago construye tu historial" naturally
- Added SOLICITUD DE CURP block: conversational CURP request when user mentions credit products or has good history — once per session, never pushy

## Why
Institutional partners (banks, SOFOMs, SOFIPOs) require evidence of Ley Fintech 2018 compliance before any pilot or data-sharing arrangement. These changes give a compliance officer a URL to visit, a live data endpoint to call, and documented KYC tiering — without disrupting the user product.

## How to apply
- When adding new user attributes relevant to KYC or institutional data: add to users table + expose in compliance-summary
- When a partner pilot starts: use referred_by_institution field to attribute their users
- KYC upgrade trigger: when cumulative bill_payments volume > $3,200 MXN, set kyc_tier = 'standard' and Paula requests CURP
