import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { CreditCard, Banknote } from 'lucide-react';

export function Scene3() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 700),
      setTimeout(() => setPhase(2), 2400),
      setTimeout(() => setPhase(3), 4000),
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
      <div className="mb-2">
        <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
          CFE Electricidad
        </p>
        <h2 className="text-2xl font-bold text-white">Método de pago</h2>
      </div>

      {/* Total row */}
      <div className="flex items-center justify-between py-3 my-4" style={{ borderTop: '1px solid rgba(255,255,255,0.08)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <span style={{ color: 'rgba(255,255,255,0.55)' }}>Total a pagar</span>
        <span className="text-xl font-bold text-white">$350.00</span>
      </div>

      <div className="space-y-3 mt-2">
        {/* Card option */}
        <motion.div
          className="p-4 rounded-2xl cursor-pointer"
          style={{
            border: phase >= 1 && phase < 2 ? '2px solid #1D9E75' : '2px solid rgba(255,255,255,0.1)',
            background: phase >= 1 && phase < 2 ? 'rgba(29,158,117,0.12)' : 'rgba(255,255,255,0.05)',
          }}
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="p-2 rounded-lg"
                style={{
                  background: phase >= 1 && phase < 2 ? 'rgba(29,158,117,0.25)' : 'rgba(255,255,255,0.08)',
                  color: phase >= 1 && phase < 2 ? '#1D9E75' : 'rgba(255,255,255,0.5)',
                }}
              >
                <CreditCard size={22} />
              </div>
              <div>
                <p className="font-semibold text-white text-sm">Tarjeta •••• 4242</p>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>Visa • Exp 12/26</p>
              </div>
            </div>
            <div
              className="w-5 h-5 rounded-full border-2 flex items-center justify-center"
              style={{ borderColor: phase >= 1 && phase < 2 ? '#1D9E75' : 'rgba(255,255,255,0.2)' }}
            >
              {phase >= 1 && phase < 2 && (
                <motion.div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ background: '#1D9E75' }}
                  layoutId="radio"
                />
              )}
            </div>
          </div>
        </motion.div>

        {/* OXXO option */}
        <motion.div
          className="p-4 rounded-2xl cursor-pointer"
          style={{
            border: phase >= 2 ? '2px solid #1D9E75' : '2px solid rgba(255,255,255,0.1)',
            background: phase >= 2 ? 'rgba(29,158,117,0.12)' : 'rgba(255,255,255,0.05)',
          }}
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.35 }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="p-2 rounded-lg"
                style={{
                  background: phase >= 2 ? 'rgba(29,158,117,0.25)' : 'rgba(255,255,255,0.08)',
                  color: phase >= 2 ? '#1D9E75' : 'rgba(255,255,255,0.5)',
                }}
              >
                <Banknote size={22} />
              </div>
              <div>
                <p className="font-semibold text-white text-sm">Efectivo en OXXO</p>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>Genera código de barras</p>
              </div>
            </div>
            <div
              className="w-5 h-5 rounded-full border-2 flex items-center justify-center"
              style={{ borderColor: phase >= 2 ? '#1D9E75' : 'rgba(255,255,255,0.2)' }}
            >
              {phase >= 2 && (
                <motion.div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ background: '#1D9E75' }}
                  layoutId="radio"
                />
              )}
            </div>
          </div>
          {phase >= 2 && (
            <motion.p
              className="text-xs mt-3 px-3 py-2 rounded-lg"
              style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.55)' }}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
            >
              Disponible en +19,000 tiendas OXXO
            </motion.p>
          )}
        </motion.div>
      </div>

      {phase >= 3 && (
        <motion.button
          className="w-full font-bold py-4 rounded-xl mt-auto mb-6 text-white"
          style={{ background: '#1D9E75' }}
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          Pagar $350.00
        </motion.button>
      )}
    </motion.div>
  );
}
