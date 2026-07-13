import { LANG } from "@/lang";
const es = LANG === "es";

export default function Slide11Why500() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "#004F2D" }}>
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% 20%, rgba(255,92,26,0.07) 0%, transparent 55%)" }} />

      <div className="relative z-10 flex flex-col h-full" style={{ padding: "2.5vh 8vw 2vh" }}>
        <div style={{ marginBottom: "1.5vh", flexShrink: 0 }}>
          <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.4vw", fontWeight: 700, color: "#FF5C1A", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: "0.5vh" }}>
            {es ? "Panorama Competitivo" : "Competitive Landscape"}
          </p>
          <h2 style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "4vw", fontWeight: 900, color: "#FFFFFF", letterSpacing: "-0.01em", lineHeight: 1, marginBottom: "0.7vh" }}>
            {es
              ? "Mercado Pago mueve dinero. PagoYa mide confianza."
              : "Mercado Pago moves money. PagoYa measures trust."}
          </h2>
          <div style={{ width: "6vw", height: "0.4vh", background: "#FF5C1A" }} />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "22vw 1fr 1fr 1fr 1fr",
            gap: 0,
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "0.8vw",
            overflow: "hidden",
            marginBottom: "1.5vh",
            flexShrink: 0
          }}
        >
          {[
            { label: " ", bg: "rgba(255,255,255,0.06)", color: "transparent" },
            { label: "OXXO Pay", bg: "rgba(255,255,255,0.03)", color: "#FFFFFF" },
            { label: "Mercado Pago", bg: "rgba(255,255,255,0.03)", color: "#FFFFFF" },
            { label: "Spin by OXXO", bg: "rgba(255,255,255,0.03)", color: "#FFFFFF" },
            { label: "PagoYa", bg: "rgba(0,200,117,0.12)", color: "#00C875" },
          ].map(({ label, bg, color }) => (
            <div key={label} style={{ background: bg, padding: "1.2vh 1.5vw", borderBottom: "1px solid rgba(255,255,255,0.07)", borderRight: "1px solid rgba(255,255,255,0.07)" }}>
              <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "1.8vw", fontWeight: 800, color, lineHeight: 1.1 }}>{label}</p>
            </div>
          ))}

          {[
            { feature: es ? "Tarifa fija" : "Flat fee", vals: [es ? "Por servicio" : "Per service", es ? "Variable" : "Variable", es ? "Variable" : "Variable", "$25 MXN"], hi: 3 },
            { feature: es ? "Sin descarga de app" : "No app download", vals: ["N/A", es ? "Requerida" : "Required", es ? "Requerida" : "Required", es ? "No requerida" : "Not required"], hi: 3 },
            { feature: es ? "Agente IA WhatsApp" : "WhatsApp AI agent", vals: ["No", es ? "Solo bot" : "Bot only", "No", "Yes — Paula"], hi: 3 },
            { feature: es ? "Tarjetas de regalo" : "Gift cards", vals: ["No", es ? "Limitadas" : "Limited", "No", es ? "Sí — activas" : "Yes — live"], hi: 3 },
            { feature: es ? "Activación en campo" : "Field activation", vals: ["No", "No", "No", es ? "Sí" : "Yes"], hi: 3 },
          ].map(({ feature, vals, hi }) => (
            vals.map((v, i) => (
              <div key={`${feature}-${i}`} style={{ background: i === hi ? "rgba(0,200,117,0.07)" : i === -1 ? "rgba(255,255,255,0.03)" : "transparent", padding: "1vh 1.5vw", borderBottom: "1px solid rgba(255,255,255,0.06)", borderRight: "1px solid rgba(255,255,255,0.06)" }}>
                {i === 0
                  ? <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.5vw", color: "rgba(255,255,255,0.55)", fontWeight: 500 }}>{feature}</p>
                  : <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.5vw", color: i === hi ? "#00C875" : "rgba(255,255,255,0.4)", fontWeight: i === hi ? 700 : 400 }}>{v}</p>
                }
              </div>
            ))
          )).flat()}

          <div style={{ background: "rgba(255,92,26,0.06)", padding: "1.1vh 1.8vw", borderRight: "1px solid rgba(255,92,26,0.2)" }}>
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.5vw", color: "rgba(255,255,255,0.55)", fontWeight: 500 }}>
              {es ? "PTI · API de datos conductual para prestamistas" : "PTI · behavioral data API licensed to lenders"}
            </p>
          </div>
          {["No", "No", "No"].map((v, i) => (
            <div key={`pti-no-${i}`} style={{ background: "rgba(255,92,26,0.04)", padding: "1.1vh 1.5vw", borderRight: "1px solid rgba(255,92,26,0.1)" }}>
              <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.5vw", color: "rgba(255,255,255,0.3)" }}>{v}</p>
            </div>
          ))}
          <div style={{ background: "rgba(255,92,26,0.15)", padding: "1.1vh 1.5vw", borderTop: "1px solid rgba(255,92,26,0.3)" }}>
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.5vw", color: "#FF5C1A", fontWeight: 700 }}>✅ {es ? "Único en el mercado" : "Unique"}</p>
          </div>
        </div>

        <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.75vw", fontWeight: 500, color: "#FFFFFF", lineHeight: 1.4, flexShrink: 0 }}>
          {es
            ? <>PagoYa es la única billetera construida para<span style={{ color: "#00C875", fontWeight: 700 }}> usuarios que prefieren efectivo</span> — y la única que convierte esos pagos en<span style={{ color: "#FF5C1A", fontWeight: 700 }}> identidad financiera portable via PTI</span>. Esa última fila no la puede copiar ningún competidor en 18 meses.</>
            : <>PagoYa is the only wallet built for<span style={{ color: "#00C875", fontWeight: 700 }}> cash-preferring users</span> — and the only one that converts those payments into<span style={{ color: "#FF5C1A", fontWeight: 700 }}> portable financial identity via PTI</span>. No competitor can copy that last row in 18 months.</>}
        </p>
      </div>
    </div>
  );
}
