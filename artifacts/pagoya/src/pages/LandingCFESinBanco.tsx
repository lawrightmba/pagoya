import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useLocation } from "wouter";

const SLUG = "pagar-cfe-sin-banco";
const CANONICAL = `https://pagoyamx.com/${SLUG}`;

export default function LandingCFESinBanco() {
  const [, navigate] = useLocation();
  const [phone, setPhone] = useState("");

  return (
    <div style={{ background: "#0A2540", minHeight: "100vh", display: "flex", flexDirection: "column", overflowX: "hidden" }}>
      <Helmet>
        <html lang="es-MX" />
        <title>Pagar CFE Sin Banco Desde tu Celular | PagoYa</title>
        <meta name="description" content="Pagar CFE sin banco es posible con PagoYa. Carga efectivo en OXXO, paga tu recibo de luz en 2 minutos. Sin tarjeta, sin cuenta bancaria, sin filas." />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={CANONICAL} />
        <meta name="geo.region" content="MX" />
        <meta name="geo.placename" content="México" />
        <meta property="og:title" content="Pagar CFE Sin Banco Desde tu Celular | PagoYa" />
        <meta property="og:description" content="Pagar CFE sin banco es posible con PagoYa. Carga efectivo en OXXO y paga tu recibo de luz en 2 minutos." />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={CANONICAL} />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          "headline": "Pagar CFE sin banco desde tu celular",
          "description": "Cómo pagar tu recibo de luz CFE sin cuenta bancaria ni tarjeta, usando PagoYa y OXXO.",
          "url": CANONICAL,
          "publisher": { "@type": "Organization", "name": "PagoYa", "url": "https://pagoyamx.com" },
          "inLanguage": "es-MX"
        })}</script>
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Inicio", "item": "https://pagoyamx.com/" },
            { "@type": "ListItem", "position": 2, "name": "Pagar CFE sin banco", "item": CANONICAL }
          ]
        })}</script>
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "mainEntity": [
            {
              "@type": "Question",
              "name": "¿Cómo puedo pagar CFE sin banco?",
              "acceptedAnswer": { "@type": "Answer", "text": "Con PagoYa puedes cargar saldo en efectivo en cualquier OXXO y luego pagar tu recibo de CFE desde tu celular en segundos. No necesitas banco ni tarjeta." }
            },
            {
              "@type": "Question",
              "name": "¿Cuánto cuesta pagar CFE con PagoYa?",
              "acceptedAnswer": { "@type": "Answer", "text": "PagoYa cobra una comisión de $25 MXN por pago de servicio. No hay cargos ocultos ni mensualidad." }
            },
            {
              "@type": "Question",
              "name": "¿En cuánto tiempo se refleja el pago de CFE?",
              "acceptedAnswer": { "@type": "Answer", "text": "El pago se confirma en menos de 60 segundos. Recibes confirmación por mensaje al instante." }
            }
          ]
        })}</script>
      </Helmet>

      <style>{`
        .py-page { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
        .py-page h1 { font-size: clamp(26px, 5vw, 44px); line-height: 1.18; }
        .py-page h2 { font-size: clamp(20px, 3.5vw, 30px); }
        .py-page h3 { font-size: clamp(17px, 2.5vw, 22px); }
        .py-page p, .py-page li { color: #CBD5E1; line-height: 1.72; }
        .py-page a { color: #1D9E75; }
        .py-faq-item { border-bottom: 1px solid rgba(255,255,255,0.08); padding: 20px 0; }
        @media(max-width:640px){ .py-page { padding: 0 18px 60px; } }
      `}</style>

      {/* Header */}
      <header style={{ background: "#0A2540", padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ cursor: "pointer" }} onClick={() => navigate("/")}>
          <img src="/pagoya-logo.png" alt="PagoYa" style={{ height: "40px", width: "auto" }}
            onError={e => { e.currentTarget.style.display = "none"; const t = document.createElement("span"); t.textContent = "PagoYa"; t.style.cssText = "color:#fff;font-size:22px;font-weight:900;letter-spacing:-0.5px"; e.currentTarget.parentNode?.appendChild(t); }} />
        </div>
        <button onClick={() => navigate("/register")}
          style={{ background: "#1D9E75", color: "#fff", border: "none", borderRadius: "10px", padding: "10px 20px", fontWeight: 700, fontSize: "14px", cursor: "pointer" }}>
          Crear cuenta gratis
        </button>
      </header>

      <main className="py-page" style={{ maxWidth: "780px", margin: "0 auto", padding: "0 24px 80px", width: "100%" }}>

        {/* Breadcrumb */}
        <nav style={{ padding: "16px 0 0", fontSize: "13px", color: "rgba(255,255,255,0.38)" }}>
          <span style={{ cursor: "pointer" }} onClick={() => navigate("/")}>Inicio</span>
          {" › "}
          <span style={{ color: "rgba(255,255,255,0.6)" }}>Pagar CFE sin banco</span>
        </nav>

        {/* Hero */}
        <section style={{ padding: "44px 0 40px" }}>
          <h1 style={{ color: "#fff", fontWeight: 900, margin: "0 0 20px" }}>
            Pagar CFE sin banco es posible —<br />
            <span style={{ color: "#1D9E75" }}>y tarda 2 minutos</span>
          </h1>
          <p style={{ fontSize: "18px", color: "#94A3B8", margin: "0 0 32px", maxWidth: "600px" }}>
            Si necesitas <strong style={{ color: "#fff" }}>pagar CFE sin banco</strong> y sin tarjeta de crédito, PagoYa es la solución. Carga saldo en efectivo en cualquier OXXO y paga tu recibo de luz desde tu celular en segundos — sin sucursal, sin filas, sin cuenta bancaria.
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
            { icon: "⚡", text: "Pago en menos de 60 seg" },
            { icon: "🏪", text: "Carga en cualquier OXXO" },
            { icon: "📱", text: "Sin banco ni tarjeta" },
            { icon: "🔒", text: "Pagos seguros y confirmados" },
          ].map(({ icon, text }) => (
            <div key={text} style={{ display: "flex", alignItems: "center", gap: "8px", color: "#94A3B8", fontSize: "14px" }}>
              <span>{icon}</span><span>{text}</span>
            </div>
          ))}
        </div>

        {/* How it works */}
        <section style={{ marginBottom: "56px" }}>
          <h2 style={{ color: "#fff", fontWeight: 800, margin: "0 0 28px" }}>
            Cómo pagar CFE sin banco con PagoYa
          </h2>
          <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "20px" }}>
            {[
              { n: "1", title: "Crea tu monedero gratis", desc: "Regístrate con tu número de teléfono. Sin CURP, sin banco, sin papeleo. Tu monedero queda listo en 90 segundos." },
              { n: "2", title: "Carga saldo en OXXO", desc: "Genera un voucher con código de barras desde la app. Ve a cualquier OXXO, paga en efectivo y tu saldo se acredita en minutos." },
              { n: "3", title: "Paga tu recibo de CFE", desc: "Ingresa tu número de contrato CFE, confirma el monto y listo. Recibes confirmación por mensaje. No más filas." },
            ].map(({ n, title, desc }) => (
              <li key={n} style={{ display: "flex", gap: "20px", alignItems: "flex-start" }}>
                <div style={{ minWidth: "40px", height: "40px", borderRadius: "50%", background: "#1D9E75", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 900, fontSize: "18px" }}>{n}</div>
                <div>
                  <h3 style={{ color: "#fff", fontWeight: 700, margin: "0 0 6px", fontSize: "17px" }}>{title}</h3>
                  <p style={{ margin: 0, fontSize: "15px" }}>{desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Why PagoYa vs alternatives */}
        <section style={{ marginBottom: "56px" }}>
          <h2 style={{ color: "#fff", fontWeight: 800, margin: "0 0 20px" }}>
            ¿Por qué PagoYa para pagar CFE sin banco?
          </h2>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
              <thead>
                <tr>
                  <th style={{ padding: "12px 16px", textAlign: "left", background: "rgba(29,158,117,0.15)", color: "#1D9E75", border: "1px solid rgba(255,255,255,0.1)", fontWeight: 700 }}>Método</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", background: "rgba(29,158,117,0.15)", color: "#1D9E75", border: "1px solid rgba(255,255,255,0.1)", fontWeight: 700 }}>¿Necesita banco?</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", background: "rgba(29,158,117,0.15)", color: "#1D9E75", border: "1px solid rgba(255,255,255,0.1)", fontWeight: 700 }}>Comisión</th>
                  <th style={{ padding: "12px 16px", textAlign: "left", background: "rgba(29,158,117,0.15)", color: "#1D9E75", border: "1px solid rgba(255,255,255,0.1)", fontWeight: 700 }}>Filas</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { method: "PagoYa", bank: "❌ No", fee: "$25 MXN", lines: "❌ Sin filas" },
                  { method: "Sucursal CFE", bank: "❌ No", fee: "Gratis", lines: "✅ 30–60 min" },
                  { method: "OXXO Pay", bank: "❌ No", fee: "$10–$15 MXN", lines: "✅ Cola en tienda" },
                  { method: "App bancaria", bank: "✅ Requiere banco", fee: "Variable", lines: "❌ Sin filas" },
                ].map((row, i) => (
                  <tr key={row.method} style={{ background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)" }}>
                    <td style={{ padding: "12px 16px", border: "1px solid rgba(255,255,255,0.08)", color: "#fff", fontWeight: row.method === "PagoYa" ? 700 : 400 }}>{row.method}{row.method === "PagoYa" ? " ✓" : ""}</td>
                    <td style={{ padding: "12px 16px", border: "1px solid rgba(255,255,255,0.08)", color: "#CBD5E1" }}>{row.bank}</td>
                    <td style={{ padding: "12px 16px", border: "1px solid rgba(255,255,255,0.08)", color: "#CBD5E1" }}>{row.fee}</td>
                    <td style={{ padding: "12px 16px", border: "1px solid rgba(255,255,255,0.08)", color: "#CBD5E1" }}>{row.lines}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* FAQ */}
        <section style={{ marginBottom: "56px" }}>
          <h2 style={{ color: "#fff", fontWeight: 800, margin: "0 0 8px" }}>
            Preguntas frecuentes — pagar CFE sin banco
          </h2>
          {[
            {
              q: "¿Cómo puedo pagar CFE sin banco?",
              a: "Con PagoYa: crea tu monedero gratis con solo tu número de teléfono, carga efectivo en cualquier OXXO generando un voucher desde la app, y paga tu recibo de CFE en segundos ingresando tu número de contrato. Sin banco, sin tarjeta, sin fila."
            },
            {
              q: "¿Necesito número de contrato para pagar CFE?",
              a: "Sí. El número de contrato CFE aparece en la parte superior de tu recibo físico (12 dígitos). También lo puedes consultar llamando al 071 (gratis desde cualquier teléfono en México)."
            },
            {
              q: "¿Cuánto cobra PagoYa por pagar CFE?",
              a: "La comisión es de $25 MXN por pago. No hay mensualidad, no hay cargos ocultos. El registro es completamente gratuito."
            },
            {
              q: "¿En cuánto tiempo se refleja el pago en CFE?",
              a: "El pago se confirma en menos de 60 segundos. Recibes una notificación al instante. CFE actualiza sus sistemas normalmente en 1–2 horas hábiles."
            },
            {
              q: "¿Puedo pagar CFE desde WhatsApp con PagoYa?",
              a: "Sí. PagoYa tiene un agente de IA en WhatsApp llamado Paula que procesa tu pago por mensaje. Solo dile el monto, confirma con 'sí', y listo."
            },
          ].map(({ q, a }) => (
            <div key={q} className="py-faq-item">
              <h3 style={{ color: "#fff", fontWeight: 700, margin: "0 0 10px", fontSize: "16px" }}>{q}</h3>
              <p style={{ margin: 0, fontSize: "15px" }}>{a}</p>
            </div>
          ))}
        </section>

        {/* Bottom CTA */}
        <section style={{ background: "linear-gradient(135deg, #0D3D2A 0%, #1D9E75 100%)", borderRadius: "24px", padding: "40px 32px", textAlign: "center" }}>
          <h2 style={{ color: "#fff", fontWeight: 900, margin: "0 0 12px", fontSize: "clamp(22px,4vw,32px)" }}>
            Paga tu CFE sin banco hoy mismo
          </h2>
          <p style={{ color: "rgba(255,255,255,0.8)", margin: "0 0 28px", fontSize: "16px" }}>
            Regístrate gratis en 90 segundos. Sin banco. Sin tarjeta. Sin papeleo.
          </p>
          <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={() => navigate("/register")}
              style={{ background: "#fff", color: "#0A2540", border: "none", borderRadius: "14px", padding: "16px 36px", fontWeight: 900, fontSize: "16px", cursor: "pointer" }}>
              Crear mi monedero gratis →
            </button>
          </div>
          <p style={{ color: "rgba(255,255,255,0.5)", margin: "16px 0 0", fontSize: "13px" }}>
            También puedes pagar por WhatsApp con Paula, nuestro agente de IA.
          </p>
        </section>

        {/* Internal links */}
        <nav style={{ marginTop: "48px", paddingTop: "32px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <p style={{ color: "rgba(255,255,255,0.38)", fontSize: "13px", margin: "0 0 14px", textTransform: "uppercase", letterSpacing: "0.08em" }}>También te puede interesar</p>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            {[
              { label: "Pagar luz sin banco", path: "/pagar-luz-sin-banco" },
              { label: "Pagar Telmex con efectivo", path: "/pagar-telmex-en-linea-efectivo" },
              { label: "Recargar saldo sin tarjeta", path: "/recargar-saldo-sin-tarjeta" },
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

      {/* Footer */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.08)", padding: "24px", textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: "13px" }}>
        © {new Date().getFullYear()} PagoYa · Tu monedero digital, sin banco ·{" "}
        <span style={{ cursor: "pointer", textDecoration: "underline" }} onClick={() => navigate("/terminos-y-condiciones")}>Términos</span>{" · "}
        <span style={{ cursor: "pointer", textDecoration: "underline" }} onClick={() => navigate("/aviso-de-privacidad")}>Privacidad</span>
      </footer>
    </div>
  );
}
