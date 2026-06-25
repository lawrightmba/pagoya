import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useLocation } from "wouter";

export default function PagarCFEVallarta() {
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
      { "@type": "ListItem", position: 3, name: "Pagar CFE Puerto Vallarta", item: "https://pagoyamx.com/pagar-cfe-vallarta" },
    ],
  };

  const article = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "Cómo pagar tu recibo de CFE en Puerto Vallarta sin ir al banco",
    description: "Paga tu recibo de luz CFE en Puerto Vallarta desde tu celular. Sin cuenta bancaria, sin tarjeta, sin filas. Solo efectivo en OXXO y listo.",
    url: "https://pagoyamx.com/pagar-cfe-vallarta",
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
        name: "¿Cómo pago el recibo de CFE en Puerto Vallarta sin banco?",
        acceptedAnswer: { "@type": "Answer", text: "Con PagoYa pagas tu recibo de luz CFE en Puerto Vallarta desde tu celular en menos de 2 minutos. Recarga tu billetera con efectivo en cualquier OXXO de Vallarta y paga al instante. No necesitas cuenta bancaria ni tarjeta de crédito." },
      },
      {
        "@type": "Question",
        name: "¿Qué número necesito para pagar CFE en línea desde Vallarta?",
        acceptedAnswer: { "@type": "Answer", text: "Necesitas el número de servicio CFE (NIS) que aparece en tu recibo bimestral. Tiene entre 9 y 12 dígitos. También puedes consultarlo en app.cfe.mx con tu correo o CURP." },
      },
      {
        "@type": "Question",
        name: "¿Dónde puedo pagar la luz CFE en Puerto Vallarta sin tarjeta?",
        acceptedAnswer: { "@type": "Answer", text: "Con PagoYa puedes pagar tu CFE desde el celular usando efectivo depositado en OXXO. También puedes pagar en cajas CFE en calle Morelos centro, en bancos o en el portal cfe.mx con tarjeta." },
      },
      {
        "@type": "Question",
        name: "¿Cuánto tarda en verse reflejado el pago de CFE en Vallarta?",
        acceptedAnswer: { "@type": "Answer", text: "El pago con PagoYa se procesa en segundos y recibes comprobante inmediato. CFE actualiza el saldo de tu cuenta en un plazo de 24 a 48 horas hábiles." },
      },
      {
        "@type": "Question",
        name: "¿Puedo pagar el CFE de un familiar que vive en Puerto Vallarta?",
        acceptedAnswer: { "@type": "Answer", text: "Sí. Solo necesitas el número de servicio CFE de esa cuenta. Puedes pagar el recibo de cualquier dirección en México desde tu celular, sin importar dónde estés." },
      },
    ],
  };

  const colonias = ["Emiliano Zapata", "Versalles", "5 de Diciembre", "Pitillal", "Fluvial Vallarta", "Zona Romántica", "Marina Vallarta", "Ixtapa", "El Pitillal", "Las Juntas"];

  return (
    <div style={{ background: "#0A2540", minHeight: "100vh", display: "flex", flexDirection: "column", overflowX: "hidden" }}>
      <Helmet>
        <html lang="es-MX" />
        <title>Pagar CFE Puerto Vallarta Sin Banco 2026 | PagoYa</title>
        <meta name="description" content="Paga tu recibo de luz CFE en Puerto Vallarta desde tu celular en 2 minutos. Sin banco, sin tarjeta, sin filas. Carga con efectivo en OXXO y paga al instante con PagoYa." />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://pagoyamx.com/pagar-cfe-vallarta" />
        <link rel="alternate" hrefLang="es-MX" href="https://pagoyamx.com/pagar-cfe-vallarta" />
        <link rel="alternate" hrefLang="x-default" href="https://pagoyamx.com/pagar-cfe-vallarta" />
        <meta name="geo.region" content="MX-JAL" />
        <meta name="geo.placename" content="Puerto Vallarta, Jalisco" />
        <meta property="og:title" content="Pagar CFE Puerto Vallarta Sin Banco | PagoYa" />
        <meta property="og:description" content="Paga tu recibo de luz CFE en Puerto Vallarta desde tu celular. Sin banco ni tarjeta. Efectivo en OXXO con PagoYa." />
        <meta property="og:image" content="https://pagoyamx.com/og-default.png" />
        <meta property="og:type" content="article" />
        <meta property="og:url" content="https://pagoyamx.com/pagar-cfe-vallarta" />
        <script type="application/ld+json">{JSON.stringify(breadcrumb)}</script>
        <script type="application/ld+json">{JSON.stringify(article)}</script>
        <script type="application/ld+json">{JSON.stringify(faq)}</script>
      </Helmet>

      <style>{`
        .pv-body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
        .pv-body a { color: #1D9E75; text-decoration: underline; }
        .pv-h1 { font-size: clamp(26px, 5vw, 42px); }
        .pv-h2 { font-size: clamp(20px, 3.5vw, 28px); }
        .pv-table { width: 100%; border-collapse: collapse; }
        .pv-table th, .pv-table td { padding: 10px 14px; border: 1px solid rgba(255,255,255,0.12); text-align: left; vertical-align: top; }
        .pv-table th { background: rgba(29,158,117,0.18); color: #1D9E75; font-weight: 700; }
        .pv-table tr:nth-child(even) td { background: rgba(255,255,255,0.03); }
        .pv-ol { padding-left: 20px; }
        .pv-ol li { margin-bottom: 10px; line-height: 1.6; color: #CBD5E1; }
        .pv-ul { list-style: disc; padding-left: 22px; }
        .pv-ul li { margin-bottom: 6px; line-height: 1.6; color: #CBD5E1; }
        @media(max-width:640px){ .pv-table-wrap { overflow-x: auto; } .pv-body { padding: 0 16px 48px; } }
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
          <p style={{ color: "white", fontWeight: 700, fontSize: "14px", margin: 0 }}>⚡ Paga tu CFE ahora</p>
          <button onClick={() => navigate("/pagar")} style={{ background: "linear-gradient(135deg, #1D9E75, #25C090)", color: "white", border: "none", borderRadius: "20px", padding: "10px 22px", fontWeight: 800, fontSize: "14px", cursor: "pointer" }}>
            Pagar CFE →
          </button>
        </div>
      )}

      {/* Hero */}
      <section style={{ padding: "56px 24px 40px", maxWidth: "760px", margin: "0 auto", width: "100%" }} className="pv-body">
        <p style={{ color: "#1D9E75", fontWeight: 700, fontSize: "13px", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "12px" }}>
          ⚡ Luz CFE · Puerto Vallarta, Jalisco
        </p>
        <h1 className="pv-h1" style={{ color: "white", fontWeight: 900, lineHeight: 1.2, marginBottom: "20px" }}>
          Pagar CFE Puerto Vallarta<br />
          <span style={{ color: "#1D9E75" }}>sin banco, sin filas, sin tarjeta</span>
        </h1>
        <p style={{ color: "#94A3B8", fontSize: "18px", lineHeight: 1.7, marginBottom: "32px", maxWidth: "600px" }}>
          Paga tu recibo de luz de la <strong style={{ color: "white" }}>Comisión Federal de Electricidad (CFE)</strong> en Puerto Vallarta desde tu celular en menos de 2 minutos. Carga saldo con efectivo en cualquier OXXO de Vallarta y paga al instante.
        </p>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <button onClick={() => navigate("/pagar")} style={{ background: "linear-gradient(135deg, #1D9E75, #25C090)", color: "white", border: "none", borderRadius: "50px", padding: "16px 32px", fontWeight: 800, fontSize: "16px", cursor: "pointer", boxShadow: "0 8px 24px rgba(29,158,117,0.4)" }}>
            Pagar CFE ahora →
          </button>
          <button onClick={() => navigate("/cargar")} style={{ background: "rgba(255,255,255,0.08)", color: "white", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "50px", padding: "16px 28px", fontWeight: 700, fontSize: "15px", cursor: "pointer" }}>
            Cargar saldo primero
          </button>
        </div>
      </section>

      {/* Steps */}
      <section style={{ padding: "0 24px 48px", maxWidth: "760px", margin: "0 auto", width: "100%" }} className="pv-body">
        <h2 className="pv-h2" style={{ color: "white", fontWeight: 800, marginBottom: "24px" }}>
          Cómo pagar el CFE en Puerto Vallarta en 3 pasos
        </h2>
        <ol className="pv-ol" style={{ marginBottom: "32px" }}>
          <li><strong style={{ color: "white" }}>Recarga con efectivo en OXXO.</strong> Ve a cualquier OXXO en Puerto Vallarta — hay más de 30 en el municipio. Da tu número de teléfono y deposita el monto de tu recibo CFE. Tu saldo PagoYa se acredita al instante.</li>
          <li><strong style={{ color: "white" }}>Ingresa tu número de servicio CFE.</strong> Abre PagoYa, elige "Pagar servicio", selecciona Luz (CFE) e ingresa el NIS (número de servicio) de tu recibo bimestral.</li>
          <li><strong style={{ color: "white" }}>Confirma y listo.</strong> El pago se procesa en segundos. Recibes comprobante en pantalla. CFE registra el pago en 24–48 h hábiles.</li>
        </ol>

        {/* Feature pills */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", marginBottom: "40px" }}>
          {[
            { icon: "⚡", title: "2 minutos", desc: "de principio a fin" },
            { icon: "🏪", title: "+30 OXXO", desc: "solo en Puerto Vallarta" },
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
      <section style={{ padding: "0 24px 48px", maxWidth: "760px", margin: "0 auto", width: "100%" }} className="pv-body">
        <h2 className="pv-h2" style={{ color: "white", fontWeight: 800, marginBottom: "16px" }}>
          Disponible en toda Puerto Vallarta
        </h2>
        <p style={{ color: "#94A3B8", fontSize: "15px", marginBottom: "18px", lineHeight: 1.6 }}>
          PagoYa funciona para cualquier número de servicio CFE registrado en Jalisco. Usuarios en estas colonias ya pagan su luz desde el celular:
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "32px" }}>
          {colonias.map(c => (
            <span key={c} style={{ background: "rgba(29,158,117,0.12)", border: "1px solid rgba(29,158,117,0.25)", color: "#1D9E75", borderRadius: "20px", padding: "5px 14px", fontSize: "13px", fontWeight: 600 }}>{c}</span>
          ))}
        </div>
      </section>

      {/* Info table */}
      <section style={{ padding: "0 24px 48px", maxWidth: "760px", margin: "0 auto", width: "100%" }} className="pv-body">
        <h2 className="pv-h2" style={{ color: "white", fontWeight: 800, marginBottom: "20px" }}>
          Información sobre el pago CFE en Puerto Vallarta
        </h2>
        <div className="pv-table-wrap">
          <table className="pv-table" style={{ color: "#CBD5E1", fontSize: "14px", marginBottom: "24px" }}>
            <thead><tr><th>Detalle</th><th>Información</th></tr></thead>
            <tbody>
              <tr><td>Proveedor</td><td>Comisión Federal de Electricidad (CFE) — División Jalisco</td></tr>
              <tr><td>Cobertura</td><td>Puerto Vallarta, Bahía de Banderas y toda la zona de influencia CFE Jalisco</td></tr>
              <tr><td>Frecuencia de facturación</td><td>Bimestral (cada 2 meses)</td></tr>
              <tr><td>Número de servicio (NIS)</td><td>Aparece en la parte superior del recibo físico. También disponible en <strong>app.cfe.mx</strong></td></tr>
              <tr><td>Costo del servicio PagoYa</td><td>$25 MXN tarifa de servicio por transacción</td></tr>
              <tr><td>Tiempo de acreditación</td><td>Pago instantáneo · CFE actualiza en 24–48 h hábiles</td></tr>
            </tbody>
          </table>
        </div>

        <h2 className="pv-h2" style={{ color: "white", fontWeight: 800, marginBottom: "20px" }}>
          ¿Dónde más puedo pagar la luz CFE en Vallarta?
        </h2>
        <div className="pv-table-wrap">
          <table className="pv-table" style={{ color: "#CBD5E1", fontSize: "14px", marginBottom: "32px" }}>
            <thead><tr><th>Opción de pago</th><th>Requiere</th><th>Comisión aprox.</th></tr></thead>
            <tbody>
              <tr><td><strong style={{ color: "#1D9E75" }}>PagoYa (recomendado)</strong></td><td>Solo tu celular</td><td>$25 MXN fija</td></tr>
              <tr><td>Caja CFE — Av. Francisco Villa 1101</td><td>Ir en persona, recibo físico</td><td>Sin comisión</td></tr>
              <tr><td>Bancos (BBVA, Santander, Banorte)</td><td>Cuenta bancaria</td><td>$15–$30 MXN</td></tr>
              <tr><td>Portal cfe.mx / App CFE</td><td>Tarjeta de crédito/débito</td><td>Variable</td></tr>
              <tr><td>OXXO Pay directo</td><td>Ir al OXXO con recibo</td><td>$13 MXN aprox.</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ padding: "0 24px 48px", maxWidth: "760px", margin: "0 auto", width: "100%" }} className="pv-body">
        <h2 className="pv-h2" style={{ color: "white", fontWeight: 800, marginBottom: "24px" }}>
          Preguntas frecuentes — pago CFE Puerto Vallarta
        </h2>
        {[
          { q: "¿Cómo pago el recibo de CFE en Puerto Vallarta sin banco?", a: "Con PagoYa pagas tu recibo de luz CFE en Puerto Vallarta desde tu celular en menos de 2 minutos. Recarga tu billetera con efectivo en cualquier OXXO de Vallarta y paga al instante. No necesitas cuenta bancaria ni tarjeta." },
          { q: "¿Qué número necesito para pagar CFE en línea desde Vallarta?", a: "Necesitas el NIS (número de servicio) que aparece en tu recibo bimestral. También lo encuentras en app.cfe.mx con tu correo o CURP." },
          { q: "¿Dónde puedo pagar la luz CFE en Puerto Vallarta sin tarjeta?", a: "Con PagoYa pagas desde el celular usando efectivo en OXXO. También puedes pagar en la caja CFE en Av. Francisco Villa 1101, o en bancos con tu número de cuenta." },
          { q: "¿Cuánto tarda en reflejarse el pago de CFE en Vallarta?", a: "El pago con PagoYa se procesa en segundos y recibes comprobante inmediato. CFE actualiza el saldo de tu cuenta en 24 a 48 horas hábiles." },
          { q: "¿Puedo pagar el CFE de un familiar que vive en Puerto Vallarta?", a: "Sí. Solo necesitas su número de servicio CFE. Puedes pagar el recibo de cualquier dirección en México desde tu celular, sin importar dónde estés." },
        ].map((item, i) => (
          <div key={i} style={{ marginBottom: "20px", borderBottom: "1px solid rgba(255,255,255,0.07)", paddingBottom: "20px" }}>
            <p style={{ color: "white", fontWeight: 700, fontSize: "16px", marginBottom: "8px" }}>❓ {item.q}</p>
            <p style={{ color: "#94A3B8", lineHeight: 1.7, fontSize: "15px" }}>{item.a}</p>
          </div>
        ))}
      </section>

      {/* Final CTA */}
      <section style={{ padding: "0 24px 80px", maxWidth: "760px", margin: "0 auto", width: "100%", textAlign: "center" }} className="pv-body">
        <div style={{ background: "linear-gradient(135deg, rgba(29,158,117,0.15), rgba(29,158,117,0.05))", border: "1px solid rgba(29,158,117,0.3)", borderRadius: "24px", padding: "40px 24px" }}>
          <p style={{ fontSize: "32px", marginBottom: "12px" }}>⚡</p>
          <h2 style={{ color: "white", fontWeight: 900, fontSize: "22px", marginBottom: "10px" }}>Paga tu CFE ahora mismo</h2>
          <p style={{ color: "#94A3B8", fontSize: "15px", marginBottom: "28px", lineHeight: 1.6 }}>Sin banco, sin tarjeta, sin filas.<br />Solo tu celular y efectivo en OXXO.</p>
          <button onClick={() => navigate("/pagar")} style={{ background: "linear-gradient(135deg, #1D9E75, #25C090)", color: "white", border: "none", borderRadius: "50px", padding: "16px 36px", fontWeight: 800, fontSize: "16px", cursor: "pointer", boxShadow: "0 8px 24px rgba(29,158,117,0.4)" }}>
            Pagar mi CFE →
          </button>
        </div>
      </section>
    </div>
  );
}
