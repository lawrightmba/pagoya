import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

function Counter({ target, suffix = '', prefix = '' }: { target: number; suffix?: string; prefix?: string }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let cur = 0;
    const step = target / 80;
    const iv = setInterval(() => {
      cur = Math.min(cur + step, target);
      setVal(Math.floor(cur));
      if (cur >= target) clearInterval(iv);
    }, 18);
    return () => clearInterval(iv);
  }, [target]);
  return <>{prefix}{val.toLocaleString()}{suffix}</>;
}

const metrics = [
  { value: 500, suffix: '+', prefix: '', label: 'integrated services', sub: 'CFE, Telmex, Telcel, Izzi & more', color: '#1D9E75' },
  { value: 94, suffix: '%', prefix: '', label: 'AI accuracy', sub: 'Correct autocomplete rate', color: '#D85A30' },
  { value: 19000, suffix: '+', prefix: '', label: 'OXXO locations', sub: 'National payment coverage', color: '#3B82F6' },
  { value: 2, suffix: ' min', prefix: '<', label: 'per payment', sub: 'Average user time', color: '#8B5CF6' },
];

export function Scene9() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 900),
      setTimeout(() => setPhase(3), 1600),
      setTimeout(() => setPhase(4), 2300),
      setTimeout(() => setPhase(5), 3200),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <motion.div
      className="absolute inset-0 overflow-hidden flex flex-col items-center justify-center px-[6vw]"
      style={{ background: '#0A2540' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.55 }}
    >
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 90% 60% at 50% 50%, rgba(29,158,117,0.12) 0%, transparent 70%)' }}
        animate={{ opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 6, repeat: Infinity }}
      />

      <motion.p
        className="mb-3 uppercase tracking-widest text-center"
        style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.4)', fontSize: 'clamp(10px, 0.9vw, 13px)', letterSpacing: '0.18em' }}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: phase >= 1 ? 1 : 0, y: phase >= 1 ? 0 : -10 }}
        transition={{ duration: 0.45 }}
      >
        Traction
      </motion.p>

      <div className="overflow-hidden mb-10">
        <motion.h2
          style={{ fontFamily: 'var(--font-display)', fontWeight: 900, color: 'white', textAlign: 'center', fontSize: 'clamp(30px, 4vw, 60px)' }}
          initial={{ y: '110%' }}
          animate={{ y: phase >= 1 ? '0%' : '110%' }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        >
          Built to <span style={{ color: '#1D9E75' }}>scale</span>
        </motion.h2>
      </div>

      <div className="grid grid-cols-2 gap-[2vw] w-full" style={{ maxWidth: '90vw' }}>
        {metrics.map((m, i) => (
          <motion.div
            key={i}
            className="rounded-3xl px-[3vw] py-[3vh] relative overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid rgba(255,255,255,0.08)` }}
            initial={{ opacity: 0, y: 30, scale: 0.92 }}
            animate={{ opacity: phase >= i + 2 ? 1 : 0, y: phase >= i + 2 ? 0 : 30, scale: phase >= i + 2 ? 1 : 0.92 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: m.color }} />
            <motion.div
              style={{ fontFamily: 'var(--font-display)', fontWeight: 900, color: m.color, lineHeight: 0.9, fontSize: 'clamp(40px, 5.5vw, 80px)', marginBottom: 8 }}
            >
              {phase >= i + 2 && <Counter target={m.value} suffix={m.suffix} prefix={m.prefix} />}
            </motion.div>
            <p style={{ fontFamily: 'var(--font-body)', color: 'white', fontWeight: 700, fontSize: 'clamp(13px, 1.3vw, 19px)' }}>
              {m.label}
            </p>
            <p style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.45)', fontSize: 'clamp(11px, 0.95vw, 14px)', marginTop: 4 }}>
              {m.sub}
            </p>
          </motion.div>
        ))}
      </div>

      <motion.div
        className="mt-8 px-6 py-3 rounded-2xl"
        style={{ background: 'rgba(29,158,117,0.12)', border: '1px solid rgba(29,158,117,0.3)' }}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: phase >= 5 ? 1 : 0, y: phase >= 5 ? 0 : 12 }}
        transition={{ duration: 0.5 }}
      >
        <p style={{ fontFamily: 'var(--font-body)', color: '#1D9E75', fontSize: 'clamp(13px, 1.2vw, 18px)', fontWeight: 600, textAlign: 'center' }}>
          No bank account required — universal access
        </p>
      </motion.div>
    </motion.div>
  );
}
