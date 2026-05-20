export default function Slide07Infrastructure() {
  return (
    <div
      className="relative w-screen h-screen overflow-hidden"
      style={{ background: "#0A2540" }}
    >
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at 85% 70%, rgba(29,158,117,0.07) 0%, transparent 55%)"
        }}
      />

      <div className="relative z-10 flex h-full">
        <div className="flex flex-col justify-center" style={{ padding: "7vh 5vw 7vh 8vw", width: "48%" }}>
          <p
            style={{
              fontFamily: "DM Sans, sans-serif",
              fontSize: "1.6vw",
              fontWeight: 700,
              color: "#1D9E75",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              marginBottom: "1.8vh"
            }}
          >
            Infrastructure
          </p>
          <h2
            style={{
              fontFamily: "Barlow Condensed, sans-serif",
              fontSize: "5vw",
              fontWeight: 900,
              color: "#F5F0EB",
              letterSpacing: "-0.01em",
              lineHeight: 1,
              marginBottom: "1.5vh"
            }}
          >
            Direct rails.
            No intermediaries.
          </h2>
          <div style={{ width: "6vw", height: "0.4vh", background: "#1D9E75", marginBottom: "3.5vh" }} />
          <p
            style={{
              fontFamily: "DM Sans, sans-serif",
              fontSize: "2vw",
              color: "#8BA8C0",
              lineHeight: 1.5,
              marginBottom: "2vh"
            }}
          >
            Most competitors route through 2–3 intermediary layers, paying a markup at each step.
          </p>
          <p
            style={{
              fontFamily: "Barlow Condensed, sans-serif",
              fontSize: "2.5vw",
              fontWeight: 700,
              color: "#1D9E75",
              lineHeight: 1.2
            }}
          >
            PagoYa does not.
          </p>
        </div>

        <div
          className="flex flex-col justify-center"
          style={{ flex: 1, padding: "7vh 8vw 7vh 3vw", gap: "2.5vh" }}
        >
          <div
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(29,158,117,0.2)",
              borderRadius: "0.8vw",
              padding: "2.5vh 2.5vw"
            }}
          >
            <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "2.4vw", fontWeight: 800, color: "#F5F0EB", marginBottom: "0.6vh" }}>
              DigitalFemsa / Conekta
            </p>
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.8vw", color: "#1D9E75", fontWeight: 600, marginBottom: "0.4vh" }}>
              OXXO cash-in at 22,000 locations + card processing
            </p>
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.7vw", color: "#8BA8C0", lineHeight: 1.3 }}>
              The fintech arm of FEMSA — every OXXO store is a PagoYa cash deposit point
            </p>
          </div>

          <div
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(29,158,117,0.2)",
              borderRadius: "0.8vw",
              padding: "2.5vh 2.5vw"
            }}
          >
            <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "2.4vw", fontWeight: 800, color: "#F5F0EB", marginBottom: "0.6vh" }}>
              STP — Sistema de Transferencias y Pagos
            </p>
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.8vw", color: "#1D9E75", fontWeight: 600, marginBottom: "0.4vh" }}>
              Direct SPEI interbank rails — application submitted
            </p>
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.7vw", color: "#8BA8C0", lineHeight: 1.3 }}>
              Mexico's official interbank settlement infrastructure. Most fintechs access SPEI through a bank intermediary — we will not.
            </p>
          </div>

          <div
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(29,158,117,0.2)",
              borderRadius: "0.8vw",
              padding: "2.5vh 2.5vw"
            }}
          >
            <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "2.4vw", fontWeight: 800, color: "#F5F0EB", marginBottom: "0.6vh" }}>
              SIPREL + Taecel
            </p>
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.8vw", color: "#1D9E75", fontWeight: 600, marginBottom: "0.4vh" }}>
              Direct aggregator contracts — 10+ utility providers
            </p>
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.7vw", color: "#8BA8C0", lineHeight: 1.3 }}>
              CFE, Telmex, Sky, Izzi, TotalPlay, Gas Natural, Telcel, AT&T, Megacable, Dish
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
