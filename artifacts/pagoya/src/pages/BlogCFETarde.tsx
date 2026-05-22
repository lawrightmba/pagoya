import { Helmet } from "react-helmet-async";
import { useLocation } from "wouter";

export default function BlogCFETarde() {
  const [, navigate] = useLocation();

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Inicio", "item": "https://pagoyamx.com/" },
      { "@type": "ListItem", "position": 2, "name": "Guías", "item": "https://pagoyamx.com/guia-pagar-servicios-sin-cuenta-bancaria" },
      { "@type": "ListItem", "position": 3, "name": "¿Qué pasa si pago CFE tarde?", "item": "https://pagoyamx.com/que-pasa-si-pago-cfe-tarde" }
    ]
  };

  const article = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "¿Qué pasa si pago mi CFE tarde? Multas, cortes y reconexión en México",
    "description": "Todo sobre las consecuencias de pagar el recibo de luz CFE fuera de fecha. Cuánto son los recargos, cuándo cortan el servicio y cómo pedir la reconexión rápido.",
    "url": "https://pagoyamx.com/que-pasa-si-pago-cfe-tarde",
    "datePublished": "2026-05-20",
    "publisher": { "@type": "Organization", "name": "PagoYa", "url": "https://pagoyamx.com" },
    "inLanguage": "es"
  };

  const faq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      { "@type": "Question", "name": "¿Cuánto cobra CFE por pago tardío?", "acceptedAnswer": { "@type": "Answer", "text": "CFE aplica recargos del 3% mensual sobre el saldo vencido. Si el adeudo es de $500 MXN y llevas 2 meses de retraso, el recargo sería aproximadamente $30 MXN adicionales." } },
      { "@type": "Question", "name": "¿A cuántos días de retraso CFE corta la luz?", "acceptedAnswer": { "@type": "Answer", "text": "CFE puede suspender el servicio a partir del vencimiento de la fecha límite de pago, que generalmente es entre 7 y 15 días después de emitido el recibo. En la práctica, la suspensión suele ocurrir entre 15 y 30 días de mora." } },
      { "@type": "Question", "name": "¿Cuánto cobra CFE por reconectar el servicio?", "acceptedAnswer": { "@type": "Answer", "text": "El cargo por reconexión de CFE es de aproximadamente $150 a $350 MXN dependiendo de la región y el tipo de suministro (doméstico o comercial). Se paga junto con el adeudo vencido." } },
      { "@type": "Question", "name": "¿Cuánto tarda CFE en reconectar después de pagar?", "acceptedAnswer": { "@type": "Answer", "text": "Con el comprobante de pago en mano, CFE debe reconectar el servicio en un plazo de 24 a 48 horas hábiles. Si tienes el comprobante digital de PagoYa, puedes llamar a CFE y solicitar la reconexión inmediata." } }
    ]
  };

  return (
    <div style={{ background: "#0A2540", minHeight: "100vh", display: "flex", flexDirection: "column", overflowX: "hidden" }}>
      <Helmet>
        <html lang="es-MX" />
        <title>¿Qué Pasa si Pago mi CFE Tarde? Multas y Reconexión | PagoYa</title>
        <meta name="description" content="¿Cuánto cobra CFE por pago tardío? ¿Cuándo cortan la luz? ¿Cuánto cuesta la reconexión? Todo lo que necesitas saber sobre pagar el recibo de luz fuera de fecha." />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://pagoyamx.com/que-pasa-si-pago-cfe-tarde" />
        <link rel="alternate" hreflang="es-MX" href="https://pagoyamx.com/que-pasa-si-pago-cfe-tarde" />
        <link rel="alternate" hreflang="x-default" href="https://pagoyamx.com/que-pasa-si-pago-cfe-tarde" />
        <meta name="geo.region" content="MX" />
        <meta name="geo.placename" content="México" />
        <meta property="og:title" content="¿Qué Pasa si Pago mi CFE Tarde? Multas y Reconexión | PagoYa" />
        <meta property="og:description" content="Recargos, fechas de corte y cómo reconectar tu luz rápido. Todo sobre el pago tardío del recibo CFE en México." />
        <meta property="og:type" content="article" />
        <meta property="og:url" content="https://pagoyamx.com/que-pasa-si-pago-cfe-tarde" />
        <script type="application/ld+json">{JSON.stringify(breadcrumb)}</script>
        <script type="application/ld+json">{JSON.stringify(article)}</script>
        <script type="application/ld+json">{JSON.stringify(faq)}</script>
      </Helmet>

      <style>{`
        .cfe-body a { color: #1D9E75; text-decoration: underline; }
        .cfe-body a:hover { color: #17c99a; }
        .cfe-h1 { font-size: clamp(26px, 5vw, 42px); }
        .cfe-h2 { font-size: clamp(20px, 3.5vw, 26px); }
        .cfe-table { width: 100%; border-collapse: collapse; }
        .cfe-table th, .cfe-table td { padding: 10px 14px; border: 1px solid rgba(255,255,255,0.12); text-align: left; vertical-align: top; }
        .cfe-table th { background: rgba(29,158,117,0.18); color: #1D9E75; font-weight: 700; }
        .cfe-table tr:nth-child(even) td { background: rgba(255,255,255,0.03); }
        .cfe-ol { padding-left: 20px; }
        .cfe-ol li { margin-bottom: 10px; line-height: 1.6; color: #CBD5E1; }
        .cfe-ul { list-style: disc; padding-left: 22px; }
        .cfe-ul li { margin-bottom: 6px; line-height: 1.6; color: #CBD5E1; }
        @media(max-width:640px){ .cfe-table-wrap { overflow-x: auto; } }
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

      <main className="cfe-body" style={{ flex: 1, maxWidth: "780px", margin: "0 auto", width: "100%", padding: "32px 24px 64px" }}>
        <nav style={{ marginBottom: "20px", fontSize: "13px", color: "#64748B" }}>
          <a href="/" style={{ color: "#1D9E75", textDecoration: "none" }}>Inicio</a> {" › "}
          <a href="/guia-pagar-servicios-sin-cuenta-bancaria" style={{ color: "#1D9E75", textDecoration: "none" }}>Guías</a> {" › "}
          <span>¿Qué pasa si pago CFE tarde?</span>
        </nav>

        <h1 className="cfe-h1" style={{ color: "#fff", fontWeight: 800, lineHeight: 1.15, marginBottom: "16px" }}>
          ¿Qué pasa si pago<br />
          <span style={{ color: "#1D9E75" }}>mi CFE tarde?</span>
        </h1>
        <p style={{ color: "#64748B", fontSize: "13px", marginBottom: "24px" }}>Actualizado: mayo 2026 · Lectura: 5 minutos</p>

        <p style={{ color: "#94A3B8", fontSize: "17px", lineHeight: 1.7, marginBottom: "28px" }}>
          Pagar el recibo de luz tarde pasa más seguido de lo que queremos admitir. Ya sea por falta de efectivo, por olvido o porque no había dónde pagar a tiempo. Esta guía explica exactamente qué consecuencias tiene el pago tardío de la CFE, cuánto cuestan los recargos, cuándo cortan el servicio y cómo recuperarlo lo más rápido posible.
        </p>

        <h2 className="cfe-h2" style={{ color: "#fff", fontWeight: 700, marginBottom: "16px" }}>¿Cuánto cobra CFE por pago tardío?</h2>
        <p style={{ color: "#94A3B8", lineHeight: 1.7, marginBottom: "16px" }}>
          CFE aplica <strong style={{ color: "#e2e8f0" }}>recargos del 3% mensual</strong> sobre el saldo vencido. Se calculan sobre el monto original del adeudo, no sobre el adeudo acumulado.
        </p>
        <div className="cfe-table-wrap" style={{ marginBottom: "32px" }}>
          <table className="cfe-table">
            <thead><tr><th>Adeudo original</th><th>1 mes de mora</th><th>2 meses de mora</th><th>3 meses de mora</th></tr></thead>
            <tbody>
              <tr><td>$300 MXN</td><td style={{ color: "#fbbf24" }}>$309 MXN</td><td style={{ color: "#f97316" }}>$318 MXN</td><td style={{ color: "#ef4444" }}>$327 MXN</td></tr>
              <tr><td>$600 MXN</td><td style={{ color: "#fbbf24" }}>$618 MXN</td><td style={{ color: "#f97316" }}>$636 MXN</td><td style={{ color: "#ef4444" }}>$654 MXN</td></tr>
              <tr><td>$1,200 MXN</td><td style={{ color: "#fbbf24" }}>$1,236 MXN</td><td style={{ color: "#f97316" }}>$1,272 MXN</td><td style={{ color: "#ef4444" }}>$1,308 MXN</td></tr>
              <tr><td>$2,500 MXN</td><td style={{ color: "#fbbf24" }}>$2,575 MXN</td><td style={{ color: "#f97316" }}>$2,650 MXN</td><td style={{ color: "#ef4444" }}>$2,725 MXN</td></tr>
            </tbody>
          </table>
        </div>

        <h2 className="cfe-h2" style={{ color: "#fff", fontWeight: 700, marginBottom: "16px" }}>¿A cuántos días de retraso CFE corta la luz?</h2>
        <p style={{ color: "#94A3B8", lineHeight: 1.7, marginBottom: "16px" }}>
          El proceso de suspensión de CFE sigue un calendario aproximado:
        </p>
        <div className="cfe-table-wrap" style={{ marginBottom: "32px" }}>
          <table className="cfe-table">
            <thead><tr><th>Días desde vencimiento</th><th>Qué pasa</th></tr></thead>
            <tbody>
              <tr><td>Día 1–7</td><td style={{ color: "#1D9E75" }}>Servicio normal. Solo se acumulan recargos.</td></tr>
              <tr><td>Día 8–15</td><td style={{ color: "#fbbf24" }}>CFE puede enviar aviso de suspensión. El servicio continúa en la mayoría de los casos.</td></tr>
              <tr><td>Día 15–30</td><td style={{ color: "#f97316" }}>Alta probabilidad de suspensión del suministro.</td></tr>
              <tr><td>Más de 30 días</td><td style={{ color: "#ef4444" }}>Suspensión definitiva + cargo de reconexión + adeudo acumulado con recargos.</td></tr>
              <tr><td>Más de 90 días</td><td style={{ color: "#ef4444" }}>Rescisión del contrato. Requiere reinstalación formal de servicio.</td></tr>
            </tbody>
          </table>
        </div>
        <p style={{ color: "#94A3B8", lineHeight: 1.7, marginBottom: "28px", fontSize: "13px", fontStyle: "italic" }}>
          * Los plazos exactos varían por región y tipo de tarifa. CFE tiene discrecionalidad para suspender antes o después según el histórico del cliente.
        </p>

        <h2 className="cfe-h2" style={{ color: "#fff", fontWeight: 700, marginBottom: "16px" }}>¿Cuánto cobra CFE por reconectar el servicio?</h2>
        <ul className="cfe-ul" style={{ marginBottom: "28px" }}>
          <li>Suministro doméstico: <strong style={{ color: "#e2e8f0" }}>$150 – $250 MXN</strong></li>
          <li>Suministro comercial o de mediana tensión: <strong style={{ color: "#e2e8f0" }}>$250 – $450 MXN</strong></li>
          <li>El cargo de reconexión se suma al adeudo pendiente y a los recargos acumulados</li>
        </ul>

        <h2 className="cfe-h2" style={{ color: "#fff", fontWeight: 700, marginBottom: "16px" }}>Cómo pagar y pedir reconexión rápido</h2>
        <ol className="cfe-ol" style={{ marginBottom: "32px" }}>
          <li><strong style={{ color: "#e2e8f0" }}>Paga el adeudo completo con PagoYa.</strong> Entra a PagoYa, busca CFE, ingresa tu número de servicio y paga. El sistema confirma el pago al instante.</li>
          <li><strong style={{ color: "#e2e8f0" }}>Guarda el comprobante digital.</strong> PagoYa genera un PDF con folio único de transacción. Es tu evidencia oficial.</li>
          <li><strong style={{ color: "#e2e8f0" }}>Llama a CFE al 071.</strong> Indica que ya realizaste el pago y proporciona el folio del comprobante. CFE puede verificarlo en su sistema en tiempo real.</li>
          <li><strong style={{ color: "#e2e8f0" }}>Solicita la reconexión prioritaria.</strong> Con el folio confirmado, CFE programa la visita del técnico — generalmente en 24 a 48 horas.</li>
          <li><strong style={{ color: "#e2e8f0" }}>Espera la visita del técnico.</strong> El técnico reinstalará el servicio físicamente si hubo desconexión en el medidor.</li>
        </ol>

        <div style={{ background: "rgba(29,158,117,0.1)", border: "1px solid rgba(29,158,117,0.25)", borderRadius: "12px", padding: "20px 24px", marginBottom: "32px" }}>
          <div style={{ color: "#1D9E75", fontWeight: 800, fontSize: "15px", marginBottom: "8px" }}>Consejo: paga antes de que corten</div>
          <div style={{ color: "#94A3B8", lineHeight: 1.7 }}>
            El cargo de reconexión ($150–$450 MXN) más los días sin luz hacen que esperar sea siempre más caro que pagar a tiempo. Con PagoYa puedes pagar en menos de 2 minutos desde tu celular — incluso sin banco ni tarjeta.
          </div>
        </div>

        <h2 className="cfe-h2" style={{ color: "#fff", fontWeight: 700, marginBottom: "16px" }}>Preguntas frecuentes</h2>
        {[
          ["¿Cuánto cobra CFE por pago tardío?", "CFE aplica recargos del 3% mensual sobre el saldo vencido. En un adeudo de $600 MXN, cada mes agrega $18 MXN en recargos."],
          ["¿A cuántos días de retraso CFE corta la luz?", "La suspensión puede ocurrir a partir del día 15 de vencimiento, aunque en muchos casos da hasta 30 días antes de cortar el suministro físicamente."],
          ["¿Cuánto cobra CFE por reconectar el servicio?", "Entre $150 y $450 MXN dependiendo del tipo de suministro, más el adeudo acumulado con recargos."],
          ["¿Cuánto tarda CFE en reconectar después de pagar?", "Con el comprobante de pago, la reconexión tarda entre 24 y 48 horas hábiles. Llamar al 071 con el folio del comprobante puede acelerar el proceso."],
        ].map(([q, a]) => (
          <div key={q} style={{ marginBottom: "16px", background: "rgba(255,255,255,0.03)", borderRadius: "10px", padding: "16px 20px", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ color: "#e2e8f0", fontWeight: 700, marginBottom: "8px", fontSize: "15px" }}>{q}</div>
            <div style={{ color: "#94A3B8", lineHeight: 1.7, fontSize: "14px" }}>{a}</div>
          </div>
        ))}

        <div style={{ marginTop: "40px", background: "rgba(29,158,117,0.12)", border: "1px solid rgba(29,158,117,0.3)", borderRadius: "14px", padding: "28px 24px", textAlign: "center" }}>
          <div style={{ color: "#fff", fontSize: "22px", fontWeight: 800, marginBottom: "8px" }}>Paga tu CFE ahora</div>
          <div style={{ color: "#94A3B8", marginBottom: "20px" }}>Evita el corte · Sin banco · Comprobante al instante</div>
          <button onClick={() => navigate("/")} style={{ background: "#1D9E75", color: "#fff", border: "none", borderRadius: "10px", padding: "14px 36px", fontSize: "16px", fontWeight: 700, cursor: "pointer" }}>
            Ir a PagoYa →
          </button>
        </div>

        <div style={{ marginTop: "32px", paddingTop: "24px", borderTop: "1px solid rgba(255,255,255,0.08)", fontSize: "13px", color: "#475569" }}>
          <strong style={{ color: "#64748B" }}>También te puede interesar: </strong>
          <a href="/pagar-cfe">Cómo pagar CFE sin banco</a> · <a href="/pagar-cfe-guadalajara">Pagar CFE en Guadalajara</a> · <a href="/deposito-oxxo">Cargar saldo en OXXO</a> · <a href="/guia-pagar-servicios-sin-cuenta-bancaria">Guía completa</a>
        </div>
      </main>
    </div>
  );
}
