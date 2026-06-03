import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useLang } from '@/lib/video/LangContext';

const C = '#00C875';

const BRANDS = [
  { name: 'Netflix', emoji: '🎬', color: '#E50914', range: '$300–$700' },
  { name: 'Amazon', emoji: '📦', color: '#FF9900', range: '$100–$1,000' },
  { name: 'Google Play', emoji: '🎮', color: '#34A853', range: '$50–$500' },
  { name: 'Uber', emoji: '🚗', color: '#000000', range: '$150' },
  { name: 'Uber Eats', emoji: '🍔', color: '#06C167', range: '$300' },
  { name: 'Cinépolis', emoji: '🎬', color: '#D4002A', range: '$60–$210' },
  { name: 'Starbucks', emoji: '☕', color: '#00704A', range: '$200–$300' },
  { name: 'Liverpool', emoji: '🛍️', color: '#003057', range: '$500–$2,000' },
  { name: 'Soriana', emoji: '🛒', color: '#E31837', range: '$500' },
];

export function SceneGiftCards() {
  const lang = useLang();
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 200),
      setTimeout(() => setPhase(2), 600),
      setTimeout(() => setPhase(3), 1800),
      setTimeout(() => setPhase(4), 3200),
      setTimeout(() => setPhase(5), 5000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const stats = lang === 'en'
    ? [
        { value: '$2.8B', label: 'gift card market in Mexico', color: C },
        { value: '40%+', label: 'margins at point of sale', color: '#F59E0B' },
        { value: '32', label: 'SKUs across 9 brands', color: '#818CF8' },
        { value: 'Seconds', label: 'PIN delivery via WhatsApp', color: '#FB7185' },
      ]
    : [
        { value: '$2.8B', label: 'mercado de tarjetas en México', color: C },
        { value: '40%+', label: 'margen en punto de venta', color: '#F59E0B' },
        { value: '32', label: 'SKUs en 9 marcas', color: '#818CF8' },
        { value: 'Segundos', label: 'entrega del PIN por WhatsApp', color: '#FB7185' },
      ];

  return (
    <motion.div
      className="absolute inset-0 overflow-hidden flex"
      style={{ background: '#071C2E' }}
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.5 }}
    >
      {/* Ambient glow */}
      <motion.div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 60% 50% at 75% 50%, rgba(100,60,180,0.18) 0%, transparent 65%)' }}
        animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 6, repeat: Infinity }} />
      <motion.div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 40% 40% at 25% 50%, rgba(0,200,117,0.10) 0%, transparent 60%)' }} />

      {/* LEFT — brand grid */}
      <div className="flex flex-col justify-center pl-[6vw]" style={{ width: '48%' }}>
        <motion.div
          className="inline-flex self-start items-center gap-2 px-3 py-1.5 rounded-full mb-5"
          style={{ background: 'rgba(100,60,180,0.2)', border: '1px solid rgba(130,90,210,0.4)' }}
          initial={{ opacity: 0, x: -14 }} animate={{ opacity: phase >= 1 ? 1 : 0, x: phase >= 1 ? 0 : -14 }}
          transition={{ duration: 0.5 }}
        >
          <span style={{ color: '#A78BFA', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'var(--font-body)' }}>
            {lang === 'en' ? '🎁 Gift Cards · Live' : '🎁 Tarjetas Digitales · En vivo'}
          </span>
        </motion.div>

        <div className="overflow-hidden mb-5">
          <motion.h2
            style={{ fontFamily: 'var(--font-display)', fontWeight: 900, color: 'white', lineHeight: 1.0, fontSize: 'clamp(28px, 3.5vw, 52px)' }}
            initial={{ y: '110%' }} animate={{ y: phase >= 1 ? '0%' : '110%' }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          >
            {lang === 'en' ? <>9 brands.<br /><span style={{ color: C }}>Delivered</span><br />in seconds.</> : <>9 marcas.<br /><span style={{ color: C }}>Entregadas</span><br />en segundos.</>}
          </motion.h2>
        </div>

        {/* Brand grid 3x3 */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', maxWidth: 320 }}>
          {BRANDS.map((brand, i) => (
            <motion.div key={brand.name}
              className="flex items-center gap-2 px-3 py-2 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${brand.color}44` }}
              initial={{ opacity: 0, scale: 0.8, y: 8 }}
              animate={{ opacity: phase >= 2 ? 1 : 0, scale: phase >= 2 ? 1 : 0.8, y: phase >= 2 ? 0 : 8 }}
              transition={{ duration: 0.4, delay: 0.05 * i, ease: [0.22, 1, 0.36, 1] }}
            >
              <span style={{ fontSize: 14 }}>{brand.emoji}</span>
              <span style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{brand.name}</span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* RIGHT — stats + WhatsApp delivery */}
      <div className="flex flex-col justify-center pr-[6vw]" style={{ width: '52%', paddingLeft: '2vw' }}>
        {/* Stat tiles */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          {stats.map((s, i) => (
            <motion.div key={i}
              className="rounded-2xl px-4 py-3"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: phase >= 3 ? 1 : 0, y: phase >= 3 ? 0 : 14 }}
              transition={{ duration: 0.45, delay: 0.08 * i }}
            >
              <p style={{ fontFamily: 'var(--font-display)', color: s.color, fontSize: 'clamp(20px, 2.4vw, 32px)', fontWeight: 900, lineHeight: 1 }}>{s.value}</p>
              <p style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.5)', fontSize: 'clamp(10px, 0.85vw, 12px)', marginTop: 3, lineHeight: 1.3 }}>{s.label}</p>
            </motion.div>
          ))}
        </div>

        {/* WhatsApp PIN delivery mockup */}
        <motion.div
          className="rounded-2xl overflow-hidden"
          style={{ background: '#111B21', border: '1px solid rgba(255,255,255,0.08)', maxWidth: 380 }}
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: phase >= 4 ? 1 : 0, y: phase >= 4 ? 0 : 16 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-2 px-3 py-2" style={{ background: '#1F2C34', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: `linear-gradient(135deg, #007A4A, #00C875)` }}>P</div>
            <span style={{ fontFamily: 'var(--font-body)', color: 'white', fontSize: 12, fontWeight: 600 }}>Paula · PagoYa</span>
          </div>
          <div className="px-3 py-3">
            <motion.div className="rounded-xl rounded-tl-sm px-3 py-2 self-start inline-block" style={{ background: '#1F2C34' }}
              initial={{ opacity: 0, x: -10 }} animate={{ opacity: phase >= 5 ? 1 : 0, x: phase >= 5 ? 0 : -10 }}
              transition={{ duration: 0.4 }}
            >
              <p style={{ fontFamily: 'var(--font-body)', color: C, fontSize: 13, fontWeight: 700 }}>🎬 {lang === 'en' ? 'Netflix PIN delivered!' : '¡PIN Netflix entregado!'}</p>
              <p style={{ fontFamily: 'var(--font-mono)', color: 'white', fontSize: 15, fontWeight: 900, letterSpacing: '0.1em', marginTop: 4 }}>GDRY-4821-KXNW</p>
              <p style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.45)', fontSize: 11, marginTop: 4 }}>
                {lang === 'en' ? 'Redeem at netflix.com/redeem ✅' : 'Canjear en netflix.com/redeem ✅'}
              </p>
            </motion.div>
          </div>
        </motion.div>

        <motion.p
          style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.35)', fontSize: 'clamp(10px, 0.85vw, 12px)', marginTop: 10 }}
          initial={{ opacity: 0 }} animate={{ opacity: phase >= 5 ? 1 : 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          {lang === 'en'
            ? 'Wallet users pay zero commission. Card users pay denomination + $25 MXN.'
            : 'Usuarios con saldo: sin comisión. Con tarjeta: denominación + $25 MXN.'}
        </motion.p>
      </div>
    </motion.div>
  );
}
