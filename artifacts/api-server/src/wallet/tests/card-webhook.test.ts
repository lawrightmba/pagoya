// FIXTURE IDENTIFIERS OWNED BY THIS FILE — do not reuse in other test files:
//   TEST_PHONE = "+52000000cardwhtest01"
//   order IDs: "ord_wh_card_paid_001", "ord_wh_card_paid_002",
//              "ord_wh_card_failed_001", "ord_wh_card_unknown_001"
// See src/billpay/tests/setup.ts for the teardown registry.

import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import request from "supertest";
import { db, walletsTable, walletTransactionsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  waitForWalletBalance,
  waitForTxStatus,
  settleMs,
} from "../../billpay/tests/testUtils.js";

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

// waitForWalletBalance / waitForTxStatus / settleMs imported from testUtils.js
// (replaces the former fixed-sleep drainSetImmediate; see testUtils.ts for rationale)

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

    // Poll until wallet is credited — replaces fixed-sleep drainSetImmediate
    await waitForWalletBalance(testWalletId, 300);

    const [wallet] = await db
      .select({ balanceMxn: walletsTable.balanceMxn })
      .from(walletsTable)
      .where(eq(walletsTable.id, testWalletId))
      .limit(1);
    expect(parseFloat(wallet.balanceMxn ?? "0")).toBeCloseTo(300, 2);

    // Poll until tx confirmed
    await waitForTxStatus(orderId, "confirmed");
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

    // First delivery — poll until credited
    const res1 = await request(app)
      .post(CARD_WEBHOOK_URL)
      .set("Content-Type", "application/json")
      .send(payload);
    expect(res1.status).toBe(200);
    await waitForWalletBalance(testWalletId, 500);

    // Second delivery (duplicate) — settle briefly; balance must NOT double
    const res2 = await request(app)
      .post(CARD_WEBHOOK_URL)
      .set("Content-Type", "application/json")
      .send(payload);
    expect(res2.status).toBe(200);
    // Short settle for "no-change" case (polling for absence would always time out)
    await settleMs();

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

    // Poll until tx status transitions to failed, then assert no credit
    await waitForTxStatus(orderId, "failed");

    const [wallet] = await db
      .select({ balanceMxn: walletsTable.balanceMxn })
      .from(walletsTable)
      .where(eq(walletsTable.id, testWalletId))
      .limit(1);
    expect(parseFloat(wallet.balanceMxn ?? "0")).toBeCloseTo(0, 2);

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

    // Short settle for "no-change" assertion (status stays pending; polling for
    // absence would always wait the full timeout before the assertion can run)
    await settleMs();

    const [wallet] = await db
      .select({ balanceMxn: walletsTable.balanceMxn })
      .from(walletsTable)
      .where(eq(walletsTable.id, testWalletId))
      .limit(1);
    expect(parseFloat(wallet.balanceMxn ?? "0")).toBeCloseTo(0, 2);

    const [tx] = await db
      .select()
      .from(walletTransactionsTable)
      .where(eq(walletTransactionsTable.conektaOrderId, orderId))
      .limit(1);
    expect(tx).toBeDefined();
    expect(tx.status).toBe("pending");
  });
});
