import { Helmet } from "react-helmet-async";

const S = {
  page: { minHeight: "100vh", background: "#004F2D", color: "#FFFFFF", fontFamily: "DM Sans, sans-serif" } as React.CSSProperties,
  topBar: { background: "#003D22", borderBottom: "1px solid rgba(255,255,255,0.07)", padding: "16px 20px", display: "flex", alignItems: "center", gap: "12px" } as React.CSSProperties,
  logo: { fontFamily: "Barlow Condensed, sans-serif", fontSize: "20px", fontWeight: 900, color: "#00C875", letterSpacing: "0.04em" } as React.CSSProperties,
  wrap: { maxWidth: "720px", margin: "0 auto", padding: "48px 24px 80px" } as React.CSSProperties,
  eyebrow: { fontSize: "11px", fontWeight: 700, color: "#00C875", letterSpacing: "0.14em", textTransform: "uppercase" as const, marginBottom: "14px" },
  h1: { fontFamily: "Barlow Condensed, sans-serif", fontSize: "clamp(36px, 8vw, 52px)", fontWeight: 900, lineHeight: 1.05, color: "#FFFFFF", marginBottom: "8px" } as React.CSSProperties,
  subtitle: { fontFamily: "Barlow Condensed, sans-serif", fontSize: "clamp(16px, 4vw, 22px)", fontWeight: 700, color: "rgba(255,255,255,0.5)", marginBottom: "40px", letterSpacing: "0.01em" } as React.CSSProperties,
  sectionTitle: { fontFamily: "Barlow Condensed, sans-serif", fontSize: "20px", fontWeight: 800, color: "#FFFFFF", marginBottom: "6px", letterSpacing: "0.01em" } as React.CSSProperties,
  sectionNum: { fontFamily: "Barlow Condensed, sans-serif", fontSize: "12px", fontWeight: 700, color: "rgba(0,200,117,0.6)", letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: "6px" },
  card: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", padding: "24px", marginBottom: "16px" } as React.CSSProperties,
  body: { fontSize: "14px", lineHeight: 1.75, color: "rgba(255,255,255,0.72)" } as React.CSSProperties,
  row: { display: "flex", gap: "12px", fontSize: "13px" } as React.CSSProperties,
  label: { color: "rgba(255,255,255,0.35)", minWidth: "140px", flexShrink: 0 } as React.CSSProperties,
  val: { color: "rgba(255,255,255,0.65)", lineHeight: 1.5 } as React.CSSProperties,
  divider: { height: "1px", background: "rgba(255,255,255,0.07)", margin: "40px 0" } as React.CSSProperties,
  badge: { display: "inline-block", background: "rgba(0,200,117,0.1)", border: "1px solid rgba(0,200,117,0.25)", borderRadius: "6px", padding: "3px 10px", fontSize: "11px", fontWeight: 700, color: "#00C875", letterSpacing: "0.07em", textTransform: "uppercase" as const, marginBottom: "10px" },
};

export default function Cumplimiento() {
  return (
    <div style={S.page}>
      <Helmet>
        <title>Política de Cumplimiento — PagoYa Technologies</title>
        <meta name="description" content="Política de cumplimiento regulatorio de PagoYa: KYC, AML, retención de registros, protección al consumidor e inclusión financiera bajo la Ley Fintech 2018." />
        <link rel="canonical" href="https://pagoyamx.com/cumplimiento" />
      </Helmet>

      <div style={S.topBar}>
        <a href="/" style={{ textDecoration: "none" }}>
          <span style={S.logo}>PagoYa</span>
        </a>
      </div>

      <div style={S.wrap}>
        <p style={S.eyebrow}>Cumplimiento Regulatorio</p>
        <h1 style={S.h1}>Política de Cumplimiento</h1>
        <p style={S.subtitle}>PagoYa Technologies S.A.P.I. de C.V. — Versión 1.0 · Junio 2025</p>

        {/* Intro */}
        <div style={{ background: "rgba(0,200,117,0.06)", border: "1px solid rgba(0,200,117,0.18)", borderRadius: "16px", padding: "24px", marginBottom: "40px" }}>
          <p style={S.body}>
            PagoYa opera en el marco de la <strong style={{ color: "#FFFFFF" }}>Ley para Regular las Instituciones de Tecnología Financiera (Ley Fintech, 2018)</strong> y las disposiciones emitidas por la CNBV y la SHCP en materia de prevención de operaciones con recursos de procedencia ilícita (PIORPI). Esta política describe nuestros compromisos de cumplimiento para socios institucionales, reguladores e inversores.
          </p>
        </div>

        {/* Section 1 — KYC */}
        <div style={S.card}>
          <span style={S.badge}>01</span>
          <p style={S.sectionTitle}>Identificación de Clientes (KYC)</p>
          <p style={{ ...S.body, marginBottom: "16px" }}>
            PagoYa implementa un modelo de KYC escalonado alineado con los niveles de la CNBV para billeteras digitales:
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "16px" }}>
            {([
              ["Nivel Simplificado", "Verificación por teléfono celular + OTP. Límite: $3,200 MXN acumulado. Aplica por defecto a todos los usuarios en onboarding."],
              ["Nivel Estándar", "Requiere CURP. Se activa cuando la actividad acumulada supera $3,200 MXN. Paula solicita el CURP de forma conversacional a través de WhatsApp."],
              ["Nivel Reforzado", "Requiere identificación oficial (INE/pasaporte) + comprobante de domicilio. Disponible para usuarios con perfil de alto volumen o en proceso de originación crediticia con socio institucional."],
            ] as [string, string][]).map(([t, d]) => (
              <div key={t} style={{ display: "flex", gap: "10px" }}>
                <span style={{ color: "#00C875", flexShrink: 0, marginTop: "2px" }}>→</span>
                <p style={{ ...S.body, margin: 0 }}><strong style={{ color: "rgba(255,255,255,0.9)" }}>{t}:</strong> {d}</p>
              </div>
            ))}
          </div>
          <div style={{ paddingTop: "14px", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", gap: "6px" }}>
            {([
              ["Clasificación de riesgo", "Cada usuario es clasificado en tier kyc_tier: simplified / standard / enhanced — campo almacenado en la base de datos de usuarios"],
              ["PTI como dato alternativo", "El PagoYa Trust Index (PTI) enriquece la clasificación conductual de riesgo con 4 dimensiones y 15 señales de comportamiento transaccional"],
              ["Atribución institucional", "Campo referred_by_institution disponible para pilotos con socios — rastreo desde el primer registro"],
            ] as [string, string][]).map(([l, v]) => (
              <div key={l} style={S.row}><span style={S.label}>{l}</span><span style={S.val}>{v}</span></div>
            ))}
          </div>
        </div>

        {/* Section 2 — AML */}
        <div style={S.card}>
          <span style={S.badge}>02</span>
          <p style={S.sectionTitle}>Monitoreo de Transacciones (AML)</p>
          <p style={{ ...S.body, marginBottom: "16px" }}>
            PagoYa mantiene un programa interno de monitoreo de operaciones inusuales conforme a las Disposiciones de Carácter General en materia de PIORPI:
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "16px" }}>
            {([
              ["Umbrales de monitoreo", "Alertas automáticas por operaciones únicas >$7,500 MXN o acumulados en 24h >$15,000 MXN"],
              ["Velocidad de carga", "Monitoreo de frecuencia inusual de recargas (>3 top-ups en 6 horas desde fuentes distintas)"],
              ["Reportes a autoridades", "Operaciones inusuales relevantes son reportadas a la Unidad de Inteligencia Financiera (UIF/SHCP) mediante los formatos establecidos"],
              ["Sistema de banderas", "Tabla bonus_fraud_flags y registros de actividad inusual vinculados a cada usuario — accesibles al oficial de cumplimiento"],
            ] as [string, string][]).map(([l, v]) => (
              <div key={l} style={S.row}><span style={{ ...S.label }}>{l}</span><span style={S.val}>{v}</span></div>
            ))}
          </div>
          <p style={{ ...S.body, fontSize: "13px", color: "rgba(255,255,255,0.45)" }}>
            El endpoint <code style={{ background: "rgba(255,255,255,0.07)", padding: "1px 6px", borderRadius: "4px", fontSize: "12px" }}>GET /api/admin/compliance-summary</code> proporciona en tiempo real la distribución de KYC, banderas activas y volumen transaccional — disponible para revisión del oficial de cumplimiento.
          </p>
        </div>

        {/* Section 3 — Record Retention */}
        <div style={S.card}>
          <span style={S.badge}>03</span>
          <p style={S.sectionTitle}>Retención de Registros</p>
          <p style={{ ...S.body, marginBottom: "16px" }}>
            Cumplimos con el período mínimo de 10 años establecido en la Ley Fintech y las disposiciones del RLFRACC:
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {([
              ["Registros de identidad", "Datos de registro, OTP de verificación, CURP (si aplica), historial de cambios — 10 años desde la baja del usuario"],
              ["Registros transaccionales", "Cada pago, recarga y transferencia — incluyendo referencia de servicio, monto, timestamp y canal de pago — 10 años"],
              ["Reportes de actividad inusual", "Todos los reportes generados internamente — 10 años desde la fecha del reporte"],
              ["Infraestructura", "Base de datos PostgreSQL con respaldo automático + log de cambios (pg_logical). Política de archivado en revisión para almacenamiento frío al año 3."],
            ] as [string, string][]).map(([l, v]) => (
              <div key={l} style={S.row}><span style={S.label}>{l}</span><span style={S.val}>{v}</span></div>
            ))}
          </div>
        </div>

        {/* Section 4 — Consumer Protection */}
        <div style={S.card}>
          <span style={S.badge}>04</span>
          <p style={S.sectionTitle}>Protección al Consumidor</p>
          <p style={{ ...S.body, marginBottom: "16px" }}>
            La Ley Fintech 2018 establece la protección al consumidor como principio rector. PagoYa implementa:
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {([
              ["Divulgación de comisiones", "Comisión de $25 MXN por transacción informada antes de cada pago — confirmación explícita del usuario requerida."],
              ["Quejas y disputas", "Canal de atención vía WhatsApp (soporte@pagoyamx.com) con tiempo de respuesta objetivo de 24 horas hábiles."],
              ["Registro CONDUSEF", "PagoYa está en proceso de registro ante la CONDUSEF como entidad financiera no bancaria — previsto para Q3 2025."],
              ["Aviso de Privacidad", "Publicado en pagoyamx.com/aviso-de-privacidad, conforme a la LFPDPPP. Los usuarios aceptan explícitamente al registrarse."],
              ["Protección de datos", "Sin venta de datos personales a terceros. Los datos del usuario son utilizados exclusivamente para prestación del servicio y cómputo del PTI."],
            ] as [string, string][]).map(([t, d]) => (
              <div key={t} style={{ display: "flex", gap: "10px" }}>
                <span style={{ color: "#00C875", flexShrink: 0, marginTop: "2px" }}>→</span>
                <p style={{ ...S.body, margin: 0 }}><strong style={{ color: "rgba(255,255,255,0.9)" }}>{t}:</strong> {d}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Section 5 — Financial Inclusion */}
        <div style={S.card}>
          <span style={S.badge}>05</span>
          <p style={S.sectionTitle}>Inclusión Financiera</p>
          <p style={{ ...S.body, marginBottom: "16px" }}>
            La inclusión financiera es el mandato central de PagoYa — y un principio explícito de la Ley Fintech 2018:
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {([
              ["Población objetivo", "Usuarios sin cuenta bancaria (sin CLABE preexistente al momento del registro)"],
              ["Onboarding sin fricción", "Registro por WhatsApp o web — solo teléfono celular requerido para Nivel Simplificado"],
              ["Construcción de historial", "El PTI acumula datos conductuales desde el primer pago — construyendo identidad financiera alternativa verificable"],
              ["Medición de impacto", "Cohorte reportable: usuarios registrados sin actividad bancaria previa que completaron ≥3 pagos en 90 días"],
              ["Integración institucional", "API disponible para socios (SOFIPOs, SOFOMs, bancos) que busquen incorporar el PTI en su proceso de originación o clasificación de riesgo"],
            ] as [string, string][]).map(([l, v]) => (
              <div key={l} style={S.row}><span style={S.label}>{l}</span><span style={S.val}>{v}</span></div>
            ))}
          </div>
        </div>

        <div style={S.divider} />

        {/* Contact */}
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {([
            ["Oficial de Cumplimiento", "disponible a solicitud — contacto@pagoyamx.com"],
            ["Consultas institucionales", "institucional@pagoyamx.com"],
            ["Versión del documento", "1.0 — Junio 2025"],
            ["Próxima revisión", "Diciembre 2025"],
          ] as [string, string][]).map(([l, v]) => (
            <div key={l} style={S.row}><span style={S.label}>{l}</span><span style={S.val}>{v}</span></div>
          ))}
        </div>

        <div style={{ marginTop: "48px", display: "flex", gap: "24px", flexWrap: "wrap" }}>
          <a href="/confianza" style={{ fontSize: "13px", color: "#00C875", textDecoration: "none" }}>← PTI Metodología</a>
          <a href="/aviso-de-privacidad" style={{ fontSize: "13px", color: "rgba(255,255,255,0.35)", textDecoration: "none" }}>Aviso de Privacidad</a>
          <a href="/" style={{ fontSize: "13px", color: "rgba(255,255,255,0.35)", textDecoration: "none" }}>Volver a PagoYa</a>
        </div>
      </div>
    </div>
  );
}
