import { useState } from "react";

interface BonusBannerProps {
  lang: "es" | "en";
  onNavigateRegister: () => void;
}

export default function BonusBanner({ lang, onNavigateRegister }: BonusBannerProps) {
  const es = lang === "es";
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try { return sessionStorage.getItem("bonus_banner_v2") === "1"; } catch { return false; }
  });

  if (dismissed) return null;

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    try { sessionStorage.setItem("bonus_banner_v2", "1"); } catch { /* ignore */ }
    setDismissed(true);
  };

  return (
    <button
      className="bonus-strip"
      onClick={onNavigateRegister}
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
        position: "relative",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1 }}>
        <span style={{ fontSize: "22px", flexShrink: 0 }}>🎁</span>
        <div>
          <div style={{ fontSize: "13px", fontWeight: 800, color: "#0D2618", lineHeight: 1.2 }}>
            {es ? "Regístrate gratis → recibe $150 MXN → paga tu primer servicio" : "Sign up free → get $150 MXN → pay your first bill"}
          </div>
          <div style={{ fontSize: "11px", color: "#6B9980", marginTop: "2px" }}>
            {es ? "Sin banco, sin OXXO · se acredita al registrarte" : "No bank needed · credited instantly on signup"}
          </div>
        </div>
      </div>
      <span style={{ flexShrink: 0, fontSize: "12px", fontWeight: 700, color: "#FF5C1A", whiteSpace: "nowrap" }}>
        {es ? "Abre tu cuenta →" : "Sign up →"}
      </span>
      <button
        onClick={handleDismiss}
        style={{
          position: "absolute", top: "6px", right: "6px",
          background: "none", border: "none", cursor: "pointer",
          fontSize: "14px", color: "rgba(0,0,0,0.35)", lineHeight: 1, padding: "2px 4px",
          fontFamily: "inherit",
        }}
        aria-label="Cerrar"
      >
        ×
      </button>
    </button>
  );
}
