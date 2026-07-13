import { LANG } from "@/lang";
const es = LANG === "es";

export default function Slide13TheAsk() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "#004F2D" }}>
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% 50%, rgba(0,200,117,0.12) 0%, transparent 65%)" }} />

      <div className="absolute inset-0 flex flex-col justify-between" style={{ padding: "3.5vh 8vw 2.5vh" }}>
        <div>
          <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.6vw", fontWeight: 700, color: "#00C875", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: "0.8vh" }}>
            {es ? "La Inversión" : "The Investment"}
          </p>
          <h2 style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "5vw", fontWeight: 900, color: "#FFFFFF", letterSpacing: "-0.01em", lineHeight: 1, marginBottom: "0.8vh" }}>
            {es ? "Pre-semilla: $250K–$750K USD" : "Pre-Seed: $250K–$750K USD"}
          </h2>
          <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.55vw", color: "rgba(255,255,255,0.55)", marginBottom: "0.8vh" }}>
            {es
              ? "SAFE · 18 meses de operación · Meta: 2,500 billeteras activas · Actualmente en: Founder Institute Austin Verano 2026"
              : "SAFE · 18-month runway · Target: 2,500 active wallets · Currently in: Founder Institute Austin Summer 2026"}
          </p>
          <div style={{ width: "6vw", height: "0.4vh", background: "#00C875", marginBottom: "1.5vh" }} />
        </div>

        <div className="grid grid-cols-4 gap-[1.5vw]">
          {(es ? [
            { pct: "40%", color: "#00C875", title: "Tecnología", body: "Integración STP/SPEI · WhatsApp Business API · Fortalecimiento plataforma", unlock: "Desbloquea: rieles directos + PTI v6 pipeline" },
            { pct: "30%", color: "#FF5C1A", title: "Crecimiento", body: "Expansión red de representantes a 3 ciudades · Primeras 2,500 billeteras activas", unlock: "Desbloquea: datos a escala → pipe B2B PTI" },
            { pct: "20%", color: "rgba(255,255,255,0.7)", title: "Regulatorio", body: "Preparación licencia CNBV SOFOM · Infraestructura legal", unlock: "Desbloquea: originación de crédito 2027" },
            { pct: "10%", color: "rgba(255,255,255,0.7)", title: "Operaciones", body: "Equipo · Cumplimiento · Infraestructura de soporte al cliente", unlock: "Desbloquea: escala sin fricción operativa" },
          ] : [
            { pct: "40%", color: "#00C875", title: "Technology", body: "STP/SPEI integration · WhatsApp Business API · Platform hardening", unlock: "Unlocks: direct rails + PTI v6 pipeline" },
            { pct: "30%", color: "#FF5C1A", title: "Growth", body: "Rep network expansion to 3 cities · First 2,500 active wallets", unlock: "Unlocks: data at scale → PTI B2B pipeline" },
            { pct: "20%", color: "rgba(255,255,255,0.7)", title: "Regulatory", body: "CNBV SOFOM license prep · Legal infrastructure", unlock: "Unlocks: credit origination 2027" },
            { pct: "10%", color: "rgba(255,255,255,0.7)", title: "Operations", body: "Team · Compliance · Customer support infrastructure", unlock: "Unlocks: scale without operational friction" },
          ]).map(({ pct, color, title, body, unlock }) => (
            <div key={title} style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${color}44`, borderRadius: "0.8vw", padding: "1.8vh 1.5vw", display: "flex", flexDirection: "column" }}>
              <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "4.5vw", fontWeight: 900, color, lineHeight: 0.9, marginBottom: "0.6vh" }}>{pct}</p>
              <div style={{ width: "2.5vw", height: "0.3vh", background: color, marginBottom: "0.6vh" }} />
              <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "1.8vw", fontWeight: 700, color: "#FFFFFF", marginBottom: "0.4vh" }}>{title}</p>
              <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.35vw", color: "rgba(255,255,255,0.55)", lineHeight: 1.3, flex: 1 }}>{body}</p>
              <div style={{ background: `${color}18`, border: `1px solid ${color}33`, borderRadius: "0.4vw", padding: "0.5vh 0.8vw", marginTop: "0.8vh" }}>
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.1vw", color, fontWeight: 600, lineHeight: 1.3 }}>{unlock}</p>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: "1.2vh" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "1.5vw", alignItems: "end" }}>
            <div style={{ background: "rgba(0,200,117,0.1)", borderLeft: "0.4vw solid #00C875", padding: "1.4vh 2vw", borderRadius: "0 0.6vw 0.6vw 0" }}>
              <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.7vw", fontWeight: 500, color: "#FFFFFF", lineHeight: 1.4 }}>
                {es
                  ? <><span style={{ color: "#00C875", fontWeight: 700 }}>5 rieles activos · PTI v5.0 certificado · Git cards vivo · Equipo en campo.</span> El stack completo existe — este capital escala lo que ya funciona.</>
                  : <><span style={{ color: "#00C875", fontWeight: 700 }}>5 live rails · PTI v5.0 certified · Gift cards live · Field team deployed.</span> The complete stack exists — this capital scales what already works.</>}
              </p>
            </div>
            <div className="flex flex-col items-end gap-[0.35vh]">
              <span style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.65vw", fontWeight: 700, color: "#FFFFFF" }}>
                Lloyd A. Wright, MBA — Co-Founder &amp; CEO
              </span>
              <span style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.65vw", fontWeight: 700, color: "#FFFFFF" }}>
                Dr. Douglas Franklin, PhD — Co-Founder, Capital &amp; Data
              </span>
              <span style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.5vw", color: "#00C875" }}>
                lloyd@pagoyamx.com · pagoyamx.com
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
