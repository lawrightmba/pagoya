export default function Slide08Competition() {
  return (
    <div
      className="relative w-screen h-screen overflow-hidden"
      style={{ background: "#004F2D" }}
    >
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse at 80% 30%, rgba(0,200,117,0.1) 0%, transparent 60%)" }}
      />

      <div className="relative z-10 flex h-full">
        <div className="flex flex-col justify-center" style={{ padding: "7vh 5vw 7vh 8vw", width: "52%" }}>
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
            P2P: Next Iteration
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
            Payments become
            social infrastructure.
          </h2>
          <div style={{ width: "6vw", height: "0.4vh", background: "#00C875", marginBottom: "3.5vh" }} />

          <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "2vw", color: "rgba(255,255,255,0.65)", lineHeight: 1.6, marginBottom: "2.5vh" }}>
            P2P transfers are already scoped in the backend. The next iteration lets users split bills, send balances, and pay each other directly inside WhatsApp.
          </p>

          <div
            style={{
              background: "rgba(0,200,117,0.1)",
              borderLeft: "0.4vw solid #00C875",
              padding: "2vh 2vw",
              borderRadius: "0 0.6vw 0.6vw 0"
            }}
          >
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.9vw", fontWeight: 500, color: "#FFFFFF", lineHeight: 1.5, fontStyle: "italic" }}>
              "Pay your half of the CFE" — one message turns a bill payment into a social transaction that reaches a new user.
            </p>
          </div>
        </div>

        <div className="flex flex-col justify-center" style={{ flex: 1, padding: "7vh 8vw 7vh 4vw", gap: "2.5vh" }}>
          <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "1.9vw", fontWeight: 700, color: "rgba(255,255,255,0.5)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.5vh" }}>
            The network effect
          </p>

          {[
            {
              title: "Every payment = product demo",
              body: "The recipient sees the WhatsApp confirmation and asks how to sign up. Viral loop requires zero ad spend.",
              color: "#00C875"
            },
            {
              title: "Users become distribution nodes",
              body: "Each P2P send is organic acquisition. More users paying each other = exponential referral surface.",
              color: "#00C875"
            },
            {
              title: "CAC approaches zero",
              body: "Rep activates 1 user → that user's P2P activity activates 3–5 more. No paid marketing required.",
              color: "#FF5C1A"
            },
            {
              title: "Backend already scoped",
              body: "P2P wallet-to-wallet architecture is implemented in the API. Activation is a product decision, not a technical one.",
              color: "#FF5C1A"
            }
          ].map(({ title, body, color }) => (
            <div key={title} className="flex items-start gap-[1.2vw]">
              <div style={{ width: "0.35vw", minWidth: "0.35vw", height: "2.5vh", background: color, marginTop: "0.3vh" }} />
              <div>
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.85vw", fontWeight: 700, color: "#FFFFFF", marginBottom: "0.3vh" }}>{title}</p>
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.65vw", color: "rgba(255,255,255,0.55)", lineHeight: 1.35 }}>{body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
