import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useLocation } from "wouter";
import { ArrowLeft, Banknote, CreditCard, ExternalLink, Copy, CheckCircle, Lock, Trash2, Building2, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import PaulaHint from "@/components/PaulaHint";
const logoUrl = "/pagoya-logo.png";

const QUICK_AMOUNTS = [100, 200, 500, 1000];

interface OxxoResult {
  voucherUrl: string;
  barcodeReference: string;
  expiresAt: string;
  transactionId: string;
  amountMXN: number;
}

interface SavedCard {
  id: string;
  lastFour: string;
  brand: string;
  isDefault: boolean;
}

interface StpInstructions {
  clabe: string | null;
  empresa: string | null;
  concept_instructions: string;
  enabled: boolean;
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

// ---------------------------------------------------------------------------
// Luhn check for client-side card number validation
// ---------------------------------------------------------------------------
function luhnCheck(num: string): boolean {
  const digits = num.replace(/\D/g, "");
  if (digits.length < 13) return false;
  let sum = 0;
  let isEven = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = parseInt(digits[i], 10);
    if (isEven) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    isEven = !isEven;
  }
  return sum % 10 === 0;
}

// ---------------------------------------------------------------------------
// Conekta tokenization (Promise wrapper around the callback API)
// ---------------------------------------------------------------------------
interface ConektaTokenError {
  message_to_purchaser?: string;
  message?: string;
  type?: string;
  code?: string;
  param?: string;
  details?: Array<{ message?: string; code?: string; param?: string }>;
}

function tokenizeCard(card: {
  number: string;
  name: string;
  exp_year: string;
  exp_month: string;
  cvc: string;
}): Promise<string> {
  return new Promise((resolve, reject) => {
    const C = (window as unknown as { Conekta?: {
      setPublicKey: (k: string) => void;
      token: {
        create: (
          data: { card: typeof card },
          ok: (t: { id: string }) => void,
          err: (e: ConektaTokenError) => void
        ) => void;
      };
    } }).Conekta;

    if (!C) {
      reject(new Error("Conekta no está disponible. Recarga la página."));
      return;
    }

    C.token.create(
      { card },
      (token) => resolve(token.id),
      (err) => {
        // Log the full error object so it's visible in browser DevTools
        console.error("[Conekta tokenize error]", JSON.stringify(err));
        const detail =
          err.details?.[0]?.message ??
          err.message_to_purchaser ??
          err.message ??
          "Error al procesar la tarjeta.";
        reject(new Error(detail));
      },
    );
  });
}

export default function CashLoad() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // Rep referral code from URL query string (?ref=CODE)
  const repCode = new URLSearchParams(window.location.search).get("ref") || undefined;

  // ── Initialize Conekta public key ───────────────────────────────────────
  useEffect(() => {
    const key = import.meta.env.VITE_CONEKTA_PUBLIC_KEY as string | undefined;
    const C = (window as unknown as { Conekta?: { setPublicKey: (k: string) => void } }).Conekta;
    if (key && C) {
      C.setPublicKey(key);
    }
  }, []);

  // ── OXXO state (unchanged) ──────────────────────────────────────────────
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

  // ── Card state ──────────────────────────────────────────────────────────
  const [cardTelInput, setCardTelInput] = useState(telefono);
  const [cardAmount, setCardAmount] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  const [cardName, setCardName] = useState("");
  const [cardLoading, setCardLoading] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);
  const [saveCard, setSaveCard] = useState(false);
  const [savedCards, setSavedCards] = useState<SavedCard[]>([]);
  const [savedCardsLoaded, setSavedCardsLoaded] = useState(false);
  const [chargingCardId, setChargingCardId] = useState<string | null>(null);
  const [deletingCardId, setDeletingCardId] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'oxxo' | 'card' | 'spei'>('oxxo');
  const [stpData, setStpData] = useState<StpInstructions | null>(null);
  const [stpLoading, setStpLoading] = useState(false);
  const [stpClabeCopiado, setStpClabeCopiado] = useState(false);

  // Keep card phone in sync with stored telefono
  useEffect(() => {
    setCardTelInput(telefono);
  }, [telefono]);

  const fetchSavedCards = async (tel: string) => {
    if (tel.length < 10) {
      setSavedCards([]);
      setSavedCardsLoaded(true);
      return;
    }
    setSavedCardsLoaded(false);
    try {
      const res = await fetch(
        `${window.location.origin}/api/cards/${encodeURIComponent("+52" + tel)}`,
      );
      if (res.ok) {
        const data = await res.json();
        setSavedCards(data.cards ?? []);
      }
    } catch {}
    setSavedCardsLoaded(true);
  };

  useEffect(() => {
    fetchSavedCards(cardTelInput);
  }, [cardTelInput]);

  const fetchStpInstructions = async () => {
    const tel = telefono || "+521234567890";
    setStpLoading(true);
    try {
      const res = await fetch(
        `${window.location.origin}/api/stp/instructions/${encodeURIComponent(tel)}`,
      );
      if (res.ok) {
        const data = await res.json();
        setStpData(data as StpInstructions);
      }
    } catch {}
    setStpLoading(false);
  };

  useEffect(() => {
    if (activeTab === 'spei') {
      fetchStpInstructions();
    }
  }, [activeTab, telefono]);

  const handleCopiarClabe = async () => {
    if (!stpData?.clabe) return;
    await navigator.clipboard.writeText(stpData.clabe).catch(() => {});
    setStpClabeCopiado(true);
    setTimeout(() => setStpClabeCopiado(false), 2000);
  };

  const handleCardAmountChip = (val: number) => {
    setCardAmount(String(val));
    setCardError(null);
  };

  const handleCardAmountChange = (raw: string) => {
    setCardAmount(raw.replace(/[^\d]/g, ""));
    setCardError(null);
  };

  const handleCardNumberChange = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 16);
    const formatted = digits.replace(/(.{4})(?=.)/g, "$1 ");
    setCardNumber(formatted);
    setCardError(null);
  };

  const handleCardExpiryChange = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 4);
    const formatted =
      digits.length > 2 ? digits.slice(0, 2) + "/" + digits.slice(2) : digits;
    setCardExpiry(formatted);
    setCardError(null);
  };

  const handleCardSubmit = async () => {
    // ── Client-side validation ──────────────────────────────────────────
    const tel = cardTelInput.trim();
    if (!tel || tel.length < 10) {
      setCardError("Ingresa un número de teléfono válido (10 dígitos).");
      return;
    }

    const amtNum = parseInt(cardAmount, 10);
    if (!amtNum || amtNum < 50) {
      setCardError("El monto mínimo es $50 MXN.");
      return;
    }
    if (amtNum > 10_000) {
      setCardError("El monto máximo es $10,000 MXN.");
      return;
    }

    const rawCardNum = cardNumber.replace(/\s/g, "");
    if (rawCardNum.length < 13 || !luhnCheck(rawCardNum)) {
      setCardError("Número de tarjeta inválido.");
      return;
    }

    const expiryParts = cardExpiry.split("/");
    const expMonth = expiryParts[0] ?? "";
    const expYear = expiryParts[1] ?? "";
    if (expMonth.length !== 2 || expYear.length !== 2) {
      setCardError("Ingresa una fecha de vencimiento válida (MM/AA).");
      return;
    }
    const monthNum = parseInt(expMonth, 10);
    if (monthNum < 1 || monthNum > 12) {
      setCardError("Mes de vencimiento inválido.");
      return;
    }

    if (cardCvc.length < 3) {
      setCardError("El código de seguridad debe tener al menos 3 dígitos.");
      return;
    }

    if (!cardName.trim()) {
      setCardError("Ingresa el nombre del titular de la tarjeta.");
      return;
    }

    setCardLoading(true);
    setCardError(null);

    try {
      // ── Tokenize card with Conekta ──────────────────────────────────
      const tokenId = await tokenizeCard({
        number: rawCardNum,
        name: cardName.trim(),
        exp_year: "20" + expYear,
        exp_month: expMonth,
        cvc: cardCvc,
      });

      // ── Get walletId by phone ────────────────────────────────────────
      const balRes = await fetch(
        `${window.location.origin}/api/wallet/balance?telefono=${encodeURIComponent("+52" + tel)}`,
      );
      const balData = await balRes.json();
      if (!balRes.ok || !balData.walletId) {
        setCardError(balData.error ?? "No se pudo obtener la cartera. Intenta de nuevo.");
        return;
      }

      // ── Charge card (save path: create customer + persist source) ────
      if (saveCard) {
        const saveRes = await fetch(`${window.location.origin}/api/cards/charge-and-save`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ telefono: "+52" + tel, amount_mxn: amtNum, save_card: true, tokenId }),
        });
        const saveData = await saveRes.json();
        if (!saveRes.ok) {
          setCardError(saveData.error ?? "Error al procesar el pago. Intenta de nuevo.");
          return;
        }
        setTelefono("+52" + tel);
        toast({
          title: "¡Tarjeta guardada y saldo agregado!",
          description: saveData.newBalance != null
            ? `Tu nuevo saldo es $${saveData.newBalance.toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN`
            : "Tu saldo ha sido actualizado.",
        });
        window.dispatchEvent(new CustomEvent("pagoya:wallet-refresh"));
        await fetchSavedCards(tel);
        setSaveCard(false);
        setCardAmount(""); setCardNumber(""); setCardExpiry(""); setCardCvc(""); setCardName("");
        return;
      }

      // ── Charge card (one-time path) ───────────────────────────────────
      const chargeRes = await fetch(`${window.location.origin}/api/wallet/load/card`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletId: balData.walletId, amount: amtNum, tokenId, ...(repCode ? { rep_code: repCode } : {}) }),
      });
      const chargeData = await chargeRes.json();
      if (!chargeRes.ok) {
        setCardError(chargeData.error ?? "Error al procesar el pago. Intenta de nuevo.");
        return;
      }

      // ── Success ──────────────────────────────────────────────────────
      setTelefono("+52" + tel);

      toast({
        title: "¡Saldo agregado!",
        description: chargeData.newBalance != null
          ? `Tu nuevo saldo es $${chargeData.newBalance.toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN`
          : "Tu saldo ha sido actualizado.",
      });

      // Signal any mounted WalletBalanceWidget to re-fetch
      window.dispatchEvent(new CustomEvent("pagoya:wallet-refresh"));

      // Reset card form
      setCardAmount("");
      setCardNumber("");
      setCardExpiry("");
      setCardCvc("");
      setCardName("");
    } catch (err: unknown) {
      setCardError(
        err instanceof Error
          ? err.message
          : "Error al procesar el pago. Intenta de nuevo.",
      );
    } finally {
      setCardLoading(false);
    }
  };

  const handleSavedCardCharge = async (cardId: string) => {
    const amtNum = parseInt(cardAmount, 10);
    if (!amtNum || amtNum < 50) {
      setCardError("Ingresa un monto antes de cobrar (mínimo $50 MXN).");
      return;
    }
    setChargingCardId(cardId);
    setCardError(null);
    try {
      const res = await fetch(`${window.location.origin}/api/cards/${cardId}/charge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount_mxn: amtNum }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCardError(data.error ?? "Error al cobrar la tarjeta. Intenta de nuevo.");
        return;
      }
      setTelefono("+52" + cardTelInput);
      toast({
        title: "¡Saldo agregado!",
        description:
          data.newBalance != null
            ? `Tu nuevo saldo es $${data.newBalance.toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN`
            : "Tu saldo ha sido actualizado.",
      });
      window.dispatchEvent(new CustomEvent("pagoya:wallet-refresh"));
      setCardAmount("");
    } catch {
      setCardError("No se pudo conectar. Intenta de nuevo.");
    } finally {
      setChargingCardId(null);
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    setDeletingCardId(cardId);
    try {
      const res = await fetch(`${window.location.origin}/api/cards/${cardId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setSavedCards((prev) => prev.filter((c) => c.id !== cardId));
      } else {
        const data = await res.json();
        setCardError(data.error ?? "Error al eliminar la tarjeta.");
      }
    } catch {
      setCardError("No se pudo conectar. Intenta de nuevo.");
    } finally {
      setDeletingCardId(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#F7F7F7" }}>
      <Helmet>
        <title>Cargar saldo con OXXO | PagoYa Wallet</title>
        <meta name="description" content="Recarga tu wallet PagoYa en efectivo en cualquier OXXO. Rápido, seguro y sin tarjeta de crédito." />
        <meta name="keywords" content="recargar saldo OXXO, cargar wallet en efectivo, pago en efectivo servicios México" />
        <meta name="robots" content="noindex,follow" />
        <link rel="canonical" href="https://pagoyamx.com/cargar" />
      </Helmet>
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

        {/* Method selector tabs */}
        <div className="flex gap-1 p-1 rounded-2xl" style={{ background: "#ECECEC" }}>
          <button
            onClick={() => setActiveTab('oxxo')}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all"
            style={{
              background: activeTab === 'oxxo' ? 'white' : 'transparent',
              color: activeTab === 'oxxo' ? '#1F1F1F' : '#6B7280',
              boxShadow: activeTab === 'oxxo' ? '0 1px 4px rgba(0,0,0,0.12)' : 'none',
            }}
          >
            <Banknote className="w-3.5 h-3.5" />
            Efectivo
          </button>
          <button
            onClick={() => setActiveTab('card')}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all"
            style={{
              background: activeTab === 'card' ? 'white' : 'transparent',
              color: activeTab === 'card' ? '#1F1F1F' : '#6B7280',
              boxShadow: activeTab === 'card' ? '0 1px 4px rgba(0,0,0,0.12)' : 'none',
            }}
          >
            <CreditCard className="w-3.5 h-3.5" />
            Tarjeta
          </button>
          <button
            onClick={() => setActiveTab('spei')}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all"
            style={{
              background: activeTab === 'spei' ? 'white' : 'transparent',
              color: activeTab === 'spei' ? '#1F1F1F' : '#6B7280',
              boxShadow: activeTab === 'spei' ? '0 1px 4px rgba(0,0,0,0.12)' : 'none',
            }}
          >
            <Building2 className="w-3.5 h-3.5" />
            SPEI
          </button>
        </div>

        {/* Section A — OXXO cash load */}
        {activeTab === 'oxxo' && (
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
              <div style={{ textAlign: "center" }}>
                <PaulaHint
                  message="¿Cómo hago el depósito en OXXO? No entiendo cómo funciona el voucher."
                  label="¿Cómo funciona el depósito en OXXO?"
                />
              </div>
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
        )}

        {/* Section B — Card load */}
        {activeTab === 'card' && (
        <div
          className="bg-white rounded-3xl p-6"
          style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.07)", border: "1px solid #F0F0F0" }}
        >
          {/* Section header */}
          <div className="flex items-center gap-3 mb-5">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: "#F5F3FF", border: "1.5px solid #DDD8FB" }}
            >
              <CreditCard className="w-5 h-5" style={{ color: "#7F77DD" }} />
            </div>
            <div>
              <h2 className="text-sm font-black text-[#1F1F1F] leading-tight">Cargar con tarjeta</h2>
              <p className="text-xs text-gray-400">Visa, Mastercard, AMEX</p>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            {/* Phone */}
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
                  value={cardTelInput}
                  onChange={(e) => {
                    setCardTelInput(e.target.value.replace(/\D/g, "").slice(0, 10));
                    setCardError(null);
                  }}
                  className="flex-1 text-sm text-[#1F1F1F] outline-none bg-transparent"
                />
              </div>
            </div>

            {/* Amount */}
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
                  value={cardAmount}
                  onChange={(e) => handleCardAmountChange(e.target.value)}
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
                  onClick={() => handleCardAmountChip(val)}
                  className="px-4 py-2 rounded-full text-sm font-bold transition-all active:scale-[0.95]"
                  style={{
                    background: cardAmount === String(val) ? "#7F77DD" : "#F5F3FF",
                    color: cardAmount === String(val) ? "white" : "#7F77DD",
                    border: `1.5px solid ${cardAmount === String(val) ? "#7F77DD" : "#DDD8FB"}`,
                  }}
                >
                  ${val.toLocaleString("es-MX")}
                </button>
              ))}
            </div>

            {/* Tarjetas guardadas */}
            {savedCardsLoaded && savedCards.length > 0 && (
              <div className="flex flex-col gap-2 pt-1">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                  Tarjetas guardadas
                </p>
                {savedCards.map((card) => (
                  <div
                    key={card.id}
                    className="flex items-center gap-2 rounded-2xl px-4 py-3"
                    style={{ background: "#F5F3FF", border: "1.5px solid #DDD8FB" }}
                  >
                    <CreditCard className="w-4 h-4 flex-shrink-0" style={{ color: "#7F77DD" }} />
                    <span className="text-sm font-bold text-[#1F1F1F] flex-1">
                      {card.brand.charAt(0).toUpperCase() + card.brand.slice(1)} ···{card.lastFour}
                    </span>
                    <button
                      onClick={() => handleSavedCardCharge(card.id)}
                      disabled={!!chargingCardId || !!deletingCardId || cardLoading}
                      className="px-3 py-1.5 rounded-xl text-xs font-black transition-all active:scale-[0.95] disabled:opacity-50"
                      style={{ background: "#7F77DD", color: "white" }}
                    >
                      {chargingCardId === card.id ? "..." : "Cobrar"}
                    </button>
                    <button
                      onClick={() => handleDeleteCard(card.id)}
                      disabled={!!chargingCardId || !!deletingCardId || cardLoading}
                      className="p-1.5 rounded-xl transition-all active:scale-[0.95] disabled:opacity-50"
                      title="Eliminar tarjeta"
                    >
                      <Trash2 className="w-4 h-4" style={{ color: deletingCardId === card.id ? "#ccc" : "#E57373" }} />
                    </button>
                  </div>
                ))}
                <p className="text-xs text-gray-400 text-center mt-1">— o ingresa una tarjeta nueva —</p>
              </div>
            )}

            {/* Card number */}
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">
                Número de tarjeta
              </label>
              <div
                className="flex items-center rounded-2xl px-4 py-3"
                style={{
                  background: "white",
                  border: "1.5px solid #E5E5E5",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                }}
              >
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="1234 5678 9012 3456"
                  value={cardNumber}
                  onChange={(e) => handleCardNumberChange(e.target.value)}
                  className="flex-1 text-sm font-bold text-[#1F1F1F] outline-none bg-transparent tracking-wider"
                  autoComplete="cc-number"
                />
                <CreditCard className="w-4 h-4 flex-shrink-0 ml-2" style={{ color: "#CCCCCC" }} />
              </div>
            </div>

            {/* Expiry + CVC row */}
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">
                  Vencimiento
                </label>
                <div
                  className="flex items-center rounded-2xl px-4 py-3"
                  style={{
                    background: "white",
                    border: "1.5px solid #E5E5E5",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                  }}
                >
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="MM/AA"
                    value={cardExpiry}
                    onChange={(e) => handleCardExpiryChange(e.target.value)}
                    className="w-full text-sm font-bold text-[#1F1F1F] outline-none bg-transparent tracking-wider"
                    autoComplete="cc-exp"
                    maxLength={5}
                  />
                </div>
              </div>
              <div className="flex-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">
                  CVC
                </label>
                <div
                  className="flex items-center rounded-2xl px-4 py-3"
                  style={{
                    background: "white",
                    border: "1.5px solid #E5E5E5",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                  }}
                >
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="123"
                    value={cardCvc}
                    onChange={(e) => {
                      setCardCvc(e.target.value.replace(/\D/g, "").slice(0, 4));
                      setCardError(null);
                    }}
                    className="w-full text-sm font-bold text-[#1F1F1F] outline-none bg-transparent tracking-wider"
                    autoComplete="cc-csc"
                    maxLength={4}
                  />
                </div>
              </div>
            </div>

            {/* Cardholder name */}
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">
                Nombre del titular
              </label>
              <div
                className="flex items-center rounded-2xl px-4 py-3"
                style={{
                  background: "white",
                  border: "1.5px solid #E5E5E5",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                }}
              >
                <input
                  type="text"
                  placeholder="Como aparece en la tarjeta"
                  value={cardName}
                  onChange={(e) => {
                    setCardName(e.target.value);
                    setCardError(null);
                  }}
                  className="flex-1 text-sm text-[#1F1F1F] outline-none bg-transparent"
                  autoComplete="cc-name"
                />
              </div>
            </div>

            {/* Save card checkbox */}
            <label className="flex items-center gap-2.5 cursor-pointer select-none py-1">
              <input
                type="checkbox"
                checked={saveCard}
                onChange={(e) => setSaveCard(e.target.checked)}
                className="w-4 h-4 rounded accent-[#7F77DD]"
              />
              <span className="text-sm text-gray-600 font-medium">Guardar esta tarjeta</span>
            </label>

            {/* Helper text */}
            <p className="text-xs text-gray-400 text-center leading-relaxed">
              Mínimo $50 · Máximo $10,000
            </p>

            {/* Error */}
            {cardError && (
              <div
                className="rounded-xl px-4 py-3 text-sm font-medium"
                style={{ background: "#FFF4F3", color: "#C0392B", border: "1px solid #FCDAD7" }}
              >
                {cardError}
              </div>
            )}

            {/* Submit */}
            <button
              onClick={handleCardSubmit}
              disabled={cardLoading}
              className="w-full py-4 rounded-2xl text-white text-sm font-black flex items-center justify-center gap-2 transition-all active:scale-[0.97] disabled:opacity-60"
              style={{
                background: cardLoading
                  ? "#1D9E75"
                  : "linear-gradient(135deg, #1D9E75 0%, #25C090 100%)",
                boxShadow: "0 4px 16px rgba(29,158,117,0.32)",
              }}
            >
              {cardLoading ? (
                <>
                  <span
                    className="w-4 h-4 rounded-full border-2 border-white border-t-transparent"
                    style={{ animation: "spin 0.7s linear infinite" }}
                  />
                  Procesando pago...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  Cargar con tarjeta
                </>
              )}
            </button>

            {/* Security note */}
            <p className="text-xs text-gray-400 text-center flex items-center justify-center gap-1">
              <Lock className="w-3 h-3" />
              Pago seguro con encriptación SSL · Conekta
            </p>
          </div>
        </div>
        )}

        {/* Section C — SPEI transfer */}
        {activeTab === 'spei' && (
        <div
          className="bg-white rounded-3xl p-6"
          style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.07)", border: "1px solid #F0F0F0" }}
        >
          {/* Section header */}
          <div className="flex items-center gap-3 mb-5">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: "#EFF6FF", border: "1.5px solid #BFDBFE" }}
            >
              <Building2 className="w-5 h-5" style={{ color: "#2563EB" }} />
            </div>
            <div>
              <h2 className="text-sm font-black text-[#1F1F1F] leading-tight">Transferencia SPEI</h2>
              <p className="text-xs text-gray-400">Desde tu banco directo a PagoYa</p>
            </div>
          </div>

          {stpLoading ? (
            <div className="flex items-center justify-center py-8">
              <span
                className="w-6 h-6 rounded-full border-2 border-[#2563EB] border-t-transparent"
                style={{ animation: "spin 0.7s linear infinite" }}
              />
            </div>
          ) : stpData?.enabled ? (
            <div className="flex flex-col gap-4">
              {/* CLABE */}
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">
                  CLABE interbancaria
                </label>
                <div
                  className="flex items-center rounded-2xl px-4 py-3"
                  style={{ background: "#F7F7F7", border: "1.5px solid #E5E5E5" }}
                >
                  <span className="flex-1 text-sm font-black text-[#1F1F1F] tracking-widest">
                    {stpData.clabe}
                  </span>
                  <button
                    onClick={handleCopiarClabe}
                    className="flex-shrink-0 p-2 rounded-xl transition-all active:scale-[0.92]"
                    style={{ background: stpClabeCopiado ? "#1D9E75" : "#ECECEC" }}
                    title="Copiar CLABE"
                  >
                    {stpClabeCopiado
                      ? <CheckCircle className="w-4 h-4 text-white" />
                      : <Copy className="w-4 h-4 text-gray-500" />
                    }
                  </button>
                </div>
              </div>

              {/* Empresa */}
              {stpData.empresa && (
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 block">
                    Empresa / beneficiario
                  </label>
                  <div
                    className="rounded-2xl px-4 py-3"
                    style={{ background: "#F7F7F7", border: "1.5px solid #E5E5E5" }}
                  >
                    <p className="text-sm font-bold text-[#1F1F1F]">{stpData.empresa}</p>
                  </div>
                </div>
              )}

              {/* Concept warning */}
              <div
                className="rounded-2xl px-4 py-4 flex flex-col gap-2"
                style={{ background: "#FFF8E1", border: "1.5px solid #FBBF24" }}
              >
                <p className="text-xs font-black text-yellow-800 uppercase tracking-widest">
                  ⚠️ Concepto de pago — obligatorio
                </p>
                <p className="text-lg font-black text-[#1F1F1F]">
                  {telefono || "Tu número de teléfono"}
                </p>
                <p className="text-xs text-yellow-800 leading-relaxed">
                  Debes escribir exactamente tu número de teléfono como concepto de pago para que tu saldo se acredite automáticamente.
                </p>
              </div>

              {/* Info grid */}
              <div className="grid grid-cols-2 gap-3">
                <div
                  className="rounded-2xl px-4 py-3"
                  style={{ background: "#F0FAF3", border: "1px solid #D4EDDA" }}
                >
                  <p className="text-xs text-gray-500 mb-0.5">Monto mínimo</p>
                  <p className="text-sm font-black text-[#046C2C]">$50 MXN</p>
                </div>
                <div
                  className="rounded-2xl px-4 py-3"
                  style={{ background: "#EFF6FF", border: "1px solid #BFDBFE" }}
                >
                  <p className="text-xs text-gray-500 mb-0.5">Acreditación</p>
                  <p className="text-sm font-black text-[#2563EB]">2–5 min</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-6">
              <p className="text-4xl">⏳</p>
              <p className="text-base font-black text-[#1F1F1F]">Próximamente</p>
              <p className="text-sm text-gray-400 text-center leading-relaxed">
                Las transferencias SPEI estarán disponibles muy pronto en PagoYa.
              </p>
            </div>
          )}
        </div>
        )}

        {/* Débito directo — bank enrollment card */}
        <div
          onClick={() => window.location.href = "/vincular-banco"}
          className="rounded-3xl p-5 cursor-pointer"
          style={{
            background: "linear-gradient(135deg, #0A2540 0%, #0F2336 100%)",
            border: "1.5px solid #1E3A5F",
            boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
          }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(29,158,117,0.15)", border: "1.5px solid #1D9E75" }}
            >
              <Building2 className="w-5 h-5" style={{ color: "#1D9E75" }} />
            </div>
            <div>
              <div className="text-sm font-black text-white leading-tight">Débito directo desde tu banco</div>
              <div className="text-xs mt-0.5" style={{ color: "#475569" }}>Sin ir al OXXO — paga en 1 toque</div>
            </div>
            <ChevronRight className="w-4 h-4 ml-auto" style={{ color: "#1D9E75" }} />
          </div>
          <div className="flex gap-2 flex-wrap">
            {["BBVA", "Banamex", "Santander", "HSBC", "Banorte"].map(bank => (
              <span key={bank} className="text-xs px-2 py-0.5 rounded-full" style={{ background: "#0F2336", border: "1px solid #1E3A5F", color: "#64748B" }}>
                {bank}
              </span>
            ))}
            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "#0F2336", border: "1px solid #1E3A5F", color: "#64748B" }}>+4 más</span>
          </div>
          <div className="mt-3 text-xs" style={{ color: "#1D9E75" }}>
            Vincular mi cuenta →
          </div>
        </div>

      </main>

      {/* Spin keyframe injected once */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
