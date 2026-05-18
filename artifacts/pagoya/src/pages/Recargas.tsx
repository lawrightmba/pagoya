import { Helmet } from "react-helmet-async";
import { useLocation } from "wouter";

export default function Recargas() {
  const [, navigate] = useLocation();

  return (
    <div style={{ background: "#0A2540", minHeight: "100vh", display: "flex", flexDirection: "column", overflowX: "hidden" }}>
      <Helmet>
        <title>Recargas Telcel, AT&amp;T y Movistar Sin Tarjeta | PagoYa</title>
        <meta name="description" content="Recarga tu celular Telcel, AT&T o Movistar desde la app en segundos. Sin tarjeta, sin cuenta bancaria. Carga tu billetera con efectivo en OXXO y recarga al instante." />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://pagoyamx.com/recargas" />
        <meta property="og:title" content="Recargas Telcel, AT&T y Movistar Sin Tarjeta | PagoYa" />
        <meta property="og:description" content="Recarga tu celular Telcel, AT&T o Movistar desde la app en segundos. Sin tarjeta, sin cuenta bancaria. Carga tu billetera con efectivo en OXXO y recarga al instante." />
        <meta property="og:type" content="article" />
        <meta property="og:url" content="https://pagoyamx.com/recargas" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          "headline": "Cómo hacer recargas de Telcel, AT&T y Movistar sin tarjeta",
          "description": "Recarga tu celular Telcel, AT&T o Movistar desde la app en segundos. Sin tarjeta, sin cuenta bancaria.",
          "url": "https://pagoyamx.com/recargas",
          "publisher": { "@type": "Organization", "name": "PagoYa", "url": "https://pagoyamx.com" },
          "inLanguage": ["es", "en"]
        })}</script>
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Inicio", "item": "https://pagoyamx.com/" },
            { "@type": "ListItem", "position": 2, "name": "Recargas", "item": "https://pagoyamx.com/recargas" }
          ]
        })}</script>
      </Helmet>

      <style>{`
        .rec-body a { color: #1D9E75; text-decoration: underline; }
        .rec-body a:hover { color: #17c99a; }
        .rec-h1 { font-size: clamp(26px, 5vw, 42px); }
        .rec-h2 { font-size: clamp(20px, 3.5vw, 28px); }
        .rec-table { width: 100%; border-collapse: collapse; }
        .rec-table th, .rec-table td { padding: 10px 14px; border: 1px solid rgba(255,255,255,0.12); text-align: left; vertical-align: top; }
        .rec-table th { background: rgba(29,158,117,0.18); color: #1D9E75; font-weight: 700; }
        .rec-table tr:nth-child(even) td { background: rgba(255,255,255,0.03); }
        .rec-ol { padding-left: 20px; }
        .rec-ol li { margin-bottom: 10px; line-height: 1.6; color: #CBD5E1; }
        .rec-ul { list-style: disc; padding-left: 22px; }
        .rec-ul li { margin-bottom: 6px; line-height: 1.6; color: #CBD5E1; }
        @media(max-width:640px){ .rec-table-wrap { overflow-x: auto; } }
      `}</style>

      {/* NAV */}
      <header style={{ background: "#0A2540", padding: "10px 20px", display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <span />
        <div style={{ display: "flex", justifyContent: "center", cursor: "pointer" }} onClick={() => navigate("/")}>
          <img src="/pagoya-logo.png" alt="PagoYa" style={{ height: "44px", width: "auto", maxWidth: "180px", objectFit: "contain" }}
            onError={(e) => { e.currentTarget.style.display = "none"; const s = e.currentTarget.nextSibling as HTMLElement | null; if (s) s.style.display = "inline"; }} />
          <span style={{ display: "none", color: "white", fontWeight: 800, fontSize: "22px" }}>Pago<span style={{ color: "#1D9E75" }}>Ya</span></span>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button onClick={() => navigate("/")} style={{ fontSize: "12px", fontWeight: 700, color: "white", border: "1.5px solid rgba(255,255,255,0.35)", borderRadius: "999px", padding: "4px 12px", background: "rgba(255,255,255,0.10)", cursor: "pointer" }}>← Inicio</button>
        </div>
      </header>

      <main style={{ flex: 1 }}>
        <article className="rec-body" style={{ maxWidth: "780px", margin: "0 auto", padding: "48px 24px 80px", color: "#E2E8F0", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>

          <h1 className="rec-h1" style={{ color: "#FFFFFF", fontWeight: 800, lineHeight: 1.2, marginBottom: "8px" }}>
            Cómo hacer recargas de Telcel, AT&amp;T y Movistar sin tarjeta
          </h1>
          <p style={{ color: "#1D9E75", fontWeight: 600, fontSize: "18px", marginBottom: "32px" }}>
            How to Top Up Telcel, AT&amp;T, and Movistar Without a Card
          </p>
          <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.10)", margin: "32px 0" }} />

          {/* Intro */}
          <h2 className="rec-h2" style={{ color: "#FFFFFF", fontWeight: 700, marginBottom: "6px" }}>Recarga tu celular en segundos — sin tarjeta, sin banco</h2>
          <p style={{ color: "#64748B", fontWeight: 500, marginBottom: "16px" }}>Top Up Your Phone in Seconds — No Card, No Bank</p>
          <p style={{ lineHeight: 1.7, marginBottom: "14px" }}>Las recargas de tiempo aire son el servicio más frecuente en México. Millones de personas recargan Telcel, AT&amp;T o Movistar cada semana — y la mayoría lo hace en efectivo, en tiendas físicas, esperando turno.</p>
          <p style={{ lineHeight: 1.7, marginBottom: "14px", color: "#94A3B8" }}>Mobile top-ups are Mexico's most frequent service. Millions of people top up Telcel, AT&amp;T, or Movistar every week — and most do it in cash, at physical stores, waiting their turn.</p>
          <p style={{ lineHeight: 1.7, marginBottom: "14px" }}>Con PagoYa, puedes recargar tu celular desde la app en segundos — sin moverte, sin tarjeta, y con saldo que puedes cargar con efectivo en cualquier OXXO.</p>
          <p style={{ lineHeight: 1.7, color: "#94A3B8" }}>With PagoYa, you can top up your phone from the app in seconds — without moving, without a card, and with balance you can load with cash at any OXXO.</p>

          <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.10)", margin: "40px 0" }} />

          {/* Operadores */}
          <h2 className="rec-h2" style={{ color: "#FFFFFF", fontWeight: 700, marginBottom: "6px" }}>Operadores disponibles para recarga en PagoYa</h2>
          <p style={{ color: "#64748B", fontWeight: 500, marginBottom: "16px" }}>Carriers Available for Top-Up in PagoYa</p>
          <p style={{ lineHeight: 1.7, marginBottom: "16px" }}>PagoYa soporta los tres principales operadores móviles de México: <span style={{ color: "#94A3B8" }}>PagoYa supports Mexico's three main mobile carriers:</span></p>
          <ul className="rec-ul" style={{ marginBottom: "0" }}>
            <li><strong style={{ color: "#FFFFFF" }}>Telcel</strong> — el operador con mayor cobertura en México <span style={{ color: "#94A3B8" }}>/ Mexico's largest coverage carrier</span></li>
            <li><strong style={{ color: "#FFFFFF" }}>AT&amp;T México</strong> — cobertura nacional 4G/LTE <span style={{ color: "#94A3B8" }}>/ nationwide 4G/LTE coverage</span></li>
            <li><strong style={{ color: "#FFFFFF" }}>Movistar</strong> — recargas prepago en todo el país <span style={{ color: "#94A3B8" }}>/ prepaid top-ups nationwide</span></li>
          </ul>

          <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.10)", margin: "40px 0" }} />

          {/* Paso a paso */}
          <h2 className="rec-h2" style={{ color: "#FFFFFF", fontWeight: 700, marginBottom: "6px" }}>Cómo recargar tu celular con PagoYa: paso a paso</h2>
          <p style={{ color: "#64748B", fontWeight: 500, marginBottom: "24px" }}>How to Top Up Your Phone With PagoYa: Step by Step</p>
          {[
            { n: 1, es: "Abre la app PagoYa. Si no tienes saldo, recarga tu billetera con efectivo en cualquier OXXO primero.", en: "Open the PagoYa app. If you don't have balance, load your wallet with cash at any OXXO first." },
            { n: 2, es: "Selecciona Recargas en el menú principal, luego elige tu operador: Telcel, AT&T o Movistar.", en: "Select Recargas from the main menu, then choose your carrier: Telcel, AT&T, or Movistar." },
            { n: 3, es: "Ingresa el número de celular a recargar — puede ser el tuyo o el de cualquier otra persona.", en: "Enter the phone number to top up — it can be yours or anyone else's." },
            { n: 4, es: "Elige el monto de recarga disponible para ese operador.", en: "Choose the top-up amount available for that carrier." },
            { n: 5, es: "Confirma y listo. La recarga se aplica en segundos.", en: "Confirm and done. The top-up applies in seconds." },
          ].map(({ n, es, en }) => (
            <div key={n} style={{ display: "flex", gap: "16px", marginBottom: "18px", alignItems: "flex-start" }}>
              <div style={{ width: "32px", height: "32px", borderRadius: "50%", flexShrink: 0, background: "#1D9E75", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: 800 }}>{n}</div>
              <div><p style={{ margin: 0, lineHeight: 1.6 }}>{es}</p><p style={{ margin: "4px 0 0", lineHeight: 1.6, color: "#94A3B8", fontSize: "14px" }}>{en}</p></div>
            </div>
          ))}

          <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.10)", margin: "40px 0" }} />

          {/* Otra persona */}
          <h2 className="rec-h2" style={{ color: "#FFFFFF", fontWeight: 700, marginBottom: "6px" }}>¿Puedo recargar el celular de otra persona?</h2>
          <p style={{ color: "#64748B", fontWeight: 500, marginBottom: "16px" }}>Can I Top Up Someone Else's Phone?</p>
          <p style={{ lineHeight: 1.7, marginBottom: "14px" }}>Sí. PagoYa te permite ingresar cualquier número de teléfono para recargar — el tuyo, el de un familiar, el de un amigo. No importa quién sea el titular de la línea.</p>
          <p style={{ lineHeight: 1.7, marginBottom: "16px", color: "#94A3B8" }}>Yes. PagoYa lets you enter any phone number to top up — yours, a family member's, a friend's. It doesn't matter who owns the line.</p>
          <p style={{ lineHeight: 1.7, marginBottom: "12px" }}>Esto es especialmente útil para: <span style={{ color: "#94A3B8" }}>This is especially useful for:</span></p>
          <ul className="rec-ul">
            <li>Recargar el celular de tus papás o abuelitos <span style={{ color: "#94A3B8" }}>/ Topping up your parents' or grandparents' phones</span></li>
            <li>Enviar recarga como regalo <span style={{ color: "#94A3B8" }}>/ Sending a top-up as a gift</span></li>
            <li>Recargar una línea de trabajo <span style={{ color: "#94A3B8" }}>/ Topping up a work line</span></li>
          </ul>

          <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.10)", margin: "40px 0" }} />

          {/* Comisión */}
          <h2 className="rec-h2" style={{ color: "#FFFFFF", fontWeight: 700, marginBottom: "6px" }}>¿Cuánto cobra PagoYa por las recargas?</h2>
          <p style={{ color: "#64748B", fontWeight: 500, marginBottom: "16px" }}>How Much Does PagoYa Charge for Top-Ups?</p>
          <p style={{ lineHeight: 1.7, marginBottom: "14px" }}>La comisión es la misma para todos los servicios: <strong style={{ color: "#1D9E75" }}>$25 MXN fijo por transacción</strong>. <span style={{ color: "#94A3B8" }}>The fee is the same for all services: $25 MXN flat per transaction.</span></p>
          <p style={{ lineHeight: 1.7, padding: "14px 18px", background: "rgba(255,255,255,0.04)", borderRadius: "8px" }}>
            Si recargas $100 MXN a Telcel, pagas $100 MXN de recarga + $25 MXN de comisión = <strong style={{ color: "#FFFFFF" }}>$125 MXN total</strong> descontados de tu billetera.{" "}
            <span style={{ color: "#94A3B8", fontSize: "14px" }}>If you top up $100 MXN to Telcel, you pay $100 MXN + $25 MXN fee = $125 MXN total deducted from your wallet.</span>
          </p>

          <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.10)", margin: "40px 0" }} />

          {/* Comparativa */}
          <h2 className="rec-h2" style={{ color: "#FFFFFF", fontWeight: 700, marginBottom: "6px" }}>Recargas PagoYa vs. recargar en OXXO directamente</h2>
          <p style={{ color: "#64748B", fontWeight: 500, marginBottom: "20px" }}>PagoYa Top-Ups vs. Topping Up Directly at OXXO</p>
          <div className="rec-table-wrap" style={{ marginBottom: "20px" }}>
            <table className="rec-table">
              <thead><tr><th></th><th>Recarga en OXXO</th><th>PagoYa</th></tr></thead>
              <tbody>
                {[
                  ["¿Necesitas ir a la tienda?", "Sí, siempre", "No"],
                  ["¿Disponible 24/7?", "Solo horario OXXO", "Sí, cualquier hora"],
                  ["¿Puedes recargar a otro número?", "Sí", "Sí"],
                  ["¿Historial de recargas?", "No", "Sí, en la app"],
                  ["¿Cuántos operadores?", "Varios (en caja)", "Telcel, AT&T, Movistar"],
                  ["¿Comisión?", "Variable por operador", "$25 MXN fijo"],
                ].map(([label, c1, c2]) => (
                  <tr key={label}>
                    <td style={{ color: "#CBD5E1", fontWeight: 500 }}>{label}</td>
                    <td style={{ color: "#94A3B8" }}>{c1}</td>
                    <td style={{ color: "#1D9E75", fontWeight: 600 }}>{c2}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.10)", margin: "40px 0" }} />

          {/* Cuánto saldo */}
          <h2 className="rec-h2" style={{ color: "#FFFFFF", fontWeight: 700, marginBottom: "6px" }}>¿Cuánto saldo necesito en mi billetera para una recarga?</h2>
          <p style={{ color: "#64748B", fontWeight: 500, marginBottom: "20px" }}>How Much Wallet Balance Do I Need for a Top-Up?</p>
          <div className="rec-table-wrap" style={{ marginBottom: "0" }}>
            <table className="rec-table">
              <thead><tr><th>Recarga</th><th>Comisión</th><th>Total billetera</th></tr></thead>
              <tbody>
                {[["$50 MXN","$25 MXN","$75 MXN"],["$100 MXN","$25 MXN","$125 MXN"],["$200 MXN","$25 MXN","$225 MXN"],["$500 MXN","$25 MXN","$525 MXN"]].map(([r, c, t]) => (
                  <tr key={r}><td style={{ color: "#CBD5E1" }}>{r}</td><td style={{ color: "#94A3B8" }}>{c}</td><td style={{ color: "#1D9E75", fontWeight: 600 }}>{t}</td></tr>
                ))}
              </tbody>
            </table>
          </div>

          <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.10)", margin: "40px 0" }} />

          {/* Cargar saldo */}
          <h2 className="rec-h2" style={{ color: "#FFFFFF", fontWeight: 700, marginBottom: "6px" }}>Cómo cargar saldo a tu billetera PagoYa con efectivo</h2>
          <p style={{ color: "#64748B", fontWeight: 500, marginBottom: "16px" }}>How to Load Your PagoYa Wallet With Cash</p>
          <p style={{ lineHeight: 1.7, marginBottom: "20px" }}>Si no tienes saldo en tu billetera, recarga con efectivo en cualquier OXXO: <span style={{ color: "#94A3B8" }}>If you don't have balance, load with cash at any OXXO:</span></p>
          {[
            { n: 1, es: 'Abre PagoYa → sección "Recargar saldo" → obtén tu código', en: 'Open PagoYa → "Recargar saldo" section → get your code' },
            { n: 2, es: "Ve al OXXO más cercano", en: "Go to the nearest OXXO" },
            { n: 3, es: "Dile al cajero que quieres depositar a tu billetera PagoYa", en: "Tell the cashier you want to deposit to your PagoYa wallet" },
            { n: 4, es: "Paga en efectivo — el saldo aparece en tu app en minutos", en: "Pay cash — balance appears in your app within minutes" },
          ].map(({ n, es, en }) => (
            <div key={n} style={{ display: "flex", gap: "16px", marginBottom: "14px", alignItems: "flex-start" }}>
              <div style={{ width: "28px", height: "28px", borderRadius: "50%", flexShrink: 0, background: "#1D9E75", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: 800 }}>{n}</div>
              <div><p style={{ margin: 0, lineHeight: 1.6 }}>{es}</p><p style={{ margin: "2px 0 0", lineHeight: 1.6, color: "#94A3B8", fontSize: "14px" }}>{en}</p></div>
            </div>
          ))}
          <p style={{ lineHeight: 1.7, padding: "14px 18px", background: "rgba(255,255,255,0.05)", borderRadius: "8px", marginTop: "16px" }}>
            <a href="/deposito-oxxo">Más detalles: Cómo depositar en OXXO paso a paso →</a>
          </p>

          <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.10)", margin: "40px 0" }} />

          {/* Otros servicios */}
          <h2 className="rec-h2" style={{ color: "#FFFFFF", fontWeight: 700, marginBottom: "16px" }}>Otros servicios que puedes pagar con PagoYa</h2>
          <ul className="rec-ul" style={{ marginBottom: "20px" }}>
            <li><a href="/pagar-cfe">CFE (recibo de luz) →</a></li>
            <li><a href="/pagar-telmex">Telmex, Izzi, Totalplay →</a></li>
            <li><a href="/pagar-renta">Renta de vivienda →</a></li>
            <li><a href="/servicios">Ver todos los servicios →</a></li>
          </ul>
          <p style={{ lineHeight: 1.7, padding: "14px 18px", background: "rgba(255,255,255,0.05)", borderRadius: "8px" }}>
            <a href="/guia-pagar-servicios-sin-cuenta-bancaria">Guía completa: Cómo pagar todos tus servicios en México sin cuenta bancaria →</a>
          </p>

          <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.10)", margin: "40px 0" }} />

          {/* FAQ */}
          <h2 className="rec-h2" style={{ color: "#FFFFFF", fontWeight: 700, marginBottom: "24px" }}>Preguntas frecuentes</h2>
          {[
            { q: "¿Cuánto tarda en aplicarse la recarga?", a: "Las recargas se aplican en segundos en la mayoría de los casos.", eq: "How long does the top-up take?", ea: "Top-ups apply within seconds in most cases." },
            { q: "¿Puedo hacer recargas automáticas o programadas?", a: "Actualmente PagoYa procesa recargas manuales bajo demanda. La función de recargas automáticas está en el roadmap.", eq: "Can I set up automatic top-ups?", ea: "Currently PagoYa processes manual on-demand top-ups. Automatic scheduled top-ups are on the roadmap." },
            { q: "¿Qué pasa si la recarga no se aplica?", a: "PagoYa usa failover automático entre proveedores. Si la recarga no se puede procesar, el saldo regresa inmediatamente a tu billetera.", eq: "What if the top-up doesn't apply?", ea: "PagoYa uses automatic failover. If the top-up cannot be processed, the balance returns immediately to your wallet." },
          ].map(({ q, a, eq, ea }) => (
            <div key={q} style={{ marginBottom: "20px", padding: "20px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "10px" }}>
              <p style={{ margin: "0 0 8px", fontWeight: 700, color: "#FFFFFF" }}>{q}</p>
              <p style={{ margin: "0 0 14px", lineHeight: 1.6 }}>{a}</p>
              <p style={{ margin: "0 0 4px", fontWeight: 600, color: "#64748B", fontSize: "14px" }}>{eq}</p>
              <p style={{ margin: 0, lineHeight: 1.6, color: "#94A3B8", fontSize: "14px" }}>{ea}</p>
            </div>
          ))}

          <hr style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.10)", margin: "40px 0" }} />

          {/* CTA */}
          <div style={{ textAlign: "center", padding: "40px 24px", background: "rgba(29,158,117,0.10)", border: "1px solid rgba(29,158,117,0.25)", borderRadius: "16px" }}>
            <h2 style={{ color: "#FFFFFF", fontWeight: 800, fontSize: "24px", marginBottom: "8px" }}>Recarga tu celular ahora</h2>
            <p style={{ color: "#CBD5E1", marginBottom: "8px" }}>Sin moverte. Sin tarjeta. Sin banco.</p>
            <p style={{ color: "#94A3B8", marginBottom: "28px" }}>Without moving. Without a card. Without a bank.</p>
            <button onClick={() => navigate("/register")} style={{ background: "#1D9E75", color: "white", border: "none", borderRadius: "12px", padding: "16px 36px", fontSize: "16px", fontWeight: 700, cursor: "pointer" }}>
              Descargar PagoYa gratis →
            </button>
            <p style={{ color: "#475569", fontSize: "12px", marginTop: "20px", lineHeight: 1.5 }}>
              PagoYa es operado por Longview Meridian Technologies. Comisión fija de $25 MXN por transacción.
            </p>
          </div>
        </article>
      </main>
    </div>
  );
}
