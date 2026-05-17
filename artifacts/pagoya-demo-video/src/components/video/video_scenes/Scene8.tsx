import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

const rings = [
  { label: 'TAM', sub: 'MX Payments Market', value: '$40B', color: '#1D9E75', size: '42vw' },
  { label: 'SAM', sub: 'Unbanked Payments', value: '$12B', color: '#D85A30', size: '28vw' },
  { label: 'SOM', sub: 'Year 3 Target', value: '$480M', color: '#3B82F6', size: '16vw' },
];

export function Scene8() {
  const [phase, setPhase] = useState(0);
  const BASE = import.meta.env.BASE_URL;

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 1200),
      setTimeout(() => setPhase(3), 2400),
      setTimeout(() => setPhase(4), 4800),
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
      <div className="absolute inset-0 flex">
        <div className="w-1/2 flex flex-col justify-center pl-[8vw] pr-[4vw] relative z-10">
          <motion.p
            className="mb-4 uppercase tracking-widest"
            style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.4)', fontSize: 'clamp(10px, 0.9vw, 13px)', letterSpacing: '0.18em' }}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: phase >= 1 ? 1 : 0, y: phase >= 1 ? 0 : -8 }}
            transition={{ duration: 0.45 }}
          >
            Market size
          </motion.p>

          <div className="overflow-hidden mb-5">
            <motion.h2
              style={{ fontFamily: 'var(--font-display)', fontWeight: 900, color: 'white', lineHeight: 0.95, fontSize: 'clamp(36px, 5vw, 76px)' }}
              initial={{ y: '110%' }}
              animate={{ y: phase >= 1 ? '0%' : '110%' }}
              transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            >
              <span style={{ color: '#1D9E75' }}>$40B</span><br />opportunity
            </motion.h2>
          </div>

          <div className="flex flex-col gap-3 mb-8">
            {rings.map((ring, i) => (
              <motion.div
                key={i}
                className="flex items-center gap-4 rounded-2xl px-4 py-3"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                initial={{ opacity: 0, x: -18 }}
                animate={{ opacity: phase >= i + 1 ? 1 : 0, x: phase >= i + 1 ? 0 : -18 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: ring.color }} />
                <div className="flex-1">
                  <span style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.5)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                    {ring.label} — {ring.sub}
                  </span>
                </div>
                <span style={{ fontFamily: 'var(--font-display)', color: ring.color, fontWeight: 800, fontSize: 'clamp(16px, 1.8vw, 26px)' }}>
                  {ring.value}
                </span>
              </motion.div>
            ))}
          </div>

          <motion.div
            className="flex flex-col gap-2"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: phase >= 4 ? 1 : 0, y: phase >= 4 ? 0 : 12 }}
            transition={{ duration: 0.5 }}
          >
            {[
              '52M adults without a bank account in Mexico',
              '3× digital growth post-pandemic',
              '+500 services already integrated',
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#1D9E75' }} />
                <span style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.6)', fontSize: 'clamp(12px, 1.1vw, 16px)' }}>
                  {item}
                </span>
              </div>
            ))}
          </motion.div>
        </div>

        <div className="w-1/2 flex items-center justify-center relative">
          <motion.div
            className="absolute inset-0 overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: phase >= 2 ? 0.45 : 0 }}
            transition={{ duration: 1 }}
          >
            <img src={`${BASE}images/mexico_map_nodes.png`} alt="" className="w-full h-full object-contain opacity-70" />
          </motion.div>

          {rings.map((ring, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full border-2 flex items-center justify-center"
              style={{ width: ring.size, height: ring.size, borderColor: `${ring.color}55`, background: `${ring.color}08` }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: phase >= i + 1 ? 1 : 0, opacity: phase >= i + 1 ? 1 : 0 }}
              transition={{ duration: 0.7, delay: i * 0.18, ease: [0.22, 1, 0.36, 1] }}
            />
          ))}

          <motion.div
            className="relative z-10 text-center"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: phase >= 3 ? 1 : 0, scale: phase >= 3 ? 1 : 0.8 }}
            transition={{ duration: 0.6, type: 'spring' }}
          >
            <p style={{ fontFamily: 'var(--font-display)', fontWeight: 900, color: '#1D9E75', fontSize: 'clamp(44px, 6vw, 88px)', lineHeight: 0.9 }}>$40B</p>
            <p style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.55)', fontSize: 'clamp(12px, 1.1vw, 16px)', marginTop: 8 }}>TAM — USD</p>

          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
