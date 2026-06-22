import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

const CATEGORIES = [
  { value: "pagos",  label: "Problema con un pago" },
  { value: "saldo",  label: "Saldo o carga de dinero" },
  { value: "bono",   label: "Bono de bienvenida" },
  { value: "cuenta", label: "Mi cuenta o acceso" },
  { value: "otro",   label: "Otra consulta" },
];

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  recibido:   { label: "Recibido",      color: "#F59E0B" },
  "en proceso": { label: "En proceso",  color: "#3B82F6" },
  resuelto:   { label: "Resuelto",      color: "#00C875" },
  cerrado:    { label: "Cerrado",       color: "#6B7280" },
};

interface Ticket {
  ticket_ref: string;
  category: string;
  status: string;
  complaint_text: string;
  admin_response: string | null;
  received_at: string;
  admin_responded_at: string | null;
}

export default function Atencion() {
  const [complaint, setComplaint] = useState("");
  const [phone, setPhone] = useState("");
  const [category, setCategory] = useState("otro");
  const [sending, setSending] = useState(false);
  const [ticketRef, setTicketRef] = useState<string | null>(null);
  const [error, setError] = useState("");

  const [myTickets, setMyTickets] = useState<Ticket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem("pagoya_telefono") ?? localStorage.getItem("pagoya_telefono");
    if (stored) setPhone(stored.replace(/\D/g, "").slice(-10));
  }, []);

  async function loadMyTickets(tel: string) {
    const clean = tel.replace(/\D/g, "").slice(-10);
    if (clean.length < 7) return;
    setLoadingTickets(true);
    try {
      const r = await fetch(`${BASE_URL}api/complaints/my/${clean}`);
      if (r.ok) {
        const data = await r.json();
        setMyTickets(data.tickets ?? []);
      }
    } catch { /* silent */ } finally {
      setLoadingTickets(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!complaint.trim()) return;
    setSending(true);
    setError("");
    try {
      const r = await fetch(`${BASE_URL}api/complaints`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: "web",
          telefono: phone.trim() || undefined,
          category,
          complaint_text: complaint.trim(),
        }),
      });
      if (!r.ok) throw new Error(`${r.status}`);
      const data = await r.json();
      setTicketRef(data.ticket_ref);
      if (phone.trim()) loadMyTickets(phone);
    } catch {
      setError("No pudimos enviar tu mensaje. Inténtalo de nuevo o escríbenos directamente por WhatsApp.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0B1E14", color: "#FFFFFF", fontFamily: "DM Sans, sans-serif" }}>
      <Helmet>
        <title>Atención al Cliente — PagoYa</title>
        <meta name="description" content="Centro de atención al cliente de PagoYa. Escríbenos por WhatsApp, email, o usa nuestro formulario." />
        <link rel="canonical" href="https://pagoyamx.com/atencion" />
      </Helmet>

      <div style={{ background: "#003D22", borderBottom: "1px solid rgba(255,255,255,0.07)", padding: "16px 20px", display: "flex", alignItems: "center", gap: "12px" }}>
        <a href="/" style={{ textDecoration: "none" }}>
          <span style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "20px", fontWeight: 900, color: "#00C875", letterSpacing: "0.04em" }}>PagoYa</span>
        </a>
      </div>

      <div style={{ maxWidth: "600px", margin: "0 auto", padding: "48px 24px 80px" }}>

        <p style={{ fontSize: "11px", fontWeight: 700, color: "#00C875", letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: "14px" }}>
          Soporte
        </p>
        <h1 style={{ fontFamily: "Barlow Condensed, sans-serif", fontSize: "clamp(32px, 7vw, 46px)", fontWeight: 900, lineHeight: 1.05, color: "#FFFFFF", marginBottom: "8px" }}>
          Atención al Cliente
        </h1>
        <p style={{ fontSize: "16px", color: "rgba(255,255,255,0.55)", marginBottom: "40px" }}>
          Estamos aquí para ayudarte. Respondemos en menos de 24 horas.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "40px" }}>
          <a
            href="https://wa.me/14343319311?text=Hola%20PagoYa%2C%20necesito%20ayuda%20con"
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", background: "linear-gradient(135deg,#007A4A,#00C875)", color: "#FFFFFF", fontWeight: 700, fontSize: "16px", padding: "16px 24px", borderRadius: "14px", textDecoration: "none" }}
          >
            💬 Escríbenos por WhatsApp
          </a>
          <a
            href="mailto:atencion@pagoyamx.com"
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", background: "transparent", color: "#00C875", fontWeight: 600, fontSize: "15px", padding: "15px 24px", borderRadius: "14px", textDecoration: "none", border: "1px solid rgba(0,200,117,0.35)" }}
          >
            ✉️ atencion@pagoyamx.com
          </a>
        </div>

        <div style={{ height: "1px", background: "rgba(255,255,255,0.07)", marginBottom: "40px" }} />

        {ticketRef ? (
          <div style={{ background: "rgba(0,200,117,0.08)", border: "1px solid rgba(0,200,117,0.25)", borderRadius: "16px", padding: "28px 24px" }}>
            <p style={{ fontSize: "28px", marginBottom: "12px" }}>✅</p>
            <p style={{ fontSize: "16px", fontWeight: 700, color: "#FFFFFF", marginBottom: "6px" }}>Mensaje recibido</p>
            <p style={{ fontSize: "13px", color: "#00C875", fontWeight: 700, marginBottom: "8px", letterSpacing: "0.05em" }}>
              Folio: {ticketRef}
            </p>
            <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.6)", lineHeight: 1.6, marginBottom: "16px" }}>
              Guarda este folio. Te responderemos en menos de 24 horas. Si tu asunto es urgente, escríbenos por WhatsApp.
            </p>
            {phone && (
              <button
                onClick={() => loadMyTickets(phone)}
                style={{ background: "transparent", border: "1px solid rgba(0,200,117,0.35)", color: "#00C875", fontWeight: 600, fontSize: "14px", padding: "10px 18px", borderRadius: "10px", cursor: "pointer" }}
              >
                Ver mis tickets
              </button>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <p style={{ fontSize: "13px", fontWeight: 700, color: "rgba(255,255,255,0.45)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "20px" }}>
              Abrir un ticket de soporte
            </p>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "13px", color: "rgba(255,255,255,0.5)", marginBottom: "6px" }}>
                Categoría
              </label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                style={{ width: "100%", background: "#0F2A1A", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "12px", padding: "12px 16px", color: "#FFFFFF", fontFamily: "DM Sans, sans-serif", fontSize: "15px", outline: "none", boxSizing: "border-box", appearance: "none" }}
              >
                {CATEGORIES.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "13px", color: "rgba(255,255,255,0.5)", marginBottom: "6px" }}>
                Describe tu problema o pregunta *
              </label>
              <textarea
                value={complaint}
                onChange={e => setComplaint(e.target.value)}
                placeholder="Ej: Mi pago de CFE no se confirmó pero me descontaron saldo…"
                rows={5}
                required
                style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "12px", padding: "14px 16px", color: "#FFFFFF", fontFamily: "DM Sans, sans-serif", fontSize: "15px", resize: "vertical", outline: "none", boxSizing: "border-box" }}
              />
            </div>

            <div style={{ marginBottom: "24px" }}>
              <label style={{ display: "block", fontSize: "13px", color: "rgba(255,255,255,0.5)", marginBottom: "6px" }}>
                Tu teléfono (para enviarte actualizaciones por WhatsApp)
              </label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                onBlur={() => phone && loadMyTickets(phone)}
                placeholder="322 123 4567"
                style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: "12px", padding: "12px 16px", color: "#FFFFFF", fontFamily: "DM Sans, sans-serif", fontSize: "15px", outline: "none", boxSizing: "border-box" }}
              />
            </div>

            {error && (
              <div style={{ background: "rgba(226,26,10,0.08)", border: "1px solid rgba(226,26,10,0.25)", borderRadius: "10px", padding: "12px 16px", marginBottom: "16px", fontSize: "14px", color: "#FF6B6B" }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={sending || !complaint.trim()}
              style={{ width: "100%", background: sending ? "rgba(0,200,117,0.4)" : "linear-gradient(135deg,#007A4A,#00C875)", color: "#FFFFFF", fontWeight: 700, fontSize: "16px", padding: "15px 24px", borderRadius: "14px", border: "none", cursor: sending ? "not-allowed" : "pointer" }}
            >
              {sending ? "Enviando…" : "Enviar ticket"}
            </button>
          </form>
        )}

        {myTickets.length > 0 && (
          <div style={{ marginTop: "40px" }}>
            <p style={{ fontSize: "13px", fontWeight: 700, color: "rgba(255,255,255,0.45)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "16px" }}>
              Mis tickets
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {myTickets.map(t => {
                const st = STATUS_LABEL[t.status] ?? { label: t.status, color: "#6B7280" };
                return (
                  <div key={t.ticket_ref} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "14px", padding: "16px 18px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                      <span style={{ fontSize: "13px", fontWeight: 700, color: "#00C875", letterSpacing: "0.05em" }}>{t.ticket_ref}</span>
                      <span style={{ fontSize: "11px", fontWeight: 700, color: st.color, background: `${st.color}18`, padding: "3px 10px", borderRadius: "20px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                        {st.label}
                      </span>
                    </div>
                    <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.45)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.07em" }}>
                      {CATEGORIES.find(c => c.value === t.category)?.label ?? t.category}
                    </p>
                    <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.7)", lineHeight: 1.5, marginBottom: t.admin_response ? "12px" : "0" }}>
                      {t.complaint_text.length > 120 ? t.complaint_text.slice(0, 120) + "…" : t.complaint_text}
                    </p>
                    {t.admin_response && (
                      <div style={{ background: "rgba(0,200,117,0.07)", border: "1px solid rgba(0,200,117,0.2)", borderRadius: "10px", padding: "10px 14px", marginTop: "10px" }}>
                        <p style={{ fontSize: "11px", fontWeight: 700, color: "#00C875", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>Respuesta de PagoYa</p>
                        <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.8)", lineHeight: 1.5, margin: 0 }}>{t.admin_response}</p>
                      </div>
                    )}
                    <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.25)", marginTop: "10px", marginBottom: 0 }}>
                      {new Date(t.received_at).toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {loadingTickets && (
          <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.35)", marginTop: "24px" }}>Cargando tickets…</p>
        )}

        <div style={{ marginTop: "40px", padding: "16px", background: "rgba(255,255,255,0.03)", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.06)" }}>
          <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.35)", lineHeight: 1.6, margin: 0 }}>
            Si no recibes respuesta en 24 horas, puedes escalar tu queja ante la{" "}
            <strong style={{ color: "rgba(255,255,255,0.55)" }}>CONDUSEF</strong> en{" "}
            <a href="https://condusef.gob.mx" target="_blank" rel="noopener noreferrer" style={{ color: "#00C875", textDecoration: "none" }}>condusef.gob.mx</a>
            {" "}o al teléfono <strong style={{ color: "rgba(255,255,255,0.55)" }}>800-999-8080</strong>.
          </p>
        </div>

        <div style={{ marginTop: "40px", textAlign: "center" }}>
          <a href="/" style={{ fontSize: "13px", color: "#00C875", textDecoration: "none", opacity: 0.7 }}>← Volver a PagoYa</a>
        </div>
      </div>
    </div>
  );
}
