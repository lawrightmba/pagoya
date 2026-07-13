import { useEffect } from "react";

export default function PTIOnePager() {
  useEffect(() => {
    document.title = "PTI — Predictive Trust Index | PagoYa";
  }, []);

  const dims = [
    {
      code: "PR",
      pct: "30%",
      label: "Payment Reliability",
      color: "#00C875",
      signals: ["On-time rate & streaks", "Missed payment frequency", "Recovery speed after miss", "Service priority order"],
    },
    {
      code: "BC",
      pct: "20%",
      label: "Behavioral Consistency",
      color: "#FF5C1A",
      signals: ["Payment timing variance", "Channel consistency", "Day-of-month patterns", "Seasonal stability"],
    },
    {
      code: "ED",
      pct: "25%",
      label: "Engagement Depth",
      color: "#00C875",
      signals: ["Platform breadth (services paid)", "Financial literacy modules", "AI coach interaction rate", "Session frequency trends"],
    },
    {
      code: "CF",
      pct: "25%",
      label: "Cashflow Stability",
      color: "#FF5C1A",
      signals: ["Load frequency & size", "Balance volatility", "Spending velocity", "OXXO vs SPEI ratio"],
    },
  ];

  const buyers = [
    { label: "SOFOMs & Microfinanzas", desc: "Underwrite thin-file borrowers without bureau history" },
    { label: "Aseguradoras", desc: "Price micro-insurance risk on informal workers" },
    { label: "Neobancos", desc: "Qualify users for credit lines from day one" },
    { label: "Proptech / Arrendadoras", desc: "Tenant screening without formal payslips" },
  ];

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: "#f5f5f0", minHeight: "100vh", padding: "0" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;900&family=DM+Sans:wght@400;500;600&display=swap');
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
          .page { box-shadow: none !important; max-width: 100% !important; margin: 0 !important; }
        }
      `}</style>

      <div
        className="page"
        style={{
          maxWidth: 900,
          margin: "0 auto",
          background: "#fff",
          boxShadow: "0 4px 40px rgba(0,0,0,0.10)",
        }}
      >
        {/* Header */}
        <div style={{ background: "#004F2D", padding: "36px 48px 28px", position: "relative" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 24 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <span style={{ color: "#00C875", fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 13, letterSpacing: 3, textTransform: "uppercase" }}>
                  PagoYa · Data Products
                </span>
              </div>
              <h1 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 52, color: "#fff", margin: 0, lineHeight: 1, letterSpacing: -1 }}>
                Predictive Trust Index
              </h1>
              <p style={{ color: "#a8d5be", fontSize: 16, margin: "10px 0 0", lineHeight: 1.5, maxWidth: 520 }}>
                A behavioral credit score for the 65 million Mexicans invisible to traditional bureaus. Built from real payment behavior — no bank account required.
              </p>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 64, color: "#00C875", lineHeight: 1 }}>PTI</div>
              <div style={{ color: "#a8d5be", fontSize: 12, letterSpacing: 1 }}>v5.0 · July 2026</div>
            </div>
          </div>

          {/* Stat bar */}
          <div style={{ display: "flex", gap: 0, marginTop: 28, borderTop: "1px solid rgba(255,255,255,0.15)", paddingTop: 20 }}>
            {[
              { n: "90+", l: "Behavioral Signals" },
              { n: "300–850", l: "Score Range" },
              { n: "4", l: "Dimensions" },
              { n: "✓", l: "Fair-Lending Certified" },
              { n: "API", l: "B2B Delivery" },
            ].map((s, i) => (
              <div key={i} style={{ flex: 1, borderLeft: i > 0 ? "1px solid rgba(255,255,255,0.12)" : "none", paddingLeft: i > 0 ? 20 : 0 }}>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 26, color: "#fff" }}>{s.n}</div>
                <div style={{ color: "#a8d5be", fontSize: 11, letterSpacing: 0.5, marginTop: 2 }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: "36px 48px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>

          {/* Left col */}
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

            {/* What makes it different */}
            <div>
              <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 20, color: "#004F2D", textTransform: "uppercase", letterSpacing: 1, margin: "0 0 10px" }}>
                What It Measures
              </h2>
              <p style={{ color: "#444", fontSize: 13.5, lineHeight: 1.65, margin: 0 }}>
                PTI scores are derived entirely from payment transaction behavior — CFE, Telmex, streaming, cash loads, SPEI transfers, and AI coach engagement via WhatsApp. Every interaction generates a signal. No loan history. No credit card. No bank statement.
              </p>
            </div>

            {/* 4 dims */}
            <div>
              <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 20, color: "#004F2D", textTransform: "uppercase", letterSpacing: 1, margin: "0 0 12px" }}>
                The 4 Dimensions
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {dims.map((d) => (
                  <div key={d.code} style={{ border: "1px solid #e8e8e8", borderRadius: 8, padding: "12px 14px", borderLeft: `4px solid ${d.color}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                      <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 15, color: "#004F2D" }}>
                        {d.code} — {d.label}
                      </span>
                      <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 18, color: d.color }}>{d.pct}</span>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "3px 10px" }}>
                      {d.signals.map((s) => (
                        <span key={s} style={{ color: "#666", fontSize: 11.5 }}>· {s}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right col */}
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

            {/* Vs bureau */}
            <div>
              <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 20, color: "#004F2D", textTransform: "uppercase", letterSpacing: 1, margin: "0 0 12px" }}>
                PTI vs. Traditional Bureau
              </h2>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                <thead>
                  <tr style={{ background: "#f0f7f3" }}>
                    <th style={{ padding: "8px 10px", textAlign: "left", color: "#004F2D", fontWeight: 600 }}></th>
                    <th style={{ padding: "8px 10px", textAlign: "center", color: "#888", fontWeight: 600 }}>Buró</th>
                    <th style={{ padding: "8px 10px", textAlign: "center", color: "#004F2D", fontWeight: 700 }}>PTI</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["Requires credit history", "✓", "✗"],
                    ["Requires bank account", "✓", "✗"],
                    ["Covers informal workers", "✗", "✓"],
                    ["Updates in real-time", "✗", "✓"],
                    ["Behavioral signals", "✗", "✓"],
                    ["Fair-lending certified", "—", "✓"],
                  ].map(([label, bureau, pti], i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #f0f0f0", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                      <td style={{ padding: "7px 10px", color: "#444" }}>{label}</td>
                      <td style={{ padding: "7px 10px", textAlign: "center", color: bureau === "✓" ? "#444" : "#bbb" }}>{bureau}</td>
                      <td style={{ padding: "7px 10px", textAlign: "center", color: pti === "✓" ? "#00C875" : "#FF5C1A", fontWeight: 700 }}>{pti}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Who buys */}
            <div>
              <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 20, color: "#004F2D", textTransform: "uppercase", letterSpacing: 1, margin: "0 0 12px" }}>
                Who Buys PTI Data
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {buyers.map((b) => (
                  <div key={b.label} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <span style={{ color: "#00C875", fontWeight: 700, fontSize: 14, marginTop: 1 }}>→</span>
                    <div>
                      <span style={{ fontWeight: 600, color: "#004F2D", fontSize: 13 }}>{b.label}</span>
                      <span style={{ color: "#666", fontSize: 12.5 }}> — {b.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* The moat */}
            <div style={{ background: "#004F2D", borderRadius: 8, padding: "16px 18px" }}>
              <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 16, color: "#00C875", textTransform: "uppercase", letterSpacing: 1, margin: "0 0 8px" }}>
                The Moat
              </h2>
              <p style={{ color: "#d0e8da", fontSize: 12.5, lineHeight: 1.6, margin: 0 }}>
                PTI runs on PagoYa's proprietary payment transaction log — every CFE bill, Telmex payment, and OXXO load is a signal. That dataset takes years to accumulate. No competitor can replicate it in 18 months. The model improves with every transaction.
              </p>
            </div>

            {/* Access */}
            <div style={{ border: "1.5px solid #00C875", borderRadius: 8, padding: "14px 18px" }}>
              <h2 style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 16, color: "#004F2D", textTransform: "uppercase", letterSpacing: 1, margin: "0 0 6px" }}>
                API Access
              </h2>
              <p style={{ color: "#444", fontSize: 12.5, lineHeight: 1.6, margin: "0 0 10px" }}>
                Query PTI scores for individual users or in batch. Response includes score (300–850), dimensional breakdown, signal summary, and model version. HTTPS · JSON · OAuth 2.0.
              </p>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, fontSize: 13, color: "#004F2D" }}>
                B2B partnerships: lloyd@pagoyamx.com
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ background: "#f0f7f3", borderTop: "1px solid #d4ead9", padding: "16px 48px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, fontSize: 18, color: "#004F2D" }}>
            PagoYa · <span style={{ color: "#00C875" }}>pagoyamx.com</span>
          </div>
          <div style={{ color: "#888", fontSize: 12 }}>
            PTI v5.0 · Fair-lending certified July 2026 · Confidential
          </div>
          <button
            className="no-print"
            onClick={() => window.print()}
            style={{ background: "#004F2D", color: "#fff", border: "none", borderRadius: 6, padding: "8px 18px", fontFamily: "'DM Sans', sans-serif", fontWeight: 600, fontSize: 13, cursor: "pointer" }}
          >
            Save as PDF
          </button>
        </div>
      </div>
    </div>
  );
}
