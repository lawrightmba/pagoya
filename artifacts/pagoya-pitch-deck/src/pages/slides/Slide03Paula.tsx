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
          <div className="flex items-center gap-[1vw]" style={{ marginBottom: "1.6vh" }}>
            <p
              style={{
                fontFamily: "DM Sans, sans-serif",
                fontSize: "1.6vw",
                fontWeight: 700,
                color: "#00C875",
                letterSpacing: "0.14em",
                textTransform: "uppercase"
              }}
            >
              Meet Paula
            </p>
            <div
              style={{
                background: "rgba(255,92,26,0.18)",
                border: "1px solid #FF5C1A",
                borderRadius: "2vw",
                padding: "0.3vh 1vw",
                display: "flex",
                alignItems: "center",
                gap: "0.4vw"
              }}
            >
              <span style={{ fontSize: "1.1vw" }}>🤖</span>
              <span style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.1vw", fontWeight: 700, color: "#FF5C1A", letterSpacing: "0.08em", textTransform: "uppercase" }}>LLM-Powered Agent</span>
            </div>
          </div>
          <h2
            style={{
              fontFamily: "Barlow Condensed, sans-serif",
              fontSize: "5vw",
              fontWeight: 900,
              color: "#FFFFFF",
              letterSpacing: "-0.01em",
              lineHeight: 0.96,
              marginBottom: "1.5vh"
            }}
          >
            Not a chatbot.
            An agent that acts.
          </h2>
          <div style={{ width: "6vw", height: "0.4vh", background: "#00C875", marginBottom: "2.5vh" }} />

          <div className="flex flex-col gap-[1.8vh]">
            {[
              {
                icon: "🧠",
                title: "Understands natural language",
                body: "No menus, no forms, no app. Say \"Pay my CFE\" or \"Get me Netflix\" — Paula figures out the rest",
                color: "#00C875"
              },
              {
                icon: "⚡",
                title: "Reasons and acts autonomously",
                body: "Looks up the bill, checks your balance, confirms the amount, executes the payment — one message",
                color: "#00C875"
              },
              {
                icon: "🔮",
                title: "Persistent memory across sessions",
                body: "Remembers every bill, due date, and payment. Builds a financial identity for people with no bank account",
                color: "#FF5C1A"
              },
              {
                icon: "📡",
                title: "Proactive — alerts before cutoffs",
                body: "Paula messages you 3 days before your bill is due. You don't have to remember. She does.",
                color: "#FF5C1A"
              }
            ].map(({ icon, title, body }) => (
              <div key={title} className="flex items-start gap-[1.2vw]">
                <span style={{ fontSize: "1.9vw", lineHeight: 1, marginTop: "0.15vh", flexShrink: 0 }}>{icon}</span>
                <div>
                  <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.7vw", fontWeight: 700, color: "#FFFFFF", marginBottom: "0.2vh" }}>{title}</p>
                  <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.4vw", color: "rgba(255,255,255,0.55)", lineHeight: 1.3 }}>{body}</p>
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
                { from: "paula", text: "⚠️ Heads up — your CFE bill ($380 MXN) is due in 3 days.\n\nShould I pay it now from your balance? You have $520 MXN available.", label: "Paula proactively alerts you" },
                { from: "user", text: "Yes, pay it", label: null },
                { from: "paula", text: "Checking your balance… ✓\nVerifying CFE account… ✓\nProcessing via SIPREL… ✓\n\n✅ Done. CFE paid.\n📄 Receipt #CFE-2026-0604-8821 · $380 MXN + $25 fee", label: "Paula reasons, verifies, executes" },
                { from: "user", text: "Also grab me Netflix", label: null },
                { from: "paula", text: "Got it 🎬 You bought Netflix last month for $99 MXN.\n\nSame card again? Or send as a gift this time?", label: "Paula remembers your history" },
              ].map(({ from, text, label }, i) => (
                <div
                  key={i}
                  style={{
                    alignSelf: from === "user" ? "flex-end" : "flex-start",
                    maxWidth: "82%",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.4vh"
                  }}
                >
                  {label && (
                    <div
                      style={{
                        display: "inline-flex",
                        alignSelf: "flex-start",
                        background: "rgba(0,200,117,0.18)",
                        border: "1px solid rgba(0,200,117,0.5)",
                        borderRadius: "2vw",
                        padding: "0.2vh 0.8vw"
                      }}
                    >
                      <span style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1vw", fontWeight: 700, color: "#00C875", letterSpacing: "0.04em" }}>
                        ✦ {label}
                      </span>
                    </div>
                  )}
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
