import { useEffect, useState, useRef } from "react";

// ─── Types matching the new 4-dimension pti.ts model ─────────────────────────

interface PTIDimension {
  score: number;
  max: number;
  label: string;
  components: Record<string, { score: number; max: number; value: number | boolean | string }>;
}

interface PTIBreakdown {
  payment_reliability?:    PTIDimension;
  behavioral_consistency?: PTIDimension;
  engagement_depth?:       PTIDimension;
  cashflow_stability?:     PTIDimension;
  total: number;
  model_version?: string;
  // Legacy flat fields (v1 scores still stored in DB for existing users)
  payment_streak?:      { score: number; months: number; max: number };
  biller_diversity?:    { score: number; count: number;  max: number };
  kyc_verified?:        { score: number; verified: boolean; max: number };
  wallet_balance?:      { score: number; avg_balance_mxn: number; max: number };
  load_spend_ratio?:    { score: number; ratio: number;  max: number };
  account_age?:         { score: number; days: number;   max: number };
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTierColor(tier?: string): string {
  if (tier === "excelente") return "#00C875";
  if (tier === "bueno")     return "#007A4A";
  if (tier === "en_proceso") return "#F59E0B";
  return "#6B7280";
}

const TIER_LABELS_EN: Record<string, string> = {
  "Iniciando":  "Starting",
  "En proceso": "In Progress",
  "Bueno":      "Good",
  "Excelente":  "Excellent",
};

function formatDate(iso: string, lang: "es" | "en"): string {
  const d = new Date(iso);
  const m = lang === "es"
    ? ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"][d.getMonth()]
    : ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][d.getMonth()];
  return `${d.getDate()} ${m} ${d.getFullYear()}`;
}

// ─── Dimension card (animated fill bar) ──────────────────────────────────────

interface DimCardProps {
  icon: string;
  labelEs: string;
  labelEn: string;
  score: number;
  max: number;
  color: string;
  lang: "es" | "en";
  animate: boolean;
}

function DimCard({ icon, labelEs, labelEn, score, max, color, lang, animate }: DimCardProps) {
  const pct = max > 0 ? (score / max) * 100 : 0;
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!animate) return;
    const t = setTimeout(() => setWidth(pct), 80);
    return () => clearTimeout(t);
  }, [animate, pct]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: "0.78rem", color: "#374151", fontWeight: 600 }}>
          {icon} {lang === "es" ? labelEs : labelEn}
        </span>
        <span style={{ fontSize: "0.75rem", fontWeight: 700, color, flexShrink: 0, marginLeft: "8px" }}>
          {score}<span style={{ color: "#9CA3AF", fontWeight: 400 }}>/{max}</span>
        </span>
      </div>
      <div style={{ height: 6, background: "#F3F4F6", borderRadius: 99, overflow: "hidden" }}>
        <div style={{
          height: "100%",
          width: `${animate ? width : pct}%`,
          background: color,
          borderRadius: 99,
          transition: "width 0.55s cubic-bezier(0.25,0.46,0.45,0.94)",
        }} />
      </div>
    </div>
  );
}

// ─── Improvement hint ─────────────────────────────────────────────────────────

function getImprovementHint(bd: PTIBreakdown, lang: "es" | "en"): string {
  const es = lang === "es";
  // 4-dimension model hints
  if (bd.payment_reliability && bd.behavioral_consistency && bd.engagement_depth && bd.cashflow_stability) {
    const dims = [
      { k: "pr", r: bd.payment_reliability.score / bd.payment_reliability.max },
      { k: "bc", r: bd.behavioral_consistency.score / bd.behavioral_consistency.max },
      { k: "ed", r: bd.engagement_depth.score / bd.engagement_depth.max },
      { k: "cf", r: bd.cashflow_stability.score / bd.cashflow_stability.max },
    ].sort((a, b) => a.r - b.r);
    switch (dims[0].k) {
      case "pr": return es ? "💡 Paga en las mismas fechas cada mes para subir tu racha" : "💡 Pay on consistent dates each month to grow your streak";
      case "bc": return es ? "💡 Abre la app más seguido o juega Raspa y Gana" : "💡 Open the app more often or play Scratch & Win";
      case "ed": return es ? "💡 Verifica tu identidad para +10 pts de perfil" : "💡 Verify your identity for +10 profile pts";
      case "cf": return es ? "💡 Mantén saldo en tu billetera para mejorar la estabilidad" : "💡 Keep a balance in your wallet to improve stability";
    }
  }
  // Legacy model hints
  if (bd.biller_diversity && bd.biller_diversity.count < 3) {
    const more = 3 - bd.biller_diversity.count;
    return es
      ? `💡 Paga ${more} servicio${more > 1 ? "s" : ""} diferente${more > 1 ? "s" : ""} para sumar más pts`
      : `💡 Pay ${more} different service${more > 1 ? "s" : ""} for more pts`;
  }
  if (bd.kyc_verified && !bd.kyc_verified.verified) {
    return es ? "💡 Verifica tu identidad para +10 pts" : "💡 Verify your identity for +10 pts";
  }
  return es ? "🌟 ¡Excelente historial! Sigue así." : "🌟 Excellent history! Keep it up.";
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  telefono: string;
  refreshKey?: number;
  pendingCompute?: boolean;
  lang?: "es" | "en";
}

export default function PTIScoreCard({ telefono, refreshKey = 0, pendingCompute = false, lang = "es" }: Props) {
  const es = lang === "es";
  const [data, setData] = useState<PTIResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [displayScore, setDisplayScore] = useState(0);
  const [barWidth, setBarWidth] = useState(0);
  const [dimAnimate, setDimAnimate] = useState(false);
  const animFrameRef = useRef<number | null>(null);

  async function fetchScore() {
    setLoading(true);
    setError(false);
    setDimAnimate(false);
    try {
      const base = (import.meta.env.BASE_URL ?? "").replace(/\/$/, "");
      const res = await fetch(`${base}/api/pti/score?telefono=${encodeURIComponent(telefono)}`);
      if (!res.ok) throw new Error("fetch failed");
      const json: PTIResponse = await res.json();
      setData(json);
      if (json.score != null) {
        animateScore(json.score);
        setTimeout(() => setDimAnimate(true), 300);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  function animateScore(target: number) {
    const duration = 900;
    const start = performance.now();
    function step(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayScore(Math.round(eased * target));
      setBarWidth(eased * target);
      if (progress < 1) animFrameRef.current = requestAnimationFrame(step);
    }
    animFrameRef.current = requestAnimationFrame(step);
  }

  useEffect(() => {
    fetchScore();
    return () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current); };
  }, [telefono, refreshKey]);

  const tierColor = getTierColor(data?.tier);

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ background: "#fff", border: "1px solid #F0F0F0", borderRadius: "1rem", padding: "1.25rem", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
        <style>{`@keyframes pti-shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {[16, 64, 10, 10, 10, 10].map((h, i) => (
            <div key={i} style={{ height: h, borderRadius: 8, background: "linear-gradient(90deg,#f3f4f6 25%,#e5e7eb 50%,#f3f4f6 75%)", backgroundSize: "200% 100%", animation: "pti-shimmer 1.4s infinite" }} />
          ))}
        </div>
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────────────────────────
  if (error) {
    return (
      <div style={{ background: "#fff", border: "1px solid #F0F0F0", borderRadius: "1rem", padding: "1.25rem", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", textAlign: "center" }}>
        <p style={{ color: "#6B7280", fontSize: "0.85rem", margin: "0 0 10px" }}>
          {es ? "No pudimos cargar tu puntaje." : "Couldn't load your score."}
        </p>
        <button onClick={fetchScore} style={{ background: "#1D9E75", color: "#fff", border: "none", borderRadius: "8px", padding: "6px 18px", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer" }}>
          {es ? "Reintentar" : "Retry"}
        </button>
      </div>
    );
  }

  // ── New user — no score yet ───────────────────────────────────────────────
  if (!data || data.score == null) {
    return (
      <div style={{ background: "#fff", border: "1px solid #F0F0F0", borderRadius: "1rem", padding: "1.25rem", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
        <p style={{ fontWeight: 700, fontSize: "0.9rem", color: "#005432", margin: "0 0 6px" }}>
          🛡️ {es ? "Tu Predictive Trust Index" : "Your Predictive Trust Index"}
        </p>
        <p style={{ fontSize: "0.82rem", color: "#6B7280", margin: 0 }}>
          {pendingCompute
            ? (es ? "Tu puntaje se está calculando…" : "Your score is being calculated…")
            : (data?.message ?? (es ? "Tu primer puntaje se calculará el próximo día 1 del mes." : "Your first score will be calculated on the 1st of next month."))}
        </p>
        {pendingCompute && (
          <div style={{ marginTop: "10px", height: 4, borderRadius: 99, background: "linear-gradient(90deg,#E5E7EB 25%,#1D9E75 50%,#E5E7EB 75%)", backgroundSize: "200% 100%", animation: "pti-shimmer 1.6s ease-in-out infinite" }} />
        )}
        <style>{`@keyframes pti-shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>
      </div>
    );
  }

  const bd = data.breakdown!;
  const hint = getImprovementHint(bd, lang);
  const is4Dim = !!(bd.payment_reliability && bd.behavioral_consistency && bd.engagement_depth && bd.cashflow_stability);

  // ── 4-dimension layout ────────────────────────────────────────────────────
  const dims = is4Dim ? [
    { icon: "📅", labelEs: "Fiabilidad de Pago",            labelEn: "Payment Reliability",    score: bd.payment_reliability!.score,    max: bd.payment_reliability!.max },
    { icon: "🔄", labelEs: "Consistencia",                  labelEn: "Behavioral Consistency",  score: bd.behavioral_consistency!.score, max: bd.behavioral_consistency!.max },
    { icon: "🏢", labelEs: "Profundidad de Uso",            labelEn: "Engagement Depth",        score: bd.engagement_depth!.score,       max: bd.engagement_depth!.max },
    { icon: "💰", labelEs: "Estabilidad de Flujo",          labelEn: "Cash-Flow Stability",     score: bd.cashflow_stability!.score,     max: bd.cashflow_stability!.max },
  ] : [
    // Legacy fallback rows
    { icon: "📅", labelEs: `${bd.payment_streak?.months ?? 0} meses de pago`,   labelEn: `${bd.payment_streak?.months ?? 0} payment months`,  score: bd.payment_streak?.score ?? 0,   max: bd.payment_streak?.max ?? 25 },
    { icon: "🏢", labelEs: `${bd.biller_diversity?.count ?? 0} servicios`,       labelEn: `${bd.biller_diversity?.count ?? 0} services`,       score: bd.biller_diversity?.score ?? 0, max: bd.biller_diversity?.max ?? 15 },
    { icon: "🪪", labelEs: "Identidad",                                          labelEn: "Identity",                                           score: bd.kyc_verified?.score ?? 0,     max: bd.kyc_verified?.max ?? 15 },
    { icon: "💰", labelEs: "Saldo",                                              labelEn: "Balance",                                            score: bd.wallet_balance?.score ?? 0,   max: bd.wallet_balance?.max ?? 15 },
  ];

  return (
    <div style={{ background: "#fff", border: "1px solid #F0F0F0", borderRadius: "1rem", padding: "1.25rem", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
      <style>{`@keyframes pti-shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>

      {/* Header */}
      <p style={{ fontWeight: 700, fontSize: "0.875rem", color: "#005432", margin: "0 0 12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span>🛡️ {es ? "Predictive Trust Index" : "Predictive Trust Index"}</span>
        {is4Dim && <span style={{ fontSize: "0.65rem", fontWeight: 500, color: "#9CA3AF", letterSpacing: "0.05em" }}>v5.0</span>}
      </p>

      {/* Score circle + tier */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "14px" }}>
        <div style={{ position: "relative", width: 68, height: 68, flexShrink: 0 }}>
          <svg width="68" height="68" style={{ position: "absolute", top: 0, left: 0 }}>
            <circle cx="34" cy="34" r="30" fill="none" stroke="#F3F4F6" strokeWidth="5" />
            <circle
              cx="34" cy="34" r="30" fill="none"
              stroke={tierColor} strokeWidth="5"
              strokeDasharray={`${(barWidth / 100) * 188.5} 188.5`}
              strokeLinecap="round"
              transform="rotate(-90 34 34)"
              style={{ transition: "stroke-dasharray 0.05s linear" }}
            />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: "1.3rem", fontWeight: 900, color: tierColor, lineHeight: 1 }}>{displayScore}</span>
          </div>
        </div>
        <div>
          <div style={{ fontSize: "1.2rem", fontWeight: 800, color: tierColor, lineHeight: 1 }}>
            {es ? data.tier_label : (TIER_LABELS_EN[data.tier_label ?? ""] ?? data.tier_label)}
          </div>
          <div style={{ fontSize: "0.72rem", color: "#9CA3AF", marginTop: 2 }}>{displayScore}/100</div>
          <div style={{ fontSize: "0.68rem", color: "#9CA3AF", marginTop: 1 }}>
            {is4Dim
              ? (es ? "4 dimensiones evaluadas" : "4 dimensions assessed")
              : (es ? "Modelo base" : "Base model")}
          </div>
        </div>
      </div>

      {/* 4 Dimension bars */}
      <div style={{ background: "#F9FAFB", borderRadius: "0.75rem", padding: "10px 12px", marginBottom: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
        {dims.map((d, i) => (
          <DimCard
            key={d.labelEs}
            icon={d.icon}
            labelEs={d.labelEs}
            labelEn={d.labelEn}
            score={d.score}
            max={d.max}
            color={tierColor}
            lang={lang}
            animate={dimAnimate}
          />
        ))}
      </div>

      {/* Improvement hint */}
      <p style={{ fontSize: "0.8rem", color: "#374151", margin: "0 0 10px", background: "rgba(29,158,117,0.06)", borderRadius: "8px", padding: "7px 10px" }}>
        {hint}
      </p>

      {/* Phase 2 banner */}
      <div style={{ marginTop: "12px", padding: "9px 12px", background: "linear-gradient(135deg, rgba(0,122,74,0.08) 0%, rgba(0,200,117,0.08) 100%)", border: "1px solid rgba(0,122,74,0.22)", borderRadius: "10px", display: "flex", alignItems: "center", gap: "10px" }}>
        <span style={{ fontSize: "18px", flexShrink: 0 }}>🚀</span>
        <div>
          <div style={{ fontSize: "0.78rem", fontWeight: 800, color: "#005432", marginBottom: "1px" }}>
            {es ? "Fase 2 disponible el 7 de julio" : "Phase 2 available July 7"}
          </div>
          <div style={{ fontSize: "0.72rem", color: "#6B7280" }}>
            {es ? "Nuevas recompensas y beneficios se desbloquean pronto" : "New rewards and benefits unlocking soon"}
          </div>
        </div>
      </div>

      {/* Dates */}
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "#9CA3AF", marginTop: "10px" }}>
        {data.computed_at && <span>{es ? "Actualizado" : "Updated"}: {formatDate(data.computed_at, lang)}</span>}
        {data.next_update && <span>{es ? "Próxima" : "Next"}: {es ? "1 jul 2026" : "1 Jul 2026"}</span>}
      </div>
    </div>
  );
}
