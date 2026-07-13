import { useLang } from "@/lang";

export default function Slide03Paula() {
  const { es } = useLang();
  return (
    <div
      className="relative w-screen h-screen overflow-hidden flex"
      style={{ background: "#004F2D" }}
    >
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse at 65% 40%, rgba(0,200,117,0.1) 0%, transparent 60%)" }}
      />

      <div className="relative z-10 flex w-full h-full" style={{ padding: "5.5vh 8vw" }}>

        <div className="flex flex-col justify-center" style={{ width: "48%", paddingRight: "4vw" }}>
          <div className="flex items-center gap-[1vw]" style={{ marginBottom: "1.6vh" }}>
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.6vw", fontWeight: 700, color: "#00C875", letterSpacing: "0.14em", textTransform: "uppercase" }}>
              {es ? "Conoce a Paula" : "Meet Paula"}
            </p>
            <div style={{ background: "rgba(255,92,26,0.18)", border: "1px solid #FF5C1A", borderRadius: "2vw", padding: "0.3vh 1vw", display: "flex", alignItems: "center", gap: "0.4vw" }}>
              <span style={{ fontSize: "1.1vw" }}>🤖</span>
              <span style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.1vw", fontWeight: 700, color: "#FF5C1A", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                {es ? "Motor de señales" : "Signal engine"}
              </span>
            </div>
          </div>
          <h2 style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "4.8vw", fontWeight: 900, color: "#FFFFFF", letterSpacing: "-0.01em", lineHeight: 0.96, marginBottom: "1.5vh" }}>
            {es ? "No es un chatbot.\nEs el factory de datos\nde PagoYa." : "Not a chatbot.\nIt's PagoYa's\ndata factory."}
          </h2>
          <div style={{ width: "6vw", height: "0.4vh", background: "#00C875", marginBottom: "2vh" }} />

          <div className="flex flex-col gap-[1.5vh]">
            {(es ? [
              { icon: "🧠", title: "Entiende lenguaje natural", body: 'Sin menús ni formularios. "Paga mi CFE" o "Dame Netflix" — Paula resuelve el resto' },
              { icon: "⚡", title: "Razona y actúa de forma autónoma", body: "Verifica saldo, consulta factura, confirma monto, ejecuta el pago — un mensaje" },
              { icon: "📡", title: "Proactiva — genera señales PTI en cada interacción", body: "Cada mensaje, recordatorio y pago alimenta las 4 dimensiones del PTI — engagement, confiabilidad, consistencia, flujo de caja" },
              { icon: "🔮", title: "Memoria persistente = historial financiero", body: "Recuerda cada factura, vencimiento y pago. 90 días de conversación = identidad crediticia completa" },
            ] : [
              { icon: "🧠", title: "Understands natural language", body: 'No menus or forms. "Pay my CFE" or "Get me Netflix" — Paula handles the rest' },
              { icon: "⚡", title: "Reasons and acts autonomously", body: "Checks balance, looks up bill, confirms amount, executes payment — one message" },
              { icon: "📡", title: "Proactive — generates PTI signals on every interaction", body: "Every message, reminder, and payment feeds all 4 PTI dimensions — engagement, reliability, consistency, cashflow" },
              { icon: "🔮", title: "Persistent memory = financial history", body: "Remembers every bill, due date, and payment. 90 days of conversation = complete credit identity" },
            ]).map(({ icon, title, body }) => (
              <div key={title} className="flex items-start gap-[1.2vw]">
                <span style={{ fontSize: "1.9vw", lineHeight: 1, marginTop: "0.15vh", flexShrink: 0 }}>{icon}</span>
                <div>
                  <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.65vw", fontWeight: 700, color: "#FFFFFF", marginBottom: "0.2vh" }}>{title}</p>
                  <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.35vw", color: "rgba(255,255,255,0.55)", lineHeight: 1.3 }}>{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col justify-center" style={{ flex: 1 }}>
          <div style={{ background: "#ECE5DD", borderRadius: "2vw", overflow: "hidden", boxShadow: "0 2vw 4vw rgba(0,0,0,0.4)", display: "flex", flexDirection: "column", height: "82vh" }}>
            <div style={{ background: "#075E54", padding: "1.6vh 2vw", display: "flex", alignItems: "center", gap: "1.2vw", flexShrink: 0 }}>
              <div style={{ width: "4.5vh", height: "4.5vh", borderRadius: "50%", background: "linear-gradient(135deg, #00C875 0%, #007A4A 100%)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ fontSize: "2vh", lineHeight: 1 }}>🤖</span>
              </div>
              <div>
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.7vw", fontWeight: 700, color: "#FFFFFF", lineHeight: 1 }}>Paula · PagoYa</p>
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.3vw", color: "rgba(255,255,255,0.75)", lineHeight: 1 }}>{es ? "en línea" : "online"}</p>
              </div>
            </div>

            <div style={{ flex: 1, padding: "2vh 2vw", display: "flex", flexDirection: "column", gap: "1.5vh", overflowY: "hidden", background: "#ECE5DD" }}>
              <div style={{ alignSelf: "flex-start", maxWidth: "82%", display: "flex", flexDirection: "column", gap: "0.4vh" }}>
                <div style={{ display: "inline-flex", alignSelf: "flex-start", background: "rgba(0,200,117,0.18)", border: "1px solid rgba(0,200,117,0.5)", borderRadius: "2vw", padding: "0.2vh 0.8vw" }}>
                  <span style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1vw", fontWeight: 700, color: "#00C875", letterSpacing: "0.04em" }}>
                    {es ? "✦ Paula te avisa de forma proactiva" : "✦ Paula proactively alerts you"}
                  </span>
                </div>
                <div style={{ background: "#FFFFFF", borderRadius: "0.3vw 1.2vw 1.2vw 1.2vw", padding: "1.1vh 1.4vw", boxShadow: "0 0.2vh 0.4vh rgba(0,0,0,0.1)" }}>
                  <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.35vw", color: "#111", lineHeight: 1.45, whiteSpace: "pre-line" }}>
                    {es ? "⚠️ Aviso — tu recibo CFE ($380 MXN) vence en 3 días.\n\n¿Lo pago ahora de tu saldo? Tienes $520 MXN disponibles." : "⚠️ Heads up — your CFE bill ($380 MXN) is due in 3 days.\n\nShall I pay it now from your balance? You have $520 MXN available."}
                  </p>
                </div>
              </div>
              <div style={{ alignSelf: "flex-end", maxWidth: "82%" }}>
                <div style={{ background: "#DCF8C6", borderRadius: "1.2vw 0.3vw 1.2vw 1.2vw", padding: "1.1vh 1.4vw", boxShadow: "0 0.2vh 0.4vh rgba(0,0,0,0.1)" }}>
                  <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.35vw", color: "#111", lineHeight: 1.45 }}>{es ? "Sí, págalo" : "Yes, pay it"}</p>
                </div>
              </div>
              <div style={{ alignSelf: "flex-start", maxWidth: "82%", display: "flex", flexDirection: "column", gap: "0.4vh" }}>
                <div style={{ display: "inline-flex", alignSelf: "flex-start", background: "rgba(0,200,117,0.18)", border: "1px solid rgba(0,200,117,0.5)", borderRadius: "2vw", padding: "0.2vh 0.8vw" }}>
                  <span style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1vw", fontWeight: 700, color: "#00C875", letterSpacing: "0.04em" }}>
                    {es ? "✦ Señal PTI de Confiabilidad generada" : "✦ PTI Reliability signal generated"}
                  </span>
                </div>
                <div style={{ background: "#FFFFFF", borderRadius: "0.3vw 1.2vw 1.2vw 1.2vw", padding: "1.1vh 1.4vw", boxShadow: "0 0.2vh 0.4vh rgba(0,0,0,0.1)" }}>
                  <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.35vw", color: "#111", lineHeight: 1.45, whiteSpace: "pre-line" }}>
                    {es ? "✅ Listo. CFE pagado. +12 pts PTI\n📄 Recibo #CFE-2026-0604-8821 · $380 MXN" : "✅ Done. CFE paid. +12 PTI pts\n📄 Receipt #CFE-2026-0604-8821 · $380 MXN"}
                  </p>
                </div>
              </div>
              <div style={{ alignSelf: "flex-end", maxWidth: "82%" }}>
                <div style={{ background: "#DCF8C6", borderRadius: "1.2vw 0.3vw 1.2vw 1.2vw", padding: "1.1vh 1.4vw", boxShadow: "0 0.2vh 0.4vh rgba(0,0,0,0.1)" }}>
                  <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.35vw", color: "#111", lineHeight: 1.45 }}>{es ? "También tráeme Netflix" : "Also get me Netflix"}</p>
                </div>
              </div>
              <div style={{ alignSelf: "flex-start", maxWidth: "82%", display: "flex", flexDirection: "column", gap: "0.4vh" }}>
                <div style={{ display: "inline-flex", alignSelf: "flex-start", background: "rgba(255,92,26,0.15)", border: "1px solid rgba(255,92,26,0.4)", borderRadius: "2vw", padding: "0.2vh 0.8vw" }}>
                  <span style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1vw", fontWeight: 700, color: "#FF5C1A", letterSpacing: "0.04em" }}>
                    {es ? "✦ Señal PTI de Diversidad de servicios generada" : "✦ PTI Service diversity signal generated"}
                  </span>
                </div>
                <div style={{ background: "#FFFFFF", borderRadius: "0.3vw 1.2vw 1.2vw 1.2vw", padding: "1.1vh 1.4vw", boxShadow: "0 0.2vh 0.4vh rgba(0,0,0,0.1)" }}>
                  <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.35vw", color: "#111", lineHeight: 1.45, whiteSpace: "pre-line" }}>
                    {es ? "Listo 🎬 Netflix $99 MXN procesado.\n\nTu PTI hoy: 712 · Nivel Confiable 🟢" : "Done 🎬 Netflix $99 MXN processed.\n\nYour PTI today: 712 · Reliable level 🟢"}
                  </p>
                </div>
              </div>
            </div>

            <div style={{ background: "#F0F0F0", padding: "1.2vh 1.5vw", display: "flex", alignItems: "center", gap: "1vw", flexShrink: 0 }}>
              <div style={{ flex: 1, background: "#FFFFFF", borderRadius: "2vw", padding: "1vh 1.5vw" }}>
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.35vw", color: "#AAA" }}>{es ? "Escribe un mensaje…" : "Type a message…"}</p>
              </div>
              <div style={{ width: "3.5vh", height: "3.5vh", borderRadius: "50%", background: "#075E54", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: "1.4vh" }}>➤</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
