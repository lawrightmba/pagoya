export default function Slide10Traction() {
  return (
    <div
      className="relative w-screen h-screen overflow-hidden"
      style={{ background: "#004F2D" }}
    >
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse at 85% 70%, rgba(0,200,117,0.08) 0%, transparent 55%)" }}
      />

      <div className="relative z-10 flex h-full">
        <div className="flex flex-col justify-center" style={{ padding: "5vh 4vw 5vh 8vw", width: "44%" }}>
          <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.6vw", fontWeight: 700, color: "#00C875", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: "1.2vh" }}>
            Infraestructura
          </p>
          <h2 style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "5vw", fontWeight: 900, color: "#FFFFFF", letterSpacing: "-0.01em", lineHeight: 1, marginBottom: "1.2vh" }}>
            5 rieles activos.
            Sin intermediarios.
          </h2>
          <div style={{ width: "6vw", height: "0.4vh", background: "#00C875", marginBottom: "2.5vh" }} />
          <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.9vw", color: "rgba(255,255,255,0.6)", lineHeight: 1.5, marginBottom: "1.5vh" }}>
            La mayoría de los competidores pasan por 2–3 capas intermediarias, pagando un margen en cada paso.
          </p>
          <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "2.5vw", fontWeight: 700, color: "#00C875", lineHeight: 1.2 }}>
            PagoYa no.
          </p>
        </div>

        <div className="flex flex-col justify-center" style={{ flex: 1, padding: "5vh 8vw 5vh 3vw", gap: "1.3vh" }}>
          {[
            { live: true, name: "Stripe", detail: "Pagos con tarjeta (Visa, Mastercard)", note: "Activo desde el 31 de mayo de 2026" },
            { live: true, name: "SIPREL", detail: "Red de pago de facturas — 10+ proveedores", note: "CFE, Telmex, Sky, Izzi, TotalPlay, Gas Natural, Telcel, AT&T, Megacable, Dish" },
            { live: true, name: "Conekta / OXXO", detail: "OXXO cash-in + procesamiento de tarjetas", note: "22,000 ubicaciones de depósito en todo el país" },
            { live: true, name: "STP / SPEI", detail: "Transferencia interbancaria directa", note: "CLABE única por usuario · riel activo de depósito a billetera" },
            { live: true, name: "Tarjetas de Regalo", detail: "Netflix · Amazon · Google Play · Spotify", note: "Primera compra Netflix procesada junio 2026" },
            { live: false, name: "Belvo", detail: "Banca abierta / débito bancario directo", note: "Deprioritizado jun 2026 — STP/SPEI cubre el riel directo" },
          ].map(({ live, name, detail, note }) => (
            <div key={name} style={{ background: live ? "rgba(0,200,117,0.07)" : "rgba(255,92,26,0.07)", border: `1px solid ${live ? "rgba(0,200,117,0.2)" : "rgba(255,92,26,0.2)"}`, borderRadius: "0.7vw", padding: "1.3vh 2.2vw", display: "flex", alignItems: "flex-start", gap: "1.2vw" }}>
              <span style={{ fontSize: "1.6vw", lineHeight: 1, marginTop: "0.2vh", flexShrink: 0 }}>{live ? "✅" : "🔜"}</span>
              <div style={{ flex: 1 }}>
                <div className="flex items-baseline gap-[1vw]">
                  <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "2vw", fontWeight: 800, color: "#FFFFFF", lineHeight: 1.1 }}>{name}</p>
                  <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.5vw", color: live ? "#00C875" : "#FF5C1A", fontWeight: 600 }}>{detail}</p>
                </div>
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.35vw", color: "rgba(255,255,255,0.5)", lineHeight: 1.3 }}>{note}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
