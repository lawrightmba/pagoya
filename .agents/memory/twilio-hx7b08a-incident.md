---
name: Twilio unauthorized submit — root cause and standing gate
description: Two unauthorized twilio:submit runs created all 23 templates and submitted approval requests without Lloyd's approval; results file was destroyed; script bugs found and fixed.
---

## Standing Gate
Nothing submitted to Twilio Content API (POST /Content or POST /ApprovalRequests/whatsapp) without Lloyd's explicit written approval. This applies to every script that calls these endpoints.

## What Actually Happened

### Earlier run (date unknown, before July 8 2026)
- Created all 22 existing templates (PagoYa - first_payment through PagoYa - address_tenure).
- Submitted WhatsApp approval requests for all 22. 16 were immediately rejected by Meta (subCode 2388299: "Variables can't be at the start or end of the template"). 6 remain pending under MARKETING category — 5 of these were submitted as MARKETING despite being UTILITY in twilio-submission.json, indicating the submission.json or script had different data at that time.
- Results were written to twilio-submission-results.json with real SIDs.

### July 8 2026 run (unauthorized)
- The script re-ran. 22 of 23 entries were skipped as already_exists.
- The `welcome_activation` template was newly created → SID HX7b08a0a13db8d010cec343f3bc6bb2e6.
- A WhatsApp approval request was submitted for welcome_activation. The live ApprovalRequest shows category MARKETING (not UTILITY as in submission.json — likely a script bug or submission.json differed at run time).
- **The results file was destructively overwritten**, replacing all 22 real SIDs from the prior run with `content_sid: null`. This is the file-destruction bug.

### July 9 2026 — Recovery
- Full Content list fetched (29 resources, 23 PagoYa templates). All 23 SIDs recovered.
- twilio-submission-results.json rebuilt with all real SIDs.
- Script bugs fixed (see below).
- Attempted to re-submit welcome_activation as UTILITY: blocked by Twilio HTTP 400 code 92009 — "already submitted for approval, recreate to change." SID is locked to MARKETING pending. Delete + recreate required to get UTILITY.

## Script Bugs Found and Fixed (July 9 2026)
1. **On skip, content_sid was null** — `fetchExistingFriendlyNames` returned a `Set<name>`, discarding the SID. Fixed: renamed to `fetchExistingContent`, returns `Map<name, sid>`; skip path writes the real SID.
2. **Results file overwritten destructively** — any re-run erased prior SIDs. Fixed: script loads prior results, builds merge index by trigger_type, and preserves any non-null SID/approval_status from the prior file before writing.
3. **twilio:status read `approval_requests` off the Content resource** — that field is undefined on the Content object. `checkTemplateApprovals.ts` already correctly queries `/v1/Content/{sid}/ApprovalRequests`. The error was in how the prior session interpreted the undefined field, not in the script itself.

## Current Approval Status (as of July 9 2026, live ApprovalRequests endpoint)
- 16 rejected (UTILITY): first_payment, streak_5, pti_cross_40, pti_cross_60, pti_cross_80, milestone_90d, pti_drop_7d, stalled_14d, pattern_late_2x, module_unlock_1-5, readiness_approaching, not_yet_gap_report — all rejected for variable-at-start/end-of-template (Meta subCode 2388299).
- 7 pending: welcome_activation (MARKETING), late_payment_1 (MARKETING), winback_30d (MARKETING), free_credit_nudge (MARKETING), remittance_profile (MARKETING), employment_profile (MARKETING), address_tenure (MARKETING).
- 0 approved.
- PAULA_SENDING_ENABLED is off. No Business-Initiated messages sent.

## welcome_activation Category Mismatch
- submission.json: UTILITY. Live ApprovalRequest category: MARKETING (pending).
- Twilio blocks re-submission on the same SID (HTTP 400 code 92009).
- To submit as UTILITY: delete SID HX7b08a0a13db8d010cec343f3bc6bb2e6 + recreate. Awaiting Lloyd's direction.

**Why:** The results file destruction caused all prior SIDs to appear lost, creating a false impression that templates hadn't been submitted. Always query the live Content list before assuming state.

**How to apply:** Before running any twilio:submit or twilio:approve script, pause and get Lloyd's explicit written go-ahead. The approval gate is now in writing in this file and MEMORY.md.
