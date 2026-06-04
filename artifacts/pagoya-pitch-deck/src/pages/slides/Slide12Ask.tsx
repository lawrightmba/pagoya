export default function Slide12Ask() {
  return (
    <div
      className="relative w-screen h-screen overflow-hidden"
      style={{ background: "#004F2D" }}
    >
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse at 70% 50%, rgba(0,200,117,0.1) 0%, transparent 60%)" }}
      />

      <div
        className="absolute right-0 top-0 bottom-0"
        style={{ width: "0.4vw", background: "linear-gradient(180deg, #00C875 0%, transparent 100%)", opacity: 0.7 }}
      />

      <div className="relative z-10 flex h-full">
        <div className="flex flex-col justify-center" style={{ padding: "7vh 5vw 7vh 8vw", width: "50%" }}>
          <p
            style={{
              fontFamily: "DM Sans, sans-serif",
              fontSize: "1.6vw",
              fontWeight: 700,
              color: "#00C875",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              marginBottom: "1.8vh"
            }}
          >
            Por Qué Acción Ventures
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
            El socio correcto
            construye la red
            correcta.
          </h2>
          <div style={{ width: "6vw", height: "0.4vh", background: "#00C875", marginBottom: "2.5vh" }} />
          <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.7vw", color: "rgba(255,255,255,0.6)", lineHeight: 1.5, marginBottom: "2vh" }}>
            El portafolio de Acción Ventures — Clip, Konfío, Destacame — ha navegado licencias CNBV, rieles SPEI e inclusión financiera a escala en LATAM. No buscamos solo capital. Buscamos este socio porque esos operadores y esa red son el camino más rápido a 100K billeteras.
          </p>
          <div
            style={{
              background: "rgba(0,200,117,0.1)",
              borderLeft: "0.4vw solid #00C875",
              padding: "1.5vh 2vw",
              borderRadius: "0 0.6vw 0.6vw 0"
            }}
          >
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.6vw", fontWeight: 500, color: "#FFFFFF", lineHeight: 1.45, fontStyle: "italic" }}>
              "Necesitamos la experiencia fintech + la red de distribución LATAM + acceso a inversores de una firma que ya ha financiado la inclusión financiera en México."
            </p>
          </div>
        </div>

        <div
          className="flex flex-col justify-center"
          style={{ flex: 1, padding: "7vh 8vw 7vh 4vw", gap: "2.8vh" }}
        >
          <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "2vw", fontWeight: 700, color: "rgba(255,255,255,0.5)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.5vh" }}>
            Lo que buscamos de Acción Ventures
          </p>

          <div className="flex items-start gap-[1.5vw]">
            <span style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "3vw", fontWeight: 900, color: "#00C875", lineHeight: 1, minWidth: "2.5vw" }}>01</span>
            <div>
              <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.9vw", fontWeight: 700, color: "#FFFFFF", marginBottom: "0.4vh" }}>Navegación regulatoria</p>
              <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.65vw", color: "rgba(255,255,255,0.55)", lineHeight: 1.35 }}>Licencia CNBV SOFOM conforme escala el volumen · Umbrales de reporte SPEI Banxico · Cumplimiento CONDUSEF</p>
            </div>
          </div>

          <div className="flex items-start gap-[1.5vw]">
            <span style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "3vw", fontWeight: 900, color: "#00C875", lineHeight: 1, minWidth: "2.5vw" }}>02</span>
            <div>
              <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.9vw", fontWeight: 700, color: "#FFFFFF", marginBottom: "0.4vh" }}>Guía para escalar la red de representantes</p>
              <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.65vw", color: "rgba(255,255,255,0.55)", lineHeight: 1.35 }}>De 2 representantes en Puerto Vallarta a 50+ en 5 ciudades mexicanas — necesitamos operadores que hayan logrado esto</p>
            </div>
          </div>

          <div className="flex items-start gap-[1.5vw]">
            <span style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "3vw", fontWeight: 900, color: "#FF5C1A", lineHeight: 1, minWidth: "2.5vw" }}>03</span>
            <div>
              <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.9vw", fontWeight: 700, color: "#FFFFFF", marginBottom: "0.4vh" }}>Acceso a inversores LATAM</p>
              <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.65vw", color: "rgba(255,255,255,0.55)", lineHeight: 1.35 }}>Inversores fintech LATAM que entiendan la economía unitaria de $25 MXN — no inversores SaaS de EE.UU. que malinterpreten los números</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
