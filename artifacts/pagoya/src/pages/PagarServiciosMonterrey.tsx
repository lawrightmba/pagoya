import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useLocation } from "wouter";

export default function PagarServiciosMonterrey() {
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
      { "@type": "ListItem", "position": 2, "name": "Pagar servicios en Monterrey", "item": "https://pagoyamx.com/pagar-servicios-monterrey" }
    ]
  };

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "Servicios que puedes pagar en Monterrey con PagoYa",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Pagar agua SADM sin banco", "url": "https://pagoyamx.com/pagar-agua-monterrey" },
      { "@type": "ListItem", "position": 2, "name": "Pagar agua SADM en línea", "url": "https://pagoyamx.com/pagar-agua-monterrey-en-linea" },
      { "@type": "ListItem", "position": 3, "name": "Pagar CFE Monterrey", "url": "https://pagoyamx.com/pagar-cfe-monterrey" },
      { "@type": "ListItem", "position": 4, "name": "Pagar gas natural Naturgy Monterrey", "url": "https://pagoyamx.com/pagar-gas-natural-monterrey" }
    ]
  };

  const services = [
    { icon: "💧", title: "Agua SADM sin banco", desc: "Paga tu recibo de agua y drenaje SADM con efectivo en OXXO, sin cuenta bancaria.", to: "/pagar-agua-monterrey" },
    { icon: "💧", title: "Agua SADM en línea", desc: "Paga tu SADM 100% en línea desde tu celular, alternativa al portal sadm.mx.", to: "/pagar-agua-monterrey-en-linea" },
    { icon: "⚡", title: "CFE Monterrey", desc: "Paga tu recibo de luz de la CFE en el área metropolitana desde tu celular.", to: "/pagar-cfe-monterrey" },
    { icon: "🔥", title: "Gas natural Naturgy", desc: "Paga tu recibo de gas natural Naturgy sin banco ni tarjeta.", to: "/pagar-gas-natural-monterrey" },
  ];

  return (
    <div style={{ background: "#0A2540", minHeight: "100vh", display: "flex", flexDirection: "column", overflowX: "hidden" }}>
      <Helmet>
        <html lang="es-MX" />
        <title>Pagar Servicios en Monterrey Sin Banco | Agua, Luz, Gas | PagoYa</title>
        <meta name="description" content="Paga tus servicios en Monterrey y Nuevo León sin banco: agua SADM, luz CFE y gas natural Naturgy desde tu celular. Carga con efectivo en OXXO y paga al instante con PagoYa." />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://pagoyamx.com/pagar-servicios-monterrey" />
        <link rel="alternate" hrefLang="es-MX" href="https://pagoyamx.com/pagar-servicios-monterrey" />
        <link rel="alternate" hrefLang="x-default" href="https://pagoyamx.com/pagar-servicios-monterrey" />
        <meta name="geo.region" content="MX-NL" />
        <meta name="geo.placename" content="Monterrey, Nuevo León" />
        <meta property="og:title" content="Pagar Servicios en Monterrey Sin Banco | Agua, Luz, Gas | PagoYa" />
        <meta property="og:description" content="Paga agua SADM, luz CFE y gas natural Naturgy en Monterrey desde tu celular. Sin banco ni tarjeta. Efectivo en OXXO con PagoYa." />
        <meta property="og:image" content="https://pagoyamx.com/og-default.png" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://pagoyamx.com/pagar-servicios-monterrey" />
        <script type="application/ld+json">{JSON.stringify(breadcrumb)}</script>
        <script type="application/ld+json">{JSON.stringify(itemList)}</script>
      </Helmet>

      <style>{`
        .mty-body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
        .mty-body a { color: #1D9E75; text-decoration: underline; }
        .mty-h1 { font-size: clamp(26px, 5vw, 42px); }
        .mty-h2 { font-size: clamp(20px, 3.5vw, 28px); }
        .mty-ul { list-style: disc; padding-left: 22px; }
        .mty-ul li { margin-bottom: 6px; line-height: 1.6; color: #CBD5E1; }
        @media(max-width:640px){ .mty-body { padding: 0 16px 48px; } }
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
          <p style={{ color: "white", fontWeight: 700, fontSize: "14px", margin: 0 }}>🏙️ Paga tus servicios en Monterrey</p>
          <button onClick={() => navigate("/pagar")} style={{ background: "linear-gradient(135deg, #1D9E75, #25C090)", color: "white", border: "none", borderRadius: "20px", padding: "10px 22px", fontWeight: 800, fontSize: "14px", cursor: "pointer" }}>
            Pagar ahora →
          </button>
        </div>
      )}

      {/* Hero */}
      <section style={{ padding: "56px 24px 40px", maxWidth: "760px", margin: "0 auto", width: "100%" }} className="mty-body">
        <p style={{ color: "#1D9E75", fontWeight: 700, fontSize: "13px", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "12px" }}>
          🏙️ Servicios · Monterrey, Nuevo León
        </p>
        <h1 className="mty-h1" style={{ color: "white", fontWeight: 900, lineHeight: 1.2, marginBottom: "20px" }}>
          Pagar servicios en Monterrey<br />
          <span style={{ color: "#1D9E75" }}>sin banco, sin filas, sin tarjeta</span>
        </h1>
        <p style={{ color: "#94A3B8", fontSize: "18px", lineHeight: 1.7, marginBottom: "32px", maxWidth: "600px" }}>
          Paga tus servicios en Monterrey y todo Nuevo León desde tu celular: <strong style={{ color: "white" }}>agua SADM, luz CFE y gas natural Naturgy</strong>. Carga saldo con efectivo en cualquier OXXO y paga al instante. No necesitas cuenta bancaria ni tarjeta.
        </p>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <button
            onClick={() => navigate("/pagar")}
            style={{ background: "linear-gradient(135deg, #1D9E75, #25C090)", color: "white", border: "none", borderRadius: "50px", padding: "16px 32px", fontWeight: 800, fontSize: "16px", cursor: "pointer", boxShadow: "0 8px 24px rgba(29,158,117,0.4)" }}
          >
            Pagar ahora →
          </button>
          <button
            onClick={() => navigate("/cargar")}
            style={{ background: "rgba(255,255,255,0.08)", color: "white", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "50px", padding: "16px 28px", fontWeight: 700, fontSize: "15px", cursor: "pointer" }}
          >
            Cargar saldo primero
          </button>
        </div>
      </section>

      {/* Service card grid */}
      <section style={{ padding: "0 24px 48px", maxWidth: "760px", margin: "0 auto", width: "100%" }} className="mty-body">
        <h2 className="mty-h2" style={{ color: "white", fontWeight: 800, marginBottom: "24px" }}>
          Servicios que puedes pagar en Monterrey
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "24px" }}>
          {services.map(s => (
            <button
              key={s.to}
              onClick={() => navigate(s.to)}
              style={{ textAlign: "left", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "18px", padding: "22px 20px", cursor: "pointer" }}
            >
              <p style={{ fontSize: "28px", marginBottom: "10px" }}>{s.icon}</p>
              <p style={{ color: "white", fontWeight: 800, fontSize: "17px", marginBottom: "6px" }}>{s.title}</p>
              <p style={{ color: "#94A3B8", fontSize: "14px", lineHeight: 1.5, marginBottom: "12px" }}>{s.desc}</p>
              <span style={{ color: "#1D9E75", fontWeight: 700, fontSize: "14px" }}>Ver cómo pagar →</span>
            </button>
          ))}
        </div>
      </section>

      {/* Why PagoYa in Monterrey */}
      <section style={{ padding: "0 24px 48px", maxWidth: "760px", margin: "0 auto", width: "100%" }} className="mty-body">
        <h2 className="mty-h2" style={{ color: "white", fontWeight: 800, marginBottom: "20px" }}>
          Por qué pagar tus servicios de Monterrey con PagoYa
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", marginBottom: "24px" }}>
          {[
            { icon: "⚡", title: "2 minutos", desc: "de principio a fin" },
            { icon: "🏪", title: "+19,000 OXXO", desc: "en Nuevo León y todo México" },
            { icon: "📱", title: "Sin banco", desc: "ni tarjeta requerida" },
            { icon: "💵", title: "$25 MXN", desc: "tarifa fija por transacción" },
          ].map(f => (
            <div key={f.title} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "16px", padding: "18px 16px" }}>
              <p style={{ fontSize: "24px", marginBottom: "6px" }}>{f.icon}</p>
              <p style={{ color: "white", fontWeight: 800, fontSize: "15px", marginBottom: "2px" }}>{f.title}</p>
              <p style={{ color: "#94A3B8", fontSize: "13px" }}>{f.desc}</p>
            </div>
          ))}
        </div>
        <p style={{ color: "#94A3B8", fontSize: "15px", lineHeight: 1.7 }}>
          Recarga tu billetera con efectivo en cualquier OXXO, elige tu servicio y paga al instante. El pago se procesa en segundos y el proveedor registra el pago en 24–48 horas hábiles.
        </p>
      </section>

      {/* Final CTA */}
      <section style={{ padding: "0 24px 64px", maxWidth: "760px", margin: "0 auto", width: "100%", textAlign: "center" }} className="mty-body">
        <div style={{ background: "linear-gradient(135deg, rgba(29,158,117,0.15), rgba(29,158,117,0.05))", border: "1px solid rgba(29,158,117,0.3)", borderRadius: "24px", padding: "40px 24px" }}>
          <p style={{ fontSize: "32px", marginBottom: "12px" }}>🏙️</p>
          <h2 style={{ color: "white", fontWeight: 900, fontSize: "22px", marginBottom: "10px" }}>
            Paga tus servicios de Monterrey ahora
          </h2>
          <p style={{ color: "#94A3B8", fontSize: "15px", marginBottom: "28px", lineHeight: 1.6 }}>
            Agua, luz y gas sin banco, sin tarjeta, sin filas.<br />Solo tu celular y efectivo en OXXO.
          </p>
          <button
            onClick={() => navigate("/pagar")}
            style={{ background: "linear-gradient(135deg, #1D9E75, #25C090)", color: "white", border: "none", borderRadius: "50px", padding: "16px 36px", fontWeight: 800, fontSize: "16px", cursor: "pointer", boxShadow: "0 8px 24px rgba(29,158,117,0.4)" }}
          >
            Pagar ahora →
          </button>
        </div>
      </section>
    </div>
  );
}
