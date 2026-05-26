interface PaulaHintProps {
  message: string;
  label: string;
  variant?: "light" | "dark";
}

export default function PaulaHint({ message, label, variant = "light" }: PaulaHintProps) {
  const fire = () => {
    window.dispatchEvent(
      new CustomEvent("pagoya:chatNudge", { detail: { message } })
    );
  };

  const isLight = variant === "light";

  return (
    <button
      type="button"
      onClick={fire}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "5px 12px",
        background: isLight ? "#F0FAF3" : "rgba(29,158,117,0.12)",
        border: `1px solid ${isLight ? "#D4EDDA" : "rgba(29,158,117,0.28)"}`,
        borderRadius: "999px",
        color: isLight ? "#046C2C" : "#1D9E75",
        fontSize: "12px",
        fontWeight: 600,
        cursor: "pointer",
        fontFamily: "inherit",
        minHeight: "32px",
        transition: "background 0.15s, transform 0.1s",
        letterSpacing: "0.01em",
        WebkitAppearance: "none",
      }}
    >
      <span style={{ fontSize: "14px" }}>🤖</span>
      {label}
    </button>
  );
}
