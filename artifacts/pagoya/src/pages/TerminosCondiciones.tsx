import { Helmet } from "react-helmet-async";
import { useLocation } from "wouter";

export default function TerminosCondiciones() {
  const [, navigate] = useLocation();

  return (
    <div style={{ background: "#0A2540", minHeight: "100vh", display: "flex", flexDirection: "column", overflowX: "hidden" }}>
      <Helmet>
        <title>Términos y Condiciones | PagoYa</title>
        <meta name="description" content="Términos y Condiciones de uso de PagoYa — plataforma de pagos de servicios y recargas en México operada por Longview Meridian Technologies LLC." />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://pagoyamx.com/terminos-y-condiciones" />
      </Helmet>

      <style>{`
        .tc-body a { color: #1D9E75; text-decoration: underline; }
        .tc-body a:hover { color: #17c99a; }
        .tc-h1 { font-size: clamp(24px, 5vw, 38px); }
        .tc-h2 { font-size: clamp(17px, 3vw, 22px); }
        .tc-ul { list-style: disc; padding-left: 22px; }
        .tc-ul li { margin-bottom: 8px; line-height: 1.7; color: #CBD5E1; }
        .tc-section { margin-bottom: 40px; }
        .tc-highlight { background: rgba(29,158,117,0.10); border: 1px solid rgba(29,158,117,0.25); border-radius: 10px; padding: 18px 20px; }
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
        <article className="tc-body" style={{ maxWidth: "780px", margin: "0 auto", padding: "48px 24px 80px", color: "#CBD5E1", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", lineHeight: 1.7 }}>

          <h1 className="tc-h1" style={{ color: "#FFFFFF", fontWeight: 800, lineHeight: 1.2, marginBottom: "8px" }}>
            Términos y Condiciones
          </h1>
          <p style={{ color: "#1D9E75", fontWeight: 600, fontSize: "16px", marginBottom: "6px" }}>
            Terms &amp; Conditions — PagoYa
          </p>
          <p style={{ color: "#64748B", fontSize: "13px", marginBottom: "36px" }}>
            Vigencia: mayo de 2026 · Effective: May 2026
          </p>

          <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.10)", margin: "0 0 40px" }} />

          {/* 1. Introducción */}
          <div className="tc-section">
            <h2 className="tc-h2" style={{ color: "#FFFFFF", fontWeight: 700, marginBottom: "14px" }}>
              1. Introducción
            </h2>
            <p style={{ marginBottom: "14px" }}>
              PagoYa es una plataforma digital de pagos operada por <strong style={{ color: "#E2E8F0" }}>Longview Meridian Technologies LLC</strong>, empresa constituida bajo las leyes del estado de Wyoming, Estados Unidos de América. PagoYa ofrece a los usuarios en México un medio conveniente para pagar servicios, realizar recargas de tiempo aire y cargar saldo a través de tiendas OXXO.
            </p>
            <p>
              Al usar PagoYa, el usuario acepta estos Términos y Condiciones en su totalidad. Si no está de acuerdo con alguna de estas condiciones, debe dejar de usar la plataforma inmediatamente.
            </p>
          </div>

          {/* 2. Servicios ofrecidos */}
          <div className="tc-section">
            <h2 className="tc-h2" style={{ color: "#FFFFFF", fontWeight: 700, marginBottom: "14px" }}>
              2. Servicios ofrecidos
            </h2>
            <p style={{ marginBottom: "14px" }}>PagoYa ofrece los siguientes servicios a través de su plataforma:</p>
            <ul className="tc-ul">
              <li><strong style={{ color: "#E2E8F0" }}>Pago de servicios:</strong> Pago de recibos de electricidad (CFE), agua, gas, telefonía fija y móvil, televisión por cable y satélite, y otros servicios del hogar.</li>
              <li><strong style={{ color: "#E2E8F0" }}>Recargas de tiempo aire:</strong> Recargas para líneas Telcel, AT&amp;T, Movistar y otros operadores disponibles en el catálogo.</li>
              <li><strong style={{ color: "#E2E8F0" }}>Carga de saldo OXXO:</strong> Depósito de saldo a la billetera PagoYa mediante pago en efectivo en tiendas OXXO, procesado a través de OXXO Pay.</li>
            </ul>
            <p style={{ marginTop: "14px" }}>
              La disponibilidad de servicios puede variar sin previo aviso. PagoYa se reserva el derecho de modificar, suspender o descontinuar cualquier servicio en cualquier momento.
            </p>
          </div>

          {/* 3. Uso de OXXO Pay */}
          <div className="tc-section">
            <div className="tc-highlight" style={{ marginBottom: "20px" }}>
              <p style={{ color: "#1D9E75", fontWeight: 700, fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>Sección requerida por Conekta / Digitalfemsa</p>
              <p style={{ color: "#94A3B8", fontSize: "13px", margin: 0 }}>Required disclosure for OXXO Pay integration</p>
            </div>
            <h2 className="tc-h2" style={{ color: "#FFFFFF", fontWeight: 700, marginBottom: "14px" }}>
              3. Uso de OXXO Pay
            </h2>
            <p style={{ marginBottom: "16px" }}>
              Los depósitos de saldo a través de OXXO son procesados por <strong style={{ color: "#E2E8F0" }}>Digitalfemsa S. de R.L. de C.V.</strong> ("OXXO Pay"), entidad regulada conforme a la legislación financiera mexicana aplicable. Al utilizar la funcionalidad de carga de saldo OXXO, el usuario acepta adicionalmente los términos de uso de OXXO Pay.
            </p>
            <ul className="tc-ul">
              <li><strong style={{ color: "#E2E8F0" }}>Límite por transacción:</strong> El monto máximo por transacción de carga OXXO es de <strong style={{ color: "#E2E8F0" }}>$10,000 MXN</strong>. El monto mínimo es de $50 MXN.</li>
              <li><strong style={{ color: "#E2E8F0" }}>No reembolsos:</strong> Una vez que el pago ha sido confirmado en la tienda OXXO, no se realizarán devoluciones bajo ninguna circunstancia. El saldo acreditado en la billetera PagoYa no es canjeable por efectivo.</li>
              <li><strong style={{ color: "#E2E8F0" }}>Tiempo de acreditación:</strong> La confirmación del saldo puede tardar hasta <strong style={{ color: "#E2E8F0" }}>24 horas</strong> después de realizar el pago en tienda. En la mayoría de los casos el saldo se refleja en minutos.</li>
              <li><strong style={{ color: "#E2E8F0" }}>Vigencia del voucher:</strong> El voucher o código de barras generado en la app tiene una vigencia de <strong style={{ color: "#E2E8F0" }}>5 días</strong> a partir de su creación. Los vouchers no pagados dentro de ese plazo se cancelan automáticamente.</li>
              <li><strong style={{ color: "#E2E8F0" }}>Presentación en tienda:</strong> El usuario debe presentar el código de barras o número de referencia generado en la app ante el cajero de cualquier tienda OXXO en territorio mexicano para completar el pago.</li>
              <li><strong style={{ color: "#E2E8F0" }}>Responsabilidad limitada:</strong> PagoYa no es responsable por errores operativos, fallas del sistema o tiempo de inactividad en tiendas OXXO, ni por retrasos en la acreditación causados por Digitalfemsa S. de R.L. de C.V.</li>
              <li><strong style={{ color: "#E2E8F0" }}>Datos del pago:</strong> Al generar un voucher OXXO, el usuario autoriza a PagoYa a compartir con Digitalfemsa los datos mínimos necesarios para procesar la transacción (número de teléfono, monto).</li>
            </ul>
          </div>

          {/* 4. Comisiones */}
          <div className="tc-section">
            <h2 className="tc-h2" style={{ color: "#FFFFFF", fontWeight: 700, marginBottom: "14px" }}>
              4. Comisiones y tarifas
            </h2>
            <p style={{ marginBottom: "14px" }}>
              PagoYa cobra una <strong style={{ color: "#E2E8F0" }}>comisión fija de $15 MXN</strong> por cada transacción de pago de servicio o recarga. Esta comisión se cobra al momento de confirmar el pago y se muestra claramente antes de que el usuario autorice la transacción.
            </p>
            <p>
              La carga de saldo a la billetera vía OXXO no tiene comisión adicional por parte de PagoYa; sin embargo, Digitalfemsa puede aplicar sus propias tarifas conforme a sus condiciones de servicio.
            </p>
          </div>

          {/* 5. Privacidad */}
          <div className="tc-section">
            <h2 className="tc-h2" style={{ color: "#FFFFFF", fontWeight: 700, marginBottom: "14px" }}>
              5. Privacidad y protección de datos
            </h2>
            <p style={{ marginBottom: "14px" }}>
              PagoYa trata los datos personales de sus usuarios conforme a lo establecido en la <strong style={{ color: "#E2E8F0" }}>Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP)</strong> de los Estados Unidos Mexicanos y su Reglamento.
            </p>
            <p style={{ marginBottom: "14px" }}>
              Los datos recopilados (número de teléfono, historial de transacciones, datos del servicio pagado) se utilizan exclusivamente para:
            </p>
            <ul className="tc-ul">
              <li>Procesar y confirmar los pagos solicitados por el usuario.</li>
              <li>Enviar notificaciones y comprobantes de pago vía WhatsApp.</li>
              <li>Mejorar la experiencia y funcionalidades de la plataforma.</li>
              <li>Cumplir con obligaciones legales y regulatorias aplicables.</li>
            </ul>
            <p style={{ marginTop: "14px" }}>
              PagoYa no vende ni comparte datos personales con terceros para fines de publicidad. Para ejercer sus derechos ARCO (Acceso, Rectificación, Cancelación u Oposición), el usuario puede escribir a <a href="mailto:soporte@pagoyamx.com">soporte@pagoyamx.com</a>.
            </p>
          </div>

          {/* 6. Limitación de responsabilidad */}
          <div className="tc-section">
            <h2 className="tc-h2" style={{ color: "#FFFFFF", fontWeight: 700, marginBottom: "14px" }}>
              6. Limitación de responsabilidad
            </h2>
            <p style={{ marginBottom: "14px" }}>
              PagoYa es un <strong style={{ color: "#E2E8F0" }}>intermediario tecnológico</strong> que facilita la conexión entre usuarios y proveedores de servicios. PagoYa <strong style={{ color: "#E2E8F0" }}>no es una institución bancaria, financiera, ni entidad de crédito</strong>, y no está sujeto a la regulación de la Comisión Nacional Bancaria y de Valores (CNBV) en calidad de institución financiera.
            </p>
            <p style={{ marginBottom: "14px" }}>
              PagoYa no garantiza la disponibilidad ininterrumpida de sus servicios. En ningún caso PagoYa será responsable por:
            </p>
            <ul className="tc-ul">
              <li>Fallas o interrupciones en los sistemas de los proveedores de servicios (CFE, Telcel, Telmex, etc.).</li>
              <li>Errores en los datos de referencia proporcionados por el usuario al realizar un pago.</li>
              <li>Retrasos en la aplicación del pago por parte del proveedor del servicio.</li>
              <li>Daños directos, indirectos, incidentales o consecuentes derivados del uso o imposibilidad de uso de la plataforma.</li>
            </ul>
            <p style={{ marginTop: "14px" }}>
              La responsabilidad máxima de PagoYa ante el usuario en cualquier circunstancia estará limitada al monto de la comisión pagada en la transacción que originó el reclamo.
            </p>
          </div>

          {/* 7. Modificaciones */}
          <div className="tc-section">
            <h2 className="tc-h2" style={{ color: "#FFFFFF", fontWeight: 700, marginBottom: "14px" }}>
              7. Modificaciones a estos Términos
            </h2>
            <p>
              PagoYa se reserva el derecho de modificar estos Términos y Condiciones en cualquier momento. Los cambios serán notificados al usuario a través de la aplicación o por WhatsApp con al menos 7 días de anticipación antes de su entrada en vigor. El uso continuado de la plataforma después de la fecha efectiva de los cambios constituye la aceptación de los nuevos términos.
            </p>
          </div>

          {/* 8. Contacto */}
          <div className="tc-section">
            <h2 className="tc-h2" style={{ color: "#FFFFFF", fontWeight: 700, marginBottom: "14px" }}>
              8. Contacto
            </h2>
            <p style={{ marginBottom: "10px" }}>
              Para dudas, aclaraciones o ejercicio de derechos ARCO, el usuario puede contactar a PagoYa a través de:
            </p>
            <ul className="tc-ul">
              <li>Correo electrónico: <a href="mailto:soporte@pagoyamx.com">soporte@pagoyamx.com</a></li>
              <li>Sitio web: <a href="https://pagoyamx.com" target="_blank" rel="noopener noreferrer">pagoyamx.com</a></li>
            </ul>
            <p style={{ marginTop: "14px", color: "#64748B", fontSize: "14px" }}>
              Longview Meridian Technologies LLC · Wyoming, United States of America
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
          <a href="/terminos-y-condiciones" style={{ color: "#1D9E75" }}>Términos y Condiciones</a>
          {" · "}
          <a href="mailto:soporte@pagoyamx.com" style={{ color: "#475569", textDecoration: "none" }}>soporte@pagoyamx.com</a>
        </p>
      </footer>
    </div>
  );
}
