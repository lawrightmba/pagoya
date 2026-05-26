---
name: WhatsApp Agent Architecture
description: How the PagoYa WhatsApp inbound agent is built and wired
---

## Route
`POST /api/whatsapp-agent` — handled by `artifacts/api-server/src/routes/whatsapp-agent.ts`

## How it works
1. Twilio sandbox webhook fires on inbound message
2. Route parses `Body`, `From`, `WaId`, `ProfileName`
3. `WaId` stripped to digits-only → `phoneKey` (session key + sendWhatsApp target)
4. Session loaded from in-memory Map (`services/whatsapp-sessions.ts`)
5. Rep-code pattern (`/[A-Z]{2,4}-\d{2}/i`) detected on first message → welcome sent, no forwarding to agent
6. Internal `fetch` to `http://localhost:${PORT}/api/agent/chat` with `{ message, telefono, history }`
7. Reply sent via existing `sendWhatsApp(phoneKey, reply)`
8. Empty TwiML returned immediately (before async processing) so Twilio never retries

## Key files
- `src/routes/whatsapp-agent.ts` — webhook handler
- `src/services/whatsapp-sessions.ts` — in-memory session store (30-min TTL, 5-min cleanup)
- `src/lib/whatsapp.ts` — sendWhatsApp() outbound (untouched)
- `src/routes/agentChat.ts` — existing Claude agent (untouched)

## Env vars required
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM` — all set as secrets
- `ADMIN_WHATSAPP_NUMBER` = +17138052626 — escalation target

## Current state
- Sandbox tested and confirmed working (May 26 2026)
- Twilio signature validation intentionally skipped for fast testing — add before production
- No dedicated WhatsApp number yet — using Twilio sandbox

**Why internal fetch instead of shared function:** agentChat.ts was not modified per spec. Internal localhost call reuses the exact same Claude agent, tools, and system prompt without duplication.
