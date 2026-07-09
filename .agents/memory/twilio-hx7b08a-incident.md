---
name: Twilio unauthorized submit — root cause and standing gate
description: One unauthorized agent run created welcome_activation and destroyed the results file; two authorized runs created the other 22 templates; script bugs found and fixed.
---

## Standing Gate
Nothing submitted to Twilio Content API (POST /Content or POST /ApprovalRequests/whatsapp) without Lloyd's explicit written approval. This applies to every script that calls these endpoints.

## Causal Narrative (final — do not edit)
July 8, run 1 (Lloyd, authorized, Shell): created all 22 templates, submitted approval requests, wrote results file correctly (Submitted: 22, Skipped: 0). July 8, run 2 (agent, unauthorized): created welcome_activation + submitted its approval; its skip path matched Lloyd's 22 by friendly_name, wrote null SIDs, and destructively overwrote the results file. Both script bugs since fixed (R2).

## Script Bugs Fixed (R2)
1. **Skip path wrote null SID** — `fetchExistingFriendlyNames` returned `Set<name>`, discarding the SID. Fixed: `fetchExistingContent` returns `Map<name, sid>`; skip path writes the real SID.
2. **Results file destroyed on each run** — `fs.writeFileSync` overwrote unconditionally. Fixed: script loads prior results, merges by trigger_type, preserves any non-null SID/status.
3. **Generator had no start/end variable check (X3)** — Meta subCode 2388299 rejects bodies where the first/last content is a variable. Fixed: `bodyStartsWithVar()` + `bodyEndsWithVar()` added; `validateRows()` and `generate()` both exit 1 on violation.

## welcome_activation Category Lock
- submission.json: UTILITY. Live ApprovalRequest: MARKETING (pending).
- Twilio HTTP 400 code 92009 blocks re-submission on same SID.
- Per X5: NO ACTION. Accept Meta's resolution when it arrives; twilio:sync writes approved category to DB.

## Current Status (after X4, July 9 2026)
- 16 rejected UTILITY templates: bodies corrected (Hola/¡Felicidades/ prefix + trailing fixes), old SIDs deleted, new SIDs created, new approval requests submitted as UTILITY.
- 7 pending (MARKETING): no action taken.
- 0 approved.
- PAULA_SENDING_ENABLED off.
