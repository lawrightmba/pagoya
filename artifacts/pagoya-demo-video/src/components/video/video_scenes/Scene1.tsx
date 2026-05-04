import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Zap, Search } from 'lucide-react';
import logoPng from '@assets/pagoya_logo_web_1774491466855.png';

export function Scene1() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 800),
      setTimeout(() => setPhase(2), 1300),
      setTimeout(() => setPhase(3), 1800),
      setTimeout(() => setPhase(4), 2400),
      setTimeout(() => setPhase(5), 2900),
      setTimeout(() => setPhase(6), 4200),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  const text = "pagar mi luz de CFE $350";
  const getVisibleText = () => {
    if (phase < 1) return "";
    if (phase === 1) return text.substring(0, 5);
    if (phase === 2) return text.substring(0, 10);
    if (phase === 3) return text.substring(0, 15);
    if (phase === 4) return text.substring(0, 20);
    return text;
  };

  return (
    <motion.div
      className="absolute inset-0 pt-16 px-6 pb-12 flex flex-col"
      style={{ background: '#0A2540' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex flex-col items-center mt-10 mb-8">
        <motion.div
          className="mb-3 bg-white rounded-2xl px-5 py-2"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', delay: 0.2 }}
        >
          <img src={logoPng} alt="PagoYa" className="w-28 h-auto" />
        </motion.div>
        <motion.p
          className="text-sm font-medium"
          style={{ color: 'rgba(255,255,255,0.55)' }}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          Paga en 2 minutos
        </motion.p>
      </div>

      {/* Search/NLP input */}
      <motion.div
        className="rounded-2xl p-4 relative"
        style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', delay: 0.6 }}
      >
        <div className="flex items-center gap-3">
          <Search size={20} style={{ color: '#1D9E75' }} />
          <div className="flex-1 text-base min-h-[26px] relative" style={{ color: 'white' }}>
            {getVisibleText() || (
              <span style={{ color: 'rgba(255,255,255,0.3)' }}>¿Qué necesitas pagar?</span>
            )}
            {phase >= 1 && (
              <motion.span
                className="inline-block w-[2px] h-5 ml-[1px] align-middle"
                style={{ background: '#1D9E75' }}
                animate={{ opacity: [1, 0, 1] }}
                transition={{ duration: 0.8, repeat: Infinity }}
              />
            )}
          </div>
        </div>

        {phase >= 6 && (
          <motion.button
            className="w-full mt-4 font-bold py-3 rounded-xl flex items-center justify-center gap-2 text-white"
            style={{ background: '#1D9E75' }}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring' }}
          >
            <Zap size={18} />
            Procesar con IA
          </motion.button>
        )}
      </motion.div>

      {/* Recent bill placeholders */}
      <div className="mt-6 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.35)' }}>
          Recientes
        </p>
        {[{ label: 'CFE Electricidad', color: '#1D9E75', delay: 0.8 },
          { label: 'Telmex Internet', color: '#D85A30', delay: 1.0 },
          { label: 'Agua SACMEX', color: '#3B82F6', delay: 1.2 },
        ].map((item) => (
          <motion.div
            key={item.label}
            className="flex items-center gap-3 p-3 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
            initial={{ x: -16, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: item.delay }}
          >
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: item.color }}>
              {item.label[0]}
            </div>
            <span className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.75)' }}>{item.label}</span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
