import { Helmet } from "react-helmet-async";
import { useLocation } from "wouter";

export default function BlogServiciosPV() {
  const [, navigate] = useLocation();

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Inicio", "item": "https://pagoyamx.com/" },
      { "@type": "ListItem", "position": 2, "name": "Guías", "item": "https://pagoyamx.com/guia-pagar-servicios-sin-cuenta-bancaria" },
      { "@type": "ListItem", "position": 3, "name": "Pagar servicios en Puerto Vallarta", "item": "https://pagoyamx.com/pagar-servicios-puerto-vallarta" }
    ]
  };

  const article = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "Cómo pagar luz, agua y gas en Puerto Vallarta desde tu celular",
    "description": "Guía completa para pagar CFE, agua potable SEAPAL y gas en Puerto Vallarta desde tu celular, sin filas y sin necesidad de cuenta bancaria.",
    "url": "https://pagoyamx.com/pagar-servicios-puerto-vallarta",
    "datePublished": "2026-05-20",
    "publisher": { "@type": "Organization", "name": "PagoYa", "url": "https://pagoyamx.com" },
    "inLanguage": "es"
  };

  const faq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      { "@type": "Question", "name": "¿Cómo pago el agua en Puerto Vallarta?", "acceptedAnswer": { "@type": "Answer", "text": "El servicio de agua en Puerto Vallarta lo opera SEAPAL Vallarta. Puedes pagar en línea desde su portal, en OXXO, o con PagoYa desde tu celular usando tu número de contrato SEAPAL." } },
      { "@type": "Question", "name": "¿Cómo pago CFE en Puerto Vallarta sin ir a la oficina?", "acceptedAnswer": { "@type": "Answer", "text": "Puedes pagar tu recibo CFE en Puerto Vallarta con PagoYa desde tu celular en menos de 2 minutos. Solo necesitas tu número de servicio CFE. También puedes pagar en cualquier OXXO o 7-Eleven." } },
      { "@type": "Question", "name": "¿Dónde pago el gas en Puerto Vallarta?", "acceptedAnswer": { "@type": "Answer", "text": "Dependiendo de tu proveedor de gas (Tomza, Zeta Gas, Gas Express Nieto u otro), puedes pagar en línea, por teléfono o con PagoYa. La mayoría de los proveedores de gas LP en la Bahía de Banderas aceptan pagos digitales." } }
    ]
  };

  const services = [
    { name: "CFE (Luz)", provider: "CFE — Comisión Federal de Electricidad", data: "Número de servicio CFE (en el recibo)", where: "PagoYa, OXXO, 7-Eleven, portal CFE", time: "Inmediato a 24 hrs", cost: "$15 MXN con PagoYa" },
    { name: "Agua", provider: "SEAPAL Vallarta", data: "Número de contrato SEAPAL", where: "PagoYa, portal SEAPAL, OXXO", time: "1–48 horas", cost: "$15 MXN con PagoYa" },
    { name: "Gas LP", provider: "Tomza, Zeta Gas, Gas Express u otro", data: "Número de cliente", where: "PagoYa, teléfono, portal del proveedor", time: "Inmediato", cost: "$15 MXN con PagoYa" },
    { name: "Internet / Cable", provider: "Telmex, Izzi, Totalplay, Sky", data: "Número de cuenta del servicio", where: "PagoYa, OXXO, portales de cada empresa", time: "1–24 horas", cost: "$15 MXN con PagoYa" },
    { name: "Predial", provider: "Tesorería Municipal de Puerto Vallarta", data: "Clave catastral", where: "PagoYa, portal municipal, tesorería", time: "24–72 horas", cost: "$15 MXN con PagoYa" },
  ];

  return (
    <div style={{ background: "#0A2540", minHeight: "100vh", display: "flex", flexDirection: "column", overflowX: "hidden" }}>
      <Helmet>
        <html lang="es" />
        <title>Cómo Pagar Luz, Agua y Gas en Puerto Vallarta desde tu Celular | PagoYa</title>
        <meta name="description" content="Guía completa para pagar CFE, agua SEAPAL, gas y más servicios en Puerto Vallarta desde tu celular. Sin filas, sin banco, en menos de 2 minutos." />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://pagoyamx.com/pagar-servicios-puerto-vallarta" />
        <meta property="og:title" content="Pagar Luz, Agua y Gas en Puerto Vallarta desde tu Celular | PagoYa" />
        <meta property="og:description" content="CFE, agua SEAPAL, gas, internet y predial en Puerto Vallarta. Paga todo desde el celular sin ir a ninguna oficina." />
        <meta property="og:type" content="article" />
        <meta property="og:url" content="https://pagoyamx.com/pagar-servicios-puerto-vallarta" />
        <script type="application/ld+json">{JSON.stringify(breadcrumb)}</script>
        <script type="application/ld+json">{JSON.stringify(article)}</script>
        <script type="application/ld+json">{JSON.stringify(faq)}</script>
      </Helmet>

      <style>{`
        .pv-body a { color: #1D9E75; text-decoration: underline; }
        .pv-body a:hover { color: #17c99a; }
        .pv-h1 { font-size: clamp(26px, 5vw, 42px); }
        .pv-h2 { font-size: clamp(20px, 3.5vw, 26px); }
        .pv-table { width: 100%; border-collapse: collapse; }
        .pv-table th, .pv-table td { padding: 10px 14px; border: 1px solid rgba(255,255,255,0.12); text-align: left; vertical-align: top; font-size: 13px; }
        .pv-table th { background: rgba(29,158,117,0.18); color: #1D9E75; font-weight: 700; font-size: 12px; }
        .pv-table tr:nth-child(even) td { background: rgba(255,255,255,0.03); }
        .pv-ol { padding-left: 20px; }
        .pv-ol li { margin-bottom: 10px; line-height: 1.6; color: #CBD5E1; }
        .pv-ul { list-style: disc; padding-left: 22px; }
        .pv-ul li { margin-bottom: 6px; line-height: 1.6; color: #CBD5E1; }
        @media(max-width:640px){ .pv-table-wrap { overflow-x: auto; } }
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

      <main className="pv-body" style={{ flex: 1, maxWidth: "780px", margin: "0 auto", width: "100%", padding: "32px 24px 64px" }}>
        <nav style={{ marginBottom: "20px", fontSize: "13px", color: "#64748B" }}>
          <a href="/" style={{ color: "#1D9E75", textDecoration: "none" }}>Inicio</a> {" › "}
          <a href="/guia-pagar-servicios-sin-cuenta-bancaria" style={{ color: "#1D9E75", textDecoration: "none" }}>Guías</a> {" › "}
          <span>Pagar servicios en Puerto Vallarta</span>
        </nav>

        <h1 className="pv-h1" style={{ color: "#fff", fontWeight: 800, lineHeight: 1.15, marginBottom: "16px" }}>
          Cómo pagar luz, agua y gas<br />
          <span style={{ color: "#1D9E75" }}>en Puerto Vallarta desde tu celular</span>
        </h1>
        <p style={{ color: "#64748B", fontSize: "13px", marginBottom: "24px" }}>Actualizado: mayo 2026 · Lectura: 6 minutos</p>

        <p style={{ color: "#94A3B8", fontSize: "17px", lineHeight: 1.7, marginBottom: "28px" }}>
          Puerto Vallarta tiene una particularidad: muchos de sus residentes — desde colonias como Pitillal, Versalles y el Centro hasta zonas de la Bahía de Banderas — no tienen cuenta bancaria pero pagan sus servicios puntualmente. Esta guía resume cómo pagar todos los servicios básicos en Puerto Vallarta desde el celular, sin filas y sin ir a ninguna oficina.
        </p>

        <h2 className="pv-h2" style={{ color: "#fff", fontWeight: 700, marginBottom: "16px" }}>Servicios básicos en Puerto Vallarta — guía rápida</h2>
        <div className="pv-table-wrap" style={{ marginBottom: "32px" }}>
          <table className="pv-table">
            <thead>
              <tr><th>Servicio</th><th>Proveedor</th><th>Dato requerido</th><th>Dónde pagar</th><th>Costo (PagoYa)</th></tr>
            </thead>
            <tbody>
              {services.map(s => (
                <tr key={s.name}>
                  <td><strong>{s.name}</strong></td>
                  <td style={{ color: "#CBD5E1" }}>{s.provider}</td>
                  <td style={{ color: "#CBD5E1" }}>{s.data}</td>
                  <td style={{ color: "#CBD5E1" }}>{s.where}</td>
                  <td style={{ color: "#1D9E75" }}>{s.cost}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 className="pv-h2" style={{ color: "#fff", fontWeight: 700, marginBottom: "16px" }}>Cómo pagar la luz (CFE) en Puerto Vallarta</h2>
        <p style={{ color: "#94A3B8", lineHeight: 1.7, marginBottom: "16px" }}>
          Puerto Vallarta está en la <strong style={{ color: "#e2e8f0" }}>División Jalisco de CFE</strong>. Los recibos se emiten bimestralmente para uso doméstico y mensualmente para comercial. El número de servicio está en la parte superior del recibo.
        </p>
        <ol className="pv-ol" style={{ marginBottom: "28px" }}>
          <li>Abre PagoYa y selecciona "Luz / CFE"</li>
          <li>Ingresa tu número de servicio CFE</li>
          <li>Confirma el monto del adeudo actual</li>
          <li>Paga con saldo PagoYa (cargado en OXXO) o SPEI</li>
          <li>Guarda el comprobante digital con folio</li>
        </ol>

        <h2 className="pv-h2" style={{ color: "#fff", fontWeight: 700, marginBottom: "16px" }}>Cómo pagar el agua (SEAPAL) en Puerto Vallarta</h2>
        <p style={{ color: "#94A3B8", lineHeight: 1.7, marginBottom: "16px" }}>
          El agua potable en Puerto Vallarta la opera <strong style={{ color: "#e2e8f0" }}>SEAPAL Vallarta</strong> (Sistema de los Servicios de Agua Potable, Drenaje y Alcantarillado de Puerto Vallarta). Tu número de contrato aparece en el recibo bimestral.
        </p>
        <ul className="pv-ul" style={{ marginBottom: "28px" }}>
          <li>Pago con PagoYa: ingresa tu número de contrato SEAPAL y paga desde el celular</li>
          <li>Pago en OXXO: lleva tu recibo físico al cajero</li>
          <li>Pago en portal: <strong style={{ color: "#e2e8f0" }}>seapal.gob.mx</strong> (requiere tarjeta)</li>
          <li>Pago presencial: oficinas de SEAPAL en Av. Insurgentes 160, Col. Versalles</li>
        </ul>

        <h2 className="pv-h2" style={{ color: "#fff", fontWeight: 700, marginBottom: "16px" }}>Cómo pagar el gas en Puerto Vallarta</h2>
        <p style={{ color: "#94A3B8", lineHeight: 1.7, marginBottom: "16px" }}>
          En Puerto Vallarta operan varios distribuidores de gas LP. Los más comunes son:
        </p>
        <ul className="pv-ul" style={{ marginBottom: "28px" }}>
          <li><strong style={{ color: "#e2e8f0" }}>Tomza Gas</strong> — cubre zona norte y marina</li>
          <li><strong style={{ color: "#e2e8f0" }}>Zeta Gas</strong> — presencia en zona centro y sur</li>
          <li><strong style={{ color: "#e2e8f0" }}>Gas Express Nieto</strong> — zona sur y Cabo Corrientes</li>
          <li><strong style={{ color: "#e2e8f0" }}>Gas del Pacífico</strong> — zona Amapas y Conchas Chinas</li>
        </ul>
        <p style={{ color: "#94A3B8", lineHeight: 1.7, marginBottom: "28px" }}>
          Cada proveedor tiene su propio sistema de cobro. PagoYa integra los principales proveedores de gas en la región. Si tu proveedor no aparece, puedes pagar por teléfono o en el establecimiento del proveedor.
        </p>

        <h2 className="pv-h2" style={{ color: "#fff", fontWeight: 700, marginBottom: "16px" }}>Preguntas frecuentes</h2>
        {[
          ["¿Cómo pago el agua en Puerto Vallarta?", "El agua en Puerto Vallarta la opera SEAPAL Vallarta. Puedes pagar con PagoYa usando tu número de contrato, en el portal seapal.gob.mx, en OXXO o en las oficinas de SEAPAL."],
          ["¿Cómo pago CFE en Puerto Vallarta sin ir a la oficina?", "Con PagoYa desde tu celular en menos de 2 minutos. Solo necesitas tu número de servicio CFE del recibo. También puedes pagar en cualquier OXXO o 7-Eleven."],
          ["¿Dónde pago el gas en Puerto Vallarta?", "Depende de tu proveedor (Tomza, Zeta Gas, Gas Express u otro). Con PagoYa puedes pagar los principales distribuidores desde tu celular. También puedes pagar por teléfono con cada empresa."],
        ].map(([q, a]) => (
          <div key={q} style={{ marginBottom: "16px", background: "rgba(255,255,255,0.03)", borderRadius: "10px", padding: "16px 20px", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ color: "#e2e8f0", fontWeight: 700, marginBottom: "8px", fontSize: "15px" }}>{q}</div>
            <div style={{ color: "#94A3B8", lineHeight: 1.7, fontSize: "14px" }}>{a}</div>
          </div>
        ))}

        <div style={{ marginTop: "40px", background: "rgba(29,158,117,0.12)", border: "1px solid rgba(29,158,117,0.3)", borderRadius: "14px", padding: "28px 24px", textAlign: "center" }}>
          <div style={{ color: "#fff", fontSize: "22px", fontWeight: 800, marginBottom: "8px" }}>Paga tus servicios en Puerto Vallarta</div>
          <div style={{ color: "#94A3B8", marginBottom: "20px" }}>Luz · Agua · Gas · Predial · Internet — desde tu celular</div>
          <button onClick={() => navigate("/")} style={{ background: "#1D9E75", color: "#fff", border: "none", borderRadius: "10px", padding: "14px 36px", fontSize: "16px", fontWeight: 700, cursor: "pointer" }}>
            Ir a PagoYa →
          </button>
        </div>

        <div style={{ marginTop: "32px", paddingTop: "24px", borderTop: "1px solid rgba(255,255,255,0.08)", fontSize: "13px", color: "#475569" }}>
          <strong style={{ color: "#64748B" }}>También te puede interesar: </strong>
          <a href="/pagar-predial-puerto-vallarta">Pagar predial en Puerto Vallarta</a> · <a href="/pagar-cfe">Pagar CFE</a> · <a href="/pagar-agua-mexico">Pagar agua en México</a> · <a href="/guia-pagar-servicios-sin-cuenta-bancaria">Guía completa</a>
        </div>
      </main>
    </div>
  );
}
