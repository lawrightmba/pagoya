import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Zap, CheckCircle2 } from 'lucide-react';

const fields = [
  { label: 'Servicio', value: 'CFE — Luz' },
  { label: 'Monto', value: '$350.00' },
  { label: 'No. de servicio', value: '123 456 789 012' },
  { label: 'Región', value: 'Ciudad de México' },
];

export function Scene5() {
  const [phase, setPhase] = useState(0);
  const [filledCount, setFilledCount] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 300);
    const t2 = setTimeout(() => setPhase(2), 1100);
    const t3 = setTimeout(() => setPhase(3), 5500);
    return () => [t1, t2, t3].forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (phase < 2) return;
    let i = 0;
    const iv = setInterval(() => {
      i++;
      setFilledCount(i);
      if (i >= fields.length) clearInterval(iv);
    }, 600);
    return () => clearInterval(iv);
  }, [phase]);

  return (
    <motion.div
      className="absolute inset-0 overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0A2540 0%, #091f36 100%)' }}
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.45 }}
    >
      <motion.div
        className="absolute top-[10%] left-[25%] w-[50vw] h-[50vw] rounded-full blur-[140px] opacity-18 pointer-events-none"
        style={{ background: '#1D9E75' }}
        animate={{ scale: [1, 1.3, 1] }}
        transition={{ duration: 9, repeat: Infinity }}
      />

      <div className="absolute inset-0 flex flex-col justify-center pl-[8vw]" style={{ width: '42vw' }}>
        <motion.div
          className="inline-flex self-start items-center gap-2 px-3 py-1.5 rounded-full mb-6"
          style={{ background: 'rgba(29,158,117,0.15)', border: '1px solid rgba(29,158,117,0.3)' }}
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: phase >= 1 ? 1 : 0, x: phase >= 1 ? 0 : -16 }}
          transition={{ duration: 0.5 }}
        >
          <Zap size={13} color="#1D9E75" />
          <span style={{ fontFamily: 'var(--font-body)', color: '#1D9E75', fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            02 — IA Autocompletado
          </span>
        </motion.div>

        <div className="overflow-hidden mb-4">
          <motion.h2
            style={{ fontFamily: 'var(--font-display)', fontWeight: 900, color: 'white', lineHeight: 1.0, fontSize: 'clamp(30px, 3.8vw, 58px)' }}
            initial={{ y: '110%' }}
            animate={{ y: phase >= 1 ? '0%' : '110%' }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          >
            IA llena el<br />
            <span style={{ color: '#1D9E75' }}>formulario solo</span>
          </motion.h2>
        </div>

        <motion.p
          style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.58)', fontSize: 'clamp(14px, 1.3vw, 19px)', lineHeight: 1.5 }}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: phase >= 1 ? 1 : 0, y: phase >= 1 ? 0 : 12 }}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          Claude detecta el servicio, el monto<br />y el número de cuenta automáticamente.
        </motion.p>

        <div className="mt-8 flex flex-col gap-3">
          {fields.map((field, i) => (
            <motion.div
              key={i}
              className="flex items-center justify-between rounded-xl px-4 py-3"
              style={{ background: i < filledCount ? 'rgba(29,158,117,0.12)' : 'rgba(255,255,255,0.04)', border: `1px solid ${i < filledCount ? 'rgba(29,158,117,0.3)' : 'rgba(255,255,255,0.08)'}` }}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: phase >= 2 ? 1 : 0, x: phase >= 2 ? 0 : -12 }}
              transition={{ delay: i * 0.08 }}
            >
              <span style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.45)', fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                {field.label}
              </span>
              <span style={{ fontFamily: 'var(--font-body)', color: i < filledCount ? 'white' : 'rgba(255,255,255,0.2)', fontSize: 'clamp(13px, 1.15vw, 16px)', fontWeight: 600 }}>
                {i < filledCount ? field.value : '— — —'}
              </span>
              {i < filledCount && (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}>
                  <CheckCircle2 size={16} color="#1D9E75" />
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>

        <motion.div
          className="mt-6 flex items-center gap-2 px-4 py-2 rounded-xl self-start"
          style={{ background: 'rgba(29,158,117,0.1)', border: '1px solid rgba(29,158,117,0.2)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: phase >= 3 ? 1 : 0 }}
          transition={{ duration: 0.5 }}
        >
          <span style={{ color: '#1D9E75', fontSize: '1.1rem' }}>✨</span>
          <span style={{ fontFamily: 'var(--font-body)', color: '#1D9E75', fontSize: 'clamp(12px, 1vw, 15px)', fontWeight: 600 }}>
            94% precisión — sin errores de captura
          </span>
        </motion.div>
      </div>
    </motion.div>
  );
}
