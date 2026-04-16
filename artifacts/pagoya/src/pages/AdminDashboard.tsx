import { useState, useEffect } from "react";

interface RepRow {
  id: string;
  name: string;
  phone: string;
  billPayCount: number;
  billPayTotal: string;
  billPayPending: string;
  signupCount: number;
  signupTotal: string;
  referralCount: number;
  referralTotal: string;
}

export default function AdminDashboard() {
  const [reps, setReps] = useState<RepRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/bills/admin/reps")
      .then((r) => {
        if (!r.ok) throw new Error(`Error ${r.status}`);
        return r.json();
      })
      .then((d: { reps: RepRow[] }) => {
        setReps(d.reps);
        setLoading(false);
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : "Error desconocido");
        setLoading(false);
      });
  }, []);

  const fmt = (n: string) =>
    "$" + parseFloat(n).toLocaleString("es-MX", { minimumFractionDigits: 2 });

  const totalBillPayTx = reps.reduce((s, r) => s + r.billPayCount, 0);
  const totalBillPayMXN = reps.reduce((s, r) => s + parseFloat(r.billPayTotal), 0);
  const totalPending = reps.reduce((s, r) => s + parseFloat(r.billPayPending), 0);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0A2540",
      color: "#e8f0f7",
      fontFamily: "'Inter', 'Syne', sans-serif",
      padding: "24px 16px 48px",
    }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: "0.6rem", letterSpacing: "0.1em", color: "#39A935", fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>
            PagoYa · Admin
          </div>
          <div style={{ fontSize: "1.4rem", fontWeight: 800, letterSpacing: "-0.02em" }}>
            Rep Commission Center
          </div>
          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.6rem", color: "#5a7080", marginTop: 4 }}>
            Comisiones de pagos de servicios · $5.00 MXN por transacción · 7 días retención
          </div>
        </div>

        {/* Summary strip */}
        {!loading && !error && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 24 }}>
            {[
              { label: "Total Transacciones Bill Pay", value: String(totalBillPayTx), color: "#39A935" },
              { label: "Total Comisiones Pagadas", value: fmt(totalBillPayMXN.toFixed(2)), color: "#6366F1" },
              { label: "En Espera (7-día hold)", value: fmt(totalPending.toFixed(2)), color: "#F59E0B" },
            ].map((card) => (
              <div key={card.label} style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 12,
                padding: "14px 10px",
                textAlign: "center",
              }}>
                <div style={{ fontSize: "1.1rem", fontWeight: 800, color: card.color, marginBottom: 4 }}>
                  {card.value}
                </div>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.46rem", color: "#5a7080", lineHeight: 1.4, textTransform: "uppercase" }}>
                  {card.label}
                </div>
              </div>
            ))}
          </div>
        )}

        {loading && (
          <div style={{ textAlign: "center", color: "#5a7080", fontFamily: "'Space Mono', monospace", fontSize: "0.75rem", padding: "40px 0" }}>
            Cargando reps…
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
          }}>
            {error}
          </div>
        )}

        {!loading && !error && reps.length === 0 && (
          <div style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 14,
            padding: "32px 20px",
            textAlign: "center",
          }}>
            <div style={{ fontSize: "1.5rem", marginBottom: 10 }}>🔓</div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.65rem", color: "#5a7080", lineHeight: 1.6 }}>
              Sin reps registrados aún.<br />
              Inserta un rep en la tabla <code>reps</code> para comenzar.
            </div>
          </div>
        )}

        {reps.length > 0 && (
          <div style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 14,
            overflow: "hidden",
          }}>
            <div style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: "0.52rem",
              letterSpacing: "0.08em",
              color: "#5a7080",
              padding: "12px 16px 10px",
              borderBottom: "1px solid rgba(255,255,255,0.07)",
              textTransform: "uppercase",
            }}>
              Reps · Detalle de Comisiones
            </div>

            {/* Table header */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 80px 80px 80px 80px 80px 64px",
              gap: 0,
              padding: "8px 16px",
              borderBottom: "1px solid rgba(255,255,255,0.05)",
            }}>
              {["REP", "SIGNUP", "REFERRAL", "BILL PAY", "EN ESPERA", "TOTAL", ""].map((h) => (
                <div key={h} style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.44rem", color: "#5a7080", letterSpacing: "0.06em" }}>
                  {h}
                </div>
              ))}
            </div>

            {/* Rep rows */}
            {reps.map((rep) => (
              <div key={rep.id} style={{
                display: "grid",
                gridTemplateColumns: "1fr 80px 80px 80px 80px 80px 64px",
                gap: 0,
                padding: "12px 16px",
                borderBottom: "1px solid rgba(255,255,255,0.04)",
                alignItems: "center",
              }}>
                <div>
                  <div style={{ fontSize: "0.78rem", fontWeight: 700 }}>{rep.name || rep.id}</div>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.5rem", color: "#5a7080" }}>
                    {rep.id} · {rep.phone}
                  </div>
                </div>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.58rem", color: "#e8f0f7" }}>
                  <div style={{ fontWeight: 700 }}>{rep.signupCount}</div>
                  <div style={{ color: "#5a7080", fontSize: "0.48rem" }}>{fmt(rep.signupTotal)}</div>
                </div>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.58rem", color: "#e8f0f7" }}>
                  <div style={{ fontWeight: 700 }}>{rep.referralCount}</div>
                  <div style={{ color: "#5a7080", fontSize: "0.48rem" }}>{fmt(rep.referralTotal)}</div>
                </div>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.58rem", color: "#39A935" }}>
                  <div style={{ fontWeight: 700 }}>{rep.billPayCount}</div>
                  <div style={{ color: "#5a7080", fontSize: "0.48rem" }}>{fmt(rep.billPayTotal)}</div>
                </div>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.58rem", color: "#F59E0B" }}>
                  {fmt(rep.billPayPending)}
                </div>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.62rem", fontWeight: 700, color: "#e8f0f7" }}>
                  {fmt((
                    parseFloat(rep.signupTotal) +
                    parseFloat(rep.referralTotal) +
                    parseFloat(rep.billPayTotal)
                  ).toFixed(2))}
                </div>
                <div>
                  <a
                    href={`/rep-dashboard?repId=${encodeURIComponent(rep.id)}`}
                    style={{
                      fontFamily: "'Space Mono', monospace",
                      fontSize: "0.48rem",
                      color: "#39A935",
                      textDecoration: "none",
                      padding: "3px 8px",
                      border: "1px solid rgba(57,169,53,0.3)",
                      borderRadius: 20,
                      whiteSpace: "nowrap",
                    }}
                  >
                    → Ver
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
