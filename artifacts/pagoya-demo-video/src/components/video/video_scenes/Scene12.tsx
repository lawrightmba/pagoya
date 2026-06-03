import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import logoPng from '@assets/pagoya_logo_transparent.png';

export function Scene12() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 200),
      setTimeout(() => setPhase(2), 1000),
      setTimeout(() => setPhase(3), 2200),
      setTimeout(() => setPhase(4), 3800),
      setTimeout(() => setPhase(5), 6000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <motion.div
      className="absolute inset-0 overflow-hidden flex flex-col items-center justify-center"
      style={{ background: '#0A2540' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.7 }}
    >
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 80% 70% at 50% 50%, rgba(29,158,117,0.28) 0%, transparent 65%)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: phase >= 1 ? 1 : 0 }}
        transition={{ duration: 2 }}
      />

      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle, rgba(29,158,117,0.15) 1px, transparent 1px)`,
          backgroundSize: '44px 44px',
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: phase >= 1 ? 0.7 : 0 }}
        transition={{ duration: 1.5 }}
      />

      {[
        { w: '70vw', h: '70vw', color: '#1D9E75', opacity: 0.12, delay: 0 },
        { w: '50vw', h: '50vw', color: '#1D9E75', opacity: 0.10, delay: 0.3 },
        { w: '30vw', h: '30vw', color: '#1D9E75', opacity: 0.12, delay: 0.6 },
      ].map((ring, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full border pointer-events-none"
          style={{ width: ring.w, height: ring.h, borderColor: `rgba(29,158,117,${ring.opacity + 0.2})` }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: phase >= 1 ? 1 : 0, opacity: phase >= 1 ? 1 : 0 }}
          transition={{ duration: 1.0, delay: ring.delay, ease: [0.22, 1, 0.36, 1] }}
        />
      ))}

      <div className="relative z-10 flex flex-col items-center">
        <motion.div
          className="mb-8"
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: phase >= 1 ? 1 : 0.6, opacity: phase >= 1 ? 1 : 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          <img src={logoPng} alt="PagoYa" style={{ height: 'clamp(52px, 6.5vh, 90px)', width: 'auto', filter: 'drop-shadow(0 4px 20px rgba(0,0,0,0.5))' }} />
        </motion.div>

        <div className="overflow-hidden mb-4">
          <motion.h1
            style={{ fontFamily: 'var(--font-display)', fontWeight: 900, color: 'white', textAlign: 'center', lineHeight: 1.15, fontSize: 'clamp(44px, 6.5vw, 96px)' }}
            initial={{ y: '110%' }}
            animate={{ y: phase >= 2 ? '0%' : '110%' }}
            transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
          >
            Pay in{' '}
            <span style={{ color: '#1D9E75' }}>2 minutes</span>
          </motion.h1>
        </div>

        <motion.p
          style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.55)', textAlign: 'center', fontSize: 'clamp(16px, 1.8vw, 28px)', fontWeight: 400, maxWidth: '60vw', lineHeight: 1.5 }}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: phase >= 3 ? 1 : 0, y: phase >= 3 ? 0 : 14 }}
          transition={{ duration: 0.6 }}
        >
          Democratizing payments in Mexico.<br />No bank. No lines. With AI.
        </motion.p>

        <motion.div
          className="flex items-center gap-6 mt-10"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: phase >= 4 ? 1 : 0, y: phase >= 4 ? 0 : 14 }}
          transition={{ duration: 0.55 }}
        >
          <motion.div
            className="px-8 py-4 rounded-2xl font-bold"
            style={{ background: '#1D9E75', color: 'white', fontFamily: 'var(--font-body)', fontSize: 'clamp(16px, 1.6vw, 24px)' }}
            animate={{ boxShadow: ['0 0 0px rgba(29,158,117,0)', '0 0 40px rgba(29,158,117,0.6)', '0 0 0px rgba(29,158,117,0)'] }}
            transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}
          >
            pagoyamx.com
          </motion.div>
          <div style={{ width: 1, height: 36, background: 'rgba(255,255,255,0.15)' }} />
          <p style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.45)', fontSize: 'clamp(12px, 1.2vw, 17px)' }}>
            Longview Meridian Technologies LLC
          </p>
        </motion.div>

        <motion.div
          className="flex items-center gap-4 mt-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: phase >= 5 ? 1 : 0 }}
          transition={{ duration: 0.7 }}
        >
          {['YC S25', '52M potential users', 'Mexico · Latam'].map((tag, i) => (
            <motion.div
              key={i}
              className="px-4 py-2 rounded-full"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.55)', fontFamily: 'var(--font-body)', fontSize: 'clamp(11px, 0.95vw, 14px)', fontWeight: 500 }}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: phase >= 5 ? 1 : 0, scale: phase >= 5 ? 1 : 0.85 }}
              transition={{ delay: i * 0.12, type: 'spring' }}
            >
              {tag}
            </motion.div>
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
}
