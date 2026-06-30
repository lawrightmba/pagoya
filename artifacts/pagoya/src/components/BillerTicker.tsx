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

export default function BillerTicker({
  small,
  dark,
  fadeColor: _fadeColor,
}: {
  small?: boolean;
  dark?: boolean;
  fadeColor?: string;
}) {
  const [expanded, setExpanded] = useState(false);

  const chipBase: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    border: `1px solid ${dark ? "rgba(255,255,255,0.30)" : "#CBD5E1"}`,
    borderRadius: "999px",
    padding: small ? "5px 12px" : "6px 14px",
    fontSize: small ? "12px" : "13px",
    fontWeight: 700,
    color: dark ? "rgba(255,255,255,0.80)" : "#475569",
    background: dark ? "rgba(255,255,255,0.06)" : "#F8FAFC",
    cursor: "pointer",
    flexShrink: 0,
    transition: "background 0.15s, border-color 0.15s",
    userSelect: "none",
    letterSpacing: "0.01em",
    whiteSpace: "nowrap",
  };

  return (
    <div style={{ width: "100%", padding: "0 16px" }}>
      {/* ── Primary row: 5 billers + toggle chip ── */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "8px",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {PRIMARY_BILLERS.map((b) => (
          <Pill key={b.name} icon={b.icon} name={b.name} small={small} dark={dark} />
        ))}

        {!expanded && (
          <button
            onClick={() => setExpanded(true)}
            style={chipBase}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = dark
                ? "rgba(255,255,255,0.14)"
                : "#F1F5F9";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = dark
                ? "rgba(255,255,255,0.06)"
                : "#F8FAFC";
            }}
          >
            Ver más <span style={{ fontSize: "10px", opacity: 0.7 }}>▾</span>
          </button>
        )}
      </div>

      {/* ── Expanded: secondary billers + collapse chip ── */}
      {expanded && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "8px",
            justifyContent: "center",
            alignItems: "center",
            marginTop: "8px",
          }}
        >
          {SECONDARY_BILLERS.map((b) => (
            <Pill key={b.name} icon={b.icon} name={b.name} small={small} dark={dark} />
          ))}

          <button
            onClick={() => setExpanded(false)}
            style={chipBase}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = dark
                ? "rgba(255,255,255,0.14)"
                : "#F1F5F9";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = dark
                ? "rgba(255,255,255,0.06)"
                : "#F8FAFC";
            }}
          >
            Ver menos <span style={{ fontSize: "10px", opacity: 0.7 }}>▴</span>
          </button>
        </div>
      )}
    </div>
  );
}
