import { useState, useEffect } from "react";

const BASE_URL = import.meta.env.BASE_URL.replace(/\/$/, "");
const SESSION_KEY = "pagoya_consent_banner_dismissed";

export function WhatsAppConsentBanner() {
  const [show, setShow] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [phone, setPhone] = useState<string>("");

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY)) return;
    const tel = (() => { try { return localStorage.getItem("pagoya_telefono") ?? ""; } catch { return ""; } })();
    if (!tel) return;
    setPhone(tel);
    fetch(`${BASE_URL}/api/user/me?telefono=${encodeURIComponent(tel)}`)
      .then(r => r.ok ? r.json() : null)
      .then((data: { whatsappConsentAt?: string | null } | null) => {
        if (data && !data.whatsappConsentAt) setShow(true);
      })
      .catch(() => {});
  }, []);

  const dismiss = () => {
    sessionStorage.setItem(SESSION_KEY, "1");
    setShow(false);
  };

  const accept = async () => {
    if (!phone || submitting) return;
    setSubmitting(true);
    try {
      await fetch(`${BASE_URL}/api/user/consent`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telefono: phone }),
      });
    } catch { /* non-fatal */ } finally {
      setSubmitting(false);
      dismiss();
    }
  };

  if (!show) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: "72px",
        left: 0,
        right: 0,
        zIndex: 999,
        margin: "0 auto",
        maxWidth: "480px",
        padding: "0 12px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          background: "#0A2540",
          border: "1px solid #1D9E75",
          borderRadius: "12px",
          padding: "14px 16px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <span style={{ fontSize: "14px", fontWeight: 600, color: "#fff", lineHeight: 1.4 }}>
            📲 Activa avisos de pago por WhatsApp
          </span>
          <button
            onClick={dismiss}
            style={{ background: "none", border: "none", color: "#8899aa", cursor: "pointer", padding: "0 0 0 8px", fontSize: "18px", lineHeight: 1 }}
            aria-label="Cerrar"
          >×</button>
        </div>
        <p style={{ margin: 0, fontSize: "13px", color: "#c8d6e5", lineHeight: 1.5 }}>
          Recibe confirmación de pagos y recordatorios directamente en WhatsApp. Sin spam — solo lo que importa.
        </p>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={accept}
            disabled={submitting}
            style={{
              flex: 1,
              background: "#1D9E75",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              padding: "10px 0",
              fontWeight: 600,
              fontSize: "14px",
              cursor: submitting ? "not-allowed" : "pointer",
              opacity: submitting ? 0.7 : 1,
            }}
          >
            {submitting ? "Guardando…" : "Sí, activar"}
          </button>
          <button
            onClick={dismiss}
            style={{
              flex: 1,
              background: "transparent",
              color: "#8899aa",
              border: "1px solid #334455",
              borderRadius: "8px",
              padding: "10px 0",
              fontWeight: 500,
              fontSize: "14px",
              cursor: "pointer",
            }}
          >
            Ahora no
          </button>
        </div>
      </div>
    </div>
  );
}
