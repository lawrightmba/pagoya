import { describe, it, expect, vi, beforeEach, beforeAll, afterAll, afterEach } from "vitest";
import request from "supertest";
import { db, billPaymentsTable, billPaymentAuditTable, repCommissionsTable, usersTable, walletsTable, walletTransactionsTable, taecelProductCacheTable } from "@workspace/db";
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

vi.mock("../../lib/whatsapp.js", () => ({
  sendWhatsApp: vi.fn().mockResolvedValue(undefined),
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
import { sendLowSaldoAlert, sendWhatsAppReceipt } from "../lib/notifications.js";
import { sendWhatsApp } from "../../lib/whatsapp.js";
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

  it("Telcel recarga denominations are present in the catalog", async () => {
    const res = await request(app).get("/api/bills/catalog");
    const allServices = res.body.categories.flatMap((c: { services: { id: string }[] }) => c.services);
    const ids = allServices.map((s: { id: string }) => s.id);
    // Catalog now uses denomination-based IDs (TEL010 … TEL200)
    expect(ids).toContain("telcel_recarga_10");
    expect(ids).toContain("telcel_recarga_100");
    expect(ids).toContain("telcel_recarga_200");
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

  it("POST /api/bills/pay with Telcel Recarga $50 and monto below minimum returns 400", async () => {
    const res = await request(app).post("/api/bills/pay").send({
      serviceId: "telcel_recarga_50",
      referencia: "3221234567",
      monto: 20, // below 50 MXN minimum for this denomination
      telefono: "3221234567",
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/50 MXN/i);
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
    vi.mocked(siprelProvider.getSaldoBalance!).mockResolvedValue({ tiempoAire: 1500, pagoServicios: 1500 });
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

  it("bill_payment_audit has one row: payment.confirmed (no pre-provider created row)", async () => {
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

    expect(auditRows).toHaveLength(1);
    expect(auditRows[0].event).toBe("payment.confirmed");
  });
});

// ---------------------------------------------------------------------------
// 4. FAILOVER — SIPREL FAILS, EVOLUCIONA SUCCEEDS
// ---------------------------------------------------------------------------
describe("4. Failover — SIPREL fails, Evoluciona succeeds", () => {
  beforeEach(() => {
    vi.mocked(siprelProvider.pay).mockRejectedValue(new Error("NETWORK_ERROR"));
    vi.mocked(evolucionaProvider.pay).mockResolvedValue(evolucionaSuccess);
    vi.mocked(siprelProvider.getSaldoBalance!).mockResolvedValue({ tiempoAire: 1500, pagoServicios: 1500 });
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

  it("bill_payments row has status=fallido", async () => {
    await request(app).post("/api/bills/pay").send(validCfePayload);

    const payments = await db
      .select()
      .from(billPaymentsTable)
      .orderBy(desc(billPaymentsTable.createdAt))
      .limit(1);

    expect(payments).toHaveLength(1);
    expect(payments[0].status).toBe("fallido");
  });

  it("bill_payment_audit has one payment.failed row (no pre-provider created row)", async () => {
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

    expect(auditRows).toHaveLength(1);
    expect(auditRows[0].event).toBe("payment.failed");
  });
});

// ---------------------------------------------------------------------------
// 6. SALDO LOW-BALANCE ALERT
// ---------------------------------------------------------------------------
describe("6. Saldo low-balance alert", () => {
  beforeEach(() => {
    vi.mocked(siprelProvider.pay).mockResolvedValue(siprelSuccess);
    vi.mocked(siprelProvider.getSaldoBalance!).mockResolvedValue({ tiempoAire: 1500, pagoServicios: 400 }); // pagoServicios below 500 threshold
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
    vi.clearAllMocks();
    vi.mocked(siprelProvider.pay).mockResolvedValue(siprelSuccess);
    vi.mocked(siprelProvider.getSaldoBalance!).mockResolvedValue({ tiempoAire: 1500, pagoServicios: 1500 });
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
    vi.mocked(siprelProvider.getSaldoBalance!).mockResolvedValue({ tiempoAire: 1500, pagoServicios: 1500 });
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
    vi.mocked(siprelProvider.getSaldoBalance!).mockResolvedValue({ tiempoAire: 1500, pagoServicios: 1500 });
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

  it("wallet bill pay: balance is checked before provider, bill_payments.payment_method = 'wallet', debit inserted after confirm", async () => {
    // Fund the wallet
    await db.insert(usersTable).values({ telefono: "3221234567" }).onConflictDoNothing();
    const [wallet] = await db
      .insert(walletsTable)
      .values({ userId: "3221234567", balanceMxn: "1000.00" })
      .returning();

    const res = await request(app).post("/api/bills/pay").send({
      ...validCfePayload, // monto: 850
      paymentSource: "wallet",
    });

    expect(res.status).toBe(201);

    // Give the non-blocking debitWallet time to complete
    await tick(400);

    // bill_payments row must record payment_method = 'wallet'
    const [payment] = await db
      .select()
      .from(billPaymentsTable)
      .where(eq(billPaymentsTable.confirmationCode, "TEST-FOLIO-WALLET"))
      .limit(1);

    expect(payment).toBeDefined();
    expect(payment.paymentMethod).toBe("wallet");

    // A debit wallet_transaction must be inserted with bill_pay type
    const debits = await db
      .select()
      .from(walletTransactionsTable)
      .where(eq(walletTransactionsTable.walletId, wallet.id));

    expect(debits).toHaveLength(1);
    expect(debits[0].type).toBe("bill_pay");
    expect(debits[0].status).toBe("confirmed");
    expect(parseFloat(debits[0].amountMxn)).toBe(850);

    // Description must mask all but last 4 digits of referencia ("123456789012" → "9012")
    expect(debits[0].description).toMatch(/••••9012/);
    expect(debits[0].description).toContain("CFE");

    // Wallet balance must drop by 850
    const [updated] = await db
      .select()
      .from(walletsTable)
      .where(eq(walletsTable.id, wallet.id));
    expect(parseFloat(updated.balanceMxn)).toBe(150);
  });

  it("wallet bill pay: provider failure does NOT debit the wallet", async () => {
    vi.mocked(siprelProvider.pay).mockRejectedValueOnce(new Error("PROVIDER_DOWN"));
    vi.mocked(evolucionaProvider.pay).mockRejectedValueOnce(new Error("PROVIDER_DOWN"));

    await db.insert(usersTable).values({ telefono: "3221234567" }).onConflictDoNothing();
    const [wallet] = await db
      .insert(walletsTable)
      .values({ userId: "3221234567", balanceMxn: "1000.00" })
      .returning();

    const res = await request(app).post("/api/bills/pay").send({
      ...validCfePayload,
      paymentSource: "wallet",
    });

    expect(res.status).toBe(502);

    await tick(200);

    // Balance must remain unchanged
    const [checked] = await db
      .select()
      .from(walletsTable)
      .where(eq(walletsTable.id, wallet.id));
    expect(parseFloat(checked.balanceMxn)).toBe(1000);

    // No debit transaction must exist
    const debits = await db
      .select()
      .from(walletTransactionsTable)
      .where(eq(walletTransactionsTable.walletId, wallet.id));
    expect(debits).toHaveLength(0);
  });

  it("Conekta webhook charge.expired sets status to 'failed' and sends WhatsApp failure notification", async () => {
    vi.mocked(sendWhatsApp).mockResolvedValue(undefined);

    await db.insert(usersTable).values({ telefono: "3221234567" }).onConflictDoNothing();
    const [wallet] = await db
      .insert(walletsTable)
      .values({ userId: "3221234567", balanceMxn: "200.00" })
      .returning();

    const [pendingTx] = await db
      .insert(walletTransactionsTable)
      .values({
        walletId: wallet.id,
        type: "load_oxxo",
        amountMxn: "200.00",
        status: "pending",
        conektaOrderId: "ord_expired_test_001",
        description: "Carga PagoYa — $200 MXN",
      })
      .returning();

    const res = await request(app)
      .post("/api/wallet/webhook/conekta")
      .send({ type: "charge.expired", data: { object: { id: "ord_expired_test_001" } } });

    expect(res.status).toBe(200);

    await tick(800);

    // Status must flip to "failed"
    const [updatedTx] = await db
      .select()
      .from(walletTransactionsTable)
      .where(eq(walletTransactionsTable.id, pendingTx.id));
    expect(updatedTx.status).toBe("failed");

    // Balance must remain unchanged — no credit was issued
    const [updatedWallet] = await db
      .select()
      .from(walletsTable)
      .where(eq(walletsTable.id, wallet.id));
    expect(parseFloat(updatedWallet.balanceMxn)).toBe(200);

    // WhatsApp failure message must have been dispatched via Twilio sendWhatsApp
    expect(vi.mocked(sendWhatsApp)).toHaveBeenCalledWith(
      expect.stringContaining("3221234567"),
      expect.stringMatching(/venci/i),
    );
  });

  it("GET /api/wallet/transactions returns results in descending order and respects limit param", async () => {
    await db.insert(usersTable).values({ telefono: "3221234567" }).onConflictDoNothing();
    const [wallet] = await db
      .insert(walletsTable)
      .values({ userId: "3221234567", balanceMxn: "0.00" })
      .returning();

    // Insert 3 transactions with explicit timestamps so ordering is deterministic
    const t1 = new Date("2025-01-01T10:00:00Z");
    const t2 = new Date("2025-01-02T10:00:00Z");
    const t3 = new Date("2025-01-03T10:00:00Z");

    await db.insert(walletTransactionsTable).values([
      { walletId: wallet.id, type: "load_oxxo", amountMxn: "100.00", status: "confirmed", description: "Oldest", createdAt: t1 },
      { walletId: wallet.id, type: "load_oxxo", amountMxn: "200.00", status: "confirmed", description: "Middle", createdAt: t2 },
      { walletId: wallet.id, type: "load_oxxo", amountMxn: "300.00", status: "confirmed", description: "Newest", createdAt: t3 },
    ]);

    // Request only 2 records — should get the 2 newest in descending order
    const res = await request(app).get(
      `/api/wallet/transactions?telefono=3221234567&limit=2`,
    );

    expect(res.status).toBe(200);
    expect(res.body.transactions).toHaveLength(2);

    // First must be newest ($300)
    expect(parseFloat(res.body.transactions[0].amountMXN)).toBe(300);
    expect(res.body.transactions[0].description).toBe("Newest");

    // Second must be middle ($200)
    expect(parseFloat(res.body.transactions[1].amountMXN)).toBe(200);
    expect(res.body.transactions[1].description).toBe("Middle");
  });
});

// ===========================================================================
// TAECEL / SIPREL PROVIDER TESTS
// The following groups test the actual siprelProvider implementation using
// vi.importActual to bypass the module-level mock. All HTTP calls are
// intercepted via vi.spyOn(globalThis, 'fetch').
// ===========================================================================

// Shared test credentials / base URL
const TAECEL_TEST_KEY = "TEST_KEY_123";
const TAECEL_TEST_NIP = "TEST_NIP_456";
const TAECEL_TEST_BASE = "https://test.taecel.com/api/";

/** Set env vars needed for the real Taecel provider to initialise */
function setTaecelEnv() {
  process.env.SIPREL_API_KEY  = TAECEL_TEST_KEY;
  // Set both names so the SIPREL_PIN ?? SIPREL_NIP fallback always
  // resolves to the test value even when the real secret is present.
  process.env.SIPREL_PIN      = TAECEL_TEST_NIP;
  process.env.SIPREL_NIP      = TAECEL_TEST_NIP;
  process.env.SIPREL_BASE_URL = TAECEL_TEST_BASE;
}

/** Remove test env vars so they don't leak into other suites */
function clearTaecelEnv() {
  delete process.env.SIPREL_API_KEY;
  delete process.env.SIPREL_PIN;
  delete process.env.SIPREL_NIP;
  delete process.env.SIPREL_BASE_URL;
}

/** Build a minimal Taecel requestTXN success response */
function reqTxnOk(transID = "TX_TEST_001") {
  return new Response(
    JSON.stringify({ success: true, error: 0, message: "Exitosa", data: { transID, fecha: "2024-01-15" }, extra: null }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

/** Build a Taecel requestTXN failure response */
function reqTxnErr(code: number, msg: string) {
  return new Response(
    JSON.stringify({ success: false, error: code, message: msg, data: [], extra: null }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

/** Build a Taecel statusTXN "Exitosa" response */
function statusTxnOk(transID: string, overrides: Record<string, string> = {}) {
  return new Response(
    JSON.stringify({
      success: true,
      error: 0,
      message: "Exitosa",
      data: {
        TransID: transID,
        Fecha: "2024-01-15 10:30:00",
        Carrier: "CFE",
        Referencia: "125478965412",
        Folio: "CFE-FOLIO-001",
        Status: "Exitosa",
        Monto: "$260.00",
        Cargo: "$260.00",
        Bolsa: "Pago de Servicios",
        "Saldo Final": "$1,500.00",
        ...overrides,
      },
      extra: null,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

/** Build a "En Proceso" statusTXN response (keep polling) */
function statusTxnEnProceso() {
  return new Response(
    JSON.stringify({ success: false, error: 0, message: "En Proceso", data: [], extra: null }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

/** Build a statusTXN provider-error response (stops polling) */
function statusTxnErr(code: number, msg: string) {
  return new Response(
    JSON.stringify({ success: false, error: code, message: msg, data: [], extra: null }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

/** Build a Taecel getBalance response with two bolsas */
function balanceResp(tiempoAire: number, pagoServicios: number) {
  return new Response(
    JSON.stringify({
      success: true,
      data: [
        { ID: "1", Bolsa: "Tiempo Aire",       Saldo: String(tiempoAire) },
        { ID: "2", Bolsa: "Pago de Servicios", Saldo: String(pagoServicios) },
      ],
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

/** Build a getProducts success response */
function productsResp() {
  return new Response(
    JSON.stringify({ success: true, data: [{ producto: "CFE000", descripcion: "CFE", precio: 1.0 }] }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

// ---------------------------------------------------------------------------
// 10. Taecel API Format
// ---------------------------------------------------------------------------
describe("10. Taecel API Format", () => {
  type SiprelMod = typeof import("../providers/siprel.js");
  let realPay: SiprelMod["siprelProvider"]["pay"];

  beforeAll(async () => {
    const mod = await vi.importActual<SiprelMod>("../providers/siprel.js");
    realPay = mod.siprelProvider.pay.bind(mod.siprelProvider);
    setTaecelEnv();
  });

  afterAll(() => {
    clearTaecelEnv();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /** Create a fetch spy that handles requestTXN and statusTXN calls */
  function mockBillPayFetch(transID = "TX_FORMAT_001") {
    return vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      const u = url.toString();
      if (u.includes("requestTXN")) return reqTxnOk(transID);
      if (u.includes("statusTXN"))  return statusTxnOk(transID);
      return new Response("{}", { status: 200 });
    });
  }

  it("1. requestTXN sends Content-Type: application/x-www-form-urlencoded (NOT application/json)", async () => {
    const spy = mockBillPayFetch();
    await realPay({ id: "cfe" } as never, { serviceId: "cfe", referencia: "125478965412", monto: 260, telefono: "3221234567" });

    const reqTxnCall = spy.mock.calls.find(([url]) => url.toString().includes("requestTXN"));
    expect(reqTxnCall).toBeDefined();
    const headers = reqTxnCall![1]?.headers as Record<string, string>;
    expect(headers["Content-Type"]).toBe("application/x-www-form-urlencoded");
  });

  it("2. requestTXN sends key and nip in POST body (NOT in Authorization header)", async () => {
    const spy = mockBillPayFetch();
    await realPay({ id: "cfe" } as never, { serviceId: "cfe", referencia: "125478965412", monto: 260, telefono: "3221234567" });

    const reqTxnCall = spy.mock.calls.find(([url]) => url.toString().includes("requestTXN"));
    expect(reqTxnCall).toBeDefined();
    const bodyStr = String(reqTxnCall![1]?.body ?? "");
    expect(bodyStr).toContain(`key=${TAECEL_TEST_KEY}`);
    expect(bodyStr).toContain(`nip=${TAECEL_TEST_NIP}`);
    // Must NOT use Authorization header
    const headers = reqTxnCall![1]?.headers as Record<string, string>;
    expect(headers["Authorization"]).toBeUndefined();
  });

  it("3. Bill payment requestTXN includes monto in body", async () => {
    const spy = mockBillPayFetch();
    await realPay({ id: "cfe" } as never, { serviceId: "cfe", referencia: "125478965412", monto: 260, telefono: "3221234567" });

    const reqTxnCall = spy.mock.calls.find(([url]) => url.toString().includes("requestTXN"));
    const bodyStr = String(reqTxnCall![1]?.body ?? "");
    expect(bodyStr).toContain("monto=260");
  });

  it("4. Mobile top-up requestTXN does NOT include monto in body", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      const u = url.toString();
      if (u.includes("requestTXN")) return reqTxnOk("TX_TA_001");
      if (u.includes("statusTXN"))  return statusTxnOk("TX_TA_001", { Bolsa: "Tiempo Aire", Carrier: "Telcel", Folio: "TEL-010-FOLIO" });
      return new Response("{}", { status: 200 });
    });
    await realPay({ id: "telcel_recarga_10" } as never, { serviceId: "telcel_recarga_10", referencia: "5555555505", monto: 10, telefono: "5555555505" });

    const reqTxnCall = spy.mock.calls.find(([url]) => url.toString().includes("requestTXN"));
    const bodyStr = String(reqTxnCall![1]?.body ?? "");
    expect(bodyStr).not.toContain("monto=");
  });

  it("5. statusTXN sends key, nip, and transID in body", async () => {
    const spy = mockBillPayFetch("TX_STATUS_CHK");
    await realPay({ id: "cfe" } as never, { serviceId: "cfe", referencia: "125478965412", monto: 260, telefono: "3221234567" });

    const statusCall = spy.mock.calls.find(([url]) => url.toString().includes("statusTXN"));
    expect(statusCall).toBeDefined();
    const bodyStr = String(statusCall![1]?.body ?? "");
    expect(bodyStr).toContain(`key=${TAECEL_TEST_KEY}`);
    expect(bodyStr).toContain(`nip=${TAECEL_TEST_NIP}`);
    expect(bodyStr).toContain("transID=TX_STATUS_CHK");
  });
});

// ---------------------------------------------------------------------------
// 11. SKU Code Map
// ---------------------------------------------------------------------------
describe("11. SKU Code Map", () => {
  type SiprelMod = typeof import("../providers/siprel.js");
  let realPay: SiprelMod["siprelProvider"]["pay"];

  beforeAll(async () => {
    const mod = await vi.importActual<SiprelMod>("../providers/siprel.js");
    realPay = mod.siprelProvider.pay.bind(mod.siprelProvider);
    setTaecelEnv();
  });

  afterAll(() => {
    clearTaecelEnv();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /** Assert that the requestTXN body contains the expected 'producto' param */
  async function assertProducto(serviceId: string, expectedSku: string, isTopup = false) {
    const spy = vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      const u = url.toString();
      if (u.includes("requestTXN")) return reqTxnOk("TX_SKU_001");
      if (u.includes("statusTXN"))
        return statusTxnOk("TX_SKU_001", { Bolsa: isTopup ? "Tiempo Aire" : "Pago de Servicios" });
      return new Response("{}", { status: 200 });
    });
    await realPay({ id: serviceId } as never, { serviceId, referencia: "125478965412", monto: 100, telefono: "3221234567" });
    const reqTxnCall = spy.mock.calls.find(([url]) =>
      url.toString().includes("requestTXN"),
    ) as [string, RequestInit] | undefined;
    const bodyStr = String(reqTxnCall?.[1]?.body ?? "");
    expect(bodyStr).toContain(`producto=${expectedSku}`);
  }

  it("6. CFE service maps to producto 'CFE000'", () => assertProducto("cfe", "CFE000"));

  it("7. Telmex service maps to producto 'TMX001'", () => assertProducto("telmex_fijo", "TMX001"));

  it("8. Sky service maps to producto 'SKY000'", () => assertProducto("sky", "SKY000"));

  it("9. Megacable service maps to producto 'MEG000'", () => assertProducto("megacable", "MEG000"));

  it("10. Izzi service maps to producto 'IZZ000'", () => assertProducto("izzi", "IZZ000"));
  it("10b. TotalPlay service maps to producto 'TOT000'", () => assertProducto("totalplay", "TOT000"));
  it("10c. Gas Natural service maps to producto 'GAS000'", () => assertProducto("gas_natural", "GAS000"));
});

// ---------------------------------------------------------------------------
// 12. Taecel Payment Flow
// ---------------------------------------------------------------------------
describe("12. Taecel Payment Flow", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  /** Rich siprelProvider.pay mock for a confirmed payment */
  function mockSiprelSuccess(overrides: Record<string, unknown> = {}) {
    vi.mocked(siprelProvider.pay).mockResolvedValue({
      success: true,
      confirmationCode: "CFE-FOLIO-001",
      provider: "siprel",
      timestamp: new Date().toISOString(),
      failoverUsed: false,
      status: "confirmed",
      rawResponse: {
        transID: "TX12345",
        folio: "CFE-FOLIO-001",
        carrier: "CFE",
        cargoMxn: 260,
        bolsaType: "Pago de Servicios",
        ...overrides,
      },
    });
    vi.mocked(siprelProvider.getSaldoBalance!).mockResolvedValue({ tiempoAire: 1500, pagoServicios: 1500 });
  }

  it("11. CFE payment: bill_payments row has status=confirmed and taecel_folio set", async () => {
    mockSiprelSuccess();
    const res = await request(app)
      .post("/api/bills/pay")
      .send({ serviceId: "cfe", referencia: "125478965412", monto: 260, telefono: "3221234567" });

    expect(res.status).toBe(201);
    expect(res.body.folio).toBe("CFE-FOLIO-001");

    const [payment] = await db
      .select()
      .from(billPaymentsTable)
      .where(eq(billPaymentsTable.confirmationCode, "CFE-FOLIO-001"))
      .limit(1);

    expect(payment).toBeDefined();
    expect(payment.status).toBe("confirmed");
    expect(payment.taecelFolio).toBe("CFE-FOLIO-001");
    expect(payment.taecelTransId).toBe("TX12345");
    expect(payment.bolsaType).toBe("Pago de Servicios");
  });

  it("12. Telcel top-up: bill_payments row has bolsa_type='Tiempo Aire'", async () => {
    vi.mocked(siprelProvider.pay).mockResolvedValue({
      success: true,
      confirmationCode: "TEL-010-FOLIO",
      provider: "siprel",
      timestamp: new Date().toISOString(),
      failoverUsed: false,
      status: "confirmed",
      rawResponse: { transID: "TX_TEL_001", folio: "TEL-010-FOLIO", carrier: "Telcel", cargoMxn: 10, bolsaType: "Tiempo Aire" },
    });
    vi.mocked(siprelProvider.getSaldoBalance!).mockResolvedValue({ tiempoAire: 1500, pagoServicios: 1500 });

    const res = await request(app)
      .post("/api/bills/pay")
      .send({ serviceId: "telcel_recarga_10", referencia: "5555555505", monto: 10, telefono: "5555555505" });

    expect(res.status).toBe(201);

    const [payment] = await db
      .select()
      .from(billPaymentsTable)
      .where(eq(billPaymentsTable.confirmationCode, "TEL-010-FOLIO"))
      .limit(1);

    expect(payment).toBeDefined();
    expect(payment.bolsaType).toBe("Tiempo Aire");

    // WhatsApp receipt must have been dispatched (mocked to no-op)
    await tick(50);
    expect(vi.mocked(sendWhatsAppReceipt)).toHaveBeenCalledWith(
      expect.objectContaining({ confirmationCode: "TEL-010-FOLIO" }),
    );
  });

  it("13. Error code 1 (INVALID_PHONE) — provider throws INVALID_PHONE, route returns 502", async () => {
    vi.mocked(siprelProvider.pay).mockRejectedValue(
      new Error("Taecel statusTXN failed [INVALID_PHONE]: Celular incorrecto"),
    );
    vi.mocked(evolucionaProvider.pay).mockRejectedValue(new Error("NETWORK_ERROR"));

    const res = await request(app)
      .post("/api/bills/pay")
      .send({ serviceId: "telcel_recarga_50", referencia: "5555555510", monto: 50, telefono: "5555555510" });

    expect(res.status).toBe(502);
    expect(res.body).toHaveProperty("error");
  });

  it("14. Error code 2 (DESTINATION_UNAVAILABLE) — provider throws, bill_payments row status=failed", async () => {
    vi.mocked(siprelProvider.pay).mockRejectedValue(
      new Error("Taecel statusTXN failed [DESTINATION_UNAVAILABLE]: Destino no disponible"),
    );
    vi.mocked(evolucionaProvider.pay).mockRejectedValue(new Error("NETWORK_ERROR"));

    await request(app)
      .post("/api/bills/pay")
      .send({ serviceId: "telcel_recarga_200", referencia: "5555555525", monto: 200, telefono: "5555555525" });

    const [payment] = await db
      .select()
      .from(billPaymentsTable)
      .orderBy(desc(billPaymentsTable.createdAt))
      .limit(1);

    expect(payment.status).toBe("fallido");
  });

  it("15. Error code 3129 (TRANSACTION_TABLE_FULL) — provider throws expected message", async () => {
    vi.mocked(siprelProvider.pay).mockRejectedValue(
      new Error("Taecel requestTXN failed [TRANSACTION_TABLE_FULL]: Tabla de transacciones llena"),
    );
    vi.mocked(evolucionaProvider.pay).mockRejectedValue(new Error("NETWORK_ERROR"));

    const res = await request(app)
      .post("/api/bills/pay")
      .send({ serviceId: "att_recarga_150", referencia: "5555555200", monto: 150, telefono: "5555555200" });

    expect(res.status).toBe(502);
  });
});

// ---------------------------------------------------------------------------
// 13. StatusTXN Polling
// ---------------------------------------------------------------------------
describe("13. StatusTXN Polling", () => {
  type SiprelMod = typeof import("../providers/siprel.js");
  let realPay: SiprelMod["siprelProvider"]["pay"];

  beforeAll(async () => {
    const mod = await vi.importActual<SiprelMod>("../providers/siprel.js");
    realPay = mod.siprelProvider.pay.bind(mod.siprelProvider);
    setTaecelEnv();
  });

  afterAll(() => {
    clearTaecelEnv();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("16. Polling stops immediately on first success (statusTXN called exactly once)", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      const u = url.toString();
      if (u.includes("requestTXN")) return reqTxnOk("TX_FAST");
      if (u.includes("statusTXN"))  return statusTxnOk("TX_FAST");
      return new Response("{}", { status: 200 });
    });

    await realPay({ id: "cfe" } as never, { serviceId: "cfe", referencia: "125478965412", monto: 260, telefono: "3221234567" });

    const statusCalls = spy.mock.calls.filter(([url]) => url.toString().includes("statusTXN"));
    expect(statusCalls).toHaveLength(1); // stopped on the first success
  });

  it("17. Polling retries when first statusTXN returns 'En Proceso'", async () => {
    vi.useFakeTimers();

    let statusCallCount = 0;
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      const u = url.toString();
      if (u.includes("requestTXN")) return reqTxnOk("TX_RETRY");
      if (u.includes("statusTXN")) {
        statusCallCount++;
        return statusCallCount === 1 ? statusTxnEnProceso() : statusTxnOk("TX_RETRY");
      }
      return new Response("{}", { status: 200 });
    });

    const payPromise = realPay(
      { id: "cfe" } as never,
      { serviceId: "cfe", referencia: "125478965412", monto: 260, telefono: "3221234567" },
    );

    // Advance past the 5-second poll interval to allow the second statusTXN call
    await vi.advanceTimersByTimeAsync(5_500);
    const result = await payPromise;

    expect(statusCallCount).toBeGreaterThanOrEqual(2); // En Proceso → retry → Exitosa
    expect(result.status).toBe("confirmed");
  });

  it("18. Polling stops after 60 seconds and returns status='pending'", async () => {
    vi.useFakeTimers();

    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      const u = url.toString();
      if (u.includes("requestTXN")) return reqTxnOk("TX_TIMEOUT");
      if (u.includes("statusTXN"))  return statusTxnEnProceso(); // always En Proceso
      return new Response("{}", { status: 200 });
    });

    const payPromise = realPay(
      { id: "cfe" } as never,
      { serviceId: "cfe", referencia: "125478965412", monto: 260, telefono: "3221234567" },
    );

    // Advance past the 60-second timeout
    await vi.advanceTimersByTimeAsync(65_000);
    const result = await payPromise;

    expect(result.status).toBe("pending");
  });

  it("19. 'En Proceso' response triggers continued polling", async () => {
    vi.useFakeTimers();

    let statusCallCount = 0;
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      const u = url.toString();
      if (u.includes("requestTXN")) return reqTxnOk("TX_EN_PROCESO");
      if (u.includes("statusTXN")) {
        statusCallCount++;
        // First two calls: En Proceso; third call: Exitosa
        if (statusCallCount < 3) return statusTxnEnProceso();
        return statusTxnOk("TX_EN_PROCESO");
      }
      return new Response("{}", { status: 200 });
    });

    const payPromise = realPay(
      { id: "cfe" } as never,
      { serviceId: "cfe", referencia: "125478965412", monto: 260, telefono: "3221234567" },
    );

    await vi.advanceTimersByTimeAsync(11_000); // advance past two 5s intervals
    const result = await payPromise;

    expect(statusCallCount).toBeGreaterThanOrEqual(3);
    expect(result.status).toBe("confirmed");
  });

  it("20. Timeout result has the original transID preserved in rawResponse", async () => {
    vi.useFakeTimers();

    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      const u = url.toString();
      if (u.includes("requestTXN")) return reqTxnOk("TX_PRESERVED_ID");
      if (u.includes("statusTXN"))  return statusTxnEnProceso();
      return new Response("{}", { status: 200 });
    });

    const payPromise = realPay(
      { id: "cfe" } as never,
      { serviceId: "cfe", referencia: "125478965412", monto: 260, telefono: "3221234567" },
    );

    await vi.advanceTimersByTimeAsync(65_000);
    const result = await payPromise;

    expect(result.status).toBe("pending");
    const raw = result.rawResponse as Record<string, unknown>;
    expect(raw.transID).toBe("TX_PRESERVED_ID");
  });
});

// ---------------------------------------------------------------------------
// 14. Error Code 403 — Credential Alert
// ---------------------------------------------------------------------------
describe("14. Error Code 403 — Credential Alert", () => {
  type SiprelMod = typeof import("../providers/siprel.js");
  let realPay: SiprelMod["siprelProvider"]["pay"];

  beforeAll(async () => {
    const mod = await vi.importActual<SiprelMod>("../providers/siprel.js");
    realPay = mod.siprelProvider.pay.bind(mod.siprelProvider);
    setTaecelEnv();
    process.env.ADMIN_WHATSAPP_NUMBER = "523221234567";
  });

  afterAll(() => {
    clearTaecelEnv();
    delete process.env.ADMIN_WHATSAPP_NUMBER;
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("21. Error 403 from requestTXN fires an admin WhatsApp alert about invalid credentials", async () => {
    vi.mocked(sendWhatsApp).mockResolvedValue(undefined);

    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      const u = url.toString();
      if (u.includes("requestTXN")) {
        return new Response(
          JSON.stringify({ success: false, error: 403, message: "Credenciales invalidas", data: [], extra: null }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response(null, { status: 200 });
    });

    await expect(
      realPay({ id: "cfe" } as never, { serviceId: "cfe", referencia: "125478965412", monto: 260, telefono: "3221234567" }),
    ).rejects.toThrow(/INVALID_CREDENTIALS/i);

    // Allow the non-blocking fireAdminAlert to resolve
    await tick(100);

    expect(vi.mocked(sendWhatsApp)).toHaveBeenCalledWith(
      "523221234567",
      expect.stringMatching(/siprel|credencial/i),
    );
  });
});

// ---------------------------------------------------------------------------
// 15. Two Bolsa Balance
// ---------------------------------------------------------------------------
describe("15. Two Bolsa Balance", () => {
  type SiprelMod = typeof import("../providers/siprel.js");
  let realGetBalance: SiprelMod["taecelGetBalance"];

  beforeAll(async () => {
    const mod = await vi.importActual<SiprelMod>("../providers/siprel.js");
    realGetBalance = mod.taecelGetBalance;
    setTaecelEnv();
  });

  afterAll(() => {
    clearTaecelEnv();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("22. getBalance returns both Tiempo Aire and Pago de Servicios", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(balanceResp(2500.50, 1200.75));

    const balance = await realGetBalance();

    expect(balance.tiempoAire).toBeCloseTo(2500.5, 2);
    expect(balance.pagoServicios).toBeCloseTo(1200.75, 2);
  });

  it("23. Low balance alert fires when Pago de Servicios < 500 MXN (route-level)", async () => {
    vi.mocked(siprelProvider.pay).mockResolvedValue(siprelSuccess);
    vi.mocked(siprelProvider.getSaldoBalance!).mockResolvedValue({ tiempoAire: 1500, pagoServicios: 350 });
    vi.mocked(sendLowSaldoAlert).mockResolvedValue(undefined);
    process.env.ADMIN_WHATSAPP_NUMBER = "523221234567";

    const res = await request(app).post("/api/bills/pay").send(validCfePayload);
    expect(res.status).toBe(201);
    await tick();

    expect(vi.mocked(sendLowSaldoAlert)).toHaveBeenCalledWith(350);
    delete process.env.ADMIN_WHATSAPP_NUMBER;
  });

  it("24. Low balance alert does NOT fire when only Tiempo Aire < 500 MXN (pagoServicios is fine)", async () => {
    // Reset call counts from previous test so this test has a clean slate
    vi.clearAllMocks();

    vi.mocked(siprelProvider.pay).mockResolvedValue(siprelSuccess);
    // tiempoAire low (300), pagoServicios healthy (1500)
    vi.mocked(siprelProvider.getSaldoBalance!).mockResolvedValue({ tiempoAire: 300, pagoServicios: 1500 });
    vi.mocked(sendLowSaldoAlert).mockResolvedValue(undefined);

    await request(app).post("/api/bills/pay").send(validCfePayload);
    await tick();

    expect(vi.mocked(sendLowSaldoAlert)).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 16. Product Cache
// ---------------------------------------------------------------------------
describe("16. Product Cache", () => {
  type SiprelMod = typeof import("../providers/siprel.js");
  let realGetProducts: SiprelMod["taecelGetProducts"];

  beforeAll(async () => {
    const mod = await vi.importActual<SiprelMod>("../providers/siprel.js");
    realGetProducts = mod.taecelGetProducts;
    setTaecelEnv();
  });

  afterAll(() => {
    clearTaecelEnv();
    vi.restoreAllMocks();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await db.delete(taecelProductCacheTable);
  });

  it("25. getProducts result cached — second call within 24h returns without hitting API", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(productsResp());

    await realGetProducts(); // first call — hits API, stores in cache

    const callsAfterFirst = spy.mock.calls.filter(([url]) => url.toString().includes("getProducts")).length;
    expect(callsAfterFirst).toBe(1);

    await realGetProducts(); // second call — should use cache

    const callsAfterSecond = spy.mock.calls.filter(([url]) => url.toString().includes("getProducts")).length;
    expect(callsAfterSecond).toBe(1); // still 1 — second call was served from cache
  });

  it("26. Expired cache (> 24h) triggers a fresh API call", async () => {
    // Insert a stale cache entry (expired 1 hour ago)
    const pastDate = new Date(Date.now() - 25 * 60 * 60 * 1_000); // 25 hours ago
    await db.insert(taecelProductCacheTable).values({
      cachedAt: pastDate,
      expiresAt: pastDate, // already expired
      data: JSON.stringify([{ producto: "OLD_PRODUCT" }]),
    });

    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(productsResp());

    await realGetProducts();

    const productCalls = spy.mock.calls.filter(([url]) => url.toString().includes("getProducts"));
    expect(productCalls).toHaveLength(1); // stale cache forced a fresh fetch
  });
});

// ---------------------------------------------------------------------------
// 17. "Error inesperado" + "En proceso" edge case
// Per Taecel: success:true + message:"Error inesperado" + data.Status:"En proceso"
// is a TRANSIENT state — transaction is still being processed by the carrier.
// The polling loop must NOT resolve this as confirmed; it must continue polling.
// ---------------------------------------------------------------------------
describe('17. "Error inesperado" + "En proceso" edge case', () => {
  type SiprelMod = typeof import("../providers/siprel.js");
  let realPay: SiprelMod["siprelProvider"]["pay"];

  beforeAll(async () => {
    const mod = await vi.importActual<SiprelMod>("../providers/siprel.js");
    realPay = mod.siprelProvider.pay.bind(mod.siprelProvider);
    setTaecelEnv();
  });

  afterAll(() => {
    clearTaecelEnv();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  /** Build the specific "Error inesperado" + "En proceso" response from statusTXN */
  function statusTxnErrorInesperadoEnProceso(transID: string) {
    return new Response(
      JSON.stringify({
        success: true,
        error: "0",
        message: "Error inesperado",
        data: {
          TransID: transID,
          Fecha: "2026-05-11 12:43:06",
          Carrier: "Telcel",
          Folio: "",
          Status: "En proceso",
          Monto: "$100.00",
          Cargo: "$0.00",
          Bolsa: "Tiempo Aire",
          "Saldo Final": "$2,870.40",
        },
        extra: null,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }

  it('27. "Error inesperado"+"En proceso" on first poll does NOT resolve — polling continues', async () => {
    vi.useFakeTimers();

    let statusCallCount = 0;
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      const u = url.toString();
      if (u.includes("requestTXN")) return reqTxnOk("TX_EI_001");
      if (u.includes("statusTXN")) {
        statusCallCount++;
        // First call returns "Error inesperado"+"En proceso"; second returns Exitosa
        return statusCallCount === 1
          ? statusTxnErrorInesperadoEnProceso("TX_EI_001")
          : statusTxnOk("TX_EI_001");
      }
      return new Response("{}", { status: 200 });
    });

    const payPromise = realPay(
      { id: "telcel_recarga_100" } as never,
      { serviceId: "telcel_recarga_100", referencia: "5555555515", monto: 100, telefono: "5555555515" },
    );

    // Advance past the 3-second poll interval so the second statusTXN call fires
    await vi.advanceTimersByTimeAsync(5_000);
    const result = await payPromise;

    // Must have polled at least twice — the first "Error inesperado" response triggered a retry
    expect(statusCallCount).toBeGreaterThanOrEqual(2);
    // Final result must be confirmed, not a false positive from the first poll
    expect(result.status).toBe("confirmed");
  });

  it('28. Multiple consecutive "Error inesperado"+"En proceso" responses eventually resolve on success', async () => {
    vi.useFakeTimers();

    let statusCallCount = 0;
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      const u = url.toString();
      if (u.includes("requestTXN")) return reqTxnOk("TX_EI_002");
      if (u.includes("statusTXN")) {
        statusCallCount++;
        // First three calls: "Error inesperado"+"En proceso"; fourth: Exitosa
        if (statusCallCount < 4) return statusTxnErrorInesperadoEnProceso("TX_EI_002");
        return statusTxnOk("TX_EI_002", { Folio: "EI-FOLIO-OK", Bolsa: "Tiempo Aire", Carrier: "Telcel" });
      }
      return new Response("{}", { status: 200 });
    });

    const payPromise = realPay(
      { id: "telcel_recarga_100" } as never,
      { serviceId: "telcel_recarga_100", referencia: "5555555515", monto: 100, telefono: "5555555515" },
    );

    // Advance enough time for 3 retries (3 × 3s = 9s) plus a small buffer
    await vi.advanceTimersByTimeAsync(15_000);
    const result = await payPromise;

    expect(statusCallCount).toBeGreaterThanOrEqual(4);
    expect(result.status).toBe("confirmed");
    expect(result.confirmationCode).toBe("EI-FOLIO-OK");
  });

  it('29. Polling timeout still fires correctly when all polls return "Error inesperado"+"En proceso"', async () => {
    vi.useFakeTimers();

    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      const u = url.toString();
      if (u.includes("requestTXN")) return reqTxnOk("TX_EI_003");
      if (u.includes("statusTXN")) return statusTxnErrorInesperadoEnProceso("TX_EI_003");
      return new Response("{}", { status: 200 });
    });

    const payPromise = realPay(
      { id: "telcel_recarga_100" } as never,
      { serviceId: "telcel_recarga_100", referencia: "5555555515", monto: 100, telefono: "5555555515" },
    );

    // Advance past the 60-second cycle timeout
    await vi.advanceTimersByTimeAsync(65_000);
    const result = await payPromise;

    // Must time out to pending, not resolve as a false confirmed
    expect(result.status).toBe("pending");
  });

  it('30. success:true + "Error inesperado" with Status NOT "En proceso" is treated as Type 1 (confirmed)', async () => {
    // If Status has already moved on (e.g. "Exitosa") but message still says "Error inesperado",
    // the transaction is confirmed and the loop should stop.
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      const u = url.toString();
      if (u.includes("requestTXN")) return reqTxnOk("TX_EI_004");
      if (u.includes("statusTXN")) {
        return new Response(
          JSON.stringify({
            success: true,
            error: "0",
            message: "Error inesperado",
            data: {
              TransID: "TX_EI_004",
              Folio: "EI-FOLIO-DONE",
              Status: "Exitosa",     // <-- definitive status, NOT "En proceso"
              Carrier: "Telcel",
              Monto: "$100.00",
              Cargo: "$100.00",
              Bolsa: "Tiempo Aire",
              "Saldo Final": "$2,770.40",
            },
            extra: null,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response("{}", { status: 200 });
    });

    const result = await realPay(
      { id: "telcel_recarga_100" } as never,
      { serviceId: "telcel_recarga_100", referencia: "5555555515", monto: 100, telefono: "5555555515" },
    );

    // Should resolve immediately as confirmed since Status != "En proceso"
    expect(result.status).toBe("confirmed");
    expect(result.confirmationCode).toBe("EI-FOLIO-DONE");
  });

  it('31. "Error inesperado"+"En proceso" correctly uses the affected sandbox reference numbers', async () => {
    // Verify the fix applies for all six documented sandbox numbers (5555555515,
    // 5555555525, 5555555530, 5555555540, 5555555560, 5555555565). We spot-check
    // two of them to confirm the polling path is reference-number-agnostic.
    vi.useFakeTimers();

    const testedRefs: string[] = [];

    for (const ref of ["5555555525", "5555555560"]) {
      testedRefs.push(ref);
      let callCount = 0;

      vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
        const u = url.toString();
        if (u.includes("requestTXN")) return reqTxnOk(`TX_REF_${ref}`);
        if (u.includes("statusTXN")) {
          callCount++;
          return callCount === 1
            ? statusTxnErrorInesperadoEnProceso(`TX_REF_${ref}`)
            : statusTxnOk(`TX_REF_${ref}`, { Folio: `FOLIO_${ref}` });
        }
        return new Response("{}", { status: 200 });
      });

      const payPromise = realPay(
        { id: "telcel_recarga_200" } as never,
        { serviceId: "telcel_recarga_200", referencia: ref, monto: 200, telefono: ref },
      );

      await vi.advanceTimersByTimeAsync(5_000);
      const result = await payPromise;

      expect(result.status).toBe("confirmed");
      expect(callCount).toBeGreaterThanOrEqual(2);

      vi.restoreAllMocks();
      vi.useRealTimers();
      vi.useFakeTimers();
    }

    expect(testedRefs).toHaveLength(2);
  });

  it("33. successful recarga — Telcel $100 MXN resolves confirmed with folio and carrier", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      const u = url.toString();
      if (u.includes("requestTXN")) return reqTxnOk("TX_RECARGA_100");
      if (u.includes("statusTXN")) {
        return new Response(
          JSON.stringify({
            success: true,
            error: 0,
            message: "Exitosa",
            data: {
              TransID: "TX_RECARGA_100",
              Fecha: "2026-05-13 10:00:00",
              Carrier: "Telcel",
              Referencia: "5215551234567",
              Folio: "RECARGA-FOLIO-100",
              Status: "Exitosa",
              Monto: "$100.00",
              Cargo: "$100.00",
              Bolsa: "Tiempo Aire",
              "Saldo Final": "$2,800.00",
            },
            extra: null,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response("{}", { status: 200 });
    });

    const result = await realPay(
      { id: "telcel_recarga_100" } as never,
      { serviceId: "telcel_recarga_100", referencia: "5215551234567", monto: 100, telefono: "5215551234567" },
    );

    expect(result.status).toBe("confirmed");
    expect(result.confirmationCode).toBe("RECARGA-FOLIO-100");
    expect(result.provider).toBe("siprel");
    const raw = result.rawResponse as Record<string, unknown>;
    expect(raw.carrier).toBe("Telcel");
    expect(raw.bolsaType).toBe("Tiempo Aire");
  });

  it("34. insufficient balance / authorizer unavailable — requestTXN error 9 throws AUTHORIZER_UNAVAILABLE", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      const u = url.toString();
      if (u.includes("requestTXN")) return reqTxnErr(9, "Autorizador no disponible");
      return new Response("{}", { status: 200 });
    });

    await expect(
      realPay(
        { id: "cfe" } as never,
        { serviceId: "cfe", referencia: "125478965412", monto: 850, telefono: "3221234567" },
      ),
    ).rejects.toThrow(/AUTHORIZER_UNAVAILABLE/i);
  });

  it("35. invalid carrier / unconfigured service — SKU_NOT_CONFIGURED thrown for unknown service id", async () => {
    // "gas_natural_norte" is not in the SKU map at all (distinct from null/SKU_PENDING)
    await expect(
      realPay(
        { id: "gas_natural_norte" } as never,
        { serviceId: "gas_natural_norte", referencia: "123456", monto: 400, telefono: "3221234567" },
      ),
    ).rejects.toThrow(/SKU_NOT_CONFIGURED/i);
  });

  it("36. requestTXN network timeout — throws with descriptive network error message", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      const u = url.toString();
      if (u.includes("requestTXN")) {
        const err = new DOMException("The operation was aborted", "AbortError");
        throw err;
      }
      return new Response("{}", { status: 200 });
    });

    await expect(
      realPay(
        { id: "telcel_recarga_50" } as never,
        { serviceId: "telcel_recarga_50", referencia: "5215559876543", monto: 50, telefono: "5215559876543" },
      ),
    ).rejects.toThrow(/network error/i);
  });

  it('32. rawResponse.transID is preserved when resolved after "Error inesperado"+"En proceso" retry', async () => {
    vi.useFakeTimers();

    let statusCallCount = 0;
    vi.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      const u = url.toString();
      if (u.includes("requestTXN")) return reqTxnOk("TX_EI_PRESERVE");
      if (u.includes("statusTXN")) {
        statusCallCount++;
        return statusCallCount === 1
          ? statusTxnErrorInesperadoEnProceso("TX_EI_PRESERVE")
          : statusTxnOk("TX_EI_PRESERVE", { Folio: "FOLIO-PRESERVE" });
      }
      return new Response("{}", { status: 200 });
    });

    const payPromise = realPay(
      { id: "cfe" } as never,
      { serviceId: "cfe", referencia: "125478965412", monto: 260, telefono: "3221234567" },
    );

    await vi.advanceTimersByTimeAsync(5_000);
    const result = await payPromise;

    expect(result.status).toBe("confirmed");
    const raw = result.rawResponse as Record<string, unknown>;
    expect(raw.transID).toBe("TX_EI_PRESERVE");
  });
});
