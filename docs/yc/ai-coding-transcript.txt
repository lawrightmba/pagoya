# How I Build with AI — PagoYa Engineering Sessions

**Lloyd Wright — Founder, PagoYa / Longview Meridian Technologies LLC**
**Stack: Claude (chat) + Replit Agent | No external development team**

---

## A Note on Workflow

I don't use Claude Code or Cursor. My workflow is Claude chat + Replit Agent, driven by single, complete prompts designed to execute end-to-end without interruption.

The constraint is intentional. When you can't course-correct mid-prompt, you're forced to fully decompose the problem before you write a single line of the prompt. That means thinking through failure modes, edge cases, and sequencing before the agent touches code — which is exactly the discipline you want when you're building financial infrastructure as a solo founder.

What follows is an export of four sessions that represent how PagoYa was built and hardened. Each session shows the same pattern: identify the problem clearly, write one complete prompt, ship.

---

## Session 1 — Security Hardening: Three Failure Modes, One Session

### What This Session Shipped

| Failure Mode | Risk | Fix |
|---|---|---|
| Concurrency | Negative balances, double-spend | Atomic conditional `UPDATE ... WHERE balance >= amount` |
| Abuse | Twilio cost attack, SIPREL saldo drain | Three-tier `express-rate-limit` middleware |
| Regulatory | AML exposure, CNBV compliance gap | Per-user $50,000 MXN daily cap enforced before provider call |

> One session. Three failure modes. All code is in production at pagoyamx.com processing real transactions.

---

### Context

PagoYa is a mobile-first fintech platform for paying utility bills and buying digital gift cards in Mexico — targeting underbanked users without bank accounts. Users load their wallet via OXXO cash-in, SPEI bank transfer, or Stripe card charge — then pay CFE (electricity), Telmex, Telcel, IZZI, and 20+ other billers, or buy Netflix/Amazon/Google Play gift cards delivered via WhatsApp. Every transaction is real money.

The core financial object is a `wallets` row in PostgreSQL with a `balance_mxn` numeric field. Getting the debit logic wrong doesn't produce a test failure — it produces a real user getting double-charged or a real negative balance.

---

### The Audit: How I Found the Three Failure Modes

Before writing any prompt, I read the payment route (`/api/bills/pay`) and wallet service end-to-end. I was looking for the gap between "works in testing" and "survives production with real money and adversarial users."

**Failure Mode 1: Concurrency — race condition on wallet debit**

The original debit logic:

```typescript
// OLD — two separate statements, race window between them
const balance = await getBalance(telefono);         // READ
if (balance < amount) throw new Error("INSUFFICIENT_BALANCE");
await updateWallet(walletId, balance - amount);     // WRITE (another req may run between these)
```

Under PostgreSQL's default READ COMMITTED isolation, two concurrent payment requests for the same user could both pass the balance check before either has committed the debit. Classic TOCTOU bug. A user with $100 MXN balance pays two $80 MXN bills and ends up at −$60.

The fix is not "add a lock." The fix is to eliminate the two-statement pattern by making the balance check part of the `UPDATE` condition.

**Failure Mode 2: Abuse — no rate limiting on payment endpoints**

The payment, OTP, and wallet-load endpoints had no rate limiting. A determined attacker could hammer `/api/bills/pay` or `/api/otp/send` in a loop. For OTP: a Twilio cost attack. For payments: brute-force on payment references and SIPREL saldo exhaustion.

**Failure Mode 3: Regulatory — no daily AML cap**

Mexico's CNBV caps electronic wallet transactions. We had per-load limits ($10,000 MXN) but no per-user daily cap on bill payments. A compromised account could run unlimited payments through SIPREL in a single day.

---

### The Prompt I Sent

```
Security hardening sprint — wallet + payment infrastructure

I've audited the payment route and found three issues. Fix all three in this session.

1. Atomic wallet debit (race condition fix)

In billpay/routes/billpay.ts, replace the two-step balance check + UPDATE with a single
conditional UPDATE that checks and debits atomically:

  UPDATE wallets
  SET balance_mxn = balance_mxn - $amount
  WHERE id = $walletId AND balance_mxn >= $amount::numeric
  RETURNING id

If RETURNING id comes back empty, throw INSUFFICIENT_BALANCE and roll back. Apply the same
pattern in wallet/services/wallet.ts debitWallet(). Add a comment explaining why — future me
needs to understand this is intentional, not accidental.

2. Rate limiting

In app.ts, add three express-rate-limit limiters before the main router:
- paymentLimiter: 20 req/15 min → POST /api/bills/pay, POST /api/wallet/transfer
- walletLoadLimiter: 10 req/15 min → POST /api/wallet/load/*, POST /api/cards/charge-and-save
- otpLimiter: 5 req/15 min → POST /api/otp/send, POST /api/auth/start

Response: { error: "Demasiados intentos. Intenta de nuevo en 15 minutos." }
Spanish because the error surfaces directly to users. standardHeaders: true, legacyHeaders: false.

3. Daily AML cap on bill payments

After wallet balance pre-check, before provider call: query bill_payments for today's confirmed
payments by this telefono, sum monto, reject with 429 if todayTotal + amount > 50_000 MXN.
Non-fatal on DB error — let payment through and log. Cap check must happen before any external
provider call.

Ordering must be: input validation → balance check → AML cap → provider call → atomic DB commit.
```

---

### What Shipped

**Fix 1: Atomic Conditional Debit**

```typescript
// Atomic conditional debit: the UPDATE only executes if balance_mxn is still
// sufficient at the moment the statement runs. This eliminates the race window
// that exists between a separate SELECT (balance read) and a subsequent UPDATE
// under PostgreSQL's READ COMMITTED isolation.
const updated = await tx
  .update(walletsTable)
  .set({
    balanceMxn: sql`balance_mxn - ${montoNum.toFixed(2)}`,
    updatedAt: new Date(),
  })
  .where(
    and(
      eq(walletsTable.id, walletId),
      sql`balance_mxn >= ${montoNum.toFixed(2)}::numeric`,
    ),
  )
  .returning({ id: walletsTable.id });

if (updated.length === 0) {
  throw new Error("INSUFFICIENT_BALANCE");
}
```

The `WHERE balance_mxn >= amount` condition and the `SET balance_mxn = balance_mxn - amount` execute as a single atomic statement. No two transactions can interleave. If two concurrent requests arrive, exactly one will see zero rows returned. No negative balances. No explicit lock required. This is the same pattern used by payment processors at scale.

**Fix 2: Rate Limiting**

```typescript
const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 20,
  message: { error: "Demasiados intentos. Intenta de nuevo en 15 minutos." },
  standardHeaders: true, legacyHeaders: false,
});
const walletLoadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 10,
  message: { error: "Demasiados intentos. Intenta de nuevo en 15 minutos." },
  standardHeaders: true, legacyHeaders: false,
});
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 5,
  message: { error: "Demasiados intentos de OTP. Intenta de nuevo en 15 minutos." },
  standardHeaders: true, legacyHeaders: false,
});

app.post("/api/bills/pay",             paymentLimiter);
app.post("/api/wallet/load/oxxo",      walletLoadLimiter);
app.post("/api/wallet/load/card",      walletLoadLimiter);
app.post("/api/cards/charge-and-save", walletLoadLimiter);
app.post("/api/wallet/transfer",       paymentLimiter);
app.post("/api/otp/send",              otpLimiter);
app.post("/api/auth/start",            otpLimiter);
```

Three separate limiters, not one, because the threat model differs. OTP (5/15 min) is the tightest — every request costs real Twilio money. Payment (20/15 min) is generous enough for a user paying multiple bills in one session while stopping automated scanning. Error messages in Spanish because a Mexican user reading *Demasiados intentos* knows what happened. An HTTP 429 in English is invisible to them.

**Fix 3: Daily AML Cap**

```typescript
const DAILY_BILL_CAP_MXN = 50_000;
try {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const [dailyRow] = await db
    .select({ total: sql<string>`COALESCE(SUM(monto::numeric), 0)` })
    .from(billPaymentsTable)
    .where(
      and(
        eq(billPaymentsTable.telefono, telefono),
        eq(billPaymentsTable.status, "confirmed"),
        gte(billPaymentsTable.createdAt, startOfDay),
      ),
    );
  const todayTotal = parseFloat(dailyRow?.total ?? "0");
  if (todayTotal + montoNum > DAILY_BILL_CAP_MXN) {
    res.status(429).json({
      error: `Límite diario alcanzado. El máximo de pagos por día es $${DAILY_BILL_CAP_MXN.toLocaleString("es-MX")} MXN.`,
    });
    return;
  }
} catch {
  // Non-fatal — don't block payment if daily-cap query fails. Log and proceed.
}
```

`COALESCE(SUM(...), 0)` not a COUNT — the cap is on total pesos, not number of transactions. Non-fatal on DB error: a rare query failure is less damaging than falsely blocking legitimate users.

---

### The Execution Ordering (The Part Most People Miss)

These three fixes are independently useful. But the order they're checked in `POST /api/bills/pay` is itself a design decision:

```
1. Input validation
2. Service catalog lookup
3. Free-tx token pre-validation (fail fast — no DB writes)
4. Wallet balance pre-check (READ only)
5. AML daily cap check (READ only — aggregate query)
6. Provider call (SIPREL → Evoluciona fallback)   ← external money movement starts here
7. Atomic DB transaction: insert bill_payment + debit wallet + consume token
8. Non-blocking side effects: rep commission, WhatsApp receipt, push notification, loyalty points
```

Steps 1–5 are cheap reads. Step 6 is the expensive, irreversible external call. Step 7 is the atomic commit that records what happened. The wallet is never debited before the provider confirms.

The one genuinely hard edge case is the inverse: provider confirms at step 6, DB transaction at step 7 fails. Money left our SIPREL account. User's wallet untouched. We handle this with a reconciliation audit trail:

```typescript
logger.error(
  { serviceId, referencia, telefono, confirmationCode: result.confirmationCode },
  "billpay: DB transaction failed after provider success — MANUAL RECONCILIATION REQUIRED",
);
// Persist outside the failed transaction so we have a record
db.insert(billPaymentsTable).values({ ...status: "confirmed"... })
  .then(([r]) =>
    db.insert(billPaymentAuditTable).values({
      paymentId: r.id,
      event: "wallet_deduction_failed_post_provider_success",
      details: JSON.stringify({ confirmationCode, provider, txError }),
    }),
  )
```

This won't happen often. But when it does, we have the confirmation code, provider name, and a structured audit entry that tells us exactly what to reconcile and why.

**Test results after this session:** 75/75 integration tests passing.

---

## Session 2 — Paula: A 7-Tool AI Agent That Takes Real Financial Actions

### What This Session Shipped

Paula is a Claude-powered AI agent (`claude-sonnet-4-5`) running a tool-use loop across two simultaneous channels: WhatsApp (inbound) and an in-app floating widget. She is not a FAQ bot — she takes real actions against live user data and executes real payments.

### The Design Problem

The naive approach to "add an AI assistant to a fintech app" is a chatbot that describes how to do things. That is useless for underbanked users. The useful version is an agent that *does the thing* — checks the balance, finds the payment history, stages and confirms a real payment — inside the channel the user already lives in.

For WhatsApp specifically: the 2FA confirmation for a payment had to be deterministic (never dependent on the LLM's interpretation) while still being conversational. If a user types "sí" in response to a payment confirmation, that must always execute the payment — regardless of whatever else is happening in the conversation. If the LLM gets confused and decides "sí" means something ambiguous, a real payment fails or misfires.

### The Prompt Architecture

```
Build Paula — a 7-tool Claude agent for PagoYa.

Two deployment surfaces:
1. WhatsApp inbound webhook — any message to the Twilio number routes through Paula
2. In-app floating chat widget — persists across every screen via localStorage session

Tool definitions (each must call a real DB query or API, not mock):
- get_wallet_balance: SELECT balance_mxn FROM wallets WHERE telefono = $1
- get_payment_history: SELECT last 5 from bill_payments WHERE telefono = $1, narrate in Spanish
- get_pending_oxxo: check oxxo_vouchers table for pending deposits
- get_loyalty_points: return points, lifetime total, tier (Bronce/Plata/Oro), points to next tier
- get_deposit_instructions: return OXXO / SPEI / card funding steps based on user's question
- prepare_bill_payment: validate service + reference + balance, stage pendingPayment in session
  with 5-min TTL, return fee-inclusive confirmation summary
- escalate_to_support: log conversation context, send WhatsApp message to human agent

The 2FA confirmation is NOT handled by the LLM. After prepare_bill_payment stages a pending
payment, the WhatsApp webhook checks for "sí"/"no" BEFORE passing the message to the agent
loop. This is deterministic session-layer logic — not Claude. "Sí" always executes. "No" always
cancels. Only if no pendingPayment exists does the message enter the agent loop.

System prompt must:
- Open by telling Paula her user's display name (pulled from Twilio profile)
- Instruct plain-language Spanish — no jargon, no bank-speak
- PRIORITY MÁXIMA: cancel / undo fires immediately at any mention of doubt at any point in flow
- Include escalation threshold: after 2 failed tool calls or 1 out-of-scope question, offer escalation
```

### The Key Engineering Decision: Deterministic 2FA at the Session Layer

```typescript
// WhatsApp webhook — BEFORE agent loop
const pending = await getPendingPayment(telefono);
if (pending) {
  const lower = Body.trim().toLowerCase();
  if (/^(si|sí|yes|simon|simón|sip|órale|ándale|va|dale|confirmar|pagar)/.test(lower)) {
    // Execute payment — deterministic, no LLM involvement
    await executePayment(pending);
    return;
  }
  if (/^(no|nel|cancelar|stop|para|espera|mejor no)/.test(lower)) {
    await clearPendingPayment(telefono);
    await sendWhatsApp(telefono, "❌ Pago cancelado. Tu saldo no fue afectado.");
    return;
  }
  // Ambiguous — loop back to confirmation, still not entering agent loop
  await sendWhatsApp(telefono, "Por favor responde SÍ para confirmar o CANCELAR para anular.");
  return;
}
// No pending payment — normal agent loop
await runAgentLoop(telefono, Body);
```

Paula cannot be tricked into executing or canceling a payment by an ambiguous message. The language model never sees a pending-payment confirmation — by the time the message reaches Claude, the payment is already done or already canceled.

**Pending payment state is DB-persisted with SQL-enforced expiry** — a payment cannot execute against a stale or in-memory pending state. No session restarts, no memory leaks, no "sí to the wrong payment" edge cases.

---

## Session 3 — Stripe Live + Gift Cards: A New Revenue Vertical in One Session

### What This Session Shipped

As of May 31, 2026:
- Stripe live mode active — Mexican and international Visa/Mastercard, no test-mode caveats
- 9-brand digital gift card catalog live: Netflix, Amazon, Google Play, Uber, Uber Eats, Cinépolis, Starbucks, Liverpool, Soriana
- PIN delivery via WhatsApp in seconds via SIPREL/Taecel
- Real-time SKU availability check with automated admin alert when stock drops below 5 units

### The Design Problem

The constraint: Stripe charge confirmation and SIPREL PIN redemption must be decoupled and sequenced. If SIPREL fails after a successful Stripe charge, the user has been charged but has no PIN. The fix is to sequence them — charge first, then call SIPREL — and log any post-charge SIPREL failure to a reconciliation queue. The user is never charged without a delivery attempt.

### The Prompt Architecture

```
Gift card launch — add a new revenue vertical on top of existing infrastructure.

New route: POST /api/gift-cards/purchase
Flow:
1. Real-time SKU check against Taecel catalog before any charge is initiated.
   If unavailable: block and return Spanish-language error. Never charge first.
   Fail-open: Taecel timeout does not block purchase.
2. Accept payment via Stripe (denomination + $25 MXN fee) OR PagoYa wallet (zero commission).
3. Stripe path: create PaymentIntent, confirm, wait for payment_intent.succeeded webhook.
4. SIPREL path: call after Stripe confirmation only. If SIPREL fails post-charge: log to
   gift_card_reconciliation table with Stripe charge ID + user phone. Do not surface to user as
   a charge failure — surface as delivery delay.
5. On success: send PIN via WhatsApp with redemption URL. Paula should know all brands,
   denominations, and redemption URLs — update her system prompt.
6. After every successful fulfillment: check remaining SKU inventory. If < 5 units on any SKU,
   fire WhatsApp alert to admin phone number.

Paula update: prepare_bill_payment tool should now handle gift card purchases. Same 2FA
confirmation flow — SÍ/CANCELAR before charge.
```

### What Made This Possible: Infrastructure That Compounds

The gift card vertical took one session because everything it needed already existed:
- Stripe was already integrated (card top-ups) — adding gift card payments was a new route, not a new integration
- SIPREL was already integrated (bill payments) — gift card PINs use the same provider
- WhatsApp delivery already existed — PIN delivery reused the receipt-sending infrastructure
- Paula's tool-use loop already existed — `prepare_bill_payment` was extended, not rebuilt
- The 2FA confirmation pattern already existed — gift card purchases use the same SÍ/CANCELAR flow

One platform. One wallet. One AI agent. The marginal cost of a new product line is one prompt.

---

## Session 4 — Pre-YC UX Audit: 17-Point Smoke Test, All Fixes in One Pass

### What This Session Shipped

**17/17 smoke tests passing** (June 2, 2026). Key fixes:

| Issue | Fix |
|---|---|
| Paula cancel rule only fired at confirmation step | PRIORITY MÁXIMA fires at any point in any flow — "espera", "me equivoqué", "mejor no" always cancels immediately |
| CURP required on registration form | CURP made optional — client validation skipped if blank, server-side dupe check bypassed when empty |
| Typo tolerance not verified | Smoke-tested: "kiero pagar mi luss", "telemex", "quiero una netfliss" — all route correctly |
| Escalation path not verified | Tested: "quiero hablar con una persona" → WhatsApp handoff confirmed |

### The Design Problem

CURP was the single biggest drop-off point in the registration funnel. Underbanked users in Mexico often don't have their CURP memorized — it's an 18-character alphanumeric code. Making it required was a conversion killer. The fix: optional at signup (Level 1 wallet, $6,000 MXN/month limit), upgradeable later when the user wants Level 2 ($24,000 MXN/month).

### The Prompt Architecture

```
Pre-YC UX audit — fix list. Ship all fixes in this session.

1. Paula cancel rule: currently only fires at confirmation step. Change to PRIORITY MÁXIMA:
   at ANY point in ANY active flow, if user expresses doubt or requests cancel — 
   "espera", "me equivoqué", "mejor no", "olvídalo", "cancela todo" — clear all pending state
   and confirm cancellation. This must fire before any other rule.

2. CURP optional — frontend: in Register.tsx, wrap the CURP validation in 
   `if (curp.trim()) { ...validate... }`. If blank, pass through.
   CURP optional — backend: in streetTeamBonus.ts, remove the required guard on CURP.
   In signupBonusService.ts, skip the CURP duplicate check when curp is blank or undefined.

3. Verify and document: run a 17-point smoke test covering Paula typo tolerance,
   escalation paths, 2FA confirmation, wallet balance display, gift card flow,
   OXXO load, SPEI load, Stripe card charge, rep referral link, OTP send/verify,
   bienvenida screen, lifecycle nudge status, command center access, and
   registration with/without CURP. Report pass/fail for each.
```

### Why CURP Optional Matters

This is not a UX preference. Mexico has 54 million underbanked adults. A meaningful fraction of them are:
- Informal workers who have never been asked for their CURP
- Migrant workers who don't carry identity documents
- Users over 50 in rural areas who were never assigned a CURP digitally

The original requirement said: *provide a government ID code you may not know, or you cannot use the app.* The fix says: *start using the app, add your CURP later when you want higher limits.* That is a conversion decision with real revenue implications.

---

## What This Represents

Four sessions. Four distinct engineering problems. All in production.

The discipline is the same every time:
1. Read the code before writing the prompt — understand failure modes, not just features
2. Write one complete prompt — decompose fully before the agent touches anything
3. Specify ordering explicitly — in financial infrastructure, sequence is correctness
4. Non-blocking side effects — nothing irreversible before you're confident; everything recoverable after

The velocity matters: the infrastructure described across these sessions — atomic wallet debits, a 7-tool AI agent across two deployment surfaces, a nine-brand gift card catalog with real-time inventory, Stripe live card processing, a 2FA confirmation system that is deterministically correct, rate limiting, AML controls, and a 17-point smoke test — was built and shipped by one person without an external engineering team.

We are not describing a roadmap. We are describing what is running in production at pagoyamx.com.

---

*Built by Lloyd Wright using Claude (Anthropic) + Replit Agent. No external development team.*
*PagoYa — pagoyamx.com | Longview Meridian Technologies LLC*
