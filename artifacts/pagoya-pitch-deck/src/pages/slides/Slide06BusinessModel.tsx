export default function Slide06BusinessModel() {
  return (
    <div
      className="relative w-screen h-screen overflow-hidden"
      style={{ background: "#0A2540" }}
    >
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at 60% 40%, rgba(29,158,117,0.08) 0%, transparent 60%)"
        }}
      />

      <div className="relative z-10 flex flex-col" style={{ padding: "6vh 8vw 5vh" }}>
        <div style={{ marginBottom: "3.5vh" }}>
          <p
            style={{
              fontFamily: "DM Sans, sans-serif",
              fontSize: "1.6vw",
              fontWeight: 700,
              color: "#1D9E75",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              marginBottom: "1.2vh"
            }}
          >
            Business Model
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
            $25 MXN flat fee per transaction.
            Profitable from day one.
          </h2>
          <div style={{ width: "6vw", height: "0.4vh", background: "#1D9E75" }} />
        </div>

        <div className="grid grid-cols-3 gap-[2.5vw]" style={{ marginBottom: "3.5vh" }}>
          <div
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "0.8vw",
              padding: "3vh 2.5vw"
            }}
          >
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.6vw", fontWeight: 700, color: "#8BA8C0", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "1.5vh" }}>
              Per User
            </p>
            <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "5.5vw", fontWeight: 900, color: "#1D9E75", lineHeight: 0.9, marginBottom: "0.8vh" }}>
              $100
            </p>
            <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "2vw", fontWeight: 700, color: "#F5F0EB", marginBottom: "0.8vh" }}>
              MXN / month
            </p>
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.7vw", color: "#8BA8C0", lineHeight: 1.3 }}>
              Avg household: 4 payments/month
            </p>
          </div>

          <div
            style={{
              background: "rgba(29,158,117,0.08)",
              border: "1px solid rgba(29,158,117,0.3)",
              borderRadius: "0.8vw",
              padding: "3vh 2.5vw"
            }}
          >
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.6vw", fontWeight: 700, color: "#1D9E75", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "1.5vh" }}>
              Year 1
            </p>
            <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "4.5vw", fontWeight: 900, color: "#F5F0EB", lineHeight: 0.9, marginBottom: "0.8vh" }}>
              5,000
            </p>
            <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "2vw", fontWeight: 700, color: "#F5F0EB", marginBottom: "0.8vh" }}>
              active users
            </p>
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.7vw", color: "#1D9E75", lineHeight: 1.3, fontWeight: 700 }}>
              $6M MXN ARR (~$300K USD)
            </p>
          </div>

          <div
            style={{
              background: "rgba(216,90,48,0.08)",
              border: "1px solid rgba(216,90,48,0.3)",
              borderRadius: "0.8vw",
              padding: "3vh 2.5vw"
            }}
          >
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.6vw", fontWeight: 700, color: "#D85A30", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "1.5vh" }}>
              Year 2
            </p>
            <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "4.5vw", fontWeight: 900, color: "#F5F0EB", lineHeight: 0.9, marginBottom: "0.8vh" }}>
              25,000
            </p>
            <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "2vw", fontWeight: 700, color: "#F5F0EB", marginBottom: "0.8vh" }}>
              active users
            </p>
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.7vw", color: "#D85A30", lineHeight: 1.3, fontWeight: 700 }}>
              $30M MXN ARR (~$1.5M USD)
            </p>
          </div>
        </div>

        <div
          style={{
            background: "rgba(29,158,117,0.1)",
            borderLeft: "0.4vw solid #1D9E75",
            padding: "2vh 2.5vw",
            borderRadius: "0 0.6vw 0.6vw 0"
          }}
        >
          <p
            style={{
              fontFamily: "DM Sans, sans-serif",
              fontSize: "2vw",
              fontWeight: 500,
              color: "#F5F0EB",
              lineHeight: 1.4
            }}
          >
            Direct rails (SIPREL, Taecel, STP) remove aggregator markups — unit economics are
            <span style={{ color: "#1D9E75", fontWeight: 700 }}> profitable at $25 MXN from launch</span>, not a loss-leader.
          </p>
        </div>
      </div>
    </div>
  );
}
