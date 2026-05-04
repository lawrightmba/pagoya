import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Zap, CheckCircle2 } from 'lucide-react';

export function Scene2() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 800),
      setTimeout(() => setPhase(2), 2200),
      setTimeout(() => setPhase(3), 3600),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 pt-16 px-6 flex flex-col"
      style={{ background: '#0A2540' }}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.4 }}
    >
      {/* AI status header */}
      <div className="flex items-center gap-3 mb-7">
        <motion.div
          className="w-11 h-11 rounded-full flex items-center justify-center"
          style={{ background: phase < 2 ? 'rgba(29,158,117,0.2)' : 'rgba(29,158,117,0.25)' }}
          animate={{ rotate: phase < 2 ? 360 : 0 }}
          transition={{ duration: 1.8, ease: 'linear', repeat: phase < 2 ? Infinity : 0 }}
        >
          {phase < 2
            ? <Zap size={22} style={{ color: '#1D9E75' }} />
            : <CheckCircle2 size={22} style={{ color: '#1D9E75' }} />}
        </motion.div>
        <div>
          <h2 className="font-bold text-lg text-white">
            {phase < 2 ? 'Analizando...' : 'Datos detectados'}
          </h2>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
            {phase < 2 ? 'IA procesando tu mensaje' : 'CFE Electricidad • $350.00'}
          </p>
        </div>
      </div>

      {/* NLP query chip */}
      <motion.div
        className="text-sm px-3 py-2 rounded-lg mb-6 self-start"
        style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.1)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        "pagar mi luz de CFE $350"
      </motion.div>

      {/* AI processing bar */}
      {phase < 2 && (
        <motion.div
          className="h-1 rounded-full mb-6 overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.1)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.div
            className="h-full rounded-full"
            style={{ background: '#1D9E75' }}
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: 1.8, ease: 'easeInOut' }}
          />
        </motion.div>
      )}

      {/* Detected form */}
      {phase >= 2 && (
        <motion.div
          className="rounded-2xl p-5 space-y-4"
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring' }}
        >
          {/* Biller row */}
          <div className="flex items-center gap-4 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-base text-white" style={{ background: '#008A5E' }}>
              CFE
            </div>
            <div>
              <p className="font-semibold text-white">CFE Electricidad</p>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>Recibo de luz</p>
            </div>
            <div className="ml-auto">
              <CheckCircle2 size={20} style={{ color: '#1D9E75' }} />
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Monto a pagar
            </label>
            <motion.div
              className="mt-1 text-3xl font-bold text-white"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: phase >= 3 ? 1 : 0, y: phase >= 3 ? 0 : 6 }}
              transition={{ duration: 0.4 }}
            >
              $350.00
            </motion.div>
          </div>

          {/* Ref number */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Número de servicio
            </label>
            <motion.div
              className="mt-1 text-base font-mono px-3 py-2 rounded-lg"
              style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.85)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: phase >= 3 ? 1 : 0 }}
            >
              123 456 789 012
            </motion.div>
          </div>

          {phase >= 3 && (
            <motion.button
              className="w-full font-bold py-3 rounded-xl text-white mt-2"
              style={{ background: '#0A2540', border: '1px solid rgba(255,255,255,0.15)' }}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3, type: 'spring' }}
            >
              Continuar al pago →
            </motion.button>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
