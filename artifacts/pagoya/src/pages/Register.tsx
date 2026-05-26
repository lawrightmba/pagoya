import { useState, useEffect, useRef, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import PagoYaLogo from "@/components/PagoYaLogo";

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

function getQueryParam(key: string): string | null {
  try {
    return new URLSearchParams(window.location.search).get(key);
  } catch {
    return null;
  }
}

const CITIES = ["Puerto Vallarta", "Guadalajara"];

const COLONIAS = [
  "Emiliano Zapata",
  "Versalles",
  "5 de Diciembre",
  "Pitillal",
  "Fluvial Vallarta",
  "Las Juntas / La Mojonera",
  "Zona Romántica",
  "Marina Vallarta",
  "Otra / Other",
];

type Screen = "form" | "otp" | "success";

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "14px 16px",
  fontSize: "16px",
  background: "rgba(255,255,255,0.06)",
  border: "1.5px solid rgba(255,255,255,0.12)",
  borderRadius: "12px",
  color: "#FFFFFF",
  outline: "none",
  boxSizing: "border-box",
  WebkitAppearance: "none",
  appearance: "none",
  fontFamily: "inherit",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "12px",
  fontWeight: 600,
  color: "rgba(255,255,255,0.5)",
  letterSpacing: "0.05em",
  textTransform: "uppercase",
  marginBottom: "6px",
};

const submitBtnStyle = (submitting: boolean): React.CSSProperties => ({
  marginTop: "8px",
  width: "100%",
  padding: "16px",
  fontSize: "16px",
  fontWeight: 800,
  background: submitting ? "rgba(29,158,117,0.5)" : "#1D9E75",
  color: "#FFFFFF",
  border: "none",
  borderRadius: "14px",
  cursor: submitting ? "not-allowed" : "pointer",
  letterSpacing: "-0.01em",
  boxShadow: "0 4px 20px rgba(29,158,117,0.35)",
  transition: "background 0.15s, transform 0.1s",
  fontFamily: "inherit",
  WebkitAppearance: "none",
  minHeight: "54px",
});

export default function Register() {
  // ── Form fields ──────────────────────────────────────────────────────────
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [curp, setCurp] = useState("");
  const [city, setCity] = useState("");
  const [colonia, setColonia] = useState("");
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [repId, setRepId] = useState<string | null>(null);
  const [refCode, setRefCode] = useState<string | null>(null);

  // ── Screen state ─────────────────────────────────────────────────────────
  const [screen, setScreen] = useState<Screen>("form");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // ── OTP state ────────────────────────────────────────────────────────────
  const phoneRef = useRef<string>("");
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const otpRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];
  const [otpError, setOtpError] = useState("");
  const [otpSubmitting, setOtpSubmitting] = useState(false);
  const [otpInputsDisabled, setOtpInputsDisabled] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(60);
  const [resendActive, setResendActive] = useState(false);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Success state ────────────────────────────────────────────────────────
  const [bonusCredited, setBonusCredited] = useState(false);
  const [bonusAmount, setBonusAmount] = useState(0);

  useEffect(() => {
    setRepId(getQueryParam("rep"));
    setRefCode(getQueryParam("ref"));
  }, []);

  // ── Countdown logic ──────────────────────────────────────────────────────
  const startCountdown = useCallback(() => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    setResendCountdown(60);
    setResendActive(false);
    countdownRef.current = setInterval(() => {
      setResendCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownRef.current!);
          setResendActive(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  // ── Build form payload ────────────────────────────────────────────────────
  const buildPayload = () => ({
    name: name.trim(),
    phone: phone.trim(),
    curp: curp.trim().toUpperCase(),
    city,
    colonia,
    ref_code: refCode ?? "",
    ...(repId ? { repId } : {}),
    ...(recoveryEmail.trim() ? { recoveryEmail: recoveryEmail.trim() } : {}),
  });

  // ── SCREEN: form submit ──────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !curp.trim() || !city || !colonia) return;
    setSubmitting(true);
    setFormError("");

    try {
      const res = await fetch(`${BASE_URL}/api/street-team/signup-with-bonus`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });
      const data = await res.json();

      if (data.status === "otp_required") {
        phoneRef.current = phone.trim();
        setDigits(["", "", "", "", "", ""]);
        setOtpError("");
        setOtpInputsDisabled(false);
        setScreen("otp");
        startCountdown();
        setTimeout(() => otpRefs[0].current?.focus(), 120);
        return;
      }

      if (!res.ok) {
        if (data.eligible === false) {
          const reasons: Record<string, string> = {
            inactive: "El programa de bonos no está activo en este momento.",
            duplicate: "Este número o CURP ya está registrado en PagoYa.",
            rep_not_eligible: "Este código de referido no es válido.",
          };
          setFormError(reasons[data.reason] ?? "Ocurrió un error. Intenta de nuevo.");
        } else {
          setFormError(data.error ?? "Ocurrió un error. Intenta de nuevo.");
        }
        return;
      }

      setFormError("Ocurrió un error. Intenta de nuevo.");
    } catch {
      setFormError("No se pudo conectar. Intenta de nuevo.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── SCREEN: OTP — digit input handling ───────────────────────────────────
  const handleDigitChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);
    if (digit && index < 5) {
      otpRefs[index + 1].current?.focus();
    }
  };

  const handleDigitKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      otpRefs[index - 1].current?.focus();
    }
  };

  const handleDigitPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const next = ["", "", "", "", "", ""];
    pasted.split("").forEach((ch, i) => { next[i] = ch; });
    setDigits(next);
    const focusIdx = Math.min(pasted.length, 5);
    otpRefs[focusIdx].current?.focus();
  };

  // ── SCREEN: OTP — verify ─────────────────────────────────────────────────
  const handleVerify = async () => {
    const code = digits.join("");
    if (code.length < 6) return;
    setOtpSubmitting(true);
    setOtpError("");

    try {
      const res = await fetch(`${BASE_URL}/api/street-team/verify-bonus-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phoneRef.current, code }),
      });
      const data = await res.json();

      if (data.success) {
        setBonusCredited(data.bonusCredited ?? false);
        setBonusAmount(data.bonusAmount ?? 0);
        setScreen("success");
        return;
      }

      if (data.verified === false) {
        const reason = data.reason as string;
        if (reason === "invalid") {
          setOtpError("Código incorrecto. Inténtalo de nuevo.");
          setDigits(["", "", "", "", "", ""]);
          setTimeout(() => otpRefs[0].current?.focus(), 80);
        } else if (reason === "expired") {
          setOtpError("El código expiró. Solicita uno nuevo.");
          setOtpInputsDisabled(true);
          setResendActive(true);
          if (countdownRef.current) clearInterval(countdownRef.current);
        } else if (reason === "max_attempts") {
          setOtpError("Demasiados intentos. Solicita un nuevo código.");
          setOtpInputsDisabled(true);
          setResendActive(true);
          if (countdownRef.current) clearInterval(countdownRef.current);
        } else {
          setOtpError("Ocurrió un error. Intenta de nuevo.");
        }
        return;
      }

      setOtpError("Ocurrió un error. Intenta de nuevo.");
    } catch {
      setOtpError("No se pudo conectar. Intenta de nuevo.");
    } finally {
      setOtpSubmitting(false);
    }
  };

  // ── SCREEN: OTP — resend ─────────────────────────────────────────────────
  const handleResend = async () => {
    if (!resendActive) return;
    setOtpError("");
    setOtpInputsDisabled(false);
    setDigits(["", "", "", "", "", ""]);
    try {
      await fetch(`${BASE_URL}/api/street-team/signup-with-bonus`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });
    } catch {
      // Ignore — new OTP silently regenerated
    }
    startCountdown();
    setTimeout(() => otpRefs[0].current?.focus(), 80);
  };

  const phoneLastFour = phoneRef.current.slice(-4);

  // ── Shared page wrapper ──────────────────────────────────────────────────
  const pageWrap: React.CSSProperties = {
    minHeight: "100dvh",
    background: "#0A2540",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "32px 20px 48px",
    boxSizing: "border-box",
  };

  // ════════════════════════════════════════════════════════════════════
  // SCREEN: success
  // ════════════════════════════════════════════════════════════════════
  if (screen === "success") {
    return (
      <div style={pageWrap}>
        <Helmet>
          <title>Registro exitoso | PagoYa</title>
          <meta name="robots" content="noindex,follow" />
        </Helmet>
        <div style={{ marginBottom: "32px", display: "flex", justifyContent: "center" }}>
          <PagoYaLogo style={{ height: "44px", width: "auto" }} />
        </div>
        <div style={{
          width: "100%",
          maxWidth: "400px",
          background: "rgba(29,158,117,0.12)",
          border: "1.5px solid rgba(29,158,117,0.4)",
          borderRadius: "20px",
          padding: "36px 28px",
          textAlign: "center",
        }}>
          {bonusCredited ? (
            <>
              <div style={{ fontSize: "52px", marginBottom: "16px" }}>💳</div>
              <h2 style={{ fontSize: "22px", fontWeight: 900, color: "#FFFFFF", margin: "0 0 14px", lineHeight: 1.25 }}>
                ¡Bienvenido a PagoYa! 🎉
              </h2>
              <p style={{ fontSize: "17px", fontWeight: 700, color: "#1D9E75", margin: "0 0 10px" }}>
                ${bonusAmount.toFixed(2)} MXN han sido acreditados a tu cartera.
              </p>
              <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.55)", lineHeight: 1.55, margin: 0 }}>
                Revisa tu WhatsApp para más detalles.
              </p>
            </>
          ) : (
            <>
              <div style={{ fontSize: "52px", marginBottom: "16px" }}>✅</div>
              <h2 style={{ fontSize: "22px", fontWeight: 900, color: "#FFFFFF", margin: "0 0 14px", lineHeight: 1.25 }}>
                ¡Registro exitoso!
              </h2>
              <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.55)", lineHeight: 1.55, margin: 0 }}>
                Revisa tu WhatsApp para más detalles.
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════
  // SCREEN: otp
  // ════════════════════════════════════════════════════════════════════
  if (screen === "otp") {
    return (
      <div style={pageWrap}>
        <Helmet>
          <title>Verifica tu número | PagoYa</title>
          <meta name="robots" content="noindex,follow" />
        </Helmet>
        <div style={{ marginBottom: "32px", display: "flex", justifyContent: "center" }}>
          <PagoYaLogo style={{ height: "44px", width: "auto" }} />
        </div>

        <div style={{ width: "100%", maxWidth: "400px" }}>
          <h1 style={{
            fontSize: "clamp(22px, 6vw, 28px)",
            fontWeight: 900,
            color: "#FFFFFF",
            textAlign: "center",
            lineHeight: 1.2,
            margin: "0 0 10px",
            letterSpacing: "-0.02em",
          }}>
            Verifica tu número
          </h1>
          <p style={{
            fontSize: "14px",
            color: "rgba(255,255,255,0.48)",
            textAlign: "center",
            margin: "0 0 36px",
            lineHeight: 1.5,
          }}>
            Enviamos un código de 6 dígitos por WhatsApp al{" "}
            <span style={{ color: "rgba(255,255,255,0.75)", fontWeight: 600 }}>
              ****{phoneLastFour}
            </span>
          </p>

          {/* Six OTP inputs */}
          <div style={{
            display: "flex",
            gap: "8px",
            justifyContent: "center",
            marginBottom: "12px",
          }}>
            {digits.map((d, i) => (
              <input
                key={i}
                ref={otpRefs[i]}
                type="tel"
                inputMode="numeric"
                maxLength={1}
                value={d}
                disabled={otpInputsDisabled}
                onChange={(e) => handleDigitChange(i, e.target.value)}
                onKeyDown={(e) => handleDigitKeyDown(i, e)}
                onPaste={handleDigitPaste}
                style={{
                  width: "clamp(44px, 13vw, 52px)",
                  height: "clamp(48px, 14vw, 56px)",
                  fontSize: "22px",
                  fontWeight: 800,
                  textAlign: "center",
                  background: "rgba(255,255,255,0.06)",
                  border: `1.5px solid ${d ? "#1D9E75" : "rgba(255,255,255,0.15)"}`,
                  borderRadius: "12px",
                  color: "#FFFFFF",
                  outline: "none",
                  caretColor: "#1D9E75",
                  fontFamily: "inherit",
                  opacity: otpInputsDisabled ? 0.4 : 1,
                  boxSizing: "border-box",
                }}
              />
            ))}
          </div>

          {/* Error message */}
          {otpError && (
            <p style={{
              fontSize: "13px",
              color: "#F87171",
              textAlign: "center",
              margin: "0 0 16px",
              lineHeight: 1.4,
            }}>
              {otpError}
            </p>
          )}

          {/* Verify button */}
          <button
            onClick={handleVerify}
            disabled={otpSubmitting || digits.join("").length < 6 || otpInputsDisabled}
            style={submitBtnStyle(otpSubmitting || digits.join("").length < 6 || otpInputsDisabled)}
            onMouseDown={(e) => {
              if (!otpSubmitting) (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.98)";
            }}
            onMouseUp={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = ""; }}
            onTouchStart={(e) => {
              if (!otpSubmitting) (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.98)";
            }}
            onTouchEnd={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = ""; }}
          >
            {otpSubmitting ? "Verificando…" : "Verificar"}
          </button>

          {/* Resend link */}
          <div style={{ textAlign: "center", marginTop: "20px" }}>
            {resendActive ? (
              <button
                onClick={handleResend}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#1D9E75",
                  fontSize: "14px",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  padding: "8px 16px",
                  minHeight: "44px",
                }}
              >
                Reenviar código
              </button>
            ) : (
              <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.35)", fontFamily: "inherit" }}>
                Reenviar en {resendCountdown}s
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════
  // SCREEN: form
  // ════════════════════════════════════════════════════════════════════
  return (
    <div style={pageWrap}>
      <Helmet>
        <title>Crear cuenta gratis | PagoYa</title>
        <meta name="description" content="Regístrate gratis en PagoYa y empieza a pagar todos tus servicios desde tu celular. Sin banco, sin filas, sin complicaciones." />
        <meta name="keywords" content="registrarse PagoYa, crear cuenta pagos, app pagos sin banco México" />
        <meta name="robots" content="noindex,follow" />
        <link rel="canonical" href="https://pagoyamx.com/register" />
      </Helmet>

      <div style={{ marginBottom: "32px", display: "flex", justifyContent: "center" }}>
        <PagoYaLogo style={{ height: "44px", width: "auto" }} />
      </div>

      <div style={{ width: "100%", maxWidth: "400px" }}>
        <h1 style={{
          fontSize: "clamp(24px, 6vw, 32px)",
          fontWeight: 900,
          color: "#FFFFFF",
          textAlign: "center",
          lineHeight: 1.2,
          margin: "0 0 6px",
          letterSpacing: "-0.02em",
        }}>
          Paga todo desde tu celular
        </h1>
        <p style={{
          fontSize: "15px",
          color: "rgba(255,255,255,0.48)",
          textAlign: "center",
          margin: "0 0 36px",
        }}>
          Pay everything from your phone
        </p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

          {/* Name */}
          <div>
            <label style={labelStyle}>Nombre / Name</label>
            <input
              type="text"
              autoComplete="name"
              placeholder="Tu nombre completo"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              style={inputStyle}
              onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = "#1D9E75"; }}
              onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = "rgba(255,255,255,0.12)"; }}
            />
          </div>

          {/* Phone */}
          <div>
            <label style={labelStyle}>WhatsApp</label>
            <input
              type="tel"
              autoComplete="tel"
              placeholder="+52 322 000 0000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              inputMode="tel"
              style={inputStyle}
              onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = "#1D9E75"; }}
              onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = "rgba(255,255,255,0.12)"; }}
            />
          </div>

          {/* CURP */}
          <div>
            <label style={labelStyle}>CURP</label>
            <input
              type="text"
              autoComplete="off"
              placeholder="Ej: LOAM850101HDFPLN09"
              value={curp}
              onChange={(e) => setCurp(e.target.value.toUpperCase())}
              required
              maxLength={18}
              style={{ ...inputStyle, letterSpacing: "0.06em" }}
              onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = "#1D9E75"; }}
              onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = "rgba(255,255,255,0.12)"; }}
            />
            <p style={{ margin: "5px 0 0", fontSize: "11px", color: "rgba(255,255,255,0.3)", lineHeight: 1.4 }}>
              Tu CURP aparece en tu INE o acta de nacimiento
            </p>
          </div>

          {/* Recovery Email */}
          <div>
            <label style={labelStyle}>
              Correo de recuperación{" "}
              <span style={{ fontWeight: 400, color: "rgba(255,255,255,0.32)", textTransform: "none", letterSpacing: 0 }}>
                (opcional)
              </span>
            </label>
            <input
              type="email"
              autoComplete="email"
              placeholder="tu@correo.com"
              value={recoveryEmail}
              onChange={(e) => setRecoveryEmail(e.target.value)}
              inputMode="email"
              style={inputStyle}
              onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = "#1D9E75"; }}
              onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = "rgba(255,255,255,0.12)"; }}
            />
            <p style={{ margin: "5px 0 0", fontSize: "11px", color: "rgba(255,255,255,0.3)", lineHeight: 1.4 }}>
              Para recuperar tu cuenta si pierdes acceso a tu número.
            </p>
          </div>

          {/* City */}
          <div>
            <label style={labelStyle}>Ciudad / City</label>
            <div style={{ position: "relative" }}>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                required
                style={{
                  ...inputStyle,
                  color: city ? "#FFFFFF" : "rgba(255,255,255,0.35)",
                  cursor: "pointer",
                  paddingRight: "40px",
                }}
                onFocus={(e) => { (e.target as HTMLSelectElement).style.borderColor = "#1D9E75"; }}
                onBlur={(e) => { (e.target as HTMLSelectElement).style.borderColor = "rgba(255,255,255,0.12)"; }}
              >
                <option value="" disabled style={{ background: "#0A2540", color: "rgba(255,255,255,0.4)" }}>
                  Selecciona tu ciudad
                </option>
                {CITIES.map((c) => (
                  <option key={c} value={c} style={{ background: "#0A2540", color: "#FFFFFF" }}>{c}</option>
                ))}
              </select>
              <span style={{
                position: "absolute", right: "14px", top: "50%",
                transform: "translateY(-50%)",
                color: "rgba(255,255,255,0.4)", pointerEvents: "none", fontSize: "12px",
              }}>▾</span>
            </div>
          </div>

          {/* Colonia */}
          <div>
            <label style={labelStyle}>¿En qué colonia vives? / Your neighborhood</label>
            <div style={{ position: "relative" }}>
              <select
                value={colonia}
                onChange={(e) => setColonia(e.target.value)}
                required
                style={{
                  ...inputStyle,
                  color: colonia ? "#FFFFFF" : "rgba(255,255,255,0.35)",
                  cursor: "pointer",
                  paddingRight: "40px",
                }}
                onFocus={(e) => { (e.target as HTMLSelectElement).style.borderColor = "#1D9E75"; }}
                onBlur={(e) => { (e.target as HTMLSelectElement).style.borderColor = "rgba(255,255,255,0.12)"; }}
              >
                <option value="" disabled style={{ background: "#0A2540", color: "rgba(255,255,255,0.4)" }}>
                  Selecciona tu colonia
                </option>
                {COLONIAS.map((c) => (
                  <option key={c} value={c} style={{ background: "#0A2540", color: "#FFFFFF" }}>{c}</option>
                ))}
              </select>
              <span style={{
                position: "absolute", right: "14px", top: "50%",
                transform: "translateY(-50%)",
                color: "rgba(255,255,255,0.4)", pointerEvents: "none", fontSize: "12px",
              }}>▾</span>
            </div>
          </div>

          {/* Form error */}
          {formError && (
            <p style={{ margin: 0, fontSize: "13px", color: "#F87171", textAlign: "center", lineHeight: 1.4 }}>
              {formError}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            style={submitBtnStyle(submitting)}
            onMouseDown={(e) => {
              if (!submitting) (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.98)";
            }}
            onMouseUp={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = ""; }}
            onTouchStart={(e) => {
              if (!submitting) (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.98)";
            }}
            onTouchEnd={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = ""; }}
          >
            {submitting ? "Registrando…" : "Registrarme / Sign Me Up"}
          </button>
        </form>

        <p style={{
          marginTop: "24px",
          fontSize: "11px",
          color: "rgba(255,255,255,0.28)",
          textAlign: "center",
          lineHeight: 1.5,
        }}>
          Al registrarte aceptas recibir mensajes por WhatsApp · By registering you agree to receive WhatsApp messages
        </p>
      </div>
    </div>
  );
}
