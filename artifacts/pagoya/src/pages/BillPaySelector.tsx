import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, ArrowRight, Search, Zap, Camera, X, CheckCircle } from "lucide-react";
import { usePayment } from "@/context/PaymentContext";

// ---------------------------------------------------------------------------
// Service catalog (local copy — kept in sync with api-server catalog)
// referenceDigits: minimum consecutive digits required (used for barcode extraction and validation)
// minAmount: minimum payment amount in MXN
// ---------------------------------------------------------------------------
const SERVICES = [
  // ── Luz ──────────────────────────────────────────────────────────────────
  { id: "cfe",              name: "CFE",                 category: "Luz",             emoji: "⚡", referenceDigits: 12 },
  // ── Agua ─────────────────────────────────────────────────────────────────
  { id: "sacmex",           name: "SACMEX",              category: "Agua",            emoji: "💧" },
  { id: "agua_jalisco",     name: "SIAPA Jalisco",        category: "Agua",            emoji: "💧" },
  { id: "agua_monterrey",   name: "SADM Monterrey",       category: "Agua",            emoji: "💧" },
  { id: "seapal",           name: "SEAPAL Vallarta",      category: "Agua",            emoji: "💧", minReferencia: 28, maxReferencia: 28 },
  // ── Gas ──────────────────────────────────────────────────────────────────
  { id: "gas_natural",      name: "Gas Natural",          category: "Gas",             emoji: "🔥", minReferencia: 14, maxReferencia: 28 },
  { id: "ecogas",           name: "Ecogas",               category: "Gas",             emoji: "🔥" },
  { id: "mexicana_gas",     name: "Mexicana de Gas",      category: "Gas",             emoji: "🔥" },
  { id: "naturgy",          name: "Naturgy",               category: "Gas",             emoji: "🔥" },
  // ── Internet ─────────────────────────────────────────────────────────────
  { id: "megacable",        name: "Megacable",            category: "Internet",        emoji: "📡" },
  { id: "telmex_internet",  name: "Telmex Internet",      category: "Internet",        emoji: "📡" },
  { id: "izzi",             name: "Izzi",                 category: "Internet",        emoji: "📡", minReferencia: 8,  maxReferencia: 8  },
  { id: "totalplay",        name: "TotalPlay",            category: "Internet",        emoji: "📡", minReferencia: 17, maxReferencia: 17 },
  { id: "starlink",         name: "Starlink",             category: "Internet",        emoji: "🛰️" },
  // ── Cable ────────────────────────────────────────────────────────────────
  { id: "sky",              name: "Sky",                  category: "Cable",           emoji: "📺" },
  { id: "dish",             name: "Dish",                 category: "Cable",           emoji: "📺" },
  { id: "maxcom",           name: "Maxcom",               category: "Cable",           emoji: "📺" },
  // ── Teléfono ─────────────────────────────────────────────────────────────
  { id: "telcel",           name: "Telcel",               category: "Teléfono móvil",  emoji: "📱" },
  { id: "telcel_recarga",   name: "Telcel Recarga",       category: "Teléfono móvil",  emoji: "📱", minAmount: 30 },
  { id: "at_and_t",         name: "AT&T",                 category: "Teléfono móvil",  emoji: "📱" },
  { id: "movistar",         name: "Movistar Factura",     category: "Teléfono móvil",  emoji: "📱" },
  { id: "telmex_fijo",      name: "Telmex Fijo",          category: "Teléfono móvil",  emoji: "☎️", referenceDigits: 12 },
  // ── Streaming — gift card PIN flow ───────────────────────────────────────
  { id: "netflix",          name: "Netflix",              category: "Streaming",       emoji: "🎬" },
  { id: "spotify",          name: "Spotify",              category: "Streaming",       emoji: "🎵" },
  { id: "disney_plus",      name: "Disney+",              category: "Streaming",       emoji: "🏰" },
  { id: "hbo_max",          name: "Max (HBO)",            category: "Streaming",       emoji: "🎭" },
  // ── Gift Cards — Entretenimiento ─────────────────────────────────────────
  { id: "cinepolis",        name: "Cinépolis",            category: "Entretenimiento", emoji: "🎟️" },
  { id: "gplay",            name: "Google Play",          category: "Entretenimiento", emoji: "🎮" },
  // ── Gift Cards — Conveniencia ─────────────────────────────────────────────
  { id: "uber",             name: "Uber",                 category: "Conveniencia",    emoji: "🚗" },
  { id: "uber_eats",        name: "Uber Eats",            category: "Conveniencia",    emoji: "🍔" },
  { id: "amazon",           name: "Amazon",               category: "Conveniencia",    emoji: "📦" },
  // ── Gift Cards — Tiendas ─────────────────────────────────────────────────
  { id: "starbucks",        name: "Starbucks",            category: "Tiendas",         emoji: "☕" },
  { id: "liverpool",        name: "Liverpool",            category: "Tiendas",         emoji: "🛍️" },
  { id: "soriana",          name: "Soriana",              category: "Tiendas",         emoji: "🛒" },
  // ── Préstamos ─────────────────────────────────────────────────────────────
  { id: "infonavit",        name: "Infonavit",            category: "Préstamos",       emoji: "🏠" },
  // ── Cross-sell (external redirect — not a SIPREL payment) ─────────────────
  { id: "renta_pagoseguro", name: "Pago de Renta",        category: "Renta",           emoji: "🏡", crossSellUrl: "https://pagoseguromx.com" },
] as const;

type Service = (typeof SERVICES)[number];

// ---------------------------------------------------------------------------
// Gift-card-only services: no reference number — user picks a denomination
// and receives a PIN code via WhatsApp to redeem on the platform.
// ---------------------------------------------------------------------------
const GIFT_CARD_SERVICE_IDS = new Set([
  "netflix", "spotify", "disney_plus", "hbo_max",
  "amazon", "gplay", "uber", "uber_eats",
  "cinepolis", "starbucks", "liverpool", "soriana",
]);

interface GCDenomination { serviceId: string; amount: number; label?: string }

// Mexico market denominations — aligned with OXXO / SIPREL prepaid catalog
const GIFT_CARD_DENOMINATIONS: Record<string, GCDenomination[]> = {
  // ── Streaming ────────────────────────────────────────────────────────────
  netflix: [
    { serviceId: "netflix_100",  amount: 100 },
    { serviceId: "netflix_200",  amount: 200 },
    { serviceId: "netflix_300",  amount: 300,  label: "Básico ~3 meses" },
    { serviceId: "netflix_400",  amount: 400 },
    { serviceId: "netflix_500",  amount: 500,  label: "Estándar ~2 meses" },
    { serviceId: "netflix_700",  amount: 700,  label: "Premium ~2 meses" },
  ],
  spotify: [
    { serviceId: "spotify_79",   amount: 79,   label: "Individual ~1 mes" },
    { serviceId: "spotify_99",   amount: 99 },
    { serviceId: "spotify_149",  amount: 149,  label: "Dúo ~1 mes" },
    { serviceId: "spotify_199",  amount: 199,  label: "Familiar ~1 mes" },
  ],
  disney_plus: [
    { serviceId: "disney_99",    amount: 99 },
    { serviceId: "disney_139",   amount: 139,  label: "Standard ~1 mes" },
    { serviceId: "disney_209",   amount: 209 },
    { serviceId: "disney_279",   amount: 279,  label: "Premium ~1 mes" },
  ],
  hbo_max: [
    { serviceId: "hbo_max_109",  amount: 109 },
    { serviceId: "hbo_max_169",  amount: 169,  label: "Básico ~1 mes" },
    { serviceId: "hbo_max_219",  amount: 219,  label: "Estándar ~1 mes" },
    { serviceId: "hbo_max_279",  amount: 279,  label: "Ultimate ~1 mes" },
  ],
  // ── Digital Gift Cards ───────────────────────────────────────────────────
  amazon: [
    { serviceId: "amazon_100",   amount: 100 },
    { serviceId: "amazon_200",   amount: 200 },
    { serviceId: "amazon_300",   amount: 300 },
    { serviceId: "amazon_500",   amount: 500 },
    { serviceId: "amazon_1000",  amount: 1000 },
  ],
  gplay: [
    { serviceId: "google_play_50",  amount: 50 },
    { serviceId: "google_play_100", amount: 100 },
    { serviceId: "google_play_200", amount: 200 },
    { serviceId: "google_play_300", amount: 300 },
    { serviceId: "google_play_500", amount: 500 },
  ],
  uber: [
    { serviceId: "uber_100",     amount: 100 },
    { serviceId: "uber_150",     amount: 150 },
    { serviceId: "uber_200",     amount: 200 },
    { serviceId: "uber_300",     amount: 300 },
    { serviceId: "uber_500",     amount: 500 },
  ],
  uber_eats: [
    { serviceId: "uber_eats_100", amount: 100 },
    { serviceId: "uber_eats_200", amount: 200 },
    { serviceId: "uber_eats_300", amount: 300 },
  ],
  cinepolis: [
    { serviceId: "cinepolis_100", amount: 100,  label: "~1 boleto regular" },
    { serviceId: "cinepolis_140", amount: 140,  label: "~1 boleto 3D" },
    { serviceId: "cinepolis_165", amount: 165,  label: "~1 boleto IMAX" },
    { serviceId: "cinepolis_210", amount: 210,  label: "~2 boletos regular" },
    { serviceId: "cinepolis_280", amount: 280,  label: "~2 boletos 3D" },
  ],
  starbucks: [
    { serviceId: "starbucks_100", amount: 100 },
    { serviceId: "starbucks_200", amount: 200 },
    { serviceId: "starbucks_300", amount: 300 },
    { serviceId: "starbucks_500", amount: 500 },
  ],
  liverpool: [
    { serviceId: "liverpool_500",  amount: 500 },
    { serviceId: "liverpool_1000", amount: 1000 },
    { serviceId: "liverpool_2000", amount: 2000 },
    { serviceId: "liverpool_3000", amount: 3000, label: "Electrónica / Moda" },
    { serviceId: "liverpool_5000", amount: 5000, label: "Electrodomésticos / TV" },
  ],
  soriana: [
    { serviceId: "soriana_200",  amount: 200 },
    { serviceId: "soriana_500",  amount: 500 },
    { serviceId: "soriana_1000", amount: 1000 },
    { serviceId: "soriana_2000", amount: 2000, label: "Despensa grande" },
  ],
};

const CATEGORIES = ["Todos", "Luz", "Agua", "Gas", "Internet", "Cable", "Teléfono móvil", "Streaming", "Entretenimiento", "Conveniencia", "Tiendas", "Préstamos", "Seguro", "Escuela", "Renta"] as const;

// ---------------------------------------------------------------------------
// Barcode extraction helper
// ---------------------------------------------------------------------------
function extractReference(rawText: string, svc: Service): string {
  if ("referenceDigits" in svc && svc.referenceDigits) {
    const n = svc.referenceDigits;
    // CFE / Telmex: Code 128 barcodes encode a string containing the N-digit service number.
    // We extract the first run of N or more consecutive digits and take the first N.
    // Adjust the regex/slice if the carrier changes their barcode format.
    const match = rawText.match(/\d{12,}/);
    if (match) return match[0].slice(0, n);
    // Fallback: strip non-digits and take first N
    const digits = rawText.replace(/\D/g, "");
    return digits.slice(0, n);
  }
  // Variable-length services: accept the full decoded string trimmed of whitespace
  return rawText.trim();
}

// ---------------------------------------------------------------------------
// Corner bracket CSS animation injected once per mount
// ---------------------------------------------------------------------------
const SCANNER_STYLE = `
@keyframes pago-corner-pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.45; }
}
.pago-corner { animation: pago-corner-pulse 1.4s ease-in-out infinite; }
@keyframes pago-scan-line {
  0%   { top: 12%; }
  100% { top: 88%; }
}
.pago-scan-line { animation: pago-scan-line 1.8s linear infinite alternate; }
@keyframes pago-ref-flash {
  0%   { box-shadow: 0 0 0 0 rgba(29,158,117,0.8); border-color: #1D9E75; }
  70%  { box-shadow: 0 0 0 8px rgba(29,158,117,0); border-color: #1D9E75; }
  100% { box-shadow: none; border-color: #D4EDDA; }
}
.pago-ref-flash { animation: pago-ref-flash 1s ease-out forwards; }
`;

function useInjectStyle() {
  useEffect(() => {
    const id = "pago-scanner-styles";
    if (!document.getElementById(id)) {
      const el = document.createElement("style");
      el.id = id;
      el.textContent = SCANNER_STYLE;
      document.head.appendChild(el);
    }
  }, []);
}

// ---------------------------------------------------------------------------
// BarcodeScanner overlay component
// ---------------------------------------------------------------------------
interface BarcodeScannerProps {
  onDetected: (raw: string) => void;
  onClose: () => void;
}

function BarcodeScanner({ onDetected, onClose }: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<import("@zxing/library").BrowserMultiFormatReader | null>(null);
  const hasDetectedRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [cameraError, setCameraError] = useState<string | null>(null);
  const [timedOut, setTimedOut] = useState(false);

  const stopScanner = useCallback(() => {
    if (readerRef.current) {
      readerRef.current.reset();
      readerRef.current = null;
    }
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function startScanner() {
      try {
        const { BrowserMultiFormatReader } = await import("@zxing/library");
        const reader = new BrowserMultiFormatReader();
        readerRef.current = reader;

        await reader.decodeFromVideoDevice(null, videoRef.current!, (result, err) => {
          if (cancelled || hasDetectedRef.current) return;

          if (result) {
            // Debounce: only use the first detection
            hasDetectedRef.current = true;
            stopScanner();
            onDetected(result.getText());
            return;
          }

          // NotFoundException fires continuously when no barcode in frame — ignore it
          if (err) {
            const name = (err as Error).name ?? "";
            if (name !== "NotFoundException") {
              // Real error (e.g. stream ended unexpectedly) — surface to user
              console.warn("[BarcodeScanner]", err);
            }
          }
        });

        // 15-second timeout: close if no code detected
        timeoutRef.current = setTimeout(() => {
          if (!hasDetectedRef.current && !cancelled) {
            stopScanner();
            setTimedOut(true);
          }
        }, 15_000);
      } catch (err: unknown) {
        if (cancelled) return;
        const msg = (err as Error)?.message ?? "";
        if (msg.toLowerCase().includes("permission") || msg.toLowerCase().includes("denied") || msg.toLowerCase().includes("notallowed")) {
          setCameraError("Activa el acceso a la cámara en tu navegador / Enable camera access in your browser");
        } else {
          setCameraError("No se pudo acceder a la cámara / Camera not available");
        }
      }
    }

    startScanner();
    return () => {
      cancelled = true;
      stopScanner();
    };
  }, [onDetected, stopScanner]);

  if (cameraError) {
    return (
      <div
        className="fixed inset-0 z-50 flex flex-col items-center justify-center px-6 text-center"
        style={{ background: "rgba(10,37,64,0.97)" }}
      >
        <div className="text-4xl mb-4">📷</div>
        <p className="text-white text-sm font-semibold mb-1">Acceso a cámara denegado</p>
        <p className="text-white/70 text-xs mb-6">{cameraError}</p>
        <button
          onClick={onClose}
          className="px-6 py-2.5 rounded-xl text-sm font-bold"
          style={{ background: "#1D9E75", color: "white" }}
        >
          Cerrar / Close
        </button>
      </div>
    );
  }

  if (timedOut) {
    return (
      <div
        className="fixed inset-0 z-50 flex flex-col items-center justify-center px-6 text-center"
        style={{ background: "rgba(10,37,64,0.97)" }}
      >
        <div className="text-4xl mb-4">⏱️</div>
        <p className="text-white text-sm font-semibold mb-1">No se detectó código</p>
        <p className="text-white/70 text-xs mb-6">No barcode detected — intenta manualmente / try manually</p>
        <button
          onClick={onClose}
          className="px-6 py-2.5 rounded-xl text-sm font-bold"
          style={{ background: "#1D9E75", color: "white" }}
        >
          Cerrar / Close
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "#0A2540" }}>
      {/* Video fill */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover opacity-80"
        muted
        playsInline
      />

      {/* Dark vignette overlay */}
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at center, transparent 38%, rgba(10,37,64,0.82) 100%)" }} />

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-5 pt-12 pb-4">
        <p className="text-white font-bold text-base">Escanear código</p>
        <button onClick={onClose} className="p-2 rounded-full" style={{ background: "rgba(255,255,255,0.12)" }}>
          <X className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Viewfinder */}
      <div className="relative z-10 flex-1 flex items-center justify-center">
        <div className="relative" style={{ width: 260, height: 160 }}>
          {/* Corner brackets */}
          {(["tl", "tr", "bl", "br"] as const).map((pos) => (
            <span
              key={pos}
              className="pago-corner absolute"
              style={{
                width: 28,
                height: 28,
                borderColor: "#1D9E75",
                borderStyle: "solid",
                borderWidth: 0,
                ...(pos === "tl" ? { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3 } : {}),
                ...(pos === "tr" ? { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3 } : {}),
                ...(pos === "bl" ? { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3 } : {}),
                ...(pos === "br" ? { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3 } : {}),
              }}
            />
          ))}

          {/* Scanning line */}
          <div
            className="pago-scan-line absolute left-2 right-2"
            style={{
              height: 2,
              background: "linear-gradient(90deg, transparent, #1D9E75, transparent)",
              borderRadius: 2,
              position: "absolute",
            }}
          />
        </div>
      </div>

      {/* Bottom info */}
      <div className="relative z-10 px-6 pb-12 text-center">
        <p className="text-white/80 text-xs mb-2">Apunta la cámara al código de barras en tu recibo</p>
        <p className="text-white/50 text-xs mb-6">Point camera at the barcode on your bill</p>
        <button
          onClick={onClose}
          className="px-8 py-3 rounded-2xl text-sm font-bold transition-all active:scale-[0.97]"
          style={{ background: "rgba(255,255,255,0.12)", color: "white", border: "1px solid rgba(255,255,255,0.2)" }}
        >
          Cancelar / Cancel
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function BillPaySelector() {
  useInjectStyle();

  const [, navigate] = useLocation();
  const { setPaymentData, paymentData } = usePayment();

  // Step 1 — service selection
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<typeof CATEGORIES[number]>("Todos");

  // Step 2 — denomination (gift cards) or reference (bill pay)
  const [step, setStep] = useState<"select" | "denomination" | "reference">("select");
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [referencia, setReferencia] = useState("");
  const [referenciaFlash, setReferenciaFlash] = useState(false);
  const [refError, setRefError] = useState<string | null>(null);

  // Scanner
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);

  // Bonus-wallet indicator: show banner if user has wallet balance but no completed payments yet
  const [showBonusBanner, setShowBonusBanner] = useState(false);
  useEffect(() => {
    const phone = (() => { try { return localStorage.getItem("pagoya_telefono") || localStorage.getItem("pagoya_phone") || ""; } catch { return ""; } })();
    if (!phone) return;
    const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
    Promise.all([
      fetch(`${BASE}/api/wallet/balance?telefono=${encodeURIComponent(phone)}`).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`${BASE}/api/pagoya/historial?telefono=${encodeURIComponent(phone)}&limit=1`).then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([bal, hist]) => {
      const balance = bal?.balance ?? bal?.balanceMXN ?? 0;
      const hasCompletedPayment = Array.isArray(hist) && hist.some((r: { status: string }) =>
        r.status === "completed" || r.status === "confirmed" || r.status === "confirmado" || r.status === "success"
      );
      if (balance > 0 && !hasCompletedPayment) setShowBonusBanner(true);
    });
  }, []);

  // Recently-paid services (H6)
  const [recentServices, setRecentServices] = useState<{ name: string; emoji: string; id: string }[]>([]);
  useEffect(() => {
    const phone = (() => { try { return localStorage.getItem("pagoya_phone") ?? ""; } catch { return ""; } })();
    if (!phone) return;
    const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
    fetch(`${BASE}/api/pagoya/historial?telefono=${encodeURIComponent(phone)}&limit=20`)
      .then((r) => r.ok ? r.json() : null)
      .catch(() => null)
      .then((rows: null | Array<{ service_name: string; status: string }>) => {
        if (!rows) return;
        const seen = new Set<string>();
        const recent: { name: string; emoji: string; id: string }[] = [];
        for (const row of rows) {
          if (row.status !== "completed" && row.status !== "confirmado" && row.status !== "success") continue;
          if (seen.has(row.service_name)) continue;
          const match = SERVICES.find((s) => s.name === row.service_name);
          if (!match) continue;
          seen.add(row.service_name);
          recent.push({ name: match.name, emoji: match.emoji, id: match.id });
          if (recent.length >= 3) break;
        }
        setRecentServices(recent);
      });
  }, []);

  // ── Step 1 helpers ──────────────────────────────────────────────────────
  const filtered = SERVICES.filter((s) => {
    const matchCat = activeCategory === "Todos" || s.category === activeCategory;
    const matchSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.category.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const handleSelectService = (svc: Service) => {
    // Cross-sell services open an external URL instead of the payment flow
    if ("crossSellUrl" in svc && svc.crossSellUrl) {
      // Log behavioral signal for PTI scoring (fire-and-forget)
      try {
        const tel = phone || localStorage.getItem("pagoya_telefono") || "";
        if (tel) {
          const BASE = (import.meta.env.BASE_URL ?? "").replace(/\/$/, "");
          fetch(`${BASE}/api/events`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ telefono: tel, event_type: "pago_seguro_click", metadata: { service_id: svc.id, url: svc.crossSellUrl } }),
          }).catch(() => {});
        }
      } catch {}
      window.open(svc.crossSellUrl as string, "_blank", "noopener,noreferrer");
      return;
    }
    // Track high-value service selection intent for PTI scoring (fire-and-forget)
    const HIGH_VALUE_CATS = new Set(["Gas", "Renta", "Seguro", "Predial"]);
    if (HIGH_VALUE_CATS.has((svc as { category?: string }).category ?? "")) {
      try {
        const tel = phone || localStorage.getItem("pagoya_telefono") || "";
        if (tel) {
          const BASE = (import.meta.env.BASE_URL ?? "").replace(/\/$/, "");
          fetch(`${BASE}/api/events`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ telefono: tel, event_type: "high_value_intent_click", metadata: { service_id: svc.id, category: (svc as { category?: string }).category } }),
          }).catch(() => {});
        }
      } catch {}
    }
    setSelectedService(svc);
    setReferencia("");
    setRefError(null);
    if (GIFT_CARD_SERVICE_IDS.has(svc.id as string)) {
      setStep("denomination");
    } else {
      setStep("reference");
    }
  };

  // ── Gift card denomination handler ──────────────────────────────────────
  const handleSelectDenomination = (den: GCDenomination) => {
    if (!selectedService) return;
    setPaymentData({
      ...paymentData,
      empresa: selectedService.name,
      categoria: den.serviceId,
      monto: String(den.amount),
      referencia: "",
    });
    navigate("/revisar");
  };

  // ── Step 2 helpers ──────────────────────────────────────────────────────
  const handleScanDetected = useCallback((rawText: string) => {
    if (!selectedService) return;
    const extracted = extractReference(rawText, selectedService);
    setReferencia(extracted);
    setScannerOpen(false);
    setScanSuccess(true);
    // Flash the input border teal for 1 second
    setReferenciaFlash(true);
    setTimeout(() => setReferenciaFlash(false), 1100);
    setTimeout(() => setScanSuccess(false), 2500);
  }, [selectedService]);

  const handleContinue = () => {
    if (!selectedService) return;

    const trimmed = referencia.trim();
    if (!trimmed) {
      setRefError("Ingresa el número de referencia / Enter reference number");
      return;
    }

    // ── Length validation (minReferencia / maxReferencia) ─────────────────────
    const svc = selectedService as { minReferencia?: number; maxReferencia?: number; referenceDigits?: number };
    const minLen = svc.minReferencia ?? svc.referenceDigits ?? null;
    const maxLen = svc.maxReferencia ?? (svc.referenceDigits ? svc.referenceDigits : null);
    const digits = trimmed.replace(/\D/g, "");
    const len    = digits.length || trimmed.length; // prefer digits-only count; fall back to raw length

    if (minLen !== null && maxLen !== null && minLen === maxLen) {
      // Exact length required (e.g. SEAPAL = 28, Izzi = 8)
      if (len !== minLen) {
        setRefError(
          `La referencia debe tener exactamente ${minLen} dígitos / Reference must be exactly ${minLen} digits`
        );
        return;
      }
    } else {
      if (minLen !== null && len < minLen) {
        setRefError(`Mínimo ${minLen} dígitos / Minimum ${minLen} digits`);
        return;
      }
      if (maxLen !== null && len > maxLen) {
        setRefError(`Máximo ${maxLen} dígitos / Maximum ${maxLen} digits`);
        return;
      }
    }

    setRefError(null);

    setPaymentData({
      ...paymentData,
      empresa: selectedService.name,
      categoria: selectedService.category,
      referencia: trimmed,
    });
    navigate("/pagar");
  };

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <>
      {/* Barcode scanner overlay (portal-style, mounted over everything) */}
      {scannerOpen && (
        <BarcodeScanner
          onDetected={handleScanDetected}
          onClose={() => setScannerOpen(false)}
        />
      )}

      <div className="min-h-screen flex flex-col" style={{ background: "#F7F7F7" }}>
        {/* ── HEADER ─────────────────────────────────────────────────── */}
        <header
          className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3"
          style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}
        >
          <button
            onClick={() => {
              if (step === "reference" || step === "denomination") {
                setStep("select");
              } else {
                navigate("/");
              }
            }}
            className="p-2 rounded-xl transition-all active:scale-[0.92]"
            style={{ background: "#F0FAF3" }}
          >
            <ArrowLeft className="w-5 h-5" style={{ color: "#046C2C" }} />
          </button>
          <div>
            {step === "select" && (
              <>
                <h1 className="text-base font-black text-[#1F1F1F] leading-tight">Elige tu servicio</h1>
                <p className="text-xs text-gray-400">Selecciona para continuar con el pago</p>
              </>
            )}
            {step === "denomination" && (
              <>
                <h1 className="text-base font-black text-[#1F1F1F] leading-tight">
                  {selectedService?.emoji} {selectedService?.name}
                </h1>
                <p className="text-xs text-gray-400">Elige el monto · PIN llega por WhatsApp</p>
              </>
            )}
            {step === "reference" && (
              <>
                <h1 className="text-base font-black text-[#1F1F1F] leading-tight">
                  {selectedService?.emoji} {selectedService?.name}
                </h1>
                <p className="text-xs text-gray-400">Ingresa o escanea tu número de referencia</p>
              </>
            )}
          </div>
        </header>

        {/* ── STEP 1: SERVICE SELECTION ──────────────────────────────── */}
        {step === "select" && (
          <main className="flex-1 flex flex-col">
            {/* ── Bonus wallet indicator ────────────────────────────────── */}
            {showBonusBanner && (
              <div className="px-4 pt-4 max-w-sm mx-auto w-full">
                <div style={{
                  background: "linear-gradient(135deg, #004F2D 0%, #046C2C 100%)",
                  borderRadius: "14px",
                  padding: "14px 16px",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  border: "1px solid rgba(110,245,176,0.20)",
                }}>
                  <span style={{ fontSize: "24px", flexShrink: 0 }}>💰</span>
                  <div>
                    <p style={{ margin: 0, fontSize: "13px", fontWeight: 800, color: "#FFFFFF", lineHeight: 1.3 }}>
                      Tienes $150 MXN de bienvenida — úsalos en tu primer pago
                    </p>
                    <p style={{ margin: "3px 0 0", fontSize: "11px", color: "rgba(255,255,255,0.65)", lineHeight: 1.3 }}>
                      Sin necesidad de ir al OXXO primero
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ── Recently paid chips (H6) ──────────────────────────────── */}
            {recentServices.length > 0 && (
              <div className="px-4 pt-4 pb-1 max-w-sm mx-auto w-full">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
                  Mis servicios frecuentes
                </p>
                <div className="flex gap-2 flex-wrap">
                  {recentServices.map((svc) => {
                    const match = SERVICES.find((s) => s.id === svc.id);
                    if (!match) return null;
                    return (
                      <button
                        key={svc.id}
                        onClick={() => handleSelectService(match)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all active:scale-[0.95]"
                        style={{
                          background: "#F0FAF3",
                          border: "1.5px solid #CBE9D9",
                          color: "#046C2C",
                        }}
                      >
                        <span>{svc.emoji}</span>
                        <span>{svc.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Search bar */}
            <div className="px-4 pt-5 pb-3 max-w-sm mx-auto w-full">
              <div
                className="flex items-center gap-3 rounded-2xl px-4 py-3"
                style={{
                  background: "white",
                  border: "1.5px solid #D4EDDA",
                  boxShadow: "0 2px 8px rgba(4,108,44,0.06)",
                }}
              >
                <Search className="w-4 h-4 flex-shrink-0" style={{ color: "#39A935" }} />
                <input
                  type="text"
                  placeholder="Buscar servicio..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="flex-1 text-sm text-[#1F1F1F] outline-none bg-transparent"
                />
              </div>
            </div>

            {/* Category chips */}
            <div className="px-4 pb-4 overflow-x-auto" style={{ position: "relative" }}>
              <div
                style={{
                  position: "absolute", top: 0, right: 0, bottom: 0, width: "40px",
                  background: "linear-gradient(to right, transparent, #F7F7F7)",
                  pointerEvents: "none", zIndex: 1,
                }}
              />
              <div className="flex gap-2 max-w-sm mx-auto" style={{ width: "max-content" }}>
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all active:scale-[0.95]"
                    style={{
                      background: activeCategory === cat ? "#046C2C" : "#F0FAF3",
                      color: activeCategory === cat ? "white" : "#046C2C",
                      border: `1.5px solid ${activeCategory === cat ? "#046C2C" : "#D4EDDA"}`,
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Service grid */}
            <div className="px-4 pb-10 max-w-sm mx-auto w-full">
              {filtered.length === 0 ? (
                <div className="text-center py-16">
                  <div className="text-4xl mb-3">🔍</div>
                  <p className="text-sm text-gray-400">No encontramos "{search}"</p>
                  <p className="text-xs text-gray-300 mt-1">Intenta con otro término</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {filtered.map((svc) => (
                    <button
                      key={svc.id}
                      onClick={() => handleSelectService(svc)}
                      className="bg-white rounded-2xl px-5 py-4 flex items-center gap-4 text-left w-full transition-all active:scale-[0.98]"
                      style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)", border: "1px solid #F0F0F0" }}
                    >
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-xl"
                        style={{ background: "#F0FAF3" }}
                      >
                        {svc.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-[#1F1F1F]">{svc.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {"crossSellUrl" in svc ? (
                            <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full" style={{ background: "#EEF2FF", color: "#4338CA", border: "1px solid #C7D2FE" }}>
                              🏡 pagoseguromx.com →
                            </span>
                          ) : GIFT_CARD_SERVICE_IDS.has(svc.id as string) ? (
                            <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full" style={{ background: "#FFF0E8", color: "#C45C1A", border: "1px solid #FFDCC9" }}>
                              🎁 Gift Card · PIN por WhatsApp
                            </span>
                          ) : (
                            <p className="text-xs text-gray-400">{svc.category}</p>
                          )}
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 flex-shrink-0" style={{ color: "#D4EDDA" }} />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Bottom banner */}
            <div
              className="mx-4 mb-8 max-w-sm mx-auto rounded-2xl p-5 flex items-center gap-4"
              style={{
                background: "linear-gradient(135deg, #046C2C 0%, #39A935 100%)",
                boxShadow: "0 6px 20px rgba(4,108,44,0.28)",
              }}
            >
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                <Zap className="w-5 h-5 text-white" strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-white text-sm font-bold leading-tight">¿No encuentras tu servicio?</p>
                <button
                  onClick={() => navigate("/pagar")}
                  className="text-white/80 text-xs underline mt-0.5"
                >
                  Captura manualmente →
                </button>
              </div>
            </div>
          </main>
        )}

        {/* ── STEP 2: DENOMINATION PICKER (gift cards) ────────────────── */}
        {step === "denomination" && selectedService && (() => {
          const dens = GIFT_CARD_DENOMINATIONS[selectedService.id as string] ?? [];
          return (
            <main className="flex-1 flex flex-col px-4 pt-6 pb-10 max-w-sm mx-auto w-full">
              {/* How it works explainer */}
              <div
                className="rounded-2xl px-4 py-4 mb-6 flex items-start gap-3"
                style={{ background: "linear-gradient(135deg, #F0FAF3 0%, #E8F7EE 100%)", border: "1px solid #CBE9D9" }}
              >
                <span className="text-xl flex-shrink-0 mt-0.5">🎁</span>
                <div>
                  <p className="text-sm font-bold text-[#046C2C] leading-tight mb-1">¿Cómo funciona?</p>
                  <p className="text-xs text-[#3A8A5A] leading-relaxed">
                    Elige el monto · Paga por OXXO, tarjeta o saldo · Recibe tu PIN por WhatsApp · Canjéalo en{" "}
                    <span className="font-semibold">{selectedService.name.toLowerCase().replace(/ /g, "")}.com</span>
                  </p>
                </div>
              </div>

              {/* Denomination list */}
              <div className="flex flex-col gap-3 mb-6">
                {dens.map((den) => (
                  <button
                    key={den.serviceId}
                    onClick={() => handleSelectDenomination(den)}
                    className="bg-white rounded-2xl px-5 py-4 flex items-center gap-4 text-left w-full transition-all active:scale-[0.98]"
                    style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)", border: "1.5px solid #F0F0F0" }}
                  >
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: "linear-gradient(135deg, #046C2C 0%, #39A935 100%)" }}
                    >
                      <span className="text-white font-black text-xs leading-tight text-center px-1">
                        ${den.amount >= 1000 ? `${den.amount / 1000}K` : den.amount}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-[#1F1F1F]">${den.amount} MXN</p>
                      {den.label && <p className="text-xs text-gray-400">{den.label}</p>}
                    </div>
                    <div
                      className="rounded-xl px-4 py-2 text-sm font-bold flex-shrink-0"
                      style={{ background: "#F0FAF3", color: "#046C2C", border: "1px solid #CBE9D9" }}
                    >
                      Comprar →
                    </div>
                  </button>
                ))}
              </div>

              <p className="text-center text-xs text-gray-400">
                🔒 Pago seguro · PIN enviado por WhatsApp en minutos
              </p>
            </main>
          );
        })()}

        {/* ── STEP 3: REFERENCE ENTRY (bill pay) ──────────────────────── */}
        {step === "reference" && selectedService && (
          <main className="flex-1 flex flex-col px-4 pt-6 pb-10 max-w-sm mx-auto w-full">
            {/* Service pill */}
            <div
              className="flex items-center gap-3 rounded-2xl px-4 py-3 mb-6"
              style={{ background: "white", border: "1px solid #F0F0F0", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg"
                style={{ background: "#F0FAF3" }}
              >
                {selectedService.emoji}
              </div>
              <div>
                <p className="text-sm font-bold text-[#1F1F1F]">{selectedService.name}</p>
                <p className="text-xs text-gray-400">{selectedService.category}</p>
              </div>
            </div>

            {/* Reference label */}
            <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
              Número de referencia / Reference number
            </p>

            {/* Reference input + camera button row */}
            <div className="flex items-center gap-2 mb-1">
              <div
                className="flex-1 relative"
              >
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder={(() => {
                    const s = selectedService as { minReferencia?: number; maxReferencia?: number; referenceDigits?: number };
                    const exact = s.minReferencia === s.maxReferencia && s.minReferencia ? s.minReferencia : (s.referenceDigits ?? null);
                    return exact ? `${"0".repeat(Math.min(exact, 20))}${exact > 20 ? "…" : ""} (${exact} dígitos)` : "Ej. 1234567890";
                  })()}
                  value={referencia}
                  onChange={(e) => {
                    setReferencia(e.target.value);
                    if (refError) setRefError(null);
                  }}
                  className={`w-full rounded-2xl px-4 py-3.5 text-sm text-[#1F1F1F] outline-none transition-all${referenciaFlash ? " pago-ref-flash" : ""}`}
                  style={{
                    background: "white",
                    border: `1.5px solid ${refError ? "#EF4444" : referenciaFlash ? "#1D9E75" : "#D4EDDA"}`,
                    boxShadow: "0 2px 8px rgba(4,108,44,0.06)",
                  }}
                />
                {/* Scan success checkmark */}
                {scanSuccess && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <CheckCircle className="w-5 h-5" style={{ color: "#1D9E75" }} />
                  </div>
                )}
              </div>

              {/* Camera / scan button */}
              <button
                onClick={() => setScannerOpen(true)}
                aria-label="Escanear código de barras"
                className="flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center transition-all active:scale-[0.92]"
                style={{
                  background: "#0A2540",
                  boxShadow: "0 4px 12px rgba(10,37,64,0.25)",
                }}
              >
                <Camera className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Validation error */}
            {refError && (
              <p className="text-xs text-red-500 mt-1 mb-0">{refError}</p>
            )}

            {/* Per-service reference hint */}
            {!refError && (() => {
              const s = selectedService as { id: string; minReferencia?: number; maxReferencia?: number };
              if (s.id === "seapal") return (
                <p className="text-xs mt-1.5" style={{ color: "#6B9980" }}>
                  📄 Escanea o escribe el código de barras de tu recibo SEAPAL — exactamente 28 dígitos
                </p>
              );
              if (s.minReferencia && s.maxReferencia && s.minReferencia === s.maxReferencia) return (
                <p className="text-xs mt-1.5" style={{ color: "#6B9980" }}>
                  Referencia de exactamente {s.minReferencia} dígitos requerida
                </p>
              );
              return null;
            })()}

            {/* Secondary scan text link */}
            <button
              onClick={() => setScannerOpen(true)}
              className="text-xs mt-2 mb-6 text-left transition-all active:opacity-70"
              style={{ color: "#1D9E75" }}
            >
              📷 Escanear / Scan — lee el código de barras de tu recibo
            </button>

            {"minAmount" in selectedService && selectedService.minAmount && (
              <div
                className="rounded-xl px-4 py-3 mb-6 flex items-start gap-2"
                style={{ background: "#FFF8E1", border: "1px solid #FBBF24" }}
              >
                <span className="text-sm">💡</span>
                <p className="text-xs text-yellow-800">
                  Monto mínimo para {selectedService.name}: ${selectedService.minAmount} MXN
                </p>
              </div>
            )}

            {/* Continue button */}
            <button
              onClick={handleContinue}
              className="w-full rounded-2xl py-4 text-sm font-black text-white transition-all active:scale-[0.97]"
              style={{
                background: "linear-gradient(135deg, #046C2C 0%, #39A935 100%)",
                boxShadow: "0 6px 20px rgba(4,108,44,0.28)",
              }}
            >
              Continuar →
            </button>

            <p className="text-center text-xs text-gray-400 mt-4">
              También puedes ingresar la referencia manualmente arriba
            </p>
          </main>
        )}
      </div>
    </>
  );
}
