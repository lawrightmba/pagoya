import { Helmet } from "react-helmet-async";
import { useLocation } from "wouter";

export default function PagarCFEMonterrey() {
  const [, navigate] = useLocation();
  return (
    <>
      <Helmet>
        <title>Pagar CFE Monterrey sin banco — División Noreste · 2 min | PagoYa</title>
        <meta name="description" content="Paga tu CFE en Monterrey, San Pedro, Guadalupe y el AMM sin banco ni tarjeta. Efectivo en OXXO → pago en 2 min. $25 MXN fijo. Comprobante al instante." />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://pagoyamx.com/pagar-cfe-monterrey" />
        <meta property="og:title" content="Pagar CFE Monterrey sin banco — División Noreste | PagoYa" />
        <meta property="og:url" content="https://pagoyamx.com/pagar-cfe-monterrey" />
      </Helmet>
      <div style={{ minHeight: "100vh", background: "#0A2540", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px" }}>
        <div style={{ maxWidth: 480, textAlign: "center" }}>
          <h1 style={{ color: "#F1F5F9", fontSize: 24, fontWeight: 800, marginBottom: 12 }}>Pagar CFE Monterrey sin banco</h1>
          <p style={{ color: "#94A3B8", fontSize: 15, marginBottom: 28, lineHeight: 1.6 }}>División Noreste · AMM completa · Sin tarjeta · $25 MXN fijo · 2 minutos</p>
          <button onClick={() => navigate("/")} style={{ background: "#1D9E75", color: "#fff", border: "none", borderRadius: 12, padding: "14px 32px", fontSize: 16, fontWeight: 700, cursor: "pointer" }}>
            Pagar mi CFE →
          </button>

          <div style={{ marginTop: 36, textAlign: "left" }}>
            <h2 style={{ color: "#F1F5F9", fontSize: 18, fontWeight: 800, marginBottom: 12 }}>Más servicios en Monterrey</h2>
            <ul style={{ listStyle: "disc", paddingLeft: 22, margin: 0 }}>
              <li style={{ marginBottom: 6 }}><a href="/pagar-servicios-monterrey" style={{ color: "#1D9E75" }}>Pagar servicios en Monterrey (agua, luz, gas)</a></li>
              <li style={{ marginBottom: 6 }}><a href="/pagar-agua-monterrey" style={{ color: "#1D9E75" }}>Pagar agua SADM sin banco</a></li>
              <li style={{ marginBottom: 6 }}><a href="/pagar-agua-monterrey-en-linea" style={{ color: "#1D9E75" }}>Pagar agua SADM en línea</a></li>
              <li style={{ marginBottom: 6 }}><a href="/pagar-gas-natural-monterrey" style={{ color: "#1D9E75" }}>Pagar gas natural Naturgy Monterrey</a></li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
