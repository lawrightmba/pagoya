import { useLocation } from "wouter";
import { Helmet } from "react-helmet-async";

const SLUG = "pagar-telmex-en-linea-efectivo";
const CANONICAL = `https://pagoyamx.com/${SLUG}`;

export default function LandingTelmexEfectivo() {
  const [, navigate] = useLocation();

  return (
    <div style={{ background: "#0A2540", minHeight: "100vh", display: "flex", flexDirection: "column", overflowX: "hidden" }}>
      <Helmet>
        <html lang="es-MX" />
        <title>Pagar Telmex en Línea con Efectivo | Sin Tarjeta | PagoYa</title>
        <meta name="description" content="¿Quieres pagar Telmex en línea con efectivo pero no tienes tarjeta? Con PagoYa cargas saldo en OXXO y pagas tu recibo Telmex en 2 minutos desde tu celular." />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={CANONICAL} />
        <meta name="geo.region" content="MX" />
        <meta property="og:title" content="Pagar Telmex en Línea con Efectivo | Sin Tarjeta | PagoYa" />
        <meta property="og:description" content="Paga tu recibo de Telmex en línea con efectivo sin tarjeta. Carga saldo en OXXO y paga desde tu celular con PagoYa." />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={CANONICAL} />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          "headline": "Cómo pagar Telmex en línea con efectivo sin tarjeta",
          "description": "Paga tu recibo de Telmex usando efectivo de OXXO sin necesitar tarjeta bancaria.",
          "url": CANONICAL,
          "publisher": { "@type": "Organization", "name": "PagoYa", "url": "https://pagoyamx.com" },
          "inLanguage": "es-MX"
        })}</script>
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Inicio", "item": "https://pagoyamx.com/" },
            { "@type": "ListItem", "position": 2, "name": "Pagar Telmex en línea con efectivo", "item": CANONICAL }
          ]
        })}</script>
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "mainEntity": [
            {
              "@type": "Question",
              "name": "¿Cómo pagar Telmex en línea con efectivo?",
              "acceptedAnswer": { "@type": "Answer", "text": "Con PagoYa: regístrate gratis con tu teléfono, genera un voucher OXXO, carga efectivo en la tienda y paga tu recibo Telmex desde la app en segundos. Sin tarjeta ni banco." }
            },
            {
              "@type": "Question",
              "name": "¿Puedo pagar Telmex sin tarjeta de crédito?",
              "acceptedAnswer": { "@type": "Answer", "text": "Sí. Con PagoYa el único requisito es tu número de teléfono y efectivo disponible. No necesitas tarjeta de crédito, débito ni cuenta bancaria." }
            },
            {
              "@type": "Question",
              "name": "¿Cuánto cobra PagoYa por pagar Telmex?",
              "acceptedAnswer": { "@type": "Answer", "text": "La comisión es de $25 MXN por pago. El registro es gratuito y sin mensualidad." }
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
          <span style={{ color: "rgba(255,255,255,0.6)" }}>Pagar Telmex en línea con efectivo</span>
        </nav>

        {/* Hero */}
        <section style={{ padding: "44px 0 40px" }}>
          <h1 style={{ color: "#fff", fontWeight: 900, margin: "0 0 20px" }}>
            Pagar Telmex en línea con efectivo —<br />
            <span style={{ color: "#1D9E75" }}>sin tarjeta, sin banco</span>
          </h1>
          <p style={{ fontSize: "18px", color: "#94A3B8", margin: "0 0 32px", maxWidth: "620px", lineHeight: 1.7 }}>
            ¿Quieres <strong style={{ color: "#fff" }}>pagar Telmex en línea con efectivo</strong> pero no tienes tarjeta bancaria? PagoYa lo hace posible. Carga tu dinero en efectivo en cualquier OXXO y paga tu recibo Telmex desde tu celular en menos de 2 minutos.
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
            { icon: "🌐", text: "Telmex, Telnor, Infinitum" },
            { icon: "🏪", text: "Carga en OXXO o por SPEI" },
            { icon: "💳", text: "Sin tarjeta ni cuenta bancaria" },
            { icon: "⚡", text: "Confirmación en segundos" },
          ].map(({ icon, text }) => (
            <div key={text} style={{ display: "flex", alignItems: "center", gap: "8px", color: "#94A3B8", fontSize: "14px" }}>
              <span>{icon}</span><span>{text}</span>
            </div>
          ))}
        </div>

        {/* Steps */}
        <section style={{ marginBottom: "56px" }}>
          <h2 style={{ color: "#fff", fontWeight: 800, margin: "0 0 28px" }}>
            Cómo pagar Telmex en línea con efectivo
          </h2>
          <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "20px" }}>
            {[
              { n: "1", title: "Regístrate gratis en 90 segundos", desc: "Solo necesitas tu número de teléfono. Sin CURP, sin banco, sin documentos. Tu monedero digital queda activo de inmediato." },
              { n: "2", title: "Genera tu voucher OXXO y carga efectivo", desc: "Desde la sección 'Cargar saldo', genera un código de barras. Ve a cualquier OXXO, muestra el código y paga el monto que quieras (mín. $50 MXN). Tu saldo se acredita en minutos." },
              { n: "3", title: "Paga tu recibo Telmex al instante", desc: "En la app selecciona Telmex, ingresa tu número de cliente o número telefónico, confirma el monto y ¡listo! Recibes comprobante digital de inmediato." },
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

        {/* What you can pay */}
        <section style={{ marginBottom: "56px" }}>
          <h2 style={{ color: "#fff", fontWeight: 800, margin: "0 0 20px" }}>
            Servicios Telmex que puedes pagar con efectivo
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
            {[
              { icon: "📞", name: "Telmex (línea fija)", desc: "Pago mensual de teléfono fijo" },
              { icon: "🌐", name: "Infinitum (internet)", desc: "Recibo de internet en el hogar" },
              { icon: "📡", name: "Telnor (noroeste MX)", desc: "Líneas en Baja California" },
              { icon: "📦", name: "Telmex paquete", desc: "Internet + línea fija bundle" },
            ].map(({ icon, name, desc }) => (
              <div key={name} style={{ background: "rgba(255,255,255,0.05)", borderRadius: "16px", padding: "20px", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ fontSize: "28px", marginBottom: "8px" }}>{icon}</div>
                <p style={{ color: "#fff", fontWeight: 700, margin: "0 0 4px", fontSize: "15px" }}>{name}</p>
                <p style={{ color: "#94A3B8", margin: 0, fontSize: "13px" }}>{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section style={{ marginBottom: "56px" }}>
          <h2 style={{ color: "#fff", fontWeight: 800, margin: "0 0 8px" }}>
            Preguntas frecuentes
          </h2>
          {[
            {
              q: "¿Cómo pagar Telmex en línea con efectivo sin tarjeta?",
              a: "Con PagoYa: regístrate gratis, genera un voucher OXXO desde la app, carga el efectivo en la tienda, y paga tu recibo Telmex desde tu celular. El proceso completo tarda menos de 5 minutos la primera vez, y menos de 2 minutos en pagos subsecuentes."
            },
            {
              q: "¿Necesito mi número de cuenta Telmex?",
              a: "Sí, necesitas tu número de cliente Telmex (aparece en tu recibo mensual) o el número telefónico de la línea que quieres pagar. Cualquiera de los dos funciona en PagoYa."
            },
            {
              q: "¿Puedo pagar Telmex atrasado con PagoYa?",
              a: "Sí. PagoYa paga el saldo adeudado actual de tu línea Telmex. Si tienes meses atrasados, el pago se aplica al total vencido en el sistema de Telmex."
            },
            {
              q: "¿PagoYa también paga Infinitum (internet Telmex)?",
              a: "Sí. Infinitum usa el mismo número de cliente Telmex, así que puedes pagarlo exactamente igual: ingresa tu número de cliente y listo."
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
            Paga tu Telmex con efectivo ahora mismo
          </h2>
          <p style={{ color: "rgba(255,255,255,0.8)", margin: "0 0 28px", fontSize: "16px" }}>
            Regístrate gratis. Sin banco, sin tarjeta, sin trámites.
          </p>
          <button onClick={() => navigate("/register")}
            style={{ background: "#fff", color: "#0A2540", border: "none", borderRadius: "14px", padding: "16px 36px", fontWeight: 900, fontSize: "16px", cursor: "pointer" }}>
            Crear mi monedero gratis →
          </button>
        </section>

        {/* Internal links */}
        <nav style={{ marginTop: "48px", paddingTop: "32px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <p style={{ color: "rgba(255,255,255,0.38)", fontSize: "13px", margin: "0 0 14px", textTransform: "uppercase", letterSpacing: "0.08em" }}>También te puede interesar</p>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            {[
              { label: "Pagar CFE sin banco", path: "/pagar-cfe-sin-banco" },
              { label: "Recargar saldo sin tarjeta", path: "/recargar-saldo-sin-tarjeta" },
              { label: "Pagar luz sin banco", path: "/pagar-luz-sin-banco" },
              { label: "Pagar Telmex sin tarjeta", path: "/pagar-telmex-sin-tarjeta" },
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
