/**
 * Normalise an incoming phone number to the canonical 10-digit format used
 * throughout PagoYa's database.
 *
 * Rules:
 *   - Strip all non-digit characters (spaces, dashes, parentheses, +)
 *   - If 12 digits starting with "52"  → MX E.164 country code → drop it (→ 10 digits)
 *   - If 13 digits starting with "521" → MX legacy mobile prefix → drop "521" prefix (→ 10 digits)
 *   - Otherwise keep last 10 digits (handles US 10-digit numbers unchanged)
 *
 * Examples:
 *   "+523221839799"  → "3221839799"
 *   "52 322 183 9799"→ "3221839799"
 *   "+528118963105"  → "8118963105"
 *   "4157972483"     → "4157972483"   (US, untouched)
 *   "521XXXXXXXXXX"  → "XXXXXXXXXX"   (legacy MX mobile)
 */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 13 && digits.startsWith("521")) return digits.slice(3);
  if (digits.length === 12 && digits.startsWith("52"))  return digits.slice(2);
  if (digits.length > 10) return digits.slice(-10);
  return digits;
}
