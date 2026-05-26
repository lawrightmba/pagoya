import { useEffect } from "react";

export default function FounderBio() {
  useEffect(() => {
    document.title = "Lloyd A. Wright, MBA — Founder & Fintech Entrepreneur";
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Barlow+Condensed:wght@600;700;800&display=swap');

        .bio-root * { box-sizing: border-box; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 0 0 rgba(29,158,117,0.0); }
          50%       { box-shadow: 0 0 28px 4px rgba(29,158,117,0.22); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-6px); }
        }

        .bio-hero-name {
          font-family: 'Barlow Condensed', sans-serif;
          font-size: clamp(42px, 9vw, 76px);
          font-weight: 800;
          letter-spacing: -0.01em;
          line-height: 1;
          background: linear-gradient(135deg, #ffffff 0%, #a8f0d8 50%, #1D9E75 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: shimmer 4s linear infinite, fadeUp 0.7s ease both;
        }
        .bio-venture-card {
          transition: transform 0.25s ease, box-shadow 0.25s ease;
        }
        .bio-venture-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 20px 48px rgba(0,0,0,0.45);
        }
        .bio-exp-row {
          transition: background 0.2s;
          cursor: default;
        }
        .bio-exp-row:hover {
          background: rgba(29,158,117,0.06) !important;
        }
        .bio-link-btn {
          transition: transform 0.18s ease, background 0.18s ease;
        }
        .bio-link-btn:hover {
          transform: translateY(-2px);
        }
        .bio-stat-card {
          animation: float 4s ease-in-out infinite;
        }
        .bio-stat-card:nth-child(2) { animation-delay: 0.5s; }
        .bio-stat-card:nth-child(3) { animation-delay: 1s; }
        .bio-stat-card:nth-child(4) { animation-delay: 1.5s; }
      `}</style>

      <div className="bio-root" style={{
        background: "linear-gradient(160deg, #060e1c 0%, #0A2540 40%, #071830 100%)",
        minHeight: "100vh",
        fontFamily: "'DM Sans', -apple-system, sans-serif",
        color: "#e8f0ff",
        overflowX: "hidden",
      }}>

        {/* ── HERO ── */}
        <section style={{
          padding: "56px 24px 40px",
          maxWidth: 720,
          margin: "0 auto",
          animation: "fadeUp 0.6s ease both",
        }}>

          {/* Eyebrow badge */}
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: "rgba(29,158,117,0.15)",
            border: "1px solid rgba(29,158,117,0.4)",
            borderRadius: 100,
            padding: "5px 14px",
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: "0.08em",
            color: "#1D9E75",
            textTransform: "uppercase",
            marginBottom: 20,
            animation: "fadeIn 0.5s ease both",
          }}>
            <span style={{ fontSize: 16 }}>🇲🇽</span>
            Fintech Founder · Houston, TX
          </div>

          <h1 className="bio-hero-name">Lloyd A. Wright</h1>

          <p style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: "clamp(18px, 4vw, 26px)",
            fontWeight: 600,
            color: "rgba(255,255,255,0.55)",
            letterSpacing: "0.04em",
            marginTop: 6,
            marginBottom: 24,
            animation: "fadeUp 0.7s 0.1s ease both",
          }}>
            MBA · Serial Entrepreneur · Community Builder
          </p>

          {/* Contact pill row */}
          <div style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
            marginBottom: 36,
            animation: "fadeUp 0.7s 0.2s ease both",
          }}>
            {[
              { icon: "📍", text: "Houston, TX" },
              { icon: "📞", text: "(713) 805-2626", href: "tel:+17138052626" },
              { icon: "✉️", text: "lawrightmba@me.com", href: "mailto:lawrightmba@me.com" },
            ].map(({ icon, text, href }) => (
              <a key={text} href={href || undefined} style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 100,
                padding: "6px 14px",
                fontSize: 13,
                fontWeight: 500,
                color: href ? "#a8d8ff" : "rgba(255,255,255,0.65)",
                textDecoration: "none",
              }}>
                <span>{icon}</span>
                {text}
              </a>
            ))}
          </div>

          {/* Stats row */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
            gap: 12,
            animation: "fadeUp 0.7s 0.3s ease both",
          }}>
            {[
              { value: "30+", label: "Years Experience" },
              { value: "$20M+", label: "Capital Raised" },
              { value: "$50M+", label: "Revenue Led" },
              { value: "2", label: "Live Fintech Apps" },
            ].map(({ value, label }) => (
              <div key={label} className="bio-stat-card" style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(29,158,117,0.2)",
                borderRadius: 14,
                padding: "16px 12px",
                textAlign: "center",
              }}>
                <div style={{
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: 28,
                  fontWeight: 800,
                  color: "#1D9E75",
                  lineHeight: 1,
                }}>{value}</div>
                <div style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "rgba(255,255,255,0.45)",
                  marginTop: 4,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}>{label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── CURRENT VENTURES ── */}
        <section style={{
          padding: "0 24px 48px",
          maxWidth: 720,
          margin: "0 auto",
          animation: "fadeUp 0.7s 0.4s ease both",
        }}>
          <SectionLabel>Current Ventures</SectionLabel>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* PagoYa */}
            <div className="bio-venture-card" style={{
              background: "linear-gradient(135deg, #0d2d4a 0%, #0a2038 100%)",
              border: "1px solid rgba(29,158,117,0.5)",
              borderRadius: 20,
              padding: "24px 24px 20px",
              animation: "pulse-glow 3s ease-in-out infinite",
              position: "relative",
              overflow: "hidden",
            }}>
              <div style={{
                position: "absolute", top: -40, right: -40,
                width: 120, height: 120,
                background: "radial-gradient(circle, rgba(29,158,117,0.18) 0%, transparent 70%)",
                borderRadius: "50%",
              }} />
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <div style={{
                      background: "#1D9E75",
                      borderRadius: 10,
                      width: 40, height: 40,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 20,
                      flexShrink: 0,
                    }}>💳</div>
                    <div>
                      <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 24, fontWeight: 800, color: "#fff", lineHeight: 1 }}>PagoYa</div>
                      <div style={{ fontSize: 12, color: "#1D9E75", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>Founder & CEO · 2024–Present</div>
                    </div>
                  </div>
                  <p style={{ fontSize: 14, lineHeight: 1.6, color: "rgba(255,255,255,0.72)", maxWidth: 480 }}>
                    Mobile-first fintech platform serving Mexico's 60M+ underbanked population. Users pay CFE, Telmex, OXXO, and 200+ billers instantly via digital wallet — no bank account required. Powered by SIPREL, Conekta, and OXXO Pay rails.
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
                    {["React 19", "Node.js", "SIPREL API", "OXXO Pay", "Conekta", "AI (Paula)"].map(t => (
                      <span key={t} style={{
                        background: "rgba(29,158,117,0.15)",
                        border: "1px solid rgba(29,158,117,0.3)",
                        borderRadius: 6,
                        padding: "3px 9px",
                        fontSize: 11,
                        fontWeight: 600,
                        color: "#4fd6a8",
                      }}>{t}</span>
                    ))}
                  </div>
                </div>
                <a href="https://pagoyamx.com" target="_blank" rel="noopener noreferrer" className="bio-link-btn" style={{
                  background: "#1D9E75",
                  color: "#fff",
                  border: "none",
                  borderRadius: 10,
                  padding: "10px 20px",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}>Live App →</a>
              </div>
            </div>

            {/* PagoSeguro */}
            <div className="bio-venture-card" style={{
              background: "linear-gradient(135deg, #2a1a0e 0%, #1e1208 100%)",
              border: "1px solid rgba(216,90,48,0.45)",
              borderRadius: 20,
              padding: "24px 24px 20px",
              position: "relative",
              overflow: "hidden",
            }}>
              <div style={{
                position: "absolute", top: -40, right: -40,
                width: 120, height: 120,
                background: "radial-gradient(circle, rgba(216,90,48,0.15) 0%, transparent 70%)",
                borderRadius: "50%",
              }} />
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <div style={{
                      background: "#D85A30",
                      borderRadius: 10,
                      width: 40, height: 40,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 20,
                      flexShrink: 0,
                    }}>🏠</div>
                    <div>
                      <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 24, fontWeight: 800, color: "#fff", lineHeight: 1 }}>PagoSeguro</div>
                      <div style={{ fontSize: 12, color: "#D85A30", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>Co-Founder · 2024–Present</div>
                    </div>
                  </div>
                  <p style={{ fontSize: 14, lineHeight: 1.6, color: "rgba(255,255,255,0.72)", maxWidth: 480 }}>
                    Digital rent payment platform for Mexico's expat landlord market — Puerto Vallarta, Los Cabos, and CDMX. Enables foreign property owners to collect rent digitally via SPEI and OXXO, eliminating cash dependency and FX friction.
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
                    {["PropTech", "SPEI", "OXXO Pay", "Expat Market", "Mexico RE"].map(t => (
                      <span key={t} style={{
                        background: "rgba(216,90,48,0.15)",
                        border: "1px solid rgba(216,90,48,0.3)",
                        borderRadius: 6,
                        padding: "3px 9px",
                        fontSize: 11,
                        fontWeight: 600,
                        color: "#f0956a",
                      }}>{t}</span>
                    ))}
                  </div>
                </div>
                <a href="https://pagoseguromx.com" target="_blank" rel="noopener noreferrer" className="bio-link-btn" style={{
                  background: "#D85A30",
                  color: "#fff",
                  border: "none",
                  borderRadius: 10,
                  padding: "10px 20px",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                  flexShrink: 0,
                }}>Live App →</a>
              </div>
            </div>
          </div>
        </section>

        {/* ── ABOUT ── */}
        <section style={{
          padding: "0 24px 48px",
          maxWidth: 720,
          margin: "0 auto",
          animation: "fadeUp 0.7s 0.5s ease both",
        }}>
          <SectionLabel>About</SectionLabel>
          <p style={{ fontSize: 15, lineHeight: 1.75, color: "rgba(255,255,255,0.72)" }}>
            Serial entrepreneur and university program director with over 30 years at the intersection of entrepreneurship, academic leadership, and economic development. Built and led university-based programs at the University of Houston and Prairie View A&M University. Secured more than $20 million in venture capital and private equity across multiple industries. Currently building two fintech companies focused on financial inclusion in Mexico — bringing digital payment infrastructure to communities historically left out of the banking system.
          </p>
        </section>

        {/* ── EXPERIENCE ── */}
        <section style={{
          padding: "0 24px 48px",
          maxWidth: 720,
          margin: "0 auto",
          animation: "fadeUp 0.7s 0.55s ease both",
        }}>
          <SectionLabel>Selected Experience</SectionLabel>
          <div style={{
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 16,
            overflow: "hidden",
          }}>
            {[
              {
                role: "Community Outreach Director",
                org: "Office of Texas State Senator Borris Miles",
                period: "2025–Present",
                note: "Economic development liaison; connects small businesses to government programs and funding.",
              },
              {
                role: "Principal",
                org: "Longview Meridian & Longview Realty",
                period: "2024–Present",
                note: "Strategic advisory across real estate, international markets, and economic development.",
              },
              {
                role: "Owner",
                org: "TULUM HTX — Houston, TX",
                period: "2022–2024",
                note: "Built high-concept restaurant/bar; 18-person team, $3M annual revenue.",
              },
              {
                role: "Founder & Owner",
                org: "Sin Semilla Health & Wellness — Puerto Vallarta",
                period: "2020–2024",
                note: "Puerto Vallarta's first licensed health & wellness dispensary; $2M+ revenue in year one.",
              },
              {
                role: "Director, SBDC",
                org: "Prairie View A&M University",
                period: "2018–2020",
                note: "Senior small business counselor; led economic development across Grimes and Waller Counties.",
              },
              {
                role: "Partner / VP",
                org: "4W Solutions, Inc. — Management Consulting",
                period: "2005–2018",
                note: "$20M+ VC/PE secured for startups; $50M+ gross revenues across technology, medical, and energy.",
              },
              {
                role: "Adjunct Professor",
                org: "University of Houston / Houston Christian University",
                period: "2014–2018",
                note: "Entrepreneurship, leadership, and small business — undergraduate instruction.",
              },
              {
                role: "Director, PTAC",
                org: "University of Houston SBDC",
                period: "2003–2005",
                note: "Grew DoD contract awards from $6M to $20M+; secured $50M+ for HBCUs.",
              },
            ].map(({ role, org, period, note }, i) => (
              <div key={role} className="bio-exp-row" style={{
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: "4px 16px",
                padding: "16px 20px",
                borderBottom: i < 7 ? "1px solid rgba(255,255,255,0.06)" : "none",
              }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{role}</div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", marginTop: 1 }}>{org}</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.38)", marginTop: 3, lineHeight: 1.5 }}>{note}</div>
                </div>
                <div style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#1D9E75",
                  whiteSpace: "nowrap",
                  paddingTop: 2,
                }}>{period}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── EDUCATION ── */}
        <section style={{
          padding: "0 24px 48px",
          maxWidth: 720,
          margin: "0 auto",
          animation: "fadeUp 0.7s 0.6s ease both",
        }}>
          <SectionLabel>Education</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { degree: "Executive MBA", school: "Jones Graduate School of Business, Rice University", icon: "🎓" },
              { degree: "Master's Certificate, Minority Business Entrepreneurship", school: "Darden School of Business, University of Virginia", icon: "📜" },
              { degree: "BBA, International Business Finance", school: "Howard University · Washington, DC", icon: "🏛️" },
            ].map(({ degree, school, icon }) => (
              <div key={degree} style={{
                display: "flex",
                gap: 14,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 14,
                padding: "16px 18px",
                alignItems: "center",
              }}>
                <div style={{ fontSize: 28, flexShrink: 0 }}>{icon}</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{degree}</div>
                  <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", marginTop: 2 }}>{school}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── LINKS ── */}
        <section style={{
          padding: "0 24px 56px",
          maxWidth: 720,
          margin: "0 auto",
          animation: "fadeUp 0.7s 0.65s ease both",
        }}>
          <SectionLabel>Links & Resources</SectionLabel>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
            {[
              { label: "PagoYa App", icon: "💳", href: "https://pagoyamx.com", color: "#1D9E75" },
              { label: "PagoSeguro App", icon: "🏠", href: "https://pagoseguromx.com", color: "#D85A30" },
              { label: "Pitch Deck", icon: "📊", href: "/deck", color: "#5b8def" },
              { label: "Demo Video", icon: "▶️", href: "/video", color: "#8b5cf6" },
              { label: "Email", icon: "✉️", href: "mailto:lawrightmba@me.com", color: "#64748b" },
              { label: "Phone", icon: "📞", href: "tel:+17138052626", color: "#64748b" },
            ].map(({ label, icon, href, color }) => (
              <a key={label} href={href} target={href.startsWith("http") ? "_blank" : undefined}
                rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
                className="bio-link-btn"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  background: "rgba(255,255,255,0.04)",
                  border: `1px solid ${color}44`,
                  borderRadius: 12,
                  padding: "14px 16px",
                  textDecoration: "none",
                  color: "#fff",
                  fontSize: 13,
                  fontWeight: 600,
                }}>
                <span style={{ fontSize: 20 }}>{icon}</span>
                {label}
              </a>
            ))}
          </div>
        </section>

        {/* ── FOOTER ── */}
        <footer style={{
          borderTop: "1px solid rgba(255,255,255,0.07)",
          padding: "24px",
          textAlign: "center",
          fontSize: 12,
          color: "rgba(255,255,255,0.25)",
          maxWidth: 720,
          margin: "0 auto",
        }}>
          <div style={{ marginBottom: 4 }}>
            <span style={{ color: "#1D9E75", fontWeight: 700 }}>pagoyamx.com/lloyd</span>
            {" · "}Lloyd A. Wright, MBA
          </div>
          <div>Houston, TX · lawrightmba@me.com · (713) 805-2626</div>
        </footer>

      </div>
    </>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 10,
      marginBottom: 16,
    }}>
      <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg, rgba(29,158,117,0.5), transparent)" }} />
      <span style={{
        fontFamily: "'Barlow Condensed', sans-serif",
        fontSize: 13,
        fontWeight: 700,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: "#1D9E75",
      }}>{children}</span>
      <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg, transparent, rgba(29,158,117,0.5))" }} />
    </div>
  );
}
