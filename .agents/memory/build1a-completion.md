---
name: PTI Build 1A completion
description: Evidence file, idempotency fix, known baseline, and retained audit identities for PTI Build 1A
---

## Status
COMPLETE — evidence locked 2026-08-05.

## What was built
`src/services/tests/build1a_final_evidence.test.ts` — 5-part evidence suite:
- Parts 1/2: real success-path + tool-call telemetry via live Express app + real DB
- Parts 3/4/5: canary snapshot persistence + replay determinism + cleanup isolation

## Idempotency pattern (timestamp-window isolation)
Parts 3/4/5 suffered from accumulating canary rows across reruns because assertions hardcoded `toBe(12)` against all-time totals. Fix: capture `canaryRunStart` before the 12-iteration loop and `canaryRunEnd` after the 600ms settlement wait, then filter ALL count/replayability queries with `AND recorded_at >= ${canaryRunStart}::timestamptz AND recorded_at <= ${canaryRunEnd}::timestamptz` (use `captured_at` for `pti_score_input_snapshots`). This scopes each run's assertions to only the rows written in that run.

**Why:** canary rows are retained evidence — never deleted. Without window scoping, each run appends 12 rows and `toBe(12)` fails on run N>1.

**How to apply:** any test that retains rows across reruns and asserts an exact count must use timestamp-window scoping, not all-time totals.

## Known suite baseline (post-fix)
- `Tests 7 failed | 805 passed (812)` — the 7 failures are all pre-existing billpay rate-limiter tests (Task #8).
- `Test Files 1 failed | 21 passed (22)` — the one failed file is `billpay.test.ts`.
- Evidence file: 5/5 pass on every run, including consecutive reruns without cleanup.

## 7 known failing tests (Task #8, pre-existing)
1. `billpay.test.ts > 9. Wallet > wallet bill pay: provider failure does NOT debit the wallet`
2. `billpay.test.ts > 12. Taecel Payment Flow > 11. CFE payment: bill_payments row has status=confirmed and taecel_folio set`
3. `billpay.test.ts > 12. Taecel Payment Flow > 12. Telcel top-up: bill_payments row has bolsa_type='Tiempo Aire'`
4. `billpay.test.ts > 12. Taecel Payment Flow > 13. Error code 1 (INVALID_PHONE) — provider throws INVALID_PHONE, route returns 502`
5. `billpay.test.ts > 12. Taecel Payment Flow > 14. Error code 2 (DESTINATION_UNAVAILABLE) — provider throws, bill_payments row status=failed`
6. `billpay.test.ts > 12. Taecel Payment Flow > 15. Error code 3129 (TRANSACTION_TABLE_FULL) — provider throws expected message`
7. `billpay.test.ts > 15. Two Bolsa Balance > 23. Low balance alert fires when Pago de Servicios < 500 MXN (route-level)`

## Retained audit identities — DO NOT touch
| Phone | Purpose | Retention |
|---|---|---|
| `b1a_proof_sc_v1` | Part 1 success-path (agent_tasks + agent_task_outcomes) | permanent until sign-off |
| `b1a_proof_tc_v1` | Part 2 tool-call (agent_tasks + agent_tool_calls + agent_task_outcomes) | permanent until sign-off |
| `b1a_canary_2026_final` | Parts 3/4/5 snapshot canary (accumulates 12 rows per run) | permanent until sign-off |
| `bt_db_mixed_model_user` | BT-DB-2 incident phone — its absence from pti_score_history is asserted by Part 5 | do not recreate rows |

## agentChat.ts scoping fix (incidental, applied during Build 1A)
`financialLiteracyScore`, `modulesUnlocked`, `coachingResponsiveness` were declared inside `if (telefono)` block but referenced outside at `buildSystemPrompt` call (line ~870). Caused ReferenceError on every request, routing all conversations through the catch branch. Fixed by hoisting declarations to outer try scope (no logic change, no schema change).
