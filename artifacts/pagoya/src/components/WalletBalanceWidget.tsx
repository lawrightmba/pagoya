import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Wallet, Plus } from "lucide-react";

interface WalletState {
  balance: number | null;
  hasPending: boolean;
  loading: boolean;
  error: boolean;
}

export default function WalletBalanceWidget() {
  const [, navigate] = useLocation();
  const telefono =
    typeof localStorage !== "undefined"
      ? (localStorage.getItem("pagoya_telefono") ?? "")
      : "";

  const [state, setState] = useState<WalletState>({
    balance: null,
    hasPending: false,
    loading: true,
    error: false,
  });

  useEffect(() => {
    if (!telefono) {
      setState({ balance: null, hasPending: false, loading: false, error: false });
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const [balRes, txRes] = await Promise.all([
          fetch(
            `${window.location.origin}/api/wallet/balance?telefono=${encodeURIComponent(telefono)}`,
          ),
          fetch(
            `${window.location.origin}/api/wallet/transactions?telefono=${encodeURIComponent(telefono)}&limit=10`,
          ),
        ]);

        if (cancelled) return;

        if (!balRes.ok) {
          setState({ balance: null, hasPending: false, loading: false, error: true });
          return;
        }

        const balData = await balRes.json();
        let hasPending = false;
        if (txRes.ok) {
          const txData = await txRes.json();
          hasPending = (txData.transactions ?? []).some(
            (t: { status: string }) => t.status === "pending",
          );
        }

        if (cancelled) return;
        setState({
          balance: typeof balData.balanceMXN === "number" ? balData.balanceMXN : null,
          hasPending,
          loading: false,
          error: false,
        });
      } catch {
        if (!cancelled) {
          setState({ balance: null, hasPending: false, loading: false, error: true });
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, [telefono]);

  /* No telefono stored yet — show an inviting entry point */
  if (!telefono && !state.loading) {
    return (
      <button
        onClick={() => navigate("/cargar")}
        className="w-full rounded-2xl px-5 py-4 flex items-center gap-4 text-left transition-all active:scale-[0.98]"
        style={{
          background: "white",
          border: "1px solid #F0F0F0",
          boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
        }}
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "#F0FAF3" }}
        >
          <Wallet className="w-5 h-5" style={{ color: "#1D9E75" }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-400 font-semibold mb-0.5">Saldo PagoYa</p>
          <p className="text-sm font-bold text-[#1D9E75]">Configura tu monedero →</p>
        </div>
      </button>
    );
  }

  /* Skeleton */
  if (state.loading) {
    return (
      <div
        className="rounded-2xl px-5 py-4 flex items-center gap-4 animate-pulse"
        style={{ background: "white", border: "1px solid #F0F0F0", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}
      >
        <div className="w-10 h-10 rounded-xl flex-shrink-0" style={{ background: "#F0FAF3" }} />
        <div className="flex-1 flex flex-col gap-2">
          <div className="h-3 rounded-full w-24" style={{ background: "#E8E8E8" }} />
          <div className="h-5 rounded-full w-32" style={{ background: "#E8E8E8" }} />
        </div>
        <div className="h-8 w-20 rounded-full" style={{ background: "#E8E8E8" }} />
      </div>
    );
  }

  /* API unreachable — silent empty state */
  if (state.error) {
    return null;
  }

  const formatted =
    state.balance !== null
      ? `$${state.balance.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN`
      : "$0.00 MXN";

  return (
    <div
      className="rounded-2xl px-5 py-4 flex items-center gap-4"
      style={{
        background: "white",
        border: "1px solid #F0F0F0",
        boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
      }}
    >
      {/* Icon */}
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: "#F0FAF3" }}
      >
        <Wallet className="w-5 h-5" style={{ color: "#1D9E75" }} />
      </div>

      {/* Label + balance */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-xs text-gray-400 font-semibold">Saldo PagoYa</p>
          {state.hasPending && (
            <span
              className="px-2 py-0.5 rounded-full text-xs font-bold leading-none"
              style={{ background: "#FFF8E1", color: "#B45309", border: "1px solid #FCD34D" }}
            >
              Carga pendiente
            </span>
          )}
        </div>
        <p className="text-lg font-black text-[#1F1F1F] leading-tight">{formatted}</p>
      </div>

      {/* CTA */}
      <button
        onClick={() => navigate("/cargar")}
        className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-bold transition-all active:scale-[0.95] hover:scale-[1.02]"
        style={{
          background: "#1D9E75",
          color: "white",
          boxShadow: "0 4px 12px rgba(29,158,117,0.32)",
        }}
      >
        <Plus className="w-4 h-4" strokeWidth={2.5} />
        Cargar
      </button>
    </div>
  );
}
