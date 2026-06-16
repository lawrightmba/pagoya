import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

const C = '#00C875';
const TR = '#F22F46';

export function Scene1Hook() {
  const [p, setP] = useState(0);

  useEffect(() => {
    const t = [
      setTimeout(() => setP(1), 300),
      setTimeout(() => setP(2), 1200),
      setTimeout(() => setP(3), 2400),
      setTimeout(() => setP(4), 3800),
      setTimeout(() => setP(5), 5500),
    ];
    return () => t.forEach(clearTimeout);
  }, []);

  const stats = [
    { n: '65M', label: 'Mexicans with no bank account' },
    { n: '77M', label: 'Mexicans already on WhatsApp' },
    { n: '$180B', label: 'annual bill payment market' },
  ];

  return (
    <motion.div className="absolute inset-0 flex" style={{ background: '#004F2D' }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}>

      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 60% 60% at 20% 50%, rgba(0,200,117,0.10) 0%, transparent 70%)' }} />

      {/* Left */}
      <div className="flex flex-col justify-center pl-[7vw]" style={{ width: '52%' }}>
        <motion.div className="inline-flex self-start items-center gap-2 px-3 py-1.5 rounded-full mb-6"
          style={{ background: `${TR}18`, border: `1px solid ${TR}50` }}
          initial={{ opacity: 0, x: -16 }} animate={{ opacity: p >= 1 ? 1 : 0, x: p >= 1 ? 0 : -16 }}
          transition={{ duration: 0.5 }}>
          <div className="w-2 h-2 rounded-full" style={{ background: TR }} />
          <span style={{ color: TR, fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'var(--font-body)' }}>
            Twilio AI Startup Searchlight
          </span>
        </motion.div>

        <div style={{ overflow: 'hidden', marginBottom: 8 }}>
          <motion.h1
            style={{ fontFamily: 'var(--font-display)', fontWeight: 900, color: 'white', lineHeight: 1.1, fontSize: 'clamp(38px,5vw,72px)' }}
            initial={{ y: '110%' }} animate={{ y: p >= 1 ? '0%' : '110%' }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}>
            PagoYa
          </motion.h1>
        </div>

        <div style={{ overflow: 'hidden', marginBottom: 20 }}>
          <motion.h2
            style={{ fontFamily: 'var(--font-display)', fontWeight: 800, lineHeight: 1.2, fontSize: 'clamp(20px,2.8vw,42px)' }}
            initial={{ y: '110%' }} animate={{ y: p >= 1 ? '0%' : '110%' }}
            transition={{ duration: 0.7, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}>
            <span style={{ color: C }}>WhatsApp-native</span>{' '}
            <span style={{ color: 'rgba(255,255,255,0.85)' }}>financial identity</span><br />
            <span style={{ color: 'rgba(255,255,255,0.85)' }}>for Mexico's unbanked</span>
          </motion.h2>
        </div>

        <motion.p
          style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.55)', fontSize: 'clamp(13px,1.2vw,17px)', lineHeight: 1.65, maxWidth: '38ch' }}
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: p >= 2 ? 1 : 0, y: p >= 2 ? 0 : 10 }}
          transition={{ duration: 0.5 }}>
          Users text Paula — our Twilio-powered AI agent — to pay CFE, Telmex, Telcel and 30+ billers in under 2 minutes. No app download. No bank account. Live.
        </motion.p>

        <motion.div className="flex flex-wrap gap-2 mt-6"
          initial={{ opacity: 0 }} animate={{ opacity: p >= 3 ? 1 : 0 }}
          transition={{ duration: 0.5 }}>
          {['Twilio WhatsApp API', 'Claude LLM', '$25 MXN flat fee', 'Live in Mexico'].map(tag => (
            <span key={tag} className="px-3 py-1 rounded-full text-xs font-semibold"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.65)', fontFamily: 'var(--font-body)', letterSpacing: '0.05em' }}>
              {tag}
            </span>
          ))}
        </motion.div>
      </div>

      {/* Right — stats */}
      <div className="flex flex-col justify-center gap-4 pr-[6vw]" style={{ width: '48%' }}>
        {stats.map((s, i) => (
          <motion.div key={s.n}
            className="rounded-2xl px-6 py-5"
            style={{ background: i === 0 ? `${C}14` : 'rgba(255,255,255,0.05)', border: `1px solid ${i === 0 ? C + '35' : 'rgba(255,255,255,0.1)'}` }}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: p >= i + 3 ? 1 : 0, x: p >= i + 3 ? 0 : 30 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}>
            <p style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: 'clamp(32px,4vw,54px)', color: i === 0 ? C : 'white', lineHeight: 1, margin: 0 }}>{s.n}</p>
            <p style={{ fontFamily: 'var(--font-body)', color: 'rgba(255,255,255,0.55)', fontSize: 'clamp(12px,1.1vw,15px)', marginTop: 6, lineHeight: 1.4 }}>{s.label}</p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
