export default function Slide11Why500() {
  return (
    <div
      className="relative w-screen h-screen overflow-hidden"
      style={{ background: "#0A2540" }}
    >
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at 70% 50%, rgba(29,158,117,0.09) 0%, transparent 60%)"
        }}
      />

      <div
        className="absolute right-0 top-0 bottom-0"
        style={{ width: "0.4vw", background: "linear-gradient(180deg, #1D9E75 0%, transparent 100%)", opacity: 0.6 }}
      />

      <div className="relative z-10 flex h-full">
        <div className="flex flex-col justify-center" style={{ padding: "7vh 5vw 7vh 8vw", width: "50%" }}>
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
            Why 500 Global
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
            500's LATAM portfolio
            has been here before.
          </h2>
          <div style={{ width: "6vw", height: "0.4vh", background: "#1D9E75", marginBottom: "3.5vh" }} />
          <p
            style={{
              fontFamily: "DM Sans, sans-serif",
              fontSize: "2vw",
              color: "#8BA8C0",
              lineHeight: 1.6,
              marginBottom: "3vh"
            }}
          >
            Clip, Kueski — operators who solved CNBV licensing, SPEI rails, and city-by-city scaling in Mexico.
          </p>
          <div
            style={{
              background: "rgba(29,158,117,0.1)",
              borderLeft: "0.4vw solid #1D9E75",
              padding: "2vh 2vw",
              borderRadius: "0 0.6vw 0.6vw 0"
            }}
          >
            <p
              style={{
                fontFamily: "DM Sans, sans-serif",
                fontSize: "1.9vw",
                fontWeight: 500,
                color: "#F5F0EB",
                lineHeight: 1.5,
                fontStyle: "italic"
              }}
            >
              "We are not applying for validation. We are applying because the mistakes we are about to make have already been made and solved by operators in your network."
            </p>
          </div>
        </div>

        <div
          className="flex flex-col justify-center"
          style={{ flex: 1, padding: "7vh 8vw 7vh 4vw", gap: "2.8vh" }}
        >
          <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "2vw", fontWeight: 700, color: "#8BA8C0", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.5vh" }}>
            What we want from 500
          </p>

          <div className="flex items-start gap-[1.5vw]">
            <span style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "3vw", fontWeight: 900, color: "#1D9E75", lineHeight: 1, minWidth: "2.5vw" }}>01</span>
            <div>
              <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "2vw", fontWeight: 700, color: "#F5F0EB", marginBottom: "0.4vh" }}>
                Regulatory navigation
              </p>
              <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.8vw", color: "#8BA8C0", lineHeight: 1.3 }}>
                CNBV SOFOM licensing as wallet volume scales, Banxico SPEI reporting thresholds
              </p>
            </div>
          </div>

          <div className="flex items-start gap-[1.5vw]">
            <span style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "3vw", fontWeight: 900, color: "#1D9E75", lineHeight: 1, minWidth: "2.5vw" }}>02</span>
            <div>
              <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "2vw", fontWeight: 700, color: "#F5F0EB", marginBottom: "0.4vh" }}>
                Rep network scaling playbook
              </p>
              <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.8vw", color: "#8BA8C0", lineHeight: 1.3 }}>
                From 2 reps in Puerto Vallarta to 50+ reps across 5 Mexican cities
              </p>
            </div>
          </div>

          <div className="flex items-start gap-[1.5vw]">
            <span style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "3vw", fontWeight: 900, color: "#1D9E75", lineHeight: 1, minWidth: "2.5vw" }}>03</span>
            <div>
              <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "2vw", fontWeight: 700, color: "#F5F0EB", marginBottom: "0.4vh" }}>
                Demo Day access
              </p>
              <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.8vw", color: "#8BA8C0", lineHeight: 1.3 }}>
                LATAM fintech investors who understand our unit economics — not US SaaS investors who will misread $25 MXN flat fee
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
