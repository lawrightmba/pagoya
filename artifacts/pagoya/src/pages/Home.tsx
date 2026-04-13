import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowRight, Zap, CheckCircle, FileText, Sparkles, RotateCcw } from "lucide-react";
import logoUrl from "@assets/pagoya_logo_web_1774491466855.png";
import { usePayment } from "@/context/PaymentContext";

const HINTS = [
  "Quiero pagar luz CFE",
  "Necesito pagar Telcel 500 pesos",
  "Voy a pagar internet izzi",
  "Quiero pagar mi renta",
];

const QUICK_CHIPS = [
  { label: "Luz", phrase: "Quiero pagar luz CFE" },
  { label: "Internet", phrase: "Voy a pagar internet izzi" },
  { label: "Celular", phrase: "Necesito pagar Telcel 300 pesos" },
  { label: "Renta", phrase: "Quiero pagar mi renta" },
  { label: "Streaming", phrase: "Quiero pagar Netflix" },
];

const RECENT_PAYMENTS = [
  { empresa: "CFE", categoria: "Luz", monto: "850" },
  { empresa: "Telcel", categoria: "Teléfono móvil", monto: "300" },
  { empresa: "Izzi", categoria: "Internet", monto: "649" },
];

function parseAIInput(text: string): { empresa: string; categoria: string; monto: string } {
  const t = text.toLowerCase();
  let empresa = "";
  let categoria = "";

  if (t.includes("cfe") || t.includes("luz")) { empresa = "CFE"; categoria = "Luz"; }
  else if (t.includes("agua")) { categoria = "Agua"; }
  else if (t.includes("gas")) { categoria = "Gas"; }
  else if (t.includes("izzi")) { empresa = "Izzi"; categoria = "Internet"; }
  else if (t.includes("totalplay")) { empresa = "Totalplay"; categoria = "Internet"; }
  else if (t.includes("internet")) { categoria = "Internet"; }
  else if (t.includes("telcel")) { empresa = "Telcel"; categoria = "Teléfono móvil"; }
  else if (t.includes("movistar")) { empresa = "Movistar"; categoria = "Teléfono móvil"; }
  else if (t.includes("netflix")) { empresa = "Netflix"; categoria = "Streaming"; }
  else if (t.includes("spotify")) { empresa = "Spotify"; categoria = "Streaming"; }
  else if (t.includes("streaming")) { categoria = "Streaming"; }
  else if (t.includes("seguro")) { categoria = "Seguro"; }
  else if (t.includes("escuela") || t.includes("colegiatura")) { categoria = "Escuela"; }
  else if (t.includes("renta")) { categoria = "Renta"; }
  else if (t.includes("préstamo") || t.includes("prestamo")) { categoria = "Préstamos"; }

  const montoMatch = text.match(/\b(\d{2,6})\b/);
  const monto = montoMatch ? montoMatch[1] : "";

  return { empresa, categoria, monto };
}

export default function Home() {
  const [, navigate] = useLocation();
  const { setPaymentData, paymentData } = usePayment();
  const [aiInput, setAiInput] = useState("");
  const [aiDone, setAiDone] = useState(false);
  const [hintIndex, setHintIndex] = useState(0);

  const handleAutofill = () => {
    if (!aiInput.trim()) return;
    const parsed = parseAIInput(aiInput);
    setPaymentData({
      ...paymentData,
      empresa: parsed.empresa || paymentData.empresa,
      categoria: parsed.categoria || paymentData.categoria,
      monto: parsed.monto || paymentData.monto,
      referencia: paymentData.referencia,
      telefono: paymentData.telefono,
      notas: paymentData.notas,
    });
    setAiDone(true);
    setTimeout(() => {
      navigate("/pagar");
    }, 900);
  };

  const handleChip = (phrase: string) => {
    setAiInput(phrase);
    setAiDone(false);
  };

  const handleRepeat = (payment: typeof RECENT_PAYMENTS[0]) => {
    setPaymentData({
      ...paymentData,
      empresa: payment.empresa,
      categoria: payment.categoria,
      monto: payment.monto,
    });
    navigate("/pagar");
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#F7F7F7" }}>
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-center" style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}>
        <img src={logoUrl} alt="PagoYa" className="w-64 h-auto object-contain" />
      </header>

      <main className="flex-1 flex flex-col">
        {/* Hero */}
        <section
          className="px-6 pt-12 pb-14 flex flex-col items-center text-center"
          style={{ background: "linear-gradient(180deg, #ffffff 0%, #f0faf3 100%)" }}
        >
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center mb-8"
            style={{
              background: "linear-gradient(135deg, #046C2C 0%, #39A935 100%)",
              boxShadow: "0 8px 24px rgba(4,108,44,0.28)",
            }}
          >
            <Zap className="w-10 h-10 text-white" strokeWidth={2.5} />
          </div>

          <h1 className="text-4xl font-black text-[#1F1F1F] leading-tight tracking-tight mb-3">
            Paga todo.
            <br />
            <span style={{ color: "#046C2C" }}>Sin filas.</span>
          </h1>

          <p className="text-base text-gray-500 max-w-xs leading-relaxed mb-10">
            Paga luz, internet, celular y más desde tu teléfono en segundos.
          </p>

          <div className="w-full max-w-sm flex flex-col gap-3">
            <button
              onClick={() => navigate("/pagar")}
              className="w-full py-5 px-8 rounded-full text-white text-base font-bold flex items-center justify-center gap-2 transition-all duration-150 active:scale-[0.97] hover:scale-[1.02]"
              style={{
                background: "linear-gradient(135deg, #046C2C 0%, #39A935 100%)",
                boxShadow: "0 6px 20px rgba(4,108,44,0.40)",
              }}
            >
              Pagar un servicio
              <ArrowRight className="w-5 h-5" />
            </button>

            <p className="text-xs text-gray-400 font-medium text-center -mt-1">Seguro. Rápido. Sin filas.</p>

            <button
              onClick={() => document.getElementById("como-funciona")?.scrollIntoView({ behavior: "smooth" })}
              className="w-full py-5 px-8 rounded-full text-[#046C2C] text-base font-bold border-2 border-[#046C2C] bg-white transition-all duration-150 active:scale-[0.97] hover:bg-[#F0FAF3]"
            >
              Ver cómo funciona
            </button>
          </div>
        </section>

        {/* AI Assistant Card */}
        <section className="px-5 pt-8 pb-2">
          <div
            className="rounded-3xl p-6 max-w-sm mx-auto"
            style={{
              background: "linear-gradient(145deg, #f0faf3 0%, #ffffff 100%)",
              boxShadow: "0 4px 20px rgba(4,108,44,0.10)",
              border: "1px solid #D4EDDA",
            }}
          >
            {/* Header */}
            <div className="flex items-center gap-3 mb-3">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: "linear-gradient(135deg, #046C2C 0%, #39A935 100%)" }}
              >
                <Sparkles className="w-5 h-5 text-white" strokeWidth={2} />
              </div>
              <div>
                <h2 className="text-base font-black text-[#1F1F1F] leading-tight">¿Qué necesitas pagar hoy?</h2>
                <p className="text-xs text-gray-500 leading-snug">Describe tu pago y llenamos el formulario.</p>
              </div>
            </div>

            {/* Input */}
            <input
              type="text"
              value={aiInput}
              onChange={(e) => { setAiInput(e.target.value); setAiDone(false); }}
              onKeyDown={(e) => e.key === "Enter" && handleAutofill()}
              placeholder={HINTS[hintIndex]}
              className="w-full rounded-2xl px-4 py-3.5 text-sm text-[#1F1F1F] outline-none transition-all mb-3"
              style={{
                background: "white",
                border: "1.5px solid #D4EDDA",
                boxShadow: "0 2px 8px rgba(4,108,44,0.06)",
              }}
              onFocus={() => setHintIndex((hintIndex + 1) % HINTS.length)}
            />

            {/* Button */}
            <button
              onClick={handleAutofill}
              disabled={!aiInput.trim()}
              className="w-full py-3.5 rounded-full text-white text-sm font-bold flex items-center justify-center gap-2 transition-all duration-150 active:scale-[0.97] disabled:opacity-50"
              style={{
                background: aiDone
                  ? "#39A935"
                  : "linear-gradient(135deg, #046C2C 0%, #39A935 100%)",
                boxShadow: "0 4px 16px rgba(4,108,44,0.32)",
              }}
            >
              {aiDone ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Listo. Te ayudamos a completar tu pago.
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Autocompletar con IA
                </>
              )}
            </button>
          </div>
        </section>

        {/* Quick Chips */}
        <section className="px-5 pt-4 pb-2">
          <div className="max-w-sm mx-auto">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 px-1">Sugerencias rápidas</p>
            <div className="flex flex-wrap gap-2">
              {QUICK_CHIPS.map((chip) => (
                <button
                  key={chip.label}
                  onClick={() => handleChip(chip.phrase)}
                  className="px-4 py-2 rounded-full text-sm font-semibold transition-all active:scale-[0.96]"
                  style={{
                    background: aiInput === chip.phrase ? "#046C2C" : "#F0FAF3",
                    color: aiInput === chip.phrase ? "white" : "#046C2C",
                    border: `1.5px solid ${aiInput === chip.phrase ? "#046C2C" : "#D4EDDA"}`,
                  }}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Recent Payments */}
        <section className="px-5 pt-8 pb-4">
          <div className="max-w-sm mx-auto">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 px-1">Pagos recientes</p>
            <div className="flex flex-col gap-3">
              {RECENT_PAYMENTS.map((p) => (
                <div
                  key={p.empresa}
                  className="bg-white rounded-2xl px-5 py-4 flex items-center gap-4"
                  style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.06)", border: "1px solid #F0F0F0" }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-sm font-black text-white"
                    style={{ background: "linear-gradient(135deg, #046C2C 0%, #39A935 100%)" }}
                  >
                    {p.empresa[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[#1F1F1F]">{p.empresa}</p>
                    <p className="text-xs text-gray-400">{p.categoria}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <span className="text-sm font-black text-[#046C2C]">${p.monto}</span>
                    <span
                      className="px-2.5 py-0.5 rounded-full text-xs font-bold"
                      style={{ background: "#F0FAF3", color: "#046C2C" }}
                    >
                      Pagado
                    </span>
                  </div>
                  <button
                    onClick={() => handleRepeat(p)}
                    className="ml-1 p-2 rounded-xl transition-all active:scale-[0.92] hover:bg-[#F0FAF3]"
                    title="Repetir pago"
                  >
                    <RotateCcw className="w-4 h-4" style={{ color: "#39A935" }} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="como-funciona" className="px-6 py-10">
          <h2 className="text-2xl font-black text-[#1F1F1F] mb-1 text-center">¿Cómo funciona?</h2>
          <p className="text-sm text-gray-500 text-center mb-8">Tres pasos. Así de simple.</p>

          <div className="flex flex-col gap-4 max-w-sm mx-auto">
            <StepCard
              number={1}
              icon={<FileText className="w-6 h-6" style={{ color: "#046C2C" }} />}
              title="Ingresa tu servicio"
              description="Selecciona el servicio, captura el monto y tu número de referencia."
            />
            <StepCard
              number={2}
              icon={<CheckCircle className="w-6 h-6" style={{ color: "#39A935" }} />}
              title="Confirma el monto"
              description="Revisa todos los detalles antes de proceder. Seguro y transparente."
            />
            <StepCard
              number={3}
              icon={<Zap className="w-6 h-6" style={{ color: "#046C2C" }} />}
              title="Paga y recibe tu comprobante"
              description="Realiza el pago y recibe tu comprobante al instante para compartirlo."
            />
          </div>
        </section>

        {/* Services */}
        <section className="px-6 pb-10">
          <div
            className="bg-white rounded-3xl p-6 max-w-sm mx-auto text-center"
            style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.07)", border: "1px solid #F0F0F0" }}
          >
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Servicios disponibles</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {["Luz", "Agua", "Gas", "Internet", "Cable", "Teléfono", "Streaming", "Préstamos", "Seguro", "Escuela", "Renta"].map((cat) => (
                <span
                  key={cat}
                  className="px-4 py-1.5 rounded-full text-sm font-semibold"
                  style={{ background: "#F0FAF3", color: "#046C2C" }}
                >
                  {cat}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <div className="px-6 pb-12 max-w-sm mx-auto w-full">
          <button
            onClick={() => navigate("/pagar")}
            className="w-full py-5 px-8 rounded-full text-white text-base font-bold transition-all duration-150 active:scale-[0.97] hover:scale-[1.02]"
            style={{
              background: "linear-gradient(135deg, #046C2C 0%, #39A935 100%)",
              boxShadow: "0 6px 20px rgba(4,108,44,0.32)",
            }}
          >
            Pagar un servicio ahora
          </button>
        </div>
      </main>

      <footer className="bg-white border-t border-gray-100 px-6 py-5 text-center flex flex-col gap-1">
        <p className="text-xs text-gray-400">© 2026 PagoYa · Paga todo. Sin filas.</p>
        <p className="text-xs text-gray-300 font-medium">Powered by Pago Seguro (próximamente)</p>
      </footer>
    </div>
  );
}

function StepCard({ number, icon, title, description }: {
  number: number;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div
      className="bg-white rounded-3xl p-5 flex gap-4 items-start"
      style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.06)", border: "1px solid #F0F0F0" }}
    >
      <div
        className="flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center"
        style={{ background: "#F0FAF3" }}
      >
        {icon}
      </div>
      <div className="flex-1 pt-0.5">
        <div className="flex items-center gap-2 mb-1.5">
          <span
            className="text-xs font-black w-5 h-5 rounded-full flex items-center justify-center"
            style={{ background: "#046C2C", color: "white" }}
          >
            {number}
          </span>
          <h3 className="text-sm font-bold text-[#1F1F1F]">{title}</h3>
        </div>
        <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
