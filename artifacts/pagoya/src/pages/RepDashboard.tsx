import { useState, useEffect } from "react";

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

export default function RepDashboard() {
  const params = new URLSearchParams(window.location.search);
  const repId = params.get("repId") || "";

  const [data, setData] = useState<RepData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!repId) {
      setError("Falta el parámetro repId en la URL (ej: /rep-dashboard?repId=REP001)");
      setLoading(false);
      return;
    }
    fetch(`/api/bills/reps/${encodeURIComponent(repId)}/commissions`)
      .then((r) => {
        if (!r.ok) throw new Error(`Error ${r.status}`);
        return r.json();
      })
      .then((d: RepData) => { setData(d); setLoading(false); })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : "Error desconocido");
        setLoading(false);
      });
  }, [repId]);

  const fmt = (n: string) =>
    "$" + parseFloat(n).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const fmtDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0A2540",
      color: "#e8f0f7",
      fontFamily: "'Inter', 'Syne', sans-serif",
      padding: "24px 16px 48px",
    }}>
      <div style={{ maxWidth: 600, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <div style={{ fontSize: "1.4rem" }}>⚡</div>
            <div>
              <div style={{ fontSize: "0.65rem", letterSpacing: "0.1em", color: "#39A935", fontWeight: 700, textTransform: "uppercase" }}>
                PagoYa · Rep Dashboard
              </div>
              <div style={{ fontSize: "1.25rem", fontWeight: 800, letterSpacing: "-0.02em" }}>
                Mis Comisiones
              </div>
            </div>
          </div>
          {repId && (
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.6rem", color: "#5a7080" }}>
              REP ID: {repId}
            </div>
          )}
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
            {/* Summary cards */}
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

            {/* Info row */}
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

            {/* Pagos de Servicios section */}
            <div style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 14,
              padding: 16,
            }}>
              <div style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: "0.55rem",
                letterSpacing: "0.08em",
                color: "#5a7080",
                marginBottom: 14,
                textTransform: "uppercase",
              }}>
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
