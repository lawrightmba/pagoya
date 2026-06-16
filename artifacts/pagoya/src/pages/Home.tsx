import { useState, useEffect, useCallback, useRef } from "react";
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
import HowItWorksSection from "@/components/HowItWorksSection";
import BonusBanner from "@/components/BonusBanner";
import GiftCardSection from "@/components/GiftCardSection";

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

// Gift card catalog moved to GiftCardSection component

// ─── Sub-components ────────────────────────────────────────────────────────────

function Divider() {
  return <div style={{ height: "1px", background: "rgba(0,0,0,0.07)", margin: "0 20px" }} />;
}

// StepRow moved to HowItWorksSection component

// ─── HOME ─────────────────────────────────────────────────────────────────────

export default function Home() {
  const [, navigate]            = useLocation();
  const { setPaymentData, paymentData } = usePayment();
  const [lang, setLang]         = useState<"es" | "en">(getLang);
  const [phone]                  = useState(paymentData.telefono ?? "");
  const [notifPhone, setNotifPhone] = useState("");
  const [notifSent, setNotifSent]   = useState(false);
  const [pointsBalance, setPointsBalance] = useState<number | null>(null);

  // Grand Prize teaser (S3.4)
  const [grandPrize, setGrandPrize]       = useState<{ prize_amount: number; total_entries: number } | null>(null);

  // Live payment counter — fetched from public /api/stats
  const [paymentCount, setPaymentCount]   = useState<number>(0);

  // PWA install prompt (S3.6)
  const deferredPrompt = useRef<Event & { prompt: () => void } | null>(null);
  const [showPwaSheet, setShowPwaSheet]   = useState(false);

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
  const [ptiPendingCompute, setPtiPendingCompute] = useState(false);

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

  function handlePTIIntroDismiss(computeSucceeded: boolean) {
    setShowPTIIntro(false);
    setPtiPendingCompute(!computeSucceeded);
    setPtiRefreshKey(k => k + 1);
  }

  useEffect(() => { setLangPref(lang); }, [lang]);

  // ── Grand Prize teaser fetch (S3.4) ───────────────────────────────────────
  useEffect(() => {
    const base = (import.meta.env.BASE_URL ?? "").replace(/\/$/, "");
    fetch(`${base}/api/games/grand-prize`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d && d.prize_amount > 0) setGrandPrize(d); })
      .catch(() => {});
  }, []);

  // ── Live payment counter ──────────────────────────────────────────────────
  useEffect(() => {
    const base = (import.meta.env.BASE_URL ?? "").replace(/\/$/, "");
    fetch(`${base}/api/stats`)
      .then(r => r.ok ? r.json() : null)
      .then((d: { payments_completed?: number } | null) => {
        if (d && typeof d.payments_completed === "number" && d.payments_completed > 0) {
          setPaymentCount(d.payments_completed);
        }
      })
      .catch(() => {});
  }, []);

  // ── PWA install prompt (S3.6) ─────────────────────────────────────────────
  useEffect(() => {
    if (localStorage.getItem("pwa_prompt_dismissed") === "1") return;
    const handler = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e as Event & { prompt: () => void };
    };
    window.addEventListener("beforeinstallprompt", handler);
    const timer = setTimeout(() => {
      if (deferredPrompt.current) setShowPwaSheet(true);
    }, 30000);
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      clearTimeout(timer);
    };
  }, []);

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
      <style>{`
        @keyframes rypShimmer {
          0%   { transform: translateX(-120%) skewX(-15deg); }
          60%  { transform: translateX(220%) skewX(-15deg); }
          100% { transform: translateX(220%) skewX(-15deg); }
        }
        @keyframes rypRipple {
          0%   { transform: scale(0.85); opacity: 0.85; }
          70%  { transform: scale(2.0);  opacity: 0; }
          100% { transform: scale(2.0);  opacity: 0; }
        }
        @keyframes rypPulse {
          0%, 100% { transform: scale(1);    box-shadow: 0 0 0 0 rgba(0,200,117,0.55); }
          50%      { transform: scale(1.07); box-shadow: 0 0 0 8px rgba(0,200,117,0); }
        }
        @keyframes rypBounce {
          0%, 100% { transform: translateX(0); }
          50%      { transform: translateX(4px); }
        }
        @keyframes rypFlipIn {
          0%   { transform: rotateY(-90deg); opacity: 0; }
          100% { transform: rotateY(0deg);   opacity: 1; }
        }
        .ryp-ticket {
          animation: rypFlipIn 0.35s cubic-bezier(0.34,1.56,0.64,1) both;
        }
      `}</style>
      {showPTIIntro && storedPhone && (
        <PTIIntroModal telefono={storedPhone} onDismiss={handlePTIIntroDismiss} />
      )}
      <Helmet>
        <title>PagoYa | Paga tus servicios desde tu celular | Puerto Vallarta</title>
        <meta name="robots" content="index, follow" />
        <meta name="description" content="Paga luz, agua, teléfono y más desde tu celular sin ir al banco. PagoYa: pagos de servicios en Puerto Vallarta y Guadalajara. Sin cuenta bancaria." />
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
            🎁&nbsp;{es ? "$150 MXN de bienvenida al registrarte gratis" : "$150 MXN welcome bonus — sign up free"}
          </button>

          {/* ── Live payment counter social proof ─────────────────────── */}
          {paymentCount > 0 && (
            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              background: "rgba(255,255,255,0.10)",
              borderRadius: "999px",
              padding: "5px 14px",
              marginBottom: "20px",
              fontSize: "12px",
              fontWeight: 700,
              color: "rgba(255,255,255,0.82)",
            }}>
              <span style={{ color: "#6EF5B0", fontSize: "13px" }}>✓</span>
              {es
                ? `${paymentCount.toLocaleString("es-MX")} pagos completados`
                : `${paymentCount.toLocaleString("en-US")} bills paid`}
            </div>
          )}
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
            D-0. GRAND PRIZE TEASER (S3.4)
        ══════════════════════════════════════════════════════ */}
        {grandPrize && (
          <section style={{ padding: "12px 20px 0", background: "#008A52" }}>
            <button
              onClick={() => navigate("/juegos?tab=premio")}
              style={{
                width: "100%", display: "flex", alignItems: "center",
                gap: "14px", padding: "16px 18px",
                background: "#004F2D", border: "none",
                borderRadius: "16px", cursor: "pointer",
                boxShadow: "0 4px 18px rgba(0,0,0,0.28)",
                textAlign: "left",
              }}
            >
              <span style={{ fontSize: "28px", flexShrink: 0 }}>🏆</span>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: "11px", fontWeight: 700, color: "rgba(255,255,255,0.65)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "2px" }}>
                  {es ? "Premio Mayor del Mes" : "Monthly Grand Prize"}
                </p>
                <p style={{ margin: 0, fontSize: "20px", fontWeight: 900, color: "#FF9A3C", lineHeight: 1.1 }}>
                  ${grandPrize.prize_amount.toLocaleString("es-MX")} MXN
                </p>
                <p style={{ margin: "3px 0 0", fontSize: "11px", color: "rgba(255,255,255,0.50)" }}>
                  {grandPrize.total_entries.toLocaleString("es-MX")} {es ? "participantes" : "entries"}
                </p>
              </div>
              <span style={{ fontSize: "13px", fontWeight: 700, color: "#6EF5B0", flexShrink: 0, whiteSpace: "nowrap" }}>
                {es ? "Ver sorteo →" : "View draw →"}
              </span>
            </button>
          </section>
        )}

        {/* ══════════════════════════════════════════════════════
            D. 3-STEP HOW TO USE
        ══════════════════════════════════════════════════════ */}
        <HowItWorksSection lang={lang} />

        {/* ══════════════════════════════════════════════════════
            E-0. RASPA Y GANA TEASER
        ══════════════════════════════════════════════════════ */}
        <section style={{ padding: "20px 24px 0", background: "linear-gradient(180deg, #008A52 0%, #FFFFFF 100%)" }}>
          <button
            onClick={() => navigate("/juegos")}
            style={{
              width: "100%", border: "none", cursor: "pointer",
              background: "linear-gradient(135deg, #004F2D 0%, #007A4A 60%, #00C875 100%)",
              borderRadius: "18px", overflow: "hidden",
              boxShadow: "0 8px 28px rgba(0,79,45,0.35)",
              display: "flex", alignItems: "center", gap: "16px",
              padding: "18px 20px",
              position: "relative",
            }}
          >
            {/* diagonal shimmer sweep — repeats every 4s */}
            <div style={{
              position: "absolute", inset: 0, pointerEvents: "none",
              overflow: "hidden", borderRadius: "18px",
            }}>
              <div style={{
                position: "absolute", top: 0, bottom: 0,
                width: "40%",
                background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)",
                animation: "rypShimmer 4s ease-in-out infinite",
              }} />
            </div>

            {/* background circle decoration */}
            <div style={{ position: "absolute", top: "-12px", right: "-12px", width: "80px", height: "80px", background: "rgba(255,255,255,0.06)", borderRadius: "50%" }} />

            {/* ticket badge + ripple ring */}
            <div style={{ position: "relative", flexShrink: 0, width: "72px", height: "52px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {/* ripple ring */}
              <div style={{
                position: "absolute", inset: 0, borderRadius: "12px",
                border: "2px solid rgba(0,200,117,0.7)",
                animation: "rypRipple 2.4s ease-out infinite",
              }} />
              {/* ticket badge — flips on lang change via key */}
              <div
                key={lang}
                className="ryp-ticket"
                style={{
                  width: "68px", height: "48px",
                  background: "linear-gradient(135deg, #FFD700 0%, #FFA500 100%)",
                  borderRadius: "8px",
                  display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center",
                  position: "relative", overflow: "hidden",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.35)",
                }}
              >
                {/* serrated edge line */}
                <div style={{
                  position: "absolute", left: 0, right: 0, top: "56%",
                  borderTop: "1.5px dashed rgba(0,0,0,0.25)",
                }} />
                {/* notch left */}
                <div style={{ position: "absolute", left: "-6px", top: "calc(56% - 6px)", width: "12px", height: "12px", borderRadius: "50%", background: "#007A4A" }} />
                {/* notch right */}
                <div style={{ position: "absolute", right: "-6px", top: "calc(56% - 6px)", width: "12px", height: "12px", borderRadius: "50%", background: "#007A4A" }} />
                {/* top stub text */}
                <span style={{
                  fontSize: "7.5px", fontWeight: 900, letterSpacing: "0.08em",
                  color: "rgba(0,0,0,0.75)", textTransform: "uppercase",
                  lineHeight: 1, marginBottom: "18px",
                  fontFamily: "DM Sans, sans-serif",
                }}>
                  {lang === "es" ? "UN BOLETO" : "ADMIT ONE"}
                </span>
                {/* bottom stub text */}
                <span style={{
                  position: "absolute", bottom: "5px",
                  fontSize: "6px", fontWeight: 700, letterSpacing: "0.06em",
                  color: "rgba(0,0,0,0.45)", textTransform: "uppercase",
                  fontFamily: "DM Sans, sans-serif",
                }}>
                  {lang === "es" ? "RASPA Y GANA" : "SCRATCH & WIN"}
                </span>
              </div>
            </div>

            <div style={{ textAlign: "left", flex: 1 }}>
              <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "11px", fontWeight: 700, color: "#00C875", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "2px" }}>
                {es ? "Gratis · cada día" : "Free · every day"}
              </p>
              <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "22px", fontWeight: 900, color: "#FFFFFF", lineHeight: 1, marginBottom: "4px" }}>
                {es ? "Raspa y Gana" : "Scratch & Win"}
              </p>
              <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "12px", color: "rgba(255,255,255,0.65)" }}>
                {es ? "Gana puntos y saldo MXN en segundos" : "Win points and MXN balance in seconds"}{" "}
                <span style={{ display: "inline-block", animation: "rypBounce 1.2s ease-in-out infinite" }}>→</span>
              </p>
            </div>

            {/* JUGAR badge — scale pulse */}
            <div style={{
              background: "#00C875", borderRadius: "10px", padding: "8px 14px", flexShrink: 0,
              animation: "rypPulse 2s ease-in-out infinite",
            }}>
              <span style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "15px", fontWeight: 900, color: "#004F2D" }}>{es ? "JUGAR" : "PLAY"}</span>
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
                <PTIScoreCard telefono={storedPhone} refreshKey={ptiRefreshKey} pendingCompute={ptiPendingCompute} lang={lang} />
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
                label={es ? "¿Tienes dudas? Pregúntale a Paula" : "Questions? Ask Paula"}
              />
            </div>

            {/* ── SIGN-UP BONUS STRIP ── */}
            <BonusBanner lang={lang} onNavigateRegister={() => navigate("/register")} />

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
                { icon: "🏦", label: "STP" },
                { icon: "🇲🇽", label: "Banxico" },
                { icon: "⚡", label: "SIPREL" },
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
            GIFT CARDS — extracted to GiftCardSection component
        ══════════════════════════════════════════════════════ */}
        <GiftCardSection
          lang={lang}
          onGiftCard={handleGiftCard}
          onNavigateAll={() => navigate("/servicios?categoria=Gift+Cards")}
        />

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
            {/* ── Returning-user re-entry prompt (C1) ──────────────────── */}
            {!storedPhone && (
              <div style={{
                background: "#F4FBF7",
                border: "1.5px solid #CBE9D9",
                borderRadius: "16px",
                padding: "20px",
                marginBottom: "16px",
                textAlign: "center",
              }}>
                <p style={{ fontSize: "15px", fontWeight: 700, color: "#005432", margin: "0 0 4px" }}>
                  {es ? "¿Ya tienes cuenta?" : "Have an account?"}
                </p>
                <p style={{ fontSize: "13px", color: "#6B9980", margin: "0 0 14px" }}>
                  {es
                    ? "Ingresa tu número para ver tu saldo y pagar"
                    : "Enter your phone to see your balance and pay"}
                </p>
                <a
                  href="/register"
                  style={{
                    display: "inline-block",
                    background: "#007A4A",
                    color: "#fff",
                    borderRadius: "10px",
                    padding: "10px 22px",
                    fontSize: "14px",
                    fontWeight: 700,
                    textDecoration: "none",
                  }}
                >
                  {es ? "Iniciar sesión →" : "Sign in →"}
                </a>
              </div>
            )}

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
                ✅ {es
                  ? "¡Revisa tu WhatsApp ahora! Te enviamos un mensaje para completar tu registro."
                  : "Check WhatsApp now! We sent you a message to complete your registration."}
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

      {/* ── PWA install prompt bottom sheet (S3.6) ──────────────────────────── */}
      {showPwaSheet && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 9999,
          background: "rgba(0,0,0,0.55)",
          display: "flex", alignItems: "flex-end",
        }}
          onClick={() => setShowPwaSheet(false)}
        >
          <div
            style={{
              width: "100%", background: "#FFFFFF",
              borderRadius: "24px 24px 0 0",
              padding: "28px 24px 40px",
              boxShadow: "0 -8px 40px rgba(0,0,0,0.20)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "14px" }}>
              <span style={{ fontSize: "36px" }}>📲</span>
              <div>
                <p style={{ margin: 0, fontSize: "18px", fontWeight: 900, color: "#0D2618" }}>
                  {es ? "Instala PagoYa en tu celular" : "Install PagoYa on your phone"}
                </p>
                <p style={{ margin: "3px 0 0", fontSize: "13px", color: "#6B9980", lineHeight: 1.4 }}>
                  {es ? "Acceso rápido sin abrir el navegador" : "Quick access without opening the browser"}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                if (deferredPrompt.current) deferredPrompt.current.prompt();
                setShowPwaSheet(false);
              }}
              style={{
                width: "100%", padding: "16px",
                background: "linear-gradient(135deg, #046C2C 0%, #39A935 100%)",
                border: "none", borderRadius: "14px",
                color: "#FFFFFF", fontSize: "16px", fontWeight: 800,
                cursor: "pointer", marginBottom: "10px",
                boxShadow: "0 4px 16px rgba(4,108,44,0.32)",
                fontFamily: "inherit",
              }}
            >
              {es ? "Instalar gratis" : "Install free"}
            </button>
            <button
              onClick={() => {
                try { localStorage.setItem("pwa_prompt_dismissed", "1"); } catch { /* ignore */ }
                setShowPwaSheet(false);
              }}
              style={{
                width: "100%", padding: "14px",
                background: "transparent", border: "none",
                color: "#9CA3AF", fontSize: "14px", fontWeight: 600,
                cursor: "pointer", fontFamily: "inherit",
              }}
            >
              {es ? "Ahora no" : "Not now"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
