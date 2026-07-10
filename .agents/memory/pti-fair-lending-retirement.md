---
name: PTI fair-lending adjustment layer retirement
description: How the ±5/±2 fairLendingAdjustment.ts layer was retired (2026-07-10) and what's still around
---

The ±5/±2 fair-lending adjustment layer (`fairLendingAdjustment.ts` + `config/fairLendingMapping.ts`) was deleted per phase3-implementation-spec.md §3.2 — it was always a production no-op (all-zero mapping). Also deleted: `fairLendingRetestCron.ts`, `scripts/fairLendingClampStressTest.ts`, `tests/fairLendingAdjustment.test.ts`.

**Why:** spec required deletion + a terminal `fair_lending_signoff` audit entry once the layer was confirmed to never do anything in prod, while permanently preserving the "computePTI must never read colonia/income" regression guard.

**How to apply:**
- `fairLendingOwnership.ts` (threshold-owner auth) was intentionally KEPT — it wasn't named in the spec's deletion scope and is generic/harmless; its tests live in `services/tests/fairLendingOwnership.test.ts` now.
- The regression guard "pti.ts/computePTI(v5) must never reference colonia/declared_income_bucket" lives in `pti.test.ts` and `ptiV5.test.ts` — do not delete these when touching fair-lending code again.
- `scripts/ptiStressTest.ts` and `scripts/ptiNewFieldStudy.ts` both had hard dependencies on the deleted files (imports, a report section) — if similar retirements happen again, grep the whole `scripts/` dir, not just `services/`, since dev-only stress scripts aren't covered by tsc build boundaries the same way and fail silently until run.
- Terminal audit row: `fair_lending_signoff` id=752, status='retired'.
