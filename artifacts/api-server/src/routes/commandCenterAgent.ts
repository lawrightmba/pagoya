import { Router, type Request, type Response } from "express";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { db } from "@workspace/db";
import { sql as drizzleSql } from "drizzle-orm";
import { ReplitConnectors } from "@replit/connectors-sdk";
import { logger } from "../lib/logger.js";

const router = Router();

type TextBlock = { type: "text"; text: string };
type ToolUseBlock = { type: "tool_use"; id: string; name: string; input: Record<string, unknown> };
type ToolResultBlock = { type: "tool_result"; tool_use_id: string; content: string };
type ContentBlock = TextBlock | ToolUseBlock | ToolResultBlock;
type MessageParam = { role: "user" | "assistant"; content: string | ContentBlock[] };

const SYSTEM_PROMPT = `You are the PagoYa Command Center AI — an internal analytics assistant for the PagoYa founders. You have access to live PostgreSQL DB data and Google Sheets (for GSC search data). Always respond in English. Today's date: ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}.

Your job: answer questions about PagoYa's growth, users, payments, and revenue using the real data tools available. Never make up numbers.

CRITICAL: Your final response MUST ALWAYS be a valid JSON object in exactly this format (no markdown, no code fences — raw JSON only):
{
  "message": "A concise 1–2 sentence plain-text summary",
  "cards": [ ...array of card objects... ]
}

Card types you can use:
- stat_grid: { "type": "stat_grid", "title": "optional heading", "stats": [{ "label": "Users", "value": "42", "sub": "optional context", "delta": "+5 this week" }] }
- table: { "type": "table", "title": "optional heading", "headers": ["Col1","Col2",...], "rows": [[val1,val2,...], ...] }
- bar_chart: { "type": "bar_chart", "title": "Chart title", "labels": ["Jan","Feb",...], "values": [12, 34,...] }
- line_chart: { "type": "line_chart", "title": "Chart title", "labels": ["Jan","Feb",...], "datasets": [{ "label": "Signups", "data": [2,5,...] }] }
- text: { "type": "text", "content": "Markdown-friendly block of text" }

Formatting rules:
- Dates: "Jun 2" not "2025-06-02"
- Currency: "$1,234 MXN"  
- Always include at least one card per response
- Use stat_grid for KPIs, table for record lists, charts for time-series trends
- If GSC data is not configured, say so clearly in the message and skip get_gsc_data
- Keep the message brief — cards carry the detail
`;

const TOOLS = [
  {
    name: "get_overview",
    description: "Get a high-level stats dashboard: total users, new signups, payments, revenue this week and total",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "get_users",
    description: "Get list of registered users with phone, name, signup source, bonus, nudge, and wallet balance",
    input_schema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Max rows (default 25, max 100)" },
        source: { type: "string", enum: ["web_organic", "rep_referral"], description: "Filter by signup source" },
      },
      required: [],
    },
  },
  {
    name: "get_payments",
    description: "Get bill payments with service, amount, fee, and status",
    input_schema: {
      type: "object",
      properties: {
        days: { type: "number", description: "Look back N days (default 7)" },
        status: { type: "string", description: "Filter: pending | completed | failed" },
        limit: { type: "number", description: "Max rows (default 20)" },
      },
      required: [],
    },
  },
  {
    name: "get_daily_signups",
    description: "Get daily new user signup counts for the last N days (returns data for a chart)",
    input_schema: {
      type: "object",
      properties: {
        days: { type: "number", description: "Days to look back (default 14)" },
      },
      required: [],
    },
  },
  {
    name: "get_revenue",
    description: "Get fee revenue breakdown by service and daily fee trend",
    input_schema: {
      type: "object",
      properties: {
        days: { type: "number", description: "Look back N days (default 30)" },
      },
      required: [],
    },
  },
  {
    name: "get_reps",
    description: "Get street team rep list with name, phone, ref code, and signup count attributed",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "get_system_health",
    description: "Get system health: pending payments, total DB counts, wallet stats",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "get_gsc_data",
    description: "Read Google Search Console data from a Google Sheet (Search Analytics for Sheets export). Requires the spreadsheet ID.",
    input_schema: {
      type: "object",
      properties: {
        sheet_id: { type: "string", description: "The Google Sheets spreadsheet ID (from the URL)" },
        range: { type: "string", description: "Sheet range, e.g. 'Sheet1!A1:G50'. Default: Sheet1!A1:G100" },
      },
      required: ["sheet_id"],
    },
  },
];

async function executeTool(name: string, input: Record<string, unknown>): Promise<unknown> {
  try {
    switch (name) {
      case "get_overview": {
        const [users, payments, revenue, reps] = await Promise.all([
          db.execute(drizzleSql`
            SELECT COUNT(*) as total,
              COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as new_7d,
              COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as new_30d
            FROM users
          `),
          db.execute(drizzleSql`
            SELECT COUNT(*) as total,
              COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as this_week,
              COUNT(*) FILTER (WHERE status = 'completed') as completed,
              COUNT(*) FILTER (WHERE status = 'pending') as pending_count
            FROM bill_payments
          `),
          db.execute(drizzleSql`
            SELECT 
              COALESCE(SUM(platform_fee_mxn::numeric) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days'), 0) as fee_7d,
              COALESCE(SUM(platform_fee_mxn::numeric), 0) as fee_total,
              COALESCE(SUM(monto::numeric) FILTER (WHERE status = 'completed' AND created_at >= NOW() - INTERVAL '7 days'), 0) as volume_7d
            FROM bill_payments
          `),
          db.execute(drizzleSql`
            SELECT COUNT(DISTINCT ref_code) as active_reps
            FROM users
            WHERE signup_source = 'rep_referral'
              AND ref_code IS NOT NULL
              AND ref_code NOT IN ('WEB','')
          `),
        ]);
        const u = users.rows[0] as Record<string, unknown>;
        const p = payments.rows[0] as Record<string, unknown>;
        const r = revenue.rows[0] as Record<string, unknown>;
        const rp = reps.rows[0] as Record<string, unknown>;
        return {
          total_users: u.total,
          new_users_7d: u.new_7d,
          new_users_30d: u.new_30d,
          total_payments: p.total,
          payments_this_week: p.this_week,
          completed_payments: p.completed,
          pending_payments: p.pending_count,
          fee_revenue_7d_mxn: parseFloat(String(r.fee_7d)).toFixed(2),
          fee_revenue_total_mxn: parseFloat(String(r.fee_total)).toFixed(2),
          volume_7d_mxn: parseFloat(String(r.volume_7d)).toFixed(2),
          active_rep_codes: rp.active_reps,
        };
      }

      case "get_users": {
        const limit = Math.min(Number(input.limit) || 25, 100);
        const source = input.source as string | undefined;
        const whereClause = source ? drizzleSql`WHERE u.signup_source = ${source}` : drizzleSql``;
        const rows = await db.execute(drizzleSql`
          SELECT u.id, u.telefono, u.kyc_full_name as name,
            u.signup_source as source, u.ref_code,
            (u.nudge_sent_at IS NOT NULL) as nudge_sent,
            u.welcome_shown,
            TO_CHAR(u.created_at, 'Mon DD') as joined,
            COALESCE(w.balance::numeric, 0)::text as wallet_balance
          FROM users u
          LEFT JOIN wallets w ON w.user_id = u.id
          ${whereClause}
          ORDER BY u.created_at DESC
          LIMIT ${limit}
        `);
        const stats = await db.execute(drizzleSql`
          SELECT 
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE signup_source = 'web_organic') as web,
            COUNT(*) FILTER (WHERE signup_source = 'rep_referral') as rep
          FROM users
        `);
        return { users: rows.rows, totals: stats.rows[0] };
      }

      case "get_payments": {
        const days = Number(input.days) || 7;
        const limit = Math.min(Number(input.limit) || 20, 100);
        const status = input.status as string | undefined;
        const statusFilter = status ? drizzleSql`AND bp.status = ${status}` : drizzleSql``;
        const rows = await db.execute(drizzleSql`
          SELECT bp.id, u.telefono, bp.service_id,
            bp.monto::numeric as amount_mxn,
            bp.platform_fee_mxn::numeric as fee_mxn,
            bp.status,
            TO_CHAR(bp.created_at, 'Mon DD HH24:MI') as date
          FROM bill_payments bp
          LEFT JOIN users u ON u.id = bp.user_id
          WHERE bp.created_at >= NOW() - (${days} || ' days')::INTERVAL
          ${statusFilter}
          ORDER BY bp.created_at DESC
          LIMIT ${limit}
        `);
        const agg = await db.execute(drizzleSql`
          SELECT COUNT(*) as count,
            COALESCE(SUM(monto::numeric) FILTER (WHERE status='completed'), 0) as volume,
            COALESCE(SUM(platform_fee_mxn::numeric) FILTER (WHERE status='completed'), 0) as fees
          FROM bill_payments
          WHERE created_at >= NOW() - (${days} || ' days')::INTERVAL
        `);
        return { payments: rows.rows, summary: agg.rows[0] };
      }

      case "get_daily_signups": {
        const days = Number(input.days) || 14;
        const rows = await db.execute(drizzleSql`
          SELECT TO_CHAR(gs.day, 'Mon DD') as label, COALESCE(COUNT(u.id), 0)::int as count
          FROM generate_series(
            CURRENT_DATE - (${days - 1} || ' days')::INTERVAL,
            CURRENT_DATE,
            '1 day'::INTERVAL
          ) gs(day)
          LEFT JOIN users u ON DATE(u.created_at) = gs.day::DATE
          GROUP BY gs.day
          ORDER BY gs.day
        `);
        return { daily: rows.rows };
      }

      case "get_revenue": {
        const days = Number(input.days) || 30;
        const byService = await db.execute(drizzleSql`
          SELECT service_id,
            COUNT(*)::int as txns,
            COALESCE(SUM(platform_fee_mxn::numeric), 0)::text as fees,
            COALESCE(SUM(monto::numeric), 0)::text as volume
          FROM bill_payments
          WHERE status = 'completed'
            AND created_at >= NOW() - (${days} || ' days')::INTERVAL
          GROUP BY service_id
          ORDER BY fees::numeric DESC
          LIMIT 10
        `);
        const daily = await db.execute(drizzleSql`
          SELECT TO_CHAR(gs.day, 'Mon DD') as label,
            COALESCE(SUM(bp.platform_fee_mxn::numeric), 0)::text as fees
          FROM generate_series(
            CURRENT_DATE - (${days - 1} || ' days')::INTERVAL,
            CURRENT_DATE,
            '1 day'::INTERVAL
          ) gs(day)
          LEFT JOIN bill_payments bp 
            ON DATE(bp.created_at) = gs.day::DATE AND bp.status = 'completed'
          GROUP BY gs.day
          ORDER BY gs.day
        `);
        return { by_service: byService.rows, daily_fees: daily.rows };
      }

      case "get_reps": {
        const rows = await db.execute(drizzleSql`
          SELECT r.id, r.name, r.telefono, r.ref_code,
            COUNT(u.id)::int as signups,
            TO_CHAR(r.created_at, 'Mon DD') as joined
          FROM reps r
          LEFT JOIN users u ON u.ref_code = r.ref_code
          GROUP BY r.id, r.name, r.telefono, r.ref_code, r.created_at
          ORDER BY signups DESC
          LIMIT 50
        `);
        return { reps: rows.rows };
      }

      case "get_system_health": {
        const [pending, totals, walletAgg] = await Promise.all([
          db.execute(drizzleSql`
            SELECT COUNT(*)::int as pending_payments,
              COUNT(*) FILTER (WHERE created_at < NOW() - INTERVAL '1 hour')::int as stale_pending
            FROM bill_payments WHERE status = 'pending'
          `),
          db.execute(drizzleSql`
            SELECT 
              (SELECT COUNT(*) FROM users)::int as total_users,
              (SELECT COUNT(*) FROM bill_payments)::int as total_payments,
              (SELECT COUNT(*) FROM wallets)::int as total_wallets,
              (SELECT COUNT(*) FROM bill_payments WHERE status = 'failed')::int as failed_payments
          `),
          db.execute(drizzleSql`
            SELECT 
              COALESCE(SUM(balance::numeric), 0)::text as total_wallet_balance,
              COALESCE(AVG(balance::numeric) FILTER (WHERE balance > 0), 0)::text as avg_wallet_balance,
              COUNT(*) FILTER (WHERE balance > 0)::int as wallets_with_balance
            FROM wallets
          `),
        ]);
        return {
          pending: pending.rows[0],
          totals: totals.rows[0],
          wallets: walletAgg.rows[0],
        };
      }

      case "get_gsc_data": {
        const sheetId = input.sheet_id as string;
        if (!sheetId) return { error: "sheet_id is required" };
        const range = (input.range as string) || "Sheet1!A1:G100";
        const connectors = new ReplitConnectors();
        const response = await connectors.proxy(
          "google-sheet",
          `/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}`,
          { method: "GET" }
        );
        const data = await response.json() as { values?: string[][]; error?: { message: string } };
        if (data.error) return { error: data.error.message };
        if (!data.values || data.values.length === 0) return { error: "No data found. Check the sheet ID and that the sheet has been populated by the Search Analytics add-on." };
        const headers = data.values[0];
        const rows = data.values.slice(1, 51);
        return { headers, rows, total_rows: data.values.length - 1 };
      }

      default:
        return { error: `Unknown tool: ${name}` };
    }
  } catch (err) {
    logger.error(`Tool ${name} error:`, err);
    return { error: `Tool failed: ${String(err)}` };
  }
}

router.post("/", async (req: Request, res: Response): Promise<void> => {
  const { messages } = req.body as { messages?: { role: string; content: string }[] };
  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: "messages array required" });
    return;
  }

  const history: MessageParam[] = messages.map(m => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  let finalText = "";

  try {
    for (let i = 0; i < 6; i++) {
      const response = await (anthropic.messages.create as (p: unknown) => Promise<{
        stop_reason: string;
        content: ContentBlock[];
      }>)({
        model: "claude-sonnet-4-5",
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        tools: TOOLS,
        messages: history,
      });

      if (response.stop_reason === "tool_use") {
        const toolBlocks = response.content.filter(b => b.type === "tool_use") as ToolUseBlock[];
        history.push({ role: "assistant", content: response.content });
        const results = await Promise.all(
          toolBlocks.map(async tb => {
            const result = await executeTool(tb.name, tb.input);
            return { id: tb.id, result };
          })
        );
        history.push({
          role: "user",
          content: results.map(r => ({
            type: "tool_result" as const,
            tool_use_id: r.id,
            content: JSON.stringify(r.result),
          })),
        });
      } else {
        finalText = (response.content.find(b => b.type === "text") as TextBlock | undefined)?.text ?? "";
        break;
      }
    }

    const jsonMatch = finalText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]) as unknown;
        res.json(parsed);
        return;
      } catch {
        // fall through to raw text
      }
    }
    res.json({ message: finalText || "No response generated.", cards: [{ type: "text", content: finalText }] });
  } catch (err) {
    logger.error("Command center agent error:", err);
    res.status(500).json({ error: "Agent error", details: String(err) });
  }
});

export default router;
