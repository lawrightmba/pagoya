import type { BillService, BillCategory } from "../types/billpay.js";

export const CATEGORY_LABELS: Record<BillCategory, { labelEs: string; labelEn: string }> = {
  "Luz":           { labelEs: "Luz",             labelEn: "Electricity" },
  "Agua":          { labelEs: "Agua",             labelEn: "Water" },
  "Gas":           { labelEs: "Gas",              labelEn: "Gas" },
  "Internet":      { labelEs: "Internet",         labelEn: "Internet" },
  "Cable":         { labelEs: "Cable / Satélite", labelEn: "Cable / Satellite" },
  "Teléfono móvil":{ labelEs: "Teléfono Móvil",  labelEn: "Mobile Phone" },
  "Streaming":     { labelEs: "Streaming",        labelEn: "Streaming" },
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
  { id: "sacmex", name: "SACMEX", category: "Agua", providers: ["siprel"], logoEmoji: "💧", siprelServiceId: "SACMEX" },
  { id: "agua_jalisco", name: "SIAPA Jalisco", category: "Agua", providers: ["siprel"], logoEmoji: "💧", siprelServiceId: "SIAPA" },

  // ── GAS ───────────────────────────────────────────────────────────────────
  { id: "gas_natural", name: "Gas Natural", category: "Gas", providers: ["siprel"], logoEmoji: "🔥", siprelServiceId: "GAS000", minReferencia: 14, maxReferencia: 28 },
  { id: "zeta_gas", name: "Zeta Gas", category: "Gas", providers: ["siprel"], logoEmoji: "🔥", siprelServiceId: "ZETA_GAS" },

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
  { id: "movistar", name: "Movistar", category: "Teléfono móvil", providers: ["siprel", "evoluciona"], logoEmoji: "📱", siprelServiceId: "MOVISTAR", evolucionaServiceId: "MOVISTAR" },

  // ── PRÉSTAMOS ─────────────────────────────────────────────────────────────
  { id: "kueski", name: "Kueski", category: "Préstamos", providers: ["siprel"], logoEmoji: "💳", siprelServiceId: "KUESKI" },
  { id: "konfio",  name: "Konfío",  category: "Préstamos", providers: ["siprel"], logoEmoji: "💳", siprelServiceId: "KONFIO" },

  // ── SEGUROS ───────────────────────────────────────────────────────────────
  { id: "gnp", name: "GNP Seguros", category: "Seguro", providers: ["siprel"], logoEmoji: "🛡️", siprelServiceId: "GNP" },
  { id: "hdi", name: "HDI Seguros", category: "Seguro", providers: ["siprel"], logoEmoji: "🛡️", siprelServiceId: "HDI" },

  // ── EDUCACIÓN ─────────────────────────────────────────────────────────────
  { id: "sep", name: "SEP / IMSS", category: "Escuela", providers: ["siprel"], logoEmoji: "🎓", siprelServiceId: "SEP" },

  // ── RENTA ─────────────────────────────────────────────────────────────────
  { id: "renta_pagoseguro", name: "PagoSeguro (Renta)", category: "Renta", providers: ["siprel"], logoEmoji: "🏠", siprelServiceId: "PAGOSEGURO_RENTA" },
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
