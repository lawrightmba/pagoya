import { useState } from "react";
import { Helmet } from "react-helmet-async";
import PagoYaLogo from "@/components/PagoYaLogo";

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

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

type FormState = "idle" | "submitting" | "success" | "error";

export default function Register() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [colonia, setColonia] = useState("");
  const [formState, setFormState] = useState<FormState>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !city || !colonia) return;
    setFormState("submitting");
    setErrorMsg("");
    try {
      const res = await fetch(`${BASE_URL}/api/street-team/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim(), city, colonia }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error ?? "Error al registrarse.");
        setFormState("error");
        return;
      }
      setFormState("success");
    } catch {
      setErrorMsg("No se pudo conectar. Intenta de nuevo.");
      setFormState("error");
    }
  };

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

  return (
    <div style={{
      minHeight: "100dvh",
      background: "#0A2540",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "32px 20px 48px",
      boxSizing: "border-box",
    }}>
      <Helmet>
        <title>Crear cuenta gratis | PagoYa</title>
        <meta name="description" content="Regístrate gratis en PagoYa y empieza a pagar todos tus servicios desde tu celular. Sin banco, sin filas, sin complicaciones." />
        <meta name="keywords" content="registrarse PagoYa, crear cuenta pagos, app pagos sin banco México" />
        <link rel="canonical" href="https://pagoya.mx/register" />
      </Helmet>
      {/* Logo */}
      <div style={{ marginBottom: "32px", display: "flex", justifyContent: "center" }}>
        <PagoYaLogo style={{ height: "44px", width: "auto" }} />
      </div>

      {formState === "success" ? (
        <div style={{
          width: "100%", maxWidth: "400px",
          background: "rgba(29,158,117,0.12)",
          border: "1.5px solid rgba(29,158,117,0.4)",
          borderRadius: "20px",
          padding: "36px 28px",
          textAlign: "center",
        }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>✅</div>
          <h2 style={{
            fontSize: "22px", fontWeight: 900, color: "#FFFFFF",
            margin: "0 0 10px", lineHeight: 1.25,
          }}>
            ¡Listo! Ya estás registrado.
          </h2>
          <p style={{
            fontSize: "15px", color: "rgba(255,255,255,0.65)",
            lineHeight: 1.55, margin: "0 0 6px",
          }}>
            You're in! We'll reach out on WhatsApp soon.
          </p>
          <p style={{
            fontSize: "13px", color: "rgba(255,255,255,0.38)",
            margin: 0,
          }}>
            Te contactaremos pronto por WhatsApp.
          </p>
        </div>
      ) : (
        <div style={{ width: "100%", maxWidth: "400px" }}>
          {/* Headline */}
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

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {/* Name */}
            <div>
              <label style={{
                display: "block", fontSize: "12px", fontWeight: 600,
                color: "rgba(255,255,255,0.5)", letterSpacing: "0.05em",
                textTransform: "uppercase", marginBottom: "6px",
              }}>
                Nombre / Name
              </label>
              <input
                type="text"
                autoComplete="name"
                placeholder="Tu nombre completo"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                style={inputStyle}
                onFocus={(e) => {
                  (e.target as HTMLInputElement).style.borderColor = "#1D9E75";
                }}
                onBlur={(e) => {
                  (e.target as HTMLInputElement).style.borderColor = "rgba(255,255,255,0.12)";
                }}
              />
            </div>

            {/* Phone */}
            <div>
              <label style={{
                display: "block", fontSize: "12px", fontWeight: 600,
                color: "rgba(255,255,255,0.5)", letterSpacing: "0.05em",
                textTransform: "uppercase", marginBottom: "6px",
              }}>
                WhatsApp
              </label>
              <input
                type="tel"
                autoComplete="tel"
                placeholder="+52 322 000 0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                inputMode="tel"
                style={inputStyle}
                onFocus={(e) => {
                  (e.target as HTMLInputElement).style.borderColor = "#1D9E75";
                }}
                onBlur={(e) => {
                  (e.target as HTMLInputElement).style.borderColor = "rgba(255,255,255,0.12)";
                }}
              />
            </div>

            {/* City */}
            <div>
              <label style={{
                display: "block", fontSize: "12px", fontWeight: 600,
                color: "rgba(255,255,255,0.5)", letterSpacing: "0.05em",
                textTransform: "uppercase", marginBottom: "6px",
              }}>
                Ciudad / City
              </label>
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
                  onFocus={(e) => {
                    (e.target as HTMLSelectElement).style.borderColor = "#1D9E75";
                  }}
                  onBlur={(e) => {
                    (e.target as HTMLSelectElement).style.borderColor = "rgba(255,255,255,0.12)";
                  }}
                >
                  <option value="" disabled style={{ background: "#0A2540", color: "rgba(255,255,255,0.4)" }}>
                    Selecciona tu ciudad
                  </option>
                  {CITIES.map((c) => (
                    <option key={c} value={c} style={{ background: "#0A2540", color: "#FFFFFF" }}>
                      {c}
                    </option>
                  ))}
                </select>
                <span style={{
                  position: "absolute", right: "14px", top: "50%",
                  transform: "translateY(-50%)",
                  color: "rgba(255,255,255,0.4)", pointerEvents: "none",
                  fontSize: "12px",
                }}>▾</span>
              </div>
            </div>

            {/* Colonia */}
            <div>
              <label style={{
                display: "block", fontSize: "12px", fontWeight: 600,
                color: "rgba(255,255,255,0.5)", letterSpacing: "0.05em",
                textTransform: "uppercase", marginBottom: "6px",
              }}>
                ¿En qué colonia vives? / Your neighborhood
              </label>
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
                  onFocus={(e) => {
                    (e.target as HTMLSelectElement).style.borderColor = "#1D9E75";
                  }}
                  onBlur={(e) => {
                    (e.target as HTMLSelectElement).style.borderColor = "rgba(255,255,255,0.12)";
                  }}
                >
                  <option value="" disabled style={{ background: "#0A2540", color: "rgba(255,255,255,0.4)" }}>
                    Selecciona tu colonia
                  </option>
                  {COLONIAS.map((c) => (
                    <option key={c} value={c} style={{ background: "#0A2540", color: "#FFFFFF" }}>
                      {c}
                    </option>
                  ))}
                </select>
                <span style={{
                  position: "absolute", right: "14px", top: "50%",
                  transform: "translateY(-50%)",
                  color: "rgba(255,255,255,0.4)", pointerEvents: "none",
                  fontSize: "12px",
                }}>▾</span>
              </div>
            </div>

            {/* Error */}
            {formState === "error" && (
              <p style={{
                margin: 0, fontSize: "13px", color: "#F87171",
                textAlign: "center", lineHeight: 1.4,
              }}>
                {errorMsg}
              </p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={formState === "submitting"}
              style={{
                marginTop: "8px",
                width: "100%",
                padding: "16px",
                fontSize: "16px",
                fontWeight: 800,
                background: formState === "submitting"
                  ? "rgba(29,158,117,0.5)"
                  : "#1D9E75",
                color: "#FFFFFF",
                border: "none",
                borderRadius: "14px",
                cursor: formState === "submitting" ? "not-allowed" : "pointer",
                letterSpacing: "-0.01em",
                boxShadow: "0 4px 20px rgba(29,158,117,0.35)",
                transition: "background 0.15s, transform 0.1s",
                fontFamily: "inherit",
                WebkitAppearance: "none",
              }}
              onMouseDown={(e) => {
                if (formState !== "submitting")
                  (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.98)";
              }}
              onMouseUp={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = "";
              }}
              onTouchStart={(e) => {
                if (formState !== "submitting")
                  (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.98)";
              }}
              onTouchEnd={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = "";
              }}
            >
              {formState === "submitting"
                ? "Registrando…"
                : "Registrarme / Sign Me Up"}
            </button>
          </form>

          {/* Footer note */}
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
      )}
    </div>
  );
}
