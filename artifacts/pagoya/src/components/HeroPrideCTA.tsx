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
        padding: "40px 24px 44px",
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
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
          margin: "0 0 28px",
          maxWidth: "300px",
        }}
      >
        {es
          ? "Sin cuenta bancaria. Sin filas. Solo tú, cuidando lo que importa — donde sea que estés."
          : "No bank account needed. No lines. Just you, taking care of what matters — wherever you are."}
      </p>

      <button
        onClick={() => navigate("/register")}
        style={{
          fontFamily: "DM Sans, sans-serif",
          background: "#FFFFFF",
          color: "#004F2D",
          border: "none",
          borderRadius: "14px",
          padding: "0 28px",
          height: "52px",
          fontSize: "16px",
          fontWeight: 800,
          cursor: "pointer",
          letterSpacing: "0.01em",
          boxShadow: "0 4px 16px rgba(0,0,0,0.22)",
          transition: "transform 0.12s, box-shadow 0.12s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "scale(1.03)";
          e.currentTarget.style.boxShadow = "0 6px 22px rgba(0,0,0,0.28)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "scale(1)";
          e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.22)";
        }}
        onMouseDown={(e) => { e.currentTarget.style.transform = "scale(0.97)"; }}
        onMouseUp={(e) => { e.currentTarget.style.transform = "scale(1.03)"; }}
      >
        {es ? "Crear cuenta gratis" : "Create free account"}
      </button>
    </section>
  );
}
