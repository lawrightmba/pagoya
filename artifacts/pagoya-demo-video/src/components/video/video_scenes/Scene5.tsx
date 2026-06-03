import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Zap, CheckCircle2 } from 'lucide-react';
import { useLang } from '@/lib/video/LangContext';

const C = '#00C875';

export function Scene5() {
  const lang = useLang();
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
      if (i >= 4) clearInterval(iv);
    }, 600);
    return () => clearInterval(iv);
  }, [phase]);

  const fields = lang === 'en' ? [
    { label: 'Service', value: 'CFE — Electricity' },
    { label: 'Amount', value: '$350.00' },
    { label: 'Service No.', value: '123 456 789 012' },
    { label: 'Region', value: 'Mexico City' },
  ] : [
    { label: 'Servicio', value: 'CFE — Electricidad' },
    { label: 'Monto', value: '$350.00' },
    { label: 'No. Servicio', value: '123 456 789 012' },
    { label: 'Región', value: 'Ciudad de México' },
  ];

  return (
    <motion.div
      className="absolute inset-0 overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #004F2D 0%, #091f36 100%)' }}
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.45 }}
    >
      <motion.div className="absolute top-[10%] left-[25%] w-[50vw] h-[50vw] rounded-full blur-[140px] opacity-[0.12] pointer-events-none"
        style={{ background: C }} animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 9, repeat: Infinity }} />

      <div className="absolute inset-0 flex flex-col justify-center pl-[8vw]" style={{ width: '44vw' }}>
        <motion.div
          className="inline-flex self-start items-center gap-2 px-3 py-1.5 rounded-full mb-6"
          style={{ background: `${C}18`, border: `1px solid ${C}40` }}
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: phase >= 1 ? 1 : 0, x: phase >= 1 ? 0 : -16 }}
          transition={{ duration: 0.5 }}
        >
          <Zap size={13} color={C} />
          <span style={{ fontFamily: 'var(--font-body)', color: C, fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            02 — {lang === 'en' ? 'AI Autocomplete' : 'Autocompletado IA'}
          </span>
        </motion.div>

        <div className="overflow-hidden mb-5">
          <motion.h2
            style={{ fontFamily: 'var(--font-display)', fontWeight: 900, color: 'white', lineHeight: 1.05, fontSize: 'clamp(28px, 3.4vw, 52px)' }}
            initial={{ y: '110%' }}
            animate={{ y: phase >= 1 ? '0%' : '110%' }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          >
            {lang === 'en' ? <>AI fills the form<br /><span style={{ color: C }}>automatically</span></> : <>La IA llena el formulario<br /><span style={{ color: C }}>automáticamente</span></>}
          </motion.h2>
        </div>

        <motion.p
          style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.55)', fontSize: 'clamp(13px, 1.2vw, 17px)', lineHeight: 1.6, marginBottom: '1.5rem' }}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: phase >= 1 ? 1 : 0, y: phase >= 1 ? 0 : 12 }}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          {lang === 'en'
            ? <>Claude detects the service, amount, and account<br />number — no extra typing needed.</>
            : <>Claude detecta el servicio, monto y número de cuenta<br />— sin escribir nada más.</>}
        </motion.p>

        <div className="flex flex-col gap-3">
          {fields.map((field, i) => (
            <motion.div key={i}
              className="flex items-center justify-between rounded-xl px-4 py-3"
              style={{ background: i < filledCount ? `${C}18` : 'rgba(255,255,255,0.04)', border: `1px solid ${i < filledCount ? C + '44' : 'rgba(255,255,255,0.08)'}` }}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: phase >= 2 ? 1 : 0, x: phase >= 2 ? 0 : -12 }}
              transition={{ delay: i * 0.08 }}
            >
              <span style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.42)', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                {field.label}
              </span>
              <span style={{ fontFamily: 'var(--font-body)', color: i < filledCount ? 'white' : 'rgba(255,255,255,0.18)', fontSize: 'clamp(13px, 1.15vw, 16px)', fontWeight: 600 }}>
                {i < filledCount ? field.value : '— — —'}
              </span>
              {i < filledCount && (
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}>
                  <CheckCircle2 size={16} color={C} />
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>

        <motion.div
          className="mt-6 flex items-center gap-2 px-4 py-2 rounded-xl self-start"
          style={{ background: `${C}12`, border: `1px solid ${C}30` }}
          initial={{ opacity: 0 }}
          animate={{ opacity: phase >= 3 ? 1 : 0 }}
          transition={{ duration: 0.5 }}
        >
          <span style={{ color: C, fontSize: '1.1rem' }}>✨</span>
          <span style={{ fontFamily: 'var(--font-body)', color: C, fontSize: 'clamp(12px, 1vw, 15px)', fontWeight: 600 }}>
            {lang === 'en' ? '94% accuracy — zero data entry errors' : '94% precisión — cero errores de captura'}
          </span>
        </motion.div>
      </div>
    </motion.div>
  );
}
