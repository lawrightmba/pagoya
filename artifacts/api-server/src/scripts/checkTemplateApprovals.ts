/**
 * checkTemplateApprovals.ts
 *
 * Polls Twilio for approval status of every ContentSid in
 * artifacts/twilio-submission-results.json and prints a summary table.
 *
 * Usage:
 *   pnpm --filter @workspace/api-server exec tsx src/scripts/checkTemplateApprovals.ts
 *
 * Required env vars:
 *   TWILIO_ACCOUNT_SID
 *   TWILIO_AUTH_TOKEN
 *
 * Flags any template where the approved category ≠ the submitted category.
 *
 * When a template is approved, the DB sync instructions are printed so you
 * can run the admin-route pattern (POST /api/admin/seed-paula-messages after
 * setting content_sid + template_category in ROWS[]).
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
  status: "received" | "pending" | "approved" | "rejected" | string;
  category?: string;
  rejection_reason?: string;
  name?: string;
}

interface ApprovalResponse {
  whatsapp?: ApprovalChannel;
  [channel: string]: ApprovalChannel | undefined;
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

async function twilioGet(auth: string, url: string): Promise<unknown> {
  const res = await fetch(url, { headers: { Authorization: auth } });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GET ${url} → ${res.status}: ${body}`);
  }
  return res.json();
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── Status formatting ───────────────────────────────────────────────────────

const STATUS_ICON: Record<string, string> = {
  approved: "✅",
  pending: "⏳",
  received: "📨",
  rejected: "❌",
};

function icon(status: string): string {
  return STATUS_ICON[status.toLowerCase()] ?? "❓";
}

function pad(s: string, n: number): string {
  return s.length >= n ? s : s + " ".repeat(n - s.length);
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  if (!fs.existsSync(RESULTS_JSON)) {
    console.error(
      `❌  ${RESULTS_JSON} not found — run submitTwilioTemplates.ts first`,
    );
    process.exit(1);
  }

  const results: ResultEntry[] = JSON.parse(
    fs.readFileSync(RESULTS_JSON, "utf-8"),
  );

  const auth = twilioAuth();

  const withSid = results.filter((r) => r.content_sid);
  const skipped = results.filter((r) => r.skipped);
  const errored = results.filter((r) => !r.content_sid && !r.skipped);

  console.log(
    `\nChecking ${withSid.length} templates (${skipped.length} skipped / ${errored.length} errored)…\n`,
  );

  // ── Table header ────────────────────────────────────────────────────────
  const COL = { trigger: 26, sid: 36, submitted: 12, status: 12, approved: 12 };
  const header =
    pad("trigger_type", COL.trigger) +
    pad("content_sid", COL.sid) +
    pad("submitted", COL.submitted) +
    pad("status", COL.status) +
    "approved_category";
  const divider = "─".repeat(header.length);

  console.log(divider);
  console.log(header);
  console.log(divider);

  const categoryMismatches: ResultEntry[] = [];
  const approvedSids: Array<{
    trigger_type: string;
    content_sid: string;
    approved_category: string;
  }> = [];
  let approvedCount = 0;

  for (let i = 0; i < withSid.length; i++) {
    const entry = withSid[i];
    const sid = entry.content_sid!;

    let waStatus = "unknown";
    let approvedCategory: string | undefined;
    let rejectionReason: string | undefined;

    try {
      const data = (await twilioGet(
        auth,
        `https://content.twilio.com/v1/Content/${sid}/ApprovalRequests`,
      )) as ApprovalResponse;

      const wa = data.whatsapp;
      if (wa) {
        waStatus = wa.status ?? "unknown";
        approvedCategory = wa.category;
        rejectionReason = wa.rejection_reason;
      }
    } catch (err: unknown) {
      waStatus = `fetch_error: ${err instanceof Error ? err.message.slice(0, 40) : String(err)}`;
    }

    const statusIcon = icon(waStatus);
    const catDisplay = approvedCategory ?? "—";

    console.log(
      pad(entry.trigger_type, COL.trigger) +
        pad(sid, COL.sid) +
        pad(entry.category_submitted, COL.submitted) +
        pad(`${statusIcon} ${waStatus}`, COL.status + 3) +
        catDisplay,
    );

    if (rejectionReason) {
      console.log(`  ⚠️  Rejection: ${rejectionReason}`);
    }

    if (
      waStatus === "approved" &&
      approvedCategory &&
      approvedCategory.toUpperCase() !== entry.category_submitted.toUpperCase()
    ) {
      categoryMismatches.push(entry);
      console.log(
        `  ⚠️  CATEGORY MISMATCH: submitted=${entry.category_submitted} approved=${approvedCategory}`,
      );
    }

    if (waStatus === "approved" && approvedCategory) {
      approvedCount++;
      approvedSids.push({
        trigger_type: entry.trigger_type,
        content_sid: sid,
        approved_category: approvedCategory,
      });
    }

    // Polite rate limit
    if (i < withSid.length - 1) await sleep(200);
  }

  // ── Skipped/errored rows ─────────────────────────────────────────────────
  for (const s of skipped) {
    console.log(
      pad(s.trigger_type, COL.trigger) +
        pad("(no sid)", COL.sid) +
        pad(s.category_submitted, COL.submitted) +
        pad("⏭ skipped", COL.status + 3) +
        "already_existed",
    );
  }
  for (const e of errored) {
    console.log(
      pad(e.trigger_type, COL.trigger) +
        pad("(no sid)", COL.sid) +
        pad(e.category_submitted, COL.submitted) +
        pad("❌ error", COL.status + 3) +
        (e.error?.slice(0, 40) ?? ""),
    );
  }

  console.log(divider);

  // ── Summary ──────────────────────────────────────────────────────────────
  const total = results.length;
  console.log(
    `\n  Total: ${total} | Approved: ${approvedCount} | Pending/received: ${withSid.length - approvedCount} | Skipped: ${skipped.length} | Errors: ${errored.length}`,
  );

  if (categoryMismatches.length > 0) {
    console.log(
      `\n⚠️  ${categoryMismatches.length} category mismatch(es) — update ROWS[] template_category and re-seed:`,
    );
    categoryMismatches.forEach((m) =>
      console.log(`   ${m.trigger_type}: was ${m.category_submitted}`),
    );
  }

  // ── DB sync instructions for approved templates ──────────────────────────
  if (approvedSids.length > 0) {
    console.log(
      `\n${"─".repeat(60)}\nDB SYNC — run these via admin-route pattern (prod):\n${"─".repeat(60)}`,
    );
    for (const { trigger_type, content_sid, approved_category } of approvedSids) {
      console.log(
        `  UPDATE paula_messages\n    SET content_sid = '${content_sid}', template_category = '${approved_category}'\n    WHERE trigger_type = '${trigger_type}';\n`,
      );
    }
    console.log(
      `Also update ROWS[] in seedPaulaMessages.ts:\n` +
        `  { trigger_type: '<X>', content_sid: '<HX...>', template_category: '<CATEGORY>', … }\n` +
        `Then POST /api/admin/seed-paula-messages (prod) to keep ROWS[] canonical.\n`,
    );
    console.log(
      `Approval gate: ${approvedCount}/${total} approved. PAULA_SENDING_ENABLED goes live when ${total}/${total} sids covered.\n`,
    );
  } else {
    console.log(
      `\nNo templates approved yet — check back after Meta review completes (typically 1–3 business days).\n`,
    );
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
