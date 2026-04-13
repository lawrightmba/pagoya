import { useLocation } from "wouter";
import { ArrowLeft, Edit2, CreditCard, ShieldCheck } from "lucide-react";
import { usePayment } from "@/context/PaymentContext";
import { useEffect, useState } from "react";

export default function PaymentReview() {
  const [, navigate] = useLocation();
  const { paymentData, setClientSecret, setPendingPaymentIntentId } = usePayment();
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState("");

  useEffect(() => {
    if (!paymentData.empresa) {
      navigate("/pagar");
    }
  }, []);

  const formatMonto = (monto: string) => {
    const num = parseFloat(monto);
    return isNaN(num) ? monto : `$${num.toFixed(2)} MXN`;
  };

  const handlePagar = async () => {
    setLoading(true);
    setApiError("");

    try {
      const res = await fetch(`${window.location.origin}/api/pagoya/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          empresa: paymentData.empresa,
          categoria: paymentData.categoria,
          monto: parseFloat(paymentData.monto),
          referencia: paymentData.referencia,
          telefono: paymentData.telefono,
          notas: paymentData.notas,
        }),
      });

      if (!res.ok) {
        throw new Error("respuesta no exitosa");
      }

      const data = await res.json();
      setClientSecret(data.clientSecret);
      setPendingPaymentIntentId(data.paymentIntentId);
      navigate("/tarjeta");
    } catch {
      setApiError("Error al procesar el pago. Intenta de nuevo.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#F7F7F7" }}>
      <header
        className="bg-white border-b border-gray-100 px-5 py-4 flex items-center gap-3 sticky top-0 z-10"
        style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}
      >
        <button
          onClick={() => navigate("/pagar")}
          className="w-10 h-10 rounded-2xl flex items-center justify-center transition-all active:scale-90"
          style={{ background: "#F0FAF3" }}
        >
          <ArrowLeft className="w-5 h-5" style={{ color: "#046C2C" }} />
        </button>
        <h1 className="text-base font-bold text-[#1F1F1F]">Revisar pago</h1>
      </header>

      <main className="flex-1 px-5 py-7">
        <div className="max-w-sm mx-auto flex flex-col gap-5">

          <div
            className="bg-white rounded-3xl p-6"
            style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.08)", border: "1px solid #F0F0F0" }}
          >
            <div className="flex items-center gap-4 mb-6 pb-5" style={{ borderBottom: "1px solid #F3F3F3" }}>
              <div
                className="rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: "linear-gradient(135deg, #046C2C 0%, #39A935 100%)", width: 52, height: 52 }}
              >
                <CreditCard className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">Resumen del pago</p>
                <p className="text-base font-black text-[#1F1F1F] truncate">{paymentData.empresa}</p>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <Row label="Empresa" value={paymentData.empresa} />
              <Row label="Categoría" value={paymentData.categoria} highlight />
              <div style={{ height: 1, background: "linear-gradient(90deg, #F0F0F0, #E8E8E8, #F0F0F0)" }} />
              <div className="flex items-center justify-between py-2">
                <span className="text-sm font-semibold text-gray-500">Monto total</span>
                <span className="text-2xl font-black" style={{ color: "#046C2C" }}>
                  {formatMonto(paymentData.monto)}
                </span>
              </div>
              <div style={{ height: 1, background: "linear-gradient(90deg, #F0F0F0, #E8E8E8, #F0F0F0)" }} />
              <Row label="Referencia" value={paymentData.referencia} mono />
              <Row label="Teléfono" value={paymentData.telefono} />
              {paymentData.notas && <Row label="Notas" value={paymentData.notas} />}
            </div>
          </div>

          <div
            className="rounded-2xl px-5 py-4 flex gap-3 items-start"
            style={{ background: "#F0FAF3", border: "1px solid #D4EDDA" }}
          >
            <ShieldCheck className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "#046C2C" }} />
            <p className="text-sm text-gray-600 leading-relaxed">
              Pago seguro y protegido. Al continuar confirmas que los datos son correctos.
            </p>
          </div>

          <div className="flex flex-col gap-3 pt-1">
            <button
              onClick={handlePagar}
              disabled={loading}
              className="w-full py-5 px-8 rounded-full text-white text-base font-bold transition-all duration-150 active:scale-[0.97] hover:scale-[1.02] disabled:opacity-70 disabled:cursor-not-allowed disabled:scale-100"
              style={{
                background: "linear-gradient(135deg, #046C2C 0%, #39A935 100%)",
                boxShadow: "0 6px 20px rgba(4,108,44,0.40)",
              }}
            >
              {loading ? "Procesando..." : "Continuar al pago"}
            </button>

            {apiError && (
              <p className="text-sm font-semibold text-center" style={{ color: "#E21A0A" }}>
                {apiError}
              </p>
            )}

            <button
              onClick={() => navigate("/pagar")}
              disabled={loading}
              className="w-full py-5 px-8 rounded-full text-[#046C2C] text-base font-bold border-2 border-[#046C2C] bg-white transition-all duration-150 active:scale-[0.97] hover:bg-[#F0FAF3] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Edit2 className="w-4 h-4" />
              Editar datos
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

function Row({ label, value, highlight, mono }: {
  label: string;
  value: string;
  highlight?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-gray-500 flex-shrink-0">{label}</span>
      <span
        className={["text-sm font-semibold text-right", mono ? "font-mono" : ""].join(" ")}
        style={{ color: highlight ? "#046C2C" : "#1F1F1F" }}
      >
        {value}
      </span>
    </div>
  );
}
