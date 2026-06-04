export default function Slide03bWallet() {
  return (
    <div
      className="relative w-screen h-screen overflow-hidden"
      style={{ background: "#004F2D" }}
    >
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse at 30% 60%, rgba(0,200,117,0.09) 0%, transparent 55%)" }}
      />

      <div className="relative z-10 flex flex-col h-full" style={{ padding: "4vh 8vw 3.5vh" }}>

        <div style={{ marginBottom: "2.2vh" }}>
          <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.5vw", fontWeight: 700, color: "#00C875", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: "0.8vh" }}>
            The PagoYa Wallet
          </p>
          <h2 style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "4.8vw", fontWeight: 900, color: "#FFFFFF", lineHeight: 0.95, letterSpacing: "-0.01em" }}>
            Load once. Pay everything.
          </h2>
          <div style={{ width: "6vw", height: "0.4vh", background: "#00C875", marginTop: "1.2vh" }} />
        </div>

        <div className="flex gap-[2.5vw]" style={{ flex: 1, minHeight: 0 }}>

          <div style={{ width: "28%", display: "flex", flexDirection: "column" }}>
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.2vw", fontWeight: 700, color: "rgba(255,255,255,0.45)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "1.2vh", flexShrink: 0 }}>
              Add money via
            </p>
            <div className="flex flex-col gap-[1.8vh]" style={{ flex: 1 }}>
              {[
                { icon: "🏪", label: "OXXO cash deposit", sub: "22,000 locations nationwide" },
                { icon: "💳", label: "Debit / credit card", sub: "Visa, Mastercard via Stripe" },
                { icon: "🏦", label: "Bank debit", sub: "Direct from your account via Belvo" },
                { icon: "⚡", label: "STP / SPEI transfer", sub: "Instant interbank — in progress" },
              ].map(({ icon, label, sub }) => (
                <div
                  key={label}
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "0.8vw",
                    padding: "1.8vh 1.4vw",
                    display: "flex",
                    alignItems: "center",
                    gap: "1.2vw",
                    flex: 1
                  }}
                >
                  <span style={{ fontSize: "2.2vw", flexShrink: 0 }}>{icon}</span>
                  <div>
                    <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.6vw", fontWeight: 700, color: "#FFFFFF", lineHeight: 1.15 }}>{label}</p>
                    <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.3vw", color: "rgba(255,255,255,0.45)", lineHeight: 1.3 }}>{sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ width: "0.15vw", background: "rgba(255,255,255,0.1)", flexShrink: 0, alignSelf: "stretch" }} />

          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.2vw", fontWeight: 700, color: "rgba(255,255,255,0.45)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "1.2vh", flexShrink: 0 }}>
              Pay anything
            </p>
            <div className="flex flex-col gap-[1.8vh]" style={{ flex: 1 }}>

              <div
                style={{
                  background: "rgba(0,200,117,0.08)",
                  border: "1px solid rgba(0,200,117,0.3)",
                  borderRadius: "0.8vw",
                  padding: "2vh 1.8vw",
                  flex: 1
                }}
              >
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.3vw", fontWeight: 700, color: "#00C875", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "1vh" }}>
                  ⚡ Utility bills
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.6vh 1.8vw" }}>
                  {["CFE (electricity)", "Telmex", "Izzi", "TotalPlay", "Gas Natural", "Telcel", "Sky", "Megacable", "Dish", "AT&T"].map(s => (
                    <span key={s} style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.5vw", color: "#FFFFFF" }}>· {s}</span>
                  ))}
                </div>
              </div>

              <div
                style={{
                  background: "rgba(255,92,26,0.08)",
                  border: "1px solid rgba(255,92,26,0.3)",
                  borderRadius: "0.8vw",
                  padding: "2vh 1.8vw",
                  flex: 1
                }}
              >
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.3vw", fontWeight: 700, color: "#FF5C1A", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "1vh" }}>
                  🎁 Gift cards & subscriptions
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.6vh 1.8vw" }}>
                  {["Netflix", "Amazon", "Google Play", "Spotify", "Xbox", "Nintendo", "iTunes"].map(s => (
                    <span key={s} style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.5vw", color: "#FFFFFF" }}>· {s}</span>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", gap: "2vw", flex: 1 }}>
                <div
                  style={{
                    flex: 1,
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: "0.8vw",
                    padding: "1.8vh 1.5vw"
                  }}
                >
                  <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.3vw", fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.7vh" }}>
                    👥 P2P transfers <span style={{ color: "#FF5C1A" }}>· soon</span>
                  </p>
                  <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.4vw", color: "rgba(255,255,255,0.5)", lineHeight: 1.4 }}>
                    Split bills, send balances, pay each other via WhatsApp
                  </p>
                </div>
                <div
                  style={{
                    flex: 1,
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: "0.8vw",
                    padding: "1.8vh 1.5vw"
                  }}
                >
                  <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.3vw", fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.7vh" }}>
                    📈 Credit building <span style={{ color: "#FF5C1A" }}>· soon</span>
                  </p>
                  <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.4vw", color: "rgba(255,255,255,0.5)", lineHeight: 1.4 }}>
                    Payment history unlocks BNPL, microloans & insurance
                  </p>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
