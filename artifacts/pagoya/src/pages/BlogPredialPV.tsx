import { Helmet } from "react-helmet-async";
import { useLocation } from "wouter";

export default function BlogPredialPV() {
  const [, navigate] = useLocation();

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Inicio", "item": "https://pagoyamx.com/" },
      { "@type": "ListItem", "position": 2, "name": "Guías", "item": "https://pagoyamx.com/guia-pagar-servicios-sin-cuenta-bancaria" },
      { "@type": "ListItem", "position": 3, "name": "Pagar predial Puerto Vallarta", "item": "https://pagoyamx.com/pagar-predial-puerto-vallarta" }
    ]
  };

  const article = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "Cómo pagar el predial en Puerto Vallarta sin filas en 2026",
    "description": "Guía completa para pagar tu predial en Puerto Vallarta. Métodos en línea, fechas de descuento, sin filas y desde tu celular.",
    "url": "https://pagoyamx.com/pagar-predial-puerto-vallarta",
    "datePublished": "2026-05-20",
    "publisher": { "@type": "Organization", "name": "PagoYa", "url": "https://pagoyamx.com" },
    "inLanguage": "es"
  };

  const faq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      { "@type": "Question", "name": "¿Cuándo hay descuento por pronto pago del predial en Puerto Vallarta?", "acceptedAnswer": { "@type": "Answer", "text": "El municipio de Puerto Vallarta típicamente ofrece descuentos de hasta 15% en enero y febrero por pago anticipado. Las fechas exactas se publican cada año en el sitio del municipio." } },
      { "@type": "Question", "name": "¿Puedo pagar el predial de Puerto Vallarta en línea?", "acceptedAnswer": { "@type": "Answer", "text": "Sí. El municipio de Puerto Vallarta cuenta con portal de pagos en línea. También puedes pagar con PagoYa desde tu celular sin necesidad de ir a las oficinas municipales." } },
      { "@type": "Question", "name": "¿Qué datos necesito para pagar el predial en Puerto Vallarta?", "acceptedAnswer": { "@type": "Answer", "text": "Necesitas la clave catastral de tu propiedad, que aparece en el recibo del predial del año anterior o en el estado de cuenta municipal." } },
      { "@type": "Question", "name": "¿Qué pasa si no pago el predial en Puerto Vallarta?", "acceptedAnswer": { "@type": "Answer", "text": "Se generan recargos del 2% mensual sobre el adeudo. Si el adeudo acumula más de 3 años, el municipio puede iniciar procedimientos de cobro coactivo sobre la propiedad." } }
    ]
  };

  return (
    <div style={{ background: "#0A2540", minHeight: "100vh", display: "flex", flexDirection: "column", overflowX: "hidden" }}>
      <Helmet>
        <html lang="es" />
        <title>Cómo Pagar el Predial en Puerto Vallarta sin Filas | PagoYa</title>
        <meta name="description" content="Guía completa para pagar tu predial en Puerto Vallarta en 2026. Pago en línea, descuentos por pronto pago, clave catastral y cómo evitar las filas en tesorería municipal." />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://pagoyamx.com/pagar-predial-puerto-vallarta" />
        <meta property="og:title" content="Pagar Predial en Puerto Vallarta sin Filas | PagoYa" />
        <meta property="og:description" content="Cómo pagar el predial en Puerto Vallarta en línea. Descuentos, fechas clave y paso a paso sin ir a las oficinas municipales." />
        <meta property="og:type" content="article" />
        <meta property="og:url" content="https://pagoyamx.com/pagar-predial-puerto-vallarta" />
        <script type="application/ld+json">{JSON.stringify(breadcrumb)}</script>
        <script type="application/ld+json">{JSON.stringify(article)}</script>
        <script type="application/ld+json">{JSON.stringify(faq)}</script>
      </Helmet>

      <style>{`
        .predial-body a { color: #1D9E75; text-decoration: underline; }
        .predial-body a:hover { color: #17c99a; }
        .predial-h1 { font-size: clamp(26px, 5vw, 42px); }
        .predial-h2 { font-size: clamp(20px, 3.5vw, 26px); }
        .predial-table { width: 100%; border-collapse: collapse; }
        .predial-table th, .predial-table td { padding: 10px 14px; border: 1px solid rgba(255,255,255,0.12); text-align: left; vertical-align: top; }
        .predial-table th { background: rgba(29,158,117,0.18); color: #1D9E75; font-weight: 700; }
        .predial-table tr:nth-child(even) td { background: rgba(255,255,255,0.03); }
        .predial-ol { padding-left: 20px; }
        .predial-ol li { margin-bottom: 10px; line-height: 1.6; color: #CBD5E1; }
        .predial-ul { list-style: disc; padding-left: 22px; }
        .predial-ul li { margin-bottom: 6px; line-height: 1.6; color: #CBD5E1; }
        @media(max-width:640px){ .predial-table-wrap { overflow-x: auto; } }
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

      <main className="predial-body" style={{ flex: 1, maxWidth: "780px", margin: "0 auto", width: "100%", padding: "32px 24px 64px" }}>
        <nav style={{ marginBottom: "20px", fontSize: "13px", color: "#64748B" }}>
          <a href="/" style={{ color: "#1D9E75", textDecoration: "none" }}>Inicio</a> {" › "}
          <a href="/guia-pagar-servicios-sin-cuenta-bancaria" style={{ color: "#1D9E75", textDecoration: "none" }}>Guías</a> {" › "}
          <span>Predial Puerto Vallarta</span>
        </nav>

        <h1 className="predial-h1" style={{ color: "#fff", fontWeight: 800, lineHeight: 1.15, marginBottom: "16px" }}>
          Cómo pagar el predial<br />
          <span style={{ color: "#1D9E75" }}>en Puerto Vallarta sin filas</span>
        </h1>
        <p style={{ color: "#64748B", fontSize: "13px", marginBottom: "24px" }}>Actualizado: mayo 2026 · Lectura: 6 minutos</p>

        <p style={{ color: "#94A3B8", fontSize: "17px", lineHeight: 1.7, marginBottom: "28px" }}>
          El predial en Puerto Vallarta es uno de los trámites más postergados por los propietarios de la zona. Las filas en la Tesorería Municipal, los horarios limitados y la falta de opciones de pago digital hacen que muchos acumulen adeudos con recargos evitables. Esta guía explica cómo pagar el predial sin salir de casa, aprovechar los descuentos por pronto pago y evitar penalizaciones.
        </p>

        <h2 className="predial-h2" style={{ color: "#fff", fontWeight: 700, marginBottom: "16px" }}>¿Qué es el predial y quién lo cobra en Puerto Vallarta?</h2>
        <p style={{ color: "#94A3B8", lineHeight: 1.7, marginBottom: "28px" }}>
          El predial es el impuesto anual sobre la propiedad inmobiliaria. En Puerto Vallarta lo administra la <strong style={{ color: "#e2e8f0" }}>Tesorería Municipal del H. Ayuntamiento de Puerto Vallarta, Jalisco</strong>. Se calcula sobre el valor catastral de tu propiedad y se cobra anualmente, con la opción de pago en dos parcialidades.
        </p>

        <h2 className="predial-h2" style={{ color: "#fff", fontWeight: 700, marginBottom: "16px" }}>Descuentos por pronto pago — fechas clave</h2>
        <div className="predial-table-wrap" style={{ marginBottom: "32px" }}>
          <table className="predial-table">
            <thead><tr><th>Mes de pago</th><th>Descuento típico</th><th>Nota</th></tr></thead>
            <tbody>
              <tr><td>Enero</td><td style={{ color: "#1D9E75" }}>Hasta 15%</td><td style={{ color: "#CBD5E1" }}>Mayor descuento del año</td></tr>
              <tr><td>Febrero</td><td style={{ color: "#1D9E75" }}>Hasta 10%</td><td style={{ color: "#CBD5E1" }}>Pronto pago vigente</td></tr>
              <tr><td>Marzo</td><td style={{ color: "#fbbf24" }}>Hasta 5%</td><td style={{ color: "#CBD5E1" }}>Último mes con beneficio</td></tr>
              <tr><td>Abril–diciembre</td><td style={{ color: "#ef4444" }}>Sin descuento</td><td style={{ color: "#CBD5E1" }}>Tarifa base + posibles recargos</td></tr>
            </tbody>
          </table>
        </div>
        <p style={{ color: "#94A3B8", lineHeight: 1.7, marginBottom: "28px", fontSize: "13px", fontStyle: "italic" }}>
          * Los porcentajes exactos los publica el municipio cada enero. Consulta el sitio oficial del Ayuntamiento de Puerto Vallarta o llama al (322) 226-0001 para confirmar los descuentos vigentes.
        </p>

        <h2 className="predial-h2" style={{ color: "#fff", fontWeight: 700, marginBottom: "16px" }}>Qué datos necesitas para pagar</h2>
        <ul className="predial-ul" style={{ marginBottom: "28px" }}>
          <li><strong style={{ color: "#e2e8f0" }}>Clave catastral</strong> — número único de tu propiedad, aparece en el recibo del año anterior</li>
          <li><strong style={{ color: "#e2e8f0" }}>Nombre del propietario</strong> — tal como aparece en escrituras</li>
          <li><strong style={{ color: "#e2e8f0" }}>Dirección completa del inmueble</strong></li>
          <li><strong style={{ color: "#e2e8f0" }}>Monto a pagar</strong> — puedes consultarlo en el portal municipal o llamando a la Tesorería</li>
        </ul>

        <h2 className="predial-h2" style={{ color: "#fff", fontWeight: 700, marginBottom: "16px" }}>Cómo pagar el predial de Puerto Vallarta con PagoYa</h2>
        <ol className="predial-ol" style={{ marginBottom: "32px" }}>
          <li><strong style={{ color: "#e2e8f0" }}>Entra a PagoYa y busca "Predial Puerto Vallarta".</strong> El sistema identifica el servicio municipal automáticamente.</li>
          <li><strong style={{ color: "#e2e8f0" }}>Ingresa tu clave catastral.</strong> PagoYa consulta el adeudo vigente en tiempo real.</li>
          <li><strong style={{ color: "#e2e8f0" }}>Confirma el monto.</strong> Verifica que incluya cualquier descuento aplicable.</li>
          <li><strong style={{ color: "#e2e8f0" }}>Paga con tu saldo PagoYa o SPEI.</strong> El comprobante se genera al instante.</li>
          <li><strong style={{ color: "#e2e8f0" }}>Guarda el comprobante.</strong> Sirve como constancia de pago ante cualquier autoridad municipal.</li>
        </ol>

        <h2 className="predial-h2" style={{ color: "#fff", fontWeight: 700, marginBottom: "16px" }}>¿Qué pasa si no pagas el predial?</h2>
        <ul className="predial-ul" style={{ marginBottom: "28px" }}>
          <li>Recargos del <strong style={{ color: "#e2e8f0" }}>2% mensual</strong> sobre el adeudo total</li>
          <li>El adeudo queda registrado en el padrón municipal de morosos</li>
          <li>Después de 3 años de mora el municipio puede iniciar <strong style={{ color: "#e2e8f0" }}>procedimiento de cobro coactivo</strong> — que incluye embargo</li>
          <li>Impedimento para obtener constancias de no adeudo (necesarias para vender o escriturar)</li>
        </ul>

        <h2 className="predial-h2" style={{ color: "#fff", fontWeight: 700, marginBottom: "16px" }}>Preguntas frecuentes</h2>
        {[
          ["¿Cuándo hay descuento por pronto pago del predial en Puerto Vallarta?", "El municipio ofrece descuentos de hasta 15% en enero, 10% en febrero y 5% en marzo. Las fechas exactas se confirman cada enero en el sitio del Ayuntamiento."],
          ["¿Puedo pagar el predial de Puerto Vallarta en línea?", "Sí. El municipio tiene portal de pagos en línea y también puedes usar PagoYa desde tu celular sin ir a las oficinas."],
          ["¿Qué datos necesito para pagar el predial en Puerto Vallarta?", "Tu clave catastral, que aparece en el recibo del año anterior o en el estado de cuenta municipal."],
          ["¿Qué pasa si no pago el predial en Puerto Vallarta?", "Se acumulan recargos del 2% mensual. Después de 3 años el municipio puede iniciar procedimientos de cobro coactivo sobre la propiedad."],
        ].map(([q, a]) => (
          <div key={q} style={{ marginBottom: "16px", background: "rgba(255,255,255,0.03)", borderRadius: "10px", padding: "16px 20px", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ color: "#e2e8f0", fontWeight: 700, marginBottom: "8px", fontSize: "15px" }}>{q}</div>
            <div style={{ color: "#94A3B8", lineHeight: 1.7, fontSize: "14px" }}>{a}</div>
          </div>
        ))}

        <div style={{ marginTop: "40px", background: "rgba(29,158,117,0.12)", border: "1px solid rgba(29,158,117,0.3)", borderRadius: "14px", padding: "28px 24px", textAlign: "center" }}>
          <div style={{ color: "#fff", fontSize: "22px", fontWeight: 800, marginBottom: "8px" }}>Paga tu predial ahora</div>
          <div style={{ color: "#94A3B8", marginBottom: "20px" }}>Sin filas · Sin ir a la tesorería · En menos de 2 minutos</div>
          <button onClick={() => navigate("/")} style={{ background: "#1D9E75", color: "#fff", border: "none", borderRadius: "10px", padding: "14px 36px", fontSize: "16px", fontWeight: 700, cursor: "pointer" }}>
            Ir a PagoYa →
          </button>
        </div>

        <div style={{ marginTop: "32px", paddingTop: "24px", borderTop: "1px solid rgba(255,255,255,0.08)", fontSize: "13px", color: "#475569" }}>
          <strong style={{ color: "#64748B" }}>También te puede interesar: </strong>
          <a href="/pagar-servicios-puerto-vallarta">Pagar servicios en Puerto Vallarta</a> · <a href="/pagar-cfe">Pagar CFE</a> · <a href="/pagar-agua-mexico">Pagar agua en México</a> · <a href="/guia-pagar-servicios-sin-cuenta-bancaria">Guía completa</a>
        </div>
      </main>
    </div>
  );
}
