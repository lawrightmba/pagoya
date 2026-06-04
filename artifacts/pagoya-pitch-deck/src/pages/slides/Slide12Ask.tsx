export default function Slide12Ask() {
  return (
    <div
      className="relative w-screen h-screen overflow-hidden"
      style={{ background: "#004F2D" }}
    >
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse at 70% 50%, rgba(0,200,117,0.1) 0%, transparent 60%)" }}
      />

      <div
        className="absolute right-0 top-0 bottom-0"
        style={{ width: "0.4vw", background: "linear-gradient(180deg, #00C875 0%, transparent 100%)", opacity: 0.7 }}
      />

      <div className="relative z-10 flex h-full">
        <div className="flex flex-col justify-center" style={{ padding: "7vh 5vw 7vh 8vw", width: "50%" }}>
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
            Why Techstars
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
            The mistakes we're
            about to make have
            already been solved.
          </h2>
          <div style={{ width: "6vw", height: "0.4vh", background: "#00C875", marginBottom: "3.5vh" }} />
          <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.9vw", color: "rgba(255,255,255,0.6)", lineHeight: 1.6, marginBottom: "3vh" }}>
            Techstars alumni — Clip, Kueski — solved CNBV licensing, SPEI rails, and city-by-city scaling in Mexico. We are not applying for validation. We are applying because those operators are in your network.
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
              "We need the fintech mentorship + LATAM distribution network + Demo Day access to investors who understand Mexican unit economics — not US SaaS metrics."
            </p>
          </div>
        </div>

        <div
          className="flex flex-col justify-center"
          style={{ flex: 1, padding: "7vh 8vw 7vh 4vw", gap: "2.8vh" }}
        >
          <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "2vw", fontWeight: 700, color: "rgba(255,255,255,0.5)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.5vh" }}>
            What we want from Techstars
          </p>

          {[
            {
              n: "01",
              title: "Regulatory navigation",
              sub: "CNBV SOFOM licensing as wallet volume scales · Banxico SPEI reporting thresholds · CONDUSEF compliance",
              color: "#00C875"
            },
            {
              n: "02",
              title: "Rep network scaling playbook",
              sub: "From 2 reps in Puerto Vallarta to 50+ reps across 5 Mexican cities — we need operators who've done this",
              color: "#00C875"
            },
            {
              n: "03",
              title: "Demo Day access",
              sub: "LATAM fintech investors who understand $25 MXN flat-fee unit economics — not US SaaS investors who will misread the numbers",
              color: "#FF5C1A"
            }
          ].map(({ n, title, sub, color }) => (
            <div key={n} className="flex items-start gap-[1.5vw]">
              <span style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "3vw", fontWeight: 900, color, lineHeight: 1, minWidth: "2.5vw" }}>{n}</span>
              <div>
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.9vw", fontWeight: 700, color: "#FFFFFF", marginBottom: "0.4vh" }}>{title}</p>
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.65vw", color: "rgba(255,255,255,0.55)", lineHeight: 1.35 }}>{sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
