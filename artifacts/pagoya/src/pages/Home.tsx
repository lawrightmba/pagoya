import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowRight, Zap, CheckCircle, FileText, Sparkles } from "lucide-react";
import { usePayment } from "@/context/PaymentContext";
import WalletBalanceWidget from "@/components/WalletBalanceWidget";

// ─── DATA ─────────────────────────────────────────────────────────────────────

const MARQUEE_SERVICES = [
  "CFE", "Telmex", "Telcel", "AT&T", "Izzi",
  "Megacable", "Sky", "Dish", "Gas Natural", "Totalplay", "Maxcom",
];

const BRAND_COLORS = ["#1D9E75", "#D85A30", "#7F77DD", "#0A2540"];

const QUICK_ACCESS = [
  { name: "CFE",       color: "#1D9E75" },
  { name: "Telcel",    color: "#D85A30" },
  { name: "Telmex",    color: "#7F77DD" },
  { name: "Izzi",      color: "#0A2540" },
  { name: "Sky",       color: "#1D9E75" },
  { name: "Megacable", color: "#D85A30" },
];

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

// ─── MARQUEE (dark, inside hero) ──────────────────────────────────────────────

function HeroMarqueeRow({ direction }: { direction: "left" | "right" }) {
  const list = [...MARQUEE_SERVICES, ...MARQUEE_SERVICES];
  const anim = direction === "left" ? "pgScrollLeft" : "pgScrollRight";
  return (
    <div style={{ overflow: "hidden", width: "100%" }}>
      <div style={{ display: "flex", gap: "10px", width: "max-content", animation: `${anim} 30s linear infinite` }}>
        {list.map((name, i) => (
          <span
            key={`${name}-${i}`}
            style={{
              display: "inline-flex", alignItems: "center", gap: "7px",
              background: "#0D2F4A", borderRadius: "999px",
              padding: "6px 14px 6px 8px",
              whiteSpace: "nowrap", fontSize: "13px", fontWeight: 600, color: "white",
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

// ─── SECTION DIVIDER ──────────────────────────────────────────────────────────

function Divider() {
  return <div style={{ height: "1px", background: "rgba(29,158,117,0.20)", margin: "0 20px" }} />;
}

// ─── SECTION HEADING with left teal accent ─────────────────────────────────

function SectionHeading({ label, sub }: { label: string; sub?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginBottom: "16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <div style={{ width: "4px", height: "22px", borderRadius: "2px", background: "#1D9E75", flexShrink: 0 }} />
        <h2 style={{ fontSize: "15px", fontWeight: 800, color: "#0A2540", margin: 0 }}>{label}</h2>
      </div>
      {sub && <p style={{ fontSize: "13px", color: "#6B7280", paddingLeft: "14px", margin: 0 }}>{sub}</p>}
    </div>
  );
}

// ─── HOME ─────────────────────────────────────────────────────────────────────

export default function Home() {
  const [, navigate]              = useLocation();
  const { setPaymentData, paymentData } = usePayment();
  const [aiInput, setAiInput]    = useState("");
  const [aiDone,  setAiDone]     = useState(false);
  const [hintIndex, setHintIndex] = useState(0);
  const [lang, setLang]           = useState<"es" | "en">("es");
  const [phone, setPhone]         = useState("");
  const [notifSent, setNotifSent] = useState(false);
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

  const handleNotifSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) return;
    try {
      // TODO: wire to backend notification system when ready
      await fetch("/api/notifications/register-interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim(), language: lang }),
      });
    } catch {
      // fall through to success message regardless
    }
    setNotifSent(true);
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#FFFFFF" }}>

      {/* ── CSS animations ── */}
      <style>{`
        @keyframes pgScrollLeft  { 0% { transform:translateX(0);    } 100% { transform:translateX(-50%); } }
        @keyframes pgScrollRight { 0% { transform:translateX(-50%); } 100% { transform:translateX(0);    } }
        @keyframes pgStatReveal  { 0% { opacity:0; transform:translateY(14px); } 100% { opacity:1; transform:translateY(0); } }
        .pg-qa-card { transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease; }
        .pg-qa-card:hover { transform: scale(1.03); border-top: 3px solid #1D9E75 !important; box-shadow: 0 6px 20px rgba(10,37,64,0.12) !important; }
        .pg-nav-logo { height: 56px; max-width: 220px; }
        @media (min-width: 640px) { .pg-nav-logo { height: 72px; max-width: 280px; } }
      `}</style>

      {/* ── 1. HEADER — navy ── */}
      <header style={{
        background: "#0A2540", padding: "10px 20px",
        display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: "8px",
      }}>
        {/* left — text logo */}
        <span style={{ fontSize: "22px", fontWeight: 800, lineHeight: 1, userSelect: "none" }}>
          <span style={{ color: "white" }}>Pago</span>
          <span style={{ color: "#1D9E75" }}>Ya</span>
        </span>

        {/* center — image logo; no transform on parent so mix-blend-mode sees the navy bg */}
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
          <img
            src="/pagoya-logo.png"
            alt="PagoYa"
            className="pg-nav-logo"
            style={{
              width: "auto",
              objectFit: "cover",
              objectPosition: "left center",
              mixBlendMode: "multiply",
              clipPath: "inset(0 20% 10% 0)",
            }}
            onError={(e) => {
              e.currentTarget.style.display = "none";
              const sib = e.currentTarget.nextSibling as HTMLElement | null;
              if (sib) sib.style.display = "inline";
            }}
          />
          {/* fallback shown only if image fails */}
          <span style={{ display: "none", color: "white", fontWeight: 800, fontSize: "22px", whiteSpace: "nowrap" }}>
            Pago<span style={{ color: "#1D9E75" }}>Ya</span>
          </span>
        </div>

        {/* right — lang toggle */}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
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
        </div>
      </header>

      <main className="flex-1 flex flex-col">

        {/* ── 2. HERO — navy (marquee embedded) ── */}
        <section style={{
          background: "#0A2540", padding: "40px 24px 48px",
          display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center",
        }}>
          <h1 style={{ fontSize: "36px", fontWeight: 900, color: "white", lineHeight: 1.15, letterSpacing: "-0.02em", marginBottom: "12px" }}>
            {es ? "¿Se cerró tu OXXO?" : "No OXXO nearby?"}
            <br />
            <span style={{ color: "#39A935" }}>{es ? "Paga aquí." : "Pay here."}</span>
          </h1>

          <p style={{ fontSize: "15px", color: "rgba(255,255,255,0.70)", maxWidth: "280px", lineHeight: 1.6, marginBottom: "24px" }}>
            {es
              ? "Paga tu luz, internet, celular y más — desde tu cel, sin filas, sin efectivo."
              : "Pay your electricity, internet, phone and more — from your phone, no lines, no cash."}
          </p>

          {/* Marquee inside hero */}
          <div style={{
            width: "100vw", maxWidth: "600px",
            background: "rgba(255,255,255,0.08)",
            padding: "12px 0", marginBottom: "28px",
            display: "flex", flexDirection: "column", gap: "10px", overflow: "hidden",
          }}>
            <HeroMarqueeRow direction="left" />
            <HeroMarqueeRow direction="right" />
          </div>

          {/* CTA buttons */}
          <div style={{ width: "100%", maxWidth: "340px", display: "flex", flexDirection: "column", gap: "12px" }}>
            <button
              onClick={() => navigate("/servicios")}
              style={{
                width: "100%", padding: "17px 32px", borderRadius: "999px", border: "none",
                color: "white", fontSize: "16px", fontWeight: 700, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                background: "linear-gradient(135deg, #046C2C 0%, #39A935 100%)",
                boxShadow: "0 4px 20px rgba(29,158,117,0.40)",
              }}
            >
              {es ? "Ver todos los servicios" : "Browse all services"}
              <ArrowRight style={{ width: "18px", height: "18px" }} />
            </button>

            <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.45)", fontWeight: 500, textAlign: "center", margin: "-2px 0" }}>
              {es ? "Seguro. Rápido. Sin filas." : "Secure. Fast. No lines."}
            </p>

            <button
              onClick={() => navigate("/pagar")}
              style={{
                width: "100%", padding: "17px 32px", borderRadius: "999px", cursor: "pointer",
                color: "white", fontSize: "16px", fontWeight: 700,
                background: "transparent", border: "2px solid rgba(255,255,255,0.40)",
              }}
            >
              {es ? "Pagar un servicio" : "Pay a service"}
            </button>
          </div>
        </section>

        {/* ── 3. STATS BAR — white ── */}
        <section style={{
          background: "#FFFFFF", padding: "20px 16px",
          display: "flex", alignItems: "stretch", justifyContent: "center",
          borderBottom: "1px solid rgba(29,158,117,0.20)",
        }}>
          {[
            { num: "35+",      label: es ? "Servicios disponibles"   : "Services available" },
            { num: "$0",       label: es ? "Comisión para el usuario" : "User commission"   },
            { num: "WhatsApp", label: es ? "Comprobante instantáneo"  : "Instant receipt"   },
          ].map((stat, i) => (
            <div key={stat.num} style={{ display: "contents" }}>
              {i > 0 && (
                <div style={{ width: "1px", background: "rgba(29,158,117,0.20)", margin: "4px 0" }} />
              )}
              <div
                style={{
                  flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  padding: "8px 6px", textAlign: "center",
                  animation: `pgStatReveal 0.6s ease-out ${i * 0.15}s both`,
                }}
              >
                <span style={{ fontSize: "20px", fontWeight: 900, color: "#1D9E75", lineHeight: 1.1, marginBottom: "3px" }}>
                  {stat.num}
                </span>
                <span style={{ fontSize: "10px", color: "#0A2540", fontWeight: 600, lineHeight: 1.3 }}>
                  {stat.label}
                </span>
              </div>
            </div>
          ))}
        </section>

        <Divider />

        {/* ── 4. WALLET — white ── */}
        <section style={{ background: "#FFFFFF", padding: "24px 20px 8px" }}>
          <div style={{ maxWidth: "360px", margin: "0 auto" }}>
            <WalletBalanceWidget />
          </div>
        </section>

        <Divider />

        {/* ── 5. AI ASSISTANT — white ── */}
        <section style={{ background: "#FFFFFF", padding: "24px 20px" }}>
          <div style={{ maxWidth: "360px", margin: "0 auto" }}>
            <SectionHeading
              label={es ? "¿Qué necesitas pagar hoy?" : "What do you need to pay today?"}
              sub={es ? "Describe tu pago y llenamos el formulario." : "Describe your payment and we'll fill the form."}
            />
            <div style={{
              borderRadius: "20px", padding: "20px",
              background: "white", boxShadow: "0 2px 12px rgba(10,37,64,0.08)", border: "1px solid #E8F5F0",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
                <div style={{
                  width: "38px", height: "38px", borderRadius: "12px", flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: "linear-gradient(135deg, #046C2C 0%, #39A935 100%)",
                }}>
                  <Sparkles style={{ width: "18px", height: "18px", color: "white" }} strokeWidth={2} />
                </div>
                <span style={{ fontSize: "13px", color: "#6B7280" }}>
                  {es ? "Asistente con IA" : "AI-powered assistant"}
                </span>
              </div>

              <input
                type="text"
                value={aiInput}
                onChange={(e) => { setAiInput(e.target.value); setAiDone(false); }}
                onKeyDown={(e) => e.key === "Enter" && handleAutofill()}
                placeholder={HINTS[hintIndex]}
                onFocus={() => setHintIndex((hintIndex + 1) % HINTS.length)}
                style={{
                  width: "100%", borderRadius: "14px", padding: "13px 16px", fontSize: "14px",
                  color: "#1F1F1F", outline: "none", marginBottom: "12px", boxSizing: "border-box",
                  background: "white", border: "1.5px solid #E8F5F0", boxShadow: "0 1px 4px rgba(10,37,64,0.06)",
                }}
              />

              <button
                onClick={handleAutofill}
                disabled={!aiInput.trim()}
                style={{
                  width: "100%", padding: "13px", borderRadius: "999px", border: "none",
                  color: "white", fontSize: "14px", fontWeight: 700, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                  background: aiDone ? "#39A935" : "linear-gradient(135deg, #046C2C 0%, #39A935 100%)",
                  boxShadow: "0 4px 16px rgba(4,108,44,0.28)", opacity: !aiInput.trim() ? 0.5 : 1,
                }}
              >
                {aiDone
                  ? <><CheckCircle style={{ width: "16px", height: "16px" }} /> {es ? "Listo. Completando tu pago…" : "Done. Completing your payment…"}</>
                  : <><Sparkles    style={{ width: "16px", height: "16px" }} /> {es ? "Autocompletar con IA" : "AI Autofill"}</>}
              </button>
            </div>
          </div>
        </section>

        <Divider />

        {/* ── 6. QUICK ACCESS GRID — light teal tint ── */}
        <section style={{ background: "#F0FAF6", padding: "24px 20px" }}>
          <div style={{ maxWidth: "360px", margin: "0 auto" }}>
            <SectionHeading
              label={es ? "Acceso rápido" : "Quick access"}
              sub={es ? "Toca el servicio que quieres pagar." : "Tap the service you want to pay."}
            />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
              {QUICK_ACCESS.map((svc) => (
                <button
                  key={svc.name}
                  className="pg-qa-card"
                  onClick={() => navigate("/servicios")}
                  style={{
                    background: "white", border: "1px solid #E8F5F0", borderRadius: "16px",
                    padding: "16px 8px", cursor: "pointer", display: "flex",
                    flexDirection: "column", alignItems: "center", gap: "8px",
                    boxShadow: "0 2px 12px rgba(10,37,64,0.08)",
                  }}
                >
                  <span style={{
                    width: "36px", height: "36px", borderRadius: "50%", background: svc.color,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "white", fontSize: "15px", fontWeight: 800,
                  }}>
                    {svc.name[0]}
                  </span>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "#0A2540", textAlign: "center", lineHeight: 1.2 }}>
                    {svc.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <Divider />

        {/* ── 7. HOW IT WORKS — white ── */}
        <section id="como-funciona" style={{ background: "#FFFFFF", padding: "28px 20px" }}>
          <div style={{ maxWidth: "360px", margin: "0 auto" }}>
            <SectionHeading
              label={es ? "¿Cómo funciona?" : "How does it work?"}
              sub={es ? "Tres pasos. Así de simple." : "Three steps. That simple."}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <StepCard number={1} icon={<FileText   style={{ width: "22px", height: "22px", color: "#046C2C" }} />} title={es ? "Ingresa tu servicio"          : "Enter your service"}          description={es ? "Selecciona el servicio, captura el monto y tu número de referencia." : "Select the service, enter the amount and your reference number."} />
              <StepCard number={2} icon={<CheckCircle style={{ width: "22px", height: "22px", color: "#39A935" }} />} title={es ? "Confirma el monto"            : "Confirm the amount"}           description={es ? "Revisa todos los detalles antes de proceder. Seguro y transparente." : "Review all details before proceeding. Secure and transparent."} />
              <StepCard number={3} icon={<Zap         style={{ width: "22px", height: "22px", color: "#046C2C" }} />} title={es ? "Paga y recibe tu comprobante" : "Pay and get your receipt"}     description={es ? "Realiza el pago y recibe tu comprobante al instante." : "Complete payment and receive your receipt instantly."} />
            </div>
          </div>
        </section>

        <Divider />

        {/* ── 8. BOTTOM CTA — white ── */}
        <section style={{ background: "#FFFFFF", padding: "24px 20px 32px" }}>
          <div style={{ maxWidth: "340px", margin: "0 auto" }}>
            <button
              onClick={() => navigate("/pagar")}
              style={{
                width: "100%", padding: "17px 32px", borderRadius: "999px", border: "none",
                color: "white", fontSize: "16px", fontWeight: 700, cursor: "pointer",
                background: "linear-gradient(135deg, #046C2C 0%, #39A935 100%)",
                boxShadow: "0 4px 20px rgba(29,158,117,0.40)",
              }}
            >
              {es ? "Pagar un servicio ahora" : "Pay a service now"}
            </button>
          </div>
        </section>

        {/* ── 9. SOFT REGISTRATION CTA — navy ── */}
        <section style={{ background: "#0A2540", padding: "40px 24px" }}>
          <div style={{ maxWidth: "480px", margin: "0 auto", textAlign: "center" }}>
            <p style={{ fontSize: "12px", fontWeight: 700, color: "#1D9E75", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "10px" }}>
              {es ? "¿Todavía no estás listo?" : "Not ready yet?"}
            </p>

            <h2 style={{ fontSize: "24px", fontWeight: 900, color: "white", lineHeight: 1.25, marginBottom: "10px" }}>
              {es ? "Regístrate gratis y te avisamos" : "Register free and we'll notify you"}
            </h2>

            <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.70)", lineHeight: 1.6, maxWidth: "340px", margin: "0 auto 28px" }}>
              {es
                ? "Crea tu cuenta en 30 segundos. Te notificamos por WhatsApp cuando quieras pagar tu próximo servicio."
                : "Create your account in 30 seconds. We'll notify you on WhatsApp when you're ready to pay."}
            </p>

            {notifSent ? (
              <div style={{
                background: "rgba(29,158,117,0.15)", border: "1px solid rgba(29,158,117,0.40)",
                borderRadius: "16px", padding: "18px 20px", color: "white", fontSize: "15px", fontWeight: 600,
              }}>
                ✅ {es
                  ? "¡Listo! Te contactaremos por WhatsApp cuando estés listo."
                  : "Done! We'll contact you on WhatsApp when you're ready."}
              </div>
            ) : (
              <form onSubmit={handleNotifSubmit} style={{ display: "flex", gap: "10px", maxWidth: "380px", margin: "0 auto" }}>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+52 XXX XXX XXXX"
                  required
                  style={{
                    flex: 1, borderRadius: "999px", border: "none", padding: "14px 18px",
                    fontSize: "14px", color: "#1F1F1F", outline: "none",
                    background: "rgba(255,255,255,0.95)",
                  }}
                />
                <button
                  type="submit"
                  style={{
                    borderRadius: "999px", border: "none", padding: "14px 20px",
                    background: "#1D9E75", color: "white", fontSize: "14px", fontWeight: 700,
                    cursor: "pointer", whiteSpace: "nowrap",
                    boxShadow: "0 4px 16px rgba(29,158,117,0.40)",
                  }}
                >
                  {es ? "Avisarme" : "Notify me"}
                </button>
              </form>
            )}

            <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.40)", marginTop: "16px" }}>
              {es ? "Sin spam. Sin contratos. Cancela cuando quieras." : "No spam. No contracts. Cancel anytime."}
            </p>
          </div>
        </section>
      </main>

      <footer style={{ background: "white", borderTop: "1px solid rgba(29,158,117,0.15)", padding: "20px 24px", textAlign: "center" }}>
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
      background: "white", borderRadius: "20px", padding: "18px",
      display: "flex", gap: "14px", alignItems: "flex-start",
      boxShadow: "0 2px 12px rgba(10,37,64,0.08)", border: "1px solid #E8F5F0",
    }}>
      <div style={{
        flexShrink: 0, width: "44px", height: "44px", borderRadius: "14px",
        display: "flex", alignItems: "center", justifyContent: "center", background: "#F0FAF3",
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, paddingTop: "2px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "5px" }}>
          <span style={{
            fontSize: "11px", fontWeight: 900, width: "19px", height: "19px", borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "#046C2C", color: "white", flexShrink: 0,
          }}>
            {number}
          </span>
          <h3 style={{ fontSize: "14px", fontWeight: 700, color: "#0A2540", margin: 0 }}>{title}</h3>
        </div>
        <p style={{ fontSize: "13px", color: "#6B7280", lineHeight: 1.5, margin: 0 }}>{description}</p>
      </div>
    </div>
  );
}
