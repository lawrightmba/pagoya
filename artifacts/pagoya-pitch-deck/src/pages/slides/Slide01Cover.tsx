const base = import.meta.env.BASE_URL;

export default function Slide01Cover() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "#004F2D" }}>
      <img
        src={`${base}hero-colonia.png`}
        crossOrigin="anonymous"
        alt="Mexico colonia at dusk"
        className="absolute inset-0 w-full h-full object-cover"
        style={{ opacity: 0.3 }}
      />
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(135deg, rgba(0,79,45,0.95) 0%, rgba(0,79,45,0.6) 60%, rgba(0,79,45,0.8) 100%)" }}
      />

      <div className="absolute inset-0 flex flex-col justify-between" style={{ padding: "7vh 8vw" }}>
        <div style={{ maxWidth: "65vw" }}>
          <p
            style={{
              fontFamily: "DM Sans, sans-serif",
              fontSize: "1.9vw",
              fontWeight: 600,
              color: "#00C875",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom: "2.5vh"
            }}
          >
            Acción Ventures — Pre-Seed Pitch · June 2026
          </p>
          <h1
            style={{
              fontFamily: "Barlow Condensed, sans-serif",
              fontSize: "7.8vw",
              fontWeight: 900,
              color: "#FFFFFF",
              lineHeight: 0.92,
              letterSpacing: "-0.01em",
              marginBottom: "3.5vh",
              whiteSpace: "pre-line"
            }}
          >
            {"Pay any bill.\nBuy any gift card.\nIn Mexico."}
          </h1>
          <div
            style={{
              width: "8vw",
              height: "0.5vh",
              background: "#FF5C1A",
              marginBottom: "3vh"
            }}
          />
          <p
            style={{
              fontFamily: "DM Sans, sans-serif",
              fontSize: "2.4vw",
              fontWeight: 400,
              color: "#FFFFFF",
              lineHeight: 1.4,
              opacity: 0.9,
              marginBottom: "1.2vh"
            }}
          >
            Two minutes. $25 MXN flat. No bank account required.
          </p>
          <p
            style={{
              fontFamily: "DM Sans, sans-serif",
              fontSize: "2vw",
              fontWeight: 400,
              color: "rgba(255,255,255,0.55)",
              lineHeight: 1.4
            }}
          >
            The AI financial agent built for Mexico's 65 million unbanked adults.
          </p>
        </div>

        <div className="flex items-center gap-[3vw]">
          <span
            style={{
              fontFamily: "DM Sans, sans-serif",
              fontSize: "1.6vw",
              color: "rgba(255,255,255,0.5)"
            }}
          >
            pagoyamx.com
          </span>
          <span
            style={{
              width: "0.35vw",
              height: "0.35vw",
              borderRadius: "50%",
              background: "#00C875",
              display: "inline-block"
            }}
          />
          <span
            style={{
              fontFamily: "DM Sans, sans-serif",
              fontSize: "1.6vw",
              color: "rgba(255,255,255,0.5)"
            }}
          >
            lloyd@pagoyamx.com
          </span>
          <span
            style={{
              width: "0.35vw",
              height: "0.35vw",
              borderRadius: "50%",
              background: "#00C875",
              display: "inline-block"
            }}
          />
          <span
            style={{
              fontFamily: "DM Sans, sans-serif",
              fontSize: "1.6vw",
              color: "rgba(255,255,255,0.5)"
            }}
          >
            Founder Institute Austin · Summer 2026
          </span>
        </div>
      </div>

      <div
        className="absolute right-0 top-0 bottom-0"
        style={{
          width: "0.4vw",
          background: "linear-gradient(180deg, #00C875 0%, transparent 100%)",
          opacity: 0.7
        }}
      />
    </div>
  );
}
