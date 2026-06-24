---
name: Paula / DB codebase conventions
description: Exact column names, variable names, and dispatch patterns for Paula triggers and related tables — use these in every prompt, do not use spec defaults.
---

## Rule
Any spec or agent prompt written against this codebase will use different column names than the actual schema. Always override with the values below.

**Why:** External specs (Claude-generated or human-written) consistently default to generic names (`trigger_key`, `template`, `first_name`, etc.). The actual DB and code use different conventions. These deviations caused a full deviation-category in Sprint 7 smoke tests.

**How to apply:** Paste the CODEBASE CONVENTIONS block below at the top of every agent prompt that touches `paula_messages`, `paula_pending_handoffs`, or WhatsApp dispatch.

---

## CODEBASE CONVENTIONS block (copy-paste into prompts)

```
CODEBASE CONVENTIONS — use these exactly, do not use spec defaults:
- paula_messages columns: trigger_type, template_es, cooldown_days, active
- paula_pending_handoffs key: telefono (not user_id); no consented_at by default (add if needed)
- paula_pending_handoffs FK: assessment_id → readiness_assessments.id (NOT NULL — must seed readiness_assessments first in tests)
- Name template variable: {{nombre}} (not {{first_name}})
- Service diversity variable: {{bill_diversity}} (not {{service_count}})
- Literacy variable: {{literacy_score}} (not {{literacy_modules}})
- PTI score variable: {{pti_score}}
- Dispatch: sendWhatsApp(phoneKey, message) directly — no priority queue exists; standard paula_send_queue has 2-min delay
- Cooldown unit: days (not hours) — 7 days = cooldown_days=7, 168h is wrong
- DB migrations: always direct SQL via executeSql(); drizzle-kit push is broken
```

---

## Readiness gate thresholds (readinessGate.ts)

- `HARD_PTI = 80` — actual PTI for READY (not 90; "90" in past reports was a streak label)
- `HARD_STREAK_DAYS = 90`
- `HARD_DIVERSITY = 3`
- `HARD_LITERACY = 3`
- `SOFT_PTI = 70` — APPROACHING threshold
- `SOFT_STREAK_DAYS = 60`
- READINESS_HARD fires on `readiness.status === "READY"` from `evaluateReadiness()` — not a raw PTI number check

---

## Double-send guard pattern

The consented/declined guard uses an atomic `UPDATE ... WHERE status='pending' RETURNING id`. If 0 rows returned → already processed, skip. Do not add a separate pre-check SELECT.
