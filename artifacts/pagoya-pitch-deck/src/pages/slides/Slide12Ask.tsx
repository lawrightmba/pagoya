export default function Slide12Ask() {
  return (
    <div
      className="relative w-screen h-screen overflow-hidden"
      style={{ background: "#0A2540" }}
    >
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at 50% 50%, rgba(29,158,117,0.1) 0%, transparent 65%)"
        }}
      />

      <div className="absolute inset-0 flex flex-col justify-between" style={{ padding: "7vh 8vw" }}>
        <div>
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
            The Ask
          </p>
          <h2
            style={{
              fontFamily: "Barlow Condensed, sans-serif",
              fontSize: "6vw",
              fontWeight: 900,
              color: "#F5F0EB",
              letterSpacing: "-0.01em",
              lineHeight: 1,
              marginBottom: "1.5vh"
            }}
          >
            Seed round:
            $150,000 USD
          </h2>
          <div style={{ width: "6vw", height: "0.4vh", background: "#1D9E75", marginBottom: "4vh" }} />
        </div>

        <div className="grid grid-cols-4 gap-[2vw]" style={{ flex: 1, alignContent: "start" }}>
          <div
            style={{
              background: "rgba(29,158,117,0.1)",
              border: "1px solid rgba(29,158,117,0.25)",
              borderRadius: "0.8vw",
              padding: "2.5vh 2vw"
            }}
          >
            <p
              style={{
                fontFamily: "Barlow Condensed, sans-serif",
                fontSize: "5.5vw",
                fontWeight: 900,
                color: "#1D9E75",
                lineHeight: 0.9,
                marginBottom: "1vh"
              }}
            >
              40%
            </p>
            <div style={{ width: "2.5vw", height: "0.3vh", background: "#1D9E75", marginBottom: "1.2vh" }} />
            <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "2vw", fontWeight: 700, color: "#F5F0EB", marginBottom: "0.6vh" }}>
              Technology
            </p>
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.7vw", color: "#8BA8C0", lineHeight: 1.3 }}>
              STP integration, WhatsApp Business API, platform hardening
            </p>
          </div>

          <div
            style={{
              background: "rgba(216,90,48,0.1)",
              border: "1px solid rgba(216,90,48,0.25)",
              borderRadius: "0.8vw",
              padding: "2.5vh 2vw"
            }}
          >
            <p
              style={{
                fontFamily: "Barlow Condensed, sans-serif",
                fontSize: "5.5vw",
                fontWeight: 900,
                color: "#D85A30",
                lineHeight: 0.9,
                marginBottom: "1vh"
              }}
            >
              30%
            </p>
            <div style={{ width: "2.5vw", height: "0.3vh", background: "#D85A30", marginBottom: "1.2vh" }} />
            <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "2vw", fontWeight: 700, color: "#F5F0EB", marginBottom: "0.6vh" }}>
              Growth
            </p>
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.7vw", color: "#8BA8C0", lineHeight: 1.3 }}>
              Rep network expansion to 3 cities, first 1,000 active users
            </p>
          </div>

          <div
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "0.8vw",
              padding: "2.5vh 2vw"
            }}
          >
            <p
              style={{
                fontFamily: "Barlow Condensed, sans-serif",
                fontSize: "5.5vw",
                fontWeight: 900,
                color: "#F5F0EB",
                lineHeight: 0.9,
                marginBottom: "1vh"
              }}
            >
              20%
            </p>
            <div style={{ width: "2.5vw", height: "0.3vh", background: "#8BA8C0", marginBottom: "1.2vh" }} />
            <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "2vw", fontWeight: 700, color: "#F5F0EB", marginBottom: "0.6vh" }}>
              Regulatory
            </p>
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.7vw", color: "#8BA8C0", lineHeight: 1.3 }}>
              CNBV SOFOM licensing preparation, legal infrastructure
            </p>
          </div>

          <div
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "0.8vw",
              padding: "2.5vh 2vw"
            }}
          >
            <p
              style={{
                fontFamily: "Barlow Condensed, sans-serif",
                fontSize: "5.5vw",
                fontWeight: 900,
                color: "#F5F0EB",
                lineHeight: 0.9,
                marginBottom: "1vh"
              }}
            >
              10%
            </p>
            <div style={{ width: "2.5vw", height: "0.3vh", background: "#8BA8C0", marginBottom: "1.2vh" }} />
            <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "2vw", fontWeight: 700, color: "#F5F0EB", marginBottom: "0.6vh" }}>
              Operations
            </p>
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.7vw", color: "#8BA8C0", lineHeight: 1.3 }}>
              Team, compliance, customer support
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between" style={{ marginTop: "3vh" }}>
          <img
            src={`${import.meta.env.BASE_URL}pagoya-logo.png`}
            crossOrigin="anonymous"
            alt="PagoYa"
            style={{ height: "5vh", width: "auto" }}
          />
          <div className="flex flex-col items-end gap-[0.5vh]">
            <span style={{ fontFamily: "DM Sans, sans-serif", fontSize: "2vw", fontWeight: 700, color: "#F5F0EB" }}>
              Lloyd A. Wright, MBA
            </span>
            <span style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.8vw", color: "#1D9E75" }}>
              lloyd@pagoyamx.com · pagoyamx.com
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
