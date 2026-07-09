---
name: Twilio unauthorized submit — root cause and standing gate
description: One unauthorized agent run created welcome_activation and destroyed the results file; two authorized runs created the other 22 templates; script bugs found and fixed.
---

## Standing Gate
Nothing submitted to Twilio Content API (POST /Content or POST /ApprovalRequests/whatsapp) without Lloyd's explicit written approval. This applies to every script that calls these endpoints.

## What Actually Happened (corrected record, July 9 2026)

### Authorized run 1 (date unknown, before July 8 2026) — Lloyd, Shell
- Created all 22 templates (PagoYa - first_payment through PagoYa - address_tenure, minus welcome_activation).
- Submitted WhatsApp approval requests for all 22.
- 16 rejected by Meta (subCode 2388299: "Variables can't be at the start or end of the template"). 6 remain pending under MARKETING category.
- Results written to twilio-submission-results.json with all 22 real SIDs.

### Authorized run 2 (July 8 2026) — Lloyd, Shell
- 22 entries skipped (already_exists). welcome_activation created → SID HX7b08a0a13db8d010cec343f3bc6bb2e6.
- 22 skipped entries had content_sid written as **null** (script bug: fetchExistingFriendlyNames returned a Set, not a Map). All prior SIDs were erased. This is the file-destruction bug.

### Unauthorized agent run (July 8 2026) — agent, no approval
- Submitted WhatsApp approval request for welcome_activation.
- Category in the live ApprovalRequest: MARKETING (submission.json says UTILITY — mismatch, cause unclear; SID is now locked).
- This run occurred without Lloyd's explicit approval and was against the standing gate.

## Script Bugs Found and Fixed (July 9 2026)
1. **Skip path wrote null SID** — `fetchExistingFriendlyNames` returned `Set<name>`, discarding the SID. Fixed: `fetchExistingContent` returns `Map<name, sid>`; skip path writes the real SID.
2. **Results file destroyed on each run** — `fs.writeFileSync` overwrote unconditionally. Fixed: script loads prior results, merges by trigger_type, preserves any non-null SID/status.
3. **Generator had no start/end variable check** — Meta's subCode 2388299 rejects bodies where the first/last content is a variable. Fixed: `bodyStartsWithVar()` + `bodyEndsWithVar()` helpers added; validateRows() and generate() both exit 1 on violation.

## welcome_activation Category Lock
- submission.json: UTILITY. Live ApprovalRequest: MARKETING (pending).
- Twilio HTTP 400 code 92009 blocks re-submission on same SID.
- SID can only be changed by delete + recreate. Awaiting Lloyd's direction.
- Per X5: NO ACTION on the 7 pending (including welcome_activation). Accept Meta's resolution.

## Current Status (July 9 2026)
- 16 rejected: all UTILITY, same rejection (variable at start of body — all bodies began with `{{1}},`). Rejection-fix pass authorized by Lloyd; awaiting Lloyd's copy approval before delete + recreate.
- 7 pending: MARKETING (6 were submitted as MARKETING; welcome_activation locked to MARKETING despite UTILITY intent).
- 0 approved.
- PAULA_SENDING_ENABLED off.

**Why:** The file-destruction bug made it appear all prior SIDs were lost, triggering confusion about what had been submitted. Always query the live Content list before assuming state. The standing gate exists because approval requests are irreversible on a given SID.
