export default function Slide03Paula() {
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
            <p
              style={{
                fontFamily: "DM Sans, sans-serif",
                fontSize: "1.6vw",
                fontWeight: 700,
                color: "#00C875",
                letterSpacing: "0.14em",
                textTransform: "uppercase"
              }}
            >
              Conoce a Paula
            </p>
            <div
              style={{
                background: "rgba(255,92,26,0.18)",
                border: "1px solid #FF5C1A",
                borderRadius: "2vw",
                padding: "0.3vh 1vw",
                display: "flex",
                alignItems: "center",
                gap: "0.4vw"
              }}
            >
              <span style={{ fontSize: "1.1vw" }}>🤖</span>
              <span style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.1vw", fontWeight: 700, color: "#FF5C1A", letterSpacing: "0.08em", textTransform: "uppercase" }}>Agente con IA</span>
            </div>
          </div>
          <h2
            style={{
              fontFamily: "Barlow Condensed, sans-serif",
              fontSize: "5vw",
              fontWeight: 900,
              color: "#FFFFFF",
              letterSpacing: "-0.01em",
              lineHeight: 0.96,
              marginBottom: "1.5vh"
            }}
          >
            No es un chatbot.
            Es un agente que actúa.
          </h2>
          <div style={{ width: "6vw", height: "0.4vh", background: "#00C875", marginBottom: "2.5vh" }} />

          <div className="flex flex-col gap-[1.8vh]">
            <div className="flex items-start gap-[1.2vw]">
              <span style={{ fontSize: "1.9vw", lineHeight: 1, marginTop: "0.15vh", flexShrink: 0 }}>🧠</span>
              <div>
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.7vw", fontWeight: 700, color: "#FFFFFF", marginBottom: "0.2vh" }}>Entiende lenguaje natural</p>
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.4vw", color: "rgba(255,255,255,0.55)", lineHeight: 1.3 }}>Sin menús, sin formularios, sin app. Di "Paga mi CFE" o "Dame Netflix" — Paula resuelve el resto</p>
              </div>
            </div>
            <div className="flex items-start gap-[1.2vw]">
              <span style={{ fontSize: "1.9vw", lineHeight: 1, marginTop: "0.15vh", flexShrink: 0 }}>⚡</span>
              <div>
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.7vw", fontWeight: 700, color: "#FFFFFF", marginBottom: "0.2vh" }}>Razona y actúa de forma autónoma</p>
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.4vw", color: "rgba(255,255,255,0.55)", lineHeight: 1.3 }}>Consulta la factura, verifica tu saldo, confirma el monto, ejecuta el pago — un mensaje</p>
              </div>
            </div>
            <div className="flex items-start gap-[1.2vw]">
              <span style={{ fontSize: "1.9vw", lineHeight: 1, marginTop: "0.15vh", flexShrink: 0 }}>🔮</span>
              <div>
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.7vw", fontWeight: 700, color: "#FFFFFF", marginBottom: "0.2vh" }}>Memoria persistente entre conversaciones</p>
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.4vw", color: "rgba(255,255,255,0.55)", lineHeight: 1.3 }}>Recuerda cada factura, vencimiento y pago. Construye identidad financiera para personas sin cuenta bancaria</p>
              </div>
            </div>
            <div className="flex items-start gap-[1.2vw]">
              <span style={{ fontSize: "1.9vw", lineHeight: 1, marginTop: "0.15vh", flexShrink: 0 }}>📡</span>
              <div>
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.7vw", fontWeight: 700, color: "#FFFFFF", marginBottom: "0.2vh" }}>Proactiva — avisa antes de los cortes</p>
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.4vw", color: "rgba(255,255,255,0.55)", lineHeight: 1.3 }}>Paula te escribe 3 días antes de tu vencimiento. Tú no tienes que recordarlo. Ella sí.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-center" style={{ flex: 1 }}>
          <div
            style={{
              background: "#ECE5DD",
              borderRadius: "2vw",
              overflow: "hidden",
              boxShadow: "0 2vw 4vw rgba(0,0,0,0.4)",
              display: "flex",
              flexDirection: "column",
              height: "82vh"
            }}
          >
            <div
              style={{
                background: "#075E54",
                padding: "1.6vh 2vw",
                display: "flex",
                alignItems: "center",
                gap: "1.2vw",
                flexShrink: 0
              }}
            >
              <div
                style={{
                  width: "4.5vh",
                  height: "4.5vh",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #00C875 0%, #007A4A 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0
                }}
              >
                <span style={{ fontSize: "2vh", lineHeight: 1 }}>🤖</span>
              </div>
              <div>
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.7vw", fontWeight: 700, color: "#FFFFFF", lineHeight: 1 }}>Paula · PagoYa</p>
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.3vw", color: "rgba(255,255,255,0.75)", lineHeight: 1 }}>en línea</p>
              </div>
            </div>

            <div
              style={{
                flex: 1,
                padding: "2vh 2vw",
                display: "flex",
                flexDirection: "column",
                gap: "1.5vh",
                overflowY: "hidden",
                background: "#ECE5DD"
              }}
            >
              <div style={{ alignSelf: "flex-start", maxWidth: "82%", display: "flex", flexDirection: "column", gap: "0.4vh" }}>
                <div style={{ display: "inline-flex", alignSelf: "flex-start", background: "rgba(0,200,117,0.18)", border: "1px solid rgba(0,200,117,0.5)", borderRadius: "2vw", padding: "0.2vh 0.8vw" }}>
                  <span style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1vw", fontWeight: 700, color: "#00C875", letterSpacing: "0.04em" }}>✦ Paula te avisa de forma proactiva</span>
                </div>
                <div style={{ background: "#FFFFFF", borderRadius: "0.3vw 1.2vw 1.2vw 1.2vw", padding: "1.1vh 1.4vw", boxShadow: "0 0.2vh 0.4vh rgba(0,0,0,0.1)" }}>
                  <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.35vw", color: "#111", lineHeight: 1.45, whiteSpace: "pre-line" }}>{"⚠️ Aviso — tu recibo CFE ($380 MXN) vence en 3 días.\n\n¿Lo pago ahora de tu saldo? Tienes $520 MXN disponibles."}</p>
                </div>
              </div>
              <div style={{ alignSelf: "flex-end", maxWidth: "82%", display: "flex", flexDirection: "column", gap: "0.4vh" }}>
                <div style={{ background: "#DCF8C6", borderRadius: "1.2vw 0.3vw 1.2vw 1.2vw", padding: "1.1vh 1.4vw", boxShadow: "0 0.2vh 0.4vh rgba(0,0,0,0.1)" }}>
                  <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.35vw", color: "#111", lineHeight: 1.45 }}>Sí, págalo</p>
                </div>
              </div>
              <div style={{ alignSelf: "flex-start", maxWidth: "82%", display: "flex", flexDirection: "column", gap: "0.4vh" }}>
                <div style={{ display: "inline-flex", alignSelf: "flex-start", background: "rgba(0,200,117,0.18)", border: "1px solid rgba(0,200,117,0.5)", borderRadius: "2vw", padding: "0.2vh 0.8vw" }}>
                  <span style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1vw", fontWeight: 700, color: "#00C875", letterSpacing: "0.04em" }}>✦ Paula razona, verifica y ejecuta</span>
                </div>
                <div style={{ background: "#FFFFFF", borderRadius: "0.3vw 1.2vw 1.2vw 1.2vw", padding: "1.1vh 1.4vw", boxShadow: "0 0.2vh 0.4vh rgba(0,0,0,0.1)" }}>
                  <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.35vw", color: "#111", lineHeight: 1.45, whiteSpace: "pre-line" }}>{"Verificando saldo… ✓\nVerificando cuenta CFE… ✓\nProcesando vía SIPREL… ✓\n\n✅ Listo. CFE pagado.\n📄 Recibo #CFE-2026-0604-8821 · $380 MXN + $25 cuota"}</p>
                </div>
              </div>
              <div style={{ alignSelf: "flex-end", maxWidth: "82%", display: "flex", flexDirection: "column", gap: "0.4vh" }}>
                <div style={{ background: "#DCF8C6", borderRadius: "1.2vw 0.3vw 1.2vw 1.2vw", padding: "1.1vh 1.4vw", boxShadow: "0 0.2vh 0.4vh rgba(0,0,0,0.1)" }}>
                  <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.35vw", color: "#111", lineHeight: 1.45 }}>También tráeme Netflix</p>
                </div>
              </div>
              <div style={{ alignSelf: "flex-start", maxWidth: "82%", display: "flex", flexDirection: "column", gap: "0.4vh" }}>
                <div style={{ display: "inline-flex", alignSelf: "flex-start", background: "rgba(0,200,117,0.18)", border: "1px solid rgba(0,200,117,0.5)", borderRadius: "2vw", padding: "0.2vh 0.8vw" }}>
                  <span style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1vw", fontWeight: 700, color: "#00C875", letterSpacing: "0.04em" }}>✦ Paula recuerda tu historial</span>
                </div>
                <div style={{ background: "#FFFFFF", borderRadius: "0.3vw 1.2vw 1.2vw 1.2vw", padding: "1.1vh 1.4vw", boxShadow: "0 0.2vh 0.4vh rgba(0,0,0,0.1)" }}>
                  <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.35vw", color: "#111", lineHeight: 1.45, whiteSpace: "pre-line" }}>{"Listo 🎬 El mes pasado compraste Netflix por $99 MXN.\n\n¿Misma tarjeta? ¿O lo envías como regalo esta vez?"}</p>
                </div>
              </div>
            </div>

            <div
              style={{
                background: "#F0F0F0",
                padding: "1.2vh 1.5vw",
                display: "flex",
                alignItems: "center",
                gap: "1vw",
                flexShrink: 0
              }}
            >
              <div style={{ flex: 1, background: "#FFFFFF", borderRadius: "2vw", padding: "1vh 1.5vw" }}>
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.35vw", color: "#AAA" }}>Escribe un mensaje…</p>
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
