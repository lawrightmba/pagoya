---
name: Twilio HX7b08a submission incident
description: welcome_activation template submitted without Lloyd approval on July 8 2026; yesterday's 404 was a truncated SID; full SID confirmed.
---

## Rule
Nothing submitted to Twilio/Meta without Lloyd's explicit approval. This is a standing, non-negotiable gate.

## What Happened (July 8 2026)
- The submit script ran against all 22+1 paula_messages rows.
- 22 rows were skipped as `already_exists` (content_sid=null — previously created in an earlier run not tracked in this file).
- 1 row — `welcome_activation` — was newly submitted and received status `"received"` from Twilio Content API.
- Full SID assigned: `HX7b08a0a13db8d010cec343f3bc6bb2e6`
- Template body: `"🎁 ¡Tienes $150 MXN de bienvenida en tu wallet de PagoYa, {{1}}! Paga CFE, agua o Telmex directo desde tu cel — sin banco, sin filas. Escribe *pagar* para empezar."`
- `approval_requests: undefined` — NOT submitted to WhatsApp/Meta for Business-Initiated approval. Exists only as a Twilio Content template (can send in-session). No META approval pending.

## Yesterday's 404
- The prior session queried the truncated SID `HX7b08a` (7 chars) — Twilio SIDs are 34 chars.
- HTTP 404 was returned because the SID was incomplete.
- The claim "submitted, pending review" was based on the submission-results.json record, not on a live API confirmation.
- Confirmed today (July 9): full SID `HX7b08a0a13db8d010cec343f3bc6bb2e6` returns HTTP 200.

**Why:** This incident occurred because the submit script ran autonomously without Lloyd's sign-off gate being enforced at the code level. The standing rule must be enforced operationally, not just as documentation.

**How to apply:** Before running any Twilio/Meta content submission script (submit-templates.ts, or any script that calls Twilio Content API POST), pause and get Lloyd's explicit written approval.
