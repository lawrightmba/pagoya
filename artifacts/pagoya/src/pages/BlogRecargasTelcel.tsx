import { Helmet } from "react-helmet-async";
import { useLocation } from "wouter";

export default function BlogRecargasTelcel() {
  const [, navigate] = useLocation();

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Inicio", "item": "https://pagoyamx.com/" },
      { "@type": "ListItem", "position": 2, "name": "Guías", "item": "https://pagoyamx.com/guia-pagar-servicios-sin-cuenta-bancaria" },
      { "@type": "ListItem", "position": 3, "name": "Recargas Telcel con efectivo", "item": "https://pagoyamx.com/recargas-telcel-efectivo" }
    ]
  };

  const article = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "Cómo hacer recargas Telcel con efectivo sin tarjeta ni banco",
    "description": "Aprende a recargar tu celular Telcel con efectivo a través de PagoYa. Sin tarjeta de crédito, sin débito, sin cuenta bancaria. Solo necesitas efectivo y tu celular.",
    "url": "https://pagoyamx.com/recargas-telcel-efectivo",
    "datePublished": "2026-05-17",
    "publisher": { "@type": "Organization", "name": "PagoYa", "url": "https://pagoyamx.com" },
    "inLanguage": "es"
  };

  const faq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      { "@type": "Question", "name": "¿Cómo recargo Telcel con efectivo?", "acceptedAnswer": { "@type": "Answer", "text": "Con PagoYa: deposita efectivo en OXXO para cargar tu billetera, selecciona Recargas en la app, elige Telcel, ingresa tu número y confirma. La recarga llega en menos de 60 segundos." } },
      { "@type": "Question", "name": "¿Cuánto cuesta recargar Telcel con PagoYa?", "acceptedAnswer": { "@type": "Answer", "text": "PagoYa cobra $25 MXN de comisión fija por cada recarga, sin importar el monto." } },
      { "@type": "Question", "name": "¿Puedo recargar el celular de otra persona con PagoYa?", "acceptedAnswer": { "@type": "Answer", "text": "Sí. Puedes ingresar cualquier número de celular mexicano, no tiene que ser el tuyo." } }
    ]
  };

  const planes = [
    { monto: "$50", vigencia: "7 días", datos: "1.5 GB", llamadas: "Ilimitadas a Telcel" },
    { monto: "$100", vigencia: "30 días", datos: "3 GB", llamadas: "Ilimitadas a Telcel + 100 min a otros" },
    { monto: "$150", vigencia: "30 días", datos: "6 GB", llamadas: "Ilimitadas a todos" },
    { monto: "$200", vigencia: "30 días", datos: "12 GB", llamadas: "Ilimitadas a todos" },
    { monto: "$300", vigencia: "30 días", datos: "20 GB", llamadas: "Ilimitadas a todos" },
    { monto: "$500", vigencia: "30 días", datos: "35 GB", llamadas: "Ilimitadas a todos" },
  ];

  return (
    <div style={{ background: "#0A2540", minHeight: "100vh", display: "flex", flexDirection: "column", overflowX: "hidden" }}>
      <Helmet>
        <html lang="es-MX" />
        <title>Recargas Telcel con Efectivo Sin Tarjeta | PagoYa</title>
        <meta name="description" content="Cómo recargar Telcel con efectivo sin tarjeta ni banco en México. Paso a paso con PagoYa: carga en OXXO y recarga en segundos desde tu celular." />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://pagoyamx.com/recargas-telcel-efectivo" />
        <link rel="alternate" hreflang="es-MX" href="https://pagoyamx.com/recargas-telcel-efectivo" />
        <link rel="alternate" hreflang="x-default" href="https://pagoyamx.com/recargas-telcel-efectivo" />
        <meta name="geo.region" content="MX" />
        <meta name="geo.placename" content="México" />
        <meta property="og:title" content="Recargas Telcel con Efectivo Sin Tarjeta | PagoYa" />
        <meta property="og:description" content="Recarga Telcel con efectivo sin tarjeta ni banco. Solo OXXO + PagoYa. Llega en segundos." />
        <meta property="og:type" content="article" />
        <meta property="og:url" content="https://pagoyamx.com/recargas-telcel-efectivo" />
        <script type="application/ld+json">{JSON.stringify(breadcrumb)}</script>
        <script type="application/ld+json">{JSON.stringify(article)}</script>
        <script type="application/ld+json">{JSON.stringify(faq)}</script>
      </Helmet>

      <style>{`
        .recblog-body a { color: #1D9E75; text-decoration: underline; }
        .recblog-body a:hover { color: #17c99a; }
        .recblog-h1 { font-size: clamp(26px, 5vw, 42px); }
        .recblog-h2 { font-size: clamp(20px, 3.5vw, 26px); }
        .recblog-table { width: 100%; border-collapse: collapse; }
        .recblog-table th, .recblog-table td { padding: 10px 14px; border: 1px solid rgba(255,255,255,0.12); text-align: left; }
        .recblog-table th { background: rgba(29,158,117,0.18); color: #1D9E75; font-weight: 700; }
        .recblog-table tr:nth-child(even) td { background: rgba(255,255,255,0.03); }
        .recblog-ol { padding-left: 20px; }
        .recblog-ol li { margin-bottom: 10px; line-height: 1.6; color: #CBD5E1; }
        .recblog-ul { list-style: disc; padding-left: 22px; }
        .recblog-ul li { margin-bottom: 6px; line-height: 1.6; color: #CBD5E1; }
        @media(max-width:640px){ .recblog-table-wrap { overflow-x: auto; } }
      `}</style>

      <header style={{ background: "#0A2540", padding: "10px 20px", display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <span />
        <div style={{ display: "flex", justifyContent: "center", cursor: "pointer" }} onClick={() => navigate("/")}>
          <img src="/pagoya-logo.png" alt="PagoYa" style={{ height: "44px", width: "auto", maxWidth: "180px", objectFit: "contain" }}
            onError={(e) => { e.currentTarget.style.display = "none"; }} />
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button onClick={() => navigate("/")} style={{ background: "#1D9E75", color: "#fff", border: "none", borderRadius: "8px", padding: "8px 16px", fontWeight: 700, cursor: "pointer", fontSize: "14px" }}>
            Recargar ahora
          </button>
        </div>
      </header>

      <main className="recblog-body" style={{ flex: 1, maxWidth: "780px", margin: "0 auto", width: "100%", padding: "32px 24px 64px" }}>
        <nav style={{ marginBottom: "20px", fontSize: "13px", color: "#64748B" }}>
          <a href="/" style={{ color: "#1D9E75", textDecoration: "none" }}>Inicio</a> {" › "}
          <a href="/guia-pagar-servicios-sin-cuenta-bancaria" style={{ color: "#1D9E75", textDecoration: "none" }}>Guías</a> {" › "}
          <span>Recargas Telcel con efectivo</span>
        </nav>

        <h1 className="recblog-h1" style={{ color: "#fff", fontWeight: 800, lineHeight: 1.15, marginBottom: "16px" }}>
          Recargas Telcel con efectivo<br />
          <span style={{ color: "#1D9E75" }}>sin tarjeta ni banco</span>
        </h1>
        <p style={{ color: "#64748B", fontSize: "13px", marginBottom: "24px" }}>Actualizado: mayo 2026 · Lectura: 3 minutos</p>

        <p style={{ color: "#94A3B8", fontSize: "17px", lineHeight: 1.7, marginBottom: "28px" }}>
          Telcel tiene más de 80 millones de usuarios en México — y la mayoría paga sus recargas en efectivo. Con PagoYa puedes hacer tu recarga Telcel desde la app en menos de 60 segundos, sin tarjeta ni cuenta bancaria, cargando efectivo en cualquier OXXO del país.
        </p>

        <h2 className="recblog-h2" style={{ color: "#fff", fontWeight: 700, marginBottom: "16px" }}>Pasos para recargar Telcel con efectivo</h2>
        <ol className="recblog-ol" style={{ marginBottom: "32px" }}>
          <li><strong style={{ color: "#e2e8f0" }}>Ve a un OXXO.</strong> Hay más de 20,000 tiendas OXXO en México. Pide cargar tu billetera PagoYa con el monto que quieres recargar más $25 MXN.</li>
          <li><strong style={{ color: "#e2e8f0" }}>Abre PagoYa.</strong> En la pantalla principal selecciona "Recargas".</li>
          <li><strong style={{ color: "#e2e8f0" }}>Elige Telcel.</strong> También puedes elegir AT&T, Movistar o cualquier otro operador.</li>
          <li><strong style={{ color: "#e2e8f0" }}>Ingresa el número de celular.</strong> Puede ser el tuyo o el de cualquier otra persona.</li>
          <li><strong style={{ color: "#e2e8f0" }}>Selecciona el monto.</strong> Elige entre los planes disponibles.</li>
          <li><strong style={{ color: "#e2e8f0" }}>Confirma.</strong> La recarga llega en menos de 60 segundos.</li>
        </ol>

        <h2 className="recblog-h2" style={{ color: "#fff", fontWeight: 700, marginBottom: "16px" }}>Planes de recarga Telcel disponibles en PagoYa</h2>
        <div className="recblog-table-wrap" style={{ marginBottom: "32px" }}>
          <table className="recblog-table">
            <thead><tr><th>Monto</th><th>Vigencia</th><th>Datos</th><th>Llamadas</th></tr></thead>
            <tbody>
              {planes.map(p => (
                <tr key={p.monto}>
                  <td><strong style={{ color: "#1D9E75" }}>{p.monto}</strong></td>
                  <td style={{ color: "#CBD5E1" }}>{p.vigencia}</td>
                  <td style={{ color: "#CBD5E1" }}>{p.datos}</td>
                  <td style={{ color: "#CBD5E1" }}>{p.llamadas}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{ color: "#64748B", fontSize: "12px", marginBottom: "32px" }}>* Los planes pueden variar. PagoYa muestra los planes actuales de Telcel al momento del pago.</p>

        <h2 className="recblog-h2" style={{ color: "#fff", fontWeight: 700, marginBottom: "16px" }}>¿Por qué recargar Telcel con PagoYa y no en OXXO directo?</h2>
        <ul className="recblog-ul" style={{ marginBottom: "32px" }}>
          <li><strong style={{ color: "#e2e8f0" }}>Sin fila.</strong> Cargas en OXXO una sola vez y recargas cuantas veces quieras desde la app.</li>
          <li><strong style={{ color: "#e2e8f0" }}>Puedes recargar el celular de otros.</strong> Ingresa cualquier número, desde donde estés.</li>
          <li><strong style={{ color: "#e2e8f0" }}>Historial completo.</strong> Todas tus recargas quedan guardadas en la app.</li>
          <li><strong style={{ color: "#e2e8f0" }}>Sin mínimo.</strong> Recarga desde $50 MXN.</li>
        </ul>

        <h2 className="recblog-h2" style={{ color: "#fff", fontWeight: 700, marginBottom: "16px" }}>Preguntas frecuentes</h2>
        {[
          ["¿Cómo recargo Telcel con efectivo?", "Deposita en OXXO para cargar tu billetera PagoYa, elige Recargas > Telcel en la app, ingresa el número y confirma. Menos de 60 segundos."],
          ["¿Cuánto cuesta la comisión?", "$25 MXN fijos por recarga, sin importar el monto."],
          ["¿Puedo recargar a otra persona?", "Sí, ingresa cualquier número de celular mexicano."],
          ["¿Qué pasa si la recarga no llega?", "PagoYa tiene soporte 24/7. Si la recarga no llega en 5 minutos, contáctanos y te resolvemos inmediatamente."],
        ].map(([q, a]) => (
          <div key={q} style={{ marginBottom: "16px", background: "rgba(255,255,255,0.03)", borderRadius: "10px", padding: "16px 20px", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ color: "#e2e8f0", fontWeight: 700, marginBottom: "8px", fontSize: "15px" }}>{q}</div>
            <div style={{ color: "#94A3B8", lineHeight: 1.7, fontSize: "14px" }}>{a}</div>
          </div>
        ))}

        <div style={{ marginTop: "40px", background: "rgba(29,158,117,0.12)", border: "1px solid rgba(29,158,117,0.3)", borderRadius: "14px", padding: "28px 24px", textAlign: "center" }}>
          <div style={{ color: "#fff", fontSize: "22px", fontWeight: 800, marginBottom: "8px" }}>Recarga Telcel ahora</div>
          <div style={{ color: "#94A3B8", marginBottom: "20px" }}>Con efectivo, en 60 segundos.</div>
          <button onClick={() => navigate("/")} style={{ background: "#1D9E75", color: "#fff", border: "none", borderRadius: "10px", padding: "14px 36px", fontSize: "16px", fontWeight: 700, cursor: "pointer" }}>
            Ir a PagoYa →
          </button>
        </div>

        <div style={{ marginTop: "32px", paddingTop: "24px", borderTop: "1px solid rgba(255,255,255,0.08)", fontSize: "13px", color: "#475569" }}>
          <strong style={{ color: "#64748B" }}>También te puede interesar: </strong>
          <a href="/recargas">Recargas AT&T y Movistar</a> · <a href="/pagar-cfe">Pagar CFE</a> · <a href="/guia-pagar-servicios-sin-cuenta-bancaria">Guía sin banco</a>
        </div>
      </main>
    </div>
  );
}
