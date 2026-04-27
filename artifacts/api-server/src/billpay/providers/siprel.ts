import type { ProviderAdapter, BillService, BillPayRequest, BillPayResult } from "../types/billpay.js";
import { logger } from "../../lib/logger.js";
import { db } from "@workspace/db";
import { taecelProductCacheTable } from "@workspace/db";
import { desc } from "drizzle-orm";

// ─── CONFIG ──────────────────────────────────────────────────────────────────
interface TaecelConfig {
  baseUrl: string;
  apiKey: string;
  nip: string;
}

function getConfig(): TaecelConfig {
  const baseUrl = process.env.SIPREL_BASE_URL ?? "https://app.taecel.com/api/";
  const apiKey = process.env.SIPREL_API_KEY ?? "";
  const nip = process.env.SIPREL_NIP ?? "";
  return { baseUrl, apiKey, nip };
}

// ─── CONFIRMED SKU MAP ───────────────────────────────────────────────────────
// Bill payments (Pago de Servicios) — include monto in requestTXN
// Top-ups (Tiempo Aire) — omit monto in requestTXN
type SkuEntry = { sku: string; bolsa: "pagoServicios" | "tiempoAire" };

const SIPREL_SKU_MAP: Record<string, SkuEntry | null> = {
  // — Bill Payments ——
  cfe:               { sku: "CFE000", bolsa: "pagoServicios" },
  telmex:            { sku: "TMX001", bolsa: "pagoServicios" },
  telmex_fijo:       { sku: "TMX001", bolsa: "pagoServicios" },
  sky:               { sku: "SKY000", bolsa: "pagoServicios" },
  megacable:         { sku: "MEG000", bolsa: "pagoServicios" },
  dish:              { sku: "DSH000", bolsa: "pagoServicios" },
  maxcom:            { sku: "MAX000", bolsa: "pagoServicios" },
  // — Mobile Top-ups (Telcel) ——
  telcel_recarga_10:  { sku: "TEL010", bolsa: "tiempoAire" },
  telcel_recarga_50:  { sku: "TEL050", bolsa: "tiempoAire" },
  telcel_recarga_100: { sku: "TEL100", bolsa: "tiempoAire" },
  telcel_recarga_150: { sku: "TEL150", bolsa: "tiempoAire" },
  telcel_recarga_200: { sku: "TEL200", bolsa: "tiempoAire" },
  // — Mobile Top-ups (AT&T) ——
  att_recarga_10:    { sku: "MOV010", bolsa: "tiempoAire" },
  att_recarga_50:    { sku: "MOV050", bolsa: "tiempoAire" },
  att_recarga_100:   { sku: "MOV100", bolsa: "tiempoAire" },
  att_recarga_120:   { sku: "MOV120", bolsa: "tiempoAire" },
  att_recarga_150:   { sku: "MOV150", bolsa: "tiempoAire" },
  // — SKU_PENDING (pending confirmation from Taecel) ——
  izzi:              null,
  totalplay:         null,
  gas_natural:       null,
};

// ─── TAECEL API RESPONSE TYPES ───────────────────────────────────────────────
interface TaecelRequestTXNResponse {
  success: boolean;
  error: number;
  message: string;
  data: { transID?: string; fecha?: string } | unknown[];
  extra: null | unknown;
}

interface TaecelStatusData {
  TransID?: string;
  Fecha?: string;
  Carrier?: string;
  Referencia?: string;
  Folio?: string;
  Status?: string;
  Monto?: string;
  Cargo?: string;
  Bolsa?: string;
  "Saldo Final"?: string;
}

interface TaecelStatusTXNResponse {
  success: boolean;
  error: number;
  message: string;
  data: TaecelStatusData | unknown[];
  extra: null | unknown;
}

interface TaecelBalanceItem {
  ID: string;
  Bolsa: string;
  Saldo: string;
}

interface TaecelBalanceResponse {
  success?: boolean;
  data: TaecelBalanceItem[];
}

interface TaecelProductsResponse {
  success?: boolean;
  data: unknown;
}

interface TaecelSalesResponse {
  success?: boolean;
  data: unknown;
}

// ─── ERROR CODE MAP ───────────────────────────────────────────────────────────
const PROVIDER_ERROR_CODES: Record<number, string> = {
  1: "INVALID_PHONE",
  2: "DESTINATION_UNAVAILABLE",
  3: "NO_CARRIER_RESPONSE",
  4: "INACTIVE_LINE",
  5: "NO_CARRIER_RESPONSE",
  6: "NO_CARRIER_RESPONSE",
  7: "TRANSACTION_TABLE_FULL",
  8: "INTERNAL_TIMEOUT",
  9: "AUTHORIZER_UNAVAILABLE",
};

const SERVICE_WEB_ERROR_CODES: Record<number, string> = {
  0:    "SUCCESS",
  403:  "INVALID_CREDENTIALS",
  405:  "INCORRECT_PARAMS",
  3133: "PRODUCT_NOT_FOUND",
  8888: "COMMUNICATION_ERROR",
};

// ─── HTTP HELPER ─────────────────────────────────────────────────────────────
async function taecelPost<T>(
  endpoint: string,
  config: TaecelConfig,
  extraParams: Record<string, string> = {},
): Promise<T> {
  const body = new URLSearchParams({
    key: config.apiKey,
    nip: config.nip,
    ...extraParams,
  });

  const url = `${config.baseUrl}${endpoint}`;
  logger.info({ method: "POST", url, endpoint }, "taecel: sending request");

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
    signal: AbortSignal.timeout(15_000),
  });

  logger.info({ endpoint, status: response.status }, "taecel: response received");

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Taecel HTTP ${response.status}: ${text}`);
  }

  return response.json() as Promise<T>;
}

// ─── METHOD 1: requestTXN ─────────────────────────────────────────────────────
async function requestTXN(
  config: TaecelConfig,
  params: { producto: string; referencia: string; monto?: string },
): Promise<TaecelRequestTXNResponse> {
  const extra: Record<string, string> = {
    producto: params.producto,
    referencia: params.referencia,
  };
  if (params.monto !== undefined) extra.monto = params.monto;

  const res = await taecelPost<TaecelRequestTXNResponse>("requestTXN", config, extra);
  logger.info({ success: res.success, error: res.error, message: res.message }, "taecel: requestTXN result");
  return res;
}

// ─── METHOD 2: statusTXN with polling loop ────────────────────────────────────
async function pollStatusTXN(
  config: TaecelConfig,
  transID: string,
  startedAt: number,
): Promise<{ timedOut: boolean; data?: TaecelStatusData; raw?: TaecelStatusTXNResponse }> {
  const TIMEOUT_MS = 60_000;
  const POLL_INTERVAL_MS = 5_000;

  while (true) {
    const elapsed = Date.now() - startedAt;
    if (elapsed >= TIMEOUT_MS) {
      logger.warn({ transID, elapsedMs: elapsed }, "taecel: statusTXN polling timed out after 60s");
      return { timedOut: true };
    }

    const res = await taecelPost<TaecelStatusTXNResponse>("statusTXN", config, { transID });
    logger.info({ transID, success: res.success, error: res.error, message: res.message }, "taecel: statusTXN poll");

    if (res.success === true && !Array.isArray(res.data)) {
      return { timedOut: false, data: res.data as TaecelStatusData, raw: res };
    }

    // "En Proceso" — saldo charged, keep polling
    if (res.message?.includes("En Proceso") || res.message?.includes("Proceso")) {
      logger.info({ transID }, "taecel: transaction en proceso — continuing poll");
    }

    // Wait before next poll
    await new Promise<void>((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

// ─── METHOD 3: getBalance ─────────────────────────────────────────────────────
async function getBalance(config: TaecelConfig): Promise<{ tiempoAire: number; pagoServicios: number }> {
  const res = await taecelPost<TaecelBalanceResponse>("getBalance", config);
  logger.info({ data: res.data }, "taecel: getBalance response");

  let tiempoAire = 0;
  let pagoServicios = 0;

  if (Array.isArray(res.data)) {
    for (const item of res.data) {
      const saldo = parseFloat(String(item.Saldo ?? "0").replace(/,/g, ""));
      const bolsaName = String(item.Bolsa ?? "").toLowerCase();
      if (bolsaName.includes("tiempo")) {
        tiempoAire = saldo;
      } else if (bolsaName.includes("pago") || bolsaName.includes("servicio")) {
        pagoServicios = saldo;
      }
    }
  }

  return { tiempoAire, pagoServicios };
}

// ─── METHOD 4: getProducts (24-hour cache) ────────────────────────────────────
async function getProducts(config: TaecelConfig): Promise<unknown> {
  // 1. Check DB cache — if fresh (< 24 hours) return cached data
  try {
    const [cached] = await db
      .select()
      .from(taecelProductCacheTable)
      .orderBy(desc(taecelProductCacheTable.cachedAt))
      .limit(1);

    if (cached && cached.expiresAt > new Date()) {
      logger.info({ cachedAt: cached.cachedAt }, "taecel: getProducts returning cached data");
      return JSON.parse(cached.data);
    }
  } catch (dbErr) {
    logger.warn({ dbErr }, "taecel: cache read failed — fetching live");
  }

  // 2. Cache stale or missing — call API
  const res = await taecelPost<TaecelProductsResponse>("getProducts", config);
  logger.info("taecel: getProducts live fetch complete");

  // 3. Store in cache
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  try {
    await db.insert(taecelProductCacheTable).values({
      cachedAt: now,
      expiresAt,
      data: JSON.stringify(res.data),
    });
  } catch (dbErr) {
    logger.warn({ dbErr }, "taecel: cache write failed — proceeding without cache");
  }

  return res.data;
}

// ─── METHOD 5: getSales (reconciliation) ────────────────────────────────────
async function getSales(config: TaecelConfig, fecha: string): Promise<unknown> {
  const res = await taecelPost<TaecelSalesResponse>("getSales", config, { fecha });
  logger.info({ fecha }, "taecel: getSales fetched");
  return res.data;
}

// ─── ADMIN ALERT ─────────────────────────────────────────────────────────────
async function fireAdminAlert(message: string): Promise<void> {
  const adminNumber = process.env.ADMIN_WHATSAPP_NUMBER;
  if (!adminNumber) return;
  const encoded = encodeURIComponent(`⚠️ *PagoYa Admin Alert*\n${message}`);
  try {
    await fetch(`https://wa.me/${adminNumber.replace(/\D/g, "")}?text=${encoded}`, {
      method: "GET",
      signal: AbortSignal.timeout(4_000),
    });
  } catch {
    // non-fatal
  }
}

// ─── PROVIDER ADAPTER ────────────────────────────────────────────────────────
export const siprelProvider: ProviderAdapter = {
  name: "siprel",

  isAvailable(): boolean {
    return !!(
      process.env.SIPREL_API_KEY &&
      process.env.SIPREL_NIP &&
      process.env.SIPREL_BASE_URL
    );
  },

  async pay(service: BillService, req: BillPayRequest): Promise<BillPayResult> {
    const config = getConfig();

    // 1. Look up SKU
    const skuEntry = SIPREL_SKU_MAP[service.id] ?? null;
    if (skuEntry === null || skuEntry === undefined) {
      const isPending = service.id in SIPREL_SKU_MAP && SIPREL_SKU_MAP[service.id] === null;
      const code = isPending ? "SKU_PENDING" : "SKU_NOT_CONFIGURED";
      throw new Error(`${code}: No SKU configurado para servicio "${service.id}"`);
    }

    const { sku, bolsa } = skuEntry;
    const isTopup = bolsa === "tiempoAire";

    // 2. Call requestTXN
    const startedAt = Date.now();
    let txnResponse: TaecelRequestTXNResponse;
    try {
      txnResponse = await requestTXN(config, {
        producto: sku,
        referencia: req.referencia,
        monto: isTopup ? undefined : String(Math.round(req.monto)),
      });
    } catch (fetchErr: unknown) {
      throw new Error(`Taecel requestTXN network error: ${fetchErr instanceof Error ? fetchErr.message : String(fetchErr)}`);
    }

    // 3. requestTXN failed — map error code, return immediately
    if (!txnResponse.success) {
      const code = txnResponse.error;
      const codeLabel = SERVICE_WEB_ERROR_CODES[code] ?? PROVIDER_ERROR_CODES[code] ?? `ERROR_${code}`;

      if (code === 403) {
        await fireAdminAlert(`SIPREL credentials inválidas (error 403) — acción urgente requerida`);
      }

      throw new Error(`Taecel requestTXN failed [${codeLabel}]: ${txnResponse.message}`);
    }

    // 4. Extract transID
    const txnData = txnResponse.data as { transID?: string; fecha?: string };
    const transID = txnData?.transID;
    if (!transID) {
      throw new Error("Taecel requestTXN succeeded but returned no transID");
    }

    logger.info({ transID, serviceId: service.id }, "taecel: transaction initiated — starting statusTXN poll");

    // 5. Poll statusTXN
    const pollResult = await pollStatusTXN(config, transID, startedAt);

    // 7. Timeout — return pending
    if (pollResult.timedOut) {
      return {
        success: true,
        confirmationCode: transID,
        provider: "siprel",
        timestamp: new Date().toISOString(),
        failoverUsed: false,
        status: "pending",
        rawResponse: { transID, bolsaType: bolsa, timedOut: true },
      };
    }

    // 8. statusTXN returned failure
    const statusData = pollResult.data!;
    if (pollResult.raw && !pollResult.raw.success) {
      const code = pollResult.raw.error;
      const codeLabel = SERVICE_WEB_ERROR_CODES[code] ?? PROVIDER_ERROR_CODES[code] ?? `ERROR_${code}`;
      if (code === 3133) {
        getProducts(config).catch(() => {});
      }
      throw new Error(`Taecel statusTXN failed [${codeLabel}]: ${pollResult.raw.message}`);
    }

    // 6. statusTXN success
    const folio = statusData.Folio ?? transID;
    const carrier = statusData.Carrier ?? "";
    const cargoStr = statusData.Cargo ?? "$0.00";
    const cargoMxn = parseFloat(cargoStr.replace(/[$,]/g, "")) || 0;

    logger.info({ transID, folio, carrier, bolsa }, "taecel: payment confirmed");

    return {
      success: true,
      confirmationCode: folio,
      provider: "siprel",
      timestamp: new Date().toISOString(),
      failoverUsed: false,
      status: "confirmed",
      rawResponse: {
        transID,
        folio,
        carrier,
        cargoMxn,
        bolsaType: statusData.Bolsa ?? bolsa,
        statusRaw: statusData,
      },
    };
  },

  async getSaldoBalance(): Promise<{ tiempoAire: number; pagoServicios: number }> {
    const config = getConfig();
    return getBalance(config);
  },
};

// ─── EXPORTED UTILITIES (used by crons & admin routes) ──────────────────────
export async function taecelGetBalance(): Promise<{ tiempoAire: number; pagoServicios: number }> {
  return getBalance(getConfig());
}

export async function taecelGetProducts(): Promise<unknown> {
  return getProducts(getConfig());
}

export async function taecelGetSales(fecha: string): Promise<unknown> {
  return getSales(getConfig(), fecha);
}

export async function taecelStatusTXN(transID: string): Promise<TaecelStatusTXNResponse> {
  return taecelPost<TaecelStatusTXNResponse>("statusTXN", getConfig(), { transID });
}
