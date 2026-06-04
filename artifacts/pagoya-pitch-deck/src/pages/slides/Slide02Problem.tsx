export default function Slide02Problem() {
  return (
    <div
      className="relative w-screen h-screen overflow-hidden flex"
      style={{ background: "#004F2D" }}
    >
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at 80% 50%, rgba(255,92,26,0.1) 0%, transparent 65%)"
        }}
      />

      <div
        className="absolute left-0 top-0 bottom-0"
        style={{ width: "0.4vw", background: "linear-gradient(180deg, #FF5C1A 0%, transparent 100%)", opacity: 0.8 }}
      />

      <div className="relative z-10 flex flex-col justify-center" style={{ padding: "7vh 8vw", width: "100%" }}>
        <p
          style={{
            fontFamily: "DM Sans, sans-serif",
            fontSize: "1.6vw",
            fontWeight: 700,
            color: "#FF5C1A",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            marginBottom: "1.8vh"
          }}
        >
          The Problem
        </p>
        <h2
          style={{
            fontFamily: "Barlow Condensed, sans-serif",
            fontSize: "5.5vw",
            fontWeight: 900,
            color: "#FFFFFF",
            letterSpacing: "-0.01em",
            lineHeight: 1,
            marginBottom: "1.5vh",
            textWrap: "balance"
          }}
        >
          65 million unbanked adults
          pay bills at convenience stores.
        </h2>
        <div style={{ width: "6vw", height: "0.4vh", background: "#FF5C1A", marginBottom: "4vh" }} />

        <p
          style={{
            fontFamily: "DM Sans, sans-serif",
            fontSize: "2.1vw",
            fontWeight: 400,
            color: "rgba(255,255,255,0.55)",
            marginBottom: "3.5vh"
          }}
        >
          $14–20 MXN per service, per trip, every month — standing in line, cash only, no digital record.
        </p>

        <div className="grid grid-cols-2 gap-x-[5vw] gap-y-[2.8vh]" style={{ maxWidth: "80vw" }}>
          <div className="flex items-start gap-[1.2vw]">
            <div style={{ width: "0.35vw", minWidth: "0.35vw", height: "2.8vh", background: "#FF5C1A", marginTop: "0.4vh" }} />
            <div>
              <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "2.6vw", fontWeight: 800, color: "#FFFFFF", lineHeight: 1.1 }}>
                $60–80 MXN/month
              </p>
              <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.8vw", color: "rgba(255,255,255,0.55)", lineHeight: 1.3 }}>
                in fees for a typical household (CFE + Telmex + 2 top-ups)
              </p>
            </div>
          </div>
          <div className="flex items-start gap-[1.2vw]">
            <div style={{ width: "0.35vw", minWidth: "0.35vw", height: "2.8vh", background: "#FF5C1A", marginTop: "0.4vh" }} />
            <div>
              <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "2.6vw", fontWeight: 800, color: "#FFFFFF", lineHeight: 1.1 }}>
                20–35 minutes
              </p>
              <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.8vw", color: "rgba(255,255,255,0.55)", lineHeight: 1.3 }}>
                per convenience store visit including travel and wait time
              </p>
            </div>
          </div>
          <div className="flex items-start gap-[1.2vw]">
            <div style={{ width: "0.35vw", minWidth: "0.35vw", height: "2.8vh", background: "#FF5C1A", marginTop: "0.4vh" }} />
            <div>
              <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "2.6vw", fontWeight: 800, color: "#FFFFFF", lineHeight: 1.1 }}>
                $400–600 MXN
              </p>
              <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.8vw", color: "rgba(255,255,255,0.55)", lineHeight: 1.3 }}>
                CFE reconnection fee if you miss the due date
              </p>
            </div>
          </div>
          <div className="flex items-start gap-[1.2vw]">
            <div style={{ width: "0.35vw", minWidth: "0.35vw", height: "2.8vh", background: "#FF5C1A", marginTop: "0.4vh" }} />
            <div>
              <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "2.6vw", fontWeight: 800, color: "#FFFFFF", lineHeight: 1.1 }}>
                Zero digital record
              </p>
              <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.8vw", color: "rgba(255,255,255,0.55)", lineHeight: 1.3 }}>
                no payment history, no credit trail, no receipts — financially invisible
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
