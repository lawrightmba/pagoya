import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { db, billPaymentsTable, billPaymentAuditTable, repCommissionsTable, usersTable, walletsTable, walletTransactionsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Mock provider modules — vi.mock is hoisted above imports by vitest
// ---------------------------------------------------------------------------
vi.mock("../providers/siprel.js", () => ({
  siprelProvider: {
    name: "siprel" as const,
    isAvailable: vi.fn().mockReturnValue(true),
    pay: vi.fn(),
    getSaldoBalance: vi.fn(),
  },
}));

vi.mock("../providers/evoluciona.js", () => ({
  evolucionaProvider: {
    name: "evoluciona" as const,
    isAvailable: vi.fn().mockReturnValue(true),
    pay: vi.fn(),
  },
}));

vi.mock("../lib/notifications.js", () => ({
  sendWhatsAppReceipt: vi.fn().mockResolvedValue(undefined),
  sendLowSaldoAlert: vi.fn().mockResolvedValue(undefined),
  SALDO_LOW_THRESHOLD: 500,
}));

vi.mock("../../wallet/lib/conekta.js", () => ({
  createOxxoOrder: vi.fn().mockResolvedValue({
    orderId: "ord_test_oxxo_001",
    reference: "93000012345678",
    voucherUrl: "https://test.conekta.io/barcode/ord_test_oxxo_001.png",
    expiresAt: new Date(Date.now() + 5 * 86_400_000),
  }),
  verifyConektaWebhookSignature: vi.fn().mockReturnValue(true),
}));

// Import mocked modules AFTER vi.mock declarations (hoisting makes order safe)
import { siprelProvider } from "../providers/siprel.js";
import { evolucionaProvider } from "../providers/evoluciona.js";
import { sendLowSaldoAlert } from "../lib/notifications.js";
import { createOxxoOrder } from "../../wallet/lib/conekta.js";
import app from "../../app.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const validCfePayload = {
  serviceId: "cfe",
  referencia: "123456789012", // 12 digits — meets minReferencia requirement
  monto: 850,
  telefono: "3221234567",
};

const siprelSuccess = {
  success: true,
  confirmationCode: "TEST-FOLIO-001",
  provider: "siprel" as const,
  timestamp: new Date().toISOString(),
  failoverUsed: false,
  rawResponse: { folio: "TEST-FOLIO-001", authCode: "AUTH123" },
};

const evolucionaSuccess = {
  success: true,
  confirmationCode: "EVOL-001",
  provider: "evoluciona" as const,
  timestamp: new Date().toISOString(),
  failoverUsed: false,
  rawResponse: { folio: "EVOL-001", authCode: "EVAUTH1" },
};

/** Wait a tick so non-blocking async side-effects (saldo check, etc.) can settle */
const tick = (ms = 80) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// 1. CATALOG ENDPOINT
// ---------------------------------------------------------------------------
describe("1. Catalog endpoint", () => {
  it("GET /api/bills/catalog returns 200 with a categories array", async () => {
    const res = await request(app).get("/api/bills/catalog");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.categories)).toBe(true);
    expect(res.body.categories.length).toBeGreaterThan(0);
  });

  it("each category has labelEs, labelEn, and a services array", async () => {
    const res = await request(app).get("/api/bills/catalog");
    for (const cat of res.body.categories) {
      expect(cat).toHaveProperty("labelEs");
      expect(cat).toHaveProperty("labelEn");
      expect(Array.isArray(cat.services)).toBe(true);
    }
  });

  it("CFE is present in the catalog", async () => {
    const res = await request(app).get("/api/bills/catalog");
    const allServices = res.body.categories.flatMap((c: { services: { id: string }[] }) => c.services);
    const ids = allServices.map((s: { id: string }) => s.id);
    expect(ids).toContain("cfe");
  });

  it("Telcel recarga is present in the catalog", async () => {
    const res = await request(app).get("/api/bills/catalog");
    const allServices = res.body.categories.flatMap((c: { services: { id: string }[] }) => c.services);
    const ids = allServices.map((s: { id: string }) => s.id);
    expect(ids).toContain("telcel_recarga");
  });

  it("Telmex (telmex_fijo) is present in the catalog", async () => {
    const res = await request(app).get("/api/bills/catalog");
    const allServices = res.body.categories.flatMap((c: { services: { id: string }[] }) => c.services);
    const ids = allServices.map((s: { id: string }) => s.id);
    expect(ids).toContain("telmex_fijo");
  });
});

// ---------------------------------------------------------------------------
// 2. REFERENCE & AMOUNT VALIDATION
// ---------------------------------------------------------------------------
describe("2. Reference and amount validation", () => {
  it("POST /api/bills/pay with CFE reference shorter than 12 digits returns 400", async () => {
    const res = await request(app).post("/api/bills/pay").send({
      ...validCfePayload,
      referencia: "12345", // only 5 digits — too short
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/12 dígitos/i);
  });

  it("POST /api/bills/pay with Telcel recarga amount below 30 MXN returns 400", async () => {
    const res = await request(app).post("/api/bills/pay").send({
      serviceId: "telcel_recarga",
      referencia: "3221234567",
      monto: 20, // below 30 MXN minimum
      telefono: "3221234567",
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/30 MXN/i);
  });

  it("POST /api/bills/pay with an unknown serviceId returns 404", async () => {
    const res = await request(app).post("/api/bills/pay").send({
      serviceId: "servicio_inexistente",
      referencia: "123456789012",
      monto: 100,
      telefono: "3221234567",
    });
    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// 3. HAPPY PATH — SIPREL SUCCESS
// ---------------------------------------------------------------------------
describe("3. Happy path — SIPREL success", () => {
  beforeEach(() => {
    vi.mocked(siprelProvider.pay).mockResolvedValue(siprelSuccess);
    vi.mocked(siprelProvider.getSaldoBalance!).mockResolvedValue(1500); // above threshold
  });

  it("POST /api/bills/pay returns 201 with folio and authCode", async () => {
    const res = await request(app).post("/api/bills/pay").send(validCfePayload);
    expect(res.status).toBe(201);
    expect(res.body.folio).toBe("TEST-FOLIO-001");
    expect(res.body.authCode).toBe("AUTH123");
    expect(res.body.provider).toBe("siprel");
    expect(res.body.failoverUsed).toBe(false);
  });

  it("bill_payments row has status=confirmed and provider_used=siprel", async () => {
    await request(app).post("/api/bills/pay").send(validCfePayload);

    const [payment] = await db
      .select()
      .from(billPaymentsTable)
      .where(eq(billPaymentsTable.confirmationCode, "TEST-FOLIO-001"))
      .limit(1);

    expect(payment).toBeDefined();
    expect(payment.status).toBe("confirmed");
    expect(payment.providerUsed).toBe("siprel");
    expect(payment.failoverUsed).toBe(false);
  });

  it("bill_payment_audit has two rows: payment.created and payment.confirmed", async () => {
    await request(app).post("/api/bills/pay").send(validCfePayload);

    const [payment] = await db
      .select()
      .from(billPaymentsTable)
      .where(eq(billPaymentsTable.confirmationCode, "TEST-FOLIO-001"))
      .limit(1);

    const auditRows = await db
      .select()
      .from(billPaymentAuditTable)
      .where(eq(billPaymentAuditTable.paymentId, payment.id))
      .orderBy(billPaymentAuditTable.createdAt);

    expect(auditRows).toHaveLength(2);
    expect(auditRows[0].event).toBe("payment.created");
    expect(auditRows[1].event).toBe("payment.confirmed");
  });
});

// ---------------------------------------------------------------------------
// 4. FAILOVER — SIPREL FAILS, EVOLUCIONA SUCCEEDS
// ---------------------------------------------------------------------------
describe("4. Failover — SIPREL fails, Evoluciona succeeds", () => {
  beforeEach(() => {
    vi.mocked(siprelProvider.pay).mockRejectedValue(new Error("NETWORK_ERROR"));
    vi.mocked(evolucionaProvider.pay).mockResolvedValue(evolucionaSuccess);
    vi.mocked(siprelProvider.getSaldoBalance!).mockResolvedValue(1500);
  });

  it("POST /api/bills/pay returns 201 via Evoluciona after SIPREL failure", async () => {
    const res = await request(app).post("/api/bills/pay").send(validCfePayload);
    expect(res.status).toBe(201);
    expect(res.body.provider).toBe("evoluciona");
    expect(res.body.confirmationCode).toBe("EVOL-001");
  });

  it("bill_payments row has failover_used=true and provider_used=evoluciona", async () => {
    await request(app).post("/api/bills/pay").send(validCfePayload);

    const [payment] = await db
      .select()
      .from(billPaymentsTable)
      .where(eq(billPaymentsTable.confirmationCode, "EVOL-001"))
      .limit(1);

    expect(payment).toBeDefined();
    expect(payment.failoverUsed).toBe(true);
    expect(payment.providerUsed).toBe("evoluciona");
    expect(payment.status).toBe("confirmed");
  });
});

// ---------------------------------------------------------------------------
// 5. BOTH PROVIDERS FAIL
// ---------------------------------------------------------------------------
describe("5. Both providers fail", () => {
  beforeEach(() => {
    vi.mocked(siprelProvider.pay).mockRejectedValue(new Error("NETWORK_ERROR"));
    vi.mocked(evolucionaProvider.pay).mockRejectedValue(new Error("NETWORK_ERROR"));
  });

  it("POST /api/bills/pay returns 502 when all providers fail", async () => {
    const res = await request(app).post("/api/bills/pay").send(validCfePayload);
    expect(res.status).toBe(502);
    expect(res.body).toHaveProperty("error");
  });

  it("bill_payments row has status=failed", async () => {
    await request(app).post("/api/bills/pay").send(validCfePayload);

    const payments = await db
      .select()
      .from(billPaymentsTable)
      .orderBy(desc(billPaymentsTable.createdAt))
      .limit(1);

    expect(payments).toHaveLength(1);
    expect(payments[0].status).toBe("failed");
  });

  it("bill_payment_audit has payment.created and payment.failed rows", async () => {
    await request(app).post("/api/bills/pay").send(validCfePayload);

    const [payment] = await db
      .select()
      .from(billPaymentsTable)
      .orderBy(desc(billPaymentsTable.createdAt))
      .limit(1);

    const auditRows = await db
      .select()
      .from(billPaymentAuditTable)
      .where(eq(billPaymentAuditTable.paymentId, payment.id))
      .orderBy(billPaymentAuditTable.createdAt);

    expect(auditRows.length).toBeGreaterThanOrEqual(2);
    expect(auditRows[0].event).toBe("payment.created");
    expect(auditRows[auditRows.length - 1].event).toBe("payment.failed");
  });
});

// ---------------------------------------------------------------------------
// 6. SALDO LOW-BALANCE ALERT
// ---------------------------------------------------------------------------
describe("6. Saldo low-balance alert", () => {
  beforeEach(() => {
    vi.mocked(siprelProvider.pay).mockResolvedValue(siprelSuccess);
    vi.mocked(siprelProvider.getSaldoBalance!).mockResolvedValue(400); // below 500 threshold
    vi.mocked(sendLowSaldoAlert).mockResolvedValue(undefined);
  });

  it("sendLowSaldoAlert fires to ADMIN_WHATSAPP_NUMBER when saldo < 500 after success", async () => {
    process.env.ADMIN_WHATSAPP_NUMBER = "523221234567";
    const res = await request(app).post("/api/bills/pay").send(validCfePayload);
    expect(res.status).toBe(201);

    // Wait for the non-blocking saldo check to resolve
    await tick();

    expect(vi.mocked(sendLowSaldoAlert)).toHaveBeenCalledWith(400);
    delete process.env.ADMIN_WHATSAPP_NUMBER;
  });

  it("sendLowSaldoAlert is NOT called when saldo >= 500", async () => {
    vi.mocked(siprelProvider.getSaldoBalance!).mockResolvedValue(1500);
    vi.clearAllMocks();
    vi.mocked(siprelProvider.pay).mockResolvedValue(siprelSuccess);
    vi.mocked(siprelProvider.getSaldoBalance!).mockResolvedValue(1500);
    vi.mocked(sendLowSaldoAlert).mockResolvedValue(undefined);

    await request(app).post("/api/bills/pay").send(validCfePayload);
    await tick();

    expect(vi.mocked(sendLowSaldoAlert)).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 7. HISTORY ENDPOINT
// ---------------------------------------------------------------------------
describe("7. History endpoint", () => {
  beforeEach(() => {
    vi.mocked(siprelProvider.pay).mockResolvedValue(siprelSuccess);
    vi.mocked(siprelProvider.getSaldoBalance!).mockResolvedValue(1500);
  });

  it("GET /api/bills/history returns 200 with a payments array", async () => {
    const res = await request(app).get("/api/bills/history");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.payments)).toBe(true);
  });

  it("payments are ordered by created_at descending", async () => {
    // Create two payments so we can verify ordering
    const p1 = { ...siprelSuccess, confirmationCode: "FOLIO-A" };
    const p2 = { ...siprelSuccess, confirmationCode: "FOLIO-B" };
    vi.mocked(siprelProvider.pay)
      .mockResolvedValueOnce(p1)
      .mockResolvedValueOnce(p2);

    await request(app).post("/api/bills/pay").send(validCfePayload);
    // Small delay so timestamps differ
    await tick(20);
    await request(app).post("/api/bills/pay").send({ ...validCfePayload, referencia: "999999999999" });

    const res = await request(app).get("/api/bills/history");
    expect(res.status).toBe(200);

    const payments = res.body.payments as { confirmationCode: string; createdAt: string }[];
    expect(payments.length).toBeGreaterThanOrEqual(2);

    // Most recent should be first
    const times = payments.map((p) => new Date(p.createdAt).getTime());
    for (let i = 0; i < times.length - 1; i++) {
      expect(times[i]).toBeGreaterThanOrEqual(times[i + 1]);
    }
  });

  it("history returns at most 10 records", async () => {
    const res = await request(app).get("/api/bills/history");
    expect(res.body.payments.length).toBeLessThanOrEqual(10);
  });
});

// ---------------------------------------------------------------------------
// 8. REP COMMISSIONS
// ---------------------------------------------------------------------------
describe("8. Rep Commissions", () => {
  beforeEach(() => {
    vi.mocked(siprelProvider.pay).mockResolvedValue(siprelSuccess);
    vi.mocked(siprelProvider.getSaldoBalance!).mockResolvedValue(1500);
  });

  it("successful payment with rep_id in body creates a commission record (amount=5, type=bill_pay, status=pending)", async () => {
    const res = await request(app).post("/api/bills/pay").send({
      ...validCfePayload,
      rep_id: "REP001",
    });
    expect(res.status).toBe(201);

    // Commission is non-blocking — wait for it to settle
    await tick(120);

    const [payment] = await db
      .select()
      .from(billPaymentsTable)
      .where(eq(billPaymentsTable.confirmationCode, "TEST-FOLIO-001"))
      .limit(1);

    expect(payment).toBeDefined();
    expect(payment.repId).toBe("REP001");

    const commissions = await db
      .select()
      .from(repCommissionsTable)
      .where(eq(repCommissionsTable.billPaymentId, payment.id));

    expect(commissions).toHaveLength(1);
    expect(parseFloat(commissions[0].amount)).toBe(5);
    expect(commissions[0].type).toBe("bill_pay");
    expect(commissions[0].status).toBe("pending");
    expect(commissions[0].repId).toBe("REP001");
    // hold_until must be in the future (7 days out)
    expect(commissions[0].holdUntil.getTime()).toBeGreaterThan(Date.now());
  });

  it("successful payment by a user referred by a rep auto-attributes the commission to the referring rep", async () => {
    // Insert a user who was referred by REP002
    await db.insert(usersTable).values({
      telefono: validCfePayload.telefono,
      referredByRepId: "REP002",
    });

    // No rep_id in body — should be auto-resolved from user record
    const res = await request(app).post("/api/bills/pay").send(validCfePayload);
    expect(res.status).toBe(201);

    await tick(120);

    const [payment] = await db
      .select()
      .from(billPaymentsTable)
      .where(eq(billPaymentsTable.confirmationCode, "TEST-FOLIO-001"))
      .limit(1);

    expect(payment).toBeDefined();
    expect(payment.repId).toBe("REP002");

    const commissions = await db
      .select()
      .from(repCommissionsTable)
      .where(eq(repCommissionsTable.billPaymentId, payment.id));

    expect(commissions).toHaveLength(1);
    expect(commissions[0].repId).toBe("REP002");
    expect(commissions[0].type).toBe("bill_pay");
    expect(commissions[0].status).toBe("pending");
  });

  it("failed payment does not create any commission record", async () => {
    vi.mocked(siprelProvider.pay).mockRejectedValue(new Error("NETWORK_ERROR"));
    vi.mocked(evolucionaProvider.pay).mockRejectedValue(new Error("NETWORK_ERROR"));

    const res = await request(app).post("/api/bills/pay").send({
      ...validCfePayload,
      rep_id: "REP003",
    });
    expect(res.status).toBe(502);

    await tick(120);

    const commissions = await db.select().from(repCommissionsTable);
    expect(commissions).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 9. Wallet
// ---------------------------------------------------------------------------
describe("9. Wallet", () => {
  beforeEach(() => {
    vi.mocked(siprelProvider.pay).mockResolvedValue({
      success: true,
      confirmationCode: "TEST-FOLIO-WALLET",
      provider: "siprel" as const,
      timestamp: new Date().toISOString(),
      failoverUsed: false,
      rawResponse: { folio: "TEST-FOLIO-WALLET" },
    });
  });

  it("POST /api/wallet/load/oxxo with amount 200 returns voucherUrl and a pending transaction", async () => {
    const res = await request(app)
      .post("/api/wallet/load/oxxo")
      .send({ telefono: "3221234567", amountMXN: 200 });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("voucherUrl");
    expect(res.body).toHaveProperty("barcodeReference");
    expect(res.body).toHaveProperty("expiresAt");
    expect(res.body).toHaveProperty("transactionId");
    expect(res.body.amountMXN).toBe(200);
    expect(vi.mocked(createOxxoOrder)).toHaveBeenCalledOnce();

    const transactions = await db
      .select()
      .from(walletTransactionsTable)
      .where(eq(walletTransactionsTable.conektaOrderId, "ord_test_oxxo_001"));

    expect(transactions).toHaveLength(1);
    expect(transactions[0].status).toBe("pending");
    expect(transactions[0].type).toBe("load_oxxo");
    expect(parseFloat(transactions[0].amountMxn)).toBe(200);
  });

  it("POST /api/wallet/load/oxxo with amount 49 returns 400 (below minimum)", async () => {
    const res = await request(app)
      .post("/api/wallet/load/oxxo")
      .send({ telefono: "3221234567", amountMXN: 49 });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/50/);
  });

  it("Conekta webhook charge.paid credits the wallet and confirms the transaction", async () => {
    // Setup: create user, wallet, and a pending OXXO transaction
    await db.insert(usersTable).values({ telefono: "3221234567" }).onConflictDoNothing();
    const [wallet] = await db
      .insert(walletsTable)
      .values({ userId: "3221234567", balanceMxn: "0.00" })
      .returning();

    const [pendingTx] = await db
      .insert(walletTransactionsTable)
      .values({
        walletId: wallet.id,
        type: "load_oxxo",
        amountMxn: "300.00",
        status: "pending",
        conektaOrderId: "ord_webhook_test_001",
        description: "Carga PagoYa — $300 MXN",
      })
      .returning();

    const webhookBody = {
      type: "charge.paid",
      data: { object: { id: "ord_webhook_test_001" } },
    };

    const res = await request(app)
      .post("/api/wallet/webhook/conekta")
      .send(webhookBody);

    expect(res.status).toBe(200);

    // Give setImmediate callback time to complete all DB round-trips (~6 ops)
    await tick(800);

    const [updatedTx] = await db
      .select()
      .from(walletTransactionsTable)
      .where(eq(walletTransactionsTable.id, pendingTx.id));

    expect(updatedTx.status).toBe("confirmed");
    expect(updatedTx.confirmedAt).not.toBeNull();

    const [updatedWallet] = await db
      .select()
      .from(walletsTable)
      .where(eq(walletsTable.id, wallet.id));

    expect(parseFloat(updatedWallet.balanceMxn)).toBe(300);
  });

  it("POST /api/bills/pay with paymentSource=wallet and insufficient balance returns 400 INSUFFICIENT_BALANCE", async () => {
    // No wallet row — balance defaults to 0, which is less than the 850 MXN payment
    const res = await request(app).post("/api/bills/pay").send({
      ...validCfePayload,
      paymentSource: "wallet",
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("INSUFFICIENT_BALANCE");
    expect(res.body).toHaveProperty("currentBalance");
    expect(res.body.currentBalance).toBe(0);
  });
});
