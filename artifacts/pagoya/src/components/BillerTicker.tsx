const BILLERS = [
  { icon: "⚡", name: "CFE" },
  { icon: "📱", name: "Telcel" },
  { icon: "🌐", name: "Telmex" },
  { icon: "📺", name: "Izzi" },
  { icon: "📡", name: "Sky" },
  { icon: "🎬", name: "Netflix" },
  { icon: "🎵", name: "Spotify" },
  { icon: "💧", name: "Agua" },
  { icon: "🔥", name: "Gas" },
  { icon: "🏠", name: "Renta" },
  { icon: "🏛️", name: "Predial" },
  { icon: "🚗", name: "Tenencia" },
  { icon: "📡", name: "Totalplay" },
  { icon: "📱", name: "AT&T" },
  { icon: "🎮", name: "Recarga" },
];

// Duplicate so the loop is seamless with no gap
const ROW1 = [...BILLERS, ...BILLERS];
const ROW2 = [...BILLERS, ...BILLERS];

interface PillProps {
  icon: string;
  name: string;
  small?: boolean;
}

function Pill({ icon, name, small }: PillProps) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: small ? "5px" : "7px",
        background: "#F5F7FA",
        border: "1px solid #E2E8F0",
        borderRadius: "999px",
        padding: small ? "5px 11px 5px 8px" : "6px 14px 6px 10px",
        whiteSpace: "nowrap",
        fontSize: small ? "12px" : "14px",
        fontWeight: 600,
        color: "#0A2540",
        letterSpacing: "0.01em",
        flexShrink: 0,
        cursor: "pointer",
        userSelect: "none",
      }}
    >
      <span style={{ fontSize: small ? "13px" : "15px" }}>{icon}</span>
      {name}
    </span>
  );
}

export default function BillerTicker({ small }: { small?: boolean }) {
  return (
    <div
      style={{
        width: "100%",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Left + right fade masks */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(to right, #ffffff 0%, transparent 80px, transparent calc(100% - 80px), #ffffff 100%)",
          zIndex: 1,
          pointerEvents: "none",
        }}
      />

      <style>{`
        @keyframes tickerLeft  { 0% { transform:translateX(0); }    100% { transform:translateX(-50%); } }
        @keyframes tickerRight { 0% { transform:translateX(-50%); } 100% { transform:translateX(0); } }
        .ticker-row { display:flex; gap:10px; width:max-content; }
        .ticker-row:hover { animation-play-state:paused !important; }
      `}</style>

      {/* Row 1 — left */}
      <div style={{ overflow: "hidden", marginBottom: "8px" }}>
        <div
          className="ticker-row"
          style={{ animation: "tickerLeft 25s linear infinite" }}
        >
          {ROW1.map((b, i) => (
            <Pill key={`r1-${i}`} icon={b.icon} name={b.name} small={small} />
          ))}
        </div>
      </div>

      {/* Row 2 — right */}
      <div style={{ overflow: "hidden" }}>
        <div
          className="ticker-row"
          style={{ animation: "tickerRight 25s linear infinite" }}
        >
          {ROW2.map((b, i) => (
            <Pill key={`r2-${i}`} icon={b.icon} name={b.name} small={small} />
          ))}
        </div>
      </div>
    </div>
  );
}
