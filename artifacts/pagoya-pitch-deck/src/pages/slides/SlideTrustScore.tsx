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

      <div className="relative z-10 flex h-full" style={{ padding: "5vh 8vw" }}>

        {/* Left column */}
        <div className="flex flex-col justify-center" style={{ width: "50%", paddingRight: "4vw" }}>
          <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.6vw", fontWeight: 700, color: "#00C875", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: "1.4vh" }}>
            La Barrera de Datos
          </p>
          <h2 style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "5.2vw", fontWeight: 900, color: "#FFFFFF", letterSpacing: "-0.01em", lineHeight: 0.95, marginBottom: "1.4vh" }}>
            Cada pago construye<br />
            su identidad financiera.
          </h2>
          <div style={{ width: "6vw", height: "0.4vh", background: "#00C875", marginBottom: "3vh" }} />

          <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.9vw", color: "rgba(255,255,255,0.65)", lineHeight: 1.55, marginBottom: "3vh" }}>
            Después de 90 días con Paula, sabemos más sobre la confiabilidad financiera de nuestros usuarios que cualquier buró de crédito tradicional — porque vemos <em style={{ color: "#fff" }}>comportamiento real</em>, no historial bancario declarado.
          </p>

          <div className="flex flex-col gap-[1.6vh]">
            {[
              { icon: "⚡", title: "Puntualidad de pagos", sub: "Porcentaje de pagos realizados antes del vencimiento — el indicador más fuerte de confiabilidad crediticia" },
              { icon: "🔄", title: "Frecuencia y consistencia", sub: "Patrones semanales y mensuales que revelan disciplina financiera sin necesidad de extracto bancario" },
              { icon: "🌐", title: "Diversidad de servicios", sub: "CFE + Telmex + Telcel + Netflix — una persona que gestiona múltiples servicios es más estable, no menos" },
              { icon: "📈", title: "Crecimiento del saldo", sub: "Cómo carga y usa su billetera PagoYa — patrón de ahorro vs. gasto impulsivo, visible desde el día uno" },
            ].map(({ icon, title, sub }) => (
              <div key={title} className="flex items-start gap-[1.2vw]">
                <span style={{ fontSize: "1.8vw", lineHeight: 1, marginTop: "0.15vh", flexShrink: 0 }}>{icon}</span>
                <div>
                  <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.6vw", fontWeight: 700, color: "#FFFFFF", marginBottom: "0.2vh" }}>{title}</p>
                  <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.35vw", color: "rgba(255,255,255,0.5)", lineHeight: 1.35 }}>{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right column — Trust Score card + unlock ladder */}
        <div className="flex flex-col justify-center gap-[2.2vh]" style={{ flex: 1 }}>

          {/* Score card */}
          <div style={{
            background: "linear-gradient(135deg, rgba(0,200,117,0.18) 0%, rgba(0,200,117,0.06) 100%)",
            border: "1.5px solid rgba(0,200,117,0.4)",
            borderRadius: "1vw",
            padding: "2.5vh 2.5vw",
          }}>
            <div className="flex items-center justify-between" style={{ marginBottom: "1.5vh" }}>
              <div>
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.2vw", fontWeight: 700, color: "rgba(0,200,117,0.7)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.3vh" }}>PagoYa Trust Score™</p>
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.3vw", color: "rgba(255,255,255,0.45)" }}>•••• •••• •••• 4721 · 94 días activo</p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "5vw", fontWeight: 900, color: "#00C875", lineHeight: 0.9 }}>742</p>
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.2vw", color: "rgba(255,255,255,0.45)" }}>de 850</p>
              </div>
            </div>
            {/* Score bar */}
            <div style={{ height: "0.8vh", background: "rgba(255,255,255,0.1)", borderRadius: "999px", overflow: "hidden", marginBottom: "1vh" }}>
              <div style={{ height: "100%", width: "87%", background: "linear-gradient(90deg, #046C2C, #00C875)", borderRadius: "999px" }} />
            </div>
            <div className="flex justify-between">
              {[
                { label: "12/12", sub: "pagos a tiempo" },
                { label: "5", sub: "servicios" },
                { label: "4", sub: "sem. racha" },
                { label: "Oro", sub: "nivel" },
              ].map(({ label, sub }) => (
                <div key={sub} style={{ textAlign: "center" }}>
                  <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "1.8vw", fontWeight: 800, color: "#FFFFFF", lineHeight: 1.1 }}>{label}</p>
                  <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.1vw", color: "rgba(255,255,255,0.4)" }}>{sub}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Unlock ladder */}
          <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.2vw", fontWeight: 700, color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
            Qué desbloquea el Trust Score
          </p>

          {[
            { score: "600+", label: "Micro-crédito de emergencia", detail: "$500–2,000 MXN · BNPL para servicios", color: "#00C875", active: true },
            { score: "680+", label: "Seguro de desempleo básico", detail: "Cubre 1 factura si el usuario pierde ingresos", color: "#00C875", active: true },
            { score: "720+", label: "Préstamo personal", detail: "$5,000–20,000 MXN · tasa preferencial", color: "#FF5C1A", active: false },
            { score: "760+", label: "Historial portable — EE.UU., Canadá", detail: "Identidad financiera exportable para la diáspora", color: "#FF5C1A", active: false },
          ].map(({ score, label, detail, color, active }) => (
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
              <span style={{ color: "#FF5C1A", fontWeight: 700 }}>65 millones de personas</span> que los burós de crédito nunca han visto.
              PagoYa es la primera empresa que puede demostrar su solvencia.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
