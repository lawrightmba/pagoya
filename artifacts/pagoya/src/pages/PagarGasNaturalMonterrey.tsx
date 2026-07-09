import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useLocation } from "wouter";

export default function PagarGasNaturalMonterrey() {
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
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Inicio", "item": "https://pagoyamx.com/" },
      { "@type": "ListItem", "position": 2, "name": "Pagar servicios en Monterrey", "item": "https://pagoyamx.com/pagar-servicios-monterrey" },
      { "@type": "ListItem", "position": 3, "name": "Pagar gas natural Naturgy Monterrey", "item": "https://pagoyamx.com/pagar-gas-natural-monterrey" }
    ]
  };

  const article = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "Cómo pagar tu recibo de gas natural Naturgy en Monterrey sin banco",
    "description": "Paga tu recibo de gas natural Naturgy en Monterrey desde tu celular en 2 minutos. Sin banco, sin tarjeta. Carga con efectivo en OXXO y paga al instante con PagoYa.",
    "url": "https://pagoyamx.com/pagar-gas-natural-monterrey",
    "datePublished": "2026-07-09",
    "publisher": { "@type": "Organization", "name": "PagoYa", "url": "https://pagoyamx.com" },
    "inLanguage": "es-MX"
  };

  const faq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "¿Cómo pago el gas natural Naturgy en Monterrey sin ir al banco?",
        "acceptedAnswer": { "@type": "Answer", "text": "Con PagoYa pagas tu recibo de gas natural Naturgy desde tu celular en menos de 2 minutos. Recarga tu billetera con efectivo en cualquier OXXO de Monterrey o Nuevo León y paga al instante. No necesitas cuenta bancaria ni tarjeta." }
      },
      {
        "@type": "Question",
        "name": "¿Qué número necesito para pagar mi recibo de Naturgy?",
        "acceptedAnswer": { "@type": "Answer", "text": "Necesitas el número de contrato o cuenta que aparece en tu recibo de gas natural Naturgy. Con ese dato puedes pagar directamente en la app PagoYa." }
      },
      {
        "@type": "Question",
        "name": "¿Cuánto cobra PagoYa por pagar el gas natural?",
        "acceptedAnswer": { "@type": "Answer", "text": "PagoYa cobra una tarifa de servicio fija de $25 MXN por transacción. Sin cargos por porcentaje ni costos ocultos." }
      },
      {
        "@type": "Question",
        "name": "¿Cuánto tarda en procesarse el pago de Naturgy?",
        "acceptedAnswer": { "@type": "Answer", "text": "El pago se procesa en segundos. Recibes tu comprobante de inmediato y el proveedor registra el pago en un plazo de 24 a 48 horas hábiles." }
      },
      {
        "@type": "Question",
        "name": "¿Dónde recargo saldo para pagar mi gas natural?",
        "acceptedAnswer": { "@type": "Answer", "text": "Puedes recargar tu billetera PagoYa con efectivo en cualquier OXXO de Monterrey, Nuevo León y todo México. El saldo se acredita al instante y luego pagas tu recibo Naturgy." }
      }
    ]
  };

  return (
    <div style={{ background: "#0A2540", minHeight: "100vh", display: "flex", flexDirection: "column", overflowX: "hidden" }}>
      <Helmet>
        <html lang="es-MX" />
        <title>Pagar Gas Natural Naturgy Monterrey Sin Banco | PagoYa</title>
        <meta name="description" content="Paga tu recibo de gas natural Naturgy en Monterrey desde tu celular en 2 minutos. Sin banco, sin tarjeta. Carga con efectivo en OXXO y paga al instante con PagoYa." />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://pagoyamx.com/pagar-gas-natural-monterrey" />
        <link rel="alternate" hrefLang="es-MX" href="https://pagoyamx.com/pagar-gas-natural-monterrey" />
        <link rel="alternate" hrefLang="x-default" href="https://pagoyamx.com/pagar-gas-natural-monterrey" />
        <meta name="geo.region" content="MX-NL" />
        <meta name="geo.placename" content="Monterrey, Nuevo León" />
        <meta property="og:title" content="Pagar Gas Natural Naturgy Monterrey Sin Banco | PagoYa" />
        <meta property="og:description" content="Paga tu recibo de gas natural Naturgy Monterrey desde tu celular. Sin banco ni tarjeta. Efectivo en OXXO con PagoYa." />
        <meta property="og:image" content="https://pagoyamx.com/og-default.png" />
        <meta property="og:type" content="article" />
        <meta property="og:url" content="https://pagoyamx.com/pagar-gas-natural-monterrey" />
        <script type="application/ld+json">{JSON.stringify(breadcrumb)}</script>
        <script type="application/ld+json">{JSON.stringify(article)}</script>
        <script type="application/ld+json">{JSON.stringify(faq)}</script>
      </Helmet>

      <style>{`
        .mty-body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
        .mty-body a { color: #1D9E75; text-decoration: underline; }
        .mty-h1 { font-size: clamp(26px, 5vw, 42px); }
        .mty-h2 { font-size: clamp(20px, 3.5vw, 28px); }
        .mty-table { width: 100%; border-collapse: collapse; }
        .mty-table th, .mty-table td { padding: 10px 14px; border: 1px solid rgba(255,255,255,0.12); text-align: left; vertical-align: top; }
        .mty-table th { background: rgba(29,158,117,0.18); color: #1D9E75; font-weight: 700; }
        .mty-table tr:nth-child(even) td { background: rgba(255,255,255,0.03); }
        .mty-ol { padding-left: 20px; }
        .mty-ol li { margin-bottom: 10px; line-height: 1.6; color: #CBD5E1; }
        .mty-ul { list-style: disc; padding-left: 22px; }
        .mty-ul li { margin-bottom: 6px; line-height: 1.6; color: #CBD5E1; }
        @media(max-width:640px){ .mty-table-wrap { overflow-x: auto; } .mty-body { padding: 0 16px 48px; } }
      `}</style>

      {/* Nav */}
      <nav style={{ background: "rgba(10,37,64,0.95)", borderBottom: "1px solid rgba(255,255,255,0.08)", padding: "14px 24px", display: "flex", alignItems: "center", gap: "12px", position: "sticky", top: 0, zIndex: 50, backdropFilter: "blur(8px)" }}>
        <button onClick={() => navigate("/")} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
          <img src="/pagoya-logo.png" alt="PagoYa" style={{ height: "32px" }} />
        </button>
        <span style={{ flex: 1 }} />
        <button
          onClick={() => navigate("/pagar")}
          style={{ background: "#1D9E75", color: "white", border: "none", borderRadius: "20px", padding: "8px 18px", fontWeight: 700, fontSize: "14px", cursor: "pointer" }}
        >
          Pagar ahora
        </button>
      </nav>

      {/* Sticky bottom CTA */}
      {showSticky && (
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100, background: "rgba(10,37,64,0.97)", borderTop: "1px solid rgba(29,158,117,0.4)", padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", backdropFilter: "blur(10px)" }}>
          <p style={{ color: "white", fontWeight: 700, fontSize: "14px", margin: 0 }}>🔥 Paga tu gas Naturgy ahora</p>
          <button onClick={() => navigate("/pagar")} style={{ background: "linear-gradient(135deg, #1D9E75, #25C090)", color: "white", border: "none", borderRadius: "20px", padding: "10px 22px", fontWeight: 800, fontSize: "14px", cursor: "pointer" }}>
            Pagar Naturgy →
          </button>
        </div>
      )}

      {/* Hero */}
      <section style={{ padding: "56px 24px 40px", maxWidth: "760px", margin: "0 auto", width: "100%" }} className="mty-body">
        <p style={{ color: "#1D9E75", fontWeight: 700, fontSize: "13px", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "12px" }}>
          🔥 Gas natural Naturgy · Monterrey, Nuevo León
        </p>
        <h1 className="mty-h1" style={{ color: "white", fontWeight: 900, lineHeight: 1.2, marginBottom: "20px" }}>
          Pagar gas natural Naturgy Monterrey<br />
          <span style={{ color: "#1D9E75" }}>sin banco, sin filas, sin tarjeta</span>
        </h1>
        <p style={{ color: "#94A3B8", fontSize: "18px", lineHeight: 1.7, marginBottom: "32px", maxWidth: "600px" }}>
          Paga tu recibo de <strong style={{ color: "white" }}>gas natural Naturgy</strong> en el área metropolitana de Monterrey desde tu celular en menos de 2 minutos. Carga saldo con efectivo en cualquier OXXO y paga al instante.
        </p>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <button
            onClick={() => navigate("/pagar")}
            style={{ background: "linear-gradient(135deg, #1D9E75, #25C090)", color: "white", border: "none", borderRadius: "50px", padding: "16px 32px", fontWeight: 800, fontSize: "16px", cursor: "pointer", boxShadow: "0 8px 24px rgba(29,158,117,0.4)" }}
          >
            Pagar Naturgy ahora →
          </button>
          <button
            onClick={() => navigate("/cargar")}
            style={{ background: "rgba(255,255,255,0.08)", color: "white", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "50px", padding: "16px 28px", fontWeight: 700, fontSize: "15px", cursor: "pointer" }}
          >
            Cargar saldo primero
          </button>
        </div>
      </section>

      {/* Steps */}
      <section style={{ padding: "0 24px 48px", maxWidth: "760px", margin: "0 auto", width: "100%" }} className="mty-body">
        <h2 className="mty-h2" style={{ color: "white", fontWeight: 800, marginBottom: "24px" }}>
          Cómo pagar el gas natural en Monterrey en 3 pasos
        </h2>
        <ol className="mty-ol" style={{ marginBottom: "32px" }}>
          <li><strong style={{ color: "white" }}>Recarga con efectivo en OXXO.</strong> Ve a cualquier OXXO de Monterrey o Nuevo León, da tu número de teléfono y deposita el monto de tu recibo Naturgy. Tu saldo PagoYa se acredita al instante.</li>
          <li><strong style={{ color: "white" }}>Ingresa tu número de contrato Naturgy.</strong> Abre PagoYa, elige "Pagar servicio", selecciona Gas natural (Naturgy) e ingresa el número de contrato de tu recibo.</li>
          <li><strong style={{ color: "white" }}>Confirma y listo.</strong> El pago se procesa en segundos. Recibes comprobante en pantalla. El proveedor registra el pago en 24–48 h hábiles.</li>
        </ol>

        {/* Feature pills */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", marginBottom: "40px" }}>
          {[
            { icon: "⚡", title: "2 minutos", desc: "de principio a fin" },
            { icon: "🏪", title: "+19,000 OXXO", desc: "en Nuevo León y todo México" },
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

      {/* Info table */}
      <section style={{ padding: "0 24px 48px", maxWidth: "760px", margin: "0 auto", width: "100%" }} className="mty-body">
        <h2 className="mty-h2" style={{ color: "white", fontWeight: 800, marginBottom: "20px" }}>
          Información sobre el pago de gas natural Naturgy
        </h2>
        <div className="mty-table-wrap">
          <table className="mty-table" style={{ color: "#CBD5E1", fontSize: "14px", marginBottom: "24px" }}>
            <thead>
              <tr>
                <th>Detalle</th>
                <th>Información</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>Proveedor</td><td>Naturgy (gas natural)</td></tr>
              <tr><td>Cobertura</td><td>Área metropolitana de Monterrey y municipios de Nuevo León con red de gas natural</td></tr>
              <tr><td>Número de contrato</td><td>Aparece en tu recibo de gas natural Naturgy</td></tr>
              <tr><td>Métodos de saldo</td><td>Efectivo en OXXO · sin tarjeta ni cuenta bancaria</td></tr>
              <tr><td>Costo del servicio PagoYa</td><td>$25 MXN tarifa de servicio por transacción</td></tr>
              <tr><td>Tiempo de acreditación</td><td>Pago instantáneo · el proveedor registra en 24–48 h hábiles</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ padding: "0 24px 48px", maxWidth: "760px", margin: "0 auto", width: "100%" }} className="mty-body">
        <h2 className="mty-h2" style={{ color: "white", fontWeight: 800, marginBottom: "24px" }}>
          Preguntas frecuentes — pago gas natural Naturgy
        </h2>
        {[
          { q: "¿Cómo pago el gas natural Naturgy en Monterrey sin ir al banco?", a: "Con PagoYa pagas tu recibo de gas natural Naturgy desde tu celular en menos de 2 minutos. Recarga tu billetera con efectivo en cualquier OXXO de Monterrey o Nuevo León y paga al instante. No necesitas cuenta bancaria ni tarjeta." },
          { q: "¿Qué número necesito para pagar mi recibo de Naturgy?", a: "Necesitas el número de contrato o cuenta que aparece en tu recibo de gas natural Naturgy. Con ese dato puedes pagar directamente en la app PagoYa." },
          { q: "¿Cuánto cobra PagoYa por pagar el gas natural?", a: "PagoYa cobra una tarifa de servicio fija de $25 MXN por transacción. Sin cargos por porcentaje ni costos ocultos." },
          { q: "¿Cuánto tarda en procesarse el pago de Naturgy?", a: "El pago se procesa en segundos. Recibes tu comprobante de inmediato y el proveedor registra el pago en un plazo de 24 a 48 horas hábiles." },
          { q: "¿Dónde recargo saldo para pagar mi gas natural?", a: "Puedes recargar tu billetera PagoYa con efectivo en cualquier OXXO de Monterrey, Nuevo León y todo México. El saldo se acredita al instante y luego pagas tu recibo Naturgy." },
        ].map((item, i) => (
          <div key={i} style={{ marginBottom: "20px", borderBottom: "1px solid rgba(255,255,255,0.07)", paddingBottom: "20px" }}>
            <p style={{ color: "white", fontWeight: 700, fontSize: "16px", marginBottom: "8px" }}>❓ {item.q}</p>
            <p style={{ color: "#94A3B8", lineHeight: 1.7, fontSize: "15px" }}>{item.a}</p>
          </div>
        ))}
      </section>

      {/* Más servicios en Monterrey */}
      <section style={{ padding: "0 24px 40px", maxWidth: "760px", margin: "0 auto", width: "100%" }} className="mty-body">
        <h2 className="mty-h2" style={{ color: "white", fontWeight: 800, marginBottom: "16px" }}>Más servicios en Monterrey</h2>
        <ul className="mty-ul">
          <li><a href="/pagar-servicios-monterrey">Pagar servicios en Monterrey (agua, luz, gas)</a></li>
          <li><a href="/pagar-agua-monterrey">Pagar agua SADM sin banco</a></li>
          <li><a href="/pagar-cfe-monterrey">Pagar CFE Monterrey</a></li>
        </ul>
      </section>

      {/* Final CTA */}
      <section style={{ padding: "0 24px 64px", maxWidth: "760px", margin: "0 auto", width: "100%", textAlign: "center" }} className="mty-body">
        <div style={{ background: "linear-gradient(135deg, rgba(29,158,117,0.15), rgba(29,158,117,0.05))", border: "1px solid rgba(29,158,117,0.3)", borderRadius: "24px", padding: "40px 24px" }}>
          <p style={{ fontSize: "32px", marginBottom: "12px" }}>🔥</p>
          <h2 style={{ color: "white", fontWeight: 900, fontSize: "22px", marginBottom: "10px" }}>
            Paga tu gas natural Naturgy ahora
          </h2>
          <p style={{ color: "#94A3B8", fontSize: "15px", marginBottom: "28px", lineHeight: 1.6 }}>
            Sin banco, sin tarjeta, sin filas.<br />Solo tu celular y efectivo en OXXO.
          </p>
          <button
            onClick={() => navigate("/pagar")}
            style={{ background: "linear-gradient(135deg, #1D9E75, #25C090)", color: "white", border: "none", borderRadius: "50px", padding: "16px 36px", fontWeight: 800, fontSize: "16px", cursor: "pointer", boxShadow: "0 8px 24px rgba(29,158,117,0.4)" }}
          >
            Pagar mi Naturgy →
          </button>
        </div>
      </section>
    </div>
  );
}
