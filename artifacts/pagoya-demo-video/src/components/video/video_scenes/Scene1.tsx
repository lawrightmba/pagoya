import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Zap, Search } from 'lucide-react';
import logoPng from '@assets/pagoya_logo_web_1774491466855.png';

export function Scene1() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 800),  // Type letter 1
      setTimeout(() => setPhase(2), 1200), // Type letter 2
      setTimeout(() => setPhase(3), 1600), // Type letter 3
      setTimeout(() => setPhase(4), 2200), // Type letter 4
      setTimeout(() => setPhase(5), 2600), // Type letter 5
      setTimeout(() => setPhase(6), 4000), // Button pop
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  const text = "pagar mi luz de CFE $350";
  const getVisibleText = () => {
    if (phase < 1) return "";
    if (phase === 1) return text.substring(0, 5); // pagar
    if (phase === 2) return text.substring(0, 10); // pagar mi l
    if (phase === 3) return text.substring(0, 15); // pagar mi luz d
    if (phase === 4) return text.substring(0, 20); // pagar mi luz de CFE
    return text;
  };

  return (
    <motion.div 
      className="absolute inset-0 pt-20 px-6 pb-12 flex flex-col bg-bg-light"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex flex-col items-center mt-12 mb-8">
        <motion.img 
          src={logoPng} 
          alt="PagoYa" 
          className="w-32 mb-4"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", delay: 0.2 }}
        />
        <motion.p 
          className="text-text-secondary font-medium"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          Paga en 2 minutos
        </motion.p>
      </div>

      <motion.div 
        className="bg-white rounded-2xl shadow-sm border border-bg-muted p-4 relative"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", delay: 0.6 }}
      >
        <div className="flex items-center gap-3 text-text-secondary">
          <Search size={20} className="text-accent" />
          <div className="flex-1 font-body text-lg text-text-primary min-h-[28px] border-r-2 border-accent animate-pulse relative">
            {getVisibleText()}
            {phase >= 1 && phase < 5 && (
              <span className="absolute w-2 h-5 bg-accent right-[-2px] top-[2px] animate-pulse" />
            )}
          </div>
        </div>
        
        {phase >= 6 && (
          <motion.button 
            className="w-full mt-6 bg-accent text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring" }}
          >
            <Zap size={20} />
            Procesar
          </motion.button>
        )}
      </motion.div>

      {/* Suggested bills */}
      <div className="mt-8 space-y-3">
        <motion.div className="flex items-center gap-4 p-3 bg-white rounded-xl opacity-60" initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 0.6 }} transition={{ delay: 0.8 }}>
          <div className="w-10 h-10 bg-blue-100 rounded-full" />
          <div className="flex-1"><div className="h-4 w-24 bg-bg-muted rounded" /></div>
        </motion.div>
        <motion.div className="flex items-center gap-4 p-3 bg-white rounded-xl opacity-60" initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 0.6 }} transition={{ delay: 1.0 }}>
          <div className="w-10 h-10 bg-green-100 rounded-full" />
          <div className="flex-1"><div className="h-4 w-32 bg-bg-muted rounded" /></div>
        </motion.div>
      </div>

    </motion.div>
  );
}