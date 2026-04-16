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
  // LUZ
  { id: "cfe", name: "CFE", category: "Luz", providers: ["siprel", "evoluciona"], logoEmoji: "⚡", siprelServiceId: "CFE", evolucionaServiceId: "CFE_LUZ", minReferencia: 12 },

  // AGUA
  { id: "sacmex", name: "SACMEX", category: "Agua", providers: ["siprel"], logoEmoji: "💧", siprelServiceId: "SACMEX" },
  { id: "agua_jalisco", name: "SIAPA Jalisco", category: "Agua", providers: ["siprel"], logoEmoji: "💧", siprelServiceId: "SIAPA" },

  // GAS
  { id: "gas_natural", name: "Gas Natural Fenosa", category: "Gas", providers: ["evoluciona"], logoEmoji: "🔥", evolucionaServiceId: "GAS_NATURAL" },
  { id: "zeta_gas", name: "Zeta Gas", category: "Gas", providers: ["siprel"], logoEmoji: "🔥", siprelServiceId: "ZETA_GAS" },

  // INTERNET
  { id: "izzi", name: "Izzi", category: "Internet", providers: ["siprel", "evoluciona"], logoEmoji: "📡", siprelServiceId: "IZZI", evolucionaServiceId: "IZZI_INTERNET" },
  { id: "totalplay", name: "Totalplay", category: "Internet", providers: ["siprel"], logoEmoji: "📡", siprelServiceId: "TOTALPLAY" },
  { id: "megacable", name: "Megacable", category: "Internet", providers: ["siprel", "evoluciona"], logoEmoji: "📡", siprelServiceId: "MEGACABLE", evolucionaServiceId: "MEGACABLE" },
  { id: "telmex_internet", name: "Telmex Internet", category: "Internet", providers: ["siprel", "evoluciona"], logoEmoji: "📡", siprelServiceId: "TELMEX_INFINITUM", evolucionaServiceId: "TELMEX_INTERNET" },
  { id: "starlink", name: "Starlink", category: "Internet", providers: ["evoluciona"], logoEmoji: "🛰️", evolucionaServiceId: "STARLINK" },

  // CABLE
  { id: "sky", name: "Sky", category: "Cable", providers: ["siprel", "evoluciona"], logoEmoji: "📺", siprelServiceId: "SKY", evolucionaServiceId: "SKY_TV" },
  { id: "dish", name: "Dish", category: "Cable", providers: ["siprel"], logoEmoji: "📺", siprelServiceId: "DISH" },

  // TELÉFONO MÓVIL
  { id: "telcel", name: "Telcel", category: "Teléfono móvil", providers: ["siprel", "evoluciona"], logoEmoji: "📱", siprelServiceId: "TELCEL", evolucionaServiceId: "TELCEL" },
  { id: "telcel_recarga", name: "Telcel Recarga", category: "Teléfono móvil", providers: ["siprel", "evoluciona"], logoEmoji: "📱", siprelServiceId: "TELCEL_RECARGA", evolucionaServiceId: "TELCEL_RECARGA", minAmount: 30 },
  { id: "at_and_t", name: "AT&T", category: "Teléfono móvil", providers: ["siprel", "evoluciona"], logoEmoji: "📱", siprelServiceId: "ATT", evolucionaServiceId: "ATT" },
  { id: "movistar", name: "Movistar", category: "Teléfono móvil", providers: ["siprel", "evoluciona"], logoEmoji: "📱", siprelServiceId: "MOVISTAR", evolucionaServiceId: "MOVISTAR" },
  { id: "telmex_fijo", name: "Telmex", category: "Teléfono móvil", providers: ["siprel", "evoluciona"], logoEmoji: "☎️", siprelServiceId: "TELMEX_FIJO", evolucionaServiceId: "TELMEX_FIJO" },

  // STREAMING
  { id: "netflix", name: "Netflix", category: "Streaming", providers: ["evoluciona"], logoEmoji: "🎬", evolucionaServiceId: "NETFLIX" },
  { id: "spotify", name: "Spotify", category: "Streaming", providers: ["evoluciona"], logoEmoji: "🎵", evolucionaServiceId: "SPOTIFY" },
  { id: "disney_plus", name: "Disney+", category: "Streaming", providers: ["evoluciona"], logoEmoji: "🏰", evolucionaServiceId: "DISNEY_PLUS" },
  { id: "hbo_max", name: "Max (HBO)", category: "Streaming", providers: ["evoluciona"], logoEmoji: "🎭", evolucionaServiceId: "HBO_MAX" },

  // PRÉSTAMOS
  { id: "kueski", name: "Kueski", category: "Préstamos", providers: ["siprel"], logoEmoji: "💳", siprelServiceId: "KUESKI" },
  { id: "konfio", name: "Konfío", category: "Préstamos", providers: ["siprel"], logoEmoji: "💳", siprelServiceId: "KONFIO" },

  // SEGURO
  { id: "gnp", name: "GNP Seguros", category: "Seguro", providers: ["siprel"], logoEmoji: "🛡️", siprelServiceId: "GNP" },
  { id: "hdi", name: "HDI Seguros", category: "Seguro", providers: ["siprel"], logoEmoji: "🛡️", siprelServiceId: "HDI" },

  // ESCUELA
  { id: "sep", name: "SEP / IMSS", category: "Escuela", providers: ["siprel"], logoEmoji: "🎓", siprelServiceId: "SEP" },

  // RENTA
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
