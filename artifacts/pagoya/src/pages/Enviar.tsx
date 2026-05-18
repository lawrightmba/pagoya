import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useLocation } from "wouter";
import { ArrowLeft, Search, Send, CheckCircle, AlertCircle, User, ChevronRight, UserPlus } from "lucide-react";

const API = import.meta.env.VITE_API_URL ?? `${import.meta.env.BASE_URL}api`;

type Step = "phone" | "amount" | "confirm" | "success";

interface LimitsResponse {
  dailyLimitMXN: number;
  dailyUsedMXN: number;
  dailyRemainingMXN: number;
  minTransferMXN: number;
}

function formatPhone(raw: string) {
  const d = raw.replace(/\D/g, "");
  if (d.length === 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  return d;
}

function maskPhone(phone: string) {
  const d = phone.replace(/\D/g, "");
  if (d.length >= 10) {
    return `+52 ••• ••• ${d.slice(-4)}`;
  }
  return phone;
}

export default function Enviar() {
  const [, navigate] = useLocation();

  const [senderPhone, setSenderPhone] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [step, setStep] = useState<Step>("phone");
  const [recipientExists, setRecipientExists] = useState<boolean | null>(null);
  const [recipientIsNew, setRecipientIsNew] = useState(false);
  const [limits, setLimits] = useState<LimitsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{ amount: number; recipient: string; newBalance: number } | null>(null);

  const navyBg = "#0A2540";
  const teal = "#1D9E75";

  async function handleLookup() {
    setError(null);
    const cleanSender = senderPhone.replace(/\D/g, "");
    const cleanRecipient = recipientPhone.replace(/\D/g, "");

    if (cleanSender.length < 10) {
      setError("Ingresa tu número de teléfono (10 dígitos).");
      return;
    }
    if (cleanRecipient.length < 10) {
      setError("Ingresa el número del destinatario (10 dígitos).");
      return;
    }
    if (cleanSender === cleanRecipient) {
      setError("No puedes enviarte dinero a ti mismo.");
      return;
    }

    setLoading(true);
    try {
      const [lookupRes, limitsRes] = await Promise.all([
        fetch(`${API}/wallet/transfer/lookup`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ telefono: cleanRecipient }),
        }),
        fetch(`${API}/wallet/transfer/limits?telefono=${cleanSender}`),
      ]);

      const lookup = await lookupRes.json();
      const lims = await limitsRes.json();

      setRecipientExists(lookup.exists);
      setRecipientIsNew(!lookup.exists);
      setLimits(lims);

      if (lims.dailyRemainingMXN < 10) {
        setError(`Alcanzaste el límite diario de $${lims.dailyLimitMXN.toFixed(2)} MXN en transferencias.`);
        return;
      }
      setStep("amount");
    } catch {
      setError("Error de conexión. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm() {
    setError(null);
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt < 10) {
      setError("El monto mínimo es $10 MXN.");
      return;
    }
    if (limits && amt > limits.dailyRemainingMXN) {
      setError(`El máximo que puedes enviar hoy es $${limits.dailyRemainingMXN.toFixed(2)} MXN.`);
      return;
    }
    setStep("confirm");
  }

  async function handleExecute() {
    setError(null);
    setLoading(true);
    const cleanSender = senderPhone.replace(/\D/g, "");
    const cleanRecipient = recipientPhone.replace(/\D/g, "");
    const amt = parseFloat(amount);

    try {
      const res = await fetch(`${API}/wallet/transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderTelefono: cleanSender,
          receiverTelefono: cleanRecipient,
          amountMXN: amt,
          memo: memo.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error === "INSUFFICIENT_BALANCE") {
          setError(`Saldo insuficiente. Tu saldo actual es $${(data.currentBalance ?? 0).toFixed(2)} MXN.`);
        } else if (data.error === "DAILY_LIMIT_EXCEEDED") {
          setError(`Límite diario alcanzado. Puedes enviar hasta $${(data.remaining ?? 0).toFixed(2)} MXN más hoy.`);
        } else {
          setError(data.error ?? "Error al procesar la transferencia.");
        }
        setStep("amount");
        return;
      }

      setSuccessData({ amount: amt, recipient: cleanRecipient, newBalance: data.newSenderBalance });
      setStep("success");
    } catch {
      setError("Error de conexión. Inténtalo de nuevo.");
      setStep("amount");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen" style={{ background: navyBg }}>
      <Helmet>
        <title>Enviar dinero — PagoYa</title>
      </Helmet>

      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-12 pb-6">
        <button
          onClick={() => step === "phone" ? navigate("/wallet/historial") : setStep(step === "amount" ? "phone" : "amount")}
          className="p-2 rounded-full"
          style={{ background: "rgba(255,255,255,0.1)" }}
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-white">Enviar dinero</h1>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>
            {step === "phone" && "¿A quién le vas a enviar?"}
            {step === "amount" && "¿Cuánto quieres enviar?"}
            {step === "confirm" && "Confirma la transferencia"}
            {step === "success" && "¡Transferencia exitosa!"}
          </p>
        </div>
      </div>

      <div className="px-4 pb-10">

        {/* Step: phone */}
        {step === "phone" && (
          <div className="space-y-4">
            <div className="rounded-2xl p-5 space-y-4" style={{ background: "rgba(255,255,255,0.06)" }}>
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: "rgba(255,255,255,0.7)" }}>
                  Tu número de teléfono
                </label>
                <input
                  type="tel"
                  inputMode="numeric"
                  placeholder="10 dígitos"
                  maxLength={10}
                  value={senderPhone}
                  onChange={e => setSenderPhone(e.target.value.replace(/\D/g, ""))}
                  className="w-full rounded-xl px-4 py-3 text-white text-base outline-none"
                  style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)" }}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: "rgba(255,255,255,0.7)" }}>
                  Teléfono del destinatario
                </label>
                <input
                  type="tel"
                  inputMode="numeric"
                  placeholder="10 dígitos"
                  maxLength={10}
                  value={recipientPhone}
                  onChange={e => setRecipientPhone(e.target.value.replace(/\D/g, ""))}
                  className="w-full rounded-xl px-4 py-3 text-white text-base outline-none"
                  style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)" }}
                />
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 p-4 rounded-xl" style={{ background: "#FFF4F3", border: "1px solid #FCDAD7" }}>
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "#C0392B" }} />
                <p className="text-sm" style={{ color: "#C0392B" }}>{error}</p>
              </div>
            )}

            <button
              onClick={handleLookup}
              disabled={loading || senderPhone.replace(/\D/g,"").length < 10 || recipientPhone.replace(/\D/g,"").length < 10}
              className="w-full py-4 rounded-2xl font-bold text-white text-base flex items-center justify-center gap-2 disabled:opacity-40"
              style={{ background: teal }}
            >
              {loading ? (
                <span className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  Buscar destinatario
                </>
              )}
            </button>

            <p className="text-center text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
              Límite diario: $2,500 MXN · Monto mínimo: $10 MXN
            </p>
          </div>
        )}

        {/* Step: amount */}
        {step === "amount" && (
          <div className="space-y-4">
            {/* Recipient card */}
            <div
              className="rounded-2xl p-4 flex items-center gap-3"
              style={{
                background: recipientIsNew ? "rgba(255,165,0,0.1)" : "rgba(29,158,117,0.15)",
                border: `1px solid ${recipientIsNew ? "rgba(255,165,0,0.3)" : "rgba(29,158,117,0.3)"}`,
              }}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: recipientIsNew ? "rgba(255,165,0,0.3)" : teal }}
              >
                {recipientIsNew ? <UserPlus className="w-5 h-5 text-white" /> : <User className="w-5 h-5 text-white" />}
              </div>
              <div>
                <p className="text-white font-semibold">{maskPhone(recipientPhone)}</p>
                {recipientIsNew ? (
                  <p className="text-xs" style={{ color: "rgba(255,200,80,0.9)" }}>
                    Aún no tiene cuenta — les enviaremos invitación por WhatsApp
                  </p>
                ) : (
                  <p className="text-xs" style={{ color: "#1D9E75" }}>Usuario registrado en PagoYa ✓</p>
                )}
              </div>
            </div>

            {/* Invite callout for new users */}
            {recipientIsNew && (
              <div className="rounded-xl p-4 flex items-start gap-3" style={{ background: "rgba(255,165,0,0.08)", border: "1px solid rgba(255,165,0,0.2)" }}>
                <UserPlus className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "rgba(255,200,80,0.9)" }} />
                <p className="text-xs leading-relaxed" style={{ color: "rgba(255,200,80,0.9)" }}>
                  Su saldo quedará guardado. Recibirán un WhatsApp con el link para entrar a PagoYa y usarlo.
                </p>
              </div>
            )}

            {/* Amount input */}
            <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.06)" }}>
              <label className="block text-sm font-semibold mb-3" style={{ color: "rgba(255,255,255,0.7)" }}>
                Monto a enviar
              </label>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-white">$</span>
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="0.00"
                  min="10"
                  max={limits?.dailyRemainingMXN ?? 2500}
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="flex-1 text-3xl font-bold text-white bg-transparent outline-none"
                  style={{ minWidth: 0 }}
                />
                <span className="text-white font-semibold">MXN</span>
              </div>
              {limits && (
                <p className="text-xs mt-2" style={{ color: "rgba(255,255,255,0.5)" }}>
                  Disponible hoy: ${limits.dailyRemainingMXN.toFixed(2)} MXN
                </p>
              )}
            </div>

            {/* Quick amounts */}
            <div className="grid grid-cols-4 gap-2">
              {[50, 100, 200, 500].map(v => (
                <button
                  key={v}
                  onClick={() => setAmount(String(v))}
                  className="py-2 rounded-xl text-sm font-bold"
                  style={{
                    background: amount === String(v) ? teal : "rgba(255,255,255,0.08)",
                    color: amount === String(v) ? "white" : "rgba(255,255,255,0.7)",
                  }}
                >
                  ${v}
                </button>
              ))}
            </div>

            {/* Memo */}
            <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.06)" }}>
              <label className="block text-sm font-semibold mb-2" style={{ color: "rgba(255,255,255,0.7)" }}>
                Nota (opcional)
              </label>
              <input
                type="text"
                placeholder="Ej: Para la renta, Para la comida..."
                maxLength={60}
                value={memo}
                onChange={e => setMemo(e.target.value)}
                className="w-full text-white bg-transparent outline-none text-sm"
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 p-4 rounded-xl" style={{ background: "#FFF4F3", border: "1px solid #FCDAD7" }}>
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "#C0392B" }} />
                <p className="text-sm" style={{ color: "#C0392B" }}>{error}</p>
              </div>
            )}

            <button
              onClick={handleConfirm}
              disabled={!amount || parseFloat(amount) < 10}
              className="w-full py-4 rounded-2xl font-bold text-white text-base flex items-center justify-center gap-2 disabled:opacity-40"
              style={{ background: teal }}
            >
              Continuar
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Step: confirm */}
        {step === "confirm" && (
          <div className="space-y-4">
            <div className="rounded-2xl p-6 space-y-4" style={{ background: "rgba(255,255,255,0.06)" }}>
              <h2 className="text-white font-bold text-lg">Resumen</h2>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <span style={{ color: "rgba(255,255,255,0.6)" }}>Destinatario</span>
                  <span className="text-white font-semibold">{maskPhone(recipientPhone)}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: "rgba(255,255,255,0.6)" }}>Monto</span>
                  <span className="text-white font-bold text-lg">${parseFloat(amount).toFixed(2)} MXN</span>
                </div>
                {memo && (
                  <div className="flex justify-between">
                    <span style={{ color: "rgba(255,255,255,0.6)" }}>Nota</span>
                    <span className="text-white">{memo}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span style={{ color: "rgba(255,255,255,0.6)" }}>Comisión</span>
                  <span style={{ color: "#1D9E75" }} className="font-semibold">Gratis</span>
                </div>
              </div>

              <div className="pt-2 border-t" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
                <div className="flex justify-between">
                  <span className="text-white font-bold">Total a enviar</span>
                  <span className="font-bold text-xl" style={{ color: "#1D9E75" }}>${parseFloat(amount).toFixed(2)} MXN</span>
                </div>
              </div>
            </div>

            {recipientIsNew && (
              <div className="rounded-xl p-4 flex items-start gap-3" style={{ background: "rgba(255,165,0,0.08)", border: "1px solid rgba(255,165,0,0.2)" }}>
                <UserPlus className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "rgba(255,200,80,0.9)" }} />
                <p className="text-xs leading-relaxed" style={{ color: "rgba(255,200,80,0.9)" }}>
                  Este número aún no está registrado. Su saldo quedará reservado y recibirán un WhatsApp para reclamarlo en pagoyamx.com.
                </p>
              </div>
            )}

            <p className="text-center text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
              Esta transferencia es inmediata e irreversible. Verifica el número antes de confirmar.
            </p>

            {error && (
              <div className="flex items-start gap-2 p-4 rounded-xl" style={{ background: "#FFF4F3", border: "1px solid #FCDAD7" }}>
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "#C0392B" }} />
                <p className="text-sm" style={{ color: "#C0392B" }}>{error}</p>
              </div>
            )}

            <button
              onClick={handleExecute}
              disabled={loading}
              className="w-full py-4 rounded-2xl font-bold text-white text-base flex items-center justify-center gap-2 disabled:opacity-40"
              style={{ background: teal }}
            >
              {loading ? (
                <span className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Confirmar y enviar
                </>
              )}
            </button>

            <button
              onClick={() => setStep("amount")}
              className="w-full py-3 rounded-2xl font-semibold text-sm"
              style={{ color: "rgba(255,255,255,0.6)" }}
            >
              Cancelar
            </button>
          </div>
        )}

        {/* Step: success */}
        {step === "success" && successData && (
          <div className="space-y-4 text-center">
            <div className="flex justify-center pt-4">
              <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: "rgba(29,158,117,0.2)" }}>
                <CheckCircle className="w-10 h-10" style={{ color: teal }} />
              </div>
            </div>

            <div>
              <p className="text-4xl font-bold text-white">${successData.amount.toFixed(2)}</p>
              <p className="text-lg" style={{ color: "rgba(255,255,255,0.7)" }}>MXN enviados</p>
            </div>

            <div className="rounded-2xl p-5 text-left space-y-3" style={{ background: "rgba(255,255,255,0.06)" }}>
              <div className="flex justify-between">
                <span style={{ color: "rgba(255,255,255,0.6)" }}>Enviado a</span>
                <span className="text-white font-semibold">{maskPhone(successData.recipient)}</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: "rgba(255,255,255,0.6)" }}>Tu nuevo saldo</span>
                <span className="font-bold" style={{ color: teal }}>${successData.newBalance.toFixed(2)} MXN</span>
              </div>
              <div className="flex justify-between">
                <span style={{ color: "rgba(255,255,255,0.6)" }}>Recibo</span>
                <span style={{ color: teal }} className="text-sm">Enviado por WhatsApp</span>
              </div>
            </div>

            <div className="pt-2 space-y-3">
              <button
                onClick={() => {
                  setSenderPhone(""); setRecipientPhone(""); setAmount(""); setMemo("");
                  setRecipientExists(null); setLimits(null); setError(null); setSuccessData(null);
                  setStep("phone");
                }}
                className="w-full py-4 rounded-2xl font-bold text-white"
                style={{ background: teal }}
              >
                Enviar otra transferencia
              </button>
              <button
                onClick={() => navigate("/wallet/historial")}
                className="w-full py-3 rounded-2xl font-semibold text-sm"
                style={{ color: "rgba(255,255,255,0.6)" }}
              >
                Ver historial
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
