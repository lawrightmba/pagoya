export default function Slide04Market() {
  return (
    <div
      className="relative w-screen h-screen overflow-hidden"
      style={{ background: "#0A2540" }}
    >
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at 50% 80%, rgba(29,158,117,0.07) 0%, transparent 60%)"
        }}
      />

      <div className="relative z-10 flex flex-col" style={{ padding: "7vh 8vw 5vh" }}>
        <div style={{ marginBottom: "4vh" }}>
          <p
            style={{
              fontFamily: "DM Sans, sans-serif",
              fontSize: "1.6vw",
              fontWeight: 700,
              color: "#1D9E75",
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
              fontSize: "5vw",
              fontWeight: 900,
              color: "#F5F0EB",
              letterSpacing: "-0.01em",
              lineHeight: 1,
              marginBottom: "1.5vh"
            }}
          >
            Mexico bill payment market
          </h2>
          <div style={{ width: "6vw", height: "0.4vh", background: "#1D9E75" }} />
        </div>

        <div className="grid grid-cols-4 gap-[2vw]" style={{ marginBottom: "4vh" }}>
          <div
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "0.8vw",
              padding: "3vh 2vw"
            }}
          >
            <p
              style={{
                fontFamily: "Barlow Condensed, sans-serif",
                fontSize: "6vw",
                fontWeight: 900,
                color: "#1D9E75",
                lineHeight: 0.9,
                marginBottom: "1.2vh"
              }}
            >
              50M
            </p>
            <div style={{ width: "2.5vw", height: "0.3vh", background: "#1D9E75", marginBottom: "1.2vh" }} />
            <p
              style={{
                fontFamily: "DM Sans, sans-serif",
                fontSize: "1.7vw",
                color: "#8BA8C0",
                lineHeight: 1.3
              }}
            >
              unbanked adults in Mexico
            </p>
          </div>
          <div
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "0.8vw",
              padding: "3vh 2vw"
            }}
          >
            <p
              style={{
                fontFamily: "Barlow Condensed, sans-serif",
                fontSize: "6vw",
                fontWeight: 900,
                color: "#1D9E75",
                lineHeight: 0.9,
                marginBottom: "1.2vh"
              }}
            >
              22K
            </p>
            <div style={{ width: "2.5vw", height: "0.3vh", background: "#1D9E75", marginBottom: "1.2vh" }} />
            <p
              style={{
                fontFamily: "DM Sans, sans-serif",
                fontSize: "1.7vw",
                color: "#8BA8C0",
                lineHeight: 1.3
              }}
            >
              OXXO locations processing cash bills daily
            </p>
          </div>
          <div
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "0.8vw",
              padding: "3vh 2vw"
            }}
          >
            <p
              style={{
                fontFamily: "Barlow Condensed, sans-serif",
                fontSize: "5vw",
                fontWeight: 900,
                color: "#1D9E75",
                lineHeight: 0.9,
                marginBottom: "1.2vh"
              }}
            >
              $1B+
            </p>
            <div style={{ width: "2.5vw", height: "0.3vh", background: "#D85A30", marginBottom: "1.2vh" }} />
            <p
              style={{
                fontFamily: "DM Sans, sans-serif",
                fontSize: "1.7vw",
                color: "#8BA8C0",
                lineHeight: 1.3
              }}
            >
              MXN annual OXXO bill payment fee revenue
            </p>
          </div>
          <div
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "0.8vw",
              padding: "3vh 2vw"
            }}
          >
            <p
              style={{
                fontFamily: "Barlow Condensed, sans-serif",
                fontSize: "6vw",
                fontWeight: 900,
                color: "#1D9E75",
                lineHeight: 0.9,
                marginBottom: "1.2vh"
              }}
            >
              4–6
            </p>
            <div style={{ width: "2.5vw", height: "0.3vh", background: "#D85A30", marginBottom: "1.2vh" }} />
            <p
              style={{
                fontFamily: "DM Sans, sans-serif",
                fontSize: "1.7vw",
                color: "#8BA8C0",
                lineHeight: 1.3
              }}
            >
              bill payments per household per month
            </p>
          </div>
        </div>

        <div
          style={{
            background: "rgba(29,158,117,0.1)",
            borderLeft: "0.4vw solid #1D9E75",
            padding: "2.2vh 2.5vw",
            borderRadius: "0 0.6vw 0.6vw 0"
          }}
        >
          <p
            style={{
              fontFamily: "DM Sans, sans-serif",
              fontSize: "2vw",
              fontWeight: 500,
              color: "#F5F0EB",
              lineHeight: 1.4
            }}
          >
            Immediate addressable market: cash-first households in Mexican cities currently paying
            <span style={{ color: "#1D9E75", fontWeight: 700 }}> $60–80 MXN/month</span> in OXXO fees.
          </p>
        </div>
      </div>
    </div>
  );
}
