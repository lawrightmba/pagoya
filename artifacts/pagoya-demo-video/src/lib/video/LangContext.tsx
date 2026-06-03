import { createContext, useContext } from 'react';

export type Lang = 'en' | 'es';
export const LangContext = createContext<Lang>('es');
export const useLang = () => useContext(LangContext);
export const LangProvider = ({ lang, children }: { lang: Lang; children: React.ReactNode }) => (
  <LangContext.Provider value={lang}>{children}</LangContext.Provider>
);
