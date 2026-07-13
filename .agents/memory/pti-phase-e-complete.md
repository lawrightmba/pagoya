---
name: PTI v5.0 Phase E go-live
description: Phase E complete 2026-07-13; v5.0 is now the production scoring model; shadow mode retired; all evidence gates passed.
---

# PTI v5.0 Phase E — Complete (2026-07-13)

## Status
**COMPLETE.** v5.0.0-rc1 is live as the production PTI scoring model.

## What changed
- `PTI_V5_MODEL_VERSION = "v5.0.0-rc1"` (shadow suffix dropped in `ptiV5.ts`).
- `computePTIv5LiveForUser` — new Phase E entry point; writes to `users.pti_score / pti_breakdown / pti_computed_at + pti_score_history`. Replaces `computePTIForUser` (v4.3).
- `computePTIv5ForAllUsers` — batch wrapper for monthly cron.
- `ptiCron.ts` nightly: shadow fire-and-forget retired → `computePTIv5LiveForUser` (live, non-blocking).
- `ptiCron.ts` monthly: `computePTIForAllUsers` → `computePTIv5ForAllUsers`.
- Admin route `POST /api/admin/phase-e-recompute` (safety-gated `{"confirm":"V5_LIVE_RECOMPUTE"}`).
- Admin route `GET /api/admin/pti-v5-monitoring` (tier dist, tripwire, streak, coverage, delta).
- AdminDashboard tab `🔬 PTI v5.0` added.

## Evidence (prod, 2026-07-13 15:46 UTC)
- Recompute: 10/10 users, 0 errors.
- PTI-70 tripwire: **0** ✅
- G-C tolerant-streak: 10/10 (all users streak_months ≤ 2) ✅
- Model coverage: 10/10 on v5.0.0-rc1 ✅
- Shadow convergence: avg Δ = 0.33 pts, max = 1 pt ✅
- All 10 user deltas ≤ 0 (no score increased — fair-lending remediation confirmed).

**Why:** All B5 evidence gates closed, Meta SID approved, Lloyd go-order confirmed.

## Shadow table
`pti_v5_shadow_recompute` retained as B5 audit baseline. Nightly cron no longer writes to it.

## Prod API path
Admin routes are at `https://www.pagoyamx.com/api/admin/...` (not `/api-server/...` — that is the Replit dev proxy prefix only).
