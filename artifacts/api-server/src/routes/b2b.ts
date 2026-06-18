/**
 * B2B Alternative Data API — /api/b2b/*
 *
 * Exposes anonymized PTI cohort data and per-user trust scores to
 * credentialed partners (lenders, fintechs, insurers).
 *
 * Security model:
 *   - All endpoints require x-api-key header
 *   - Keys stored as SHA-256 hashes in b2b_api_keys table (raw key never stored)
 *   - Every request written to b2b_audit_log (data lineage)
 *   - telefono is NEVER returned — only SHA-256(telefono + salt) hashed IDs
 *   - Cohort endpoint enforces k-anonymity: only cohorts with n >= 5 exposed
 *
 * Endpoints:
 *   GET /api/b2b/cohort         — aggregate PTI cohort stats (k-anon enforced)
 *   GET /api/b2b/user/:hash     — single-user PTI export by hashed_user_id
 *   GET /api/b2b/audit          — partner's own audit log (last 90 days)
 *   POST /api/b2b/batch         — bulk user lookup by array of hashed_user_ids (max 500)
 */

import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "../lib/logger.js";
import crypto from "crypto";
import path from "path";

const router = Router();

// ── Constants ─────────────────────────────────────────────────────────────────

const TELEFONO_HASH_SALT = "pagoya2026";
const K_ANON_MIN = 5;

// ── Helpers ───────────────────────────────────────────────────────────────────

function hashApiKey(rawKey: string): string {
  return crypto.createHash("sha256").update(rawKey).digest("hex");
}

function hashTelefono(telefono: string): string {
  return crypto.createHash("sha256").update(telefono + TELEFONO_HASH_SALT).digest("hex");
}

interface B2BPartner {
  id: string;
  partner_name: string;
  purpose_code: string;
  allowed_endpoints: string[];
  rate_limit_rpm: number;
  rate_limit_per_day: number;
}

async function authenticateRequest(req: Request, res: Response): Promise<B2BPartner | null> {
  const rawKey = (req.headers["x-api-key"] as string | undefined)?.trim();
  if (!rawKey) {
    res.status(401).json({ error: "x-api-key header required." });
    return null;
  }

  const keyHash = hashApiKey(rawKey);

  try {
    const row = await db.execute(sql`
      SELECT id, partner_name, purpose_code, allowed_endpoints, rate_limit_rpm, rate_limit_per_day
      FROM b2b_api_keys
      WHERE api_key_hash = ${keyHash} AND is_active = true
      LIMIT 1
    `);
    const partner = row.rows[0] as B2BPartner | undefined;

    if (!partner) {
      res.status(401).json({ error: "Invalid or inactive API key." });
      return null;
    }

    // Fire-and-forget: update last_used_at
    db.execute(sql`
      UPDATE b2b_api_keys SET last_used_at = NOW() WHERE api_key_hash = ${keyHash}
    `).catch(() => {});

    return partner;
  } catch (err) {
    logger.error({ err }, "b2b: auth lookup failed");
    res.status(500).json({ error: "Authentication service unavailable." });
    return null;
  }
}

async function writeAuditLog(params: {
  partner_name: string;
  api_key_hash: string;
  endpoint: string;
  method: string;
  query_params: Record<string, unknown>;
  records_returned: number;
  hashed_user_ids: string[];
  purpose_code: string;
  ip_address: string;
  response_ms: number;
  status_code: number;
}): Promise<void> {
  await db.execute(sql`
    INSERT INTO b2b_audit_log
      (partner_name, api_key_hash, endpoint, http_method, query_params,
       records_returned, hashed_user_ids, purpose_code, ip_address,
       response_ms, status_code)
    VALUES (
      ${params.partner_name},
      ${params.api_key_hash},
      ${params.endpoint},
      ${params.method},
      ${JSON.stringify(params.query_params)}::jsonb,
      ${params.records_returned},
      ${params.hashed_user_ids}::text[],
      ${params.purpose_code},
      ${params.ip_address},
      ${params.response_ms},
      ${params.status_code}
    )
  `).catch(err => logger.error({ err }, "b2b: audit log write failed"));
}

// ── Per-key daily rate limiter ────────────────────────────────────────────────
// Queries b2b_audit_log for today's request count per key.
// Closes the enumeration gap on /user/:hash — without this, a partner
// could enumerate the full dataset one record at a time despite the /batch cap.

async function checkDailyRateLimit(
  keyHash: string,
  partner: B2BPartner,
  res: Response,
): Promise<boolean> {
  try {
    const countRow = await db.execute(sql`
      SELECT COUNT(*)::int AS daily_count
      FROM b2b_audit_log
      WHERE api_key_hash = ${keyHash}
        AND queried_at > DATE_TRUNC('day', NOW() AT TIME ZONE 'America/Mexico_City')
    `);
    const dailyCount = Number((countRow.rows[0] as Record<string, unknown>)?.daily_count ?? 0);
    if (dailyCount >= partner.rate_limit_per_day) {
      res.status(429).json({
        error: "Daily request limit exceeded.",
        limit: partner.rate_limit_per_day,
        used: dailyCount,
        resets_at: "midnight Mexico City time (America/Mexico_City)",
      });
      return false;
    }
    return true;
  } catch (err) {
    logger.warn({ err, partner: partner.partner_name }, "b2b: rate limit check failed — allowing request");
    return true; // fail open on DB error rather than blocking legitimate calls
  }
}

// ── GET /api/b2b/cohort ───────────────────────────────────────────────────────
// Returns k-anonymity-enforced cohort aggregates from pti_cohort_safe view.
// Params: colonia?, score_band?, month? (YYYY-MM), limit? (max 200)

router.get("/cohort", async (req: Request, res: Response) => {
  const t0 = Date.now();
  const partner = await authenticateRequest(req, res);
  if (!partner) return;

  const { colonia, score_band, month, limit = "50" } = req.query as Record<string, string>;
  const rowLimit = Math.min(200, Math.max(1, parseInt(limit) || 50));

  const keyHash = hashApiKey((req.headers["x-api-key"] as string).trim());
  if (!(await checkDailyRateLimit(keyHash, partner, res))) return;

  try {
    // Build WHERE conditions
    const conditions: string[] = [];
    const values: (string | number)[] = [];
    if (colonia)     { conditions.push(`colonia_label ILIKE '%' || $${values.push(colonia)}     || '%'`); }
    if (score_band)  { conditions.push(`pti_score_band = $${values.push(parseInt(score_band))}`); }
    if (month)       { conditions.push(`score_month = DATE_TRUNC('month', $${values.push(month + '-01')}::date)`); }

    const rows = await db.execute(sql`
      SELECT
        colonia_label,
        pti_score_band,
        TO_CHAR(score_month, 'YYYY-MM') AS score_month,
        cohort_size,
        avg_pti_score,
        avg_pr, avg_bc, avg_ed, avg_cf,
        stddev_pti, min_pti, max_pti,
        model_version
      FROM pti_cohort_safe
      ORDER BY score_month DESC, cohort_size DESC
      LIMIT ${rowLimit}
    `);

    const data = rows.rows;
    const ms = Date.now() - t0;

    await writeAuditLog({
      partner_name: partner.partner_name,
      api_key_hash: keyHash,
      endpoint: "/api/b2b/cohort",
      method: "GET",
      query_params: req.query as Record<string, unknown>,
      records_returned: data.length,
      hashed_user_ids: [],
      purpose_code: partner.purpose_code,
      ip_address: req.ip ?? req.socket.remoteAddress ?? "unknown",
      response_ms: ms,
      status_code: 200,
    });

    res.json({
      data,
      meta: {
        total_cohorts: data.length,
        k_anonymity_min: K_ANON_MIN,
        note: `Cohorts with fewer than ${K_ANON_MIN} users are suppressed.`,
        model_version: "v2.1-4dim",
        generated_at: new Date().toISOString(),
      },
    });
  } catch (err) {
    logger.error({ err, partner: partner.partner_name }, "b2b/cohort: query failed");
    res.status(500).json({ error: "Query failed." });
  }
});

// ── GET /api/b2b/user/:hashed_id ─────────────────────────────────────────────
// Returns single-user PTI export by hashed_user_id.
// No telefono ever returned. Caller must already hold the hashed_user_id.

router.get("/user/:hashed_id", async (req: Request, res: Response) => {
  const t0 = Date.now();
  const partner = await authenticateRequest(req, res);
  if (!partner) return;

  const { hashed_id } = req.params;
  if (!hashed_id || hashed_id.length !== 64) {
    res.status(400).json({ error: "Invalid hashed_user_id format (expected 64-char hex)." });
    return;
  }

  const keyHash = hashApiKey((req.headers["x-api-key"] as string).trim());
  if (!(await checkDailyRateLimit(keyHash, partner, res))) return;

  try {
    const rows = await db.execute(sql`
      SELECT
        hashed_user_id, colonia_label,
        pti_score, pti_score_band,
        pr_score, bc_score, ed_score, cf_score,
        model_version,
        TO_CHAR(score_month, 'YYYY-MM') AS score_month
      FROM pti_export_safe
      WHERE hashed_user_id = ${hashed_id}
      LIMIT 1
    `);

    const user = rows.rows[0] as Record<string, unknown> | undefined;
    const ms = Date.now() - t0;

    if (!user) {
      await writeAuditLog({
        partner_name: partner.partner_name,
        api_key_hash: keyHash,
        endpoint: `/api/b2b/user/${hashed_id}`,
        method: "GET",
        query_params: {},
        records_returned: 0,
        hashed_user_ids: [hashed_id],
        purpose_code: partner.purpose_code,
        ip_address: req.ip ?? req.socket.remoteAddress ?? "unknown",
        response_ms: ms,
        status_code: 404,
      });
      res.status(404).json({ error: "User not found or PTI not yet computed." });
      return;
    }

    await writeAuditLog({
      partner_name: partner.partner_name,
      api_key_hash: keyHash,
      endpoint: `/api/b2b/user/${hashed_id}`,
      method: "GET",
      query_params: {},
      records_returned: 1,
      hashed_user_ids: [hashed_id],
      purpose_code: partner.purpose_code,
      ip_address: req.ip ?? req.socket.remoteAddress ?? "unknown",
      response_ms: ms,
      status_code: 200,
    });

    res.json({ data: user, meta: { generated_at: new Date().toISOString() } });
  } catch (err) {
    logger.error({ err, partner: partner.partner_name }, "b2b/user: query failed");
    res.status(500).json({ error: "Query failed." });
  }
});

// ── POST /api/b2b/batch ───────────────────────────────────────────────────────
// Bulk PTI lookup by array of hashed_user_ids (max 500 per request).

router.post("/batch", async (req: Request, res: Response) => {
  const t0 = Date.now();
  const partner = await authenticateRequest(req, res);
  if (!partner) return;

  const { hashed_user_ids } = req.body as { hashed_user_ids?: string[] };
  if (!Array.isArray(hashed_user_ids) || hashed_user_ids.length === 0) {
    res.status(400).json({ error: "hashed_user_ids array required." });
    return;
  }
  if (hashed_user_ids.length > 500) {
    res.status(400).json({ error: "Maximum 500 IDs per batch request." });
    return;
  }
  const validIds = hashed_user_ids.filter(id => typeof id === "string" && id.length === 64);
  if (validIds.length === 0) {
    res.status(400).json({ error: "No valid hashed_user_ids provided." });
    return;
  }

  const keyHash = hashApiKey((req.headers["x-api-key"] as string).trim());
  if (!(await checkDailyRateLimit(keyHash, partner, res))) return;

  try {
    const idList = validIds.map(id => `'${id.replace(/'/g, "")}'`).join(", ");
    const rows = await db.execute(sql`
      SELECT
        hashed_user_id, colonia_label,
        pti_score, pti_score_band,
        pr_score, bc_score, ed_score, cf_score,
        model_version,
        TO_CHAR(score_month, 'YYYY-MM') AS score_month
      FROM pti_export_safe
      WHERE hashed_user_id = ANY(${validIds}::text[])
    `);

    const data = rows.rows;
    const ms = Date.now() - t0;

    await writeAuditLog({
      partner_name: partner.partner_name,
      api_key_hash: keyHash,
      endpoint: "/api/b2b/batch",
      method: "POST",
      query_params: { requested: validIds.length },
      records_returned: data.length,
      hashed_user_ids: validIds,
      purpose_code: partner.purpose_code,
      ip_address: req.ip ?? req.socket.remoteAddress ?? "unknown",
      response_ms: ms,
      status_code: 200,
    });

    res.json({
      data,
      meta: {
        requested: validIds.length,
        found: data.length,
        not_found: validIds.length - data.length,
        generated_at: new Date().toISOString(),
      },
    });
  } catch (err) {
    logger.error({ err, partner: partner.partner_name }, "b2b/batch: query failed");
    res.status(500).json({ error: "Query failed." });
  }
});

// ── GET /api/b2b/audit ────────────────────────────────────────────────────────
// Partners can view their own audit log (last 90 days, max 500 rows).

router.get("/audit", async (req: Request, res: Response) => {
  const t0 = Date.now();
  const partner = await authenticateRequest(req, res);
  if (!partner) return;

  const keyHash = hashApiKey((req.headers["x-api-key"] as string).trim());
  if (!(await checkDailyRateLimit(keyHash, partner, res))) return;
  const { limit = "100" } = req.query as Record<string, string>;
  const rowLimit = Math.min(500, Math.max(1, parseInt(limit) || 100));

  try {
    const rows = await db.execute(sql`
      SELECT
        queried_at, endpoint, http_method, query_params,
        records_returned, array_length(hashed_user_ids, 1) AS user_ids_queried,
        response_ms, status_code
      FROM b2b_audit_log
      WHERE api_key_hash = ${keyHash}
        AND queried_at > NOW() - INTERVAL '90 days'
      ORDER BY queried_at DESC
      LIMIT ${rowLimit}
    `);

    res.json({
      partner: partner.partner_name,
      data: rows.rows,
      meta: { total: rows.rows.length, window_days: 90 },
    });
  } catch (err) {
    logger.error({ err, partner: partner.partner_name }, "b2b/audit: query failed");
    res.status(500).json({ error: "Query failed." });
  }
});

// ── POST /api/b2b/admin/provision-key ────────────────────────────────────────
// Internal endpoint (requires ADMIN_SECRET header) to create a new B2B API key.
// Returns the raw key once — it is NOT stored, only its hash is.

router.post("/admin/provision-key", async (req: Request, res: Response) => {
  const adminSecret = req.headers["x-admin-secret"] as string | undefined;
  if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
    res.status(403).json({ error: "Forbidden." });
    return;
  }

  const { partner_name, purpose_code, allowed_endpoints = [], rate_limit_rpm = 60 } =
    req.body as {
      partner_name?: string;
      purpose_code?: string;
      allowed_endpoints?: string[];
      rate_limit_rpm?: number;
    };

  if (!partner_name || !purpose_code) {
    res.status(400).json({ error: "partner_name and purpose_code required." });
    return;
  }

  // Generate a cryptographically secure raw API key
  const rawKey = `b2b_${crypto.randomBytes(32).toString("hex")}`;
  const keyHash = hashApiKey(rawKey);

  try {
    await db.execute(sql`
      INSERT INTO b2b_api_keys
        (partner_name, api_key_hash, purpose_code, allowed_endpoints, rate_limit_rpm)
      VALUES (
        ${partner_name}, ${keyHash}, ${purpose_code},
        ${allowed_endpoints}::text[], ${rate_limit_rpm}
      )
    `);

    logger.info({ partner_name, purpose_code }, "b2b: new API key provisioned");

    res.json({
      api_key: rawKey,
      partner_name,
      purpose_code,
      warning: "Store this key securely — it will not be shown again. PagoYa stores only its hash.",
    });
  } catch (err) {
    logger.error({ err, partner_name }, "b2b: key provision failed");
    res.status(500).json({ error: "Key provisioning failed." });
  }
});

// ── GET /api/b2b/docs/data-card ──────────────────────────────────────────────
// Serves the PTI Data Card HTML — public methodology document, no auth required.
// Accessible at /api/b2b/docs/data-card (printable to PDF from browser).

router.get("/docs/data-card", (_req: Request, res: Response) => {
  const filePath = path.resolve(process.cwd(), "public", "b2b-data-card.html");
  res.sendFile(filePath);
});

export default router;
