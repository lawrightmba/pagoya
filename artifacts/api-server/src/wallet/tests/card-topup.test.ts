// FIXTURE IDENTIFIERS OWNED BY THIS FILE — do not reuse in other test files:
//   TEST_PHONE = "+52000000cardtest01"
//   rep: "rep_card_commission_test_01" / code "CARDTEST01"
//   order IDs: "ord_card_test_paid_001", "ord_card_test_pending_001",
//              "ord_card_rep_commission_001"
// See src/billpay/tests/setup.ts for the teardown registry.

import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import request from "supertest";
import { db, walletsTable, walletTransactionsTable, usersTable, repsTable, repCommissionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { waitForCommission } from "../../billpay/tests/testUtils.js";

// ---------------------------------------------------------------------------
// Mock external dependencies — vi.mock is hoisted above imports by vitest
// ---------------------------------------------------------------------------
vi.mock("../lib/conekta.js", () => ({
  createCardOrder: vi.fn(),
  createOxxoOrder: vi.fn().mockResolvedValue({
    orderId: "ord_test_oxxo_001",
    reference: "93000012345678",
    voucherUrl: "https://test.conekta.io/barcode/ord_test_oxxo_001.png",
    expiresAt: new Date(Date.now() + 5 * 86_400_000),
  }),
  verifyConektaWebhookSignature: vi.fn().mockReturnValue(true),
  verifyCardWebhookSignature: vi.fn().mockReturnValue(true),
}));

vi.mock("../../lib/whatsapp.js", () => ({
  sendWhatsApp: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../services/profiles.js", () => ({
  captureUserProfile: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../services/loyalty.js", () => ({
  earnPoints: vi.fn().mockResolvedValue(undefined),
  getLoyaltyAdminStats: vi.fn().mockResolvedValue({}),
}));

// Import mocked modules AFTER vi.mock declarations
import { createCardOrder } from "../lib/conekta.js";
import app from "../../app.js";

// ---------------------------------------------------------------------------
// Per-test wallet helpers
// Each test gets a fresh wallet; afterEach tears it down.
// Using beforeEach/afterEach (rather than beforeAll/afterAll) prevents vitest 4
// lifecycle bugs where afterAll fires mid-suite when tests are filtered.
// ---------------------------------------------------------------------------
const TEST_PHONE = "+52000000cardtest01";

async function createTestWallet(): Promise<string> {
  await db.insert(usersTable).values({ telefono: TEST_PHONE }).onConflictDoNothing();
  // Delete any leftover wallet from a previous test so we always start fresh
  await db.delete(walletsTable).where(eq(walletsTable.userId, TEST_PHONE));
  const [wallet] = await db.insert(walletsTable).values({ userId: TEST_PHONE }).returning();
  return wallet.id;
}

async function destroyTestWallet(walletId: string): Promise<void> {
  await db.delete(walletTransactionsTable).where(eq(walletTransactionsTable.walletId, walletId));
  await db.delete(walletsTable).where(eq(walletsTable.id, walletId));
  await db.delete(usersTable).where(eq(usersTable.telefono, TEST_PHONE));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("POST /api/wallet/load/card", () => {
  let testWalletId: string;

  beforeEach(async () => {
    vi.mocked(createCardOrder).mockClear();
    testWalletId = await createTestWallet();
  });

  afterEach(async () => {
    await destroyTestWallet(testWalletId);
  });

  it("successful card charge (status=paid) credits wallet and returns newBalance", async () => {
    vi.mocked(createCardOrder).mockResolvedValueOnce({
      orderId: "ord_card_test_paid_001",
      status: "paid",
    });

    const res = await request(app)
      .post("/api/wallet/load/card")
      .send({ walletId: testWalletId, amount: 200, tokenId: "tok_test_visa_4242" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.newBalance).toBe("number");
    expect(res.body.newBalance).toBeGreaterThanOrEqual(200);

    // Verify a confirmed load_card transaction was persisted
    const [tx] = await db
      .select()
      .from(walletTransactionsTable)
      .where(eq(walletTransactionsTable.conektaOrderId, "ord_card_test_paid_001"))
      .limit(1);
    expect(tx).toBeDefined();
    expect(tx.type).toBe("load_card");
    expect(tx.status).toBe("confirmed");
    expect(parseFloat(tx.amountMxn)).toBe(200);
  });

  it("amount below minimum (< 50 MXN) returns 400", async () => {
    const res = await request(app)
      .post("/api/wallet/load/card")
      .send({ walletId: testWalletId, amount: 30, tokenId: "tok_test_visa_4242" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/mínimo/);
    expect(createCardOrder).not.toHaveBeenCalled();
  });

  it("amount above maximum (> 10000 MXN) returns 400", async () => {
    const res = await request(app)
      .post("/api/wallet/load/card")
      .send({ walletId: testWalletId, amount: 15_000, tokenId: "tok_test_visa_4242" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/máximo/);
    expect(createCardOrder).not.toHaveBeenCalled();
  });

  it("Conekta API error returns 500 with error message", async () => {
    vi.mocked(createCardOrder).mockRejectedValueOnce(
      new Error("Conekta error 422: card_declined"),
    );

    const res = await request(app)
      .post("/api/wallet/load/card")
      .send({ walletId: testWalletId, amount: 200, tokenId: "tok_invalid_card" });

    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/Conekta error 422/);
  });

  it("pending_payment status returns { success: false, status: 'pending' }", async () => {
    vi.mocked(createCardOrder).mockResolvedValueOnce({
      orderId: "ord_card_test_pending_001",
      status: "pending_payment",
    });

    const res = await request(app)
      .post("/api/wallet/load/card")
      .send({ walletId: testWalletId, amount: 500, tokenId: "tok_test_3ds" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(false);
    expect(res.body.status).toBe("pending");

    // Verify pending tx was created
    const [tx] = await db
      .select()
      .from(walletTransactionsTable)
      .where(eq(walletTransactionsTable.conektaOrderId, "ord_card_test_pending_001"))
      .limit(1);
    expect(tx).toBeDefined();
    expect(tx.status).toBe("pending");
    expect(tx.type).toBe("load_card");
  });

  it("missing walletId returns 400", async () => {
    const res = await request(app)
      .post("/api/wallet/load/card")
      .send({ amount: 200, tokenId: "tok_test_visa_4242" });

    expect(res.status).toBe(400);
    expect(createCardOrder).not.toHaveBeenCalled();
  });

  it("valid rep_code on card top-up triggers 5 MXN commission attribution", async () => {
    const TEST_REP_ID = "rep_card_commission_test_01";
    const TEST_REP_CODE = "CARDTEST01";

    // Create a test rep (idempotent — onConflictDoNothing handles reruns)
    await db.insert(repsTable).values({
      id: TEST_REP_ID,
      name: "Test Rep Card",
      phone: "+52000000000099",
      email: "repcard01@pagoya.test",
      repCode: TEST_REP_CODE,
      status: "active",
    }).onConflictDoNothing();

    vi.mocked(createCardOrder).mockResolvedValueOnce({
      orderId: "ord_card_rep_commission_001",
      status: "paid",
    });

    const res = await request(app)
      .post("/api/wallet/load/card")
      .send({ walletId: testWalletId, amount: 200, tokenId: "tok_test_visa_4242", rep_code: TEST_REP_CODE });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Commission insert is non-blocking — poll until it appears (replaces fixed-sleep)
    await waitForCommission(TEST_REP_ID);

    const [commission] = await db
      .select()
      .from(repCommissionsTable)
      .where(eq(repCommissionsTable.repId, TEST_REP_ID))
      .limit(1);

    expect(commission).toBeDefined();
    expect(parseFloat(commission.amount)).toBe(5);
    expect(commission.type).toBe("card_topup");
    expect(commission.status).toBe("pending");

    // Cleanup rep data (wallet tx cleaned up by afterEach)
    await db.delete(repCommissionsTable).where(eq(repCommissionsTable.repId, TEST_REP_ID));
    await db.delete(repsTable).where(eq(repsTable.id, TEST_REP_ID));
  });
});
