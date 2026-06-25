import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { usePayment } from "@/context/PaymentContext";
import PaulaHint from "@/components/PaulaHint";

const CATEGORIAS = [
  "Luz", "Agua", "Gas", "Internet", "Cable",
  "Teléfono móvil", "Streaming", "Préstamos",
  "Seguro", "Escuela", "Renta", "Gift Cards", "Otro",
];

// Gift card service IDs use underscore-denomination format (e.g. netflix_300)
// The server uses telefono as referencia and overrides monto for these.
function detectGiftCard(categoriaOrId: string): boolean {
  return categoriaOrId.includes("_") || categoriaOrId === "Gift Cards";
}

const SERVICIO_CATEGORIA: Record<string, string> = {
  CFE: "Luz", Telmex: "Teléfono móvil", Izzi: "Cable", Agua: "Agua",
  Totalplay: "Cable", "Sky": "Cable", IMSS: "Seguro",
};

export default function PaymentForm() {
  const [, navigate] = useLocation();
  const { paymentData, setPaymentData } = usePayment();
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Read ?servicio= query param to pre-fill empresa + categoria
  const servicioParam = new URLSearchParams(window.location.search).get("servicio");

  // Detect gift card flow from context (categoria is a service ID like "netflix_300")
  const isGiftCard = detectGiftCard(paymentData.categoria ?? "");

  const [form, setForm] = useState({
    empresa: servicioParam || paymentData.empresa,
    categoria: (servicioParam && SERVICIO_CATEGORIA[servicioParam]) || paymentData.categoria,
    monto: paymentData.monto,
    referencia: paymentData.referencia,
    telefono: paymentData.telefono || (localStorage.getItem("pagoya_telefono") ?? ""),
    notas: paymentData.notas,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // GA4: fire view_item when user lands on /pagar
  useEffect(() => {
    if (typeof (window as any).gtag !== "function") return;
    (window as any).gtag("event", "view_item", {
      event_category: "engagement",
      item_name: "bill_payment",
      item_category: servicioParam ?? "general",
    });
  }, []);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!form.empresa.trim()) newErrors.empresa = "Requerido";
    if (!form.categoria) newErrors.categoria = "Selecciona una categoría";
    if (!form.monto || isNaN(Number(form.monto)) || Number(form.monto) <= 0)
      newErrors.monto = "Ingresa un monto válido";
    // Gift cards: server uses telefono as referencia — no user input needed
    if (!isGiftCard && !form.referencia.trim()) newErrors.referencia = "Requerido";
    if (!form.telefono.trim()) newErrors.telefono = "Requerido";
    return newErrors;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    // GA4: user filled the form and hit submit — high-intent signal
    if (typeof (window as any).gtag === "function") {
      (window as any).gtag("event", "begin_checkout", {
        event_category: "ecommerce",
        empresa: form.empresa,
        categoria: form.categoria,
        value: parseFloat(form.monto) || 0,
        currency: "MXN",
      });
    }
    setPaymentData(form);
    navigate("/revisar");
  };

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const inputStyle = (field: string, hasError: boolean) => ({
    borderColor: hasError ? "#E21A0A" : focusedField === field ? "#39A935" : "#E5E5E5",
    boxShadow: focusedField === field && !hasError ? "0 0 0 3px rgba(57,169,53,0.15)" : "none",
    outline: "none",
    transition: "border-color 0.2s, box-shadow 0.2s",
  });

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#F7F7F7" }}>
      {/* Header */}
      <header
        className="bg-white border-b border-gray-100 px-5 py-4 flex items-center gap-3 sticky top-0 z-10"
        style={{ boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}
      >
        <button
          onClick={() => navigate("/")}
          className="w-10 h-10 rounded-2xl flex items-center justify-center transition-all active:scale-90"
          style={{ background: "#F0FAF3" }}
        >
          <ArrowLeft className="w-5 h-5" style={{ color: "#046C2C" }} />
        </button>
        <h1 className="text-base font-bold text-[#1F1F1F]">Nuevo pago</h1>
      </header>

      <main className="flex-1 px-5 py-7">
        <form onSubmit={handleSubmit} className="max-w-sm mx-auto flex flex-col gap-5">

          {/* Gift card banner */}
          {isGiftCard && (
            <div style={{
              background: "linear-gradient(135deg, #FF5C1A 0%, #FF9A3C 40%, #00C875 80%, #007A4A 100%)",
              borderRadius: "20px",
              padding: "16px 20px",
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}>
              <span style={{ fontSize: "28px", lineHeight: 1 }}>🎁</span>
              <div>
                <p style={{ margin: 0, fontWeight: 900, color: "#fff", fontSize: "15px" }}>Gift Card Digital</p>
                <p style={{ margin: "2px 0 0", color: "rgba(255,255,255,0.85)", fontSize: "12px" }}>
                  Tu código PIN llegará por WhatsApp al instante
                </p>
              </div>
            </div>
          )}

          {/* Service info card */}
          <div
            className="bg-white rounded-3xl p-6 flex flex-col gap-5"
            style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.07)", border: "1px solid #F0F0F0" }}
          >
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Datos del servicio</p>

            <Field label="Nombre del servicio o empresa" error={errors.empresa}>
              <input
                type="text"
                placeholder="Ej. CFE, Telmex, Netflix..."
                value={form.empresa}
                readOnly={isGiftCard}
                onChange={(e) => handleChange("empresa", e.target.value)}
                onFocus={() => setFocusedField("empresa")}
                onBlur={() => setFocusedField(null)}
                className="w-full px-4 py-4 rounded-2xl border bg-[#FAFAFA] text-sm text-[#1F1F1F] placeholder-gray-400"
                style={{ ...inputStyle("empresa", !!errors.empresa), ...(isGiftCard ? { background: "#F4FBF7", color: "#007A4A", fontWeight: 700 } : {}) }}
              />
            </Field>

            {isGiftCard ? (
              <Field label="Categoría">
                <div
                  className="w-full px-4 py-4 rounded-2xl border text-sm font-bold"
                  style={{ background: "#F4FBF7", borderColor: "#CBE9D9", color: "#007A4A" }}
                >
                  🎁 Gift Cards
                </div>
              </Field>
            ) : (
              <Field label="Categoría" error={errors.categoria}>
                <div className="relative">
                  <select
                    value={form.categoria}
                    onChange={(e) => handleChange("categoria", e.target.value)}
                    onFocus={() => setFocusedField("categoria")}
                    onBlur={() => setFocusedField(null)}
                    className="w-full px-4 py-4 rounded-2xl border bg-[#FAFAFA] text-sm appearance-none pr-10"
                    style={{
                      ...inputStyle("categoria", !!errors.categoria),
                      color: form.categoria ? "#1F1F1F" : "#9CA3AF",
                    }}
                  >
                    <option value="" disabled>Selecciona una categoría</option>
                    {CATEGORIAS.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </Field>
            )}

            <Field label="Monto" error={errors.monto}>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">$</span>
                <input
                  type="number"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  readOnly={isGiftCard}
                  value={form.monto}
                  onChange={(e) => handleChange("monto", e.target.value)}
                  onFocus={() => setFocusedField("monto")}
                  onBlur={() => setFocusedField(null)}
                  className="w-full pl-9 pr-4 py-4 rounded-2xl border bg-[#FAFAFA] text-sm text-[#1F1F1F] placeholder-gray-400"
                  style={{ ...inputStyle("monto", !!errors.monto), ...(isGiftCard ? { background: "#F4FBF7", fontWeight: 700 } : {}) }}
                />
              </div>
            </Field>
          </div>

          {/* Contact info card */}
          <div
            className="bg-white rounded-3xl p-6 flex flex-col gap-5"
            style={{ boxShadow: "0 4px 16px rgba(0,0,0,0.07)", border: "1px solid #F0F0F0" }}
          >
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Información de contacto</p>

            {/* Referencia — hidden for gift cards (server auto-fills from telefono) */}
            {!isGiftCard && (
              <>
                <Field label="Número de cuenta" error={errors.referencia}>
                  <input
                    type="text"
                    placeholder="Ej. 1234567890"
                    value={form.referencia}
                    onChange={(e) => handleChange("referencia", e.target.value)}
                    onFocus={() => setFocusedField("referencia")}
                    onBlur={() => setFocusedField(null)}
                    className="w-full px-4 py-4 rounded-2xl border bg-[#FAFAFA] text-sm text-[#1F1F1F] placeholder-gray-400"
                    style={inputStyle("referencia", !!errors.referencia)}
                  />
                </Field>
                <PaulaHint
                  message={`¿Dónde encuentro el número de cuenta de ${form.empresa || "mi servicio"}?`}
                  label="¿Dónde encuentro mi número de cuenta?"
                />
              </>
            )}
            {isGiftCard && (
              <div style={{
                background: "#F4FBF7", border: "1px solid #CBE9D9",
                borderRadius: "14px", padding: "12px 16px",
                display: "flex", alignItems: "flex-start", gap: "10px",
              }}>
                <span style={{ fontSize: "18px", lineHeight: 1, flexShrink: 0 }}>📲</span>
                <p style={{ margin: 0, fontSize: "12px", color: "#2D6E4E", lineHeight: 1.5 }}>
                  Tu código PIN se enviará automáticamente por WhatsApp al número que ingreses abajo.
                  No necesitas número de referencia.
                </p>
              </div>
            )}

            <Field label="Número de teléfono" error={errors.telefono}>
              <input
                type="tel"
                placeholder="Ej. 52 322 183 9799"
                value={form.telefono}
                onChange={(e) => handleChange("telefono", e.target.value)}
                onFocus={() => setFocusedField("telefono")}
                onBlur={() => setFocusedField(null)}
                className="w-full px-4 py-4 rounded-2xl border bg-[#FAFAFA] text-sm text-[#1F1F1F] placeholder-gray-400"
                style={inputStyle("telefono", !!errors.telefono)}
              />
              {!errors.telefono && (
                <p style={{ margin: "6px 0 0", fontSize: "12px", color: "#6B7280" }}>
                  Incluye código de país · 52 para México, 1 para EE.UU.
                </p>
              )}
            </Field>

            <Field label="Notas (opcional)">
              <textarea
                placeholder="Información adicional..."
                value={form.notas}
                onChange={(e) => handleChange("notas", e.target.value)}
                onFocus={() => setFocusedField("notas")}
                onBlur={() => setFocusedField(null)}
                rows={3}
                className="w-full px-4 py-4 rounded-2xl border bg-[#FAFAFA] text-sm text-[#1F1F1F] placeholder-gray-400 resize-none"
                style={inputStyle("notas", false)}
              />
            </Field>
          </div>

          <button
            type="submit"
            className="w-full py-5 px-8 rounded-full text-white text-base font-bold mt-1 transition-all duration-150 active:scale-[0.97] hover:scale-[1.02]"
            style={{
              background: "linear-gradient(135deg, #046C2C 0%, #39A935 100%)",
              boxShadow: "0 6px 20px rgba(4,108,44,0.40)",
            }}
          >
            Continuar al pago
          </button>
        </form>
      </main>
    </div>
  );
}

function Field({ label, children, error }: { label: string; children: React.ReactNode; error?: string }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-semibold text-[#1F1F1F]">{label}</label>
      {children}
      {error && (
        <p className="text-xs font-semibold flex items-center gap-1" style={{ color: "#E21A0A" }}>
          <span>⚠</span> {error}
        </p>
      )}
    </div>
  );
}
