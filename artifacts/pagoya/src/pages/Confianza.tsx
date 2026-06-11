import { Helmet } from "react-helmet-async";

const DIMENSIONS = [
  {
    icon: "📈",
    name: "Trayectoria Longitudinal",
    desc: "Evolución de tus hábitos financieros a lo largo del tiempo",
  },
  {
    icon: "🧾",
    name: "Comportamiento Financiero",
    desc: "Puntualidad, frecuencia y regularidad de tus pagos",
  },
  {
    icon: "📅",
    name: "Rutina y Estabilidad",
    desc: "Consistencia mensual de tus actividades en PagoYa",
  },
  {
    icon: "🤝",
    name: "Comunidad y Red Social",
    desc: "Tu participación e influencia dentro de la comunidad PagoYa",
  },
];

export default function Confianza() {
  return (
    <div style={{ minHeight: "100vh", background: "#004F2D", color: "#FFFFFF", fontFamily: "DM Sans, sans-serif" }}>
      <Helmet>
        <title>PagoYa Trust Index (PTI) — Metodología de Confianza</title>
        <meta name="description" content="El PTI es el sistema de puntuación conductual de PagoYa. Mide tu historial real en 4 dimensiones y 15 señales — sin consultar el buró de crédito." />
        <meta property="og:title" content="PagoYa Trust Index (PTI) — Metodología de Confianza" />
        <meta property="og:description" content="El PTI mide tu historial real en 4 dimensiones y 15 señales — sin consultar el buró de crédito." />
        <meta property="og:image" content="https://pagoyamx.com/og-default.png" />
      </Helmet>

      {/* Top bar */}
      <div style={{ background: "#003D22", borderBottom: "1px solid rgba(255,255,255,0.07)", padding: "16px 20px", display: "flex", alignItems: "center", gap: "12px" }}>
        <a href="/" style={{ display: "flex", alignItems: "center", gap: "8px", textDecoration: "none" }}>
          <span style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "20px", fontWeight: 900, color: "#00C875", letterSpacing: "0.04em" }}>PagoYa</span>
        </a>
      </div>

      <div style={{ maxWidth: "680px", margin: "0 auto", padding: "48px 24px 80px" }}>

        {/* Eyebrow */}
        <p style={{ fontSize: "11px", fontWeight: 700, color: "#00C875", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: "14px" }}>
          Metodología
        </p>

        {/* Title */}
        <h1 style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "clamp(36px, 8vw, 52px)", fontWeight: 900, lineHeight: 1.05, color: "#FFFFFF", marginBottom: "8px" }}>
          PagoYa Trust Index
        </h1>
        <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "clamp(20px, 5vw, 28px)", fontWeight: 700, color: "#00C875", marginBottom: "36px", letterSpacing: "0.02em" }}>
          PTI
        </p>

        {/* Definition */}
        <div style={{ background: "rgba(0,200,117,0.06)", border: "1px solid rgba(0,200,117,0.18)", borderRadius: "16px", padding: "28px 24px", marginBottom: "40px" }}>
          <p style={{ fontSize: "15px", lineHeight: 1.75, color: "rgba(255,255,255,0.88)" }}>
            PagoYa Trust Index (PTI) es un sistema de puntuación conductual desarrollado internamente que mide la salud financiera digital de cada usuario a través de{" "}
            <strong style={{ color: "#FFFFFF" }}>4 dimensiones</strong> y{" "}
            <strong style={{ color: "#FFFFFF" }}>15 señales individuales</strong>.
          </p>
          <div style={{ marginTop: "18px", paddingTop: "18px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
            <p style={{ fontSize: "15px", lineHeight: 1.75, color: "rgba(255,255,255,0.88)" }}>
              No es una consulta al buró de crédito.
            </p>
            <p style={{ fontSize: "15px", lineHeight: 1.75, color: "rgba(255,255,255,0.88)", marginTop: "4px" }}>
              Es <strong style={{ color: "#FFFFFF" }}>tu historial real</strong>, no el de alguien más.
            </p>
          </div>
        </div>

        {/* Section label */}
        <p style={{ fontSize: "11px", fontWeight: 700, color: "rgba(255,255,255,0.35)", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "16px" }}>
          Las 4 dimensiones
        </p>

        {/* Dimension cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "48px" }}>
          {DIMENSIONS.map((d, i) => (
            <div
              key={d.name}
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "14px",
                padding: "20px",
                display: "flex",
                gap: "16px",
                alignItems: "flex-start",
              }}
            >
              <div style={{ width: "40px", height: "40px", background: "rgba(0,200,117,0.1)", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: "20px" }}>
                {d.icon}
              </div>
              <div>
                <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "18px", fontWeight: 800, color: "#FFFFFF", marginBottom: "3px", letterSpacing: "0.01em" }}>
                  {d.name}
                </p>
                <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)", lineHeight: 1.4 }}>
                  {d.desc}
                </p>
              </div>
              <div style={{ marginLeft: "auto", paddingLeft: "8px", flexShrink: 0 }}>
                <span style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "13px", fontWeight: 700, color: "rgba(0,200,117,0.5)", letterSpacing: "0.05em" }}>
                  0{i + 1}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Closing statement */}
        <div style={{ textAlign: "center", padding: "0 8px" }}>
          <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "clamp(20px, 5vw, 26px)", fontWeight: 800, color: "#FFFFFF", lineHeight: 1.35 }}>
            Tu PTI crece cada vez que usas PagoYa de forma consistente.
          </p>
        </div>

        {/* Divider */}
        <div style={{ height: "1px", background: "rgba(255,255,255,0.07)", margin: "40px 0" }} />

        {/* Technical footer — serves regulators + investors without cluttering user view */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {[
            ["Cómputo", "Batch nocturno — calculado a las 2 AM hora de México"],
            ["Fuente de datos", "Exclusivamente actividad dentro de PagoYa"],
            ["Buró de crédito", "No. No se realiza ninguna consulta al historial crediticio externo"],
            ["Versión del modelo", "v1.0-heuristic — cada cómputo queda auditado con versión"],
          ].map(([label, val]) => (
            <div key={label} style={{ display: "flex", gap: "12px", fontSize: "12px" }}>
              <span style={{ color: "rgba(255,255,255,0.35)", minWidth: "120px", flexShrink: 0 }}>{label}</span>
              <span style={{ color: "rgba(255,255,255,0.6)", lineHeight: 1.45 }}>{val}</span>
            </div>
          ))}
        </div>

        {/* Back link */}
        <div style={{ marginTop: "48px", textAlign: "center" }}>
          <a href="/" style={{ fontFamily: "DM Sans, sans-serif", fontSize: "13px", color: "#00C875", textDecoration: "none", opacity: 0.7 }}>
            ← Volver a PagoYa
          </a>
        </div>
      </div>
    </div>
  );
}
