import { Helmet } from "react-helmet-async";
import { useLocation } from "wouter";

export default function BlogPagarIzzi() {
  const [, navigate] = useLocation();

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Inicio", "item": "https://pagoyamx.com/" },
      { "@type": "ListItem", "position": 2, "name": "Guías", "item": "https://pagoyamx.com/guia-pagar-servicios-sin-cuenta-bancaria" },
      { "@type": "ListItem", "position": 3, "name": "Pagar Izzi sin cuenta bancaria", "item": "https://pagoyamx.com/pagar-izzi-sin-cuenta-bancaria" }
    ]
  };

  const article = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "Cómo pagar Izzi sin cuenta bancaria en México",
    "description": "Guía completa para pagar tu recibo de Izzi en efectivo, desde tu celular y sin tarjeta de crédito. Métodos, pasos y opciones disponibles en 2026.",
    "url": "https://pagoyamx.com/pagar-izzi-sin-cuenta-bancaria",
    "datePublished": "2026-05-20",
    "publisher": { "@type": "Organization", "name": "PagoYa", "url": "https://pagoyamx.com" },
    "inLanguage": "es"
  };

  const faq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      { "@type": "Question", "name": "¿Puedo pagar Izzi sin tarjeta de crédito o débito?", "acceptedAnswer": { "@type": "Answer", "text": "Sí. Puedes pagar tu recibo Izzi en efectivo en OXXO, o usar una billetera digital como PagoYa que se carga con efectivo. No necesitas tarjeta ni cuenta bancaria." } },
      { "@type": "Question", "name": "¿Cuánto tarda en aplicarse el pago de Izzi?", "acceptedAnswer": { "@type": "Answer", "text": "Los pagos procesados a través de PagoYa o OXXO se aplican en 24 a 48 horas hábiles en el sistema de Izzi. En casos urgentes, llama a Izzi para confirmar la aplicación manual." } },
      { "@type": "Question", "name": "¿Qué datos necesito para pagar Izzi?", "acceptedAnswer": { "@type": "Answer", "text": "Necesitas el número de cuenta Izzi (aparece en tu recibo mensual o en la app de Izzi). Con ese número puedes realizar el pago en cualquier punto autorizado." } },
      { "@type": "Question", "name": "¿Cuánto cobra PagoYa por pagar Izzi?", "acceptedAnswer": { "@type": "Answer", "text": "PagoYa cobra $25 MXN por transacción, sin importar el monto del recibo. Es una tarifa fija y transparente." } }
    ]
  };

  return (
    <div style={{ background: "#0A2540", minHeight: "100vh", display: "flex", flexDirection: "column", overflowX: "hidden" }}>
      <Helmet>
        <html lang="es-MX" />
        <title>Cómo Pagar Izzi sin Cuenta Bancaria en México | PagoYa</title>
        <meta name="description" content="Guía paso a paso para pagar tu recibo Izzi sin tarjeta ni banco. Usa efectivo, OXXO o PagoYa desde tu celular. Rápido y sin filas." />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://pagoyamx.com/pagar-izzi-sin-cuenta-bancaria" />
        <link rel="alternate" hrefLang="es-MX" href="https://pagoyamx.com/pagar-izzi-sin-cuenta-bancaria" />
        <link rel="alternate" hrefLang="x-default" href="https://pagoyamx.com/pagar-izzi-sin-cuenta-bancaria" />
        <meta name="geo.region" content="MX" />
        <meta name="geo.placename" content="México" />
        <meta property="og:title" content="Cómo Pagar Izzi sin Cuenta Bancaria | PagoYa" />
        <meta property="og:description" content="Paga tu recibo Izzi en efectivo desde tu celular. Sin tarjeta, sin banco, sin filas." />
        <meta property="og:type" content="article" />
        <meta property="og:url" content="https://pagoyamx.com/pagar-izzi-sin-cuenta-bancaria" />
        <script type="application/ld+json">{JSON.stringify(breadcrumb)}</script>
        <script type="application/ld+json">{JSON.stringify(article)}</script>
        <script type="application/ld+json">{JSON.stringify(faq)}</script>
      </Helmet>

      <style>{`
        .izzi-body a { color: #1D9E75; text-decoration: underline; }
        .izzi-body a:hover { color: #17c99a; }
        .izzi-h1 { font-size: clamp(26px, 5vw, 42px); }
        .izzi-h2 { font-size: clamp(20px, 3.5vw, 26px); }
        .izzi-table { width: 100%; border-collapse: collapse; }
        .izzi-table th, .izzi-table td { padding: 10px 14px; border: 1px solid rgba(255,255,255,0.12); text-align: left; vertical-align: top; }
        .izzi-table th { background: rgba(29,158,117,0.18); color: #1D9E75; font-weight: 700; }
        .izzi-table tr:nth-child(even) td { background: rgba(255,255,255,0.03); }
        .izzi-ol { padding-left: 20px; }
        .izzi-ol li { margin-bottom: 10px; line-height: 1.6; color: #CBD5E1; }
        .izzi-ul { list-style: disc; padding-left: 22px; }
        .izzi-ul li { margin-bottom: 6px; line-height: 1.6; color: #CBD5E1; }
        @media(max-width:640px){ .izzi-table-wrap { overflow-x: auto; } }
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

      <main className="izzi-body" style={{ flex: 1, maxWidth: "780px", margin: "0 auto", width: "100%", padding: "32px 24px 64px" }}>
        <nav style={{ marginBottom: "20px", fontSize: "13px", color: "#64748B" }}>
          <a href="/" style={{ color: "#1D9E75", textDecoration: "none" }}>Inicio</a> {" › "}
          <a href="/guia-pagar-servicios-sin-cuenta-bancaria" style={{ color: "#1D9E75", textDecoration: "none" }}>Guías</a> {" › "}
          <span>Pagar Izzi sin banco</span>
        </nav>

        <h1 className="izzi-h1" style={{ color: "#fff", fontWeight: 800, lineHeight: 1.15, marginBottom: "16px" }}>
          Cómo pagar Izzi<br />
          <span style={{ color: "#1D9E75" }}>sin cuenta bancaria ni tarjeta</span>
        </h1>
        <p style={{ color: "#64748B", fontSize: "13px", marginBottom: "24px" }}>Actualizado: mayo 2026 · Lectura: 5 minutos</p>

        <p style={{ color: "#94A3B8", fontSize: "17px", lineHeight: 1.7, marginBottom: "28px" }}>
          Izzi es el segundo proveedor de cable e internet más grande de México, con millones de clientes en todo el país. Pero muchos de esos clientes no tienen tarjeta de crédito ni cuenta bancaria para pagar en línea. Esta guía explica todas las formas de pagar tu recibo Izzi en efectivo — sin banco, sin tarjeta y sin filas interminables.
        </p>

        <h2 className="izzi-h2" style={{ color: "#fff", fontWeight: 700, marginBottom: "16px" }}>¿Qué necesitas para pagar Izzi?</h2>
        <p style={{ color: "#94A3B8", lineHeight: 1.7, marginBottom: "12px" }}>Solo necesitas un dato:</p>
        <ul className="izzi-ul" style={{ marginBottom: "28px" }}>
          <li><strong style={{ color: "#e2e8f0" }}>Tu número de cuenta Izzi</strong> — aparece en tu recibo mensual, en la app de Izzi o en la parte superior de cualquier estado de cuenta</li>
        </ul>
        <p style={{ color: "#94A3B8", lineHeight: 1.7, marginBottom: "28px" }}>
          Con ese número puedes pagar desde cualquier canal, sin importar si tienes o no cuenta bancaria.
        </p>

        <h2 className="izzi-h2" style={{ color: "#fff", fontWeight: 700, marginBottom: "16px" }}>Opciones para pagar Izzi sin banco</h2>
        <div className="izzi-table-wrap" style={{ marginBottom: "32px" }}>
          <table className="izzi-table">
            <thead><tr><th>Método</th><th>Costo extra</th><th>Tiempo de aplicación</th><th>¿Sin banco?</th></tr></thead>
            <tbody>
              <tr><td><strong>PagoYa</strong> (desde celular)</td><td style={{ color: "#1D9E75" }}>$25 MXN</td><td style={{ color: "#CBD5E1" }}>1–24 horas</td><td style={{ color: "#1D9E75" }}>✓ Sí</td></tr>
              <tr><td>OXXO (en tienda)</td><td style={{ color: "#CBD5E1" }}>$12–15 MXN</td><td style={{ color: "#CBD5E1" }}>24–48 horas</td><td style={{ color: "#1D9E75" }}>✓ Sí</td></tr>
              <tr><td>7-Eleven</td><td style={{ color: "#CBD5E1" }}>$10–15 MXN</td><td style={{ color: "#CBD5E1" }}>24–48 horas</td><td style={{ color: "#1D9E75" }}>✓ Sí</td></tr>
              <tr><td>Pago en tienda Izzi</td><td style={{ color: "#1D9E75" }}>Sin costo</td><td style={{ color: "#CBD5E1" }}>Inmediato</td><td style={{ color: "#1D9E75" }}>✓ Sí</td></tr>
              <tr><td>Transferencia SPEI</td><td style={{ color: "#CBD5E1" }}>Sin costo</td><td style={{ color: "#CBD5E1" }}>Inmediato</td><td style={{ color: "#ef4444" }}>✗ Necesitas banco</td></tr>
            </tbody>
          </table>
        </div>

        <h2 className="izzi-h2" style={{ color: "#fff", fontWeight: 700, marginBottom: "16px" }}>Cómo pagar Izzi con PagoYa (el método más rápido)</h2>
        <ol className="izzi-ol" style={{ marginBottom: "32px" }}>
          <li><strong style={{ color: "#e2e8f0" }}>Entra a PagoYa y selecciona "Internet / Cable".</strong> En el buscador escribe "Izzi" o selecciónalo de la lista de servicios.</li>
          <li><strong style={{ color: "#e2e8f0" }}>Ingresa tu número de cuenta Izzi.</strong> Lo encuentras en tu recibo mensual.</li>
          <li><strong style={{ color: "#e2e8f0" }}>Confirma el monto.</strong> PagoYa muestra el saldo pendiente de tu cuenta Izzi.</li>
          <li><strong style={{ color: "#e2e8f0" }}>Elige cómo pagar.</strong> Usa el saldo de tu billetera PagoYa (cargada con efectivo en OXXO) o paga con SPEI.</li>
          <li><strong style={{ color: "#e2e8f0" }}>Listo.</strong> Recibes un comprobante digital con el folio de tu pago. El sistema de Izzi lo aplica en 1–24 horas.</li>
        </ol>

        <h2 className="izzi-h2" style={{ color: "#fff", fontWeight: 700, marginBottom: "16px" }}>¿Qué pasa si no pago Izzi a tiempo?</h2>
        <p style={{ color: "#94A3B8", lineHeight: 1.7, marginBottom: "12px" }}>
          Izzi aplica un proceso escalonado de corte de servicio:
        </p>
        <ul className="izzi-ul" style={{ marginBottom: "28px" }}>
          <li><strong style={{ color: "#e2e8f0" }}>Días 1–5 de vencimiento:</strong> El servicio continúa sin interrupción</li>
          <li><strong style={{ color: "#e2e8f0" }}>Día 6–10:</strong> Posible suspensión temporal del servicio</li>
          <li><strong style={{ color: "#e2e8f0" }}>Más de 15 días:</strong> Suspensión definitiva y posible cargo por reconexión ($150–350 MXN)</li>
          <li><strong style={{ color: "#e2e8f0" }}>Más de 60 días:</strong> Cancelación del contrato y reporte a buró de crédito</li>
        </ul>
        <p style={{ color: "#94A3B8", lineHeight: 1.7, marginBottom: "28px" }}>
          Si tu servicio ya fue suspendido, el pago con PagoYa es la forma más rápida de regularizarte — el comprobante digital sirve para solicitar la reconexión por teléfono sin esperar a que el sistema lo procese automáticamente.
        </p>

        <h2 className="izzi-h2" style={{ color: "#fff", fontWeight: 700, marginBottom: "16px" }}>Preguntas frecuentes</h2>
        {[
          ["¿Puedo pagar Izzi sin tarjeta de crédito o débito?", "Sí. PagoYa te permite cargar tu billetera con efectivo en OXXO y luego pagar Izzi desde tu celular. Sin tarjeta, sin banco."],
          ["¿Cuánto tarda en aplicarse el pago de Izzi?", "Con PagoYa el pago se procesa en 1 a 24 horas. En OXXO o tiendas de conveniencia puede tardar 24 a 48 horas hábiles."],
          ["¿Qué datos necesito para pagar Izzi?", "Solo tu número de cuenta Izzi, que aparece en tu recibo mensual o en la app de Izzi."],
          ["¿Cuánto cobra PagoYa por pagar Izzi?", "La tarifa fija es de $25 MXN por transacción, sin importar el monto del recibo."],
        ].map(([q, a]) => (
          <div key={q} style={{ marginBottom: "16px", background: "rgba(255,255,255,0.03)", borderRadius: "10px", padding: "16px 20px", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ color: "#e2e8f0", fontWeight: 700, marginBottom: "8px", fontSize: "15px" }}>{q}</div>
            <div style={{ color: "#94A3B8", lineHeight: 1.7, fontSize: "14px" }}>{a}</div>
          </div>
        ))}

        <div style={{ marginTop: "40px", background: "rgba(29,158,117,0.12)", border: "1px solid rgba(29,158,117,0.3)", borderRadius: "14px", padding: "28px 24px", textAlign: "center" }}>
          <div style={{ color: "#fff", fontSize: "22px", fontWeight: 800, marginBottom: "8px" }}>Paga tu Izzi ahora</div>
          <div style={{ color: "#94A3B8", marginBottom: "20px" }}>Sin banco · Sin tarjeta · En menos de 2 minutos</div>
          <button onClick={() => navigate("/")} style={{ background: "#1D9E75", color: "#fff", border: "none", borderRadius: "10px", padding: "14px 36px", fontSize: "16px", fontWeight: 700, cursor: "pointer" }}>
            Ir a PagoYa →
          </button>
        </div>

        <div style={{ marginTop: "32px", paddingTop: "24px", borderTop: "1px solid rgba(255,255,255,0.08)", fontSize: "13px", color: "#475569" }}>
          <strong style={{ color: "#64748B" }}>También te puede interesar: </strong>
          <a href="/pagar-telmex-sin-tarjeta">Pagar Telmex sin tarjeta</a> · <a href="/pagar-cfe">Pagar CFE</a> · <a href="/deposito-oxxo">Cargar saldo en OXXO</a> · <a href="/guia-pagar-servicios-sin-cuenta-bancaria">Guía completa</a>
        </div>
      </main>
    </div>
  );
}
