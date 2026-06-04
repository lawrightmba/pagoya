export default function Slide10Traction() {
  const rails = [
    { name: "Stripe", detail: "Card payments (Visa, Mastercard)", note: "Live May 31, 2026", live: true },
    { name: "SIPREL", detail: "Bill payment network — 10+ utility providers", note: "CFE, Telmex, Sky, Izzi, TotalPlay, Gas Natural, Telcel, AT&T, Megacable, Dish", live: true },
    { name: "Conekta / OXXO", detail: "OXXO cash-in + card processing", note: "22,000 deposit locations nationwide", live: true },
    { name: "Belvo", detail: "Open banking / bank direct debit", note: "Account linking & direct payment", live: true },
    { name: "Gift Cards", detail: "Netflix · Amazon · Google Play · Spotify", note: "First Netflix purchase processed June 2026", live: true },
    { name: "STP / SPEI", detail: "Direct interbank transfer rails", note: "Corporate docs submitted — go-live credentials requested", live: false },
  ];

  return (
    <div
      className="relative w-screen h-screen overflow-hidden"
      style={{ background: "#004F2D" }}
    >
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse at 85% 70%, rgba(0,200,117,0.08) 0%, transparent 55%)" }}
      />

      <div className="relative z-10 flex h-full">
        <div className="flex flex-col justify-center" style={{ padding: "7vh 4vw 7vh 8vw", width: "44%" }}>
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
            Infrastructure
          </p>
          <h2
            style={{
              fontFamily: "Barlow Condensed, sans-serif",
              fontSize: "5vw",
              fontWeight: 900,
              color: "#FFFFFF",
              letterSpacing: "-0.01em",
              lineHeight: 1,
              marginBottom: "1.5vh"
            }}
          >
            5 rails live.
            No intermediaries.
          </h2>
          <div style={{ width: "6vw", height: "0.4vh", background: "#00C875", marginBottom: "3.5vh" }} />
          <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.9vw", color: "rgba(255,255,255,0.6)", lineHeight: 1.5, marginBottom: "2vh" }}>
            Most competitors route through 2–3 intermediary layers, paying a markup at each step.
          </p>
          <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "2.5vw", fontWeight: 700, color: "#00C875", lineHeight: 1.2 }}>
            PagoYa does not.
          </p>
        </div>

        <div className="flex flex-col justify-center" style={{ flex: 1, padding: "7vh 8vw 7vh 3vw", gap: "1.8vh" }}>
          {rails.map(({ name, detail, note, live }) => (
            <div
              key={name}
              style={{
                background: live ? "rgba(0,200,117,0.07)" : "rgba(255,92,26,0.07)",
                border: `1px solid ${live ? "rgba(0,200,117,0.2)" : "rgba(255,92,26,0.2)"}`,
                borderRadius: "0.7vw",
                padding: "1.8vh 2.2vw",
                display: "flex",
                alignItems: "flex-start",
                gap: "1.2vw"
              }}
            >
              <span style={{ fontSize: "1.7vw", lineHeight: 1, marginTop: "0.2vh", flexShrink: 0 }}>{live ? "✅" : "🔜"}</span>
              <div style={{ flex: 1 }}>
                <div className="flex items-baseline gap-[1vw]">
                  <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "2.2vw", fontWeight: 800, color: "#FFFFFF", lineHeight: 1.1 }}>
                    {name}
                  </p>
                  <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.6vw", color: live ? "#00C875" : "#FF5C1A", fontWeight: 600 }}>
                    {detail}
                  </p>
                </div>
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.5vw", color: "rgba(255,255,255,0.5)", lineHeight: 1.3 }}>
                  {note}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
