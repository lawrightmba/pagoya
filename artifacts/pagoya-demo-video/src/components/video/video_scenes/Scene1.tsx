import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

export function Scene1() {
  const [phase, setPhase] = useState(0);
  const BASE = import.meta.env.BASE_URL;

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 1400),
      setTimeout(() => setPhase(3), 2800),
      setTimeout(() => setPhase(4), 5000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <motion.div
      className="absolute inset-0 overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.7 }}
    >
      <video
        className="absolute inset-0 w-full h-full object-cover"
        src={`${BASE}videos/mexico_city_night.mp4`}
        autoPlay muted loop playsInline
      />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(10,37,64,0.88) 0%, rgba(10,37,64,0.70) 50%, rgba(10,37,64,0.82) 100%)' }} />

      <motion.div
        className="absolute top-[20%] left-[5%] w-[60vw] h-[60vw] rounded-full blur-[140px] opacity-25 pointer-events-none"
        style={{ background: '#1D9E75' }}
        animate={{ scale: [1, 1.15, 1], x: [0, 30, 0] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="absolute inset-0 flex flex-col justify-center px-[8vw]" style={{ maxWidth: '58vw' }}>
        <motion.div
          className="mb-8 self-start flex items-center gap-2 px-4 py-2 rounded-full border"
          style={{ background: 'rgba(216,90,48,0.15)', borderColor: 'rgba(216,90,48,0.45)', color: '#D85A30' }}
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: phase >= 1 ? 1 : 0, x: phase >= 1 ? 0 : -24 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.span
            className="w-2 h-2 rounded-full bg-[#D85A30] inline-block"
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 1.2, repeat: Infinity }}
          />
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            The Problem
          </span>
        </motion.div>

        <div className="overflow-hidden mb-2">
          <motion.h1
            style={{ fontFamily: 'var(--font-display)', fontWeight: 900, lineHeight: 0.92, letterSpacing: '-0.03em', color: 'white', fontSize: 'clamp(52px, 7.5vw, 108px)' }}
            initial={{ y: '112%' }}
            animate={{ y: phase >= 1 ? '0%' : '112%' }}
            transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
          >
            52 <span style={{ color: '#1D9E75' }}>million</span>
          </motion.h1>
        </div>
        <div className="overflow-hidden mb-10">
          <motion.h2
            style={{ fontFamily: 'var(--font-display)', fontWeight: 800, lineHeight: 1.05, color: 'rgba(255,255,255,0.80)', fontSize: 'clamp(28px, 3.8vw, 54px)' }}
            initial={{ y: '112%' }}
            animate={{ y: phase >= 2 ? '0%' : '112%' }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            Mexicans without a bank account
          </motion.h2>
        </div>

        <motion.div
          className="flex flex-col gap-4"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: phase >= 3 ? 1 : 0, y: phase >= 3 ? 0 : 24 }}
          transition={{ duration: 0.6 }}
        >
          {[
            { icon: '⏱', text: '45-minute average wait per payment' },
            { icon: '💸', text: 'Late fees and service cuts for overdue bills' },
            { icon: '📄', text: 'No digital receipt or payment history' },
          ].map((item, i) => (
            <motion.div
              key={i}
              className="flex items-center gap-4"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: phase >= 3 ? 1 : 0, x: phase >= 3 ? 0 : -20 }}
              transition={{ duration: 0.45, delay: 0.1 + i * 0.14 }}
            >
              <span style={{ fontSize: '1.5rem' }}>{item.icon}</span>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 'clamp(14px, 1.4vw, 20px)', color: 'rgba(255,255,255,0.72)', fontWeight: 500 }}>
                {item.text}
              </span>
            </motion.div>
          ))}
        </motion.div>
      </div>

      <motion.div
        className="absolute top-1/2 right-[5vw] rounded-2xl overflow-hidden pointer-events-none"
        style={{ width: 'clamp(280px, 35vw, 540px)', transform: 'translateY(-50%)' }}
        initial={{ opacity: 0, x: 60, scale: 0.92 }}
        animate={{ opacity: phase >= 4 ? 1 : 0, x: phase >= 4 ? 0 : 60, scale: phase >= 4 ? 1 : 0.92 }}
        transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
      >
        <img src={`${BASE}images/oxxo_payment.jpg`} alt="" className="w-full object-cover" style={{ maxHeight: '55vh' }} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to right, rgba(10,37,64,0.8) 0%, transparent 45%, transparent 100%)' }} />
        <div className="absolute bottom-4 left-4 right-4 px-4 py-3 rounded-xl" style={{ background: 'rgba(10,37,64,0.85)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <p style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', textAlign: 'center' }}>
            Daily reality for millions of Mexican families
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
