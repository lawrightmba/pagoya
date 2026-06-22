import { useState, useEffect, useCallback } from "react";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

interface ColoniaRow { colonia: string; count: number; pct: number; }
interface ColoniaBreakdown { total: number; breakdown: ColoniaRow[]; }

interface LandlordRow {
  id: number;
  landlord_code: string;
  full_name: string;
  email: string;
  whatsapp: string | null;
  units: number;
  city: string;
  status: string;
  referral_link: string | null;
  referred_users: number;
  total_commission_mxn: number;
  notes: string | null;
  created_at: string;
}

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

interface RepStatRow {
  id: string;
  name: string;
  phone: string;
  repCode: string;
  status: string;
  joined: string;
  signup_count: number;
  converted_count: number;
  commission_total: string;
  commission_pending: string;
  last_activity: string | null;
}

interface RepUserRow {
  id: number;
  name: string | null;
  phone: string;
  colonia: string | null;
  registered: string;
  payment_count: number;
  payment_volume: string;
  last_payment: string | null;
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

  const [tab, setTab] = useState<"investor" | "ops" | "landlords" | "compliance" | "soporte" | "reps">("investor");

  const [adminKey, setAdminKey] = useState(() => localStorage.getItem("pagoya_admin_key") ?? "");

  // ── Soporte state ──
  interface SupportTicket {
    id: number;
    ticket_ref: string;
    category: string;
    channel: string;
    status: string;
    complaint_text: string;
    telefono: string | null;
    admin_response: string | null;
    received_at: string;
    admin_responded_at: string | null;
    whatsapp_sent: boolean;
  }
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [supportTotal, setSupportTotal] = useState(0);
  const [supportFilter, setSupportFilter] = useState("all");
  const [supportLoading, setSupportLoading] = useState(false);
  const [expandedTicket, setExpandedTicket] = useState<number | null>(null);
  const [replyText, setReplyText] = useState<Record<number, string>>({});
  const [replySending, setReplySending] = useState<number | null>(null);

  // ── Rep Management state ───────────────────────────────────────────────────
  const [repStats, setRepStats] = useState<RepStatRow[]>([]);
  const [repStatsLoading, setRepStatsLoading] = useState(false);
  const [repStatsError, setRepStatsError] = useState("");
  const [expandedRepCode, setExpandedRepCode] = useState<string | null>(null);
  const [repUsers, setRepUsers] = useState<Record<string, RepUserRow[]>>({});
  const [repUsersLoading, setRepUsersLoading] = useState<Record<string, boolean>>({});
  const [repKitOpen, setRepKitOpen] = useState(false);
  const [repKitName, setRepKitName] = useState("");
  const [repKitPhone, setRepKitPhone] = useState("");
  const [repKitColonia, setRepKitColonia] = useState(COLONIAS[0]);
  const [repKitLoading, setRepKitLoading] = useState(false);
  const [repKitError, setRepKitError] = useState("");
  const [repKitResult, setRepKitResult] = useState<KitResult | null>(null);
  const [statusToggling, setStatusToggling] = useState<string | null>(null);

  const loadRepStats = useCallback(async () => {
    if (!adminKey.trim()) return;
    setRepStatsLoading(true);
    setRepStatsError("");
    try {
      const r = await fetch("/api/reps/admin/list", { headers: { "x-admin-key": adminKey } });
      if (!r.ok) { setRepStatsError(`Error ${r.status}`); return; }
      const d = await r.json();
      setRepStats(d.reps ?? []);
    } catch { setRepStatsError("Error de red"); }
    finally { setRepStatsLoading(false); }
  }, [adminKey]);

  useEffect(() => { if (tab === "reps") loadRepStats(); }, [tab, loadRepStats]);

  async function loadRepUsers(repCode: string) {
    if (repUsers[repCode] !== undefined) return;
    setRepUsersLoading(prev => ({ ...prev, [repCode]: true }));
    try {
      const r = await fetch(`/api/reps/admin/${encodeURIComponent(repCode)}/users`, { headers: { "x-admin-key": adminKey } });
      if (r.ok) {
        const d = await r.json();
        setRepUsers(prev => ({ ...prev, [repCode]: d.users ?? [] }));
      }
    } catch { /* silent */ }
    finally { setRepUsersLoading(prev => ({ ...prev, [repCode]: false })); }
  }

  async function toggleRepStatus(id: string, currentStatus: string) {
    setStatusToggling(id);
    try {
      const newStatus = currentStatus === "active" ? "inactive" : "active";
      const r = await fetch(`/api/reps/admin/${encodeURIComponent(id)}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify({ status: newStatus }),
      });
      if (r.ok) {
        setRepStats(prev => prev.map(rep => rep.id === id ? { ...rep, status: newStatus } : rep));
      }
    } catch { /* silent */ }
    finally { setStatusToggling(null); }
  }

  async function handleRepKitSubmit() {
    if (!repKitName.trim() || !repKitPhone.trim()) { setRepKitError("Ingresa nombre y teléfono."); return; }
    setRepKitLoading(true);
    setRepKitError("");
    try {
      const r = await fetch("/api/reps/admin/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: repKitName.trim(), phone: repKitPhone.trim(), colonia: repKitColonia }),
      });
      const data = await r.json() as KitResult & { error?: string };
      if (!r.ok) { setRepKitError(data.error ?? `Error ${r.status}`); return; }
      setRepKitResult(data);
      setRepKitName("");
      setRepKitPhone("");
      setRepKitColonia(COLONIAS[0]);
      await loadRepStats();
    } catch { setRepKitError("Error de red."); }
    finally { setRepKitLoading(false); }
  }

  const loadSupportTickets = useCallback(async (statusFilter = supportFilter) => {
    if (!adminKey.trim()) return;
    setSupportLoading(true);
    try {
      const params = statusFilter !== "all" ? `?status=${statusFilter}` : "";
      const r = await fetch(`/api/complaints/admin${params}`, {
        headers: { "x-admin-key": adminKey },
      });
      if (r.ok) {
        const d = await r.json();
        setSupportTickets(d.tickets ?? []);
        setSupportTotal(d.total ?? 0);
      }
    } catch { /* silent */ } finally {
      setSupportLoading(false);
    }
  }, [adminKey, supportFilter]);

  useEffect(() => { if (tab === "soporte") loadSupportTickets(); }, [tab, loadSupportTickets]);

  async function resolveTicket(id: number, sendWa: boolean) {
    const response = replyText[id]?.trim();
    if (!response) return;
    setReplySending(id);
    try {
      const r = await fetch(`/api/complaints/admin/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
        body: JSON.stringify({ admin_response: response, status: "resuelto", send_whatsapp: sendWa }),
      });
      if (r.ok) {
        setReplyText(prev => { const n = { ...prev }; delete n[id]; return n; });
        setExpandedTicket(null);
        loadSupportTickets();
      }
    } catch { /* silent */ } finally {
      setReplySending(null);
    }
  }
  const [sheetUrl, setSheetUrl] = useState(() => localStorage.getItem("pagoya_sheet_url") ?? "");
  const [sheetUrlInput, setSheetUrlInput] = useState("");

  // ── Compliance state ──────────────────────────────────────────────────────
  const [complianceData, setComplianceData] = useState<{
    as_of: string;
    users: { total: number; new_30d: number; new_90d: number; kyc_upgraded: number; curp_on_file: number; pti_scored: number; from_institution: number };
    kyc_tiers: { kyc_tier: string; n: number }[];
    pti_tiers: { tier: string; n: number }[];
    weekly_tx: { week_start: string; tx_count: number; volume_mxn: number; avg_mxn: number }[];
  } | null>(null);
  const [complianceLoading, setComplianceLoading] = useState(false);
  const [complianceError, setComplianceError] = useState("");
  const [glosarioOpen, setGlosarioOpen] = useState(false);

  const loadCompliance = useCallback(async () => {
    if (!adminKey.trim()) return;
    setComplianceLoading(true);
    setComplianceError("");
    try {
      const r = await fetch(`${BASE_URL}/api/admin/compliance-summary`, { headers: { "x-admin-key": adminKey } });
      if (!r.ok) { setComplianceError(`${r.status}`); return; }
      setComplianceData(await r.json());
    } catch { setComplianceError("Network error"); }
    finally { setComplianceLoading(false); }
  }, [adminKey]);

  useEffect(() => { if (tab === "compliance") loadCompliance(); }, [tab, loadCompliance]);

  // ── Landlords state ───────────────────────────────────────────────────────
  const [landlords, setLandlords] = useState<LandlordRow[]>([]);
  const [landlordLoading, setLandlordLoading] = useState(false);
  const [landlordError, setLandlordError] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ full_name: "", email: "", whatsapp: "", units: "1", city: "Puerto Vallarta", notes: "" });
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");
  const [addSuccess, setAddSuccess] = useState<{ landlord_code: string; referral_link: string } | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const loadLandlords = useCallback(async () => {
    if (!adminKey.trim()) return;
    setLandlordLoading(true);
    setLandlordError("");
    try {
      const r = await fetch(`${BASE_URL}/api/landlords`, { headers: { "x-admin-key": adminKey } });
      if (!r.ok) { setLandlordError(`${r.status}`); return; }
      const d = await r.json();
      setLandlords(d.landlords ?? []);
    } catch { setLandlordError("Network error"); }
    finally { setLandlordLoading(false); }
  }, [adminKey]);

  useEffect(() => { if (tab === "landlords") loadLandlords(); }, [tab, loadLandlords]);

  const handleAddLandlord = async () => {
    if (!addForm.full_name.trim() || !addForm.email.trim()) { setAddError("Nombre y email son requeridos"); return; }
    setAddLoading(true);
    setAddError("");
    try {
      const r = await fetch(`${BASE_URL}/api/landlords/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...addForm, units: parseInt(addForm.units) || 1 }),
      });
      const d = await r.json();
      if (!r.ok) { setAddError(d.error ?? `Error ${r.status}`); return; }
      setAddSuccess({ landlord_code: d.landlord_code, referral_link: d.referral_link });
      await loadLandlords();
    } catch { setAddError("Error de red"); }
    finally { setAddLoading(false); }
  };

  const copyLink = (link: string, code: string) => {
    navigator.clipboard.writeText(link).then(() => {
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    });
  };

  const [investorData, setInvestorData] = useState<InvestorMetrics | null>(null);
  const [investorLoading, setInvestorLoading] = useState(true);
  const [investorError, setInvestorError] = useState("");

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
          <div style={{ fontSize: "1.05rem", letterSpacing: "0.1em", color: "#39A935", fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>
            PagoYa · Admin
          </div>
          <div style={{ fontSize: "1.8rem", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 16 }}>
            {tab === "investor" ? "Investor Metrics" : tab === "ops" ? "Rep Commission Center" : tab === "landlords" ? "Propietarios" : tab === "compliance" ? "Cumplimiento" : tab === "reps" ? "Rep Management" : "Soporte"}
          </div>
          {/* Tab switcher */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {(["investor", "ops", "reps", "landlords", "compliance", "soporte"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: "1rem",
                  fontWeight: 700,
                  padding: "8px 20px",
                  borderRadius: 20,
                  border: tab === t ? "1px solid #39A935" : "1px solid rgba(255,255,255,0.12)",
                  background: tab === t ? "rgba(57,169,53,0.15)" : "transparent",
                  color: tab === t ? "#39A935" : "#5a7080",
                  cursor: "pointer",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                {t === "investor" ? "📊 Investor View" : t === "ops" ? "⚙️ Operaciones" : t === "reps" ? "👥 Reps" : t === "landlords" ? "🏠 Propietarios" : t === "compliance" ? "🛡️ Cumplimiento" : "🎧 Soporte"}
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
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "1rem", color: "#F59E0B", marginBottom: 8, textTransform: "uppercase" }}>
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
                      fontSize: "1.05rem",
                      outline: "none",
                    }}
                  />
                  <button
                    onClick={() => { localStorage.setItem("pagoya_admin_key", adminKey); loadInvestorMetrics(); }}
                    style={{
                      fontFamily: "'Space Mono', monospace",
                      fontSize: "1rem",
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
                fontSize: "1.05rem",
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
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "1rem", color: "#5a7080", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
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
                      <div style={{ fontSize: "1.4rem", fontWeight: 800, color: c.color, marginBottom: 4, fontFamily: "'Space Mono', monospace" }}>{c.value}</div>
                      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "1.05rem", color: "#5a7080", textTransform: "uppercase" }}>{c.label}</div>
                    </div>
                  ))}
                </div>

                {/* Source breakdown bar */}
                <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "16px", marginBottom: 20 }}>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "1rem", color: "#5a7080", textTransform: "uppercase", marginBottom: 12 }}>
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
                          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "1.05rem", fontWeight: 700, color: s.color }}>{s.value}</div>
                          <div style={{ width: "100%", height: h, background: s.color, borderRadius: 4, opacity: 0.8 }} />
                          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.85rem", color: "#5a7080", textAlign: "center", lineHeight: 1.3 }}>{s.label}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Row 2: Payments & Revenue */}
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "1rem", color: "#5a7080", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
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
                      <div style={{ fontSize: "1.3rem", fontWeight: 800, color: c.color, marginBottom: 4, fontFamily: "'Space Mono', monospace" }}>{c.value}</div>
                      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "1.05rem", color: "#5a7080", textTransform: "uppercase" }}>{c.label}</div>
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
                      <div style={{ fontSize: "1.3rem", fontWeight: 800, color: c.color, marginBottom: 4, fontFamily: "'Space Mono', monospace" }}>{c.value}</div>
                      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "1.05rem", color: "#5a7080", textTransform: "uppercase" }}>{c.label}</div>
                    </div>
                  ))}
                </div>

                {/* Weekly Signups Chart */}
                <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "16px", marginBottom: 20 }}>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "1rem", color: "#5a7080", textTransform: "uppercase", marginBottom: 12 }}>
                    Nuevos Registros por Semana
                  </div>
                  {investorData.growth.weekly_signups.length === 0 ? (
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "1rem", color: "#5a7080", textAlign: "center", padding: "20px 0" }}>
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
                        <Tooltip contentStyle={{ background: "#0A2540", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontFamily: "Space Mono", fontSize: "1rem" }} labelStyle={{ color: "#39A935" }} itemStyle={{ color: "#e8f0f7" }} />
                        <Area type="monotone" dataKey="signups" stroke="#39A935" strokeWidth={2} fill="url(#greenGrad)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>

                {/* Top Billers */}
                {investorData.top_billers.length > 0 && (
                  <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "16px", marginBottom: 20 }}>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "1rem", color: "#5a7080", textTransform: "uppercase", marginBottom: 12 }}>
                      Top Servicios por Volumen
                    </div>
                    <ResponsiveContainer width="100%" height={120}>
                      <BarChart data={investorData.top_billers} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                        <XAxis dataKey="service" tick={{ fill: "#5a7080", fontSize: 9, fontFamily: "Space Mono" }} tickLine={false} axisLine={false} />
                        <YAxis tick={{ fill: "#5a7080", fontSize: 9, fontFamily: "Space Mono" }} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={{ background: "#0A2540", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontFamily: "Space Mono", fontSize: "1rem" }} labelStyle={{ color: "#1D9E75" }} itemStyle={{ color: "#e8f0f7" }} />
                        <Bar dataKey="volume" fill="#1D9E75" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Last updated + refresh + sheet link */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, gap: 8, flexWrap: "wrap" }}>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "1.05rem", color: "#5a7080" }}>
                    Actualizado: {new Date(investorData.as_of).toLocaleString("es-MX")} · Auto-refresh 60s
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    {sheetUrl ? (
                      <a
                        href={sheetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          fontFamily: "'Space Mono', monospace",
                          fontSize: "1rem",
                          color: "#1D9E75",
                          background: "rgba(29,158,117,0.12)",
                          border: "1px solid rgba(29,158,117,0.3)",
                          borderRadius: 20,
                          padding: "8px 16px",
                          cursor: "pointer",
                          textDecoration: "none",
                        }}
                      >
                        📊 Google Sheet
                      </a>
                    ) : (
                      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                        <input
                          value={sheetUrlInput}
                          onChange={(e) => setSheetUrlInput(e.target.value)}
                          placeholder="Pega URL del Google Sheet"
                          style={{
                            background: "rgba(255,255,255,0.05)",
                            border: "1px solid rgba(255,255,255,0.12)",
                            borderRadius: 8,
                            padding: "4px 8px",
                            color: "#e8f0f7",
                            fontFamily: "'Space Mono', monospace",
                            fontSize: "1rem",
                            outline: "none",
                            width: 240,
                          }}
                        />
                        <button
                          onClick={() => {
                            if (sheetUrlInput.trim()) {
                              setSheetUrl(sheetUrlInput.trim());
                              localStorage.setItem("pagoya_sheet_url", sheetUrlInput.trim());
                              setSheetUrlInput("");
                            }
                          }}
                          style={{
                            fontFamily: "'Space Mono', monospace",
                            fontSize: "1rem",
                            color: "#1D9E75",
                            background: "rgba(29,158,117,0.12)",
                            border: "1px solid rgba(29,158,117,0.3)",
                            borderRadius: 8,
                            padding: "8px 14px",
                            cursor: "pointer",
                          }}
                        >
                          Guardar
                        </button>
                      </div>
                    )}
                    <button
                      onClick={loadInvestorMetrics}
                      disabled={investorLoading}
                      style={{
                        fontFamily: "'Space Mono', monospace",
                        fontSize: "1rem",
                        color: "#39A935",
                        background: "rgba(57,169,53,0.12)",
                        border: "1px solid rgba(57,169,53,0.3)",
                        borderRadius: 20,
                        padding: "8px 16px",
                        cursor: "pointer",
                        opacity: investorLoading ? 0.5 : 1,
                      }}
                    >
                      {investorLoading ? "Cargando…" : "↻ Refrescar"}
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Loading skeleton */}
            {investorLoading && !investorData && adminKey.trim() && (
              <div style={{ textAlign: "center", fontFamily: "'Space Mono', monospace", fontSize: "0.85rem", color: "#5a7080", padding: "40px 0" }}>
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
              fontSize: "1rem",
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
                fontSize: "1rem",
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
                <div style={{ fontSize: "1.05rem", fontWeight: 800, color: card.color, marginBottom: 4, fontFamily: "'Space Mono', monospace" }}>
                  {card.value}
                </div>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.78rem", color: "#5a7080", lineHeight: 1.5, textTransform: "uppercase" }}>
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
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "1rem", letterSpacing: "0.08em", color: "#1D9E75", textTransform: "uppercase" }}>
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
                <div style={{ fontSize: "1.05rem", fontWeight: 800, color: card.color, marginBottom: 2, fontFamily: "'Space Mono', monospace" }}>
                  {card.value}
                </div>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.78rem", color: "#1D9E75", opacity: 0.7, marginBottom: 2, textTransform: "uppercase" }}>
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
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "1rem", color: "#5a7080", lineHeight: 1.4, textTransform: "uppercase" }}>
                  {card.label}
                </div>
              </div>
            ))}
          </div>
        )}

        {loading && (
          <div style={{ textAlign: "center", color: "#5a7080", fontFamily: "'Space Mono', monospace", fontSize: "1.05rem", padding: "40px 0" }}>
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
            fontSize: "0.85rem",
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
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.85rem", color: "#5a7080", lineHeight: 1.6 }}>
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
              fontSize: "1rem",
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
                fontSize: "1rem",
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
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "1rem", color: "#39A935", fontWeight: 700, marginBottom: 10, textTransform: "uppercase" }}>
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
                      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "1rem", color: "#5a7080", minWidth: 110, textTransform: "uppercase" }}>{label}</div>
                      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "1rem", color: "#e8f0f7", wordBreak: "break-all" }}>{val}</div>
                    </div>
                  ))}
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "1rem", color: "#5a7080", marginTop: 8 }}>
                    WhatsApp enviado · Rep puede iniciar sesión en /rep-login
                  </div>
                  <button
                    onClick={() => { setKitResult(null); }}
                    style={{
                      marginTop: 12,
                      fontFamily: "'Space Mono', monospace",
                      fontSize: "1rem",
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
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "1rem", color: "#1D9E75", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Nuevo Rep — Kit de Onboarding
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
                    {/* Name */}
                    <div>
                      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.78rem", color: "#5a7080", marginBottom: 4, textTransform: "uppercase" }}>Nombre completo</div>
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
                          fontSize: "1.05rem",
                          outline: "none",
                          boxSizing: "border-box",
                        }}
                      />
                    </div>
                    {/* Phone */}
                    <div>
                      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.78rem", color: "#5a7080", marginBottom: 4, textTransform: "uppercase" }}>WhatsApp (10 dígitos)</div>
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
                          fontSize: "1.05rem",
                          outline: "none",
                          boxSizing: "border-box",
                        }}
                      />
                    </div>
                    {/* Colonia */}
                    <div>
                      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.78rem", color: "#5a7080", marginBottom: 4, textTransform: "uppercase" }}>Colonia</div>
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
                          fontSize: "1.05rem",
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
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "1rem", color: "#E21A0A", marginBottom: 10 }}>
                      {kitError}
                    </div>
                  )}

                  <button
                    onClick={handleKitSubmit}
                    disabled={kitLoading}
                    style={{
                      fontFamily: "'Space Mono', monospace",
                      fontSize: "1rem",
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
                  <div key={h} style={{ fontFamily: "'Space Mono', monospace", fontSize: "1rem", color: "#5a7080", letterSpacing: "0.06em" }}>
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
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "1rem", color: "#5a7080" }}>
                      {rep.id} · {rep.phone}
                    </div>
                  </div>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "1.05rem", color: "#e8f0f7" }}>
                    <div style={{ fontWeight: 700 }}>{rep.signupCount}</div>
                    <div style={{ color: "#5a7080", fontSize: "1rem" }}>{fmt(rep.signupTotal)}</div>
                  </div>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "1.05rem", color: "#e8f0f7" }}>
                    <div style={{ fontWeight: 700 }}>{rep.referralCount}</div>
                    <div style={{ color: "#5a7080", fontSize: "1rem" }}>{fmt(rep.referralTotal)}</div>
                  </div>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "1.05rem", color: "#39A935" }}>
                    <div style={{ fontWeight: 700 }}>{rep.billPayCount}</div>
                    <div style={{ color: "#5a7080", fontSize: "1rem" }}>{fmt(rep.billPayTotal)}</div>
                  </div>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "1.05rem", color: "#F59E0B" }}>
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
                        fontSize: "1rem",
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
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "1rem", letterSpacing: "0.08em", color: "#5a7080", textTransform: "uppercase" }}>
              Usuarios por Colonia · {coloniaLoading ? "…" : `${colonia?.total ?? 0} registrados`}
            </div>
          </div>
          <div style={{ padding: "14px 16px" }}>
            {coloniaLoading ? (
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "1rem", color: "#5a7080" }}>Cargando…</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {(colonia?.breakdown ?? []).map((row) => (
                  <div key={row.colonia} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "1rem", color: "#e8f0f7", minWidth: 160 }}>
                      {row.colonia}
                    </div>
                    <div style={{ flex: 1, background: "rgba(255,255,255,0.06)", borderRadius: 4, height: 6, overflow: "hidden" }}>
                      <div style={{ width: `${row.pct}%`, height: "100%", background: "#1D9E75", borderRadius: 4 }} />
                    </div>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "1rem", color: "#1D9E75", minWidth: 52, textAlign: "right" }}>
                      {row.count} <span style={{ color: "#5a7080" }}>({row.pct}%)</span>
                    </div>
                  </div>
                ))}
                {(colonia?.breakdown ?? []).length === 0 && (
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "1rem", color: "#5a7080" }}>Sin datos aún.</div>
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
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "1rem", letterSpacing: "0.08em", color: "#5a7080", textTransform: "uppercase" }}>
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
                  fontSize: "1.05rem",
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
                  fontSize: "1rem",
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
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "1rem", color: "#E21A0A", marginBottom: 10 }}>
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
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "1.05rem", color: "#1D9E75", fontWeight: 700 }}>
                    {userTxData.user.name}
                  </div>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "1rem", color: "#5a7080", marginTop: 4 }}>
                    {userTxData.user.phone} · {userTxData.user.colonia ?? "—"} · ID {userTxData.user.id}
                  </div>
                </div>

                {userTxData.transactions.length === 0 ? (
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "1rem", color: "#5a7080" }}>Sin transacciones.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px 80px", gap: 0, padding: "4px 0 8px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                      {["DESCRIPCIÓN", "TIPO", "MONTO", "SALDO"].map((h) => (
                        <div key={h} style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.78rem", color: "#5a7080", letterSpacing: "0.06em" }}>{h}</div>
                      ))}
                    </div>
                    {userTxData.transactions.map((tx) => {
                      const amt = parseFloat(tx.amount ?? "0");
                      return (
                        <div key={tx.id} style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px 80px", gap: 0, padding: "7px 0", borderBottom: "1px solid rgba(255,255,255,0.03)", alignItems: "center" }}>
                          <div>
                            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "1rem", color: "#e8f0f7" }}>{tx.description ?? "—"}</div>
                            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.78rem", color: "#5a7080", marginTop: 2 }}>
                              {tx.createdAt ? new Date(tx.createdAt).toLocaleString("es-MX", { timeZone: "America/Mexico_City", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"}
                            </div>
                          </div>
                          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "1rem", color: "#5a7080" }}>{tx.type}</div>
                          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "1rem", color: amt >= 0 ? "#1D9E75" : "#E21A0A", fontWeight: 700 }}>
                            {amt >= 0 ? "+" : ""}${Math.abs(amt).toFixed(2)}
                          </div>
                          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "1rem", color: "#e8f0f7" }}>
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
              fontSize: "1rem",
              letterSpacing: "0.08em",
              color: "#00C875",
              textTransform: "uppercase",
            }}>
              Enviar Dinero · Admin Credit
            </div>
            <div style={{
              marginLeft: "auto",
              fontFamily: "'Space Mono', monospace",
              fontSize: "0.78rem",
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
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "1.05rem", color: "#00C875", fontWeight: 700, marginBottom: 6 }}>
                  ✓ Crédito Enviado
                </div>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "1rem", color: "#e8f0f7", marginBottom: 4 }}>
                  {creditResult.phone} recibió <strong>${creditResult.credited.toFixed(2)} MXN</strong>
                </div>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "1rem", color: "#5a7080", marginBottom: 4 }}>
                  Saldo nuevo: ${creditResult.newBalanceMXN.toFixed(2)} MXN
                </div>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.78rem", color: "#3a5060", marginBottom: 12 }}>
                  TX: {creditResult.transactionId}
                </div>
                <button
                  onClick={() => setCreditResult(null)}
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: "1rem",
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
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "1rem", color: "#5a7080", marginBottom: 4, letterSpacing: "0.06em", textTransform: "uppercase" }}>
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
                        fontSize: "1.05rem",
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                  <div>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "1rem", color: "#5a7080", marginBottom: 4, letterSpacing: "0.06em", textTransform: "uppercase" }}>
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
                        fontSize: "1.05rem",
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "1rem", color: "#5a7080", marginBottom: 4, letterSpacing: "0.06em", textTransform: "uppercase" }}>
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
                      fontSize: "1.05rem",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "1rem", color: "#5a7080", marginBottom: 4, letterSpacing: "0.06em", textTransform: "uppercase" }}>
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
                      fontSize: "1.05rem",
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                {creditError && (
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "1rem", color: "#E21A0A" }}>
                    {creditError}
                  </div>
                )}

                <button
                  onClick={handleCreditSubmit}
                  disabled={creditLoading}
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: "1.05rem",
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

        {/* ══════════════ PROPIETARIOS TAB ══════════════ */}
        {tab === "landlords" && (
          <div>
            {/* Header bar */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "1rem", color: "#5a7080", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                {landlordLoading ? "Cargando…" : `${landlords.length} propietario${landlords.length !== 1 ? "s" : ""} registrado${landlords.length !== 1 ? "s" : ""}`}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={loadLandlords}
                  disabled={landlordLoading}
                  style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.9rem", color: "#39A935", background: "rgba(57,169,53,0.1)", border: "1px solid rgba(57,169,53,0.3)", borderRadius: 20, padding: "6px 16px", cursor: "pointer" }}
                >
                  ↻ Actualizar
                </button>
                <button
                  onClick={() => { setShowAddModal(true); setAddSuccess(null); setAddError(""); setAddForm({ full_name: "", email: "", whatsapp: "", units: "1", city: "Puerto Vallarta", notes: "" }); }}
                  style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.9rem", fontWeight: 700, color: "#fff", background: "linear-gradient(135deg,#007A4A,#39A935)", border: "none", borderRadius: 20, padding: "6px 18px", cursor: "pointer" }}
                >
                  + Agregar Propietario
                </button>
              </div>
            </div>

            {!adminKey.trim() && (
              <div style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 12, padding: 16, marginBottom: 20, fontFamily: "'Space Mono', monospace", fontSize: "1rem", color: "#F59E0B" }}>
                Ingresa tu Admin Key en la pestaña Investor View primero.
              </div>
            )}

            {landlordError && (
              <div style={{ background: "rgba(226,26,10,0.08)", border: "1px solid rgba(226,26,10,0.3)", borderRadius: 10, padding: "12px 16px", marginBottom: 16, fontFamily: "'Space Mono', monospace", fontSize: "1rem", color: "#E21A0A" }}>
                Error {landlordError}
              </div>
            )}

            {/* Table */}
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, overflow: "hidden" }}>
              <div style={{ display: "grid", gridTemplateColumns: "90px 1fr 80px 100px 110px 110px 80px 1fr", borderBottom: "1px solid rgba(255,255,255,0.08)", padding: "10px 14px" }}>
                {["Código","Nombre","Uds","Referidos","Comisión","Estado","Fecha","Link"].map(h => (
                  <div key={h} style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.78rem", color: "#5a7080", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</div>
                ))}
              </div>

              {landlords.length === 0 && !landlordLoading && (
                <div style={{ padding: "32px 14px", textAlign: "center", fontFamily: "'Space Mono', monospace", fontSize: "1rem", color: "#5a7080" }}>
                  Sin propietarios aún. Agrega el primero →
                </div>
              )}

              {landlords.map((lnd, i) => (
                <div
                  key={lnd.landlord_code}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "90px 1fr 80px 100px 110px 110px 80px 1fr",
                    padding: "12px 14px",
                    borderBottom: i < landlords.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
                    alignItems: "center",
                  }}
                >
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.9rem", color: "#F59E0B", fontWeight: 700 }}>{lnd.landlord_code}</div>
                  <div>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.9rem", color: "#e8f0f7" }}>{lnd.full_name}</div>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.78rem", color: "#5a7080" }}>{lnd.email}</div>
                  </div>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.9rem", color: "#e8f0f7" }}>{lnd.units}</div>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.9rem", color: "#39A935", fontWeight: 700 }}>{lnd.referred_users}</div>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.9rem", color: "#00C875", fontWeight: 700 }}>${lnd.total_commission_mxn} MXN</div>
                  <div>
                    <span style={{
                      fontFamily: "'Space Mono', monospace",
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      padding: "3px 10px",
                      borderRadius: 20,
                      background: lnd.status === "active" ? "rgba(57,169,53,0.15)" : "rgba(90,112,128,0.15)",
                      color: lnd.status === "active" ? "#39A935" : "#5a7080",
                      border: `1px solid ${lnd.status === "active" ? "rgba(57,169,53,0.3)" : "rgba(90,112,128,0.2)"}`,
                    }}>
                      {lnd.status === "active" ? "Activo" : "Inactivo"}
                    </span>
                  </div>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.78rem", color: "#5a7080" }}>
                    {new Date(lnd.created_at).toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric" })}
                  </div>
                  <div>
                    {lnd.referral_link ? (
                      <button
                        onClick={() => copyLink(lnd.referral_link!, lnd.landlord_code)}
                        style={{
                          fontFamily: "'Space Mono', monospace",
                          fontSize: "0.78rem",
                          color: copiedCode === lnd.landlord_code ? "#39A935" : "#1D9E75",
                          background: "rgba(29,158,117,0.1)",
                          border: "1px solid rgba(29,158,117,0.25)",
                          borderRadius: 8,
                          padding: "4px 10px",
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {copiedCode === lnd.landlord_code ? "✓ Copiado" : "📋 Copiar link"}
                      </button>
                    ) : <span style={{ color: "#5a7080", fontSize: "0.78rem" }}>—</span>}
                  </div>
                </div>
              ))}
            </div>

            {/* Add Landlord Modal */}
            {showAddModal && (
              <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
                <div style={{ background: "#0A2540", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 16, padding: 28, width: "100%", maxWidth: 440 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "1.1rem", color: "#e8f0f7", fontWeight: 700 }}>🏠 Agregar Propietario</div>
                    <button onClick={() => setShowAddModal(false)} style={{ background: "none", border: "none", color: "#5a7080", fontSize: "1.2rem", cursor: "pointer" }}>✕</button>
                  </div>

                  {addSuccess ? (
                    <div>
                      <div style={{ background: "rgba(57,169,53,0.1)", border: "1px solid rgba(57,169,53,0.3)", borderRadius: 10, padding: 16, marginBottom: 16 }}>
                        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "1rem", color: "#39A935", fontWeight: 700, marginBottom: 8 }}>✓ Registrado exitosamente</div>
                        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.9rem", color: "#e8f0f7", marginBottom: 4 }}>Código: <strong>{addSuccess.landlord_code}</strong></div>
                        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.82rem", color: "#5a7080", wordBreak: "break-all" }}>{addSuccess.referral_link}</div>
                      </div>
                      <button
                        onClick={() => copyLink(addSuccess.referral_link, addSuccess.landlord_code)}
                        style={{ width: "100%", fontFamily: "'Space Mono', monospace", fontSize: "0.9rem", fontWeight: 700, color: "#fff", background: "#39A935", border: "none", borderRadius: 10, padding: "10px 0", cursor: "pointer", marginBottom: 8 }}
                      >
                        {copiedCode === addSuccess.landlord_code ? "✓ Link copiado" : "📋 Copiar link de referido"}
                      </button>
                      <button
                        onClick={() => { setShowAddModal(false); setAddSuccess(null); }}
                        style={{ width: "100%", fontFamily: "'Space Mono', monospace", fontSize: "0.9rem", color: "#5a7080", background: "transparent", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, padding: "10px 0", cursor: "pointer" }}
                      >
                        Cerrar
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {[
                        { label: "Nombre completo *", key: "full_name", placeholder: "Juan García López" },
                        { label: "Email *", key: "email", placeholder: "juan@gmail.com" },
                        { label: "WhatsApp", key: "whatsapp", placeholder: "3221234567" },
                        { label: "Unidades (# de cuartos/deptos)", key: "units", placeholder: "1" },
                        { label: "Ciudad", key: "city", placeholder: "Puerto Vallarta" },
                        { label: "Notas", key: "notes", placeholder: "Opcional" },
                      ].map(({ label, key, placeholder }) => (
                        <div key={key}>
                          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.78rem", color: "#5a7080", textTransform: "uppercase", marginBottom: 4 }}>{label}</div>
                          <input
                            value={addForm[key as keyof typeof addForm]}
                            onChange={e => setAddForm(f => ({ ...f, [key]: e.target.value }))}
                            placeholder={placeholder}
                            style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "10px 12px", color: "#e8f0f7", fontFamily: "'Space Mono', monospace", fontSize: "0.9rem", outline: "none", boxSizing: "border-box" }}
                          />
                        </div>
                      ))}

                      {addError && (
                        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.9rem", color: "#E21A0A" }}>{addError}</div>
                      )}

                      <button
                        onClick={handleAddLandlord}
                        disabled={addLoading}
                        style={{ fontFamily: "'Space Mono', monospace", fontSize: "1rem", fontWeight: 700, color: "#fff", background: addLoading ? "rgba(57,169,53,0.4)" : "linear-gradient(135deg,#007A4A,#39A935)", border: "none", borderRadius: 10, padding: "12px 0", cursor: addLoading ? "not-allowed" : "pointer", marginTop: 4 }}
                      >
                        {addLoading ? "Registrando…" : "Registrar Propietario"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════ CUMPLIMIENTO TAB ══════════════ */}
        {tab === "compliance" && (
          <div className="cumplimiento-print-target">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "1rem", color: "#5a7080", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                {complianceLoading ? "Cargando…" : complianceData ? `Actualizado: ${new Date(complianceData.as_of).toLocaleString("es-MX")}` : "Resumen regulatorio en tiempo real"}
              </div>
              <div style={{ display: "flex", gap: 8 }} className="export-buttons">
                <button
                  onClick={() => {
                    if (!complianceData) return;
                    const cd = complianceData;
                    const now = new Date();
                    const dateStr = now.toISOString().split("T")[0];
                    const rows = [
                      `"PagoYa Compliance Summary"`,
                      `"Generated: ${now.toLocaleString("es-MX")}"`,
                      `"pagoyamx.com"`,
                      `""`,
                      `"Metric","Value"`,
                      `"Total Usuarios","${cd.users.total}"`,
                      `"Nuevos (30d)","${cd.users.new_30d}"`,
                      `"CURP en Archivo","${cd.users.curp_on_file}"`,
                      `"KYC Estándar+","${cd.users.kyc_upgraded}"`,
                      `"PTI Asignado","${cd.users.pti_scored}"`,
                      `"Via Institución","${cd.users.from_institution}"`,
                      `""`,
                      `"KYC Tier","Usuarios"`,
                      ...cd.kyc_tiers.map(r => `"${r.kyc_tier}","${r.n}"`),
                      `""`,
                      `"PTI Tier","Usuarios"`,
                      ...cd.pti_tiers.map(r => `"${r.tier}","${r.n}"`),
                      `""`,
                      `"Semana","Transacciones","Volumen MXN","Promedio MXN"`,
                      ...cd.weekly_tx.map(r => `"${r.week_start}","${r.tx_count}","${r.volume_mxn}","${r.avg_mxn}"`),
                      `""`,
                      `"Infraestructura","PostgreSQL (Replit) — respaldo diario automático"`,
                      `"Retención","Mínimo 10 años per Ley Fintech 2018 Art. 58"`,
                      `"Contacto auditoría","alianzas@pagoyamx.com"`,
                    ];
                    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `PagoYa_Compliance_${dateStr}.csv`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  disabled={!complianceData}
                  style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.82rem", color: "#9CA3AF", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: "6px 14px", cursor: complianceData ? "pointer" : "not-allowed", opacity: complianceData ? 1 : 0.4 }}
                >
                  ⬇ CSV
                </button>
                <button
                  onClick={() => {
                    const el = document.querySelector(".cumplimiento-print-target");
                    if (el) el.classList.add("print-mode");
                    window.print();
                    setTimeout(() => { if (el) el.classList.remove("print-mode"); }, 1000);
                  }}
                  style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.82rem", color: "#9CA3AF", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: "6px 14px", cursor: "pointer" }}
                >
                  🖨 PDF
                </button>
                <button
                  onClick={loadCompliance}
                  disabled={complianceLoading}
                  style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.9rem", color: "#39A935", background: "rgba(57,169,53,0.1)", border: "1px solid rgba(57,169,53,0.3)", borderRadius: 20, padding: "6px 16px", cursor: "pointer" }}
                >
                  ↻ Actualizar
                </button>
              </div>
            </div>

            {!adminKey.trim() && (
              <div style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 12, padding: 16, marginBottom: 20, fontFamily: "'Space Mono', monospace", fontSize: "1rem", color: "#F59E0B" }}>
                Ingresa tu Admin Key en la pestaña Investor View primero.
              </div>
            )}
            {complianceError && (
              <div style={{ background: "rgba(226,26,10,0.08)", border: "1px solid rgba(226,26,10,0.3)", borderRadius: 10, padding: "12px 16px", marginBottom: 16, fontFamily: "'Space Mono', monospace", fontSize: "1rem", color: "#E21A0A" }}>
                Error {complianceError}
              </div>
            )}

            {complianceData && (() => {
              const cd = complianceData;
              const totalKyc = cd.kyc_tiers.reduce((a, r) => a + r.n, 0) || 1;
              const totalPti = cd.pti_tiers.reduce((a, r) => a + r.n, 0) || 1;
              const tierColor = (tier: string) => tier === "enhanced" ? "#39A935" : tier === "standard" ? "#F59E0B" : "#5a7080";
              const ptiColor = (tier: string) => tier === "Oro" ? "#F59E0B" : tier === "Plata" ? "#9CA3AF" : "#CD7F32";
              return (
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

                  {/* KPI row */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
                    {[
                      ["Usuarios total", cd.users.total],
                      ["Nuevos 30d", cd.users.new_30d],
                      ["CURP en archivo", cd.users.curp_on_file],
                      ["KYC Estándar+", cd.users.kyc_upgraded],
                      ["PTI asignado", cd.users.pti_scored],
                      ["Vía institución", cd.users.from_institution],
                    ].map(([label, val]) => (
                      <div key={String(label)} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "16px 14px" }}>
                        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.78rem", color: "#5a7080", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>{label}</div>
                        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "1.6rem", fontWeight: 700, color: "#e8f0f7" }}>{val}</div>
                      </div>
                    ))}
                  </div>

                  {/* KYC tiers + PTI tiers side by side */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    {/* KYC tier distribution */}
                    <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 20 }}>
                      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.78rem", color: "#5a7080", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14 }}>KYC Tier — Distribución</div>
                      {cd.kyc_tiers.length === 0
                        ? <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.9rem", color: "#5a7080" }}>Sin datos</div>
                        : cd.kyc_tiers.map(row => (
                          <div key={row.kyc_tier} style={{ marginBottom: 12 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "'Space Mono', monospace", fontSize: "0.9rem", marginBottom: 4 }}>
                              <span style={{ color: tierColor(row.kyc_tier), textTransform: "uppercase" }}>{row.kyc_tier}</span>
                              <span style={{ color: "#e8f0f7" }}>{row.n} ({Math.round(row.n / totalKyc * 100)}%)</span>
                            </div>
                            <div style={{ height: 8, background: "rgba(255,255,255,0.06)", borderRadius: 4, overflow: "hidden" }}>
                              <div style={{ height: "100%", width: `${Math.round(row.n / totalKyc * 100)}%`, background: tierColor(row.kyc_tier), borderRadius: 4 }} />
                            </div>
                          </div>
                        ))
                      }
                    </div>

                    {/* PTI tier distribution */}
                    <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 20 }}>
                      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.78rem", color: "#5a7080", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14 }}>PTI Tier — Distribución</div>
                      {cd.pti_tiers.length === 0
                        ? <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.9rem", color: "#5a7080" }}>Sin usuarios con PTI asignado aún</div>
                        : cd.pti_tiers.map(row => (
                          <div key={row.tier} style={{ marginBottom: 12 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "'Space Mono', monospace", fontSize: "0.9rem", marginBottom: 4 }}>
                              <span style={{ color: ptiColor(row.tier) }}>{row.tier}</span>
                              <span style={{ color: "#e8f0f7" }}>{row.n} ({Math.round(row.n / totalPti * 100)}%)</span>
                            </div>
                            <div style={{ height: 8, background: "rgba(255,255,255,0.06)", borderRadius: 4, overflow: "hidden" }}>
                              <div style={{ height: "100%", width: `${Math.round(row.n / totalPti * 100)}%`, background: ptiColor(row.tier), borderRadius: 4 }} />
                            </div>
                          </div>
                        ))
                      }
                    </div>
                  </div>

                  {/* Weekly transaction volume */}
                  <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: 20 }}>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.78rem", color: "#5a7080", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 14 }}>Volumen Transaccional — 8 Semanas</div>
                    {cd.weekly_tx.length === 0
                      ? <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.9rem", color: "#5a7080" }}>Sin transacciones en este período</div>
                      : (
                        <div style={{ overflowX: "auto" }}>
                          <div style={{ display: "grid", gridTemplateColumns: "120px 80px 120px 100px", fontFamily: "'Space Mono', monospace", fontSize: "0.78rem", color: "#5a7080", textTransform: "uppercase", letterSpacing: "0.06em", padding: "0 0 10px", borderBottom: "1px solid rgba(255,255,255,0.06)", marginBottom: 10 }}>
                            {["Semana", "Txns", "Volumen", "Promedio"].map(h => <div key={h}>{h}</div>)}
                          </div>
                          {cd.weekly_tx.map(row => (
                            <div key={row.week_start} style={{ display: "grid", gridTemplateColumns: "120px 80px 120px 100px", fontFamily: "'Space Mono', monospace", fontSize: "0.9rem", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                              <div style={{ color: "#9CA3AF" }}>{row.week_start}</div>
                              <div style={{ color: "#e8f0f7" }}>{row.tx_count}</div>
                              <div style={{ color: "#39A935" }}>${row.volume_mxn.toLocaleString("es-MX", { maximumFractionDigits: 0 })}</div>
                              <div style={{ color: "#9CA3AF" }}>${row.avg_mxn.toLocaleString("es-MX", { maximumFractionDigits: 0 })}</div>
                            </div>
                          ))}
                        </div>
                      )
                    }
                  </div>

                  {/* ── Part 3: Glosario de Datos ─────────────────────── */}
                  <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14 }}>
                    <button
                      onClick={() => setGlosarioOpen(o => !o)}
                      style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", background: "none", border: "none", cursor: "pointer", fontFamily: "'Space Mono', monospace", fontSize: "0.85rem", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em" }}
                    >
                      <span>📋 Glosario de Datos / Data Dictionary</span>
                      <span style={{ fontSize: "1rem", transform: glosarioOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▾</span>
                    </button>
                    {glosarioOpen && (
                      <div style={{ padding: "0 20px 20px", overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'Space Mono', monospace", fontSize: "0.8rem" }}>
                          <thead>
                            <tr>
                              <th style={{ textAlign: "left", color: "#5a7080", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", padding: "8px 12px 8px 0", borderBottom: "1px solid rgba(255,255,255,0.06)", width: "30%" }}>Término</th>
                              <th style={{ textAlign: "left", color: "#5a7080", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>Definición</th>
                            </tr>
                          </thead>
                          <tbody>
                            {([
                              ["kyc_tier: simplified", "Usuario verificado por teléfono OTP. Transacciones acumuladas < $3,200 MXN. Aplica KYC simplificado per Ley Fintech."],
                              ["kyc_tier: standard", "Usuario que alcanzó $3,200 MXN en transacciones. CURP solicitado vía Paula."],
                              ["kyc_tier: enhanced", "Usuario con CURP + INE verificados. Asignado manualmente por el administrador."],
                              ["PTI: Bronce", "Score 0–49. Usuario nuevo o irregular. < 3 pagos completados o rachas cortas."],
                              ["PTI: Plata", "Score 50–74. Usuario establecido. Pago consistente, racha activa."],
                              ["PTI: Oro", "Score 75–100. Usuario de alta confianza. Racha larga, comportamiento predecible."],
                              ["Transacciones (8 sem.)", "Pagos de servicios completados en las últimas 8 semanas. No incluye cargas de saldo ni intentos fallidos."],
                              ["CURP registrado", "Usuarios que han proporcionado su CURP vía Paula o perfil. Base para tier standard/enhanced."],
                              ["Atrib. Institucional", "Usuarios referidos por un socio institucional via referred_by_institution."],
                              ["Actualización", "Los datos se actualizan en tiempo real desde la base de datos de producción. PTI se recalcula cada noche a las 2 AM MX."],
                            ] as [string, string][]).map(([term, def]) => (
                              <tr key={term}>
                                <td style={{ padding: "10px 12px 10px 0", color: "#F59E0B", borderBottom: "1px solid rgba(255,255,255,0.04)", verticalAlign: "top" }}>{term}</td>
                                <td style={{ padding: "10px 0", color: "#9CA3AF", borderBottom: "1px solid rgba(255,255,255,0.04)", lineHeight: 1.55 }}>{def}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <p style={{ marginTop: 14, fontFamily: "'Space Mono', monospace", fontSize: "0.75rem", color: "#5a7080", fontStyle: "italic" }}>
                          Este glosario está disponible para revisión en procesos de due diligence institucional.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* ── Part 5: Infrastructure Note ───────────────────── */}
                  <div style={{ borderLeft: "3px solid #1D3557", background: "rgba(29,53,87,0.15)", borderRadius: "0 12px 12px 0", padding: "18px 20px" }}>
                    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.82rem", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>🗄️ Infraestructura y Retención de Datos</div>
                    <p style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.82rem", color: "#5a7080", lineHeight: 1.65, margin: "0 0 8px" }}>
                      <strong style={{ color: "#9CA3AF" }}>Plataforma actual:</strong> PostgreSQL (Replit), con respaldo automático diario. Historial completo de transacciones desde el inicio de operaciones.
                    </p>
                    <p style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.82rem", color: "#5a7080", lineHeight: 1.65, margin: "0 0 8px" }}>
                      <strong style={{ color: "#9CA3AF" }}>Retención comprometida:</strong> Mínimo 10 años per Ley Fintech 2018, Art. 58. Todos los registros de usuario, transacciones y actividad sospechosa se conservan en base de datos estructurada con timestamps inmutables.
                    </p>
                    <p style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.82rem", color: "#5a7080", lineHeight: 1.65, margin: "0 0 8px" }}>
                      <strong style={{ color: "#9CA3AF" }}>Plan post-financiamiento:</strong> Migración a infraestructura cloud dedicada (AWS RDS o Google Cloud SQL) con replicación multi-región, backups point-in-time, y auditoría de acceso. Estimado: Q2 2027.
                    </p>
                    <p style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.82rem", color: "#5a7080", margin: 0 }}>
                      <strong style={{ color: "#9CA3AF" }}>Contacto para auditoría:</strong>{" "}
                      <a href="mailto:alianzas@pagoyamx.com" style={{ color: "#39A935", textDecoration: "none" }}>alianzas@pagoyamx.com</a>
                    </p>
                  </div>

                  {/* Footer link */}
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.85rem", color: "#5a7080" }}>
                    Política completa:{" "}
                    <a href="/cumplimiento" target="_blank" rel="noopener noreferrer" style={{ color: "#39A935", textDecoration: "none" }}>pagoyamx.com/cumplimiento</a>
                    {" · "}
                    <a href="/atencion" target="_blank" rel="noopener noreferrer" style={{ color: "#39A935", textDecoration: "none" }}>Centro de Atención</a>
                  </div>

                </div>
              );
            })()}
          </div>
        )}

        {/* ══════════════ SOPORTE TAB ══════════════ */}
        {/* ══════════════ REP MANAGEMENT TAB ══════════════ */}
        {tab === "reps" && (
          <div>
            {!adminKey.trim() && (
              <div style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 12, padding: 16, marginBottom: 20 }}>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.85rem", color: "#F59E0B", textTransform: "uppercase" }}>
                  Ingresa tu Admin Key arriba para ver datos en vivo
                </div>
              </div>
            )}

            {/* ── Summary strip ── */}
            {repStats.length > 0 && (() => {
              const totalReps   = repStats.filter(r => r.status === "active").length;
              const totalRec    = repStats.reduce((s, r) => s + Number(r.signup_count), 0);
              const totalConv   = repStats.reduce((s, r) => s + Number(r.converted_count), 0);
              const totalComm   = repStats.reduce((s, r) => s + parseFloat(r.commission_total ?? "0"), 0);
              const convPct     = totalRec > 0 ? ((totalConv / totalRec) * 100).toFixed(0) : "0";
              return (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 24 }}>
                  {[
                    { label: "Reps Activos",     value: String(totalReps),  color: "#e8f0f7" },
                    { label: "Usuarios Reclutados", value: String(totalRec), color: "#1D9E75" },
                    { label: `Convertidos (${convPct}%)`, value: String(totalConv), color: "#39A935" },
                    { label: "Comisiones Totales", value: `$${totalComm.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`, color: "#6366F1" },
                  ].map(card => (
                    <div key={card.label} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "14px 10px", textAlign: "center" }}>
                      <div style={{ fontSize: "1.2rem", fontWeight: 800, color: card.color, marginBottom: 4, fontFamily: "'Space Mono', monospace" }}>{card.value}</div>
                      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.72rem", color: "#5a7080", textTransform: "uppercase", letterSpacing: "0.06em" }}>{card.label}</div>
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* ── Leaderboard panel ── */}
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, overflow: "hidden", marginBottom: 24 }}>

              {/* Panel header + Add Rep button */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px 10px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "1rem", letterSpacing: "0.08em", color: "#5a7080", textTransform: "uppercase" }}>
                  Reps · Leaderboard
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={loadRepStats} disabled={repStatsLoading} style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.82rem", color: "#39A935", background: "rgba(57,169,53,0.1)", border: "1px solid rgba(57,169,53,0.25)", borderRadius: 20, padding: "3px 10px", cursor: "pointer", opacity: repStatsLoading ? 0.5 : 1 }}>
                    ↻ Actualizar
                  </button>
                  <button onClick={() => { setRepKitOpen(o => !o); setRepKitResult(null); setRepKitError(""); }} style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.82rem", fontWeight: 700, color: repKitOpen ? "#F59E0B" : "#1D9E75", background: repKitOpen ? "rgba(245,158,11,0.1)" : "rgba(29,158,117,0.12)", border: `1px solid ${repKitOpen ? "rgba(245,158,11,0.35)" : "rgba(29,158,117,0.35)"}`, borderRadius: 20, padding: "3px 12px", cursor: "pointer" }}>
                    {repKitOpen ? "✕ Cerrar" : "+ Agregar Rep"}
                  </button>
                </div>
              </div>

              {/* Create Rep form */}
              {repKitOpen && (
                <div style={{ padding: 16, borderBottom: "1px solid rgba(255,255,255,0.07)", background: "rgba(29,158,117,0.04)" }}>
                  {repKitResult ? (
                    <div style={{ background: "rgba(57,169,53,0.1)", border: "1px solid rgba(57,169,53,0.3)", borderRadius: 10, padding: 16 }}>
                      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.85rem", color: "#39A935", fontWeight: 700, marginBottom: 10, textTransform: "uppercase" }}>✅ Rep Creado</div>
                      {([["Código", repKitResult.repCode], ["Link", repKitResult.referralLink], ["Email", repKitResult.email], ["Contraseña inicial", repKitResult.initialPassword]] as [string, string][]).map(([l, v]) => (
                        <div key={l} style={{ display: "flex", gap: 8, marginBottom: 5 }}>
                          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.75rem", color: "#5a7080", minWidth: 110, textTransform: "uppercase" }}>{l}</div>
                          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.82rem", color: "#e8f0f7", wordBreak: "break-all" }}>{v}</div>
                        </div>
                      ))}
                      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.75rem", color: "#5a7080", marginTop: 8 }}>WhatsApp enviado ✓</div>
                      <button onClick={() => setRepKitResult(null)} style={{ marginTop: 10, fontFamily: "'Space Mono', monospace", fontSize: "0.82rem", color: "#1D9E75", background: "rgba(29,158,117,0.12)", border: "1px solid rgba(29,158,117,0.3)", borderRadius: 20, padding: "3px 12px", cursor: "pointer" }}>+ Crear otro</button>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.82rem", color: "#1D9E75", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.06em" }}>Nuevo Rep — Kit de Onboarding</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
                        {[
                          { label: "Nombre completo", val: repKitName, set: setRepKitName, ph: "Ej. María García" },
                          { label: "WhatsApp (10 dígitos)", val: repKitPhone, set: setRepKitPhone, ph: "3221234567" },
                        ].map(({ label, val, set, ph }) => (
                          <div key={label}>
                            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.72rem", color: "#5a7080", marginBottom: 4, textTransform: "uppercase" }}>{label}</div>
                            <input value={val} onChange={e => set(e.target.value)} placeholder={ph}
                              style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "8px 10px", color: "#e8f0f7", fontFamily: "'Space Mono', monospace", fontSize: "0.9rem", outline: "none", boxSizing: "border-box" }} />
                          </div>
                        ))}
                        <div>
                          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.72rem", color: "#5a7080", marginBottom: 4, textTransform: "uppercase" }}>Colonia</div>
                          <select value={repKitColonia} onChange={e => setRepKitColonia(e.target.value)}
                            style={{ width: "100%", background: "#0A2540", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "8px 10px", color: "#e8f0f7", fontFamily: "'Space Mono', monospace", fontSize: "0.9rem", outline: "none", boxSizing: "border-box" }}>
                            {COLONIAS.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                      </div>
                      {repKitError && <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.82rem", color: "#E21A0A", marginBottom: 8 }}>{repKitError}</div>}
                      <button onClick={handleRepKitSubmit} disabled={repKitLoading}
                        style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.85rem", fontWeight: 700, color: "#fff", background: repKitLoading ? "rgba(29,158,117,0.4)" : "#1D9E75", border: "none", borderRadius: 8, padding: "9px 20px", cursor: repKitLoading ? "not-allowed" : "pointer" }}>
                        {repKitLoading ? "Creando…" : "Generar Kit y Enviar WhatsApp"}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Table header */}
              {!repStatsLoading && repStats.length > 0 && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 72px 96px 100px 96px 80px 72px", gap: 0, padding: "8px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  {["REP", "RECL.", "CONV.", "COMISIÓN", "PENDIENTE", "ACTIVIDAD", ""].map(h => (
                    <div key={h} style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.72rem", color: "#5a7080", letterSpacing: "0.07em", textTransform: "uppercase" }}>{h}</div>
                  ))}
                </div>
              )}

              {repStatsLoading && (
                <div style={{ padding: "32px 20px", textAlign: "center", fontFamily: "'Space Mono', monospace", fontSize: "0.85rem", color: "#5a7080" }}>Cargando reps…</div>
              )}
              {repStatsError && (
                <div style={{ padding: 16, fontFamily: "'Space Mono', monospace", fontSize: "0.82rem", color: "#E21A0A" }}>{repStatsError}</div>
              )}
              {!repStatsLoading && repStats.length === 0 && !repStatsError && (
                <div style={{ padding: "32px 20px", textAlign: "center", fontFamily: "'Space Mono', monospace", fontSize: "0.85rem", color: "#5a7080" }}>
                  Sin reps registrados. Haz clic en "+ Agregar Rep" para comenzar.
                </div>
              )}

              {/* Rep rows */}
              {repStats.map(rep => {
                const convPct = Number(rep.signup_count) > 0
                  ? ((Number(rep.converted_count) / Number(rep.signup_count)) * 100).toFixed(0)
                  : "0";
                const commTotal = parseFloat(rep.commission_total ?? "0");
                const commPend  = parseFloat(rep.commission_pending ?? "0");
                const isExpanded = expandedRepCode === rep.repCode;
                const isActive = rep.status === "active";

                return (
                  <div key={rep.id}>
                    {/* Rep summary row */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 72px 96px 100px 96px 80px 72px", gap: 0, padding: "12px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)", alignItems: "center", opacity: isActive ? 1 : 0.5 }}>
                      {/* Name + code */}
                      <div>
                        <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "#e8f0f7" }}>{rep.name}</div>
                        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.72rem", color: "#1D9E75" }}>{rep.repCode}</div>
                        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.68rem", color: "#5a7080" }}>{rep.phone} · {rep.joined}</div>
                      </div>
                      {/* Recruited */}
                      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "1rem", fontWeight: 700, color: "#e8f0f7", textAlign: "center" }}>{rep.signup_count}</div>
                      {/* Converted */}
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "1rem", fontWeight: 700, color: Number(rep.converted_count) > 0 ? "#39A935" : "#5a7080" }}>{rep.converted_count}</div>
                        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.68rem", color: "#5a7080" }}>{convPct}%</div>
                      </div>
                      {/* Commission total */}
                      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.82rem", fontWeight: 700, color: "#6366F1" }}>
                        ${commTotal.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                      </div>
                      {/* Commission pending */}
                      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.82rem", color: "#F59E0B" }}>
                        {commPend > 0 ? `$${commPend.toLocaleString("es-MX", { minimumFractionDigits: 2 })}` : "—"}
                      </div>
                      {/* Last activity */}
                      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.68rem", color: rep.last_activity ? "#1D9E75" : "#5a7080" }}>
                        {rep.last_activity ?? "—"}
                      </div>
                      {/* Action buttons */}
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <button
                          onClick={() => {
                            const next = isExpanded ? null : rep.repCode;
                            setExpandedRepCode(next);
                            if (next) loadRepUsers(next);
                          }}
                          style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.68rem", color: "#39A935", background: "transparent", border: "1px solid rgba(57,169,53,0.25)", borderRadius: 12, padding: "2px 8px", cursor: "pointer", whiteSpace: "nowrap" }}>
                          {isExpanded ? "▲ Cerrar" : "▼ Usuarios"}
                        </button>
                        <button
                          onClick={() => toggleRepStatus(rep.id, rep.status)}
                          disabled={statusToggling === rep.id}
                          style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.68rem", color: isActive ? "#E21A0A" : "#39A935", background: "transparent", border: `1px solid ${isActive ? "rgba(232,42,10,0.25)" : "rgba(57,169,53,0.25)"}`, borderRadius: 12, padding: "2px 8px", cursor: "pointer", opacity: statusToggling === rep.id ? 0.5 : 1 }}>
                          {isActive ? "Pausar" : "Activar"}
                        </button>
                      </div>
                    </div>

                    {/* Expanded user list */}
                    {isExpanded && (
                      <div style={{ background: "rgba(0,0,0,0.25)", borderBottom: "1px solid rgba(255,255,255,0.07)", padding: "12px 16px" }}>
                        {repUsersLoading[rep.repCode] && (
                          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.78rem", color: "#5a7080" }}>Cargando usuarios…</div>
                        )}
                        {!repUsersLoading[rep.repCode] && (repUsers[rep.repCode] ?? []).length === 0 && (
                          <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.78rem", color: "#5a7080" }}>Sin usuarios reclutados aún.</div>
                        )}
                        {!repUsersLoading[rep.repCode] && (repUsers[rep.repCode] ?? []).length > 0 && (
                          <div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px 72px 80px", gap: 0, marginBottom: 6 }}>
                              {["USUARIO", "COLONIA", "PAGOS", "VOL.", "ÚLTIMO PAGO"].map(h => (
                                <div key={h} style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.65rem", color: "#5a7080", textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</div>
                              ))}
                            </div>
                            {(repUsers[rep.repCode] ?? []).map(u => (
                              <div key={u.id} style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px 72px 80px", gap: 0, padding: "5px 0", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                                <div>
                                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.78rem", color: "#e8f0f7" }}>{u.name ?? "—"}</div>
                                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.68rem", color: "#5a7080" }}>{u.phone}</div>
                                </div>
                                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.72rem", color: "#5a7080" }}>{u.colonia ?? "—"}</div>
                                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.78rem", color: Number(u.payment_count) > 0 ? "#39A935" : "#5a7080", fontWeight: Number(u.payment_count) > 0 ? 700 : 400 }}>{u.payment_count}</div>
                                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.72rem", color: "#1D9E75" }}>
                                  {Number(u.payment_volume) > 0 ? `$${parseFloat(u.payment_volume).toLocaleString("es-MX", { minimumFractionDigits: 0 })}` : "—"}
                                </div>
                                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.68rem", color: "#5a7080" }}>{u.last_payment ?? <span style={{ color: "#F59E0B" }}>sin pagos</span>}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === "soporte" && (
          <div>
            {!adminKey.trim() && (
              <div style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 12, padding: 16, marginBottom: 20 }}>
                <div style={{ fontFamily: "'Space Mono', monospace", fontSize: "1rem", color: "#F59E0B", textTransform: "uppercase" }}>
                  Admin Key requerida
                </div>
              </div>
            )}

            {/* Filter + refresh bar */}
            <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 20, flexWrap: "wrap" }}>
              {(["all", "recibido", "en proceso", "resuelto"] as const).map(f => (
                <button
                  key={f}
                  onClick={() => { setSupportFilter(f); loadSupportTickets(f); }}
                  style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.85rem", fontWeight: 700, padding: "6px 16px", borderRadius: 20, border: supportFilter === f ? "1px solid #39A935" : "1px solid rgba(255,255,255,0.12)", background: supportFilter === f ? "rgba(57,169,53,0.15)" : "transparent", color: supportFilter === f ? "#39A935" : "#5a7080", cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.06em" }}
                >
                  {f === "all" ? "Todos" : f}
                </button>
              ))}
              <button
                onClick={() => loadSupportTickets()}
                style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.85rem", fontWeight: 700, padding: "6px 14px", borderRadius: 20, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "#5a7080", cursor: "pointer" }}
              >
                ↻ Actualizar
              </button>
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.82rem", color: "#5a7080" }}>
                {supportTotal} ticket{supportTotal !== 1 ? "s" : ""} total
              </span>
            </div>

            {supportLoading && (
              <p style={{ fontFamily: "'Space Mono', monospace", color: "#5a7080", fontSize: "0.9rem" }}>Cargando tickets…</p>
            )}

            {!supportLoading && supportTickets.length === 0 && (
              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "32px 24px", textAlign: "center" }}>
                <p style={{ fontFamily: "'Space Mono', monospace", color: "#5a7080", fontSize: "0.9rem" }}>No hay tickets {supportFilter !== "all" ? `con estado "${supportFilter}"` : ""}</p>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {supportTickets.map(ticket => {
                const isExpanded = expandedTicket === ticket.id;
                const statusColor = ticket.status === "resuelto" ? "#39A935" : ticket.status === "en proceso" ? "#3B82F6" : "#F59E0B";
                return (
                  <div
                    key={ticket.id}
                    style={{ background: "#0D1E15", border: `1px solid ${isExpanded ? "rgba(57,169,53,0.35)" : "rgba(255,255,255,0.07)"}`, borderRadius: 14, overflow: "hidden", transition: "border-color 0.2s" }}
                  >
                    {/* Ticket header */}
                    <div
                      onClick={() => setExpandedTicket(isExpanded ? null : ticket.id)}
                      style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", cursor: "pointer" }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
                          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.88rem", fontWeight: 700, color: "#39A935" }}>{ticket.ticket_ref}</span>
                          <span style={{ fontSize: "0.75rem", fontWeight: 700, color: statusColor, background: `${statusColor}18`, padding: "2px 10px", borderRadius: 20, textTransform: "uppercase", letterSpacing: "0.07em" }}>{ticket.status}</span>
                          <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.05)", padding: "2px 8px", borderRadius: 12, textTransform: "uppercase" }}>{ticket.category}</span>
                          {ticket.whatsapp_sent && <span style={{ fontSize: "0.72rem", color: "#39A935" }}>✓ WA enviado</span>}
                        </div>
                        <p style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.82rem", color: "rgba(255,255,255,0.55)", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {ticket.telefono ? `📱 ${ticket.telefono} · ` : "📱 anónimo · "}{ticket.complaint_text.slice(0, 80)}{ticket.complaint_text.length > 80 ? "…" : ""}
                        </p>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2, flexShrink: 0 }}>
                        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.72rem", color: "rgba(255,255,255,0.3)" }}>
                          {new Date(ticket.received_at).toLocaleDateString("es-MX", { day: "numeric", month: "short" })}
                        </span>
                        <span style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.3)" }}>{isExpanded ? "▲" : "▼"}</span>
                      </div>
                    </div>

                    {/* Expanded body */}
                    {isExpanded && (
                      <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", padding: "16px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
                        <div>
                          <p style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.72rem", color: "#5a7080", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Mensaje completo</p>
                          <p style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.85rem", color: "rgba(255,255,255,0.75)", lineHeight: 1.6, margin: 0, whiteSpace: "pre-wrap" }}>{ticket.complaint_text}</p>
                        </div>

                        {ticket.admin_response && (
                          <div style={{ background: "rgba(57,169,53,0.07)", border: "1px solid rgba(57,169,53,0.2)", borderRadius: 10, padding: "12px 14px" }}>
                            <p style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.72rem", color: "#39A935", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Respuesta enviada</p>
                            <p style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.85rem", color: "rgba(255,255,255,0.7)", margin: 0, lineHeight: 1.5 }}>{ticket.admin_response}</p>
                          </div>
                        )}

                        {ticket.status !== "resuelto" && (
                          <div>
                            <p style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.72rem", color: "#5a7080", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Responder y resolver</p>
                            <textarea
                              value={replyText[ticket.id] ?? ""}
                              onChange={e => setReplyText(prev => ({ ...prev, [ticket.id]: e.target.value }))}
                              placeholder="Escribe la respuesta para el usuario…"
                              rows={3}
                              style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: "10px 14px", color: "#FFFFFF", fontFamily: "'Space Mono', monospace", fontSize: "0.85rem", resize: "vertical", outline: "none", boxSizing: "border-box", marginBottom: 10 }}
                            />
                            <div style={{ display: "flex", gap: 10 }}>
                              <button
                                onClick={() => resolveTicket(ticket.id, true)}
                                disabled={!replyText[ticket.id]?.trim() || replySending === ticket.id}
                                style={{ flex: 1, fontFamily: "'Space Mono', monospace", fontSize: "0.85rem", fontWeight: 700, padding: "9px 16px", borderRadius: 10, border: "none", background: replyText[ticket.id]?.trim() ? "linear-gradient(135deg,#007A4A,#39A935)" : "rgba(57,169,53,0.2)", color: "#FFFFFF", cursor: replyText[ticket.id]?.trim() ? "pointer" : "not-allowed", textTransform: "uppercase", letterSpacing: "0.05em" }}
                              >
                                {replySending === ticket.id ? "Enviando…" : "✅ Resolver + Enviar WA"}
                              </button>
                              <button
                                onClick={() => resolveTicket(ticket.id, false)}
                                disabled={!replyText[ticket.id]?.trim() || replySending === ticket.id}
                                style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.82rem", fontWeight: 700, padding: "9px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)", background: "transparent", color: "#5a7080", cursor: replyText[ticket.id]?.trim() ? "pointer" : "not-allowed" }}
                              >
                                Solo resolver
                              </button>
                            </div>
                          </div>
                        )}

                        {ticket.status === "resuelto" && (
                          <p style={{ fontFamily: "'Space Mono', monospace", fontSize: "0.8rem", color: "#39A935" }}>
                            ✓ Resuelto {ticket.admin_responded_at ? new Date(ticket.admin_responded_at).toLocaleDateString("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : ""}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
