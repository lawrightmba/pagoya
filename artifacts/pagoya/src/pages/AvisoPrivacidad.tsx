import { Helmet } from "react-helmet-async";
import { useLocation } from "wouter";

export default function AvisoPrivacidad() {
  const [, navigate] = useLocation();

  return (
    <div style={{ background: "#0A2540", minHeight: "100vh", display: "flex", flexDirection: "column", overflowX: "hidden" }}>
      <Helmet>
        <title>Aviso de Privacidad | PagoYa</title>
        <meta name="description" content="Aviso de Privacidad de PagoYa conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP). Conoce cómo protegemos tus datos." />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://pagoyamx.com/aviso-de-privacidad" />
      </Helmet>

      <style>{`
        .ap-body a { color: #1D9E75; text-decoration: underline; }
        .ap-body a:hover { color: #17c99a; }
        .ap-h1 { font-size: clamp(24px, 5vw, 38px); }
        .ap-h2 { font-size: clamp(17px, 3vw, 22px); }
        .ap-ul { list-style: disc; padding-left: 22px; }
        .ap-ul li { margin-bottom: 8px; line-height: 1.7; color: #CBD5E1; }
        .ap-section { margin-bottom: 40px; }
        .ap-highlight { background: rgba(29,158,117,0.10); border: 1px solid rgba(29,158,117,0.25); border-radius: 10px; padding: 18px 20px; }
        .ap-table { width: 100%; border-collapse: collapse; margin-top: 14px; }
        .ap-table th { text-align: left; font-size: 12px; font-weight: 700; color: #94A3B8; text-transform: uppercase; letter-spacing: 0.06em; padding: 10px 12px; border-bottom: 1px solid rgba(255,255,255,0.08); }
        .ap-table td { font-size: 14px; color: #CBD5E1; padding: 10px 12px; border-bottom: 1px solid rgba(255,255,255,0.05); vertical-align: top; line-height: 1.6; }
        .ap-table tr:last-child td { border-bottom: none; }
      `}</style>

      {/* NAV */}
      <header style={{ background: "#0A2540", padding: "10px 20px", display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <span />
        <div style={{ display: "flex", justifyContent: "center", cursor: "pointer" }} onClick={() => navigate("/")}>
          <img
            src="/pagoya-logo.png"
            alt="PagoYa"
            style={{ height: "44px", width: "auto", maxWidth: "180px", objectFit: "contain" }}
            onError={(e) => { e.currentTarget.style.display = "none"; const s = e.currentTarget.nextSibling as HTMLElement | null; if (s) s.style.display = "inline"; }}
          />
          <span style={{ display: "none", color: "white", fontWeight: 800, fontSize: "22px" }}>Pago<span style={{ color: "#1D9E75" }}>Ya</span></span>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button onClick={() => navigate("/")} style={{ fontSize: "12px", fontWeight: 700, color: "white", border: "1.5px solid rgba(255,255,255,0.35)", borderRadius: "999px", padding: "4px 12px", background: "rgba(255,255,255,0.10)", cursor: "pointer" }}>← Inicio</button>
        </div>
      </header>

      <main style={{ flex: 1 }}>
        <article className="ap-body" style={{ maxWidth: "780px", margin: "0 auto", padding: "48px 24px 80px", color: "#CBD5E1", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", lineHeight: 1.7 }}>

          <h1 className="ap-h1" style={{ color: "#FFFFFF", fontWeight: 800, lineHeight: 1.2, marginBottom: "8px" }}>
            Aviso de Privacidad
          </h1>
          <p style={{ color: "#1D9E75", fontWeight: 600, fontSize: "16px", marginBottom: "6px" }}>
            Privacy Notice — PagoYa
          </p>
          <p style={{ color: "#64748B", fontSize: "13px", marginBottom: "36px" }}>
            Vigencia: mayo de 2026 · Effective: May 2026
          </p>

          <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.10)", margin: "0 0 40px" }} />

          {/* 1. Responsable */}
          <div className="ap-section">
            <div className="ap-highlight" style={{ marginBottom: "20px" }}>
              <p style={{ color: "#1D9E75", fontWeight: 700, fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>Aviso integral conforme a la LFPDPPP</p>
              <p style={{ color: "#94A3B8", fontSize: "13px", margin: 0 }}>Ley Federal de Protección de Datos Personales en Posesión de los Particulares — México</p>
            </div>
            <h2 className="ap-h2" style={{ color: "#FFFFFF", fontWeight: 700, marginBottom: "14px" }}>
              1. Identidad y domicilio del Responsable
            </h2>
            <p style={{ marginBottom: "14px" }}>
              <strong style={{ color: "#E2E8F0" }}>Longview Meridian Technologies LLC</strong> ("PagoYa", "nosotros"), empresa constituida bajo las leyes del estado de Wyoming, Estados Unidos de América, es el responsable del tratamiento de sus datos personales.
            </p>
            <ul className="ap-ul">
              <li><strong style={{ color: "#E2E8F0" }}>Sitio web:</strong> pagoyamx.com</li>
              <li><strong style={{ color: "#E2E8F0" }}>Correo de contacto:</strong> <a href="mailto:privacidad@pagoyamx.com">privacidad@pagoyamx.com</a></li>
              <li><strong style={{ color: "#E2E8F0" }}>Atención al usuario:</strong> <a href="mailto:soporte@pagoyamx.com">soporte@pagoyamx.com</a></li>
            </ul>
          </div>

          {/* 2. Datos recabados */}
          <div className="ap-section">
            <h2 className="ap-h2" style={{ color: "#FFFFFF", fontWeight: 700, marginBottom: "14px" }}>
              2. Datos personales que recabamos
            </h2>
            <p style={{ marginBottom: "14px" }}>
              Según el servicio que utilice, PagoYa puede recabar las siguientes categorías de datos personales:
            </p>
            <table className="ap-table">
              <thead>
                <tr>
                  <th>Categoría</th>
                  <th>Ejemplos</th>
                  <th>¿Cuándo?</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong style={{ color: "#E2E8F0" }}>Identificación</strong></td>
                  <td>Número de teléfono, nombre completo, correo electrónico</td>
                  <td>Al registrarse o iniciar un pago</td>
                </tr>
                <tr>
                  <td><strong style={{ color: "#E2E8F0" }}>Documentos de identidad</strong></td>
                  <td>CURP, RFC, copia de INE/pasaporte, selfie de verificación</td>
                  <td>Solo al vincular cuenta bancaria (débito directo)</td>
                </tr>
                <tr>
                  <td><strong style={{ color: "#E2E8F0" }}>Financieros</strong></td>
                  <td>CLABE interbancaria, número de tarjeta (tokenizado), historial de transacciones</td>
                  <td>Al cargar saldo o vincular cuenta</td>
                </tr>
                <tr>
                  <td><strong style={{ color: "#E2E8F0" }}>Técnicos</strong></td>
                  <td>Dirección IP, tipo de dispositivo, sistema operativo, cookies de sesión</td>
                  <td>Automáticamente al usar la app</td>
                </tr>
                <tr>
                  <td><strong style={{ color: "#E2E8F0" }}>De servicios</strong></td>
                  <td>Número de contrato CFE, número de cuenta Telmex, número de línea celular</td>
                  <td>Al ingresar un servicio para pagar</td>
                </tr>
              </tbody>
            </table>
            <p style={{ marginTop: "16px", color: "#94A3B8", fontSize: "13px" }}>
              PagoYa <strong style={{ color: "#E2E8F0" }}>no almacena números de tarjeta completos</strong>. Los datos de pago con tarjeta son procesados y tokenizados directamente por Stripe o Conekta (proveedores certificados PCI-DSS).
            </p>
          </div>

          {/* 3. Finalidades */}
          <div className="ap-section">
            <h2 className="ap-h2" style={{ color: "#FFFFFF", fontWeight: 700, marginBottom: "14px" }}>
              3. Finalidades del tratamiento
            </h2>
            <p style={{ marginBottom: "10px" }}>
              <strong style={{ color: "#E2E8F0" }}>Finalidades primarias</strong> (necesarias para prestar el servicio):
            </p>
            <ul className="ap-ul" style={{ marginBottom: "20px" }}>
              <li>Procesar y confirmar pagos de servicios, recargas y cargas de saldo.</li>
              <li>Enviar comprobantes y notificaciones de transacciones vía WhatsApp o correo electrónico.</li>
              <li>Gestionar su cuenta, historial de transacciones y saldo de billetera.</li>
              <li>Verificar su identidad al vincular una cuenta bancaria para débito directo.</li>
              <li>Cumplir con obligaciones legales, fiscales y regulatorias aplicables.</li>
              <li>Prevenir fraudes, lavado de dinero y operaciones ilícitas.</li>
            </ul>
            <p style={{ marginBottom: "10px" }}>
              <strong style={{ color: "#E2E8F0" }}>Finalidades secundarias</strong> (puede oponerse sin afectar el servicio):
            </p>
            <ul className="ap-ul">
              <li>Enviarle información sobre nuevos servicios, promociones o actualizaciones de PagoYa.</li>
              <li>Realizar análisis estadísticos y de uso para mejorar la plataforma.</li>
              <li>Evaluar su perfil para ofrecerle crédito o planes de pago (BNPL) en el futuro.</li>
            </ul>
            <p style={{ marginTop: "14px" }}>
              Para oponerse a las finalidades secundarias, envíe un correo a <a href="mailto:privacidad@pagoyamx.com">privacidad@pagoyamx.com</a> con el asunto "Oposición finalidades secundarias".
            </p>
          </div>

          {/* 4. Transferencias */}
          <div className="ap-section">
            <h2 className="ap-h2" style={{ color: "#FFFFFF", fontWeight: 700, marginBottom: "14px" }}>
              4. Transferencias de datos a terceros
            </h2>
            <p style={{ marginBottom: "14px" }}>
              PagoYa comparte datos personales únicamente con los proveedores tecnológicos necesarios para operar la plataforma, bajo contratos de confidencialidad y protección de datos:
            </p>
            <table className="ap-table">
              <thead>
                <tr>
                  <th>Proveedor</th>
                  <th>Finalidad</th>
                  <th>País</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong style={{ color: "#E2E8F0" }}>Stripe Inc.</strong></td>
                  <td>Procesamiento de pagos con tarjeta de crédito/débito</td>
                  <td>Estados Unidos</td>
                </tr>
                <tr>
                  <td><strong style={{ color: "#E2E8F0" }}>Conekta / Digitalfemsa</strong></td>
                  <td>Procesamiento de pagos OXXO Pay y tarjeta en México</td>
                  <td>México</td>
                </tr>
                <tr>
                  <td><strong style={{ color: "#E2E8F0" }}>Belvo Technologies</strong></td>
                  <td>Verificación de cuenta bancaria y procesamiento de débito directo</td>
                  <td>México / España</td>
                </tr>
                <tr>
                  <td><strong style={{ color: "#E2E8F0" }}>Twilio Inc.</strong></td>
                  <td>Envío de notificaciones y comprobantes vía WhatsApp / SMS</td>
                  <td>Estados Unidos</td>
                </tr>
                <tr>
                  <td><strong style={{ color: "#E2E8F0" }}>Google LLC (GA4)</strong></td>
                  <td>Análisis de uso anónimo de la plataforma</td>
                  <td>Estados Unidos</td>
                </tr>
                <tr>
                  <td><strong style={{ color: "#E2E8F0" }}>Bugsnag (Smartbear)</strong></td>
                  <td>Monitoreo de errores técnicos (datos técnicos anónimos)</td>
                  <td>Estados Unidos</td>
                </tr>
                <tr>
                  <td><strong style={{ color: "#E2E8F0" }}>SIPREL</strong></td>
                  <td>Procesamiento de recargas de tiempo aire</td>
                  <td>México</td>
                </tr>
              </tbody>
            </table>
            <p style={{ marginTop: "16px" }}>
              PagoYa <strong style={{ color: "#E2E8F0" }}>no vende</strong> sus datos personales a terceros con fines comerciales o publicitarios.
            </p>
          </div>

          {/* 5. Derechos ARCO */}
          <div className="ap-section">
            <h2 className="ap-h2" style={{ color: "#FFFFFF", fontWeight: 700, marginBottom: "14px" }}>
              5. Derechos ARCO
            </h2>
            <p style={{ marginBottom: "14px" }}>
              Usted tiene derecho a <strong style={{ color: "#E2E8F0" }}>Acceder, Rectificar, Cancelar u Oponerse</strong> al tratamiento de sus datos personales (derechos ARCO), así como a revocar su consentimiento en cualquier momento.
            </p>
            <p style={{ marginBottom: "14px" }}>
              Para ejercer cualquiera de estos derechos, envíe una solicitud a <a href="mailto:privacidad@pagoyamx.com">privacidad@pagoyamx.com</a> con:
            </p>
            <ul className="ap-ul">
              <li>Nombre completo y número de teléfono registrado en PagoYa.</li>
              <li>Descripción clara del derecho que desea ejercer.</li>
              <li>Copia de su identificación oficial vigente.</li>
            </ul>
            <p style={{ marginTop: "14px" }}>
              PagoYa responderá en un plazo máximo de <strong style={{ color: "#E2E8F0" }}>20 días hábiles</strong> a partir de la recepción de su solicitud, conforme al artículo 32 de la LFPDPPP.
            </p>
            <div className="ap-highlight" style={{ marginTop: "20px" }}>
              <p style={{ color: "#94A3B8", fontSize: "13px", margin: 0 }}>
                Si considera que su solicitud no fue atendida correctamente, puede presentar una queja ante el <strong style={{ color: "#E2E8F0" }}>Instituto Nacional de Transparencia, Acceso a la Información y Protección de Datos Personales (INAI)</strong> en <a href="https://www.inai.org.mx" target="_blank" rel="noopener noreferrer">www.inai.org.mx</a>.
              </p>
            </div>
          </div>

          {/* 6. Cookies */}
          <div className="ap-section">
            <h2 className="ap-h2" style={{ color: "#FFFFFF", fontWeight: 700, marginBottom: "14px" }}>
              6. Cookies y tecnologías de rastreo
            </h2>
            <p style={{ marginBottom: "14px" }}>
              PagoYa utiliza cookies y tecnologías similares para las siguientes finalidades:
            </p>
            <ul className="ap-ul">
              <li><strong style={{ color: "#E2E8F0" }}>Cookies esenciales:</strong> Necesarias para mantener su sesión activa y garantizar el funcionamiento de la plataforma.</li>
              <li><strong style={{ color: "#E2E8F0" }}>Cookies analíticas (Google Analytics 4):</strong> Recopilan datos de uso de forma anónima y agregada para mejorar la experiencia del usuario. No identifican a personas individuales.</li>
              <li><strong style={{ color: "#E2E8F0" }}>Cookies de rendimiento (Bugsnag):</strong> Detectan errores técnicos para mejorar la estabilidad de la app.</li>
            </ul>
            <p style={{ marginTop: "14px" }}>
              Puede controlar las cookies a través de la configuración de su navegador. Deshabilitar cookies esenciales puede impedir el uso de algunas funciones de la plataforma.
            </p>
          </div>

          {/* 7. Seguridad */}
          <div className="ap-section">
            <h2 className="ap-h2" style={{ color: "#FFFFFF", fontWeight: 700, marginBottom: "14px" }}>
              7. Medidas de seguridad
            </h2>
            <p style={{ marginBottom: "14px" }}>
              PagoYa implementa medidas técnicas y organizativas para proteger sus datos personales contra acceso no autorizado, pérdida o divulgación indebida, incluyendo:
            </p>
            <ul className="ap-ul">
              <li>Transmisión de datos cifrada mediante TLS 1.2+ en todas las comunicaciones.</li>
              <li>Almacenamiento de contraseñas con hash criptográfico (nunca en texto plano).</li>
              <li>Tokenización de datos de pago a través de procesadores certificados PCI-DSS.</li>
              <li>Acceso a bases de datos restringido a personal autorizado bajo principio de mínimo privilegio.</li>
              <li>Monitoreo continuo de errores y actividad sospechosa.</li>
            </ul>
          </div>

          {/* 8. Menores de edad */}
          <div className="ap-section">
            <h2 className="ap-h2" style={{ color: "#FFFFFF", fontWeight: 700, marginBottom: "14px" }}>
              8. Menores de edad
            </h2>
            <p>
              PagoYa no está dirigido a menores de 18 años. No recabamos conscientemente datos personales de menores. Si usted es padre, madre o tutor y detecta que un menor ha proporcionado datos personales a través de nuestra plataforma, por favor contáctenos a <a href="mailto:privacidad@pagoyamx.com">privacidad@pagoyamx.com</a> para eliminar dicha información.
            </p>
          </div>

          {/* 9. Cambios */}
          <div className="ap-section">
            <h2 className="ap-h2" style={{ color: "#FFFFFF", fontWeight: 700, marginBottom: "14px" }}>
              9. Cambios al Aviso de Privacidad
            </h2>
            <p>
              PagoYa se reserva el derecho de modificar este Aviso de Privacidad en cualquier momento. Cualquier cambio sustancial será notificado a través de la aplicación o por WhatsApp con al menos <strong style={{ color: "#E2E8F0" }}>7 días de anticipación</strong>. La versión vigente siempre estará disponible en <a href="https://pagoyamx.com/aviso-de-privacidad">pagoyamx.com/aviso-de-privacidad</a>.
            </p>
          </div>

          <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.10)", margin: "0 0 32px" }} />

          <p style={{ color: "#475569", fontSize: "13px", textAlign: "center" }}>
            Fecha de vigencia: mayo de 2026 · Effective date: May 2026<br />
            © 2026 Longview Meridian Technologies LLC. Todos los derechos reservados.
          </p>

        </article>
      </main>

      {/* FOOTER */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.08)", padding: "20px 24px", textAlign: "center" }}>
        <p style={{ color: "#334155", fontSize: "12px" }}>
          <a href="/" style={{ color: "#475569", textDecoration: "none" }}>PagoYa</a>
          {" · "}
          <a href="/terminos-y-condiciones" style={{ color: "#475569", textDecoration: "none" }}>Términos y Condiciones</a>
          {" · "}
          <a href="/aviso-de-privacidad" style={{ color: "#1D9E75" }}>Aviso de Privacidad</a>
          {" · "}
          <a href="/cumplimiento" style={{ color: "#475569", textDecoration: "none" }}>Cumplimiento</a>
          {" · "}
          <a href="mailto:soporte@pagoyamx.com" style={{ color: "#475569", textDecoration: "none" }}>soporte@pagoyamx.com</a>
        </p>
      </footer>
    </div>
  );
}
