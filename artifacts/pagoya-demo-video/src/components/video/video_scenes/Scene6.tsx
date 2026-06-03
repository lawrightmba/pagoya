import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Banknote, CreditCard, Zap } from 'lucide-react';
import { useLang } from '@/lib/video/LangContext';

const C = '#00C875';
const O = '#FF5C1A';

export function Scene6() {
  const lang = useLang();
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 300);
    const t2 = setTimeout(() => setPhase(2), 1500);
    const t3 = setTimeout(() => setPhase(3), 4000);
    return () => [t1, t2, t3].forEach(clearTimeout);
  }, []);

  const methods = lang === 'en' ? [
    {
      icon: <Banknote size={20} />,
      label: 'Cash at OXXO',
      sub: '+19,000 stores · barcode printout',
      badge: null,
      color: O,
    },
    {
      icon: <CreditCard size={20} />,
      label: 'Debit / Credit Card',
      sub: 'Visa · Mastercard',
      badge: '✅ Stripe Live — May 31, 2026',
      color: C,
    },
    {
      icon: <Zap size={20} />,
      label: 'SPEI Bank Transfer',
      sub: 'Virtual CLABE · instant settlement',
      badge: lang === 'en' ? '🔜 Coming soon' : '🔜 Próximamente',
      color: '#818CF8',
    },
  ] : [
    {
      icon: <Banknote size={20} />,
      label: 'Efectivo en OXXO',
      sub: '+19,000 tiendas · código de barras',
      badge: null,
      color: O,
    },
    {
      icon: <CreditCard size={20} />,
      label: 'Tarjeta de débito / crédito',
      sub: 'Visa · Mastercard',
      badge: '✅ Stripe Activo — 31 mayo 2026',
      color: C,
    },
    {
      icon: <Zap size={20} />,
      label: 'Transferencia SPEI',
      sub: 'CLABE virtual · liquidación instantánea',
      badge: '🔜 Próximamente',
      color: '#818CF8',
    },
  ];

  return (
    <motion.div
      className="absolute inset-0 overflow-hidden"
      style={{ background: 'linear-gradient(140deg, #004F2D 0%, #005432 100%)' }}
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.45 }}
    >
      <motion.div
        className="absolute bottom-[5%] right-[5%] w-[45vw] h-[45vw] rounded-full blur-[130px] opacity-[0.12] pointer-events-none"
        style={{ background: O }}
        animate={{ scale: [1, 1.25, 1] }}
        transition={{ duration: 11, repeat: Infinity }}
      />

      <div className="absolute inset-0 flex flex-col justify-center pl-[8vw]" style={{ width: '46vw' }}>
        <motion.div
          className="inline-flex self-start items-center gap-2 px-3 py-1.5 rounded-full mb-6"
          style={{ background: `${O}18`, border: `1px solid ${O}40` }}
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: phase >= 1 ? 1 : 0, x: phase >= 1 ? 0 : -16 }}
          transition={{ duration: 0.5 }}
        >
          <span style={{ fontFamily: 'var(--font-body)', color: O, fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            03 — {lang === 'en' ? 'Funding Channels' : 'Canales de Pago'}
          </span>
        </motion.div>

        <div className="overflow-hidden mb-4">
          <motion.h2
            style={{ fontFamily: 'var(--font-display)', fontWeight: 900, color: 'white', lineHeight: 1.15, fontSize: 'clamp(30px, 3.8vw, 58px)' }}
            initial={{ y: '110%' }}
            animate={{ y: phase >= 1 ? '0%' : '110%' }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          >
            {lang === 'en' ? <>Pay<br /><span style={{ color: O }}>your way</span></> : <>Paga<br /><span style={{ color: O }}>como quieras</span></>}
          </motion.h2>
        </div>

        <motion.p
          style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.55)', fontSize: 'clamp(13px, 1.25vw, 18px)', lineHeight: 1.5, marginBottom: '1.6rem' }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: phase >= 1 ? 1 : 0, y: phase >= 1 ? 0 : 10 }}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          {lang === 'en'
            ? 'No bank account required. Every channel is reachable by an underbanked user.'
            : 'Sin cuenta bancaria requerida. Todos los canales accesibles para el usuario no bancarizado.'}
        </motion.p>

        {methods.map((item, i) => (
          <motion.div
            key={i}
            className="flex flex-col rounded-2xl px-4 py-3 mb-3"
            style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid rgba(255,255,255,0.08)` }}
            initial={{ opacity: 0, x: -18 }}
            animate={{ opacity: phase >= 2 ? 1 : 0, x: phase >= 2 ? 0 : -18 }}
            transition={{ duration: 0.5, delay: 0.1 * i }}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl shrink-0" style={{ background: `${item.color}18`, color: item.color }}>
                {item.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p style={{ fontFamily: 'var(--font-body)', color: 'white', fontWeight: 700, fontSize: 'clamp(12px, 1.1vw, 15px)' }}>{item.label}</p>
                <p style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.45)', fontSize: 'clamp(10px, 0.82vw, 12px)' }}>{item.sub}</p>
              </div>
            </div>
            {item.badge && (
              <motion.div
                className="mt-2 self-start px-3 py-1 rounded-full"
                style={{ background: `${item.color}15`, border: `1px solid ${item.color}40` }}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: phase >= 3 ? 1 : 0, scale: phase >= 3 ? 1 : 0.85 }}
                transition={{ duration: 0.4, delay: 0.05 * i }}
              >
                <span style={{ fontFamily: 'var(--font-body)', color: item.color, fontSize: 'clamp(9px, 0.75vw, 11px)', fontWeight: 700 }}>{item.badge}</span>
              </motion.div>
            )}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
