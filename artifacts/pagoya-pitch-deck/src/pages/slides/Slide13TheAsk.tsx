export default function Slide13TheAsk() {
  return (
    <div
      className="relative w-screen h-screen overflow-hidden"
      style={{ background: "#004F2D" }}
    >
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse at 50% 50%, rgba(0,200,117,0.12) 0%, transparent 65%)" }}
      />

      <div className="absolute inset-0 flex flex-col justify-between" style={{ padding: "6.5vh 8vw" }}>
        <div>
          <p
            style={{
              fontFamily: "DM Sans, sans-serif",
              fontSize: "1.6vw",
              fontWeight: 700,
              color: "#00C875",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              marginBottom: "1.8vh"
            }}
          >
            La Inversión
          </p>
          <h2
            style={{
              fontFamily: "Barlow Condensed, sans-serif",
              fontSize: "5.8vw",
              fontWeight: 900,
              color: "#FFFFFF",
              letterSpacing: "-0.01em",
              lineHeight: 1,
              marginBottom: "1.5vh"
            }}
          >
            Pre-semilla: $250K–$750K USD
          </h2>
          <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.9vw", color: "rgba(255,255,255,0.55)", marginBottom: "1.5vh" }}>
            SAFE · 18 meses de operación · Meta: 2,500 billeteras activas · Actualmente en: Founder Institute Austin Verano 2026
          </p>
          <div style={{ width: "6vw", height: "0.4vh", background: "#00C875", marginBottom: "4vh" }} />
        </div>

        <div className="grid grid-cols-4 gap-[2vw]">
          <div style={{ background: "rgba(0,200,117,0.1)", border: "1px solid rgba(0,200,117,0.25)", borderRadius: "0.8vw", padding: "2.5vh 2vw" }}>
            <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "5.5vw", fontWeight: 900, color: "#00C875", lineHeight: 0.9, marginBottom: "1vh" }}>40%</p>
            <div style={{ width: "2.5vw", height: "0.3vh", background: "#00C875", marginBottom: "1.2vh" }} />
            <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "2vw", fontWeight: 700, color: "#FFFFFF", marginBottom: "0.6vh" }}>Tecnología</p>
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.65vw", color: "rgba(255,255,255,0.55)", lineHeight: 1.3 }}>Integración STP/SPEI · WhatsApp Business API · Fortalecimiento de plataforma</p>
          </div>
          <div style={{ background: "rgba(255,92,26,0.1)", border: "1px solid rgba(255,92,26,0.25)", borderRadius: "0.8vw", padding: "2.5vh 2vw" }}>
            <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "5.5vw", fontWeight: 900, color: "#FF5C1A", lineHeight: 0.9, marginBottom: "1vh" }}>30%</p>
            <div style={{ width: "2.5vw", height: "0.3vh", background: "#FF5C1A", marginBottom: "1.2vh" }} />
            <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "2vw", fontWeight: 700, color: "#FFFFFF", marginBottom: "0.6vh" }}>Crecimiento</p>
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.65vw", color: "rgba(255,255,255,0.55)", lineHeight: 1.3 }}>Expansión de red de representantes a 3 ciudades · Primeras 2,500 billeteras activas</p>
          </div>
          <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "0.8vw", padding: "2.5vh 2vw" }}>
            <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "5.5vw", fontWeight: 900, color: "rgba(255,255,255,0.7)", lineHeight: 0.9, marginBottom: "1vh" }}>20%</p>
            <div style={{ width: "2.5vw", height: "0.3vh", background: "rgba(255,255,255,0.7)", marginBottom: "1.2vh" }} />
            <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "2vw", fontWeight: 700, color: "#FFFFFF", marginBottom: "0.6vh" }}>Regulatorio</p>
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.65vw", color: "rgba(255,255,255,0.55)", lineHeight: 1.3 }}>Preparación licencia CNBV SOFOM · Infraestructura legal</p>
          </div>
          <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "0.8vw", padding: "2.5vh 2vw" }}>
            <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "5.5vw", fontWeight: 900, color: "rgba(255,255,255,0.7)", lineHeight: 0.9, marginBottom: "1vh" }}>10%</p>
            <div style={{ width: "2.5vw", height: "0.3vh", background: "rgba(255,255,255,0.7)", marginBottom: "1.2vh" }} />
            <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "2vw", fontWeight: 700, color: "#FFFFFF", marginBottom: "0.6vh" }}>Operaciones</p>
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.65vw", color: "rgba(255,255,255,0.55)", lineHeight: 1.3 }}>Equipo · Cumplimiento · Infraestructura de soporte al cliente</p>
          </div>
        </div>

        <div className="flex items-center justify-between" style={{ marginTop: "2.5vh" }}>
          <div
            style={{
              background: "rgba(0,200,117,0.1)",
              borderLeft: "0.4vw solid #00C875",
              padding: "1.5vh 2vw",
              borderRadius: "0 0.6vw 0.6vw 0"
            }}
          >
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.75vw", fontWeight: 500, color: "#FFFFFF", lineHeight: 1.4 }}>
              5 rieles activos · Tarjetas de regalo activas · Equipo en campo · Founder Institute Austin Verano 2026
            </p>
          </div>
          <div className="flex flex-col items-end gap-[0.5vh]">
            <span style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.9vw", fontWeight: 700, color: "#FFFFFF" }}>
              Lloyd A. Wright, MBA
            </span>
            <span style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.7vw", color: "#00C875" }}>
              lloyd@pagoyamx.com · pagoyamx.com
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
