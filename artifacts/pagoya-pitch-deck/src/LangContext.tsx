import { createContext, useContext, useState } from "react";

type Lang = "es" | "en";

interface LangCtx {
  lang: Lang;
  es: boolean;
  toggle: () => void;
}

const LangContext = createContext<LangCtx>({
  lang: "es",
  es: true,
  toggle: () => {},
});

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>("es");
  const toggle = () => setLang((l) => (l === "es" ? "en" : "es"));
  return (
    <LangContext.Provider value={{ lang, es: lang === "es", toggle }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang(): LangCtx {
  return useContext(LangContext);
}
