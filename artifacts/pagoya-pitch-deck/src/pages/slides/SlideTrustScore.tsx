import { useLang } from "@/lang";

export default function SlideTrustScore() {
  const { es } = useLang();
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "#004F2D" }}>
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 70% 40%, rgba(0,200,117,0.13) 0%, transparent 60%)" }} />
      <div className="absolute left-0 top-0 bottom-0" style={{ width: "0.4vw", background: "linear-gradient(180deg, #00C875 0%, transparent 100%)", opacity: 0.8 }} />

      <div className="relative z-10 flex flex-col h-full" style={{ padding: "2.5vh 8vw 2vh" }}>
        <div style={{ marginBottom: "1.5vh", flexShrink: 0 }}>
          <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.5vw", fontWeight: 700, color: "#00C875", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: "0.7vh" }}>
            {es ? "Posicionamiento PTI" : "PTI Positioning"}
          </p>
          <h2 style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "4vw", fontWeight: 900, color: "#FFFFFF", letterSpacing: "-0.01em", lineHeight: 1, marginBottom: "0.7vh" }}>
            {es
              ? <span>Los burós evalúan crédito pasado. <span style={{ color: "#00C875" }}>El PTI predice comportamiento futuro.</span></span>
              : <span>Credit bureaus score past credit. <span style={{ color: "#00C875" }}>PTI predicts future behavior.</span></span>}
          </h2>
          <div style={{ width: "6vw", height: "0.35vh", background: "#00C875" }} />
        </div>

        <div className="flex gap-[2.5vw]" style={{ flex: 1, minHeight: 0 }}>
          <div style={{ flex: 1, background: "rgba(255,92,26,0.07)", border: "1px solid rgba(255,92,26,0.2)", borderRadius: "1vw", padding: "1.8vh 2vw", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.8vw", marginBottom: "1.2vh" }}>
              <div style={{ background: "rgba(255,92,26,0.2)", borderRadius: "50%", width: "2.8vh", height: "2.8vh", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ fontSize: "1.3vw", lineHeight: 1 }}>🏦</span>
              </div>
              <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "1.9vw", fontWeight: 900, color: "#FF5C1A" }}>
                {es ? "Buró de Crédito tradicional" : "Traditional Credit Bureau"}
              </p>
            </div>
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.25vw", color: "rgba(255,255,255,0.55)", marginBottom: "1.2vh", lineHeight: 1.35 }}>
              {es ? "Requiere historial bancario formal. 65M quedan fuera — no por ser malos pagadores, sino porque ningún banco los vio antes." : "Requires formal banking history. 65M are excluded — not because they're bad payers, but because no bank has ever seen them."}
            </p>
            <div className="flex flex-col gap-[0.7vh]" style={{ flex: 1 }}>
              {(es ? [
                { x: true, label: "Historial de tarjeta de crédito / hipoteca" },
                { x: true, label: "Créditos de nómina o préstamos formales" },
                { x: false, label: "Pagos de CFE, Telmex, gas natural" },
                { x: false, label: "Comportamiento de carga de efectivo" },
                { x: false, label: "Cadencia y consistencia de pagos de servicios" },
                { x: false, label: "Señales de ingresos informales" },
                { x: false, label: "Estabilidad de flujo de caja conductual" },
              ] : [
                { x: true, label: "Credit card / mortgage history" },
                { x: true, label: "Payroll credits or formal loans" },
                { x: false, label: "CFE, Telmex, gas payments" },
                { x: false, label: "Cash load behavior" },
                { x: false, label: "Utility payment cadence and consistency" },
                { x: false, label: "Informal income signals" },
                { x: false, label: "Behavioral cashflow stability" },
              ]).map(({ x, label }) => (
                <div key={label} className="flex items-center gap-[0.8vw]">
                  <span style={{ fontSize: "1.2vw", lineHeight: 1, flexShrink: 0, color: x ? "#00C875" : "#FF5C1A" }}>{x ? "✓" : "✗"}</span>
                  <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.25vw", color: x ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.35)", lineHeight: 1.3 }}>{label}</p>
                </div>
              ))}
            </div>
            <div style={{ background: "rgba(255,92,26,0.15)", borderRadius: "0.6vw", padding: "1vh 1.4vw", marginTop: "1vh", flexShrink: 0 }}>
              <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.2vw", color: "#FF5C1A", fontWeight: 700, lineHeight: 1.3 }}>
                {es ? "Resultado: $28B USD en créditos que no pueden emitirse." : "Result: $28B USD in credit that can't be issued."}
              </p>
            </div>
          </div>

          <div style={{ flex: 1, background: "linear-gradient(135deg, rgba(0,200,117,0.15) 0%, rgba(0,200,117,0.06) 100%)", border: "1.5px solid rgba(0,200,117,0.4)", borderRadius: "1vw", padding: "1.8vh 2vw", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.8vw", marginBottom: "1.2vh" }}>
              <div style={{ background: "rgba(0,200,117,0.2)", borderRadius: "50%", width: "2.8vh", height: "2.8vh", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ fontSize: "1.3vw", lineHeight: 1 }}>🧠</span>
              </div>
              <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "1.9vw", fontWeight: 900, color: "#00C875" }}>
                {es ? "Predictive Trust Index (PTI)" : "Predictive Trust Index (PTI)"}
              </p>
            </div>
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.25vw", color: "rgba(255,255,255,0.55)", marginBottom: "1.2vh", lineHeight: 1.35 }}>
              {es ? "90+ señales de comportamiento de pago real. v5.0 con certificación fair-lending. Construido exclusivamente a partir de lo que PagoYa observa — datos que nadie más tiene." : "90+ signals from real payment behavior. v5.0 with fair-lending certification. Built exclusively from what PagoYa observes — data no one else has."}
            </p>

            <div className="grid grid-cols-2 gap-[0.7vw]" style={{ marginBottom: "1.2vh", flexShrink: 0 }}>
              {[
                { dim: "PR", pct: "30%", label: es ? "Confiabilidad de Pago" : "Payment Reliability", color: "#00C875" },
                { dim: "BC", pct: "20%", label: es ? "Consistencia Conductual" : "Behavioral Consistency", color: "#00C875" },
                { dim: "ED", pct: "25%", label: es ? "Profundidad de Engagement" : "Engagement Depth", color: "#FF5C1A" },
                { dim: "CF", pct: "25%", label: es ? "Estabilidad de Flujo de Caja" : "Cashflow Stability", color: "#FF5C1A" },
              ].map(({ dim, pct, label, color }) => (
                <div key={dim} style={{ background: "rgba(0,30,15,0.6)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "0.6vw", padding: "0.9vh 1.2vw" }}>
                  <div className="flex items-center justify-between" style={{ marginBottom: "0.2vh" }}>
                    <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "1.8vw", fontWeight: 900, color, lineHeight: 1 }}>{dim}</p>
                    <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "1.8vw", fontWeight: 900, color: "rgba(255,255,255,0.7)", lineHeight: 1 }}>{pct}</p>
                  </div>
                  <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.1vw", color: "rgba(255,255,255,0.5)", lineHeight: 1.2 }}>{label}</p>
                  <div style={{ height: "0.35vh", background: "rgba(255,255,255,0.08)", borderRadius: "1vw", overflow: "hidden", marginTop: "0.5vh" }}>
                    <div style={{ width: pct, height: "100%", background: color, borderRadius: "1vw" }} />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-[0.5vh]" style={{ flex: 1 }}>
              {(es ? [
                "Cadencia y consistencia de pagos de servicios",
                "Comportamiento de carga de efectivo y saldo de billetera",
                "Diversidad de servicios pagados (CFE + Telmex + streaming)",
                "Señales de ingresos informales y estabilidad de flujo de caja",
                "Patrones de engagement con Paula y responsiveness",
              ] : [
                "Payment cadence and on-time consistency",
                "Cash load behavior and wallet balance patterns",
                "Service diversity (CFE + Telmex + streaming)",
                "Informal income signals and cashflow stability",
                "Paula engagement patterns and responsiveness",
              ]).map((label) => (
                <div key={label} className="flex items-center gap-[0.8vw]">
                  <span style={{ fontSize: "1.2vw", color: "#00C875", flexShrink: 0 }}>✓</span>
                  <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.25vw", color: "rgba(255,255,255,0.75)", lineHeight: 1.3 }}>{label}</p>
                </div>
              ))}
            </div>

            <div style={{ background: "rgba(0,200,117,0.15)", borderRadius: "0.6vw", padding: "1vh 1.4vw", marginTop: "1vh", flexShrink: 0 }}>
              <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.2vw", color: "#00C875", fontWeight: 700, lineHeight: 1.3 }}>
                {es ? "Resultado: identidad financiera portable para 65M personas que nunca la tuvieron." : "Result: portable financial identity for 65M people who never had one."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
