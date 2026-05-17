import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

function AnimatedNumber({ target, suffix = '', prefix = '', duration = 1.8 }: { target: number; suffix?: string; prefix?: string; duration?: number }) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    let start = 0;
    const step = target / (duration * 60);
    const timer = setInterval(() => {
      start = Math.min(start + step, target);
      setCurrent(Math.floor(start));
      if (start >= target) clearInterval(timer);
    }, 1000 / 60);
    return () => clearInterval(timer);
  }, [target, duration]);

  return <>{prefix}{current.toLocaleString()}{suffix}</>;
}

const stats = [
  { value: 40, suffix: 'B', prefix: '$', label: 'payments market in Mexico', unit: 'USD' },
  { value: 52, suffix: 'M', prefix: '', label: 'adults without a bank account', unit: 'people' },
  { value: 45, suffix: ' min', prefix: '', label: 'average time per payment', unit: 'average' },
];

const cardColors = ['#1D9E75', '#D85A30', '#3B82F6'];

export function Scene2() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 200),
      setTimeout(() => setPhase(2), 2000),
      setTimeout(() => setPhase(3), 3800),
      setTimeout(() => setPhase(4), 7000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <motion.div
      className="absolute inset-0 overflow-hidden flex flex-col items-center justify-center"
      style={{ background: '#0A2540' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div
        className="absolute top-[10%] left-[15%] w-[50vw] h-[50vw] rounded-full blur-[130px] opacity-20 pointer-events-none"
        style={{ background: '#1D9E75' }}
        animate={{ scale: [1, 1.25, 1] }}
        transition={{ duration: 10, repeat: Infinity }}
      />
      <motion.div
        className="absolute bottom-[5%] right-[5%] w-[35vw] h-[35vw] rounded-full blur-[100px] opacity-15 pointer-events-none"
        style={{ background: '#D85A30' }}
        animate={{ scale: [1.2, 1, 1.2] }}
        transition={{ duration: 8, repeat: Infinity }}
      />

      <motion.p
        className="mb-10 uppercase tracking-widest text-center"
        style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.4)', fontSize: 'clamp(11px, 1vw, 15px)', letterSpacing: '0.18em' }}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: phase >= 1 ? 1 : 0, y: phase >= 1 ? 0 : -10 }}
        transition={{ duration: 0.5 }}
      >
        The market opportunity
      </motion.p>

      <div className="flex items-stretch justify-center gap-[2vw] px-[6vw] w-full relative z-10">
        {stats.map((stat, i) => (
          <motion.div
            key={i}
            className="flex-1 flex flex-col items-center justify-center rounded-3xl py-[4vh] px-[2vw] relative overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid rgba(255,255,255,0.09)`, maxWidth: '30vw' }}
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{
              opacity: phase >= i + 1 ? 1 : 0,
              y: phase >= i + 1 ? 0 : 50,
              scale: phase >= i + 1 ? 1 : 0.9,
            }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="absolute top-0 left-0 right-0 h-1 rounded-t-3xl" style={{ background: cardColors[i] }} />

            {phase >= i + 1 && (
              <motion.div
                style={{ fontFamily: 'var(--font-display)', fontWeight: 900, lineHeight: 0.9, color: cardColors[i], fontSize: 'clamp(56px, 8vw, 120px)' }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {stat.prefix}
                <AnimatedNumber target={stat.value} suffix={stat.suffix} />
              </motion.div>
            )}

            <motion.p
              className="mt-4 text-center"
              style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.6)', fontSize: 'clamp(12px, 1.2vw, 18px)', fontWeight: 500, lineHeight: 1.35 }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: phase >= i + 1 ? 1 : 0, y: phase >= i + 1 ? 0 : 8 }}
              transition={{ delay: 0.3 }}
            >
              {stat.label}
            </motion.p>

            <motion.span
              className="mt-3 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
              style={{ background: `${cardColors[i]}22`, color: cardColors[i], fontFamily: 'var(--font-body)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: phase >= i + 1 ? 1 : 0 }}
              transition={{ delay: 0.5 }}
            >
              {stat.unit}
            </motion.span>
          </motion.div>
        ))}
      </div>

      <motion.div
        className="mt-10 px-6 py-3 rounded-2xl relative z-10"
        style={{ background: 'rgba(29,158,117,0.12)', border: '1px solid rgba(29,158,117,0.3)' }}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: phase >= 4 ? 1 : 0, scale: phase >= 4 ? 1 : 0.9 }}
        transition={{ duration: 0.5, type: 'spring' }}
      >
        <p style={{ fontFamily: 'var(--font-body)', color: '#1D9E75', fontSize: 'clamp(13px, 1.3vw, 18px)', fontWeight: 600 }}>
          The problem remains unsolved. Until now.
        </p>
      </motion.div>
    </motion.div>
  );
}
