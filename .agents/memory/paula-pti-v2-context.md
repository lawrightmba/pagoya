---
name: buildPTIv2PaulaContext service
description: Sprint 9 Part B — read-only Paula coaching context service; key API facts, stance matrix, prompt section conventions, and agentChat.ts integration pattern.
---

# buildPTIv2PaulaContext — Sprint 9 / Part B

## Location
`artifacts/api-server/src/services/buildPTIv2PaulaContext.ts`

## What it does
Fetches shadow behavioral profile, Evidence Depth, and Expected Obligations for one user.
Returns `PTIv2PaulaContextResult` — either `{ available: true, ... }` or `{ available: false }`.
On any error → `{ available: false }`. Never writes to any table.

## Key API facts

**`buildPTIv2PaulaContext(telefono)`** — async, exported, DB-backed.
Calls three read-only services in parallel:
1. `buildShadowBehavioralProfile(telefono)` — from ptiV2Shadow.ts
2. `buildPTIv2Profile(telefono)` — from ptiV2.ts (for evidence_depth.band + trajectory.dimensions)
3. `buildExpectedObligations(telefono)` — from ptiV2.ts

**`renderPTIv2PromptSection(ctx)`** — pure function, exported.
Returns empty string when `ctx.available === false`. Includes both delimiters.
PROHIBICIONES block mentions "PR, CFR, BS" — the `/\bPR\b/` test regex will false-positive on it.

**Prompt delimiters:**
- Open: `--- PTI V2 COACHING CONTEXT (investigación interna — no citar nombres técnicos) ---`
- Close: `--- FIN PTI V2 COACHING CONTEXT ---`

## Coaching stance matrix

| normalized_score | ED band | Stance |
|-----------------|---------|--------|
| ≥ 60 | HIGH | `confident_reinforce` |
| ≥ 60 | MODERATE or LOW | `acknowledge_and_build` |
| < 60 | HIGH | `coach_directly` |
| < 60 | MODERATE or LOW | `encourage_habits` |
| either INSUFFICIENT_DATA | any | `continue_modules` |

## agentChat.ts integration

`buildSystemPrompt` is now `export function buildSystemPrompt(...)` (exported).
11th positional parameter: `ptiV2Context?: PTIv2PaulaContextResult | null`.
Route handler adds `ptiV2CoachingCtx` block after the coaching_responsiveness try/catch (~line 830).
`buildSystemPrompt` call passes `ptiV2CoachingCtx` as 11th arg.

**Why:** `financialLiteracyScore`, `modulesUnlocked`, `coachingResponsiveness` are declared inside
the `if (telefono)` block but used in the `buildSystemPrompt` call outside it — pre-existing TS scope
issue (not introduced by Sprint 9, test runner is tsx/esbuild which bypasses strict TS checks).

## Critical API trap: computeBehavioralTrajectory

`computeBehavioralTrajectory(currentBreakdown, historyRows, referenceTime)` takes THREE args.
The return value IS the `PTIv2DimensionTrajectories` object directly (the dimensions map).
It does NOT return `{ dimensions: ... }`. Access `result.payment_reliability` directly.

**Why:** This burned Sprint 9 tests. The existing ptiV2.test.ts shows the correct call pattern:
`computeBehavioralTrajectory(bd, historyRows, REF)` where `bd = computePTIv5(snap).breakdown`.

## Test files
- `archetypeFixtures.ts` — 10 archetypes + BANKED_EQUIVALENT; V5_MODEL_VERSION constant
- `archetypeInvariants.test.ts` — 12 invariant groups, 132 tests total
- `archetypeReport.ts` — standalone tsx report generator (no DB)
- `paulaPTIv2Context.test.ts` — Part B pure-function tests

## FAIR-BANK note
BANKED_EQUIVALENT = CASH_FIRST_CONSISTENT snap with SPEI load fields + kycVerified=true.
Shadow formula explicitly ignores: `daysToFirstSpei`, `speiLoadCount`, `oxxoLoadCount`,
`cardLoadCount`, `kycVerified`, `kycTier`. Shadow scores must be byte-identical.
