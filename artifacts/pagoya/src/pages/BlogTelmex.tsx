import { Helmet } from "react-helmet-async";
import { useLocation } from "wouter";

export default function BlogTelmex() {
  const [, navigate] = useLocation();

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Inicio", "item": "https://pagoyamx.com/" },
      { "@type": "ListItem", "position": 2, "name": "Guías", "item": "https://pagoyamx.com/guia-pagar-servicios-sin-cuenta-bancaria" },
      { "@type": "ListItem", "position": 3, "name": "Pagar Telmex sin tarjeta", "item": "https://pagoyamx.com/pagar-telmex-sin-tarjeta" }
    ]
  };

  const article = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "Cómo pagar Telmex, Izzi y Totalplay sin tarjeta ni cuenta bancaria",
    "description": "Guía paso a paso para pagar tu recibo de Telmex, Izzi o Totalplay sin tarjeta de crédito, débito ni cuenta bancaria. Solo necesitas tu celular y efectivo en OXXO.",
    "url": "https://pagoyamx.com/pagar-telmex-sin-tarjeta",
    "datePublished": "2026-05-17",
    "publisher": { "@type": "Organization", "name": "PagoYa", "url": "https://pagoyamx.com" },
    "inLanguage": "es"
  };

  const faq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "¿Puedo pagar Telmex sin tarjeta de crédito o débito?",
        "acceptedAnswer": { "@type": "Answer", "text": "Sí. Con PagoYa puedes pagar Telmex cargando tu billetera con efectivo en cualquier OXXO de México. No necesitas tarjeta ni cuenta bancaria." }
      },
      {
        "@type": "Question",
        "name": "¿Cuánto cuesta pagar Telmex con PagoYa?",
        "acceptedAnswer": { "@type": "Answer", "text": "PagoYa cobra una comisión fija de $25 MXN por transacción, independientemente del monto del recibo de Telmex." }
      },
      {
        "@type": "Question",
        "name": "¿Con qué número pago Telmex en PagoYa?",
        "acceptedAnswer": { "@type": "Answer", "text": "Usa el número de cuenta Telmex de 10 dígitos que aparece en tu recibo mensual, en la parte superior derecha." }
      }
    ]
  };

  return (
    <div style={{ background: "#0A2540", minHeight: "100vh", display: "flex", flexDirection: "column", overflowX: "hidden" }}>
      <Helmet>
        <html lang="es-MX" />
        <title>Cómo Pagar Telmex Sin Tarjeta ni Banco | PagoYa</title>
        <meta name="description" content="Guía paso a paso para pagar tu recibo de Telmex, Izzi o Totalplay sin tarjeta de crédito ni cuenta bancaria. Solo tu celular y efectivo en OXXO." />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://pagoyamx.com/pagar-telmex-sin-tarjeta" />
        <link rel="alternate" hrefLang="es-MX" href="https://pagoyamx.com/pagar-telmex-sin-tarjeta" />
        <link rel="alternate" hrefLang="x-default" href="https://pagoyamx.com/pagar-telmex-sin-tarjeta" />
        <meta name="geo.region" content="MX" />
        <meta name="geo.placename" content="México" />
        <meta property="og:title" content="Cómo Pagar Telmex Sin Tarjeta ni Banco | PagoYa" />
        <meta property="og:description" content="Paga Telmex, Izzi o Totalplay sin tarjeta ni cuenta bancaria. Solo necesitas tu celular y efectivo en OXXO." />
        <meta property="og:type" content="article" />
        <meta property="og:url" content="https://pagoyamx.com/pagar-telmex-sin-tarjeta" />
        <script type="application/ld+json">{JSON.stringify(breadcrumb)}</script>
        <script type="application/ld+json">{JSON.stringify(article)}</script>
        <script type="application/ld+json">{JSON.stringify(faq)}</script>
      </Helmet>

      <style>{`
        .tmblog-body a { color: #1D9E75; text-decoration: underline; }
        .tmblog-body a:hover { color: #17c99a; }
        .tmblog-h1 { font-size: clamp(26px, 5vw, 42px); }
        .tmblog-h2 { font-size: clamp(20px, 3.5vw, 26px); }
        .tmblog-table { width: 100%; border-collapse: collapse; }
        .tmblog-table th, .tmblog-table td { padding: 10px 14px; border: 1px solid rgba(255,255,255,0.12); text-align: left; vertical-align: top; }
        .tmblog-table th { background: rgba(29,158,117,0.18); color: #1D9E75; font-weight: 700; }
        .tmblog-table tr:nth-child(even) td { background: rgba(255,255,255,0.03); }
        .tmblog-ol { padding-left: 20px; }
        .tmblog-ol li { margin-bottom: 10px; line-height: 1.6; color: #CBD5E1; }
        .tmblog-ul { list-style: disc; padding-left: 22px; }
        .tmblog-ul li { margin-bottom: 6px; line-height: 1.6; color: #CBD5E1; }
        @media(max-width:640px){ .tmblog-table-wrap { overflow-x: auto; } .tmblog-body { padding: 0 16px 48px; } }
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

      <main className="tmblog-body" style={{ flex: 1, maxWidth: "780px", margin: "0 auto", width: "100%", padding: "32px 24px 64px" }}>
        <nav style={{ marginBottom: "20px", fontSize: "13px", color: "#64748B" }}>
          <a href="/" style={{ color: "#1D9E75", textDecoration: "none" }}>Inicio</a>
          {" › "}
          <a href="/guia-pagar-servicios-sin-cuenta-bancaria" style={{ color: "#1D9E75", textDecoration: "none" }}>Guías</a>
          {" › "}
          <span>Pagar Telmex sin tarjeta</span>
        </nav>

        <h1 className="tmblog-h1" style={{ color: "#fff", fontWeight: 800, lineHeight: 1.15, marginBottom: "16px" }}>
          Cómo pagar Telmex, Izzi y Totalplay<br />
          <span style={{ color: "#1D9E75" }}>sin tarjeta ni cuenta bancaria</span>
        </h1>
        <p style={{ color: "#64748B", fontSize: "13px", marginBottom: "24px" }}>Actualizado: mayo 2026 · Lectura: 4 minutos</p>

        <p style={{ color: "#94A3B8", fontSize: "17px", lineHeight: 1.7, marginBottom: "28px" }}>
          Pagar el servicio de internet o telefonía sin tarjeta ni banco es más fácil de lo que crees. Esta guía cubre Telmex, Izzi, Totalplay, Megacable y Sky — todos los proveedores principales de México — y te explica exactamente cómo hacerlo en menos de 3 minutos.
        </p>

        <h2 className="tmblog-h2" style={{ color: "#fff", fontWeight: 700, marginBottom: "16px" }}>¿Qué necesitas para pagar Telmex sin tarjeta?</h2>
        <ul className="tmblog-ul" style={{ marginBottom: "28px" }}>
          <li>Tu <strong style={{ color: "#e2e8f0" }}>número de cuenta Telmex</strong> (10 dígitos, en la parte superior del recibo)</li>
          <li>Tu <strong style={{ color: "#e2e8f0" }}>celular con PagoYa</strong> instalado</li>
          <li><strong style={{ color: "#e2e8f0" }}>Efectivo</strong> para cargar tu billetera en OXXO</li>
        </ul>

        <h2 className="tmblog-h2" style={{ color: "#fff", fontWeight: 700, marginBottom: "16px" }}>Paso a paso: pagar Telmex con PagoYa</h2>
        <ol className="tmblog-ol" style={{ marginBottom: "32px" }}>
          <li><strong style={{ color: "#e2e8f0" }}>Carga tu billetera en OXXO.</strong> Ve a cualquier OXXO y pide cargar tu billetera PagoYa con el monto de tu recibo más $25 MXN de comisión.</li>
          <li><strong style={{ color: "#e2e8f0" }}>Abre PagoYa y selecciona "Pagar Servicios".</strong> En el listado de proveedores, elige Telmex (o Izzi, Totalplay, etc.).</li>
          <li><strong style={{ color: "#e2e8f0" }}>Ingresa tu número de cuenta.</strong> Para Telmex son 10 dígitos. Para Izzi y Totalplay, usa el número de contrato de tu recibo.</li>
          <li><strong style={{ color: "#e2e8f0" }}>Verifica el monto y el titular.</strong> La app muestra el nombre registrado en la cuenta antes de confirmar.</li>
          <li><strong style={{ color: "#e2e8f0" }}>Confirma el pago.</strong> Recibes folio de confirmación en pantalla al instante.</li>
        </ol>

        <h2 className="tmblog-h2" style={{ color: "#fff", fontWeight: 700, marginBottom: "16px" }}>¿Dónde encuentro mi número de cuenta Telmex?</h2>
        <p style={{ color: "#94A3B8", lineHeight: 1.7, marginBottom: "28px" }}>
          Tu número de cuenta aparece en el recibo mensual de Telmex en la esquina superior derecha, debajo de "Número de cuenta". También lo encuentras en la app Telmex o en la página de telmex.com iniciando sesión con tu teléfono o correo registrado.
        </p>

        <h2 className="tmblog-h2" style={{ color: "#fff", fontWeight: 700, marginBottom: "16px" }}>Comparativa: formas de pagar Telmex en México</h2>
        <div className="tmblog-table-wrap" style={{ marginBottom: "32px" }}>
          <table className="tmblog-table">
            <thead>
              <tr><th>Método</th><th>¿Requiere tarjeta?</th><th>Tiempo</th><th>Disponible 24/7</th></tr>
            </thead>
            <tbody>
              <tr><td><strong style={{ color: "#1D9E75" }}>PagoYa</strong></td><td>No</td><td>2 min</td><td>✅ Sí</td></tr>
              <tr><td>Telmex.com</td><td>Sí (tarjeta o banco)</td><td>5 min</td><td>✅ Sí</td></tr>
              <tr><td>OXXO pago directo</td><td>No</td><td>10–20 min (fila)</td><td>Parcialmente</td></tr>
              <tr><td>Banco (SPEI)</td><td>Requiere cuenta</td><td>5 min</td><td>✅ Sí</td></tr>
              <tr><td>Sucursal Telmex</td><td>No</td><td>30–60 min</td><td>❌ No</td></tr>
            </tbody>
          </table>
        </div>

        <h2 className="tmblog-h2" style={{ color: "#fff", fontWeight: 700, marginBottom: "16px" }}>¿Funciona para Izzi, Totalplay, Megacable y Sky?</h2>
        <p style={{ color: "#94A3B8", lineHeight: 1.7, marginBottom: "16px" }}>
          Sí. PagoYa soporta los principales proveedores de internet y TV de cable en México:
        </p>
        <ul className="tmblog-ul" style={{ marginBottom: "32px" }}>
          {["Telmex (internet + teléfono fijo)", "Izzi (internet + TV)", "Totalplay (internet + TV + streaming)", "Megacable (internet + TV)", "Sky (TV satelital)", "Axtel (internet empresarial y residencial)"].map(p => <li key={p}>{p}</li>)}
        </ul>

        <h2 className="tmblog-h2" style={{ color: "#fff", fontWeight: 700, marginBottom: "16px" }}>Preguntas frecuentes</h2>
        {[
          ["¿Puedo pagar Telmex sin tarjeta de crédito o débito?", "Sí. Con PagoYa cargas tu billetera con efectivo en OXXO y pagas desde la app. Sin tarjeta."],
          ["¿Cuánto cuesta pagar Telmex con PagoYa?", "Comisión fija de $25 MXN por transacción, sin importar el monto del recibo."],
          ["¿Con qué número pago Telmex?", "El número de cuenta de 10 dígitos que aparece en la parte superior de tu recibo mensual."],
          ["¿El pago queda registrado inmediatamente?", "Sí. PagoYa procesa el pago en tiempo real. Telmex actualiza el estatus en su sistema en minutos."],
        ].map(([q, a]) => (
          <div key={q} style={{ marginBottom: "16px", background: "rgba(255,255,255,0.03)", borderRadius: "10px", padding: "16px 20px", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ color: "#e2e8f0", fontWeight: 700, marginBottom: "8px", fontSize: "15px" }}>{q}</div>
            <div style={{ color: "#94A3B8", lineHeight: 1.7, fontSize: "14px" }}>{a}</div>
          </div>
        ))}

        <div style={{ marginTop: "40px", background: "rgba(29,158,117,0.12)", border: "1px solid rgba(29,158,117,0.3)", borderRadius: "14px", padding: "28px 24px", textAlign: "center" }}>
          <div style={{ color: "#fff", fontSize: "22px", fontWeight: 800, marginBottom: "8px" }}>Paga tu Telmex ahora</div>
          <div style={{ color: "#94A3B8", marginBottom: "20px" }}>Sin tarjeta. Sin banco. En 2 minutos.</div>
          <button onClick={() => navigate("/")} style={{ background: "#1D9E75", color: "#fff", border: "none", borderRadius: "10px", padding: "14px 36px", fontSize: "16px", fontWeight: 700, cursor: "pointer" }}>
            Ir a PagoYa →
          </button>
        </div>

        <div style={{ marginTop: "32px", paddingTop: "24px", borderTop: "1px solid rgba(255,255,255,0.08)", fontSize: "13px", color: "#475569" }}>
          <strong style={{ color: "#64748B" }}>También te puede interesar: </strong>
          <a href="/pagar-telmex">Guía completa Telmex</a> · <a href="/pagar-cfe">Pagar CFE</a> · <a href="/recargas">Recargas celular</a> · <a href="/guia-pagar-servicios-sin-cuenta-bancaria">Guía general sin banco</a>
        </div>
      </main>
    </div>
  );
}
