export default function Slide05HowItWorks() {
  return (
    <div
      className="relative w-screen h-screen overflow-hidden"
      style={{ background: "#004F2D" }}
    >
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at 50% 80%, rgba(0,200,117,0.08) 0%, transparent 60%)"
        }}
      />

      <div className="relative z-10 flex flex-col" style={{ padding: "6.5vh 8vw 5vh" }}>
        <div style={{ marginBottom: "3.5vh" }}>
          <p
            style={{
              fontFamily: "DM Sans, sans-serif",
              fontSize: "1.6vw",
              fontWeight: 700,
              color: "#00C875",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              marginBottom: "1.2vh"
            }}
          >
            Tamaño del Mercado
          </p>
          <h2
            style={{
              fontFamily: "Barlow Condensed, sans-serif",
              fontSize: "4.8vw",
              fontWeight: 900,
              color: "#FFFFFF",
              letterSpacing: "-0.01em",
              lineHeight: 1,
              marginBottom: "1.5vh"
            }}
          >
            Tres mercados masivos.
            Una billetera para servirlos a todos.
          </h2>
          <div style={{ width: "6vw", height: "0.4vh", background: "#00C875" }} />
        </div>

        <div className="grid grid-cols-4 gap-[2vw]" style={{ marginBottom: "3.5vh" }}>
          <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "0.8vw", padding: "2.8vh 2vw" }}>
            <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "5.5vw", fontWeight: 900, color: "#00C875", lineHeight: 0.9, marginBottom: "1.2vh" }}>65M</p>
            <div style={{ width: "2.5vw", height: "0.3vh", background: "#00C875", marginBottom: "1.2vh" }} />
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.65vw", color: "rgba(255,255,255,0.55)", lineHeight: 1.3 }}>adultos no bancarizados en México</p>
          </div>
          <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "0.8vw", padding: "2.8vh 2vw" }}>
            <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "5.5vw", fontWeight: 900, color: "#00C875", lineHeight: 0.9, marginBottom: "1.2vh" }}>22K</p>
            <div style={{ width: "2.5vw", height: "0.3vh", background: "#00C875", marginBottom: "1.2vh" }} />
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.65vw", color: "rgba(255,255,255,0.55)", lineHeight: 1.3 }}>ubicaciones OXXO procesando pagos en efectivo diariamente</p>
          </div>
          <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "0.8vw", padding: "2.8vh 2vw" }}>
            <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "5.5vw", fontWeight: 900, color: "#FF5C1A", lineHeight: 0.9, marginBottom: "1.2vh" }}>$1B+</p>
            <div style={{ width: "2.5vw", height: "0.3vh", background: "#FF5C1A", marginBottom: "1.2vh" }} />
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.65vw", color: "rgba(255,255,255,0.55)", lineHeight: 1.3 }}>MXN en ingresos anuales por comisiones de pago</p>
          </div>
          <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "0.8vw", padding: "2.8vh 2vw" }}>
            <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "5.5vw", fontWeight: 900, color: "#FF5C1A", lineHeight: 0.9, marginBottom: "1.2vh" }}>$4.2B</p>
            <div style={{ width: "2.5vw", height: "0.3vh", background: "#FF5C1A", marginBottom: "1.2vh" }} />
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.65vw", color: "rgba(255,255,255,0.55)", lineHeight: 1.3 }}>MXN mercado mexicano de tarjetas de regalo digitales 2025</p>
          </div>
        </div>

        <div className="flex gap-[2vw]">
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.8vh" }}>
              <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.6vw", fontWeight: 600, color: "#FFFFFF" }}>Pagos de Servicios (SAM)</p>
              <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.5vw", color: "rgba(255,255,255,0.5)" }}>$180B MXN mercado anual</p>
            </div>
            <div style={{ height: "1.5vh", background: "rgba(255,255,255,0.08)", borderRadius: "1vw", overflow: "hidden" }}>
              <div style={{ width: "75%", height: "100%", background: "#00C875", borderRadius: "1vw" }} />
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.8vh" }}>
              <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.6vw", fontWeight: 600, color: "#FFFFFF" }}>Tarjetas de Regalo Digitales</p>
              <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.5vw", color: "rgba(255,255,255,0.5)" }}>$4.2B MXN · mayor crecimiento</p>
            </div>
            <div style={{ height: "1.5vh", background: "rgba(255,255,255,0.08)", borderRadius: "1vw", overflow: "hidden" }}>
              <div style={{ width: "45%", height: "100%", background: "#FF5C1A", borderRadius: "1vw" }} />
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.8vh" }}>
              <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.6vw", fontWeight: 600, color: "#FFFFFF" }}>Transferencias P2P (siguiente)</p>
              <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.5vw", color: "rgba(255,255,255,0.5)" }}>$42B MXN transferencias informales</p>
            </div>
            <div style={{ height: "1.5vh", background: "rgba(255,255,255,0.08)", borderRadius: "1vw", overflow: "hidden" }}>
              <div style={{ width: "30%", height: "100%", background: "rgba(0,200,117,0.45)", borderRadius: "1vw" }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
