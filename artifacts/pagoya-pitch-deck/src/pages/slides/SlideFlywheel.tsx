export default function SlideFlywheel() {
  return (
    <div
      className="relative w-screen h-screen overflow-hidden"
      style={{ background: "#004F2D" }}
    >
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse at 50% 55%, rgba(0,200,117,0.1) 0%, transparent 65%)" }}
      />

      <div className="relative z-10 flex flex-col h-full" style={{ padding: "4vh 8vw 3.5vh" }}>

        {/* Header */}
        <div style={{ marginBottom: "2.5vh", flexShrink: 0 }}>
          <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.6vw", fontWeight: 700, color: "#00C875", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: "0.8vh" }}>
            El Efecto Compuesto
          </p>
          <h2 style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "4.8vw", fontWeight: 900, color: "#FFFFFF", letterSpacing: "-0.01em", lineHeight: 0.95 }}>
            Un volante de inercia que se acelera solo.
          </h2>
          <div style={{ width: "6vw", height: "0.4vh", background: "#00C875", marginTop: "1.2vh" }} />
        </div>

        <div className="flex gap-[3vw]" style={{ flex: 1, minHeight: 0 }}>

          {/* Flywheel diagram — left */}
          <div style={{ width: "44%", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>

            {/* Outer ring */}
            <div style={{
              width: "38vw", height: "38vw",
              maxWidth: "62vh", maxHeight: "62vh",
              borderRadius: "50%",
              border: "1.5px solid rgba(0,200,117,0.2)",
              position: "absolute",
            }} />

            {/* Rotation arrow hints */}
            {[0, 60, 120, 180, 240, 300].map(deg => (
              <div key={deg} style={{
                position: "absolute",
                width: "1.8vw", height: "1.8vw",
                transform: `rotate(${deg}deg) translateX(17vw) rotate(${90}deg)`,
                transformOrigin: "0 0",
                fontSize: "1.6vw",
                color: "rgba(0,200,117,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>↻</div>
            ))}

            {/* Center hub */}
            <div style={{
              width: "11vw", height: "11vw",
              maxWidth: "17vh", maxHeight: "17vh",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #046C2C 0%, #007A4A 100%)",
              border: "2px solid rgba(0,200,117,0.5)",
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              zIndex: 2,
              boxShadow: "0 0 3vw rgba(0,200,117,0.25)",
              textAlign: "center",
              padding: "0.5vw",
            }}>
              <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "1.8vw", fontWeight: 900, color: "#00C875", lineHeight: 1, marginBottom: "0.2vh" }}>PagoYa</p>
              <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1vw", color: "rgba(255,255,255,0.6)", lineHeight: 1.2 }}>Trust Score<br />Engine</p>
            </div>

            {/* 5 flywheel nodes */}
            {[
              { angle: -90, label: "Pagos de\nservicios", emoji: "💳", color: "#00C875" },
              { angle: -18, label: "Datos de\ncomportamiento", emoji: "🧠", color: "#00C875" },
              { angle: 54, label: "Trust Score\ncreció", emoji: "📈", color: "#FF5C1A" },
              { angle: 126, label: "Productos\nfinancieros", emoji: "🏦", color: "#FF5C1A" },
              { angle: 198, label: "Mayor\nengagement", emoji: "🔄", color: "#00C875" },
            ].map(({ angle, label, emoji, color }) => {
              const rad = (angle * Math.PI) / 180;
              const r = 41; // % of container
              const cx = 50 + r * Math.cos(rad);
              const cy = 50 + r * Math.sin(rad);
              return (
                <div key={label} style={{
                  position: "absolute",
                  left: `${cx}%`, top: `${cy}%`,
                  transform: "translate(-50%, -50%)",
                  background: "rgba(0,30,20,0.92)",
                  border: `1.5px solid ${color === "#00C875" ? "rgba(0,200,117,0.5)" : "rgba(255,92,26,0.5)"}`,
                  borderRadius: "0.6vw",
                  padding: "0.8vh 0.9vw",
                  textAlign: "center",
                  minWidth: "8vw",
                  zIndex: 3,
                  boxShadow: `0 0 1.5vw ${color === "#00C875" ? "rgba(0,200,117,0.15)" : "rgba(255,92,26,0.15)"}`,
                }}>
                  <p style={{ fontSize: "1.6vw", lineHeight: 1, marginBottom: "0.3vh" }}>{emoji}</p>
                  <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.1vw", fontWeight: 700, color: "#FFFFFF", lineHeight: 1.3, whiteSpace: "pre-line" }}>{label}</p>
                </div>
              );
            })}
          </div>

          {/* Right side — two columns of accelerants */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: "1.5vh" }}>

            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.2vw", fontWeight: 700, color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.5vh" }}>
              Aceleradores del volante
            </p>

            {/* Loyalty / gamification block */}
            <div style={{
              background: "linear-gradient(135deg, rgba(255,92,26,0.1) 0%, rgba(255,92,26,0.04) 100%)",
              border: "1px solid rgba(255,92,26,0.3)",
              borderRadius: "0.8vw",
              padding: "1.8vh 2vw",
            }}>
              <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.3vw", fontWeight: 700, color: "#FF5C1A", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "1.1vh" }}>
                🎮 Capa de lealtad y gamificación
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.8vh 2vw" }}>
                {[
                  ["🎡", "Ruleta de bienvenida", "Giro gratis al registrarse — premia desde el día 1"],
                  ["🎯", "Misiones progresivas", "8 misiones activas: Power Payer, Mes Constante, Multi-Servicio"],
                  ["🔥", "Bonus semanal", "+15/+30/+50 pts en pagos #3, #5, #10 de la semana"],
                  ["🏆", "Gran Premio mensual", "$2,000 MXN en sorteo — cada usuario es un participante"],
                ].map(([emoji, title, desc]) => (
                  <div key={title} className="flex items-start gap-[0.7vw]">
                    <span style={{ fontSize: "1.4vw", flexShrink: 0 }}>{emoji}</span>
                    <div>
                      <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.35vw", fontWeight: 700, color: "#FFFFFF", lineHeight: 1.1, marginBottom: "0.1vh" }}>{title}</p>
                      <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.15vw", color: "rgba(255,255,255,0.45)", lineHeight: 1.3 }}>{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Switching costs block */}
            <div style={{
              background: "rgba(0,200,117,0.07)",
              border: "1px solid rgba(0,200,117,0.2)",
              borderRadius: "0.8vw",
              padding: "1.6vh 2vw",
            }}>
              <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.3vw", fontWeight: 700, color: "#00C875", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "1vh" }}>
                🔒 Costos de cambio — por qué se quedan
              </p>
              <div className="flex gap-[2vw]">
                {[
                  { label: "90 días", desc: "Trust Score construido — abandonarlo = empezar desde cero" },
                  { label: "Puntos acumulados", desc: "Canjeable por descuentos — se pierden al salir" },
                  { label: "Paula me conoce", desc: "Mis facturas, vencimientos, historial. Ningún competidor lo tiene." },
                ].map(({ label, desc }) => (
                  <div key={label} style={{ flex: 1, borderLeft: "0.25vw solid rgba(0,200,117,0.3)", paddingLeft: "0.8vw" }}>
                    <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "1.7vw", fontWeight: 800, color: "#00C875", lineHeight: 1, marginBottom: "0.3vh" }}>{label}</p>
                    <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.2vw", color: "rgba(255,255,255,0.5)", lineHeight: 1.35 }}>{desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* The result */}
            <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "0.8vw", padding: "1.6vh 2vw" }}>
              <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.3vw", fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.9vh" }}>
                El resultado después de 12 meses
              </p>
              <div className="flex gap-[3vw]">
                {[
                  { stat: "< $0", label: "CAC neto efectivo", sub: "Rep activa 1 usuario · P2P activa 3–5 más" },
                  { stat: "85%+", label: "Retención a 90 días", sub: "Trust Score crea lock-in natural" },
                  { stat: "5×", label: "Transacciones/mes", sub: "Frecuencia objetivo por billetera activa" },
                ].map(({ stat, label, sub }) => (
                  <div key={label} style={{ textAlign: "center" }}>
                    <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "3.5vw", fontWeight: 900, color: "#00C875", lineHeight: 1, marginBottom: "0.2vh" }}>{stat}</p>
                    <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.35vw", fontWeight: 700, color: "#FFFFFF", marginBottom: "0.1vh" }}>{label}</p>
                    <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.1vw", color: "rgba(255,255,255,0.4)", lineHeight: 1.3 }}>{sub}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
