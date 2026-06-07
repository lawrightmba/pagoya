import { useState, useEffect, useRef } from "react";
import { useTrackEvent } from "@/hooks/useTrackEvent";
import { Helmet } from "react-helmet-async";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

function getPhone(): string {
  try { return localStorage.getItem("pagoya_telefono") ?? ""; } catch { return ""; }
}

interface Prize {
  type: string;
  label: string;
  value: number;
}

interface CardState {
  alreadyPlayed: boolean;
  zones?: Prize[];
  reward?: Prize;
  playedAt?: string;
}

const EMOJI_MAP: Record<string, string> = {
  puntos:   "⭐",
  cashback: "💰",
  nothing:  "🌵",
};

export default function Juegos() {
  const track = useTrackEvent();
  const telefono = getPhone();

  const [cardState, setCardState] = useState<CardState | null>(null);
  const [scratched, setScratched] = useState<boolean[]>([false, false, false]);
  const [playing, setPlaying] = useState(false);
  const [revealed, setRevealed] = useState<{ zones: Prize[]; reward: Prize } | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [loading, setLoading] = useState(true);
  const allScratched = scratched.every(Boolean);

  useEffect(() => {
    if (!telefono) { setLoading(false); return; }
    fetch(`${BASE}/api/games/scratch?telefono=${encodeURIComponent(telefono)}`)
      .then(r => r.json())
      .then(data => { setCardState(data); setLoading(false); })
      .catch(() => setLoading(false));
    track("feature_viewed", { feature: "juegos" });
  }, []);

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
    setScratched(prev => {
      const next = [...prev];
      next[i] = true;
      return next;
    });
  }

  useEffect(() => {
    if (allScratched && revealed) {
      setTimeout(() => setShowResult(true), 400);
    }
  }, [allScratched, revealed]);

  const isWin = revealed?.reward && revealed.reward.type !== "nothing" && revealed.reward.value > 0;

  return (
    <div style={{ minHeight: "100vh", background: "#004F2D", paddingBottom: "80px" }}>
      <Helmet><title>Juegos — PagoYa</title></Helmet>

      {/* Header */}
      <div style={{ background: "#005432", padding: "20px 20px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "11px", fontWeight: 700, color: "#00C875", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "4px" }}>
          Juega y Gana
        </p>
        <h1 style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "28px", fontWeight: 900, color: "#FFFFFF", lineHeight: 1 }}>
          Raspa y Gana
        </h1>
        <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "13px", color: "rgba(255,255,255,0.55)", marginTop: "4px" }}>
          Una tarjeta gratis cada día. Raspa las tres zonas.
        </p>
      </div>

      <div style={{ padding: "24px 20px" }}>

        {!telefono && (
          <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: "16px", padding: "32px 20px", textAlign: "center" }}>
            <p style={{ fontSize: "40px", marginBottom: "12px" }}>🔒</p>
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "15px", color: "rgba(255,255,255,0.7)" }}>
              Inicia sesión para jugar
            </p>
          </div>
        )}

        {telefono && loading && (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <div style={{ width: "36px", height: "36px", border: "3px solid rgba(0,200,117,0.2)", borderTopColor: "#00C875", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto" }} />
          </div>
        )}

        {telefono && !loading && cardState?.alreadyPlayed && !revealed && (
          <AlreadyPlayed reward={cardState.reward} playedAt={cardState.playedAt} />
        )}

        {telefono && !loading && !cardState?.alreadyPlayed && !revealed && (
          <FreshCard onPlay={playCard} playing={playing} />
        )}

        {revealed && (
          <ScratchCard
            zones={revealed.zones}
            scratched={scratched}
            onScratch={scratchZone}
            allScratched={allScratched}
            showResult={showResult}
            isWin={!!isWin}
            reward={revealed.reward}
          />
        )}

        {/* How it works */}
        <div style={{ marginTop: "28px", background: "rgba(255,255,255,0.04)", borderRadius: "14px", padding: "20px" }}>
          <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "12px", fontWeight: 700, color: "#00C875", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "12px" }}>
            Cómo funciona
          </p>
          {[
            ["⭐", "Puntos", "Acumúlalos en tu cuenta PagoYa"],
            ["💰", "Saldo MXN", "Se agrega directo a tu billetera"],
            ["🔄", "Diario", "Nueva tarjeta cada día a medianoche"],
          ].map(([icon, title, desc]) => (
            <div key={title} style={{ display: "flex", gap: "12px", alignItems: "flex-start", marginBottom: "10px" }}>
              <span style={{ fontSize: "18px", flexShrink: 0 }}>{icon}</span>
              <div>
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "13px", fontWeight: 700, color: "#FFFFFF", marginBottom: "1px" }}>{title}</p>
                <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "12px", color: "rgba(255,255,255,0.5)" }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Credit score note */}
        <div style={{ marginTop: "16px", background: "rgba(0,200,117,0.07)", borderLeft: "3px solid #00C875", borderRadius: "0 10px 10px 0", padding: "12px 16px" }}>
          <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "12px", color: "rgba(255,255,255,0.6)", lineHeight: 1.4 }}>
            💡 <strong style={{ color: "#00C875" }}>¿Sabías?</strong> Jugar diariamente mejora tu <strong style={{ color: "#FFFFFF" }}>perfil PagoYa</strong> — que usaremos para ofrecerte adelantos y beneficios exclusivos próximamente.
          </p>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function FreshCard({ onPlay, playing }: { onPlay: () => void; playing: boolean }) {
  return (
    <div style={{ textAlign: "center" }}>
      {/* Card visual */}
      <div style={{ background: "linear-gradient(135deg, #007A4A 0%, #00C875 100%)", borderRadius: "20px", padding: "36px 24px", marginBottom: "24px", boxShadow: "0 12px 40px rgba(0,200,117,0.3)", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "-20px", right: "-20px", width: "100px", height: "100px", background: "rgba(255,255,255,0.06)", borderRadius: "50%" }} />
        <div style={{ position: "absolute", bottom: "-30px", left: "-10px", width: "80px", height: "80px", background: "rgba(255,255,255,0.04)", borderRadius: "50%" }} />
        <p style={{ fontSize: "48px", marginBottom: "8px" }}>🎟️</p>
        <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "22px", fontWeight: 900, color: "#FFFFFF", letterSpacing: "0.05em" }}>
          TU TARJETA DE HOY
        </p>
        <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "13px", color: "rgba(255,255,255,0.75)", marginTop: "4px" }}>
          Raspa y descubre tu premio
        </p>
      </div>

      <button
        onClick={onPlay}
        disabled={playing}
        style={{ width: "100%", padding: "18px", background: playing ? "rgba(0,200,117,0.4)" : "#00C875", border: "none", borderRadius: "14px", fontFamily: "Barlow Condensed, sans-serif", fontSize: "20px", fontWeight: 900, color: "#004F2D", cursor: playing ? "default" : "pointer", letterSpacing: "0.05em", transition: "opacity 0.2s" }}
      >
        {playing ? "Generando tarjeta..." : "🎲 REVELAR MI TARJETA"}
      </button>
    </div>
  );
}

function ScratchCard({ zones, scratched, onScratch, allScratched, showResult, isWin, reward }: {
  zones: Prize[];
  scratched: boolean[];
  onScratch: (i: number) => void;
  allScratched: boolean;
  showResult: boolean;
  isWin: boolean;
  reward: Prize;
}) {
  return (
    <div>
      <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "14px", color: "rgba(255,255,255,0.6)", textAlign: "center", marginBottom: "20px" }}>
        {allScratched ? "¡Tarjeta completa!" : "Toca cada zona para raspar"}
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "24px" }}>
        {zones.map((zone, i) => (
          <button
            key={i}
            onClick={() => onScratch(i)}
            style={{ aspectRatio: "1", borderRadius: "14px", border: "none", cursor: scratched[i] ? "default" : "pointer", background: scratched[i] ? (zone.type === "nothing" ? "rgba(255,255,255,0.06)" : "rgba(0,200,117,0.15)") : "rgba(255,255,255,0.12)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "4px", transition: "all 0.3s", transform: scratched[i] ? "scale(1)" : "scale(1)", position: "relative", overflow: "hidden" }}
          >
            {!scratched[i] && (
              <div style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(45deg, rgba(255,255,255,0.06) 0px, rgba(255,255,255,0.06) 2px, transparent 2px, transparent 8px)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: "28px" }}>❓</span>
              </div>
            )}
            {scratched[i] && (
              <>
                <span style={{ fontSize: "28px" }}>{EMOJI_MAP[zone.type] ?? "🎁"}</span>
                <span style={{ fontFamily: "DM Sans, sans-serif", fontSize: "10px", fontWeight: 700, color: zone.type === "nothing" ? "rgba(255,255,255,0.35)" : "#00C875", textAlign: "center", lineHeight: 1.2 }}>
                  {zone.label}
                </span>
              </>
            )}
          </button>
        ))}
      </div>

      {showResult && (
        <div style={{ background: isWin ? "rgba(0,200,117,0.12)" : "rgba(255,255,255,0.05)", border: `1px solid ${isWin ? "rgba(0,200,117,0.35)" : "rgba(255,255,255,0.1)"}`, borderRadius: "16px", padding: "24px", textAlign: "center" }}>
          <p style={{ fontSize: "44px", marginBottom: "8px" }}>{isWin ? "🎉" : "😢"}</p>
          <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "22px", fontWeight: 900, color: isWin ? "#00C875" : "rgba(255,255,255,0.5)", marginBottom: "6px" }}>
            {isWin ? `¡GANASTE ${reward.label}!` : "¡Suerte mañana!"}
          </p>
          <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "13px", color: "rgba(255,255,255,0.5)" }}>
            {isWin
              ? reward.type === "cashback" ? "El saldo se agregó a tu billetera." : "Los puntos se agregaron a tu cuenta."
              : "Tu siguiente tarjeta estará lista a medianoche."}
          </p>
        </div>
      )}
    </div>
  );
}

function AlreadyPlayed({ reward, playedAt }: { reward?: Prize; playedAt?: string }) {
  const time = playedAt ? new Date(playedAt).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }) : "";
  const won = reward && reward.type !== "nothing" && reward.value > 0;
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: "20px", padding: "40px 24px", marginBottom: "20px" }}>
        <p style={{ fontSize: "48px", marginBottom: "12px" }}>{won ? "🎉" : "🌵"}</p>
        <p style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "22px", fontWeight: 900, color: "#FFFFFF", marginBottom: "6px" }}>
          Ya jugaste hoy
        </p>
        {time && (
          <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "13px", color: "rgba(255,255,255,0.45)", marginBottom: "12px" }}>
            Jugaste a las {time}
          </p>
        )}
        {won && reward && (
          <div style={{ background: "rgba(0,200,117,0.12)", border: "1px solid rgba(0,200,117,0.25)", borderRadius: "10px", padding: "12px 20px", display: "inline-block" }}>
            <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "14px", fontWeight: 700, color: "#00C875" }}>
              {EMOJI_MAP[reward.type]} Ganaste {reward.type === "cashback" ? `$${reward.value} MXN` : `${reward.value} puntos`}
            </p>
          </div>
        )}
      </div>
      <div style={{ background: "rgba(0,200,117,0.07)", borderRadius: "12px", padding: "14px 20px" }}>
        <p style={{ fontFamily: "DM Sans, sans-serif", fontSize: "13px", color: "rgba(255,255,255,0.55)" }}>
          🕛 Nueva tarjeta disponible a medianoche
        </p>
      </div>
    </div>
  );
}
