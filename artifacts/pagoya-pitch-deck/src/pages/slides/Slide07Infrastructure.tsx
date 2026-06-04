const base = import.meta.env.BASE_URL;

export default function Slide07Infrastructure() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "#004F2D" }}>
      <img
        src={`${base}hero-gtm.png`}
        crossOrigin="anonymous"
        alt="Mexican street"
        className="absolute inset-0 w-full h-full object-cover"
        style={{ opacity: 0.25 }}
      />
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(100deg, rgba(0,79,45,0.97) 0%, rgba(0,79,45,0.8) 50%, rgba(0,79,45,0.65) 100%)" }}
      />

      <div className="absolute inset-0 flex" style={{ padding: "6.5vh 8vw" }}>
        <div className="flex flex-col justify-center" style={{ width: "52%" }}>
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
            Go-To-Market
          </p>
          <h2
            style={{
              fontFamily: "Barlow Condensed, sans-serif",
              fontSize: "5.2vw",
              fontWeight: 900,
              color: "#FFFFFF",
              letterSpacing: "-0.01em",
              lineHeight: 1,
              marginBottom: "1.5vh"
            }}
          >
            Street team.
            Referral network.
            Compounding flywheel.
          </h2>
          <div style={{ width: "6vw", height: "0.4vh", background: "#FF5C1A", marginBottom: "3.5vh" }} />

          <div className="flex flex-col gap-[2vh]">
            {[
              { color: "#00C875", text: "Rep walks into taquerías, tianguis, family businesses — opens pagoyamx.com, registers, first payment on the spot" },
              { color: "#00C875", text: "Rep earns passive commission on every repeat payment forever → MLM-style income, zero upfront CAC" },
              { color: "#FF5C1A", text: "Users refer users via WhatsApp share link → referral bonus credited to wallet → new activation" },
              { color: "#FF5C1A", text: "Each new user expands rep's passive income + spreads activation to their colonia network" },
            ].map(({ color, text }, i) => (
              <div key={i} className="flex items-start gap-[1.2vw]">
                <div style={{ width: "0.35vw", minWidth: "0.35vw", height: "2.5vh", background: color, marginTop: "0.3vh" }} />
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.8vw", color: "#FFFFFF", lineHeight: 1.35 }}>
                  {text}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col justify-center" style={{ flex: 1, paddingLeft: "4vw" }}>
          <div
            style={{
              background: "rgba(0,30,15,0.85)",
              border: "1px solid rgba(0,200,117,0.3)",
              borderRadius: "1.2vw",
              padding: "3.5vh 3vw"
            }}
          >
            <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "1.8vw", fontWeight: 700, color: "rgba(255,255,255,0.5)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "2.5vh" }}>
              Three-layer model
            </p>
            <div className="flex flex-col gap-[1.6vh]">
              {[
                { num: "01", title: "Direct activation", sub: "1 rep → 20–30 users in 30 days, in-person, in colonias", color: "#00C875" },
                { num: "02", title: "Passive commission", sub: "Rep earns % on every repeat transaction — compounding monthly income", color: "#00C875" },
                { num: "03", title: "User referral loop", sub: "Each user's WhatsApp share is a product demo to their contact list", color: "#FF5C1A" },
              ].map(({ num, title, sub, color }) => (
                <div key={num}>
                  <div className="flex items-center gap-[1vw]" style={{ marginBottom: "0.3vh" }}>
                    <span style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "2.6vw", fontWeight: 900, color, lineHeight: 1 }}>{num}</span>
                    <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.8vw", fontWeight: 700, color: "#FFFFFF" }}>{title}</p>
                  </div>
                  <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.6vw", color: "rgba(255,255,255,0.5)", lineHeight: 1.3, paddingLeft: "3.5vw" }}>{sub}</p>
                </div>
              ))}
            </div>
            <div style={{ height: "0.15vh", background: "rgba(255,255,255,0.08)", margin: "2vh 0" }} />
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.65vw", color: "rgba(255,255,255,0.5)" }}>
              Beachhead: Puerto Vallarta · Next: Guadalajara, CDMX periphery
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
