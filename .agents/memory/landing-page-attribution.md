---
name: Landing-page + rep attribution write paths
description: How signup attribution (rep code + landing page) is captured and the conflict-path pitfall
---

# Attribution write paths

- Entry pathname is captured once per session in the web app shell (`sessionStorage` key `pagoya_landing_page`) and sent in the signup payload as `landing_page`; server sanitizes (must start with `/`, ≤200 chars) and stores in `users.landing_page`.
- Rep codes are resolved through `resolveRepAttribution` (validates against active reps; invalid → ERROR log + raw code stored with organic source). Never hardcode `whatsapp_organic`/`WEB` at a write site.

**Why:** WS1 bug (July 2026) — WhatsApp flow captured the rep code in session but the insert hardcoded WEB/whatsapp_organic, silently dropping attribution.

**How to apply:** Every user-creation path uses `.onConflictDoNothing()`, so a pre-existing partial row (e.g. the signup pre-create before OTP) SWALLOWS insert values. Any new attribution-ish column must also be written in the conflict-branch backfill UPDATEs (whatsapp-agent registerWhatsAppUser + streetTeamBonus verify-bonus-otp), guarded so real attribution (non-WEB ref codes, non-NULL landing_page) is never overwritten.
