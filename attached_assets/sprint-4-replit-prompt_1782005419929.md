# Sprint 4 — Paula Variable Expansion + Literacy Tracking
## Replit Agent Prompt | PagoYa | June 2026
## Cut and paste this entire prompt. Do not summarize or skip steps.

---

## Context

You are working on PagoYa, a WhatsApp-native bill payment platform built on
TypeScript / Express 5 / PostgreSQL / Drizzle ORM. The relevant files for this
sprint are:

- `paulaTriggers.ts` — trigger evaluation cron (6-hour batch)
- `messageEngine.ts` — `UserContext` interface + `injectVariables` + `loadMessageTemplates` + `buildUserContext`
- `agentChat.ts` — Paula WhatsApp agent, contains `buildSystemPrompt`
- PostgreSQL DB — tables: `users`, `paula_messages`, `paula_trigger_log`, `paula_send_queue`

Sprints 1–3 are complete and production. Do not touch:
- `paula_trigger_log` schema
- `paula_send_queue` schema or processor
- Dead-letter / cooldown logic
- Trigger evaluation conditions for `module_unlock_2` through `module_unlock_5`
- Any existing `buildSystemPrompt` content — Sprint 4 is additive only

This sprint has 5 deliverables and a strict migration order. Follow the order
exactly. Do not proceed to step N+1 until step N is complete and confirmed.

---

## Pre-flight check

Before writing any code, run these two queries and paste the output as a comment
so I can verify the starting state:

```sql
-- 1. Confirm current module seeds in paula_messages
SELECT trigger_type, cooldown_days, LEFT(template_es, 60) AS preview
FROM paula_messages
WHERE trigger_type LIKE 'module_unlock_%'
ORDER BY trigger_type;

-- 2. Confirm coaching_responsiveness column does NOT exist yet
SELECT column_name FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'coaching_responsiveness';
```

---

## Migration Order — follow exactly

### Step 1 — Seed `module_unlock_1` into `paula_messages`

Module 1 is missing from the DB. It fires early (PTI < 30, after first payment)
and frames the entire literacy journey. Add it now before wiring the trigger.

```sql
INSERT INTO paula_messages (trigger_type, cooldown_days, template_es)
VALUES (
  'module_unlock_1',
  9999,
  '{{nombre}}, cada pago que haces en PagoYa es un registro permanente de tu responsabilidad financiera. Eso se llama historial de crédito — y los bancos lo usan para decidir a quién le prestan. Tú estás construyendo el tuyo desde hoy. El siguiente paso: mantener la racha.'
)
ON CONFLICT (trigger_type) DO UPDATE
  SET template_es = EXCLUDED.template_es,
      updated_at  = NOW();
```

Verify: `SELECT trigger_type, cooldown_days FROM paula_messages WHERE trigger_type = 'module_unlock_1';`
Expected: one row, `cooldown_days = 9999`.

---

### Step 2 — `ALTER TABLE users` — add `coaching_responsiveness`

```sql
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS coaching_responsiveness VARCHAR(20)
    NOT NULL DEFAULT 'UNKNOWN'
    CHECK (coaching_responsiveness IN ('ENGAGED', 'PASSIVE', 'OPTED_OUT', 'UNKNOWN'));
```

Verify: `SELECT column_name, column_default, is_nullable FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'coaching_responsiveness';`
Expected: column exists, default `'UNKNOWN'`, not nullable.

No detection logic in this sprint. All existing users get `UNKNOWN` by default.
The update pathway (ENGAGED / PASSIVE / OPTED_OUT) is Sprint 5.

---

### Step 3 — Add `MODULE_UNLOCK_1` to the `TRIGGER` registry in `paulaTriggers.ts`

Find the `TRIGGER` const object (or equivalent enum/registry). Add at the top of
the Educational section:

```typescript
MODULE_UNLOCK_1: "module_unlock_1",   // ← add this line
MODULE_UNLOCK_2: "module_unlock_2",
// ... rest unchanged
```

No other changes to `paulaTriggers.ts` in this step.

---

### Step 4 — Add Module 1 evaluation block in `evaluateTriggersForUser`

Find the Educational trigger evaluation section in `evaluateTriggersForUser`.
Add the Module 1 block **before** the Module 2 block:

```typescript
// Module 1 — PTI < 30, fires after first payment
// "Welcome to your credit journey" — frames everything that follows
// cooldown_days = 9999 in DB, fires exactly once per user lifetime
if (
  totalPaid >= 1 &&
  ptiScore < 30 &&
  !(await onCooldown(db, telefono, TRIGGER.MODULE_UNLOCK_1, templates))
) {
  await fireTrigger(db, telefono, TRIGGER.MODULE_UNLOCK_1, ctx, templates);
  fired++;
}
```

Positioning note: this fires in the first week, after the `first_payment`
achievement trigger, before any PTI threshold message. It must come before the
Module 2 block in evaluation order.

Do not modify any other evaluation blocks.

---

### Step 5 — Extend `buildUserContext` in `messageEngine.ts`

Add two derived fields and one fetched field. All three come from sources already
accessed in `buildUserContext` — this is additive only.

**5a — `financial_literacy_score` (derived, COUNT from `paula_trigger_log`)**

Add to the existing query block or as a separate query:

```typescript
const literacyCountResult = await db.execute(sql`
  SELECT COUNT(*) AS literacy_score
  FROM paula_trigger_log
  WHERE telefono = ${telefono}
    AND trigger_type LIKE 'module_unlock_%'
`);
const financial_literacy_score = Number(
  (literacyCountResult.rows[0] as any)?.literacy_score ?? 0
);
```

**5b — `modules_unlocked` (derived, ordered list from `paula_trigger_log`)**

Separate lightweight query — cannot be merged into the COUNT above:

```typescript
const modulesResult = await db.execute(sql`
  SELECT trigger_type
  FROM paula_trigger_log
  WHERE telefono = ${telefono}
    AND trigger_type LIKE 'module_unlock_%'
  ORDER BY fired_at ASC
`);
const modules_unlocked: string[] = (
  modulesResult.rows as Array<{ trigger_type: string }>
).map(r => r.trigger_type);
```

**5c — `coaching_responsiveness` (fetched from `users` row)**

The user row is already fetched in `buildUserContext`. Add to the return object:

```typescript
coaching_responsiveness: userRow.coaching_responsiveness ?? 'UNKNOWN',
```

**5d — Return all three in the `UserContext` object:**

```typescript
return {
  // ... all existing fields unchanged ...
  financial_literacy_score,
  modules_unlocked,
  coaching_responsiveness: userRow.coaching_responsiveness ?? 'UNKNOWN',
};
```

---

### Step 6 — Extend `UserContext` interface in `messageEngine.ts`

Add the three new fields to the `UserContext` interface:

```typescript
export interface UserContext {
  // ... existing fields unchanged ...
  financial_literacy_score: number;    // 0–5, count of fired module_unlock_% triggers
  modules_unlocked: string[];          // ordered: ['module_unlock_1', 'module_unlock_2', ...]
  coaching_responsiveness: string;     // 'ENGAGED' | 'PASSIVE' | 'OPTED_OUT' | 'UNKNOWN'
}
```

No changes to `injectVariables` — it is token-agnostic. `{{financial_literacy_score}}`
and `{{modules_unlocked}}` are now available in any future message template
automatically.

---

### Step 7 — Extend `buildSystemPrompt` in `agentChat.ts`

**7a — Add three new optional parameters to the function signature:**

```typescript
function buildSystemPrompt(
  profileName?: string | null,
  ptiTier?: string | null,
  ptiScore?: number | null,
  lang?: "es" | "en" | null,
  ptiBreakdown?: Record<string, Record<string, number>> | null,
  consecutivePaymentMonths?: number | null,
  ptiTrend?: string | null,
  // Sprint 4 additions:
  financialLiteracyScore?: number | null,
  modulesUnlocked?: string[] | null,
  coachingResponsiveness?: string | null,
): string
```

**7b — Add the `literacyContext` block after the existing `creditCoachingContext`
block (or at the end of the prompt assembly, before the final return):**

```typescript
// --- Sprint 4: Literacy + Responsiveness Context ---
const MODULE_LABELS: Record<string, string> = {
  module_unlock_1: "¿Qué es un historial de crédito?",
  module_unlock_2: "Cómo funciona el crédito en México",
  module_unlock_3: "Buró de Crédito — mitos y realidades",
  module_unlock_4: "Qué buscan los bancos",
  module_unlock_5: "Primera solicitud de crédito formal",
};

let literacyContext = "";
if (financialLiteracyScore != null) {
  const completed = (modulesUnlocked ?? []).map(k => MODULE_LABELS[k] ?? k);
  const completedStr = completed.length > 0
    ? completed.join(", ")
    : "ninguno aún";
  const remaining = 5 - financialLiteracyScore;

  literacyContext =
    `\n\nPROGRESO EDUCATIVO DEL USUARIO: Ha completado ${financialLiteracyScore} de 5 ` +
    `módulos de educación financiera Paula. ` +
    `Módulos completados: ${completedStr}. ` +
    (remaining > 0
      ? `Le faltan ${remaining} módulos — se desbloquean automáticamente al subir su PTI. `
      : `Ha completado el curriculum completo — está listo para una evaluación de crédito formal. `) +
    `Cuando hagas coaching educativo, construye sobre lo que ya sabe — no repitas conceptos ` +
    `que ya aprendió. Si pregunta sobre algo cubierto en un módulo que YA completó, ` +
    `puedes decirle "como ya aprendiste..." y avanzar.`;

  if (coachingResponsiveness === "OPTED_OUT") {
    literacyContext +=
      ` IMPORTANTE: Este usuario ha optado por no recibir mensajes proactivos de Paula — ` +
      `responde solo a sus preguntas directas, nunca inicies coaching no solicitado.`;
  } else if (coachingResponsiveness === "PASSIVE") {
    literacyContext +=
      ` Este usuario recibe mensajes pero raramente responde — sé conciso, ` +
      `no hagas preguntas de seguimiento encadenadas.`;
  } else if (coachingResponsiveness === "ENGAGED") {
    literacyContext +=
      ` Este usuario responde activamente a los mensajes de Paula — puedes hacer ` +
      `preguntas de seguimiento y profundizar en coaching cuando sea relevante.`;
  }
}
// Append to the prompt string before return:
// prompt += literacyContext;
```

Make sure `literacyContext` is appended to the final prompt string before the
`return` statement. Do not replace any existing prompt content.

---

### Step 8 — Wire new params into `agentChat.ts` DB fetch + `buildSystemPrompt` call

Find the section in `agentChat.ts` (around the block that builds the system
prompt call — typically after fetching the user row and PTI data) and add:

**8a — Fetch `financial_literacy_score` from `paula_trigger_log`:**

```typescript
const literacyResult = await db.execute(sql`
  SELECT COUNT(*) AS literacy_score
  FROM paula_trigger_log
  WHERE telefono = ${userTelefono}
    AND trigger_type LIKE 'module_unlock_%'
`);
const financialLiteracyScore = Number(
  (literacyResult.rows[0] as any)?.literacy_score ?? 0
);
```

**8b — Fetch `modules_unlocked` from `paula_trigger_log`:**

```typescript
const modulesResult = await db.execute(sql`
  SELECT trigger_type
  FROM paula_trigger_log
  WHERE telefono = ${userTelefono}
    AND trigger_type LIKE 'module_unlock_%'
  ORDER BY fired_at ASC
`);
const modulesUnlocked = (
  modulesResult.rows as Array<{ trigger_type: string }>
).map(r => r.trigger_type);
```

**8c — `coaching_responsiveness` is already in the user row.** Read it directly:

```typescript
const coachingResponsiveness = userRow?.coaching_responsiveness ?? 'UNKNOWN';
```

**8d — Pass all three to `buildSystemPrompt`:**

```typescript
const systemPrompt = buildSystemPrompt(
  // ... all existing args unchanged, in existing order ...
  financialLiteracyScore,   // ← new
  modulesUnlocked,          // ← new
  coachingResponsiveness,   // ← new
);
```

---

### Step 9 — Restart and verify startup clean

Restart the server. Confirm:
- All 7 services start without TypeScript errors
- `paulaSendQueue processor registered (every 2min)` appears in startup log
- No new errors in the DB migration logs

---

### Step 10 — Acceptance tests

Run all four. Paste output.

**10a — Module 1 seed confirmed:**
```sql
SELECT trigger_type, cooldown_days, LEFT(template_es, 80) AS preview
FROM paula_messages
WHERE trigger_type = 'module_unlock_1';
```
Expected: one row, `cooldown_days = 9999`, preview starts with `{{nombre}}, cada pago`.

**10b — `coaching_responsiveness` column confirmed:**
```sql
SELECT coaching_responsiveness, COUNT(*) FROM users GROUP BY coaching_responsiveness;
```
Expected: one row — `UNKNOWN | <total user count>`.

**10c — `buildUserContext` returns literacy fields:**

Manually call `buildUserContext` for any test user telefono (or add a temporary
`GET /api/debug/user-context/:telefono` endpoint that returns the full context
object as JSON). Confirm the response includes:
```json
{
  "financial_literacy_score": 0,
  "modules_unlocked": [],
  "coaching_responsiveness": "UNKNOWN"
}
```
(Values will be 0 / [] / UNKNOWN for users with no module fires yet — that is correct.)

**10d — `literacyContext` appears in prompt:**

For a user who has fired at least one module trigger (check `paula_trigger_log`
for any `trigger_type LIKE 'module_unlock_%'` row), confirm that `buildSystemPrompt`
produces a string containing `PROGRESO EDUCATIVO DEL USUARIO`. Log the prompt
to console temporarily if needed, then remove the log line.

---

## What Does NOT Change in Sprint 4

- `paula_trigger_log` schema
- `paula_send_queue` schema or processor
- Dead-letter / cooldown logic
- `module_unlock_2` through `module_unlock_5` evaluation conditions
- `module_unlock_2` through `module_unlock_5` seeds in `paula_messages`
- Any existing content in `buildSystemPrompt` — additive only
- `injectVariables` function — already token-agnostic, no changes needed

---

## Sprint 4 Acceptance Criteria Checklist

- [ ] `module_unlock_1` seeded in `paula_messages` with `cooldown_days = 9999`
- [ ] `MODULE_UNLOCK_1` added to `TRIGGER` registry in `paulaTriggers.ts`
- [ ] Module 1 evaluation block fires when `totalPaid >= 1 AND ptiScore < 30`, positioned before Module 2 block
- [ ] `users.coaching_responsiveness` column exists, `NOT NULL DEFAULT 'UNKNOWN'`, CHECK constraint on 4 values
- [ ] `UserContext` interface has `financial_literacy_score: number`, `modules_unlocked: string[]`, `coaching_responsiveness: string`
- [ ] `buildUserContext` derives `financial_literacy_score` and `modules_unlocked` from `paula_trigger_log` (no stored column)
- [ ] `buildUserContext` reads `coaching_responsiveness` from user row
- [ ] `buildSystemPrompt` accepts 3 new optional params, appends `literacyContext` block without modifying existing prompt content
- [ ] `agentChat.ts` fetches all 3 new fields and passes them to `buildSystemPrompt`
- [ ] Server restarts clean, zero TypeScript errors
- [ ] All 4 acceptance test queries pass

---

## Sprint 5 Preview (do not build yet)

Sprint 5 adds:
- Durable inbound message log (`paula_inbound_log` table) — persists every user reply to Paula
- `coaching_responsiveness` update logic — flips to ENGAGED / PASSIVE / OPTED_OUT based on inbound log analysis
- STOP handler — sets `OPTED_OUT` immediately on keyword detection
- Module content delivery review — confirm all 5 modules rendering correctly end-to-end in WhatsApp

Do not build any of this in Sprint 4.
