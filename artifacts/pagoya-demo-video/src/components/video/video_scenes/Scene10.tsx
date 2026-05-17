import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

const streams = [
  { label: 'Transaction Fee', value: '$15 MXN', sub: '~$0.85 USD per payment', color: '#1D9E75', width: '100%' },
  { label: 'Premium Loyalty Program', value: '$49 MXN/mo', sub: 'Reminders + history + bonus points', color: '#D85A30', width: '60%' },
  { label: 'B2B White-label', value: 'Custom', sub: 'For remittance & fintech partners', color: '#3B82F6', width: '45%' },
];

const economics = [
  { label: 'Est. LTV', value: '$720 MXN' },
  { label: 'Target CAC', value: '$40 MXN' },
  { label: 'LTV/CAC', value: '18×' },
];

export function Scene10() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 1400),
      setTimeout(() => setPhase(3), 3000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <motion.div
      className="absolute inset-0 overflow-hidden flex flex-col"
      style={{ background: '#0A2540' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.55 }}
    >
      <motion.div
        className="absolute top-0 right-0 w-[50vw] h-[60vh] rounded-full blur-[160px] opacity-12 pointer-events-none"
        style={{ background: '#1D9E75' }}
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 10, repeat: Infinity }}
      />

      <div className="absolute inset-0 flex">
        <div className="w-1/2 flex flex-col justify-center pl-[8vw] pr-[4vw] relative z-10">
          <motion.p
            className="mb-4 uppercase tracking-widest"
            style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.4)', fontSize: 'clamp(10px, 0.9vw, 13px)', letterSpacing: '0.18em' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: phase >= 1 ? 1 : 0 }}
            transition={{ duration: 0.45 }}
          >
            Business model
          </motion.p>

          <div className="overflow-hidden mb-6">
            <motion.h2
              style={{ fontFamily: 'var(--font-display)', fontWeight: 900, color: 'white', lineHeight: 0.95, fontSize: 'clamp(34px, 4.5vw, 70px)' }}
              initial={{ y: '110%' }}
              animate={{ y: phase >= 1 ? '0%' : '110%' }}
              transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            >
              Simple.<br />
              <span style={{ color: '#1D9E75' }}>Scalable.</span>
            </motion.h2>
          </div>

          <div className="flex flex-col gap-4">
            {streams.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -18 }}
                animate={{ opacity: phase >= 1 ? 1 : 0, x: phase >= 1 ? 0 : -18 }}
                transition={{ duration: 0.5, delay: 0.15 + i * 0.12 }}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.65)', fontSize: 'clamp(12px, 1.1vw, 16px)', fontWeight: 500 }}>
                    {s.label}
                  </span>
                  <span style={{ fontFamily: 'var(--font-display)', color: s.color, fontWeight: 800, fontSize: 'clamp(14px, 1.4vw, 20px)' }}>
                    {s.value}
                  </span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: s.color }}
                    initial={{ width: '0%' }}
                    animate={{ width: phase >= 2 ? s.width : '0%' }}
                    transition={{ duration: 0.8, delay: i * 0.15, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>
                <p style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.38)', fontSize: 'clamp(11px, 0.9vw, 13px)', marginTop: 4 }}>
                  {s.sub}
                </p>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="w-1/2 flex flex-col items-center justify-center pr-[6vw] gap-4 relative z-10">
          <motion.div
            className="w-full rounded-3xl p-[3vw] text-center relative overflow-hidden"
            style={{ background: 'rgba(29,158,117,0.08)', border: '2px solid rgba(29,158,117,0.3)' }}
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: phase >= 2 ? 1 : 0, y: phase >= 2 ? 0 : 30, scale: phase >= 2 ? 1 : 0.9 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="absolute top-0 left-0 right-0 h-1" style={{ background: '#1D9E75' }} />
            <p style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.5)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6 }}>
              Revenue per Transaction
            </p>
            <p style={{ fontFamily: 'var(--font-display)', fontWeight: 900, color: '#1D9E75', fontSize: 'clamp(48px, 7vw, 100px)', lineHeight: 0.9 }}>
              $15
            </p>
            <p style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.45)', fontSize: 'clamp(12px, 1.1vw, 16px)', marginTop: 8 }}>
              MXN (~$0.85 USD)
            </p>
          </motion.div>

          <div className="w-full flex gap-3">
            {economics.map((e, i) => (
              <motion.div
                key={i}
                className="flex-1 rounded-2xl p-[1.5vw] text-center"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: phase >= 3 ? 1 : 0, y: phase >= 3 ? 0 : 18 }}
                transition={{ duration: 0.45, delay: i * 0.1 }}
              >
                <p style={{ fontFamily: 'var(--font-display)', color: 'white', fontWeight: 800, fontSize: 'clamp(16px, 1.8vw, 26px)' }}>
                  {e.value}
                </p>
                <p style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.45)', fontSize: 'clamp(10px, 0.85vw, 12px)', marginTop: 3 }}>
                  {e.label}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
