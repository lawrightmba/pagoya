/**
 * Sprint 3 — Standalone Licensable PTI API routes.
 *
 * Mounted at /api/v1. Exposes ONLY the base computePTI() score to external
 * licensees — never the fair-lending adjustment layer.
 *
 * POST /api/v1/score          — score a data snapshot (auth required)
 * GET  /api/v1/data-card      — public methodology doc, no auth
 * GET  /api/v1/model-versions — list model versions + deprecation windows
 * POST /api/v1/admin/keys     — provision a licensee key (admin only, unless sandbox)
 * POST /api/v1/admin/keys/:keyId/version — bump a key's pinned model version (admin only, audited)
 */

import crypto from "crypto";
import { Router, type Request, type Response, type NextFunction } from "express";
import { sql } from "drizzle-orm";
import { logger } from "../lib/logger.js";
import {
  authenticateLicenseeKey,
  resolveModelVersion,
  checkLicenseeDailyRateLimit,
  writeLicenseeAuditLog,
  sanitizeLicenseePayload,
  computeLicenseeScore,
  bumpLicenseeVersion,
  hashLicenseeApiKey,
  getSandboxFixture,
  SANDBOX_FIXTURES,
  classifyAdminToken,
  validateProductionIssuanceFields,
  writeLicenseeIssuanceLog,
  DEFAULT_LICENSEE_MODEL_VERSION,
  type LicenseeKeyRecord,
  type IssuingTokenType,
} from "../services/licenseeApi.js";

const router = Router();

// ─── Admin auth guard (Sprint 3b: sandbox/production issuance authority) ──
// Every admin request is classified by WHICH configured token it presented
// (never just "some valid admin key") so production-only actions can never
// be authorized by a low-friction sandbox credential, even if it happens to
// be well-formed.
interface AdminAuthedRequest extends Request {
  adminTokenType?: IssuingTokenType;
}

const adminAuth = (req: AdminAuthedRequest, res: Response, next: NextFunction): void => {
  const presented = (req.headers["x-admin-key"] as string | undefined) || (req.query.adminKey as string | undefined);
  const tokenType = classifyAdminToken(presented);
  if (!tokenType) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  req.adminTokenType = tokenType;
  next();
};

// ─── Licensee key auth middleware ──────────────────────────────────────────
interface AuthedRequest extends Request {
  licenseeKey?: LicenseeKeyRecord;
}

const licenseeAuth = async (req: AuthedRequest, res: Response, next: NextFunction): Promise<void> => {
  const rawKey = (req.headers["x-api-key"] as string | undefined) ?? undefined;
  const record = await authenticateLicenseeKey(rawKey);
  if (!record) {
    res.status(401).json({ error: "invalid_or_missing_api_key" });
    return;
  }
  req.licenseeKey = record;
  next();
};

// ── POST /api/v1/score ───────────────────────────────────────────────────
router.post("/score", licenseeAuth, async (req: AuthedRequest, res: Response): Promise<void> => {
  const start = Date.now();
  const key = req.licenseeKey!;

  const versionResolution = await resolveModelVersion(key.pinned_model_version);
  if (!versionResolution.ok) {
    // version_pending_signoff: the pinned version exists in the registry but
    // has not been approved yet — never served, distinct from a retired
    // (410, was live, now gone) or unknown (500, data-integrity issue) version.
    const status =
      versionResolution.reason === "version_retired" ? 410 :
      versionResolution.reason === "version_pending_signoff" ? 403 :
      500;
    res.status(status).json({ error: versionResolution.reason ?? "model_version_error" });
    return;
  }

  const rateLimit = await checkLicenseeDailyRateLimit(key);
  if (!rateLimit.ok) {
    res.status(429).json({ error: "daily_rate_limit_exceeded", limit: key.rate_limit_per_day });
    return;
  }

  try {
    let snapshotSource: Record<string, unknown>;
    let usingSandboxFixture = false;
    let sandboxFixtureKey: string | undefined;

    if (key.sandbox_mode) {
      // Sandbox keys NEVER score arbitrary caller data — only pre-built
      // synthetic fixtures, selected by key, so nothing resembling real
      // user data can ever be sent through a sandbox credential.
      const requestedFixtureKey = (req.body as Record<string, unknown> | undefined)?.fixture as string | undefined;
      const fixture = getSandboxFixture(requestedFixtureKey);
      snapshotSource = fixture.snapshot as unknown as Record<string, unknown>;
      usingSandboxFixture = true;
      sandboxFixtureKey = fixture.key;
    } else {
      snapshotSource = (req.body ?? {}) as Record<string, unknown>;
    }

    const { snapshot, portableMode, forbiddenFieldsPresent } = sanitizeLicenseePayload(snapshotSource);

    if (forbiddenFieldsPresent.length > 0) {
      logger.warn(
        { keyId: key.key_id, forbiddenFieldsPresent },
        "[licenseeApi] licensee payload contained fair-lending-only fields — ignored, not scored",
      );
    }

    const result = computeLicenseeScore({
      snapshot,
      portableMode,
      modelVersion: key.pinned_model_version,
      sandbox: key.sandbox_mode,
    });

    const responseBody: Record<string, unknown> = { ...result };
    if (forbiddenFieldsPresent.length > 0) {
      responseBody.ignored_fields = forbiddenFieldsPresent;
    }
    if (usingSandboxFixture) {
      responseBody.sandbox_fixture_used = sandboxFixtureKey;
    }
    if (versionResolution.inDeprecationWindow) {
      responseBody.deprecation_notice = {
        version: key.pinned_model_version,
        retires_at: versionResolution.record?.retires_at ?? null,
        message: "This pinned model version is deprecated and will stop serving at retires_at. Request a version bump via your account contact.",
      };
    }

    res.status(200).json(responseBody);
    writeLicenseeAuditLog({
      keyId: key.key_id, endpoint: "/v1/score", method: "POST",
      sandboxMode: key.sandbox_mode, responseMs: Date.now() - start, statusCode: 200,
    });
  } catch (err) {
    logger.error({ err, keyId: key.key_id }, "licenseeApi: POST /score failed");
    res.status(500).json({ error: "internal_error" });
    writeLicenseeAuditLog({
      keyId: key.key_id, endpoint: "/v1/score", method: "POST",
      sandboxMode: key.sandbox_mode, responseMs: Date.now() - start, statusCode: 500,
    });
  }
});

// ── GET /api/v1/data-card ────────────────────────────────────────────────
// Public methodology summary — no auth required, intentionally so
// prospective licensees can review it before signing anything.
router.get("/data-card", (_req: Request, res: Response): void => {
  res.status(200).json({
    product: "PagoYa Trust Index (PTI) — Base Behavioral Score API",
    description:
      "A 0-100 behavioral trust score computed purely from platform usage " +
      "signals — payment reliability, behavioral consistency, engagement " +
      "depth, and cash-flow stability. No bureau data, no declared income, " +
      "no geographic/demographic inputs of any kind.",
    scale: { min: 0, max: 100 },
    dimensions: [
      { key: "payment_reliability", max: 30, description: "Streak, day-of-month consistency, advance-payment behavior, self-initiated ratio." },
      { key: "behavioral_consistency", max: 20, description: "Session cadence, routine regularity, engagement depth, wallet load rhythm, support-channel interaction, notification engagement, financial curiosity." },
      { key: "engagement_depth", max: 25, description: "Biller diversity, KYC verification tier, spend category mix, signup-to-first-use speed, device consistency." },
      { key: "cashflow_stability", max: 25, description: "Wallet balance, load/spend ratio, payment amount volatility, P2P network activity, account age, funding-rail signals where available." },
    ],
    portable_mode: {
      description:
        "When a caller's payload omits wallet-rail-specific fields " +
        "(bank-transfer/cash/card load history), the API automatically " +
        "reallocates the cash-flow-stability dimension's weighting across " +
        "the remaining signals rather than penalizing licensees whose users " +
        "have no PagoYa wallet history.",
      auto_detected: true,
    },
    exclusions: [
      "No fair-lending / regulatory adjustment layer of any kind is applied or exposed by this API.",
      "No geographic (colonia) or declared-income data is accepted, stored, or scored.",
      "This is a base behavioral score only — it is not a credit decision and carries no fair-lending representations.",
    ],
    versioning: "Licensee keys are pinned to a specific model version at issue time and never auto-upgrade. See GET /api/v1/model-versions.",
    sandbox: "Sandbox keys score only pre-built synthetic fixtures (GET /api/v1/model-versions has no fixture listing; fixtures are selected via { fixture: <key> } in the /score request body).",
  });
});

// ── GET /api/v1/model-versions ───────────────────────────────────────────
router.get("/model-versions", async (_req: Request, res: Response): Promise<void> => {
  try {
    const { db } = await import("@workspace/db");
    const rows = await db.execute(sql`
      SELECT version, status, signoff_status, deprecation_notice_days, deprecated_at, retires_at
      FROM licensee_model_versions
      ORDER BY created_at ASC
    `);
    res.status(200).json({ versions: rows.rows });
  } catch (err) {
    logger.error({ err }, "licenseeApi: GET /model-versions failed");
    res.status(500).json({ error: "internal_error" });
  }
});

// ── POST /api/v1/admin/keys ──────────────────────────────────────────────
// Provisions a new licensee key.
//
// Sprint 3b: sandbox issuance stays self-serve/low-friction — any valid
// admin token (sandbox or production) works, no approval fields required.
// Production issuance (sandboxMode=false) is different: it REQUIRES the
// PRODUCTION_ADMIN_TOKEN specifically (a SANDBOX_ADMIN_TOKEN is rejected
// even if otherwise well-formed) plus approvedBy + agreementReference, and
// every key of either kind gets a row in licensee_key_issuance_log at the
// moment of creation.
router.post("/admin/keys", adminAuth, async (req: AdminAuthedRequest, res: Response): Promise<void> => {
  const {
    licenseeName,
    pinnedModelVersion,
    sandboxMode,
    rateLimitRpm,
    rateLimitPerDay,
    approvedBy,
    agreementReference,
    approvalDate,
  } = req.body as {
    licenseeName?: string;
    pinnedModelVersion?: string;
    sandboxMode?: boolean;
    rateLimitRpm?: number;
    rateLimitPerDay?: number;
    approvedBy?: string;
    agreementReference?: string;
    approvalDate?: string;
  };

  const isSandboxMode = sandboxMode ?? true;
  // Sandbox and new-licensee issuance default to the current approved model
  // version (DEFAULT_LICENSEE_MODEL_VERSION) when the caller omits it — the
  // caller can still pin an older version explicitly (e.g. "v4.2-behavioral")
  // if they want that instead.
  const resolvedPinnedModelVersion = pinnedModelVersion ?? DEFAULT_LICENSEE_MODEL_VERSION;

  if (!licenseeName) {
    res.status(400).json({ error: "licenseeName is required" });
    return;
  }

  if (!isSandboxMode) {
    if (req.adminTokenType !== "production") {
      res.status(403).json({ error: "production_admin_token_required", detail: "Issuing a production (non-sandbox) licensee key requires PRODUCTION_ADMIN_TOKEN." });
      return;
    }
    try {
      validateProductionIssuanceFields({ approvedBy, agreementReference, approvalDate });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : "invalid_production_issuance_fields" });
      return;
    }
  }

  try {
    const { db } = await import("@workspace/db");
    const versionRow = await db.execute(sql`SELECT version, signoff_status FROM licensee_model_versions WHERE version = ${resolvedPinnedModelVersion} LIMIT 1`);
    if (versionRow.rows.length === 0) {
      res.status(400).json({ error: "unknown_model_version" });
      return;
    }
    const versionRecord = versionRow.rows[0] as { signoff_status: string };
    if (versionRecord.signoff_status !== "approved") {
      // Never issue a key pinned to a version that hasn't been approved —
      // it would never be able to serve a single /score request anyway.
      res.status(400).json({ error: "version_pending_signoff", detail: `Model version "${resolvedPinnedModelVersion}" has not been approved for serving yet.` });
      return;
    }

    const rawKey = `pk_${crypto.randomBytes(24).toString("hex")}`;
    const apiKeyHash = hashLicenseeApiKey(rawKey);

    const inserted = await db.execute(sql`
      INSERT INTO licensee_api_keys (licensee_name, api_key_hash, pinned_model_version, sandbox_mode, rate_limit_rpm, rate_limit_per_day)
      VALUES (${licenseeName}, ${apiKeyHash}, ${resolvedPinnedModelVersion}, ${isSandboxMode}, ${rateLimitRpm ?? 60}, ${rateLimitPerDay ?? 1000})
      RETURNING key_id
    `);
    const keyId = String((inserted.rows[0] as Record<string, unknown>).key_id);

    // Issuance-time audit: one row per key ever created, sandbox or
    // production, so the full issuance history is queryable in one place.
    await writeLicenseeIssuanceLog({
      keyId,
      licenseeName,
      sandboxMode: isSandboxMode,
      approvedBy: isSandboxMode ? undefined : approvedBy,
      agreementReference: isSandboxMode ? undefined : agreementReference,
      approvalDate: isSandboxMode ? undefined : (approvalDate ?? new Date().toISOString()),
      pinnedModelVersion: resolvedPinnedModelVersion,
      issuingTokenType: req.adminTokenType!,
    });

    // The raw key is returned exactly once, at creation time, and never persisted in plaintext.
    res.status(201).json({ key_id: keyId, api_key: rawKey, pinned_model_version: resolvedPinnedModelVersion, sandbox_mode: isSandboxMode });
  } catch (err) {
    logger.error({ err }, "licenseeApi: POST /admin/keys failed");
    res.status(500).json({ error: "internal_error" });
  }
});

// ── POST /api/v1/admin/keys/:keyId/version ───────────────────────────────
// Sprint 3b: bumping the pinned model version on a PRODUCTION key requires
// PRODUCTION_ADMIN_TOKEN + approvedBy — this changes a live licensee's
// credit model, which is just as consequential as issuing the key itself.
// Sandbox key version-bumps are unaffected (any valid admin token, no
// approvedBy requirement).
router.post("/admin/keys/:keyId/version", adminAuth, async (req: AdminAuthedRequest, res: Response): Promise<void> => {
  const keyId = String(req.params.keyId);
  const { newVersion, reason, approvedBy } = req.body as { newVersion?: string; reason?: string; approvedBy?: string };
  if (!newVersion) {
    res.status(400).json({ error: "newVersion is required" });
    return;
  }

  try {
    const { db } = await import("@workspace/db");
    const keyRow = await db.execute(sql`SELECT sandbox_mode FROM licensee_api_keys WHERE key_id = ${keyId} LIMIT 1`);
    const keyRecord = keyRow.rows[0] as { sandbox_mode: boolean } | undefined;
    if (!keyRecord) {
      res.status(404).json({ error: "unknown_licensee_key" });
      return;
    }

    if (!keyRecord.sandbox_mode) {
      if (req.adminTokenType !== "production") {
        res.status(403).json({ error: "production_admin_token_required", detail: "Bumping a production licensee key's pinned model version requires PRODUCTION_ADMIN_TOKEN." });
        return;
      }
      if (!approvedBy || !approvedBy.trim()) {
        res.status(400).json({ error: "approvedBy is required to bump a production licensee key's model version" });
        return;
      }
    }

    await bumpLicenseeVersion({ keyId, newVersion, actionedBy: approvedBy ?? "admin", reason });
    res.status(200).json({ ok: true, key_id: keyId, new_version: newVersion });
  } catch (err) {
    logger.error({ err, keyId }, "licenseeApi: POST /admin/keys/:keyId/version failed");
    res.status(400).json({ error: err instanceof Error ? err.message : "internal_error" });
  }
});

export default router;
