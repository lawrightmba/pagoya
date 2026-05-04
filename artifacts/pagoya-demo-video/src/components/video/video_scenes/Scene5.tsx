import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import logoPng from '@assets/pagoya_logo_web_1774491466855.png';

export function Scene5() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 900),
      setTimeout(() => setPhase(2), 4200),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0"
      style={{ background: '#0A2540' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* App home screen background */}
      <div className="p-6 pt-20">
        <motion.div
          animate={{ opacity: phase >= 2 ? 0 : 1 }}
          transition={{ duration: 0.4 }}
        >
          <div className="w-24 mb-6 bg-white rounded-xl px-2 py-1">
            <img src={logoPng} alt="PagoYa" className="w-full h-auto" />
          </div>
          <div className="space-y-3">
            {[{ color: '#1D9E75', label: 'Próximo vencimiento' }, { color: '#D85A30', label: 'Telmex • $499' }].map((item) => (
              <div
                key={item.label}
                className="h-20 rounded-2xl flex items-center px-4 gap-3"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <div className="w-8 h-8 rounded-full" style={{ background: item.color }} />
                <span className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>{item.label}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* WhatsApp notification */}
      {phase >= 1 && phase < 2 && (
        <motion.div
          className="absolute top-14 left-4 right-4 rounded-2xl p-4 shadow-2xl flex items-start gap-3"
          style={{ background: '#1FAE51' }}
          initial={{ y: -120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          transition={{ type: 'spring', damping: 14 }}
        >
          <div className="p-2 rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }}>
            <MessageCircle size={18} color="white" />
          </div>
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="font-bold text-sm text-white">WhatsApp · PagoYa</span>
              <span className="text-xs" style={{ color: 'rgba(255,255,255,0.75)' }}>Ahora</span>
            </div>
            <p className="text-sm text-white leading-snug">
              ¡Hola! Aquí tu comprobante de pago CFE por $350.00 ✅
            </p>
          </div>
        </motion.div>
      )}

      {/* Final logo splash */}
      {phase >= 2 && (
        <motion.div
          className="absolute inset-0 flex flex-col items-center justify-center"
          style={{ background: '#0A2540' }}
          initial={{ clipPath: 'circle(0% at 50% 50%)' }}
          animate={{ clipPath: 'circle(150% at 50% 50%)' }}
          transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Teal glow blob */}
          <div
            className="absolute w-64 h-64 rounded-full blur-[80px] opacity-30"
            style={{ background: '#1D9E75', top: '20%', left: '10%' }}
          />
          <motion.div
            className="w-44 mb-5 bg-white rounded-2xl px-4 py-2 relative z-10"
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.8 }}
          >
            <img src={logoPng} alt="PagoYa" className="w-full h-auto" />
          </motion.div>
          <motion.p
            className="text-xl font-semibold relative z-10"
            style={{ color: 'rgba(255,255,255,0.75)' }}
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.7 }}
          >
            Paga en 2 minutos.
          </motion.p>
          <motion.div
            className="mt-3 px-5 py-2 rounded-full font-bold text-sm text-white relative z-10"
            style={{ background: '#1D9E75' }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1.0, type: 'spring' }}
          >
            pagoya.mx
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
}
