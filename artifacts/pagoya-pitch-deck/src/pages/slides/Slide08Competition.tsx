import { LANG } from "@/lang";
const es = LANG === "es";

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
        <div className="flex flex-col justify-start" style={{ padding: "6vh 5vw 5vh 8vw", width: "52%" }}>
          <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.6vw", fontWeight: 700, color: "#00C875", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: "1.8vh" }}>
            {es ? "P2P: Siguiente Fase" : "P2P: Next Phase"}
          </p>
          <h2 style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "5vw", fontWeight: 900, color: "#FFFFFF", letterSpacing: "-0.01em", lineHeight: 1, marginBottom: "1.5vh" }}>
            {es
              ? "Los pagos se convierten en\ninfraestructura social."
              : "Payments become\nsocial infrastructure."}
          </h2>
          <div style={{ width: "6vw", height: "0.4vh", background: "#00C875", marginBottom: "3.5vh" }} />

          <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "2vw", color: "rgba(255,255,255,0.65)", lineHeight: 1.6, marginBottom: "2.5vh" }}>
            {es
              ? "Las transferencias P2P ya están desarrolladas en el backend. La siguiente fase permite dividir gastos, enviar saldo y pagarse entre sí directamente en WhatsApp."
              : "P2P transfers are already built in the backend. The next phase lets users split expenses, send balance, and pay each other directly in WhatsApp."}
          </p>

          <div style={{ background: "rgba(0,200,117,0.1)", borderLeft: "0.4vw solid #00C875", padding: "2vh 2vw", borderRadius: "0 0.6vw 0.6vw 0" }}>
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.9vw", fontWeight: 500, color: "#FFFFFF", lineHeight: 1.5, fontStyle: "italic" }}>
              {es
                ? '"Paga tu mitad del CFE" — un mensaje convierte un pago en una transacción social que llega a un nuevo usuario.'
                : '"Pay your half of the CFE" — one message turns a payment into a social transaction that reaches a new user.'}
            </p>
          </div>
        </div>

        <div className="flex flex-col justify-start" style={{ flex: 1, padding: "6vh 8vw 5vh 4vw", gap: "2.2vh" }}>
          <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "1.9vw", fontWeight: 700, color: "rgba(255,255,255,0.5)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.5vh" }}>
            {es ? "El efecto de red" : "The network effect"}
          </p>

          <div className="flex items-start gap-[1.2vw]">
            <div style={{ width: "0.35vw", minWidth: "0.35vw", height: "2.5vh", background: "#00C875", marginTop: "0.3vh" }} />
            <div>
              <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.85vw", fontWeight: 700, color: "#FFFFFF", marginBottom: "0.3vh" }}>
                {es ? "Cada pago = demo del producto" : "Every payment = product demo"}
              </p>
              <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.65vw", color: "rgba(255,255,255,0.55)", lineHeight: 1.35 }}>
                {es
                  ? "El receptor ve la confirmación en WhatsApp y pregunta cómo registrarse. El ciclo viral no requiere gasto en publicidad."
                  : "The recipient sees the WhatsApp confirmation and asks how to sign up. The viral cycle requires zero ad spend."}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-[1.2vw]">
            <div style={{ width: "0.35vw", minWidth: "0.35vw", height: "2.5vh", background: "#00C875", marginTop: "0.3vh" }} />
            <div>
              <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.85vw", fontWeight: 700, color: "#FFFFFF", marginBottom: "0.3vh" }}>
                {es ? "Los usuarios se convierten en nodos de distribución" : "Users become distribution nodes"}
              </p>
              <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.65vw", color: "rgba(255,255,255,0.55)", lineHeight: 1.35 }}>
                {es
                  ? "Cada envío P2P es adquisición orgánica. Más usuarios pagándose entre sí = superficie de referidos exponencial."
                  : "Every P2P send is organic acquisition. More users paying each other = exponential referral surface."}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-[1.2vw]">
            <div style={{ width: "0.35vw", minWidth: "0.35vw", height: "2.5vh", background: "#FF5C1A", marginTop: "0.3vh" }} />
            <div>
              <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.85vw", fontWeight: 700, color: "#FFFFFF", marginBottom: "0.3vh" }}>
                {es ? "CAC se acerca a cero" : "CAC approaches zero"}
              </p>
              <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.65vw", color: "rgba(255,255,255,0.55)", lineHeight: 1.35 }}>
                {es
                  ? "El rep activa 1 usuario → la actividad P2P de ese usuario activa a 3–5 más. Sin marketing pagado."
                  : "Rep activates 1 user → that user's P2P activity activates 3–5 more. Zero paid marketing."}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-[1.2vw]">
            <div style={{ width: "0.35vw", minWidth: "0.35vw", height: "2.5vh", background: "#FF5C1A", marginTop: "0.3vh" }} />
            <div>
              <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.85vw", fontWeight: 700, color: "#FFFFFF", marginBottom: "0.3vh" }}>
                {es ? "Backend ya desarrollado" : "Backend already built"}
              </p>
              <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.65vw", color: "rgba(255,255,255,0.55)", lineHeight: 1.35 }}>
                {es
                  ? "La arquitectura billetera-a-billetera está implementada en la API. La activación es una decisión de producto, no técnica."
                  : "The wallet-to-wallet architecture is implemented in the API. Activation is a product decision, not a technical one."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
