import { Helmet } from "react-helmet-async";
import { useLocation } from "wouter";

export default function PagarCFECdmx() {
  const [, navigate] = useLocation();
  return (
    <>
      <Helmet>
        <title>Pagar CFE CDMX sin banco — 16 alcaldías · Sin recibo · 2 min | PagoYa</title>
        <meta name="description" content="Paga tu CFE en la CDMX sin banco ni tarjeta. Iztapalapa, Coyoacán, Benito Juárez y las 16 alcaldías. Efectivo en OXXO → pago en 2 min. Comprobante al instante." />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://pagoyamx.com/pagar-cfe-cdmx" />
        <meta property="og:title" content="Pagar CFE CDMX sin banco — 16 alcaldías · Sin recibo | PagoYa" />
        <meta property="og:url" content="https://pagoyamx.com/pagar-cfe-cdmx" />
      </Helmet>
      <div style={{ minHeight: "100vh", background: "#0A2540", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px" }}>
        <div style={{ maxWidth: 480, textAlign: "center" }}>
          <h1 style={{ color: "#F1F5F9", fontSize: 24, fontWeight: 800, marginBottom: 12 }}>Pagar CFE en la CDMX sin banco</h1>
          <p style={{ color: "#94A3B8", fontSize: 15, marginBottom: 28, lineHeight: 1.6 }}>Las 16 alcaldías · Sin tarjeta · Sin recibo · $15 MXN fijo · 2 minutos</p>
          <button onClick={() => navigate("/")} style={{ background: "#1D9E75", color: "#fff", border: "none", borderRadius: 12, padding: "14px 32px", fontSize: 16, fontWeight: 700, cursor: "pointer" }}>
            Pagar mi CFE →
          </button>
        </div>
      </div>
    </>
  );
}
