import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useLocation } from "wouter";

export default function PagarAguaMonterreyEnLinea() {
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
      { "@type": "ListItem", "position": 3, "name": "Pagar agua SADM en línea", "item": "https://pagoyamx.com/pagar-agua-monterrey-en-linea" }
    ]
  };

  const article = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "Pagar agua SADM Monterrey en línea desde tu celular",
    "description": "Paga tu recibo de agua SADM Monterrey en línea desde tu celular en 2 minutos. Alternativa al portal sadm.mx, sin tarjeta obligatoria. Comprobante al instante con PagoYa.",
    "url": "https://pagoyamx.com/pagar-agua-monterrey-en-linea",
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
        "name": "¿Cómo pago el agua SADM Monterrey en línea desde mi celular?",
        "acceptedAnswer": { "@type": "Answer", "text": "Abre PagoYa en tu celular, elige Pagar servicio, selecciona Agua (SADM) e ingresa tu número de cuenta. Confirmas y el pago se procesa en segundos. Recibes tu comprobante en pantalla al instante." }
      },
      {
        "@type": "Question",
        "name": "¿PagoYa es una alternativa al portal sadm.mx?",
        "acceptedAnswer": { "@type": "Answer", "text": "Sí. En lugar de entrar al portal sadm.mx, puedes pagar tu recibo de agua SADM directamente en la app de PagoYa. Es una opción en línea rápida que no depende del sitio del organismo." }
      },
      {
        "@type": "Question",
        "name": "¿Necesito tarjeta para pagar el SADM en línea?",
        "acceptedAnswer": { "@type": "Answer", "text": "No es obligatorio. Puedes cargar saldo con efectivo en cualquier OXXO y pagar tu SADM en línea sin tarjeta ni cuenta bancaria. La tarifa de servicio de PagoYa es de $25 MXN por transacción." }
      },
      {
        "@type": "Question",
        "name": "¿Cuánto tarda en reflejarse el pago en línea del SADM?",
        "acceptedAnswer": { "@type": "Answer", "text": "El pago se procesa en segundos y recibes comprobante de inmediato. SADM registra el pago en su sistema en un plazo de 24 a 48 horas hábiles." }
      },
      {
        "@type": "Question",
        "name": "¿Puedo pagar el SADM en línea desde cualquier lugar?",
        "acceptedAnswer": { "@type": "Answer", "text": "Sí. Como el pago es 100% en línea desde la app, puedes pagar tu recibo de agua de Monterrey desde tu casa, el trabajo o donde estés, siempre que tengas tu número de cuenta SADM." }
      }
    ]
  };

  return (
    <div style={{ background: "#0A2540", minHeight: "100vh", display: "flex", flexDirection: "column", overflowX: "hidden" }}>
      <Helmet>
        <html lang="es-MX" />
        <title>Pagar Agua Monterrey en Línea | SADM desde tu Celular | PagoYa</title>
        <meta name="description" content="Paga tu recibo de agua SADM Monterrey en línea desde tu celular en 2 minutos. Alternativa al portal sadm.mx, sin tarjeta obligatoria. Comprobante al instante con PagoYa." />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://pagoyamx.com/pagar-agua-monterrey-en-linea" />
        <link rel="alternate" hrefLang="es-MX" href="https://pagoyamx.com/pagar-agua-monterrey-en-linea" />
        <link rel="alternate" hrefLang="x-default" href="https://pagoyamx.com/pagar-agua-monterrey-en-linea" />
        <meta name="geo.region" content="MX-NL" />
        <meta name="geo.placename" content="Monterrey, Nuevo León" />
        <meta property="og:title" content="Pagar Agua Monterrey en Línea | SADM desde tu Celular | PagoYa" />
        <meta property="og:description" content="Paga tu SADM Monterrey en línea desde tu celular. Alternativa al portal, sin tarjeta obligatoria. Comprobante al instante con PagoYa." />
        <meta property="og:image" content="https://pagoyamx.com/og-default.png" />
        <meta property="og:type" content="article" />
        <meta property="og:url" content="https://pagoyamx.com/pagar-agua-monterrey-en-linea" />
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
          <p style={{ color: "white", fontWeight: 700, fontSize: "14px", margin: 0 }}>💧 Paga tu SADM en línea</p>
          <button onClick={() => navigate("/pagar")} style={{ background: "linear-gradient(135deg, #1D9E75, #25C090)", color: "white", border: "none", borderRadius: "20px", padding: "10px 22px", fontWeight: 800, fontSize: "14px", cursor: "pointer" }}>
            Pagar SADM →
          </button>
        </div>
      )}

      {/* Hero */}
      <section style={{ padding: "56px 24px 40px", maxWidth: "760px", margin: "0 auto", width: "100%" }} className="mty-body">
        <p style={{ color: "#1D9E75", fontWeight: 700, fontSize: "13px", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "12px" }}>
          💧 Agua SADM en línea · Monterrey, Nuevo León
        </p>
        <h1 className="mty-h1" style={{ color: "white", fontWeight: 900, lineHeight: 1.2, marginBottom: "20px" }}>
          Pagar agua Monterrey en línea<br />
          <span style={{ color: "#1D9E75" }}>tu recibo SADM desde el celular</span>
        </h1>
        <p style={{ color: "#94A3B8", fontSize: "18px", lineHeight: 1.7, marginBottom: "32px", maxWidth: "600px" }}>
          Paga tu recibo de los <strong style={{ color: "white" }}>Servicios de Agua y Drenaje de Monterrey (SADM)</strong> 100% en línea desde tu celular. Una alternativa rápida al portal sadm.mx: abres la app, ingresas tu cuenta y listo, en menos de 2 minutos.
        </p>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <button
            onClick={() => navigate("/pagar")}
            style={{ background: "linear-gradient(135deg, #1D9E75, #25C090)", color: "white", border: "none", borderRadius: "50px", padding: "16px 32px", fontWeight: 800, fontSize: "16px", cursor: "pointer", boxShadow: "0 8px 24px rgba(29,158,117,0.4)" }}
          >
            Pagar SADM en línea →
          </button>
          <button
            onClick={() => navigate("/cargar")}
            style={{ background: "rgba(255,255,255,0.08)", color: "white", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "50px", padding: "16px 28px", fontWeight: 700, fontSize: "15px", cursor: "pointer" }}
          >
            Cargar saldo primero
          </button>
        </div>
        <p style={{ color: "#94A3B8", fontSize: "14px", marginTop: "20px" }}>
          ¿Buscas pagar sin banco? Revisa la guía de <a href="/pagar-agua-monterrey">pagar agua SADM sin banco</a> o explora todos los <a href="/pagar-servicios-monterrey">servicios de Monterrey</a>.
        </p>
      </section>

      {/* Steps */}
      <section style={{ padding: "0 24px 48px", maxWidth: "760px", margin: "0 auto", width: "100%" }} className="mty-body">
        <h2 className="mty-h2" style={{ color: "white", fontWeight: 800, marginBottom: "24px" }}>
          Cómo pagar el agua de Monterrey en línea en 3 pasos
        </h2>
        <ol className="mty-ol" style={{ marginBottom: "32px" }}>
          <li><strong style={{ color: "white" }}>Abre PagoYa y elige Agua (SADM).</strong> Desde tu celular entra a la app, selecciona "Pagar servicio" y toca Agua (SADM). Todo el proceso es en línea, sin salir de casa.</li>
          <li><strong style={{ color: "white" }}>Ingresa tu número de cuenta SADM.</strong> Captura el número de contrato que aparece en tu recibo o que consultas en sadm.mx. Confirma el monto de tu bimestre.</li>
          <li><strong style={{ color: "white" }}>Paga y recibe tu comprobante.</strong> El pago se procesa en segundos y ves tu comprobante en pantalla. SADM registra el pago en 24–48 h hábiles.</li>
        </ol>

        {/* Feature pills */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", marginBottom: "40px" }}>
          {[
            { icon: "🌐", title: "100% en línea", desc: "sin ir a cajas ni bancos" },
            { icon: "📱", title: "Desde tu celular", desc: "en cualquier momento" },
            { icon: "💳", title: "Sin tarjeta", desc: "efectivo en OXXO si prefieres" },
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
          Pago en línea del SADM: lo que necesitas saber
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
              <tr><td>Organismo</td><td>Servicios de Agua y Drenaje de Monterrey (SADM)</td></tr>
              <tr><td>Modalidad</td><td>Pago 100% en línea desde la app PagoYa</td></tr>
              <tr><td>Alternativa a</td><td>Portal sadm.mx y cajas físicas del organismo</td></tr>
              <tr><td>Número de cuenta</td><td>Aparece en tu recibo bimestral o en <strong>sadm.mx</strong></td></tr>
              <tr><td>Métodos de saldo</td><td>Efectivo en OXXO · sin tarjeta ni cuenta bancaria obligatoria</td></tr>
              <tr><td>Costo del servicio PagoYa</td><td>$25 MXN tarifa de servicio por transacción</td></tr>
              <tr><td>Tiempo de acreditación</td><td>Pago instantáneo · SADM actualiza en 24–48 h hábiles</td></tr>
            </tbody>
          </table>
        </div>

        <h2 className="mty-h2" style={{ color: "white", fontWeight: 800, marginBottom: "20px" }}>
          Formas de pagar el agua de Monterrey en línea
        </h2>
        <div className="mty-table-wrap">
          <table className="mty-table" style={{ color: "#CBD5E1", fontSize: "14px", marginBottom: "32px" }}>
            <thead>
              <tr>
                <th>Opción en línea</th>
                <th>Requiere</th>
                <th>Comisión aprox.</th>
              </tr>
            </thead>
            <tbody>
              <tr><td><strong style={{ color: "#1D9E75" }}>PagoYa (recomendado)</strong></td><td>Solo tu celular</td><td>$25 MXN fija</td></tr>
              <tr><td>Portal sadm.mx</td><td>Tarjeta de crédito/débito</td><td>Variable</td></tr>
              <tr><td>Banca en línea (BBVA, Santander, Banorte)</td><td>Cuenta bancaria</td><td>$15–$30 MXN</td></tr>
              <tr><td>Apps bancarias</td><td>Cuenta y tarjeta</td><td>Variable</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ padding: "0 24px 48px", maxWidth: "760px", margin: "0 auto", width: "100%" }} className="mty-body">
        <h2 className="mty-h2" style={{ color: "white", fontWeight: 800, marginBottom: "24px" }}>
          Preguntas frecuentes — pago SADM en línea
        </h2>
        {[
          { q: "¿Cómo pago el agua SADM Monterrey en línea desde mi celular?", a: "Abre PagoYa en tu celular, elige Pagar servicio, selecciona Agua (SADM) e ingresa tu número de cuenta. Confirmas y el pago se procesa en segundos. Recibes tu comprobante en pantalla al instante." },
          { q: "¿PagoYa es una alternativa al portal sadm.mx?", a: "Sí. En lugar de entrar al portal sadm.mx, puedes pagar tu recibo de agua SADM directamente en la app de PagoYa. Es una opción en línea rápida que no depende del sitio del organismo." },
          { q: "¿Necesito tarjeta para pagar el SADM en línea?", a: "No es obligatorio. Puedes cargar saldo con efectivo en cualquier OXXO y pagar tu SADM en línea sin tarjeta ni cuenta bancaria. La tarifa de servicio de PagoYa es de $25 MXN por transacción." },
          { q: "¿Cuánto tarda en reflejarse el pago en línea del SADM?", a: "El pago se procesa en segundos y recibes comprobante de inmediato. SADM registra el pago en su sistema en un plazo de 24 a 48 horas hábiles." },
          { q: "¿Puedo pagar el SADM en línea desde cualquier lugar?", a: "Sí. Como el pago es 100% en línea desde la app, puedes pagar tu recibo de agua de Monterrey desde tu casa, el trabajo o donde estés, siempre que tengas tu número de cuenta SADM." },
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
          <li><a href="/pagar-gas-natural-monterrey">Pagar gas natural Naturgy Monterrey</a></li>
        </ul>
      </section>

      {/* Final CTA */}
      <section style={{ padding: "0 24px 64px", maxWidth: "760px", margin: "0 auto", width: "100%", textAlign: "center" }} className="mty-body">
        <div style={{ background: "linear-gradient(135deg, rgba(29,158,117,0.15), rgba(29,158,117,0.05))", border: "1px solid rgba(29,158,117,0.3)", borderRadius: "24px", padding: "40px 24px" }}>
          <p style={{ fontSize: "32px", marginBottom: "12px" }}>💧</p>
          <h2 style={{ color: "white", fontWeight: 900, fontSize: "22px", marginBottom: "10px" }}>
            Paga tu SADM en línea ahora
          </h2>
          <p style={{ color: "#94A3B8", fontSize: "15px", marginBottom: "28px", lineHeight: 1.6 }}>
            Desde tu celular, en menos de 2 minutos.<br />Sin filas y sin tarjeta obligatoria.
          </p>
          <button
            onClick={() => navigate("/pagar")}
            style={{ background: "linear-gradient(135deg, #1D9E75, #25C090)", color: "white", border: "none", borderRadius: "50px", padding: "16px 36px", fontWeight: 800, fontSize: "16px", cursor: "pointer", boxShadow: "0 8px 24px rgba(29,158,117,0.4)" }}
          >
            Pagar mi SADM en línea →
          </button>
        </div>
      </section>
    </div>
  );
}
