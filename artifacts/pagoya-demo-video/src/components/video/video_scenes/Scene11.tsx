import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

const reasons = [
  {
    emoji: '📱',
    title: 'Mexico is mobile-first',
    body: '84% of Mexicans own a smartphone, yet only 36% have a bank account. The gap closes with apps, not banks.',
    color: '#1D9E75',
  },
  {
    emoji: '🏪',
    title: 'OXXO as infrastructure',
    body: '+19,000 OXXO stores — one for every 800 people — already accept barcode payments. The network is ready.',
    color: '#D85A30',
  },
  {
    emoji: '🤖',
    title: 'AI does the heavy lifting',
    body: 'LLMs like Claude enable natural language interfaces at near-zero marginal cost. The time for PagoYa is now.',
    color: '#3B82F6',
  },
];

export function Scene11() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 200),
      setTimeout(() => setPhase(2), 900),
      setTimeout(() => setPhase(3), 1800),
      setTimeout(() => setPhase(4), 2700),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <motion.div
      className="absolute inset-0 overflow-hidden flex flex-col items-center justify-center px-[7vw]"
      style={{ background: '#0A2540' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.55 }}
    >
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 100% 70% at 50% 50%, rgba(29,158,117,0.1) 0%, transparent 65%)' }}
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 7, repeat: Infinity }}
      />

      <motion.p
        className="mb-3 uppercase tracking-widest text-center"
        style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.4)', fontSize: 'clamp(10px, 0.9vw, 13px)', letterSpacing: '0.18em' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: phase >= 1 ? 1 : 0 }}
        transition={{ duration: 0.4 }}
      >
        Why now
      </motion.p>

      <div className="overflow-hidden mb-10">
        <motion.h2
          style={{ fontFamily: 'var(--font-display)', fontWeight: 900, color: 'white', textAlign: 'center', fontSize: 'clamp(32px, 4.5vw, 68px)', lineHeight: 1.0 }}
          initial={{ y: '110%' }}
          animate={{ y: phase >= 1 ? '0%' : '110%' }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        >
          The timing is <span style={{ color: '#1D9E75' }}>perfect</span>
        </motion.h2>
      </div>

      <div className="flex gap-[2.5vw] w-full" style={{ maxWidth: '90vw' }}>
        {reasons.map((r, i) => (
          <motion.div
            key={i}
            className="flex-1 flex flex-col rounded-3xl p-[2.5vw] relative overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            initial={{ opacity: 0, y: 40, scale: 0.92 }}
            animate={{ opacity: phase >= i + 2 ? 1 : 0, y: phase >= i + 2 ? 0 : 40, scale: phase >= i + 2 ? 1 : 0.92 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="absolute top-0 left-0 right-0 h-1 rounded-t-3xl" style={{ background: r.color }} />
            <span style={{ fontSize: 'clamp(28px, 3.5vw, 48px)', marginBottom: '1.2vw', display: 'block' }}>{r.emoji}</span>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, color: 'white', fontSize: 'clamp(15px, 1.6vw, 24px)', lineHeight: 1.15, marginBottom: '1vw' }}>
              {r.title}
            </h3>
            <p style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.55)', fontSize: 'clamp(11px, 1vw, 15px)', lineHeight: 1.55, flex: 1 }}>
              {r.body}
            </p>
            <div className="mt-4 h-0.5 rounded-full" style={{ background: `${r.color}44`, width: '60%' }} />
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
