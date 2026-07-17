import { useState, useEffect, useCallback } from "react";

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

type TimeWindow = "7d" | "30d" | "all";

interface PagoYaStats {
  as_of: string;
  users: { total: number; new_7d: number; new_30d: number; by_source: { whatsapp_organic: number; web_organic: number; rep_referral: number } };
  payments: { completed: number; volume_total: number; revenue_total: number; last_7d: { count: number; volume: number; revenue: number }; last_30d: { count: number; volume: number; revenue: number } };
  wallets: { count: number; balance_total: number };
  pti: { avg_score: number };
  growth: { weekly_signups: { week: string; signups: number }[] };
  top_billers: { service: string; count: number; volume: number; revenue: number }[];
}

interface PageSeguroStats {
  as_of: string;
  users: { total: number; new_7d: number; new_30d: number };
  payments: { completed: number; volume_total: number; revenue_total: number; last_7d: { count: number; volume: number; revenue: number }; last_30d: { count: number; volume: number; revenue: number } };
  growth?: { weekly_signups: { week: string; signups: number }[] };
}

function fmt(n: number | undefined | null, decimals = 0) {
  if (n == null) return "—";
  return n.toLocaleString("es-MX", { maximumFractionDigits: decimals });
}

function fmtMXN(n: number | undefined | null) {
  if (n == null) return "—";
  return `$${n.toLocaleString("es-MX", { maximumFractionDigits: 0 })} MXN`;
}

const CARD = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: "16px",
  padding: "20px",
};

const LABEL: React.CSSProperties = { color: "#64748B", fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "6px" };
const VAL: React.CSSProperties = { color: "white", fontSize: "28px", fontWeight: 900, lineHeight: 1, marginBottom: "4px" };
const SUB: React.CSSProperties = { color: "#94A3B8", fontSize: "12px" };

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div style={{ ...CARD }}>
      <p style={LABEL}>{label}</p>
      <p style={{ ...VAL, color: accent || "white" }}>{value}</p>
      {sub && <p style={SUB}>{sub}</p>}
    </div>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return <h2 style={{ color: "white", fontWeight: 800, fontSize: "16px", margin: "28px 0 12px", letterSpacing: "-0.01em" }}>{children}</h2>;
}

function Badge({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span style={{ background: `${color}22`, color, border: `1px solid ${color}44`, borderRadius: "999px", padding: "2px 10px", fontSize: "11px", fontWeight: 700 }}>
      {children}
    </span>
  );
}

export default function CommandCenter() {
  const [pin, setPin] = useState(() => localStorage.getItem("cc_pin") || "");
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);
  const [psUrl, setPsUrl] = useState(() => localStorage.getItem("cc_ps_url") || "");
  const [psKey, setPsKey] = useState(() => localStorage.getItem("cc_ps_key") || "");
  const [showConfig, setShowConfig] = useState(false);

  const [py, setPy] = useState<PagoYaStats | null>(null);
  const [ps, setPs] = useState<PageSeguroStats | null>(null);
  const [pyErr, setPyErr] = useState("");
  const [psErr, setPsErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);
  const [window_, setWindow_] = useState<TimeWindow>("30d");

  const adminKey = pin;

  const fetchAll = useCallback(async () => {
    if (!adminKey) return;
    setLoading(true);
    setPyErr("");
    setPsErr("");

    // PagoYa
    try {
      const r = await fetch(`${BASE_URL}/api/admin/investor-stats`, {
        headers: { "x-admin-key": adminKey },
      });
      if (!r.ok) throw new Error(`${r.status}`);
      setPy(await r.json());
    } catch (e: unknown) {
      setPyErr(e instanceof Error ? e.message : "Error");
    }

    // PageSeguro — proxied through PagoYa API to avoid CORS
    if (psUrl && psKey) {
      try {
        const params = new URLSearchParams({ url: psUrl, key: psKey });
        const r = await fetch(`${BASE_URL}/api/admin/ps-proxy?${params}`, {
          headers: { "x-admin-key": adminKey },
        });
        if (!r.ok) throw new Error(`${r.status}`);
        setPs(await r.json());
      } catch (e: unknown) {
        setPsErr(e instanceof Error ? e.message : "Error");
      }
    }

    setLoading(false);
    setLastFetch(new Date());
  }, [adminKey, psUrl, psKey]);

  useEffect(() => {
    if (pin) fetchAll();
  }, [pin, fetchAll]);

  function handlePinSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pinInput.trim().length < 4) { setPinError(true); return; }
    localStorage.setItem("cc_pin", pinInput.trim());
    setPin(pinInput.trim());
    setPinError(false);
  }

  function saveConfig() {
    localStorage.setItem("cc_ps_url", psUrl);
    localStorage.setItem("cc_ps_key", psKey);
    setShowConfig(false);
    fetchAll();
  }

  function pyW(field: "count" | "volume" | "revenue") {
    if (!py) return null;
    if (window_ === "7d") return py.payments.last_7d[field];
    if (window_ === "30d") return py.payments.last_30d[field];
    return field === "count" ? py.payments.completed : field === "volume" ? py.payments.volume_total : py.payments.revenue_total;
  }

  function psW(field: "count" | "volume" | "revenue") {
    if (!ps) return null;
    if (window_ === "7d") return ps.payments.last_7d[field];
    if (window_ === "30d") return ps.payments.last_30d[field];
    return field === "count" ? ps.payments.completed : field === "volume" ? ps.payments.volume_total : ps.payments.revenue_total;
  }

  function combinedUsers() {
    const p = window_ === "7d" ? py?.users.new_7d : window_ === "30d" ? py?.users.new_30d : py?.users.total;
    const s = window_ === "7d" ? ps?.users.new_7d : window_ === "30d" ? ps?.users.new_30d : ps?.users.total;
    if (p == null && s == null) return null;
    return (p ?? 0) + (s ?? 0);
  }

  function combinedRevenue() {
    const p = pyW("revenue");
    const s = psW("revenue");
    if (p == null && s == null) return null;
    return (p ?? 0) + (s ?? 0);
  }

  if (!pin) {
    return (
      <div style={{ minHeight: "100vh", background: "#050F1A", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
        <div style={{ maxWidth: 360, width: "100%", textAlign: "center" }}>
          <p style={{ fontSize: "32px", marginBottom: "12px" }}>🔐</p>
          <h1 style={{ color: "white", fontWeight: 900, fontSize: "22px", marginBottom: "8px" }}>Command Center</h1>
          <p style={{ color: "#64748B", fontSize: "14px", marginBottom: "28px" }}>PagoYa + PageSeguro unified dashboard</p>
          <form onSubmit={handlePinSubmit}>
            <input
              type="password"
              placeholder="Admin key"
              value={pinInput}
              onChange={e => setPinInput(e.target.value)}
              style={{ width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.06)", border: `1px solid ${pinError ? "#EF4444" : "rgba(255,255,255,0.15)"}`, borderRadius: "12px", padding: "14px 16px", color: "white", fontSize: "15px", marginBottom: "12px", outline: "none" }}
              autoFocus
            />
            {pinError && <p style={{ color: "#EF4444", fontSize: "13px", marginBottom: "12px" }}>Key too short</p>}
            <button type="submit" style={{ width: "100%", background: "linear-gradient(135deg,#1D9E75,#25C090)", color: "white", border: "none", borderRadius: "12px", padding: "14px", fontWeight: 800, fontSize: "15px", cursor: "pointer" }}>
              Enter →
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#050F1A", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", paddingBottom: "60px" }}>

      {/* Top bar */}
      <div style={{ background: "rgba(5,15,26,0.96)", borderBottom: "1px solid rgba(255,255,255,0.08)", padding: "12px 24px", display: "flex", alignItems: "center", gap: "12px", position: "sticky", top: 0, zIndex: 50, backdropFilter: "blur(10px)" }}>
        <span style={{ color: "white", fontWeight: 900, fontSize: "15px" }}>Command Center</span>
        <span style={{ flex: 1 }} />
        {lastFetch && <span style={{ color: "#475569", fontSize: "12px" }}>Updated {lastFetch.toLocaleTimeString()}</span>}
        <button onClick={() => setShowConfig(true)} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "8px", color: "#94A3B8", padding: "6px 12px", fontSize: "12px", cursor: "pointer" }}>⚙ Config</button>
        <button onClick={fetchAll} disabled={loading} style={{ background: loading ? "rgba(29,158,117,0.3)" : "#1D9E75", color: "white", border: "none", borderRadius: "8px", padding: "6px 14px", fontWeight: 700, fontSize: "12px", cursor: loading ? "default" : "pointer" }}>
          {loading ? "..." : "↻ Refresh"}
        </button>
      </div>

      {/* Config modal */}
      {showConfig && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
          <div style={{ background: "#0D1F2D", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "20px", padding: "28px", maxWidth: "440px", width: "100%" }}>
            <h2 style={{ color: "white", fontWeight: 800, marginBottom: "20px" }}>PageSeguro Connection</h2>
            <p style={{ color: "#94A3B8", fontSize: "13px", marginBottom: "16px" }}>The PageSeguro API must expose <code style={{ color: "#6EF5B0" }}>/api/admin/investor-stats</code> returning the standard stats shape. See the agent prompt for setup instructions.</p>
            <label style={{ ...LABEL, display: "block", marginBottom: "6px" }}>PageSeguro production URL</label>
            <input value={psUrl} onChange={e => setPsUrl(e.target.value)} placeholder="https://pageseguro.replit.app" style={{ width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "10px", padding: "10px 14px", color: "white", fontSize: "14px", marginBottom: "14px", outline: "none" }} />
            <label style={{ ...LABEL, display: "block", marginBottom: "6px" }}>PageSeguro admin key</label>
            <input type="password" value={psKey} onChange={e => setPsKey(e.target.value)} placeholder="Admin token" style={{ width: "100%", boxSizing: "border-box", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "10px", padding: "10px 14px", color: "white", fontSize: "14px", marginBottom: "20px", outline: "none" }} />
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={saveConfig} style={{ flex: 1, background: "#1D9E75", color: "white", border: "none", borderRadius: "10px", padding: "12px", fontWeight: 700, cursor: "pointer" }}>Save & Connect</button>
              <button onClick={() => setShowConfig(false)} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "10px", padding: "12px 20px", color: "#94A3B8", cursor: "pointer" }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ maxWidth: "960px", margin: "0 auto", padding: "24px 24px 0" }}>

        {/* Time window toggle */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "24px" }}>
          {(["7d","30d","all"] as TimeWindow[]).map(w => (
            <button key={w} onClick={() => setWindow_(w)} style={{ background: window_ === w ? "#1D9E75" : "rgba(255,255,255,0.05)", color: window_ === w ? "white" : "#64748B", border: `1px solid ${window_ === w ? "#1D9E75" : "rgba(255,255,255,0.1)"}`, borderRadius: "8px", padding: "6px 16px", fontWeight: 700, fontSize: "13px", cursor: "pointer" }}>
              {w === "7d" ? "7 days" : w === "30d" ? "30 days" : "All time"}
            </button>
          ))}
        </div>

        {/* Combined totals */}
        <SectionHeader>Combined — Both Products</SectionHeader>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: "12px", marginBottom: "8px" }}>
          <StatCard label={`Total Users (${window_})`} value={combinedUsers() != null ? fmt(combinedUsers()!) : "—"} sub="PagoYa + PageSeguro" accent="#6EF5B0" />
          <StatCard label={`Revenue (${window_})`} value={combinedRevenue() != null ? fmtMXN(combinedRevenue()!) : "—"} sub="Combined fee revenue" accent="#FBBF24" />
          <StatCard label={`Payments (${window_})`} value={((pyW("count") ?? 0) + (psW("count") ?? 0)) > 0 ? fmt((pyW("count") ?? 0) + (psW("count") ?? 0)) : "—"} sub="Total transactions" />
          <StatCard label={`Volume (${window_})`} value={fmtMXN((pyW("volume") ?? 0) + (psW("volume") ?? 0))} sub="Total MXN processed" />
        </div>

        {/* PagoYa column */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginTop: "24px" }}>

          {/* PagoYa */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
              <span style={{ fontSize: "18px" }}>🇲🇽</span>
              <h2 style={{ color: "white", fontWeight: 900, fontSize: "16px", margin: 0 }}>PagoYa</h2>
              {py && <Badge color="#1D9E75">Live</Badge>}
              {pyErr && <Badge color="#EF4444">Error {pyErr}</Badge>}
              {!py && !pyErr && !loading && <Badge color="#64748B">—</Badge>}
            </div>
            {py ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <StatCard label="Total Users" value={fmt(py.users.total)} sub={`+${fmt(py.users.new_7d)} this week · +${fmt(py.users.new_30d)} this month`} />
                <StatCard label={`Payments (${window_})`} value={fmt(pyW("count"))} sub={`Volume: ${fmtMXN(pyW("volume"))}`} />
                <StatCard label={`Revenue (${window_})`} value={fmtMXN(pyW("revenue"))} accent="#FBBF24" />
                <StatCard label="Wallet Balance" value={fmtMXN(py.wallets.balance_total)} sub={`${fmt(py.wallets.count)} active wallets`} />
                <StatCard label="Avg PTI Score" value={py.pti.avg_score ? py.pti.avg_score.toFixed(1) : "—"} sub="Predictive Trust Index" />
                <div style={{ ...CARD }}>
                  <p style={LABEL}>Signups by Source</p>
                  {[
                    { label: "WhatsApp organic", value: py.users.by_source.whatsapp_organic },
                    { label: "Web organic", value: py.users.by_source.web_organic },
                    { label: "Rep referral", value: py.users.by_source.rep_referral },
                  ].map(row => (
                    <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                      <span style={{ color: "#94A3B8", fontSize: "13px" }}>{row.label}</span>
                      <span style={{ color: "white", fontWeight: 700, fontSize: "13px" }}>{fmt(row.value)}</span>
                    </div>
                  ))}
                </div>
                {py.top_billers.length > 0 && (
                  <div style={{ ...CARD }}>
                    <p style={LABEL}>Top Billers</p>
                    {py.top_billers.map(b => (
                      <div key={b.service} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                        <span style={{ color: "#94A3B8", fontSize: "13px", maxWidth: "60%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.service}</span>
                        <span style={{ color: "white", fontWeight: 700, fontSize: "13px" }}>{fmt(b.count)} txns</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ ...CARD, textAlign: "center", padding: "40px 20px" }}>
                <p style={{ color: "#475569", fontSize: "14px" }}>{loading ? "Loading…" : pyErr ? `Error: ${pyErr}` : "No data"}</p>
              </div>
            )}
          </div>

          {/* PageSeguro */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
              <span style={{ fontSize: "18px" }}>🔒</span>
              <h2 style={{ color: "white", fontWeight: 900, fontSize: "16px", margin: 0 }}>PageSeguro</h2>
              {ps && <Badge color="#3B82F6">Live</Badge>}
              {psErr && <Badge color="#EF4444">Error {psErr}</Badge>}
              {!ps && !psErr && !psUrl && <Badge color="#64748B">Not configured</Badge>}
              {!ps && !psErr && psUrl && !loading && <Badge color="#F59E0B">No data</Badge>}
            </div>
            {!psUrl ? (
              <div style={{ ...CARD, textAlign: "center", padding: "40px 20px" }}>
                <p style={{ fontSize: "28px", marginBottom: "10px" }}>🔌</p>
                <p style={{ color: "#94A3B8", fontSize: "14px", marginBottom: "16px" }}>Connect PageSeguro to see stats here</p>
                <button onClick={() => setShowConfig(true)} style={{ background: "#3B82F6", color: "white", border: "none", borderRadius: "10px", padding: "10px 20px", fontWeight: 700, fontSize: "13px", cursor: "pointer" }}>
                  Configure →
                </button>
                <p style={{ color: "#475569", fontSize: "12px", marginTop: "12px" }}>
                  The PageSeguro agent must expose<br /><code style={{ color: "#6EF5B0" }}>/api/admin/investor-stats</code><br />See agent prompt below.
                </p>
              </div>
            ) : ps ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <StatCard label="Total Users" value={fmt(ps.users.total)} sub={`+${fmt(ps.users.new_7d)} this week · +${fmt(ps.users.new_30d)} this month`} />
                <StatCard label={`Payments (${window_})`} value={fmt(psW("count"))} sub={`Volume: ${fmtMXN(psW("volume"))}`} />
                <StatCard label={`Revenue (${window_})`} value={fmtMXN(psW("revenue"))} accent="#FBBF24" />
              </div>
            ) : (
              <div style={{ ...CARD, textAlign: "center", padding: "40px 20px" }}>
                <p style={{ color: "#475569", fontSize: "14px" }}>{loading ? "Loading…" : psErr ? `Error: ${psErr}` : "Configured but no data yet"}</p>
              </div>
            )}
          </div>
        </div>

        {/* Weekly signups sparkline */}
        {py?.growth?.weekly_signups && py.growth.weekly_signups.length > 0 && (
          <div style={{ marginTop: "28px" }}>
            <SectionHeader>PagoYa — Weekly Signups (12 weeks)</SectionHeader>
            <div style={{ ...CARD }}>
              <div style={{ display: "flex", alignItems: "flex-end", gap: "6px", height: "80px" }}>
                {py.growth.weekly_signups.map(w => {
                  const max = Math.max(...py.growth.weekly_signups.map(x => x.signups), 1);
                  const h = Math.max((w.signups / max) * 72, 4);
                  return (
                    <div key={w.week} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                      <span style={{ color: "#94A3B8", fontSize: "9px" }}>{w.signups}</span>
                      <div style={{ width: "100%", height: `${h}px`, background: "linear-gradient(180deg,#1D9E75,#25C090)", borderRadius: "3px 3px 0 0" }} />
                    </div>
                  );
                })}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px" }}>
                <span style={{ color: "#475569", fontSize: "10px" }}>{py.growth.weekly_signups[0]?.week?.slice(0, 10)}</span>
                <span style={{ color: "#475569", fontSize: "10px" }}>{py.growth.weekly_signups[py.growth.weekly_signups.length - 1]?.week?.slice(0, 10)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Agent prompt card */}
        <SectionHeader>PageSeguro Agent Setup</SectionHeader>
        <div style={{ ...CARD, background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.2)" }}>
          <p style={{ color: "#93C5FD", fontWeight: 700, fontSize: "13px", marginBottom: "10px" }}>Copy this prompt into the PageSeguro Replit agent to wire up the stats endpoint:</p>
          <pre style={{ color: "#CBD5E1", fontSize: "12px", lineHeight: 1.7, whiteSpace: "pre-wrap", background: "rgba(0,0,0,0.3)", borderRadius: "10px", padding: "16px", margin: 0, overflowX: "auto" }}>
{`Add a read-only stats endpoint to this project so it can connect to
a unified Command Center dashboard.

ENDPOINT TO CREATE
  GET /api/admin/investor-stats
  Protected by: x-admin-key header (or ?adminKey= query param)
    — use the same admin token pattern already in this project.
    — if no admin auth exists yet, check the PRODUCTION_ADMIN_TOKEN
      or SANDBOX_ADMIN_TOKEN environment secret and validate against it.

REQUIRED RESPONSE SHAPE (JSON)
{
  "as_of": "<ISO timestamp>",
  "users": {
    "total":   <int — all non-test users>,
    "new_7d":  <int — signups in last 7 days>,
    "new_30d": <int — signups in last 30 days>
  },
  "payments": {
    "completed":    <int — all successful payments>,
    "volume_total": <float — sum of payment amounts, MXN>,
    "revenue_total":<float — sum of platform fees, MXN>,
    "last_7d":  { "count": <int>, "volume": <float>, "revenue": <float> },
    "last_30d": { "count": <int>, "volume": <float>, "revenue": <float> }
  }
}

OPTIONAL (include if the data exists)
  "growth": { "weekly_signups": [{ "week": "YYYY-MM-DD", "signups": <int> }] }

NOTES
- Return 0s for any fields where data doesn't exist yet, never null.
- Set Cache-Control: no-store on the response.
- The endpoint must be reachable from external origins (CORS: allow all,
  or at minimum allow the PagoYa origin).
- Add the route alongside any existing /api/admin/* routes.
- Do not expose any user PII, phone numbers, or payment details.
- Test locally with:
    curl -H "x-admin-key: YOUR_TOKEN" http://localhost:PORT/api/admin/investor-stats`}
          </pre>
        </div>

        {py?.as_of && (
          <p style={{ color: "#334155", fontSize: "11px", textAlign: "center", marginTop: "24px" }}>
            PagoYa data as of {new Date(py.as_of).toLocaleString()}
            {ps?.as_of && ` · PageSeguro data as of ${new Date(ps.as_of).toLocaleString()}`}
          </p>
        )}
      </div>
    </div>
  );
}
