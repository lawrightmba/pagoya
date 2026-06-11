import { LANG } from "@/lang";
const es = LANG === "es";

const base = import.meta.env.BASE_URL;

export default function Slide07Infrastructure() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "#004F2D" }}>
      <img
        src={`${base}hero-gtm.png`}
        crossOrigin="anonymous"
        alt="Mexican street"
        className="absolute inset-0 w-full h-full object-cover"
        style={{ opacity: 0.25 }}
      />
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(100deg, rgba(0,79,45,0.97) 0%, rgba(0,79,45,0.8) 50%, rgba(0,79,45,0.65) 100%)" }}
      />

      <div className="absolute inset-0 flex" style={{ padding: "6.5vh 8vw" }}>
        <div className="flex flex-col justify-center" style={{ width: "52%" }}>
          <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.6vw", fontWeight: 700, color: "#00C875", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: "1.8vh" }}>
            {es ? "Estrategia de Mercado" : "Go-to-Market Strategy"}
          </p>
          <h2 style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "5.2vw", fontWeight: 900, color: "#FFFFFF", letterSpacing: "-0.01em", lineHeight: 1, marginBottom: "1.5vh" }}>
            {es
              ? "Equipo en campo.\nRed de referidos.\nEfecto multiplicador."
              : "Field team.\nReferral network.\nMultiplier effect."}
          </h2>
          <div style={{ width: "6vw", height: "0.4vh", background: "#FF5C1A", marginBottom: "3.5vh" }} />

          <div className="flex flex-col gap-[2vh]">
            <div className="flex items-start gap-[1.2vw]">
              <div style={{ width: "0.35vw", minWidth: "0.35vw", height: "2.5vh", background: "#00C875", marginTop: "0.3vh" }} />
              <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.8vw", color: "#FFFFFF", lineHeight: 1.35 }}>
                {es
                  ? "El representante visita taquerías, tianguis, negocios familiares — abre pagoyamx.com, registra al usuario, primer pago en el acto"
                  : "The rep visits taquerías, markets, family businesses — opens pagoyamx.com, registers the user, first payment on the spot"}
              </p>
            </div>
            <div className="flex items-start gap-[1.2vw]">
              <div style={{ width: "0.35vw", minWidth: "0.35vw", height: "2.5vh", background: "#00C875", marginTop: "0.3vh" }} />
              <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.8vw", color: "#FFFFFF", lineHeight: 1.35 }}>
                {es
                  ? "El rep gana comisión pasiva en cada pago recurrente para siempre → ingresos en red, CAC inicial cero"
                  : "The rep earns passive commission on every recurring payment forever → network income, zero upfront CAC"}
              </p>
            </div>
            <div className="flex items-start gap-[1.2vw]">
              <div style={{ width: "0.35vw", minWidth: "0.35vw", height: "2.5vh", background: "#FF5C1A", marginTop: "0.3vh" }} />
              <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.8vw", color: "#FFFFFF", lineHeight: 1.35 }}>
                {es
                  ? "Usuarios refieren usuarios vía enlace de WhatsApp → bono de referido acreditado a la billetera → nueva activación"
                  : "Users refer users via WhatsApp link → referral bonus credited to wallet → new activation"}
              </p>
            </div>
            <div className="flex items-start gap-[1.2vw]">
              <div style={{ width: "0.35vw", minWidth: "0.35vw", height: "2.5vh", background: "#FF5C1A", marginTop: "0.3vh" }} />
              <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.8vw", color: "#FFFFFF", lineHeight: 1.35 }}>
                {es
                  ? "Cada nuevo usuario amplía el ingreso pasivo del rep + expande la activación a su red de la colonia"
                  : "Each new user grows the rep's passive income + expands activation into their neighborhood network"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-center" style={{ flex: 1, paddingLeft: "4vw" }}>
          <div style={{ background: "rgba(0,30,15,0.85)", border: "1px solid rgba(0,200,117,0.3)", borderRadius: "1.2vw", padding: "3.5vh 3vw" }}>
            <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "1.8vw", fontWeight: 700, color: "rgba(255,255,255,0.5)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "2.5vh" }}>
              {es ? "Modelo de tres capas" : "Three-layer model"}
            </p>
            <div className="flex flex-col gap-[1.6vh]">
              <div>
                <div className="flex items-center gap-[1vw]" style={{ marginBottom: "0.3vh" }}>
                  <span style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "2.6vw", fontWeight: 900, color: "#00C875", lineHeight: 1 }}>01</span>
                  <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.8vw", fontWeight: 700, color: "#FFFFFF" }}>{es ? "Activación directa" : "Direct activation"}</p>
                </div>
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.6vw", color: "rgba(255,255,255,0.5)", lineHeight: 1.3, paddingLeft: "3.5vw" }}>
                  {es
                    ? "1 rep → 20–30 usuarios en 30 días, en persona, en colonias"
                    : "1 rep → 20–30 users in 30 days, in person, in neighborhoods"}
                </p>
              </div>
              <div>
                <div className="flex items-center gap-[1vw]" style={{ marginBottom: "0.3vh" }}>
                  <span style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "2.6vw", fontWeight: 900, color: "#00C875", lineHeight: 1 }}>02</span>
                  <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.8vw", fontWeight: 700, color: "#FFFFFF" }}>{es ? "Comisión pasiva" : "Passive commission"}</p>
                </div>
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.6vw", color: "rgba(255,255,255,0.5)", lineHeight: 1.3, paddingLeft: "3.5vw" }}>
                  {es
                    ? "El rep gana % en cada transacción recurrente — ingreso mensual compuesto"
                    : "Rep earns % on every recurring transaction — compounding monthly income"}
                </p>
              </div>
              <div>
                <div className="flex items-center gap-[1vw]" style={{ marginBottom: "0.3vh" }}>
                  <span style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "2.6vw", fontWeight: 900, color: "#FF5C1A", lineHeight: 1 }}>03</span>
                  <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.8vw", fontWeight: 700, color: "#FFFFFF" }}>{es ? "Ciclo de referidos" : "Referral cycle"}</p>
                </div>
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.6vw", color: "rgba(255,255,255,0.5)", lineHeight: 1.3, paddingLeft: "3.5vw" }}>
                  {es
                    ? "El enlace de WhatsApp de cada usuario es una demo del producto para su lista de contactos"
                    : "Every user's WhatsApp link is a product demo to their entire contact list"}
                </p>
              </div>
            </div>
            <div style={{ height: "0.15vh", background: "rgba(255,255,255,0.08)", margin: "2vh 0" }} />
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.65vw", color: "rgba(255,255,255,0.5)" }}>
              {es
                ? "Inicio: Puerto Vallarta · Siguiente: Guadalajara, periferia CDMX"
                : "Launch: Puerto Vallarta · Next: Guadalajara, greater CDMX"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
