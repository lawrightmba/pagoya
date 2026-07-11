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
| 4 | External signature — Dr. Douglas Franklin, External Advisor (Behavioral Science, fixed-scope engagement): methodology soundness, LDA search adequacy, business-necessity defensibility (findings F-1a/F-2); broad approval confirmed 2026-07-11; complete opinion: "agreed with methodology as presented, no changes requested" | Dr. Douglas Franklin | 2026-07-09 (cert date) · confirmed 2026-07-11 | Fixed-scope review per certification §2; Exhibit A resolved — see `external-review-signature.md` |

**v5.0 status: ACTIVE.** All four signoff gates closed as of 2026-07-11. Rollout proceeds per Phase 3 §3.4.
