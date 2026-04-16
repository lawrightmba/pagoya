import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Banknote, CreditCard, ExternalLink, Copy, CheckCircle } from "lucide-react";
import logoUrl from "@assets/pagoya_logo_web_1774491466855.png";

const QUICK_AMOUNTS = [100, 200, 500, 1000];

interface OxxoResult {
  voucherUrl: string;
  barcodeReference: string;
  expiresAt: string;
  transactionId: string;
  amountMXN: number;
}

function useStoredTelefono() {
  const [telefono, setTelefonoState] = useState(() => {
    return localStorage.getItem("pagoya_telefono") ?? "";
  });

  const setTelefono = (t: string) => {
    localStorage.setItem("pagoya_telefono", t);
    setTelefonoState(t);
  };

  return [telefono, setTelefono] as const;
}

export default function CashLoad() {
  const [, navigate] = useLocation();
  const [telefono, setTelefono] = useStoredTelefono();
  const [telefonoInput, setTelefonoInput] = useState(telefono);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<OxxoResult | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setTelefonoInput(telefono);
  }, [telefono]);

  const handleAmountChip = (val: number) => {
    setAmount(String(val));
    setError(null);
  };

  const handleAmountChange = (raw: string) => {
    const cleaned = raw.replace(/[^\d]/g, "");
    setAmount(cleaned);
    setError(null);
  };

  const handleGenerar = async () => {
    const tel = telefonoInput.trim();
    if (!tel || tel.length < 10) {
      setError("Ingresa un número de teléfono válido (10 dígitos).");
      return;
    }
    const amountNum = parseInt(amount, 10);
    if (!amountNum || amountNum < 50) {
      setError("El monto mínimo es $50 MXN.");
      return;
    }
    if (amountNum > 10_000) {
      setError("El monto máximo es $10,000 MXN.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${window.location.origin}/api/wallet/load/oxxo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telefono: tel, amountMXN: amountNum }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Error al generar el voucher. Intenta de nuevo.");
        setLoading(false);
        return;
      }

      setTelefono(tel);
      setResult(data as OxxoResult);
    } catch {
      setError("No se pudo conectar con el servidor. Verifica tu conexión.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!result?.barcodeReference) return;
    await navigator.clipboard.writeText(result.barcodeReference).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatExpiry = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("es-MX", { day: "numeric", month: "long", year: "numeric" });
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#F7F7F7" }}>
      {/* Header */}
      <header
        className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3"
        style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}
      >
        <button
          onClick={() => navigate("/")}
          className="p-2 rounded-xl transition-all active:scale-[0.92]"
          style={{ background: "#F0FAF3" }}
        >
          <ArrowLeft className="w-5 h-5" style={{ color: "#046C2C" }} />
        </button>
        <div>
          <h1 className="text-base font-black text-[#1F1F1F] leading-tight">Cargar saldo</h1>
          <p className="text-xs text-gray-400">Agrega dinero a tu monedero PagoYa</p>
        </div>
      </header>

      <main className="flex-1 flex flex-col gap-4 px-4 py-6 max-w-sm mx-auto w-full">

        {/* Section A — OXXO cash load */}
        <div
          className="bg-white rounded-3xl p-6"
          style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.07)", border: "1px solid #F0F0F0" }}
        >
          {/* Section header */}
          <div className="flex items-center gap-3 mb-5">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: "#FFF4EC", border: "1.5px solid #F6D4BC" }}
            >
              <Banknote className="w-5 h-5" style={{ color: "#D85A30" }} />
            </div>
            <div>
              <h2 className="text-sm font-black text-[#1F1F1F] leading-tight">Cargar con efectivo</h2>
              <p className="text-xs text-gray-400">Paga en cualquier tienda de conveniencia</p>
            </div>
          </div>

          {result ? (
            /* ── SUCCESS STATE ── */
            <div className="flex flex-col gap-4">
              {/* Success badge */}
              <div
                className="flex items-center gap-2 rounded-2xl px-4 py-3"
                style={{ background: "#F0FAF3", border: "1px solid #D4EDDA" }}
              >
                <CheckCircle className="w-5 h-5 flex-shrink-0" style={{ color: "#1D9E75" }} />
                <div>
                  <p className="text-sm font-bold text-[#046C2C] leading-tight">¡Voucher generado!</p>
                  <p className="text-xs text-gray-500">Tu carga estará lista en minutos tras el pago.</p>
                </div>
              </div>

              {/* Amount */}
              <div className="text-center py-2">
                <p className="text-xs text-gray-400 font-semibold uppercase tracking-widest mb-1">Monto a pagar</p>
                <p className="text-4xl font-black text-[#1F1F1F]">
                  ${result.amountMXN.toLocaleString("es-MX")}{" "}
                  <span className="text-base font-semibold text-gray-400">MXN</span>
                </p>
              </div>

              {/* Reference */}
              <div
                className="rounded-2xl px-4 py-4"
                style={{ background: "#F7F7F7", border: "1px solid #ECECEC" }}
              >
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Referencia de pago</p>
                <div className="flex items-center gap-2">
                  <p className="flex-1 text-lg font-black text-[#1F1F1F] tracking-widest break-all">
                    {result.barcodeReference}
                  </p>
                  <button
                    onClick={handleCopy}
                    className="flex-shrink-0 p-2 rounded-xl transition-all active:scale-[0.92]"
                    style={{ background: copied ? "#1D9E75" : "#ECECEC" }}
                    title="Copiar referencia"
                  >
                    {copied
                      ? <CheckCircle className="w-4 h-4 text-white" />
                      : <Copy className="w-4 h-4 text-gray-500" />
                    }
                  </button>
                </div>
              </div>

              {/* Expiry */}
              <div
                className="rounded-xl px-4 py-2.5 flex items-center gap-2"
                style={{ background: "#FFF8E1", border: "1px solid #FBBF24" }}
              >
                <span className="text-sm">⏳</span>
                <p className="text-xs text-yellow-800 font-medium">
                  Válido hasta el <strong>{formatExpiry(result.expiresAt)}</strong>
                </p>
              </div>

              {/* Voucher link */}
              {result.voucherUrl && (
                <a
                  href={result.voucherUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-4 rounded-2xl text-white text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.97]"
                  style={{
                    background: "linear-gradient(135deg, #D85A30 0%, #E8763A 100%)",
                    boxShadow: "0 4px 16px rgba(216,90,48,0.32)",
                  }}
                >
                  <ExternalLink className="w-4 h-4" />
                  Descargar voucher PDF
                </a>
              )}

              {/* New load */}
              <button
                onClick={() => { setResult(null); setAmount(""); }}
                className="w-full py-3 rounded-2xl text-sm font-bold transition-all active:scale-[0.97]"
                style={{ background: "#F0FAF3", color: "#046C2C", border: "1.5px solid #D4EDDA" }}
              >
                Generar otra carga
              </button>
            </div>
          ) : (
            /* ── FORM STATE ── */
            <div className="flex flex-col gap-4">
              {/* Telefono input */}
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">
                  Tu número de WhatsApp
                </label>
                <div
                  className="flex items-center rounded-2xl px-4 py-3"
                  style={{
                    background: "white",
                    border: "1.5px solid #E5E5E5",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                  }}
                >
                  <span className="text-sm text-gray-400 mr-2">🇲🇽 +52</span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    placeholder="10 dígitos"
                    value={telefonoInput}
                    onChange={(e) => {
                      setTelefonoInput(e.target.value.replace(/\D/g, "").slice(0, 10));
                      setError(null);
                    }}
                    className="flex-1 text-sm text-[#1F1F1F] outline-none bg-transparent"
                  />
                </div>
              </div>

              {/* Amount input */}
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">
                  Monto a cargar
                </label>
                <div
                  className="flex items-center rounded-2xl px-4 py-3"
                  style={{
                    background: "white",
                    border: "1.5px solid #E5E5E5",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                  }}
                >
                  <span className="text-2xl font-black text-gray-300 mr-2">$</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    value={amount}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    className="flex-1 text-2xl font-black text-[#1F1F1F] outline-none bg-transparent w-0"
                  />
                  <span className="text-sm font-semibold text-gray-400 ml-2">MXN</span>
                </div>
              </div>

              {/* Quick amount chips */}
              <div className="flex gap-2 flex-wrap">
                {QUICK_AMOUNTS.map((val) => (
                  <button
                    key={val}
                    onClick={() => handleAmountChip(val)}
                    className="px-4 py-2 rounded-full text-sm font-bold transition-all active:scale-[0.95]"
                    style={{
                      background: amount === String(val) ? "#D85A30" : "#FFF4EC",
                      color: amount === String(val) ? "white" : "#D85A30",
                      border: `1.5px solid ${amount === String(val) ? "#D85A30" : "#F6D4BC"}`,
                    }}
                  >
                    ${val.toLocaleString("es-MX")}
                  </button>
                ))}
              </div>

              {/* Helper text */}
              <p className="text-xs text-gray-400 text-center leading-relaxed">
                Mínimo $50 · Máximo $10,000 · Válido 5 días
                <br />
                <span className="text-gray-300">Mínimo $50 · Máximo $10,000 · Valid 5 days</span>
              </p>

              {/* Error */}
              {error && (
                <div
                  className="rounded-xl px-4 py-3 text-sm font-medium"
                  style={{ background: "#FFF4F3", color: "#C0392B", border: "1px solid #FCDAD7" }}
                >
                  {error}
                </div>
              )}

              {/* CTA */}
              <button
                onClick={handleGenerar}
                disabled={loading}
                className="w-full py-4 rounded-2xl text-white text-sm font-black flex items-center justify-center gap-2 transition-all active:scale-[0.97] disabled:opacity-60"
                style={{
                  background: loading
                    ? "#D85A30"
                    : "linear-gradient(135deg, #D85A30 0%, #E8763A 100%)",
                  boxShadow: "0 4px 16px rgba(216,90,48,0.32)",
                }}
              >
                {loading ? (
                  <>
                    <span
                      className="w-4 h-4 rounded-full border-2 border-white border-t-transparent"
                      style={{ animation: "spin 0.7s linear infinite" }}
                    />
                    Generando voucher...
                  </>
                ) : (
                  <>
                    <Banknote className="w-4 h-4" />
                    Generar voucher OXXO
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Section B — Card load placeholder */}
        <div
          className="bg-white rounded-3xl p-6 opacity-80"
          style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.05)", border: "1px solid #F0F0F0" }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: "#F5F3FF", border: "1.5px solid #DDD8FB" }}
            >
              <CreditCard className="w-5 h-5" style={{ color: "#7F77DD" }} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <h2 className="text-sm font-black text-[#1F1F1F] leading-tight">Cargar con tarjeta</h2>
                <span
                  className="px-2 py-0.5 rounded-full text-xs font-bold"
                  style={{ background: "#F5F3FF", color: "#7F77DD", border: "1px solid #DDD8FB" }}
                >
                  Próximamente
                </span>
              </div>
              <p className="text-xs text-gray-400">Visa, Mastercard, AMEX</p>
            </div>
          </div>
        </div>

      </main>

      {/* Spin keyframe injected once */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
