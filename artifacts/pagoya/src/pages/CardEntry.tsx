import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Lock, ShieldCheck } from "lucide-react";
import { CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { usePayment } from "@/context/PaymentContext";

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      color: "#1F1F1F",
      fontFamily: "'Inter', 'system-ui', sans-serif",
      fontSize: "16px",
      fontSmoothing: "antialiased",
      "::placeholder": { color: "#9CA3AF" },
    },
    invalid: {
      color: "#E21A0A",
      iconColor: "#E21A0A",
    },
  },
};

export default function CardEntry() {
  const [, navigate] = useLocation();
  const stripe = useStripe();
  const elements = useElements();
  const {
    paymentData,
    clientSecret,
    pendingPaymentIntentId,
    setTransactionId,
    setTransactionDate,
  } = usePayment();

  const [loading, setLoading] = useState(false);
  const [cardError, setCardError] = useState("");

  useEffect(() => {
    if (!clientSecret || !paymentData.empresa) {
      navigate("/pagar");
    }
  }, []);

  const formatMonto = (monto: string) => {
    const num = parseFloat(monto);
    return isNaN(num) ? monto : `$${num.toFixed(2)} MXN`;
  };

  const handleConfirmar = async () => {
    if (!stripe || !elements) return;

    const card = elements.getElement(CardElement);
    if (!card) return;

    setLoading(true);
    setCardError("");

    const result = await stripe.confirmCardPayment(clientSecret, {
      payment_method: { card },
    });

    if (result.error) {
      setCardError(result.error.message ?? "Error al confirmar el pago. Intenta de nuevo.");
      setLoading(false);
      return;
    }

    const intentId = result.paymentIntent?.id ?? pendingPaymentIntentId;

    // Sync the confirmed status into the DB (in case the webhook hasn't fired).
    try {
      await fetch(`${import.meta.env.BASE_URL}api/pagoya/payments/${intentId}`);
    } catch {
      // Non-fatal — the DB sync is best-effort; navigation still proceeds.
    }

    setTransactionId(intentId);
    setTransactionDate(
      new Date().toLocaleString("es-MX", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    );
    navigate("/exito");
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#F7F7F7" }}>
      <header
        className="bg-white border-b border-gray-100 px-5 py-4 flex items-center gap-3 sticky top-0 z-10"
        style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}
      >
        <button
          onClick={() => navigate("/revisar")}
          disabled={loading}
          className="w-10 h-10 rounded-2xl flex items-center justify-center transition-all active:scale-90 disabled:opacity-50"
          style={{ background: "#F0FAF3" }}
        >
          <ArrowLeft className="w-5 h-5" style={{ color: "#046C2C" }} />
        </button>
        <h1 className="text-base font-bold text-[#1F1F1F]">Datos de pago</h1>
        <div className="ml-auto flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5" style={{ color: "#046C2C" }} />
          <span className="text-xs font-semibold" style={{ color: "#046C2C" }}>Seguro</span>
        </div>
      </header>

      <main className="flex-1 px-5 py-7">
        <div className="max-w-sm mx-auto flex flex-col gap-5">

          {/* Amount summary pill */}
          <div
            className="rounded-2xl px-5 py-4 flex items-center justify-between"
            style={{ background: "linear-gradient(135deg, #046C2C 0%, #39A935 100%)", boxShadow: "0 6px 20px rgba(4,108,44,0.30)" }}
          >
            <div>
              <p className="text-xs font-bold text-green-200 uppercase tracking-wider mb-0.5">Total a pagar</p>
              <p className="text-white font-black text-sm truncate max-w-[160px]">{paymentData.empresa}</p>
            </div>
            <span className="text-white text-2xl font-black">{formatMonto(paymentData.monto)}</span>
          </div>

          {/* Card input card */}
          <div
            className="bg-white rounded-3xl p-6"
            style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.08)", border: "1px solid #F0F0F0" }}
          >
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-5">
              Ingresa los datos de tu tarjeta
            </p>

            <div
              className="rounded-2xl px-4 py-4"
              style={{ border: "1.5px solid #E5E7EB", background: "#FAFAFA" }}
            >
              <CardElement options={CARD_ELEMENT_OPTIONS} />
            </div>

            {cardError && (
              <p className="text-sm font-semibold mt-3" style={{ color: "#E21A0A" }}>
                {cardError}
              </p>
            )}

            <p className="text-xs text-gray-400 mt-4 flex items-center gap-1.5">
              <Lock className="w-3 h-3 flex-shrink-0" />
              Procesado de forma segura por Stripe. No almacenamos datos de tu tarjeta.
            </p>
          </div>

          {/* Security note */}
          <div
            className="rounded-2xl px-5 py-4 flex gap-3 items-start"
            style={{ background: "#F0FAF3", border: "1px solid #D4EDDA" }}
          >
            <ShieldCheck className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "#046C2C" }} />
            <p className="text-sm text-gray-600 leading-relaxed">
              Pago cifrado con TLS. Tu información nunca se comparte con terceros.
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3 pt-1">
            <button
              onClick={handleConfirmar}
              disabled={loading || !stripe}
              className="w-full py-5 px-8 rounded-full text-white text-base font-bold transition-all duration-150 active:scale-[0.97] hover:scale-[1.02] disabled:opacity-70 disabled:cursor-not-allowed disabled:scale-100"
              style={{
                background: "linear-gradient(135deg, #046C2C 0%, #39A935 100%)",
                boxShadow: "0 6px 20px rgba(4,108,44,0.40)",
              }}
            >
              {loading ? "Confirmando pago..." : `Confirmar pago — ${formatMonto(paymentData.monto)}`}
            </button>

            <button
              onClick={() => navigate("/revisar")}
              disabled={loading}
              className="w-full py-4 px-8 rounded-full text-gray-500 text-sm font-semibold transition-all active:scale-[0.97] disabled:opacity-50"
            >
              Cancelar y regresar
            </button>
          </div>

        </div>
      </main>
    </div>
  );
}
