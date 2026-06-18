import { LANG } from "@/lang";
const es = LANG === "es";

export default function Slide13TheAsk() {
  return (
    <div
      className="relative w-screen h-screen overflow-hidden"
      style={{ background: "#004F2D" }}
    >
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse at 50% 50%, rgba(0,200,117,0.12) 0%, transparent 65%)" }}
      />

      <div className="absolute inset-0 flex flex-col justify-between" style={{ padding: "4vh 8vw" }}>
        <div>
          <p
            style={{
              fontFamily: "DM Sans, sans-serif",
              fontSize: "1.6vw",
              fontWeight: 700,
              color: "#00C875",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              marginBottom: "1vh"
            }}
          >
            {es ? "La Inversión" : "The Investment"}
          </p>
          <h2
            style={{
              fontFamily: "Barlow Condensed, sans-serif",
              fontSize: "5vw",
              fontWeight: 900,
              color: "#FFFFFF",
              letterSpacing: "-0.01em",
              lineHeight: 1,
              marginBottom: "1vh"
            }}
          >
            {es ? "Pre-semilla: $250K–$750K USD" : "Pre-Seed: $250K–$750K USD"}
          </h2>
          <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.6vw", color: "rgba(255,255,255,0.55)", marginBottom: "1vh" }}>
            {es
              ? "SAFE · 18 meses de operación · Meta: 2,500 billeteras activas · Actualmente en: Founder Institute Austin Verano 2026"
              : "SAFE · 18-month runway · Target: 2,500 active wallets · Currently in: Founder Institute Austin Summer 2026"}
          </p>
          <div style={{ width: "6vw", height: "0.4vh", background: "#00C875", marginBottom: "2vh" }} />
        </div>

        <div className="grid grid-cols-4 gap-[1.5vw]">
          <div style={{ background: "rgba(0,200,117,0.1)", border: "1px solid rgba(0,200,117,0.25)", borderRadius: "0.8vw", padding: "2vh 1.5vw" }}>
            <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "4.5vw", fontWeight: 900, color: "#00C875", lineHeight: 0.9, marginBottom: "0.8vh" }}>40%</p>
            <div style={{ width: "2.5vw", height: "0.3vh", background: "#00C875", marginBottom: "0.8vh" }} />
            <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "1.8vw", fontWeight: 700, color: "#FFFFFF", marginBottom: "0.5vh" }}>
              {es ? "Tecnología" : "Technology"}
            </p>
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.45vw", color: "rgba(255,255,255,0.55)", lineHeight: 1.3 }}>
              {es
                ? "Integración STP/SPEI · WhatsApp Business API · Fortalecimiento de plataforma"
                : "STP/SPEI integration · WhatsApp Business API · Platform hardening"}
            </p>
          </div>
          <div style={{ background: "rgba(255,92,26,0.1)", border: "1px solid rgba(255,92,26,0.25)", borderRadius: "0.8vw", padding: "2vh 1.5vw" }}>
            <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "4.5vw", fontWeight: 900, color: "#FF5C1A", lineHeight: 0.9, marginBottom: "0.8vh" }}>30%</p>
            <div style={{ width: "2.5vw", height: "0.3vh", background: "#FF5C1A", marginBottom: "0.8vh" }} />
            <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "1.8vw", fontWeight: 700, color: "#FFFFFF", marginBottom: "0.5vh" }}>
              {es ? "Crecimiento" : "Growth"}
            </p>
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.45vw", color: "rgba(255,255,255,0.55)", lineHeight: 1.3 }}>
              {es
                ? "Expansión de red de representantes a 3 ciudades · Primeras 2,500 billeteras activas"
                : "Rep network expansion to 3 cities · First 2,500 active wallets"}
            </p>
          </div>
          <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "0.8vw", padding: "2vh 1.5vw" }}>
            <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "4.5vw", fontWeight: 900, color: "rgba(255,255,255,0.7)", lineHeight: 0.9, marginBottom: "0.8vh" }}>20%</p>
            <div style={{ width: "2.5vw", height: "0.3vh", background: "rgba(255,255,255,0.7)", marginBottom: "0.8vh" }} />
            <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "1.8vw", fontWeight: 700, color: "#FFFFFF", marginBottom: "0.5vh" }}>
              {es ? "Regulatorio" : "Regulatory"}
            </p>
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.45vw", color: "rgba(255,255,255,0.55)", lineHeight: 1.3 }}>
              {es
                ? "Preparación licencia CNBV SOFOM · Infraestructura legal"
                : "CNBV SOFOM license preparation · Legal infrastructure"}
            </p>
          </div>
          <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "0.8vw", padding: "2vh 1.5vw" }}>
            <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "4.5vw", fontWeight: 900, color: "rgba(255,255,255,0.7)", lineHeight: 0.9, marginBottom: "0.8vh" }}>10%</p>
            <div style={{ width: "2.5vw", height: "0.3vh", background: "rgba(255,255,255,0.7)", marginBottom: "0.8vh" }} />
            <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "1.8vw", fontWeight: 700, color: "#FFFFFF", marginBottom: "0.5vh" }}>
              {es ? "Operaciones" : "Operations"}
            </p>
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.45vw", color: "rgba(255,255,255,0.55)", lineHeight: 1.3 }}>
              {es
                ? "Equipo · Cumplimiento · Infraestructura de soporte al cliente"
                : "Team · Compliance · Customer support infrastructure"}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between" style={{ marginTop: "1.2vh" }}>
          <div
            style={{
              background: "rgba(0,200,117,0.1)",
              borderLeft: "0.4vw solid #00C875",
              padding: "1.5vh 2vw",
              borderRadius: "0 0.6vw 0.6vw 0"
            }}
          >
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.75vw", fontWeight: 500, color: "#FFFFFF", lineHeight: 1.4 }}>
              {es
                ? "5 rieles activos · Tarjetas de regalo activas · Equipo en campo · Founder Institute Austin Verano 2026"
                : "5 live rails · Gift cards live · Field team deployed · Founder Institute Austin Summer 2026"}
            </p>
          </div>
          <div className="flex flex-col items-end gap-[0.3vh]">
            <span style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.7vw", fontWeight: 700, color: "#FFFFFF" }}>
              Lloyd A. Wright, MBA — Co-Founder &amp; CEO
            </span>
            <span style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.7vw", fontWeight: 700, color: "#FFFFFF" }}>
              Dr. Douglas Franklin, PhD — Co-Founder, Capital &amp; Data Strategy
            </span>
            <span style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.55vw", color: "#00C875" }}>
              lloyd@pagoyamx.com · pagoyamx.com
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
