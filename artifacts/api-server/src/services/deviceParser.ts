/**
 * deviceParser.ts
 *
 * Parses a User-Agent string + optional PWA hint into a structured DeviceProfile.
 * Used at OTP verification (first login) and session middleware (change detection).
 *
 * iOS model mapping covers iPhone 12–16 ranges; unknown models return
 * 'iPhone (Unknown Model)' — graceful degradation, never crashes.
 * Android UA strings are notoriously messy; unknown models return 'Android Device'.
 */

export interface DeviceProfile {
  os: string;         // 'iOS' | 'Android' | 'Windows' | 'macOS' | 'Linux' | 'Other'
  osVersion: string;  // e.g. '17.4', '14', '' if unparseable
  model: string;      // e.g. 'iPhone 15', 'Samsung SM-A055', 'Unknown'
  type: string;       // 'mobile' | 'tablet' | 'desktop'
  accessMode: string; // 'pwa' | 'browser'
}

// ── iPhone model mapping (expands by naming convention) ───────────────────────
const IPHONE_MODEL_MAP: Record<string, string> = {
  // iPhone 16 family
  "iPhone17,1": "iPhone 16 Pro Max",
  "iPhone17,2": "iPhone 16 Pro",
  "iPhone17,3": "iPhone 16",
  "iPhone17,4": "iPhone 16 Plus",
  // iPhone 15 family
  "iPhone16,1": "iPhone 15",
  "iPhone16,2": "iPhone 15 Plus",
  "iPhone16,3": "iPhone 15 Pro",
  "iPhone16,4": "iPhone 15 Pro Max",
  // iPhone 14 family
  "iPhone15,2": "iPhone 14 Pro",
  "iPhone15,3": "iPhone 14 Pro Max",
  "iPhone14,7": "iPhone 14",
  "iPhone14,8": "iPhone 14 Plus",
  // iPhone 13 family
  "iPhone14,4": "iPhone 13 Mini",
  "iPhone14,5": "iPhone 13",
  "iPhone14,2": "iPhone 13 Pro",
  "iPhone14,3": "iPhone 13 Pro Max",
  // iPhone 12 family
  "iPhone13,1": "iPhone 12 Mini",
  "iPhone13,2": "iPhone 12",
  "iPhone13,3": "iPhone 12 Pro",
  "iPhone13,4": "iPhone 12 Pro Max",
  // iPhone 11 family
  "iPhone12,1": "iPhone 11",
  "iPhone12,3": "iPhone 11 Pro",
  "iPhone12,5": "iPhone 11 Pro Max",
  // iPhone SE
  "iPhone14,6": "iPhone SE (3rd gen)",
  "iPhone12,8": "iPhone SE (2nd gen)",
};

function parseIphoneModel(ua: string): string {
  const match = ua.match(/iPhone(\d+),(\d+)/);
  if (!match) return "iPhone (Unknown Model)";
  const key = `iPhone${match[1]},${match[2]}`;
  return IPHONE_MODEL_MAP[key] ?? `iPhone (Unknown Model)`;
}

function parseIosVersion(ua: string): string {
  const match = ua.match(/OS (\d+)[_.](\d+)(?:[_.](\d+))?/);
  if (!match) return "";
  return match[3] ? `${match[1]}.${match[2]}.${match[3]}` : `${match[1]}.${match[2]}`;
}

function parseAndroidModel(ua: string): string {
  // Samsung: SM-XXXX
  const samsung = ua.match(/\b(SM-[A-Z0-9]+)\b/);
  if (samsung) return `Samsung ${samsung[1]}`;
  // Motorola: moto X or Moto X
  const moto = ua.match(/\b[Mm]oto[\s_]([A-Za-z0-9\s]+?)(?:\s+Build|\))/);
  if (moto) return `Motorola Moto ${moto[1].trim()}`;
  // Xiaomi: Redmi, POCO, Mi
  const xiaomi = ua.match(/\b(Redmi[^;)]+|POCO[^;)]+|Mi[^;)]+?)(?:\s+Build|\))/);
  if (xiaomi) return `Xiaomi ${xiaomi[1].trim()}`;
  // Huawei
  const huawei = ua.match(/\b(HUAWEI|Huawei)\s+([A-Za-z0-9\-]+)/);
  if (huawei) return `Huawei ${huawei[2]}`;
  // LG
  const lg = ua.match(/\bLG-([A-Z0-9]+)/);
  if (lg) return `LG-${lg[1]}`;
  return "Android Device";
}

function parseAndroidVersion(ua: string): string {
  const match = ua.match(/Android\s+(\d+(?:\.\d+)?)/);
  return match ? match[1] : "";
}

// ── Main export ───────────────────────────────────────────────────────────────
export function parseDevice(userAgent: string, isPwa?: boolean): DeviceProfile {
  const ua = userAgent || "";

  const accessMode = isPwa ? "pwa" : "browser";

  // ── iOS ───────────────────────────────────────────────────────────────────
  if (/iPhone/.test(ua)) {
    return {
      os: "iOS",
      osVersion: parseIosVersion(ua),
      model: parseIphoneModel(ua),
      type: "mobile",
      accessMode,
    };
  }
  if (/iPad/.test(ua)) {
    return {
      os: "iOS",
      osVersion: parseIosVersion(ua),
      model: "iPad",
      type: "tablet",
      accessMode,
    };
  }

  // ── Android ───────────────────────────────────────────────────────────────
  if (/Android/.test(ua)) {
    const isTablet = /Tablet|Tab|SM-T\d/.test(ua);
    return {
      os: "Android",
      osVersion: parseAndroidVersion(ua),
      model: parseAndroidModel(ua),
      type: isTablet ? "tablet" : "mobile",
      accessMode,
    };
  }

  // ── Desktop ───────────────────────────────────────────────────────────────
  if (/Windows NT/.test(ua)) {
    return { os: "Windows", osVersion: "", model: "Unknown", type: "desktop", accessMode };
  }
  if (/Mac OS X/.test(ua) && !/Mobile/.test(ua)) {
    return { os: "macOS", osVersion: "", model: "Unknown", type: "desktop", accessMode };
  }
  if (/Linux/.test(ua) && !/Android/.test(ua)) {
    return { os: "Linux", osVersion: "", model: "Unknown", type: "desktop", accessMode };
  }

  return { os: "Other", osVersion: "", model: "Unknown", type: "desktop", accessMode };
}
