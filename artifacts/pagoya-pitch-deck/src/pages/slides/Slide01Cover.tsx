const base = import.meta.env.BASE_URL;

export default function Slide01Cover() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: "#0A2540" }}>
      <img
        src={`${base}hero-colonia.png`}
        crossOrigin="anonymous"
        alt="Mexico colonia at dusk"
        className="absolute inset-0 w-full h-full object-cover"
        style={{ opacity: 0.45 }}
      />
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(135deg, rgba(10,37,64,0.92) 0%, rgba(10,37,64,0.55) 60%, rgba(10,37,64,0.75) 100%)" }}
      />

      <div className="absolute inset-0 flex flex-col justify-between" style={{ padding: "7vh 8vw" }}>
        <div style={{ opacity: 0.95 }}>
          <img
            src={`${base}pagoya-logo.png`}
            crossOrigin="anonymous"
            alt="PagoYa"
            style={{ height: "6vh", width: "auto" }}
          />
        </div>

        <div style={{ maxWidth: "62vw" }}>
          <p
            style={{
              fontFamily: "DM Sans, sans-serif",
              fontSize: "2vw",
              fontWeight: 500,
              color: "#1D9E75",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: "2.5vh"
            }}
          >
            500 Global LATAM Accelerator
          </p>
          <h1
            style={{
              fontFamily: "Barlow Condensed, sans-serif",
              fontSize: "9vw",
              fontWeight: 900,
              color: "#F5F0EB",
              lineHeight: 0.92,
              letterSpacing: "-0.01em",
              marginBottom: "3.5vh",
              textWrap: "balance"
            }}
          >
            Pay any bill
            in Mexico.
          </h1>
          <div
            style={{
              width: "8vw",
              height: "0.5vh",
              background: "#D85A30",
              marginBottom: "3vh"
            }}
          />
          <p
            style={{
              fontFamily: "DM Sans, sans-serif",
              fontSize: "2.4vw",
              fontWeight: 400,
              color: "#F5F0EB",
              lineHeight: 1.4,
              opacity: 0.88,
              marginBottom: "1.2vh"
            }}
          >
            Two minutes. $25 MXN flat.
          </p>
          <p
            style={{
              fontFamily: "DM Sans, sans-serif",
              fontSize: "2vw",
              fontWeight: 400,
              color: "#8BA8C0",
              lineHeight: 1.4
            }}
          >
            The wallet built for the 50 million Mexicans banks have left behind.
          </p>
        </div>

        <div className="flex items-center gap-[3vw]">
          <span
            style={{
              fontFamily: "DM Sans, sans-serif",
              fontSize: "1.6vw",
              color: "#8BA8C0"
            }}
          >
            pagoyamx.com
          </span>
          <span
            style={{
              width: "0.3vw",
              height: "0.3vw",
              borderRadius: "50%",
              background: "#1D9E75",
              display: "inline-block"
            }}
          />
          <span
            style={{
              fontFamily: "DM Sans, sans-serif",
              fontSize: "1.6vw",
              color: "#8BA8C0"
            }}
          >
            May 2026
          </span>
        </div>
      </div>

      <div
        className="absolute right-0 top-0 bottom-0"
        style={{
          width: "0.4vw",
          background: "linear-gradient(180deg, #1D9E75 0%, transparent 100%)",
          opacity: 0.6
        }}
      />
    </div>
  );
}
