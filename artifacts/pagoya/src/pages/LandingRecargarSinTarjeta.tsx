import { useLocation } from "wouter";
import { Helmet } from "react-helmet-async";

const SLUG = "recargar-saldo-sin-tarjeta";
const CANONICAL = `https://pagoyamx.com/${SLUG}`;

export default function LandingRecargarSinTarjeta() {
  const [, navigate] = useLocation();

  return (
    <div style={{ background: "#0A2540", minHeight: "100vh", display: "flex", flexDirection: "column", overflowX: "hidden" }}>
      <Helmet>
        <html lang="es-MX" />
        <title>Recargar Saldo Sin Tarjeta en México | OXXO o SPEI | PagoYa</title>
        <meta name="description" content="Recarga saldo sin tarjeta en México con PagoYa. Carga efectivo en cualquier OXXO o por transferencia SPEI. Sin cuenta bancaria, sin tarjeta de crédito ni débito." />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={CANONICAL} />
        <meta name="geo.region" content="MX" />
        <meta property="og:title" content="Recargar Saldo Sin Tarjeta en México | PagoYa" />
        <meta property="og:description" content="Carga tu monedero PagoYa sin tarjeta. Efectivo en OXXO o transferencia SPEI desde cualquier banco. Paga servicios al instante." />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={CANONICAL} />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          "headline": "Recargar saldo sin tarjeta en México",
          "description": "Cómo recargar tu monedero PagoYa usando efectivo en OXXO o transferencia SPEI, sin necesitar tarjeta bancaria.",
          "url": CANONICAL,
          "publisher": { "@type": "Organization", "name": "PagoYa", "url": "https://pagoyamx.com" },
          "inLanguage": "es-MX"
        })}</script>
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Inicio", "item": "https://pagoyamx.com/" },
            { "@type": "ListItem", "position": 2, "name": "Recargar saldo sin tarjeta", "item": CANONICAL }
          ]
        })}</script>
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "mainEntity": [
            {
              "@type": "Question",
              "name": "¿Cómo recargar saldo sin tarjeta en México?",
              "acceptedAnswer": { "@type": "Answer", "text": "Con PagoYa puedes recargar saldo sin tarjeta de dos formas: (1) genera un voucher OXXO desde la app y paga en efectivo en cualquier tienda OXXO, o (2) recibe una CLABE interbancaria única y haz una transferencia SPEI desde cualquier banco." }
            },
            {
              "@type": "Question",
              "name": "¿Cuánto mínimo puedo recargar en OXXO?",
              "acceptedAnswer": { "@type": "Answer", "text": "El monto mínimo de recarga en OXXO es $50 MXN. No hay límite máximo por transacción (hasta $10,000 MXN por voucher)." }
            },
            {
              "@type": "Question",
              "name": "¿Cuánto tarda en acreditarse la recarga en OXXO?",
              "acceptedAnswer": { "@type": "Answer", "text": "La recarga en OXXO se acredita en tu monedero PagoYa en minutos. Recibes una notificación push cuando el saldo está disponible." }
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
          <span style={{ color: "rgba(255,255,255,0.6)" }}>Recargar saldo sin tarjeta en México</span>
        </nav>

        {/* Hero */}
        <section style={{ padding: "44px 0 40px" }}>
          <h1 style={{ color: "#fff", fontWeight: 900, margin: "0 0 20px" }}>
            Recarga saldo sin tarjeta<br />
            <span style={{ color: "#1D9E75" }}>en cualquier OXXO de México</span>
          </h1>
          <p style={{ fontSize: "18px", color: "#94A3B8", margin: "0 0 32px", maxWidth: "620px", lineHeight: 1.7 }}>
            <strong style={{ color: "#fff" }}>Recargar saldo sin tarjeta en México</strong> es fácil con PagoYa. Elige entre efectivo en OXXO o una transferencia SPEI desde tu banco — sin tarjeta de crédito, sin débito, sin cuenta de nómina. Paga CFE, Telcel, Telmex y más desde tu monedero.
          </p>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <button onClick={() => navigate("/register")}
              style={{ background: "#1D9E75", color: "#fff", border: "none", borderRadius: "14px", padding: "16px 32px", fontWeight: 800, fontSize: "16px", cursor: "pointer" }}>
              Crear mi monedero gratis →
            </button>
            <button onClick={() => navigate("/cargar")}
              style={{ background: "transparent", color: "#94A3B8", border: "1px solid rgba(255,255,255,0.16)", borderRadius: "14px", padding: "16px 24px", fontWeight: 600, fontSize: "15px", cursor: "pointer" }}>
              Ver métodos de carga
            </button>
          </div>
        </section>

        {/* Trust bar */}
        <div style={{ display: "flex", gap: "24px", flexWrap: "wrap", padding: "24px 0", borderTop: "1px solid rgba(255,255,255,0.08)", borderBottom: "1px solid rgba(255,255,255,0.08)", marginBottom: "48px" }}>
          {[
            { icon: "🏪", text: "+20,000 OXXO en México" },
            { icon: "🏦", text: "SPEI desde cualquier banco" },
            { icon: "💳", text: "Sin tarjeta necesaria" },
            { icon: "⚡", text: "Saldo en minutos" },
          ].map(({ icon, text }) => (
            <div key={text} style={{ display: "flex", alignItems: "center", gap: "8px", color: "#94A3B8", fontSize: "14px" }}>
              <span>{icon}</span><span>{text}</span>
            </div>
          ))}
        </div>

        {/* Methods */}
        <section style={{ marginBottom: "56px" }}>
          <h2 style={{ color: "#fff", fontWeight: 800, margin: "0 0 24px" }}>
            3 formas de recargar saldo sin tarjeta
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {[
              {
                icon: "🏪",
                title: "OXXO — efectivo",
                tag: "Recomendado",
                tagColor: "#1D9E75",
                steps: ["Genera un voucher con código de barras en PagoYa", "Ve al OXXO más cercano", "Paga el monto en efectivo", "Saldo acreditado en minutos"],
                min: "Mínimo: $50 MXN · Sin comisión adicional"
              },
              {
                icon: "🏦",
                title: "SPEI — transferencia",
                tag: "Más rápido",
                tagColor: "#5B48D9",
                steps: ["Obtén tu CLABE única de 18 dígitos en PagoYa", "Haz una transferencia desde cualquier app bancaria", "CLABE es permanente — la misma siempre", "Saldo acreditado automáticamente"],
                min: "Mínimo: cualquier monto · Disponible 24/7"
              },
              {
                icon: "💳",
                title: "Tarjeta — si tienes",
                tag: "Opcional",
                tagColor: "#94A3B8",
                steps: ["Ingresa los datos de tu tarjeta (débito o crédito)", "Elige el monto a cargar", "Pago procesado con Stripe (seguro)", "Saldo disponible de inmediato"],
                min: "Mínimo: $50 MXN · Para quienes sí tienen tarjeta"
              },
            ].map(({ icon, title, tag, tagColor, steps, min }) => (
              <div key={title} style={{ background: "rgba(255,255,255,0.04)", borderRadius: "20px", padding: "24px", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
                  <span style={{ fontSize: "28px" }}>{icon}</span>
                  <div>
                    <p style={{ color: "#fff", fontWeight: 800, margin: 0, fontSize: "17px" }}>{title}</p>
                    <span style={{ background: tagColor, color: "#fff", borderRadius: "6px", padding: "2px 8px", fontSize: "11px", fontWeight: 700 }}>{tag}</span>
                  </div>
                </div>
                <ol style={{ listStyle: "decimal", paddingLeft: "20px", margin: "0 0 12px" }}>
                  {steps.map(s => <li key={s} style={{ color: "#CBD5E1", fontSize: "14px", marginBottom: "6px", lineHeight: 1.55 }}>{s}</li>)}
                </ol>
                <p style={{ color: "#64748B", fontSize: "13px", margin: 0 }}>{min}</p>
              </div>
            ))}
          </div>
        </section>

        {/* What you can do after */}
        <section style={{ marginBottom: "56px" }}>
          <h2 style={{ color: "#fff", fontWeight: 800, margin: "0 0 20px" }}>
            ¿Qué puedes hacer con tu saldo PagoYa?
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "14px" }}>
            {[
              { icon: "⚡", text: "Pagar CFE (luz)" },
              { icon: "📞", text: "Pagar Telmex" },
              { icon: "📱", text: "Recargar Telcel" },
              { icon: "📺", text: "Pagar IZZI o SKY" },
              { icon: "🎮", text: "Gift cards de juegos" },
              { icon: "🎬", text: "Netflix, Amazon, Uber" },
            ].map(({ icon, text }) => (
              <div key={text} style={{ background: "rgba(29,158,117,0.08)", borderRadius: "14px", padding: "18px 16px", border: "1px solid rgba(29,158,117,0.2)", display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "22px" }}>{icon}</span>
                <span style={{ color: "#fff", fontWeight: 600, fontSize: "14px" }}>{text}</span>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section style={{ marginBottom: "56px" }}>
          <h2 style={{ color: "#fff", fontWeight: 800, margin: "0 0 8px" }}>
            Preguntas frecuentes — recargar saldo sin tarjeta
          </h2>
          {[
            {
              q: "¿Cómo recargar saldo sin tarjeta en México?",
              a: "Con PagoYa tienes dos opciones principales: genera un voucher OXXO desde la app y paga en efectivo en cualquier tienda, o usa tu CLABE interbancaria única para recibir una transferencia SPEI desde cualquier banco en México."
            },
            {
              q: "¿Cuánto tarda en llegar el saldo al recargar en OXXO?",
              a: "Generalmente entre 5 y 15 minutos después del pago en caja. Recibirás una notificación push cuando el saldo esté disponible en tu monedero."
            },
            {
              q: "¿Puedo recargar en cualquier OXXO de México?",
              a: "Sí. Hay más de 20,000 tiendas OXXO en todo México. El voucher que genera PagoYa funciona en cualquier sucursal."
            },
            {
              q: "¿Hay un límite de cuánto saldo puedo tener?",
              a: "El límite mensual predeterminado es $6,000 MXN. Si verificas tu identidad con tu CURP (opcional), el límite sube a $24,000 MXN/mes."
            },
            {
              q: "¿El saldo PagoYa caduca?",
              a: "No. Tu saldo PagoYa no caduca. Puedes mantenerlo en tu monedero el tiempo que quieras y usarlo cuando lo necesites."
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
            Tu monedero digital sin banco ni tarjeta
          </h2>
          <p style={{ color: "rgba(255,255,255,0.8)", margin: "0 0 28px", fontSize: "16px" }}>
            Regístrate en 90 segundos. Recarga en OXXO hoy mismo.
          </p>
          <button onClick={() => navigate("/register")}
            style={{ background: "#fff", color: "#0A2540", border: "none", borderRadius: "14px", padding: "16px 36px", fontWeight: 900, fontSize: "16px", cursor: "pointer" }}>
            Crear mi monedero gratis →
          </button>
        </section>

        <nav style={{ marginTop: "48px", paddingTop: "32px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <p style={{ color: "rgba(255,255,255,0.38)", fontSize: "13px", margin: "0 0 14px", textTransform: "uppercase", letterSpacing: "0.08em" }}>También te puede interesar</p>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            {[
              { label: "Pagar CFE sin banco", path: "/pagar-cfe-sin-banco" },
              { label: "Pagar luz sin banco", path: "/pagar-luz-sin-banco" },
              { label: "Pagar Telmex con efectivo", path: "/pagar-telmex-en-linea-efectivo" },
              { label: "Depositar en OXXO", path: "/deposito-oxxo" },
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
        <span style={{ cursor: "pointer", textDecoration: "underline" }} onClick={() => navigate("/aviso-de-privacidad")}>Privacidad</span>{" · "}
        <span style={{ cursor: "pointer", textDecoration: "underline" }} onClick={() => navigate("/atencion")}>Atención al Cliente</span>
      </footer>
    </div>
  );
}
