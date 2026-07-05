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
            {es ? "El Verdadero Foso" : "The Real Moat"}
          </p>
          <h2 style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "4.4vw", fontWeight: 900, color: "#FFFFFF", letterSpacing: "-0.01em", lineHeight: 1, marginBottom: "1.5vh" }}>
            {es
              ? "Mercado Pago mueve dinero.\nPagoYa mide confianza."
              : "Mercado Pago moves money.\nPagoYa measures trust."}
          </h2>
          <div style={{ width: "6vw", height: "0.4vh", background: "#00C875", marginBottom: "3.5vh" }} />

          <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.85vw", color: "rgba(255,255,255,0.65)", lineHeight: 1.6, marginBottom: "2.5vh" }}>
            {es
              ? "Mercado Pago, OXXO y Telcel Pagos compiten en el mismo eje: rieles de pago — velocidad, costo, distribución. Ninguno construye un expediente de comportamiento financiero para los 65M de mexicanos sin buró. Esa no es su pelea. Es la nuestra."
              : "Mercado Pago, OXXO, and Telcel Pagos compete on the same axis: payment rails — speed, cost, distribution. None of them build a behavioral financial record for Mexico's 65M credit-invisible consumers. That's not their fight. It's ours."}
          </p>

          <div style={{ background: "rgba(0,200,117,0.1)", borderLeft: "0.4vw solid #00C875", padding: "2vh 2vw", borderRadius: "0 0.6vw 0.6vw 0" }}>
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.9vw", fontWeight: 500, color: "#FFFFFF", lineHeight: 1.5, fontStyle: "italic" }}>
              {es
                ? '"El pago es el sensor. El Payment Trust Index es el producto."'
                : '"The payment is the sensor. The Payment Trust Index is the product."'}
            </p>
          </div>
        </div>

        <div className="flex flex-col justify-start" style={{ flex: 1, padding: "6vh 8vw 5vh 4vw", gap: "2.2vh" }}>
          <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "1.9vw", fontWeight: 700, color: "rgba(255,255,255,0.5)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.5vh" }}>
            {es ? "Por qué no competimos ahí" : "Why we're not competing there"}
          </p>

          <div className="flex items-start gap-[1.2vw]">
            <div style={{ width: "0.35vw", minWidth: "0.35vw", height: "2.5vh", background: "#00C875", marginTop: "0.3vh" }} />
            <div>
              <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.85vw", fontWeight: 700, color: "#FFFFFF", marginBottom: "0.3vh" }}>
                {es ? "Los rieles de pago son un commodity" : "Payment rails are a commodity"}
              </p>
              <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.65vw", color: "rgba(255,255,255,0.55)", lineHeight: 1.35 }}>
                {es
                  ? "Mercado Pago y OXXO ganan por escala y presencia física. PagoYa ya es rentable a $25 MXN por transacción vía rieles directos — no necesitamos ganar esa guerra para ganar la nuestra."
                  : "Mercado Pago and OXXO win on scale and physical footprint. PagoYa is already profitable at $25 MXN per transaction via direct rails — we don't need to win that war to win ours."}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-[1.2vw]">
            <div style={{ width: "0.35vw", minWidth: "0.35vw", height: "2.5vh", background: "#00C875", marginTop: "0.3vh" }} />
            <div>
              <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.85vw", fontWeight: 700, color: "#FFFFFF", marginBottom: "0.3vh" }}>
                {es ? "El dato es el foso, no la app" : "The data is the moat, not the app"}
              </p>
              <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.65vw", color: "rgba(255,255,255,0.55)", lineHeight: 1.35 }}>
                {es
                  ? "Cada pago alimenta el Payment Trust Index — 7 dimensiones de comportamiento real que ningún buró de crédito ha capturado para esta población."
                  : "Every payment feeds the Payment Trust Index — 7 dimensions of real behavior no credit bureau has ever captured for this population."}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-[1.2vw]">
            <div style={{ width: "0.35vw", minWidth: "0.35vw", height: "2.5vh", background: "#FF5C1A", marginTop: "0.3vh" }} />
            <div>
              <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.85vw", fontWeight: 700, color: "#FFFFFF", marginBottom: "0.3vh" }}>
                {es ? "Los comparables reales son otros" : "The real comparables are different"}
              </p>
              <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.65vw", color: "rgba(255,255,255,0.55)", lineHeight: 1.35 }}>
                {es
                  ? "Lenddo/EFL, Destacame, Tala, Branch — calificadores de datos alternativos. Ninguno posee el riel de pago Y el dato en la misma pila como PagoYa."
                  : "Lenddo/EFL, Destacame, Tala, Branch — alternative-data underwriters. None of them own the payment rail and the data in the same stack the way PagoYa does."}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-[1.2vw]">
            <div style={{ width: "0.35vw", minWidth: "0.35vw", height: "2.5vh", background: "#FF5C1A", marginTop: "0.3vh" }} />
            <div>
              <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.85vw", fontWeight: 700, color: "#FFFFFF", marginBottom: "0.3vh" }}>
                {es ? "El modelo de ingresos evoluciona" : "The revenue model evolves"}
              </p>
              <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.65vw", color: "rgba(255,255,255,0.55)", lineHeight: 1.35 }}>
                {es
                  ? "De comisión por transacción a licenciamiento de datos B2B2C — prestamistas, aseguradoras y fintechs que hoy no pueden calificar a los no bancarizados."
                  : "From per-transaction fees to B2B2C data licensing — lenders, insurers, and fintechs who today can't underwrite the unbanked."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
