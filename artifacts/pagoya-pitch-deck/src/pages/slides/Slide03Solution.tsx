export default function Slide03Solution() {
  return (
    <div
      className="relative w-screen h-screen overflow-hidden flex"
      style={{ background: "#0A2540" }}
    >
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at 20% 50%, rgba(29,158,117,0.1) 0%, transparent 65%)"
        }}
      />

      <div
        className="absolute left-0 top-0 bottom-0"
        style={{ width: "0.4vw", background: "linear-gradient(180deg, #1D9E75 0%, transparent 100%)", opacity: 0.7 }}
      />

      <div className="relative z-10 flex flex-col justify-center" style={{ padding: "7vh 8vw", width: "100%" }}>
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
          The Solution
        </p>
        <h2
          style={{
            fontFamily: "Barlow Condensed, sans-serif",
            fontSize: "5.5vw",
            fontWeight: 900,
            color: "#F5F0EB",
            letterSpacing: "-0.01em",
            lineHeight: 1,
            marginBottom: "1.5vh"
          }}
        >
          One cash load.
          Every bill from your phone.
        </h2>
        <div style={{ width: "6vw", height: "0.4vh", background: "#1D9E75", marginBottom: "4vh" }} />

        <div className="flex gap-[6vw]">
          <div className="flex flex-col gap-[2.6vh]" style={{ flex: 1 }}>
            <div className="flex items-start gap-[1.4vw]">
              <span
                style={{
                  fontFamily: "Barlow Condensed, sans-serif",
                  fontSize: "2.8vw",
                  fontWeight: 900,
                  color: "#1D9E75",
                  lineHeight: 1,
                  minWidth: "3vw"
                }}
              >
                01
              </span>
              <div>
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "2vw", fontWeight: 700, color: "#F5F0EB", lineHeight: 1.2, marginBottom: "0.4vh" }}>
                  Load once at OXXO or by mobile
                </p>
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.8vw", color: "#8BA8C0", lineHeight: 1.3 }}>
                  Any of 22,000 locations — wallet credited in real time
                </p>
              </div>
            </div>
            <div className="flex items-start gap-[1.4vw]">
              <span
                style={{
                  fontFamily: "Barlow Condensed, sans-serif",
                  fontSize: "2.8vw",
                  fontWeight: 900,
                  color: "#1D9E75",
                  lineHeight: 1,
                  minWidth: "3vw"
                }}
              >
                02
              </span>
              <div>
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "2vw", fontWeight: 700, color: "#F5F0EB", lineHeight: 1.2, marginBottom: "0.4vh" }}>
                  Pay any utility from pagoyamx.com
                </p>
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.8vw", color: "#8BA8C0", lineHeight: 1.3 }}>
                  CFE, Telmex, Izzi, TotalPlay, Gas Natural, Telcel, Sky, Megacable, Dish
                </p>
              </div>
            </div>
            <div className="flex items-start gap-[1.4vw]">
              <span
                style={{
                  fontFamily: "Barlow Condensed, sans-serif",
                  fontSize: "2.8vw",
                  fontWeight: 900,
                  color: "#1D9E75",
                  lineHeight: 1,
                  minWidth: "3vw"
                }}
              >
                03
              </span>
              <div>
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "2vw", fontWeight: 700, color: "#F5F0EB", lineHeight: 1.2, marginBottom: "0.4vh" }}>
                  Confirmed via WhatsApp
                </p>
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.8vw", color: "#8BA8C0", lineHeight: 1.3 }}>
                  Instant receipt, permanent record, due-date reminders
                </p>
              </div>
            </div>
          </div>

          <div
            style={{
              flex: "0 0 26vw",
              background: "rgba(29,158,117,0.08)",
              border: "1px solid rgba(29,158,117,0.25)",
              borderRadius: "1vw",
              padding: "3.5vh 2.5vw",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              gap: "2.5vh"
            }}
          >
            <p
              style={{
                fontFamily: "Barlow Condensed, sans-serif",
                fontSize: "8vw",
                fontWeight: 900,
                color: "#1D9E75",
                lineHeight: 0.9,
                letterSpacing: "-0.02em"
              }}
            >
              $25
            </p>
            <p
              style={{
                fontFamily: "Barlow Condensed, sans-serif",
                fontSize: "2.2vw",
                fontWeight: 700,
                color: "#F5F0EB",
                lineHeight: 1.1
              }}
            >
              MXN flat fee
            </p>
            <div style={{ width: "3vw", height: "0.35vh", background: "#1D9E75" }} />
            <p
              style={{
                fontFamily: "DM Sans, sans-serif",
                fontSize: "1.8vw",
                color: "#8BA8C0",
                lineHeight: 1.4
              }}
            >
              Any service. Any amount. No app store download required.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
