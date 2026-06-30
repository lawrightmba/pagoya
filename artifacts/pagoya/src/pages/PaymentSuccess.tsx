import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { CheckCircle, Share2, Plus, AlertCircle, MessageCircle, Download } from "lucide-react";
import { usePayment } from "@/context/PaymentContext";
// Stripe active — do not remove (used in CardEntry.tsx)
const logoUrl = "/pagoya-logo.png";

const PLATFORM_FEE = 25;

function downloadPDF(
  empresa: string,
  referencia: string,
  monto: string,
  transactionDate: string,
  transactionId: string,
) {
  import("jspdf").then(({ jsPDF }) => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const W = 210;
    const green = "#004F2D";
    const gray = "#6B7280";

    // Header bar
    doc.setFillColor(0, 79, 45);
    doc.rect(0, 0, W, 28, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text("PagoYa  |  Comprobante Oficial", 14, 18);

    // Title
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    doc.text("pagoyamx.com", W - 14, 18, { align: "right" });

    // Separator
    doc.setDrawColor(200, 200, 200);
    doc.line(14, 36, W - 14, 36);

    // Body rows
    const rows: [string, string][] = [
      ["Servicio", empresa],
      ["Referencia", referencia],
      ["Monto", `$${parseFloat(monto).toFixed(2)} MXN`],
      ["Comisión", `$${PLATFORM_FEE.toFixed(2)} MXN`],
      ["Total", `$${(parseFloat(monto) + PLATFORM_FEE).toFixed(2)} MXN`],
      ["Fecha", transactionDate || new Date().toLocaleString("es-MX")],
      ["ID de transacción", transactionId],
    ];

    let y = 46;
    rows.forEach(([label, value], i) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(107, 114, 128);
      doc.text(label.toUpperCase(), 14, y);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(i === 4 ? 0 : 31, i === 4 ? 79 : 31, i === 4 ? 45 : 31);
      if (i === 4) { // Total — highlight green
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 79, 45);
      }
      doc.text(value, 14, y + 6);

      doc.setDrawColor(240, 240, 240);
      doc.line(14, y + 11, W - 14, y + 11);
      y += 17;
    });

    // Footer
    const fy = y + 12;
    doc.setFillColor(248, 250, 252);
    doc.rect(0, fy - 6, W, 32, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(107, 114, 128);
    doc.text("Pago procesado a través de STP/SIPREL", 14, fy + 4);
    doc.text("Red oficial del Banco de México (Banxico)", 14, fy + 10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 79, 45);
    doc.text("pagoyamx.com", 14, fy + 18);

    const filename = `comprobante-pagoya-${transactionId || Date.now()}.pdf`;
    doc.save(filename);
  });
}

export default function PaymentSuccess() {
  const [, navigate] = useLocation();
  const { paymentData, transactionId, transactionDate, resetPayment } = usePayment();
  const [isFirstPayment, setIsFirstPayment] = useState(false);

  // ── Detect first-ever completed payment ───────────────────────────────────
  useEffect(() => {
    if (!paymentData.empresa) return;
    const phone = (() => {
      try { return localStorage.getItem("pagoya_telefono") || localStorage.getItem("pagoya_phone") || ""; }
      catch { return ""; }
    })();
    if (!phone) return;
    const BASE = (window as Window & { BASE_URL?: string }).BASE_URL ?? "";
    fetch(`${BASE}/api/historial?phone=${encodeURIComponent(phone)}&limit=2`)
      .then(r => r.ok ? r.json() : null)
      .then((rows: null | Array<{ status: string }>) => {
        if (!rows) return;
        const completed = rows.filter(r =>
          r.status === "completed" || r.status === "confirmed" || r.status === "confirmado" || r.status === "success"
        );
        if (completed.length === 1) setIsFirstPayment(true);
      })
      .catch(() => {});
  }, [paymentData.empresa]);

  // ── Auto-open Paula chat 4s after payment success ─────────────────────────
  useEffect(() => {
    if (!paymentData.empresa) return;
    const timer = setTimeout(() => {
      window.dispatchEvent(new CustomEvent("pagoya:chatNudge", {
        detail: {
          context: `✅ Tu comprobante está guardado en este chat. ¿Quieres pagar otro servicio o consultar tu saldo?`,
        },
      }));
    }, 4000);
    return () => clearTimeout(timer);
  }, [paymentData.empresa]);

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

  const totalMonto = parseFloat(paymentData.monto) + PLATFORM_FEE;

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

          {/* ── First-payment celebration banner ───────────────────────── */}
          {isFirstPayment && (
            <div style={{
              background: "linear-gradient(135deg, #004F2D 0%, #046C2C 100%)",
              borderRadius: "20px",
              padding: "20px 20px 18px",
              border: "1px solid rgba(110,245,176,0.25)",
              boxShadow: "0 4px 20px rgba(0,79,45,0.30)",
            }}>
              <div style={{ fontSize: "28px", marginBottom: "8px", textAlign: "center" }}>🎊</div>
              <p style={{ margin: "0 0 4px", fontSize: "16px", fontWeight: 900, color: "#FFFFFF", textAlign: "center" }}>
                ¡Completaste tu primer pago con PagoYa!
              </p>
              <p style={{ margin: "0 0 16px", fontSize: "13px", color: "rgba(255,255,255,0.72)", textAlign: "center", lineHeight: 1.45 }}>
                Así de fácil. Sin banco, sin tarjeta, sin filas.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <button
                  onClick={() => navigate("/cargar")}
                  style={{
                    width: "100%", padding: "13px 16px",
                    background: "#6EF5B0", border: "none", borderRadius: "12px",
                    color: "#004F2D", fontSize: "14px", fontWeight: 800,
                    cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  Cargar más saldo en OXXO →
                </button>
                <button
                  onClick={handleWhatsApp}
                  style={{
                    width: "100%", padding: "11px 16px",
                    background: "transparent", border: "1px solid rgba(110,245,176,0.35)", borderRadius: "12px",
                    color: "rgba(255,255,255,0.80)", fontSize: "13px", fontWeight: 700,
                    cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  Compartir por WhatsApp →
                </button>
              </div>
            </div>
          )}

          {/* Success hero */}
          <div className="flex flex-col items-center text-center pt-2 pb-4">
            <div className="relative flex items-center justify-center mb-6">
              <div
                className="absolute rounded-full animate-ping"
                style={{ width: 96, height: 96, background: "rgba(57,169,53,0.18)", animationDuration: "1.8s" }}
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
            {transactionId && (
              <div style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                background: "#F0FAF3",
                border: "1px solid #CBE9D9",
                borderRadius: "999px",
                padding: "5px 16px",
                marginTop: "10px",
                fontSize: "12px",
                fontWeight: 700,
                color: "#046C2C",
                letterSpacing: "0.02em",
              }}>
                🧾 Folio #{transactionId}
              </div>
            )}
          </div>

          {/* Receipt card */}
          <div
            className="bg-white rounded-3xl p-6"
            style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.08)", border: "1px solid #F0F0F0" }}
          >
            <div className="flex items-center justify-between mb-5 pb-4" style={{ borderBottom: "1px solid #F3F3F3" }}>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Detalles del pago</p>
              <span className="px-3 py-1.5 rounded-full text-xs font-bold" style={{ background: "#F0FAF3", color: "#046C2C" }}>
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

              {/* Trust statement (S2.2) */}
              <div style={{
                marginTop: "4px",
                padding: "10px 12px",
                background: "#F4FBF7",
                borderRadius: "10px",
                border: "1px solid #CBE9D9",
              }}>
                <p style={{ margin: 0, fontSize: "11px", color: "#046C2C", fontWeight: 700, marginBottom: "3px" }}>
                  🔐 Pago oficial verificado
                </p>
                <p style={{ margin: 0, fontSize: "10.5px", color: "#6B9980", lineHeight: 1.5 }}>
                  Procesado vía <strong>STP/SIPREL</strong> — Red oficial del Banco de México (Banxico).
                  El mismo sistema que usan Banamex y BBVA. Folio ID: <span style={{ fontFamily: "monospace" }}>{transactionId || "—"}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Paula nudge card */}
          <div
            style={{
              background: "linear-gradient(135deg, #0A2540 0%, #0d3060 100%)",
              borderRadius: 20,
              padding: "18px 20px",
              display: "flex",
              alignItems: "center",
              gap: 14,
              boxShadow: "0 4px 20px rgba(10,37,64,0.18)",
              border: "1px solid rgba(29,158,117,0.25)",
            }}
          >
            <div style={{
              width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
              background: "linear-gradient(135deg, #046C2C 0%, #1D9E75 100%)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 20,
            }}>
              💬
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: "0 0 2px", fontSize: 13, fontWeight: 700, color: "#FFFFFF" }}>
                Tu comprobante está guardado aquí
              </p>
              <p style={{ margin: 0, fontSize: 12, color: "rgba(255,255,255,0.55)", lineHeight: 1.4 }}>
                Paula puede enviarte el folio por WhatsApp
              </p>
            </div>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent("pagoya:openChat"))}
              style={{
                background: "#1D9E75", border: "none", borderRadius: 10,
                padding: "8px 14px", color: "#FFFFFF", fontSize: 12, fontWeight: 700,
                cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center",
                gap: 5, fontFamily: "inherit", minHeight: 36,
              }}
            >
              <MessageCircle size={13} />
              Chatear
            </button>
          </div>

          {/* Total summary */}
          {!isNaN(totalMonto) && (
            <div style={{
              background: "#004F2D",
              borderRadius: "14px",
              padding: "14px 18px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}>
              <div>
                <p style={{ margin: 0, fontSize: "11px", color: "rgba(255,255,255,0.6)" }}>
                  Monto + comisión ($25 MXN)
                </p>
                <p style={{ margin: "2px 0 0", fontSize: "11px", color: "rgba(255,255,255,0.45)" }}>
                  Total cobrado
                </p>
              </div>
              <p style={{ margin: 0, fontSize: "22px", fontWeight: 900, color: "#6EF5B0" }}>
                ${totalMonto.toFixed(2)} MXN
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-3 pt-1">
            <button
              onClick={handleWhatsApp}
              className="w-full py-5 px-8 rounded-full text-white text-base font-bold transition-all duration-150 active:scale-[0.97] hover:scale-[1.02] flex items-center justify-center gap-2"
              style={{ background: "#25D366", boxShadow: "0 6px 20px rgba(37,211,102,0.40)" }}
            >
              <Share2 className="w-5 h-5" />
              Compartir por WhatsApp
            </button>

            {/* PDF receipt download (S3.5) */}
            <button
              onClick={() => downloadPDF(paymentData.empresa, paymentData.referencia, paymentData.monto, transactionDate, transactionId)}
              className="w-full py-4 px-8 rounded-full text-[#046C2C] text-base font-bold border-2 border-[#046C2C] bg-white transition-all duration-150 active:scale-[0.97] hover:bg-[#F0FAF3] flex items-center justify-center gap-2"
            >
              <Download className="w-5 h-5" />
              Descargar comprobante PDF
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

            <a
              href="/como-presentar-una-queja"
              className="block text-center text-xs text-gray-400 underline underline-offset-2 mt-1"
            >
              ¿Algo salió mal con este pago?
            </a>
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
