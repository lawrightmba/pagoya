import { useLocation } from "wouter";

interface Props {
  lang: "es" | "en";
}

export default function HeroPrideCTA({ lang }: Props) {
  const [, navigate] = useLocation();
  const es = lang === "es";

  return (
    <section
      style={{
        background: "linear-gradient(180deg, #004F2D 0%, #006B3C 100%)",
        padding: "36px 24px 40px",
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        borderBottom: "1px solid rgba(255,255,255,0.18)",
      }}
    >
      <h2
        style={{
          fontFamily: "DM Sans, sans-serif",
          fontSize: "22px",
          fontWeight: 900,
          color: "#FFFFFF",
          lineHeight: 1.25,
          letterSpacing: "-0.01em",
          margin: "0 0 12px",
          maxWidth: "320px",
        }}
      >
        {es
          ? "Aquí o desde lejos, sigues cuidando a los tuyos."
          : "Here or far away, you're still looking out for your people."}
      </h2>

      <p
        style={{
          fontFamily: "DM Sans, sans-serif",
          fontSize: "14px",
          color: "rgba(255,255,255,0.72)",
          lineHeight: 1.6,
          margin: "0 0 24px",
          maxWidth: "300px",
        }}
      >
        {es
          ? "Sin cuenta bancaria. Sin filas. Solo tú, cuidando lo que importa — donde sea que estés."
          : "No bank account needed. No lines. Just you, taking care of what matters — wherever you are."}
      </p>

      {/* Softer secondary action — trust closer, not competing CTA */}
      <button
        onClick={() => navigate("/pagar")}
        style={{
          fontFamily: "DM Sans, sans-serif",
          background: "transparent",
          color: "#6EF5B0",
          border: "1.5px solid rgba(110,245,176,0.45)",
          borderRadius: "10px",
          padding: "10px 24px",
          fontSize: "14px",
          fontWeight: 700,
          cursor: "pointer",
          letterSpacing: "0.01em",
          transition: "border-color 0.15s, color 0.15s",
        }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = "rgba(110,245,176,0.80)";
          e.currentTarget.style.color = "#FFFFFF";
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = "rgba(110,245,176,0.45)";
          e.currentTarget.style.color = "#6EF5B0";
        }}
      >
        {es ? "Ver todos los servicios →" : "Browse all services →"}
      </button>
    </section>
  );
}
