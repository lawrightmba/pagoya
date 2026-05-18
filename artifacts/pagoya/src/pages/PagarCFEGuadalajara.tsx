import { Helmet } from "react-helmet-async";
import { useLocation } from "wouter";

export default function PagarCFEGuadalajara() {
  const [, navigate] = useLocation();

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Inicio", "item": "https://pagoyamx.com/" },
      { "@type": "ListItem", "position": 2, "name": "Guadalajara", "item": "https://pagoyamx.com/pagar-servicios-guadalajara" },
      { "@type": "ListItem", "position": 3, "name": "Pagar CFE Guadalajara", "item": "https://pagoyamx.com/pagar-cfe-guadalajara" }
    ]
  };

  const article = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "Cómo pagar tu recibo de CFE en Guadalajara sin ir al banco",
    "description": "Paga tu recibo de CFE en Guadalajara desde tu celular en menos de 2 minutos. Sin cuenta bancaria, sin tarjeta, sin filas. Carga con efectivo en OXXO.",
    "url": "https://pagoyamx.com/pagar-cfe-guadalajara",
    "publisher": { "@type": "Organization", "name": "PagoYa", "url": "https://pagoyamx.com" },
    "inLanguage": "es"
  };

  const faq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "¿Cómo pago mi recibo de CFE en Guadalajara sin ir al banco?",
        "acceptedAnswer": { "@type": "Answer", "text": "Con PagoYa puedes pagar tu CFE desde tu celular en segundos. Carga tu billetera con efectivo en cualquier OXXO de Guadalajara (hay más de 800) y paga al instante ingresando tu número de servicio." }
      },
      {
        "@type": "Question",
        "name": "¿Cuánto tarda en procesarse el pago de CFE en Guadalajara?",
        "acceptedAnswer": { "@type": "Answer", "text": "El pago se procesa en menos de 2 minutos. Recibes un comprobante en pantalla al instante y CFE actualiza el estado de tu cuenta en su sistema." }
      },
      {
        "@type": "Question",
        "name": "¿Puedo pagar CFE en Guadalajara sin tarjeta de crédito?",
        "acceptedAnswer": { "@type": "Answer", "text": "Sí. PagoYa no requiere tarjeta ni cuenta bancaria. Solo recarga tu billetera con efectivo en OXXO y paga desde la app." }
      }
    ]
  };

  return (
    <div style={{ background: "#0A2540", minHeight: "100vh", display: "flex", flexDirection: "column", overflowX: "hidden" }}>
      <Helmet>
        <html lang="es" />
        <title>Pagar CFE Guadalajara Sin Banco | PagoYa</title>
        <meta name="description" content="Paga tu recibo de CFE en Guadalajara desde tu celular en menos de 2 minutos. Sin cuenta bancaria, sin tarjeta, sin filas. Carga con efectivo en OXXO y paga al instante." />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://pagoyamx.com/pagar-cfe-guadalajara" />
        <meta property="og:title" content="Pagar CFE Guadalajara Sin Banco | PagoYa" />
        <meta property="og:description" content="Paga tu recibo de CFE en Guadalajara desde tu celular en menos de 2 minutos. Sin cuenta bancaria, sin tarjeta, sin filas." />
        <meta property="og:type" content="article" />
        <meta property="og:url" content="https://pagoyamx.com/pagar-cfe-guadalajara" />
        <script type="application/ld+json">{JSON.stringify(breadcrumb)}</script>
        <script type="application/ld+json">{JSON.stringify(article)}</script>
        <script type="application/ld+json">{JSON.stringify(faq)}</script>
      </Helmet>

      <style>{`
        .gdl-body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
        .gdl-body a { color: #1D9E75; text-decoration: underline; }
        .gdl-body a:hover { color: #17c99a; }
        .gdl-h1 { font-size: clamp(26px, 5vw, 42px); }
        .gdl-h2 { font-size: clamp(20px, 3.5vw, 28px); }
        .gdl-table { width: 100%; border-collapse: collapse; }
        .gdl-table th, .gdl-table td { padding: 10px 14px; border: 1px solid rgba(255,255,255,0.12); text-align: left; vertical-align: top; }
        .gdl-table th { background: rgba(29,158,117,0.18); color: #1D9E75; font-weight: 700; }
        .gdl-table tr:nth-child(even) td { background: rgba(255,255,255,0.03); }
        .gdl-ol { padding-left: 20px; }
        .gdl-ol li { margin-bottom: 10px; line-height: 1.6; color: #CBD5E1; }
        .gdl-ul { list-style: disc; padding-left: 22px; }
        .gdl-ul li { margin-bottom: 6px; line-height: 1.6; color: #CBD5E1; }
        @media(max-width:640px){ .gdl-table-wrap { overflow-x: auto; } .gdl-body { padding: 0 16px 48px; } }
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

      <main className="gdl-body" style={{ flex: 1, maxWidth: "780px", margin: "0 auto", width: "100%", padding: "32px 24px 64px" }}>
        <nav style={{ marginBottom: "20px", fontSize: "13px", color: "#64748B" }}>
          <a href="/" style={{ color: "#1D9E75", textDecoration: "none" }}>Inicio</a>
          {" › "}
          <a href="/pagar-servicios-guadalajara" style={{ color: "#1D9E75", textDecoration: "none" }}>Guadalajara</a>
          {" › "}
          <span>Pagar CFE</span>
        </nav>

        <h1 className="gdl-h1" style={{ color: "#fff", fontWeight: 800, lineHeight: 1.15, marginBottom: "16px" }}>
          Pagar CFE en Guadalajara<br />
          <span style={{ color: "#1D9E75" }}>sin banco y sin filas</span>
        </h1>

        <p style={{ color: "#94A3B8", fontSize: "17px", lineHeight: 1.7, marginBottom: "28px" }}>
          Guadalajara tiene más de 1.4 millones de hogares con servicio CFE. La mayoría sigue yendo en persona a pagar — haciendo fila en oficinas de CFE en Zapopan, Tlaquepaque, Tonalá o el Centro Histórico. Con PagoYa lo haces desde tu celular en menos de 2 minutos, sin salir de casa.
        </p>

        <div style={{ background: "rgba(29,158,117,0.1)", border: "1px solid rgba(29,158,117,0.3)", borderRadius: "12px", padding: "20px 24px", marginBottom: "32px" }}>
          <div style={{ display: "flex", gap: "32px", flexWrap: "wrap" }}>
            {[["⚡", "2 min", "Tiempo promedio de pago"], ["💵", "$15 MXN", "Comisión fija"], ["🏪", "800+", "OXXO en Guadalajara"], ["✅", "24/7", "Disponible siempre"]].map(([icon, val, label]) => (
              <div key={label} style={{ textAlign: "center", minWidth: "80px" }}>
                <div style={{ fontSize: "22px", marginBottom: "4px" }}>{icon}</div>
                <div style={{ color: "#1D9E75", fontWeight: 800, fontSize: "20px" }}>{val}</div>
                <div style={{ color: "#64748B", fontSize: "12px", marginTop: "2px" }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        <h2 className="gdl-h2" style={{ color: "#fff", fontWeight: 700, marginBottom: "16px" }}>Cómo pagar tu CFE en Guadalajara paso a paso</h2>
        <ol className="gdl-ol" style={{ marginBottom: "32px" }}>
          <li><strong style={{ color: "#e2e8f0" }}>Carga tu billetera en OXXO.</strong> Ve a cualquiera de los más de 800 OXXO en el área metropolitana de Guadalajara — Zapopan, Tlaquepaque, Tlajomulco, Tonalá — y deposita el monto que quieras pagar más la comisión de $15 MXN.</li>
          <li><strong style={{ color: "#e2e8f0" }}>Abre PagoYa y selecciona CFE.</strong> En la app, toca "Pagar Servicios" y elige CFE en el listado de proveedores.</li>
          <li><strong style={{ color: "#e2e8f0" }}>Ingresa tu número de servicio.</strong> Lo encuentras en la parte superior de tu recibo de luz CFE. Son 12 dígitos.</li>
          <li><strong style={{ color: "#e2e8f0" }}>Confirma el pago.</strong> La app te muestra el monto y el nombre del titular. Confirma y listo — folio de confirmación en pantalla.</li>
          <li><strong style={{ color: "#e2e8f0" }}>Guarda tu comprobante.</strong> Puedes tomar captura de pantalla o encontrar el historial en la app.</li>
        </ol>

        <h2 className="gdl-h2" style={{ color: "#fff", fontWeight: 700, marginBottom: "16px" }}>¿Dónde pagar CFE en Guadalajara? Todas las opciones</h2>
        <div className="gdl-table-wrap" style={{ marginBottom: "32px" }}>
          <table className="gdl-table">
            <thead>
              <tr><th>Opción</th><th>Tiempo de espera</th><th>Horario</th><th>Costo extra</th></tr>
            </thead>
            <tbody>
              <tr><td><strong style={{ color: "#1D9E75" }}>PagoYa (app)</strong></td><td>0 minutos</td><td>24/7</td><td>$15 MXN fijos</td></tr>
              <tr><td>Oficina CFE Guadalajara</td><td>20–60 min</td><td>Lun–Vie 8am–3pm</td><td>$0</td></tr>
              <tr><td>OXXO (pago directo)</td><td>5–15 min en fila</td><td>Varía</td><td>$12–15 MXN</td></tr>
              <tr><td>Banco en línea</td><td>Inmediato</td><td>24/7</td><td>Requiere cuenta</td></tr>
              <tr><td>CFE.mx portal web</td><td>Inmediato</td><td>24/7</td><td>Requiere tarjeta</td></tr>
            </tbody>
          </table>
        </div>

        <h2 className="gdl-h2" style={{ color: "#fff", fontWeight: 700, marginBottom: "16px" }}>Colonias y municipios de Guadalajara donde opera PagoYa</h2>
        <p style={{ color: "#94A3B8", lineHeight: 1.7, marginBottom: "16px" }}>
          PagoYa funciona en toda la zona metropolitana de Guadalajara. Si tienes contrato CFE en cualquiera de estas zonas, puedes pagar desde la app:
        </p>
        <ul className="gdl-ul" style={{ marginBottom: "32px" }}>
          {["Zapopan (Andares, Jardines, Las Águilas)", "Tlaquepaque (San Pedro, El Salto)", "Tonalá", "Tlajomulco de Zúñiga", "El Salto", "Guadalajara Centro, Chapultepec, Providencia", "Huentitán, Oblatos, Tetlán"].map(c => (
            <li key={c}>{c}</li>
          ))}
        </ul>

        <h2 className="gdl-h2" style={{ color: "#fff", fontWeight: 700, marginBottom: "16px" }}>Preguntas frecuentes — CFE Guadalajara</h2>
        {[
          ["¿Cómo pago mi recibo de CFE en Guadalajara sin ir al banco?", "Con PagoYa puedes pagar tu CFE desde tu celular en segundos. Carga tu billetera con efectivo en cualquier OXXO de Guadalajara y paga al instante ingresando tu número de servicio."],
          ["¿Cuánto tarda en procesarse el pago de CFE?", "El pago se procesa en menos de 2 minutos. Recibes un comprobante en pantalla al instante y CFE actualiza el estado de tu cuenta."],
          ["¿Puedo pagar CFE en Guadalajara sin tarjeta?", "Sí. PagoYa no requiere tarjeta ni cuenta bancaria. Solo recarga tu billetera con efectivo en OXXO y paga desde la app."],
          ["¿Funciona para pagos de CFE atrasados o con corte?", "Sí. PagoYa procesa cualquier monto de recibo CFE, incluyendo saldos vencidos y recibos con aviso de corte."],
        ].map(([q, a]) => (
          <div key={q} style={{ marginBottom: "20px", background: "rgba(255,255,255,0.03)", borderRadius: "10px", padding: "16px 20px", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ color: "#e2e8f0", fontWeight: 700, marginBottom: "8px", fontSize: "15px" }}>{q}</div>
            <div style={{ color: "#94A3B8", lineHeight: 1.7, fontSize: "14px" }}>{a}</div>
          </div>
        ))}

        <div style={{ marginTop: "40px", background: "rgba(29,158,117,0.12)", border: "1px solid rgba(29,158,117,0.3)", borderRadius: "14px", padding: "28px 24px", textAlign: "center" }}>
          <div style={{ color: "#fff", fontSize: "22px", fontWeight: 800, marginBottom: "8px" }}>Paga tu CFE en Guadalajara ahora</div>
          <div style={{ color: "#94A3B8", marginBottom: "20px" }}>Sin banco. Sin filas. En 2 minutos.</div>
          <button onClick={() => navigate("/")} style={{ background: "#1D9E75", color: "#fff", border: "none", borderRadius: "10px", padding: "14px 36px", fontSize: "16px", fontWeight: 700, cursor: "pointer" }}>
            Ir a PagoYa →
          </button>
        </div>

        <div style={{ marginTop: "32px", paddingTop: "24px", borderTop: "1px solid rgba(255,255,255,0.08)", fontSize: "13px", color: "#475569" }}>
          <strong style={{ color: "#64748B" }}>También te puede interesar: </strong>
          <a href="/pagar-cfe">Pagar CFE México</a> · <a href="/pagar-telmex">Pagar Telmex</a> · <a href="/recargas">Recargas Guadalajara</a> · <a href="/pagar-servicios-guadalajara">Todos los servicios en Guadalajara</a>
        </div>
      </main>
    </div>
  );
}
