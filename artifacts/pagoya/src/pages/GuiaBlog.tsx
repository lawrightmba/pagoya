import { Helmet } from "react-helmet-async";
import { useLocation } from "wouter";

export default function GuiaBlog() {
  const [, navigate] = useLocation();

  return (
    <div style={{ background: "#0A2540", minHeight: "100vh", display: "flex", flexDirection: "column", overflowX: "hidden" }}>
      <Helmet>
        <title>Cómo Pagar Servicios en México Sin Cuenta Bancaria | PagoYa</title>
        <meta name="description" content="Guía completa para pagar CFE, Telmex, recargas y más de 26 servicios en México sin cuenta bancaria. Solo necesitas tu celular y efectivo en OXXO." />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://pagoyamx.com/guia-pagar-servicios-sin-cuenta-bancaria" />
        <meta property="og:title" content="Cómo Pagar Servicios en México Sin Cuenta Bancaria | PagoYa" />
        <meta property="og:description" content="Guía completa para pagar CFE, Telmex, recargas y más de 26 servicios en México sin cuenta bancaria. Solo necesitas tu celular y efectivo en OXXO." />
        <meta property="og:type" content="article" />
        <meta property="og:url" content="https://pagoyamx.com/guia-pagar-servicios-sin-cuenta-bancaria" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          "headline": "Guía completa para pagar servicios en México sin cuenta bancaria",
          "description": "Guía completa para pagar CFE, Telmex, recargas y más de 26 servicios en México sin cuenta bancaria.",
          "url": "https://pagoyamx.com/guia-pagar-servicios-sin-cuenta-bancaria",
          "publisher": {
            "@type": "Organization",
            "name": "PagoYa",
            "url": "https://pagoyamx.com"
          },
          "inLanguage": ["es", "en"]
        })}</script>
      </Helmet>

      <style>{`
        .blog-body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
        .blog-body a { color: #1D9E75; text-decoration: underline; }
        .blog-body a:hover { color: #17c99a; }
        .blog-h1 { font-size: clamp(26px, 5vw, 42px); }
        .blog-h2 { font-size: clamp(20px, 3.5vw, 28px); }
        .blog-table { width: 100%; border-collapse: collapse; }
        .blog-table th, .blog-table td { padding: 10px 14px; border: 1px solid rgba(255,255,255,0.12); text-align: left; vertical-align: top; }
        .blog-table th { background: rgba(29,158,117,0.18); color: #1D9E75; font-weight: 700; }
        .blog-table tr:nth-child(even) td { background: rgba(255,255,255,0.03); }
        .blog-ol { padding-left: 20px; }
        .blog-ol li { margin-bottom: 10px; line-height: 1.6; color: #CBD5E1; }
        .blog-ul { list-style: disc; padding-left: 22px; }
        .blog-ul li { margin-bottom: 6px; line-height: 1.6; color: #CBD5E1; }
        .blog-subul { list-style: circle; padding-left: 22px; margin-top: 6px; }
        .blog-subul li { margin-bottom: 4px; color: #94A3B8; }
        @media(max-width:640px){
          .blog-table-wrap { overflow-x: auto; }
          .blog-body { padding: 0 16px 48px; }
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
          className="blog-body"
          style={{
            maxWidth: "780px",
            margin: "0 auto",
            padding: "48px 24px 80px",
            color: "#E2E8F0",
          }}
        >
          {/* Title */}
          <h1 className="blog-h1" style={{ color: "#FFFFFF", fontWeight: 800, lineHeight: 1.2, marginBottom: "8px" }}>
            Guía completa para pagar servicios en México sin cuenta bancaria
          </h1>
          <p style={{ color: "#1D9E75", fontWeight: 600, fontSize: "18px", marginBottom: "32px" }}>
            The Complete Guide to Paying Bills in Mexico Without a Bank Account
          </p>

          <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.10)", margin: "32px 0" }} />

          {/* Introducción */}
          <h2 className="blog-h2" style={{ color: "#FFFFFF", fontWeight: 700, marginBottom: "6px" }}>
            Introducción
          </h2>
          <p style={{ color: "#64748B", fontWeight: 500, marginBottom: "16px" }}>Introduction</p>

          <p style={{ lineHeight: 1.7, marginBottom: "14px" }}>
            Si vives en México y no tienes cuenta bancaria, pagar tus servicios no debería ser complicado. Sin embargo, para millones de mexicanos, cada mes significa largas filas en el banco, viajes a puntos de pago, o depender de familiares que sí tienen tarjeta. Eso está cambiando.
          </p>
          <p style={{ lineHeight: 1.7, marginBottom: "14px", color: "#94A3B8" }}>
            If you live in Mexico and don't have a bank account, paying your bills shouldn't be complicated. Yet for millions of Mexicans, every month means long lines at the bank, trips to payment centers, or depending on relatives who have a card. That's changing.
          </p>
          <p style={{ lineHeight: 1.7, marginBottom: "14px" }}>
            Hoy, con solo un smartphone y efectivo en mano, puedes pagar tu CFE, Telmex, hacer recargas de celular y más de 26 servicios — sin tarjeta, sin cuenta bancaria, sin complicaciones. Esta guía te explica exactamente cómo hacerlo.
          </p>
          <p style={{ lineHeight: 1.7, marginBottom: "0", color: "#94A3B8" }}>
            Today, with just a smartphone and cash in hand, you can pay your CFE, Telmex, mobile top-ups, and 26+ services — no card, no bank account, no complications. This guide explains exactly how.
          </p>

          <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.10)", margin: "40px 0" }} />

          {/* ¿Por qué? */}
          <h2 className="blog-h2" style={{ color: "#FFFFFF", fontWeight: 700, marginBottom: "6px" }}>
            ¿Por qué tantos mexicanos no tienen cuenta bancaria?
          </h2>
          <p style={{ color: "#64748B", fontWeight: 500, marginBottom: "16px" }}>Why So Many Mexicans Don't Have a Bank Account</p>

          <p style={{ lineHeight: 1.7, marginBottom: "14px" }}>
            Según datos del INEGI, más de 50 millones de adultos en México no tienen acceso a servicios bancarios formales. Las razones son variadas: falta de documentos, distancia geográfica a sucursales bancarias, desconfianza histórica en el sistema financiero, o simplemente que los costos de mantener una cuenta no justifican los beneficios.
          </p>
          <p style={{ lineHeight: 1.7, marginBottom: "14px", color: "#94A3B8" }}>
            According to INEGI data, more than 50 million adults in Mexico lack access to formal banking services. The reasons vary: lack of documents, geographic distance from bank branches, historical distrust of the financial system, or simply that the costs of maintaining an account don't justify the benefits.
          </p>
          <p style={{ lineHeight: 1.7, marginBottom: "14px" }}>
            Esto no significa que estas personas no necesiten pagar sus servicios. La CFE no acepta excusas. Telmex no perdona el vencimiento. Y una recarga de celular puede ser la diferencia entre comunicarse con la familia o quedarse incomunicado.
          </p>
          <p style={{ lineHeight: 1.7, marginBottom: "14px", color: "#94A3B8" }}>
            This doesn't mean these people don't need to pay their bills. CFE doesn't accept excuses. Telmex doesn't forgive due dates. And a mobile top-up can be the difference between reaching family or going without communication.
          </p>
          <p style={{ lineHeight: 1.7, fontWeight: 600, color: "#1D9E75" }}>
            La buena noticia: ya existe una solución diseñada específicamente para ti.{" "}
            <span style={{ color: "#94A3B8", fontWeight: 400 }}>The good news: a solution designed specifically for you already exists.</span>
          </p>

          <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.10)", margin: "40px 0" }} />

          {/* Billetera digital */}
          <h2 className="blog-h2" style={{ color: "#FFFFFF", fontWeight: 700, marginBottom: "6px" }}>
            Qué es una billetera digital y cómo funciona en México
          </h2>
          <p style={{ color: "#64748B", fontWeight: 500, marginBottom: "16px" }}>What Is a Digital Wallet and How Does It Work in Mexico</p>

          <p style={{ lineHeight: 1.7, marginBottom: "14px" }}>
            Una billetera digital es una aplicación en tu celular que funciona como una cuenta de dinero — puedes depositar efectivo, guardar saldo y usarlo para pagar. No necesitas historial crediticio, no necesitas aval, y no necesitas ir al banco.
          </p>
          <p style={{ lineHeight: 1.7, marginBottom: "14px", color: "#94A3B8" }}>
            A digital wallet is an app on your phone that works like a money account — you can deposit cash, store balance, and use it to pay. You don't need a credit history, you don't need a guarantor, and you don't need to go to the bank.
          </p>
          <p style={{ lineHeight: 1.7, marginBottom: "14px" }}>
            <strong style={{ color: "#FFFFFF" }}>PagoYa</strong> es la billetera digital diseñada para México. Funciona así:{" "}
            <span style={{ color: "#94A3B8" }}>PagoYa is the digital wallet designed for Mexico. Here's how it works:</span>
          </p>

          <ol className="blog-ol" style={{ marginBottom: "14px" }}>
            <li>
              <strong style={{ color: "#FFFFFF" }}>Descarga la app</strong> — disponible para Android e iOS, gratis.{" "}
              <span style={{ color: "#94A3B8" }}>Download the app — available for Android and iOS, free.</span>
            </li>
            <li>
              <strong style={{ color: "#FFFFFF" }}>Recarga con efectivo en OXXO</strong> — ve a cualquier tienda OXXO, dile al cajero que quieres recargar tu billetera PagoYa, paga en efectivo y el saldo aparece en tu app en minutos.{" "}
              <span style={{ color: "#94A3B8" }}>Load with cash at OXXO — go to any OXXO store, tell the cashier you want to load your PagoYa wallet, pay cash, and the balance appears in your app within minutes.</span>
            </li>
            <li>
              <strong style={{ color: "#FFFFFF" }}>Paga tus servicios</strong> — selecciona el servicio que quieres pagar, ingresa tu número de cuenta o servicio, confirma el pago. Listo.{" "}
              <span style={{ color: "#94A3B8" }}>Pay your services — select the service you want to pay, enter your account or service number, confirm payment. Done.</span>
            </li>
          </ol>

          <p style={{ lineHeight: 1.7, padding: "14px 18px", background: "rgba(29,158,117,0.12)", borderLeft: "3px solid #1D9E75", borderRadius: "4px" }}>
            La comisión es fija: <strong style={{ color: "#1D9E75" }}>$15 MXN por transacción</strong>. Sin cargos por porcentaje, sin costos ocultos, sin sorpresas.{" "}
            <span style={{ color: "#94A3B8" }}>The fee is flat: $15 MXN per transaction. No percentage charges, no hidden costs, no surprises.</span>
          </p>

          <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.10)", margin: "40px 0" }} />

          {/* Servicios */}
          <h2 className="blog-h2" style={{ color: "#FFFFFF", fontWeight: 700, marginBottom: "6px" }}>
            Los 26+ servicios que puedes pagar con PagoYa
          </h2>
          <p style={{ color: "#64748B", fontWeight: 500, marginBottom: "16px" }}>The 26+ Services You Can Pay With PagoYa</p>

          <p style={{ lineHeight: 1.7, marginBottom: "20px" }}>
            PagoYa cubre los servicios que más necesitas en tu vida diaria:{" "}
            <span style={{ color: "#94A3B8" }}>PagoYa covers the services you need most in your daily life:</span>
          </p>

          <h3 style={{ color: "#1D9E75", fontWeight: 700, fontSize: "16px", marginBottom: "10px" }}>
            ⚡ Servicios de luz, agua e internet / Electricity, Water &amp; Internet
          </h3>
          <ul className="blog-ul" style={{ marginBottom: "20px" }}>
            <li><strong style={{ color: "#FFFFFF" }}>CFE</strong> (Comisión Federal de Electricidad) — paga tu recibo de luz en segundos / pay your electricity bill in seconds</li>
            <li><strong style={{ color: "#FFFFFF" }}>Agua municipal</strong> — pago de recibos de agua potable / municipal water bill payments</li>
            <li><strong style={{ color: "#FFFFFF" }}>Telmex</strong> — internet y teléfono fijo / internet and landline</li>
            <li><strong style={{ color: "#FFFFFF" }}>Izzi</strong> — cable e internet / cable and internet</li>
            <li><strong style={{ color: "#FFFFFF" }}>Totalplay</strong> — internet de fibra óptica / fiber optic internet</li>
            <li><strong style={{ color: "#FFFFFF" }}>Megacable</strong> — cable e internet / cable and internet</li>
            <li><strong style={{ color: "#FFFFFF" }}>Sky</strong> — televisión satelital / satellite television</li>
          </ul>

          <h3 style={{ color: "#1D9E75", fontWeight: 700, fontSize: "16px", marginBottom: "10px" }}>
            📱 Recargas de celular / Mobile Top-Ups
          </h3>
          <ul className="blog-ul" style={{ marginBottom: "20px" }}>
            <li><strong style={{ color: "#FFFFFF" }}>Telcel</strong> — el operador más grande de México / Mexico's largest carrier</li>
            <li><strong style={{ color: "#FFFFFF" }}>AT&T México</strong> — cobertura nacional / nationwide coverage</li>
            <li><strong style={{ color: "#FFFFFF" }}>Movistar</strong> — recargas prepago / prepaid top-ups</li>
          </ul>

          <h3 style={{ color: "#1D9E75", fontWeight: 700, fontSize: "16px", marginBottom: "10px" }}>
            🏠 Otros servicios / Other Services
          </h3>
          <ul className="blog-ul" style={{ marginBottom: "20px" }}>
            <li><strong style={{ color: "#FFFFFF" }}>Predial</strong> — pago de impuesto predial / property tax payments</li>
            <li><strong style={{ color: "#FFFFFF" }}>Streaming</strong> — servicios de entretenimiento / entertainment services</li>
            <li><strong style={{ color: "#FFFFFF" }}>Renta</strong> — pago de renta de vivienda vía PagoSeguro / rent payments via PagoSeguro</li>
            <li>Y más de 26 servicios en total / And 26+ services total</li>
          </ul>

          <p style={{ lineHeight: 1.7, padding: "14px 18px", background: "rgba(255,255,255,0.05)", borderRadius: "8px" }}>
            ¿Necesitas pagar tu CFE específicamente?{" "}
            <a href="https://pagoyamx.com/pagar-cfe">Cómo pagar CFE sin ir al banco →</a>
            <br />
            <span style={{ color: "#64748B", fontSize: "13px" }}>Need to pay CFE specifically? Read our detailed guide: How to pay CFE without going to the bank →</span>
          </p>

          <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.10)", margin: "40px 0" }} />

          {/* OXXO */}
          <h2 className="blog-h2" style={{ color: "#FFFFFF", fontWeight: 700, marginBottom: "6px" }}>
            Cómo recargar tu billetera PagoYa con efectivo en OXXO
          </h2>
          <p style={{ color: "#64748B", fontWeight: 500, marginBottom: "16px" }}>How to Load Your PagoYa Wallet With Cash at OXXO</p>

          <p style={{ lineHeight: 1.7, marginBottom: "24px" }}>
            OXXO tiene más de 20,000 tiendas en toda la República Mexicana — probablemente hay una a menos de 10 minutos de donde estás. Recargar tu billetera PagoYa en OXXO es tan fácil como comprar una botella de agua.{" "}
            <span style={{ color: "#94A3B8" }}>OXXO has over 20,000 stores across Mexico — there's probably one less than 10 minutes from where you are. Loading your PagoYa wallet at OXXO is as easy as buying a bottle of water.</span>
          </p>

          {[
            {
              step: 1,
              es: 'Abre la app PagoYa y ve a la sección "Recargar saldo" para obtener tu código de depósito.',
              en: 'Open the PagoYa app and go to the "Recargar saldo" section to get your deposit code.',
            },
            {
              step: 2,
              es: 'Ve a cualquier tienda OXXO y dile al cajero: "Quiero hacer un depósito a mi billetera PagoYa."',
              en: 'Go to any OXXO store and tell the cashier: "I want to make a deposit to my PagoYa wallet."',
            },
            {
              step: 3,
              es: "Muestra tu código o proporciona tu número de teléfono registrado. Paga el monto en efectivo.",
              en: "Show your code or provide your registered phone number. Pay the amount in cash.",
            },
            {
              step: 4,
              es: "El saldo aparece en tu app en minutos.",
              en: "The balance appears in your app within minutes.",
            },
          ].map(({ step, es, en }) => (
            <div key={step} style={{ display: "flex", gap: "16px", marginBottom: "18px", alignItems: "flex-start" }}>
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

          <p style={{ lineHeight: 1.7, padding: "14px 18px", background: "rgba(255,255,255,0.05)", borderRadius: "8px", marginTop: "8px" }}>
            ¿Quieres más detalles?{" "}
            <a href="https://pagoyamx.com/deposito-oxxo">Cómo depositar en OXXO paso a paso →</a>
          </p>

          <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.10)", margin: "40px 0" }} />

          {/* Seguridad */}
          <h2 className="blog-h2" style={{ color: "#FFFFFF", fontWeight: 700, marginBottom: "6px" }}>
            ¿Es seguro usar PagoYa?
          </h2>
          <p style={{ color: "#64748B", fontWeight: 500, marginBottom: "16px" }}>Is PagoYa Safe to Use?</p>

          <p style={{ lineHeight: 1.7, marginBottom: "20px" }}>
            Sí. PagoYa opera sobre los rieles de pago más seguros y regulados de México:{" "}
            <span style={{ color: "#94A3B8" }}>Yes. PagoYa operates on Mexico's most secure and regulated payment rails:</span>
          </p>
          <ul className="blog-ul" style={{ marginBottom: "20px" }}>
            <li>
              <strong style={{ color: "#FFFFFF" }}>STP/SPEI</strong> — el sistema de pagos interbancarios regulado directamente por Banco de México (Banxico). El mismo sistema que usan los bancos tradicionales.{" "}
              <span style={{ color: "#94A3B8" }}>The interbank payment system regulated directly by Banco de México (Banxico). The same system used by traditional banks.</span>
            </li>
            <li>
              <strong style={{ color: "#FFFFFF" }}>Conekta</strong> — el agregador de pagos que procesa tus depósitos en OXXO, regulado en México y con miles de empresas clientes.{" "}
              <span style={{ color: "#94A3B8" }}>The payment aggregator that processes your OXXO deposits, regulated in Mexico with thousands of business clients.</span>
            </li>
            <li>
              <strong style={{ color: "#FFFFFF" }}>Failover automático</strong> — PagoYa usa dos proveedores de pago (SIPREL y Evoluciona) con cambio automático entre ellos si uno falla. Tus pagos se procesan incluso si hay interrupciones.{" "}
              <span style={{ color: "#94A3B8" }}>PagoYa uses two payment providers (SIPREL and Evoluciona) with automatic switching between them if one fails. Your payments process even during outages.</span>
            </li>
          </ul>
          <p style={{ lineHeight: 1.7, fontWeight: 500 }}>
            Tu dinero y tus pagos están protegidos. Los mismos rieles de pago que usa PagoYa son los que regulan todas las transferencias interbancarias en México.{" "}
            <span style={{ color: "#94A3B8" }}>Your money and payments are protected. The same payment rails PagoYa uses are the ones that regulate all interbank transfers in Mexico.</span>
          </p>

          <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.10)", margin: "40px 0" }} />

          {/* Comparativa */}
          <h2 className="blog-h2" style={{ color: "#FFFFFF", fontWeight: 700, marginBottom: "6px" }}>
            PagoYa vs. pagar en OXXO directamente: ¿cuál conviene?
          </h2>
          <p style={{ color: "#64748B", fontWeight: 500, marginBottom: "20px" }}>PagoYa vs. Paying Directly at OXXO: Which Is Better?</p>

          <div className="blog-table-wrap" style={{ marginBottom: "20px" }}>
            <table className="blog-table">
              <thead>
                <tr>
                  <th></th>
                  <th>Pagar en OXXO directo</th>
                  <th>Pagar con PagoYa</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["¿Necesitas hacer fila?", "Sí, siempre", "No — pagas desde tu celular"],
                  ["¿Disponible 24/7?", "Solo en horario OXXO", "Sí, a cualquier hora"],
                  ["¿Historial de pagos?", "No", "Sí, en la app"],
                  ["¿Cuántos servicios?", "Limitado", "26+ servicios"],
                  ["¿Confirmación inmediata?", "Ticket en papel", "Notificación digital"],
                  ["¿Costo?", "Comisión por servicio", "$15 MXN fijo"],
                ].map(([label, col1, col2]) => (
                  <tr key={label}>
                    <td style={{ color: "#CBD5E1", fontWeight: 500 }}>{label}</td>
                    <td style={{ color: "#94A3B8" }}>{col1}</td>
                    <td style={{ color: "#1D9E75", fontWeight: 600 }}>{col2}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p style={{ lineHeight: 1.7 }}>
            La diferencia principal: con PagoYa, usas OXXO solo para recargar tu billetera — el pago real lo haces desde tu celular, en cualquier momento, sin filas, con historial completo.{" "}
            <span style={{ color: "#94A3B8" }}>The main difference: with PagoYa, you use OXXO only to load your wallet — the actual payment happens from your phone, anytime, without lines, with complete history.</span>
          </p>

          <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.10)", margin: "40px 0" }} />

          {/* Renta */}
          <h2 className="blog-h2" style={{ color: "#FFFFFF", fontWeight: 700, marginBottom: "6px" }}>
            ¿Puedo pagar la renta con PagoYa?
          </h2>
          <p style={{ color: "#64748B", fontWeight: 500, marginBottom: "16px" }}>Can I Pay Rent With PagoYa?</p>

          <p style={{ lineHeight: 1.7, marginBottom: "16px" }}>
            Sí. PagoYa incluye una vertical completa de pagos de renta llamada <strong style={{ color: "#FFFFFF" }}>PagoSeguro</strong>, diseñada específicamente para el mercado de arrendamiento en México. Inquilinos pueden pagar su renta digitalmente — incluyendo en efectivo vía OXXO — y los propietarios reciben notificación automática por WhatsApp.
          </p>
          <p style={{ lineHeight: 1.7, color: "#94A3B8", marginBottom: "20px" }}>
            Yes. PagoYa includes a complete rent payment vertical called PagoSeguro, designed specifically for Mexico's rental market. Tenants can pay rent digitally — including in cash via OXXO — and landlords receive automatic WhatsApp notification.
          </p>
          <p style={{ lineHeight: 1.7, padding: "14px 18px", background: "rgba(255,255,255,0.05)", borderRadius: "8px" }}>
            <a href="https://pagoyamx.com/pagar-renta">Cómo pagar renta sin cuenta bancaria →</a>
          </p>

          <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.10)", margin: "40px 0" }} />

          {/* FAQ */}
          <h2 className="blog-h2" style={{ color: "#FFFFFF", fontWeight: 700, marginBottom: "24px" }}>
            Preguntas frecuentes / Frequently Asked Questions
          </h2>

          {[
            {
              q: "¿Cuánto cobra PagoYa por cada pago?",
              a: "$15 MXN fijo por transacción. Sin cargos adicionales, sin suscripción mensual obligatoria.",
              en_q: "How much does PagoYa charge per payment?",
              en_a: "A flat $15 MXN per transaction. No additional charges, no mandatory monthly subscription.",
            },
            {
              q: "¿PagoYa está disponible en toda la República Mexicana?",
              a: "Sí. PagoYa opera a nivel nacional, con cobertura de recarga OXXO en más de 20,000 tiendas en todo el país.",
              en_q: "Is PagoYa available across all of Mexico?",
              en_a: "Yes. PagoYa operates nationwide, with OXXO cash-in coverage at 20,000+ stores across the country.",
            },
            {
              q: "¿Qué pasa si hago un pago y no se aplica?",
              a: "PagoYa utiliza failover automático entre dos proveedores de pago. Si hay un error, el sistema reintenta automáticamente. Si el pago no se procesa, el saldo regresa a tu billetera.",
              en_q: "What happens if I make a payment and it doesn't go through?",
              en_a: "PagoYa uses automatic failover between two payment providers. If there's an error, the system automatically retries. If the payment doesn't process, the balance returns to your wallet.",
            },
            {
              q: "¿Necesito internet para usar PagoYa?",
              a: "Sí, necesitas conexión a internet para realizar pagos desde la app. Sin embargo, la recarga de saldo en OXXO no requiere que tú tengas internet en ese momento.",
              en_q: "Do I need internet to use PagoYa?",
              en_a: "Yes, you need an internet connection to make payments from the app. However, loading balance at OXXO doesn't require you to have internet at that moment.",
            },
            {
              q: "¿Puedo usar PagoYa si solo tengo un teléfono básico con Android?",
              a: "PagoYa está optimizado para funcionar en smartphones Android de gama baja y media. Si tu teléfono puede correr WhatsApp, puede correr PagoYa.",
              en_q: "Can I use PagoYa if I only have a basic Android phone?",
              en_a: "PagoYa is optimized to work on low- and mid-range Android smartphones. If your phone can run WhatsApp, it can run PagoYa.",
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
              Empieza hoy / Get Started Today
            </h2>
            <p style={{ color: "#CBD5E1", lineHeight: 1.7, marginBottom: "8px" }}>
              No necesitas cuenta bancaria. No necesitas tarjeta de crédito. No necesitas hacer filas.
            </p>
            <p style={{ color: "#94A3B8", marginBottom: "24px" }}>
              You don't need a bank account. You don't need a credit card. You don't need to stand in line.
            </p>
            <p style={{ color: "#CBD5E1", marginBottom: "4px" }}>Solo necesitas tu celular y la app de PagoYa.</p>
            <p style={{ color: "#94A3B8", marginBottom: "28px" }}>You just need your phone and the PagoYa app.</p>
            <button
              onClick={() => navigate("/register")}
              style={{
                background: "#1D9E75", color: "white", border: "none",
                borderRadius: "12px", padding: "16px 36px",
                fontSize: "16px", fontWeight: 700, cursor: "pointer",
                display: "inline-block",
              }}
            >
              Descargar PagoYa gratis →
            </button>
            <p style={{ color: "#475569", fontSize: "12px", marginTop: "20px", lineHeight: 1.5 }}>
              PagoYa es operado por Longview Meridian Technologies. Los pagos se procesan vía STP/SPEI regulado por Banxico y Conekta. Comisión fija de $15 MXN por transacción.
            </p>
          </div>
        </article>
      </main>
    </div>
  );
}
