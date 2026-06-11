import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Helmet } from "react-helmet-async";

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

const BILLER_CHIPS = [
  { label: "CFE",    servicio: "CFE",    emoji: "⚡" },
  { label: "Telmex", servicio: "Telmex", emoji: "📞" },
  { label: "Izzi",   servicio: "Izzi",   emoji: "📡" },
  { label: "Agua",   servicio: "Agua",   emoji: "💧" },
];

export default function Bienvenida() {
  const [, navigate] = useLocation();

  const telefono = localStorage.getItem("pagoya_telefono") ?? "";

  const [firstName, setFirstName]     = useState<string | null>(null);
  const [bonusAmount, setBonusAmount] = useState<number | null>(null);
  const [balance, setBalance]         = useState<number | null>(null);
  const [balanceError, setBalanceError] = useState(false);
  const [waNumber, setWaNumber]       = useState<string | null>(null);
  const [marking, setMarking]         = useState(false);

  // Replace history entry so back button skips this screen
  useEffect(() => {
    window.history.replaceState(null, "", window.location.href);
  }, []);

  // Guard: if no phone in storage, or welcome_shown already true → go home
  useEffect(() => {
    if (!telefono) { navigate("/"); return; }
    fetch(`${BASE_URL}/api/user/welcome-shown?telefono=${encodeURIComponent(telefono)}`)
      .then((r) => r.json())
      .then((d: { welcomeShown?: boolean }) => {
        if (d.welcomeShown) navigate("/");
      })
      .catch(() => {});
  }, [telefono]);

  // Fetch user info
  useEffect(() => {
    if (!telefono) return;
    fetch(`${BASE_URL}/api/user/me?telefono=${encodeURIComponent(telefono)}`)
      .then((r) => r.json())
      .then((d: { firstName?: string; bonusAmount?: number }) => {
        if (d.firstName) setFirstName(d.firstName);
        if (d.bonusAmount != null) setBonusAmount(d.bonusAmount);
      })
      .catch(() => {});
  }, [telefono]);

  // Fetch live wallet balance
  useEffect(() => {
    if (!telefono) return;
    fetch(`${BASE_URL}/api/wallet/balance?telefono=${encodeURIComponent(telefono)}`)
      .then((r) => r.json())
      .then((d: { balance?: number; error?: string }) => {
        if (d.balance != null) {
          setBalance(d.balance);
          setBalanceError(false);
        } else {
          setBalanceError(true);
        }
      })
      .catch(() => setBalanceError(true));
  }, [telefono]);

  // Fetch WhatsApp number for Paula link
  useEffect(() => {
    fetch(`${BASE_URL}/api/config/whatsapp`)
      .then((r) => r.json())
      .then((d: { number?: string | null }) => setWaNumber(d.number ?? null))
      .catch(() => {});
  }, []);

  const markShownAndGo = async (dest: string) => {
    if (marking) return;
    setMarking(true);
    try {
      await fetch(`${BASE_URL}/api/user/welcome-shown`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telefono }),
      });
    } catch { /* non-fatal */ }
    navigate(dest);
  };

  const retryBalance = () => {
    setBalanceError(false);
    setBalance(null);
    if (!telefono) return;
    fetch(`${BASE_URL}/api/wallet/balance?telefono=${encodeURIComponent(telefono)}`)
      .then((r) => r.json())
      .then((d: { balance?: number }) => {
        if (d.balance != null) setBalance(d.balance);
        else setBalanceError(true);
      })
      .catch(() => setBalanceError(true));
  };

  return (
    <div style={{
      minHeight: "100dvh",
      background: "#0A2540",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "28px 20px 48px",
      boxSizing: "border-box",
      overflowY: "auto",
    }}>
      <Helmet>
        <title>¡Bienvenido! | PagoYa</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      {/* Logo */}
      <div style={{ marginBottom: "28px", display: "flex", justifyContent: "center" }}>
        <img src="/pagoya-logo.png" alt="PagoYa" style={{ height: "40px", width: "auto", objectFit: "contain" }} />
      </div>

      <div style={{ width: "100%", maxWidth: "420px", display: "flex", flexDirection: "column", gap: "18px" }}>

        {/* ── ZONE 1: Confirmation header ─────────────────────────────────────── */}
        <div style={{
          background: "rgba(216,90,48,0.10)",
          border: "1.5px solid rgba(216,90,48,0.35)",
          borderRadius: "24px",
          padding: "32px 24px 28px",
          textAlign: "center",
        }}>
          {/* Coral checkmark */}
          <div style={{
            width: "72px", height: "72px",
            borderRadius: "50%",
            background: "rgba(216,90,48,0.18)",
            border: "2.5px solid #D85A30",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "34px",
            margin: "0 auto 20px",
            boxShadow: "0 0 0 8px rgba(216,90,48,0.08)",
          }}>
            ✓
          </div>

          <h1 style={{
            fontSize: "clamp(22px,6vw,28px)",
            fontWeight: 900,
            color: "#FFFFFF",
            margin: "0 0 6px",
            lineHeight: 1.2,
            letterSpacing: "-0.02em",
          }}>
            ¡Bienvenido/a{firstName ? `, ${firstName}` : ""}!
          </h1>

          <p style={{ fontSize: "15px", color: "rgba(255,255,255,0.55)", margin: "0 0 18px", lineHeight: 1.45 }}>
            Tu cuenta está lista.
          </p>

          {/* Bonus pill */}
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "7px",
            background: "#D85A30",
            borderRadius: "99px",
            padding: "8px 18px",
            fontSize: "15px",
            fontWeight: 800,
            color: "#FFFFFF",
            boxShadow: "0 4px 16px rgba(216,90,48,0.38)",
          }}>
            💰{" "}
            {bonusAmount != null
              ? `$${bonusAmount % 1 === 0 ? bonusAmount : bonusAmount.toFixed(2)} MXN acreditados en tu billetera`
              : "Bono acreditado en tu billetera"}
          </div>
        </div>

        {/* ── ZONE 2: Wallet balance card ─────────────────────────────────────── */}
        <div style={{
          background: "#0E2F50",
          border: "1.5px solid rgba(29,158,117,0.3)",
          borderRadius: "24px",
          padding: "28px 24px",
          textAlign: "center",
        }}>
          <p style={{
            fontSize: "11px",
            fontWeight: 700,
            color: "rgba(255,255,255,0.45)",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            margin: "0 0 12px",
          }}>
            Tu saldo disponible
          </p>

          {/* Balance — pulsing loading state, never $0 default */}
          {balance == null && !balanceError ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", minHeight: "56px" }}>
              <style>{`
                @keyframes py-pulse { 0%,100%{opacity:1} 50%{opacity:0.35} }
                .py-pulse-dot { width:10px;height:10px;border-radius:50%;background:#1D9E75;animation:py-pulse 1.2s ease-in-out infinite; }
                .py-pulse-dot:nth-child(2){animation-delay:0.2s}
                .py-pulse-dot:nth-child(3){animation-delay:0.4s}
              `}</style>
              <div className="py-pulse-dot" />
              <div className="py-pulse-dot" />
              <div className="py-pulse-dot" />
            </div>
          ) : balanceError ? (
            <div style={{ minHeight: "56px", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px" }}>
              <span style={{ fontSize: "32px", fontWeight: 900, color: "rgba(255,255,255,0.4)" }}>— MXN</span>
              <button
                onClick={retryBalance}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: "22px", color: "#1D9E75" }}
                title="Reintentar"
              >↻</button>
            </div>
          ) : (
            <div style={{ fontSize: "clamp(32px,9vw,42px)", fontWeight: 900, color: "#FFFFFF", letterSpacing: "-0.03em", minHeight: "56px", display: "flex", alignItems: "center", justifyContent: "center" }}>
              ${balance!.toFixed(2)}{" "}
              <span style={{ fontSize: "18px", fontWeight: 600, color: "rgba(255,255,255,0.5)", marginLeft: "4px" }}>MXN</span>
            </div>
          )}

          <p style={{ fontSize: "13px", fontWeight: 600, color: "#1D9E75", margin: "12px 0 0" }}>
            ✓ Listo para usar
          </p>
        </div>

        {/* ── ZONE 3: CTAs ─────────────────────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

          {/* Primary CTA */}
          <button
            onClick={() => markShownAndGo("/pagar")}
            disabled={marking}
            style={{
              width: "100%",
              padding: "17px 20px",
              background: marking ? "rgba(216,90,48,0.5)" : "#D85A30",
              border: "none",
              borderRadius: "16px",
              color: "#FFFFFF",
              fontSize: "16px",
              fontWeight: 800,
              cursor: marking ? "not-allowed" : "pointer",
              boxShadow: "0 6px 20px rgba(216,90,48,0.40)",
              letterSpacing: "-0.01em",
              fontFamily: "inherit",
              transition: "background 0.15s, transform 0.1s",
            }}
          >
            Paga tu primera cuenta →
          </button>

          {/* Biller chips 2×2 */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            {BILLER_CHIPS.map(({ label, servicio, emoji }) => (
              <button
                key={servicio}
                onClick={() => markShownAndGo(`/pagar?servicio=${encodeURIComponent(servicio)}`)}
                disabled={marking}
                style={{
                  padding: "14px 10px",
                  background: "transparent",
                  border: "1.5px solid #1D9E75",
                  borderRadius: "14px",
                  color: "#1D9E75",
                  fontSize: "14px",
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  transition: "background 0.15s",
                }}
              >
                {emoji} {label}
              </button>
            ))}
          </div>

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.1)" }} />
            <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.3)", fontWeight: 600 }}>o</span>
            <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.1)" }} />
          </div>

          {/* WhatsApp Paula link */}
          {waNumber && (
            <a
              href={`https://wa.me/${waNumber}?text=${encodeURIComponent("Hola Paula, quiero pagar mi primera cuenta")}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                width: "100%",
                padding: "15px 20px",
                background: "transparent",
                border: "1.5px solid #25D366",
                borderRadius: "16px",
                color: "#25D366",
                fontSize: "15px",
                fontWeight: 700,
                textDecoration: "none",
                boxSizing: "border-box",
                fontFamily: "inherit",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              💬 Paga con Paula por WhatsApp
            </a>
          )}

          {/* Ghost continue link */}
          <button
            onClick={() => markShownAndGo("/")}
            disabled={marking}
            style={{
              background: "none",
              border: "none",
              color: "rgba(255,255,255,0.35)",
              fontSize: "13px",
              cursor: "pointer",
              padding: "8px",
              fontFamily: "inherit",
              textAlign: "center",
              marginTop: "2px",
            }}
          >
            Continuar al inicio →
          </button>
        </div>
      </div>
    </div>
  );
}
