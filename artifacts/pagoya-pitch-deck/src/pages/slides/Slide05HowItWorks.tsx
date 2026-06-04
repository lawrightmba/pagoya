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
            Market Size
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
            Three massive markets.
            One wallet to serve them all.
          </h2>
          <div style={{ width: "6vw", height: "0.4vh", background: "#00C875" }} />
        </div>

        <div className="grid grid-cols-4 gap-[2vw]" style={{ marginBottom: "3.5vh" }}>
          {[
            { val: "65M", label: "unbanked adults in Mexico", accent: "#00C875" },
            { val: "22K", label: "OXXO locations processing cash bills daily", accent: "#00C875" },
            { val: "$1B+", label: "MXN annual OXXO bill payment fee revenue", accent: "#FF5C1A" },
            { val: "$4.2B", label: "MXN Mexico digital gift card market 2025", accent: "#FF5C1A" },
          ].map(({ val, label, accent }) => (
            <div
              key={val}
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "0.8vw",
                padding: "2.8vh 2vw"
              }}
            >
              <p
                style={{
                  fontFamily: "Barlow Condensed, sans-serif",
                  fontSize: "5.5vw",
                  fontWeight: 900,
                  color: accent,
                  lineHeight: 0.9,
                  marginBottom: "1.2vh"
                }}
              >
                {val}
              </p>
              <div style={{ width: "2.5vw", height: "0.3vh", background: accent, marginBottom: "1.2vh" }} />
              <p
                style={{
                  fontFamily: "DM Sans, sans-serif",
                  fontSize: "1.65vw",
                  color: "rgba(255,255,255,0.55)",
                  lineHeight: 1.3
                }}
              >
                {label}
              </p>
            </div>
          ))}
        </div>

        <div className="flex gap-[2vw]">
          {[
            { label: "Bill Payments (SAM)", pct: 75, color: "#00C875", note: "$180B MXN annual market" },
            { label: "Digital Gift Cards", pct: 45, color: "#FF5C1A", note: "$4.2B MXN · fastest growing" },
            { label: "P2P Transfers (next)", pct: 30, color: "rgba(0,200,117,0.45)", note: "$42B MXN informal transfers" },
          ].map(({ label, pct, color, note }) => (
            <div key={label} style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.8vh" }}>
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.6vw", fontWeight: 600, color: "#FFFFFF" }}>{label}</p>
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.5vw", color: "rgba(255,255,255,0.5)" }}>{note}</p>
              </div>
              <div style={{ height: "1.5vh", background: "rgba(255,255,255,0.08)", borderRadius: "1vw", overflow: "hidden" }}>
                <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: "1vw" }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
