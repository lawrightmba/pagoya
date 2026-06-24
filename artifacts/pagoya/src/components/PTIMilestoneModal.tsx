import { useEffect, useRef } from "react";

interface MilestoneData {
  slug: string;
  label: string;
  emoji: string;
  tier: string;
  unlocks: string;
  freeBillCredits: number;
  mxn: number;
  tagline: string;
  free_bill_credits_balance: number;
}

interface Props {
  milestone: MilestoneData;
  onDismiss: () => void;
}

const CONFETTI_COLORS = [
  "#007A4A", "#34C77B", "#F5A623", "#FFD700",
  "#5B48D9", "#FF5C1A", "#D4145A", "#00C2FF",
];

function useConfetti(canvasRef: React.RefObject<HTMLCanvasElement>) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const pieces: {
      x: number; y: number; w: number; h: number;
      color: string; rot: number; rotSpeed: number;
      vx: number; vy: number;
    }[] = [];

    for (let i = 0; i < 120; i++) {
      pieces.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height - canvas.height,
        w: Math.random() * 10 + 6,
        h: Math.random() * 6 + 4,
        color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.15,
        vx: (Math.random() - 0.5) * 2,
        vy: Math.random() * 3 + 2,
      });
    }

    let raf: number;
    let frame = 0;

    function draw() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      frame++;

      for (const p of pieces) {
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.rotSpeed;
        if (p.y > canvas.height + 20) {
          p.y = -20;
          p.x = Math.random() * canvas.width;
        }
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = frame < 30 ? frame / 30 : frame > 140 ? Math.max(0, 1 - (frame - 140) / 30) : 1;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }

      if (frame < 170) {
        raf = requestAnimationFrame(draw);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [canvasRef]);
}

export default function PTIMilestoneModal({ milestone, onDismiss }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useConfetti(canvasRef);

  const isReady = milestone.slug === "ready";

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(0,0,0,0.72)",
    }}>
      <canvas
        ref={canvasRef}
        style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      />

      <div style={{
        position: "relative", zIndex: 1,
        background: "#fff",
        borderRadius: "24px",
        padding: "32px 28px 28px",
        maxWidth: "340px",
        width: "calc(100vw - 40px)",
        textAlign: "center",
        boxShadow: "0 24px 60px rgba(0,0,0,0.35)",
      }}>
        <div style={{ fontSize: "64px", lineHeight: 1, marginBottom: "12px" }}>
          {milestone.emoji}
        </div>

        <div style={{
          fontSize: "11px", fontWeight: 700, letterSpacing: "1.5px",
          color: "#007A4A", textTransform: "uppercase", marginBottom: "6px",
        }}>
          {isReady ? "¡Tu perfil está listo!" : `¡Subiste a ${milestone.label}!`}
        </div>

        <div style={{ fontSize: "24px", fontWeight: 800, color: "#111", marginBottom: "16px" }}>
          {isReady
            ? "Nivel que abre puertas"
            : `Nivel ${milestone.label}`}
        </div>

        {/* Rewards */}
        <div style={{
          background: "#F0FBF5",
          border: "1.5px solid #34C77B",
          borderRadius: "14px",
          padding: "16px",
          marginBottom: "16px",
          textAlign: "left",
        }}>
          <div style={{ fontSize: "12px", fontWeight: 700, color: "#007A4A", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.8px" }}>
            Tu recompensa
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: milestone.mxn > 0 ? "8px" : 0 }}>
            <span style={{ fontSize: "22px" }}>🎟️</span>
            <div>
              <div style={{ fontSize: "16px", fontWeight: 700, color: "#111" }}>
                {milestone.freeBillCredits} {milestone.freeBillCredits === 1 ? "pago gratis" : "pagos gratis"}
              </div>
              <div style={{ fontSize: "12px", color: "#555" }}>
                sin cobro de comisión — se aplican solos
              </div>
            </div>
          </div>

          {milestone.mxn > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ fontSize: "22px" }}>💰</span>
              <div>
                <div style={{ fontSize: "16px", fontWeight: 700, color: "#111" }}>
                  ${milestone.mxn} MXN a tu billetera
                </div>
                <div style={{ fontSize: "12px", color: "#555" }}>
                  ya disponible en tu saldo
                </div>
              </div>
            </div>
          )}
        </div>

        {/* What unlocked */}
        <div style={{
          background: "#F8F8F8",
          borderRadius: "12px",
          padding: "12px 14px",
          marginBottom: "20px",
          textAlign: "left",
        }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "6px" }}>
            Qué se desbloqueó
          </div>
          <div style={{ fontSize: "13px", color: "#333", lineHeight: 1.5 }}>
            {milestone.unlocks}
          </div>
        </div>

        {/* Tagline */}
        <div style={{ fontSize: "13px", color: "#666", fontStyle: "italic", marginBottom: "24px", lineHeight: 1.5 }}>
          {milestone.tagline}
        </div>

        <button
          onClick={onDismiss}
          style={{
            width: "100%",
            padding: "16px",
            background: "#007A4A",
            color: "#fff",
            border: "none",
            borderRadius: "14px",
            fontSize: "16px",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {isReady ? "Ver mi perfil" : "¡Gracias, Paula!"}
        </button>

        {milestone.free_bill_credits_balance > 0 && (
          <div style={{ marginTop: "12px", fontSize: "12px", color: "#007A4A", fontWeight: 600 }}>
            Tienes {milestone.free_bill_credits_balance} {milestone.free_bill_credits_balance === 1 ? "pago gratis" : "pagos gratis"} disponibles
          </div>
        )}
      </div>
    </div>
  );
}
