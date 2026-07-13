---
name: PTI v5.0 Phase C — transition message pipeline
description: Phase C build state, SID, pending_approval seed pattern, dispatch service, and what still needs to land in prod.
---

## What was built (2026-07-11)

**Template:** `pti_v5_transition`
- Text (es-MX, variable-free): "Actualizamos cómo se calcula tu PTI para que refleje mejor tu esfuerzo — lo que pagas y qué tan constante eres, no cuánto dinero se mueve. Tu número puede cambiar un poco hoy; tu camino no cambia."
- 196 chars, submitted as UTILITY, **Meta auto-reclassified to MARKETING** on approval
- Submitted to Twilio Content API: **SID = HX83365f953386ec00e27da4a959a7f497**
- Approval status: **APPROVED** (2026-07-12); `allow_category_change: true` confirmed Meta changed it
- Prod `paula_messages.template_category` corrected to MARKETING on 2026-07-12
- **MARKETING category blocker:** US numbers (e.g. +523222304213) receive Twilio error 63049; that user falls to `pti_transition_notices` in-app fallback at Phase E dispatch

**Seed changes (seedPaulaMessages.ts):**
- `PAULA_MESSAGES_TOTAL_IN_SEED`: 25 → 26
- `VARIABLES_SCHEMA`: added `"pti_v5_transition": {}` (empty — variable-free)
- `ROWS[]`: new entry `active: false, pending_approval: true` — between address_tenure and readiness_hard_step2
- `SeedRow` interface: added `pending_approval?: boolean` field
- Generator (`generateTwilioSubmission.ts`): updated to `ROWS.filter(r => r.active || r.pending_approval)` so pending-approval rows are included in Twilio submission even when active=false

**Dispatch service:** `artifacts/api-server/src/services/phaseETransition.ts`
- `dispatchV5TransitionMessages()` — called at Phase E, BEFORE recompute
- Finds users where |pti_v5_total − pti_score| > 5 (currently 1: +523222304213, delta=−6)
- Consent gate: WhatsApp (enqueueWhatsApp) for consented; `pti_transition_notices` table for non-consented
- Idempotent: skips already-queued rows
- `getTransitionDispatchStatus()` — read-only probe

**Admin routes (artifacts/api-server/src/routes/index.ts):**
- `GET /api/admin/phase-e-transition-status` — probe, no side effects
- `POST /api/admin/phase-e-dispatch-transition` — safety gate: `{"confirm":"V5_TRANSITION_DISPATCH"}` required

## What still needs to land in prod

The prod server (pagoyamx.com) is on the old deployed version (25 rows, no pti_v5_transition row). After deploy:

1. `POST /api/admin/seed-paula-messages` — inserts row 26 into prod `paula_messages` (active=false)
2. `POST /api/admin/sync-template-sids` with body `{"templates":[{"trigger_type":"pti_v5_transition","content_sid":"HX83365f953386ec00e27da4a959a7f497","approved_category":"UTILITY"}]}` — writes SID to prod row

Do BOTH after deploy is confirmed.

## Phase E activation sequence (when go-order arrives)

1. Verify `content_sid` is in prod: `GET /api/admin/phase-e-transition-status`
2. Dispatch: `POST /api/admin/phase-e-dispatch-transition` with `{"confirm":"V5_TRANSITION_DISPATCH"}`
3. Set active=true: flip `pti_v5_transition` to `active: true` in ROWS[] and re-seed
4. Run v5.0 recompute (flips live scores — detailed route TBD at go-order)
5. Monitoring panel live in same deploy (Phase D)

**Why:** Spec §3.4 requires dispatch BEFORE recompute so no score change is visible without the context message preceding it.
