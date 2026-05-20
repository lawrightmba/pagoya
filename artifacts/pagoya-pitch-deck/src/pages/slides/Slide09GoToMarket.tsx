const base = import.meta.env.BASE_URL;

export default function Slide09GoToMarket() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "#0A2540" }}>
      <img
        src={`${base}hero-gtm.png`}
        crossOrigin="anonymous"
        alt="Mexican street market"
        className="absolute inset-0 w-full h-full object-cover"
        style={{ opacity: 0.35 }}
      />
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(100deg, rgba(10,37,64,0.96) 0%, rgba(10,37,64,0.75) 50%, rgba(10,37,64,0.55) 100%)" }}
      />

      <div className="absolute inset-0 flex" style={{ padding: "7vh 8vw" }}>
        <div className="flex flex-col justify-center" style={{ width: "55%" }}>
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
            Go-To-Market
          </p>
          <h2
            style={{
              fontFamily: "Barlow Condensed, sans-serif",
              fontSize: "5.2vw",
              fontWeight: 900,
              color: "#F5F0EB",
              letterSpacing: "-0.01em",
              lineHeight: 1,
              marginBottom: "1.5vh"
            }}
          >
            In person.
            In the colonia.
          </h2>
          <div style={{ width: "6vw", height: "0.4vh", background: "#D85A30", marginBottom: "3.5vh" }} />

          <div className="flex flex-col gap-[2.2vh]">
            <div className="flex items-start gap-[1.2vw]">
              <div style={{ width: "0.35vw", minWidth: "0.35vw", height: "2.5vh", background: "#1D9E75", marginTop: "0.3vh" }} />
              <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.9vw", color: "#F5F0EB", lineHeight: 1.35 }}>
                Street reps walk into taquerías, tianguis, and family businesses
              </p>
            </div>
            <div className="flex items-start gap-[1.2vw]">
              <div style={{ width: "0.35vw", minWidth: "0.35vw", height: "2.5vh", background: "#1D9E75", marginTop: "0.3vh" }} />
              <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.9vw", color: "#F5F0EB", lineHeight: 1.35 }}>
                Opens pagoyamx.com, registers user, completes first payment on the spot
              </p>
            </div>
            <div className="flex items-start gap-[1.2vw]">
              <div style={{ width: "0.35vw", minWidth: "0.35vw", height: "2.5vh", background: "#1D9E75", marginTop: "0.3vh" }} />
              <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.9vw", color: "#F5F0EB", lineHeight: 1.35 }}>
                No app download. 100% activation rate on contact.
              </p>
            </div>
            <div className="flex items-start gap-[1.2vw]">
              <div style={{ width: "0.35vw", minWidth: "0.35vw", height: "2.5vh", background: "#D85A30", marginTop: "0.3vh" }} />
              <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.9vw", color: "#F5F0EB", lineHeight: 1.35 }}>
                Rep earns commission on every transaction — recurring income, zero upfront CAC
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-center" style={{ flex: 1, paddingLeft: "5vw" }}>
          <div
            style={{
              background: "rgba(10,37,64,0.8)",
              border: "1px solid rgba(29,158,117,0.3)",
              borderRadius: "1.2vw",
              padding: "3.5vh 3vw"
            }}
          >
            <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "2vw", fontWeight: 700, color: "#8BA8C0", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "2.5vh" }}>
              The flywheel
            </p>
            <div className="flex flex-col gap-[1.8vh]">
              <div>
                <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "3vw", fontWeight: 900, color: "#1D9E75", lineHeight: 1 }}>1 rep</p>
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.8vw", color: "#8BA8C0" }}>activates 20–30 users in 30 days</p>
              </div>
              <div style={{ width: "0.3vw", height: "2vh", background: "rgba(29,158,117,0.4)", marginLeft: "1.5vw" }} />
              <div>
                <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "3vw", fontWeight: 900, color: "#1D9E75", lineHeight: 1 }}>Passive commissions</p>
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.8vw", color: "#8BA8C0" }}>on every repeat payment, every month</p>
              </div>
              <div style={{ width: "0.3vw", height: "2vh", background: "rgba(29,158,117,0.4)", marginLeft: "1.5vw" }} />
              <div>
                <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "3vw", fontWeight: 900, color: "#D85A30", lineHeight: 1 }}>CAC drops</p>
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.8vw", color: "#8BA8C0" }}>as rep network compounds</p>
              </div>
            </div>
            <div style={{ height: "0.2vh", background: "rgba(255,255,255,0.08)", margin: "2vh 0" }} />
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.7vw", color: "#8BA8C0" }}>
              Beachhead: Puerto Vallarta
            </p>
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.7vw", color: "#8BA8C0" }}>
              Next: Guadalajara, CDMX periphery
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
