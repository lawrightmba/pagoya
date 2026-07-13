import { LANG } from "@/lang";
const es = LANG === "es";

export default function SlideFlywheel() {
  const dims = es ? [
    { code: "PR", pct: 30, label: "Confiabilidad de Pago", color: "#00C875", signals: ["Racha de pagos consecutivos", "Porcentaje de pagos a tiempo", "Pagos recuperados tras mora", "Días promedio antes del vencimiento"] },
    { code: "BC", pct: 20, label: "Consistencia Conductual", color: "#00C875", signals: ["Regularidad de pagos por semana", "Concentración en días de semana vs. fin de semana", "Adherencia al calendario de servicios", "Varianza interanual de cadencia"] },
    { code: "ED", pct: 25, label: "Profundidad de Engagement", color: "#FF5C1A", signals: ["Diversidad de servicios pagados", "Tasa de respuesta a Paula", "Misiones completadas", "Frecuencia de uso mensual activo"] },
    { code: "CF", pct: 25, label: "Estabilidad de Flujo de Caja", color: "#FF5C1A", signals: ["Nivel promedio de saldo de billetera", "Regularidad de carga de efectivo", "Ratio carga-gasto por ciclo", "Velocidad de depresión de saldo"] },
  ] : [
    { code: "PR", pct: 30, label: "Payment Reliability", color: "#00C875", signals: ["Consecutive payment streak", "On-time payment rate", "Recovery after missed payments", "Avg. days before due date"] },
    { code: "BC", pct: 20, label: "Behavioral Consistency", color: "#00C875", signals: ["Payment regularity by week", "Weekday vs. weekend concentration", "Service calendar adherence", "Year-over-year cadence variance"] },
    { code: "ED", pct: 25, label: "Engagement Depth", color: "#FF5C1A", signals: ["Service diversity paid", "Paula response rate", "Missions completed", "Monthly active usage frequency"] },
    { code: "CF", pct: 25, label: "Cashflow Stability", color: "#FF5C1A", signals: ["Avg. wallet balance level", "Cash load regularity", "Load-to-spend ratio per cycle", "Balance depletion velocity"] },
  ];

  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "#004F2D" }}>
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% 55%, rgba(0,200,117,0.08) 0%, transparent 65%)" }} />

      <div className="relative z-10 flex flex-col h-full" style={{ padding: "2.5vh 8vw 2vh" }}>
        <div style={{ marginBottom: "1.5vh", flexShrink: 0 }}>
          <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.5vw", fontWeight: 700, color: "#00C875", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: "0.7vh" }}>
            {es ? "Arquitectura PTI" : "PTI Architecture"}
          </p>
          <h2 style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "4vw", fontWeight: 900, color: "#FFFFFF", letterSpacing: "-0.01em", lineHeight: 1, marginBottom: "0.7vh" }}>
            {es
              ? <span>4 dimensiones. 90+ señales. <span style={{ color: "#00C875" }}>Un solo puntaje accionable.</span></span>
              : <span>4 dimensions. 90+ signals. <span style={{ color: "#00C875" }}>One actionable score.</span></span>}
          </h2>
          <div style={{ width: "6vw", height: "0.35vh", background: "#00C875" }} />
        </div>

        <div className="grid grid-cols-4 gap-[1.5vw]" style={{ flex: 1, minHeight: 0 }}>
          {dims.map(({ code, pct, label, color, signals }) => (
            <div key={code} style={{ background: "rgba(255,255,255,0.04)", border: `1.5px solid ${color}33`, borderRadius: "0.8vw", padding: "1.5vh 1.5vw", display: "flex", flexDirection: "column" }}>
              <div className="flex items-start justify-between" style={{ marginBottom: "0.8vh" }}>
                <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "3.5vw", fontWeight: 900, color, lineHeight: 1 }}>{code}</p>
                <div style={{ background: `${color}22`, borderRadius: "0.4vw", padding: "0.3vh 0.7vw" }}>
                  <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "1.6vw", fontWeight: 900, color, lineHeight: 1 }}>{pct}%</p>
                </div>
              </div>
              <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.25vw", fontWeight: 700, color: "#FFFFFF", lineHeight: 1.2, marginBottom: "0.5vh" }}>{label}</p>
              <div style={{ height: "0.4vh", background: "rgba(255,255,255,0.07)", borderRadius: "1vw", overflow: "hidden", marginBottom: "1vh", flexShrink: 0 }}>
                <div style={{ width: `${pct / 30 * 100}%`, height: "100%", background: color, borderRadius: "1vw" }} />
              </div>
              <div className="flex flex-col gap-[0.5vh]" style={{ flex: 1 }}>
                {signals.map(s => (
                  <div key={s} className="flex items-start gap-[0.5vw]">
                    <div style={{ width: "0.3vw", height: "0.3vw", borderRadius: "50%", background: color, flexShrink: 0, marginTop: "0.6vh" }} />
                    <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.15vw", color: "rgba(255,255,255,0.6)", lineHeight: 1.35 }}>{s}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-[1.5vw]" style={{ marginTop: "1.2vh", flexShrink: 0 }}>
          <div style={{ flex: 1, background: "rgba(0,200,117,0.1)", border: "1px solid rgba(0,200,117,0.25)", borderRadius: "0.7vw", padding: "1.2vh 1.8vw" }}>
            <div className="flex items-center gap-[1vw]">
              <div>
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.1vw", fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  {es ? "Versión del modelo" : "Model version"}
                </p>
                <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "2.2vw", fontWeight: 900, color: "#00C875", lineHeight: 1 }}>v5.0.0-rc1</p>
              </div>
              <div style={{ width: "1px", height: "4vh", background: "rgba(255,255,255,0.15)" }} />
              <div>
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.1vw", fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  {es ? "Rango de puntaje" : "Score range"}
                </p>
                <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "2.2vw", fontWeight: 900, color: "#FFFFFF", lineHeight: 1 }}>300 – 850</p>
              </div>
              <div style={{ width: "1px", height: "4vh", background: "rgba(255,255,255,0.15)" }} />
              <div>
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.1vw", fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  {es ? "Certificación" : "Certification"}
                </p>
                <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "2.2vw", fontWeight: 900, color: "#00C875", lineHeight: 1 }}>
                  {es ? "Fair-lending · Jul 2026" : "Fair-lending · Jul 2026"}
                </p>
              </div>
            </div>
          </div>
          <div style={{ flex: 2, background: "rgba(255,92,26,0.08)", borderLeft: "0.4vw solid #FF5C1A", padding: "1.2vh 2vw", borderRadius: "0 0.6vw 0.6vw 0" }}>
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.5vw", fontWeight: 500, color: "#FFFFFF", lineHeight: 1.4 }}>
              {es
                ? <><span style={{ color: "#FF5C1A", fontWeight: 700 }}>El pago es el sensor.</span> Cada transacción en PagoYa genera 90+ señales que ningún buró puede capturar para esta población. Después de 90 días de comportamiento, el PTI predice la solvencia mejor que cualquier score de buró tradicional — porque mide acción real, no historial de préstamos.</>
                : <><span style={{ color: "#FF5C1A", fontWeight: 700 }}>The payment is the sensor.</span> Every transaction on PagoYa generates 90+ signals no bureau can capture for this population. After 90 days of behavior, PTI predicts creditworthiness better than any traditional bureau score — because it measures real action, not loan history.</>}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
