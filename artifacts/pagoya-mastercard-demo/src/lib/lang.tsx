import { createContext, useContext } from 'react';

export type Lang = 'es' | 'en';

export const translations = {
  es: {
    scene1: {
      stat: '73M',
      sub: 'mexicanos',
      label: 'sin historial crediticio',
    },
    scene2: {
      headline1: 'Paula paga en',
      headline2: '2 minutos',
      headline3: 'por WhatsApp',
      chat1: 'Hola Paula 👋\n¿Quieres pagar tu recibo CFE de $320 MXN?',
      chat2: 'Sí, pagar con saldo.',
      chat3: 'Procesando pago vía STP...',
      chat4: '✅ Pagado $320 MXN',
    },
    scene3: {
      headline: 'Cada pago construye tu',
      breakdown1title: 'Historial',
      breakdown1sub: 'Pagos a tiempo',
      breakdown2title: 'Frecuencia',
      breakdown2sub: 'Uso recurrente',
      breakdown3title: 'Consistencia',
      breakdown3sub: 'Monto promedio',
    },
    scene4: {
      headline1: 'Una',
      headline2: 'capa de datos',
      headline3: ', no solo una app',
      tagline: 'Infraestructura financiera regulada',
      node1: 'Bancos',
      node2: 'Telcos',
      node3: 'Seguros',
      node4: 'Fintechs',
    },
    scene5: {
      stat1val: '847',
      stat1label: 'Usuarios Activos',
      stat2val: '$2.1M',
      stat2label: 'MXN Procesado',
      stat3val: '94%',
      stat3label: 'Pagos a Tiempo',
      closing: 'Construyendo el historial financiero de México.',
    },
  },
  en: {
    scene1: {
      stat: '73M',
      sub: 'Mexicans',
      label: 'with no credit history',
    },
    scene2: {
      headline1: 'Paula pays in',
      headline2: '2 minutes',
      headline3: 'via WhatsApp',
      chat1: 'Hi Paula 👋\nWant to pay your CFE bill of $320 MXN?',
      chat2: 'Yes, pay with balance.',
      chat3: 'Processing payment via STP...',
      chat4: '✅ Paid $320 MXN',
    },
    scene3: {
      headline: 'Every payment builds your',
      breakdown1title: 'History',
      breakdown1sub: 'On-time payments',
      breakdown2title: 'Frequency',
      breakdown2sub: 'Recurring use',
      breakdown3title: 'Consistency',
      breakdown3sub: 'Average amount',
    },
    scene4: {
      headline1: 'A',
      headline2: 'data layer',
      headline3: ', not just an app',
      tagline: 'Regulated financial infrastructure',
      node1: 'Banks',
      node2: 'Telcos',
      node3: 'Insurers',
      node4: 'Fintechs',
    },
    scene5: {
      stat1val: '847',
      stat1label: 'Active Users',
      stat2val: '$2.1M',
      stat2label: 'MXN Processed',
      stat3val: '94%',
      stat3label: 'On-time Payments',
      closing: 'Building Mexico\'s financial history.',
    },
  },
} as const;

export type Translations = typeof translations.es;

const LangContext = createContext<Lang>('es');

export function LangProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  return <LangContext.Provider value={lang}>{children}</LangContext.Provider>;
}

export function useLang(): Translations {
  const lang = useContext(LangContext);
  return translations[lang];
}
