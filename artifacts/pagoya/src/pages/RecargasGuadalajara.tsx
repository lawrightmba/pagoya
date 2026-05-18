import { Helmet } from "react-helmet-async";
import { useLocation } from "wouter";

export default function RecargasGuadalajara() {
  const [, navigate] = useLocation();

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Inicio", "item": "https://pagoyamx.com/" },
      { "@type": "ListItem", "position": 2, "name": "Guadalajara", "item": "https://pagoyamx.com/pagar-servicios-guadalajara" },
      { "@type": "ListItem", "position": 3, "name": "Recargas Guadalajara", "item": "https://pagoyamx.com/recargas-guadalajara" }
    ]
  };

  const faq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "¿Cómo recargar Telcel en Guadalajara sin tarjeta?",
        "acceptedAnswer": { "@type": "Answer", "text": "Con PagoYa: carga tu billetera con efectivo en cualquier OXXO de Guadalajara, selecciona 'Recargas' en la app, elige Telcel, ingresa tu número y confirma. La recarga llega en segundos." }
      },
      {
        "@type": "Question",
        "name": "¿Cuánto tarda en llegar la recarga en Guadalajara?",
        "acceptedAnswer": { "@type": "Answer", "text": "La recarga se acredita en menos de 60 segundos en la mayoría de los casos. Algunos operadores pueden tardar hasta 5 minutos en periodos de alta demanda." }
      },
      {
        "@type": "Question",
        "name": "¿Puedo recargar AT&T en Guadalajara con efectivo?",
        "acceptedAnswer": { "@type": "Answer", "text": "Sí. PagoYa soporta recargas para Telcel, AT&T, Movistar y otros operadores. Solo necesitas cargar tu billetera en OXXO y seleccionar tu operador en la app." }
      }
    ]
  };

  const planes = [
    { op: "Telcel", montos: ["$50", "$100", "$150", "$200", "$300", "$500"], color: "#1D9E75" },
    { op: "AT&T", montos: ["$50", "$100", "$200", "$300", "$400"], color: "#60A5FA" },
    { op: "Movistar", montos: ["$50", "$100", "$150", "$200"], color: "#A78BFA" },
  ];

  return (
    <div style={{ background: "#0A2540", minHeight: "100vh", display: "flex", flexDirection: "column", overflowX: "hidden" }}>
      <Helmet>
        <html lang="es" />
        <title>Recargas Telcel, AT&T y Movistar en Guadalajara | PagoYa</title>
        <meta name="description" content="Recarga tu celular Telcel, AT&T o Movistar en Guadalajara al instante. Sin tarjeta, sin cuenta bancaria. Carga tu billetera con efectivo en OXXO y recarga en segundos." />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://pagoyamx.com/recargas-guadalajara" />
        <meta property="og:title" content="Recargas Telcel, AT&T y Movistar en Guadalajara | PagoYa" />
        <meta property="og:description" content="Recarga tu celular en Guadalajara sin tarjeta ni banco. Carga en OXXO y recarga en segundos desde la app." />
        <meta property="og:type" content="article" />
        <meta property="og:url" content="https://pagoyamx.com/recargas-guadalajara" />
        <script type="application/ld+json">{JSON.stringify(breadcrumb)}</script>
        <script type="application/ld+json">{JSON.stringify(faq)}</script>
      </Helmet>

      <style>{`
        .recgdl-body a { color: #1D9E75; text-decoration: underline; }
        .recgdl-h1 { font-size: clamp(26px, 5vw, 42px); }
        .recgdl-h2 { font-size: clamp(20px, 3.5vw, 28px); }
        .recgdl-ul { list-style: disc; padding-left: 22px; }
        .recgdl-ul li { margin-bottom: 6px; line-height: 1.6; color: #CBD5E1; }
        .recgdl-ol { padding-left: 20px; }
        .recgdl-ol li { margin-bottom: 10px; line-height: 1.6; color: #CBD5E1; }
      `}</style>

      <header style={{ background: "#0A2540", padding: "10px 20px", display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <span />
        <div style={{ display: "flex", justifyContent: "center", cursor: "pointer" }} onClick={() => navigate("/")}>
          <img src="/pagoya-logo.png" alt="PagoYa" style={{ height: "44px", width: "auto", maxWidth: "180px", objectFit: "contain" }}
            onError={(e) => { e.currentTarget.style.display = "none"; }} />
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button onClick={() => navigate("/")} style={{ background: "#1D9E75", color: "#fff", border: "none", borderRadius: "8px", padding: "8px 16px", fontWeight: 700, cursor: "pointer", fontSize: "14px" }}>
            Recargar ahora
          </button>
        </div>
      </header>

      <main className="recgdl-body" style={{ flex: 1, maxWidth: "780px", margin: "0 auto", width: "100%", padding: "32px 24px 64px" }}>
        <nav style={{ marginBottom: "20px", fontSize: "13px", color: "#64748B" }}>
          <a href="/" style={{ color: "#1D9E75", textDecoration: "none" }}>Inicio</a>
          {" › "}
          <a href="/pagar-servicios-guadalajara" style={{ color: "#1D9E75", textDecoration: "none" }}>Guadalajara</a>
          {" › "}
          <span>Recargas</span>
        </nav>

        <h1 className="recgdl-h1" style={{ color: "#fff", fontWeight: 800, lineHeight: 1.15, marginBottom: "16px" }}>
          Recargas en Guadalajara<br />
          <span style={{ color: "#1D9E75" }}>sin tarjeta ni banco</span>
        </h1>

        <p style={{ color: "#94A3B8", fontSize: "17px", lineHeight: 1.7, marginBottom: "28px" }}>
          Recarga tu celular Telcel, AT&T o Movistar desde cualquier punto de Guadalajara en segundos. Carga tu billetera PagoYa con efectivo en uno de los 800+ OXXO de la zona metropolitana y recarga sin salir de la app.
        </p>

        <div style={{ background: "rgba(29,158,117,0.1)", border: "1px solid rgba(29,158,117,0.3)", borderRadius: "12px", padding: "20px 24px", marginBottom: "32px" }}>
          <div style={{ display: "flex", gap: "28px", flexWrap: "wrap" }}>
            {[["📱", "Telcel, AT&T, Movistar", "Operadores disponibles"], ["⏱", "<60 seg", "Tiempo de acreditación"], ["💵", "$25 MXN", "Comisión por recarga"], ["🏪", "800+", "OXXO en el ZMG"]].map(([icon, val, label]) => (
              <div key={label} style={{ textAlign: "center", minWidth: "90px" }}>
                <div style={{ fontSize: "20px", marginBottom: "4px" }}>{icon}</div>
                <div style={{ color: "#1D9E75", fontWeight: 800, fontSize: "15px" }}>{val}</div>
                <div style={{ color: "#64748B", fontSize: "11px", marginTop: "2px" }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        <h2 className="recgdl-h2" style={{ color: "#fff", fontWeight: 700, marginBottom: "16px" }}>Montos de recarga disponibles en Guadalajara</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "32px" }}>
          {planes.map(p => (
            <div key={p.op} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "12px", padding: "16px 20px" }}>
              <div style={{ color: p.color, fontWeight: 700, fontSize: "16px", marginBottom: "12px" }}>{p.op}</div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {p.montos.map(m => (
                  <span key={m} style={{ background: "rgba(255,255,255,0.06)", borderRadius: "6px", padding: "4px 12px", color: "#e2e8f0", fontSize: "14px", fontWeight: 600 }}>{m}</span>
                ))}
              </div>
            </div>
          ))}
        </div>

        <h2 className="recgdl-h2" style={{ color: "#fff", fontWeight: 700, marginBottom: "16px" }}>Cómo recargar en Guadalajara paso a paso</h2>
        <ol className="recgdl-ol" style={{ marginBottom: "32px" }}>
          <li><strong style={{ color: "#e2e8f0" }}>Ve a un OXXO en Guadalajara.</strong> Hay más de 800 en Guadalajara, Zapopan, Tlaquepaque, Tonalá y Tlajomulco. Pide una recarga de saldo para PagoYa.</li>
          <li><strong style={{ color: "#e2e8f0" }}>Abre PagoYa y selecciona Recargas.</strong> Elige tu operador: Telcel, AT&T o Movistar.</li>
          <li><strong style={{ color: "#e2e8f0" }}>Ingresa el número a recargar.</strong> Puede ser tu propio número o el de otra persona.</li>
          <li><strong style={{ color: "#e2e8f0" }}>Elige el monto y confirma.</strong> La recarga llega en menos de 60 segundos.</li>
        </ol>

        <h2 className="recgdl-h2" style={{ color: "#fff", fontWeight: 700, marginBottom: "16px" }}>Preguntas frecuentes — Recargas Guadalajara</h2>
        {[
          ["¿Cómo recargar Telcel en Guadalajara sin tarjeta?", "Carga tu billetera con efectivo en cualquier OXXO de Guadalajara, selecciona 'Recargas' en la app, elige Telcel, ingresa tu número y confirma. La recarga llega en segundos."],
          ["¿Cuánto tarda en llegar la recarga?", "Menos de 60 segundos en la mayoría de los casos. Máximo 5 minutos en periodos de alta demanda."],
          ["¿Puedo recargar el celular de otra persona?", "Sí. Ingresa cualquier número de celular mexicano, no tiene que ser el tuyo."],
        ].map(([q, a]) => (
          <div key={q} style={{ marginBottom: "16px", background: "rgba(255,255,255,0.03)", borderRadius: "10px", padding: "16px 20px", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div style={{ color: "#e2e8f0", fontWeight: 700, marginBottom: "8px", fontSize: "15px" }}>{q}</div>
            <div style={{ color: "#94A3B8", lineHeight: 1.7, fontSize: "14px" }}>{a}</div>
          </div>
        ))}

        <div style={{ marginTop: "40px", background: "rgba(29,158,117,0.12)", border: "1px solid rgba(29,158,117,0.3)", borderRadius: "14px", padding: "28px 24px", textAlign: "center" }}>
          <div style={{ color: "#fff", fontSize: "22px", fontWeight: 800, marginBottom: "8px" }}>Recarga ahora desde Guadalajara</div>
          <div style={{ color: "#94A3B8", marginBottom: "20px" }}>Telcel · AT&T · Movistar — en segundos</div>
          <button onClick={() => navigate("/")} style={{ background: "#1D9E75", color: "#fff", border: "none", borderRadius: "10px", padding: "14px 36px", fontSize: "16px", fontWeight: 700, cursor: "pointer" }}>
            Ir a PagoYa →
          </button>
        </div>

        <div style={{ marginTop: "32px", paddingTop: "24px", borderTop: "1px solid rgba(255,255,255,0.08)", fontSize: "13px", color: "#475569" }}>
          <strong style={{ color: "#64748B" }}>También te puede interesar: </strong>
          <a href="/recargas">Recargas México</a> · <a href="/pagar-cfe-guadalajara">CFE Guadalajara</a> · <a href="/pagar-servicios-guadalajara">Todos los servicios GDL</a>
        </div>
      </main>
    </div>
  );
}
