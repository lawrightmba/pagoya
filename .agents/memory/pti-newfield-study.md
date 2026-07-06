---
name: PTI new-field ablation study
description: How the 15 Stage-1/2 derived fields were stress-tested synthetically; circularity caveat that governs interpreting any rerun.
---

# PTI new-field ablation & proxy-correlation study

- Standalone DEV script `ptiNewFieldStudy.ts` (api-server scripts dir) synthesizes the 15 derived fields on top of the byte-identical synthetic population — it uses a SEPARATE per-user PRNG (`seed ^ imul(_id+1, 2654435761)`) so the generator's RNG sequence is never perturbed. Rerun: `npx tsx src/scripts/ptiNewFieldStudy.ts` from artifacts/api-server.
- **Circularity caveat (load-bearing):** the generator does not store latent reliability/engagement, so the script estimates `relHat` from observables (selfRatio/advanceDays/domStddev/streak) and synthesizes fields FROM relHat while also defining risk cohorts BY relHat. All ablation deltas are upper bounds under stated assumptions — never quote them as predictive-power estimates.
- Import `toSnapshot` from `fairLendingClampStressTest.js` (main-guarded), NOT from `ptiAblationStudy.js` (unguarded main would run).
- Key findings (July 2026 run, seed 0xc0ffee, n=8000, +3pt bolt-on): minBalanceBuffer30d is a near-pure balance clone (r=0.88 with currentBalance, Δd=-0.008) — ruled out as-is; billShockWalletResponseRate is the strongest direct ses probe (r(_ses)=0.49); best survivors were preDueStagingIndex (+0.051) and drawdownVelocity (+0.029); activityVelocity30d added nothing (Δd=-0.009).
- Real-prod coverage is ~0% for all 15 fields (13 users, 0 bill_payments rows, 0 user_billers, 0 users with ≥2 loads/30d as of July 2026) — synthetic coverage numbers and prod coverage are two different facts; always report both.
