import type { ProviderAdapter, BillService, BillPayRequest, BillPayResult } from "../types/billpay.js";
import { logger } from "../../lib/logger.js";
import { sendWhatsApp } from "../../lib/whatsapp.js";
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
  // Accept SIPREL_PIN (new canonical name) or SIPREL_NIP (legacy alias)
  const nip = process.env.SIPREL_PIN ?? process.env.SIPREL_NIP ?? "";
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
  // — Bill Payments (confirmed SKUs) ——
  izzi:              { sku: "IZZ000", bolsa: "pagoServicios" },
  totalplay:         { sku: "TOT000", bolsa: "pagoServicios" },
  gas_natural:       { sku: "GAS000",   bolsa: "pagoServicios" },
  // — Gas (additional providers) ——
  ecogas:            { sku: "ECO000",   bolsa: "pagoServicios" },
  mexicana_gas:      { sku: "MGAS01",   bolsa: "pagoServicios" },
  naturgy:           { sku: "NAT001",   bolsa: "pagoServicios" },
  // — Mobile bills ——
  movistar:          { sku: "MOF000",   bolsa: "pagoServicios" },
  // — Water Utilities ——
  sacmex:            { sku: "SACMEX01", bolsa: "pagoServicios" },
  agua_jalisco:      { sku: "SIA000",   bolsa: "pagoServicios" },
  seapal:            { sku: "SEAPAL01", bolsa: "pagoServicios" },
  // — Housing ——
  infonavit:         { sku: "INF000",   bolsa: "pagoServicios" },
  // — Gift Cards (Pago de Servicios bolsa, fixed-denomination) ——
  netflix_300:       { sku: "NET300",      bolsa: "pagoServicios" },
  netflix_400:       { sku: "NET150",      bolsa: "pagoServicios" },
  netflix_500:       { sku: "NET500",      bolsa: "pagoServicios" },
  netflix_700:       { sku: "NET700",      bolsa: "pagoServicios" },
  amazon_100:        { sku: "AGC100",      bolsa: "pagoServicios" },
  amazon_200:        { sku: "AGC200",      bolsa: "pagoServicios" },
  amazon_300:        { sku: "AGC300",      bolsa: "pagoServicios" },
  amazon_500:        { sku: "AGC500",      bolsa: "pagoServicios" },
  amazon_1000:       { sku: "AGC1000",     bolsa: "pagoServicios" },
  google_play_50:    { sku: "GPLAY50",     bolsa: "pagoServicios" },
  google_play_100:   { sku: "GOO01",       bolsa: "pagoServicios" },
  google_play_200:   { sku: "GOO03",       bolsa: "pagoServicios" },
  google_play_300:   { sku: "GOO02",       bolsa: "pagoServicios" },
  google_play_500:   { sku: "GOO500",      bolsa: "pagoServicios" },
  uber_150:          { sku: "UBR150",      bolsa: "pagoServicios" },
  uber_eats_300:     { sku: "EATS02",      bolsa: "pagoServicios" },
  cinepolis_60:      { sku: "CINBS52",     bolsa: "pagoServicios" },
  cinepolis_100:     { sku: "CCM075",      bolsa: "pagoServicios" },
  cinepolis_140:     { sku: "CINVIP1B",    bolsa: "pagoServicios" },
  cinepolis_210:     { sku: "CIN3DIMAX2",  bolsa: "pagoServicios" },
  starbucks_200:     { sku: "STRBKS0200",  bolsa: "pagoServicios" },
  starbucks_300:     { sku: "STRBKS0300",  bolsa: "pagoServicios" },
  liverpool_500:     { sku: "LIVEMEX500",  bolsa: "pagoServicios" },
  liverpool_1000:    { sku: "LIVEMEX1000", bolsa: "pagoServicios" },
  liverpool_2000:    { sku: "LIVEMEX2000", bolsa: "pagoServicios" },
  soriana_500:       { sku: "SORIANA500",  bolsa: "pagoServicios" },
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
  3129: "TRANSACTION_TABLE_FULL",
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
  timeoutMs = 20_000,  // requestTXN: 20 s; statusTXN: 20 s (sandbox can take up to 15 s)
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
    signal: AbortSignal.timeout(timeoutMs),
  });

  logger.info({ endpoint, status: response.status }, "taecel: response received");

  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Taecel HTTP ${response.status}: ${text}`);
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`Taecel non-JSON response: ${text.slice(0, 200)}`);
  }
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
// Per Taecel support guidance — three response types:
//   Type 1 { success: true, ... }                → stop, confirmed success
//   Type 2 { success: false, error: N (N≠0), … } → stop, confirmed failure
//   Type 3 anything else (parse error, timeout,
//           HTTP error, "En Proceso", error: 0)   → DO NOT abort, sleep & retry
//
//   • Total cycle timeout : 60 s from requestTXN
//   • Per-call timeout    : 5 s per statusTXN call
//   • Sleep between polls : 3 s
async function pollStatusTXN(
  config: TaecelConfig,
  transID: string,
  startedAt: number,
): Promise<{ timedOut: boolean; data?: TaecelStatusData; raw?: TaecelStatusTXNResponse }> {
  const CYCLE_TIMEOUT_MS    = 60_000;  // total from requestTXN call
  const STATUS_CALL_TIMEOUT = 5_000;   // per individual statusTXN HTTP call
  const POLL_INTERVAL_MS    = 3_000;   // sleep between attempts (Type 3 retry)

  while (true) {
    const elapsed = Date.now() - startedAt;
    if (elapsed >= CYCLE_TIMEOUT_MS) {
      logger.warn({ transID, elapsedMs: elapsed }, "taecel: statusTXN polling timed out — 60 s cycle elapsed");
      return { timedOut: true };
    }

    // Attempt statusTXN — wrap in try/catch so Type 3 network/parse errors retry
    let res: TaecelStatusTXNResponse;
    try {
      res = await taecelPost<TaecelStatusTXNResponse>("statusTXN", config, { transID }, STATUS_CALL_TIMEOUT);
    } catch (callErr) {
      // Type 3: network timeout, HTTP error, or non-JSON body — sleep and retry
      const msg = callErr instanceof Error ? callErr.message : String(callErr);
      logger.warn({ transID, error: msg }, "taecel: statusTXN Type 3 (call error) — retrying");
      await new Promise<void>((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      continue;
    }

    logger.info({ transID, success: res.success, error: res.error, message: res.message }, "taecel: statusTXN poll");

    // Type 1: valid success
    // Guard: success:true + message:"Error inesperado" + data.Status:"En proceso" is a
    // transient state meaning the transaction is still being processed by the carrier.
    // It must NOT be resolved as confirmed — treat it as Type 3 and keep polling.
    if (res.success === true && !Array.isArray(res.data)) {
      const d = res.data as TaecelStatusData;
      const statusField = (d.Status ?? "").trim();
      if (res.message === "Error inesperado" && statusField === "En proceso") {
        logger.info(
          { transID, message: res.message, status: statusField },
          "taecel: statusTXN 'Error inesperado'+'En proceso' — transient state, continuing poll",
        );
        await new Promise<void>((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
        continue;
      }
      return { timedOut: false, data: d, raw: res };
    }

    // Type 2: valid failure — non-zero error code, stop immediately
    if (res.error !== undefined && res.error !== 0) {
      logger.warn({ transID, error: res.error, message: res.message }, "taecel: statusTXN Type 2 (error) — stopping poll");
      return { timedOut: false, data: undefined, raw: res };
    }

    // Type 3: "En Proceso", success:false with error 0, or unrecognised — sleep and retry
    logger.info({ transID, message: res.message }, "taecel: statusTXN Type 3 (en proceso) — retrying");
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
  await sendWhatsApp(adminNumber, `⚠️ *PagoYa Admin Alert*\n${message}`).catch(() => {});
}

// ─── PROVIDER ADAPTER ────────────────────────────────────────────────────────
export const siprelProvider: ProviderAdapter = {
  name: "siprel",

  isAvailable(): boolean {
    // SIPREL_BASE_URL is optional — falls back to the default Taecel endpoint
    return !!(
      process.env.SIPREL_API_KEY &&
      (process.env.SIPREL_PIN ?? process.env.SIPREL_NIP)
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

  async getCatalog(): Promise<unknown> {
    const config = getConfig();
    return getProducts(config);
  },

  async getTransactionStatus(transID: string): Promise<unknown> {
    const config = getConfig();
    const res = await taecelPost<TaecelStatusTXNResponse>("statusTXN", config, { transID });
    return res;
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

// ─── GIFT CARD SKU AVAILABILITY PRE-CHECK ────────────────────────────────────
// Uses the 24h-cached getProducts response to verify a SKU appears in the active
// product catalog before any charge is initiated. Fails OPEN — returns
// { available: true } on any error so a network hiccup never blocks users.
export async function taecelCheckSkuAvailability(
  sku: string,
): Promise<{ available: boolean; stock?: number }> {
  try {
    const config = getConfig();
    const products = await getProducts(config);

    if (!Array.isArray(products)) {
      return { available: true }; // unexpected format — fail open
    }

    const list = products as Record<string, unknown>[];
    const product = list.find(
      (p) =>
        String(p.IdProducto ?? p.idProducto ?? p.Sku ?? p.sku ?? "")
          .trim()
          .toUpperCase() === sku.trim().toUpperCase(),
    );

    if (!product) {
      // SKU absent from active catalog — treat as unavailable
      return { available: false, stock: 0 };
    }

    // Taecel responses may include Cantidad (unit count) or Disponible (0/1 flag)
    const cantidadRaw = product.Cantidad ?? product.cantidad ?? product.Stock ?? product.stock;
    const disponibleRaw = product.Disponible ?? product.disponible ?? product.Available ?? product.available;

    if (cantidadRaw !== undefined) {
      const count = parseInt(String(cantidadRaw), 10);
      if (!isNaN(count)) return { available: count > 0, stock: count };
    }
    if (disponibleRaw !== undefined) {
      const avail = parseInt(String(disponibleRaw), 10);
      return { available: avail !== 0 };
    }

    return { available: true }; // field absent — fail open
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[GiftCard] Pre-check failed for SKU ${sku}: ${msg}`);
    return { available: true }; // fail open
  }
}

// ─── POST-FULFILLMENT LOW-STOCK ALERT ────────────────────────────────────────
// Call after every successful gift card fulfillment. Fetches a LIVE (non-cached)
// product list, checks remaining stock for the fulfilled SKU, and fires a
// WhatsApp admin alert if stock < 5 units. Fully non-blocking — never throws.
export async function taecelCheckStockAndAlert(
  sku: string,
  skuName: string,
  denomination: number,
): Promise<void> {
  try {
    const config = getConfig();
    // Bypass the 24h cache to get current inventory figures
    const res = await taecelPost<TaecelProductsResponse>("getProducts", config, {}, 10_000);
    const products = res.data;

    if (!Array.isArray(products)) return;

    const list = products as Record<string, unknown>[];
    const product = list.find(
      (p) =>
        String(p.IdProducto ?? p.idProducto ?? p.Sku ?? p.sku ?? "")
          .trim()
          .toUpperCase() === sku.trim().toUpperCase(),
    );

    if (!product) return;

    const cantidadRaw = product.Cantidad ?? product.cantidad ?? product.Stock ?? product.stock;
    if (cantidadRaw === undefined) return;

    const count = parseInt(String(cantidadRaw), 10);
    if (isNaN(count)) return;

    logger.info({ sku, skuName, denomination, stock: count }, "taecel: post-fulfillment stock check");

    if (count < 5) {
      await fireAdminAlert(
        `Inventario bajo para ${skuName} $${denomination} MXN. Quedan ${count} unidades. Recargar saldo Taecel si es necesario.`,
      );
      logger.warn({ sku, skuName, denomination, stock: count }, "taecel: low stock alert sent to admin");
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.warn({ sku, skuName, denomination, error: msg }, "taecel: post-fulfillment stock check failed (non-fatal)");
  }
}
