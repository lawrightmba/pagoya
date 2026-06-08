export default function Slide11Why500() {
  return (
    <div
      className="relative w-screen h-screen overflow-hidden"
      style={{ background: "#004F2D" }}
    >
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse at 50% 20%, rgba(255,92,26,0.07) 0%, transparent 55%)" }}
      />

      <div className="relative z-10 flex flex-col" style={{ padding: "4vh 8vw 4vh" }}>
        <div style={{ marginBottom: "2.5vh" }}>
          <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.6vw", fontWeight: 700, color: "#FF5C1A", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: "0.8vh" }}>
            Panorama Competitivo
          </p>
          <h2 style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "4.5vw", fontWeight: 900, color: "#FFFFFF", letterSpacing: "-0.01em", lineHeight: 1, marginBottom: "1vh" }}>
            Por qué las opciones existentes fallan a nuestro usuario
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
            marginBottom: "3vh"
          }}
        >
          <div style={{ background: "rgba(255,255,255,0.06)", padding: "1.8vh 1.8vw", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.6vw", fontWeight: 700, color: "rgba(255,255,255,0.4)" }}> </p>
          </div>
          <div style={{ background: "rgba(255,255,255,0.03)", padding: "1.8vh 1.5vw", borderBottom: "1px solid rgba(255,255,255,0.07)", borderLeft: "1px solid rgba(255,255,255,0.07)" }}>
            <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "2vw", fontWeight: 800, color: "#FFFFFF", lineHeight: 1.1 }}>OXXO Pay</p>
          </div>
          <div style={{ background: "rgba(255,255,255,0.03)", padding: "1.8vh 1.5vw", borderBottom: "1px solid rgba(255,255,255,0.07)", borderLeft: "1px solid rgba(255,255,255,0.07)" }}>
            <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "2vw", fontWeight: 800, color: "#FFFFFF", lineHeight: 1.1 }}>Mercado Pago</p>
          </div>
          <div style={{ background: "rgba(255,255,255,0.03)", padding: "1.8vh 1.5vw", borderBottom: "1px solid rgba(255,255,255,0.07)", borderLeft: "1px solid rgba(255,255,255,0.07)" }}>
            <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "2vw", fontWeight: 800, color: "#FFFFFF", lineHeight: 1.1 }}>Spin by OXXO</p>
          </div>
          <div style={{ background: "rgba(0,200,117,0.12)", padding: "1.8vh 1.5vw", borderBottom: "1px solid rgba(255,255,255,0.07)", borderLeft: "1px solid rgba(255,255,255,0.07)" }}>
            <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "2vw", fontWeight: 800, color: "#00C875", lineHeight: 1.1 }}>PagoYa</p>
          </div>

          <div style={{ background: "rgba(255,255,255,0.03)", padding: "1.5vh 1.8vw", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.7vw", color: "rgba(255,255,255,0.55)", fontWeight: 500 }}>Tarifa fija</p>
          </div>
          <div style={{ background: "transparent", padding: "1.5vh 1.5vw", borderBottom: "1px solid rgba(255,255,255,0.07)", borderLeft: "1px solid rgba(255,255,255,0.07)" }}>
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.7vw", color: "rgba(255,255,255,0.4)" }}>Por servicio</p>
          </div>
          <div style={{ background: "transparent", padding: "1.5vh 1.5vw", borderBottom: "1px solid rgba(255,255,255,0.07)", borderLeft: "1px solid rgba(255,255,255,0.07)" }}>
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.7vw", color: "rgba(255,255,255,0.4)" }}>Variable</p>
          </div>
          <div style={{ background: "transparent", padding: "1.5vh 1.5vw", borderBottom: "1px solid rgba(255,255,255,0.07)", borderLeft: "1px solid rgba(255,255,255,0.07)" }}>
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.7vw", color: "rgba(255,255,255,0.4)" }}>Variable</p>
          </div>
          <div style={{ background: "rgba(0,200,117,0.07)", padding: "1.5vh 1.5vw", borderBottom: "1px solid rgba(255,255,255,0.07)", borderLeft: "1px solid rgba(255,255,255,0.07)" }}>
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.7vw", color: "#00C875", fontWeight: 700 }}>$25 MXN</p>
          </div>

          <div style={{ background: "rgba(255,255,255,0.03)", padding: "1.5vh 1.8vw", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.7vw", color: "rgba(255,255,255,0.55)", fontWeight: 500 }}>Sin descarga de app</p>
          </div>
          <div style={{ background: "transparent", padding: "1.5vh 1.5vw", borderBottom: "1px solid rgba(255,255,255,0.07)", borderLeft: "1px solid rgba(255,255,255,0.07)" }}>
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.7vw", color: "rgba(255,255,255,0.4)" }}>N/A</p>
          </div>
          <div style={{ background: "transparent", padding: "1.5vh 1.5vw", borderBottom: "1px solid rgba(255,255,255,0.07)", borderLeft: "1px solid rgba(255,255,255,0.07)" }}>
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.7vw", color: "rgba(255,255,255,0.4)" }}>Requerida</p>
          </div>
          <div style={{ background: "transparent", padding: "1.5vh 1.5vw", borderBottom: "1px solid rgba(255,255,255,0.07)", borderLeft: "1px solid rgba(255,255,255,0.07)" }}>
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.7vw", color: "rgba(255,255,255,0.4)" }}>Requerida</p>
          </div>
          <div style={{ background: "rgba(0,200,117,0.07)", padding: "1.5vh 1.5vw", borderBottom: "1px solid rgba(255,255,255,0.07)", borderLeft: "1px solid rgba(255,255,255,0.07)" }}>
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.7vw", color: "#00C875", fontWeight: 700 }}>No requerida</p>
          </div>

          <div style={{ background: "rgba(255,255,255,0.03)", padding: "1.5vh 1.8vw", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.7vw", color: "rgba(255,255,255,0.55)", fontWeight: 500 }}>Tarjetas de regalo</p>
          </div>
          <div style={{ background: "transparent", padding: "1.5vh 1.5vw", borderBottom: "1px solid rgba(255,255,255,0.07)", borderLeft: "1px solid rgba(255,255,255,0.07)" }}>
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.7vw", color: "rgba(255,255,255,0.4)" }}>No</p>
          </div>
          <div style={{ background: "transparent", padding: "1.5vh 1.5vw", borderBottom: "1px solid rgba(255,255,255,0.07)", borderLeft: "1px solid rgba(255,255,255,0.07)" }}>
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.7vw", color: "rgba(255,255,255,0.4)" }}>Limitadas</p>
          </div>
          <div style={{ background: "transparent", padding: "1.5vh 1.5vw", borderBottom: "1px solid rgba(255,255,255,0.07)", borderLeft: "1px solid rgba(255,255,255,0.07)" }}>
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.7vw", color: "rgba(255,255,255,0.4)" }}>No</p>
          </div>
          <div style={{ background: "rgba(0,200,117,0.07)", padding: "1.5vh 1.5vw", borderBottom: "1px solid rgba(255,255,255,0.07)", borderLeft: "1px solid rgba(255,255,255,0.07)" }}>
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.7vw", color: "#00C875", fontWeight: 700 }}>Sí — activas</p>
          </div>

          <div style={{ background: "rgba(255,255,255,0.03)", padding: "1.5vh 1.8vw", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.7vw", color: "rgba(255,255,255,0.55)", fontWeight: 500 }}>Activación en campo</p>
          </div>
          <div style={{ background: "transparent", padding: "1.5vh 1.5vw", borderBottom: "1px solid rgba(255,255,255,0.07)", borderLeft: "1px solid rgba(255,255,255,0.07)" }}>
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.7vw", color: "rgba(255,255,255,0.4)" }}>No</p>
          </div>
          <div style={{ background: "transparent", padding: "1.5vh 1.5vw", borderBottom: "1px solid rgba(255,255,255,0.07)", borderLeft: "1px solid rgba(255,255,255,0.07)" }}>
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.7vw", color: "rgba(255,255,255,0.4)" }}>No</p>
          </div>
          <div style={{ background: "transparent", padding: "1.5vh 1.5vw", borderBottom: "1px solid rgba(255,255,255,0.07)", borderLeft: "1px solid rgba(255,255,255,0.07)" }}>
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.7vw", color: "rgba(255,255,255,0.4)" }}>No</p>
          </div>
          <div style={{ background: "rgba(0,200,117,0.07)", padding: "1.5vh 1.5vw", borderBottom: "1px solid rgba(255,255,255,0.07)", borderLeft: "1px solid rgba(255,255,255,0.07)" }}>
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.7vw", color: "#00C875", fontWeight: 700 }}>Sí</p>
          </div>

          <div style={{ background: "rgba(255,255,255,0.03)", padding: "1.5vh 1.8vw" }}>
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.7vw", color: "rgba(255,255,255,0.55)", fontWeight: 500 }}>Agente IA en WhatsApp</p>
          </div>
          <div style={{ background: "transparent", padding: "1.5vh 1.5vw", borderLeft: "1px solid rgba(255,255,255,0.07)" }}>
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.7vw", color: "rgba(255,255,255,0.4)" }}>No</p>
          </div>
          <div style={{ background: "transparent", padding: "1.5vh 1.5vw", borderLeft: "1px solid rgba(255,255,255,0.07)" }}>
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.7vw", color: "rgba(255,255,255,0.4)" }}>Solo bot</p>
          </div>
          <div style={{ background: "transparent", padding: "1.5vh 1.5vw", borderLeft: "1px solid rgba(255,255,255,0.07)" }}>
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.7vw", color: "rgba(255,255,255,0.4)" }}>No</p>
          </div>
          <div style={{ background: "rgba(0,200,117,0.07)", padding: "1.5vh 1.5vw", borderLeft: "1px solid rgba(255,255,255,0.07)" }}>
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.7vw", color: "#00C875", fontWeight: 700 }}>Sí — Paula</p>
          </div>

          {/* NEW ROW: Trust Score / Financial Identity */}
          <div style={{ background: "rgba(255,92,26,0.06)", padding: "1.5vh 1.8vw", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.7vw", color: "rgba(255,255,255,0.55)", fontWeight: 500 }}>Trust Score / identidad financiera</p>
          </div>
          <div style={{ background: "rgba(255,92,26,0.04)", padding: "1.5vh 1.5vw", borderTop: "1px solid rgba(255,255,255,0.07)", borderLeft: "1px solid rgba(255,255,255,0.07)" }}>
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.7vw", color: "rgba(255,255,255,0.3)" }}>No</p>
          </div>
          <div style={{ background: "rgba(255,92,26,0.04)", padding: "1.5vh 1.5vw", borderTop: "1px solid rgba(255,255,255,0.07)", borderLeft: "1px solid rgba(255,255,255,0.07)" }}>
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.7vw", color: "rgba(255,255,255,0.3)" }}>No</p>
          </div>
          <div style={{ background: "rgba(255,92,26,0.04)", padding: "1.5vh 1.5vw", borderTop: "1px solid rgba(255,255,255,0.07)", borderLeft: "1px solid rgba(255,255,255,0.07)" }}>
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.7vw", color: "rgba(255,255,255,0.3)" }}>No</p>
          </div>
          <div style={{ background: "rgba(255,92,26,0.12)", padding: "1.5vh 1.5vw", borderTop: "1px solid rgba(255,92,26,0.2)", borderLeft: "1px solid rgba(255,255,255,0.07)" }}>
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.7vw", color: "#FF5C1A", fontWeight: 700 }}>✅ Único</p>
          </div>
        </div>

        <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.75vw", fontWeight: 500, color: "#FFFFFF", lineHeight: 1.4 }}>
          PagoYa es la única billetera construida para
          <span style={{ color: "#00C875", fontWeight: 700 }}> usuarios que prefieren efectivo</span> —
          y la única que convierte esos pagos en
          <span style={{ color: "#FF5C1A", fontWeight: 700 }}> identidad financiera portable</span>.
          Esa última fila no la puede copiar ningún competidor en 18 meses.
        </p>
      </div>
    </div>
  );
}
