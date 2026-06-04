export default function Slide02Problem() {
  return (
    <div
      className="relative w-screen h-screen overflow-hidden flex"
      style={{ background: "#004F2D" }}
    >
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(ellipse at 80% 50%, rgba(255,92,26,0.1) 0%, transparent 65%)"
        }}
      />

      <div
        className="absolute left-0 top-0 bottom-0"
        style={{ width: "0.4vw", background: "linear-gradient(180deg, #FF5C1A 0%, transparent 100%)", opacity: 0.8 }}
      />

      <div className="relative z-10 flex flex-col justify-center" style={{ padding: "7vh 8vw", width: "100%" }}>
        <p
          style={{
            fontFamily: "DM Sans, sans-serif",
            fontSize: "1.6vw",
            fontWeight: 700,
            color: "#FF5C1A",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            marginBottom: "1.8vh"
          }}
        >
          El Problema
        </p>
        <h2
          style={{
            fontFamily: "Barlow Condensed, sans-serif",
            fontSize: "5.5vw",
            fontWeight: 900,
            color: "#FFFFFF",
            letterSpacing: "-0.01em",
            lineHeight: 1,
            marginBottom: "1.5vh",
            textWrap: "balance"
          }}
        >
          65 millones de adultos no bancarizados
          pagan facturas en tiendas de conveniencia.
        </h2>
        <div style={{ width: "6vw", height: "0.4vh", background: "#FF5C1A", marginBottom: "4vh" }} />

        <p
          style={{
            fontFamily: "DM Sans, sans-serif",
            fontSize: "2.1vw",
            fontWeight: 400,
            color: "rgba(255,255,255,0.55)",
            marginBottom: "3.5vh"
          }}
        >
          $14–20 MXN por servicio, por viaje, cada mes — haciendo fila, solo efectivo, sin registro digital.
        </p>

        <div className="grid grid-cols-2 gap-x-[5vw] gap-y-[2.8vh]" style={{ maxWidth: "80vw" }}>
          <div className="flex items-start gap-[1.2vw]">
            <div style={{ width: "0.35vw", minWidth: "0.35vw", height: "2.8vh", background: "#FF5C1A", marginTop: "0.4vh" }} />
            <div>
              <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "2.6vw", fontWeight: 800, color: "#FFFFFF", lineHeight: 1.1 }}>
                $60–80 MXN/mes
              </p>
              <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.8vw", color: "rgba(255,255,255,0.55)", lineHeight: 1.3 }}>
                en comisiones por hogar típico (CFE + Telmex + 2 recargas)
              </p>
            </div>
          </div>
          <div className="flex items-start gap-[1.2vw]">
            <div style={{ width: "0.35vw", minWidth: "0.35vw", height: "2.8vh", background: "#FF5C1A", marginTop: "0.4vh" }} />
            <div>
              <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "2.6vw", fontWeight: 800, color: "#FFFFFF", lineHeight: 1.1 }}>
                20–35 minutos
              </p>
              <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.8vw", color: "rgba(255,255,255,0.55)", lineHeight: 1.3 }}>
                por visita a tienda incluyendo traslado y tiempo de espera
              </p>
            </div>
          </div>
          <div className="flex items-start gap-[1.2vw]">
            <div style={{ width: "0.35vw", minWidth: "0.35vw", height: "2.8vh", background: "#FF5C1A", marginTop: "0.4vh" }} />
            <div>
              <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "2.6vw", fontWeight: 800, color: "#FFFFFF", lineHeight: 1.1 }}>
                $400–600 MXN
              </p>
              <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.8vw", color: "rgba(255,255,255,0.55)", lineHeight: 1.3 }}>
                comisión de reconexión CFE si se atrasa el pago
              </p>
            </div>
          </div>
          <div className="flex items-start gap-[1.2vw]">
            <div style={{ width: "0.35vw", minWidth: "0.35vw", height: "2.8vh", background: "#FF5C1A", marginTop: "0.4vh" }} />
            <div>
              <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "2.6vw", fontWeight: 800, color: "#FFFFFF", lineHeight: 1.1 }}>
                Sin registro digital
              </p>
              <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.8vw", color: "rgba(255,255,255,0.55)", lineHeight: 1.3 }}>
                sin historial de pagos, sin huella crediticia, sin recibos — invisibles financieramente
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
