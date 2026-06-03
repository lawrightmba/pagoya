import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { MessageCircle, Bell, Star } from 'lucide-react';
import { useLang } from '@/lib/video/LangContext';

const C = '#00C875';

export function Scene7() {
  const lang = useLang();
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 300);
    const t2 = setTimeout(() => setPhase(2), 1800);
    const t3 = setTimeout(() => setPhase(3), 4000);
    return () => [t1, t2, t3].forEach(clearTimeout);
  }, []);

  const items = lang === 'en' ? [
    { icon: <Bell size={14} />, text: 'Automatic due-date reminders via WhatsApp' },
    { icon: <Star size={14} />, text: '+35 PagoYa points earned on this payment' },
  ] : [
    { icon: <Bell size={14} />, text: 'Recordatorios automáticos de vencimiento por WhatsApp' },
    { icon: <Star size={14} />, text: '+35 puntos PagoYa ganados en este pago' },
  ];

  return (
    <motion.div
      className="absolute inset-0 overflow-hidden"
      style={{ background: 'linear-gradient(140deg, #004F2D 0%, #005432 100%)' }}
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.45 }}
    >
      <motion.div className="absolute top-[10%] left-[10%] w-[50vw] h-[50vw] rounded-full blur-[150px] opacity-[0.12] pointer-events-none"
        style={{ background: C }} animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 8, repeat: Infinity }} />

      <div className="absolute inset-0 flex flex-col justify-center pl-[8vw]" style={{ width: '46vw' }}>
        <motion.div
          className="inline-flex self-start items-center gap-2 px-3 py-1.5 rounded-full mb-6"
          style={{ background: `${C}18`, border: `1px solid ${C}40` }}
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: phase >= 1 ? 1 : 0, x: phase >= 1 ? 0 : -16 }}
          transition={{ duration: 0.5 }}
        >
          <span style={{ fontFamily: 'var(--font-body)', color: C, fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            04 — {lang === 'en' ? 'Instant Receipt' : 'Comprobante Instantáneo'}
          </span>
        </motion.div>

        <div className="overflow-hidden mb-4">
          <motion.h2
            style={{ fontFamily: 'var(--font-display)', fontWeight: 900, color: 'white', lineHeight: 1.15, fontSize: 'clamp(30px, 3.8vw, 58px)' }}
            initial={{ y: '110%' }}
            animate={{ y: phase >= 1 ? '0%' : '110%' }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          >
            {lang === 'en' ? <>Receipt<br /><span style={{ color: C }}>instantly</span></> : <>Comprobante<br /><span style={{ color: C }}>al instante</span></>}
          </motion.h2>
        </div>

        <motion.p
          style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.55)', fontSize: 'clamp(14px, 1.3vw, 19px)', lineHeight: 1.5, marginBottom: '1.8rem' }}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: phase >= 1 ? 1 : 0, y: phase >= 1 ? 0 : 12 }}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          {lang === 'en' ? <>Digital receipt via WhatsApp.<br />Paperless. Instant.</> : <>Comprobante digital por WhatsApp.<br />Sin papel. Instantáneo.</>}
        </motion.p>

        {/* WhatsApp notification */}
        <motion.div
          className="rounded-2xl overflow-hidden mb-4"
          style={{ background: '#1FAE51', maxWidth: '100%' }}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: phase >= 2 ? 1 : 0, y: phase >= 2 ? 0 : 20, scale: phase >= 2 ? 1 : 0.95 }}
          transition={{ duration: 0.55, type: 'spring' }}
        >
          <div className="flex items-center gap-3 px-4 py-2.5" style={{ background: 'rgba(0,0,0,0.15)' }}>
            <div className="p-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }}>
              <MessageCircle size={14} color="white" />
            </div>
            <span style={{ fontFamily: 'var(--font-body)', color: 'white', fontWeight: 700, fontSize: '0.85rem' }}>WhatsApp · PagoYa</span>
            <span style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.6)', fontSize: '0.72rem', marginLeft: 'auto' }}>
              {lang === 'en' ? 'Now' : 'Ahora'}
            </span>
          </div>
          <div className="px-4 py-3">
            <p style={{ fontFamily: 'var(--font-body)', color: 'white', fontSize: 'clamp(12px, 1.15vw, 16px)', lineHeight: 1.5 }}>
              {lang === 'en'
                ? <>Your CFE payment of <strong>$350.00</strong> was processed ✅<br /><span style={{ opacity: 0.75, fontSize: '0.88em' }}>Receipt: PAY-8921-X · Today, 10:42 AM</span></>
                : <>Tu pago de CFE por <strong>$350.00</strong> fue procesado ✅<br /><span style={{ opacity: 0.75, fontSize: '0.88em' }}>Folio: PAY-8921-X · Hoy, 10:42 AM</span></>}
            </p>
          </div>
        </motion.div>

        <div className="flex flex-col gap-2">
          {items.map((item, i) => (
            <motion.div key={i}
              className="flex items-center gap-3 rounded-xl px-4 py-2.5"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: phase >= 3 ? 1 : 0, x: phase >= 3 ? 0 : -12 }}
              transition={{ delay: i * 0.12 }}
            >
              <span style={{ color: C }}>{item.icon}</span>
              <span style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.6)', fontSize: 'clamp(11px, 1vw, 14px)' }}>{item.text}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
