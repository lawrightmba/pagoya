import { useLang } from "@/lang";

export default function Slide02Problem() {
  const { es } = useLang();
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "#004F2D" }}>
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 80% 20%, rgba(255,92,26,0.1) 0%, transparent 55%)" }} />
      <div className="absolute left-0 top-0 bottom-0" style={{ width: "0.4vw", background: "linear-gradient(180deg, #FF5C1A 0%, transparent 100%)", opacity: 0.7 }} />

      <div className="relative z-10 flex flex-col h-full" style={{ padding: "2.5vh 8vw 2vh" }}>
        <div style={{ marginBottom: "1.5vh", flexShrink: 0 }}>
          <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.5vw", fontWeight: 700, color: "#FF5C1A", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: "0.7vh" }}>
            {es ? "El Problema" : "The Problem"}
          </p>
          <h2 style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "4vw", fontWeight: 900, color: "#FFFFFF", letterSpacing: "-0.01em", lineHeight: 1, marginBottom: "0.7vh" }}>
            {es
              ? <span>65M adultos son <span style={{ color: "#FF5C1A" }}>invisibles para el sistema financiero.</span><br />Sus pagos mueren en efectivo — sin registro, sin historial, sin crédito.</span>
              : <span>65M adults are <span style={{ color: "#FF5C1A" }}>invisible to the financial system.</span><br />Their payments die in cash — no record, no history, no credit.</span>}
          </h2>
          <div style={{ width: "6vw", height: "0.35vh", background: "#FF5C1A" }} />
        </div>

        <div className="flex gap-[3vw]" style={{ flex: 1, minHeight: 0 }}>
          <div style={{ width: "42%", display: "flex", flexDirection: "column", gap: "1vh" }}>
            <div style={{ background: "rgba(255,92,26,0.08)", border: "1px solid rgba(255,92,26,0.2)", borderRadius: "0.8vw", padding: "1.4vh 2vw" }}>
              <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "1.4vw", fontWeight: 700, color: "rgba(255,255,255,0.5)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "1vh" }}>
                {es ? "Población adulta de México (125M)" : "Mexico's Adult Population (125M)"}
              </p>
              {[
                { label: es ? "No bancarizados — nuestro mercado" : "Unbanked — our market", pct: 52, val: "65M", color: "#FF5C1A" },
                { label: es ? "Sector informal bancarizado" : "Informal-sector banked", pct: 22, val: "27M", color: "#FF8C5A" },
                { label: es ? "Bancarizados formales" : "Formally banked", pct: 26, val: "33M", color: "rgba(255,255,255,0.2)" },
              ].map(({ label, pct, val, color }) => (
                <div key={label} style={{ marginBottom: "1.1vh" }}>
                  <div className="flex justify-between" style={{ marginBottom: "0.35vh" }}>
                    <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.35vw", color: "rgba(255,255,255,0.75)" }}>{label}</p>
                    <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "1.5vw", fontWeight: 800, color }}>{val}</p>
                  </div>
                  <div style={{ height: "1.3vh", background: "rgba(255,255,255,0.07)", borderRadius: "1vw", overflow: "hidden" }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: "1vw" }} />
                  </div>
                </div>
              ))}
              <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.1vw", color: "rgba(255,255,255,0.35)", fontStyle: "italic", marginTop: "0.5vh" }}>
                {es ? "Fuente: ENIF 2021, Banco de México" : "Source: ENIF 2021, Banco de México"}
              </p>
            </div>

            <div style={{ background: "rgba(0,200,117,0.07)", border: "1px solid rgba(0,200,117,0.18)", borderRadius: "0.8vw", padding: "1.3vh 2vw" }}>
              <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "1.3vw", fontWeight: 700, color: "#00C875", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.8vh" }}>
                {es ? "Costo anual de pagar en efectivo" : "Annual cost of paying in cash"}
              </p>
              <div className="flex gap-[1.5vw]">
                {[
                  { stat: "$2,400+", label: es ? "MXN en comisiones / persona / año" : "MXN in fees / person / yr", color: "#FF5C1A" },
                  { stat: "4hrs+", label: es ? "mensuales desplazándose a OXXO" : "monthly traveling to OXXO", color: "#00C875" },
                  { stat: "1 en 5", label: es ? "hogares sufre un corte de luz al año" : "households face a utility cutoff/yr", color: "#FF5C1A" },
                ].map(({ stat, label, color }) => (
                  <div key={stat} style={{ flex: 1, borderLeft: "0.25vw solid rgba(255,255,255,0.1)", paddingLeft: "0.8vw" }}>
                    <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "2.1vw", fontWeight: 900, color, lineHeight: 1, marginBottom: "0.2vh" }}>{stat}</p>
                    <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.15vw", color: "rgba(255,255,255,0.5)", lineHeight: 1.3 }}>{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "1vh" }}>
            <div className="grid grid-cols-2" style={{ gap: "1vh", flex: 1 }}>
              {(es ? [
                { icon: "🏪", title: "Sin digitalización", body: "22,000 tiendas OXXO procesan $300B MXN anuales — ningún dato fluye de vuelta al historial del pagador." },
                { icon: "📋", title: "Sin historial crediticio", body: "El Buró solo cubre productos bancarios formales. 65M quedan excluidos del sistema por definición." },
                { icon: "⚡", title: "Sin prevención de cortes", body: "Sin recordatorios digitales, 1 de cada 5 familias enfrenta al menos 1 corte de luz o internet al año." },
                { icon: "🔒", title: "Mercado de crédito bloqueado", body: "El mercado crediticio de $28B USD en México no puede llegar al 52% de los adultos — no por falta de demanda, sino de datos." },
              ] : [
                { icon: "🏪", title: "No digitization", body: "22,000 OXXO stores process $300B MXN annually — zero data flows back to the payer's record." },
                { icon: "📋", title: "No credit history", body: "Buró de Crédito only covers formal banking products. 65M are excluded from the system by definition." },
                { icon: "⚡", title: "No cutoff prevention", body: "Without digital reminders, 1 in 5 families faces at least 1 utility cutoff per year." },
                { icon: "🔒", title: "Credit market blocked", body: "Mexico's $28B USD credit market can't reach 52% of adults — not for lack of demand, but lack of data." },
              ]).map(({ icon, title, body }) => (
                <div key={title} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "0.8vw", padding: "1.3vh 1.5vw" }}>
                  <div className="flex items-center gap-[0.7vw]" style={{ marginBottom: "0.5vh" }}>
                    <span style={{ fontSize: "1.6vw" }}>{icon}</span>
                    <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.45vw", fontWeight: 700, color: "#FFFFFF" }}>{title}</p>
                  </div>
                  <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.25vw", color: "rgba(255,255,255,0.5)", lineHeight: 1.35 }}>{body}</p>
                </div>
              ))}
            </div>
            <div style={{ background: "rgba(255,92,26,0.1)", borderLeft: "0.4vw solid #FF5C1A", padding: "1.3vh 2vw", borderRadius: "0 0.6vw 0.6vw 0", flexShrink: 0 }}>
              <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.55vw", fontWeight: 500, color: "#FFFFFF", lineHeight: 1.4 }}>
                {es
                  ? <><span style={{ color: "#FF5C1A", fontWeight: 700 }}>El problema no es que la gente no pague.</span>{" "}Es que esos pagos no dejan huella. PagoYa convierte cada pago en un dato que construye identidad financiera.</>
                  : <><span style={{ color: "#FF5C1A", fontWeight: 700 }}>The problem isn't that people don't pay.</span>{" "}It's that those payments leave no trace. PagoYa turns every payment into a data point that builds financial identity.</>}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
