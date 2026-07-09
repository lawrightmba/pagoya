/**
 * syncTwilioApprovals.ts
 *
 * Reads twilio-submission-results.json + polls live Twilio approval status.
 * For every approved template, writes content_sid + approved_category to
 * paula_messages — idempotent (skips rows that already have the same sid).
 *
 * Usage:
 *   pnpm --filter @workspace/api-server run twilio:sync
 *
 * Required env vars:
 *   TWILIO_ACCOUNT_SID
 *   TWILIO_AUTH_TOKEN
 *
 * DB write strategy (tries in order):
 *   1. POST /api/admin/sync-template-sids (uses ADMIN_TOKEN ?? ADMIN_SECRET_KEY)
 *   2. Direct @workspace/db write (fallback when admin auth is not configured)
 *
 * ROWS[] patch:
 *   If Meta approved a template under a different category than submitted,
 *   the exact ROWS[] line change is printed as a reviewable patch — the seed
 *   file is never auto-edited.
 */

import fs from "fs";

// ─── Paths ───────────────────────────────────────────────────────────────────

const RESULTS_JSON = new URL(
  "../../../twilio-submission-results.json",
  import.meta.url,
).pathname;

// ─── Types ───────────────────────────────────────────────────────────────────

interface ResultEntry {
  trigger_type: string;
  friendly_name: string;
  content_sid: string | null;
  category_submitted: string;
  approval_status: string;
  skipped?: boolean;
  error?: string;
}

interface ApprovalChannel {
  status: string;
  category?: string;
  rejection_reason?: string;
}

interface ApprovalResponse {
  whatsapp?: ApprovalChannel;
  [k: string]: ApprovalChannel | undefined;
}

interface SyncTarget {
  trigger_type: string;
  content_sid: string;
  submitted_category: string;
  approved_category: string;
}

interface SyncResult {
  written: string[];
  skipped: string[];
}

// ─── Twilio helpers ──────────────────────────────────────────────────────────

function twilioAuth(): string {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) {
    console.error("❌  TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN must be set in env");
    process.exit(1);
  }
  return `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`;
}

async function twilioGet(auth: string, url: string): Promise<unknown> {
  const res = await fetch(url, { headers: { Authorization: auth } });
  if (!res.ok) throw new Error(`GET ${url} → ${res.status}: ${await res.text()}`);
  return res.json();
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── DB write: admin HTTP route (preferred) ──────────────────────────────────

async function syncViaAdminRoute(targets: SyncTarget[]): Promise<SyncResult | null> {
  const adminKey = process.env.ADMIN_TOKEN ?? process.env.ADMIN_SECRET_KEY;
  if (!adminKey) return null; // no token → skip to DB fallback

  const url = "http://localhost:8080/api/admin/sync-template-sids";
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-key": adminKey,
    },
    body: JSON.stringify({
      templates: targets.map((t) => ({
        trigger_type: t.trigger_type,
        content_sid: t.content_sid,
        approved_category: t.approved_category,
      })),
    }),
  });

  if (res.status === 401) return null; // auth not configured → fall back
  if (!res.ok) throw new Error(`admin route error ${res.status}: ${await res.text()}`);

  return (await res.json()) as SyncResult;
}

// ─── DB write: direct @workspace/db fallback ─────────────────────────────────

async function syncViaDirectDb(targets: SyncTarget[]): Promise<SyncResult> {
  const { default: db } = await import("@workspace/db");
  const { sql } = await import("drizzle-orm");

  const written: string[] = [];
  const skipped: string[] = [];

  for (const t of targets) {
    const result = await db.execute(sql`
      UPDATE paula_messages
      SET content_sid      = ${t.content_sid},
          template_category = ${t.approved_category}
      WHERE trigger_type = ${t.trigger_type}
        AND (content_sid IS DISTINCT FROM ${t.content_sid}
             OR template_category IS DISTINCT FROM ${t.approved_category})
      RETURNING trigger_type
    `);

    if ((result.rows as unknown[]).length > 0) {
      written.push(t.trigger_type);
    } else {
      skipped.push(t.trigger_type);
    }
  }

  return { written, skipped };
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  if (!fs.existsSync(RESULTS_JSON)) {
    console.error(`❌  ${RESULTS_JSON} not found — run twilio:submit first`);
    process.exit(1);
  }

  const results: ResultEntry[] = JSON.parse(fs.readFileSync(RESULTS_JSON, "utf-8"));
  const withSid = results.filter((r) => r.content_sid && !r.skipped);

  if (withSid.length === 0) {
    console.log("⚠️  No submitted templates with content_sids found in results file.");
    process.exit(0);
  }

  const auth = twilioAuth();

  console.log(`\nPolling Twilio approval status for ${withSid.length} template(s)…\n`);

  const approved: SyncTarget[] = [];
  const pending: string[] = [];
  const rejected: string[] = [];
  const categoryMismatches: Array<{ trigger_type: string; submitted: string; approved: string }> = [];

  for (let i = 0; i < withSid.length; i++) {
    const entry = withSid[i];
    const sid = entry.content_sid!;

    try {
      const data = (await twilioGet(
        auth,
        `https://content.twilio.com/v1/Content/${sid}/ApprovalRequests`,
      )) as ApprovalResponse;

      const wa = data.whatsapp;
      const status = wa?.status ?? "unknown";
      const approvedCategory = wa?.category;

      process.stdout.write(
        `  ${entry.trigger_type.padEnd(26)} ${sid.slice(0, 28)}  ${status}\n`,
      );

      if (status === "approved" && approvedCategory) {
        approved.push({
          trigger_type: entry.trigger_type,
          content_sid: sid,
          submitted_category: entry.category_submitted,
          approved_category: approvedCategory.toUpperCase(),
        });
        if (approvedCategory.toUpperCase() !== entry.category_submitted.toUpperCase()) {
          categoryMismatches.push({
            trigger_type: entry.trigger_type,
            submitted: entry.category_submitted,
            approved: approvedCategory.toUpperCase(),
          });
        }
      } else if (status === "rejected") {
        rejected.push(`${entry.trigger_type} (${wa?.rejection_reason ?? "no reason given"})`);
      } else {
        pending.push(entry.trigger_type);
      }
    } catch (err: unknown) {
      console.error(`  ❌ ${entry.trigger_type}: ${err instanceof Error ? err.message : String(err)}`);
      pending.push(entry.trigger_type);
    }

    if (i < withSid.length - 1) await sleep(200);
  }

  console.log(
    `\n  approved=${approved.length}  pending/other=${pending.length}  rejected=${rejected.length}\n`,
  );

  if (rejected.length > 0) {
    console.log(`⛔ Rejected templates (review copy / category):`);
    rejected.forEach((r) => console.log(`   ${r}`));
    console.log();
  }

  if (approved.length === 0) {
    console.log("Nothing to sync — no approved templates yet.");
    if (pending.length > 0) {
      console.log(`Still pending (check back after Meta review, usually 1–3 business days):`);
      pending.forEach((p) => console.log(`   ${p}`));
    }
    console.log();
    return;
  }

  // ── Write approved sids to DB ────────────────────────────────────────────

  console.log(`Syncing ${approved.length} approved template(s) to paula_messages…`);

  let syncResult: SyncResult;
  let syncMethod: string;

  const viaRoute = await syncViaAdminRoute(approved).catch(() => null);
  if (viaRoute) {
    syncResult = viaRoute;
    syncMethod = "admin HTTP route";
  } else {
    console.log(
      "  (ADMIN_TOKEN not configured — using direct DB write)\n",
    );
    syncResult = await syncViaDirectDb(approved);
    syncMethod = "direct DB";
  }

  // ── Print diff ───────────────────────────────────────────────────────────

  console.log(`\n${"─".repeat(70)}`);
  console.log(`  Sync complete via ${syncMethod}`);
  console.log(`${"─".repeat(70)}`);

  if (syncResult.written.length > 0) {
    console.log(`\n  ✅ Written (${syncResult.written.length}):`);
    for (const tt of syncResult.written) {
      const t = approved.find((a) => a.trigger_type === tt)!;
      console.log(
        `     ${tt.padEnd(26)}  content_sid=${t.content_sid}  category=${t.approved_category}`,
      );
    }
  }

  if (syncResult.skipped.length > 0) {
    console.log(`\n  ⏭  Already synced / no change (${syncResult.skipped.length}):`);
    syncResult.skipped.forEach((tt) => console.log(`     ${tt}`));
  }

  // ── ROWS[] patch for category mismatches ─────────────────────────────────

  if (categoryMismatches.length > 0) {
    console.log(`\n${"─".repeat(70)}`);
    console.log(
      `  ⚠️  ROWS[] PATCH NEEDED — Meta recategorized ${categoryMismatches.length} template(s)`,
    );
    console.log(
      `  Review and apply manually in seedPaulaMessages.ts ROWS[]:`,
    );
    console.log(`${"─".repeat(70)}`);
    for (const m of categoryMismatches) {
      console.log(
        `\n  trigger_type: "${m.trigger_type}"\n` +
          `  - template_category: "${m.submitted}"   ← SUBMITTED\n` +
          `  + template_category: "${m.approved}"   ← APPROVED BY META\n` +
          `\n  In ROWS[], find the row with trigger_type: "${m.trigger_type}" and change:\n` +
          `    template_category: "${m.submitted}"\n` +
          `  to:\n` +
          `    template_category: "${m.approved}"`,
      );
    }
    console.log();
  }

  // ── Final gate status ────────────────────────────────────────────────────

  const total = 22; // PAULA_MESSAGES_EXPECTED_ACTIVE
  console.log(`\n${"─".repeat(70)}`);
  console.log(
    `  synced_sids progress: ${approved.length + syncResult.skipped.length} of ${total} approved` +
      (approved.length + syncResult.skipped.length >= total
        ? " — ✅ PAULA_SENDING_ENABLED gate ready"
        : ` — ${total - (approved.length + syncResult.skipped.length)} still pending`),
  );
  console.log(`${"─".repeat(70)}\n`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
