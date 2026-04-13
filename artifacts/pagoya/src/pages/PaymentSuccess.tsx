import { useLocation } from "wouter";
import { CheckCircle, Share2, Plus, AlertCircle } from "lucide-react";
import { usePayment } from "@/context/PaymentContext";
import logoUrl from "@assets/pagoya_logo_web_1774491466855.png";

export default function PaymentSuccess() {
  const [, navigate] = useLocation();
  const { paymentData, transactionId, transactionDate, resetPayment } = usePayment();

  const formatMonto = (monto: string) => {
    const num = parseFloat(monto);
    return isNaN(num) ? monto : `$${num.toFixed(2)} MXN`;
  };

  const handleWhatsApp = () => {
    const msg = encodeURIComponent(
      `Pago realizado con PagoYa ✅\nServicio: ${paymentData.empresa}\nMonto: ${formatMonto(paymentData.monto)}\nReferencia: ${paymentData.referencia}`
    );
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  };

  const handleNuevoPago = () => {
    resetPayment();
    navigate("/pagar");
  };

  if (!paymentData.empresa) {
    return (
      <div className="min-h-screen flex flex-col" style={{ background: "#F7F7F7" }}>
        <header className="bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-center" style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}>
          <img src={logoUrl} alt="PagoYa" className="w-64 h-auto object-contain" />
        </header>
        <main className="flex-1 flex items-center justify-center px-5 py-12">
          <div
            className="bg-white rounded-3xl p-8 max-w-sm w-full text-center"
            style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.08)", border: "1px solid #F0F0F0" }}
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
              style={{ background: "#FFF4F3", border: "1.5px solid #FCDAD7" }}
            >
              <AlertCircle className="w-8 h-8" style={{ color: "#E21A0A" }} />
            </div>
            <h2 className="text-xl font-black text-[#1F1F1F] mb-2">No hay un pago activo</h2>
            <p className="text-sm text-gray-500 leading-relaxed mb-6">
              Parece que llegaste aquí sin completar un pago. Puedes iniciar uno nuevo en segundos.
            </p>
            <button
              onClick={() => navigate("/pagar")}
              className="w-full py-4 rounded-full text-white text-sm font-bold transition-all active:scale-[0.97]"
              style={{
                background: "linear-gradient(135deg, #046C2C 0%, #39A935 100%)",
                boxShadow: "0 4px 16px rgba(4,108,44,0.32)",
              }}
            >
              Hacer un nuevo pago
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#F7F7F7" }}>
      {/* Header */}
      <header
        className="bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-center"
        style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}
      >
        <img src={logoUrl} alt="PagoYa" className="w-64 h-auto object-contain" />
      </header>

      <main className="flex-1 px-5 py-8">
        <div className="max-w-sm mx-auto flex flex-col gap-5">

          {/* Success hero */}
          <div className="flex flex-col items-center text-center pt-2 pb-4">
            {/* Pulse ring + icon */}
            <div className="relative flex items-center justify-center mb-6">
              <div
                className="absolute rounded-full animate-ping"
                style={{
                  width: 96, height: 96,
                  background: "rgba(57,169,53,0.18)",
                  animationDuration: "1.8s",
                }}
              />
              <div
                className="w-24 h-24 rounded-full flex items-center justify-center relative z-10"
                style={{
                  background: "linear-gradient(135deg, #046C2C 0%, #39A935 100%)",
                  boxShadow: "0 10px 32px rgba(4,108,44,0.38)",
                }}
              >
                <CheckCircle className="w-12 h-12 text-white" strokeWidth={2} />
              </div>
            </div>

            <h1 className="text-3xl font-black text-[#1F1F1F] mb-1">¡Pago realizado!</h1>
            <p className="text-sm text-gray-500">Tu transacción fue exitosa ✅</p>
          </div>

          {/* Receipt card */}
          <div
            className="bg-white rounded-3xl p-6"
            style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.08)", border: "1px solid #F0F0F0" }}
          >
            <div className="flex items-center justify-between mb-5 pb-4" style={{ borderBottom: "1px solid #F3F3F3" }}>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Detalles del pago</p>
              <span
                className="px-3 py-1.5 rounded-full text-xs font-bold"
                style={{ background: "#F0FAF3", color: "#046C2C" }}
              >
                ✓ Pagado
              </span>
            </div>

            <div className="flex flex-col gap-4">
              <Row label="Empresa" value={paymentData.empresa} />
              <Row label="Categoría" value={paymentData.categoria} />

              <div style={{ height: 1, background: "linear-gradient(90deg, #F0F0F0, #E8E8E8, #F0F0F0)" }} />

              {/* Amount hero */}
              <div className="flex items-center justify-between py-1">
                <span className="text-sm font-semibold text-gray-500">Monto pagado</span>
                <span className="text-2xl font-black" style={{ color: "#046C2C" }}>
                  {formatMonto(paymentData.monto)}
                </span>
              </div>

              <div style={{ height: 1, background: "linear-gradient(90deg, #F0F0F0, #E8E8E8, #F0F0F0)" }} />

              <Row label="Referencia" value={paymentData.referencia} mono />
              <Row label="Fecha y hora" value={transactionDate} />
              <Row label="ID de transacción" value={transactionId} mono muted />
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3 pt-1">
            <button
              onClick={handleWhatsApp}
              className="w-full py-5 px-8 rounded-full text-white text-base font-bold transition-all duration-150 active:scale-[0.97] hover:scale-[1.02] flex items-center justify-center gap-2"
              style={{
                background: "#25D366",
                boxShadow: "0 6px 20px rgba(37,211,102,0.40)",
              }}
            >
              <Share2 className="w-5 h-5" />
              Compartir por WhatsApp
            </button>

            <button
              onClick={handleNuevoPago}
              className="w-full py-5 px-8 rounded-full text-[#046C2C] text-base font-bold border-2 border-[#046C2C] bg-white transition-all duration-150 active:scale-[0.97] hover:bg-[#F0FAF3] flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Nuevo pago
            </button>

            <button
              onClick={() => { resetPayment(); navigate("/"); }}
              className="w-full py-3 px-6 text-sm text-gray-400 font-semibold transition-all active:scale-[0.97]"
            >
              Ir al inicio
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

function Row({ label, value, mono, muted }: {
  label: string;
  value: string;
  mono?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-gray-500 flex-shrink-0">{label}</span>
      <span
        className={[
          "text-right font-semibold break-all",
          mono ? "font-mono" : "",
          muted ? "text-xs text-gray-400" : "text-sm",
        ].join(" ")}
        style={{ color: muted ? undefined : "#1F1F1F" }}
      >
        {value}
      </span>
    </div>
  );
}
