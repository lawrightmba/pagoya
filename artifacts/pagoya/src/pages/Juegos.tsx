import { useState, useEffect } from "react";
import { useTrackEvent } from "@/hooks/useTrackEvent";
import { Helmet } from "react-helmet-async";
import { useLocation } from "wouter";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function getPhone(): string {
  try { return localStorage.getItem("pagoya_telefono") ?? ""; } catch { return ""; }
}

interface Prize { type: string; label: string; value: number; }
interface CardState { alreadyPlayed: boolean; zones?: Prize[]; reward?: Prize; playedAt?: string; }
interface Mission {
  mission_id: string; title_es: string; description_es: string; icon: string;
  goal_value: number; reward_points: number; badge_emoji: string | null;
  current_value: number; completed_at: string | null; rewarded_at: string | null; percent: number;
}
interface GrandPrize { month: string; prize_amount: number; total_entries: number; winner: string | null; awarded_at: string | null; }

const EMOJI_MAP: Record<string, string> = { puntos: "⭐", cashback: "💰", nothing: "🌵" };

type Tab = "raspa" | "misiones" | "premio";

export default function Juegos() {
  const track = useTrackEvent();
  const [, navigate] = useLocation();
  const telefono = getPhone();
  const [tab, setTab] = useState<Tab>("raspa");

  // ── Scratch state ──
  const [cardState, setCardState] = useState<CardState | null>(null);
  const [scratched, setScratched] = useState<boolean[]>([false, false, false]);
  const [playing, setPlaying] = useState(false);
  const [revealed, setRevealed] = useState<{ zones: Prize[]; reward: Prize } | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [loadingCard, setLoadingCard] = useState(true);
  const allScratched = scratched.every(Boolean);

  // ── Missions state ──
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loadingMissions, setLoadingMissions] = useState(false);

  // ── Grand prize state ──
  const [grandPrize, setGrandPrize] = useState<GrandPrize | null>(null);
  const [loadingGP, setLoadingGP] = useState(false);

  useEffect(() => {
    if (!telefono) { setLoadingCard(false); return; }
    fetch(`${BASE}/api/games/scratch?telefono=${encodeURIComponent(telefono)}`)
      .then(r => r.json())
      .then(data => { setCardState(data); setLoadingCard(false); })
      .catch(() => setLoadingCard(false));
    track("feature_viewed", { feature: "juegos" });
  }, []);

  useEffect(() => {
    if (tab === "misiones" && missions.length === 0 && telefono) {
      setLoadingMissions(true);
      fetch(`${BASE}/api/games/missions?telefono=${encodeURIComponent(telefono)}`)
        .then(r => r.json())
        .then(data => { setMissions(data.missions ?? []); setLoadingMissions(false); })
        .catch(() => setLoadingMissions(false));
    }
  }, [tab]);

  useEffect(() => {
    if (tab === "premio" && !grandPrize) {
      setLoadingGP(true);
      fetch(`${BASE}/api/games/grand-prize`)
        .then(r => r.json())
        .then(data => { setGrandPrize(data); setLoadingGP(false); })
        .catch(() => setLoadingGP(false));
    }
  }, [tab]);

  async function playCard() {
    if (playing || !telefono) return;
    setPlaying(true);
    try {
      const res = await fetch(`${BASE}/api/games/scratch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telefono }),
      });
      const data = await res.json();
      if (res.ok) {
        setRevealed({ zones: data.zones, reward: data.reward });
        setScratched([false, false, false]);
        track("game_played", { reward_type: data.reward.type, reward_value: data.reward.value });
      }
    } catch {/* silent */}
    setPlaying(false);
  }

  function scratchZone(i: number) {
    if (!revealed) return;
    setScratched(prev => { const n = [...prev]; n[i] = true; return n; });
  }

  useEffect(() => {
    if (allScratched && revealed) setTimeout(() => setShowResult(true), 400);
  }, [allScratched, revealed]);

  const isWin = revealed?.reward && revealed.reward.type !== "nothing" && revealed.reward.value > 0;

  return (
    <div style={{ minHeight: "100vh", background: "#004F2D", paddingBottom: "80px" }}>
      <Helmet><title>Juegos — PagoYa</title></Helmet>

      {/* Header */}
      <div style={{ background: "#005432", padding: "20px 20px 0", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <p style={{ fontSize: "11px", fontWeight: 700, color: "#00C875", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "4px" }}>
          Juega y Gana
        </p>
        <h1 style={{ fontSize: "28px", fontWeight: 900, color: "#FFFFFF", lineHeight: 1, marginBottom: "16px" }}>
          Juegos PagoYa
        </h1>

        {/* Tab bar */}
        <div style={{ display: "flex", gap: "4px" }}>
          {([
            { id: "raspa",    label: "🎟 Raspa" },
            { id: "misiones", label: "🎯 Misiones" },
            { id: "premio",   label: "🏆 Gran Premio" },
          ] as { id: Tab; label: string }[]).map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: "8px 14px",
                borderRadius: "10px 10px 0 0",
                border: "none",
                background: tab === t.id ? "#004F2D" : "transparent",
                color: tab === t.id ? "#00C875" : "rgba(255,255,255,0.5)",
                fontSize: "13px",
                fontWeight: tab === t.id ? 800 : 500,
                cursor: "pointer",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: "24px 20px" }}>

        {/* ── TAB: Raspa y Gana ── */}
        {tab === "raspa" && (
          <>
            {!telefono && <NoPhoneCard />}
            {telefono && loadingCard && <Spinner />}
            {telefono && !loadingCard && cardState?.alreadyPlayed && !revealed && (
              <AlreadyPlayed reward={cardState.reward} playedAt={cardState.playedAt} />
            )}
            {telefono && !loadingCard && !cardState?.alreadyPlayed && !revealed && (
              <FreshCard onPlay={playCard} playing={playing} />
            )}
            {revealed && (
              <ScratchCard
                zones={revealed.zones} scratched={scratched} onScratch={scratchZone}
                allScratched={allScratched} showResult={showResult} isWin={!!isWin} reward={revealed.reward}
              />
            )}
            <HowItWorksCard />
            <CreditScoreNote />
          </>
        )}

        {/* ── TAB: Misiones ── */}
        {tab === "misiones" && (
          <>
            {!telefono && <NoPhoneCard />}
            {telefono && loadingMissions && <Spinner />}
            {telefono && !loadingMissions && (
              <MissionsList missions={missions} onNavigatePay={() => navigate("/pagar")} />
            )}
          </>
        )}

        {/* ── TAB: Gran Premio ── */}
        {tab === "premio" && (
          <>
            {loadingGP && <Spinner />}
            {!loadingGP && grandPrize && <GrandPrizePanel prize={grandPrize} hasEntry={!!telefono} onSpin={() => navigate("/spin")} />}
          </>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div style={{ textAlign: "center", padding: "60px 0" }}>
      <div style={{ width: "36px", height: "36px", border: "3px solid rgba(0,200,117,0.2)", borderTopColor: "#00C875", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto" }} />
    </div>
  );
}

function NoPhoneCard() {
  return (
    <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: "16px", padding: "36px 24px", textAlign: "center" }}>
      <p style={{ fontSize: "44px", marginBottom: "12px" }}>🎟️</p>
      <p style={{ fontSize: "22px", fontWeight: 900, color: "#FFFFFF", marginBottom: "8px" }}>Crea tu cuenta gratis</p>
      <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.55)", marginBottom: "24px" }}>
        Necesitas una cuenta PagoYa para jugar y ganar premios.
      </p>
      <a href="/register" style={{ display: "block", padding: "16px", background: "#00C875", borderRadius: "14px", fontSize: "18px", fontWeight: 900, color: "#004F2D", textDecoration: "none" }}>
        🎲 CREAR CUENTA GRATIS
      </a>
    </div>
  );
}

function FreshCard({ onPlay, playing }: { onPlay: () => void; playing: boolean }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ background: "linear-gradient(135deg, #007A4A 0%, #00C875 100%)", borderRadius: "20px", padding: "36px 24px", marginBottom: "24px", boxShadow: "0 12px 40px rgba(0,200,117,0.3)", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "-20px", right: "-20px", width: "100px", height: "100px", background: "rgba(255,255,255,0.06)", borderRadius: "50%" }} />
        <p style={{ fontSize: "48px", marginBottom: "8px" }}>🎟️</p>
        <p style={{ fontSize: "22px", fontWeight: 900, color: "#FFFFFF", letterSpacing: "0.05em" }}>TU TARJETA DE HOY</p>
        <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.75)", marginTop: "4px" }}>Raspa y descubre tu premio</p>
      </div>
      <button onClick={onPlay} disabled={playing}
        style={{ width: "100%", padding: "18px", background: playing ? "rgba(0,200,117,0.4)" : "#00C875", border: "none", borderRadius: "14px", fontSize: "20px", fontWeight: 900, color: "#004F2D", cursor: playing ? "default" : "pointer", letterSpacing: "0.05em" }}>
        {playing ? "Generando tarjeta..." : "🎲 REVELAR MI TARJETA"}
      </button>
    </div>
  );
}

function ScratchCard({ zones, scratched, onScratch, allScratched, showResult, isWin, reward }: {
  zones: Prize[]; scratched: boolean[]; onScratch: (i: number) => void;
  allScratched: boolean; showResult: boolean; isWin: boolean; reward: Prize;
}) {
  return (
    <div>
      <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.6)", textAlign: "center", marginBottom: "20px" }}>
        {allScratched ? "¡Tarjeta completa!" : "Toca cada zona para raspar"}
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "24px" }}>
        {zones.map((zone, i) => (
          <button key={i} onClick={() => onScratch(i)}
            style={{ aspectRatio: "1", borderRadius: "14px", border: "none", cursor: scratched[i] ? "default" : "pointer", background: scratched[i] ? (zone.type === "nothing" ? "rgba(255,255,255,0.06)" : "rgba(0,200,117,0.15)") : "rgba(255,255,255,0.12)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "4px", position: "relative", overflow: "hidden" }}>
            {!scratched[i] && (
              <div style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(45deg, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 2px, transparent 2px, transparent 8px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: "28px" }}>❓</span>
              </div>
            )}
            {scratched[i] && (
              <>
                <span style={{ fontSize: "28px" }}>{EMOJI_MAP[zone.type] ?? "🎁"}</span>
                <span style={{ fontSize: "10px", fontWeight: 700, color: zone.type === "nothing" ? "rgba(255,255,255,0.35)" : "#00C875", textAlign: "center" }}>{zone.label}</span>
              </>
            )}
          </button>
        ))}
      </div>
      {showResult && (
        <div style={{ background: isWin ? "rgba(0,200,117,0.12)" : "rgba(255,255,255,0.05)", border: `1px solid ${isWin ? "rgba(0,200,117,0.35)" : "rgba(255,255,255,0.1)"}`, borderRadius: "16px", padding: "24px", textAlign: "center" }}>
          <p style={{ fontSize: "44px", marginBottom: "8px" }}>{isWin ? "🎉" : "😢"}</p>
          <p style={{ fontSize: "22px", fontWeight: 900, color: isWin ? "#00C875" : "rgba(255,255,255,0.5)", marginBottom: "6px" }}>
            {isWin ? `¡GANASTE ${reward.label}!` : "¡Suerte mañana!"}
          </p>
          <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)" }}>
            {isWin
              ? reward.type === "cashback" ? "El saldo se agregó a tu billetera." : "Los puntos se agregaron a tu cuenta."
              : "Tu siguiente tarjeta estará lista a medianoche."}
          </p>
        </div>
      )}
    </div>
  );
}

function HowItWorksCard() {
  return (
    <div style={{ marginTop: "28px", background: "rgba(255,255,255,0.04)", borderRadius: "14px", padding: "20px" }}>
      <p style={{ fontSize: "12px", fontWeight: 700, color: "#00C875", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "12px" }}>Cómo funciona</p>
      {[["⭐","Puntos","Acumúlalos en tu cuenta PagoYa"],["💰","Saldo MXN","Se agrega directo a tu billetera"],["🔄","Diario","Nueva tarjeta cada día a medianoche"]].map(([icon, title, desc]) => (
        <div key={title} style={{ display: "flex", gap: "12px", alignItems: "flex-start", marginBottom: "10px" }}>
          <span style={{ fontSize: "18px", flexShrink: 0 }}>{icon}</span>
          <div>
            <p style={{ fontSize: "13px", fontWeight: 700, color: "#FFFFFF", marginBottom: "1px" }}>{title}</p>
            <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)" }}>{desc}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function CreditScoreNote() {
  return (
    <div style={{ marginTop: "16px", background: "rgba(0,200,117,0.07)", borderLeft: "3px solid #00C875", borderRadius: "0 10px 10px 0", padding: "12px 16px" }}>
      <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)", lineHeight: 1.4 }}>
        💡 <strong style={{ color: "#00C875" }}>¿Sabías?</strong> Jugar diariamente y completar misiones mejora tu <strong style={{ color: "#FFFFFF" }}>perfil PagoYa</strong> — que usaremos para ofrecerte adelantos y beneficios exclusivos próximamente.
      </p>
    </div>
  );
}

function MissionsList({ missions, onNavigatePay }: { missions: Mission[]; onNavigatePay: () => void }) {
  if (!missions.length) {
    return (
      <div style={{ textAlign: "center", padding: "40px 0", color: "rgba(255,255,255,0.5)" }}>
        <p style={{ fontSize: "32px", marginBottom: "8px" }}>🎯</p>
        <p>No hay misiones disponibles por ahora.</p>
      </div>
    );
  }

  const completed = missions.filter(m => m.rewarded_at);
  const active = missions.filter(m => !m.rewarded_at);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {/* Active missions */}
      {active.map(m => (
        <div key={m.mission_id} style={{
          background: "rgba(255,255,255,0.06)", borderRadius: "16px", padding: "16px",
          border: m.percent >= 100 ? "1px solid rgba(0,200,117,0.4)" : "1px solid rgba(255,255,255,0.06)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "10px" }}>
            <span style={{ fontSize: "28px", flexShrink: 0 }}>{m.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontWeight: 800, color: "#fff", fontSize: "14px", margin: "0 0 2px" }}>{m.title_es}</p>
              <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", margin: 0 }}>{m.description_es}</p>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <p style={{ fontSize: "13px", fontWeight: 900, color: "#00C875", margin: 0 }}>+{m.reward_points} pts</p>
              <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", margin: 0 }}>{m.current_value}/{m.goal_value}</p>
            </div>
          </div>
          {/* Progress bar */}
          <div style={{ height: "6px", background: "rgba(255,255,255,0.1)", borderRadius: "999px", overflow: "hidden" }}>
            <div style={{ height: "100%", borderRadius: "999px", background: m.percent >= 100 ? "#00C875" : "#1D9E75", width: `${m.percent}%`, transition: "width 0.5s ease" }} />
          </div>
          <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)", margin: "6px 0 0", textAlign: "right" }}>
            {m.percent >= 100 ? "✅ Completada — premiando..." : `${m.percent}% completado`}
          </p>
        </div>
      ))}

      {/* Completed missions */}
      {completed.length > 0 && (
        <>
          <p style={{ fontSize: "11px", fontWeight: 700, color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em", textTransform: "uppercase", margin: "8px 0 0" }}>Misiones completadas</p>
          {completed.map(m => (
            <div key={m.mission_id} style={{ background: "rgba(0,200,117,0.08)", borderRadius: "16px", padding: "14px 16px", border: "1px solid rgba(0,200,117,0.2)", display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ fontSize: "24px" }}>{m.badge_emoji ?? "🏅"}</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 700, color: "#00C875", fontSize: "13px", margin: "0 0 1px" }}>{m.title_es}</p>
                <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.45)", margin: 0 }}>+{m.reward_points} puntos ganados</p>
              </div>
              <span style={{ fontSize: "18px" }}>✅</span>
            </div>
          ))}
        </>
      )}

      <button onClick={onNavigatePay}
        style={{ marginTop: "8px", width: "100%", padding: "16px", background: "#00C875", border: "none", borderRadius: "14px", fontSize: "17px", fontWeight: 900, color: "#004F2D", cursor: "pointer" }}>
        💳 Pagar un servicio →
      </button>
    </div>
  );
}

function GrandPrizePanel({ prize, hasEntry, onSpin }: { prize: GrandPrize; hasEntry: boolean; onSpin: () => void }) {
  const monthNames: Record<string, string> = {
    "01":"Enero","02":"Febrero","03":"Marzo","04":"Abril","05":"Mayo","06":"Junio",
    "07":"Julio","08":"Agosto","09":"Septiembre","10":"Octubre","11":"Noviembre","12":"Diciembre",
  };
  const [, mm] = prize.month.split("-");
  const monthName = monthNames[mm] ?? prize.month;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Prize card */}
      <div style={{ background: "linear-gradient(135deg, #1C0A00, #B45309)", borderRadius: "24px", padding: "32px 24px", textAlign: "center", border: "1px solid rgba(245,158,11,0.3)", boxShadow: "0 0 40px rgba(180,83,9,0.3)" }}>
        <p style={{ fontSize: "56px", marginBottom: "8px" }}>🏆</p>
        <p style={{ fontSize: "14px", fontWeight: 700, color: "#F59E0B", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "4px" }}>Gran Premio Mensual</p>
        <p style={{ fontSize: "44px", fontWeight: 900, color: "#fff", lineHeight: 1, marginBottom: "4px" }}>$2,000</p>
        <p style={{ fontSize: "18px", color: "rgba(255,255,255,0.7)", marginBottom: "16px" }}>MXN en tu monedero PagoYa</p>
        <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)" }}>
          Sorteo: <strong style={{ color: "#F59E0B" }}>1 de {monthName}</strong>
        </p>
      </div>

      {/* Entries counter */}
      <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: "16px", padding: "20px", textAlign: "center" }}>
        <p style={{ fontSize: "12px", fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "8px" }}>Entradas este mes</p>
        <p style={{ fontSize: "40px", fontWeight: 900, color: "#fff", lineHeight: 1, marginBottom: "4px" }}>{prize.total_entries}</p>
        <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.5)" }}>jugadores participando</p>
      </div>

      {/* Winner (if drawn) */}
      {prize.winner && (
        <div style={{ background: "rgba(0,200,117,0.12)", border: "1px solid rgba(0,200,117,0.3)", borderRadius: "16px", padding: "20px", textAlign: "center" }}>
          <p style={{ fontSize: "24px", marginBottom: "8px" }}>🎉</p>
          <p style={{ fontWeight: 800, color: "#00C875", fontSize: "16px", marginBottom: "4px" }}>¡Ganador de {monthName}!</p>
          <p style={{ fontSize: "20px", fontWeight: 900, color: "#fff" }}>{prize.winner}</p>
        </div>
      )}

      {/* How to enter */}
      <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "16px", padding: "20px" }}>
        <p style={{ fontSize: "13px", fontWeight: 800, color: "#fff", marginBottom: "12px" }}>¿Cómo participar?</p>
        {[
          ["🎡", "Gira la ruleta al registrarte — si cae en Gran Premio, tienes una entrada."],
          ["🎟", "Una entrada por cuenta registrada por mes."],
          ["📱", "El ganador se notifica por WhatsApp el 1ro del mes siguiente."],
        ].map(([icon, text]) => (
          <div key={text} style={{ display: "flex", gap: "10px", marginBottom: "10px", alignItems: "flex-start" }}>
            <span style={{ fontSize: "18px", flexShrink: 0 }}>{icon}</span>
            <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.6)", margin: 0, lineHeight: 1.4 }}>{text}</p>
          </div>
        ))}
      </div>

      {!hasEntry && (
        <button onClick={onSpin}
          style={{ width: "100%", padding: "17px", background: "linear-gradient(135deg, #B45309, #F59E0B)", color: "#fff", border: "none", borderRadius: "14px", fontSize: "17px", fontWeight: 900, cursor: "pointer" }}>
          🎡 Girar mi ruleta →
        </button>
      )}
    </div>
  );
}

function useCountdownToMidnight() {
  const [countdown, setCountdown] = useState("");
  useEffect(() => {
    function calc() {
      const now = new Date();
      const midnight = new Date(); midnight.setHours(24, 0, 0, 0);
      const diff = midnight.getTime() - now.getTime();
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1_000);
      setCountdown(`${h}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`);
    }
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, []);
  return countdown;
}

function AlreadyPlayed({ reward, playedAt }: { reward?: Prize; playedAt?: string }) {
  const time = playedAt ? new Date(playedAt).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }) : "";
  const won = reward && reward.type !== "nothing" && reward.value > 0;
  const countdown = useCountdownToMidnight();
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: "20px", padding: "40px 24px", marginBottom: "20px" }}>
        <p style={{ fontSize: "48px", marginBottom: "12px" }}>{won ? "🎉" : "🌵"}</p>
        <p style={{ fontSize: "22px", fontWeight: 900, color: "#FFFFFF", marginBottom: "6px" }}>Ya jugaste hoy</p>
        {time && <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.45)", marginBottom: "12px" }}>Jugaste a las {time}</p>}
        {won && reward && (
          <div style={{ background: "rgba(0,200,117,0.12)", border: "1px solid rgba(0,200,117,0.25)", borderRadius: "10px", padding: "12px 20px", display: "inline-block" }}>
            <p style={{ fontSize: "14px", fontWeight: 700, color: "#00C875" }}>
              {EMOJI_MAP[reward.type]} Ganaste {reward.type === "cashback" ? `$${reward.value} MXN` : `${reward.value} puntos`}
            </p>
          </div>
        )}
      </div>
      <div style={{ background: "rgba(0,200,117,0.07)", border: "1px solid rgba(0,200,117,0.14)", borderRadius: "14px", padding: "18px 20px" }}>
        <p style={{ fontSize: "11px", fontWeight: 700, color: "#00C875", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "6px" }}>Tu próxima tarjeta en</p>
        <p style={{ fontSize: "36px", fontWeight: 900, color: "#FFFFFF", letterSpacing: "0.04em", lineHeight: 1 }}>{countdown || "—"}</p>
        <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.35)", marginTop: "4px" }}>hrs · min · seg</p>
      </div>
    </div>
  );
}
