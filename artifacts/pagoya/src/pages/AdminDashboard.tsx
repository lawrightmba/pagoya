import { useState, useEffect, useCallback } from "react";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

interface ColoniaRow { colonia: string; count: number; pct: number; }
interface ColoniaBreakdown { total: number; breakdown: ColoniaRow[]; }

interface TxRow {
  id: string;
  type: string;
  amount: string;
  description: string;
  balanceAfter: string;
  createdAt: string;
}
interface UserDetail {
  id: number;
  name: string;
  phone: string;
  colonia: string | null;
}
interface UserTransactions { user: UserDetail; transactions: TxRow[]; }

interface WalletStats {
  walletCount: number;
  totalBalanceMXN: number;
  pendingLoads: { count: number; amountMXN: number };
  confirmedLoads: { count: number; amountMXN: number };
  failedLoads: { count: number };
}

interface RevenueData {
  today: number;
  thisMonth: number;
  allTime: number;
  transactionCount: { today: number; thisMonth: number; allTime: number };
  avgFeePerTransaction: number;
  projectedMonthlyRevenue: number;
}

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

interface KitResult {
  repCode: string;
  referralLink: string;
  name: string;
  email: string;
  initialPassword: string;
}

interface WeeklySignup { week: string; signups: number; }
interface TopBiller { service: string; count: number; volume: number; revenue: number; }
interface InvestorMetrics {
  as_of: string;
  users: {
    total: number;
    new_7d: number;
    new_30d: number;
    with_name: number;
    by_source: { whatsapp_organic: number; web_organic: number; rep_referral: number };
  };
  payments: {
    completed: number;
    volume_total: number;
    revenue_total: number;
    last_7d: { count: number; volume: number; revenue: number };
    last_30d: { count: number; volume: number; revenue: number };
  };
  wallets: { count: number; balance_total: number };
  pti: { avg_score: number };
  growth: { weekly_signups: WeeklySignup[] };
  top_billers: TopBiller[];
}

const COLONIAS = [
  "Emiliano Zapata",
  "Versalles",
  "5 de Diciembre",
  "Pitillal",
  "Fluvial Vallarta",
  "Las Juntas / La Mojonera",
  "Zona Romántica",
  "Marina Vallarta",
  "Otra / Other",
];

export default function AdminDashboard() {
  const [reps, setReps] = useState<RepRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [wallet, setWallet] = useState<WalletStats | null>(null);
  const [walletLoading, setWalletLoading] = useState(true);
  const [revenue, setRevenue] = useState<RevenueData | null>(null);
  const [revenueLoading, setRevenueLoading] = useState(true);

  const [colonia, setColonia] = useState<ColoniaBreakdown | null>(null);
  const [coloniaLoading, setColoniaLoading] = useState(true);

  const [userPhone, setUserPhone] = useState("");
  const [userTxData, setUserTxData] = useState<UserTransactions | null>(null);
  const [userTxLoading, setUserTxLoading] = useState(false);
  const [userTxError, setUserTxError] = useState("");

  const [kitOpen, setKitOpen] = useState(false);
  const [kitName, setKitName] = useState("");
  const [kitPhone, setKitPhone] = useState("");
  const [kitColonia, setKitColonia] = useState(COLONIAS[0]);
  const [kitLoading, setKitLoading] = useState(false);
  const [kitError, setKitError] = useState("");
  const [kitResult, setKitResult] = useState<KitResult | null>(null);

  const [creditPhone, setCreditPhone] = useState("");
  const [creditAmount, setCreditAmount] = useState("");
  const [creditNote, setCreditNote] = useState("");
  const [creditToken, setCreditToken] = useState(() => localStorage.getItem("pagoya_admin_token") ?? "");
  const [creditLoading, setCreditLoading] = useState(false);
  const [creditError, setCreditError] = useState("");
  const [creditResult, setCreditResult] = useState<{ phone: string; credited: number; newBalanceMXN: number; transactionId: string } | null>(null);

  const [tab, setTab] = useState<"investor" | "ops">("investor");
  const [investorData, setInvestorData] = useState<InvestorMetrics | null>(null);
  const [investorLoading, setInvestorLoading] = useState(true);
  const [investorError, setInvestorError] = useState("");
  const [adminKey, setAdminKey] = useState(() => localStorage.getItem("pagoya_admin_key") ?? "");

  const loadInvestorMetrics = useCallback(() => {
    if (!adminKey.trim()) return;
    setInvestorLoading(true);
    setInvestorError("");
    fetch(`${window.location.origin}/api/admin/investor-stats?adminKey=${encodeURIComponent(adminKey.trim())}`)
      .then((r) => { if (!r.ok) throw new Error(`${r.status}`); return r.json(); })
      .then((d: InvestorMetrics) => { setInvestorData(d); setInvestorLoading(false); })
      .catch((e: unknown) => {
        setInvestorError(e instanceof Error ? e.message : "Error");
        setInvestorLoading(false);
      });
  }, [adminKey]);

  const loadWallet = useCallback(() => {
    setWalletLoading(true);
    fetch(`${window.location.origin}/api/wallet/admin/stats`)
      .then((r) => r.json())
      .then((d: WalletStats) => { setWallet(d); setWalletLoading(false); })
      .catch(() => setWalletLoading(false));
  }, []);

  const loadRevenue = useCallback(() => {
    setRevenueLoading(true);
    fetch(`${window.location.origin}/api/bills/admin/revenue`)
      .then((r) => r.json())
      .then((d: RevenueData) => { setRevenue(d); setRevenueLoading(false); })
      .catch(() => setRevenueLoading(false));
  }, []);

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
    loadWallet();
    loadRevenue();
    setColoniaLoading(true);
    fetch("/api/bills/admin/colonia-breakdown")
      .then((r) => r.json())
      .then((d: ColoniaBreakdown) => { setColonia(d); setColoniaLoading(false); })
      .catch(() => setColoniaLoading(false));

    const interval = setInterval(() => {
      loadWallet();
      loadRevenue();
    }, 30000);
    return () => clearInterval(interval);
  }, [loadWallet, loadRevenue]);

  useEffect(() => {
    loadInvestorMetrics();
    const iv = setInterval(loadInvestorMetrics, 60000);
    return () => clearInterval(iv);
  }, [loadInvestorMetrics]);

  async function lookupUser() {
    if (!userPhone.trim()) return;
    setUserTxLoading(true);
    setUserTxError("");
    setUserTxData(null);
    try {
      const r = await fetch(`/api/bills/admin/user-transactions?phone=${encodeURIComponent(userPhone.trim())}`);
      const data = await r.json() as UserTransactions & { error?: string };
      if (!r.ok) {
        setUserTxError(data.error ?? "Error al buscar usuario.");
        return;
      }
      setUserTxData(data);
    } catch {
      setUserTxError("Error de red. Intenta de nuevo.");
    } finally {
      setUserTxLoading(false);
    }
  }

  const fmt = (n: string) =>
    "$" + parseFloat(n).toLocaleString("es-MX", { minimumFractionDigits: 2 });

  const totalBillPayTx = reps.reduce((s, r) => s + r.billPayCount, 0);
  const totalBillPayMXN = reps.reduce((s, r) => s + parseFloat(r.billPayTotal), 0);
  const totalPending = reps.reduce((s, r) => s + parseFloat(r.billPayPending), 0);

  async function handleCreditSubmit() {
    setCreditError("");
    setCreditResult(null);
    const amount = parseFloat(creditAmount);
    if (!creditPhone.trim()) { setCreditError("Ingresa el teléfono de destino."); return; }
    if (!amount || amount <= 0) { setCreditError("Ingresa un monto válido."); return; }
    if (!creditToken.trim()) { setCreditError("Ingresa el Admin Token."); return; }
    setCreditLoading(true);
    localStorage.setItem("pagoya_admin_token", creditToken.trim());
    try {
      const r = await fetch(`${window.location.origin}/api/wallet/admin/credit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Token": creditToken.trim(),
        },
        body: JSON.stringify({
          phone: creditPhone.trim(),
          amountMXN: amount,
          note: creditNote.trim() || undefined,
        }),
      });
      const data = await r.json() as { success?: boolean; phone?: string; credited?: number; newBalanceMXN?: number; transactionId?: string; error?: string };
      if (!r.ok) { setCreditError(data.error ?? "Error al acreditar."); return; }
      setCreditResult({ phone: data.phone!, credited: data.credited!, newBalanceMXN: data.newBalanceMXN!, transactionId: data.transactionId! });
      setCreditPhone("");
      setCreditAmount("");
      setCreditNote("");
      loadWallet();
    } catch {
      setCreditError("Error de red. Intenta de nuevo.");
    } finally {
      setCreditLoading(false);
    }
  }

  async function handleKitSubmit() {
    if (!kitName.trim() || !kitPhone.trim()) {
      setKitError("Ingresa nombre y teléfono.");
      return;
    }
    setKitLoading(true);
    setKitError("");
    try {
      const r = await fetch("/api/reps/admin/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: kitName.trim(), phone: kitPhone.trim(), colonia: kitColonia }),
      });
      const data = await r.json() as KitResult & { error?: string };
      if (!r.ok) {
        setKitError(data.error ?? "Error al crear el rep.");
        return;
      }
      setKitResult(data);
      setKitName("");
      setKitPhone("");
      setKitColonia(COLONIAS[0]);
      setReps((prev) => [...prev, {
        id: data.repCode,
        name: data.name,
        phone: kitPhone.trim(),
        billPayCount: 0, billPayTotal: "0.00", billPayPending: "0.00",
        signupCount: 0, signupTotal: "0.00",
        referralCount: 0, referralTotal: "0.00",
      }]);
    } catch {
      setKitError("Error de red. Intenta de nuevo.");
    } finally {
      setKitLoading(false);
    }
  }

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
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: "0.6rem", letterSpacing: "0.1em", color: "#39A935", fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>
            PagoYa · Admin
          </div>
          <div style={{ fontSize: "1.4rem", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 16 }}>
            {tab === "investor" ? "Investor Metrics" : "Rep Commission Center"}
          </div>
          {/* Tab switcher */}
          <div style={{ display: "flex", gap: 8 }}>
            {(["investor", "ops"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: "0.52rem",
                  fontWeight: 700,
                  padding: "6px 16px",
                  borderRadius: 20,
                  border: tab === t ? "1px solid #39A935" : "1px solid rgba(255,255,255,0.12)",
                  background: tab === t ? "rgba(57,169,53,0.15)" : "transparent",
                  color: tab === t ? "#39A935" : "#5a7080",
                  cursor: "pointer",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                {t === "investor" ? "📊 Investor View" : "⚙️ Operaciones"}
              </button>
            ))}
          </div>
        </div>

        {/* ══════════════ INVESTOR METRICS TAB ══════════════ */}
        {tab === "investor" && (
          <div>
            {/* Admin key prompt if not set */}
            {!adminKey.trim() && (
              <div style={{
                background: "rgba(245,158,11,0.08)",
                border: "1px solid rgba(245,158,11,0.3)",
                borderRadius: 12,
                padding: "16px",
                marginBottom: 20,
              }}>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.52rem", color: "#F59E0B", marginBottom: 8, textTransform: "uppercase" }}>
                  Admin Key requerida para cargar métricas
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    value={adminKey}
                    onChange={(e) => {
                      setAdminKey(e.target.value);
                      localStorage.setItem("pagoya_admin_key", e.target.value);
                    }}
                    placeholder="ADMIN_SECRET_KEY"
                    type="password"
                    style={{
                      flex: 1,
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: 8,
                      padding: "8px 10px",
                      color: "#e8f0f7",
                      fontFamily: "'Space Mono', monospace",
                      fontSize: "0.58rem",
                      outline: "none",
                    }}
                  />
                  <button
                    onClick={() => { localStorage.setItem("pagoya_admin_key", adminKey); loadInvestorMetrics(); }}
                    style={{
                      fontFamily: "'Space Mono', monospace",
                      fontSize: "0.52rem",
                      color: "#fff",
                      background: "#39A935",
                      border: "none",
                      borderRadius: 8,
                      padding: "8px 14px",
                      cursor: "pointer",
                    }}
                  >
                    Cargar
                  </button>
                </div>
              </div>
            )}

            {/* Error state */}
            {investorError && (
              <div style={{
                background: "rgba(232,42,10,0.1)",
                border: "1px solid rgba(232,42,10,0.3)",
                borderRadius: 10,
                padding: "12px 16px",
                fontFamily: "'Space Mono', monospace",
                fontSize: "0.6rem",
                color: "#E21A0A",
                marginBottom: 16,
              }}>
                Error {investorError} · Verifica tu Admin Key
              </div>
            )}

            {/* ── Key metric cards ── */}
            {investorData && (
              <>
                {/* Row 1: Users */}
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.46rem", color: "#5a7080", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
                  Usuarios
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 20 }}>
                  {[
                    { label: "Total Usuarios", value: investorData.users.total.toLocaleString("es-MX"), color: "#e8f0f7" },
                    { label: "Nuevos (7d)", value: `+${investorData.users.new_7d}`, color: "#39A935" },
                    { label: "Nuevos (30d)", value: `+${investorData.users.new_30d}`, color: "#39A935" },
                    { label: "Con Nombre KYC", value: investorData.users.with_name.toString(), color: "#6366F1" },
                  ].map((c) => (
                    <div key={c.label} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "14px 12px", textAlign: "center" }}>
                      <div style={{ fontSize: "1.2rem", fontWeight: 800, color: c.color, marginBottom: 4, fontFamily: "'Space Mono', monospace" }}>{c.value}</div>
                      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.42rem", color: "#5a7080", textTransform: "uppercase" }}>{c.label}</div>
                    </div>
                  ))}
                </div>

                {/* Source breakdown bar */}
                <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "16px", marginBottom: 20 }}>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.46rem", color: "#5a7080", textTransform: "uppercase", marginBottom: 12 }}>
                    Canal de Adquisición
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "flex-end", height: 60 }}>
                    {[
                      { label: "WhatsApp (Paula)", value: investorData.users.by_source.whatsapp_organic, color: "#25D366" },
                      { label: "Web Orgánico", value: investorData.users.by_source.web_organic, color: "#6366F1" },
                      { label: "Rep Network", value: investorData.users.by_source.rep_referral, color: "#F59E0B" },
                    ].map((s) => {
                      const maxVal = Math.max(investorData.users.total, 1);
                      const h = Math.max(4, Math.round((s.value / maxVal) * 56));
                      return (
                        <div key={s.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.52rem", fontWeight: 700, color: s.color }}>{s.value}</div>
                          <div style={{ width: "100%", height: h, background: s.color, borderRadius: 4, opacity: 0.8 }} />
                          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.38rem", color: "#5a7080", textAlign: "center", lineHeight: 1.3 }}>{s.label}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Row 2: Payments & Revenue */}
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.46rem", color: "#5a7080", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
                  Pagos & Ingresos
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 20 }}>
                  {[
                    { label: "Transacciones Totales", value: investorData.payments.completed.toLocaleString("es-MX"), color: "#e8f0f7" },
                    { label: "Volumen Total (MXN)", value: `$${investorData.payments.volume_total.toLocaleString("es-MX", { minimumFractionDigits: 0 })}`, color: "#1D9E75" },
                    { label: "Revenue Plataforma (MXN)", value: `$${investorData.payments.revenue_total.toLocaleString("es-MX", { minimumFractionDigits: 0 })}`, color: "#39A935" },
                    { label: "Txns (7d)", value: investorData.payments.last_7d.count.toString(), color: "#e8f0f7" },
                    { label: "Volumen (7d)", value: `$${investorData.payments.last_7d.volume.toLocaleString("es-MX", { minimumFractionDigits: 0 })}`, color: "#1D9E75" },
                    { label: "Revenue (7d)", value: `$${investorData.payments.last_7d.revenue.toLocaleString("es-MX", { minimumFractionDigits: 0 })}`, color: "#39A935" },
                  ].map((c) => (
                    <div key={c.label} style={{ background: "rgba(29,158,117,0.06)", border: "1px solid rgba(29,158,117,0.15)", borderRadius: 12, padding: "14px 12px", textAlign: "center" }}>
                      <div style={{ fontSize: "1.1rem", fontWeight: 800, color: c.color, marginBottom: 4, fontFamily: "'Space Mono', monospace" }}>{c.value}</div>
                      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.42rem", color: "#5a7080", textTransform: "uppercase" }}>{c.label}</div>
                    </div>
                  ))}
                </div>

                {/* Row 3: Wallets + PTI */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 24 }}>
                  {[
                    { label: "Wallets Activos", value: investorData.wallets.count.toString(), color: "#6366F1" },
                    { label: "Saldo en Circulación (MXN)", value: `$${investorData.wallets.balance_total.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`, color: "#6366F1" },
                    { label: "PTI Score Promedio", value: investorData.pti.avg_score > 0 ? investorData.pti.avg_score.toFixed(1) : "—", color: "#F59E0B" },
                  ].map((c) => (
                    <div key={c.label} style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.15)", borderRadius: 12, padding: "14px 12px", textAlign: "center" }}>
                      <div style={{ fontSize: "1.1rem", fontWeight: 800, color: c.color, marginBottom: 4, fontFamily: "'Space Mono', monospace" }}>{c.value}</div>
                      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.42rem", color: "#5a7080", textTransform: "uppercase" }}>{c.label}</div>
                    </div>
                  ))}
                </div>

                {/* Weekly Signups Chart */}
                <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "16px", marginBottom: 20 }}>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.46rem", color: "#5a7080", textTransform: "uppercase", marginBottom: 12 }}>
                    Nuevos Registros por Semana
                  </div>
                  {investorData.growth.weekly_signups.length === 0 ? (
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.52rem", color: "#5a7080", textAlign: "center", padding: "20px 0" }}>
                      Sin datos todavía — aparecerá cuando haya usuarios
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={160}>
                      <AreaChart data={investorData.growth.weekly_signups} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="greenGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#39A935" stopOpacity={0.35} />
                            <stop offset="95%" stopColor="#39A935" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                        <XAxis dataKey="week" tick={{ fill: "#5a7080", fontSize: 9, fontFamily: "Space Mono" }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fill: "#5a7080", fontSize: 9, fontFamily: "Space Mono" }} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={{ background: "#0A2540", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontFamily: "Space Mono", fontSize: "0.55rem" }} labelStyle={{ color: "#39A935" }} itemStyle={{ color: "#e8f0f7" }} />
                        <Area type="monotone" dataKey="signups" stroke="#39A935" strokeWidth={2} fill="url(#greenGrad)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>

                {/* Top Billers */}
                {investorData.top_billers.length > 0 && (
                  <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "16px", marginBottom: 20 }}>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.46rem", color: "#5a7080", textTransform: "uppercase", marginBottom: 12 }}>
                      Top Servicios por Volumen
                    </div>
                    <ResponsiveContainer width="100%" height={120}>
                      <BarChart data={investorData.top_billers} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                        <XAxis dataKey="service" tick={{ fill: "#5a7080", fontSize: 9, fontFamily: "Space Mono" }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fill: "#5a7080", fontSize: 9, fontFamily: "Space Mono" }} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={{ background: "#0A2540", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontFamily: "Space Mono", fontSize: "0.55rem" }} labelStyle={{ color: "#1D9E75" }} itemStyle={{ color: "#e8f0f7" }} />
                        <Bar dataKey="volume" fill="#1D9E75" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Last updated + refresh */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.42rem", color: "#5a7080" }}>
                    Actualizado: {new Date(investorData.as_of).toLocaleString("es-MX")} · Auto-refresh 60s
                  </div>
                  <button
                    onClick={loadInvestorMetrics}
                    disabled={investorLoading}
                    style={{
                      fontFamily: "'Space Mono', monospace",
                      fontSize: "0.44rem",
                      color: "#39A935",
                      background: "rgba(57,169,53,0.12)",
                      border: "1px solid rgba(57,169,53,0.3)",
                      borderRadius: 20,
                      padding: "4px 12px",
                      cursor: "pointer",
                      opacity: investorLoading ? 0.5 : 1,
                    }}
                  >
                    {investorLoading ? "Cargando…" : "↻ Refrescar"}
                  </button>
                </div>
              </>
            )}

            {/* Loading skeleton */}
            {investorLoading && !investorData && adminKey.trim() && (
              <div style={{ textAlign: "center", fontFamily: "'Space Mono', monospace", fontSize: "0.65rem", color: "#5a7080", padding: "40px 0" }}>
                Cargando métricas…
              </div>
            )}
          </div>
        )}

        {/* ══════════════ OPS TAB ══════════════ */}
        {tab === "ops" && (
        <div>

        {/* ── Wallet Command Center Panel ── */}
        <div style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.09)",
          borderRadius: 14,
          overflow: "hidden",
          marginBottom: 24,
        }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 16px 10px",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
          }}>
            <div style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: "0.52rem",
              letterSpacing: "0.08em",
              color: "#5a7080",
              textTransform: "uppercase",
            }}>
              Monedero · Panel de Control
            </div>
            <button
              onClick={loadWallet}
              disabled={walletLoading}
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: "0.44rem",
                color: "#39A935",
                background: "rgba(57,169,53,0.12)",
                border: "1px solid rgba(57,169,53,0.3)",
                borderRadius: 20,
                padding: "3px 10px",
                cursor: "pointer",
                opacity: walletLoading ? 0.5 : 1,
              }}
            >
              {walletLoading ? "actualizando…" : "↻ actualizar"}
            </button>
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
            gap: 0,
          }}>
            {[
              {
                label: "Monederos Activos",
                value: walletLoading ? "…" : String(wallet?.walletCount ?? 0),
                color: "#e8f0f7",
              },
              {
                label: "Saldo Total en Circulación",
                value: walletLoading ? "…" : `$${(wallet?.totalBalanceMXN ?? 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}`,
                color: "#39A935",
              },
              {
                label: "Cargas Pendientes (OXXO)",
                value: walletLoading ? "…" : `${wallet?.pendingLoads.count ?? 0} · $${(wallet?.pendingLoads.amountMXN ?? 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}`,
                color: "#F59E0B",
              },
              {
                label: "Cargas Confirmadas",
                value: walletLoading ? "…" : `${wallet?.confirmedLoads.count ?? 0} · $${(wallet?.confirmedLoads.amountMXN ?? 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}`,
                color: "#6366F1",
              },
              {
                label: "Cargas Vencidas",
                value: walletLoading ? "…" : String(wallet?.failedLoads.count ?? 0),
                color: "#E21A0A",
              },
            ].map((card) => (
              <div key={card.label} style={{
                padding: "14px 12px",
                borderRight: "1px solid rgba(255,255,255,0.05)",
                textAlign: "center",
              }}>
                <div style={{ fontSize: "0.9rem", fontWeight: 800, color: card.color, marginBottom: 4, fontFamily: "'Space Mono', monospace" }}>
                  {card.value}
                </div>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.42rem", color: "#5a7080", lineHeight: 1.5, textTransform: "uppercase" }}>
                  {card.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Ingresos por Plataforma Panel ── */}
        <div style={{
          background: "rgba(29,158,117,0.06)",
          border: "1px solid rgba(29,158,117,0.18)",
          borderRadius: 14,
          overflow: "hidden",
          marginBottom: 24,
        }}>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "12px 16px 10px",
            borderBottom: "1px solid rgba(29,158,117,0.12)",
          }}>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.52rem", letterSpacing: "0.08em", color: "#1D9E75", textTransform: "uppercase" }}>
              Ingresos por Plataforma · $25.00 MXN / transacción
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 0 }}>
            {[
              {
                label: "Hoy",
                value: revenueLoading ? "…" : `$${(revenue?.today ?? 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}`,
                sub: revenueLoading ? "" : `${revenue?.transactionCount.today ?? 0} txn`,
                color: "#1D9E75",
              },
              {
                label: "Este mes",
                value: revenueLoading ? "…" : `$${(revenue?.thisMonth ?? 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}`,
                sub: revenueLoading ? "" : `${revenue?.transactionCount.thisMonth ?? 0} txn`,
                color: "#1D9E75",
              },
              {
                label: "Total acumulado",
                value: revenueLoading ? "…" : `$${(revenue?.allTime ?? 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}`,
                sub: revenueLoading ? "" : `${revenue?.transactionCount.allTime ?? 0} txn`,
                color: "#1D9E75",
              },
              {
                label: "Proyección mensual",
                value: revenueLoading ? "…" : `$${(revenue?.projectedMonthlyRevenue ?? 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}`,
                sub: "basado en promedio diario",
                color: "#39A935",
              },
            ].map((card) => (
              <div key={card.label} style={{ padding: "14px 12px", borderRight: "1px solid rgba(29,158,117,0.10)", textAlign: "center" }}>
                <div style={{ fontSize: "0.9rem", fontWeight: 800, color: card.color, marginBottom: 2, fontFamily: "'Space Mono', monospace" }}>
                  {card.value}
                </div>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.42rem", color: "#1D9E75", opacity: 0.7, marginBottom: 2, textTransform: "uppercase" }}>
                  {card.label}
                </div>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.38rem", color: "#5a7080" }}>
                  {card.sub}
                </div>
              </div>
            ))}
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

        {/* ── Rep Commission Table ── */}
        <div style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 14,
          overflow: "hidden",
          marginBottom: 24,
        }}>
          {/* Section header with "Generar Kit" button */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 16px 10px",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
          }}>
            <div style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: "0.52rem",
              letterSpacing: "0.08em",
              color: "#5a7080",
              textTransform: "uppercase",
            }}>
              Reps · Detalle de Comisiones
            </div>
            <button
              onClick={() => { setKitOpen(!kitOpen); setKitResult(null); setKitError(""); }}
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: "0.48rem",
                fontWeight: 700,
                color: kitOpen ? "#F59E0B" : "#1D9E75",
                background: kitOpen ? "rgba(245,158,11,0.1)" : "rgba(29,158,117,0.12)",
                border: `1px solid ${kitOpen ? "rgba(245,158,11,0.35)" : "rgba(29,158,117,0.35)"}`,
                borderRadius: 20,
                padding: "4px 12px",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {kitOpen ? "✕ Cerrar" : "+ Generar Kit de Rep"}
            </button>
          </div>

          {/* ── Kit Generator Form ── */}
          {kitOpen && (
            <div style={{
              padding: "16px",
              borderBottom: "1px solid rgba(255,255,255,0.07)",
              background: "rgba(29,158,117,0.04)",
            }}>

              {/* Success state */}
              {kitResult ? (
                <div style={{
                  background: "rgba(57,169,53,0.1)",
                  border: "1px solid rgba(57,169,53,0.3)",
                  borderRadius: 10,
                  padding: "16px",
                }}>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.52rem", color: "#39A935", fontWeight: 700, marginBottom: 10, textTransform: "uppercase" }}>
                    ✅ Rep Creado
                  </div>
                  {[
                    ["Nombre", kitResult.name],
                    ["Código", kitResult.repCode],
                    ["Link de Referido", kitResult.referralLink],
                    ["Email (login)", kitResult.email],
                    ["Contraseña inicial", kitResult.initialPassword],
                  ].map(([label, val]) => (
                    <div key={label} style={{ display: "flex", gap: 8, marginBottom: 6, alignItems: "flex-start" }}>
                      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.46rem", color: "#5a7080", minWidth: 110, textTransform: "uppercase" }}>{label}</div>
                      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.52rem", color: "#e8f0f7", wordBreak: "break-all" }}>{val}</div>
                    </div>
                  ))}
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.44rem", color: "#5a7080", marginTop: 8 }}>
                    WhatsApp enviado · Rep puede iniciar sesión en /rep-login
                  </div>
                  <button
                    onClick={() => { setKitResult(null); }}
                    style={{
                      marginTop: 12,
                      fontFamily: "'Space Mono', monospace",
                      fontSize: "0.46rem",
                      color: "#1D9E75",
                      background: "rgba(29,158,117,0.12)",
                      border: "1px solid rgba(29,158,117,0.3)",
                      borderRadius: 20,
                      padding: "4px 12px",
                      cursor: "pointer",
                    }}
                  >
                    + Crear otro rep
                  </button>
                </div>
              ) : (
                /* Input form */
                <div>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.46rem", color: "#1D9E75", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Nuevo Rep — Kit de Onboarding
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
                    {/* Name */}
                    <div>
                      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.42rem", color: "#5a7080", marginBottom: 4, textTransform: "uppercase" }}>Nombre completo</div>
                      <input
                        value={kitName}
                        onChange={(e) => setKitName(e.target.value)}
                        placeholder="Ej. María García"
                        style={{
                          width: "100%",
                          background: "rgba(255,255,255,0.05)",
                          border: "1px solid rgba(255,255,255,0.12)",
                          borderRadius: 8,
                          padding: "8px 10px",
                          color: "#e8f0f7",
                          fontFamily: "'Space Mono', monospace",
                          fontSize: "0.6rem",
                          outline: "none",
                          boxSizing: "border-box",
                        }}
                      />
                    </div>
                    {/* Phone */}
                    <div>
                      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.42rem", color: "#5a7080", marginBottom: 4, textTransform: "uppercase" }}>WhatsApp (10 dígitos)</div>
                      <input
                        value={kitPhone}
                        onChange={(e) => setKitPhone(e.target.value)}
                        placeholder="3221234567"
                        style={{
                          width: "100%",
                          background: "rgba(255,255,255,0.05)",
                          border: "1px solid rgba(255,255,255,0.12)",
                          borderRadius: 8,
                          padding: "8px 10px",
                          color: "#e8f0f7",
                          fontFamily: "'Space Mono', monospace",
                          fontSize: "0.6rem",
                          outline: "none",
                          boxSizing: "border-box",
                        }}
                      />
                    </div>
                    {/* Colonia */}
                    <div>
                      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.42rem", color: "#5a7080", marginBottom: 4, textTransform: "uppercase" }}>Colonia</div>
                      <select
                        value={kitColonia}
                        onChange={(e) => setKitColonia(e.target.value)}
                        style={{
                          width: "100%",
                          background: "#0A2540",
                          border: "1px solid rgba(255,255,255,0.12)",
                          borderRadius: 8,
                          padding: "8px 10px",
                          color: "#e8f0f7",
                          fontFamily: "'Space Mono', monospace",
                          fontSize: "0.6rem",
                          outline: "none",
                          boxSizing: "border-box",
                        }}
                      >
                        {COLONIAS.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {kitError && (
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.5rem", color: "#E21A0A", marginBottom: 10 }}>
                      {kitError}
                    </div>
                  )}

                  <button
                    onClick={handleKitSubmit}
                    disabled={kitLoading}
                    style={{
                      fontFamily: "'Space Mono', monospace",
                      fontSize: "0.52rem",
                      fontWeight: 700,
                      color: "#fff",
                      background: kitLoading ? "rgba(29,158,117,0.4)" : "#1D9E75",
                      border: "none",
                      borderRadius: 8,
                      padding: "9px 20px",
                      cursor: kitLoading ? "not-allowed" : "pointer",
                    }}
                  >
                    {kitLoading ? "Creando…" : "Generar Kit y Enviar WhatsApp"}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Table header */}
          {reps.length > 0 && (
            <>
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
            </>
          )}
        </div>

        {/* ── Colonia Breakdown Panel ── */}
        <div style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.09)",
          borderRadius: 14,
          overflow: "hidden",
          marginTop: 24,
        }}>
          <div style={{ padding: "12px 16px 10px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.52rem", letterSpacing: "0.08em", color: "#5a7080", textTransform: "uppercase" }}>
              Usuarios por Colonia · {coloniaLoading ? "…" : `${colonia?.total ?? 0} registrados`}
            </div>
          </div>
          <div style={{ padding: "14px 16px" }}>
            {coloniaLoading ? (
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.52rem", color: "#5a7080" }}>Cargando…</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {(colonia?.breakdown ?? []).map((row) => (
                  <div key={row.colonia} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.52rem", color: "#e8f0f7", minWidth: 160 }}>
                      {row.colonia}
                    </div>
                    <div style={{ flex: 1, background: "rgba(255,255,255,0.06)", borderRadius: 4, height: 6, overflow: "hidden" }}>
                      <div style={{ width: `${row.pct}%`, height: "100%", background: "#1D9E75", borderRadius: 4 }} />
                    </div>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.52rem", color: "#1D9E75", minWidth: 52, textAlign: "right" }}>
                      {row.count} <span style={{ color: "#5a7080" }}>({row.pct}%)</span>
                    </div>
                  </div>
                ))}
                {(colonia?.breakdown ?? []).length === 0 && (
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.52rem", color: "#5a7080" }}>Sin datos aún.</div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Per-User Transaction Drill-Down ── */}
        <div style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.09)",
          borderRadius: 14,
          overflow: "hidden",
          marginTop: 24,
        }}>
          <div style={{ padding: "12px 16px 10px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.52rem", letterSpacing: "0.08em", color: "#5a7080", textTransform: "uppercase" }}>
              Historial por Usuario
            </div>
          </div>
          <div style={{ padding: "14px 16px" }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              <input
                value={userPhone}
                onChange={(e) => { setUserPhone(e.target.value); setUserTxError(""); }}
                placeholder="Teléfono del usuario (ej. 3221234567)"
                style={{
                  flex: 1,
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 8,
                  padding: "8px 10px",
                  color: "#e8f0f7",
                  fontFamily: "'Space Mono', monospace",
                  fontSize: "0.6rem",
                  outline: "none",
                  boxSizing: "border-box",
                }}
                onKeyDown={(e) => { if (e.key === "Enter") lookupUser(); }}
              />
              <button
                onClick={lookupUser}
                disabled={userTxLoading}
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: "0.52rem",
                  color: "#fff",
                  background: userTxLoading ? "rgba(29,158,117,0.4)" : "#1D9E75",
                  border: "none",
                  borderRadius: 8,
                  padding: "8px 16px",
                  cursor: userTxLoading ? "not-allowed" : "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {userTxLoading ? "Buscando…" : "→ Buscar"}
              </button>
            </div>

            {userTxError && (
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.52rem", color: "#E21A0A", marginBottom: 10 }}>
                {userTxError}
              </div>
            )}

            {userTxData && (
              <div>
                <div style={{
                  background: "rgba(29,158,117,0.08)",
                  border: "1px solid rgba(29,158,117,0.2)",
                  borderRadius: 8,
                  padding: "10px 12px",
                  marginBottom: 12,
                }}>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.6rem", color: "#1D9E75", fontWeight: 700 }}>
                    {userTxData.user.name}
                  </div>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.48rem", color: "#5a7080", marginTop: 4 }}>
                    {userTxData.user.phone} · {userTxData.user.colonia ?? "—"} · ID {userTxData.user.id}
                  </div>
                </div>

                {userTxData.transactions.length === 0 ? (
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.52rem", color: "#5a7080" }}>Sin transacciones.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px 80px", gap: 0, padding: "4px 0 8px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                      {["DESCRIPCIÓN", "TIPO", "MONTO", "SALDO"].map((h) => (
                        <div key={h} style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.42rem", color: "#5a7080", letterSpacing: "0.06em" }}>{h}</div>
                      ))}
                    </div>
                    {userTxData.transactions.map((tx) => {
                      const amt = parseFloat(tx.amount ?? "0");
                      return (
                        <div key={tx.id} style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px 80px", gap: 0, padding: "7px 0", borderBottom: "1px solid rgba(255,255,255,0.03)", alignItems: "center" }}>
                          <div>
                            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.52rem", color: "#e8f0f7" }}>{tx.description ?? "—"}</div>
                            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.42rem", color: "#5a7080", marginTop: 2 }}>
                              {tx.createdAt ? new Date(tx.createdAt).toLocaleString("es-MX", { timeZone: "America/Mexico_City", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}
                            </div>
                          </div>
                          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.46rem", color: "#5a7080" }}>{tx.type}</div>
                          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.52rem", color: amt >= 0 ? "#1D9E75" : "#E21A0A", fontWeight: 700 }}>
                            {amt >= 0 ? "+" : ""}${Math.abs(amt).toFixed(2)}
                          </div>
                          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.52rem", color: "#e8f0f7" }}>
                            ${parseFloat(tx.balanceAfter ?? "0").toFixed(2)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Send Money to Wallet (Admin Credit) ── */}
        <div style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(0,200,117,0.18)",
          borderRadius: 14,
          overflow: "hidden",
          marginBottom: 24,
        }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "12px 16px 10px",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
          }}>
            <span style={{ fontSize: "1rem" }}>💸</span>
            <div style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: "0.52rem",
              letterSpacing: "0.08em",
              color: "#00C875",
              textTransform: "uppercase",
            }}>
              Enviar Dinero · Admin Credit
            </div>
            <div style={{
              marginLeft: "auto",
              fontFamily: "'Space Mono', monospace",
              fontSize: "0.42rem",
              color: "#5a7080",
            }}>
              USA → Mexico wallet · acreditación inmediata
            </div>
          </div>

          <div style={{ padding: "16px 16px 18px" }}>
            {creditResult ? (
              <div style={{
                background: "rgba(0,200,117,0.10)",
                border: "1px solid rgba(0,200,117,0.3)",
                borderRadius: 10,
                padding: "14px 16px",
              }}>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.7rem", color: "#00C875", fontWeight: 700, marginBottom: 6 }}>
                  ✓ Crédito Enviado
                </div>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.55rem", color: "#e8f0f7", marginBottom: 4 }}>
                  {creditResult.phone} recibió <strong>${creditResult.credited.toFixed(2)} MXN</strong>
                </div>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.5rem", color: "#5a7080", marginBottom: 4 }}>
                  Saldo nuevo: ${creditResult.newBalanceMXN.toFixed(2)} MXN
                </div>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.42rem", color: "#3a5060", marginBottom: 12 }}>
                  TX: {creditResult.transactionId}
                </div>
                <button
                  onClick={() => setCreditResult(null)}
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: "0.5rem",
                    color: "#00C875",
                    background: "rgba(0,200,117,0.12)",
                    border: "1px solid rgba(0,200,117,0.3)",
                    borderRadius: 6,
                    padding: "5px 12px",
                    cursor: "pointer",
                  }}
                >
                  Enviar otro
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.44rem", color: "#5a7080", marginBottom: 4, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                      Teléfono destino (MX)
                    </div>
                    <input
                      value={creditPhone}
                      onChange={(e) => setCreditPhone(e.target.value)}
                      placeholder="ej. 3221234567"
                      style={{
                        width: "100%",
                        background: "rgba(255,255,255,0.05)",
                        border: "1px solid rgba(255,255,255,0.12)",
                        borderRadius: 8,
                        padding: "8px 10px",
                        color: "#e8f0f7",
                        fontFamily: "'Space Mono', monospace",
                        fontSize: "0.6rem",
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                  <div>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.44rem", color: "#5a7080", marginBottom: 4, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                      Monto (MXN)
                    </div>
                    <input
                      value={creditAmount}
                      onChange={(e) => setCreditAmount(e.target.value)}
                      placeholder="ej. 500.00"
                      type="number"
                      min="1"
                      max="50000"
                      step="0.01"
                      style={{
                        width: "100%",
                        background: "rgba(255,255,255,0.05)",
                        border: "1px solid rgba(255,255,255,0.12)",
                        borderRadius: 8,
                        padding: "8px 10px",
                        color: "#e8f0f7",
                        fontFamily: "'Space Mono', monospace",
                        fontSize: "0.6rem",
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.44rem", color: "#5a7080", marginBottom: 4, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                    Nota / Concepto (opcional)
                  </div>
                  <input
                    value={creditNote}
                    onChange={(e) => setCreditNote(e.target.value)}
                    placeholder="ej. Mamá te manda dinero para tu CFE"
                    style={{
                      width: "100%",
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: 8,
                      padding: "8px 10px",
                      color: "#e8f0f7",
                      fontFamily: "'Space Mono', monospace",
                      fontSize: "0.6rem",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.44rem", color: "#5a7080", marginBottom: 4, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                    Admin Token
                  </div>
                  <input
                    value={creditToken}
                    onChange={(e) => setCreditToken(e.target.value)}
                    placeholder="Token de acceso admin"
                    type="password"
                    style={{
                      width: "100%",
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: 8,
                      padding: "8px 10px",
                      color: "#e8f0f7",
                      fontFamily: "'Space Mono', monospace",
                      fontSize: "0.6rem",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                {creditError && (
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.52rem", color: "#E21A0A" }}>
                    {creditError}
                  </div>
                )}

                <button
                  onClick={handleCreditSubmit}
                  disabled={creditLoading}
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: "0.6rem",
                    fontWeight: 700,
                    color: "#fff",
                    background: creditLoading ? "rgba(0,200,117,0.4)" : "linear-gradient(135deg, #007A4A 0%, #00C875 100%)",
                    border: "none",
                    borderRadius: 8,
                    padding: "11px 20px",
                    cursor: creditLoading ? "not-allowed" : "pointer",
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                    marginTop: 4,
                  }}
                >
                  {creditLoading ? "Enviando…" : "💸 Enviar Dinero al Wallet"}
                </button>
              </div>
            )}
          </div>
        </div>

        </div>
        )}

      </div>
    </div>
  );
}
