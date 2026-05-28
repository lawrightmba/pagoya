---
name: Paula payment initiation
description: WhatsApp 2FA payment flow — how "paga mi CFE" works end-to-end
---

# Paula WhatsApp Payment Initiation

## The rule
`prepare_bill_payment` tool stages a payment; the user must reply "sí" to execute it. The WhatsApp agent layer owns the 2FA intercept — NOT the agent/Claude loop.

**Why:** Claude cannot reliably detect "sí" as a payment confirmation vs. any other affirmative. Putting the intercept in `whatsapp-agent.ts` makes it deterministic.

## How to apply
1. Paula calls `prepare_bill_payment` (in `agentChat.ts`) → validates service + wallet balance → returns `pendingPayment` object + `confirmText`
2. `agentChat.ts` tracks the staged payment and returns it in the HTTP response: `{ reply, escalated, pendingPayment }`
3. `whatsapp-agent.ts` saves `pendingPayment` (with `stagedAt` timestamp) to session
4. Next inbound message: if `session.pendingPayment` exists and is < 5 min old:
   - CONFIRMATION_PATTERN (sí/si/yes/confirmar/ok/dale/va…) → call `POST /api/bills/pay` internally, clear pending
   - CANCELLATION_PATTERN (no/cancelar…) → clear pending, send cancel message
   - Anything else → fall through to normal agent (pending stays alive)
5. Bill payment params: `{ serviceId, referencia, monto, telefono, paymentSource: "wallet" }`

## Key files
- `artifacts/api-server/src/routes/agentChat.ts` — tool definition + executor
- `artifacts/api-server/src/routes/whatsapp-agent.ts` — 2FA intercept
- `artifacts/api-server/src/services/whatsapp-sessions.ts` — PendingPayment interface
