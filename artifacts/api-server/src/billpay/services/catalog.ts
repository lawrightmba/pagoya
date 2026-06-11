import type { BillService, BillCategory } from "../types/billpay.js";

export const CATEGORY_LABELS: Record<BillCategory, { labelEs: string; labelEn: string }> = {
  "Luz":           { labelEs: "Luz",             labelEn: "Electricity" },
  "Agua":          { labelEs: "Agua",             labelEn: "Water" },
  "Gas":           { labelEs: "Gas",              labelEn: "Gas" },
  "Internet":      { labelEs: "Internet",         labelEn: "Internet" },
  "Cable":         { labelEs: "Cable / Satélite", labelEn: "Cable / Satellite" },
  "Teléfono móvil":{ labelEs: "Teléfono Móvil",  labelEn: "Mobile Phone" },
  "Streaming":     { labelEs: "Streaming",        labelEn: "Streaming" },
  "Gift Cards":    { labelEs: "Gift Cards",        labelEn: "Gift Cards" },
  "Préstamos":     { labelEs: "Préstamos",        labelEn: "Loans" },
  "Seguro":        { labelEs: "Seguros",          labelEn: "Insurance" },
  "Escuela":       { labelEs: "Educación",        labelEn: "Education" },
  "Renta":         { labelEs: "Renta",            labelEn: "Rent" },
  "Otro":          { labelEs: "Otro",             labelEn: "Other" },
};

export const BILL_CATALOG: BillService[] = [
  // ── LUZ ──────────────────────────────────────────────────────────────────
  {
    id: "cfe", name: "CFE", category: "Luz",
    providers: ["siprel", "evoluciona"], logoEmoji: "⚡",
    siprelServiceId: "CFE000", evolucionaServiceId: "CFE_LUZ", minReferencia: 12,
  },

  // ── AGUA ─────────────────────────────────────────────────────────────────
  { id: "sacmex",      name: "SACMEX",          category: "Agua", providers: ["siprel"], logoEmoji: "💧", siprelServiceId: "SACMEX01" },
  { id: "agua_jalisco", name: "SIAPA Jalisco",  category: "Agua", providers: ["siprel"], logoEmoji: "💧", siprelServiceId: "SIA000"   },
  { id: "seapal",      name: "SEAPAL Vallarta", category: "Agua", providers: ["siprel"], logoEmoji: "💧", siprelServiceId: "SEAPAL01", minReferencia: 28, maxReferencia: 28 },

  // ── GAS ───────────────────────────────────────────────────────────────────
  { id: "gas_natural",   name: "Gas Natural",      category: "Gas", providers: ["siprel"], logoEmoji: "🔥", siprelServiceId: "GAS000",  minReferencia: 14, maxReferencia: 28 },
  { id: "ecogas",        name: "Ecogas",            category: "Gas", providers: ["siprel"], logoEmoji: "🔥", siprelServiceId: "ECO000"  },
  { id: "mexicana_gas",  name: "Mexicana de Gas",   category: "Gas", providers: ["siprel"], logoEmoji: "🔥", siprelServiceId: "MGAS01"  },
  { id: "naturgy",       name: "Naturgy",            category: "Gas", providers: ["siprel"], logoEmoji: "🔥", siprelServiceId: "NAT001"  },

  // ── INTERNET ─────────────────────────────────────────────────────────────
  { id: "izzi", name: "Izzi", category: "Internet", providers: ["siprel"], logoEmoji: "📡", siprelServiceId: "IZZ000", minReferencia: 8, maxReferencia: 8 },
  { id: "totalplay", name: "TotalPlay", category: "Internet", providers: ["siprel"], logoEmoji: "📡", siprelServiceId: "TOT000", minReferencia: 17, maxReferencia: 17 },
  {
    id: "megacable", name: "Megacable", category: "Internet",
    providers: ["siprel", "evoluciona"], logoEmoji: "📡",
    siprelServiceId: "MEG000", evolucionaServiceId: "MEGACABLE",
  },
  {
    id: "telmex_internet", name: "Telmex Internet", category: "Internet",
    providers: ["siprel", "evoluciona"], logoEmoji: "📡",
    siprelServiceId: "TMX001", evolucionaServiceId: "TELMEX_INTERNET",
  },
  { id: "starlink", name: "Starlink", category: "Internet", providers: ["evoluciona"], logoEmoji: "🛰️", evolucionaServiceId: "STARLINK" },

  // ── CABLE ─────────────────────────────────────────────────────────────────
  {
    id: "sky", name: "Sky", category: "Cable",
    providers: ["siprel", "evoluciona"], logoEmoji: "📺",
    siprelServiceId: "SKY000", evolucionaServiceId: "SKY_TV",
  },
  {
    id: "dish", name: "Dish", category: "Cable",
    providers: ["siprel"], logoEmoji: "📺",
    siprelServiceId: "DSH000",
  },
  {
    id: "maxcom", name: "Maxcom", category: "Cable",
    providers: ["siprel"], logoEmoji: "📺",
    siprelServiceId: "MAX000",
  },

  // ── TELÉFONO FIJO ─────────────────────────────────────────────────────────
  {
    id: "telmex_fijo", name: "Telmex (Fijo)", category: "Teléfono móvil",
    providers: ["siprel", "evoluciona"], logoEmoji: "☎️",
    siprelServiceId: "TMX001", evolucionaServiceId: "TELMEX_FIJO",
  },

  // ── MÓVIL — Telcel Recargas (Tiempo Aire) ────────────────────────────────
  { id: "telcel_recarga_10",  name: "Telcel Recarga $10",  category: "Teléfono móvil", providers: ["siprel"], logoEmoji: "📱", siprelServiceId: "TEL010", minAmount: 10,  isTopup: true },
  { id: "telcel_recarga_50",  name: "Telcel Recarga $50",  category: "Teléfono móvil", providers: ["siprel"], logoEmoji: "📱", siprelServiceId: "TEL050", minAmount: 50,  isTopup: true },
  { id: "telcel_recarga_100", name: "Telcel Recarga $100", category: "Teléfono móvil", providers: ["siprel"], logoEmoji: "📱", siprelServiceId: "TEL100", minAmount: 100, isTopup: true },
  { id: "telcel_recarga_150", name: "Telcel Recarga $150", category: "Teléfono móvil", providers: ["siprel"], logoEmoji: "📱", siprelServiceId: "TEL150", minAmount: 150, isTopup: true },
  { id: "telcel_recarga_200", name: "Telcel Recarga $200", category: "Teléfono móvil", providers: ["siprel"], logoEmoji: "📱", siprelServiceId: "TEL200", minAmount: 200, isTopup: true },

  // ── MÓVIL — AT&T Recargas (Tiempo Aire) ──────────────────────────────────
  { id: "att_recarga_10",  name: "AT&T Recarga $10",  category: "Teléfono móvil", providers: ["siprel"], logoEmoji: "📱", siprelServiceId: "MOV010", minAmount: 10,  isTopup: true },
  { id: "att_recarga_50",  name: "AT&T Recarga $50",  category: "Teléfono móvil", providers: ["siprel"], logoEmoji: "📱", siprelServiceId: "MOV050", minAmount: 50,  isTopup: true },
  { id: "att_recarga_100", name: "AT&T Recarga $100", category: "Teléfono móvil", providers: ["siprel"], logoEmoji: "📱", siprelServiceId: "MOV100", minAmount: 100, isTopup: true },
  { id: "att_recarga_120", name: "AT&T Recarga $120", category: "Teléfono móvil", providers: ["siprel"], logoEmoji: "📱", siprelServiceId: "MOV120", minAmount: 120, isTopup: true },
  { id: "att_recarga_150", name: "AT&T Recarga $150", category: "Teléfono móvil", providers: ["siprel"], logoEmoji: "📱", siprelServiceId: "MOV150", minAmount: 150, isTopup: true },

  // ── MÓVIL — Other carriers ────────────────────────────────────────────────
  { id: "movistar", name: "Movistar Factura", category: "Teléfono móvil", providers: ["siprel", "evoluciona"], logoEmoji: "📱", siprelServiceId: "MOF000", evolucionaServiceId: "MOVISTAR" },

  // ── GIFT CARDS ────────────────────────────────────────────────────────────
  // Netflix
  { id: "netflix_300", name: "Netflix $300",  category: "Gift Cards", providers: ["siprel"], logoEmoji: "🎬", siprelServiceId: "NET300", isGiftCard: true, fixedAmount: 300 },
  { id: "netflix_400", name: "Netflix $400",  category: "Gift Cards", providers: ["siprel"], logoEmoji: "🎬", siprelServiceId: "NET150", isGiftCard: true, fixedAmount: 400 },
  { id: "netflix_500", name: "Netflix $500",  category: "Gift Cards", providers: ["siprel"], logoEmoji: "🎬", siprelServiceId: "NET500", isGiftCard: true, fixedAmount: 500 },
  { id: "netflix_700", name: "Netflix $700",  category: "Gift Cards", providers: ["siprel"], logoEmoji: "🎬", siprelServiceId: "NET700", isGiftCard: true, fixedAmount: 700 },
  // Amazon
  { id: "amazon_100",  name: "Amazon $100",   category: "Gift Cards", providers: ["siprel"], logoEmoji: "📦", siprelServiceId: "AGC100",  isGiftCard: true, fixedAmount: 100 },
  { id: "amazon_200",  name: "Amazon $200",   category: "Gift Cards", providers: ["siprel"], logoEmoji: "📦", siprelServiceId: "AGC200",  isGiftCard: true, fixedAmount: 200 },
  { id: "amazon_300",  name: "Amazon $300",   category: "Gift Cards", providers: ["siprel"], logoEmoji: "📦", siprelServiceId: "AGC300",  isGiftCard: true, fixedAmount: 300 },
  { id: "amazon_500",  name: "Amazon $500",   category: "Gift Cards", providers: ["siprel"], logoEmoji: "📦", siprelServiceId: "AGC500",  isGiftCard: true, fixedAmount: 500 },
  { id: "amazon_1000", name: "Amazon $1,000", category: "Gift Cards", providers: ["siprel"], logoEmoji: "📦", siprelServiceId: "AGC1000", isGiftCard: true, fixedAmount: 1000 },
  // Google Play
  { id: "google_play_50",  name: "Google Play $50",  category: "Gift Cards", providers: ["siprel"], logoEmoji: "🎮", siprelServiceId: "GPLAY50", isGiftCard: true, fixedAmount: 50 },
  { id: "google_play_100", name: "Google Play $100", category: "Gift Cards", providers: ["siprel"], logoEmoji: "🎮", siprelServiceId: "GOO01",   isGiftCard: true, fixedAmount: 100 },
  { id: "google_play_200", name: "Google Play $200", category: "Gift Cards", providers: ["siprel"], logoEmoji: "🎮", siprelServiceId: "GOO03",   isGiftCard: true, fixedAmount: 200 },
  { id: "google_play_300", name: "Google Play $300", category: "Gift Cards", providers: ["siprel"], logoEmoji: "🎮", siprelServiceId: "GOO02",   isGiftCard: true, fixedAmount: 300 },
  { id: "google_play_500", name: "Google Play $500", category: "Gift Cards", providers: ["siprel"], logoEmoji: "🎮", siprelServiceId: "GOO500",  isGiftCard: true, fixedAmount: 500 },
  // Uber
  { id: "uber_150",    name: "Uber $150",      category: "Gift Cards", providers: ["siprel"], logoEmoji: "🚗", siprelServiceId: "UBR150",  isGiftCard: true, fixedAmount: 150 },
  { id: "uber_eats_300", name: "Uber Eats $300", category: "Gift Cards", providers: ["siprel"], logoEmoji: "🍔", siprelServiceId: "EATS02", isGiftCard: true, fixedAmount: 300 },
  // Cinepolis
  { id: "cinepolis_60",  name: "Cinépolis $60",  category: "Gift Cards", providers: ["siprel"], logoEmoji: "🎬", siprelServiceId: "CINBS52",  isGiftCard: true, fixedAmount: 60 },
  { id: "cinepolis_100", name: "Cinépolis $100", category: "Gift Cards", providers: ["siprel"], logoEmoji: "🎬", siprelServiceId: "CCM075",   isGiftCard: true, fixedAmount: 100 },
  { id: "cinepolis_140", name: "Cinépolis $140", category: "Gift Cards", providers: ["siprel"], logoEmoji: "🎬", siprelServiceId: "CINVIP1B", isGiftCard: true, fixedAmount: 140 },
  { id: "cinepolis_210", name: "Cinépolis $210", category: "Gift Cards", providers: ["siprel"], logoEmoji: "🎬", siprelServiceId: "CIN3DIMAX2", isGiftCard: true, fixedAmount: 210 },
  // Starbucks
  { id: "starbucks_200", name: "Starbucks $200", category: "Gift Cards", providers: ["siprel"], logoEmoji: "☕", siprelServiceId: "STRBKS0200", isGiftCard: true, fixedAmount: 200 },
  { id: "starbucks_300", name: "Starbucks $300", category: "Gift Cards", providers: ["siprel"], logoEmoji: "☕", siprelServiceId: "STRBKS0300", isGiftCard: true, fixedAmount: 300 },
  // Liverpool
  { id: "liverpool_500",  name: "Liverpool $500",  category: "Gift Cards", providers: ["siprel"], logoEmoji: "🛍️", siprelServiceId: "LIVEMEX500",  isGiftCard: true, fixedAmount: 500 },
  { id: "liverpool_1000", name: "Liverpool $1,000", category: "Gift Cards", providers: ["siprel"], logoEmoji: "🛍️", siprelServiceId: "LIVEMEX1000", isGiftCard: true, fixedAmount: 1000 },
  { id: "liverpool_2000", name: "Liverpool $2,000", category: "Gift Cards", providers: ["siprel"], logoEmoji: "🛍️", siprelServiceId: "LIVEMEX2000", isGiftCard: true, fixedAmount: 2000 },
  // Soriana
  { id: "soriana_500", name: "Soriana $500", category: "Gift Cards", providers: ["siprel"], logoEmoji: "🛒", siprelServiceId: "SORIANA500", isGiftCard: true, fixedAmount: 500 },

  // ── INFONAVIT ─────────────────────────────────────────────────────────────
  { id: "infonavit", name: "Infonavit", category: "Préstamos", providers: ["siprel"], logoEmoji: "🏠", siprelServiceId: "INF000" },
];

export function getServiceById(id: string): BillService | undefined {
  return BILL_CATALOG.find((s) => s.id === id);
}

export function getServicesByCategory(category: string): BillService[] {
  return BILL_CATALOG.filter((s) => s.category === category);
}

export function getCatalogSummary() {
  const categories: Record<string, { id: string; name: string; logoEmoji: string; providers: string[] }[]> = {};
  for (const svc of BILL_CATALOG) {
    if (!categories[svc.category]) categories[svc.category] = [];
    categories[svc.category].push({ id: svc.id, name: svc.name, logoEmoji: svc.logoEmoji, providers: svc.providers });
  }
  return categories;
}

export function getCategoriesWithTranslations() {
  const grouped: Record<string, { id: string; name: string; logoEmoji: string; providers: string[] }[]> = {};
  for (const svc of BILL_CATALOG) {
    if (!grouped[svc.category]) grouped[svc.category] = [];
    grouped[svc.category].push({ id: svc.id, name: svc.name, logoEmoji: svc.logoEmoji, providers: svc.providers });
  }
  return (Object.keys(grouped) as BillCategory[]).map((cat) => ({
    id: cat.toLowerCase().replace(/[^a-z0-9]/g, "_"),
    labelEs: CATEGORY_LABELS[cat]?.labelEs ?? cat,
    labelEn: CATEGORY_LABELS[cat]?.labelEn ?? cat,
    services: grouped[cat],
  }));
}
