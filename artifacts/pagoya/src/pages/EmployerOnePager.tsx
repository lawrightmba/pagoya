import { useState } from "react";
import { Helmet } from "react-helmet-async";

const copy = {
  en: {
    meta: {
      title: "PagoYa for Employers — Free Financial Wellness Benefit | PagoYa",
      description: "Offer PagoYa as a zero-cost employee benefit. Workers pay bills, send money, and build a financial track record — all over WhatsApp, no bank required.",
    },
    topBadge: "Employee Benefit · No cost to your business",
    headline: "Financial Wellness for Your Workforce",
    subheadline: "A zero-cost employee benefit — activated over WhatsApp in minutes.",
    badges: ["💳 Free to join", "📱 Works on WhatsApp", "🏦 No bank required"],
    whatTitle: "What is PagoYa?",
    whatBody: "PagoYa is a WhatsApp-native financial platform built for working adults in Mexico who are unbanked or underbanked. Employees pay bills, send money, and build a verified financial track record — all from their phone, with no bank account required. Every transaction builds a PagoYa Trust Index (PTI) score — a real-time measure of financial reliability that employees can use to access better financial products over time.",
    whyTitle: "Why Offer PagoYa as an Employee Benefit?",
    whyEmpTitle: "For Your Employees",
    whyEmpBullets: [
      "$150 MXN welcome bonus on signup",
      "Pay CFE, Telcel, Izzi & 200+ billers from WhatsApp",
      "Send money to family — instantly, safely",
      "Build a verified credit history — no bank needed",
      "5-module financial literacy curriculum (in-app)",
    ],
    whyBizTitle: "For Your Business",
    whyBizBullets: [
      "Zero cost — no fees, no contracts, no IT setup",
      "Differentiated benefit that improves retention",
      "Reduce financial stress — a top driver of absenteeism",
      "Demonstrate real CSR commitment to your team",
      "Co-branded rollout materials provided by PagoYa",
    ],
    howTitle: "How It Works for Employees",
    howSteps: [
      'Employee sends "HOLA" to the PagoYa WhatsApp number',
      "Completes a simple registration in under 3 minutes",
      "Receives $150 MXN welcome bonus immediately — no deposit required",
      "Pays bills, sends money, and builds their PTI Trust Score with every transaction",
      "Unlocks financial literacy modules and credit partner access as their score grows",
    ],
    encourageTitle: "How to Encourage Your Team to Sign Up",
    encourageBody: "PagoYa provides everything your HR team needs for a successful rollout — at no cost to you:",
    encourageBullets: [
      "Share the PagoYa WhatsApp number at your next team meeting or via your HR channel",
      "Post the PagoYa QR code in break rooms, near time clocks, or in employee WhatsApp groups",
      'Include a short mention in your onboarding packet: "We offer PagoYa as a free financial wellness benefit"',
      "For hospitality teams: mention it alongside your IMSS and tips information during orientation",
      "We can provide a co-branded flyer in Spanish with your company name — just ask",
    ],
    ptiTitle: "The PagoYa Trust Index (PTI) — Building Financial Futures",
    ptiBody: "Every action on PagoYa builds an employee's PTI score — a transparent, 100-point financial health index across four dimensions:",
    ptiDimensions: [
      { emoji: "📈", label: "Trajectory", pts: "30 pts", desc: "Consistency & payment growth over time" },
      { emoji: "💰", label: "Financial", pts: "25 pts", desc: "Bill diversity & spend habits" },
      { emoji: "🔄", label: "Routine", pts: "25 pts", desc: "Streak & frequency of transactions" },
      { emoji: "🤝", label: "Social", pts: "20 pts", desc: "Referrals & community engagement" },
    ],
    ptiCta: "Employees with a PTI ≥ 80 are matched with vetted credit partners — a real pathway to formal financial inclusion.",
    ctaTitle: "Ready to offer PagoYa to your team?",
    ctaBody: "Contact us to get your team set up — it takes minutes and costs nothing.",
    ctaBtn: "Visit pagoyamx.com",
    ctaWhatsapp: "Available on-platform",
  },
  es: {
    meta: {
      title: "PagoYa para Empresas — Beneficio Gratuito de Bienestar Financiero",
      description: "Ofrece PagoYa como beneficio gratuito para tus colaboradores. Pagan servicios, envían dinero y construyen historial financiero — todo por WhatsApp, sin banco.",
    },
    topBadge: "Beneficio para Colaboradores · Sin costo para tu empresa",
    headline: "Bienestar Financiero para tu Equipo",
    subheadline: "Un beneficio gratuito para tus colaboradores — activado por WhatsApp en minutos.",
    badges: ["💳 Gratis registrarse", "📱 Funciona en WhatsApp", "🏦 Sin cuenta bancaria"],
    whatTitle: "¿Qué es PagoYa?",
    whatBody: "PagoYa es una plataforma financiera nativa de WhatsApp diseñada para adultos trabajadores en México que no tienen o no usan banco. Tus colaboradores pagan servicios, envían dinero y construyen un historial financiero verificado — todo desde su celular, sin necesidad de cuenta bancaria. Cada transacción construye su Índice de Confianza PagoYa (PTI) — una medida en tiempo real de su solidez financiera que les abre puertas a mejores productos con el tiempo.",
    whyTitle: "¿Por qué ofrecer PagoYa como beneficio?",
    whyEmpTitle: "Para tus colaboradores",
    whyEmpBullets: [
      "Bono de bienvenida de $150 MXN al registrarse",
      "Paga CFE, Telcel, Izzi y más de 200 servicios desde WhatsApp",
      "Envía dinero a familia al instante y con seguridad",
      "Construye historial crediticio verificado sin banco",
      "Currículo de educación financiera en 5 módulos (en la app)",
    ],
    whyBizTitle: "Para tu empresa",
    whyBizBullets: [
      "Sin costo — sin tarifas, contratos ni configuración de TI",
      "Beneficio diferenciado que mejora la retención de personal",
      "Reduce el estrés financiero — causa principal del ausentismo",
      "Demuestra compromiso real de RSE hacia tu equipo",
      "PagoYa proporciona materiales de lanzamiento con tu marca",
    ],
    howTitle: "Cómo funciona para los colaboradores",
    howSteps: [
      'El colaborador envía "HOLA" al número de WhatsApp de PagoYa',
      "Completa un registro sencillo en menos de 3 minutos",
      "Recibe $150 MXN de bono de bienvenida de inmediato — sin depósito previo",
      "Paga servicios, envía dinero y construye su Puntaje PTI con cada transacción",
      "Desbloquea módulos de educación financiera y acceso a socios crediticios al crecer su puntaje",
    ],
    encourageTitle: "Cómo invitar a tu equipo a registrarse",
    encourageBody: "PagoYa proporciona todo lo que tu equipo de RH necesita para un lanzamiento exitoso — sin costo alguno para ti:",
    encourageBullets: [
      "Comparte el número de WhatsApp de PagoYa en tu próxima reunión de equipo o por tu canal de RH",
      "Coloca el código QR de PagoYa en comedores, cerca del reloj checador o en grupos de WhatsApp del equipo",
      'Incluye una mención breve en tu paquete de bienvenida: "Ofrecemos PagoYa como beneficio gratuito de bienestar financiero"',
      "Para equipos de hospitalidad: menciónalo junto con la información de IMSS y propinas en la inducción",
      "Podemos proporcionar un volante con tu marca en español — solo solicítalo",
    ],
    ptiTitle: "El Índice de Confianza PagoYa (PTI)",
    ptiBody: "Cada acción en PagoYa construye el puntaje PTI del colaborador — un índice transparente de 100 puntos en cuatro dimensiones:",
    ptiDimensions: [
      { emoji: "📈", label: "Trayectoria", pts: "30 pts", desc: "Consistencia y crecimiento de pagos" },
      { emoji: "💰", label: "Financiero", pts: "25 pts", desc: "Diversidad de servicios y hábitos de gasto" },
      { emoji: "🔄", label: "Rutina", pts: "25 pts", desc: "Racha y frecuencia de transacciones" },
      { emoji: "🤝", label: "Social", pts: "20 pts", desc: "Referidos y participación comunitaria" },
    ],
    ptiCta: "Los colaboradores con PTI ≥ 80 son conectados con socios crediticios verificados — un camino real hacia la inclusión financiera formal.",
    ctaTitle: "¿Listo para ofrecer PagoYa a tu equipo?",
    ctaBody: "Contáctanos para configurar tu equipo — toma minutos y no cuesta nada.",
    ctaBtn: "Visita pagoyamx.com",
    ctaWhatsapp: "Disponible en la plataforma",
  },
};

const GREEN = "#1D9E75";
const DARK = "#0A2540";
const CARD = "rgba(255,255,255,0.05)";
const BORDER = "rgba(255,255,255,0.08)";
const TEXT = "#CBD5E1";
const TEXT_BRIGHT = "#E8F0F7";

export default function EmployerOnePager({ defaultLang = "en" }: { defaultLang?: "en" | "es" }) {
  const [lang, setLang] = useState<"en" | "es">(defaultLang);
  const t = copy[lang];

  const Section = ({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) => (
    <section style={{ maxWidth: 760, margin: "0 auto", padding: "0 20px 56px", ...style }}>
      {children}
    </section>
  );

  const H2 = ({ children }: { children: React.ReactNode }) => (
    <h2 style={{
      fontFamily: "'Space Mono', monospace",
      fontSize: "clamp(18px, 3vw, 24px)",
      color: GREEN,
      margin: "0 0 20px",
      fontWeight: 700,
      letterSpacing: "-0.5px",
    }}>
      {children}
    </h2>
  );

  const Card = ({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) => (
    <div style={{
      background: CARD,
      border: `1px solid ${BORDER}`,
      borderRadius: 12,
      padding: "20px 24px",
      ...style,
    }}>
      {children}
    </div>
  );

  const Bullet = ({ text, accent = false }: { text: string; accent?: boolean }) => (
    <li style={{
      color: accent ? TEXT_BRIGHT : TEXT,
      marginBottom: 10,
      lineHeight: 1.65,
      paddingLeft: 4,
    }}>
      {text}
    </li>
  );

  return (
    <div style={{ background: DARK, minHeight: "100vh", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", overflowX: "hidden" }}>
      <Helmet>
        <title>{t.meta.title}</title>
        <meta name="description" content={t.meta.description} />
        <meta name="robots" content="index, follow" />
      </Helmet>

      {/* ── LANG TOGGLE + NAV ── */}
      <header style={{ borderBottom: `1px solid ${BORDER}`, padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", maxWidth: 760, margin: "0 auto" }}>
        <span style={{ fontFamily: "'Space Mono', monospace", fontWeight: 700, color: GREEN, fontSize: 18, letterSpacing: "-0.5px" }}>
          PagoYa
        </span>
        <div style={{ display: "flex", gap: 6, background: "rgba(255,255,255,0.06)", borderRadius: 8, padding: 3 }}>
          {(["en", "es"] as const).map(l => (
            <button
              key={l}
              onClick={() => setLang(l)}
              style={{
                background: lang === l ? GREEN : "transparent",
                color: lang === l ? "#fff" : TEXT,
                border: "none",
                borderRadius: 6,
                padding: "5px 14px",
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
                fontFamily: "'Space Mono', monospace",
                transition: "background 0.15s",
              }}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </header>

      {/* ── HERO ── */}
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "48px 20px 40px" }}>
        <div style={{
          display: "inline-block",
          background: "rgba(29,158,117,0.12)",
          border: `1px solid rgba(29,158,117,0.3)`,
          borderRadius: 20,
          padding: "4px 14px",
          fontSize: 12,
          color: GREEN,
          fontWeight: 700,
          letterSpacing: "0.5px",
          marginBottom: 20,
          fontFamily: "'Space Mono', monospace",
          textTransform: "uppercase",
        }}>
          {t.topBadge}
        </div>

        <h1 style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: "clamp(26px, 5vw, 40px)",
          color: TEXT_BRIGHT,
          margin: "0 0 16px",
          fontWeight: 700,
          lineHeight: 1.2,
          letterSpacing: "-1px",
        }}>
          {t.headline}
        </h1>

        <p style={{ color: TEXT, fontSize: "clamp(15px, 2.5vw, 18px)", margin: "0 0 28px", lineHeight: 1.6 }}>
          {t.subheadline}
        </p>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {t.badges.map(b => (
            <span key={b} style={{
              background: "rgba(255,255,255,0.06)",
              border: `1px solid ${BORDER}`,
              borderRadius: 8,
              padding: "7px 14px",
              fontSize: 14,
              color: TEXT_BRIGHT,
              fontWeight: 600,
            }}>
              {b}
            </span>
          ))}
        </div>
      </div>

      {/* ── WHAT IS PAGOYA ── */}
      <Section>
        <H2>{t.whatTitle}</H2>
        <p style={{ color: TEXT, lineHeight: 1.75, fontSize: 15, margin: 0 }}>{t.whatBody}</p>
      </Section>

      {/* ── WHY ── */}
      <Section>
        <H2>{t.whyTitle}</H2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
          <Card>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 13, color: GREEN, fontWeight: 700, marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              {t.whyEmpTitle}
            </div>
            <ul style={{ margin: 0, padding: "0 0 0 18px" }}>
              {t.whyEmpBullets.map(b => <Bullet key={b} text={b} accent />)}
            </ul>
          </Card>
          <Card>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 13, color: GREEN, fontWeight: 700, marginBottom: 14, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              {t.whyBizTitle}
            </div>
            <ul style={{ margin: 0, padding: "0 0 0 18px" }}>
              {t.whyBizBullets.map(b => <Bullet key={b} text={b} />)}
            </ul>
          </Card>
        </div>
      </Section>

      {/* ── HOW IT WORKS ── */}
      <Section>
        <H2>{t.howTitle}</H2>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {t.howSteps.map((step, i) => (
            <div key={i} style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
              <div style={{
                width: 32, height: 32, borderRadius: "50%",
                background: `rgba(29,158,117,0.15)`,
                border: `1.5px solid rgba(29,158,117,0.4)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
                fontFamily: "'Space Mono', monospace",
                fontWeight: 700, color: GREEN, fontSize: 13,
              }}>
                {i + 1}
              </div>
              <p style={{ color: TEXT_BRIGHT, margin: "6px 0 0", lineHeight: 1.6, fontSize: 15 }}>{step}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ── ENCOURAGE ── */}
      <Section>
        <H2>{t.encourageTitle}</H2>
        <p style={{ color: TEXT, margin: "0 0 16px", lineHeight: 1.6, fontSize: 15 }}>{t.encourageBody}</p>
        <Card>
          <ul style={{ margin: 0, padding: "0 0 0 18px" }}>
            {t.encourageBullets.map(b => <Bullet key={b} text={b} />)}
          </ul>
        </Card>
      </Section>

      {/* ── PTI ── */}
      <Section>
        <H2>{t.ptiTitle}</H2>
        <p style={{ color: TEXT, margin: "0 0 20px", lineHeight: 1.65, fontSize: 15 }}>{t.ptiBody}</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 20 }}>
          {t.ptiDimensions.map(d => (
            <Card key={d.label} style={{ textAlign: "center", padding: "20px 16px" }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>{d.emoji}</div>
              <div style={{ fontFamily: "'Space Mono', monospace", fontWeight: 700, color: TEXT_BRIGHT, fontSize: 15, marginBottom: 4 }}>{d.label}</div>
              <div style={{ color: GREEN, fontWeight: 700, fontSize: 13, fontFamily: "'Space Mono', monospace", marginBottom: 8 }}>{d.pts}</div>
              <div style={{ color: TEXT, fontSize: 12, lineHeight: 1.5 }}>{d.desc}</div>
            </Card>
          ))}
        </div>
        <div style={{
          background: "rgba(29,158,117,0.08)",
          border: `1px solid rgba(29,158,117,0.25)`,
          borderRadius: 10,
          padding: "14px 18px",
          color: TEXT_BRIGHT,
          fontSize: 14,
          lineHeight: 1.65,
        }}>
          {t.ptiCta}
        </div>
      </Section>

      {/* ── CTA ── */}
      <Section style={{ paddingBottom: 80 }}>
        <div style={{
          background: "linear-gradient(135deg, rgba(29,158,117,0.15) 0%, rgba(29,158,117,0.05) 100%)",
          border: `1px solid rgba(29,158,117,0.3)`,
          borderRadius: 16,
          padding: "36px 28px",
          textAlign: "center",
        }}>
          <h2 style={{ fontFamily: "'Space Mono', monospace", fontSize: "clamp(18px, 3vw, 22px)", color: TEXT_BRIGHT, margin: "0 0 10px", fontWeight: 700 }}>
            {t.ctaTitle}
          </h2>
          <p style={{ color: TEXT, margin: "0 0 24px", fontSize: 15, lineHeight: 1.6 }}>{t.ctaBody}</p>
          <a
            href="https://pagoyamx.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-block",
              background: GREEN,
              color: "#fff",
              fontFamily: "'Space Mono', monospace",
              fontWeight: 700,
              fontSize: 15,
              padding: "13px 28px",
              borderRadius: 10,
              textDecoration: "none",
              letterSpacing: "0.3px",
            }}
          >
            {t.ctaBtn}
          </a>
          <div style={{ marginTop: 14, color: "#64748B", fontSize: 13 }}>
            WhatsApp: {t.ctaWhatsapp}
          </div>
        </div>
      </Section>

      {/* ── FOOTER ── */}
      <div style={{ borderTop: `1px solid ${BORDER}`, padding: "20px", textAlign: "center" }}>
        <span style={{ fontFamily: "'Space Mono', monospace", color: "#475569", fontSize: 13 }}>
          PagoYa · pagoyamx.com
        </span>
      </div>
    </div>
  );
}
