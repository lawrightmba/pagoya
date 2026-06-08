import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function getPhone(): string {
  try { return localStorage.getItem("pagoya_telefono") ?? ""; } catch { return ""; }
}

// ─── Wheel slots (visual order, clockwise from top) ──────────────────────────
const SLOTS = [
  { label: "+50 Puntos",   emoji: "⭐", type: "puntos",            value: 50,  color: "#1D9E75" },
  { label: "$25 MXN",      emoji: "💰", type: "cashback",          value: 25,  color: "#0A2540" },
  { label: "+100 Puntos",  emoji: "🌟", type: "puntos",            value: 100, color: "#046C2C" },
  { label: "Gran Premio",  emoji: "🏆", type: "grand_prize_entry", value: 0,   color: "#B45309" },
  { label: "+200 Puntos",  emoji: "💫", type: "puntos",            value: 200, color: "#1D9E75" },
  { label: "$50 MXN",      emoji: "💵", type: "cashback",          value: 50,  color: "#0A2540" },
  { label: "+500 Puntos",  emoji: "✨", type: "puntos",            value: 500, color: "#065F46" },
];

const SEG = 360 / SLOTS.length; // ≈ 51.43°

function spinDegForSlot(slotIndex: number): number {
  // Rotate clockwise 5 full turns + land winning segment at top pointer
  return 5 * 360 + (360 - (slotIndex * SEG + SEG / 2));
}

// Build conic-gradient string
function buildConicGradient(): string {
  const stops: string[] = [];
  SLOTS.forEach((s, i) => {
    const start = i * SEG;
    const end = (i + 1) * SEG;
    stops.push(`${s.color} ${start}deg ${end}deg`);
  });
  return `conic-gradient(from 0deg, ${stops.join(", ")})`;
}

interface SpinResult {
  prize_type: string;
  prize_label: string;
  prize_value: number;
  slot_index: number;
  is_grand_prize_entry: boolean;
  message?: string;
}

export default function SpinWheel() {
  const [, navigate] = useLocation();
  const telefono = getPhone();

  const [status, setStatus] = useState<"loading" | "ready" | "spinning" | "done" | "already" | "no-phone">("loading");
  const [result, setResult] = useState<SpinResult | null>(null);
  const [rotation, setRotation] = useState(0);
  const wheelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!telefono) { setStatus("no-phone"); return; }
    fetch(`${BASE}/api/games/spin/status?telefono=${encodeURIComponent(telefono)}`)
      .then(r => r.json())
      .then(data => {
        if (data.hasSpun) {
          setResult(data.prize);
          setStatus("already");
        } else {
          setStatus("ready");
        }
      })
      .catch(() => setStatus("ready"));
  }, []);

  async function doSpin() {
    if (status !== "ready" || !telefono) return;
    setStatus("spinning");

    const res = await fetch(`${BASE}/api/games/spin`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ telefono }),
    });
    const data: SpinResult & { error?: string } = await res.json();

    if (!res.ok) {
      setStatus("ready");
      return;
    }

    // Calculate spin rotation
    const deg = spinDegForSlot(data.slot_index);
    setRotation(deg);

    // Wait for animation (4s) then show result
    setTimeout(() => {
      setResult(data);
      setStatus("done");
    }, 4200);
  }

  const conicGrad = buildConicGradient();

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(180deg, #0A1628 0%, #0A2540 100%)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "0 20px 60px",
      overflowX: "hidden",
    }}>

      {/* Header */}
      <div style={{ width: "100%", maxWidth: "480px", padding: "20px 0 0", textAlign: "center" }}>
        <p style={{ fontSize: "11px", fontWeight: 700, color: "#1D9E75", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: "6px" }}>
          Bienvenido a PagoYa
        </p>
        <h1 style={{ fontSize: "28px", fontWeight: 900, color: "#fff", margin: "0 0 4px", letterSpacing: "-0.02em" }}>
          🎡 ¡Gira tu Ruleta!
        </h1>
        <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.55)", margin: "0 0 32px" }}>
          Un giro gratis por registrarte. Buena suerte.
        </p>
      </div>

      {/* Wheel container */}
      <div style={{ position: "relative", width: "280px", height: "280px", marginBottom: "32px", flexShrink: 0 }}>

        {/* Pointer — fixed triangle at top */}
        <div style={{
          position: "absolute",
          top: "-16px",
          left: "50%",
          transform: "translateX(-50%)",
          width: 0,
          height: 0,
          borderLeft: "14px solid transparent",
          borderRight: "14px solid transparent",
          borderTop: "28px solid #F59E0B",
          zIndex: 10,
          filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.5))",
        }} />

        {/* Wheel */}
        <div
          ref={wheelRef}
          style={{
            width: "280px",
            height: "280px",
            borderRadius: "50%",
            background: conicGrad,
            border: "6px solid rgba(255,255,255,0.12)",
            boxShadow: "0 0 40px rgba(29,158,117,0.3), 0 0 0 3px rgba(255,255,255,0.06)",
            transform: `rotate(${rotation}deg)`,
            transition: status === "spinning" ? "transform 4s cubic-bezier(0.17,0.67,0.12,0.99)" : "none",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Segment labels — positioned absolutely */}
          {SLOTS.map((slot, i) => {
            const angleDeg = i * SEG + SEG / 2;
            const angleRad = ((angleDeg - 90) * Math.PI) / 180;
            const r = 95;
            const x = 140 + r * Math.cos(angleRad);
            const y = 140 + r * Math.sin(angleRad);
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: `${x}px`,
                  top: `${y}px`,
                  transform: `translate(-50%, -50%) rotate(${angleDeg}deg)`,
                  textAlign: "center",
                  pointerEvents: "none",
                  lineHeight: 1.2,
                }}
              >
                <div style={{ fontSize: "18px" }}>{slot.emoji}</div>
                <div style={{ fontSize: "8px", fontWeight: 900, color: "#fff", textShadow: "0 1px 3px rgba(0,0,0,0.8)", whiteSpace: "nowrap" }}>
                  {slot.label}
                </div>
              </div>
            );
          })}

          {/* Center cap */}
          <div style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "52px",
            height: "52px",
            borderRadius: "50%",
            background: "#0A2540",
            border: "3px solid rgba(255,255,255,0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "20px",
            zIndex: 2,
          }}>
            🌟
          </div>
        </div>
      </div>

      {/* ── State: loading ── */}
      {status === "loading" && (
        <div style={{ textAlign: "center", color: "rgba(255,255,255,0.5)", fontSize: "14px" }}>Cargando...</div>
      )}

      {/* ── State: no-phone ── */}
      {status === "no-phone" && (
        <div style={{ textAlign: "center", maxWidth: "320px" }}>
          <p style={{ color: "rgba(255,255,255,0.6)", marginBottom: "20px" }}>Primero debes registrarte para girar la ruleta.</p>
          <button onClick={() => navigate("/register")}
            style={{ padding: "14px 32px", background: "#1D9E75", color: "#fff", border: "none", borderRadius: "12px", fontWeight: 800, fontSize: "16px", cursor: "pointer" }}>
            Crear cuenta gratis →
          </button>
        </div>
      )}

      {/* ── State: ready ── */}
      {status === "ready" && (
        <div style={{ textAlign: "center", width: "100%", maxWidth: "320px" }}>
          <button
            onClick={doSpin}
            style={{
              width: "100%",
              padding: "18px",
              background: "linear-gradient(135deg, #1D9E75, #046C2C)",
              color: "#fff",
              border: "none",
              borderRadius: "16px",
              fontWeight: 900,
              fontSize: "20px",
              cursor: "pointer",
              letterSpacing: "0.04em",
              boxShadow: "0 8px 24px rgba(29,158,117,0.4)",
              animation: "pulse 2s infinite",
            }}
          >
            🎡 ¡GIRAR AHORA!
          </button>
          <p style={{ marginTop: "14px", fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>
            Un giro gratuito por cuenta. El Gran Premio se sortea mensualmente.
          </p>
        </div>
      )}

      {/* ── State: spinning ── */}
      {status === "spinning" && (
        <div style={{ textAlign: "center" }}>
          <p style={{ color: "#1D9E75", fontWeight: 800, fontSize: "18px", animation: "spin 0.5s linear infinite" }}>
            Girando...
          </p>
        </div>
      )}

      {/* ── State: done ── */}
      {status === "done" && result && (
        <PrizeResult result={result} onContinue={() => navigate("/bienvenida")} />
      )}

      {/* ── State: already spun ── */}
      {status === "already" && result && (
        <div style={{ textAlign: "center", maxWidth: "320px", width: "100%" }}>
          <div style={{
            background: "rgba(29,158,117,0.12)",
            border: "1px solid rgba(29,158,117,0.3)",
            borderRadius: "20px",
            padding: "28px 24px",
            marginBottom: "20px",
          }}>
            <p style={{ fontSize: "40px", marginBottom: "8px" }}>✅</p>
            <p style={{ color: "#fff", fontWeight: 800, fontSize: "18px", marginBottom: "6px" }}>Ya giraste tu ruleta</p>
            <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "13px", marginBottom: "16px" }}>
              Ganaste: <strong style={{ color: "#1D9E75" }}>{result.prize_label}</strong>
            </p>
          </div>
          <button onClick={() => navigate("/bienvenida")}
            style={{ width: "100%", padding: "16px", background: "#1D9E75", color: "#fff", border: "none", borderRadius: "14px", fontWeight: 800, fontSize: "16px", cursor: "pointer" }}>
            Ir a mi cuenta →
          </button>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.03); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes popIn {
          0% { transform: scale(0.7); opacity: 0; }
          70% { transform: scale(1.08); }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function PrizeResult({ result, onContinue }: { result: SpinResult; onContinue: () => void }) {
  const isGrandPrize = result.is_grand_prize_entry;
  const isCashback = result.prize_type === "cashback";

  return (
    <div style={{ textAlign: "center", maxWidth: "320px", width: "100%", animation: "popIn 0.5s ease" }}>
      <div style={{
        background: isGrandPrize
          ? "linear-gradient(135deg, #1C0A00, #B45309)"
          : "rgba(29,158,117,0.14)",
        border: `1px solid ${isGrandPrize ? "rgba(245,158,11,0.5)" : "rgba(29,158,117,0.4)"}`,
        borderRadius: "24px",
        padding: "32px 24px",
        marginBottom: "20px",
      }}>
        <p style={{ fontSize: "52px", marginBottom: "8px" }}>
          {isGrandPrize ? "🏆" : isCashback ? "💰" : "⭐"}
        </p>
        <p style={{
          color: isGrandPrize ? "#F59E0B" : "#1D9E75",
          fontWeight: 900,
          fontSize: "24px",
          marginBottom: "6px",
        }}>
          {isGrandPrize ? "¡GRAN PREMIO!" : "¡GANASTE!"}
        </p>
        <p style={{ color: "#fff", fontWeight: 800, fontSize: "20px", marginBottom: "10px" }}>
          {result.prize_label}
        </p>
        {isGrandPrize ? (
          <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "13px", lineHeight: 1.5 }}>
            Tienes una entrada al sorteo mensual de <strong style={{ color: "#F59E0B" }}>$2,000 MXN</strong>.
            El ganador se anuncia el primer día del siguiente mes por WhatsApp.
          </p>
        ) : isCashback ? (
          <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "13px" }}>
            El saldo fue acreditado directamente en tu monedero PagoYa.
          </p>
        ) : (
          <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "13px" }}>
            Los puntos fueron acreditados en tu cuenta de lealtad.
          </p>
        )}
      </div>

      <button
        onClick={onContinue}
        style={{
          width: "100%",
          padding: "17px",
          background: "linear-gradient(135deg, #1D9E75, #046C2C)",
          color: "#fff",
          border: "none",
          borderRadius: "14px",
          fontWeight: 900,
          fontSize: "17px",
          cursor: "pointer",
          marginBottom: "12px",
        }}
      >
        ¡Hacer mi primer pago! →
      </button>
      <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.3)" }}>
        Cada pago acumula más puntos y desbloquea misiones.
      </p>
    </div>
  );
}
