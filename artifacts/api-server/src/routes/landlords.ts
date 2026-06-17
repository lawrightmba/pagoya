import { Router, type Request, type Response, type NextFunction } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { sendWhatsApp } from "../lib/whatsapp.js";
import { logger } from "../lib/logger.js";

const router = Router();

const adminAuth = (req: Request, res: Response, next: NextFunction): void => {
  const key = (req.headers["x-admin-key"] as string | undefined) || (req.query.adminKey as string | undefined);
  const expected = process.env.ADMIN_TOKEN ?? process.env.ADMIN_SECRET_KEY;
  if (!key || !expected || key !== expected) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
};

async function generateLandlordCode(): Promise<string> {
  const result = await db.execute(
    sql`SELECT landlord_code FROM landlords
        WHERE landlord_code ~ '^LND[0-9]+$'
        ORDER BY CAST(SUBSTRING(landlord_code FROM 4) AS INTEGER) DESC
        LIMIT 1`,
  );
  if (result.rows.length === 0) return "LND001";
  const last = (result.rows[0] as { landlord_code: string }).landlord_code;
  const num = parseInt(last.replace("LND", ""), 10);
  return "LND" + String(num + 1).padStart(3, "0");
}

// POST /api/landlords/register
router.post("/register", async (req: Request, res: Response) => {
  const { full_name, email, whatsapp, units, city, notes } = req.body as {
    full_name?: string;
    email?: string;
    whatsapp?: string;
    units?: number;
    city?: string;
    notes?: string;
  };

  if (!full_name?.trim() || !email?.trim()) {
    res.status(400).json({ error: "full_name and email are required" });
    return;
  }

  try {
    const existing = await db.execute(
      sql`SELECT id FROM landlords WHERE email = ${email.trim().toLowerCase()} LIMIT 1`,
    );
    if (existing.rows.length > 0) {
      res.status(409).json({ error: "Email already registered" });
      return;
    }

    const landlordCode = await generateLandlordCode();
    const referralLink = `https://pagoyamx.com/registro?ref=${landlordCode}`;
    const unitsVal = units ?? 1;
    const cityVal = city?.trim() || "Puerto Vallarta";

    await db.execute(
      sql`INSERT INTO landlords (landlord_code, full_name, email, whatsapp, units, city, notes, referral_link)
          VALUES (${landlordCode}, ${full_name.trim()}, ${email.trim().toLowerCase()}, ${whatsapp ?? null}, ${unitsVal}, ${cityVal}, ${notes ?? null}, ${referralLink})`,
    );

    const adminNumber = process.env.ADMIN_WHATSAPP_NUMBER;
    if (adminNumber) {
      sendWhatsApp(
        adminNumber,
        `🏠 Nuevo propietario registrado en PagoYa\nCódigo: ${landlordCode}\nNombre: ${full_name.trim()}\nEmail: ${email.trim()}\nUnidades: ${unitsVal}\nLink: ${referralLink}`,
      ).catch(() => {});
    }

    logger.info({ landlordCode, email }, "landlords: registered");
    res.status(201).json({ landlord_code: landlordCode, referral_link: referralLink, full_name: full_name.trim(), email: email.trim() });
  } catch (err) {
    logger.error({ err, email }, "landlords: register failed");
    res.status(500).json({ error: "Registration failed" });
  }
});

// GET /api/landlords (admin only) — must come before /:code
router.get("/", adminAuth, async (_req: Request, res: Response) => {
  try {
    const result = await db.execute(
      sql`SELECT * FROM landlords ORDER BY created_at DESC`,
    );
    res.json({ landlords: result.rows });
  } catch (err) {
    logger.error({ err }, "landlords: list failed");
    res.status(500).json({ error: "List failed" });
  }
});

// GET /api/landlords/:code/stats — must come before /:code
router.get("/:code/stats", async (req: Request, res: Response) => {
  const { code } = req.params;
  try {
    const landlordResult = await db.execute(
      sql`SELECT landlord_code, full_name FROM landlords WHERE landlord_code = ${code} LIMIT 1`,
    );
    if (landlordResult.rows.length === 0) {
      res.status(404).json({ error: "Landlord not found" });
      return;
    }
    const row = landlordResult.rows[0] as { landlord_code: string; full_name: string };

    const referredCount = await db.execute(
      sql`SELECT COUNT(*) as cnt FROM users WHERE referred_by_landlord = ${code}`,
    );
    const referredUsers = parseInt((referredCount.rows[0] as { cnt: string }).cnt, 10);

    const activatedCount = await db.execute(
      sql`SELECT COUNT(DISTINCT u.telefono) as cnt
          FROM users u
          INNER JOIN bill_payments bp ON bp.telefono = u.telefono AND bp.status = 'confirmed'
          WHERE u.referred_by_landlord = ${code}`,
    );
    const activatedUsers = parseInt((activatedCount.rows[0] as { cnt: string }).cnt, 10);

    res.json({
      landlord_code: row.landlord_code,
      full_name: row.full_name,
      referred_users: referredUsers,
      activated_users: activatedUsers,
      total_commission_mxn: activatedUsers * 150,
      pending_commission_mxn: activatedUsers * 150,
    });
  } catch (err) {
    logger.error({ err, code }, "landlords: stats failed");
    res.status(500).json({ error: "Stats failed" });
  }
});

// GET /api/landlords/:code
router.get("/:code", async (req: Request, res: Response) => {
  const { code } = req.params;
  try {
    const result = await db.execute(
      sql`SELECT landlord_code, full_name, email, units, referral_link, referred_users, total_commission_mxn, status, created_at
          FROM landlords WHERE landlord_code = ${code} LIMIT 1`,
    );
    if (result.rows.length === 0) {
      res.status(404).json({ error: "Landlord not found" });
      return;
    }
    res.json(result.rows[0]);
  } catch (err) {
    logger.error({ err, code }, "landlords: get failed");
    res.status(500).json({ error: "Lookup failed" });
  }
});

export default router;
