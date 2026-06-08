import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export function Scene3() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 2000), // Score 480
      setTimeout(() => setPhase(3), 5000), // Score 620
      setTimeout(() => setPhase(4), 8000), // Score 718
      setTimeout(() => setPhase(5), 11000), // Breakdown
      setTimeout(() => setPhase(6), 15000), // Exit
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  const scores = [0, 480, 620, 718, 718, 718, 718];
  const score = scores[phase] || 0;
  const progress = score / 850;

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center z-30"
      initial={{ scale: 1.5, opacity: 0, filter: 'blur(20px)' }}
      animate={{ scale: 1, opacity: 1, filter: 'blur(0px)' }}
      exit={{ scale: 0.8, opacity: 0, y: -50 }}
      transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.h2 
        className="text-[4vw] font-bold text-center mb-16"
        initial={{ opacity: 0, y: -20 }}
        animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: -20 }}
        transition={{ duration: 0.8 }}
      >
        Cada pago construye tu <span className="text-[#00C875]">PTI</span>
      </motion.h2>

      <div className="relative w-[600px] h-[300px] flex items-end justify-center">
        {/* SVG Gauge */}
        <svg viewBox="0 0 200 100" className="absolute inset-0 w-full h-full overflow-visible">
          {/* Background Arc */}
          <path 
            d="M 20 90 A 80 80 0 0 1 180 90" 
            fill="none" 
            stroke="rgba(255,255,255,0.1)" 
            strokeWidth="12" 
            strokeLinecap="round" 
          />
          {/* Progress Arc */}
          <motion.path 
            d="M 20 90 A 80 80 0 0 1 180 90" 
            fill="none" 
            stroke="#00C875" 
            strokeWidth="12" 
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: progress }}
            transition={{ duration: 2, ease: "easeInOut" }}
          />
        </svg>

        <div className="text-center absolute bottom-0 translate-y-12">
          <motion.div 
            className="text-[6vw] font-black tabular-nums leading-none"
            initial={{ opacity: 0 }}
            animate={phase >= 2 ? { opacity: 1 } : { opacity: 0 }}
          >
            {score}
          </motion.div>
          <div className="text-xl text-white/50 font-medium uppercase tracking-widest mt-2">
            Payment Trust Index
          </div>
        </div>
      </div>

      <motion.div 
        className="mt-24 flex gap-8 text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={phase >= 5 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.8 }}
      >
        <div className="bg-white/5 p-6 rounded-2xl border border-white/10 w-[240px]">
          <div className="text-2xl font-bold text-[#FF5C1A] mb-2">Historial</div>
          <div className="text-sm text-white/60">Pagos a tiempo</div>
        </div>
        <div className="bg-white/5 p-6 rounded-2xl border border-white/10 w-[240px]">
          <div className="text-2xl font-bold text-[#00C875] mb-2">Frecuencia</div>
          <div className="text-sm text-white/60">Uso recurrente</div>
        </div>
        <div className="bg-white/5 p-6 rounded-2xl border border-white/10 w-[240px]">
          <div className="text-2xl font-bold text-white mb-2">Consistencia</div>
          <div className="text-sm text-white/60">Monto promedio</div>
        </div>
      </motion.div>
    </motion.div>
  );
}