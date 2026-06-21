# Sprint 5 — Inbound Message Log + Coaching Responsiveness Detection
## Replit Agent Prompt | PagoYa | June 2026
## Cut and paste this entire prompt. Do not summarize or skip steps.

---

## Context

You are working on PagoYa, a WhatsApp-native bill payment platform built on
TypeScript / Express 5 / PostgreSQL / Drizzle ORM. Sprints 1–4 are complete
and production. The relevant files for this sprint are:

- `whatsapp-agent.ts` — inbound WhatsApp webhook handler (`POST /api/whatsapp-agent`)
- `paulaTriggers.ts` — 6-hour trigger evaluation cron + `evaluateTriggersForUser`
- `users` table — has `coaching_responsiveness VARCHAR(20) DEFAULT 'UNKNOWN'`
- `paula_send_queue` table — has `sent_at TIMESTAMPTZ`, `telefono`, `trigger_type`, `status`
- `paula_trigger_log` table — has `telefono`, `trigger_type`, `fired_at`

Do not touch:
- `paula_messages`, `paula_send_queue` processor, dead-letter logic
- `buildUserContext` or `buildSystemPrompt` — already read `coaching_responsiveness`
  from the users row; Sprint 5 just starts populating it with real values
- Any trigger evaluation conditions — Sprint 5 adds one suppression gate only
- Lines 542–550 of `whatsapp-agent.ts` extract `phoneKey`, `userMessage`, and
  timestamp — do not modify that extraction logic

This sprint has 4 deliverables and a strict build order. Follow the order exactly.

---

## Pre-flight check

Before writing any code, run these queries and paste output:

```sql
-- 1. Confirm paula_inbound_log does NOT exist yet
SELECT table_name FROM information_schema.tables
WHERE table_name = 'paula_inbound_log';

-- 2. Confirm coaching_responsiveness column exists with correct default
SELECT column_name, column_default, character_maximum_length
FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'coaching_responsiveness';

-- 3. Spot-check paula_send_queue has sent_at populated for recent sends
SELECT telefono, trigger_type, status, sent_at
FROM paula_send_queue
WHERE status = 'SENT'
ORDER BY sent_at DESC
LIMIT 5;
```

---

## Step 1 — Create `paula_inbound_log` table

```sql
CREATE TABLE paula_inbound_log (
  id              SERIAL PRIMARY KEY,
  telefono        VARCHAR(20) NOT NULL,
  received_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  message_body    TEXT,
  message_length  INTEGER,

  -- Sprint 6 upgrade path: link to the outbound message this was replying to
  -- Add later: linked_send_queue_id INTEGER REFERENCES paula_send_queue(id)
  -- No migration cost — column is nullable by design when added

  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Fast lookup for the detection query: all messages for a user, time-ordered
CREATE INDEX idx_inbound_log_telefono_time
  ON paula_inbound_log (telefono, received_at DESC);
```

Verify:
```sql
SELECT table_name, column_name
FROM information_schema.columns
WHERE table_name = 'paula_inbound_log'
ORDER BY ordinal_position;
```
Expected: 5 columns — `id`, `telefono`, `received_at`, `message_body`,
`message_length`, `created_at`.

---

## Step 2 — 3-line fire-and-forget INSERT in `whatsapp-agent.ts`

Find lines 542–550 where `phoneKey`, `userMessage`, and a timestamp are already
extracted. Immediately after that block (before the session/routing logic), add:

```typescript
// Paula inbound log — fire-and-forget, same pattern as paula_interaction events
db.execute(sql`
  INSERT INTO paula_inbound_log (telefono, received_at, message_body, message_length)
  VALUES (
    ${phoneKey},
    NOW(),
    ${userMessage ?? null},
    ${userMessage ? userMessage.length : null}
  )
`).catch(() => {}); // never block the response on log failure
```

**Rules for this insert:**
- Fire-and-forget only — `.catch(() => {})` swallows errors silently
- Never `await` it — must not delay the WhatsApp response
- `userMessage` may be undefined for media messages — use `?? null` defensively
- Do not modify `phoneKey` extraction or anything above/below this insertion point

Verify by sending a test WhatsApp message to the bot, then:
```sql
SELECT telefono, received_at, message_length
FROM paula_inbound_log
ORDER BY received_at DESC
LIMIT 3;
```
Expected: your test message appears as a row.

---

## Step 3 — `coaching_responsiveness` detection in the Paula cron

Add a detection function and call it from the 6-hour Paula trigger batch.
This runs **after** trigger evaluation — it does not affect whether triggers fire,
only what value `coaching_responsiveness` holds for the next session.

### 3a — Detection logic

Signal definitions:
- `OPTED_OUT` — user sent "STOP", "BAJA", "CANCELAR", or "NO MESSAGES" (case-insensitive). Set immediately on keyword match. Never overridden by ENGAGED or PASSIVE once set.
- `ENGAGED` — user replied within 24 hours of at least one Paula outbound message (joined via `paula_send_queue.sent_at`)
- `PASSIVE` — at least 3 Paula outbound messages sent AND zero replies within 24h of any of them
- `UNKNOWN` — fewer than 3 outbound messages sent (not enough signal yet)

### 3b — Detection query (run per user in batch, or as a single UPDATE for all users)

Preferred: single batch UPDATE across all users at end of cron run.

```typescript
async function updateCoachingResponsiveness(db: Database): Promise<void> {
  // Step 1: Set OPTED_OUT for users who sent a stop keyword
  // Check paula_inbound_log for stop-keyword messages
  await db.execute(sql`
    UPDATE users
    SET coaching_responsiveness = 'OPTED_OUT'
    WHERE coaching_responsiveness != 'OPTED_OUT'
      AND telefono IN (
        SELECT DISTINCT telefono
        FROM paula_inbound_log
        WHERE LOWER(message_body) IN ('stop', 'baja', 'cancelar', 'no messages')
      )
  `);

  // Step 2: Set ENGAGED for users who replied within 24h of a Paula outbound send
  await db.execute(sql`
    UPDATE users
    SET coaching_responsiveness = 'ENGAGED'
    WHERE coaching_responsiveness NOT IN ('OPTED_OUT', 'ENGAGED')
      AND telefono IN (
        SELECT DISTINCT i.telefono
        FROM paula_inbound_log i
        INNER JOIN paula_send_queue q
          ON q.telefono = i.telefono
          AND q.status = 'SENT'
          AND i.received_at BETWEEN q.sent_at AND q.sent_at + INTERVAL '24 hours'
      )
  `);

  // Step 3: Set PASSIVE for users with 3+ outbound messages and zero 24h replies
  await db.execute(sql`
    UPDATE users
    SET coaching_responsiveness = 'PASSIVE'
    WHERE coaching_responsiveness = 'UNKNOWN'
      AND telefono IN (
        -- Has 3+ sent Paula messages
        SELECT telefono FROM paula_send_queue
        WHERE status = 'SENT'
        GROUP BY telefono
        HAVING COUNT(*) >= 3
      )
      AND telefono NOT IN (
        -- But zero replies within 24h of any outbound
        SELECT DISTINCT i.telefono
        FROM paula_inbound_log i
        INNER JOIN paula_send_queue q
          ON q.telefono = i.telefono
          AND q.status = 'SENT'
          AND i.received_at BETWEEN q.sent_at AND q.sent_at + INTERVAL '24 hours'
      )
  `);
}
```

### 3c — Call from the Paula cron

Find where the 6-hour Paula trigger batch finishes its per-user loop. After the
loop completes (not inside it), add:

```typescript
// Update coaching responsiveness for all users based on inbound reply patterns
await updateCoachingResponsiveness(db);
console.log('[Paula cron] coaching_responsiveness updated');
```

---

## Step 4 — OPTED_OUT suppression gate in trigger evaluation

Find `evaluateTriggersForUser` in `paulaTriggers.ts`. At the very top of the
function, before any trigger condition is evaluated, add:

```typescript
// Suppression gate: never fire proactive triggers for opted-out users
// Paula still responds to direct inbound messages — this only suppresses
// outbound trigger-initiated messages
if (ctx.coaching_responsiveness === 'OPTED_OUT') {
  return 0; // fired count = 0, log nothing
}
```

`ctx` is the `UserContext` object already passed into `evaluateTriggersForUser`.
`coaching_responsiveness` is already in `UserContext` from Sprint 4.

This is the only change to trigger evaluation logic in Sprint 5.

---

## Step 9 — Restart and verify startup clean

Restart the server. Confirm:
- All services start without TypeScript errors
- `paulaSendQueue processor registered (every 2min)` still appears in startup log
- No migration errors in DB logs

---

## Step 10 — Acceptance tests

Run all five. Paste output.

**10a — Table exists with correct columns:**
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'paula_inbound_log'
ORDER BY ordinal_position;
```
Expected: 6 columns with correct types.

**10b — Inbound log is capturing messages:**
```sql
SELECT COUNT(*), MIN(received_at), MAX(received_at)
FROM paula_inbound_log;
```
Expected: COUNT > 0 if any test messages were sent during build. If zero,
send a WhatsApp message to the bot now and re-run — should appear within seconds.

**10c — OPTED_OUT suppression query dry run:**
```sql
-- Preview which users would be set to OPTED_OUT (should be zero in test)
SELECT DISTINCT telefono
FROM paula_inbound_log
WHERE LOWER(message_body) IN ('stop', 'baja', 'cancelar', 'no messages');
```
Expected: zero rows (no real STOP messages yet). Confirms query syntax is valid.

**10d — ENGAGED detection dry run:**
```sql
-- Preview ENGAGED candidates: users who replied within 24h of a Paula send
SELECT DISTINCT i.telefono
FROM paula_inbound_log i
INNER JOIN paula_send_queue q
  ON q.telefono = i.telefono
  AND q.status = 'SENT'
  AND i.received_at BETWEEN q.sent_at AND q.sent_at + INTERVAL '24 hours'
LIMIT 10;
```
Expected: zero or more rows depending on real reply activity. Confirms join syntax.

**10e — `coaching_responsiveness` distribution after cron run:**
```sql
SELECT coaching_responsiveness, COUNT(*)
FROM users
GROUP BY coaching_responsiveness
ORDER BY COUNT(*) DESC;
```
Expected: mostly `UNKNOWN` at this point (few users have 3+ outbound messages yet).
Any `ENGAGED` rows confirm detection is working for active users.

---

## What Does NOT Change in Sprint 5

- `paula_messages` — no changes
- `paula_send_queue` processor — no changes
- Dead-letter / cooldown logic — no changes
- `buildUserContext` or `UserContext` interface — no changes
  (`coaching_responsiveness` is already fetched from the users row)
- `buildSystemPrompt` — no changes
  (already handles all 4 responsiveness values from Sprint 4)
- Trigger evaluation conditions for any trigger type — no changes except
  the OPTED_OUT suppression gate added at the top of `evaluateTriggersForUser`

---

## Sprint 5 Acceptance Criteria Checklist

- [ ] `paula_inbound_log` table exists with 6 columns and index on `(telefono, received_at DESC)`
- [ ] Fire-and-forget INSERT in `whatsapp-agent.ts` at lines 542–550 — never awaited, never blocks response
- [ ] Test WhatsApp message appears in `paula_inbound_log` within seconds of send
- [ ] `updateCoachingResponsiveness()` function exists, runs 3 sequential UPDATEs in correct priority order (OPTED_OUT → ENGAGED → PASSIVE)
- [ ] `updateCoachingResponsiveness()` called at end of 6-hour cron loop, after per-user evaluation
- [ ] OPTED_OUT suppression gate at top of `evaluateTriggersForUser` — returns 0 immediately, logs nothing
- [ ] Server restarts clean, zero TypeScript errors
- [ ] All 5 acceptance test queries pass

---

## Sprint 6 Preview (do not build yet)

Sprint 6 is the readiness gate + handoff flow:
- `readiness_assessments` table
- 6-criteria gate: PTI ≥ 80, streak ≥ 90 days, bill diversity ≥ 3, KYC verified,
  no fraud flags, `financial_literacy_score` ≥ 3
- Gap report generator — personalized path for NOT_YET users
- Handoff conversation flow in Paula
- Partner referral tracking

Sprint 6 also includes the Option B upgrade path for inbound log:
- `linked_send_queue_id` FK added to `paula_inbound_log` (nullable, zero migration cost)
- Last-seen outbound pointer on users for precise reply attribution

Do not build any of this in Sprint 5.
