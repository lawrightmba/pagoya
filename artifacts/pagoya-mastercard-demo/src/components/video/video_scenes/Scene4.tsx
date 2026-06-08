import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export function Scene4() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 2000), // Central node
      setTimeout(() => setPhase(3), 3500), // Lines & Icons
      setTimeout(() => setPhase(4), 6000), // Tagline
      setTimeout(() => setPhase(5), 11000), // Exit
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex flex-col items-center justify-center z-40"
      initial={{ opacity: 0, y: 100 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 1.2 }}
      transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.h2 
        className="text-[4vw] font-bold text-center mb-24"
        initial={{ opacity: 0, y: -20 }}
        animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: -20 }}
      >
        Una <span className="text-[#FF5C1A]">capa de datos</span>, <br />no solo una app
      </motion.h2>

      <div className="relative w-[800px] h-[400px] flex items-center justify-center">
        {/* Lines */}
        <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 0 }}>
          <motion.line x1="400" y1="200" x2="150" y2="100" stroke="#00C875" strokeWidth="4" strokeDasharray="10 10" 
            initial={{ pathLength: 0 }} animate={phase >= 3 ? { pathLength: 1 } : { pathLength: 0 }} transition={{ duration: 1 }} />
          <motion.line x1="400" y1="200" x2="650" y2="100" stroke="#00C875" strokeWidth="4" strokeDasharray="10 10" 
            initial={{ pathLength: 0 }} animate={phase >= 3 ? { pathLength: 1 } : { pathLength: 0 }} transition={{ duration: 1, delay: 0.2 }} />
          <motion.line x1="400" y1="200" x2="150" y2="300" stroke="#00C875" strokeWidth="4" strokeDasharray="10 10" 
            initial={{ pathLength: 0 }} animate={phase >= 3 ? { pathLength: 1 } : { pathLength: 0 }} transition={{ duration: 1, delay: 0.4 }} />
          <motion.line x1="400" y1="200" x2="650" y2="300" stroke="#00C875" strokeWidth="4" strokeDasharray="10 10" 
            initial={{ pathLength: 0 }} animate={phase >= 3 ? { pathLength: 1 } : { pathLength: 0 }} transition={{ duration: 1, delay: 0.6 }} />
        </svg>

        {/* Central Node */}
        <motion.div 
          className="absolute z-10 w-32 h-32 bg-[#005432] border-4 border-[#00C875] rounded-full flex items-center justify-center font-bold text-2xl shadow-[0_0_50px_#00C875]"
          initial={{ scale: 0 }}
          animate={phase >= 2 ? { scale: 1 } : { scale: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          PTI
        </motion.div>

        {/* Orbiting Icons */}
        <IconNode phase={phase} delay={3} x="150px" y="100px" label="Bancos" />
        <IconNode phase={phase} delay={3.2} x="650px" y="100px" label="Telcos" />
        <IconNode phase={phase} delay={3.4} x="150px" y="300px" label="Seguros" />
        <IconNode phase={phase} delay={3.6} x="650px" y="300px" label="Fintechs" />
      </div>

      <motion.p
        className="mt-16 text-[2vw] text-white/60 font-medium"
        initial={{ opacity: 0, y: 20 }}
        animate={phase >= 4 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      >
        Infraestructura financiera regulada
      </motion.p>

    </motion.div>
  );
}

function IconNode({ phase, delay, x, y, label }: { phase: number, delay: number, x: string, y: string, label: string }) {
  return (
    <motion.div
      className="absolute flex flex-col items-center"
      style={{ left: x, top: y, transform: 'translate(-50%, -50%)' }}
      initial={{ scale: 0, opacity: 0 }}
      animate={phase >= 3 ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 20, delay: (delay - 3) * 0.2 }}
    >
      <div className="w-20 h-20 bg-white/10 rounded-2xl backdrop-blur-md border border-white/20 flex items-center justify-center mb-3">
        <div className="w-8 h-8 rounded-full bg-white/40" />
      </div>
      <div className="text-xl font-semibold">{label}</div>
    </motion.div>
  );
}