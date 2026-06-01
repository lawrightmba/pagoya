// ─── STP Service — CLABE generation, CEP URL builder, account registration ────
//
// Two responsibilities:
//   1. Per-user CLABE assignment (generateClabe + assignClabeToUser)
//   2. CEP (Comprobante Electrónico de Pago) URL builder for Banxico receipts
//
// Required env vars for production:
//   STP_ENABLED=true
//   STP_EMPRESA       — your institution name in STP (e.g. "PAGOYA")
//   STP_BANK_CODE     — 3-digit CLABE bank code assigned by STP/Banxico (e.g. "646")
//   STP_CITY_CODE     — 3-digit CLABE city code (e.g. "036" Monterrey, "021" CDMX)
//   STP_SOAP_URL      — STP SPEI WS endpoint (sandbox or prod)
//
// In dev (STP_ENABLED !== "true"):
//   CLABEs are generated and stored locally but the SOAP call is skipped.
// ─────────────────────────────────────────────────────────────────────────────

import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { logger } from "../lib/logger.js";

// ── CLABE control digit calculation ──────────────────────────────────────────
// Standard Banxico algorithm:
// 1. For each of the 17 base digits, compute (digit × weight) mod 10
// 2. Sum all 17 results
// 3. Control digit = (10 - (sum mod 10)) mod 10
//
// Reference: https://www.banxico.org.mx/sistema-de-pagos/informacion-general/sistema-spei/guia-tecnica/anexos/i-formato-del-numero-de-cuenta.html

const CLABE_WEIGHTS = [3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7, 1, 3, 7] as const;

export function computeClabeControlDigit(digits17: string): string {
  if (digits17.length !== 17 || !/^\d{17}$/.test(digits17)) {
    throw new Error(`CLABE base must be exactly 17 numeric digits, got: "${digits17}"`);
  }
  const sum = digits17
    .split("")
    .reduce((acc, d, i) => acc + ((parseInt(d, 10) * CLABE_WEIGHTS[i]) % 10), 0);
  return String((10 - (sum % 10)) % 10);
}

export function buildClabe(bankCode: string, cityCode: string, accountSeq: number): string {
  const bank = bankCode.padStart(3, "0").slice(0, 3);
  const city = cityCode.padStart(3, "0").slice(0, 3);
  const account = String(accountSeq).padStart(11, "0").slice(-11);
  const base17 = bank + city + account;
  return base17 + computeClabeControlDigit(base17);
}

// ── CEP URL builder ───────────────────────────────────────────────────────────
// Banxico CEP (Comprobante Electrónico de Pago) URL format:
//   https://www.banxico.org.mx/cep/?i={90+bankCode}&s={YYYYMMDD}&d={centavos}&t={claveRastreo}
//
// Reference: https://www.banxico.org.mx/cep/

export function generateCepUrl(params: {
  claveRastreo: string;
  fechaOperacion: string;
  amountMxn: number;
  bankCode?: string;
}): string {
  const { claveRastreo, fechaOperacion, amountMxn, bankCode } = params;
  const bank = bankCode ?? process.env.STP_BANK_CODE ?? "646";
  const institucion = `90${bank}`;
  const fecha = fechaOperacion.replace(/\D/g, "").slice(0, 8);
  const centavos = Math.round(amountMxn * 100);
  return (
    `https://www.banxico.org.mx/cep/` +
    `?i=${institucion}&s=${fecha}&d=${centavos}&t=${encodeURIComponent(claveRastreo)}`
  );
}

// ── Assign a CLABE to a user ──────────────────────────────────────────────────
// Generates a unique 18-digit CLABE derived from the user's DB id,
// persists it in the users.stp_clabe column, and (in production) registers
// it with STP via RegistraCuentaFisica SOAP.
//
// Safe to call fire-and-forget — never throws to the caller.

export async function assignClabeToUser(
  telefono: string,
  userId: number,
  kycData?: { fullName?: string | null; curp?: string | null; dob?: string | null },
): Promise<string | null> {
  try {
    const bankCode = process.env.STP_BANK_CODE ?? "646";
    const cityCode = process.env.STP_CITY_CODE ?? "000";
    const clabe = buildClabe(bankCode, cityCode, userId);

    await db
      .update(usersTable)
      .set({ stpClabe: clabe })
      .where(eq(usersTable.id, userId));

    logger.info({ telefono, userId, clabe }, "stp: CLABE assigned and saved");

    if (process.env.STP_ENABLED === "true") {
      await registerCuentaFisicaStp({ telefono, clabe, kycData }).catch((err) => {
        logger.error(
          { err, telefono, clabe },
          "stp: RegistraCuentaFisica SOAP failed (non-fatal — CLABE saved locally, retry on next KYC update)",
        );
      });
    } else {
      logger.info({ telefono, clabe }, "stp: STP_ENABLED=false — skipping SOAP registration in dev");
    }

    return clabe;
  } catch (err) {
    logger.error({ err, telefono, userId }, "stp: assignClabeToUser failed");
    return null;
  }
}

// ── STP SOAP — RegistraCuentaFisica ──────────────────────────────────────────
// Registers a natural-person CLABE sub-account with STP.
// Called automatically from assignClabeToUser when STP_ENABLED=true.
//
// STP WS endpoint (WALLET/IFPE module):
//   Sandbox: https://stpmex.com:7024/speiws/service
//   Production: (same host, different credentials)
//
// Full parameter reference: stpmex.zendesk.com → SOFIPOS/WALLET →
//   "Natural Persons Account Registration"

async function registerCuentaFisicaStp(params: {
  telefono: string;
  clabe: string;
  kycData?: { fullName?: string | null; curp?: string | null; dob?: string | null };
}): Promise<void> {
  const { telefono, clabe, kycData } = params;
  const empresa = process.env.STP_EMPRESA;
  const soapUrl = process.env.STP_SOAP_URL ?? "https://stpmex.com:7024/speiws/service";

  if (!empresa) {
    logger.warn({ telefono }, "stp: STP_EMPRESA not set — cannot register CLABE with STP");
    return;
  }

  // Split full name into components
  const nameParts = (kycData?.fullName ?? telefono).trim().split(/\s+/);
  const nombre = nameParts[0] ?? telefono;
  const apellidoPaterno = nameParts[1] ?? "-";
  const apellidoMaterno = nameParts[2] ?? "-";

  // Convert DOB from YYYY-MM-DD to DD-MM-YYYY for STP
  let fechaNacimiento = "01-01-1990";
  if (kycData?.dob) {
    const parts = kycData.dob.split("-");
    if (parts.length === 3) {
      fechaNacimiento = `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
  }

  const rfcCurp = kycData?.curp ?? "-";

  const soapEnvelope = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope
  xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
  xmlns:spei="http://www.stpmex.com/spei">
  <soapenv:Header/>
  <soapenv:Body>
    <spei:registraCuentaFisica>
      <empresa>${empresa}</empresa>
      <cuenta>${clabe}</cuenta>
      <nombre>${nombre}</nombre>
      <apellidoPaterno>${apellidoPaterno}</apellidoPaterno>
      <apellidoMaterno>${apellidoMaterno}</apellidoMaterno>
      <rfcCurp>${rfcCurp}</rfcCurp>
      <fechaNacimiento>${fechaNacimiento}</fechaNacimiento>
      <paisResidencia>MX</paisResidencia>
      <tipoPersona>1</tipoPersona>
      <actividad>28</actividad>
    </spei:registraCuentaFisica>
  </soapenv:Body>
</soapenv:Envelope>`;

  logger.info({ telefono, clabe, empresa, soapUrl }, "stp: calling RegistraCuentaFisica SOAP");

  const response = await fetch(soapUrl, {
    method: "POST",
    headers: {
      "Content-Type": "text/xml;charset=UTF-8",
      "SOAPAction": "registraCuentaFisica",
    },
    body: soapEnvelope,
    signal: AbortSignal.timeout(15_000),
  });

  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(
      `STP RegistraCuentaFisica HTTP ${response.status}: ${responseText.slice(0, 300)}`,
    );
  }

  // STP returns result codes in the SOAP body:
  //   id > 0 → success (id is the STP internal record id)
  //   id = 0 or negative → error (descripcionError has the reason)
  const idMatch = responseText.match(/<id>(-?\d+)<\/id>/);
  const errorMatch = responseText.match(/<descripcionError>([^<]*)<\/descripcionError>/);
  const stpId = idMatch ? parseInt(idMatch[1], 10) : null;

  if (stpId === null || stpId <= 0) {
    const reason = errorMatch?.[1] ?? "Unknown STP error";
    throw new Error(`STP RegistraCuentaFisica rejected: ${reason}`);
  }

  logger.info({ telefono, clabe, stpId }, "stp: RegistraCuentaFisica succeeded");
}

// ── Check account status with STP ─────────────────────────────────────────────
// Calls STP's "Check Account" endpoint to verify a CLABE is active.
// Reference: stpmex.zendesk.com → SOFIPOS/WALLET → "Check account"

export async function checkStpAccount(clabe: string): Promise<{
  active: boolean;
  stpResponse?: string;
  error?: string;
}> {
  const empresa = process.env.STP_EMPRESA;
  const soapUrl = process.env.STP_SOAP_URL ?? "https://stpmex.com:7024/speiws/service";

  if (!empresa || process.env.STP_ENABLED !== "true") {
    return { active: true, stpResponse: "dev-mode-bypass" };
  }

  const soapEnvelope = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope
  xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
  xmlns:spei="http://www.stpmex.com/spei">
  <soapenv:Header/>
  <soapenv:Body>
    <spei:consultaCuentaFisica>
      <empresa>${empresa}</empresa>
      <cuenta>${clabe}</cuenta>
    </spei:consultaCuentaFisica>
  </soapenv:Body>
</soapenv:Envelope>`;

  try {
    const response = await fetch(soapUrl, {
      method: "POST",
      headers: {
        "Content-Type": "text/xml;charset=UTF-8",
        "SOAPAction": "consultaCuentaFisica",
      },
      body: soapEnvelope,
      signal: AbortSignal.timeout(10_000),
    });

    const text = await response.text();
    const active = response.ok && !text.includes("<id>0</id>") && !text.includes("ERROR");
    return { active, stpResponse: text.slice(0, 500) };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    logger.error({ err, clabe }, "stp: consultaCuentaFisica failed");
    return { active: false, error };
  }
}

// ── Withdraw / deregister account ─────────────────────────────────────────────
// Calls STP's "Withdrawal of Account" endpoint when a user closes their account.
// Reference: stpmex.zendesk.com → SOFIPOS/WALLET → "Withdrawal of Account"

export async function withdrawStpAccount(clabe: string, telefono: string): Promise<boolean> {
  const empresa = process.env.STP_EMPRESA;
  const soapUrl = process.env.STP_SOAP_URL ?? "https://stpmex.com:7024/speiws/service";

  if (!empresa || process.env.STP_ENABLED !== "true") {
    logger.info({ clabe, telefono }, "stp: withdrawStpAccount skipped (dev mode)");
    return true;
  }

  const soapEnvelope = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope
  xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
  xmlns:spei="http://www.stpmex.com/spei">
  <soapenv:Header/>
  <soapenv:Body>
    <spei:eliminaCuentaFisica>
      <empresa>${empresa}</empresa>
      <cuenta>${clabe}</cuenta>
    </spei:eliminaCuentaFisica>
  </soapenv:Body>
</soapenv:Envelope>`;

  try {
    const response = await fetch(soapUrl, {
      method: "POST",
      headers: {
        "Content-Type": "text/xml;charset=UTF-8",
        "SOAPAction": "eliminaCuentaFisica",
      },
      body: soapEnvelope,
      signal: AbortSignal.timeout(10_000),
    });

    const text = await response.text();
    const success = response.ok && !text.includes("<id>0</id>");
    if (success) {
      logger.info({ clabe, telefono }, "stp: account withdrawn from STP");
    } else {
      logger.warn({ clabe, telefono, response: text.slice(0, 300) }, "stp: account withdrawal may have failed");
    }
    return success;
  } catch (err) {
    logger.error({ err, clabe, telefono }, "stp: withdrawStpAccount SOAP failed");
    return false;
  }
}
