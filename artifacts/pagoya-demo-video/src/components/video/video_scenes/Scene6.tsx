import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Banknote, CreditCard } from 'lucide-react';

export function Scene6() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 300);
    const t2 = setTimeout(() => setPhase(2), 1500);
    const t3 = setTimeout(() => setPhase(3), 4000);
    return () => [t1, t2, t3].forEach(clearTimeout);
  }, []);

  return (
    <motion.div
      className="absolute inset-0 overflow-hidden"
      style={{ background: 'linear-gradient(140deg, #0A2540 0%, #0e2a48 100%)' }}
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.45 }}
    >
      <motion.div
        className="absolute bottom-[5%] right-[5%] w-[45vw] h-[45vw] rounded-full blur-[130px] opacity-15 pointer-events-none"
        style={{ background: '#D85A30' }}
        animate={{ scale: [1, 1.25, 1] }}
        transition={{ duration: 11, repeat: Infinity }}
      />

      <div className="absolute inset-0 flex flex-col justify-center pl-[8vw]" style={{ width: '43vw' }}>
        <motion.div
          className="inline-flex self-start items-center gap-2 px-3 py-1.5 rounded-full mb-6"
          style={{ background: 'rgba(216,90,48,0.15)', border: '1px solid rgba(216,90,48,0.3)' }}
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: phase >= 1 ? 1 : 0, x: phase >= 1 ? 0 : -16 }}
          transition={{ duration: 0.5 }}
        >
          <span style={{ fontFamily: 'var(--font-body)', color: '#D85A30', fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            03 — Payment Method
          </span>
        </motion.div>

        <div className="overflow-hidden mb-4">
          <motion.h2
            style={{ fontFamily: 'var(--font-display)', fontWeight: 900, color: 'white', lineHeight: 1.0, fontSize: 'clamp(30px, 3.8vw, 58px)' }}
            initial={{ y: '110%' }}
            animate={{ y: phase >= 1 ? '0%' : '110%' }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          >
            Pay<br />
            <span style={{ color: '#D85A30' }}>your way</span>
          </motion.h2>
        </div>

        <motion.p
          style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.58)', fontSize: 'clamp(14px, 1.3vw, 19px)', lineHeight: 1.5, marginBottom: '2rem' }}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: phase >= 1 ? 1 : 0, y: phase >= 1 ? 0 : 12 }}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          Debit/credit card or barcode to pay<br />with cash at any OXXO store.
        </motion.p>

        {[
          { icon: <Banknote size={22} />, label: 'Cash at OXXO', sub: '+19,000 stores across Mexico', color: '#D85A30', delay: 0.1 },
          { icon: <CreditCard size={22} />, label: 'Debit / Credit Card', sub: 'Visa, Mastercard, AMEX', color: '#1D9E75', delay: 0.22 },
        ].map((item, i) => (
          <motion.div
            key={i}
            className="flex items-center gap-4 rounded-2xl px-5 py-4 mb-3"
            style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid rgba(255,255,255,0.1)` }}
            initial={{ opacity: 0, x: -18 }}
            animate={{ opacity: phase >= 2 ? 1 : 0, x: phase >= 2 ? 0 : -18 }}
            transition={{ duration: 0.5, delay: item.delay }}
          >
            <div className="p-2 rounded-xl" style={{ background: `${item.color}22`, color: item.color }}>
              {item.icon}
            </div>
            <div>
              <p style={{ fontFamily: 'var(--font-body)', color: 'white', fontWeight: 700, fontSize: 'clamp(13px, 1.2vw, 17px)' }}>
                {item.label}
              </p>
              <p style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.45)', fontSize: 'clamp(11px, 0.95vw, 14px)' }}>
                {item.sub}
              </p>
            </div>
          </motion.div>
        ))}

        <motion.div
          className="mt-4 px-4 py-3 rounded-xl"
          style={{ background: 'rgba(29,158,117,0.1)', border: '1px solid rgba(29,158,117,0.2)' }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: phase >= 3 ? 1 : 0, y: phase >= 3 ? 0 : 10 }}
          transition={{ duration: 0.45 }}
        >
          <p style={{ fontFamily: 'var(--font-body)', color: '#1D9E75', fontSize: 'clamp(12px, 1.1vw, 16px)', fontWeight: 500 }}>
            🏪 OXXO reaches even the most remote communities in Mexico
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}
