# Sprint 6 — Readiness Gate + Handoff Flow
## Replit Agent Prompt | PagoYa | June 2026
## Cut and paste this entire prompt. Do not summarize or skip steps.

---

## Context

You are working on PagoYa, a WhatsApp-native bill payment platform built on
TypeScript / Express 5 / PostgreSQL / Drizzle ORM. Sprints 1–5 are complete
and production. Sprint 6 is the product's punchline — every table, query, and
message should be written as if a SOFOM CTO and a 500 Global partner are going
to see it in a demo next month, because they might be.

Relevant files and tables for this sprint:
- `paulaTriggers.ts` — trigger registry, `evaluateTriggersForUser`, 6h cron batch
- `messageEngine.ts` — `UserContext` interface, `injectVariables`, `buildUserContext`
- `whatsapp-agent.ts` — inbound webhook; already handles `pendingPayment` and
  `pendingP2P` session intercepts for 2FA sí/no flows
- `agentChat.ts` — `buildSystemPrompt` already has literacy and coaching context
- `users` table — has `pti_score`, `consecutive_payment_months`,
  `coaching_responsiveness`, `kyc_full_name`;
  KYC verified = `kyc_full_name IS NOT NULL AND kyc_full_name != ''`
- `paula_send_queue` — has `status`, `sent_at`, `trigger_type`, `telefono`
- `bonus_fraud_flags` — fraud flag records per telefono
- `bill_payments` — `service_type`, `status` columns;
  diversity = COUNT(DISTINCT service_type) WHERE status IN completed states

Do not touch:
- `paula_messages`, `paula_send_queue` processor, dead-letter logic — no changes
- `buildUserContext` or `UserContext` interface — no changes except optional
  readiness fields added in Step 5b below
- `updateCoachingResponsiveness` — no changes
- Any existing trigger evaluation conditions — Sprint 6 adds two new trigger
  blocks and one new table intercept only
- Lines 542–558 of `whatsapp-agent.ts` (`phoneKey` extraction) — no changes

---

## Pre-flight check

Before writing any code, run these queries and paste output:

```sql
-- 1. Confirm none of the new tables exist yet
SELECT table_name FROM information_schema.tables
WHERE table_name IN ('partner_programs', 'readiness_assessments', 'paula_pending_handoffs');

-- 2. Confirm paula_messages has no readiness trigger seeds yet
SELECT trigger_type FROM paula_messages
WHERE trigger_type LIKE 'readiness_%';

-- 3. Confirm fraud flags table name
SELECT table_name FROM information_schema.tables
WHERE table_name LIKE '%fraud%';

-- 4. Spot-check users table — KYC, PTI, diversity basis
SELECT
  COUNT(*) AS total_users,
  COUNT(CASE WHEN kyc_full_name IS NOT NULL AND kyc_full_name != '' THEN 1 END) AS kyc_verified,
  AVG(pti_score) AS avg_pti,
  MAX(pti_score) AS max_pti
FROM users
WHERE is_test_account IS NOT TRUE;

-- 5. Find the admin router file
-- Run this in your shell, not in psql:
-- grep -rn "compliance-summary" artifacts/api-server/src/
-- Paste the matching file path — handoff-requests endpoint goes in the same file.
```

---

## Step 1 — `partner_programs` table + seed

```sql
CREATE TABLE partner_programs (
  id            SERIAL PRIMARY KEY,
  partner_type  VARCHAR(50)  NOT NULL UNIQUE,
  display_name  VARCHAR(100) NOT NULL,
  active        BOOLEAN      NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ  DEFAULT NOW()
);

-- Sprint 6 seed: generic institutional placeholder.
-- Named partners (Konfío, Kueski, etc.) slot in as additional rows later
-- with zero code changes — handoff message pulls display_name at query time.
INSERT INTO partner_programs (partner_type, display_name, active)
VALUES ('microcredito_formal', 'instituciones de microcrédito', true);
```

Verify:
```sql
SELECT id, partner_type, display_name, active FROM partner_programs;
```
Expected: 1 row, `microcredito_formal`, `active = true`.

---

## Step 2 — `readiness_assessments` table

```sql
CREATE TABLE readiness_assessments (
  id                   SERIAL PRIMARY KEY,
  telefono             VARCHAR(20)  NOT NULL,
  assessed_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  -- Overall gate status at time of assessment
  gate_status          VARCHAR(20)  NOT NULL
    CHECK (gate_status IN ('READY', 'APPROACHING', 'NOT_YET')),

  -- Criterion values captured at assessment time (full audit trail)
  pti_score_at         INTEGER,
  streak_days_at       INTEGER,
  bill_diversity_at    INTEGER,
  kyc_verified_at      BOOLEAN,
  fraud_flags_at       INTEGER,
  literacy_score_at    INTEGER,

  -- Numeric gaps to HARD gate (0 = criterion already met)
  -- Stored for gap report generation; ranked by closeness at render time
  gap_pti              INTEGER  NOT NULL DEFAULT 0,   -- points still needed
  gap_streak_days      INTEGER  NOT NULL DEFAULT 0,   -- days still needed
  gap_diversity        INTEGER  NOT NULL DEFAULT 0,   -- categories still needed
  gap_literacy         INTEGER  NOT NULL DEFAULT 0,   -- modules still needed
  -- kyc and fraud have no numeric gap — they are binary pass/fail

  -- Partner reference for handoff message
  partner_program_id   INTEGER REFERENCES partner_programs(id),

  -- Handoff tracking — surfaces in admin dashboard for manual follow-up
  handoff_requested    BOOLEAN      NOT NULL DEFAULT false,
  handoff_at           TIMESTAMPTZ,
  handoff_notes        TEXT,   -- for future use by ops team

  created_at           TIMESTAMPTZ  DEFAULT NOW()
);

-- Admin dashboard and Paula cron lookups
CREATE INDEX idx_readiness_telefono_status
  ON readiness_assessments (telefono, gate_status, assessed_at DESC);

-- Partial index — only indexes the rows ops actually needs to action
CREATE INDEX idx_readiness_handoff
  ON readiness_assessments (handoff_requested, assessed_at DESC)
  WHERE handoff_requested = true;
```

Verify:
```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'readiness_assessments'
ORDER BY ordinal_position;
```
Expected: 17 columns.

---

## Step 3 — `paula_pending_handoffs` table

**Architecture decision — do NOT use the in-memory session store for handoff
state.** The session store is in-memory: a Replit restart between the
`readiness_hard` send and the user's reply would silently lose the pending state.
A user who receives the handoff message, thinks for 20 minutes, then replies
"SÍ" would get no response. The DB table is the correct architecture.
This also eliminates any circular import risk between `ptiCron.ts` and the
session store.

```sql
CREATE TABLE paula_pending_handoffs (
  id                   SERIAL PRIMARY KEY,
  telefono             VARCHAR(20)  NOT NULL UNIQUE,  -- one pending handoff per user
  assessment_id        INTEGER      NOT NULL REFERENCES readiness_assessments(id),
  partner_display_name VARCHAR(100) NOT NULL,
  created_at           TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX idx_pending_handoffs_telefono
  ON paula_pending_handoffs (telefono);
```

**Usage pattern:**
- When `readiness_hard` message is sent → `INSERT ... ON CONFLICT (telefono) DO UPDATE`
- In `whatsapp-agent.ts` handoff intercept → `SELECT WHERE telefono = phoneKey`
- On SÍ or NO reply → `DELETE WHERE telefono = phoneKey`

Do NOT add `pendingHandoff` to the session type. Remove it if you added it.

Verify:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_name = 'paula_pending_handoffs';
```
Expected: 1 row.

---

## Step 4 — Paula message seeds for readiness triggers

Use direct SQL (`db.execute`). Do not use drizzle-kit push for seed data.

```sql
-- Soft gate: "you're almost there"
INSERT INTO paula_messages (trigger_type, template_es, cooldown_days, active)
VALUES (
  'readiness_approaching',
  E'{{nombre}}, estás a punto de alcanzar algo que muy poca gente sin cuenta bancaria logra: un perfil crediticio real. 🎯\n\nTu avance actual:\n📊 PTI {{pti_score}} / 80 necesario\n📅 {{streak_days}} días consecutivos / 90 necesarios\n\nLo más cercano a completar: {{top_gap}}.\n\nSigue así — cada pago es un paso más hacia tu primer crédito formal.',
  14,
  true
)
ON CONFLICT (trigger_type) DO UPDATE
  SET template_es = EXCLUDED.template_es, updated_at = NOW();

-- Hard gate: "you're ready — handoff conversation"
INSERT INTO paula_messages (trigger_type, template_es, cooldown_days, active)
VALUES (
  'readiness_hard',
  E'{{nombre}}, lo lograste. 🏆\n\nHas construido un perfil crediticio real desde cero:\n✅ PTI {{pti_score}} — nivel excelente\n✅ {{streak_days}} días de pagos consecutivos\n✅ {{bill_diversity}} tipos de servicios pagados\n✅ {{literacy_score}} módulos de educación financiera completados\n\nEsto te pone en el perfil que buscan {{partner_display_name}} para un primer microcrédito formal.\n\n¿Te gustaría que te conectáramos con una institución para explorar tus opciones? Responde *SÍ* o *NO*.',
  9999,
  true
)
ON CONFLICT (trigger_type) DO UPDATE
  SET template_es = EXCLUDED.template_es, updated_at = NOW();
```

Verify:
```sql
SELECT trigger_type, cooldown_days, active, LEFT(template_es, 80) AS preview
FROM paula_messages
WHERE trigger_type LIKE 'readiness_%'
ORDER BY trigger_type;
```
Expected: 2 rows, cooldowns 14 and 9999.

---

## Step 5 — Add trigger types to TRIGGER registry in `paulaTriggers.ts`

In the `TRIGGER` const object, add after the `MODULE_UNLOCK_5` line:

```typescript
  // Readiness gate
  READINESS_APPROACHING: "readiness_approaching",
  READINESS_HARD:        "readiness_hard",
```

---

## Step 5b — Extend `UserContext` with optional readiness fields

**Before implementing `readinessGate.ts`, check how `fireTrigger` passes context
to `injectVariables`:**

```bash
grep -n "injectVariables" artifacts/api-server/src/services/messageEngine.ts
grep -n "fireTrigger" artifacts/api-server/src/services/paulaTriggers.ts | head -5
```

If `injectVariables` does `template.replace(/\{\{(\w+)\}\}/g, (_, key) => ctx[key])`
it is already duck-typed and extra keys on the context object work fine.

Regardless of the result: **do NOT use `as unknown as UserContext` casts.**
Instead, add these optional fields to the `UserContext` interface in
`messageEngine.ts`:

```typescript
export interface UserContext {
  // ... all existing fields unchanged ...

  // Optional readiness fields — populated by evaluateTriggersForUser
  // when readiness gate triggers are being evaluated; undefined otherwise
  streak_days?:            number;
  bill_diversity?:         number;
  top_gap?:                string;
  partner_display_name?:   string;
}
```

This is an additive, non-breaking change. All existing code that destructures
`UserContext` is unaffected — optional fields are ignored unless accessed.

---

## Step 6 — `readinessGate.ts` service

Create `artifacts/api-server/src/services/readinessGate.ts`:

```typescript
import { sql } from "drizzle-orm";
import type { UserContext } from "./messageEngine.js";

// ── Hard gate thresholds ───────────────────────────────────────────────────
const HARD_PTI         = 80;
const HARD_STREAK_DAYS = 90;
const HARD_DIVERSITY   = 3;
const HARD_LITERACY    = 3;

// ── Soft gate thresholds (APPROACHING) ────────────────────────────────────
const SOFT_PTI         = 70;
const SOFT_STREAK_DAYS = 60;

export type ReadinessStatus = "READY" | "APPROACHING" | "NOT_YET";

export interface ReadinessResult {
  status:           ReadinessStatus;
  assessmentId:     number;
  partnerProgramId: number;
  partnerDisplayName: string;
  topGapLabel:      string;       // human-readable label for {{top_gap}} in template
  streakDays:       number;       // actual streak days (for {{streak_days}} injection)
  billDiversity:    number;       // actual diversity count (for {{bill_diversity}})
  gaps: {
    pti:        number;
    streakDays: number;
    diversity:  number;
    literacy:   number;
  };
}

type Database = any; // matches existing pattern in codebase

export async function evaluateReadiness(
  db: Database,
  telefono: string,
  ctx: UserContext,
): Promise<ReadinessResult> {
  const tel10 = telefono.replace(/\D/g, "").slice(-10);

  // ── KYC and streak ────────────────────────────────────────────────────────
  const kycRow = await db.execute(sql`
    SELECT
      (kyc_full_name IS NOT NULL AND kyc_full_name != '') AS kyc_verified,
      COALESCE(consecutive_payment_months * 30, 0)        AS streak_days
    FROM users WHERE telefono = ${tel10} LIMIT 1
  `);
  const ku = (kycRow.rows[0] as Record<string, unknown>) ?? {};
  const kycVerified = Boolean(ku.kyc_verified);
  const streakDays  = Number(ku.streak_days ?? 0);

  // ── Fraud flags ───────────────────────────────────────────────────────────
  const fraudRow = await db.execute(sql`
    SELECT COUNT(*) AS flag_count FROM bonus_fraud_flags WHERE telefono = ${tel10}
  `);
  const fraudFlags = Number(
    (fraudRow.rows[0] as Record<string, unknown>)?.flag_count ?? 0
  );

  // ── Bill diversity ────────────────────────────────────────────────────────
  const divRow = await db.execute(sql`
    SELECT COUNT(DISTINCT service_type) AS diversity
    FROM bill_payments
    WHERE telefono = ${tel10}
      AND status IN ('completed', 'success', 'completed_ok', 'confirmed')
  `);
  const billDiversity = Number(
    (divRow.rows[0] as Record<string, unknown>)?.diversity ?? 0
  );

  // ── Partner program ───────────────────────────────────────────────────────
  const partnerRow = await db.execute(sql`
    SELECT id, display_name FROM partner_programs WHERE active = true LIMIT 1
  `);
  const pr = (partnerRow.rows[0] as Record<string, unknown>) ?? {};
  const partnerProgramId   = Number(pr.id ?? 1);
  const partnerDisplayName = String(pr.display_name ?? "instituciones de microcrédito");

  const ptiScore      = ctx.pti_score;
  const literacyScore = ctx.financial_literacy_score;

  // ── Evaluate criteria ──────────────────────────────────────────────────────
  const hardMet = {
    pti:       ptiScore      >= HARD_PTI,
    streak:    streakDays    >= HARD_STREAK_DAYS,
    diversity: billDiversity >= HARD_DIVERSITY,
    kyc:       kycVerified,
    fraud:     fraudFlags    === 0,
    literacy:  literacyScore >= HARD_LITERACY,
  };
  const allHardMet = Object.values(hardMet).every(Boolean);

  const softMet =
    ptiScore    >= SOFT_PTI         &&
    streakDays  >= SOFT_STREAK_DAYS &&
    hardMet.diversity               &&
    hardMet.kyc                     &&
    hardMet.fraud                   &&
    hardMet.literacy;

  const status: ReadinessStatus = allHardMet
    ? "READY"
    : softMet ? "APPROACHING" : "NOT_YET";

  // ── Compute numeric gaps (0 = criterion met) ──────────────────────────────
  const gaps = {
    pti:        Math.max(0, HARD_PTI         - ptiScore),
    streakDays: Math.max(0, HARD_STREAK_DAYS - streakDays),
    diversity:  Math.max(0, HARD_DIVERSITY   - billDiversity),
    literacy:   Math.max(0, HARD_LITERACY    - literacyScore),
  };

  // ── Rank gaps ascending — closest to 0 (but > 0) surfaces first ──────────
  const gapEntries: Array<{ key: string; gap: number; label: string }> = [
    {
      key: "pti", gap: gaps.pti,
      label: `${gaps.pti} punto${gaps.pti !== 1 ? "s" : ""} más de PTI`,
    },
    {
      key: "streakDays", gap: gaps.streakDays,
      label: `${gaps.streakDays} día${gaps.streakDays !== 1 ? "s" : ""} más de pagos consecutivos`,
    },
    {
      key: "diversity", gap: gaps.diversity,
      label: `${gaps.diversity} tipo${gaps.diversity !== 1 ? "s" : ""} de servicio más`,
    },
    {
      key: "literacy", gap: gaps.literacy,
      label: `${gaps.literacy} módulo${gaps.literacy !== 1 ? "s" : ""} educativo${gaps.literacy !== 1 ? "s" : ""} más`,
    },
  ]
    .filter(e => e.gap > 0)
    .sort((a, b) => a.gap - b.gap);

  // Binary criteria appended last — no numeric distance
  if (!hardMet.kyc)   gapEntries.push({ key: "kyc",   gap: 1, label: "completar tu verificación de identidad" });
  if (!hardMet.fraud) gapEntries.push({ key: "fraud",  gap: 1, label: "resolver un registro pendiente de la cuenta" });

  const topGapLabel = gapEntries[0]?.label ?? "mantener tu ritmo de pagos";

  // ── Write assessment row (every evaluation is recorded) ───────────────────
  const insertResult = await db.execute(sql`
    INSERT INTO readiness_assessments (
      telefono, gate_status,
      pti_score_at, streak_days_at, bill_diversity_at,
      kyc_verified_at, fraud_flags_at, literacy_score_at,
      gap_pti, gap_streak_days, gap_diversity, gap_literacy,
      partner_program_id
    ) VALUES (
      ${tel10}, ${status},
      ${ptiScore}, ${streakDays}, ${billDiversity},
      ${kycVerified}, ${fraudFlags}, ${literacyScore},
      ${gaps.pti}, ${gaps.streakDays}, ${gaps.diversity}, ${gaps.literacy},
      ${partnerProgramId}
    )
    RETURNING id
  `);
  const assessmentId = Number(
    (insertResult.rows[0] as Record<string, unknown>).id
  );

  return {
    status,
    assessmentId,
    partnerProgramId,
    partnerDisplayName,
    topGapLabel,
    streakDays,
    billDiversity,
    gaps,
  };
}

export async function getPartnerDisplayName(db: Database): Promise<string> {
  try {
    const r = await db.execute(sql`
      SELECT display_name FROM partner_programs WHERE active = true LIMIT 1
    `);
    return String(
      (r.rows[0] as Record<string, unknown>)?.display_name
      ?? "instituciones de microcrédito"
    );
  } catch {
    return "instituciones de microcrédito";
  }
}
```

---

## Step 7 — Trigger evaluation blocks in `paulaTriggers.ts`

**7a — Add import at top of `paulaTriggers.ts`:**

```typescript
import { evaluateReadiness, getPartnerDisplayName } from "./readinessGate.js";
```

**7b — Add evaluation blocks in `evaluateTriggersForUser`**

Find the EDUCATIONAL TRIGGERS section. After the last `MODULE_UNLOCK` block,
add the READINESS section before the final `return fired;` line:

```typescript
  // ═══════════════════════════════════════════════════════════════════════════
  // READINESS GATE TRIGGERS
  // Evaluated last — most consequential.
  // evaluateReadiness writes an assessment row every evaluation so the admin
  // dashboard has a full history regardless of whether a trigger fires.
  // ═══════════════════════════════════════════════════════════════════════════
  if (totalPaid >= 1) {
    const readiness = await evaluateReadiness(db, telefono, ctx);

    if (readiness.status === "READY") {
      // Hard gate — fires exactly once per user lifetime (cooldown_days = 9999)
      if (!(await onCooldown(db, telefono, TRIGGER.READINESS_HARD, templates))) {
        const enrichedCtx: UserContext = {
          ...ctx,
          streak_days:          readiness.streakDays,
          bill_diversity:       readiness.billDiversity,
          literacy_score:       ctx.financial_literacy_score,
          partner_display_name: readiness.partnerDisplayName,
        };
        await fireTrigger(db, telefono, TRIGGER.READINESS_HARD, enrichedCtx, templates);
        fired++;
      }

    } else if (readiness.status === "APPROACHING") {
      // Soft gate — cooldown 14 days (set in paula_messages seed)
      if (!(await onCooldown(db, telefono, TRIGGER.READINESS_APPROACHING, templates))) {
        const enrichedCtx: UserContext = {
          ...ctx,
          streak_days: readiness.streakDays,
          top_gap:     readiness.topGapLabel,
        };
        await fireTrigger(db, telefono, TRIGGER.READINESS_APPROACHING, enrichedCtx, templates);
        fired++;
      }
    }
  }
```

Note: `literacy_score` is used as a template variable `{{literacy_score}}` in
the `readiness_hard` message. Add it as an optional field to `UserContext` if
not already present (it differs from `financial_literacy_score` only in the
template token name):

```typescript
  literacy_score?: number;  // alias for financial_literacy_score in readiness templates
```

---

## Step 8 — `paula_pending_handoffs` write after `readiness_hard` send

Find the `paulaSendQueue` processor (in `ptiCron.ts` or wherever the send loop
runs). After a `readiness_hard` message is successfully sent (status flipped to
`SENT`), add:

```typescript
// When a readiness_hard message is confirmed sent — write pending handoff to DB
if (row.trigger_type === 'readiness_hard') {
  const latestAssessment = await db.execute(sql`
    SELECT id FROM readiness_assessments
    WHERE telefono = ${row.telefono}
      AND gate_status = 'READY'
    ORDER BY assessed_at DESC LIMIT 1
  `);
  const assessmentId = Number(
    (latestAssessment.rows[0] as Record<string, unknown>)?.id
  );
  if (assessmentId) {
    const partnerName = await getPartnerDisplayName(db);
    await db.execute(sql`
      INSERT INTO paula_pending_handoffs
        (telefono, assessment_id, partner_display_name)
      VALUES
        (${row.telefono}, ${assessmentId}, ${partnerName})
      ON CONFLICT (telefono) DO UPDATE
        SET assessment_id        = EXCLUDED.assessment_id,
            partner_display_name = EXCLUDED.partner_display_name,
            created_at           = NOW()
    `);
  }
}
```

Import `getPartnerDisplayName` from `readinessGate.js` in whatever file the
send processor lives in. No session store access needed — zero circular import risk.

---

## Step 9 — Handoff sí/no intercept in `whatsapp-agent.ts`

Add this intercept block before the `pendingPayment` / `pendingP2P` /
`pendingWithdrawal` checks — handoff reply takes priority:

```typescript
// ── Handoff intercept (DB-backed — survives restarts) ─────────────────────
const handoffRow = await db.execute(sql`
  SELECT assessment_id, partner_display_name
  FROM paula_pending_handoffs
  WHERE telefono = ${phoneKey}
  LIMIT 1
`);
const pendingHandoff = handoffRow.rows[0] as
  { assessment_id: number; partner_display_name: string } | undefined;

if (pendingHandoff) {
  const isYes = /^(sí|si|yes|yep|dale|va|ok|claro|quiero|conecta)$/i
    .test(userMessage.trim());
  const isNo  = /^(no|nel|nope|no\s+gracias|cancelar)$/i
    .test(userMessage.trim());

  if (isYes) {
    // Mark handoff requested on the assessment row
    db.execute(sql`
      UPDATE readiness_assessments
      SET handoff_requested = true, handoff_at = NOW()
      WHERE id = ${pendingHandoff.assessment_id}
    `).catch(() => {});

    // Clear the pending state
    db.execute(sql`
      DELETE FROM paula_pending_handoffs WHERE telefono = ${phoneKey}
    `).catch(() => {});

    const replyText =
      `¡Perfecto! 🎉 Hemos registrado tu solicitud. Alguien del equipo PagoYa ` +
      `se pondrá en contacto contigo en los próximos días para guiarte en el ` +
      `proceso con ${pendingHandoff.partner_display_name}.\n\n` +
      `Mientras tanto, sigue pagando tus servicios a tiempo — eso fortalece ` +
      `aún más tu perfil. 💪`;
    await sendWhatsAppMessage(phoneKey, replyText);
    return;
  }

  if (isNo) {
    // Clear the pending state — user can always ask later
    db.execute(sql`
      DELETE FROM paula_pending_handoffs WHERE telefono = ${phoneKey}
    `).catch(() => {});

    const replyText =
      `Entendido, no hay problema. 😊 Tu perfil sigue aquí — cuando quieras ` +
      `explorar tus opciones, solo dímelo.`;
    await sendWhatsAppMessage(phoneKey, replyText);
    return;
  }

  // User said something unrelated while handoff is pending — do NOT clear it.
  // Fall through to normal Paula routing so the handoff offer stays open.
}
```

---

## Step 10 — Admin endpoint: handoff requests

**First, find the admin router file:**
```bash
grep -rn "compliance-summary" artifacts/api-server/src/
```
Open that file. Add the handoff-requests endpoint immediately after the
compliance-summary handler — same router, same file, no new router file.

```typescript
// GET /api/admin/handoff-requests
// Users who replied SÍ to the readiness_hard message — ops follow-up queue
router.get("/handoff-requests", adminAuth, async (_req: Request, res: Response) => {
  try {
    const rows = await db.execute(sql`
      SELECT
        ra.id                AS assessment_id,
        ra.telefono,
        u.kyc_full_name      AS nombre,
        ra.gate_status,
        ra.pti_score_at,
        ra.streak_days_at,
        ra.bill_diversity_at,
        ra.literacy_score_at,
        ra.handoff_at,
        pp.display_name      AS partner_display_name,
        ra.handoff_notes
      FROM readiness_assessments ra
      LEFT JOIN users          u  ON u.telefono  = ra.telefono
      LEFT JOIN partner_programs pp ON pp.id     = ra.partner_program_id
      WHERE ra.handoff_requested = true
      ORDER BY ra.handoff_at DESC
      LIMIT 100
    `);
    res.json({ handoff_requests: rows.rows, count: rows.rows.length });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch handoff requests" });
  }
});
```

Also add a handoff count to the existing compliance-summary endpoint:

```typescript
// In the existing compliance-summary handler, add this query alongside the others:
const handoffCount = await db.execute(sql`
  SELECT COUNT(*) AS cnt FROM readiness_assessments WHERE handoff_requested = true
`);
// Add to the response object:
// handoff_requests_pending: Number((handoffCount.rows[0] as any)?.cnt ?? 0)
```

---

## Step 11 — Restart and verify startup clean

Restart the server. Confirm:
- All services start without TypeScript errors
- `paulaSendQueue processor registered (every 2min)` still appears in startup log
- No migration errors in DB logs

---

## Step 12 — Acceptance tests

Run all six. Paste output.

**12a — Tables exist with correct column counts:**
```sql
SELECT table_name, COUNT(*) AS column_count
FROM information_schema.columns
WHERE table_name IN ('partner_programs', 'readiness_assessments', 'paula_pending_handoffs')
GROUP BY table_name
ORDER BY table_name;
```
Expected: `partner_programs = 5`, `paula_pending_handoffs = 5`,
`readiness_assessments = 17`.

**12b — Partner seed row:**
```sql
SELECT id, partner_type, display_name, active FROM partner_programs;
```
Expected: 1 row, `microcredito_formal`, `active = true`.

**12c — Paula message seeds:**
```sql
SELECT trigger_type, cooldown_days, active, LEFT(template_es, 80) AS preview
FROM paula_messages
WHERE trigger_type LIKE 'readiness_%'
ORDER BY trigger_type;
```
Expected: 2 rows, cooldowns 14 and 9999.

**12d — Dry-run hard gate query:**
```sql
SELECT
  u.telefono,
  u.pti_score,
  COALESCE(u.consecutive_payment_months * 30, 0) AS streak_days,
  (SELECT COUNT(DISTINCT service_type)
   FROM bill_payments bp
   WHERE bp.telefono = u.telefono
     AND bp.status IN ('completed','success','completed_ok','confirmed')) AS diversity,
  (u.kyc_full_name IS NOT NULL AND u.kyc_full_name != '')                AS kyc_verified,
  (SELECT COUNT(*) FROM bonus_fraud_flags bff WHERE bff.telefono = u.telefono) AS fraud_flags,
  (SELECT COUNT(*) FROM paula_trigger_log ptl
   WHERE ptl.telefono = u.telefono
     AND ptl.trigger_type LIKE 'module_unlock_%')                        AS literacy
FROM users u
WHERE u.is_test_account IS NOT TRUE
  AND u.pti_score >= 80
  AND COALESCE(u.consecutive_payment_months * 30, 0) >= 90
ORDER BY u.pti_score DESC
LIMIT 10;
```
Expected: zero or more rows depending on real user data. Confirms query syntax valid.

**12e — Dry-run soft gate (APPROACHING) query:**
```sql
SELECT
  u.telefono,
  u.pti_score,
  COALESCE(u.consecutive_payment_months * 30, 0) AS streak_days
FROM users u
WHERE u.is_test_account IS NOT TRUE
  AND u.pti_score >= 70
  AND u.pti_score <  80
  AND COALESCE(u.consecutive_payment_months * 30, 0) >= 60
ORDER BY u.pti_score DESC;
```
Expected: zero or more rows. Confirms approaching cohort is queryable.

**12f — Admin handoff endpoint:**
```bash
curl -s -H "X-Admin-Key: $ADMIN_KEY" http://localhost:8080/api/admin/handoff-requests
```
Expected: `{"handoff_requests":[],"count":0}` — empty but valid JSON.

---

## What Does NOT Change in Sprint 6

- `paula_messages` seeds for Sprints 1–5 — no changes
- `paula_send_queue` processor dead-letter / cooldown logic — no changes
- `buildUserContext` — no changes (readiness fields are injected at trigger
  evaluation time, not at context-build time)
- `updateCoachingResponsiveness` — no changes
- Existing trigger evaluation conditions — OPTED_OUT gate, all module unlock
  blocks, all payment/lifecycle triggers — no changes
- `agentChat.ts` / `buildSystemPrompt` — no changes
- Lines 542–558 of `whatsapp-agent.ts` — no changes

---

## Sprint 6 Acceptance Criteria Checklist

- [ ] `partner_programs` table with 1 seed row (`microcredito_formal`)
- [ ] `readiness_assessments` table with 17 columns and 2 indexes
- [ ] `paula_pending_handoffs` table with 5 columns — DB-backed, not session-backed
- [ ] `readiness_approaching` and `readiness_hard` seeds in `paula_messages`
- [ ] `READINESS_APPROACHING` and `READINESS_HARD` in TRIGGER registry
- [ ] Optional readiness fields added to `UserContext` interface — no `as unknown as` casts
- [ ] `readinessGate.ts` — evaluates 6 criteria, computes ranked gaps, writes assessment row, returns `ReadinessResult`
- [ ] `getPartnerDisplayName` exported from `readinessGate.ts`, importable without circular dependency
- [ ] Evaluation blocks in `evaluateTriggersForUser` — APPROACHING (14d cooldown) and HARD (9999 cooldown), evaluated after all module unlock blocks
- [ ] `paula_pending_handoffs` row written after `readiness_hard` message confirmed sent
- [ ] Handoff sí/no intercept in `whatsapp-agent.ts` — DB lookup, not session lookup; SÍ sets `handoff_requested = true`; NO clears pending row; unrelated messages fall through without clearing
- [ ] `GET /api/admin/handoff-requests` returns valid JSON, uses same router/file as compliance-summary
- [ ] `handoff_requests_pending` count added to compliance-summary response
- [ ] Server restarts clean, zero TypeScript errors
- [ ] All 6 acceptance tests pass

---

## Sprint 7 Preview (do not build yet)

**Option B responsiveness upgrade:**
- `linked_send_queue_id` FK added to `paula_inbound_log` (nullable, zero migration cost)
- Last-seen outbound pointer stored per user for precise reply attribution

**Named partner expansion:**
- Additional rows in `partner_programs` (Konfío, Kueski, Credijusto) — zero code changes
- Partner-specific handoff message variant using `partner_type` as template selector

**Paula inbound NLP:**
- Intent classification on `paula_inbound_log.message_body`
- Feeds `coaching_responsiveness` detection with higher signal fidelity

Do not build any of this in Sprint 6.
