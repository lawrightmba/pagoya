import { Helmet } from "react-helmet-async";
import { useLocation } from "wouter";

export default function BlogDineroElectronico() {
  const [, navigate] = useLocation();

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Inicio", "item": "https://pagoyamx.com/" },
      { "@type": "ListItem", "position": 2, "name": "Guías", "item": "https://pagoyamx.com/guia-pagar-servicios-sin-cuenta-bancaria" },
      { "@type": "ListItem", "position": 3, "name": "Qué es el dinero electrónico en México", "item": "https://pagoyamx.com/que-es-dinero-electronico-mexico" }
    ]
  };

  const article = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "Qué es una cuenta de dinero electrónico y para qué sirve en México",
    "description": "Explicación clara de qué es el dinero electrónico en México, cómo funciona, qué diferencia tiene con una cuenta bancaria y por qué es útil para personas sin banco.",
    "url": "https://pagoyamx.com/que-es-dinero-electronico-mexico",
    "datePublished": "2026-05-20",
    "publisher": { "@type": "Organization", "name": "PagoYa", "url": "https://pagoyamx.com" },
    "inLanguage": "es"
  };

  const faq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      { "@type": "Question", "name": "¿Qué es el dinero electrónico en México?", "acceptedAnswer": { "@type": "Answer", "text": "El dinero electrónico es un medio de pago digital regulado por Banxico y la CNBV. Funciona como una billetera virtual: cargas saldo con efectivo o transferencia y lo usas para pagar servicios, hacer compras o enviar dinero. No requiere cuenta bancaria tradicional." } },
      { "@type": "Question", "name": "¿Cuál es la diferencia entre dinero electrónico y una cuenta bancaria?", "acceptedAnswer": { "@type": "Answer", "text": "Una cuenta bancaria requiere historial crediticio, documentos, ir a una sucursal y genera extractos regulados por la CNBV como institución de crédito. El dinero electrónico es más simple: se abre en minutos desde el celular, tiene menos restricciones regulatorias y está diseñado para pagos del día a día, no para ahorro o crédito." } },
      { "@type": "Question", "name": "¿El dinero electrónico de PagoYa es seguro?", "acceptedAnswer": { "@type": "Answer", "text": "Sí. PagoYa procesa pagos a través de Conekta y Stripe, ambos con certificación PCI-DSS. El saldo en la billetera PagoYa no genera rendimientos (no es una cuenta de ahorro) pero está protegido por los mismos estándares técnicos que usan los principales bancos digitales." } }
    ]
  };

  return (
    <div style={{ background: "#0A2540", minHeight: "100vh", display: "flex", flexDirection: "column", overflowX: "hidden" }}>
      <Helmet>
        <html lang="es-MX" />
        <title>Qué es el Dinero Electrónico y Para Qué Sirve en México | PagoYa</title>
        <meta name="description" content="¿Qué es una cuenta de dinero electrónico en México? Cómo funciona, diferencias con una cuenta bancaria y por qué es útil para quienes no tienen banco." />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://pagoyamx.com/que-es-dinero-electronico-mexico" />
        <link rel="alternate" hrefLang="es-MX" href="https://pagoyamx.com/que-es-dinero-electronico-mexico" />
        <link rel="alternate" hrefLang="x-default" href="https://pagoyamx.com/que-es-dinero-electronico-mexico" />
        <meta name="geo.region" content="MX" />
        <meta name="geo.placename" content="México" />
        <meta property="og:title" content="Qué es el Dinero Electrónico en México | PagoYa" />
        <meta property="og:description" content="Explicación clara del dinero electrónico en México. Cómo funciona, qué lo diferencia de una cuenta bancaria y para qué sirve." />
        <meta property="og:type" content="article" />
        <meta property="og:url" content="https://pagoyamx.com/que-es-dinero-electronico-mexico" />
        <script type="application/ld+json">{JSON.stringify(breadcrumb)}</script>
        <script type="application/ld+json">{JSON.stringify(article)}</script>
        <script type="application/ld+json">{JSON.stringify(faq)}</script>
      </Helmet>

      <style>{`
        .de-body a { color: #1D9E75; text-decoration: underline; }
        .de-body a:hover { color: #17c99a; }
        .de-h1 { font-size: clamp(26px, 5vw, 42px); }
        .de-h2 { font-size: clamp(20px, 3.5vw, 26px); }
        .de-table { width: 100%; border-collapse: collapse; }
        .de-table th, .de-table td { padding: 10px 14px; border: 1px solid rgba(255,255,255,0.12); text-align: left; vertical-align: top; font-size: 13px; }
        .de-table th { background: rgba(29,158,117,0.18); color: #1D9E75; font-weight: 700; font-size: 12px; }
        .de-table tr:nth-child(even) td { background: rgba(255,255,255,0.03); }
        .de-ul { list-style: disc; padding-left: 22px; }
        .de-ul li { margin-bottom: 8px; line-height: 1.6; color: #CBD5E1; }
        @media(max-width:640px){ .de-table-wrap { overflow-x: auto; } }
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

      <main className="de-body" style={{ flex: 1, maxWidth: "780px", margin: "0 auto", width: "100%", padding: "32px 24px 64px" }}>
        <nav style={{ marginBottom: "20px", fontSize: "13px", color: "#64748B" }}>
          <a href="/" style={{ color: "#1D9E75", textDecoration: "none" }}>Inicio</a> {" › "}
          <a href="/guia-pagar-servicios-sin-cuenta-bancaria" style={{ color: "#1D9E75", textDecoration: "none" }}>Guías</a> {" › "}
          <span>Qué es el dinero electrónico</span>
        </nav>

        <h1 className="de-h1" style={{ color: "#fff", fontWeight: 800, lineHeight: 1.15, marginBottom: "16px" }}>
          Qué es una cuenta de dinero electrónico<br />
          <span style={{ color: "#1D9E75" }}>y para qué sirve en México</span>
        </h1>
        <p style={{ color: "#64748B", fontSize: "13px", marginBottom: "24px" }}>Actualizado: mayo 2026 · Lectura: 6 minutos</p>

        <p style={{ color: "#94A3B8", fontSize: "17px", lineHeight: 1.7, marginBottom: "28px" }}>
          En México, 51 millones de personas no tienen cuenta bancaria. Pero muchas de ellas sí tienen celular con acceso a internet. El dinero electrónico existe precisamente para este segmento: permite hacer pagos digitales sin los requisitos de un banco tradicional. Esta guía explica qué es, cómo funciona y por qué puede cambiar la forma en que manejas tu dinero del día a día.
        </p>

        <h2 className="de-h2" style={{ color: "#fff", fontWeight: 700, marginBottom: "16px" }}>¿Qué es el dinero electrónico?</h2>
        <p style={{ color: "#94A3B8", lineHeight: 1.7, marginBottom: "16px" }}>
          El dinero electrónico es <strong style={{ color: "#e2e8f0" }}>valor monetario almacenado en forma digital</strong>, respaldado por pesos mexicanos reales y regulado por Banxico (Banco de México). Funciona como una billetera digital:
        </p>
        <ul className="de-ul" style={{ marginBottom: "28px" }}>
          <li>Cargas saldo con efectivo en puntos autorizados (como OXXO)</li>
          <li>El saldo se almacena en tu cuenta digital</li>
          <li>Lo usas para pagar servicios, hacer compras o enviar dinero</li>
          <li>Cada peso que entras tiene que existir — no hay crédito ni deuda</li>
        </ul>

        <h2 className="de-h2" style={{ color: "#fff", fontWeight: 700, marginBottom: "16px" }}>Dinero electrónico vs cuenta bancaria — diferencias clave</h2>
        <div className="de-table-wrap" style={{ marginBottom: "32px" }}>
          <table className="de-table">
            <thead><tr><th>Característica</th><th>Dinero electrónico</th><th>Cuenta bancaria</th></tr></thead>
            <tbody>
              <tr><td>¿Requiere historial crediticio?</td><td style={{ color: "#1D9E75" }}>No</td><td style={{ color: "#ef4444" }}>A veces sí</td></tr>
              <tr><td>¿Se abre en línea?</td><td style={{ color: "#1D9E75" }}>Sí, en minutos</td><td style={{ color: "#fbbf24" }}>Depende del banco</td></tr>
              <tr><td>¿Requiere ir a una sucursal?</td><td style={{ color: "#1D9E75" }}>No</td><td style={{ color: "#ef4444" }}>Frecuentemente sí</td></tr>
              <tr><td>¿Genera intereses?</td><td style={{ color: "#ef4444" }}>No (solo pagos)</td><td style={{ color: "#1D9E75" }}>Sí (cuentas de ahorro)</td></tr>
              <tr><td>¿Permite crédito?</td><td style={{ color: "#ef4444" }}>No</td><td style={{ color: "#1D9E75" }}>Sí</td></tr>
              <tr><td>¿Sirve para pagar servicios?</td><td style={{ color: "#1D9E75" }}>Sí</td><td style={{ color: "#1D9E75" }}>Sí</td></tr>
              <tr><td>¿Sirve para enviar dinero?</td><td style={{ color: "#1D9E75" }}>Sí (SPEI)</td><td style={{ color: "#1D9E75" }}>Sí</td></tr>
              <tr><td>Regulado por</td><td style={{ color: "#CBD5E1" }}>Banxico / Ley Fintech</td><td style={{ color: "#CBD5E1" }}>CNBV / Ley de Instituciones de Crédito</td></tr>
            </tbody>
          </table>
        </div>

        <h2 className="de-h2" style={{ color: "#fff", fontWeight: 700, marginBottom: "16px" }}>¿Cómo funciona el dinero electrónico en la práctica?</h2>
        <p style={{ color: "#94A3B8", lineHeight: 1.7, marginBottom: "16px" }}>Con PagoYa, el flujo es simple:</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "32px" }}>
          {[
            ["1", "Cargas saldo con efectivo en OXXO", "Llevas efectivo, escanean un código en tu celular, y el saldo aparece en tu billetera en minutos."],
            ["2", "El saldo queda en tu billetera digital", "PagoYa guarda el saldo de forma segura. Puedes verlo en la app en cualquier momento."],
            ["3", "Usas el saldo para pagar servicios", "CFE, Telmex, agua, predial, internet — cualquier servicio que PagoYa soporte."],
            ["4", "Recibes un comprobante digital", "Cada pago genera un folio único que sirve como evidencia ante la empresa de servicio."],
          ].map(([num, title, desc]) => (
            <div key={num} style={{ display: "flex", gap: "16px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px", padding: "16px" }}>
              <div style={{ width: "32px", height: "32px", background: "#1D9E75", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: "#fff", fontSize: "14px", flexShrink: 0 }}>{num}</div>
              <div>
                <div style={{ color: "#e2e8f0", fontWeight: 700, marginBottom: "4px" }}>{title}</div>
                <div style={{ color: "#94A3B8", fontSize: "14px", lineHeight: 1.6 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>

        <h2 className="de-h2" style={{ color: "#fff", fontWeight: 700, marginBottom: "16px" }}>¿Para quién es útil el dinero electrónico?</h2>
        <ul className="de-ul" style={{ marginBottom: "28px" }}>
          <li>Personas sin cuenta bancaria que necesitan pagar servicios digitalmente</li>
          <li>Trabajadores informales que cobran en efectivo y quieren pagar en línea</li>
          <li>Personas que no confían en los bancos tradicionales o no califican para una cuenta</li>
          <li>Usuarios que quieren separar su dinero del día a día de sus ahorros</li>
          <li>Negocios pequeños que reciben efectivo y necesitan pagar a proveedores en línea</li>
        </ul>

        <h2 className="de-h2" style={{ color: "#fff", fontWeight: 700, marginBottom: "16px" }}>Marco regulatorio en México</h2>
        <p style={{ color: "#94A3B8", lineHeight: 1.7, marginBottom: "28px" }}>
          El dinero electrónico en México está regulado por la <strong style={{ color: "#e2e8f0" }}>Ley para Regular las Instituciones de Tecnología Financiera (Ley Fintech, 2018)</strong> y las disposiciones de Banxico. Las empresas que emiten o gestionan dinero electrónico deben registrarse y cumplir con estándares de seguridad, límites de saldo y reportes regulatorios. Esto protege a los usuarios frente a fraudes y cierre repentino de plataformas.
        </p>

        <h2 className="de-h2" style={{ color: "#fff", fontWeight: 700, marginBottom: "16px" }}>Preguntas frecuentes</h2>
        {[
          ["¿Qué es el dinero electrónico en México?", "Es un medio de pago digital regulado por Banxico. Funciona como billetera virtual: cargas saldo con efectivo y lo usas para pagar servicios. No requiere cuenta bancaria tradicional."],
          ["¿Cuál es la diferencia entre dinero electrónico y una cuenta bancaria?", "El dinero electrónico es más simple y accesible — sin historial crediticio, sin sucursales y abierto desde el celular en minutos. No genera intereses ni crédito, pero sirve perfectamente para pagos del día a día."],
          ["¿El dinero electrónico de PagoYa es seguro?", "Sí. PagoYa procesa pagos a través de Conekta y Stripe, ambos certificados PCI-DSS. Cada transacción genera un folio verificable."],
        ].map(([q, a]) => (
          <div key={q} style={{ marginBottom: "16px", background: "rgba(255,255,255,0.03)", borderRadius: "10px", padding: "16px 20px", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ color: "#e2e8f0", fontWeight: 700, marginBottom: "8px", fontSize: "15px" }}>{q}</div>
            <div style={{ color: "#94A3B8", lineHeight: 1.7, fontSize: "14px" }}>{a}</div>
          </div>
        ))}

        <div style={{ marginTop: "40px", background: "rgba(29,158,117,0.12)", border: "1px solid rgba(29,158,117,0.3)", borderRadius: "14px", padding: "28px 24px", textAlign: "center" }}>
          <div style={{ color: "#fff", fontSize: "22px", fontWeight: 800, marginBottom: "8px" }}>Abre tu billetera digital</div>
          <div style={{ color: "#94A3B8", marginBottom: "20px" }}>Sin banco · Sin historial crediticio · Gratis</div>
          <button onClick={() => navigate("/")} style={{ background: "#1D9E75", color: "#fff", border: "none", borderRadius: "10px", padding: "14px 36px", fontSize: "16px", fontWeight: 700, cursor: "pointer" }}>
            Ir a PagoYa →
          </button>
        </div>

        <div style={{ marginTop: "32px", paddingTop: "24px", borderTop: "1px solid rgba(255,255,255,0.08)", fontSize: "13px", color: "#475569" }}>
          <strong style={{ color: "#64748B" }}>También te puede interesar: </strong>
          <a href="/es-seguro-pagar-servicios-celular-mexico">¿Es seguro pagar desde el celular?</a> · <a href="/mejores-apps-pagar-servicios-mexico">Las mejores apps de pago</a> · <a href="/guia-pagar-servicios-sin-cuenta-bancaria">Guía completa</a>
        </div>
      </main>
    </div>
  );
}
