import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useLang } from '@/lib/video/LangContext';

const C = '#00C875';

export function Scene4() {
  const lang = useLang();
  const [phase, setPhase] = useState(0);

  const text = lang === 'en' ? 'pay my CFE electricity bill $350' : 'pagar mi luz de CFE $350';
  const [typed, setTyped] = useState('');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 400);
    const t2 = setTimeout(() => setPhase(2), 1200);
    const t3 = setTimeout(() => setPhase(3), 3000);
    return () => [t1, t2, t3].forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (phase < 2) return;
    setTyped('');
    let i = 0;
    const iv = setInterval(() => {
      i++;
      setTyped(text.slice(0, i));
      if (i >= text.length) clearInterval(iv);
    }, 65);
    return () => clearInterval(iv);
  }, [phase, text]);

  return (
    <motion.div
      className="absolute inset-0 overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #004F2D 0%, #005432 100%)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.45 }}
    >
      <motion.div className="absolute bottom-0 left-0 w-[55vw] h-[55vw] rounded-full blur-[150px] opacity-[0.12] pointer-events-none"
        style={{ background: C }}
        animate={{ scale: [1, 1.2, 1], x: [0, 20, 0] }}
        transition={{ duration: 10, repeat: Infinity }} />

      <div className="absolute inset-0 flex flex-col justify-center pl-[8vw]" style={{ width: '44vw' }}>
        <motion.div
          className="inline-flex self-start items-center gap-2 px-3 py-1.5 rounded-full mb-6"
          style={{ background: `${C}18`, border: `1px solid ${C}40` }}
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: phase >= 1 ? 1 : 0, x: phase >= 1 ? 0 : -16 }}
          transition={{ duration: 0.5 }}
        >
          <span style={{ fontFamily: 'var(--font-body)', color: C, fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            01 — {lang === 'en' ? 'Natural Search' : 'Búsqueda Natural'}
          </span>
        </motion.div>

        <div className="overflow-hidden mb-4" style={{ paddingTop: 6 }}>
          <motion.h2
            style={{ fontFamily: 'var(--font-display)', fontWeight: 900, color: 'white', lineHeight: 1.15, fontSize: 'clamp(30px, 3.8vw, 58px)' }}
            initial={{ y: '110%' }}
            animate={{ y: phase >= 1 ? '0%' : '110%' }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          >
            {lang === 'en' ? <>Speak<br /><span style={{ color: C }}>naturally</span></> : <>Habla<br /><span style={{ color: C }}>naturalmente</span></>}
          </motion.h2>
        </div>

        <motion.p
          style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.55)', fontSize: 'clamp(14px, 1.3vw, 19px)', lineHeight: 1.5 }}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: phase >= 1 ? 1 : 0, y: phase >= 1 ? 0 : 12 }}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          {lang === 'en' ? <>No complex forms.<br />Type like you'd text a friend.</> : <>Sin formularios complicados.<br />Escribe como le escribirías a un amigo.</>}
        </motion.p>

        <motion.div
          className="mt-8 rounded-2xl px-5 py-4 relative overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)' }}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: phase >= 2 ? 1 : 0, y: phase >= 2 ? 0 : 16 }}
          transition={{ duration: 0.5 }}
        >
          <p style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.45)', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>
            {lang === 'en' ? 'User types:' : 'El usuario escribe:'}
          </p>
          <p style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.88)', fontSize: 'clamp(14px, 1.4vw, 20px)', fontWeight: 500, minHeight: '1.6em' }}>
            "{typed}
            {typed.length < text.length && phase >= 2 && (
              <motion.span
                style={{ display: 'inline-block', width: 2, height: '1em', background: C, marginLeft: 2, verticalAlign: 'middle' }}
                animate={{ opacity: [1, 0, 1] }}
                transition={{ duration: 0.75, repeat: Infinity }}
              />
            )}"
          </p>
        </motion.div>

        <motion.div
          className="mt-5 flex items-center gap-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: phase >= 3 ? 1 : 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="w-2 h-2 rounded-full" style={{ background: C }} />
          <p style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.42)', fontSize: 'clamp(12px, 1vw, 15px)' }}>
            {lang === 'en' ? 'AI processing with Claude claude-sonnet-4-5...' : 'IA procesando con Claude claude-sonnet-4-5...'}
          </p>
          <motion.div className="h-1 rounded-full overflow-hidden flex-1" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <motion.div className="h-full rounded-full" style={{ background: C }}
              initial={{ width: '0%' }}
              animate={{ width: phase >= 3 ? '100%' : '0%' }}
              transition={{ duration: 2.5, ease: 'easeInOut' }} />
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
}
