import { LANG } from "@/lang";
const es = LANG === "es";

export default function Slide09GoToMarket() {
  return (
    <div
      className="relative w-screen h-screen overflow-hidden"
      style={{ background: "#004F2D" }}
    >
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse at 30% 50%, rgba(0,200,117,0.1) 0%, transparent 60%)" }}
      />
      <div
        className="absolute left-0 top-0 bottom-0"
        style={{ width: "0.4vw", background: "linear-gradient(180deg, #00C875 0%, transparent 100%)", opacity: 0.7 }}
      />

      <div className="relative z-10 flex flex-col h-full" style={{ padding: "2.5vh 8vw 2vh" }}>

        <div style={{ marginBottom: "1.2vh" }}>
          <p style={{
            fontFamily: "DM Sans, sans-serif",
            fontSize: "1.5vw",
            fontWeight: 700,
            color: "#00C875",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            marginBottom: "0.7vh"
          }}>
            {es ? "La Barrera de Datos" : "The Data Barrier"}
          </p>
          <h2 style={{
            fontFamily: "Barlow Condensed, sans-serif",
            fontSize: "4vw",
            fontWeight: 900,
            color: "#FFFFFF",
            letterSpacing: "-0.01em",
            lineHeight: 1,
            marginBottom: "0.7vh"
          }}>
            {es
              ? <span>Cada pago construye un perfil crediticio que{" "}<span style={{ color: "#00C875" }}>65M personas nunca han tenido.</span></span>
              : <span>Every payment builds a credit profile that{" "}<span style={{ color: "#00C875" }}>65M people have never had.</span></span>
            }
          </h2>
          <div style={{ width: "6vw", height: "0.35vh", background: "#00C875" }} />
        </div>

        <div className="grid grid-cols-3 gap-[2vw]" style={{ marginBottom: "1.2vh", flex: 1, minHeight: 0, overflow: "hidden" }}>

          <div style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "0.8vw",
            padding: "1.2vh 1.6vw",
            overflow: "hidden"
          }}>
            <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "1.4vw", fontWeight: 700, color: "rgba(255,255,255,0.45)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.8vh" }}>
              {es ? "Lo que recopilamos" : "What we collect"}
            </p>
            {(es
              ? ["Consistencia de pagos", "Cadencia y mezcla de facturas", "Frecuencia de carga de efectivo", "Señales de ingresos", "Puntuación de confiabilidad", "Historial de múltiples proveedores"]
              : ["Payment consistency", "Bill cadence and mix", "Cash load frequency", "Income signals", "Reliability score", "Multi-provider history"]
            ).map(d => (
              <div key={d} className="flex items-center gap-[0.7vw]" style={{ marginBottom: "0.4vh" }}>
                <div style={{ width: "0.35vw", height: "0.35vw", borderRadius: "50%", background: "#00C875", flexShrink: 0 }} />
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.35vw", color: "rgba(255,255,255,0.8)" }}>{d}</p>
              </div>
            ))}
          </div>

          <div style={{
            background: "rgba(0,200,117,0.08)",
            border: "1px solid rgba(0,200,117,0.2)",
            borderRadius: "0.8vw",
            padding: "1.2vh 1.6vw",
            overflow: "hidden"
          }}>
            <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "1.4vw", fontWeight: 700, color: "#00C875", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.8vh" }}>
              {es ? "Quién lo paga" : "Who pays for it"}
            </p>
            {(es
              ? [
                  { who: "Prestamistas digitales SOFOM", why: "Mercado de crédito de $28B USD — bloqueado por falta de datos" },
                  { who: "Instituciones de microfinanzas", why: "No existe registro conductual para evaluar comunidades de colonia" },
                  { who: "Aseguradoras", why: "Primer modelo de riesgo confiable para trabajadores informales" },
                  { who: "Neobancos y fintechs", why: "Identidad financiera verificada pre-adjunta a la adquisición" },
                ]
              : [
                  { who: "SOFOM digital lenders", why: "$28B USD credit market — blocked by lack of data" },
                  { who: "Microfinance institutions", why: "No behavioral record exists to score neighborhood communities" },
                  { who: "Insurers", why: "First reliable risk model for informal-sector workers" },
                  { who: "Neobanks & fintechs", why: "Verified financial identity pre-attached to acquisition" },
                ]
            ).map(({ who, why }) => (
              <div key={who} style={{ marginBottom: "0.65vh" }}>
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.4vw", fontWeight: 700, color: "#FFFFFF", marginBottom: "0.1vh" }}>{who}</p>
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.2vw", color: "rgba(255,255,255,0.5)", lineHeight: 1.3 }}>{why}</p>
              </div>
            ))}
          </div>

          <div style={{
            background: "rgba(255,92,26,0.08)",
            border: "1px solid rgba(255,92,26,0.2)",
            borderRadius: "0.8vw",
            padding: "1.2vh 1.6vw",
            overflow: "hidden"
          }}>
            <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "1.4vw", fontWeight: 700, color: "#FF5C1A", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.8vh" }}>
              {es ? "Fuentes de ingreso" : "Revenue streams"}
            </p>
            {(es
              ? [
                  { label: "Licenciamiento de datos", sub: "Conjuntos de datos conductuales anonimizados vendidos a prestamistas, aseguradoras y fintechs" },
                  { label: "Crédito integrado", sub: "Paula evalúa microcréditos usando nuestro propio historial de pagos" },
                  { label: "BNPL para servicios", sub: "Divide el CFE en 3 pagos — evaluado con los datos de facturas que tenemos" },
                  { label: "API de historial crediticio", sub: "Identidad financiera verificada vendida como servicio a socios" },
                ]
              : [
                  { label: "Data licensing", sub: "Anonymized behavioral datasets sold to lenders, insurers, and fintechs" },
                  { label: "Embedded credit", sub: "Paula underwrites micro-loans using our own payment history" },
                  { label: "BNPL for utilities", sub: "Split the CFE bill in 3 payments — underwritten with the bill data we already have" },
                  { label: "Credit history API", sub: "Verified financial identity sold as a service to partners" },
                ]
            ).map(({ label, sub }) => (
              <div key={label} style={{ marginBottom: "0.65vh" }}>
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.4vw", fontWeight: 700, color: "#FFFFFF", marginBottom: "0.1vh" }}>{label}</p>
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.2vw", color: "rgba(255,255,255,0.5)", lineHeight: 1.3 }}>{sub}</p>
              </div>
            ))}
          </div>
        </div>

        <div style={{
          background: "rgba(0,200,117,0.1)",
          borderLeft: "0.4vw solid #00C875",
          padding: "1.4vh 2.5vw",
          borderRadius: "0 0.6vw 0.6vw 0",
          flexShrink: 0
        }}>
          <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.55vw", fontWeight: 500, color: "#FFFFFF", lineHeight: 1.4 }}>
            {es
              ? <>Los ingresos por transacciones financian el crecimiento. Los ingresos por datos son el multiplicador.{" "}<span style={{ color: "#00C875", fontWeight: 700 }}>El mercado crediticio de $28B USD en México no puede llegar a los no bancarizados — no por falta de demanda, sino por falta de datos.</span>{" "}PagoYa es la única plataforma generando esos datos a escala, de forma legítima, un pago a la vez.</>
              : <>Transaction revenue funds growth. Data revenue is the multiplier.{" "}<span style={{ color: "#00C875", fontWeight: 700 }}>Mexico's $28B USD credit market cannot reach the unbanked — not for lack of demand, but lack of data.</span>{" "}PagoYa is the only platform generating that data at scale, legitimately, one payment at a time.</>
            }
          </p>
        </div>

      </div>
    </div>
  );
}
