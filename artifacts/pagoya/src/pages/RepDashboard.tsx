import { useState, useEffect, useCallback } from "react";

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

interface CommissionSummary {
  lifetimeTotal: string;
  pendingTotal: string;
  paidTotal: string;
  totalTransactions: number;
  currency: string;
}

interface RecentPayment {
  id: number;
  serviceName: string;
  monto: string;
  status: string;
  createdAt: string;
  commissionAmount: string;
}

interface RepData {
  repId: string;
  summary: CommissionSummary;
  recentPayments: RecentPayment[];
}

interface RepMe {
  id: string;
  name: string;
  email: string;
  repCode: string | null;
  status: string;
}

interface RecruitmentStats {
  referidos: number;
  bonos_acreditados: number;
  valor_total: number;
  converted_count: number;
}

export default function RepDashboard() {
  const [me, setMe] = useState<RepMe | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [data, setData] = useState<RepData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [stats, setStats] = useState<RecruitmentStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const [copied, setCopied] = useState(false);

  const [calcVecinos, setCalcVecinos] = useState(10);
  const [calcRecargas, setCalcRecargas] = useState(3);
  const [calcFacturas, setCalcFacturas] = useState(1);

  // ── Auth check on mount ───────────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem("rep_token");
    if (!token) {
      window.location.href = `${BASE_URL}/rep-login`;
      return;
    }
    fetch(`${BASE_URL}/api/reps/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (r.status === 401) {
          localStorage.removeItem("rep_token");
          localStorage.removeItem("rep_id");
          window.location.href = `${BASE_URL}/rep-login`;
          return null;
        }
        return r.json();
      })
      .then((d: RepMe | null) => {
        if (d) { setMe(d); }
        setAuthChecked(true);
      })
      .catch(() => {
        window.location.href = `${BASE_URL}/rep-login`;
      });
  }, []);

  // ── Fetch commissions once auth is confirmed ──────────────────────────────
  useEffect(() => {
    if (!me) return;
    fetch(`${BASE_URL}/api/bills/reps/${encodeURIComponent(me.id)}/commissions`)
      .then((r) => {
        if (!r.ok) throw new Error(`Error ${r.status}`);
        return r.json();
      })
      .then((d: RepData) => { setData(d); setLoading(false); })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : "Error desconocido");
        setLoading(false);
      });
  }, [me]);

  // ── Fetch recruitment stats once rep_code is known ────────────────────────
  useEffect(() => {
    if (!me?.repCode) return;
    setStatsLoading(true);
    fetch(`${BASE_URL}/api/street-team/rep-recruitment-stats?repCode=${encodeURIComponent(me.repCode)}`)
      .then((r) => r.json())
      .then((d: RecruitmentStats) => { setStats(d); setStatsLoading(false); })
      .catch(() => { setStatsLoading(false); });
  }, [me?.repCode]);

  const handleCopy = useCallback(() => {
    if (!me?.repCode) return;
    const signupUrl = `${window.location.origin}${BASE_URL}/register?ref=${me.repCode}`;
    navigator.clipboard.writeText(signupUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [me?.repCode]);

  const handleLogout = () => {
    localStorage.removeItem("rep_token");
    localStorage.removeItem("rep_id");
    window.location.href = `${BASE_URL}/rep-login`;
  };

  const fmt = (n: string | number) =>
    "$" + parseFloat(String(n)).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const fmtDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
  };

  const signupUrl = me?.repCode
    ? `${window.location.origin}${BASE_URL}/register?ref=${me.repCode}`
    : null;

  const qrUrl = signupUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(signupUrl)}`
    : null;

  const cardStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 14,
    padding: 16,
  };

  const sectionLabelStyle: React.CSSProperties = {
    fontFamily: "'Space Mono', monospace",
    fontSize: "0.55rem",
    letterSpacing: "0.08em",
    color: "#5a7080",
    marginBottom: 14,
    textTransform: "uppercase",
  };

  const outlineBtnStyle: React.CSSProperties = {
    background: "transparent",
    border: "1px solid rgba(255,255,255,0.18)",
    borderRadius: 8,
    color: "#e8f0f7",
    fontFamily: "'Space Mono', monospace",
    fontSize: "0.58rem",
    padding: "7px 12px",
    cursor: "pointer",
    whiteSpace: "nowrap",
    minHeight: 36,
    flexShrink: 0,
  };

  if (!authChecked) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "#0A2540",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Space Mono', monospace",
        fontSize: "0.7rem",
        color: "#5a7080",
      }}>
        Verificando sesión…
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0A2540",
      color: "#e8f0f7",
      fontFamily: "'Inter', 'Syne', sans-serif",
      padding: "24px 16px 48px",
    }}>
      <div style={{ maxWidth: 600, margin: "0 auto" }}>

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ fontSize: "1.4rem" }}>⚡</div>
              <div>
                <div style={{ fontSize: "0.65rem", letterSpacing: "0.1em", color: "#39A935", fontWeight: 700, textTransform: "uppercase" }}>
                  PagoYa · Rep Portal
                </div>
                <div style={{ fontSize: "1.25rem", fontWeight: 800, letterSpacing: "-0.02em" }}>
                  {me?.name ?? "Mis Comisiones"}
                </div>
                {me?.repCode && (
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.55rem", color: "#5a7080", marginTop: 2 }}>
                    CÓDIGO: {me.repCode}
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={handleLogout}
              style={{
                ...outlineBtnStyle,
                borderColor: "rgba(255,255,255,0.1)",
                color: "#5a7080",
                fontSize: "0.5rem",
                padding: "6px 10px",
                marginTop: 4,
              }}
            >
              Cerrar sesión
            </button>
          </div>
        </div>

        {loading && (
          <div style={{ textAlign: "center", color: "#5a7080", fontFamily: "'Space Mono', monospace", fontSize: "0.75rem", padding: "40px 0" }}>
            Cargando comisiones…
          </div>
        )}

        {error && (
          <div style={{
            background: "rgba(232,42,10,0.12)",
            border: "1px solid rgba(232,42,10,0.3)",
            borderRadius: 10,
            padding: "14px 16px",
            fontFamily: "'Space Mono', monospace",
            fontSize: "0.65rem",
            color: "#E21A0A",
            lineHeight: 1.6,
          }}>
            {error}
          </div>
        )}

        {data && (
          <>
            {/* ── Summary cards ─────────────────────────────────────────── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 24 }}>
              {[
                { label: "Total Ganado", value: fmt(data.summary.lifetimeTotal), color: "#39A935" },
                { label: "En Espera", value: fmt(data.summary.pendingTotal), color: "#F59E0B" },
                { label: "Pagado", value: fmt(data.summary.paidTotal), color: "#6366F1" },
              ].map((card) => (
                <div key={card.label} style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 12,
                  padding: "14px 10px",
                  textAlign: "center",
                }}>
                  <div style={{ fontSize: "1rem", fontWeight: 800, color: card.color, marginBottom: 4 }}>
                    {card.value}
                  </div>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.48rem", color: "#5a7080", lineHeight: 1.4 }}>
                    {card.label}
                  </div>
                </div>
              ))}
            </div>

            {/* ── Commission rate bar ───────────────────────────────────── */}
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              background: "rgba(57,169,53,0.08)",
              border: "1px solid rgba(57,169,53,0.2)",
              borderRadius: 10,
              padding: "10px 14px",
              marginBottom: 24,
            }}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.58rem", color: "#39A935" }}>
                $5.00 MXN por pago confirmado
              </div>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.58rem", color: "#5a7080" }}>
                Retención 7 días
              </div>
            </div>

            {/* ── INCOME CALCULATOR ────────────────────────────────────── */}
            {(() => {
              const COMMISSION = 5;
              const totalPagos = calcVecinos * (calcRecargas + calcFacturas);
              const monthly = totalPagos * COMMISSION;
              const annual = monthly * 12;

              const sliderStyle: React.CSSProperties = {
                width: "100%",
                accentColor: "#39A935",
                cursor: "pointer",
              };
              const labelRowStyle: React.CSSProperties = {
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 6,
              };
              const sliderLabelStyle: React.CSSProperties = {
                fontFamily: "'Space Mono', monospace",
                fontSize: "0.55rem",
                color: "#a0b4c4",
              };
              const sliderValueStyle: React.CSSProperties = {
                fontFamily: "'Space Mono', monospace",
                fontSize: "0.62rem",
                fontWeight: 700,
                color: "#39A935",
              };

              return (
                <div style={{ ...cardStyle, marginBottom: 24 }}>
                  <div style={sectionLabelStyle}>💰 Calculadora de Ingresos</div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 18, marginBottom: 22 }}>
                    <div>
                      <div style={labelRowStyle}>
                        <span style={sliderLabelStyle}>Vecinos registrados 👥</span>
                        <span style={sliderValueStyle}>{calcVecinos}</span>
                      </div>
                      <input type="range" min={1} max={50} value={calcVecinos}
                        onChange={e => setCalcVecinos(Number(e.target.value))}
                        style={sliderStyle} />
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ ...sliderLabelStyle, color: "#3a5060" }}>1</span>
                        <span style={{ ...sliderLabelStyle, color: "#3a5060" }}>50</span>
                      </div>
                    </div>

                    <div>
                      <div style={labelRowStyle}>
                        <span style={sliderLabelStyle}>Recargas / persona / mes 📱</span>
                        <span style={sliderValueStyle}>{calcRecargas}×</span>
                      </div>
                      <input type="range" min={0} max={8} value={calcRecargas}
                        onChange={e => setCalcRecargas(Number(e.target.value))}
                        style={sliderStyle} />
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ ...sliderLabelStyle, color: "#3a5060" }}>0</span>
                        <span style={{ ...sliderLabelStyle, color: "#3a5060" }}>8</span>
                      </div>
                    </div>

                    <div>
                      <div style={labelRowStyle}>
                        <span style={sliderLabelStyle}>Facturas / persona / mes 🧾</span>
                        <span style={sliderValueStyle}>{calcFacturas}×</span>
                      </div>
                      <input type="range" min={0} max={4} value={calcFacturas}
                        onChange={e => setCalcFacturas(Number(e.target.value))}
                        style={sliderStyle} />
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ ...sliderLabelStyle, color: "#3a5060" }}>0</span>
                        <span style={{ ...sliderLabelStyle, color: "#3a5060" }}>4</span>
                      </div>
                    </div>
                  </div>

                  <div style={{
                    background: "rgba(57,169,53,0.07)",
                    border: "1px solid rgba(57,169,53,0.2)",
                    borderRadius: 12,
                    padding: "16px 14px",
                    marginBottom: 14,
                  }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                      {[
                        { label: "Total pagos/mes", value: String(totalPagos), color: "#a0b4c4", big: false },
                        { label: "Ingreso mensual", value: `$${monthly.toLocaleString("es-MX")} MXN`, color: "#39A935", big: true },
                        { label: "Ingreso anual", value: `$${annual.toLocaleString("es-MX")} MXN`, color: "#F59E0B", big: false },
                      ].map(c => (
                        <div key={c.label} style={{ textAlign: "center" }}>
                          <div style={{
                            fontFamily: "'Space Mono', monospace",
                            fontSize: c.big ? "1.05rem" : "0.78rem",
                            fontWeight: 800,
                            color: c.color,
                            marginBottom: 4,
                            lineHeight: 1.1,
                          }}>{c.value}</div>
                          <div style={{
                            fontFamily: "'Space Mono', monospace",
                            fontSize: "0.44rem",
                            color: "#5a7080",
                            textTransform: "uppercase",
                            letterSpacing: "0.06em",
                          }}>{c.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: "0.5rem",
                    color: "#3a5060",
                    lineHeight: 1.7,
                    borderTop: "1px solid rgba(255,255,255,0.05)",
                    paddingTop: 12,
                  }}>
                    {calcVecinos} vecinos × ({calcRecargas} recargas + {calcFacturas} facturas) = {totalPagos} pagos × $5 MXN = <span style={{ color: "#39A935", fontWeight: 700 }}>${monthly.toLocaleString("es-MX")} MXN/mes</span>
                  </div>
                </div>
              );
            })()}

            {/* ── RECRUITMENT SECTION ───────────────────────────────────── */}
            <div style={{ ...cardStyle, marginBottom: 24 }}>
              <div style={sectionLabelStyle}>Tu Enlace de Reclutamiento</div>

              {!me?.repCode ? (
                <div style={{
                  background: "rgba(245,158,11,0.1)",
                  border: "1px solid rgba(245,158,11,0.25)",
                  borderRadius: 8,
                  padding: "12px 14px",
                  fontFamily: "'Space Mono', monospace",
                  fontSize: "0.62rem",
                  color: "#F59E0B",
                  lineHeight: 1.6,
                }}>
                  Tu código de referido aún no está configurado. Contacta al administrador.
                </div>
              ) : (
                <>
                  {/* 1. Signup link box */}
                  <div style={{ marginBottom: 20 }}>
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 10,
                      padding: "10px 12px",
                    }}>
                      <div style={{
                        flex: 1,
                        fontFamily: "'Space Mono', monospace",
                        fontSize: "0.6rem",
                        color: "#a0b4c4",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        minWidth: 0,
                      }}>
                        {signupUrl}
                      </div>
                      <button
                        onClick={handleCopy}
                        style={{
                          ...outlineBtnStyle,
                          borderColor: copied ? "rgba(57,169,53,0.5)" : "rgba(255,255,255,0.18)",
                          color: copied ? "#39A935" : "#e8f0f7",
                        }}
                      >
                        {copied ? "¡Copiado! ✓" : "Copiar enlace"}
                      </button>
                    </div>
                  </div>

                  {/* 2. QR code */}
                  <div style={{ textAlign: "center", marginBottom: 20 }}>
                    <div style={{
                      display: "inline-block",
                      background: "#FFFFFF",
                      borderRadius: 12,
                      padding: 12,
                      marginBottom: 8,
                    }}>
                      <img
                        src={qrUrl!}
                        alt="Código QR de registro"
                        width={200}
                        height={200}
                        style={{ display: "block" }}
                      />
                    </div>
                    <div style={{
                      fontFamily: "'Space Mono', monospace",
                      fontSize: "0.55rem",
                      color: "#5a7080",
                      marginBottom: 10,
                    }}>
                      Escanea para registrarte
                    </div>
                    <button
                      onClick={() => window.open(qrUrl!, "_blank", "noopener,noreferrer")}
                      style={outlineBtnStyle}
                    >
                      Descargar QR
                    </button>
                  </div>

                  {/* 3. Recruitment stats — 4 cards */}
                  <div style={{
                    borderTop: "1px solid rgba(255,255,255,0.07)",
                    paddingTop: 16,
                  }}>
                    {statsLoading ? (
                      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.55rem", color: "#5a7080", textAlign: "center" }}>
                        Cargando estadísticas…
                      </div>
                    ) : (
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8 }}>
                        {[
                          { label: "Referidos", value: stats?.referidos ?? 0, color: "#39A935", isCount: true },
                          { label: "Convertidos", value: stats?.converted_count ?? 0, color: "#6366F1", isCount: true },
                          { label: "Bonos Dados", value: stats?.bonos_acreditados ?? 0, color: "#F59E0B", isCount: true },
                          { label: "Valor Total", value: stats?.valor_total ?? 0, color: "#a0b4c4", isCount: false },
                        ].map((card) => (
                          <div key={card.label} style={{
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            borderRadius: 12,
                            padding: "12px 8px",
                            textAlign: "center",
                          }}>
                            <div style={{ fontSize: "0.95rem", fontWeight: 800, color: card.color, marginBottom: 4 }}>
                              {card.isCount
                                ? String(card.value)
                                : fmt(card.value)
                              }
                            </div>
                            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.42rem", color: "#5a7080", lineHeight: 1.4 }}>
                              {card.label}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* ── Transaction list ──────────────────────────────────────── */}
            <div style={cardStyle}>
              <div style={sectionLabelStyle}>
                Pagos de Servicios — Últimas 10 transacciones
              </div>

              {data.recentPayments.length === 0 ? (
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.62rem", color: "#5a7080", padding: "12px 0", textAlign: "center" }}>
                  Sin pagos atribuidos aún
                </div>
              ) : (
                data.recentPayments.map((p) => (
                  <div key={p.id} style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "10px 0",
                    borderBottom: "1px solid rgba(255,255,255,0.06)",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: "rgba(57,169,53,0.12)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "0.85rem",
                        flexShrink: 0,
                      }}>⚡</div>
                      <div>
                        <div style={{ fontSize: "0.78rem", fontWeight: 700, marginBottom: 2 }}>
                          {p.serviceName}
                        </div>
                        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.5rem", color: "#5a7080" }}>
                          {fmtDate(p.createdAt)} · {p.status === "confirmed" ? "✓ Confirmado" : p.status}
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.72rem", fontWeight: 700, color: "#e8f0f7", marginBottom: 2 }}>
                        {fmt(p.monto)}
                      </div>
                      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.5rem", color: "#39A935" }}>
                        +{fmt(p.commissionAmount)} comisión
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
