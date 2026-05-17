import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

export function Scene4() {
  const [phase, setPhase] = useState(0);

  const text = 'pay my CFE electricity bill $350';
  const [typed, setTyped] = useState('');

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 400);
    const t2 = setTimeout(() => setPhase(2), 1200);
    const t3 = setTimeout(() => setPhase(3), 3000);
    return () => [t1, t2, t3].forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (phase < 2) return;
    let i = 0;
    const iv = setInterval(() => {
      i++;
      setTyped(text.slice(0, i));
      if (i >= text.length) clearInterval(iv);
    }, 65);
    return () => clearInterval(iv);
  }, [phase]);

  return (
    <motion.div
      className="absolute inset-0 overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0A2540 0%, #0d2e50 100%)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.45 }}
    >
      <motion.div
        className="absolute bottom-0 left-0 w-[55vw] h-[55vw] rounded-full blur-[150px] opacity-15 pointer-events-none"
        style={{ background: '#1D9E75' }}
        animate={{ scale: [1, 1.2, 1], x: [0, 20, 0] }}
        transition={{ duration: 10, repeat: Infinity }}
      />

      <div className="absolute inset-0 flex flex-col justify-center pl-[8vw]" style={{ width: '42vw' }}>
        <motion.div
          className="inline-flex self-start items-center gap-2 px-3 py-1.5 rounded-full mb-6"
          style={{ background: 'rgba(29,158,117,0.15)', border: '1px solid rgba(29,158,117,0.3)' }}
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: phase >= 1 ? 1 : 0, x: phase >= 1 ? 0 : -16 }}
          transition={{ duration: 0.5 }}
        >
          <span style={{ fontFamily: 'var(--font-body)', color: '#1D9E75', fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            01 — Natural Search
          </span>
        </motion.div>

        <div className="overflow-hidden mb-4">
          <motion.h2
            style={{ fontFamily: 'var(--font-display)', fontWeight: 900, color: 'white', lineHeight: 1.0, fontSize: 'clamp(30px, 3.8vw, 58px)' }}
            initial={{ y: '110%' }}
            animate={{ y: phase >= 1 ? '0%' : '110%' }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          >
            Speak<br />
            <span style={{ color: '#1D9E75' }}>naturally</span>
          </motion.h2>
        </div>

        <motion.p
          style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.58)', fontSize: 'clamp(14px, 1.3vw, 19px)', lineHeight: 1.5 }}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: phase >= 1 ? 1 : 0, y: phase >= 1 ? 0 : 12 }}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          No complex forms.<br />Type like you'd text a friend.
        </motion.p>

        <motion.div
          className="mt-8 rounded-2xl px-5 py-4 relative overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: phase >= 2 ? 1 : 0, y: phase >= 2 ? 0 : 16 }}
          transition={{ duration: 0.5 }}
        >
          <p style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>
            User types:
          </p>
          <p style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.88)', fontSize: 'clamp(14px, 1.4vw, 20px)', fontWeight: 500, minHeight: '1.6em' }}>
            "{typed}
            {typed.length < text.length && phase >= 2 && (
              <motion.span
                style={{ display: 'inline-block', width: 2, height: '1em', background: '#1D9E75', marginLeft: 2, verticalAlign: 'middle' }}
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
          <div className="w-2 h-2 rounded-full" style={{ background: '#1D9E75' }} />
          <p style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.45)', fontSize: 'clamp(12px, 1vw, 15px)' }}>
            AI processing with Claude...
          </p>
          <motion.div
            className="h-1 rounded-full overflow-hidden flex-1"
            style={{ background: 'rgba(255,255,255,0.1)' }}
          >
            <motion.div
              className="h-full rounded-full"
              style={{ background: '#1D9E75' }}
              initial={{ width: '0%' }}
              animate={{ width: phase >= 3 ? '100%' : '0%' }}
              transition={{ duration: 2.5, ease: 'easeInOut' }}
            />
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
}
