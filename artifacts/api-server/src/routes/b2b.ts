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
 *   GET /api/b2b/cohort              — aggregate PTI cohort stats (k-anon enforced)
 *   GET /api/b2b/user/:hash          — single-user PTI export by hashed_user_id
 *   GET /api/b2b/profile/:hashed_id  — full enriched profile (consent-gated: READY + consented)
 *   GET /api/b2b/audit               — partner's own audit log (last 90 days)
 *   POST /api/b2b/batch              — bulk user lookup by array of hashed_user_ids (max 500)
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
        model_version: "v3.0-granular",
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
        TO_CHAR(score_month, 'YYYY-MM') AS score_month,
        pti_b2b_score, pti_trajectory,
        avg_monthly_load_amount, load_amount_stddev, income_regularity_score,
        dominant_payday_window, payday_consistency,
        monthly_bill_obligations, wallet_load_to_bill_ratio, essential_bill_ratio,
        platform_tenure_days, active_months, longest_gap_days
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
        TO_CHAR(score_month, 'YYYY-MM') AS score_month,
        pti_b2b_score, pti_trajectory,
        avg_monthly_load_amount, load_amount_stddev, income_regularity_score,
        dominant_payday_window, payday_consistency,
        monthly_bill_obligations, wallet_load_to_bill_ratio, essential_bill_ratio,
        platform_tenure_days, active_months, longest_gap_days
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

// ── GET /api/b2b/profile/:hashed_id ──────────────────────────────────────────
// Full enriched per-user profile for lending/screening partners.
//
// Consent gate (both required):
//   1. readiness_assessments.gate_status = 'READY'  (PTI ≥ 80 + 5 criteria met)
//   2. paula_pending_handoffs.status = 'consented'  (user explicitly said sí to handoff)
//
// Returns 403 { error: "consent_required" } if either condition is unmet.
// Telefono is NEVER returned. hashed_id lookup uses sha256 server-side only.

router.get("/profile/:hashed_id", async (req: Request, res: Response) => {
  const t0 = Date.now();
  const partner = await authenticateRequest(req, res);
  if (!partner) return;

  const { hashed_id } = req.params;
  if (!hashed_id || hashed_id.length !== 64) {
    res.status(400).json({ error: "Invalid hashed_id format (expected 64-char hex SHA-256)." });
    return;
  }

  const keyHash = hashApiKey((req.headers["x-api-key"] as string).trim());
  if (!(await checkDailyRateLimit(keyHash, partner, res))) return;

  try {
    // ── 1. Consent gate — resolve user + check both consent conditions ──────
    const consentRow = await db.execute(sql`
      SELECT u.telefono, ra.gate_status, pph.status AS handoff_status
      FROM users u
      JOIN readiness_assessments ra
        ON ra.telefono = u.telefono AND ra.gate_status = 'READY'
      LEFT JOIN paula_pending_handoffs pph
        ON pph.telefono = u.telefono AND pph.status = 'consented'
      WHERE encode(sha256((u.telefono || 'pagoya2026')::bytea), 'hex') = ${hashed_id}
      ORDER BY ra.created_at DESC
      LIMIT 1
    `);

    const ms = Date.now() - t0;

    if (!consentRow.rows[0]) {
      await writeAuditLog({
        partner_name: partner.partner_name,
        api_key_hash: keyHash,
        endpoint: `/api/b2b/profile/${hashed_id}`,
        method: "GET",
        query_params: {},
        records_returned: 0,
        hashed_user_ids: [hashed_id],
        purpose_code: partner.purpose_code,
        ip_address: req.ip ?? req.socket.remoteAddress ?? "unknown",
        response_ms: ms,
        status_code: 403,
      });
      res.status(403).json({
        error: "consent_required",
        detail: "User has not completed the READY gate or has not consented to data sharing.",
      });
      return;
    }

    const consentGateRow = consentRow.rows[0] as Record<string, unknown>;
    if (consentGateRow.handoff_status !== "consented") {
      await writeAuditLog({
        partner_name: partner.partner_name,
        api_key_hash: keyHash,
        endpoint: `/api/b2b/profile/${hashed_id}`,
        method: "GET",
        query_params: {},
        records_returned: 0,
        hashed_user_ids: [hashed_id],
        purpose_code: partner.purpose_code,
        ip_address: req.ip ?? req.socket.remoteAddress ?? "unknown",
        response_ms: ms,
        status_code: 403,
      });
      res.status(403).json({
        error: "consent_required",
        detail: "User has not explicitly consented to data sharing with lending partners.",
      });
      return;
    }

    const telefono = consentGateRow.telefono as string;

    // ── 2. Load PTI trajectory + core signals ────────────────────────────────
    const ptiRow = await db.execute(sql`
      SELECT
        hashed_user_id, colonia_label,
        pti_score, pti_score_band, pti_b2b_score, pti_trajectory,
        pr_score, bc_score, ed_score, cf_score,
        model_version,
        TO_CHAR(score_month, 'YYYY-MM') AS score_month,
        avg_monthly_load_amount, load_amount_stddev, income_regularity_score,
        dominant_payday_window, payday_consistency,
        monthly_bill_obligations, wallet_load_to_bill_ratio, essential_bill_ratio,
        platform_tenure_days, active_months, longest_gap_days
      FROM pti_export_safe
      WHERE hashed_user_id = ${hashed_id}
      LIMIT 1
    `);

    // ── 3. Load PTI trend snapshot (velocity + 30/60/90d trends) ─────────────
    const trendRow = await db.execute(sql`
      SELECT velocity, trend_30d, trend_60d, trend_90d, trajectory
      FROM pti_trend_snapshots pts
      JOIN users u ON u.id = pts.user_id
      WHERE u.telefono = ${telefono}
      ORDER BY pts.computed_at DESC
      LIMIT 1
    `);

    // ── 4. Enrichment signals from credit_profiles ────────────────────────────
    const enrichRow = await db.execute(sql`
      SELECT
        biller_count_slope_90d, biller_count_slope_n,
        payment_amount_cv, payment_amount_cv_n,
        priority_rank_json, priority_rank_n,
        partial_payment_count,
        enrichment_computed_at
      FROM credit_profiles
      WHERE telefono = ${telefono}
      LIMIT 1
    `);

    // ── 5. Payment reliability from expected_payments ─────────────────────────
    const reliabilityRow = await db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE status IN ('paid','cured'))::int    AS bills_paid_90d,
        COUNT(*) FILTER (WHERE status = 'missed')::int             AS bills_missed_90d,
        COUNT(*) FILTER (WHERE status = 'cured')::int              AS bills_cured_90d,
        COUNT(*) FILTER (WHERE expected_date >= NOW() - INTERVAL '90 days')::int AS total_90d
      FROM expected_payments
      WHERE telefono = ${telefono}
        AND expected_date >= NOW() - INTERVAL '90 days'
    `);

    // ── 6. Average days from due (early/late) ─────────────────────────────────
    const daysRow = await db.execute(sql`
      SELECT
        ROUND(AVG(days_from_due::numeric), 1)::float AS avg_days_from_due,
        COUNT(*) FILTER (WHERE days_from_due > 0)::int  AS early_count,
        COUNT(*) FILTER (WHERE days_from_due <= 0)::int AS late_count
      FROM bill_payments
      WHERE telefono = ${telefono}
        AND days_from_due IS NOT NULL
        AND status = ANY(ARRAY['completed','success','completed_ok','confirmed'])
        AND created_at >= NOW() - INTERVAL '90 days'
    `);

    // ── 7. Payment channel distribution ──────────────────────────────────────
    const channelRow = await db.execute(sql`
      SELECT
        ROUND(
          COUNT(*) FILTER (WHERE channel = 'wallet_balance')::numeric
            / NULLIF(COUNT(*), 0)::numeric, 3
        )::float AS wallet_pct,
        ROUND(
          COUNT(*) FILTER (WHERE channel = 'card_direct')::numeric
            / NULLIF(COUNT(*), 0)::numeric, 3
        )::float AS card_pct,
        COUNT(*) FILTER (WHERE channel IS NOT NULL)::int AS channel_sample_n
      FROM bill_payments
      WHERE telefono = ${telefono}
        AND status = ANY(ARRAY['completed','success','completed_ok','confirmed'])
        AND created_at >= NOW() - INTERVAL '90 days'
    `);

    // ── 8. Paula engagement ───────────────────────────────────────────────────
    const paulaRow = await db.execute(sql`
      SELECT
        MODE() WITHIN GROUP (ORDER BY response_bucket) AS top_bucket,
        ROUND(AVG(response_latency_h)::numeric, 0)::int AS avg_latency_h,
        COUNT(*)::int AS trigger_count
      FROM paula_response_metrics
      WHERE telefono = ${telefono}
        AND sent_at >= NOW() - INTERVAL '90 days'
    `);

    // ── 9. Biller mix ─────────────────────────────────────────────────────────
    const billerRow = await db.execute(sql`
      SELECT COUNT(DISTINCT service_name)::int AS active_billers
      FROM bill_payments
      WHERE telefono = ${telefono}
        AND status = ANY(ARRAY['completed','success','completed_ok','confirmed'])
        AND created_at >= NOW() - INTERVAL '90 days'
    `);

    // ── Assemble response ─────────────────────────────────────────────────────
    const pti       = ptiRow.rows[0]         as Record<string, unknown> | undefined;
    const trend     = trendRow.rows[0]       as Record<string, unknown> | undefined;
    const enrich    = enrichRow.rows[0]      as Record<string, unknown> | undefined;
    const rel       = reliabilityRow.rows[0] as Record<string, unknown> | undefined;
    const days      = daysRow.rows[0]        as Record<string, unknown> | undefined;
    const channel   = channelRow.rows[0]     as Record<string, unknown> | undefined;
    const paula     = paulaRow.rows[0]       as Record<string, unknown> | undefined;
    const biller    = billerRow.rows[0]      as Record<string, unknown> | undefined;

    if (!pti) {
      res.status(404).json({ error: "User PTI profile not yet computed." });
      return;
    }

    // data_completeness: fraction of enriched fields that are non-null
    const enrichedFields = [
      enrich?.biller_count_slope_90d,
      enrich?.payment_amount_cv,
      enrich?.priority_rank_json,
      enrich?.partial_payment_count,
      trend?.velocity,
      days?.avg_days_from_due,
      channel?.wallet_pct,
      paula?.top_bucket,
    ];
    const completeness = Math.round(
      (enrichedFields.filter(v => v != null).length / enrichedFields.length) * 100
    ) / 100;

    // data_reliability: per-field minimum-N assessment
    const dataReliability: Record<string, string> = {};
    const slopeN = Number(enrich?.biller_count_slope_n ?? 0);
    const cvN    = Number(enrich?.payment_amount_cv_n   ?? 0);
    const rankN  = Number(enrich?.priority_rank_n       ?? 0);
    dataReliability.biller_count_slope_90d = slopeN >= 3  ? "reliable" : slopeN > 0 ? "below_minimum_n" : "no_data";
    dataReliability.payment_amount_cv      = cvN    >= 8  ? "reliable" : cvN    > 0 ? "below_minimum_n" : "no_data";
    dataReliability.priority_rank          = rankN  >= 3  ? "reliable" : rankN  > 0 ? "below_minimum_n" : "no_data";

    const total90d    = Number(rel?.total_90d    ?? 0);
    const missed90d   = Number(rel?.bills_missed_90d ?? 0);
    const cured90d    = Number(rel?.bills_cured_90d  ?? 0);
    const earlyCount  = Number(days?.early_count     ?? 0);
    const lateCount   = Number(days?.late_count      ?? 0);

    const profile = {
      hashed_user_id:  hashed_id,
      colonia:         pti.colonia_label,
      score_month:     pti.score_month,
      model_version:   pti.model_version,

      pti: {
        score:       pti.pti_score,
        score_band:  pti.pti_score_band,
        b2b_score:   pti.pti_b2b_score,
        trajectory:  trend?.trajectory ?? pti.pti_trajectory,
        velocity:    trend?.velocity    ?? null,
        trend_30d:   trend?.trend_30d   ?? null,
        trend_60d:   trend?.trend_60d   ?? null,
        trend_90d:   trend?.trend_90d   ?? null,
        components: {
          payment_regularity: pti.pr_score,
          biller_coverage:    pti.bc_score,
          engagement_depth:   pti.ed_score,
          credit_formation:   pti.cf_score,
        },
      },

      income: {
        avg_monthly_load_mxn:    pti.avg_monthly_load_amount,
        load_stddev_mxn:         pti.load_amount_stddev,
        income_regularity_score: pti.income_regularity_score,
        dominant_payday_window:  pti.dominant_payday_window,
        payday_consistency:      pti.payday_consistency,
        monthly_obligations_mxn: pti.monthly_bill_obligations,
        load_to_bill_ratio:      pti.wallet_load_to_bill_ratio,
        essential_bill_ratio:    pti.essential_bill_ratio,
      },

      payment_reliability: {
        bills_paid_90d:      Number(rel?.bills_paid_90d  ?? 0),
        bills_missed_90d:    missed90d,
        cure_rate:           missed90d > 0 ? Math.round((cured90d / missed90d) * 100) / 100 : null,
        avg_days_from_due:   days?.avg_days_from_due   ?? null,
        early_late_ratio:    lateCount > 0 ? Math.round((earlyCount / (earlyCount + lateCount)) * 100) / 100 : null,
        expected_payments_n: total90d,
        note:                total90d === 0 ? "expected_payments table not yet populated for this user" : null,
      },

      payment_elasticity: {
        amount_cv:             enrich?.payment_amount_cv ?? null,
        partial_payment_count: enrich?.partial_payment_count ?? null,
        partial_payment_note:  enrich?.partial_payment_count == null
          ? "requires_amount_due_mxn — populated for CFE/Telmex only until biller-API due-date pull"
          : null,
      },

      channel_profile: {
        wallet_pct:       channel?.wallet_pct       ?? null,
        card_pct:         channel?.card_pct         ?? null,
        channel_sample_n: channel?.channel_sample_n ?? 0,
        note: Number(channel?.channel_sample_n ?? 0) === 0
          ? "channel field populates on payments made after v3.0 deployment"
          : null,
      },

      biller_mix: {
        active_billers_90d:      biller?.active_billers ?? 0,
        biller_count_slope_90d:  enrich?.biller_count_slope_90d ?? null,
        biller_stability:
          enrich?.biller_count_slope_90d == null ? null
          : Number(enrich.biller_count_slope_90d) > 0.05 ? "growing"
          : Number(enrich.biller_count_slope_90d) < -0.05 ? "shrinking"
          : "stable",
      },

      priority_rank:  enrich?.priority_rank_json ?? null,

      platform_tenure: {
        tenure_days:    pti.platform_tenure_days,
        active_months:  pti.active_months,
        longest_gap_d:  pti.longest_gap_days,
      },

      paula_engagement: {
        nudge_response_bucket: paula?.top_bucket       ?? null,
        avg_response_latency_h: paula?.avg_latency_h   ?? null,
        trigger_sample_n:       paula?.trigger_count   ?? 0,
      },

      data_completeness:   completeness,
      data_reliability:    dataReliability,
      enrichment_computed: enrich?.enrichment_computed_at ?? null,
      generated_at:        new Date().toISOString(),
    };

    const msTotal = Date.now() - t0;

    await writeAuditLog({
      partner_name: partner.partner_name,
      api_key_hash: keyHash,
      endpoint: `/api/b2b/profile/${hashed_id}`,
      method: "GET",
      query_params: {},
      records_returned: 1,
      hashed_user_ids: [hashed_id],
      purpose_code: partner.purpose_code,
      ip_address: req.ip ?? req.socket.remoteAddress ?? "unknown",
      response_ms: msTotal,
      status_code: 200,
    });

    res.json({ data: profile, meta: { generated_at: profile.generated_at } });

  } catch (err) {
    logger.error({ err, partner: partner.partner_name }, "b2b/profile: query failed");
    res.status(500).json({ error: "Query failed." });
  }
});

// ── POST /api/b2b/loan-outcomes ───────────────────────────────────────────────
// Partner-reported loan outcome ingestion for calibration feedback loop.
// Fields 77–80: loan_outcome_status, loan_outcome_reported_at, outcome_partner_id,
//               calibration_delta (auto-computed from pti_score_at_time vs actual).
//
// Body: { hashed_user_id, loan_outcome_status, pti_score_at_time?, loan_amount_mxn?, loan_originated_at? }
// Requires x-api-key — partner must have "loan_outcomes" in allowed_endpoints.

router.post("/loan-outcomes", async (req: Request, res: Response) => {
  const rawKey = (req.headers["x-api-key"] as string | undefined)?.trim();
  if (!rawKey) return res.status(401).json({ error: "Missing x-api-key header." });

  let partner: B2BPartner;
  try {
    partner = await requirePartner(rawKey);
  } catch {
    return res.status(403).json({ error: "Invalid or inactive API key." });
  }

  if (!partner.allowed_endpoints.includes("loan_outcomes") &&
      !partner.allowed_endpoints.includes("*")) {
    return res.status(403).json({ error: "This key is not permitted to submit loan outcomes." });
  }

  const { hashed_user_id, loan_outcome_status, pti_score_at_time, loan_amount_mxn, loan_originated_at } = req.body ?? {};

  if (!hashed_user_id || !loan_outcome_status) {
    return res.status(400).json({ error: "hashed_user_id and loan_outcome_status are required." });
  }
  const validStatuses = ["paid", "default", "delinquent", "current"];
  if (!validStatuses.includes(loan_outcome_status)) {
    return res.status(400).json({ error: `loan_outcome_status must be one of: ${validStatuses.join(", ")}` });
  }

  try {
    // Verify the hashed_user_id exists
    const userCheck = await db.execute(sql`
      SELECT encode(sha256((u.telefono || 'pagoya2026')::bytea), 'hex') AS computed_hash
      FROM users u
      WHERE encode(sha256((u.telefono || 'pagoya2026')::bytea), 'hex') = ${hashed_user_id}
      LIMIT 1
    `);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: "User not found for the provided hashed_user_id." });
    }

    // Fetch current PTI for calibration delta (if pti_score_at_time provided)
    let calibrationDelta: number | null = null;
    if (pti_score_at_time != null) {
      const expected_default_rate =
        pti_score_at_time >= 75 ? 0.03 :
        pti_score_at_time >= 60 ? 0.08 :
        pti_score_at_time >= 45 ? 0.18 :
        pti_score_at_time >= 30 ? 0.30 : 0.50;

      const actual_default = loan_outcome_status === "default" ? 1 : 0;
      calibrationDelta = Math.round((actual_default - expected_default_rate) * 1000) / 1000;
    }

    await db.execute(sql`
      INSERT INTO loan_outcomes (
        telefono_hashed, loan_outcome_status, loan_outcome_reported_at,
        outcome_partner_id, calibration_delta, pti_score_at_time,
        loan_amount_mxn, loan_originated_at
      ) VALUES (
        ${hashed_user_id}, ${loan_outcome_status}, NOW(),
        ${partner.id}, ${calibrationDelta},
        ${pti_score_at_time ?? null}, ${loan_amount_mxn ?? null},
        ${loan_originated_at ?? null}
      )
    `);

    logger.info(
      { partner: partner.partner_name, hashed_user_id, loan_outcome_status, calibrationDelta },
      "b2b/loan-outcomes: outcome ingested"
    );

    res.json({
      accepted: true,
      calibration_delta: calibrationDelta,
      message: "Loan outcome recorded. calibration_delta is the actual minus expected default rate at PTI band.",
    });
  } catch (err) {
    logger.error({ err }, "b2b/loan-outcomes: ingestion failed");
    res.status(500).json({ error: "Ingestion failed." });
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
