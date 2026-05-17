import { useState, useEffect, useRef, useCallback } from "react";

const BASE_URL = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
const STORAGE_KEY = "pagoya_chat_history";
const LANG_KEY = "pagoya_lang";
const TEL_KEY = "pagoya_telefono";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  escalated?: boolean;
}

const STRINGS = {
  es: {
    header: "PagoYa Soporte",
    placeholder: "Escribe tu mensaje...",
    greetingWithTel: "Hola, ¿en qué te puedo ayudar hoy?",
    greetingNoTel:
      "Hola, ¿en qué te puedo ayudar? Si tienes dudas sobre tu cuenta, dime tu número de teléfono.",
    escalationBanner: "Un agente humano te contactará pronto por WhatsApp.",
    newConversation: "Nueva conversación",
    errorMsg: "Lo sentimos, ocurrió un error. Intenta de nuevo.",
  },
  en: {
    header: "PagoYa Support",
    placeholder: "Type your message...",
    greetingWithTel: "Hi, how can I help you today?",
    greetingNoTel:
      "Hi, how can I help you? If you have questions about your account, tell me your phone number.",
    escalationBanner: "A human agent will contact you soon on WhatsApp.",
    newConversation: "New conversation",
    errorMsg: "Sorry, something went wrong. Please try again.",
  },
};

export default function SupportChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [telefono, setTelefono] = useState("");
  const [lang, setLang] = useState<"es" | "en">("es");
  const [initialized, setInitialized] = useState(false);
  const [greetingShown, setGreetingShown] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const s = STRINGS[lang];

  // ── Boot: load persisted state from localStorage ─────────────────────────────
  useEffect(() => {
    const tel = localStorage.getItem(TEL_KEY) ?? "";
    const l = (localStorage.getItem(LANG_KEY) as "es" | "en") ?? "es";
    const stored = localStorage.getItem(STORAGE_KEY);

    setTelefono(tel);
    setLang(l);

    if (stored) {
      try {
        const parsed = JSON.parse(stored) as ChatMessage[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
          setGreetingShown(true);
        }
      } catch {
        /* ignore malformed data */
      }
    }

    setInitialized(true);
  }, []);

  // ── Mobile breakpoint ─────────────────────────────────────────────────────────
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 480);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // ── Persist messages to localStorage ─────────────────────────────────────────
  useEffect(() => {
    if (initialized && messages.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    }
  }, [messages, initialized]);

  // ── Auto-scroll to bottom on new messages / typing ───────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // ── Show greeting on first open ───────────────────────────────────────────────
  useEffect(() => {
    if (open && initialized && !greetingShown) {
      const greeting: ChatMessage = {
        role: "assistant",
        content: telefono ? s.greetingWithTel : s.greetingNoTel,
        timestamp: Date.now(),
      };
      setMessages([greeting]);
      setGreetingShown(true);
    }
    if (open) {
      setHasUnread(false);
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [open, initialized]);

  // ── Clear conversation ────────────────────────────────────────────────────────
  const clearConversation = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setGreetingShown(false);
    const greeting: ChatMessage = {
      role: "assistant",
      content: telefono ? s.greetingWithTel : s.greetingNoTel,
      timestamp: Date.now(),
    };
    setMessages([greeting]);
    setGreetingShown(true);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [telefono, s]);

  // ── Send message ──────────────────────────────────────────────────────────────
  const sendMessage = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMsg: ChatMessage = { role: "user", content: trimmed, timestamp: Date.now() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    try {
      // History = all messages before the new user message, text-only
      const history = updatedMessages
        .slice(0, -1)
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch(`${BASE_URL}/api/agent/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          telefono: telefono || undefined,
          history,
        }),
      });

      const data = (await res.json()) as { reply: string; escalated: boolean };

      const assistantMsg: ChatMessage = {
        role: "assistant",
        content: data.reply,
        timestamp: Date.now(),
        escalated: data.escalated ?? false,
      };

      setMessages((prev) => [...prev, assistantMsg]);

      if (!open) {
        setHasUnread(true);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: s.errorMsg, timestamp: Date.now() },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, telefono, open, s, BASE_URL]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  };

  const formatTime = (ts: number) =>
    new Date(ts).toLocaleTimeString(lang === "es" ? "es-MX" : "en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });

  const panelRadius = isMobile ? 0 : 16;

  return (
    <>
      {/* ── Chat panel ─────────────────────────────────────────────────────── */}
      {open && (
        <div
          style={{
            position: "fixed",
            zIndex: 9998,
            display: "flex",
            flexDirection: "column",
            background: "white",
            boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
            overflow: "hidden",
            ...(isMobile
              ? { inset: 0, borderRadius: 0 }
              : {
                  bottom: 92,
                  right: 24,
                  width: 360,
                  height: 480,
                  borderRadius: panelRadius,
                }),
          }}
        >
          {/* Header */}
          <div
            style={{
              height: 52,
              background: "#0A2540",
              borderRadius: `${panelRadius}px ${panelRadius}px 0 0`,
              display: "flex",
              alignItems: "center",
              padding: "0 14px",
              flexShrink: 0,
              gap: 8,
            }}
          >
            <span
              style={{
                color: "white",
                fontSize: 14,
                fontWeight: 700,
                flex: 1,
                letterSpacing: "-0.01em",
              }}
            >
              {s.header}
            </span>
            <button
              onClick={clearConversation}
              style={{
                color: "rgba(255,255,255,0.5)",
                fontSize: 11,
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "4px 0",
                whiteSpace: "nowrap",
                fontFamily: "inherit",
              }}
            >
              {s.newConversation}
            </button>
            <button
              onClick={() => setOpen(false)}
              aria-label="Cerrar chat"
              style={{
                color: "rgba(255,255,255,0.8)",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 4,
                display: "flex",
                alignItems: "center",
                borderRadius: 6,
                flexShrink: 0,
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Message list */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "14px 12px",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            {messages.map((msg, idx) => (
              <div key={idx}>
                {/* Bubble */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                  }}
                >
                  <div
                    style={{
                      maxWidth: "80%",
                      padding: "9px 13px",
                      borderRadius:
                        msg.role === "user"
                          ? "12px 12px 0 12px"
                          : "12px 12px 12px 0",
                      background: msg.role === "user" ? "#046C2C" : "#F1F5F9",
                      color: msg.role === "user" ? "white" : "#1A202C",
                      fontSize: 14,
                      lineHeight: 1.55,
                      wordBreak: "break-word",
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {msg.content}
                  </div>
                </div>

                {/* Timestamp */}
                <div
                  style={{
                    fontSize: 11,
                    color: "#94A3B8",
                    marginTop: 3,
                    textAlign: msg.role === "user" ? "right" : "left",
                    paddingLeft: msg.role === "user" ? 0 : 4,
                    paddingRight: msg.role === "user" ? 4 : 0,
                  }}
                >
                  {formatTime(msg.timestamp)}
                </div>

                {/* Escalation banner */}
                {msg.escalated && (
                  <div
                    style={{
                      marginTop: 6,
                      padding: "7px 11px",
                      borderRadius: 8,
                      background: "#FEF3C7",
                      border: "1px solid #FDE68A",
                      color: "#92400E",
                      fontSize: 12,
                      lineHeight: 1.4,
                    }}
                  >
                    📞 {s.escalationBanner}
                  </div>
                )}
              </div>
            ))}

            {/* Typing indicator */}
            {loading && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-start",
                }}
              >
                <div
                  style={{
                    background: "#F1F5F9",
                    borderRadius: "12px 12px 12px 0",
                    padding: "10px 14px",
                    display: "flex",
                    gap: 5,
                    alignItems: "center",
                  }}
                >
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: "50%",
                        background: "#94A3B8",
                        display: "inline-block",
                        animation: `pgchat-bounce 1.2s ease-in-out ${i * 0.18}s infinite`,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input area */}
          <div
            style={{
              borderTop: "1px solid #E2E8F0",
              padding: "8px 10px",
              display: "flex",
              gap: 8,
              alignItems: "center",
              flexShrink: 0,
              height: 56,
            }}
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={s.placeholder}
              disabled={loading}
              style={{
                flex: 1,
                border: "1.5px solid #E2E8F0",
                borderRadius: 10,
                padding: "8px 12px",
                fontSize: 14,
                outline: "none",
                background: loading ? "#F9FAFB" : "white",
                color: "#1A202C",
                fontFamily: "inherit",
                transition: "border-color 0.15s",
              }}
            />
            <button
              onClick={() => void sendMessage()}
              disabled={loading || !input.trim()}
              aria-label="Enviar"
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                border: "none",
                background: loading || !input.trim() ? "#E2E8F0" : "#046C2C",
                color: loading || !input.trim() ? "#94A3B8" : "white",
                cursor: loading || !input.trim() ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                transition: "background 0.15s",
              }}
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* ── Floating button ──────────────────────────────────────────────────── */}
      <button
        onClick={() => {
          setOpen((prev) => {
            if (!prev) setHasUnread(false);
            return !prev;
          });
        }}
        aria-label={open ? "Cerrar chat" : "Abrir chat de soporte"}
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: "#046C2C",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 4px 18px rgba(4,108,44,0.38)",
          zIndex: 9999,
          transition: "transform 0.2s, box-shadow 0.2s",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.08)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
        }}
      >
        {open ? (
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        )}

        {/* Unread dot */}
        {hasUnread && !open && (
          <span
            style={{
              position: "absolute",
              top: 3,
              right: 3,
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: "#EF4444",
              border: "2px solid white",
            }}
          />
        )}
      </button>

      {/* Keyframes */}
      <style>{`
        @keyframes pgchat-bounce {
          0%, 80%, 100% { transform: scale(0.65); opacity: 0.45; }
          40%           { transform: scale(1);    opacity: 1; }
        }
      `}</style>
    </>
  );
}
