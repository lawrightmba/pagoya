import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useLocation } from "wouter";

export default function PagarAguaTijuana() {
  const [, navigate] = useLocation();
  const [showSticky, setShowSticky] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowSticky(window.scrollY > 320);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: "https://pagoyamx.com/" },
      { "@type": "ListItem", position: 2, name: "Pagar servicios", item: "https://pagoyamx.com/guia-pagar-servicios-sin-cuenta-bancaria" },
      { "@type": "ListItem", position: 3, name: "Pagar agua CESPT Tijuana", item: "https://pagoyamx.com/pagar-agua-tijuana" },
    ],
  };

  const article = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "Cómo pagar tu recibo de agua CESPT Tijuana sin ir al banco",
    description: "Paga tu recibo de agua CESPT en Tijuana desde tu celular. Sin cuenta bancaria, sin tarjeta, sin filas. Solo efectivo en OXXO y listo.",
    url: "https://pagoyamx.com/pagar-agua-tijuana",
    datePublished: "2026-06-25",
    publisher: { "@type": "Organization", name: "PagoYa", url: "https://pagoyamx.com" },
    inLanguage: "es-MX",
  };

  const faq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "¿Cómo pago el agua CESPT Tijuana sin ir al banco?",
        acceptedAnswer: { "@type": "Answer", text: "Con PagoYa pagas tu recibo de agua CESPT en Tijuana desde tu celular en menos de 2 minutos. Recarga tu billetera con efectivo en cualquier OXXO de Tijuana y paga al instante. No necesitas cuenta bancaria ni tarjeta." },
      },
      {
        "@type": "Question",
        name: "¿Qué número necesito para pagar el agua en Tijuana en línea?",
        acceptedAnswer: { "@type": "Answer", text: "Necesitas el número de cuenta o contrato CESPT que aparece en tu recibo bimestral. También puedes consultarlo en el portal cespt.gob.mx con tu dirección." },
      },
      {
        "@type": "Question",
        name: "¿Puedo pagar el agua de Tijuana sin tener el recibo físico?",
        acceptedAnswer: { "@type": "Answer", text: "Sí. Con PagoYa puedes pagar el CESPT con tu número de cuenta aunque no tengas el recibo en mano. El número de cuenta no cambia entre bimestres." },
      },
      {
        "@type": "Question",
        name: "¿Cuánto tarda en procesarse el pago del agua en Tijuana?",
        acceptedAnswer: { "@type": "Answer", text: "El pago se procesa en segundos con PagoYa. Recibes un comprobante inmediatamente. CESPT registra el pago en su sistema en un plazo de 24 a 48 horas hábiles." },
      },
      {
        "@type": "Question",
        name: "¿Qué pasa si pago el agua CESPT tarde?",
        acceptedAnswer: { "@type": "Answer", text: "CESPT aplica recargos por pago tardío y puede suspender el servicio. Con PagoYa puedes pagar en cualquier momento desde tu celular, sin necesidad de ir a una caja o banco." },
      },
    ],
  };

  const colonias = ["Zona Río", "Centro Tijuana", "Playas de Tijuana", "Otay", "Colonia Libertad", "La Mesa", "Sánchez Taboada", "Hipódromo", "El Florido", "Vista Hermosa"];

  return (
    <div style={{ background: "#0A2540", minHeight: "100vh", display: "flex", flexDirection: "column", overflowX: "hidden" }}>
      <Helmet>
        <html lang="es-MX" />
        <title>Pagar Agua CESPT Tijuana Sin Banco 2026 | PagoYa</title>
        <meta name="description" content="Paga tu recibo de agua CESPT Tijuana desde tu celular en 2 minutos. Sin banco, sin tarjeta, sin filas. Carga con efectivo en OXXO y paga al instante con PagoYa." />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://pagoyamx.com/pagar-agua-tijuana" />
        <link rel="alternate" hrefLang="es-MX" href="https://pagoyamx.com/pagar-agua-tijuana" />
        <link rel="alternate" hrefLang="x-default" href="https://pagoyamx.com/pagar-agua-tijuana" />
        <meta name="geo.region" content="MX-BC" />
        <meta name="geo.placename" content="Tijuana, Baja California" />
        <meta property="og:title" content="Pagar Agua CESPT Tijuana Sin Banco | PagoYa" />
        <meta property="og:description" content="Paga tu recibo de agua CESPT Tijuana desde tu celular. Sin banco ni tarjeta. Efectivo en OXXO con PagoYa." />
        <meta property="og:image" content="https://pagoyamx.com/og-default.png" />
        <meta property="og:type" content="article" />
        <meta property="og:url" content="https://pagoyamx.com/pagar-agua-tijuana" />
        <script type="application/ld+json">{JSON.stringify(breadcrumb)}</script>
        <script type="application/ld+json">{JSON.stringify(article)}</script>
        <script type="application/ld+json">{JSON.stringify(faq)}</script>
      </Helmet>

      <style>{`
        .tj-body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
        .tj-h1 { font-size: clamp(26px, 5vw, 42px); }
        .tj-h2 { font-size: clamp(20px, 3.5vw, 28px); }
        .tj-table { width: 100%; border-collapse: collapse; }
        .tj-table th, .tj-table td { padding: 10px 14px; border: 1px solid rgba(255,255,255,0.12); text-align: left; vertical-align: top; }
        .tj-table th { background: rgba(29,158,117,0.18); color: #1D9E75; font-weight: 700; }
        .tj-table tr:nth-child(even) td { background: rgba(255,255,255,0.03); }
        .tj-ol { padding-left: 20px; }
        .tj-ol li { margin-bottom: 10px; line-height: 1.6; color: #CBD5E1; }
        @media(max-width:640px){ .tj-table-wrap { overflow-x: auto; } .tj-body { padding: 0 16px 48px; } }
      `}</style>

      {/* Nav */}
      <nav style={{ background: "rgba(10,37,64,0.95)", borderBottom: "1px solid rgba(255,255,255,0.08)", padding: "14px 24px", display: "flex", alignItems: "center", gap: "12px", position: "sticky", top: 0, zIndex: 50, backdropFilter: "blur(8px)" }}>
        <button onClick={() => navigate("/")} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
          <img src="/pagoya-logo.png" alt="PagoYa" style={{ height: "32px" }} />
        </button>
        <span style={{ flex: 1 }} />
        <button onClick={() => navigate("/pagar")} style={{ background: "#1D9E75", color: "white", border: "none", borderRadius: "20px", padding: "8px 18px", fontWeight: 700, fontSize: "14px", cursor: "pointer" }}>
          Pagar ahora
        </button>
      </nav>

      {/* Sticky bottom CTA */}
      {showSticky && (
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100, background: "rgba(10,37,64,0.97)", borderTop: "1px solid rgba(29,158,117,0.4)", padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", backdropFilter: "blur(10px)" }}>
          <p style={{ color: "white", fontWeight: 700, fontSize: "14px", margin: 0 }}>💧 Paga tu CESPT ahora</p>
          <button onClick={() => navigate("/pagar")} style={{ background: "linear-gradient(135deg, #1D9E75, #25C090)", color: "white", border: "none", borderRadius: "20px", padding: "10px 22px", fontWeight: 800, fontSize: "14px", cursor: "pointer" }}>
            Pagar agua →
          </button>
        </div>
      )}

      {/* Hero */}
      <section style={{ padding: "56px 24px 40px", maxWidth: "760px", margin: "0 auto", width: "100%" }} className="tj-body">
        <p style={{ color: "#1D9E75", fontWeight: 700, fontSize: "13px", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "12px" }}>
          💧 Agua · Tijuana, Baja California
        </p>
        <h1 className="tj-h1" style={{ color: "white", fontWeight: 900, lineHeight: 1.2, marginBottom: "20px" }}>
          Pagar agua CESPT Tijuana<br />
          <span style={{ color: "#1D9E75" }}>sin banco, sin filas, sin tarjeta</span>
        </h1>
        <p style={{ color: "#94A3B8", fontSize: "18px", lineHeight: 1.7, marginBottom: "32px", maxWidth: "600px" }}>
          Paga tu recibo de la <strong style={{ color: "white" }}>Comisión Estatal de Servicios Públicos de Tijuana (CESPT)</strong> desde tu celular en menos de 2 minutos. Carga saldo con efectivo en cualquier OXXO de Tijuana y paga al instante.
        </p>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <button onClick={() => navigate("/pagar")} style={{ background: "linear-gradient(135deg, #1D9E75, #25C090)", color: "white", border: "none", borderRadius: "50px", padding: "16px 32px", fontWeight: 800, fontSize: "16px", cursor: "pointer", boxShadow: "0 8px 24px rgba(29,158,117,0.4)" }}>
            Pagar CESPT ahora →
          </button>
          <button onClick={() => navigate("/cargar")} style={{ background: "rgba(255,255,255,0.08)", color: "white", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "50px", padding: "16px 28px", fontWeight: 700, fontSize: "15px", cursor: "pointer" }}>
            Cargar saldo primero
          </button>
        </div>
      </section>

      {/* Steps */}
      <section style={{ padding: "0 24px 48px", maxWidth: "760px", margin: "0 auto", width: "100%" }} className="tj-body">
        <h2 className="tj-h2" style={{ color: "white", fontWeight: 800, marginBottom: "24px" }}>
          Cómo pagar el agua en Tijuana en 3 pasos
        </h2>
        <ol className="tj-ol" style={{ marginBottom: "32px" }}>
          <li><strong style={{ color: "white" }}>Recarga con efectivo en OXXO.</strong> Ve a cualquier OXXO de Tijuana — hay más de 120 en la ciudad. Da tu número de teléfono y deposita el monto de tu recibo CESPT. Tu saldo PagoYa se acredita al instante.</li>
          <li><strong style={{ color: "white" }}>Ingresa tu número de cuenta CESPT.</strong> Abre PagoYa, elige "Pagar servicio", selecciona Agua (CESPT) e ingresa el número de contrato de tu recibo bimestral.</li>
          <li><strong style={{ color: "white" }}>Confirma y listo.</strong> El pago se procesa en segundos. Recibes comprobante en pantalla. CESPT registra el pago en 24–48 h hábiles.</li>
        </ol>

        {/* Feature pills */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", marginBottom: "40px" }}>
          {[
            { icon: "⚡", title: "2 minutos", desc: "de principio a fin" },
            { icon: "🏪", title: "+120 OXXO", desc: "solo en Tijuana" },
            { icon: "📱", title: "Sin banco", desc: "ni tarjeta requerida" },
            { icon: "🧾", title: "Comprobante", desc: "inmediato en pantalla" },
          ].map(f => (
            <div key={f.title} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "16px", padding: "18px 16px" }}>
              <p style={{ fontSize: "24px", marginBottom: "6px" }}>{f.icon}</p>
              <p style={{ color: "white", fontWeight: 800, fontSize: "15px", marginBottom: "2px" }}>{f.title}</p>
              <p style={{ color: "#94A3B8", fontSize: "13px" }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Colonias trust strip */}
      <section style={{ padding: "0 24px 48px", maxWidth: "760px", margin: "0 auto", width: "100%" }} className="tj-body">
        <h2 className="tj-h2" style={{ color: "white", fontWeight: 800, marginBottom: "16px" }}>
          Disponible en toda Tijuana
        </h2>
        <p style={{ color: "#94A3B8", fontSize: "15px", marginBottom: "18px", lineHeight: 1.6 }}>
          PagoYa funciona para cualquier número de contrato CESPT. Usuarios en estas colonias ya pagan su agua desde el celular:
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "32px" }}>
          {colonias.map(c => (
            <span key={c} style={{ background: "rgba(29,158,117,0.12)", border: "1px solid rgba(29,158,117,0.25)", color: "#1D9E75", borderRadius: "20px", padding: "5px 14px", fontSize: "13px", fontWeight: 600 }}>{c}</span>
          ))}
        </div>
      </section>

      {/* Info table */}
      <section style={{ padding: "0 24px 48px", maxWidth: "760px", margin: "0 auto", width: "100%" }} className="tj-body">
        <h2 className="tj-h2" style={{ color: "white", fontWeight: 800, marginBottom: "20px" }}>
          Información sobre el pago CESPT en línea
        </h2>
        <div className="tj-table-wrap">
          <table className="tj-table" style={{ color: "#CBD5E1", fontSize: "14px", marginBottom: "24px" }}>
            <thead><tr><th>Detalle</th><th>Información</th></tr></thead>
            <tbody>
              <tr><td>Organismo</td><td>Comisión Estatal de Servicios Públicos de Tijuana (CESPT)</td></tr>
              <tr><td>Cobertura</td><td>Tijuana, Tecate y municipios del norte de Baja California</td></tr>
              <tr><td>Frecuencia de facturación</td><td>Bimestral (cada 2 meses)</td></tr>
              <tr><td>Número de cuenta</td><td>Aparece en la parte superior del recibo físico. Disponible también en <strong>cespt.gob.mx</strong></td></tr>
              <tr><td>Costo del servicio PagoYa</td><td>$25 MXN tarifa de servicio por transacción</td></tr>
              <tr><td>Tiempo de acreditación</td><td>Pago instantáneo · CESPT actualiza en 24–48 h hábiles</td></tr>
            </tbody>
          </table>
        </div>

        <h2 className="tj-h2" style={{ color: "white", fontWeight: 800, marginBottom: "20px" }}>
          ¿Dónde más puedo pagar el agua CESPT en Tijuana?
        </h2>
        <div className="tj-table-wrap">
          <table className="tj-table" style={{ color: "#CBD5E1", fontSize: "14px", marginBottom: "32px" }}>
            <thead><tr><th>Opción de pago</th><th>Requiere</th><th>Comisión aprox.</th></tr></thead>
            <tbody>
              <tr><td><strong style={{ color: "#1D9E75" }}>PagoYa (recomendado)</strong></td><td>Solo tu celular</td><td>$25 MXN fija</td></tr>
              <tr><td>Cajas CESPT</td><td>Ir en persona, recibo físico</td><td>Sin comisión</td></tr>
              <tr><td>Bancos (BBVA, Banorte, Santander)</td><td>Cuenta bancaria</td><td>$15–$30 MXN</td></tr>
              <tr><td>Portal cespt.gob.mx</td><td>Tarjeta de crédito/débito</td><td>Variable</td></tr>
              <tr><td>OXXO Pay directo</td><td>Ir al OXXO con recibo</td><td>$13 MXN aprox.</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ padding: "0 24px 48px", maxWidth: "760px", margin: "0 auto", width: "100%" }} className="tj-body">
        <h2 className="tj-h2" style={{ color: "white", fontWeight: 800, marginBottom: "24px" }}>
          Preguntas frecuentes — pago CESPT Tijuana
        </h2>
        {[
          { q: "¿Cómo pago el agua CESPT Tijuana sin ir al banco?", a: "Con PagoYa pagas tu recibo de agua CESPT en Tijuana desde tu celular en menos de 2 minutos. Recarga con efectivo en OXXO y paga al instante. No necesitas cuenta bancaria ni tarjeta." },
          { q: "¿Qué número necesito para pagar el agua en Tijuana en línea?", a: "Necesitas el número de cuenta o contrato CESPT que aparece en tu recibo bimestral. También puedes consultarlo en cespt.gob.mx con tu dirección." },
          { q: "¿Puedo pagar el agua de Tijuana sin tener el recibo físico?", a: "Sí. Con PagoYa puedes pagar el CESPT con tu número de cuenta aunque no tengas el recibo en mano. El número no cambia entre bimestres." },
          { q: "¿Cuánto tarda en procesarse el pago del agua en Tijuana?", a: "El pago se procesa en segundos con PagoYa. Recibes comprobante inmediatamente. CESPT registra el pago en 24 a 48 horas hábiles." },
          { q: "¿Qué pasa si pago el agua CESPT tarde?", a: "CESPT aplica recargos por pago tardío y puede suspender el servicio. Con PagoYa puedes pagar en cualquier momento desde tu celular, sin necesidad de ir a una caja o banco." },
        ].map((item, i) => (
          <div key={i} style={{ marginBottom: "20px", borderBottom: "1px solid rgba(255,255,255,0.07)", paddingBottom: "20px" }}>
            <p style={{ color: "white", fontWeight: 700, fontSize: "16px", marginBottom: "8px" }}>❓ {item.q}</p>
            <p style={{ color: "#94A3B8", lineHeight: 1.7, fontSize: "15px" }}>{item.a}</p>
          </div>
        ))}
      </section>

      {/* Final CTA */}
      <section style={{ padding: "0 24px 80px", maxWidth: "760px", margin: "0 auto", width: "100%", textAlign: "center" }} className="tj-body">
        <div style={{ background: "linear-gradient(135deg, rgba(29,158,117,0.15), rgba(29,158,117,0.05))", border: "1px solid rgba(29,158,117,0.3)", borderRadius: "24px", padding: "40px 24px" }}>
          <p style={{ fontSize: "32px", marginBottom: "12px" }}>💧</p>
          <h2 style={{ color: "white", fontWeight: 900, fontSize: "22px", marginBottom: "10px" }}>Paga tu CESPT ahora mismo</h2>
          <p style={{ color: "#94A3B8", fontSize: "15px", marginBottom: "28px", lineHeight: 1.6 }}>Sin banco, sin tarjeta, sin filas.<br />Solo tu celular y efectivo en OXXO.</p>
          <button onClick={() => navigate("/pagar")} style={{ background: "linear-gradient(135deg, #1D9E75, #25C090)", color: "white", border: "none", borderRadius: "50px", padding: "16px 36px", fontWeight: 800, fontSize: "16px", cursor: "pointer", boxShadow: "0 8px 24px rgba(29,158,117,0.4)" }}>
            Pagar mi CESPT →
          </button>
        </div>
      </section>
    </div>
  );
}
