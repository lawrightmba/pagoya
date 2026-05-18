import { Helmet } from "react-helmet-async";
import { useLocation } from "wouter";

export default function PagarTelmex() {
  const [, navigate] = useLocation();

  return (
    <div style={{ background: "#0A2540", minHeight: "100vh", display: "flex", flexDirection: "column", overflowX: "hidden" }}>
      <Helmet>
        <title>Cómo Pagar Telmex, Izzi y Totalplay Sin Ir al Banco | PagoYa</title>
        <meta name="description" content="Paga tu Telmex, Izzi, Totalplay, Megacable o Sky desde tu celular en minutos. Sin cuenta bancaria, sin tarjeta. Recarga con efectivo en OXXO y paga al instante." />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://pagoyamx.com/pagar-telmex" />
        <meta property="og:title" content="Cómo Pagar Telmex, Izzi y Totalplay Sin Ir al Banco | PagoYa" />
        <meta property="og:description" content="Paga tu Telmex, Izzi, Totalplay, Megacable o Sky desde tu celular en minutos. Sin cuenta bancaria, sin tarjeta. Recarga con efectivo en OXXO y paga al instante." />
        <meta property="og:type" content="article" />
        <meta property="og:url" content="https://pagoyamx.com/pagar-telmex" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          "headline": "Cómo pagar Telmex, Izzi y Totalplay sin ir al banco",
          "description": "Paga tu Telmex, Izzi, Totalplay, Megacable o Sky desde tu celular en minutos. Sin cuenta bancaria, sin tarjeta.",
          "url": "https://pagoyamx.com/pagar-telmex",
          "publisher": { "@type": "Organization", "name": "PagoYa", "url": "https://pagoyamx.com" },
          "inLanguage": ["es", "en"]
        })}</script>
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Inicio", "item": "https://pagoyamx.com/" },
            { "@type": "ListItem", "position": 2, "name": "Pagar Telmex", "item": "https://pagoyamx.com/pagar-telmex" }
          ]
        })}</script>
      </Helmet>

      <style>{`
        .telmex-body a { color: #1D9E75; text-decoration: underline; }
        .telmex-body a:hover { color: #17c99a; }
        .telmex-h1 { font-size: clamp(26px, 5vw, 42px); }
        .telmex-h2 { font-size: clamp(20px, 3.5vw, 28px); }
        .telmex-table { width: 100%; border-collapse: collapse; }
        .telmex-table th, .telmex-table td { padding: 10px 14px; border: 1px solid rgba(255,255,255,0.12); text-align: left; vertical-align: top; }
        .telmex-table th { background: rgba(29,158,117,0.18); color: #1D9E75; font-weight: 700; }
        .telmex-table tr:nth-child(even) td { background: rgba(255,255,255,0.03); }
        .telmex-ol { padding-left: 20px; }
        .telmex-ol li { margin-bottom: 10px; line-height: 1.6; color: #CBD5E1; }
        .telmex-ul { list-style: disc; padding-left: 22px; }
        .telmex-ul li { margin-bottom: 6px; line-height: 1.6; color: #CBD5E1; }
        @media(max-width:640px){ .telmex-table-wrap { overflow-x: auto; } }
      `}</style>

      {/* NAV */}
      <header style={{ background: "#0A2540", padding: "10px 20px", display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <span />
        <div style={{ display: "flex", justifyContent: "center", cursor: "pointer" }} onClick={() => navigate("/")}>
          <img src="/pagoya-logo.png" alt="PagoYa" style={{ height: "44px", width: "auto", maxWidth: "180px", objectFit: "contain" }}
            onError={(e) => { e.currentTarget.style.display = "none"; const s = e.currentTarget.nextSibling as HTMLElement | null; if (s) s.style.display = "inline"; }} />
          <span style={{ display: "none", color: "white", fontWeight: 800, fontSize: "22px" }}>Pago<span style={{ color: "#1D9E75" }}>Ya</span></span>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button onClick={() => navigate("/")} style={{ fontSize: "12px", fontWeight: 700, color: "white", border: "1.5px solid rgba(255,255,255,0.35)", borderRadius: "999px", padding: "4px 12px", background: "rgba(255,255,255,0.10)", cursor: "pointer" }}>← Inicio</button>
        </div>
      </header>

      <main style={{ flex: 1 }}>
        <article className="telmex-body" style={{ maxWidth: "780px", margin: "0 auto", padding: "48px 24px 80px", color: "#E2E8F0", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>

          <h1 className="telmex-h1" style={{ color: "#FFFFFF", fontWeight: 800, lineHeight: 1.2, marginBottom: "8px" }}>
            Cómo pagar Telmex, Izzi y Totalplay sin ir al banco
          </h1>
          <p style={{ color: "#1D9E75", fontWeight: 600, fontSize: "18px", marginBottom: "32px" }}>
            How to Pay Your Internet &amp; Phone Bills Without Going to the Bank
          </p>
          <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.10)", margin: "32px 0" }} />

          {/* Intro */}
          <h2 className="telmex-h2" style={{ color: "#FFFFFF", fontWeight: 700, marginBottom: "6px" }}>Paga tu internet y teléfono desde tu celular — sin cuenta bancaria</h2>
          <p style={{ lineHeight: 1.7, marginBottom: "14px" }}>Telmex, Izzi, Totalplay, Megacable, Sky — si vives en México, probablemente tienes al menos uno de estos servicios en casa. Y cada mes llega la misma historia: el recibo, la fecha límite, y la pregunta de cómo pagarlo sin perder una mañana entera.</p>
          <p style={{ lineHeight: 1.7, marginBottom: "14px", color: "#94A3B8" }}>Telmex, Izzi, Totalplay, Megacable, Sky — if you live in Mexico, you probably have at least one of these services at home. And every month the same story arrives: the bill, the due date, and the question of how to pay it without losing an entire morning.</p>
          <p style={{ lineHeight: 1.7 }}>Con PagoYa puedes pagar todos estos servicios desde tu celular en minutos — sin tarjeta, sin cuenta bancaria, y con solo efectivo en OXXO si eso es lo que tienes. <span style={{ color: "#94A3B8" }}>With PagoYa you can pay all these services from your phone in minutes — no card, no bank account, and with just cash at OXXO if that's what you have.</span></p>

          <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.10)", margin: "40px 0" }} />

          {/* Servicios */}
          <h2 className="telmex-h2" style={{ color: "#FFFFFF", fontWeight: 700, marginBottom: "6px" }}>Servicios de internet y cable que puedes pagar con PagoYa</h2>
          <p style={{ color: "#64748B", fontWeight: 500, marginBottom: "16px" }}>Internet, Cable &amp; Landline Providers Available</p>
          <p style={{ lineHeight: 1.7, marginBottom: "16px" }}>PagoYa soporta los principales proveedores de internet, cable y telefonía fija en México: <span style={{ color: "#94A3B8" }}>PagoYa supports Mexico's main internet, cable, and landline providers:</span></p>
          <ul className="telmex-ul" style={{ marginBottom: "20px" }}>
            {[
              ["Telmex", "internet y teléfono fijo Infinitum / internet and Infinitum landline"],
              ["Izzi", "cable e internet / cable and internet"],
              ["Totalplay", "internet de fibra óptica / fiber optic internet"],
              ["Megacable", "cable e internet / cable and internet"],
              ["Sky", "televisión satelital / satellite television"],
            ].map(([name, desc]) => (
              <li key={name}><strong style={{ color: "#FFFFFF" }}>{name}</strong> — {desc}</li>
            ))}
          </ul>
          <p style={{ lineHeight: 1.7, padding: "14px 18px", background: "rgba(29,158,117,0.10)", borderLeft: "3px solid #1D9E75", borderRadius: "4px" }}>
            Todos desde una sola app. Un solo proceso de pago. Una sola comisión de <strong style={{ color: "#1D9E75" }}>$25 MXN</strong>.{" "}
            <span style={{ color: "#94A3B8" }}>All from a single app. One payment process. One flat $25 MXN fee.</span>
          </p>

          <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.10)", margin: "40px 0" }} />

          {/* Paso a paso */}
          <h2 className="telmex-h2" style={{ color: "#FFFFFF", fontWeight: 700, marginBottom: "6px" }}>Cómo pagar Telmex con PagoYa: paso a paso</h2>
          <p style={{ color: "#64748B", fontWeight: 500, marginBottom: "20px" }}>How to Pay Telmex With PagoYa: Step by Step</p>
          <p style={{ lineHeight: 1.7, marginBottom: "20px" }}>El proceso es el mismo para todos los proveedores — aquí el ejemplo con Telmex: <span style={{ color: "#94A3B8" }}>The process is the same for all providers — here's the example with Telmex:</span></p>
          {[
            { n: 1, es: "Abre la app PagoYa y asegúrate de tener saldo en tu billetera. Si no tienes, recarga con efectivo en cualquier OXXO.", en: "Open the PagoYa app and make sure you have balance in your wallet. If not, load with cash at any OXXO." },
            { n: 2, es: "Selecciona Telmex (o Izzi, Totalplay, Megacable, Sky) en el catálogo de servicios.", en: "Select Telmex (or Izzi, Totalplay, Megacable, Sky) from the service catalog." },
            { n: 3, es: "Ingresa tu número de cuenta o número de teléfono de Telmex — lo encuentras en tu recibo mensual.", en: "Enter your Telmex account number or phone number — you'll find it on your monthly bill." },
            { n: 4, es: "Confirma el monto a pagar y autoriza la transacción.", en: "Confirm the amount to pay and authorize the transaction." },
            { n: 5, es: "Recibe tu confirmación en segundos. Tu servicio queda al corriente.", en: "Receive your confirmation in seconds. Your service is up to date." },
          ].map(({ n, es, en }) => (
            <div key={n} style={{ display: "flex", gap: "16px", marginBottom: "18px", alignItems: "flex-start" }}>
              <div style={{ width: "32px", height: "32px", borderRadius: "50%", flexShrink: 0, background: "#1D9E75", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: 800 }}>{n}</div>
              <div><p style={{ margin: 0, lineHeight: 1.6 }}>{es}</p><p style={{ margin: "4px 0 0", lineHeight: 1.6, color: "#94A3B8", fontSize: "14px" }}>{en}</p></div>
            </div>
          ))}

          <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.10)", margin: "40px 0" }} />

          {/* Número de cuenta */}
          <h2 className="telmex-h2" style={{ color: "#FFFFFF", fontWeight: 700, marginBottom: "6px" }}>¿Dónde encuentro mi número de cuenta Telmex?</h2>
          <p style={{ color: "#64748B", fontWeight: 500, marginBottom: "16px" }}>Where Do I Find My Telmex Account Number?</p>
          <p style={{ lineHeight: 1.7, marginBottom: "14px" }}>Tu número de cuenta Telmex aparece en la parte superior de tu recibo mensual. También puedes encontrarlo: <span style={{ color: "#94A3B8" }}>Your Telmex account number appears at the top of your monthly bill. You can also find it:</span></p>
          <ul className="telmex-ul" style={{ marginBottom: "20px" }}>
            <li>En el portal <strong style={{ color: "#FFFFFF" }}>telmex.com</strong> con tu número de teléfono <span style={{ color: "#94A3B8" }}>/ On the telmex.com portal with your phone number</span></li>
            <li>En la app <strong style={{ color: "#FFFFFF" }}>Mi Telmex</strong> <span style={{ color: "#94A3B8" }}>/ In the Mi Telmex app</span></li>
            <li>Llamando al <strong style={{ color: "#FFFFFF" }}>800-123-2222</strong> <span style={{ color: "#94A3B8" }}>/ By calling 800-123-2222</span></li>
          </ul>
          <div style={{ padding: "16px 18px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px" }}>
            {[
              ["Izzi", "usa tu número de cuenta del recibo (formato: IZZI-XXXXXXXX) / use your account number from the bill (format: IZZI-XXXXXXXX)"],
              ["Totalplay", "usa el número de contrato de tu recibo mensual / use the contract number from your monthly bill"],
              ["Megacable", "usa el número de cliente que aparece en tu recibo / use the customer number on your bill"],
            ].map(([brand, desc]) => (
              <p key={brand} style={{ margin: "0 0 8px", lineHeight: 1.6 }}><strong style={{ color: "#1D9E75" }}>Para {brand}:</strong> {desc}</p>
            ))}
          </div>

          <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.10)", margin: "40px 0" }} />

          {/* Comisión */}
          <h2 className="telmex-h2" style={{ color: "#FFFFFF", fontWeight: 700, marginBottom: "6px" }}>¿Cuánto cobra PagoYa?</h2>
          <p style={{ color: "#64748B", fontWeight: 500, marginBottom: "16px" }}>How Much Does PagoYa Charge?</p>
          <p style={{ lineHeight: 1.7, marginBottom: "14px" }}><strong style={{ color: "#1D9E75" }}>$25 MXN fijo por transacción</strong> — sin importar el monto de tu recibo. <span style={{ color: "#94A3B8" }}>$25 MXN flat per transaction — regardless of your bill amount.</span></p>
          <p style={{ lineHeight: 1.7, padding: "14px 18px", background: "rgba(255,255,255,0.04)", borderRadius: "8px" }}>
            Si pagas Telmex ($399 MXN) y también Izzi ($450 MXN) el mismo mes, son dos transacciones separadas: $25 MXN cada una. Total de comisiones: <strong style={{ color: "#FFFFFF" }}>$50 MXN</strong> para quedarte sin filas ni viajes ese mes.{" "}
            <span style={{ color: "#94A3B8", fontSize: "14px" }}>If you pay Telmex and Izzi the same month, those are two separate $25 MXN fees — $50 MXN total to stay line-free that month.</span>
          </p>

          <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.10)", margin: "40px 0" }} />

          {/* Tiempo */}
          <h2 className="telmex-h2" style={{ color: "#FFFFFF", fontWeight: 700, marginBottom: "6px" }}>¿Cuánto tarda en aplicarse el pago?</h2>
          <p style={{ color: "#64748B", fontWeight: 500, marginBottom: "16px" }}>How Long Until the Payment Applies?</p>
          <p style={{ lineHeight: 1.7, marginBottom: "14px" }}>Los pagos a Telmex, Izzi, Totalplay y demás proveedores procesados con PagoYa se envían en tiempo real. En la mayoría de los casos el proveedor lo registra en menos de 24 horas, frecuentemente en minutos. <span style={{ color: "#94A3B8" }}>Payments are sent in real time. In most cases the provider registers it in under 24 hours, frequently within minutes.</span></p>
          <div style={{ padding: "14px 18px", background: "rgba(255,193,7,0.08)", border: "1px solid rgba(255,193,7,0.25)", borderRadius: "8px" }}>
            <p style={{ margin: 0, lineHeight: 1.6 }}><strong style={{ color: "#FFC107" }}>⚠️ Recomendación:</strong> Si tu servicio está por cortarse, paga con al menos 24 horas de anticipación. <span style={{ color: "#94A3B8" }}>If your service is about to be cut, pay at least 24 hours in advance.</span></p>
          </div>

          <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.10)", margin: "40px 0" }} />

          {/* Lo que necesitas */}
          <h2 className="telmex-h2" style={{ color: "#FFFFFF", fontWeight: 700, marginBottom: "6px" }}>¿Qué necesito para pagar mi internet sin cuenta bancaria?</h2>
          <p style={{ color: "#64748B", fontWeight: 500, marginBottom: "16px" }}>What Do I Need to Pay My Internet Without a Bank Account?</p>
          <p style={{ lineHeight: 1.7, marginBottom: "14px" }}>Solo tres cosas: <span style={{ color: "#94A3B8" }}>Just three things:</span></p>
          <ol className="telmex-ol" style={{ marginBottom: "16px" }}>
            <li><strong style={{ color: "#FFFFFF" }}>Tu celular con la app PagoYa instalada</strong> <span style={{ color: "#94A3B8" }}>/ Your phone with PagoYa installed</span></li>
            <li><strong style={{ color: "#FFFFFF" }}>Saldo en tu billetera PagoYa</strong> — recargable con efectivo en OXXO <span style={{ color: "#94A3B8" }}>/ Balance in your PagoYa wallet — loadable with cash at OXXO</span></li>
            <li><strong style={{ color: "#FFFFFF" }}>Tu número de cuenta del proveedor</strong> (está en tu recibo) <span style={{ color: "#94A3B8" }}>/ Your provider account number (on your bill)</span></li>
          </ol>
          <p style={{ lineHeight: 1.7, fontWeight: 600, color: "#1D9E75" }}>Sin tarjeta. Sin banco. Sin complicaciones. <span style={{ color: "#64748B", fontWeight: 400 }}>No card. No bank. No complications.</span></p>

          <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.10)", margin: "40px 0" }} />

          {/* Comparativa */}
          <h2 className="telmex-h2" style={{ color: "#FFFFFF", fontWeight: 700, marginBottom: "6px" }}>Pagar internet en México: comparación de opciones</h2>
          <p style={{ color: "#64748B", fontWeight: 500, marginBottom: "20px" }}>Paying Internet in Mexico: Comparison of Options</p>
          <div className="telmex-table-wrap" style={{ marginBottom: "20px" }}>
            <table className="telmex-table">
              <thead><tr><th></th><th>Ventanilla banco</th><th>Portal del proveedor</th><th>PagoYa</th></tr></thead>
              <tbody>
                {[
                  ["¿Necesitas cuenta bancaria?", "Sí", "Sí", "No"],
                  ["¿Disponible 24/7?", "No", "Sí", "Sí"],
                  ["¿Pago con efectivo?", "No", "No", "Sí (vía OXXO)"],
                  ["¿Múltiples proveedores?", "No", "No (uno por uno)", "Sí — todos en una app"],
                  ["¿Historial centralizado?", "No", "No", "Sí"],
                  ["¿Comisión?", "Variable", "$0 (con tarjeta)", "$25 MXN fijo"],
                ].map(([label, c1, c2, c3]) => (
                  <tr key={label}>
                    <td style={{ color: "#CBD5E1", fontWeight: 500 }}>{label}</td>
                    <td style={{ color: "#94A3B8" }}>{c1}</td>
                    <td style={{ color: "#94A3B8" }}>{c2}</td>
                    <td style={{ color: "#1D9E75", fontWeight: 600 }}>{c3}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ lineHeight: 1.7, color: "#94A3B8" }}>PagoYa's real advantage isn't just bank-free payment — it's having all your services in one app, with complete history and no need to remember passwords for five different portals.</p>

          <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.10)", margin: "40px 0" }} />

          {/* Otros servicios */}
          <h2 className="telmex-h2" style={{ color: "#FFFFFF", fontWeight: 700, marginBottom: "16px" }}>Otros servicios que puedes pagar con PagoYa</h2>
          <ul className="telmex-ul" style={{ marginBottom: "20px" }}>
            <li><a href="/pagar-cfe">CFE (recibo de luz) →</a></li>
            <li><a href="/recargas">Recargas Telcel, AT&amp;T y Movistar →</a></li>
            <li><a href="/pagar-renta">Renta de vivienda →</a></li>
            <li><a href="/servicios">Ver catálogo completo de 26+ servicios →</a></li>
          </ul>
          <p style={{ lineHeight: 1.7, padding: "14px 18px", background: "rgba(255,255,255,0.05)", borderRadius: "8px" }}>
            <a href="/guia-pagar-servicios-sin-cuenta-bancaria">Guía completa: Cómo pagar todos tus servicios en México sin cuenta bancaria →</a>
          </p>

          <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.10)", margin: "40px 0" }} />

          {/* FAQ */}
          <h2 className="telmex-h2" style={{ color: "#FFFFFF", fontWeight: 700, marginBottom: "24px" }}>Preguntas frecuentes</h2>
          {[
            { q: "¿Puedo pagar Telmex de otra persona con PagoYa?", a: "Sí. Solo necesitas el número de cuenta Telmex de esa persona. Ideal para pagar el servicio de un familiar.", eq: "Can I pay someone else's Telmex with PagoYa?", ea: "Yes. You just need that person's Telmex account number. Ideal for paying a family member's service." },
            { q: "¿PagoYa funciona para pagar paquetes Telmex (internet + TV + teléfono)?", a: "Sí. PagoYa paga el recibo mensual de Telmex independientemente del paquete contratado — internet solo, triple play, o cualquier combinación.", eq: "Does PagoYa work to pay Telmex packages?", ea: "Yes. PagoYa pays the monthly Telmex bill regardless of the contracted package." },
            { q: "¿Qué pasa si pago de más por error?", a: "PagoYa procesa exactamente el monto que tú confirmas. Siempre verifica el monto antes de confirmar. Si tienes un problema contacta soporte@pagoyamx.com.", eq: "What if I overpay by mistake?", ea: "PagoYa processes exactly the amount you confirm. Always verify before confirming. For problems contact soporte@pagoyamx.com." },
          ].map(({ q, a, eq, ea }) => (
            <div key={q} style={{ marginBottom: "20px", padding: "20px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px" }}>
              <p style={{ margin: "0 0 8px", fontWeight: 700, color: "#FFFFFF" }}>{q}</p>
              <p style={{ margin: "0 0 14px", lineHeight: 1.6 }}>{a}</p>
              <p style={{ margin: "0 0 4px", fontWeight: 600, color: "#64748B", fontSize: "14px" }}>{eq}</p>
              <p style={{ margin: 0, lineHeight: 1.6, color: "#94A3B8", fontSize: "14px" }}>{ea}</p>
            </div>
          ))}

          <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.10)", margin: "40px 0" }} />

          {/* CTA */}
          <div style={{ textAlign: "center", padding: "40px 24px", background: "rgba(29,158,117,0.10)", border: "1px solid rgba(29,158,117,0.25)", borderRadius: "16px" }}>
            <h2 style={{ color: "#FFFFFF", fontWeight: 800, fontSize: "24px", marginBottom: "8px" }}>Paga tu Telmex, Izzi o Totalplay ahora</h2>
            <p style={{ color: "#CBD5E1", marginBottom: "8px" }}>Sin filas. Sin traslados. Sin cuenta bancaria.</p>
            <p style={{ color: "#94A3B8", marginBottom: "28px" }}>No lines. No trips. No bank account.</p>
            <button onClick={() => navigate("/register")} style={{ background: "#1D9E75", color: "white", border: "none", borderRadius: "12px", padding: "16px 36px", fontSize: "16px", fontWeight: 700, cursor: "pointer" }}>
              Descargar PagoYa gratis →
            </button>
            <p style={{ color: "#475569", fontSize: "12px", marginTop: "20px", lineHeight: 1.5 }}>
              PagoYa es operado por Longview Meridian Technologies. Comisión fija de $25 MXN por transacción. Pagos procesados vía SIPREL y Evoluciona con failover automático.
            </p>
          </div>
        </article>
      </main>
    </div>
  );
}
