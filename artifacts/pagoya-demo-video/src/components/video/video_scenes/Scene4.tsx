import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { CheckCircle2, Star } from 'lucide-react';

export function Scene4() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1600),
      setTimeout(() => setPhase(3), 3000),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 flex flex-col items-center justify-center px-6"
      style={{ background: 'linear-gradient(160deg, #0A2540 0%, #0D3060 100%)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Success ring + icon */}
      <motion.div
        className="relative mb-6"
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 220, damping: 14 }}
      >
        <div className="w-24 h-24 rounded-full flex items-center justify-center" style={{ background: '#1D9E75' }}>
          <CheckCircle2 size={48} color="white" />
        </div>
        {/* Pulse ring */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ border: '2px solid #1D9E75' }}
          animate={{ scale: [1, 1.5, 1.5], opacity: [0.6, 0, 0] }}
          transition={{ duration: 1.4, repeat: Infinity, delay: 0.3 }}
        />
      </motion.div>

      <motion.h2
        className="text-3xl font-bold text-white text-center mb-2"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        ¡Pago exitoso!
      </motion.h2>

      <motion.p
        className="text-center mb-8"
        style={{ color: 'rgba(255,255,255,0.6)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        Tu recibo CFE ha sido pagado
      </motion.p>

      {/* Receipt card */}
      {phase >= 2 && (
        <motion.div
          className="w-full rounded-2xl p-5 space-y-3"
          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {[
            { label: 'Monto', value: '$350.00', bold: true },
            { label: 'Referencia', value: 'PAY-8921-X', mono: true },
            { label: 'Fecha', value: 'Hoy, 10:42 AM' },
          ].map((row, i) => (
            <div
              key={row.label}
              className="flex justify-between items-center py-2"
              style={i < 2 ? { borderBottom: '1px solid rgba(255,255,255,0.08)' } : {}}
            >
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem' }}>{row.label}</span>
              <span
                className={row.mono ? 'font-mono' : ''}
                style={{ color: 'white', fontWeight: row.bold ? '700' : '500', fontSize: '0.95rem' }}
              >
                {row.value}
              </span>
            </div>
          ))}
        </motion.div>
      )}

      {/* Loyalty points badge */}
      {phase >= 3 && (
        <motion.div
          className="flex items-center gap-2 mt-5 px-4 py-2 rounded-full"
          style={{ background: 'rgba(216,90,48,0.2)', border: '1px solid rgba(216,90,48,0.35)' }}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring' }}
        >
          <Star size={16} style={{ color: '#D85A30' }} fill="#D85A30" />
          <span className="text-sm font-semibold" style={{ color: '#D85A30' }}>
            +35 puntos PagoYa ganados
          </span>
        </motion.div>
      )}
    </motion.div>
  );
}
