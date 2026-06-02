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

// Row 1 starts from the beginning; Row 2 starts from the midpoint so the
// two rows never show the same icons in the same visible window.
const MID = Math.ceil(BILLERS.length / 2);
const ROW1 = [...BILLERS, ...BILLERS];
const ROW2_BASE = [...BILLERS.slice(MID), ...BILLERS.slice(0, MID)];
const ROW2 = [...ROW2_BASE, ...ROW2_BASE];

interface PillProps {
  icon: string;
  name: string;
  small?: boolean;
  dark?: boolean;
}

function Pill({ icon, name, small, dark }: PillProps) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: small ? "5px" : "7px",
        // LIGHT: background "#F5F7FA", border "#E2E8F0", color "#0A2540"
        // DARK:  background "rgba(255,255,255,0.08)", border "rgba(255,255,255,0.15)", color "#FFFFFF"
        background: dark ? "rgba(255,255,255,0.08)" : "#F5F7FA",
        border: `1px solid ${dark ? "rgba(255,255,255,0.15)" : "#E2E8F0"}`,
        borderRadius: "999px",
        padding: small ? "5px 11px 5px 8px" : "6px 14px 6px 10px",
        whiteSpace: "nowrap",
        fontSize: small ? "12px" : "14px",
        fontWeight: 600,
        color: dark ? "#FFFFFF" : "#0A2540",
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

export default function BillerTicker({ small, dark, fadeColor: propFadeColor }: { small?: boolean; dark?: boolean; fadeColor?: string }) {
  // Fade mask color must match the page background behind the ticker
  // Caller can pass an explicit fadeColor; falls back to dark/light inference
  const fadeColor = propFadeColor ?? (dark ? "#0A2540" : "#ffffff");

  return (
    <div
      style={{
        width: "100%",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Left + right fade masks — color tracks the background */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(to right, ${fadeColor} 0%, transparent 80px, transparent calc(100% - 80px), ${fadeColor} 100%)`,
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
            <Pill key={`r1-${i}`} icon={b.icon} name={b.name} small={small} dark={dark} />
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
            <Pill key={`r2-${i}`} icon={b.icon} name={b.name} small={small} dark={dark} />
          ))}
        </div>
      </div>
    </div>
  );
}
