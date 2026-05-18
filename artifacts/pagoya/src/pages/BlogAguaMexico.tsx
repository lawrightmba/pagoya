import { Helmet } from "react-helmet-async";
import { useLocation } from "wouter";

export default function BlogAguaMexico() {
  const [, navigate] = useLocation();

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Inicio", "item": "https://pagoyamx.com/" },
      { "@type": "ListItem", "position": 2, "name": "Guías", "item": "https://pagoyamx.com/guia-pagar-servicios-sin-cuenta-bancaria" },
      { "@type": "ListItem", "position": 3, "name": "Pagar agua en México", "item": "https://pagoyamx.com/pagar-agua-mexico" }
    ]
  };

  const article = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "Cómo pagar el recibo de agua en México sin banco: SACMEX, SIAPA, JUMAPAM y más",
    "description": "Guía completa para pagar el recibo de agua en México sin cuenta bancaria. Cubre SACMEX (CDMX), SIAPA (Guadalajara), JUMAPAM (Mazatlán), y otros sistemas municipales.",
    "url": "https://pagoyamx.com/pagar-agua-mexico",
    "datePublished": "2026-05-17",
    "publisher": { "@type": "Organization", "name": "PagoYa", "url": "https://pagoyamx.com" },
    "inLanguage": "es"
  };

  const faq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      { "@type": "Question", "name": "¿Cómo pago mi recibo de agua sin ir al banco?", "acceptedAnswer": { "@type": "Answer", "text": "Con PagoYa puedes pagar tu recibo de agua cargando efectivo en OXXO y pagando desde la app. Funciona para SACMEX, SIAPA, JUMAPAM y más de 20 sistemas municipales de agua en México." } },
      { "@type": "Question", "name": "¿Qué número uso para pagar el agua en PagoYa?", "acceptedAnswer": { "@type": "Answer", "text": "Usa el número de contrato o cuenta del servicio de agua que aparece en tu recibo mensual. El formato varía según el municipio — SACMEX usa 8 dígitos, SIAPA usa el número de medidor." } },
      { "@type": "Question", "name": "¿PagoYa soporta SACMEX y SIAPA?", "acceptedAnswer": { "@type": "Answer", "text": "Sí. PagoYa soporta pagos de agua para múltiples organismos operadores en México, incluyendo SACMEX (Ciudad de México) y SIAPA (Guadalajara)." } }
    ]
  };

  const organismos = [
    { nombre: "SACMEX", ciudad: "Ciudad de México (CDMX)", nota: "Sistema de Aguas de la Ciudad de México" },
    { nombre: "SIAPA", ciudad: "Guadalajara, Jalisco", nota: "Sistem. Intermunicipal de Agua Potable y Alcantarillado" },
    { nombre: "JUMAPAM", ciudad: "Mazatlán, Sinaloa", nota: "Junta Municipal de Agua Potable y Alcantarillado" },
    { nombre: "JAPAC", ciudad: "Culiacán, Sinaloa", nota: "Junta de Agua Potable y Alcantarillado de Culiacán" },
    { nombre: "OOMAPAS", ciudad: "Sonora (varios municipios)", nota: "Organismo Operador Municipal de Agua" },
    { nombre: "CAPAM", ciudad: "Puerto Vallarta, Jalisco", nota: "Com. de Agua Potable y Alcantarillado" },
  ];

  return (
    <div style={{ background: "#0A2540", minHeight: "100vh", display: "flex", flexDirection: "column", overflowX: "hidden" }}>
      <Helmet>
        <html lang="es" />
        <title>Pagar Agua SACMEX, SIAPA y Más Sin Banco | PagoYa</title>
        <meta name="description" content="Cómo pagar el recibo de agua en México sin cuenta bancaria: SACMEX (CDMX), SIAPA (Guadalajara), JUMAPAM y más. Solo tu celular y efectivo en OXXO." />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://pagoyamx.com/pagar-agua-mexico" />
        <meta property="og:title" content="Pagar Agua SACMEX, SIAPA y Más Sin Banco | PagoYa" />
        <meta property="og:description" content="Paga el recibo de agua en México sin banco: SACMEX, SIAPA, JUMAPAM. Solo tu celular y efectivo en OXXO con PagoYa." />
        <meta property="og:type" content="article" />
        <meta property="og:url" content="https://pagoyamx.com/pagar-agua-mexico" />
        <script type="application/ld+json">{JSON.stringify(breadcrumb)}</script>
        <script type="application/ld+json">{JSON.stringify(article)}</script>
        <script type="application/ld+json">{JSON.stringify(faq)}</script>
      </Helmet>

      <style>{`
        .agua-body a { color: #1D9E75; text-decoration: underline; }
        .agua-body a:hover { color: #17c99a; }
        .agua-h1 { font-size: clamp(26px, 5vw, 42px); }
        .agua-h2 { font-size: clamp(20px, 3.5vw, 26px); }
        .agua-table { width: 100%; border-collapse: collapse; }
        .agua-table th, .agua-table td { padding: 10px 14px; border: 1px solid rgba(255,255,255,0.12); text-align: left; vertical-align: top; }
        .agua-table th { background: rgba(29,158,117,0.18); color: #1D9E75; font-weight: 700; }
        .agua-table tr:nth-child(even) td { background: rgba(255,255,255,0.03); }
        .agua-ol { padding-left: 20px; }
        .agua-ol li { margin-bottom: 10px; line-height: 1.6; color: #CBD5E1; }
        .agua-ul { list-style: disc; padding-left: 22px; }
        .agua-ul li { margin-bottom: 6px; line-height: 1.6; color: #CBD5E1; }
        @media(max-width:640px){ .agua-table-wrap { overflow-x: auto; } }
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

      <main className="agua-body" style={{ flex: 1, maxWidth: "780px", margin: "0 auto", width: "100%", padding: "32px 24px 64px" }}>
        <nav style={{ marginBottom: "20px", fontSize: "13px", color: "#64748B" }}>
          <a href="/" style={{ color: "#1D9E75", textDecoration: "none" }}>Inicio</a> {" › "}
          <a href="/guia-pagar-servicios-sin-cuenta-bancaria" style={{ color: "#1D9E75", textDecoration: "none" }}>Guías</a> {" › "}
          <span>Pagar agua en México</span>
        </nav>

        <h1 className="agua-h1" style={{ color: "#fff", fontWeight: 800, lineHeight: 1.15, marginBottom: "16px" }}>
          Pagar recibo de agua en México<br />
          <span style={{ color: "#1D9E75" }}>SACMEX, SIAPA y más — sin banco</span>
        </h1>
        <p style={{ color: "#64748B", fontSize: "13px", marginBottom: "24px" }}>Actualizado: mayo 2026 · Lectura: 5 minutos</p>

        <p style={{ color: "#94A3B8", fontSize: "17px", lineHeight: 1.7, marginBottom: "28px" }}>
          En México, el pago del agua está descentralizado — cada municipio tiene su propio organismo operador con su propio sistema de pagos. Esta guía cubre los organismos más importantes del país y cómo pagarles sin tarjeta ni banco usando PagoYa.
        </p>

        <h2 className="agua-h2" style={{ color: "#fff", fontWeight: 700, marginBottom: "16px" }}>¿Qué necesitas para pagar el agua sin banco?</h2>
        <ul className="agua-ul" style={{ marginBottom: "28px" }}>
          <li>Tu <strong style={{ color: "#e2e8f0" }}>número de contrato o cuenta</strong> del servicio de agua (está en tu recibo bimestral)</li>
          <li>Tu <strong style={{ color: "#e2e8f0" }}>celular con PagoYa</strong></li>
          <li><strong style={{ color: "#e2e8f0" }}>Efectivo</strong> para cargar tu billetera en OXXO</li>
        </ul>

        <h2 className="agua-h2" style={{ color: "#fff", fontWeight: 700, marginBottom: "16px" }}>Paso a paso: pagar agua con PagoYa</h2>
        <ol className="agua-ol" style={{ marginBottom: "32px" }}>
          <li><strong style={{ color: "#e2e8f0" }}>Carga tu billetera en OXXO.</strong> Deposita el monto de tu recibo más $25 MXN de comisión.</li>
          <li><strong style={{ color: "#e2e8f0" }}>Abre PagoYa y selecciona tu organismo de agua.</strong> Busca por nombre del organismo o por estado.</li>
          <li><strong style={{ color: "#e2e8f0" }}>Ingresa tu número de contrato.</strong> Lo encuentras en la parte superior de tu recibo de agua.</li>
          <li><strong style={{ color: "#e2e8f0" }}>Verifica el monto y confirma.</strong> PagoYa muestra el adeudo actual antes de cobrar.</li>
          <li><strong style={{ color: "#e2e8f0" }}>Guarda tu folio.</strong> Es tu comprobante oficial de pago.</li>
        </ol>

        <h2 className="agua-h2" style={{ color: "#fff", fontWeight: 700, marginBottom: "16px" }}>Organismos de agua compatibles con PagoYa</h2>
        <div className="agua-table-wrap" style={{ marginBottom: "32px" }}>
          <table className="agua-table">
            <thead><tr><th>Organismo</th><th>Ciudad / Estado</th><th>Descripción</th></tr></thead>
            <tbody>
              {organismos.map(o => (
                <tr key={o.nombre}>
                  <td><strong style={{ color: "#1D9E75" }}>{o.nombre}</strong></td>
                  <td style={{ color: "#CBD5E1" }}>{o.ciudad}</td>
                  <td style={{ color: "#94A3B8", fontSize: "13px" }}>{o.nota}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 className="agua-h2" style={{ color: "#fff", fontWeight: 700, marginBottom: "16px" }}>¿Dónde encuentro mi número de contrato de agua?</h2>
        <p style={{ color: "#94A3B8", lineHeight: 1.7, marginBottom: "16px" }}>
          El número de contrato o cuenta está impreso en la parte superior de tu recibo bimestral. Según el organismo:
        </p>
        <ul className="agua-ul" style={{ marginBottom: "32px" }}>
          <li><strong style={{ color: "#e2e8f0" }}>SACMEX (CDMX):</strong> "Número de cuenta" — 8 dígitos en la parte superior izquierda del recibo</li>
          <li><strong style={{ color: "#e2e8f0" }}>SIAPA (Guadalajara):</strong> "Número de medidor" o "Cuenta" — en la sección de datos del servicio</li>
          <li><strong style={{ color: "#e2e8f0" }}>CAPAM (Puerto Vallarta):</strong> "Número de cuenta" — en la parte superior del recibo</li>
          <li><strong style={{ color: "#e2e8f0" }}>Otros organismos:</strong> Busca "Número de contrato", "NIS" o "Cuenta de servicio" en tu recibo</li>
        </ul>

        <h2 className="agua-h2" style={{ color: "#fff", fontWeight: 700, marginBottom: "16px" }}>Preguntas frecuentes</h2>
        {[
          ["¿Cómo pago mi recibo de agua sin ir al banco?", "Carga efectivo en OXXO para tu billetera PagoYa, selecciona tu organismo de agua en la app, ingresa tu número de contrato y confirma. Sin banco, sin filas."],
          ["¿Qué número uso para pagar el agua en PagoYa?", "El número de contrato o cuenta que aparece en la parte superior de tu recibo bimestral. El formato varía por organismo — SACMEX usa 8 dígitos, SIAPA usa número de medidor."],
          ["¿PagoYa soporta SACMEX y SIAPA?", "Sí. PagoYa soporta pagos para SACMEX (CDMX), SIAPA (Guadalajara), CAPAM (Puerto Vallarta) y otros organismos municipales."],
          ["¿Cuánto tarda en procesarse el pago de agua?", "El pago se procesa en 1-3 minutos. Recibes folio de confirmación al instante."],
        ].map(([q, a]) => (
          <div key={q} style={{ marginBottom: "16px", background: "rgba(255,255,255,0.03)", borderRadius: "10px", padding: "16px 20px", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ color: "#e2e8f0", fontWeight: 700, marginBottom: "8px", fontSize: "15px" }}>{q}</div>
            <div style={{ color: "#94A3B8", lineHeight: 1.7, fontSize: "14px" }}>{a}</div>
          </div>
        ))}

        <div style={{ marginTop: "40px", background: "rgba(29,158,117,0.12)", border: "1px solid rgba(29,158,117,0.3)", borderRadius: "14px", padding: "28px 24px", textAlign: "center" }}>
          <div style={{ color: "#fff", fontSize: "22px", fontWeight: 800, marginBottom: "8px" }}>Paga tu agua ahora</div>
          <div style={{ color: "#94A3B8", marginBottom: "20px" }}>SACMEX · SIAPA · CAPAM y más</div>
          <button onClick={() => navigate("/")} style={{ background: "#1D9E75", color: "#fff", border: "none", borderRadius: "10px", padding: "14px 36px", fontSize: "16px", fontWeight: 700, cursor: "pointer" }}>
            Ir a PagoYa →
          </button>
        </div>

        <div style={{ marginTop: "32px", paddingTop: "24px", borderTop: "1px solid rgba(255,255,255,0.08)", fontSize: "13px", color: "#475569" }}>
          <strong style={{ color: "#64748B" }}>También te puede interesar: </strong>
          <a href="/pagar-cfe">Pagar CFE</a> · <a href="/pagar-telmex">Pagar Telmex</a> · <a href="/guia-pagar-servicios-sin-cuenta-bancaria">Guía completa sin banco</a>
        </div>
      </main>
    </div>
  );
}
