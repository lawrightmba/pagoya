import { Helmet } from "react-helmet-async";
import { useLocation } from "wouter";

export default function PagarCFEDesdeUSA() {
  const [, navigate] = useLocation();
  return (
    <>
      <Helmet>
        <title>Pagar CFE desde Estados Unidos — Para tu familia en México | PagoYa</title>
        <meta name="description" content="Paga el recibo de CFE de tu familia en México desde Estados Unidos. Sin Western Union. Sin cuenta bancaria mexicana. En 2 minutos desde tu celular. PagoYa." />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://pagoyamx.com/pagar-cfe-desde-usa" />
        <meta property="og:title" content="Pagar CFE desde Estados Unidos — Para tu familia en México | PagoYa" />
        <meta property="og:url" content="https://pagoyamx.com/pagar-cfe-desde-usa" />
      </Helmet>
      <div style={{ minHeight: "100vh", background: "#0A2540", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px" }}>
        <div style={{ maxWidth: 480, textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🇺🇸 → 🇲🇽</div>
          <h1 style={{ color: "#F1F5F9", fontSize: 24, fontWeight: 800, marginBottom: 12 }}>Pay your family's CFE from the US</h1>
          <p style={{ color: "#94A3B8", fontSize: 15, marginBottom: 28, lineHeight: 1.6 }}>No Western Union · No Mexican bank account · US card accepted · 2 minutes · $15 MXN flat fee</p>
          <button onClick={() => navigate("/")} style={{ background: "#1D9E75", color: "#fff", border: "none", borderRadius: 12, padding: "14px 32px", fontSize: 16, fontWeight: 700, cursor: "pointer" }}>
            Pay family's CFE →
          </button>
        </div>
      </div>
    </>
  );
}
