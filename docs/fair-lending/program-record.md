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
