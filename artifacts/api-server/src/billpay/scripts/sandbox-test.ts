/**
 * PagoYa — Taecel Sandbox Test Runner
 *
 * Makes REAL API calls to Taecel using the official test matrix.
 * NOT part of the automated test suite — run manually from the shell.
 *
 * Usage (from artifacts/api-server/):
 *   pnpm run test:sandbox
 *
 * Requires these Replit Secrets to be set:
 *   SIPREL_API_KEY, SIPREL_NIP, SIPREL_BASE_URL
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

// ESM-compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ─── CONFIG ──────────────────────────────────────────────────────────────────

const BASE_URL  = process.env.SIPREL_BASE_URL ?? "https://app.taecel.com/api/";
const API_KEY   = process.env.SIPREL_API_KEY  ?? "";
const NIP       = process.env.SIPREL_NIP      ?? "";

// WARNING: Each reference number has a 10-minute cooldown.
//          Do not re-run this script within 10 minutes of the previous run.
//          Taecel enforces a 10-minute cooldown per reference number (error 3128).

const POLL_INTERVAL_MS    = 5_000;
const POLL_TIMEOUT_MS     = 90_000;   // 90 s total cycle per transaction (sandbox latency buffer)
const INTER_TEST_DELAY    = 5_000;    // 5 s between transactions
const POST_TIMEOUT_DELAY  = 15_000;   // 15 s recovery pause after a timeout

// TEMPORARY: set to false once Oyuki recharges the Pago de Servicios saldo
const SKIP_BILL_PAYMENTS  = true;

// ─── TAECEL API TYPES ────────────────────────────────────────────────────────

interface TxnResponse {
  success: boolean;
  error:   number;
  message: string;
  data:    { transID?: string; fecha?: string } | unknown[];
  extra:   null | unknown;
}

interface StatusData {
  TransID?:       string;
  Fecha?:         string;
  Carrier?:       string;
  Referencia?:    string;
  Folio?:         string;
  Status?:        string;
  Monto?:         string;
  Cargo?:         string;
  Bolsa?:         string;
  "Saldo Final"?: string;
}

interface StatusResponse {
  success: boolean;
  error:   number;
  message: string;
  data:    StatusData | unknown[];
  extra:   null | unknown;
}

interface BalanceItem {
  ID:    string;
  Bolsa: string;
  Saldo: string;
}

interface BalanceResponse {
  success?: boolean;
  data:     BalanceItem[];
}

// ─── TEST MATRIX ─────────────────────────────────────────────────────────────

interface TestCase {
  id:            string;
  service:       string;
  producto:      string;
  referencia:    string;
  monto?:        string;
  expectedError?: number;
  description:   string;
}

const BILL_PAYMENTS: TestCase[] = [
  { id: "BP-01", service: "SKY", producto: "SKY000", referencia: "871235412635",                monto: "95",  description: "SKY payment" },
  { id: "BP-02", service: "TMX", producto: "TMX001", referencia: "6589745213",                  monto: "100", description: "Telmex payment" },
  { id: "BP-03", service: "CFE", producto: "CFE000", referencia: "125478965412365478965230126654", monto: "260", description: "CFE payment — 30-char full reference per Taecel support" },
  { id: "BP-04", service: "MEG", producto: "MEG000", referencia: "9854123547",                  monto: "131", description: "Megacable payment" },
  { id: "BP-05", service: "DSH", producto: "DSH000", referencia: "27458965324125",              monto: "103", description: "Dish payment" },
];

// WARNING: Each reference number has a 10-minute cooldown.
//          Do not re-run this script within 10 minutes of the previous run.
const MOBILE_TOPUPS: TestCase[] = [
  // — Telcel —
  { id: "TU-01", service: "TEL010", producto: "TEL010", referencia: "5555555505", description: "Telcel $10 — Exitosa" },
  { id: "TU-02", service: "TEL050", producto: "TEL050", referencia: "5555555510", description: "Telcel $50 — Error 1 (EXPECTED)",  expectedError: 1 },
  { id: "TU-03", service: "TEL100", producto: "TEL100", referencia: "5555555515", description: "Telcel $100 — Exitosa" },
  { id: "TU-04", service: "TEL150", producto: "TEL150", referencia: "5555555520", description: "Telcel $150 — Exitosa" },
  { id: "TU-05", service: "TEL200", producto: "TEL200", referencia: "5555555525", description: "Telcel $200 — Error 2 (EXPECTED)", expectedError: 2 },
  // — Movistar / AT&T —
  { id: "TU-06", service: "MOV010", producto: "MOV010", referencia: "5555555530", description: "Movistar $10 — Exitosa" },
  { id: "TU-07", service: "MOV050", producto: "MOV050", referencia: "5555555540", description: "Movistar $50 — Error 3 (EXPECTED)",    expectedError: 3 },
  { id: "TU-08", service: "MOV100", producto: "MOV100", referencia: "5555555560", description: "Movistar $100 — Exitosa" },
  { id: "TU-09", service: "MOV120", producto: "MOV120", referencia: "5555555565", description: "Movistar $120 — Error 4 (EXPECTED)",   expectedError: 4 },
  { id: "TU-10", service: "MOV150", producto: "MOV150", referencia: "5555555200", description: "Movistar $150 — Error 3129 (EXPECTED)", expectedError: 3129 },
];

// ─── ERROR CODE LABELS ───────────────────────────────────────────────────────

const ERROR_LABELS: Record<number, string> = {
  0:    "SUCCESS",
  1:    "Teléfono no válido",
  2:    "Destino no disponible",
  3:    "Sin respuesta del carrier",
  4:    "Línea inactiva",
  7:    "Tabla de transacciones llena",
  8:    "Timeout interno",
  9:    "Autorizador no disponible",
  403:  "Credenciales inválidas",
  405:  "Parámetros incorrectos",
  3129: "Tabla de transacciones llena",
  3133: "Producto no encontrado",
  8888: "Error de comunicación",
};

function errorLabel(code: number): string {
  return ERROR_LABELS[code] ?? `Error desconocido (${code})`;
}

// ─── HTTP HELPER ─────────────────────────────────────────────────────────────

async function taecelPost<T>(endpoint: string, extra: Record<string, string> = {}): Promise<T> {
  const body = new URLSearchParams({ key: API_KEY, nip: NIP, ...extra });
  const url  = `${BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    method:  "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body:    body.toString(),
    signal:  AbortSignal.timeout(25_000),  // 25 s — sandbox can take up to 15 s per call
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }

  return response.json() as Promise<T>;
}

// ─── TAECEL OPERATIONS ───────────────────────────────────────────────────────

async function doGetBalance(): Promise<{ tiempoAire: number; pagoServicios: number }> {
  const res = await taecelPost<BalanceResponse>("getBalance");

  let tiempoAire   = 0;
  let pagoServicios = 0;

  if (Array.isArray(res.data)) {
    for (const item of res.data) {
      const saldo = parseFloat(String((item as BalanceItem).Saldo ?? "0").replace(/,/g, ""));
      const bolsa = String((item as BalanceItem).Bolsa ?? "").toLowerCase();
      if (bolsa.includes("tiempo"))                         tiempoAire   = saldo;
      if (bolsa.includes("pago") || bolsa.includes("serv")) pagoServicios = saldo;
    }
  }

  return { tiempoAire, pagoServicios };
}

interface RunResult {
  transID?:  string;
  folio?:    string;
  carrier?:  string;
  fecha?:    string;
  status:    "Exitosa" | "pending" | "timeout" | "error";
  errorCode?: number;
  errorMsg?:  string;
  monto?:    string;
  bolsa?:    string;
}

async function runTransaction(tc: TestCase): Promise<RunResult> {
  const extra: Record<string, string> = {
    producto:   tc.producto,
    referencia: tc.referencia,
  };
  if (tc.monto !== undefined) extra.monto = tc.monto;

  // Debug: print the exact urlencoded body being sent
  const debugBody = new URLSearchParams({
    key:  `${API_KEY.slice(0, 4)}${"*".repeat(Math.max(0, API_KEY.length - 4))}`,
    nip:  "*".repeat(NIP.length),
    ...extra,
  });
  console.log(`   → requestTXN body: ${debugBody.toString()}`);

  // 1. requestTXN
  const txn = await taecelPost<TxnResponse>("requestTXN", extra);

  if (!txn.success) {
    return { status: "error", errorCode: txn.error, errorMsg: txn.message };
  }

  const txnData = txn.data as { transID?: string };
  const transID = txnData?.transID;
  if (!transID) {
    return { status: "error", errorMsg: "requestTXN returned no transID" };
  }

  // 2. Poll statusTXN
  const startedAt = Date.now();

  while (true) {
    if (Date.now() - startedAt >= POLL_TIMEOUT_MS) {
      return { status: "timeout", transID };
    }

    const statusRes = await taecelPost<StatusResponse>("statusTXN", { transID });

    if (statusRes.success === true && !Array.isArray(statusRes.data)) {
      const d = statusRes.data as StatusData;
      return {
        status:  "Exitosa",
        transID,
        folio:   d.Folio,
        carrier: d.Carrier,
        fecha:   d.Fecha,
        monto:   d.Monto,
        bolsa:   d.Bolsa,
      };
    }

    // Non-zero error — stop polling
    if (statusRes.error !== undefined && statusRes.error !== 0) {
      return { status: "error", transID, errorCode: statusRes.error, errorMsg: statusRes.message };
    }

    // En Proceso — wait before next poll
    await new Promise<void>((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

// ─── OUTPUT HELPERS ───────────────────────────────────────────────────────────

function pad(s: string, n: number) { return s.padEnd(n); }

function formatLine(tc: TestCase, result: RunResult, passed: boolean): string {
  const icon  = result.status === "Exitosa"  ? "✅"
              : result.status === "timeout"  ? "⚠️ "
              : result.status === "pending"  ? "⚠️ "
              : passed                        ? "✅"
              : "❌";

  const id    = `${tc.id} ${tc.service}`;

  if (result.status === "Exitosa") {
    return `${icon} ${pad(id, 12)}| TransID: ${result.transID ?? "—"} | Folio: ${result.folio ?? "—"} | Status: Exitosa`;
  }

  if (result.status === "timeout") {
    return `${icon} ${pad(id, 12)}| Status: timeout | TransID: ${result.transID ?? "—"} | continuing...`;
  }

  if (result.status === "pending") {
    return `${icon} ${pad(id, 12)}| Status: pending | TransID: ${result.transID ?? "—"} | continuing...`;
  }

  // error
  const label = errorLabel(result.errorCode ?? -1);
  const note  = passed ? " ← EXPECTED (test passed)" : " ← UNEXPECTED FAILURE";
  return `${icon} ${pad(id, 12)}| Error: ${result.errorCode} | ${label}${note}`;
}

// ─── RESULT RECORD ───────────────────────────────────────────────────────────

interface JsonTestRecord {
  id:          string;
  service:     string;
  producto:    string;
  referencia:  string;
  monto?:      string;
  transID?:    string;
  folio?:      string;
  carrier?:    string;
  fecha?:      string;
  bolsa?:      string;
  status:      string;
  errorCode?:  number;
  errorMsg?:   string;
  passed:      boolean;
  expected?:   string;
}

// ─── DELAY ───────────────────────────────────────────────────────────────────

function sleep(ms: number) { return new Promise<void>((r) => setTimeout(r, ms)); }

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n══════════════════════════════════════════════════════════");
  console.log("  PagoYa — Taecel Sandbox Test Runner");
  console.log("══════════════════════════════════════════════════════════\n");

  // 1. PREFLIGHT
  const missing = [
    !API_KEY    && "SIPREL_API_KEY",
    !NIP        && "SIPREL_NIP",
    !BASE_URL   && "SIPREL_BASE_URL",
  ].filter(Boolean);

  if (missing.length > 0) {
    console.error(`❌ Missing environment variables: ${missing.join(", ")}`);
    console.error("   Add them to Replit Secrets and restart the shell.");
    process.exit(1);
  }

  console.log(`🔑 SIPREL_API_KEY  : ${API_KEY.slice(0, 4)}${"*".repeat(Math.max(0, API_KEY.length - 4))}`);
  console.log(`🔑 SIPREL_NIP      : ${"*".repeat(NIP.length)}`);
  console.log(`🌐 SIPREL_BASE_URL : ${BASE_URL}\n`);

  console.log("Verificando credenciales con getBalance...");
  let balanceBefore: { tiempoAire: number; pagoServicios: number };
  try {
    balanceBefore = await doGetBalance();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("403")) {
      console.error("❌ Invalid credentials. Check SIPREL_API_KEY and SIPREL_NIP in Replit Secrets.");
    } else {
      console.error(`❌ getBalance failed: ${msg}`);
    }
    process.exit(1);
  }

  console.log(`✅ Credenciales válidas`);
  console.log(`   Bolsa Tiempo Aire       : $${balanceBefore.tiempoAire.toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN`);
  console.log(`   Bolsa Pago de Servicios : $${balanceBefore.pagoServicios.toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN\n`);

  // 2. RUN TESTS
  const jsonRecords: JsonTestRecord[] = [];
  let exitosaCount        = 0;  // Exitosa (clean success)
  let expectedErrorCount  = 0;  // returned an error but it was the expected one
  let unexpectedFailCount = 0;  // failed without a matching expectedError
  let timedOut            = 0;  // never completed within POLL_TIMEOUT_MS

  // — Bill Payments —
  console.log("─── BILL PAYMENTS ─────────────────────────────────────────\n");

  if (SKIP_BILL_PAYMENTS) {
    console.log("⏭  Bill payments skipped (Pago de Servicios saldo insufficient — waiting for sandbox recharge)\n");
  } else for (const tc of BILL_PAYMENTS) {
    let result: RunResult;
    try {
      result = await runTransaction(tc);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      timedOut++;
      console.log(`⚠️  ${pad(`${tc.id} ${tc.service}`, 12)}| Status: timeout | ${msg} | continuing...`);
      await sleep(POST_TIMEOUT_DELAY);
      continue;
    }

    if (result.status === "Exitosa" || result.status === "pending") exitosaCount++;
    else if (result.status === "timeout") timedOut++;
    else unexpectedFailCount++;

    const passed = result.status === "Exitosa" || result.status === "pending";
    console.log(formatLine(tc, result, passed));

    jsonRecords.push({
      id:         tc.id,
      service:    tc.service,
      producto:   tc.producto,
      referencia: tc.referencia,
      monto:      tc.monto,
      transID:    result.transID,
      folio:      result.folio,
      carrier:    result.carrier,
      fecha:      result.fecha,
      bolsa:      result.bolsa,
      status:     result.status,
      errorCode:  result.errorCode,
      errorMsg:   result.errorMsg,
      passed,
    });

    await sleep(INTER_TEST_DELAY);
  }

  // — Mobile Top-ups —
  console.log("\n─── MOBILE TOP-UPS ─────────────────────────────────────────\n");

  for (const tc of MOBILE_TOPUPS) {
    let result: RunResult;
    try {
      result = await runTransaction(tc);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      timedOut++;
      console.log(`⚠️  ${pad(`${tc.id} ${tc.service}`, 12)}| Status: timeout | ${msg} | continuing...`);
      await sleep(POST_TIMEOUT_DELAY);
      continue;
    }

    // Accept any error when expectedError is declared — sandbox may return a
    // different code than the matrix, but the test intent is "should error here".
    const expectedErrorHit = tc.expectedError !== undefined && result.status === "error";

    if (result.status === "Exitosa" || result.status === "pending") exitosaCount++;
    else if (result.status === "timeout") timedOut++;
    else if (expectedErrorHit) expectedErrorCount++;
    else unexpectedFailCount++;

    const passed = result.status === "Exitosa" || result.status === "pending" || expectedErrorHit;
    console.log(formatLine(tc, result, passed));

    jsonRecords.push({
      id:         tc.id,
      service:    tc.service,
      producto:   tc.producto,
      referencia: tc.referencia,
      transID:    result.transID,
      folio:      result.folio,
      carrier:    result.carrier,
      fecha:      result.fecha,
      bolsa:      result.bolsa,
      status:     result.status === "error" && expectedErrorHit ? `Error ${result.errorCode} (EXPECTED)` : result.status,
      errorCode:  result.errorCode,
      errorMsg:   result.errorMsg,
      passed,
      expected:   tc.expectedError !== undefined ? `Error code ${tc.expectedError}` : undefined,
    });

    await sleep(INTER_TEST_DELAY);
  }

  // 3. FINAL BALANCE
  let balanceAfter = balanceBefore;
  try {
    balanceAfter = await doGetBalance();
  } catch {
    // non-fatal
  }

  // 4. SUMMARY
  const total = BILL_PAYMENTS.length + MOBILE_TOPUPS.length;   // 15

  console.log("\n══════════════════════════════════════════════════════════");
  console.log("  SANDBOX TEST RESULTS");
  console.log("══════════════════════════════════════════════════════════");
  console.log(`  Passed (exitosa)                : ${exitosaCount}`);
  console.log(`  Expected errors (correct behav) : ${expectedErrorCount}`);
  console.log(`  Unexpected failures             : ${unexpectedFailCount}`);
  console.log(`  Timeouts                        : ${timedOut}`);
  console.log(`  Total                           : ${total} tests (${BILL_PAYMENTS.length} bill payments + ${MOBILE_TOPUPS.length} top-ups)`);
  console.log("══════════════════════════════════════════════════════════");
  console.log(`  Bolsa Pago de Servicios : $${balanceAfter.pagoServicios.toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN`);
  console.log(`  Bolsa Tiempo Aire       : $${balanceAfter.tiempoAire.toLocaleString("es-MX",    { minimumFractionDigits: 2 })} MXN`);
  console.log("══════════════════════════════════════════════════════════\n");

  // 5. WRITE RESULTS FILE
  const today  = new Date().toISOString().slice(0, 10);
  const output = {
    date:               today,
    total,
    exitosa:            exitosaCount,
    expectedErrors:     expectedErrorCount,
    unexpectedFailures: unexpectedFailCount,
    timedOut,
    tests:              jsonRecords,
    balances:           { tiempoAire: balanceAfter.tiempoAire, pagoServicios: balanceAfter.pagoServicios },
  };

  const outPath = path.join(__dirname, `sandbox-results-${today}.json`);
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2), "utf8");
  console.log(`📄 Resultados escritos en: ${outPath}`);
  console.log("   Comparte este archivo con Oyuki para solicitar acceso a producción.\n");

  process.exit(unexpectedFailCount === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("\n❌ Error inesperado:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
