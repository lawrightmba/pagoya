function StepRow({ number, icon, es, en, lang }: { number: number; icon: string; es: string; en: string; lang: "es" | "en" }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: "14px" }}>
      <div style={{
        width: "30px", height: "30px", borderRadius: "50%", flexShrink: 0,
        background: "#007A4A", color: "white",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "13px", fontWeight: 800,
      }}>
        {number}
      </div>
      <div>
        <span style={{ fontSize: "18px", marginRight: "6px" }}>{icon}</span>
        <span style={{ fontSize: "14px", color: "#0D2618", fontWeight: 500 }}>
          {lang === "es" ? es : en}
        </span>
      </div>
    </div>
  );
}

export default function HowItWorksSection({ lang }: { lang: "es" | "en" }) {
  return (
    <section style={{ padding: "28px 24px 28px", background: "#F4FBF7" }}>
      <div
        className="hero-steps"
        style={{ maxWidth: "600px", margin: "0 auto", display: "flex", justifyContent: "center" }}
      >
        <StepRow number={1} icon="✍️"
          es="Escribe qué quieres pagar"
          en="Type what you want to pay"
          lang={lang}
        />
        <StepRow number={2} icon="🤖"
          es="Nuestra IA llena el formulario"
          en="Our AI fills the form"
          lang={lang}
        />
        <StepRow number={3} icon="✅"
          es="Confirma y listo en 2 min"
          en="Confirm and done in 2 min"
          lang={lang}
        />
      </div>
    </section>
  );
}
