import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ShieldCheck, ChevronLeft, CheckCircle2, AlertCircle, Loader2, Lock } from "lucide-react";

type KycStatus = "none" | "pending" | "verified" | "rejected";

interface KycState {
  kycLevel: number;
  kycStatus: KycStatus;
  monthlyLimitMxn: number;
  kycFullName?: string;
  kycVerifiedAt?: string;
  loading: boolean;
}

const API = window.location.origin;

const LIMIT_LABELS: Record<number, string> = {
  0: "$6,000",
  1: "$6,000",
  2: "$24,000",
  3: "$80,000",
};

function CurpHelp() {
  return (
    <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: "10px", padding: "14px 16px", marginTop: "8px" }}>
      <p style={{ color: "#94A3B8", fontSize: "13px", lineHeight: 1.6, margin: 0 }}>
        Tu CURP tiene 18 caracteres y está en tu INE, pasaporte o acta de nacimiento.{" "}
        <span style={{ color: "#CBD5E1" }}>Ejemplo: LOAF900115HDFPRC01</span>
      </p>
    </div>
  );
}

export default function Verificar() {
  const [, navigate] = useLocation();
  const telefono =
    typeof localStorage !== "undefined"
      ? (localStorage.getItem("pagoya_telefono") ?? "")
      : "";

  const es = !navigator.language.startsWith("en");

  const [kyc, setKyc] = useState<KycState>({
    kycLevel: 0,
    kycStatus: "none",
    monthlyLimitMxn: 6_000,
    loading: true,
  });

  const [step, setStep] = useState<"intro" | "form" | "done">("intro");
  const [curp, setCurp] = useState("");
  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [showCurpHelp, setShowCurpHelp] = useState(false);

  useEffect(() => {
    if (!telefono) {
      setKyc(k => ({ ...k, loading: false }));
      return;
    }
    fetch(`${API}/api/kyc/status/${encodeURIComponent(telefono)}`)
      .then(r => r.json())
      .then(d => {
        setKyc({
          kycLevel: d.kycLevel ?? 0,
          kycStatus: d.kycStatus ?? "none",
          monthlyLimitMxn: d.monthlyLimitMxn ?? 6_000,
          kycFullName: d.kycFullName,
          kycVerifiedAt: d.kycVerifiedAt,
          loading: false,
        });
        if (d.kycStatus === "verified" && d.kycLevel >= 2) setStep("done");
      })
      .catch(() => setKyc(k => ({ ...k, loading: false })));
  }, [telefono]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const curpNorm = curp.trim().toUpperCase();
    if (curpNorm.length !== 18) {
      setFormError("La CURP debe tener exactamente 18 caracteres.");
      return;
    }
    if (fullName.trim().split(/\s+/).length < 2) {
      setFormError("Ingresa tu nombre completo: nombre y al menos un apellido.");
      return;
    }
    if (!dob) {
      setFormError("Selecciona tu fecha de nacimiento.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/kyc/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ telefono, curp: curpNorm, fullName: fullName.trim(), dob }),
      });
      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error ?? "Error al verificar. Inténtalo de nuevo.");
        return;
      }

      setKyc(k => ({
        ...k,
        kycLevel: data.kycLevel,
        kycStatus: data.kycStatus,
        monthlyLimitMxn: data.monthlyLimitMxn,
        kycFullName: fullName.trim(),
      }));
      setStep("done");
    } catch {
      setFormError("Error de conexión. Verifica tu internet e inténtalo de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  if (kyc.loading) {
    return (
      <div style={{ minHeight: "100dvh", background: "#0A2540", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 className="animate-spin" style={{ color: "#1D9E75", width: 32, height: 32 }} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100dvh", background: "#0A2540", color: "#E2E8F0", fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "0 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", paddingTop: "24px", paddingBottom: "8px" }}>
          <button
            onClick={() => navigate("/")}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#94A3B8", padding: "4px", display: "flex", alignItems: "center" }}
          >
            <ChevronLeft style={{ width: 22, height: 22 }} />
          </button>
          <h1 style={{ fontSize: "1.1rem", fontWeight: 700, color: "#FFFFFF", margin: 0 }}>
            Verificar identidad
          </h1>
        </div>

        {/* ── STEP: DONE / ALREADY VERIFIED ────────────────────────────────── */}
        {step === "done" && (
          <div style={{ paddingTop: "32px", paddingBottom: "48px" }}>
            <div style={{ textAlign: "center", marginBottom: "32px" }}>
              <div style={{ width: 72, height: 72, borderRadius: "50%", background: "rgba(29,158,117,0.15)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
                <CheckCircle2 style={{ width: 40, height: 40, color: "#1D9E75" }} />
              </div>
              <h2 style={{ fontSize: "1.4rem", fontWeight: 800, color: "#FFFFFF", margin: "0 0 8px" }}>
                ¡Identidad verificada!
              </h2>
              <p style={{ color: "#94A3B8", margin: 0, lineHeight: 1.6 }}>
                {es ? "Tu cuenta es ahora Nivel 2." : "Your account is now Level 2."}
              </p>
            </div>

            {/* Level badge */}
            <div style={{ background: "rgba(29,158,117,0.08)", border: "1px solid rgba(29,158,117,0.25)", borderRadius: "14px", padding: "20px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
                <ShieldCheck style={{ width: 22, height: 22, color: "#1D9E75", flexShrink: 0 }} />
                <span style={{ fontWeight: 700, color: "#FFFFFF", fontSize: "1rem" }}>Nivel 2 — CURP verificado</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                {[
                  ["Límite mensual", "$24,000 MXN"],
                  ["Estado", "Verificado ✓"],
                  ["Nombre", kyc.kycFullName ?? "—"],
                  ["Teléfono", telefono || "—"],
                ].map(([label, value]) => (
                  <div key={label} style={{ background: "rgba(255,255,255,0.04)", borderRadius: "10px", padding: "12px 14px" }}>
                    <p style={{ color: "#64748B", fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 4px" }}>{label}</p>
                    <p style={{ color: "#E2E8F0", fontWeight: 700, fontSize: "0.9rem", margin: 0 }}>{value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginTop: "20px", padding: "14px 16px", background: "rgba(255,255,255,0.04)", borderRadius: "10px" }}>
              <p style={{ color: "#94A3B8", fontSize: "13px", lineHeight: 1.6, margin: 0 }}>
                Cuando tu entidad esté registrada ante el SAT, podrás conectarte directamente a RENAPO para acceso Nivel 3 ($80,000 MXN/mes).{" "}
                <span style={{ color: "#64748B" }}>Once your entity is SAT-registered, you can unlock Level 3 via direct RENAPO access.</span>
              </p>
            </div>

            <button
              onClick={() => navigate("/")}
              style={{ width: "100%", marginTop: "24px", padding: "15px", background: "#1D9E75", color: "white", border: "none", borderRadius: "12px", fontSize: "0.95rem", fontWeight: 700, cursor: "pointer" }}
            >
              Volver al inicio
            </button>
          </div>
        )}

        {/* ── STEP: INTRO ──────────────────────────────────────────────────── */}
        {step === "intro" && (
          <div style={{ paddingTop: "20px", paddingBottom: "48px" }}>
            {/* Current level card */}
            <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "14px", padding: "20px", marginBottom: "24px" }}>
              <p style={{ color: "#64748B", fontSize: "12px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 8px" }}>Tu nivel actual</p>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(100,116,139,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Lock style={{ width: 16, height: 16, color: "#64748B" }} />
                </div>
                <div>
                  <p style={{ color: "#FFFFFF", fontWeight: 700, margin: 0 }}>Nivel 1 — Solo teléfono</p>
                  <p style={{ color: "#94A3B8", fontSize: "13px", margin: "2px 0 0" }}>Límite: {LIMIT_LABELS[kyc.kycLevel]} MXN / mes</p>
                </div>
              </div>
            </div>

            {/* Benefits */}
            <h2 style={{ fontSize: "1.05rem", fontWeight: 700, color: "#FFFFFF", marginBottom: "16px" }}>
              Al verificar con tu CURP obtienes:
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "28px" }}>
              {[
                ["💰", "$24,000 MXN / mes", "Cuatro veces el límite actual"],
                ["🔒", "Cuenta más segura", "Protección ante robo de identidad"],
                ["⚡", "Pagos más grandes", "Recibos de hasta $5,000+ sin fricción"],
                ["🏆", "Base para Nivel 3", "Con SAT listo, escalas a $80,000/mes"],
              ].map(([icon, title, sub]) => (
                <div key={title} style={{ display: "flex", alignItems: "flex-start", gap: "14px", background: "rgba(255,255,255,0.04)", borderRadius: "12px", padding: "14px 16px" }}>
                  <span style={{ fontSize: "1.3rem", flexShrink: 0 }}>{icon}</span>
                  <div>
                    <p style={{ color: "#FFFFFF", fontWeight: 700, margin: "0 0 2px", fontSize: "0.9rem" }}>{title}</p>
                    <p style={{ color: "#94A3B8", margin: 0, fontSize: "13px" }}>{sub}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* What you need */}
            <div style={{ background: "rgba(29,158,117,0.06)", border: "1px solid rgba(29,158,117,0.2)", borderRadius: "12px", padding: "16px", marginBottom: "24px" }}>
              <p style={{ color: "#1D9E75", fontWeight: 700, margin: "0 0 10px", fontSize: "0.9rem" }}>Lo que necesitas:</p>
              {["Tu CURP (18 caracteres — en tu INE o acta de nacimiento)", "Tu nombre completo como aparece en tu identificación", "Tu fecha de nacimiento"].map(item => (
                <div key={item} style={{ display: "flex", alignItems: "flex-start", gap: "8px", marginBottom: "6px" }}>
                  <span style={{ color: "#1D9E75", marginTop: "2px", flexShrink: 0 }}>✓</span>
                  <p style={{ color: "#CBD5E1", margin: 0, fontSize: "13px", lineHeight: 1.5 }}>{item}</p>
                </div>
              ))}
            </div>

            <button
              onClick={() => setStep("form")}
              style={{ width: "100%", padding: "15px", background: "#1D9E75", color: "white", border: "none", borderRadius: "12px", fontSize: "0.95rem", fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 16px rgba(29,158,117,0.3)" }}
            >
              Verificar ahora → 2 minutos
            </button>
            <p style={{ textAlign: "center", color: "#475569", fontSize: "12px", marginTop: "12px" }}>
              Tus datos se almacenan encriptados y nunca se comparten con terceros.
            </p>
          </div>
        )}

        {/* ── STEP: FORM ───────────────────────────────────────────────────── */}
        {step === "form" && (
          <form onSubmit={handleSubmit} style={{ paddingTop: "20px", paddingBottom: "48px" }}>
            <p style={{ color: "#94A3B8", fontSize: "14px", lineHeight: 1.6, marginBottom: "28px" }}>
              Ingresa tus datos exactamente como aparecen en tu INE o acta de nacimiento.{" "}
              <span style={{ color: "#64748B" }}>Enter your details exactly as they appear on your INE or birth certificate.</span>
            </p>

            {/* CURP field */}
            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", color: "#CBD5E1", fontWeight: 600, fontSize: "13px", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                CURP
              </label>
              <input
                type="text"
                value={curp}
                onChange={e => setCurp(e.target.value.toUpperCase())}
                placeholder="LOAF900115HDFPRC01"
                maxLength={18}
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                style={{
                  width: "100%",
                  padding: "14px 16px",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: "10px",
                  color: "#FFFFFF",
                  fontSize: "1rem",
                  fontFamily: "'Space Mono', monospace",
                  letterSpacing: "0.08em",
                  boxSizing: "border-box",
                  outline: "none",
                }}
              />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "6px" }}>
                <span style={{ color: curp.length === 18 ? "#1D9E75" : "#475569", fontSize: "12px" }}>
                  {curp.length}/18 caracteres
                </span>
                <button
                  type="button"
                  onClick={() => setShowCurpHelp(h => !h)}
                  style={{ background: "none", border: "none", color: "#64748B", fontSize: "12px", cursor: "pointer", padding: 0 }}
                >
                  ¿Dónde encuentro mi CURP?
                </button>
              </div>
              {showCurpHelp && <CurpHelp />}
            </div>

            {/* Full name */}
            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", color: "#CBD5E1", fontWeight: 600, fontSize: "13px", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Nombre completo
              </label>
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="María García López"
                autoCapitalize="words"
                style={{
                  width: "100%",
                  padding: "14px 16px",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: "10px",
                  color: "#FFFFFF",
                  fontSize: "1rem",
                  boxSizing: "border-box",
                  outline: "none",
                }}
              />
            </div>

            {/* DOB */}
            <div style={{ marginBottom: "28px" }}>
              <label style={{ display: "block", color: "#CBD5E1", fontWeight: 600, fontSize: "13px", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Fecha de nacimiento
              </label>
              <input
                type="date"
                value={dob}
                onChange={e => setDob(e.target.value)}
                max={new Date().toISOString().split("T")[0]}
                min="1920-01-01"
                style={{
                  width: "100%",
                  padding: "14px 16px",
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: "10px",
                  color: "#FFFFFF",
                  fontSize: "1rem",
                  boxSizing: "border-box",
                  outline: "none",
                  colorScheme: "dark",
                }}
              />
            </div>

            {/* Error */}
            {formError && (
              <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", background: "rgba(216,90,48,0.1)", border: "1px solid rgba(216,90,48,0.3)", borderRadius: "10px", padding: "14px 16px", marginBottom: "20px" }}>
                <AlertCircle style={{ width: 18, height: 18, color: "#D85A30", flexShrink: 0, marginTop: "1px" }} />
                <p style={{ color: "#FDA4A4", margin: 0, fontSize: "13px", lineHeight: 1.5 }}>{formError}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              style={{
                width: "100%",
                padding: "15px",
                background: submitting ? "rgba(29,158,117,0.5)" : "#1D9E75",
                color: "white",
                border: "none",
                borderRadius: "12px",
                fontSize: "0.95rem",
                fontWeight: 700,
                cursor: submitting ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              {submitting ? (
                <>
                  <Loader2 className="animate-spin" style={{ width: 18, height: 18 }} />
                  Verificando…
                </>
              ) : (
                <>
                  <ShieldCheck style={{ width: 18, height: 18 }} />
                  Verificar identidad
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setStep("intro")}
              style={{ width: "100%", marginTop: "12px", padding: "12px", background: "transparent", color: "#64748B", border: "none", cursor: "pointer", fontSize: "14px" }}
            >
              ← Volver
            </button>

            <p style={{ textAlign: "center", color: "#334155", fontSize: "11px", marginTop: "16px", lineHeight: 1.5 }}>
              Tus datos se almacenan encriptados conforme a la Ley Federal de Protección de Datos Personales.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
