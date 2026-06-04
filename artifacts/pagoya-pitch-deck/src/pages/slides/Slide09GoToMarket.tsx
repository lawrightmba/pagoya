export default function Slide09GoToMarket() {
  return (
    <div
      className="relative w-screen h-screen overflow-hidden"
      style={{ background: "#004F2D" }}
    >
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse at 30% 60%, rgba(0,200,117,0.1) 0%, transparent 60%)" }}
      />

      <div
        className="absolute left-0 top-0 bottom-0"
        style={{ width: "0.4vw", background: "linear-gradient(180deg, #00C875 0%, transparent 100%)", opacity: 0.7 }}
      />

      <div className="relative z-10 flex h-full" style={{ padding: "6.5vh 8vw" }}>
        <div className="flex flex-col justify-center" style={{ width: "50%", paddingRight: "4vw" }}>
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
            The Data Moat
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
            AI builds financial
            identity for the invisible.
          </h2>
          <div style={{ width: "6vw", height: "0.4vh", background: "#00C875", marginBottom: "3vh" }} />

          <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.9vw", color: "rgba(255,255,255,0.65)", lineHeight: 1.55, marginBottom: "2.5vh" }}>
            Every transaction Paula processes builds a structured financial profile on someone with no bank account and no credit file.
          </p>

          <div
            style={{
              background: "rgba(0,200,117,0.1)",
              borderLeft: "0.4vw solid #00C875",
              padding: "2vh 2vw",
              borderRadius: "0 0.6vw 0.6vw 0"
            }}
          >
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.8vw", fontWeight: 500, color: "#FFFFFF", lineHeight: 1.5, fontStyle: "italic" }}>
              "We are not just processing payments — we are creating financial identity for 65 million invisible people."
            </p>
          </div>
        </div>

        <div className="flex flex-col justify-center" style={{ flex: 1, gap: "2vh" }}>
          <div
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "0.8vw",
              padding: "2.2vh 2.5vw",
              marginBottom: "0.5vh"
            }}
          >
            <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "1.8vw", fontWeight: 700, color: "rgba(255,255,255,0.5)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "1.5vh" }}>
              Data we collect per user
            </p>
            <div className="grid grid-cols-2 gap-x-[2vw] gap-y-[0.8vh]">
              {["Payment history", "Bill cadence", "Income signals", "Service mix", "Cash load patterns", "Payment reliability score"].map(d => (
                <div key={d} className="flex items-center gap-[0.8vw]">
                  <div style={{ width: "0.4vw", height: "0.4vw", borderRadius: "50%", background: "#00C875", flexShrink: 0 }} />
                  <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.65vw", color: "#FFFFFF" }}>{d}</p>
                </div>
              ))}
            </div>
          </div>

          <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "1.8vw", fontWeight: 700, color: "rgba(255,255,255,0.5)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
            What it unlocks (future products)
          </p>

          {[
            { title: "Rent reporting & credit building", sub: "First credit file for users excluded from BURÓ de Crédito", color: "#00C875" },
            { title: "Microloan underwriting", sub: "Behavioral data replaces the credit score no one here has", color: "#00C875" },
            { title: "BNPL for utilities", sub: "Split your CFE into 3 payments — underwritten by our own data", color: "#FF5C1A" },
            { title: "Insurance eligibility scoring", sub: "Life, health, and property for households with zero formal history", color: "#FF5C1A" },
          ].map(({ title, sub, color }) => (
            <div key={title} className="flex items-start gap-[1vw]">
              <div style={{ width: "0.35vw", minWidth: "0.35vw", height: "2.2vh", background: color, marginTop: "0.3vh" }} />
              <div>
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.75vw", fontWeight: 700, color: "#FFFFFF", marginBottom: "0.2vh" }}>{title}</p>
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.55vw", color: "rgba(255,255,255,0.5)", lineHeight: 1.3 }}>{sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
