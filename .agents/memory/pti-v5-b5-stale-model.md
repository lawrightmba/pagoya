---
name: PTI v5.0 B5 + stale-model correction
description: B5 evaluation findings, the stale model_version anomaly pattern, and the canonical corrected B4 table.
---

## Stale model_version pattern (found 2026-07-11)

Two prod users had `users.pti_score` computed by old model versions despite v4.3 being current:

| telefono | stored model_version | stored score | corrected v4.3 | correction date |
|----------|---------------------|-------------|----------------|----------------|
| +523222304213 | v2.1 / v4.0-behavioral (June 11) | 17 | 11 | 2026-07-11 |
| 8118963105 | v4.1-behavioral (July 4, 4 days old) | 1 | 7 | 2026-07-11 |

**Root cause:** The monthly PTI batch does not check `pti_breakdown.model_version` against the current model. Users computed before a model upgrade keep the old score until `compute-now` is triggered or they recompute in the next batch. The NULL-user pass only catches users with `pti_score IS NULL` — users with an old score are silently left with the stale model.

**Detection:** The B4 comparison table showed 8118963105 with v5 > v4.3 (+4 delta), which is directionally wrong. This was a data artifact: the stored v4.3 was actually v4.1-behavioral computed 7 days earlier with different wallet data. Recognized because the B3 diff tool (which recomputes v4.3 fresh) returned 7 for this user, not 1.

**Fix applied (2026-07-11):** `POST /api/admin/pti/compute-now` for both users. After correction, both have `model_version = "v4.3-signal-expansion"`.

**Backlog item logged in program-record.md:** Add `model_version` column to `users`, compare against current model at batch time, refresh mismatches.

## B5 canonical table (same-day data, Jul 11 2026)

All v4.3 scores from `compute-now` today; all v5.0 from shadow backfill today.

| telefono | v4.3 | v5.0 | delta | streak_months |
|----------|-----:|-----:|------:|:-------------:|
| +523222304213 | 11 | 5 | −6 | 0 |
| 8118963105 | 7 | 5 | −2 | 0 |
| 8143141695 | 5 | 3 | −2 | 0 |
| 4251006528 | 5 | 3 | −2 | 0 |
| 8111778514 | 5 | 3 | −2 | 0 |
| 4157972483 | 5 | 3 | −2 | 0 |
| 3221562382 | 5 | 3 | −2 | 0 |
| 3221839799 | 5 | 3 | −2 | 0 |
| 5555550001 | 3 | 1 | −2 | 0 |

All 9 deltas ≤ 0. Mean delta: −2.44. Max |delta|: 6. G-C counter: 9/9 tolerant (all streak_months=0).

**Gate conclusion:** B1/B2/B3/B4 all green. B5 complete as of 2026-07-11.
