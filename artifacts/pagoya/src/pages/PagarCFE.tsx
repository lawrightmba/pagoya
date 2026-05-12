import { Helmet } from "react-helmet-async";
import { useLocation } from "wouter";

export default function PagarCFE() {
  const [, navigate] = useLocation();

  return (
    <div style={{ background: "#0A2540", minHeight: "100vh", display: "flex", flexDirection: "column", overflowX: "hidden" }}>
      <Helmet>
        <title>Cómo Pagar tu Recibo de CFE Sin Ir al Banco | PagoYa</title>
        <meta name="description" content="Paga tu recibo de CFE desde tu celular en menos de 2 minutos. Sin cuenta bancaria, sin tarjeta, sin filas. Recarga con efectivo en OXXO y paga al instante con PagoYa." />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://pagoyamx.com/pagar-cfe" />
        <meta property="og:title" content="Cómo Pagar tu Recibo de CFE Sin Ir al Banco | PagoYa" />
        <meta property="og:description" content="Paga tu recibo de CFE desde tu celular en menos de 2 minutos. Sin cuenta bancaria, sin tarjeta, sin filas. Recarga con efectivo en OXXO y paga al instante con PagoYa." />
        <meta property="og:type" content="article" />
        <meta property="og:url" content="https://pagoyamx.com/pagar-cfe" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          "headline": "Cómo pagar tu recibo de CFE sin ir al banco",
          "description": "Paga tu recibo de CFE desde tu celular en menos de 2 minutos. Sin cuenta bancaria, sin tarjeta, sin filas.",
          "url": "https://pagoyamx.com/pagar-cfe",
          "publisher": {
            "@type": "Organization",
            "name": "PagoYa",
            "url": "https://pagoyamx.com"
          },
          "inLanguage": ["es", "en"]
        })}</script>
      </Helmet>

      <style>{`
        .cfe-body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
        .cfe-body a { color: #1D9E75; text-decoration: underline; }
        .cfe-body a:hover { color: #17c99a; }
        .cfe-h1 { font-size: clamp(26px, 5vw, 42px); }
        .cfe-h2 { font-size: clamp(20px, 3.5vw, 28px); }
        .cfe-table { width: 100%; border-collapse: collapse; }
        .cfe-table th, .cfe-table td { padding: 10px 14px; border: 1px solid rgba(255,255,255,0.12); text-align: left; vertical-align: top; }
        .cfe-table th { background: rgba(29,158,117,0.18); color: #1D9E75; font-weight: 700; }
        .cfe-table tr:nth-child(even) td { background: rgba(255,255,255,0.03); }
        .cfe-ol { padding-left: 20px; }
        .cfe-ol li { margin-bottom: 10px; line-height: 1.6; color: #CBD5E1; }
        .cfe-ul { list-style: disc; padding-left: 22px; }
        .cfe-ul li { margin-bottom: 6px; line-height: 1.6; color: #CBD5E1; }
        @media(max-width:640px){
          .cfe-table-wrap { overflow-x: auto; }
          .cfe-body { padding: 0 16px 48px; }
        }
      `}</style>

      {/* ── NAV ── */}
      <header style={{
        background: "#0A2540",
        padding: "10px 20px",
        display: "grid",
        gridTemplateColumns: "1fr auto 1fr",
        alignItems: "center",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
      }}>
        <span />
        <div style={{ display: "flex", justifyContent: "center", cursor: "pointer" }} onClick={() => navigate("/")}>
          <img
            src="/pagoya-logo.png"
            alt="PagoYa"
            style={{ height: "44px", width: "auto", maxWidth: "180px", objectFit: "contain", display: "block" }}
            onError={(e) => {
              e.currentTarget.style.display = "none";
              const sib = e.currentTarget.nextSibling as HTMLElement | null;
              if (sib) sib.style.display = "inline";
            }}
          />
          <span style={{ display: "none", color: "white", fontWeight: 800, fontSize: "22px" }}>
            Pago<span style={{ color: "#1D9E75" }}>Ya</span>
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={() => navigate("/")}
            style={{
              fontSize: "12px", fontWeight: 700, color: "white",
              border: "1.5px solid rgba(255,255,255,0.35)", borderRadius: "999px",
              padding: "4px 12px", background: "rgba(255,255,255,0.10)", cursor: "pointer",
            }}
          >
            ← Inicio
          </button>
        </div>
      </header>

      {/* ── ARTICLE ── */}
      <main style={{ flex: 1 }}>
        <article
          className="cfe-body"
          style={{
            maxWidth: "780px",
            margin: "0 auto",
            padding: "48px 24px 80px",
            color: "#E2E8F0",
          }}
        >
          {/* Title */}
          <h1 className="cfe-h1" style={{ color: "#FFFFFF", fontWeight: 800, lineHeight: 1.2, marginBottom: "8px" }}>
            Cómo pagar tu recibo de CFE sin ir al banco
          </h1>
          <p style={{ color: "#1D9E75", fontWeight: 600, fontSize: "18px", marginBottom: "32px" }}>
            How to Pay Your CFE Electricity Bill Without Going to the Bank
          </p>

          <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.10)", margin: "32px 0" }} />

          {/* ¿Cansado? */}
          <h2 className="cfe-h2" style={{ color: "#FFFFFF", fontWeight: 700, marginBottom: "6px" }}>
            ¿Cansado de hacer fila para pagar tu recibo de luz?
          </h2>
          <p style={{ color: "#64748B", fontWeight: 500, marginBottom: "16px" }}>Tired of Standing in Line to Pay Your Electricity Bill?</p>

          <p style={{ lineHeight: 1.7, marginBottom: "14px" }}>
            Pagar el recibo de CFE es uno de esos trámites que nadie quiere hacer pero nadie puede ignorar. Si no pagas, te cortan la luz. Y sin embargo, millones de mexicanos siguen haciendo filas en bancos, en tiendas de conveniencia, o en las propias oficinas de CFE — perdiendo tiempo valioso cada mes.
          </p>
          <p style={{ lineHeight: 1.7, marginBottom: "14px", color: "#94A3B8" }}>
            Yet millions of Mexicans still stand in line at banks, convenience stores, or CFE offices — losing valuable time every month.
          </p>
          <p style={{ lineHeight: 1.7, marginBottom: "14px" }}>
            Hay una manera más fácil. Con PagoYa, puedes pagar tu recibo de CFE desde tu celular en menos de 2 minutos — sin tarjeta, sin cuenta bancaria, sin filas.
          </p>
          <p style={{ lineHeight: 1.7, color: "#94A3B8" }}>
            There's an easier way. With PagoYa, you can pay your CFE bill from your phone in under 2 minutes — no card, no bank account, no lines.
          </p>

          <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.10)", margin: "40px 0" }} />

          {/* Lo que necesitas */}
          <h2 className="cfe-h2" style={{ color: "#FFFFFF", fontWeight: 700, marginBottom: "6px" }}>
            Lo que necesitas para pagar tu CFE con PagoYa
          </h2>
          <p style={{ color: "#64748B", fontWeight: 500, marginBottom: "16px" }}>What You Need to Pay Your CFE With PagoYa</p>

          <p style={{ lineHeight: 1.7, marginBottom: "14px" }}>
            Solo tres cosas: <span style={{ color: "#94A3B8" }}>Just three things:</span>
          </p>
          <ol className="cfe-ol" style={{ marginBottom: "20px" }}>
            <li>
              <strong style={{ color: "#FFFFFF" }}>Tu smartphone</strong> — Android o iOS{" "}
              <span style={{ color: "#94A3B8" }}>/ Your smartphone — Android or iOS</span>
            </li>
            <li>
              <strong style={{ color: "#FFFFFF" }}>La app PagoYa</strong> — descarga gratis{" "}
              <span style={{ color: "#94A3B8" }}>/ The PagoYa app — free download</span>
            </li>
            <li>
              <strong style={{ color: "#FFFFFF" }}>Tu número de servicio CFE</strong> — está en tu recibo, en la parte superior{" "}
              <span style={{ color: "#94A3B8" }}>/ Your CFE service number — it's on your bill, at the top</span>
            </li>
          </ol>
          <p style={{ lineHeight: 1.7, padding: "14px 18px", background: "rgba(29,158,117,0.10)", borderLeft: "3px solid #1D9E75", borderRadius: "4px" }}>
            No necesitas tarjeta de crédito. No necesitas cuenta bancaria. Si tienes efectivo y un OXXO cerca, puedes pagar tu CFE hoy mismo.{" "}
            <span style={{ color: "#94A3B8" }}>No credit card needed. No bank account needed. If you have cash and an OXXO nearby, you can pay your CFE today.</span>
          </p>

          <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.10)", margin: "40px 0" }} />

          {/* Paso a paso */}
          <h2 className="cfe-h2" style={{ color: "#FFFFFF", fontWeight: 700, marginBottom: "6px" }}>
            Cómo pagar tu CFE con PagoYa: paso a paso
          </h2>
          <p style={{ color: "#64748B", fontWeight: 500, marginBottom: "24px" }}>How to Pay Your CFE With PagoYa: Step by Step</p>

          {[
            {
              step: 1,
              es: "Descarga la app PagoYa desde Google Play o App Store. El registro toma menos de 3 minutos — solo necesitas tu número de teléfono.",
              en: "Download the PagoYa app from Google Play or App Store. Registration takes under 3 minutes — you just need your phone number.",
            },
            {
              step: 2,
              es: "Recarga tu billetera PagoYa con efectivo en cualquier tienda OXXO. Si ya tienes saldo, salta directo al paso 3.",
              en: "Load your PagoYa wallet with cash at any OXXO store. If you already have balance, skip straight to step 3.",
            },
            {
              step: 3,
              es: "Abre la app, selecciona CFE en el catálogo de servicios.",
              en: "Open the app, select CFE from the service catalog.",
            },
            {
              step: 4,
              es: "Ingresa tu número de servicio CFE — lo encuentras en la parte superior de tu recibo, es un número de 12 dígitos.",
              en: "Enter your CFE service number — you'll find it at the top of your bill, it's a 12-digit number.",
            },
            {
              step: 5,
              es: "Confirma el monto y autoriza el pago. Recibirás una notificación de confirmación en segundos.",
              en: "Confirm the amount and authorize the payment. You'll receive a confirmation notification in seconds.",
            },
          ].map(({ step, es, en }) => (
            <div key={step} style={{ display: "flex", gap: "16px", marginBottom: "20px", alignItems: "flex-start" }}>
              <div style={{
                width: "32px", height: "32px", borderRadius: "50%", flexShrink: 0,
                background: "#1D9E75", color: "white",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "14px", fontWeight: 800,
              }}>
                {step}
              </div>
              <div>
                <p style={{ margin: 0, lineHeight: 1.6 }}>{es}</p>
                <p style={{ margin: "4px 0 0", lineHeight: 1.6, color: "#94A3B8", fontSize: "14px" }}>{en}</p>
              </div>
            </div>
          ))}

          <p style={{ lineHeight: 1.7, fontWeight: 600, color: "#1D9E75", marginTop: "8px" }}>
            ¿Listo? Tu pago de CFE está procesado. Sin filas, sin traslados, sin perder la mañana.{" "}
            <span style={{ color: "#64748B", fontWeight: 400 }}>Done? Your CFE payment is processed. No lines, no trips, no wasted morning.</span>
          </p>

          <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.10)", margin: "40px 0" }} />

          {/* Número de servicio */}
          <h2 className="cfe-h2" style={{ color: "#FFFFFF", fontWeight: 700, marginBottom: "6px" }}>
            ¿Dónde encuentro mi número de servicio CFE?
          </h2>
          <p style={{ color: "#64748B", fontWeight: 500, marginBottom: "16px" }}>Where Do I Find My CFE Service Number?</p>

          <p style={{ lineHeight: 1.7, marginBottom: "14px" }}>
            Tu número de servicio CFE (también llamado <strong style={{ color: "#FFFFFF" }}>Número de Suministro</strong> o <strong style={{ color: "#FFFFFF" }}>RPU</strong>) aparece en la parte superior de tu recibo físico o digital. Es un número de 12 dígitos que identifica específicamente tu conexión eléctrica.
          </p>
          <p style={{ lineHeight: 1.7, marginBottom: "16px", color: "#94A3B8" }}>
            Your CFE service number (also called Número de Suministro or RPU) appears at the top of your physical or digital bill. It's a 12-digit number that specifically identifies your electrical connection.
          </p>
          <p style={{ lineHeight: 1.7, marginBottom: "12px" }}>
            Si no tienes tu recibo a la mano, también puedes encontrarlo:{" "}
            <span style={{ color: "#94A3B8" }}>If you don't have your bill handy, you can also find it:</span>
          </p>
          <ul className="cfe-ul" style={{ marginBottom: "0" }}>
            <li>En el portal web de CFE (<strong style={{ color: "#FFFFFF" }}>cfe.mx</strong>) con tu CURP o RFC{" "}<span style={{ color: "#94A3B8" }}>/ On the CFE web portal (cfe.mx) with your CURP or RFC</span></li>
            <li>En la app oficial de CFE <span style={{ color: "#94A3B8" }}>/ In the official CFE app</span></li>
            <li>En cualquier oficina de atención al cliente de CFE <span style={{ color: "#94A3B8" }}>/ At any CFE customer service office</span></li>
          </ul>

          <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.10)", margin: "40px 0" }} />

          {/* Comisión */}
          <h2 className="cfe-h2" style={{ color: "#FFFFFF", fontWeight: 700, marginBottom: "6px" }}>
            ¿Cuánto cobra PagoYa por pagar mi CFE?
          </h2>
          <p style={{ color: "#64748B", fontWeight: 500, marginBottom: "16px" }}>How Much Does PagoYa Charge to Pay My CFE?</p>

          <p style={{ lineHeight: 1.7, marginBottom: "14px" }}>
            PagoYa cobra una comisión fija de <strong style={{ color: "#1D9E75" }}>$15 MXN por transacción</strong> — sin importar el monto de tu recibo de CFE. Si tu recibo es de $200 MXN o de $2,000 MXN, la comisión es siempre $15 MXN.
          </p>
          <p style={{ lineHeight: 1.7, marginBottom: "16px", color: "#94A3B8" }}>
            PagoYa charges a flat fee of $15 MXN per transaction — regardless of your CFE bill amount. Whether your bill is $200 MXN or $2,000 MXN, the fee is always $15 MXN.
          </p>
          <p style={{ lineHeight: 1.7, padding: "14px 18px", background: "rgba(29,158,117,0.10)", borderLeft: "3px solid #1D9E75", borderRadius: "4px" }}>
            Sin cargos por porcentaje. Sin costos ocultos. Sin sorpresas.{" "}
            <span style={{ color: "#94A3B8" }}>No percentage charges. No hidden costs. No surprises.</span>
          </p>

          <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.10)", margin: "40px 0" }} />

          {/* Tiempo */}
          <h2 className="cfe-h2" style={{ color: "#FFFFFF", fontWeight: 700, marginBottom: "6px" }}>
            ¿Cuánto tarda en aplicarse el pago de CFE?
          </h2>
          <p style={{ color: "#64748B", fontWeight: 500, marginBottom: "16px" }}>How Long Does It Take for the CFE Payment to Apply?</p>

          <p style={{ lineHeight: 1.7, marginBottom: "14px" }}>
            Los pagos de CFE procesados con PagoYa se envían en tiempo real a través de los rieles de pago <strong style={{ color: "#FFFFFF" }}>SIPREL</strong> y <strong style={{ color: "#FFFFFF" }}>Evoluciona</strong> — los mismos proveedores que procesan millones de pagos de servicios en México cada día.
          </p>
          <p style={{ lineHeight: 1.7, marginBottom: "14px", color: "#94A3B8" }}>
            CFE payments processed with PagoYa are sent in real time through SIPREL and Evoluciona payment rails — the same providers that process millions of service payments in Mexico every day.
          </p>
          <p style={{ lineHeight: 1.7, marginBottom: "16px" }}>
            En la mayoría de los casos, el pago se refleja en el sistema de CFE en menos de 24 horas. En muchos casos, en minutos.{" "}
            <span style={{ color: "#94A3B8" }}>In most cases, the payment is reflected in CFE's system in under 24 hours. In many cases, within minutes.</span>
          </p>
          <div style={{ padding: "14px 18px", background: "rgba(255,193,7,0.08)", border: "1px solid rgba(255,193,7,0.25)", borderRadius: "8px" }}>
            <p style={{ margin: 0, lineHeight: 1.6 }}>
              <strong style={{ color: "#FFC107" }}>⚠️ Importante:</strong> Si tu servicio está a punto de ser cortado por falta de pago, realiza el pago con al menos 24 horas de anticipación para asegurarte de que CFE lo procese a tiempo.{" "}
              <span style={{ color: "#94A3B8" }}>If your service is about to be cut for non-payment, make the payment at least 24 hours in advance to ensure CFE processes it in time.</span>
            </p>
          </div>

          <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.10)", margin: "40px 0" }} />

          {/* Pago falla */}
          <h2 className="cfe-h2" style={{ color: "#FFFFFF", fontWeight: 700, marginBottom: "6px" }}>
            ¿Qué pasa si el pago falla?
          </h2>
          <p style={{ color: "#64748B", fontWeight: 500, marginBottom: "16px" }}>What Happens if the Payment Fails?</p>

          <p style={{ lineHeight: 1.7, marginBottom: "14px" }}>
            PagoYa usa <strong style={{ color: "#FFFFFF" }}>failover automático</strong> entre dos proveedores de pago (SIPREL y Evoluciona). Si uno de los proveedores tiene una interrupción en el momento de tu pago, el sistema cambia automáticamente al otro para completar la transacción.
          </p>
          <p style={{ lineHeight: 1.7, marginBottom: "14px", color: "#94A3B8" }}>
            PagoYa uses automatic failover between two payment providers (SIPREL and Evoluciona). If one provider has an outage at the time of your payment, the system automatically switches to the other to complete the transaction.
          </p>
          <p style={{ lineHeight: 1.7 }}>
            Si por alguna razón el pago no se puede procesar, el saldo regresa inmediatamente a tu billetera PagoYa. <strong style={{ color: "#1D9E75" }}>Nunca perderás dinero en un pago fallido.</strong>{" "}
            <span style={{ color: "#94A3B8" }}>If for any reason the payment cannot be processed, the balance returns immediately to your PagoYa wallet. You'll never lose money on a failed payment.</span>
          </p>

          <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.10)", margin: "40px 0" }} />

          {/* Comparativa */}
          <h2 className="cfe-h2" style={{ color: "#FFFFFF", fontWeight: 700, marginBottom: "6px" }}>
            Pagar CFE con PagoYa vs. otras opciones
          </h2>
          <p style={{ color: "#64748B", fontWeight: 500, marginBottom: "20px" }}>Paying CFE With PagoYa vs. Other Options</p>

          <div className="cfe-table-wrap" style={{ marginBottom: "20px" }}>
            <table className="cfe-table">
              <thead>
                <tr>
                  <th></th>
                  <th>Fila en CFE / OXXO</th>
                  <th>App banco</th>
                  <th>PagoYa</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["¿Necesitas cuenta bancaria?", "No", "Sí", "No"],
                  ["¿Disponible 24/7?", "No", "Sí", "Sí"],
                  ["¿Tiempo requerido?", "20–45 min", "5 min", "2 min"],
                  ["¿Historial de pagos?", "No", "Sí", "Sí"],
                  ["¿Pago con efectivo?", "Sí", "No", "Sí (vía OXXO)"],
                  ["¿Comisión?", "Variable", "$0 (con cuenta)", "$15 MXN fijo"],
                ].map(([label, col1, col2, col3]) => (
                  <tr key={label}>
                    <td style={{ color: "#CBD5E1", fontWeight: 500 }}>{label}</td>
                    <td style={{ color: "#94A3B8" }}>{col1}</td>
                    <td style={{ color: "#94A3B8" }}>{col2}</td>
                    <td style={{ color: "#1D9E75", fontWeight: 600 }}>{col3}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p style={{ lineHeight: 1.7 }}>
            Si ya tienes cuenta bancaria y app de banco, úsala — es gratis. <strong style={{ color: "#FFFFFF" }}>PagoYa es la mejor opción si no tienes cuenta bancaria</strong> o si quieres la conveniencia de pagar múltiples servicios desde una sola app.{" "}
            <span style={{ color: "#94A3B8" }}>If you already have a bank account and banking app, use it — it's free. PagoYa is the best option if you don't have a bank account or if you want the convenience of paying multiple services from a single app.</span>
          </p>

          <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.10)", margin: "40px 0" }} />

          {/* Otros servicios */}
          <h2 className="cfe-h2" style={{ color: "#FFFFFF", fontWeight: 700, marginBottom: "6px" }}>
            Otros servicios que puedes pagar con PagoYa
          </h2>
          <p style={{ color: "#64748B", fontWeight: 500, marginBottom: "16px" }}>Other Services You Can Pay With PagoYa</p>

          <p style={{ lineHeight: 1.7, marginBottom: "16px" }}>
            PagoYa no es solo para CFE. Desde la misma app puedes pagar más de 26 servicios:{" "}
            <span style={{ color: "#94A3B8" }}>PagoYa isn't just for CFE. From the same app you can pay 26+ services:</span>
          </p>
          <ul className="cfe-ul" style={{ marginBottom: "20px" }}>
            <li><a href="https://pagoyamx.com/pagar-telmex">Telmex — internet y teléfono fijo →</a></li>
            <li><a href="https://pagoyamx.com/recargas">Recargas Telcel, AT&amp;T y Movistar →</a></li>
            <li><a href="https://pagoyamx.com/pagar-renta">Renta de vivienda vía PagoSeguro →</a></li>
            <li><a href="https://pagoyamx.com/servicios">Ver todos los servicios →</a></li>
          </ul>
          <p style={{ lineHeight: 1.7, padding: "14px 18px", background: "rgba(255,255,255,0.05)", borderRadius: "8px" }}>
            También puedes leer nuestra guía completa:{" "}
            <a href="/guia-pagar-servicios-sin-cuenta-bancaria">
              Cómo pagar todos tus servicios en México sin cuenta bancaria →
            </a>
          </p>

          <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.10)", margin: "40px 0" }} />

          {/* FAQ */}
          <h2 className="cfe-h2" style={{ color: "#FFFFFF", fontWeight: 700, marginBottom: "24px" }}>
            Preguntas frecuentes sobre pagar CFE con PagoYa
          </h2>

          {[
            {
              q: "¿Puedo pagar CFE sin tener internet en casa?",
              a: "Sí. Solo necesitas datos móviles en tu celular para usar la app PagoYa. No necesitas WiFi ni internet en casa.",
              en_q: "Can I pay CFE without having internet at home?",
              en_a: "Yes. You just need mobile data on your phone to use the PagoYa app. No WiFi or home internet needed.",
            },
            {
              q: "¿Puedo pagar el CFE de otra persona con PagoYa?",
              a: "Sí. Solo necesitas el número de servicio CFE de esa persona. Puedes pagar el recibo de un familiar, amigo o cualquier dirección desde tu cuenta PagoYa.",
              en_q: "Can I pay someone else's CFE with PagoYa?",
              en_a: "Yes. You just need that person's CFE service number. You can pay a family member's, friend's, or any address's bill from your PagoYa account.",
            },
            {
              q: "¿PagoYa me manda un comprobante de pago?",
              a: 'Sí. Recibirás una notificación de confirmación en la app inmediatamente después del pago. El historial completo está disponible en la sección "Historial" de tu billetera PagoYa.',
              en_q: "Does PagoYa send me a payment receipt?",
              en_a: 'Yes. You\'ll receive a confirmation notification in the app immediately after payment. Your complete payment history is available in the "Historial" section of your PagoYa wallet.',
            },
          ].map(({ q, a, en_q, en_a }) => (
            <div key={q} style={{
              marginBottom: "20px",
              padding: "20px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "10px",
            }}>
              <p style={{ margin: "0 0 8px", fontWeight: 700, color: "#FFFFFF" }}>{q}</p>
              <p style={{ margin: "0 0 14px", lineHeight: 1.6 }}>{a}</p>
              <p style={{ margin: "0 0 4px", fontWeight: 600, color: "#64748B", fontSize: "14px" }}>{en_q}</p>
              <p style={{ margin: 0, lineHeight: 1.6, color: "#94A3B8", fontSize: "14px" }}>{en_a}</p>
            </div>
          ))}

          <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.10)", margin: "40px 0" }} />

          {/* CTA */}
          <div style={{
            textAlign: "center",
            padding: "40px 24px",
            background: "rgba(29,158,117,0.10)",
            border: "1px solid rgba(29,158,117,0.25)",
            borderRadius: "16px",
          }}>
            <h2 style={{ color: "#FFFFFF", fontWeight: 800, fontSize: "24px", marginBottom: "8px" }}>
              Paga tu CFE ahora / Pay Your CFE Now
            </h2>
            <p style={{ color: "#CBD5E1", lineHeight: 1.7, marginBottom: "8px" }}>
              No esperes a que te corten la luz. Con PagoYa, pagar tu CFE toma menos tiempo que leer este artículo.
            </p>
            <p style={{ color: "#94A3B8", marginBottom: "28px" }}>
              Don't wait until they cut your power. With PagoYa, paying your CFE takes less time than reading this article.
            </p>
            <button
              onClick={() => navigate("/register")}
              style={{
                background: "#1D9E75", color: "white", border: "none",
                borderRadius: "12px", padding: "16px 36px",
                fontSize: "16px", fontWeight: 700, cursor: "pointer",
                display: "inline-block",
              }}
            >
              Descargar PagoYa y pagar mi CFE →
            </button>
            <p style={{ color: "#475569", fontSize: "12px", marginTop: "20px", lineHeight: 1.5 }}>
              PagoYa es operado por Longview Meridian Technologies. Pagos procesados vía SIPREL y Evoluciona con failover automático. Comisión fija de $15 MXN por transacción. Los tiempos de acreditación dependen de CFE.
            </p>
          </div>
        </article>
      </main>
    </div>
  );
}
