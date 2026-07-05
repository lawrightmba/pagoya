---
name: Paula paula_messages Tier D activation
description: Final state and reasoning for the late_payment_1, pattern_late_2x, pti_drop_7d triggers
---

All three Tier D triggers are active in production (`active=true` in `paula_messages`) as of July 2026.

`pti_drop_7d` needed no changes — activated as-is, no gating issues, no reply-intercept expectations in its copy.

`late_payment_1` and `pattern_late_2x` originally asked the user a question implying a follow-up action (adjusting reminder timing) that nothing in the codebase listens for or acts on — `reminders.ts` only supports a global `reminder_days_before` per biller, not a per-user adjustable preference, and no reply-intercept code exists for these two trigger types anywhere in `whatsapp-agent.ts` (unlike Tier C's `address_tenure`/`employment_profile`/`remittance_profile`, which are fully wired end-to-end).

**Why:** Sending a template that implies functionality the product doesn't have erodes trust; the fix was to revise copy to remove the unfulfillable offer while preserving Paula's established non-judgmental tone (verified consistent with emoji use in other active templates — she does use emoji elsewhere, so keeping one in revised copy was correct for voice consistency).

**How to apply:** If a future Paula trigger's copy implies a follow-through action, check whether `whatsapp-agent.ts` actually has a reply-intercept for that trigger type before activating — don't assume matching functionality exists just because the template asks for it.
