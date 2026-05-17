import { useState, useRef, type KeyboardEvent } from "react";

interface AutofillResult {
  biller_id: string;
  biller_name: string;
  amount: number | null;
  reference: string | null;
  language: string;
  confidence: "high" | "medium" | "low";
  clarification_needed: string | null;
  prefilled_from_history: boolean;
}

interface AutofillInputProps {
  phone?: string;
  onAutofill: (result: AutofillResult) => void;
  language?: "es" | "en";
  dark?: boolean;
}

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

export default function AutofillInput({ phone, onAutofill, language = "es", dark = false }: AutofillInputProps) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [clarification, setClarification] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const placeholder =
    language === "en"
      ? "What do you want to pay? E.g. 'CFE 350 pesos'"
      : "¿Qué quieres pagar? Ej: 'CFE 350 pesos'";

  async function handleSubmit() {
    const trimmed = text.trim();
    if (!trimmed || trimmed.length < 3) return;

    setLoading(true);
    setClarification(null);
    setWarning(null);
    setError(null);

    try {
      const res = await fetch(`${BASE_URL}/api/autofill`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed, phone }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? (language === "en" ? "Something went wrong." : "Algo salió mal."));
        return;
      }

      const result = data as AutofillResult;

      if (result.clarification_needed) {
        setClarification(result.clarification_needed);
      }

      if (result.confidence === "low") {
        setWarning(
          language === "en"
            ? "⚠️ Please verify the details before paying."
            : "⚠️ Verifica los datos antes de pagar.",
        );
      }

      onAutofill(result);
    } catch {
      setError(
        language === "en"
          ? "Could not connect. Please try again."
          : "No se pudo conectar. Inténtalo de nuevo.",
      );
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") handleSubmit();
  }

  return (
    <div style={{ width: "100%", marginBottom: "1rem" }}>
      {/* Input row
          LIGHT: border #d1d5db, bg #fff, text #111
          DARK:  border rgba(255,255,255,0.2), bg #0F2F50, text #FFFFFF
      */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          border: `1.5px solid ${dark ? "rgba(255,255,255,0.2)" : "#d1d5db"}`,
          borderRadius: "12px",
          overflow: "hidden",
          background: dark ? "#0F2F50" : "#fff",
          boxShadow: dark ? "none" : "0 1px 4px rgba(0,0,0,0.06)",
          transition: "border-color 0.2s",
        }}
      >
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKey}
          placeholder={placeholder}
          disabled={loading}
          style={{
            flex: 1,
            border: "none",
            outline: "none",
            padding: "11px 14px",
            fontSize: "14px",
            fontFamily: "inherit",
            color: dark ? "#FFFFFF" : "#111",
            background: "transparent",
            // Placeholder color handled via CSS class below
          }}
          className={dark ? "pg-dark-input-field" : ""}
        />

        {/* Mic icon (UI only) */}
        <button
          type="button"
          aria-label="Micrófono"
          disabled={loading}
          style={{
            background: "none",
            border: "none",
            padding: "0 12px",
            cursor: "pointer",
            color: "#9ca3af",
            display: "flex",
            alignItems: "center",
          }}
        >
          <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 1a4 4 0 0 1 4 4v7a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4zm-1 17.93V21H9v2h6v-2h-2v-2.07A8 8 0 0 0 20 12h-2a6 6 0 0 1-12 0H4a8 8 0 0 0 7 7.93z" />
          </svg>
        </button>

        {/* Submit button */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading || text.trim().length < 3}
          style={{
            background: loading || text.trim().length < 3 ? "#e5e7eb" : "#10b981",
            color: loading || text.trim().length < 3 ? "#9ca3af" : "#fff",
            border: "none",
            borderRadius: "0 10px 10px 0",
            padding: "14px 18px",
            cursor: loading || text.trim().length < 3 ? "not-allowed" : "pointer",
            fontSize: "14px",
            fontWeight: 600,
            transition: "background 0.2s",
            whiteSpace: "nowrap",
          }}
        >
          {loading ? (
            <span
              style={{
                display: "inline-block",
                width: "16px",
                height: "16px",
                border: "2px solid #9ca3af",
                borderTopColor: "#374151",
                borderRadius: "50%",
                animation: "spin 0.7s linear infinite",
              }}
            />
          ) : language === "en" ? (
            "Search"
          ) : (
            "Buscar"
          )}
        </button>
      </div>

      {/* Clarification hint */}
      {clarification && (
        <p
          style={{
            margin: "6px 4px 0",
            fontSize: "13px",
            color: "#6b7280",
            fontStyle: "italic",
          }}
        >
          💬 {clarification}
        </p>
      )}

      {/* Low confidence warning */}
      {warning && (
        <p
          style={{
            margin: "6px 4px 0",
            fontSize: "13px",
            color: "#b45309",
            background: "#fef9c3",
            borderRadius: "6px",
            padding: "6px 10px",
          }}
        >
          {warning}
        </p>
      )}

      {/* Error */}
      {error && (
        <p
          style={{
            margin: "6px 4px 0",
            fontSize: "13px",
            color: "#dc2626",
          }}
        >
          {error}
        </p>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .pg-dark-input-field::placeholder { color: #64748B; }
        .pg-dark-input-field:focus { outline: none; }
      `}</style>
    </div>
  );
}
