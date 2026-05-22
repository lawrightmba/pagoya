import { Helmet } from "react-helmet-async";
import { useLocation } from "wouter";

export default function BlogOXXOPay() {
  const [, navigate] = useLocation();

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Inicio", "item": "https://pagoyamx.com/" },
      { "@type": "ListItem", "position": 2, "name": "Guías", "item": "https://pagoyamx.com/guia-pagar-servicios-sin-cuenta-bancaria" },
      { "@type": "ListItem", "position": 3, "name": "Qué es OXXO Pay", "item": "https://pagoyamx.com/que-es-oxxo-pay" }
    ]
  };

  const article = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "Qué es OXXO Pay y cómo funciona para depositar en apps como PagoYa",
    "description": "Guía completa sobre OXXO Pay: qué es, cómo funciona, cuánto cobra y para qué sirve. Aprende a depositar en billeteras digitales como PagoYa usando efectivo en OXXO.",
    "url": "https://pagoyamx.com/que-es-oxxo-pay",
    "datePublished": "2026-05-17",
    "publisher": { "@type": "Organization", "name": "PagoYa", "url": "https://pagoyamx.com" },
    "inLanguage": "es"
  };

  const faq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      { "@type": "Question", "name": "¿Qué es OXXO Pay?", "acceptedAnswer": { "@type": "Answer", "text": "OXXO Pay es el sistema de pagos digitales de tiendas OXXO en México. Permite hacer depósitos a billeteras digitales, pagar servicios y realizar transferencias usando efectivo en cualquier sucursal OXXO del país." } },
      { "@type": "Question", "name": "¿Cuánto cobra OXXO por hacer un depósito?", "acceptedAnswer": { "@type": "Answer", "text": "El costo depende del tipo de depósito y la plataforma. Para cargar la billetera PagoYa vía OXXO, la comisión de PagoYa es de $25 MXN por transacción. OXXO puede cobrar adicionalmente dependiendo del servicio." } },
      { "@type": "Question", "name": "¿Cuánto tarda en reflejarse un depósito de OXXO en PagoYa?", "acceptedAnswer": { "@type": "Answer", "text": "Los depósitos de OXXO en PagoYa se procesan en tiempo real gracias a Conekta. El saldo aparece en tu billetera en menos de 5 minutos." } }
    ]
  };

  return (
    <div style={{ background: "#0A2540", minHeight: "100vh", display: "flex", flexDirection: "column", overflowX: "hidden" }}>
      <Helmet>
        <html lang="es-MX" />
        <title>Qué es OXXO Pay y Cómo Funciona | PagoYa</title>
        <meta name="description" content="Guía completa sobre OXXO Pay: qué es, cómo funciona, cuánto cobra y cómo usarlo para cargar tu billetera PagoYa y pagar servicios sin banco ni tarjeta." />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://pagoyamx.com/que-es-oxxo-pay" />
        <link rel="alternate" hreflang="es-MX" href="https://pagoyamx.com/que-es-oxxo-pay" />
        <link rel="alternate" hreflang="x-default" href="https://pagoyamx.com/que-es-oxxo-pay" />
        <meta name="geo.region" content="MX" />
        <meta name="geo.placename" content="México" />
        <meta property="og:title" content="Qué es OXXO Pay y Cómo Funciona | PagoYa" />
        <meta property="og:description" content="Todo sobre OXXO Pay: qué es, cómo depositar, cuánto cobra. Aprende a usarlo con PagoYa para pagar servicios con efectivo." />
        <meta property="og:type" content="article" />
        <meta property="og:url" content="https://pagoyamx.com/que-es-oxxo-pay" />
        <script type="application/ld+json">{JSON.stringify(breadcrumb)}</script>
        <script type="application/ld+json">{JSON.stringify(article)}</script>
        <script type="application/ld+json">{JSON.stringify(faq)}</script>
      </Helmet>

      <style>{`
        .oxxoblog-body a { color: #1D9E75; text-decoration: underline; }
        .oxxoblog-body a:hover { color: #17c99a; }
        .oxxoblog-h1 { font-size: clamp(26px, 5vw, 42px); }
        .oxxoblog-h2 { font-size: clamp(20px, 3.5vw, 26px); }
        .oxxoblog-table { width: 100%; border-collapse: collapse; }
        .oxxoblog-table th, .oxxoblog-table td { padding: 10px 14px; border: 1px solid rgba(255,255,255,0.12); text-align: left; vertical-align: top; }
        .oxxoblog-table th { background: rgba(29,158,117,0.18); color: #1D9E75; font-weight: 700; }
        .oxxoblog-table tr:nth-child(even) td { background: rgba(255,255,255,0.03); }
        .oxxoblog-ol { padding-left: 20px; }
        .oxxoblog-ol li { margin-bottom: 10px; line-height: 1.6; color: #CBD5E1; }
        .oxxoblog-ul { list-style: disc; padding-left: 22px; }
        .oxxoblog-ul li { margin-bottom: 6px; line-height: 1.6; color: #CBD5E1; }
        @media(max-width:640px){ .oxxoblog-table-wrap { overflow-x: auto; } }
      `}</style>

      <header style={{ background: "#0A2540", padding: "10px 20px", display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <span />
        <div style={{ display: "flex", justifyContent: "center", cursor: "pointer" }} onClick={() => navigate("/")}>
          <img src="/pagoya-logo.png" alt="PagoYa" style={{ height: "44px", width: "auto", maxWidth: "180px", objectFit: "contain" }}
            onError={(e) => { e.currentTarget.style.display = "none"; }} />
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button onClick={() => navigate("/")} style={{ background: "#1D9E75", color: "#fff", border: "none", borderRadius: "8px", padding: "8px 16px", fontWeight: 700, cursor: "pointer", fontSize: "14px" }}>
            Pagar ahora
          </button>
        </div>
      </header>

      <main className="oxxoblog-body" style={{ flex: 1, maxWidth: "780px", margin: "0 auto", width: "100%", padding: "32px 24px 64px" }}>
        <nav style={{ marginBottom: "20px", fontSize: "13px", color: "#64748B" }}>
          <a href="/" style={{ color: "#1D9E75", textDecoration: "none" }}>Inicio</a> {" › "}
          <a href="/guia-pagar-servicios-sin-cuenta-bancaria" style={{ color: "#1D9E75", textDecoration: "none" }}>Guías</a> {" › "}
          <span>Qué es OXXO Pay</span>
        </nav>

        <h1 className="oxxoblog-h1" style={{ color: "#fff", fontWeight: 800, lineHeight: 1.15, marginBottom: "16px" }}>
          Qué es OXXO Pay<br />
          <span style={{ color: "#1D9E75" }}>y cómo usarlo para pagar servicios</span>
        </h1>
        <p style={{ color: "#64748B", fontSize: "13px", marginBottom: "24px" }}>Actualizado: mayo 2026 · Lectura: 5 minutos</p>

        <p style={{ color: "#94A3B8", fontSize: "17px", lineHeight: 1.7, marginBottom: "28px" }}>
          OXXO tiene más de 20,000 tiendas en México — más que cualquier banco. OXXO Pay es el sistema que convierte esas tiendas en terminales de servicios financieros: puedes depositar, pagar recibos y recargar billeteras digitales sin tener cuenta bancaria.
        </p>

        <h2 className="oxxoblog-h2" style={{ color: "#fff", fontWeight: 700, marginBottom: "16px" }}>¿Qué es OXXO Pay exactamente?</h2>
        <p style={{ color: "#94A3B8", lineHeight: 1.7, marginBottom: "28px" }}>
          OXXO Pay es la infraestructura de pagos digitales que opera OXXO (parte del grupo FEMSA). Permite procesar pagos en efectivo en sus tiendas y acreditarlos a plataformas digitales en tiempo real. Para el usuario, el proceso es simple: le das efectivo al cajero, él escanea un código o referencia, y el dinero aparece en tu billetera digital o se aplica al servicio que quieres pagar.
        </p>

        <h2 className="oxxoblog-h2" style={{ color: "#fff", fontWeight: 700, marginBottom: "16px" }}>Para qué sirve OXXO Pay</h2>
        <ul className="oxxoblog-ul" style={{ marginBottom: "28px" }}>
          <li><strong style={{ color: "#e2e8f0" }}>Cargar billeteras digitales</strong> — PagoYa, Mercado Pago, Nu, BBVA, entre otras</li>
          <li><strong style={{ color: "#e2e8f0" }}>Pagar recibos</strong> — CFE, Telmex, agua, internet</li>
          <li><strong style={{ color: "#e2e8f0" }}>Recargar celulares</strong> — Telcel, AT&T, Movistar</li>
          <li><strong style={{ color: "#e2e8f0" }}>Pagar compras en línea</strong> — con código de barras generado por la tienda</li>
          <li><strong style={{ color: "#e2e8f0" }}>Pagar tarjetas de crédito</strong> — BANAMEX, HSBC, Santander y otras</li>
        </ul>

        <h2 className="oxxoblog-h2" style={{ color: "#fff", fontWeight: 700, marginBottom: "16px" }}>Cómo cargar tu billetera PagoYa en OXXO</h2>
        <ol className="oxxoblog-ol" style={{ marginBottom: "32px" }}>
          <li><strong style={{ color: "#e2e8f0" }}>Abre PagoYa y selecciona "Cargar saldo".</strong> La app genera un código de barras único para tu cuenta.</li>
          <li><strong style={{ color: "#e2e8f0" }}>Ve a cualquier OXXO.</strong> Dile al cajero que quieres cargar tu billetera PagoYa.</li>
          <li><strong style={{ color: "#e2e8f0" }}>Muestra el código de barras.</strong> El cajero lo escanea y te cobra el monto que quieres depositar.</li>
          <li><strong style={{ color: "#e2e8f0" }}>Paga en efectivo.</strong> El cajero te da un recibo impreso con el folio de la transacción.</li>
          <li><strong style={{ color: "#e2e8f0" }}>El saldo aparece en tu billetera en minutos.</strong> PagoYa procesa el depósito en tiempo real via Conekta.</li>
        </ol>

        <h2 className="oxxoblog-h2" style={{ color: "#fff", fontWeight: 700, marginBottom: "16px" }}>¿Cuánto cobra OXXO Pay?</h2>
        <div className="oxxoblog-table-wrap" style={{ marginBottom: "32px" }}>
          <table className="oxxoblog-table">
            <thead><tr><th>Tipo de operación</th><th>Costo OXXO</th><th>Costo PagoYa</th><th>Total</th></tr></thead>
            <tbody>
              <tr><td>Cargar billetera PagoYa</td><td style={{ color: "#CBD5E1" }}>$0 (incluido)</td><td style={{ color: "#CBD5E1" }}>$25 MXN</td><td style={{ color: "#1D9E75" }}>$25 MXN</td></tr>
              <tr><td>Pago de servicios directo</td><td style={{ color: "#CBD5E1" }}>$12–15 MXN</td><td style={{ color: "#CBD5E1" }}>N/A</td><td style={{ color: "#CBD5E1" }}>$12–15 MXN</td></tr>
              <tr><td>Recargas celular en OXXO</td><td style={{ color: "#CBD5E1" }}>Incluido en el monto</td><td style={{ color: "#CBD5E1" }}>N/A</td><td style={{ color: "#CBD5E1" }}>Sin costo extra</td></tr>
            </tbody>
          </table>
        </div>

        <h2 className="oxxoblog-h2" style={{ color: "#fff", fontWeight: 700, marginBottom: "16px" }}>Preguntas frecuentes sobre OXXO Pay</h2>
        {[
          ["¿Qué es OXXO Pay?", "Es el sistema de pagos digitales de tiendas OXXO. Permite depositar efectivo a billeteras digitales, pagar servicios y recargas en más de 20,000 tiendas en México."],
          ["¿Cuánto tarda en reflejarse el depósito en PagoYa?", "Menos de 5 minutos en la mayoría de los casos, gracias al procesamiento en tiempo real via Conekta."],
          ["¿Necesito una app para usar OXXO Pay?", "Para cargar PagoYa sí — la app genera el código de barras único. Para pagar servicios directos en OXXO, solo necesitas el número de servicio."],
          ["¿OXXO Pay funciona los 365 días del año?", "Sí. Las tiendas OXXO operan todos los días y la mayoría tiene horario extendido (muchas son 24 horas)."],
        ].map(([q, a]) => (
          <div key={q} style={{ marginBottom: "16px", background: "rgba(255,255,255,0.03)", borderRadius: "10px", padding: "16px 20px", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ color: "#e2e8f0", fontWeight: 700, marginBottom: "8px", fontSize: "15px" }}>{q}</div>
            <div style={{ color: "#94A3B8", lineHeight: 1.7, fontSize: "14px" }}>{a}</div>
          </div>
        ))}

        <div style={{ marginTop: "40px", background: "rgba(29,158,117,0.12)", border: "1px solid rgba(29,158,117,0.3)", borderRadius: "14px", padding: "28px 24px", textAlign: "center" }}>
          <div style={{ color: "#fff", fontSize: "22px", fontWeight: 800, marginBottom: "8px" }}>Carga tu billetera en OXXO</div>
          <div style={{ color: "#94A3B8", marginBottom: "20px" }}>Efectivo → PagoYa → Paga tus servicios</div>
          <button onClick={() => navigate("/")} style={{ background: "#1D9E75", color: "#fff", border: "none", borderRadius: "10px", padding: "14px 36px", fontSize: "16px", fontWeight: 700, cursor: "pointer" }}>
            Ir a PagoYa →
          </button>
        </div>

        <div style={{ marginTop: "32px", paddingTop: "24px", borderTop: "1px solid rgba(255,255,255,0.08)", fontSize: "13px", color: "#475569" }}>
          <strong style={{ color: "#64748B" }}>También te puede interesar: </strong>
          <a href="/deposito-oxxo">Cómo depositar en OXXO para PagoYa</a> · <a href="/pagar-cfe">Pagar CFE</a> · <a href="/guia-pagar-servicios-sin-cuenta-bancaria">Guía completa</a>
        </div>
      </main>
    </div>
  );
}
