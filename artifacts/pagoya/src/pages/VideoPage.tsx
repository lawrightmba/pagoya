export default function VideoPage() {
  const src = import.meta.env.VITE_VIDEO_URL || "/pagoya-demo-video/";

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000", zIndex: 9999 }}>
      <iframe
        src={src}
        style={{ width: "100%", height: "100%", border: "none" }}
        title="PagoYa — Demo Video"
        allowFullScreen
      />
    </div>
  );
}
