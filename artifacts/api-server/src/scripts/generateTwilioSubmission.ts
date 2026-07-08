/**
 * generateTwilioSubmission.ts
 *
 * Generates the Twilio Content API submission payload for all active Paula templates.
 * This is the AUTHORITATIVE pre-submission artifact — approve its output before
 * submitting any template to Twilio.
 *
 * Rules:
 *   - Module triggers (module_unlock_1–5): submission body = teaser_es (~100–130 chars)
 *   - All other triggers: submission body = template_es
 *   - UTILITY category limit: 1024 chars
 *   - MARKETING category limit: 768 chars
 *   - Module template_es (full content, in-session freeform): validated ≤4096 chars
 *   - Named vars {{nombre}} converted to positional {{1}} by order of first appearance
 *   - variables_schema drives the positional → UserContext field mapping for the queue
 *
 * Usage:
 *   pnpm --filter @workspace/api-server exec tsx src/scripts/generateTwilioSubmission.ts
 *
 * Exit code 0 = all templates valid; exit code 1 = one or more validation errors.
 */

import { ROWS, VARIABLES_SCHEMA } from "../services/seedPaulaMessages.js";

// ── Constants ─────────────────────────────────────────────────────────────────

const MODULE_TRIGGERS = new Set([
  "module_unlock_1", "module_unlock_2", "module_unlock_3",
  "module_unlock_4", "module_unlock_5",
]);

const MARKETING_TRIGGERS = new Set(["winback_30d", "free_credit_nudge"]);

const CATEGORY_LIMITS: Record<string, number> = {
  UTILITY:   1024,
  MARKETING:  768,
};

const WHATSAPP_MAX = 4096;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TwilioSubmissionEntry {
  trigger_type:     string;
  friendly_name:    string;
  category:         string;
  body:             string;           // positional vars — ready for Twilio Content API
  variables:        Record<string, string>; // positional index → UserContext field name
  char_count:       number;
  char_limit:       number;
  status:           "OK" | "ERROR";
  errors:           string[];
  // Module triggers only:
  full_body_chars?: number;           // template_es length (in-session freeform)
  full_body_ok?:    boolean;          // template_es ≤ 4096
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Convert named vars in a template body to Twilio positional vars.
 * Order is determined by first appearance in the string.
 * Returns { positionalBody, varMap } where varMap maps "1" → fieldName.
 */
function toPositional(
  body: string,
  schema: Record<string, string>,
): { positionalBody: string; varMap: Record<string, string> } {
  // Extract named vars in order of first appearance
  const found: string[] = [];
  const seen = new Set<string>();
  for (const match of body.matchAll(/\{\{(\w+)\}\}/g)) {
    const name = match[1];
    if (!seen.has(name)) {
      seen.add(name);
      found.push(name);
    }
  }

  // Build positional body
  let positionalBody = body;
  const varMap: Record<string, string> = {};
  for (let i = 0; i < found.length; i++) {
    const namedVar = found[i];
    const pos = String(i + 1);
    positionalBody = positionalBody.replaceAll(`{{${namedVar}}}`, `{{${pos}}}`);
    // Map positional index → UserContext field name (from schema if available)
    const schemaField = Object.entries(schema).find(([, v]) => v === namedVar)?.[0];
    varMap[pos] = namedVar; // fallback: use the named var itself
    if (schemaField) {
      // schema already maps positional → field; cross-validate
      const schemaFieldName = schema[pos];
      if (schemaFieldName && schemaFieldName !== namedVar) {
        // Schema position mismatch — body order wins; flag it
        varMap[pos] = `${namedVar} [schema mismatch: schema[${pos}]=${schemaFieldName}]`;
      } else {
        varMap[pos] = namedVar;
      }
    }
  }

  return { positionalBody, varMap };
}

// ── Seed validation ───────────────────────────────────────────────────────────

/**
 * Validates all ROWS[] entries against character limits and blank-body rules.
 * Called at the start of generate() — exits early on any error when runAsScript=true.
 *
 * Validation rules:
 *   1. Active rows must not have a blank template_es
 *   2. Active module rows must have a non-blank teaser_es
 *   3. Module teaser_es must be ≤ 1024 chars (UTILITY limit)
 *   4. Module template_es must be ≤ 4096 chars (WhatsApp max, in-session freeform)
 *   5. Non-module UTILITY rows: template_es ≤ 1024
 *   6. MARKETING rows: template_es ≤ 768
 *
 * Returns array of error strings (empty = all valid).
 */
export function validateRows(): string[] {
  const errors: string[] = [];

  for (const row of ROWS) {
    const category = row.template_category ?? "UTILITY";
    const limit = CATEGORY_LIMITS[category] ?? 1024;
    const isModule = MODULE_TRIGGERS.has(row.trigger_type);

    // Rule 1: no blank template_es for active rows
    if (row.active && (!row.template_es || row.template_es.trim() === "")) {
      errors.push(
        `BLANK_BODY [${row.trigger_type}]: active=true but template_es is blank`,
      );
    }

    if (isModule && row.active) {
      // Rule 2: module rows must have teaser_es
      if (!row.teaser_es || row.teaser_es.trim() === "") {
        errors.push(
          `BLANK_TEASER [${row.trigger_type}]: active module trigger has no teaser_es`,
        );
      } else {
        // Rule 3: teaser_es ≤ 1024
        if (row.teaser_es.length > 1024) {
          errors.push(
            `TEASER_TOO_LONG [${row.trigger_type}]: teaser_es ${row.teaser_es.length} chars > 1024 UTILITY limit`,
          );
        }
      }
      // Rule 4: template_es ≤ 4096 (in-session freeform)
      if (row.template_es && row.template_es.length > WHATSAPP_MAX) {
        errors.push(
          `FULL_BODY_TOO_LONG [${row.trigger_type}]: template_es ${row.template_es.length} chars > ${WHATSAPP_MAX} WhatsApp max`,
        );
      }
    } else if (row.active) {
      // Rule 5 & 6: non-module active rows
      if (row.template_es && row.template_es.length > limit) {
        errors.push(
          `BODY_TOO_LONG [${row.trigger_type}]: template_es ${row.template_es.length} chars > ${limit} ${category} limit`,
        );
      }
    }
  }

  return errors;
}

// ── Main generator ────────────────────────────────────────────────────────────

/**
 * Generate the Twilio Content API submission for all active templates.
 * Returns an array of TwilioSubmissionEntry, one per active template.
 */
export function generate(): TwilioSubmissionEntry[] {
  const validationErrors = validateRows();
  if (validationErrors.length > 0) {
    // Surface validation errors as entries so they appear in the output
    console.error("\n❌ Seed validation failed:\n" + validationErrors.map(e => `  • ${e}`).join("\n"));
  }

  const entries: TwilioSubmissionEntry[] = [];
  const activeRows = ROWS.filter(r => r.active);

  for (const row of activeRows) {
    const isModule = MODULE_TRIGGERS.has(row.trigger_type);
    const category = row.template_category
      ?? (MARKETING_TRIGGERS.has(row.trigger_type) ? "MARKETING" : "UTILITY");
    const limit = CATEGORY_LIMITS[category] ?? 1024;
    const schema = VARIABLES_SCHEMA[row.trigger_type] ?? {};

    const submissionBody = isModule ? (row.teaser_es ?? row.template_es) : row.template_es;
    const { positionalBody, varMap } = toPositional(submissionBody, schema);

    const charCount = submissionBody.length;
    const entryErrors: string[] = [];

    if (!submissionBody || submissionBody.trim() === "") {
      entryErrors.push(`BLANK_BODY: submission body is empty`);
    }
    if (charCount > limit) {
      entryErrors.push(`TOO_LONG: ${charCount} chars > ${limit} ${category} limit`);
    }

    const entry: TwilioSubmissionEntry = {
      trigger_type:  row.trigger_type,
      friendly_name: `PagoYa - ${row.trigger_type}`,
      category,
      body:          positionalBody,
      variables:     varMap,
      char_count:    charCount,
      char_limit:    limit,
      status:        entryErrors.length === 0 ? "OK" : "ERROR",
      errors:        entryErrors,
    };

    if (isModule && row.template_es) {
      entry.full_body_chars = row.template_es.length;
      entry.full_body_ok    = row.template_es.length <= WHATSAPP_MAX;
    }

    entries.push(entry);
  }

  return entries;
}

// ── Drift detection ───────────────────────────────────────────────────────────

import { createHash } from "node:crypto";

/**
 * Compute a SHA-256 fingerprint (first 16 hex chars) of a template body.
 * Used by the admin health endpoint to detect DB vs. seed drift.
 */
export function fingerprint(body: string): string {
  return createHash("sha256").update(body, "utf8").digest("hex").slice(0, 16);
}

/**
 * Build a map of trigger_type → { submission_body_hash, full_body_hash? }
 * from the canonical ROWS[]. The health endpoint compares this against
 * live DB values to detect drift.
 */
export function seedFingerprints(): Record<string, { submission: string; full?: string }> {
  const result: Record<string, { submission: string; full?: string }> = {};
  for (const row of ROWS) {
    if (!row.active) continue;
    const isModule = MODULE_TRIGGERS.has(row.trigger_type);
    const submissionBody = isModule ? (row.teaser_es ?? row.template_es) : row.template_es;
    result[row.trigger_type] = { submission: fingerprint(submissionBody) };
    if (isModule && row.template_es) {
      result[row.trigger_type].full = fingerprint(row.template_es);
    }
  }
  return result;
}

// ── CLI entrypoint ────────────────────────────────────────────────────────────

const isMain = process.argv[1]?.endsWith("generateTwilioSubmission.ts")
  || process.argv[1]?.endsWith("generateTwilioSubmission.js");

if (isMain) {
  const validationErrors = validateRows();
  if (validationErrors.length > 0) {
    console.error("\n❌ VALIDATION ERRORS — fix before submitting to Twilio:\n");
    for (const err of validationErrors) {
      console.error(`  • ${err}`);
    }
    console.error("");
  }

  const entries = generate();
  const allOk = entries.every(e => e.status === "OK");

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log(" PagoYa — Twilio Content API Submission");
  console.log("═══════════════════════════════════════════════════════════════\n");

  for (const e of entries) {
    const icon = e.status === "OK" ? "✅" : "❌";
    const teaserNote = e.full_body_chars !== undefined
      ? ` | full=${e.full_body_chars}c ${e.full_body_ok ? "✅" : "❌>4096"}`
      : "";
    console.log(
      `${icon} [${e.category}] ${e.trigger_type} — ${e.char_count}/${e.char_limit}c${teaserNote}`,
    );
    console.log(`   vars: ${JSON.stringify(e.variables)}`);
    console.log(`   body: ${e.body.slice(0, 120)}${e.body.length > 120 ? "…" : ""}`);
    if (e.errors.length > 0) {
      for (const err of e.errors) console.error(`   ⚠ ${err}`);
    }
    console.log("");
  }

  console.log("═══════════════════════════════════════════════════════════════");
  console.log(
    allOk && validationErrors.length === 0
      ? `✅ All ${entries.length} templates valid — ready for Twilio submission`
      : `❌ ${entries.filter(e => e.status === "ERROR").length} template(s) have errors — fix before submitting`,
  );
  console.log("═══════════════════════════════════════════════════════════════\n");

  // Emit machine-readable JSON to a separate file for import into Twilio bulk-create
  const fs = await import("node:fs");
  const outPath = new URL("../../../twilio-submission.json", import.meta.url).pathname;
  fs.writeFileSync(
    outPath,
    JSON.stringify(
      entries.map(e => ({
        trigger_type:  e.trigger_type,
        friendly_name: e.friendly_name,
        category:      e.category,
        body:          e.body,
        variables:     e.variables,
        char_count:    e.char_count,
        status:        e.status,
        ...(e.full_body_chars !== undefined ? { full_body_chars: e.full_body_chars } : {}),
      })),
      null, 2,
    ),
  );
  console.log(`📄 JSON written to: ${outPath}\n`);

  process.exit(allOk && validationErrors.length === 0 ? 0 : 1);
}
