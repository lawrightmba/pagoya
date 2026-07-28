import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { Helmet } from "react-helmet-async";
import PaulaHint from "@/components/PaulaHint";

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

function getQueryParam(key: string): string | null {
  try {
    return new URLSearchParams(window.location.search).get(key);
  } catch {
    return null;
  }
}

const CITIES = [
  // Jalisco
  "Puerto Vallarta",
  "Guadalajara",
  // Nayarit
  "Bahía de Banderas",
  "Bucerías",
  "La Cruz de Huanacaxtle",
  "Sayulita",
  "Nuevo Vallarta",
  "Tepic",
  // Other
  "Otra ciudad / Other city",
];

const COLONIAS: Record<string, string[]> = {
  "Puerto Vallarta": [
    "Emiliano Zapata",
    "Versalles",
    "5 de Diciembre",
    "Pitillal",
    "Fluvial Vallarta",
    "Las Juntas / La Mojonera",
    "Zona Romántica",
    "Marina Vallarta",
    "Otra / Other",
  ],
  "Guadalajara": [
    "Zapopan",
    "Tlaquepaque",
    "Tonalá",
    "Tlajomulco",
    "Centro Histórico",
    "Providencia",
    "Chapalita",
    "Otra / Other",
  ],
  "Bahía de Banderas": [
    "Mezcales",
    "Valle de Banderas",
    "San José del Valle",
    "Las Jarretaderas",
    "Higuera Blanca",
    "Otra / Other",
  ],
  "Bucerías": [
    "Bucerias Centro",
    "El Pitillal (Nayarit)",
    "La Lotería",
    "Otra / Other",
  ],
  "La Cruz de Huanacaxtle": [
    "La Cruz Centro",
    "El Monteon",
    "Otra / Other",
  ],
  "Sayulita": [
    "Sayulita Centro",
    "Otra / Other",
  ],
  "Nuevo Vallarta": [
    "Flamingos",
    "Paradise Village",
    "Nuevo Vallarta Centro",
    "Otra / Other",
  ],
  "Tepic": [
    "Centro Tepic",
    "Ciudad del Valle",
    "Las Flores",
    "Moctezuma",
    "Otra / Other",
  ],
  "Otra ciudad / Other city": [
    "Otra / Other",
  ],
};

const COUNTRY_CODES = [
  { code: "+52",  flag: "🇲🇽", label: "México" },
  { code: "+1",   flag: "🇺🇸", label: "Estados Unidos" },
  { code: "+1",   flag: "🇨🇦", label: "Canadá" },
  { code: "+502", flag: "🇬🇹", label: "Guatemala" },
  { code: "+504", flag: "🇭🇳", label: "Honduras" },
  { code: "+503", flag: "🇸🇻", label: "El Salvador" },
  { code: "+505", flag: "🇳🇮", label: "Nicaragua" },
  { code: "+57",  flag: "🇨🇴", label: "Colombia" },
  { code: "+58",  flag: "🇻🇪", label: "Venezuela" },
  { code: "+34",  flag: "🇪🇸", label: "España" },
];

type Screen = "form" | "otp" | "success";

interface FieldErrors {
  name: string;
  phone: string;
  city: string;
  colonia: string;
}

// ── Validation helpers ────────────────────────────────────────────────────────
function validateName(val: string): string {
  if (!val.trim()) return "Por favor ingresa tu nombre completo";
  return "";
}

function validatePhone(localNum: string): string {
  if (!localNum.trim()) return "Por favor ingresa tu número de teléfono";
  if (/[a-zA-Z]/.test(localNum)) return "Solo se permiten números";
  const digits = localNum.replace(/\D/g, "");
  if (digits.length < 7) return "Ingresa un número válido (mínimo 7 dígitos)";
  if (digits.length > 15) return "Número demasiado largo (máximo 15 dígitos)";
  return "";
}


function validateCity(val: string): string {
  if (!val) return "Por favor selecciona tu ciudad";
  return "";
}

function validateColonia(val: string): string {
  if (!val) return "Por favor ingresa tu colonia";
  return "";
}

function coloniasForCity(cityVal: string): string[] {
  return COLONIAS[cityVal] ?? ["Otra / Other"];
}

// ── Styles ────────────────────────────────────────────────────────────────────
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

const fieldErrorStyle: React.CSSProperties = {
  margin: "5px 0 0",
  fontSize: "14px",
  color: "#F87171",
  lineHeight: 1.4,
};

const submitBtnStyle = (disabled: boolean): React.CSSProperties => ({
  marginTop: "8px",
  width: "100%",
  padding: "16px",
  fontSize: "16px",
  fontWeight: 800,
  background: disabled ? "rgba(29,158,117,0.5)" : "#1D9E75",
  color: "#FFFFFF",
  border: "none",
  borderRadius: "14px",
  cursor: disabled ? "not-allowed" : "pointer",
  letterSpacing: "-0.01em",
  boxShadow: "0 4px 20px rgba(29,158,117,0.35)",
  transition: "background 0.15s, transform 0.1s",
  fontFamily: "inherit",
  WebkitAppearance: "none",
  minHeight: "54px",
});

const apiErrorBoxStyle: React.CSSProperties = {
  margin: "4px 0 0",
  padding: "12px 14px",
  background: "rgba(239,68,68,0.1)",
  border: "1.5px solid rgba(239,68,68,0.45)",
  borderRadius: "10px",
  fontSize: "14px",
  color: "#FCA5A5",
  lineHeight: 1.5,
};

export default function Register() {
  const [, navigate] = useLocation();

  // ── Form fields ───────────────────────────────────────────────────────────
  const [name, setName] = useState("");
  const [countryCode, setCountryCode] = useState("+52");
  const [localNumber, setLocalNumber] = useState("");
  const [city, setCity] = useState("");
  const [colonia, setColonia] = useState("");
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [repId, setRepId] = useState<string | null>(null);
  const [refCode, setRefCode] = useState<string | null>(null);
  const [tipoParam, setTipoParam] = useState<string | null>(null);

  // ── Field-level errors ────────────────────────────────────────────────────
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({
    name: "", phone: "", city: "", colonia: "",
  });

  // ── Screen state ──────────────────────────────────────────────────────────
  const [screen, setScreen] = useState<Screen>("form");

  // Capture UTM params + referrer on first load and stash in sessionStorage
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const utm: Record<string, string> = {};
    ["utm_source", "utm_campaign", "utm_medium", "utm_content", "ref"].forEach(k => {
      const v = params.get(k);
      if (v) utm[k] = v;
    });
    if (Object.keys(utm).length) sessionStorage.setItem("pagoya_utm", JSON.stringify(utm));
    if (document.referrer && !sessionStorage.getItem("pagoya_referrer")) {
      sessionStorage.setItem("pagoya_referrer", document.referrer);
    }
  }, []);

  // Fire GA4 sign_up conversion with full attribution context
  useEffect(() => {
    if (screen !== "success") return;
    if (typeof window === "undefined" || typeof (window as any).gtag !== "function") return;
    const utm = JSON.parse(sessionStorage.getItem("pagoya_utm") ?? "{}");
    const referrer = sessionStorage.getItem("pagoya_referrer") ?? "";
    (window as any).gtag("event", "sign_up", {
      method: "PagoYa",
      event_category: "engagement",
      event_label: "registration_complete",
      utm_source:   utm.utm_source   ?? (referrer ? "referral" : "direct"),
      utm_campaign: utm.utm_campaign ?? "",
      utm_medium:   utm.utm_medium   ?? "",
      source_page:  referrer,
      ref_code:     utm.ref          ?? getQueryParam("ref") ?? "",
    });
  }, [screen]);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // ── OTP state ─────────────────────────────────────────────────────────────
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

  // ── Success state ─────────────────────────────────────────────────────────
  const [bonusCredited, setBonusCredited] = useState(false);
  const [bonusAmount, setBonusAmount] = useState(0);
  const [waNumber, setWaNumber] = useState<string | null>(null);
  const [whatsappConsent, setWhatsappConsent] = useState(false);

  useEffect(() => {
    setRepId(getQueryParam("rep"));
    setRefCode(getQueryParam("ref"));
    setTipoParam(getQueryParam("tipo"));
  }, []);

  // ── Fetch WhatsApp number when success screen shown ───────────────────────
  useEffect(() => {
    if (screen !== "success") return;
    fetch(`${BASE_URL}/api/config/whatsapp`)
      .then((r) => r.json())
      .then((d: { number?: string | null }) => setWaNumber(d.number ?? null))
      .catch(() => {});
  }, [screen]);

  // ── Countdown logic ───────────────────────────────────────────────────────
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
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, []);

  // ── Combined phone (what gets sent to API and Twilio) ─────────────────────
  const combinedPhone = `${countryCode}${localNumber.replace(/\D/g, "")}`;

  // ── Blur validators ───────────────────────────────────────────────────────
  const setFieldError = (field: keyof FieldErrors, msg: string) => {
    setFieldErrors((prev) => ({ ...prev, [field]: msg }));
  };

  const handleNameBlur = () => setFieldError("name", validateName(name));
  const handlePhoneBlur = () => setFieldError("phone", validatePhone(localNumber));
  const handleCityBlur = () => setFieldError("city", validateCity(city));
  const handleColoniaBlur = () => setFieldError("colonia", validateColonia(colonia));

  // ── Build form payload ────────────────────────────────────────────────────
  const isLandlordFlow =
    (refCode !== null && refCode.startsWith("LND")) ||
    refCode === "LANDLORD" ||
    tipoParam === "propietario";

  const hasSpecificLndCode = refCode !== null && refCode.startsWith("LND");

  const buildPayload = () => ({
    name: name.trim(),
    phone: combinedPhone,
    city,
    colonia,
    ref_code: isLandlordFlow ? "" : (refCode ?? ""),
    ...(hasSpecificLndCode ? { landlord_ref: refCode } : {}),
    ...(!hasSpecificLndCode && isLandlordFlow ? { is_generic_landlord: true } : {}),
    ...(repId ? { repId } : {}),
    ...(recoveryEmail.trim() ? { recoveryEmail: recoveryEmail.trim() } : {}),
    whatsapp_consent_at: whatsappConsent ? new Date().toISOString() : null,
    landing_page: sessionStorage.getItem("pagoya_landing_page") ?? "",
  });

  // ── SCREEN: form submit ───────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errs: FieldErrors = {
      name: validateName(name),
      phone: validatePhone(localNumber),
      city: validateCity(city),
      colonia: validateColonia(colonia),
    };
    setFieldErrors(errs);
    if (Object.values(errs).some(Boolean)) return;

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
        phoneRef.current = combinedPhone;
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
            inactive: "El programa de bonos no está disponible en este momento. Intenta más tarde.",
            duplicate: "Este número de teléfono o CURP ya tiene una cuenta en PagoYa. ¿Ya eres usuario? Descarga la app para iniciar sesión.",
            rep_not_eligible: "El código de referido no es válido. Pide al representante que te dé un nuevo enlace.",
          };
          setFormError(reasons[data.reason] ?? "Ocurrió un error inesperado. Verifica tu conexión e intenta de nuevo.");
        } else if (data.status === "otp_send_failed") {
          setFormError("No pudimos enviar el código por WhatsApp. Verifica que tu número sea correcto e intenta de nuevo.");
        } else {
          setFormError(data.error ?? "Ocurrió un error inesperado. Verifica tu conexión e intenta de nuevo.");
        }
        return;
      }

      setFormError("Ocurrió un error inesperado. Verifica tu conexión e intenta de nuevo.");
    } catch {
      setFormError("Ocurrió un error inesperado. Verifica tu conexión e intenta de nuevo.");
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
    if (digit && index < 5) otpRefs[index + 1].current?.focus();
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
    otpRefs[Math.min(pasted.length, 5)].current?.focus();
  };

  // ── SCREEN: OTP — verify ──────────────────────────────────────────────────
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
        localStorage.setItem("pagoya_telefono", phoneRef.current);
        navigate("/spin");
        return;
      }

      if (data.verified === false) {
        const reason = data.reason as string;
        if (reason === "invalid") {
          setOtpError("Código incorrecto. Revisa tu WhatsApp e inténtalo de nuevo.");
          setDigits(["", "", "", "", "", ""]);
          setTimeout(() => otpRefs[0].current?.focus(), 80);
        } else if (reason === "expired") {
          setOtpError("El código expiró. Toca 'Reenviar código' para recibir uno nuevo.");
          setOtpInputsDisabled(true);
          setResendActive(true);
          if (countdownRef.current) clearInterval(countdownRef.current);
        } else if (reason === "max_attempts") {
          setOtpError("Demasiados intentos incorrectos. Toca 'Reenviar código' para recibir un nuevo código.");
          setOtpInputsDisabled(true);
          setResendActive(true);
          if (countdownRef.current) clearInterval(countdownRef.current);
        } else {
          setOtpError("Ocurrió un error inesperado. Verifica tu conexión e intenta de nuevo.");
        }
        return;
      }

      setOtpError("Ocurrió un error inesperado. Verifica tu conexión e intenta de nuevo.");
    } catch {
      setOtpError("Ocurrió un error inesperado. Verifica tu conexión e intenta de nuevo.");
    } finally {
      setOtpSubmitting(false);
    }
  };

  // ── SCREEN: OTP — resend ──────────────────────────────────────────────────
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
    } catch { /* silent */ }
    startCountdown();
    setTimeout(() => otpRefs[0].current?.focus(), 80);
  };

  const phoneLastFour = phoneRef.current.slice(-4);

  // ── Shared page wrapper ───────────────────────────────────────────────────
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

  // ══════════════════════════════════════════════════════════════════════
  // SCREEN: success
  // ══════════════════════════════════════════════════════════════════════
  if (screen === "success") {
    return (
      <div style={pageWrap}>
        <Helmet>
          <title>Registro exitoso | PagoYa</title>
          <meta name="robots" content="noindex,follow" />
        </Helmet>

        {/* Confetti layer */}
        <style>{`
          @keyframes confettiFall {
            0%   { transform: translateY(-20px) rotate(0deg);   opacity: 1; }
            100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
          }
          @keyframes bonusPop {
            0%   { transform: scale(0.5); opacity: 0; }
            60%  { transform: scale(1.15); }
            100% { transform: scale(1);   opacity: 1; }
          }
        `}</style>
        {bonusCredited && (
          <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 50, overflow: "hidden" }}>
            {Array.from({ length: 32 }).map((_, i) => {
              const colors = ["#00C875","#FFD700","#FF6B6B","#4ECDC4","#45B7D1","#FFA07A","#98D8C8","#F7DC6F"];
              const left = Math.random() * 100;
              const delay = Math.random() * 1.6;
              const dur = 1.8 + Math.random() * 1.4;
              const size = 8 + Math.random() * 8;
              const color = colors[i % colors.length];
              return (
                <div key={i} style={{
                  position: "absolute", top: 0, left: `${left}%`,
                  width: size, height: size,
                  background: color, borderRadius: Math.random() > 0.5 ? "50%" : "2px",
                  animation: `confettiFall ${dur}s ${delay}s ease-in forwards`,
                }} />
              );
            })}
          </div>
        )}

        <div style={{ marginBottom: "32px", display: "flex", justifyContent: "center" }}>
          <img src="/pagoya-logo.png" alt="PagoYa" style={{ height: "44px", width: "auto", objectFit: "contain" }} />
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
              {/* Big animated bonus amount */}
              <div style={{ fontSize: "48px", marginBottom: "8px", animation: "bonusPop 0.6s ease-out forwards" }}>🎉</div>
              <h2 style={{ fontSize: "24px", fontWeight: 900, color: "#FFFFFF", margin: "0 0 8px", lineHeight: 1.2 }}>
                ¡Tu saldo llegó!
              </h2>
              <div style={{
                display: "inline-block",
                background: "linear-gradient(135deg, #005432, #1D9E75)",
                borderRadius: 16,
                padding: "16px 32px",
                margin: "12px 0 16px",
                boxShadow: "0 8px 32px rgba(0,200,117,0.4)",
                animation: "bonusPop 0.5s 0.2s ease-out both",
              }}>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.7)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  Saldo acreditado
                </p>
                <p style={{ margin: "4px 0 0", fontSize: 42, fontWeight: 900, color: "#00C875", lineHeight: 1 }}>
                  ${bonusAmount.toFixed(0)} MXN
                </p>
              </div>
              <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.6)", lineHeight: 1.55, margin: "0 0 22px" }}>
                Listo para pagar tu primer recibo. Revisa tu WhatsApp — Paula te está esperando.
              </p>
            </>
          ) : (
            <>
              <div style={{ fontSize: "52px", marginBottom: "16px" }}>✅</div>
              <h2 style={{ fontSize: "22px", fontWeight: 900, color: "#FFFFFF", margin: "0 0 14px", lineHeight: 1.25 }}>
                ¡Registro exitoso!
              </h2>
              <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.55)", lineHeight: 1.55, margin: "0 0 24px" }}>
                Revisa tu WhatsApp para más detalles.
              </p>
            </>
          )}

          {waNumber && (
            <a
              href={`https://wa.me/${waNumber}?text=${encodeURIComponent("Hola PagoYa, acabo de registrarme 👋")}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                width: "100%",
                padding: "15px 20px",
                background: "#25D366",
                borderRadius: "14px",
                color: "#FFFFFF",
                fontSize: "15px",
                fontWeight: 800,
                textDecoration: "none",
                boxSizing: "border-box",
                boxShadow: "0 4px 16px rgba(37,211,102,0.35)",
                minHeight: "52px",
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Chatear con Paula en WhatsApp
            </a>
          )}
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════
  // SCREEN: otp
  // ══════════════════════════════════════════════════════════════════════
  if (screen === "otp") {
    return (
      <div style={pageWrap}>
        <Helmet>
          <title>Verifica tu número | PagoYa</title>
          <meta name="robots" content="noindex,follow" />
        </Helmet>
        <div style={{ marginBottom: "32px", display: "flex", justifyContent: "center" }}>
          <img src="/pagoya-logo.png" alt="PagoYa" style={{ height: "44px", width: "auto", objectFit: "contain" }} />
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

          {/* $150 trust line */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            background: "rgba(29,158,117,0.12)",
            border: "1px solid rgba(29,158,117,0.3)",
            borderRadius: "10px",
            padding: "10px 14px",
            marginBottom: "20px",
          }}>
            <span style={{ fontSize: "16px", flexShrink: 0 }}>🔒</span>
            <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.88)", fontWeight: 600, lineHeight: 1.4 }}>
              Tu bono de $150 MXN está protegido — se acredita al verificar tu número
            </span>
          </div>

          {/* Six OTP inputs */}
          <div style={{ display: "flex", gap: "8px", justifyContent: "center", marginBottom: "12px" }}>
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

          {otpError && (
            <div style={{ ...apiErrorBoxStyle, marginBottom: "16px", textAlign: "center" }}>
              {otpError}
            </div>
          )}

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
              <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.35)" }}>
                Reenviar en {resendCountdown}s
              </span>
            )}
          </div>
          <div style={{ textAlign: "center", marginTop: "14px" }}>
            <PaulaHint
              message="No recibí mi código de verificación por WhatsApp. ¿Qué puedo hacer?"
              label="¿No recibiste el código?"
              variant="dark"
            />
          </div>
          <div style={{ textAlign: "center", marginTop: "24px" }}>
            <button
              onClick={() => { setScreen("form"); setDigits(Array(6).fill("")); setOtpError(""); }}
              style={{
                background: "transparent",
                border: "none",
                color: "rgba(255,255,255,0.38)",
                fontSize: "13px",
                cursor: "pointer",
                fontFamily: "inherit",
                padding: "8px 16px",
                minHeight: "44px",
              }}
            >
              ← Cambiar número de teléfono
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════
  // SCREEN: form
  // ══════════════════════════════════════════════════════════════════════
  return (
    <div style={pageWrap}>
      <Helmet>
        <title>Crear cuenta gratis | PagoYa</title>
        <meta name="description" content="Regístrate gratis en PagoYa y empieza a pagar todos tus servicios desde tu celular. Sin banco, sin filas, sin complicaciones." />
        <meta name="keywords" content="registrarse PagoYa, crear cuenta pagos, app pagos sin banco México" />
        <meta name="robots" content="noindex,follow" />
        <link rel="canonical" href="https://pagoyamx.com/register" />
      </Helmet>

      <div style={{ marginBottom: "32px", display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
        <div style={{ width: "100%", maxWidth: "400px", display: "flex", alignItems: "center" }}>
          <button
            type="button"
            onClick={() => navigate("/")}
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: "50%",
              width: "36px",
              height: "36px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "rgba(255,255,255,0.7)",
              flexShrink: 0,
            }}
            aria-label="Volver al inicio"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        </div>
        <img src="/pagoya-logo.png" alt="PagoYa" style={{ height: "44px", width: "auto", objectFit: "contain" }} />
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
          Crea tu cuenta y recibe $150 MXN
        </h1>
        <p style={{
          fontSize: "15px",
          color: "rgba(255,255,255,0.48)",
          textAlign: "center",
          margin: "0 0 12px",
        }}>
          Pay everything from your phone
        </p>

        <p style={{
          fontSize: "11px",
          color: "rgba(255,255,255,0.30)",
          textAlign: "center",
          margin: "0 0 28px",
          lineHeight: 1.5,
          letterSpacing: "0.01em",
        }}>
          PagoYa Technologies SA de CV&nbsp;&nbsp;•&nbsp;&nbsp;Empresa mexicana registrada&nbsp;&nbsp;•&nbsp;&nbsp;Tus datos están protegidos
        </p>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

          {/* Name */}
          <div>
            <label style={labelStyle}>Nombre completo</label>
            <input
              type="text"
              autoComplete="name"
              placeholder="Tu nombre completo"
              value={name}
              onChange={(e) => { setName(e.target.value); setFieldError("name", ""); }}
              required
              style={{
                ...inputStyle,
                borderColor: fieldErrors.name ? "rgba(239,68,68,0.6)" : "rgba(255,255,255,0.12)",
              }}
              onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = "#1D9E75"; }}
              onBlur={(e) => {
                handleNameBlur();
                if (!fieldErrors.name) (e.target as HTMLInputElement).style.borderColor = "rgba(255,255,255,0.12)";
              }}
            />
            {fieldErrors.name && <p style={fieldErrorStyle}>{fieldErrors.name}</p>}
          </div>

          {/* WhatsApp — country code + local number */}
          <div>
            <label style={labelStyle}>WhatsApp</label>
            <div style={{ display: "flex", gap: "8px" }}>

              {/* Country code selector — ~30% width */}
              <div style={{ position: "relative", flexShrink: 0, width: "30%" }}>
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  style={{
                    ...inputStyle,
                    width: "100%",
                    paddingRight: "28px",
                    paddingLeft: "10px",
                    cursor: "pointer",
                    fontSize: "14px",
                    borderColor: fieldErrors.phone ? "rgba(239,68,68,0.6)" : "rgba(255,255,255,0.12)",
                  }}
                  onFocus={(e) => { (e.target as HTMLSelectElement).style.borderColor = "#1D9E75"; }}
                  onBlur={(e) => { (e.target as HTMLSelectElement).style.borderColor = fieldErrors.phone ? "rgba(239,68,68,0.6)" : "rgba(255,255,255,0.12)"; }}
                >
                  {COUNTRY_CODES.map((c, i) => (
                    <option
                      key={`${c.code}-${i}`}
                      value={c.code}
                      style={{ background: "#0A2540", color: "#FFFFFF" }}
                    >
                      {c.flag} {c.code}
                    </option>
                  ))}
                </select>
                <span style={{
                  position: "absolute", right: "8px", top: "50%",
                  transform: "translateY(-50%)",
                  color: "rgba(255,255,255,0.4)", pointerEvents: "none", fontSize: "11px",
                }}>▾</span>
              </div>

              {/* Local number — remaining ~70% */}
              <input
                type="tel"
                autoComplete="tel-national"
                placeholder={
                  countryCode === "+52" ? "Ej. 55 1234 5678" :
                  countryCode === "+1"  ? "Ej. 555 123 4567" :
                  "10 dígitos locales"
                }
                value={localNumber}
                onChange={(e) => {
                  setLocalNumber(e.target.value);
                  setFieldError("phone", "");
                }}
                required
                inputMode="numeric"
                style={{
                  ...inputStyle,
                  flex: 1,
                  borderColor: fieldErrors.phone ? "rgba(239,68,68,0.6)" : "rgba(255,255,255,0.12)",
                }}
                onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = "#1D9E75"; }}
                onBlur={(e) => {
                  handlePhoneBlur();
                  if (!fieldErrors.phone) (e.target as HTMLInputElement).style.borderColor = "rgba(255,255,255,0.12)";
                }}
              />
            </div>
            {fieldErrors.phone
              ? <p style={fieldErrorStyle}>{fieldErrors.phone}</p>
              : <p style={{ margin: "4px 0 0", fontSize: "12px", color: "rgba(255,255,255,0.45)" }}>
                  Te enviaremos un mensaje de bienvenida de Paula, tu asistente de pagos.
                </p>
            }
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
            <p style={{ margin: "5px 0 0", fontSize: "11px", color: "rgba(255,255,255,0.38)", lineHeight: 1.4 }}>
              🔒 Tu rescate digital — recupéralo si cambias de número o pierdes tu teléfono.
            </p>
          </div>

          {/* City */}
          <div>
            <label style={labelStyle}>Ciudad</label>
            <div style={{ position: "relative" }}>
              <select
                value={city}
                onChange={(e) => { setCity(e.target.value); setColonia(""); setFieldError("city", ""); setFieldError("colonia", ""); }}
                required
                style={{
                  ...inputStyle,
                  color: city ? "#FFFFFF" : "rgba(255,255,255,0.35)",
                  cursor: "pointer",
                  paddingRight: "40px",
                  borderColor: fieldErrors.city ? "rgba(239,68,68,0.6)" : "rgba(255,255,255,0.12)",
                }}
                onFocus={(e) => { (e.target as HTMLSelectElement).style.borderColor = "#1D9E75"; }}
                onBlur={(e) => {
                  handleCityBlur();
                  if (!fieldErrors.city) (e.target as HTMLSelectElement).style.borderColor = "rgba(255,255,255,0.12)";
                }}
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
            {fieldErrors.city && <p style={fieldErrorStyle}>{fieldErrors.city}</p>}
          </div>

          {/* Colonia */}
          <div>
            <label style={labelStyle}>Tu colonia</label>
            <div style={{ position: "relative" }}>
              <select
                value={colonia}
                onChange={(e) => { setColonia(e.target.value); setFieldError("colonia", ""); }}
                required
                style={{
                  ...inputStyle,
                  color: colonia ? "#FFFFFF" : "rgba(255,255,255,0.35)",
                  cursor: "pointer",
                  paddingRight: "40px",
                  borderColor: fieldErrors.colonia ? "rgba(239,68,68,0.6)" : "rgba(255,255,255,0.12)",
                }}
                onFocus={(e) => { (e.target as HTMLSelectElement).style.borderColor = "#1D9E75"; }}
                onBlur={(e) => {
                  handleColoniaBlur();
                  if (!fieldErrors.colonia) (e.target as HTMLSelectElement).style.borderColor = "rgba(255,255,255,0.12)";
                }}
              >
                <option value="" disabled style={{ background: "#0A2540", color: "rgba(255,255,255,0.4)" }}>
                  Selecciona tu colonia
                </option>
                {coloniasForCity(city).map((c) => (
                  <option key={c} value={c} style={{ background: "#0A2540", color: "#FFFFFF" }}>{c}</option>
                ))}
              </select>
              <span style={{
                position: "absolute", right: "14px", top: "50%",
                transform: "translateY(-50%)",
                color: "rgba(255,255,255,0.4)", pointerEvents: "none", fontSize: "12px",
              }}>▾</span>
            </div>
            {fieldErrors.colonia && <p style={fieldErrorStyle}>{fieldErrors.colonia}</p>}
          </div>

          {/* API error box */}
          {formError && <div style={apiErrorBoxStyle}>{formError}</div>}

          {/* WhatsApp opt-in consent */}
          <label style={{
            display: "flex", alignItems: "flex-start", gap: "10px",
            cursor: "pointer", marginTop: "4px",
          }}>
            <input
              type="checkbox"
              checked={whatsappConsent}
              onChange={e => setWhatsappConsent(e.target.checked)}
              style={{
                marginTop: "3px", accentColor: "#00e5b4",
                width: "16px", height: "16px", flexShrink: 0, cursor: "pointer",
              }}
            />
            <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.7)", lineHeight: 1.5 }}>
              Acepto recibir mensajes de WhatsApp de PagoYa para confirmaciones de pago y notificaciones de mi cuenta.
            </span>
          </label>

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
            {submitting ? "Registrando…" : "Crear mi cuenta gratis + $150 MXN"}
          </button>
        </form>

        <p style={{
          marginTop: "20px",
          fontSize: "12px",
          color: "rgba(255,255,255,0.45)",
          textAlign: "center",
          lineHeight: 1.6,
          fontWeight: 600,
        }}>
          🔒 Tus datos viajan cifrados y nunca se venden.
        </p>
        <p style={{
          marginTop: "6px",
          fontSize: "11px",
          color: "rgba(255,255,255,0.22)",
          textAlign: "center",
          lineHeight: 1.5,
        }}>
          Al registrarte aceptas que tu actividad en la plataforma sea usada para calcular tu Predictive Trust Index (perfil conductual de confianza financiera). · By registering you consent to behavioral scoring for your Trust Index.
        </p>
      </div>
    </div>
  );
}
