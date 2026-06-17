import { Helmet } from "react-helmet-async";
import { useLocation } from "wouter";

export default function DepositoOXXO() {
  const [, navigate] = useLocation();

  return (
    <div style={{ background: "#0A2540", minHeight: "100vh", display: "flex", flexDirection: "column", overflowX: "hidden" }}>
      <Helmet>
        <title>Cómo Depositar en OXXO para Recargar tu Billetera PagoYa | PagoYa</title>
        <meta name="description" content="Aprende a recargar tu billetera PagoYa con efectivo en cualquier tienda OXXO de México. Sin tarjeta ni cuenta bancaria. Saldo disponible en minutos." />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://pagoyamx.com/deposito-oxxo" />
        <meta property="og:title" content="Cómo Depositar en OXXO para Recargar tu Billetera PagoYa | PagoYa" />
        <meta property="og:description" content="Aprende a recargar tu billetera PagoYa con efectivo en cualquier tienda OXXO de México. Sin tarjeta ni cuenta bancaria. Saldo disponible en minutos." />
        <meta property="og:type" content="article" />
        <meta property="og:url" content="https://pagoyamx.com/deposito-oxxo" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          "headline": "Cómo depositar en OXXO para pagar tus servicios con PagoYa",
          "description": "Aprende a recargar tu billetera PagoYa con efectivo en cualquier tienda OXXO de México. Sin tarjeta ni cuenta bancaria.",
          "url": "https://pagoyamx.com/deposito-oxxo",
          "publisher": { "@type": "Organization", "name": "PagoYa", "url": "https://pagoyamx.com" },
          "inLanguage": ["es", "en"]
        })}</script>
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Inicio", "item": "https://pagoyamx.com/" },
            { "@type": "ListItem", "position": 2, "name": "Depósito OXXO", "item": "https://pagoyamx.com/deposito-oxxo" }
          ]
        })}</script>
      </Helmet>

      <style>{`
        .oxxo-body a { color: #1D9E75; text-decoration: underline; }
        .oxxo-body a:hover { color: #17c99a; }
        .oxxo-h1 { font-size: clamp(26px, 5vw, 42px); }
        .oxxo-h2 { font-size: clamp(20px, 3.5vw, 28px); }
        .oxxo-ul { list-style: disc; padding-left: 22px; }
        .oxxo-ul li { margin-bottom: 6px; line-height: 1.6; color: #CBD5E1; }
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
        <article className="oxxo-body" style={{ maxWidth: "780px", margin: "0 auto", padding: "48px 24px 80px", color: "#E2E8F0", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>

          <h1 className="oxxo-h1" style={{ color: "#FFFFFF", fontWeight: 800, lineHeight: 1.2, marginBottom: "8px" }}>
            Cómo depositar en OXXO para pagar tus servicios con PagoYa
          </h1>
          <p style={{ color: "#1D9E75", fontWeight: 600, fontSize: "18px", marginBottom: "32px" }}>
            How to Deposit at OXXO to Pay Your Services With PagoYa
          </p>
          <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.10)", margin: "32px 0" }} />

          {/* ¿Qué es? */}
          <h2 className="oxxo-h2" style={{ color: "#FFFFFF", fontWeight: 700, marginBottom: "6px" }}>¿Qué es el depósito en OXXO y para qué sirve?</h2>
          <p style={{ color: "#64748B", fontWeight: 500, marginBottom: "16px" }}>What Is the OXXO Deposit and What Is It For?</p>
          <p style={{ lineHeight: 1.7, marginBottom: "14px" }}>Si no tienes tarjeta de crédito o débito, el depósito en OXXO es tu puerta de entrada al mundo de los pagos digitales. Es el mecanismo que convierte tu efectivo en saldo digital — listo para pagar CFE, Telmex, recargas de celular y más de 26 servicios desde tu celular.</p>
          <p style={{ lineHeight: 1.7, marginBottom: "14px", color: "#94A3B8" }}>If you don't have a credit or debit card, the OXXO deposit is your gateway to the world of digital payments. It's the mechanism that converts your cash into digital balance — ready to pay CFE, Telmex, mobile top-ups, and 26+ services from your phone.</p>
          <p style={{ lineHeight: 1.7, marginBottom: "14px" }}>OXXO tiene más de <strong style={{ color: "#FFFFFF" }}>20,000 tiendas</strong> en México. Hay una en prácticamente cada colonia, cada pueblo, cada ciudad del país.</p>
          <p style={{ lineHeight: 1.7, color: "#94A3B8" }}>OXXO has over 20,000 stores in Mexico. There's one in practically every neighborhood, every town, every city in the country.</p>

          <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.10)", margin: "40px 0" }} />

          {/* Cómo funciona */}
          <h2 className="oxxo-h2" style={{ color: "#FFFFFF", fontWeight: 700, marginBottom: "6px" }}>Cómo funciona el depósito OXXO para PagoYa</h2>
          <p style={{ color: "#64748B", fontWeight: 500, marginBottom: "16px" }}>How the OXXO Deposit Works for PagoYa</p>
          <p style={{ lineHeight: 1.7, marginBottom: "14px" }}>El proceso usa la infraestructura de <strong style={{ color: "#FFFFFF" }}>Conekta</strong> — uno de los agregadores de pagos más grandes y regulados de México — para conectar tu depósito en efectivo con tu billetera digital PagoYa de forma segura y en tiempo real.</p>
          <p style={{ lineHeight: 1.7, marginBottom: "20px", color: "#94A3B8" }}>The process uses Conekta infrastructure — one of Mexico's largest and most regulated payment aggregators — to connect your cash deposit with your PagoYa digital wallet securely and in real time.</p>
          <p style={{ lineHeight: 1.7, marginBottom: "16px" }}>Cuando depositas en OXXO: <span style={{ color: "#94A3B8" }}>When you deposit at OXXO:</span></p>
          {[
            { n: 1, es: "El cajero escanea tu código o referencia de pago", en: "The cashier scans your code or payment reference" },
            { n: 2, es: "Tu efectivo entra al sistema de Conekta", en: "Your cash enters the Conekta system" },
            { n: 3, es: "Conekta notifica a PagoYa del depósito", en: "Conekta notifies PagoYa of the deposit" },
            { n: 4, es: "PagoYa acredita el saldo a tu billetera", en: "PagoYa credits the balance to your wallet" },
          ].map(({ n, es, en }) => (
            <div key={n} style={{ display: "flex", gap: "16px", marginBottom: "14px", alignItems: "flex-start" }}>
              <div style={{ width: "28px", height: "28px", borderRadius: "50%", flexShrink: 0, background: "#1D9E75", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: 800 }}>{n}</div>
              <div><p style={{ margin: 0, lineHeight: 1.6 }}>{es}</p><p style={{ margin: "2px 0 0", lineHeight: 1.6, color: "#94A3B8", fontSize: "14px" }}>{en}</p></div>
            </div>
          ))}
          <p style={{ lineHeight: 1.7, fontWeight: 600, color: "#1D9E75", marginTop: "8px" }}>
            Todo esto ocurre en minutos. Sin intermediarios manuales, sin demoras bancarias.{" "}
            <span style={{ color: "#64748B", fontWeight: 400 }}>All of this happens in minutes. No manual intermediaries, no banking delays.</span>
          </p>

          <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.10)", margin: "40px 0" }} />

          {/* Paso a paso */}
          <h2 className="oxxo-h2" style={{ color: "#FFFFFF", fontWeight: 700, marginBottom: "6px" }}>Paso a paso: cómo depositar en OXXO</h2>
          <p style={{ color: "#64748B", fontWeight: 500, marginBottom: "24px" }}>Step by Step: How to Deposit at OXXO</p>
          {[
            { n: 1, es: "Abre la app PagoYa en tu celular.", en: "Open the PagoYa app on your phone." },
            { n: 2, es: 'Ve a la sección "Recargar saldo" o "Depositar" en el menú principal.', en: 'Go to the "Recargar saldo" or "Depositar" section in the main menu.' },
            { n: 3, es: "Ingresa el monto que quieres depositar.", en: "Enter the amount you want to deposit." },
            { n: 4, es: "La app genera un código de barras o una referencia de pago única. Guarda esta pantalla o toma una captura.", en: "The app generates a barcode or unique payment reference. Save this screen or take a screenshot." },
            { n: 5, es: 'Ve a cualquier tienda OXXO y dile al cajero: "Quiero hacer un depósito, aquí está mi referencia." Muéstrale el código.', en: '"I want to make a deposit, here\'s my reference." Show them the code.' },
            { n: 6, es: "Paga el monto en efectivo al cajero.", en: "Pay the amount in cash to the cashier." },
            { n: 7, es: "El cajero te dará un ticket de confirmación. Guárdalo.", en: "The cashier will give you a confirmation ticket. Keep it." },
            { n: 8, es: "En minutos, el saldo aparece en tu billetera PagoYa con notificación en la app.", en: "Within minutes, the balance appears in your PagoYa wallet with a notification in the app." },
          ].map(({ n, es, en }) => (
            <div key={n} style={{ display: "flex", gap: "16px", marginBottom: "18px", alignItems: "flex-start" }}>
              <div style={{ width: "32px", height: "32px", borderRadius: "50%", flexShrink: 0, background: "#1D9E75", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: 800 }}>{n}</div>
              <div><p style={{ margin: 0, lineHeight: 1.6 }}>{es}</p><p style={{ margin: "4px 0 0", lineHeight: 1.6, color: "#94A3B8", fontSize: "14px" }}>{en}</p></div>
            </div>
          ))}

          <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.10)", margin: "40px 0" }} />

          {/* Tiempo */}
          <h2 className="oxxo-h2" style={{ color: "#FFFFFF", fontWeight: 700, marginBottom: "6px" }}>¿Cuánto tiempo tarda en reflejarse el depósito?</h2>
          <p style={{ color: "#64748B", fontWeight: 500, marginBottom: "16px" }}>How Long Until the Deposit Shows Up?</p>
          <p style={{ lineHeight: 1.7, marginBottom: "14px" }}>En la mayoría de los casos, el saldo aparece en tu billetera PagoYa en <strong style={{ color: "#1D9E75" }}>menos de 15 minutos</strong> después del depósito en OXXO. <span style={{ color: "#94A3B8" }}>In most cases, balance appears in your PagoYa wallet in under 15 minutes after the OXXO deposit.</span></p>
          <div style={{ padding: "14px 18px", background: "rgba(255,193,7,0.08)", border: "1px solid rgba(255,193,7,0.25)", borderRadius: "8px" }}>
            <p style={{ margin: 0, lineHeight: 1.6 }}>
              En casos excepcionales puede tardar hasta 60 minutos. Si después de una hora no ves el saldo, contacta a soporte en <strong style={{ color: "#FFC107" }}>soporte@pagoyamx.com</strong> con tu número de ticket de OXXO.{" "}
              <span style={{ color: "#94A3B8" }}>In exceptional cases it can take up to 60 minutes. If after an hour you don't see the balance, contact support with your OXXO ticket number.</span>
            </p>
          </div>

          <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.10)", margin: "40px 0" }} />

          {/* Montos */}
          <h2 className="oxxo-h2" style={{ color: "#FFFFFF", fontWeight: 700, marginBottom: "16px" }}>¿Hay un monto mínimo o máximo?</h2>
          <ul className="oxxo-ul">
            <li>Monto mínimo: <strong style={{ color: "#FFFFFF" }}>$20 MXN</strong> <span style={{ color: "#94A3B8" }}>/ Minimum amount: $20 MXN</span></li>
            <li>Monto máximo por depósito: <strong style={{ color: "#FFFFFF" }}>$10,000 MXN</strong> (límite de OXXO Pay por transacción) <span style={{ color: "#94A3B8" }}>/ Maximum per deposit: $10,000 MXN</span></li>
            <li>Sin límite diario acumulado para depósitos múltiples <span style={{ color: "#94A3B8" }}>/ No daily cumulative limit for multiple deposits</span></li>
          </ul>

          <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.10)", margin: "40px 0" }} />

          {/* Seguridad */}
          <h2 className="oxxo-h2" style={{ color: "#FFFFFF", fontWeight: 700, marginBottom: "6px" }}>¿Es seguro depositar en OXXO para PagoYa?</h2>
          <p style={{ color: "#64748B", fontWeight: 500, marginBottom: "16px" }}>Is It Safe to Deposit at OXXO for PagoYa?</p>
          <p style={{ lineHeight: 1.7, marginBottom: "14px" }}>Sí. El depósito OXXO para PagoYa usa la infraestructura de <strong style={{ color: "#FFFFFF" }}>Conekta</strong>, un agregador de pagos regulado en México con más de una década de operaciones y miles de empresas clientes. <span style={{ color: "#94A3B8" }}>Yes. The OXXO deposit for PagoYa uses Conekta infrastructure, a regulated payment aggregator in Mexico with over a decade of operations.</span></p>
          <p style={{ lineHeight: 1.7, padding: "14px 18px", background: "rgba(29,158,117,0.10)", borderLeft: "3px solid #1D9E75", borderRadius: "4px" }}>
            Tu efectivo nunca "desaparece" — en todo momento está registrado en el sistema con tu referencia única. Si hay algún problema, el ticket de OXXO es tu comprobante.{" "}
            <span style={{ color: "#94A3B8" }}>Your cash never "disappears" — at all times it's recorded with your unique reference. If there's any problem, the OXXO ticket is your proof.</span>
          </p>

          <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.10)", margin: "40px 0" }} />

          {/* Otras tiendas */}
          <h2 className="oxxo-h2" style={{ color: "#FFFFFF", fontWeight: 700, marginBottom: "6px" }}>¿Puedo depositar en otras tiendas además de OXXO?</h2>
          <p style={{ color: "#64748B", fontWeight: 500, marginBottom: "16px" }}>Can I Deposit at Stores Other Than OXXO?</p>
          <p style={{ lineHeight: 1.7 }}>Actualmente PagoYa acepta depósitos en efectivo únicamente a través de la red OXXO vía Conekta. La expansión a otras redes de conveniencia está en el roadmap de PagoYa. <span style={{ color: "#94A3B8" }}>Currently PagoYa accepts cash deposits only through the OXXO network via Conekta. Expansion to other convenience networks is on PagoYa's roadmap.</span></p>

          <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.10)", margin: "40px 0" }} />

          {/* Qué pagar */}
          <h2 className="oxxo-h2" style={{ color: "#FFFFFF", fontWeight: 700, marginBottom: "16px" }}>¿Qué puedo pagar con mi saldo PagoYa?</h2>
          <p style={{ lineHeight: 1.7, marginBottom: "16px" }}>Una vez que tienes saldo en tu billetera, puedes pagar: <span style={{ color: "#94A3B8" }}>Once you have balance in your wallet, you can pay:</span></p>
          <ul className="oxxo-ul" style={{ marginBottom: "20px" }}>
            <li><a href="/pagar-cfe">CFE (recibo de luz) →</a></li>
            <li><a href="/pagar-telmex">Telmex, Izzi, Totalplay, Megacable, Sky →</a></li>
            <li><a href="/recargas">Recargas Telcel, AT&amp;T y Movistar →</a></li>
            <li><a href="/servicios">Renta de vivienda →</a></li>
            <li><a href="/servicios">Ver todos los 26+ servicios →</a></li>
          </ul>
          <p style={{ lineHeight: 1.7, padding: "14px 18px", background: "rgba(255,255,255,0.05)", borderRadius: "8px" }}>
            <a href="/guia-pagar-servicios-sin-cuenta-bancaria">Guía completa: Cómo pagar todos tus servicios en México sin cuenta bancaria →</a>
          </p>

          <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.10)", margin: "40px 0" }} />

          {/* FAQ */}
          <h2 className="oxxo-h2" style={{ color: "#FFFFFF", fontWeight: 700, marginBottom: "24px" }}>Preguntas frecuentes</h2>
          {[
            { q: "¿Necesito internet en el momento de depositar en OXXO?", a: "Necesitas internet para generar el código en la app antes de ir a OXXO. Una vez que tienes el código guardado, no necesitas internet en la tienda.", eq: "Do I need internet when depositing at OXXO?", ea: "You need internet to generate the code in the app before going to OXXO. Once you have the saved code, you don't need internet in the store." },
            { q: "¿El cajero de OXXO sabe cómo procesar un depósito PagoYa?", a: "Sí. OXXO procesa depósitos a billeteras digitales regularmente — es parte de su operación estándar.", eq: "Does the OXXO cashier know how to process a PagoYa deposit?", ea: "Yes. OXXO regularly processes deposits to digital wallets — it's part of their standard operation." },
            { q: "¿Puedo depositar para otra persona?", a: "Sí. Cualquier persona puede hacer el depósito físico en OXXO usando tu código de referencia. El saldo siempre se acredita a la billetera que generó ese código.", eq: "Can someone else make the deposit for me?", ea: "Yes. Anyone can make the physical deposit at OXXO using your reference code. The balance always credits to the wallet that generated that code." },
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
            <h2 style={{ color: "#FFFFFF", fontWeight: 800, fontSize: "24px", marginBottom: "8px" }}>Empieza con $50 pesos</h2>
            <p style={{ color: "#CBD5E1", lineHeight: 1.7, marginBottom: "8px" }}>No necesitas una gran cantidad para empezar. Deposita $50–$100 MXN en OXXO, prueba pagar un servicio, y convéncete tú mismo de qué tan fácil es.</p>
            <p style={{ color: "#94A3B8", marginBottom: "28px" }}>You don't need a large amount to start. Deposit $50–$100 MXN at OXXO, try paying a service, and convince yourself how easy it is.</p>
            <button onClick={() => navigate("/register")} style={{ background: "#1D9E75", color: "white", border: "none", borderRadius: "12px", padding: "16px 36px", fontSize: "16px", fontWeight: 700, cursor: "pointer" }}>
              Descargar PagoYa gratis →
            </button>
            <p style={{ color: "#475569", fontSize: "12px", marginTop: "20px", lineHeight: 1.5 }}>
              PagoYa es operado por Longview Meridian Technologies. Depósitos OXXO procesados vía Conekta. Comisión fija de $25 MXN por transacción de pago.
            </p>
          </div>
        </article>
      </main>

      {/* FOOTER */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.08)", padding: "20px 24px", textAlign: "center" }}>
        <p style={{ color: "#334155", fontSize: "12px" }}>
          <a href="/" style={{ color: "#475569", textDecoration: "none" }}>PagoYa</a>
          {" · "}
          <a href="/terminos-y-condiciones" style={{ color: "#1D9E75" }}>Términos y Condiciones</a>
          {" · "}
          <a href="/atencion" style={{ color: "#475569", textDecoration: "none" }}>Atención al Cliente</a>
          {" · "}
          <a href="mailto:soporte@pagoyamx.com" style={{ color: "#475569", textDecoration: "none" }}>soporte@pagoyamx.com</a>
        </p>
      </footer>
    </div>
  );
}
