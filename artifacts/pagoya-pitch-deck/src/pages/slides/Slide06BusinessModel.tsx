import { useLang } from "@/lang";

export default function Slide06BusinessModel() {
  const { es } = useLang();
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "#004F2D" }}>
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 60% 40%, rgba(0,200,117,0.09) 0%, transparent 60%)" }} />

      <div className="relative z-10 flex flex-col h-full" style={{ padding: "2.5vh 8vw 2vh" }}>
        <div style={{ marginBottom: "1vh", flexShrink: 0 }}>
          <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.4vw", fontWeight: 700, color: "#00C875", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: "0.5vh" }}>
            {es ? "Modelo de Negocio" : "Business Model"}
          </p>
          <h2 style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "3.8vw", fontWeight: 900, color: "#FFFFFF", letterSpacing: "-0.01em", lineHeight: 1, marginBottom: "0.5vh" }}>
            {es
              ? "Tres capas de ingresos. Las dos primeras están activas hoy."
              : "Three revenue layers. The first two are active today."}
          </h2>
          <div style={{ width: "6vw", height: "0.4vh", background: "#00C875" }} />
        </div>

        <div className="flex gap-[2vw]" style={{ marginBottom: "1vh", flexShrink: 0 }}>
          <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "0.8vw", padding: "1.2vh 2vw", flex: "0 0 16vw" }}>
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.3vw", fontWeight: 700, color: "rgba(255,255,255,0.5)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.8vh" }}>
              {es ? "Por Transacción" : "Per Transaction"}
            </p>
            <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "5.5vw", fontWeight: 900, color: "#00C875", lineHeight: 0.9, marginBottom: "0.4vh" }}>$25</p>
            <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "1.8vw", fontWeight: 700, color: "#FFFFFF" }}>
              {es ? "MXN fija" : "MXN flat"}
            </p>
            <div style={{ height: "0.15vh", background: "rgba(255,255,255,0.1)", margin: "1vh 0" }} />
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.3vw", color: "rgba(255,255,255,0.55)", lineHeight: 1.3 }}>
              {es ? "Facturas o tarjetas de regalo. Rieles directos — rentable desde txn 1." : "Bills or gift cards. Direct rails — profitable from txn 1."}
            </p>
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1.8fr 1fr 1fr 1.4fr", gap: 0, border: "1px solid rgba(255,255,255,0.1)", borderRadius: "0.8vw", overflow: "hidden" }}>
              {[
                { label: es ? "Billeteras Activas" : "Active Wallets", bg: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" },
                { label: `2× / ${es ? "mes" : "mo"}`, bg: "rgba(255,255,255,0.08)", color: "rgba(0,200,117,0.8)" },
                { label: `5× / ${es ? "mes" : "mo"}`, bg: "rgba(255,92,26,0.1)", color: "#FF5C1A" },
                { label: es ? "Equiv. USD" : "USD Equiv.", bg: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" },
              ].map(({ label, bg, color }) => (
                <div key={label} style={{ background: bg, padding: "1.1vh 1.5vw", borderBottom: "1px solid rgba(255,255,255,0.08)", borderRight: "1px solid rgba(255,255,255,0.08)" }}>
                  <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.4vw", fontWeight: 700, color, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</p>
                </div>
              ))}
              {[
                ["2,500", "$150K MXN", "$375K MXN", "—"],
                ["25,000", "$1.5M MXN", "$3.75M MXN", "—"],
                ["250,000", "$15M MXN", "$37.5M MXN", "~$880K–$2.2M USD"],
                ["1,000,000", "$600M MXN", "$1.5B MXN", "~$35M–$88M USD"],
              ].map((row, ri) =>
                row.map((cell, ci) => (
                  <div key={`${ri}-${ci}`} style={{ background: ci === 2 ? "rgba(255,92,26,0.04)" : ci === 0 && ri === 3 ? "rgba(0,200,117,0.1)" : "transparent", padding: "1vh 1.5vw", borderBottom: ri < 3 ? "1px solid rgba(255,255,255,0.06)" : undefined, borderRight: ci < 3 ? "1px solid rgba(255,255,255,0.06)" : undefined }}>
                    <p style={{ fontFamily: ci === 0 ? "Barlow Condensed, sans-serif" : "DM Sans, sans-serif", fontSize: ci === 0 ? "2vw" : "1.5vw", fontWeight: ci === 0 ? 800 : 400, color: ci === 0 && ri === 3 ? "#00C875" : ci === 2 && ri === 3 ? "#FF5C1A" : "rgba(255,255,255,0.8)" }}>
                      {cell}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div style={{ background: "rgba(0,200,117,0.1)", borderLeft: "0.4vw solid #00C875", padding: "1.2vh 2.5vw", borderRadius: "0 0.6vw 0.6vw 0", marginBottom: "1vh", flexShrink: 0 }}>
          <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.55vw", fontWeight: 500, color: "#FFFFFF", lineHeight: 1.35 }}>
            {es
              ? <>Rieles directos (SIPREL, Conekta, Stripe) eliminan márgenes intermediarios —<span style={{ color: "#00C875", fontWeight: 700 }}> rentable a $25 MXN desde transacción 1</span>.</>
              : <>Direct rails (SIPREL, Conekta, Stripe) eliminate intermediary margins —<span style={{ color: "#00C875", fontWeight: 700 }}> profitable at $25 MXN from transaction 1</span>.</>}
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.2vw", flexShrink: 0 }}>
          <div style={{ background: "rgba(0,200,117,0.1)", border: "1px solid rgba(0,200,117,0.35)", borderRadius: "0.7vw", padding: "1.4vh 1.8vw" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.7vw", marginBottom: "0.7vh" }}>
              <div style={{ background: "#00C875", borderRadius: "50%", width: "2vh", height: "2vh", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "1.1vw", fontWeight: 900, color: "#004F2D" }}>1</p>
              </div>
              <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.1vw", fontWeight: 700, color: "#00C875", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                {es ? "Ahora · Pagos" : "Now · Payments"}
              </p>
              <div style={{ background: "#00C87522", border: "1px solid #00C87555", borderRadius: "0.3vw", padding: "0.2vh 0.5vw", marginLeft: "auto" }}>
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "0.9vw", fontWeight: 700, color: "#00C875" }}>✅ {es ? "ACTIVO" : "LIVE"}</p>
              </div>
            </div>
            <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "2.2vw", fontWeight: 900, color: "#FFFFFF", lineHeight: 1, marginBottom: "0.3vh" }}>$25 MXN</p>
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.2vw", color: "rgba(255,255,255,0.55)", lineHeight: 1.35 }}>
              {es ? "Tarifa fija por transacción — facturas, gift cards, recargas" : "Flat fee per transaction — bills, gift cards, top-ups"}
            </p>
          </div>
          <div style={{ background: "rgba(255,92,26,0.1)", border: "1px solid rgba(255,92,26,0.35)", borderRadius: "0.7vw", padding: "1.4vh 1.8vw" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.7vw", marginBottom: "0.7vh" }}>
              <div style={{ background: "#FF5C1A", borderRadius: "50%", width: "2vh", height: "2vh", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "1.1vw", fontWeight: 900, color: "#fff" }}>2</p>
              </div>
              <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.1vw", fontWeight: 700, color: "#FF5C1A", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                {es ? "Ahora · Datos PTI" : "Now · PTI Data"}
              </p>
              <div style={{ background: "#FF5C1A22", border: "1px solid #FF5C1A55", borderRadius: "0.3vw", padding: "0.2vh 0.5vw", marginLeft: "auto" }}>
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "0.9vw", fontWeight: 700, color: "#FF5C1A" }}>✅ {es ? "ACTIVO" : "LIVE"}</p>
              </div>
            </div>
            <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "2.2vw", fontWeight: 900, color: "#FFFFFF", lineHeight: 1, marginBottom: "0.3vh" }}>
              {es ? "API B2B" : "B2B API"}
            </p>
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.2vw", color: "rgba(255,255,255,0.55)", lineHeight: 1.35 }}>
              {es ? "PTI licenciado a prestamistas, aseguradoras y fintechs · conjuntos de datos anonimizados" : "PTI licensed to lenders, insurers, fintechs · anonymized datasets"}
            </p>
          </div>
          <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "0.7vw", padding: "1.4vh 1.8vw" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.7vw", marginBottom: "0.7vh" }}>
              <div style={{ background: "rgba(255,255,255,0.3)", borderRadius: "50%", width: "2vh", height: "2vh", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "1.1vw", fontWeight: 900, color: "#004F2D" }}>3</p>
              </div>
              <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.1vw", fontWeight: 700, color: "rgba(255,255,255,0.5)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                {es ? "2027 · Originación de Crédito" : "2027 · Credit Origination"}
              </p>
            </div>
            <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "2.2vw", fontWeight: 900, color: "rgba(255,255,255,0.6)", lineHeight: 1, marginBottom: "0.3vh" }}>2–4%</p>
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.2vw", color: "rgba(255,255,255,0.4)", lineHeight: 1.35 }}>
              {es ? "Fee de originación sobre micro-créditos y BNPL habilitados por el PTI" : "Origination fee on micro-loans and BNPL enabled by PTI"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
