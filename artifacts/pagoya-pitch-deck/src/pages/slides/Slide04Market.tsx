import { LANG } from "@/lang";
const es = LANG === "es";

export default function Slide04Market() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "#004F2D" }}>
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 75% 30%, rgba(0,200,117,0.1) 0%, transparent 60%)" }} />

      <div className="relative z-10 flex flex-col h-full" style={{ padding: "2.5vh 8vw 2vh" }}>
        <div style={{ marginBottom: "1.5vh", flexShrink: 0 }}>
          <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.5vw", fontWeight: 700, color: "#00C875", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: "0.7vh" }}>
            {es ? "Tracción" : "Traction"}
          </p>
          <h2 style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "4vw", fontWeight: 900, color: "#FFFFFF", letterSpacing: "-0.01em", lineHeight: 1, marginBottom: "0.7vh" }}>
            {es ? <span>No lo presentamos. <span style={{ color: "#00C875" }}>Lo construimos.</span></span>
              : <span>We didn't pitch it. <span style={{ color: "#00C875" }}>We built it.</span></span>}
          </h2>
          <div style={{ width: "6vw", height: "0.35vh", background: "#00C875" }} />
        </div>

        <div className="grid grid-cols-4 gap-[1.5vw]" style={{ marginBottom: "1.5vh", flexShrink: 0 }}>
          {[
            { stat: "5", label: es ? "Rieles activos" : "Live rails", sub: "Stripe · SIPREL · Conekta · STP · Gift cards", color: "#00C875" },
            { stat: "90+", label: es ? "Señales PTI" : "PTI signals", sub: es ? "v5.0 · Certificado fair-lending jul 2026" : "v5.0 · Fair-lending certified Jul 2026", color: "#00C875" },
            { stat: "22K", label: "OXXO", sub: es ? "Puntos de depósito activos en todo México" : "Active deposit locations across Mexico", color: "#FF5C1A" },
            { stat: "$25", label: es ? "MXN tarifa fija" : "MXN flat fee", sub: es ? "Rentable desde transacción #1" : "Profitable from transaction #1", color: "#FF5C1A" },
          ].map(({ stat, label, sub, color }) => (
            <div key={label} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "0.8vw", padding: "1.8vh 1.8vw" }}>
              <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "4.5vw", fontWeight: 900, color, lineHeight: 0.9, marginBottom: "0.6vh" }}>{stat}</p>
              <div style={{ width: "2.5vw", height: "0.25vh", background: color, marginBottom: "0.6vh" }} />
              <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.5vw", fontWeight: 700, color: "#FFFFFF", marginBottom: "0.3vh" }}>{label}</p>
              <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.2vw", color: "rgba(255,255,255,0.5)", lineHeight: 1.3 }}>{sub}</p>
            </div>
          ))}
        </div>

        <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: "1vh" }}>
          <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "1.5vw", fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em", textTransform: "uppercase", flexShrink: 0 }}>
            {es ? "Línea de tiempo de hitos" : "Milestone Timeline"}
          </p>
          <div style={{ position: "relative", flex: 1, minHeight: 0 }}>
            <div style={{ position: "absolute", left: 0, right: 0, top: "50%", height: "0.2vh", background: "rgba(255,255,255,0.1)", transform: "translateY(-50%)" }} />
            <div className="flex justify-between items-center" style={{ height: "100%" }}>
              {(es ? [
                { date: "May 31, 2026", label: "Stripe live", detail: "Primer pago con tarjeta procesado", color: "#00C875", done: true },
                { date: "Jun 2026", label: "SIPREL + Gift Cards", detail: "CFE, Telmex live · Netflix primera compra", color: "#00C875", done: true },
                { date: "Jul 2026", label: "PTI v5.0", detail: "90+ señales · Certificado fair-lending", color: "#00C875", done: true },
                { date: "Jul 2026", label: "STP/SPEI", detail: "CLABE única por usuario · depósito directo", color: "#00C875", done: true },
                { date: "Q3 2026", label: "500 billeteras activas", detail: "Meta de crecimiento Q3", color: "#FF5C1A", done: false },
                { date: "Q1 2027", label: "2,500 billeteras activas", detail: "Meta pre-seed · 3 ciudades", color: "#FF5C1A", done: false },
              ] : [
                { date: "May 31, 2026", label: "Stripe live", detail: "First card payment processed", color: "#00C875", done: true },
                { date: "Jun 2026", label: "SIPREL + Gift Cards", detail: "CFE, Telmex live · Netflix first purchase", color: "#00C875", done: true },
                { date: "Jul 2026", label: "PTI v5.0", detail: "90+ signals · Fair-lending certified", color: "#00C875", done: true },
                { date: "Jul 2026", label: "STP/SPEI", detail: "Unique CLABE per user · direct deposit", color: "#00C875", done: true },
                { date: "Q3 2026", label: "500 active wallets", detail: "Q3 growth target", color: "#FF5C1A", done: false },
                { date: "Q1 2027", label: "2,500 active wallets", detail: "Pre-seed target · 3 cities", color: "#FF5C1A", done: false },
              ]).map(({ date, label, detail, color, done }, i) => (
                <div key={label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.8vh", width: "14vw" }}>
                  <div style={{ background: "rgba(0,20,10,0.9)", border: `1.5px solid ${color}66`, borderRadius: "0.7vw", padding: "0.9vh 1.2vw", textAlign: "center", width: "100%" }}>
                    <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.05vw", color: color, fontWeight: 700, marginBottom: "0.2vh" }}>{date}</p>
                    <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "1.5vw", fontWeight: 800, color: "#FFFFFF", lineHeight: 1.1, marginBottom: "0.2vh" }}>{label}</p>
                    <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.05vw", color: "rgba(255,255,255,0.45)", lineHeight: 1.3 }}>{detail}</p>
                  </div>
                  <div style={{ width: "1.5vw", height: "1.5vw", borderRadius: "50%", background: done ? color : "transparent", border: `2px solid ${color}`, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2, flexShrink: 0 }}>
                    {done && <span style={{ color: "#004F2D", fontSize: "0.9vw", fontWeight: 900, lineHeight: 1 }}>✓</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ background: "rgba(0,200,117,0.1)", borderLeft: "0.4vw solid #00C875", padding: "1.2vh 2vw", borderRadius: "0 0.6vw 0.6vw 0", marginTop: "1vh", flexShrink: 0 }}>
          <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.55vw", fontWeight: 500, color: "#FFFFFF", lineHeight: 1.4 }}>
            {es
              ? <><span style={{ color: "#00C875", fontWeight: 700 }}>Equipo en campo en colonias de Puerto Vallarta · PTI v5.0 certificado · indexado en Google Search Console.</span> El stack completo — pagos, datos, IA — está vivo, no en un pitch.</>
              : <><span style={{ color: "#00C875", fontWeight: 700 }}>Field team active in Puerto Vallarta neighborhoods · PTI v5.0 certified · indexed on Google Search Console.</span> The complete stack — payments, data, AI — is live, not in a pitch.</>}
          </p>
        </div>
      </div>
    </div>
  );
}
