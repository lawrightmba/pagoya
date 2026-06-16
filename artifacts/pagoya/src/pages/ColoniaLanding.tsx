import { useLocation } from "wouter";
import { Helmet } from "react-helmet-async";

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

export interface ColoniaConfig {
  colonia: string;
  slug: string;
  description: string;
  nearbyColonias?: string[];
}

const SERVICES = [
  { emoji: "⚡", name: "CFE (Luz)",       path: "/pagar-cfe",               label: "Pagar CFE" },
  { emoji: "💧", name: "Agua de Jalisco", path: "/pagar-agua-vallarta",      label: "Pagar Agua" },
  { emoji: "📞", name: "Telmex",          path: "/pagar-telmex-vallarta",    label: "Pagar Telmex" },
  { emoji: "📺", name: "Izzi",            path: "/pagar-izzi-vallarta",      label: "Pagar Izzi" },
  { emoji: "📱", name: "Telcel",          path: "/pagar-telcel-vallarta",    label: "Recargar Telcel" },
  { emoji: "🌐", name: "TotalPlay",       path: "/pagar-totalplay-vallarta", label: "Pagar TotalPlay" },
];

export default function ColoniaLanding({ colonia, slug, description, nearbyColonias = [] }: ColoniaConfig) {
  const [, navigate] = useLocation();

  const title = `Pagar servicios en ${colonia}, Puerto Vallarta | PagoYa`;
  const metaDesc = `Paga CFE, agua, Telmex, Izzi, Telcel y más desde tu celular en ${colonia}, Puerto Vallarta. Sin banco, sin filas. $25 MXN por pago.`;

  const faqs = [
    { q: `¿Puedo pagar mis servicios en ${colonia} sin ir al banco?`, a: `Sí. PagoYa te permite pagar CFE, agua, Telmex, Izzi, Telcel, TotalPlay y más desde tu celular en ${colonia}. Sin cuenta bancaria, sin filas.` },
    { q: "¿Cuánto cuesta pagar con PagoYa?", a: "La comisión es de $25 MXN por pago. Sin mensualidad ni cargos ocultos. El registro es completamente gratuito." },
    { q: "¿Cómo cargo mi monedero PagoYa?", a: "Deposita efectivo en cualquier OXXO con el número de referencia que te damos, o haz una transferencia SPEI desde cualquier banco. No necesitas tarjeta." },
    { q: "¿Recibo comprobante de pago?", a: "Sí. Cada pago genera un folio único verificable, inmediatamente visible en pantalla. Es tu comprobante oficial ante CFE, SIAPA, Telmex o cualquier empresa." },
  ];

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(160deg, #003d26 0%, #005432 40%, #006b42 100%)",
      padding: "0 0 60px",
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={metaDesc} />
        <meta name="keywords" content={`pagar servicios ${colonia}, pagar CFE ${colonia}, pagar agua ${colonia}, pagar Telmex ${colonia}, ${colonia} Puerto Vallarta pagos`} />
        <link rel="canonical" href={`https://pagoyamx.com/${slug}`} />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "mainEntity": faqs.map(f => ({
            "@type": "Question",
            "name": f.q,
            "acceptedAnswer": { "@type": "Answer", "text": f.a }
          }))
        })}</script>
      </Helmet>

      {/* Hero */}
      <div style={{ maxWidth: 600, margin: "0 auto", padding: "56px 20px 32px", textAlign: "center" }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: "#00C875", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>
          Puerto Vallarta · {colonia}
        </p>
        <h1 style={{ fontSize: "clamp(26px,6vw,38px)", fontWeight: 900, color: "#fff", lineHeight: 1.15, margin: "0 0 14px", letterSpacing: "-0.02em" }}>
          Paga tus servicios en<br />{colonia}
        </h1>
        <p style={{ fontSize: 16, color: "rgba(255,255,255,0.75)", lineHeight: 1.6, margin: "0 0 28px", maxWidth: 460, marginLeft: "auto", marginRight: "auto" }}>
          {description}
        </p>
        <button
          onClick={() => navigate(`${BASE_URL}/register`)}
          style={{
            background: "#00C875", color: "#003d26", border: "none",
            borderRadius: 999, padding: "14px 36px", fontSize: 16,
            fontWeight: 800, cursor: "pointer", boxShadow: "0 6px 24px rgba(0,200,117,0.35)",
          }}
        >
          Crear cuenta gratis + $150 MXN →
        </button>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 10 }}>
          Bono de bienvenida · $25 MXN por pago · Sin banco
        </p>
      </div>

      {/* Service grid */}
      <div style={{ maxWidth: 600, margin: "0 auto", padding: "0 20px 40px" }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: "#fff", marginBottom: 16, textAlign: "center" }}>
          Servicios disponibles en {colonia}
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {SERVICES.map(s => (
            <button
              key={s.path}
              onClick={() => navigate(`${BASE_URL}${s.path}`)}
              style={{
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 14,
                padding: "16px 14px",
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                gap: 6,
                cursor: "pointer",
                textAlign: "left",
                transition: "background 0.15s",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,200,117,0.12)")}
              onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.07)")}
            >
              <span style={{ fontSize: 24 }}>{s.emoji}</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{s.name}</span>
              <span style={{ fontSize: 12, color: "#00C875", fontWeight: 600 }}>{s.label} →</span>
            </button>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div style={{ maxWidth: 600, margin: "0 auto", padding: "0 20px 40px" }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: "#fff", marginBottom: 16, textAlign: "center" }}>
          Cómo funciona
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[
            { n: "1", t: "Abre PagoYa gratis", d: "Ingresa tu número. Sin banco, sin tarjeta. Listo en 90 segundos." },
            { n: "2", t: "Carga tu monedero", d: "Efectivo en OXXO o transferencia SPEI. Recibe $150 MXN de bienvenida." },
            { n: "3", t: "Elige tu servicio", d: "CFE, agua, Telmex, Izzi, Telcel, TotalPlay y más de 30 empresas." },
            { n: "4", t: "Folio al instante", d: "Comprobante con folio único en pantalla. Sin filas, sin sucursal." },
          ].map(s => (
            <div key={s.n} style={{ background: "rgba(255,255,255,0.07)", borderRadius: 12, padding: "14px 16px", display: "flex", gap: 14, alignItems: "flex-start" }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#00C875", color: "#003d26", fontWeight: 900, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{s.n}</div>
              <div>
                <p style={{ margin: 0, fontWeight: 700, color: "#fff", fontSize: 14 }}>{s.t}</p>
                <p style={{ margin: "3px 0 0", color: "rgba(255,255,255,0.6)", fontSize: 13, lineHeight: 1.45 }}>{s.d}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Nearby colonias */}
      {nearbyColonias.length > 0 && (
        <div style={{ maxWidth: 600, margin: "0 auto", padding: "0 20px 40px" }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: "rgba(255,255,255,0.6)", marginBottom: 12, textAlign: "center" }}>
            También disponible en colonias cercanas
          </h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
            {nearbyColonias.map(c => (
              <span key={c} style={{ background: "rgba(255,255,255,0.07)", borderRadius: 999, padding: "5px 14px", fontSize: 12, color: "rgba(255,255,255,0.65)", fontWeight: 600 }}>{c}</span>
            ))}
          </div>
        </div>
      )}

      {/* FAQ */}
      <div style={{ maxWidth: 600, margin: "0 auto", padding: "0 20px 40px" }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: "#fff", marginBottom: 16, textAlign: "center" }}>Preguntas frecuentes</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {faqs.map((f, i) => (
            <div key={i} style={{ background: "rgba(255,255,255,0.07)", borderRadius: 12, padding: "13px 15px" }}>
              <p style={{ margin: "0 0 5px", fontWeight: 700, color: "#fff", fontSize: 13 }}>{f.q}</p>
              <p style={{ margin: 0, color: "rgba(255,255,255,0.62)", fontSize: 12.5, lineHeight: 1.5 }}>{f.a}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom CTA */}
      <div style={{ textAlign: "center", padding: "0 20px" }}>
        <button
          onClick={() => navigate(`${BASE_URL}/register`)}
          style={{ background: "#00C875", color: "#003d26", border: "none", borderRadius: 999, padding: "14px 36px", fontSize: 16, fontWeight: 800, cursor: "pointer" }}
        >
          Crear cuenta gratis + $150 MXN →
        </button>
      </div>
    </div>
  );
}
