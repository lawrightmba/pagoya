import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useLocation } from "wouter";

export default function PagarCFEDesdeUSA() {
  const [, navigate] = useLocation();
  const [showSticky, setShowSticky] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowSticky(window.scrollY > 320);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://pagoyamx.com/" },
      { "@type": "ListItem", "position": 2, "name": "Pay bills from the US", "item": "https://pagoyamx.com/pagar-cfe-desde-usa" }
    ]
  };

  const article = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "How to pay your family's CFE bill from the United States",
    "description": "Pay your family's CFE electricity bill in Mexico from the US in 2 minutes. No Western Union, no Mexican bank account, US card accepted. $25 MXN flat fee.",
    "url": "https://pagoyamx.com/pagar-cfe-desde-usa",
    "datePublished": "2026-06-01",
    "publisher": { "@type": "Organization", "name": "PagoYa", "url": "https://pagoyamx.com" },
    "inLanguage": "en"
  };

  const faq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "Can I pay a CFE bill in Mexico from the United States?",
        "acceptedAnswer": { "@type": "Answer", "text": "Yes. With PagoYa you can pay any CFE electricity bill in Mexico directly from the US in under 2 minutes. You need the 10–12 digit CFE service number from your family's bill. No Mexican bank account required — load your wallet with a US debit or credit card." }
      },
      {
        "@type": "Question",
        "name": "What information do I need to pay CFE from the US?",
        "acceptedAnswer": { "@type": "Answer", "text": "You need the CFE service number (Número de Servicio or RPU) printed at the top of your family's bimestral bill. If you don't have the physical bill, your family can look it up at portalcfemx.com using the service address." }
      },
      {
        "@type": "Question",
        "name": "How does my family in Mexico know the payment went through?",
        "acceptedAnswer": { "@type": "Answer", "text": "You receive an instant payment receipt in the PagoYa app. CFE registers the payment in their system within 24–48 business hours. You can optionally share the receipt via WhatsApp with your family." }
      },
      {
        "@type": "Question",
        "name": "How much does it cost to pay CFE from the US with PagoYa?",
        "acceptedAnswer": { "@type": "Answer", "text": "PagoYa charges a flat $25 MXN service fee per transaction (approximately $1.25 USD). There are no hidden exchange rate markups. You fund your wallet in USD using your US card and PagoYa handles the conversion." }
      },
      {
        "@type": "Question",
        "name": "Can I pay other Mexican bills from the US with PagoYa?",
        "acceptedAnswer": { "@type": "Answer", "text": "Yes. PagoYa supports CFE (electricity), SADM and SACMEX (water), Telmex (internet/phone), Telcel (mobile), Izzi, and more. You can pay any of your family's Mexican utility bills from the US with the same account." }
      }
    ]
  };

  return (
    <div style={{ background: "#0A2540", minHeight: "100vh", display: "flex", flexDirection: "column", overflowX: "hidden" }}>
      <Helmet>
        <html lang="en" />
        <title>Pay CFE Bill from the USA — For Family in Mexico · 2 min | PagoYa</title>
        <meta name="description" content="Pay your family's CFE electricity bill in Mexico from the US in 2 minutes. No Western Union. No Mexican bank account. US card accepted. $25 MXN flat fee. Instant receipt." />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://pagoyamx.com/pagar-cfe-desde-usa" />
        <link rel="alternate" hrefLang="en" href="https://pagoyamx.com/pagar-cfe-desde-usa" />
        <link rel="alternate" hrefLang="es-MX" href="https://pagoyamx.com/pagar-cfe" />
        <meta name="geo.region" content="US" />
        <meta property="og:title" content="Pay CFE Bill from the USA — For Family in Mexico | PagoYa" />
        <meta property="og:description" content="Pay your family's CFE electricity bill in Mexico from the US. No Western Union. US card accepted. 2 minutes." />
        <meta property="og:image" content="https://pagoyamx.com/og-default.png" />
        <meta property="og:type" content="article" />
        <meta property="og:url" content="https://pagoyamx.com/pagar-cfe-desde-usa" />
        <script type="application/ld+json">{JSON.stringify(breadcrumb)}</script>
        <script type="application/ld+json">{JSON.stringify(article)}</script>
        <script type="application/ld+json">{JSON.stringify(faq)}</script>
      </Helmet>

      <style>{`
        .mty-body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
        .mty-body a { color: #1D9E75; text-decoration: underline; }
        .mty-h1 { font-size: clamp(26px, 5vw, 42px); }
        .mty-h2 { font-size: clamp(20px, 3.5vw, 28px); }
        .mty-table { width: 100%; border-collapse: collapse; }
        .mty-table th, .mty-table td { padding: 10px 14px; border: 1px solid rgba(255,255,255,0.12); text-align: left; vertical-align: top; }
        .mty-table th { background: rgba(29,158,117,0.18); color: #1D9E75; font-weight: 700; }
        .mty-table tr:nth-child(even) td { background: rgba(255,255,255,0.03); }
        .mty-ol { padding-left: 20px; }
        .mty-ol li { margin-bottom: 10px; line-height: 1.6; color: #CBD5E1; }
        .mty-ul { list-style: disc; padding-left: 22px; }
        .mty-ul li { margin-bottom: 6px; line-height: 1.6; color: #CBD5E1; }
        @media(max-width:640px){ .mty-table-wrap { overflow-x: auto; } .mty-body { padding: 0 16px 48px; } }
      `}</style>

      {/* Nav */}
      <nav style={{ background: "rgba(10,37,64,0.95)", borderBottom: "1px solid rgba(255,255,255,0.08)", padding: "14px 24px", display: "flex", alignItems: "center", gap: "12px", position: "sticky", top: 0, zIndex: 50, backdropFilter: "blur(8px)" }}>
        <button onClick={() => navigate("/")} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
          <img src="/pagoya-logo.png" alt="PagoYa" style={{ height: "32px" }} />
        </button>
        <span style={{ flex: 1 }} />
        <button
          onClick={() => navigate("/pagar")}
          style={{ background: "#1D9E75", color: "white", border: "none", borderRadius: "20px", padding: "8px 18px", fontWeight: 700, fontSize: "14px", cursor: "pointer" }}
        >
          Pay now
        </button>
      </nav>

      {/* Sticky bottom CTA */}
      {showSticky && (
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 100, background: "rgba(10,37,64,0.97)", borderTop: "1px solid rgba(29,158,117,0.4)", padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", backdropFilter: "blur(10px)" }}>
          <p style={{ color: "white", fontWeight: 700, fontSize: "14px", margin: 0 }}>Pay family's CFE from the US</p>
          <button onClick={() => navigate("/pagar")} style={{ background: "linear-gradient(135deg, #1D9E75, #25C090)", color: "white", border: "none", borderRadius: "20px", padding: "10px 22px", fontWeight: 800, fontSize: "14px", cursor: "pointer" }}>
            Pay CFE →
          </button>
        </div>
      )}

      {/* Hero */}
      <section style={{ padding: "56px 24px 40px", maxWidth: "760px", margin: "0 auto", width: "100%" }} className="mty-body">
        <p style={{ color: "#1D9E75", fontWeight: 700, fontSize: "13px", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "12px" }}>
          US → MX · Pay for family in Mexico
        </p>
        <h1 className="mty-h1" style={{ color: "white", fontWeight: 900, lineHeight: 1.2, marginBottom: "20px" }}>
          Pay your family's CFE<br />
          <span style={{ color: "#1D9E75" }}>from the US in 2 minutes</span>
        </h1>
        <p style={{ color: "#94A3B8", fontSize: "18px", lineHeight: 1.7, marginBottom: "32px", maxWidth: "600px" }}>
          Skip Western Union. Pay your family's <strong style={{ color: "white" }}>CFE electricity bill in Mexico</strong> directly from your phone using your US debit or credit card. No Mexican bank account needed. Instant receipt — keep the lights on for the people you love.
        </p>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <button
            onClick={() => navigate("/pagar")}
            style={{ background: "linear-gradient(135deg, #1D9E75, #25C090)", color: "white", border: "none", borderRadius: "50px", padding: "16px 32px", fontWeight: 800, fontSize: "16px", cursor: "pointer", boxShadow: "0 8px 24px rgba(29,158,117,0.4)" }}
          >
            Pay family's CFE →
          </button>
          <button
            onClick={() => navigate("/cargar")}
            style={{ background: "rgba(255,255,255,0.08)", color: "white", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "50px", padding: "16px 28px", fontWeight: 700, fontSize: "15px", cursor: "pointer" }}
          >
            Add funds first
          </button>
        </div>
      </section>

      {/* Steps */}
      <section style={{ padding: "0 24px 48px", maxWidth: "760px", margin: "0 auto", width: "100%" }} className="mty-body">
        <h2 className="mty-h2" style={{ color: "white", fontWeight: 800, marginBottom: "24px" }}>
          How to pay CFE from the US in 3 steps
        </h2>
        <ol className="mty-ol" style={{ marginBottom: "32px" }}>
          <li><strong style={{ color: "white" }}>Create your free PagoYa account.</strong> Sign up with your phone number — takes 60 seconds. Then add funds using your US Visa or Mastercard debit or credit card.</li>
          <li><strong style={{ color: "white" }}>Enter the CFE service number.</strong> Open PagoYa, tap "Pay bill", select CFE, and enter the 10–12 digit service number from your family's bimestral receipt. Don't have the bill? Your family can find it at portalcfemx.com.</li>
          <li><strong style={{ color: "white" }}>Confirm and done.</strong> Payment processes instantly. You get a receipt on screen — share it with your family via WhatsApp so they know it's handled. CFE updates their system in 24–48 business hours.</li>
        </ol>

        {/* Feature pills */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", marginBottom: "40px" }}>
          {[
            { icon: "🇺🇸", title: "US card accepted", desc: "Visa & Mastercard debit/credit" },
            { icon: "⚡", title: "2 minutes", desc: "start to finish" },
            { icon: "🏦", title: "No Mexican bank", desc: "account required" },
            { icon: "🧾", title: "Instant receipt", desc: "share with family via WhatsApp" },
          ].map(f => (
            <div key={f.title} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "16px", padding: "18px 16px" }}>
              <p style={{ fontSize: "24px", marginBottom: "6px" }}>{f.icon}</p>
              <p style={{ color: "white", fontWeight: 800, fontSize: "15px", marginBottom: "2px" }}>{f.title}</p>
              <p style={{ color: "#94A3B8", fontSize: "13px" }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Comparison table */}
      <section style={{ padding: "0 24px 48px", maxWidth: "760px", margin: "0 auto", width: "100%" }} className="mty-body">
        <h2 className="mty-h2" style={{ color: "white", fontWeight: 800, marginBottom: "20px" }}>
          PagoYa vs other options from the US
        </h2>
        <div className="mty-table-wrap">
          <table className="mty-table" style={{ color: "#CBD5E1", fontSize: "14px", marginBottom: "24px" }}>
            <thead>
              <tr><th>Option</th><th>Speed</th><th>Fee</th><th>Requires</th></tr>
            </thead>
            <tbody>
              <tr><td><strong style={{ color: "#1D9E75" }}>PagoYa (recommended)</strong></td><td>2 min</td><td>$25 MXN (~$1.25 USD)</td><td>Just your phone</td></tr>
              <tr><td>Western Union</td><td>1–2 days</td><td>$5–$15 USD</td><td>Family must pick up cash &amp; pay separately</td></tr>
              <tr><td>Wire transfer to family</td><td>1–3 days</td><td>$15–$35 USD</td><td>Family needs Mexican bank account</td></tr>
              <tr><td>Zelle → family pays</td><td>Minutes (if eligible)</td><td>Varies</td><td>Both parties need US bank accounts</td></tr>
              <tr><td>CFE portal (portalcfemx.com)</td><td>Instant</td><td>Variable</td><td>Mexican credit/debit card</td></tr>
            </tbody>
          </table>
        </div>

        <h2 className="mty-h2" style={{ color: "white", fontWeight: 800, marginBottom: "20px" }}>
          Service details
        </h2>
        <div className="mty-table-wrap">
          <table className="mty-table" style={{ color: "#CBD5E1", fontSize: "14px", marginBottom: "32px" }}>
            <thead>
              <tr><th>Detail</th><th>Information</th></tr>
            </thead>
            <tbody>
              <tr><td>Utility covered</td><td>CFE — Comisión Federal de Electricidad (all divisions across Mexico)</td></tr>
              <tr><td>Coverage</td><td>All 32 Mexican states — Monterrey, CDMX, Guadalajara, Puerto Vallarta, and more</td></tr>
              <tr><td>Payment methods</td><td>US Visa / Mastercard debit or credit card</td></tr>
              <tr><td>Service fee</td><td>$25 MXN flat per transaction (approx. $1.25 USD)</td></tr>
              <tr><td>Receipt</td><td>Instant digital receipt — shareable via WhatsApp</td></tr>
              <tr><td>CFE processing time</td><td>Instant payment · CFE updates in 24–48 business hours</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ padding: "0 24px 48px", maxWidth: "760px", margin: "0 auto", width: "100%" }} className="mty-body">
        <h2 className="mty-h2" style={{ color: "white", fontWeight: 800, marginBottom: "24px" }}>
          Frequently asked questions — pay CFE from the US
        </h2>
        {[
          { q: "Can I pay a CFE bill in Mexico from the United States?", a: "Yes. With PagoYa you can pay any CFE electricity bill in Mexico directly from the US in under 2 minutes. You need the 10–12 digit CFE service number from your family's bill. No Mexican bank account required — load your wallet with a US debit or credit card." },
          { q: "What information do I need to pay CFE from the US?", a: "You need the CFE service number (Número de Servicio or RPU) printed at the top of your family's bimestral bill. If you don't have the physical bill, your family can look it up at portalcfemx.com using the service address." },
          { q: "How does my family in Mexico know the payment went through?", a: "You receive an instant payment receipt in the PagoYa app. CFE registers the payment in their system within 24–48 business hours. You can share the receipt via WhatsApp with your family so they know it's handled." },
          { q: "How much does it cost to pay CFE from the US with PagoYa?", a: "PagoYa charges a flat $25 MXN service fee per transaction (approximately $1.25 USD). There are no hidden exchange rate markups. You fund your wallet in USD using your US card and PagoYa handles the conversion." },
          { q: "Can I pay other Mexican bills from the US with PagoYa?", a: "Yes. PagoYa supports CFE (electricity), SADM and SACMEX (water), Telmex (internet/phone), Telcel (mobile), Izzi, and more. You can pay any of your family's Mexican utility bills from the US with the same account." },
        ].map((item, i) => (
          <div key={i} style={{ marginBottom: "20px", borderBottom: "1px solid rgba(255,255,255,0.07)", paddingBottom: "20px" }}>
            <p style={{ color: "white", fontWeight: 700, fontSize: "16px", marginBottom: "8px" }}>❓ {item.q}</p>
            <p style={{ color: "#94A3B8", lineHeight: 1.7, fontSize: "15px" }}>{item.a}</p>
          </div>
        ))}
      </section>

      {/* Other bills you can pay */}
      <section style={{ padding: "0 24px 40px", maxWidth: "760px", margin: "0 auto", width: "100%" }} className="mty-body">
        <h2 className="mty-h2" style={{ color: "white", fontWeight: 800, marginBottom: "16px" }}>Other Mexican bills you can pay from the US</h2>
        <ul className="mty-ul">
          <li><a href="/pagar-agua-monterrey">Pay SADM water bill (Monterrey) from the US</a></li>
          <li><a href="/pagar-cfe">Pay CFE electricity — all states</a></li>
          <li><a href="/pagar-telmex">Pay Telmex internet &amp; landline</a></li>
          <li><a href="/guia-pagar-servicios-sin-cuenta-bancaria">Full guide: paying Mexican bills without a bank account</a></li>
        </ul>
      </section>

      {/* Final CTA */}
      <section style={{ padding: "0 24px 64px", maxWidth: "760px", margin: "0 auto", width: "100%", textAlign: "center" }} className="mty-body">
        <div style={{ background: "linear-gradient(135deg, rgba(29,158,117,0.15), rgba(29,158,117,0.05))", border: "1px solid rgba(29,158,117,0.3)", borderRadius: "24px", padding: "40px 24px" }}>
          <p style={{ fontSize: "32px", marginBottom: "12px" }}>🏠</p>
          <h2 style={{ color: "white", fontWeight: 900, fontSize: "22px", marginBottom: "10px" }}>
            Keep the lights on for your family
          </h2>
          <p style={{ color: "#94A3B8", fontSize: "15px", marginBottom: "28px", lineHeight: 1.6 }}>
            Pay from the US in 2 minutes.<br />No Western Union. No bank account. Just your phone.
          </p>
          <button
            onClick={() => navigate("/pagar")}
            style={{ background: "linear-gradient(135deg, #1D9E75, #25C090)", color: "white", border: "none", borderRadius: "50px", padding: "16px 36px", fontWeight: 800, fontSize: "16px", cursor: "pointer", boxShadow: "0 8px 24px rgba(29,158,117,0.4)" }}
          >
            Pay family's CFE →
          </button>
          <p style={{ color: "#64748B", fontSize: "12px", marginTop: "14px" }}>
            Free account · $25 MXN service fee · Instant receipt
          </p>
        </div>
      </section>
    </div>
  );
}
