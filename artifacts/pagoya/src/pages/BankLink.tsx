import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Building2, CreditCard, CheckCircle, Clock, Upload, Camera, PenLine, ChevronRight, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const API = window.location.origin;

const BANKS = [
  { code: "mx_bbva", name: "BBVA", color: "#004481" },
  { code: "mx_banamex", name: "Banamex", color: "#003087" },
  { code: "mx_santander", name: "Santander", color: "#CC0000" },
  { code: "mx_hsbc", name: "HSBC", color: "#DB0011" },
  { code: "mx_banorte", name: "Banorte", color: "#E8002D" },
  { code: "mx_scotiabank", name: "Scotiabank", color: "#E31837" },
  { code: "mx_inbursa", name: "Inbursa", color: "#003DA5" },
  { code: "mx_nu", name: "Nu (Nubank)", color: "#820AD1" },
  { code: "mx_hey_banco", name: "Hey Banco", color: "#FF6B35" },
];

const STEPS = ["Tus datos", "Cuenta bancaria", "Identidad", "Firma", "Listo"];

type AccountType = "savings" | "checkings" | "debit_card";

interface FormState {
  firstname: string;
  lastname: string;
  email: string;
  documentType: "mx_curp" | "mx_rfc";
  documentNumber: string;
  bank: string;
  accountType: AccountType;
  accountNumber: string;
}

function StepIndicator({ current }: { current: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, padding: "0 20px", marginBottom: 28 }}>
      {STEPS.map((label, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", flex: i < STEPS.length - 1 ? 1 : "none" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <div style={{
              width: 28, height: 28, borderRadius: "50%",
              background: i < current ? "#1D9E75" : i === current ? "#1D9E75" : "#1E293B",
              border: i === current ? "2px solid #1D9E75" : "none",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 700,
              color: i <= current ? "#fff" : "#475569",
              transition: "all 0.2s",
            }}>
              {i < current ? "✓" : i + 1}
            </div>
            <span style={{ fontSize: 10, color: i <= current ? "#1D9E75" : "#475569", whiteSpace: "nowrap", fontWeight: i === current ? 700 : 400 }}>
              {label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div style={{ flex: 1, height: 2, background: i < current ? "#1D9E75" : "#1E293B", margin: "0 4px", marginBottom: 16 }} />
          )}
        </div>
      ))}
    </div>
  );
}

function FileUploadBox({ label, icon, file, onChange, accept }: {
  label: string; icon: string; file: File | null;
  onChange: (f: File) => void; accept?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div
      onClick={() => ref.current?.click()}
      style={{
        background: file ? "#0A2318" : "#0F1D2E",
        border: `2px dashed ${file ? "#1D9E75" : "#1E3A5F"}`,
        borderRadius: 12, padding: "18px 14px",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
        cursor: "pointer", transition: "all 0.2s",
      }}
    >
      <span style={{ fontSize: 28 }}>{file ? "✅" : icon}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: file ? "#1D9E75" : "#94A3B8", textAlign: "center" }}>
        {file ? file.name.slice(0, 20) + (file.name.length > 20 ? "…" : "") : label}
      </span>
      <span style={{ fontSize: 11, color: "#475569" }}>
        {file ? "Toca para cambiar" : "JPG, PNG, PDF"}
      </span>
      <input
        ref={ref} type="file" accept={accept || "image/*,.pdf"}
        style={{ display: "none" }}
        onChange={e => { if (e.target.files?.[0]) onChange(e.target.files[0]); }}
        capture="environment"
      />
    </div>
  );
}

function SignatureCanvas({ onSignature }: { onSignature: (blob: Blob) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [hasSig, setHasSig] = useState(false);

  const getPos = (e: React.TouchEvent | React.MouseEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const start = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    drawing.current = true;
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const move = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    if (!drawing.current) return;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    ctx.strokeStyle = "#1D9E75";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    const pos = getPos(e, canvas);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setHasSig(true);
  };

  const end = () => {
    drawing.current = false;
    const canvas = canvasRef.current!;
    canvas.toBlob(blob => { if (blob) onSignature(blob); }, "image/png");
  };

  const clear = () => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSig(false);
  };

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 13, color: "#94A3B8", marginBottom: 8 }}>
        Firma aquí con tu dedo o mouse:
      </div>
      <div style={{ position: "relative", border: "1px solid #1E3A5F", borderRadius: 10, overflow: "hidden", background: "#0F1D2E" }}>
        <canvas
          ref={canvasRef}
          width={600} height={160}
          style={{ width: "100%", height: 120, display: "block", touchAction: "none" }}
          onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
          onTouchStart={start} onTouchMove={move} onTouchEnd={end}
        />
        {!hasSig && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
            <span style={{ fontSize: 13, color: "#334155" }}>Tu firma aquí</span>
          </div>
        )}
      </div>
      {hasSig && (
        <button onClick={clear} style={{ marginTop: 6, background: "none", border: "none", color: "#475569", fontSize: 12, cursor: "pointer" }}>
          ↺ Borrar y volver a firmar
        </button>
      )}
    </div>
  );
}

async function generateContractBlob(form: FormState, sigBlob: Blob): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = 800;
  canvas.height = 1100;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, 800, 1100);

  ctx.fillStyle = "#0A2540";
  ctx.fillRect(0, 0, 800, 60);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 24px Arial";
  ctx.fillText("PagoYa — Autorización de Débito Directo", 30, 38);

  ctx.fillStyle = "#1a1a1a";
  ctx.font = "16px Arial";
  const lines = [
    "",
    `Fecha: ${new Date().toLocaleDateString("es-MX", { dateStyle: "long" })}`,
    "",
    `Nombre: ${form.firstname} ${form.lastname}`,
    `Correo electrónico: ${form.email}`,
    `${form.documentType === "mx_curp" ? "CURP" : "RFC"}: ${form.documentNumber}`,
    "",
    `Banco: ${BANKS.find(b => b.code === form.bank)?.name ?? form.bank}`,
    `Tipo de cuenta: ${form.accountType === "debit_card" ? "Tarjeta de débito" : form.accountType === "savings" ? "Ahorro" : "Cheques"}`,
    `Número de cuenta: ${"*".repeat(Math.max(0, form.accountNumber.length - 4))}${form.accountNumber.slice(-4)}`,
    "",
    "AUTORIZACIÓN:",
    "El titular autoriza a Longview Meridian Technologies (operador de PagoYa)",
    "a realizar cargos en la cuenta indicada para el pago de servicios",
    "domiciliados según las instrucciones del titular.",
    "",
    "Esta autorización permanece vigente hasta que el titular la revoque",
    "expresamente a través de los canales de atención de PagoYa.",
    "",
    "Los cargos serán por los montos y frecuencias solicitados por el",
    "titular en la aplicación PagoYa.",
  ];

  let y = 80;
  for (const line of lines) {
    if (line === "AUTORIZACIÓN:") {
      ctx.font = "bold 16px Arial";
      ctx.fillStyle = "#0A2540";
    } else {
      ctx.font = "16px Arial";
      ctx.fillStyle = "#1a1a1a";
    }
    ctx.fillText(line, 40, y);
    y += 28;
  }

  y += 20;
  ctx.strokeStyle = "#cccccc";
  ctx.setLineDash([4, 4]);
  ctx.beginPath(); ctx.moveTo(40, y); ctx.lineTo(760, y); ctx.stroke();
  ctx.setLineDash([]);
  y += 20;

  ctx.fillStyle = "#555";
  ctx.font = "13px Arial";
  ctx.fillText("Firma del titular:", 40, y);
  y += 14;

  const sigUrl = URL.createObjectURL(sigBlob);
  const sigImg = new Image();
  await new Promise<void>(resolve => { sigImg.onload = () => resolve(); sigImg.src = sigUrl; });
  ctx.drawImage(sigImg, 40, y, 360, 100);
  URL.revokeObjectURL(sigUrl);

  return new Promise<Blob>(resolve => canvas.toBlob(b => resolve(b!), "image/png"));
}

export default function BankLink() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [consentId, setConsentId] = useState("");

  const [form, setForm] = useState<FormState>({
    firstname: "", lastname: "", email: "",
    documentType: "mx_curp", documentNumber: "",
    bank: "", accountType: "debit_card", accountNumber: "",
  });

  const [idFront, setIdFront] = useState<File | null>(null);
  const [idBack, setIdBack] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [sigBlob, setSigBlob] = useState<Blob | null>(null);

  const setField = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  // ── Step 1: Create customer ────────────────────────────────────────────────
  const handleStep1 = async () => {
    if (!form.firstname || !form.lastname || !form.email || !form.documentNumber) {
      toast({ title: "Completa todos los campos", variant: "destructive" }); return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/belvo-payments/customers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstname: form.firstname,
          lastname: form.lastname,
          email: form.email,
          documentType: form.documentType,
          documentNumber: form.documentNumber.toUpperCase(),
          phone: localStorage.getItem("pagoya_telefono") || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al registrar");
      setCustomerId(data.customerId);
      setStep(1);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  // ── Step 2: Create payment method ─────────────────────────────────────────
  const handleStep2 = async () => {
    const clean = form.accountNumber.replace(/\s/g, "");
    if (!form.bank) { toast({ title: "Selecciona tu banco", variant: "destructive" }); return; }
    if (form.accountType === "debit_card" && clean.length !== 16) {
      toast({ title: "La tarjeta de débito debe tener 16 dígitos", variant: "destructive" }); return;
    }
    if (form.accountType !== "debit_card" && clean.length !== 18) {
      toast({ title: "La CLABE debe tener 18 dígitos", variant: "destructive" }); return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/belvo-payments/payment-methods`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId, bank: form.bank,
          accountType: form.accountType,
          accountNumber: clean,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al registrar cuenta");
      setPaymentMethodId(data.paymentMethodId);
      setStep(2);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  // ── Step 3: Validate docs ──────────────────────────────────────────────────
  const handleStep3 = () => {
    if (!idFront || !idBack || !selfie) {
      toast({ title: "Sube los tres documentos para continuar", variant: "destructive" }); return;
    }
    setStep(3);
  };

  // ── Step 4: Create consent + upload all files ──────────────────────────────
  const handleStep4 = async () => {
    if (!sigBlob) {
      toast({ title: "Por favor firma en el recuadro", variant: "destructive" }); return;
    }
    setLoading(true);
    try {
      // Create consent
      const cRes = await fetch(`${API}/api/belvo-payments/consents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethodId }),
      });
      const cData = await cRes.json();
      if (!cRes.ok) throw new Error(cData.error || "Error al crear consentimiento");
      const newConsentId = cData.consentId;
      setConsentId(newConsentId);

      // Generate contract image with embedded signature
      const contractBlob = await generateContractBlob(form, sigBlob);

      // Upload all files
      const fd = new FormData();
      fd.append("id_front", idFront!);
      fd.append("id_back", idBack!);
      fd.append("selfie", selfie!);
      fd.append("contract", contractBlob, "contrato-firmado.png");

      const uRes = await fetch(`${API}/api/belvo-payments/consents/${newConsentId}/files`, {
        method: "POST",
        body: fd,
      });
      if (!uRes.ok) {
        const uData = await uRes.json();
        throw new Error(uData.error || "Error al subir documentos");
      }

      setStep(4);
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", background: "#0F1D2E", border: "1px solid #1E3A5F",
    borderRadius: 10, padding: "12px 14px", color: "#F1F5F9",
    fontSize: 15, outline: "none",
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 12, fontWeight: 600, color: "#94A3B8", marginBottom: 6, display: "block",
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0A2540", color: "#F1F5F9", paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ background: "#0A2540", borderBottom: "1px solid #1E293B", padding: "14px 20px", display: "flex", alignItems: "center", gap: 12, position: "sticky", top: 0, zIndex: 50 }}>
        <button onClick={() => step === 0 ? navigate("/cargar") : setStep(s => s - 1)} style={{ background: "none", border: "none", color: "#94A3B8", cursor: "pointer", padding: 4, display: "flex" }}>
          <ArrowLeft size={20} />
        </button>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#F1F5F9" }}>Vincular cuenta bancaria</div>
          <div style={{ fontSize: 12, color: "#475569" }}>Débito directo vía Belvo</div>
        </div>
      </div>

      <div style={{ maxWidth: 480, margin: "0 auto", padding: "24px 20px" }}>
        <StepIndicator current={step} />

        {/* ─── STEP 0: Datos personales ───────────────────────────────────── */}
        {step === 0 && (
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#F1F5F9", marginBottom: 6 }}>Tus datos personales</div>
            <div style={{ fontSize: 14, color: "#64748B", marginBottom: 24 }}>Requeridos por regulación para débito directo</div>

            <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Nombre(s)</label>
                <input style={inputStyle} placeholder="María" value={form.firstname} onChange={setField("firstname")} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Apellidos</label>
                <input style={inputStyle} placeholder="García López" value={form.lastname} onChange={setField("lastname")} />
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Correo electrónico</label>
              <input style={inputStyle} type="email" placeholder="maria@email.com" value={form.email} onChange={setField("email")} />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Tipo de documento</label>
              <select style={inputStyle} value={form.documentType} onChange={setField("documentType")}>
                <option value="mx_curp">CURP</option>
                <option value="mx_rfc">RFC</option>
              </select>
            </div>

            <div style={{ marginBottom: 28 }}>
              <label style={labelStyle}>{form.documentType === "mx_curp" ? "CURP (18 caracteres)" : "RFC (12-13 caracteres)"}</label>
              <input style={inputStyle} placeholder={form.documentType === "mx_curp" ? "GAML900101MDFRCR09" : "GAML900101AB2"}
                value={form.documentNumber} onChange={setField("documentNumber")}
                maxLength={form.documentType === "mx_curp" ? 18 : 13}
              />
            </div>

            <div style={{ background: "#0F2336", border: "1px solid #1E3A5F", borderLeft: "3px solid #60A5FA", borderRadius: 10, padding: "12px 14px", marginBottom: 24, fontSize: 13, color: "#64748B" }}>
              🔒 Tus datos se comparten únicamente con Belvo (proveedor regulado) para habilitar el débito. No los vendemos.
            </div>

            <button onClick={handleStep1} disabled={loading} style={{
              width: "100%", background: "#1D9E75", color: "#fff", fontWeight: 700,
              fontSize: 16, padding: "14px", borderRadius: 12, border: "none", cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
            }}>
              {loading ? "Registrando…" : "Continuar →"}
            </button>
          </div>
        )}

        {/* ─── STEP 1: Cuenta bancaria ─────────────────────────────────────── */}
        {step === 1 && (
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#F1F5F9", marginBottom: 6 }}>Tu cuenta bancaria</div>
            <div style={{ fontSize: 14, color: "#64748B", marginBottom: 20 }}>Selecciona tu banco y tipo de cuenta</div>

            <label style={labelStyle}>Banco</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 18 }}>
              {BANKS.map(b => (
                <button key={b.code} onClick={() => setForm(f => ({ ...f, bank: b.code }))} style={{
                  background: form.bank === b.code ? "#0A2318" : "#0F1D2E",
                  border: `1.5px solid ${form.bank === b.code ? "#1D9E75" : "#1E3A5F"}`,
                  borderRadius: 10, padding: "10px 6px", cursor: "pointer",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                }}>
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: b.color }} />
                  <span style={{ fontSize: 11, color: form.bank === b.code ? "#1D9E75" : "#94A3B8", fontWeight: 600 }}>{b.name}</span>
                </button>
              ))}
            </div>

            <label style={labelStyle}>Tipo de cuenta</label>
            <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
              {[
                { value: "debit_card", label: "🪙 Débito", sub: "16 dígitos" },
                { value: "savings", label: "🏦 Ahorro", sub: "CLABE 18" },
                { value: "checkings", label: "💳 Cheques", sub: "CLABE 18" },
              ].map(opt => (
                <button key={opt.value} onClick={() => setForm(f => ({ ...f, accountType: opt.value as AccountType }))} style={{
                  flex: 1, background: form.accountType === opt.value ? "#0A2318" : "#0F1D2E",
                  border: `1.5px solid ${form.accountType === opt.value ? "#1D9E75" : "#1E3A5F"}`,
                  borderRadius: 10, padding: "10px 6px", cursor: "pointer",
                }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: form.accountType === opt.value ? "#1D9E75" : "#F1F5F9" }}>{opt.label}</div>
                  <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>{opt.sub}</div>
                </button>
              ))}
            </div>

            <div style={{ marginBottom: 28 }}>
              <label style={labelStyle}>{form.accountType === "debit_card" ? "Número de tarjeta (16 dígitos)" : "CLABE (18 dígitos)"}</label>
              <input style={inputStyle} inputMode="numeric"
                placeholder={form.accountType === "debit_card" ? "4152 3813 5421 0987" : "012 180 0123456789 0"}
                value={form.accountNumber}
                onChange={e => setForm(f => ({ ...f, accountNumber: e.target.value.replace(/\D/g, "") }))}
                maxLength={form.accountType === "debit_card" ? 16 : 18}
              />
            </div>

            <button onClick={handleStep2} disabled={loading} style={{
              width: "100%", background: "#1D9E75", color: "#fff", fontWeight: 700,
              fontSize: 16, padding: "14px", borderRadius: 12, border: "none", cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
            }}>
              {loading ? "Registrando cuenta…" : "Continuar →"}
            </button>
          </div>
        )}

        {/* ─── STEP 2: Identidad / documentos ─────────────────────────────── */}
        {step === 2 && (
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#F1F5F9", marginBottom: 6 }}>Verifica tu identidad</div>
            <div style={{ fontSize: 14, color: "#64748B", marginBottom: 20 }}>Sube fotos de tu INE y una selfie. Solo las usa Belvo para el KYC.</div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
              <FileUploadBox label="INE — Frente" icon="🪪" file={idFront} onChange={setIdFront} accept="image/*" />
              <FileUploadBox label="INE — Reverso" icon="🪪" file={idBack} onChange={setIdBack} accept="image/*" />
            </div>
            <div style={{ marginBottom: 28 }}>
              <FileUploadBox label="Selfie (foto tuya ahorita)" icon="🤳" file={selfie} onChange={setSelfie} accept="image/*" />
            </div>

            <div style={{ background: "#0F2336", border: "1px solid #1E3A5F", borderRadius: 10, padding: "12px 14px", marginBottom: 24, fontSize: 13, color: "#64748B" }}>
              <strong style={{ color: "#94A3B8" }}>¿Para qué se usan?</strong> Belvo verifica que el dueño del INE es quien autoriza el débito. Nadie más los ve.
            </div>

            <button onClick={handleStep3} style={{
              width: "100%", background: "#1D9E75", color: "#fff", fontWeight: 700,
              fontSize: 16, padding: "14px", borderRadius: 12, border: "none", cursor: "pointer",
            }}>
              Continuar →
            </button>
          </div>
        )}

        {/* ─── STEP 3: Firma del contrato ───────────────────────────────────── */}
        {step === 3 && (
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#F1F5F9", marginBottom: 6 }}>Firma la autorización</div>
            <div style={{ fontSize: 14, color: "#64748B", marginBottom: 16 }}>Lee y firma la autorización de débito directo</div>

            {/* Contract summary */}
            <div style={{ background: "#0F1D2E", border: "1px solid #1E293B", borderRadius: 12, padding: 16, marginBottom: 20, maxHeight: 200, overflowY: "auto" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#F1F5F9", marginBottom: 8 }}>Autorización de Débito Directo — PagoYa</div>
              <div style={{ fontSize: 12, color: "#64748B", lineHeight: 1.7 }}>
                <p>Yo, <strong style={{ color: "#94A3B8" }}>{form.firstname} {form.lastname}</strong>, autorizo a <strong style={{ color: "#94A3B8" }}>Longview Meridian Technologies</strong> (operador de PagoYa) a realizar cargos a mi cuenta <strong style={{ color: "#94A3B8" }}>{BANKS.find(b => b.code === form.bank)?.name}</strong> terminada en <strong style={{ color: "#94A3B8" }}>****{form.accountNumber.slice(-4)}</strong>.</p>
                <p style={{ marginTop: 8 }}>Los cargos se realizarán únicamente cuando yo lo solicite en la app PagoYa para el pago de servicios (CFE, agua, teléfono, recargas y similares).</p>
                <p style={{ marginTop: 8 }}>Puedo revocar esta autorización en cualquier momento contactando a soporte@pagoyamx.com.</p>
              </div>
            </div>

            <SignatureCanvas onSignature={setSigBlob} />

            {sigBlob && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#1D9E75", fontSize: 13, marginBottom: 14 }}>
                <CheckCircle size={14} /> Firma capturada
              </div>
            )}

            <button onClick={handleStep4} disabled={loading || !sigBlob} style={{
              width: "100%", background: sigBlob ? "#1D9E75" : "#1E3A5F", color: "#fff", fontWeight: 700,
              fontSize: 16, padding: "14px", borderRadius: 12, border: "none",
              cursor: (loading || !sigBlob) ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
            }}>
              {loading ? "Enviando documentos…" : "Firmar y enviar →"}
            </button>

            {loading && (
              <div style={{ textAlign: "center", marginTop: 12, fontSize: 12, color: "#475569" }}>
                Subiendo documentos… no cierres la app
              </div>
            )}
          </div>
        )}

        {/* ─── STEP 4: Éxito / en revisión ─────────────────────────────────── */}
        {step === 4 && (
          <div style={{ textAlign: "center", paddingTop: 20 }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>📋</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#F1F5F9", marginBottom: 8 }}>Documentos enviados</div>
            <div style={{ fontSize: 15, color: "#64748B", marginBottom: 28, lineHeight: 1.6 }}>
              Belvo revisará tus documentos en <strong style={{ color: "#94A3B8" }}>1–2 días hábiles</strong>. Te avisaremos por WhatsApp cuando tu cuenta esté lista para usar.
            </div>

            <div style={{ background: "#0F1D2E", border: "1px solid #1E293B", borderRadius: 14, padding: 20, marginBottom: 28, textAlign: "left" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#F1F5F9", marginBottom: 12 }}>Resumen</div>
              {[
                ["Banco", BANKS.find(b => b.code === form.bank)?.name ?? form.bank],
                ["Cuenta", `****${form.accountNumber.slice(-4)}`],
                ["Estado", "📋 En revisión"],
              ].map(([label, value]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #1E293B", fontSize: 14 }}>
                  <span style={{ color: "#64748B" }}>{label}</span>
                  <span style={{ color: "#F1F5F9", fontWeight: 600 }}>{value}</span>
                </div>
              ))}
            </div>

            <div style={{ background: "#0F2336", border: "1px solid #1E3A5F", borderRadius: 12, padding: 16, marginBottom: 28, fontSize: 13, color: "#64748B", textAlign: "left" }}>
              <strong style={{ color: "#94A3B8" }}>¿Qué sigue?</strong>
              <ul style={{ marginTop: 8, paddingLeft: 16, lineHeight: 2 }}>
                <li>Belvo revisa tu INE y selfie</li>
                <li>Confirma la titularidad de tu cuenta</li>
                <li>Te notificamos en WhatsApp cuando esté activo</li>
                <li>A partir de ahí, pagas directo desde tu banco — sin ir al OXXO</li>
              </ul>
            </div>

            <button onClick={() => navigate("/cargar")} style={{
              width: "100%", background: "#1D9E75", color: "#fff", fontWeight: 700,
              fontSize: 16, padding: "14px", borderRadius: 12, border: "none", cursor: "pointer",
            }}>
              Volver al inicio →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
