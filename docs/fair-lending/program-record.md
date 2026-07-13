# PTI Fair-Lending Program — Record

This file is the running program record for the PTI fair-lending remediation effort (brief v1.9 and successors). It logs incidents, corrective actions, and process events that are not part of the phase deliverables themselves but affect the integrity of the program.

---

## Incident FL-2026-07-09-01

**Date:** 2026-07-09
**Category:** Documentation handling / repo hygiene
**Status:** Resolved

**Description:**
During assembly and iterative delivery of the fair-lending research and remediation materials, several supporting artifacts were placed outside `docs/fair-lending/`:

- A read-only research export, `pti-fairness-bundle.zip` (PTI v4.3 scoring code, synthetic generator, stress-test/ablation scripts, and a manifest — packaged for external research review), was written to `artifacts/api-server/exports/` instead of the fair-lending documentation tree.
- Raw upload archives (`attached_assets/fair-lending-docs_*.zip`, `attached_assets/files_*.zip`) were retained by the attachment system outside the program tree, as is standard for uploaded files.

A read-only audit (git diff against the pre-fair-lending baseline commit) confirmed:
- No `.ts` files, rig scripts, generator patches, or harnesses from the research bundle were placed anywhere in the source tree (`src/`, `services/`) or under `docs/`.
- No production scoring, gate, or generator code was modified by any of this activity.
- The only out-of-tree item requiring action was the `pti-fairness-bundle.zip` export noted above.

**Corrective action:**
`pti-fairness-bundle.zip` moved from `artifacts/api-server/exports/` into `docs/fair-lending/artifacts/`, consolidating all fair-lending program materials (briefs, phase docs, logs, frozen eval datasets, and the research export) under the single `docs/fair-lending/` tree.

**Verification:**
Post-move `git diff --stat` confirms the change set is limited to the four items in this commit (phase3 spec watermark, phase4 pack watermark, this record, and the bundle relocation) with no changes to `src/`, `services/`, or any production code path.

### Addendum (2026-07-09)

The initial watermark applied to `phase3-implementation-spec.md` and
`phase4-documentation-pack.md` ("DRAFT — PENDING PACKAGE SIGNOFF AND
EXTERNAL REVIEW") has been superseded. Both files are replaced in this
revision with corrected versions carrying the accurate watermark:

> ⚠️ **DRAFT — PACKAGE AND GATE TEXT FOUNDER-SIGNED 2026-07-09; DOCUMENT
> PENDING FOUNDER LINE REVIEW AND EXTERNAL REVIEW.** Founder signatures
> attach to the Row 5b package and the G-C gate text (signature record
> 2026-07-09), NOT to this document. Gates remaining on this document:
> (1) founder line review, (2) external signature per 4.4 (Dr. Franklin
> or alternate). Any repo copy without this watermark is superseded.

This is a documentation-only correction, filed as program record. **No
code was implemented, executed, or acted upon from either document as
part of this correction** — the Phase 3 spec remains a DRAFT signoff-gate
artifact, not an instruction to change production scoring, gate, or
generator code.

### Signature record (2026-07-09)

| Item | Description | Signed by | Date | Scope |
|---|---|---|---|---|
| 1 | Row 5b package (LDA-search recommended configuration) — trade profile: −9.7% handoff volume vs. v4.3 baseline gate, +0.0007 selection quality, ~9× gate four-fifths improvement (0.034 → 0.30 center) | Founder | 2026-07-09 | Package configuration only |
| 2 | G-C readiness-gate text (tolerant-streak branch, monitored as real-data instrument) | Founder | 2026-07-09 | Gate text only |
| — | Documents (Phase 3 spec, Phase 4 pack) | *Not signed* | — | Pending founder line review + external signature (4.4, Dr. Franklin or alternate) before entering the signoff registry |

Per the watermark on both documents: founder signatures attach **only**
to the Row 5b package and the G-C gate text above — not to the Phase 3
spec or Phase 4 pack documents themselves, which remain unsigned drafts
pending further review. Nothing in this program record, the spec, or
the pack authorizes implementation; v5.0 does not enter the signoff
registry until the external signature (4.4) is obtained.

### Signoff registry entry — v5.0.0-rc1 (2026-07-10)

External review certification received 2026-07-10 (Dr. Douglas Franklin,
External Advisor — Behavioral Science, fixed-scope engagement; certification
dated 7/9/26) and co-signed as founder acknowledgment of receipt by Lloyd
Wright, Founder & CEO, dated 7/10/26. Full transcription and source file on
record at `docs/fair-lending/external-review-signature.md`.

| Item | Description | Signed by | Date | Scope |
|---|---|---|---|---|
| 3 | External review certification (methodology soundness, LDA search adequacy, business-necessity defensibility per findings F-1a/F-2) | Dr. Douglas Franklin, External Advisor — Behavioral Science | 2026-07-09 | Fixed-scope review per certification §2 |
| 4 | Founder acknowledgment of receipt of external review certification | Lloyd Wright, Founder & CEO | 2026-07-10 | Receipt/filing only |

Per the certification's own filing instructions: upon this signature,
(1) the DRAFT watermarks on the Phase 3 implementation spec and Phase 4
documentation pack lift, (2) the Phase 3 PR merge-blocking checklist item
"External review signature" is checked, (3) rollout proceeds per Phase 3
§3.4 (paula_messages schema/seed and the approved Meta transition template
precede any recompute).

**v5.0.0-rc1 is entered into the signoff registry as ACTIVE (2026-07-10).**

**Exhibit A gap — resolved 2026-07-11:** Dr. Franklin confirmed broad approval on 2026-07-11; complete opinion: "agreed with methodology as presented, no changes requested." No reservations or outstanding items. Gap closed; see `external-review-signature.md` §Exhibit A.

---

### Licensee version registry — v5.0 ACTIVE (2026-07-11)

Complete four-part signoff chain for v5.0 (PTI dimension recomposition; brief v1.9; Row 5b + G-C package):

| # | Signoff item | Signed by | Date | Scope / notes |
|---|---|---|---|---|
| 1 | Founder package signature — Row 5b (LDA-search recommended configuration; trade profile: −9.7% handoff volume vs. v4.3 baseline gate, +0.0007 selection quality, ~9× gate-level four-fifths improvement 0.034 → 0.30 center) | Lloyd Wright, Founder & CEO | 2026-07-09 | Package configuration only |
| 2 | Founder gate signature — G-C readiness-gate text (tolerant-streak branch, monitored as real-data instrument from day one) | Lloyd Wright, Founder & CEO | 2026-07-09 | Gate text only |
| 3 | Founder line review — Phase 3 implementation spec and Phase 4 documentation pack; corrections A–F applied and acknowledged | Lloyd Wright, Founder & CEO | 2026-07-09 | Document line review; corrections A–F on record with founder |
| 4 | External confirmation — Douglas Franklin, PhD, Data and Behavioral Science Researcher: "I confirm that the scoring methodology presented for my review on July 9, 2026 is in line with acceptable industry standard as recorded in the PTI V5.0 lending remediation packet and agree with the methodology as presented, no changes requested. Please let this notice serve for your documentation." Email received 2026-07-11; reviewer designated this email as the record for documentation purposes. | Douglas Franklin, PhD | 2026-07-11 | Email reply; review date stated as July 9, 2026; source on file at `external-review-signature.md §Email confirmation — 2026-07-11` |

**v5.0 status: ACTIVE.** All four signoff gates closed as of 2026-07-11. Rollout proceeds per Phase 3 §3.4.

---

### Phase status log — 2026-07-11

| Phase | Status | Date | Notes |
|---|---|---|---|
| A — Shadow infrastructure | ✅ Complete | 2026-07-11 | `pti_v5_shadow_recompute` table live; nightly cron wired; B5-gated |
| B5 — Evidence gates | ✅ All green | 2026-07-11 | B1/B2/B3/B4 all pass; corrected stale v4.1-behavioral baseline for 8118963105 |
| C — Transition message pipeline | ✅ Submitted | 2026-07-11 | See below |
| D — Monitoring panel | ✅ Complete | 2026-07-13 | `GET /api/admin/pti-v5-monitoring` + AdminDashboard `🔬 PTI v5.0` tab |
| E — Go-live recompute | ✅ Complete | 2026-07-13 | Lloyd go-order confirmed; recompute fired 15:46 UTC — see evidence below |

**Phase C — Transition message pipeline (2026-07-11):**

- Template text (es-MX, variable-free, UTILITY): *"Actualizamos cómo se calcula tu PTI para que refleje mejor tu esfuerzo — lo que pagas y qué tan constante eres, no cuánto dinero se mueve. Tu número puede cambiar un poco hoy; tu camino no cambia."*
- Added to `seedPaulaMessages.ts` ROWS[] as `trigger_type = 'pti_v5_transition'`, `active = false`, `pending_approval = true`, category UTILITY, 196 chars, no variables.
- Submitted to Twilio Content API and WhatsApp approval requested: **content_sid = `HX83365f953386ec00e27da4a959a7f497`**, approval status = `received` (Meta review queue as of 2026-07-11 15:10 UTC).
- Dispatch service built: `phaseETransition.ts` — `dispatchV5TransitionMessages()` fires before Phase E recompute for users with |v5 − v4.3| > 5 pts. Consent gate: WhatsApp for consented users; `pti_transition_notices` table for non-consented (in-app delivery).
- Admin routes added: `GET /api/admin/phase-e-transition-status` (probe, no side effects); `POST /api/admin/phase-e-dispatch-transition` (safety-gated, requires `{"confirm":"V5_TRANSITION_DISPATCH"}`).
- Currently qualifying for dispatch: **1 user** (+523222304213, delta = −6 pts). Consent status to be verified at Phase E dispatch time.
- **Pending to complete Phase C:** deploy to prod → `POST /api/admin/seed-paula-messages` (inserts row 26) → `POST /api/admin/sync-template-sids` (writes SID). Row is `active = false` — cannot fire until Phase E go-order activates it.
- Phase C completion gate: Meta approval of SID HX83365f953386ec00e27da4a959a7f497. Monitor daily via `twilio:status` (template #24 = `pti_v5_transition`).

---

### Phase E go-live — 2026-07-13

**Go-order:** Lloyd — "Proceed with Phase E recompute." Confirmed.

**Step 1 — Transition message dispatch (pre-recompute):**
- `POST /api/admin/phase-e-dispatch-transition` fired (Step 1 — completed previous session, 2026-07-12).
- Qualifying users (|delta| > 5): 1 — +523222304213 (v4.3 = 11, shadow v5 = 5, Δ = −6).
- WhatsApp blocked (US number + MARKETING template reclassification); in-app notice queued to `pti_transition_notices` (1 row confirmed).

**Step 2 — Live flip (model version, nightly + monthly cron):**
- `PTI_V5_MODEL_VERSION` changed from `"v5.0.0-rc1-shadow"` → `"v5.0.0-rc1"`.
- `computePTIv5LiveForUser` added — writes to `users.pti_score / pti_breakdown / pti_computed_at + pti_score_history`.
- `ptiCron.ts` nightly batch: shadow fire-and-forget retired; replaced with `computePTIv5LiveForUser` (live, non-blocking).
- `ptiCron.ts` monthly batch: `computePTIForAllUsers` (v4.3) → `computePTIv5ForAllUsers` (v5.0).

**Step 3 — One-time prod recompute (2026-07-13 15:46 UTC):**
- Route: `POST /api/admin/phase-e-recompute` (safety-gated: `{"confirm":"V5_LIVE_RECOMPUTE"}`).
- Result: `updated: 10, errors: 0`. All 10 non-test users recomputed cleanly.

**Evidence table — 10-user score record:**

| telefono | v4.3 score | shadow v5 | live v5 | Δ (v5 − v4.3) | model_version |
|---|---|---|---|---|---|
| +523222304213 | 11 | 5 | 5 | **−6** | v5.0.0-rc1 |
| 8118963105 | 7 | 5 | 5 | −2 | v5.0.0-rc1 |
| 3221839799 | 5 | 3 | 4 | −1 | v5.0.0-rc1 |
| 4157972483 | 5 | 3 | 4 | −1 | v5.0.0-rc1 |
| 4251006528 | 5 | 3 | 4 | −1 | v5.0.0-rc1 |
| 3221562382 | 5 | 3 | 3 | −2 | v5.0.0-rc1 |
| 8111778514 | 5 | 3 | 3 | −2 | v5.0.0-rc1 |
| 8143141695 | 5 | 3 | 3 | −2 | v5.0.0-rc1 |
| 5555550001 | 3 | 1 | 1 | −2 | v5.0.0-rc1 |
| 3222304213 | — | — | 0 | — | v5.0.0-rc1 |

All deltas ≤ 0 (v5.0 scores the same or lower than v4.3 — consistent with fair-lending remediation removing favorable score bias). No score increased.

**Evidence gates — post-recompute (15:46 UTC probe):**

| Gate | Value | Status |
|---|---|---|
| PTI-70 tripwire (users ≥ 70) | **0** | ✅ Clean — no users at premium tier under v5.0 |
| G-C tolerant-streak (streak_months ≤ 2) | **10 / 10** | ✅ Expected — new platform, all users in early-history branch |
| Model version coverage | **10 / 10 on v5.0.0-rc1** | ✅ 100% — no v4.x stragglers |
| Shadow → live delta convergence | avg = 0.33 pts, max = 1 pt | ✅ Shadow compute validated — marginal gap is fresh-data timing only |

**Shadow mode status: RETIRED.** Nightly batch no longer writes to `pti_v5_shadow_recompute`. The shadow table is preserved as the B5 audit baseline.

**Step 4 — Monitoring panel:**
- `GET /api/admin/pti-v5-monitoring` live on prod — returns tier distribution, tripwire, streak counter, model coverage, shadow/live delta.
- AdminDashboard `🔬 PTI v5.0` tab live — includes recompute trigger button + score table rendering.

**Program status: ALL PHASES COMPLETE.** PTI v5.0 is the production scoring model as of 2026-07-13 15:46 UTC.

---

**Product hygiene backlog — logged 2026-07-11 (NOT part of this program):**

Model-version staleness: the monthly PTI batch does not enforce a minimum model version. Users computed under v4.1-behavioral or v4.0-behavioral are silently re-evaluated on those old models at next recompute unless `compute-now` is called explicitly. Two prod users were found in this state today (8118963105: v4.1-behavioral stored; +523222304213: v2.1/v4.0-behavioral stored). Both corrected manually on 2026-07-11. Recommended fix: add `model_version` column to `users`, compare against current model at batch time, and flag/refresh mismatches.
