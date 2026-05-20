export default function Deck() {
  const src = import.meta.env.VITE_DECK_URL || "/pagoya-pitch-deck/";

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000", zIndex: 9999 }}>
      <iframe
        src={src}
        style={{ width: "100%", height: "100%", border: "none" }}
        title="PagoYa — Pitch Deck"
        allowFullScreen
      />
    </div>
  );
}
