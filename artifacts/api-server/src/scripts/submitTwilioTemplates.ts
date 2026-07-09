/**
 * submitTwilioTemplates.ts
 *
 * Bulk-submits the 22 Paula templates from artifacts/twilio-submission.json
 * to the Twilio Content API and requests WhatsApp approval for each.
 *
 * Usage (dry run — review payloads first):
 *   pnpm --filter @workspace/api-server exec tsx src/scripts/submitTwilioTemplates.ts --dry-run
 *
 * Usage (live submit):
 *   pnpm --filter @workspace/api-server exec tsx src/scripts/submitTwilioTemplates.ts
 *
 * Required env vars:
 *   TWILIO_ACCOUNT_SID   — starts with AC...
 *   TWILIO_AUTH_TOKEN    — Twilio auth token
 *
 * Outputs:
 *   artifacts/twilio-submission-results.json
 *   (trigger_type, content_sid, friendly_name, category_submitted, approval_status)
 *
 * Idempotency:
 *   Fetches the existing Content list first. Any template whose friendly_name
 *   already exists is skipped — re-running will not create duplicates.
 *
 * Rate limiting:
 *   500 ms delay between each submit+approve pair.
 */

import fs from "fs";
import path from "path";

// ─── Paths ───────────────────────────────────────────────────────────────────

const SUBMISSION_JSON = new URL(
  "../../../twilio-submission.json",
  import.meta.url,
).pathname;
const RESULTS_JSON = new URL(
  "../../../twilio-submission-results.json",
  import.meta.url,
).pathname;

// ─── Sample values (required by Meta for review) ────────────────────────────

const SAMPLE_VALUES: Record<string, string> = {
  nombre: "María",
  pti_score: "45",
  days_streak: "62",
  streak_days: "62",
  pti_delta: "4",
  weakest_dimension: "Historial de pagos",
  strongest_dimension: "Consistencia",
  top_gap: "días consecutivos de pago",
};

// ─── Types ───────────────────────────────────────────────────────────────────

interface SubmissionEntry {
  trigger_type: string;
  friendly_name: string;
  category: "UTILITY" | "MARKETING";
  body: string;
  variables: Record<string, string>; // positional → named, e.g. {"1":"nombre"}
  char_count: number;
  status: string;
}

interface ResultEntry {
  trigger_type: string;
  friendly_name: string;
  content_sid: string | null;
  category_submitted: string;
  approval_status: string;
  skipped?: boolean;
  error?: string;
}

// ─── Twilio helpers ──────────────────────────────────────────────────────────

function twilioAuth(): string {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) {
    console.error(
      "❌  TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN must be set in env",
    );
    process.exit(1);
  }
  return `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`;
}

function contentApiUrl(path: string): string {
  return `https://content.twilio.com/v1${path}`;
}

async function twilioGet(auth: string, url: string): Promise<unknown> {
  const res = await fetch(url, { headers: { Authorization: auth } });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GET ${url} → ${res.status}: ${body}`);
  }
  return res.json();
}

async function twilioPost(
  auth: string,
  url: string,
  body: unknown,
): Promise<unknown> {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: auth,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`POST ${url} → ${res.status}: ${text}`);
  }
  return res.json();
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── Build sample variables for Content API ──────────────────────────────────

function buildSampleVars(
  namedVars: Record<string, string>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [pos, fieldName] of Object.entries(namedVars)) {
    out[pos] = SAMPLE_VALUES[fieldName] ?? fieldName;
  }
  return out;
}

// ─── Fetch existing Content list (handles pagination) ───────────────────────

async function fetchExistingFriendlyNames(auth: string): Promise<Set<string>> {
  const names = new Set<string>();
  let pageUrl: string | null = contentApiUrl("/Content");

  while (pageUrl) {
    const data = (await twilioGet(auth, pageUrl)) as {
      contents?: Array<{ friendly_name: string }>;
      meta?: { next_page_url?: string };
    };
    for (const c of data.contents ?? []) {
      names.add(c.friendly_name);
    }
    pageUrl = data.meta?.next_page_url ?? null;
  }

  return names;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const isDryRun = process.argv.includes("--dry-run");

  if (!fs.existsSync(SUBMISSION_JSON)) {
    console.error(`❌  ${SUBMISSION_JSON} not found — run generateTwilioSubmission.ts first`);
    process.exit(1);
  }

  const entries: SubmissionEntry[] = JSON.parse(
    fs.readFileSync(SUBMISSION_JSON, "utf-8"),
  );

  // Validate all entries are OK before touching Twilio
  const invalid = entries.filter((e) => e.status !== "OK");
  if (invalid.length > 0) {
    console.error(
      `❌  ${invalid.length} template(s) have non-OK status — fix before submitting:`,
    );
    invalid.forEach((e) => console.error(`   ${e.trigger_type}: ${e.status}`));
    process.exit(1);
  }

  if (isDryRun) {
    console.log(
      `\n${"═".repeat(70)}\n DRY RUN — ${entries.length} payloads (nothing will be sent)\n${"═".repeat(70)}\n`,
    );

    entries.forEach((entry, i) => {
      const sampleVars = buildSampleVars(entry.variables);
      const contentPayload = {
        friendly_name: entry.friendly_name,
        language: "es_MX",
        variables: sampleVars,
        types: { "twilio/text": { body: entry.body } },
      };
      const approvalPayload = {
        name: entry.trigger_type,
        category: entry.category,
      };

      console.log(
        `── [${String(i + 1).padStart(2, "0")}/${entries.length}] ${entry.trigger_type} (${entry.category}) ──`,
      );
      console.log(`   POST /v1/Content`);
      console.log(`   ${JSON.stringify(contentPayload, null, 4).split("\n").join("\n   ")}`);
      console.log(`\n   POST /v1/Content/{{sid}}/ApprovalRequests/whatsapp`);
      console.log(`   ${JSON.stringify(approvalPayload, null, 4).split("\n").join("\n   ")}`);
      console.log();
    });

    console.log(`${"═".repeat(70)}`);
    console.log(
      `✅  Dry run complete — ${entries.length} payloads printed. Re-run without --dry-run to submit.`,
    );
    console.log(`${"═".repeat(70)}\n`);
    return;
  }

  // ── Live submission ──────────────────────────────────────────────────────

  const auth = twilioAuth();

  console.log(`\nFetching existing Twilio Content templates for idempotency check…`);
  const existing = await fetchExistingFriendlyNames(auth);
  console.log(`  Found ${existing.size} existing template(s) on account.\n`);

  const results: ResultEntry[] = [];
  let submitted = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const label = `[${String(i + 1).padStart(2, "0")}/${entries.length}] ${entry.trigger_type}`;

    if (existing.has(entry.friendly_name)) {
      console.log(`⏭  ${label} — already exists (${entry.friendly_name}), skipping`);
      results.push({
        trigger_type: entry.trigger_type,
        friendly_name: entry.friendly_name,
        content_sid: null,
        category_submitted: entry.category,
        approval_status: "skipped:already_exists",
        skipped: true,
      });
      skipped++;
      continue;
    }

    try {
      // Step 1: Create Content template
      const sampleVars = buildSampleVars(entry.variables);
      const contentPayload = {
        friendly_name: entry.friendly_name,
        language: "es_MX",
        variables: sampleVars,
        types: { "twilio/text": { body: entry.body } },
      };

      process.stdout.write(`⬆  ${label} — creating content…`);
      const contentResp = (await twilioPost(
        auth,
        contentApiUrl("/Content"),
        contentPayload,
      )) as { sid: string };
      const sid = contentResp.sid;
      process.stdout.write(` ${sid}\n`);

      // Step 2: Request WhatsApp approval
      const approvalPayload = {
        name: entry.trigger_type,
        category: entry.category,
      };
      process.stdout.write(`   ✉  requesting WhatsApp approval (${entry.category})…`);
      const approvalResp = (await twilioPost(
        auth,
        contentApiUrl(`/Content/${sid}/ApprovalRequests/whatsapp`),
        approvalPayload,
      )) as { status?: string };
      const approvalStatus = approvalResp.status ?? "submitted";
      console.log(` ${approvalStatus}`);

      results.push({
        trigger_type: entry.trigger_type,
        friendly_name: entry.friendly_name,
        content_sid: sid,
        category_submitted: entry.category,
        approval_status: approvalStatus,
      });
      submitted++;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`❌  ${label} — ERROR: ${msg}`);
      results.push({
        trigger_type: entry.trigger_type,
        friendly_name: entry.friendly_name,
        content_sid: null,
        category_submitted: entry.category,
        approval_status: "error",
        error: msg,
      });
      errors++;
    }

    // Rate limit: 500ms between each pair
    if (i < entries.length - 1) {
      await sleep(500);
    }
  }

  // Write results
  fs.writeFileSync(RESULTS_JSON, JSON.stringify(results, null, 2) + "\n");

  console.log(`\n${"═".repeat(70)}`);
  console.log(
    `  Submitted: ${submitted}  |  Skipped: ${skipped}  |  Errors: ${errors}`,
  );
  console.log(`  Results written to: ${RESULTS_JSON}`);
  console.log(`${"═".repeat(70)}\n`);

  if (errors > 0) process.exit(1);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
