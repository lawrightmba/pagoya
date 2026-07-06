import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import app from "../../app.js";
import { isCredentialSeparationValid, classifyAdminToken } from "../../services/licenseeApi.js";

/**
 * Sprint 3b — separate sandbox/production issuance authority + attributable,
 * audited production key creation.
 *
 * Assumes SANDBOX_ADMIN_TOKEN and PRODUCTION_ADMIN_TOKEN are both configured
 * in this environment (required for the app to even boot per index.ts's
 * credential-separation check) and are distinct values.
 */

const SANDBOX_TOKEN = process.env.SANDBOX_ADMIN_TOKEN;
const PRODUCTION_TOKEN = process.env.PRODUCTION_ADMIN_TOKEN;

const TEST_LICENSEE_PREFIX = "__sprint3b_test__";
const createdKeyIds: string[] = [];

async function cleanup() {
  if (createdKeyIds.length === 0) {
    // Also sweep by name prefix in case a failed assertion left a row
    // without us capturing its key_id.
    const rows = await db.execute(sql`SELECT key_id FROM licensee_api_keys WHERE licensee_name LIKE ${TEST_LICENSEE_PREFIX + "%"}`);
    for (const r of rows.rows as Array<{ key_id: string }>) createdKeyIds.push(r.key_id);
  }
  for (const keyId of createdKeyIds) {
    await db.execute(sql`DELETE FROM licensee_version_upgrade_log WHERE key_id = ${keyId}`);
    await db.execute(sql`DELETE FROM licensee_key_issuance_log WHERE key_id = ${keyId}`);
    await db.execute(sql`DELETE FROM licensee_api_audit_log WHERE key_id = ${keyId}`);
    await db.execute(sql`DELETE FROM licensee_api_keys WHERE key_id = ${keyId}`);
  }
}

beforeAll(() => {
  if (!SANDBOX_TOKEN || !PRODUCTION_TOKEN) {
    throw new Error(
      "SANDBOX_ADMIN_TOKEN and PRODUCTION_ADMIN_TOKEN must both be configured to run the Sprint 3b issuance test suite.",
    );
  }
});

afterAll(async () => {
  await cleanup();
});

// ── 6. Boot-time credential separation (pure function) ──────────────────────
describe("isCredentialSeparationValid — boot-time credential collapse guard", () => {
  it("passes when SANDBOX_ADMIN_TOKEN is unset (nothing to collapse)", () => {
    expect(isCredentialSeparationValid({ sandboxAdminToken: undefined, productionAdminToken: undefined })).toBe(true);
  });

  it("fails when PRODUCTION_ADMIN_TOKEN is unset while SANDBOX_ADMIN_TOKEN is set", () => {
    expect(isCredentialSeparationValid({ sandboxAdminToken: "abc", productionAdminToken: undefined })).toBe(false);
  });

  it("fails when PRODUCTION_ADMIN_TOKEN equals SANDBOX_ADMIN_TOKEN", () => {
    expect(isCredentialSeparationValid({ sandboxAdminToken: "same-value", productionAdminToken: "same-value" })).toBe(false);
  });

  it("passes when both are set and distinct", () => {
    expect(isCredentialSeparationValid({ sandboxAdminToken: "sandbox-x", productionAdminToken: "production-y" })).toBe(true);
  });
});

describe("classifyAdminToken", () => {
  it("classifies the real production token as production", () => {
    expect(classifyAdminToken(PRODUCTION_TOKEN)).toBe("production");
  });

  it("classifies the real sandbox token as sandbox", () => {
    expect(classifyAdminToken(SANDBOX_TOKEN)).toBe("sandbox");
  });

  it("classifies an unknown token as null", () => {
    expect(classifyAdminToken("definitely-not-a-real-token")).toBeNull();
  });
});

// ── 1 & 2. Production issuance rejects sandbox token / missing fields ──────
describe("POST /api/v1/admin/keys — production issuance authority", () => {
  it("rejects production key issuance when only SANDBOX_ADMIN_TOKEN is presented, even if otherwise well-formed", async () => {
    const res = await request(app)
      .post("/api/v1/admin/keys")
      .set("x-admin-key", SANDBOX_TOKEN!)
      .send({
        licenseeName: `${TEST_LICENSEE_PREFIX}reject_sandbox_token`,
        pinnedModelVersion: "v4.1-behavioral",
        sandboxMode: false,
        approvedBy: "Jane Doe",
        agreementReference: "CONTRACT-123",
      });
    expect(res.status).toBe(403);
    expect(res.body.error).toBe("production_admin_token_required");
  });

  it("rejects production key issuance when approvedBy is missing", async () => {
    const res = await request(app)
      .post("/api/v1/admin/keys")
      .set("x-admin-key", PRODUCTION_TOKEN!)
      .send({
        licenseeName: `${TEST_LICENSEE_PREFIX}missing_approvedby`,
        pinnedModelVersion: "v4.1-behavioral",
        sandboxMode: false,
        agreementReference: "CONTRACT-456",
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/approvedBy/);
  });

  it("rejects production key issuance when agreementReference is empty", async () => {
    const res = await request(app)
      .post("/api/v1/admin/keys")
      .set("x-admin-key", PRODUCTION_TOKEN!)
      .send({
        licenseeName: `${TEST_LICENSEE_PREFIX}empty_agreement_ref`,
        pinnedModelVersion: "v4.1-behavioral",
        sandboxMode: false,
        approvedBy: "Jane Doe",
        agreementReference: "   ",
      });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/agreementReference/);
  });

  // ── 3. Production issuance succeeds + issuance log row is complete ───────
  it("succeeds with PRODUCTION_ADMIN_TOKEN + approvedBy + agreementReference, and writes a complete issuance log row", async () => {
    const licenseeName = `${TEST_LICENSEE_PREFIX}prod_success`;
    const res = await request(app)
      .post("/api/v1/admin/keys")
      .set("x-admin-key", PRODUCTION_TOKEN!)
      .send({
        licenseeName,
        pinnedModelVersion: "v4.1-behavioral",
        sandboxMode: false,
        approvedBy: "Jane Doe",
        agreementReference: "CONTRACT-789",
      });
    expect(res.status).toBe(201);
    expect(res.body.key_id).toBeTruthy();
    createdKeyIds.push(res.body.key_id);

    const row = await db.execute(sql`SELECT * FROM licensee_key_issuance_log WHERE key_id = ${res.body.key_id}`);
    const issuance = row.rows[0] as Record<string, unknown>;
    expect(issuance).toBeTruthy();
    expect(issuance.licensee_name).toBe(licenseeName);
    expect(issuance.sandbox_mode).toBe(false);
    expect(issuance.approved_by).toBe("Jane Doe");
    expect(issuance.agreement_reference).toBe("CONTRACT-789");
    expect(issuance.approval_date).toBeTruthy();
    expect(issuance.issuing_token_type).toBe("production");
    expect(issuance.pinned_model_version).toBe("v4.1-behavioral");
  });

  // ── 4. Sandbox issuance unaffected ────────────────────────────────────────
  it("sandbox key issuance requires no approvedBy/agreementReference and works exactly as before", async () => {
    const licenseeName = `${TEST_LICENSEE_PREFIX}sandbox_unaffected`;
    const res = await request(app)
      .post("/api/v1/admin/keys")
      .set("x-admin-key", SANDBOX_TOKEN!)
      .send({
        licenseeName,
        pinnedModelVersion: "v4.1-behavioral",
        sandboxMode: true,
      });
    expect(res.status).toBe(201);
    expect(res.body.sandbox_mode).toBe(true);
    createdKeyIds.push(res.body.key_id);
  });

  // ── 5. Sandbox issuance still logs (with null approval fields) ──────────
  it("sandbox key issuance still writes a licensee_key_issuance_log row with null approval fields", async () => {
    const licenseeName = `${TEST_LICENSEE_PREFIX}sandbox_logged`;
    const res = await request(app)
      .post("/api/v1/admin/keys")
      .set("x-admin-key", SANDBOX_TOKEN!)
      .send({
        licenseeName,
        pinnedModelVersion: "v4.1-behavioral",
        sandboxMode: true,
      });
    expect(res.status).toBe(201);
    createdKeyIds.push(res.body.key_id);

    const row = await db.execute(sql`SELECT * FROM licensee_key_issuance_log WHERE key_id = ${res.body.key_id}`);
    const issuance = row.rows[0] as Record<string, unknown>;
    expect(issuance).toBeTruthy();
    expect(issuance.sandbox_mode).toBe(true);
    expect(issuance.approved_by).toBeNull();
    expect(issuance.agreement_reference).toBeNull();
    expect(issuance.issuing_token_type).toBe("sandbox");
  });

  // ── Prompt 4 closeout: default model version + signoff gate ─────────────
  describe("pinnedModelVersion default + signoff gate at issuance", () => {
    it("defaults a sandbox key's pinned_model_version to v4.3-signal-expansion when omitted", async () => {
      const licenseeName = `${TEST_LICENSEE_PREFIX}default_version_sandbox`;
      const res = await request(app)
        .post("/api/v1/admin/keys")
        .set("x-admin-key", SANDBOX_TOKEN!)
        .send({ licenseeName, sandboxMode: true });
      expect(res.status).toBe(201);
      expect(res.body.pinned_model_version).toBe("v4.3-signal-expansion");
      createdKeyIds.push(res.body.key_id);
    });

    it("defaults a production key's pinned_model_version too when omitted", async () => {
      const licenseeName = `${TEST_LICENSEE_PREFIX}default_version_prod`;
      const res = await request(app)
        .post("/api/v1/admin/keys")
        .set("x-admin-key", PRODUCTION_TOKEN!)
        .send({
          licenseeName,
          sandboxMode: false,
          approvedBy: "Jane Doe",
          agreementReference: "CONTRACT-DEFAULT-VERSION",
        });
      expect(res.status).toBe(201);
      expect(res.body.pinned_model_version).toBe("v4.3-signal-expansion");
      createdKeyIds.push(res.body.key_id);
    });

    it("still honors an explicitly requested older version (v4.2-behavioral)", async () => {
      const licenseeName = `${TEST_LICENSEE_PREFIX}explicit_v42`;
      const res = await request(app)
        .post("/api/v1/admin/keys")
        .set("x-admin-key", SANDBOX_TOKEN!)
        .send({ licenseeName, pinnedModelVersion: "v4.2-behavioral", sandboxMode: true });
      expect(res.status).toBe(201);
      expect(res.body.pinned_model_version).toBe("v4.2-behavioral");
      createdKeyIds.push(res.body.key_id);
    });

    it("rejects issuance pinned to a version registered but not yet signed off", async () => {
      const pendingVersion = "__test_issuance_pending_version__";
      await db.execute(sql`
        INSERT INTO licensee_model_versions (version, status, signoff_status)
        VALUES (${pendingVersion}, 'supported', 'pending')
        ON CONFLICT (version) DO UPDATE SET signoff_status = 'pending'
      `);
      try {
        const res = await request(app)
          .post("/api/v1/admin/keys")
          .set("x-admin-key", SANDBOX_TOKEN!)
          .send({ licenseeName: `${TEST_LICENSEE_PREFIX}pending_version`, pinnedModelVersion: pendingVersion, sandboxMode: true });
        expect(res.status).toBe(400);
        expect(res.body.error).toBe("version_pending_signoff");
      } finally {
        await db.execute(sql`DELETE FROM licensee_model_versions WHERE version = ${pendingVersion}`);
      }
    });

    it("GET /api/v1/model-versions exposes signoff_status for every registered version", async () => {
      const res = await request(app).get("/api/v1/model-versions");
      expect(res.status).toBe(200);
      const versions = res.body.versions as Array<{ version: string; signoff_status: string }>;
      const v43 = versions.find((v) => v.version === "v4.3-signal-expansion");
      expect(v43?.signoff_status).toBe("approved");
    });

    it("GET /api/v1/data-card surfaces the v4.3 fair-lending signoff and per-field disposition", async () => {
      const res = await request(app).get("/api/v1/data-card");
      expect(res.status).toBe(200);
      expect(res.body.field_disposition).toBeTruthy();
      expect(res.body.field_disposition.signoff_statement).toMatch(/APPROVED, zero-weight release/);
      const fields = res.body.field_disposition.fields as Array<{ field: string; status: string; rationale: string }>;
      expect(fields.length).toBe(15);
      const preDueStaging = fields.find((f) => f.field === "preDueStagingIndex");
      expect(preDueStaging?.status).toBe("provisional_zero_weight");
      const minBalanceBuffer = fields.find((f) => f.field === "minBalanceBuffer30d");
      expect(minBalanceBuffer?.status).toBe("permanent_non_scoring");
    });
  });

  it("a production key can also be issued by presenting a token that classifies as production even via query param (back-compat path)", async () => {
    // Sanity check that the adminAuth guard's classification (not just header) still gates correctly.
    const res = await request(app)
      .post("/api/v1/admin/keys")
      .query({ adminKey: SANDBOX_TOKEN })
      .send({
        licenseeName: `${TEST_LICENSEE_PREFIX}query_param_sandbox_rejected_for_prod`,
        pinnedModelVersion: "v4.1-behavioral",
        sandboxMode: false,
        approvedBy: "Jane Doe",
        agreementReference: "CONTRACT-999",
      });
    expect(res.status).toBe(403);
  });
});

// ── 7. Version-bump attribution ──────────────────────────────────────────
describe("POST /api/v1/admin/keys/:keyId/version — attributable version bumps", () => {
  let productionKeyId: string;
  let sandboxKeyId: string;

  beforeAll(async () => {
    const prodRes = await request(app)
      .post("/api/v1/admin/keys")
      .set("x-admin-key", PRODUCTION_TOKEN!)
      .send({
        licenseeName: `${TEST_LICENSEE_PREFIX}version_bump_prod`,
        pinnedModelVersion: "v4.1-behavioral",
        sandboxMode: false,
        approvedBy: "Jane Doe",
        agreementReference: "CONTRACT-VB-1",
      });
    productionKeyId = prodRes.body.key_id;
    createdKeyIds.push(productionKeyId);

    const sandboxRes = await request(app)
      .post("/api/v1/admin/keys")
      .set("x-admin-key", SANDBOX_TOKEN!)
      .send({
        licenseeName: `${TEST_LICENSEE_PREFIX}version_bump_sandbox`,
        pinnedModelVersion: "v4.1-behavioral",
        sandboxMode: true,
      });
    sandboxKeyId = sandboxRes.body.key_id;
    createdKeyIds.push(sandboxKeyId);
  });

  it("rejects a production key version bump with only SANDBOX_ADMIN_TOKEN", async () => {
    const res = await request(app)
      .post(`/api/v1/admin/keys/${productionKeyId}/version`)
      .set("x-admin-key", SANDBOX_TOKEN!)
      .send({ newVersion: "v4.1-behavioral", approvedBy: "Jane Doe" });
    expect(res.status).toBe(403);
  });

  it("rejects a production key version bump missing approvedBy even with PRODUCTION_ADMIN_TOKEN", async () => {
    const res = await request(app)
      .post(`/api/v1/admin/keys/${productionKeyId}/version`)
      .set("x-admin-key", PRODUCTION_TOKEN!)
      .send({ newVersion: "v4.1-behavioral" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/approvedBy/);
  });

  it("allows a production key version bump with PRODUCTION_ADMIN_TOKEN + approvedBy, and logs the approver", async () => {
    const res = await request(app)
      .post(`/api/v1/admin/keys/${productionKeyId}/version`)
      .set("x-admin-key", PRODUCTION_TOKEN!)
      .send({ newVersion: "v4.1-behavioral", approvedBy: "Jane Doe", reason: "routine confirm" });
    expect(res.status).toBe(200);

    const row = await db.execute(sql`SELECT actioned_by FROM licensee_version_upgrade_log WHERE key_id = ${productionKeyId} ORDER BY created_at DESC LIMIT 1`);
    expect((row.rows[0] as Record<string, unknown>).actioned_by).toBe("Jane Doe");
  });

  it("sandbox key version bumps are unaffected — no approvedBy required, sandbox token suffices", async () => {
    const res = await request(app)
      .post(`/api/v1/admin/keys/${sandboxKeyId}/version`)
      .set("x-admin-key", SANDBOX_TOKEN!)
      .send({ newVersion: "v4.1-behavioral" });
    expect(res.status).toBe(200);
  });
});
