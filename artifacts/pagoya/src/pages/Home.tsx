import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { usePayment } from "@/context/PaymentContext";
import WalletBalanceWidget from "@/components/WalletBalanceWidget";
import AutofillInput from "@/components/AutofillInput";
import BillerTicker from "@/components/BillerTicker";

// ─── Language helpers ──────────────────────────────────────────────────────────

function getLang(): "es" | "en" {
  try {
    const stored = localStorage.getItem("pagoya_lang");
    if (stored === "en" || stored === "es") return stored;
  } catch { /* ignore */ }
  return "es";
}

function setLangPref(lang: "es" | "en") {
  try { localStorage.setItem("pagoya_lang", lang); } catch { /* ignore */ }
}

// ─── Quick access grid data ────────────────────────────────────────────────────

const QUICK_ACCESS = [
  { id: "cfe",      icon: "⚡", name: "CFE",       color: "#1D9E75" },
  { id: "telcel",   icon: "📱", name: "Telcel",    color: "#D85A30" },
  { id: "telmex",   icon: "🌐", name: "Telmex",    color: "#7F77DD" },
  { id: "izzi",     icon: "📺", name: "Izzi",      color: "#1D9E75" },
  { id: "sky",      icon: "📡", name: "Sky",       color: "#D85A30" },
  { id: "netflix",  icon: "🎬", name: "Netflix",   color: "#7F77DD" },
];

// ─── Sub-components ────────────────────────────────────────────────────────────

// BEFORE: background: "rgba(29,158,117,0.18)"
// AFTER:  background: "rgba(255,255,255,0.08)"
function Divider() {
  return <div style={{ height: "1px", background: "rgba(255,255,255,0.08)", margin: "0 20px" }} />;
}

// BEFORE: step text color: "#374151"
// AFTER:  step text color: "#FFFFFF"
function StepRow({ number, icon, es, en, lang }: { number: number; icon: string; es: string; en: string; lang: "es" | "en" }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: "14px" }}>
      <div style={{
        width: "30px", height: "30px", borderRadius: "50%", flexShrink: 0,
        background: "#1D9E75", color: "white",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "13px", fontWeight: 800,
      }}>
        {number}
      </div>
      <div>
        <span style={{ fontSize: "18px", marginRight: "6px" }}>{icon}</span>
        <span style={{ fontSize: "14px", color: "#FFFFFF", fontWeight: 500 }}>
          {lang === "es" ? es : en}
        </span>
      </div>
    </div>
  );
}

// ─── HOME ─────────────────────────────────────────────────────────────────────

export default function Home() {
  const [, navigate]            = useLocation();
  const { setPaymentData, paymentData } = usePayment();
  const [lang, setLang]         = useState<"es" | "en">(getLang);
  const [phone]                  = useState(paymentData.telefono ?? "");
  const [notifPhone, setNotifPhone] = useState("");
  const [notifSent, setNotifSent]   = useState(false);
  const [pointsBalance, setPointsBalance] = useState<number | null>(null);

  // Load points balance from localStorage phone
  useEffect(() => {
    const storedPhone = (() => { try { return localStorage.getItem("pagoya_phone") ?? ""; } catch { return ""; } })();
    if (!storedPhone) return;
    fetch(`${import.meta.env.BASE_URL?.replace(/\/$/, "") ?? ""}/api/loyalty/balance/${encodeURIComponent(storedPhone)}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d && typeof d.points_balance === "number") setPointsBalance(d.points_balance); })
      .catch(() => {});
  }, []);

  const es = lang === "es";

  useEffect(() => { setLangPref(lang); }, [lang]);

  function handleAutofill(result: {
    biller_id: string; biller_name: string;
    amount: number | null; reference: string | null;
  }) {
    setPaymentData({
      ...paymentData,
      empresa:    result.biller_name || paymentData.empresa,
      categoria:  result.biller_id   || paymentData.categoria,
      monto:      result.amount != null ? String(result.amount) : paymentData.monto,
      referencia: result.reference   || paymentData.referencia,
    });
    setTimeout(() => navigate("/pagar"), 600);
  }

  function handleQuickAccess(id: string, name: string) {
    setPaymentData({ ...paymentData, empresa: name, categoria: id });
    navigate("/pagar");
  }

  async function handleNotifSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!notifPhone.trim()) return;
    try {
      await fetch("/api/notifications/register-interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: notifPhone.trim(), language: lang }),
      });
    } catch { /* fall through */ }
    setNotifSent(true);
  }

  return (
    // BEFORE: background: "#FFFFFF"
    // AFTER:  background: "#0A2540"
    <div style={{ background: "#0A2540", minHeight: "100vh", display: "flex", flexDirection: "column", overflowX: "hidden" }}>

      {/* ── CSS ── */}
      <style>{`
        @keyframes pgStatReveal { 0%{opacity:0;transform:translateY(12px)}100%{opacity:1;transform:translateY(0)} }
        .pg-qa-card { transition:transform 0.18s,box-shadow 0.18s,border-color 0.18s; }
        .pg-qa-card:hover { transform:scale(1.04); box-shadow:0 6px 22px rgba(0,0,0,0.30)!important; border-color:#1D9E75!important; }
        @media(max-width:600px){
          .hero-h1{font-size:28px!important;}
          .hero-steps{flex-direction:column!important;gap:14px!important;}
          .hero-cta-btn{height:56px!important;font-size:16px!important;}
        }
        @media(min-width:601px){
          .hero-h1{font-size:40px!important;}
          .hero-steps{flex-direction:row!important;gap:28px!important;}
        }
      `}</style>

      {/* ══════════════════════════════════════════════════════
          A. NAV BAR — navy (unchanged)
      ══════════════════════════════════════════════════════ */}
      <header style={{
        background: "#0A2540",
        padding: "10px 20px",
        display: "grid",
        gridTemplateColumns: "1fr auto 1fr",
        alignItems: "center",
      }}>
        <span />

        <div style={{ display: "flex", justifyContent: "center" }}>
          <img
            src="/pagoya-logo.png"
            alt="PagoYa"
            style={{ height: "44px", width: "auto", maxWidth: "180px", objectFit: "contain", display: "block" }}
            onError={(e) => {
              e.currentTarget.style.display = "none";
              const sib = e.currentTarget.nextSibling as HTMLElement | null;
              if (sib) sib.style.display = "inline";
            }}
          />
          <span style={{ display: "none", color: "white", fontWeight: 800, fontSize: "22px" }}>
            Pago<span style={{ color: "#1D9E75" }}>Ya</span>
          </span>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: "8px" }}>
          <button
            onClick={() => navigate("/puntos")}
            style={{
              fontSize: "12px", fontWeight: 700, color: "#1D9E75",
              border: "1.5px solid rgba(29,158,117,0.50)", borderRadius: "999px",
              padding: "4px 10px", background: "rgba(29,158,117,0.12)", cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            🪙 {pointsBalance !== null ? `${pointsBalance.toLocaleString("es-MX")} pts` : (es ? "Puntos" : "Points")}
          </button>
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

      <main style={{ flex: 1, display: "flex", flexDirection: "column" }}>

        {/* ══════════════════════════════════════════════════════
            B. HERO BLOCK
            BEFORE: background: "#FFFFFF", h1 color: "#0A2540", sub: "#6B7280"
            AFTER:  background: "#0A2540", h1 color: "#FFFFFF",  sub: "#94A3B8"
        ══════════════════════════════════════════════════════ */}
        <section style={{
          background: "#0A2540",
          padding: "48px 24px 0",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
        }}>
          <h1
            className="hero-h1"
            style={{
              fontWeight: 900,
              color: "#FFFFFF",
              lineHeight: 1.15,
              letterSpacing: "-0.02em",
              margin: "0 0 12px",
            }}
          >
            {es ? "Paga cualquier servicio" : "Pay any bill"}
            <br />
            {/* teal accent — same color, now reads on dark bg */}
            <span style={{ color: "#1D9E75" }}>
              {es ? "en menos de 2 minutos" : "in under 2 minutes"}
            </span>
          </h1>

          {/* BEFORE: color: "#6B7280"  AFTER: color: "#94A3B8" */}
          <p style={{
            fontSize: "16px",
            color: "#94A3B8",
            maxWidth: "340px",
            lineHeight: 1.6,
            margin: "0 0 28px",
          }}>
            {es
              ? "Sin filas. Sin apps. Sin cuenta de banco."
              : "No lines. No apps. No bank account needed."}
          </p>
        </section>

        {/* ══════════════════════════════════════════════════════
            C. BILLER TICKER
            Pass dark=true so pills use semi-transparent white bg
            Fade mask updated inside BillerTicker via dark prop
        ══════════════════════════════════════════════════════ */}
        <section style={{ padding: "0 0 28px", marginTop: "4px", background: "#0A2540" }}>
          <BillerTicker small dark />
        </section>

        {/* ══════════════════════════════════════════════════════
            D. 3-STEP HOW TO USE
            Background stays navy; text updated in StepRow (#374151 → #FFFFFF)
        ══════════════════════════════════════════════════════ */}
        <section style={{ padding: "0 24px 28px", background: "#0A2540" }}>
          <div
            className="hero-steps"
            style={{
              maxWidth: "600px",
              margin: "0 auto",
              display: "flex",
              justifyContent: "center",
            }}
          >
            <StepRow number={1} icon="✍️"
              es="Escribe qué quieres pagar"
              en="Type what you want to pay"
              lang={lang}
            />
            <StepRow number={2} icon="🤖"
              es="Nuestra IA llena el formulario"
              en="Our AI fills the form"
              lang={lang}
            />
            <StepRow number={3} icon="✅"
              es="Confirma y listo en 2 min"
              en="Confirm and done in 2 min"
              lang={lang}
            />
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════
            E. AUTOFILL INPUT (hero element)
            dark=true → input bg #0F2F50, white text, teal focus
            BEFORE trust color: "#9CA3AF"  AFTER: "#64748B"
        ══════════════════════════════════════════════════════ */}
        <section style={{ padding: "0 24px 28px", background: "#0A2540" }}>
          <div style={{ maxWidth: "560px", margin: "0 auto" }}>
            <AutofillInput
              phone={phone}
              language={lang}
              onAutofill={handleAutofill}
              dark
            />

            {/* CTA button — teal #1D9E75, unchanged */}
            <button
              className="hero-cta-btn"
              onClick={() => navigate("/pagar")}
              style={{
                width: "100%",
                height: "52px",
                borderRadius: "14px",
                border: "none",
                background: "#1D9E75",
                color: "white",
                fontSize: "17px",
                fontWeight: 700,
                cursor: "pointer",
                letterSpacing: "0.01em",
                boxShadow: "0 4px 18px rgba(29,158,117,0.32)",
                transition: "filter 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.filter = "brightness(1.08)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.filter = ""; }}
            >
              {es ? "Pagar ahora →" : "Pay now →"}
            </button>

            {/* Trust microcopy — tightly coupled sub-label under the button */}
            <p style={{
              marginTop: "5px",
              marginBottom: 0,
              fontSize: "11px",
              color: "#64748B",
              textAlign: "center",
              lineHeight: 1.4,
            }}>
              {es
                ? "🔒 Pago seguro · Sin registro para tu primer pago · $15 MXN por transacción"
                : "🔒 Secure payment · No signup for first payment · $15 MXN per transaction"}
            </p>

            {/* ── RENT VERTICAL COMPACT CARD ── */}
            <div style={{
              marginTop: "24px",
              paddingTop: "20px",
              borderTop: "1px solid rgba(255,255,255,0.07)",
              background: "#0F2F50",
              border: "1.5px solid rgba(216,90,48,0.35)",
              borderLeft: "4px solid #D85A30",
              borderRadius: "14px",
              padding: "14px 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
              position: "relative",
              overflow: "hidden",
            }}>
              <div style={{
                position: "absolute", top: -30, right: -30,
                width: 90, height: 90, borderRadius: "50%",
                background: "radial-gradient(circle, rgba(216,90,48,0.15) 0%, transparent 70%)",
                pointerEvents: "none",
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{
                  fontSize: "9px", fontWeight: 800,
                  color: "#D85A30", letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  background: "rgba(216,90,48,0.15)",
                  border: "1px solid rgba(216,90,48,0.28)",
                  borderRadius: "999px",
                  padding: "2px 8px",
                  display: "inline-block",
                  marginBottom: "5px",
                }}>
                  {es ? "También pagamos" : "Vertical"}
                </span>
                <p style={{ margin: 0, fontSize: "15px", fontWeight: 800, color: "#FFFFFF", lineHeight: 1.2 }}>
                  {es ? "¿Pagas renta?" : "Pay Rent"}{" "}
                  <span style={{ color: "#D85A30" }}>🏠</span>
                </p>
              </div>
              <a
                href="https://pagoseguromx.com"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  flexShrink: 0,
                  background: "#D85A30",
                  color: "white",
                  fontSize: "13px",
                  fontWeight: 700,
                  padding: "10px 16px",
                  borderRadius: "10px",
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                  boxShadow: "0 3px 10px rgba(216,90,48,0.35)",
                  transition: "filter 0.15s",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.filter = "brightness(1.1)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.filter = ""; }}
              >
                {es ? "Ir a PagoSeguro →" : "Go to PagoSeguro →"}
              </a>
            </div>
          </div>
        </section>

        <Divider />

        {/* ══════════════════════════════════════════════════════
            STATS BAR
            BEFORE bg: "#FFFFFF",  border: "rgba(29,158,117,0.15)", label color: "#0A2540"
            AFTER  bg: "#0F2F50",  border: "rgba(255,255,255,0.08)", label color: "white"
        ══════════════════════════════════════════════════════ */}
        <section style={{
          background: "#0F2F50", padding: "20px 16px",
          display: "flex", alignItems: "stretch", justifyContent: "center",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}>
          {[
            { num: "35+",      label: es ? "Servicios disponibles"   : "Services available"   },
            { num: "2 min",    label: es ? "Tiempo promedio de pago" : "Average payment time" },
            { num: "WhatsApp", label: es ? "Comprobante instantáneo" : "Instant receipt"      },
          ].map((stat, i) => (
            <div key={stat.num} style={{ display: "contents" }}>
              {i > 0 && <div style={{ width: "1px", background: "rgba(255,255,255,0.08)", margin: "4px 0" }} />}
              <div style={{
                flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
                padding: "8px 6px", textAlign: "center",
                animation: `pgStatReveal 0.6s ease-out ${i * 0.15}s both`,
              }}>
                {/* teal numbers — unchanged */}
                <span style={{ fontSize: "20px", fontWeight: 900, color: "#1D9E75", lineHeight: 1.1, marginBottom: "3px" }}>
                  {stat.num}
                </span>
                {/* BEFORE: "#0A2540"  AFTER: "white" */}
                <span style={{ fontSize: "10px", color: "white", fontWeight: 600, lineHeight: 1.3 }}>
                  {stat.label}
                </span>
              </div>
            </div>
          ))}
        </section>

        <Divider />

        {/* ══════════════════════════════════════════════════════
            WALLET
            BEFORE bg: "#FFFFFF"  AFTER bg: "#0F2F50"
        ══════════════════════════════════════════════════════ */}
        <section style={{ background: "#0F2F50", padding: "24px 20px 8px" }}>
          <div style={{ maxWidth: "360px", margin: "0 auto" }}>
            <WalletBalanceWidget />
          </div>
        </section>

        <Divider />

        {/* ══════════════════════════════════════════════════════
            F. CATEGORY GRID — secondary
            BEFORE section bg: "#F0FAF6"   AFTER: "#0A2540"
            BEFORE card bg: "white"        AFTER: "#0F2F50"
            BEFORE card border: "#E8F5F0"  AFTER: "rgba(255,255,255,0.08)"
            BEFORE card text: "#0A2540"    AFTER: "white"
            BEFORE divider lines: "#D1D5DB" AFTER: "rgba(255,255,255,0.08)"
            BEFORE divider label: "#9CA3AF" AFTER: "#64748B"
        ══════════════════════════════════════════════════════ */}
        <section style={{ background: "#0A2540", padding: "24px 20px" }}>
          <div style={{ maxWidth: "400px", margin: "0 auto" }}>
            {/* Divider label */}
            <div style={{
              display: "flex", alignItems: "center", gap: "10px",
              marginBottom: "20px", color: "#64748B", fontSize: "13px",
            }}>
              <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.08)" }} />
              <span>{es ? "O elige una categoría" : "Or choose a category"}</span>
              <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.08)" }} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
              {QUICK_ACCESS.map((svc) => (
                <button
                  key={svc.id}
                  className="pg-qa-card"
                  onClick={() => handleQuickAccess(svc.id, svc.name)}
                  style={{
                    background: "#0F2F50",
                    border: "1.5px solid rgba(255,255,255,0.08)",
                    borderRadius: "16px",
                    padding: "16px 8px", cursor: "pointer", display: "flex",
                    flexDirection: "column", alignItems: "center", gap: "8px",
                    boxShadow: "0 2px 10px rgba(0,0,0,0.20)",
                  }}
                >
                  <span style={{ fontSize: "22px" }}>{svc.icon}</span>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "white", textAlign: "center", lineHeight: 1.2 }}>
                    {svc.name}
                  </span>
                </button>
              ))}
            </div>

            <button
              onClick={() => navigate("/servicios")}
              style={{
                width: "100%", marginTop: "14px", padding: "12px",
                borderRadius: "12px", border: "1.5px solid #1D9E75",
                background: "transparent", color: "#1D9E75", fontSize: "14px",
                fontWeight: 700, cursor: "pointer",
              }}
            >
              {es ? "Ver todos los servicios →" : "See all services →"}
            </button>
          </div>
        </section>

        <Divider />

        {/* ══════════════════════════════════════════════════════
            SOFT REGISTRATION CTA — navy (already correct)
        ══════════════════════════════════════════════════════ */}
        <section style={{ background: "#0A2540", padding: "40px 24px" }}>
          <div style={{ maxWidth: "480px", margin: "0 auto", textAlign: "center" }}>
            <p style={{ fontSize: "12px", fontWeight: 700, color: "#1D9E75", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "10px" }}>
              {es ? "¿Todavía no estás listo?" : "Not ready yet?"}
            </p>
            <h2 style={{ fontSize: "22px", fontWeight: 900, color: "white", lineHeight: 1.25, marginBottom: "10px" }}>
              {es ? "Regístrate gratis y te avisamos" : "Register free and we'll notify you"}
            </h2>
            <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.70)", lineHeight: 1.6, maxWidth: "340px", margin: "0 auto 24px" }}>
              {es
                ? "Te notificamos por WhatsApp cuando quieras pagar tu próximo servicio."
                : "We'll notify you on WhatsApp when you're ready to pay."}
            </p>
            {notifSent ? (
              <div style={{
                background: "rgba(29,158,117,0.15)", border: "1px solid rgba(29,158,117,0.40)",
                borderRadius: "16px", padding: "18px 20px", color: "white", fontSize: "15px", fontWeight: 600,
              }}>
                ✅ {es ? "¡Listo! Te contactaremos por WhatsApp." : "Done! We'll reach out on WhatsApp."}
              </div>
            ) : (
              <form onSubmit={handleNotifSubmit} style={{ display: "flex", gap: "10px", maxWidth: "380px", margin: "0 auto" }}>
                <input
                  type="tel"
                  value={notifPhone}
                  onChange={(e) => setNotifPhone(e.target.value)}
                  placeholder={es ? "Tu número WhatsApp" : "Your WhatsApp number"}
                  style={{
                    flex: 1, padding: "14px 16px", borderRadius: "12px",
                    border: "none", fontSize: "15px", outline: "none",
                    background: "rgba(255,255,255,0.10)", color: "white",
                  }}
                />
                <button
                  type="submit"
                  style={{
                    padding: "14px 20px", borderRadius: "12px", border: "none",
                    background: "#1D9E75", color: "white", fontSize: "15px",
                    fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
                  }}
                >
                  {es ? "Avisar" : "Notify me"}
                </button>
              </form>
            )}
          </div>
        </section>

      </main>
    </div>
  );
}
