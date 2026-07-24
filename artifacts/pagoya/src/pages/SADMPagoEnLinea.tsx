import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useLocation } from "wouter";

export default function SADMPagoEnLinea() {
  const [, navigate] = useLocation();
  const [showSticky, setShowSticky] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowSticky(window.scrollY > 320);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Inicio", "item": "https://pagoyamx.com/" },
      { "@type": "ListItem", "position": 2, "name": "Pagar servicios", "item": "https://pagoyamx.com/guia-pagar-servicios-sin-cuenta-bancaria" },
      { "@type": "ListItem", "position": 3, "name": "Pagar agua Monterrey", "item": "https://pagoyamx.com/pagar-agua-monterrey" },
      { "@type": "ListItem", "position": 4, "name": "SADM Pago en Línea", "item": "https://pagoyamx.com/sadm-pago-en-linea" }
    ]
  };

  const article = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "SADM Pago en Línea: Cómo Pagar tu Recibo de Agua de Monterrey",
    "description": "Guía completa para pagar el recibo SADM (agua Monterrey) en línea sin cuenta bancaria. Paso a paso, métodos de pago, recibos vencidos y preguntas frecuentes.",
    "url": "https://pagoyamx.com/sadm-pago-en-linea",
    "datePublished": "2026-07-24",
    "dateModified": "2026-07-24",
    "publisher": { "@type": "Organization", "name": "PagoYa", "url": "https://pagoyamx.com" },
    "inLanguage": "es-MX"
  };

  const faq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "¿Cómo pago el SADM en línea sin cuenta bancaria?",
        "acceptedAnswer": { "@type": "Answer", "text": "Con PagoYa puedes pagar tu recibo SADM desde tu celular sin necesitar una cuenta bancaria. Recarga tu billetera con efectivo en cualquier OXXO, luego selecciona el servicio de agua (SADM), ingresa tu número de contrato y confirma el pago. Todo en menos de 2 minutos." }
      },
      {
        "@type": "Question",
        "name": "¿Qué número necesito para el pago SADM en línea?",
        "acceptedAnswer": { "@type": "Answer", "text": "Necesitas tu número de cuenta o contrato SADM. Lo encuentras en la parte superior de tu recibo bimestral o en el portal sadm.mx ingresando tu CURP o dirección. El número no cambia entre bimestres." }
      },
      {
        "@type": "Question",
        "name": "¿Puedo pagar un recibo de agua SADM vencido en línea?",
        "acceptedAnswer": { "@type": "Answer", "text": "Sí. PagoYa procesa pagos de recibos SADM vigentes y con saldo pendiente. Si tienes varios bimestres vencidos, SADM puede requerir que pagues en sus oficinas o por su portal. Para un bimestre vencido, PagoYa generalmente funciona sin problema." }
      },
      {
        "@type": "Question",
        "name": "¿Cuánto tarda en reflejarse el pago SADM?",
        "acceptedAnswer": { "@type": "Answer", "text": "El pago se registra en segundos en PagoYa y recibes comprobante inmediato. SADM actualiza su sistema en un plazo de 24 a 48 horas hábiles. Si llevas más de 48 h y el portal sadm.mx aún no refleja el pago, conserva tu comprobante PagoYa y contáctalos directamente." }
      },
      {
        "@type": "Question",
        "name": "¿Cuánto cobra PagoYa por pagar el SADM?",
        "acceptedAnswer": { "@type": "Answer", "text": "PagoYa cobra una comisión fija de $25 MXN por transacción, sin importar el monto del recibo. Esta comisión cubre el procesamiento del pago y la generación del comprobante digital." }
      },
      {
        "@type": "Question",
        "name": "¿PagoYa está afiliado a SADM?",
        "acceptedAnswer": { "@type": "Answer", "text": "No. PagoYa es una plataforma independiente y no está afiliada oficialmente con los Servicios de Agua y Drenaje de Monterrey (SADM). PagoYa facilita el pago a través de sus canales de procesamiento, igual que otras plataformas de pago de servicios." }
      }
    ]
  };

  return (
    <div style={{ background: "#0A2540", minHeight: "100vh", display: "flex", flexDirection: "column", overflowX: "hidden" }}>
      <Helmet>
        <html lang="es-MX" />
        <title>SADM Pago en Línea: Cómo Pagar tu Recibo | PagoYa</title>
        <meta name="description" content="Paga tu recibo SADM (agua Monterrey) en línea sin cuenta bancaria. Guía completa paso a paso, métodos de pago y preguntas frecuentes." />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://pagoyamx.com/sadm-pago-en-linea" />
        <link rel="alternate" hrefLang="es-MX" href="https://pagoyamx.com/sadm-pago-en-linea" />
        <link rel="alternate" hrefLang="x-default" href="https://pagoyamx.com/sadm-pago-en-linea" />
        <meta name="geo.region" content="MX-NL" />
        <meta name="geo.placename" content="Monterrey, Nuevo León" />
        <meta property="og:title" content="SADM Pago en Línea: Cómo Pagar tu Recibo | PagoYa" />
        <meta property="og:description" content="Paga tu recibo SADM (agua Monterrey) en línea sin cuenta bancaria. Guía completa paso a paso." />
        <meta property="og:image" content="https://pagoyamx.com/og-image.png" />
        <meta property="og:type" content="article" />
        <meta property="og:url" content="https://pagoyamx.com/sadm-pago-en-linea" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="SADM Pago en Línea | PagoYa" />
        <meta name="twitter:description" content="Paga tu recibo SADM (agua Monterrey) en línea sin cuenta bancaria." />
        <script type="application/ld+json">{JSON.stringify(breadcrumb)}</script>
        <script type="application/ld+json">{JSON.stringify(article)}</script>
        <script type="application/ld+json">{JSON.stringify(faq)}</script>
      </Helmet>

      <style>{`
        .sadm-body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
        .sadm-body a { color: #1D9E75; text-decoration: underline; }
        .sadm-h1 { font-size: clamp(26px, 5vw, 42px); }
        .sadm-h2 { font-size: clamp(20px, 3.5vw, 28px); }
        .sadm-h3 { font-size: clamp(16px, 2.5vw, 20px); }
        .sadm-table { width: 100%; border-collapse: collapse; }
        .sadm-table th, .sadm-table td { padding: 10px 14px; border: 1px solid rgba(255,255,255,0.12); text-align: left; vertical-align: top; }
        .sadm-table th { background: rgba(29,158,117,0.18); color: #1D9E75; font-weight: 700; }
        .sadm-table tr:nth-child(even) td { background: rgba(255,255,255,0.03); }
        .sadm-ol { padding-left: 20px; }
        .sadm-ol li { margin-bottom: 10px; line-height: 1.6; color: #CBD5E1; }
        .sadm-ul { list-style: disc; padding-left: 22px; }
        .sadm-ul li { margin-bottom: 6px; line-height: 1.6; color: #CBD5E1; }
        @media(max-width:640px){ .sadm-table-wrap { overflow-x: auto; } .sadm-body { padding: 0 16px 48px; } }
      `}</style>

      {/* Nav */}
      <nav style={{ background: "rgba(10,37,64,0.95)", borderBottom: "1px solid rgba(255,255,255,0.08)", padding: "14px 24px", display: "flex", alignItems: "center", gap: "12px", position: "sticky", top: 0, zIndex: 50, backdropFilter: "blur(8px)" }}>
        <button onClick={() => navigate("/")} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
          <img src="/pagoya-logo.png" alt="PagoYa" style={{ height: "32px" }} />
        </button>
        <span style={{ flex: 1 }} />
        <button
          onClick={() => navigate("/pagar")}
          style={{ background: "#1D9E75", color: "white", border: "none", borderRadius: "20px", padding: "8px 18px", fontWeight: 700, fontSize: "14px", cursor: "pointer" }}
        >
          Pagar ahora
        </button>
      </nav>

      {/* Sticky bottom CTA */}
      {showSticky && (
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100, background: "rgba(10,37,64,0.97)", borderTop: "1px solid rgba(29,158,117,0.4)", padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", backdropFilter: "blur(10px)" }}>
          <p style={{ color: "white", fontWeight: 700, fontSize: "14px", margin: 0 }}>💧 Pagar recibo SADM</p>
          <button onClick={() => navigate("/pagar")} style={{ background: "linear-gradient(135deg, #1D9E75, #25C090)", color: "white", border: "none", borderRadius: "20px", padding: "10px 22px", fontWeight: 800, fontSize: "14px", cursor: "pointer" }}>
            Pagar SADM →
          </button>
        </div>
      )}

      {/* Hero */}
      <section style={{ padding: "56px 24px 40px", maxWidth: "760px", margin: "0 auto", width: "100%" }} className="sadm-body">
        <p style={{ color: "#1D9E75", fontWeight: 700, fontSize: "13px", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "12px" }}>
          💧 Agua y Drenaje · Servicios de Agua y Drenaje de Monterrey
        </p>
        <h1 className="sadm-h1" style={{ color: "white", fontWeight: 900, lineHeight: 1.2, marginBottom: "20px" }}>
          SADM Pago en Línea:<br />
          <span style={{ color: "#1D9E75" }}>Cómo Pagar tu Recibo de Agua</span>
        </h1>
        <p style={{ color: "#94A3B8", fontSize: "18px", lineHeight: 1.7, marginBottom: "32px", maxWidth: "620px" }}>
          Los <strong style={{ color: "white" }}>Servicios de Agua y Drenaje de Monterrey (SADM)</strong> emiten recibos bimestrales para la mayor parte del área metropolitana de Monterrey. Esta guía te explica cómo leer tu recibo, qué información necesitas y cómo pagar en línea, aunque no tengas cuenta bancaria.
        </p>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <button
            onClick={() => navigate("/pagar")}
            style={{ background: "linear-gradient(135deg, #1D9E75, #25C090)", color: "white", border: "none", borderRadius: "50px", padding: "16px 32px", fontWeight: 800, fontSize: "16px", cursor: "pointer", boxShadow: "0 8px 24px rgba(29,158,117,0.4)" }}
          >
            Pagar SADM ahora →
          </button>
          <button
            onClick={() => navigate("/cargar")}
            style={{ background: "rgba(255,255,255,0.08)", color: "white", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "50px", padding: "16px 28px", fontWeight: 700, fontSize: "15px", cursor: "pointer" }}
          >
            Cargar saldo primero
          </button>
        </div>
      </section>

      {/* What is SADM */}
      <section style={{ padding: "0 24px 48px", maxWidth: "760px", margin: "0 auto", width: "100%" }} className="sadm-body">
        <h2 className="sadm-h2" style={{ color: "white", fontWeight: 800, marginBottom: "16px" }}>
          ¿Qué es SADM?
        </h2>
        <p style={{ color: "#94A3B8", lineHeight: 1.8, marginBottom: "16px" }}>
          SADM (Servicios de Agua y Drenaje de Monterrey) es el organismo público descentralizado del estado de Nuevo León responsable de suministrar agua potable y el servicio de drenaje a los municipios del área metropolitana de Monterrey. Atiende a más de un millón de usuarios residenciales y comerciales en municipios como:
        </p>
        <ul className="sadm-ul" style={{ marginBottom: "24px" }}>
          <li>Monterrey</li>
          <li>San Nicolás de los Garza</li>
          <li>Apodaca</li>
          <li>Guadalupe</li>
          <li>Escobedo</li>
          <li>San Pedro Garza García</li>
          <li>Santa Catarina y otros</li>
        </ul>
        <p style={{ color: "#94A3B8", lineHeight: 1.8 }}>
          SADM factura de forma bimestral (cada dos meses). El recibo incluye el consumo de agua potable y el cargo por drenaje y saneamiento.
        </p>
      </section>

      {/* How to read the bill */}
      <section style={{ padding: "0 24px 48px", maxWidth: "760px", margin: "0 auto", width: "100%" }} className="sadm-body">
        <h2 className="sadm-h2" style={{ color: "white", fontWeight: 800, marginBottom: "20px" }}>
          Cómo identificar los datos de tu recibo SADM
        </h2>
        <p style={{ color: "#94A3B8", lineHeight: 1.8, marginBottom: "20px" }}>
          Para pagar el SADM en línea necesitas al menos uno de estos datos, que aparecen en tu recibo bimestral:
        </p>
        <div className="sadm-table-wrap">
          <table className="sadm-table" style={{ color: "#CBD5E1", fontSize: "14px", marginBottom: "24px" }}>
            <thead>
              <tr>
                <th>Dato</th>
                <th>Dónde aparece en el recibo</th>
                <th>Para qué sirve</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong style={{ color: "white" }}>Número de cuenta / contrato</strong></td>
                <td>Parte superior derecha del recibo. Generalmente 9–12 dígitos.</td>
                <td>Es el identificador principal. No cambia entre bimestres.</td>
              </tr>
              <tr>
                <td><strong style={{ color: "white" }}>Periodo de facturación</strong></td>
                <td>Indica el bimestre que cubre el recibo (ej. "Bimestre 3 / 2026")</td>
                <td>Referencia para confirmar cuál periodo estás pagando.</td>
              </tr>
              <tr>
                <td><strong style={{ color: "white" }}>Monto a pagar</strong></td>
                <td>Parte central del recibo, en letras grandes.</td>
                <td>El importe que debes cubrir, sin incluir la comisión de servicio de PagoYa.</td>
              </tr>
              <tr>
                <td><strong style={{ color: "white" }}>Fecha límite de pago</strong></td>
                <td>Esquina inferior izquierda o derecha del recibo.</td>
                <td>Si pagas después de esta fecha, el recibo está vencido pero normalmente sigue siendo pagable.</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div style={{ background: "rgba(29,158,117,0.08)", border: "1px solid rgba(29,158,117,0.25)", borderRadius: "12px", padding: "16px 20px", marginBottom: "16px" }}>
          <p style={{ color: "#94A3B8", fontSize: "14px", lineHeight: 1.7, margin: 0 }}>
            <strong style={{ color: "#1D9E75" }}>¿No tienes tu recibo físico?</strong> Puedes consultar tu número de cuenta en el portal oficial <strong style={{ color: "white" }}>sadm.mx</strong> ingresando tu CURP o la dirección del inmueble. Con ese número puedes pagar en línea sin el recibo en mano.
          </p>
        </div>
      </section>

      {/* Payment options */}
      <section style={{ padding: "0 24px 48px", maxWidth: "760px", margin: "0 auto", width: "100%" }} className="sadm-body">
        <h2 className="sadm-h2" style={{ color: "white", fontWeight: 800, marginBottom: "20px" }}>
          Opciones para pagar el SADM en línea y en persona
        </h2>
        <div className="sadm-table-wrap">
          <table className="sadm-table" style={{ color: "#CBD5E1", fontSize: "14px", marginBottom: "32px" }}>
            <thead>
              <tr>
                <th>Opción</th>
                <th>Requiere</th>
                <th>Comisión aprox.</th>
                <th>Disponibilidad</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong style={{ color: "#1D9E75" }}>PagoYa</strong></td>
                <td>Celular + efectivo en OXXO o tarjeta</td>
                <td>$25 MXN fija</td>
                <td>Cualquier OXXO de México</td>
              </tr>
              <tr>
                <td>Portal sadm.mx</td>
                <td>Tarjeta de crédito o débito</td>
                <td>Variable (cargo bancario)</td>
                <td>En línea, 24/7</td>
              </tr>
              <tr>
                <td>Cajas SADM</td>
                <td>Ir en persona, recibo físico recomendado</td>
                <td>Sin comisión</td>
                <td>Horario de oficina</td>
              </tr>
              <tr>
                <td>Bancos (BBVA, Santander, Banorte)</td>
                <td>Cuenta bancaria activa</td>
                <td>$15–$30 MXN</td>
                <td>Ventanilla o banca en línea</td>
              </tr>
              <tr>
                <td>OXXO Pay (recibo en mano)</td>
                <td>Recibo físico con código de barras</td>
                <td>~$13 MXN</td>
                <td>En tienda OXXO</td>
              </tr>
              <tr>
                <td>Transferencia SPEI / app bancaria</td>
                <td>Cuenta bancaria + CLABE SADM</td>
                <td>Sin comisión o mínima</td>
                <td>En línea</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 className="sadm-h3" style={{ color: "white", fontWeight: 800, marginBottom: "16px" }}>
          Cómo pagar el SADM con PagoYa (sin cuenta bancaria)
        </h3>
        <ol className="sadm-ol" style={{ marginBottom: "32px" }}>
          <li><strong style={{ color: "white" }}>Crea tu cuenta PagoYa.</strong> Solo necesitas tu número de teléfono. Sin CURP, sin banco, sin tarjeta. Listo en 90 segundos.</li>
          <li><strong style={{ color: "white" }}>Recarga con efectivo en OXXO.</strong> Ve a cualquier OXXO, da tu número de teléfono y deposita el monto de tu recibo más $25 MXN de comisión. El saldo llega a tu cuenta PagoYa al instante.</li>
          <li><strong style={{ color: "white" }}>Selecciona el servicio SADM.</strong> En la app, elige "Pagar servicio" → busca "Agua" o "SADM" → ingresa tu número de contrato.</li>
          <li><strong style={{ color: "white" }}>Confirma el pago.</strong> Revisa el monto y confirma. Recibes comprobante digital en pantalla con folio de transacción. SADM registra el pago en 24–48 h hábiles.</li>
        </ol>

        {/* Feature pills */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px", marginBottom: "16px" }}>
          {[
            { icon: "📱", title: "Sin banco", desc: "ni tarjeta requerida" },
            { icon: "⚡", title: "Pago rápido", desc: "en minutos" },
            { icon: "🏪", title: "+19,000 OXXO", desc: "en todo México" },
            { icon: "🧾", title: "Comprobante", desc: "digital inmediato" },
          ].map(f => (
            <div key={f.title} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "16px", padding: "18px 16px" }}>
              <p style={{ fontSize: "24px", marginBottom: "6px" }}>{f.icon}</p>
              <p style={{ color: "white", fontWeight: 800, fontSize: "15px", marginBottom: "2px" }}>{f.title}</p>
              <p style={{ color: "#94A3B8", fontSize: "13px" }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Overdue bills */}
      <section style={{ padding: "0 24px 48px", maxWidth: "760px", margin: "0 auto", width: "100%" }} className="sadm-body">
        <h2 className="sadm-h2" style={{ color: "white", fontWeight: 800, marginBottom: "16px" }}>
          ¿Dónde puedo pagar un recibo de agua SADM vencido?
        </h2>
        <p style={{ color: "#94A3B8", lineHeight: 1.8, marginBottom: "16px" }}>
          Si tu recibo ya venció, SADM generalmente sigue permitiendo el pago en línea, especialmente si no llevas más de un bimestre de adeudo. Para adeudos acumulados de varios periodos, SADM puede requerir que pagues directamente en sus cajas o a través de su portal con convenio especial.
        </p>
        <div style={{ background: "rgba(255,193,7,0.07)", border: "1px solid rgba(255,193,7,0.2)", borderRadius: "12px", padding: "16px 20px", marginBottom: "24px" }}>
          <p style={{ color: "#94A3B8", fontSize: "14px", lineHeight: 1.7, margin: 0 }}>
            <strong style={{ color: "#FFC107" }}>⚠️ Recibo muy vencido:</strong> Si tienes varios bimestres sin pagar y el servicio fue suspendido, necesitas acudir a las oficinas de SADM para regularizarte antes de poder pagar en línea.
          </p>
        </div>
        <p style={{ color: "#94A3B8", lineHeight: 1.8 }}>
          Para un recibo con pocos días o semanas de vencido, PagoYa funciona normalmente. Solo ingresa tu número de contrato y el sistema consulta el saldo adeudado.
        </p>
      </section>

      {/* Common problems */}
      <section style={{ padding: "0 24px 48px", maxWidth: "760px", margin: "0 auto", width: "100%" }} className="sadm-body">
        <h2 className="sadm-h2" style={{ color: "white", fontWeight: 800, marginBottom: "20px" }}>
          Problemas comunes al pagar el SADM en línea
        </h2>
        {[
          {
            q: "El portal sadm.mx no acepta mi tarjeta",
            a: "Algunos bancos bloquean pagos a organismos públicos por políticas de seguridad. Prueba con otra tarjeta, activa los pagos en línea desde tu app bancaria, o usa PagoYa para pagar con efectivo desde OXXO sin tarjeta."
          },
          {
            q: "No encuentro mi número de contrato SADM",
            a: "Busca en la parte superior derecha de tu recibo bimestral. Si no tienes el recibo, ingrésalo en sadm.mx con tu CURP o la dirección exacta del inmueble (calle, número exterior, colonia, municipio)."
          },
          {
            q: "El pago aparece como procesado pero SADM sigue mostrando adeudo",
            a: "SADM tarda entre 24 y 48 horas hábiles en actualizar su sistema. Guarda tu comprobante de pago (con folio de transacción) durante al menos 5 días. Si después de ese plazo el portal sadm.mx sigue sin reflejar el pago, presenta el comprobante en sus oficinas."
          },
          {
            q: "¿Qué pasa si pago dos veces por error?",
            a: "SADM aplica los pagos a tu cuenta como saldo a favor. El excedente se descuenta de tu siguiente bimestre. No pierdes el dinero pagado de más."
          },
        ].map((item, i) => (
          <div key={i} style={{ marginBottom: "20px", borderBottom: "1px solid rgba(255,255,255,0.07)", paddingBottom: "20px" }}>
            <p style={{ color: "white", fontWeight: 700, fontSize: "16px", marginBottom: "8px" }}>⚙️ {item.q}</p>
            <p style={{ color: "#94A3B8", lineHeight: 1.7, fontSize: "15px" }}>{item.a}</p>
          </div>
        ))}
      </section>

      {/* FAQ */}
      <section style={{ padding: "0 24px 48px", maxWidth: "760px", margin: "0 auto", width: "100%" }} className="sadm-body">
        <h2 className="sadm-h2" style={{ color: "white", fontWeight: 800, marginBottom: "24px" }}>
          Preguntas frecuentes — SADM pago en línea
        </h2>
        {[
          { q: "¿Cómo pago el SADM en línea sin cuenta bancaria?", a: "Con PagoYa puedes pagar tu recibo SADM desde tu celular sin necesitar una cuenta bancaria. Recarga tu billetera con efectivo en cualquier OXXO, luego selecciona SADM, ingresa tu número de contrato y confirma el pago." },
          { q: "¿Qué número necesito para el pago SADM en línea?", a: "Necesitas tu número de cuenta o contrato SADM. Aparece en la parte superior de tu recibo bimestral. Si no tienes el recibo, consúltalo en sadm.mx con tu CURP o dirección del inmueble." },
          { q: "¿Puedo pagar un recibo de agua SADM vencido en línea?", a: "Generalmente sí, si tienes un bimestre vencido. PagoYa procesa pagos de recibos con saldo pendiente. Para adeudos de varios bimestres acumulados, SADM puede requerir atención en sus oficinas." },
          { q: "¿Cuánto tarda en reflejarse el pago SADM?", a: "El pago se registra en segundos en PagoYa. SADM actualiza su sistema en 24–48 h hábiles. Guarda tu comprobante con folio de transacción como respaldo." },
          { q: "¿Cuánto cobra PagoYa por pagar el SADM?", a: "PagoYa cobra una comisión fija de $25 MXN por transacción. Esta tarifa aplica sin importar el monto del recibo." },
          { q: "¿PagoYa está afiliado a SADM?", a: "No. PagoYa es una plataforma independiente y no está afiliada oficialmente con SADM. PagoYa facilita el pago de servicios a través de sus canales de procesamiento." },
        ].map((item, i) => (
          <div key={i} style={{ marginBottom: "20px", borderBottom: "1px solid rgba(255,255,255,0.07)", paddingBottom: "20px" }}>
            <p style={{ color: "white", fontWeight: 700, fontSize: "16px", marginBottom: "8px" }}>❓ {item.q}</p>
            <p style={{ color: "#94A3B8", lineHeight: 1.7, fontSize: "15px" }}>{item.a}</p>
          </div>
        ))}
      </section>

      {/* Disclaimer */}
      <section style={{ padding: "0 24px 32px", maxWidth: "760px", margin: "0 auto", width: "100%" }} className="sadm-body">
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", padding: "16px 20px" }}>
          <p style={{ color: "#64748B", fontSize: "13px", lineHeight: 1.7, margin: 0 }}>
            PagoYa es una plataforma independiente y no está afiliada oficialmente con los Servicios de Agua y Drenaje de Monterrey (SADM), salvo que se indique expresamente. Las marcas SADM y su logotipo son propiedad de sus respectivos titulares.
          </p>
        </div>
      </section>

      {/* Related links */}
      <section style={{ padding: "0 24px 40px", maxWidth: "760px", margin: "0 auto", width: "100%" }} className="sadm-body">
        <h2 className="sadm-h2" style={{ color: "white", fontWeight: 800, marginBottom: "16px" }}>Guías relacionadas</h2>
        <ul className="sadm-ul">
          <li><a href="/pagar-agua-monterrey">Cómo pagar agua SADM Monterrey con efectivo en OXXO</a></li>
          <li><a href="/pagar-servicios-monterrey">Pagar servicios en Monterrey: agua, luz y gas</a></li>
          <li><a href="/pagar-cfe-monterrey">Pagar CFE Monterrey en línea</a></li>
          <li><a href="/pagar-agua-mexico">Guía general: pagar agua en México sin cuenta bancaria</a></li>
          <li><a href="/guia-pagar-servicios-sin-cuenta-bancaria">Cómo pagar servicios en México sin cuenta bancaria</a></li>
        </ul>
      </section>

      {/* Final CTA */}
      <section style={{ padding: "0 24px 64px", maxWidth: "760px", margin: "0 auto", width: "100%", textAlign: "center" }} className="sadm-body">
        <div style={{ background: "linear-gradient(135deg, rgba(29,158,117,0.15), rgba(29,158,117,0.05))", border: "1px solid rgba(29,158,117,0.3)", borderRadius: "24px", padding: "40px 24px" }}>
          <p style={{ fontSize: "32px", marginBottom: "12px" }}>💧</p>
          <h2 style={{ color: "white", fontWeight: 900, fontSize: "22px", marginBottom: "10px" }}>
            Paga tu recibo SADM ahora mismo
          </h2>
          <p style={{ color: "#94A3B8", fontSize: "15px", marginBottom: "28px", lineHeight: 1.6 }}>
            Sin banco, sin tarjeta, sin filas.<br />Solo tu celular y efectivo en OXXO.
          </p>
          <button
            onClick={() => navigate("/pagar")}
            style={{ background: "linear-gradient(135deg, #1D9E75, #25C090)", color: "white", border: "none", borderRadius: "50px", padding: "16px 36px", fontWeight: 800, fontSize: "16px", cursor: "pointer", boxShadow: "0 8px 24px rgba(29,158,117,0.4)" }}
          >
            Pagar mi SADM →
          </button>
        </div>
      </section>
    </div>
  );
}
