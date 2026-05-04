import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Zap, CheckCircle2 } from 'lucide-react';

export function Scene2() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 1000), // AI processing
      setTimeout(() => setPhase(2), 2500), // Form revealed
      setTimeout(() => setPhase(3), 4000), // Fields fill
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 pt-16 px-6 bg-bg-light flex flex-col"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex items-center gap-3 mb-8">
        <motion.div 
          className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center text-accent"
          animate={{ rotate: phase < 2 ? 360 : 0 }}
          transition={{ duration: 2, ease: "linear", repeat: phase < 2 ? Infinity : 0 }}
        >
          {phase < 2 ? <Zap size={24} /> : <CheckCircle2 size={24} />}
        </motion.div>
        <div>
          <h2 className="font-display font-bold text-xl text-primary">
            {phase < 2 ? "Analizando..." : "Datos detectados"}
          </h2>
        </div>
      </div>

      {phase >= 2 && (
        <motion.div 
          className="bg-white rounded-2xl p-5 shadow-sm border border-bg-muted space-y-5"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring" }}
        >
          <div className="flex items-center gap-4 pb-4 border-b border-bg-muted">
            <div className="w-14 h-14 bg-[#008A5E] text-white font-bold flex items-center justify-center rounded-lg text-lg">
              CFE
            </div>
            <div>
              <p className="font-medium text-text-primary">CFE Electricidad</p>
              <p className="text-sm text-text-secondary">Recibo de luz</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">Monto a pagar</label>
              <motion.div 
                className="mt-1 text-3xl font-display font-bold text-primary"
                initial={{ opacity: 0 }}
                animate={{ opacity: phase >= 3 ? 1 : 0 }}
              >
                $350.00
              </motion.div>
            </div>
            
            <div>
              <label className="text-xs font-medium text-text-secondary uppercase tracking-wider">Número de servicio</label>
              <motion.div 
                className="mt-1 text-lg font-mono text-text-primary bg-bg-muted/50 p-2 rounded"
                initial={{ opacity: 0 }}
                animate={{ opacity: phase >= 3 ? 1 : 0 }}
              >
                123456789012
              </motion.div>
            </div>
          </div>

          {phase >= 3 && (
            <motion.button 
              className="w-full bg-primary text-white font-bold py-4 rounded-xl mt-4"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.5, type: "spring" }}
            >
              Continuar al pago
            </motion.button>
          )}
        </motion.div>
      )}

    </motion.div>
  );
}