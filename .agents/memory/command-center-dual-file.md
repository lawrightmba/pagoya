---
name: Command center dual-file sync
description: Two copies of command-center.html exist; api-server serves its own copy, not pagoya's
---

The command center HTML lives in two places:
- `artifacts/pagoya/public/command-center.html` — the source of truth (edit here)
- `artifacts/api-server/public/command-center.html` — what the api-server actually serves at `/command-center`

**Why:** api-server `app.ts` serves `../public` as static files, which resolves to `artifacts/api-server/public/`. The pagoya Vite dev server also serves its own `public/` as static files, making a separate copy.

**How to apply:** After every session that edits command-center.html, run:
```bash
cp artifacts/pagoya/public/command-center.html artifacts/api-server/public/command-center.html
```
Failure to sync means the live served file will be stale/outdated.
