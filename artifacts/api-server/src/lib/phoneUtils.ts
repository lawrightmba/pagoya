/**
 * Phone number utilities — E.164-aware.
 *
 * PagoYa supports Mexican (+52) and US/Canadian (+1) numbers.
 * All phone numbers are stored and passed around as canonical E.164 strings
 * (e.g. "+521234567890", "+17138052626").
 *
 * toE164(raw)      — convert any input format → canonical E.164
 * normalizePhone   — alias for toE164; used for DB lookups throughout the codebase
 * toSiprelRef      — extract last 10 digits for SIPREL payment references (SIPREL hard limit ≤10 chars)
 */

/**
 * Convert any phone number representation to canonical E.164 format.
 *
 * Handles:
 *   "+521234567890"  → "+521234567890"  (already E.164 MX)
 *   "+17138052626"   → "+17138052626"   (already E.164 US)
 *   "521234567890"   → "+521234567890"  (MX without +)
 *   "17138052626"    → "+17138052626"   (US without +)
 *   "5211234567890"  → "+521234567890"  (MX legacy mobile prefix 521, 13 digits)
 *   "1234567890"     → "+521234567890"  (bare 10 digits — assumed MX)
 *   "+528118963105"  → "+528118963105"  (MX 12-digit with +)
 */
export function toE164(raw: string): string {
  // Already E.164: starts with + followed by digits only
  if (/^\+\d/.test(raw)) {
    return "+" + raw.replace(/\D/g, "");
  }

  const digits = raw.replace(/\D/g, "");

  // MX legacy: 13 digits starting with 521 (old mobile prefix artifact) → drop the extra 1
  if (digits.length === 13 && digits.startsWith("521")) return `+52${digits.slice(3)}`;

  // MX E.164 without +: 12 digits starting with 52
  if (digits.length === 12 && digits.startsWith("52")) return `+${digits}`;

  // US / Canada: 11 digits starting with 1
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;

  // Mexican 10-digit (most common legacy format) → prepend +52
  if (digits.length === 10) return `+52${digits}`;

  // Fallback: prepend + and trust the caller
  return `+${digits}`;
}

/**
 * Canonical alias — import this everywhere telefono is read from or compared
 * against the database. Returns full E.164.
 */
export const normalizePhone = toE164;

/**
 * SIPREL referencia helper — SIPREL enforces a ≤10 character referencia limit.
 * Returns the last 10 digits of the E.164 number.
 *
 * Use ONLY when building a SIPREL/Taecel payment referencia field.
 * Do NOT use for DB lookups or user identity.
 */
export function toSiprelRef(raw: string): string {
  return raw.replace(/\D/g, "").slice(-10);
}
