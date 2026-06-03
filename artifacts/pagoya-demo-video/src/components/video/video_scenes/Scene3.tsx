import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import logoPng from '@assets/pagoya_logo_transparent.png';
import { useLang } from '@/lib/video/LangContext';

const C = '#00C875';

export function Scene3() {
  const lang = useLang();
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 200),
      setTimeout(() => setPhase(2), 900),
      setTimeout(() => setPhase(3), 1900),
      setTimeout(() => setPhase(4), 3200),
      setTimeout(() => setPhase(5), 5000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const badges = lang === 'en' ? [
    { label: '+500 services', color: C },
    { label: 'OXXO · Stripe · SPEI', color: '#E8631A' },
    { label: 'Native AI · Paula', color: '#818CF8' },
    { label: 'Gift Cards', color: '#F59E0B' },
  ] : [
    { label: '+500 servicios', color: C },
    { label: 'OXXO · Stripe · SPEI', color: '#E8631A' },
    { label: 'IA Nativa · Paula', color: '#818CF8' },
    { label: 'Tarjetas de regalo', color: '#F59E0B' },
  ];

  return (
    <motion.div
      className="absolute inset-0 overflow-hidden flex flex-col items-center justify-center"
      style={{ background: '#071C2E' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(ellipse 80% 70% at 50% 50%, rgba(0,200,117,0.18) 0%, transparent 70%)` }}
        initial={{ opacity: 0 }} animate={{ opacity: phase >= 1 ? 1 : 0 }}
        transition={{ duration: 1.5 }} />
      <motion.div className="absolute inset-0 pointer-events-none"
        style={{ backgroundImage: `radial-gradient(circle, rgba(0,200,117,0.15) 1px, transparent 1px)`, backgroundSize: '48px 48px' }}
        initial={{ opacity: 0 }} animate={{ opacity: phase >= 1 ? 0.5 : 0 }}
        transition={{ duration: 1.2 }} />

      {phase >= 1 && (
        <motion.div className="flex flex-col items-center relative z-10"
          initial={{ clipPath: 'circle(0% at 50% 50%)' }}
          animate={{ clipPath: 'circle(100% at 50% 50%)' }}
          transition={{ duration: 1.0, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.div className="mb-6"
            initial={{ scale: 0.75, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <img src={logoPng} alt="PagoYa" style={{ height: 'clamp(48px, 6vh, 84px)', width: 'auto', filter: 'drop-shadow(0 4px 16px rgba(0,0,0,0.5))' }} />
          </motion.div>

          <div className="overflow-hidden mb-3">
            <motion.h1
              style={{ fontFamily: 'var(--font-display)', fontWeight: 900, letterSpacing: '-0.03em', color: 'white', textAlign: 'center', fontSize: 'clamp(44px, 6.5vw, 96px)' }}
              initial={{ y: '110%' }}
              animate={{ y: phase >= 2 ? '0%' : '110%' }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            >
              {lang === 'en' ? <>Pay in{' '}<motion.span style={{ color: C, display: 'inline-block' }} animate={phase >= 3 ? { scale: [1, 1.08, 1] } : {}} transition={{ duration: 0.4 }}>2 minutes</motion.span></> : <>Paga en{' '}<motion.span style={{ color: C, display: 'inline-block' }} animate={phase >= 3 ? { scale: [1, 1.08, 1] } : {}} transition={{ duration: 0.4 }}>2 minutos</motion.span></>}
            </motion.h1>
          </div>

          <motion.p
            style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.55)', fontWeight: 400, textAlign: 'center', fontSize: 'clamp(16px, 1.8vw, 26px)' }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: phase >= 3 ? 1 : 0, y: phase >= 3 ? 0 : 10 }}
            transition={{ duration: 0.55 }}
          >
            {lang === 'en' ? 'No lines. No bank. No hassle.' : 'Sin colas. Sin banco. Sin complicaciones.'}
          </motion.p>

          <motion.div className="flex items-center gap-3 mt-8 flex-wrap justify-center"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: phase >= 4 ? 1 : 0, y: phase >= 4 ? 0 : 16 }}
            transition={{ duration: 0.5 }}
          >
            {badges.map((badge, i) => (
              <motion.div key={i} className="px-4 py-2 rounded-full font-semibold"
                style={{ background: `${badge.color}22`, border: `1px solid ${badge.color}55`, color: badge.color, fontFamily: 'var(--font-body)', fontSize: 'clamp(11px, 1vw, 15px)' }}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: phase >= 4 ? 1 : 0, scale: phase >= 4 ? 1 : 0.85 }}
                transition={{ delay: i * 0.1, type: 'spring' }}
              >
                {badge.label}
              </motion.div>
            ))}
          </motion.div>

          <motion.div className="mt-7 px-6 py-3 rounded-full font-bold"
            style={{ background: C, color: '#071C2E', fontFamily: 'var(--font-body)', fontSize: 'clamp(14px, 1.3vw, 20px)' }}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: phase >= 5 ? 1 : 0, scale: phase >= 5 ? 1 : 0.85 }}
            transition={{ type: 'spring', stiffness: 260, damping: 18 }}
          >
            pagoyamx.com
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
}
