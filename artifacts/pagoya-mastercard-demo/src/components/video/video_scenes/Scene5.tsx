import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import logoPng from '@assets/pagoya_logo_transparent.png';

export function Scene5() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),  // Stats 1
      setTimeout(() => setPhase(2), 1200), // Stats 2
      setTimeout(() => setPhase(3), 1900), // Stats 3
      setTimeout(() => setPhase(4), 4500), // Clear stats, show Lockup
      setTimeout(() => setPhase(5), 5500), // Mastercard circles move in
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1 }}
    >
      {/* Traction Stats (Disappear at phase 4) */}
      <motion.div 
        className="flex gap-16 mb-20"
        animate={phase >= 4 ? { opacity: 0, scale: 0.9, filter: 'blur(10px)' } : { opacity: 1, scale: 1, filter: 'blur(0px)' }}
        transition={{ duration: 0.8 }}
      >
        <StatCard value="847" label="Usuarios Activos" phase={phase} threshold={1} />
        <StatCard value="$2.1M" label="MXN Procesado" phase={phase} threshold={2} color="#00C875" />
        <StatCard value="94%" label="Pagos a Tiempo" phase={phase} threshold={3} color="#FF5C1A" />
      </motion.div>

      {/* Lockup */}
      <motion.div
        className="absolute inset-0 flex flex-col items-center justify-center"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={phase >= 4 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
        style={{ pointerEvents: phase >= 4 ? 'auto' : 'none' }}
      >
        <div className="flex items-center justify-center gap-8 mb-8">
          <img src={logoPng} alt="PagoYa" className="h-24 object-contain" />
          <div className="text-4xl text-white/50">×</div>
          <div className="flex relative w-32 h-20 items-center justify-center">
            {/* Mastercard minimal representation using circles */}
            <motion.div 
              className="absolute w-16 h-16 rounded-full bg-[#EB001B] mix-blend-screen"
              initial={{ x: -60, opacity: 0 }}
              animate={phase >= 5 ? { x: -20, opacity: 1 } : { x: -60, opacity: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
            />
            <motion.div 
              className="absolute w-16 h-16 rounded-full bg-[#F79E1B] mix-blend-screen"
              initial={{ x: 60, opacity: 0 }}
              animate={phase >= 5 ? { x: 20, opacity: 1 } : { x: 60, opacity: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
            />
          </div>
        </div>
        
        <motion.div
          className="text-[2.5vw] font-medium text-white tracking-wide"
          initial={{ opacity: 0, y: 20 }}
          animate={phase >= 5 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ delay: 0.5, duration: 1 }}
        >
          Construyendo el historial financiero de México.
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

function StatCard({ value, label, phase, threshold, color = "white" }: { value: string, label: string, phase: number, threshold: number, color?: string }) {
  return (
    <motion.div
      className="text-center"
      initial={{ opacity: 0, y: 40 }}
      animate={phase >= threshold ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
    >
      <div className="text-[6vw] font-black leading-none mb-4" style={{ color }}>{value}</div>
      <div className="text-2xl text-white/60 font-medium uppercase tracking-wider">{label}</div>
    </motion.div>
  );
}