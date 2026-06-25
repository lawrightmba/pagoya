import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useLocation } from "wouter";

export default function PagarInternetVallarta() {
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
      { "@type": "ListItem", position: 3, name: "Pagar Internet Puerto Vallarta", item: "https://pagoyamx.com/pagar-internet-vallarta" },
    ],
  };

  const article = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "Cómo pagar Telmex, Izzi o Totalplay en Puerto Vallarta sin banco",
    description: "Paga tu recibo de internet Telmex, Izzi o Totalplay en Puerto Vallarta desde tu celular. Sin cuenta bancaria, sin tarjeta, sin filas. Solo efectivo en OXXO.",
    url: "https://pagoyamx.com/pagar-internet-vallarta",
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
        name: "¿Cómo pago Telmex en Puerto Vallarta sin ir al banco?",
        acceptedAnswer: { "@type": "Answer", text: "Con PagoYa pagas tu recibo de Telmex en Puerto Vallarta desde tu celular en menos de 2 minutos. Recarga con efectivo en OXXO y paga al instante. No necesitas cuenta bancaria ni tarjeta." },
      },
      {
        "@type": "Question",
        name: "¿Puedo pagar Izzi en Vallarta sin tarjeta de crédito?",
        acceptedAnswer: { "@type": "Answer", text: "Sí. Con PagoYa pagas tu recibo de Izzi en Puerto Vallarta usando solo efectivo en OXXO. Recarga tu billetera PagoYa en cualquier tienda y paga tu internet desde el celular." },
      },
      {
        "@type": "Question",
        name: "¿Qué número necesito para pagar Telmex o Izzi en línea?",
        acceptedAnswer: { "@type": "Answer", text: "Para Telmex necesitas el número de cuenta (10 dígitos) que aparece en tu estado de cuenta mensual. Para Izzi necesitas el número de contrato que aparece en la parte superior de tu recibo." },
      },
      {
        "@type": "Question",
        name: "¿Cuánto tarda en reflejarse el pago de internet en Puerto Vallarta?",
        acceptedAnswer: { "@type": "Answer", text: "El pago con PagoYa se procesa en segundos y recibes comprobante inmediato. Telmex e Izzi actualizan el saldo de tu contrato en un plazo de 24 a 48 horas hábiles." },
      },
      {
        "@type": "Question",
        name: "¿PagoYa sirve también para Totalplay en Vallarta?",
        acceptedAnswer: { "@type": "Answer", text: "Sí. PagoYa soporta pagos de Telmex, Izzi y Totalplay. Solo ingresa el nombre del proveedor y tu número de contrato o cuenta al hacer el pago." },
      },
    ],
  };

  const colonias = ["Emiliano Zapata", "Versalles", "5 de Diciembre", "Pitillal", "Fluvial Vallarta", "Zona Romántica", "Marina Vallarta", "Ixtapa", "El Pitillal", "Las Juntas"];

  return (
    <div style={{ background: "#0A2540", minHeight: "100vh", display: "flex", flexDirection: "column", overflowX: "hidden" }}>
      <Helmet>
        <html lang="es-MX" />
        <title>Pagar Telmex Izzi Vallarta Sin Banco 2026 | PagoYa</title>
        <meta name="description" content="Paga tu recibo de internet Telmex, Izzi o Totalplay en Puerto Vallarta desde tu celular en 2 minutos. Sin banco, sin tarjeta. Efectivo en OXXO con PagoYa." />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://pagoyamx.com/pagar-internet-vallarta" />
        <link rel="alternate" hrefLang="es-MX" href="https://pagoyamx.com/pagar-internet-vallarta" />
        <link rel="alternate" hrefLang="x-default" href="https://pagoyamx.com/pagar-internet-vallarta" />
        <meta name="geo.region" content="MX-JAL" />
        <meta name="geo.placename" content="Puerto Vallarta, Jalisco" />
        <meta property="og:title" content="Pagar Telmex Izzi Puerto Vallarta Sin Banco | PagoYa" />
        <meta property="og:description" content="Paga tu internet Telmex, Izzi o Totalplay en Puerto Vallarta desde tu celular. Sin banco ni tarjeta. Efectivo en OXXO con PagoYa." />
        <meta property="og:image" content="https://pagoyamx.com/og-default.png" />
        <meta property="og:type" content="article" />
        <meta property="og:url" content="https://pagoyamx.com/pagar-internet-vallarta" />
        <script type="application/ld+json">{JSON.stringify(breadcrumb)}</script>
        <script type="application/ld+json">{JSON.stringify(article)}</script>
        <script type="application/ld+json">{JSON.stringify(faq)}</script>
      </Helmet>

      <style>{`
        .pvi-body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
        .pvi-h1 { font-size: clamp(26px, 5vw, 42px); }
        .pvi-h2 { font-size: clamp(20px, 3.5vw, 28px); }
        .pvi-table { width: 100%; border-collapse: collapse; }
        .pvi-table th, .pvi-table td { padding: 10px 14px; border: 1px solid rgba(255,255,255,0.12); text-align: left; vertical-align: top; }
        .pvi-table th { background: rgba(29,158,117,0.18); color: #1D9E75; font-weight: 700; }
        .pvi-table tr:nth-child(even) td { background: rgba(255,255,255,0.03); }
        .pvi-ol { padding-left: 20px; }
        .pvi-ol li { margin-bottom: 10px; line-height: 1.6; color: #CBD5E1; }
        @media(max-width:640px){ .pvi-table-wrap { overflow-x: auto; } .pvi-body { padding: 0 16px 48px; } }
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
          <p style={{ color: "white", fontWeight: 700, fontSize: "14px", margin: 0 }}>📶 Paga tu internet ahora</p>
          <button onClick={() => navigate("/pagar")} style={{ background: "linear-gradient(135deg, #1D9E75, #25C090)", color: "white", border: "none", borderRadius: "20px", padding: "10px 22px", fontWeight: 800, fontSize: "14px", cursor: "pointer" }}>
            Pagar →
          </button>
        </div>
      )}

      {/* Hero */}
      <section style={{ padding: "56px 24px 40px", maxWidth: "760px", margin: "0 auto", width: "100%" }} className="pvi-body">
        <p style={{ color: "#1D9E75", fontWeight: 700, fontSize: "13px", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "12px" }}>
          📶 Internet · Puerto Vallarta, Jalisco
        </p>
        <h1 className="pvi-h1" style={{ color: "white", fontWeight: 900, lineHeight: 1.2, marginBottom: "20px" }}>
          Pagar Telmex, Izzi o Totalplay<br />
          <span style={{ color: "#1D9E75" }}>en Vallarta sin banco ni tarjeta</span>
        </h1>
        <p style={{ color: "#94A3B8", fontSize: "18px", lineHeight: 1.7, marginBottom: "32px", maxWidth: "600px" }}>
          Paga tu recibo de internet o cable en Puerto Vallarta desde tu celular en menos de 2 minutos. Carga saldo con efectivo en cualquier OXXO y paga <strong style={{ color: "white" }}>Telmex, Izzi, Totalplay y más</strong> al instante.
        </p>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <button onClick={() => navigate("/pagar")} style={{ background: "linear-gradient(135deg, #1D9E75, #25C090)", color: "white", border: "none", borderRadius: "50px", padding: "16px 32px", fontWeight: 800, fontSize: "16px", cursor: "pointer", boxShadow: "0 8px 24px rgba(29,158,117,0.4)" }}>
            Pagar internet ahora →
          </button>
          <button onClick={() => navigate("/cargar")} style={{ background: "rgba(255,255,255,0.08)", color: "white", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "50px", padding: "16px 28px", fontWeight: 700, fontSize: "15px", cursor: "pointer" }}>
            Cargar saldo primero
          </button>
        </div>
      </section>

      {/* Steps */}
      <section style={{ padding: "0 24px 48px", maxWidth: "760px", margin: "0 auto", width: "100%" }} className="pvi-body">
        <h2 className="pvi-h2" style={{ color: "white", fontWeight: 800, marginBottom: "24px" }}>
          Cómo pagar internet en Puerto Vallarta en 3 pasos
        </h2>
        <ol className="pvi-ol" style={{ marginBottom: "32px" }}>
          <li><strong style={{ color: "white" }}>Recarga con efectivo en OXXO.</strong> Ve a cualquier OXXO en Puerto Vallarta. Da tu número de teléfono y deposita el monto de tu recibo de internet. Tu saldo PagoYa se acredita al instante.</li>
          <li><strong style={{ color: "white" }}>Selecciona tu proveedor e ingresa tu número de cuenta.</strong> Abre PagoYa, elige "Pagar servicio", selecciona Telmex, Izzi o Totalplay e ingresa el número de contrato o cuenta de tu recibo mensual.</li>
          <li><strong style={{ color: "white" }}>Confirma y listo.</strong> El pago se procesa en segundos. Recibes comprobante en pantalla. Tu proveedor registra el pago en 24–48 h hábiles.</li>
        </ol>

        {/* Feature pills */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", marginBottom: "40px" }}>
          {[
            { icon: "📶", title: "Telmex + Izzi", desc: "y más proveedores" },
            { icon: "⚡", title: "2 minutos", desc: "de principio a fin" },
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

      {/* Proveedores */}
      <section style={{ padding: "0 24px 48px", maxWidth: "760px", margin: "0 auto", width: "100%" }} className="pvi-body">
        <h2 className="pvi-h2" style={{ color: "white", fontWeight: 800, marginBottom: "20px" }}>
          Proveedores disponibles en Puerto Vallarta
        </h2>
        <div className="pvi-table-wrap">
          <table className="pvi-table" style={{ color: "#CBD5E1", fontSize: "14px", marginBottom: "24px" }}>
            <thead><tr><th>Proveedor</th><th>Dato que necesitas</th><th>Frecuencia de cobro</th></tr></thead>
            <tbody>
              <tr><td><strong>Telmex</strong></td><td>Número de cuenta (10 dígitos) en tu estado de cuenta</td><td>Mensual</td></tr>
              <tr><td><strong>Izzi</strong></td><td>Número de contrato en la parte superior del recibo</td><td>Mensual</td></tr>
              <tr><td><strong>Totalplay</strong></td><td>Número de cuenta en tu recibo mensual</td><td>Mensual</td></tr>
              <tr><td><strong>Sky</strong></td><td>Número de chip o contrato</td><td>Mensual</td></tr>
            </tbody>
          </table>
        </div>

        {/* Colonias trust strip */}
        <h2 className="pvi-h2" style={{ color: "white", fontWeight: 800, marginBottom: "16px", marginTop: "32px" }}>
          Disponible en toda Puerto Vallarta
        </h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "32px" }}>
          {colonias.map(c => (
            <span key={c} style={{ background: "rgba(29,158,117,0.12)", border: "1px solid rgba(29,158,117,0.25)", color: "#1D9E75", borderRadius: "20px", padding: "5px 14px", fontSize: "13px", fontWeight: 600 }}>{c}</span>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section style={{ padding: "0 24px 48px", maxWidth: "760px", margin: "0 auto", width: "100%" }} className="pvi-body">
        <h2 className="pvi-h2" style={{ color: "white", fontWeight: 800, marginBottom: "24px" }}>
          Preguntas frecuentes — pagar internet en Vallarta
        </h2>
        {[
          { q: "¿Cómo pago Telmex en Puerto Vallarta sin ir al banco?", a: "Con PagoYa pagas tu recibo de Telmex en Puerto Vallarta desde tu celular en menos de 2 minutos. Recarga con efectivo en OXXO y paga al instante. No necesitas cuenta bancaria ni tarjeta." },
          { q: "¿Puedo pagar Izzi en Vallarta sin tarjeta de crédito?", a: "Sí. Con PagoYa pagas tu recibo de Izzi usando solo efectivo en OXXO. Recarga tu billetera PagoYa en cualquier tienda y paga tu internet desde el celular." },
          { q: "¿Qué número necesito para pagar Telmex o Izzi en línea?", a: "Para Telmex necesitas el número de cuenta (10 dígitos) de tu estado de cuenta mensual. Para Izzi necesitas el número de contrato en la parte superior de tu recibo." },
          { q: "¿Cuánto tarda en reflejarse el pago de internet en Puerto Vallarta?", a: "El pago con PagoYa se procesa en segundos y recibes comprobante inmediato. Telmex e Izzi actualizan el saldo de tu contrato en 24 a 48 horas hábiles." },
          { q: "¿PagoYa sirve también para Totalplay en Vallarta?", a: "Sí. PagoYa soporta pagos de Telmex, Izzi, Totalplay y Sky. Solo ingresa el nombre del proveedor y tu número de contrato o cuenta al hacer el pago." },
        ].map((item, i) => (
          <div key={i} style={{ marginBottom: "20px", borderBottom: "1px solid rgba(255,255,255,0.07)", paddingBottom: "20px" }}>
            <p style={{ color: "white", fontWeight: 700, fontSize: "16px", marginBottom: "8px" }}>❓ {item.q}</p>
            <p style={{ color: "#94A3B8", lineHeight: 1.7, fontSize: "15px" }}>{item.a}</p>
          </div>
        ))}
      </section>

      {/* Final CTA */}
      <section style={{ padding: "0 24px 80px", maxWidth: "760px", margin: "0 auto", width: "100%", textAlign: "center" }} className="pvi-body">
        <div style={{ background: "linear-gradient(135deg, rgba(29,158,117,0.15), rgba(29,158,117,0.05))", border: "1px solid rgba(29,158,117,0.3)", borderRadius: "24px", padding: "40px 24px" }}>
          <p style={{ fontSize: "32px", marginBottom: "12px" }}>📶</p>
          <h2 style={{ color: "white", fontWeight: 900, fontSize: "22px", marginBottom: "10px" }}>Paga tu internet ahora mismo</h2>
          <p style={{ color: "#94A3B8", fontSize: "15px", marginBottom: "28px", lineHeight: 1.6 }}>Sin banco, sin tarjeta, sin filas.<br />Solo tu celular y efectivo en OXXO.</p>
          <button onClick={() => navigate("/pagar")} style={{ background: "linear-gradient(135deg, #1D9E75, #25C090)", color: "white", border: "none", borderRadius: "50px", padding: "16px 36px", fontWeight: 800, fontSize: "16px", cursor: "pointer", boxShadow: "0 8px 24px rgba(29,158,117,0.4)" }}>
            Pagar mi internet →
          </button>
        </div>
      </section>
    </div>
  );
}
