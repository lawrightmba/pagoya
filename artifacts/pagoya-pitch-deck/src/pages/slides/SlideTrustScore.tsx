import { LANG } from "@/lang";
const es = LANG === "es";

export default function SlideTrustScore() {
  return (
    <div
      className="relative w-screen h-screen overflow-hidden"
      style={{ background: "#004F2D" }}
    >
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse at 70% 40%, rgba(0,200,117,0.13) 0%, transparent 60%)" }}
      />
      <div
        className="absolute left-0 top-0 bottom-0"
        style={{ width: "0.4vw", background: "linear-gradient(180deg, #00C875 0%, transparent 100%)", opacity: 0.8 }}
      />

      <div className="relative z-10 flex h-full" style={{ padding: "3.5vh 7vw 3.5vh 8vw" }}>

        <div className="flex flex-col justify-center" style={{ width: "50%", paddingRight: "3vw" }}>
          <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.4vw", fontWeight: 700, color: "#00C875", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: "0.8vh" }}>
            {es ? "La Barrera de Datos" : "The Data Barrier"}
          </p>
          <h2 style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "4vw", fontWeight: 900, color: "#FFFFFF", letterSpacing: "-0.01em", lineHeight: 0.95, marginBottom: "0.8vh" }}>
            {es ? <>Cada pago construye<br />su identidad financiera.</> : <>Every payment builds<br />their financial identity.</>}
          </h2>
          <div style={{ width: "5vw", height: "0.35vh", background: "#00C875", marginBottom: "1.2vh" }} />

          <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.35vw", color: "rgba(255,255,255,0.65)", lineHeight: 1.35, marginBottom: "1.2vh" }}>
            {es
              ? "7 dimensiones de comportamiento real — el expediente crediticio que ningún buró ha construido para esta población."
              : "7 dimensions of real behavior — the credit file no bureau has ever built for this population."}
          </p>

          <div className="flex flex-col gap-[0.6vh]">
            {(es
              ? [
                  { icon: "⚡", title: "Racha de pagos", sub: "Pagos consecutivos a tiempo — el predictor más fuerte de confiabilidad" },
                  { icon: "🌐", title: "Diversidad de servicios", sub: "CFE + Telmex + Netflix: múltiples servicios = mayor estabilidad financiera" },
                  { icon: "💰", title: "Saldo de billetera", sub: "Nivel promedio de saldo — patrón de ahorro visible desde el día uno" },
                  { icon: "⚖️", title: "Ratio carga-gasto", sub: "Cuánto carga vs. gasta por ciclo — disciplina de flujo de efectivo" },
                  { icon: "🔐", title: "Verificación KYC", sub: "Identidad confirmada por INE/pasaporte — confianza del ecosistema" },
                  { icon: "🎯", title: "Misiones completadas", sub: "Engagement con la plataforma — indicador de permanencia a largo plazo" },
                  { icon: "📅", title: "Antigüedad de cuenta", sub: "Tiempo activo con PagoYa — historial acumulado sin banco requerido" },
                ]
              : [
                  { icon: "⚡", title: "Payment streak", sub: "Consecutive on-time payments — the strongest predictor of reliability" },
                  { icon: "🌐", title: "Service diversity", sub: "CFE + Telmex + Netflix: multiple services = greater financial stability" },
                  { icon: "💰", title: "Wallet balance", sub: "Average balance level — savings pattern visible from day one" },
                  { icon: "⚖️", title: "Load-to-spend ratio", sub: "How much is loaded vs. spent per cycle — cash-flow discipline" },
                  { icon: "🔐", title: "KYC verification", sub: "Identity confirmed via INE/passport — ecosystem trust signal" },
                  { icon: "🎯", title: "Missions completed", sub: "Platform engagement — long-term retention indicator" },
                  { icon: "📅", title: "Account age", sub: "Time active with PagoYa — accumulated history, no bank required" },
                ]
            ).map(({ icon, title, sub }) => (
              <div key={title} className="flex items-start gap-[0.7vw]">
                <span style={{ fontSize: "1.2vw", lineHeight: 1, marginTop: "0.2vh", flexShrink: 0 }}>{icon}</span>
                <div>
                  <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.2vw", fontWeight: 700, color: "#FFFFFF", marginBottom: "0" }}>{title}</p>
                  <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1vw", color: "rgba(255,255,255,0.5)", lineHeight: 1.2 }}>{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col justify-center gap-[2.2vh]" style={{ flex: 1 }}>

          <div style={{
            background: "linear-gradient(135deg, rgba(0,200,117,0.18) 0%, rgba(0,200,117,0.06) 100%)",
            border: "1.5px solid rgba(0,200,117,0.4)",
            borderRadius: "1vw",
            padding: "2.5vh 2.5vw",
          }}>
            <div className="flex items-center justify-between" style={{ marginBottom: "1.5vh" }}>
              <div>
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.2vw", fontWeight: 700, color: "rgba(255,255,255,0.5)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.3vh" }}>
                  Trust Score
                </p>
                <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "5vw", fontWeight: 900, color: "#00C875", lineHeight: 0.9 }}>712</p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.2vw", color: "rgba(255,255,255,0.5)", marginBottom: "0.3vh" }}>
                  {es ? "Nivel" : "Level"}
                </p>
                <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "2.2vw", fontWeight: 800, color: "#FFFFFF" }}>
                  {es ? "Confiable" : "Reliable"}
                </p>
              </div>
            </div>
            <div style={{ height: "0.8vh", background: "rgba(255,255,255,0.1)", borderRadius: "1vw", overflow: "hidden", marginBottom: "0.8vh" }}>
              <div style={{ width: "71%", height: "100%", background: "linear-gradient(90deg, #00C875 0%, #00E88A 100%)", borderRadius: "1vw" }} />
            </div>
            <div className="flex justify-between">
              <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.1vw", color: "rgba(255,255,255,0.35)" }}>300</p>
              <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.1vw", color: "rgba(255,255,255,0.35)" }}>1000</p>
            </div>
          </div>

          <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.2vw", fontWeight: 700, color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
            {es ? "Qué desbloquea el Trust Score" : "What the Trust Score unlocks"}
          </p>

          {(es
            ? [
                { score: "600+", label: "Micro-crédito de emergencia", detail: "$500–2,000 MXN · BNPL para servicios", color: "#00C875", active: true },
                { score: "680+", label: "Seguro de desempleo básico", detail: "Cubre 1 factura si el usuario pierde ingresos", color: "#00C875", active: true },
                { score: "720+", label: "Préstamo personal", detail: "$5,000–20,000 MXN · tasa preferencial", color: "#FF5C1A", active: false },
                { score: "760+", label: "Historial portable — EE.UU., Canadá", detail: "Identidad financiera exportable para la diáspora", color: "#FF5C1A", active: false },
              ]
            : [
                { score: "600+", label: "Emergency micro-credit", detail: "$500–2,000 MXN · BNPL for utilities", color: "#00C875", active: true },
                { score: "680+", label: "Basic unemployment insurance", detail: "Covers 1 bill if the user loses income", color: "#00C875", active: true },
                { score: "720+", label: "Personal loan", detail: "$5,000–20,000 MXN · preferred rate", color: "#FF5C1A", active: false },
                { score: "760+", label: "Portable history — US, Canada", detail: "Exportable financial identity for the diaspora", color: "#FF5C1A", active: false },
              ]
          ).map(({ score, label, detail, color, active }) => (
            <div
              key={label}
              style={{
                background: active ? "rgba(0,200,117,0.07)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${active ? "rgba(0,200,117,0.25)" : "rgba(255,255,255,0.1)"}`,
                borderRadius: "0.7vw",
                padding: "1.2vh 1.8vw",
                display: "flex",
                alignItems: "center",
                gap: "1.5vw",
              }}
            >
              <div style={{ textAlign: "center", flexShrink: 0, width: "5vw" }}>
                <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "1.9vw", fontWeight: 900, color, lineHeight: 1 }}>{score}</p>
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.6vw", fontWeight: 700, color: "#FFFFFF", lineHeight: 1.1, marginBottom: "0.15vh" }}>{label}</p>
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.3vw", color: "rgba(255,255,255,0.45)", lineHeight: 1.3 }}>{detail}</p>
              </div>
              <span style={{ fontSize: "1.5vw" }}>{active ? "✅" : "🔜"}</span>
            </div>
          ))}

          <div style={{ background: "rgba(255,92,26,0.08)", borderLeft: "0.35vw solid #FF5C1A", borderRadius: "0 0.5vw 0.5vw 0", padding: "1.2vh 1.8vw" }}>
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.5vw", color: "#FFFFFF", lineHeight: 1.4 }}>
              {es
                ? <><span style={{ color: "#FF5C1A", fontWeight: 700 }}>65 millones de personas</span> que los burós de crédito nunca han visto. PagoYa es la primera empresa que puede demostrar su solvencia.</>
                : <><span style={{ color: "#FF5C1A", fontWeight: 700 }}>65 million people</span> credit bureaus have never seen. PagoYa is the first company that can prove their creditworthiness.</>
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
