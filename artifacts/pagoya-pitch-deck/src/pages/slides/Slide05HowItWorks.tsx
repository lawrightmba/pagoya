import { useLang } from "@/lang";

export default function Slide05HowItWorks() {
  const { es } = useLang();
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "#004F2D" }}>
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 60% 80%, rgba(0,200,117,0.1) 0%, transparent 60%)" }} />

      <div className="relative z-10 flex flex-col h-full" style={{ padding: "2.5vh 8vw 2vh" }}>
        <div style={{ marginBottom: "1.5vh", flexShrink: 0 }}>
          <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.5vw", fontWeight: 700, color: "#00C875", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: "0.7vh" }}>
            {es ? "Tamaño de Mercado" : "Market Size"}
          </p>
          <h2 style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "4vw", fontWeight: 900, color: "#FFFFFF", letterSpacing: "-0.01em", lineHeight: 1, marginBottom: "0.7vh" }}>
            {es
              ? <span>Entrada por pagos. <span style={{ color: "#00C875" }}>Valor por datos.</span> Escala por crédito.</span>
              : <span>Enter via payments. <span style={{ color: "#00C875" }}>Value via data.</span> Scale via credit.</span>}
          </h2>
          <div style={{ width: "6vw", height: "0.35vh", background: "#00C875" }} />
        </div>

        <div className="flex gap-[2vw]" style={{ flex: 1, minHeight: 0 }}>
          {[
            {
              layer: "01",
              color: "#00C875",
              borderColor: "rgba(0,200,117,0.35)",
              bg: "rgba(0,200,117,0.08)",
              title: es ? "Pagos de Consumidores" : "Consumer Payments",
              sam: es ? "SAM: $1B+ MXN / año" : "SAM: $1B+ MXN / year",
              desc: es
                ? "65M adultos no bancarizados pagan CFE, telefonía, streaming y tarjetas de regalo en efectivo. PagoYa digitaliza esos pagos a $25 MXN tarifa fija vía WhatsApp — sin app, sin cuenta bancaria."
                : "65M unbanked adults pay CFE, telecom, streaming, and gift cards in cash. PagoYa digitizes those payments at a $25 MXN flat fee via WhatsApp — no app, no bank account.",
              bullets: es
                ? ["✅ 5 rieles activos (Stripe, SIPREL, Conekta, STP, tarjetas de regalo)", "✅ Rentable desde transacción #1", "✅ Primera compra viva: mayo 2026"]
                : ["✅ 5 live rails (Stripe, SIPREL, Conekta, STP, gift cards)", "✅ Profitable from transaction #1", "✅ First live purchase: May 2026"],
              tag: es ? "ACTIVO AHORA" : "LIVE NOW",
              tagColor: "#00C875",
            },
            {
              layer: "02",
              color: "#FF5C1A",
              borderColor: "rgba(255,92,26,0.35)",
              bg: "rgba(255,92,26,0.08)",
              title: es ? "Licenciamiento de Datos PTI" : "PTI Data Licensing",
              sam: es ? "TAM: $28B USD mercado de crédito MX" : "TAM: $28B USD Mexico credit market",
              desc: es
                ? "Cada pago alimenta el Predictive Trust Index (PTI) — 90+ señales, 4 dimensiones, v5.0 con certificación fair-lending. Prestamistas, aseguradoras y fintechs no pueden evaluar a los no bancarizados. Nosotros sí."
                : "Every payment feeds the Predictive Trust Index (PTI) — 90+ signals, 4 dimensions, v5.0 with fair-lending certification. Lenders, insurers, and fintechs can't underwrite the unbanked. We can.",
              bullets: es
                ? ["📊 API de puntaje conductual licenciada a socios B2B", "📊 Conjuntos de datos anonimizados vendidos a prestamistas", "📊 PTI v5.0 — certificado fair-lending julio 2026"]
                : ["📊 Behavioral score API licensed to B2B partners", "📊 Anonymized datasets sold to lenders", "📊 PTI v5.0 — fair-lending certified July 2026"],
              tag: es ? "ACTIVO · CLIENTES B2B EN PROCESO" : "ACTIVE · B2B PIPELINE",
              tagColor: "#FF5C1A",
            },
            {
              layer: "03",
              color: "rgba(255,255,255,0.5)",
              borderColor: "rgba(255,255,255,0.15)",
              bg: "rgba(255,255,255,0.04)",
              title: es ? "Originación de Crédito" : "Credit Origination",
              sam: es ? "Objetivo 2027: 2–4% fee de originación" : "2027 target: 2–4% origination fee",
              desc: es
                ? "El PTI habilita productos de crédito directos: micro-créditos de emergencia ($500–2,000 MXN), BNPL para facturas de servicios y préstamos personales ($5K–20K MXN). Paula como originador — usando nuestros propios datos."
                : "The PTI enables direct credit products: emergency micro-loans ($500–2,000 MXN), BNPL for utility bills, and personal loans ($5K–20K MXN). Paula as the originator — using our own data.",
              bullets: es
                ? ["🔜 BNPL facturas CFE — habilitado por PTI", "🔜 Micro-crédito de emergencia 600+ PTI", "🔜 Préstamo personal 720+ PTI"]
                : ["🔜 CFE bill BNPL — enabled by PTI", "🔜 Emergency micro-loan at PTI 600+", "🔜 Personal loan at PTI 720+"],
              tag: "2027",
              tagColor: "rgba(255,255,255,0.4)",
            },
          ].map(({ layer, color, borderColor, bg, title, sam, desc, bullets, tag, tagColor }) => (
            <div key={layer} style={{ flex: 1, background: bg, border: `1.5px solid ${borderColor}`, borderRadius: "1vw", padding: "2vh 2vw", display: "flex", flexDirection: "column", gap: "1vh" }}>
              <div className="flex items-start justify-between">
                <span style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "3.5vw", fontWeight: 900, color, lineHeight: 1, opacity: 0.3 }}>{layer}</span>
                <div style={{ background: `${tagColor}22`, border: `1px solid ${tagColor}55`, borderRadius: "0.4vw", padding: "0.3vh 0.8vw" }}>
                  <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1vw", fontWeight: 700, color: tagColor, letterSpacing: "0.06em" }}>{tag}</p>
                </div>
              </div>
              <div>
                <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "2.4vw", fontWeight: 900, color: "#FFFFFF", lineHeight: 1, marginBottom: "0.4vh" }}>{title}</p>
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.2vw", fontWeight: 700, color, marginBottom: "0.8vh" }}>{sam}</p>
                <div style={{ width: "3vw", height: "0.25vh", background: color, opacity: 0.5 }} />
              </div>
              <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.25vw", color: "rgba(255,255,255,0.6)", lineHeight: 1.4, flex: 1 }}>{desc}</p>
              <div className="flex flex-col gap-[0.4vh]">
                {bullets.map(b => (
                  <p key={b} style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.2vw", color: "rgba(255,255,255,0.7)", lineHeight: 1.3 }}>{b}</p>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={{ background: "rgba(0,200,117,0.1)", borderLeft: "0.4vw solid #00C875", padding: "1.2vh 2vw", borderRadius: "0 0.6vw 0.6vw 0", marginTop: "1.2vh", flexShrink: 0 }}>
          <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.55vw", fontWeight: 500, color: "#FFFFFF", lineHeight: 1.4 }}>
            {es
              ? <><span style={{ color: "#00C875", fontWeight: 700 }}>Los ingresos por transacciones financian el crecimiento.</span> Los ingresos por datos son el multiplicador. El mercado crediticio de $28B USD en México no puede llegar a los no bancarizados — no por falta de demanda, sino por falta de datos. PagoYa es la única plataforma que genera esos datos a escala, legítimamente, un pago a la vez.</>
              : <><span style={{ color: "#00C875", fontWeight: 700 }}>Transaction revenue funds growth.</span> Data revenue is the multiplier. Mexico's $28B USD credit market can't reach the unbanked — not for lack of demand, but lack of data. PagoYa is the only platform generating that data at scale, legitimately, one payment at a time.</>}
          </p>
        </div>
      </div>
    </div>
  );
}
