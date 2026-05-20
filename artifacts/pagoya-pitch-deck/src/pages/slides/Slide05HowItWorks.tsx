export default function Slide05HowItWorks() {
  return (
    <div
      className="relative w-screen h-screen overflow-hidden"
      style={{ background: "#0A2540" }}
    >
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at 75% 30%, rgba(29,158,117,0.07) 0%, transparent 55%)"
        }}
      />

      <div className="relative z-10 flex h-full">
        <div className="flex flex-col justify-center" style={{ padding: "7vh 8vw", width: "55%" }}>
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
            How It Works
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
            Three steps.
            Under two minutes.
          </h2>
          <div style={{ width: "6vw", height: "0.4vh", background: "#1D9E75", marginBottom: "4.5vh" }} />

          <div className="flex flex-col gap-[3.5vh]">
            <div className="flex items-start gap-[2vw]">
              <div
                style={{
                  minWidth: "4.5vw",
                  height: "4.5vw",
                  borderRadius: "50%",
                  background: "rgba(29,158,117,0.15)",
                  border: "1px solid rgba(29,158,117,0.4)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <span style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "2.4vw", fontWeight: 900, color: "#1D9E75" }}>1</span>
              </div>
              <div>
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "2.1vw", fontWeight: 700, color: "#F5F0EB", marginBottom: "0.5vh" }}>
                  Register at pagoyamx.com
                </p>
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.8vw", color: "#8BA8C0", lineHeight: 1.3 }}>
                  No app download. No email required.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-[2vw]">
              <div
                style={{
                  minWidth: "4.5vw",
                  height: "4.5vw",
                  borderRadius: "50%",
                  background: "rgba(29,158,117,0.15)",
                  border: "1px solid rgba(29,158,117,0.4)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <span style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "2.4vw", fontWeight: 900, color: "#1D9E75" }}>2</span>
              </div>
              <div>
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "2.1vw", fontWeight: 700, color: "#F5F0EB", marginBottom: "0.5vh" }}>
                  Load cash at any OXXO or by mobile
                </p>
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.8vw", color: "#8BA8C0", lineHeight: 1.3 }}>
                  Wallet credited in real time.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-[2vw]">
              <div
                style={{
                  minWidth: "4.5vw",
                  height: "4.5vw",
                  borderRadius: "50%",
                  background: "rgba(29,158,117,0.15)",
                  border: "1px solid rgba(29,158,117,0.4)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <span style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "2.4vw", fontWeight: 900, color: "#1D9E75" }}>3</span>
              </div>
              <div>
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "2.1vw", fontWeight: 700, color: "#F5F0EB", marginBottom: "0.5vh" }}>
                  Pay any bill — confirmed via WhatsApp
                </p>
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.8vw", color: "#8BA8C0", lineHeight: 1.3 }}>
                  Receipt stored permanently. Reminders before every due date.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div
          className="flex flex-col justify-center"
          style={{ flex: 1, padding: "7vh 6vw 7vh 2vw" }}
        >
          <div
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "1.5vw",
              padding: "4vh 3vw",
              display: "flex",
              flexDirection: "column",
              gap: "2.5vh"
            }}
          >
            <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "2vw", fontWeight: 700, color: "#8BA8C0", letterSpacing: "0.1em", textTransform: "uppercase" }}>
              Works on any smartphone
            </p>
            <div style={{ width: "3vw", height: "0.3vh", background: "#1D9E75" }} />
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "2vw", color: "#F5F0EB", lineHeight: 1.4 }}>
              pagoyamx.com
            </p>
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.8vw", color: "#8BA8C0", lineHeight: 1.4 }}>
              PWA — no install, no app store, no data plan requirement beyond a basic browser session.
            </p>
            <div style={{ height: "0.2vh", background: "rgba(255,255,255,0.06)" }} />
            <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "2vw", fontWeight: 700, color: "#8BA8C0", letterSpacing: "0.1em", textTransform: "uppercase" }}>
              WhatsApp-native
            </p>
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.8vw", color: "#8BA8C0", lineHeight: 1.4 }}>
              94% of Mexican smartphone users have WhatsApp. Confirmation, receipts, and reminders live where users already live.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
