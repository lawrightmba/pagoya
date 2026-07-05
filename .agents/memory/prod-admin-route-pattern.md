---
name: Production DB write pattern via one-off admin routes
description: How to safely write/update production data (e.g. paula_messages) when no migration/seed tooling exists for it
---

Production writes to tables like `paula_messages` go through a temporary, narrowly-scoped admin route, never direct prod SQL execution for anything beyond read-only verification.

**Why:** There's no safe drizzle-kit push path to prod (see db-migrations.md), and one-off admin routes give an auditable, testable, revertible path gated by a shared secret.

**How to apply:**
1. Add a narrowly-scoped POST route under `/admin/*` in `artifacts/api-server/src/routes/index.ts`, gated by `x-admin-key` header checked against `process.env.ADMIN_TOKEN ?? process.env.ADMIN_SECRET_KEY` (single global secret, shared dev/prod).
2. Restart the workflow, test locally with `curl localhost:PORT/api/admin/...` + `$ADMIN_TOKEN`.
3. Call `suggest_deploy()` — this only surfaces a UI prompt, it does NOT deploy automatically.
4. Explicitly ask the user (via user_query) to confirm they clicked publish, and cross-check with the "Published your App" checkpoint before assuming new code is live. Code committed after a publish click will NOT be in that build — causally deploying immediately after editing without this confirmation causes false-negative 404s.
5. Call the prod endpoint over the real domain (not localhost), verify the JSON response.
6. Verify the actual data change via a read-only prod SQL query (executeSql with environment: "production").
7. Remove the one-off route, restart workflow locally to confirm clean boot, redeploy, and repeat the same publish-confirmation step.
8. Confirm the route now 404s in prod as final proof of cleanup.

This full cycle (add → test local → deploy → confirm publish → call prod → verify data → remove → redeploy → confirm publish → verify 404) is the standard, repeatable way to make any one-off prod data change in this project.
