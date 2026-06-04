export default function Slide03Solution() {
  return (
    <div
      className="relative w-screen h-screen overflow-hidden flex"
      style={{ background: "#004F2D" }}
    >
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at 20% 50%, rgba(0,200,117,0.12) 0%, transparent 65%)"
        }}
      />

      <div
        className="absolute left-0 top-0 bottom-0"
        style={{ width: "0.4vw", background: "linear-gradient(180deg, #00C875 0%, transparent 100%)", opacity: 0.8 }}
      />

      <div className="relative z-10 flex flex-col justify-center" style={{ padding: "7vh 8vw", width: "100%" }}>
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
          La Solución
        </p>
        <h2
          style={{
            fontFamily: "Barlow Condensed, sans-serif",
            fontSize: "5.2vw",
            fontWeight: 900,
            color: "#FFFFFF",
            letterSpacing: "-0.01em",
            lineHeight: 1,
            marginBottom: "1.5vh"
          }}
        >
          Una billetera. Todas las facturas.
          Todas las tarjetas de regalo. Desde tu teléfono.
        </h2>
        <div style={{ width: "6vw", height: "0.4vh", background: "#00C875", marginBottom: "3.5vh" }} />

        <div className="flex gap-[5vw]">
          <div className="flex flex-col gap-[2.2vh]" style={{ flex: 1 }}>
            <div className="flex items-start gap-[1.4vw]">
              <span style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "2.6vw", fontWeight: 900, color: "#00C875", lineHeight: 1, minWidth: "3vw" }}>01</span>
              <div>
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.9vw", fontWeight: 700, color: "#FFFFFF", lineHeight: 1.2, marginBottom: "0.3vh" }}>
                  Carga una vez en OXXO, con tarjeta o débito bancario
                </p>
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.65vw", color: "rgba(255,255,255,0.55)", lineHeight: 1.3 }}>
                  22,000 ubicaciones OXXO · Tarjeta Stripe · Débito bancario Belvo — acreditado en tiempo real
                </p>
              </div>
            </div>
            <div className="flex items-start gap-[1.4vw]">
              <span style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "2.6vw", fontWeight: 900, color: "#00C875", lineHeight: 1, minWidth: "3vw" }}>02</span>
              <div>
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.9vw", fontWeight: 700, color: "#FFFFFF", lineHeight: 1.2, marginBottom: "0.3vh" }}>
                  Paga cualquier servicio desde tu teléfono
                </p>
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.65vw", color: "rgba(255,255,255,0.55)", lineHeight: 1.3 }}>
                  CFE, Telmex, Izzi, TotalPlay, Gas Natural, Telcel, Sky, Megacable, Dish, AT&T
                </p>
              </div>
            </div>
            <div className="flex items-start gap-[1.4vw]">
              <span style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "2.6vw", fontWeight: 900, color: "#00C875", lineHeight: 1, minWidth: "3vw" }}>03</span>
              <div>
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.9vw", fontWeight: 700, color: "#FFFFFF", lineHeight: 1.2, marginBottom: "0.3vh" }}>
                  Compra tarjetas de regalo y paga suscripciones
                </p>
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.65vw", color: "rgba(255,255,255,0.55)", lineHeight: 1.3 }}>
                  Netflix, Amazon, Google Play, Spotify — paga mensualidades o envía como regalo. Primera compra Netflix junio 2026
                </p>
              </div>
            </div>
            <div className="flex items-start gap-[1.4vw]">
              <span style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "2.6vw", fontWeight: 900, color: "#00C875", lineHeight: 1, minWidth: "3vw" }}>04</span>
              <div>
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.9vw", fontWeight: 700, color: "#FFFFFF", lineHeight: 1.2, marginBottom: "0.3vh" }}>
                  Confirmado por WhatsApp · Paula
                </p>
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.65vw", color: "rgba(255,255,255,0.55)", lineHeight: 1.3 }}>
                  Recibo instantáneo, registro permanente, recordatorios de vencimiento — sin descarga de app
                </p>
              </div>
            </div>
          </div>

          <div
            style={{
              flex: "0 0 24vw",
              background: "rgba(0,200,117,0.1)",
              border: "1px solid rgba(0,200,117,0.3)",
              borderRadius: "1vw",
              padding: "3.5vh 2.5vw",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              gap: "2vh"
            }}
          >
            <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "8vw", fontWeight: 900, color: "#00C875", lineHeight: 0.9, letterSpacing: "-0.02em" }}>$25</p>
            <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "2.2vw", fontWeight: 700, color: "#FFFFFF", lineHeight: 1.1 }}>Tarifa fija MXN</p>
            <div style={{ width: "3vw", height: "0.35vh", background: "#00C875" }} />
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.75vw", color: "rgba(255,255,255,0.55)", lineHeight: 1.4 }}>
              Cualquier servicio. Cualquier monto. Facturas o tarjetas de regalo.
            </p>
            <div style={{ height: "0.15vh", background: "rgba(255,255,255,0.1)" }} />
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.65vw", color: "#00C875", fontWeight: 600, lineHeight: 1.4 }}>
              Rentable desde $25 en el lanzamiento — sin precios de pérdida.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
