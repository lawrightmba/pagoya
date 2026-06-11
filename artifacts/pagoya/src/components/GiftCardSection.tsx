const GIFT_CARD_GROUPS = [
  {
    id: "entretenimiento",
    labelEs: "Entretenimiento", labelEn: "Entertainment", emoji: "🎬",
    brands: [
      { id: "netflix",     emoji: "🎬", name: "Netflix",     denominations: [
        { serviceId: "netflix_100",      amount: 100 },
        { serviceId: "netflix_300",      amount: 300 },
        { serviceId: "netflix_500",      amount: 500 },
        { serviceId: "netflix_700",      amount: 700 },
      ]},
      { id: "spotify",     emoji: "🎵", name: "Spotify",     denominations: [
        { serviceId: "spotify_79",       amount: 79 },
        { serviceId: "spotify_99",       amount: 99 },
        { serviceId: "spotify_149",      amount: 149 },
        { serviceId: "spotify_199",      amount: 199 },
      ]},
      { id: "disney_plus", emoji: "🏰", name: "Disney+",     denominations: [
        { serviceId: "disney_99",        amount: 99 },
        { serviceId: "disney_139",       amount: 139 },
        { serviceId: "disney_279",       amount: 279 },
      ]},
      { id: "hbo_max",     emoji: "🎭", name: "Max (HBO)",   denominations: [
        { serviceId: "hbo_max_169",      amount: 169 },
        { serviceId: "hbo_max_219",      amount: 219 },
        { serviceId: "hbo_max_279",      amount: 279 },
      ]},
      { id: "cinepolis",   emoji: "🎟️", name: "Cinépolis",   denominations: [
        { serviceId: "cinepolis_100",    amount: 100 },
        { serviceId: "cinepolis_140",    amount: 140 },
        { serviceId: "cinepolis_165",    amount: 165 },
        { serviceId: "cinepolis_210",    amount: 210 },
        { serviceId: "cinepolis_280",    amount: 280 },
      ]},
      { id: "gplay",       emoji: "🎮", name: "Google Play", denominations: [
        { serviceId: "google_play_50",   amount: 50 },
        { serviceId: "google_play_100",  amount: 100 },
        { serviceId: "google_play_200",  amount: 200 },
        { serviceId: "google_play_500",  amount: 500 },
      ]},
    ],
  },
  {
    id: "conveniencia",
    labelEs: "Conveniencia", labelEn: "On-the-go", emoji: "🚀",
    brands: [
      { id: "uber",        emoji: "🚗", name: "Uber",        denominations: [
        { serviceId: "uber_100",         amount: 100 },
        { serviceId: "uber_200",         amount: 200 },
        { serviceId: "uber_300",         amount: 300 },
        { serviceId: "uber_500",         amount: 500 },
      ]},
      { id: "uber_eats",   emoji: "🍔", name: "Uber Eats",   denominations: [
        { serviceId: "uber_eats_100",    amount: 100 },
        { serviceId: "uber_eats_200",    amount: 200 },
        { serviceId: "uber_eats_300",    amount: 300 },
      ]},
      { id: "amazon",      emoji: "📦", name: "Amazon",      denominations: [
        { serviceId: "amazon_100",       amount: 100 },
        { serviceId: "amazon_200",       amount: 200 },
        { serviceId: "amazon_500",       amount: 500 },
        { serviceId: "amazon_1000",      amount: 1000 },
      ]},
    ],
  },
  {
    id: "tiendas",
    labelEs: "Tiendas", labelEn: "Retail", emoji: "🛍️",
    brands: [
      { id: "liverpool",   emoji: "🛍️", name: "Liverpool",   denominations: [
        { serviceId: "liverpool_500",    amount: 500 },
        { serviceId: "liverpool_1000",   amount: 1000 },
        { serviceId: "liverpool_2000",   amount: 2000 },
        { serviceId: "liverpool_3000",   amount: 3000 },
        { serviceId: "liverpool_5000",   amount: 5000 },
      ]},
      { id: "soriana",     emoji: "🛒", name: "Soriana",     denominations: [
        { serviceId: "soriana_200",      amount: 200 },
        { serviceId: "soriana_500",      amount: 500 },
        { serviceId: "soriana_1000",     amount: 1000 },
        { serviceId: "soriana_2000",     amount: 2000 },
      ]},
      { id: "starbucks",   emoji: "☕", name: "Starbucks",   denominations: [
        { serviceId: "starbucks_100",    amount: 100 },
        { serviceId: "starbucks_200",    amount: 200 },
        { serviceId: "starbucks_300",    amount: 300 },
        { serviceId: "starbucks_500",    amount: 500 },
      ]},
    ],
  },
];

interface GiftCardSectionProps {
  lang: "es" | "en";
  onGiftCard: (serviceId: string, brandName: string, amount: number) => void;
  onNavigateAll: () => void;
}

export default function GiftCardSection({ lang, onGiftCard, onNavigateAll }: GiftCardSectionProps) {
  const es = lang === "es";
  return (
    <section style={{
      background: "linear-gradient(135deg, #FF5C1A 0%, #FF9A3C 32%, #00C875 68%, #007A4A 100%)",
      padding: "28px 20px",
      position: "relative",
      overflow: "hidden",
    }}>
      <div style={{ position: "absolute", top: -50, right: -50, width: 180, height: 180, borderRadius: "50%", background: "rgba(255,255,255,0.08)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: -40, left: -40, width: 140, height: 140, borderRadius: "50%", background: "rgba(255,255,255,0.06)", pointerEvents: "none" }} />

      <div style={{ maxWidth: "560px", margin: "0 auto", position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
          <span style={{ fontSize: "26px" }}>🎁</span>
          <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 900, color: "#FFFFFF", letterSpacing: "-0.01em" }}>
            {es ? "Gift Cards Digitales" : "Digital Gift Cards"}
          </h2>
        </div>
        <p style={{ margin: "0 0 18px", fontSize: "13px", color: "rgba(255,255,255,0.82)", lineHeight: 1.4 }}>
          {es ? "Compra al instante · PIN llega por WhatsApp 📲" : "Buy instantly · PIN sent on WhatsApp 📲"}
        </p>

        <style>{`.gc-scroll::-webkit-scrollbar{display:none}`}</style>
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          {GIFT_CARD_GROUPS.map((group) => (
            <div key={group.id}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
                <span style={{ fontSize: "13px" }}>{group.emoji}</span>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "rgba(255,255,255,0.70)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  {es ? group.labelEs : group.labelEn}
                </span>
                <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.18)", marginLeft: "4px" }} />
              </div>
              <div className="gc-scroll" style={{ display: "flex", gap: "10px", overflowX: "auto", paddingBottom: "4px" }}>
                {group.brands.map((brand) => (
                  <div key={brand.id} style={{
                    flexShrink: 0,
                    background: "rgba(255,255,255,0.15)",
                    backdropFilter: "blur(10px)",
                    border: "1px solid rgba(255,255,255,0.28)",
                    borderRadius: "16px",
                    padding: "14px 14px 12px",
                    minWidth: "140px",
                  }}>
                    <div style={{ fontSize: "24px", marginBottom: "5px", lineHeight: 1 }}>{brand.emoji}</div>
                    <div style={{ fontWeight: 800, color: "#FFFFFF", fontSize: "13px", marginBottom: "10px", lineHeight: 1.2 }}>{brand.name}</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
                      {brand.denominations.map((d) => (
                        <button
                          key={d.serviceId}
                          onClick={() => onGiftCard(d.serviceId, brand.name, d.amount)}
                          style={{
                            background: "rgba(255,255,255,0.22)",
                            border: "1px solid rgba(255,255,255,0.40)",
                            borderRadius: "999px",
                            padding: "4px 9px",
                            fontSize: "11px",
                            fontWeight: 700,
                            color: "#FFFFFF",
                            cursor: "pointer",
                            whiteSpace: "nowrap",
                            transition: "background 0.15s",
                          }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.36)"; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.22)"; }}
                        >
                          ${d.amount >= 1000 ? `${d.amount / 1000}K` : d.amount}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={onNavigateAll}
          style={{
            marginTop: "16px", width: "100%", padding: "12px",
            borderRadius: "12px", border: "1.5px solid rgba(255,255,255,0.42)",
            background: "rgba(255,255,255,0.14)", color: "#FFFFFF",
            fontSize: "14px", fontWeight: 700, cursor: "pointer",
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.22)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.14)"; }}
        >
          {es ? "Ver todas las gift cards →" : "See all gift cards →"}
        </button>

        {/* Rent vertical compact card */}
        <div style={{
          marginTop: "16px",
          background: "rgba(255,255,255,0.12)",
          border: "1px solid rgba(255,255,255,0.28)",
          borderRadius: "14px",
          padding: "14px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
        }}>
          <p style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#FFFFFF", lineHeight: 1.3 }}>
            {es ? "¿Pagas renta? 🏠" : "Pay Rent? 🏠"}
          </p>
          <a
            href="https://pagoseguromx.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              flexShrink: 0,
              background: "rgba(255,255,255,0.22)",
              color: "#FFFFFF",
              fontSize: "12px",
              fontWeight: 700,
              padding: "8px 14px",
              borderRadius: "10px",
              textDecoration: "none",
              whiteSpace: "nowrap",
              border: "1px solid rgba(255,255,255,0.35)",
            }}
          >
            {es ? "PagoSeguro →" : "PagoSeguro →"}
          </a>
        </div>
      </div>
    </section>
  );
}
