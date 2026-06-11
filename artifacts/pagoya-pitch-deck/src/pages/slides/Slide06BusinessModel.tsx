import { LANG } from "@/lang";
const es = LANG === "es";

export default function Slide06BusinessModel() {
  return (
    <div
      className="relative w-screen h-screen overflow-hidden"
      style={{ background: "#004F2D" }}
    >
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse at 60% 40%, rgba(0,200,117,0.09) 0%, transparent 60%)" }}
      />

      <div className="relative z-10 flex flex-col" style={{ padding: "1.8vh 8vw 1.5vh" }}>
        <div style={{ marginBottom: "0.8vh" }}>
          <p
            style={{
              fontFamily: "DM Sans, sans-serif",
              fontSize: "1.4vw",
              fontWeight: 700,
              color: "#00C875",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              marginBottom: "0.5vh"
            }}
          >
            {es ? "Modelo de Negocio e Ingresos" : "Business Model & Revenue"}
          </p>
          <h2
            style={{
              fontFamily: "Barlow Condensed, sans-serif",
              fontSize: "3.8vw",
              fontWeight: 900,
              color: "#FFFFFF",
              letterSpacing: "-0.01em",
              lineHeight: 1,
              marginBottom: "0.6vh"
            }}
          >
            {es
              ? "Tarifa fija de $25 MXN por transacción.\nBase 2× · Meta 5× por billetera."
              : "Flat $25 MXN fee per transaction.\nBase 2× · Target 5× per wallet."}
          </h2>
          <div style={{ width: "6vw", height: "0.4vh", background: "#00C875" }} />
        </div>

        <div className="flex gap-[3vw]" style={{ marginBottom: "1.2vh" }}>
          <div
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "0.8vw",
              padding: "1.2vh 2vw",
              flex: "0 0 18vw"
            }}
          >
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.3vw", fontWeight: 700, color: "rgba(255,255,255,0.5)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.8vh" }}>
              {es ? "Por Transacción" : "Per Transaction"}
            </p>
            <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "5.5vw", fontWeight: 900, color: "#00C875", lineHeight: 0.9, marginBottom: "0.4vh" }}>$25</p>
            <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "1.8vw", fontWeight: 700, color: "#FFFFFF" }}>
              {es ? "MXN fija" : "MXN flat"}
            </p>
            <div style={{ height: "0.15vh", background: "rgba(255,255,255,0.1)", margin: "1vh 0" }} />
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.35vw", color: "rgba(255,255,255,0.55)", lineHeight: 1.3 }}>
              {es
                ? "Facturas o tarjetas de regalo. Rieles directos — rentable desde la transacción 1."
                : "Bills or gift cards. Direct rails — profitable from transaction 1."}
            </p>
          </div>

          <div style={{ flex: 1 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1.8fr 1fr 1fr 1.4fr",
                gap: 0,
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "0.8vw",
                overflow: "hidden"
              }}
            >
              <div style={{ background: "rgba(255,255,255,0.08)", padding: "1.1vh 1.8vw", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.45vw", fontWeight: 700, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  {es ? "Billeteras Activas" : "Active Wallets"}
                </p>
              </div>
              <div style={{ background: "rgba(255,255,255,0.08)", padding: "1.1vh 1.5vw", borderBottom: "1px solid rgba(255,255,255,0.08)", borderLeft: "1px solid rgba(255,255,255,0.08)" }}>
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.45vw", fontWeight: 700, color: "rgba(0,200,117,0.8)", textTransform: "uppercase", letterSpacing: "0.06em" }}>2× / {es ? "mes" : "mo"}</p>
              </div>
              <div style={{ background: "rgba(255,92,26,0.1)", padding: "1.1vh 1.5vw", borderBottom: "1px solid rgba(255,255,255,0.08)", borderLeft: "1px solid rgba(255,255,255,0.08)" }}>
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.45vw", fontWeight: 700, color: "#FF5C1A", textTransform: "uppercase", letterSpacing: "0.06em" }}>5× / {es ? "mes" : "mo"}</p>
              </div>
              <div style={{ background: "rgba(255,255,255,0.08)", padding: "1.1vh 1.5vw", borderBottom: "1px solid rgba(255,255,255,0.08)", borderLeft: "1px solid rgba(255,255,255,0.08)" }}>
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.45vw", fontWeight: 700, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  {es ? "Equivalente USD" : "USD Equiv."}
                </p>
              </div>

              <div style={{ background: "transparent", padding: "1.1vh 1.8vw", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "2vw", fontWeight: 800, color: "#FFFFFF" }}>2,500</p>
              </div>
              <div style={{ background: "transparent", padding: "1.1vh 1.5vw", borderBottom: "1px solid rgba(255,255,255,0.06)", borderLeft: "1px solid rgba(255,255,255,0.06)" }}>
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.6vw", color: "rgba(255,255,255,0.8)" }}>$150K MXN</p>
              </div>
              <div style={{ background: "rgba(255,92,26,0.04)", padding: "1.1vh 1.5vw", borderBottom: "1px solid rgba(255,255,255,0.06)", borderLeft: "1px solid rgba(255,255,255,0.06)" }}>
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.6vw", color: "rgba(255,255,255,0.8)" }}>$375K MXN</p>
              </div>
              <div style={{ background: "transparent", padding: "1.1vh 1.5vw", borderBottom: "1px solid rgba(255,255,255,0.06)", borderLeft: "1px solid rgba(255,255,255,0.06)" }}>
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.45vw", color: "rgba(255,255,255,0.4)" }}>—</p>
              </div>

              <div style={{ background: "transparent", padding: "1.1vh 1.8vw", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "2vw", fontWeight: 800, color: "#FFFFFF" }}>25,000</p>
              </div>
              <div style={{ background: "transparent", padding: "1.1vh 1.5vw", borderBottom: "1px solid rgba(255,255,255,0.06)", borderLeft: "1px solid rgba(255,255,255,0.06)" }}>
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.6vw", color: "rgba(255,255,255,0.8)" }}>$1.5M MXN</p>
              </div>
              <div style={{ background: "rgba(255,92,26,0.04)", padding: "1.1vh 1.5vw", borderBottom: "1px solid rgba(255,255,255,0.06)", borderLeft: "1px solid rgba(255,255,255,0.06)" }}>
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.6vw", color: "rgba(255,255,255,0.8)" }}>$3.75M MXN</p>
              </div>
              <div style={{ background: "transparent", padding: "1.1vh 1.5vw", borderBottom: "1px solid rgba(255,255,255,0.06)", borderLeft: "1px solid rgba(255,255,255,0.06)" }}>
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.45vw", color: "rgba(255,255,255,0.4)" }}>—</p>
              </div>

              <div style={{ background: "transparent", padding: "1.1vh 1.8vw", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "2vw", fontWeight: 800, color: "#FFFFFF" }}>250,000</p>
              </div>
              <div style={{ background: "transparent", padding: "1.1vh 1.5vw", borderBottom: "1px solid rgba(255,255,255,0.06)", borderLeft: "1px solid rgba(255,255,255,0.06)" }}>
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.6vw", color: "rgba(255,255,255,0.8)" }}>$15M MXN</p>
              </div>
              <div style={{ background: "rgba(255,92,26,0.04)", padding: "1.1vh 1.5vw", borderBottom: "1px solid rgba(255,255,255,0.06)", borderLeft: "1px solid rgba(255,255,255,0.06)" }}>
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.6vw", color: "rgba(255,255,255,0.8)" }}>$37.5M MXN</p>
              </div>
              <div style={{ background: "transparent", padding: "1.1vh 1.5vw", borderBottom: "1px solid rgba(255,255,255,0.06)", borderLeft: "1px solid rgba(255,255,255,0.06)" }}>
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.45vw", color: "rgba(255,255,255,0.4)" }}>~$880K–$2.2M USD</p>
              </div>

              <div style={{ background: "rgba(0,200,117,0.1)", padding: "1.1vh 1.8vw", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "2vw", fontWeight: 800, color: "#00C875" }}>1,000,000</p>
              </div>
              <div style={{ background: "rgba(0,200,117,0.08)", padding: "1.1vh 1.5vw", borderBottom: "1px solid rgba(255,255,255,0.06)", borderLeft: "1px solid rgba(255,255,255,0.06)" }}>
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.6vw", color: "#00C875", fontWeight: 700 }}>$600M MXN</p>
              </div>
              <div style={{ background: "rgba(255,92,26,0.1)", padding: "1.1vh 1.5vw", borderBottom: "1px solid rgba(255,255,255,0.06)", borderLeft: "1px solid rgba(255,255,255,0.06)" }}>
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.6vw", color: "#FF5C1A", fontWeight: 700 }}>$1.5B MXN</p>
              </div>
              <div style={{ background: "transparent", padding: "1.1vh 1.5vw", borderBottom: "1px solid rgba(255,255,255,0.06)", borderLeft: "1px solid rgba(255,255,255,0.06)" }}>
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.45vw", color: "rgba(255,255,255,0.8)", fontWeight: 600 }}>~$35M–$88M USD</p>
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            background: "rgba(0,200,117,0.1)",
            borderLeft: "0.4vw solid #00C875",
            padding: "1.5vh 2.5vw",
            borderRadius: "0 0.6vw 0.6vw 0",
            marginBottom: "1.5vh"
          }}
        >
          <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.6vw", fontWeight: 500, color: "#FFFFFF", lineHeight: 1.35 }}>
            {es
              ? <>Rieles directos (SIPREL, Conekta, Stripe) eliminan márgenes de intermediarios —<span style={{ color: "#00C875", fontWeight: 700 }}> rentable a $25 MXN desde la transacción 1</span>.</>
              : <>Direct rails (SIPREL, Conekta, Stripe) eliminate intermediary margins —<span style={{ color: "#00C875", fontWeight: 700 }}> profitable at $25 MXN from transaction 1</span>.</>
            }
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.2vw" }}>
          <div style={{ background: "rgba(0,200,117,0.1)", border: "1px solid rgba(0,200,117,0.35)", borderRadius: "0.7vw", padding: "1.5vh 1.8vw" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.7vw", marginBottom: "0.8vh" }}>
              <div style={{ background: "#00C875", borderRadius: "50%", width: "2vh", height: "2vh", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "1.1vw", fontWeight: 900, color: "#004F2D" }}>1</p>
              </div>
              <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.15vw", fontWeight: 700, color: "#00C875", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                {es ? "Ahora · Pagos" : "Now · Payments"}
              </p>
            </div>
            <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "2.4vw", fontWeight: 900, color: "#FFFFFF", lineHeight: 1, marginBottom: "0.4vh" }}>$25 MXN</p>
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.25vw", color: "rgba(255,255,255,0.55)", lineHeight: 1.35 }}>
              {es
                ? "Tarifa fija por transacción — facturas, gift cards, recargas"
                : "Flat fee per transaction — bills, gift cards, top-ups"}
            </p>
          </div>
          <div style={{ background: "rgba(255,92,26,0.08)", border: "1px solid rgba(255,92,26,0.3)", borderRadius: "0.7vw", padding: "1.5vh 1.8vw" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.7vw", marginBottom: "0.8vh" }}>
              <div style={{ background: "#FF5C1A", borderRadius: "50%", width: "2vh", height: "2vh", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "1.1vw", fontWeight: 900, color: "#fff" }}>2</p>
              </div>
              <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.15vw", fontWeight: 700, color: "#FF5C1A", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                {es ? "2027 · Crédito" : "2027 · Credit"}
              </p>
            </div>
            <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "2.4vw", fontWeight: 900, color: "#FFFFFF", lineHeight: 1, marginBottom: "0.4vh" }}>2–4%</p>
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.25vw", color: "rgba(255,255,255,0.55)", lineHeight: 1.35 }}>
              {es
                ? "Fee de originación sobre micro-créditos y BNPL habilitados por el Trust Score"
                : "Origination fee on micro-loans and BNPL enabled by Trust Score"}
            </p>
          </div>
          <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "0.7vw", padding: "1.5vh 1.8vw" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.7vw", marginBottom: "0.8vh" }}>
              <div style={{ background: "rgba(255,255,255,0.3)", borderRadius: "50%", width: "2vh", height: "2vh", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "1.1vw", fontWeight: 900, color: "#004F2D" }}>3</p>
              </div>
              <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.15vw", fontWeight: 700, color: "rgba(255,255,255,0.5)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                {es ? "2028+ · Plataforma" : "2028+ · Platform"}
              </p>
            </div>
            <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "2.4vw", fontWeight: 900, color: "rgba(255,255,255,0.6)", lineHeight: 1, marginBottom: "0.4vh" }}>API SaaS</p>
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.25vw", color: "rgba(255,255,255,0.4)", lineHeight: 1.35 }}>
              {es
                ? "Trust Score API para bancos · seguros · remesas · diáspora en EE.UU./Canadá"
                : "Trust Score API for banks · insurers · remittances · US/Canada diaspora"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
