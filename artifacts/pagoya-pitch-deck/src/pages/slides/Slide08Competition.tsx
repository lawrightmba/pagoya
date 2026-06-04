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
          <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.6vw", fontWeight: 700, color: "#00C875", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: "1.8vh" }}>
            P2P: Siguiente Fase
          </p>
          <h2 style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "5vw", fontWeight: 900, color: "#FFFFFF", letterSpacing: "-0.01em", lineHeight: 1, marginBottom: "1.5vh" }}>
            Los pagos se convierten en
            infraestructura social.
          </h2>
          <div style={{ width: "6vw", height: "0.4vh", background: "#00C875", marginBottom: "3.5vh" }} />

          <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "2vw", color: "rgba(255,255,255,0.65)", lineHeight: 1.6, marginBottom: "2.5vh" }}>
            Las transferencias P2P ya están desarrolladas en el backend. La siguiente fase permite dividir gastos, enviar saldo y pagarse entre sí directamente en WhatsApp.
          </p>

          <div style={{ background: "rgba(0,200,117,0.1)", borderLeft: "0.4vw solid #00C875", padding: "2vh 2vw", borderRadius: "0 0.6vw 0.6vw 0" }}>
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.9vw", fontWeight: 500, color: "#FFFFFF", lineHeight: 1.5, fontStyle: "italic" }}>
              "Paga tu mitad del CFE" — un mensaje convierte un pago en una transacción social que llega a un nuevo usuario.
            </p>
          </div>
        </div>

        <div className="flex flex-col justify-center" style={{ flex: 1, padding: "7vh 8vw 7vh 4vw", gap: "2.5vh" }}>
          <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "1.9vw", fontWeight: 700, color: "rgba(255,255,255,0.5)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.5vh" }}>
            El efecto de red
          </p>

          <div className="flex items-start gap-[1.2vw]">
            <div style={{ width: "0.35vw", minWidth: "0.35vw", height: "2.5vh", background: "#00C875", marginTop: "0.3vh" }} />
            <div>
              <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.85vw", fontWeight: 700, color: "#FFFFFF", marginBottom: "0.3vh" }}>Cada pago = demo del producto</p>
              <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.65vw", color: "rgba(255,255,255,0.55)", lineHeight: 1.35 }}>El receptor ve la confirmación en WhatsApp y pregunta cómo registrarse. El ciclo viral no requiere gasto en publicidad.</p>
            </div>
          </div>
          <div className="flex items-start gap-[1.2vw]">
            <div style={{ width: "0.35vw", minWidth: "0.35vw", height: "2.5vh", background: "#00C875", marginTop: "0.3vh" }} />
            <div>
              <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.85vw", fontWeight: 700, color: "#FFFFFF", marginBottom: "0.3vh" }}>Los usuarios se convierten en nodos de distribución</p>
              <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.65vw", color: "rgba(255,255,255,0.55)", lineHeight: 1.35 }}>Cada envío P2P es adquisición orgánica. Más usuarios pagándose entre sí = superficie de referidos exponencial.</p>
            </div>
          </div>
          <div className="flex items-start gap-[1.2vw]">
            <div style={{ width: "0.35vw", minWidth: "0.35vw", height: "2.5vh", background: "#FF5C1A", marginTop: "0.3vh" }} />
            <div>
              <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.85vw", fontWeight: 700, color: "#FFFFFF", marginBottom: "0.3vh" }}>CAC se acerca a cero</p>
              <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.65vw", color: "rgba(255,255,255,0.55)", lineHeight: 1.35 }}>El rep activa 1 usuario → la actividad P2P de ese usuario activa a 3–5 más. Sin marketing pagado.</p>
            </div>
          </div>
          <div className="flex items-start gap-[1.2vw]">
            <div style={{ width: "0.35vw", minWidth: "0.35vw", height: "2.5vh", background: "#FF5C1A", marginTop: "0.3vh" }} />
            <div>
              <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.85vw", fontWeight: 700, color: "#FFFFFF", marginBottom: "0.3vh" }}>Backend ya desarrollado</p>
              <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.65vw", color: "rgba(255,255,255,0.55)", lineHeight: 1.35 }}>La arquitectura billetera-a-billetera está implementada en la API. La activación es una decisión de producto, no técnica.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
