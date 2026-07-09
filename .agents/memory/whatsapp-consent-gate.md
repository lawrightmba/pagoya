---
name: WhatsApp consent gate
description: Where the proactive-send consent gate lives and the rule for adding new send paths
---
# WhatsApp consent gate

**Rule:** Every business-initiated (proactive) WhatsApp send must check `users.whatsapp_consent_at IS NOT NULL` before sending. Consent is recorded two ways: web signup checkbox (unchecked by default, optional) and implicit opt-in on any inbound WhatsApp message (fire-and-forget UPDATE in the webhook handler).

**Why:** July 2026 compliance sprint (Lloyd's D2/D4 decisions). Architect review found the gate was initially added only to paulaTriggers — winbackCron, nudgeService (activation), and all five lifecycleNudgeService senders (lowBalance, billDiscovery, referral, activation24h, coloniaBackfill) bypassed it. All are gated now with `reason: "no_consent"` early returns.

**How to apply:** Any NEW proactive send path (cron, nudge, campaign) must add the same gate. Raw-SQL user rows use snake_case (`user.whatsapp_consent_at`); drizzle-select rows use camelCase (`user.whatsappConsentAt`).

**Gotcha found during this work:** whatsapp-agent.ts had 18 bare `sql` template usages with no `sql` import (only `sql as drizzleSql`) — silent runtime ReferenceError risk since esbuild doesn't typecheck. Fixed with dual binding `import { eq, sql, sql as drizzleSql }`. The repo has ~180 pre-existing tsc errors, so `tsc --noEmit` output must be filtered to touched files to spot real regressions.
