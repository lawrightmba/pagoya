import { Helmet } from "react-helmet-async";
import { useLocation } from "wouter";

export default function PagarAguaGuadalajara() {
  const [, navigate] = useLocation();
  return (
    <>
      <Helmet>
        <title>Pagar Agua Guadalajara en Línea | PagoYa</title>
        <meta name="description" content="Consulta y paga tu recibo de agua de Guadalajara en línea, sin cuenta bancaria. Acepta OXXO y tarjeta." />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://pagoyamx.com/pagar-agua-guadalajara" />
        <meta property="og:title" content="Pagar Agua Guadalajara en Línea | PagoYa" />
        <meta property="og:url" content="https://pagoyamx.com/pagar-agua-guadalajara" />
      </Helmet>
      <div style={{ minHeight: "100vh", background: "#0A2540", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px" }}>
        <div style={{ maxWidth: 480, textAlign: "center" }}>
          <h1 style={{ color: "#F1F5F9", fontSize: 24, fontWeight: 800, marginBottom: 12 }}>Pagar agua SIAPA Guadalajara sin banco</h1>
          <p style={{ color: "#94A3B8", fontSize: 15, marginBottom: 28, lineHeight: 1.6 }}>Guadalajara · Zapopan · Tonalá · Tlaquepaque · Sin tarjeta · 2 minutos</p>
          <button onClick={() => navigate("/")} style={{ background: "#1D9E75", color: "#fff", border: "none", borderRadius: 12, padding: "14px 32px", fontSize: 16, fontWeight: 700, cursor: "pointer" }}>
            Pagar mi agua →
          </button>
        </div>
      </div>
    </>
  );
}
