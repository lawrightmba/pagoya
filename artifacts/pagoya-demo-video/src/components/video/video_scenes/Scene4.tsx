import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';

export function Scene4() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1500),
      setTimeout(() => setPhase(3), 2500),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 bg-primary flex flex-col items-center justify-center px-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div 
        className="w-24 h-24 rounded-full bg-accent flex items-center justify-center text-white mb-6"
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
      >
        <CheckCircle2 size={48} />
      </motion.div>

      <motion.h2 
        className="text-3xl font-display font-bold text-white text-center mb-2"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        ¡Pago exitoso!
      </motion.h2>

      <motion.p 
        className="text-white/80 text-center mb-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        Tu recibo CFE ha sido pagado.
      </motion.p>

      {phase >= 2 && (
        <motion.div 
          className="bg-white/10 backdrop-blur-md rounded-2xl p-6 w-full text-white"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex justify-between py-2 border-b border-white/20">
            <span className="text-white/60">Monto</span>
            <span className="font-bold">$350.00</span>
          </div>
          <div className="flex justify-between py-2 border-b border-white/20">
            <span className="text-white/60">Referencia</span>
            <span className="font-mono">PAY-8921-X</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-white/60">Fecha</span>
            <span>Hoy, 10:42 AM</span>
          </div>
        </motion.div>
      )}
      
      {phase >= 3 && (
        <motion.div
          className="mt-8 text-accent font-medium text-sm text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          Enviando comprobante...
        </motion.div>
      )}

    </motion.div>
  );
}