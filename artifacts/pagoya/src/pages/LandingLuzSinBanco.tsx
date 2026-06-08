import { useLocation } from "wouter";
import { Helmet } from "react-helmet-async";

const SLUG = "pagar-luz-sin-banco";
const CANONICAL = `https://pagoyamx.com/${SLUG}`;

export default function LandingLuzSinBanco() {
  const [, navigate] = useLocation();

  return (
    <div style={{ background: "#0A2540", minHeight: "100vh", display: "flex", flexDirection: "column", overflowX: "hidden" }}>
      <Helmet>
        <html lang="es-MX" />
        <title>Pagar la Luz Sin Banco en México — Sin Filas | PagoYa</title>
        <meta name="description" content="Pagar la luz sin banco es posible con PagoYa. Sin sucursal CFE, sin tarjeta, sin filas. Carga efectivo en OXXO y paga tu recibo de luz en 2 minutos desde tu celular." />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={CANONICAL} />
        <meta name="geo.region" content="MX" />
        <meta property="og:title" content="Pagar la Luz Sin Banco en México | PagoYa" />
        <meta property="og:description" content="Paga tu recibo de luz CFE sin banco ni tarjeta. Carga saldo en efectivo en OXXO y paga desde tu celular en 2 minutos." />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={CANONICAL} />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          "headline": "Pagar la luz sin banco en México — sin filas ni sucursal",
          "description": "Cómo pagar tu recibo de luz CFE sin cuenta bancaria, tarjeta ni visitar la sucursal.",
          "url": CANONICAL,
          "publisher": { "@type": "Organization", "name": "PagoYa", "url": "https://pagoyamx.com" },
          "inLanguage": "es-MX"
        })}</script>
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Inicio", "item": "https://pagoyamx.com/" },
            { "@type": "ListItem", "position": 2, "name": "Pagar la luz sin banco", "item": CANONICAL }
          ]
        })}</script>
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "mainEntity": [
            {
              "@type": "Question",
              "name": "¿Cómo pagar la luz sin banco?",
              "acceptedAnswer": { "@type": "Answer", "text": "Con PagoYa puedes pagar la luz sin banco usando tu celular. Carga saldo en efectivo en cualquier OXXO o por transferencia SPEI, y paga tu recibo CFE en segundos. Solo necesitas tu número de teléfono para registrarte." }
            },
            {
              "@type": "Question",
              "name": "¿Puedo pagar el recibo de luz en línea sin tarjeta?",
              "acceptedAnswer": { "@type": "Answer", "text": "Sí. PagoYa no requiere tarjeta bancaria. Puedes cargar saldo con efectivo en OXXO o SPEI desde cualquier banco, y pagar tu recibo CFE en línea desde tu celular." }
            },
            {
              "@type": "Question",
              "name": "¿Cuánto cobra PagoYa por pagar CFE?",
              "acceptedAnswer": { "@type": "Answer", "text": "La comisión es de $25 MXN por pago. Sin mensualidad ni cargos ocultos. El registro es completamente gratuito." }
            }
          ]
        })}</script>
      </Helmet>

      <style>{`
        .py-page { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
        .py-page h1 { font-size: clamp(26px, 5vw, 44px); line-height: 1.18; }
        .py-page h2 { font-size: clamp(20px, 3.5vw, 30px); }
        .py-faq-item { border-bottom: 1px solid rgba(255,255,255,0.08); padding: 20px 0; }
        @media(max-width:640px){ .py-page { padding: 0 18px 60px; } }
      `}</style>

      {/* Header */}
      <header style={{ background: "#0A2540", padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ cursor: "pointer" }} onClick={() => navigate("/")}>
          <img src="/pagoya-logo.png" alt="PagoYa" style={{ height: "40px", width: "auto" }}
            onError={e => { e.currentTarget.style.display = "none"; const t = document.createElement("span"); t.textContent = "PagoYa"; t.style.cssText = "color:#fff;font-size:22px;font-weight:900"; e.currentTarget.parentNode?.appendChild(t); }} />
        </div>
        <button onClick={() => navigate("/register")}
          style={{ background: "#1D9E75", color: "#fff", border: "none", borderRadius: "10px", padding: "10px 20px", fontWeight: 700, fontSize: "14px", cursor: "pointer" }}>
          Crear cuenta gratis
        </button>
      </header>

      <main className="py-page" style={{ maxWidth: "780px", margin: "0 auto", padding: "0 24px 80px", width: "100%" }}>

        <nav style={{ padding: "16px 0 0", fontSize: "13px", color: "rgba(255,255,255,0.38)" }}>
          <span style={{ cursor: "pointer" }} onClick={() => navigate("/")}>Inicio</span>{" › "}
          <span style={{ color: "rgba(255,255,255,0.6)" }}>Pagar la luz sin banco</span>
        </nav>

        {/* Hero */}
        <section style={{ padding: "44px 0 40px" }}>
          <h1 style={{ color: "#fff", fontWeight: 900, margin: "0 0 20px" }}>
            Pagar la luz sin banco —<br />
            <span style={{ color: "#1D9E75" }}>desde tu celular en 2 minutos</span>
          </h1>
          <p style={{ fontSize: "18px", color: "#94A3B8", margin: "0 0 32px", maxWidth: "620px", lineHeight: 1.7 }}>
            <strong style={{ color: "#fff" }}>Pagar la luz sin banco</strong> ya no requiere ir a la sucursal CFE ni tener tarjeta de crédito. Con PagoYa cargas efectivo en cualquier OXXO y pagas tu recibo CFE desde tu celular — en segundos, cualquier día, a cualquier hora.
          </p>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <button onClick={() => navigate("/register")}
              style={{ background: "#1D9E75", color: "#fff", border: "none", borderRadius: "14px", padding: "16px 32px", fontWeight: 800, fontSize: "16px", cursor: "pointer" }}>
              Crear mi monedero gratis →
            </button>
            <button onClick={() => navigate("/")}
              style={{ background: "transparent", color: "#94A3B8", border: "1px solid rgba(255,255,255,0.16)", borderRadius: "14px", padding: "16px 24px", fontWeight: 600, fontSize: "15px", cursor: "pointer" }}>
              Ver demo
            </button>
          </div>
        </section>

        {/* Trust bar */}
        <div style={{ display: "flex", gap: "24px", flexWrap: "wrap", padding: "24px 0", borderTop: "1px solid rgba(255,255,255,0.08)", borderBottom: "1px solid rgba(255,255,255,0.08)", marginBottom: "48px" }}>
          {[
            { icon: "⚡", text: "CFE confirmado en < 60 seg" },
            { icon: "🏪", text: "Carga efectivo en OXXO" },
            { icon: "📱", text: "Sin banco ni tarjeta" },
            { icon: "☎️", text: "Soporte por WhatsApp" },
          ].map(({ icon, text }) => (
            <div key={text} style={{ display: "flex", alignItems: "center", gap: "8px", color: "#94A3B8", fontSize: "14px" }}>
              <span>{icon}</span><span>{text}</span>
            </div>
          ))}
        </div>

        {/* Steps */}
        <section style={{ marginBottom: "56px" }}>
          <h2 style={{ color: "#fff", fontWeight: 800, margin: "0 0 28px" }}>
            Pasos para pagar la luz sin banco
          </h2>
          <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "20px" }}>
            {[
              { n: "1", title: "Abre tu monedero PagoYa gratis", desc: "Ingresa tu número de teléfono y verifica con un código SMS. Sin banco, sin tarjeta, sin CURP en el registro. Tarda 90 segundos." },
              { n: "2", title: "Carga efectivo en el OXXO más cercano", desc: "Desde 'Cargar saldo', genera un voucher con código de barras. Paga lo que necesitas en efectivo en cualquier OXXO. Tu saldo llega en minutos." },
              { n: "3", title: "Selecciona CFE y paga tu recibo", desc: "En el menú de pagos elige CFE, escribe tu número de contrato (lo encuentras en tu recibo o marcando 071 gratis), confirma y listo. Recibes comprobante digital." },
            ].map(({ n, title, desc }) => (
              <li key={n} style={{ display: "flex", gap: "20px", alignItems: "flex-start" }}>
                <div style={{ minWidth: "40px", height: "40px", borderRadius: "50%", background: "#1D9E75", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 900, fontSize: "18px" }}>{n}</div>
                <div>
                  <h3 style={{ color: "#fff", fontWeight: 700, margin: "0 0 6px", fontSize: "17px" }}>{title}</h3>
                  <p style={{ margin: 0, fontSize: "15px", color: "#CBD5E1", lineHeight: 1.65 }}>{desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Why no CFE branch */}
        <section style={{ marginBottom: "56px" }}>
          <h2 style={{ color: "#fff", fontWeight: 800, margin: "0 0 20px" }}>
            ¿Por qué evitar la sucursal CFE?
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
            {[
              { icon: "⏱️", title: "Esperas de 30–60 min", desc: "El tiempo promedio en sucursal CFE en hora pico es de casi una hora." },
              { icon: "🕐", title: "Horarios limitados", desc: "Las sucursales cierran a las 3–4 PM. PagoYa funciona las 24 horas." },
              { icon: "📍", title: "No siempre cerca", desc: "Las sucursales CFE son menos de 2,000 en todo México. Los OXXO son más de 20,000." },
              { icon: "📄", title: "Llevar recibo físico", desc: "En sucursal necesitas tu recibo impreso. Con PagoYa solo el número de contrato." },
            ].map(({ icon, title, desc }) => (
              <div key={title} style={{ background: "rgba(245,158,11,0.08)", borderRadius: "16px", padding: "20px", border: "1px solid rgba(245,158,11,0.2)" }}>
                <span style={{ fontSize: "28px", display: "block", marginBottom: "10px" }}>{icon}</span>
                <p style={{ color: "#fff", fontWeight: 700, margin: "0 0 6px", fontSize: "15px" }}>{title}</p>
                <p style={{ color: "#94A3B8", margin: 0, fontSize: "13px", lineHeight: 1.55 }}>{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section style={{ marginBottom: "56px" }}>
          <h2 style={{ color: "#fff", fontWeight: 800, margin: "0 0 8px" }}>
            Preguntas frecuentes — pagar la luz sin banco
          </h2>
          {[
            {
              q: "¿Cómo pagar la luz sin banco en México?",
              a: "Con PagoYa: regístrate gratis con tu número de teléfono, carga efectivo en cualquier OXXO generando un voucher desde la app, y paga tu recibo de luz CFE ingresando tu número de contrato. No necesitas banco, tarjeta ni visitar ninguna sucursal."
            },
            {
              q: "¿Dónde encuentro mi número de contrato CFE?",
              a: "Está en la parte superior de tu recibo mensual de CFE, arriba del nombre del titular. Si no tienes el recibo, llama al 071 (gratis desde cualquier teléfono en México) o visita cfe.mx."
            },
            {
              q: "¿Puedo pagar el recibo de luz en línea sin tarjeta?",
              a: "Sí. PagoYa no requiere tarjeta. Solo necesitas efectivo para cargar tu monedero en OXXO, o puedes recibir una transferencia SPEI en tu CLABE única de PagoYa."
            },
            {
              q: "¿Qué pasa si no tengo número de contrato CFE?",
              a: "Puedes obtenerlo llamando al 071 (atención al cliente CFE, gratuito). También lo puedes consultar en la app CFE Contigo o en cfe.mx con tu nombre y dirección de suministro."
            },
            {
              q: "¿PagoYa funciona en todas partes de México?",
              a: "Sí. PagoYa paga CFE en todos los estados de México. La cobertura de OXXO para cargar saldo es también nacional — más de 20,000 tiendas."
            },
          ].map(({ q, a }) => (
            <div key={q} className="py-faq-item">
              <h3 style={{ color: "#fff", fontWeight: 700, margin: "0 0 10px", fontSize: "16px" }}>{q}</h3>
              <p style={{ margin: 0, fontSize: "15px", color: "#CBD5E1", lineHeight: 1.65 }}>{a}</p>
            </div>
          ))}
        </section>

        {/* CTA */}
        <section style={{ background: "linear-gradient(135deg, #0D3D2A 0%, #1D9E75 100%)", borderRadius: "24px", padding: "40px 32px", textAlign: "center" }}>
          <h2 style={{ color: "#fff", fontWeight: 900, margin: "0 0 12px", fontSize: "clamp(22px,4vw,32px)" }}>
            Paga la luz sin banco hoy mismo
          </h2>
          <p style={{ color: "rgba(255,255,255,0.85)", margin: "0 0 28px", fontSize: "16px" }}>
            Regístrate gratis en 90 segundos. Sin banco, sin tarjeta, sin filas.
          </p>
          <button onClick={() => navigate("/register")}
            style={{ background: "#fff", color: "#0A2540", border: "none", borderRadius: "14px", padding: "16px 36px", fontWeight: 900, fontSize: "16px", cursor: "pointer" }}>
            Crear mi monedero gratis →
          </button>
          <p style={{ color: "rgba(255,255,255,0.55)", margin: "16px 0 0", fontSize: "13px" }}>
            ¿Prefieres WhatsApp? Escríbele a Paula, nuestra agente de IA, y paga por mensaje.
          </p>
        </section>

        <nav style={{ marginTop: "48px", paddingTop: "32px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <p style={{ color: "rgba(255,255,255,0.38)", fontSize: "13px", margin: "0 0 14px", textTransform: "uppercase", letterSpacing: "0.08em" }}>También te puede interesar</p>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            {[
              { label: "Pagar CFE sin banco", path: "/pagar-cfe-sin-banco" },
              { label: "Pagar Telmex con efectivo", path: "/pagar-telmex-en-linea-efectivo" },
              { label: "Recargar saldo sin tarjeta", path: "/recargar-saldo-sin-tarjeta" },
              { label: "¿Qué pasa si pago CFE tarde?", path: "/que-pasa-si-pago-cfe-tarde" },
            ].map(({ label, path }) => (
              <button key={path} onClick={() => navigate(path)}
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", padding: "8px 14px", color: "#94A3B8", fontSize: "13px", cursor: "pointer" }}>
                {label}
              </button>
            ))}
          </div>
        </nav>
      </main>

      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.08)", padding: "24px", textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: "13px" }}>
        © {new Date().getFullYear()} PagoYa · Tu monedero digital, sin banco ·{" "}
        <span style={{ cursor: "pointer", textDecoration: "underline" }} onClick={() => navigate("/terminos-y-condiciones")}>Términos</span>{" · "}
        <span style={{ cursor: "pointer", textDecoration: "underline" }} onClick={() => navigate("/aviso-de-privacidad")}>Privacidad</span>
      </footer>
    </div>
  );
}
