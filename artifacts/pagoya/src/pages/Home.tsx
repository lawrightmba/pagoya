import { useState, useEffect, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { useLocation } from "wouter";
import { usePayment } from "@/context/PaymentContext";
import WalletBalanceWidget from "@/components/WalletBalanceWidget";
import PTIScoreCard from "@/components/PTIScoreCard";
import PTIIntroModal from "@/components/PTIIntroModal";
import AutofillInput from "@/components/AutofillInput";
import BillerTicker from "@/components/BillerTicker";
import PaulaHint from "@/components/PaulaHint";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useTrackEvent, trackEvent } from "@/hooks/useTrackEvent";

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
  { id: "cfe",      icon: "⚡", name: "CFE",       color: "#007A4A" },
  { id: "telcel",   icon: "📱", name: "Telcel",    color: "#FF5C1A" },
  { id: "telmex",   icon: "🌐", name: "Telmex",    color: "#5B48D9" },
  { id: "izzi",     icon: "📺", name: "Izzi",      color: "#007A4A" },
  { id: "sky",      icon: "📡", name: "Sky",       color: "#FF5C1A" },
  { id: "netflix",  icon: "🎬", name: "Netflix",   color: "#D4145A" },
];

// ─── Gift card catalog ────────────────────────────────────────────────────────

// Gift cards grouped by purchase intent / psychological trigger
const GIFT_CARD_GROUPS = [
  {
    id: "entretenimiento",
    labelEs: "Entretenimiento", labelEn: "Entertainment", emoji: "🎬",
    brands: [
      { id: "netflix",     emoji: "🎬", name: "Netflix",     denominations: [
        { serviceId: "netflix_100",      amount: 100 },
        { serviceId: "netflix_300",      amount: 300 },
        { serviceId: "netflix_500",      amount: 500 },
        { serviceId: "netflix_700",      amount: 700 },
      ]},
      { id: "spotify",     emoji: "🎵", name: "Spotify",     denominations: [
        { serviceId: "spotify_79",       amount: 79 },
        { serviceId: "spotify_99",       amount: 99 },
        { serviceId: "spotify_149",      amount: 149 },
        { serviceId: "spotify_199",      amount: 199 },
      ]},
      { id: "disney_plus", emoji: "🏰", name: "Disney+",     denominations: [
        { serviceId: "disney_99",        amount: 99 },
        { serviceId: "disney_139",       amount: 139 },
        { serviceId: "disney_279",       amount: 279 },
      ]},
      { id: "hbo_max",     emoji: "🎭", name: "Max (HBO)",   denominations: [
        { serviceId: "hbo_max_169",      amount: 169 },
        { serviceId: "hbo_max_219",      amount: 219 },
        { serviceId: "hbo_max_279",      amount: 279 },
      ]},
      { id: "cinepolis",   emoji: "🎟️", name: "Cinépolis",   denominations: [
        { serviceId: "cinepolis_100",    amount: 100 },
        { serviceId: "cinepolis_140",    amount: 140 },
        { serviceId: "cinepolis_165",    amount: 165 },
        { serviceId: "cinepolis_210",    amount: 210 },
        { serviceId: "cinepolis_280",    amount: 280 },
      ]},
      { id: "gplay",       emoji: "🎮", name: "Google Play", denominations: [
        { serviceId: "google_play_50",   amount: 50 },
        { serviceId: "google_play_100",  amount: 100 },
        { serviceId: "google_play_200",  amount: 200 },
        { serviceId: "google_play_500",  amount: 500 },
      ]},
    ],
  },
  {
    id: "conveniencia",
    labelEs: "Conveniencia", labelEn: "On-the-go", emoji: "🚀",
    brands: [
      { id: "uber",        emoji: "🚗", name: "Uber",        denominations: [
        { serviceId: "uber_100",         amount: 100 },
        { serviceId: "uber_200",         amount: 200 },
        { serviceId: "uber_300",         amount: 300 },
        { serviceId: "uber_500",         amount: 500 },
      ]},
      { id: "uber_eats",   emoji: "🍔", name: "Uber Eats",   denominations: [
        { serviceId: "uber_eats_100",    amount: 100 },
        { serviceId: "uber_eats_200",    amount: 200 },
        { serviceId: "uber_eats_300",    amount: 300 },
      ]},
      { id: "amazon",      emoji: "📦", name: "Amazon",      denominations: [
        { serviceId: "amazon_100",       amount: 100 },
        { serviceId: "amazon_200",       amount: 200 },
        { serviceId: "amazon_500",       amount: 500 },
        { serviceId: "amazon_1000",      amount: 1000 },
      ]},
    ],
  },
  {
    id: "tiendas",
    labelEs: "Tiendas", labelEn: "Retail", emoji: "🛍️",
    brands: [
      { id: "liverpool",   emoji: "🛍️", name: "Liverpool",   denominations: [
        { serviceId: "liverpool_500",    amount: 500 },
        { serviceId: "liverpool_1000",   amount: 1000 },
        { serviceId: "liverpool_2000",   amount: 2000 },
        { serviceId: "liverpool_3000",   amount: 3000 },
        { serviceId: "liverpool_5000",   amount: 5000 },
      ]},
      { id: "soriana",     emoji: "🛒", name: "Soriana",     denominations: [
        { serviceId: "soriana_200",      amount: 200 },
        { serviceId: "soriana_500",      amount: 500 },
        { serviceId: "soriana_1000",     amount: 1000 },
        { serviceId: "soriana_2000",     amount: 2000 },
      ]},
      { id: "starbucks",   emoji: "☕", name: "Starbucks",   denominations: [
        { serviceId: "starbucks_100",    amount: 100 },
        { serviceId: "starbucks_200",    amount: 200 },
        { serviceId: "starbucks_300",    amount: 300 },
        { serviceId: "starbucks_500",    amount: 500 },
      ]},
    ],
  },
];

// ─── Sub-components ────────────────────────────────────────────────────────────

function Divider() {
  return <div style={{ height: "1px", background: "rgba(0,0,0,0.07)", margin: "0 20px" }} />;
}

function StepRow({ number, icon, es, en, lang }: { number: number; icon: string; es: string; en: string; lang: "es" | "en" }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: "14px" }}>
      <div style={{
        width: "30px", height: "30px", borderRadius: "50%", flexShrink: 0,
        background: "#007A4A", color: "white",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "13px", fontWeight: 800,
      }}>
        {number}
      </div>
      <div>
        <span style={{ fontSize: "18px", marginRight: "6px" }}>{icon}</span>
        <span style={{ fontSize: "14px", color: "#0D2618", fontWeight: 500 }}>
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
  const [bonusBannerDismissed, setBonusBannerDismissed] = useState<boolean>(() => {
    try { return localStorage.getItem("bonus_banner_v1") === "1"; } catch { return false; }
  });

  function dismissBonusBanner(e: React.MouseEvent) {
    e.stopPropagation();
    try { localStorage.setItem("bonus_banner_v1", "1"); } catch { /* ignore */ }
    setBonusBannerDismissed(true);
  }

  // Handle WhatsApp deep-link pre-fill: ?pagar=CFE&service=cfe&tel=521234567890
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const pagar   = params.get("pagar");
      const service = params.get("service");
      const tel     = params.get("tel");
      if (pagar) {
        if (tel) {
          localStorage.setItem("pagoya_telefono", tel);
          localStorage.setItem("pagoya_phone", tel);
        }
        // Normalise service ID: lowercase, strip accents/spaces → "cfe", "telmex", etc.
        const categoria = service
          ? service.toLowerCase()
          : pagar.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "_");
        setPaymentData({ ...paymentData, empresa: pagar, categoria });
        // Clean URL then navigate to payment form
        window.history.replaceState({}, "", window.location.pathname);
        navigate("/pagar");
      }
    } catch { /* ignore */ }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Load points balance from localStorage phone
  useEffect(() => {
    const storedPhone = (() => { try { return localStorage.getItem("pagoya_phone") ?? ""; } catch { return ""; } })();
    if (!storedPhone) return;
    fetch(`${import.meta.env.BASE_URL?.replace(/\/$/, "") ?? ""}/api/loyalty/balance/${encodeURIComponent(storedPhone)}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d && typeof d.points_balance === "number") setPointsBalance(d.points_balance); })
      .catch(() => {});
  }, []);

  // ── Silent credit-score event tracking ───────────────────────────────────
  const track = useTrackEvent();
  useEffect(() => {
    const tel = (() => { try { return localStorage.getItem("pagoya_telefono") ?? ""; } catch { return ""; } })();
    if (!tel) return;
    const sessionStart = Date.now();
    track("login", { hour: new Date().getHours(), day_of_week: new Date().getDay() });
    return () => {
      const seconds = Math.round((Date.now() - sessionStart) / 1000);
      trackEvent("session_end", { session_seconds: seconds });
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const es = lang === "es";

  // ── Push notifications ────────────────────────────────────────────────────
  const storedPhone = (() => { try { return localStorage.getItem("pagoya_telefono") ?? ""; } catch { return ""; } })();
  const push = usePushNotifications(storedPhone || null);
  const [pushDismissed, setPushDismissed] = useState<boolean>(() => {
    try { return localStorage.getItem("push_banner_v1") === "1"; } catch { return false; }
  });

  function dismissPushBanner() {
    try { localStorage.setItem("push_banner_v1", "1"); } catch { /* ignore */ }
    setPushDismissed(true);
  }

  const showPushBanner = push.supported && !push.subscribed && !pushDismissed && !!storedPhone && push.permission !== "denied";

  // ── PTI intro modal (first-time score intro) ──────────────────────────────
  const [showPTIIntro, setShowPTIIntro] = useState(false);
  const [ptiRefreshKey, setPtiRefreshKey] = useState(0);

  useEffect(() => {
    if (!storedPhone) return;
    const seen = localStorage.getItem("pagoya_pti_intro_seen");
    if (seen) return;
    // Only show if user has no score yet — check via API
    const base = (import.meta.env.BASE_URL ?? "").replace(/\/$/, "");
    fetch(`${base}/api/pti/score?telefono=${encodeURIComponent(storedPhone)}`)
      .then(r => r.json())
      .then((data: { score?: number | null; is_new_user?: boolean }) => {
        if (data.is_new_user || data.score == null) {
          setShowPTIIntro(true);
        }
      })
      .catch(() => {});
  }, [storedPhone]); // eslint-disable-line react-hooks/exhaustive-deps

  function handlePTIIntroDismiss() {
    setShowPTIIntro(false);
    setPtiRefreshKey(k => k + 1);
  }

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

  function handleGiftCard(serviceId: string, brandName: string, amount: number) {
    setPaymentData({ ...paymentData, empresa: brandName, categoria: serviceId, monto: String(amount), referencia: "" });
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
    <div style={{ background: "#FFFFFF", minHeight: "100vh", display: "flex", flexDirection: "column", overflowX: "hidden" }}>
      {showPTIIntro && storedPhone && (
        <PTIIntroModal telefono={storedPhone} onDismiss={handlePTIIntroDismiss} />
      )}
      <Helmet>
        <title>PagoYa | Paga tus servicios desde tu celular | Puerto Vallarta</title>
        <meta name="robots" content="index, follow" />
        <meta name="description" content="Paga luz, agua, teléfono y más desde tu celular sin ir al banco. PagoYa es la app de pagos más fácil de Puerto Vallarta y Guadalajara." />
        <meta name="keywords" content="pagar servicios en línea, pago de luz Puerto Vallarta, pagar CFE, pago de agua, app de pagos México" />
        <meta property="og:title" content="PagoYa | Paga tus servicios desde tu celular" />
        <meta property="og:description" content="Sin banco, sin filas. Paga todos tus servicios desde tu celular en Puerto Vallarta." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://pagoyamx.com" />
        <link rel="canonical" href="https://pagoyamx.com/" />
      </Helmet>

      {/* ── CSS ── */}
      <style>{`
        @keyframes pgStatReveal { 0%{opacity:0;transform:translateY(12px)}100%{opacity:1;transform:translateY(0)} }
        .pg-qa-card { transition:transform 0.18s,box-shadow 0.18s,border-color 0.18s; }
        .pg-qa-card:hover { transform:scale(1.04); box-shadow:0 6px 22px rgba(0,0,0,0.12)!important; border-color:#007A4A!important; }
        @media(max-width:600px){
          .hero-h1{font-size:28px!important;}
          .hero-steps{flex-direction:column!important;gap:14px!important;}
          .hero-cta-btn{height:56px!important;font-size:16px!important;}
        }
        @media(min-width:601px){
          .hero-h1{font-size:40px!important;}
          .hero-steps{flex-direction:row!important;gap:28px!important;}
        }
        @keyframes bonusPulse {
          0%,100%{box-shadow:0 0 0 0 rgba(216,90,48,0.0);}
          50%{box-shadow:0 0 16px 4px rgba(216,90,48,0.30);}
        }
        .bonus-strip { animation: bonusPulse 2.8s ease-in-out infinite; transition: filter 0.15s; }
        .bonus-strip:hover { filter:brightness(1.08); }
      `}</style>

      {/* ══════════════════════════════════════════════════════
          A. NAV BAR — navy (unchanged)
      ══════════════════════════════════════════════════════ */}
      <header style={{
        background: "linear-gradient(90deg, #005432 0%, #006B3C 100%)",
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
            onClick={() => navigate("/wallet/historial")}
            style={{
              fontSize: "12px", fontWeight: 700, color: "rgba(255,255,255,0.80)",
              border: "1.5px solid rgba(255,255,255,0.28)", borderRadius: "999px",
              padding: "4px 10px", background: "rgba(255,255,255,0.10)", cursor: "pointer",
              whiteSpace: "nowrap", fontFamily: "inherit",
            }}
          >
            {es ? "Mis pagos" : "My payments"}
          </button>
          <button
            onClick={() => navigate("/puntos")}
            style={{
              fontSize: "12px", fontWeight: 700, color: "#6EF5B0",
              border: "1.5px solid rgba(110,245,176,0.50)", borderRadius: "999px",
              padding: "4px 10px", background: "rgba(110,245,176,0.14)", cursor: "pointer",
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
          background: "linear-gradient(180deg, #005432 0%, #007A4A 70%, #008A52 100%)",
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
            <span style={{ color: "#6EF5B0" }}>
              {es ? "en menos de 2 minutos" : "in under 2 minutes"}
            </span>
          </h1>

          <p style={{
            fontSize: "16px",
            color: "rgba(255,255,255,0.78)",
            maxWidth: "340px",
            lineHeight: 1.6,
            margin: "0 0 12px",
          }}>
            {es
              ? "Sin filas. Sin apps. Sin cuenta de banco."
              : "No lines. No apps. No bank account needed."}
          </p>

          {/* ── HERO BONUS BADGE — visible above fold on every device ── */}
          <button
            onClick={() => navigate("/register")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "rgba(255,92,26,0.18)",
              border: "1px solid rgba(255,92,26,0.55)",
              borderRadius: "999px",
              padding: "6px 16px",
              fontSize: "13px",
              fontWeight: 700,
              color: "#FFCFB8",
              cursor: "pointer",
              marginBottom: "28px",
              letterSpacing: "0.01em",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,92,26,0.30)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,92,26,0.18)"; }}
          >
            🎁&nbsp;{es ? "$25 MXN de bienvenida al registrarte gratis" : "$25 MXN welcome bonus — sign up free"}
          </button>
        </section>

        {/* ══════════════════════════════════════════════════════
            C. BILLER TICKER
            Pass dark=true so pills use semi-transparent white bg
            Fade mask updated inside BillerTicker via dark prop
        ══════════════════════════════════════════════════════ */}
        <section style={{ padding: "0 0 28px", marginTop: "0", background: "#008A52" }}>
          <BillerTicker small dark fadeColor="#008A52" />
        </section>

        {/* ══════════════════════════════════════════════════════
            D. 3-STEP HOW TO USE
        ══════════════════════════════════════════════════════ */}
        <section style={{ padding: "28px 24px 28px", background: "#F4FBF7" }}>
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
            E-0. RASPA Y GANA TEASER
        ══════════════════════════════════════════════════════ */}
        <section style={{ padding: "20px 24px 0", background: "linear-gradient(180deg, #008A52 0%, #FFFFFF 100%)" }}>
          <button
            onClick={() => navigate("/juegos")}
            style={{
              width: "100%", border: "none", cursor: "pointer", padding: 0,
              background: "linear-gradient(135deg, #004F2D 0%, #007A4A 60%, #00C875 100%)",
              borderRadius: "18px", overflow: "hidden",
              boxShadow: "0 8px 28px rgba(0,79,45,0.35)",
              display: "flex", alignItems: "center", gap: "16px",
              padding: "18px 20px",
              position: "relative",
            }}
          >
            <div style={{ position: "absolute", top: "-12px", right: "-12px", width: "80px", height: "80px", background: "rgba(255,255,255,0.06)", borderRadius: "50%" }} />
            <span style={{ fontSize: "40px", flexShrink: 0 }}>🎟️</span>
            <div style={{ textAlign: "left", flex: 1 }}>
              <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "11px", fontWeight: 700, color: "#00C875", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "2px" }}>
                Gratis · cada día
              </p>
              <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "22px", fontWeight: 900, color: "#FFFFFF", lineHeight: 1, marginBottom: "4px" }}>
                Raspa y Gana
              </p>
              <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "12px", color: "rgba(255,255,255,0.65)" }}>
                Gana puntos y saldo MXN en segundos →
              </p>
            </div>
            <div style={{ background: "#00C875", borderRadius: "10px", padding: "8px 14px", flexShrink: 0 }}>
              <span style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "15px", fontWeight: 900, color: "#004F2D" }}>JUGAR</span>
            </div>
          </button>
        </section>

        {/* ══════════════════════════════════════════════════════
            E. AUTOFILL INPUT
        ══════════════════════════════════════════════════════ */}
        <section style={{ padding: "28px 24px 28px", background: "#FFFFFF" }}>
          <div style={{ maxWidth: "560px", margin: "0 auto" }}>
            {storedPhone && (
              <div style={{ marginBottom: "20px" }}>
                <WalletBalanceWidget />
              </div>
            )}
            {storedPhone && (
              <div style={{ marginBottom: "20px" }}>
                <PTIScoreCard telefono={storedPhone} refreshKey={ptiRefreshKey} />
              </div>
            )}
            <AutofillInput
              phone={phone}
              language={lang}
              onAutofill={handleAutofill}
            />

            <div style={{ textAlign: "center", margin: "10px 0 4px" }}>
              <PaulaHint
                message="Hola Paula, ¿cómo funciona PagoYa? ¿Puedo usarlo sin tener cuenta bancaria?"
                label="¿Tienes dudas? Pregúntale a Paula"
              />
            </div>

            {/* ── SIGN-UP BONUS STRIP ── */}
            <button
              className="bonus-strip"
              onClick={() => navigate("/register")}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
                padding: "12px 16px",
                marginBottom: "10px",
                background: "rgba(255,92,26,0.07)",
                border: "1.5px solid rgba(255,92,26,0.30)",
                borderRadius: "14px",
                cursor: "pointer",
                textAlign: "left",
                gap: "10px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1 }}>
                <span style={{ fontSize: "22px", flexShrink: 0 }}>🎁</span>
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 800, color: "#0D2618", lineHeight: 1.2 }}>
                    {es
                      ? "Abre tu billetera gratis · recibe $25 MXN"
                      : "Open your wallet free · get $25 MXN"}
                  </div>
                  <div style={{ fontSize: "11px", color: "#6B9980", marginTop: "2px" }}>
                    {es
                      ? "Sin banco, sin trámites · se acredita al instante"
                      : "No bank needed · credited instantly"}
                  </div>
                </div>
              </div>
              <span style={{
                flexShrink: 0,
                fontSize: "12px",
                fontWeight: 700,
                color: "#FF5C1A",
                whiteSpace: "nowrap",
              }}>
                {es ? "Abre tu cuenta →" : "Sign up →"}
              </span>
            </button>

            {/* CTA button */}
            <button
              className="hero-cta-btn"
              onClick={() => navigate("/pagar")}
              style={{
                width: "100%",
                height: "52px",
                borderRadius: "14px",
                border: "none",
                background: "#007A4A",
                color: "white",
                fontSize: "17px",
                fontWeight: 700,
                cursor: "pointer",
                letterSpacing: "0.01em",
                boxShadow: "0 4px 18px rgba(0,122,74,0.32)",
                transition: "filter 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.filter = "brightness(1.08)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.filter = ""; }}
            >
              {es ? "Pagar ahora →" : "Pay now →"}
            </button>

            {/* Trust microcopy */}
            <p style={{
              marginTop: "5px",
              marginBottom: 0,
              fontSize: "11px",
              color: "#6B9980",
              textAlign: "center",
              lineHeight: 1.4,
            }}>
              {es
                ? "🔒 Pago seguro · Sin registro para tu primer pago · $25 MXN por transacción"
                : "🔒 Secure payment · No signup for first payment · $25 MXN per transaction"}
            </p>

            {/* ── TRUST PILLS ── */}
            <div style={{
              marginTop: "14px",
              display: "flex",
              gap: "6px",
              justifyContent: "center",
              flexWrap: "wrap",
            }}>
              {(es
                ? ["✓ Sin banco requerido", "✓ Sin app", "✓ Comprobante por WhatsApp"]
                : ["✓ No bank needed", "✓ No app", "✓ WhatsApp receipt"]
              ).map((t) => (
                <span key={t} style={{
                  fontSize: "11px",
                  color: "#046C2C",
                  background: "#F0FAF3",
                  padding: "4px 10px",
                  borderRadius: "999px",
                  border: "1px solid #CBE9D9",
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                }}>
                  {t}
                </span>
              ))}
            </div>

            {/* ── TRUST BAR ── */}
            <div style={{
              marginTop: "20px",
              padding: "12px 16px",
              borderRadius: "14px",
              background: "#F4FBF7",
              border: "1px solid #CBE9D9",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "6px",
            }}>
              {[
                { icon: "🔐", label: "Conekta" },
                { icon: "🏪", label: "OXXO Pay" },
                { icon: "🏦", label: "SPEI" },
                { icon: "🇲🇽", label: "Banxico" },
              ].map((item, i, arr) => (
                <div key={item.label} style={{ display: "contents" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "3px", flex: 1 }}>
                    <span style={{ fontSize: "16px", lineHeight: 1 }}>{item.icon}</span>
                    <span style={{ fontSize: "9px", fontWeight: 700, color: "rgba(13,38,24,0.55)", letterSpacing: "0.04em", textAlign: "center" }}>
                      {item.label}
                    </span>
                  </div>
                  {i < arr.length - 1 && (
                    <div style={{ width: "1px", height: "28px", background: "rgba(0,0,0,0.10)", flexShrink: 0 }} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════
            GIFT CARDS — Celebration section
        ══════════════════════════════════════════════════════ */}
        <section style={{
          background: "linear-gradient(135deg, #FF5C1A 0%, #FF9A3C 32%, #00C875 68%, #007A4A 100%)",
          padding: "28px 20px",
          position: "relative",
          overflow: "hidden",
        }}>
          <div style={{ position: "absolute", top: -50, right: -50, width: 180, height: 180, borderRadius: "50%", background: "rgba(255,255,255,0.08)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", bottom: -40, left: -40, width: 140, height: 140, borderRadius: "50%", background: "rgba(255,255,255,0.06)", pointerEvents: "none" }} />

          <div style={{ maxWidth: "560px", margin: "0 auto", position: "relative" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
              <span style={{ fontSize: "26px" }}>🎁</span>
              <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 900, color: "#FFFFFF", letterSpacing: "-0.01em" }}>
                {es ? "Gift Cards Digitales" : "Digital Gift Cards"}
              </h2>
            </div>
            <p style={{ margin: "0 0 18px", fontSize: "13px", color: "rgba(255,255,255,0.82)", lineHeight: 1.4 }}>
              {es ? "Compra al instante · PIN llega por WhatsApp 📲" : "Buy instantly · PIN sent on WhatsApp 📲"}
            </p>

            <style>{`.gc-scroll::-webkit-scrollbar{display:none}`}</style>
            <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
              {GIFT_CARD_GROUPS.map((group) => (
                <div key={group.id}>
                  {/* Group label */}
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                    <span style={{ fontSize: "13px" }}>{group.emoji}</span>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "rgba(255,255,255,0.70)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                      {es ? group.labelEs : group.labelEn}
                    </span>
                    <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.18)", marginLeft: "4px" }} />
                  </div>
                  {/* Brand cards — horizontal scroll */}
                  <div className="gc-scroll" style={{ display: "flex", gap: "10px", overflowX: "auto", paddingBottom: "4px" }}>
                    {group.brands.map((brand) => (
                      <div key={brand.id} style={{
                        flexShrink: 0,
                        background: "rgba(255,255,255,0.15)",
                        backdropFilter: "blur(10px)",
                        border: "1px solid rgba(255,255,255,0.28)",
                        borderRadius: "16px",
                        padding: "14px 14px 12px",
                        minWidth: "140px",
                      }}>
                        <div style={{ fontSize: "24px", marginBottom: "5px", lineHeight: 1 }}>{brand.emoji}</div>
                        <div style={{ fontWeight: 800, color: "#FFFFFF", fontSize: "13px", marginBottom: "10px", lineHeight: 1.2 }}>{brand.name}</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
                          {brand.denominations.map((d) => (
                            <button
                              key={d.serviceId}
                              onClick={() => handleGiftCard(d.serviceId, brand.name, d.amount)}
                              style={{
                                background: "rgba(255,255,255,0.22)",
                                border: "1px solid rgba(255,255,255,0.40)",
                                borderRadius: "999px",
                                padding: "4px 9px",
                                fontSize: "11px",
                                fontWeight: 700,
                                color: "#FFFFFF",
                                cursor: "pointer",
                                whiteSpace: "nowrap",
                                transition: "background 0.15s",
                              }}
                              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.36)"; }}
                              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.22)"; }}
                            >
                              ${d.amount >= 1000 ? `${d.amount / 1000}K` : d.amount}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => navigate("/servicios?categoria=Gift+Cards")}
              style={{
                marginTop: "16px", width: "100%", padding: "12px",
                borderRadius: "12px", border: "1.5px solid rgba(255,255,255,0.42)",
                background: "rgba(255,255,255,0.14)", color: "#FFFFFF",
                fontSize: "14px", fontWeight: 700, cursor: "pointer",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.22)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.14)"; }}
            >
              {es ? "Ver todas las gift cards →" : "See all gift cards →"}
            </button>

            {/* ── RENT VERTICAL COMPACT CARD ── */}
            <div style={{
              marginTop: "16px",
              background: "rgba(255,255,255,0.12)",
              border: "1px solid rgba(255,255,255,0.28)",
              borderRadius: "14px",
              padding: "14px 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
            }}>
              <p style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#FFFFFF", lineHeight: 1.3 }}>
                {es ? "¿Pagas renta? 🏠" : "Pay Rent? 🏠"}
              </p>
              <a
                href="https://pagoseguromx.com"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  flexShrink: 0,
                  background: "rgba(255,255,255,0.22)",
                  color: "#FFFFFF",
                  fontSize: "12px",
                  fontWeight: 700,
                  padding: "8px 14px",
                  borderRadius: "10px",
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                  border: "1px solid rgba(255,255,255,0.35)",
                }}
              >
                {es ? "PagoSeguro →" : "PagoSeguro →"}
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
          background: "#EBF7F0", padding: "20px 16px",
          display: "flex", alignItems: "stretch", justifyContent: "center",
          borderBottom: "1px solid rgba(0,0,0,0.06)",
        }}>
          {[
            { num: "35+",      label: es ? "Servicios disponibles"   : "Services available"   },
            { num: "2 min",    label: es ? "Tiempo promedio de pago" : "Average payment time" },
            { num: "WhatsApp", label: es ? "Comprobante instantáneo" : "Instant receipt"      },
          ].map((stat, i) => (
            <div key={stat.num} style={{ display: "contents" }}>
              {i > 0 && <div style={{ width: "1px", background: "rgba(0,0,0,0.08)", margin: "4px 0" }} />}
              <div style={{
                flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
                padding: "8px 6px", textAlign: "center",
                animation: `pgStatReveal 0.6s ease-out ${i * 0.15}s both`,
              }}>
                <span style={{ fontSize: "20px", fontWeight: 900, color: "#007A4A", lineHeight: 1.1, marginBottom: "3px" }}>
                  {stat.num}
                </span>
                <span style={{ fontSize: "10px", color: "#0D2618", fontWeight: 600, lineHeight: 1.3 }}>
                  {stat.label}
                </span>
              </div>
            </div>
          ))}
        </section>

        <Divider />

        {/* ══════════════════════════════════════════════════════
            WALLET — push notification banner only
        ══════════════════════════════════════════════════════ */}
        <section style={{ background: "#FFFFFF", padding: "24px 20px 8px" }}>
          <div style={{ maxWidth: "360px", margin: "0 auto" }}>
            {!storedPhone && <WalletBalanceWidget />}

            {/* ── Push notification opt-in banner ─────────────────── */}
            {showPushBanner && (
              <div style={{
                marginTop: "14px",
                background: "rgba(0,122,74,0.07)",
                border: "1px solid rgba(0,122,74,0.25)",
                borderRadius: "12px",
                padding: "12px 14px",
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}>
                <span style={{ fontSize: "22px" }}>🔔</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: "#fff", fontSize: "13px", fontWeight: 600, marginBottom: "2px" }}>
                    {es ? "Recibe avisos de pago" : "Get payment alerts"}
                  </div>
                  <div style={{ color: "#94A3B8", fontSize: "12px" }}>
                    {es ? "Activa notificaciones para saber cuando tu pago fue procesado." : "Know instantly when your payment goes through."}
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", flexShrink: 0 }}>
                  <button
                    onClick={() => push.subscribe()}
                    disabled={push.loading}
                    style={{
                      background: "#007A4A", color: "#fff",
                      border: "none", borderRadius: "8px",
                      padding: "6px 12px", fontSize: "12px", fontWeight: 600,
                      cursor: push.loading ? "default" : "pointer",
                      opacity: push.loading ? 0.7 : 1,
                    }}
                  >
                    {push.loading ? "..." : (es ? "Activar" : "Enable")}
                  </button>
                  <button
                    onClick={dismissPushBanner}
                    style={{
                      background: "transparent", color: "#64748B",
                      border: "none", fontSize: "11px",
                      cursor: "pointer", padding: "2px 4px",
                    }}
                  >
                    {es ? "Ahora no" : "Not now"}
                  </button>
                </div>
              </div>
            )}

            {/* Subscribed confirmation — shown once */}
            {push.subscribed && !pushDismissed && (
              <div style={{
                marginTop: "10px",
                background: "rgba(0,122,74,0.07)",
                borderRadius: "10px",
                padding: "8px 12px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}>
                <span style={{ fontSize: "16px" }}>✅</span>
                <span style={{ color: "#007A4A", fontSize: "12px" }}>
                  {es ? "Notificaciones activadas" : "Notifications enabled"}
                </span>
              </div>
            )}
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
        <section style={{ background: "#F4FBF7", padding: "24px 20px" }}>
          <div style={{ maxWidth: "400px", margin: "0 auto" }}>
            {/* Divider label */}
            <div style={{
              display: "flex", alignItems: "center", gap: "10px",
              marginBottom: "20px", color: "#5B8070", fontSize: "13px",
            }}>
              <div style={{ flex: 1, height: "1px", background: "rgba(0,0,0,0.08)" }} />
              <span>{es ? "O elige una categoría" : "Or choose a category"}</span>
              <div style={{ flex: 1, height: "1px", background: "rgba(0,0,0,0.08)" }} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
              {QUICK_ACCESS.map((svc) => (
                <button
                  key={svc.id}
                  className="pg-qa-card"
                  onClick={() => handleQuickAccess(svc.id, svc.name)}
                  style={{
                    background: "#FFFFFF",
                    border: "1.5px solid #D4EDE1",
                    borderRadius: "16px",
                    padding: "16px 8px", cursor: "pointer", display: "flex",
                    flexDirection: "column", alignItems: "center", gap: "8px",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                  }}
                >
                  <span style={{ fontSize: "22px" }}>{svc.icon}</span>
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "#0D2618", textAlign: "center", lineHeight: 1.2 }}>
                    {svc.name}
                  </span>
                </button>
              ))}
            </div>

            <button
              onClick={() => navigate("/servicios")}
              style={{
                width: "100%", marginTop: "14px", padding: "12px",
                borderRadius: "12px", border: "1.5px solid #007A4A",
                background: "transparent", color: "#007A4A", fontSize: "14px",
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
        <section style={{ background: "#F4FBF7", padding: "40px 24px" }}>
          <div style={{ maxWidth: "480px", margin: "0 auto", textAlign: "center" }}>
            <p style={{ fontSize: "12px", fontWeight: 700, color: "#007A4A", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "10px" }}>
              {es ? "¿Todavía no estás listo?" : "Not ready yet?"}
            </p>
            <h2 style={{ fontSize: "22px", fontWeight: 900, color: "#0D2618", lineHeight: 1.25, marginBottom: "10px" }}>
              {es ? "Regístrate gratis y te avisamos" : "Register free and we'll notify you"}
            </h2>
            <p style={{ fontSize: "14px", color: "#5B8070", lineHeight: 1.6, maxWidth: "340px", margin: "0 auto 24px" }}>
              {es
                ? "Te notificamos por WhatsApp cuando quieras pagar tu próximo servicio."
                : "We'll notify you on WhatsApp when you're ready to pay."}
            </p>
            {notifSent ? (
              <div style={{
                background: "rgba(0,122,74,0.10)", border: "1px solid rgba(0,122,74,0.28)",
                borderRadius: "16px", padding: "18px 20px", color: "#0D2618", fontSize: "15px", fontWeight: 600,
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
                    border: "1px solid #CBE9D9", fontSize: "15px", outline: "none",
                    background: "#FFFFFF", color: "#0D2618",
                  }}
                />
                <button
                  type="submit"
                  style={{
                    padding: "14px 20px", borderRadius: "12px", border: "none",
                    background: "#007A4A", color: "white", fontSize: "15px",
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

      {/* FOOTER */}
      <footer style={{ background: "#005432", borderTop: "1px solid rgba(255,255,255,0.12)", padding: "20px 24px", textAlign: "center" }}>
        <p style={{ color: "#4B7A62", fontSize: "12px" }}>
          <span style={{ color: "#6A9F82" }}>© 2026 PagoYa · Longview Meridian Technologies LLC</span>
          {" · "}
          <a href="/terminos-y-condiciones" style={{ color: "#00C875", textDecoration: "none" }}>Términos y Condiciones</a>
          {" · "}
          <a href="mailto:soporte@pagoyamx.com" style={{ color: "#6A9F82", textDecoration: "none" }}>soporte@pagoyamx.com</a>
        </p>
      </footer>
    </div>
  );
}
