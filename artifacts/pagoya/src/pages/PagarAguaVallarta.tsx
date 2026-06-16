import { useLocation } from "wouter";
import { Helmet } from "react-helmet-async";
import BillCalculator from "@/components/BillCalculator";

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

export default function PagarAguaVallarta() {
  const [, navigate] = useLocation();

  const steps = [
    { n: "1", title: "Abre PagoYa gratis", desc: "Ingresa tu número de teléfono. Sin banco, sin tarjeta, sin CURP. Listo en 90 segundos." },
    { n: "2", title: "Carga tu monedero", desc: "Deposita efectivo en cualquier OXXO o haz una transferencia SPEI desde cualquier banco." },
    { n: "3", title: "Selecciona Agua de Jalisco", desc: "Elige tu servicio, ingresa tu número de cuenta o contrato y confirma el monto." },
    { n: "4", title: "Pago listo al instante", desc: "Recibe tu comprobante digital con folio único. SIAPA/SEAPAL lo registra en minutos." },
  ];

  const faqs = [
    { q: "¿Funciona para SIAPA y SEAPAL en Puerto Vallarta?", a: "Sí. PagoYa procesa pagos de agua para los sistemas municipales de Puerto Vallarta y la zona metropolitana de Jalisco, incluyendo colonias como Emiliano Zapata, Versalles, Pitillal y Fluvial Vallarta." },
    { q: "¿Cuánto cuesta pagar el agua con PagoYa?", a: "La comisión es de $25 MXN por pago. Sin mensualidad, sin cargos ocultos. El registro es completamente gratuito." },
    { q: "¿Necesito tener cuenta de banco?", a: "No. Puedes cargar tu monedero PagoYa con efectivo en OXXO. No se requiere cuenta bancaria ni tarjeta de crédito." },
    { q: "¿En cuánto tiempo se refleja el pago?", a: "El sistema de agua recibe la notificación en minutos. En casos excepcionales puede tardar hasta 24 horas hábiles." },
    { q: "¿Tengo comprobante de pago?", a: "Sí. Cada pago genera un folio único verificable. Es tu evidencia oficial ante SIAPA o SEAPAL en caso de cualquier aclaración." },
  ];

  const wrap: React.CSSProperties = {
    minHeight: "100vh",
    background: "linear-gradient(160deg, #003d26 0%, #005432 40%, #006b42 100%)",
    padding: "0 0 60px",
    fontFamily: "'Inter', system-ui, sans-serif",
  };

  return (
    <div style={wrap}>
      <Helmet>
        <title>Pagar Agua en Puerto Vallarta sin ir al banco | PagoYa</title>
        <meta name="description" content="Paga tu recibo de agua de Jalisco (SIAPA / SEAPAL) desde tu celular en Puerto Vallarta. Sin cuenta bancaria. Comisión $25 MXN. Comprobante con folio al instante." />
        <meta name="keywords" content="pagar agua Puerto Vallarta, SIAPA Puerto Vallarta, SEAPAL Jalisco, pagar agua sin banco, agua de Jalisco pago en línea" />
        <link rel="canonical" href="https://pagoyamx.com/pagar-agua-vallarta" />
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
      <div style={{ maxWidth: 600, margin: "0 auto", padding: "56px 20px 40px", textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>💧</div>
        <h1 style={{ fontSize: "clamp(26px,6vw,38px)", fontWeight: 900, color: "#fff", lineHeight: 1.15, margin: "0 0 14px", letterSpacing: "-0.02em" }}>
          Pago de Agua en Puerto Vallarta
        </h1>
        <p style={{ fontSize: 16, color: "rgba(255,255,255,0.78)", lineHeight: 1.6, margin: "0 0 28px", maxWidth: 480, marginLeft: "auto", marginRight: "auto" }}>
          SIAPA · SEAPAL · Agua de Jalisco — desde tu celular, sin ir a ninguna oficina.
          Colonias Emiliano Zapata, Versalles, Pitillal, Fluvial Vallarta y toda la zona metropolitana.
        </p>
        <button
          onClick={() => navigate(`${BASE_URL}/register`)}
          style={{
            background: "#00C875", color: "#003d26", border: "none",
            borderRadius: 999, padding: "14px 36px", fontSize: 16,
            fontWeight: 800, cursor: "pointer", boxShadow: "0 6px 24px rgba(0,200,117,0.35)",
          }}
        >
          Pagar agua ahora →
        </button>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginTop: 10 }}>
          $25 MXN por pago · Folio de comprobante al instante · Sin cuenta de banco
        </p>
      </div>

      {/* Bill Calculator */}
      <div style={{ maxWidth: 600, margin: "0 auto", padding: "0 20px 16px" }}>
        <BillCalculator label="¿Cuánto debes de agua este mes?" />
      </div>

      {/* Steps */}
      <div style={{ maxWidth: 600, margin: "0 auto", padding: "0 20px 40px" }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: "#fff", marginBottom: 20, textAlign: "center" }}>
          Cómo pagar tu agua en 2 minutos
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {steps.map(s => (
            <div key={s.n} style={{ background: "rgba(255,255,255,0.07)", borderRadius: 14, padding: "16px 18px", display: "flex", gap: 16, alignItems: "flex-start" }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#00C875", color: "#003d26", fontWeight: 900, fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{s.n}</div>
              <div>
                <p style={{ margin: 0, fontWeight: 700, color: "#fff", fontSize: 15 }}>{s.title}</p>
                <p style={{ margin: "4px 0 0", color: "rgba(255,255,255,0.65)", fontSize: 13, lineHeight: 1.5 }}>{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div style={{ maxWidth: 600, margin: "0 auto", padding: "0 20px 40px" }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: "#fff", marginBottom: 20, textAlign: "center" }}>
          Preguntas frecuentes
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {faqs.map((f, i) => (
            <div key={i} style={{ background: "rgba(255,255,255,0.07)", borderRadius: 12, padding: "14px 16px" }}>
              <p style={{ margin: "0 0 6px", fontWeight: 700, color: "#fff", fontSize: 14 }}>{f.q}</p>
              <p style={{ margin: 0, color: "rgba(255,255,255,0.65)", fontSize: 13, lineHeight: 1.55 }}>{f.a}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom CTA */}
      <div style={{ textAlign: "center", padding: "0 20px" }}>
        <button
          onClick={() => navigate(`${BASE_URL}/register`)}
          style={{
            background: "#00C875", color: "#003d26", border: "none",
            borderRadius: 999, padding: "14px 36px", fontSize: 16,
            fontWeight: 800, cursor: "pointer",
          }}
        >
          Crear cuenta gratis + $150 MXN →
        </button>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 10 }}>
          Bono de bienvenida de $150 MXN al registrarte
        </p>
      </div>
    </div>
  );
}
