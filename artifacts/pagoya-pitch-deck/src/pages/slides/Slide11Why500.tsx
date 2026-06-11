import { LANG } from "@/lang";
const es = LANG === "es";

export default function Slide11Why500() {
  return (
    <div
      className="relative w-screen h-screen overflow-hidden"
      style={{ background: "#004F2D" }}
    >
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse at 50% 20%, rgba(255,92,26,0.07) 0%, transparent 55%)" }}
      />

      <div className="relative z-10 flex flex-col" style={{ padding: "2.5vh 8vw 2vh" }}>
        <div style={{ marginBottom: "1.5vh" }}>
          <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.4vw", fontWeight: 700, color: "#FF5C1A", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: "0.5vh" }}>
            {es ? "Panorama Competitivo" : "Competitive Landscape"}
          </p>
          <h2 style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "4vw", fontWeight: 900, color: "#FFFFFF", letterSpacing: "-0.01em", lineHeight: 1, marginBottom: "0.7vh" }}>
            {es
              ? "Por qué las opciones existentes fallan a nuestro usuario"
              : "Why existing options fail our user"}
          </h2>
          <div style={{ width: "6vw", height: "0.4vh", background: "#FF5C1A" }} />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "22vw 1fr 1fr 1fr 1fr",
            gap: 0,
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "0.8vw",
            overflow: "hidden",
            marginBottom: "1.5vh"
          }}
        >
          <div style={{ background: "rgba(255,255,255,0.06)", padding: "1.2vh 1.8vw", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.5vw", fontWeight: 700, color: "rgba(255,255,255,0.4)" }}> </p>
          </div>
          <div style={{ background: "rgba(255,255,255,0.03)", padding: "1.2vh 1.5vw", borderBottom: "1px solid rgba(255,255,255,0.07)", borderLeft: "1px solid rgba(255,255,255,0.07)" }}>
            <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "1.8vw", fontWeight: 800, color: "#FFFFFF", lineHeight: 1.1 }}>OXXO Pay</p>
          </div>
          <div style={{ background: "rgba(255,255,255,0.03)", padding: "1.2vh 1.5vw", borderBottom: "1px solid rgba(255,255,255,0.07)", borderLeft: "1px solid rgba(255,255,255,0.07)" }}>
            <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "1.8vw", fontWeight: 800, color: "#FFFFFF", lineHeight: 1.1 }}>Mercado Pago</p>
          </div>
          <div style={{ background: "rgba(255,255,255,0.03)", padding: "1.2vh 1.5vw", borderBottom: "1px solid rgba(255,255,255,0.07)", borderLeft: "1px solid rgba(255,255,255,0.07)" }}>
            <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "1.8vw", fontWeight: 800, color: "#FFFFFF", lineHeight: 1.1 }}>Spin by OXXO</p>
          </div>
          <div style={{ background: "rgba(0,200,117,0.12)", padding: "1.2vh 1.5vw", borderBottom: "1px solid rgba(255,255,255,0.07)", borderLeft: "1px solid rgba(255,255,255,0.07)" }}>
            <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "1.8vw", fontWeight: 800, color: "#00C875", lineHeight: 1.1 }}>PagoYa</p>
          </div>

          <div style={{ background: "rgba(255,255,255,0.03)", padding: "1.1vh 1.8vw", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.55vw", color: "rgba(255,255,255,0.55)", fontWeight: 500 }}>{es ? "Tarifa fija" : "Flat fee"}</p>
          </div>
          <div style={{ background: "transparent", padding: "1.1vh 1.5vw", borderBottom: "1px solid rgba(255,255,255,0.07)", borderLeft: "1px solid rgba(255,255,255,0.07)" }}>
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.55vw", color: "rgba(255,255,255,0.4)" }}>{es ? "Por servicio" : "Per service"}</p>
          </div>
          <div style={{ background: "transparent", padding: "1.1vh 1.5vw", borderBottom: "1px solid rgba(255,255,255,0.07)", borderLeft: "1px solid rgba(255,255,255,0.07)" }}>
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.55vw", color: "rgba(255,255,255,0.4)" }}>{es ? "Variable" : "Variable"}</p>
          </div>
          <div style={{ background: "transparent", padding: "1.1vh 1.5vw", borderBottom: "1px solid rgba(255,255,255,0.07)", borderLeft: "1px solid rgba(255,255,255,0.07)" }}>
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.55vw", color: "rgba(255,255,255,0.4)" }}>{es ? "Variable" : "Variable"}</p>
          </div>
          <div style={{ background: "rgba(0,200,117,0.07)", padding: "1.1vh 1.5vw", borderBottom: "1px solid rgba(255,255,255,0.07)", borderLeft: "1px solid rgba(255,255,255,0.07)" }}>
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.55vw", color: "#00C875", fontWeight: 700 }}>$25 MXN</p>
          </div>

          <div style={{ background: "rgba(255,255,255,0.03)", padding: "1.1vh 1.8vw", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.55vw", color: "rgba(255,255,255,0.55)", fontWeight: 500 }}>{es ? "Sin descarga de app" : "No app download"}</p>
          </div>
          <div style={{ background: "transparent", padding: "1.1vh 1.5vw", borderBottom: "1px solid rgba(255,255,255,0.07)", borderLeft: "1px solid rgba(255,255,255,0.07)" }}>
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.55vw", color: "rgba(255,255,255,0.4)" }}>N/A</p>
          </div>
          <div style={{ background: "transparent", padding: "1.1vh 1.5vw", borderBottom: "1px solid rgba(255,255,255,0.07)", borderLeft: "1px solid rgba(255,255,255,0.07)" }}>
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.55vw", color: "rgba(255,255,255,0.4)" }}>{es ? "Requerida" : "Required"}</p>
          </div>
          <div style={{ background: "transparent", padding: "1.1vh 1.5vw", borderBottom: "1px solid rgba(255,255,255,0.07)", borderLeft: "1px solid rgba(255,255,255,0.07)" }}>
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.55vw", color: "rgba(255,255,255,0.4)" }}>{es ? "Requerida" : "Required"}</p>
          </div>
          <div style={{ background: "rgba(0,200,117,0.07)", padding: "1.1vh 1.5vw", borderBottom: "1px solid rgba(255,255,255,0.07)", borderLeft: "1px solid rgba(255,255,255,0.07)" }}>
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.55vw", color: "#00C875", fontWeight: 700 }}>{es ? "No requerida" : "Not required"}</p>
          </div>

          <div style={{ background: "rgba(255,255,255,0.03)", padding: "1.1vh 1.8vw", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.55vw", color: "rgba(255,255,255,0.55)", fontWeight: 500 }}>{es ? "Tarjetas de regalo" : "Gift cards"}</p>
          </div>
          <div style={{ background: "transparent", padding: "1.1vh 1.5vw", borderBottom: "1px solid rgba(255,255,255,0.07)", borderLeft: "1px solid rgba(255,255,255,0.07)" }}>
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.55vw", color: "rgba(255,255,255,0.4)" }}>{es ? "No" : "No"}</p>
          </div>
          <div style={{ background: "transparent", padding: "1.1vh 1.5vw", borderBottom: "1px solid rgba(255,255,255,0.07)", borderLeft: "1px solid rgba(255,255,255,0.07)" }}>
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.55vw", color: "rgba(255,255,255,0.4)" }}>{es ? "Limitadas" : "Limited"}</p>
          </div>
          <div style={{ background: "transparent", padding: "1.1vh 1.5vw", borderBottom: "1px solid rgba(255,255,255,0.07)", borderLeft: "1px solid rgba(255,255,255,0.07)" }}>
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.55vw", color: "rgba(255,255,255,0.4)" }}>{es ? "No" : "No"}</p>
          </div>
          <div style={{ background: "rgba(0,200,117,0.07)", padding: "1.1vh 1.5vw", borderBottom: "1px solid rgba(255,255,255,0.07)", borderLeft: "1px solid rgba(255,255,255,0.07)" }}>
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.55vw", color: "#00C875", fontWeight: 700 }}>{es ? "Sí — activas" : "Yes — live"}</p>
          </div>

          <div style={{ background: "rgba(255,255,255,0.03)", padding: "1.1vh 1.8vw", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.55vw", color: "rgba(255,255,255,0.55)", fontWeight: 500 }}>{es ? "Activación en campo" : "Field activation"}</p>
          </div>
          <div style={{ background: "transparent", padding: "1.1vh 1.5vw", borderBottom: "1px solid rgba(255,255,255,0.07)", borderLeft: "1px solid rgba(255,255,255,0.07)" }}>
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.55vw", color: "rgba(255,255,255,0.4)" }}>No</p>
          </div>
          <div style={{ background: "transparent", padding: "1.1vh 1.5vw", borderBottom: "1px solid rgba(255,255,255,0.07)", borderLeft: "1px solid rgba(255,255,255,0.07)" }}>
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.55vw", color: "rgba(255,255,255,0.4)" }}>No</p>
          </div>
          <div style={{ background: "transparent", padding: "1.1vh 1.5vw", borderBottom: "1px solid rgba(255,255,255,0.07)", borderLeft: "1px solid rgba(255,255,255,0.07)" }}>
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.55vw", color: "rgba(255,255,255,0.4)" }}>No</p>
          </div>
          <div style={{ background: "rgba(0,200,117,0.07)", padding: "1.1vh 1.5vw", borderBottom: "1px solid rgba(255,255,255,0.07)", borderLeft: "1px solid rgba(255,255,255,0.07)" }}>
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.55vw", color: "#00C875", fontWeight: 700 }}>{es ? "Sí" : "Yes"}</p>
          </div>

          <div style={{ background: "rgba(255,255,255,0.03)", padding: "1.1vh 1.8vw" }}>
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.55vw", color: "rgba(255,255,255,0.55)", fontWeight: 500 }}>{es ? "Agente IA en WhatsApp" : "WhatsApp AI agent"}</p>
          </div>
          <div style={{ background: "transparent", padding: "1.1vh 1.5vw", borderLeft: "1px solid rgba(255,255,255,0.07)" }}>
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.55vw", color: "rgba(255,255,255,0.4)" }}>No</p>
          </div>
          <div style={{ background: "transparent", padding: "1.1vh 1.5vw", borderLeft: "1px solid rgba(255,255,255,0.07)" }}>
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.55vw", color: "rgba(255,255,255,0.4)" }}>{es ? "Solo bot" : "Bot only"}</p>
          </div>
          <div style={{ background: "transparent", padding: "1.1vh 1.5vw", borderLeft: "1px solid rgba(255,255,255,0.07)" }}>
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.55vw", color: "rgba(255,255,255,0.4)" }}>No</p>
          </div>
          <div style={{ background: "rgba(0,200,117,0.07)", padding: "1.1vh 1.5vw", borderLeft: "1px solid rgba(255,255,255,0.07)" }}>
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.55vw", color: "#00C875", fontWeight: 700 }}>Yes — Paula</p>
          </div>

          <div style={{ background: "rgba(255,92,26,0.06)", padding: "1.1vh 1.8vw", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.55vw", color: "rgba(255,255,255,0.55)", fontWeight: 500 }}>
              {es ? "Trust Score / identidad financiera" : "Trust Score / financial identity"}
            </p>
          </div>
          <div style={{ background: "rgba(255,92,26,0.04)", padding: "1.1vh 1.5vw", borderTop: "1px solid rgba(255,255,255,0.07)", borderLeft: "1px solid rgba(255,255,255,0.07)" }}>
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.55vw", color: "rgba(255,255,255,0.3)" }}>No</p>
          </div>
          <div style={{ background: "rgba(255,92,26,0.04)", padding: "1.1vh 1.5vw", borderTop: "1px solid rgba(255,255,255,0.07)", borderLeft: "1px solid rgba(255,255,255,0.07)" }}>
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.55vw", color: "rgba(255,255,255,0.3)" }}>No</p>
          </div>
          <div style={{ background: "rgba(255,92,26,0.04)", padding: "1.1vh 1.5vw", borderTop: "1px solid rgba(255,255,255,0.07)", borderLeft: "1px solid rgba(255,255,255,0.07)" }}>
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.55vw", color: "rgba(255,255,255,0.3)" }}>No</p>
          </div>
          <div style={{ background: "rgba(255,92,26,0.12)", padding: "1.1vh 1.5vw", borderTop: "1px solid rgba(255,92,26,0.2)", borderLeft: "1px solid rgba(255,255,255,0.07)" }}>
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.55vw", color: "#FF5C1A", fontWeight: 700 }}>✅ {es ? "Único" : "Unique"}</p>
          </div>
        </div>

        <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "1.75vw", fontWeight: 500, color: "#FFFFFF", lineHeight: 1.4 }}>
          {es
            ? <>PagoYa es la única billetera construida para<span style={{ color: "#00C875", fontWeight: 700 }}> usuarios que prefieren efectivo</span> — y la única que convierte esos pagos en<span style={{ color: "#FF5C1A", fontWeight: 700 }}> identidad financiera portable</span>. Esa última fila no la puede copiar ningún competidor en 18 meses.</>
            : <>PagoYa is the only wallet built for<span style={{ color: "#00C875", fontWeight: 700 }}> cash-preferring users</span> — and the only one that converts those payments into<span style={{ color: "#FF5C1A", fontWeight: 700 }}> portable financial identity</span>. No competitor can copy that last row in 18 months.</>
          }
        </p>
      </div>
    </div>
  );
}
