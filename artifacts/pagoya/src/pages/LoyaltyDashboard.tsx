import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { Helmet } from "react-helmet-async";

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Reward {
  code: string;
  name_es: string;
  name_en: string;
  points_cost: number;
  reward_type: string;
  reward_value: number;
  can_redeem: boolean;
}

interface BalanceData {
  points_balance: number;
  points_lifetime: number;
  tier: string;
  next_tier: string | null;
  points_to_next_tier: number;
  available_rewards: Reward[];
}

interface TxRow {
  id: string;
  type: string;
  points: number;
  balance_after: number;
  description: string | null;
  created_at: string;
}

interface LeaderRow {
  tier: string;
  points_lifetime: number;
  masked_phone: string;
}

interface Badge {
  mission_id: string;
  title_es: string;
  badge_emoji: string;
  earned_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TIER_EMOJI: Record<string, string> = { bronce: "🥉", plata: "🥈", oro: "🥇" };
const TIER_THRESHOLDS: Record<string, number> = { bronce: 0, plata: 500, oro: 2000 };

function fmtNum(n: number) {
  return n.toLocaleString("es-MX");
}

function tierProgress(lifetime: number, tier: string, nextTier: string | null): number {
  if (!nextTier) return 100;
  const start = TIER_THRESHOLDS[tier] ?? 0;
  const end = TIER_THRESHOLDS[nextTier] ?? lifetime;
  return Math.min(100, Math.round(((lifetime - start) / (end - start)) * 100));
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ConfettiPop() {
  const pieces = Array.from({ length: 20 }, (_, i) => i);
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 999 }}>
      {pieces.map((i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${Math.random() * 100}%`,
            top: `-10px`,
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            background: ["#1D9E75", "#0A2540", "#D85A30", "#F59E0B"][i % 4],
            animation: `confettiFall ${1 + Math.random()}s ease-in forwards`,
            animationDelay: `${Math.random() * 0.5}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes confettiFall {
          0%   { transform: translateY(0) rotate(0deg);   opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function LoyaltyDashboard() {
  const [, navigate] = useLocation();

  const [lang, setLang] = useState<"es" | "en">(() => {
    try { return (localStorage.getItem("pagoya_lang") as "es" | "en") ?? "es"; } catch { return "es"; }
  });
  const [phone] = useState<string>(() => {
    try { return localStorage.getItem("pagoya_telefono") ?? ""; } catch { return ""; }
  });

  const [balance, setBalance] = useState<BalanceData | null>(null);
  const [history, setHistory] = useState<TxRow[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderRow[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [confetti, setConfetti] = useState(false);

  const es = lang === "es";

  const loadData = useCallback(async () => {
    if (!phone) { setLoading(false); return; }
    setLoading(true);
    try {
      const [balRes, histRes, lbRes, missionsRes] = await Promise.all([
        fetch(`${BASE_URL}/api/loyalty/balance/${encodeURIComponent(phone)}`),
        fetch(`${BASE_URL}/api/loyalty/history/${encodeURIComponent(phone)}?limit=20`),
        fetch(`${BASE_URL}/api/loyalty/leaderboard`),
        fetch(`${BASE_URL}/api/games/missions?telefono=${encodeURIComponent(phone)}`),
      ]);
      if (balRes.ok) setBalance(await balRes.json());
      if (histRes.ok) { const d = await histRes.json(); setHistory(d.history ?? []); }
      if (lbRes.ok) { const d = await lbRes.json(); setLeaderboard(d.leaderboard ?? []); }
      if (missionsRes.ok) {
        const d = await missionsRes.json();
        const earned: Badge[] = (d.missions ?? [])
          .filter((m: { rewarded_at: string | null; badge_emoji: string | null }) => m.rewarded_at && m.badge_emoji)
          .map((m: { mission_id: string; title_es: string; badge_emoji: string; rewarded_at: string }) => ({
            mission_id: m.mission_id, title_es: m.title_es, badge_emoji: m.badge_emoji, earned_at: m.rewarded_at,
          }));
        setBadges(earned);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [phone]);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleRedeem(code: string) {
    if (!phone) return;
    setRedeeming(code);
    try {
      const res = await fetch(`${BASE_URL}/api/loyalty/redeem`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, reward_code: code }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.redemption_token) {
          localStorage.setItem("pagoya_free_tx_token", data.redemption_token);
        }
        setToast({ msg: es ? `✅ ¡Canjeado! Descuento de $${data.discount_applied} MXN aplicado.` : `✅ Redeemed! $${data.discount_applied} MXN discount applied.`, ok: true });
        setConfetti(true);
        setTimeout(() => setConfetti(false), 3000);
        loadData();
      } else {
        setToast({ msg: data.error ?? (es ? "Error al canjear." : "Redemption error."), ok: false });
      }
    } catch {
      setToast({ msg: es ? "Error de conexión." : "Connection error.", ok: false });
    }
    setRedeeming(null);
    setTimeout(() => setToast(null), 4000);
  }

  // ── No phone — ask for it ────────────────────────────────────────────────────
  const [phoneInput, setPhoneInput] = useState("");
  if (!phone) {
    return (
      <div style={{ minHeight: "100vh", background: "#F9FAFB", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px" }}>
        <div style={{ maxWidth: "360px", width: "100%", background: "white", borderRadius: "20px", padding: "32px 24px", boxShadow: "0 4px 20px rgba(0,0,0,0.08)" }}>
          <h2 style={{ fontSize: "22px", fontWeight: 800, color: "#0A2540", marginBottom: "8px" }}>
            🪙 {es ? "Mis Puntos" : "My Points"}
          </h2>
          <p style={{ fontSize: "14px", color: "#6B7280", marginBottom: "20px" }}>
            {es ? "Ingresa tu número para ver tu saldo." : "Enter your phone to see your balance."}
          </p>
          <div style={{ display: "flex", alignItems: "center", border: "1.5px solid #D1D5DB", borderRadius: "10px", marginBottom: "12px", overflow: "hidden" }}>
            <span style={{ padding: "13px 10px 13px 14px", fontSize: "14px", color: "#6B7280", background: "#F9FAFB", borderRight: "1px solid #E5E7EB", whiteSpace: "nowrap" }}>🇲🇽 +52</span>
            <input
              type="tel"
              inputMode="numeric"
              maxLength={10}
              value={phoneInput}
              onChange={(e) => setPhoneInput(e.target.value.replace(/\D/g, "").slice(0, 10))}
              placeholder="10 dígitos locales"
              style={{ flex: 1, padding: "13px 14px", fontSize: "15px", outline: "none", border: "none", background: "transparent", boxSizing: "border-box" }}
            />
          </div>
          <button
            onClick={() => {
              if (phoneInput.trim()) {
                try { localStorage.setItem("pagoya_telefono", phoneInput.trim()); } catch { /* */ }
                window.location.reload();
              }
            }}
            style={{ width: "100%", padding: "14px", borderRadius: "10px", border: "none", background: "#1D9E75", color: "white", fontSize: "15px", fontWeight: 700, cursor: "pointer" }}
          >
            {es ? "Ver mis puntos" : "See my points"}
          </button>
          <button onClick={() => navigate("/")} style={{ width: "100%", marginTop: "10px", padding: "12px", borderRadius: "10px", border: "1.5px solid #E5E7EB", background: "white", color: "#6B7280", fontSize: "14px", cursor: "pointer" }}>
            ← {es ? "Volver al inicio" : "Back to home"}
          </button>
        </div>
      </div>
    );
  }

  const visibleHistory = showAll ? history : history.slice(0, 10);
  const progress = balance ? tierProgress(balance.points_lifetime, balance.tier, balance.next_tier) : 0;

  return (
    <div style={{ minHeight: "100vh", background: "#F9FAFB", overflowX: "hidden" }}>
      <Helmet>
        <title>Mis Puntos — PagoYa</title>
        <meta name="description" content="Consulta tu saldo de puntos PagoYa, historial de recompensas y nivel de fidelidad. Canjea puntos por saldo y beneficios exclusivos." />
        <meta property="og:title" content="Mis Puntos — PagoYa" />
        <meta property="og:description" content="Consulta tu saldo de puntos PagoYa, historial de recompensas y nivel de fidelidad." />
        <meta property="og:image" content="https://pagoyamx.com/og-default.png" />
      </Helmet>

      {confetti && <ConfettiPop />}

      {toast && (
        <div style={{
          position: "fixed", top: "16px", left: "50%", transform: "translateX(-50%)",
          background: toast.ok ? "#1D9E75" : "#DC2626",
          color: "white", borderRadius: "12px", padding: "12px 20px",
          fontSize: "14px", fontWeight: 600, zIndex: 1000,
          boxShadow: "0 4px 16px rgba(0,0,0,0.15)", whiteSpace: "nowrap",
        }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <header style={{ background: "#0A2540", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button onClick={() => navigate("/")} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.7)", cursor: "pointer", fontSize: "14px" }}>
          ← {es ? "Inicio" : "Home"}
        </button>
        <span style={{ color: "white", fontWeight: 800, fontSize: "16px" }}>🪙 {es ? "Mis Puntos" : "My Points"}</span>
        <button onClick={() => { const nl = es ? "en" : "es"; setLang(nl); try { localStorage.setItem("pagoya_lang", nl); } catch { /**/ } }}
          style={{ fontSize: "12px", fontWeight: 700, color: "white", border: "1.5px solid rgba(255,255,255,0.35)", borderRadius: "999px", padding: "4px 10px", background: "rgba(255,255,255,0.12)", cursor: "pointer" }}>
          {es ? "EN" : "ES"}
        </button>
      </header>

      <div style={{ maxWidth: "480px", margin: "0 auto", padding: "20px 16px" }}>

        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "#6B7280" }}>
            <div style={{ width: "36px", height: "36px", border: "3px solid #E5E7EB", borderTopColor: "#1D9E75", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
            {es ? "Cargando puntos..." : "Loading points..."}
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
          </div>
        ) : (
          <>

            {/* ── A. BALANCE HEADER ── */}
            <section style={{ background: "white", borderRadius: "20px", padding: "24px 20px", marginBottom: "16px", boxShadow: "0 2px 12px rgba(10,37,64,0.07)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                <span style={{ fontSize: "13px", color: "#6B7280", fontWeight: 500 }}>
                  {es ? "Saldo de puntos" : "Points balance"}
                </span>
                <span style={{
                  background: balance?.tier === "oro" ? "#FEF9C3" : balance?.tier === "plata" ? "#F1F5F9" : "#FEF3EA",
                  color: balance?.tier === "oro" ? "#92400E" : balance?.tier === "plata" ? "#475569" : "#92400E",
                  borderRadius: "999px", padding: "3px 10px", fontSize: "12px", fontWeight: 700,
                }}>
                  {TIER_EMOJI[balance?.tier ?? "bronce"]} {(balance?.tier ?? "bronce").charAt(0).toUpperCase() + (balance?.tier ?? "bronce").slice(1)}
                </span>
              </div>

              <div style={{ fontSize: "48px", fontWeight: 900, color: "#0A2540", lineHeight: 1, marginBottom: "4px" }}>
                {fmtNum(balance?.points_balance ?? 0)}
                <span style={{ fontSize: "18px", fontWeight: 600, color: "#6B7280", marginLeft: "6px" }}>pts</span>
              </div>

              <p style={{ fontSize: "12px", color: "#9CA3AF", margin: "0 0 16px" }}>
                {es ? "Puntos totales ganados:" : "Total points earned:"} {fmtNum(balance?.points_lifetime ?? 0)}
              </p>

              {/* Progress bar */}
              {balance?.next_tier && (
                <>
                  <div style={{ height: "8px", borderRadius: "999px", background: "#E5E7EB", overflow: "hidden", marginBottom: "6px" }}>
                    <div style={{
                      height: "100%", borderRadius: "999px", background: "#1D9E75",
                      width: `${progress}%`, transition: "width 0.6s ease",
                    }} />
                  </div>
                  <p style={{ fontSize: "12px", color: "#6B7280", margin: 0 }}>
                    {fmtNum(balance.points_to_next_tier)} pts {es ? "más para" : "more for"}{" "}
                    <strong>{TIER_EMOJI[balance.next_tier]} {balance.next_tier.charAt(0).toUpperCase() + balance.next_tier.slice(1)}</strong>
                  </p>
                </>
              )}
              {!balance?.next_tier && (
                <p style={{ fontSize: "12px", color: "#1D9E75", fontWeight: 700, margin: 0 }}>
                  🥇 {es ? "¡Nivel máximo!" : "Max tier reached!"}
                </p>
              )}
            </section>

            {/* ── B. REWARDS GRID ── */}
            <section style={{ marginBottom: "16px" }}>
              <h3 style={{ fontSize: "14px", fontWeight: 800, color: "#0A2540", marginBottom: "12px", paddingLeft: "4px" }}>
                🎁 {es ? "Canjear puntos" : "Redeem points"}
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                {(balance?.available_rewards ?? []).map((rw) => (
                  <div key={rw.code} style={{
                    background: "white", borderRadius: "16px", padding: "14px 10px",
                    boxShadow: "0 2px 8px rgba(10,37,64,0.07)",
                    border: rw.can_redeem ? "1.5px solid #1D9E75" : "1.5px solid #E5E7EB",
                    display: "flex", flexDirection: "column", alignItems: "center", gap: "6px",
                    opacity: rw.can_redeem ? 1 : 0.55,
                  }}>
                    <span style={{ fontSize: "22px" }}>🪙</span>
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "#0A2540", textAlign: "center", lineHeight: 1.2 }}>
                      {es ? rw.name_es : rw.name_en}
                    </span>
                    <span style={{ fontSize: "13px", fontWeight: 900, color: "#1D9E75" }}>
                      {rw.points_cost} pts
                    </span>
                    <span style={{ fontSize: "10px", color: "#6B7280" }}>
                      {es ? "Ahorra" : "Save"} ${rw.reward_value} MXN
                    </span>
                    <button
                      disabled={!rw.can_redeem || redeeming === rw.code}
                      onClick={() => handleRedeem(rw.code)}
                      style={{
                        width: "100%", padding: "8px 4px", borderRadius: "8px", border: "none",
                        background: rw.can_redeem ? "#1D9E75" : "#E5E7EB",
                        color: rw.can_redeem ? "white" : "#9CA3AF",
                        fontSize: "11px", fontWeight: 700, cursor: rw.can_redeem ? "pointer" : "not-allowed",
                      }}
                    >
                      {redeeming === rw.code ? "..." : es ? "Canjear" : "Redeem"}
                    </button>
                  </div>
                ))}
              </div>
            </section>

            {/* ── C. POINTS HISTORY ── */}
            <section style={{ background: "white", borderRadius: "20px", padding: "20px", marginBottom: "16px", boxShadow: "0 2px 12px rgba(10,37,64,0.07)" }}>
              <h3 style={{ fontSize: "14px", fontWeight: 800, color: "#0A2540", marginBottom: "14px" }}>
                📋 {es ? "Historial de puntos" : "Points history"}
              </h3>
              {visibleHistory.length === 0 ? (
                <p style={{ fontSize: "13px", color: "#9CA3AF", textAlign: "center", padding: "20px 0" }}>
                  {es ? "Aún no hay movimientos." : "No transactions yet."}
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {visibleHistory.map((tx) => (
                    <div key={tx.id} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <div style={{
                        width: "34px", height: "34px", borderRadius: "50%", flexShrink: 0,
                        background: tx.type === "earn" || tx.type === "bonus" ? "#D1FAE5" : "#FEE2E2",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "14px",
                      }}>
                        {tx.type === "earn" || tx.type === "bonus" ? "+" : "−"}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: "12px", color: "#374151", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {tx.description ?? tx.type}
                        </p>
                        <p style={{ margin: 0, fontSize: "11px", color: "#9CA3AF" }}>
                          {new Date(tx.created_at).toLocaleDateString(es ? "es-MX" : "en-US", { day: "2-digit", month: "short" })}
                        </p>
                      </div>
                      <span style={{ fontWeight: 800, fontSize: "14px", color: tx.points > 0 ? "#1D9E75" : "#DC2626", whiteSpace: "nowrap" }}>
                        {tx.points > 0 ? "+" : ""}{tx.points} pts
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {history.length > 10 && (
                <button
                  onClick={() => setShowAll(!showAll)}
                  style={{ width: "100%", marginTop: "14px", padding: "10px", borderRadius: "10px", border: "1.5px solid #E5E7EB", background: "white", color: "#6B7280", fontSize: "13px", cursor: "pointer" }}
                >
                  {showAll ? (es ? "Ver menos" : "Show less") : (es ? "Ver todo" : "See all")}
                </button>
              )}
            </section>

            {/* ── D. BADGES ── */}
            {badges.length > 0 && (
              <section style={{ background: "white", borderRadius: "20px", padding: "20px", marginBottom: "24px", boxShadow: "0 2px 12px rgba(10,37,64,0.07)" }}>
                <h3 style={{ fontSize: "14px", fontWeight: 800, color: "#0A2540", marginBottom: "4px" }}>
                  🏅 {es ? "Mis Insignias" : "My Badges"}
                </h3>
                <p style={{ fontSize: "12px", color: "#6B7280", marginBottom: "14px" }}>
                  {es ? "Misiones completadas" : "Completed missions"}
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                  {badges.map(b => (
                    <div key={b.mission_id} style={{
                      display: "flex", flexDirection: "column", alignItems: "center", gap: "4px",
                      background: "linear-gradient(135deg, #F0FDF4, #DCFCE7)", border: "1.5px solid #BBF7D0",
                      borderRadius: "14px", padding: "12px 14px", minWidth: "72px",
                    }}>
                      <span style={{ fontSize: "28px" }}>{b.badge_emoji}</span>
                      <span style={{ fontSize: "10px", fontWeight: 700, color: "#046C2C", textAlign: "center", lineHeight: 1.2 }}>
                        {b.title_es}
                      </span>
                    </div>
                  ))}
                  {/* Locked placeholder for next badge */}
                  <div style={{
                    display: "flex", flexDirection: "column", alignItems: "center", gap: "4px",
                    background: "#F9FAFB", border: "1.5px dashed #E5E7EB",
                    borderRadius: "14px", padding: "12px 14px", minWidth: "72px",
                  }}>
                    <span style={{ fontSize: "28px", filter: "grayscale(1)", opacity: 0.35 }}>🏅</span>
                    <span style={{ fontSize: "10px", color: "#D1D5DB", textAlign: "center", lineHeight: 1.2 }}>
                      {es ? "Próxima" : "Next"}
                    </span>
                  </div>
                </div>
              </section>
            )}

            {/* ── E. LEADERBOARD TEASER ── */}
            {leaderboard.length > 0 && (
              <section style={{ background: "white", borderRadius: "20px", padding: "20px", marginBottom: "24px", boxShadow: "0 2px 12px rgba(10,37,64,0.07)" }}>
                <h3 style={{ fontSize: "14px", fontWeight: 800, color: "#0A2540", marginBottom: "14px" }}>
                  🏆 {es ? "Esta semana — Top Usuarios" : "This week — Top Users"}
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {leaderboard.slice(0, 3).map((row, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <span style={{ fontSize: "20px", width: "28px", textAlign: "center" }}>
                        {i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}
                      </span>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: "13px", fontWeight: 700, color: "#0A2540" }}>
                          {row.masked_phone}
                        </span>
                        <span style={{ marginLeft: "8px", fontSize: "11px", color: "#6B7280" }}>
                          {TIER_EMOJI[row.tier]} {row.tier}
                        </span>
                      </div>
                      <span style={{ fontSize: "13px", fontWeight: 800, color: "#1D9E75" }}>
                        {fmtNum(row.points_lifetime)} pts
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

          </>
        )}

        {/* Back to payment */}
        <button
          onClick={() => navigate("/pagar")}
          style={{ width: "100%", padding: "15px", borderRadius: "14px", border: "none", background: "#0A2540", color: "white", fontSize: "15px", fontWeight: 700, cursor: "pointer", marginBottom: "24px" }}
        >
          {es ? "Hacer un pago →" : "Make a payment →"}
        </button>
      </div>
    </div>
  );
}
