---
name: Paula Module → PTI v2 Construct Mapping
description: How Paula's 5 financial literacy modules map to PTI v2 behavioral dimensions (PR/CFR/BS). Documentation only — no code.
---

# Paula Module → PTI v2 Construct Mapping

## Purpose
Coaching alignment reference. When a user completes a module, Paula should be able to
connect the module content to the specific v2 behavioral dimension it most affects.
This mapping is documentation only — it does not change any scoring logic.

## Module → Dimension Alignment

| Module                              | Key | Primary v2 Construct     | Secondary v2 Construct   | Coaching Angle |
|-------------------------------------|-----|--------------------------|--------------------------|----------------|
| module_unlock_1: ¿Qué es un historial? | M1 | Payment Reliability (PR) | Evidence Depth (ED)      | "Each payment you make is observed and builds your pattern" |
| module_unlock_2: Cómo funciona el crédito | M2 | Payment Reliability (PR) | Cash Flow Resilience (CFR) | "Lenders observe consistency AND the buffer between income and spending" |
| module_unlock_3: Buró — mitos y realidades | M3 | Evidence Depth (ED)   | Behavioral Stability (BS) | "Depth and recency of your history matter as much as each individual payment" |
| module_unlock_4: Qué buscan los bancos | M4 | All three dimensions  | Expected Obligations (EO) | "Banks look for pattern reliability, cash flow, and behavioral consistency together" |
| module_unlock_5: Primera solicitud formal | M5 | Expected Obligations (EO)| Cash Flow Resilience (CFR) | "Knowing your recurring bills and managing your buffer are what formal lenders need to see" |

## Dimension Descriptions (user-facing, no technical names)

- **PR (Payment Reliability)** → "Pago de Servicios" — how consistent and timely bill payments are
- **CFR (Cash Flow Resilience)** → "Flujo de Fondos" — balance between income loaded and spending
- **BS (Behavioral Stability)** → "Rutina Financiera" — regularity of habits over time
- **ED (Evidence Depth)** → not named to users — drives coaching stance threshold (HIGH vs MODERATE vs LOW)
- **EO (Expected Obligations)** → "Servicios Recurrentes" — identified recurring payment patterns

## Coaching Integration Rule

When a user mentions having completed a module, Paula's coaching should reference that module's
primary construct naturally. Example: After M1, when discussing payments, Paula can say
"Como ya aprendiste, cada pago forma parte de tu patrón observado."

Paula NEVER names the construct dimensions (PR, CFR, BS) — only the user-facing labels above.

## Why This Mapping Matters

The `buildPTIv2PaulaContext.ts` service delivers per-dimension stances. The stance determines
*how* Paula coaches on each dimension. The module mapping tells Paula *what content* to
build upon for users who have already learned about it.

A user who completed M3 (Buró myths) is ready for coaching that connects their ED band
to why evidence depth matters for formal lenders — without using the term "Evidence Depth."
