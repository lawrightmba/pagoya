import { LANG } from "@/lang";
const es = LANG === "es";

export default function Slide04Market() {
  return (
    <div
      className="relative w-screen h-screen overflow-hidden"
      style={{ background: "#004F2D" }}
    >
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse at 75% 30%, rgba(0,200,117,0.1) 0%, transparent 60%)" }}
      />

      <div className="relative z-10 flex flex-col" style={{ padding: "6vh 8vw 5vh" }}>
        <div style={{ marginBottom: "3.5vh" }}>
          <p
            style={{
              fontFamily: "DM Sans, sans-serif",
              fontSize: "1.6vw",
              fontWeight: 700,
              color: "#00C875",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              marginBottom: "1.2vh"
            }}
          >
            {es ? "Lo Que Está Activo Ahora" : "What's Live Right Now"}
          </p>
          <h2
            style={{
              fontFamily: "Barlow Condensed, sans-serif",
              fontSize: "5vw",
              fontWeight: 900,
              color: "#FFFFFF",
              letterSpacing: "-0.01em",
              lineHeight: 1,
              marginBottom: "1.5vh"
            }}
          >
            {es ? "No lo presentamos.\nLo construimos." : "We didn't pitch it.\nWe built it."}
          </h2>
          <div style={{ width: "6vw", height: "0.4vh", background: "#00C875" }} />
        </div>

        <div className="grid grid-cols-2 gap-x-[3vw] gap-y-[1.8vh]" style={{ marginBottom: "3.5vh" }}>
          <div style={{ background: "rgba(0,200,117,0.08)", border: "1px solid rgba(0,200,117,0.25)", borderRadius: "0.7vw", padding: "1.8vh 2vw", display: "flex", alignItems: "flex-start", gap: "1.2vw" }}>
            <span style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.9vw", lineHeight: 1, marginTop: "0.15vh", flexShrink: 0 }}>✅</span>
            <div>
              <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "2.1vw", fontWeight: 800, color: "#FFFFFF", lineHeight: 1.1, marginBottom: "0.3vh" }}>
                {es ? "Pagos con tarjeta Stripe" : "Stripe card payments"}
              </p>
              <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.6vw", color: "rgba(255,255,255,0.55)", lineHeight: 1.3 }}>
                {es ? "Activo desde el 31 de mayo de 2026" : "Live since May 31, 2026"}
              </p>
            </div>
          </div>
          <div style={{ background: "rgba(0,200,117,0.08)", border: "1px solid rgba(0,200,117,0.25)", borderRadius: "0.7vw", padding: "1.8vh 2vw", display: "flex", alignItems: "flex-start", gap: "1.2vw" }}>
            <span style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.9vw", lineHeight: 1, marginTop: "0.15vh", flexShrink: 0 }}>✅</span>
            <div>
              <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "2.1vw", fontWeight: 800, color: "#FFFFFF", lineHeight: 1.1, marginBottom: "0.3vh" }}>
                {es ? "Red de pagos SIPREL" : "SIPREL payment network"}
              </p>
              <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.6vw", color: "rgba(255,255,255,0.55)", lineHeight: 1.3 }}>
                {es ? "10+ proveedores — CFE, Telmex, Sky, Izzi, Telcel…" : "10+ providers — CFE, Telmex, Sky, Izzi, Telcel…"}
              </p>
            </div>
          </div>
          <div style={{ background: "rgba(0,200,117,0.08)", border: "1px solid rgba(0,200,117,0.25)", borderRadius: "0.7vw", padding: "1.8vh 2vw", display: "flex", alignItems: "flex-start", gap: "1.2vw" }}>
            <span style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.9vw", lineHeight: 1, marginTop: "0.15vh", flexShrink: 0 }}>✅</span>
            <div>
              <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "2.1vw", fontWeight: 800, color: "#FFFFFF", lineHeight: 1.1, marginBottom: "0.3vh" }}>
                Conekta / OXXO cash-in
              </p>
              <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.6vw", color: "rgba(255,255,255,0.55)", lineHeight: 1.3 }}>
                {es ? "22,000 ubicaciones de depósito activas en todo el país" : "22,000 active deposit locations nationwide"}
              </p>
            </div>
          </div>
          <div style={{ background: "rgba(255,92,26,0.07)", border: "1px solid rgba(255,92,26,0.25)", borderRadius: "0.7vw", padding: "1.8vh 2vw", display: "flex", alignItems: "flex-start", gap: "1.2vw" }}>
            <span style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.9vw", lineHeight: 1, marginTop: "0.15vh", flexShrink: 0 }}>🔜</span>
            <div>
              <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "2.1vw", fontWeight: 800, color: "#FFFFFF", lineHeight: 1.1, marginBottom: "0.3vh" }}>
                {es ? "Banca abierta Belvo" : "Belvo open banking"}
              </p>
              <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.6vw", color: "rgba(255,255,255,0.55)", lineHeight: 1.3 }}>
                {es ? "Deprioritizado jun 2026 — STP/SPEI cubre el riel directo" : "Deprioritized Jun 2026 — STP/SPEI covers the direct rail"}
              </p>
            </div>
          </div>
          <div style={{ background: "rgba(0,200,117,0.08)", border: "1px solid rgba(0,200,117,0.25)", borderRadius: "0.7vw", padding: "1.8vh 2vw", display: "flex", alignItems: "flex-start", gap: "1.2vw" }}>
            <span style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.9vw", lineHeight: 1, marginTop: "0.15vh", flexShrink: 0 }}>✅</span>
            <div>
              <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "2.1vw", fontWeight: 800, color: "#FFFFFF", lineHeight: 1.1, marginBottom: "0.3vh" }}>
                {es
                  ? "Tarjetas de regalo: Netflix · Amazon · Google Play · Spotify"
                  : "Gift cards: Netflix · Amazon · Google Play · Spotify"}
              </p>
              <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.6vw", color: "rgba(255,255,255,0.55)", lineHeight: 1.3 }}>
                {es ? "Primera tarjeta de regalo Netflix procesada junio 2026" : "First Netflix gift card processed June 2026"}
              </p>
            </div>
          </div>
          <div style={{ background: "rgba(255,92,26,0.07)", border: "1px solid rgba(255,92,26,0.25)", borderRadius: "0.7vw", padding: "1.8vh 2vw", display: "flex", alignItems: "flex-start", gap: "1.2vw" }}>
            <span style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.9vw", lineHeight: 1, marginTop: "0.15vh", flexShrink: 0 }}>🔜</span>
            <div>
              <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "2.1vw", fontWeight: 800, color: "#FFFFFF", lineHeight: 1.1, marginBottom: "0.3vh" }}>
                {es ? "STP / SPEI transferencia interbancaria" : "STP / SPEI interbank transfer"}
              </p>
              <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.6vw", color: "rgba(255,255,255,0.55)", lineHeight: 1.3 }}>
                {es ? "Documentos corporativos enviados, credenciales solicitadas" : "Corporate docs submitted, credentials requested"}
              </p>
            </div>
          </div>
        </div>

        <div style={{ background: "rgba(0,200,117,0.1)", borderLeft: "0.4vw solid #00C875", padding: "2vh 2.5vw", borderRadius: "0 0.6vw 0.6vw 0" }}>
          <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.9vw", fontWeight: 500, color: "#FFFFFF", lineHeight: 1.4 }}>
            {es
              ? "Usuarios beta registrados · Equipo en campo en colonias de Puerto Vallarta · Indexado en Google Search Console"
              : "Beta users registered · Field team active in Puerto Vallarta neighborhoods · Indexed in Google Search Console"}
          </p>
        </div>
      </div>
    </div>
  );
}
