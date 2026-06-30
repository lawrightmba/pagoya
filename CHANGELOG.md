# PagoYa Platform Changelog

Entries are listed newest-first. Each PTI model change also appears in the versioning table in `artifacts/api-server/public/b2b-data-card.html`.

---

## PTI v4.0-behavioral — 2026-06-30

### Summary
Added 7 behavioral signals across PR, BC, CF, and ED dimensions to deepen trust scoring beyond core bill-pay timing. Dry-run validated against all 9 existing users before publish: 0 reward tier changes, 0 READY gate crossings. Safe migration.

### New signals
| Signal | Dimension | Max pts | Measures |
|---|---|---|---|
| `advance_payment_days` | PR | 8 | Avg days paid before due date |
| `self_initiated_ratio` | PR | 5 | Payments made without a Paula reminder |
| `routine_score` | BC | 3 | Login-hour + day-of-month variance composite |
| `financial_curiosity_index` | BC | 4 | Proactive savings/PTI topics ÷ total Paula messages |
| `payment_amount_volatility` | CF | 4 | Coefficient of variation on per-biller payment amounts |
| `device_consistency_score` | ED | 3 | Days observed on same device (internal-only — see Privacy note) |
| `recovery_score` | PR (exported, not scored) | — | Return rate after 30+ day payment gaps |

### Reweighted existing signals
- PR streak cap lowered: 20 → 13 pts
- PR day-consistency cap tightened: 10 → 4 pts
- Net effect: PR dimension now rewards proactive/early payment behavior (`advance_payment_days`, `self_initiated_ratio`) over raw streak length.

### Anti-gaming / cold-start fixes
Three sub-signals initially allowed a thin-file or single-event user to score non-zero on behavior they hadn't actually demonstrated:

- `advance_payment_days`: now requires `payCount ≥ 3` (was `COALESCE(null,0)=0`, scoring 2 pts off zero history)
- `self_initiated_ratio`: now requires `payCount ≥ 3` (was scoring 5 pts off a single unprompted payment)
- `payment_amount_volatility`: now requires `payCount ≥ 2` (was defaulting CV to 1, scoring 1 pt with no real payment history)

All three previously let 1–2 token payments maximize a sub-score. Gated behind minimum payment-count thresholds; zero-history and thin-file users now correctly score 0 on these until they've demonstrated enough history.

### Privacy / compliance fix
`device_consistency_score` was being exposed in `pti_export_safe` (the B2B-facing view). Removed from export — it remains computed and used internally for PTI scoring only. Flagged as an LFPDPPP exposure risk (device-level tracking in a credit-adjacent score requires its own consent/disclosure treatment vs. transactional payment data). B2B data card already documented this signal as internal-only; the export now matches that documentation.

### Known behavior, not bugs
- `recovery_score` returns `null` until the nightly cron's first run populates it. Users with zero qualifying gaps will correctly write 100 once it runs — this is expected, not a missing-data error.
- `device_consistency_score` reads 0 for all current users (<7 days observed) — expected for a recently-launched signal, not a calculation error.

### Paula topic classifier
WhatsApp messages to Paula are now classified into 7 topic buckets at ingest time (`paula_inbound_log.topic_category`). The `financial_curiosity_index` signal reads from this classification. Proactive topic categories (`savings_goal`, `pti_inquiry`) drive the ratio.

### Migration impact (dry run, n=9 users with existing scores)
- READY gate (≥80) crossings: **0**
- Reward tier changes (Bronce/Plata/Oro/Élite): **0**
- Notable swings (≥5 pts, same tier): **1** — user `*0001` dropped 17 → 10 (−7 pts), driven by the PR reweighting (streak cap reduction). User remains in "None" tier (below Bronce/30); no reward or gate impact.
- Avg delta (v4 − v3) across scored users: **−3.5 pts**

### Follow-up items
- Re-run dry-run methodology at 30–60 days post-launch once user base and payment history have grown — current n=9 result doesn't stress-test the new streak/day-consistency caps at realistic volume.
- Confirm first nightly cron run populates `recovery_score` correctly across all users (verify, don't assume from code review alone).

---

## PTI v3.0-granular — 2026-06

### Summary
Granular data capture layer added: payment quality score, bill priority tier, payment channel; income regularity (load CV, payday window); obligation ratio; essential bill ratio; tenure signals; 30/60/90-day trend vectors. B2B score (350–850) introduced, mapped to conventional credit-score scale.

---

## PTI v2.1-4dim — 2026-06

### Summary
5 new signals: Paula interaction depth, push notification engagement, signup utilization speed, P2P network activity, high-value intent index.

---

## PTI v2.0-4dim — 2026-05

### Summary
Restructured from flat 7-component model to 4 dimensions (PR/BC/ED/CF). Added pagoScore behavioral signals table.

---

## PTI v1.0-flat — 2025-Q4

### Summary
Initial 7-component flat scoring model. First production PTI compute.
