import { Helmet } from "react-helmet-async";
import { useLocation } from "wouter";

export default function PagarAguaCdmx() {
  const [, navigate] = useLocation();

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Inicio", "item": "https://pagoyamx.com/" },
      { "@type": "ListItem", "position": 2, "name": "Pagar servicios", "item": "https://pagoyamx.com/guia-pagar-servicios-sin-cuenta-bancaria" },
      { "@type": "ListItem", "position": 3, "name": "Pagar agua SACMEX CDMX", "item": "https://pagoyamx.com/pagar-agua-cdmx" }
    ]
  };

  const article = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "Cómo pagar el agua SACMEX en la CDMX sin ir al banco",
    "description": "Paga tu recibo de agua SACMEX en la Ciudad de México desde tu celular. Sin cuenta bancaria, sin tarjeta, sin filas. Solo efectivo en OXXO con PagoYa.",
    "url": "https://pagoyamx.com/pagar-agua-cdmx",
    "datePublished": "2026-06-01",
    "publisher": { "@type": "Organization", "name": "PagoYa", "url": "https://pagoyamx.com" },
    "inLanguage": "es-MX"
  };

  const faq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "¿Cómo pago el agua SACMEX sin ir al banco?",
        "acceptedAnswer": { "@type": "Answer", "text": "Con PagoYa pagas tu recibo de agua SACMEX desde tu celular en menos de 2 minutos. Recarga tu billetera con efectivo en cualquier OXXO de la CDMX o área metropolitana y paga al instante. No necesitas cuenta bancaria ni tarjeta." }
      },
      {
        "@type": "Question",
        "name": "¿Dónde puedo pagar el agua de la CDMX en línea?",
        "acceptedAnswer": { "@type": "Answer", "text": "Puedes pagar el agua SACMEX en línea con PagoYa sin necesidad de tarjeta ni cuenta bancaria. También puedes pagar en el portal sacmex.cdmx.gob.mx con tarjeta, o en bancos y tiendas de conveniencia con el recibo físico." }
      },
      {
        "@type": "Question",
        "name": "¿Qué número necesito para pagar el agua SACMEX?",
        "acceptedAnswer": { "@type": "Answer", "text": "Necesitas el número de cuenta de servicio SACMEX que aparece en tu recibo bimestral. Es un número de 8 a 10 dígitos que puedes encontrar en la parte superior del recibo o en el portal sacmex.cdmx.gob.mx." }
      },
      {
        "@type": "Question",
        "name": "¿Puedo pagar el agua SACMEX sin mi recibo físico?",
        "acceptedAnswer": { "@type": "Answer", "text": "Sí. Con PagoYa puedes pagar tu agua SACMEX usando solo el número de cuenta, sin necesitar el recibo físico en mano. El número de cuenta no cambia entre bimestres." }
      },
      {
        "@type": "Question",
        "name": "¿Cuánto tarda en registrarse el pago de agua en la CDMX?",
        "acceptedAnswer": { "@type": "Answer", "text": "El pago en PagoYa se procesa en segundos. Recibes un comprobante de pago de inmediato. SACMEX actualiza el estado de tu cuenta en un plazo de 24 a 72 horas hábiles." }
      }
    ]
  };

  return (
    <div style={{ background: "#0A2540", minHeight: "100vh", display: "flex", flexDirection: "column", overflowX: "hidden" }}>
      <Helmet>
        <html lang="es-MX" />
        <title>Pagar Agua SACMEX CDMX Sin Banco | PagoYa</title>
        <meta name="description" content="Paga tu recibo de agua SACMEX en la Ciudad de México desde tu celular en 2 minutos. Sin banco, sin tarjeta, sin filas. Solo efectivo en OXXO con PagoYa." />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://pagoyamx.com/pagar-agua-cdmx" />
        <link rel="alternate" hreflang="es-MX" href="https://pagoyamx.com/pagar-agua-cdmx" />
        <link rel="alternate" hreflang="x-default" href="https://pagoyamx.com/pagar-agua-cdmx" />
        <meta name="geo.region" content="MX-CMX" />
        <meta name="geo.placename" content="Ciudad de México, CDMX" />
        <meta property="og:title" content="Pagar Agua SACMEX CDMX Sin Banco | PagoYa" />
        <meta property="og:description" content="Paga tu recibo de agua SACMEX en la CDMX sin banco ni tarjeta. Solo efectivo en OXXO con PagoYa." />
        <meta property="og:type" content="article" />
        <meta property="og:url" content="https://pagoyamx.com/pagar-agua-cdmx" />
        <script type="application/ld+json">{JSON.stringify(breadcrumb)}</script>
        <script type="application/ld+json">{JSON.stringify(article)}</script>
        <script type="application/ld+json">{JSON.stringify(faq)}</script>
      </Helmet>

      <style>{`
        .cdmx-body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
        .cdmx-body a { color: #1D9E75; text-decoration: underline; }
        .cdmx-h1 { font-size: clamp(26px, 5vw, 42px); }
        .cdmx-h2 { font-size: clamp(20px, 3.5vw, 28px); }
        .cdmx-table { width: 100%; border-collapse: collapse; }
        .cdmx-table th, .cdmx-table td { padding: 10px 14px; border: 1px solid rgba(255,255,255,0.12); text-align: left; vertical-align: top; }
        .cdmx-table th { background: rgba(29,158,117,0.18); color: #1D9E75; font-weight: 700; }
        .cdmx-table tr:nth-child(even) td { background: rgba(255,255,255,0.03); }
        .cdmx-ol { padding-left: 20px; }
        .cdmx-ol li { margin-bottom: 10px; line-height: 1.6; color: #CBD5E1; }
        .cdmx-ul { list-style: disc; padding-left: 22px; }
        .cdmx-ul li { margin-bottom: 6px; line-height: 1.6; color: #CBD5E1; }
        @media(max-width:640px){ .cdmx-table-wrap { overflow-x: auto; } .cdmx-body { padding: 0 16px 48px; } }
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

      {/* Hero */}
      <section style={{ padding: "56px 24px 40px", maxWidth: "760px", margin: "0 auto", width: "100%" }} className="cdmx-body">
        <p style={{ color: "#1D9E75", fontWeight: 700, fontSize: "13px", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "12px" }}>
          💧 SACMEX · Ciudad de México (CDMX)
        </p>
        <h1 className="cdmx-h1" style={{ color: "white", fontWeight: 900, lineHeight: 1.2, marginBottom: "20px" }}>
          Pagar agua SACMEX CDMX<br />
          <span style={{ color: "#1D9E75" }}>sin banco, sin filas, sin tarjeta</span>
        </h1>
        <p style={{ color: "#94A3B8", fontSize: "18px", lineHeight: 1.7, marginBottom: "32px", maxWidth: "600px" }}>
          Paga tu recibo de agua del <strong style={{ color: "white" }}>Sistema de Aguas de la Ciudad de México (SACMEX)</strong> desde tu celular en menos de 2 minutos. Carga saldo con efectivo en OXXO y paga al instante.
        </p>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <button
            onClick={() => navigate("/pagar")}
            style={{ background: "linear-gradient(135deg, #1D9E75, #25C090)", color: "white", border: "none", borderRadius: "50px", padding: "16px 32px", fontWeight: 800, fontSize: "16px", cursor: "pointer", boxShadow: "0 8px 24px rgba(29,158,117,0.4)" }}
          >
            Pagar SACMEX ahora →
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
      <section style={{ padding: "0 24px 48px", maxWidth: "760px", margin: "0 auto", width: "100%" }} className="cdmx-body">
        <h2 className="cdmx-h2" style={{ color: "white", fontWeight: 800, marginBottom: "24px" }}>
          Cómo pagar el agua SACMEX en 3 pasos
        </h2>
        <ol className="cdmx-ol" style={{ marginBottom: "32px" }}>
          <li><strong style={{ color: "white" }}>Recarga con efectivo en OXXO.</strong> Ve a cualquier OXXO de la CDMX o área metropolitana, da tu número de teléfono y deposita el monto de tu recibo SACMEX. Tu saldo PagoYa se acredita al instante.</li>
          <li><strong style={{ color: "white" }}>Ingresa tu número de cuenta SACMEX.</strong> Abre PagoYa, elige "Pagar servicio", selecciona Agua (SACMEX) e ingresa el número de cuenta de tu recibo bimestral.</li>
          <li><strong style={{ color: "white" }}>Confirma el pago.</strong> El pago se procesa en segundos. Recibes comprobante en pantalla. SACMEX actualiza el estado de tu cuenta en 24–72 h hábiles.</li>
        </ol>

        {/* Feature pills */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", marginBottom: "40px" }}>
          {[
            { icon: "⚡", title: "2 minutos", desc: "de principio a fin" },
            { icon: "🏪", title: "+5,000 OXXO", desc: "solo en la CDMX" },
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

      {/* SACMEX info table */}
      <section style={{ padding: "0 24px 48px", maxWidth: "760px", margin: "0 auto", width: "100%" }} className="cdmx-body">
        <h2 className="cdmx-h2" style={{ color: "white", fontWeight: 800, marginBottom: "20px" }}>
          Información sobre el pago SACMEX en línea
        </h2>
        <div className="cdmx-table-wrap">
          <table className="cdmx-table" style={{ color: "#CBD5E1", fontSize: "14px", marginBottom: "24px" }}>
            <thead>
              <tr>
                <th>Detalle</th>
                <th>Información</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>Organismo</td><td>Sistema de Aguas de la Ciudad de México (SACMEX)</td></tr>
              <tr><td>Cobertura</td><td>Ciudad de México — todas las alcaldías</td></tr>
              <tr><td>Frecuencia de facturación</td><td>Bimestral (cada 2 meses)</td></tr>
              <tr><td>Número de cuenta</td><td>8–10 dígitos en la parte superior de tu recibo. También en <strong>sacmex.cdmx.gob.mx</strong></td></tr>
              <tr><td>Costo del servicio PagoYa</td><td>$25 MXN tarifa de servicio por transacción</td></tr>
              <tr><td>Tiempo de acreditación</td><td>Pago instantáneo · SACMEX actualiza en 24–72 h hábiles</td></tr>
            </tbody>
          </table>
        </div>

        <h2 className="cdmx-h2" style={{ color: "white", fontWeight: 800, marginBottom: "20px" }}>
          ¿Dónde más se puede pagar el agua SACMEX?
        </h2>
        <div className="cdmx-table-wrap">
          <table className="cdmx-table" style={{ color: "#CBD5E1", fontSize: "14px", marginBottom: "32px" }}>
            <thead>
              <tr>
                <th>Opción de pago</th>
                <th>Requiere</th>
                <th>Comisión aprox.</th>
              </tr>
            </thead>
            <tbody>
              <tr><td><strong style={{ color: "#1D9E75" }}>PagoYa (recomendado)</strong></td><td>Solo tu celular</td><td>$25 MXN fija</td></tr>
              <tr><td>Centro de atención SACMEX</td><td>Ir en persona, recibo físico</td><td>Sin comisión</td></tr>
              <tr><td>Portal sacmex.cdmx.gob.mx</td><td>Tarjeta de crédito/débito</td><td>Variable</td></tr>
              <tr><td>Bancos (BBVA, Santander, Banamex)</td><td>Cuenta bancaria</td><td>$15–$30 MXN</td></tr>
              <tr><td>OXXO Pay directo</td><td>Ir al OXXO con recibo</td><td>$13 MXN aprox.</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ padding: "0 24px 48px", maxWidth: "760px", margin: "0 auto", width: "100%" }} className="cdmx-body">
        <h2 className="cdmx-h2" style={{ color: "white", fontWeight: 800, marginBottom: "24px" }}>
          Preguntas frecuentes — pago SACMEX CDMX
        </h2>
        {[
          { q: "¿Cómo pago el agua SACMEX sin ir al banco?", a: "Con PagoYa pagas tu recibo de agua SACMEX desde tu celular en menos de 2 minutos. Recarga con efectivo en cualquier OXXO de la CDMX y paga al instante. No necesitas cuenta bancaria ni tarjeta." },
          { q: "¿Dónde puedo pagar el agua de la CDMX en línea?", a: "Puedes pagar el agua SACMEX en línea con PagoYa sin necesidad de tarjeta ni cuenta bancaria. También en el portal sacmex.cdmx.gob.mx con tarjeta, o en bancos y tiendas de conveniencia con el recibo físico." },
          { q: "¿Qué número necesito para pagar el agua SACMEX?", a: "Necesitas el número de cuenta de servicio SACMEX de tu recibo bimestral. Es un número de 8 a 10 dígitos en la parte superior del recibo o en el portal sacmex.cdmx.gob.mx." },
          { q: "¿Puedo pagar el agua SACMEX sin mi recibo físico?", a: "Sí. Con PagoYa puedes pagar tu agua SACMEX usando solo el número de cuenta, sin necesitar el recibo en mano. El número de cuenta no cambia entre bimestres." },
          { q: "¿Cuánto tarda en registrarse el pago de agua en la CDMX?", a: "El pago en PagoYa se procesa en segundos. Recibes comprobante de inmediato. SACMEX actualiza el estado de tu cuenta en 24 a 72 horas hábiles." },
        ].map((item, i) => (
          <div key={i} style={{ marginBottom: "20px", borderBottom: "1px solid rgba(255,255,255,0.07)", paddingBottom: "20px" }}>
            <p style={{ color: "white", fontWeight: 700, fontSize: "16px", marginBottom: "8px" }}>❓ {item.q}</p>
            <p style={{ color: "#94A3B8", lineHeight: 1.7, fontSize: "15px" }}>{item.a}</p>
          </div>
        ))}
      </section>

      {/* Final CTA */}
      <section style={{ padding: "0 24px 64px", maxWidth: "760px", margin: "0 auto", width: "100%", textAlign: "center" }} className="cdmx-body">
        <div style={{ background: "linear-gradient(135deg, rgba(29,158,117,0.15), rgba(29,158,117,0.05))", border: "1px solid rgba(29,158,117,0.3)", borderRadius: "24px", padding: "40px 24px" }}>
          <p style={{ fontSize: "32px", marginBottom: "12px" }}>💧</p>
          <h2 style={{ color: "white", fontWeight: 900, fontSize: "22px", marginBottom: "10px" }}>
            Paga tu SACMEX ahora mismo
          </h2>
          <p style={{ color: "#94A3B8", fontSize: "15px", marginBottom: "28px", lineHeight: 1.6 }}>
            Sin banco, sin tarjeta, sin filas.<br />Solo tu celular y efectivo en OXXO.
          </p>
          <button
            onClick={() => navigate("/pagar")}
            style={{ background: "linear-gradient(135deg, #1D9E75, #25C090)", color: "white", border: "none", borderRadius: "50px", padding: "16px 36px", fontWeight: 800, fontSize: "16px", cursor: "pointer", boxShadow: "0 8px 24px rgba(29,158,117,0.4)" }}
          >
            Pagar mi SACMEX →
          </button>
        </div>
      </section>
    </div>
  );
}
