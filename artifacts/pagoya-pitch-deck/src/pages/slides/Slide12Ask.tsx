import { LANG } from "@/lang";
const es = LANG === "es";

export default function Slide12Ask() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "#004F2D" }}>
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 70% 50%, rgba(0,200,117,0.1) 0%, transparent 60%)" }} />
      <div className="absolute right-0 top-0 bottom-0" style={{ width: "0.4vw", background: "linear-gradient(180deg, #00C875 0%, transparent 100%)", opacity: 0.7 }} />

      <div className="relative z-10 flex h-full">
        <div className="flex flex-col justify-center" style={{ padding: "7vh 5vw 7vh 8vw", width: "50%" }}>
          <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.6vw", fontWeight: 700, color: "#00C875", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: "1.8vh" }}>
            {es ? "¿Por qué un acelerador?" : "Why an accelerator?"}
          </p>
          <h2 style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "5vw", fontWeight: 900, color: "#FFFFFF", letterSpacing: "-0.01em", lineHeight: 1, marginBottom: "1.5vh" }}>
            {es
              ? "El capital correcto\nconstruye la red\ncorrecta."
              : "The right program\nbuilds the\nright network."}
          </h2>
          <div style={{ width: "6vw", height: "0.4vh", background: "#00C875", marginBottom: "2.5vh" }} />
          <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.7vw", color: "rgba(255,255,255,0.6)", lineHeight: 1.5, marginBottom: "2vh" }}>
            {es
              ? "PagoYa ya tiene el stack técnico y el producto vivo. Lo que acelera el camino a 100K billeteras no es más código — es la red correcta de operadores, reguladores y capital especializado en fintech LATAM."
              : "PagoYa already has the technical stack and live product. What accelerates the path to 100K wallets isn't more code — it's the right network of operators, regulators, and capital specialized in LATAM fintech."}
          </p>
          <div style={{ background: "rgba(0,200,117,0.1)", borderLeft: "0.4vw solid #00C875", padding: "1.5vh 2vw", borderRadius: "0 0.6vw 0.6vw 0" }}>
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.6vw", fontWeight: 500, color: "#FFFFFF", lineHeight: 1.45, fontStyle: "italic" }}>
              {es
                ? '"Necesitamos experiencia fintech + red de distribución + acceso a inversores que ya han financiado inclusión financiera en México y LATAM."'
                : '"We need fintech expertise + distribution network + investor access from those who have already funded financial inclusion in Mexico and LATAM."'}
            </p>
          </div>
        </div>

        <div className="flex flex-col justify-center" style={{ flex: 1, padding: "7vh 8vw 7vh 4vw", gap: "2.6vh" }}>
          <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "2vw", fontWeight: 700, color: "rgba(255,255,255,0.5)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.5vh" }}>
            {es ? "Lo que un acelerador desbloquea" : "What an accelerator unlocks"}
          </p>

          {(es ? [
            { num: "01", color: "#00C875", title: "Navegación regulatoria", body: "Licencia CNBV SOFOM conforme escala el volumen · Umbrales SPEI Banxico · Cumplimiento CONDUSEF — necesitamos operadores que hayan navegado esto antes." },
            { num: "02", color: "#00C875", title: "Red de distribución", body: "De 2 representantes en Puerto Vallarta a 50+ en 5 ciudades — necesitamos el playbook de empresas que ya escalaron modelos de activación en campo en México." },
            { num: "03", color: "#FF5C1A", title: "Acceso a socios B2B", body: "Prestamistas, aseguradoras y fintechs que compren datos PTI — la red de un acelerador especializado en fintech reduce el ciclo de ventas de 18 meses a 6 meses." },
            { num: "04", color: "#FF5C1A", title: "Capital inversor LATAM", body: "Inversores fintech LATAM que entiendan la economía unitaria de $25 MXN — no inversores SaaS de EE.UU. que lean mal los números." },
          ] : [
            { num: "01", color: "#00C875", title: "Regulatory navigation", body: "CNBV SOFOM license as volume scales · Banxico SPEI thresholds · CONDUSEF compliance — we need operators who have navigated this before." },
            { num: "02", color: "#00C875", title: "Distribution network", body: "From 2 reps in Puerto Vallarta to 50+ across 5 cities — we need the playbook from companies that have scaled field-activation models in Mexico." },
            { num: "03", color: "#FF5C1A", title: "B2B partner access", body: "Lenders, insurers, and fintechs that buy PTI data — a specialized fintech accelerator's network reduces the sales cycle from 18 months to 6 months." },
            { num: "04", color: "#FF5C1A", title: "LATAM investor capital", body: "LATAM fintech investors who understand $25 MXN unit economics — not US SaaS investors who'll misread the numbers." },
          ]).map(({ num, color, title, body }) => (
            <div key={num} className="flex items-start gap-[1.5vw]">
              <span style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "3vw", fontWeight: 900, color, lineHeight: 1, minWidth: "2.5vw", opacity: 0.7 }}>{num}</span>
              <div>
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.85vw", fontWeight: 700, color: "#FFFFFF", marginBottom: "0.4vh" }}>{title}</p>
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.55vw", color: "rgba(255,255,255,0.55)", lineHeight: 1.35 }}>{body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
