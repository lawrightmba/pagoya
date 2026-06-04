export default function Slide03Paula() {
  return (
    <div
      className="relative w-screen h-screen overflow-hidden flex"
      style={{ background: "#004F2D" }}
    >
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse at 65% 40%, rgba(0,200,117,0.1) 0%, transparent 60%)" }}
      />

      <div className="relative z-10 flex w-full h-full" style={{ padding: "5.5vh 8vw" }}>

        <div className="flex flex-col justify-center" style={{ width: "48%", paddingRight: "4vw" }}>
          <p
            style={{
              fontFamily: "DM Sans, sans-serif",
              fontSize: "1.6vw",
              fontWeight: 700,
              color: "#00C875",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              marginBottom: "1.6vh"
            }}
          >
            Meet Paula · Your AI Agent
          </p>
          <h2
            style={{
              fontFamily: "Barlow Condensed, sans-serif",
              fontSize: "5.2vw",
              fontWeight: 900,
              color: "#FFFFFF",
              letterSpacing: "-0.01em",
              lineHeight: 0.96,
              marginBottom: "1.5vh"
            }}
          >
            One WhatsApp message.
            Every financial task. Done.
          </h2>
          <div style={{ width: "6vw", height: "0.4vh", background: "#00C875", marginBottom: "3vh" }} />

          <div className="flex flex-col gap-[2vh]">
            {[
              {
                icon: "⚡",
                title: "Pays bills in seconds",
                body: "CFE, Telmex, Sky, Izzi, TotalPlay, Gas Natural, Telcel, AT&T — just say the word",
                color: "#00C875"
              },
              {
                icon: "🎁",
                title: "Buys gift cards & subscriptions",
                body: "Netflix, Amazon, Google Play, Spotify — pay monthly fees or send as gifts",
                color: "#00C875"
              },
              {
                icon: "🔔",
                title: "Sends smart reminders",
                body: "Learns your due dates. Alerts you before services get cut off",
                color: "#FF5C1A"
              },
              {
                icon: "📊",
                title: "Builds your financial record",
                body: "Every transaction stored permanently — no bank required, no paperwork",
                color: "#FF5C1A"
              }
            ].map(({ icon, title, body, color }) => (
              <div key={title} className="flex items-start gap-[1.2vw]">
                <span style={{ fontSize: "1.9vw", lineHeight: 1, marginTop: "0.15vh", flexShrink: 0 }}>{icon}</span>
                <div>
                  <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.75vw", fontWeight: 700, color: "#FFFFFF", marginBottom: "0.2vh" }}>{title}</p>
                  <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.5vw", color: "rgba(255,255,255,0.55)", lineHeight: 1.3 }}>{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col justify-center" style={{ flex: 1 }}>
          <div
            style={{
              background: "#ECE5DD",
              borderRadius: "2vw",
              overflow: "hidden",
              boxShadow: "0 2vw 4vw rgba(0,0,0,0.4)",
              display: "flex",
              flexDirection: "column",
              height: "82vh"
            }}
          >
            <div
              style={{
                background: "#075E54",
                padding: "1.6vh 2vw",
                display: "flex",
                alignItems: "center",
                gap: "1.2vw",
                flexShrink: 0
              }}
            >
              <div
                style={{
                  width: "4.5vh",
                  height: "4.5vh",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #00C875 0%, #007A4A 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0
                }}
              >
                <span style={{ fontSize: "2vh", lineHeight: 1 }}>🤖</span>
              </div>
              <div>
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.7vw", fontWeight: 700, color: "#FFFFFF", lineHeight: 1 }}>Paula · PagoYa</p>
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.3vw", color: "rgba(255,255,255,0.75)", lineHeight: 1 }}>en línea</p>
              </div>
            </div>

            <div
              style={{
                flex: 1,
                padding: "2vh 2vw",
                display: "flex",
                flexDirection: "column",
                gap: "1.5vh",
                overflowY: "hidden",
                background: "#ECE5DD",
                backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' opacity='0.04'%3E%3Crect width='400' height='400' fill='%23128C7E'/%3E%3C/svg%3E\")"
              }}
            >
              {[
                { from: "user", text: "I want to pay my CFE electric bill" },
                { from: "paula", text: "Hi! I'm Paula 👋\n\nI found your CFE bill for $380 MXN due June 12.\n\nShould I pay it now from your balance? You have $520 MXN available." },
                { from: "user", text: "Yes, pay it" },
                { from: "paula", text: "✅ Done! CFE paid.\n\n📄 Receipt #CFE-2026-0604-8821\nAmount: $380 MXN + $25 MXN fee\nDate: Jun 4 2026, 12:33 am\n\nI'll alert you when your next bill arrives 🔔" },
                { from: "user", text: "Also get me Netflix this month" },
                { from: "paula", text: "Sure 🎬 Netflix gift cards available:\n\n• $99 MXN — 1 month\n• $199 MXN — 2 months\n\nWhich one?" },
              ].map(({ from, text }, i) => (
                <div
                  key={i}
                  style={{
                    alignSelf: from === "user" ? "flex-end" : "flex-start",
                    maxWidth: "78%"
                  }}
                >
                  <div
                    style={{
                      background: from === "user" ? "#DCF8C6" : "#FFFFFF",
                      borderRadius: from === "user" ? "1.2vw 0.3vw 1.2vw 1.2vw" : "0.3vw 1.2vw 1.2vw 1.2vw",
                      padding: "1.1vh 1.4vw",
                      boxShadow: "0 0.2vh 0.4vh rgba(0,0,0,0.1)"
                    }}
                  >
                    <p
                      style={{
                        fontFamily: "DM Sans, sans-serif",
                        fontSize: "1.35vw",
                        color: "#111",
                        lineHeight: 1.45,
                        whiteSpace: "pre-line"
                      }}
                    >
                      {text}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div
              style={{
                background: "#F0F0F0",
                padding: "1.2vh 1.5vw",
                display: "flex",
                alignItems: "center",
                gap: "1vw",
                flexShrink: 0
              }}
            >
              <div
                style={{
                  flex: 1,
                  background: "#FFFFFF",
                  borderRadius: "2vw",
                  padding: "1vh 1.5vw"
                }}
              >
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.35vw", color: "#AAA" }}>Type a message…</p>
              </div>
              <div
                style={{
                  width: "3.5vh",
                  height: "3.5vh",
                  borderRadius: "50%",
                  background: "#075E54",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <span style={{ fontSize: "1.4vh" }}>➤</span>
              </div>
            </div>
          </div>
          <p
            style={{
              fontFamily: "DM Sans, sans-serif",
              fontSize: "1.15vw",
              color: "rgba(255,255,255,0.4)",
              marginTop: "1.2vh",
              fontStyle: "italic",
              textAlign: "right"
            }}
          >
            * Users interact with Paula in Spanish
          </p>
        </div>
      </div>
    </div>
  );
}
