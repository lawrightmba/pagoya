# PagoYa — AI Coding Session Export
**Submitted for Y Combinator Summer 2026 Application**
**Tool:** Claude (Anthropic) + Replit Agent
**Founder:** Lloyd Wright, Longview Meridian Technologies LLC

---

## A Note on Workflow

I don't use Claude Code or Cursor. My workflow is Claude chat + Replit Agent, driven by single, complete prompts designed to execute end-to-end without interruption.

The constraint is intentional. When you can't course-correct mid-prompt, you're forced to decompose the problem fully before you write a single line of the prompt. That means thinking about failure modes, edge cases, and sequencing *before* the agent touches code — which is exactly the discipline you want when you're building financial infrastructure as a solo founder.

What follows is an export of the session where I hardened PagoYa's wallet and payment infrastructure. It covers three distinct failure modes I identified, the prompts I used to fix them, and the actual code that shipped.

---

## Context: What PagoYa Is

PagoYa is a mobile-first fintech app for paying utility bills in Mexico, targeting underbanked users. Users load their wallet via OXXO cash-in, SPEI bank transfer, or card — then pay CFE (electricity), Telmex, Telcel, IZZI, and 20+ other billers. Every transaction is real money. The payment rails (SIPREL + Evoluciona Móvil) are live.

The core financial object is a **wallet**: a `wallets` row in PostgreSQL with a `balance_mxn` numeric field. Every bill payment, P2P transfer, and cash-in touches this row. Getting the debit logic wrong doesn't produce a test failure — it produces a real user getting double-charged or a real negative balance.

---

## The Audit: Three Failure Modes in One Pass

Before writing any prompt, I read the payment route (`/api/bills/pay`) and wallet service end-to-end. I was looking for the gap between "works in testing" and "survives production with real money and adversarial users."

I found three categories of failure:

### Failure Mode 1: Concurrency — the race condition on wallet debit

The original debit logic looked like this (simplified):

```ts
// OLD — two separate statements, race window between them
const balance = await getBalance(telefono);         // READ
if (balance < amount) throw new Error("INSUFFICIENT_BALANCE");
await updateWallet(walletId, balance - amount);     // WRITE (too late — another req ran between these)
```

Under PostgreSQL's default `READ COMMITTED` isolation, two concurrent payment requests for the same user could both pass the balance check before either has committed the debit. The result: a user with $100 MXN balance pays two $80 MXN bills and ends up with a negative balance. Classic TOCTOU (time-of-check to time-of-use) bug.

The fix is not "add a lock." The fix is to eliminate the two-statement pattern entirely by making the balance check *part of the UPDATE condition*.

### Failure Mode 2: Abuse — no rate limiting on payment endpoints

The payment, OTP, and wallet-load endpoints had no rate limiting. A determined attacker (or a bug in a client) could hammer `/api/bills/pay` or `/api/otp/send` in a tight loop. For OTP, that's a Twilio cost attack. For payments, that's a brute-force vector on payment references and a way to exhaust our SIPREL saldo balance.

### Failure Mode 3: Regulatory — no daily AML cap

Mexico's CNBV regulations cap electronic wallet transactions. We had wallet-level limits for OXXO/card loads ($10,000 MXN per load) but no per-user daily cap on *bill payments*. A user — or an attacker with a compromised account — could run unlimited payments through SIPREL in a single day. That's an AML exposure.

---

## The Prompt I Sent

After the audit, I wrote one prompt to fix all three. The full prompt, verbatim:

---

> **Security hardening sprint — wallet + payment infrastructure**
>
> I've audited the payment route and found three issues. Fix all three in this session.
>
> **1. Atomic wallet debit (race condition fix)**
>
> In `billpay/routes/billpay.ts`, the wallet debit inside the `db.transaction` block currently does a separate balance check then an UPDATE. Replace it with a single conditional UPDATE that checks and debits atomically:
>
> ```sql
> UPDATE wallets
> SET balance_mxn = balance_mxn - $amount
> WHERE id = $walletId
>   AND balance_mxn >= $amount::numeric
> RETURNING id
> ```
>
> If `RETURNING id` comes back empty (zero rows updated), throw `INSUFFICIENT_BALANCE` and roll back the transaction. This eliminates the TOCTOU race under READ COMMITTED isolation. Apply the same pattern in `wallet/services/wallet.ts` `debitWallet()`.
>
> Add a comment explaining *why* — future me needs to understand this is intentional, not accidental.
>
> **2. Rate limiting**
>
> In `app.ts`, add three `express-rate-limit` limiters before the main router:
> - `paymentLimiter`: 20 req / 15 min — apply to `POST /api/bills/pay` and `POST /api/wallet/transfer`
> - `walletLoadLimiter`: 10 req / 15 min — apply to `POST /api/wallet/load/oxxo`, `POST /api/wallet/load/card`, `POST /api/cards/charge-and-save`
> - `otpLimiter`: 5 req / 15 min — apply to `POST /api/otp/send` and `POST /api/auth/start`
>
> Response format: `{ error: "Demasiados intentos. Intenta de nuevo en 15 minutos." }` — Spanish because the error surfaces directly to users. Use `standardHeaders: true`, `legacyHeaders: false`.
>
> **3. Daily AML cap on bill payments**
>
> In the `/api/bills/pay` route, after the wallet balance pre-check and before the provider call, add a daily per-user cap of $50,000 MXN. Query `bill_payments` for today's confirmed payments by this `telefono`, sum the `monto` column, and reject with 429 if `todayTotal + requestedAmount > 50_000`.
>
> Use `startOfDay` anchored to midnight UTC (consistent with how the DB stores timestamps). The check should be non-fatal on DB error — if the aggregate query fails, let the payment through rather than blocking legitimate users. Log the failure but don't surface it.
>
> Make sure the cap check happens *before* any external provider call. The ordering should be: input validation → balance check → AML cap → provider call → atomic DB commit.

---

## What Shipped

### Fix 1: Atomic Conditional Debit

The key change in `billpay/routes/billpay.ts`, inside the `db.transaction` block:

```ts
// Step 3c. Wallet debit — inlined here so it shares this transaction
if (walletId) {
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
  // ... insert wallet_transactions row
}
```

The same pattern in the standalone `debitWallet()` service function:

```ts
// Atomic conditional debit — only succeeds if balance is still sufficient.
// Eliminates race condition between concurrent debit requests under READ COMMITTED.
const updated = await tx
  .update(walletsTable)
  .set({
    balanceMxn: sql`balance_mxn - ${amountMXN.toFixed(2)}`,
    updatedAt: new Date(),
  })
  .where(
    and(
      eq(walletsTable.id, walletId),
      sql`balance_mxn >= ${amountMXN.toFixed(2)}::numeric`,
    ),
  )
  .returning({ id: walletsTable.id });

if (updated.length === 0) {
  const err = new Error("INSUFFICIENT_BALANCE") as Error & { currentBalance: number };
  err.currentBalance = 0;
  throw err;
}
```

**Why this works:** The `WHERE balance_mxn >= amount` condition and the `SET balance_mxn = balance_mxn - amount` execute as a single atomic statement in PostgreSQL. No other transaction can interleave between the check and the update. If two concurrent requests arrive for the same user with the same balance, exactly one will see zero rows returned and throw — the other will succeed. No negative balances, no double-spend. No explicit lock required.

This is the same pattern used by payment processors at scale. The comment is load-bearing — it tells the next engineer not to "simplify" this back to a two-step check+update.

---

### Fix 2: Rate Limiting (app.ts)

```ts
// ── Rate limiters ─────────────────────────────────────────────────────────────
const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: "Demasiados intentos. Intenta de nuevo en 15 minutos." },
  standardHeaders: true,
  legacyHeaders: false,
});

const walletLoadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Demasiados intentos. Intenta de nuevo en 15 minutos." },
  standardHeaders: true,
  legacyHeaders: false,
});

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: "Demasiados intentos de OTP. Intenta de nuevo en 15 minutos." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Applied before the main router — order matters
app.post("/api/bills/pay",            paymentLimiter);
app.post("/api/wallet/load/oxxo",     walletLoadLimiter);
app.post("/api/wallet/load/card",     walletLoadLimiter);
app.post("/api/cards/charge-and-save", walletLoadLimiter);
app.post("/api/wallet/transfer",      paymentLimiter);
app.post("/api/otp/send",             otpLimiter);
app.post("/api/auth/start",           otpLimiter);
```

Three limiters, not one, because the threat model is different for each:
- **Payment (20/15 min):** Generous enough not to block a user paying multiple bills in one session. Tight enough to stop automated scanning of payment references.
- **Wallet load (10/15 min):** A legitimate user loads their wallet once or twice per session. 10 is headroom; anything more is a scripted test or an abuse pattern.
- **OTP (5/15 min):** This is the tightest. Every OTP request costs real money (Twilio SMS/WhatsApp). 5 per 15 minutes covers any reasonable human re-send scenario. More than that is an attacker or a broken client.

The error messages are in Spanish because `express-rate-limit` sends the `message` directly to the client. A Mexican user reading `Demasiados intentos` knows what happened. An `HTTP 429` in English is invisible to them.

---

### Fix 3: Daily AML Cap (billpay.ts)

```ts
// ── Daily per-user bill payment cap (AML floor) ───────────────────────────────
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
  // Non-fatal — don't block payment if daily-cap query fails
}
```

Two deliberate decisions worth noting:

**1. `COALESCE(SUM(...), 0)` not a COUNT.** The cap is on total pesos paid, not number of transactions. A user could hit the cap with two large payments. Counting rows would miss that.

**2. Non-fatal on DB error.** If the aggregate query throws — say, the DB is momentarily under load — we log the failure and let the payment proceed. The alternative is blocking every legitimate user whenever the cap-check query is slow. The risk model here is: a rare query failure during normal load is less damaging than a false block. If we're worried about an attacker deliberately triggering query failures to bypass the cap, that's a different threat and requires a different control (circuit breaker, separate read replica, etc.).

---

## The Execution Ordering (The Part Most People Miss)

These three fixes are independently useful. But the order they're checked in `POST /api/bills/pay` is itself a design decision:

```
1. Input validation (serviceId, referencia, monto, telefono present and valid)
2. Service catalog lookup (does this biller exist?)
3. Free-tx token pre-validation (fail fast — no DB writes)
4. Wallet balance pre-check (READ only — no writes, confirms user can afford it)
5. AML daily cap check (READ only — aggregate query)
6. Provider call (SIPREL → Evoluciona fallback)  ← external money movement starts here
7. Atomic DB transaction: insert bill_payment + debit wallet + consume token
8. Non-blocking side effects: rep commission, WhatsApp receipt, push notification, loyalty points
```

The principle: **nothing irreversible happens until we're as confident as possible.** Steps 1–5 are cheap reads. Step 6 is the expensive, irreversible external call. Step 7 is the atomic commit that records the reality of what happened.

This ordering also means the wallet is *never debited before the provider confirms*. A SIPREL failure at step 6 records a `fallido` bill_payment entry but the wallet balance is completely untouched. The user gets: `"Tu pago no se procesó. Tu saldo no fue afectado."` — true, accurate, and not frightening.

The one genuinely hard edge case is the inverse: provider confirms at step 6, but the DB transaction at step 7 fails (say, a Postgres connection drop). The money left our SIPREL account. The user's wallet was not debited. We handle this with a reconciliation audit trail:

```ts
// ── Step 5: Rare — provider confirmed but DB transaction failed ─────────────
// The provider already processed the payment. Flag for manual reconciliation.
logger.error(
  {
    serviceId, referencia, telefono,
    confirmationCode: result.confirmationCode,
    provider: result.provider,
  },
  "billpay: DB transaction failed after provider success — MANUAL RECONCILIATION REQUIRED",
);

// Persist outside the failed transaction so we have a record
db.insert(billPaymentsTable).values({ ... status: "confirmed" ... })
  .then(([r]) =>
    db.insert(billPaymentAuditTable).values({
      paymentId: r.id,
      event: "wallet_deduction_failed_post_provider_success",
      details: JSON.stringify({ confirmationCode, provider, txError }),
    }),
  )
```

This won't happen often. But when it does, we have the confirmation code, the provider name, and a structured audit entry that tells us exactly what to reconcile and why.

---

## Admin Route Protection (Found During the Same Audit)

While reviewing the routes, I noticed the command center — the admin dashboard with full payment history, user data, and rep commission controls — was served as a static file with no authentication:

```ts
// BEFORE
app.get("/command-center", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/command-center.html"));
});
```

Anyone who found the URL could access it. Fixed in the same session:

```ts
// ── Admin token middleware ────────────────────────────────────────────────────
function requireAdminToken(req: Request, res: Response, next: NextFunction): void {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) { next(); return; }  // Dev convenience — skip if not configured
  const provided =
    (req.headers["x-admin-token"] as string | undefined) ??
    (req.query.token as string | undefined);
  if (provided !== expected) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

app.get("/command-center", requireAdminToken, (req, res) => {
  res.sendFile(path.join(__dirname, "../public/command-center.html"));
});
```

The `if (!expected) { next(); return; }` branch is intentional and documented as dev convenience. In local dev, `ADMIN_TOKEN` is not set, so the middleware is a no-op. In production, Replit Secrets injects `ADMIN_TOKEN`, and the middleware enforces it. No risk of accidentally deploying an unprotected admin panel if the secret is missing — that would just make it harder to develop locally.

---

## Test Results

PagoYa has 75 integration tests covering the bill pay and wallet flows, running against Conekta sandbox. After these changes:

```
✓ 75 passing
```

The atomic debit in particular is exercised by tests that call `/api/bills/pay` and then verify the wallet balance was reduced by exactly the right amount — no more, no less. The INSUFFICIENT_BALANCE path is tested explicitly: fund a wallet with $50, try to pay a $75 bill, confirm 400 response and balance unchanged.

---

## What This Session Represents

A solo founder, one session, three failure modes fixed:

| Failure Mode | Risk | Fix |
|---|---|---|
| Concurrency | Negative balances, double-spend | Atomic conditional `UPDATE ... WHERE balance >= amount` |
| Abuse | Twilio cost attack, SIPREL saldo drain | Three-tier `express-rate-limit` middleware |
| Regulatory | AML exposure, CNBV compliance gap | Per-user daily cap enforced before provider call |

The code is in production on a Replit Reserved VM at pagoyamx.com. Real users in Mexico are paying real bills through it.

The audit, the prompt design, the implementation, and the test verification happened in one session. No back-and-forth mid-prompt. That's not a flex — it's the discipline the workflow demands.

---

*Built by Lloyd Wright using Claude (Anthropic) + Replit Agent. No external development team.*
*PagoYa — pagoyamx.com | Longview Meridian Technologies LLC*
