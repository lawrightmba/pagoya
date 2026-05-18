import { Helmet } from "react-helmet-async";
import { useLocation } from "wouter";

export default function PagarServiciosGuadalajara() {
  const [, navigate] = useLocation();

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Inicio", "item": "https://pagoyamx.com/" },
      { "@type": "ListItem", "position": 2, "name": "Pagar Servicios Guadalajara", "item": "https://pagoyamx.com/pagar-servicios-guadalajara" }
    ]
  };

  const localBusiness = {
    "@context": "https://schema.org",
    "@type": "FinancialService",
    "name": "PagoYa Guadalajara",
    "url": "https://pagoyamx.com/pagar-servicios-guadalajara",
    "description": "Plataforma de pago de servicios en Guadalajara. Paga CFE, Telmex, agua SIAPA y recargas sin cuenta bancaria.",
    "areaServed": [
      { "@type": "City", "name": "Guadalajara" },
      { "@type": "City", "name": "Zapopan" },
      { "@type": "City", "name": "Tlaquepaque" },
      { "@type": "City", "name": "Tonalá" },
      { "@type": "City", "name": "Tlajomulco de Zúñiga" }
    ],
    "address": { "@type": "PostalAddress", "addressCountry": "MX", "addressRegion": "Jalisco" }
  };

  const services = [
    { icon: "⚡", name: "CFE Guadalajara", desc: "Paga tu recibo de luz CFE para el área metropolitana de Guadalajara.", link: "/pagar-cfe-guadalajara", cta: "Pagar CFE GDL" },
    { icon: "🌐", name: "Telmex / Izzi / Totalplay", desc: "Internet y telefonía fija en Guadalajara — Telmex, Izzi, Totalplay, Megacable.", link: "/pagar-telmex", cta: "Pagar internet" },
    { icon: "📱", name: "Recargas Telcel / AT&T", desc: "Recarga tu celular Telcel o AT&T al instante desde Guadalajara.", link: "/recargas-guadalajara", cta: "Recargar celular" },
    { icon: "💧", name: "Agua SIAPA", desc: "Pago del servicio de agua potable SIAPA para municipios de Guadalajara.", link: "/", cta: "Pagar agua" },
    { icon: "🏠", name: "Predial Jalisco", desc: "Pago de impuesto predial para Guadalajara, Zapopan y municipios del ZMG.", link: "/", cta: "Pagar predial" },
    { icon: "💳", name: "Cargar billetera en OXXO", desc: "Deposita efectivo en cualquiera de los 800+ OXXO del ZMG.", link: "/deposito-oxxo", cta: "Cómo recargar" },
  ];

  return (
    <div style={{ background: "#0A2540", minHeight: "100vh", display: "flex", flexDirection: "column", overflowX: "hidden" }}>
      <Helmet>
        <html lang="es" />
        <title>Pagar Servicios en Guadalajara Sin Banco | PagoYa</title>
        <meta name="description" content="Paga CFE, Telmex, agua SIAPA, recargas y más de 26 servicios en Guadalajara sin cuenta bancaria ni tarjeta. Solo necesitas tu celular y efectivo en OXXO." />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://pagoyamx.com/pagar-servicios-guadalajara" />
        <meta property="og:title" content="Pagar Servicios en Guadalajara Sin Banco | PagoYa" />
        <meta property="og:description" content="Paga CFE, Telmex, agua SIAPA, recargas y más en Guadalajara sin cuenta bancaria. Solo tu celular y efectivo en OXXO." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://pagoyamx.com/pagar-servicios-guadalajara" />
        <script type="application/ld+json">{JSON.stringify(breadcrumb)}</script>
        <script type="application/ld+json">{JSON.stringify(localBusiness)}</script>
      </Helmet>

      <style>{`
        .gdlsvc-body a { color: #1D9E75; text-decoration: underline; }
        .gdlsvc-h1 { font-size: clamp(28px, 5vw, 44px); }
        .gdlsvc-h2 { font-size: clamp(20px, 3.5vw, 28px); }
        .svc-card:hover { border-color: rgba(29,158,117,0.5) !important; background: rgba(29,158,117,0.06) !important; }
      `}</style>

      <header style={{ background: "#0A2540", padding: "10px 20px", display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <span />
        <div style={{ display: "flex", justifyContent: "center", cursor: "pointer" }} onClick={() => navigate("/")}>
          <img src="/pagoya-logo.png" alt="PagoYa" style={{ height: "44px", width: "auto", maxWidth: "180px", objectFit: "contain" }}
            onError={(e) => { e.currentTarget.style.display = "none"; }} />
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button onClick={() => navigate("/")} style={{ background: "#1D9E75", color: "#fff", border: "none", borderRadius: "8px", padding: "8px 16px", fontWeight: 700, cursor: "pointer", fontSize: "14px" }}>
            Pagar ahora
          </button>
        </div>
      </header>

      <main className="gdlsvc-body" style={{ flex: 1, maxWidth: "860px", margin: "0 auto", width: "100%", padding: "32px 24px 64px" }}>
        <nav style={{ marginBottom: "20px", fontSize: "13px", color: "#64748B" }}>
          <a href="/" style={{ color: "#1D9E75", textDecoration: "none" }}>Inicio</a>
          {" › "}
          <span>Guadalajara</span>
        </nav>

        <h1 className="gdlsvc-h1" style={{ color: "#fff", fontWeight: 800, lineHeight: 1.15, marginBottom: "16px" }}>
          Pagar servicios en Guadalajara<br />
          <span style={{ color: "#1D9E75" }}>sin banco ni tarjeta</span>
        </h1>

        <p style={{ color: "#94A3B8", fontSize: "17px", lineHeight: 1.7, marginBottom: "36px" }}>
          Guadalajara y su zona metropolitana concentran más de 5 millones de personas. PagoYa te permite pagar todos tus servicios — CFE, Telmex, agua SIAPA, recargas, predial y más — desde tu celular, cargando con efectivo en cualquiera de los más de 800 OXXO del ZMG.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "16px", marginBottom: "40px" }}>
          {services.map(s => (
            <div key={s.name} className="svc-card" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "14px", padding: "20px", cursor: "pointer", transition: "all 0.2s" }}
              onClick={() => navigate(s.link)}>
              <div style={{ fontSize: "28px", marginBottom: "10px" }}>{s.icon}</div>
              <div style={{ color: "#fff", fontWeight: 700, fontSize: "16px", marginBottom: "6px" }}>{s.name}</div>
              <div style={{ color: "#64748B", fontSize: "13px", lineHeight: 1.6, marginBottom: "14px" }}>{s.desc}</div>
              <div style={{ color: "#1D9E75", fontSize: "13px", fontWeight: 600 }}>{s.cta} →</div>
            </div>
          ))}
        </div>

        <h2 className="gdlsvc-h2" style={{ color: "#fff", fontWeight: 700, marginBottom: "16px" }}>¿Por qué PagoYa en Guadalajara?</h2>
        <p style={{ color: "#94A3B8", lineHeight: 1.7, marginBottom: "16px" }}>
          El 42% de los adultos en Jalisco no tienen cuenta bancaria. Para millones de tapatíos, pagar servicios significa tomar el camión, hacer fila y pagar en efectivo. PagoYa elimina ese viaje: tu celular es la oficina de pagos.
        </p>
        <ul style={{ listStyle: "disc", paddingLeft: "22px", marginBottom: "32px" }}>
          {[
            "Más de 800 puntos OXXO para cargar efectivo en el ZMG",
            "Pago confirmado en menos de 2 minutos",
            "Comisión fija de $25 MXN por transacción — sin sorpresas",
            "Disponible 24/7 — paga aunque sean las 11pm",
            "Soporte vía WhatsApp y chat en la app",
          ].map(i => <li key={i} style={{ color: "#CBD5E1", marginBottom: "8px", lineHeight: 1.6 }}>{i}</li>)}
        </ul>

        <div style={{ marginTop: "24px", background: "rgba(29,158,117,0.12)", border: "1px solid rgba(29,158,117,0.3)", borderRadius: "14px", padding: "28px 24px", textAlign: "center" }}>
          <div style={{ color: "#fff", fontSize: "22px", fontWeight: 800, marginBottom: "8px" }}>Empieza a pagar en Guadalajara</div>
          <div style={{ color: "#94A3B8", marginBottom: "20px" }}>Sin banco. Sin fila. En 2 minutos.</div>
          <button onClick={() => navigate("/")} style={{ background: "#1D9E75", color: "#fff", border: "none", borderRadius: "10px", padding: "14px 36px", fontSize: "16px", fontWeight: 700, cursor: "pointer" }}>
            Abrir PagoYa →
          </button>
        </div>

        <div style={{ marginTop: "32px", paddingTop: "24px", borderTop: "1px solid rgba(255,255,255,0.08)", fontSize: "13px", color: "#475569" }}>
          <strong style={{ color: "#64748B" }}>Páginas relacionadas: </strong>
          <a href="/pagar-cfe-guadalajara">CFE Guadalajara</a> · <a href="/recargas-guadalajara">Recargas Guadalajara</a> · <a href="/pagar-cfe">CFE México</a> · <a href="/guia-pagar-servicios-sin-cuenta-bancaria">Guía completa</a>
        </div>
      </main>
    </div>
  );
}
