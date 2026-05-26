---
name: Tomorrow Growth Sprint
description: Three agentic AI growth wedges queued to build next session
---

## Context
User wants to build competitive edge through agentic AI for accelerated market growth and user adoption. Prioritized items 1-3 from the growth wedge analysis.

## Wedge 1 — WhatsApp-first onboarding (zero app download)
Make WhatsApp the PRIMARY onboarding and first-payment channel.
- Rep shares wa.me link → user messages → agent registers them + processes first payment entirely in WhatsApp
- App download becomes an upsell AFTER first successful payment
- Requires: registration flow in agentChat (name, colonia capture), biller setup via conversation
- Key files to extend: `whatsapp-agent.ts` session flow, `agentChat.ts` tools (add `register_user` tool)

## Wedge 2 — Post-payment viral referral loop
Trigger after every successful bill payment.
- Agent sends: "¿Conoces a alguien que pague en OXXO? Compárteles este link y gana $20 MXN cuando hagan su primer pago."
- Rep attribution system already handles tracking — just needs consumer-facing referral link generation
- Trigger point: after SIPREL/Taecel payment confirmed → webhook or post-payment hook
- Key files: `billpay` routes, `whatsapp-agent.ts` post-payment message, `reps.ts` referral logic

## Wedge 3 — 24-hour activation nudge
Target users registered but haven't made first payment.
- After 24 hours of no first payment → WhatsApp: "Hola [name], ¿te ayudo a hacer tu primer pago de CFE o Telmex? No tienes que salir de casa."
- Requires: cron job checking `userProfilesTable` for users with no `billPaymentsTable` entries created > 24h ago
- Key files: `services/reminders.ts` (existing cron pattern), `lib/whatsapp.ts`

## Build order
1 → 3 → 2 (onboarding first enables referral to have something to refer to; activation nudge is a quick cron add)
