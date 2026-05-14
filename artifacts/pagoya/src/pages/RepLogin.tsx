import { useState } from "react";
import { Helmet } from "react-helmet-async";

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

export default function RepLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/reps/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Credenciales incorrectas.");
        setLoading(false);
        return;
      }
      localStorage.setItem("rep_token", data.token);
      localStorage.setItem("rep_id", data.repId);
      window.location.href = `${BASE_URL}/rep-dashboard?repId=${encodeURIComponent(data.repId)}`;
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Rep Login · PagoYa</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div style={{
        minHeight: "100vh",
        background: "#0A2540",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
        fontFamily: "'Inter', 'Syne', sans-serif",
      }}>
        <div style={{ width: "100%", maxWidth: 380 }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ fontSize: "0.6rem", letterSpacing: "0.14em", color: "#39A935", fontWeight: 700, textTransform: "uppercase", marginBottom: 6 }}>
              PagoYa · Rep Portal
            </div>
            <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#e8f0f7", letterSpacing: "-0.03em" }}>
              Iniciar sesión
            </div>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: "0.6rem", letterSpacing: "0.08em", color: "#5a7080", fontFamily: "'Space Mono', monospace", marginBottom: 6, textTransform: "uppercase" }}>
                Correo electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="tu@correo.com"
                style={{
                  width: "100%",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 10,
                  padding: "12px 14px",
                  color: "#e8f0f7",
                  fontSize: "0.9rem",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.6rem", letterSpacing: "0.08em", color: "#5a7080", fontFamily: "'Space Mono', monospace", marginBottom: 6, textTransform: "uppercase" }}>
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                style={{
                  width: "100%",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 10,
                  padding: "12px 14px",
                  color: "#e8f0f7",
                  fontSize: "0.9rem",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {error && (
              <div style={{
                background: "rgba(232,42,10,0.12)",
                border: "1px solid rgba(232,42,10,0.3)",
                borderRadius: 8,
                padding: "10px 12px",
                fontFamily: "'Space Mono', monospace",
                fontSize: "0.62rem",
                color: "#E21A0A",
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: 6,
                background: loading ? "rgba(57,169,53,0.5)" : "#39A935",
                color: "#fff",
                border: "none",
                borderRadius: 10,
                padding: "14px",
                fontSize: "0.9rem",
                fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer",
                letterSpacing: "-0.01em",
              }}
            >
              {loading ? "Verificando…" : "Entrar al portal"}
            </button>
          </form>

          <div style={{
            marginTop: 28,
            textAlign: "center",
            fontFamily: "'Space Mono', monospace",
            fontSize: "0.5rem",
            color: "#2a3d50",
            letterSpacing: "0.06em",
          }}>
            PAGOYA · PORTAL EXCLUSIVO PARA REPRESENTANTES
          </div>
        </div>
      </div>
    </>
  );
}
