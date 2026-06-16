import { useLocation } from "wouter";
import { Helmet } from "react-helmet-async";
import BillCalculator from "@/components/BillCalculator";

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

export default function PagarTelmexVallarta() {
  const [, navigate] = useLocation();

  const steps = [
    { n: "1", title: "Abre PagoYa gratis", desc: "Ingresa tu número de teléfono. Sin banco, sin tarjeta, sin CURP. Listo en 90 segundos." },
    { n: "2", title: "Carga tu monedero", desc: "Deposita efectivo en cualquier OXXO o haz una transferencia SPEI. Sin cuenta de banco." },
    { n: "3", title: "Selecciona Telmex", desc: "Elige Telmex, ingresa tu número de línea o contrato y confirma el monto de tu recibo." },
    { n: "4", title: "Comprobante al instante", desc: "Folio de confirmación en pantalla. Telmex lo procesa en minutos — tu servicio no se corta." },
  ];

  const faqs = [
    { q: "¿Puedo pagar Telmex en Puerto Vallarta sin ir a una tienda?", a: "Sí. PagoYa te permite pagar tu recibo Telmex desde tu celular en cualquier colonia de Puerto Vallarta: Emiliano Zapata, Versalles, 5 de Diciembre, Pitillal, Fluvial Vallarta, Zona Romántica y más." },
    { q: "¿Cuánto cuesta pagar Telmex con PagoYa?", a: "La comisión es de $25 MXN por pago. Sin mensualidad ni cargos ocultos. El registro es gratuito." },
    { q: "¿Necesito cuenta bancaria o tarjeta?", a: "No. Puedes cargar tu monedero con efectivo en OXXO. No se requiere tarjeta ni cuenta de banco." },
    { q: "¿En cuánto tiempo se aplica el pago a Telmex?", a: "En la mayoría de los casos Telmex lo registra en menos de 24 horas, frecuentemente en minutos. Recibes folio de confirmación al instante como comprobante." },
    { q: "¿Funciona también para Izzi y TotalPlay?", a: "Sí. PagoYa procesa pagos de Telmex, Izzi, TotalPlay, Telcel y más de 30 empresas de servicios." },
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
        <title>Pagar Telmex en Puerto Vallarta sin ir a tienda | PagoYa</title>
        <meta name="description" content="Paga tu recibo de Telmex en Puerto Vallarta desde tu celular. Sin cuenta bancaria, sin filas. Comisión $25 MXN. Comprobante con folio al instante." />
        <meta name="keywords" content="pagar Telmex Puerto Vallarta, Telmex sin banco, pagar recibo Telmex efectivo, Telmex pago en línea Jalisco" />
        <link rel="canonical" href="https://pagoyamx.com/pagar-telmex-vallarta" />
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

      <div style={{ maxWidth: 600, margin: "0 auto", padding: "56px 20px 40px", textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>📞</div>
        <h1 style={{ fontSize: "clamp(26px,6vw,38px)", fontWeight: 900, color: "#fff", lineHeight: 1.15, margin: "0 0 14px", letterSpacing: "-0.02em" }}>
          Pago de Telmex en Puerto Vallarta
        </h1>
        <p style={{ fontSize: 16, color: "rgba(255,255,255,0.78)", lineHeight: 1.6, margin: "0 0 28px", maxWidth: 480, marginLeft: "auto", marginRight: "auto" }}>
          Internet · Teléfono fijo · Paquetes Telmex — desde tu celular, sin filas, sin sucursal.
          Disponible en toda la zona de Puerto Vallarta y Bahía de Banderas.
        </p>
        <button
          onClick={() => navigate(`${BASE_URL}/register`)}
          style={{
            background: "#00C875", color: "#003d26", border: "none",
            borderRadius: 999, padding: "14px 36px", fontSize: 16,
            fontWeight: 800, cursor: "pointer", boxShadow: "0 6px 24px rgba(0,200,117,0.35)",
          }}
        >
          Pagar Telmex ahora →
        </button>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginTop: 10 }}>
          $25 MXN por pago · Folio de comprobante al instante · Sin cuenta de banco
        </p>
      </div>

      {/* Bill Calculator */}
      <div style={{ maxWidth: 600, margin: "0 auto", padding: "0 20px 16px" }}>
        <BillCalculator label="¿Cuánto debes de Telmex este mes?" />
      </div>

      <div style={{ maxWidth: 600, margin: "0 auto", padding: "0 20px 40px" }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: "#fff", marginBottom: 20, textAlign: "center" }}>Cómo pagar Telmex en 2 minutos</h2>
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

      <div style={{ maxWidth: 600, margin: "0 auto", padding: "0 20px 40px" }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: "#fff", marginBottom: 20, textAlign: "center" }}>Preguntas frecuentes</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {faqs.map((f, i) => (
            <div key={i} style={{ background: "rgba(255,255,255,0.07)", borderRadius: 12, padding: "14px 16px" }}>
              <p style={{ margin: "0 0 6px", fontWeight: 700, color: "#fff", fontSize: 14 }}>{f.q}</p>
              <p style={{ margin: 0, color: "rgba(255,255,255,0.65)", fontSize: 13, lineHeight: 1.55 }}>{f.a}</p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ textAlign: "center", padding: "0 20px" }}>
        <button
          onClick={() => navigate(`${BASE_URL}/register`)}
          style={{ background: "#00C875", color: "#003d26", border: "none", borderRadius: 999, padding: "14px 36px", fontSize: 16, fontWeight: 800, cursor: "pointer" }}
        >
          Crear cuenta gratis + $150 MXN →
        </button>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 10 }}>Bono de bienvenida de $150 MXN al registrarte</p>
      </div>
    </div>
  );
}
