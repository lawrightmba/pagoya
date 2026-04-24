import { Router, type Request, type Response } from "express";
import { logger } from "../lib/logger";

const router = Router();

// ─── GET /api/hubspot/contacts/count ────────────────────────────────────────
// Calls HubSpot CRM Search API filtered to Real Estate industry contacts.
// Returns { count: number }. On failure returns { error: true, fallback: null }.
router.get("/hubspot/contacts/count", async (_req: Request, res: Response) => {
  const token = process.env.HUBSPOT_ACCESS_TOKEN;
  if (!token) {
    return res.json({ error: true, fallback: null, reason: "HUBSPOT_ACCESS_TOKEN not set" });
  }
  try {
    const r = await fetch("https://api.hubapi.com/crm/v3/objects/contacts/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({
        filterGroups: [{ filters: [{ propertyName: "industry", operator: "EQ", value: "Real Estate" }] }],
        limit: 1,
      }),
      signal: AbortSignal.timeout(8_000),
    });
    if (!r.ok) {
      logger.warn({ status: r.status }, "HubSpot contacts/count non-200");
      return res.json({ error: true, fallback: null });
    }
    const data = await r.json() as { total?: number };
    res.json({ count: data.total ?? 0 });
  } catch (err) {
    logger.error({ err }, "HubSpot contacts/count failed");
    res.json({ error: true, fallback: null });
  }
});

// ─── GET /api/mahali/stats ────────────────────────────────────────────────────
// Fetches live listing count from the Tanzania Homes Mahali API.
// Returns { listingCount: number }. On failure returns { error: true, fallback: null }.
router.get("/mahali/stats", async (_req: Request, res: Response) => {
  try {
    const r = await fetch(
      "https://tanzania-homes-lawrightmba.replit.app/api/v1/properties?limit=1",
      { signal: AbortSignal.timeout(8_000) },
    );
    if (!r.ok) {
      logger.warn({ status: r.status }, "Mahali stats non-200");
      return res.json({ error: true, fallback: null });
    }
    const data = await r.json() as { total?: number; count?: number; pagination?: { total?: number } };
    const listingCount =
      data.total ??
      data.pagination?.total ??
      data.count ??
      null;
    res.json({ listingCount });
  } catch (err) {
    logger.error({ err }, "Mahali stats fetch failed");
    res.json({ error: true, fallback: null });
  }
});

// ─── GET /api/mahali/selcom-status ────────────────────────────────────────────
// Fetches Selcom payment mode from Tanzania Homes.
// Returns { mode: "AWAITING_CREDENTIALS" | "SANDBOX" | "LIVE" }
router.get("/mahali/selcom-status", async (_req: Request, res: Response) => {
  try {
    const r = await fetch(
      "https://tanzania-homes-lawrightmba.replit.app/api/payments/status",
      { signal: AbortSignal.timeout(8_000) },
    );
    if (!r.ok) {
      logger.warn({ status: r.status }, "Mahali selcom-status non-200");
      return res.json({ error: true, fallback: null });
    }
    const data = await r.json() as { mode?: string };
    res.json({ mode: data.mode ?? "AWAITING_CREDENTIALS" });
  } catch (err) {
    logger.error({ err }, "Mahali selcom-status fetch failed");
    res.json({ error: true, fallback: null });
  }
});

// ─── GET /api/stripe/status ───────────────────────────────────────────────────
// Checks if STRIPE_SECRET_KEY is configured and confirms it works by hitting
// GET /v1/balance. Returns { live: boolean, currency: string }.
router.get("/stripe/status", async (_req: Request, res: Response) => {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    return res.json({ live: false, currency: null });
  }
  try {
    const r = await fetch("https://api.stripe.com/v1/balance", {
      headers: { "Authorization": `Bearer ${key}` },
      signal: AbortSignal.timeout(8_000),
    });
    if (!r.ok) {
      return res.json({ live: false, currency: null });
    }
    const data = await r.json() as { available?: { currency?: string }[] };
    const currency = data.available?.[0]?.currency ?? "mxn";
    res.json({ live: true, currency });
  } catch (err) {
    logger.error({ err }, "Stripe status check failed");
    res.json({ live: false, currency: null });
  }
});

export default router;
