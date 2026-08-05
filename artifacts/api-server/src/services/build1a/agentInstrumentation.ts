/**
 * Build 1A — Agent Instrumentation
 *
 * Fire-and-forget recording of agent_tasks, agent_tool_calls, and
 * agent_task_outcomes for Paula and Tony.
 *
 * CONTRACT:
 * - Every exported function is non-blocking (never awaited at call site).
 * - Every exported function catches all errors internally — they NEVER throw.
 * - Disable via ENABLE_AGENT_INSTRUMENTATION=false (defaults enabled).
 * - No fabricated cost data. cost_status is always 'unavailable' with null
 *   cost_cents and null cost_source unless a confirmed real source is wired.
 * - task_class values are derived from Paula's and Tony's real action names.
 */

import { sql } from "drizzle-orm";
import { logger } from "../../lib/logger.js";

// ── Paula task_class values (from real TOOLS + action names in agentChat.ts) ──
export const PAULA_TASK_CLASSES = [
  "whatsapp_inbound",       // default: inbound WhatsApp message processed by Paula
  "escalate_to_support",    // tool: escalate_to_support
  "prepare_bill_payment",   // tool: prepare_bill_payment
  "prepare_withdrawal",     // tool: prepare_withdrawal
  "prepare_p2p_transfer",   // tool: prepare_p2p_transfer
  "staged_payment",         // confirmed payment action
] as const;

// ── Tony task_class values ────────────────────────────────────────────────────
export const TONY_TASK_CLASSES = [
  "command_center_query",   // default: any Tony analytics query
] as const;

// ── Paula tool names (from TOOLS array in agentChat.ts) ───────────────────────
export const PAULA_TOOL_NAMES = [
  "get_payment_history",
  "get_wallet_balance",
  "get_pending_oxxo",
  "get_loyalty_points",
  "get_deposit_instructions",
  "escalate_to_support",
  "prepare_bill_payment",
  "prepare_withdrawal",
  "prepare_p2p_transfer",
] as const;

// ── Tony tool names (from TOOLS array in commandCenterAgent.ts) ───────────────
export const TONY_TOOL_NAMES = [
  "get_overview",
  "get_users",
  "get_payments",
  "get_daily_signups",
  "get_revenue",
  "get_reps",
  "get_system_health",
  "get_gsc_data",
  "get_taecel_balance",
] as const;

export function isAgentInstrumentationEnabled(): boolean {
  return process.env.ENABLE_AGENT_INSTRUMENTATION !== "false";
}

// ── Agent ID cache (populated once on first use) ───────────────────────────────
const agentIdCache = new Map<string, number>();

async function getAgentId(slug: string): Promise<number | null> {
  if (agentIdCache.has(slug)) return agentIdCache.get(slug)!;
  try {
    const { db } = await import("@workspace/db");
    const result = await db.execute(sql`SELECT id FROM agents WHERE slug = ${slug} LIMIT 1`);
    const row = result.rows[0] as { id: number } | undefined;
    if (!row) return null;
    agentIdCache.set(slug, row.id);
    return row.id;
  } catch {
    return null;
  }
}

// ── Redaction helpers ──────────────────────────────────────────────────────────

/** Replace phone-like strings with last-4 masking. */
function redactPhone(v: unknown): unknown {
  if (typeof v === "string" && /^\+?[\d\s\-]{7,15}$/.test(v.trim())) {
    return `***${v.trim().slice(-4)}`;
  }
  return v;
}

/**
 * Redact PII from a tool input object. Removes raw message bodies; masks
 * telefono values; preserves service IDs, amounts, and intent fields.
 */
function redactInput(input: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    if (k === "message" || k === "text" || k === "body" || k === "issue_summary") {
      out[k] = "[REDACTED]";
    } else if (k === "telefono" || k === "recipient_phone") {
      out[k] = redactPhone(v);
    } else if (typeof v === "object" && v !== null && !Array.isArray(v)) {
      out[k] = redactInput(v as Record<string, unknown>);
    } else {
      out[k] = v;
    }
  }
  return out;
}

/**
 * Redact PII from a tool output / result object. Strips balances and
 * payment amounts from keys that would expose account-level data.
 * Service IDs and status values are preserved for diagnostics.
 */
function redactOutput(result: unknown): Record<string, unknown> {
  if (result === null || result === undefined) return {};
  if (typeof result !== "object") return { value: "[SCALAR_REDACTED]" };
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(result as Record<string, unknown>)) {
    if (k === "balance_mxn" || k === "amount" || k === "amount_mxn") {
      out[k] = "[AMOUNT_REDACTED]";
    } else if (k === "telefono" || k === "recipient_phone" || k === "phone") {
      out[k] = redactPhone(v);
    } else if (Array.isArray(v)) {
      out[k] = `[ARRAY:${(v as unknown[]).length}]`;
    } else if (typeof v === "object" && v !== null) {
      out[k] = "[OBJECT_REDACTED]";
    } else {
      out[k] = v;
    }
  }
  return out;
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Generate a task UUID synchronously (pre-seeded). The DB INSERT is fire-and-forget.
 * Returns the UUID so callers can reference it for tool calls and outcomes.
 * Returns null if instrumentation is disabled.
 */
export function startAgentTask(
  agentSlug: string,
  taskClass: string,
  telefono?: string | null,
  correlationId?: string | null,
): string | null {
  if (!isAgentInstrumentationEnabled()) return null;

  const taskId = crypto.randomUUID();
  const now = new Date().toISOString();

  // Fire-and-forget — never awaited
  (async () => {
    try {
      const agentId = await getAgentId(agentSlug);
      if (agentId === null) return; // agents not yet seeded (fresh boot race)
      const { db } = await import("@workspace/db");
      await db.execute(sql`
        INSERT INTO agent_tasks
          (id, agent_id, telefono, task_class, correlation_id,
           status, created_at, started_at,
           cost_cents, cost_source, cost_status)
        VALUES
          (${taskId}::uuid, ${agentId}, ${telefono ?? null},
           ${taskClass}, ${correlationId ?? null},
           'in_progress', ${now}::timestamptz, ${now}::timestamptz,
           null, null, 'unavailable')
      `);
    } catch (err) {
      logger.debug({ err, taskId, agentSlug }, "[Build1A] startAgentTask insert failed");
    }
  })();

  return taskId;
}

/**
 * Record a single tool call. Fire-and-forget.
 */
export function recordToolCall(
  taskId: string | null,
  toolName: string,
  input: Record<string, unknown>,
  output: unknown,
  status: "success" | "error" | "timeout" = "success",
): void {
  if (!isAgentInstrumentationEnabled() || !taskId) return;

  const now = new Date().toISOString();

  (async () => {
    try {
      const { db } = await import("@workspace/db");
      await db.execute(sql`
        INSERT INTO agent_tool_calls
          (task_id, tool_name, requested_at, completed_at,
           status, input_summary, output_summary)
        VALUES
          (${taskId}::uuid, ${toolName},
           ${now}::timestamptz, ${now}::timestamptz,
           ${status},
           ${JSON.stringify(redactInput(input))}::jsonb,
           ${JSON.stringify(redactOutput(output))}::jsonb)
      `);
    } catch (err) {
      logger.debug({ err, taskId, toolName }, "[Build1A] recordToolCall insert failed");
    }
  })();
}

/**
 * Record the objective outcome of a task. Fire-and-forget.
 * Must be called for every task — even those with zero predictions attached.
 */
export function recordTaskOutcome(
  taskId: string | null,
  outcomeStatus: "resolved" | "unresolved" | "disputed" | "delayed",
  resolvedValue?: Record<string, unknown> | null,
  failureClass?: "technical" | "agent_behavior" | null,
): void {
  if (!isAgentInstrumentationEnabled() || !taskId) return;

  const now = new Date().toISOString();

  (async () => {
    try {
      const { db } = await import("@workspace/db");
      // Complete the task row first
      await db.execute(sql`
        UPDATE agent_tasks
        SET status = ${outcomeStatus === "resolved" ? "completed" : "failed"},
            completed_at = ${now}::timestamptz
        WHERE id = ${taskId}::uuid
      `);
      // Insert outcome row
      await db.execute(sql`
        INSERT INTO agent_task_outcomes
          (task_id, outcome_status, resolved_value, failure_class,
           source_attribution, resolved_at)
        VALUES
          (${taskId}::uuid, ${outcomeStatus},
           ${resolvedValue ? JSON.stringify(resolvedValue) : null}::jsonb,
           ${failureClass ?? null},
           'automatic',
           ${now}::timestamptz)
      `);
    } catch (err) {
      logger.debug({ err, taskId }, "[Build1A] recordTaskOutcome insert failed");
    }
  })();
}
