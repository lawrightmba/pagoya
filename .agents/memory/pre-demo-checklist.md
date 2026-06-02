---
name: Pre-demo checklist
description: Things to verify before every YC demo, investor demo, or go-live push
---

# Pre-demo / Pre-go-live checklist

## Signup bonus config
- Run: `SELECT id, is_active, bonus_amount FROM signup_bonus_config;`
- **Must be `is_active = true`** or all new registrations will fail with "El programa de bonos no está disponible en este momento."
- If false: `UPDATE signup_bonus_config SET is_active = true WHERE id = 1;`

**Why:** The config row was found `is_active = false` during the June 2026 YC smoke-test run, silently blocking every registration. There is no UI warning — it just returns a 400 with an eligibility reason of `"inactive"`.

**How to apply:** Check this at the start of any session where a demo or launch is imminent.
