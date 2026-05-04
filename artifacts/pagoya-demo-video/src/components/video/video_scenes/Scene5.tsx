import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import logoPng from '@assets/pagoya_logo_web_1774491466855.png';

export function Scene5() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 1000), // Notification drop
      setTimeout(() => setPhase(2), 4000), // Final transition
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div 
      className="absolute inset-0 bg-bg-light"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Home screen mock */}
      <div className="p-6 pt-20">
        <motion.img 
          src={logoPng} 
          alt="PagoYa" 
          className="w-24 mb-6"
          animate={{ opacity: phase >= 2 ? 0 : 1 }}
        />
        <motion.div className="space-y-4" animate={{ opacity: phase >= 2 ? 0 : 1 }}>
          <div className="h-24 bg-white rounded-2xl shadow-sm border border-bg-muted" />
          <div className="h-24 bg-white rounded-2xl shadow-sm border border-bg-muted" />
        </motion.div>
      </div>

      {/* WhatsApp Notification */}
      {phase >= 1 && phase < 2 && (
        <motion.div 
          className="absolute top-16 left-4 right-4 bg-[#25D366] text-white rounded-2xl p-4 shadow-lg flex items-start gap-3"
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          transition={{ type: "spring", damping: 15 }}
        >
          <div className="bg-white/20 p-2 rounded-full">
            <MessageCircle size={20} />
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="font-bold text-sm">WhatsApp • PagoYa</span>
              <span className="text-xs text-white/80">Ahora</span>
            </div>
            <p className="text-sm">¡Hola! Aquí tienes el comprobante de tu pago CFE por $350.00. ✅</p>
          </div>
        </motion.div>
      )}

      {/* Final Logo Reveal */}
      {phase >= 2 && (
        <motion.div 
          className="absolute inset-0 bg-primary flex flex-col items-center justify-center"
          initial={{ clipPath: "circle(0% at 50% 50%)" }}
          animate={{ clipPath: "circle(150% at 50% 50%)" }}
          transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.img 
            src={logoPng} 
            alt="PagoYa" 
            className="w-48 mb-6 filter brightness-0 invert"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.5, duration: 1 }}
          />
          <motion.p 
            className="text-white/80 text-xl font-display font-medium"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            Paga en 2 minutos.
          </motion.p>
        </motion.div>
      )}

    </motion.div>
  );
}