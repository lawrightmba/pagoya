import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import logoPng from '@assets/pagoya_logo_transparent.png';
import { useLang } from '@/lib/video/LangContext';

const C = '#00C875';

export function Scene13() {
  const lang = useLang();
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 200),
      setTimeout(() => setPhase(2), 1000),
      setTimeout(() => setPhase(3), 2400),
      setTimeout(() => setPhase(4), 4000),
      setTimeout(() => setPhase(5), 6200),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const tiles = lang === 'en' ? [
    { icon: '💳', value: 'Stripe Live', sub: 'Card payments · bill pay active', color: C },
    { icon: '📊', value: 'PTI v5.0', sub: 'Fair-lending certified · July 2026', color: '#34D399' },
    { icon: '🤖', value: 'Paula', sub: '8 tools · PTI coach · WhatsApp + app', color: '#60A5FA' },
    { icon: '🏘️', value: 'Street Team', sub: 'CAC ≈ $0 · community model', color: '#FF5C1A' },
    { icon: '🎁', value: '9 Brands', sub: 'Gift cards · 40%+ margins live', color: '#A78BFA' },
    { icon: '🔌', value: 'B2B API', sub: 'PTI data licensing · pilots open', color: '#FCD34D' },
  ] : [
    { icon: '💳', value: 'Stripe Activo', sub: 'Pagos con tarjeta · pago de facturas', color: C },
    { icon: '📊', value: 'PTI v5.0', sub: 'Certificado fair-lending · julio 2026', color: '#34D399' },
    { icon: '🤖', value: 'Paula', sub: '8 herramientas · coach PTI · WhatsApp + app', color: '#60A5FA' },
    { icon: '🏘️', value: 'Equipo de campo', sub: 'CAC ≈ $0 · modelo comunitario', color: '#FF5C1A' },
    { icon: '🎁', value: '9 Marcas', sub: 'Gift cards · márgenes 40%+ activos', color: '#A78BFA' },
    { icon: '🔌', value: 'API B2B', sub: 'Licencia datos PTI · pilotos abiertos', color: '#FCD34D' },
  ];

  return (
    <motion.div
      className="absolute inset-0 overflow-hidden flex flex-col items-center justify-center"
      style={{ background: '#004F2D' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.7 }}
    >
      {[
        { w: '72vw', h: '72vw', opacity: 0.08, delay: 0 },
        { w: '52vw', h: '52vw', opacity: 0.10, delay: 0.3 },
        { w: '32vw', h: '32vw', opacity: 0.12, delay: 0.6 },
      ].map((ring, i) => (
        <motion.div key={i} className="absolute rounded-full border pointer-events-none"
          style={{ width: ring.w, height: ring.h, borderColor: `rgba(0,200,117,${ring.opacity + 0.15})` }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: phase >= 1 ? 1 : 0, opacity: phase >= 1 ? 1 : 0 }}
          transition={{ duration: 1.0, delay: ring.delay, ease: [0.22, 1, 0.36, 1] }} />
      ))}

      <motion.div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 60% 55% at 50% 50%, rgba(0,200,117,0.14) 0%, transparent 65%)' }}
        animate={{ opacity: [0.6, 1, 0.6] }} transition={{ duration: 4, repeat: Infinity }} />

      <div className="relative z-10 flex flex-col items-center w-full px-[6vw]">
        <motion.div className="mb-5"
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: phase >= 1 ? 1 : 0.6, opacity: phase >= 1 ? 1 : 0 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        >
          <img src={logoPng} alt="PagoYa" style={{ height: 'clamp(44px, 5.5vh, 72px)', width: 'auto', filter: 'drop-shadow(0 4px 20px rgba(0,0,0,0.5))' }} />
        </motion.div>

        <div className="overflow-hidden mb-2">
          <motion.h1
            style={{ fontFamily: 'var(--font-display)', fontWeight: 900, color: 'white', textAlign: 'center', lineHeight: 1.15, fontSize: 'clamp(38px, 5.5vw, 80px)' }}
            initial={{ y: '110%' }} animate={{ y: phase >= 2 ? '0%' : '110%' }}
            transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
          >
            {lang === 'en'
              ? <>Live. Revenue.<br /><span style={{ color: C }}>PTI v5.0.</span></>
              : <>En vivo. Ingresos.<br /><span style={{ color: C }}>PTI v5.0.</span></>}
          </motion.h1>
        </div>

        <motion.p
          style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.5)', textAlign: 'center', fontSize: 'clamp(13px, 1.4vw, 20px)', maxWidth: '55vw', lineHeight: 1.5, marginBottom: 24 }}
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: phase >= 3 ? 1 : 0, y: phase >= 3 ? 0 : 10 }}
          transition={{ duration: 0.55 }}
        >
          {lang === 'en'
            ? 'The infrastructure supports thousands of transactions per day. The data asset grows with every payment.'
            : 'La infraestructura soporta miles de transacciones por día. El activo de datos crece con cada pago.'}
        </motion.p>

        <motion.div
          style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', width: '100%', maxWidth: 740, marginBottom: 20 }}
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: phase >= 3 ? 1 : 0, y: phase >= 3 ? 0 : 16 }}
          transition={{ duration: 0.5 }}
        >
          {tiles.map((t, i) => (
            <motion.div key={i}
              className="rounded-xl px-4 py-3 flex items-start gap-3"
              style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${t.color}30` }}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: phase >= 3 ? 1 : 0, scale: phase >= 3 ? 1 : 0.9 }}
              transition={{ duration: 0.4, delay: 0.07 * i }}
            >
              <span style={{ fontSize: 20 }}>{t.icon}</span>
              <div>
                <p style={{ fontFamily: 'var(--font-body)', color: t.color, fontWeight: 700, fontSize: 'clamp(12px, 1vw, 14px)' }}>{t.value}</p>
                <p style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.4)', fontSize: 'clamp(9px, 0.75vw, 11px)', marginTop: 2, lineHeight: 1.3 }}>{t.sub}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        <motion.div className="flex items-center gap-5 mb-4"
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: phase >= 4 ? 1 : 0, y: phase >= 4 ? 0 : 12 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div className="px-7 py-3 rounded-2xl font-bold"
            style={{ background: C, color: '#004F2D', fontFamily: 'var(--font-body)', fontSize: 'clamp(14px, 1.4vw, 20px)', fontWeight: 800 }}
            animate={{ boxShadow: [`0 0 0px rgba(0,200,117,0)`, `0 0 40px rgba(0,200,117,0.6)`, `0 0 0px rgba(0,200,117,0)`] }}
            transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}
          >
            pagoyamx.com
          </motion.div>
          <div style={{ width: 1, height: 32, background: 'rgba(255,255,255,0.12)' }} />
          <p style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.35)', fontSize: 'clamp(11px, 1vw, 14px)' }}>
            Longview Meridian Holdings LLC
          </p>
        </motion.div>

        <motion.div className="flex items-center gap-3"
          initial={{ opacity: 0 }} animate={{ opacity: phase >= 5 ? 1 : 0 }}
          transition={{ duration: 0.6 }}
        >
          {[
            lang === 'en' ? 'PTI B2B' : 'PTI B2B',
            lang === 'en' ? 'Data licensing live' : 'Datos en licencia',
            lang === 'en' ? '54M potential users' : '54M usuarios potenciales',
            lang === 'en' ? 'Mexico · LATAM' : 'México · LATAM',
            lang === 'en' ? 'Built by 1 founder + AI' : 'Construido por 1 fundador + IA',
          ].map((tag, i) => (
            <motion.div key={i} className="px-3 py-1.5 rounded-full"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-body)', fontSize: 'clamp(10px, 0.85vw, 13px)', fontWeight: 500 }}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: phase >= 5 ? 1 : 0, scale: phase >= 5 ? 1 : 0.85 }}
              transition={{ delay: i * 0.1, type: 'spring' }}
            >
              {tag}
            </motion.div>
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
}
