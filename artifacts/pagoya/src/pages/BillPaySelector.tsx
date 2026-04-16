import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, ArrowRight, Search, Zap } from "lucide-react";
import { usePayment } from "@/context/PaymentContext";

const SERVICES = [
  { id: "cfe", name: "CFE", category: "Luz", emoji: "⚡" },
  { id: "sacmex", name: "SACMEX", category: "Agua", emoji: "💧" },
  { id: "agua_jalisco", name: "SIAPA Jalisco", category: "Agua", emoji: "💧" },
  { id: "gas_natural", name: "Gas Natural", category: "Gas", emoji: "🔥" },
  { id: "zeta_gas", name: "Zeta Gas", category: "Gas", emoji: "🔥" },
  { id: "izzi", name: "Izzi", category: "Internet", emoji: "📡" },
  { id: "totalplay", name: "Totalplay", category: "Internet", emoji: "📡" },
  { id: "megacable", name: "Megacable", category: "Internet", emoji: "📡" },
  { id: "telmex_internet", name: "Telmex Internet", category: "Internet", emoji: "📡" },
  { id: "starlink", name: "Starlink", category: "Internet", emoji: "🛰️" },
  { id: "sky", name: "Sky", category: "Cable", emoji: "📺" },
  { id: "dish", name: "Dish", category: "Cable", emoji: "📺" },
  { id: "telcel", name: "Telcel", category: "Teléfono móvil", emoji: "📱" },
  { id: "at_and_t", name: "AT&T", category: "Teléfono móvil", emoji: "📱" },
  { id: "movistar", name: "Movistar", category: "Teléfono móvil", emoji: "📱" },
  { id: "telmex_fijo", name: "Telmex Fijo", category: "Teléfono móvil", emoji: "☎️" },
  { id: "netflix", name: "Netflix", category: "Streaming", emoji: "🎬" },
  { id: "spotify", name: "Spotify", category: "Streaming", emoji: "🎵" },
  { id: "disney_plus", name: "Disney+", category: "Streaming", emoji: "🏰" },
  { id: "hbo_max", name: "Max (HBO)", category: "Streaming", emoji: "🎭" },
  { id: "kueski", name: "Kueski", category: "Préstamos", emoji: "💳" },
  { id: "konfio", name: "Konfío", category: "Préstamos", emoji: "💳" },
  { id: "gnp", name: "GNP Seguros", category: "Seguro", emoji: "🛡️" },
  { id: "hdi", name: "HDI Seguros", category: "Seguro", emoji: "🛡️" },
  { id: "sep", name: "SEP / IMSS", category: "Escuela", emoji: "🎓" },
  { id: "renta_pagoseguro", name: "PagoSeguro Renta", category: "Renta", emoji: "🏠" },
];

const CATEGORIES = ["Todos", "Luz", "Agua", "Gas", "Internet", "Cable", "Teléfono móvil", "Streaming", "Préstamos", "Seguro", "Escuela", "Renta"];

export default function BillPaySelector() {
  const [, navigate] = useLocation();
  const { setPaymentData, paymentData } = usePayment();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("Todos");

  const filtered = SERVICES.filter((s) => {
    const matchCat = activeCategory === "Todos" || s.category === activeCategory;
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.category.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const handleSelect = (svc: typeof SERVICES[0]) => {
    setPaymentData({
      ...paymentData,
      empresa: svc.name,
      categoria: svc.category,
    });
    navigate("/pagar");
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#F7F7F7" }}>
      {/* Header */}
      <header
        className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3"
        style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}
      >
        <button
          onClick={() => navigate("/")}
          className="p-2 rounded-xl transition-all active:scale-[0.92]"
          style={{ background: "#F0FAF3" }}
        >
          <ArrowLeft className="w-5 h-5" style={{ color: "#046C2C" }} />
        </button>
        <div>
          <h1 className="text-base font-black text-[#1F1F1F] leading-tight">Elige tu servicio</h1>
          <p className="text-xs text-gray-400">Selecciona para continuar con el pago</p>
        </div>
      </header>

      <main className="flex-1 flex flex-col">
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
        <div className="px-4 pb-4 overflow-x-auto">
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
                  onClick={() => handleSelect(svc)}
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
                    <p className="text-xs text-gray-400">{svc.category}</p>
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
    </div>
  );
}
