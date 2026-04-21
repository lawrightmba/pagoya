import { Router, Request, Response } from "express";
import { logger } from "../lib/logger";

const router = Router();

// Belvo Direct Debit uses a SEPARATE base URL and API keys from aggregation
const DD_BASE_URL = process.env.BELVO_DD_ENV === "production"
  ? "https://api.belvo.com"
  : "https://sandbox.belvo.com";

// Direct Debit uses api-key-id / api-key-secret headers (not Basic auth)
function ddHeaders() {
  return {
    "Content-Type": "application/json",
    "api-key-id": process.env.BELVO_DD_KEY_ID!,
    "api-key-secret": process.env.BELVO_DD_KEY_SECRET!,
  };
}

async function ddFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${DD_BASE_URL}${path}`, {
    ...options,
    headers: { ...ddHeaders(), ...(options.headers || {}) },
  });
  const text = await res.text();
  let data: any;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  if (!res.ok) throw { status: res.status, data };
  return data;
}

// ─── CUSTOMERS ──────────────────────────────────────────────────────────────

// POST /api/belvo-payments/customers
// Create a Direct Debit customer — call once per PagoYa user at onboarding
// Required: firstname, lastname, documentType (mx_curp or mx_rfc), documentNumber, email
// Optional: phone
router.post("/customers", async (req: Request, res: Response) => {
  try {
    const { firstname, lastname, documentType, documentNumber, email, phone } = req.body;
    if (!firstname || !lastname || !documentType || !documentNumber || !email) {
      return res.status(400).json({ error: "firstname, lastname, documentType, documentNumber, email are required" });
    }
    const payload: any = { firstname, lastname, documentType, documentNumber, email };
    if (phone) payload.phone = phone;

    const data = await ddFetch("/customers", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    logger.info({ customerId: data.customerId }, "Belvo DD customer created");
    res.json({ customerId: data.customerId });
  } catch (err: any) {
    logger.error({ err }, "Belvo DD customer creation failed");
    res.status(err.status || 500).json({ error: "Could not create customer", detail: err.data });
  }
});

// GET /api/belvo-payments/customers/:customerId
// Get details for an existing customer
router.get("/customers/:customerId", async (req: Request, res: Response) => {
  try {
    const data = await ddFetch(`/customers/${req.params.customerId}`);
    res.json(data);
  } catch (err: any) {
    res.status(err.status || 500).json({ error: "Could not fetch customer", detail: err.data });
  }
});

// ─── PAYMENT METHODS ────────────────────────────────────────────────────────

// POST /api/belvo-payments/payment-methods
// Register a bank account for a customer — their CLABE or debit card
// accountType: "savings" | "checkings" | "debit_card"
// bank: Belvo institution code e.g. "mx_bbva", "mx_banamex", "mx_santander"
// accountNumber: CLABE (18 digits) or debit card number (16 digits)
router.post("/payment-methods", async (req: Request, res: Response) => {
  try {
    const { customerId, accountType, accountNumber, bank, reference } = req.body;
    if (!customerId || !accountType || !accountNumber || !bank) {
      return res.status(400).json({ error: "customerId, accountType, accountNumber, bank are required" });
    }
    const payload: any = { customerId, accountType, accountNumber, bank };
    if (reference) payload.reference = reference;

    const data = await ddFetch("/payment_methods/bank_accounts", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    logger.info({ paymentMethodId: data.paymentMethodId, customerId }, "Belvo DD payment method created");
    res.json({ paymentMethodId: data.paymentMethodId });
  } catch (err: any) {
    logger.error({ err }, "Belvo DD payment method creation failed");
    res.status(err.status || 500).json({ error: "Could not create payment method", detail: err.data });
  }
});

// GET /api/belvo-payments/payment-methods/:paymentMethodId
// Get status of a payment method — check if it's "active" before charging
router.get("/payment-methods/:paymentMethodId", async (req: Request, res: Response) => {
  try {
    const data = await ddFetch(`/payment_methods/${req.params.paymentMethodId}`);
    res.json(data);
  } catch (err: any) {
    res.status(err.status || 500).json({ error: "Could not fetch payment method", detail: err.data });
  }
});

// ─── CONSENTS ───────────────────────────────────────────────────────────────

// POST /api/belvo-payments/consents
// Initialize a consent record for a payment method
// Must be done before any payment requests can be processed
// After creating, upload files via /consents/:consentId/files
router.post("/consents", async (req: Request, res: Response) => {
  try {
    const { paymentMethodId } = req.body;
    if (!paymentMethodId) {
      return res.status(400).json({ error: "paymentMethodId is required" });
    }
    const data = await ddFetch("/consents", {
      method: "POST",
      body: JSON.stringify({ paymentMethodId }),
    });
    logger.info({ consentId: data.consentId, paymentMethodId }, "Belvo DD consent initialized");
    res.json({ consentId: data.consentId, status: data.status });
  } catch (err: any) {
    logger.error({ err }, "Belvo DD consent creation failed");
    res.status(err.status || 500).json({ error: "Could not create consent", detail: err.data });
  }
});

// GET /api/belvo-payments/consents/:consentId
// Poll consent status — awaiting_information | submitted | confirmed | rejected
// Payment requests are only allowed when status = "confirmed"
router.get("/consents/:consentId", async (req: Request, res: Response) => {
  try {
    const data = await ddFetch(`/consents/${req.params.consentId}`);
    res.json({
      consentId: data.consentId,
      status: data.status,
      paymentMethodId: data.paymentMethodId,
      isBankNotified: data.isBankNotified,
      canCharge: data.status === "confirmed",
    });
  } catch (err: any) {
    res.status(err.status || 500).json({ error: "Could not fetch consent", detail: err.data });
  }
});

// POST /api/belvo-payments/consents/:consentId/files
// Upload consent documents: id_front, id_back, selfie, contract
// Accepts multipart/form-data — pipe directly from your frontend upload form
// After upload, Belvo reviews in 1-2 business days and updates status to confirmed/rejected
import multer from "multer";
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

router.post(
  "/consents/:consentId/files",
  upload.fields([
    { name: "id_front", maxCount: 1 },
    { name: "id_back", maxCount: 1 },
    { name: "selfie", maxCount: 1 },
    { name: "contract", maxCount: 1 },
  ]),
  async (req: Request, res: Response) => {
    try {
      const { consentId } = req.params;
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };

      if (!files.id_front || !files.id_back || !files.selfie || !files.contract) {
        return res.status(400).json({ error: "id_front, id_back, selfie, and contract files are all required" });
      }

      // Build FormData to forward to Belvo
      const { FormData, Blob } = await import("node:buffer") as any;
      const form = new FormData();
      for (const field of ["id_front", "id_back", "selfie", "contract"]) {
        const file = files[field][0];
        form.append(field, new Blob([file.buffer], { type: file.mimetype }), file.originalname);
      }

      const res2 = await fetch(`${DD_BASE_URL}/consents/${consentId}/files`, {
        method: "POST",
        headers: {
          "api-key-id": process.env.BELVO_DD_KEY_ID!,
          "api-key-secret": process.env.BELVO_DD_KEY_SECRET!,
        },
        body: form,
      });
      const data = await res2.json();
      if (!res2.ok) throw { status: res2.status, data };

      logger.info({ consentId }, "Belvo DD consent files uploaded");
      res.json({ success: true, files: data });
    } catch (err: any) {
      logger.error({ err }, "Belvo DD consent file upload failed");
      res.status(err.status || 500).json({ error: "Could not upload consent files", detail: err.data });
    }
  }
);

// ─── PAYMENT REQUESTS ───────────────────────────────────────────────────────

// POST /api/belvo-payments/payment-requests
// The actual charge — debit funds from a user's account
// Requires consent status = "confirmed" first
// amount is in CENTAVOS (integer) — e.g. 5000.00 MXN = "500000"
// reference appears on the user's bank statement — use "Renta Enero 2026" etc.
router.post("/payment-requests", async (req: Request, res: Response) => {
  try {
    const { paymentMethodId, amount, currency, reference } = req.body;
    if (!paymentMethodId || !amount || !currency || !reference) {
      return res.status(400).json({ error: "paymentMethodId, amount, currency, reference are required" });
    }
    const data = await ddFetch("/payment_requests", {
      method: "POST",
      body: JSON.stringify({ paymentMethodId, currency, amount: String(amount), reference }),
    });
    logger.info({ paymentRequestId: data.paymentRequestId, paymentMethodId, amount }, "Belvo DD payment request created");
    res.json({ paymentRequestId: data.paymentRequestId });
  } catch (err: any) {
    logger.error({ err }, "Belvo DD payment request failed");
    res.status(err.status || 500).json({ error: "Could not create payment request", detail: err.data });
  }
});

// GET /api/belvo-payments/payment-requests/:paymentRequestId
// Poll payment request status
// initial → processing → successful | failed
router.get("/payment-requests/:paymentRequestId", async (req: Request, res: Response) => {
  try {
    const data = await ddFetch(`/payment_requests/${req.params.paymentRequestId}`);
    res.json({
      paymentRequestId: data.paymentRequestId,
      status: data.status,
      amount: data.amount,
      currency: data.currency,
      reference: data.reference,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  } catch (err: any) {
    res.status(err.status || 500).json({ error: "Could not fetch payment request", detail: err.data });
  }
});

// ─── WEBHOOK RECEIVER ───────────────────────────────────────────────────────

// POST /api/belvo-payments/webhook
// Belvo fires this when payment method is registered or payment request completes
// Set this URL in your Belvo dashboard under Webhooks
// Two key events:
//   payment_method_registration_successful — payment method is active, can now charge
//   payment_request_successful — funds debited, update your DB to mark payment confirmed
router.post("/webhook", async (req: Request, res: Response) => {
  try {
    const event = req.body;
    const eventType = event?.event_type || event?.type;
    logger.info({ eventType, payload: event }, "Belvo DD webhook received");

    if (eventType === "payment_method_registration_successful") {
      const { paymentMethodId } = event;
      logger.info({ paymentMethodId }, "Payment method registered — ready to charge");
      // TODO: update belvo_payment_methods table status = 'active' where paymentMethodId matches
    }

    if (eventType === "payment_request_successful") {
      const { paymentRequestId, paymentMethodId, amount } = event;
      logger.info({ paymentRequestId, paymentMethodId, amount }, "Payment request successful — funds debited");
      // TODO: update payment_records table status = 'confirmed' where paymentRequestId matches
      // TODO: send Twilio WhatsApp confirmation to landlord and tenant
    }

    if (eventType === "payment_request_failed") {
      const { paymentRequestId, reason } = event;
      logger.warn({ paymentRequestId, reason }, "Payment request failed");
      // TODO: update payment_records table status = 'failed'
      // TODO: send Twilio WhatsApp failure alert
    }

    res.json({ received: true });
  } catch (err) {
    logger.error({ err }, "Belvo DD webhook processing error");
    res.status(500).json({ error: "Webhook processing failed" });
  }
});

// ─── MOVEMENTS (ACCOUNT ACTIVITY) ───────────────────────────────────────────

// GET /api/belvo-payments/movements
// List all transactions in your Belvo Direct Debit account
// Use for reconciliation and the command center dashboard
router.get("/movements", async (req: Request, res: Response) => {
  try {
    const params = new URLSearchParams();
    if (req.query.from) params.append("createdAt[gte]", String(req.query.from));
    if (req.query.to) params.append("createdAt[lte]", String(req.query.to));
    const data = await ddFetch(`/movements?${params.toString()}`);
    res.json(data);
  } catch (err: any) {
    res.status(err.status || 500).json({ error: "Could not fetch movements", detail: err.data });
  }
});

export { router as belvoPaymentsRouter };
