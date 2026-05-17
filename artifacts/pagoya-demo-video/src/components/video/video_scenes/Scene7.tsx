import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { MessageCircle, Star, Bell } from 'lucide-react';

export function Scene7() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 300);
    const t2 = setTimeout(() => setPhase(2), 1800);
    const t3 = setTimeout(() => setPhase(3), 4000);
    return () => [t1, t2, t3].forEach(clearTimeout);
  }, []);

  return (
    <motion.div
      className="absolute inset-0 overflow-hidden"
      style={{ background: 'linear-gradient(140deg, #0A2540 0%, #0b2840 100%)' }}
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.45 }}
    >
      <motion.div
        className="absolute top-[10%] left-[10%] w-[50vw] h-[50vw] rounded-full blur-[150px] opacity-18 pointer-events-none"
        style={{ background: '#1D9E75' }}
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 8, repeat: Infinity }}
      />

      <div className="absolute inset-0 flex flex-col justify-center pl-[8vw]" style={{ width: '43vw' }}>
        <motion.div
          className="inline-flex self-start items-center gap-2 px-3 py-1.5 rounded-full mb-6"
          style={{ background: 'rgba(29,158,117,0.15)', border: '1px solid rgba(29,158,117,0.3)' }}
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: phase >= 1 ? 1 : 0, x: phase >= 1 ? 0 : -16 }}
          transition={{ duration: 0.5 }}
        >
          <span style={{ fontFamily: 'var(--font-body)', color: '#1D9E75', fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            04 — Confirmación
          </span>
        </motion.div>

        <div className="overflow-hidden mb-4">
          <motion.h2
            style={{ fontFamily: 'var(--font-display)', fontWeight: 900, color: 'white', lineHeight: 1.0, fontSize: 'clamp(30px, 3.8vw, 58px)' }}
            initial={{ y: '110%' }}
            animate={{ y: phase >= 1 ? '0%' : '110%' }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          >
            Comprobante<br />
            <span style={{ color: '#1D9E75' }}>al instante</span>
          </motion.h2>
        </div>

        <motion.p
          style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.58)', fontSize: 'clamp(14px, 1.3vw, 19px)', lineHeight: 1.5, marginBottom: '1.8rem' }}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: phase >= 1 ? 1 : 0, y: phase >= 1 ? 0 : 12 }}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          Recibo digital vía WhatsApp.<br />Sin papel. Sin espera.
        </motion.p>

        <motion.div
          className="rounded-2xl overflow-hidden mb-4"
          style={{ background: '#1FAE51', maxWidth: '100%' }}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: phase >= 2 ? 1 : 0, y: phase >= 2 ? 0 : 20, scale: phase >= 2 ? 1 : 0.95 }}
          transition={{ duration: 0.55, type: 'spring' }}
        >
          <div className="flex items-center gap-3 px-4 py-3" style={{ background: 'rgba(0,0,0,0.15)' }}>
            <div className="p-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }}>
              <MessageCircle size={16} color="white" />
            </div>
            <div className="flex-1">
              <span style={{ fontFamily: 'var(--font-body)', color: 'white', fontWeight: 700, fontSize: '0.88rem' }}>WhatsApp · PagoYa</span>
            </div>
            <span style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem' }}>Ahora</span>
          </div>
          <div className="px-4 py-3">
            <p style={{ fontFamily: 'var(--font-body)', color: 'white', fontSize: 'clamp(13px, 1.2vw, 17px)', lineHeight: 1.5 }}>
              ¡Hola! Tu pago de CFE por <strong>$350.00</strong> fue procesado exitosamente ✅<br />
              <span style={{ opacity: 0.8, fontSize: '0.9em' }}>Folio: PAY-8921-X · Hoy, 10:42 AM</span>
            </p>
          </div>
        </motion.div>

        <div className="flex flex-col gap-2">
          {[
            { icon: <Bell size={14} />, text: 'Recordatorios de vencimiento automáticos', delay: 0.1 },
            { icon: <Star size={14} />, text: '+35 puntos PagoYa ganados en este pago', delay: 0.22 },
          ].map((item, i) => (
            <motion.div
              key={i}
              className="flex items-center gap-3 rounded-xl px-4 py-2.5"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: phase >= 3 ? 1 : 0, x: phase >= 3 ? 0 : -12 }}
              transition={{ delay: item.delay }}
            >
              <span style={{ color: '#1D9E75' }}>{item.icon}</span>
              <span style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.65)', fontSize: 'clamp(12px, 1.05vw, 15px)' }}>
                {item.text}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
