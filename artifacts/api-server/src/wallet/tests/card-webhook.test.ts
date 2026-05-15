import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import request from "supertest";
import { db, walletsTable, walletTransactionsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

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

import app from "../../app.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const TEST_PHONE = "+52000000cardwhtest01";
const CARD_WEBHOOK_URL = "/api/wallet/webhook/conekta-card";

async function createTestWallet(): Promise<string> {
  await db.insert(usersTable).values({ telefono: TEST_PHONE }).onConflictDoNothing();
  await db.delete(walletsTable).where(eq(walletsTable.userId, TEST_PHONE));
  const [wallet] = await db.insert(walletsTable).values({ userId: TEST_PHONE }).returning();
  return wallet.id;
}

async function destroyTestWallet(walletId: string): Promise<void> {
  await db.delete(walletTransactionsTable).where(eq(walletTransactionsTable.walletId, walletId));
  await db.delete(walletsTable).where(eq(walletsTable.id, walletId));
  await db.delete(usersTable).where(eq(usersTable.telefono, TEST_PHONE));
}

async function createPendingCardTx(walletId: string, orderId: string, amount = 300): Promise<string> {
  const [tx] = await db
    .insert(walletTransactionsTable)
    .values({
      walletId,
      type: "load_card",
      amountMxn: amount.toFixed(2),
      status: "pending",
      conektaOrderId: orderId,
      description: `Carga con tarjeta PagoYa — $${amount.toFixed(2)} MXN`,
    })
    .returning({ id: walletTransactionsTable.id });
  return tx.id;
}

function cardWebhookPayload(type: string, orderId: string, meta?: Record<string, string>) {
  return {
    type,
    data: {
      object: {
        id: orderId,
        metadata: meta ?? { type: "card_topup" },
      },
    },
  };
}

// Drains the setImmediate queue so DB side-effects from the webhook handler
// are visible before assertions run.
async function drainSetImmediate(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 50));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("POST /api/wallet/webhook/conekta-card", () => {
  let testWalletId: string;

  beforeEach(async () => {
    testWalletId = await createTestWallet();
  });

  afterEach(async () => {
    await destroyTestWallet(testWalletId);
  });

  it("charge.paid credits wallet exactly once", async () => {
    const orderId = "ord_wh_card_paid_001";
    await createPendingCardTx(testWalletId, orderId, 300);

    const res = await request(app)
      .post(CARD_WEBHOOK_URL)
      .set("Content-Type", "application/json")
      .send(JSON.stringify(cardWebhookPayload("charge.paid", orderId)));

    expect(res.status).toBe(200);
    expect(res.body.received).toBe(true);

    await drainSetImmediate();

    // Wallet balance should be credited
    const [wallet] = await db
      .select({ balanceMxn: walletsTable.balanceMxn })
      .from(walletsTable)
      .where(eq(walletsTable.id, testWalletId))
      .limit(1);
    expect(parseFloat(wallet.balanceMxn ?? "0")).toBeCloseTo(300, 2);

    // Transaction should be confirmed
    const [tx] = await db
      .select()
      .from(walletTransactionsTable)
      .where(eq(walletTransactionsTable.conektaOrderId, orderId))
      .limit(1);
    expect(tx).toBeDefined();
    expect(tx.status).toBe("confirmed");
  });

  it("charge.paid duplicate event does not double-credit", async () => {
    const orderId = "ord_wh_card_paid_002";
    await createPendingCardTx(testWalletId, orderId, 500);

    const payload = JSON.stringify(cardWebhookPayload("charge.paid", orderId));

    // First delivery
    const res1 = await request(app)
      .post(CARD_WEBHOOK_URL)
      .set("Content-Type", "application/json")
      .send(payload);
    expect(res1.status).toBe(200);
    await drainSetImmediate();

    // Second delivery (duplicate)
    const res2 = await request(app)
      .post(CARD_WEBHOOK_URL)
      .set("Content-Type", "application/json")
      .send(payload);
    expect(res2.status).toBe(200);
    await drainSetImmediate();

    // Balance should only be 500, not 1000
    const [wallet] = await db
      .select({ balanceMxn: walletsTable.balanceMxn })
      .from(walletsTable)
      .where(eq(walletsTable.id, testWalletId))
      .limit(1);
    expect(parseFloat(wallet.balanceMxn ?? "0")).toBeCloseTo(500, 2);
  });

  it("charge.failed marks transaction failed without crediting wallet", async () => {
    const orderId = "ord_wh_card_failed_001";
    await createPendingCardTx(testWalletId, orderId, 200);

    const res = await request(app)
      .post(CARD_WEBHOOK_URL)
      .set("Content-Type", "application/json")
      .send(JSON.stringify(cardWebhookPayload("charge.failed", orderId)));

    expect(res.status).toBe(200);
    expect(res.body.received).toBe(true);

    await drainSetImmediate();

    // Balance should remain zero — no credit
    const [wallet] = await db
      .select({ balanceMxn: walletsTable.balanceMxn })
      .from(walletsTable)
      .where(eq(walletsTable.id, testWalletId))
      .limit(1);
    expect(parseFloat(wallet.balanceMxn ?? "0")).toBeCloseTo(0, 2);

    // Transaction should be marked failed
    const [tx] = await db
      .select()
      .from(walletTransactionsTable)
      .where(eq(walletTransactionsTable.conektaOrderId, orderId))
      .limit(1);
    expect(tx).toBeDefined();
    expect(tx.status).toBe("failed");
  });

  it("unknown event type returns 200 and makes no DB changes", async () => {
    const orderId = "ord_wh_card_unknown_001";
    await createPendingCardTx(testWalletId, orderId, 150);

    const res = await request(app)
      .post(CARD_WEBHOOK_URL)
      .set("Content-Type", "application/json")
      .send(JSON.stringify(cardWebhookPayload("order.created", orderId)));

    expect(res.status).toBe(200);
    expect(res.body.received).toBe(true);

    await drainSetImmediate();

    // Balance should remain zero
    const [wallet] = await db
      .select({ balanceMxn: walletsTable.balanceMxn })
      .from(walletsTable)
      .where(eq(walletsTable.id, testWalletId))
      .limit(1);
    expect(parseFloat(wallet.balanceMxn ?? "0")).toBeCloseTo(0, 2);

    // Transaction should still be pending
    const [tx] = await db
      .select()
      .from(walletTransactionsTable)
      .where(eq(walletTransactionsTable.conektaOrderId, orderId))
      .limit(1);
    expect(tx).toBeDefined();
    expect(tx.status).toBe("pending");
  });
});
