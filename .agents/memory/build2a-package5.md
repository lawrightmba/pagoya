---
name: Build 2A Package 2A-5 sharp edges
description: Knowledge Qualification Stage — JSONB parsing, timestamp normalization, refusal_stage value, checksum reconstruction pitfalls
---

## Sharp Edges

**JSONB columns are auto-parsed by pg-types:**
pg-types (OID 3802) registers `JSON.parse` — `db.execute()` returns JSONB columns as native JS values (number, string, null). Do NOT double-parse with `JSON.parse()`. Pass values directly when reconstructing checksums or comparing.

**Why:** Double-parsing causes SyntaxError for string values (`JSON.parse("sufficient")` throws) and produces wrong types for others.

**How to apply:** Any replay/audit code that reads `threshold_value` or `observed_value` JSONB columns — use the value as-is.

---

**PG timestamptz comes back as PG-format string (not ISO 8601):**
`db.execute()` returns `timestamptz` columns as the string `"2026-08-07 18:16:26.322+00"` (not `"2026-08-07T18:16:26.322Z"`). The service stores `new Date().toISOString()` which is ISO 8601. Always normalize via `new Date(ts).toISOString()` before comparing or hashing.

**Why:** Checksum reconstructed from DB will mismatch stored checksum if the timestamp format differs.

**How to apply:** Any checksum reconstruction reading `evaluation_timestamp` from DB.

---

**Refusal stage for knowledge qualification is `'knowledge_qualification'`:**
The `refusal_records.refusal_stage` CHECK constraint does NOT accept `'knowledge'` as a value. Always use `'knowledge_qualification'` for refusals written during the knowledge qualification pipeline.

---

**Replay checksum factors sorted alphabetically by name:**
All 10 `knowledge_qualification_factor_results` rows share the same `created_at` transaction timestamp — ORDER BY `created_at` is non-deterministic. The service sorts by `factor_name` via `localeCompare`. Reconstruction code must use `ORDER BY factor_name ASC`.

---

**`opinion_id` must be in the SELECT when reconstructing checksums:**
`knowledge_qualification_runs` has an `opinion_id` column used in the checksum payload. If not selected, `runRow.opinion_id` is `undefined` → payload includes `opinion_id: null` → checksum mismatch.
