export default function Slide04Market() {
  const items = [
    { label: "Stripe card payments", sub: "Live May 31, 2026", live: true },
    { label: "SIPREL bill payment network", sub: "10+ utility providers — CFE, Telmex, Sky, Izzi, Telcel…", live: true },
    { label: "Conekta / OXXO cash-in", sub: "22,000 deposit locations active nationwide", live: true },
    { label: "Belvo open banking", sub: "Bank direct debit & account linking", live: true },
    { label: "Gift cards: Netflix · Amazon · Google Play · Spotify", sub: "First Netflix gift card processed June 2026", live: true },
    { label: "STP / SPEI interbank transfer", sub: "Corporate docs submitted, credentials requested", live: false },
  ];

  return (
    <div
      className="relative w-screen h-screen overflow-hidden"
      style={{ background: "#004F2D" }}
    >
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse at 75% 30%, rgba(0,200,117,0.1) 0%, transparent 60%)" }}
      />

      <div className="relative z-10 flex flex-col" style={{ padding: "6vh 8vw 5vh" }}>
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
            What's Live Right Now
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
            We didn't pitch this.
            We built it.
          </h2>
          <div style={{ width: "6vw", height: "0.4vh", background: "#00C875" }} />
        </div>

        <div className="grid grid-cols-2 gap-x-[3vw] gap-y-[1.8vh]" style={{ marginBottom: "3.5vh" }}>
          {items.map(({ label, sub, live }) => (
            <div
              key={label}
              style={{
                background: live ? "rgba(0,200,117,0.08)" : "rgba(255,92,26,0.07)",
                border: `1px solid ${live ? "rgba(0,200,117,0.25)" : "rgba(255,92,26,0.25)"}`,
                borderRadius: "0.7vw",
                padding: "1.8vh 2vw",
                display: "flex",
                alignItems: "flex-start",
                gap: "1.2vw"
              }}
            >
              <span
                style={{
                  fontFamily: "DM Sans, sans-serif",
                  fontSize: "1.9vw",
                  lineHeight: 1,
                  marginTop: "0.15vh",
                  flexShrink: 0
                }}
              >
                {live ? "✅" : "🔜"}
              </span>
              <div>
                <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "2.1vw", fontWeight: 800, color: "#FFFFFF", lineHeight: 1.1, marginBottom: "0.3vh" }}>
                  {label}
                </p>
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.6vw", color: "rgba(255,255,255,0.55)", lineHeight: 1.3 }}>
                  {sub}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            background: "rgba(0,200,117,0.1)",
            borderLeft: "0.4vw solid #00C875",
            padding: "2vh 2.5vw",
            borderRadius: "0 0.6vw 0.6vw 0"
          }}
        >
          <p
            style={{
              fontFamily: "DM Sans, sans-serif",
              fontSize: "1.9vw",
              fontWeight: 500,
              color: "#FFFFFF",
              lineHeight: 1.4
            }}
          >
            Beta users registered · Street team deployed in Puerto Vallarta colonias · SEO indexed on Google Search Console
          </p>
        </div>
      </div>
    </div>
  );
}
