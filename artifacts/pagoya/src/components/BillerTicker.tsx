import { useState } from "react";

const PRIMARY_BILLERS = [
  { icon: "⚡", name: "CFE" },
  { icon: "💧", name: "Agua" },
  { icon: "📱", name: "Telcel" },
  { icon: "🎮", name: "Recarga" },
  { icon: "🏠", name: "Renta" },
];

const SECONDARY_BILLERS = [
  { icon: "🌐", name: "Telmex" },
  { icon: "📺", name: "Izzi" },
  { icon: "📡", name: "Sky" },
  { icon: "🎬", name: "Netflix" },
  { icon: "🎵", name: "Spotify" },
  { icon: "🔥", name: "Gas Natural" },
  { icon: "🏛️", name: "Predial" },
  { icon: "🚗", name: "Tenencia" },
  { icon: "📡", name: "Totalplay" },
  { icon: "📱", name: "AT&T" },
  { icon: "🎓", name: "Colegiatura" },
  { icon: "🛡️", name: "Seguro" },
  { icon: "🎶", name: "Disney+" },
  { icon: "📦", name: "Amazon" },
  { icon: "🚰", name: "SACMEX" },
];

// Double the primary list for seamless infinite loop
const TICKER_ROW = [...PRIMARY_BILLERS, ...PRIMARY_BILLERS];

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

function StaticPill({ icon, name, small, dark }: PillProps) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: small ? "5px" : "7px",
        background: dark ? "rgba(255,255,255,0.06)" : "#F5F7FA",
        border: `1px solid ${dark ? "rgba(255,255,255,0.12)" : "#E2E8F0"}`,
        borderRadius: "999px",
        padding: small ? "4px 10px 4px 7px" : "5px 13px 5px 9px",
        whiteSpace: "nowrap",
        fontSize: small ? "11px" : "13px",
        fontWeight: 600,
        color: dark ? "rgba(255,255,255,0.75)" : "#475569",
        letterSpacing: "0.01em",
        flexShrink: 0,
        userSelect: "none",
      }}
    >
      <span style={{ fontSize: small ? "12px" : "14px" }}>{icon}</span>
      {name}
    </span>
  );
}

export default function BillerTicker({
  small,
  dark,
  fadeColor: propFadeColor,
}: {
  small?: boolean;
  dark?: boolean;
  fadeColor?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const fadeColor = propFadeColor ?? (dark ? "#0A2540" : "#ffffff");

  const chipStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    border: `1px solid ${dark ? "rgba(255,255,255,0.28)" : "#CBD5E1"}`,
    borderRadius: "999px",
    padding: small ? "4px 11px" : "5px 13px",
    fontSize: small ? "11px" : "12px",
    fontWeight: 700,
    color: dark ? "rgba(255,255,255,0.75)" : "#64748B",
    background: dark ? "rgba(255,255,255,0.06)" : "#F8FAFC",
    cursor: "pointer",
    transition: "background 0.15s",
    userSelect: "none",
    letterSpacing: "0.01em",
    whiteSpace: "nowrap",
    border: "none" as never,
  };

  return (
    <div style={{ width: "100%" }}>
      <style>{`
        @keyframes tickerLeft { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .bt-row { display: flex; gap: 10px; width: max-content; }
        .bt-row:hover { animation-play-state: paused !important; }
      `}</style>

      {/* ── Animated single row of 5 (doubled for loop) ── */}
      <div
        style={{
          overflow: "hidden",
          position: "relative",
          paddingBottom: expanded ? "8px" : "0",
        }}
      >
        {/* Fade masks */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `linear-gradient(to right, ${fadeColor} 0%, transparent 70px, transparent calc(100% - 70px), ${fadeColor} 100%)`,
            zIndex: 1,
            pointerEvents: "none",
          }}
        />
        <div
          className="bt-row"
          style={{ animation: "tickerLeft 18s linear infinite" }}
        >
          {TICKER_ROW.map((b, i) => (
            <Pill key={`t-${i}`} icon={b.icon} name={b.name} small={small} dark={dark} />
          ))}
        </div>
      </div>

      {/* ── Ver más / Ver menos toggle ── */}
      <div style={{ textAlign: "center", marginTop: "10px" }}>
        <button
          onClick={() => setExpanded((v) => !v)}
          style={chipStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = dark ? "rgba(255,255,255,0.13)" : "#F1F5F9";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = dark ? "rgba(255,255,255,0.06)" : "#F8FAFC";
          }}
        >
          {expanded
            ? <>Ver menos <span style={{ fontSize: "9px", opacity: 0.65 }}>▴</span></>
            : <>Ver más <span style={{ fontSize: "9px", opacity: 0.65 }}>▾</span></>}
        </button>
      </div>

      {/* ── Expanded: remaining 15 billers in a centered wrap ── */}
      {expanded && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "7px",
            justifyContent: "center",
            padding: "10px 16px 4px",
          }}
        >
          {SECONDARY_BILLERS.map((b) => (
            <StaticPill key={b.name} icon={b.icon} name={b.name} small={small} dark={dark} />
          ))}
        </div>
      )}
    </div>
  );
}
