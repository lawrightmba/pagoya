import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { CreditCard, Banknote } from 'lucide-react';

export function Scene3() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 800), // Card select
      setTimeout(() => setPhase(2), 2500), // Oxxo select
      setTimeout(() => setPhase(3), 4000), // Button
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
      <h2 className="font-display font-bold text-2xl text-primary mb-6">Método de pago</h2>

      <div className="space-y-4">
        {/* Card option */}
        <motion.div 
          className={`p-4 rounded-2xl border-2 transition-colors ${phase >= 1 && phase < 2 ? 'border-accent bg-accent/5' : 'border-bg-muted bg-white'}`}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${phase >= 1 && phase < 2 ? 'bg-accent/20 text-accent' : 'bg-bg-muted text-text-secondary'}`}>
                <CreditCard size={24} />
              </div>
              <div>
                <p className="font-medium text-text-primary">Tarjeta terminada en 4242</p>
                <p className="text-sm text-text-secondary">Visa • Exp 12/26</p>
              </div>
            </div>
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${phase >= 1 && phase < 2 ? 'border-accent' : 'border-bg-muted'}`}>
              {phase >= 1 && phase < 2 && <motion.div className="w-2.5 h-2.5 bg-accent rounded-full" layoutId="radio" />}
            </div>
          </div>
        </motion.div>

        {/* OXXO option */}
        <motion.div 
          className={`p-4 rounded-2xl border-2 transition-colors ${phase >= 2 ? 'border-accent bg-accent/5' : 'border-bg-muted bg-white'}`}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${phase >= 2 ? 'bg-accent/20 text-accent' : 'bg-bg-muted text-text-secondary'}`}>
                <Banknote size={24} />
              </div>
              <div>
                <p className="font-medium text-text-primary">Efectivo en OXXO</p>
                <p className="text-sm text-text-secondary">Genera código de barras</p>
              </div>
            </div>
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${phase >= 2 ? 'border-accent' : 'border-bg-muted'}`}>
              {phase >= 2 && <motion.div className="w-2.5 h-2.5 bg-accent rounded-full" layoutId="radio" />}
            </div>
          </div>
        </motion.div>
      </div>

      {phase >= 3 && (
        <motion.button 
          className="w-full bg-accent text-white font-bold py-4 rounded-xl mt-auto mb-10"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          Pagar $350.00
        </motion.button>
      )}

    </motion.div>
  );
}