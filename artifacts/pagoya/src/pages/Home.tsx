import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowRight, Zap, CheckCircle, FileText, Sparkles } from "lucide-react";
import logoUrl from "@assets/pagoya_logo_web_1774491466855.png";
import { usePayment } from "@/context/PaymentContext";
import WalletBalanceWidget from "@/components/WalletBalanceWidget";

// ─── MARQUEE ──────────────────────────────────────────────────────────────────

const MARQUEE_SERVICES = [
  "CFE", "Telmex", "Telcel", "AT&T", "Izzi",
  "Megacable", "Sky", "Dish", "Gas Natural", "Totalplay", "Maxcom",
];

const BRAND_COLORS = ["#1D9E75", "#D85A30", "#7F77DD", "#0A2540"];

function MarqueeRow({ direction }: { direction: "left" | "right" }) {
  const list = [...MARQUEE_SERVICES, ...MARQUEE_SERVICES];
  const anim = direction === "left" ? "pgScrollLeft" : "pgScrollRight";
  return (
    <div style={{ overflow: "hidden", width: "100%" }}>
      <div style={{ display: "flex", gap: "10px", width: "max-content", animation: `${anim} 28s linear infinite` }}>
        {list.map((name, i) => (
          <span
            key={`${name}-${i}`}
            style={{
              display: "inline-flex", alignItems: "center", gap: "7px",
              background: "white", border: "1px solid #E2E8F0", borderRadius: "999px",
              padding: "6px 14px 6px 8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
              whiteSpace: "nowrap", fontSize: "13px", fontWeight: 600, color: "#1F1F1F",
            }}
          >
            <span style={{
              width: "22px", height: "22px", borderRadius: "50%",
              background: BRAND_COLORS[i % BRAND_COLORS.length],
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              color: "white", fontSize: "11px", fontWeight: 800, flexShrink: 0,
            }}>
              {name[0]}
            </span>
            {name}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── QUICK-ACCESS GRID ────────────────────────────────────────────────────────

const QUICK_ACCESS = [
  { name: "CFE",      color: "#1D9E75" },
  { name: "Telcel",   color: "#D85A30" },
  { name: "Telmex",   color: "#7F77DD" },
  { name: "Izzi",     color: "#0A2540" },
  { name: "Sky",      color: "#1D9E75" },
  { name: "Megacable",color: "#D85A30" },
];

// ─── AI HINTS ─────────────────────────────────────────────────────────────────

const HINTS = [
  "Quiero pagar luz CFE",
  "Necesito pagar Telcel 500 pesos",
  "Voy a pagar internet izzi",
  "Quiero pagar mi renta",
];

function parseAIInput(text: string): { empresa: string; categoria: string; monto: string } {
  const t = text.toLowerCase();
  let empresa = "";
  let categoria = "";

  if      (t.includes("cfe") || t.includes("luz"))              { empresa = "CFE";       categoria = "Luz"; }
  else if (t.includes("agua"))                                   {                         categoria = "Agua"; }
  else if (t.includes("gas"))                                    {                         categoria = "Gas"; }
  else if (t.includes("izzi"))                                   { empresa = "Izzi";      categoria = "Internet"; }
  else if (t.includes("totalplay"))                              { empresa = "Totalplay"; categoria = "Internet"; }
  else if (t.includes("internet"))                               {                         categoria = "Internet"; }
  else if (t.includes("telcel"))                                 { empresa = "Telcel";    categoria = "Teléfono móvil"; }
  else if (t.includes("movistar"))                               { empresa = "Movistar";  categoria = "Teléfono móvil"; }
  else if (t.includes("netflix"))                                { empresa = "Netflix";   categoria = "Streaming"; }
  else if (t.includes("spotify"))                                { empresa = "Spotify";   categoria = "Streaming"; }
  else if (t.includes("streaming"))                              {                         categoria = "Streaming"; }
  else if (t.includes("seguro"))                                 {                         categoria = "Seguro"; }
  else if (t.includes("escuela") || t.includes("colegiatura"))  {                         categoria = "Escuela"; }
  else if (t.includes("renta"))                                  {                         categoria = "Renta"; }
  else if (t.includes("préstamo") || t.includes("prestamo"))    {                         categoria = "Préstamos"; }

  const montoMatch = text.match(/\b(\d{2,6})\b/);
  return { empresa, categoria, monto: montoMatch ? montoMatch[1] : "" };
}

// ─── HOME ─────────────────────────────────────────────────────────────────────

export default function Home() {
  const [, navigate] = useLocation();
  const { setPaymentData, paymentData } = usePayment();
  const [aiInput, setAiInput]     = useState("");
  const [aiDone, setAiDone]       = useState(false);
  const [hintIndex, setHintIndex] = useState(0);
  const [lang, setLang]           = useState<"es" | "en">("es");
  const es = lang === "es";

  const handleAutofill = () => {
    if (!aiInput.trim()) return;
    const parsed = parseAIInput(aiInput);
    setPaymentData({
      ...paymentData,
      empresa:    parsed.empresa    || paymentData.empresa,
      categoria:  parsed.categoria  || paymentData.categoria,
      monto:      parsed.monto      || paymentData.monto,
      referencia: paymentData.referencia,
      telefono:   paymentData.telefono,
      notas:      paymentData.notas,
    });
    setAiDone(true);
    setTimeout(() => { navigate("/pagar"); }, 900);
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#F5F5F0" }}>

      {/* CSS-only marquee keyframes */}
      <style>{`
        @keyframes pgScrollLeft  { 0% { transform:translateX(0);    } 100% { transform:translateX(-50%); } }
        @keyframes pgScrollRight { 0% { transform:translateX(-50%); } 100% { transform:translateX(0);    } }
      `}</style>

      {/* ── 1. HEADER — navy ── */}
      <header
        style={{ background: "#0A2540", padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}
      >
        <div style={{ width: "48px" }} />
        <img src={logoUrl} alt="PagoYa" style={{ height: "36px", objectFit: "contain", filter: "brightness(0) invert(1)" }} />
        <button
          onClick={() => setLang(es ? "en" : "es")}
          style={{
            fontSize: "12px", fontWeight: 700, color: "white",
            border: "1.5px solid rgba(255,255,255,0.35)", borderRadius: "999px",
            padding: "4px 10px", background: "rgba(255,255,255,0.12)", cursor: "pointer",
          }}
        >
          {es ? "EN" : "ES"}
        </button>
      </header>

      <main className="flex-1 flex flex-col">

        {/* ── 2. HERO — navy ── */}
        <section
          style={{ background: "#0A2540", padding: "48px 24px 56px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}
        >
          <div style={{
            width: "80px", height: "80px", borderRadius: "20px", marginBottom: "32px",
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "linear-gradient(135deg, #046C2C 0%, #39A935 100%)",
            boxShadow: "0 8px 24px rgba(4,108,44,0.40)",
          }}>
            <Zap style={{ width: "40px", height: "40px", color: "white" }} strokeWidth={2.5} />
          </div>

          <h1 style={{ fontSize: "38px", fontWeight: 900, color: "white", lineHeight: 1.15, letterSpacing: "-0.02em", marginBottom: "12px" }}>
            {es ? "¿Se cerró tu OXXO?" : "No OXXO nearby?"}
            <br />
            <span style={{ color: "#39A935" }}>{es ? "Paga aquí." : "Pay here."}</span>
          </h1>

          <p style={{ fontSize: "16px", color: "rgba(255,255,255,0.70)", maxWidth: "280px", lineHeight: 1.6, marginBottom: "40px" }}>
            {es
              ? "Paga tu luz, internet, celular y más — desde tu cel, sin filas, sin efectivo."
              : "Pay your electricity, internet, phone and more — from your phone, no lines, no cash."}
          </p>

          <div style={{ width: "100%", maxWidth: "360px", display: "flex", flexDirection: "column", gap: "12px" }}>
            <button
              onClick={() => navigate("/servicios")}
              style={{
                width: "100%", padding: "18px 32px", borderRadius: "999px", border: "none",
                color: "white", fontSize: "16px", fontWeight: 700, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                background: "linear-gradient(135deg, #046C2C 0%, #39A935 100%)",
                boxShadow: "0 6px 20px rgba(4,108,44,0.50)",
              }}
            >
              {es ? "Ver todos los servicios" : "Browse all services"}
              <ArrowRight style={{ width: "20px", height: "20px" }} />
            </button>

            <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.45)", fontWeight: 500, textAlign: "center", margin: "-4px 0" }}>
              {es ? "Seguro. Rápido. Sin filas." : "Secure. Fast. No lines."}
            </p>

            <button
              onClick={() => navigate("/pagar")}
              style={{
                width: "100%", padding: "18px 32px", borderRadius: "999px", cursor: "pointer",
                color: "white", fontSize: "16px", fontWeight: 700,
                background: "transparent", border: "2px solid rgba(255,255,255,0.40)",
              }}
            >
              {es ? "Pagar un servicio" : "Pay a service"}
            </button>
          </div>
        </section>

        {/* ── 3. MARQUEE — off-white ── */}
        <section style={{ background: "#F5F5F0", padding: "20px 0 18px" }}>
          <p style={{
            textAlign: "center", fontSize: "11px", fontWeight: 600, color: "#9CA3AF",
            letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "14px", paddingInline: "16px",
          }}>
            {es ? "Paga estos servicios y más" : "Pay these services and more"}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", overflow: "hidden" }}>
            <MarqueeRow direction="left" />
            <MarqueeRow direction="right" />
          </div>
        </section>

        {/* ── 4. WALLET — white ── */}
        <section style={{ background: "#FFFFFF", padding: "20px 20px 8px" }}>
          <div style={{ maxWidth: "360px", margin: "0 auto" }}>
            <WalletBalanceWidget />
          </div>
        </section>

        {/* ── 5. AI ASSISTANT — white (continues) ── */}
        <section style={{ background: "#FFFFFF", padding: "24px 20px 8px" }}>
          <div
            style={{
              borderRadius: "24px", padding: "24px", maxWidth: "360px", margin: "0 auto",
              background: "linear-gradient(145deg, #f0faf3 0%, #ffffff 100%)",
              boxShadow: "0 4px 20px rgba(4,108,44,0.10)", border: "1px solid #D4EDDA",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
              <div style={{
                width: "40px", height: "40px", borderRadius: "12px", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "linear-gradient(135deg, #046C2C 0%, #39A935 100%)",
              }}>
                <Sparkles style={{ width: "20px", height: "20px", color: "white" }} strokeWidth={2} />
              </div>
              <div>
                <h2 style={{ fontSize: "15px", fontWeight: 900, color: "#1F1F1F", lineHeight: 1.25, marginBottom: "2px" }}>
                  ¿Qué necesitas pagar hoy?
                </h2>
                <p style={{ fontSize: "12px", color: "#6B7280", lineHeight: 1.4 }}>
                  Describe tu pago y llenamos el formulario.
                </p>
              </div>
            </div>

            <input
              type="text"
              value={aiInput}
              onChange={(e) => { setAiInput(e.target.value); setAiDone(false); }}
              onKeyDown={(e) => e.key === "Enter" && handleAutofill()}
              placeholder={HINTS[hintIndex]}
              onFocus={() => setHintIndex((hintIndex + 1) % HINTS.length)}
              style={{
                width: "100%", borderRadius: "16px", padding: "14px 16px", fontSize: "14px",
                color: "#1F1F1F", outline: "none", marginBottom: "12px", boxSizing: "border-box",
                background: "white", border: "1.5px solid #D4EDDA", boxShadow: "0 2px 8px rgba(4,108,44,0.06)",
              }}
            />

            <button
              onClick={handleAutofill}
              disabled={!aiInput.trim()}
              style={{
                width: "100%", padding: "14px", borderRadius: "999px", border: "none",
                color: "white", fontSize: "14px", fontWeight: 700, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                background: aiDone ? "#39A935" : "linear-gradient(135deg, #046C2C 0%, #39A935 100%)",
                boxShadow: "0 4px 16px rgba(4,108,44,0.32)", opacity: !aiInput.trim() ? 0.5 : 1,
              }}
            >
              {aiDone
                ? <><CheckCircle style={{ width: "16px", height: "16px" }} /> Listo. Te ayudamos a completar tu pago.</>
                : <><Sparkles    style={{ width: "16px", height: "16px" }} /> Autocompletar con IA</>}
            </button>
          </div>
        </section>

        {/* ── 6. QUICK ACCESS GRID — off-white ── */}
        <section style={{ background: "#F5F5F0", padding: "24px 20px" }}>
          <div style={{ maxWidth: "360px", margin: "0 auto" }}>
            <p style={{
              fontSize: "11px", fontWeight: 700, color: "#9CA3AF",
              textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: "14px",
            }}>
              {es ? "Acceso rápido" : "Quick access"}
            </p>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "10px",
            }}>
              {QUICK_ACCESS.map((svc) => (
                <button
                  key={svc.name}
                  onClick={() => navigate("/servicios")}
                  style={{
                    background: "white", border: "1px solid #E2E8F0", borderRadius: "16px",
                    padding: "16px 8px", cursor: "pointer", display: "flex",
                    flexDirection: "column", alignItems: "center", gap: "8px",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                  }}
                >
                  <span style={{
                    width: "36px", height: "36px", borderRadius: "50%", background: svc.color,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "white", fontSize: "15px", fontWeight: 800,
                  }}>
                    {svc.name[0]}
                  </span>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "#1F1F1F", textAlign: "center", lineHeight: 1.2 }}>
                    {svc.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ── 7. BROKER BANNER — teal ── */}
        <section style={{
          background: "#1D9E75", padding: "28px 24px",
          display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "20px",
        }}>
          <div style={{ flex: "1 1 200px" }}>
            <p style={{ color: "white", fontSize: "20px", fontWeight: 900, lineHeight: 1.25, marginBottom: "6px" }}>
              ¿Eres agente inmobiliario?
            </p>
            <p style={{ color: "rgba(255,255,255,0.85)", fontSize: "14px", lineHeight: 1.5 }}>
              Gana $500 MXN por cada propietario que registres. Sin límite.
            </p>
          </div>
          <div style={{ flex: "1 1 160px", display: "flex", justifyContent: "flex-end" }}>
            <button
              onClick={() => navigate("/brokers")}
              style={{
                background: "#0A2540", color: "white", border: "none", borderRadius: "999px",
                padding: "14px 24px", fontSize: "14px", fontWeight: 700, cursor: "pointer",
                whiteSpace: "nowrap", width: "100%", maxWidth: "220px",
              }}
            >
              Ver comisiones →
            </button>
          </div>
        </section>

        {/* ── 8. HOW IT WORKS — white ── */}
        <section id="como-funciona" style={{ background: "#FFFFFF", padding: "40px 24px" }}>
          <h2 style={{ fontSize: "22px", fontWeight: 900, color: "#1F1F1F", textAlign: "center", marginBottom: "4px" }}>
            ¿Cómo funciona?
          </h2>
          <p style={{ fontSize: "14px", color: "#6B7280", textAlign: "center", marginBottom: "32px" }}>
            Tres pasos. Así de simple.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", maxWidth: "360px", margin: "0 auto" }}>
            <StepCard number={1} icon={<FileText   style={{ width: "24px", height: "24px", color: "#046C2C" }} />} title="Ingresa tu servicio"           description="Selecciona el servicio, captura el monto y tu número de referencia." />
            <StepCard number={2} icon={<CheckCircle style={{ width: "24px", height: "24px", color: "#39A935" }} />} title="Confirma el monto"             description="Revisa todos los detalles antes de proceder. Seguro y transparente." />
            <StepCard number={3} icon={<Zap         style={{ width: "24px", height: "24px", color: "#046C2C" }} />} title="Paga y recibe tu comprobante"  description="Realiza el pago y recibe tu comprobante al instante para compartirlo." />
          </div>
        </section>

        {/* ── 9. BOTTOM CTA — off-white ── */}
        <div style={{ background: "#F5F5F0", padding: "32px 24px 48px" }}>
          <div style={{ maxWidth: "360px", margin: "0 auto" }}>
            <button
              onClick={() => navigate("/pagar")}
              style={{
                width: "100%", padding: "18px 32px", borderRadius: "999px", border: "none",
                color: "white", fontSize: "16px", fontWeight: 700, cursor: "pointer",
                background: "linear-gradient(135deg, #046C2C 0%, #39A935 100%)",
                boxShadow: "0 6px 20px rgba(4,108,44,0.32)",
              }}
            >
              {es ? "Pagar un servicio ahora" : "Pay a service now"}
            </button>
          </div>
        </div>
      </main>

      <footer style={{ background: "white", borderTop: "1px solid #F0F0F0", padding: "20px 24px", textAlign: "center" }}>
        <p style={{ fontSize: "12px", color: "#9CA3AF", marginBottom: "4px" }}>© 2026 PagoYa · Paga todo. Sin filas.</p>
        <p style={{ fontSize: "12px", color: "#D1D5DB", fontWeight: 500 }}>Powered by Pago Seguro (próximamente)</p>
      </footer>
    </div>
  );
}

// ─── STEP CARD ────────────────────────────────────────────────────────────────

function StepCard({ number, icon, title, description }: {
  number:      number;
  icon:        React.ReactNode;
  title:       string;
  description: string;
}) {
  return (
    <div style={{
      background: "white", borderRadius: "24px", padding: "20px",
      display: "flex", gap: "16px", alignItems: "flex-start",
      boxShadow: "0 4px 16px rgba(0,0,0,0.06)", border: "1px solid #F0F0F0",
    }}>
      <div style={{
        flexShrink: 0, width: "48px", height: "48px", borderRadius: "16px",
        display: "flex", alignItems: "center", justifyContent: "center", background: "#F0FAF3",
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, paddingTop: "2px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
          <span style={{
            fontSize: "11px", fontWeight: 900, width: "20px", height: "20px", borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "#046C2C", color: "white",
          }}>
            {number}
          </span>
          <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#1F1F1F" }}>{title}</h3>
        </div>
        <p style={{ fontSize: "14px", color: "#6B7280", lineHeight: 1.5 }}>{description}</p>
      </div>
    </div>
  );
}
