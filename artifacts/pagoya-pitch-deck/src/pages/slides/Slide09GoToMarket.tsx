export default function Slide09GoToMarket() {
  return (
    <div
      className="relative w-screen h-screen overflow-hidden"
      style={{ background: "#004F2D" }}
    >
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse at 30% 50%, rgba(0,200,117,0.1) 0%, transparent 60%)" }}
      />
      <div
        className="absolute left-0 top-0 bottom-0"
        style={{ width: "0.4vw", background: "linear-gradient(180deg, #00C875 0%, transparent 100%)", opacity: 0.7 }}
      />

      <div className="relative z-10 flex flex-col h-full" style={{ padding: "3.5vh 8vw 2.5vh" }}>

        <div style={{ marginBottom: "1.8vh" }}>
          <p style={{
            fontFamily: "DM Sans, sans-serif",
            fontSize: "1.5vw",
            fontWeight: 700,
            color: "#00C875",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            marginBottom: "0.7vh"
          }}>
            La Barrera de Datos
          </p>
          <h2 style={{
            fontFamily: "Barlow Condensed, sans-serif",
            fontSize: "4vw",
            fontWeight: 900,
            color: "#FFFFFF",
            letterSpacing: "-0.01em",
            lineHeight: 1,
            marginBottom: "0.7vh"
          }}>
            Cada pago construye un perfil crediticio que{" "}
            <span style={{ color: "#00C875" }}>65M personas nunca han tenido.</span>
          </h2>
          <div style={{ width: "6vw", height: "0.35vh", background: "#00C875" }} />
        </div>

        <div className="grid grid-cols-3 gap-[2vw]" style={{ marginBottom: "1.8vh", flex: 1, minHeight: 0 }}>

          <div style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "0.8vw",
            padding: "1.6vh 2vw"
          }}>
            <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "1.5vw", fontWeight: 700, color: "rgba(255,255,255,0.45)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "1.2vh" }}>
              Lo que recopilamos
            </p>
            {[
              "Consistencia de pagos",
              "Cadencia y mezcla de facturas",
              "Frecuencia de carga de efectivo",
              "Señales de ingresos",
              "Puntuación de confiabilidad",
              "Historial de múltiples proveedores"
            ].map(d => (
              <div key={d} className="flex items-center gap-[0.7vw]" style={{ marginBottom: "0.55vh" }}>
                <div style={{ width: "0.35vw", height: "0.35vw", borderRadius: "50%", background: "#00C875", flexShrink: 0 }} />
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.45vw", color: "rgba(255,255,255,0.8)" }}>{d}</p>
              </div>
            ))}
          </div>

          <div style={{
            background: "rgba(0,200,117,0.08)",
            border: "1px solid rgba(0,200,117,0.2)",
            borderRadius: "0.8vw",
            padding: "1.6vh 2vw"
          }}>
            <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "1.5vw", fontWeight: 700, color: "#00C875", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "1.2vh" }}>
              Quién lo paga
            </p>
            {[
              { who: "Prestamistas digitales SOFOM", why: "Mercado de crédito de $28B USD — bloqueado por falta de datos" },
              { who: "Instituciones de microfinanzas", why: "No existe registro conductual para evaluar comunidades de colonia" },
              { who: "Aseguradoras", why: "Primer modelo de riesgo confiable para trabajadores informales" },
              { who: "Neobancos y fintechs", why: "Identidad financiera verificada pre-adjunta a la adquisición" },
            ].map(({ who, why }) => (
              <div key={who} style={{ marginBottom: "0.9vh" }}>
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.5vw", fontWeight: 700, color: "#FFFFFF", marginBottom: "0.15vh" }}>{who}</p>
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.3vw", color: "rgba(255,255,255,0.5)", lineHeight: 1.3 }}>{why}</p>
              </div>
            ))}
          </div>

          <div style={{
            background: "rgba(255,92,26,0.08)",
            border: "1px solid rgba(255,92,26,0.2)",
            borderRadius: "0.8vw",
            padding: "1.6vh 2vw"
          }}>
            <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "1.5vw", fontWeight: 700, color: "#FF5C1A", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "1.2vh" }}>
              Fuentes de ingreso
            </p>
            {[
              { label: "Licenciamiento de datos", sub: "Conjuntos de datos conductuales anonimizados vendidos a prestamistas, aseguradoras y fintechs" },
              { label: "Crédito integrado", sub: "Paula evalúa microcréditos usando nuestro propio historial de pagos" },
              { label: "BNPL para servicios", sub: "Divide el CFE en 3 pagos — evaluado con los datos de facturas que tenemos" },
              { label: "API de historial crediticio", sub: "Identidad financiera verificada vendida como servicio a socios" },
            ].map(({ label, sub }) => (
              <div key={label} style={{ marginBottom: "0.9vh" }}>
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.5vw", fontWeight: 700, color: "#FFFFFF", marginBottom: "0.15vh" }}>{label}</p>
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.3vw", color: "rgba(255,255,255,0.5)", lineHeight: 1.3 }}>{sub}</p>
              </div>
            ))}
          </div>
        </div>

        <div style={{
          background: "rgba(0,200,117,0.1)",
          borderLeft: "0.4vw solid #00C875",
          padding: "1.4vh 2.5vw",
          borderRadius: "0 0.6vw 0.6vw 0",
          flexShrink: 0
        }}>
          <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.55vw", fontWeight: 500, color: "#FFFFFF", lineHeight: 1.4 }}>
            Los ingresos por transacciones financian el crecimiento. Los ingresos por datos son el multiplicador.{" "}
            <span style={{ color: "#00C875", fontWeight: 700 }}>
              El mercado crediticio de $28B USD en México no puede llegar a los no bancarizados — no por falta de demanda, sino por falta de datos.
            </span>
            {" "}PagoYa es la única plataforma generando esos datos a escala, de forma legítima, un pago a la vez.
          </p>
        </div>

      </div>
    </div>
  );
}
