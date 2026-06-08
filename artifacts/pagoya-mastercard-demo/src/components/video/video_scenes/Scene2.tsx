import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export function Scene2() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),   // Headline
      setTimeout(() => setPhase(2), 2000),  // Phone frame
      setTimeout(() => setPhase(3), 3500),  // Chat 1
      setTimeout(() => setPhase(4), 5000),  // Chat 2
      setTimeout(() => setPhase(5), 7000),  // Chat 3
      setTimeout(() => setPhase(6), 9000),  // Chat 4 (success)
      setTimeout(() => setPhase(7), 13000), // exit
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 flex items-center justify-between px-[10vw] z-20"
      initial={{ x: '100vw', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '-100vw', opacity: 0 }}
      transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="w-[40%] text-left">
        <motion.h1 
          className="text-[5vw] font-bold leading-tight"
          initial={{ opacity: 0, x: -40 }}
          animate={phase >= 1 ? { opacity: 1, x: 0 } : { opacity: 0, x: -40 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          Paula paga en <br />
          <span className="text-[#00C875]">2 minutos</span> <br />
          por WhatsApp
        </motion.h1>
      </div>

      <div className="w-[50%] flex justify-center perspective-[1000px]">
        <motion.div 
          className="relative w-[320px] h-[640px] bg-[#0A1A0F] rounded-[40px] border-8 border-[#112918] shadow-2xl overflow-hidden"
          initial={{ rotateY: 30, opacity: 0, scale: 0.8, z: -200 }}
          animate={phase >= 2 ? { rotateY: -5, opacity: 1, scale: 1, z: 0 } : { rotateY: 30, opacity: 0, scale: 0.8, z: -200 }}
          transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* WhatsApp Header */}
          <div className="bg-[#005c4b] w-full h-16 flex items-center px-4">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold">P</div>
            <div className="ml-3 font-semibold">PagoYa</div>
          </div>

          <div className="p-4 flex flex-col gap-4">
            {/* Chat 1 */}
            <motion.div 
              className="bg-[#202c33] text-white p-3 rounded-xl rounded-tl-sm self-start max-w-[85%]"
              initial={{ opacity: 0, y: 10, scale: 0.9, transformOrigin: 'top left' }}
              animate={phase >= 3 ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 10, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              Hola Paula 👋<br/>¿Quieres pagar tu recibo CFE de $320 MXN?
            </motion.div>

            {/* Chat 2 */}
            <motion.div 
              className="bg-[#005c4b] text-white p-3 rounded-xl rounded-tr-sm self-end max-w-[85%]"
              initial={{ opacity: 0, y: 10, scale: 0.9, transformOrigin: 'top right' }}
              animate={phase >= 4 ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 10, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              Sí, pagar con saldo.
            </motion.div>

            {/* Chat 3 - Processing */}
            <motion.div 
              className="bg-[#202c33] text-white/70 p-3 rounded-xl rounded-tl-sm self-start"
              initial={{ opacity: 0, y: 10 }}
              animate={phase >= 5 ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              Procesando pago vía STP...
            </motion.div>

            {/* Chat 4 - Success */}
            <motion.div 
              className="bg-[#00C875] text-[#0A1A0F] font-bold p-3 rounded-xl rounded-tl-sm self-start mt-2 shadow-lg"
              initial={{ opacity: 0, scale: 0 }}
              animate={phase >= 6 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 15 }}
            >
              ✅ Pagado $320 MXN
            </motion.div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}