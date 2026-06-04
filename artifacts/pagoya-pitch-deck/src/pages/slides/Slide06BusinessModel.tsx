export default function Slide06BusinessModel() {
  const rows = [
    { users: "1,000", base: "$60K MXN", target: "$150K MXN", usd: "" },
    { users: "10,000", base: "$600K MXN", target: "$1.5M MXN", usd: "" },
    { users: "100,000", base: "$6M MXN", target: "$15M MXN", usd: "~$350K–$880K USD" },
    { users: "1,000,000", base: "$600M MXN", target: "$1.5B MXN", usd: "~$35M–$88M USD", highlight: true },
  ];

  return (
    <div
      className="relative w-screen h-screen overflow-hidden"
      style={{ background: "#004F2D" }}
    >
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse at 60% 40%, rgba(0,200,117,0.09) 0%, transparent 60%)" }}
      />

      <div className="relative z-10 flex flex-col" style={{ padding: "3vh 8vw 3vh" }}>
        <div style={{ marginBottom: "1.5vh" }}>
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
            Business Model & Revenue
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
            $25 MXN flat fee per transaction.
            2× base · 5× target per wallet.
          </h2>
          <div style={{ width: "6vw", height: "0.4vh", background: "#00C875" }} />
        </div>

        <div className="flex gap-[3vw]" style={{ marginBottom: "2vh" }}>
          <div
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "0.8vw",
              padding: "2.5vh 2.5vw",
              flex: "0 0 20vw"
            }}
          >
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.5vw", fontWeight: 700, color: "rgba(255,255,255,0.5)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "1.2vh" }}>Per Transaction</p>
            <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "6vw", fontWeight: 900, color: "#00C875", lineHeight: 0.9, marginBottom: "0.6vh" }}>$25</p>
            <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "2vw", fontWeight: 700, color: "#FFFFFF" }}>MXN flat</p>
            <div style={{ height: "0.15vh", background: "rgba(255,255,255,0.1)", margin: "1.5vh 0" }} />
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.6vw", color: "rgba(255,255,255,0.55)", lineHeight: 1.3 }}>Bills or gift cards. Direct rails — profitable from transaction 1.</p>
          </div>

          <div style={{ flex: 1 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.8fr 1fr 1fr 1.4fr",
                gap: 0,
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "0.8vw",
                overflow: "hidden"
              }}
            >
              <div style={{ background: "rgba(255,255,255,0.08)", padding: "1.4vh 1.8vw", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.55vw", fontWeight: 700, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Active Wallets</p>
              </div>
              <div style={{ background: "rgba(255,255,255,0.08)", padding: "1.4vh 1.5vw", borderBottom: "1px solid rgba(255,255,255,0.08)", borderLeft: "1px solid rgba(255,255,255,0.08)" }}>
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.55vw", fontWeight: 700, color: "rgba(0,200,117,0.8)", textTransform: "uppercase", letterSpacing: "0.06em" }}>2× / month</p>
              </div>
              <div style={{ background: "rgba(255,92,26,0.1)", padding: "1.4vh 1.5vw", borderBottom: "1px solid rgba(255,255,255,0.08)", borderLeft: "1px solid rgba(255,255,255,0.08)" }}>
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.55vw", fontWeight: 700, color: "#FF5C1A", textTransform: "uppercase", letterSpacing: "0.06em" }}>5× / month</p>
              </div>
              <div style={{ background: "rgba(255,255,255,0.08)", padding: "1.4vh 1.5vw", borderBottom: "1px solid rgba(255,255,255,0.08)", borderLeft: "1px solid rgba(255,255,255,0.08)" }}>
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.55vw", fontWeight: 700, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.06em" }}>USD range</p>
              </div>

              {rows.map(({ users, base, target, usd, highlight }) => (
                <div key={users} style={{ display: "contents" }}>
                  <div style={{ background: highlight ? "rgba(0,200,117,0.1)" : "transparent", padding: "1.4vh 1.8vw", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "2.2vw", fontWeight: 800, color: highlight ? "#00C875" : "#FFFFFF" }}>{users}</p>
                  </div>
                  <div style={{ background: highlight ? "rgba(0,200,117,0.08)" : "transparent", padding: "1.4vh 1.5vw", borderBottom: "1px solid rgba(255,255,255,0.06)", borderLeft: "1px solid rgba(255,255,255,0.06)" }}>
                    <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.7vw", color: highlight ? "#00C875" : "rgba(255,255,255,0.8)", fontWeight: highlight ? 700 : 400 }}>{base}</p>
                  </div>
                  <div style={{ background: highlight ? "rgba(255,92,26,0.1)" : "rgba(255,92,26,0.04)", padding: "1.4vh 1.5vw", borderBottom: "1px solid rgba(255,255,255,0.06)", borderLeft: "1px solid rgba(255,255,255,0.06)" }}>
                    <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.7vw", color: highlight ? "#FF5C1A" : "rgba(255,255,255,0.8)", fontWeight: highlight ? 700 : 400 }}>{target}</p>
                  </div>
                  <div style={{ background: "transparent", padding: "1.4vh 1.5vw", borderBottom: "1px solid rgba(255,255,255,0.06)", borderLeft: "1px solid rgba(255,255,255,0.06)" }}>
                    <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.55vw", color: highlight ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.4)", fontWeight: highlight ? 600 : 400 }}>{usd || "—"}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div
          style={{
            background: "rgba(0,200,117,0.1)",
            borderLeft: "0.4vw solid #00C875",
            padding: "1.8vh 2.5vw",
            borderRadius: "0 0.6vw 0.6vw 0"
          }}
        >
          <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.7vw", fontWeight: 500, color: "#FFFFFF", lineHeight: 1.35 }}>
            Unit economics: direct rails (SIPREL, Conekta, Stripe, Belvo) remove aggregator markups —
            <span style={{ color: "#00C875", fontWeight: 700 }}> profitable at $25 MXN from launch</span>, not a loss-leader.
          </p>
        </div>
      </div>
    </div>
  );
}
