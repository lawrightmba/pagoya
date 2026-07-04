/**
 * Sprint 3 — Standalone Licensable PTI API (service layer)
 *
 * Exposes ONLY the base 100-point behavioral score computed by the
 * `computePTI` scorer (pti.ts) as a licensable product. This module must
 * NEVER import, call, or otherwise reach into PagoYa's internal
 * regulatory-adjustment module or its supporting audit table — that
 * layer is internal-only, exclusive to PagoYa's own scoring pipeline.
 * A source-scan regression test enforces this boundary (see
 * licenseeApi.test.ts), mirroring the existing computePTI() isolation guard
 * in pti.test.ts.
 *
 * Versioning: licensee keys are pinned to a specific model version at issue
 * time. New model versions never silently apply to existing keys — a
 * licensee must explicitly request a version bump (audited).
 *
 * Sandbox mode: sandbox_mode=true keys only ever score synthetic fixture
 * data (see licenseeSandboxFixtures.ts) and every response is flagged
 * `sandbox: true`, unmistakably, even if screenshotted into a sales deck.
 */

import crypto from "crypto";
import { sql } from "drizzle-orm";
import { logger } from "../lib/logger.js";
import { computePTI, getPTITier, type PTIDataSnapshot, type PTIBreakdown, type PTIConfidence } from "./pti.js";
import { getSandboxFixture, SANDBOX_FIXTURES } from "./licenseeSandboxFixtures.js";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface LicenseeKeyRecord {
  key_id: string;
  licensee_name: string;
  pinned_model_version: string;
  sandbox_mode: boolean;
  is_active: boolean;
  rate_limit_rpm: number;
  rate_limit_per_day: number;
}

export type ModelVersionStatus = "supported" | "deprecated";

export interface ModelVersionRecord {
  version: string;
  status: ModelVersionStatus;
  deprecation_notice_days: number;
  deprecated_at: string | null;
  retires_at: string | null;
}

/**
 * Wallet-rail field keys that, when ALL absent from the raw payload, trigger
 * automatic portable-mode routing. These are exactly the inputs behind
 * `bancarization_speed` and `funding_channel_mix` in pti.ts's Cash-Flow
 * Stability dimension — signals that only exist for PagoYa's own wallet
 * users, never for a licensee's own customers.
 */
const WALLET_RAIL_FIELDS = ["daysToFirstSpei", "oxxoLoadCount", "speiLoadCount", "cardLoadCount"] as const;

/** Fields that belong exclusively to the fair-lending adjustment layer — never scored, never accepted here. */
const FORBIDDEN_FAIR_LENDING_FIELDS = ["colonia", "coloniaTier", "declaredIncomeBucket", "declared_income_bucket"];

export interface LicenseeScorePayload extends Partial<Record<string, unknown>> {
  [key: string]: unknown;
}

export interface LicenseeScoreResult {
  base_score: number;
  tier: string;
  tier_label: string;
  confidence: PTIConfidence;
  dimension_breakdown: PTIBreakdown;
  model_version: string;
  portable_mode: boolean;
  sandbox: boolean;
}

// ─── Auth helpers ───────────────────────────────────────────────────────────

export function hashLicenseeApiKey(rawKey: string): string {
  return crypto.createHash("sha256").update(rawKey).digest("hex");
}

export async function authenticateLicenseeKey(rawKey: string | undefined): Promise<LicenseeKeyRecord | null> {
  if (!rawKey) return null;
  const { db } = await import("@workspace/db");
  const keyHash = hashLicenseeApiKey(rawKey);
  const row = await db.execute(sql`
    SELECT key_id, licensee_name, pinned_model_version, sandbox_mode, is_active, rate_limit_rpm, rate_limit_per_day
    FROM licensee_api_keys
    WHERE api_key_hash = ${keyHash} AND is_active = true
    LIMIT 1
  `);
  const record = row.rows[0] as unknown as LicenseeKeyRecord | undefined;
  if (!record) return null;

  db.execute(sql`UPDATE licensee_api_keys SET last_used_at = NOW() WHERE key_id = ${record.key_id}`).catch(() => {});
  return record;
}

// ─── Version resolution ─────────────────────────────────────────────────────

export interface ModelVersionResolution {
  ok: boolean;
  reason?: "version_not_found" | "version_retired";
  record?: ModelVersionRecord;
  inDeprecationWindow: boolean;
}

/**
 * Resolves whether a key's PINNED version is still servable. A version
 * being "deprecated" does not immediately stop serving it — only once
 * `retires_at` (deprecated_at + deprecation_notice_days) has passed does
 * the version stop serving entirely (version_retired).
 */
export async function resolveModelVersion(pinnedVersion: string): Promise<ModelVersionResolution> {
  const { db } = await import("@workspace/db");
  const row = await db.execute(sql`
    SELECT version, status, deprecation_notice_days, deprecated_at, retires_at
    FROM licensee_model_versions
    WHERE version = ${pinnedVersion}
    LIMIT 1
  `);
  const record = row.rows[0] as unknown as ModelVersionRecord | undefined;
  if (!record) {
    return { ok: false, reason: "version_not_found", inDeprecationWindow: false };
  }

  const now = Date.now();
  const retiresAt = record.retires_at ? new Date(record.retires_at).getTime() : null;
  if (record.status === "deprecated" && retiresAt !== null && now >= retiresAt) {
    return { ok: false, reason: "version_retired", record, inDeprecationWindow: false };
  }

  const inDeprecationWindow = record.status === "deprecated" && retiresAt !== null && now < retiresAt;
  return { ok: true, record, inDeprecationWindow };
}

/**
 * Marks a model version deprecated and computes its retirement date from
 * `deprecation_notice_days`. Existing pinned keys are left untouched — they
 * keep serving until `retires_at`, per the "no silent riding-latest" rule.
 */
export async function deprecateModelVersion(version: string, noticeDays?: number): Promise<ModelVersionRecord> {
  const { db } = await import("@workspace/db");
  const row = await db.execute(sql`
    UPDATE licensee_model_versions
    SET status = 'deprecated',
        deprecated_at = NOW(),
        deprecation_notice_days = COALESCE(${noticeDays ?? null}, deprecation_notice_days),
        retires_at = NOW() + (COALESCE(${noticeDays ?? null}, deprecation_notice_days) || ' days')::interval
    WHERE version = ${version}
    RETURNING version, status, deprecation_notice_days, deprecated_at, retires_at
  `);
  const record = row.rows[0] as unknown as ModelVersionRecord | undefined;
  if (!record) throw new Error(`Model version not found: ${version}`);
  return record;
}

/**
 * The ONLY sanctioned path for a licensee key to move to a new pinned
 * model version. Always explicit, always audited — a version never
 * auto-applies to an existing key.
 */
export async function bumpLicenseeVersion(params: {
  keyId: string;
  newVersion: string;
  actionedBy: string;
  reason?: string;
}): Promise<void> {
  const { keyId, newVersion, actionedBy, reason } = params;
  const { db } = await import("@workspace/db");

  const versionRow = await db.execute(sql`SELECT version FROM licensee_model_versions WHERE version = ${newVersion} LIMIT 1`);
  if (versionRow.rows.length === 0) {
    throw new Error(`Cannot bump to unknown model version: ${newVersion}`);
  }

  const keyRow = await db.execute(sql`SELECT pinned_model_version FROM licensee_api_keys WHERE key_id = ${keyId} LIMIT 1`);
  const key = keyRow.rows[0] as { pinned_model_version: string } | undefined;
  if (!key) throw new Error(`Unknown licensee key: ${keyId}`);

  await db.execute(sql`UPDATE licensee_api_keys SET pinned_model_version = ${newVersion} WHERE key_id = ${keyId}`);
  await db.execute(sql`
    INSERT INTO licensee_version_upgrade_log (key_id, old_version, new_version, actioned_by, reason)
    VALUES (${keyId}, ${key.pinned_model_version}, ${newVersion}, ${actionedBy}, ${reason ?? null})
  `);

  logger.info(
    { keyId, oldVersion: key.pinned_model_version, newVersion, actionedBy },
    "[licenseeApi] licensee key pinned model version bumped (explicit, audited)",
  );
}

// ─── Sprint 3b — sandbox/production issuance authority separation ─────────

export type IssuingTokenType = "sandbox" | "production";

/**
 * Validates that the boot-time SANDBOX_ADMIN_TOKEN / PRODUCTION_ADMIN_TOKEN
 * separation has not collapsed. Pure function (no process.exit) so it is
 * independently unit-testable; index.ts calls this same logic at boot and
 * exits the process if it fails there.
 */
export function isCredentialSeparationValid(params: {
  sandboxAdminToken: string | undefined;
  productionAdminToken: string | undefined;
}): boolean {
  const { sandboxAdminToken, productionAdminToken } = params;
  if (!sandboxAdminToken) return true; // nothing configured yet — not this check's concern
  return !!productionAdminToken && productionAdminToken !== sandboxAdminToken;
}

/**
 * Determines which admin token (if any) a request presented, without ever
 * treating a SANDBOX_ADMIN_TOKEN-authenticated request as production-authed.
 * Returns null if neither configured token matches.
 */
export function classifyAdminToken(
  presentedToken: string | undefined,
): IssuingTokenType | null {
  if (!presentedToken) return null;
  const productionToken = process.env.PRODUCTION_ADMIN_TOKEN;
  const sandboxToken = process.env.SANDBOX_ADMIN_TOKEN ?? process.env.ADMIN_TOKEN ?? process.env.ADMIN_SECRET_KEY;
  if (productionToken && presentedToken === productionToken) return "production";
  if (sandboxToken && presentedToken === sandboxToken) return "sandbox";
  return null;
}

export interface ProductionIssuanceFields {
  approvedBy?: string;
  agreementReference?: string;
  approvalDate?: string;
}

/**
 * Enforces the attributable-issuance requirements for a NON-sandbox
 * (production) licensee key: approvedBy and agreementReference are
 * required and must be non-empty. Sandbox-mode requests never reach this
 * function — sandbox issuance stays deliberately frictionless.
 */
export function validateProductionIssuanceFields(fields: ProductionIssuanceFields): void {
  if (!fields.approvedBy || !fields.approvedBy.trim()) {
    throw new Error("approvedBy is required to issue a production licensee key");
  }
  if (!fields.agreementReference || !fields.agreementReference.trim()) {
    throw new Error("agreementReference is required to issue a production licensee key");
  }
}

/**
 * Writes one row per licensee key ever created — sandbox or production —
 * so the full issuance history is queryable from a single table. This is
 * distinct from licensee_api_audit_log (per-request usage) and answers
 * "when and why did this key come to exist."
 */
export async function writeLicenseeIssuanceLog(params: {
  keyId: string;
  licenseeName: string;
  sandboxMode: boolean;
  approvedBy?: string;
  agreementReference?: string;
  approvalDate?: string;
  pinnedModelVersion: string;
  issuingTokenType: IssuingTokenType;
}): Promise<void> {
  const { db } = await import("@workspace/db");
  await db.execute(sql`
    INSERT INTO licensee_key_issuance_log
      (key_id, licensee_name, sandbox_mode, approved_by, agreement_reference, approval_date, pinned_model_version, issuing_token_type)
    VALUES
      (${params.keyId}, ${params.licenseeName}, ${params.sandboxMode},
       ${params.approvedBy ?? null}, ${params.agreementReference ?? null},
       ${params.approvalDate ?? null}, ${params.pinnedModelVersion}, ${params.issuingTokenType})
  `);
}

// ─── Rate limiting (daily, reuses B2B pattern) ─────────────────────────────

export async function checkLicenseeDailyRateLimit(key: LicenseeKeyRecord): Promise<{ ok: boolean; used: number }> {
  const { db } = await import("@workspace/db");
  const countRow = await db.execute(sql`
    SELECT COUNT(*)::int AS daily_count
    FROM licensee_api_audit_log
    WHERE key_id = ${key.key_id}
      AND queried_at > DATE_TRUNC('day', NOW() AT TIME ZONE 'America/Mexico_City')
  `);
  const used = Number((countRow.rows[0] as Record<string, unknown> | undefined)?.daily_count ?? 0);
  // Sandbox keys are exempt from rate-limit tiers — prospective licensees
  // should be able to explore freely without hitting a wall mid-demo.
  if (key.sandbox_mode) return { ok: true, used };
  return { ok: used < key.rate_limit_per_day, used };
}

export async function writeLicenseeAuditLog(params: {
  keyId: string;
  endpoint: string;
  method: string;
  sandboxMode: boolean;
  responseMs: number;
  statusCode: number;
}): Promise<void> {
  const { db } = await import("@workspace/db");
  await db.execute(sql`
    INSERT INTO licensee_api_audit_log (key_id, endpoint, http_method, sandbox_mode, response_ms, status_code)
    VALUES (${params.keyId}, ${params.endpoint}, ${params.method}, ${params.sandboxMode}, ${params.responseMs}, ${params.statusCode})
  `).catch(err => logger.error({ err }, "licenseeApi: audit log write failed"));
}

// ─── Payload sanitization + portable-mode detection (pure) ─────────────────

export interface SanitizedPayload {
  snapshot: PTIDataSnapshot;
  portableMode: boolean;
  forbiddenFieldsPresent: string[];
}

const REQUIRED_SNAPSHOT_DEFAULTS: PTIDataSnapshot = {
  streakMonths: 0, payCount: 0, domStddev: 0, dominantDay: 0, advanceDays: 0, selfRatio: 0,
  lateRecoveryRatio: NaN, latePaymentCount: 0, paulaResponseLatencyMinutes: NaN,
  loginDays30: 0, hourStd: 0, scratchPlays: 0, spinPlays: 0, missionsDone: 0,
  loadCount30: 0, loadDayStd: 0, paulaInteractions: 0, confirmed2fa: 0, declined2fa: 0,
  pushOpens: 0, curiosityIndex: 0,
  billerCount: 0, kycVerified: false, kycTier: "simplified", utilityRatio: 0, intentClicks: 0,
  hoursToFirst: NaN, deviceScore: 0,
  currentBalance: 0, totalLoads: 0, totalSpend: 0, amountCV: 0, p2pSendCount: 0, p2pRecipientCount: 0,
  daysOld: 0, daysToFirstSpei: NaN, oxxoLoadCount: 0, speiLoadCount: 0, cardLoadCount: 0,
};

/**
 * Sanitizes an incoming licensee payload: strips/ignores any fair-lending
 * fields (never scored — this API never even imports the adjustment layer,
 * but a caller could still send colonia/income fields by mistake, expecting
 * behavior that doesn't exist in this product), and auto-detects
 * portable-mode based on wallet-rail field ABSENCE (no caller-side flag).
 */
export function sanitizeLicenseePayload(rawPayload: Record<string, unknown>): SanitizedPayload {
  const forbiddenFieldsPresent = FORBIDDEN_FAIR_LENDING_FIELDS.filter(f => rawPayload[f] !== undefined);

  const portableMode = WALLET_RAIL_FIELDS.every(f => rawPayload[f] === undefined || rawPayload[f] === null);

  const cleaned: Record<string, unknown> = { ...rawPayload };
  for (const f of FORBIDDEN_FAIR_LENDING_FIELDS) delete cleaned[f];

  const snapshot: PTIDataSnapshot = { ...REQUIRED_SNAPSHOT_DEFAULTS };
  for (const key of Object.keys(REQUIRED_SNAPSHOT_DEFAULTS) as (keyof PTIDataSnapshot)[]) {
    if (cleaned[key] !== undefined && cleaned[key] !== null) {
      (snapshot as unknown as Record<string, unknown>)[key] = cleaned[key];
    }
  }

  return { snapshot, portableMode, forbiddenFieldsPresent };
}

/**
 * Reallocates the Cash-Flow Stability dimension's wallet-rail-specific
 * sub-scores (bancarization_speed + funding_channel_mix, worth 5 of CF's
 * 25 points) across the remaining CF sub-scores when portable_mode is
 * active — a licensee's own users have no PagoYa wallet history to score
 * those signals against, and should not be structurally capped at 20/25 on
 * this dimension purely for lacking data this product never asked them for.
 *
 * This is a POST-PROCESSING step performed entirely in this module — it
 * never modifies pti.ts, preserving computePTI() as the single source of
 * truth for the base scoring logic used internally by PagoYa.
 */
function applyPortableModeReallocation(breakdown: PTIBreakdown): PTIBreakdown {
  const cf = breakdown.cashflow_stability;
  const walletRailMax = 5; // bancarization_speed(3) + funding_channel_mix(2)
  const portableMax = cf.max; // still 25 — we redistribute weight, not shrink the ceiling
  const nonWalletRailMax = portableMax - walletRailMax; // 20

  if (nonWalletRailMax <= 0) return breakdown; // defensive: never divide by zero

  const scaleFactor = portableMax / nonWalletRailMax; // 25 / 20 = 1.25
  const rescaledCfScore = Math.min(portableMax, Math.round(cf.score * scaleFactor * 100) / 100);

  const newTotal = Math.min(
    100,
    breakdown.payment_reliability.score +
      breakdown.behavioral_consistency.score +
      breakdown.engagement_depth.score +
      rescaledCfScore,
  );

  return {
    ...breakdown,
    cashflow_stability: { ...cf, score: rescaledCfScore },
    total: newTotal,
  };
}

/**
 * The core licensable scoring function. Calls ONLY the base `computePTI`
 * scorer — never the internal final-scoring wrapper, and never anything
 * from the adjustment module that layers fair-lending logic on top for
 * PagoYa's own internal use. This is the enforcement point for "the
 * fair-lending layer is not exposed here."
 */
export function computeLicenseeScore(params: {
  snapshot: PTIDataSnapshot;
  portableMode: boolean;
  modelVersion: string;
  sandbox: boolean;
}): LicenseeScoreResult {
  const { snapshot, portableMode, modelVersion, sandbox } = params;
  const { breakdown: rawBreakdown, confidence } = computePTI(snapshot);
  const breakdown = portableMode ? applyPortableModeReallocation(rawBreakdown) : rawBreakdown;
  const { tier, label: tier_label } = getPTITier(breakdown.total);

  return {
    base_score: breakdown.total,
    tier,
    tier_label,
    confidence,
    dimension_breakdown: breakdown,
    model_version: modelVersion,
    portable_mode: portableMode,
    sandbox,
  };
}

export { getSandboxFixture, SANDBOX_FIXTURES };
