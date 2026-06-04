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
        <div className="flex flex-col justify-center" style={{ padding: "7vh 4vw 7vh 8vw", width: "44%" }}>
          <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.6vw", fontWeight: 700, color: "#00C875", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: "1.8vh" }}>
            Infraestructura
          </p>
          <h2 style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "5vw", fontWeight: 900, color: "#FFFFFF", letterSpacing: "-0.01em", lineHeight: 1, marginBottom: "1.5vh" }}>
            5 rieles activos.
            Sin intermediarios.
          </h2>
          <div style={{ width: "6vw", height: "0.4vh", background: "#00C875", marginBottom: "3.5vh" }} />
          <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.9vw", color: "rgba(255,255,255,0.6)", lineHeight: 1.5, marginBottom: "2vh" }}>
            La mayoría de los competidores pasan por 2–3 capas intermediarias, pagando un margen en cada paso.
          </p>
          <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "2.5vw", fontWeight: 700, color: "#00C875", lineHeight: 1.2 }}>
            PagoYa no.
          </p>
        </div>

        <div className="flex flex-col justify-center" style={{ flex: 1, padding: "7vh 8vw 7vh 3vw", gap: "1.8vh" }}>
          <div style={{ background: "rgba(0,200,117,0.07)", border: "1px solid rgba(0,200,117,0.2)", borderRadius: "0.7vw", padding: "1.8vh 2.2vw", display: "flex", alignItems: "flex-start", gap: "1.2vw" }}>
            <span style={{ fontSize: "1.7vw", lineHeight: 1, marginTop: "0.2vh", flexShrink: 0 }}>✅</span>
            <div style={{ flex: 1 }}>
              <div className="flex items-baseline gap-[1vw]">
                <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "2.2vw", fontWeight: 800, color: "#FFFFFF", lineHeight: 1.1 }}>Stripe</p>
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.6vw", color: "#00C875", fontWeight: 600 }}>Pagos con tarjeta (Visa, Mastercard)</p>
              </div>
              <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.5vw", color: "rgba(255,255,255,0.5)", lineHeight: 1.3 }}>Activo desde el 31 de mayo de 2026</p>
            </div>
          </div>
          <div style={{ background: "rgba(0,200,117,0.07)", border: "1px solid rgba(0,200,117,0.2)", borderRadius: "0.7vw", padding: "1.8vh 2.2vw", display: "flex", alignItems: "flex-start", gap: "1.2vw" }}>
            <span style={{ fontSize: "1.7vw", lineHeight: 1, marginTop: "0.2vh", flexShrink: 0 }}>✅</span>
            <div style={{ flex: 1 }}>
              <div className="flex items-baseline gap-[1vw]">
                <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "2.2vw", fontWeight: 800, color: "#FFFFFF", lineHeight: 1.1 }}>SIPREL</p>
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.6vw", color: "#00C875", fontWeight: 600 }}>Red de pago de facturas — 10+ proveedores</p>
              </div>
              <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.5vw", color: "rgba(255,255,255,0.5)", lineHeight: 1.3 }}>CFE, Telmex, Sky, Izzi, TotalPlay, Gas Natural, Telcel, AT&T, Megacable, Dish</p>
            </div>
          </div>
          <div style={{ background: "rgba(0,200,117,0.07)", border: "1px solid rgba(0,200,117,0.2)", borderRadius: "0.7vw", padding: "1.8vh 2.2vw", display: "flex", alignItems: "flex-start", gap: "1.2vw" }}>
            <span style={{ fontSize: "1.7vw", lineHeight: 1, marginTop: "0.2vh", flexShrink: 0 }}>✅</span>
            <div style={{ flex: 1 }}>
              <div className="flex items-baseline gap-[1vw]">
                <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "2.2vw", fontWeight: 800, color: "#FFFFFF", lineHeight: 1.1 }}>Conekta / OXXO</p>
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.6vw", color: "#00C875", fontWeight: 600 }}>OXXO cash-in + procesamiento de tarjetas</p>
              </div>
              <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.5vw", color: "rgba(255,255,255,0.5)", lineHeight: 1.3 }}>22,000 ubicaciones de depósito en todo el país</p>
            </div>
          </div>
          <div style={{ background: "rgba(0,200,117,0.07)", border: "1px solid rgba(0,200,117,0.2)", borderRadius: "0.7vw", padding: "1.8vh 2.2vw", display: "flex", alignItems: "flex-start", gap: "1.2vw" }}>
            <span style={{ fontSize: "1.7vw", lineHeight: 1, marginTop: "0.2vh", flexShrink: 0 }}>✅</span>
            <div style={{ flex: 1 }}>
              <div className="flex items-baseline gap-[1vw]">
                <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "2.2vw", fontWeight: 800, color: "#FFFFFF", lineHeight: 1.1 }}>Belvo</p>
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.6vw", color: "#00C875", fontWeight: 600 }}>Banca abierta / débito bancario directo</p>
              </div>
              <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.5vw", color: "rgba(255,255,255,0.5)", lineHeight: 1.3 }}>Vinculación de cuentas y pago directo</p>
            </div>
          </div>
          <div style={{ background: "rgba(0,200,117,0.07)", border: "1px solid rgba(0,200,117,0.2)", borderRadius: "0.7vw", padding: "1.8vh 2.2vw", display: "flex", alignItems: "flex-start", gap: "1.2vw" }}>
            <span style={{ fontSize: "1.7vw", lineHeight: 1, marginTop: "0.2vh", flexShrink: 0 }}>✅</span>
            <div style={{ flex: 1 }}>
              <div className="flex items-baseline gap-[1vw]">
                <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "2.2vw", fontWeight: 800, color: "#FFFFFF", lineHeight: 1.1 }}>Tarjetas de Regalo</p>
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.6vw", color: "#00C875", fontWeight: 600 }}>Netflix · Amazon · Google Play · Spotify</p>
              </div>
              <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.5vw", color: "rgba(255,255,255,0.5)", lineHeight: 1.3 }}>Primera compra Netflix procesada junio 2026</p>
            </div>
          </div>
          <div style={{ background: "rgba(255,92,26,0.07)", border: "1px solid rgba(255,92,26,0.2)", borderRadius: "0.7vw", padding: "1.8vh 2.2vw", display: "flex", alignItems: "flex-start", gap: "1.2vw" }}>
            <span style={{ fontSize: "1.7vw", lineHeight: 1, marginTop: "0.2vh", flexShrink: 0 }}>🔜</span>
            <div style={{ flex: 1 }}>
              <div className="flex items-baseline gap-[1vw]">
                <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "2.2vw", fontWeight: 800, color: "#FFFFFF", lineHeight: 1.1 }}>STP / SPEI</p>
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.6vw", color: "#FF5C1A", fontWeight: 600 }}>Rieles de transferencia interbancaria directa</p>
              </div>
              <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.5vw", color: "rgba(255,255,255,0.5)", lineHeight: 1.3 }}>Documentos corporativos enviados — credenciales solicitadas</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
