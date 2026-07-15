import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useLang } from '@/lib/video/LangContext';

const C = '#00C875';

export function Scene10() {
  const lang = useLang();
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 1400),
      setTimeout(() => setPhase(3), 3000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const streams = lang === 'en' ? [
    { label: 'Bill Payment Fee', value: '$25 MXN', sub: '~$1.35 USD · per transaction · LIVE', color: C, width: '100%', badge: 'ACTIVE' },
    { label: 'Gift Card Margin', value: '~40%', sub: 'Wholesale spread · 9 brands · 32 SKUs · LIVE', color: '#A78BFA', width: '70%', badge: 'ACTIVE' },
    { label: 'PTI API License', value: 'B2B', sub: 'Behavioral data · SOFOMs · insurers · neobancos', color: '#FF5C1A', width: '55%', badge: 'ACTIVE' },
    { label: 'Credit Origination', value: '2–4%', sub: 'Lending marketplace · Q1 2027', color: '#FCD34D', width: '35%', badge: '2027' },
  ] : [
    { label: 'Comisión por pago de facturas', value: '$25 MXN', sub: '~$1.35 USD · por transacción · EN VIVO', color: C, width: '100%', badge: 'ACTIVO' },
    { label: 'Margen tarjetas de regalo', value: '~40%', sub: 'Diferencial wholesale · 9 marcas · 32 SKUs · EN VIVO', color: '#A78BFA', width: '70%', badge: 'ACTIVO' },
    { label: 'Licencia API PTI', value: 'B2B', sub: 'Datos conductuales · SOFOMs · aseguradoras · neobancos', color: '#FF5C1A', width: '55%', badge: 'ACTIVO' },
    { label: 'Originación de crédito', value: '2–4%', sub: 'Marketplace para prestamistas · T1 2027', color: '#FCD34D', width: '35%', badge: '2027' },
  ];

  const economics = lang === 'en' ? [
    { label: 'Est. LTV', value: '$900+ MXN' },
    { label: 'Street Team CAC', value: '≈ $0' },
    { label: 'LTV / CAC', value: '∞' },
  ] : [
    { label: 'LTV estimado', value: '$900+ MXN' },
    { label: 'CAC equipo campo', value: '≈ $0' },
    { label: 'LTV / CAC', value: '∞' },
  ];

  return (
    <motion.div
      className="absolute inset-0 overflow-hidden flex flex-col"
      style={{ background: '#004F2D' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.55 }}
    >
      <motion.div
        className="absolute top-0 right-0 w-[50vw] h-[60vh] rounded-full blur-[160px] opacity-[0.10] pointer-events-none"
        style={{ background: C }}
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 10, repeat: Infinity }}
      />

      <div className="absolute inset-0 flex">
        <div className="w-1/2 flex flex-col justify-center pl-[8vw] pr-[4vw] relative z-10">
          <motion.p
            className="mb-4 uppercase tracking-widest"
            style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.35)', fontSize: 'clamp(10px, 0.9vw, 13px)', letterSpacing: '0.18em' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: phase >= 1 ? 1 : 0 }}
            transition={{ duration: 0.45 }}
          >
            {lang === 'en' ? 'Business Model' : 'Modelo de negocio'}
          </motion.p>

          <div className="overflow-hidden mb-6">
            <motion.h2
              style={{ fontFamily: 'var(--font-display)', fontWeight: 900, color: 'white', lineHeight: 0.95, fontSize: 'clamp(34px, 4.5vw, 68px)' }}
              initial={{ y: '110%' }}
              animate={{ y: phase >= 1 ? '0%' : '110%' }}
              transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            >
              {lang === 'en'
                ? <>4 streams.<br /><span style={{ color: C }}>3 active now.</span></>
                : <>4 fuentes.<br /><span style={{ color: C }}>3 activas hoy.</span></>}
            </motion.h2>
          </div>

          <div className="flex flex-col gap-4">
            {streams.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -18 }}
                animate={{ opacity: phase >= 1 ? 1 : 0, x: phase >= 1 ? 0 : -18 }}
                transition={{ duration: 0.5, delay: 0.12 + i * 0.12 }}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.65)', fontSize: 'clamp(11px, 1vw, 14px)', fontWeight: 500 }}>
                      {s.label}
                    </span>
                    <span style={{
                      fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 'clamp(8px, 0.7vw, 10px)',
                      color: s.badge === '2027' ? '#FCD34D' : C,
                      background: s.badge === '2027' ? 'rgba(252,211,77,0.12)' : `${C}18`,
                      border: `1px solid ${s.badge === '2027' ? 'rgba(252,211,77,0.3)' : C + '40'}`,
                      borderRadius: 4, padding: '1px 5px', letterSpacing: '0.06em',
                    }}>
                      {s.badge}
                    </span>
                  </div>
                  <span style={{ fontFamily: 'var(--font-display)', color: s.color, fontWeight: 800, fontSize: 'clamp(13px, 1.3vw, 19px)' }}>
                    {s.value}
                  </span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: s.color }}
                    initial={{ width: '0%' }}
                    animate={{ width: phase >= 2 ? s.width : '0%' }}
                    transition={{ duration: 0.9, delay: i * 0.15, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>
                <p style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.32)', fontSize: 'clamp(10px, 0.8vw, 12px)', marginTop: 3 }}>
                  {s.sub}
                </p>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="w-1/2 flex flex-col items-center justify-center pr-[6vw] gap-4 relative z-10">
          <motion.div
            className="w-full rounded-3xl p-[3vw] text-center relative overflow-hidden"
            style={{ background: `${C}0D`, border: `2px solid ${C}40` }}
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: phase >= 2 ? 1 : 0, y: phase >= 2 ? 0 : 30, scale: phase >= 2 ? 1 : 0.9 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="absolute top-0 left-0 right-0 h-1" style={{ background: C }} />
            <p style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.45)', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6 }}>
              {lang === 'en' ? 'Revenue per Bill Payment' : 'Ingreso por pago de factura'}
            </p>
            <p style={{ fontFamily: 'var(--font-display)', fontWeight: 900, color: C, fontSize: 'clamp(48px, 7vw, 100px)', lineHeight: 0.9 }}>
              $25
            </p>
            <p style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.45)', fontSize: 'clamp(12px, 1vw, 15px)', marginTop: 8 }}>
              MXN (~$1.35 USD)
            </p>
          </motion.div>

          <div className="w-full flex gap-2">
            {economics.map((e, i) => (
              <motion.div
                key={i}
                className="flex-1 rounded-2xl p-[1.5vw] text-center"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: phase >= 3 ? 1 : 0, y: phase >= 3 ? 0 : 18 }}
                transition={{ duration: 0.45, delay: i * 0.1 }}
              >
                <p style={{ fontFamily: 'var(--font-display)', color: 'white', fontWeight: 800, fontSize: 'clamp(14px, 1.6vw, 22px)' }}>
                  {e.value}
                </p>
                <p style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.4)', fontSize: 'clamp(9px, 0.78vw, 11px)', marginTop: 3, lineHeight: 1.3 }}>
                  {e.label}
                </p>
              </motion.div>
            ))}
          </div>

          <motion.div
            className="w-full rounded-xl px-4 py-3"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: phase >= 3 ? 1 : 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <p style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.35)', fontSize: 'clamp(9px, 0.78vw, 11px)', lineHeight: 1.5, textAlign: 'center' }}>
              {lang === 'en'
                ? 'Street team earns $5 MXN / confirmed payment (7-day hold) · Zero upfront CAC'
                : 'Equipo de campo gana $5 MXN / pago confirmado (7 días) · CAC inicial cero'}
            </p>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
