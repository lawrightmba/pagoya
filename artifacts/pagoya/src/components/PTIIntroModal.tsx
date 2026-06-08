import { useState } from "react";

const COMPUTE_TIMEOUT_MS = 8000;

interface PTIIntroModalProps {
  telefono: string;
  onDismiss: (computeSucceeded: boolean) => void;
}

export default function PTIIntroModal({ telefono, onDismiss }: PTIIntroModalProps) {
  const [loading, setLoading] = useState(false);

  async function handleSeeScore() {
    setLoading(true);
    localStorage.setItem("pagoya_pti_intro_seen", "true");

    let succeeded = false;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), COMPUTE_TIMEOUT_MS);

      const base = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
      const res = await fetch(`${base}/api/pti/compute-now`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telefono }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      succeeded = res.ok;
    } catch {
      // AbortError (timeout) or network failure — succeeded stays false
    } finally {
      setLoading(false);
      onDismiss(succeeded);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,0.65)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: "1.25rem",
          width: "100%",
          maxWidth: "420px",
          overflow: "hidden",
          boxShadow: "0 8px 40px rgba(0,0,0,0.22)",
        }}
      >
        {/* Header */}
        <div
          style={{
            background: "linear-gradient(135deg,#005432 0%,#006B3C 100%)",
            padding: "1.5rem 1.5rem 1.25rem",
            textAlign: "center",
          }}
        >
          {/* Shield / score icon */}
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.15)",
              border: "2.5px solid rgba(255,255,255,0.4)",
              margin: "0 auto 0.75rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
            }}
          >
            🛡️
          </div>
          <h2
            style={{
              color: "#fff",
              fontSize: "1.25rem",
              fontWeight: 800,
              margin: 0,
              lineHeight: 1.25,
            }}
          >
            Tu PagoYa Trust Index
          </h2>
          <p
            style={{
              color: "rgba(255,255,255,0.85)",
              fontSize: "0.85rem",
              margin: "0.5rem 0 0",
              lineHeight: 1.4,
            }}
          >
            Tu historial financiero — sin banco, sin crédito.
          </p>
        </div>

        {/* Body */}
        <div style={{ padding: "1.25rem 1.5rem" }}>
          <p
            style={{
              color: "#374151",
              fontSize: "0.9rem",
              marginBottom: "1rem",
              lineHeight: 1.55,
            }}
          >
            PagoYa construye tu historial financiero automáticamente. Tu puntaje refleja:
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem", marginBottom: "1.25rem" }}>
            {[
              { icon: "📅", text: "Qué tan seguido pagas" },
              { icon: "🏢", text: "Cuántos servicios distintos cubres" },
              { icon: "💰", text: "Tu saldo promedio en cartera" },
              { icon: "🪪", text: "Si verificaste tu identidad" },
              { icon: "🏆", text: "Las misiones que has completado" },
              { icon: "🔄", text: "Cuánto cargas vs cuánto gastas" },
            ].map(({ icon, text }) => (
              <div
                key={text}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.65rem",
                  fontSize: "0.875rem",
                  color: "#374151",
                }}
              >
                <span style={{ fontSize: "1.1rem", flexShrink: 0 }}>{icon}</span>
                <span>{text}</span>
              </div>
            ))}
          </div>

          <p
            style={{
              fontSize: "0.8rem",
              color: "#6B7280",
              textAlign: "center",
              marginBottom: "1.25rem",
            }}
          >
            Se actualiza automáticamente cada mes. Cuanto más uses PagoYa, más sube.
          </p>

          <button
            onClick={handleSeeScore}
            disabled={loading}
            style={{
              width: "100%",
              padding: "0.875rem",
              background: loading ? "#9CA3AF" : "#00C875",
              color: "#fff",
              border: "none",
              borderRadius: "0.75rem",
              fontSize: "1rem",
              fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              transition: "background 0.2s",
            }}
          >
            {loading ? (
              <>
                <span
                  style={{
                    width: 18,
                    height: 18,
                    border: "2.5px solid rgba(255,255,255,0.4)",
                    borderTopColor: "#fff",
                    borderRadius: "50%",
                    display: "inline-block",
                    animation: "pti-spin 0.7s linear infinite",
                  }}
                />
                Calculando tu puntaje...
              </>
            ) : (
              "Ver mi puntaje ahora →"
            )}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes pti-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
