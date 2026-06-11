import { LANG } from "@/lang";
const es = LANG === "es";

export default function Slide10Traction() {
  return (
    <div
      className="relative w-screen h-screen overflow-hidden"
      style={{ background: "#004F2D" }}
    >
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse at 85% 70%, rgba(0,200,117,0.08) 0%, transparent 55%)" }}
      />

      <div className="relative z-10 flex h-full">
        <div className="flex flex-col justify-center" style={{ padding: "5vh 4vw 5vh 8vw", width: "44%" }}>
          <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.6vw", fontWeight: 700, color: "#00C875", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: "1.2vh" }}>
            {es ? "Infraestructura" : "Infrastructure"}
          </p>
          <h2 style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "5vw", fontWeight: 900, color: "#FFFFFF", letterSpacing: "-0.01em", lineHeight: 1, marginBottom: "1.2vh" }}>
            {es ? "5 rieles activos.\nSin intermediarios." : "5 live rails.\nNo middlemen."}
          </h2>
          <div style={{ width: "6vw", height: "0.4vh", background: "#00C875", marginBottom: "2.5vh" }} />
          <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.9vw", color: "rgba(255,255,255,0.6)", lineHeight: 1.5, marginBottom: "1.5vh" }}>
            {es
              ? "La mayoría de los competidores pasan por 2–3 capas intermediarias, pagando un margen en cada paso."
              : "Most competitors route through 2–3 intermediary layers, paying a margin at every step."}
          </p>
          <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "2.5vw", fontWeight: 700, color: "#00C875", lineHeight: 1.2 }}>
            PagoYa no.
          </p>
        </div>

        <div className="flex flex-col justify-center" style={{ flex: 1, padding: "5vh 8vw 5vh 3vw", gap: "1.3vh" }}>
          {[
            {
              live: true,
              name: "Stripe",
              detail: es ? "Pagos con tarjeta (Visa, Mastercard)" : "Card payments (Visa, Mastercard)",
              note: es ? "Activo desde el 31 de mayo de 2026" : "Live since May 31, 2026"
            },
            {
              live: true,
              name: "SIPREL",
              detail: es ? "Red de pago de facturas — 10+ proveedores" : "Bill payment network — 10+ providers",
              note: es
                ? "CFE, Telmex, Sky, Izzi, TotalPlay, Gas Natural, Telcel, AT&T, Megacable, Dish"
                : "CFE, Telmex, Sky, Izzi, TotalPlay, Gas Natural, Telcel, AT&T, Megacable, Dish"
            },
            {
              live: true,
              name: "Conekta / OXXO",
              detail: es ? "OXXO cash-in + procesamiento de tarjetas" : "OXXO cash-in + card processing",
              note: es ? "22,000 ubicaciones de depósito en todo el país" : "22,000 deposit locations nationwide"
            },
            {
              live: true,
              name: "STP / SPEI",
              detail: es ? "Transferencia interbancaria directa" : "Direct interbank transfer",
              note: es
                ? "CLABE única por usuario · riel activo de depósito a billetera"
                : "Unique CLABE per user · active deposit-to-wallet rail"
            },
            {
              live: true,
              name: es ? "Tarjetas de Regalo" : "Gift Cards",
              detail: "Netflix · Amazon · Google Play · Spotify",
              note: es ? "Primera compra Netflix procesada junio 2026" : "First Netflix purchase processed June 2026"
            },
            {
              live: false,
              name: "Belvo",
              detail: es ? "Banca abierta / débito bancario directo" : "Open banking / direct bank debit",
              note: es
                ? "Deprioritizado jun 2026 — STP/SPEI cubre el riel directo"
                : "Deprioritized Jun 2026 — STP/SPEI covers the direct rail"
            },
          ].map(({ live, name, detail, note }) => (
            <div key={name} style={{ background: live ? "rgba(0,200,117,0.07)" : "rgba(255,92,26,0.07)", border: `1px solid ${live ? "rgba(0,200,117,0.2)" : "rgba(255,92,26,0.2)"}`, borderRadius: "0.7vw", padding: "1.3vh 2.2vw", display: "flex", alignItems: "flex-start", gap: "1.2vw" }}>
              <span style={{ fontSize: "1.6vw", lineHeight: 1, marginTop: "0.2vh", flexShrink: 0 }}>{live ? "✅" : "🔜"}</span>
              <div style={{ flex: 1 }}>
                <div className="flex items-baseline gap-[1vw]">
                  <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "2vw", fontWeight: 800, color: "#FFFFFF", lineHeight: 1.1 }}>{name}</p>
                  <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.5vw", color: live ? "#00C875" : "#FF5C1A", fontWeight: 600 }}>{detail}</p>
                </div>
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.35vw", color: "rgba(255,255,255,0.5)", lineHeight: 1.3 }}>{note}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
