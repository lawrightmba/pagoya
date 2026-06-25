import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useLocation } from "wouter";

export default function PagarPredialVallarta() {
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
      { "@type": "ListItem", position: 3, name: "Pagar predial Puerto Vallarta", item: "https://pagoyamx.com/pagar-predial-vallarta" },
    ],
  };

  const article = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "Cómo pagar el predial de Puerto Vallarta 2026 sin ir al banco",
    description: "Paga el predial de Puerto Vallarta 2026 desde tu celular. Sin cuenta bancaria, sin tarjeta, sin filas. Solo efectivo en OXXO con PagoYa.",
    url: "https://pagoyamx.com/pagar-predial-vallarta",
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
        name: "¿Cómo pago el predial de Puerto Vallarta 2026 sin ir al banco?",
        acceptedAnswer: { "@type": "Answer", text: "Con PagoYa puedes pagar el predial de Puerto Vallarta desde tu celular. Recarga tu billetera con efectivo en cualquier OXXO de Vallarta y paga al instante. No necesitas cuenta bancaria ni tarjeta." },
      },
      {
        "@type": "Question",
        name: "¿Cuál es la fecha límite para pagar el predial en Puerto Vallarta 2026?",
        acceptedAnswer: { "@type": "Answer", text: "El H. Ayuntamiento de Puerto Vallarta ofrece descuentos por pronto pago durante los primeros meses del año. Para 2026, consulta la página del ayuntamiento o llama al teléfono de atención ciudadana para confirmar la fecha exacta de vencimiento con descuento." },
      },
      {
        "@type": "Question",
        name: "¿Qué número necesito para pagar el predial en Vallarta en línea?",
        acceptedAnswer: { "@type": "Answer", text: "Necesitas la clave catastral o número de cuenta predial que aparece en tu boleta de pago anual. También puedes consultarla en la Dirección de Catastro del Ayuntamiento de Puerto Vallarta." },
      },
      {
        "@type": "Question",
        name: "¿Hay descuento por pagar el predial de Vallarta antes del vencimiento?",
        acceptedAnswer: { "@type": "Answer", text: "Sí. El Ayuntamiento de Puerto Vallarta otorga descuentos de hasta el 15% por pago en enero y menores descuentos en meses subsecuentes. Con PagoYa puedes pagar inmediatamente para aprovechar el descuento vigente." },
      },
      {
        "@type": "Question",
        name: "¿Puedo pagar el predial de Puerto Vallarta si no tengo mi boleta?",
        acceptedAnswer: { "@type": "Answer", text: "Sí. Puedes consultar tu clave catastral en la Dirección de Catastro o en el portal del Ayuntamiento de Puerto Vallarta ingresando tu dirección o nombre. Una vez que tengas el número, lo ingresas en PagoYa y pagas." },
      },
    ],
  };

  const colonias = ["Emiliano Zapata", "Versalles", "5 de Diciembre", "Pitillal", "Fluvial Vallarta", "Zona Romántica", "Marina Vallarta", "Ixtapa", "El Pitillal", "Las Juntas"];

  return (
    <div style={{ background: "#0A2540", minHeight: "100vh", display: "flex", flexDirection: "column", overflowX: "hidden" }}>
      <Helmet>
        <html lang="es-MX" />
        <title>Pagar Predial Puerto Vallarta 2026 Sin Banco | PagoYa</title>
        <meta name="description" content="Paga el predial de Puerto Vallarta 2026 desde tu celular en minutos. Sin banco, sin tarjeta, sin filas. Carga con efectivo en OXXO y paga al instante con PagoYa." />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://pagoyamx.com/pagar-predial-vallarta" />
        <link rel="alternate" hrefLang="es-MX" href="https://pagoyamx.com/pagar-predial-vallarta" />
        <link rel="alternate" hrefLang="x-default" href="https://pagoyamx.com/pagar-predial-vallarta" />
        <meta name="geo.region" content="MX-JAL" />
        <meta name="geo.placename" content="Puerto Vallarta, Jalisco" />
        <meta property="og:title" content="Pagar Predial Puerto Vallarta 2026 Sin Banco | PagoYa" />
        <meta property="og:description" content="Paga el predial de Puerto Vallarta 2026 desde tu celular. Sin banco ni tarjeta. Efectivo en OXXO con PagoYa." />
        <meta property="og:image" content="https://pagoyamx.com/og-default.png" />
        <meta property="og:type" content="article" />
        <meta property="og:url" content="https://pagoyamx.com/pagar-predial-vallarta" />
        <script type="application/ld+json">{JSON.stringify(breadcrumb)}</script>
        <script type="application/ld+json">{JSON.stringify(article)}</script>
        <script type="application/ld+json">{JSON.stringify(faq)}</script>
      </Helmet>

      <style>{`
        .pred-body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
        .pred-h1 { font-size: clamp(26px, 5vw, 42px); }
        .pred-h2 { font-size: clamp(20px, 3.5vw, 28px); }
        .pred-table { width: 100%; border-collapse: collapse; }
        .pred-table th, .pred-table td { padding: 10px 14px; border: 1px solid rgba(255,255,255,0.12); text-align: left; vertical-align: top; }
        .pred-table th { background: rgba(29,158,117,0.18); color: #1D9E75; font-weight: 700; }
        .pred-table tr:nth-child(even) td { background: rgba(255,255,255,0.03); }
        .pred-ol { padding-left: 20px; }
        .pred-ol li { margin-bottom: 10px; line-height: 1.6; color: #CBD5E1; }
        @media(max-width:640px){ .pred-table-wrap { overflow-x: auto; } .pred-body { padding: 0 16px 48px; } }
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
          <p style={{ color: "white", fontWeight: 700, fontSize: "14px", margin: 0 }}>🏠 Paga tu predial 2026 ahora</p>
          <button onClick={() => navigate("/pagar")} style={{ background: "linear-gradient(135deg, #1D9E75, #25C090)", color: "white", border: "none", borderRadius: "20px", padding: "10px 22px", fontWeight: 800, fontSize: "14px", cursor: "pointer" }}>
            Pagar predial →
          </button>
        </div>
      )}

      {/* Hero */}
      <section style={{ padding: "56px 24px 40px", maxWidth: "760px", margin: "0 auto", width: "100%" }} className="pred-body">
        <p style={{ color: "#1D9E75", fontWeight: 700, fontSize: "13px", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "12px" }}>
          🏠 Predial 2026 · Puerto Vallarta, Jalisco
        </p>
        <h1 className="pred-h1" style={{ color: "white", fontWeight: 900, lineHeight: 1.2, marginBottom: "20px" }}>
          Pagar predial Puerto Vallarta 2026<br />
          <span style={{ color: "#1D9E75" }}>sin banco, sin filas, sin tarjeta</span>
        </h1>
        <p style={{ color: "#94A3B8", fontSize: "18px", lineHeight: 1.7, marginBottom: "16px", maxWidth: "600px" }}>
          Paga tu <strong style={{ color: "white" }}>impuesto predial del H. Ayuntamiento de Puerto Vallarta</strong> desde tu celular. Carga saldo con efectivo en cualquier OXXO y paga al instante — sin moverte de tu casa.
        </p>
        {/* Discount urgency callout */}
        <div style={{ background: "rgba(255,193,7,0.1)", border: "1px solid rgba(255,193,7,0.3)", borderRadius: "12px", padding: "12px 16px", marginBottom: "28px", maxWidth: "520px" }}>
          <p style={{ color: "#FFC107", fontWeight: 700, fontSize: "14px", margin: 0 }}>⏰ El Ayuntamiento ofrece descuentos por pronto pago — paga antes del vencimiento para ahorrar hasta 15%.</p>
        </div>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <button onClick={() => navigate("/pagar")} style={{ background: "linear-gradient(135deg, #1D9E75, #25C090)", color: "white", border: "none", borderRadius: "50px", padding: "16px 32px", fontWeight: 800, fontSize: "16px", cursor: "pointer", boxShadow: "0 8px 24px rgba(29,158,117,0.4)" }}>
            Pagar predial ahora →
          </button>
          <button onClick={() => navigate("/cargar")} style={{ background: "rgba(255,255,255,0.08)", color: "white", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "50px", padding: "16px 28px", fontWeight: 700, fontSize: "15px", cursor: "pointer" }}>
            Cargar saldo primero
          </button>
        </div>
      </section>

      {/* Steps */}
      <section style={{ padding: "0 24px 48px", maxWidth: "760px", margin: "0 auto", width: "100%" }} className="pred-body">
        <h2 className="pred-h2" style={{ color: "white", fontWeight: 800, marginBottom: "24px" }}>
          Cómo pagar el predial en Puerto Vallarta en 3 pasos
        </h2>
        <ol className="pred-ol" style={{ marginBottom: "32px" }}>
          <li><strong style={{ color: "white" }}>Recarga con efectivo en OXXO.</strong> Ve a cualquier OXXO de Puerto Vallarta, da tu número de teléfono y deposita el monto de tu predial 2026. Tu saldo PagoYa se acredita al instante.</li>
          <li><strong style={{ color: "white" }}>Ingresa tu clave catastral.</strong> Abre PagoYa, elige "Pagar servicio", selecciona Predial e ingresa tu clave catastral o número de cuenta que aparece en tu boleta anual.</li>
          <li><strong style={{ color: "white" }}>Confirma y listo.</strong> El pago se procesa en segundos. Recibes comprobante en pantalla. El Ayuntamiento de Puerto Vallarta registra el pago en su sistema.</li>
        </ol>

        {/* Feature pills */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", marginBottom: "40px" }}>
          {[
            { icon: "⚡", title: "Pago rápido", desc: "menos de 2 minutos" },
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
      <section style={{ padding: "0 24px 48px", maxWidth: "760px", margin: "0 auto", width: "100%" }} className="pred-body">
        <h2 className="pred-h2" style={{ color: "white", fontWeight: 800, marginBottom: "16px" }}>
          Para propietarios en toda Puerto Vallarta
        </h2>
        <p style={{ color: "#94A3B8", fontSize: "15px", marginBottom: "18px", lineHeight: 1.6 }}>
          Si tienes propiedad en el municipio de Puerto Vallarta, puedes pagar tu predial con PagoYa sin importar en qué colonia esté tu inmueble:
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "32px" }}>
          {colonias.map(c => (
            <span key={c} style={{ background: "rgba(29,158,117,0.12)", border: "1px solid rgba(29,158,117,0.25)", color: "#1D9E75", borderRadius: "20px", padding: "5px 14px", fontSize: "13px", fontWeight: 600 }}>{c}</span>
          ))}
        </div>
      </section>

      {/* Info table */}
      <section style={{ padding: "0 24px 48px", maxWidth: "760px", margin: "0 auto", width: "100%" }} className="pred-body">
        <h2 className="pred-h2" style={{ color: "white", fontWeight: 800, marginBottom: "20px" }}>
          Información sobre el pago predial en Puerto Vallarta 2026
        </h2>
        <div className="pred-table-wrap">
          <table className="pred-table" style={{ color: "#CBD5E1", fontSize: "14px", marginBottom: "24px" }}>
            <thead><tr><th>Detalle</th><th>Información</th></tr></thead>
            <tbody>
              <tr><td>Organismo</td><td>H. Ayuntamiento de Puerto Vallarta — Dirección de Finanzas y Catastro</td></tr>
              <tr><td>Cobertura</td><td>Todo el municipio de Puerto Vallarta, Jalisco</td></tr>
              <tr><td>Frecuencia de cobro</td><td>Anual (enero–diciembre)</td></tr>
              <tr><td>Clave catastral</td><td>Aparece en la boleta de pago predial anual. Consulta en Catastro Municipal si no la tienes</td></tr>
              <tr><td>Descuento por pronto pago</td><td>Hasta 15% en enero — va disminuyendo mes a mes</td></tr>
              <tr><td>Costo del servicio PagoYa</td><td>$25 MXN tarifa de servicio por transacción</td></tr>
            </tbody>
          </table>
        </div>

        <h2 className="pred-h2" style={{ color: "white", fontWeight: 800, marginBottom: "20px" }}>
          ¿Dónde más puedo pagar el predial en Puerto Vallarta?
        </h2>
        <div className="pred-table-wrap">
          <table className="pred-table" style={{ color: "#CBD5E1", fontSize: "14px", marginBottom: "32px" }}>
            <thead><tr><th>Opción de pago</th><th>Requiere</th><th>Observaciones</th></tr></thead>
            <tbody>
              <tr><td><strong style={{ color: "#1D9E75" }}>PagoYa (recomendado)</strong></td><td>Solo tu celular</td><td>Sin filas, desde casa</td></tr>
              <tr><td>Caja del Ayuntamiento — Av. Insurgentes 223</td><td>Ir en persona, boleta física</td><td>Horario L–V 8am–3pm</td></tr>
              <tr><td>Bancos (BBVA, Santander)</td><td>Cuenta bancaria</td><td>Comisión variable</td></tr>
              <tr><td>Portal ayuntamiento-pv.gob.mx</td><td>Tarjeta de crédito/débito</td><td>Disponibilidad variable</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ padding: "0 24px 48px", maxWidth: "760px", margin: "0 auto", width: "100%" }} className="pred-body">
        <h2 className="pred-h2" style={{ color: "white", fontWeight: 800, marginBottom: "24px" }}>
          Preguntas frecuentes — predial Puerto Vallarta 2026
        </h2>
        {[
          { q: "¿Cómo pago el predial de Puerto Vallarta 2026 sin ir al banco?", a: "Con PagoYa puedes pagar el predial de Puerto Vallarta desde tu celular. Recarga con efectivo en OXXO y paga al instante. No necesitas cuenta bancaria ni tarjeta." },
          { q: "¿Cuál es la fecha límite para pagar el predial en Puerto Vallarta 2026?", a: "El H. Ayuntamiento de Puerto Vallarta ofrece descuentos por pronto pago durante los primeros meses del año. Consulta la página del ayuntamiento para confirmar las fechas exactas de 2026." },
          { q: "¿Qué número necesito para pagar el predial en Vallarta en línea?", a: "Necesitas la clave catastral que aparece en tu boleta de pago anual. También puedes obtenerla en la Dirección de Catastro del Ayuntamiento ingresando tu dirección." },
          { q: "¿Hay descuento por pagar el predial de Vallarta antes del vencimiento?", a: "Sí. El Ayuntamiento de Puerto Vallarta otorga descuentos de hasta el 15% por pago en enero. Con PagoYa puedes pagar inmediatamente para aprovechar el descuento vigente." },
          { q: "¿Puedo pagar el predial de Puerto Vallarta si no tengo mi boleta?", a: "Sí. Consulta tu clave catastral en la Dirección de Catastro o en el portal del Ayuntamiento ingresando tu dirección. Una vez que tengas el número, lo ingresas en PagoYa y pagas." },
        ].map((item, i) => (
          <div key={i} style={{ marginBottom: "20px", borderBottom: "1px solid rgba(255,255,255,0.07)", paddingBottom: "20px" }}>
            <p style={{ color: "white", fontWeight: 700, fontSize: "16px", marginBottom: "8px" }}>❓ {item.q}</p>
            <p style={{ color: "#94A3B8", lineHeight: 1.7, fontSize: "15px" }}>{item.a}</p>
          </div>
        ))}
      </section>

      {/* Final CTA */}
      <section style={{ padding: "0 24px 80px", maxWidth: "760px", margin: "0 auto", width: "100%", textAlign: "center" }} className="pred-body">
        <div style={{ background: "linear-gradient(135deg, rgba(29,158,117,0.15), rgba(29,158,117,0.05))", border: "1px solid rgba(29,158,117,0.3)", borderRadius: "24px", padding: "40px 24px" }}>
          <p style={{ fontSize: "32px", marginBottom: "12px" }}>🏠</p>
          <h2 style={{ color: "white", fontWeight: 900, fontSize: "22px", marginBottom: "10px" }}>Paga tu predial 2026 ahora mismo</h2>
          <p style={{ color: "#94A3B8", fontSize: "15px", marginBottom: "28px", lineHeight: 1.6 }}>Sin banco, sin tarjeta, sin filas.<br />Solo tu celular y efectivo en OXXO.</p>
          <button onClick={() => navigate("/pagar")} style={{ background: "linear-gradient(135deg, #1D9E75, #25C090)", color: "white", border: "none", borderRadius: "50px", padding: "16px 36px", fontWeight: 800, fontSize: "16px", cursor: "pointer", boxShadow: "0 8px 24px rgba(29,158,117,0.4)" }}>
            Pagar mi predial →
          </button>
        </div>
      </section>
    </div>
  );
}
