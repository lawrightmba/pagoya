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

      <div className="relative z-10 flex flex-col" style={{ padding: "6vh 8vw 5vh" }}>
        <div style={{ marginBottom: "3.5vh" }}>
          <p
            style={{
              fontFamily: "DM Sans, sans-serif",
              fontSize: "1.6vw",
              fontWeight: 700,
              color: "#FF5C1A",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              marginBottom: "1.2vh"
            }}
          >
            Competitive Landscape
          </p>
          <h2
            style={{
              fontFamily: "Barlow Condensed, sans-serif",
              fontSize: "4.5vw",
              fontWeight: 900,
              color: "#FFFFFF",
              letterSpacing: "-0.01em",
              lineHeight: 1,
              marginBottom: "1.5vh"
            }}
          >
            Why existing options fail our user
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
          {["OXXO Pay", "Mercado Pago", "Spin by OXXO", "PagoYa"].map((name, i) => (
            <div
              key={name}
              style={{
                background: i === 3 ? "rgba(0,200,117,0.12)" : "rgba(255,255,255,0.03)",
                padding: "1.8vh 1.5vw",
                borderBottom: "1px solid rgba(255,255,255,0.07)",
                borderLeft: "1px solid rgba(255,255,255,0.07)"
              }}
            >
              <p style={{
                fontFamily: "Barlow Condensed, sans-serif",
                fontSize: "2vw",
                fontWeight: 800,
                color: i === 3 ? "#00C875" : "#FFFFFF",
                lineHeight: 1.1
              }}>
                {name}
              </p>
            </div>
          ))}

          {[
            { label: "Flat fee", vals: ["Per service", "Variable", "Variable", "$25 MXN"] },
            { label: "No app download", vals: ["N/A", "Required", "Required", "None needed"] },
            { label: "Gift cards", vals: ["No", "Limited", "No", "Yes — live"] },
            { label: "Street activation", vals: ["No", "No", "No", "Yes"] },
            { label: "WhatsApp AI agent", vals: ["No", "Bot only", "No", "Yes — Paula"] },
          ].map((row) => (
            <div key={row.label} style={{ display: "contents" }}>
              <div style={{ background: "rgba(255,255,255,0.03)", padding: "1.5vh 1.8vw", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.7vw", color: "rgba(255,255,255,0.55)", fontWeight: 500 }}>{row.label}</p>
              </div>
              {row.vals.map((val, i) => (
                <div
                  key={i}
                  style={{
                    background: i === 3 ? "rgba(0,200,117,0.07)" : "transparent",
                    padding: "1.5vh 1.5vw",
                    borderBottom: "1px solid rgba(255,255,255,0.07)",
                    borderLeft: "1px solid rgba(255,255,255,0.07)"
                  }}
                >
                  <p style={{
                    fontFamily: "DM Sans, sans-serif",
                    fontSize: "1.7vw",
                    color: i === 3 ? "#00C875" : (["No", "Required", "Bot only", "Per service", "Variable", "Limited"].includes(val) ? "rgba(255,255,255,0.4)" : "#FFFFFF"),
                    fontWeight: i === 3 ? 700 : 400
                  }}>
                    {val}
                  </p>
                </div>
              ))}
            </div>
          ))}
        </div>

        <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.9vw", fontWeight: 500, color: "#FFFFFF", lineHeight: 1.4 }}>
          PagoYa is the only wallet built specifically for
          <span style={{ color: "#00C875", fontWeight: 700 }}> cash-first, smartphone-hesitant users</span> —
          activated in person, operated via WhatsApp AI, priced at a single flat fee.
        </p>
      </div>
    </div>
  );
}
