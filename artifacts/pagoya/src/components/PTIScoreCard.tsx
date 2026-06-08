import { useEffect, useState, useRef } from "react";

interface PTIBreakdown {
  payment_streak:      { score: number; months: number; max: number };
  biller_diversity:    { score: number; count: number;  max: number };
  kyc_verified:        { score: number; verified: boolean; max: number };
  wallet_balance:      { score: number; avg_balance_mxn: number; max: number };
  mission_completions: { score: number; count: number;  max: number };
  load_spend_ratio:    { score: number; ratio: number;  max: number };
  account_age:         { score: number; days: number;   max: number };
  total: number;
}

interface PTIResponse {
  score: number | null;
  tier?: string;
  tier_label?: string;
  tier_color?: string;
  breakdown?: PTIBreakdown;
  computed_at?: string;
  next_update?: string;
  is_new_user?: boolean;
  message?: string;
}

function getTierColor(tier?: string): string {
  if (tier === "excelente") return "#00C875";
  if (tier === "bueno")     return "#007A4A";
  if (tier === "en_proceso") return "#F59E0B";
  return "#6B7280";
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const months = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function formatNextUpdate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const months = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
  return `1 ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function getImprovementHint(bd: PTIBreakdown): string {
  if (bd.biller_diversity.count < 3) {
    const more = 3 - bd.biller_diversity.count;
    return `💡 Paga ${more} servicio${more > 1 ? "s" : ""} diferente${more > 1 ? "s" : ""} para +${more * 5} pts`;
  }
  if (!bd.kyc_verified.verified) {
    return "💡 Verifica tu identidad para +15 pts";
  }
  if (bd.payment_streak.months < 25) {
    return "💡 Sigue pagando cada mes para subir tu racha";
  }
  return "🌟 ¡Excelente historial! Sigue así.";
}

interface ScoreRowProps {
  icon: string;
  label: string;
  score: number;
  max: number;
  color: string;
}
function ScoreRow({ icon, label, score, max, color }: ScoreRowProps) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "5px 0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.825rem", color: "#374151" }}>
        <span style={{ fontSize: "1rem" }}>{icon}</span>
        <span>{label}</span>
      </div>
      <span style={{ fontSize: "0.8rem", fontWeight: 700, color, flexShrink: 0 }}>+{score} pts</span>
    </div>
  );
}

interface Props {
  telefono: string;
  refreshKey?: number;
  pendingCompute?: boolean;
}

export default function PTIScoreCard({ telefono, refreshKey = 0, pendingCompute = false }: Props) {
  const [data, setData] = useState<PTIResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [displayScore, setDisplayScore] = useState(0);
  const [barWidth, setBarWidth] = useState(0);
  const animFrameRef = useRef<number | null>(null);

  async function fetchScore() {
    setLoading(true);
    setError(false);
    try {
      const base = (import.meta.env.BASE_URL ?? "").replace(/\/$/, "");
      const res = await fetch(`${base}/api/pti/score?telefono=${encodeURIComponent(telefono)}`);
      if (!res.ok) throw new Error("fetch failed");
      const json: PTIResponse = await res.json();
      setData(json);
      if (json.score != null) {
        animateScore(json.score);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  function animateScore(target: number) {
    const duration = 800;
    const start = performance.now();
    function step(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setDisplayScore(Math.round(eased * target));
      setBarWidth(eased * target);
      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(step);
      }
    }
    animFrameRef.current = requestAnimationFrame(step);
  }

  useEffect(() => {
    fetchScore();
    return () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current); };
  }, [telefono, refreshKey]);

  const tierColor = getTierColor(data?.tier);

  // ── Loading skeleton ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{
        background: "#fff",
        border: "1px solid #F0F0F0",
        borderRadius: "1rem",
        padding: "1.25rem",
        boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
      }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div style={{ height: 16, borderRadius: 8, background: "linear-gradient(90deg,#f3f4f6 25%,#e5e7eb 50%,#f3f4f6 75%)", backgroundSize: "200% 100%", animation: "pti-shimmer 1.4s infinite" }} />
          <div style={{ height: 52, borderRadius: 8, background: "linear-gradient(90deg,#f3f4f6 25%,#e5e7eb 50%,#f3f4f6 75%)", backgroundSize: "200% 100%", animation: "pti-shimmer 1.4s infinite" }} />
          <div style={{ height: 10, borderRadius: 8, background: "linear-gradient(90deg,#f3f4f6 25%,#e5e7eb 50%,#f3f4f6 75%)", backgroundSize: "200% 100%", animation: "pti-shimmer 1.4s infinite" }} />
        </div>
        <style>{`@keyframes pti-shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
      </div>
    );
  }

  // ── Error state ──────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div style={{
        background: "#fff",
        border: "1px solid #F0F0F0",
        borderRadius: "1rem",
        padding: "1.25rem",
        boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
        textAlign: "center",
      }}>
        <p style={{ color: "#6B7280", fontSize: "0.85rem", margin: "0 0 10px" }}>
          No pudimos cargar tu puntaje. Intenta de nuevo.
        </p>
        <button
          onClick={fetchScore}
          style={{
            background: "#1D9E75", color: "#fff", border: "none",
            borderRadius: "8px", padding: "6px 18px", fontSize: "0.85rem",
            fontWeight: 600, cursor: "pointer",
          }}
        >
          Reintentar
        </button>
      </div>
    );
  }

  // ── New user — no score yet ──────────────────────────────────────────────────
  if (!data || data.score == null) {
    const nullMessage = pendingCompute
      ? "Tu puntaje se está calculando. Regresa en unos minutos para verlo aquí."
      : (data?.message ?? "Tu primer puntaje se calculará el próximo día 1 del mes.");
    return (
      <div style={{
        background: "#fff",
        border: "1px solid #F0F0F0",
        borderRadius: "1rem",
        padding: "1.25rem",
        boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
      }}>
        <p style={{ fontWeight: 700, fontSize: "0.9rem", color: "#005432", margin: "0 0 6px" }}>
          🛡️ Tu PagoYa Trust Index
        </p>
        <p style={{ fontSize: "0.82rem", color: "#6B7280", margin: 0 }}>
          {nullMessage}
        </p>
        {pendingCompute && (
          <div style={{
            marginTop: "10px",
            height: 4,
            borderRadius: 99,
            background: "linear-gradient(90deg,#E5E7EB 25%,#1D9E75 50%,#E5E7EB 75%)",
            backgroundSize: "200% 100%",
            animation: "pti-shimmer 1.6s ease-in-out infinite",
          }} />
        )}
      </div>
    );
  }

  const bd = data.breakdown!;
  const positiveRows: { icon: string; label: string; score: number; max: number }[] = [
    { icon: "🪪", label: "Identidad verificada",         score: bd.kyc_verified.score,        max: 15 },
    { icon: "📅", label: `${bd.payment_streak.months} mes${bd.payment_streak.months !== 1 ? "es" : ""} seguidos de pago`, score: bd.payment_streak.score, max: 25 },
    { icon: "🏢", label: `${bd.biller_diversity.count} servicio${bd.biller_diversity.count !== 1 ? "s" : ""} distinto${bd.biller_diversity.count !== 1 ? "s" : ""}`, score: bd.biller_diversity.score, max: 15 },
    { icon: "🏆", label: `${bd.mission_completions.count} misión${bd.mission_completions.count !== 1 ? "es" : ""} completada${bd.mission_completions.count !== 1 ? "s" : ""}`, score: bd.mission_completions.score, max: 15 },
    { icon: "💰", label: `Saldo en cartera`,             score: bd.wallet_balance.score,      max: 15 },
    { icon: "🔄", label: `Proporción carga/gasto`,       score: bd.load_spend_ratio.score,    max: 10 },
    { icon: "📆", label: `Antigüedad de cuenta`,         score: bd.account_age.score,         max: 5  },
  ].filter(r => r.score > 0);

  const hint = getImprovementHint(bd);

  return (
    <div style={{
      background: "#fff",
      border: "1px solid #F0F0F0",
      borderRadius: "1rem",
      padding: "1.25rem",
      boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
    }}>
      {/* Header */}
      <p style={{ fontWeight: 700, fontSize: "0.875rem", color: "#005432", margin: "0 0 12px" }}>
        🛡️ Tu PagoYa Trust Index
      </p>

      {/* Score + tier */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "10px" }}>
        <div style={{
          width: 64, height: 64,
          borderRadius: "50%",
          border: `3px solid ${tierColor}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <span style={{ fontSize: "1.5rem", fontWeight: 900, color: tierColor, lineHeight: 1 }}>
            {displayScore}
          </span>
        </div>
        <div>
          <div style={{ fontSize: "1.25rem", fontWeight: 800, color: tierColor, lineHeight: 1 }}>
            {data.tier_label}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#9CA3AF", marginTop: 2 }}>
            {displayScore}/100
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{
        height: 8,
        background: "#F3F4F6",
        borderRadius: 99,
        marginBottom: "14px",
        overflow: "hidden",
      }}>
        <div style={{
          height: "100%",
          width: `${barWidth}%`,
          background: tierColor,
          borderRadius: 99,
          transition: "width 0.05s linear",
        }} />
      </div>

      {/* Breakdown rows (only positive components) */}
      {positiveRows.length > 0 && (
        <div style={{
          background: "#F9FAFB",
          borderRadius: "0.75rem",
          padding: "8px 12px",
          marginBottom: "12px",
        }}>
          {positiveRows.map(r => (
            <ScoreRow key={r.label} icon={r.icon} label={r.label} score={r.score} max={r.max} color={tierColor} />
          ))}
        </div>
      )}

      {/* Improvement hint */}
      <p style={{
        fontSize: "0.8rem",
        color: "#374151",
        margin: "0 0 10px",
        background: "rgba(29,158,117,0.06)",
        borderRadius: "8px",
        padding: "7px 10px",
      }}>
        {hint}
      </p>

      {/* Dates */}
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "#9CA3AF" }}>
        {data.computed_at && (
          <span>Actualizado: {formatDate(data.computed_at)}</span>
        )}
        {data.next_update && (
          <span>Próxima actualización: {formatNextUpdate(data.next_update)}</span>
        )}
      </div>
    </div>
  );
}
