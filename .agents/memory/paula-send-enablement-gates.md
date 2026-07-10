---
name: Paula WhatsApp send-enablement gate findings
description: Non-obvious gotchas discovered while running the prod send-enablement sequence for Paula WhatsApp templates (category patch -> reconcile -> health check -> canary)
---

## Dev DB and prod DB are independently seeded/synced — never assume parity
`GET /api/admin/paula-template-health` and `sync-template-sids` must each be checked/run against the **actual target host** (e.g. `pagoyamx.com` for prod), not just `localhost:8080`. The `twilio:sync` script's DB-write step is hardcoded to `http://localhost:8080/api/admin/sync-template-sids`, so it has only ever synced content_sid values into the **dev** database — production can silently lag with missing SIDs even when dev shows 23/23 coverage.

**Why:** caused a false "all clear" mid-rollout — dev showed sid_coverage 23/23 while prod was actually 7/23 with `sending_gate_passed: false`.

**How to apply:** before trusting any "N/N confirmed clean" signal in a prod rollout, re-run the read-only health/verification endpoint directly against the prod domain, not localhost. If SIDs are missing on prod, they can be backfilled by calling `POST /api/admin/sync-template-sids` on prod directly with `{trigger_type, content_sid, approved_category}` triples pulled from wherever they're already known-good (e.g. dev DB), since the route is idempotent and safe to call manually.

## Meta blocks WhatsApp MARKETING templates to US recipients entirely
Since April 1, 2025, Meta will not deliver WhatsApp MARKETING-category template messages to any US phone number (Twilio error 63049: "Meta chose not to deliver this WhatsApp marketing message"). UTILITY-category templates are unaffected. This is a hard platform policy, not a bug or misconfiguration — Twilio's own record of the template category can show "approved" and correct while the send still fails for this reason.

**Why:** discovered via a canary send to a US test number that came back `undelivered`/63049 despite the template being correctly registered.

**How to apply:** for PagoYa (mixed US/MX user base as of 2026-07-10), any trigger recategorized to MARKETING will silently fail for US-number users. No mitigation implemented yet — flagged to user, no action taken per their instruction ("mix but nothing to change for now"). Revisit if US-number engagement/delivery metrics for MARKETING-category Paula nudges look anomalously low.

## Canary-testing a WhatsApp template without touching PAULA_SENDING_ENABLED
There is no dedicated admin test-send route. To canary a specific approved template without flipping the global `PAULA_SENDING_ENABLED` kill switch (which would also open the door for the queue/cron to fire on real qualifying users), call Twilio's Content API directly with the `content_sid` + `contentVariables`, bypassing `paula_send_queue` and `paulaSendQueue.ts` entirely — this is fully isolated from the production send pipeline. Poll `client.messages(sid).fetch()` for terminal status (delivered/failed/undelivered).
