import { LANG } from "@/lang";
const es = LANG === "es";

const base = import.meta.env.BASE_URL;

export default function Slide01Cover() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "#004F2D" }}>
      <img
        src={`${base}hero-colonia.png`}
        crossOrigin="anonymous"
        alt="Mexico colonia at dusk"
        className="absolute inset-0 w-full h-full object-cover"
        style={{ opacity: 0.28 }}
      />
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(135deg, rgba(0,79,45,0.96) 0%, rgba(0,79,45,0.62) 60%, rgba(0,79,45,0.82) 100%)" }}
      />

      <div className="absolute inset-0 flex flex-col justify-between" style={{ padding: "7vh 8vw" }}>
        <div style={{ maxWidth: "68vw" }}>
          <p
            style={{
              fontFamily: "DM Sans, sans-serif",
              fontSize: "1.9vw",
              fontWeight: 600,
              color: "#00C875",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom: "2.5vh"
            }}
          >
            {es ? "Presentación Pre-Semilla · Julio 2026" : "Pre-Seed Presentation · July 2026"}
          </p>
          <h1
            style={{
              fontFamily: "Barlow Condensed, sans-serif",
              fontSize: "7.5vw",
              fontWeight: 900,
              color: "#FFFFFF",
              lineHeight: 0.93,
              letterSpacing: "-0.01em",
              marginBottom: "3.5vh",
              whiteSpace: "pre-line"
            }}
          >
            {es
              ? "La app de pagos que\nfabrica el activo de datos\nmás valioso de México."
              : "The payments app that\nmanufactures Mexico's\nmost valuable data asset."}
          </h1>
          <div style={{ width: "8vw", height: "0.5vh", background: "#FF5C1A", marginBottom: "3vh" }} />
          <p
            style={{
              fontFamily: "DM Sans, sans-serif",
              fontSize: "2.3vw",
              fontWeight: 500,
              color: "#FFFFFF",
              lineHeight: 1.45,
              opacity: 0.92,
              marginBottom: "1.2vh"
            }}
          >
            {es
              ? "PagoYa convierte pagos de facturas de los 65M no bancarizados de México en puntajes de crédito conductual — el buró que nunca tuvieron. Sin cuenta bancaria. Desde WhatsApp."
              : "PagoYa turns bill payments from Mexico's 65M unbanked into behavioral credit scores — building the credit bureau they never had. No bank account needed. Via WhatsApp."}
          </p>
          <div className="flex items-center gap-[2vw]" style={{ marginTop: "2vh" }}>
            <div style={{ background: "rgba(0,200,117,0.12)", border: "1px solid rgba(0,200,117,0.3)", borderRadius: "0.5vw", padding: "0.7vh 1.4vw" }}>
              <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.5vw", color: "#00C875", fontWeight: 700 }}>
                {es ? "PTI v5.0 · 90+ señales · Certificado fair-lending" : "PTI v5.0 · 90+ signals · Fair-lending certified"}
              </p>
            </div>
            <div style={{ background: "rgba(255,92,26,0.1)", border: "1px solid rgba(255,92,26,0.3)", borderRadius: "0.5vw", padding: "0.7vh 1.4vw" }}>
              <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.5vw", color: "#FF5C1A", fontWeight: 700 }}>
                {es ? "$25 MXN · Rentable desde txn #1" : "$25 MXN · Profitable from txn #1"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-[3vw]">
          <span style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.6vw", color: "rgba(255,255,255,0.5)" }}>
            pagoyamx.com
          </span>
          <span style={{ width: "0.35vw", height: "0.35vw", borderRadius: "50%", background: "#00C875", display: "inline-block" }} />
          <span style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.6vw", color: "rgba(255,255,255,0.5)" }}>
            lloyd@pagoyamx.com
          </span>
          <span style={{ width: "0.35vw", height: "0.35vw", borderRadius: "50%", background: "#00C875", display: "inline-block" }} />
          <span style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.6vw", color: "rgba(255,255,255,0.5)" }}>
            Founder Institute Austin · Summer 2026
          </span>
        </div>
      </div>

      <div
        className="absolute right-0 top-0 bottom-0"
        style={{ width: "0.4vw", background: "linear-gradient(180deg, #00C875 0%, transparent 100%)", opacity: 0.7 }}
      />
    </div>
  );
}
