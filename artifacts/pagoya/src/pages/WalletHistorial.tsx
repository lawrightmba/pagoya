import { useState, useEffect, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { useLocation } from "wouter";
import { ArrowLeft, RefreshCw, Wallet, CreditCard, Store, ArrowUpRight, ArrowDownLeft, RotateCcw } from "lucide-react";
import { usePayment } from "@/context/PaymentContext";

interface WalletTx {
  id: string;
  type: string;
  amountMXN: number;
  status: "pending" | "confirmed" | "failed";
  source?: string | null;
  description: string | null;
  createdAt: string;
  confirmedAt: string | null;
}

interface BillPayment {
  id: string;
  service_name: string;
  reference_number: string | null;
  amount: string | number;
  status: string;
  created_at: string;
}

function SourceBadge({ source }: { source?: string | null }) {
  if (!source) return null;

  const normalized = source === "card_topup" ? "card" : source;

  if (normalized === "card") {
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold flex-shrink-0"
        style={{ background: "#F0EFFE", color: "#7F77DD", border: "1px solid #D4D0FA" }}
      >
        <CreditCard className="w-3 h-3" />
        Tarjeta
      </span>
    );
  }

  if (normalized === "oxxo") {
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold flex-shrink-0"
        style={{ background: "#FEF2EE", color: "#D85A30", border: "1px solid #F9CDBF" }}
      >
        <Store className="w-3 h-3" />
        OXXO
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold flex-shrink-0"
      style={{ background: "#F5F5F5", color: "#6B7280", border: "1px solid #E5E5E5" }}
    >
      {normalized}
    </span>
  );
}

const TYPE_LABELS: Record<string, string> = {
  load_oxxo: "Carga OXXO",
  load_card: "Carga tarjeta",
  bill_pay: "Pago de servicio",
  refund: "Reembolso",
  adjustment: "Ajuste",
  transfer_send: "Transferencia enviada",
  transfer_receive: "Transferencia recibida",
};

const STATUS_CONFIG = {
  confirmed: { label: "Confirmado", bg: "#F0FAF3", color: "#046C2C", border: "#D4EDDA" },
  pending: { label: "Pendiente", bg: "#FFF8E1", color: "#B45309", border: "#FCD34D" },
  failed: { label: "Fallido", bg: "#FFF4F3", color: "#C0392B", border: "#FCDAD7" },
};

function isCredit(type: string) {
  return type.startsWith("load_") || type === "refund" || type === "adjustment" || type === "transfer_receive";
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
}

function TxSkeleton() {
  return (
    <div className="flex flex-col gap-3 animate-pulse">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="bg-white rounded-2xl px-5 py-4 flex items-center gap-4"
          style={{ border: "1px solid #F0F0F0" }}
        >
          <div className="w-10 h-10 rounded-xl flex-shrink-0" style={{ background: "#F0F0F0" }} />
          <div className="flex-1 flex flex-col gap-2">
            <div className="h-3 rounded-full w-32" style={{ background: "#F0F0F0" }} />
            <div className="h-2.5 rounded-full w-24" style={{ background: "#F0F0F0" }} />
          </div>
          <div className="h-5 rounded-full w-16" style={{ background: "#F0F0F0" }} />
        </div>
      ))}
    </div>
  );
}

export default function WalletHistorial() {
  const [, navigate] = useLocation();
  const storedTelefono = localStorage.getItem("pagoya_telefono") ?? "";

  const { setPaymentData, paymentData } = usePayment();
  const [telefono, setTelefono] = useState(storedTelefono);
  const [telefonoInput, setTelefonoInput] = useState(storedTelefono);
  const [balance, setBalance] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<WalletTx[]>([]);
  const [billPayments, setBillPayments] = useState<BillPayment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const load = useCallback(async (tel: string) => {
    if (!tel) return;
    setLoading(true);
    setError(null);
    try {
      const [balRes, txRes, histRes] = await Promise.all([
        fetch(`${window.location.origin}/api/wallet/balance?telefono=${encodeURIComponent(tel)}`),
        fetch(`${window.location.origin}/api/wallet/transactions?telefono=${encodeURIComponent(tel)}&limit=50`),
        fetch(`${window.location.origin}/api/historial?phone=${encodeURIComponent(tel)}`),
      ]);

      if (!balRes.ok || !txRes.ok) {
        setError("No se pudo cargar el historial. Intenta de nuevo.");
        setLoading(false);
        return;
      }

      const balData = await balRes.json();
      const txData = await txRes.json();
      const histData = histRes.ok ? await histRes.json() : { payments: [] };

      setBalance(typeof balData.balanceMXN === "number" ? balData.balanceMXN : null);
      setTransactions(txData.transactions ?? []);
      // Keep last 3 confirmed bill payments for the "pay again" shortcut
      const confirmed = (histData.payments ?? []).filter(
        (p: BillPayment) => p.status === "completed" || p.status === "confirmed"
      );
      setBillPayments(confirmed.slice(0, 3));
      setLastRefreshed(new Date());
    } catch {
      setError("Sin conexión. Verifica tu red e intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (telefono) {
      load(telefono);
    }
  }, [telefono, load]);

  const handleSetTelefono = () => {
    const t = telefonoInput.trim();
    if (t.length < 10) return;
    localStorage.setItem("pagoya_telefono", t);
    setTelefono(t);
  };

  /* Group transactions by calendar date */
  const grouped: { date: string; items: WalletTx[] }[] = [];
  for (const tx of transactions) {
    const d = formatDate(tx.createdAt);
    const last = grouped[grouped.length - 1];
    if (!last || last.date !== d) {
      grouped.push({ date: d, items: [tx] });
    } else {
      last.items.push(tx);
    }
  }

  const balanceFmt =
    balance !== null
      ? `$${balance.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN`
      : null;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#F7F7F7" }}>
      <Helmet>
        <title>Historial de pagos | PagoYa</title>
        <meta name="description" content="Consulta todos tus pagos y movimientos en un solo lugar. Tu historial de transacciones siempre disponible en PagoYa." />
        <meta name="robots" content="noindex,follow" />
        <link rel="canonical" href="https://pagoyamx.com/wallet/historial" />
      </Helmet>
      {/* Header */}
      <header
        className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 sticky top-0 z-10"
        style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}
      >
        <button
          onClick={() => navigate("/")}
          className="p-2 rounded-xl transition-all active:scale-[0.92]"
          style={{ background: "#F0FAF3" }}
        >
          <ArrowLeft className="w-5 h-5" style={{ color: "#046C2C" }} />
        </button>
        <div className="flex-1">
          <h1 className="text-base font-black text-[#1F1F1F] leading-tight">Historial de saldo</h1>
          <p className="text-xs text-gray-400">Cargas y pagos de tu monedero</p>
        </div>
        {telefono && (
          <button
            onClick={() => load(telefono)}
            disabled={loading}
            className="p-2 rounded-xl transition-all active:scale-[0.92] disabled:opacity-50"
            style={{ background: "#F0FAF3" }}
            title="Actualizar"
          >
            <RefreshCw className="w-4 h-4" style={{ color: "#1D9E75", ...(loading ? { animation: "spin 1s linear infinite" } : {}) }} />
          </button>
        )}
      </header>

      <main className="flex-1 flex flex-col gap-4 px-4 py-5 max-w-sm mx-auto w-full">

        {/* Phone setup — shown only when no phone stored */}
        {!telefono && (
          <>
            <div
              className="bg-white rounded-3xl p-6"
              style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.07)", border: "1px solid #F0F0F0" }}
            >
              <div className="flex items-center gap-3 mb-5">
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "#F0FAF3" }}
                >
                  <Wallet className="w-5 h-5" style={{ color: "#1D9E75" }} />
                </div>
                <div>
                  <h2 className="text-sm font-black text-[#1F1F1F]">¿Cuál es tu número?</h2>
                  <p className="text-xs text-gray-400">Para consultar tu historial</p>
                </div>
              </div>
              <div
                className="flex items-center rounded-2xl px-4 py-3 mb-4"
                style={{ background: "#F7F7F7", border: "1.5px solid #E5E5E5" }}
              >
                <span className="text-sm text-gray-400 mr-2">🇲🇽 +52</span>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="10 dígitos"
                  value={telefonoInput}
                  onChange={(e) => setTelefonoInput(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  onKeyDown={(e) => e.key === "Enter" && handleSetTelefono()}
                  className="flex-1 text-sm text-[#1F1F1F] outline-none bg-transparent"
                />
              </div>
              <button
                onClick={handleSetTelefono}
                disabled={telefonoInput.length < 10}
                className="w-full py-3.5 rounded-2xl text-white text-sm font-bold transition-all active:scale-[0.97] disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #046C2C 0%, #39A935 100%)" }}
              >
                Ver mi historial
              </button>
            </div>

            {/* ── "Lo que verás aquí" ghost preview ── */}
            <div style={{ opacity: 0.45, pointerEvents: "none", userSelect: "none" }}>
              <p className="text-xs font-bold text-gray-400 text-center uppercase tracking-widest mb-3">
                Así se ve tu historial
              </p>
              {[
                { icon: "⚡", label: "CFE Clásica", sub: "Pago de servicio · 5 jun", amount: "-$245.00 MXN", credit: false },
                { icon: "🏪", label: "Carga OXXO", sub: "Recarga billetera · 3 jun", amount: "+$500.00 MXN", credit: true },
                { icon: "📱", label: "Telcel Prepago", sub: "Pago de servicio · 1 jun", amount: "-$100.00 MXN", credit: false },
              ].map((tx) => (
                <div
                  key={tx.label}
                  className="bg-white rounded-2xl px-5 py-4 flex items-center gap-4 mb-2"
                  style={{ border: "1px solid #F0F0F0" }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center text-lg"
                    style={{ background: "#F0FAF3" }}
                  >
                    {tx.icon}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-[#1F1F1F] leading-tight">{tx.label}</p>
                    <p className="text-xs text-gray-400">{tx.sub}</p>
                  </div>
                  <span className={`text-sm font-bold ${tx.credit ? "text-[#046C2C]" : "text-[#1F1F1F]"}`}>
                    {tx.amount}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Balance card */}
        {telefono && (
          <div
            className="rounded-2xl px-5 py-4 flex items-center gap-4"
            style={{
              background: "linear-gradient(135deg, #046C2C 0%, #1D9E75 100%)",
              boxShadow: "0 4px 16px rgba(4,108,44,0.30)",
            }}
          >
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(255,255,255,0.18)" }}
            >
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-white/70 font-semibold mb-0.5">Saldo disponible</p>
              {loading && !balanceFmt ? (
                <div className="h-6 w-32 rounded-full bg-white/20 animate-pulse" />
              ) : (
                <p className="text-xl font-black text-white leading-tight">
                  {balanceFmt ?? "—"}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5 flex-shrink-0">
              <button
                onClick={() => navigate("/cargar")}
                className="px-4 py-2 rounded-full text-sm font-bold transition-all active:scale-[0.95]"
                style={{ background: "rgba(255,255,255,0.22)", color: "white" }}
              >
                + Cargar
              </button>
              <button
                onClick={() => navigate("/enviar")}
                className="px-4 py-2 rounded-full text-sm font-bold transition-all active:scale-[0.95] flex items-center gap-1 justify-center"
                style={{ background: "rgba(255,255,255,0.15)", color: "white" }}
              >
                <ArrowUpRight className="w-3.5 h-3.5" />
                Enviar
              </button>
            </div>
          </div>
        )}

        {/* ── PAGAR DE NUEVO ── */}
        {billPayments.length > 0 && (
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 px-1">
              Pagar de nuevo
            </p>
            <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
              {billPayments.map((bp) => {
                const emoji = (() => {
                  const n = bp.service_name.toLowerCase();
                  if (n.includes("cfe") || n.includes("luz")) return "⚡";
                  if (n.includes("telmex") || n.includes("internet")) return "🌐";
                  if (n.includes("telcel") || n.includes("movistar") || n.includes("at&t")) return "📱";
                  if (n.includes("izzi") || n.includes("sky") || n.includes("cable")) return "📺";
                  if (n.includes("netflix")) return "🎬";
                  if (n.includes("agua")) return "💧";
                  if (n.includes("gas")) return "🔥";
                  return "🧾";
                })();
                const amount = parseFloat(String(bp.amount));
                const categoria = bp.service_name
                  .toLowerCase()
                  .normalize("NFD")
                  .replace(/[\u0300-\u036f]/g, "")
                  .replace(/\s+/g, "_")
                  .replace(/[^a-z_]/g, "");

                return (
                  <button
                    key={bp.id}
                    onClick={() => {
                      setPaymentData({
                        ...paymentData,
                        empresa: bp.service_name,
                        categoria,
                        referencia: bp.reference_number ?? "",
                        monto: "",
                      });
                      navigate("/pagar");
                    }}
                    className="flex-shrink-0 flex flex-col items-start gap-2 rounded-2xl px-4 py-3 text-left transition-all active:scale-[0.96]"
                    style={{
                      background: "white",
                      border: "1.5px solid #E8F5F0",
                      boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
                      minWidth: "140px",
                    }}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <span className="text-xl">{emoji}</span>
                      <span className="text-xs font-black text-[#1F1F1F] truncate flex-1">
                        {bp.service_name}
                      </span>
                    </div>
                    {!isNaN(amount) && (
                      <span className="text-xs text-gray-400">
                        Último: ${amount.toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN
                      </span>
                    )}
                    {bp.reference_number && (
                      <span className="text-xs text-gray-300 truncate w-full">
                        Ref {bp.reference_number}
                      </span>
                    )}
                    <div
                      className="w-full py-2 rounded-xl text-center text-xs font-bold mt-1"
                      style={{ background: "#1D9E75", color: "white" }}
                    >
                      <RotateCcw className="w-3 h-3 inline mr-1 -mt-0.5" />
                      Pagar de nuevo
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Last refreshed */}
        {lastRefreshed && (
          <p className="text-xs text-gray-400 text-center -mt-2">
            Actualizado: {formatTime(lastRefreshed.toISOString())}
          </p>
        )}

        {/* Error */}
        {error && (
          <div
            className="rounded-2xl px-4 py-3 text-sm font-medium"
            style={{ background: "#FFF4F3", color: "#C0392B", border: "1px solid #FCDAD7" }}
          >
            {error}
          </div>
        )}

        {/* Skeleton */}
        {loading && transactions.length === 0 && <TxSkeleton />}

        {/* Empty state */}
        {!loading && telefono && transactions.length === 0 && !error && (
          <div className="flex flex-col items-center text-center py-16 gap-3">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-2"
              style={{ background: "#F0FAF3" }}
            >
              <Wallet className="w-8 h-8" style={{ color: "#1D9E75" }} />
            </div>
            <p className="text-sm font-bold text-[#1F1F1F]">Sin movimientos aún</p>
            <p className="text-xs text-gray-400 max-w-xs leading-relaxed">
              Carga saldo en OXXO o paga un servicio para ver tu historial aquí.
            </p>
            <button
              onClick={() => navigate("/cargar")}
              className="mt-2 px-6 py-3 rounded-full text-sm font-bold transition-all active:scale-[0.97]"
              style={{
                background: "linear-gradient(135deg, #D85A30 0%, #E8763A 100%)",
                color: "white",
                boxShadow: "0 4px 12px rgba(216,90,48,0.28)",
              }}
            >
              Cargar saldo
            </button>
          </div>
        )}

        {/* Transaction list grouped by date */}
        {grouped.map(({ date, items }) => (
          <div key={date}>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 px-1">{date}</p>
            <div className="flex flex-col gap-2">
              {items.map((tx) => {
                const credit = isCredit(tx.type);
                const status = STATUS_CONFIG[tx.status] ?? STATUS_CONFIG.pending;
                const amountSign = credit ? "+" : "−";
                const amountColor = credit ? "#046C2C" : "#1F1F1F";

                return (
                  <div
                    key={tx.id}
                    className="bg-white rounded-2xl px-5 py-4 flex items-center gap-4"
                    style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.05)", border: "1px solid #F0F0F0" }}
                  >
                    {/* Icon */}
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg"
                      style={{ background: credit ? "#F0FAF3" : "#FFF4EC" }}
                    >
                      {credit ? "💳" : "🔄"}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-[#1F1F1F] truncate leading-tight">
                        {TYPE_LABELS[tx.type] ?? tx.type}
                      </p>
                      {tx.description && (
                        <p className="text-xs text-gray-400 truncate mt-0.5">{tx.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className="px-2 py-0.5 rounded-full text-xs font-bold"
                          style={{ background: status.bg, color: status.color, border: `1px solid ${status.border}` }}
                        >
                          {status.label}
                        </span>
                        <span className="text-xs text-gray-300">{formatTime(tx.createdAt)}</span>
                      </div>
                    </div>

                    {/* Amount + source badge */}
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <p
                        className="text-sm font-black"
                        style={{ color: amountColor }}
                      >
                        {amountSign}${tx.amountMXN.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                      </p>
                      <SourceBadge source={tx.source} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Bottom padding */}
        <div className="h-4" />
      </main>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
