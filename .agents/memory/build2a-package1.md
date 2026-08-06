---
name: Build 2A Package 2A-1 — Evidence Engine Foundation
description: Implementation notes, lessons, and sharp edges for the PTI Evidence Engine Package 2A-1 (registries, version dispatch, governance tables).
---

## What was built
15 tables + 2 views + trigger functions + seed data, 6 service files, 1 admin router, 62-test suite. Mounted at `/api/admin/build2a/*` (gated by `build2aNotReadyMiddleware` + adminAuth).

## Startup wiring
`ensureBuild2aTables()` is called from `index.ts` in a fire-and-forget block AFTER the Build 1A block, isolated so Build 2A failures never affect Build 1A or the primary app. `build2aNotReadyMiddleware` returns 503 while pending.

## Sharp edges found during implementation

### Drizzle 0.45.2 — ANY() with JS arrays
`sql\`... WHERE col = ANY(${jsArray})\`` generates `= ANY(($1, $2, ...))` which PostgreSQL rejects with "op ANY/ALL (array) requires array on right side". **Always use `sql.raw()` with an inline IN clause** for static string lists: `sql.raw(\`WHERE col IN (${arr.map(v => \`'${v}'\`).join(',')})\`)`.
This is documented in the quarantine-tier-signals memory but easy to repeat.

### Drizzle 0.45.2 — trigger RAISE EXCEPTION text not in `.message`
When a PostgreSQL trigger raises an exception, Drizzle wraps it as `new Error("Failed query: ...", { cause: pgError })`. The PostgreSQL error message is in `error.cause.message`, NOT in `error.message`. Vitest's `.toThrow(/pattern/)` only checks `.message`. **Use `.rejects.toThrow()` (any rejection) + a follow-up data-integrity check** instead of matching the PG exception text.

### Tier 2 version lifecycle trigger — use to_jsonb comparison
The original trigger checked individual named columns (`id`, `implementation_key`, `version_label`, `replayable_for_history`, `created_at`) but missed table-specific columns (`rule_content`, `formula_description`, etc.). **Fixed to use `(to_jsonb(NEW) - 'is_active') IS DISTINCT FROM (to_jsonb(OLD) - 'is_active')`** which covers all columns generically without needing to enumerate table-specific ones.

### DSE and ESR are Tier 2 permanent — tests must be idempotent
`domain_source_eligibility` and `evidence_source_registry` rows cannot be deleted (Tier 2). Test-created rows persist across runs. **Pattern: use `INSERT ... ON CONFLICT DO NOTHING` + a follow-up `UPDATE` to set the desired state**. Never assert total count = 0 for these tables. For source counts, check specific source_keys are present rather than a fixed count.

### `ensureBuild2aTables()` in test beforeAll
Tests require the Build 2A schema to exist. Add `beforeAll(async () => await ensureBuild2aTables(), 60_000)` at the module level. The function is idempotent (CREATE IF NOT EXISTS / CREATE OR REPLACE), safe to run even if the server has already initialized the schema.

## Feature flag
`ENABLE_EVIDENCE_ENGINE=true` gates runtime evidence processing. Schema migrations run regardless of the flag (they are always additive and safe).

## Files created
- `artifacts/api-server/src/services/build2a/migrations.ts` — DDL + seeds
- `artifacts/api-server/src/services/build2a/build2aReadiness.ts` — readiness state machine
- `artifacts/api-server/src/services/build2a/evidenceSourceRegistry.ts` — source lookup
- `artifacts/api-server/src/services/build2a/domainSourceEligibility.ts` — eligibility resolution
- `artifacts/api-server/src/services/build2a/behavioralEntityResolution.ts` — entity identity
- `artifacts/api-server/src/services/build2a/versionDispatch.ts` — implementation key dispatch
- `artifacts/api-server/src/routes/build2aAdmin.ts` — admin routes
- `artifacts/api-server/src/services/tests/build2a_package1.test.ts` — 62 tests (all pass)
